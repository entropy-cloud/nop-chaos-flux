# E3 P2 视觉打磨残留项收口（text maxLine 展开/收起 toggle + icon size 预设 token）

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Mission: components-improvement
> Work Item: E3 P2 体验完善 —— 残留 adjudicated deferred 子项收口（text + icon）
> Source: `docs/components/text/design.md` §2/§4/§12、`docs/components/icon/design.md` §2/§4/§12、`docs/plans/2026-06-22-0149-3-e3-basic-display-visual-fields-plan.md` `Deferred But Adjudicated`、`docs/components/existing-components-improvement-roadmap.md`（E3 第 3 批 P2 体验完善）
> Related: `docs/plans/2026-06-22-0149-3-e3-basic-display-visual-fields-plan.md`（E3 主 plan，落地 text copyable/maxLine 纯截断 + icon size:number/color，把 toggle 与 token 显式 deferred）

## Purpose

把 E3 basic-display-visual-fields plan 显式 adjudicated 为「optimization candidate / Successor Required: no」的两项**视觉/交互打磨**收口：

1. **text maxLine 展开/收起 toggle**：当前 `maxLine: number` 只做纯 `line-clamp-{N}` 截断（`packages/flux-renderers-basic/src/text.tsx:84`），用户看不到被截断的内容。本 plan 增加可选 toggle（默认关闭），开启后渲染「展开/收起」按钮，允许用户在 line-clamp 截断态与全文本态之间切换。涉及局部 state + a11y（`aria-expanded`）。

2. **icon `size` 预设 token（`sm`/`md`/`lg`）**：当前 `size?: number`（缺省 `16`，`packages/flux-renderers-basic/src/icon.tsx:12-14`）需要作者记像素值；本 plan 把 `size` 类型扩展为 `number | 'sm' | 'md' | 'lg'`，token 映射到固定像素值（与 shadcn/Tailwind 命名习惯对齐），保留 number 逃生口。

两者同源（`2026-06-22-0149-3-...` Deferred）、同包（`flux-renderers-basic`）、同 closure criteria 类型（视觉/DX 增强 + design.md 决策表翻转 + focused test），按 plan guide Rule 22/26 合并为单 owner plan，内拆 Phase 收口。

## Current Baseline

- **text maxLine 现状**：`packages/flux-renderers-basic/src/text.tsx:20-29` `resolveMaxLineClass(maxLine)` 返回 `line-clamp-{N}`（`>100` 截断为 `line-clamp-100`）；JSX 中 `maxLineClass` 用在根 `<Tag>` 的 `className`（`text.tsx:88`）；`packages/flux-renderers-basic/src/schemas.ts:174-181` `TextSchema` 已有 `maxLine?: number`。无 toggle、无展开态、无 `aria-expanded`。`docs/components/text/design.md:18` 决策表 `maxLine` 行标注「实现（纯 line-clamp，首版不带 toggle）」；§12 风险节标注 follow-up；line 23 Decision 段注明「作为 follow-up（已记入 `docs/plans/2026-06-22-0149-3-...` 的 Deferred）」。
- **icon size 现状**：`packages/flux-renderers-basic/src/icon.tsx:12-14` `size` 为 `number`（缺省回退 `16`，`Math.max(1, Math.floor(size))`）；`packages/flux-renderers-basic/src/schemas.ts:198-206` `IconSchema` `size?: number`。`docs/components/icon/design.md:20` 决策表「预设 size token（sm/md/lg）— 不采纳（首版，follow-up）— number 像素值已满足可配；token 映射是 DX 糖」；line 23 Decision「token（sm/md/lg）作为 DX 糖 follow-up」。
- **i18n 现状**：`packages/flux-i18n/locales/en-US.ts:20-21` 与 `zh-CN.ts` **已有 `flux.common.expand`/`flux.common.collapse` key**，被 `flux-renderers-form-advanced/.../tree-option-list.tsx:106-107` 与 `flux-renderers-data/.../tree-renderer.tsx:418` 复用。本 plan 的 text toggle 直接复用 `flux.common.*`，**不**新开 `flux.text.*` namespace（避免重复字符串）。
- **deferred 现状**：`docs/plans/2026-06-22-0149-3-e3-basic-display-visual-fields-plan.md:176-194` `Deferred But Adjudicated`：
  - 「text maxLine 展开/收起 toggle」= `optimization candidate`、`Successor Required: no`、Why Not Blocking Closure「首版纯 line-clamp 截断即可观测；toggle 增加局部 state 与 a11y 语义，属增值交互。Phase 1 Decision 裁定首版不加」。
  - 「icon size 预设 token（sm/md/lg）」= `optimization candidate`、`Successor Required: no`、Why Not Blocking Closure「number 像素值已满足可配；token 映射是 DX 糖，不影响契约成立」。
