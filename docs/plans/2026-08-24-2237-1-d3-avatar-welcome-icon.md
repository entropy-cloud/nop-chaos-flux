# 01 D3 气泡 Avatar + Welcome Icon（G3 + G8 收口）

> Plan Status: completed
> Last Reviewed: 2026-08-24
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D3；`docs/components/flux-renderers-ai/product-spec.md` §3.1–§3.2（D0 产物，规格契约）
> Mission: ai-widgets-product
> Work Item: D3
> Related: `docs/plans/2026-08-24-1045-1-d0-product-standard-baseline.md`（前置输入）；D4（依赖本 plan 完成后起草）

## Purpose

把 ai-bubble 的空壳 avatar（G3）与 ai-welcome 的字面字符串 icon（G8）收口为 lucide 图标渲染：气泡 avatar 按 role 分发 `Bot`/`User`（32×32 圆形），welcome icon 按 6 项预设映射分发 lucide 组件并保留字符串回退。两者同源（渲染器未正确用 lucide 渲染图标），同一 plan 收口。

## Current Baseline

（2026-08-24 live 核实）

- **G3**：`packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:134` 为空 div：`{showAvatar ? <div data-slot="ai-bubble-avatar" aria-hidden="true" /> : null}`；`AiBubbleViewProps`（:16-48）无 `avatar` 扩展位；`AiBubbleSchema`（`schemas.ts:116-141`）有 `showAvatar` 但无 `avatar` 字段
- **G8**：`packages/flux-renderers-ai/src/renderers/ai-welcome.tsx:24-28` 将 `resolved.icon` 字符串字面渲染于 `span[data-slot="ai-welcome-icon"]`；`AiWelcomeSchema`（`schemas.ts:237-244`）仅 `icon?: string`，无 `iconLucide`
- **showAvatar 链路缺口（live 发现，roadmap 未展开）**：`AiMessageListView` 仅转发 `showTimestamp`（`ai-message-list.tsx:151/171/198`），`ai-chat.tsx:544` 也仅传 `showTimestamp`；`AiChatSchema`/`AiMessageListSchema` 均无 `showAvatar` 字段 → ai-chat 子树内 bubble 永不显示 avatar。e2e 的 avatar 几何断言要求 widgets demo 实际显示 avatar，故本 plan 必须补该接线（schema 字段 + 转发链 + demo 开启）
- `packages/flux-renderers-ai/src/styles.css` 现 301 行（D2 typography 落于 :128+），无 `[data-slot='ai-bubble-avatar']` 规则；welcome icon 视觉靠 tsx 内 `text-2xl` 工具类
- `lucide-react@^1.17.0` 已是 peer dep（`package.json:37`），`Bot`/`User`/`Sparkles`/`MessageCircle`/`Lightbulb`/`Search` 零新增依赖
- **既有测试影响面（live 核实）**：
  - `ai-welcome.test.tsx:40` 断言 `icon:'bot'` 渲染 textContent `'bot'` —— G8 修复后 `bot` 命中预设映射渲染 `<svg>`，textContent 变空，**该断言预期更新属本 plan 既定行为变更**（非静默回归）
  - `ai-welcome.test.tsx:33`（`'✨'` 字面）与 e2e `ai-coverage-widgets.spec.ts:187`（`'🤖'` 字面）不受影响——emoji 不在预设映射内，回退路径保持字面渲染
  - e2e `ai-widgets-demo.spec.ts:17` 仅断言 welcome icon 可见——安全
- e2e 基线：ai spec 家族 17 个文件（`tests/e2e/ai-*.spec.ts`，live glob 核实），widgets demo 10 测试 + fixture spec 6 测试全绿

## Goals

