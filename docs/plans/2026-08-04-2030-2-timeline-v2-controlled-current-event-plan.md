# Timeline v2 受控当前事件扩展（value/defaultValue/valueOwnership/valueStatePath/onChange）

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/timeline/design.md`（v2 立约节，两轮独立审查通过）；`flux-guide/design-patterns/steps-timeline.md`（v2 受控示例 + 未实现标注）
> Related: `docs/components/roadmap.md` W4b（timeline 已 done，本 plan 为其后 v2 扩展，closure 在 roadmap 新增 timeline-v2 work item）；`docs/plans/2026-06-24-0718-3-w4b-process-display-family-plan.md`（W4b 先例，steps valueOwnership 三态分层）；`docs/plans/2026-08-04-2030-1-g1-graph-viewer-plan.md`（同需求来源 ArbiterOS，独立 plan）
> Mission: components
> Work Item: timeline-v2

## Purpose

把 `timeline` renderer 从"展示型（W4b done，纯 items/mode/orientation/reverse）"扩展到"支持受控当前事件（value 驱动高亮 + 点击 seek）"，面向 ArbiterOS demo「对话时间线播放」等「now 时刻高亮 + 巡检联动」场景。扩展沿用 steps（W4b）的 valueOwnership 三态分层范式，**不内置播放引擎**（play/pause/timer/scrubber 归宿主编排）。

按 plan guide：本扩展是对已 done 组件（W4b timeline）的契约增强，不涉及新包/新依赖，落 `flux-renderers-layout` 既有包。独立成 plan 因其改变了 timeline 的公开契约（新增 5 字段 + 1 事件 + 可点态），需显式 closure gate 与回归门。

## Current Baseline

> 截至 2026-08-04 的 live repo 核查结论（read-only）：

- **timeline 已落地（W4b done，纯展示）**：`packages/flux-renderers-layout/src/timeline-renderer.tsx` 仅消费 items/mode/orientation/reverse，无 value/owner 状态/事件。`TimelineRenderer` 注册于 `layout-renderer-definitions.ts:592`，定义在 `process-display-definitions.ts:92-146`。
- **v2 五字段在 contracts 中全缺**：`process-display-definitions.ts` timeline 段（L98-145）propContracts 仅 items/mode/orientation/reverse，fields 同；**无 value/defaultValue/valueOwnership/valueStatePath，无 onChange event**。`schemas.ts` `TimelineSchema`（L294+）同样无这五字段；`TimelineItemSchema`（L282-293）无 item 级 `value`（key 匹配枢纽）。
- **steps 三态分层先例已就绪（复用范式）**：`steps-renderer.tsx` 的 `resolveStepIndex`（L55-62，key 匹配 → 数字索引 clamp → 未匹配 -1）+ `resolveFinalIndex`（L64-73，-1 时兜底 defaultValue → 0）+ valueOwnership 三态（L88-151，local/controlled/scope + valueStatePath 缺失降级 + dev 告警）+ `data-current`/`data-current-index` marker（L214,228）。timeline v2 复用 resolveStepIndex 与三态语义，**渲染层裁定不同**（见 Decision）。
- **owner-doc 与 flux-guide 已立约**：`docs/components/timeline/design.md` v2 节齐全（三层表述 + 单选 active marker + data-clickable + 路径裁定）；`flux-guide/design-patterns/steps-timeline.md` v2 受控示例带「未实现」标注 + steps 字段表已修（statusPath 移除、status 词汇 wait/process/finish/error、补 onChange）。`example.json` 已转 v1 可验证。
- **既存依赖满足**：复用 steps 同族范式，无新第三方依赖。`@nop-chaos/ui` primitive 沿用既有 marker/样式 token。
- **retained 状态**：`examples.manifest.json` timeline 标 `runtime`（W4b done）；v2 扩展不改 runtime 标注（仍是已实现组件的能力增强）。
- **边界已立约（design §1/§2/§12）**：timeline 不承担流程 owner（归 steps/wizard）；不内置播放引擎（归宿主 import）；不开放 item region（首版纯 value prop）。v2 只加「当前值高亮 + 点击 seek」，不改变展示型集合定位。

## Goals

- timeline 新增受控当前事件能力：`value`/`defaultValue`/`valueOwnership`(local|controlled|scope)/`valueStatePath`/`onChange`，复用 steps 三态分层范式。
- value 解析链与 steps 同构（key 匹配优先 → 数字索引 clamp），**渲染层新裁定**：value 未命中 → 回退 defaultValue → 再未命中 → 无 active（不回退首项，与 steps 的 →0 兜底显式不同）。
- 点击 seek：仅 `onChange` 声明时事件项可点（`data-clickable` + 键盘可达 Enter/Space），controlled 只派发不 mutate，local/scope 自行落值（steps 同构）。
- active marker `data-state="active"`（与 steps 的 `data-current` 既有差异保留，v2 不强行统一）。
- 三处源码同步：`schemas.ts`（TimelineSchema + TimelineItemSchema）+ `process-display-definitions.ts`（propContracts/fields/eventContracts）+ `timeline-renderer.tsx`（解析/三态/派发/active 渲染）。
- focused 单测（三态 + reverse + 未匹配降级 + defaultValue 回退）+ playground 演示 + e2e；flux-guide/design.md 同步确认。
- roadmap 新增 timeline-v2 work item 并标 done（W4b 之后扩展）。

## Non-Goals

- 不内置播放引擎（play/pause/timer/scrubber 进度条拖动）——归宿主 `xui:imports` 连接器 + `setValue` 递增 + `progress` 展示（design §2 不采纳行）。
- 不开放 `item` region（维持首版纯 value prop）。
- 不承担流程 owner / 提交语义（归 steps/wizard）。
- 不强行统一 timeline `data-state="active"` 与 steps `data-current` marker 词汇（避免 e2e 选择器漂移）。
- 不实现 `component:setValue` 句柄（首版无组件句柄；如未来需程序化 seek 再评估）。
- 不改变 TimelineItemLevel 取值（含 'error'/'default'/'primary'，族内既有漂移，v2 不动）。
- 不实现 graph（独立 plan `2026-08-04-2030-1`）。

## Scope

### In Scope

- `schemas.ts`：`TimelineItemSchema` 加 `value?: string|number`（key 匹配枢纽，v2）；`TimelineSchema` 加 `value`/`defaultValue`/`valueOwnership`/`valueStatePath`/`onChange`。
- `process-display-definitions.ts`：timeline propContracts 加 value/defaultValue/valueOwnership/valueStatePath；fields 加这些 + `{ key: 'onChange', kind: 'event' }`；eventContracts 加 onChange（payload `{ value, index, item }`）。
- `timeline-renderer.tsx`：value 解析（resolveStepIndex 同构 + clamp）+ 渲染层裁定（未匹配→defaultValue→无 active，不回退首项）+ valueOwnership 三态（local/controlled/scope + valueStatePath 缺失降级 local controlled + dev 告警）+ onChange 派发（controlled 只派发，local/scope 落值）+ active marker `data-state="active"` + 可点态 `data-clickable` + tabindex + Enter/Space。
- resolve helper 抽取裁定（见 Phase 1 Decision）。
- focused 单测 + playground 演示页（三态 + reverse + 未匹配降级 + 受控 seek 联动）+ e2e（程序化断言）。
- roadmap 新增 timeline-v2 work item（closure 标 done）；flux-guide/design.md 同步确认（v2 标注翻「已实现」）。

### Out Of Scope

- 播放引擎 / item region / 流程 owner / 句柄 / marker 词汇统一（见 Non-Goals）。
- steps/wizard 任何改动（仅复用范式，不改 steps 代码）。
- graph（独立 plan）。

## Failure Paths

| 场景                        | 触发                                     | 行为                                                     | 可重试 | 用户可见表现                |
| --------------------------- | ---------------------------------------- | -------------------------------------------------------- | ------ | --------------------------- |
| timeline-v2-value-unmatched | value 未命中任何 item key 且非数字索引   | 回退 defaultValue；再未命中则无 active（不回退首项）     | 否     | 无项高亮，其余正常渲染      |
| timeline-v2-scope-no-path   | valueOwnership:scope 但缺 valueStatePath | 降级 local controlled + dev 告警，不抛错                 | 否     | seek 仍可交互，值不写 scope |
| timeline-v2-items-empty     | items 空                                 | 渲染 empty 态（既有，不变）                              | 否     | 空态提示                    |
| timeline-v2-item-missing    | item 缺 time/title                       | 缺字段位降级（既有 W4b 行为，不变）                      | 否     | 该项显示已有字段            |
| timeline-v2-no-onChange     | 未声明 onChange                          | 事件项不可点（无 data-clickable/tabindex），纯展示零回归 | 否     | 静态时间线                  |

## Test Strategy

档位选择：**建议有测**

理由：v2 引入 valueOwnership 三态（local/controlled/scope 写回）+ value 解析链（含与 steps 不同的渲染层裁定）+ onChange 派发，是回归风险点。复用 steps 三态单测范式配 focused 单测（三态写回 + 未匹配降级 + defaultValue 回退 + reverse 下 active 定位）；关键交互（点击 seek→payload/写回、scope 模式写 scope、未声明 onChange 不可点）配 e2e（程序化断言）。timeline 已是 runtime 组件，须确保**未声明 v2 字段时零行为回归**（纯展示契约保持）。

## Execution Plan

### Phase 1 - schema 与 contracts（Decision + Fix）

Status: completed
Targets: `packages/flux-renderers-layout/src/{schemas.ts,process-display-definitions.ts}`

- Item Types: `Decision | Fix`

- [x] **Decision**：resolve helper 抽取边界裁定——是否将 steps 的 `resolveStepIndex` 抽到共享层供 timeline 复用？裁定：**首版不抽共享**（steps 的 `resolveFinalIndex` 含 →0 兜底与 timeline v2 裁定不同，仅 `resolveStepIndex` 可共享；仅两处消费者不值得过早抽象）。timeline 在 `timeline-renderer.tsx` 本地实现 resolve（key 匹配 + clamp + 未匹配 -1），与 steps 的 `resolveStepIndex` 语义同构、实现独立；标记为「第三个同族消费者出现时再提升 flux-core 共享 helper」。裁定写入 design §2.1-1 + log。
- [x] **Fix**：`schemas.ts` `TimelineItemSchema` 加 `value?: string|number`（注释 v2：key 匹配枢纽）；`TimelineSchema` 加 `value`/`defaultValue`/`valueOwnership:'local'|'controlled'|'scope'`（默认 local）/`valueStatePath`/`onChange: ActionSchema`（注释 v2，对齐 design §4）。
- [x] **Fix**：`process-display-definitions.ts` timeline 段——propContracts 加 value/defaultValue/valueOwnership/valueStatePath（shape 对齐 steps 段）；fields 加这四项 + `{ key: 'onChange', kind: 'event' }`；eventContracts 加 onChange（payload shape `{ value, index, item }`，对齐 steps onChange）。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-layout typecheck` 通过（新字段类型正确）。
- [x] contracts 与 steps 段范式一致（propContracts/fields/eventContracts 形状对齐）。

