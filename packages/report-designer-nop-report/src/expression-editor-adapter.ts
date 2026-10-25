import { createElement } from 'react';
import type {
  ExpressionEditorAdapter,
  ExpressionEditorProps,
} from '@nop-chaos/report-designer-core';

/**
 * nop-report 表达式编辑器 adapter（nop-report-profile.md §8）：最小渲染 + onChange
 * 回传；不固化表达式语言/补全协议（design.md 边界）。
 */

export const NOP_REPORT_EXPRESSION_EDITOR_ADAPTER_ID = 'nop-report-expression-editor';
export const NOP_REPORT_EXPRESSION_EDITOR_SLOT = 'nop-report-expression-editor';

export function createNopReportExpressionEditorAdapter(options?: {
  id?: string;
  placeholder?: string;
  rows?: number;
}): ExpressionEditorAdapter {
  return {
    id: options?.id ?? NOP_REPORT_EXPRESSION_EDITOR_ADAPTER_ID,
    render(props: ExpressionEditorProps): unknown {
      return createElement('textarea', {
        key: 'nop-report-expression-editor',
        'data-slot': NOP_REPORT_EXPRESSION_EDITOR_SLOT,
        value: props.value ?? '',
        placeholder: props.placeholder ?? options?.placeholder,
        readOnly: props.readonly || undefined,
        disabled: props.disabled || undefined,
        rows: options?.rows ?? 3,
        onChange: (event: { target: { value: string } }) => {
          props.onChange(event.target.value);
        },
        onBlur: props.onBlur,
      });
    },
  };
}
