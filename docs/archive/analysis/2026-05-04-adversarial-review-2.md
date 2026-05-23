# 对抗性审查报告 — 2026-05-04 (第二轮)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。

---

## 视角选择

基于已有 6 份对抗性审查报告的覆盖分析：

- **V6 生命周期追踪者** — 已有报告多次提及 dispose 缺失，但从未深入追踪 _验证请求中断_ 的具体路径。本次重点追踪 async validation abort 的完整生命周期。
- **V3 10x 规模运维者** — 已有报告提到 O(n*m) 热路径但未追踪 *并发 action dispatch\* 的压力模型。本次关注 action 系统在高频触发下的行为。
- **V12 未来破坏者** — 未被任何已有报告使用。关注当前设计在下一个合理需求（如多 runtime 实例、SSR、跨 tab 同步）到来时会被迫 hack 的点。

---

## 发现 1：表单 dispose 时在途异步验证请求未中止 (HIGH)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-owner-lifecycle.ts:119-128`
- `packages/flux-runtime/src/form/form-runtime-validation.ts:99-117`

**是什么**

`disposeOwnerState()` 调用 `cancelAllValidationDebounces()` 来中止待执行的验证。但 `cancelAllValidationDebounces` 只遍历 `pendingValidationDebounces.keys()`。已经过了 debounce 阶段、正在执行异步 HTTP 验证的字段，其 path 已从 `pendingValidationDebounces` 中移除，但 `AbortController` 仍存在于 `validationAbortControllers` 中。

`disposeOwnerState()` 随后执行 `validationAbortControllers.clear()` — 这只是清空 Map 引用，**从未对每个 controller 调用 `.abort()`**。

**结果**：表单销毁后，在途的异步验证 HTTP 请求继续执行。响应回来后尝试写入已销毁的 form store，可能触发 "set state on unmounted" 警告或静默失败。

**为什么值得关心**

- 在 SPA 场景下频繁打开/关闭带异步验证的 Dialog 表单时，每次关闭都会泄漏 HTTP 请求。
- 如果验证 endpoint 响应慢（2-5s），每次 dialog 关闭后都有一个"幽灵请求"在跑。
- 后端看到的请求量是用户预期的 2x 或更多。

**信心水平**：确定。代码路径清晰可追踪。

**发现来源视角**：V6 生命周期追踪者

**递进深挖**：

1. 孤例还是模式？→ 孤例。其他地方（source-registry、reaction-runtime）都正确调用了 `abort()`。
2. 为什么出现？→ `cancelAllValidationDebounces` 的命名暗示它只处理 debounce 阶段，但调用者期望它清理所有验证相关资源。
3. 修复方案：在 `disposeOwnerState` 中，`clear()` 之前对 `validationAbortControllers` 的所有 values 调用 `.abort()`。
4. 预防措施：可在 `AbortController` 外增加一个 `isDisposed` 守卫，验证回调中 early-return。

---

## 发现 2：Action dispatcher 无全局并发限制 (MEDIUM)

**在哪里**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:408-426`（`createActionDispatcher`）
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:287-406`（`dispatch`）

**是什么**

每次 `dispatch()` 调用独立执行，无队列深度限制、无并发上限、无背压信号。Debounce 只保护*同一 action key* 的重复触发，不限制*不同 action* 的并发总量。

在复杂表单场景下（100+ 字段，每个 onChange 触发一个 action），快速输入可以在数百毫秒内发起几十个并发 dispatch，每个都可能包含网络请求。

**为什么值得关心**

- 浏览器有 6 个 TCP 连接上限（同域）。超出的请求排队在浏览器层面，但 JS 层面仍持有 Promise + AbortController 资源。
- 大量并发 dispatch 会导致 GC 压力和内存峰值。
- 如果 actions 有副作用（toast notifications、state mutations），并发爆发可能导致 UI 闪烁或状态覆盖竞争。

**信心水平**：很可能。实际影响取决于具体 schema 配置，但架构上无防护。

**发现来源视角**：V3 10x 规模运维者

---

## 发现 3：`Promise.all` 在 parallel actions 中无并发上限 (MEDIUM)

