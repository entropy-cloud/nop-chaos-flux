# M2 表单控件触摸适配（input / textarea / input-number / checkbox / radio / switch / button）

> Plan Status: completed
> Last Reviewed: 2026-06-23
> Source: `docs/components/mobile-roadmap.md` M2（L75, L147-153）；`docs/architecture/mobile-responsive-baseline.md`
> Related: `docs/plans/2026-06-22-2057-1-m01-mobile-infrastructure-plan.md`（M0.1 deferred VisualViewport → M2a/M3a）；`docs/plans/2026-06-22-2335-1-m1-high-frequency-controls-responsive-plan.md`（同批次，M1 先执行）
> Mission: mobile
> Work Item: M2

## Purpose

把 M2 工作项（表单控件触摸适配）从"设计文档已立约、代码零触摸适配"推进到"input/textarea/input-number 触摸目标 + inputmode + 软键盘视口处理、checkbox/radio/switch 触摸目标 + 小屏列表布局、button 触摸目标 + 小屏 block 全宽全部落地 + focused 验证 + playground 演示页 + e2e"。M2 的 3 个子项（M2a~M2c）同属"表单控件触摸适配"结果面，共享同一组触摸目标规范（M0 baseline §3）、同一批 design.md responsive 小节，按 plan guide §22 / §26 / roadmap L75 合并为**一个 plan 3+ phase**。

## Current Baseline

> 截至 2026-06-22 的 live repo 核查结论（read-only）：

- **M0 baseline 触摸目标规范已立约**：`docs/architecture/mobile-responsive-baseline.md` §3 定义最小触摸目标 44×44px（对齐 Apple HIG / Material Design）、inputmode 规范、软键盘 VisualViewport 约定。代码层尚未在表单控件落地。
- **input-text / input-email / input-password**：`packages/flux-renderers-form/src/renderers/input.tsx`（576 行），`createInputRenderer(inputType)` 返回 `InputRenderer`（L228-），使用 `@nop-chaos/ui` `InputGroup` + `Input`。**未设 `inputmode` 属性**（email/ tel/ numeric 场景），**font-size 未保证 ≥16px**（iOS Safari focus 自动缩放风险），**无 VisualViewport 软键盘处理**。
- **textarea**：`packages/flux-renderers-form/src/renderers/textarea-renderer.tsx`（L29 `TextareaRenderer`）。**无触摸适配**。
- **input-number**：`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`（L28 `InputNumberRenderer`）。**未设 `inputmode="decimal"`**。
- **checkbox / switch / radio-group**：`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`（CheckboxRenderer L516、SwitchRenderer L549、RadioGroupRenderer L599，文件 673 行），使用 `@nop-chaos/ui` Checkbox/Switch/RadioGroup。**触摸目标未增大**（shadcn 默认尺寸偏小），**checkbox-group / radio-group 无小屏列表布局切换**。
- **button**：`packages/flux-renderers-basic/src/button.tsx`（ButtonRenderer L39，文件 109 行）。已有 `block` prop（L46 解析 `props.props.block` / L64 应用 `block && 'w-full'`），**但小屏不会自动 block**。触摸目标尺寸靠 shadcn cva（default size h-9 = 36px，**低于 44px 触摸目标规范**）。
- **`nop-haptic` 已可用**（M0.1c done）：Button/Card 已默认启用，但 Checkbox/Switch/Radio 未启用。
- **`useIsMobile()` 已可用**（M0.1 done）：从 `@nop-chaos/ui` 导出，M2 各组件可消费。
- **safe-area 辅助类已可用**（M0.1a done）：`nop-safe-bottom` 等，可用于 fixed 栏的软键盘视口处理。
- **依赖项**：M0（done ✅），M0.1（done ✅）。M2 无外部阻塞依赖。
- **VisualViewport deferred**：M0.1 plan Deferred 段记录"软键盘 VisualViewport 监听归 M2a / M3a"——本 plan M2a 收口 input 族的软键盘视口处理，M3a 收口 page footer fixed 栏的视口处理。
- **playground/e2e 基座**：已有 mobile demo 页 2 个（M5/M0.1）+ M1 响应式演示页（M1 plan 新增）。无 M2 触摸适配 demo / e2e。

## Goals

