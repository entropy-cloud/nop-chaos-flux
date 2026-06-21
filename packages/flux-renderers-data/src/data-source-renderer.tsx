import { useEffect, useRef } from 'react';
import type {
  CompiledDataSource,
  ComponentHandle,
  DataSourceController,
  DataSourceSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry, useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';

export function DataSourceRenderer(props: RendererComponentProps<DataSourceSchema>) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();
  const compiledSource = props.templateNode.compiledSources?.[0] as CompiledDataSource | undefined;
  const controllerRef = useRef<DataSourceController | undefined>(undefined);

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

    controllerRef.current = registration.controller;

    return () => {
      controllerRef.current = undefined;
      registration.dispose();
    };
  }, [props.id, runtime, scope, compiledSource]);

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }

    const handle: ComponentHandle = {
      id: props.id,
      type: 'data-source',
      capabilities: {
        invoke(method) {
          const controller = controllerRef.current;
          if (!controller) {
            return { ok: false, error: new Error('Data source controller is not registered') };
          }

          if (method === 'refresh') {
            return controller
              .refresh()
              .then((result) => ({ ok: true, data: { skipped: result.skipped } }))
              .catch((error: unknown) => ({ ok: false, error }));
          }

          if (method === 'cancel') {
            controller.stop();
            return { ok: true };
          }

          if (method === 'start') {
            controller.start();
            return { ok: true };
          }

          return { ok: false, error: new Error(`Unsupported data-source handle method: ${method}`) };
        },
        hasMethod(method) {
          return method === 'refresh' || method === 'cancel' || method === 'start';
        },
        listMethods() {
          return ['refresh', 'cancel', 'start'];
        },
      },
    };

    return componentRegistry.register(handle, { cid: props.meta.cid });
  }, [componentRegistry, props.id, props.meta.cid]);

  return null;
}
