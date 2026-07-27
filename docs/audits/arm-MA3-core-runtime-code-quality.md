# MA3.1 — Core + Runtime 包簇代码质量审计

> Plan: `docs/plans/2026-07-27-0800-3-ma2-runtime-correctness-audit.md` (Phase 1 of MA3)
> Status: completed
> Date: 2026-07-27
> Scope: `packages/flux-core/`, `packages/flux-formula/`, `packages/flux-compiler/`, `packages/flux-action-core/`, `packages/flux-runtime/`, `packages/flux-react/`, `packages/flux-bundle/`

---

## MA3.1-1: `check:audit-suspects` 扫描结果（已过滤 core+runtime 集群）

工具命令：`pnpm check:audit-suspects`

全仓 435 个匹配项，过滤后属于 7 个目标包的结果：

### void-promise-no-catch

已由 MA2 完成分析（`docs/audits/arm-MA2-core-schema-dispatch.md`），15 个都是合法的 fire-and-forget。MA3 无新增。

### catch-without-structured-failure-path

| 文件                                                         | 行号          | catch 模式                                                 | 评估                                                                                                       |
| ------------------------------------------------------------ | ------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `flux-action-core/src/action-core.ts`                        | 394, 416      | `catch (error) { console.error(…, error); return false; }` | 结构化的 — 回退到 false 并输出警告                                                                         |
| `flux-action-core/src/action-dispatcher/action-execution.ts` | 147, 159, 177 | `catch { /* 空或状态机处理 */ }`                           | 结构化的 — 通过 `WeakSet<ActionResult>` + 状态机追踪失败路径                                               |
| `flux-action-core/src/action-dispatcher/action-execution.ts` | 367, 602      | `catch (error) { … }`                                      | 结构化的 — 错误被转为 `ActionResult` 并进入 retry/fallback                                                 |
| `flux-action-core/src/action-dispatcher/action-runners.ts`   | 64            | `catch { … }`                                              | 结构化的 — 错误在 runner 栈中路由                                                                          |
| `flux-compiler/src/validation-lowering.ts`                   | 234           | `catch (err) { … }`                                        | 结构化的 — validation 错误被降级为诊断                                                                     |
| `flux-core/src/strict-mode.ts`                               | 31, 40, 53    | `catch { … }`                                              | 合法的 — strict-mode 副作用，预期静默失败                                                                  |
| `flux-core/src/utils/debounce.ts`                            | 33            | `catch (error) { console.error(…) }`                       | 合法的 — fire-and-forget timing                                                                            |
| `flux-core/src/value-adapter.ts`                             | 381           | `catch (error) { … }`                                      | 合法的 — adapter update 回退                                                                               |
| `flux-formula/src/compile/static-eval.ts`                    | 180           | `catch { … }`                                              | 合法的 — eval 静默回退                                                                                     |
| `flux-react/src/container-hooks.ts`                          | 87            | `catch { /* 空 */ }`                                       | **P1** — 空的 catch 块会吞掉 `componentRegistry.resolve()` 的异常（如组件名歧义）。应至少加 `console.warn` |
| `flux-react/src/node-error-boundary.tsx`                     | 38            | `catch { message = ''; }`                                  | 无害 — `String(error)` 可能抛出                                                                            |
| `flux-react/src/renderer-helpers.ts`                         | 117, 183      | `catch (error) { console.error; return false; }`           | 结构化的 — 表达式求值失败回退                                                                              |

**核心结论**：除 `container-hooks.ts:87` 外，所有 catch 都是结构化的。错误要么回退到合理的默认值，要么通过 `ActionResult` 或状态机路由。

---

## MA3.1-2: `check:audit-react19-optimization-candidates` 过滤结果

工具命令：`pnpm check:audit-react19-optimization-candidates`

全仓 502 个匹配项，过滤后属于 7 个目标包：

### redundant-react-memo

| 文件                                        | 行号 | 现状                                                                     | 评估                                                              |
| ------------------------------------------- | ---- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `flux-react/src/node-renderer.tsx`          | 65   | `export const NodeRenderer = memo(function NodeRenderer`                 | React Compiler 已启用，此 memo 冗余。但无性能影响，仅代码风格问题 |
| `flux-react/src/node-renderer-resolved.tsx` | 56   | `export const NodeRendererResolved = memo(function NodeRendererResolved` | 该组件有 `'use no memo'` 指令，memo 是必要的 — **不是冗余**       |

### redundant-use-callback

| 文件                               | 行号 | 现状                                            | 评估                          |
| ---------------------------------- | ---- | ----------------------------------------------- | ----------------------------- |
| `flux-react/src/node-renderer.tsx` | 117  | `const getImportFrameSnapshot = useCallback(…)` | 冗余 — Compiler auto-memoizes |
| `flux-react/src/dialog-host.tsx`   | 203  | `const handleClose = React.useCallback(…)`      | 冗余 — Compiler auto-memoizes |
| `flux-react/src/dialog-host.tsx`   | 382  | `const handleClose = React.useCallback(…)`      | 冗余 — Compiler auto-memoizes |

### redundant-use-memo

