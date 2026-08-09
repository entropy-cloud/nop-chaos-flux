import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import { getScadaSymbolDefinition } from '../../symbols/symbol-registry.js';
import { validateScadaConfig } from '../../serialization/validate.js';
import { extractPanelFields, evaluateVisibleWhen, type PanelField } from './schema-extractor.js';
import { parseFieldErrors } from './field-errors.js';
import { InspectorField } from './inspector-field.js';

interface EditorInspectorPanelProps {
  runtime: EditorEngineRuntime;
  selectedNodeId: string | undefined;
  onError: (code: string, message: string) => void;
}

/**
 * 属性面板（E5.3，design-property-panel.md §5 + §6）。
 *
 * 消费 runtime.session 选中图元 → extractPanelFields 生成六类分组字段集 →
 * 字段 widget 渲染（复用 @nop-chaos/ui）→ onChange 经 updateSymbol 句柄写 working copy。
 * validate 衔接：字段编辑后调 validateScadaConfig（runtime 单一事实源，不新建第二套规则）。
 */
export function EditorInspectorPanel(props: EditorInspectorPanelProps) {
  const { runtime, selectedNodeId } = props;
  const { t } = useFluxTranslation();

  // 反应式：父 canvas 经 sessionVersion bump 触发重渲染，本组件每次都从最新 runtime.session 重派生。
  // 不使用 useMemo（React Compiler 自动 memoize；且 useMemo deps 需显式纳入 sessionVersion 才能刷新）。
  const node: ScadaSymbolNode | undefined = selectedNodeId
    ? findNode(runtime.session.workingConfig.symbols, selectedNodeId)
    : undefined;
  const definition = node ? getScadaSymbolDefinition(node.type) : undefined;
  const fieldGroups = definition ? extractPanelFields(definition) : [];
  const validation = validateScadaConfig(runtime.session.workingConfig);
  const fieldErrors = validation.ok
    ? {}
    : parseFieldErrors(validation.errors, selectedNodeId, runtime.session.workingConfig);

  if (node && definition) {
    const handleFieldChange = (field: PanelField, value: unknown) => {
      runtime.updateWorkingNode(selectedNodeId!, { [field.key]: value } as Partial<ScadaSymbolNode>);
    };
    return (
      <aside data-slot="scada-editor-inspector" className="nop-scada-editor-inspector">
        <span className="nop-scada-editor-group-label">{t('industrial.scada.editor.inspector.title')}</span>
        <div className="text-xs opacity-60">{t('industrial.scada.editor.inspector.id')}: {node.id}</div>
        <div className="text-xs opacity-60">{t('industrial.scada.editor.inspector.type')}: {node.type}</div>
        {fieldGroups.map((group) => {
          const visibleFields = group.fields.filter((f) => evaluateVisibleWhen(f, node));
          return (
            <div key={group.group}>
              <span className="nop-scada-editor-group-label">{t(group.label)}</span>
              {visibleFields.map((field) => (
                <InspectorField
                  key={field.key}
                  field={field}
                  value={(node as unknown as Record<string, unknown>)[field.key]}
                  error={fieldErrors[field.key]?.[0]}
                  onChange={(value) => handleFieldChange(field, value)}
                />
              ))}
            </div>
          );
        })}
      </aside>
    );
  }

  return (
    <aside data-slot="scada-editor-inspector" className="nop-scada-editor-inspector">
      <span className="nop-scada-editor-group-label">{t('industrial.scada.editor.inspector.title')}</span>
      <div className="text-xs opacity-60">{t('industrial.scada.editor.inspector.noSelection')}</div>
    </aside>
  );
}
function findNode(symbols: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of symbols) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
