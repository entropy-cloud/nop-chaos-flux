/**
 * 数据绑定面板（S3-1，design §11.2「左栏数据面板位」填充 + inspector 挂接）。
 *
 * 选中节点数据绑定的结构化编辑：数据源名称 + 字段路径 + 目标属性 →
 * `${source.field}` 模板，产出经 `updateProps` 落文档（transient/commit 两段，
 * 同 inspector 纪律）。数据源清单 = 宿主 env 注入面 + 文档内
 * `data-source`/`source` 节点扫描（core `collectDataSourceNames`）——不引入
 * 数据建模层、不产第二套文档模型（§11.2 终裁）。
 */

import { useMemo, useState } from 'react';
import { Badge, Input, Label } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { resolveRendererAuthoringContract } from '@nop-chaos/flux-core';
import type { BaseSchema, RendererDefinition } from '@nop-chaos/flux-core';
import { buildDataBindingExpression, parseDataBindingExpression, SESSION_ID_KEY } from '@nop-chaos/page-designer-core';

export interface DataBindingPanelProps {
  node: BaseSchema | null;
  /** 目标属性候选（string 型 propContracts 键）来源。 */
  definition: RendererDefinition | undefined;
  /** 数据源清单（文档扫描 + 宿主回调，去重由宿主完成）。 */
  dataSourceNames: readonly string[];
  /** 属性回写（宿主装 updateProps 命令）。 */
  onUpdateProps(props: Record<string, unknown>, stage: 'transient' | 'commit'): void;
}

interface BindingDraft {
  target: string;
  source: string;
  field: string;
}

function stringPropCandidates(definition: RendererDefinition | undefined): string[] {
  if (!definition) return [];
  try {
    const contract = resolveRendererAuthoringContract(definition);
    return Object.entries(contract.editableProps)
      .filter(([, prop]) => prop.shape.kind === 'string')
      .map(([key]) => key);
  } catch {
    return [];
  }
}

/** 面板初值投影：解析节点上既有 `${source.field}` 绑定（单跳模板），否则空。 */
function draftFromNode(node: BaseSchema | null, target: string): BindingDraft {
  if (!node) return { target, source: '', field: '' };
  const parsed = parseDataBindingExpression((node as unknown as Record<string, unknown>)[target]);
  return parsed ? { target, source: parsed.source, field: parsed.field } : { target, source: '', field: '' };
}

export function DataBindingPanel(props: DataBindingPanelProps) {
  const { node, definition, onUpdateProps } = props;

  const candidates = useMemo(() => {
    const names = stringPropCandidates(definition);
    return names.includes('value') ? names : ['value', ...names];
  }, [definition]);

  const defaultTarget = candidates[0] ?? 'value';
  const initialDraft = useMemo(() => draftFromNode(node, defaultTarget), [node, defaultTarget]);

  const [draft, setDraft] = useState<BindingDraft | null>(null);
  const current = draft ?? initialDraft;

  // node 身份变化（换选中）即复位草稿（渲染期派生复位，同 inspector 纪律）。
  const nodeKey = node ? String((node as unknown as Record<string, unknown>)[SESSION_ID_KEY] ?? '') : '';
  const [lastKey, setLastKey] = useState(nodeKey);
  if (lastKey !== nodeKey) {
    setLastKey(nodeKey);
    setDraft(null);
  }

  if (!node) {
    return (
      <div className="p-2 text-sm text-[var(--nop-body-copy,#6b7280)]" data-testid="page-designer-data-empty">
        {t('flux.pageDesigner.inspectorEmpty')}
      </div>
    );
  }

  const expression = buildDataBindingExpression(current.source, current.field);

  const apply = (next: BindingDraft, stage: 'transient' | 'commit') => {
    const built = buildDataBindingExpression(next.source, next.field);
    if (built) {
      onUpdateProps({ [next.target]: built }, stage);
      return;
    }
    const completeBefore = buildDataBindingExpression(current.source, current.field);
    if (!built && !completeBefore) {
      // 半填写态：不猜测、不落文档（对齐 expr-invalid 失败路径纪律）。
      if (stage === 'commit') onUpdateProps({}, stage);
      return;
    }
    // 从完整绑定清空 → 移除目标属性（undefined 删除语义）。
    onUpdateProps({ [next.target]: undefined }, stage);
  };

  const update = (patch: Partial<BindingDraft>) => {
    const next = { ...current, ...patch };
    setDraft(next);
    apply(next, 'transient');
  };

  return (
    <div className="space-y-2 p-1" data-testid="page-designer-data-binding">
      <div className="flex items-center gap-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--nop-eyebrow,#9ca3af)]">
          {t('flux.pageDesigner.dataBindingTitle')}
        </h4>
        {expression ? (
          <Badge variant="outline" data-testid="page-designer-binding-preview">
            {expression}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-1" data-testid="page-designer-binding-target-field">
        <Label htmlFor="page-designer-binding-target">{t('flux.pageDesigner.bindingTarget')}</Label>
        <Input
          id="page-designer-binding-target"
          className="h-7 font-mono text-xs"
          list="page-designer-binding-targets"
          value={current.target}
          onChange={(event) => update({ target: event.target.value })}
          onBlur={() => apply(current, 'commit')}
        />
        <datalist id="page-designer-binding-targets">
          {candidates.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1">
        <Label htmlFor="page-designer-binding-source">{t('flux.pageDesigner.bindingSource')}</Label>
        <Input
          id="page-designer-binding-source"
          className="h-7 font-mono text-xs"
          list="page-designer-binding-sources"
          value={current.source}
          placeholder={t('flux.pageDesigner.bindingSourcePlaceholder')}
          onChange={(event) => update({ source: event.target.value })}
          onBlur={() => apply(current, 'commit')}
        />
        <datalist id="page-designer-binding-sources">
          {props.dataSourceNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1">
        <Label htmlFor="page-designer-binding-field">{t('flux.pageDesigner.bindingField')}</Label>
        <Input
          id="page-designer-binding-field"
          className="h-7 font-mono text-xs"
          value={current.field}
          placeholder={t('flux.pageDesigner.bindingFieldPlaceholder')}
          onChange={(event) => update({ field: event.target.value })}
          onBlur={() => apply(current, 'commit')}
        />
      </div>

      <p className="text-[11px] text-[var(--nop-body-copy,#6b7280)]">{t('flux.pageDesigner.bindingHint')}</p>
    </div>
  );
}

/**
 * 左栏「数据」tab 的数据源清单（§11.2 数据面板位：只读清单 + 绑定入口提示；
 * 不产第二套文档模型）。
 */
export function DataSourceCatalog(props: { dataSourceNames: readonly string[] }) {
  return (
    <div className="space-y-1 p-1" data-testid="page-designer-data-sources">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--nop-eyebrow,#9ca3af)]">
        {t('flux.pageDesigner.dataSourcesTitle')}
      </h4>
      {props.dataSourceNames.length === 0 ? (
        <p className="text-xs text-[var(--nop-body-copy,#6b7280)]">{t('flux.pageDesigner.dataSourcesEmpty')}</p>
      ) : (
        <ul className="space-y-0.5 text-xs text-[var(--nop-body-copy,#6b7280)]">
          {props.dataSourceNames.map((name) => (
            <li key={name} className="font-mono" data-testid="page-designer-data-source-name">
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