工具未报告 7 个目标包中有冗余 useMemo（`schema-renderer.tsx` 中的 useMemo 用法有实际依赖，不是冗余）。

### 不在目标包但值得注意的上下文

- `flux-bundle/` 中没有 React 组件，无相关发现。
- `flux-core/`, `flux-runtime/`, `flux-compiler/`, `flux-action-core/`, `flux-formula/` 中无 React hooks，因此无优化候选。

---

## MA3.1-3: 手动代码质量审计

### 文件大小与复杂度

#### 超 700 行硬限制的文件

| 文件                                                          | 行数    | 风险评估                                                                                                            |
| ------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `flux-runtime/src/form-runtime-owner.ts`                      | **739** | 超过 700 行硬限制。包含 owner lifecycle、owner field states、owner-level external errors。建议拆分为 2-3 个文件     |
| `flux-compiler/src/schema-compiler/node-compiler.ts`          | **731** | 超过 700 行硬限制。单一节点编译逻辑。复杂度高但职责集中。可考虑提取子模块                                           |
| `flux-action-core/src/action-dispatcher/action-execution.ts`  | **706** | 刚好超 700 行。文件自身注释（第 37-44 行）已讨论了不拆分的原因 — 流水线式调用链的凝聚性。**维持现状是可接受的折中** |
| `flux-compiler/src/schema-compiler/shape-validation-rules.ts` | **706** | 刚好超 700 行。校验规则集中存储。职责清晰，但可考虑拆出类型守卫                                                     |

#### 600-700 行的高复杂度文件（接近限制）

| 文件                                             | 行数 | 备注                                                             |
| ------------------------------------------------ | ---- | ---------------------------------------------------------------- |
| `flux-runtime/src/runtime-factory.ts`            | 678  | 运行时工厂 — 大量依赖注入，但本质是组合代码，复杂度可接受        |
| `flux-runtime/src/form-runtime-validation.ts`    | 612  | 表单校验运行时 — 逻辑密度高                                      |
| `flux-runtime/src/async-data/request-runtime.ts` | 595  | API 请求执行器 — 包含 retry、timeout、cache、in-flight tracking  |
| `flux-runtime/src/scope.ts`                      | 589  | Scope 实现 — 核心数据流基元                                      |
| `flux-runtime/src/import-stack.ts`               | 581  | Import 栈管理 — 复杂度适当                                       |
| `flux-runtime/src/form-runtime.ts`               | 634  | 表单运行时入口 — 路由到各个子模块                                |
| `flux-runtime/src/form-store.ts`                 | 630  | 表单 Store — 状态管理核心                                        |
| `flux-react/src/dialog-host.tsx`                 | 556  | Dialog/Drawer 宿主组件 — 含 2 个 handleClose useCallback（冗余） |
| `flux-react/src/render-nodes.tsx`                | 526  | RenderNodes 核心渲染入口                                         |
| `flux-core/src/types/actions.ts`                 | 532  | Action 类型定义 — 含大量条件类型；类型复杂度高但属必要复杂度     |
| `flux-core/src/types/renderer-core.ts`           | 455  | RendererRuntime 核心接口 + 大量 comment 文档。行数合理           |

### 重复模式与反模式

#### 积极：一致的错误处理结构

action dispatch 流水线使用统一的 `ActionResult` 契约：

- `ok: boolean` + `error?: unknown` + `cancelled?: boolean` + `timedOut?: boolean`
- `caughtFailureResults: WeakSet<ActionResult>` 防止双重处理
- 所有异步失败路径返回结构化的 `ActionResult`，而非裸 throw

#### 积极：AbortController 取消模式

`flux-react/src/schema-renderer.tsx:353-409` — schema import 预加载使用了 `AbortController` + 单调递增 `requestId` 来处理竞态。这是正确的竞态管理。

#### 中性：`queueMicrotask` 延迟清理

`flux-react/src/schema-renderer.tsx:238-243` — 运行时、action scope、component registry 的清理使用 `queueMicrotask` 延迟。这是一种正确的延迟清理模式，防止在 unmount 过程中过早释放被父组件仍在使用的资源。

#### 负面：`container-hooks.ts:87` 空 catch

```ts
} catch {
  // resolve throws if componentName is ambiguous — fall through
}
```

注释说明意图，但 silent swallow 会掩盖配置错误。最低应加 `console.warn`。

#### 中性：`NodeRendererResolved` 的 `'use no memo'`

`packages/flux-react/src/node-renderer-resolved.tsx:65` — 显式禁用了 React Compiler 自动记忆化。该组件管理复杂的作用域订阅和 import frame 生命周期，`'use no memo'` 是有意为之的优化控制，不是错误。

### catch 块未使用结构化失败路径的分布

在 target 包中，以下 catch 块仅使用 `console.error` 做错误报告，没有结构化失败路径：

