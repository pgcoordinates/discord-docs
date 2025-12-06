export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
    parameters?: Record<string, Parameter>;
    requestBodies?: Record<string, RequestBody>;
    responses?: Record<string, Response>;
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  security?: Array<Record<string, string[]>>;
}

export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  options?: Operation;
  head?: Operation;
  parameters?: Parameter[];
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody | { $ref: string };
  responses?: Record<string, Response | { $ref: string }>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: Schema;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaType>;
}

export interface Response {
  description?: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, { schema?: Schema; description?: string }>;
}

export interface MediaType {
  schema?: Schema | { $ref: string };
  example?: unknown;
  examples?: Record<string, { value: unknown }>;
}

export interface Schema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  properties?: Record<string, Schema | { $ref: string }>;
  items?: Schema | { $ref: string };
  required?: string[];
  enum?: (string | number | boolean)[];
  allOf?: Array<Schema | { $ref: string }>;
  oneOf?: Array<Schema | { $ref: string }>;
  anyOf?: Array<Schema | { $ref: string }>;
  $ref?: string;
  nullable?: boolean;
  default?: unknown;
  example?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | Schema | { $ref: string };
}

export interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
}

export interface ParsedEndpoint {
  path: string;
  method: string;
  operation: Operation;
  category: string;
}

export interface Category {
  name: string;
  endpoints: ParsedEndpoint[];
}
