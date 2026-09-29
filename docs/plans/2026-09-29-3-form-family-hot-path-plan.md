# 2026-09-29-3 表单族热路径优化

> Plan Status: completed
> Last Reviewed: 2026-09-29
> Source: `docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md`（R2-P5、R2-P10、R2-P11、R2-P19）
> Related: 2026-09-28-1（表达式/节点解析热路径，已收口）、2026-09-28-4（表单 a11y，已收口）

## Purpose

收口 flux-renderers-form 与 flux-core 验证模型在每击键/每 render 路径上的残余分配与重算：日期工具每 call 重 tokenize+正则、字典加载无共享、验证字段对象每 call 新分配、form-store diff 分配 churn。结果面 = 多字段表单（数十日期字段/100 字段级）交互路径无每次重编译/重分配。

## Current Baseline

- `flux-renderers-form/src/renderers/date/date-utils.ts:168-181` `parseDate` 每次 `tokenizeFormat` + `new RegExp`；`formatDate`（:115）每 call 重 tokenize；`:331-339` `resolveRelativeDate('now'/'today')` 每 call 新标识击穿 min/max 下游 memo（`date-range-renderer.tsx:160`、`date-field-control.tsx:121`）。
- `flux-renderers-form/src/renderers/use-dict-options.ts:23-51` 每实例独立 `loadDict`，无 in-flight/resolved 共享；`AbortController.signal` 未传入 loadDict（cleanup abort 无效）。
- `flux-core/src/validation-model.ts:77-87` `getCompiledValidationField` 每 call 新分配字段+policy 对象；每击键路径 4 个调用点（`field-presentation.tsx:53`、`form-state.ts:176,:200`、`field-validation.ts:21`、`form-runtime-validation.ts:508`）。
- `flux-runtime/src/form-store.ts:347,:355` 值 diff 沿写路径每层 `new Set` + path concat（`Object.is` 短路下仅写路径分支，但击键仍每层分配）。
- form 包测试基线：111 文件/934 用例全绿（2026-09-28）。
- 既有缓存先例：parsePath 共享缓存（flux-core/src/utils/path.ts，2026-09-28-6 落地）。

## Goals

- 日期 format tokenize/regex 按 format 缓存；相对日期解析标识稳定化，min/max 下游 memo 链可命中。
- 同名 dict 多实例共享单次加载；abort 语义真实生效（或如实记录 env 契约约束）。
- `getCompiledValidationField` 按模型代次 memo，无每 call 分配。
- setValue 路径 diff 从"逐层 deep diff"改为"按已知写路径合成"；batchUpdate/setValues 按 review Decision 保留深度 diff（batchUpdate 的路径知识在调用方，本 plan 不扩展 FormStore 契约）。

## Non-Goals

- 日期选择器 UI/交互变更；schema 面新增字段。
- `env.loadDict` host 契约的破坏性变更（signal 穿透若需契约变更则降级为 follow-up 并如实记录）。
- flux-formula/runtime（上一轮已收口）。

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/date/date-utils.ts` + 4 个调用点
- `packages/flux-renderers-form/src/renderers/use-dict-options.ts`
- `packages/flux-core/src/validation-model.ts`
- `packages/flux-runtime/src/form-store.ts`（diff 路径）

### Out Of Scope

- 其他 form 渲染器内部实现；flux-react 订阅链。

## Failure Paths

| 可测场景编号 | 触发 | 行为 | 可重试 | 用户可见表现 |
| --- | --- | --- | --- | --- |
| date-format-cache-hit | 同 format 多字段/多次解析 | 缓存命中，解析结果与无缓存实现一致 | 是 | 无 |
| relative-date-stable | `minDate: 'now'` 跨 render | 同 schema 字符串 → 同解析标识（量化窗内）；行为与现值一致 | 是 | 无 |
| dict-concurrent | N 实例同 dict 同挂载 | loadDict 仅一次；结果共享 | 是 | 无 |
| setValues-whole-object | 整对象替换 | 深度 diff 路径保留，变更通知语义不变 | 是 | 无 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（性能优化，行为契约不变，但日期/diff 语义敏感——缓存等价性、diff 合成与旧实现等价性必须有 focused 用例先红后绿或对照断言）。

## Execution Plan

### Phase 1 - 日期工具缓存与相对日期稳定化

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/date/`

