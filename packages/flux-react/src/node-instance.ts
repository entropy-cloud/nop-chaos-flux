import type {
  CompiledNodeRuntimeState,
  InstanceFrame,
  NodeInstance,
  NodeState,
  ScopeRef,
  TemplateNode
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

export function createTemplateNodeRuntimeState(templateNode: TemplateNode): CompiledNodeRuntimeState {
  const metaEntries: Record<string, any> = {};
  const meta = templateNode.metaProgram;

  for (const key of Object.keys(meta) as Array<keyof typeof meta>) {
    const value = meta[key];
    if (value && typeof value === 'object' && (value as { kind?: string }).kind === 'dynamic') {
      metaEntries[key] = (value as { createState(): unknown }).createState();
    }
  }

  const propsProgram = templateNode.propsProgram;

  const linkage = templateNode.linkageProgram;
  let linkageState: CompiledNodeRuntimeState['linkage'] | undefined;

  if (linkage) {
    linkageState = {};

    if (linkage.when.kind === 'dynamic') {
      linkageState.when = linkage.when.createState();
    }

    if (linkage.fulfill) {
      const fulfillEntries: Record<string, any> = {};
      for (const key of Object.keys(linkage.fulfill) as Array<keyof typeof linkage.fulfill>) {
        const v = linkage.fulfill[key];
        if (v && typeof v === 'object' && (v as { kind?: string }).kind === 'dynamic') {
          fulfillEntries[key] = (v as { createState(): unknown }).createState();
        }
      }
      if (Object.keys(fulfillEntries).length > 0) {
        linkageState.fulfill = fulfillEntries;
      }
    }

    if (linkage.otherwise) {
      const otherwiseEntries: Record<string, any> = {};
      for (const key of Object.keys(linkage.otherwise) as Array<keyof typeof linkage.otherwise>) {
        const v = linkage.otherwise[key];
        if (v && typeof v === 'object' && (v as { kind?: string }).kind === 'dynamic') {
          otherwiseEntries[key] = (v as { createState(): unknown }).createState();
        }
      }
      if (Object.keys(otherwiseEntries).length > 0) {
        linkageState.otherwise = otherwiseEntries;
      }
    }
  }

  return {
    meta: metaEntries,
    props: propsProgram.kind === 'dynamic' ? propsProgram.createState() : undefined,
    ...(linkageState !== undefined ? { linkage: linkageState } : {})
  };
}

export function createNodeInstance<S extends import('@nop-chaos/flux-core').BaseSchema>(input: {
  templateNode: TemplateNode<S>;
  scope: ScopeRef;
  state: CompiledNodeRuntimeState;
  cid: number | undefined;
  instancePath?: readonly InstanceFrame[];
  mounted: boolean;
}): NodeInstance<S> {
  return {
    cid: input.cid ?? input.templateNode.templateNodeId,
    instancePath: input.instancePath,
    templateNode: input.templateNode,
    scope: input.scope,
    state: toNodeState(input.state, input.mounted)
  };
}
