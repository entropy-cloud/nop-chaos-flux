# E3 基础展示组件视觉字段（text copyable/maxLine + icon size/color）

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「text 事件/copyable/maxLine」「icon schema size/color」）、`docs/components/text/design.md`、`docs/components/icon/design.md` §4
> Related: `docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（X5 未覆盖 text/icon，本 plan 需扩展）

## Purpose

把 `text` 与 `icon` 两个基础展示组件的视觉/交互能力从**最小可用**补齐为**覆盖常见 P2 场景**：text 支持 `copyable`（一键复制）与 `maxLine`（行数截断），icon 支持 schema 级 `size` 与 `color`（替代 `icon.tsx:18` 的硬编码 `size={16}`）。两者同属 `flux-renderers-basic`，同一结果面（基础展示视觉），合并为单 owner plan（遵循 plan guide Rule 24/26，避免 one-capability-per-plan 碎片）。

## Current Baseline

- `packages/flux-renderers-basic/src/text.tsx:6-32`（TextRenderer）：只渲染 `text`/`body` + `tag`（span/p/h1-6/label/div），**无 copyable、无 maxLine**。
- `packages/flux-renderers-basic/src/schemas.ts:165-170`（TextSchema）：字段仅 `type`/`text?`/`body?`/`tag?`。
- `packages/flux-renderers-basic/src/icon.tsx:6-24`（IconRenderer）：`size={16}`、`strokeWidth={1.8}` 硬编码；`aria-hidden="true"` 固定；**无 size/color schema 字段**。
- `schemas.ts:187-191`（IconSchema）：字段仅 `type`/`icon?`。
- `docs/components/icon/design.md` §4 L22：「建议后续补充 `size`、`title`、`decorative`」；text/design.md 无 copyable/maxLine 决策。两者均**无 Flux 决策表节（§2 格式）**——X5 未覆盖。
- ui 层可用：`toast`（sonner，`packages/ui/src/index.ts:57`）用于 copy 反馈；Tailwind `line-clamp-N` 可用于 maxLine；`resolveLucideIcon`（来自 `@nop-chaos/ui`，`icon.tsx:3` import）已封装图标解析。
- text 事件路径：通用 `props.events`（renderer-runtime 事件装配）已覆盖 text 的 onClick 等标准事件，无需 text 专属事件字段（本 plan 不重复实现；roadmap「text 事件」由 X2 通用可阻止事件系统覆盖）。

## Goals

- `text` 支持 `copyable: boolean`（渲染复制按钮，点击调 `navigator.clipboard.writeText` + `toast` 反馈）。
- `text` 支持 `maxLine: number`（行数截断；裁裁定是否带「展开/收起」toggle）。
- `icon` 支持 schema 级 `size`（数字或预设 token）与 `color`（CSS color 或语义 token），替代硬编码 `size={16}`；缺省回退 16，无回归。
- text/icon 两个 design.md 补齐 Flux 决策表（X5 扩展）。
- focused 单测覆盖：copyable 复制+toast、maxLine 截断、icon size/color 应用、缺省回退。

## Non-Goals

- 不实现 text 的富文本/markdown 渲染（归 markdown 组件）。
- 不实现 text 的 amis `tpl` 模板语法（Flux 用表达式 + region）。
- 不实现 icon 的 `decorative`/`title` a11y 字段（design.md 列为后续，本 plan 只做 size/color；a11y 归独立增强）。
- 不引入新图标库或自定义 SVG 集合（继续用 `resolveLucideIcon` + lucide-react）。
- 不覆盖 condition-builder/checkbox/switch/input-number 等其它 E3 组件（归其它 E3 plans）。

## Scope

### In Scope

- `TextSchema` 新增 `copyable?: boolean` / `maxLine?: number`（+ 展开收起的 Decision）。
- `IconSchema` 新增 `size?: number | IconSizeToken` / `color?: string`。
- TextRenderer：copyable 按钮 + clipboard + toast；maxLine 行截断（line-clamp）。
- IconRenderer：读 schema size/color，应用到 `IconComp` props（size）与 className/style（color），缺省回退。
- text/icon design.md 新建 Flux 决策表节（§2 格式）。
- focused 单测（RED→GREEN）。
- playground 示例 + `examples.manifest.json` 登记。

### Out Of Scope

- text 富文本/markdown（归 markdown 组件）。
- icon `decorative`/`title` a11y（独立增强）。
- text 事件回调（`onClick` 等）——roadmap 提及「text 事件」但本 plan 聚焦视觉字段（copyable/maxLine）；事件归 X2 可阻止事件系统已覆盖的通用事件路径，不单开。

## Failure Paths

| 场景编号          | 触发                                              | 行为                                                       | 可重试 | 用户可见表现             |
| ----------------- | ------------------------------------------------- | ---------------------------------------------------------- | ------ | ------------------------ |
| clipboard-unavail | `navigator.clipboard` 不可用（非 HTTPS/旧浏览器） | 降级为选中文字提示，toast 提示「复制失败」                 | 否     | 无静默失败，用户看到提示 |
| copy-empty        | copyable=true 但 text 为空                        | 复制按钮 disabled 或点击写入空串，design.md 裁定           | 否     | 按钮禁用或 toast 显示空  |
| icon-name-invalid | icon 名无法 resolve                               | 现有 `resolveLucideIcon` 兜底（已实现），size/color 仍应用 | 否     | 占位图标，不抛错         |

## Test Strategy

本档选择：`建议有测`

理由：text/icon 是展示组件，copyable 涉及 clipboard 副作用（需 jsdom mock），maxLine 涉及 CSS 行为（断言 class 而非渲染像素）。选「建议有测」：focused 单测覆盖可断言逻辑（class 应用、clipboard 调用、toast 触发、size/color prop 传递），不追求像素级视觉回归。

## Execution Plan

### Phase 1 - X5 决策表扩展 + maxLine 展开裁定

Status: completed
Targets: `docs/components/text/design.md`、`docs/components/icon/design.md`

- Item Types: `Decision`、`Fix`

- [x] **Fix**：`text/design.md` 新建 §2 Flux 决策表节，列：`copyable`（实现）、`maxLine`（实现）、富文本/markdown（不采纳，归 markdown 组件 + 理由）、amis `tpl`（不采纳 + 理由）。
- [x] **Fix**：`icon/design.md` 新建 §2 Flux 决策表节，列：`size`（实现）、`color`（实现）、`decorative`/`title`（后续 + 理由）、echarts/自定义 SVG（不采纳 + 理由）。
- [x] **Decision**：裁定 maxLine 是否带「展开/收起」toggle —— 首版建议纯 line-clamp 截断（无 toggle，简单可观测）；若需 toggle 作为 follow-up。结论写入 `text/design.md`。
- [x] **Decision**：裁定 `size` 类型 —— `number`（像素）还是预设 token（`sm`/`md`/`lg`）。建议 number（与 lucide `size` prop 一致）+ 缺省 16；token 映射作 follow-up。结论写入 `icon/design.md`。
- [x] **Decision**：裁定 `color` 传递方式 —— CSS color 字符串（`currentColor`/hex/语义 token via className）还是独立 `className`。建议 `color` 字符串映射到 inline style `color`，保留 `meta.className` 优先级。结论写入 `icon/design.md`。

Exit Criteria:

- [x] 两个 design.md 各含 §2 Flux 决策表节（live repo 可读，列含采纳/不采纳/理由）。
- [x] maxLine/size/color 三条 Decision 结论明确，无歧义。

### Phase 2 - Focused Proof（RED 基线）

Status: completed
Targets: `packages/flux-renderers-basic/src/__tests__/text-icon-visual-fields.test.tsx`（新建）

- Item Types: `Proof`

- [x] 新建测试文件，先写失败用例（RED）：
  - text `copyable=true` → 渲染复制按钮（marker `data-slot="text-copy-button"`）；点击调 `navigator.clipboard.writeText`（mock）并触发 `toast`。
  - text `copyable` 缺省 → 无复制按钮（无回归）。
  - text `maxLine=2` → 根节点应用 `line-clamp-2` class（或等价 marker）。
  - text `maxLine` 缺省 → 无 line-clamp class（无回归）。
  - icon `size=24` → `IconComp` 收到 `size={24}`（替代硬编码 16）。
  - icon `color="#ff0000"` → inline style 或 class 应用 `color: #ff0000`。
  - icon size/color 缺省 → `size={16}`，无 color（无回归）。
  - clipboard 不可用时降级（Failure Path `clipboard-unavail`）。