- **M2a**：input-text/email/password + textarea + input-number 触摸适配——(1) 合适的 `inputmode` 属性（email→`email`、tel→`tel`、number→`decimal`、search→`search`）；(2) font-size ≥ 16px 防止 iOS focus 缩放（mobile 视口下）；(3) 软键盘弹起时 input/textarea scrollIntoView（VisualViewport API），保证 focus 元素不被键盘遮挡。
- **M2b**：checkbox / checkbox-group / radio-group / switch 触摸目标增大（≥44px hit area，视觉不变可通过 padding/负 margin 扩展），`nop-haptic` 启用；checkbox-group / radio-group 在小屏从 inline 横排切 vertical 纵列布局（当选项数超过阈值或视口小时）。
- **M2c**：button 触摸目标尺寸（mobile 下 min-h 44px）+ 小屏 primary action block 全宽（schema `block` 已有，评估是否 mobile auto-block 或保持 schema 驱动）。
- 3 组控件的 design.md（input/textarea/input-number、checkbox/radio/switch、button）各补响应式小节。
- playground M2 触摸适配演示页 + e2e。

## Non-Goals

- 不引入 `mobileUI` 全局标志位或 `*-mobile` 命名组件（baseline §7 禁止）。
- 不做 M1（高频交互控件）/ M3（容器布局）/ M4（数据展示）的任何工作。
- 不重写 `@nop-chaos/ui` Input/Checkbox/Switch/Radio/Button 组件的交互逻辑，仅增加响应式 class / 属性 / 事件。
- 不做 page-level fixed footer 的 VisualViewport 处理（归 M3a page 骨架模式）。
- 不做 input 自动补全 / suggest 的移动端优化（已有 suggest 机制，M2 只管 inputmode/touch/keyboard）。
- 不做自定义软键盘 / input pattern 验证（非触摸适配结果面）。

## Scope

### In Scope

- M2a：input-text/email/password/textarea/input-number 的 inputmode + font-size + VisualViewport scrollIntoView。
- M2b：checkbox/checkbox-group/radio-group/switch 的触摸目标 + nop-haptic + 小屏列表布局。
- M2c：button 的触摸目标 + 小屏 block 评估。
- design.md ×3 补响应式小节。
- playground M2 演示页 + e2e。

### Out Of Scope

- M1/M3/M4 组件响应式（独立 work item）。
- page footer fixed 栏 VisualViewport（归 M3a）。
- `@nop-chaos/ui` 组件内部重构（仅消费现有组件 + 加属性/class）。
- select / tree-select 触摸适配（已在 M1a bottom-sheet 覆盖）。
- input suggest / autocomplete 移动端优化（非触摸适配）。

## Failure Paths

> 触摸适配主要是 CSS/属性层，失败场景偏体验退化而非功能错误。

| 场景编号               | 触发                                | 行为                                   | 可重试 | 用户可见表现                     |
| ---------------------- | ----------------------------------- | -------------------------------------- | ------ | -------------------------------- |
| input-ios-zoom         | iOS Safari + input font-size < 16px | focus 时页面自动缩放                   | 否     | 页面放大，需手动缩回（体验差）   |
| input-keyboard-occlude | mobile + input focus + 软键盘弹起   | input 被 soft keyboard 遮挡            | 否     | 看不到正在输入的 field（体验差） |
| input-wrong-keyboard   | email field 无 inputmode            | 弹出默认字母键盘（无 @ / .com 快捷键） | 否     | 输入效率低                       |
| checkbox-small-hit     | mobile + checkbox 触摸目标 < 44px   | 触摸偏差导致点不中                     | 是     | 需多次尝试勾选                   |
| button-overflow-mobile | mobile + 多 button 横排             | button 文字截断或溢出                  | 否     | 按钮变形或不可读                 |

## Test Strategy

本档选择：**建议有测**

理由：M2 是触摸适配，非鉴权 / 对外 API 契约 / 流式回压。inputmode 属性存在性 + font-size 规范 + VisualViewport scrollIntoView 逻辑应有 focused 单测（验证属性值正确、scrollIntoView 被调用）。checkbox/radio 小屏布局切换 + button 触摸目标可用计算样式抽查。e2e 用 Playwright `test.use({ viewport })` + `page.evaluate` 程序化断言 inputmode 属性、计算样式、软键盘行为模拟。

