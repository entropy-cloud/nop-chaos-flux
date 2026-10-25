import type { SchemaInput } from '@nop-chaos/flux-core';
import type {
  MetadataBag,
  ReportSelectionTargetKind,
} from '@nop-chaos/report-designer-core';

/**
 * nop-report inspector schema 生成器（nop-report-profile.md §7）：
 * cell Basic + cell XPT + sheet/workbook 三级 Flux schema。
 * 值经 host scope `activeMeta['nop-report'].model.*` / `activeMeta.basic.*` 绑定；
 * 提交为 `report-designer:updateMeta` namespaced action。
 * `*Expr`/`expandExpr` 五个表达式字段带 `x-expression-kind` 标记供 NRP-4 消费。
 */

export const NOP_REPORT_INSPECTOR_SCHEMA_ID = 'nop-report-default';

export const NOP_REPORT_EXPRESSION_KIND_MARKER = 'x-expression-kind';

export const NOP_REPORT_EXPRESSION_FIELDS = [
  'expandExpr',
  'valueExpr',
  'formatExpr',
  'styleIdExpr',
  'linkExpr',
] as const;

export const NOP_REPORT_REFERENCE_FIELDS = ['rowParent', 'colParent'] as const;

export const NOP_REPORT_REFERENCE_KIND_MARKER = 'x-reference-kind';

export const NOP_REPORT_XPT_MODEL_FIELDS = [
  'field',
  'ds',
  'expandType',
  'expandExpr',
  'valueExpr',
  'formatExpr',
  'styleIdExpr',
  'linkExpr',
  'rowParent',
  'colParent',
  'exportFormula',
  'editorId',
  'viewerId',
] as const;

export type NopReportInspectorSchemas = Partial<
  Record<ReportSelectionTargetKind, SchemaInput>
>;

const MODEL_PATH_PREFIX = "${activeMeta['nop-report'].model.";
const BASIC_PATH_PREFIX = '${activeMeta.basic.';

const BASIC_CELL_FIELDS: Array<{ name: string; label: string; type?: string }> = [
  { name: 'value', label: 'Value' },
  { name: 'type', label: 'Type' },
  { name: 'styleId', label: 'Style ID' },
  { name: 'comment', label: 'Comment' },
  { name: 'linkUrl', label: 'Link URL' },
  { name: 'protected', label: 'Protected', type: 'switch' },
];

const XPT_FIELD_LABELS: Record<(typeof NOP_REPORT_XPT_MODEL_FIELDS)[number], string> = {
  field: 'Field',
  ds: 'Dataset',
  expandType: 'Expand Type',
  expandExpr: 'Expand Expr',
  valueExpr: 'Value Expr',
  formatExpr: 'Format Expr',
  styleIdExpr: 'Style ID Expr',
  linkExpr: 'Link Expr',
  rowParent: 'Row Parent',
  colParent: 'Column Parent',
  exportFormula: 'Export Formula',
  editorId: 'Editor ID',
  viewerId: 'Viewer ID',
};

function updateMetaAction(): SchemaInput {
  return {
    action: 'report-designer:updateMeta',
    namespace: 'report-designer',
    method: 'updateMeta',
    args: {
      target: '${selectionTarget}',
      patch: '${patch}',
    },
  } as unknown as SchemaInput;
}

function formWithUpdate(title: string, body: SchemaInput[]): SchemaInput {
  return {
    type: 'form',
    title,
    body,
    actions: [
      {
        type: 'button',
        label: 'Update',
        onClick: updateMetaAction(),
      },
    ],
  } as SchemaInput;
}

function xptModelFieldsBody(): SchemaInput[] {
  return NOP_REPORT_XPT_MODEL_FIELDS.map((field) => {
    const isExpression = (NOP_REPORT_EXPRESSION_FIELDS as readonly string[]).includes(field);
    const isReference = (NOP_REPORT_REFERENCE_FIELDS as readonly string[]).includes(field);
    return {
      type: 'input-text',
      name: `xpt.${field}`,
      label: XPT_FIELD_LABELS[field],
      value: `${MODEL_PATH_PREFIX}${field}}`,
      ...(isExpression ? { [NOP_REPORT_EXPRESSION_KIND_MARKER]: true } : {}),
      ...(isReference ? { [NOP_REPORT_REFERENCE_KIND_MARKER]: true } : {}),
    } as SchemaInput;
  });
}

/**
 * 供宿主装配使用：`config.inspector.byProfile[NOP_REPORT_INSPECTOR_SCHEMA_ID] = schemas`。
 */
export function createNopReportInspectorSchemas(): NopReportInspectorSchemas {
  const cell: SchemaInput = formWithUpdate('Cell', [
    {
      type: 'group',
      title: 'Basic',
      body: BASIC_CELL_FIELDS.map((field) => ({
        type: field.type ?? 'input-text',
        name: `basic.${field.name}`,
        label: field.label,
        value: `${BASIC_PATH_PREFIX}${field.name}}`,
      })) as SchemaInput[],
    },
    {
      type: 'group',
      title: 'Report (XPT)',
      body: xptModelFieldsBody(),
    },
  ] as SchemaInput[]);

  const sheet: SchemaInput = formWithUpdate('Sheet', [
    {
      type: 'group',
      title: 'Report (XPT)',
      body: [
        {
          type: 'input-text',
          name: 'xpt.pageSetup',
          label: 'Page Setup',
          value: `${MODEL_PATH_PREFIX}pageSetup}`,
        },
      ],
    },
  ] as SchemaInput[]);

  const workbook: SchemaInput = formWithUpdate('Workbook', [
    {
      type: 'group',
      title: 'Report (XPT)',
      body: [
        {
          type: 'input-text',
          name: 'xpt.exportFormat',
          label: 'Export Format',
          value: `${MODEL_PATH_PREFIX}exportFormat}`,
        },
      ],
    },
  ] as SchemaInput[]);

  return { cell, sheet, workbook };
}

/**
 * host 装配侧便捷函数：由表单值（basic/xpt 两段）构造 `report-designer:updateMeta`
 * 的 patch（`args.patch`）。cell Basic 字段写入 `meta.basic`，XPT 字段写入
 * `meta['nop-report'].model`。
 */
export function buildNopReportMetaPatch(values: {
  basic?: Record<string, unknown>;
  xpt?: Record<string, unknown>;
}): MetadataBag {
  const patch: MetadataBag = {};
  if (values.basic && Object.keys(values.basic).length > 0) {
    patch.basic = { ...values.basic };
  }
  if (values.xpt && Object.keys(values.xpt).length > 0) {
    patch['nop-report'] = { model: { ...values.xpt } };
  }
  return patch;
}
