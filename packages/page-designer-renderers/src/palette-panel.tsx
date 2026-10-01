/**
 * Palette 面板（S1 §9）：消费 `buildPaletteItems` 输出（registry 驱动，拒绝静态
 * manifest），按 category 分组展示；条目为 HTML5 拖拽源（draggable，dataTransfer
 * 携带 `{ source: 'palette', type }` 载荷，落点经命令通道 insertNode）。
 */

import { useMemo, useState } from 'react';
import { Input } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { PaletteItem } from '@nop-chaos/page-designer-core';
import { PAGE_DESIGNER_DRAG_MIME } from './constants.js';
import type { DesignerDragPayload } from './types.js';

export interface PalettePanelProps {
  items: readonly PaletteItem[];
  /** 点击条目（无拖拽环境的补路）：由宿主落点到当前选中容器/根。 */
  onItemClick(type: string): void;
}

const PALETTE_GROUP_ORDER = ['layout', 'form', 'content', 'actions', 'basic', 'other'];

function groupItems(items: readonly PaletteItem[]): { group: string; items: PaletteItem[] }[] {
  const groups = new Map<string, PaletteItem[]>();
  for (const item of items) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }
  return [...groups.entries()]
    .map(([group, list]) => ({ group, items: list }))
    .sort((left, right) => {
      const leftRank = PALETTE_GROUP_ORDER.indexOf(left.group);
      const rightRank = PALETTE_GROUP_ORDER.indexOf(right.group);
      return (leftRank === -1 ? PALETTE_GROUP_ORDER.length : leftRank) -
        (rightRank === -1 ? PALETTE_GROUP_ORDER.length : rightRank);
    });
}

function PaletteEntry(props: { item: PaletteItem; onClick(): void }) {
  const { item } = props;
  return (
    <button
      type="button"
      draggable
      data-palette-item={item.type}
      data-palette-container={item.isContainer ? 'true' : undefined}
      className="flex w-full cursor-grab items-center gap-2 rounded-md border border-[var(--nop-nav-border,#e5e7eb)] bg-[var(--nop-nav-surface,#fff)] px-3 py-2 text-left text-sm hover:border-[var(--nop-accent,#6366f1)]"
      onDragStart={(event) => {
        const payload: DesignerDragPayload = { source: 'palette', type: item.type };
        event.dataTransfer.setData(PAGE_DESIGNER_DRAG_MIME, JSON.stringify(payload));
        event.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={props.onClick}
    >
      <span className="flex-1 truncate">{item.displayName}</span>
      {item.isContainer ? (
        <span className="shrink-0 whitespace-nowrap rounded-full border border-[color-mix(in_srgb,var(--nop-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--nop-accent)_10%,var(--nop-surface,#fff))] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--nop-text-strong,#1f2937)]">
          {t('flux.pageDesigner.containerBadge')}
        </span>
      ) : null}
    </button>
  );
}

export function PalettePanel(props: PalettePanelProps) {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return props.items;
    return props.items.filter(
      (item) =>
        item.type.toLowerCase().includes(needle) || item.displayName.toLowerCase().includes(needle),
    );
  }, [props.items, filter]);
  const groups = useMemo(() => groupItems(filtered), [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="page-designer-palette">
      <Input
        value={filter}
        placeholder={t('flux.pageDesigner.paletteFilter')}
        data-testid="page-designer-palette-filter"
        onChange={(event) => setFilter(event.target.value)}
      />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <p className="text-sm text-[var(--nop-body-copy,#6b7280)]">{t('flux.pageDesigner.paletteEmpty')}</p>
        ) : (
          groups.map(({ group, items }) => (
            <section key={group} data-palette-group={group}>
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--nop-eyebrow,#9ca3af)]">
                {group}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  <PaletteEntry
                    key={item.type}
                    item={item}
                    onClick={() => props.onItemClick(item.type)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
