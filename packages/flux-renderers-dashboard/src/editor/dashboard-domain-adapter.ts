import type { EditorDomainAdapter } from '@nop-chaos/editor-core';
import type { DashboardPanelSchema } from '../schemas.js';

/**
 * dashboard 编辑会话文档（编辑态 document = 面板列表；布局网格配置经 schema props 传入，
 * 不属会话文档）。
 */
export interface DashboardDocument {
  panels: DashboardPanelSchema[];
}

/**
 * dashboard 布局 diff（forward/inverse 对称契约，design: docs/architecture/editor-core.md §4）。
 *
 * - `patches`：id → 变更字段（仅 changed top-level 字段；数组序不变）。
 * - `added`：新增面板（index = 在 next 中的位置，apply 按 index 插入——逆 diff 可原位移除）。
 * - `removed`：移除面板（含原 index + 原 panel——逆 diff 可原位恢复）。
 *
 * apply 顺序：先按 index 降序移除 → 打补丁 → 按 index 升序插入（clamp 到当前长度）。
 * 由构造保证 `apply(apply(doc, diff(a,b)), diff(b,a))` 精确等于 `a`。
 */
export interface DashboardLayoutDiff {
  patches: Record<string, Partial<DashboardPanelSchema>>;
  added: Array<{ index: number; panel: DashboardPanelSchema }>;
  removed: Array<{ id: string; index: number; panel: DashboardPanelSchema }>;
}

const PANEL_KEYS: ReadonlyArray<keyof DashboardPanelSchema> = [
  'id',
  'type',
  'title',
  'x',
  'y',
  'w',
  'h',
  'props',
  'source',
];

export function emptyDashboardDocument(): DashboardDocument {
  return { panels: [] };
}

export function diffDashboardDocument(
  prev: DashboardDocument,
  next: DashboardDocument,
): DashboardLayoutDiff | null {
  const prevById = new Map(prev.panels.map((p) => [p.id, p]));
  const nextById = new Map(next.panels.map((p) => [p.id, p]));
  const patches: Record<string, Partial<DashboardPanelSchema>> = {};
  const added: Array<{ index: number; panel: DashboardPanelSchema }> = [];
  const removed: Array<{ id: string; index: number; panel: DashboardPanelSchema }> = [];

  for (let i = 0; i < next.panels.length; i += 1) {
    const panel = next.panels[i];
    const old = prevById.get(panel.id);
    if (!old) {
      added.push({ index: i, panel });
      continue;
    }
    const patch: Partial<DashboardPanelSchema> = {};
    for (const key of PANEL_KEYS) {
      if (!Object.is(old[key], panel[key])) {
        patch[key] = panel[key];
      }
    }
    if (Object.keys(patch).length > 0) {
      patches[panel.id] = patch;
    }
  }

  for (let i = 0; i < prev.panels.length; i += 1) {
    const panel = prev.panels[i];
    if (!nextById.has(panel.id)) {
      removed.push({ id: panel.id, index: i, panel });
    }
  }

  if (Object.keys(patches).length === 0 && added.length === 0 && removed.length === 0) {
    return null;
  }
  return { patches, added, removed };
}

export function applyDashboardDiff(
  doc: DashboardDocument,
  diff: DashboardLayoutDiff,
): DashboardDocument {
  const panels = doc.panels.map((p) => ({ ...p }));

  for (const removed of [...diff.removed].sort((a, b) => b.index - a.index)) {
    panels.splice(removed.index, 1);
  }

  const byId = new Map(panels.map((p) => [p.id, p]));
  for (const [id, patch] of Object.entries(diff.patches)) {
    const target = byId.get(id);
    if (!target) continue;
    for (const [key, value] of Object.entries(patch)) {
      (target as Record<string, unknown>)[key] = value;
    }
  }

  for (const added of [...diff.added].sort((a, b) => a.index - b.index)) {
    panels.splice(Math.min(added.index, panels.length), 0, { ...added.panel });
  }

  return { panels };
}

/**
 * dashboard 领域适配器（editor-core `EditorDomainAdapter` 的 dashboard 实现）。
 *
 * `serialize` 输出布局面板 JSON 数组（与运行态 `dashboard` 面板模型同构，保存 → 下游同步）。
 */
export function createDashboardDomainAdapter(): EditorDomainAdapter<
  DashboardDocument,
  DashboardLayoutDiff
> {
  return {
    kind: 'dashboard',
    load: () => emptyDashboardDocument(),
    serialize: (doc) => JSON.stringify(doc.panels),
    validate: (doc) => {
      const problems: string[] = [];
      if (!Array.isArray(doc.panels)) {
        problems.push('layout must contain a panels array');
      } else {
        const ids = new Set<string>();
        for (const panel of doc.panels) {
          if (
            panel === null ||
            typeof panel !== 'object' ||
            typeof panel.id !== 'string' ||
            panel.id.length === 0
          ) {
            problems.push('layout contains a panel without a valid id');
            continue;
          }
          if (ids.has(panel.id)) {
            problems.push(`duplicate panel id "${panel.id}"`);
            continue;
          }
          ids.add(panel.id);
          if (typeof panel.type !== 'string' || panel.type.length === 0) {
            problems.push(`panel "${panel.id}" has no type`);
            continue;
          }
          if (![panel.x, panel.y, panel.w, panel.h].every((v) => typeof v === 'number' && Number.isFinite(v))) {
            problems.push(`panel "${panel.id}" has non-numeric geometry`);
          }
        }
      }
      return problems.length > 0 ? { ok: false, errors: problems } : { ok: true };
    },
    diff: diffDashboardDocument,
    applyDiff: applyDashboardDiff,
    getDocumentIds: (doc) => doc.panels.map((p) => p.id),
  };
}
