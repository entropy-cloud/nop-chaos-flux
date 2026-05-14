import React from 'react';
import type { NodeRuntimeState, RendererDefinition, RuntimeValueState } from '@nop-chaos/flux-core';
import { useCurrentForm, useScopeSelector } from '@nop-chaos/flux-react';

export const detailViewLikeRenderer: RendererDefinition = {
  type: 'detail-view-like',
  component: function DetailViewLike(props: any) {
    const form = useCurrentForm();
    const [, bumpTick] = React.useReducer((value: number) => value + 1, 0);

    return (
      <div>
        <div data-testid="detail-like-viewer">{props.regions.viewer?.render()}</div>
        <button
          type="button"
          onClick={() => {
            form?.setValues({
              'summary.name': 'Changed Name',
              'summary.status': 'published',
            });
            bumpTick();
          }}
        >
          {'Confirm detail-like edit'}
        </button>
      </div>
    );
  },
  fields: [{ key: 'viewer', kind: 'region', regionKey: 'viewer' }],
};

export const importedSummaryProbeRenderer: RendererDefinition = {
  type: 'imported-summary-probe',
  component: function ImportedSummaryProbe() {
    const name = useScopeSelector(
      (data: { summary?: { name?: string } }) => data.summary?.name ?? '',
      Object.is,
      { paths: ['summary.name'] },
    );
    const status = useScopeSelector(
      (data: { summary?: { status?: string } }) => data.summary?.status ?? '',
      Object.is,
      { paths: ['summary.status'] },
    );

    return (
      <div>
        <span data-testid="probe-name">{name}</span>
        <span data-testid="probe-status">{status}</span>
      </div>
    );
  },
};

export function createRuntimeStateFromTemplateNode(
  node: import('@nop-chaos/flux-core').TemplateNode,
): NodeRuntimeState {
  return {
    meta: Object.fromEntries(
      Object.entries(node.metaProgram)
        .filter(([, value]) => value && typeof value === 'object' && value.kind === 'dynamic')
        .map(([key, value]) => [key, (value as { createState(): RuntimeValueState<unknown> }).createState()]),
    ),
    props: node.propsProgram.kind === 'dynamic' ? node.propsProgram.createState() : undefined,
  };
}
