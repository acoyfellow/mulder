# Findings

## Earned shape

Cloudflare can generate a native WebMCP companion page for an OpenAPI API. Explicitly enabled operations become tools. The edge can validate policy, hold an origin credential, pause writes for separate approval, and refuse denied calls before the origin.

## Claims that died

- A JSON API response cannot itself host native WebMCP tools. Native tools need a document.
- Inline injection fails under ordinary `script-src 'self'`.
- Hash-only CSP blocks injection unless the origin already permits Mulder's exact script or Cloudflare rewrites the policy.
- Chrome accepts tested schema shapes but did not enforce tested maximum, pattern, `oneOf`, or unresolved `$ref` constraints.
- Native WebMCP provides frame and invocation identifiers, not an edge-verifiable agent principal.
- The current request compiler is not general. Array query, header, and multipart fidelity are missing.

## Surprises

- A same-origin external bootstrap works without weakening `script-src 'self'`.
- Reusing an existing response nonce also works without rewriting a nonce-only policy.
- Chrome 151 discovered and invoked generated tool sets through 2,000 tools. This says nothing about agent selection quality.
- A native write can remain open while a separate channel approves its exact digest, then complete through the original invocation.

## Product boundary

The honest first product is not “every API becomes WebMCP.” It is:

> Give an OpenAPI API a Cloudflare-hosted native WebMCP companion page, with explicit operation exposure and edge enforcement.

A production version still needs a real OpenAPI resolver and validator, complete request encoders, durable approval state, production identity, deployment proof, and an explicit policy for CSPs that cannot admit the bootstrap.
