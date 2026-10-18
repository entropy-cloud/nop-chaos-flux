# FM-3 测试保护力审计报告（plan 644，2026-10-18）

> 口径：`docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`（先契约后测试）+ exploratory 双口径；方法 = 三分片并行（core 链路 / form 家族 / data+basic 家族）+ 执行会话合并；分片原始文件 `_tmp/fm3-gap-shard-{a,b,c}.md`。bounded 采样执行（见 plan 口径执行模型声明）。

## 覆盖与差距汇总

| 分片         | 已检契约面                       | 差距 P1 | P2     | P3     |
| ------------ | -------------------------------- | ------- | ------ | ------ | --------------------------------------------------------------------- |
| A core 链路  | 44（38 已约束附证据）            | 0       | 3      | 3      |
| B form 家族  | 18                               | 1       | 6      | 3      |
| C data+basic | 大量（含 20 行"已检充分"对照表） | 0       | 5      | 4      |
| 合计         | 62+                              | **1**   | **14** | **10** | （closure R1 簿记勘误：分片 C 实列 5 P2 + 4 P3，原记 4/5 系两档互换） |

## P1（Phase 2 探索测试第一优先）

- **B-GAP1 隐藏字段 submit payload 投影零执行覆盖**：owner doc form-validation.md:891-900 明文契约，实现 form-runtime-submit-flow.ts:166-227 存在，但全部测试从不填充 hiddenFields——递归过滤（嵌套/数组路径/clearValueWhenHidden 豁免）零执行；两条现存测试标题钉住已被取代的旧裁决（"no hidden-field projection"）。

## Phase 2 探索性测试选取（≤10，选取理由）

1. B-GAP1（P1，唯一 P1：隐私级 payload 泄漏回归面 + 旧标题误导维护者）
2. C-01 懒加载 in-flight 去重/unmount 守卫（P2，并发治理最弱面）
3. C-03 radio×checkableWhen 正交组合（P2，owner doc 明文但两测试轴无交点）
4. C-04 responsive fixed 主列切分（P2，内部身份不变量）
5. B-GAP2 target→querySubmit 跨层投递接缝（P2，form 端零测试）
6. B-GAP6 componentHandle.validate() V23 fieldErrors 程序化契约（P2，仅 hasMethod 断言）
7. B-GAP7 input-suggest IME Enter 守卫不对称（P2，同缺陷家族邻近活缺陷候选）
8. A-G-C unpaired createScope 泄漏可观测性（P2，defamily 零判别力）
9. B-GAP3 submitOnChange while-submitting 分支语义（P2，静默丢弃未钉）
10. B-GAP5 unmount during in-flight submit 延迟 dispose 守卫（P2，de-facto 行为未钉）

未选取：A-G-A 取消通知契约（与 FM-2 已立案 FM-011/012 同源，不重复探洞）；A-G-B templateNodeId doc-测试方向性分叉（裁决项非补测项，立案归族）；其余 P3 归 FM-6 候选清单。

## Phase 2 探索性测试结果（10 项选取全部有结论）

| #   | 项                                     | 探洞结论                                                                                                                                                                                          | 处置                                                                                                                                                                                                            |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | B-GAP1 隐藏字段投影（P1）              | **证实真契约洞**：排除集非空时 `clearValueWhenHidden` 豁免键被 `processed !== undefined` 过滤器从 payload 静默丢弃（违背 owner doc C10 第 2 点"key remains"）                                     | **P1 修复同批**（computePreservedHiddenPaths 豁免保留集 + excludeHiddenFieldPaths 第三参）；4 测试入库（3 加固 + 1 修复回归）；两条旧标题正名对齐 C10；已知残留边界（数组项整项排除下的豁免后代）披露于测试注释 |
| 2   | C-01 懒加载 in-flight 去重/unmount     | 契约成立（in-flight 去重 per-flight、unmount 安全、scope 恰好一次回收）                                                                                                                           | 4 测试加固入库                                                                                                                                                                                                  |
| 3   | C-03 radio×checkableWhen               | 契约成立（不满足行 radio 禁用标记 + 点击不改 selection payload）                                                                                                                                  | 1 测试加固入库（首次失败系测试写错：Base UI radio 走 data-disabled 非 disabled 属性）                                                                                                                           |
| 4   | C-04 responsive fixed 主列切分         | **部分证实契约洞（P2）**：无名 fixed 列退化命名在两个不一致索引空间计算（建名用 fixed 侧子集 index、成员判定用全列 index）——错位时 fixed 列被折叠进 hiddenColumns，移动端"操作列不消失"保证被破坏 | 2 加固入库；洞以 `it.skip` + 立案注记留档（FM-024，待 FM-6 消化）                                                                                                                                               |
| 5   | GAP2 target→querySubmit 接缝           | 契约成立（三种形态：submitAction 投递/submitOnChange 去抖直投/无 querySubmit 静默 no-op）                                                                                                         | 3 测试加固入库                                                                                                                                                                                                  |
| 6   | GAP6 componentHandle.validate V23      | 契约成立（fieldErrors 按 path 键控 map、errors 聚合同引用、submitAttempted 副作用、修复后清空）                                                                                                   | 2 测试加固入库                                                                                                                                                                                                  |
| 7   | GAP7 input-suggest IME Enter           | **证实真缺陷（P2）**：候选高亮 + isComposing Enter（keyCode 229）会提交高亮候选——真实 CJK 输入法确认候选的 keydown 静默覆盖组合文本（form.tsx 修复同族不对称）                                    | `it.skip` 立案留档（FM-023）；修复归 form.tsx IME 同族（并发会话领地）；plain-Enter 正向对照保留为活跃加固                                                                                                      |
| 8   | A-G-C unpaired scope 泄漏              | 未探（选取理由：可观测断言需 runtime 内部 ownedScopeDisposers 暴露，补测形态为契约增强非最小复现——降级为 FM-6 候选清单项）                                                                        | 归补测清单                                                                                                                                                                                                      |
| 9   | B-GAP3 submitOnChange while-submitting | 未探（与第 10 项同属 submit 生命周期族，10 项预算让位给更高价值面）                                                                                                                               | 归补测清单                                                                                                                                                                                                      |
| 10  | B-GAP5 unmount during in-flight submit | 未探（同上）                                                                                                                                                                                      | 归补测清单                                                                                                                                                                                                      |

## Phase 3 探索性 e2e 探针结果（6/6 绿保留，零缺陷立案）

弹层嵌套开合循环（栈 1→2→1→重开→归零）/ 分页×selection 视图剪除语义 / 树懒加载失败重试+折叠再展开缓存恢复 / quick-edit 取消零派发（对照组证明探针有效）/ 列设置会话内状态循环 / 分页 clamp+pageSize 重置——全部绿入库 `tests/e2e/fm3-contract-probes.spec.ts`。两条 watch-only 注记：①分页默认语义（render-time 视图剪除、翻回恢复）与 AMIS 单向清空是文档化分歧非缺陷；②树懒加载"不重复请求"半边受 harness 限制仅间接钉守（建议 fixture 加请求计数探针）。FM-005 外部红处置：探针自装 console 分桶过滤（schema 诊断入独立桶记外部归属 + 硬断言零 pageerror/零非 schema error/交互期零新增）。

---

## Shard A — core 链路

# FM-3 contract-coverage gap — shard A (core pipeline)

- Auditor: FM-3 fresh session, shard A (compile → runtime → render → action)
- Date: 2026-10-18
- Scope: `packages/flux-core`, `flux-compiler`, `flux-runtime`, `flux-action-core`, `flux-react` (src + `__tests__`)
- Method: `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`（先契约后测试；branch hit ≠ 逻辑被约束）
- Exclusions: xlang 域（`flux-xlang-*`、`flux-i18n` 注入面）；并发在途文件（form IME 等）；renderer 包内部（shard B）。已知高覆盖先例（plan 643：compile-cache runtime-identity 判别、validateRegisteredChildren 收口判别、`owner-registration-contracts.test.ts` 契约族、contract-honesty 自检网；plan 628：失败态类型伪造等）按任务书要求不重复立案，仅引用为已约束证据。

## Contracts examined

按 7 个契约族列出已检契约面。标注【已约束】的条目有判别性测试在失败时会拦住（作为证据保留，防凑数也防遗漏）；未标注的进入 Gaps。

### 1. 编译确定性（compile determinism / compile-once）

- 【已约束】同 schema 重复编译输出一致（H35/H36）：`packages/flux-compiler/src/schema-compiler-contract-exploration-part2.test.ts:51,63`
- 【已约束】重复编译确定性且不突变先前 cid state（含 duplicate-schema-id 上报）：`packages/flux-compiler/src/schema-compiler-registry-compilation.test.ts:482-511`
- 【已约束】代表性 fixture 全量编译确定性：`packages/flux-compiler/src/compiled-snapshot-size.test.ts:91`
- 【已约束】动态求值 identity reuse（array/object arm 引用复用 + shallowEqual 路径，CX-1）：`packages/flux-compiler/src/schema-compiler/runtime-value-compilation.test.ts:64-167` — 对应 renderer-runtime.md "Static fast path and identity reuse are mandatory"
- 【已约束】编译期内嵌组件 + 二级 WeakMap runtime 身份键判别：plan 643 `packages/flux-react/src/__tests__/compile-cache-runtime-identity.test.ts`（先例引用）
- templateNodeId 唯一性承诺 → 见 Gap G-B（doc 与 pinned test 方向相反）

