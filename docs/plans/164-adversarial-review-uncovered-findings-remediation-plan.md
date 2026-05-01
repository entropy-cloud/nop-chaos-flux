# 164 Adversarial-Review Uncovered Findings Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-adversarial-review.md` Findings 3-10, 12-15
> Related: `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`, `docs/plans/161-workspace-quality-and-dx-improvement-plan.md`

## Purpose

将 2026-05-01 对抗性审查中发现、且未被 Plan 161/163 覆盖的 13 项问题按优先级分 4 个 Phase 落地。覆盖范围：scope 安全防御、formula 编译器健壮性、运行时防御性改进、无障碍性与 i18n。

## Current Baseline

- `pnpm typecheck`、`pnpm build`、`pnpm lint` 通过
- Plan 161 (proposed) 覆盖工具链/DX/测试，Plan 163 (proposed) 覆盖 core boundary 和 validation owner
- `packages/flux-runtime/src/scope.ts` 的 `DANGEROUS_KEYS` 过滤仅在 `materializeVisible()` 中实现；写入路径 (`merge`/`update`/`replace`) 和快速读取路径 (`readVisible`) 无过滤
- `packages/flux-formula/src/parser.ts` 递归下降解析器无深度计数器；`evaluateNode` 无深度限制
- `packages/flux-formula/src/compile/compile-node.ts` 在解析失败时 catch 并返回原始字符串作为静态节点，不调用 `reportDiagnostic`
- `packages/flux-formula/src/compile/formula-compiler.ts` 在求值失败时 catch 并返回 `undefined as T`
- `packages/flux-runtime/src/form-runtime-owner.ts:249-254` 使用 `Promise.all` 并发校验，单个字段异常导致所有结果丢失
- `packages/flux-renderers-data/src/tree-renderer.tsx` 展开/折叠触发器使用 `<span role="button">` 无键盘处理
- `packages/flux-renderers-data/src/table-renderer/` 中多个交互元素缺少 `aria-label` 和键盘支持
- 19+ 处用户可见硬编码英文字符串散布在渲染器包中

## Goals

- 消除 scope 写入路径的 prototype pollution 风险
- 为 formula parser/evaluator 添加递归深度限制，防止 DoS
- 让表达式编译错误通过 `reportDiagnostic` 通路可见，而非静默降级
- 提升表单校验的单点故障韧性
- 修复 tree/table 渲染器的键盘可达性
- 收敛渲染器包中的硬编码字符串到 i18n

## Non-Goals

- 不重构 `RendererComponentProps<S>.props` 类型系统（独立设计决策，需从编译管道到消费端统一重设计）
- 不重构 `ManagedFormRuntimeSharedState` 的可变状态管理（by-design 性能选择）
- 不优化 `classifyField` 线性扫描或 `compileSymbolTable.push` 数组拷贝（实测影响极小，收益不足以抵消改动风险）
- 不处理 runtime disposal 泄漏（Finding 1，已建议纳入 Plan 163 Phase 2）
- 不处理 `RendererComponentProps.props` 类型安全（Finding 2，Plan 161 Non-Goals 已排除）
- 不处理 formula namespace 原型链暴露（Finding 12，当前表达式语言无调用构造函数的能力，exploit 链不完整）
- 不处理 doc-code 契约漂移（Finding 6，应在 Plan 163 文档同步工作中一并处理）

## Scope

### In Scope

| Finding | Severity | Phase |
|---------|----------|-------|
| 3. Scope DANGEROUS_KEYS 写入路径未过滤 | HIGH | Phase 1 |
| 4. Formula parser 无递归深度限制 | MEDIUM | Phase 2 |
| 5. 表达式错误静默吞掉 | MEDIUM | Phase 2 |
| 7. `Promise.all` 校验单点失败 | MEDIUM | Phase 3 |
| 8. Tree/table 键盘不可操作 | MEDIUM | Phase 4 |
| 9. 硬编码用户可见字符串 | MEDIUM | Phase 4 |

### Out Of Scope

- Finding 1 (runtime disposal) — Plan 163
- Finding 2 (props 类型安全) — 独立设计决策
- Finding 6 (doc-code 漂移) — Plan 163 文档同步
- Finding 10 (auto-renderer memo) — 影响面小，非紧急
- Finding 11 (循环类型依赖) — Plan 163 Phase 1 间接处理
- Finding 12 (namespace 原型链) — exploit 链不完整
- Finding 13 (shared state) — by design
- Finding 14 (classifyField) — 性能影响极小
- Finding 15 (symbol table) — 性能影响极小

## Execution Plan

### Phase 1 - Scope Write-Path Dangerous-Key Filtering (Finding 3)

Status: completed
Targets: `packages/flux-runtime/src/scope.ts`, `packages/flux-formula/src/scope.ts`, `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts`

