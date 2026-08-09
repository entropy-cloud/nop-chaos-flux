# Multi-Audit — component-audit-round2（2026-08-09 11:14）

> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: component-audit-round2

## 路由登记（2026-08-09 处理）

- P1-01 → plan `docs/plans/2026-08-09-1140-2-close-on-submit-contract-closure.md`（Phase 2，Fix）。
- P2-02/03/04 + P3-05 → 同上 plan（Phase 1/3，与 P1 同 closure surface 折叠）。
- P3-06..10 → `docs/backlog/audit-followups-2026-08-09-1114.md`。

## 审核范围与方式

- **对象**: 仓库根 `./` —— 代码、配置、测试、公开契约（导出/API 面），重点为工作区未提交的 in-progress 功能 `closeOnSubmit`（openDialog/openDrawer 提交成功后自动关闭，AMIS `Dialog.closeOnSubmit` 语义）及其跨包契约传播，并交叉核对架构文档契约漂移。
- **基线**: docs freshness `fresh`（project-context 2026-08-09）；round-2 mission 全部 work item `done`；本轮审计增量 = 未提交改动（`git diff`：flux-core/types/{actions,runtime}.ts、flux-runtime/{action-adapter,surface-runtime}.ts、flux-guide×5、2 个新测试文件）。
- **方式**: 4 个并行子 agent 初审（维度 03 API 契约 / 06+22 异步与接线 / 16 文档一致性 / 23 测试有效性），随后主 agent 对全部 P0/P1 与关键 P2 逐条 live 复核（读代码 + 读文档 + 跑测试确认）。
- **执行验证**: `pnpm --filter @nop-chaos/flux-runtime test -- --grep "closeOnSubmit"` = 1411 passed（124 files）；`pnpm --filter @nop-chaos/flux-renderers-form test -- --grep "closeOnSubmit"` = 777 passed（91 files）——与 daily log 记录一致，新功能测试全绿（全绿不等于无契约漂移，见下文）。

## 发现汇总

| #   | 严重程度 | 维度  | 一句话                                                                                                                                   |
| --- | -------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1       | 16/03 | owner 架构文档 surface-lifecycle-callbacks.md 与 closeOnSubmit 契约直接矛盾（3 处无条件断言失效）+ 全文零提及 + Mandatory Updates 未履行 |
| 2   | P2       | 06/23 | closeOnSubmit × hook 失败语义分叉（hook 返回 `{ok:false}` 仍关闭 vs 抛错不关闭）未文档化且零测试                                         |
| 3   | P2       | 23    | "hook 先跑后关闭"顺序契约被测试注释声称但断言无法检测反转                                                                                |
| 4   | P2       | 23    | 渲染器失败路径测试用固定 50ms 延时断言"保持打开"，存在系统性假绿窗口                                                                     |
| 5   | P3       | 22    | form.tsx `triggerSurfaceSubmitHook` 的 try/catch 死代码 + triggerHook `{ok:false}` 结果被静默丢弃                                        |
| 6   | P3       | 03    | `BUILT_IN_ACTION_DEFINITIONS.openDialog/openDrawer.fieldRules` 遗漏 closeOnSubmit（编译期 valueType 诊断缺失）                           |
| 7   | P3       | 03    | action-adapter `as Record<string, unknown>` 恒等冗余转换 ×2                                                                              |
| 8   | P3       | 03    | schema 入口 `=== true` vs 消费点 truthy 判断的双入口归一化不一致                                                                         |
| 9   | P3       | 23    | 新 unit 测试 `notifySpy` 未 restore（偏离同包惯例）                                                                                      |
| 10  | P3       | 16    | quick-reference.md action 表未反映 closeOnSubmit（建议级）                                                                               |

---

## P1 发现

### [P1-01] owner 架构文档 surface-lifecycle-callbacks.md 与 closeOnSubmit 实现契约直接矛盾 + 零提及 + AGENTS.md Mandatory Updates 违约

