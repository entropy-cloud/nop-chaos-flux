import type {
  ActionResult,
  ExecutableApiRequest,
  ApiResponse,
  TemplateNode,
} from '@nop-chaos/flux-core';
import type {
  NopDebugEventNetworkSummary,
  NopDebuggerWindowConfig,
} from './types.js';

const DEFAULT_POSITION = { x: 24, y: 24 };

export function readWindowConfig(): Required<NopDebuggerWindowConfig> & { enabled: boolean } {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: DEFAULT_POSITION,
      dock: 'floating',
    };
  }

  const raw = window.__NOP_DEBUGGER__;

  if (raw === true) {
    return {
      enabled: true,
      defaultOpen: true,
      defaultTab: 'timeline',
      position: DEFAULT_POSITION,
      dock: 'floating',
    };
  }

  if (!raw) {
    return {
      enabled: false,
      defaultOpen: false,
      defaultTab: 'timeline',
      position: DEFAULT_POSITION,
      dock: 'floating',
    };
  }

  return {
    enabled: raw.enabled ?? true,
    defaultOpen: raw.defaultOpen ?? true,
    defaultTab: raw.defaultTab ?? 'timeline',
    position: raw.position ?? DEFAULT_POSITION,
    dock: raw.dock ?? 'floating',
  };
}

export function createSessionId(id: string) {
  return `${id}:${Date.now().toString(36)}`;
}

export function formatErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function formatActionResult(result: ActionResult | undefined) {
  if (!result) {
    return 'completed';
  }

  if (result.cancelled) {
    return 'cancelled';
  }

  if (result.skipped) {
    return 'skipped';
  }

  if (result.timedOut) {
    return 'timed out';
  }

  return result.ok ? 'ok' : 'failed';
}

export function summarizeApi(api: ExecutableApiRequest) {
  return `${String(api.method ?? 'get').toUpperCase()} ${api.url}`;
}

export function summarizeValueShape(value: unknown) {
  if (Array.isArray(value)) {
    return {
      responseType: 'array',
      keys: [] as string[],
    };
  }

  if (value && typeof value === 'object') {
    return {
      responseType: 'object',
      keys: Object.keys(value as Record<string, unknown>).slice(0, 12),
    };
  }

  return {
    responseType: value == null ? 'nullish' : typeof value,
    keys: [] as string[],
  };
}

export function createRequestKey(api: ExecutableApiRequest, nodeId?: string, path?: string) {
  return `${String(api.method ?? 'get').toUpperCase()} ${api.url} | ${nodeId ?? 'n/a'} | ${path ?? 'n/a'}`;
}

export function createRequestInstanceIdFactory() {
  let nextId = 1;
  return () => `req-${nextId++}`;
}

const createRequestInstanceIdFromDefaultFactory = createRequestInstanceIdFactory();

export function createRequestInstanceId() {
  return createRequestInstanceIdFromDefaultFactory();
}

export { buildScopeChain } from '@nop-chaos/flux-core';

export function buildNetworkSummary(input: {
  api: ExecutableApiRequest;
  response?: ApiResponse<unknown>;
  aborted?: boolean;
}): NopDebugEventNetworkSummary {
  const requestShape = summarizeValueShape(input.api.data);
  const responseShape = summarizeValueShape(input.response?.data);

  return {
    method: String(input.api.method ?? 'get').toUpperCase(),
    url: input.api.url,
    status: input.response?.status,
    ok: input.response?.ok,
    aborted: input.aborted,
    requestDataKeys: requestShape.keys,
    responseDataKeys: responseShape.keys,
    responseType: responseShape.responseType,
  };
}

export function normalizeCompiledRoot(node: TemplateNode | readonly TemplateNode[]) {
  const roots = Array.isArray(node) ? node : [node];
  const first = roots[0];
  const firstPath =
    first && typeof first === 'object' && 'templatePath' in first
      ? first.templatePath
      : first && typeof first === 'object' && 'path' in (first as Record<string, unknown>)
        ? (first as { path?: string }).path
        : undefined;

  return {
    rootCount: roots.length,
    firstType: first?.type,
    firstPath,
  };
}

function findPropertyDescriptor(target: object, key: PropertyKey): PropertyDescriptor | undefined {
  let current: object | null = target;

  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      return descriptor;
    }
    current = Object.getPrototypeOf(current);
  }

  return undefined;
}

function resolveStorageFromDescriptor(
  target: object,
  descriptor: PropertyDescriptor | undefined,
): Storage | undefined {
  if (!descriptor) {
    return undefined;
  }

  if ('value' in descriptor && descriptor.value) {
    return descriptor.value as Storage;
  }

  if (typeof descriptor.get === 'function') {
    try {
      return descriptor.get.call(target) as Storage;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function getBrowserLocalStorage(): Storage | undefined {
  const globalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (
    globalStorageDescriptor &&
    'value' in globalStorageDescriptor &&
    globalStorageDescriptor.value
  ) {
    return globalStorageDescriptor.value as Storage;
  }

  if (typeof window !== 'undefined') {
    const windowDescriptor = findPropertyDescriptor(window, 'localStorage');
    const windowStorage = resolveStorageFromDescriptor(window, windowDescriptor);
    if (windowStorage) {
      return windowStorage;
    }
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  return undefined;
}

export function loadPersistedPosition(id: string): { x: number; y: number } | undefined {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return undefined;
  }

  try {
    const raw = storage.getItem(`nop-debugger:${id}:position`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function persistPosition(id: string, position: { x: number; y: number }) {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(`nop-debugger:${id}:position`, JSON.stringify(position));
  } catch {
    void undefined;
  }
}

export function loadPersistedPanelOpen(id: string): boolean | undefined {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return undefined;
  }

  try {
    const raw = storage.getItem(`nop-debugger:${id}:panelOpen`);
    if (raw === null) return undefined;
    return raw === 'true';
  } catch {
    return undefined;
  }
}

export function persistPanelOpen(id: string, panelOpen: boolean) {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(`nop-debugger:${id}:panelOpen`, String(panelOpen));
  } catch {
    void undefined;
  }
}

export function persistMinimized(id: string, minimized: boolean) {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(`nop-debugger:${id}:minimized`, String(minimized));
  } catch {
    void undefined;
  }
}

export function loadPersistedMinimized(id: string): boolean | undefined {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return undefined;
  }

  try {
    const raw = storage.getItem(`nop-debugger:${id}:minimized`);
    if (raw === null) return undefined;
    return raw === 'true';
  } catch {
    return undefined;
  }
}

export function loadPersistedSearchHistory(id: string): string[] {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(`nop-debugger:${id}:search-history`);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

export function persistSearchHistory(id: string, history: readonly string[]) {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(`nop-debugger:${id}:search-history`, JSON.stringify(history.slice(0, 8)));
  } catch {
    void undefined;
  }
}
