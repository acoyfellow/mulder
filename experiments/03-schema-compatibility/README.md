# Experiment 03: OpenAPI schema compatibility

Status: proven for registration and invocation; browser validation falsified

## Question

Which OpenAPI-style input schemas can Chrome 151 discover and invoke as native WebMCP tools, and does Chrome enforce their constraints?

## Corpus

Ten schema shapes were tested in isolated native pages: strings and enums, integer ranges, booleans, numbers, arrays, nested objects, patterns, nullable unions, `oneOf`, and unresolved `$ref`.

## Pass

Every case must have a deterministic native registration, discovery, and invocation result. Constraint enforcement must be tested with invalid values rather than inferred from registration.

## Result

All ten schemas registered, appeared in native `WebMCP.toolsAdded` events, and completed native invocations when tested one at a time.

Chrome accepted invalid values for an integer maximum, string pattern, `oneOf`, and unresolved `$ref`. All four reached the tool executor and completed.

The first combined-page attempt observed only the final synchronization tool before capture. Isolating one schema per page removed that observation race.

## Product consequence

Chrome's acceptance of a schema is not input validation. Mulder must resolve references and validate every generated call at the edge before it reaches the API.

Receipt: `RESULT.json`

Screenshot: `native.png`

Verifier: `node experiments/03-schema-compatibility/verify.mjs`
