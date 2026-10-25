import { useState } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type {
  ExpressionEditorAdapter,
  ReferencePickerAdapter,
} from '@nop-chaos/report-designer-core';
import {
  NOP_REPORT_EXPRESSION_RENDERER_TYPE,
  NOP_REPORT_REFERENCE_RENDERER_TYPE,
} from './field-kinds.js';

/**
 * nop-report 自带 renderer definitions（plan 752）：渲染 expression/reference
 * adapter 的产出。由 NRP-5 装配注册进 live flux registry；测试可直接渲染组件。
 */

export const NOP_REPORT_REFERENCE_PICK_SLOT = 'nop-report-reference-pick';

interface RendererComponentPropsLike {
  props: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

function ExpressionEditorComponent(args: {
  adapters: { expressionEditor?: ExpressionEditorAdapter };
  props: RendererComponentPropsLike;
}) {
  const adapter = args.adapters.expressionEditor;
  if (!adapter) {
    return null;
  }
  return (
    <>
      {adapter.render({
        value: typeof args.props.props.value === 'string' ? args.props.props.value : '',
        onChange: (next: string) => {
          const onChange = args.props.props.onChange;
          if (typeof onChange === 'function') {
            (onChange as (value: string) => void)(next);
          }
        },
      }) as never}
    </>
  );
}

function ReferencePickerComponent(args: {
  adapters: { referencePicker?: ReferencePickerAdapter };
  props: RendererComponentPropsLike;
}) {
  const [picked, setPicked] = useState<string | undefined>();
  const adapter = args.adapters.referencePicker;
  if (!adapter) {
    return null;
  }
  const current = picked ?? (typeof args.props.props.value === 'string' ? args.props.props.value : '');
  return (
    <span data-slot={NOP_REPORT_REFERENCE_PICK_SLOT}>
      <input
        value={current}
        readOnly
        data-slot="nop-report-reference-value"
        placeholder={typeof args.props.props.placeholder === 'string' ? args.props.props.placeholder : undefined}
      />
      <button
        type="button"
        data-slot={NOP_REPORT_REFERENCE_PICK_SLOT}
        onClick={() => {
          void adapter
            .pick({ targetKind: 'cell' })
            .then((address) => {
              if (address !== undefined) {
                setPicked(address);
                const onChange = args.props.props.onChange;
                if (typeof onChange === 'function') {
                  (onChange as (value: string) => void)(address);
                }
              }
            })
            .catch(() => undefined);
        }}
      >
        {t('flux.reportDesigner.referencePick')}
      </button>
    </span>
  );
}

export function createNopReportRendererDefinitions(args: {
  expressionEditor?: ExpressionEditorAdapter;
  referencePicker?: ReferencePickerAdapter;
}) {
  return [
    {
      type: NOP_REPORT_EXPRESSION_RENDERER_TYPE,
      component: (props: RendererComponentPropsLike) => (
        <ExpressionEditorComponent adapters={args} props={props} />
      ),
    },
    {
      type: NOP_REPORT_REFERENCE_RENDERER_TYPE,
      component: (props: RendererComponentPropsLike) => (
        <ReferencePickerComponent adapters={args} props={props} />
      ),
    },
  ];
}