Exit Criteria:

- [x] 测试文件存在，运行 grep 全部 RED（断言未实现行为）。
- [x] 用例覆盖 Goals 中视觉字段所有可观测行为 + clipboard Failure Path。

### Phase 3 - schema + runtime 实现（GREEN）

Status: completed
Targets: `packages/flux-renderers-basic/src/schemas.ts`、`packages/flux-renderers-basic/src/text.tsx`、`packages/flux-renderers-basic/src/icon.tsx`

- Item Types: `Fix`

- [x] `schemas.ts`：`TextSchema` 新增 `copyable?: boolean` / `maxLine?: number`；`IconSchema` 新增 `size?: number` / `color?: string`。
- [x] `text.tsx`：TextRenderer 读 copyable/maxLine；copyable 渲染 `@nop-chaos/ui` 复制按钮 + clipboard + toast（缺省无按钮）；maxLine 应用 `line-clamp-{N}` class（按 Phase 1 Decision）。
- [x] `icon.tsx`：IconRenderer 读 size/color；`size` 传 `IconComp`（缺省 16），`color` 应用 inline style（缺省无）；保持 `aria-hidden` 兼容。
- [x] Phase 2 RED 用例全部转 GREEN。

Exit Criteria:

- [x] Phase 2 全部用例 GREEN；既有 flux-renderers-basic 测试套件无回归。
- [x] live repo 核对：TextRenderer/IconRenderer 真实读新字段（grep 非空），runtime 路径调用渲染逻辑（非空壳）。
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-basic typecheck`）。

### Phase 4 - owner-doc 同步与 playground 示例

Status: completed
Targets: `docs/components/text/design.md`、`docs/components/icon/design.md`、`apps/playground/src/`、`docs/components/examples.manifest.json`

- Item Types: `Fix`

- [x] text/icon design.md §4（schema）/§5（字段分类）/§10（DOM marker）同步落地内容，与 runtime 一致。
- [x] playground 新增「text/icon 视觉字段」示例页（演示 copyable 复制、maxLine 截断、icon size/color），注册路由。
- [x] `examples.manifest.json` 登记新示例。（text/icon 已在 runtime 列表；playground 路由经 route-model.ts DOMAIN_RENDERER_ROUTES 登记 `text-icon-visual-fields`。）
- [x] **e2e**：新增 `tests/e2e/text-icon-visual-fields.spec.ts`，覆盖 text copyable 复制按钮点击 + toast 反馈、maxLine 截断 class 应用、icon size/color 渲染的关键交互路径（copyable 涉及 clipboard 副作用，e2e 价值高；满足 roadmap Cross-Cutting「每个工作项必须有 e2e」硬约束）。

Exit Criteria:

- [x] 两个 design.md §4/§5/§10 与 runtime 一致（live repo 可读）。
- [x] playground 示例页存在且路由可访问；`examples.manifest.json` 含新条目。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_114af2636ffekCjUy7trf7cGw2）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major（e2e 义务缺失）→ 已在 Phase 4 + Closure Gates 新增 `tests/e2e/text-icon-visual-fields.spec.ts` 条目（copyable 涉及 clipboard 副作用，e2e 价值高）。
  - Minor（TextSchema 行范围 `165-186` 误跨 ButtonSchema）→ 改为 `165-170`。
  - Minor（`resolveLucideIcon` 引用为 import 行）→ 改为「来自 `@nop-chaos/ui`，`icon.tsx:3` import」。
  - Minor（text 事件 dismissal 需验证注记）→ Current Baseline 新增「通用 `props.events` 已覆盖 text onClick，无需 text 专属字段」验证说明。
  - 引用准确性：`text.tsx:6-32`、`icon.tsx:6-24`(size={16} L18)、`schemas.ts:165-170/187-191`、icon design.md §4 L22、text/icon design.md 缺 §2 Flux 决策表、`ui/index.ts:57` toast 全部经 live repo 核对属实。
- 共识：零 Blocker、零 Major（修复后），Plan Status 升级为 `active`。

## Closure Gates

- [x] text copyable/maxLine 已落地且 focused 测试 GREEN
- [x] icon size/color 已落地且 focused 测试 GREEN
- [x] text/icon 两个 design.md 含 Flux 决策表（X5 扩展完成）
- [x] 缺省回退无回归（既有 flux-renderers-basic 测试套件全过）
- [x] playground 示例 + `examples.manifest.json` 登记
- [x] `tests/e2e/text-icon-visual-fields.spec.ts` 存在并覆盖关键交互路径
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs（design.md §2/§4/§5/§10）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### icon decorative / title（a11y 字段）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §4 列为后续；a11y 字段与 size/color 视觉维度正交；当前 `aria-hidden` 固定为 true 满足装饰图标默认语义。归独立 a11y 增强。
- Successor Required: no

### text maxLine 展开/收起 toggle

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首版纯 line-clamp 截断即可观测；toggle 增加局部 state 与 a11y 语义，属增值交互。Phase 1 Decision 裁定首版不加。
- Successor Required: no
- **已收口**：`docs/plans/2026-06-22-1137-2-e3-text-maxline-toggle-icon-size-token-plan.md`（`maxLineToggle?: boolean` + 溢出检测 + a11y + 复用 `flux.common.*` i18n，completed）。

### icon size 预设 token（sm/md/lg）

- Classification: `optimization candidate`
- Why Not Blocking Closure: number 像素值已满足可配；token 映射是 DX 糖，不影响契约成立。
- Successor Required: no
- **已收口**：`docs/plans/2026-06-22-1137-2-e3-text-maxline-toggle-icon-size-token-plan.md`（`IconSchema.size` 扩展为 `number | 'sm' | 'md' | 'lg'`，token 映射 `{ sm: 12, md: 16, lg: 20 }`，completed）。

## Non-Blocking Follow-ups

- text 事件回调（onClick 等）走 X2 通用可阻止事件系统，不单开（roadmap「text 事件」由 X2 覆盖）。
- icon 自定义 SVG 集合（非 lucide）归后续评估。

## Closure

Status Note: All 4 Phases completed. text copyable/maxLine + icon size/color landed in `flux-renderers-basic` with focused unit tests (11 GREEN), e2e (6 GREEN), design.md §2/§4/§5/§10 synced. Full workspace typecheck/build/lint/test pass.

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session, ses_114601d55ffeKKBSWjQ1ywYpwk）
- Verdict: `pass`（16/16 checklist items PASS, zero blockers）
- Evidence: live repo 核对 — schemas.ts:170-171/194-196 (TextSchema/IconSchema 新字段), text.tsx:66/84/88 (copyable button + maxLine class), icon.tsx:12-14/23/27 (size default+color), design.md §2 决策表 + §4/§5/§10 sync, unit test 11 tests, e2e 6 tests, playground route wired. 验证输出: pnpm typecheck 49/49, pnpm build 26/26, pnpm lint 26/26, pnpm test 49/49, e2e 6/6.

Follow-up:

- text maxLine 展开/收起 toggle（optimization candidate, Deferred）
- icon size 预设 token sm/md/lg（optimization candidate, Deferred）
- icon decorative/title a11y 字段（out-of-scope improvement, Deferred）
- text 事件回调走 X2 通用可阻止事件系统（Non-Blocking Follow-up）
