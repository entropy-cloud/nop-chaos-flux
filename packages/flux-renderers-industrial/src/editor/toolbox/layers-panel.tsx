import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';

export interface EditorLayersPanelProps {
  runtime: EditorEngineRuntime;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前选区（reactive，从 canvas state 传入；选中行高亮用）。 */
  selection: string[];
}

interface LayerRow {
  node: ScadaSymbolNode;
  depth: number;
  label: string;
}

/**
 * 图层重排树 MVP（plan 521 / U3，design-toolbox.md §13.2）。
 *
 * working copy symbols 递归展开的层级树（group.children 嵌套缩进）；**顶层节点**行内 上移/下移
 * 重排经既有 `reorderZOrder` 命令（先 setSelection 该节点，z 序 = symbols 数组顺序，不调 leafer
 * Editor toTop 防 T3）；点击行 setSelection 选中图元（与画布选区同一 canonical）。
 *
 * **MVP 裁定不做**：嵌套子树重排（z-order 既有约束）、可见性/锁定字段（serialization 扩展，
 * L5.8 观察面）、拖拽重排。
 */
export function EditorLayersPanel(props: EditorLayersPanelProps) {
  const { runtime, open, onOpenChange, selection } = props;
  const { t } = useFluxTranslation();

  if (!open) return null;

  const rows: LayerRow[] = [];
  const walk = (nodes: ScadaSymbolNode[], depth: number) => {
    for (const node of nodes) {
      rows.push({ node, depth, label: symbolLabel(node.type, t) });
      if (node.children) walk(node.children, depth + 1);
    }
  };
  walk(runtime.session.workingConfig.symbols, 0);
  const selectedSet = new Set(selection);
  const writeBlocked = runtime.session.mode === 'preview';

  const moveRow = (node: ScadaSymbolNode, action: 'moveUp' | 'moveDown') => {
    runtime.setSelection([node.id]);
    runtime.reorderZOrder(action);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nop-scada-editor-toolbox-layers" data-slot="scada-editor-toolbox-layers">
        <DialogHeader>
          <DialogTitle>{t('industrial.scada.editor.layers.title')}</DialogTitle>
          <DialogDescription>{t('industrial.scada.editor.layers.description')}</DialogDescription>
        </DialogHeader>
        {rows.length === 0 ? (
          <div className="text-xs opacity-60 py-2" data-testid="toolbox-layers-empty">
            {t('industrial.scada.editor.layers.empty')}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5 max-h-72 overflow-auto m-0 p-0 list-none">
            {/* 数组序 = z 序；界面按数组序展示并标注「上 = 顶层」语义（行序号 = 栈位）。 */}
            {rows.map(({ node, depth, label }) => {
              const topLevel = depth === 0;
              const selected = selectedSet.has(node.id);
              return (
                <li
                  key={`${depth}:${node.id}`}
                  className="nop-scada-editor-layer-row flex items-center gap-1 text-xs py-0.5"
                  data-slot="scada-editor-layer-row"
                  data-layer-depth={depth}
                  data-selected={selected ? 'true' : 'false'}
                  data-testid="toolbox-layer-row"
                  style={{ paddingLeft: `${depth * 16}px` }}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex-1 text-left truncate rounded px-1 py-0.5 cursor-pointer hover:bg-accent',
                      selected && 'bg-accent font-medium',
                    )}
                    onClick={() => runtime.setSelection([node.id])}
                    data-testid="toolbox-layer-row-select"
                  >
                    {label}
                    <span className="opacity-50 font-mono ml-1">{node.id}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!topLevel || writeBlocked}
                    title={t('industrial.scada.editor.toolbox.moveUp')}
                    data-testid="toolbox-layer-move-up"
                    className="h-6 px-1.5"
                    onClick={() => moveRow(node, 'moveUp')}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!topLevel || writeBlocked}
                    title={t('industrial.scada.editor.toolbox.moveDown')}
                    data-testid="toolbox-layer-move-down"
                    className="h-6 px-1.5"
                    onClick={() => moveRow(node, 'moveDown')}
                  >
                    ↓
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] opacity-50">{t('industrial.scada.editor.layers.orderHint')}</span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-testid="toolbox-layers-close">
            {t('industrial.scada.editor.layers.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 图元显示名：`industrial.scada.symbol.<type>` i18n 键（palette 同源），未命中回退原 type。 */
function symbolLabel(type: string, t: (key: string) => string): string {
  const key = `industrial.scada.symbol.${type}`;
  const resolved = t(key);
  return resolved === key ? type : resolved;
}