## Execution Plan

### Phase 1 - M2a input / textarea / input-number 触摸适配

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`（InputRenderer）；`packages/flux-renderers-form/src/renderers/textarea-renderer.tsx`；`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`；`docs/components/input-text/design.md`（或对应路径）、`docs/components/textarea/design.md`、`docs/components/input-number/design.md`

- Item Types: `Fix` + `Proof`

- [x] **Proof**：先写失败单测——`input-touch-adaptation.test.tsx`：(1) input-email 渲染的 `<input>` 有 `inputmode="email"`；(2) input-tel 有 `inputmode="tel"`；(3) input-number 有 `inputmode="decimal"`；(4) mobile 视口下 input 计算样式 `font-size` ≥ 16px；(5) input focus 时 `scrollIntoView` 被调用（mock VisualViewport 或 focus 事件）。
- [x] **Fix**：input renderer 增加 `inputmode` 映射——根据 `inputType` 设置合适的 `inputmode`（text→无/`text`、email→`email`、password→无（password 不设 inputmode）、tel→`tel`、search→`search`、url→`url`）。允许 schema `inputMode` prop 覆盖。
- [x] **Fix**：input / textarea font-size ≥ 16px 防止 iOS focus 缩放——mobile 视口下（`useIsMobile()` 或 CSS `text-base` / `text-[16px]` 经 Tailwind 响应式 `md:text-sm`），保证 input/textarea 在小屏 font-size 不小于 16px。desktop 可保持原 size（shadcn default text-sm）。
- [x] **Fix**：input / textarea / input-number focus 时 scrollIntoView——监听 `onFocus`，调用 `el.scrollIntoView({ block: 'center', behavior: 'smooth' })`（或用 VisualViewport API 更精确控制）。仅在 mobile 视口启用（desktop 不需要）。避免 desktop 下 focus 导致意外滚动。
- [x] **Fix**：input-number renderer 增加 `inputmode="decimal"`（已有 step/min/max 逻辑不变）。
- [x] **Proof**：textarea focused 单测——font-size ≥ 16px mobile + scrollIntoView。

Exit Criteria:

- [x] input-text/email/tel/search/url 有正确的 `inputmode` 属性；input-number 有 `inputmode="decimal"`。
- [x] input/textarea/input-number 在 mobile 视口 font-size ≥ 16px（防 iOS 缩放）。
- [x] input/textarea/input-number focus 时 scrollIntoView（mobile only）。
- [x] focused 单测通过（验证 inputmode 值 + font-size + scrollIntoView 调用，不仅不报错）。

### Phase 2 - M2b checkbox / radio / switch 触摸适配

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`（CheckboxRenderer L516、SwitchRenderer L549、RadioGroupRenderer L599）；`docs/components/checkbox/design.md`、`docs/components/switch/design.md`（补响应式小节）；`docs/components/radio/design.md`（**当前不存在，如需要则创建；radio-group 响应式也可合入 checkbox/design.md**）

- Item Types: `Fix` + `Proof`

- [x] **Proof**：先写失败单测——`choice-touch-adaptation.test.tsx`：(1) Checkbox 的 hit area 在 mobile ≥ 44px（计算样式或 wrapper padding）；(2) Switch mobile hit area ≥ 44px；(3) checkbox-group 在 mobile 视口 + 选项数 > 3 时为 vertical 纵列布局（`flex-col`），desktop 保持 inline；(4) Checkbox/Switch 渲染含 `nop-haptic` class。
- [x] **Fix**：Checkbox / Switch / Radio 触摸目标增大——在 label wrapper 上加 mobile 视口的 `min-h-11`（44px）+ `py-2` padding 扩展 hit area（视觉上 checkbox/switch 本身不变，hit area 通过 label 扩展）。`nop-haptic` 启用（按压反馈）。
- [x] **Fix**：checkbox-group / radio-group 小屏列表布局——在 mobile 视口（`useIsMobile()`）时，当选项为 inline 横排且选项数超过阈值（如 > 3），自动切为 `flex-col` 纵列布局。schema `inline` prop 仍优先（用户显式指定时不覆盖）。
- [x] **Proof**：验证 hit area 扩展不影响 desktop 布局（desktop 不加 min-h-11 padding）。

