import { createStore, type StoreApi } from 'zustand/vanilla';

/** 断点（D5 §3.4 schema，与 debugger.addBreakpoint 参数一致）。 */
export interface Breakpoint {
  sourcePath: string;
  line: number;
  condition?: string;
  logExpr?: string;
}

/** 挂起状态（对齐 evt.suspended/LeaseState.suspendedThreadIds）。 */
export interface SuspendedState {
  threadId: number;
  sourcePath: string;
  line: number;
}

/** 异常项（对齐 evt.exception）。 */
export interface ExceptionItem {
  sourcePath?: string;
  line?: number;
  message: string;
  errorCode?: string;
}

/** 租约排程状态（对齐 LeaseState.expiresAtMs；只读，renew 心跳归 item 17 连接层）。 */
export interface LeaseState {
  expiresAtMs: number;
}

/** 单步动作类型。 */
export type StepKind = 'into' | 'over' | 'out';

/**
 * 上行 transport（item 17 WS 客户端实现；与 D5 §3.4 上行动作清单逐项一致，
 * evalExpr 映射 debugger.getExprValue）。未注入时上行动作只改本地状态。
 */
export interface DebugTransport {
  toggleBreakpoint(sourcePath: string, line: number): void;
  addBreakpoint(sourcePath: string, line: number): void;
  removeBreakpoint(sourcePath: string, line: number): void;
  step(kind: StepKind): void;
  resume(): void;
  suspend(): void;
  runToPosition(bp: Breakpoint): void;
  muteBreakpoints(muted: boolean): void;
  evalExpr(args: { threadId: number; frameIndex: number; expr: string }): void;
}

export interface DebugStoreState {
  breakpoints: Breakpoint[];
  suspended: SuspendedState[];
  lease: LeaseState | null;
  exceptions: ExceptionItem[];
}

/** 内部状态（transport 非公共契约面——item 17 经 setTransport 注入）。 */
export interface DebugStoreInternalState extends DebugStoreState {
  transport: DebugTransport | null;
}

export interface DebugStoreActions {
  // ===== 上行动作（编辑器/面板 → transport）=====
  toggleBreakpoint(sourcePath: string, line: number): void;
  addBreakpoint(sourcePath: string, line: number): void;
  removeBreakpoint(sourcePath: string, line: number): void;
  step(kind: StepKind): void;
  resume(): void;
  suspend(): void;
  runToPosition(bp: Breakpoint): void;
  muteBreakpoints(muted: boolean): void;
  evalExpr(args: { threadId: number; frameIndex: number; expr: string }): void;

  // ===== 下行 applier（item 17 事件 → store；契约下半边，plan 617 F2）=====
  setBreakpoints(bps: Breakpoint[]): void;
  setSuspended(states: SuspendedState[]): void;
  addSuspended(state: SuspendedState): void;
  removeSuspended(threadIds: number[]): void;
  addException(e: ExceptionItem): void;
  clearExceptions(): void;
  setLease(expiresAtMs: number | null): void;

  setTransport(transport: DebugTransport | null): void;
}

/** zustand vanilla store 句柄（getState/setState/subscribe）。 */
export type DebugStore = StoreApi<DebugStoreInternalState & DebugStoreActions>;

/**
 * debug store 工厂（D5 §3.4，plan 617）：zustand vanilla 工厂形态（非 module
 * 单例——多编辑器实例 + 单测隔离）。上行动作在无 transport 时只改本地状态。
 */
export function createDebugStore(): DebugStore {
  return createStore<DebugStoreInternalState & DebugStoreActions>()((set, get) => ({
    breakpoints: [],
    suspended: [],
    lease: null,
    exceptions: [],
    transport: null,

    toggleBreakpoint(sourcePath, line) {
      const existing = get().breakpoints.some(
        (bp) => bp.sourcePath === sourcePath && bp.line === line,
      );
      if (existing) {
        get().removeBreakpoint(sourcePath, line);
      } else {
        get().addBreakpoint(sourcePath, line);
      }
    },

    addBreakpoint(sourcePath, line) {
      set((state) => ({
        breakpoints: [
          ...state.breakpoints.filter(
            (bp) => !(bp.sourcePath === sourcePath && bp.line === line),
          ),
          { sourcePath, line },
        ],
      }));
      get().transport?.addBreakpoint(sourcePath, line);
    },

    removeBreakpoint(sourcePath, line) {
      set((state) => ({
        breakpoints: state.breakpoints.filter(
          (bp) => !(bp.sourcePath === sourcePath && bp.line === line),
        ),
      }));
      get().transport?.removeBreakpoint(sourcePath, line);
    },

    step(kind) {
      get().transport?.step(kind);
    },

    resume() {
      get().transport?.resume();
    },

    suspend() {
      get().transport?.suspend();
    },

    runToPosition(bp) {
      get().transport?.runToPosition(bp);
    },

    muteBreakpoints(muted) {
      get().transport?.muteBreakpoints(muted);
    },

    evalExpr(args) {
      get().transport?.evalExpr(args);
    },

    setBreakpoints(bps) {
      set({ breakpoints: [...bps] });
    },

    setSuspended(states) {
      set({ suspended: [...states] });
    },

    addSuspended(state) {
      set((prev) => ({
        suspended: [
          ...prev.suspended.filter((s) => s.threadId !== state.threadId),
          state,
        ],
      }));
    },

    removeSuspended(threadIds) {
      const ids = new Set(threadIds);
      set((prev) => ({
        suspended: prev.suspended.filter((s) => !ids.has(s.threadId)),
      }));
    },

    addException(e) {
      set((prev) => ({ exceptions: [...prev.exceptions, e] }));
    },

    clearExceptions() {
      set({ exceptions: [] });
    },

    setLease(expiresAtMs) {
      set({ lease: expiresAtMs == null ? null : { expiresAtMs } });
    },

    setTransport(transport) {
      set({ transport });
    },
  }));
}
