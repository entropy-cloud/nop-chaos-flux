# 668 Mobile M10 列表导航组计划

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/components/mobile-native-components-roadmap.md` M10（M10a IndexBar 字母索引 / M10b ScrollMask 渐隐增强）；交互基线 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.5（tdesign indexes 非 passive touchmove/elementFromPoint 定位）
> Related: `docs/plans/664-mobile-m6-gesture-infrastructure-plan.md`（M6 底座）、`docs/plans/667-mobile-m9-image-signature-plan.md`

## Purpose

交付列表导航两能力：M10a `index-bar`（字母/键索引侧栏：touch 定位 + 锚点跳转 + 当前键高亮）为新增 mobile 渲染器；M10b ScrollMask 渐隐（横向滚动容器两端「还有内容」提示）——roadmap 裁定通用件落 ui/basic 层不占 mobile 包红线，本计划以 **ui 层 `useScrollMask` hook + `ScrollMask` 组件**交付（消费方示例接 tabs/横向滚动容器）。

## Current Baseline

- M6–M9 已落地（commits 249821d7f/09c177080/9922a1e21/bd52f420c）；包测试基线 mobile 32 文件/362 用例、ui 73 文件/366 用例全绿；定义面 14 类型（MM-11 钉死）。
- 无任何 index-bar / scroll-mask 既有代码（grep 零命中）。
- IndexBar 锚点定位依赖容器滚动：`scrollIntoView` 原生 API + 当前键 state。

## Goals

- **M10a `index-bar`**：`IndexBarSchema`（items `{label, value}[]`，渲染为右侧字母侧栏）+ 交互：touch 在侧栏上滑动时以 `elementFromPoint` 定位当前键（非 passive touchmove），松手/滑动中经 `onSelect`/`onChange` 派发锚点值；当前键高亮 + 中央气泡提示；`scrollIntoView` 联动目标容器（`targetSelector` schema 字段可选联动）。**roadmap M10a「sticky 顶推 transform / 从尾向头锚点定位」两子句裁定**：sticky 顶推 = 列表容器样式职责（`position: sticky` 由消费列表 schema 自行声明），index-bar 不注入；「从尾向头」= 定位方向细节，v1 按键序正向定位（两者均登记 Deferred：sticky 顶推 `out-of-scope improvement`、方向性 `watch-only`）；roadmap M10 行勘误将就地注记这两子句。
- **M10b ScrollMask（ui 层）**：`useScrollMask` hook（`packages/ui/src/hooks/use-scroll-mask.ts`）——检测滚动容器两端是否可滚（scrollLeft 0/max），输出 `{ startMask, endMask }` 布尔；`ScrollMask` 组件（渐隐遮罩渲染，纯展示）。演示页以横向滚动容器消费示例。
- MM-11 演进（14→15）+ playground `/m10-list-navigation` + e2e。

## Non-Goals

- 不做虚拟滚动/超长列表性能优化。
- ScrollMask 不做移动端专属手势（纯滚动状态检测，桌面/移动通用）。
- 不改 form 包组件。

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/`：`index-bar.tsx` + 测试、schemas/extended 注册/导出/styles。
- `packages/ui/src/hooks/use-scroll-mask.ts` + `packages/ui/src/components/ui/scroll-mask.tsx` + 测试 + index 导出（Protected Area ask-first 凭据链 = roadmap 头部 2026-10-19 人确认指令 + roadmap M10b 行「通用件落 ui/basic 层」归属 + 本 plan + draft review——CX-16/plan 596 ui index 先例同口径；执行改动 index.ts 的 item 引用本条）。
- `docs/components/index-bar/design.md`、`docs/components/scroll-mask/design.md`。
- playground 演示页 + e2e。

### Out Of Scope

- flux-renderers-form/ui 之外包的改动；虚拟滚动。

## Failure Paths

