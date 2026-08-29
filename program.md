# Mulder research program

## North star

Determine whether Cloudflare can turn an existing OpenAPI API into a safe native WebMCP interface without requiring changes to the API implementation.

## Method

Each experiment isolates one unknown. It starts with a falsifiable claim. It records pass, fail, partial, or blocked. A synthetic tool list, generated source, or HTTP-only call cannot prove native WebMCP behavior.

Do not build the showcase until the existential unknowns have results.

## Existential questions

1. Can injection survive a realistic Content Security Policy without weakening it?
2. Where do native WebMCP tools live when the API has no HTML page?
3. Which OpenAPI schemas can Chrome accept as native tool input schemas?
4. Can authentication reach the unchanged API without exposing credentials to the page or agent?
5. Can generated requests preserve OpenAPI path, query, header, body, and error semantics?
6. Can writes require approval while reads remain immediate?
7. Can Cloudflare distinguish the human, browser, and agent involved in one call?
8. What happens when the OpenAPI document changes during an active page session?
9. How many generated tools can Chrome discover and use reliably?
10. Can edge policy deny a generated call before the unchanged API sees it?

## Rule

A product claim is earned only after its corresponding experiment passes. Failed experiments narrow the product instead of becoming documentation footnotes.
