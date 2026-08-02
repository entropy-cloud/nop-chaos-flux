import type {
  FluxValueShape,
} from '@nop-chaos/flux-core';
import type { SchemaFieldKind } from '@nop-chaos/flux-core';
import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';

function createSilentDiagnosticsContext(): SchemaCompilerDiagnosticsContext {
  const diagnostics: SchemaCompilerDiagnosticsContext['diagnostics'] = [];

  return {
    enabled: false,
    continueOnError: true,
    validation: {
      unknownBarePropertyPolicy: 'ignore',
      namespacedPropertyPolicy: 'ignore',
      extensionPassthroughPolicy: 'none',
      namespaceValidators: [],
      hostContractContext: undefined,
      strictMode: false,
    },
    diagnostics,
    emit(issue) {
      diagnostics.push({
        code: issue.code,
        path: issue.path,
        message: issue.message,
        severity: issue.severity ?? 'error',
        source: issue.source ?? 'core',
        ...(issue.sourceLocation ? { sourceLocation: issue.sourceLocation } : {}),
      });
    },
    hasReachedLimit() {
      return false;
    },
  };
}

function describeLiteral(value: string | number | boolean | null) {
  return JSON.stringify(value);
}

function isActionShapeLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && typeof (value as { action?: unknown }).action === 'string';
}

function summarizeSchemaDefinitionKind(kind: SchemaFieldKind): string {
  switch (kind) {
    case 'value':
    case 'prop':
      return 'value';
    case 'event':
    case 'action':
      return 'action';
    case 'schema':
    case 'region':
      return 'schema';
    case 'schema-array':
      return 'schema[]';
    case 'literal':
      return 'literal';
    case 'value-or-region':
      return 'value-or-region';
    case 'meta':
      return 'meta';
    case 'reaction':
      return 'reaction';
    case 'ignored':
      return 'ignored';
    default:
      return kind;
  }
}

function formatUnionBranchFailureMessages(messages: string[]) {
  return messages.map((message, index) => `Option ${index + 1}: ${message}`).join(' ');
}

export function isDynamicallyAuthoredSchemaValue(value: unknown): boolean {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.startsWith('${') && trimmed.endsWith('}');
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return (value as { type?: unknown }).type === 'source';
}

export function summarizeExpectedFluxValueShape(shape: FluxValueShape): string {
  switch (shape.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'unknown':
      return shape.kind;
    case 'literal':
      return describeLiteral(shape.value);
    case 'record':
      return `record<${summarizeExpectedFluxValueShape(shape.value)}>`;
    case 'array':
      return `array<${summarizeExpectedFluxValueShape(shape.item)}>`;
    case 'object': {
      const fields = Object.entries(shape.fields).map(
        ([key, fieldShape]) => `${key}: ${summarizeExpectedFluxValueShape(fieldShape)}`,
      );
      return fields.length > 0 ? `object{${fields.join(', ')}}` : 'object';
    }
    case 'union':
      return shape.anyOf.map((entry) => summarizeExpectedFluxValueShape(entry)).join(' | ');
    case 'schema-definition': {
      const ruleSummary = Object.entries(shape.fieldRules).map(
        ([key, spec]) => `${key}: ${summarizeSchemaDefinitionKind(typeof spec === 'string' ? spec : spec.kind)}`,
      );
      const parts = [`schema-definition{${ruleSummary.join(', ')}}`];
      if (shape.actionValue) {
        parts.push('actionValue');
      }
      return parts.join(' ');
    }
    default:
      return 'unknown';
  }
}

export function summarizeActualSchemaValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return typeof value;
}

