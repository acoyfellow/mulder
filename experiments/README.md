# Experiments

| ID | Unknown | State | Terminal evidence |
|---|---|---|---|
| 01 | Content Security Policy | pass for `script-src 'self'` | Inline discovery failed; external same-origin bootstrap passed natively without changing CSP |
| 02 | API with no HTML document | unrun | A concrete host model passes or the “every API” claim dies |
| 03 | OpenAPI schema compatibility | unrun | Corpus matrix against native Chrome registration |
| 04 | Credential custody | unrun | Authenticated origin call with no credential in page, tool input, or receipt |
| 05 | Request fidelity | unrun | Path, query, header, JSON, multipart, and error cases match direct API calls |
| 06 | Approval for writes | unrun | Read executes; write pauses; approval executes once; replay fails |
| 07 | Principal identity | unrun | Human, browser session, and agent identity remain distinct in one audit record |
| 08 | Specification drift | unrun | Added, changed, and removed operations update native tools safely |
| 09 | Tool-count limits | unrun | Measured discovery and call boundary with failure behavior |
| 10 | Edge denial | unrun | Denied generated call never reaches the unchanged API |
