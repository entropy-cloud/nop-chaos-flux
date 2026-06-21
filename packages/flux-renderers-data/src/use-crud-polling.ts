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

  const schemaEnabled = enabledSpec !== false && enabledSpec !== 'false';
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

    const handle = resolveDataSourceHandle(componentRegistry, sourceId);
    handleRef.current = handle;

    if (!handle) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          `[crud polling] polling.enabled is true but no upstream data-source was found${sourceId ? ` for sourceId "${sourceId}"` : ''}; polling is disabled`,
        );
      }
      return;
    }

    invokeCapability(handle, 'start');
    lastActionRef.current = 'start';

    return () => {
      if (lastActionRef.current === 'start') {
        invokeCapability(handleRef.current, 'cancel');
        lastActionRef.current = 'cancel';
      }
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

