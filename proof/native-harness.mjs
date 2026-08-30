import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
async function runWebMcpProof(options) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const featureNames = options.featureNames ?? ["WebMCP", "DevToolsWebMCPSupport"];
  const userDataDir = resolve(process.cwd(), `.webmcp-proof-${crypto.randomUUID()}`);
  mkdirSync(userDataDir, { recursive: true });
  const child = spawn(options.browserPath, [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${userDataDir}`,
    "--remote-debugging-port=0",
    `--enable-features=${featureNames.join(",")}`,
    ...options.browserArgs ?? [],
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let browserLog = "";
  child.stdout.on("data", (chunk) => {
    browserLog += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    browserLog += String(chunk);
  });
  const socketState = {};
  let spawnFailed = false;
  try {
    const spawnFailure = new Promise((_, rejectSpawn) => {
      child.once("error", (error) => {
        spawnFailed = true;
        rejectSpawn(error);
      });
    });
    const port = await Promise.race([
      readActivePort(userDataDir, () => browserLog, timeoutMs),
      spawnFailure
    ]);
    const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: "PUT",
      signal: AbortSignal.timeout(timeoutMs)
    }).then((response) => response.json());
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    socketState.socket = socket;
    await Promise.race([
      new Promise((resolveOpen, rejectOpen) => {
        socket.addEventListener("open", () => resolveOpen(), { once: true });
        socket.addEventListener("error", () => rejectOpen(new Error("DevTools socket failed")), {
          once: true
        });
      }),
      delay(timeoutMs).then(() => {
        throw new Error("DevTools socket timeout");
      })
    ]);
    let sequence = 0;
    const pending = new Map;
    const events = [];
    let requestPaused;
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(String(data));
      if (message.id) {
        const waiter = pending.get(message.id);
        if (!waiter)
          return;
        pending.delete(message.id);
        clearTimeout(waiter.timer);
        if (message.error)
          waiter.reject(new Error(`${waiter.method}: ${JSON.stringify(message.error)}`));
        else
          waiter.resolve(message.result ?? {});
        return;
      }
      if (message.method === "Fetch.requestPaused" && message.params && requestPaused) {
        requestPaused(message.params);
        return;
      }
      if (message.method)
        events.push(message);
    });
    const send = (method, params = {}) => {
      const id = ++sequence;
      return new Promise((resolveCall, rejectCall) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          rejectCall(new Error(`command timeout ${method}`));
        }, timeoutMs);
        pending.set(id, { method, resolve: resolveCall, reject: rejectCall, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    };
    socket.addEventListener("close", () => {
      for (const waiter of pending.values()) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error(`DevTools socket closed during ${waiter.method}`));
      }
      pending.clear();
    });
    requestPaused = (params) => {
      const requestId = params.requestId;
      const request = params.request;
      const entries = new Map;
      for (const [name, value] of Object.entries(request?.headers ?? {})) {
        entries.set(name.toLowerCase(), { name, value });
      }
      if (request?.url && new URL(request.url).origin === new URL(options.url).origin) {
        for (const [name, value] of Object.entries(options.headers ?? {})) {
          entries.set(name.toLowerCase(), { name, value });
        }
      }
      send("Fetch.continueRequest", {
        requestId,
        headers: [...entries.values()]
      }).catch((error) => {
        events.push({
          method: "webmcp-proof.requestFailed",
          params: { error: String(error) }
        });
      });
    };
    const waitEvent = async (method, predicate = () => true) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const index = events.findIndex((event) => event.method === method && predicate(event.params ?? {}));
        if (index >= 0)
          return events.splice(index, 1)[0].params ?? {};
        await delay(20);
      }
      throw new Error(`event timeout ${method}`);
    };
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (result.exceptionDetails)
        throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result?.value;
    };
    const invoke = async (call, tool) => {
      const command = await send("WebMCP.invokeTool", {
        frameId: tool.frameId,
        toolName: call.toolName,
        input: call.input
      });
      const invocationId = String(command.invocationId);
      const invoked = await waitEvent("WebMCP.toolInvoked", (params) => params.invocationId === invocationId);
      const responded = await waitEvent("WebMCP.toolResponded", (params) => params.invocationId === invocationId);
      return {
        invocationId,
        invoked,
        responded,
        output: responded.output
      };
    };
    await send("Network.enable");
    if (options.headers)
      await send("Fetch.enable");
    await send("Page.enable");
    await send("Runtime.enable");
    await send("WebMCP.enable");
    await send("Page.navigate", { url: options.url });
    await waitEvent("Page.loadEventFired");
    const required = new Set(options.requiredToolNames ?? options.calls.map(({ toolName }) => toolName));
    const tools = new Map;
    const addTools = (added) => {
      for (const tool of added.tools ?? []) tools.set(String(tool.name), tool);
    };
    while ([...required].some((name) => !tools.has(name))) addTools(await waitEvent("WebMCP.toolsAdded"));
    await delay(options.discoveryQuiescenceMs ?? 500);
    for (let index = events.length - 1; index >= 0; index -= 1) {
      if (events[index].method !== "WebMCP.toolsAdded") continue;
      addTools(events[index].params ?? {});
      events.splice(index, 1);
    }
    if (options.expectedToolNames) {
      const actual = [...tools.keys()].sort();
      const expected = [...options.expectedToolNames].sort();
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`unexpected native tool set: ${JSON.stringify(actual)}`);
    }
    const calls = [];
    for (const call of options.calls) {
      const tool = tools.get(call.toolName);
      if (!tool)
        throw new Error(`tool missing ${call.toolName}`);
      calls.push(await invoke(call, tool));
    }
    const inspected = options.inspectExpression ? await evaluate(options.inspectExpression) : undefined;
    let after;
    if (options.after) {
      await evaluate(options.after.expression);
      const removed = [];
      for (const name of options.after.removedToolNames ?? []) {
        await waitEvent("WebMCP.toolsRemoved", (params) => (params.tools ?? []).some((tool) => tool.name === name));
        removed.push(name);
      }
      let denied = false;
      let error;
      if (options.after.deniedCall) {
        const prior = tools.get(options.after.deniedCall.toolName);
        if (!prior)
          throw new Error(`denied tool missing ${options.after.deniedCall.toolName}`);
        try {
          await invoke(options.after.deniedCall, prior);
        } catch (caught) {
          denied = true;
          error = String(caught);
        }
      }
      after = { removed, denied, error };
    }
    let screenshot;
    if (options.screenshotPath) {
      const capture = await send("Page.captureScreenshot", { format: "png" });
      const bytes = Buffer.from(String(capture.data), "base64");
      const path = resolve(options.screenshotPath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, bytes);
      screenshot = {
        path,
        sha256: createHash("sha256").update(bytes).digest("hex")
      };
    }
    const version = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(timeoutMs)
    }).then((response) => response.json());
    return {
      schema: "webmcp-proof.v0",
      browser: version.Browser,
      url: options.url,
      featureNames,
      tools: [...tools.values()],
      calls,
      inspected,
      after,
      screenshot
    };
  } finally {
    socketState.socket?.close();
    if (!spawnFailed) {
      if (child.exitCode === null)
        child.kill("SIGTERM");
      await Promise.race([
        new Promise((resolveExit) => child.once("exit", resolveExit)),
        delay(3000)
      ]);
      if (child.exitCode === null) {
        child.kill("SIGKILL");
        await Promise.race([
          new Promise((resolveExit) => child.once("exit", resolveExit)),
          delay(1000)
        ]);
      }
    }
    rmSync(userDataDir, { recursive: true, force: true });
  }
}
async function readActivePort(userDataDir, readBrowserLog, timeoutMs) {
  const path = resolve(userDataDir, "DevToolsActivePort");
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const [port] = readFileSync(path, "utf8").trim().split(`
`);
      if (port)
        return Number(port);
    } catch {}
    await delay(50);
  }
  throw new Error(`DevToolsActivePort missing: ${readBrowserLog()}`);
}
export {
  runWebMcpProof
};
