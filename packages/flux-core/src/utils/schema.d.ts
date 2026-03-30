import type { BaseSchema, SchemaInput } from '../types';
export declare function isSchema(value: unknown): value is BaseSchema;
export declare function isSchemaArray(value: unknown): value is BaseSchema[];
export declare function isSchemaInput(value: unknown): value is SchemaInput;
export declare function createNodeId(path: string, schema: BaseSchema): string;
