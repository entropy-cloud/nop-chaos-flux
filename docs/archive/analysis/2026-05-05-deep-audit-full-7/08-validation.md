# 维度 08：验证系统一致性

## 第1轮初审

### [维度08] 祖先隐藏会在子节点卸载清理时把字段错误地重新标记为可参与验证

- **文件**: `packages/flux-react/src/node-renderer.tsx:314-328`, `packages/flux-runtime/src/form-runtime-field-ops.ts:249-289`
- **严重程度**: P1
- **验证生命周期阶段**: 注册
- **现状**: hidden participation 只用 `Set<string>` 记录精确 path；cleanup 无条件 `notifyFieldHidden(path, false)`。
- **风险**: 隐藏子树字段可能在仍不可见时重新参与验证，阻塞 submit。
- **建议**: 改为隐藏深度/引用计数，或按 owner participation 重算。

### [维度08] hidden 切换不会中止已启动的 async validation，且 stale settle 被记为 succeeded

- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:255-263`, `packages/flux-runtime/src/form-runtime-validation.ts:335-343`
- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: hidden 只取消 debounce，不 abort 当前 async run。
- **建议**: 在 hidden 时 invalidate/abort 当前 path async run，并将 stale settle 标记为 cancelled/stale-dropped。

## 深挖第3轮追加

### [维度08] 表单字段 change/blur 触发会丢失验证 reason，实际按 manual 执行

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:68-75,106-121`, `packages/flux-runtime/src/form-runtime-validation.ts:232-238`
- **严重程度**: P2
- **验证生命周期阶段**: 触发
- **现状**: UI 层按 change/blur 决策，但调用 `validateField` 时不传 reason，runtime 统一记成 manual。
- **建议**: 交互触发统一显式透传 `change` / `blur` / `commit` reason。

### [维度08] 跨 scope draft commit 回写后的父级重验常以 manual 执行，未保留 commit 优先级语义

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:186-188`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:188-201`, `packages/flux-runtime/src/form-runtime-validation.ts:270-276`
- **严重程度**: P2
- **验证生命周期阶段**: 跨 scope 触发
- **现状**: child owner confirm/writeback 后，父级重验未统一显式传 `commit`。
- **建议**: 回写后的父级重验统一显式使用 `commit`。

## 深挖第4轮追加

### [维度08] hidden participation 只按精确 path 记录，隐藏父路径不会让后代编译字段自动退出验证

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:430-444`, `packages/flux-runtime/src/form-runtime-field-ops.ts:249-289`
- **严重程度**: P1
- **验证生命周期阶段**: 执行
- **现状**: `validatePath()` 只检查 `hiddenFields.has(path)`，没有祖先/子树传播。
- **建议**: hidden participation 按 subtree 传播，或执行前按祖先 hidden 状态重算参与集。

### [维度08] object-field 在 inherit-owner 路径上注册 `ChildValidationContract`

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:364-394,424-435`, `packages/flux-compiler/src/schema-compiler.ts:406-419`
- **严重程度**: P2
- **验证生命周期阶段**: 跨 scope 验证
- **现状**: 编译结果不是 child owner，但运行时仍用 child owner 合同机制。
- **建议**: 用父 owner 本地 pending/commit 协调机制，不要用 `ChildValidationContract` 表达 inherit-owner 子树。

## 深挖统计

- 第1轮发现数：2
- 第2轮新增：0
- 第3轮新增：2
- 第4轮新增：2

## 维度复核结论

- 初审与深挖共 6 项，独立复核后保留 1 项、降级 4 项、驳回 1 项。
- 本维度最终只保留 hidden participation 的 subtree 传播缺口；其余多为语义/观测偏差或与根因项重复。

## 子项复核结论

- `[维度08] 祖先隐藏会在子节点卸载清理时把字段错误地重新标记为可参与验证`: 降级。现象成立，但本质是“hidden 只按精确 path 记录、没有祖先/子树传播”的派生症状，和根因项重复。
- `[维度08] hidden 切换不会中止已启动的 async validation，且 stale settle 被记为 succeeded`: 降级。不会 abort 当前 async run 属实，但 stale 结果已被 runId/generation 检查拦住，主要是资源浪费与记账不准。
- `[维度08] 表单字段 change/blur 触发会丢失验证 reason，实际按 manual 执行`: 降级。form 分支未透传 `change`/`blur` 属实，但当前 runtime 真正区分优先级的主要是 `submit`/`commit`。
- `[维度08] 跨 scope draft commit 回写后的父级重验常以 manual 执行，未保留 commit 优先级语义`: 降级。影响主要落在 debounce 优先级与原因标记，不太改变最终校验正确性。
- `[维度08] hidden participation 只按精确 path 记录，隐藏父路径不会让后代编译字段自动退出验证`: 保留。`validatePath()` 只检查 `hiddenFields.has(path)`，父级隐藏不会天然让后代字段退出验证，是实际一致性缺口。
- `[维度08] object-field 在 inherit-owner 路径上注册 ChildValidationContract`: 驳回。这里的 `ChildValidationContract` 主要用于 submit 时等待 `transformOut`/补触发校验，不足以认定为错误 owner 边界。
