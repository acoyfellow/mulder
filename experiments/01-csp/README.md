# Experiment 01: Content Security Policy

Status: same-origin and nonce passed; hash-only blocked

## Question

Can Mulder add native WebMCP tools to a page with `Content-Security-Policy: script-src 'self'` without weakening or replacing that policy?

## Hypothesis

Inline injection will fail because the browser blocks it. An external same-origin bootstrap will succeed because the existing policy already permits scripts from `self`.

## Pass

- The inline variant discovers no generated native tool.
- The external variant discovers `get_weather` natively.
- The external native call reaches the unchanged API.
- Both responses retain the exact original CSP header.
- Mulder does not add `unsafe-inline`, a nonce, or another script origin.

## Fail

- The external script is also blocked.
- Mulder must weaken or replace CSP.
- The API implementation must add a script tag itself.

## Result

Chrome 151 discovered no tool from the inline variant. It timed out waiting for `WebMCP.toolsAdded`.

The external same-origin bootstrap retained the exact same CSP. Chrome discovered `get_weather`, called it natively, received a completed response from the unchanged fixture API, and changed visible state.

Receipt: `RESULT.json`

Screenshot: `external.png`

Verifier: `node experiments/01-csp/verify.mjs`

A nonce-only policy without `self` also passed without policy rewriting. Mulder copied the response's nonce onto the external bootstrap tag. Chrome discovered and invoked `get_weather`.

A hash-only policy without `self` blocked the external bootstrap. Chrome emitted no tool discovery event. Mulder cannot add code under a hash-only policy unless the origin already includes Mulder's exact script hash or Cloudflare rewrites the policy.

## Boundary

Rewriting a customer's hash-only policy would change its security contract. This result treats that path as blocked rather than silently weakening CSP.