### Phase 2 - 渲染器三态 + seek + marker（Fix + Proof）

Status: completed
Targets: `packages/flux-renderers-layout/src/timeline-renderer.tsx`（colocated `*.test.tsx`）

- Item Types: `Fix | Proof`

- [x] **Fix**：value 解析——本地 resolve（key 匹配优先 → 数字索引 clamp → 未匹配 -1）；渲染层裁定：-1 时回退 defaultValue → 再 -1 则无 active（**不回退首项**，与 steps →0 兜底不同，design §2.1-1）。
- [x] **Fix**：valueOwnership 三态——local（内部 state + onChange 自更新）/ controlled（只读 value，onChange 只派发不 mutate）/ scope（读写 valueStatePath，缺路径降级 local controlled + dev 告警，复用 steps 的降级模式）。
- [x] **Fix**：onChange 派发——payload `{ value, index, item }`（value 为该项 key 或索引）；仅声明 onChange 时事件项可点（`data-clickable` + tabindex + Enter/Space 键盘可达）；未声明 onChange 时纯展示零回归。
- [x] **Fix**：active marker——当前事件项加 `data-state="active"`（与 steps `data-current` 既有差异保留）；reverse 下 active 按逻辑顺序解析、渲染位置随倒序（design §2.1-2）。
- [x] **Proof**：focused 单测——三态写回（local/controlled/scope + valueStatePath 缺失降级）、value 解析（key 命中/数字 clamp/未匹配→defaultValue→无 active 不回退首项）、reverse 下 active 定位、onChange 派发 payload、未声明 onChange 不可点（纯展示回归）。