| 文件                                  | 行号     | catch 内容         | 建议                                                                   |
| ------------------------------------- | -------- | ------------------ | ---------------------------------------------------------------------- |
| `flux-action-core/src/action-core.ts` | 394, 416 | `console.error(…)` | 当前可接受 — 仅在 preventDefault eval 失败时输出警告，不影响运行时语义 |
| `flux-react/src/renderer-helpers.ts`  | 117      | `console.error(…)` | 同上                                                                   |
| `flux-core/src/utils/debounce.ts`     | 33       | `console.error(…)` | 同上                                                                   |
| `flux-core/src/value-adapter.ts`      | 381      | `console.error(…)` | 同上                                                                   |

这些是表达式求值回退或时序边界，结构化错误路由会增加不必要的复杂性。

---

## MA3.1-4: React 19 实践审查

### `startTransition` / `useTransition`

**7 个目标包中未使用 `startTransition` 或 `useTransition`。**

评估：这是正确的。Core + Runtime 包簇处理 action dispatch、schema compilation、scope management，不是 UI transition 的归属层。renderer 包（不在本审计范围）可能会在 UI-heavy 场景（搜索过滤、视图切换）使用。

### `useCallback` / `useMemo` / `React.memo` 冗余

3 处冗余（详见 MA3.1-2）。均为 P3 级别 — 不影响正确性，仅代码风格收敛问题。

### 派生状态在 effect 中的模式

未发现将派生状态放在 `useEffect` 中同步回 `setState` 的模式。表单状态和 scope 数据通过 Zustand store + `useSyncExternalStore` 订阅，而非 React 状态镜像。这是正确架构。

### 竞态管理

`schema-renderer.tsx:353-409` — Import 预加载使用 `AbortController` + request ID 比较。模式正确。

`node-renderer.tsx` 中的 Import 栈生命周期使用 `useLayoutEffect` cleanup 来确保正确的多帧生命周期。正确。

---

## MA3.1-5: 发现汇总

| ID      | 严重度 | 包               | 类别          | 描述                                                                           | 行动                                                      |
| ------- | ------ | ---------------- | ------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| MA3-F01 | P1     | flux-react       | 错误处理      | `container-hooks.ts:87` — 空 catch 块吞掉 `componentRegistry.resolve()` 的异常 | 加 `console.warn` 或至少记录错误                          |
| MA3-F02 | P2     | flux-runtime     | 文件大小      | `form-runtime-owner.ts` (739 行) 超过 700 行硬限制                             | 考虑拆分 owner lifecycle / field states / external errors |
| MA3-F03 | P2     | flux-compiler    | 文件大小      | `node-compiler.ts` (731 行) 超过 700 行硬限制                                  | 考虑提取子模块                                            |
| MA3-F04 | P2     | flux-compiler    | 文件大小      | `shape-validation-rules.ts` (706 行) 刚好超 700 行硬限制                       | 可选择提取类型守卫                                        |
| MA3-F05 | P2     | flux-action-core | 文件大小      | `action-execution.ts` (706 行) 刚好超 700 行硬限制                             | 已有计划注释说明不拆分的理由，维持现状                    |
| MA3-F06 | P3     | flux-react       | React 19 冗余 | `node-renderer.tsx:65` memo 在 React Compiler 下冗余                           | 可选择移除                                                |
| MA3-F07 | P3     | flux-react       | React 19 冗余 | `node-renderer.tsx:117` useCallback 冗余                                       | 可选择移除                                                |
| MA3-F08 | P3     | flux-react       | React 19 冗余 | `dialog-host.tsx:203,382` 两个 useCallback 冗余                                | 可选择移除                                                |
| MA3-F09 | P3     | all 7 packages   | 文档          | 15 个 void-promise 已知合理，无变更                                            | 已在 MA2 记录，无需重复处理                               |

---

## MA3.1-6: 结论

### 整体评估

核心 + 运行时包簇的代码质量处于**良好水平**：

1. **错误处理**：大多数 catch 块是结构化的，使用 `ActionResult` / 状态机 / 合理默认值。只有一个 P1 级别的空白 catch 块（`container-hooks.ts:87`）。
2. **文件大小**：4 个文件超过 700 行硬限制，但其中 `action-execution.ts` 经过设计讨论决定维持现状，合理的复杂度和凝聚性使不分拆可接受。`form-runtime-owner.ts` 和 `node-compiler.ts` 确实应考虑拆分。
3. **React 19 合规**：3 处冗余 memo/useCallback，全部在 flux-react 包，均为 P3 级别。核心运行时包（flux-runtime, flux-core 等）全部不含 React 组件，无 React 19 迁移问题。
4. **类型安全**：wide type（`Record<string, unknown>`, `any` 等）被正确限制在 schema / runtime payload 边界。低代码引擎的弱类型对象问题在这里是受控现实，没有扩散到核心逻辑。
5. **无 P0 发现**：未发现真实的 bug 或硬性契约违约。

### 无代码变更要求

MA3 的 Phase 1 是纯审计阶段，本报告不要求任何代码变更。P1-MA3-F01（空白 catch）建议在后续的 bug-fix 周期中顺手修复。

### 自动化建议

`container-hooks.ts:87` 的空白 catch 块当前不被任何 lint 规则捕获。建议但非必需的自动化补充：

- 可添加一个自定义规则（repo-specific check）禁止无注释的空 catch 块
- 但当前只有 1 处，ROI 低，不值得独立写规则
