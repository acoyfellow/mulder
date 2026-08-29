# Mulder

> The API is out there.

Mulder asks one question:

> Can Cloudflare turn an existing OpenAPI operation into a native WebMCP tool without changing the API implementation?

## First Gherkin

```gherkin
Given an unchanged API and its OpenAPI document
When Cloudflare serves the application through Mulder
Then Chrome discovers native WebMCP tools generated from explicitly enabled operations
And calling a generated tool reaches the original API
And an operation not explicitly enabled remains unavailable
```

## Stop gate

The spike passes only when a native Chrome WebMCP event proves discovery, invocation, and response for a generated tool. The response must come from the unchanged fixture API. A second OpenAPI operation without `x-webmcp-enabled: true` must not appear in discovery.

Generated JavaScript, page self-calls, synthetic tool lists, and HTTP-only tests do not satisfy the stop gate.

## Result

Passed locally with Chrome 151. Native browser events proved discovery, invocation, and response for `get_weather`. The generated read-only tool reached the unchanged fixture API and updated visible page state. `erase_weather` was absent from native discovery.

## Secrecy

This repository starts local-only. It has no remote and no public deployment.
