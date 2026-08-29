# Mulder

> The API is out there.

Mulder turns explicitly enabled OpenAPI operations into native WebMCP tools at Cloudflare's edge. The API implementation does not change.

This is a local, private spike. It is not a product yet.

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

The terminal check is:

```bash
bun run check
```

That check verifies the compiler tests and the checked native Chrome receipt. The receipt contains discovery, invocation, response, visible state, and a screenshot hash. It also proves that `erase_weather` remained absent.

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
