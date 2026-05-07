import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererResolvedProps,
} from '@nop-chaos/flux-core';
import type { RendererDefinition } from './react-contracts.js';

export function createAutoRendererComponent<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
>(
  ReactComponent: React.ComponentType<Readonly<P>>,
): (props: RendererComponentProps<S, P>) => React.ReactElement | null {
  return function AutoRenderer(props: RendererComponentProps<S, P>) {
    const uiProps: Record<string, unknown> = { ...props.props };

    for (const [key, handler] of Object.entries(props.events)) {
      if (handler) {
        uiProps[key] = (event: unknown) => handler(event);
      }
    }

    return React.createElement(ReactComponent, {
      ...(uiProps as P),
      disabled: props.meta.disabled,
      className: props.meta.className,
      'data-testid': props.meta.testid || undefined,
      'data-cid': props.meta.cid || undefined,
    } as P);
  };
}

export function ensureRendererComponent<S extends BaseSchema, P extends Record<string, unknown>>(
  definition: RendererDefinition<S, P>,
): RendererDefinition<S, P> {
  if (definition.component) {
    return definition;
  }

  const reactComponent = definition.reactComponent as React.ComponentType<Readonly<P>>;

  return {
    ...definition,
    component: createAutoRendererComponent<S, P>(reactComponent),
  };
}
