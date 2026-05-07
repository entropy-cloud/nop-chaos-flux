import React, { useEffect } from 'react';
import { Button } from '@nop-chaos/ui';
import type {
  ActionContext,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
} from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import {
  createSchemaRenderer,
  useCurrentComponentRegistry,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { dataRendererDefinitions } from './index.js';

export const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined,
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

export const iconRenderer: RendererDefinition = {
  type: 'icon',
  component: (props) => (
    <span data-testid={props.meta.testid ?? undefined}>{String(props.props.icon ?? '')}</span>
  ),
};

export const nodeInstanceProbeRenderer: RendererDefinition = {
  type: 'node-instance-probe',
  component: (props) => (
    <span data-testid="node-instance-probe">{JSON.stringify(props.node.instancePath ?? null)}</span>
  ),
};

function RowScopeIdProbeRenderer() {
  const scope = useRenderScope();
  return <span data-testid="row-scope-id-probe">{scope.id}</span>;
}

export const rowScopeIdProbeRenderer: RendererDefinition = {
  type: 'row-scope-id-probe',
  component: RowScopeIdProbeRenderer,
};

function RowRecordNameProbeRenderer() {
  const name = useScopeSelector(
    (scope: { $slot?: { record?: { name?: unknown } } }) => String(scope.$slot?.record?.name ?? ''),
  );
  return <span data-testid="row-record-name-probe">{name}</span>;
}

export const rowRecordNameProbeRenderer: RendererDefinition = {
  type: 'row-record-name-probe',
  component: RowRecordNameProbeRenderer,
};

function ResolvedNameProbeRenderer(props: RendererComponentProps) {
  return <span data-testid="resolved-name-probe">{String(props.props.name ?? '')}</span>;
}

export const resolvedNameProbeRenderer: RendererDefinition = {
  type: 'resolved-name-probe',
  component: ResolvedNameProbeRenderer,
};

function DispatchProbeRenderer(props: RendererComponentProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      data-testid="dispatch-probe"
      onClick={() => void props.helpers.dispatch({ action: 'probe:recordLocator' } as never)}
    >
      Dispatch probe
    </Button>
  );
}

export const dispatchProbeRenderer: RendererDefinition = {
  type: 'dispatch-probe',
  component: DispatchProbeRenderer,
};

function TestButtonRenderer(props: RendererComponentProps) {
  const componentRegistry = useCurrentComponentRegistry();

  useEffect(() => {
    if (!componentRegistry || props.meta.cid === undefined) {
      return;
    }

    const cid: number = props.meta.cid;

    componentRegistry.setHandleDebugData?.(cid, {
      nodeId: props.node.templateNode.id,
      path: props.node.templateNode.templatePath,
      rendererType: props.node.templateNode.rendererType,
      nodeInstance: props.node,
      resolvedMeta: props.meta,
      resolvedProps: props.props,
      updatedAt: Date.now(),
    });

    const unregister = componentRegistry.register(
      {
        type: 'button',
        capabilities: {
          invoke() {
            return { ok: true };
          },
        },
      },
      { cid },
    );

    return () => {
      componentRegistry.setHandleDebugData?.(cid, undefined);
      unregister();
    };
  }, [componentRegistry, props.meta, props.node, props.props]);

  return (
    <Button
      variant="ghost"
      size="sm"
      data-cid={props.meta.cid}
      onClick={() => void props.events.onClick?.()}
    >
      {String(props.props.label ?? 'Button')}
    </Button>
  );
}

export const buttonRenderer: RendererDefinition = {
  type: 'button',
  component: TestButtonRenderer,
  fields: [{ key: 'onClick', kind: 'event' }],
};

export function createDataSchemaRenderer(extra: RendererDefinition[] = []) {
  return createSchemaRenderer([
    pageRenderer,
    textRenderer,
    ...formRendererDefinitions,
    ...extra,
    ...dataRendererDefinitions,
  ]);
}

export const formulaCompiler = createFormulaCompiler();

export function registerProbeNamespace(observedLocators: unknown[]) {
  return (actionScope: any) => {
    if (!actionScope) {
      return;
    }

    actionScope.registerNamespace('probe', {
      kind: 'host',
      invoke(method: string, _payload: Record<string, unknown> | undefined, ctx: ActionContext) {
        if (method === 'recordLocator') {
          observedLocators.push({ instancePath: ctx.instancePath });
          return { ok: true, data: ctx.instancePath };
        }

        return { ok: false, error: new Error(`Unsupported method: ${method}`) };
      },
    });
  };
}
