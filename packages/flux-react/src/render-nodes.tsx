import React, { useEffect, useMemo, useRef } from 'react';
import type {
  CompiledSchemaNode,
  RenderFragmentOptions,
  RenderNodeInput,
  RendererComponentProps,
  RendererRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import { shallowEqual, isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope, useCurrentActionScope, useCurrentComponentRegistry, useCurrentForm, useCurrentPage } from './hooks';
import { NodeRenderer } from './node-renderer';

function isCompiledNode(input: unknown): input is CompiledSchemaNode {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<CompiledSchemaNode>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.type === 'string' &&
    !!candidate.component &&
    !!candidate.schema &&
    !!candidate.regions
  );
}

export function normalizeNodeInput(runtime: RendererRuntime, input: RenderNodeInput): CompiledSchemaNode | CompiledSchemaNode[] | null {
  if (!input) {
    return null;
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return [];
    }

    if (input.every((item) => isCompiledNode(item))) {
      return input;
    }

    if (isSchemaArray(input)) {
      return runtime.compile(input);
    }

    return input as CompiledSchemaNode[];
  }

  if (isCompiledNode(input)) {
    return input;
  }

  if (isSchema(input)) {
    return runtime.compile(input) as CompiledSchemaNode;
  }

  return input as CompiledSchemaNode;
}

export function resolveRendererSlotContent(
  props: Pick<RendererComponentProps, 'props' | 'meta' | 'regions'>,
  slotKey: string,
  options?: {
    metaKey?: string;
    fallback?: React.ReactNode;
  }
) {
  const regionContent = props.regions[slotKey]?.render();

  if (regionContent !== undefined && regionContent !== null) {
    return regionContent;
  }

  const propValue = (props.props as Record<string, unknown>)[slotKey] as React.ReactNode | undefined;

  if (propValue !== undefined && propValue !== null) {
    return propValue;
  }

  if (options?.metaKey) {
    const metaValue = (props.meta as unknown as Record<string, unknown>)[options.metaKey] as React.ReactNode | undefined;

    if (metaValue !== undefined && metaValue !== null) {
      return metaValue;
    }
  }

  return options?.fallback;
}

export function hasRendererSlotContent(content: React.ReactNode): boolean {
  if (content === null || content === undefined || content === false) {
    return false;
  }

  if (Array.isArray(content)) {
    return content.some((item): boolean => hasRendererSlotContent(item));
  }

  return true;
}

export function RenderNodes(props: { input: RenderNodeInput; options?: RenderFragmentOptions }) {
  const runtime = useRendererRuntime();
  const currentScope = useRenderScope();
  const currentActionScope = useCurrentActionScope();
  const currentComponentRegistry = useCurrentComponentRegistry();
  const currentForm = useCurrentForm();
  const currentPage = useCurrentPage();
  const compiled = useMemo(() => normalizeNodeInput(runtime, props.input), [runtime, props.input]);
  const fragmentScopeRef = React.useRef<{
    parentScope: ScopeRef;
    isolate?: boolean;
    pathSuffix?: string;
    scopeKey?: string;
    data: Record<string, unknown>;
    scope: ScopeRef;
  } | undefined>(undefined);
  const pendingDataRef = useRef<Record<string, unknown> | null>(null);

  let scope = currentScope;
  const actionScope = props.options?.actionScope ?? currentActionScope;
  const componentRegistry = props.options?.componentRegistry ?? currentComponentRegistry;

  if (!compiled) {
    return null;
  }

  if (props.options?.scope) {
    scope = props.options.scope;
  } else if (props.options?.data) {
    const nextData = props.options.data as Record<string, unknown>;
    const cached = fragmentScopeRef.current;

    if (
      !cached ||
      cached.parentScope !== currentScope ||
      cached.isolate !== props.options.isolate ||
      cached.pathSuffix !== props.options.pathSuffix ||
      cached.scopeKey !== props.options.scopeKey
    ) {
      scope = runtime.createChildScope(currentScope, nextData, {
        isolate: props.options.isolate,
        pathSuffix: props.options.pathSuffix,
        scopeKey: props.options.scopeKey,
        source: 'fragment'
      });
      fragmentScopeRef.current = {
        parentScope: currentScope,
        isolate: props.options.isolate,
        pathSuffix: props.options.pathSuffix,
        scopeKey: props.options.scopeKey,
        data: nextData,
        scope
      };
    } else {
      scope = cached.scope;

      if (!shallowEqual(cached.data, nextData)) {
        pendingDataRef.current = nextData;
        cached.data = nextData;
      }
    }
  }

  useEffect(() => {
    if (pendingDataRef.current && scope?.store) {
      scope.store.setSnapshot(pendingDataRef.current);
      pendingDataRef.current = null;
    }
  });

  if (Array.isArray(compiled)) {
    return (
      <>
        {compiled.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            scope={scope}
            actionScope={actionScope}
            componentRegistry={componentRegistry}
            form={currentForm}
            page={currentPage}
          />
        ))}
      </>
    );
  }

  return (
    <NodeRenderer
      node={compiled}
      scope={scope}
      actionScope={actionScope}
      componentRegistry={componentRegistry}
      form={currentForm}
      page={currentPage}
    />
  );
}
