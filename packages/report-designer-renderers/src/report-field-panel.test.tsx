// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { REPORT_FIELD_DRAG_MIME, ReportFieldPanel } from './report-field-panel.js';

const fieldSources = [
  {
    id: 'orders',
    label: 'Orders',
    groups: [
      {
        id: 'basic',
        label: 'Basic',
        expanded: true,
        fields: [{ id: 'orderId', label: 'Order ID', path: 'orders.orderId', fieldType: 'number' }],
      },
    ],
  },
] as any;

describe('ReportFieldPanel public component', () => {
  it('exposes a keyboard-accessible insert path without assigning button semantics to drag items', () => {
    cleanup();
    resetFluxI18n();
    initFluxI18n();

    const onFieldInsert = vi.fn();

    render(
      <ReportFieldPanel
        fieldSources={fieldSources}
        onFieldDragStart={vi.fn()}
        onFieldInsert={onFieldInsert}
        canInsertField={() => true}
      />,
    );

    const item = document.querySelector('[data-slot="report-field-panel-item"]');
    expect(item?.getAttribute('role')).toBeNull();

    const insertButton = screen.getByRole('button', {
      name: '将字段 Order ID 插入到当前选择',
    });
    fireEvent.click(insertButton);

    expect(onFieldInsert).toHaveBeenCalledWith('orders', 'orderId', 'Order ID');
  });

  it('disables insert when no supported insert target exists', () => {
    cleanup();
    resetFluxI18n();
    initFluxI18n();

    render(
      <ReportFieldPanel
        fieldSources={fieldSources}
        onFieldDragStart={vi.fn()}
        onFieldInsert={vi.fn()}
        canInsertField={() => false}
      />,
    );

    expect(
      screen.getByRole('button', { name: '将字段 Order ID 插入到当前选择' }).hasAttribute(
        'disabled',
      ),
    ).toBe(true);
  });

  it('writes the canonical field drag payload without exposing button semantics', () => {
    cleanup();
    resetFluxI18n();
    initFluxI18n();

    const onFieldDragStart = vi.fn();
    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: 'all',
      setData,
    } as unknown as DataTransfer;

    render(
      <ReportFieldPanel
        fieldSources={fieldSources}
        onFieldDragStart={onFieldDragStart}
        onFieldInsert={vi.fn()}
        canInsertField={() => true}
      />,
    );

    const dragHandle = document.querySelector('[data-slot="report-field-panel-drag-handle"]');
    expect(dragHandle?.getAttribute('role')).toBeNull();

    fireEvent.dragStart(dragHandle as Element, { dataTransfer });

    expect(onFieldDragStart).toHaveBeenCalledWith('orders', 'orderId', 'Order ID');
    expect(setData).toHaveBeenCalledWith(
      REPORT_FIELD_DRAG_MIME,
      JSON.stringify({
        type: 'number',
        sourceId: 'orders',
        fieldId: 'orderId',
        label: 'Order ID',
        data: {
          id: 'orderId',
          label: 'Order ID',
          path: 'orders.orderId',
          fieldType: 'number',
        },
      }),
    );
  });
});
