import { useState, type ChangeEvent } from 'react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Button, Input, Label, NativeSelect, NativeSelectOption, Textarea } from '@nop-chaos/ui';
import type { ScadaBinding, ScadaStateDeclaration } from '../../serialization/config-types.js';
import { BINDABLE_PROPERTIES } from '../../binding/bind-resolver.js';

/**
 * binding/state 结构化编辑面（plan 522 / L5.3，design-binding-panel.md §3）。
 *
 * 消费管道纪律（design-property-panel.md §7.2）：只写声明结构（ScadaBinding / ScadaStateDeclaration），
 * 不触碰 runtime 装配链。提交时机沿用 JsonEditorField 纪律（plan 2026-08-08-0900-1 / P2 #6）：
 * 非法输入（JSON parse 失败 / 空行）只做行级剔除，永不把半成品写进 working copy；
 * 外部值同步沿用「render 期 derived state + selfUpdate flag」模式。
 */

export type BindingSourceMode = 'point' | 'expression' | 'none';

export interface BindingRow {
  /** 行稳定 key（react/no-array-index-key：draft 行按生成序发键，提交时忽略）。 */
  rowKey: string;
  property: string;
  mode: BindingSourceMode;
  point: string;
  expression: string;
  /** { map, scale, format } 紧凑 JSON（design-binding-panel.md §3.1 高级面）。 */
  advancedText: string;
}

let bindingRowKeySeq = 0;
function nextBindingRowKey(): string {
  bindingRowKeySeq += 1;
  return `binding-row-${bindingRowKeySeq}`;
}

export interface RowsToBindingsResult {
  bindings: Record<string, ScadaBinding>;
  /** 行号 → 高级 JSON parse 错误（行级隔离：失败行的高级键不提交，其余行照常）。 */
  advancedErrors: Map<number, string>;
}

function emptyRow(property = ''): BindingRow {
  return { rowKey: nextBindingRowKey(), property, mode: 'none', point: '', expression: '', advancedText: '' };
}

/** 声明对象 → draft 行（mode 按 point/expression 存在性推导；二者并存时 expression 胜出显示）。 */
export function bindingsToRows(value: unknown): BindingRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const record = value as Record<string, ScadaBinding>;
  return Object.entries(record).map(([property, binding]) => {
    const advanced: Record<string, unknown> = {};
    if (binding && typeof binding === 'object') {
      if (binding.map !== undefined) advanced.map = binding.map;
      if (binding.scale !== undefined) advanced.scale = binding.scale;
      if (binding.format !== undefined) advanced.format = binding.format;
    }
    return {
      rowKey: nextBindingRowKey(),
      property,
      mode: binding?.expression !== undefined ? 'expression' : binding?.point !== undefined ? 'point' : 'none',
      point: binding?.point ?? '',
      expression: binding?.expression ?? '',
      advancedText: Object.keys(advanced).length > 0 ? JSON.stringify(advanced, null, 2) : '',
    } satisfies BindingRow;
  });
}

/** draft 行 → 声明对象（空 property / mode=none 行跳过；point 与 expression 互斥写入）。 */
export function rowsToBindings(rows: BindingRow[]): RowsToBindingsResult {
  const bindings: Record<string, ScadaBinding> = {};
  const advancedErrors = new Map<number, string>();
  rows.forEach((row, index) => {
    const property = row.property.trim();
    if (!property || row.mode === 'none') return;
    const binding: ScadaBinding = {};
    if (row.mode === 'point') {
      const point = row.point.trim();
      if (point) binding.point = point;
    } else {
      const expression = row.expression.trim();
      if (expression) binding.expression = expression;
    }
    if (row.advancedText.trim()) {
      try {
        const advanced = JSON.parse(row.advancedText) as Record<string, unknown>;
        if (advanced && typeof advanced === 'object' && !Array.isArray(advanced)) {
          if (advanced.map !== undefined) binding.map = advanced.map as ScadaBinding['map'];
          if (advanced.scale !== undefined) binding.scale = advanced.scale as ScadaBinding['scale'];
          if (advanced.format !== undefined) binding.format = advanced.format as string;
        } else {
          advancedErrors.set(index, 'object');
        }
      } catch {
        advancedErrors.set(index, 'parse');
      }
    }
    if (Object.keys(binding).length > 0) bindings[property] = binding;
  });
  return { bindings, advancedErrors };
}

