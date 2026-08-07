import { useRef } from 'react';
import { Button } from '@nop-chaos/ui';
import { listScadaSymbols } from '../../symbols/symbol-registry.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';

interface EditorPalettePanelProps {
  runtime: EditorEngineRuntime;
  onError: (code: string, message: string) => void;
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

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, type: string) => {
    event.dataTransfer.setData('application/x-scada-symbol-type', type);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleAddDefault = (type: string) => {
    idCounter.current += 1;
    const id = `${type}-${idCounter.current}`;
    props.runtime.addWorkingSymbol({
      id,
      type,
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });
  };

  return (
    <aside data-slot="scada-editor-palette" className="nop-scada-editor-palette">
      {symbols.map((def) => (
        <Button
          key={def.type}
          variant="ghost"
          size="sm"
          className="nop-scada-editor-palette-item justify-start"
          draggable
          onDragStart={(e) => handleDragStart(e, def.type)}
          onClick={() => handleAddDefault(def.type)}
          title={def.type}
        >
          {def.name}
        </Button>
      ))}
    </aside>
  );
}
