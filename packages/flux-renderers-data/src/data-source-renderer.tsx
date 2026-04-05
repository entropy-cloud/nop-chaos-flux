import { useEffect } from 'react';
import type { DataSourceSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';

export function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const schema = props.schema;

  if ('formula' in schema && !schema.dataPath) {
    throw new Error('Formula data-source requires dataPath');
  }

  useEffect(() => {
    const registration = runtime.registerDataSource({
      id: props.id,
      scope,
      schema
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, runtime, scope, schema]);

  return null;
}
