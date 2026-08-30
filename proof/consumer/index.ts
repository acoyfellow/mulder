import { createWebMcpCompanion } from "mulder";
import { applicationFetch, consumerPage } from "./api";

const document = {
  openapi: "3.1.0",
  paths: {
    "/api/weather/{city}": {
      get: {
        operationId: "get_weather",
        "x-webmcp-enabled": true,
        parameters: [
          { name: "city", in: "path", required: true, schema: { type: "string" } },
          { name: "units", in: "query", schema: { type: "string", enum: ["celsius", "fahrenheit"] } },
        ],
      },
      delete: { operationId: "erase_weather", "x-webmcp-enabled": false },
    },
  },
};

const companion = createWebMcpCompanion({
  document,
  renderPage: () => new Response(consumerPage(), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'" } }),
  dispatch: (request) => applicationFetch(request),
});

export default {
  async fetch(request: Request): Promise<Response> {
    const generated = await companion.handle(request);
    if (generated) return generated;
    return applicationFetch(request);
  },
};
