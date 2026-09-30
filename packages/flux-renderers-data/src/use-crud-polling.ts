import { useEffect, useRef, useState } from 'react';
import type {
  ComponentCapabilities,
  ComponentHandle,
  ComponentHandleRegistry,
  ScopeRef,
} from '@nop-chaos/flux-core';
import type { CrudPollingConfig } from './crud-schema.js';

interface ResolvedDataSourceHandle {
  id?: string;
  type: string;
  capabilities?: ComponentCapabilities;
}

function asResolvedHandle(handle: ComponentHandle | undefined): ResolvedDataSourceHandle | undefined {
  if (!handle) {
    return undefined;
  }
  return {
    id: handle.id,
    type: handle.type,
    capabilities: handle.capabilities,
  };
}

function resolveDataSourceHandle(
  componentRegistry: ComponentHandleRegistry | undefined,
  sourceId: string | undefined,
): ResolvedDataSourceHandle | undefined {
  if (!componentRegistry) {
    return undefined;
  }

  if (sourceId) {
    const byId = asResolvedHandle(componentRegistry.resolve({ componentId: sourceId }));
    if (byId && byId.capabilities?.hasMethod?.('start')) {
      return byId;
    }
  }

  const snapshot = componentRegistry.getDebugSnapshot?.();
  const handles = snapshot?.handles ?? [];
  for (const entry of handles) {
    if (entry.type !== 'data-source') {
      continue;
    }
    if (!entry.capabilities?.hasMethod?.('start')) {
      continue;
    }
    if (sourceId && entry.id !== sourceId) {
      continue;
    }
    return {
      id: entry.id,
      type: entry.type,
      capabilities: entry.capabilities,
    };
  }

  return undefined;
}

function invokeCapability(
  handle: ResolvedDataSourceHandle | undefined,
  method: 'start' | 'cancel',
) {
  if (!handle?.capabilities) {
    return;
  }
  try {
    handle.capabilities.invoke(method, undefined, {} as never);
  } catch {
    // ignore capability invocation errors; polling orchestration is best-effort
  }
}

export interface UseCrudPollingArgs {
  polling: CrudPollingConfig | undefined;
  componentRegistry: ComponentHandleRegistry | undefined;
  scope: ScopeRef | undefined;
}

// When the CRUD mounts before its upstream data-source (schema order
// `[crud, data-source]`), the handle is not resolvable yet. Retry resolution on
// a bounded timer so polling starts automatically once the data-source
// registers, instead of being silently disabled forever (2-10).
const RESOLVE_RETRY_MS = 250;
// 20 × 250ms ≈ 5s covers the legitimate late-registration window; beyond that
// the missing handle is a configuration error, not pending registration. The
// counter lives per effect run, so a re-run (re-render with changed registry)
// re-arms it.
const MAX_RESOLVE_ATTEMPTS = 20;

export interface UseCrudPollingResult {
  /** schema `enabled` resolved against the user toggle */
  effectiveEnabled: boolean;
  /** user-controlled override (defaults to true) */
  userToggle: boolean;
  /** flip the user toggle; resolves and addresses the upstream data-source */
  setUserToggle(next: boolean): void;
  toggle(): void;
}

export function useCrudPolling(args: UseCrudPollingArgs): UseCrudPollingResult {
  const { polling, componentRegistry, scope } = args;
  const enabledSpec = polling?.enabled;
  const sourceId = polling?.sourceId;

  const schemaEnabled = polling ? enabledSpec !== false && enabledSpec !== 'false' : false;
  const [userToggle, setUserToggleState] = useState<boolean>(true);
  const effectiveEnabled = schemaEnabled && userToggle;

  const handleRef = useRef<ResolvedDataSourceHandle | undefined>(undefined);
  const lastActionRef = useRef<'start' | 'cancel' | undefined>(undefined);

  useEffect(() => {
    if (!effectiveEnabled) {
      if (lastActionRef.current === 'start') {
        invokeCapability(handleRef.current, 'cancel');
        lastActionRef.current = 'cancel';
      }
      return;
    }

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let warned = false;
    let resolveAttempts = 0;

    const attempt = () => {
      const handle = resolveDataSourceHandle(componentRegistry, sourceId);
      handleRef.current = handle;

      if (!handle) {
        // The upstream data-source may not be registered yet (schema order
        // `[crud, data-source]`): warn once, retry within the legitimate
        // late-registration window, then give up with a config pointer.
        if (!warned) {
          warned = true;
          if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn(
              `[crud polling] polling.enabled is true but no upstream data-source was found${sourceId ? ` for sourceId "${sourceId}"` : ''}; retrying until it registers`,
            );
          }
        }
        resolveAttempts += 1;
        if (resolveAttempts >= MAX_RESOLVE_ATTEMPTS) {
          if (typeof console !== 'undefined' && typeof console.warn === 'function') {
            console.warn(
              `[crud polling] data-source still unresolved after ${MAX_RESOLVE_ATTEMPTS} retries (~${Math.round((MAX_RESOLVE_ATTEMPTS * RESOLVE_RETRY_MS) / 1000)}s)${sourceId ? ` for sourceId "${sourceId}"` : ''}; stopping auto-retry. Check the polling.sourceId / data-source config.`,
            );
          }
          return;
        }
        retryTimer = setTimeout(attempt, RESOLVE_RETRY_MS);
        return;
      }

      invokeCapability(handle, 'start');
      lastActionRef.current = 'start';
    };

    attempt();

    return () => {
      if (retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      invokeCapability(handleRef.current, 'cancel');
      lastActionRef.current = 'cancel';
    };
  }, [effectiveEnabled, sourceId, componentRegistry, scope]);

  function setUserToggle(next: boolean) {
    setUserToggleState(next);
  }

  function toggle() {
    setUserToggleState((prev) => !prev);
  }

  return {
    effectiveEnabled,
    userToggle,
    setUserToggle,
    toggle,
  };
}

