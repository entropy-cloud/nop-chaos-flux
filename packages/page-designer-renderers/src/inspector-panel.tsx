/**
 * Inspector 面板（S1 §8.2/§8.3）。
 *
 * 面板体 = `buildInspectorSchema` 生成 form schema 的字段投影（唯一面板模型）；
 * 回写统一走 `onUpdateProps`（宿主装成 `updateProps` 命令，S1 §8.2「面板不得直改
 * store」）；编辑会话事务收口由宿主承载（S1 §8.3：blur/显式确认 = 1 条 undo 步，
 * 面板以 `onEditSessionCommit` 表达）。opaque-leaf 仅 propContracts 字段可编辑——
 * 由生成器与 definition 契约面天然收敛。
 */

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Label,
  NativeSelect,
  Switch,
  Textarea,
} from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { BaseSchema, RendererDefinition } from '@nop-chaos/flux-core';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import { buildInspectorSchema } from '@nop-chaos/page-designer-core';
import { buildInspectorPanelModel, buildRawJsonText, type InspectorFieldModel } from './inspector-field-model.js';
import type { PageDesignerControlAdapter } from './inspector-adapters.js';
import { ActionsEditorPanel } from './actions-editor.js';
import { DataBindingPanel } from './data-binding-panel.js';

export interface InspectorPanelProps {
  nodeId: SessionNodeId | null;
  node: BaseSchema | null;
  definition: RendererDefinition | undefined;
  /**
   * editorType 覆盖位（S3-3，§8.1/§11.2 控件适配位）：键为 `editorType`
   * 字符串（如 `'expression'`），生成器打 `xui:inspectorAdapter` 标记，
   * 字段渲染层换装自定义控件。
   */
  controlAdapters?: Readonly<Record<string, PageDesignerControlAdapter>>;
  /** 数据源清单（S3-1 数据绑定面板候选，host env 注入面 + 文档扫描）。 */
  dataSourceNames?: readonly string[];
  /**
   * 属性回写（S1 §8.2）。`stage: 'transient'` = 事务内改 working；
   * `'commit'` = 收口编辑会话事务（宿主 endTransaction → 1 条 undo 步）。
   */
  onUpdateProps(props: Record<string, unknown>, stage: 'transient' | 'commit'): void;
  onDelete?(): void;
  onDuplicate?(): void;
}

const COMMIT_ONLY = Object.freeze({}) as Record<string, unknown>;

interface InspectorFieldCallbacks {
  onFieldChange(value: unknown): void;
  /** blur/显式确认：收口编辑会话（S1 §8.3）。 */
  onEditSessionCommit(): void;
}