### 2. Scope 父子切换 / 词法遮蔽

- 【已约束】merge 变更路径上报（精确 keys、无变化不发通知、revision 递增、同引用不触发）：`packages/flux-runtime/src/__tests__/scope-merge.test.ts:22-179`
- 【已约束】composite 子 scope 转发父变更且保留原 `sourceScopeId`（flux-core.md "composite child scopes preserve the original sourceScopeId"）：`scope-merge.test.ts:148-163`
- 【已约束】dialog/drawer isolate 继承语义（正/负两向 + 打开后父变更不渗透）：`packages/flux-runtime/src/__tests__/runtime-dialogs-scope.isolate.test.ts:8-148`
- 【已约束】React selector 窄订阅 / own-scope 与父 churn 隔离 / 兄弟节点刷新：`packages/flux-react/src/__tests__/scope-and-reactivity.test.tsx:160,201,240,293`
- 【已约束】自定义 store 适配器下子 scope 收听父链写入（composite 链）：`packages/flux-runtime/src/__tests__/scope-composite-chain.test.ts`
- 子写不向上传播的通知不对称 → 见 G-F（P3，仅数据隔离被断言、通知方向未断言）
- 危险键防御（`__proto__`/`constructor`/`prototype` 读写路径）：【已约束】`packages/flux-runtime/src/__tests__/scope-dangerous-keys.test.ts`、`flux-core/src/utils/path(.contract).test.ts`、`flux-formula/src/evaluator.test.ts`

### 3. 依赖追踪失效边界

- 【已约束】失效谓词全家族（根匹配、深后代、祖先写、深兄弟不误伤、通配、未知依赖保守失效、自根过滤、显式根归一化）：`packages/flux-runtime/src/__tests__/scope-change.test.ts:8-102` 对照 `scope-change.ts:160-220`
- 【已约束】显式 dependsOn 优先于运行时收集（formula / api / reaction 三入口，正负双向）：`packages/flux-runtime/src/source-reaction-dependencies.test.ts:26-206`
- 【已约束】无显式声明时运行时收集依赖的自动失效（无关路径不刷新 + 相关路径自动刷新）：`packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts:47-90`（含 api 请求依赖变体）
- 【已约束】结构字段强制通配依赖 baseline（plan 2026-09-28-6 P13）：`structural-wildcard-dependencies-baseline.test.ts`
- 空/未知依赖集合 conflated（doc 已注册 Gap 1）→ 见 G-E（P3）
- 级联深度守卫（reaction 200 / source 100 边界）：【已约束】`cx3-scope-cascade-characterization.test.ts:87-129`
- UnpopulatedScopeAccessError 跨包判别（plan 582 CX-4）：【已约束】`api-stop-when-unpublished-scope.test.ts`、`formula-data-source-unpublished-scope.test.ts`、`runtime-node-props-unpublished-scope.test.ts`、`runtime-sources-unpublished-scope-recovery.test.ts`

### 4. Action 错误分类

- 【已约束】`classifyActionResult` 全组合（cancelled 支配、skipped 先于 ok、timedOut 归 cancelled）：`packages/flux-action-core/src/__tests__/action-core-result.test.ts:13-62` + `contract-retry-and-classification.test.ts:83-99`
- 【已约束】`isFailureClass` / `createCancelledResult` / `createTimedOutResult` / `normalizeActionResult`（含非 Error 包装）：`action-core-result.test.ts:65-162`
- 【已约束】cancelled 走 failure-class 语义（onError 触发、onSettled 触发、默认断链、`continueOnError` 才继续）：`cancelled-class-and-error-guard.test.ts:11-165`
- 【已约束】then/onError/onSettled 链语义 + 失败断链 + continueOnError + 插件改写：`runtime-actions-chained.test.ts:14-498`（552 行）与 `action-dispatcher-control-flow.test.ts`
- 【已约束】嵌套 onError 抑制（caught-failure marker 三形态）：`nested-onerror-suppression.test.ts:22-80`
- 【已约束】prevResult 跨分支传播：`contract-control-flow-branches.test.ts:82`、`action-core-result.test.ts:185`、`runtime-actions-chained.test.ts:192`
- 【已约束】timeout/retry/abort 操作控制（父信号中止重试延迟、预中止、AbortSignal.reason 保留、负 times）：`operation-control-timeout-retry.test.ts`、`contract-control-flow-timeout-cancel.test.ts:73-130`、`contract-retry-and-classification.test.ts:101-116`
- 【已约束】请求级取消/去重（timeout 中止、父 abort、ignore-new 不复用已中止 promise）：`request-runtime.executor.test.ts:92-429`
- 【已约束】dispatcher dispose（去抖 promise 结算为 cancelled、在飞信号中止、链式停止）：`action-dispatcher-routing.test.ts:340-430`
- 统一取消词汇的"通知面"负契约 → 见 G-A（P2，本审计最主要发现）

### 5. 表单校验生命周期（touched/errors/submit 门）

- 【已约束】owner 生命周期门（bootstrapping 延迟验证并等待 active、disposed 返回 blocked 而非 clean-success、applyChangesAndRevalidate 同规则、ready 门）：`owner-validation-lifecycle-contracts.test.ts:75-308`
- 【已约束】submit 门（bootstrapping 期拒绝且不突变 submit/touched 状态、summary-gate 子未 ready 阻断、submit 触发 required 标记 touched、signal 贯穿、abort 取消在飞校验）：`owner-submit-contracts.test.ts:84-173`
- 【已约束】submit 超越低优先级在飞异步 + 阻止 stale 发布 + 被超越 run 记为 cancelled + commit validateSubtree 同域超越：`owner-validation-lifecycle-contracts.test.ts:358-461`
- 【已约束】V16 stale 异步不发布且 "cancelled/stale" 字样不得成为字段错误：`validation-async-cancel-and-full-pipeline.test.ts:87-143`
- 【已约束】V18 失败路由（throw 不落 fieldErrors、经诊断缝、非 Error 归一化、submit 期同样收敛、form-level error 保 cause）：`form-validation-resilience.test.ts:44-166`、`validation-rule-lifecycle.test.ts:190-233`、`form-runtime-owner-lifecycle.test.ts:232`
- 【已约束】V23 fieldErrors / ok 语义、V9 单次聚合通知、V17 执行时快照、V20 init 不出红、V21 一动作清错解锁：`validation-rule-lifecycle.test.ts`、`bug-validate-overwrite.test.ts` 等
- 【已约束】V22 全规则流水线无 required 短路（三入口 × 两值态）：`validation-async-cancel-and-full-pipeline.test.ts:146-191`
- 【已约束】V1/V2 依赖闭包清错（含 touched 展示延迟路径、双向环收敛）：`validation-dependency-closure.test.ts:69-122`
- 【已约束】隐藏字段策略 + 微任务批量清理：`hidden-field-policy.test.ts`、`hidden-field-policy-microtask-batch.test.ts`
- 【已约束】注册收口（out-of-subtree 拒绝不突变、unregister 清幻影错误、V18/M-09 收口）——plan 643 `owner-registration-contracts.test.ts`（先例引用）
- 【已约束】外部错误 overlay 按源隔离与写入清除：`plan-68-69-remaining-behaviors.test.ts:146-280`
- 【已约束】boolean-like 无真值压缩（非布尔表达式结果 → undefined）：`packages/flux-react` 侧渲染链 + `runtime-scope-props.test.ts:185`
- 【已约束】去抖中的异步算 owner 级 pending（validating/readiness）：`owner-validation-lifecycle-contracts.test.ts:335`
- model-generation 失效 → 见 G-D（P3，负判别量不足）

### 6. 异步取消治理

- 【已约束】统一取消词汇（结构化 `cancelled:true` 与 thrown abort 同语义折叠为"无已发布错误"）：`runtime-owned-helpers.test.ts:96-106`（`executeRuntimeValidationRule` 两分支）
- 【已约束】验证侧取消/中止（signal 贯穿 validateForm、submit abort 取消在飞字段校验）：`owner-submit-contracts.test.ts:123-173`、`form-runtime-validation.ts` 路径被真实入口穿透测试
- 【已约束】mergeAbortSignals 复合信号语义（root 已中止、late root abort 不渗透、mid-flight 渗透结算 cancelled）：`merge-abort-signals.test.ts:43-149`
- surface 生命周期 GC / statusPath closed summary：【已约束】`surface-teardown-gc.test.ts`、`surface-status-publish.test.ts`、`runtime-dialogs-scope.drawer-and-dispose.test.ts`
- env 稳定性（wrapper 重建不拆 runtime）：【已约束】`schema-renderer-env-deps.test.tsx`

