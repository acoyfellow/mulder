import type { OpenApiDocument } from "./openapi";

export const fixtureDocument: OpenApiDocument = {
  openapi: "3.1.0",
  paths: {
    "/api/weather/{city}": {
      get: {
        operationId: "get_weather",
        summary: "Read the current weather for a city",
        "x-webmcp-enabled": true,
        parameters: [
          { name: "city", in: "path", required: true, schema: { type: "string" } },
          { name: "units", in: "query", schema: { type: "string", enum: ["celsius", "fahrenheit"] } },
        ],
      },
      delete: {
        operationId: "erase_weather",
        summary: "Erase a city's weather record",
        "x-webmcp-enabled": false,
        parameters: [{ name: "city", in: "path", required: true, schema: { type: "string" } }],
      },
    },
  },
};

export function fixturePage(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mulder</title><style>:root{color-scheme:dark;background:#07100b;color:#d9ffe5;font:16px/1.5 ui-monospace,monospace}body{max-width:850px;margin:0 auto;padding:64px 24px}.stamp{display:inline-block;border:2px solid #64ff91;padding:6px 10px;transform:rotate(-2deg);letter-spacing:.12em}h1{font-size:clamp(42px,8vw,82px);line-height:1;margin:32px 0}.case{border:1px solid #285c38;background:#0a1910;padding:24px;margin-top:40px}pre{white-space:pre-wrap;color:#9effbb}code{color:#fff}</style></head><body><span class="stamp">CLASSIFIED</span><h1>The API is out there.</h1><p>This page did not define a WebMCP tool. Mulder read its OpenAPI file at the edge and added one.</p><div class="case"><strong>Generated tool</strong><p><code>get_weather({ city, units })</code></p><strong>Last native call</strong><pre id="mulder-result">waiting for an agent</pre></div></body></html>`;
}

export async function fixtureApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/weather\/([^/]+)$/);
  if (!match) return Response.json({ error: "not_found" }, { status: 404 });
  if (request.method === "DELETE") return Response.json({ erased: decodeURIComponent(match[1]) });
  if (request.method !== "GET") return Response.json({ error: "method_not_allowed" }, { status: 405 });
  const city = decodeURIComponent(match[1]);
  const units = url.searchParams.get("units") === "fahrenheit" ? "fahrenheit" : "celsius";
  const temperature = units === "fahrenheit" ? 66 : 19;
  return Response.json({ city, units, temperature, source: "unchanged-fixture-api" });
}
