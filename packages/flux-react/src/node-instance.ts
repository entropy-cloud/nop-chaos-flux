import type {
  CompiledNodeRuntimeState,
  CompiledSchemaNode,
  NodeInstance,
  NodeLocator,
  NodeState,
  ScopeRef
} from '@nop-chaos/flux-core';

function toNodeState(state: CompiledNodeRuntimeState, mounted: boolean): NodeState {
  return {
    metaState: state.meta,
    propsState: state.props,
    metaDependencies: state.metaDependencies,
    propsDependencies: state.propsDependencies,
    resolvedMeta: state.resolvedMeta,
    resolvedProps: state.resolvedProps,
    mounted
  };
}

export function createCompatibilityNodeInstance<S extends CompiledSchemaNode['schema']>(input: {
  node: CompiledSchemaNode<S>;
  locator: NodeLocator | undefined;
  scope: ScopeRef;
  state: CompiledNodeRuntimeState;
  cid: number | undefined;
  mounted: boolean;
}): NodeInstance<S> {
  const templateNodeId = input.node.templateNodeId ?? input.node.cid ?? -1;
  const templateGraphId = input.node.templateGraphId ?? 'legacy:compiled-node';

  return {
    cid: input.cid,
    locator: input.locator ?? {
      runtimeId: 'runtime',
      templateGraphId,
      templateNodeId
    },
    templateNode: {
      templateNodeId,
      id: input.node.id,
      type: input.node.type,
      schema: input.node.schema,
      templatePath: input.node.path,
      rendererType: input.node.type,
      propsProgram: input.node.props,
      metaProgram: input.node.meta as never,
      eventPlans: input.node.eventActions,
      regions: Object.fromEntries(
        Object.entries(input.node.regions).map(([key, region]) => [
          key,
          {
            key: region.key,
            path: region.path,
            node: region.node as never
          }
        ])
      ),
      scopePlan: { kind: 'inherit' },
      validationPlan: input.node.validation as never
    },
    scope: input.scope,
    state: toNodeState(input.state, input.mounted)
  };
}
