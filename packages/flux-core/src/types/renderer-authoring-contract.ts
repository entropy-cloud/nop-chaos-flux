import type {
  CapabilityMethodContract,
  FluxValueShape,
  HostCapabilityMethod,
  HostProjectionContract,
} from '../schema-diagnostics/index.js';
import type {
  RendererDefinition,
} from './renderer-core.js';
import type {
  RendererEventContract,
  RendererPropContract,
  RendererRendererClass,
  RendererCapabilityContract,
} from './renderer-definition-types.js';

export interface ResolvedAuthoringContract {
  rendererType: string;
  rendererClass: RendererRendererClass;
  rendererTraits: readonly string[];
  editableProps: Readonly<Record<string, RendererPropContract>>;
  events: Readonly<Record<string, RendererEventContract>>;
  componentCapabilityContracts: readonly RendererCapabilityContract[];
  scopeExports: Readonly<Record<string, FluxValueShape>>;
  hostProjection?: HostProjectionContract;
  hostActions?: Readonly<Record<string, CapabilityMethodContract>>;
  hostManifest?: import('../schema-diagnostics/index.js').HostCapabilityProjectionManifest;
}

function toCapabilityMethodContract(method: HostCapabilityMethod): CapabilityMethodContract {
  return {
    args: method.args,
    result: method.result,
    description: method.description,
    deprecated: method.deprecated,
  };
}

/**
 * Resolves a host contract manifest from a renderer definition.
 *
 * Standard consumption path for tools (editor, debugger, docs export):
 * 1. Given a renderer definition with `hostContract`
 * 2. Read `family`, `defaultVersion`, and `resolveManifest(...)` from `hostContract`
 * 3. Use the provided `versionSelector` (or fall back to `defaultVersion`)
 * 4. Resolve one concrete `HostCapabilityProjectionManifest`
 *
 * For standalone fragment scenarios where no renderer definition is available,
 * callers should use `HostContractContext` directly instead of this function.
 */
export function resolveHostContractManifest(
  definition: RendererDefinition,
  versionSelector?: string,
): import('../schema-diagnostics/index.js').HostCapabilityProjectionManifest | undefined {
  const hostContract = definition.hostContract;
  if (!hostContract) {
    return undefined;
  }

  const selector = versionSelector ?? hostContract.defaultVersion;
  return hostContract.resolveManifest(selector);
}

/**
 * Tooling-facing adapter over RendererDefinition.
 *
 * This assembles one discovery object for authoring/autocomplete/inspection without changing
 * runtime ownership boundaries. `editableProps` describes authored schema fields, not the
 * runtime-resolved `RendererComponentProps['props']` object.
 */
export function resolveRendererAuthoringContract(
  definition: RendererDefinition,
  versionSelector?: string,
): ResolvedAuthoringContract {
  const hostManifest = resolveHostContractManifest(definition, versionSelector);

  return {
    rendererType: definition.type,
    rendererClass: definition.rendererClass ?? 'instance-renderer',
    rendererTraits: definition.rendererTraits ?? [],
    editableProps: definition.propContracts ?? {},
    events: definition.eventContracts ?? {},
    componentCapabilityContracts: definition.componentCapabilityContracts ?? [],
    scopeExports: definition.scopeExportContracts ?? {},
    hostProjection: hostManifest?.projection,
    hostActions: hostManifest
      ? Object.fromEntries(
          Object.entries(hostManifest.capabilities.methods).map(([key, method]) => [
            key,
            toCapabilityMethodContract(method),
          ]),
        )
      : undefined,
    hostManifest,
  };
}
