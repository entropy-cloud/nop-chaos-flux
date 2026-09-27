/**
 * Inspector 字段模型（S1 §8）：`buildInspectorSchema` 生成物 → 面板可渲染字段集。
 *
 * 生成的 form schema 是唯一面板模型（不发明第二套面板 DSL）——本模块只做
 * 「生成 schema → 字段投影」的翻译，控件语义（`xui:inspectorEditorType` /
 * `xui:inspectorReadOnly` / options）全部来自生成器，region/event 分流零泄漏
 * 由生成器保证。S1 §8.1「无 propContracts 降级」投影为 `raw` 字段。
 */

import { isSchema } from '@nop-chaos/flux-core';
import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import {
  INSPECTOR_ADAPTER_KEY,
  INSPECTOR_EVENTS_KEY,
  INSPECTOR_RAW_JSON_FIELD,
  INSPECTOR_READONLY_KEY,
  SESSION_ID_KEY,
} from '@nop-chaos/page-designer-core';

export interface InspectorEventInfo {
  name: string;
  displayName: string;
}

export interface InspectorFieldModel {
  name: string;
  label: string;
  control: string;
  value: unknown;
  options?: { label: string; value: unknown }[];
  required: boolean;
  readOnly: boolean;
  /** 命中的自定义控件适配键（`controlAdapters` 覆盖位，S3-3 formula 编辑器）。 */
  adapter?: string;
  description?: string;
}

export interface InspectorPanelModel {
  /** `false` = 未选中节点。 */
  hasTarget: boolean;
  /** `false` = 选中节点 renderer 无 propContracts（S1 §8.1 降级：原始 JSON 直编）。 */
  hasContract: boolean;
  fields: InspectorFieldModel[];
  events: InspectorEventInfo[];
  /** 选中节点投影（`xui:inspector*` 瞬态键之外的原样节点）。 */
  nodeId: SessionNodeId | null;
  rendererType: string | null;
}

export interface InspectorNodeInput {
  nodeId: SessionNodeId;
  node: BaseSchema;
  schema: SchemaInput;
}

function toFieldModel(field: BaseSchema): InspectorFieldModel | null {
  if (!isSchema(field)) return null;
  const record = field as unknown as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name : '';
  if (!name) return null;
  if (name === INSPECTOR_RAW_JSON_FIELD) return null;
  const rawOptions = Array.isArray(record.options) ? record.options : undefined;
  const options = rawOptions
    ?.filter(
      (option): option is Record<string, unknown> =>
        typeof option === 'object' && option !== null && 'label' in option && 'value' in option,
    )
    .map((option) => ({
      label: String(option.label),
      value: option.value,
    }));
  return {
    name,
    label: typeof record.label === 'string' ? record.label : name,
    control: typeof record.type === 'string' ? record.type : 'input',
    value: record.value,
    ...(options ? { options } : {}),
    required: record.required === true,
    readOnly: record[INSPECTOR_READONLY_KEY] === true,
    ...(typeof record[INSPECTOR_ADAPTER_KEY] === 'string'
      ? { adapter: record[INSPECTOR_ADAPTER_KEY] as string }
      : {}),
    ...(typeof record.description === 'string' ? { description: record.description } : {}),
  };
}

/** 生成 schema + 选中节点 → 面板字段模型（字段初值取节点现值，缺省回退 defaultValue）。 */
export function buildInspectorPanelModel(input: InspectorNodeInput | null): InspectorPanelModel {
  if (!input) {
    return { hasTarget: false, hasContract: false, fields: [], events: [], nodeId: null, rendererType: null };
  }
  const { nodeId, node, schema } = input;
  const form = isSchema(schema) ? (schema as unknown as Record<string, unknown>) : {};
  const body = Array.isArray(form.body) ? form.body : [];
  const rawField = body.some(
    (field) => isSchema(field) && (field as unknown as Record<string, unknown>).name === INSPECTOR_RAW_JSON_FIELD,
  );

  const nodeRecord = node as unknown as Record<string, unknown>;
  const fields: InspectorFieldModel[] = [];
  if (!rawField) {
    for (const field of body) {
      const model = toFieldModel(field);
      if (!model) continue;
      fields.push({ ...model, value: nodeRecord[model.name] !== undefined ? nodeRecord[model.name] : model.value });
    }
  }

  const rawEvents = Array.isArray(form[INSPECTOR_EVENTS_KEY]) ? form[INSPECTOR_EVENTS_KEY] : [];
  const events: InspectorEventInfo[] = rawEvents
    .filter(
      (event): event is Record<string, unknown> =>
        typeof event === 'object' && event !== null && typeof (event as Record<string, unknown>).name === 'string',
    )
    .map((event) => ({
      name: String(event.name),
      displayName: typeof event.displayName === 'string' ? event.displayName : String(event.name),
    }));

  return {
    hasTarget: true,
    hasContract: !rawField,
    fields,
    events,
    nodeId,
    rendererType: typeof nodeRecord.type === 'string' ? nodeRecord.type : null,
  };
}

/** 原始 JSON 直编初值（降级态）：剥离 sid 后的节点投影。 */
export function buildRawJsonText(node: BaseSchema): string {
  const record = { ...(node as unknown as Record<string, unknown>) };
  delete record[SESSION_ID_KEY];
  return JSON.stringify(record, null, 2);
}