- [x] 在 `scope.ts` 中提取 `sanitizeSnapshot(data)` 工具函数，过滤 `__proto__`、`constructor`、`prototype` 键
- [x] 在 `merge(data)` 中对 `data` 参数调用 `sanitizeSnapshot` 后再 spread
- [x] 在 `update(path, value)` 中对 path 的首段进行 DANGEROUS_KEYS 检查，若命中则跳过该次写入并可选地发 warning
- [x] 在 `replace(data)` 中对 `data` 调用 `sanitizeSnapshot`
- [x] 在 `readVisible()` 的 `Object.assign(safeCreate(parentVisible), ownSnapshot)` 后对结果调用 `sanitizeSnapshot`
- [x] 扩展 `packages/flux-formula/src/scope.ts` 的 formula scope proxy 的 `get` handler，将 `constructor` 和 `prototype` 加入拦截列表（当前仅拦截 `__proto__`）
- [x] 扩展 `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts` 的 adaptor scope view 的 `get` handler，同理拦截 `constructor` 和 `prototype`
- [x] 为 `scope.ts` 添加测试：验证 `{ constructor: "x", __proto__: {}, prototype: "y" }` 写入后 `readVisible()` 和 `materializeVisible()` 均不包含这些键
- [x] 为 formula scope proxy 添加测试：验证 `scope.constructor` 和 `scope.prototype` 返回 `undefined`

Exit Criteria:

- [x] `scope.ts` 的 `merge`、`update`、`replace`、`readVisible` 路径均过滤 DANGEROUS_KEYS
- [x] formula scope proxy 和 adaptor scope view 均拦截 `__proto__`、`constructor`、`prototype`
- [x] 新增测试覆盖上述所有过滤点
- [x] `docs/architecture/flux-core.md` scope 安全防御段落已更新为最终设计状态（或确认无需更新并记录原因）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Formula Parser And Expression Error Visibility (Findings 4, 5)

Status: completed
Targets: `packages/flux-formula/src/parser.ts`, `packages/flux-formula/src/evaluator.ts`, `packages/flux-formula/src/compile/compile-node.ts`, `packages/flux-formula/src/compile/formula-compiler.ts`

- [x] 在 `Parser` 类中添加 `depth` 计数器和 `MAX_PARSER_DEPTH = 256` 常量；在每个递归入口（`parsePrimary` 等）检查深度，超限时抛出带有深度信息的 `FormulaError`
- [x] 在 `evaluateNode` 闭包中添加 `evalDepth` 计数器和 `MAX_EVAL_DEPTH = 256`；超限时抛出 `FormulaError`
- [x] 修改 `compile-node.ts` 的 catch 块：在返回 `StaticValueNode` 之前，调用 `options.reportDiagnostic?.()` 报告解析失败的原始输入和错误信息
- [x] 修改 `formula-compiler.ts` 的求值 catch 块：`evaluateAst()` 已通过 `createExpressionMonitorReporter` 调用 `env.monitor.onError`（evaluator.ts:293），但 catch 后返回 `undefined as T` 使调用方无法区分"求值结果为 undefined"和"求值失败返回了 undefined"。改为让错误传播（throw）或返回显式错误标记（如 `ErrorSentinel`），不再用 `undefined as T` 掩盖
- [x] 修改 `formula-compiler.ts` 模板求值 catch 块：同理，不再静默返回空字符串，而是在 `env.monitor.onError` 已上报后让错误传播或返回可区分的错误值
- [x] 为 parser 添加测试：验证嵌套深度超过 256 时抛出错误而非 stack overflow
- [x] 为 evaluator 添加测试：验证 AST 深度超过 256 时抛出错误
- [x] 为 `compile-node.ts` 添加测试：验证 `reportDiagnostic` 在解析失败时被调用
- [x] 为 `formula-compiler.ts` 添加测试：验证求值失败时错误传播而非返回 `undefined`；验证模板求值失败时错误传播而非返回空字符串

Exit Criteria:

- [x] `Parser` 类和 `evaluateNode` 均有深度限制，超限抛出错误
- [x] `compile-node.ts` 在解析失败时调用 `reportDiagnostic`
- [x] `formula-compiler.ts` 的求值结果类型不使用 `undefined as T` 掩盖错误（通过返回显式错误标记或让错误传播）
- [x] `formula-compiler.ts` 模板求值不再静默返回空字符串（错误传播或返回可区分错误值）
- [x] 新增测试覆盖深度限制和错误上报
- [x] `docs/architecture/flux-core.md` 表达式编译错误可见性段落已更新为最终设计状态（或确认无需更新并记录原因）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Form Validation Resilience (Finding 7)

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-owner.ts`

- [x] 将 `validateAll` 路径中的 `Promise.all` 替换为 `Promise.allSettled`，在结果处理中区分 `fulfilled` 和 `rejected`
- [x] 对于 `rejected` 的字段，记录错误到 diagnostic 而不中断其他字段的校验
- [x] 添加测试：验证一个字段抛出异常时，其他字段仍正常校验并更新 `fieldStates`
- [x] 添加测试：验证多个字段中有部分 rejected 时，已 fulfilled 的字段状态正确反映校验结果

Exit Criteria:

- [x] `form-runtime-owner.ts` 不再使用 `Promise.all` 进行并发校验
- [x] 单个字段校验异常不阻断其他字段
- [x] 新增测试覆盖部分失败场景
- [x] `docs/architecture/form-validation.md` 校验并发韧性段落已更新为最终设计状态（或确认无需更新并记录原因）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Accessibility And i18n (Findings 8, 9)

Status: completed
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`, `packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx`, `packages/flux-i18n/src/`

