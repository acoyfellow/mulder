# Experiments

| ID | Unknown | State | Terminal evidence |
|---|---|---|---|
| 01 | Content Security Policy | pass for `script-src 'self'` | Inline discovery failed; external same-origin bootstrap passed natively without changing CSP |
| 02 | API with no HTML document | partial | JSON cannot publish tools; a generated same-origin companion document passed natively |
| 03 | OpenAPI schema compatibility | proven with boundary | Ten shapes register and invoke; Chrome did not enforce tested constraints |
| 04 | Credential custody | proven locally | Native call reached a protected independent origin; credential remained edge-only |
| 05 | Request fidelity | partial | Path, scalar query, JSON, and errors match; arrays, headers, and multipart do not |
| 06 | Approval for writes | unrun | Read executes; write pauses; approval executes once; replay fails |
| 07 | Principal identity | falsified for WebMCP alone | Browser session is verifiable; native calls carry no edge-verifiable agent principal |
| 08 | Specification drift | unrun | Added, changed, and removed operations update native tools safely |
| 09 | Tool-count limits | unrun | Measured discovery and call boundary with failure behavior |
| 10 | Edge denial | unrun | Denied generated call never reaches the unchanged API |
