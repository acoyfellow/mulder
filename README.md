# Mulder

> The API is out there.

Mulder gives a supported OpenAPI 3.1 API a same-origin native WebMCP companion page at Cloudflare's edge. Explicitly enabled operations become tools. The API implementation does not change. Unsupported semantics fail compilation instead of becoming weaker tools.

This is a local, private installable release candidate. It has no remote and no public deployment. The package remains marked private so an explicit publication decision is still required.

## First result

Chrome 151 discovered `get_weather` as a native read-only WebMCP tool. It did not discover the disabled `erase_weather` operation. A native call reached the unchanged API handler, returned Lisbon at 19°C, and changed the visible page.

The checked receipt is in `proof/native.json`. Its screenshot is `proof/native.png`.

## Install the artifact

Build and pack the ESM library:

```bash
bun run build
npm pack --ignore-scripts
```

A Worker imports only the public package entry point:

```ts
import { createWebMcpCompanion } from "mulder";

const companion = createWebMcpCompanion({
  document: openApiDocument,
  renderPage: () => new Response(companionHtml, { headers: { "content-type": "text/html" } }),
  dispatch: (request) => unchangedApplicationFetch(request),
});
```

The tarball contains the bundled runtime, declarations, license, and product documentation. It excludes source files, fixtures, experiments, tests, and the Mulder demonstration Worker.

## Try the demonstration Worker

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

The independent-consumer gate packs the artifact, deletes its build checkout, installs it outside this repository, denies producer-source reads, runs a consumer-owned API, invokes it through native Chrome WebMCP, and inspects a Wrangler dry-run bundle. It then plants an artifact-only `shadow_write` tool and proves that exact native discovery rejects the changed artifact:

```bash
bash proof/consumer-release.sh
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
