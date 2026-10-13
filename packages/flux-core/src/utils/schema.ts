import type { BaseSchema, SchemaInput } from '../types.js';
import type { TemplateNode } from '../types/node-identity.js';
import { isPlainObject } from './object.js';

export function isSchema(value: unknown): value is BaseSchema {
  return isPlainObject(value) && typeof value.type === 'string';
}

export function isSchemaArray(value: unknown): value is BaseSchema[] {
  return Array.isArray(value) && value.every((item) => isSchema(item));
}

export function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value) || isSchemaArray(value);
}

export function isTemplateNode(input: unknown): input is TemplateNode {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<TemplateNode>;

  return (
    typeof candidate.templateNodeId === 'number' &&
    typeof candidate.templatePath === 'string' &&
    typeof candidate.type === 'string' &&
    !!candidate.component &&
    !!candidate.schema &&
    !!candidate.regions
  );
}

export function createNodeId(path: string, schema: BaseSchema): string {
  if (schema.id) {
    return schema.id;
  }

  return path.replace(/[^a-zA-Z0-9_.\-:]/g, '_');
}
