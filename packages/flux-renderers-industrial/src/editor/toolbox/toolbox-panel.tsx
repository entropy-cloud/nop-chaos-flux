import { useState } from 'react';
import { Button, ButtonGroup, Separator, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { AlignDirection, DistributeDirection } from './align-distribute.js';
import type { ZOrderAction } from './z-order.js';

export interface EditorToolboxPanelProps {
  runtime: EditorEngineRuntime;
  /** 当前选区（reactive，从 canvas state 传入；用于 disabled 判定）。 */
  selection: string[];
  onError: (code: string, message: string) => void;
}

/**
 * 工具箱面板（E9.1，design-toolbox.md §10 + §11）。
 *
 * 五项工具按钮编排（视图/对齐分布/层级/复制粘贴/导入导出/图元库浏览），消费 `@nop-chaos/ui`。
 * - 视图工具复用 runtime 引擎命令面（fit/center/setViewport/zoomAt，runtime 复用点 #1，**不重复实现**）；
 * - 对齐/分布/层级经 symbols 数组/symbols 包围盒算法（编辑器适配层）；
 * - 复制粘贴经编辑器内 clipboard（不接 OS clipboard T2）；
 * - 导入导出复用 serialization 面（exportConfig/importConfig）；导入弹确认对话框（T5）；
 * - 图元库只读浏览（listScadaSymbols，禁止写入 design-toolbox.md §4.5）；
 * - 根容器 marker `nop-scada-editor-toolbox` + `data-slot="scada-editor-toolbox"`；
 * - statusBar 显示当前视口 + 用户可感知边界提示（design-undo-redo.md §4.5）。
 *
 * 工具箱操作不派发 `symbol:*` action（R5 隔离）。
 */
export function EditorToolboxPanel(props: EditorToolboxPanelProps) {
  const { runtime, selection } = props;
  const { t } = useFluxTranslation();
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [clipboardCount, setClipboardCount] = useState<number>(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState<string>('');

  const hasSelection = selection.length > 0;
  const canAlign = selection.length >= 2;
  const canDistribute = selection.length >= 3;
  const canPaste = clipboardCount > 0;

  const flashStatus = (msg: string) => setStatusMessage(msg);

  const handleView = (action: () => boolean | void, label: string) => {
    const result = action();
    if (result === false) {
      flashStatus(t('industrial.scada.editor.toolbox.notVisible'));
    } else {
      const vp = runtime.engine.getViewport();
      flashStatus(`${label}: ${t('industrial.scada.editor.toolbox.viewport')} ${vp.x.toFixed(0)},${vp.y.toFixed(0)} @${vp.scale.toFixed(2)}x`);
    }
  };

  const handleAlign = (direction: AlignDirection) => {
    // disabled-prop 已保证 canAlign；runtime.alignSelection 自守（selection 不足返回 false）。
    const ok = runtime.alignSelection(direction);
    flashStatus(ok ? t('industrial.scada.editor.toolbox.alignDone') : t('industrial.scada.editor.toolbox.noChange'));
  };

  const handleDistribute = (direction: DistributeDirection) => {
    const ok = runtime.distributeSelection(direction);
    flashStatus(ok ? t('industrial.scada.editor.toolbox.distributeDone') : t('industrial.scada.editor.toolbox.noChange'));
  };

  const handleZOrder = (action: ZOrderAction) => {
    const ok = runtime.reorderZOrder(action);
    flashStatus(ok ? t('industrial.scada.editor.toolbox.zOrderDone') : t('industrial.scada.editor.toolbox.noChange'));
  };

  const handleCopy = () => {
    const n = runtime.copySelection();
    setClipboardCount(n);
    flashStatus(`${t('industrial.scada.editor.toolbox.copied')}: ${n}`);
  };

  const handleCut = () => {
    const n = runtime.cutSelection();
    setClipboardCount(n);
    flashStatus(`${t('industrial.scada.editor.toolbox.cut')}: ${n}`);
  };

  const handlePaste = () => {
    const newIds = runtime.paste();
    setClipboardCount(runtime.getClipboard()?.symbols.length ?? 0);
    flashStatus(`${t('industrial.scada.editor.toolbox.pasted')}: ${newIds.length}`);
  };

  const handleExport = () => {
    const serialized = runtime.exportConfig();
    flashStatus(`${t('industrial.scada.editor.toolbox.exported')} (${serialized.length})`);
  };

  const handleImportConfirm = () => {
    const ok = runtime.importConfig(importText);
    setImportOpen(false);
    setImportText('');
    flashStatus(ok ? t('industrial.scada.editor.toolbox.imported') : t('industrial.scada.editor.toolbox.invalidConfig'));
  };

  const handleUndo = () => {
    runtime.undo();
    flashStatus(t('industrial.scada.editor.toolbox.undone'));
  };

  const handleRedo = () => {
    runtime.redo();
    flashStatus(t('industrial.scada.editor.toolbox.redone'));
  };

  const btn = (label: string, onClick: () => void, disabled: boolean, title: string) => (
    <Button variant="ghost" size="sm" disabled={disabled} onClick={onClick} title={title} className="nop-scada-editor-toolbox-btn">
      {label}
    </Button>
  );

  return (
    <div data-slot="scada-editor-toolbox" className={cn('nop-scada-editor-toolbox')}>
      <ButtonGroup>
        {btn('Fit', () => handleView(() => runtime.fitView(), 'Fit'), false, t('industrial.scada.editor.toolbox.fit'))}
        {btn('Center', () => handleView(() => runtime.centerView(), 'Center'), false, t('industrial.scada.editor.toolbox.center'))}
        {btn('1:1', () => handleView(() => runtime.resetView(), '1:1'), false, t('industrial.scada.editor.toolbox.reset'))}
        {btn('+', () => handleView(() => runtime.zoomView(1.2), '+'), false, t('industrial.scada.editor.toolbox.zoomIn'))}
        {btn('−', () => handleView(() => runtime.zoomView(1 / 1.2), '−'), false, t('industrial.scada.editor.toolbox.zoomOut'))}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn('⌅L', () => handleAlign('left'), !canAlign, t('industrial.scada.editor.toolbox.alignLeft'))}
        {btn('⌅R', () => handleAlign('right'), !canAlign, t('industrial.scada.editor.toolbox.alignRight'))}
        {btn('⌅H', () => handleAlign('hcenter'), !canAlign, t('industrial.scada.editor.toolbox.alignHCenter'))}
        {btn('⌅T', () => handleAlign('top'), !canAlign, t('industrial.scada.editor.toolbox.alignTop'))}
        {btn('⌅B', () => handleAlign('bottom'), !canAlign, t('industrial.scada.editor.toolbox.alignBottom'))}
        {btn('⌅V', () => handleAlign('vcenter'), !canAlign, t('industrial.scada.editor.toolbox.alignVCenter'))}
        {btn('↔', () => handleDistribute('horizontal'), !canDistribute, t('industrial.scada.editor.toolbox.distributeH'))}
        {btn('↕', () => handleDistribute('vertical'), !canDistribute, t('industrial.scada.editor.toolbox.distributeV'))}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn('⤒', () => handleZOrder('toTop'), !hasSelection, t('industrial.scada.editor.toolbox.toTop'))}
        {btn('↑', () => handleZOrder('moveUp'), !hasSelection, t('industrial.scada.editor.toolbox.moveUp'))}
        {btn('↓', () => handleZOrder('moveDown'), !hasSelection, t('industrial.scada.editor.toolbox.moveDown'))}
        {btn('⤓', () => handleZOrder('toBottom'), !hasSelection, t('industrial.scada.editor.toolbox.toBottom'))}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn('Copy', handleCopy, !hasSelection, t('industrial.scada.editor.toolbox.copy'))}
        {btn('Cut', handleCut, !hasSelection, t('industrial.scada.editor.toolbox.cut'))}
        {btn('Paste', handlePaste, !canPaste, t('industrial.scada.editor.toolbox.paste'))}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn('Undo', handleUndo, !runtime.session.undoStack.canUndo, t('industrial.scada.editor.toolbox.undo'))}
        {btn('Redo', handleRedo, !runtime.session.undoStack.canRedo, t('industrial.scada.editor.toolbox.redo'))}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn('Export', handleExport, false, t('industrial.scada.editor.toolbox.export'))}
        {btn('Import', () => {
          setImportText('');
          setImportOpen(true);
        }, false, t('industrial.scada.editor.toolbox.import'))}
      </ButtonGroup>
      {statusMessage ? (
        <span className="nop-scada-editor-toolbox-status" data-slot="scada-editor-toolbox-status">
          {statusMessage}
        </span>
      ) : null}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('industrial.scada.editor.toolbox.importConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('industrial.scada.editor.toolbox.importConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="nop-scada-editor-toolbox-import-textarea"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={t('industrial.scada.editor.toolbox.importPlaceholder')}
            data-slot="scada-editor-toolbox-import-textarea"
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)} data-slot="scada-editor-toolbox-cancel">
              {t('industrial.scada.editor.toolbox.cancel')}
            </Button>
            <Button size="sm" onClick={handleImportConfirm} disabled={!importText.trim()} data-slot="scada-editor-toolbox-confirm">
              {t('industrial.scada.editor.toolbox.confirmImport')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
