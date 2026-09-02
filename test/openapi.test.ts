import { describe, expect, test } from "bun:test";
import { webMcpBootstrap, webMcpBootstrapModule } from "../src/bootstrap";
import { fixtureDocument } from "../src/fixture";
import { buildRequest, executeTool, generateTools, type OpenApiDocument, type OpenApiOperation } from "../src/openapi";

function documentWith(operation: OpenApiOperation, path = "/items/{id}"): OpenApiDocument {
  return { openapi: "3.1.0", paths: { [path]: { get: { operationId: "get_item", "x-webmcp-enabled": true, ...operation } } } };
}

describe("OpenAPI to WebMCP", () => {
  test("generates only explicitly enabled operations", () => {
    const tools = generateTools(fixtureDocument);
    expect(tools.map((tool) => tool.name)).toEqual(["get_weather"]);
    expect(tools.some((tool) => tool.name === "erase_weather")).toBe(false);
  });

  test("turns path and query inputs into the original API request", () => {
    const [tool] = generateTools(fixtureDocument);
    const request = buildRequest(tool, { city: "New York", units: "fahrenheit" }, "https://mulder.test");
    expect(request.method).toBe("GET");
    expect(request.url).toBe("https://mulder.test/api/weather/New%20York?units=fahrenheit");
  });

  test("builds native registration without copying disabled operations", () => {
    const source = webMcpBootstrap(generateTools(fixtureDocument));
    expect(source).toContain("context.registerTool");
    expect(source).toContain("get_weather");
    expect(source).not.toContain("erase_weather");
    expect(webMcpBootstrapModule(generateTools(fixtureDocument))).not.toContain("<script");
  });

  test("fails closed when an enabled operation has no stable name", () => {
    expect(() => generateTools({ openapi: "3.1.0", paths: { "/danger": { get: { "x-webmcp-enabled": true } } } })).toThrow("needs operationId");
  });

  test("rejects unsupported parameter locations, arrays, references, and media types", () => {
    const base = { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] };
    expect(() => generateTools(documentWith({ ...base, parameters: [...base.parameters, { name: "authorization", in: "header", schema: { type: "string" } }] }))).toThrow("unsupported parameter location header");
    expect(() => generateTools(documentWith({ ...base, parameters: [...base.parameters, { name: "tags", in: "query", schema: { type: "array", items: { type: "string" } } }] }))).toThrow("unsupported schema type array");
    expect(() => generateTools(documentWith({ ...base, parameters: [...base.parameters, { name: "id2", in: "path", required: true, style: "matrix", schema: { type: "string" } }] }, "/items/{id}/{id2}"))).toThrow("style matrix is unsupported");
    expect(() => generateTools(documentWith({ ...base, requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Item" } } } } }))).toThrow("request bodies are unsupported");
    expect(() => generateTools(documentWith({ ...base, requestBody: { content: { "multipart/form-data": { schema: { type: "object" } } } } }))).toThrow("request bodies are unsupported");
  });

  test("rejects path mismatches, reserved names, and path-item parameters", () => {
    expect(() => generateTools(documentWith({ parameters: [{ name: "other", in: "path", required: true, schema: { type: "string" } }] }))).toThrow("path template and parameters do not match");
    expect(() => generateTools(documentWith({ parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "body", in: "query", schema: { type: "string" } }] }))).toThrow("duplicate or reserved parameter body");
    const withPathItemParameters = { openapi: "3.1.0", paths: { "/items/{id}": { parameters: [], get: { operationId: "get_item", "x-webmcp-enabled": true } } } } as unknown as OpenApiDocument;
    expect(() => generateTools(withPathItemParameters)).toThrow("path-item parameters are unsupported");
  });

  test("validation failures create zero origin dispatches", async () => {
    const [tool] = generateTools(fixtureDocument);
    let dispatches = 0;
    const dispatch = () => { dispatches += 1; return Response.json({ reached: true }); };
    await expect(executeTool(tool, { city: "Lisbon", units: "kelvin" }, "https://mulder.test", dispatch)).rejects.toThrow("not in enum");
    expect(dispatches).toBe(0);
    const response = await executeTool(tool, { city: "Lisbon", units: "celsius" }, "https://mulder.test", dispatch);
    expect(response.status).toBe(200);
    expect(dispatches).toBe(1);
  });

  test("requires explicit approval and a bounded JSON schema for generated writes", async () => {
    const unapproved = { openapi: "3.1.0", paths: { "/items": { post: { operationId: "create_item", "x-webmcp-enabled": true } } } } as OpenApiDocument;
    expect(() => generateTools(unapproved)).toThrow("must require approval");
    const document = { openapi: "3.1.0", paths: { "/items/{id}": { post: {
      operationId: "create_item",
      "x-webmcp-enabled": true,
      "x-webmcp-approval-required": true,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[a-z]+$" } }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: false, required: ["value"], properties: { value: { type: "string", maxLength: 20 } } } } } },
    } } } } as OpenApiDocument;
    const tool = generateTools(document)[0];
    expect(tool.operation.requiresApproval).toBe(true);
    expect(tool.annotations).toEqual({ readOnlyHint: false, destructiveHint: true });
    const request = buildRequest(tool, { id: "alpha", body: { value: "ready" } }, "https://mulder.test");
    expect(request.url).toBe("https://mulder.test/items/alpha");
    expect(await request.json() as unknown).toEqual({ value: "ready" });
    let dispatches = 0;
    await expect(executeTool(tool, { id: "alpha", body: { value: "ready" } }, "https://mulder.test", () => { dispatches += 1; return Response.json({}); })).rejects.toThrow("cannot use direct dispatch");
    expect(dispatches).toBe(0);
  });

  test("validates the complete input before request construction", async () => {
    const tool = {
      name: "internal_json_request",
      description: "internal validated request",
      inputSchema: { type: "object", additionalProperties: false, required: ["id", "limit", "body"], properties: {
        id: { type: "string", pattern: "^[a-z]+$" },
        limit: { type: "integer", minimum: 1, maximum: 10 },
        body: { type: "object", additionalProperties: false, required: ["name"], properties: { name: { type: "string", minLength: 2 }, active: { type: "boolean" } } },
      } },
      annotations: { readOnlyHint: false, destructiveHint: true },
      operation: { method: "POST" as const, path: "/items/{id}", pathParameters: ["id"], queryParameters: ["limit"], hasBody: true, requiresApproval: true },
    };
    const request = buildRequest(tool, { id: "alpha", limit: 2, body: { name: "ok", active: true } }, "https://mulder.test");
    expect(request.url).toBe("https://mulder.test/items/alpha?limit=2");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(await request.json() as unknown).toEqual({ name: "ok", active: true });
    expect(() => buildRequest(tool, { id: "BAD", limit: 2, body: { name: "ok" } }, "https://mulder.test")).toThrow("does not match pattern");
    expect(() => buildRequest(tool, { id: "alpha", limit: 11, body: { name: "ok" } }, "https://mulder.test")).toThrow("above maximum");
    expect(() => buildRequest(tool, { id: "alpha", limit: 2, body: { name: "x" } }, "https://mulder.test")).toThrow("shorter than minLength");
    expect(() => buildRequest(tool, { id: "alpha", limit: 2, body: { name: "ok", extra: true } }, "https://mulder.test")).toThrow("unexpected property extra");
    expect(() => buildRequest(tool, { id: "alpha", limit: 2, body: { name: "ok" }, extra: true }, "https://mulder.test")).toThrow("unexpected property extra");
  });
});