function parseNumberInput(raw: string): unknown {
  if (raw.trim() === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : raw;
}

function InspectorField(props: {
  field: InspectorFieldModel;
  value: unknown;
  adapters?: Readonly<Record<string, PageDesignerControlAdapter>>;
  callbacks: InspectorFieldCallbacks;
}) {
  const { field, callbacks } = props;
  const fieldId = `page-designer-inspector-${field.name}`;
  const [numberDraft, setNumberDraft] = useState<string | null>(null);
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);

  if (field.readOnly) {
    return (
      <div className="space-y-1" data-inspector-field={field.name} data-inspector-readonly="true">
        <Label htmlFor={fieldId}>{field.label}</Label>
        <Input id={fieldId} value={props.value === undefined || props.value === null ? '' : String(props.value)} readOnly disabled />
      </div>
    );
  }

  // 自定义控件适配位命中（S3-3）：换装 adapter 单元格（value/onChange/onCommit）。
  const adapter = field.adapter ? props.adapters?.[field.adapter] : undefined;
  if (adapter) {
    return (
      <div data-inspector-field={field.name} data-inspector-adapter={field.adapter}>
        {adapter.renderCell({
          value: props.value,
          onChange: callbacks.onFieldChange,
          onCommit: callbacks.onEditSessionCommit,
          fieldId,
          fieldLabel: field.label,
        })}
      </div>
    );
  }

  switch (field.control) {
    case 'switch':
      return (
        <div className="flex items-center justify-between gap-2" data-inspector-field={field.name}>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Switch
            id={fieldId}
            checked={props.value === true}
            onCheckedChange={(checked) => {
              // 即时生效控件：一次变更 = 一次编辑会话收口（S1 §8.3 粒度表）。
              callbacks.onFieldChange(checked === true);
              callbacks.onEditSessionCommit();
            }}
          />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1" data-inspector-field={field.name}>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <NativeSelect
            id={fieldId}
            value={props.value === undefined || props.value === null ? '' : String(props.value)}
            onChange={(event) => {
              const raw = event.target.value;
              const option = field.options?.find((candidate) => String(candidate.value) === raw);
              callbacks.onFieldChange(option ? option.value : raw);
              callbacks.onEditSessionCommit();
            }}
          >
            <option value="">{t('flux.pageDesigner.selectEmptyOption')}</option>
            {(field.options ?? []).map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      );
    case 'input-number':
      return (
        <div className="space-y-1" data-inspector-field={field.name}>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Input
            id={fieldId}
            type="number"
            value={numberDraft ?? (props.value === undefined || props.value === null ? '' : String(props.value))}
            onChange={(event) => {
              setNumberDraft(event.target.value);
              callbacks.onFieldChange(parseNumberInput(event.target.value));
            }}
            onBlur={() => {
              setNumberDraft(null);
              callbacks.onEditSessionCommit();
            }}
          />
        </div>
      );
    case 'textarea':
      return (
        <div className="space-y-1" data-inspector-field={field.name}>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Textarea
            id={fieldId}
            value={props.value === undefined || props.value === null ? '' : String(props.value)}
            onChange={(event) => callbacks.onFieldChange(event.target.value)}
            onBlur={callbacks.onEditSessionCommit}
          />
        </div>
      );
    case 'json':
      return (
        <div className="space-y-1" data-inspector-field={field.name} data-inspector-json="true">
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Textarea
            id={fieldId}
            className="font-mono text-xs"
            value={
              jsonDraft ??
              (props.value === undefined || props.value === null ? '' : JSON.stringify(props.value))
            }
            onChange={(event) => setJsonDraft(event.target.value)}
            onBlur={(event) => {
              setJsonDraft(null);
              try {
                callbacks.onFieldChange(JSON.parse(event.target.value));
              } catch {
                // 非法 JSON：保留 working，收口事务（无变更）。
              }
              callbacks.onEditSessionCommit();
            }}
          />
        </div>
      );
    default:
      return (
        <div className="space-y-1" data-inspector-field={field.name}>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Input
            id={fieldId}
            value={props.value === undefined || props.value === null ? '' : String(props.value)}
            onChange={(event) => callbacks.onFieldChange(event.target.value)}
            onBlur={callbacks.onEditSessionCommit}
          />
        </div>
      );
  }
}

export function InspectorPanel(props: InspectorPanelProps) {
  const { nodeId, node, definition } = props;

  const schema = useMemo(() => {
    if (!node || !definition) return null;
    const contract = resolveRendererAuthoringContract(definition);
    return buildInspectorSchema(contract, { fieldRules: definition.fields, controlAdapters: props.controlAdapters });
  }, [node, definition, props.controlAdapters]);

  const model = useMemo(
    () =>
      node && schema
        ? buildInspectorPanelModel({ nodeId: nodeId ?? '', node, schema })
        : buildInspectorPanelModel(null),
    [node, schema, nodeId],
  );

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [rawText, setRawText] = useState<string | null>(null);
  const [rawError, setRawError] = useState(false);

  // node 身份变化（换选中）即重置草稿（渲染期派生复位，避免跨节点草稿串扰）。
  const draftKey = `${model.nodeId}:${model.rendererType}`;
  const [lastKey, setLastKey] = useState(draftKey);
  if (lastKey !== draftKey) {
    setLastKey(draftKey);
    setDraft({});
    setRawText(null);
    setRawError(false);
  }

  const readValue = (field: InspectorFieldModel): unknown =>
    field.name in draft ? draft[field.name] : field.value;

  const commitRaw = (text: string) => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      setRawError(false);
      props.onUpdateProps(parsed, 'commit');
    } catch {
      setRawError(true);
      props.onUpdateProps(COMMIT_ONLY, 'commit');
    }
  };

  if (!node || !model.hasTarget) {
    return (
      <div
        className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--nop-body-copy,#6b7280)]"
        data-testid="page-designer-inspector-empty"
      >
        {t('flux.pageDesigner.inspectorEmpty')}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-1" data-testid="page-designer-inspector">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline">{model.rendererType}</Badge>
        <div className="flex items-center gap-1">
          {props.onDuplicate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="page-designer-duplicate-node"
              onClick={props.onDuplicate}
            >
              {t('flux.pageDesigner.duplicateNode')}
            </Button>
          ) : null}
          {props.onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="page-designer-delete-node"
              onClick={props.onDelete}
            >
              {t('flux.pageDesigner.deleteNode')}
            </Button>
          ) : null}
        </div>
      </div>

      {!model.hasContract ? (
        <div className="space-y-1" data-testid="page-designer-inspector-raw">
          <Label htmlFor="page-designer-inspector-raw-json">{t('flux.pageDesigner.rawJson')}</Label>
          <Textarea
            id="page-designer-inspector-raw-json"
            className="min-h-40 font-mono text-xs"
            value={rawText ?? buildRawJsonText(node)}
            onChange={(event) => setRawText(event.target.value)}
            onBlur={(event) => commitRaw(event.target.value)}
          />
          {rawError ? (
            <p
              className="text-xs text-[var(--nop-destructive,#ef4444)]"
              data-testid="page-designer-inspector-raw-error"
            >
              {t('flux.pageDesigner.rawJsonInvalid')}
            </p>
          ) : null}
        </div>
      ) : (
        model.fields.map((field) => (
          <div key={field.name}>
            <InspectorField
              field={field}
              value={readValue(field)}
              adapters={props.controlAdapters}
              callbacks={{
                onFieldChange: (value) => {
                  setDraft((prev) => ({ ...prev, [field.name]: value }));
                  props.onUpdateProps({ [field.name]: value }, 'transient');
                },
                onEditSessionCommit: () => props.onUpdateProps(COMMIT_ONLY, 'commit'),
              }}
            />
            {field.description ? (
              <p className="mt-1 text-[11px] text-[var(--nop-body-copy,#6b7280)]">{field.description}</p>
            ) : null}
          </div>
        ))
      )}

      {model.events.length > 0 ? (
        <div className="space-y-1 border-t pt-2" data-testid="page-designer-inspector-events">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--nop-eyebrow,#9ca3af)]">
            {t('flux.pageDesigner.eventsTitle')}
          </h4>
          <ul className="space-y-0.5 text-xs text-[var(--nop-body-copy,#6b7280)]">
            {model.events.map((event) => (
              <li key={event.name}>{event.displayName}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {node ? (
        <>
          <ActionsEditorPanel node={node} onUpdateProps={props.onUpdateProps} />
          <DataBindingPanel
            node={node}
            definition={definition}
            dataSourceNames={props.dataSourceNames ?? []}
            onUpdateProps={props.onUpdateProps}
          />
        </>
      ) : null}
    </div>
  );
}
