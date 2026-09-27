/**
 * JSON 源码视图（S1 §6.2 导入/导出契约）。
 *
 * 导出 = `adapter.serialize` 投影（stripSessionIds 单点剥离，INV-E：导出产物不含
 * `xui:sid`）；导入 = JSON.parse → `importDocument` 命令（validate 拒绝未注册 type
 * = rt-unknown-type 失败路径，错误标注；sid 冲突自动重分配）。1 条 undo 步。
 */

import { useState } from 'react';
import { Button, Textarea } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { DesignerCommandResult } from '@nop-chaos/page-designer-core';

export interface JsonSourceViewProps {
  /** 当前导出投影（host 每次状态变更重算）。 */
  exportedJson: string;
  /** 导入回调（入参为解析后的文档；宿主装 `importDocument` 命令）。 */
  onImport(doc: unknown): DesignerCommandResult;
}

export function JsonSourceView(props: JsonSourceViewProps) {
  const [text, setText] = useState(props.exportedJson);
  const [message, setMessage] = useState<{ level: 'error' | 'ok'; text: string } | null>(null);

  // 导出投影变化（宿主状态变更）→ 渲染期同步重置文本（React 19 派生状态范式）。
  const [lastExported, setLastExported] = useState(props.exportedJson);
  if (lastExported !== props.exportedJson) {
    setLastExported(props.exportedJson);
    setText(props.exportedJson);
  }

  const handleImport = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      setMessage({
        level: 'error',
        text: t('flux.pageDesigner.importInvalidJson', {
          message: error instanceof Error ? error.message : String(error),
        }),
      });
      return;
    }
    const result = props.onImport(parsed);
    if (result.ok) {
      setMessage({ level: 'ok', text: t('flux.pageDesigner.importSuccess') });
    } else if (result.error === 'unknown-type') {
      setMessage({ level: 'error', text: t('flux.pageDesigner.importUnknownType') });
    } else {
      setMessage({ level: 'error', text: t('flux.pageDesigner.importRejected', { reason: result.error ?? '' }) });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="page-designer-source-view">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="page-designer-export-json"
          onClick={() => {
            setText(props.exportedJson);
            setMessage({ level: 'ok', text: t('flux.pageDesigner.exportRefreshed') });
          }}
        >
          {t('flux.pageDesigner.exportJson')}
        </Button>
        <Button type="button" variant="outline" size="sm" data-testid="page-designer-import-json" onClick={handleImport}>
          {t('flux.pageDesigner.importJson')}
        </Button>
      </div>
      {message ? (
        <p
          data-testid="page-designer-source-message"
          data-message-level={message.level}
          className={`text-xs ${message.level === 'error' ? 'text-[var(--nop-destructive,#ef4444)]' : 'text-[var(--nop-accent,#6366f1)]'}`}
        >
          {message.text}
        </p>
      ) : null}
      <Textarea
        className="min-h-0 flex-1 font-mono text-xs"
        data-testid="page-designer-source-textarea"
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
