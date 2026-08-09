import { useRendererRuntime } from '@nop-chaos/flux-react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { DashboardDocument } from './dashboard-domain-adapter.js';
import type { DashboardPanelSchema } from '../schemas.js';

/**
 * palette 面板类型清单（design: docs/components/dashboard-editor/design.md）。
 *
 * 以执行时已注册 renderer 为准：仅列已落地类型，未注册类型自动隐藏（pivot-table /
 * stat-tile 等未落地/未注册时回退）。默认四类面板：chart / table / stat-tile / iframe / html / text。
 */
export const DASHBOARD_PALETTE_TYPES: ReadonlyArray<{
  type: string;
  label: string;
  defaultTitle: string;
  defaultW: number;
  defaultH: number;
}> = [
  { type: 'chart', label: 'Chart', defaultTitle: 'Chart', defaultW: 6, defaultH: 4 },
  { type: 'table', label: 'Table', defaultTitle: 'Table', defaultW: 6, defaultH: 4 },
  { type: 'stat-tile', label: 'Stat Tile', defaultTitle: 'KPI', defaultW: 3, defaultH: 2 },
  { type: 'iframe', label: 'Iframe', defaultTitle: 'Iframe', defaultW: 6, defaultH: 4 },
  { type: 'html', label: 'HTML', defaultTitle: 'HTML', defaultW: 6, defaultH: 3 },
  { type: 'text', label: 'Text', defaultTitle: 'Text', defaultW: 4, defaultH: 2 },
];

export interface EditorPaletteProps {
  onAddPanel: (type: string) => void;
}

/** palette 面板（点击即加；HTML5 draggable 拖入画布由画布 drop 消费）。 */
export function EditorPalette({ onAddPanel }: EditorPaletteProps) {
  const runtime = useRendererRuntime();
  const { t } = useFluxTranslation();
  const entries = DASHBOARD_PALETTE_TYPES.filter((entry) => runtime.registry.has(entry.type));

  return (
    <div data-slot="dashboard-editor-palette" className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <p data-slot="dashboard-editor-palette-title" className="text-sm font-medium text-foreground">
        {t('flux.dashboard.editor.panelTypes')}
      </p>
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t('flux.dashboard.editor.noPanelTypes')}
        </p>
      )}
      {entries.map((entry) => (
        <button
          key={entry.type}
          type="button"
          data-testid={`palette-${entry.type}`}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData('application/x-dashboard-panel-type', entry.type);
            event.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onAddPanel(entry.type)}
          className={cn(
            'flex cursor-grab items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground',
            'hover:border-primary/60 hover:bg-accent',
          )}
        >
          <span>{entry.label}</span>
          <span className="text-xs text-muted-foreground">{entry.type}</span>
        </button>
      ))}
    </div>
  );
}

export function buildPalettePanel(
  working: DashboardDocument,
  type: string,
  position: { x: number; y: number },
  fallback: { cols: number },
): DashboardPanelSchema {
  const entry = DASHBOARD_PALETTE_TYPES.find((e) => e.type === type);
  const base = entry ?? { defaultTitle: type, defaultW: 4, defaultH: 2 };
  const taken = new Set(working.panels.map((p) => p.id));
  let index = working.panels.length + 1;
  let id = `panel-${index}`;
  while (taken.has(id)) {
    index += 1;
    id = `panel-${index}`;
  }
  return {
    id,
    type,
    title: base.defaultTitle,
    x: position.x,
    y: position.y,
    w: Math.min(base.defaultW, fallback.cols),
    h: base.defaultH,
  };
}