- **roadmap 现状**：`docs/components/existing-components-improvement-roadmap.md:58` E3 行 `planned`，含「text+icon 视觉字段 ✅ done（`docs/plans/2026-06-22-0149-3-...`，completed）」—— 主能力已 done，本 plan 收口其残留 deferred，**不**新增 E3 工作项（与 E3 已 done 状态正交，是同一工作项的 follow-up）。
- **vocabulary 现状**：本 plan 不涉及 component handle（text/icon 是 display renderer，无 handle 需求；`docs/references/component-handle-vocabulary.md:86` `form/table/crud/chart/data-source/tabs` 既有不扩展）。
- **shadcn/ui 命名先例**：`size: 'sm' | 'md' | 'lg'` 是 shadcn `Button`/`Input` 等通用 token（见 `packages/ui/src/components/ui/button.tsx` size variants）；本 plan icon size token 仅借鉴 sm/md/lg 命名，**像素值是 Flux icon 自定**（不与 shadcn `Button` size 的视觉变体语义混用）。

## Goals

- **text maxLineToggle**（或同等命名）：`TextSchema` 新增 `maxLineToggle?: boolean`（缺省 `false`，向后兼容）；为 `true` 且 `maxLine` 为有效正整数且**实际文本溢出**时，渲染「展开/收起」按钮；点击切换 local state `expanded`，展开态移除 `line-clamp-{N}` class；a11y：toggle button 加 `aria-expanded`、`aria-controls`、可读 label（**复用既有 `flux.common.expand`/`flux.common.collapse`** i18n key，不新开 namespace）。
- **icon size token**：`IconSchema.size` 类型扩展为 `number | 'sm' | 'md' | 'lg'`；token 映射 `{ sm: 12, md: 16, lg: 20 }`（与 shadcn/Tailwind 视觉约定对齐；`md` 缺省保持 `16` 与既有 number 缺省一致）；number 路径不变。
- **owner docs 同步**：`text/design.md` §2 决策表 `maxLine` 行从「实现（纯 line-clamp，首版不带 toggle）」翻转为「实现（含可选 toggle）」+ 新增 `maxLineToggle` 行；§4 schema + §7 运行期状态（local state）+ §10 DOM marker + §12 风险节同步。`icon/design.md` §2 决策表「预设 size token」行从「不采纳（首版，follow-up）」翻转为「实现」；§4 schema + §10 同步。
- **focused 单测**：text toggle 覆盖 toggle 渲染、点击展开/收起、`aria-expanded` 翻转、无溢出不渲染 toggle、`maxLineToggle:false` 不渲染；icon token 覆盖 3 token 映射、number 路径不变、缺省 `md=16`、invalid token 回退。
- **playground demo + e2e**：扩展现有 `text-icon-visual-fields` demo 页（或新增 sub-section）演示 toggle + token；e2e 程序化断言 toggle 点击后 line-clamp class 移除、icon token 渲染预期像素。

## Non-Goals

