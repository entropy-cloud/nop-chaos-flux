import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Input, Label } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { errorMessage } from '../../renderer/scada-errors.js';
import { collectAllSymbols } from '../editor-working-helpers.js';
import {
  collectTemplateSource,
  createTemplate,
  instantiateTemplateNodes,
  type ScadaTemplate,
  type ScadaTemplateStorage,
} from './template-model.js';

export interface EditorTemplateDialogProps {
  runtime: EditorEngineRuntime;
  /** 宿主注入的模板存储回调（design-template-station.md §5）；未注入时弹层显示未接入提示。 */
  storage?: ScadaTemplateStorage;
  /** 当前选区（保存模板的数据源）。 */
  selection: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  /** storage 回调失败上报（code='storage-error'，经 scadaEditorErrorI18nKey i18n）。 */
  onError?: (code: string, message: string) => void;
}

/**
 * 模板库弹层（plan 522 / L5.4，design-template-station.md §4.1）。
 *
 * 保存选区子树为模板（collectTemplateSource deep clone）→ 列表 → 实例化插入
 * （instantiateTemplateNodes 复用 clipboard 管线：deep clone + id 碰撞自增 + connection 重写）→
 * 逐个 runtime.addWorkingSymbol 写回 working copy（入 undo 栈）。存储经宿主注入的
 * `ScadaTemplateStorage` 回调；未注入时 UI 壳仍可用（显式未接入提示）。
 */
export function EditorTemplateDialog(props: EditorTemplateDialogProps) {
  const { runtime, storage, selection, open, onOpenChange } = props;
  const { t } = useFluxTranslation();
  const [templates, setTemplates] = useState<ScadaTemplate[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  // null = 首渲染未决——open=true 挂载同样触发一次 refresh（弹层可在 open 态直接挂载，plan 522 测试发现）。
  const [prevOpen, setPrevOpen] = useState<boolean | null>(null);

  function refresh(): Promise<void> {
    if (!storage) {
      setTemplates([]);
      setLoadedOnce(true);
      return Promise.resolve();
    }
    return storage
      .listTemplates()
      .then((list) => {
        setTemplates(list);
        setLoadedOnce(true);
      })
      .catch((error: unknown) => {
        setLoadedOnce(true);
        props.onError?.('storage-error', errorMessage(error));
      });
  }

  const canSave = !!storage && selection.length > 0 && name.trim() !== '';

  const handleSave = () => {
    if (!storage || !canSave) return;
    const symbols = collectTemplateSource(runtime.session.workingConfig.symbols, selection);
    if (symbols.length === 0) {
      setStatus(t('industrial.scada.editor.template.noSelection'));
      return;
    }
    const template: ScadaTemplate = createTemplate(name.trim(), symbols);
    storage
      .saveTemplate(template)
      .then(() => refresh())
      .then(() => {
        setName('');
        setStatus(t('industrial.scada.editor.template.saved'));
      })
      .catch((error: unknown) => props.onError?.('storage-error', errorMessage(error)));
  };

  const handleInsert = (template: ScadaTemplate) => {
    const existingIds = collectAllSymbols(runtime.session.workingConfig.symbols).map((s) => s.id);
    const { nodes, newIds } = instantiateTemplateNodes(template.symbols, existingIds, 0);
    for (const node of nodes) runtime.addWorkingSymbol(node);
    setStatus(`${t('industrial.scada.editor.template.inserted')}: ${newIds.length}`);
  };

  const handleDelete = (template: ScadaTemplate) => {
    if (!storage) return;
    storage
      .deleteTemplate(template.id)
      .then(() => refresh())
      .catch((error: unknown) => props.onError?.('storage-error', errorMessage(error)));
  };

  // open 翻转 → 重置 draft + 拉取存储（置于全部声明之后，防 react-compiler 转换下 TDZ；同 station-dialog）。
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName('');
      setStatus('');
      void refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="nop-scada-editor-toolbox-template" data-slot="scada-editor-toolbox-template">
        <DialogHeader>
          <DialogTitle>{t('industrial.scada.editor.template.title')}</DialogTitle>
          <DialogDescription>{t('industrial.scada.editor.template.description')}</DialogDescription>
        </DialogHeader>
        {!storage ? (
          <div className="text-xs opacity-60 py-2" data-testid="toolbox-template-unwired">
            {t('industrial.scada.editor.template.unwired')}
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs" htmlFor="toolbox-template-name">
                  {t('industrial.scada.editor.template.name')}
                </Label>
                <Input
                  id="toolbox-template-name"
                  className="text-xs"
                  value={name}
                  disabled={props.disabled}
                  placeholder={t('industrial.scada.editor.template.namePlaceholder')}
                  data-testid="toolbox-template-name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                className="text-xs"
                disabled={props.disabled || !canSave}
                data-testid="toolbox-template-save"
                onClick={handleSave}
              >
                {t('industrial.scada.editor.template.save')}
              </Button>
              {selection.length === 0 ? (
                <span className="text-xs opacity-60">{t('industrial.scada.editor.template.noSelection')}</span>
              ) : null}
            </div>
            {!loadedOnce ? null : templates.length === 0 ? (
              <div className="text-xs opacity-60 py-2" data-testid="toolbox-template-empty">
                {t('industrial.scada.editor.template.empty')}
              </div>
            ) : (
              <ul className="flex flex-col gap-1 max-h-72 overflow-auto m-0 p-0 list-none">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex items-center gap-2 text-xs py-1"
                    data-slot="scada-editor-template-row"
                    data-testid="toolbox-template-row"
                  >
                    <span className="font-mono opacity-80">{template.name}</span>
                    <span className="opacity-50">
                      {t('industrial.scada.editor.template.symbolCount', { count: template.symbols.length })}
                    </span>
                    <span className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={props.disabled}
                      data-testid="toolbox-template-insert"
                      onClick={() => handleInsert(template)}
                    >
                      {t('industrial.scada.editor.template.insert')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={props.disabled}
                      data-testid="toolbox-template-delete"
                      onClick={() => handleDelete(template)}
                    >
                      {t('industrial.scada.editor.template.delete')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <div className="flex items-center justify-between">
          <span className="nop-scada-editor-toolbox-status" data-testid="toolbox-template-status" role="status">
            {status}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-testid="toolbox-template-close">
            {t('industrial.scada.editor.template.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
