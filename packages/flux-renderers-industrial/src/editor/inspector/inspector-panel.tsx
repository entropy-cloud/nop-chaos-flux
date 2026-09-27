import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Badge } from '@nop-chaos/ui';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import { getScadaSymbolDefinition } from '../../symbols/symbol-registry.js';
import { validateScadaConfig } from '../../serialization/validate.js';
import {
  extractPanelFields,
  evaluateVisibleWhen,
  extractJunctionConnections,
  type PanelField,
} from './schema-extractor.js';
import { parseFieldErrors } from './field-errors.js';
import { InspectorField } from './inspector-field.js';

interface EditorInspectorPanelProps {
  runtime: EditorEngineRuntime;
  selectedNodeId: string | undefined;
  onError: (code: string, message: string) => void;
  /** [G5-R3-视角3-01] meta.disabled 门禁：属性面板写入通道 inert。 */
  disabled?: boolean;
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
  // plan 521 / U6：junction 类型注入 connections 只读列表（readConnections 复用；编辑归 U1 弹层）。
  const connectionRows = node
    ? extractJunctionConnections(
        node,
        new Set(collectIds(runtime.session.workingConfig.symbols)),
      )
    : undefined;
  // plan 522 / L5.3：点引用候选集（binding/state 结构化编辑面消费，design-binding-panel.md §2.2）。
  const pointIds = (runtime.session.workingConfig.variables ?? []).map((decl) => decl.id);

  if (node && definition) {
    const handleFieldChange = (field: PanelField, value: unknown) => {
      runtime.updateWorkingNode(selectedNodeId!, { [field.key]: value } as Partial<ScadaSymbolNode>);
    };
    return (
      <aside
        data-slot="scada-editor-inspector"
        className="nop-scada-editor-inspector"
        inert={props.disabled || undefined}
        aria-disabled={props.disabled || undefined}
        data-disabled={props.disabled ? 'true' : undefined}
      >
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
                  pointIds={pointIds}
                  onChange={(value) => handleFieldChange(field, value)}
                />
              ))}
            </div>
          );
        })}
        {connectionRows ? (
          <div>
            <span className="nop-scada-editor-group-label">{t('industrial.scada.editor.connections.title')}</span>
            {connectionRows.length === 0 ? (
              <div className="text-xs opacity-60" data-testid="inspector-connections-empty">
                {t('industrial.scada.editor.connections.empty')}
              </div>
            ) : (
              connectionRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-2 text-xs py-0.5"
                  data-slot="scada-editor-inspector-connection-row"
                  data-dangling={row.dangling ? 'true' : 'false'}
                  data-testid="inspector-connection-row"
                >
                  <span className="font-mono opacity-70">{row.id}</span>
                  <span className="opacity-60">→</span>
                  <span className="font-mono opacity-70">{row.target || '-'}</span>
                  <span className="opacity-50">{row.direction}</span>
                  {row.dangling ? (
                    <Badge variant="destructive" className="text-[10px]">
                      {t('industrial.scada.editor.connections.dangling')}
                    </Badge>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <aside
      data-slot="scada-editor-inspector"
      className="nop-scada-editor-inspector"
      inert={props.disabled || undefined}
      aria-disabled={props.disabled || undefined}
      data-disabled={props.disabled ? 'true' : undefined}
    >
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

/** 递归收集全部节点 id（含 group 子树；与 listAllConnections dangling 检测同语义，plan 521 / U6）。 */
function collectIds(symbols: ScadaSymbolNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: ScadaSymbolNode[]): void => {
    for (const node of nodes) {
      out.push(node.id);
      if (node.children) walk(node.children);
    }
  };
  walk(symbols);
  return out;
}
