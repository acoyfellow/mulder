# Experiment 04: Credential custody

Status: proven locally with a protected independent origin

## Question

Can a native WebMCP call reach an unchanged protected API while its origin credential remains held only by the edge?

## Method

A separate local origin required a random 256-bit bearer credential. Mulder received that credential as a Worker binding. The companion page received only an HttpOnly browser-session cookie. The edge adapter added the origin credential only to its protected subrequest.

The independent origin kept monotonic authorized and unauthorized counters plus a credential fingerprint.

## Result

- A direct origin request without the credential returned 401.
- A direct adapter request without the HttpOnly session returned 401.
- The unauthorized adapter request did not increment the authorized origin counter.
- A native Chrome call discovered and invoked `get_secret_weather`.
- The protected unchanged origin returned 200 and incremented its authorized counter exactly once.
- The page could not read the HttpOnly cookie.
- Page storage, native events, HTML, bootstrap source, manifest, and receipts contained zero exact credential matches.

## Boundary

This proves local custody and route order. It does not prove a deployed Worker secret, Access identity, log redaction, or multi-session isolation. Those require deployment and principal experiments.

Receipt: `RESULT.json`

Screenshot: `native.png`

Origin fixture: `origin.mjs`
