import { describe, expect, test } from "bun:test";
import { webMcpBootstrap, webMcpBootstrapModule } from "../src/bootstrap";
import { fixtureDocument } from "../src/fixture";
import { buildRequest, generateTools } from "../src/openapi";

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
    expect(() => generateTools({ openapi: "3.1.0", paths: { "/danger": { post: { "x-webmcp-enabled": true } } } })).toThrow("needs operationId");
  });
});
