import type {
  CapabilityPublicationAttribution,
  HostCapabilityProjectionManifest,
  HostContractContext,
} from '@nop-chaos/flux-core';
import type { SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { appendJsonPointer } from './diagnostics.js';
import { validateFluxValueShape } from './flux-value-shape-validation.js';

export interface HostActionValidationContext {
  manifest: HostCapabilityProjectionManifest;
  capabilityPublication: CapabilityPublicationAttribution;
  currentRegion?: string;
}

export function createHostActionValidationContext(
  hostContractContext: HostContractContext,
): HostActionValidationContext {
  return {
    manifest: hostContractContext.manifest,
    capabilityPublication: hostContractContext.capabilityPublication ?? {
      mode: 'whole-owner',
      transitiveInheritance: true,
    },
  };
}

export function isInsideCapableRegion(
  ctx: HostActionValidationContext | undefined,
  regionKey?: string,
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

export function parseNamespacedAction(
  action: string,
): { namespace: string; method: string } | undefined {
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

export function validateHostAction(
  action: string,
  args: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  hostContext: HostActionValidationContext | undefined,
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
      source: 'host-contract',
    });
    return false;
  }

  if (method.args) {
    const argsPath = appendJsonPointer(path, 'args');
    const validationResult = validateFluxValueShape(
      args,
      method.args,
      argsPath,
      diagnostics,
      {
        code: 'invalid-host-capability-args',
        source: 'host-contract',
        messagePrefix: `${manifest.family} capability args are invalid.`,
      },
    );
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
      source: 'host-contract',
    });
  }

  return true;
}
