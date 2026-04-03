import { useEffect, useMemo } from 'react';
import type { ApiObject, DataSourceSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';

export function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const schema = props.schema;
  const api = props.props.api as ApiObject;
  const controller = useMemo(
    () => runtime.createDataSourceController({
      api,
      scope,
      dataPath: schema.dataPath,
      interval: schema.interval,
      stopWhen: schema.stopWhen,
      silent: schema.silent === true,
      initialData: schema.initialData
    }),
    [api, runtime, scope, schema.dataPath, schema.initialData, schema.interval, schema.silent, schema.stopWhen]
  );

  useEffect(() => {
    controller.start();

    return () => {
      controller.stop();
    };
  }, [controller]);

  return null;
}
