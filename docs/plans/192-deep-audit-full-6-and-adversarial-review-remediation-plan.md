# 2026-05-04 Deep Audit + Adversarial Review Consolidated Remediation Plan

> Status: **active**
> Last Reviewed: 2026-05-04
> Sources: `docs/analysis/2026-05-04-deep-audit-full-6/summary.md`, `docs/analysis/2026-05-04-adversarial-review.md`

## Current Baseline

两份独立审查在同一天完成，覆盖了 18 个架构维度和 9 条对抗性调查线索。对抗性审查 14 个发现中 12 个确认存在、1 个已修复（发现12）、1 个部分存在（发现13）。深度审核发现 7 个 P2 + 10 个 Low。

## Goals

将所有已确认的 live defect 和 contract gap 修复到位，使核心运行时在异常安全、生命周期管理、开发者体验和可访问性方面达到生产就绪标准。

## Non-Goals

- 性能优化类观察项（P3 performance.mark、scope notification 已修复）
- 纯美化重命名（helpers.ts → utils.ts）
- 测试密度提升的全量计划（已有 plan-143 覆盖）
- 全量 i18n 覆盖（仅修复本次发现的具体遗漏）

---

## Phase 1: Critical Runtime Defects (P0-equivalent from adversarial review)

### 1.1 [Fix] Formula evaluator collector try/finally 保护

- **来源**: 对抗性发现 1
- **文件**: `packages/flux-formula/src/evaluate.ts:111-116`
- **修复**: 用 try/finally 包裹 `node.compiled.exec()`，确保 `context.collector = prevCollector` 和 `finalize()` 在异常路径也执行
- **验证**: 添加测试：表达式抛异常后，后续 evaluate 的 collector 仍然正确

### 1.2 [Decision] scopeChangeHitsDependencies undefined 语义

- **来源**: 对抗性发现 2
- **文件**: `packages/flux-runtime/src/scope-change.ts:130-131`
- **决策**: 代码改为 `return true`（conservative），或文档改为 `return false`（permissive）。需明确哪个是正确语义。
- **建议**: 改代码为 `return true`（文档的 conservative 语义更安全）
- **验证**: 添加测试覆盖 undefined 参数场景

### 1.3 [Fix] submitForm bare catch 恢复原始错误

- **来源**: 对抗性发现 3
- **文件**: `packages/flux-runtime/src/action-adapter.ts:162-166`
- **修复**: 分离 resolve 和 invoke 的错误处理；invoke 的错误透传而非替换
- **验证**: 测试网络错误/验证错误透传

### 1.4 [Fix] ActionDispatcher 添加 dispose/cancelAll

- **来源**: 对抗性发现 4
- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:420-425`
- **修复**: 返回 `{ dispatch, dispose }`, dispose 清除 pendingDebounces 中所有定时器
- **文件**: `packages/flux-runtime/src/runtime-factory.ts` dispose() 调用 actionDispatcher.dispose()
- **验证**: 测试 dispose 后 debounced action 不再触发

### 1.5 [Fix] ComponentHandleRegistry 子注册表移除

- **来源**: 对抗性发现 5
- **文件**: `packages/flux-runtime/src/component-handle-registry.ts`
- **修复**: 添加 `removeFromParent()` 或 `dispose()` 方法，在子注册表不再需要时从父级 `__childRegistries` 移除
- **文件**: `packages/flux-react/src/use-node-scopes.ts` 在清理时调用 dispose
- **验证**: 测试子注册表卸载后不再出现在父级 resolveInScope 遍历中

---

## Phase 2: Developer Experience & Safety

### 2.1 [Fix] compileNode diagnostics 可启用

- **来源**: 对抗性发现 6
- **文件**: `packages/flux-compiler/src/schema-compiler.ts:590-594`
- **修复**: compileNode 方法接受 options.diagnostics 参数，不再硬编码 enabled:false；开发模式默认启用
- **验证**: 测试有语法错误的表达式在 dev 模式下产生诊断

### 2.2 [Fix] Source cascade depth 限制

- **来源**: 对抗性发现 7
- **文件**: `packages/flux-runtime/src/async-data/source-registry.ts`
- **修复**: 添加 source refresh cascade depth 计数，超过阈值时停止并报错
- **验证**: 测试互相依赖的两个 source 不会无限循环

### 2.3 [Decision] Formula registry 全局单例隔离策略

- **来源**: 对抗性发现 8
- **文件**: `packages/flux-formula/src/registry.ts:15-19`
- **决策**: 选择方案——(A) registry 实例化传入 runtime (B) 冻结 builtins 后不允许运行时修改 (C) 维持全局但添加 isolation guard for tests
- **建议**: (B) 冻结 builtins + 运行时自定义函数挂在 runtime context 上
- **验证**: 测试多 runtime 实例的函数注册不互相污染

### 2.4 [Fix] withRetry 非抛出型失败递增 failureCount

- **来源**: 对抗性发现 10
- **文件**: `packages/flux-action-core/src/operation-control.ts:186-210`
- **修复**: 在 shouldStop 返回 false 时也递增 failureCount（或统一使用 syntheticFailureCount）
- **验证**: 测试 {ok:false} 返回时退避时间正确递增

---

## Phase 3: Accessibility & Renderer Contract

### 3.1 [Fix] Form field aria-describedby 关联

- **来源**: 对抗性发现 11
- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx` 及所有 form field renderers
- **修复**: FieldFrame 生成 error message ID，通过 aria-describedby 关联到 input
- **验证**: 测试 aria-describedby 属性在有错误时指向正确 ID