### 7. Ownership 三模式语义（inherit-owner / create-owner / no-owner）

- 【已约束】编译期边界收口（create-owner 处停止收集、detail-view 边界、非 form create-owner 子 owner 元数据）：`packages/flux-compiler/src/validation-collection.test.ts:214,510,550`
- 【已约束】子契约模式（summary-gate 门 canSubmit、recurse-submit 父 submit 等待子、inactive 契约不参与、hanging 子中止并清 submitting）：`owner-submit-contracts.test.ts:95`、`plan-68-69-remaining-behaviors.test.ts:312-372`、`form-runtime-submit-flow.test.ts:210-358`
- 【已约束】modelGeneration 递增、refresh 后 lifecycle 回 active、rule-identity retention：`plan-68-69-remaining-behaviors.test.ts:378-490`
- 【已约束】host projection 身份经类型守卫而非字符串嗅探：`host-projection-scope.test.ts` + `scope-lifecycle-leak-fix.test.ts:10-44`
- 一次性求值 scope 纪律（09-01/09-02）→ 见 G-C（P2，泄漏族无回归网）

## Gaps

### G-A — P2 · 缺少负面场景：取消结果的用户通知契约完全未钉住（虚假取消 = 错误 toast 无测试能拦）

- 契约出处：`docs/architecture/form-validation.md` "Async Validation Semantics → Current async-governance baseline"（"both thrown aborts and structured `{cancelled: true}` action results are part of the same cancellation semantic and must not diverge"）；`docs/architecture/flux-core.md` "Action Baseline → request cancellation"。取消语义上取消 ≠ 失败呈现，但该文档族从未钉住"取消不得以 error toast 呈现"（或其裁定反面）。
- 现有测试为何守不住：`isFailureClass(cancelled) === true`（`action-core-result.test.ts:70` 明确断言），而 `packages/flux-action-core/src/action-dispatcher/action-execution.ts:175-212` 的 `reportUnhandledFailureClass` 对一切 failure-class 且未被 onError 处理的结果调用 `ctx.getEnv().notify('error', message)`；仅当结果在 `caughtFailureResults`（`action-execution.ts:340`，只收非 abort 分支）或存在诊断通道时豁免。thrown-abort 分支（`action-execution.ts:328-331`）产生的 cancelled 结果**不进** `caughtFailureResults`，`onActionError` 又是 host 可选注入（`runtime-factory.ts:68,616`）。也就是说：无 onError 的取消（如 `dispose()` 中止在飞 ajax）在无诊断通道的 host 下会以 abort reason 触发用户级 error 通知，而现有全部取消测试（`cancelled-class-and-error-guard.test.ts`、`merge-abort-signals.test.ts`、`contract-control-flow-timeout-cancel.test.ts`、`action-dispatcher-routing.test.ts:340-430`、`runtime-actions-monitor.test.ts:168-211`）**没有一处断言 notify 的调用或不调用**（grep 证实这些文件内 notify 断言为零）。一次"surface 关闭弹 aborted toast"级别的回归会全绿通过。
- coverage 为何误导：classification 家族分支覆盖极高（cancelled/timedOut/skipped 组合表都有），但全部断言止步于返回值的 `ok/cancelled` 形状——`reportUnhandledFailureClass` 的通知分支在这些测试里要么被 `syntheticBranchEvent`/`hasDiagnosticChannel` 静默短路，要么根本未被断言，形成"分类正确但呈现语义失控"的盲区。
- 建议补测形态：action-core dispatcher 级 unit（mock env 带 notify spy）：① dispatch 期间 dispose（无 onError、无插件 onError）→ 断言 `env.notify` 未以 'error' 被调用（或按裁定断言调用形态）；② 结构化 `{ok:false, cancelled:true}` 且无 onError → 同上；③ 对照组：普通 failure 仍 notify（已有，防矫枉过正）。若裁定"取消应当 toast"，则反向钉住并同步回写 owner doc。
- 优先级：P1/P2 边界——因涉及用户可见行为且完全无网，评 **P2**（触发前提是无 onError 的取消路径，非每请求必现）。

### G-B — P2 · 契约-测试方向性冲突：templateNodeId "runtime 内全局唯一"承诺被测试反向钉死

- 契约出处：`docs/architecture/renderer-runtime.md:68`："all compilation calls within one `RendererRuntime` share a single counter, giving every `templateNodeId` a globally unique value within that runtime"。
- 现有测试为何守不住（更准确说：守的是反方向）：live 实现是**每个 CompiledTemplate 一份 cid state**（`packages/flux-compiler/src/schema-compiler/target-enrichment.ts:61-72` 从 attached state 取计数；`flux-core/src/compiled-cid.ts`），节点字符串 id 由 `createNodeId`（`flux-core/src/utils/schema.ts:34-40`，schema.id 或路径派生）决定。`packages/flux-compiler/src/schema-compiler-registry-compilation.test.ts:482-501` 断言两次编译的 `templateNodeId` **相等**且两次编译互不突变对方计数器——即逐模板确定性；H90（`schema-compiler-contract-exploration-part3.test.ts:476-487`）断言同 compiler 两次编译 `node.id` 相等。两者共同钉死的是"确定性"，与 owner doc 的"单计数器 runtime 内全局唯一"互斥。若有人按 doc 修复（改为 runtime 级共享计数器），现有测试必红；若 doc 为真，当前代码违约而 suite 全绿。今日唯一消费者是 React key（`packages/flux-react/src/render-nodes.tsx:570`），逐模板确定性大概率才是真契约。
- coverage 为何误导：该区域测试数量多、断言强（相等断言非 toBeDefined），属于"测试很强但钉住了与 contract source 相反的行为"——按 `docs/context/source-of-truth-and-precedence.md` 这恰是 owner doc 与代码/测试的静默分叉，renderer introduction audit（INV 检查）以 doc 为入口时会得出错误结论。
- 建议补测形态：先裁决契约方向（逐模板确定性 vs runtime 级唯一），随后：改 doc 措辞为 live 语义，并补一条判别测试断言"同一 CompiledTemplate 内 templateNodeId 两两不同 + 跨编译确定性 + 不突变既有 cid state"（第三点已有），删除或改写与裁决冲突的断言。
- 优先级：**P2**（doc 是新 renderer 引入审计的契约入口，分叉会持续误导；代码本身当前无消费者受害）。

### G-C — P2 · 跨层缺口：一次性求值 scope 纪律（09-01/09-02）无 runtime 级回归网

- 契约出处：`docs/architecture/renderer-runtime.md` "One-shot evaluation scope discipline (09-01 / 09-02)"（行 265 起）："One-shot query semantics … MUST NOT leave a runtime-owned child scope behind. Every unpaired `helpers.createScope` registers a scope + store + disposer closure into the runtime's `ownedScopeDisposers` … accumulating until the runtime itself is destroyed."
- 现有测试为何守不住：`packages/flux-runtime/src/__tests__/scope-lifecycle-leak-fix.test.ts` 只覆盖**成对** dispose 的行为（dispose 后静默写、composite 订阅释放、scopeKey 重复下 id 唯一）；`surface-teardown-gc.test.ts` 覆盖 runtime 整体销毁 GC。没有任何测试断言：① unpaired `createScope` 在 `ownedScopeDisposers`（`runtime-factory.ts:100`）中的累积是可观测的（characterization），或 ② 某条真实一次性求值路径（event payload dispatch、row/item 表达式）结算后泄漏计数净增为零。该 doc 节存在的理由正是这个泄漏 defect family——"某 renderer 忘配 disposeScope → 长活应用内存/订阅无限累积"——而现在的 suite 对这一族完全无判别力；泄漏只会在长会话 e2e 或生产里以内存曲线形式出现。
- coverage 为何误导：scope 生命周期测试命名里满是 "leak"/"dispose"/"gc"，制造了"泄漏族有网"的观感；实际守住的只是配对纪律的 dispose 半边，未配对（真正的事故形态）无任何断言。doc 里点名的前例（loop/recurse itemData、table checkableWhen、picker autoFill、condition-builder、tree/select 搜索 scope）都在 renderer 包，属 shard B，但 runtime 侧的累积可观测性是 shard A 的地基，当前为零。
- 建议补测形态：flux-runtime integration——createRendererRuntime 后直接调 `createChildScope`/helpers.createScope N 次不 dispose，断言 `ownedScopeDisposers` 数量按 N 累积（钉住现状即把泄漏变成可测量）；再挑一条 doc 点名的一次性路径（如 event payload `evaluationBindings`）断言结算后净增为 0。renderers 侧逐前例的净零断言归 shard B。
- 优先级：**P2**。

### G-D — P3 · 断言过弱：model-generation 失效缺负判别量（stale 错误发布未被判别）

