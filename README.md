# Mulder

> The API is out there.

Mulder gives a supported OpenAPI 3.1 API a same-origin native WebMCP companion page at Cloudflare's edge. Explicitly enabled operations become tools. The API implementation does not change. Unsupported semantics fail compilation instead of becoming weaker tools.

This is a local, private release candidate. It has no remote and no public deployment.

## First result

Chrome 151 discovered `get_weather` as a native read-only WebMCP tool. It did not discover the disabled `erase_weather` operation. A native call reached the unchanged API handler, returned Lisbon at 19°C, and changed the visible page.

The checked receipt is in `proof/native.json`. Its screenshot is `proof/native.png`.

## Try it

```bash
bun install
bun run dev
```

Open <http://127.0.0.1:8891>.

The demo has one enabled OpenAPI operation:

```text
GET /api/weather/{city} → get_weather
```

It also has one disabled operation:

```text
DELETE /api/weather/{city} → no WebMCP tool
```

Inspect the generated manifest:

```bash
curl http://127.0.0.1:8891/__mulder/manifest
```

Call the edge adapter directly:

```bash
curl -X POST http://127.0.0.1:8891/__mulder/call/get_weather \
  -H 'content-type: application/json' \
  -d '{"city":"Lisbon","units":"celsius"}'
```

The exact supported subset is in `SUPPORT.md`. The experiment findings are in `findings.md`. Final adversarial findings and their dispositions are in `SECURITY-REVIEW.md`.

The fast check is:

```bash
bun run check
```

The release-readiness gate creates a fresh archived checkout, installs only from the public registry, replays native Chrome behavior, and replays durable approval across a Worker restart:

```bash
bash proof/product-ready.sh
```

The checks prove native discovery, invocation, response, visible state, credential custody, input denial before origin dispatch, durable approval, idempotent logical execution, and screenshot integrity. They also prove that `erase_weather` remains absent.

`proof/native-harness.mjs` vendors the MIT-licensed `webmcp-proof` 0.0.1 harness from <https://github.com/acoyfellow/webmcp-proof>. Keeping the harness in this repository removes a sibling-repository dependency from the release gate.

## Shape

```text
OpenAPI document
  → explicit x-webmcp-enabled operations
  → generated native tool descriptors
  → HTMLRewriter injection at the edge
  → guarded edge call adapter
  → unchanged API handler
```

Read `SPIKE.md` for the Gherkin and stop gate.
