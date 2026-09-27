/**
 * Inspector schema 生成器（design: docs/components/page-designer/design-architecture.md §8）。
 *
 * inspector body = 生成的 flux form `SchemaInput`——输入 `resolveRendererAuthoringContract`
 * 的 `ResolvedAuthoringContract`，输出标准 form schema，交 form runtime 渲染；
 * **不发明第二套面板 DSL**（report-designer inspector-design.md 立约的直接复用）。
 *
 * - **editorType→控件映射**（S1 §8.1 内置缺省表，host 经 `controlAdapters` 覆盖）：
 *   `select`/`switch`/`input`/`textarea`/`input-number`/`json` 直映 flux form 同名控件
 *   （具名控件别名归 renderers 消费层）；`expression` 值 prop S2 降级为原样文本框
 *   （不解析、不失真；S3 经 `controlAdapters` 换 formula 编辑器，主干不动）。
 *   `editorType` 缺失（或非内置值）时按 `FluxValueShape.kind` 推导兜底：
 *   `union`（anyOf 全 literal）→`select`（选项即字面量集）、`boolean`→`switch`、
 *   `number`→`input-number`、`string`→`input`、`object`/`array`/`record`→`json`、其余→只读展示。
 * - **混合 union**（如 `number | 'sm' | 'md'`）：select 附自由输入降级为 `input` +
 *   shape 校验提示（description 追加），不静默截断选项。
 * - **region/event 分流**：`options.fieldRules`（来自 `definition.fields`）中
 *   `kind: 'region'` 键从属性面板剔除（region 属结构树子树编辑）；`kind: 'event' | 'reaction'`
 *   键与 `contract.events` 一并路由到事件面板位（form 根 `xui:events` 只读清单，
 *   S2 只读 + S3 可视化编排）——propContracts 纪律在生成器侧强制执行，零泄漏。
 * - **无 propContracts 的 renderer**：面板降级为「只读属性清单 + 原始 JSON 直编」
 *   （`xui:raw` 字段）——不是空白面板，也不假装可结构化编辑。
 *
 * 生成产物是瞬态 form schema（永不写回文档），`xui:inspector*` 标记键仅供
 * renderers 消费层替换自定义控件，不触 INV-B。
 */

import type {
  FluxLiteralShape,
  FluxUnionShape,
  FluxValueShape,
  ResolvedAuthoringContract,
  SchemaFieldRule,
} from '@nop-chaos/flux-core';
import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';

/**
 * 自定义控件适配位（S3 formula 编辑器挂点，S1 §8.1/§11.2）。
 * 返回形状对齐 report-designer `ExpressionEditorAdapter`；本包零 React，
 * 返回 `ReactNode` 的收窄由 page-designer-renderers 承载。
 */
export interface InspectorControlAdapter {
  renderCell(input: { value: unknown; onChange(next: unknown): void }): unknown;
}

export interface InspectorBuildOptions {
  /** editorType 覆盖位：键为 `editorType` 字符串（如 `'expression'`）。 */
  controlAdapters?: Readonly<Record<string, InspectorControlAdapter>>;
  /**
   * `definition.fields` 规则（region/event 分流信息载体，S1 §8.1）。
   * host（session 消费层）持有 definition，经此传入。
   */
  fieldRules?: readonly SchemaFieldRule[];
}

/** form 根事件面板位（只读清单）。 */
export const INSPECTOR_EVENTS_KEY = 'xui:events';
/** 字段级 editorType 标记（瞬态，供 renderers 消费层）。 */
export const INSPECTOR_EDITOR_TYPE_KEY = 'xui:inspectorEditorType';
/** 字段级自定义控件适配标记（`controlAdapters` 命中时写入）。 */
export const INSPECTOR_ADAPTER_KEY = 'xui:inspectorAdapter';
/** 字段级只读展示标记。 */
export const INSPECTOR_READONLY_KEY = 'xui:inspectorReadOnly';
/** 无 propContracts 降级态的原始 JSON 直编字段名。 */
export const INSPECTOR_RAW_JSON_FIELD = 'xui:raw';

/** S1 §8.1 内置 editorType 直映表（`expression` = S2 原样文本降级）。 */
const BUILTIN_EDITOR_TYPE_CONTROLS: Readonly<Record<string, string>> = {
  select: 'select',
  switch: 'switch',
  input: 'input',
  textarea: 'textarea',
  'input-number': 'input-number',
  json: 'json',
  expression: 'input',
};

interface ControlChoice {
  control: string;
  editorType: string;
  readOnly: boolean;
  options?: { label: string; value: unknown }[];
  shapeHint?: string;
}

function shapeToHint(shape: FluxValueShape): string {
  switch (shape.kind) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'literal':
      return JSON.stringify((shape as FluxLiteralShape).value);
    case 'union':
      return (shape as FluxUnionShape).anyOf.map(shapeToHint).join(' | ');
    default:
      return shape.kind;
  }
}

function isAllLiteralUnion(shape: FluxUnionShape): boolean {
  return shape.anyOf.length > 0 && shape.anyOf.every((item) => item.kind === 'literal');
}