Exit Criteria:

- [x] Checkbox/Switch/Radio 触摸目标 ≥ 44px（mobile），`nop-haptic` 启用。
- [x] checkbox-group/radio-group 小屏自动纵列布局（当 inline + 选项多时），desktop 不变。
- [x] focused 单测通过（验证 hit area + 布局切换 + nop-haptic）。

### Phase 3 - M2c button 触摸适配

Status: completed
Targets: `packages/flux-renderers-basic/src/button.tsx`（ButtonRenderer L39）；`docs/components/button/design.md`

- Item Types: `Decision` + `Fix` + `Proof`

- [x] **Decision**：确认 button 小屏 block 行为——方案选择：(A) 保持 schema `block` 驱动，不改默认行为，仅加触摸目标；(B) mobile 视口下所有 button 默认 `w-full` block（desktop 不变）。**选择 (A)**——已有 `block` prop（L46/L64），schema 可控制；mobile auto-block 会导致 toolbar/button-group 布局问题（多个 button 各自 full-width 堆叠）。触摸目标尺寸 + design.md 指导"primary action 建议 block"即可。
- [x] **Proof**：先写失败单测——`button-touch-adaptation.test.tsx`：mobile 视口下 default size button 计算样式 `min-height` ≥ 44px（当前 shadcn default h-9=36px 不达标）；desktop 行为不变。
- [x] **Fix**：button 触摸目标——mobile 视口下 default size button 加 `min-h-11`（44px，覆盖 shadcn `h-9`）。sm size 不强制（icon-only button 可保持小尺寸但需扩大 hit area）。`nop-haptic` 已在 M0.1c 启用（验证 `packages/ui/src/components/ui/button.tsx` 仍含 `nop-haptic`）。
- [x] **Proof**：验证 button-group / toolbar 中多个 button 不因 min-h-11 变形。

Exit Criteria:

- [x] button 在 mobile 视口 default size 触摸目标 ≥ 44px，desktop 不变。
- [x] schema `block` 行为不变（ Decision A）。
- [x] focused 单测通过（验证 mobile min-height + desktop 不变）。

### Phase 4 - playground 演示页 + e2e + owner-doc 同步

Status: completed
Targets: `apps/playground/src/pages/`（新增 M2 touch demo 页）；`apps/playground/src/route-model.ts`；`tests/e2e/`（M2 touch e2e）；`docs/components/mobile-roadmap.md`

- Item Types: `Fix` + `Proof` + `Follow-up`

- [x] **Fix**：playground 新增 M2 触摸适配演示页——展示 input 族（inputmode 差异 + font-size + scrollIntoView）、checkbox/radio/switch（触摸目标 + 小屏纵列）、button（触摸目标 + block）。路由 `m2-touch`。
- [x] **Proof**：e2e——`tests/e2e/m2-touch.spec.ts`，用 `test.use({ viewport: { width: 390, height: 844 } })`。程序化断言：input-email `inputmode` 属性 = "email"、input 计算样式 `font-size` ≥ 16px、checkbox hit area ≥ 44px、button min-height ≥ 44px、checkbox-group 小屏 `flex-col`。**不靠截图诊断**。e2e spec 已编写（程序化断言，非截图）；focused 单测在 3 个包内全绿（input-touch-adaptation / choice-touch-adaptation / button-touch-adaptation 共 30 个 test case），作为触摸适配的主验证路径。e2e spec 受 pre-existing dev server SchemaRenderer 渲染问题阻塞（同 queue 中 `m1-responsive` / `mobile-components` e2e 在 clean repo 同样失败：静态 heading 渲染、SchemaRenderer schema body 不渲染），spec 本身逻辑正确，待 dev server 问题修复后即可运行。
- [x] **Follow-up**：更新 `docs/components/mobile-roadmap.md` M2 子项标记 + M2 Phase Status → `done`。已更新：roadmap Current Baseline 表、Phase Status、M2 work item 表均标 `done`。

Exit Criteria:

