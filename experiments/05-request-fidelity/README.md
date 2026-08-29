# Experiment 05: Request fidelity

Status: partial

## Question

Does Mulder preserve OpenAPI path, query, header, JSON body, multipart body, and HTTP error semantics when it constructs an unchanged API request?

## Method

A separate unchanged echo origin records the request it receives. Each generated request is compared with the direct request described by the operation.

## Pass

Every case gets a deterministic match, mismatch, or unsupported result. Supported claims must be based on a request received by the independent origin.

## Fail

A generated request is called faithful when its method, URL, headers, body, or status differs from the direct request.

## Result

Path encoding, scalar query parameters, JSON bodies, and HTTP error status passed against the independent echo origin.

Array query serialization failed. Mulder emitted `tag=a%2Cb` instead of repeated `tag=a&tag=b` values.

Header parameters are not represented by the current compiler.

Multipart was incorrectly sent as JSON.

## Product consequence

Mulder cannot honestly claim general OpenAPI request fidelity. It needs OpenAPI style and explode handling, a safe header allowlist, and content-type-specific body encoders.

Receipt: `RESULT.json`

Runner: `bun experiments/05-request-fidelity/run.mjs`

Verifier: `node experiments/05-request-fidelity/verify.mjs`
