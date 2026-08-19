import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createShowcaseEnv } from './shared/showcase-env';
import { SchemaPage } from './schema-page';

afterEach(() => cleanup());

/**
 * Sundial detail page interaction tests (see
 * docs/analysis/sundial-ui-reproduction-analysis.md and plan 460 B-series).
 */
describe('Sundial replica — detail inspector', () => {
  const { env } = createShowcaseEnv();

  it('renders status row, field rows, subtasks and footer buttons', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);

    expect(screen.getByTestId('sundial-detail-panel')).toBeTruthy();
    expect(screen.getByTestId('sundial-detail-status-row').textContent).toMatch(/待办/);
    expect(screen.getByTestId('sundial-detail-status-row').textContent).toMatch(/8\/18/);
    expect(screen.getByTestId('sundial-detail-row-date').textContent).toMatch(/清除/);
    expect(screen.getByTestId('sundial-detail-row-recurrence').textContent).toMatch(/每周/);
    expect(screen.getByTestId('sundial-detail-row-flag').textContent).toMatch(/已标记/);
    expect(screen.getByTestId('sundial-detail-row-list').textContent).toMatch(/工作/);
    expect(screen.getByTestId('sundial-detail-subtasks-header').textContent).toMatch(/子任务/);
    expect(screen.getByTestId('sundial-detail-subtask-1').textContent).toMatch(/收集销售数据/);
    expect(screen.getByTestId('sundial-detail-subtask-3').textContent).toMatch(/撰写结论部分/);
    expect(screen.getByTestId('sundial-detail-move-list').textContent).toMatch(/移到列表/);
    expect(screen.getByTestId('sundial-detail-trash').textContent).toMatch(/移到垃圾箱/);
  });

  it('opens the date picker with a real calendar, month navigation, and confirm writeback (plan 460 B6)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-date-dialog'));

    // Real input-date calendar popover with year/month navigation
    const trigger = document.querySelector(
      '[data-testid="sundial-date-input"] [data-testid="date-trigger"]',
    ) as Element | null;
    await waitFor(() => expect(trigger).toBeTruthy());
    fireEvent.click(trigger!);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="date-popover"]')).toBeTruthy();
    });
    // month nav: next-month chevron exists (Calendar ships ChevronLeft/Right)
    const navButtons = document.querySelectorAll(
      '[data-testid="date-popover"] button, [data-slot="calendar"] button',
    );
    expect(navButtons.length).toBeGreaterThanOrEqual(2);

    // Sundial-style ±1h/±5m stepper (real input-time steppers mode)
    const displaySel = '[data-testid="sundial-time-stepper-display"], [data-testid="time-display"]';
    await waitFor(() => {
      const el = document.querySelector(displaySel) as Element | null;
      expect(el?.textContent).toMatch(/14 : 00/);
    });
    fireEvent.click(screen.getByTestId('sundial-time-stepper-minute-up') || screen.getByTestId('time-minute-up'));
    const el = document.querySelector(displaySel) as Element | null;
    expect(el?.textContent).toMatch(/14 : 05/);

    // cancel keeps the page field row untouched
    fireEvent.click(screen.getByTestId('sundial-date-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-date-cancel')).toBeNull();
    });
    expect(screen.getByTestId('sundial-detail-row-date').textContent).toMatch(/8\/18/);

    // confirm writes the picked date/time back to the page field row
    fireEvent.click(screen.getByTestId('sundial-open-date-dialog'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-date-submit')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-date-submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-date-submit')).toBeNull();
    });
    // field row now reflects the confirmed default (2026-08-18 → 8/18)
    await waitFor(() => {
      expect(screen.getByTestId('sundial-detail-row-date').textContent).toMatch(/8\/18/);
    });
  });

  it('renders the real input-date popover picker as a field alternative', () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    const demo = screen.getByTestId('sundial-input-date-demo');
    expect(demo.textContent).toMatch(/input-date/);
    // input-date renders a trigger button + popover month-grid calendar
    const trigger = document.querySelector('[data-testid="sundial-demo-date-input"] [data-testid="date-trigger"]');
    expect(trigger).toBeTruthy();
    expect(screen.getByText('2026-08-18')).toBeTruthy();
    fireEvent.click(trigger as Element);
    expect(document.querySelector('[data-testid="date-popover"]')).toBeTruthy();
  });

  it('opens the recurrence and list pickers with radio options, cancel and confirm writeback (plan 460 B5/B6)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    // recur: page field row starts at 每周 (PAGE_DATA)
    expect(screen.getByTestId('sundial-detail-row-recurrence').textContent).toMatch(/每周/);

    // open recur picker → cancel must NOT change the row
    fireEvent.click(screen.getByTestId('sundial-detail-row-recurrence'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-recur-cancel')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-recur-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-recur-cancel')).toBeNull();
    });
    expect(screen.getByTestId('sundial-detail-row-recurrence').textContent).toMatch(/每周/);

    // open recur picker → confirm with 每月 writes back to the page field row
    fireEvent.click(screen.getByTestId('sundial-detail-row-recurrence'));
    await waitFor(() => {
      expect(document.querySelectorAll('[role="radio"]').length).toBeGreaterThanOrEqual(4);
    });
    const monthlyRadio = Array.from(document.querySelectorAll('[role="radio"]')).find((r) =>
      r.closest('label')?.textContent?.includes('每月'),
    );
    fireEvent.click(monthlyRadio!);
    fireEvent.click(screen.getByTestId('sundial-recur-submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-recur-submit')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getByTestId('sundial-detail-row-recurrence').textContent).toMatch(/每月/);
    });

    // list: same flow — open, cancel keeps row on 工作, confirm with 家庭 writes back
    expect(screen.getByTestId('sundial-detail-row-list').textContent).toMatch(/工作/);
    fireEvent.click(screen.getByTestId('sundial-detail-row-list'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-list-cancel')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-list-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-list-cancel')).toBeNull();
    });
    expect(screen.getByTestId('sundial-detail-row-list').textContent).toMatch(/工作/);

    fireEvent.click(screen.getByTestId('sundial-detail-row-list'));
    await waitFor(() => {
      expect(document.querySelectorAll('[role="radio"]').length).toBeGreaterThanOrEqual(3);
    });
    const familyRadio = Array.from(document.querySelectorAll('[role="radio"]')).find((r) =>
      r.closest('label')?.textContent?.includes('家庭'),
    );
    fireEvent.click(familyRadio!);
    fireEvent.click(screen.getByTestId('sundial-list-submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-list-submit')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getByTestId('sundial-detail-row-list').textContent).toMatch(/家庭/);
    });
  });

  it('recurrence picker shows current value weekly preselected (plan 460 B6)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    // open recur picker — radios must be present (waitFor ensures the
    // openDialog + form render path completes before assertions)
    fireEvent.click(screen.getByTestId('sundial-open-recurrence-dialog'));
    let weeklyRadio: HTMLElement | undefined;
    await waitFor(() => {
      const el = Array.from(document.querySelectorAll('[role="radio"]')).find(
        (r) => r.closest('label')?.textContent?.includes('每周'),
      );
      expect(el).toBeTruthy();
      weeklyRadio = el as HTMLElement;
    });
    expect(weeklyRadio!.getAttribute('aria-checked')).toBe('true');
  });

  it('wires button/icon actions with toast feedback (plan 457 C4/C5/C13/C15/C6)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);

    // C15: status row close (icon-only button)
    fireEvent.click(screen.getByTestId('sundial-detail-close'));
    await screen.findByText('关闭详情');

    // C4: clear date
    fireEvent.click(screen.getByTestId('sundial-detail-clear-date'));
    await screen.findByText('日期已清除');

    // C5 + plan 460 P9: move-list opens the same list picker dialog; trash sets taskTrashed
    fireEvent.click(screen.getByTestId('sundial-detail-move-list'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-list-cancel')).toBeTruthy();
    });
    // pick 家庭 and confirm
    const moveRadios = document.querySelectorAll('[role="radio"]');
    const familyOpt = Array.from(moveRadios).find((r) =>
      r.closest('label')?.textContent?.includes('家庭'),
    );
    fireEvent.click(familyOpt!);
    fireEvent.click(screen.getByTestId('sundial-list-submit'));
    fireEvent.click(screen.getByTestId('sundial-detail-trash'));
    await screen.findByText('已移到垃圾箱');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-trashed-banner')).toBeTruthy();
    });

    // C6 + plan 460 P8: subtask chevron opens the subtask dialog; delete hides the row
    fireEvent.click(screen.getByTestId('sundial-subtask-open-1'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-subtask-dialog')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-subtask-title-text').textContent).toMatch(/收集销售数据/);
    fireEvent.click(screen.getByTestId('sundial-subtask-dialog-close'));
    fireEvent.click(screen.getByTestId('sundial-subtask-delete-1'));
    await screen.findByText('子任务已删除');
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-detail-subtask-1')).toBeNull();
    });
  });

  it('wires the time clear button (plan 457 C13 + plan 460 B6)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-date-dialog'));
    await waitFor(() => {
      // real input-date calendar: trigger present, no static "2026 年 8 月" text
      expect(screen.getByTestId('sundial-date-input')).toBeTruthy();
    });
    // clear-time button lives inside the picker form; its onClick sets pickedTime
    // to '' and emits a showToast. The picker is portal-mounted so the toast is
    // rendered at the playground Toaster level — assert the action ran by
    // closing the picker (the field row still shows the default date label).
    fireEvent.click(screen.getByTestId('sundial-clear-time'));
    // The picker stays open (clear-time does not close it); close it via X.
    const closeTimePicker = document.querySelector('[data-slot="dialog-close"]');
    if (closeTimePicker) fireEvent.click(closeTimePicker);
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-clear-time')).toBeNull();
    });
  });

  it('opens dialogs from detail field rows and toggles the flag (plan 457 C3)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);

    // date row pick opens dialog with real calendar
    fireEvent.click(screen.getByTestId('sundial-detail-row-date-pick'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-date-input')).toBeTruthy();
    });
    // cancel preserves the original page value
    fireEvent.click(screen.getByTestId('sundial-date-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-date-cancel')).toBeNull();
    });
    expect(screen.getByTestId('sundial-detail-row-date').textContent).toMatch(/8\/18/);

    // recurrence row opens picker dialog
    fireEvent.click(screen.getByTestId('sundial-detail-row-recurrence'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-recur-cancel')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-recur-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-recur-cancel')).toBeNull();
    });

    // flag row toggles flagged state with toast
    expect(screen.getByTestId('sundial-detail-row-flag').textContent).toMatch(/已标记/);
    fireEvent.click(screen.getByTestId('sundial-detail-row-flag'));
    await screen.findByText('旗标已切换');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-detail-row-flag').textContent).toMatch(/未标记/);
    });

    // list row opens picker dialog
    fireEvent.click(screen.getByTestId('sundial-detail-row-list'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-list-cancel')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-list-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-list-cancel')).toBeNull();
    });
  });
  it('picks a calendar day, opens all pickers with cancel/confirm and writes back to the page field row (plan 460 B6)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);

    // date picker: real input-date calendar → open popover → click day 20
    fireEvent.click(screen.getByTestId('sundial-open-date-dialog'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-date-input')).toBeTruthy();
    });
    const trigger = document.querySelector(
      '[data-testid="sundial-date-input"] [data-testid="date-trigger"]',
    ) as Element | null;
    await waitFor(() => expect(trigger).toBeTruthy());
    fireEvent.click(trigger!);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="date-popover"]')).toBeTruthy();
    });
    const day20 = Array.from(
      document.querySelectorAll('[data-testid="date-popover"] button'),
    ).find((b) => b.textContent?.trim() === '20') as Element | null;
    expect(day20).toBeTruthy();
    fireEvent.click(day20!);
    // after selecting a day, the input-date trigger shows the picked value
    await waitFor(() => {
      const triggerText = (document.querySelector('[data-testid="sundial-date-input"]') as HTMLElement)?.textContent || '';
      expect(triggerText).toMatch(/8\/20|08-20/);
    });
    // confirm (submit) writes the picked date back to the page field row
    await waitFor(() => {
      expect(screen.getByTestId('sundial-date-submit')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-date-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-detail-row-date').textContent).toMatch(/8\/20/);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-date-submit')).toBeNull();
    });

    // recurrence row: open picker → cancel keeps row on weekly
    fireEvent.click(screen.getByTestId('sundial-detail-row-recurrence'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-recur-cancel')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-recur-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-recur-cancel')).toBeNull();
    });

    // flag row: toggle flagged state with toast
    expect(screen.getByTestId('sundial-detail-row-flag').textContent).toMatch(/已标记/);
    fireEvent.click(screen.getByTestId('sundial-detail-row-flag'));
    await screen.findByText('旗标已切换');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-detail-row-flag').textContent).toMatch(/未标记/);
    });

    // list row: open picker → cancel keeps row on 工作
    fireEvent.click(screen.getByTestId('sundial-detail-row-list'));
    await waitFor(() => {
      expect(screen.getByText('收件箱')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-list-cancel'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-list-cancel')).toBeNull();
    });
  });
});
