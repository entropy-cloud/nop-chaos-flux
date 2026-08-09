/**
 * 领域无关编辑器内核公共类型（design: docs/architecture/editor-core.md）。
 *
 * API 形状对齐 `ScadaEditorSession` 模式（`flux-renderers-industrial/src/editor/editor-session.ts`），
 * 保证 hmi-editor 迁移兼容；本包不含任何 DOM / leafer / 领域类型。
 */

/** 编辑会话模式（对齐 `ScadaEditorMode`）：`edit` 编辑态 / `preview` 预览态。 */
export type EditorMode = 'edit' | 'preview';

/** 提交策略（对齐 `ScadaCommitPolicy`）：`manual` 显式 commit / `auto` 每次变更即提交。 */
export type EditorCommitPolicy = 'manual' | 'auto';

/**
 * undo/redo 命令栈元素（对齐 `UndoStackEntry`，design-undo-redo.md §4.1.2）。
 *
 * 栈元素仅含 forward + inverse 两条增量 diff（外加 operationKind + timestamp 元数据），
 * 不存储全量 prevSnapshot（R4 内存约束）。
 */
export interface EditorDiffEntry<TDiff = unknown> {
  /** 编辑操作产出的 forward diff（apply 到 working 使其前进）。 */
  forward: TDiff;
  /** forward 的逆 diff（apply 到 working 使其回退到入栈前状态）。 */
  inverse: TDiff;
  /** 操作类型标签（跨操作合并 / 边界提示用，可选）。 */
  operationKind?: string;
  /** 操作时间戳。 */
  timestamp: number;
}

/**
 * 编辑会话状态投影（INV-4：working/committed/selection/mode + undo 派生面不进 flux scope，
 * 经 `subscribe`/`getState` 投影消费——对齐 `ScadaEditorSessionPublic` 不泄漏内部栈结构）。
 */
export interface EditorSessionState<TDocument = unknown> {
  /** 编辑会话 working copy（编辑期变更全部落点；不直改下游 document）。 */
  working: TDocument;
  /** 上次提交的基线（用于 diff 计算 + 提交语义判定）。 */
  committed: TDocument;
  /** 当前选区（document id 列表）。 */
  selection: readonly string[];
  /** 当前模式（edit / preview）。 */
  mode: EditorMode;
  /** undo 栈可撤销。 */
  canUndo: boolean;
  /** redo 栈可重做。 */
  canRedo: boolean;
  /** undo 栈深度（经栈长度派生，非恒 false）。 */
  undoDepth: number;
  /** redo 栈深度。 */
  redoDepth: number;
  /** working 与 committed 是否结构化不同（经 `adapter.diff` 判定）。 */
  dirty: boolean;
}

/**
 * 领域适配器（领域命令面声明 + 文档变换面，design: docs/architecture/editor-core.md）。
 *
 * diff/applyDiff 契约（forward/inverse 对称）：
 * - `diff(prev, next)` 返回 prev→next 的增量；结构化相同返回 `null`（无变更）。
 * - `applyDiff(doc, diff)` 将 diff 应用到 doc，返回新文档（纯函数，不就地修改入参）。
 * - 对称性：`applyDiff(applyDiff(doc, forward), inverse)` 深等于 `doc`。
 */
export interface EditorDomainAdapter<TDocument = unknown, TDiff = unknown> {
  /** 注册表标识（注册/查询/覆盖依据）。 */
  kind: string;
  /** 加载初始文档（createEditorCore 未提供 initialDocument 时调用）。 */
  load(): TDocument;
  /** 序列化（保存链路：commit → serialize → 下游同步）。 */
  serialize(doc: TDocument): string;
  /** 校验（提交前校验；非法则 commit 拒绝、working 保留、错误透传）。 */
  validate(doc: TDocument): { ok: boolean; errors?: string[] };
  /** working→committed / 前后状态 diff 生成；结构化相同返回 null。 */
  diff(prev: TDocument, next: TDocument): TDiff | null;
  /** 应用 diff（undo/redo 回放：forward 前进 / inverse 回退；纯函数）。 */
  applyDiff(doc: TDocument, diff: TDiff): TDocument;
  /** 领域命令面声明（adapter 支持的领域命令名列表，供 host 能力探查，可选）。 */
  domainCommands?: readonly string[];
  /**
   * 文档 id 投影（可选）。提供后，文档变更（update/undo/redo/revert）会将该集合外的
   * selection id 修剪掉（对齐 hmi "commit 后修剪 selection 到仍存在的 id"）。
   */
  getDocumentIds?(doc: TDocument): string[];
}

