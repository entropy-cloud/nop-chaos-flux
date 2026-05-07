import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { FragmentSchema } from './schemas.js';
import { asReactNode } from './utils.js';

export function FragmentRenderer(props: RendererComponentProps<FragmentSchema>) {
  return (
    <>
      {props.regions.body?.templateNode
        ? asReactNode(
            props.helpers.render(props.regions.body.templateNode, {
              bindings: props.props.data as Record<string, unknown> | undefined,
              isolate: props.props.isolate === true,
              pathSuffix: 'body',
              scopeKey: `${props.id}:body`,
            }),
          )
        : null}
    </>
  );
}
