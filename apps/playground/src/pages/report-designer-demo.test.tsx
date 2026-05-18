// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ReportDesignerDemo } from './report-designer-demo';

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('ReportDesignerDemo', () => {
  it('inserts a field into the selected cell through the field panel insert button', async () => {
    initFluxI18n();

    const { container } = render(<ReportDesignerDemo />);

    const firstCell = container.querySelector('td.ss-cell') as HTMLElement | null;
    expect(firstCell).toBeTruthy();

    fireEvent.click(firstCell!);
    const insertButton = screen.getByRole('button', {
      name: '将字段 Order ID 插入到当前选择',
    });

    await waitFor(() => {
      expect(insertButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(firstCell?.textContent).toContain('${orderId}');
      expect(firstCell?.hasAttribute('data-cell-bound')).toBe(true);
    });
  });
});
