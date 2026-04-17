import type {
  CapabilityPublicationAttribution,
  HostCapabilityProjectionManifest,
  HostContractContext,
  FluxValueShape
} from '@nop-chaos/flux-core';
import type { SchemaCompilerDiagnosticsContext } from './diagnostics';
import { appendJsonPointer, createSchemaCompilerDiagnosticsContext } from './diagnostics';

/**
 * Creates a silent diagnostics context that discards all diagnostics.
 * Used for trial validation in union type matching.
 */
function createSilentDiagnosticsContext(): SchemaCompilerDiagnosticsContext {
  return createSchemaCompilerDiagnosticsContext(
    { diagnostics: { enabled: false } },
    'validate'
  );
}

/**
 * Host action validation context.
 * Tracks the active host contract during compilation for action validation.
 */
export interface HostActionValidationContext {
  manifest: HostCapabilityProjectionManifest;
  capabilityPublication: CapabilityPublicationAttribution;
  currentRegion?: string;
}

/**
 * Creates a host action validation context from host contract context.
 */
export function createHostActionValidationContext(
  hostContractContext: HostContractContext
): HostActionValidationContext {
  return {
    manifest: hostContractContext.manifest,
    capabilityPublication: hostContractContext.capabilityPublication ?? {
      mode: 'whole-owner',
      transitiveInheritance: true
    }
  };
}

/**
 * Checks if the current compilation context is inside a capable region.
 * Returns true if host-family action validation should be enabled.
 */
export function isInsideCapableRegion(
  ctx: HostActionValidationContext | undefined,
  regionKey?: string
): boolean {
  if (!ctx) {
    return false;
  }

  const { capabilityPublication } = ctx;

  if (capabilityPublication.mode === 'whole-owner') {
    return true;
  }

  if (!capabilityPublication.capableRegions || capabilityPublication.capableRegions.length === 0) {
    return false;
  }

  if (regionKey && capabilityPublication.capableRegions.includes(regionKey)) {
    return true;
  }

  if (ctx.currentRegion && capabilityPublication.capableRegions.includes(ctx.currentRegion)) {
    return capabilityPublication.transitiveInheritance !== false;
  }

  return false;
}

/**
 * Parses a namespaced action string.
 * Returns undefined if the action is not namespaced.
 */
export function parseNamespacedAction(action: string): { namespace: string; method: string } | undefined {
  const colonIndex = action.indexOf(':');
  if (colonIndex <= 0 || colonIndex === action.length - 1) {
    return undefined;
  }

  const namespace = action.substring(0, colonIndex);
  const method = action.substring(colonIndex + 1);

  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(namespace)) {
    return undefined;
  }

  return { namespace, method };
}

/**
 * Validates a host-family action against the manifest.
 *
 * @returns true if the action was validated (or skipped due to context), false if validation failed
 */
export function validateHostAction(
  action: string,
  args: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  hostContext: HostActionValidationContext | undefined
): boolean {
  if (!hostContext) {
    return true;
  }

   if (!isInsideCapableRegion(hostContext)) {
    return true;
   }

  const parsed = parseNamespacedAction(action);
  if (!parsed) {
    return true;
  }

  const { manifest } = hostContext;

  if (parsed.namespace !== manifest.capabilities.namespace) {
    return true;
  }

  const method = manifest.capabilities.methods[parsed.method];
  if (!method) {
    diagnostics.emit({
      code: 'unknown-host-capability-method',
      path: appendJsonPointer(path, 'action'),
      message: `Unknown ${manifest.family} capability method "${parsed.method}". Available methods: ${Object.keys(manifest.capabilities.methods).join(', ') || 'none'}.`,
      source: 'host-contract'
    });
    return false;
  }

  if (method.args && args !== undefined) {
    const argsPath = appendJsonPointer(path, 'args');
    const validationResult = validateArgsShape(args, method.args, argsPath, diagnostics, manifest.family);
    if (!validationResult) {
      return false;
    }
  }

  if (method.deprecated) {
    diagnostics.emit({
      code: 'unknown-host-capability-method',
      path: appendJsonPointer(path, 'action'),
      message: `${manifest.family} capability method "${parsed.method}" is deprecated.`,
      severity: 'warning',
      source: 'host-contract'
    });
  }

  return true;
}

/**
 * Validates args against a shape contract.
 * This is a basic structural validation, not a full type system.
 */
function validateArgsShape(
  value: unknown,
  shape: FluxValueShape,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  family: string
): boolean {
  switch (shape.kind) {
    case 'string':
      if (typeof value !== 'string') {
        diagnostics.emit({
          code: 'invalid-host-capability-args',
          path,
          message: `${family} capability args: expected string.`,
          source: 'host-contract'
        });
        return false;
      }
      return true;

    case 'number':
      if (typeof value !== 'number') {
        diagnostics.emit({
          code: 'invalid-host-capability-args',
          path,
          message: `${family} capability args: expected number.`,
          source: 'host-contract'
        });
        return false;
      }
      return true;

    case 'boolean':
      if (typeof value !== 'boolean') {
        diagnostics.emit({
          code: 'invalid-host-capability-args',
          path,
          message: `${family} capability args: expected boolean.`,
          source: 'host-contract'
        });
        return false;
      }
      return true;

    case 'null':
      if (value !== null) {
        diagnostics.emit({
          code: 'invalid-host-capability-args',
          path,
          message: `${family} capability args: expected null.`,
          source: 'host-contract'
        });
        return false;
      }
      return true;

    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        diagnostics.emit({
          code: 'invalid-host-capability-args',
          path,
          message: `${family} capability args: expected object.`,
          source: 'host-contract'
        });
        return false;
      }

      const record = value as Record<string, unknown>;
      let valid = true;

      for (const [fieldName, fieldShape] of Object.entries(shape.fields)) {
        const fieldValue = record[fieldName];
        const fieldPath = appendJsonPointer(path, fieldName);

        if (fieldValue === undefined) {
          if (!shape.optional?.includes(fieldName)) {
            diagnostics.emit({
              code: 'invalid-host-capability-args',
              path: fieldPath,
              message: `${family} capability args: missing required field "${fieldName}".`,
              source: 'host-contract'
            });
            valid = false;
          }
        } else {
          if (!validateArgsShape(fieldValue, fieldShape, fieldPath, diagnostics, family)) {
            valid = false;
          }
        }
      }

      return valid;
    }

    case 'array': {
      if (!Array.isArray(value)) {
        diagnostics.emit({
          code: 'invalid-host-capability-args',
          path,
          message: `${family} capability args: expected array.`,
          source: 'host-contract'
        });
        return false;
      }

      let valid = true;
      value.forEach((item, index) => {
        if (!validateArgsShape(item, shape.item, appendJsonPointer(path, index), diagnostics, family)) {
          valid = false;
        }
      });
      return valid;
    }

    case 'union': {
      for (const variant of shape.anyOf) {
        const silentDiagnostics = createSilentDiagnosticsContext();
        if (validateArgsShape(value, variant, path, silentDiagnostics, family)) {
          return true;
        }
      }

      diagnostics.emit({
        code: 'invalid-host-capability-args',
        path,
        message: `${family} capability args: value does not match any expected type in union.`,
        source: 'host-contract'
      });
      return false;
    }

    case 'literal':
      if (value !== shape.value) {
        diagnostics.emit({
          code: 'invalid-host-capability-args',
          path,
          message: `${family} capability args: expected literal ${JSON.stringify(shape.value)}.`,
          source: 'host-contract'
        });
        return false;
      }
      return true;

    case 'unknown':
      return true;

    default:
      return true;
  }
}
