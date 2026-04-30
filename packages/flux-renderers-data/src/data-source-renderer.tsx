import { useEffect } from 'react';
import type {
  CompiledDataSource,
  DataSourceSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';

export function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const compiledSource = props.templateNode.compiledSources?.[0] as CompiledDataSource | undefined;

  useEffect(() => {
    if (!compiledSource) {
      throw new Error(
        `DataSourceRenderer requires compiledSource for node ${props.id}. Ensure the schema is compiled before rendering.`,
      );
    }

    const registration = runtime.registerDataSource({
      id: props.id,
      scope,
      compiledSource,
    });

    return () => {
      registration.dispose();
    };
  }, [props.id, runtime, scope, compiledSource]);

  return null;
}
