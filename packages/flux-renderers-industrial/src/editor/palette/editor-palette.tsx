import { useRef } from 'react';
import { Button } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { listScadaSymbols } from '../../symbols/symbol-registry.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { SymbolThumbnail } from './symbol-thumbnail.js';

interface EditorPalettePanelProps {
  runtime: EditorEngineRuntime;
  onError: (code: string, message: string) => void;
  /** [G5-R3-视角3-01] meta.disabled 门禁：图元库拖入/点击添加通道 inert。 */
  disabled?: boolean;
}

/**
 * 图元库面板（E5.2，design-renderer.md §4.4 + §3 边界）。
 *
 * 消费 runtime `listScadaSymbols()` 只读列出 24 内置图元（type + displayName），
 * **不重复注册图元定义**（复用 runtime 注册表）。拖入放置经 `addSymbol` 句柄写 working copy（E5.2 落地）。
 */
export function EditorPalettePanel(props: EditorPalettePanelProps) {
  // plan 2026-08-08-0900-2 Phase 4 / #20：移除冗余 useMemo（React Compiler 自动 memoize；listScadaSymbols 纯查询）。
  const symbols = listScadaSymbols();
  const idCounter = useRef(0);
  const { t } = useFluxTranslation();

  // plan 2026-08-09-0648-2 Phase 1/2 (D1 方案 B / D5)：palette 可见名称经 i18n 解析。key 由 def.type 派生
  // （industrial.scada.symbol.<type>）。i18next 未命中返回 key 字符串本身（非 falsy）→ 用 `=== key` 显式
  // 未命中检测后回退 def.name（字面英文），不依赖 `||` 短路（短路永不触发，会渲染 raw key）。
  const resolveName = (type: string, fallback: string) => {
    const key = `industrial.scada.symbol.${type}`;
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, type: string) => {
    event.dataTransfer.setData('application/x-scada-symbol-type', type);
    event.dataTransfer.effectAllowed = 'copy';
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
      {symbols.map((def) => {
        const name = resolveName(def.type, def.name);
        return (
          <Button
            key={def.type}
            variant="ghost"
            size="sm"
            className="nop-scada-editor-palette-item justify-start"
            draggable
            onDragStart={(e) => handleDragStart(e, def.type)}
            onClick={() => handleAddDefault(def.type)}
            title={name}
          >
            <SymbolThumbnail type={def.type} category={def.category} />
            {name}
          </Button>
        );
      })}
    </aside>
  );
}