- **文件**: `docs/architecture/surface-lifecycle-callbacks.md:287, 313, 320-324, 356`（全文零 `closeOnSubmit` 命中）；实现 `packages/flux-runtime/src/surface-runtime.ts:259-286`
- **证据片段**:
  ```md
  :287 submit hooks 不自动关闭 surface。如果业务想在成功后关闭，应在 hook 里显式写 { action: 'closeSurface' }。
  :313 submitForm.then chain (closeSurface 等 UI 后置操作)
  :320 **`closeSurface` 的职责分离**：`closeSurface` 不应放在 `onSubmitSuccess` 中，而应放在 `submitForm` 的 `then` 链中：
  :356 注意：`onClose` 不会在 submit 成功后**自动**触发——`closeSurface` 在 `submitForm.then` 中触发，之后才进入 close hook。
  ```
  ```ts
  // surface-runtime.ts:272-280（triggerHook：submit:success 后自动 close，含无 nodes 的 skipped 路径 :265-269）
  const result = await dispatchInOwner(entry, nodes, payload);
  if (hookName === 'submit:success' && entry.closeOnSubmit) {
    this.close(entry.id);
  }
  // close() 在 :207-222 对配了 onCloseNodes 的 action-style entry fire onCloseNodes
  ```
- **严重程度**: P1
- **现状**: 该文档是 surface lifecycle hook 机制的 owner 契约文档，且 `flux-guide/design-patterns/page-dialog-drawer.md:226` 显式把读者路由到它。但：① :287 无条件断言"submit hooks 不自动关闭 surface"——`closeOnSubmit: true` 时（已被 nop-entropy 生成器默认输出为主路径）为假；② :313/:320-324 仍把 `submitForm.then: closeSurface` 推荐为唯一规范关闭写法，而本功能（及 flux-guide §6.2）明确该写法对 Enter 提交不生效、已被 `closeOnSubmit` 取代——两份当前有效文档给出方向相反的推荐；③ :356 断言"onClose 不会在 submit 成功后自动触发"——closeOnSubmit 自动关闭路径会触发 onClose hook（fire-and-forget），该断言在受支持主路径下不成立；④ 字段表/schema 块（:44-58）缺 closeOnSubmit 行。daily log 2026-08-09 的 Doc-sync 清单只覆盖 flux-guide 5 个文件，未更新任何 docs/architecture/ 文档，违反 AGENTS.md "Mandatory Updates"（设计变更必须更新相关架构文档）。
- **风险**: 作者按 guide 路由读到 owner 文档会得到与代码相反、与 guide §6.2 矛盾的结论——按文档在 hook 里手写 closeSurface 或依赖 `submitForm.then`，会重现"Enter 提交成功但 dialog 不关闭"的原始缺陷；事实性断言（:287/:356）会误导后续维护与契约演进。
- **建议**: 重写 §Triggering Order 为双路径模型（推荐路径 `closeOnSubmit: true`：close 发生在 surface submit hooks 之后；显式编排路径 `submitForm.then: closeSurface`：仅按钮点击生效、Enter 失效）；修订 :287 为"默认不自动关闭；`closeOnSubmit: true` 时 submit:success 自动关闭（先跑 onSubmitSuccess 再关闭，submit:error 与 hook 抛错不关闭）"；修订 :356 说明 onClose 是否触发取决于关闭路径；字段表补 closeOnSubmit 行；daily log 补记架构文档同步条目。
- **误报排除**: 非"草稿/过渡文档"——该文档是当前基线的 owner 契约文档且被 guide 显式引用；非风格问题——文档陈述与 live 代码在受支持主路径下直接矛盾（行为不一致 + 推荐方向相反）。
- **复核状态**: 主 agent live 复核通过（读文档 :262-379 全节 + 对照 surface-runtime.ts:259-286 与 close() 实现 :193-222；3 个子 agent 独立命中同源结论：16-01/16-02/16-03/16-04/16-05、03-03）。

## P2 发现