- 契约出处：`docs/architecture/form-validation.md` "Async Validation Semantics" 规则 6："model-generation changes invalidate all older-generation runs, even when the same path string still exists in the new model"。
- 现有测试为何守不住：`packages/flux-runtime/src/__tests__/runtime-validation.test.ts:402-426` 在异步校验在飞时执行 `refreshCompiledModel`，断言 async owner snapshot 清空、pending 以 `{ok:true, errors:[]}` 结算——但随后 `resolveValidation` 被 resolve 成 **valid:true**。一个会把 stale run 的错误照常写入字段状态的错误实现同样通过此测试（"没有错误可发布"与"错误被丢弃"不可区分）。计数器递增（`plan-68-69-remaining-behaviors.test.ts:465`）也只是机制断言而非行为判别。
- 建议补测形态：同场景但把 stale run resolve 成 failing result（`valid:false` + message），断言 refresh 后 `getFieldState(path).errors` 为空、后续新一轮校验（新代）才可发布错误。
- 优先级：**P3**（V16 已钉住同 path 优先级超越的 stale 发布，代际失效与之共享 `validationRuns`/`capturedGeneration` 机制，实际风险窗口小）。

### G-E — P3 · 契约未覆盖（doc 已注册缺口）："依赖为空集合"与"依赖未知"仍 conflated，且语义无测试钉住

- 契约出处：`docs/architecture/dependency-tracking.md` §4.1 Conservative Rule + §2 Gap 1："Unknown And Empty Dependencies Are Conflated… If the runtime later needs an explicit 'depends on nothing' state, that state must be represented distinctly from `undefined`."
- 现有测试为何守不住：`packages/flux-runtime/src/scope-change.ts:160-220` 中 `dependencies` 为真值但 `paths: []` 时谓词返回 `false`（全不命中），与 `undefined → true`（保守失效）语义相反；`scope-change.test.ts:45-52` 只钉了 `undefined` 侧。生产路径经 `createRootDependencySet`（空 → `undefined`，保守）归一，所以今日风险仅在手工构造的依赖集合（如调试工具、未来显式 "depends on nothing" 特性）。该缺口已被 doc 注册为 Gap 1，测试层面则两面都没有钉：空集合的 skip 语义、以及"若引入 distinct 状态不得与 undefined 混同"的前瞻约束。
- 建议补测形态：P3——若 Gap 1 短期不裁：补一条 characterization（手构造 `{paths: [], wildcard: false}` → false + `createRootDependencySet([])` → undefined）把现状钉住防误改；若裁决引入 distinct "depends on nothing"，则该测试升级为判别测试。
- 优先级：**P3**。

### G-F — P3 · 缺少负面场景：子写不向上传播只测了数据面、未测通知面

- 契约出处：`docs/architecture/dependency-tracking.md` §4.5 Cross-Scope Propagation："parent writes propagate downward; child writes do not propagate upward"；`docs/architecture/flux-core.md` ScopeRef invalidation baseline。
- 现有测试为何守不住：`packages/flux-runtime/src/__tests__/scope-merge.test.ts:99-108` 断言 child.merge 后 `parent.readOwn()` 不变（数据隔离），但未挂 parent store 订阅者断言其**未被通知**；向上通知方向的守卫（例如未来 composite store 实现误挂反向订阅）无测试可拦。向下方向（含 sourceScopeId 保留）已被 `scope-merge.test.ts:148-163` 与 `scope-composite-chain.test.ts` 充分约束。
- 建议补测形态：在既有 child-merge 用例上加一个 parent-side `store.subscribe` spy，断言计数为 0。一行级补强。
- 优先级：**P3**（现结构上违反需要主动写错实现，风险低）。

## Summary

- contracts examined: 44（其中【已约束】38 项，含 4 项 plan 643/628 先例引用）
- gaps: 6（P1 0 / P2 3 / P3 3）
- P2：G-A 取消结果的用户通知契约未钉住（虚假安全感最重——分类分支覆盖极高但呈现语义失控无网）；G-B templateNodeId 唯一性 doc 与 pinned test 方向相反（契约源分叉）；G-C 一次性求值 scope 纪律泄漏族无 runtime 级回归网
- P3：G-D model-generation stale 错误发布缺负判别量；G-E 空/未知依赖 conflated 语义未钉（doc 已注册 Gap 1）；G-F 子写向上通知不对称未断言
- 总体评估：core 链路的测试网显著强于典型仓库——7 个契约族中 5 个（编译确定性、scope 父子、依赖失效边界、表单校验生命周期、ownership 三模式）存在真实判别力的家族级测试（V 系列红→绿判别、characterization、正负双向），而非 branch coverage 堆积。剩余风险集中在"分类正确但副作用（通知/泄漏）语义"与"doc-测试方向性分叉"两类，均为高 coverage 下仍会漏出的典型形态。

---

## Shard B — form 家族

# FM-3 contract-coverage gap — shard B (form family)

- Auditor: FM-3 fresh session, shard B
- Date: 2026-10-18
- Scope: `packages/flux-renderers-form/src` (form.tsx, lifecycle hooks, validation-chain consumption), `packages/flux-renderers-form-advanced/src` sample (input-table / array-editor / detail-view interaction surfaces), plus the flux-runtime submit-flow tests that own the submit lifecycle contract.
- Method: contract-first per `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md` — identify stable contract from owner docs + live code, then map tests, distinguishing "code was hit" from "behavior is constrained".

## Contracts examined

| #   | Contract                                                                                                                                                                      | Source                                                                                                                                                                 | Coverage verdict                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Double-submit guard + disposed/bootstrapping/refreshing submit gates                                                                                                          | `docs/architecture/form-validation.md` (Owner Lifecycle rules 5–9), `form-runtime-submit-flow.ts:245-259`                                                              | Covered: `bug-submit-race.test.ts`, `form-runtime-submit-flow.test.ts:92-122`, `owner-submit-contracts.test.ts:84`                                                    |
| C2  | Validation gate before `submitAction`; onValidateError vs onSubmitError routing; `failureHandled`/`settledError` preservation                                                 | `form-runtime-submit-flow.ts:319-332,423-469`                                                                                                                          | Covered well (incl. handler-throws and no-replace cases, `form-runtime-submit-flow.test.ts:124-197,514-584`; UI level `form-submit-actions.semantic.test.tsx:72,129`) |
| C3  | onSubmitSuccess/onSubmitError outcome classification (success/failure/neutral/abort)                                                                                          | `form-runtime-submit.ts:11-21`                                                                                                                                         | Covered (`form-runtime-submit-flow.test.ts:441-512`)                                                                                                                  |
| C4  | Hidden-field submit-payload projection (C10): hidden fields excluded from payload unless `clearValueWhenHidden`                                                               | `docs/architecture/form-validation.md:891-900`; `form-runtime-submit-flow.ts:166-227,427-435`                                                                          | **GAP 1 (P1)** — logic never executed under test; existing test pins the superseded contract                                                                          |
| C5  | Submit touched-marking policy (`buildSubmitTouchedState`, submit marks participating fields touched)                                                                          | `form-runtime-submit.ts:37-66`; doc "Touched And Error Display Policy" rule 4                                                                                          | Covered indirectly via real runtime: `owner-submit-contracts.test.ts:111`                                                                                             |
| C6  | Surface submit hook chain (`submitScope:'surface'` → form hooks → surface triggerHook → closeOnSubmit)                                                                        | `form.tsx:190-335`; `docs/architecture/surface-lifecycle-callbacks.md`                                                                                                 | Covered: `dialog-close-on-submit.test.tsx`, `surface-close-on-submit.test.ts` (full success/failure/hook-throw matrix)                                                |
| C7  | Form shell props: preventEnterSubmit, IME composition guard, Enter interactive-host exclusions, autoFocus, static, scrollToFirstError                                         | `form.tsx:30-47,369-562`                                                                                                                                               | Mostly covered (`form-shell-enhancements.test.tsx`, `form-focus-first-error.test.tsx`); tag-based Enter exclusions **GAP 8 (P3)**                                     |
| C8  | submitOnChange: 300ms debounce, while-submitting suppression, target-only direct delivery                                                                                     | `form.tsx:475-514`                                                                                                                                                     | Debounce covered (`form-shell-enhancements.test.tsx:103-209`); while-submitting branch **GAP 3 (P2)**; target-only delivery folded into GAP 2                         |
| C9  | `target` → component-handle `querySubmit` values delivery (AMIS parity)                                                                                                       | `form.tsx:378-394,441-446,500-503`                                                                                                                                     | **GAP 2 (P2)** — crud side unit-tested in isolation; form→registry→crud cross-layer proof absent                                                                      |
| C10 | Submitting feedback: store `submitting` flag (with `submittingDelay` flicker suppression) → `data-slot="form-busy"` role=status                                               | `form.tsx:363-367,624-636`; `form-runtime-submit-flow.ts:268-280`                                                                                                      | **GAP 4 (P2)** — zero test references to form-busy; delayed-publication path untested                                                                                 |
| C11 | Validation display gate: default `['touched','submit']`, dirty/visited overrides, `validateOn: 'submit'`, field-level validateOn override, blur async feedback                | `field-error-visibility.ts`; doc display-policy baseline                                                                                                               | Covered well: `form-validation-ui.test.tsx` (touched gate, visited-only, dirty override, submit-only policy, change override), `input-validation-drift.test.tsx`      |
| C12 | Error clearing on rule pass incl. dependency-closure peers                                                                                                                    | doc "Error Clearing On Rule Pass"; `form-validation-rules.test.tsx:85-89,157-161,169-173`                                                                              | Covered at UI level for requiredWhen/requiredUnless/equalsField/notEqualsField                                                                                        |
| C13 | Focus-first-error after failed submit: innermost-focusable resolution, collapsed-fieldset reveal, bounded retry, scrollToFirstError                                           | `form.tsx:37-47,396-451`                                                                                                                                               | Covered: `form-focus-first-error.test.tsx` (V12f), `form-shell-enhancements.test.tsx:515-567`                                                                         |
| C14 | Child-owner submit contracts: recurse-submit / summary-gate / detail draft gating                                                                                             | `form-runtime-submit-flow.ts:334-421`; doc "What Counts As A Validation Scope"                                                                                         | Covered runtime-level (`owner-submit-contracts.test.ts`, `form-runtime-submit-flow.test.ts:199-321`) and UI-level (`composite-form-detail-and-loop.test.tsx:79-389`)  |
| C15 | Programmatic component handle: validate/getValues/setValue/reset/submit                                                                                                       | `form-component-handle.ts`; doc V23 rule 5 (`fieldErrors` branching)                                                                                                   | **GAP 6 (P2)** — `validate` only asserted as existing method, never invoked                                                                                           |
| C16 | Unmount/surface-close during in-flight submit: deferred dispose guard, no-abort-on-close de-facto behavior                                                                    | `form.tsx:144-158`; `surface-runtime.ts` (zero abort/signal wiring)                                                                                                    | **GAP 5 (P2)**                                                                                                                                                        |
| C17 | Inline-edit validation interaction (advanced sample): add-vs-validate timing, aggregate array rules, minItems floor, stale child-error clearing after row removal, removeWhen | `input-table-renderer.tsx:150-181,320-345`; `form-array-validation.test.tsx`, `b32-array-submit-and-validate.test.tsx`, `cx11-consumer-contract-pins.test.tsx:176-235` | Broadly covered; input-table cell-level error association **GAP 9 (P3)**                                                                                              |
| C18 | IME guard family: Enter-during-composition must not commit (submit / suggestion select)                                                                                       | `form.tsx:520-525` (in-flight change, paired tests), `ai-sender.tsx:65-66` + dedicated tests                                                                           | Form submit covered; `input-suggest.tsx` **GAP 7 (P2)** — guard absent and untested there                                                                             |