**在哪里**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:37-64`（`runParallelActions`）

**是什么**

`action.parallel` 数组中的所有条目通过 `Promise.all` 同时启动，无 concurrency limit。Schema 作者可以配置任意数量的并行 action。

**为什么值得关心**

- 如果 schema 来自低信任来源（CMS 配置、用户自定义），一个含 50 个并行 ajax action 的 schema 会瞬间发起 50 个 HTTP 请求。
- 结合发现 2，这构成一个资源耗尽向量。

**信心水平**：确定（代码明确）。实际利用依赖 schema 来源的可信度。

**发现来源视角**：V3 + V2（交叉：规模 + 恶意输入）

---

## 发现 4：API 缓存无突变感知失效机制 (MEDIUM)

**在哪里**

- `packages/flux-runtime/src/async-data/api-cache.ts`（全文件）
- `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:120-171`（cache hit path）

**是什么**

缓存是纯 TTL 策略，无任何基于突变的失效。当一个 POST/PUT action 成功修改服务端数据后，同一资源的 GET 缓存不会被自动失效。消费者必须手动刷新或等待 TTL 过期。

这不是技术 bug，而是一个**架构上的 "future-breaker"**：当前因为大多数页面是简单 CRUD，手动 refresh 尚可。但当 schema 变复杂（多个 data source 共享同一 entity、乐观更新需求），缺少 mutation-aware invalidation 将迫使每个 schema 作者手写 refresh logic，形成维护灾难。

**为什么值得关心**

- TanStack Query、SWR 等主流方案的核心竞争力就是 mutation-based invalidation + stale-while-revalidate。
- 没有这个能力，复杂表单（如 master-detail、跨 surface 编辑）会积累大量手动 refresh action 配置。

**信心水平**：确定（架构层面的缺失，非代码 bug）。

**发现来源视角**：V12 未来破坏者

---

## 发现 5：Module cache 无上限、无淘汰机制 (LOW-MEDIUM)

**在哪里**

- `packages/flux-runtime/src/runtime-factory.ts:49-73`（`createModuleCache`）

**是什么**

`resolved` Map 只增不减。对于长时间运行的 SPA（如后台管理系统），如果页面间使用不同的动态 import schema，module cache 会无限增长。

API cache 有 200 条上限和 TTL；module cache 没有任何淘汰策略。

**为什么值得关心**

- 在大型后台系统中，用户可能访问数百个不同页面，每个页面 import 不同的 schema module。
- 每个 module 包含编译后的 action/expression 闭包，占用不小。
- 与 `RendererRuntime.dispose()` 不同步 — dispose runtime 不会清理全局 module cache。

**信心水平**：很可能（取决于实际 module 数量和大小）。

**发现来源视角**：V6 生命周期追踪者

---

## 发现 6：`XUI_ACTIONS_NAMESPACE` 常量重复定义 (LOW)

**在哪里**

- `packages/flux-core/src/constants.ts:20`
- `packages/flux-action-core/src/action-dispatcher/action-runners.ts:18`

**是什么**

`flux-action-core` 本地重新声明了 `'__xui_actions__'` 而非从 `flux-core` 导入。如果有人只修改一处，另一处会静默不同步。

**信心水平**：确定。

**发现来源视角**：V7 契约考古学家（附带发现）

---

## 发现 7：高级表单渲染器的图标按钮缺少 aria-label (MEDIUM)

**在哪里**

- `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx:141-149`（删除按钮）
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:144-177`（picker trigger）
- `packages/flux-renderers-form/src/renderers/array-editor.tsx:257-302`（add/remove 按钮）
- `packages/flux-renderers-form/src/renderers/key-value.tsx:66-102`（key/value inputs 无 label）

**是什么**

这些组件的 icon-only 按钮/交互元素没有 `aria-label`，对屏幕阅读器用户不可见。基础表单渲染器（input、select 等）做得很好，但复合组件跳过了这些。

**为什么值得关心**

- WCAG 2.1 AA 违规。如果项目面向企业客户，可能被 accessibility 审计拦截。
- 模式性问题：所有"高级"渲染器都缺少，说明没有一个 accessibility lint 规则或 review checklist 覆盖这些。

**信心水平**：确定。

**发现来源视角**：V9 无障碍用户

---

## 发现 8：`useFormErrorStoreSelector` 的 selector 每次渲染都重建 (LOW)

**在哪里**

- `packages/flux-react/src/hooks.ts:236-238`

**是什么**

```ts
const selector = useCallback((state) => args.selector(state, resolvedQuery), [args, resolvedQuery]);
```

`args` 是一个对象参数，每次调用都是新引用，所以 `useCallback` 的 deps 每次都变化，callback 每次都重建。这使得 `useSyncExternalStoreWithSelector` 的内部 selector memoization 失效——每次 render 都重新计算 selector 结果（虽然 equality function 仍阻止不必要的 re-render）。

**为什么值得关心**

- 性能浪费：selector 函数的 identity 每次变化，`useSyncExternalStoreWithSelector` 无法跳过比较。
- 在大表单（100+ 字段）中，每个字段的 error subscription 都执行多余的 selector 调用。

**信心水平**：确定。

**发现来源视角**：V3 10x 规模运维者

---

## 总评

### 最值得关注的 3 个方向

1. **验证生命周期的 abort 完整性**（发现 1）— 这是唯一一个"确定级别的资源泄漏 bug"，修复简单（一行 `forEach(c => c.abort())`），影响显著（长期运行的 SPA + 频繁 dialog 场景）。

2. **Action 系统的背压/限流设计**（发现 2+3）— 当前架构假设 schema 是可信且合理的。随着平台开放（用户自定义 schema、插件系统），缺少并发限制会成为 DoS 和 UX 问题的温床。建议至少加一个 `maxConcurrentDispatches` 选项。

3. **数据层的 mutation-aware invalidation**（发现 4）— 这是一个"今天还行、明天就痛"的架构缺口。越早引入 invalidation key/tag 机制，后续 schema 设计越简洁。

### 盲区自评

本次审查 **未覆盖** 的领域：

- **E2E 测试覆盖率和测试质量** — 未检查测试是否真正覆盖了上述发现的异常路径。
- **Flow Designer / Spreadsheet / Report Designer** — 本次聚焦核心 runtime + form 路径，未深入 designer 系列包。已有报告（05-02 review-4）覆盖了部分，但 tree mode + port semantics 的生命周期仍值得追查。
- **SSR / React Server Components 兼容性** — 作为 V12 视角延伸，多个 module-level singleton（`builtInValidationRegistry`、`_registrationIdCounter`、module cache）在 SSR 环境下可能跨请求污染。未深入验证。
- **Tailwind v4 + CSS 层叠** — 未检查样式隔离在多实例场景下是否正确。

**建议下次视角**：V5（时序攻击者）聚焦 action dispatch + scope change + validation 的 interleaving；或 V11（组合爆炸）聚焦 projected form + surface stack + cross-form validation 的交互。
