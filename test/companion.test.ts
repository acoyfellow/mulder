import { describe, expect, test } from "bun:test";
import { createWebMcpCompanion } from "../src/companion";
import type { OpenApiDocument } from "../src/openapi";

const document: OpenApiDocument = {
  openapi: "3.1.0",
  paths: {
    "/api/books/{id}": {
      get: {
        operationId: "get_book",
        "x-webmcp-enabled": true,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-z]+$" } },
          { name: "edition", in: "query", schema: { type: "integer", minimum: 1 } },
        ],
      },
      delete: { operationId: "delete_book", "x-webmcp-enabled": false },
    },
  },
};

function companion() {
  const dispatched: Request[] = [];
  return {
    dispatched,
    value: createWebMcpCompanion({
      document,
      basePath: "/agent-api",
      resultSelector: "#result",
      renderPage: () => new Response("<body><pre id=result></pre></body>", { headers: { "content-type": "text/html" } }),
      dispatch: async (request) => {
        dispatched.push(request);
        return Response.json({ source: "consumer-api", path: new URL(request.url).pathname });
      },
    }),
  };
}

describe("WebMCP companion", () => {
  test("publishes only compiled public descriptors and configurable bootstrap routes", async () => {
    const { value } = companion();
    const manifest = await value.handle(new Request("https://consumer.test/agent-api/manifest"));
    expect(manifest?.status).toBe(200);
    expect((await manifest?.json() as { tools: Array<{ name: string }> }).tools.map((tool) => tool.name)).toEqual(["get_book"]);
    const bootstrap = await value.handle(new Request("https://consumer.test/agent-api/bootstrap.js"));
    const source = await bootstrap?.text();
    expect(source).toContain('const callPathPrefix="/agent-api/call/"');
    expect(source).toContain('document.querySelector("#result")');
    expect(source).not.toContain("delete_book");
  });

  test("validates before consumer dispatch", async () => {
    const { value, dispatched } = companion();
    const invalid = await value.handle(new Request("https://consumer.test/agent-api/call/get_book", { method: "POST", body: JSON.stringify({ id: "123" }) }));
    expect(invalid?.status).toBe(400);
    expect(dispatched).toHaveLength(0);
    const valid = await value.handle(new Request("https://consumer.test/agent-api/call/get_book", { method: "POST", body: JSON.stringify({ id: "mulder", edition: 2 }) }));
    expect(valid?.status).toBe(200);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].url).toBe("https://consumer.test/api/books/mulder?edition=2");
  });

  test("rejects unknown tools, malformed input, and oversized input", async () => {
    const { value, dispatched } = companion();
    expect((await value.handle(new Request("https://consumer.test/agent-api/call/missing", { method: "POST", body: "{}" })))?.status).toBe(404);
    expect((await value.handle(new Request("https://consumer.test/agent-api/call/get_book", { method: "POST", body: "[]" })))?.status).toBe(400);
    expect((await value.handle(new Request("https://consumer.test/agent-api/call/get_book", { method: "POST", headers: { "content-length": "70000" }, body: "{}" })))?.status).toBe(413);
    expect(dispatched).toHaveLength(0);
    expect(await value.handle(new Request("https://consumer.test/other"))).toBeUndefined();
  });
});
