import { isPlainObject } from './object';
export function isSchema(value) {
    return isPlainObject(value) && typeof value.type === 'string';
}
export function isSchemaArray(value) {
    return Array.isArray(value) && value.every((item) => isSchema(item));
}
export function isSchemaInput(value) {
    return isSchema(value) || isSchemaArray(value);
}
export function createNodeId(path, schema) {
    if (schema.id) {
        return schema.id;
    }
    return path.replace(/[^a-zA-Z0-9-_:.]/g, '_');
}
//# sourceMappingURL=schema.js.map