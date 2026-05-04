# 对抗性审查报告 — 2026-05-04 (第五轮: V10 死代码清道夫 + V4 异常路径侦探)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。

---

## 视角选择

- **V10 死代码清道夫** — 此前审查均聚焦运行时行为，从未检查公开 API 表面是否存在无消费者的导出。
- **V4 异常路径侦探** — 已有报告提及 "错误吞没"，但未系统检查 _状态半更新_ 问题：即异常发生时 isSubmitting/store 等标志是否能正确恢复。

---

## V10 发现：死代码与幽灵配置

### 发现 1：flux-compiler 公开 API 过度导出 (MEDIUM)

**在哪里**

- `packages/flux-compiler/src/index.ts`

**是什么**

以下导出从未被任何外部包导入：

- `createBaseCompileSymbolTable`
- `schemaPathToJsonPointer` / `appendJsonPointer`
- `validateSchema`
- `isDataSourceFullyStatic` / `isReactionFullyStatic`
- `mergeValidationRules` / `normalizeValidationTriggers` / `normalizeValidationVisibilityTriggers`

这些是内部实现细节被提升为公开 API。增加了维护负担（改签名需考虑兼容性）且误导消费者。

**严重度**: MEDIUM  
**信心水平**: 确定（grep 验证无外部 import）。

---

### 发现 2：`SchemaCompilerDiagnosticsContext.continueOnError` 是死配置 (MEDIUM)

**在哪里**

- `packages/flux-compiler/src/schema-compiler/diagnostics.ts:17`

**是什么**

字段已定义但运行时无任何代码读取此值来决定是否继续编译。编译要么成功要么整体 crash，不存在 "部分编译" 模式。这是一个误导性的 API 承诺。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

### 发现 3：`createModuleCache` 无生产消费者 (LOW)

**在哪里**

- `packages/flux-runtime/src/index.ts`（公开导出）

**是什么**

仅在测试文件中被引用。生产代码通过 `createRendererRuntime` 内部创建 cache，不需要外部构造。公开导出无实际用途。

**严重度**: LOW  
**信心水平**: 确定。

---

### 发现 4：Workbench types 无外部消费者 (LOW)

**在哪里**

- `packages/flux-core/src/workbench/types.ts`（`WorkbenchSessionState`, `ResourceBrowserInteractionPolicy`, `BusyActionPhase`, `BusyActionState`）

**是什么**

这些类型被导出但外部包从未直接 import。可能是面向未来的预留，但无 `@planned` 或 `@internal` 标注。

**严重度**: LOW  
**信心水平**: 确定。

---

## V4 发现：异常路径状态损坏

### 发现 5：Submit 流程 try/finally 覆盖不完整 — form 可能永久卡在 submitting (HIGH)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-submit-flow.ts:106-293`

**是什么**

`executeFormSubmit` 函数结构：

```
line 106: setIsSubmitting(true)
line 119: store.setSubmitting(true)
line 146: supersedeLowerPriorityWork()
line 151: validateForm('submit')  ← 可能抛异常
line 182-219: childContracts validation ← Promise.all, 可能 reject
...
line 252: try {  ← finally 从这里开始
line 284:   finally { setIsSubmitting(false); store.setSubmitting(false) }
```

如果 `validateForm` 或 `childContracts.triggerValidation()` 抛出（非 cancel）异常，执行不会到达 line 252 的 try block，`finally` 中的清理永远不执行。**表单永久卡在 `submitting: true`**，所有 submit 按钮永久禁用，用户无法提交。

**具体触发场景**

- 自定义 validator 抛出 TypeError（如 `Cannot read property 'x' of undefined`）
- `childContracts.triggerValidation()` 中的子表单 runtime 已 disposed（访问已清空的 Map throws）
- `Promise.all(childValidationPromises)` 中一个 child reject

**修复方案**: 将 `setIsSubmitting(true)` 到 return 之间的整个函数体包在 try/finally 中。

**严重度**: HIGH  
**信心水平**: 确定 — 代码结构清晰可见。

---

### 发现 6：自定义 validator 抛非 Error 值时异常未被捕获 (MEDIUM)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-validation.ts:230-296`

**是什么**

`validatePath` 的 catch block 只检查 `error === VALIDATION_CANCELLED`。如果自定义 validator 抛出字符串、null、或其他非 Error 值，catch 不匹配 cancel 后重新 throw，最终成为 unhandled rejection（如果在 async 上下文）或崩溃 React render tree。

**修复方案**: 在 catch 中对非 Error thrown values 做规范化包装（`new Error(String(thrown))`）。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

### 发现 7：`onSettled` 错误被吞没导致清理逻辑静默丢失 (MEDIUM)

**在哪里**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:236-255`

**是什么**

`onSettled` branch 如果 throw，错误被 catch 后仅调用 `notify('error', message)`。如果 `onSettled` 负责重置 busy state、关闭 loading indicator、或清理临时数据，这些清理静默丢失。调用者收到的结果仍是 `previous`（settled 之前的结果），完全不知道 settlement 失败。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

### 发现 8：Schema 编译无部分成功机制 — 一个节点 throw 整棵树丢失 (MEDIUM)

**在哪里**

- `packages/flux-compiler/src/schema-compiler.ts:543-563`

**是什么**

`compileSchemaToTemplateNodes` 是递归的。如果树中任一节点的编译抛出（如 expression parse error），整个 schema 编译失败。没有 "跳过失败节点继续编译其他" 的降级策略。`continueOnError` 配置存在但从未生效（见 V10 发现 2）。

对于大型 schema（100+ 节点），一个 typo 在某个深层节点的 expression 中就会导致整页无法渲染。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## 总评

### 最值得关注的方向

1. **Submit 流程的 try/finally 覆盖范围**（发现 5）— 这是一个确定的、可在生产触发的 bug，会导致表单永久锁死。修复简单（扩大 try/finally 范围），影响巨大。

2. **公开 API 表面治理**（发现 1-4）— `flux-compiler` 导出了大量内部实现为公开 API，增加了未来重构的兼容性负担。建议将未被外部使用的导出标记为 `@internal` 或移除。

3. **Schema 编译的容错降级**（发现 8）— 对于低代码平台，单节点错误不应导致整页白屏。建议实现 "替换为 error placeholder 节点" 的降级策略。

### 盲区自评

- 未检查 `flux-react` 中 ErrorBoundary 的放置是否足以 catch 发现 6 中的 validator 异常。
- 未深入追踪所有 `void promise` 模式（fire-and-forget async）是否都有 unhandled rejection 风险。
- 未检查 `flux-i18n` 的 key missing fallback 是否会导致异常。

**建议下次视角**：V1（新人开发者）+ V7（契约考古学家）。
