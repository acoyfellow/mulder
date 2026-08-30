import { webMcpBootstrap, webMcpBootstrapModule } from "./bootstrap";
import { custodyExperimentModule, custodyExperimentPage } from "./custody-experiment";
import { fixtureApi, fixtureDocument, fixturePage } from "./fixture";
import { identityExperimentModule, identityExperimentPage } from "./identity-experiment";
import { buildRequest, generateTools } from "./openapi";
import { schemaExperimentModule, schemaExperimentPage } from "./schema-experiment";

const tools = generateTools(fixtureDocument);
const selfScriptPolicy = "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'";
let custodySession = "";
let identitySession = "";

type Env = {
  ORIGIN_SECRET?: string;
  ORIGIN_URL?: string;
};

class BootstrapInjector {
  constructor(private readonly source: string) {}

  element(element: Element): void {
    element.before(this.source, { html: true });
  }
}

async function callGeneratedTool(request: Request, name: string): Promise<Response> {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) return Response.json({ error: "tool_not_found" }, { status: 404 });
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > 65536) return Response.json({ error: "input_too_large" }, { status: 413 });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 65536) return Response.json({ error: "input_too_large" }, { status: 413 });
  let input: Record<string, unknown>;
  try { input = JSON.parse(text) as Record<string, unknown>; }
  catch { return Response.json({ error: "bad_input" }, { status: 400 }); }
  try {
    return fixtureApi(buildRequest(tool, input, new URL(request.url).origin));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "bad_input" }, { status: 400 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/openapi.json") return Response.json(fixtureDocument);
    if (url.pathname === "/experiments/identity") {
      identitySession = crypto.randomUUID();
      return new Response(identityExperimentPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": selfScriptPolicy, "set-cookie": `mulder_identity=${identitySession}; HttpOnly; SameSite=Strict; Path=/` } });
    }
    if (url.pathname === "/experiments/identity/module.js") return new Response(identityExperimentModule(), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/__mulder/identity-call" && request.method === "POST") {
      const browserVerified = request.headers.get("cookie")?.split(";").map((part) => part.trim()).includes(`mulder_identity=${identitySession}`) === true;
      let input: Record<string, unknown>;
      try { input = await request.json() as Record<string, unknown>; }
      catch { return Response.json({ error: "bad_input" }, { status: 400 }); }
      const assertionHeaders = [...request.headers].filter(([name]) => /^(authorization|signature|signature-input|x-agent-id|x-agent-signature)$/i.test(name)).map(([name]) => name);
      return Response.json({
        humanPrincipal: null,
        browserPrincipal: browserVerified ? { verified: true, source: "server-issued-http-only-session" } : null,
        agentPrincipal: null,
        claimedAgentInput: input.agentId ?? null,
        claimedAgentAccepted: false,
        browserProvidedAgentAssertionHeaders: assertionHeaders,
      });
    }
    if (url.pathname === "/experiments/custody") {
      custodySession = crypto.randomUUID();
      return new Response(custodyExperimentPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": selfScriptPolicy, "set-cookie": `mulder_custody=${custodySession}; HttpOnly; SameSite=Strict; Path=/` } });
    }
    if (url.pathname === "/experiments/custody/module.js") return new Response(custodyExperimentModule(), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/__mulder/custody-call" && request.method === "POST") {
      if (request.headers.get("cookie")?.split(";").map((part) => part.trim()).includes(`mulder_custody=${custodySession}`) !== true) return Response.json({ error: "adapter_unauthorized" }, { status: 401 });
      if (!env.ORIGIN_SECRET || !env.ORIGIN_URL) return Response.json({ error: "origin_binding_missing" }, { status: 503 });
      let input: { city?: string };
      try { input = await request.json() as { city?: string }; }
      catch { return Response.json({ error: "bad_input" }, { status: 400 }); }
      if (!input.city || input.city.length > 100) return Response.json({ error: "city_required" }, { status: 400 });
      if (input.city === "Forbidden") return Response.json({ error: "policy_denied", rule: "deny-forbidden-city", subrequestCreated: false }, { status: 403 });
      const response = await fetch(`${env.ORIGIN_URL}/weather/${encodeURIComponent(input.city)}`, { headers: { authorization: `Bearer ${env.ORIGIN_SECRET}` } });
      return new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } });
    }
    if (url.pathname === "/experiments/schema") return new Response(schemaExperimentPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": selfScriptPolicy } });
    if (url.pathname === "/experiments/schema/module.js") return new Response(schemaExperimentModule(), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    if (url.pathname === "/__mulder" || url.pathname === "/__mulder/") {
      const origin = new Response(fixturePage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": selfScriptPolicy, "cache-control": "no-store" } });
      return new HTMLRewriter().on("body", new BootstrapInjector('<script type="module" src="/__mulder/bootstrap.js"></script>')).transform(origin);
    }
    if (url.pathname === "/__mulder/manifest") return Response.json({ tools });
    if (url.pathname === "/__mulder/bootstrap.js") {
      return new Response(webMcpBootstrapModule(tools), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
    }
    if (url.pathname.startsWith("/__mulder/call/") && request.method === "POST") {
      return callGeneratedTool(request, decodeURIComponent(url.pathname.slice("/__mulder/call/".length)));
    }
    if (url.pathname.startsWith("/api/")) return fixtureApi(request);
    if (url.pathname === "/origin") return new Response(fixturePage(), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/experiments/csp/inline" || url.pathname === "/experiments/csp/external") {
      const headers = { "content-type": "text/html; charset=utf-8", "content-security-policy": selfScriptPolicy, "cache-control": "no-store" };
      const origin = new Response(fixturePage(), { headers });
      const injection = url.pathname.endsWith("/external")
        ? '<script type="module" src="/__mulder/bootstrap.js"></script>'
        : webMcpBootstrap(tools);
      return new HTMLRewriter().on("body", new BootstrapInjector(injection)).transform(origin);
    }
    if (url.pathname === "/") {
      const origin = new Response(fixturePage(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      return new HTMLRewriter().on("body", new BootstrapInjector(webMcpBootstrap(tools))).transform(origin);
    }
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
