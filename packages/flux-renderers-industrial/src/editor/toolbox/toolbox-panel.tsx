import { useState } from 'react';
import { Button, ButtonGroup, Separator, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Textarea } from '@nop-chaos/ui';
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
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState<string>('');

  const hasSelection = selection.length > 0;
  const canAlign = selection.length >= 2;
  const canDistribute = selection.length >= 3;
  // plan 2026-08-08-0900-1 Phase 5 / P2 #21：canPaste 从 canonical clipboard 派生（非 React state mirror）。
  // 此前 clipboardCount state mirror 在外部清空 clipboard（load/undo/test handle）后不同步 → Paste 恒 enabled。
  // 改读 runtime.getClipboard()：parent bumpSessionVersion + 本组件 statusMessage 变更均触发重渲染，保证反应式。
  const canPaste = (runtime.getClipboard()?.symbols.length ?? 0) > 0;

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
    flashStatus(`${t('industrial.scada.editor.toolbox.copied')}: ${n}`);
  };

  const handleCut = () => {
    const n = runtime.cutSelection();
    flashStatus(`${t('industrial.scada.editor.toolbox.cut')}: ${n}`);
  };

  const handlePaste = () => {
    const newIds = runtime.paste();
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

  // plan 2026-08-07-1835-2 Phase 3 / open P1-B：delete/group/ungroup 从默认 UI 按钮可达
  // （此前仅 component:* handle 注册，默认 panel 不接；M2 基础操作不再只靠测试 handle）。
  // disabled prop 已保证非空/足量选区；runtime 方法自守（groupSymbols 空 children / ungroup 非 group 均安全 no-op）。
  // plan 2026-08-08-1931-1 Phase 3 / P2-4：批量单 diff——传完整 selection（数组），runtime 在单次 snapshot/push
  // 内完成 N 元删除/解组，产 1 undo entry（一次 undo 全恢复），而非 N entry。
  const handleDelete = () => {
    runtime.removeWorkingSymbol(selection);
    flashStatus(t('industrial.scada.editor.toolbox.deleted'));
  };

  const handleGroup = () => {
    runtime.groupSymbols(selection);
    flashStatus(t('industrial.scada.editor.toolbox.grouped'));
  };

  const handleUngroup = () => {
    runtime.ungroupSymbols(selection);
    flashStatus(t('industrial.scada.editor.toolbox.ungrouped'));
  };

  // plan 2026-08-09-0648-2 Phase 1/3 (D3/D5)：word 按钮可见 label 经 i18n 解析（`label.*` 短键，与长描述
  // tooltip 键分离）。显式未命中检测（`resolved === key`）后回退原英文短词——i18next 未命中返回 key 串本身
  // （非 falsy），`||` 短路永不触发会渲染 raw key，故必须显式检测。glyph 按钮 + '1:1' (D4) label 为符号，
  // i18n 不适用，保持原符号不变。
  const labelOr = (key: string, fallback: string) => {
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };
  const btn = (
    label: string,
    onClick: () => void,
    disabled: boolean,
    title: string,
    testid: string,
  ) => (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      title={title}
      data-testid={testid}
      className="nop-scada-editor-toolbox-btn"
    >
      {label}
    </Button>
  );

  return (
    <div data-slot="scada-editor-toolbox" className={cn('nop-scada-editor-toolbox')}>
      <ButtonGroup>
        {btn(labelOr('industrial.scada.editor.toolbox.label.delete', 'Del'), handleDelete, !hasSelection, t('industrial.scada.editor.toolbox.delete'), 'toolbox-btn-delete')}
        {btn(labelOr('industrial.scada.editor.toolbox.label.group', 'Group'), handleGroup, selection.length < 2, t('industrial.scada.editor.toolbox.group'), 'toolbox-btn-group')}
        {btn(labelOr('industrial.scada.editor.toolbox.label.ungroup', 'Ungroup'), handleUngroup, !hasSelection, t('industrial.scada.editor.toolbox.ungroup'), 'toolbox-btn-ungroup')}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn(labelOr('industrial.scada.editor.toolbox.label.fit', 'Fit'), () => handleView(() => runtime.fitView(), 'Fit'), false, t('industrial.scada.editor.toolbox.fit'), 'toolbox-btn-fit')}
        {btn(labelOr('industrial.scada.editor.toolbox.label.center', 'Center'), () => handleView(() => runtime.centerView(), 'Center'), false, t('industrial.scada.editor.toolbox.center'), 'toolbox-btn-center')}
        {btn('1:1', () => handleView(() => runtime.resetView(), '1:1'), false, t('industrial.scada.editor.toolbox.reset'), 'toolbox-btn-reset')}
        {btn('+', () => handleView(() => runtime.zoomView(1.2), '+'), false, t('industrial.scada.editor.toolbox.zoomIn'), 'toolbox-btn-zoom-in')}
        {btn('−', () => handleView(() => runtime.zoomView(1 / 1.2), '−'), false, t('industrial.scada.editor.toolbox.zoomOut'), 'toolbox-btn-zoom-out')}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn('⌅L', () => handleAlign('left'), !canAlign, t('industrial.scada.editor.toolbox.alignLeft'), 'toolbox-btn-align-left')}
        {btn('⌅R', () => handleAlign('right'), !canAlign, t('industrial.scada.editor.toolbox.alignRight'), 'toolbox-btn-align-right')}
        {btn('⌅H', () => handleAlign('hcenter'), !canAlign, t('industrial.scada.editor.toolbox.alignHCenter'), 'toolbox-btn-align-hcenter')}
        {btn('⌅T', () => handleAlign('top'), !canAlign, t('industrial.scada.editor.toolbox.alignTop'), 'toolbox-btn-align-top')}
        {btn('⌅B', () => handleAlign('bottom'), !canAlign, t('industrial.scada.editor.toolbox.alignBottom'), 'toolbox-btn-align-bottom')}
        {btn('⌅V', () => handleAlign('vcenter'), !canAlign, t('industrial.scada.editor.toolbox.alignVCenter'), 'toolbox-btn-align-vcenter')}
        {btn('↔', () => handleDistribute('horizontal'), !canDistribute, t('industrial.scada.editor.toolbox.distributeH'), 'toolbox-btn-distribute-h')}
        {btn('↕', () => handleDistribute('vertical'), !canDistribute, t('industrial.scada.editor.toolbox.distributeV'), 'toolbox-btn-distribute-v')}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn('⤒', () => handleZOrder('toTop'), !hasSelection, t('industrial.scada.editor.toolbox.toTop'), 'toolbox-btn-to-top')}
        {btn('↑', () => handleZOrder('moveUp'), !hasSelection, t('industrial.scada.editor.toolbox.moveUp'), 'toolbox-btn-move-up')}
        {btn('↓', () => handleZOrder('moveDown'), !hasSelection, t('industrial.scada.editor.toolbox.moveDown'), 'toolbox-btn-move-down')}
        {btn('⤓', () => handleZOrder('toBottom'), !hasSelection, t('industrial.scada.editor.toolbox.toBottom'), 'toolbox-btn-to-bottom')}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn(labelOr('industrial.scada.editor.toolbox.label.copy', 'Copy'), handleCopy, !hasSelection, t('industrial.scada.editor.toolbox.copy'), 'toolbox-btn-copy')}
        {btn(labelOr('industrial.scada.editor.toolbox.label.cut', 'Cut'), handleCut, !hasSelection, t('industrial.scada.editor.toolbox.cut'), 'toolbox-btn-cut')}
        {btn(labelOr('industrial.scada.editor.toolbox.label.paste', 'Paste'), handlePaste, !canPaste, t('industrial.scada.editor.toolbox.paste'), 'toolbox-btn-paste')}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn(labelOr('industrial.scada.editor.toolbox.label.undo', 'Undo'), handleUndo, !runtime.session.undoStack.canUndo, t('industrial.scada.editor.toolbox.undo'), 'toolbox-btn-undo')}
        {btn(labelOr('industrial.scada.editor.toolbox.label.redo', 'Redo'), handleRedo, !runtime.session.undoStack.canRedo, t('industrial.scada.editor.toolbox.redo'), 'toolbox-btn-redo')}
      </ButtonGroup>
      <Separator orientation="vertical" className="nop-scada-editor-toolbox-sep" />
      <ButtonGroup>
        {btn(labelOr('industrial.scada.editor.toolbox.label.export', 'Export'), handleExport, false, t('industrial.scada.editor.toolbox.export'), 'toolbox-btn-export')}
        {btn(labelOr('industrial.scada.editor.toolbox.label.import', 'Import'), () => {
          setImportText('');
          setImportOpen(true);
        }, false, t('industrial.scada.editor.toolbox.import'), 'toolbox-btn-import')}
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
          <Textarea
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
