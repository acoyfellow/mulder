import { createWebMcpCompanion } from "mulder";
import { existingApi, requests } from "./api";

const openApiDocument = {
  openapi: "3.1.0",
  paths: {
    "/api/services/{service}": {
      get: {
        operationId: "get_service_health",
        description: "Get the health of one service in one region.",
        "x-webmcp-enabled": true,
        parameters: [
          { name: "service", in: "path", required: true, schema: { type: "string" } },
          { name: "region", in: "query", required: true, schema: { type: "string" } },
        ],
      },
    },
  },
};

const page = () => new Response(`<!doctype html><html><head><meta charset="utf-8"><title>My first Mulder tool</title></head><body><main><p>Mulder starter</p><h1>Your service API is ready for a browser agent.</h1><pre id="mulder-result">${requests.length ? "Call completed" : "Waiting for get_service_health"}</pre></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });

const companion = createWebMcpCompanion({
  document: openApiDocument,
  renderPage: page,
  dispatch: (request) => existingApi(request),
});

export default {
  async fetch(request: Request): Promise<Response> {
    const generated = await companion.handle(request);
    if (generated) return generated;
    return existingApi(request);
  },
};