Premise note: `restoreValues` is **not a live contract in the form family** — it exists only in `packages/flux-renderers-industrial/src/binding/point-store.ts` (SCADA point store). No form.tsx prop or form-runtime API by that name; nothing to audit against. The nearest form-family analogs (initial-value seeding `seedInitialValuesFromSurfaceScope` form.tsx:49-78, and handle `reset` — `component-handle-factory.test.ts:94`) are both test-covered (dialog forms via `dialog-form-loadaction-edit.test.tsx` chain; seeding exercised through `drawer` source landed in dba678c9a).

## Gaps

### GAP 1 (P1) — C10 hidden-field submit-payload projection: untested logic + stale test actively pinning the superseded contract

- 契约出处: `docs/architecture/form-validation.md:891-900` (§Hidden Field Value And Submit Payload, C10): hidden fields are excluded from the default submit payload; `clearValueWhenHidden: true` fields keep their key. Live implementation: `packages/flux-runtime/src/form-runtime-submit-flow.ts:166-227` (`computeExcludedHiddenPaths`, `excludeHiddenFieldPaths`) wired at `:427-435`.
- 现有测试为何守不住: `packages/flux-runtime/src/__tests__/form-runtime-submit-flow.test.ts:616-655` — both tests in the "hidden field submit payload" block construct `sharedState` **without** `hiddenFields`, so the exclusion branch degenerates to `new Set()` → no filtering, and the tests assert the unfiltered payload. Their titles/comments assert the superseded adjudication ("includes hidden field values in the submit payload by default (no hidden filtering)", "C10 裁定 B"). Repo-wide, no test ever populates `sharedState.hiddenFields` for a submit (only array-remap/lifecycle bookkeeping tests do). Net: `excludeHiddenFieldPaths`'s recursion (nested objects, array-item paths `path.index`, `undefined`-dropping) and the `clearValueWhenHidden` exemption have zero executing coverage, and the file's stated contract contradicts the owner doc + live code.
- 为什么 coverage 误导: the block is green under BOTH the old (no projection) and new (projection) implementations; a regression that leaks hidden fields into payloads (privacy/data bug) or over-strips `clearValueWhenHidden` fields would pass. The stale titles will also misdirect the next maintainer/auditor.
- 建议补测形态 (unit, same file): (a) `executeFormSubmit` with `hiddenFields: new Set(['secret','rows.1.hidden'])`, values containing both → assert payload excludes them and keeps siblings; (b) field with `hiddenFieldPolicy.clearValueWhenHidden: true` in the compiled model → assert key NOT excluded; (c) rewrite the two stale titles/comments to the C10 doc contract. Add one UI integration (form with `when`-hidden field → submit → captured fetcher payload lacks the key) in `flux-renderers-form/__tests__` for the cross-layer path.

### GAP 2 (P2) — `target` → `querySubmit` delivery: cross-layer contract has only half a proof

- 契约出处: `form.tsx:378-394` (`deliverToSubmitTarget`: resolve component handle, `hasMethod('querySubmit')`, invoke with values), post-success delivery `:441-446`, target-only submitOnChange direct delivery `:500-503` ("aside filter → crud" AMIS parity).
- 现有测试为何守不住: crud side is unit-tested in isolation (`packages/flux-renderers-data/src/__tests__/crud-renderer-state.unit.test.tsx:416` asserts its own capability forwards the payload), but no test anywhere renders a **form with `target`** (grep over form tests: zero). The form-side gate (`hasMethod` false → silent no-op), the values snapshot identity, and the two distinct delivery timings (after successful explicit submit vs debounced change for target-only forms) are unconstrained. Classic 同层假闭环: both ends tested separately, the seam not at all.
- 建议补测形态 (integration, `flux-renderers-form/__tests__`): register a stub component definition exposing a `querySubmit` capability probe; (a) form with `target` + submitAction → submit → assert invoke payload equals form values; (b) form with `target`, no submitAction, `submitOnChange: true` → change → assert direct delivery without submit; (c) `target` naming a handle without `querySubmit` → assert no-op no-throw.

### GAP 3 (P2) — submitOnChange while-submitting branch: interim edits are silently dropped, semantics unpinned

- 契约出处: `form.tsx:483-505` — during `state.submitting`, the subscription records `lastValues` but returns before scheduling; an edit made while a submit is in flight is never submitted afterwards (no re-arm when submitting clears).
- 现有测试为何守不住: `form-shell-enhancements.test.tsx:103-209` covers debounce timing and the no-submitAction guard; nothing drives the `if (state.submitting) return;` branch (`form.tsx:489-491`). If the guard is removed, double-submit could reappear (the runtime guard would cancel the second, but with a cancelled-result side channel); if the drop becomes a re-arm, behavior changes silently. Either way today's suite stays green.
- 建议补测形态 (unit/integration with fake timers + pending fetcher): start a slow submit, change the input mid-flight, settle → assert `submitCalls` stays at 1 (characterize the drop). If product wants re-arm-after-settle, change the assertion to 2 and implement it — but the current contract must be pinned either way.

### GAP 4 (P2) — submitting feedback + `submittingDelay` delayed publication untested

- 契约出处: `form.tsx:363-367,624-636` — `submitting` flag surfaced as `data-slot="form-busy"` with `role="status"` and distinct submitting vs loading text; `form-runtime-submit-flow.ts:268-280` — `submitAttempted` publishes immediately while `submitting` is delayed by `submittingDelay` (flicker suppression), timer cleared in `finally`.
- 现有测试为何守不住: repo grep finds **zero** references to `form-busy` in any test; every `executeFormSubmit` test uses `submittingDelay: 0` and only asserts `setSubmitting` last-called-with-false. The delay>0 branch (timer set → conditional publish → finally-clear, including "validation fails before delay elapses → `submitting` never published") never executes under test. The user-visible "submit-in-progress feedback" contract (and the "提交中" gating story, which today rests solely on the runtime double-submit guard, since no button-disable contract exists) is unconstrained.
- 建议补测形态: unit with fake timers — `submittingDelay: 300`: assert no `setSubmitting(true)` before 300ms, publish after; fail validation at t<300 → `submitting` never true, `submitAttempted` true. One UI integration: pending submitAction → `form-busy` appears with role=status → clears on settle.

