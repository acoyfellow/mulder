# Experiment 10: Edge denial before origin

Status: proven locally

## Question

Can Mulder deny a native generated call before creating a protected origin subrequest?

## Method

A separate protected origin keeps a monotonic authorized request counter. One native call is denied by an edge policy. A second native call is allowed as a positive control.

## Pass

- The denied native call returns 403 with `subrequestCreated: false`.
- The origin counter remains zero after the denial.
- The allowed native call returns 200 and increments the counter exactly once.
- A direct adapter call without the browser session returns 401 and leaves the origin counter unchanged.

Log absence alone does not pass. The independent monotonic counter is authoritative.

## Result

A direct adapter call without the HttpOnly browser session returned 401. The origin counter stayed at zero.

A native call for `Forbidden` completed with a 403 policy result and `subrequestCreated: false`. Both origin counters stayed at zero.

A separate allowed native call returned 200. The origin authorized counter increased from zero to one.

## Boundary

This proves local edge ordering with an independent protected origin. It does not prove Cloudflare WAF integration or network-wide agent identity.

Receipt: `RESULT.json`

Screenshot: `denied.png`

Verifier: `node experiments/10-edge-denial/verify.mjs`
