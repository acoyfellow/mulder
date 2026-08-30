# Supported OpenAPI subset

Mulder fails closed. An explicitly enabled operation is not published when its meaning cannot be preserved.

## Supported

- OpenAPI 3.1 documents.
- Read-only `GET` operations.
- Operation-level parameters.
- Required scalar path parameters with default or `simple` style and default or `explode: false` behavior.
- Scalar query parameters with default or `form` style and default or `explode: true` behavior.
- Inline `string`, `boolean`, `integer`, and `number` parameter schemas.
- JSON responses from the generated adapter.

## Rejected

- OpenAPI versions other than 3.1.
- Mutating `POST`, `PUT`, `PATCH`, and `DELETE` operations.
- Every request body.
- Path-item-level parameters.
- Header and cookie parameters.
- Query arrays, objects, `content`, `allowReserved`, non-form styles, and `explode: false`.
- Path styles other than `simple` and path `explode: true`.
- Multipart, form, text, and vendor request media types.
- `$ref`, composition, discriminator, nullable unions, and unimplemented JSON Schema keywords.
- Missing schemas, unmatched path templates, duplicate names, and the reserved parameter name `body`.
- Object schemas that permit undeclared properties.

## Approval-managed write primitive

Generated OpenAPI tools are read-only. Mulder does not route generated writes through the ordinary adapter.

The repository contains a durable write-approval primitive for later integration. Its origin must collapse every retry with the same tenant and Mulder intent ID into one logical effect and one stable result. Its intent digest binds the tenant, operation version, method, target, exact body bytes, policy version, credential profile, browser session commitment, and expiry.

The checked local flow uses a separate test secret and does not claim verified human identity. A production integration must authenticate a human through Access or another verified identity provider before it supplies the decision subject. The production approval route stays out of the supported product surface until that integration exists.

## Package boundary

The package exports `createWebMcpCompanion`, `injectWebMcpBootstrap`, and the public companion and OpenAPI types from one ESM entry point. It has no runtime dependencies. The consumer owns its OpenAPI document, HTML response, API implementation, credentials, and dispatch function. Mulder owns compilation, native registration source, input validation, and guarded routing.

The package does not export the demonstration Worker, fixtures, experiments, or Durable Object write primitive.

## Runtime enforcement

The edge validates the full input before it constructs or dispatches an origin request. Validation rejects missing values, unexpected properties, wrong types, invalid enums, bounds, lengths, and patterns. A validation failure creates zero origin dispatches.

Chrome registration is not treated as validation.
