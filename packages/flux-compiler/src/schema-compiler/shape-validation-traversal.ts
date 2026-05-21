import type { BaseSchema, RendererDefinition } from '@nop-chaos/flux-core';
import { schemaPathToJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import {
  createHostActionValidationContext,
  type HostActionValidationContext,
} from './host-action-validation.js';

export interface ValidationTraversalState {
  hostContext?: HostActionValidationContext;
  symbolTable?: import('@nop-chaos/flux-core').CompileSymbolTable;
  visibleImports?: ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec | undefined>;
  startsHostBoundary: boolean;
}

export function createDefaultValidationTraversalState(
  diagnostics: SchemaCompilerDiagnosticsContext,
): ValidationTraversalState {
  return {
    hostContext: diagnostics.validation.hostContractContext
      ? createHostActionValidationContext(diagnostics.validation.hostContractContext)
      : undefined,
    symbolTable: undefined,
    visibleImports: undefined,
    startsHostBoundary: false,
  };
}

export function resolveNodeHostContext(
  schema: BaseSchema,
  renderer: RendererDefinition,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  inheritedHostContext: HostActionValidationContext | undefined,
): {
  hostContext?: HostActionValidationContext;
  startsHostBoundary: boolean;
} {
  const hostContract = renderer.hostContract;

  if (!hostContract) {
    return {
      hostContext: inheritedHostContext,
      startsHostBoundary: false,
    };
  }

  const versionSelector =
    typeof schema['xui:version'] === 'string' && schema['xui:version'].length > 0
      ? schema['xui:version']
      : hostContract.defaultVersion;
  const manifest = hostContract.resolveManifest(versionSelector);

  if (!manifest) {
    diagnostics.emit({
      code: 'unsupported-host-contract-version',
      path: schemaPathToJsonPointer(path),
      message: `Renderer type "${renderer.type}" does not support host contract version selector "${versionSelector}" for family "${hostContract.family}".`,
      source: 'host-contract',
    });

    return {
      hostContext: undefined,
      startsHostBoundary: true,
    };
  }

  if (manifest.family !== hostContract.family) {
    diagnostics.emit({
      code: 'unknown-host-contract-family',
      path: schemaPathToJsonPointer(path),
      message: `Renderer type "${renderer.type}" resolved host contract family "${manifest.family}" but declared "${hostContract.family}".`,
      source: 'host-contract',
    });
  }

  if (
    inheritedHostContext &&
    inheritedHostContext.manifest.family === manifest.family &&
    inheritedHostContext.manifest.version !== manifest.version
  ) {
    diagnostics.emit({
      code: 'host-contract-version-mismatch',
      path: schemaPathToJsonPointer(path),
      message: `Renderer type "${renderer.type}" resolved host contract version "${manifest.version}" but the enclosing validation context uses version "${inheritedHostContext.manifest.version}" for family "${manifest.family}".`,
      severity: 'warning',
      source: 'host-contract',
    });
  }

  return {
    hostContext: createHostActionValidationContext({
      family: manifest.family,
      version: manifest.version,
      manifest,
      capabilityPublication: hostContract.capabilityPublication,
    }),
    startsHostBoundary: true,
  };
}

export function createChildTraversalState(
  state: ValidationTraversalState,
  regionKey: string,
  startsHostBoundary: boolean,
): ValidationTraversalState {
  if (!state.hostContext || !startsHostBoundary) {
    return state;
  }

  return {
    ...state,
    hostContext: {
      ...state.hostContext,
      currentRegion: regionKey,
    },
  };
}

export function createRegionTraversalState(
  state: ValidationTraversalState,
  regionKey: string,
  params: readonly string[] | undefined,
  startsHostBoundary: boolean,
): ValidationTraversalState {
  const nextState = createChildTraversalState(state, regionKey, startsHostBoundary);

  if (!params?.length) {
    return nextState;
  }

  return {
    ...nextState,
    hostContext: nextState.hostContext,
  };
}