- 不实现 text 富文本 / Markdown（归 `markdown` 组件，design.md §2 已裁定）。
- 不实现 text click/hover 事件（X2 通用可阻止事件系统已覆盖，design.md §2 已裁定）。
- 不实现 icon 自定义 SVG 集合（design.md §2/§12 已裁定归后续评估）。
- 不实现 icon `decorative`/`title` a11y 字段（同 plan 的 `Deferred But Adjudicated` 另一项 `out-of-scope improvement`，本 plan 不收口；归独立 a11y 增强）。
- 不改 `color` 字段（已由 E3 主 plan 落地）。
- 不改 text copyable（已由 E3 主 plan 落地）。
- 不引入新的 component handle（text/icon 是 display renderer，无 handle 需求）。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/schemas.ts`：`TextSchema` 新增 `maxLineToggle?: boolean`；`IconSchema.size` 类型从 `number` 扩展为 `number | 'sm' | 'md' | 'lg'`。
- `packages/flux-renderers-basic/src/text.tsx`：`TextRenderer` 增加 toggle 渲染分支（local state `expanded` + 溢出检测 + 按钮 + a11y）；DOM marker `data-slot="text-maxline-toggle"`、`data-expanded`。
- `packages/flux-renderers-basic/src/icon.tsx`：`IconRenderer` 增加 token → number 映射（共享常量 `ICON_SIZE_TOKEN_PIXELS = { sm: 12, md: 16, lg: 20 }`）。
- `packages/flux-renderers-basic/src/__tests__/text-maxline-toggle.test.tsx`（新增）：focused 单测 6+ 用例（注意：jsdom 无 layout，`scrollHeight`/`clientHeight` 均返回 0，需用 `Object.defineProperty` 或 `vi.spyOn` 模拟溢出测量，或把「溢出才渲染 toggle」的判定本身抽成纯 helper 单测 + 把「点击切换 a11y」留 integration/e2e）。
- `packages/flux-renderers-basic/src/__tests__/icon-size-token.test.tsx`（新增或扩展现有 icon 测试）：focused 单测 5+ 用例。
- `docs/components/text/design.md`：§2 决策表 + §4 schema + §7 state + §10 DOM marker + §12 同步。
- `docs/components/icon/design.md`：§2 决策表「预设 size token」行翻转 + §4 schema + §10 同步。
- `docs/components/existing-components-improvement-roadmap.md`：E3 P2 text+icon 子项补注「maxLineToggle + size token ✅ done」；Last Updated 翻转。
- `apps/playground/src/pages/text-icon-visual-fields-demo.tsx`（扩展现有 demo）：新增 2 个 demo（text maxLineToggle + icon size token 对照）。
- `tests/e2e/text-icon-visual-fields.spec.ts`（扩展现有 e2e）：新增 2+ cases。
- `docs/logs/{year}/06-22.md` 或执行当日：closure 条目。

> i18n：复用 `flux.common.expand`/`flux.common.collapse`（既有），**不**新增 `flux.text.*` key，**不**改 `packages/flux-i18n` locales。

### Out Of Scope

- text 富文本 / Markdown / 事件（design.md 已裁定）。
- icon 自定义 SVG / `decorative`/`title` a11y（独立后续）。
- text `text` vs `body` 双入口收敛（design.md §12 风险，独立 follow-up）。
- 共享 size token 命名推广到 button/badge 等（独立 naming-conventions 校准）。

## Failure Paths

| 场景编号                   | 触发                              | 行为                                                                    | 可重试 | 用户可见表现            |
| -------------------------- | --------------------------------- | ----------------------------------------------------------------------- | ------ | ----------------------- |
| maxline-toggle-no-overflow | `maxLineToggle:true` 但文本未溢出 | 不渲染 toggle 按钮（useLayoutEffect 测量 scrollHeight <= clientHeight） | 否     | 文本完整显示，无 toggle |
| maxline-toggle-overflow    | `maxLineToggle:true` + 文本溢出   | 渲染 toggle，点击展开移除 line-clamp class                              | 是     | toggle 可见，点击切换   |
| icon-size-token-invalid    | `size: 'xl'` 等未识别 token       | 回退到缺省 `16`（与 invalid number 一致）；dev warn                     | 否     | 渲染 16px 图标          |
| icon-size-number-invalid   | `size: -1`/`NaN`/`Infinity`       | 回退到缺省 `16`（既有行为，本 plan 不改）                               | 否     | 渲染 16px 图标          |

## Test Strategy

本档选择：`建议有测`

理由：两项是视觉/DX 增强（toggle 交互 + size token 别名），非核心数据回归路径（text 是 display renderer 无值写回；icon size 不影响数据）。但 toggle 涉及 a11y（`aria-expanded`）与 local state，token 涉及类型扩展（可能影响 TS 推断），按 plan guide「一般功能选建议有测」，选「建议有测」：focused 单测覆盖关键路径（toggle 渲染/切换/无溢出回退 + 3 token 映射/number 兼容/invalid 回退）；e2e 覆盖 toggle 点击与 token 像素断言。Failure Path 单测逐条覆盖。

## Execution Plan

### Phase 1 - 裁定 + design.md 决策表翻转

Status: completed
Targets: `docs/components/text/design.md`、`docs/components/icon/design.md`、`docs/components/existing-components-improvement-roadmap.md`

- Item Types: `Decision | Fix | Follow-up`

- [x] **Decision**：text toggle 字段命名裁定 —— 候选 `maxLineToggle`/`expandable`/`collapsible`/`toggle`。**裁定 `maxLineToggle`**（与 `maxLine` 同前缀、语义明确「针对 maxLine 的 toggle」、boolean 明确；过 X3 命名基线 boolean-clearable-searchable 风格）。写入 design.md §2 + §4。
- [x] **Decision**：text toggle 触发条件裁定 —— 始终渲染 vs 仅在溢出时渲染。**裁定「仅在溢出时渲染」**（`useLayoutEffect` 测量 `scrollHeight > clientHeight`；无溢出时渲染 toggle 是视觉噪音，违背 a11y 简洁原则）。Failure Path `maxline-toggle-no-overflow`。
- [x] **Decision**：text toggle 默认值裁定 —— `maxLineToggle` 缺省 `false`（向后兼容，既有 `maxLine` 行为不变）。写入 §4。
- [x] **Decision**：icon size token 像素映射裁定 —— `{ sm: 12, md: 16, lg: 20 }`（与 lucide-react 默认尺寸阶梯对齐；`md` = 既有缺省 `16`，零迁移成本）。写入 §2 + §4。如审查发现更合适的映射（如 `sm:14/md:16/lg:18`），可在 Phase 1 内调整。注：这是 Flux icon 自定的像素 token，不绑定 shadcn `Button` 的 `size` 语义（后者是 `xs/sm/lg/icon` 视觉变体，非像素 token）。
- [x] **Decision**：icon size 类型扩展形态裁定 —— `number | 'sm' | 'md' | 'lg'`（union 类型，保留 number 逃生口；不用 object 形态 `{ preset?: 'sm'|'md'|'lg', pixels?: number }`，避免过度设计）。写入 §4。
- [x] **Fix**：`text/design.md` §2 决策表 `maxLine` 行翻转「实现（纯 line-clamp，首版不带 toggle）」→「实现（含可选 toggle，由 `maxLineToggle` 开启）」；新增 `maxLineToggle` 行（实现 + 溢出检测 + a11y）；§4 schema 加 `maxLineToggle?: boolean`；§7 运行期状态节加「`maxLineToggle` 开启时含 local `expanded` state」；§10 DOM marker `data-slot="text-maxline-toggle"` + `data-expanded`；§12 follow-up 注记「已由本 plan 收口」。
- [x] **Fix**：`icon/design.md` §2 决策表「预设 size token」行翻转「不采纳（首版，follow-up）」→「实现」+ token 像素映射列；§4 schema `size?: number | 'sm' | 'md' | 'lg'` + token 像素说明；§10 同步。
- [x] **Follow-up**：`existing-components-improvement-roadmap.md` E3 P2 text+icon 子项补注「maxLineToggle + size token ✅ done（follow-up plan）」；Last Updated 翻转。

Exit Criteria:

- [x] text/design.md §2/§4/§7/§10/§12 翻转 + 新字段落地
- [x] icon/design.md §2/§4/§10 翻转
- [x] roadmap E3 P2 text+icon 子项 ✅ 注记 + Last Updated 翻转

### Phase 2 - schema + renderer + focused 测试

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/text.tsx`、`packages/flux-renderers-basic/src/icon.tsx`、`packages/flux-renderers-basic/src/__tests__/text-maxline-toggle.test.tsx`、`packages/flux-renderers-basic/src/__tests__/icon-size-token.test.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix**：`schemas.ts` `TextSchema` 加 `maxLineToggle?: boolean`；`IconSchema.size` 类型扩展 `number | 'sm' | 'md' | 'lg'`。
- [x] **Fix**：`text.tsx` `TextRenderer` 增加 toggle 分支：
  - local state `const [expanded, setExpanded] = useState(false)`（仅在 `maxLineToggle === true` 时启用）。
  - 溢出检测：`useLayoutEffect` + `useRef<HTMLElement>`，测量 `el.scrollHeight > el.clientHeight`；state `overflows`。**jsdom 测试约束**：jsdom 无 layout 引擎，`scrollHeight`/`clientHeight` 均返回 0；单元测试需用 `Object.defineProperty(el, 'scrollHeight', { value: N })`/`clientHeight` mock，或把「溢出判定」抽成可注入的纯 helper 单测，把 DOM 测量留 integration/e2e。
  - 渲染：`maxLineToggle && overflows && !expanded` 时显示 toggle button（`@nop-chaos/ui` `Button` `variant="ghost" size="icon-xs"` 或同等）；`aria-expanded={expanded}`、`aria-controls=<id>`、`onClick={() => setExpanded(v => !v)}`、label = `t(expanded ? 'flux.common.collapse' : 'flux.common.expand')`（复用既有 i18n key）。
  - class：`expanded` 时移除 `line-clamp-{N}` class。
  - DOM marker：toggle button `data-slot="text-maxline-toggle"`、根节点 `data-expanded={expanded}`。
- [x] **Fix**：`icon.tsx` `IconRenderer` 增加 token 映射：`const ICON_SIZE_TOKEN_PIXELS = { sm: 12, md: 16, lg: 20 } as const`（数值为 Flux 自定 icon 像素约定，与 lucide 默认尺寸阶梯对齐，不强行绑定 shadcn `Button` size 语义）；`resolveIconSize(size)` helper：`typeof size === 'number'` → 既有路径；`typeof size === 'string' && size in TOKENS` → `TOKENS[size]`；otherwise → `16` + dev warn。
- [x] **Proof**：`text-maxline-toggle.test.tsx`（新增）6+ 用例（含 jsdom 溢出 mock 说明）：
  - `maxLineToggle:false` 不渲染 toggle（baseline 向后兼容）
  - `maxLineToggle:true` + 溢出（mock `scrollHeight > clientHeight`）→ 渲染 toggle + `aria-expanded:false`
  - 点击 toggle → `aria-expanded:true` + line-clamp class 移除
  - 再点击 → 回到 collapsed
  - `maxLineToggle:true` + 无溢出（mock `scrollHeight === clientHeight`）→ 不渲染 toggle（Failure Path `maxline-toggle-no-overflow`）
  - 无 `maxLine` 时 `maxLineToggle:true` → 不渲染（无截断即无 toggle 必要）
- [x] **Proof**：`icon-size-token.test.tsx`（新增或扩展）5+ 用例：
  - `size: 'sm'` → 渲染 12px
  - `size: 'md'` → 渲染 16px
  - `size: 'lg'` → 渲染 20px
  - `size: 24`（number 路径）→ 渲染 24px（向后兼容）
  - 缺省 → 渲染 16px
  - `size: 'xl'`（invalid）→ 渲染 16px + dev warn（Failure Path `icon-size-token-invalid`）

Exit Criteria:

- [x] schema 类型扩展落地（TextSchema.maxLineToggle / IconSchema.size union）
- [x] text toggle 溢出检测 + a11y 正确，baseline（无 toggle）向后兼容
- [x] icon token 映射 + number 兼容 + invalid 回退
- [x] focused 单测全绿（text 6+ + icon 5+）
- [x] local typecheck（`pnpm --filter @nop-chaos/flux-renderers-basic typecheck`）通过

### Phase 3 - playground demo + e2e + 同步 + Closure

Status: completed
Targets: `apps/playground/src/pages/text-icon-visual-fields-demo.tsx`、`tests/e2e/text-icon-visual-fields.spec.ts`、`docs/plans/2026-06-22-0149-3-e3-basic-display-visual-fields-plan.md`（deferred 收口注记）、`docs/logs/{year}/06-22.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] **Fix**：`apps/playground/src/pages/text-icon-visual-fields-demo.tsx`（扩展现有 demo）：新增「Text maxLine toggle」sub-section（含溢出文本 + toggle 演示）+ 「Icon size token」sub-section（sm/md/lg 对照 + 像素值显示）。
- [x] **Proof**：`tests/e2e/text-icon-visual-fields.spec.ts`（扩展现有 e2e）2+ cases（程序化断言，不依赖截图）：
  - text maxLine toggle：渲染溢出文本 → `[data-slot="text-maxline-toggle"]` 可见 + `aria-expanded:false` → 点击 → `aria-expanded:true` + line-clamp class 移除（`getComputedStyle` 或 class list 断言）。
  - icon size token：渲染 `size:'lg'` → SVG `width`/`height` attribute = `20`（或 `style.width` 断言）；3 token 像素值对照。