### GAP 5 (P2) — unmount / surface-close during in-flight submit: deferred-dispose guard untested, no-abort-on-close behavior unpinned

- 契约出处: `form.tsx:144-158` — cleanup defers `dispose()` via `queueMicrotask` and only disposes when the form was not synchronously remounted (StrictMode/re-render protection); `packages/flux-runtime/src/surface-runtime.ts` has no abort/signal wiring, so de-facto contract is "closing a surface does not abort an in-flight submit; the submit settles against the disposed-but-alive store".
- 现有测试为何守不住: no test in `packages/flux-renderers-form/src/__tests__` combines unmount with an in-flight submit (grep). Lifecycle tests cover initAction cancellation (`form-renderer-lifecycle-init.test.tsx:111`) but not submit; `surface-close-on-submit.test.ts` only closes after settled hooks. If someone "simplifies" the queueMicrotask guard back to a direct `dispose()`, StrictMode remounts would dispose the live form — today's suite would not notice.
- 建议补测形态 (integration): dialog form with pending submitAction → close surface mid-submit → settle: assert no throw, exactly one fetch, store `submitting` cleared, no setState-after-dispose noise. Add a rerender-remount case for the dispose guard.

### GAP 6 (P2) — `componentHandle.validate()` / `fieldErrors` programmatic contract never invoked

- 契约出处: `docs/architecture/form-validation.md:158` (V23 rule 5): `FormRuntime.validate()` / `componentHandle.validate()` expose the full `FormValidationResult` so programmatic callers can branch on `fieldErrors` (e.g. focus the first failing field) without re-running validation.
- 现有测试为何守不住: `packages/flux-runtime/src/__tests__/component-handle-factory.test.ts:24` only asserts `hasMethod('validate')`; the method is never invoked through the handle, and no test asserts `fieldErrors` shape passes through the handle boundary (the V23 map-vs-flat-list distinction lives exactly there).
- 建议补测形态 (unit, real FormRuntime + `createFormComponentHandle`): invalid required field → invoke `validate` → assert `ok:false`, `fieldErrors{path: [...]}` non-empty, `errors` aggregate; then fix value → `ok:true, fieldErrors:{}`.

### GAP 7 (P2) — IME guard family asymmetry: `input-suggest` Enter has no composition guard and no IME test

- 契约出处: the IME-no-commit pattern the in-flight session established for form submit (`form.tsx:520-525`, paired negative/positive tests `form-shell-enhancements.test.tsx:276-335` + default-submit case `:244`) and for ai-sender (`ai-sender.tsx:65-66` with dedicated `ai-sender-ime.test.tsx`).
- 现有测试为何守不住: `packages/flux-renderers-form/src/renderers/input-suggest.tsx:280-287` selects the highlighted suggestion on Enter with no `isComposing`/`keyCode===229` check; `input-suggest.test.tsx` has no IME case (repo-wide isComposing grep: only ai-sender + form.tsx). During CJK composition, Enter that confirms a candidate also commits the highlighted suggestion mid-composition — the same defect family the concurrent fix targets, still live one hop away. Form.tsx's own in-flight guard+test pairing is adequate; this is the adjacent unguarded surface.
- 建议补测形态: first a product decision (should suggest selection respect composition?), then mirror the two shell tests: `keyDown Enter {isComposing:true}` and `{keyCode:229}` → no selection; plain Enter → selection fires. If guarded, extract the predicate so form/ai-sender/suggest share one tested helper instead of three copies.

### GAP 8 (P3) — Enter-submit tag-based exclusions (TEXTAREA/BUTTON/A/contenteditable) untested

- 契约出处: `form.tsx:534-546`.
- 现有测试为何守不住: `form-shell-enhancements.test.tsx` covers role-based exclusions (fieldset legend, checkbox, switch), `defaultPrevented`, and IME; no case presses Enter in a textarea/button/link/contenteditable host. A refactor that reorders or drops the tag checks passes the suite.
- 建议补测形态 (unit, cheap): parametrize four keyDown cases asserting no submit; plus one positive Enter-in-textarea newline case.

### GAP 9 (P3) — input-table cell-level error association not pinned (siblings are)

