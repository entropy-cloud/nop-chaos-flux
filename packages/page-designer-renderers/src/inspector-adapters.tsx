/**
 * Inspector 控件适配器（S3-3 formula 编辑器，design §8.1/§11.2「inspector 控件
 * 适配位」填充）。
 *
 * `createFormulaExpressionAdapter()` 产出 core `InspectorControlAdapter` 挂点
 * 形状的自定义控件：`${...}` 表达式模板编辑 + 编译校验（expr-invalid 失败路径：
 * 校验失败行内提示、不落文档——仅合法值触发 `onChange`）。提交粒度对齐
 * inspector transient+commit（输入 transient、blur 收口）。
 */

import { useState } from 'react';
import { Label, Textarea } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { validateExpressionTemplate } from './expression-validation.js';

/**
 * renderers 消费层适配器接口（core `InspectorControlAdapter` 的 React 收窄，
 * 对齐 report-designer `ExpressionEditorAdapter` 形状）。方法式签名保持与
 * core 契约的结构兼容（renderers 层额外承载 onCommit 收口）。
 */
export interface PageDesignerControlAdapter {
  renderCell(input: {
    value: unknown;
    onChange(next: unknown): void;
    /** 编辑会话收口（宿主 endTransaction → 1 条 undo 步，S1 §8.3）。 */
    onCommit(): void;
    /** 字段名（无障碍 label 关联）。 */
    fieldId?: string;
    fieldLabel?: string;
  }): React.ReactNode;
}

function FormulaExpressionCell(props: {
  value: unknown;
  onChange(next: unknown): void;
  onCommit(): void;
  fieldId?: string;
  fieldLabel?: string;
}) {
  const initial = props.value === undefined || props.value === null ? '' : String(props.value);
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? initial;
  const error = validateExpressionTemplate(text);
  const fieldId = props.fieldId ?? 'page-designer-formula-cell';

  return (
    <div className="space-y-1" data-testid="page-designer-formula-cell" data-formula-state={error ? 'invalid' : 'valid'}>
      {props.fieldLabel ? <Label htmlFor={fieldId}>{props.fieldLabel}</Label> : null}
      <Textarea
        id={fieldId}
        className="min-h-16 font-mono text-xs"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const nextError = validateExpressionTemplate(next);
          if (!nextError) props.onChange(next);
        }}
        onBlur={() => {
          setDraft(null);
          props.onCommit();
        }}
      />
      {error ? (
        <p className="text-xs text-[var(--nop-destructive,#ef4444)]" data-testid="page-designer-formula-error">
          {t('flux.pageDesigner.formulaInvalid', { message: error })}
        </p>
      ) : null}
    </div>
  );
}

/** S3-3 formula 编辑器适配器（editorType `'expression'` 命中位）。 */
export function createFormulaExpressionAdapter(): PageDesignerControlAdapter {
  return {
    renderCell(input) {
      return <FormulaExpressionCell {...input} />;
    },
  };
}