### [P2-02] closeOnSubmit × hook 失败语义分叉未文档化且零测试：hook 返回 `{ok:false}` 仍关闭；hook 抛错不关闭

- **文件**: `packages/flux-runtime/src/surface-runtime.ts:272-285`；`packages/flux-renderers-form/src/renderers/form.tsx:214-226`（返回值被丢弃）
- **证据片段**:
  ```ts
  try {
    const result = await dispatchInOwner(entry, nodes, payload);
    if (hookName === 'submit:success' && entry.closeOnSubmit) {
      this.close(entry.id);          // ← 分支 B：hook resolve（含 {ok:false}）→ 关闭
    }
    return result;
  } catch (err) {
    console.warn(`[surface] ${hookName} hook failed:`, err);
    return { ok: false, ... };        // ← 分支 C：hook 抛错 → 不关闭
  }
  ```
- **严重程度**: P2
- **现状**: `dispatchInOwner` 对 hook action 失败（如 `refreshNearest` 的 `notFound: 'error'` 模式）返回 `{ok:false}` 而不抛错 → surface **照常关闭**；只有抛错（owner runtime 已 teardown 等异常路径）才进 catch → **不关闭**。"hook 未成功完成"的两种失败表征产生相反的关闭结果。该分叉未在任何文档表达：flux-guide §6.2 只声明"提交失败（submit:error）不关闭"，surface-lifecycle-callbacks.md §Hook Error Semantics 只覆盖 hook 抛错与 submit 成功状态的关系，均未覆盖 closeOnSubmit × hook 失败的交互。
- **风险**: 作者无法表达"hook 必须成功否则保留 dialog"；两条失败路径行为相反且不可预测；用户场景上 dialog 在刷新失败后仍关闭、无法重试。行为本身可辩护（AMIS closeOnSubmit 语义只绑定 form 提交成功），但**未文档化 + 零测试**使该决策边界无契约锚点，未来任何一方被"修正"均无拦截。
- **建议**: 二选一并收口：(a) 与 AMIS 对齐（推荐）——close 只绑定 submit 成功，catch 分支也关闭，删除分叉；(b) 保留"hook 失败不关闭"——则 `{ok:false}` 时应跳过 close 且 form.tsx 消费结果做 warn/notify。无论哪种，都需在 surface-lifecycle-callbacks.md 增加该交互的契约节，并补 unit 测试（hook 抛错 → 保持打开；hook `{ok:false}` → 关闭）。
- **误报排除**: 不是"hook 抛错不阻塞 submit 流程"既有文档化规则（那条不涉及关闭决策）；分叉是本功能新增的关闭决策行为，行为影响可观察、无文档、无测试。
- **复核状态**: 主 agent live 复核通过（读 action-execution 失败不抛错语义 + surface-runtime 三分支 + 测试文件确认 10 个用例全部走 showToast 恒 ok 路径）。子 agent 独立命中：06-01、23-03、23-04、16-06。

### [P2-03] "hook 先跑后关闭"顺序契约被测试注释声称，但断言无法检测顺序反转

- **文件**: `packages/flux-runtime/src/__tests__/surface-close-on-submit.test.ts:53-56`
- **证据片段**:
  ```ts
  // onSubmitSuccess hook ran before close.
  expect(notifySpy).toHaveBeenCalledWith('success', 'ok');
  // Surface auto-closed.
  expect(surfaceRuntime.store.getState().entries).toHaveLength(0);
  ```
