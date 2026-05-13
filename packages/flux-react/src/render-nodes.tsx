import React, { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  BaseSchema,
  CompileSchemaOptions,
  CompiledTemplate,
  RenderFragmentOptions,
  RenderNodeInput,
  RendererComponentProps,
  RendererResolvedProps,
  RendererRuntime,
  ScopeRef,
  TemplateNode,
} from '@nop-chaos/flux-core';
import { isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import {
  useRendererRuntime,
  useRenderScope,
  useCurrentActionScope,
  useCurrentComponentRegistry,
} from './hooks.js';
import { NodeMetaContext, RenderInstancePathContext } from './contexts.js';
import { createFragmentScopeChange } from './fragment-scope.js';
import { NodeRenderer } from './node-renderer.js';

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
export function useSchemaProps<S extends BaseSchema>(
  props: RendererComponentProps<S>,
): Readonly<RendererResolvedProps<S>> {
  return props.props;
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

const fragmentScopeCacheByRuntime = new WeakMap<
  RendererRuntime,
  Map<string, FragmentScopeCacheEntry>
>();

function getFragmentScopeCache(runtime: RendererRuntime): Map<string, FragmentScopeCacheEntry> {
  let cache = fragmentScopeCacheByRuntime.get(runtime);

  if (!cache) {
    cache = new Map();
    fragmentScopeCacheByRuntime.set(runtime, cache);
  }

  return cache;
}

function matchesFragmentScopeEntry(
  entry: FragmentScopeCacheEntry | undefined,
  input: {
    parent: ScopeRef;
    runtime: RendererRuntime;
    isolate: boolean | undefined;
    pathSuffix: string | undefined;
    scopeKey: string | undefined;
  },
): entry is FragmentScopeCacheEntry {
  return Boolean(
    entry &&
      entry.parent === input.parent &&
      entry.runtime === input.runtime &&
      entry.isolate === input.isolate &&
      entry.pathSuffix === input.pathSuffix &&
      entry.scopeKey === input.scopeKey,
  );
}

export function normalizeNodeInput(
  runtime: RendererRuntime,
  input: RenderNodeInput,
  compileOptions?: CompileSchemaOptions,
): TemplateNode | readonly TemplateNode[] | null {
  if (!input) {
    return null;
  }

  const strictOptions: CompileSchemaOptions | undefined = runtime.strictMode
    ? {
        ...compileOptions,
        validation: { strictMode: true, ...compileOptions?.validation },
        diagnostics: {
          enabled: true,
          continueOnError: true,
          ...compileOptions?.diagnostics,
        },
      }
    : compileOptions;

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return [];
    }

    if (input.every((item) => isTemplateNode(item))) {
      return input as TemplateNode[];
    }

    if (isSchemaArray(input)) {
      const compiled = runtime.schemaCompiler.compile(input, strictOptions);
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
    const compiled = runtime.schemaCompiler.compile(input, strictOptions);
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
  },
): React.ReactNode {
  const regionContent = props.regions[slotKey]?.render();

  if (regionContent !== undefined && regionContent !== null) {
    return regionContent as React.ReactNode;
  }

  const propValue = (props.props as Record<string, unknown>)[slotKey] as
    | React.ReactNode
    | undefined;

  if (propValue !== undefined && propValue !== null) {
    return propValue;
  }

  if (options?.metaKey) {
    const metaValue = (props.meta as unknown as Record<string, unknown>)[options.metaKey] as
      | React.ReactNode
      | undefined;

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
  const fragmentBindings = options?.bindings;
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
      parentPath: ownerTemplatePath,
    };
  }, [ownerNodeInstance, pathSuffix]);
  const compiled = useMemo(
    () => normalizeNodeInput(runtime, props.input, compileOptions),
    [runtime, props.input, compileOptions],
  );
  const shouldUseFragmentScope = !explicitScope && !!fragmentBindings;
  const fragmentScopeCache = useMemo(() => getFragmentScopeCache(runtime), [runtime]);
  const fragmentScopeIdentity = useMemo(
    () => ({
      parent: currentScope,
      runtime,
      isolate,
      pathSuffix,
      scopeKey,
    }),
    [currentScope, runtime, isolate, pathSuffix, scopeKey],
  );
  const [fragmentScopeVersion, setFragmentScopeVersion] = useState(0);
  const [committedFragmentScopeVersion, setCommittedFragmentScopeVersion] = useState(0);
  const pendingFragmentScopeVersionRef = useRef<number | undefined>(undefined);
  const cachedFragmentScope = fragmentScopeCache.get(fragmentScopeCacheKey);
  const fragmentScopeEntry = matchesFragmentScopeEntry(cachedFragmentScope, fragmentScopeIdentity)
    ? cachedFragmentScope
    : undefined;
  const fragmentScope = shouldUseFragmentScope ? fragmentScopeEntry?.scope : undefined;
  const activeFragmentScopeVersion = shouldUseFragmentScope && fragmentScope ? fragmentScopeVersion : 0;
  const effectiveCommittedVersion = shouldUseFragmentScope ? committedFragmentScopeVersion : 0;
  const hasCommittedFragmentScope =
    !shouldUseFragmentScope ||
    (fragmentScope !== undefined && effectiveCommittedVersion === activeFragmentScopeVersion);

  useLayoutEffect(() => {
    if (!shouldUseFragmentScope || !fragmentBindings) {
      pendingFragmentScopeVersionRef.current = undefined;
      return;
    }

    let nextEntry = fragmentScopeCache.get(fragmentScopeCacheKey);
    if (!matchesFragmentScopeEntry(nextEntry, fragmentScopeIdentity)) {
      nextEntry = {
        scope: runtime.createChildScope(currentScope, fragmentBindings, {
          isolate,
          pathSuffix,
          scopeKey,
          source: 'fragment',
        }),
        parent: currentScope,
        runtime,
        isolate,
        pathSuffix,
        scopeKey,
      };
      fragmentScopeCache.set(fragmentScopeCacheKey, nextEntry);
    }

    const currentOwnSnapshot = nextEntry.scope.readOwn();
    if (currentOwnSnapshot !== fragmentBindings) {
      const change = createFragmentScopeChange(currentOwnSnapshot, fragmentBindings);
      if (change) {
        nextEntry.scope.store?.setSnapshot(fragmentBindings, change);
      }
    }
  }, [
    currentScope,
    fragmentBindings,
    fragmentScopeCache,
    fragmentScopeCacheKey,
    fragmentScopeIdentity,
    isolate,
    pathSuffix,
    runtime,
    scopeKey,
    shouldUseFragmentScope,
  ]);

  useEffect(() => {
    if (!shouldUseFragmentScope || !fragmentBindings) {
      pendingFragmentScopeVersionRef.current = undefined;
      return;
    }

    if (!fragmentScope) {
      const nextVersion = fragmentScopeVersion + 1;
      if (pendingFragmentScopeVersionRef.current !== nextVersion) {
        pendingFragmentScopeVersionRef.current = nextVersion;
        queueMicrotask(() => {
          setFragmentScopeVersion(nextVersion);
          setCommittedFragmentScopeVersion(0);
        });
      }
      return;
    }

    const cachedEntry = fragmentScopeCache.get(fragmentScopeCacheKey);
    if (!matchesFragmentScopeEntry(cachedEntry, fragmentScopeIdentity)) {
      const nextVersion = fragmentScopeVersion + 1;
      pendingFragmentScopeVersionRef.current = nextVersion;
      queueMicrotask(() => {
        setFragmentScopeVersion(nextVersion);
        setCommittedFragmentScopeVersion(0);
      });
      return;
    }

    const pendingVersion = pendingFragmentScopeVersionRef.current;
    if (pendingVersion !== undefined && committedFragmentScopeVersion !== pendingVersion) {
      queueMicrotask(() => {
        setCommittedFragmentScopeVersion(pendingVersion);
      });
    }
  }, [
    committedFragmentScopeVersion,
    fragmentBindings,
    fragmentScopeCache,
    fragmentScopeCacheKey,
    fragmentScopeIdentity,
    fragmentScope,
    fragmentScopeVersion,
    shouldUseFragmentScope,
  ]);

  useEffect(() => {
    return () => {
      pendingFragmentScopeVersionRef.current = undefined;
      getFragmentScopeCache(runtime).delete(fragmentScopeCacheKey);
    };
  }, [fragmentScopeCacheKey, runtime]);

  const actionScope = options?.actionScope ?? currentActionScope;
  const componentRegistry = options?.componentRegistry ?? currentComponentRegistry;
  const scope = explicitScope ?? fragmentScope ?? currentScope;
  const instancePath =
    options?.instancePath ?? ownerNodeInstance?.instancePath ?? currentInstancePath;

  if (!compiled) {
    return null;
  }

  if (shouldUseFragmentScope && !hasCommittedFragmentScope) {
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