- **Avatar（product-spec §3.1 契约）**：`index.tsx` avatar 节点渲染 lucide `Bot`（assistant）/`User`（user），32×32、`border-radius: 9999px`、`hsl(var(--secondary-surface))` 背景（dark fallback `hsl(217 30% 20%)`）、1px `hsl(var(--border))` 边框（dark fallback `hsl(217 33% 27%)`）、图标色 `hsl(var(--muted-foreground))`；携带 `data-role`；marker `[data-slot="ai-bubble-avatar"]` 不变；`AiBubbleViewProps` 增 `avatar?: ReactNode`（向后兼容，缺省走 lucide 默认）；`AiBubbleSchema` 增 `avatar` 字段
- **showAvatar 接线**：`AiChatSchema` + `AiMessageListSchema` 增 `showAvatar?: boolean` 并逐层转发到 bubble；`ai-widgets-demo.tsx` 的 ai-chat schema 设 `showAvatar: true`
- **Welcome icon（product-spec §3.2 契约）**：`ai-welcome.tsx` 按预设映射表分发（`bot→Bot` / `user→User` / `sparkles→Sparkles` / `chat→MessageCircle` / `lightbulb→Lightbulb` / `search→Search`）；未命中回退字面字符串（向后兼容）；`AiWelcomeSchema` 增 `iconLucide?: SchemaValue`（host 经 `xui:imports` 注入 lucide 组件引用，优先级高于 `icon` 字符串——`senderExtensions` 先例 `schemas.ts:151-162`）；marker `data-slot="ai-welcome-icon"` 保持
- 新增 unit ≥4 case + e2e 新增断言（avatar `getBoundingClientRect()` 32×32 + `borderRadius` 9999px + 内含 `<svg>`；welcome icon 内含 `<svg>` 且 textContent 不再是字面 `bot`）全过；既有 ai spec 家族零破坏

## Non-Goals

- 不动 `ai-suggestions` pill icon（G9 归 D4，另一渲染器）
- 不回写 `design.md` / `renderers.md`（owner-doc 同步统一归 DG）
- 不改其他 12 处 `createMockAiEnv` 调用点 / mock connector / fixture（D1 已收口）
- JSON schema 文本不携带 ReactNode 序列化——`avatar` schema 字段的消费路径是表达式解析结果（host 经 `xui:imports`/programmatic 注入组件引用），`AiBubbleRenderer` 必须实际转发 `resolved.avatar` 到 `AiBubbleView`（`senderExtensions` 消费先例 `ai-chat.tsx:552-554`），**不是** declaration-only 扩展位（本包有 contract-honesty 先例：declared-but-unconsumed schema 字段曾被裁定移除，`src/__tests__/contract-honesty.test.ts:122-193`）

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx`（avatar 渲染 + props）
- `packages/flux-renderers-ai/src/renderers/ai-welcome.tsx`（lucide 分发）
- `packages/flux-renderers-ai/src/schemas.ts`（`AiBubbleSchema.avatar`、`AiWelcomeSchema.iconLucide`、`AiChatSchema`/`AiMessageListSchema` 的 `showAvatar`）+ `ai-renderer-definitions.ts` 对应 prop contract 声明（**必改**：schema shape 校验的 accepted keys 由 definitions `fields[]`/`propContracts` 构建——`packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts:34`——不更新则 demo 的 `showAvatar: true` 为 unaccepted key）
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`、`ai-chat.tsx`（showAvatar 转发）
- `packages/flux-renderers-ai/src/styles.css`（avatar 规则 + welcome icon 色）
- `apps/playground/src/pages/ai-widgets-demo.tsx`（`showAvatar: true` 一行）
- 测试：`renderers/__tests__/ai-welcome.test.tsx`（新增分发 case + :40 预期更新）、ai-bubble 侧测试文件（avatar case）、`tests/e2e/ai-widgets-demo.spec.ts`（新增 2 测试）

### Out Of Scope

- `packages/flux-renderers-ai/src/rich-text/`（独立 scope，D2 已裁定）
- `ai-suggestions.tsx`（D4）
- 其他 demo 页面的 welcome icon 内容（仅 widgets demo 用 `bot`；映射是渲染器级能力，其他 demo 自动受益但不在本 plan 验证面）

## Failure Paths

不适用：纯视觉渲染变更，无错误契约面。回退行为作为 Phase 决策口径：icon 字符串未命中预设 → 字面渲染（现状不变）；`avatar` prop 未提供 → lucide 按 role 默认；`showAvatar` 缺省 `false` → 不渲染 avatar 节点（现状不变）。

## Test Strategy

档位选择：`必须自动化`。avatar 是 ai-bubble public contract 变化、welcome icon 分发是 ai-welcome public contract 变化（roadmap §D3 完成判定明示）。按 AGENTS.md Tiers 与 plan guide「When Drafting #12」，**Proof 先于 Fix**：断言先以 red 状态锁定（现状空 div / 字面字符串），实现后转绿。几何断言（32×32 / borderRadius）归 e2e 层（jsdom 无布局）；unit 层断言结构（svg 存在、data-role、分发正确性、回退、优先级）。

## Execution Plan

### Phase 1 - 断言先行（red 锁定）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/__tests__/ai-welcome.test.tsx`、新 `packages/flux-renderers-ai/src/renderers/__tests__/ai-bubble-avatar.test.tsx`、`tests/e2e/ai-widgets-demo.spec.ts`