- [x] **Follow-up**：E3 主 plan `2026-06-22-0149-3-e3-basic-display-visual-fields-plan.md` `Deferred But Adjudicated` 「text maxLine 展开/收起 toggle」+「icon size 预设 token」条目注记「已由本 plan 收口」。
- [x] **Fix**：`docs/logs/{year}/06-22.md` 或执行当日：closure 条目（含验证输出）。

Exit Criteria:

- [x] playground demo 含 2 新 sub-section 可访问
- [x] e2e 2+ cases GREEN（程序化断言）
- [x] E3 主 plan Deferred 条目注记收口
- [x] roadmap + Last Updated 同步

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan-authoring-and-execution-guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 sub-agent round 1（fresh session `ses_112904b51ffeWHs9iye6nF43Gd`）
- Verdict: `revised`
- Rounds: 1
- Findings addressed:
  - Major 1（i18n namespace 漂移：自创 `flux.text.expand/collapse` 而非复用既有 `flux.common.expand/collapse`）：已全面改用 `flux.common.*`，删除新增 namespace 的 Fix 项与 In-Scope 条目，并在 Current Baseline/Goals/Phase 2 多处显式标注复用既有 key。
  - Major 2（jsdom 无 layout，Phase 2 overflow-detection 单测无法执行）：已在 Scope/In-Scope、Phase 2 Fix（renderer）、Phase 2 Proof（测试描述）三处注明 jsdom 限制 + `Object.defineProperty`/`vi.spyOn` mock 技术 + helper 抽取 + integration/e2e 兜底。
  - Minor（playground demo 路径 `text-icon-visual-fields.tsx` → 实际 `text-icon-visual-fields-demo.tsx`）：In-Scope 已修正；Phase 3 Targets/Fix 在 round 2 后顺带修正。
  - Minor（`packages/ui/src/button.tsx` 路径漂移 + shadcn Button size 类比对 icon pixel token 不严）：已改为 `packages/ui/src/components/ui/button.tsx` 并显式声明 icon pixel token 是 Flux 自定、不绑定 shadcn Button size 语义。
