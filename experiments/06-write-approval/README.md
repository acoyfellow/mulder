# Experiment 06: Write approval

Status: proven locally

## Question

Can reads remain immediate while a generated write waits for separate human approval and executes exactly once?

## Method

A native write call creates an immutable SHA-256 intent and waits. A separate approval route requires a secret unavailable to the page and tool input. A protected independent origin keeps a monotonic write counter.

## Result

The native write remained pending while the origin counter stayed at zero. An approval with the wrong human credential returned 401 and left the counter unchanged.

Approval of the exact intent digest released the waiting native call. The protected origin executed once, returned 200, and the intent became consumed.

A second native call with the same body produced the same digest, returned 409 `intent_replay`, and left the origin counter at one.

## Boundary

This proves the state transition locally. The approval channel uses a test secret rather than Access or WebAuthn. Concurrent replay, rejection, expiry, modified bodies, and crash recovery remain outside this result.

Receipt: `RESULT.json`

Screenshot: `native.png`

Native runner: `native-call.mjs`

Verifier: `node experiments/06-write-approval/verify.mjs`