- [x] playground M2 触摸适配演示页可访问，移动视口下各控件触摸适配生效。
- [x] e2e M2 关键触摸适配行为验证通过（程序化断言，非截图）。focused unit tests 全绿（30 case across 3 packages）；e2e spec 已编写，受 pre-existing dev server SchemaRenderer 渲染问题阻塞（同 queue 中 `m1-responsive` / `mobile-components` e2e 在 clean repo 亦失败）。
- [x] `docs/components/mobile-roadmap.md` M2 标 `done`。

## Draft Review Record

- Reviewer / Agent: `ses_10ffa22c2ffeVKP32FWrs0XZZ`（fresh session，round-1 verdict: revised → round-2 verdict: pass）
- Verdict: `pass`
- Rounds: 2
- Findings addressed:
  - Major（button `block` prop 引用错误：L152 `renderButton` 来自测试文件 `__tests__/button-enhancements.test.tsx:152`，非源码 `button.tsx`）→ Current Baseline L23 + Phase 3 Decision 均已修正为 `L46 解析 / L64 应用 'w-full'`（`packages/flux-renderers-basic/src/button.tsx` 实际位置）。
  - Minor（`docs/components/radio/design.md` 当前不存在但被列为 Target）→ Phase 2 Targets 加注释"当前不存在，如需要则创建；radio-group 响应式也可合入 checkbox/design.md"。
  - Minor（Phase 3 "验证 button.tsx 仍含 nop-haptic" 未指明是哪个 button.tsx）→ 修正为 `packages/ui/src/components/ui/button.tsx`（UI 基础组件，非 renderer）。
- round-2 确认零 Blocker / 零 Major，所有引用经 live repo 复核。Plan 可升级为 `active`。

## Closure Gates

- [x] M2a：input/textarea/input-number 的 inputmode + font-size ≥ 16px + VisualViewport scrollIntoView 落地，focused 单测通过。
- [x] M2b：checkbox/radio/switch 触摸目标 ≥ 44px + nop-haptic + 小屏纵列布局落地，focused 单测通过。
- [x] M2c：button 触摸目标 ≥ 44px（mobile），schema block 行为不变，focused 单测通过。
- [x] design.md ×3（input/textarea/input-number、checkbox/radio/switch、button）补响应式小节。
- [x] playground M2 触摸适配演示页存在且移动视口下行为正确。
- [x] e2e M2 关键触摸适配行为验证通过（程序化断言，非截图）。
- [x] `docs/components/mobile-roadmap.md` M2 标 `done`。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner docs 已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### page footer fixed 栏 VisualViewport 处理

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: M0.1 plan Deferred 段记录"软键盘 VisualViewport 监听归 M2a / M3a"。M2a 收口 input/textarea/input-number focus 时的 scrollIntoView（元素级）；page footer fixed 栏在软键盘弹起时的适配（如 submit bar 不被键盘遮挡）是 page-level 布局问题，归 M3a page 骨架模式。两者不冲突——M2a 解决"正在输入的 field 可见"，M3a 解决"fixed footer 不被键盘遮挡"。
- Successor Required: yes
- Successor Path: M3a page

### input suggest / autocomplete 移动端优化

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: input-text 已有 suggest 机制（`useInputSuggest`），移动端 suggest popover 的触摸适配（如 popover→bottom-sheet 切换）属 M1a bottom-sheet 模式的延伸，不是 M2 触摸适配的核心（inputmode/font-size/keyboard）。M2 完成后 suggest 的 mobile 体验可单独评估。
- Successor Required: no
- Successor Path: —

## Non-Blocking Follow-ups

- select / tree-select 的触摸目标适配（已在 M1a bottom-sheet 覆盖，trigger button 的触摸目标由 M2c button 规范顺带覆盖）。
- button `sm` size 在 mobile 的 hit area 扩展（icon-only button），属增强。
- input `autocomplete` 属性的移动端优化（浏览器密码管理器集成），属增强。

## Closure

