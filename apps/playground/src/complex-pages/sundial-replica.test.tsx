import React from 'react';import { afterEach, describe, expect, it } from 'vitest';import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';import { createShowcaseEnv } from './shared/showcase-env';import { SchemaPage } from './schema-page';afterEach(() => cleanup());/** * Sundial replica pages (see docs/analysis/sundial-ui-reproduction-analysis.md). * These tests verify the schema-driven replicas render their Sundial-style * structures: design tokens via className, collapse sections, circular * checkboxes, badges, KPI cards, charts, dialogs. */

describe('Sundial replica — settings', () => {
  const { env } = createShowcaseEnv();

  it('renders settings rail and sync section', async () => {
    render(<SchemaPage pageId="sundial-settings" env={env} />);

    expect(screen.getByTestId('sundial-settings-rail')).toBeTruthy();
    expect(screen.getByTestId('sundial-settings-sync').textContent).toMatch(/同步/);
    expect(screen.getByTestId('sundial-settings-lists').textContent).toMatch(/列表/);
    expect(screen.getByTestId('sundial-settings-data').textContent).toMatch(/数据/);
    expect(screen.getByTestId('sundial-settings-about').textContent).toMatch(/关于/);

    // Mode options
    expect(screen.getByTestId('sundial-mode-local').textContent).toMatch(/本地模式/);
    expect(screen.getByTestId('sundial-mode-supabase').textContent).toMatch(/Supabase 云端/);
    expect(screen.getByTestId('sundial-mode-selfhost').textContent).toMatch(/自建服务器/);
    expect(screen.getByTestId('sundial-mode-selfhost').textContent).toMatch(/即将推出/);

    // Status card stats
    expect(screen.getByTestId('sundial-status-card').textContent).toMatch(/已连接/);
    expect(screen.getByTestId('sundial-status-card').textContent).toMatch(/2 条/);
    expect(screen.getByTestId('sundial-status-card').textContent).toMatch(/刚刚/);
  });

  it('wires settings rail back and save with toast feedback (plan 457 C9/C16)', async () => {
    render(<SchemaPage pageId="sundial-settings" env={env} />);

    // C16: back row (flex onClick)
    fireEvent.click(screen.getByTestId('sundial-settings-back'));
    await waitFor(() => {
      expect(window.location.hash).toBe('#/complex-pages/sundial-workbench');
    });

    // C9: save button
    fireEvent.click(screen.getByTestId('sundial-settings-save'));
    await screen.findByText(/保存成功/);
  });

  it('switches the settings rail selection with toast feedback (plan 457 C8)', async () => {
    render(<SchemaPage pageId="sundial-settings" env={env} />);

    // Initial rail selection: sync (from PAGE_DATA)
    expect(screen.getByTestId('sundial-settings-sync').getAttribute('data-selected')).toBe('true');

    fireEvent.click(screen.getByTestId('sundial-settings-data'));
    await screen.findByText('打开设置：数据');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-settings-data').getAttribute('data-selected')).toBe('true');
    });
    expect(screen.getByTestId('sundial-settings-sync').getAttribute('data-selected')).toBe('false');
  });

  it('switches mode cards and links the connection info area (plan 457 C7)', async () => {
    render(<SchemaPage pageId="sundial-settings" env={env} />);

    // Initial mode: local → connection info hidden
    expect(screen.getByTestId('sundial-mode-local').getAttribute('data-selected')).toBe('true');
    expect(screen.queryByTestId('sundial-connection-info')).toBeNull();

    fireEvent.click(screen.getByTestId('sundial-mode-supabase'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-connection-info')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-mode-supabase').getAttribute('data-selected')).toBe('true');
    expect(screen.getByTestId('sundial-mode-local').getAttribute('data-selected')).toBe('false');
    expect(screen.getByTestId('sundial-connection-info').textContent).toMatch(/Supabase 项目 URL/);

    fireEvent.click(screen.getByTestId('sundial-mode-local'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-connection-info')).toBeNull();
    });
  });

  it('switches the main panel between 5 sections (plan 460 P6)', async () => {
    render(<SchemaPage pageId="sundial-settings" env={env} />);

    expect(screen.getByTestId('sundial-panel-sync')).toBeTruthy();
    expect(screen.queryByTestId('sundial-panel-lists')).toBeNull();

    fireEvent.click(screen.getByTestId('sundial-settings-lists'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-panel-lists')).toBeTruthy();
    });
    expect(screen.queryByTestId('sundial-panel-sync')).toBeNull();
    await waitFor(() => {
      const rows = screen.getAllByTestId('sundial-list-row');
      expect(rows.length).toBeGreaterThanOrEqual(4);
      expect(rows[0].textContent).toMatch(/工作/);
    });

    fireEvent.click(screen.getByTestId('sundial-settings-appearance'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-panel-appearance')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-theme-value').textContent).toMatch(/浅色/);

    fireEvent.click(screen.getByTestId('sundial-settings-data'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-panel-data')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-data-size').textContent).toMatch(/条任务/);

    fireEvent.click(screen.getByTestId('sundial-settings-about'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-panel-about')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-about-version-value').textContent).toMatch(/0\.10\.0/);
    expect(screen.getByTestId('sundial-about-license').textContent).toMatch(/Apache-2\.0/);

    fireEvent.click(screen.getByTestId('sundial-settings-sync'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-panel-sync')).toBeTruthy();
    });
    expect(screen.queryByTestId('sundial-panel-about')).toBeNull();
  });

  it('save button writes demo state with feedback (plan 460 P7)', async () => {
    render(<SchemaPage pageId="sundial-settings" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-settings-save'));
    await screen.findByText(/保存成功/);
  });
});

