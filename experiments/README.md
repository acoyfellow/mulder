# Experiments

| ID | Unknown | State | Terminal evidence |
|---|---|---|---|
| 01 | Content Security Policy | partial | Same-origin and nonce policies passed unchanged; hash-only policy blocked injection |
| 02 | API with no HTML document | partial | JSON cannot publish tools; a generated same-origin companion document passed natively |
| 03 | OpenAPI schema compatibility | proven with boundary | Ten shapes register and invoke; Chrome did not enforce tested constraints |
| 04 | Credential custody | proven locally | Native call reached a protected independent origin; credential remained edge-only |
| 05 | Request fidelity | partial | Path, scalar query, JSON, and errors match; arrays, headers, and multipart do not |
| 06 | Approval for writes | proven locally | Native write waited at zero origin calls; exact approval executed once; replay returned 409 |
| 07 | Principal identity | falsified for WebMCP alone | Browser session is verifiable; native calls carry no edge-verifiable agent principal |
| 08 | Specification drift | proven locally | Native v1 and v2 additions passed; v1 removal emitted and later call failed |
| 09 | Tool-count limits | tested ceiling passed | Exact native discovery and first/final calls passed through 2,000 tools |
| 10 | Edge denial | proven locally | Native 403 left independent origin counters at zero; allowed control incremented once |
