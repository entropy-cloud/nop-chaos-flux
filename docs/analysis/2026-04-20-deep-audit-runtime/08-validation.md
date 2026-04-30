# 维度08：验证系统一致性

## 审核日期: 2026-04-20

## 整体评估

当前验证系统处于文档定义的 **Phase 2** 阶段，与文档描述的 Phase 2 范围一致。Phase 3 目标（compiler-driven owner partitioning、ValidationScopeRuntime 独立实现、更丰富的 NodeKind）在代码和文档中均有清晰标注，不属于当前缺陷。

## 发现清单（经初审+维度复核+子项复核）

### [P2→P3] registerField 未校验路径所有权

- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:99-148`
- **严重程度**: P3（维度复核降级）
- **验证生命周期阶段**: 注册
- **现状**: `registerField` 检查了 disposed 和重复路径，但未校验被注册路径是否属于当前 form runtime 的 scope 域。
- **风险**: 理论风险而非实际缺陷——调用者均为框架内部控制路径，且 setValue 已通过 isPathOwned 做路径校验。
- **建议**: 添加防御性 isPathOwned 检查（防御性编程建议）。

### [P2→P3] validateForm 并行验证可能交错读写 store

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:286-291`
- **严重程度**: P3（维度复核降级）
- **验证生命周期阶段**: 执行
- **现状**: `validateForm` 使用 Promise.all 并行验证所有路径。JavaScript 单线程保证 async yield 点之间的同步代码原子执行。runId + modelGeneration stale-check 和 store.batchUpdate 不可变合并提供双重保护。
- **风险**: 验证顺序不确定的语义问题，非数据竞争 bug。
- **建议**: 当前行为正确。如有严格的验证顺序需求可改为顺序执行。

### [P2→P3] computeScopeState 不区分 external/rule errors

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:36-64`
- **严重程度**: P3（子项复核降级）
- **验证生命周期阶段**: 结果展示
- **现状**: external errors 和 rule-produced errors 混存在同一个 `fs.errors` 数组中，`computeScopeState` 统一判定 `valid`。当前行为语义合理（有错误即标记 invalid），但限制了扩展性。
- **建议**: 若未来需区分，在 ScopeValidationStateSnapshot 中增加细分字段。改动面小（单函数内）。

### [P3] revalidateDependents 对未 touched 依赖者使用 system reason

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:84-112`
- **严重程度**: P3
- **验证生命周期阶段**: 触发
- **现状**: 行为正确——未交互过的字段不应显示 change 触发的错误。system 不修改 touched 状态。
- **建议**: 添加注释说明 reason 选择逻辑和 display policy 的交互。

### [P3] 依赖闭包扩展不传递（仅单层）

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:66-113`
- **严重程度**: P3
- **验证生命周期阶段**: 触发
- **现状**: revalidateDependents 仅查找直接依赖者，不做传递性闭包展开。当前规则类型下语义正确（值变更的单层传播足够）。
- **建议**: 添加注释标注"单层扩展，不递归"。引入新规则类型时重新评估。

### [P3] detail-field commit 写回后未等待父 scope 重验证

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:151-153`
- **严重程度**: P3
- **验证生命周期阶段**: 执行
- **现状**: `void parentForm.validateField(name)` fire-and-forget。验证错误最终会显示但存在视觉短暂不一致。
- **建议**: 可选改为 `await` 以确保即时反馈。

### [P3] detail-view commit 写回后未等待重验证

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:155-157,167`
- **严重程度**: P3
- **现状**: 同上 fire-and-forget 模式。
- **建议**: 同上。

### [驳回] sourceKind 扩展了文档定义的枚举集合

- **排除理由**: 代码类型定义本身即规范。`'form'` 和 `'runtime-registration'` 是实现必需的值。应更新文档以匹配代码。

### [驳回] CompiledValidationNodeKind 是文档的 Phase 2 子集

- **排除理由**: Phase 3 规划功能。当前实现与 Phase 2 目标完全一致。

### [P3] ValidationScopeRuntime 无独立实现

- **文件**: `packages/flux-core/src/types/runtime.ts:271-297`
- **严重程度**: P3
- **现状**: 接口已定义，FormRuntime 是唯一具体实现。非表单验证场景必须使用 FormRuntime。
- **建议**: Phase 3 目标。当前可通过不调用 submit 规避。

### [驳回] 编译时无 owner boundary 分区

- **排除理由**: Phase 2+ 架构增强。当前 childContracts 机制实现了父子表单验证协调。CompiledFormValidationModel 有 ownerId 字段预留。

## 正面评估

| 架构特性                       | 状态                             |
| ------------------------------ | -------------------------------- |
| 验证所有权（FormRuntime 拥有） | 正确实现                         |
| fieldStates 单一 flat map      | 与文档一致                       |
| 异步验证 generation-aware      | runId + modelGeneration 双重检查 |
| submit/commit bypass debounce  | waitForValidationDebounce 正确   |
| per-path 订阅                  | subscribeToPath O(1) 唤醒        |
| showErrorOn 策略               | 四种触发器完整实现               |
| 隐藏字段策略                   | validateWhenHidden 正确          |
| 草稿隔离                       | 独立 FormRuntime 实例            |
| 外部错误注入                   | sourceId 粒度管理                |
| 编译时依赖图                   | 正确构建                         |

## 统计

| 严重程度 | 数量 |
| -------- | ---- |
| P2       | 0    |
| P3       | 7    |
| 驳回     | 3    |
