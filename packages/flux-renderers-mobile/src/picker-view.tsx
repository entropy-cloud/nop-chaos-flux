import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { PickerViewSchema, WheelPickerOption } from './schemas.js';
import { WheelView } from './wheel-view.js';

const EMPTY_COLUMNS: WheelPickerOption[][] = [];

/**
 * Schema adapter over the WheelView kernel (plan 665): resolves compiled
 * props and bridges the `change` event payload contract
 * ({ type: 'change', column, index, value, label }).
 */
export function PickerViewRenderer(props: RendererComponentProps<PickerViewSchema>) {
  const slotProps = props.props;
  const columnDefs = slotProps.columns ?? EMPTY_COLUMNS;

  const onSettle = (column: number, index: number) => {
      const option = columnDefs[column]?.[index];
      if (!option) return;
      const payload = {
        type: 'change',
        column,
        index,
        value: option.value,
        label: option.label,
      };
      void props.events.onChange?.(payload, {
        event: payload,
        evaluationBindings: payload,
        scope: props.node.scope,
      });
    };

  return (
    <WheelView
      columns={columnDefs}
      value={slotProps.value}
      rowHeight={slotProps.rowHeight}
      visibleRows={slotProps.visibleRows}
      disabled={slotProps.disabled}
      className={props.meta.className}
      testid={props.meta.testid != null ? String(props.meta.testid) : undefined}
      cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      onSettle={onSettle}
    />
  );
}
