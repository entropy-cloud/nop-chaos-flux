import {
  resolvePaletteLabel,
  type DesignerPaletteEntry,
  type ResolvedPaletteItem,
} from '@nop-chaos/flux-react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { ChevronLeft } from 'lucide-react';
import type { DashboardDocument } from './dashboard-domain-adapter.js';
import type { DashboardPanelSchema } from '../schemas.js';

/**
 * palette 面板类型清单（design: docs/components/dashboard-editor/design.md）。
 *
 * 以执行时已注册 renderer 为准：仅列已落地类型，未注册类型自动隐藏（pivot-table /
 * stat-tile 等未落地/未注册时回退）。默认四类面板：chart / table / stat-tile / iframe / html / text。
 */
/**
 * P4.1（plan 555）：palette 声明目录（单一声明源，经共享 builder 生效）。
 * 过滤/label 解析经共享契约 buildDesignerPaletteCatalog/resolvePaletteLabel（flux-react workbench）。
 */
export const DEFAULT_DASHBOARD_PALETTE_CATALOG: DesignerPaletteEntry[] = [
  { type: 'chart', labelKey: 'flux.dashboard.editor.paletteChart', defaultTitle: 'Chart', defaultW: 6, defaultH: 4 },
  { type: 'table', labelKey: 'flux.dashboard.editor.paletteTable', defaultTitle: 'Table', defaultW: 6, defaultH: 4 },
  { type: 'stat-tile', labelKey: 'flux.dashboard.editor.paletteStatTile', defaultTitle: 'KPI', defaultW: 3, defaultH: 2 },
  { type: 'iframe', labelKey: 'flux.dashboard.editor.paletteIframe', defaultTitle: 'Iframe', defaultW: 6, defaultH: 4 },
  { type: 'html', labelKey: 'flux.dashboard.editor.paletteHtml', defaultTitle: 'HTML', defaultW: 6, defaultH: 3 },
  { type: 'text', labelKey: 'flux.dashboard.editor.paletteText', defaultTitle: 'Text', defaultW: 4, defaultH: 2 },
];

export interface EditorPaletteProps {
  /** 生效目录（renderer 经共享 builder 解析后线程化）。 */
  palette: ResolvedPaletteItem[];
  onAddPanel: (type: string) => void;
  /** plan 538：面板头收起 affordance（WorkbenchShell collapsed 契约）；不传零渲染。 */
  onCollapse?: () => void;
  collapseLabel?: string;
}

/** palette 面板（点击即加；HTML5 draggable 拖入画布由画布 drop 消费）。 */
export function EditorPalette({
  palette,
  onAddPanel,
  onCollapse,
  collapseLabel,
}: EditorPaletteProps) {
  const { t } = useFluxTranslation();
  const entries = palette;

  return (
    <div data-slot="dashboard-editor-palette" className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <p data-slot="dashboard-editor-palette-title" className="text-sm font-medium text-foreground">
          {t('flux.dashboard.editor.panelTypes')}
        </p>
        {onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={collapseLabel ?? t('flux.dashboard.editor.collapsePalette')}
            data-testid="collapse-palette"
            onClick={onCollapse}
          >
            <ChevronLeft />
          </Button>
        ) : null}
      </div>
      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t('flux.dashboard.editor.noPanelTypes')}
        </p>
      )}
      {entries.map((entry) => (
        <Button
          key={entry.type}
          type="button"
          variant="outline"
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
          <span>{resolvePaletteLabel(entry, (key) => t(key))}</span>
          <span className="text-xs text-muted-foreground">{entry.type}</span>
        </Button>
      ))}
    </div>
  );
}

export function buildPalettePanel(
  working: DashboardDocument,
  type: string,
  position: { x: number; y: number },
  fallback: { cols: number },
  palette: readonly ResolvedPaletteItem[] = DEFAULT_DASHBOARD_PALETTE_CATALOG,
): DashboardPanelSchema {
  const entry = palette.find((e) => e.type === type);
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
    w: Math.min(base.defaultW ?? 4, fallback.cols),
    h: base.defaultH ?? 2,
  };
}

/**
 * [G3-视角9-01] readable display name for aria-labels: panel title → localized
 * palette type label → internal id (last resort only). Exposes "Chart" /
 * "销售面板" instead of the internal "panel-3" identifier.
 */
export function resolvePanelDisplayName(
  panel: { id: string; type: string; title?: string },
  translate: (key: string) => string,
  palette: readonly ResolvedPaletteItem[] = DEFAULT_DASHBOARD_PALETTE_CATALOG,
): string {
  if (panel.title && panel.title.trim().length > 0) {
    return panel.title.trim();
  }
  const entry = palette.find((e) => e.type === panel.type);
  if (entry) {
    const label = resolvePaletteLabel(entry, translate);
    // 翻译缺失时 translate 回原 labelKey——回退 panel.id（不把 raw key 暴露进 aria-label）。
    if (label && label !== entry.labelKey) {
      return label;
    }
  }
  return panel.id;
}
