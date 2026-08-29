# Experiment 02: API without an HTML document

Status: original claim falsified; companion model passed

## Question

Where can native WebMCP tools exist when the upstream API serves JSON and has no page to transform?

## Hypothesis

A JSON API response cannot publish native WebMCP tools because the browser API belongs to a document. Cloudflare can generate a same-origin companion document without changing the API implementation.

## Pass

- Opening the OpenAPI JSON directly discovers no native tool.
- Opening a generated same-origin companion document discovers `get_weather`.
- Calling that tool reaches the unchanged JSON API.
- Direct API URLs and responses remain unchanged.

## Result

Chrome 151 discovered no native tool when it opened the OpenAPI JSON document. It timed out waiting for `WebMCP.toolsAdded`.

Cloudflare then served a generated companion document at `/__mulder/`. Chrome discovered `get_weather` there, called it natively, reached the unchanged JSON API, and changed visible state.

Receipt: `RESULT.json`

Screenshot: `companion.png`

Verifier: `node experiments/02-api-without-document/verify.mjs`

## Product consequence

If this passes, “every API becomes WebMCP” is too broad. The honest claim becomes: “Cloudflare gives any OpenAPI API a native WebMCP companion page.”
