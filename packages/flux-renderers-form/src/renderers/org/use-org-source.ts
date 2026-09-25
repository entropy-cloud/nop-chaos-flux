import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { ActionSchema, RendererHelpers, ScopeRef, SchemaValue } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  mergeNodesById,
  parseOrgNodePage,
  resolveExtraParams,
  shouldStopPaging,
  type OrgNode,
  type OrgNodePage,
} from './org-data-protocol.js';

export type OrgLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface OrgNodeLoadState {
  status: OrgLoadStatus;
  nodes: OrgNode[];
  error?: string;
}

type OrgFailureKey = 'flux.form.orgChildrenFailed' | 'flux.form.orgSearchFailed' | 'flux.form.orgResolveFailed';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function orgFailureMessage(key: OrgFailureKey, error: unknown): string {
  let detail = '';
  if (typeof error === 'string' && error) {
    detail = `: ${error}`;
  } else if (error instanceof Error) {
    const { message } = error;
    if (message) {
      detail = `: ${message}`;
    }
  }
  return t(key, { message: detail });
}

type OrgRequestResult = { ok: true; page: OrgNodePage } | { ok: false; error: unknown };

interface OrgRequestContext {
  helpers: RendererHelpers;
  scope?: ScopeRef;
  pageSize: number;
  extraParams?: Record<string, SchemaValue>;
}

/**
 * Protocol §2/§8: every org op is dispatched as an ActionSchema through
 * `helpers.dispatch` with a one-off child scope (the `executeTreeSource`
 * pattern) — deliberately NOT via `helpers.executeSource`, which does not
 * propagate a caller-provided scope. Protocol §6: string `extraParams`
 * values are evaluated against the renderer's own form scope at dispatch
 * time; `extraParams` keys override the protocol operation variables.
 */
async function requestOrgPage(
  context: OrgRequestContext,
  action: ActionSchema,
  patch: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<OrgRequestResult> {
  const resolvedExtra = resolveExtraParams(context.extraParams, (target) =>
    context.helpers.evaluate(target, context.scope),
  );
  const requestScope = context.helpers.createScope({ ...patch, ...resolvedExtra });
  try {
    const result = await context.helpers.dispatch(action, { scope: requestScope, signal });
    if (result.ok) {
      return { ok: true, page: parseOrgNodePage(result.data) };
    }
    return { ok: false, error: result.error };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return { ok: false, error };
  } finally {
    context.helpers.disposeScope(requestScope.id);
  }
}

export function useOrgChildren(input: {
  helpers: RendererHelpers;
  scope?: ScopeRef;
  sourceChildren?: ActionSchema;
  pageSize?: number;
  extraParams?: Record<string, SchemaValue>;
  /** Panel first-presentation gate: the root load is lazy, never on mount. */
  enabled: boolean;
  /** Protocol §7: with static options the root layer is not fetched. */
  hasStaticRoot: boolean;
}): {
  rootState: OrgNodeLoadState;
  nodeStates: Record<string, OrgNodeLoadState>;
  loadNode: (node: OrgNode, depth: number) => void;
  retryNode: (node: OrgNode, depth: number) => void;
  retryRoot: () => void;
} {
  const { helpers, scope, sourceChildren, pageSize = 50, extraParams, enabled, hasStaticRoot } = input;
  const [rootState, setRootState] = useState<OrgNodeLoadState>({ status: 'idle', nodes: [] });
  const [nodeStates, setNodeStates] = useState<Record<string, OrgNodeLoadState>>({});
  const controllerRef = useRef<AbortController | null>(null);
  // extraParams identity may churn per render (inline schema objects); reads
  // go through the ref so request effects key on semantic inputs only.
  const extraParamsRef = useRef(extraParams);
  useEffect(() => {
    extraParamsRef.current = extraParams;
  });

  const runRoot = useCallback(() => {
    if (!sourceChildren) {
      return;
    }
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    startTransition(() => setRootState({ status: 'loading', nodes: [] }));
    requestOrgPage(
      { helpers, scope, pageSize, extraParams: extraParamsRef.current },
      sourceChildren,
      { orgNodeId: '', orgDepth: 0, orgPage: 1, orgPageSize: pageSize },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        startTransition(() => {
          if (result.ok) {
            setRootState({ status: 'ready', nodes: result.page.nodes });
          } else {
            setRootState({
              status: 'error',
              nodes: [],
              error: orgFailureMessage('flux.form.orgChildrenFailed', result.error),
            });
          }
        });
      })
      .catch(() => {
        /* aborted */
      });
  }, [helpers, pageSize, scope, sourceChildren]);

  useEffect(() => {
    if (!enabled || !sourceChildren || hasStaticRoot) {
      return;
    }
    runRoot();
    return () => {
      controllerRef.current?.abort();
    };
  }, [enabled, hasStaticRoot, runRoot, sourceChildren]);

  const loadNode = (node: OrgNode, depth: number, force = false) => {
    if (!sourceChildren || node.leaf === true) {
      return;
    }
    if (node.children && node.children.length > 0) {
      return;
    }
    const existing = nodeStates[node.id];
    if (!force && existing && existing.status !== 'error') {
      return;
    }
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    startTransition(() => {
      setNodeStates((previous) => ({
        ...previous,
        [node.id]: { status: 'loading', nodes: existing?.nodes ?? [] },
      }));
    });
    requestOrgPage(
      { helpers, scope, pageSize, extraParams: extraParamsRef.current },
      sourceChildren,
      { orgNodeId: node.id, orgDepth: depth, orgPage: 1, orgPageSize: pageSize },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        startTransition(() => {
          setNodeStates((previous) => {
            if (result.ok) {
              return { ...previous, [node.id]: { status: 'ready', nodes: result.page.nodes } };
            }
            return {
              ...previous,
              [node.id]: {
                status: 'error',
                nodes: [],
                error: orgFailureMessage('flux.form.orgChildrenFailed', result.error),
              },
            };
          });
        });
      })
      .catch(() => {
        /* aborted */
      });
  };

  return {
    rootState,
    nodeStates,
    loadNode: (node, depth) => loadNode(node, depth),
    retryNode: (node, depth) => loadNode(node, depth, true),
    retryRoot: runRoot,
  };
}

