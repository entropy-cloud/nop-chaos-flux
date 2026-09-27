/**
 * `xui:actions` 可视化编排面板（S3-2，design §11.2「事件面板位的结构化编辑器」）。
 *
 * 事件动作列表编辑：动作类型下拉（内建已知集）/ 参数键值对 / 顺序增删；
 * 未知类型保留 + 标注（action-unknown-type 失败路径）。整 record 经
 * `onUpdateProps({ 'xui:actions': record })` 写回——行编辑 transient（宿主事务内）、
 * 结构操作（增删/移动/换类型）即时收口为 1 条 undo 步（S1 §8.3 粒度表）。
 *
 * 行集是组件态：自身写回（宿主收敛后的 record 与最近写出值一致）不复位行集，
 * 行 uid 保持稳定（重命名/收敛重渲染不重挂输入框）；外部改值才重新投影。
 */

import { useMemo, useState } from 'react';
import { Badge, Button, Input, Label, NativeSelect } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { BaseSchema } from '@nop-chaos/flux-core';
import {
  KNOWN_ACTION_TYPES,
  moveRow,
  nextActionName,
  parseActionsRecord,
  serializeActionsRecord,
} from './actions-model.js';
import type { ActionArgPair, ActionRow } from './actions-model.js';

export const ACTIONS_RECORD_KEY = 'xui:actions';

export interface ActionsEditorPanelProps {
  node: BaseSchema | null;
  /** 属性回写（宿主装 updateProps 命令；transient/commit 语义同 inspector）。 */
  onUpdateProps(props: Record<string, unknown>, stage: 'transient' | 'commit'): void;
}

let uidSeed = 0;

function nextUid(prefix: string): string {
  uidSeed = (uidSeed + 1) % 0x7fffffff;
  return `${prefix}-${uidSeed}`;
}

/** 行/参数对注入渲染态 uid（仅作 React key，绝不写入 record）。 */
function withUids(rows: ActionRow[]): ActionRow[] {
  return rows.map((row) => ({
    ...row,
    uid: nextUid('row'),
    args: row.args.map((pair) => ({ ...pair, uid: nextUid('arg') })),
  }));
}