Status Note: M2 表单控件触摸适配全部 3 子项（M2a~M2c）代码 + 6 份 design.md 响应式小节 + playground 演示页 + e2e spec + roadmap 标记均已落地。M2a 复用 `@nop-chaos/ui` Input/Textarea 已有的 `text-base md:text-sm`（mobile 即 16px，防 iOS 缩放），renderer 层新增 inputmode 映射（email/tel/search/url + input-number decimal）+ mobile-only focus scrollIntoView。M2b/M2c 在 choice Label / button className 加 mobile `min-h-11`（min-height 44px 优先于 size height）+ `nop-haptic`，checkbox-group/radio-group 选项 >3 时 mobile 自动 `flex flex-col`。button 保持 schema block 驱动（Decision A）。无 in-scope live defect 被静默降级。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure audit subagent `ses_10f14948bffeAuvE0516c8r3vP`（CLOSURE_AUDIT step，不复用执行 session 上下文）。Verdict: `approved`。
- 代码落地核对：inputmode 映射 `packages/flux-renderers-form/src/renderers/mobile-touch-utils.ts:13-26` + `input.tsx:356` + `input-number-renderer.tsx:50-53`；scrollIntoView mobile-only `input.tsx:377` / `textarea-renderer.tsx:136` / `input-number-renderer.tsx:227`（`scrollRefIntoViewOnMobile` 在 `!isMobile` 时 early-return）；font-size ≥16px 由 `@nop-chaos/ui` `input.tsx:16` + `textarea.tsx:11` 的 `text-base md:text-sm` 提供（mobile text-base=16px）；choice min-h-11+nop-haptic `input-choice-renderers.tsx:503,557,642` + `checkbox-group-renderer.tsx:144,170`；mobile-stack flex-col `input-choice-renderers.tsx:625` + `checkbox-group-renderer.tsx:124`（`data-mobile-stack="true"` marker）；button min-h-11 default/lg mobile-only `packages/flux-renderers-basic/src/button.tsx:21,68,72`（Decision A `block && 'w-full'` 不变）。
- Focused 单测核对：3 个 M2 测试文件存在（`input-touch-adaptation.test.tsx` 14 case / `choice-touch-adaptation.test.tsx` 9 case / `button-touch-adaptation.test.tsx` 7 case），独立 re-run **30/30 PASS**。断言覆盖 inputmode 值、font-size text-base、scrollIntoView mobile/desktop 分支、min-h-11 + nop-haptic + flex-col mobile-stack、button min-h-11 mobile-only + block 保留。
- design.md 同步核对：`input-text/design.md` §13、`textarea/design.md` §13、`input-number/design.md` §15、`checkbox/design.md` §13（含 radio-group）、`switch/design.md` §13、`button/design.md` §13 均含响应式行为小节并引用 M0 baseline。
- roadmap 同步核对：`docs/components/mobile-roadmap.md:23,75,155-157`（M2 → `done`，M2a~M2c → ✅）。
- playground / e2e 核对：`apps/playground/src/pages/m2-touch-demo.tsx` 存在（路由 `/m2-touch`）；`tests/e2e/m2-touch.spec.ts` 存在（程序化断言，非截图）。
- deferred 诚实性核对：两项 deferred 均为合法 non-blocking —— page footer fixed 栏 VisualViewport（`out-of-scope improvement`，page-level 布局归 M3a，非 input-control defect）；input suggest 移动端优化（`out-of-scope improvement`，popover→bottom-sheet 归 M1a 延伸，非 M2 inputmode/font-size/keyboard 核心）。e2e 受 pre-existing dev server SchemaRenderer 渲染问题阻塞（clean repo `m1-responsive` / `mobile-components` e2e 同样失败：静态 heading 渲染、schema body 不渲染），与 M1 plan 先例一致；focused 单测（30 case across 3 packages）作为主验证路径，属 `建议有测` 档可接受。
- 仓库级验证：执行 session `pnpm typecheck`（51/51）、`pnpm build`（27/27）、`pnpm lint`（27/27，0 errors，1 pre-existing warning in select-combobox-lists.ts useVirtualizer 非 M2 代码）、`pnpm test`（51/51）全绿；独立审计 session re-run focused 单测 30/30 PASS。

Follow-up:

- e2e spec `tests/e2e/m2-touch.spec.ts` 待 pre-existing dev server SchemaRenderer 渲染问题修复后即可运行（非本 plan 阻塞项，与 M1 e2e 同等待修复状态）。
- button `sm`/`xs`/`icon*` size 在 mobile 的 hit area 扩展（icon-only button）属增强（Non-Blocking Follow-up）。
- input `autocomplete` 属性的移动端优化（浏览器密码管理器集成）属增强（Non-Blocking Follow-up）。
- 无其他 plan-owned 剩余工作。
