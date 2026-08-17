import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createShowcaseEnv } from './shared/showcase-env';
import { SchemaPage } from './schema-page';

afterEach(() => cleanup());

/**
 * Sundial replica pages (see docs/analysis/sundial-ui-reproduction-analysis.md).
 * These tests verify the schema-driven replicas render their Sundial-style
 * structures: design tokens via className, collapse sections, circular
 * checkboxes, badges, KPI cards, charts, dialogs.
 */
describe('Sundial replica — workbench', () => {
  const { env } = createShowcaseEnv();

  it('renders sidebar, pressure rail and grouped sections', async () => {
    render(<SchemaPage pageId="sundial-workbench" env={env} />);

    // Sidebar: brand, nav rows, view rows
    expect(screen.getByTestId('sundial-sidebar')).toBeTruthy();
    expect(screen.getByText('Sundial')).toBeTruthy();
    expect(screen.getAllByText('工作台').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('分析')).toBeTruthy();
    expect(screen.getByText('垃圾箱')).toBeTruthy();
    expect(screen.getByText('本地模式')).toBeTruthy();

    // Pressure card: rail segments + legend counts
    expect(screen.getByTestId('sundial-pressure-card').textContent).toMatch(/总计/);
    expect(screen.getByTestId('sundial-pressure-card').textContent).toMatch(/未来 7 天/);

    // Five accordion sections with tone titles + counts
    expect(screen.getAllByText('逾期').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('未来 7 天').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('待整理')).toBeTruthy();

    // Task rows with titles and badges
    expect(screen.getByTestId('sundial-task-overdue-1').textContent).toMatch(/整理季度报税材料/);
    expect(screen.getByTestId('sundial-task-today-1').textContent).toMatch(/给项目经理回电话/);
    expect(screen.getByTestId('sundial-task-today-1').textContent).toMatch(/已完成 8\/16/);
    expect(screen.getByTestId('sundial-task-future-1').textContent).toMatch(/预约牙医检查/);
    expect(screen.getByTestId('sundial-task-future-2').textContent).toMatch(/8\/19/);

    // Collapse sections driven by semantic tone/count (markers, not CSS hacks)
    const overdueTrigger = document.querySelector(
      '[data-testid="sundial-section-overdue"] [data-slot="collapse-trigger"]',
    );
    expect(overdueTrigger?.getAttribute('data-tone')).toBe('danger');
    expect(overdueTrigger?.querySelector('[data-slot="collapse-count"]')?.textContent).toBe('1');
    const todayTrigger = document.querySelector(
      '[data-testid="sundial-section-today"] [data-slot="collapse-trigger"]',
    );
    expect(todayTrigger?.getAttribute('data-tone')).toBe('brand');
    expect(todayTrigger?.querySelector('[data-slot="collapse-count"]')?.textContent).toBe('2');

    // Circular checkboxes rendered (base-ui checkbox buttons)
    const checkboxes = document.querySelectorAll(
      '[data-testid="sundial-workbench-page"] [data-slot="checkbox"]',
    );
    expect(checkboxes.length).toBeGreaterThanOrEqual(7);
    // shape="circle" passed through to the ui control
    expect(document.querySelector('[data-testid="sundial-cb-t1"] [data-slot="checkbox"]')?.getAttribute('data-shape')).toBe('circle');
  });

  it('wires the sidebar settings icon with toast feedback (plan 457 C2)', async () => {
    render(<SchemaPage pageId="sundial-workbench" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-settings-icon'));
    await screen.findByText('打开设置');
  });

  it('opens the new-todo dialog from the 添加待办 button', async () => {
    render(<SchemaPage pageId="sundial-workbench" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-add-todo'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-workbench-todo-title')).toBeTruthy();
    });
    expect(screen.getByText('新建待办')).toBeTruthy();
    expect(screen.getByTestId('sundial-workbench-todo-submit')).toBeTruthy();
  });

  it('switches nav/view selected state with toast feedback (plan 457 C1)', async () => {
    render(<SchemaPage pageId="sundial-workbench" env={env} />);

    // Initial state from PAGE_DATA: workbench + all selected
    expect(screen.getByTestId('sundial-nav-workbench').getAttribute('data-selected')).toBe('true');
    expect(screen.getByTestId('sundial-nav-lists').getAttribute('data-selected')).toBe('false');
    expect(screen.getByTestId('sundial-view-all').getAttribute('data-selected')).toBe('true');

    fireEvent.click(screen.getByTestId('sundial-nav-lists'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-nav-lists').getAttribute('data-selected')).toBe('true');
    });
    expect(screen.getByTestId('sundial-nav-workbench').getAttribute('data-selected')).toBe('false');

    fireEvent.click(screen.getByTestId('sundial-view-today'));
    await screen.findByText('视图：今天');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-view-today').getAttribute('data-selected')).toBe('true');
    });
    expect(screen.getByTestId('sundial-view-all').getAttribute('data-selected')).toBe('false');
  });

  it('wires task rows with toast feedback (plan 457 C14)', async () => {
    render(<SchemaPage pageId="sundial-workbench" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-task-today-1'));
    await screen.findByText('打开详情（占位反馈）');
  });

  it('switches to the mobile variant when the viewport matches max:lg', () => {
    // jsdom has no matchMedia → default (desktop) tree renders first.
    render(<SchemaPage pageId="sundial-workbench" env={env} />);
    const desktopShell = document.querySelector('[data-testid="sundial-shell"]');
    expect(desktopShell?.getAttribute('data-active-variant')).toBe('desktop');
    expect(screen.getByTestId('sundial-sidebar')).toBeTruthy();
    cleanup();

    // Simulate a narrow viewport: install matchMedia matching max-width 1023px.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 1023px)',
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));

    render(<SchemaPage pageId="sundial-workbench" env={env} />);
    expect(document.querySelector('[data-testid="sundial-shell"]')?.getAttribute('data-active-variant')).toBe('mobile');
    expect(document.querySelector('[data-testid="sundial-mobile-view"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="sundial-sidebar"]')).toBeNull();
  });
});