- Reviewer / Agent: 独立 sub-agent round 2（fresh session `ses_1128844c5ffemklP8goJpYiX2L`，re-review）
- Verdict: `pass-with-minors`
- Rounds: 2（总）
- Findings addressed: 2 项 Major 全部 verified fixed；3 项残留 Minor（Phase 3 demo 路径 × 2、Phase 2 stale `packages/flux-i18n` target）—— round 2 后已由 drafter 清理（demo 路径全部修正、stale target 移除）。0 new Blocker / 0 new Major。Plan 升级为 `active`。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] text `maxLineToggle` 字段 + 溢出检测 + a11y 落地（baseline 向后兼容）
- [x] icon `size: number | 'sm' | 'md' | 'lg'` token 映射落地（number 兼容 + invalid 回退）
- [x] Failure Path 4 类（`maxline-toggle-no-overflow`/`maxline-toggle-overflow`/`icon-size-token-invalid`/`icon-size-number-invalid`）有 focused test 覆盖
- [x] text/icon design.md §2 决策表 + §4/§7/§10/§12 同步翻转
- [x] roadmap E3 P2 text+icon 子项 ✅ + Last Updated 同步
- [x] E3 主 plan Deferred But Adjudicated 两条注记收口
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（text 富文本、icon a11y `decorative`/`title`、icon 自定义 SVG 均为 design.md §2 已显式裁定，非本 plan scope）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 收口 E3 主 plan 的两条 deferred；自身预计无新增 deferred。如执行中发现独立优化项需延后，按 guide Anti-Slacking Rule 处理。

