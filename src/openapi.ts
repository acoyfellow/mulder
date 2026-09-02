export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  additionalProperties?: boolean;
  [keyword: string]: unknown;
};

export type OpenApiParameter = {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  content?: Record<string, unknown>;
  schema?: JsonSchema;
};

export type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: JsonSchema }>;
  };
  "x-webmcp-enabled"?: boolean;
  "x-webmcp-approval-required"?: boolean;
};

export type OpenApiDocument = {
  openapi: string;
  paths: Record<string, Record<string, OpenApiOperation>>;
};

export type GeneratedTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean };
  operation: {
    method: "GET" | "POST" | "DELETE";
    path: string;
    pathParameters: string[];
    queryParameters: string[];
    hasBody: boolean;
    requiresApproval: boolean;
  };
};

const methods = new Set(["get", "post", "put", "patch", "delete"]);
const scalarTypes = new Set(["string", "boolean", "integer", "number"]);
const schemaKeywords = new Set(["type", "description", "properties", "required", "items", "enum", "minimum", "maximum", "minLength", "maxLength", "minItems", "maxItems", "pattern", "additionalProperties"]);

function fail(context: string, message: string): never {
  throw new Error(`${context}: ${message}`);
}

function assertSupportedSchema(schema: JsonSchema | undefined, context: string, allowComplex: boolean): asserts schema is JsonSchema {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) fail(context, "inline schema required");
  for (const keyword of Object.keys(schema)) if (!schemaKeywords.has(keyword)) fail(context, `unsupported schema keyword ${keyword}`);
  if (!schema.type) fail(context, "schema type required");
  if (scalarTypes.has(schema.type)) {
    if (schema.properties || schema.items) fail(context, `${schema.type} cannot contain properties or items`);
  } else if (schema.type === "object" && allowComplex) {
    if (!schema.properties) fail(context, "object properties required");
    if (schema.additionalProperties !== false) fail(context, "object schemas require additionalProperties false");
    const properties = schema.properties;
    for (const name of schema.required ?? []) if (!(name in properties)) fail(context, `required property ${name} is not declared`);
    for (const [name, child] of Object.entries(properties)) assertSupportedSchema(child, `${context}.${name}`, true);
  } else if (schema.type === "array" && allowComplex) {
    assertSupportedSchema(schema.items, `${context} items`, true);
  } else {
    fail(context, `unsupported schema type ${schema.type}`);
  }
  if (schema.pattern !== undefined) {
    try { new RegExp(schema.pattern); } catch { fail(context, "invalid pattern"); }
  }
}

function operationSchema(operation: OpenApiOperation, method: "GET" | "POST" | "DELETE", path: string): { schema: JsonSchema; pathParameters: string[]; queryParameters: string[]; hasBody: boolean } {
  const context = `${method} ${path}`;
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const pathParameters: string[] = [];
  const queryParameters: string[] = [];
  const names = new Set<string>();

  for (const parameter of operation.parameters ?? []) {
    if (parameter.in !== "path" && parameter.in !== "query") fail(context, `unsupported parameter location ${parameter.in}`);
    if (parameter.content) fail(context, `parameter ${parameter.name} content is unsupported`);
    if (parameter.allowReserved === true) fail(context, `parameter ${parameter.name} allowReserved is unsupported`);
    if (parameter.in === "query" && parameter.style !== undefined && parameter.style !== "form") fail(context, `parameter ${parameter.name} style ${parameter.style} is unsupported`);
    if (parameter.in === "query" && parameter.explode === false) fail(context, `parameter ${parameter.name} explode false is unsupported`);
    if (parameter.in === "path" && parameter.style !== undefined && parameter.style !== "simple") fail(context, `parameter ${parameter.name} style ${parameter.style} is unsupported`);
    if (parameter.in === "path" && parameter.explode === true) fail(context, `parameter ${parameter.name} explode true is unsupported`);
    if (names.has(parameter.name) || parameter.name === "body") fail(context, `duplicate or reserved parameter ${parameter.name}`);
    names.add(parameter.name);
    assertSupportedSchema(parameter.schema, `${context} parameter ${parameter.name}`, false);
    if (!scalarTypes.has(parameter.schema.type ?? "")) fail(context, `parameter ${parameter.name} must be scalar`);
    if (parameter.in === "path" && parameter.required !== true) fail(context, `path parameter ${parameter.name} must be required`);
    properties[parameter.name] = { ...parameter.schema, description: parameter.description ?? parameter.schema.description };
    if (parameter.required) required.push(parameter.name);
    if (parameter.in === "path") pathParameters.push(parameter.name);
    else queryParameters.push(parameter.name);
  }

  const templateNames = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (new Set(templateNames).size !== templateNames.length) fail(context, "duplicate path template parameter");
  if (templateNames.some((name) => !pathParameters.includes(name)) || pathParameters.some((name) => !templateNames.includes(name))) fail(context, "path template and parameters do not match");

  if (method === "GET" && operation.requestBody) fail(context, "GET request bodies are unsupported");
  if (method === "DELETE" && operation.requestBody) fail(context, "DELETE request bodies are unsupported");
  if (method === "POST") {
    const content = operation.requestBody?.content;
    if (!content || Object.keys(content).length !== 1 || !content["application/json"]) fail(context, "POST requires one application/json request body");
    const bodySchema = content["application/json"].schema;
    assertSupportedSchema(bodySchema, `${context} body`, true);
    properties.body = bodySchema;
    if (operation.requestBody?.required !== false) required.push("body");
  }

  return {
    schema: { type: "object", properties, required, additionalProperties: false },
    pathParameters,
    queryParameters,
    hasBody: method === "POST",
  };
}

