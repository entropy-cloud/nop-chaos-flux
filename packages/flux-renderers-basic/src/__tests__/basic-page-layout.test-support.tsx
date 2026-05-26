import { getIn, type RendererDefinition } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';

export const formRendererDefinitions: RendererDefinition[] = [
  {
    type: 'form',
    component: (props: any) => <form>{props.regions.body?.render?.()}</form>,
    fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
  },
  {
    type: 'input-text',
    component: (props: any) => (
      <label>
        <span>{String(props.props.label ?? '')}</span>
        <input
          aria-label={String(props.props.label ?? '')}
          defaultValue={String(props.props.value ?? '')}
        />
      </label>
    ),
  },
];

function ScopeStateProbe(props: any) {
  const path = String(props.props.name ?? '');
  const value = useScopeSelector((scopeData) => (path ? getIn(scopeData, path) : scopeData));
  return <pre data-testid={`scope-state:${path}`}>{JSON.stringify(value ?? null)}</pre>;
}

export const scopeStateProbeRenderer: RendererDefinition = {
  type: 'scope-state-probe',
  component: ScopeStateProbe,
  fields: [{ key: 'name', kind: 'prop' }],
};
