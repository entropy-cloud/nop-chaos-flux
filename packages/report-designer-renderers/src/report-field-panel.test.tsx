// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ReportFieldPanel } from './report-field-panel.js';

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
});
