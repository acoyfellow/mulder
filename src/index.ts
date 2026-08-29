import { webMcpBootstrap } from "./bootstrap";
import { fixtureApi, fixtureDocument, fixturePage } from "./fixture";
import { buildRequest, generateTools } from "./openapi";

const tools = generateTools(fixtureDocument);

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
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/openapi.json") return Response.json(fixtureDocument);
    if (url.pathname === "/__mulder/manifest") return Response.json({ tools });
    if (url.pathname.startsWith("/__mulder/call/") && request.method === "POST") {
      return callGeneratedTool(request, decodeURIComponent(url.pathname.slice("/__mulder/call/".length)));
    }
    if (url.pathname.startsWith("/api/")) return fixtureApi(request);
    if (url.pathname === "/origin") return new Response(fixturePage(), { headers: { "content-type": "text/html; charset=utf-8" } });
    if (url.pathname === "/") {
      const origin = new Response(fixturePage(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      return new HTMLRewriter().on("body", new BootstrapInjector(webMcpBootstrap(tools))).transform(origin);
    }
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler;