- **严重程度**: P2
- **现状**: 两条断言均为事后（post-hoc）断言。若实现被改为"先 close 再 dispatch"：close() 用关闭前快照 fire onCloseNodes，notify 仍被调用、entries 仍归零——两条断言全部照常通过。而"先刷新后关闭"是 daily log 与 flux-guide §6.2 显式文档化的执行顺序契约，且顺序有实质影响（close → disposeOwnedScope 销毁 surface scope；hook 若读 surface scope 值，反转后读到已 dispose 的 scope）。
- **风险**: 顺序契约当前零测试约束（surface-lifecycle-hooks.phase3 亦不验证与 close 的相对顺序）；重构把 close 提前后测试全绿、行为悄然变化。
- **建议**: 对 `surfaceRuntime.store.remove` 做 spy，断言 `notifySpy.mock.invocationCallOrder[0] < removeSpy.mock.invocationCallOrder[0]`；或让 onSubmitSuccess 节点在 dispatch 时写入 owner scope 并断言"hook 执行瞬间 entries 仍为 1"。
- **误报排除**: 注释明确声称了测试实际未约束的顺序（声明与断言不符），非合理省略。
- **复核状态**: 主 agent live 复核通过（读测试文件 :47-56 与 close()/disposeOwnedScope 实现）。子 agent 独立命中：23-01、23-09。

### [P2-04] 渲染器失败路径测试用固定 50ms 延时断言"保持打开"，存在系统性假绿窗口

- **文件**: `packages/flux-renderers-form/src/__tests__/dialog-close-on-submit.test.tsx:202-205`
- **证据片段**:
  ```ts
  await waitFor(() => expect(env.fetcher).toHaveBeenCalled(), { timeout: 5000 });
  // 提交失败不触发 submit:success → 不关闭
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(screen.getByText('OK')).toBeTruthy();
  ```
- **严重程度**: P2
- **现状**: 唯一同步点是 `fetcher` 被调用（甚至不等 promise resolve）；随后盲等 50ms 断言"OK 仍在"。该断言只能检测"50ms 内关闭"的缺陷，无法区分"永不关闭"与"60ms/200ms 后才关闭"（如失败路径新增异步步骤或 CI 繁忙导致失败链未走完——都会以错误理由通过）。该用例是 renderer 级唯一的失败路径负面证明。
- **风险**: 回归引入"失败后延迟关闭"时测试假绿；CI 环境繁忙时同样可能假绿；与同文件其他用例（最终断言均用 `waitFor`）风格不一致。
- **建议**: 先同步到失败链的**终态信号**再断言打开——最可靠是断言错误副作用已发生（`env.notify` 已收到 error toast，或 form `submitting` 已回到 false），随后再断言 OK 仍在；若无可见错误 UI，至少改用有界 `waitFor` 窗口（如 500ms 内反复断言 OK 存在）并注明理由。
- **误报排除**: 断言方向正确（"提交失败保持打开"），但实现把"未关闭"与"尚未处理完/稍后关闭"混为一谈，属于 bug note 71 所述"断言的是否是正确值"的弱值变体，非合理断言。
- **复核状态**: 主 agent live 复核通过（读测试文件 :192-206）。子 agent 独立命中：23-02。

## P3 发现