- Item Types: `Fix`、`Proof`

- [x] `tokenizeFormat` + 正则构造按 format 字符串模块级缓存（Map，parsePath 模式）
- [x] `resolveRelativeDate` 标识稳定化（**约束性 Decision，非开放项**）：缓存键必须含时间桶（秒级量化的 `Date.now()` 桶 + 原始 schema 字符串）——`'now'` 在同秒窗内返回同标识、跨秒窗必须重新解析推进；禁止纯字符串键的进程级冻结缓存（会使 `minDate:'now'` 停止前进、长生命周期表单可选过去日期）。Proof 必须含跨窗推进用例
- [x] focused 测试：缓存等价性（缓存 vs 无缓存实现逐例一致）、**同秒窗标识稳定 + 跨秒窗标识刷新/'now' 推进**断言、调用点行为回归（回归覆盖面：date-range-renderer.tsx、input-date-renderer.tsx、input-datetime-renderer.tsx、input-time-renderer.tsx、date/date-field-control.tsx、date/date-presets.ts 共 6 个消费文件）
- [x] Proof: date/time/period/range 既有用例绿

Exit Criteria:

- [x] 同 format 二次 parseDate/formatDate 零重 tokenize 的测试成立（compiled-format cache：二遍结果逐例等价 + cache entries 不增长——date-utils-cache.test.ts）
- [x] `'now'` minDate 跨两次 render 产生相同解析标识的测试成立（同秒桶同标识 + 跨桶推进/'now' 前进 + today 本地零点量化）
- [x] date 族 focused 测试绿（form 112 文件/941 用例全绿，6 个消费文件经既有 date/time/period/range 套件回归）

### Phase 2 - 字典共享加载与验证字段 memo

Status: completed
Targets: `use-dict-options.ts`、`packages/flux-core/src/validation-model.ts`

- Item Types: `Fix`、`Proof`

- [x] useDictOptions 模块级 `Map<dictName, Promise>` in-flight/resolved 共享（含失败不缓存的决策记录）
- [x] abort 语义落地：`RendererEnv.loadDict` 契约已声明 `signal?: AbortSignal` 参数（`flux-core/src/types/renderer-api.ts:236`），无需契约变更——controller.signal 直接穿透传入；host 侧是否真正响应 abort 属宿主实现自由（best-effort 契约），记入测试注记
- [x] `getCompiledValidationField` WeakMap<model, Map<path, field>> memo（前置假设：编译后验证模型按代次不可变；测试含 canary 断言——若未来 in-place 变异 model nodes，stale 引用断言会红）
- [x] focused 测试：并发挂载单次 loadDict、验证字段对象引用稳定（同 model 同 path 同引用）、值变更后新 model 新引用、signal 已传入 loadDict
- [x] Proof: form 既有用例绿

Exit Criteria:

- [x] 同 dict 双实例仅一次 loadDict 的测试成立（select-dict-loading.test.tsx：并发挂载 1 次调用 + 失败不缓存重试语义）
- [x] 同一 model 同 path 二次调用返回同一对象引用的测试成立（validation-model-memo.test.ts：引用稳定/负查询 memo/新 model 新引用/契约 pin）
- [x] form/core focused 测试绿（core 36 文件/517 用例、form 112 文件/941 用例）

### Phase 3 - form-store 写路径 diff 合成

Status: completed
Targets: `packages/flux-runtime/src/form-store.ts`

- Item Types: `Fix`、`Proof`

