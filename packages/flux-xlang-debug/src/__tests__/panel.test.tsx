import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createDebugStore } from '../state/debug-store.js';
import type { DebugClient } from '../client/debug-client.js';
import type { DebugTransport } from '../state/debug-store.js';
import { ControlButtons } from '../panel/control-buttons.js';
import { VariablesTree } from '../panel/variables-tree.js';
import { EvalInput } from '../panel/eval-input.js';
import { LogPanel } from '../panel/log-panel.js';
import { initFluxI18n } from '@nop-chaos/flux-i18n';

beforeEach(() => {
  initFluxI18n();
});

function makeClient(overrides: Partial<DebugClient> = {}): DebugClient {
  const base: DebugClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    sessionId: vi.fn().mockReturnValue('u1:c1'),
    connectionState: vi.fn().mockReturnValue('connected'),
    query: vi.fn().mockResolvedValue({}),
    onLog: vi.fn().mockReturnValue(() => {}),
    onCompleted: vi.fn().mockReturnValue(() => {}),
  } as never;
  return { ...base, ...overrides };
}

describe('ControlButtons', () => {
  it('maps buttons to store actions (disabled when not suspended)', () => {
    const store = createDebugStore();
    const transport: DebugTransport = {
      toggleBreakpoint: vi.fn(),
      addBreakpoint: vi.fn(),
      removeBreakpoint: vi.fn(),
      step: vi.fn(),
      resume: vi.fn(),
      suspend: vi.fn(),
      runToPosition: vi.fn(),
      muteBreakpoints: vi.fn(),
      evalExpr: vi.fn(),
    };
    store.getState().setTransport(transport);
    render(<ControlButtons store={store} />);
    // 未挂起：resume/step 禁用（点击无效——语义由 disabled 承担）
    fireEvent.click(screen.getByText('继续'));
    expect(transport.resume).not.toHaveBeenCalled();
    const stepBtn = screen.getByText('步入') as HTMLButtonElement;
    expect(stepBtn.disabled).toBe(true);
    // 挂起后 resume 可用并触发 transport
    // act 包裹：vanilla store 更新在 act 外不触发同步 re-render
    act(() => {
      store.getState().addSuspended({ threadId: 17, sourcePath: 'a.xpl', line: 1 });
    });
    // re-render 后 DOM 节点可能被替换——重新查询
    const resumeBtn = screen.getByText('继续') as HTMLButtonElement;
    fireEvent.click(resumeBtn);
    expect(transport.resume).toHaveBeenCalledTimes(1);
  });
});

describe('VariablesTree', () => {
  it('queries frame variables and renders rows (F1: getFrameVariables)', async () => {
    const store = createDebugStore();
    store.getState().addSuspended({ threadId: 17, sourcePath: 'a.xpl', line: 1 });
    const client = makeClient({
      query: vi.fn().mockResolvedValue({ vars: [{ name: 'x', value: '1' }, { name: 'y', value: '2' }] }),
    });
    render(<VariablesTree store={store} client={client} threadId={17} frameIndex={0} />);
    await waitFor(() => {
      expect(client.query).toHaveBeenCalledWith('debugger.getFrameVariables', { threadId: 17, frameIndex: 0 });
    });
    await waitFor(() => {
      expect(screen.getByText('x')).toBeTruthy();
      expect(screen.getByText('y')).toBeTruthy();
    });
  });

  it('shows load-failed error state on query rejection', async () => {
    const store = createDebugStore();
    store.getState().addSuspended({ threadId: 17, sourcePath: 'a.xpl', line: 1 });
    const client = makeClient({
      query: vi.fn().mockRejectedValue(new Error('down')),
    });
    render(<VariablesTree store={store} client={client} threadId={17} frameIndex={0} />);
    await waitFor(() => {
      expect(screen.getByTestId('xlang-debug-vars-error')).toBeTruthy();
    });
  });
});

describe('EvalInput', () => {
  it('disabled when not suspended', () => {
    render(<EvalInput client={makeClient()} threadId={0} frameIndex={0} disabled />);
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('submits expr via query and renders result value', async () => {
    const client = makeClient({
      query: vi.fn().mockResolvedValue({ v: { value: '42' } }),
    });
    render(<EvalInput client={client} threadId={17} frameIndex={0} disabled={false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '21 * 2' } });
    fireEvent.click(screen.getByText('求值'));
    await waitFor(() => {
      expect(client.query).toHaveBeenCalledWith('debugger.getExprValue', {
        threadId: 17,
        frameIndex: 0,
        expr: '21 * 2',
      });
      expect(screen.getByText('42')).toBeTruthy();
    });
  });
});

describe('VariablesTree lazy expansion', () => {
  it('expands a node via expandExprValue (F6/620 audit Major 4)', async () => {
    const store = createDebugStore();
    store.getState().addSuspended({ threadId: 17, sourcePath: 'a.xpl', line: 1 });
    const query = vi.fn()
      .mockResolvedValueOnce({ vars: [{ name: 'order' }] })
      .mockResolvedValueOnce({ vars: [{ name: 'id' }, { name: 'items' }] });
    const client = makeClient({ query });
    render(<VariablesTree store={store} client={client} threadId={17} frameIndex={0} />);
    // 根节点加载
    await waitFor(() => expect(screen.getByText('order')).toBeTruthy());
    // 点击展开 → expandExprValue
    fireEvent.click(screen.getByText('order'));
    await waitFor(() => {
      expect(query).toHaveBeenLastCalledWith('debugger.expandExprValue', {
        threadId: 17,
        frameIndex: 0,
        expr: 'order',
        keys: [{ name: 'order' }],
      });
      expect(screen.getByText('id')).toBeTruthy();
      expect(screen.getByText('items')).toBeTruthy();
    });
  });

  it('shows truncated hint when result truncated (F6)', async () => {
    const store = createDebugStore();
    store.getState().addSuspended({ threadId: 17, sourcePath: 'a.xpl', line: 1 });
    const client = makeClient({
      query: vi.fn().mockResolvedValue({ vars: [{ name: 'x' }], truncated: true }),
    });
    render(<VariablesTree store={store} client={client} threadId={17} frameIndex={0} />);
    await waitFor(() => {
      expect(screen.getByTestId('xlang-debug-truncated')).toBeTruthy();
    });
  });
});

describe('LogPanel', () => {
  it('subscribes onLog and renders entries + exceptions', async () => {
    let logCb: (e: { message: string }) => void = () => {};
    const store = createDebugStore();
    store.getState().addException({ message: 'exploded', errorCode: 'nop.err.t' });
    const client = makeClient({
      onLog: vi.fn((cb: (e: { message: string }) => void) => {
        logCb = cb;
        return () => {};
      }),
    });
    render(<LogPanel store={store} client={client} />);
    logCb({ message: 'log-line' });
    await waitFor(() => {
      expect(screen.getByText('log-line')).toBeTruthy();
      expect(screen.getByText('exploded (nop.err.t)')).toBeTruthy();
    });
  });
});
