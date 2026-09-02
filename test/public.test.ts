import { describe, expect, test } from "bun:test";
import { generateTools } from "../src/public";

describe("public compiler", () => {
  test("exports the same fail-closed OpenAPI compiler used by the companion", () => {
    const tools = generateTools({
      openapi: "3.1.0",
      paths: {
        "/status": {
          get: { operationId: "get_status", "x-webmcp-enabled": true },
          post: { operationId: "set_status", "x-webmcp-enabled": false },
        },
      },
    });
    expect(tools.map((tool) => tool.name)).toEqual(["get_status"]);
  });
});
