# Product-readiness security review

The final adversarial review found six release blockers. This file records their disposition.

| Finding | Disposition |
|---|---|
| Path parameters accepted unsupported OpenAPI serialization | Closed. Generated parameters accept only default or `simple` path style with default or `explode: false`. Matrix and other forms fail compilation. |
| Generated mutating tools bypassed approval | Closed by subtraction. The generated product surface is read-only. Every enabled `POST`, `PUT`, `PATCH`, or `DELETE` fails compilation. |
| An approved intent could dispatch after expiry | Closed. An expired approved intent becomes `expired`. An expired uncertain dispatch returns `origin_outcome_unknown` and does not issue a late retry. |
| The local shared secret was described as verified human identity | Closed as a product boundary. Approval routes exist only when `LOCAL_APPROVAL_FIXTURE=true`. Documentation identifies the secret as a test fixture. Production human identity is not claimed. |
| The CSP nonce was constant | Closed. Every response now uses a fresh cryptographically random nonce. The checked experiment proves two response nonces differ and match their own policy and script tag. |
| The product gate trusted old security receipts | Closed. The gate now reruns nonce and hash-only CSP behavior, credential custody, denial-before-origin, native discovery, native invocation, concurrent durable approval, and restart recovery. |

## Supported release surface

The release candidate exposes generated native tools only for the read-only subset in `SUPPORT.md`. Durable write approval remains a disabled integration primitive. It is not part of the generated product surface.