export function ActionsEditorPanel(props: ActionsEditorPanelProps) {
  const { node, onUpdateProps } = props;
  const record: unknown = node ? (node as unknown as Record<string, unknown>)[ACTIONS_RECORD_KEY] : undefined;
  const preservedEntries = useMemo(() => parseActionsRecord(record).preservedEntries, [record]);
  const preservedRaw = useMemo(() => parseActionsRecord(record).preservedRaw, [record]);
  const recordJson = JSON.stringify(record ?? null);

  const [rows, setRows] = useState<ActionRow[]>(() => withUids(parseActionsRecord(record).rows));
  const [lastJson, setLastJson] = useState(recordJson);
  // 外部改值（换选中/非本面板写入）→ 重新投影；自身写回（recordJson 归位）→ 保持行集。
  if (recordJson !== lastJson) {
    setLastJson(recordJson);
    setRows(withUids(parseActionsRecord(record).rows));
  }

  /**
   * 写回纪律对齐宿主契约：文档变更只能搭 transient（宿主 beginTransaction + dispatch）；
   * `commit` 阶段宿主只收口事务、忽略 mutation。行内编辑 = transient（宿主在 blur 收口）；
   * 结构操作（增删/移动/换类型/删参数）= transient 携带变更 + 立即空 commit 收口
   * （一次结构意图 = 1 条 undo 步，S1 §8.3 粒度表）。
   */
  const apply = (nextRows: ActionRow[]) => {
    const nextRecord = serializeActionsRecord({ rows: nextRows, preservedEntries });
    setRows(nextRows);
    setLastJson(JSON.stringify(nextRecord ?? null));
    onUpdateProps({ [ACTIONS_RECORD_KEY]: nextRecord ?? undefined }, 'transient');
  };

  /** 空变更收口（inspector COMMIT_ONLY 同款；宿主 endTransaction → 1 条 undo 步）。 */
  const commit = () => onUpdateProps({}, 'commit');

  const writeStructural = (nextRows: ActionRow[]) => {
    apply(nextRows);
    commit();
  };

  const updateRow = (index: number, patch: Partial<ActionRow>) =>
    apply(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const updateArgs = (index: number, args: ActionArgPair[]) => updateRow(index, { args });

  if (preservedRaw !== undefined) {
    return (
      <div className="space-y-1 border-t pt-2" data-testid="page-designer-actions-preserved">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--nop-eyebrow,#9ca3af)]">
          {t('flux.pageDesigner.actionsTitle')}
        </h4>
        <p className="text-xs text-[var(--nop-body-copy,#6b7280)]">{t('flux.pageDesigner.actionsPreservedRaw')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t pt-2" data-testid="page-designer-actions-editor">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--nop-eyebrow,#9ca3af)]">
        {t('flux.pageDesigner.actionsTitle')}
      </h4>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--nop-body-copy,#6b7280)]" data-testid="page-designer-actions-empty">
          {t('flux.pageDesigner.actionsEmpty')}
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.uid}
              className="space-y-1.5 rounded border p-2"
              data-testid="page-designer-action-row"
              data-action-known={row.known ? 'true' : 'false'}
            >
              <div className="flex items-center gap-1.5">
                <Input
                  className="h-7 w-28 text-xs"
                  aria-label={t('flux.pageDesigner.actionName')}
                  placeholder={t('flux.pageDesigner.actionName')}
                  value={row.name}
                  data-testid={`page-designer-action-name-${index}`}
                  onChange={(event) => updateRow(index, { name: event.target.value })}
                  onBlur={commit}
                />
                <ActionTypeSelect
                  index={index}
                  row={row}
                  onSelect={(actionType) =>
                    writeStructural(
                      rows.map((r, i) =>
                        i === index
                          ? { ...r, actionType, known: KNOWN_ACTION_TYPES.includes(actionType) }
                          : r,
                      ),
                    )
                  }
                />
                {!row.known ? (
                  <Badge variant="outline" data-testid={`page-designer-action-unknown-${index}`}>
                    {t('flux.pageDesigner.actionUnknown')}
                  </Badge>
                ) : null}
                <span className="ml-auto flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5"
                    disabled={index === 0}
                    aria-label={t('flux.pageDesigner.actionMoveUp')}
                    data-testid={`page-designer-action-up-${index}`}
                    onClick={() => writeStructural(moveRow(rows, index, -1))}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5"
                    disabled={index === rows.length - 1}
                    aria-label={t('flux.pageDesigner.actionMoveDown')}
                    data-testid={`page-designer-action-down-${index}`}
                    onClick={() => writeStructural(moveRow(rows, index, 1))}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5"
                    aria-label={t('flux.pageDesigner.actionRemove')}
                    data-testid={`page-designer-action-remove-${index}`}
                    onClick={() => writeStructural(rows.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                </span>
              </div>

              {Object.keys(row.extras).length > 0 ? (
                <p className="text-[11px] text-[var(--nop-eyebrow,#9ca3af)]">
                  {t('flux.pageDesigner.actionPreservedFields', { fields: Object.keys(row.extras).join(', ') })}
                </p>
              ) : null}

              <div className="space-y-1" data-testid={`page-designer-action-args-${index}`}>
                {row.args.map((pair, argIndex) => (
                  <div key={pair.uid} className="flex items-center gap-1.5">
                    <Input
                      className="h-7 w-24 font-mono text-xs"
                      aria-label={t('flux.pageDesigner.actionArgKey')}
                      placeholder={t('flux.pageDesigner.actionArgKey')}
                      value={pair.key}
                      onChange={(event) =>
                        updateArgs(
                          index,
                          row.args.map((p, i) => (i === argIndex ? { ...p, key: event.target.value } : p)),
                        )
                      }
                      onBlur={commit}
                    />
                    <Input
                      className="h-7 flex-1 font-mono text-xs"
                      aria-label={t('flux.pageDesigner.actionArgValue')}
                      placeholder={t('flux.pageDesigner.actionArgValue')}
                      value={pair.value}
                      onChange={(event) =>
                        updateArgs(
                          index,
                          row.args.map((p, i) => (i === argIndex ? { ...p, value: event.target.value } : p)),
                        )
                      }
                      onBlur={commit}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5"
                      aria-label={t('flux.pageDesigner.actionArgRemove')}
                      data-testid={`page-designer-action-arg-remove-${index}-${argIndex}`}
                      onClick={() =>
                        writeStructural(
                          rows.map((r, i) =>
                            i === index ? { ...r, args: row.args.filter((_, j) => j !== argIndex) } : r,
                          ),
                        )
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  data-testid={`page-designer-action-arg-add-${index}`}
                  onClick={() =>
                    updateArgs(index, [...row.args, { key: '', value: '', uid: nextUid('arg') }])
                  }
                >
                  {t('flux.pageDesigner.actionArgAdd')}
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs"
        data-testid="page-designer-action-add"
        onClick={() =>
          writeStructural([
            ...rows,
            {
              name: nextActionName(rows),
              actionType: 'ajax',
              known: true,
              args: [],
              extras: {},
              uid: nextUid('row'),
            },
          ])
        }
      >
        + {t('flux.pageDesigner.actionAdd')}
      </Button>
    </div>
  );
}

function ActionTypeSelect(props: { index: number; row: ActionRow; onSelect(actionType: string): void }) {
  const { row } = props;
  const options = useMemo(() => {
    const list = KNOWN_ACTION_TYPES.map((type) => ({ value: type, label: type }));
    if (!row.known && row.actionType) {
      list.push({ value: row.actionType, label: `${row.actionType} · ${t('flux.pageDesigner.actionUnknown')}` });
    }
    return list;
  }, [row.actionType, row.known]);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Label className="sr-only" htmlFor={`page-designer-action-type-${props.index}`}>
        {t('flux.pageDesigner.actionType')}
      </Label>
      <NativeSelect
        id={`page-designer-action-type-${props.index}`}
        className="h-7 text-xs"
        value={row.actionType}
        data-testid={`page-designer-action-type-${props.index}`}
        onChange={(event) => props.onSelect(event.target.value)}
      >
        {!row.actionType ? <option value={''}>{t('flux.pageDesigner.selectEmptyOption')}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