- [x] **tree-renderer.tsx** 展开/折叠触发器：将 `<span role="button">` 改为 `<button>` 或添加 `onKeyDown` 处理 Enter/Space
- [x] **tree-renderer.tsx** 节点点击区域（`expandRowByClick`）：添加 `role="button"`, `tabIndex={0}`, `onKeyDown`
- [x] **table-header-row.tsx** 全选 checkbox：添加 `aria-label` 使用 `t('flux.table.selectAll')`
- [x] **table-header-row.tsx** 可排序列头：添加 `role="button"`, `tabIndex={0}`, `onKeyDown`
- [x] **table-body-row-rendering.tsx** 行选择 checkbox/radio：添加 `aria-label` 使用行索引或 `t('flux.table.selectRow')`
- [x] **table-body-row-rendering.tsx** 展开行：将 'Collapse'/'Expand' aria-label 改为 `t('flux.table.collapse')` / `t('flux.table.expand')`
- [x] 在 `@nop-chaos/flux-i18n` 中注册新增 i18n key（`flux.table.selectAll`, `flux.table.selectRow`, `flux.table.collapse`, `flux.table.expand`, `flux.table.search`, `flux.table.page`, `flux.table.total`, `flux.table.of`, `flux.tree.collapse`, `flux.tree.expand`, `flux.form.failedToLoadOptions`, `flux.form.loading`, `flux.form.on`, `flux.form.off`, `flux.keyValue.key`, `flux.keyValue.value`, `flux.keyValue.addEntry`, `flux.arrayEditor.item`, `flux.treeControls.searchPlaceholder`, `flux.validation.isRequired`, `flux.validation.requiresMinItems`, `flux.validation.keysMustBeUnique`, `flux.validation.entryKeyRequired`, `flux.validation.entryValueRequired`）
- [x] 将 19+ 处硬编码英文字符串替换为 `t()` 调用，fallback 使用当前英文值
- [x] 验证 zh-CN 和 en-US 均有对应翻译条目

Exit Criteria:

- [x] Tree 展开/折叠和节点点击区域键盘可达（tree-renderer.tsx 使用 `<button>` 或有 `onKeyDown` handler，`tabIndex={0}`）
- [x] Table 全选、行选择、排序头键盘可达且 Checkbox/Radio 有 `aria-label` prop
- [x] 所有新增 i18n key 在 `flux-i18n` 中有 zh-CN 和 en-US 条目
- [x] 无新增硬编码用户可见字符串
- [x] `docs/architecture/styling-system.md` 或相关组件文档的无障碍性段落已更新（或确认无需更新并记录原因）
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] Scope 写入路径和快速读取路径均过滤 DANGEROUS_KEYS
- [x] Formula parser 和 evaluator 有递归深度限制
- [x] 表达式编译失败通过 reportDiagnostic 可见
- [x] 表单校验单点异常不阻断其他字段
- [x] Tree/table 交互元素键盘可达
- [x] 用户可见字符串通过 i18n 管理
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

| Risk | Impact | Mitigation |
|------|--------|------------|
| DANGEROUS_KEYS 过滤可能破坏依赖 `constructor` 键的合法数据 | 运行时行为变更 | 先 grep 全仓库确认无合法使用，再落地；如有则用白名单 |
| Parser 深度限制可能截断合法的复杂表达式 | 编译失败 | 设 256 上限（远超正常使用），且错误信息明确 |
| `Promise.all` 改为 `Promise.allSettled` 可能改变错误聚合时序 | 校验行为微妙变化 | rejected 字段仍记录到 fieldStates，只是不再中断 |
| i18n key 命名可能与已有 key 冲突 | 翻译丢失 | 先检查已有 `flux.` 前缀 key 的命名空间 |
| evaluator 深度限制可能截断当前可用的深度嵌套表达式 | 运行时错误 | 256 上限远超正常使用；执行前 grep 仓库确认无超限表达式 |
| Base UI `CollapsibleTrigger` 可能已为 `<span>` render prop 提供 Enter/Space 键盘处理 | Phase 4 tree 修复方向偏移 | 执行前在 playground 验证 CollapsibleTrigger 的实际键盘行为 |

## Closure

Status Note: All 4 phases executed and verified. Closure audit passed with 2 findings fixed (tree-renderer hardcoded strings replaced with t() calls, scope security section added to flux-core.md). 0 new test failures introduced.

Closure Audit Evidence:

- Reviewer / Agent: Independent sub-agent (task ses_21c26515cffe1W3I7bZ4pY45b4)
- Evidence: 16 exit criteria audited against live code — 14 PASS initially, 2 FAIL fixed in follow-up. All criteria now satisfied.

Follow-up:

- Finding 2 (props 类型安全) 需要独立的设计提案
- Finding 6 (doc-code 漂移) 应随 Plan 163 文档同步处理
- Finding 10 (auto-renderer memo) 可作为后续 DX 改进