| 可测场景编号            | 触发                  | 行为                                                                      | 可重试   | 用户可见表现  |
| ----------------------- | --------------------- | ------------------------------------------------------------------------- | -------- | ------------- | ---------- |
| `indexbar-touch-locate` | 侧栏 touchmove        | elementFromPoint/几何定位当前键 + 高亮 + onChange                         | 是       | 键高亮跟随    |
| `indexbar-empty-items`  | items 空              | 侧栏不渲染                                                                | 是       | 空态          |
| `mask-boundary-flip`    | scrollLeft 0↔max      | start/end mask 布尔翻转                                                   | 是       | 渐隐出现/消失 |
| `mask-single-axis`      | 垂直容器              | 轴向 prop 'x'                                                             | 'y' 生效 | 是            | 对应轴渐隐 |
| `indexbar-target-miss`  | targetSelector 未命中 | scrollIntoView no-op 不抛错，onChange 仍派发                              | 是       | 侧栏高照常    |
| `indexbar-target-hit`   | targetSelector 命中   | 命中元素 `scrollIntoView({ block: 'start' })`（浏览器原生滚全部可滚祖先） | 是       | 列表滚至锚点  |

## Test Strategy

档位选择：**必须自动化**（定位几何与滚动状态检测是正确性契约）。

## Execution Plan

### Phase 1 - M10a index-bar

Status: completed
Targets: `packages/flux-renderers-mobile/src/{index-bar}.{tsx}`、`index-bar.test.tsx`、schemas/extended 注册、MM-11（14→15）

- Item Types: `Proof`、`Fix`

- [x] Proof: `index-bar.test.tsx` 先行——touch 定位（**stub `document.elementFromPoint`** 返回带 data-index 的键元素——calendar-drag-drop-visual.test.tsx:106 先例；happy-dom elementFromPoint 恒 null、键 rect 全 0，几何数学不可行）→ data-active 高亮 + onChange payload `{type:'select', value, label, index}`、空 items 不渲染、disabled 冻结、`scrollIntoView` 联动 spy
- [x] Fix: `index-bar.tsx`——侧栏渲染（items 纵排）、非 passive touchmove + `document.elementFromPoint` 命中元素 `closest('[data-index-key]')` 解析当前键、当前键气泡（组件内局部 z-index，不入弹层栈——不消费 useGlobalZIndex/useLockScroll）、`IndexBarSchema` + 注册 + markers 契约注册（markers/dom-structure/event-and-i18n 契约测试同步）
- [x] Proof: MM-11 15 类型门禁

Exit Criteria:

- [x] `index-bar.test.tsx` 全绿；包测试零回归；MM-11 15 类型通过

### Phase 2 - M10b useScrollMask + ScrollMask（ui 层）

Status: completed
Targets: `packages/ui/src/hooks/use-scroll-mask.ts`、`packages/ui/src/components/ui/scroll-mask.tsx`、测试、index 导出

- Item Types: `Proof`、`Fix`

- [x] Proof: `use-scroll-mask.test.tsx` 先行（happy-dom 容器；布局值以**实例级** `vi.spyOn(element, 'scrollWidth'|'scrollLeft', 'get')` 模拟）——scrollLeft 0→startMask true、scrollLeft max→endMask true、内容不足双 false、轴向 prop
- [x] Fix: `useScrollMask(ref, axis: 'x'|'y')` hook（scroll + resize 监听）→ `{ startMask, endMask }`；`ScrollMask` 纯展示组件 props `{ startMask, endMask, axis, size? }`——DOM：`data-slot="scroll-mask"` + `data-axis` + `data-start`/`data-end`（e2e 断言通道），渐隐宽度经 `--nop-scroll-mask-size` CSS 变量；+ index 导出
- [x] Proof: `scroll-mask.test.tsx` 先行（happy-dom 容器，实例 `Object.defineProperty` 模拟 scrollWidth/scrollLeft/offsetWidth/offsetHeight/scrollLeft）——scrollLeft 0→startMask true、scrollLeft max→endMask true、内容不足双 false、轴向 prop 翻转断言

Exit Criteria:

- [x] 两测试文件全绿；ui 包零回归

### Phase 3 - 集成面：演示页、e2e、MM-11、roadmap 勘误

Status: completed
Targets: playground `/m10-list-navigation`、`tests/e2e/mobile-list-navigation.spec.ts`、roadmap M10 行勘误

- Item Types: `Fix`、`Proof`

- [x] Fix: 演示页（index-bar + 字母列表联动、横向滚动容器 + ScrollMask）
- [x] Proof: e2e——index-bar 触摸键定位（data-active 断言 + scrollIntoView 效果）、ScrollMask 边界翻转（CDP 横向滚动断言 data-start/data-end）、`setViewportSize` 冒烟
- [x] Fix: roadmap M10 行就地勘误（状态回写 + M10a sticky 顶推/从尾向头两子句 Deferred 注记 + M10b ui 层归属注记）——随收口提交

