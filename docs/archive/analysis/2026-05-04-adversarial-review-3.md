# 对抗性审查报告 — 2026-05-04 (第三轮: V5 时序攻击者 + V11 组合爆炸)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。

---

## 视角选择

- **V5 时序攻击者** — 已有报告提及竞态概念但未深入 submit+onChange 的精确交错路径。本次聚焦 action dispatch + validation + scope change 的具体时序冲突。
- **V11 组合爆炸测试者** — 已有报告提及 projected form 和 surface stack 但未追踪具体的*组合触发*场景。本次聚焦 cross-form submit + reaction 循环 + parallel validation 的交互。

---

## 发现 1：Submit 与并发 setValue 之间的数据一致性竞态 (HIGH)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-submit-flow.ts:85-91, 246`
- `packages/flux-runtime/src/form/form-runtime.ts:409-444`

**是什么**

Submit 流程中 `isSubmittingInternal` 是简单 boolean，不阻塞 `setValue`。用户可以在 submit 的 `validateForm` await 期间继续输入，触发 `setValue` 修改 form store values。Submit 验证通过后执行 `executeSubmit()`，此时读取的 values 可能包含验证通过后写入的新（未验证的）值。

**具体场景**

1. 用户点击 Submit → `validateForm('submit')` 开始
2. 验证耗时 200ms（含异步规则）
3. 200ms 内用户修改 email 字段 → `setValue('email', 'invalid@')` 执行
4. `validateForm` 返回 ok（验证的是旧值）
5. `executeSubmit()` 读取 store.values → 包含新的 invalid email
6. 服务端收到未验证的数据

**严重度**: HIGH  
**模式性**: 是 — 任何 async validation + 非阻塞 UI 输入的组合都有此风险。

---

## 发现 2：supersedeLowerPriorityWork 与并发 setValue 的 runId 竞争 (HIGH)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-submit-flow.ts:146`
- `packages/flux-runtime/src/form/form-runtime.ts:412-413`

**是什么**

Submit 调用 `supersedeLowerPriorityWork()` 使所有进行中的 field validation 失效。但并发的 `setValue` 会为其路径 bump 新的 runId 并启动异步验证。这个新验证可能在 submit 的 `validateForm` 之后完成，将 errors 写入 store —— 此时 submit 已经判定 "表单合法" 并发送了请求。

**严重度**: HIGH  
**模式性**: 与发现 1 相同的根本问题 — submit 和 field onChange 共享状态但无协调锁。

---

## 发现 3：跨 Reaction 循环依赖绕过 MAX_CASCADE_DEPTH (HIGH)

**在哪里**

- `packages/flux-runtime/src/async-data/reaction-runtime.ts:258-268, 352-362`

**是什么**

`MAX_CASCADE_DEPTH` 仅在单个 reaction 的 `runReaction` 内部计数自触发的级联。如果 Reaction A 监听 `$.x` 并写入 `$.y`，Reaction B 监听 `$.y` 并写入 `$.x`，每次触发都是通过 scope store subscription（独立注册），cascadeDepth 对每个都是 0。

这构成无限异步循环：A→B→A→B→... 每个 microtask 排一次，tab 卡死。

**具体场景**

Schema 中两个 data source 互相依赖（如汇率转换 A→B、B→A），配置 reaction 同步两个字段。用户修改任一字段 → 无限循环。

**严重度**: HIGH  
**模式性**: 是 — 任何双向 reaction 依赖都会触发。缺少全局 reaction cycle detection。

---

## 发现 4：Surface 关闭不中止该 surface 内表单的在途异步验证 (MEDIUM)

**在哪里**

- `packages/flux-runtime/src/surface-runtime.ts:100-107`
- `packages/flux-runtime/src/form/form-runtime-validation.ts:336`

**是什么**

`close(surfaceId)` 调用 `validationOwner.dispose()`，但 dispose 只清除 Map 引用（参见第二轮发现 1），不 abort 在途验证。验证完成后检查 runId + modelGeneration 但不检查 lifecycleState。结果写入已 "逻辑销毁" 的 form store。

