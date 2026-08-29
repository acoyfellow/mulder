# Experiment 07: Principal identity

Status: falsified for native WebMCP alone

## Question

Does a native WebMCP invocation give the edge a verifiable agent principal that is distinct from the human and browser session?

## Hypothesis

Chrome's native events identify a frame and invocation, but the page tool callback receives only agent-controlled input. The HTTP request created by that callback carries the browser session, not a cryptographic agent identity.

## Pass

One native call must produce an edge record that separates independently verified human, browser, and agent principals. A claimed agent identifier in tool input must not count.

## Falsify

If the edge has no browser-provided agent assertion, the three-principal model is falsified for native WebMCP alone. Frame IDs, invocation IDs, page-generated headers, and tool input cannot be relabeled as agent identity.

## Result

Chrome produced a native frame ID and invocation ID. The edge verified its own HttpOnly browser session. It received no authorization, signature, signature-input, agent ID, or agent-signature header from the browser.

The native call included `agentId: spoofed-agent` outside the published input schema. Chrome passed it through. The edge recorded but did not accept that claim.

No human assertion existed in this local run. No agent assertion existed at all. Native WebMCP alone cannot produce the three-principal audit record.

## Product consequence

Cloudflare can authenticate the human and browser session separately. A trustworthy agent principal needs another protocol, such as Web Bot Auth or a signed host assertion. It cannot be inferred from native WebMCP events.

Receipt: `RESULT.json`

Screenshot: `native.png`

Verifier: `node experiments/07-principal-identity/verify.mjs`