export function useOrgSearch(input: {
  helpers: RendererHelpers;
  scope?: ScopeRef;
  sourceSearch?: ActionSchema;
  pageSize?: number;
  extraParams?: Record<string, SchemaValue>;
  enabled: boolean;
}): {
  query: string;
  setQuery: (query: string) => void;
  remoteNodes: OrgNode[] | null;
  status: OrgLoadStatus;
  error?: string;
  hasMore: boolean;
  loadMore: () => void;
} {
  const { helpers, scope, sourceSearch, pageSize = 50, extraParams, enabled } = input;
  const [query, setQuery] = useState('');
  const [remoteNodes, setRemoteNodes] = useState<OrgNode[] | null>(null);
  const [status, setStatus] = useState<OrgLoadStatus>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [stopPaging, setStopPaging] = useState(false);
  const pageRef = useRef(1);
  const controllerRef = useRef<AbortController | null>(null);
  // See useOrgChildren: identity-churn-safe access to extraParams.
  const extraParamsRef = useRef(extraParams);
  useEffect(() => {
    extraParamsRef.current = extraParams;
  });

  const runSearch = useCallback(
    (trimmed: string, page: number, baseNodes: OrgNode[]) => {
      if (!sourceSearch) {
        return;
      }
      const controller = new AbortController();
      controllerRef.current?.abort();
      controllerRef.current = controller;
      pageRef.current = page;
      startTransition(() => {
        setStatus('loading');
        setError(undefined);
      });
      const knownIds = new Set(page > 1 ? baseNodes.map((node) => node.id) : []);
      requestOrgPage(
        { helpers, scope, pageSize, extraParams: extraParamsRef.current },
        sourceSearch,
        { searchQuery: trimmed, orgPage: page, orgPageSize: pageSize },
        controller.signal,
      )
        .then((result) => {
          if (controller.signal.aborted) return;
          startTransition(() => {
            if (!result.ok) {
              setStatus('error');
              setError(orgFailureMessage('flux.form.orgSearchFailed', result.error));
              setRemoteNodes([]);
              setStopPaging(true);
              return;
            }
            const merged = page > 1 ? mergeNodesById(baseNodes, result.page.nodes) : result.page.nodes;
            setRemoteNodes(merged);
            setStopPaging(
              shouldStopPaging({ page: result.page, loadedCount: merged.length, knownIds }),
            );
            setStatus('ready');
          });
        })
        .catch(() => {
          /* aborted */
        });
    },
    [helpers, pageSize, scope, sourceSearch],
  );

  useEffect(() => {
    if (!enabled || !sourceSearch) {
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      controllerRef.current?.abort();
      startTransition(() => {
        setRemoteNodes(null);
        setStatus('idle');
        setError(undefined);
        setStopPaging(false);
      });
      return;
    }
    const handle = setTimeout(() => {
      runSearch(trimmed, 1, []);
    }, 300);
    return () => {
      clearTimeout(handle);
    };
  }, [enabled, query, runSearch, sourceSearch]);

  const loadMore = () => {
    const trimmed = query.trim();
    if (!trimmed || !sourceSearch || stopPaging || status === 'loading') {
      return;
    }
    runSearch(trimmed, pageRef.current + 1, remoteNodes ?? []);
  };

  return { query, setQuery, remoteNodes, status, error, hasMore: !stopPaging, loadMore };
}