describe('Sundial replica — analytics', () => {
  const { env } = createShowcaseEnv();

  it('renders KPI cards from Sundial__summary data-source', async () => {
    render(<SchemaPage pageId="sundial-analytics" env={env} />);
    await waitFor(() => {
      expect(screen.getByTestId('sundial-kpi-today').textContent).toMatch(/6/);
    });
    expect(screen.getByTestId('sundial-kpi-streak').textContent).toMatch(/4/);
    expect(screen.getByTestId('sundial-kpi-energy').textContent).toMatch(/32/);
    expect(screen.getByTestId('sundial-kpi-rate').textContent).toMatch(/68%/);
    expect(screen.getByTestId('sundial-encouragement').textContent).toMatch(/连续 4 天/);
  });

  it('renders trend/energy charts and pressure legend with bucket counts', async () => {
    render(<SchemaPage pageId="sundial-analytics" env={env} />);
    await waitFor(() => {
      expect(screen.getByTestId('sundial-trend-chart')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-energy-chart')).toBeTruthy();
    expect(screen.getByTestId('sundial-pressure-chart')).toBeTruthy();

    // Legend counts from Sundial__pressure
    await waitFor(() => {
      expect(screen.getByTestId('sundial-legend-overdue').textContent).toMatch(/3/);
      expect(screen.getByTestId('sundial-legend-today').textContent).toMatch(/5/);
      expect(screen.getByTestId('sundial-legend-future').textContent).toMatch(/4/);
      expect(screen.getByTestId('sundial-legend-none').textContent).toMatch(/2/);
    });

    // Output structure badge
    await waitFor(() => {
      expect(screen.getByTestId('sundial-output-badge').textContent).toMatch(/32 点/);
    });
  });
});

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

  it('opens the date picker dialog with a real input-time stepper', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-date-dialog'));
    await waitFor(() => {
      expect(screen.getByText('2026 年 8 月')).toBeTruthy();
    });
    // Sundial-style ±1h/±5m stepper (real input-time steppers mode)
    await waitFor(() => {
      expect(screen.getByTestId('sundial-time-stepper-display').textContent).toMatch(/14 : 00/);
    });
    fireEvent.click(screen.getByTestId('sundial-time-stepper-minute-up'));
    expect(screen.getByTestId('sundial-time-stepper-display').textContent).toMatch(/14 : 05/);
    fireEvent.click(screen.getByTestId('sundial-time-stepper-hour-down'));
    expect(screen.getByTestId('sundial-time-stepper-display').textContent).toMatch(/13 : 05/);
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

  it('opens the recurrence picker and list picker dialogs', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-recurrence-dialog'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-recur-weekly')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-recur-weekly').textContent).toMatch(/每周/);
    expect(screen.getByTestId('sundial-recur-none').textContent).toMatch(/不重复/);

    fireEvent.click(screen.getByTestId('sundial-recur-close'));
    fireEvent.click(screen.getByTestId('sundial-open-list-dialog'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-list-option-work').textContent).toMatch(/工作/);
    });
    expect(screen.getByTestId('sundial-list-option-inbox').textContent).toMatch(/收件箱/);
  });

  it('wires button/icon actions with toast feedback (plan 457 C4/C5/C13/C15/C6)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);

    // C15: status row close (icon-only button)
    fireEvent.click(screen.getByTestId('sundial-detail-close'));
    await screen.findByText('关闭详情');

    // C4: clear date
    fireEvent.click(screen.getByTestId('sundial-detail-clear-date'));
    await screen.findByText('日期已清除');

    // C5: move list / trash
    fireEvent.click(screen.getByTestId('sundial-detail-move-list'));
    await screen.findByText('已选择目标列表');
    fireEvent.click(screen.getByTestId('sundial-detail-trash'));
    await screen.findByText('已移到垃圾箱');

    // C6: subtask chevron / trash (icon-only buttons)
    fireEvent.click(screen.getByTestId('sundial-subtask-open-1'));
    await screen.findByText('打开子任务详情');
    fireEvent.click(screen.getByTestId('sundial-subtask-delete-1'));
    await screen.findByText('删除子任务');
  });

  it('wires the time clear button with toast feedback (plan 457 C13)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-date-dialog'));
    await waitFor(() => {
      expect(screen.getByText('2026 年 8 月')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-clear-time'));
    await screen.findByText('时间已清除');
  });

  it('opens dialogs from detail field rows and toggles the flag (plan 457 C3)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);

    // 清除 must not open the date dialog (no bubbling from the pick area)
    fireEvent.click(screen.getByTestId('sundial-detail-clear-date'));
    await screen.findByText('日期已清除');
    expect(screen.queryByText('2026 年 8 月')).toBeNull();

    // pick area opens the date dialog
    fireEvent.click(screen.getByTestId('sundial-detail-row-date-pick'));
    await waitFor(() => {
      expect(screen.getByText('2026 年 8 月')).toBeTruthy();
    });

    // recurrence row opens the recurrence dialog
    fireEvent.click(screen.getByTestId('sundial-detail-row-recurrence'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-recur-weekly')).toBeTruthy();
    });

    // flag row toggles flagged state with toast
    expect(screen.getByTestId('sundial-detail-row-flag').textContent).toMatch(/已标记/);
    fireEvent.click(screen.getByTestId('sundial-detail-row-flag'));
    await screen.findByText('旗标已切换');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-detail-row-flag').textContent).toMatch(/未标记/);
    });

    // list row opens the list dialog
    fireEvent.click(screen.getByTestId('sundial-detail-row-list'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-list-option-work')).toBeTruthy();
    });
  });

  it('switches recurrence/list option selected state (plan 457 C11/C12)', async () => {
    render(<SchemaPage pageId="sundial-detail" env={env} />);

    // Initial recur selection: weekly (from PAGE_DATA)
    fireEvent.click(screen.getByTestId('sundial-detail-row-recurrence'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-recur-weekly')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-recur-weekly').getAttribute('data-selected')).toBe('true');
    expect(screen.getByTestId('sundial-recur-daily').getAttribute('data-selected')).toBe('false');

    fireEvent.click(screen.getByTestId('sundial-recur-daily'));
    await screen.findByText('重复：每天');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-recur-daily').getAttribute('data-selected')).toBe('true');
    });
    expect(screen.getByTestId('sundial-recur-weekly').getAttribute('data-selected')).toBe('false');

    fireEvent.click(screen.getByTestId('sundial-recur-close'));
    fireEvent.click(screen.getByTestId('sundial-detail-row-list'));
    await waitFor(() => {
      expect(screen.getByTestId('sundial-list-option-work')).toBeTruthy();
    });
    expect(screen.getByTestId('sundial-list-option-work').getAttribute('data-selected')).toBe('true');

    fireEvent.click(screen.getByTestId('sundial-list-option-family'));
    await screen.findByText('列表：家庭');
    await waitFor(() => {
      expect(screen.getByTestId('sundial-list-option-family').getAttribute('data-selected')).toBe('true');
    });
    expect(screen.getByTestId('sundial-list-option-work').getAttribute('data-selected')).toBe('false');
  });
});

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
    await screen.findByText('返回');

    // C9: save button
    fireEvent.click(screen.getByTestId('sundial-settings-save'));
    await screen.findByText('保存成功');
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

  it('wires todo dialog field rows with toast feedback (plan 457 C10)', async () => {
    render(<SchemaPage pageId="sundial-todo-dialog" env={env} />);
    fireEvent.click(screen.getByTestId('sundial-open-todo-dialog'));
    await waitFor(() => {
      expect(screen.getByText('新建待办')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('sundial-todo-date-row'));
    await screen.findByText('选择日期（占位反馈）');
    fireEvent.click(screen.getByTestId('sundial-todo-flag-row'));
    await screen.findByText('切换旗标（占位反馈）');
    fireEvent.click(screen.getByTestId('sundial-todo-list-row'));
    await screen.findByText('选择列表（占位反馈）');
  });
});