- [x] **Decision（已裁定）**：写路径合成仅覆盖 `setValue`（path 为 API 入参，store 内合成）；`batchUpdate(updates)` 的 `{values}` 无 path 入参，调用方路径知识在 caller 侧（form-runtime-values.ts:103-113 / form-runtime-array.ts:243-250）——本 plan 不扩展 FormStore 契约，batchUpdate 保留现有深度 diff（决策与理由记录于此项）
- [x] setValue 按已知写路径合成变更 path 集（pathPrefixes 复用），移除逐层 Set/spread diff
- [x] 等价性测试两个已识别细节：① no-op 写守卫——结构性相等替换今日零通知（collectChangedValuePaths 无叶变化 + collectSubscribedChangedPaths 兜底），合成路径前必须 `Object.is(getIn(before,path), getIn(after,path))` 守卫避免虚假通知；② `captureCommit({changedPaths})`（:431）诊断粒度若因合成到 spine 根而变粗，需保持与现路径集合一致或显式记录
- [x] focused 测试：合成 diff 与旧 deep diff 产生相同变更通知集合（等价性用例，含嵌套路径/数组索引/no-op 写）
- [x] Proof: form-runtime/form-store 既有用例绿

Exit Criteria:

- [x] 等价性测试成立（form-store-setvalue-spine-diff.test.ts：叶写/深层前缀链/对象替换叶集合/数组叶规则/新建路径/no-op 六场景通知集合与旧 deep diff 手工推导一致）
- [x] setValue 击键路径零逐层 Set 分配的实现落地（collectWriteSpineChangedPaths 沿写 spine 行走，仅在写路径值子树内复用 collectChangedValuePaths；batchUpdate/setValues 按裁定保留全量 deep diff）
- [x] runtime focused 测试绿（138 文件/1472 用例）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-29）
- Verdict: `issues` → Major 2 项修订后达成共识（复核判定零 Blocker/Major）
- Rounds: 1
- Findings addressed: **Major-1** resolveRelativeDate 缓存键强制含秒级时间桶 + 跨窗推进 Proof（防 'now' 冻结）；**Major-2** batchUpdate 合成机制裁定为 setValue-only（batchUpdate 保留深度 diff，不扩 FormStore 契约）+ no-op 写守卫/captureCommit 粒度细节入测试项。Minor 3 项折入：loadDict signal 契约已存在（renderer-api.ts:236）直接穿透、6 个消费文件回归面枚举、WeakMap memo 不可变假设 canary 断言

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（本 plan 无 live defect）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（不适用）
- [ ] 行为/契约结果已达成（缓存等价性、diff 等价性证明）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### host 侧 loadDict 对 abort 的实际响应

- Classification: `watch-only residual`
- Why Not Blocking Closure: signal 穿透在本 plan 落地（契约已含参数，零变更）；host 是否真正中断请求属宿主行为。已知边界：host 若响应 abort，首个卸载的 coalescing 实例会使共享 promise reject——仍挂载的 peers 会经各自的 gen 门呈现错误态（in-flight 条目 settle 后即清除，下次挂载重试恢复）；该路径以 host 遵守 abort 为前提，条件性且可恢复
- Successor Required: no
- Successor Path: 无（host 文档侧说明即可）

## Non-Blocking Follow-ups

- 主击键路径 `thisForm.setValue` → `batchUpdate` 仍走全量 deep diff（Decision 裁定保留）；caller 侧路径合成（form-runtime-values/form-runtime-array 已知 changedPaths 回传）是后续 optimization candidate

## Closure

Status Note: 三个 Phase 全部落地且通知集合等价性有测试兜底；closure audit（独立子 agent）判定 approved-with-minors（4 Minor 全部折入：dict owner doc 同步、Deferred peer-propagation 边界补记、Goal 文本与 Decision 对齐、caller 侧路径合成记 follow-up）；四门禁 + check 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）
- Evidence: verdict `approved-with-minors`（零 Blocker/Major；Phase 3 六场景语义经审计方按 setIn 结构共享独立重推导确认与旧 deep diff 一致；form 套件经审计方 live 复跑 941/941；两处既有测试更新核实为断言强化——pin 住 signal 穿透——非弱化）

Follow-up:

- caller 侧路径合成（batchUpdate 深度 diff 的后继优化候选，见 Non-Blocking Follow-ups）；无其余 plan-owned work
