import { writeFileSync } from "node:fs";
import { buildRequest } from "../../src/openapi.ts";

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/error") return Response.json({ error: "fixture_rejected" }, { status: 422 });
    return Response.json({ method: request.method, pathname: url.pathname, search: url.search, trace: request.headers.get("x-trace"), contentType: request.headers.get("content-type"), body: await request.text() });
  },
});

const origin = `http://127.0.0.1:${server.port}`;
const tool = (operation) => ({ name: "case", description: "case", inputSchema: { type: "object" }, annotations: { readOnlyHint: operation.method === "GET" }, operation });
const received = async (request) => fetch(request).then(async (response) => ({ status: response.status, body: await response.json() }));
const cases = [];

const pathResult = await received(buildRequest(tool({ method: "GET", path: "/echo/{value}", pathParameters: ["value"], queryParameters: [], hasBody: false }), { value: "A/B" }, origin));
cases.push({ name: "path-encoding", outcome: pathResult.body.pathname === "/echo/A%2FB" ? "match" : "mismatch", reachedOrigin: true, observed: pathResult });

const scalarQuery = await received(buildRequest(tool({ method: "GET", path: "/echo", pathParameters: [], queryParameters: ["tag"], hasBody: false }), { tag: "one two" }, origin));
cases.push({ name: "scalar-query", outcome: scalarQuery.body.search === "?tag=one+two" ? "match" : "mismatch", reachedOrigin: true, observed: scalarQuery });

const arrayQuery = await received(buildRequest(tool({ method: "GET", path: "/echo", pathParameters: [], queryParameters: ["tag"], hasBody: false }), { tag: ["a", "b"] }, origin));
cases.push({ name: "array-query-explode", outcome: arrayQuery.body.search === "?tag=a&tag=b" ? "match" : "mismatch", reachedOrigin: true, observed: arrayQuery, expected: "?tag=a&tag=b" });

cases.push({ name: "header-parameter", outcome: "unsupported", reachedOrigin: false, reason: "generated operation has no header parameter model" });

const jsonBody = await received(buildRequest(tool({ method: "POST", path: "/echo", pathParameters: [], queryParameters: [], hasBody: true }), { body: { city: "Lima", active: true } }, origin));
cases.push({ name: "json-body", outcome: jsonBody.body.contentType === "application/json" && jsonBody.body.body === '{"city":"Lima","active":true}' ? "match" : "mismatch", reachedOrigin: true, observed: jsonBody });

const multipart = await received(buildRequest(tool({ method: "POST", path: "/echo", pathParameters: [], queryParameters: [], hasBody: true }), { body: { file: "hello", label: "one" } }, origin));
cases.push({ name: "multipart-body", outcome: multipart.body.contentType?.startsWith("multipart/form-data") ? "match" : "mismatch", reachedOrigin: true, observed: multipart, expected: "multipart/form-data" });

const errorResponse = await received(buildRequest(tool({ method: "GET", path: "/error", pathParameters: [], queryParameters: [], hasBody: false }), {}, origin));
cases.push({ name: "http-error-status", outcome: errorResponse.status === 422 && errorResponse.body.error === "fixture_rejected" ? "match" : "mismatch", reachedOrigin: true, observed: errorResponse });

server.stop(true);
const result = { schema: "mulder.request-fidelity.v0", cases, counts: { match: cases.filter((item) => item.outcome === "match").length, mismatch: cases.filter((item) => item.outcome === "mismatch").length, unsupported: cases.filter((item) => item.outcome === "unsupported").length }, verdict: "partial" };
writeFileSync("experiments/05-request-fidelity/RESULT.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result.counts));
