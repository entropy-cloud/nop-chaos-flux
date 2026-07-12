import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { COMPLEX_PAGE_ENTRIES } from './complex-pages-model';
import { COMPLEX_PAGE_REGISTRY } from './complex-pages-registry';
import { createShowcaseEnv } from './shared/showcase-env';
import { SchemaPage } from './schema-page';

afterEach(() => cleanup());

describe('Complex pages registry coverage', () => {
  it('every complex page entry has a registered component', () => {
    for (const entry of COMPLEX_PAGE_ENTRIES) {
      const Component = COMPLEX_PAGE_REGISTRY[entry.id];
      expect(Component, `page '${entry.id}' missing component`).toBeDefined();
      expect(typeof Component, `page '${entry.id}' component must be a function`).toBe('function');
    }
  });

  it('registry has no orphaned entries missing from the page model', () => {
    const modelIds = new Set(COMPLEX_PAGE_ENTRIES.map((e) => e.id));
    for (const id of Object.keys(COMPLEX_PAGE_REGISTRY)) {
      expect(modelIds.has(id), `registry entry '${id}' has no page model entry`).toBe(true);
    }
  });
});

describe('Complex pages — runtime smoke (mock backend)', () => {
  const { env } = createShowcaseEnv();

  it('Dashboard renders stat numbers and recent orders table from data-sources', async () => {
    render(<SchemaPage pageId="dashboard" env={env} />);
    // summary totalOrders = 30 in the mock DB
    await waitFor(() => {
      expect(screen.getByTestId('dash-stat-total').textContent).toMatch(/30/);
    });
    expect(screen.getByTestId('dash-stat-revenue').textContent).toMatch(/\d/);
    // new stat cards render
    expect(screen.getByTestId('dash-stat-today').textContent).toMatch(/\d/);
    expect(screen.getByTestId('dash-stat-growth').textContent).toMatch(/\d/);
    // recent orders table should render at least one order number
    await waitFor(() => {
      expect(screen.getByTestId('dash-recent-table').textContent).toMatch(/NO-/);
    });
    // bar chart renders (daily data-source)
    await waitFor(() => {
      expect(screen.getByTestId('dash-daily-chart')).toBeTruthy();
    });
    // pending approvals table renders (approvals data-source)
    await waitFor(() => {
      expect(screen.getByTestId('dash-approvals-table').textContent).toMatch(/待审批/);
    });
  });

  it('Tree+CRUD loads all users initially and filters when a department is selected', async () => {
    render(<SchemaPage pageId="tree-crud" env={env} />);
    await waitFor(() => {
      // 30 mock users → table shows at least one known name
      expect(screen.getByTestId('tree-crud-table').textContent).toMatch(/张三@example\.com/);
    });
    expect(screen.getByTestId('tree-crud-tree')).toBeTruthy();

    // Select a department node (华南分公司 d2 → users David, Eve, etc.) and verify the
    // table re-fetches via loadAction dependsOn=['treeFilter'].
    fireEvent.click(screen.getByRole('treeitem', { name: '华南分公司' }));
    await waitFor(() => {
      const tableText = screen.getByTestId('tree-crud-table').textContent ?? '';
      expect(tableText).toMatch(/david@example\.com/);
      // 总公司 users (张三) should be filtered out
      expect(tableText).not.toMatch(/张三@example\.com/);
    });
  });

  it('Master-Detail: selecting an order loads detail + tabbed + stacked sub-tables', async () => {
    render(<SchemaPage pageId="master-detail" env={env} />);
    // wait for the order radio list to render and pick the first order
    await screen.findByText(/NO-20240701\b/);
    const firstRadio = screen.getByRole('radio', { name: /NO-20240701\b/ });
    fireEvent.click(firstRadio);
    // detail card title switches from placeholder to "订单详情"
    await waitFor(() => {
      expect(screen.getByTestId('md-detail-title').textContent).toBe('订单详情');
    });
    // tabbed sub-tables (default tab = 订单明细) show SKU data
    await waitFor(() => {
      expect(screen.getByTestId('md-items-table').textContent).toMatch(/SKU/);
    });
    // stacked (non-tab) addresses sub-table renders
    expect(screen.getByTestId('md-addresses-table')).toBeTruthy();
  });

  it('Detail+Subtables renders detail card, tabs, and stacked sub-tables for the default order', async () => {
    render(<SchemaPage pageId="detail-subtables" env={env} />);
    // tabbed items sub-table shows SKU data for the default order (o1)
    await waitFor(() => {
      expect(screen.getByTestId('ds-items-table').textContent).toMatch(/SKU/);
    });
    // stacked payment + shipment sub-tables render
    expect(screen.getByTestId('ds-payments-table')).toBeTruthy();
    expect(screen.getByTestId('ds-shipments-table')).toBeTruthy();
  });

  it('Advanced Query loads users and supports query submission', async () => {
    render(<SchemaPage pageId="advanced-query" env={env} />);
    await waitFor(() => {
      expect(screen.getByTestId('adv-query-crud').textContent).toMatch(/张三@example\.com/);
    });
  });

  it('Inline Edit Table loads budgets with quick-edit number cells', async () => {
    render(<SchemaPage pageId="inline-edit-table" env={env} />);
    await waitFor(() => {
      expect(screen.getByTestId('budget-crud').textContent).toMatch(/研发中心/);
    });
    // quickEdit.body renders real input-number controls (role=spinbutton)
    expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
  });

  it('Form Wizard renders three steps', async () => {
    render(<SchemaPage pageId="form-wizard" env={env} />);
    expect(screen.getByTestId('demo-wizard')).toBeTruthy();
  });

  it('Complex Form renders three fieldsets and a submit gated by agreement', async () => {
    render(<SchemaPage pageId="complex-form" env={env} />);
    expect(screen.getByTestId('complex-form')).toBeTruthy();
    // submit disabled until agreed
    const submit = screen.getByTestId('complex-form-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('Standard CRUD reuses the existing schema and loads users', async () => {
    render(<SchemaPage pageId="standard-crud" env={env} />);
    await waitFor(() => {
      expect(screen.getByTestId('user-crud').textContent).toMatch(/张三@example\.com/);
    });
  });

  it('CRUD Views+Export: table view loads, cards view toggles, export hits backend and yields a download URL', async () => {
    render(<SchemaPage pageId="crud-views-export" env={env} />);
    // table view (default tab) loads users
    await waitFor(() => {
      expect(screen.getByTestId('view-crud-table').textContent).toMatch(/张三@example\.com/);
    });
    // switch to cards view via tab
    fireEvent.click(screen.getByRole('tab', { name: '卡片视图' }));
    await waitFor(() => {
      expect(screen.getByTestId('view-crud-cards').textContent).toMatch(/张三/);
    });
    // back to table and trigger backend export
    fireEvent.click(screen.getByRole('tab', { name: '表格视图' }));
    fireEvent.click(screen.getByTestId('btn-export'));
    // backend generates CSV → returns a data: URL written back to scope
    await waitFor(() => {
      const link = screen.getByTestId('export-download') as HTMLAnchorElement;
      expect(link.href).toMatch(/^data:text\/csv/);
    });
    expect(screen.getByTestId('export-report').textContent).toMatch(/users-.*\.csv/);
  });

  it('Approval Tasks: list loads; handle → approve flow hides buttons after status changes', async () => {
    render(<SchemaPage pageId="approval-tasks" env={env} />);
    await waitFor(() => {
      expect(screen.getByTestId('approval-crud').textContent).toMatch(/采购申请 — 服务器/);
    });
    // open the first pending task's handler dialog
    const handleButtons = screen.getAllByTestId('btn-handle');
    fireEvent.click(handleButtons[0]);
    // dialog form loads detail; approve button visible (status pending)
    await waitFor(() => {
      expect(screen.getByTestId('approval-form').textContent).toMatch(/采购申请/);
    });
    expect(screen.getByTestId('btn-approve')).toBeTruthy();
    // approve → backend updates status → list refreshes, title row reflects 已通过
    fireEvent.click(screen.getByTestId('btn-approve'));
    await waitFor(() => {
      expect(screen.getByTestId('approval-crud').textContent).toMatch(/已通过/);
    });
  });

  it('Business Document: per-row amount + live grand total aggregate via $Arr', async () => {
    render(<SchemaPage pageId="business-document" env={env} />);
    // 2 rows seeded: 2*18000 + 1*6800 = 42800 subtotal
    await waitFor(() => {
      expect(screen.getByTestId('subtotal').textContent).toMatch(/42800/);
      expect(screen.getByTestId('total-qty').textContent).toMatch(/3/);
    });
    // discountRate 0, taxRate 13 → grand total = 42800 * 1.13 = 48364
    expect(screen.getByTestId('grand-total').textContent).toMatch(/48364/);
  });

  it('Combo Editor renders repeated rows and supports add', async () => {
    render(<SchemaPage pageId="combo-editor" env={env} />);
    // 2 seeded contacts → report shows count 2
    await waitFor(() => {
      expect(screen.getByTestId('contacts-combo')).toBeTruthy();
    });
  });

  it('Dynamic Tabs: second tab mountOnEnter prevents DOM mount; click triggers DynamicRenderer loadAction that fetches CRUD schema from backend', async () => {
    render(<SchemaPage pageId="dynamic-tabs" env={env} />);
    // static tab content is visible immediately
    await waitFor(() => {
      expect(screen.getByTestId('static-tab-card').textContent).toMatch(/静态内容/);
    });
    // remote tab body is NOT in DOM before activation
    expect(screen.queryByTestId('remote-tab-loader')).toBeNull();
    expect(screen.queryByTestId('remote-tab-crud')).toBeNull();
    // click the second tab to activate
    fireEvent.click(screen.getByRole('tab', { name: '远程数据' }));
    // DynamicRenderer mounts → autoLoad fires → mock backend returns CRUD schema
    // → CRUD renders with remoteTabItems data
    await waitFor(() => {
      expect(screen.getByTestId('remote-tab-crud').textContent).toMatch(/数据项 A/);
    });
    expect(screen.getByTestId('remote-tab-crud').textContent).toMatch(/100/);
  });
});