**具体场景**

Dialog 表单打开 → 用户触发 submit → 服务端异步验证开始（3s RTT）→ 用户关闭 dialog → 3s 后验证响应回来 → 写入已销毁的 store → 如果父 scope 有 reaction 监听该 store，可能触发意外更新。

**严重度**: MEDIUM  
**模式性**: 是 — 所有有异步验证的 surface 表单。

---

## 发现 5：子表单独立 submit + 父表单 recurse-submit 的竞争 (MEDIUM)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-submit-flow.ts:182-241`
- `packages/flux-runtime/src/form/form-runtime-owner.ts:96-148`

**是什么**

父表单 submit 时通过 `childContracts` 的 `triggerValidation()` 等待子表单验证。但子表单可以独立执行自己的 submit + 关闭 dialog。此时父表单持有的 `triggerValidation` promise 指向一个已 disposed 的子表单。Promise 可能以空结果 resolve，让父表单认为子表单验证通过。

**严重度**: MEDIUM  
**模式性**: 是 — composite form + 独立子 submit 场景。

---

## 发现 6：Debounced action 捕获过时的 prevResult (LOW)

**在哪里**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:194-219`

**是什么**

`runActionWithDebounce` 在 debounce 窗口开始时捕获 `actionCtx`（包含 `prevResult`）。Debounce 结束时执行 action 使用的是旧的 context。如果 action 的 `then` 分支依赖 `prevResult`，会基于过期数据做决策。

**严重度**: LOW  
**模式性**: 部分 by-design（debounce 语义），但 prevResult 过期可能不在 schema 作者预期内。

---

## 发现 7：validateForm 并行验证 + revalidateDependents 的 runId 冲突 (LOW)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-owner.ts:269-274`

**是什么**

`validateForm` 用 `Promise.allSettled` 并行验证所有路径。A 验证完成后调用 `revalidateDependents` bump B 的 runId。B 的并行验证完成时发现 runId 不匹配，结果被丢弃。B 被验证两次（一次并行、一次 dependent），浪费资源并可能导致验证状态短暂闪烁。

**严重度**: LOW  
**模式性**: 是 — 双向依赖字段在 full-form validation 时必现。

---

## 发现 8：Reaction coalescing 丢失中间状态转换 (LOW)

**在哪里**

- `packages/flux-runtime/src/async-data/reaction-runtime.ts:272-289`

**是什么**

Reaction 运行期间新的 scope 变化只追加到 `pendingChangedPaths`。重新执行时看到的是最终状态，中间过渡（如 `loading: true→false→true`）不可见。如果 reaction action 逻辑依赖 "是否经历过某个中间状态"，会丢失信息。

**严重度**: LOW（by-design trade-off，但值得文档化）  
**模式性**: 所有 coalescing reactive system 的固有限制。

---

## 总评

### 最值得关注的方向

1. **Submit 流程需要 value snapshot 或 optimistic lock** — 发现 1 和 2 表明 submit 和 field mutation 之间缺少原子性保证。修复方案：submit 时 snapshot values 并验证 snapshot（而非 live store），或者在 isSubmitting 期间冻结 setValue。

2. **Reaction 系统需要全局循环检测** — 发现 3 是可以冻结浏览器的真实 bug。建议引入 per-tick 全局 reaction 执行计数器或 visited-set 检测。

3. **Surface 生命周期需要与验证 abort 联动** — 发现 4 是第二轮发现 1 的延伸，从 form dispose 扩展到 surface close 路径。

### 盲区自评

- 未检验 `form-runtime-owner.ts` 中 `waitForActiveLifecycle` 的具体实现是否能缓解发现 1/2。
- 未深入 action plugin 的 `beforeAction` hook 是否能被利用来注入循环。
- 未检查 reaction 的 `pendingChangedPaths` 在大规模（1000+ scope keys）下的内存行为。

**建议下次视角**：V2（恶意输入）+ V10（死代码清道夫）。