export interface StateRow {
  rowKey: string;
  key: string;
  /** 单状态定义 JSON（{ style?, animations? }）。 */
  defText: string;
}

let stateRowKeySeq = 0;
function nextStateRowKey(): string {
  stateRowKeySeq += 1;
  return `state-row-${stateRowKeySeq}`;
}

export interface StateDraft {
  stateSource: string;
  stateRows: StateRow[];
  booleanTrue: string;
  booleanFalse: string;
  /** { ranges, valueMap } 紧凑 JSON（design-binding-panel.md §3.2 高级面）。 */
  advancedText: string;
}

export interface DraftToStatesResult {
  states: ScadaStateDeclaration | undefined;
  /** 状态名 → 定义 JSON parse 错误（行级隔离）。 */
  defErrors: Map<string, string>;
  advancedError?: string;
}

function emptyStateRow(): StateRow {
  return { rowKey: nextStateRowKey(), key: '', defText: '' };
}

/** 声明对象 → draft。 */
export function statesToDraft(value: unknown): StateDraft {
  const decl = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as ScadaStateDeclaration;
  const stateRows: StateRow[] = Object.entries(decl.states ?? {}).map(([key, def]) => ({
    rowKey: nextStateRowKey(),
    key,
    defText: JSON.stringify(def ?? {}, null, 2),
  }));
  const advanced: Record<string, unknown> = {};
  if (decl.ranges !== undefined) advanced.ranges = decl.ranges;
  if (decl.valueMap !== undefined) advanced.valueMap = decl.valueMap;
  return {
    stateSource: decl.stateSource ?? '',
    stateRows,
    booleanTrue: decl.booleanMap?.true ?? '',
    booleanFalse: decl.booleanMap?.false ?? '',
    advancedText: Object.keys(advanced).length > 0 ? JSON.stringify(advanced, null, 2) : '',
  };
}

/** draft → 声明对象（全部为空时返回 undefined = 清空 node.states）。 */
export function draftToStates(draft: StateDraft): DraftToStatesResult {
  const states: Record<string, ScadaStateDefinitionDraft> = {};
  const defErrors = new Map<string, string>();
  for (const row of draft.stateRows) {
    const key = row.key.trim();
    if (!key) continue;
    try {
      const def = row.defText.trim() ? JSON.parse(row.defText) : {};
      if (!def || typeof def !== 'object' || Array.isArray(def)) {
        defErrors.set(key, 'object');
        continue;
      }
      states[key] = def;
    } catch {
      defErrors.set(key, 'parse');
    }
  }
  let advancedError: string | undefined;
  let advanced: Record<string, unknown> = {};
  if (draft.advancedText.trim()) {
    try {
      const parsed = JSON.parse(draft.advancedText) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        advanced = parsed;
      } else {
        advancedError = 'object';
      }
    } catch {
      advancedError = 'parse';
    }
  }
  const stateSource = draft.stateSource.trim();
  const booleanTrue = draft.booleanTrue.trim();
  const booleanFalse = draft.booleanFalse.trim();
  const hasStates = Object.keys(states).length > 0;
  if (!hasStates && !stateSource && !booleanTrue && !booleanFalse && Object.keys(advanced).length === 0) {
    return { states: undefined, defErrors, advancedError };
  }
  const decl: ScadaStateDeclaration = { states: states as ScadaStateDeclaration['states'] };
  if (stateSource) decl.stateSource = stateSource;
  if (booleanTrue && booleanFalse) decl.booleanMap = { true: booleanTrue, false: booleanFalse };
  if (advanced.ranges !== undefined) decl.ranges = advanced.ranges as ScadaStateDeclaration['ranges'];
  if (advanced.valueMap !== undefined) decl.valueMap = advanced.valueMap as ScadaStateDeclaration['valueMap'];
  return { states: decl, defErrors, advancedError };
}

type ScadaStateDefinitionDraft = ScadaStateDeclaration['states'][string];

interface StructuredFieldProps {
  value: unknown;
  error?: string;
  /** 点引用候选集（working copy variables 的 id 集，design-binding-panel.md §2.2）。 */
  pointIds: string[];
  disabled?: boolean;
  onChange: (value: unknown) => void;
}