### icon `decorative` / `title` a11y 字段（沿用 E3 主 plan 裁定）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: a11y 字段与 size/token 视觉维度正交；当前 `aria-hidden="true"` 固定满足装饰图标默认语义。归独立 a11y 增强（与 E3 主 plan 裁定一致）。
- Successor Required: no

## Non-Blocking Follow-ups

- text `text` vs `body` 双入口收敛（design.md §12 风险节，独立 follow-up）。
- icon 自定义 SVG 集合 / 非 lucide 图标库（design.md §12，归后续评估）。
- 共享 size token 命名推广到其它 display renderer（如 badge）—— 独立 naming-conventions 校准。

## Closure

Status Note: All 3 Phases completed. text `maxLineToggle?: boolean`（溢出检测 + a11y `aria-expanded`/`aria-controls` + 复用 `flux.common.expand`/`collapse` i18n）+ icon `size: number | 'sm' | 'md' | 'lg'`（token `{ sm: 12, md: 16, lg: 20 }`，number 路径兼容，invalid 回退 16）landed in `flux-renderers-basic`。focused unit tests（text toggle 8 + icon token 7）+ e2e 2 new（text-icon-visual-fields 8/8）全绿；text/icon design.md §2/§4/§5/§7/§10/§12 synced；E3 主 plan Deferred 两条注记收口；roadmap E3 P2 ✅ + Last Updated 翻转。Closure Gates 全部 `[x]`（含独立 fresh-session closure-audit 通过）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit sub-agent（fresh session，独立于执行链路）
- Evidence: 独立 fresh-session 复核 —— 对照 live repo 逐条核对每个 Phase Exit Criteria 与 Closure Gates：
  - **Phase 1**（design.md 决策表翻转）：`docs/components/text/design.md:18-19,24` §2 决策表 `maxLine` 行翻转「实现（含可选 toggle）」+ 新增 `maxLineToggle` 行；§4 `maxLineToggle?` 字段（line 39）；§5 字段分类（line 48）；§7 local state（line 58-60）；§10 DOM marker `data-slot="text-maxline-toggle"` + `data-expanded`（line 76）；§12 follow-up「已由本 plan 收口」（line 88）。`docs/components/icon/design.md:17,22,35,42,67` §2 决策表「size token」行翻转→「实现」+ §4/§5/§10 token 映射 + invalid 回退。`existing-components-improvement-roadmap.md:3` Last Updated 翻转 + line 58 E3 P2 ✅ done 注记。
  - **Phase 2**（schema + renderer + 测试）：`packages/flux-renderers-basic/src/schemas.ts:174` `IconSize = number | 'sm' | 'md' | 'lg'`；line 183 `TextSchema.maxLineToggle?: boolean`；line 206 `IconSchema.size?: IconSize`。`text.tsx:96-142` `toggleEnabled` gate（`maxLineToggle:true && isPositiveFiniteMaxLine`）+ `useLayoutEffect` overflow 测量（`measureOverflow` line 36-39）+ local `expanded` state + `aria-expanded`/`aria-controls` + 复用 `t('flux.common.expand'/'collapse')` + DOM marker `data-slot="text-maxline-toggle"` + 展开态移除 `line-clamp-{N}` class（anti-hollow：toggle 真在运行期渲染，非空壳）。`icon.tsx:6-29` `ICON_SIZE_TOKEN_PIXELS = { sm:12, md:16, lg:20 }` + `resolveIconSize` 在 `IconRenderer:37` 被调用（anti-hollow：token 映射真接入 runtime）。`__tests__/text-maxline-toggle.test.tsx` 8 用例（含 jsdom overflow mock + `aria-controls` id 匹配 + copyable 共存）；`__tests__/icon-size-token.test.tsx` 7 用例（3 token 映射 + number 兼容 + 缺省 16 + invalid token `'xl'→16`+warn + invalid number `-1→1`）。
  - **Phase 3**（demo + e2e + 同步）：`apps/playground/src/pages/text-icon-visual-fields-demo.tsx:14,68,78,118-128` 新增「maxLineToggle」+「icon size token」两 sub-section（含 `testid: text-visual-maxline-toggle` / `text-visual-icon-token-sm/md/lg`）。`tests/e2e/text-icon-visual-fields.spec.ts:102-153` 新增 2 cases（程序化断言 toggle 展开/收起 `aria-expanded` + `data-expanded` + line-clamp class 移除；icon token sm/md/lg 像素 12/16/20）。E3 主 plan `2026-06-22-0149-3-...:189,196` Deferred 两条注记「已由本 plan 收口」。`docs/logs/2026/06-22.md:3-18` closure 条目。
  - **Anti-Hollow 复核**：`text.tsx` toggle 经 `useLayoutEffect` + `showToggle` gating 真渲染；`icon.tsx` `resolveIconSize` 在 `IconRenderer` 被调用；无空函数体 / 无 `return null` 占位 / 无 swallowed exception。
  - **Deferred 诚实性**：`Deferred But Adjudicated` 仅 `icon decorative/title a11y`（`out-of-scope improvement` + reason，与 E3 主 plan 裁定一致）；`Non-Blocking Follow-ups` 3 项（text vs body 收敛、自定义 SVG、token 命名推广）均为独立治理项，无 in-scope live defect 隐藏。
  - **执行 session 自报验证**：`pnpm typecheck` 49/49；`pnpm build` 26/26；`pnpm lint` 26/26；`pnpm test` 49/49（flux-renderers-basic 28 files / 346 tests，含新增 text-maxline-toggle 8 + icon-size-token 7）；e2e text-icon-visual-fields 8/8 GREEN（6 既有 + 2 新增）。本审计独立核对了 live repo 代码与文档落地证据，不依赖执行 session 自报。
  - **Verdict**：approved（plan 可关闭，无 plan-owned 剩余工作）。

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