/** `createEditorCore` 工厂选项。 */
export interface EditorCoreOptions<TDocument = unknown> {
  /** 提交策略（缺省 `manual`）。 */
  policy?: EditorCommitPolicy;
  /** 初始文档（缺省经 `adapter.load()` 获取）。 */
  initialDocument?: TDocument;
  /** 初始选区。 */
  selection?: readonly string[];
  /** 初始模式（缺省 `edit`）。 */
  mode?: EditorMode;
  /** undo 栈深度上限（缺省 100，对齐 `MAX_UNDO_STACK_DEPTH`）。 */
  maxStackDepth?: number;
  /** 每次成功 commit 后的回调（manual 提交与 auto 提交共用；host 在此做下游同步）。 */
  onCommitted?: (result: EditorCommitResult) => void;
}

/** `commit()` 结果。 */
export interface EditorCommitResult {
  ok: boolean;
  /** commit 成功时的序列化产物。 */
  serialized?: string;
  /** commit 失败原因（校验失败/序列化异常），working 保留。 */
  error?: Error;
}

/**
 * 领域无关编辑器内核（design: docs/architecture/editor-core.md §2）。
 *
 * 会话 working/committed 双态隔离 + undo/redo diff 命令栈 + 选择状态 + 提交策略。
 * 纯逻辑（无 React / DOM / leafer 依赖），Vitest 单测先行。
 */
export interface EditorCore<TDocument = unknown, TDiff = unknown> {
  /** 领域适配器。 */
  readonly adapter: EditorDomainAdapter<TDocument, TDiff>;
  /** 提交策略（创建时裁定）。 */
  readonly policy: EditorCommitPolicy;

  /** 当前会话状态投影。 */
  getState(): EditorSessionState<TDocument>;
  /** 订阅会话变更（返回退订函数）。 */
  subscribe(listener: (state: EditorSessionState<TDocument>) => void): () => void;

  /**
   * 更新 working copy（updater 返回新文档，纯函数约定——不就地 mutate 入参）。
   * 事务外：自动 diff 入栈 1 条命令（forward/inverse 对称）；事务内：只改 working 不入栈。
   * 返回是否发生了引用变更（next !== prev）。
   */
  update(updater: (working: TDocument) => TDocument): boolean;

  /** 直接记录一条 diff 命令（updater 外置的场景，如拖拽事务收口）。 */
  record(forward: TDiff, inverse: TDiff, operationKind?: string): void;

  /**
   * 开启编辑事务（对齐 hmi transform 拖拽事务）：后续 `update` 只改 working 不入栈；
   * `endTransaction` 以事务起点为快照一次性入栈 1 条命令（一拖拽 = 一 undo 步）。
   */
  beginTransaction(): void;
  /** 收口事务：diff(事务起点, working) 非空则入栈 1 条命令并通知。 */
  endTransaction(): boolean;
  /** 中止事务：working 回滚到事务起点，不入栈。 */
  abortTransaction(): void;

  /** 撤销：pop undo → apply inverse → 原样入 redo。空栈 no-op + dev warn。 */
  undo(): boolean;
  /** 重做：pop redo → apply forward → 原样回 undo。空栈 no-op + dev warn。 */
  redo(): boolean;

  /**
   * 提交：validate(working) → serialize → committed = working（深拷贝语义由 adapter.serialize
   * 的消费侧保证；本内核以 working 引用推进 baseline）。失败则拒绝、working 保留、错误透传。
   * 成功时 **保留 undo 栈**（对齐 hmi save() 不清栈语义）；`onCommitted` 回调触发。
   */
  commit(): EditorCommitResult;
  /** 丢弃 working 变更：working = committed（深拷贝语义同 commit），清空 undo/redo 栈。 */
  revert(): void;

  /** 切换模式（edit/preview）。模式切换不触碰 working/committed/selection/undo 栈（INV-4）。 */
  setMode(mode: EditorMode): void;
  /** 设置选区。文档变更时按 `adapter.getDocumentIds` 修剪（提供时）。 */
  setSelection(selection: readonly string[]): void;

  /** 销毁内核（退订全部监听、清空栈）。 */
  dispose(): void;
}