export function validateFluxValueShape(
  value: unknown,
  shape: FluxValueShape,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  issue: {
    code: 'invalid-property-value' | 'invalid-host-capability-args' | 'invalid-action-shape';
    source: 'core' | 'host-contract';
    messagePrefix?: string;
  },
): boolean {
  switch (shape.kind) {
    case 'string':
      if (typeof value !== 'string') {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected string.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }
      return true;

    case 'number':
      if (typeof value !== 'number') {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected number.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }
      return true;

    case 'boolean':
      if (typeof value !== 'boolean') {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected boolean.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }
      return true;

    case 'null':
      if (value !== null) {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected null.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }
      return true;

    case 'literal':
      if (value !== shape.value) {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected literal value.'} Expected ${describeLiteral(shape.value)} but received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }
      return true;

    case 'record': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected record.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }

      let valid = true;
      const record = value as Record<string, unknown>;
      for (const [key, entry] of Object.entries(record)) {
        if (!validateFluxValueShape(entry, shape.value, appendJsonPointer(path, key), diagnostics, issue)) {
          valid = false;
        }
      }
      return valid;
    }

    case 'array': {
      if (!Array.isArray(value)) {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected array.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }

      let valid = true;
      value.forEach((item, index) => {
        if (
          !validateFluxValueShape(item, shape.item, appendJsonPointer(path, index), diagnostics, issue)
        ) {
          valid = false;
        }
      });
      return valid;
    }

    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected object.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }

      let valid = true;
      const record = value as Record<string, unknown>;
      if (shape.unknownKeys === 'reject') {
        const allowedKeys = new Set(Object.keys(shape.fields));
        for (const key of Object.keys(record)) {
          if (!allowedKeys.has(key)) {
            diagnostics.emit({
              code: issue.code,
              path: appendJsonPointer(path, key),
              message: `${issue.messagePrefix ?? 'Unknown field.'} Field ${JSON.stringify(key)} is not allowed by this contract.`,
              source: issue.source,
            });
            valid = false;
          }
        }
      }

      for (const [fieldName, fieldShape] of Object.entries(shape.fields)) {
        const fieldValue = record[fieldName];
        const fieldPath = appendJsonPointer(path, fieldName);
        if (fieldValue === undefined) {
          if (!shape.optional?.includes(fieldName)) {
            diagnostics.emit({
              code: issue.code,
              path: fieldPath,
              message: `${issue.messagePrefix ?? 'Missing required field.'} Required field ${JSON.stringify(fieldName)} is missing.`,
              source: issue.source,
            });
            valid = false;
          }
          continue;
        }

        if (!validateFluxValueShape(fieldValue, fieldShape, fieldPath, diagnostics, issue)) {
          valid = false;
        }
      }

      return valid;
    }

    case 'union': {
      const branchMessages: string[] = [];
      for (const variant of shape.anyOf) {
        const silentDiagnostics = createSilentDiagnosticsContext();
        if (validateFluxValueShape(value, variant, path, silentDiagnostics, issue)) {
          return true;
        }

        const firstDiagnostic = silentDiagnostics.diagnostics[0];
        if (firstDiagnostic?.message) {
          branchMessages.push(firstDiagnostic.message);
        }
      }

      diagnostics.emit({
        code: issue.code,
        path,
        message: `${issue.messagePrefix ?? 'Value does not match any allowed option.'} Expected ${summarizeExpectedFluxValueShape(shape)} but received ${summarizeActualSchemaValue(value)}.${branchMessages.length > 0 ? ` ${formatUnionBranchFailureMessages(branchMessages)}` : ''}`,
        source: issue.source,
      });
      return false;
    }

    case 'unknown':
      return true;

    case 'schema-definition': {
      if (shape.actionValue) {
        if (!isActionShapeLike(value)) {
          diagnostics.emit({
            code: issue.code,
            path,
            message: `${issue.messagePrefix ?? 'Expected action value.'} Received ${summarizeActualSchemaValue(value)}.`,
            source: issue.source,
          });
          return false;
        }
        return true;
      }

      const containers = Array.isArray(value)
        ? value.map((item, index) => ({ item, path: appendJsonPointer(path, index) }))
        : value && typeof value === 'object'
          ? [{ item: value as Record<string, unknown>, path }]
          : undefined;

      if (!containers) {
        diagnostics.emit({
          code: issue.code,
          path,
          message: `${issue.messagePrefix ?? 'Expected nested schema structure.'} Received ${summarizeActualSchemaValue(value)}.`,
          source: issue.source,
        });
        return false;
      }

      let valid = true;
      for (const { item, path: itemPath } of containers) {
        for (const [fieldKey, spec] of Object.entries(shape.fieldRules)) {
          const fieldPath = appendJsonPointer(itemPath, fieldKey);
          const fieldValue = item[fieldKey];
          const kind = typeof spec === 'string' ? spec : spec.kind;

          if (fieldValue === undefined) {
            if (typeof spec === 'object' && spec.required) {
              diagnostics.emit({
                code: issue.code,
                path: fieldPath,
                message: `${issue.messagePrefix ?? 'Missing required field.'} Required field ${JSON.stringify(fieldKey)} is missing.`,
                source: issue.source,
              });
              valid = false;
            }
            continue;
          }

          const specObject = typeof spec === 'object' ? spec : {};
          if (
            !validateSchemaDefinitionField(fieldValue, kind, specObject, fieldPath, diagnostics, issue)
          ) {
            valid = false;
            continue;
          }

          if (typeof spec === 'object' && (spec.valueType !== undefined || spec.nonEmpty)) {
            if (!validateSchemaDefinitionConstraints(fieldValue, spec, fieldPath, diagnostics, issue)) {
              valid = false;
            }
          }
        }
      }
      return valid;
    }

    default:
      return true;
  }
}

