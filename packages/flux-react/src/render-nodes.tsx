import React, { useEffect, useId, useMemo } from 'react';
import type {
  CompiledSchemaNode,
  RenderFragmentOptions,
  RenderNodeInput,
  RendererComponentProps,
  RendererRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import { isSchema, isSchemaArray } from '@nop-chaos/flux-core';
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

const fragmentScopeCache = new Map<string, {
  scope: ScopeRef;
  parent: ScopeRef;
  runtime: RendererRuntime;
  isolate: boolean | undefined;
  pathSuffix: string | undefined;
  scopeKey: string | undefined;
}>();

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
  const fragmentScopeCacheKey = useId();
  const options = props.options;
  const explicitScope = options?.scope;
  const fragmentData = options?.data as Record<string, unknown> | undefined;
  const isolate = options?.isolate;
  const pathSuffix = options?.pathSuffix;
  const scopeKey = options?.scopeKey;
  const compiled = useMemo(() => normalizeNodeInput(runtime, props.input), [runtime, props.input]);
  const shouldUseFragmentScope = !explicitScope && !!fragmentData;
  const fragmentScope = useMemo(() => {
    if (!shouldUseFragmentScope || !fragmentData) {
      return undefined;
    }

    const cachedFragmentScope = fragmentScopeCache.get(fragmentScopeCacheKey);
    if (
      cachedFragmentScope &&
      cachedFragmentScope.parent === currentScope &&
      cachedFragmentScope.runtime === runtime &&
      cachedFragmentScope.isolate === isolate &&
      cachedFragmentScope.pathSuffix === pathSuffix &&
      cachedFragmentScope.scopeKey === scopeKey
    ) {
      return cachedFragmentScope.scope;
    }

    const scope = runtime.createChildScope(currentScope, fragmentData, {
      isolate,
      pathSuffix,
      scopeKey,
      source: 'fragment'
    });

    fragmentScopeCache.set(fragmentScopeCacheKey, {
      scope,
      parent: currentScope,
      runtime,
      isolate,
      pathSuffix,
      scopeKey
    });

    return scope;
  }, [currentScope, fragmentData, fragmentScopeCacheKey, isolate, pathSuffix, runtime, scopeKey, shouldUseFragmentScope]);

  useEffect(() => {
    return () => {
      fragmentScopeCache.delete(fragmentScopeCacheKey);
    };
  }, [fragmentScopeCacheKey]);

  useEffect(() => {
    if (!shouldUseFragmentScope || !fragmentData || !fragmentScope?.store) {
      return;
    }

    if (fragmentScope.readOwn() === fragmentData) {
      return;
    }

    fragmentScope.store.setSnapshot(fragmentData);
  }, [fragmentData, fragmentScope, shouldUseFragmentScope]);

  const actionScope = options?.actionScope ?? currentActionScope;
  const componentRegistry = options?.componentRegistry ?? currentComponentRegistry;
  const scope = explicitScope ?? fragmentScope ?? currentScope;

  if (!compiled) {
    return null;
  }

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
