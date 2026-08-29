export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
};

export type OpenApiParameter = {
  name: string;
  in: "path" | "query";
  required?: boolean;
  description?: string;
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
};

export type OpenApiDocument = {
  openapi: string;
  paths: Record<string, Record<string, OpenApiOperation>>;
};

export type GeneratedTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: { readOnlyHint: boolean };
  operation: {
    method: string;
    path: string;
    pathParameters: string[];
    queryParameters: string[];
    hasBody: boolean;
  };
};

const methods = new Set(["get", "post", "put", "patch", "delete"]);

function operationSchema(operation: OpenApiOperation): { schema: JsonSchema; pathParameters: string[]; queryParameters: string[]; hasBody: boolean } {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  const pathParameters: string[] = [];
  const queryParameters: string[] = [];

  for (const parameter of operation.parameters ?? []) {
    if (parameter.in !== "path" && parameter.in !== "query") continue;
    properties[parameter.name] = { ...parameter.schema, description: parameter.description ?? parameter.schema?.description };
    if (parameter.required || parameter.in === "path") required.push(parameter.name);
    if (parameter.in === "path") pathParameters.push(parameter.name);
    if (parameter.in === "query") queryParameters.push(parameter.name);
  }

  const bodySchema = operation.requestBody?.content?.["application/json"]?.schema;
  if (bodySchema) {
    properties.body = bodySchema;
    if (operation.requestBody?.required) required.push("body");
  }

  return {
    schema: { type: "object", properties, required },
    pathParameters,
    queryParameters,
    hasBody: Boolean(bodySchema),
  };
}

export function generateTools(document: OpenApiDocument): GeneratedTool[] {
  const generated: GeneratedTool[] = [];
  const names = new Set<string>();

  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      const normalizedMethod = method.toLowerCase();
      if (!methods.has(normalizedMethod) || operation["x-webmcp-enabled"] !== true) continue;
      if (!operation.operationId) throw new Error(`enabled operation ${normalizedMethod.toUpperCase()} ${path} needs operationId`);
      if (names.has(operation.operationId)) throw new Error(`duplicate operationId ${operation.operationId}`);
      names.add(operation.operationId);
      const compiled = operationSchema(operation);
      generated.push({
        name: operation.operationId,
        description: operation.description ?? operation.summary ?? `${normalizedMethod.toUpperCase()} ${path}`,
        inputSchema: compiled.schema,
        annotations: { readOnlyHint: normalizedMethod === "get" },
        operation: {
          method: normalizedMethod.toUpperCase(),
          path,
          pathParameters: compiled.pathParameters,
          queryParameters: compiled.queryParameters,
          hasBody: compiled.hasBody,
        },
      });
    }
  }

  return generated;
}

export function buildRequest(tool: GeneratedTool, input: Record<string, unknown>, origin: string): Request {
  let path = tool.operation.path;
  for (const name of tool.operation.pathParameters) {
    if (input[name] === undefined) throw new Error(`missing path parameter ${name}`);
    path = path.replace(`{${name}}`, encodeURIComponent(String(input[name])));
  }
  const url = new URL(path, origin);
  for (const name of tool.operation.queryParameters) {
    if (input[name] !== undefined) url.searchParams.set(name, String(input[name]));
  }
  return new Request(url, {
    method: tool.operation.method,
    headers: tool.operation.hasBody ? { "content-type": "application/json" } : undefined,
    body: tool.operation.hasBody ? JSON.stringify(input.body ?? null) : undefined,
  });
}