Exit Criteria:

- [x] e2e 全绿；局部 typecheck 通过（全量 `pnpm check` 归 Closure Gates）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass`（Round 3；R1 fail 3M+6m → R2 fail 1M 残留 → R3 修后 reviewer 预确认 pass）
- Rounds: 3
- Findings addressed:
  - R1-MAJ-1 测试环境声称错误（jsdom→happy-dom + notice-bar spy 先例）；MAJ-2 定位机制钉死 elementFromPoint stub + data-index 解析单通道；MAJ-3 roadmap 两子句就地裁定
  - R1-MIN-1~6 全部吸收（z-index 裁定、ScrollMask props 契约、scrollIntoView 契约 + 2 Failure Path 行、ask-first 链补全、契约测试注册、Phase 3 Exit 收窄）
  - R2-MAJ-1 残留 jsdom 措辞改 happy-dom + defineProperty；MIN-R1/R2/R3 顺手收敛

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope contract drifts 已收敛
- [x] 行为/契约结果已达成（Phase 1–3 Exit Criteria 全勾）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（index-bar/scroll-mask design.md + roadmap M10 行勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（对照既有红集合；零新增）

## Deferred But Adjudicated

### M10b 测试形态（hook 测试与组件测试分文件；组件级 value 通道简化）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `use-scroll-mask.test.tsx`（hook 5 用例，spyOn getter 模拟布局——happy-dom 容器，notice-bar 先例）与 `scroll-mask.test.tsx`（组件 data 属性 2 用例）分文件交付；组件级「value 通道」以 data 属性断言覆盖（data-start/data-end），与本计划 Failure Path 一致。
- Successor Required: `no`
- Successor Path: —

### sticky 顶推 transform（M10a 不注入）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: sticky 顶推是列表容器的样式职责（`position: sticky` 由消费列表 schema 自行声明）；index-bar 作为侧栏组件注入列表容器的 sticky transform 会耦合两个独立组件，违反组件边界。roadmap M10 行勘误时以注记记录该子句归属。
- Successor Required: `no`
- Successor Path: —

### 从尾向头锚点定位方向（v1 按键序正向定位）

- Classification: `watch-only`
- Why Not Blocking Closure: 定位方向是侧栏交互细节（键序正向 vs 反向视觉观感差异极小），v1 按键序正向定位功能完整；真机反馈出现方向性需求时再翻转实现（一行取反）。roadmap M10 行勘误时以注记记录。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- index-bar 虚拟列表联动；ScrollMask 渐变宽度动画曲线定制。

## Closure

Status Note: M10a–M10b 全部交付——index-bar（elementFromPoint + data-index 解析 + 几何 fallback + data-selected 持久通道 + scrollIntoView 联动）、ui 层 useScrollMask/ScrollMask（start/end 可滚状态检测 + data 属性渐隐）。13→15 定义面（index-bar +1、ScrollMask 走 ui 包非 renderer）。全量门禁：typecheck/build/lint 绿、test 82/82（mobile 33 文件 366 用例、ui 75 文件 373 用例）、check 唯一红 = 既有 knip xlang（master 同红）、e2e list-navigation 4/4。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），两轮：R1 `issues`（1 Blocker 字面色新红下虚假绿 + 1 Major zz-probe 遗留 + 1 Minor 组文本漂移）→ 回修 → R2 `approved`（附收口订正清单：plan Phase 2/3 Proof 措辞、baselines 尾引号与起点衔接、daily log 断尾修复、index-bar 头注释，全部随本提交载入）
- Evidence: R1 发现 index-bar.tsx 3 处字面色（#2563eb/#374151/#ffffff）未登记新红、zz-probe.spec.ts 调试探针遗留、plan 措辞四处漂移；回修后 R2 逐项亲证（ui-consistency 零新增、探针删除、包测试 33/366 绿），并如实记录三处回修报告与实况不符项（随生效条件 1-2 订正）。审计会话 id（agent_f82875cc-41c1-4e3b-b2d2-97d769f575b7）。
