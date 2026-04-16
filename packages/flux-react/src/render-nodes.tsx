import React, { useContext, useEffect, useId, useMemo } from 'react';
import type {
  BaseSchema,
  CompileSchemaOptions,
  CompiledTemplate,
  RenderFragmentOptions,
  RenderNodeInput,
  RendererComponentProps,
  RendererRuntime,
  ScopeRef,
  TemplateNode
} from '@nop-chaos/flux-core';
import { isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope, useCurrentActionScope, useCurrentComponentRegistry } from './hooks';
import { NodeMetaContext, RenderInstancePathContext } from './contexts';
import { createFragmentScopeChange } from './fragment-scope';
import { NodeRenderer } from './node-renderer';

/**
 * Bridge resolved props to schema type for complex nested properties.
 *
 * This utility provides a type-safe way to access complex schema properties
 * (like `items`, `columns`, `fields`) from `props.props`. The runtime props
 * are `Record<string, unknown>` because they are dynamically resolved;
 * this function makes the type bridge explicit and centralized.
 *
 * @example
 * ```tsx
 * function TabsRenderer(props: RendererComponentProps<TabsSchema>) {
 *   const schemaProps = useSchemaProps(props);
 *   const items = schemaProps.items; // TypeScript knows this is TabsItemSchema[]
 * }
 * ```
 */
export function useSchemaProps<S extends BaseSchema>(props: RendererComponentProps<S>): Readonly<S> {
  return props.props as unknown as Readonly<S>;
}

function getOwnerTemplatePath(input: {
  ownerNodeInstance?: import('@nop-chaos/flux-core').NodeInstance;
}): string | undefined {
  return input.ownerNodeInstance?.templateNode.templatePath;
}

function isTemplateNode(input: unknown): input is TemplateNode {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<TemplateNode>;

  return (
    typeof candidate.templateNodeId === 'number' &&
    typeof candidate.templatePath === 'string' &&
    typeof candidate.type === 'string' &&
    !!candidate.component &&
    !!candidate.schema &&
    !!candidate.regions
  );
}

function isCompiledTemplate(input: unknown): input is CompiledTemplate {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const candidate = input as Partial<CompiledTemplate>;

  return !!candidate.root && candidate.repeatedTemplates instanceof Map;
}

function extractTemplateNodes(template: CompiledTemplate): TemplateNode | readonly TemplateNode[] {
  return template.root;
}

type FragmentScopeCacheEntry = {
  scope: ScopeRef;
  parent: ScopeRef;
  runtime: RendererRuntime;
  isolate: boolean | undefined;
  pathSuffix: string | undefined;
  scopeKey: string | undefined;
};

const fragmentScopeCacheByRuntime = new WeakMap<RendererRuntime, Map<string, FragmentScopeCacheEntry>>();

function getFragmentScopeCache(runtime: RendererRuntime): Map<string, FragmentScopeCacheEntry> {
  let cache = fragmentScopeCacheByRuntime.get(runtime);

  if (!cache) {
    cache = new Map();
    fragmentScopeCacheByRuntime.set(runtime, cache);
  }

  return cache;
}

export function normalizeNodeInput(
  runtime: RendererRuntime,
  input: RenderNodeInput,
  compileOptions?: CompileSchemaOptions
): TemplateNode | readonly TemplateNode[] | null {
  if (!input) {
    return null;
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return [];
    }

    if (input.every((item) => isTemplateNode(item))) {
      return input as TemplateNode[];
    }

    if (isSchemaArray(input)) {
      const compiled = runtime.schemaCompiler.compile(input, compileOptions);
      return extractTemplateNodes(compiled);
    }

    return input as TemplateNode[];
  }

  if (isTemplateNode(input)) {
    return input;
  }

  if (isCompiledTemplate(input)) {
    return extractTemplateNodes(input);
  }

  if (isSchema(input)) {
    const compiled = runtime.schemaCompiler.compile(input, compileOptions);
    return extractTemplateNodes(compiled);
  }

  return null;
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
  const currentNodeMeta = useContext(NodeMetaContext);
  const currentInstancePath = useContext(RenderInstancePathContext);
  const fragmentScopeCacheKey = useId();
  const options = props.options;
  const explicitScope = options?.scope;
  const fragmentBindings = options?.bindings ?? (options?.data as Record<string, unknown> | undefined);
  const isolate = options?.isolate;
  const pathSuffix = options?.pathSuffix;
  const scopeKey = options?.scopeKey;
  const ownerNodeInstance = options?.ownerNodeInstance ?? currentNodeMeta?.node ?? undefined;
  const compileOptions = useMemo<CompileSchemaOptions | undefined>(() => {
    const ownerTemplatePath = getOwnerTemplatePath({ ownerNodeInstance });

    if (!ownerTemplatePath) {
      return undefined;
    }

    const basePath = `${ownerTemplatePath}.${pathSuffix ?? 'fragment'}`;

    return {
      basePath,
      parentPath: ownerTemplatePath
    };
  }, [ownerNodeInstance, pathSuffix]);
  const compiled = useMemo(() => normalizeNodeInput(runtime, props.input, compileOptions), [runtime, props.input, compileOptions]);
  const shouldUseFragmentScope = !explicitScope && !!fragmentBindings;
  const fragmentScope = useMemo(() => {
    if (!shouldUseFragmentScope || !fragmentBindings) {
      return undefined;
    }

    const fragmentScopeCache = getFragmentScopeCache(runtime);
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

    const scope = runtime.createChildScope(currentScope, fragmentBindings, {
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
  }, [currentScope, fragmentBindings, fragmentScopeCacheKey, isolate, pathSuffix, runtime, scopeKey, shouldUseFragmentScope]);

  useEffect(() => {
    return () => {
      getFragmentScopeCache(runtime).delete(fragmentScopeCacheKey);
    };
  }, [fragmentScopeCacheKey, runtime]);

  useEffect(() => {
    if (!shouldUseFragmentScope || !fragmentBindings || !fragmentScope?.store) {
      return;
    }

    const currentOwnSnapshot = fragmentScope.readOwn();

    if (currentOwnSnapshot === fragmentBindings) {
      return;
    }

    const change = createFragmentScopeChange(currentOwnSnapshot, fragmentBindings);

    if (!change) {
      return;
    }

    fragmentScope.store.setSnapshot(fragmentBindings, change);
  }, [fragmentBindings, fragmentScope, shouldUseFragmentScope]);

  const actionScope = options?.actionScope ?? currentActionScope;
  const componentRegistry = options?.componentRegistry ?? currentComponentRegistry;
  const scope = explicitScope ?? fragmentScope ?? currentScope;
  const instancePath = options?.instancePath ?? ownerNodeInstance?.instancePath ?? currentInstancePath;

  if (!compiled) {
    return null;
  }

  if (Array.isArray(compiled)) {
    return (
      <RenderInstancePathContext.Provider value={instancePath}>
        <>
          {(compiled as TemplateNode[]).map((node) => (
            <NodeRenderer
              key={node.id}
              node={node}
              scope={scope}
              actionScope={actionScope}
              componentRegistry={componentRegistry}
            />
          ))}
        </>
      </RenderInstancePathContext.Provider>
    );
  }

  return (
    <RenderInstancePathContext.Provider value={instancePath}>
      <NodeRenderer
        node={compiled as TemplateNode}
        scope={scope}
        actionScope={actionScope}
        componentRegistry={componentRegistry}
      />
    </RenderInstancePathContext.Provider>
  );
}