function validateSchemaDefinitionField(
  value: unknown,
  kind: SchemaFieldKind,
  spec: { sourceKey?: string; kind?: SchemaFieldKind },
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  issue: {
    code: 'invalid-property-value' | 'invalid-host-capability-args' | 'invalid-action-shape';
    source: 'core' | 'host-contract';
    messagePrefix?: string;
  },
): boolean {
  switch (kind) {
    case 'value':
    case 'prop':
    case 'literal':
    case 'value-or-region':
    case 'meta':
    case 'ignored':
      return true;
    case 'event':
    case 'action':
    case 'reaction': {
      if (isActionShapeLike(value)) {
        return true;
      }
      if (Array.isArray(value) && value.every(isActionShapeLike)) {
        return true;
      }
      diagnostics.emit({
        code: issue.code,
        path,
        message: `${issue.messagePrefix ?? 'Expected action value.'} Received ${summarizeActualSchemaValue(value)}.`,
        source: issue.source,
      });
      return false;
    }
    case 'schema':
    case 'region':
      if (value && typeof value === 'object') {
        return true;
      }
      // Fields declaring a nested `sourceKey` are dual config/value forms
      // (e.g. `quickEdit: true`, `popOver: { trigger }`, `searchable: true`) —
      // the schema leaf is optional and scalars are valid.
      if (spec.sourceKey) {
        return true;
      }
      diagnostics.emit({
        code: issue.code,
        path,
        message: `${issue.messagePrefix ?? 'Expected schema subtree.'} Received ${summarizeActualSchemaValue(value)}.`,
        source: issue.source,
      });
      return false;
    case 'schema-array':
      if (Array.isArray(value)) {
        return true;
      }
      diagnostics.emit({
        code: issue.code,
        path,
        message: `${issue.messagePrefix ?? 'Expected schema array.'} Received ${summarizeActualSchemaValue(value)}.`,
        source: issue.source,
      });
      return false;
    default:
      return true;
  }
}

function validateSchemaDefinitionConstraints(
  value: unknown,
  spec: { valueType?: 'boolean' | 'string' | 'number' | 'object' | 'array'; nonEmpty?: boolean },
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  issue: {
    code: 'invalid-property-value' | 'invalid-host-capability-args' | 'invalid-action-shape';
    source: 'core' | 'host-contract';
    messagePrefix?: string;
  },
): boolean {
  let valid = true;

  if (spec.valueType !== undefined && !isDynamicallyAuthoredSchemaValue(value)) {
    const typeOk = (() => {
      switch (spec.valueType) {
        case 'boolean':
          return typeof value === 'boolean';
        case 'string':
          return typeof value === 'string';
        case 'number':
          return typeof value === 'number';
        case 'object':
          return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
        case 'array':
          return Array.isArray(value);
        default:
          return true;
      }
    })();

    if (!typeOk) {
      diagnostics.emit({
        code: issue.code,
        path,
        message: `${issue.messagePrefix ?? 'Invalid field value.'} Expected ${spec.valueType}, received ${summarizeActualSchemaValue(value)}.`,
        source: issue.source,
      });
      valid = false;
    }
  }

  if (spec.nonEmpty && !isDynamicallyAuthoredSchemaValue(value)) {
    if (typeof value !== 'string' || value.length === 0) {
      diagnostics.emit({
        code: issue.code,
        path,
        message: `${issue.messagePrefix ?? 'Invalid field value.'} Expected non-empty string, received ${summarizeActualSchemaValue(value)}.`,
        source: issue.source,
      });
      valid = false;
    }
  }

  return valid;
}