Exit Criteria:

- [x] timeline-renderer 三态 + 解析链 + seek focused 单测通过。
- [x] 未声明 v2 字段时纯展示行为零回归（既有 W4b 用例不受影响）。

### Phase 3 - playground + e2e + 状态同步（Proof + Fix）

Status: completed
Targets: playground route-model + example（v2 受控）；`tests/e2e/`；`docs/components/roadmap.md`；`flux-guide/design-patterns/steps-timeline.md`；`docs/components/timeline/design.md`

- Item Types: `Proof | Fix`

- [x] **Proof**：playground 演示页——v2 受控（value 驱动高亮 + onChange seek 联动）+ reverse + 未匹配降级 + scope 模式（valueStatePath 写回）。
- [x] **Proof**：e2e（程序化断言）——点击事件项→onChange payload 正确、controlled 只派发不 mutate、scope 写 valueStatePath、value 未匹配无 active 不回退首项、未声明 onChange 不可点、reverse 下 active 视觉位置。
- [x] **Fix**：`flux-guide/design-patterns/steps-timeline.md` v2 受控示例标注翻「已实现」；`docs/components/timeline/design.md` §3 实现状态同步（v2 立约→已实现）。
- [x] **Fix**：`docs/components/roadmap.md` 新增 timeline-v2 work item（W4b 之后扩展行）并标 `done`（Phase Status 区）。

