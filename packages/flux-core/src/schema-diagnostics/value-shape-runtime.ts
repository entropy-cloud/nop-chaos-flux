import type {
  FluxValueShape,
  FluxSchemaDefinitionShape,
  HostCapabilityMethod,
  SchemaDefinitionFieldKind,
} from './manifest.js';

export type FluxValueShapePayloadValidationResult =
  | { ok: true; args: unknown }
  | { ok: false; error: Error };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isActionLike(value: unknown): boolean {
  return isRecord(value) && typeof value.action === 'string';
}

function matchesSchemaDefinitionField(
  value: unknown,
  kind: SchemaDefinitionFieldKind,
): boolean {
  switch (kind) {
    case 'value':
    case 'prop':
    case 'literal':
      // Expression-evaluated values cannot be statically rejected.
      return true;
    case 'event':
    case 'action':
      if (isActionLike(value)) {
        return true;
      }
      return Array.isArray(value) && value.every(isActionLike);
    case 'schema':
    case 'region':
      // SchemaInput = BaseSchema | BaseSchema[]
      return isRecord(value) || Array.isArray(value);
    case 'schema-array':
      return Array.isArray(value);
    default:
      return false;
  }
}

function matchesSchemaDefinitionShape(value: unknown, shape: FluxSchemaDefinitionShape): boolean {
  if (shape.actionValue) {
    return isActionLike(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => matchesSchemaDefinitionShape(item, shape));
  }

  if (!isRecord(value)) {
    return false;
  }

  for (const [key, spec] of Object.entries(shape.fieldRules)) {
    if (!(key in value)) {
      if (typeof spec === 'object' && spec.required) {
        return false;
      }
      continue;
    }

    const kind = typeof spec === 'string' ? spec : spec.kind;
    if (!matchesSchemaDefinitionField(value[key], kind)) {
      return false;
    }
  }

  return true;
}

export function matchesFluxValueShape(value: unknown, shape: FluxValueShape): boolean {
  switch (shape.kind) {
    case 'unknown':
      return true;
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    case 'literal':
      return value === shape.value;
    case 'record':
      return isRecord(value) && Object.values(value).every((entry) => matchesFluxValueShape(entry, shape.value));
    case 'array':
      return Array.isArray(value) && value.every((item) => matchesFluxValueShape(item, shape.item));
    case 'union':
      return shape.anyOf.some((variant) => matchesFluxValueShape(value, variant));
    case 'object': {
      if (!isRecord(value)) {
        return false;
      }

      if (shape.unknownKeys === 'reject') {
        const allowedKeys = new Set(Object.keys(shape.fields));
        for (const key of Object.keys(value)) {
          if (!allowedKeys.has(key)) {
            return false;
          }
        }
      }

      const optional = new Set(shape.optional ?? []);
      for (const [key, fieldShape] of Object.entries(shape.fields)) {
        if (!(key in value)) {
          if (!optional.has(key)) {
            return false;
          }
          continue;
        }
        if (!matchesFluxValueShape(value[key], fieldShape)) {
          return false;
        }
      }
      return true;
    }
    case 'schema-definition':
      return matchesSchemaDefinitionShape(value, shape);
    default:
      return false;
  }
}

export function validateHostMethodPayload(
  namespace: string,
  method: string,
  payload: unknown,
  contract: HostCapabilityMethod | undefined,
): FluxValueShapePayloadValidationResult {
  if (!contract) {
    return {
      ok: false,
      error: new Error(`${namespace}:${method} is not a published host method.`),
    };
  }

  if (!contract.args) {
    if (payload === undefined) {
      return { ok: true, args: {} };
    }

    return {
      ok: false,
      error: new Error(`${namespace}:${method} does not accept a payload.`),
    };
  }

  const args = payload === undefined ? {} : payload;
  if (!matchesFluxValueShape(args, contract.args)) {
    return {
      ok: false,
      error: new Error(`${namespace}:${method} payload does not match the published host args contract.`),
    };
  }

  return { ok: true, args };
}
