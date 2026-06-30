# B5.2 tabs/dynamic-renderer/chart 契约

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/components/amis-bug-driven-improvement-roadmap.md` B5.2；signal docs `09-layout-surfaces.md` (L6/L8/L9/L14/L16)、`10-data-display.md` (DD1/DD2/DD3/DD8/DD12/DD13)、`12-i18n.md` (I2/I3/I4)
> Related: predecessor B4.1（已 done）+ B6.1（本 plan 依赖 B6.1 的 action-graph 目标解析落地；B6.1 plan: `2026-06-26-1030-2-b61-...md`）；同 wave B5.1（surface/markdown/remote-schema i18n I1，独立）。successor：本工作项裁定产出的 candidate future（runtime reactive locale 全量接线、iframe host 集成）归 roadmap B7。

## Purpose

把 B5.2 的 14 条 signal 收口：修复两处确认 contract drift / styling 违背（tabs candidate-fix 实现与 design 分歧 L8；card media 硬编码几何 L14）；裁定 iframe 为 notRetained（L16）与 runtime reactive locale（I4）边界；暴露 `t()` 为 formula 表达式（I3 裁定 A）；对其余已落地行为补 owner doc 显式化 + 聚焦回归锚。

## Current Baseline

> 经 live repo 核对（独立 sub-agent explore + 主 agent 复核关键 file:line）。

- **L6（drawer inner overlay）— ALREADY-SATISFIED（按构造）+ TEST-GAP。** inner overlay（Base UI Popover/Select）独立 portal 到 document root，不写 `position` 到 DrawerContent（`packages/ui/src/components/ui/drawer.tsx:75-88,116-224`；`packages/flux-react/src/dialog-host.tsx:453-543`）；flux 无路径把 inner overlay 几何写到 drawer host。无回归锚（`dialog-host*.test.tsx` mock 掉 DrawerContent）；`docs/components/drawer/design.md` §10 无该声明。
- **L8（tabs items candidate-fix）— GENUINE-GAP（contract drift：impl ≠ doc）。** items 对 scope reactive（`tabs.tsx:120`），但 active 解析 `activeIndex = Math.max(0, items.findIndex(...))`（`tabs.tsx:141-144`）——当 active key 被移除时 `findIndex=-1` → 静默 clamp 到 0；`useOwnedAxisValue` 无 candidate-fix（`interaction-owner.ts:38-43`），`ownedAxis.value` 保持 stale。**design doc §10 明确写了 candidate-fix 规则**（keep key → nearest right → nearest left → empty，`tabs/design.md:282-293`）。无测试。→ impl 与已文档化契约不一致 = 确认 contract drift。
- **L9（mountOnEnter/unmountOnExit owner lifecycle）— PARTIAL。** keepMounted 门控实现（`tabs.tsx:95-115,316-326`，`resolveTabKeepMounted`）；但「inner-owner lifecycle init（chart/source 首次进入加载；form-owner unmountOnExit 重挂无重复 subscriber）」未显式保证，依赖 React unmount/remount。无 L9 测试（既有 `basic-tabs-behavior.test.tsx:86-133` 测的是默认 keepMounted draft 保留，相反路径）；`tabs/design.md:39-48` 有决策但无 regression 契约声明。
- **L14（card media className）— GENUINE-GAP（styling-system 违背）。** `<img ... className="aspect-video w-full object-cover" />` 硬编码（`packages/flux-renderers-content/src/card.tsx:46`），schema 无 `imageClassName`/media-class 字段（`schemas.ts:52-69`、`content-renderer-definitions.ts:104-113`）。作者无法经 className 控制图片尺寸——renderer 硬编码几何覆盖作者意图，违反 styling-system 契约。无测试；`card/design.md` 无声明。
- **L16（iframe listener + clone-safety）— N/A by design。** flux 无 iframe renderer（`grep` 零源码匹配）；`iframe` 显式标 notRetained / host-specific（`docs/components/amis-baseline-matrix.md:291`、`docs/references/naming-conventions.md:84`）。无 `docs/components/iframe/design.md`。signal 假设的 renderer 不存在 → 无 flux-package 落点。
- **DD1（chart empty state）— ALREADY-SATISFIED + tested。** `isEmpty` + `emptyContent`（`chart-renderer.tsx:149-153,412-414`），`sanitizeSeries`/`isChartDatum` 不抛（`:55-92`）。测试 `chart-renderer.unit.test.tsx:137-143`、`data-chart-handles.test.tsx:46-68`。`chart/design.md` §6/§11 部分声明，未显式「never error」硬契约。
- **DD2（chart in-place update）— ALREADY-SATISFIED（默认）+ 无测试。** 数据经 prop 流（`chart-renderer.tsx:457-459`），无 key-remount；recharts `ResponsiveContainer` 默认 in-place。但 chart 测试 mock 掉 recharts（`chart-renderer.unit.test.tsx:95-110`、`chart-responsive.test.tsx:71-86`），未断言容器 identity 稳定。`chart/design.md` 无 in-place 声明。
- **DD3（chart height/no min-size）— ALREADY-SATISFIED + 强测试。** `height = props.props.height ?? 400`（`chart-renderer.tsx:147`），mobile ceiling `:211-216`，无 min-size。测试 `chart-responsive.test.tsx:133-246`。`chart/design.md` §10/§13 覆盖。
- **DD8（markdown reactivity）— ALREADY-SATISFIED（按构造）+ 无测试。** `content` 为 `kind:'prop'`（`content-renderer-definitions.ts:171-175`），经 propsProgram reactive 于 scope（`markdown.tsx:13-16`）。无「mutate scope → rendered HTML 更新」测试；`markdown/design.md` 无 reactivity 声明。
- **DD12（dynamic-renderer live scope）— ALREADY-SATISFIED + 强测试。** prop channel reactive 读 live scope（`dynamic-renderer.tsx:72-89`，注释 `:72-79`）；reactive reload keyed on `loadActionKey`（`:171-178`）。测试 `basic-dynamic-renderer.test.tsx:196-264`。`dynamic-renderer/design.md` §5/§7 部分（live-scope 在代码注释非 doc prose）。
- **DD13（dynamic-renderer lexical/per-instance）— PARTIAL。** 经 `useCurrentComponentRegistry`（owner-scoped，`dynamic-renderer.tsx:70,216,241`）按构造满足；无「两同名 instance 不碰撞 / row-scope 内读 row scope」聚焦测试（`basic-dynamic-renderer.test.tsx:524-575` 测的是 cache dedup，相反轴）。`dynamic-renderer/design.md` §12 无显式 lexical/per-instance 声明。
- **I2（no baked-in literals）— PARTIAL。** `t()` 广泛使用（100+ `.tsx`），bundles 完整（`flux-i18n/src/locales/zh-CN.ts`、`en-US.ts`）；但无 exhaustive 审计/lint 证明零 baked-in 用户可见字面量；notify title 渲染 defer 到 host。无 leak-guard 测试；**无任何 i18n owner design doc**。
- **I3（bundles + `t()` expr + params）— PARTIAL → GAP（expr 轴）。** external bundles `addResources`（`i18n.ts:127-133`）、`t(key,params)`（`:122-125`）、参数化插值已满足+已测（`i18n-contract.test.ts:115-136`）。**`t()` 未注册为 formula builtin**（`flux-formula/src/builtins.ts:68-187` 无 `t`；`getMessageFormatter` 唯一消费者为校验消息 `validation/message.ts:9`）→ schema 内 `${t('key',{name})}` 不可用。无 expr 测试；无 doc。
- **I4（locale reactive both directions）— GENUINE-GAP。** `useFluxTranslation` hook 存在且 reactive（`flux-i18n/src/hooks.ts:4-7`），**但全仓 renderer 零使用**（`grep useFluxTranslation|useTranslation` in `*.tsx` = 无匹配）；所有 renderer 用普通非 reactive `t()`（`import { t }`）。→ locale 切换不重渲染已挂载组件，已显示字符串不重解析（双向均不成立）。无 React-render 往返测试；无 doc。

## Goals

- L6：补 drawer inner-overlay portal 不污染 host 的回归锚 + owner doc 声明。
- L8（Fix）：实现 tabs candidate-fix（与 design §10 契约对齐），补 failing-test-first 回归锚。
- L9：补 mountOnEnter/unmountOnExit inner-owner lifecycle 回归锚 + owner doc regression 契约声明。
- L14（Fix）：为 card media 增加作者 className 通道，移除覆盖作者意图的硬编码几何，补回归锚 + owner doc 声明。
- L16：裁定 iframe 为 notRetained（N/A），owner doc 记录排除。
- DD1：owner doc 显式「never error」空态硬契约（行为+测试已满足，复核）。
- DD2：owner doc in-place 声明 + 可行则补容器 identity 回归锚（recharts 当前被 mock，记 feasibility）。
- DD3：复核已满足（强测试在），owner doc 已覆盖。
- DD8：补 markdown scope reactivity 回归锚 + owner doc 声明。
- DD12：复核已满足（强测试在）+ owner doc 把 live-scope 写进 prose。
- DD13：补 dynamic-renderer lexical/per-instance 不碰撞回归锚 + owner doc 声明。
- I2：新建 i18n owner design doc + leak-guard（lint/测试）。
- I3（Fix，裁定 A）：暴露 `t()` 为 formula builtin（经 `getMessageFormatter` sink），使 schema 内 `${t('key',{params})}` 可用，补回归锚 + owner doc。**Scope 论证（为何在「测试/文档边界债」roadmap 内 Fix 而非 successor）**：signal I3 把 `t(key,params)` 表达式视为 Message API 的**已声称 P1 属性**（`12-i18n.md:27` DESIGN-GAP「Message API supports ... a `t(key, params)` expression/filter」）；而 `getMessageFormatter` sink **已存在**（`flux-core/src/i18n-sink.ts`，export 于 `flux-core/src/index.ts:67`，layering 安全：flux-formula 已依赖 flux-core），唯一生产消费者是校验消息（`validation/message.ts:9`）。故本 Fix 是**接通既有机制到表达式层**（非新建基础设施），且对未实现属性做 doc-「确认」是不诚实的——裁定 A（实现）是诚实收口。若独立审阅/产品认定这是越界新功能，则降级为 successor（但那样 schema 本地化将无可达路径，本身也是 contract gap）。
- I4（裁定 B）：裁定 runtime renderer 字符串的 locale 全量 reactive 重渲染为 Loader/host re-mount 职责（DESIGN-ACK），owner doc 显式化边界 + 锁既有 `useFluxTranslation` hook，successor 记全量接线。若审阅/产品判定 reactive locale 是硬需求，升级裁定 A（successor）。

## Non-Goals

- 不实现 iframe renderer（notRetained / host 集成）。
- 不做 I4 的全量 renderer reactive `t()` 接线（裁定 B + successor；涉及 100+ renderer 文件的架构性改动）。
- 不实现 amis echarts / markdown-editor 第三方 popup z-index（DD11 等 P2，归 B7）。
- 不覆盖 B5.1（surface/markdown src/remote-schema i18n I1）或 B6.x 信号。
- 不重写 chart recharts 集成或 unmock 全部 chart 测试（DD2 feasibility 内处理）。

## Scope

### In Scope

- L6 回归锚 + doc；L8 Fix candidate-fix + 测试 + doc；L9 回归锚 + doc；L14 Fix media className 通道 + 测试 + doc；L16 裁定 + doc。
- DD1/DD2/DD3/DD8/DD12/DD13：复核 + 回归锚（可行）+ doc 显式化。
- I2：i18n owner doc + leak-guard；I3：`t()` formula builtin Fix + 测试 + doc；I4：裁定 B + doc + hook 锁。

### Out Of Scope

- iframe renderer 实现；I4 全量 reactive 接线；echarts/markdown-editor P2（DD11 等）；B5.1/B6.x 信号。

## Failure Paths

> 本计划含两处 Fix（L8/L14）+ 一处 Fix（I3）+ i18n 裁定。涉及渲染行为，列出可测失败路径：

| 场景编号          | 触发                                      | 预期行为（Fix 后）                                                              | 可重试 | 用户可见表现                            |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------- | ------ | --------------------------------------- |
| L8-active-removed | `items:"${tabs}"` 数组移除当前 active key | candidate-fix：keep → nearest right → nearest left → empty（非静默 clamp 到 0） | 否     | 切到合理相邻 tab 或空态，不卡在 index 0 |
| L14-media-class   | card `image` + 作者 `imageClassName`      | 作者 className 控制尺寸，renderer 不用硬编码 `w-full aspect-video` 覆盖         | 否     | 图片尺寸符合作者意图                    |
| I3-t-expr         | schema 内 `${t('greeting',{name})}`       | 经 message-key 解析为当前 locale 文案，参数插值正确                             | 否     | 渲染本地化字符串（非原始 key、非报错）  |
| I4-locale-flip    | 已挂载页面切换 locale zh→en→zh            | （裁定 B）当前不自动重渲染；须 host/loader re-mount；owner doc 显式化该边界     | 否     | 文案不自动变（已知边界）；re-mount 后变 |

## Test Strategy

本档选择：**建议有测**（Fix 项 L8/L14/I3 必须 failing-test-first 自动化）。

- L8（P1 Fix，contract drift）、L14（P1 Fix，styling 违背）、I3（裁定 A Fix）：必须自动化——**failing test 先行**（先写复现失败用例，再实现，再转绿）。
- L6/L9/DD1-DD3/DD8/DD12/DD13/I2（P1 锁/doc）：建议有测——聚焦回归锚（验证正确结果）。
- L16（N/A）、I4（裁定 B doc-only）：不适用（无 runtime 测试，按裁定锁定）。

## Execution Plan

### Phase 1 - 布局与表面契约（L6/L8/L9/L14/L16）

Status: completed
Targets: `packages/flux-renderers-basic/src/tabs.tsx`、`interaction-owner.ts`、`packages/flux-renderers-content/src/card.tsx`、`schemas.ts`、`content-renderer-definitions.ts`、`docs/components/tabs/design.md`、`card/design.md`、`drawer/design.md`、相关 `__tests__/`

- Item Types: `Fix | Proof | Decision`

- [x] (Proof-first, L8) 先写复现失败用例：`items:"${tabs}"`，active=`b`，mutate 数组移除 `b` → 断言 candidate-fix（keep→nearest right→nearest left→empty）而非 clamp 到 index 0 / stale `b`。本 plan 的 L8 Fix 范围限定为「**removed** item（active key 从 items 数组消失）」；`tabs/design.md:293` 的「hidden（item-level `visible/hidden` meta）」是相邻但独立维度，若执行期核对 items 仍承载可见性 meta 且 candidate-fix 应覆盖 hidden，则并入同一 Fix，否则 hidden 归 Non-Blocking Follow-ups（避免 scope 失控）。
- [x] (Fix, L8) 实现 candidate-fix：当前 `tabs.tsx:141-144` 仅派生 `activeIndex`（`Math.max(0, findIndex)`），`ownedAxis.value`（`interaction-owner.ts:38-43`）保持 stale，导致 `<Tabs value={staleKey}>` 无内容渲染。Fix 须**写回修正后的 value**（而非仅派生 index）：当 `ownedAxis.value` 不在 items 时按 §10 规则算出目标 value，经 `ownedAxis.setValue` 写回（local→setLocalValue / scope→renderScope.update / controlled 由外部驱动，controlled 下若 bound expr 仍指向已移除 key 则保持 controlled 契约不自动改写——仅 local/scope 主动修正）。写回须避免渲染循环：用「value 与 items 不匹配」作为触发条件，修正后即匹配、不再触发（幂等）。与 `tabs/design.md:282-293` 契约对齐。
- [x] (Proof-first, L14) 失败用例：card `image` + `imageClassName:"w-60 h-48 object-cover"` → 断言计算尺寸符合作者类（非硬编码 auto/w-full）。
- [x] (Fix, L14) 为 card media 增加作者 className 通道（如 schema `imageClassName?: string`，`schemas.ts` + `content-renderer-definitions.ts` 加字段），`card.tsx:46` 用 `cn(default, imageClassName)` 合并（保留合理默认，作者 className 可覆盖）；移除「覆盖作者意图」语义。
- [x] (Proof, L6) drawer 内开 popover/select 回归锚：DrawerContent computed `position` + bounding box 在 inner overlay 开/关前后不变（若 mock 阻碍真实断言，用 jsdom getComputedStyle 或 effect spy）。
- [x] (Proof, L9) mountOnEnter/unmountOnExit 回归锚：(a) `mountOnEnter:true` + inner source → 切入触发加载+渲染（无空白）；(b) `unmountOnExit:true` → 切离再回 → inner owner 干净重初始化（subscriber 计数无累积）。
- [x] (Decision, L16) 裁定 iframe notRetained：owner doc（`amis-baseline-matrix.md:291` 已记录；若需 `docs/components/` 下显式排除说明，补一段）声明「iframe 非 flux retained renderer，listener/clone-safety 属 host 集成职责」。
- [x] (Decision) owner doc 显式化：`drawer/design.md` §10 加 L6 声明；`tabs/design.md` §2 加 L9 regression 契约声明；`tabs/design.md` §10 candidate-fix 在 L8 Fix 落地后改为**定言**（当前 `:286` 措辞「建议规则」须改为最终设计陈述，符合 Rule 14「design doc 只写最终状态」）；`card/design.md` 加 L14 media className 契约。

Exit Criteria:

- [x] L8 candidate-fix 已实现，failing-first 用例转绿；行为与 `tabs/design.md:282-293` 一致。
- [x] L14 media className 通道已实现，failing-first 用例转绿；renderer 不再用硬编码几何覆盖作者意图。
- [x] L6/L9 回归锚存在并绿。
- [x] L16 裁定 + owner doc 记录；`drawer/design.md`/`tabs/design.md`/`card/design.md` 声明与 live 一致。

### Phase 2 - 数据展示契约（DD1/DD2/DD3/DD8/DD12/DD13）

Status: completed
Targets: `packages/flux-renderers-data/src/chart-renderer.tsx`、其 `__tests__/`、`packages/flux-renderers-content/src/markdown.tsx`、其 `__tests__/`、`packages/flux-renderers-basic/src/dynamic-renderer.tsx`、其 `__tests__/`、`docs/components/chart/design.md`、`markdown/design.md`、`dynamic-renderer/design.md`

- Item Types: `Proof | Decision`

- [x] (Proof, DD8) markdown scope reactivity 回归锚：`content:"${md}"`，mutate scope `md` → rendered HTML 更新（非 mount snapshot）。
- [x] (Proof, DD13) dynamic-renderer lexical/per-instance 回归锚：(a) row/surface scope 内的 dynamic-renderer 读 row scope 非 page root；(b) 两同名 componentId instance 定向其一不影响另一。
- [x] (Proof, DD2-feasibility) 评估 chart 容器 identity 回归锚可行性：当前 chart 测试 mock recharts（`chart-renderer.unit.test.tsx:95-110`）。若可在不 unmock 全量 recharts 的前提下断言「数据更新不 remount」（如 spy ResponsiveContainer children identity），补锚；否则记 watch-only（行为按构造满足），owner doc 仍声明 in-place 契约。
- [x] (Proof, DD1) 复核既有空态测试（`chart-renderer.unit.test.tsx:137-143`）覆盖 `[]`/null/undefined；如缺 `undefined`/`null` 分支则补。
- [x] (Decision) owner doc 显式化：`chart/design.md` 加 DD1「explicit empty state，never error」+ DD2「in-place update，no remount/flash」声明（DD2 须注明「**by construction**：数据经 prop 流、无 key-remount；recharts `ResponsiveContainer` 默认路径」，因 chart 测试 mock recharts，非测试验证的保证，DD3 §10/§13 已覆盖）；`markdown/design.md` 加 DD8 reactivity 声明（content 经 `kind:'prop'` reactive）；`dynamic-renderer/design.md` 把 live-scope（代码注释 `:72-79`）写进 §5/§7 prose + 加 DD13 lexical/per-instance 声明。

Exit Criteria:

- [x] DD8/DD13 回归锚存在并绿。
- [x] DD1 复核通过（`[]`/null/undefined 空态）；DD2 feasibility 已裁定（锚 or watch-only + 理由）。
- [x] `chart/design.md`/`markdown/design.md`/`dynamic-renderer/design.md` 声明与 live 一致，无「Proposed vs Current」叙事。

### Phase 3 - i18n 契约（I2/I3/I4）

Status: completed
Targets: `packages/flux-i18n/`、`packages/flux-formula/src/builtins.ts`、`packages/flux-core/src/i18n-sink.ts`、新建 i18n owner doc、相关 `__tests__/`

- Item Types: `Fix | Proof | Decision`

- [x] (Proof-first, I3) 失败用例：schema 内 `${t('flux.common.noData')}`（或外部 key + params）经 formula 解析 → 当前 locale 文案（失败：`t` 未注册为 formula builtin）。
- [x] (Fix, I3) 暴露 `t()` 为 formula builtin：在 `flux-formula/src/builtins.ts` 注册 `t(key, params?)` 调用 `getMessageFormatter()`（来自 `flux-core/i18n-sink.ts`，layering 安全：flux-formula 已依赖 flux-core，见 `flux-formula/package.json:16`）；params 透传 i18next 插值。复核不破坏既有 sink 消费者（校验消息 `validation/message.ts:9`）。**Scope 论证见 Goals（I3）**：接通既有 sink 到表达式层、对已声称属性诚实落地，非新基础设施、非 feature-smuggling。
- [x] (Proof, I2) leak-guard：补一个聚焦断言/或 lint 规则雏形，防止 renderer 新增绕过 `t()` 的用户可见字面量（至少覆盖一个 high-surface renderer 默认字符串经 registry）；notify title defer host 的事实记 doc。
- [x] (Decision, I4) 裁定 runtime reactive locale 边界：当前 renderer 用普通 `t()`（非 reactive），locale 切换不自动重渲染已挂载字符串——裁定为 DESIGN-ACK（runtime renderer 字符串的 locale 全量 reactive 重渲染属 Loader/host re-mount 职责，引 `frontend-programming-model.md:116`）。**显式记录 signal 重分类**：signal `12-i18n.md:28` 把 I4 triage 为 `TEST-GAP`（声称属性成立、缺测试），但 live 证据证伪该声称——`useFluxTranslation` 存在且 reactive 且有测试（`hooks.ts:4-7`、`i18n.test.ts:77-101`），但**全仓 renderer 零使用**（grep `useFluxTranslation` 仅 5 处命中、全在 `flux-i18n/src`），故已挂载字符串不随 locale 重解析——I4 由 TEST-GAP 重分类为 DESIGN-ACK（非符合），锁既有 `useFluxTranslation` hook 契约。successor 记全量接线。若审阅/产品判定 reactive locale 是硬需求，升级裁定 A 为 successor plan。
- [x] (Decision) 新建 i18n owner design doc：声明 (1) message-key 半边契约（renderer `t()`，reactive 经 hook）；(2) `t()` formula 暴露（I3）；(3) locale 覆盖边界（I1 schema-string = Loader 层，引 B5.1；I4 runtime reactive = host re-mount，本裁定）；(4) I2 no-baked-in-literal 硬规则 + enforcement path。与 live（`i18n.ts`、`hooks.ts`、`builtins.ts` 新 `t`、`validation/message.ts:9`）一致。

Exit Criteria:

- [x] I3 `t()` formula builtin 已实现，failing-first 用例转绿；不破坏校验消息 sink。
- [x] I2 leak-guard 锚/规则存在；i18n owner doc 含 no-baked-in-literal 硬规则。
- [x] I4 裁定 DESIGN-ACK + owner doc 边界声明 + `useFluxTranslation` hook 锁定（测试在）。
- [x] 新建 i18n owner design doc 与 live baseline 一致。

## Draft Review Record

- Reviewer / Agent: fresh-session `general` sub-agent（独立复核，不复用起草上下文）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed:
  - **Round 1**（task `ses_0fe0ecf32ffe7kv5AxzYym4hiH`，`revised`，1 Major M1 + 6 Minor m1-m6）：
    - **M1（I3 缺 scope 论证）**：已补 Goals I3 scope 论证段（signal `12-i18n.md:27` 视 `t()` expr 为已声称 P1 属性；sink `getMessageFormatter` 已存在于 `flux-core/src/i18n-sink.ts:28`、export `flux-core/src/index.ts:67`；flux-formula 已依赖 flux-core `package.json:16`；唯一生产消费者 `validation/message.ts:9`）+ Phase 3 Fix item 指针。对未实现属性 doc-「确认」不诚实，故裁定 A（实现）是诚实收口。
    - **m1** L14 改为 Proof-first → Fix 顺序（`plan:98-99`）。
    - **m2** L8 Fix 补 write-back 机制（经 `ownedAxis.setValue`，local/scope/controlled 矩阵，match 触发幂等避免循环）+ removed vs hidden 范围界定（hidden 归 Non-Blocking Follow-ups）。
    - **m3** L8 owner doc item 把 `tabs/design.md:286`「建议规则」改定言（Rule 14）。
    - **m4** I4 显式记录 signal 重分类（`12-i18n.md:28` TEST-GAP → DESIGN-ACK，`useFluxTranslation` 存在+reactive+tested 但全仓 renderer 零使用）。
    - **m5** 文件名 typo `data-chart-handle` → `data-chart-handles`。
    - **m6** DD2 owner doc 改「by construction（数据经 prop 流、无 key-remount），非测试验证（recharts mocked）」。
  - **Round 2**（task `ses_0fdf866b7ffeUSLTZcDe4R5o66`，`pass`）：M1 + m1-m6 全部确认解决；10 处 load-bearing 引用经 live 核对准确（i18n-sink/export、flux-formula 依赖 flux-core、tabs clamp+无 write-back、design.md §10、零 renderer `useFluxTranslation`、builtins 无 `t`、card.tsx:46 硬编码）；L8/L14 Fix 判定 warranted（confirmed contract drift / styling 违背，非 over-engineering）；B5.2 保持单 plan（14 signal 共享 owner-doc 家族 + 统一 closure，208 行远低于阈值）。

## Closure Gates

- [x] L8 candidate-fix 已实现（与 `tabs/design.md` §10 一致）+ failing-first 回归锚绿。
- [x] L14 card media className 通道已实现 + failing-first 回归锚绿（无硬编码几何覆盖作者意图）。
- [x] L6/L9 回归锚绿；L16 iframe notRetained 裁定 + doc。
- [x] DD8/DD13 回归锚绿；DD1 复核通过；DD2 feasibility 裁定（锚 or watch-only + 理由）。
- [x] DD1/DD2/DD3/DD8/DD12/DD13 owner doc 显式化与 live 一致。
- [x] I3 `t()` formula builtin 已实现 + failing-first 回归锚绿。
- [x] I2 i18n owner doc + leak-guard；I4 裁定 DESIGN-ACK + doc + hook 锁。
- [x] 不存在被静默降级的 in-scope live defect 或 contract drift（L8/L14/I3 为 Fix 非 deferred；L16/I4 为裁定 + successor，附 non-blocking 理由）。
- [x] 受影响 owner docs（`tabs/design.md`、`card/design.md`、`drawer/design.md`、`chart/design.md`、`markdown/design.md`、`dynamic-renderer/design.md`、新建 i18n doc）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（55/55 tasks 成功）
- [x] `pnpm build`（29/29 tasks 成功）
- [x] `pnpm lint`（含 check-i18n-keys / renderer-fields / finite-prop-contracts 全通过）
- [x] `pnpm test`（55/55 packages 全绿；vitest 单元/集成套件）

## Deferred But Adjudicated

### iframe renderer / listener + clone-safety（L16）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: flux 无 iframe renderer（`grep` 零源码）；`iframe` 显式 notRetained / host-specific（`amis-baseline-matrix.md:291`）。listener 累积 / clone-safety 是 host 集成职责，无 flux-package 落点。
- Successor Required: `no`（host 集成；若未来 flux 引入 iframe renderer 再评估）。

### runtime renderer 字符串 locale 全量 reactive 重渲染（I4）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 当前 renderer 用普通非 reactive `t()`（`grep` 全仓 renderer 零 `useFluxTranslation`）；全量接线涉及 100+ renderer 文件架构性改动，超出本「测试/文档边界债 + 裁定」plan。架构将 i18n 归 Loader/host 层（`frontend-programming-model.md:116`）。既有 `useFluxTranslation` hook 已提供 reactive 路径供需要者 opt-in，本 plan 锁定其契约。
- Successor Required: `yes`（若产品判定 reactive locale 是硬需求，开 successor plan 做全量接线或 Loader 层 re-mount 策略）。
- Successor Path: `docs/components/amis-bug-driven-improvement-roadmap.md` B7（或独立 feature plan）。

## Non-Blocking Follow-ups

- DD2 chart 容器 identity 回归锚若因 recharts mock 不可行，记 watch-only（行为按构造满足）；后续若 unmock recharts 可补真实断言。
- DD11（rich-text editor in-surface z-index）等 P2 信号归 B7。

## Closure

Status Note: 三 Phase 全部执行完成。L8（tabs candidate-fix，contract drift）+ L14（card media className，styling 违背）+ I3（`t()` formula builtin）三处 Fix 均以 failing-test-first 落地转绿；L6/L9/DD1/DD2/DD8/DD13 回归锚补齐（DD2 因 recharts mock 锁定 by-construction + 宿主节点稳定性可测锚）；L16（iframe notRetained）/I4（reactive locale DESIGN-ACK，signal 重分类 TEST-GAP→DESIGN-ACK）裁定 + owner doc 显式化；新建 `docs/components/i18n/design.md` owner doc。workspace typecheck/build/lint 全绿、`pnpm test` 55/55 packages 全绿（vitest 单元/集成套件；e2e/Playwright 未在本次执行范围）。独立 fresh-session closure-audit 待执行（执行 session 不自审）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session general sub-agent (closure audit)（独立复核，不复用执行 session 上下文）
- Evidence: 独立复跑验证——`pnpm test`（flux-formula 190/190、flux-react 436/436、flux-renderers-data 589/589、flux-renderers-basic 405/405、flux-renderers-content 169/169 全绿）；`pnpm --filter @nop-chaos/flux-formula typecheck` + `@nop-chaos/flux-renderers-content typecheck` 通过；`node scripts/check-i18n-keys.mjs` ✅ passed。三处 Fix 源码 live 核对——L8 `tabs.tsx:49-77` `resolveCandidateValue`（keep→nearest-right→nearest-left→empty）+ `:176-187` 幂等写回 effect（controlled 跳过、local/scope 经 `ownedAxis.setValue`、value 匹配后不再触发）；`tabs-candidate-fix.test.tsx` 断言 5 场景（keep/nearest-right/nearest-left/empty/controlled-no-rewrite）。L14 `schemas.ts:67` + `content-renderer-definitions.ts:111` + `card.tsx:50` `cn('aspect-video w-full object-cover', slotProps.imageClassName)`；`card.test.tsx:52`。I3 `builtins.ts:197-200` `t` builtin 调 `getMessageFormatter()`（call-time 读取）；校验 sink 未破坏（`flux-runtime/src/validation/message.ts:9` 仍用 `getMessageFormatter()`）；`builtins.test.ts:185-218`（expr + params + identity fallback）。doc↔code 一致性——`tabs/design.md:297` §10 定言「最终设计（已落地，L8 Fix）」；`chart/design.md:60` DD2「按构造成立…非测试验证…recharts mocked」；`docs/components/i18n/design.md` 存在（§5 I4 重分类 TEST-GAP→DESIGN-ACK、§6 no-baked-in-literal 硬规则）；回归锚 `chart-renderer.unit.test.tsx:165`(DD2 host-node stability) + `:210`(I2 leak-guard)。roadmap `amis-bug-driven-improvement-roadmap.md:46,126` B5.2=`done`。无静默降级缺陷（L8/L14/I3=Fix 已落地；L16/I4=Decision 附 successor/non-blocking 理由）。Minor（不阻断）：`markdown-reactivity.test.tsx` 实际位于 `flux-renderers-content/src/`（非 `__tests__/`，文件确实存在）；plan baseline 的 `validation/message.ts:9` 实际属 flux-runtime 包（行号/内容准确，pre-existing 路径 imprecision，非本 plan 改动）。

Follow-up:

- _待收口后填写（候选：iframe host 集成、I4 reactive locale 全量接线 → successor B7；DD2 真实断言 watch-only）_