/** 行/字段级公共控件样式（与 inspector-field 的 text-xs 密度一致）。 */
const ROW_CLASS = 'nop-scada-editor-binding-row';

/**
 * bindings 结构化编辑（design-binding-panel.md §3.1）。
 * 逐属性行：property select（BINDABLE_PROPERTIES ∪ 既有扩展 key）+ 来源三态 +
 * 点引用（datalist combobox）/ 表达式 textarea 分离 + 高级 JSON。point 与 expression 互斥写入。
 */
export function BindingEditorField(props: StructuredFieldProps) {
  const { value, error, pointIds, disabled, onChange } = props;
  const { t } = useFluxTranslation();
  const [rows, setRows] = useState<BindingRow[]>(() => bindingsToRows(value));
  const [prevValue, setPrevValue] = useState<unknown>(value);
  const [selfUpdate, setSelfUpdate] = useState(false);

  if (value !== prevValue) {
    setPrevValue(value);
    if (selfUpdate) {
      setSelfUpdate(false);
    } else {
      setRows(bindingsToRows(value));
    }
  }

  const propertyOptions = [...BINDABLE_PROPERTIES];
  for (const row of rows) {
    const key = row.property.trim();
    if (key && !propertyOptions.includes(key as (typeof BINDABLE_PROPERTIES)[number])) {
      propertyOptions.push(key as (typeof BINDABLE_PROPERTIES)[number]);
    }
  }

  const commit = (nextRows: BindingRow[]) => {
    setRows(nextRows);
    const { bindings } = rowsToBindings(nextRows);
    const keys = Object.keys(bindings);
    setSelfUpdate(true);
    onChange(keys.length > 0 ? bindings : undefined);
  };

  const updateRow = (index: number, patch: Partial<BindingRow>) => {
    commit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const pointIdsDatalistId = 'nop-scada-inspector-binding-point-ids';
  const datalist = (
    <datalist id={pointIdsDatalistId}>
      {pointIds.map((id) => (
        <option key={id} value={id} />
      ))}
    </datalist>
  );

  return (
    <div data-slot="scada-editor-binding-editor">
      <Label className="text-xs">{t('industrial.scada.editor.inspector.binding.title')}</Label>
      {rows.length === 0 ? (
        <div className="text-xs opacity-60" data-testid="binding-editor-empty">
          {t('industrial.scada.editor.inspector.binding.empty')}
        </div>
      ) : null}
      {rows.map((row, index) => {
        const pointMissing =
          row.mode === 'point' && row.point.trim() !== '' && !pointIds.includes(row.point.trim());
        const advancedError = rowsToBindings([row]).advancedErrors.get(0);
        return (
          <div key={row.rowKey} className={ROW_CLASS} data-slot="scada-editor-binding-row" data-index={index}>
            <div className="flex items-center gap-2">
              <NativeSelect
                size="xs"
                className="text-xs"
                aria-label={t('industrial.scada.editor.inspector.binding.property')}
                data-testid={`binding-row-${index}-property`}
                value={row.property}
                disabled={disabled}
                onChange={(e) => updateRow(index, { property: e.target.value })}
              >
                <NativeSelectOption value="">{t('industrial.scada.editor.inspector.binding.property')}</NativeSelectOption>
                {propertyOptions.map((opt) => (
                  <NativeSelectOption key={opt} value={opt}>
                    {opt}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <NativeSelect
                size="xs"
                className="text-xs"
                aria-label={t('industrial.scada.editor.inspector.binding.source')}
                data-testid={`binding-row-${index}-mode`}
                value={row.mode}
                disabled={disabled}
                onChange={(e) => updateRow(index, { mode: e.target.value as BindingSourceMode })}
              >
                <NativeSelectOption value="none">{t('industrial.scada.editor.inspector.binding.sourceNone')}</NativeSelectOption>
                <NativeSelectOption value="point">{t('industrial.scada.editor.inspector.binding.sourcePoint')}</NativeSelectOption>
                <NativeSelectOption value="expression">{t('industrial.scada.editor.inspector.binding.sourceExpression')}</NativeSelectOption>
              </NativeSelect>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={disabled}
                aria-label={t('industrial.scada.editor.inspector.binding.remove')}
                data-testid={`binding-row-${index}-remove`}
                onClick={() => commit(rows.filter((_, i) => i !== index))}
              >
                ×
              </Button>
            </div>
            {row.mode === 'point' ? (
              <div>
                <Label className="text-xs" htmlFor={`binding-row-${index}-point`}>
                  {t('industrial.scada.editor.inspector.binding.point')}
                </Label>
                <Input
                  id={`binding-row-${index}-point`}
                  className="text-xs font-mono"
                  list={pointIdsDatalistId}
                  value={row.point}
                  disabled={disabled}
                  data-testid={`binding-row-${index}-point`}
                  onChange={(e) => updateRow(index, { point: e.target.value })}
                />
                {pointMissing ? (
                  <div className="nop-scada-editor-field-error" data-testid={`binding-row-${index}-unknown-point`}>
                    {t('industrial.scada.editor.inspector.binding.unknownPoint')}
                  </div>
                ) : null}
              </div>
            ) : null}
            {row.mode === 'expression' ? (
              <div>
                <Label className="text-xs" htmlFor={`binding-row-${index}-expression`}>
                  {t('industrial.scada.editor.inspector.binding.expression')}
                </Label>
                <Textarea
                  id={`binding-row-${index}-expression`}
                  className="text-xs font-mono"
                  rows={2}
                  value={row.expression}
                  disabled={disabled}
                  data-testid={`binding-row-${index}-expression`}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateRow(index, { expression: e.target.value })}
                />
              </div>
            ) : null}
            {row.mode !== 'none' ? (
              <div>
                <Label className="text-xs" htmlFor={`binding-row-${index}-advanced`}>
                  {t('industrial.scada.editor.inspector.binding.advanced')}
                </Label>
                <Textarea
                  id={`binding-row-${index}-advanced`}
                  className="text-xs font-mono"
                  rows={2}
                  value={row.advancedText}
                  disabled={disabled}
                  data-testid={`binding-row-${index}-advanced`}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateRow(index, { advancedText: e.target.value })}
                />
                {advancedError ? <div className="nop-scada-editor-field-error">{t('industrial.scada.editor.inspector.invalidJson')}</div> : null}
              </div>
            ) : null}
          </div>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={disabled}
        data-testid="binding-editor-add-row"
        onClick={() => commit([...rows, emptyRow()])}
      >
        {t('industrial.scada.editor.inspector.binding.addRow')}
      </Button>
      {error ? <div className="nop-scada-editor-field-error">{error}</div> : null}
      {datalist}
    </div>
  );
}

/**
 * states 结构化编辑（design-binding-panel.md §3.2）：
 * stateSource 点引用 + 逐状态名行（定义 JSON）+ booleanMap + ranges/valueMap 紧凑 JSON。
 */
export function StateEditorField(props: StructuredFieldProps) {
  const { value, error, pointIds, disabled, onChange } = props;
  const { t } = useFluxTranslation();
  const [draft, setDraft] = useState<StateDraft>(() => statesToDraft(value));
  const [prevValue, setPrevValue] = useState<unknown>(value);
  const [selfUpdate, setSelfUpdate] = useState(false);

  if (value !== prevValue) {
    setPrevValue(value);
    if (selfUpdate) {
      setSelfUpdate(false);
    } else {
      setDraft(statesToDraft(value));
    }
  }

  const commit = (next: StateDraft) => {
    setDraft(next);
    const { states } = draftToStates(next);
    setSelfUpdate(true);
    onChange(states);
  };

  const advancedError = draftToStates(draft).advancedError;
  const stateSourceMissing =
    draft.stateSource.trim() !== '' &&
    !pointIds.includes(draft.stateSource.trim().split('.')[0] ?? '');
  const pointIdsDatalistId = 'nop-scada-inspector-state-point-ids';

  return (
    <div data-slot="scada-editor-state-editor">
      <Label className="text-xs">{t('industrial.scada.editor.inspector.state.title')}</Label>
      {draft.stateRows.length === 0 ? (
        <div className="text-xs opacity-60" data-testid="state-editor-empty">
          {t('industrial.scada.editor.inspector.state.empty')}
        </div>
      ) : null}
      <div>
        <Label className="text-xs" htmlFor="state-editor-state-source">
          {t('industrial.scada.editor.inspector.state.stateSource')}
        </Label>
        <Input
          id="state-editor-state-source"
          className="text-xs font-mono"
          list={pointIdsDatalistId}
          value={draft.stateSource}
          disabled={disabled}
          data-testid="state-editor-state-source"
          onChange={(e) => commit({ ...draft, stateSource: e.target.value })}
        />
        {stateSourceMissing ? (
          <div className="nop-scada-editor-field-error" data-testid="state-editor-unknown-point">
            {t('industrial.scada.editor.inspector.binding.unknownPoint')}
          </div>
        ) : null}
      </div>
      {draft.stateRows.map((row, index) => (
        <div key={row.rowKey} className={ROW_CLASS} data-slot="scada-editor-state-row" data-index={index}>
          <div className="flex items-center gap-2">
            <Input
              className="text-xs font-mono"
              placeholder={t('industrial.scada.editor.inspector.state.stateKey')}
              aria-label={t('industrial.scada.editor.inspector.state.stateKey')}
              value={row.key}
              disabled={disabled}
              data-testid={`state-row-${index}-key`}
              onChange={(e) =>
                commit({
                  ...draft,
                  stateRows: draft.stateRows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)),
                })
              }
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={disabled}
              aria-label={t('industrial.scada.editor.inspector.state.remove')}
              data-testid={`state-row-${index}-remove`}
              onClick={() =>
                commit({ ...draft, stateRows: draft.stateRows.filter((_, i) => i !== index) })
              }
            >
              ×
            </Button>
          </div>
          <Label className="text-xs" htmlFor={`state-row-${index}-def`}>
            {t('industrial.scada.editor.inspector.state.stateDef')}
          </Label>
          <Textarea
            id={`state-row-${index}-def`}
            className="text-xs font-mono"
            rows={2}
            value={row.defText}
            disabled={disabled}
            data-testid={`state-row-${index}-def`}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              commit({
                ...draft,
                stateRows: draft.stateRows.map((r, i) => (i === index ? { ...r, defText: e.target.value } : r)),
              })
            }
          />
          {draftToStates(draft).defErrors.has(row.key.trim()) ? (
            <div className="nop-scada-editor-field-error">{t('industrial.scada.editor.inspector.invalidJson')}</div>
          ) : null}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Label className="text-xs" htmlFor="state-editor-boolean-true">
          {t('industrial.scada.editor.inspector.state.booleanMapTrue')}
        </Label>
        <Input
          id="state-editor-boolean-true"
          className="text-xs font-mono"
          value={draft.booleanTrue}
          disabled={disabled}
          data-testid="state-editor-boolean-true"
          onChange={(e) => commit({ ...draft, booleanTrue: e.target.value })}
        />
        <Label className="text-xs" htmlFor="state-editor-boolean-false">
          {t('industrial.scada.editor.inspector.state.booleanMapFalse')}
        </Label>
        <Input
          id="state-editor-boolean-false"
          className="text-xs font-mono"
          value={draft.booleanFalse}
          disabled={disabled}
          data-testid="state-editor-boolean-false"
          onChange={(e) => commit({ ...draft, booleanFalse: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-xs" htmlFor="state-editor-advanced">
          {t('industrial.scada.editor.inspector.state.advanced')}
        </Label>
        <Textarea
          id="state-editor-advanced"
          className="text-xs font-mono"
          rows={2}
          value={draft.advancedText}
          disabled={disabled}
          data-testid="state-editor-advanced"
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => commit({ ...draft, advancedText: e.target.value })}
        />
        {advancedError ? (
          <div className="nop-scada-editor-field-error">{t('industrial.scada.editor.inspector.invalidJson')}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={disabled}
          data-testid="state-editor-add-row"
          onClick={() => commit({ ...draft, stateRows: [...draft.stateRows, emptyStateRow()] })}
        >
          {t('industrial.scada.editor.inspector.state.addState')}
        </Button>
      </div>
      {error ? <div className="nop-scada-editor-field-error">{error}</div> : null}
      <datalist id={pointIdsDatalistId}>
        {pointIds.map((id) => (
          <option key={id} value={id} />
        ))}
      </datalist>
    </div>
  );
}