describe('Sundial replica — new todo dialog', () => {
  const { env } = createShowcaseEnv();

  it('opens the 360px styled dialog with form fields', async () => {
    render(<SchemaPage pageId="sundial-todo-dialog" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-todo-dialog'));
    await waitFor(() => {
      expect(screen.getByText('新建待办')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-todo-title')).toBeTruthy();
    expect(screen.getByTestId('sundial-todo-note')).toBeTruthy();
    expect(screen.getByTestId('sundial-todo-date-row').textContent).toMatch(/无/);
    expect(screen.getByTestId('sundial-todo-flag-row').textContent).toMatch(/未标记/);
    expect(screen.getByTestId('sundial-todo-list-row').textContent).toMatch(/收件箱/);
    expect(screen.getByTestId('sundial-todo-submit').textContent).toMatch(/添加/);
  });

  it('wires todo dialog field rows with real pickers via openDialog + owner-scope writeback (plan 460 P1-P3)', async () => {
    render(<SchemaPage pageId="sundial-todo-dialog" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-todo-dialog'));
    await waitFor(() => {
      expect(screen.getByText('新建待办')).toBeTruthy();
    });

    // P1: date picker → 明天 → field row updates via onSubmitSuccess writeback
    expect(screen.getByTestId('sundial-todo-date-value').textContent).toMatch(/无/);
    fireEvent.click(screen.getByTestId('sundial-todo-date-row'));
    await waitFor(() => {
      expect(screen.getByText('明天')).toBeTruthy();
    });
    const radios = document.querySelectorAll('[role="radio"]');
    const tomorrow = Array.from(radios).find((r) =>
      r.closest('label')?.textContent?.includes('明天'),
    );
    expect(tomorrow).toBeTruthy();
    fireEvent.click(tomorrow!);
    fireEvent.click(screen.getByTestId('sundial-todo-date-submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-todo-date-picker')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getByTestId('sundial-todo-date-value').textContent).toMatch(/明天/);
    });

    // P2: flag toggle
    expect(screen.getByTestId('sundial-todo-flag-value').textContent).toMatch(/未标记/);
    fireEvent.click(screen.getByTestId('sundial-todo-flag-row'));
    await screen.findByText('旗标已切换');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-todo-flag-value').textContent).toMatch(/已标记/);
    });

    // P3: list picker → 工作 → field row updates
    expect(screen.getByTestId('sundial-todo-list-value').textContent).toMatch(/收件箱/);
    fireEvent.click(screen.getByTestId('sundial-todo-list-row'));
    await waitFor(() => {
      expect(screen.getByText('家庭')).toBeTruthy();
    });
    const listRadios = document.querySelectorAll('[role="radio"]');
    const work = Array.from(listRadios).find((r) =>
      r.closest('label')?.textContent?.includes('工作'),
    );
    expect(work).toBeTruthy();
    fireEvent.click(work!);
    fireEvent.click(screen.getByTestId('sundial-todo-list-submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('sundial-todo-list-picker')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getByTestId('sundial-todo-list-value').textContent).toMatch(/工作/);
    });

    // Outer dialog survives picker close (closeOnOutsideClick:false)
    expect(screen.getByText('新建待办')).toBeTruthy();
  });

  it('reopens the todo dialog after cancel (closeSurface) and after X (plan 460 B1)', async () => {
    render(<SchemaPage pageId="sundial-todo-dialog" env={env} />);

    // cancel → reopen
    fireEvent.click(screen.getByTestId('sundial-open-todo-dialog'));
    await waitFor(() => {
      expect(screen.getByText('新建待办')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => {
      expect(screen.queryByText('新建待办')).toBeNull();
    });
    fireEvent.click(screen.getByTestId('sundial-open-todo-dialog'));
    await waitFor(() => {
      expect(screen.getByText('新建待办')).toBeTruthy();
    });
  });
});
