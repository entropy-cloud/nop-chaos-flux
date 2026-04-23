import { useEffect } from 'react';
import type { DataSourceSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';

export function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const schema = props.schema;
  const compiledSource = props.templateNode.compiledSources?.[0];

  useEffect(() => {
    const registration = runtime.registerDataSource({
      id: props.id,
      scope,
      schema,
      compiledSource
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, runtime, scope, schema, compiledSource]);

  return null;
}
