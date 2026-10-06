import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { Button, Input } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { listScadaSymbols } from '../../symbols/symbol-registry.js';
import type { ScadaSymbolDefinition } from '../../symbols/symbol-types.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { SymbolThumbnail } from './symbol-thumbnail.js';
import { groupScadaPaletteSymbols } from './palette-filter.js';
import { setScadaPaletteDragGhost } from './palette-drag-ghost.js';

interface EditorPalettePanelProps {
  runtime: EditorEngineRuntime;
  onError: (code: string, message: string) => void;
  /** [G5-R3-视角3-01] meta.disabled 门禁：图元库拖入/点击添加通道 inert。 */
  disabled?: boolean;
}

/**
 * 图元库面板（E5.2，design-renderer.md §4.4 + §3 边界；plan 531 S2 检索/分组/ghost 升级）。
 *
 * 消费 runtime `listScadaSymbols()` 只读列出 24 内置图元，**不重复注册图元定义**（复用 runtime 注册表）。
 * 检索（纯函数 palette-filter）+ 分类分组折叠（category 五组 + other 兜底）+ 拖入 ghost（527 模式）。
 * 拖入放置经 `addSymbol` 句柄写 working copy（E5.2 落地）。
 */
export function EditorPalettePanel(props: EditorPalettePanelProps) {
  // plan 2026-08-08-0900-2 Phase 4 / #20：移除冗余 useMemo（React Compiler 自动 memoize；listScadaSymbols 纯查询）。
  const symbols = listScadaSymbols();
  const idCounter = useRef(0);
  const { t } = useFluxTranslation();
  const [query, setQuery] = useState('');
  // 折叠态本地 useState（会话内有效，不持久化——面板宽度/折叠持久化归 S3 WorkbenchShell 裁决口径）。
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // plan 2026-08-09-0648-2 Phase 1/2 (D1 方案 B / D5)：palette 可见名称经 i18n 解析。key 由 def.type 派生
  // （industrial.scada.symbol.<type>）。i18next 未命中返回 key 字符串本身（非 falsy）→ 用 `=== key` 显式
  // 未命中检测后回退 def.name（字面英文），不依赖 `||` 短路（短路永不触发，会渲染 raw key）。
  const resolveName = (type: string, fallback: string) => {
    const key = `industrial.scada.symbol.${type}`;
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };

  // 分类键字面量映射（i18n 门禁静态扫描要求可解析键，不走模板字面量）。
  const CATEGORY_LABEL_KEYS: Record<string, string> = {
    shape: 'industrial.scada.category.shape',
    device: 'industrial.scada.category.device',
    instrument: 'industrial.scada.category.instrument',
    'sensor-control': 'industrial.scada.category.sensor-control',
    pipe: 'industrial.scada.category.pipe',
    other: 'industrial.scada.category.other',
  };
  const resolveCategoryLabel = (category: string) => t(CATEGORY_LABEL_KEYS[category] ?? CATEGORY_LABEL_KEYS.other);

  const groups = groupScadaPaletteSymbols(symbols, (def: ScadaSymbolDefinition) => resolveName(def.type, def.name), query);

  const toggleGroup = (category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, type: string, name: string) => {
    event.dataTransfer.setData('application/x-scada-symbol-type', type);
    event.dataTransfer.effectAllowed = 'copy';
    setScadaPaletteDragGhost(event, name);
  };

  const handleAddDefault = (type: string) => {
    idCounter.current += 1;
    const id = `${type}-${idCounter.current}`;
    // [G5-R4-视角11-01] 点击路径无指针落点（拖拽路径已在 canvas 用 getWorldPoint 落在指针处），
    // 连续点击按 16px 步级联落点（8 步一循环），不再全部堆叠在 (50,50) 产生完全重叠的图元栈。
    const cascadeStep = (idCounter.current - 1) % 8;
    props.runtime.addWorkingSymbol({
      id,
      type,
      x: 50 + cascadeStep * 16,
      y: 50 + cascadeStep * 16,
      width: 100,
      height: 100,
    });
  };

  return (
    <aside
      data-slot="scada-editor-palette"
      className="nop-scada-editor-palette"
      inert={props.disabled || undefined}
      aria-disabled={props.disabled || undefined}
      data-disabled={props.disabled ? 'true' : undefined}
    >
      <div className="relative">
        <Input
          value={query}
          placeholder={t('industrial.scada.editor.palette.filterPlaceholder')}
          data-testid="scada-editor-palette-filter"
          aria-label={t('industrial.scada.editor.palette.filterPlaceholder')}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query !== '' ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            aria-label={t('industrial.scada.editor.palette.filterClear')}
            data-testid="scada-editor-palette-filter-clear"
            onClick={() => setQuery('')}
          >
            <X />
          </Button>
        ) : null}
      </div>
      {groups.length === 0 ? (
        <p data-testid="scada-editor-palette-empty" className="nop-scada-editor-palette-empty">
          {t('industrial.scada.editor.palette.filterEmpty')}
        </p>
      ) : (
        groups.map(({ category, symbols: groupSymbols }) => {
          const isCollapsed = collapsed.has(category);
          return (
            <section key={category} data-palette-group={category}>
              <button
                type="button"
                className="nop-scada-editor-palette-group-toggle flex w-full items-center gap-1"
                aria-expanded={!isCollapsed}
                data-testid={`scada-editor-palette-group-${category}`}
                onClick={() => toggleGroup(category)}
              >
                {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                <span className="nop-scada-editor-group-label">{resolveCategoryLabel(category)}</span>
              </button>
              {isCollapsed
                ? null
                : groupSymbols.map((def) => {
                    const name = resolveName(def.type, def.name);
                    return (
                      <Button
                        key={def.type}
                        variant="ghost"
                        size="sm"
                        className="nop-scada-editor-palette-item justify-start"
                        draggable
                        data-palette-item={def.type}
                        onDragStart={(e) => handleDragStart(e, def.type, name)}
                        onClick={() => handleAddDefault(def.type)}
                        title={`${name} · ${resolveCategoryLabel(def.category ?? 'other')}`}
                      >
                        <SymbolThumbnail type={def.type} category={def.category} />
                        {name}
                      </Button>
                    );
                  })}
            </section>
          );
        })
      )}
    </aside>
  );
}
