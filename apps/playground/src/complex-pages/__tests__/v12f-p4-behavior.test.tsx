import React from 'react';
import { Toaster } from '@nop-chaos/ui';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createShowcaseEnv } from '../shared/showcase-env';
import { SchemaPage } from '../schema-page';

afterEach(() => cleanup());

/**
 * V12f plan 488 Phase 4 — behavioral coverage for the schema-wave fixes.
 */

describe('V12f P4 behavior — workbench search consumption (G7-R2-视角11-07)', () => {
  it('typing in the sidebar search filters the board task rows', async () => {
    const { env } = createShowcaseEnv();
    render(
      <>
        <SchemaPage pageId="sundial-workbench" env={env} />
        <Toaster />
      </>
    );

    // board rows come from the todos source (⑦ residual: rows follow the DB)
    await screen.findByTestId('sundial-task-today-1');
    expect(screen.getByTestId('sundial-task-future-2')).toBeTruthy();

    const search = document.getElementById('search-control') as HTMLInputElement | null;
    expect(search).toBeTruthy();
    fireEvent.change(search!, { target: { value: '牙医' } });

    // only the 牙医 row survives; today rows are filtered out entirely
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-task-today-1')).toBeNull();
    });
    expect(screen.getByTestId('sundial-task-future-1')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-task-future-2')).toBeNull();
    });
  });

  it('sidebar and pressure-card counts reflect the seeded task DB', async () => {
    const { env } = createShowcaseEnv();
    render(
      <>
        <SchemaPage pageId="sundial-workbench" env={env} />
        <Toaster />
      </>
    );
    // 工作台 nav count = non-trashed total (9 of 10 seeded, 1 trashed)
    await waitFor(() => {
      expect(screen.getByTestId('sundial-nav-workbench').textContent).toMatch(/工作台9/);
    });
    // 已完成 view count = done tasks (2)
    await waitFor(() => {
      expect(screen.getByTestId('sundial-view-completed').textContent).toMatch(/已完成2/);
    });
    // pressure legend total = active tasks (7)
    await waitFor(() => {
      expect(screen.getByTestId('sundial-pressure-card').textContent).toMatch(/总计7/);
    });
  });
});

describe('V12f P4 behavior — detail subtask add (G7-视角11-14)', () => {
  it('adding a subtask posts through the mock channel and lands in the backend', async () => {
    const { env, db } = createShowcaseEnv();
    render(
      <>
        <SchemaPage pageId="sundial-detail" env={env} />
        <Toaster />
      </>
    );

    const input = document.getElementById('subtaskAddTitle-control') as HTMLInputElement | null;
    expect(input).toBeTruthy();
    fireEvent.change(input!, { target: { value: 'V12f 新子任务' } });
    fireEvent.click(screen.getByTestId('sundial-detail-subtask-add-submit'));

    await screen.findByText('子任务已添加');
    await waitFor(() => {
      expect(db.sundialSubtasks.some((st) => st.title === 'V12f 新子任务')).toBe(true);
    });
    // input is cleared after the submit
    await waitFor(() => {
      expect((document.getElementById('subtaskAddTitle-control') as HTMLInputElement).value).toBe('');
    });
  });

  it('subtask dialog shows the row-matching title (G7-R2-视角11-04)', async () => {
    const { env } = createShowcaseEnv();
    render(
      <>
        <SchemaPage pageId="sundial-detail" env={env} />
        <Toaster />
      </>
    );
    fireEvent.click(screen.getByTestId('sundial-subtask-open-2'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-subtask-dialog')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-subtask-title-text').textContent).toMatch(/整理 OKR 回顾/);
  });
});

describe('V12f P4 behavior — settings sync mode linkage (G7-视角11-12, G7-视角6-11)', () => {
  it('status card flips from 本地模式 to Supabase when the mode card is clicked', async () => {
    const { env } = createShowcaseEnv();
    render(
      <>
        <SchemaPage pageId="sundial-settings" env={env} />
        <Toaster />
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sundial-status-card').textContent).toMatch(/本地模式/);
    });
    fireEvent.click(screen.getByTestId('sundial-mode-supabase'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-status-card').textContent).toMatch(/Supabase/);
      expect(screen.getByTestId('sundial-status-card').textContent).toMatch(/已连接/);
    });
  });

  it('anon key input is a password field with a functional reveal toggle (G7-视角6-11)', async () => {
    const { env } = createShowcaseEnv();
    // supabase mode renders the connection info block
    render(
      <>
        <SchemaPage pageId="sundial-settings" env={env} />
        <Toaster />
      </>
    );
    fireEvent.click(screen.getByTestId('sundial-mode-supabase'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-connection-info')).toBeTruthy();
    });
    const keyWrap = screen.getByTestId('sundial-supabase-key');
    const input = keyWrap.querySelector('input');
    expect(input?.type).toBe('password');
    expect(keyWrap.querySelector('[data-slot="input-password-reveal"]')).toBeTruthy();
  });
});

describe('V12f P4 behavior — master-detail add gating (G7-R2-视角11-03)', () => {
  it('新增明细 is disabled without an order and enabled after selecting one', async () => {
    const { env } = createShowcaseEnv();
    render(
      <>
        <SchemaPage pageId="master-detail" env={env} />
        <Toaster />
      </>
    );
    await screen.findByText(/NO-20240701\b/);

    const addBtn = screen.getByTestId('btn-add-item') as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: /NO-20240701\b/ }));
    await waitFor(() => {
      expect((screen.getByTestId('btn-add-item') as HTMLButtonElement).disabled).toBe(false);
    });
  });
});

describe('V12f P4 behavior — complex-form save status flag (G7-R4-视角3-01)', () => {
  it('shows 已保存 only while values match the last save, flips back on edits', async () => {
    const { env } = createShowcaseEnv();
    render(
      <>
        <SchemaPage pageId="complex-form" env={env} />
        <Toaster />
      </>
    );

    const report = () => screen.getByTestId('complex-form-report').textContent ?? '';
    expect(report()).toMatch(/未保存/);

    const nameInput = document.getElementById('name-control') as HTMLInputElement;
    const emailInput = document.getElementById('email-control') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '张测试' } });
    fireEvent.change(emailInput, { target: { value: 'zhang@test.dev' } });
    // phone is required while notify stays on — satisfy it
    fireEvent.change(document.getElementById('phone-control') as HTMLInputElement, {
      target: { value: '13800000000' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    const submit = screen.getByTestId('complex-form-submit') as HTMLButtonElement;
    await waitFor(() => expect(submit.disabled).toBe(false));
    fireEvent.click(submit);

    await waitFor(() => {
      expect(report()).toMatch(/已保存 ✓/);
    });

    // editing after the save must NOT keep claiming 已保存
    fireEvent.change(nameInput, { target: { value: '张测试二' } });
    await waitFor(() => {
      expect(report()).toMatch(/已修改，未重新保存/);
    });
  });
});
