import type { BaseSchema, SchemaInput } from '../types';
import { isPlainObject } from './object';

export function isSchema(value: unknown): value is BaseSchema {
  return isPlainObject(value) && typeof value.type === 'string';
}

export function isSchemaArray(value: unknown): value is BaseSchema[] {
  return Array.isArray(value) && value.every((item) => isSchema(item));
}

export function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value) || isSchemaArray(value);
}

export function createNodeId(path: string, schema: BaseSchema): string {
  if (schema.id) {
    return schema.id;
  }

  return path.replace(/[^a-zA-Z0-9-_:.]/g, '_');
}