export function generateTools(document: OpenApiDocument): GeneratedTool[] {
  if (!document.openapi.startsWith("3.1.")) throw new Error(`unsupported OpenAPI version ${document.openapi}`);
  const generated: GeneratedTool[] = [];
  const names = new Set<string>();

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (Object.prototype.hasOwnProperty.call(pathItem, "parameters")) throw new Error(`${path}: path-item parameters are unsupported`);
    for (const [method, operation] of Object.entries(pathItem)) {
      const normalizedMethod = method.toLowerCase();
      if (!methods.has(normalizedMethod) || operation["x-webmcp-enabled"] !== true) continue;
      const methodName = normalizedMethod.toUpperCase();
      if (methodName !== "GET" && methodName !== "POST" && methodName !== "DELETE") throw new Error(`enabled operation ${methodName} ${path} uses an unsupported method`);
      const requiresApproval = methodName !== "GET";
      if (requiresApproval && operation["x-webmcp-approval-required"] !== true) throw new Error(`enabled operation ${methodName} ${path} must require approval`);
      if (!requiresApproval && operation["x-webmcp-approval-required"] === true) throw new Error(`read-only operation ${methodName} ${path} cannot require write approval`);
      if (!operation.operationId) throw new Error(`enabled operation ${methodName} ${path} needs operationId`);
      if (names.has(operation.operationId)) throw new Error(`duplicate operationId ${operation.operationId}`);
      names.add(operation.operationId);
      const compiled = operationSchema(operation, methodName, path);
      generated.push({
        name: operation.operationId,
        description: operation.description ?? operation.summary ?? `${methodName} ${path}`,
        inputSchema: compiled.schema,
        annotations: { readOnlyHint: !requiresApproval, destructiveHint: requiresApproval },
        operation: {
          method: methodName,
          path,
          pathParameters: compiled.pathParameters,
          queryParameters: compiled.queryParameters,
          hasBody: compiled.hasBody,
          requiresApproval,
        },
      });
    }
  }

  return generated;
}

function validate(schema: JsonSchema, value: unknown, context: string): void {
  if (schema.enum && !schema.enum.some((candidate) => Object.is(candidate, value))) fail(context, "not in enum");
  if (schema.type === "string") {
    if (typeof value !== "string") fail(context, "must be string");
    if (schema.minLength !== undefined && value.length < schema.minLength) fail(context, "shorter than minLength");
    if (schema.maxLength !== undefined && value.length > schema.maxLength) fail(context, "longer than maxLength");
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) fail(context, "does not match pattern");
    return;
  }
  if (schema.type === "boolean") {
    if (typeof value !== "boolean") fail(context, "must be boolean");
    return;
  }
  if (schema.type === "integer" || schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value) || (schema.type === "integer" && !Number.isInteger(value))) fail(context, `must be ${schema.type}`);
    if (schema.minimum !== undefined && value < schema.minimum) fail(context, "below minimum");
    if (schema.maximum !== undefined && value > schema.maximum) fail(context, "above maximum");
    return;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) fail(context, "must be array");
    if (schema.minItems !== undefined && value.length < schema.minItems) fail(context, "shorter than minItems");
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(context, "longer than maxItems");
    for (const [index, item] of value.entries()) validate(schema.items as JsonSchema, item, `${context}[${index}]`);
    return;
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(context, "must be object");
    const object = value as Record<string, unknown>;
    const properties = schema.properties ?? {};
    for (const name of schema.required ?? []) if (!(name in object)) fail(context, `missing required ${name}`);
    if (schema.additionalProperties === false) for (const name of Object.keys(object)) if (!(name in properties)) fail(context, `unexpected property ${name}`);
    for (const [name, child] of Object.entries(properties)) if (name in object) validate(child, object[name], `${context}.${name}`);
    return;
  }
  fail(context, `unsupported schema type ${schema.type}`);
}

export function buildRequest(tool: GeneratedTool, input: Record<string, unknown>, origin: string): Request {
  validate(tool.inputSchema, input, "input");
  let path = tool.operation.path;
  for (const name of tool.operation.pathParameters) path = path.replace(`{${name}}`, encodeURIComponent(String(input[name])));
  const url = new URL(path, origin);
  for (const name of tool.operation.queryParameters) if (input[name] !== undefined) url.searchParams.set(name, String(input[name]));
  return new Request(url, {
    method: tool.operation.method,
    headers: tool.operation.hasBody ? { "content-type": "application/json" } : undefined,
    body: tool.operation.hasBody ? JSON.stringify(input.body) : undefined,
  });
}

export async function executeTool(
  tool: GeneratedTool,
  input: Record<string, unknown>,
  origin: string,
  dispatch: (request: Request) => Response | Promise<Response> = fetch,
): Promise<Response> {
  if (tool.operation.requiresApproval) throw new Error("approval-managed writes cannot use direct dispatch");
  const request = buildRequest(tool, input, origin);
  return dispatch(request);
}
