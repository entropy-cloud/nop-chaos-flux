import type {
  CapabilityMethodContract,
  FluxValueShape,
  HostCapabilityMethod,
  HostProjectionContract
} from '../schema-diagnostics';
import type { RendererDefinition, RendererEventContract, RendererPropContract, RendererRendererClass, RendererCapabilityContract } from './renderer-core';

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
}

function toCapabilityMethodContract(method: HostCapabilityMethod): CapabilityMethodContract {
  return {
    args: method.args,
    result: method.result,
    description: method.description,
    deprecated: method.deprecated
  };
}

/**
 * Tooling-facing adapter over RendererDefinition.
 *
 * This assembles one discovery object for authoring/autocomplete/inspection without changing
 * runtime ownership boundaries. `editableProps` describes authored schema fields, not the
 * runtime-resolved `RendererComponentProps['props']` object.
 */
export function resolveRendererAuthoringContract(definition: RendererDefinition): ResolvedAuthoringContract {
  const hostManifest = definition.hostContract?.resolveManifest(definition.hostContract.defaultVersion);

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
          Object.entries(hostManifest.capabilities.methods).map(([key, method]) => [key, toCapabilityMethodContract(method)])
        )
      : undefined
  };
}