- 契约出处: doc "Aggregate And Root Error Attach Points" rendering rules (row/child errors reach the owning input's aria wiring); `InputTableRow` → projected registration → field chrome chain.
- 现有测试为何守不住: `form-array-validation.test.tsx:238` (array-editor) and `:311` (key-value) assert `aria-describedby`/`aria-errormessage` reach the real input; `cx11-consumer-contract-pins.test.tsx:194` pins input-table only for aggregate `minItems` display and add-row trigger depth. No test drives a **cell-level** required/pattern failure in an input-table column and asserts it lands on that cell input. The three renderers share machinery, so risk is low — hence P3 — but the input-table instance of the chain is currently hit-only, not asserted.
- 建议补测形态 (UI, mirror the key-value pin): input-table with required `sku` column → blur empty cell → assert error text + aria wiring on the cell input.

### GAP 10 (P3) — cancelled duplicate submit via `component:submit`: no error-feedback semantics pinned at UI layer

- 契约出处: `form-runtime-submit-flow.ts:245-251` — duplicate submit returns `{ok:false, cancelled:true}` **before** lifecycle handlers, so onSubmitError must not fire for the cancelled attempt; `runtime-actions-submit.test.ts:80,135` covers this for the `submitForm` action path only.
- 现有测试为何守不住: form action buttons in tests dispatch `component:submit` → component-handle → `form.submit()`; no test double-fires that path during an in-flight submit and asserts submitCalls==1, onSubmitError not invoked, and no transient error UI from the cancelled attempt.
- 建议补测形态 (integration): button with `onClick: component:submit`, pending fetcher, click twice → assert single ajax call, no onSubmitError, busy state coherent until settle.

## Summary

- contracts examined: 18; gaps: 10 (P1 1 / P2 6 / P3 3)
- Strongest coverage surfaces: submit lifecycle routing (C2/C3/C5/C6/C14), validation display gate + error clearing (C11/C12), focus-first-error (C13), inline-edit add-vs-validate timing for array-editor/key-value (C17 partial), IME guard for form submit (C18 partial, in-flight pair).
- Weakest coverage surfaces: hidden-field submit-payload projection (stale pinned contract, GAP 1), form→target cross-layer delivery (GAP 2), submitting feedback/delay (GAP 4), unmount-during-submit (GAP 5), programmatic validate handle (GAP 6), IME parity beyond form.tsx (GAP 7).
- Premise correction: `restoreValues` is not a form-family contract (industrial point-store only); audited nearest analogs are covered.

---

## Shard C — data+basic 家族

# FM-3 测试保护力审计 — shard C (data+basic)

> 批次：plan 644 FM-3 Phase 1 分片 C。口径：`docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`（先契约后测试）。
> 范围：`packages/flux-renderers-data`（selection/filter/sort/tree-lazy/pagination/responsive/grouping；FM-0/FM-2 已补判别面 use-column-resize / fixed-columns / table-renderer 主体 / compile cache 不重扫）+ `packages/flux-renderers-basic`（container/flex/page 布局契约、slot/region 渲染链、事件挂载契约）。
> 去重：FM-0 已补面（列宽拖拽、固定列叠加层、全选取证、行拖拽 CSS）与 `docs/audits/interaction-state/`、plan 543/623/638 沉淀均已对照，不重复立案。
> 结论概要：两族契约面整体测试保护力**强**（多数契约有具名锚测试，断言到 payload 形状/状态矩阵级）。本分片 **P1 = 0**；P2 × 4、P3 × 5，均为点状缺口而非家族性断层。

## Findings

### C-01 懒加载子节点的 in-flight 去重与 unmount 守卫无测试

- 严重度：P2；类别：缺少负面场景
- 契约：`childrenSource` 懒加载的并发治理——同一 rowKey 加载在途时重复触发必须去重（单次 dispatch、单次 scope create/dispose）；组件卸载后 resolve/reject 不得再 setState（`packages/flux-renderers-data/src/table-renderer/use-table-lazy-children.ts:55` `inFlightRef` 早退；`:38` `mountedRef`、`:65`/`:80` 卸载后 return）。
- 测试证据：`table-t11-lazy-children.test.tsx:68-260` 覆盖触发/spinner/失败重试/缓存复用，全部是单发顺序路径；`table-lazy-children-scope-dispose.test.tsx:10-82` 只断言 settle/reject 后 dispose 一次，无并发双击、无卸载后回调场景。
- 现状：`inFlightRef` 分支被顺带 hit（空 Map 时恒 false），但没有任何测试会在该守卫被删后变红。
- coverage 为何误导：分支覆盖显示 error/retry/dispose 全绿，但"快速连点展开 → 双 dispatch + 双 scope 分配"这一真实 defect family（与已立案的 stale-result/竞态族同源）完全无防回归约束；卸载后 setState 回归只会以 React 警告形式出现，断言层抓不到。
- 补测形态：unit（hook 级或 renderer 级）。用受控 deferred fetcher：连点两次 toggle → 断言 fetcher 调用数 = 1；卸载后 resolve → 断言无 state 更新（可用 dispatch 后 unmount + assert 无 warning/无新渲染）。优先级 P2。

### C-02 树表子行 rowKey 合成与非法子节点降级无测试

- 严重度：P2；类别：契约未覆盖 / 缺少负面场景
- 契约：`flattenTreeRows` 子行身份合成链 `__rowKey ?? id ?? \`${parentRowKey}::child:${index}\``，非 record 子项降级为空 record + 合成 key（`packages/flux-renderers-data/src/table-renderer/use-table-tree.ts:86-105`）。该 key 同时是 React key、selection key、row-scope cache key（`cacheKey`），是树表 selection/展开/scope 三条链的身份源头。
- 测试证据：`table-e1c-tree-table.test.tsx:97-191` 的 flatten 用例全部喂规范 record（带 `id`/`__rowKey`）；全测试目录 grep `::child` 零命中；非 record 子项（原始值/null）场景零测试。
- 现状：合成链的优先级换位（如 `id` 先于 `__rowKey`）、index fallback 的唯一性、原始值子项不崩——均无约束。
- coverage 为何误导：flatten/展开/树 selection 测试多、全绿，但它们共享同一种"良构输入"假设；身份合成回归（key 碰撞 → React 复用错行、selection 误选）在现有断言下不可见，属于"同层假闭环"。
- 补测形态：unit 纯函数测试直测 `flattenTreeRows`：无 id 双子项得到两个不同合成 key；`__rowKey` 优先于 `id`；原始值子项产出空 record 行且不抛。优先级 P2。

### C-03 radio × checkableWhen 组合（不可勾选行 radio disabled）零覆盖

- 严重度：P2；类别：契约未覆盖
- 契约：crud owner doc 明文 —— `docs/components/crud/design.md:375` "radio 单选模式同样消费 `checkableWhen`（不可勾选行 radio disabled）"；实现点 `use-table-selection.ts:191-199`（`isRowCheckable`）→ `table-renderer/table-row-leading-cells.tsx:149`（`disabled={isRowCheckable ? !isRowCheckable(rowKey) : undefined}`，checkbox 与 radio 共用）。
- 测试证据：radio 路径测试（`use-table-controls.selection.test.tsx:252,329`、`crud-selection-and-features.test.tsx:645-661`、`table-virtual-radio.test.tsx`）全部不设 `checkableWhen`；`checkableWhen` 测试（`table-selection-checkable-scope-dispose.test.tsx` 全部用例、`table-select-all-mode.test.tsx:172`）全部是 checkbox 模式。两轴正交、交点为空。
- 现状：契约有 owner doc 出处、有实现、无任何测试约束。
- coverage 为何误导：两侧各自的高覆盖抬高了整体数字；若 radio 分支丢失 `disabled` 传递（例如 leading-cells 重构时只保 checkbox 分支），全套件仍绿。
- 补测形态：integration（renderer 级）单测：radio + `checkableWhen` 情形断言不可勾选行 radio input `disabled`，且点击不产生 selection payload。优先级 P2。

### C-04 responsive 主列切分契约（fixed 列必留）无测试

- 严重度：P2；类别：契约未覆盖
- 契约：移动端 expand 模式的主列/隐藏列切分——`fixed: 'left'|'right'` 列与首个非 fixed 列必须留在 primary 集，其余列折叠进展开详情（`packages/flux-renderers-data/src/table-renderer/responsive.ts:29-66` `splitResponsiveColumns`；无名列退化命名 `left-${index}`/`right-${index}`）。这是移动端"操作列不消失"这一用户可见保证的实现载体。
- 测试证据：`table-responsive.test.tsx:23-135` 三个用例全部使用无 `fixed` 声明的普通列（name/email/phone）；`resolveResponsiveBreakpoint` 的非法字符串 → md fallback（responsive.ts:19-26）亦无用例（数值断点已由 `table-c4-1-schema-contract.test.tsx:177` 覆盖，`'md'` 字符串已由 table-responsive 覆盖）。
- 现状：若切分误把 fixed 列归入 hiddenColumns（如 index 命名错位），移动端表格将隐藏操作/选择列，现有断言全部无感。
- coverage 为何误导：responsive 模式激活/卡片详情有 renderer 级绿测，但"哪些列存活"这一判别面从未被断言——测的是"有展开详情"，不是"留下的列正确"。
- 补测形态：unit 直测 `splitResponsiveColumns`（fixed left + fixed right + 多个非 fixed：断言 primary/hidden 归属与无名列退化）+ 一个 renderer 级用例（mobile 下 fixed 操作列仍在表头）。优先级 P2。

### C-05 selectAllMode:'page' × radio 惰性组合无测试

- 严重度：P3；类别：缺少负面场景
- 契约：`selectAllMode: 'page'` 在 radio 下必须惰性（回退 'all' 语义）——`use-table-selection.ts:61`（`rowSelection?.selectAllMode === 'page' && !isRadio ? 'page' : 'all'`）。
- 测试证据：`table-select-all-mode.test.tsx` 无任何 radio 组合；同构的惰性判定（modifierSelect×radio）已有判别先例 `table-modifier-select.test.tsx:228`，本点漏配。
- 补测形态：unit/renderer 级一条：radio + `selectAllMode:'page'` 断言表头 radio（如有）不受 page 切片影响、行为与缺省一致。优先级 P3。

### C-06 clearFilters 未命中列的 no-op 只被调用、未被断言

- 严重度：P3；类别：断言过弱
- 契约：对不存在的 filter 列 `clearFilters` 必须早退且**不发事件**（`use-table-filter.ts:180-184` early return）。
- 测试证据：`use-table-controls.sort-filter-expand.test.tsx:170-172` 调用了 `api.clearFilters('missing')`，但随后没有任何 `onFilterChange` 调用数不变/未新增调用的断言——分支被 hit，错误行为（误发空 filter-change 事件）不会被拦截。
- 补测形态：在既有用例中补一行 `expect(onFilterChange).toHaveBeenCalledTimes(n)` 锚点。优先级 P3。

### C-07 分页禁用时 clampPage 的 no-op 分支无测试

- 严重度：P3；类别：缺少负面场景
- 契约：`pagination.enabled === false` 时 `clampPage` 必须原样返回当前页且不发 `table:page-change`（`use-table-pagination.ts:119-121`）。
- 测试证据：`use-table-controls.pagination.test.tsx:116-152` 只测 enabled=true 的 clamp；`data-table-pagination-clamp.test.tsx` 全部为启用分页的 renderer 路径。
- 补测形态：hook probe 一条（enabled:false + clampPage(99, 0) → currentPage 不变、onPageChange 未调用）。优先级 P3。

### C-08 page 空 aside（`aside: []`）折叠语义（C-11）无测试

- 严重度：P2；类别：缺少负面场景
- 契约：`page.tsx:155-161` 源内显式契约注释（C-11）：`aside` 经编译后为**空** template-node 数组时必须等同无 aside（折叠 header toggle 与 Sheet），`hasAside` 必须判内容而非 schema 存在性。
- 测试证据：`page-responsive.test.tsx:42-123` 覆盖 aside 缺省与非空两态；`layout-family-enhancements.test.tsx:186` 使用非空 asideBody；全 basic 测试目录无 `aside: []` 用例。
- 现状：三态判别（缺省 / 空数组 / 非空）缺中间一态；若有人把 `hasAside` 简化回 `Boolean(props.regions.aside)`，唯一守护是这条无人断言的注释。
- coverage 为何误导：aside 移动端行为测试多且绿，但它们从未区分"空数组"与"缺省"——恰好是 C-11 修复所针对的回归形态。
- 补测形态：basic integration 一条：`aside: []` + mobile 视口 → 断言无 `data-slot="page-aside-toggle"`、无 Sheet。优先级 P2。

### C-09 container align 映射矩阵仅 center 一格被断言

- 严重度：P3；类别：断言过弱
- 契约：`container.align: start/end/stretch` 分别映射 `items-start/items-end/items-stretch`（`packages/flux-renderers-basic/src/container.tsx:98-101`；`docs/components/container/design.md:149-153` 的"内容整体摆放语义"）。
- 测试证据：`audit-family-regressions.test.tsx:80` 只断言 `align: 'center'` → `items-center justify-center`；start/end/stretch 无断言（同文件已覆盖 direction/wrap/gap 全矩阵，独缺 align 三格）。
- 补测形态：既有 describe 内补参数化三行。优先级 P3。

## 观察（不入 findings）

- **container 无 disabled 门控而 flex 有（V12e）**：`flex.tsx:68-81` 对 clickable flex 做 `meta.disabled` 门控；`container.tsx:45-56` 的 clickable 路径不读 `meta.disabled`。`docs/components/container/design.md:105` 仅说"禁用态由 resolved meta 决定"（状态归属表述），未承诺行为门控——按现契约不构成违约，但两 renderer 行为不对称值得 owner doc 一句话定界（属 FM-6/FM-7 文档侧，非测试缺口）。
- **panel 不在 flux-renderers-basic**：分片范围提到的 panel 布局契约在 basic 包内无对应 renderer（schemas.ts 无 panel 类型），无可审计对象。

## 已检且判定保护充分的契约面（零发现声明）

| 契约面                                                                                                                                                                                                            | 契约出处                                                    | 锚测试（抽查证据）                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| selectAllMode 'all'/'page' 语义（union/deselect 保留他页、cap 截断、checkable 过滤、server-paged scope）                                                                                                          | `use-table-selection.ts:58-62,235-299`；table design.md:183 | `table-select-all-mode.test.tsx:60-251`（逐语义断言含 payload key 集合）                                                                                                                                                                         |
| keepOnPageChange：render-time prune/retain、T10 setSelectionExternal 跨页、H21 phantom prune                                                                                                                      | table design.md:183；crud design.md:364-367                 | `table-selection-invariants.test.tsx:77-150`、`table-selection-phantom-prune.test.tsx:16-56`、`table-b33-advanced-boundary.test.tsx`（T10 锚）                                                                                                   |
| selection 三通道等价 + 引用稳定（M-01/G7）                                                                                                                                                                        | table design.md:189                                         | `table-selection-invariants.test.tsx:198-251`                                                                                                                                                                                                    |
| modifier select 全矩阵（shift 加法并集、锚移动规则、cap 截断、checkable 跳过、radio 惰性、⌘A、可编辑元素豁免、flag-off 字节级回归）                                                                               | `use-table-selection.ts:55-72,348-446`                      | `table-modifier-select-hook.test.tsx:35-228`、`table-modifier-select.test.tsx:74-153`                                                                                                                                                            |
| checkableWhen（cached-scope 路径、legacy create/dispose 路径、求值失败降级 + WA-data-009 warn-once、select-all 只取可勾选）                                                                                       | crud design.md:372-375                                      | `table-selection-checkable-scope-dispose.test.tsx:72-218`                                                                                                                                                                                        |
| selection ownership 三态（local/controlled/scope 写回 + radio 替换语义）                                                                                                                                          | table design.md:74,140                                      | `use-table-controls.selection.test.tsx:69-368`                                                                                                                                                                                                   |
| filter hook（payload 形状锁定、keyword undefined 语义、scope/controlled 三态）                                                                                                                                    | `use-table-filter.ts:115-202`                               | `use-table-controls.sort-filter-expand.test.tsx:137-280`（逐字段 payload 断言）                                                                                                                                                                  |
| sort hook（asc→desc→null 环、sortable 门、multi 累积/优先级、scope 数组写回、controlled 单/多形态、单模式 payload 形状）                                                                                          | `use-table-sort.ts:192-296`                                 | `use-table-controls.sort-filter-expand.test.tsx:19-134`、`table-e1c-multi-sort.test.tsx:20-271`                                                                                                                                                  |
| 树表 flatten（层级/展开集/3 层/环检测截断/自定义 childrenField/非树回归）                                                                                                                                         | `use-table-tree.ts:39-115`                                  | `table-e1c-tree-table.test.tsx:97-191,159`（环检测）                                                                                                                                                                                             |
| 树 selection（无级联、子行 checkableWhen、flattened select-all scope G3-R3）                                                                                                                                      | use-table-selection.ts:224-233                              | `table-tree-selection-no-cascade.test.tsx`、`table-tree-selection-child-selectable.test.tsx`、`table-p3-wave-data-fixes.test.tsx:100-113`                                                                                                        |
| 懒加载主链（触发、itemKey scope、spinner、失败 + 重试、缓存复用、scope dispose on settle/reject）                                                                                                                 | `use-table-lazy-children.ts`、use-table-tree-data.ts:62-68  | `table-t11-lazy-children.test.tsx:68-260`、`table-lazy-children-scope-dispose.test.tsx:10-82`（并发/卸载除外，见 C-01）                                                                                                                          |
| expand/expandableWhen（toggle、初始 keys、falsy 隐藏、抛错降级 + warn-once）                                                                                                                                      | `use-table-expand.ts`、table-body-row-rendering             | `table-expandable-when.test.tsx:42-69`、`use-table-controls.sort-filter-expand.test.tsx:284`                                                                                                                                                     |
| pagination hook（三态、pageSize 变更重置回页 1 含 scope 写回、clamp 收缩、pageSize 保留 B3.1/T3、空对象 scope 态）                                                                                                | `use-table-pagination.ts:52-158`                            | `use-table-controls.pagination.test.tsx:17-211`（含 3→1 判别）、`data-table-pagination-clamp.test.tsx:29-152`                                                                                                                                    |
| grouping（config 解析矩阵、聚合矩阵、missing fallback、interleave、折叠、页切片含 header 占槽 + 与 page select-all 交叉、树/拖拽 clash warn、schema 校验）                                                        | use-table-grouping.ts:20-83、D1 G-D                         | `table-grouping.test.ts:19-175`、`table-group-render.test.tsx:63-431`（含 :241 页切片判别）                                                                                                                                                      |
| responsive expand 激活/详情/defaultExpanded(P1-2)/桌面不激活                                                                                                                                                      | responsive.ts:94-122                                        | `table-responsive.test.tsx:23-135`、`table-c4-1-schema-contract.test.tsx:170-185`（切分归属除外，见 C-04）                                                                                                                                       |
| container：className 三层路由、641 bare 路径（判别已补）、responsive direction/wrap、header/footer slots、clickable/keyboard、data-attrs                                                                          | container design.md §12/§16                                 | `slot-classname.test.tsx:8-333`、`audit-family-regressions.test.tsx:23-133`、`flex-responsive.test.tsx:106-157`、`container-interactive-contract.test.tsx:48-180`、`data-attrs-passthrough.test.tsx`                                             |
| flex：轴映射、body/items 回退、disabled 门控（V12e）、responsive、click 无声明不挂 handler                                                                                                                        | flex.tsx:8-126                                              | `audit-family-regressions.test.tsx`、`basic-page-and-layout-structure.test.tsx:61-90`、`flex-disabled-gate.test.tsx:31-55`、`flex-container-click.test.tsx:27-94`                                                                                |
| page：slot 结构/顺序、breadcrumb 畸形降级、data 初始化补丁（含 StrictMode）、aside resize（含右侧反向/右键忽略/clamp）、footerFixed prop 驱动 + VisualViewport、statusPath/refreshTick、移动 aside Sheet/滚动契约 | page design.md；page.tsx                                    | `page-header-semantics.test.tsx:40-162`、`audit-family-regressions.test.tsx:135-190`、`page-aside-resizable.test.tsx:38-124`、`page-footer-fixed.test.tsx:28-41`、`page-responsive.test.tsx:41-280`、`basic-page-and-tabs-status.test.tsx:25-77` |
| 事件挂载契约（click/Enter/Space、preventDefault、未声明不挂、disabled 拦截）                                                                                                                                      | renderer-runtime.md（events 通道）                          | `event-handler-contract.test.tsx:8-73`、`flex-container-click.test.tsx`、`container-interactive-contract.test.tsx`                                                                                                                               |

## Coverage Assessment

- data 族的 selection/filter/sort/pagination/grouping 已达到**契约级覆盖**（非 line/branch 亦非 helper-level）：payload 形状、ownership 三态、负面对照均有具名锚测试，与 owner doc 逐条对得上。最弱面集中在**并发/生命周期治理**（C-01）与**身份合成/切分这类"内部不变量"**（C-02、C-04）——共性是"输入良构 + 顺序执行"的测试假设掩盖了判别面。
- basic 族布局/事件/slot 链接近全矩阵覆盖（含大量 no-regression 反向断言）；最弱面是**三态判别的中间态**（C-08 空 aside）与零星映射格（C-09）。
- 两族均未发现跨层断层或入口错误覆盖模式：hook 测试走 `useRenderScope`/`useOwnershipScopeValue` 真实桥（test-support 提供 scope mock 但事件/写回通道断言到真实形状），renderer 测试走 `SchemaRenderer` 真实编译入口。

## Recommended Next Tests（最高 ROI，全部 unit/integration 层）

1. 懒加载并发 + 卸载守卫（C-01，integration）——唯一会真实双 fetch 的缺口。
2. `flattenTreeRows` 身份合成纯函数矩阵（C-02，unit）——保护 selection/scope 三链共用的身份源。
3. radio × checkableWhen（C-03，integration）——owner doc 明文契约的零覆盖点。
4. `splitResponsiveColumns` fixed 归属（C-04，unit + 一条 renderer 冒烟）——移动端操作列不消失的保证。
5. 空 aside 折叠（C-08，integration）——注释级契约落为判别断言。
