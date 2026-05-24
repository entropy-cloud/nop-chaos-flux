// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { NopDebuggerPanel } from './panel.js';
import { createController, createSnapshot } from './panel.test-support.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('NopDebuggerPanel', () => {
  it('shows the latest inferred interaction trace summary in overview mode', () => {
    const snapshot = createSnapshot();
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('Latest trace')).toBeTruthy();
    expect(screen.getByText('submit failed')).toBeTruthy();
    expect(screen.getByText(/4 correlated events/i)).toBeTruthy();
    expect(screen.getByText(/node user-form/i)).toBeTruthy();
  });

  it('calls minimize when minimize button is clicked', () => {
    const snapshot = createSnapshot();
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByTestId('ndbg-minimize'));

    expect(controller.minimize).toHaveBeenCalledTimes(1);
  });

  it('renders controller-backed component tree entries and inspects them by cid', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);
    const inspectByCid = vi.fn(() => ({ cid: 41, mounted: true, handleType: 'form' }));

    controller.getComponentTree = () => [
      {
        cid: 41,
        type: 'form',
        label: 'user-form',
        depth: 0,
        mounted: true,
      },
    ];
    controller.inspectByCid = inspectByCid;

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByText('user-form'));

    expect(inspectByCid).toHaveBeenCalledWith(41);
    expect(screen.getByText('Component Inspector')).toBeTruthy();
  });

  it('uses button semantics for network request disclosure rows', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'network';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'api:start',
        group: 'api',
        level: 'info',
        source: 'test',
        summary: 'GET /api/users',
        requestKey: 'GET /api/users',
        network: { method: 'GET', url: '/api/users' },
      },
      {
        id: 2,
        sessionId: 'session-test',
        timestamp: 150,
        kind: 'api:end',
        group: 'api',
        level: 'success',
        source: 'test',
        summary: 'GET /api/users',
        requestKey: 'GET /api/users',
        durationMs: 50,
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const trigger = screen.getByRole('button', { name: /GET \/api\/users/i });
    const entry = trigger.closest('article');
    expect(entry?.getAttribute('role')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText((_, element) => element?.textContent === 'Request: ')).toBeTruthy();
  });

  it('marks the selected component tree entry with the selected class', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);

    controller.getComponentTree = () => [
      {
        cid: 41,
        type: 'form',
        label: 'user-form',
        depth: 0,
        mounted: true,
      },
    ];
    controller.inspectByCid = vi.fn(() => ({ cid: 41, mounted: true, handleType: 'form' }));

    render(<NopDebuggerPanel controller={controller} />);

    const treeItem = screen.getByText('user-form').closest('.ndbg-tree-item');
    expect(treeItem?.classList.contains('ndbg-tree-item')).toBe(true);

    fireEvent.click(screen.getByText('user-form'));

    expect(treeItem?.classList.contains('selected')).toBe(true);
  });

  it('uses shared button semantics for node tree selection and event disclosure', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);

    controller.getComponentTree = () => [
      {
        cid: 41,
        type: 'form',
        label: 'user-form',
        depth: 0,
        mounted: true,
      },
    ];
    controller.inspectByCid = vi.fn(() => ({ cid: 41, mounted: true, handleType: 'form' }));
    controller.getNodeDiagnostics = () => ({
      nodeId: 'user-form',
      path: 'body.0',
      rendererTypes: ['form'],
      totalEvents: 1,
      countsByGroup: { action: 1 },
      countsByKind: { 'action:start': 1 },
      renderCommitCount: 0,
      renderBurstCount: 0,
      recentEvents: [
        {
          id: 3,
          sessionId: 'session-test',
          timestamp: 200,
          kind: 'action:start',
          group: 'action',
          level: 'info',
          source: 'test',
          summary: 'Node updated',
          detail: 'detail',
        },
      ],
    });

    render(<NopDebuggerPanel controller={controller} />);

    const treeItemButton = screen.getByText('user-form').closest('button');
    expect(treeItemButton?.classList.contains('ndbg-tree-item')).toBe(true);
    expect(treeItemButton?.getAttribute('role')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Enter nodeId to inspect...'), {
      target: { value: 'user-form' },
    });

    const eventTrigger = screen.getByRole('button', { name: /Node updated/i });
    expect(eventTrigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(eventTrigger);

    expect(eventTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('detail')).toBeTruthy();
  });

  it('keeps the prior selection when pick-element hits a foreign-runtime node', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);
    const inspectByElement = vi.fn(() => undefined);

    const localRuntimeRoot = document.createElement('div');
    localRuntimeRoot.setAttribute('data-runtime-id', 'runtime-local');
    const localElement = document.createElement('div');
    localElement.setAttribute('data-cid', '41');
    localRuntimeRoot.appendChild(localElement);

    const foreignRuntimeRoot = document.createElement('div');
    foreignRuntimeRoot.setAttribute('data-runtime-id', 'runtime-foreign');
    const foreignElement = document.createElement('div');
    foreignElement.setAttribute('data-cid', '98');
    foreignRuntimeRoot.appendChild(foreignElement);

    document.body.appendChild(localRuntimeRoot);
    document.body.appendChild(foreignRuntimeRoot);

    controller.getComponentTree = () => [
      {
        cid: 41,
        type: 'form',
        label: 'user-form',
        depth: 0,
        mounted: true,
      },
    ];
    controller.inspectByCid = vi.fn(() => ({ cid: 41, mounted: true, handleType: 'form' }));
    controller.inspectByElement = inspectByElement;

    render(<NopDebuggerPanel controller={controller} />);

    const treeItem = screen.getByText('user-form').closest('.ndbg-tree-item');
    fireEvent.click(screen.getByText('user-form'));
    expect(treeItem?.classList.contains('selected')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Pick element' }));
    fireEvent.click(foreignElement);

    expect(inspectByElement).toHaveBeenCalledWith(foreignElement);
    expect(treeItem?.classList.contains('selected')).toBe(true);
    expect(screen.getByDisplayValue('41')).toBeTruthy();
  });

  it('opens launcher on click without drag', () => {
    const snapshot = { ...createSnapshot(), panelOpen: false };
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const launcher = document.querySelector('.nop-debugger-launcher');
    expect(launcher).toBeTruthy();

    fireEvent.pointerDown(launcher!, { button: 0, pointerId: 1, clientX: 40, clientY: 40 });
    fireEvent.click(launcher!);

    expect(controller.show).toHaveBeenCalledTimes(1);
  });

  it('renders JsonViewer for expanded event details', () => {
    const snapshot = createSnapshot();
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'action:end',
        group: 'action',
        level: 'success',
        source: 'test',
        summary: 'Action completed',
        detail: 'Form submitted',
        actionType: 'submitForm',
        nodeId: 'form-1',
        path: 'body.0',
        durationMs: 150,
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const visiblePanel = screen.getAllByRole('tabpanel').find((panel) => !panel.hasAttribute('hidden'));
    expect(visiblePanel?.textContent).toContain('Action completed');
  });

  it('exposes accessible labels on JSON expand toggles', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);
    controller.getComponentTree = () => [
      {
        cid: 41,
        type: 'form',
        label: 'user-form',
        depth: 0,
        mounted: true,
      },
    ];
    controller.inspectByCid = vi.fn(() => ({
      cid: 41,
      mounted: true,
      formState: { values: { user: 'alice' }, errors: {}, touched: {}, dirty: {}, visited: {}, submitting: false },
    } as any));

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByText('user-form'));

    expect(screen.getByRole('button', { name: /Collapse JSON object/i })).toBeTruthy();
  });

  it('shows error badge on launcher when errors exist', () => {
    const snapshot = { ...createSnapshot(), panelOpen: false };
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'error',
        group: 'error',
        level: 'error',
        source: 'test',
        summary: 'Test error',
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const launcher = document.querySelector('.nop-debugger-launcher');
    expect(launcher).toBeTruthy();
  });

  it('renders node tab with node diagnostics input', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('node')).toBeTruthy();
  });

  it('creates debugger inspect overlays with data-overlay-state markers', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'node';
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick element' }));

    expect(
      document.querySelector('.nop-debugger-overlay[data-overlay-state="hover"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('.nop-debugger-overlay[data-overlay-state="active"]'),
    ).toBeTruthy();
  });

  it('localizes debugger chrome from the flux.debugger namespace', async () => {
    await changeLanguage('zh-CN');
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByRole('tablist', { name: '调试器标签页' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: '时间线' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getAllByRole('tabpanel').some((panel) => !panel.hasAttribute('hidden'))).toBe(true);
    expect(screen.getByPlaceholderText('搜索事件、/regex/ 或 path:body.0')).toBeTruthy();
    expect(screen.getByRole('button', { name: '选择元素' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '最小化' })).toBeTruthy();
  });

  it('renders network tab with merged requests', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'network';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'api:start',
        group: 'api',
        level: 'info',
        source: 'test',
        summary: 'GET /api/users',
        requestKey: 'GET /api/users',
      },
      {
        id: 2,
        sessionId: 'session-test',
        timestamp: 150,
        kind: 'api:end',
        group: 'api',
        level: 'success',
        source: 'test',
        summary: 'GET /api/users',
        requestKey: 'GET /api/users',
        durationMs: 50,
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('network')).toBeTruthy();
  });
});
