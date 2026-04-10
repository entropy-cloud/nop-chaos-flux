import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { FragmentSchema } from './schemas';

export function FragmentRenderer(props: RendererComponentProps<FragmentSchema>) {
  return (
    <>
      {props.regions.body?.render({
        data: props.props.data as Record<string, unknown> | undefined,
        isolate: props.props.isolate === true,
        pathSuffix: 'body',
        scopeKey: `${props.id}:body`
      })}
    </>
  );
}