Exit Criteria:

- [x] playground 演示页可运行，timeline-v2 e2e 程序化断言在既有 pre-existing 失败基线之上通过
- [x] flux-guide v2 标注翻转；roadmap timeline-v2 work item 标 done

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: mission-driver `2026-08-05-065620`（fresh sub-agent review，对照 guide 四项检查 + live repo 引用核对）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major：Closure Gates 缺全量仓库验证（`pnpm typecheck`/`build`/`lint`/`test`）与独立 closure-audit 勾选项，已按 guide Rules 12/18 补齐
  - Minor：Phase Status 词表 `pending` → `planned`（guide 词表对齐）；`Last Reviewed` 更新；e2e「全绿」口径对齐既有 9 项 pre-existing 失败基线（不与全仓 e2e full-green 混淆）

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后，经独立子 agent closure-audit，方可将 Plan Status 改 `completed`。

- [x] timeline v2 五字段（value/defaultValue/valueOwnership/valueStatePath/onChange）落地于 `flux-renderers-layout`，contracts 与 schemas 同步
- [x] value 解析链与 steps 同构（resolveStepIndex 语义），渲染层裁定（未匹配→defaultValue→无 active，不回退首项）正确实现
- [x] valueOwnership 三态（local/controlled/scope + 缺 valueStatePath 降级）与 steps 范式一致
- [x] 未声明 v2 字段时纯展示行为零回归（既有 W4b timeline 用例不受影响）
- [x] 行为/契约结果已达成（focused 单测全绿；timeline-v2 e2e 断言在既有 9 项 pre-existing 失败基线之上通过，不与全仓 e2e full-green 混淆）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（design.md §2.1-1 裁定写入 + §3 实现状态、flux-guide 标注翻转、roadmap timeline-v2 work item、renderer-markers-and-selectors.md marker 登记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: 2026-08-05 收口——Phase 1-3 全部 completed，全量验证 32/32 typecheck/build/lint + 59/59 test task 全绿；w4b e2e 9/9（4 既有 + 5 新增）。timeline v2 五字段 + 三态 + seek + active marker 语义已由独立子 agent 复核 live repo 确认（含渲染层裁定「未匹配→无 active 不回退首项」代码路径抽查）。

Closure Audit Evidence:

- Auditor / Agent: mission-driver fresh sub-agent `ses_02fe894b8ffeZ1OugDo16g4WGL`（独立 closure-audit session）
- Evidence: 对照 plan 全部 3 Phase 逐项核验 live repo（schemas.ts/process-display-definitions.ts/timeline-renderer.tsx/单测/demo/e2e/docs），focused `timeline-renderer.test.tsx` 17/17 重跑通过；verdict `approved`（0 Blocker/Major，2 Minor 收口于本 closure：roadmap 前置声明与 Plan Status 翻转同步、daily log 记录）；详见 `docs/logs/2026/08-05.md` timeline v2 节

Follow-up:

- 无剩余 plan-owned work。播放引擎/组件句柄/item region 均为 Non-Goals（design §2 不采纳行），如未来出现第三个同族消费者（value 解析链）再提升 flux-core 共享 resolve helper。