### [P3-05] form.tsx `triggerSurfaceSubmitHook` try/catch 死代码 + triggerHook `{ok:false}` 结果被静默丢弃

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:177-186`
- **证据片段**:
  ```ts
  try {
    await currentSurfaceRuntime.triggerHook(entry, hookName, { result, formData: {...}, hookName });
  } catch (err) {
    console.warn(`[form] surface ${hookName} hook failed:`, err);
  }
  ```
- **严重程度**: P3（类别：接线/可诊断性；既有模式，非本次改动引入）
- **现状**: triggerHook（surface-runtime.ts:282-285）内部 try/catch 后永远返回 `{ok:false,error}` 而不抛错 → form.tsx 的 catch 实际不可达；`{ok:false}` 结果被丢弃，最常见的 hook 失败形态（action 失败返回 ok:false）在 form 侧无任何诊断输出。
- **风险**: 排查"dialog 提交后关闭但数据没刷新"类问题时日志无痕；surface-hooks.ts:21-23 注释"Errors propagate; callers should wrap in try/catch"与实现矛盾。
- **建议**: 消费 triggerHook 返回值，`!result.ok` 时 `console.warn('[form] surface submit hook failed', result.error)`；删除死 catch。
- **复核状态**: 主 agent live 复核通过（surface-runtime triggerHook 无 rethrow 路径）。子 agent 独立命中：22-01。

### [P3-06] `BUILT_IN_ACTION_DEFINITIONS.openDialog/openDrawer.fieldRules` 遗漏 closeOnSubmit

- **文件**: `packages/flux-core/src/constants.ts:124-145`
- **证据片段**:
  ```ts
  openDialog: {
    fieldRules: {
      body: 'schema', actions: 'schema-array', data: 'value', isolate: 'value',
      onClose: 'action', onSubmitSuccess: 'action', onSubmitError: 'action',
      // ← closeOnSubmit 缺失（data/isolate/onClose 等同表字段均已声明）
    },
  },
  ```
- **严重程度**: P3（类别：编译期契约表不完整）
- **现状**: `matchesSchemaDefinitionShape`（value-shape-runtime.ts:57-85）只校验已声明字段、不拒绝未知 key——`closeOnSubmit: "true"` / `closeOnSubmit: 1` 静默通过编译，运行期被 adapter `=== true` 归一化为 no-op，作者写错类型时无任何提示；与同表 `data`/`isolate`（值字段）及 object-form `{kind:'value', valueType:'boolean'}` 能力（ajax.url 先例）不一致。
- **风险**: 误配类型静默失效（"配了 closeOnSubmit 但 dialog 不关"且无诊断）；constants.test.ts 将该表钉为公开契约面。
- **建议**: fieldRules 补 `closeOnSubmit: { kind: 'value', valueType: 'boolean' }`（openDialog/openDrawer 各一处），constants.test.ts 补断言。
- **复核状态**: 主 agent live 复核通过（读 constants.ts + value-shape-runtime.ts 未知 key 不拒绝语义）。

### [P3-07] action-adapter 中 `as Record<string, unknown>` 恒等冗余转换 ×2

- **文件**: `packages/flux-runtime/src/action-adapter.ts:249, 314`
- **证据片段**:
  ```ts
  closeOnSubmit: (invocation.args as Record<string, unknown> | undefined)?.closeOnSubmit === true,
  // BuiltInActionInvocation.args 已是 Record<string, unknown> | undefined（actions.ts:485-491）
  ```
- **严重程度**: P3
- **现状**: `invocation.args?.closeOnSubmit === true` 可直接编译（`unknown === true` 合法），转换不提供类型收窄。
- **建议**: 去掉 cast（可与 :234/:298 的 `isolate` 同型转换一并清理）。
- **复核状态**: 主 agent live 复核通过（读 actions.ts:485-491 + adapter 用法）。

### [P3-08] schema 入口 `=== true` 与消费点 truthy 判断的归一化不一致（双入口）

- **文件**: `packages/flux-runtime/src/action-adapter.ts:249/314` vs `packages/flux-runtime/src/surface-runtime.ts:266/278`
- **证据片段**:
  ```ts
  // adapter（schema 入口）：仅字面 true 生效
  closeOnSubmit: ...?.closeOnSubmit === true,
  // triggerHook（消费点）：truthy 判断
  if (hookName === 'submit:success' && entry.closeOnSubmit) { this.close(entry.id); }
  ```
- **严重程度**: P3
- **现状**: 经 adapter 打开的 entry 恒为 boolean，truthy 与 `=== true` 等价，当前行为一致；但 `surfaceRuntime.open()` 是公开 runtime API，直连调用传非布尔 truthy（`1`/`'true'`）时两入口行为分叉。
- **风险**: 低——类型已承诺 boolean，仅未受类型约束的直连调用可达；属同一契约在传播面上未对齐的种子。
- **建议**: 消费点改 `entry.closeOnSubmit === true`，或在 `SurfaceRuntime.open` options JSDoc 声明"仅 `true` 生效"。
- **复核状态**: 主 agent live 复核通过（对照两处判断）。

### [P3-09] 新 unit 测试 notifySpy 未 restore（偏离同包惯例）

- **文件**: `packages/flux-runtime/src/__tests__/surface-close-on-submit.test.ts:29`
- **证据片段**:
  ```ts
  const notifySpy = vi.spyOn(env, 'notify');
  // 无 mockRestore/restoreAllMocks；同包 blob-download.test.ts:57、source-registry.test.ts:10、surface-lifecycle-hooks.phase3.test.ts:111 均显式恢复
  ```
- **严重程度**: P3（测试卫生；当前 call-through + vitest 文件隔离下无实际后果）
- **建议**: 测试 1 末尾补 `notifySpy.mockRestore()` 或文件级 `afterEach(() => vi.restoreAllMocks())`。
- **复核状态**: 主 agent live 复核通过（读测试文件）。

### [P3-10] quick-reference.md action 表未反映 closeOnSubmit（建议级）

- **文件**: `docs/references/quick-reference.md:647-648`
- **证据片段**:
  ```
  | `openDialog` | `OpenDialogActionSchema` | title, body |
  | `openDrawer` | `OpenDrawerActionSchema` | title, body |
  ```
- **严重程度**: P3
- **现状**: quick-reference（AGENTS.md 定义的高频查询首选入口）action 表 openDialog/openDrawer 的 Key args 只有 title/body。该表粒度历来只列 1-2 个 Key args（onClose/onSubmitSuccess 也未列），严格说不构成违约；但 closeOnSubmit 是当前推荐主路径（取代 `submitForm.then: closeSurface`）的核心开关。
- **建议**: 补 `closeOnSubmit?`（附注"提交成功后自动关闭"）或在该表附近加一句指引。
- **复核状态**: 主 agent live 复核通过（读 quick-reference 表）。

## 已核实为安全/合理的排除项（复核排除）

- **closeOnSubmit 幂等叠加**：`store.remove` 对不存在 id 返回 undefined → close() 早退（surface-store.ts:48-56 + surface-runtime.ts:193-195），`closeSurface` 在已关闭 surface 上是 no-op——docs "幂等关闭"声称属实（仅缺测试钉住，见 P2-02 邻接建议）。
- **三条提交路径接线**（Enter / 表单内按钮 / dialog footer submit 按钮）全部汇合到 `triggerHook('submit:success')`；多 form 并存时第一个关闭后第二个的 triggerHook 因 entry 不存在而安全返回。
- **onCloseNodes fire-and-forget detached 引用**：dispatchInOwner 重建 owner ctx 用 ownerScope/ownerActionCtx.runtime（surface 外存活），抛错被 reportRuntimeHostIssue 兜底——文档化设计。
- **close 中途插入 submit 流程**：close 到 submit finally（store.setSubmitting(false)）之间零 await，当前无崩溃路径（scope.ts disposed 守卫兜底）；但时序依赖三个隐式前提且无回归测试钉住——维持 P3 观察（随 P2-03 顺序断言一并收口更佳）。
- **Enter 测试有效性**：dialog-close-on-submit.test.tsx:147-161 走真实渲染入口，fireEvent.keyDown 未被 input-suggest 吞掉，schema 无其他关闭源——"Enter → form 内置提交 → 自动关闭"闭环成立，非假绿。
- **无同义反复/零断言**：10 个新用例均有具体值断言，核心逻辑（surfaceRuntime/triggerHook/close）未被 mock，mock 面仅 env.notify/env.fetcher（合理外部边界）。

## 审核结论

- **P0**: 零。
- **P1**: 1 条（P1-01，owner 架构文档契约漂移——需修订 surface-lifecycle-callbacks.md 并补日志）。
- **P2**: 3 条（P2-02 语义分叉收口、P2-03 顺序断言、P2-04 失败路径测试加固）。
- **P3**: 5 条（记录在案，随修复批次处理）。
- 无已自动化门禁覆盖的新增机械问题（`pnpm check` 相关门禁不覆盖上述项）。
- 全部 P0/P1 与关键 P2 已由主 agent 独立 live 复核；子 agent 初审结论仅作为线索使用。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
