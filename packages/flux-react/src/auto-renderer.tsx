import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { RendererDefinition } from './react-contracts';

export function createAutoRendererComponent(
  ReactComponent: React.ComponentType<Record<string, unknown>>,
): React.ComponentType<RendererComponentProps> {
  return function AutoRenderer(props: RendererComponentProps) {
    const uiProps: Record<string, unknown> = { ...props.props };

    for (const [key, handler] of Object.entries(props.events)) {
      if (handler) {
        uiProps[key] = (event: unknown) => handler(event);
      }
    }

    return (
      <ReactComponent
        {...uiProps}
        disabled={props.meta.disabled}
        className={props.meta.className}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
      />
    );
  };
}

export function ensureRendererComponent(definition: RendererDefinition): RendererDefinition {
  if (definition.component) {
    return definition;
  }

  const reactComponent = definition.reactComponent as React.ComponentType<Record<string, unknown>>;

  return {
    ...definition,
    component: createAutoRendererComponent(reactComponent) as RendererDefinition['component'],
  };
}