/** editorType 缺失/非内置值时的 shape 推导兜底（S1 §8.1）。 */
export function deriveControlFromShape(shape: FluxValueShape): ControlChoice {
  switch (shape.kind) {
    case 'union': {
      if (isAllLiteralUnion(shape)) {
        return {
          control: 'select',
          editorType: `shape:${shape.kind}`,
          readOnly: false,
          options: shape.anyOf.map((item) => ({
            label: String((item as FluxLiteralShape).value),
            value: (item as FluxLiteralShape).value,
          })),
        };
      }
      return {
        control: 'input',
        editorType: `shape:${shape.kind}`,
        readOnly: false,
        shapeHint: shapeToHint(shape),
      };
    }
    case 'boolean':
      return { control: 'switch', editorType: `shape:${shape.kind}`, readOnly: false };
    case 'number':
      return { control: 'input-number', editorType: `shape:${shape.kind}`, readOnly: false };
    case 'string':
      return { control: 'input', editorType: `shape:${shape.kind}`, readOnly: false };
    case 'object':
    case 'array':
    case 'record':
      return { control: 'json', editorType: `shape:${shape.kind}`, readOnly: false };
    default:
      // literal / null / unknown / schema-definition → 只读展示（S1 §8.1「其余→只读展示」）。
      return { control: 'json', editorType: `shape:${shape.kind}`, readOnly: true };
  }
}

function resolveControl(
  editorType: string | undefined,
  shape: FluxValueShape,
  options: InspectorBuildOptions,
): ControlChoice {
  if (editorType !== undefined && options.controlAdapters?.[editorType]) {
    const builtin = BUILTIN_EDITOR_TYPE_CONTROLS[editorType];
    const base: ControlChoice = builtin
      ? { control: builtin, editorType, readOnly: false }
      : deriveControlFromShape(shape);
    return { ...withSelectOptions(base, shape), editorType, readOnly: false };
  }
  if (editorType !== undefined && BUILTIN_EDITOR_TYPE_CONTROLS[editorType]) {
    return withSelectOptions({ control: BUILTIN_EDITOR_TYPE_CONTROLS[editorType], editorType, readOnly: false }, shape);
  }
  return deriveControlFromShape(shape);
}

/** select 控件附字面量选项（anyOf 全 literal 时，选项即字面量集——与 union 模式互为镜像）。 */
function withSelectOptions(choice: ControlChoice, shape: FluxValueShape): ControlChoice {
  if (choice.control !== 'select' || shape.kind !== 'union' || !isAllLiteralUnion(shape)) {
    return choice;
  }
  return {
    ...choice,
    options: shape.anyOf.map((item) => ({
      label: String((item as FluxLiteralShape).value),
      value: (item as FluxLiteralShape).value,
    })),
  };
}

/** region/event 分流键集（S1 §8.1：region 剔除，event/reaction 路由事件面板位）。 */
export function resolveInspectorRoutedKeys(options: InspectorBuildOptions): {
  regionKeys: Set<string>;
  eventKeys: Set<string>;
} {
  const regionKeys = new Set<string>();
  const eventKeys = new Set<string>();
  for (const rule of options.fieldRules ?? []) {
    const key = rule.regionKey ?? rule.key;
    if (!key) continue;
    if (rule.kind === 'region') regionKeys.add(key);
    if (rule.kind === 'event' || rule.kind === 'reaction') eventKeys.add(key);
  }
  return { regionKeys, eventKeys };
}

function buildPropField(key: string, prop: ResolvedAuthoringContract['editableProps'][string], options: InspectorBuildOptions): BaseSchema {
  const choice = resolveControl(prop.editorType, prop.shape, options);
  const field: Record<string, unknown> = {
    type: choice.control,
    name: key,
    label: prop.displayName,
    [INSPECTOR_EDITOR_TYPE_KEY]: choice.editorType,
  };
  const descriptionParts: string[] = [];
  if (prop.description) descriptionParts.push(prop.description);
  if (choice.shapeHint) descriptionParts.push(`shape: ${choice.shapeHint}`);
  if (descriptionParts.length > 0) field.description = descriptionParts.join(' — ');
  if (prop.required) field.required = true;
  if (prop.defaultValue !== undefined) field.value = prop.defaultValue;
  if (choice.options) field.options = choice.options;
  if (choice.readOnly) field[INSPECTOR_READONLY_KEY] = true;
  if (prop.editorType !== undefined && options.controlAdapters?.[prop.editorType]) {
    field[INSPECTOR_ADAPTER_KEY] = prop.editorType;
  }
  return field as BaseSchema;
}

/**
 * `buildInspectorSchema`（S1 §8.1）：`ResolvedAuthoringContract` → flux form schema。
 *
 * 生成的 body 字段名集 = `editableProps` 键集 − region/event 分流键
 * （合规 definition：propContracts 不含 region/event 键 → 全覆盖、零幻影，QA.6 验收载体）。
 */
export function buildInspectorSchema(
  contract: ResolvedAuthoringContract,
  options: InspectorBuildOptions = {},
): SchemaInput {
  const propKeys = Object.keys(contract.editableProps);
  const { regionKeys, eventKeys } = resolveInspectorRoutedKeys(options);

  const body: BaseSchema[] = [];
  if (propKeys.length === 0) {
    // 无 propContracts：降级为原始 JSON 直编（S1 §8.1「只读属性清单 + 原始 JSON 直编」；
    // 无契约键可列，面板即原始 JSON 编辑位，不假装可结构化编辑）。
    body.push({ type: 'json', name: INSPECTOR_RAW_JSON_FIELD, label: 'Raw JSON' } as BaseSchema);
  } else {
    for (const key of propKeys) {
      if (regionKeys.has(key) || eventKeys.has(key)) continue;
      body.push(buildPropField(key, contract.editableProps[key], options));
    }
  }

  const eventNames = new Set<string>([...Object.keys(contract.events), ...eventKeys]);
  const form: Record<string, unknown> = { type: 'form', body };
  if (eventNames.size > 0) {
    form[INSPECTOR_EVENTS_KEY] = [...eventNames].map((name) => {
      const event = contract.events[name];
      return {
        name,
        displayName: event?.displayName ?? name,
        ...(event?.description ? { description: event.description } : {}),
      };
    });
  }
  return form as SchemaInput;
}
