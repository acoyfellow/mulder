# Supported OpenAPI subset

Mulder fails closed. An explicitly enabled operation is not published when its meaning cannot be preserved.

## Supported

- OpenAPI 3.1 documents.
- `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`.
- Operation-level parameters.
- Required scalar path parameters.
- Scalar query parameters with default or `form` style and default or `explode: true` behavior.
- Inline `string`, `boolean`, `integer`, and `number` parameter schemas.
- One exact `application/json` request body.
- Inline JSON body schemas with objects, arrays, scalar values, enums, required properties, numeric bounds, string lengths, and patterns.
- Object schemas that explicitly set `additionalProperties: false`.
- JSON responses from the generated adapter.

## Rejected

- OpenAPI versions other than 3.1.
- Path-item-level parameters.
- Header and cookie parameters.
- Query arrays, objects, `content`, `allowReserved`, non-form styles, and `explode: false`.
- Multipart, form, text, and vendor request media types.
- `$ref`, composition, discriminator, nullable unions, and unimplemented JSON Schema keywords.
- Missing schemas, unmatched path templates, duplicate names, and the reserved parameter name `body`.
- Object schemas that permit undeclared properties.

## Runtime enforcement

The edge validates the full input before it constructs or dispatches an origin request. Validation rejects missing values, unexpected properties, wrong types, invalid enums, bounds, lengths, and patterns. A validation failure creates zero origin dispatches.

Chrome registration is not treated as validation.
