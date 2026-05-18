import type {
  NodeRuntimeState,
  InstanceFrame,
  NodeInstance,
  NodeState,
  ScopeRef,
  TemplateNode,
} from '@nop-chaos/flux-core';

function toNodeState(state: NodeRuntimeState, mounted: boolean): NodeState {
  return {
    metaState: state.meta,
    propsState: state.props,
    metaDependencies: state.metaDependencies,
    propsDependencies: state.propsDependencies,
    resolvedMeta: state.resolvedMeta,
    resolvedProps: state.resolvedProps,
    mounted,
  };
}

export function createTemplateNodeRuntimeState(
  templateNode: TemplateNode,
  _instanceKey?: string,
): NodeRuntimeState {
  const metaEntries: Record<string, any> = {};
  const meta = templateNode.metaProgram;

  for (const key of Object.keys(meta) as Array<keyof typeof meta>) {
    const value = meta[key];
    if (value && typeof value === 'object' && (value as { kind?: string }).kind === 'dynamic') {
      metaEntries[key] = (value as { createState(): unknown }).createState();
    }
  }

  const propsProgram = templateNode.propsProgram;

  return {
    meta: metaEntries,
    props: propsProgram.kind === 'dynamic' ? propsProgram.createState() : undefined,
  };
}

export function createNodeInstance<S extends import('@nop-chaos/flux-core').BaseSchema>(input: {
  templateNode: TemplateNode<S>;
  scope: ScopeRef;
  state: NodeRuntimeState;
  cid: number | undefined;
  instancePath?: readonly InstanceFrame[];
  mounted: boolean;
}): NodeInstance<S> {
  return {
    cid: input.cid,
    instancePath: input.instancePath,
    templateNode: input.templateNode,
    scope: input.scope,
    state: toNodeState(input.state, input.mounted),
  };
}