- Item Types: `Proof | Decision`

- [x] Decision：avatar 组件形态——`props.avatar` 提供时渲染之，否则按 `renderMessage.role` 分发 `Bot`/`User`；`data-role` 属性随 role 写入 avatar 节点
- [x] unit 断言落盘 ≥4 case：(a) `showAvatar` + assistant message → avatar 节点内含 `<svg>` 且 `data-role="assistant"`；(b) user message → `User` 分发（svg 存在 + `data-role="user"`）；(c) 自定义 `avatar` ReactNode 覆盖默认；(d) welcome `icon:'bot'` → svg（textContent 非字面 `bot`）；(e) 未命中字符串（如 `'✨'`）→ 字面回退；(f) `iconLucide` 组件优先于 `icon` 字符串
- [x] e2e 新增 2 测试落盘：widgets demo 首条 assistant bubble avatar `getBoundingClientRect()` 宽高 = 32、计算 `borderRadius` = 9999px、内含 lucide svg；welcome icon 内含 svg 且非字面字母
- [x] 对当前 repo 跑一次记录 red 证据（avatar 为空 div 无 svg、welcome icon 为字面文本）

Exit Criteria:

- [x] 新增断言全部落盘且当前为 red（red 证据记 plan 内备注或 daily log）

> Red 证据（2026-08-24 执行 session）：unit 6 red（`ai-bubble-avatar.test.tsx` 4 case：avatar 节点存在但 `querySelector('svg')` 为 null、自定义 avatar 未渲染、`AiBubbleRenderer` 未转发 `resolved.avatar`；`ai-welcome.test.tsx` 2 case：`icon:'bot'` 渲染字面文本无 svg、`iconLucide` 未消费）+ 兼容面 case（`✨` 字面回退 / `showAvatar` 缺省无节点）按预期 green；包内其余 712 tests 全绿。e2e 2 red（avatar locator 0 命中——demo 未接 `showAvatar`；welcome icon `svg` count 0）。

### Phase 2 - avatar / welcome icon 实现 + showAvatar 接线

Status: completed
Targets: `index.tsx`、`ai-welcome.tsx`、`schemas.ts`、`ai-renderer-definitions.ts`、`ai-message-list.tsx`、`ai-chat.tsx`、`styles.css`、`ai-widgets-demo.tsx`

- Item Types: `Fix`

- [x] `index.tsx:134` avatar 节点：lucide 按 role 分发 + `data-role` + `props.avatar` 覆盖位；保持 `aria-hidden="true"`
- [x] `styles.css` 新增 `[data-slot='ai-bubble-avatar']` 规则：32×32 / 9999px 圆 / token 背景 + 1px 边框（var-first + dark fallback 字面值，对齐 D2 双轨先例）+ 内部 svg 尺寸/颜色
- [x] `ai-welcome.tsx` 预设映射分发（6 项）+ 字面回退 + `iconLucide` 优先；色 `hsl(var(--muted-foreground))`（dark fallback），marker 不变
- [x] `schemas.ts`：`AiBubbleSchema.avatar?: SchemaValue`、`AiWelcomeSchema.iconLucide?: SchemaValue`、`AiChatSchema.showAvatar?: boolean`、`AiMessageListSchema.showAvatar?: boolean`；`ai-renderer-definitions.ts` 补 prop contract——`showAvatar` 两处用既有 `booleanContract('Show Avatar')` 同面（:162 先例），`avatar`/`iconLucide` 为 SchemaValue 组件引用字段、走 `senderExtensions` 的 `fields[]` 纯条目先例（`ai-renderer-definitions.ts:95/196`，**不**套 booleanContract）
- [x] `ai-message-list.tsx` / `ai-chat.tsx` 转发 `showAvatar`；`ai-widgets-demo.tsx` ai-chat 节点设 `showAvatar: true`
- [x] `AiBubbleRenderer`（schema 驱动路径）转发 `resolved.avatar` → `AiBubbleView`（`senderExtensions` 消费先例，`ai-chat.tsx:552-554` 模式）——保证 `AiBubbleSchema.avatar` 字段有真实消费方，非 declaration-only
- [x] 更新 `ai-welcome.test.tsx:40` 预期：`icon:'bot'` 从字面 `'bot'` 改为 svg 结构断言（G8 既定行为变更，plan 内显式记录）

Exit Criteria:

- [x] `rg -n "ai-bubble-avatar" packages/flux-renderers-ai/src` 同时命中 index.tsx（节点+data-role）与 styles.css（几何规则）
- [x] `rg -n "showAvatar" packages/flux-renderers-ai/src/renderers/ai-message-list.tsx packages/flux-renderers-ai/src/renderers/ai-chat.tsx` 命中转发点；widgets demo schema 含 `showAvatar: true`
- [x] playground dev 实跑抽查：widgets demo 对话双方 bubble 显示 32px 圆形图标、welcome 顶部为图标非字母（结果记 daily log）

### Phase 3 - 转绿与回归

Status: completed
Targets: Phase 1 全部测试文件

- Item Types: `Proof`

- [x] Phase 1 unit + e2e 断言全部转绿
- [x] 回归：ai spec 家族（17 个 `ai-*.spec.ts` 文件）全过，重点 `ai-coverage-widgets.spec.ts:187`（`🤖` 字面回退不受映射影响）与 `ai-widgets-fixture.spec.ts` 6 测试

Exit Criteria:

- [x] 新增 ≥4 unit case + 2 e2e 测试全过
- [x] 17 个 ai spec 全过、零非计划断言修改（唯一计划内修改：`ai-welcome.test.tsx:40` 预期更新，已在 Phase 2 记录）

## Draft Review Record

- Reviewer / Agent: round 1 fresh session `ses_fcbc577a7ffeGw3KU4g8asnY38`（2026-08-24，verdict `fail` 1 Major）；round 2 fresh session `ses_fcba17a85ffeBhereZYm4tLUcu`（2026-08-24，verdict `pass` 0 Blocker / 0 Major / 2 Minor）
- Verdict: `pass`（round 2 共识达成）
- Rounds: 2
- Findings addressed: 【Major】① `AiBubbleSchema.avatar` 无消费方（dead-contract 风险，contract-honesty 先例 `contract-honesty.test.ts:122-193`）——已补 Phase 2 转发项（`AiBubbleRenderer` 转发 `resolved.avatar`，senderExtensions 消费先例）+ Non-Goals 改写。【Minor，已修正】② ai spec 计数 16→17（live glob）；③ definitions 更新由「如有」改必改（shape 校验 accepted keys 依据）；④ Phase 1 测试文件名定为新 `ai-bubble-avatar.test.tsx`；⑤ round 2——`avatar`/`iconLucide` contract 声明改走 `senderExtensions` `fields[]` 纯条目先例（不套 booleanContract），`senderExtensions` 行引用 :152→:151

## Closure Gates

- [x] G3 收口：avatar 32×32 圆形 lucide 渲染（unit 结构 + e2e 几何断言双证）
- [x] G8 收口：welcome icon lucide 分发 + 字面回退向后兼容（`ai-coverage-widgets.spec.ts:187` 仍绿为回退证明）
- [x] showAvatar 接线链完整（chat → message-list → bubble），widgets demo 实显示
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] owner-doc：无需逐 phase 更新（avatar/icon 规格已由 product-spec §3 固化；renderers.md 更新统一归 DG，按 plan guide Rule 17）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: G3 + G8 双收口完成——avatar 按 role 分发 lucide `Bot`/`User`（32×32 圆形，e2e 几何断言双证）、welcome icon 6 项预设分发 + 字面回退向后兼容（`ai-coverage-widgets.spec.ts:187` 仍绿）、showAvatar 接线链 chat→message-list→bubble 完整且 widgets demo 实显示、`AiBubbleSchema.avatar` 有真实消费方（renderer 转发）。新增 8 unit case + 2 e2e 测试全绿，ai spec 家族 17 文件 113 测试零破坏。无 deferred / follow-up 残留。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh session `ses_fcb6fcb34ffeRjMSZYm7xAB9It`（2026-08-25，非执行 session）
- Evidence: 首轮 verdict `issues`（唯一 Blocker = daily log 缺失，docs-only；代码/语义/测试 9 项 checklist 全过：marker+几何 live 核验、avatar 转发非 declaration-only、双 call site 接线、definitions accepted-keys、测试断言面、deferred 诚实性、文本一致性、独立复跑 15/15 聚焦 + 718 包级 + e2e 43+6、零构建产物泄漏）；补写 `docs/logs/2026/08-25.md` D3 条目后复审 **VERDICT: approved**（diff docs-only，代码与审计态逐字节一致）。收口记录见 `docs/logs/2026/08-25.md`。

Follow-up:

- 无剩余 plan-owned 工作（owner-doc `renderers.md` 同步统一归 roadmap DG phase）。