/**
 * Protocol §4 resolve op: fills the echo pool for values never seen in this
 * session (form init / cross-page restore). Fire-and-forget cache fill —
 * failures leave values echoing as raw strings (protocol §7); there is no
 * user-visible in-flight state to abort.
 */
export function useOrgEcho(input: {
  helpers: RendererHelpers;
  scope?: ScopeRef;
  sourceResolve?: ActionSchema;
  extraParams?: Record<string, SchemaValue>;
  /** Values whose labels the renderer needs right now. */
  values: string[];
  /** Nodes seen so far (static options + children + search results). */
  echoPool: OrgNode[];
  enabled: boolean;
}): OrgNode[] {
  const { helpers, scope, sourceResolve, extraParams, values, echoPool, enabled } = input;
  const [resolvedNodes, setResolvedNodes] = useState<OrgNode[]>([]);
  const disposedRef = useRef(false);
  const inFlightRef = useRef<Set<string>>(new Set());
  const extraParamsRef = useRef(extraParams);
  useEffect(() => {
    extraParamsRef.current = extraParams;
  });
  const poolIds = new Set(echoPool.map((node) => node.id));
  const missing = [...new Set(values.filter((value) => !poolIds.has(value)))];
  const missingKey = missing.join('\u0000');
  const missingRef = useRef(missing);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    missingRef.current = missing;
  });

  useEffect(() => {
    if (!enabled || !sourceResolve || missingKey === '') {
      return;
    }
    const todo = missingRef.current.filter((value) => !inFlightRef.current.has(value));
    if (todo.length === 0) {
      return;
    }
    for (const value of todo) {
      inFlightRef.current.add(value);
    }
    requestOrgPage(
      { helpers, scope, pageSize: 50, extraParams: extraParamsRef.current },
      sourceResolve,
      { orgValues: todo },
    )
      .then((result) => {
        if (disposedRef.current) {
          return;
        }
        if (!result.ok) {
          for (const value of todo) {
            inFlightRef.current.delete(value);
          }
          return;
        }
        startTransition(() => {
          setResolvedNodes((previous) => {
            const next = mergeNodesById(previous, result.page.nodes);
            return next.length === previous.length ? previous : next;
          });
        });
      })
      .catch(() => {
        if (disposedRef.current) return;
        for (const value of todo) {
          inFlightRef.current.delete(value);
        }
      });
  }, [enabled, extraParams, helpers, missingKey, scope, sourceResolve]);

  return resolvedNodes;
}
