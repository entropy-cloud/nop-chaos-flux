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

/** floating 渲染的兜底绝对坐标（dock=bottom-left 时不消费）。 */
export const DEFAULT_POSITION = { x: 24, y: 24 };

export function readWindowConfig(): Omit<Required<NopDebuggerWindowConfig>, 'position'> & {
  enabled: boolean;
  /** 未配置时为 undefined：由 controller 决定 dock 语义（bottom-left 不消费坐标）。 */
  position?: { x: number; y: number };
} {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      defaultOpen: false,
      defaultTab: 'timeline',
      dock: 'bottom-left',
    };
  }

  const raw = window.__NOP_DEBUGGER__;

  if (raw === true) {
    return {
      enabled: true,
      defaultOpen: true,
      defaultTab: 'timeline',
      dock: 'bottom-left',
    };
  }

  if (!raw) {
    return {
      enabled: false,
      defaultOpen: false,
      defaultTab: 'timeline',
      dock: 'bottom-left',
    };
  }

  return {
    enabled: raw.enabled ?? true,
    defaultOpen: raw.defaultOpen ?? true,
    defaultTab: raw.defaultTab ?? 'timeline',
    position: raw.position,
    dock: raw.dock ?? 'bottom-left',
  };
}

export function createSessionId(id: string) {
  return `${id}:${Date.now().toString(36)}`;
}

export function formatErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    const detail = error.stack ?? error.message;
    if (error.cause === undefined) {
      return detail;
    }

    return `${detail}\nCaused by: ${formatErrorDetail(error.cause)}`;
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

export function normalizeErrorForExport(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause:
        error.cause === undefined ? undefined : normalizeErrorForExport(error.cause),
    };
  }

  return error;
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

  return undefined;
}

// [WA-debugger-008] 持久化骨架（readPersisted/writePersisted 单源）。观测策略落字：
// 静默降级为设计——消费面是装饰性偏好（面板位置/开合/最小化/搜索历史），其中
// persistPosition 位于拖拽高频路径，warn/debug 刷屏代价高于收益；降级语境为
// Safari 隐私模式/配额满/SSR（跨信任边界），失败被骨架 catch 统一兜为默认值。
// 空值语义统一裁定：`raw === null || raw === ''` 一律回默认值（八函数曾以 `!raw`
// 与 `raw === null` 两种判空各自漂移，仅覆盖「存储里出现怪值」边界态，
// 'true'/'false'/JSON 正常值不受影响）。
function persistedStorageKey(id: string, key: string) {
  return `nop-debugger:${id}:${key}`;
}

function readPersisted<T>(
  id: string,
  key: string,
  parse: (raw: string) => T,
  fallback: T,
): T {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return fallback;
  }

  try {
    const raw = storage.getItem(persistedStorageKey(id, key));
    if (raw === null || raw === '') {
      return fallback;
    }
    return parse(raw);
  } catch {
    return fallback;
  }
}

function writePersisted(id: string, key: string, serialize: () => string): void {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(persistedStorageKey(id, key), serialize());
  } catch {
    void undefined;
  }
}

export function loadPersistedPosition(id: string): { x: number; y: number } | undefined {
  return readPersisted(id, 'position', (raw) => {
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return { x: parsed.x, y: parsed.y };
    }
    return undefined;
  }, undefined);
}

export function persistPosition(id: string, position: { x: number; y: number }) {
  writePersisted(id, 'position', () => JSON.stringify(position));
}

export function loadPersistedPanelOpen(id: string): boolean | undefined {
  return readPersisted(id, 'panelOpen', (raw) => raw === 'true', undefined);
}

export function persistPanelOpen(id: string, panelOpen: boolean) {
  writePersisted(id, 'panelOpen', () => String(panelOpen));
}

export function persistMinimized(id: string, minimized: boolean) {
  writePersisted(id, 'minimized', () => String(minimized));
}

export function loadPersistedMinimized(id: string): boolean | undefined {
  return readPersisted(id, 'minimized', (raw) => raw === 'true', undefined);
}

export function loadPersistedSearchHistory(id: string): string[] {
  return readPersisted(
    id,
    'search-history',
    (raw) => {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 8)
        : [];
    },
    [],
  );
}

export function persistSearchHistory(id: string, history: readonly string[]) {
  writePersisted(id, 'search-history', () => JSON.stringify(history.slice(0, 8)));
}
