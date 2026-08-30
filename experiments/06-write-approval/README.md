# Experiment 06: Durable write approval

Status: proven locally with a Durable Object and an idempotent origin

## Question

Can a native write create a durable immutable intent, wait for separate human approval, execute one logical effect, and recover safely after Worker restart?

## Method

A native call creates an opaque server-generated intent ID. One Durable Object stores its immutable outbound envelope, digest, browser-session commitment, policy version, credential profile, expiry, decision, state, and terminal result.

A separate approval route authenticates the local human fixture. Approval must contain the exact displayed digest and a decision ID. Execution uses only the stored envelope and sends the intent ID as an origin idempotency key.

## Result

- The native call returned `202 pending` and caused zero origin requests.
- Unauthorized approval returned 401 and caused zero origin requests.
- Eight concurrent copies of the same exact approval all completed with one origin idempotency key and one logical effect.
- Concurrent recovery caused four physical origin transmissions. The idempotent origin collapsed them into one logical effect.
- Repeating the same decision after completion returned the stored terminal result without another origin request.
- A different later decision returned 409.
- Wrangler was stopped and restarted. Repeating the original decision still returned the stored result. Origin request and logical-effect counters remained one.

## Product boundary

Crash-safe retry requires the origin to honor an idempotency key or deterministic resource identifier. An unchanged API without that behavior cannot guarantee one logical side effect after an uncertain network outcome. Mulder must reject approval-managed writes unless the origin declares this contract.

The local human fixture uses a separate shared secret. Production human identity remains an integration boundary for Access or another verified identity provider. Native frame and invocation IDs are not treated as agent identity.

Receipt: `RESULT.json`

Screenshot: `native.png`

Capture: `native-call.mjs`

Verifier: `node experiments/06-write-approval/verify.mjs`