### 3.2 [Fix] form-advanced className/testid 传递

- **来源**: 深度审核维度 09（3×P2）
- **文件**: `tag-list.tsx:73`, `key-value.tsx:337`, `condition-builder.tsx:110`
- **修复**: 在根 cn() 调用中添加 props.meta.className；添加 data-testid/data-cid
- **验证**: 测试 schema className 能覆盖到这些组件

### 3.3 [Fix] form-advanced i18n 硬编码

- **来源**: 深度审核维度 18 + 对抗性发现 13
- **文件**: `tree-controls.tsx:60`, `key-value.tsx:376`
- **修复**: 替换硬编码字符串为 t() 调用
- **验证**: 确认 locale JSON 中添加对应 key

---

## Phase 4: Subscription Precision (word-editor)

### 4.1 [Fix] word-editor-page.tsx selector 冗余和 equalityFn 缺失

- **来源**: 深度审核维度 05（3×P2）
- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:116-145`
- **修复**: 为 selection/datasets 订阅添加 shallowEqual；移除 editorRuntime 中与独立订阅重复的字段
- **验证**: React DevTools Profiler 确认无冗余重渲染

---

## Phase 5: Security Hardening (schema-untrusted scenarios)

### 5.1 [Decision] $JSON.parse prototype pollution 防护

- **来源**: 对抗性发现 9
- **文件**: `packages/flux-formula/src/builtins.ts:51`
- **决策**: (A) 移除 $JSON.parse (B) 包装为 safe parse (C) 文档声明 schema 必须可信
- **建议**: 如果 schema 当前全部可信，记录为 watch-only；否则包装为 safe parse
- **Why Not Blocking Closure**: 当前所有 schema 来源可信（项目内定义），无外部用户输入 schema 场景

### 5.2 [Decision] instanceof Symbol.hasInstance 风险

- **来源**: 对抗性发现 9
- **文件**: `packages/flux-formula/src/evaluator.ts:87-88`
- **决策**: 同 5.1，取决于 schema 信任模型
- **Why Not Blocking Closure**: 同上

---

## Watch-Only Residual (Not Blocking Closure)

| #   | 来源       | 文件                               | 说明                     | Why Not Blocking       |
| --- | ---------- | ---------------------------------- | ------------------------ | ---------------------- |
| W1  | 深度审核15 | flux-runtime 全局                  | 缺少 performance.mark    | 有 benchmark test 替代 |
| W2  | 深度审核01 | word-editor-renderers/package.json | theme-tokens 直接依赖    | 功能无害               |
| W3  | 深度审核07 | crud-renderer-state.ts:273         | scope 初始化在 effect 中 | 无运行时风险           |
| W4  | 深度审核03 | flux-action-core/index.ts:37       | 无消费者 re-export       | 无运行时影响           |
| W5  | 深度审核14 | flux-i18n, flux-action-core        | 测试密度偏低             | 已有 plan-143 覆盖     |
| W6  | 深度审核16 | module-boundaries.md               | 遗漏 2 个文件            | 仅文档                 |
| W7  | 对抗性14   | spreadsheet-core/command-handlers  | 0 测试                   | 已有 plan-143 覆盖     |

---

## Exit Criteria

Phase 1 完成 = 5 项全部 landed + 每项有 focused test  
Phase 2 完成 = 4 项全部 landed + decisions 记录在 architecture docs  
Phase 3 完成 = 3 项全部 landed + e2e 验证 a11y  
Phase 4 完成 = 1 项 landed + profiler 无冗余渲染证据  
Phase 5 完成 = decisions 记录在 security-design-requirements.md

## Validation Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Phase 1-4 每项有对应新增测试
- [ ] Phase 2.1/2.3/5.1/5.2 的 decisions 更新到对应 architecture doc
- [ ] docs/architecture/dependency-tracking.md 与代码一致（发现2修复后）
