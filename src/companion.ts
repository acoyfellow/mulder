import { webMcpBootstrapModule } from "./bootstrap";
import { buildRequest, executeTool, generateTools, type GeneratedTool, type OpenApiDocument } from "./openapi";

export type WebMcpCompanionOptions = {
  document: OpenApiDocument;
  renderPage: () => Response | Promise<Response>;
  dispatch: (request: Request, tool: GeneratedTool) => Response | Promise<Response>;
  prepareWrite?: (request: Request, tool: GeneratedTool, input: Record<string, unknown>) => Response | Promise<Response>;
  basePath?: string;
  resultSelector?: string;
  maxInputBytes?: number;
};

export type WebMcpCompanion = {
  tools: readonly GeneratedTool[];
  handle(request: Request): Promise<Response | undefined>;
};

class BootstrapInjector {
  constructor(private readonly source: string) {}

  element(element: Element): void {
    element.before(this.source, { html: true });
  }
}

function publicDescriptor({ name, description, inputSchema, annotations }: GeneratedTool) {
  return { name, description, inputSchema, annotations };
}

function normalizeBasePath(value: string): string {
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  return withSlash.length > 1 ? withSlash.replace(/\/$/, "") : withSlash;
}

export function injectWebMcpBootstrap(response: Response, bootstrapPath: string): Response {
  const source = `<script type="module" src="${bootstrapPath.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}"></script>`;
  return new HTMLRewriter().on("body", new BootstrapInjector(source)).transform(response);
}

export function createWebMcpCompanion(options: WebMcpCompanionOptions): WebMcpCompanion {
  const tools = generateTools(options.document);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  if (tools.some((tool) => tool.operation.requiresApproval) && !options.prepareWrite) throw new Error("approval-managed tools require prepareWrite");
  const basePath = normalizeBasePath(options.basePath ?? "/__mulder");
  const callPrefix = `${basePath}/call/`;
  const bootstrapPath = `${basePath}/bootstrap.js`;
  const maxInputBytes = options.maxInputBytes ?? 65_536;

  return {
    tools,
    async handle(request) {
      const url = new URL(request.url);
      if ((url.pathname === basePath || url.pathname === `${basePath}/`) && request.method === "GET") return injectWebMcpBootstrap(await options.renderPage(), bootstrapPath);
      if (url.pathname === `${basePath}/manifest` && request.method === "GET") return Response.json({ tools: tools.map(publicDescriptor) });
      if (url.pathname === bootstrapPath && request.method === "GET") {
        return new Response(webMcpBootstrapModule(tools, { callPathPrefix: callPrefix, resultSelector: options.resultSelector }), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" } });
      }
      if (!url.pathname.startsWith(callPrefix) || request.method !== "POST") return undefined;
      const name = decodeURIComponent(url.pathname.slice(callPrefix.length));
      const tool = byName.get(name);
      if (!tool) return Response.json({ error: "tool_not_found" }, { status: 404 });
      const declared = Number(request.headers.get("content-length") ?? "0");
      if (!Number.isFinite(declared) || declared > maxInputBytes) return Response.json({ error: "input_too_large" }, { status: 413 });
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > maxInputBytes) return Response.json({ error: "input_too_large" }, { status: 413 });
      let input: Record<string, unknown>;
      try {
        const parsed = JSON.parse(text) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad input");
        input = parsed as Record<string, unknown>;
      } catch {
        return Response.json({ error: "bad_input" }, { status: 400 });
      }
      try {
        if (tool.operation.requiresApproval) {
          const outbound = buildRequest(tool, input, url.origin);
          return await options.prepareWrite?.(outbound, tool, input) ?? Response.json({ error: "approval_required" }, { status: 409 });
        }
        return await executeTool(tool, input, url.origin, (outbound) => options.dispatch(outbound, tool));
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "bad_input" }, { status: 400 });
      }
    },
  };
}
