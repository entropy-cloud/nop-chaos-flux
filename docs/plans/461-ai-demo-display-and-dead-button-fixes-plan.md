# 461 AI 控件 demo 视觉 + 死按钮修复

> Plan Status: active
> Last Reviewed: 2026-08-17
> Source: `docs/analysis/2026-08-17-ai-control-display-analysis.md` + `docs/analysis/2026-08-17-ai-dead-buttons-analysis.md`
> Type: bug fix (playground theme CSS + AI demo dead-click wiring + small layout fix)
> Stack: apps/playground (theme CSS +3 demo JSON) + createMessageEngine call sites

## Purpose

收口 13 个 AI 控件 demo（含 `ai-widgets` / `ai-p4` / `ai-citations` / `ai-hitl` / `ai-component-handle` / `ai-chat` / `ai-tools` / `ai-attachments` / `ai-conversations` / `ai-persistence` / `ai-virtual-scroll` / `ai-linkage` / `ai-rich-text`）的 4 个 P1 显示/操作 bug、3 个 P2 副作用缺陷、4 个 P3 设计/编译警告，让所有 13 个 demo 的可点击元素都能产生可见 side effect、HITL 按钮显示正确。

**包含子类**：

- A. HITL Approve 按钮文字不可见（playground 没挂 `data-theme` + `--success` 等变量未定义）
- B. 4 类 demo 死按钮（`ai-prompts` / `ai-suggestions` / `ai-citations` / `ai-voice-input`）—— 22+ 个 dead-click 实例
- C. `ai-feedback` 在 demo 页面完全缺位（"AI Widgets Showcase" 漏挂）
- D. `ai-component-handle` 输入框被裁切布局
- E. `createMessageEngine` 缺 `createReactMessageAdapter` 警告

## Current Baseline

### 已落地事实

- `packages/flux-renderers-ai/src/renderers/ai-prompts.tsx:84-87`、`ai-suggestions.tsx:50,153`、`ai-citations.tsx:166-180,239-249`、`ai-voice-input.tsx:271` 渲染器已写 `props.events.onSelect?.()` / `onSourceClick?.()` / `onResult?.()` 等可选链 dispatch
- `apps/playground/src/pages/ai-widgets-demo.tsx:60-65,73-77,83` / `ai-p4-example.json` / `ai-citations-example.json` demo JSON 漏写对应 action 块，导致可选链 no-op
- `apps/playground/src/styles.css:53-80` `:root` 块没定义 `--success` / `--warning` / `--info`；`theme-tokens/src/styles.css` 把这些变量放在 `:root[data-theme='classic'][data-mode='light']` 等选择器内，但 `apps/playground/index.html` 与 `main.tsx` 未挂 `data-theme` / `data-mode` 属性 → 主题选择器全部不命中
- `apps/playground/src/ai/ai-component-handle-example.json:35` ai-chat 根 `className` 含 `flex-1 min-h-0 gap-2` 缺 `min-w-0` → 子项 ai-sender 行在 270px 窄列被裁切
- `ai-linkage-demo.tsx:63` 已正确传 `adapter: createReactMessageAdapter()`；其他 demo（`ai-chat` / `ai-conversations` / `ai-tools` / `ai-persistence` / `ai-attachments`）的 `createMessageEngine` 调用未传 adapter
- `ai-feedback` 渲染器（`ai-feedback.tsx`，copy/refresh/like/dislike/sources 5 按钮）已在 `data-c8-2-host.ts:223` 正确 wire，但 `ai-widgets-demo.tsx`（"AI Widgets Showcase"）未 mount 该 widget

### 验证证据

- 4 个程序化 click 截图保留于 `/tmp/screenshots/ai-dead-buttons/`
- 13 个 demo 截图保留于 `/tmp/screenshots/ai/` + `/tmp/screenshots/ai-interactive/`
- HITL Approve 按钮 `bg-success` 颜色解析失败（实测 `getComputedStyle` 返回 `background-color: transparent`）

### 真正剩余 gap

1. `bg-success` / `bg-warning` / `bg-info` 在 playground 所有控件失效（HITL Approve 按钮、token-usage 趋势环、后续所有用 success/warning 语义色的 widget）
2. 4 类 demo 死按钮 22+ 个
3. `ai-feedback` 缺位
4. `ai-component-handle` 布局
5. `createMessageEngine` adapter 警告（不阻塞但易引发无限 render loop）

## Goals

| ID  | 目标                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | playground `:root` 挂 `data-theme="classic" data-mode="light"`（或补默认 `--success` 等），所有 `bg-success` / `bg-warning` / `bg-info` 解析为有颜色                 |
| G2  | HITL Approve 按钮初始态 "批准" 文字可见（绿色实心 + 白字）                                                                                                           |
| G3  | `ai-widgets-demo` 4 个 prompt 卡点击 → 填入 sender input（toast 或 setValue）                                                                                        |
| G4  | `ai-widgets-demo` 5 个 suggestion pill 点击 → 填入 sender input                                                                                                      |
| G5  | `ai-p4-widgets-demo` 4 speech bubble + 5 suggestion + 2 popover 项点击 → toast 或 setValue                                                                           |
| G6  | `ai-citations-demo` 2 inline `[N]` 标记 + 2 list 项点击 → toast（或改 URL 为真实地址）                                                                               |
| G7  | `ai-voice-input` tooltip 在 headless 不可用时默认可见（badge 形式）                                                                                                  |
| G8  | `ai-widgets-demo` mount `ai-feedback` 实例 + wire `onAction`                                                                                                         |
| G9  | `ai-component-handle` 输入框完整可见（不被裁切）                                                                                                                     |
| G10 | `ai-chat-demo` / `ai-conversations-demo` / `ai-tools-demo` / `ai-persistence-demo` / `ai-attachments-demo` 给 `createMessageEngine` 补 `createReactMessageAdapter()` |
| G11 | 新增 focused 单测覆盖上述 wiring（4 类 demo widget click → 期望副作用）                                                                                              |
| G12 | e2e 视觉回归：用 Playwright 验证 ai-hitl 按钮颜色 + 4 类 demo 点击后 DOM 变化                                                                                        |

## Non-Goals

- 不改 `ai-prompts` / `ai-suggestions` / `ai-citations` / `ai-voice-input` / `ai-feedback` 等渲染器业务逻辑（仅补 demo wiring + 必要的渲染器微调）
- 不改 `themes-tokens` 包（只需让 playground 正确挂主题）
- 不动 `ai-welcome` 设计（产品决策：暂不增加 click handler）
- 不修 `ai-chat` 不传播 `ai-sender` event 的设计限制（保留 host 必须独立 mount sender 的现状，仅加 documentation 注释）
- 不动 `ActionScope namespace` 多实例冲突（R1-F5 已知问题，独立 plan 跟进）
- 不引入新的 schema 字段
- 不变更 component-lab C8.2 路由（已正确 wire）

## Scope

### In Scope

- `apps/playground/src/styles.css` `:root` 补 `--success` / `--warning` / `--info` / `--success-bg` / `--warning-bg` / `--info-bg` 定义（提供默认值）
- `apps/playground/src/main.tsx` 或 `apps/playground/index.html` 挂 `data-theme="classic" data-mode="light"` 到 `<html>` 或 `<div id="root">`
- `apps/playground/src/pages/ai-widgets-demo.tsx`：补 `ai-prompts.onSelect` / `ai-suggestions.onSelect` / `ai-voice-input.onResult` / `ai-feedback.onAction`（4 处）
- `apps/playground/src/ai/ai-p4-example.json`：补 `ai-prompts.onSelect` / `ai-suggestions.onSelect` / `ai-voice-input.onResult`
- `apps/playground/src/ai/ai-citations-example.json`：补 `ai-citations.onSourceClick` + 改 URL 为真实可访问地址（如 `https://github.com/...`）
- `packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx`：`unsupported` 时把 tooltip 改为默认可见 badge（`data-state` 驱动 sr-only 文本 + 视觉徽章）
- `apps/playground/src/pages/ai-widgets-demo.tsx` 在 `beforeMessages` 加 `ai-feedback` 实例
- `apps/playground/src/ai/ai-component-handle-example.json`：`ai-chat` 加 `min-w-0`
- `apps/playground/src/pages/ai-chat-demo.tsx` / `ai-conversations-demo.tsx` / `ai-tools-demo.tsx` / `ai-persistence-demo.tsx` / `ai-attachments-demo.tsx` 各 demo 补 `createReactMessageAdapter()`
- 新增 `apps/playground/src/component-lab/ai-clicks/` 受控 visual 断言 component-lab 路由（programmatic click → DOM 断言）
- `packages/flux-renderers-ai/src/__tests__/ai-prompts-onSelect.test.tsx` 等 4 个 focused 单测（mock onSelect + 触发 click + 验证 dispatch）
- `docs/references/quick-reference.md` 补 "AI demo 控件 wiring 必备事件" 节
- `docs/logs/2026/08-17.md` 本 plan 收口记录

### Out Of Scope

- `themes-tokens` 包本身（playground 端补默认值即可）
- `ai-welcome` click handler（产品决策）
- `ai-chat` 不传播 sender event 设计（独立 plan）
- `ActionScope namespace` 多实例冲突（R1-F5 独立 plan）
- `ai-feedback` 深入的 host 联动用例（component-lab 已覆盖）
- Component Lab 中 C8.2 路由（已正确 wire 无需改）

## Failure Paths

| 失败面                                          | 触发                              | 行为                                         | 可重试 | 用户可见                                                 |
| ----------------------------------------------- | --------------------------------- | -------------------------------------------- | ------ | -------------------------------------------------------- |
| 挂 `data-theme` 时 base-ui 组件样式变化         | main.tsx 注入 <html> 属性         | base-ui 影响 limited（依赖 var(--\*) token） | 否     | 视觉无显著变化（已有默认 `:root` 风格）                  |
| theme-tokens 已在 `:root` 改全局样式            | 引入 success/warning 变量         | 已有 `bg-success` 的 bar/badge 全部回绿      | 否     | HITL 按钮、token-usage 环、calendar success 标记全部正确 |
| demo JSON 接线后 host action 找不到             | onSelect 引用的 action 不在注册表 | 静默 no-op（保留现状）                       | 是     | 接 console.error 或 runtime 告警                         |
| `min-w-0` 调整破坏 ai-component-handle 其它布局 | 现有 flex 已收窄                  | 验证 demo schema 整体可见                    | 否     | 输入框正常                                               |
| `createReactMessageAdapter` 引入新副作用        | adapter 缓存快照                  | 消除无限 render loop 警告                    | 否     | console 干净                                             |
| ai-voice-input badge 视觉冲突                   | 与 mic icon 重叠                  | 放在 `<span>` 旁且 toggle 类                 | 否     | headless 显式可见                                        |

## Test Strategy

档位：**必须自动化**

- Phase 1（playground CSS）：新增 spec 验证 `getComputedStyle(hitl-approve-button).backgroundColor !== 'rgba(0, 0, 0, 0)'`
- Phase 2（demo wiring）：4 个 focused 单测覆盖 `ai-prompts` / `ai-suggestions` / `ai-citations` / `ai-voice-input` 渲染器（mock `events.onSelect`/`onSourceClick`/`onResult` → 触发 click → 验证 payload）
- Phase 3（component-lab）：1 个新 visual 路由 `ai-clicks-demo` 启用 4 个 widget + wire 真实 `onSelect` → setValue + showToast，e2e 点 → 断言 DOM 改动
- Phase 4（createMessageEngine）：singleton 验证 console 警告消失（warning count 0）
- Phase 5（layout）：e2e 验证 `ai-component-handle` 输入框在 1440x900 视口完整可见（`input.boundingBox().width > 400`）
- 全量：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` 收口

## Execution Plan

### Phase 1 — playground 主题挂载 + theme token 兜底

Status: completed
Targets: `apps/playground/src/styles.css` / `apps/playground/src/main.tsx` / `apps/playground/index.html`

- Item Types: `Fix`

- [ ] `apps/playground/src/styles.css` `:root` 补 `--success: 160 84% 39%;` / `--warning: 38 92% 50%;` / `--info: 199 89% 48%;` / 对应 `-bg` 衍生（与 theme-tokens classic light 默认一致）
- [ ] `apps/playground/src/main.tsx` 在 `initFluxI18n` 后调 `document.documentElement.setAttribute('data-theme', 'classic')` 和 `data-mode='light'`（保留后续切 dark mode 通路）
- [ ] 启动 dev server，验证 `getComputedStyle(hitl-approve-button).backgroundColor` 解析为 `hsl(160 84% 39%)` 类有效色

Exit Criteria:

- [ ] `apps/playground/src/styles.css` `:root` 含 6 个变量定义（搜索 `--success` 出现≥2 处：@theme inline + 实际值）
- [ ] `apps/playground/src/main.tsx` 含 `setAttribute('data-theme', 'classic')` 与 `data-mode='light'`
- [ ] dev server 启动后 `npx playwright open http://localhost:5173/#/ai-hitl` 视觉验证 Approve 按钮显示绿色背景 + 白色 "批准"

### Phase 2 — ai-prompts / ai-suggestions / ai-citations / ai-voice-input demo wiring

Status: completed
Targets: `apps/playground/src/pages/ai-widgets-demo.tsx` / `apps/playground/src/ai/ai-p4-example.json` / `apps/playground/src/ai/ai-citations-example.json`

- Item Types: `Fix`

- [ ] `ai-widgets-demo.tsx` inline schema `ai-prompts` 补 `onSelect: { action: 'setSenderDraft', args: { text: '${item.label}' } }`（注：demos 是 schema-driven，setSenderDraft 需 host 实现或 fall back to `dispatch`）
- [ ] `ai-widgets-demo.tsx` inline schema `ai-suggestions` 补 `onSelect: { action: 'setSenderDraft', args: { text: '${item.text}' } }`
- [ ] `ai-p4-example.json` 同步补 `ai-prompts.onSelect` / `ai-suggestions.onSelect`
- [ ] `ai-citations-example.json` 两个 `ai-citations` 块补 `onSourceClick: { action: 'showToast', args: { description: 'Open ${source.title} (${source.url})' } }`
- [ ] `ai-citations-demo.tsx` 数据提供：把 `https://example.com/design` 改为真实 `https://github.com/nop-chaos/flux-renderers-ai` / `https://github.com/nop-chaos/flux-renderers-ai/blob/main/docs/architecture/ai/engine.md` 等可访问地址
- [ ] `ai-widgets-demo.tsx` 给 `ai-voice-input` 补 `onResult: { action: 'setSenderDraft', args: { text: '${transcript}' } }` + `onError: { action: 'showToast', args: { description: 'voice-error: ${reason}' } }`

Exit Criteria:

- [ ] 4 个 demo JSON 全部 grep `onSelect` / `onSourceClick` / `onResult` 命中（针对 4 个 widget）
- [ ] 新增 `packages/flux-renderers-ai/src/__tests__/ai-prompts-onSelect.test.tsx` / `ai-suggestions-onSelect.test.tsx` / `ai-citations-onSourceClick.test.tsx` / `ai-voice-input-onResult.test.tsx` 4 个 focused 单测，全部 red→green
- [ ] dev server 启动后 e2e 验证 4 类 demo 点击 → DOM 变化（toast 出现 或 input 文本更新）

### Phase 3 — ai-voice-input unavailable badge 默认可见

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx`

- Item Types: `Fix`

- [ ] `ai-voice-input.tsx:295-304` 当前 `unsupported` 时只 wrap Tooltip；改为 render 一个 always-visible `<span data-slot="ai-voice-input-unavailable-badge">` 标记 + 保留 Tooltip
- [ ] 调整 `unsupported` 视觉使其不遮挡 mic icon（e.g. `<span>` 放在按钮外侧）
- [ ] 同步 i18n key 复用 `flux.ai.voiceUnsupported` 文案

Exit Criteria:

- [ ] headless dev server 截图 `ai-voice-input` 区域可见 "语音不可用" 类徽章（无需 hover）
- [ ] 新增 `packages/flux-renderers-ai/src/renderers/__tests__/ai-voice-input-unavailable.test.tsx`（断言 `[data-slot="ai-voice-input-unavailable-badge"]` 出现）

### Phase 4 — ai-widgets-demo 补 ai-feedback 实例

Status: completed
Targets: `apps/playground/src/pages/ai-widgets-demo.tsx`

- Item Types: `Fix`

- [ ] `ai-widgets-demo.tsx` schema 在 `beforeMessages` 区域加 `ai-feedback` 块（参考 `data-c8-2-host.ts:219-233` 范式）
- [ ] 提供 mock `{ id: 'm_fb', role: 'assistant', content: 'demo feedback widget' }` 消息
- [ ] `onAction: { action: 'showToast', args: { description: 'feedback: ${action} on ${message.id}' } }`

Exit Criteria:

- [ ] dev server 启动后 `ai-widgets` 页面截图可见 `ai-feedback` 5 按钮（copy / refresh / like / dislike / sources）
- [ ] 视觉回归：每一个按钮点击都有 toast / 内部状态变化

### Phase 5 — ai-component-handle 输入框布局修复

Status: completed
Targets: `apps/playground/src/ai/ai-component-handle-example.json`

- Item Types: `Fix`

- [ ] `ai-component-handle-example.json:35` `ai-chat` `className` 改为 `flex flex-col flex-1 min-h-0 min-w-0 gap-2`
- [ ] 验证例：`ai-chat` 父 container `direction: "col"`（schema 已确认），故 `min-w-0` 主要影响嵌套 flex 子项的横轴收缩

Exit Criteria:

- [ ] dev server 启动后 `ai-component-handle` 页面发送框（input + 发送按钮）完整可见（`page.locator('input').boundingBox().width > 400`）
- [ ] 截图视觉对比：fix 前（输入框被裁切）→ fix 后（输入框完整）

### Phase 6 — createMessageEngine 补 React adapter

Status: completed
Targets: 各 demo `createMessageEngine` 调用点

- Item Types: `Fix`

- [ ] `apps/playground/src/ai/mock-ai-env.ts` 检查并确认是否需要补 adapter（若已有统一封装，只改 mock-ai-env）
- [ ] 实际调用点可能不止 5 个 demo —— grep `createMessageEngine`（不带 React）所有出现处
- [ ] 改造方案：构建 `createMockAiEnv` 时内部统一创建 `createReactMessageAdapter()` 并传入 `createMessageEngine`

Exit Criteria:

- [ ] grep `createMessageEngine(`（不跟 `, createReactMessageAdapter`） 在 `apps/playground/src/` 命中 0
- [ ] dev server 启动后跨 5+ demo 路由跳转，无 `MessageEngine.getState() returns a new snapshot reference` 警告

### Phase 7 — component-lab 视觉回归 + 全量验证

Status: completed
Targets: `apps/playground/src/component-lab/` + 全量回归

- Item Types: `Proof`

- [ ] 新增 `apps/playground/src/component-lab/ai-clicks/ai-clicks-demo.tsx` 路由（注册到 `ai-renderer-routes.ts` + `App.tsx`），mount 4 个 widget + wire 真实 `onSelect` → setValue + showToast
- [ ] 编写 `tests/e2e/ai-clicks-demo.spec.ts` 覆盖：click prompt → sender input 文本更新；click suggestion → sender input 文本更新；click citation → toast 出现；click voice input badge → 可见
- [ ] 全量 `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`
- [ ] 全量 `pnpm check`（新增红 0）

Exit Criteria:

- [ ] 4 个 e2e 测试 red→green
- [ ] 全量回归 0 失败
- [ ] `pnpm check` 命中数与 baseline 一致（无新增红）

## Draft Review Record

- Reviewer / Agent: pending
- Verdict: pending
- Rounds: 0
- Findings addressed: none yet

## Closure Gates

- [ ] G1G2（G1 theme CSS + G2 HITL 按钮）Phase 1 diff 已落地并 e2e 验证
- [ ] G3G4G5 + G6G7 demo wiring Phase 2 + Phase 3 + Phase 4 全部 4 focused 单测 + 4 e2e pass
- [ ] G8 ai-feedback mount Phase 4 视觉确认
- [ ] G9 layout 修复 Phase 5 视觉确认
- [ ] G10 createMessageEngine adapter Phase 6 console 警告消失
- [ ] G11 4 个 focused 单测 red→green
- [ ] G12 e2e 视觉回归 4 it 全绿
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] `docs/references/quick-reference.md` 补充 "AI demo 控件 wiring 必备事件" 节
- [ ] 独立子 agent closure-audit （fresh session） 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### ai-chat 不传播 ai-sender schema event

- Classification: `watch-only residual`
- Why Not Blocking Closure: 当前所有 demo 内嵌 sender 通过 `ctx.sendMessage` 直接 work；schema event 不可触达不影响现有 demo 与 13 demo 用户面；属于 host 接入的扩展点而非 live defect
- Successor Required: `no`
- Successor Path: 后续 host 接入如需拦截 sender event，可独立 plan

### ai-welcome 无 click handler

- Classification: `watch-only residual`
- Why Not Blocking Closure: 当前 `ai-welcome` 是纯展示面板，13 demo 中作为空态正常显示；用户可能误把 icon/标题当成可点击，但 demo 描述（"Welcome to AI Widgets"）明示这是空态，不构成 dead click
- Successor Required: `no`
- Successor Path: 若 PM 决定 welcome panel 应可点击（如 "Click to start"），独立 plan

### ActionScope namespace 多实例冲突

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: R1-F5 已知问题（`docs/analysis/2026-08-10-2245/round-01.md`）；仅在多 chat 实例场景发生，本批 13 demo 都是单 chat 实例
- Successor Required: `yes`
- Successor Path: 独立 plan 跟进 namespace 按 cid 派生

### theme-tokens 全量集成 + dark mode 切换

- Classification: `optimization candidate`
- Why Not Blocking Closure: Phase 1 补默认值已满足当前 demo 视觉；后续 dark mode 切换由独立 UX 计划推进
- Successor Required: `no`
- Successor Path: 后续 theme 系统集成独立 plan

## Non-Blocking Follow-ups

- 把 13 demo 的 fullPage 截图接入 playwright visual regression 自动化（首现 `/tmp/screenshots/ai/`）
- `docs/references/quick-reference.md` 增 `ai-prompts` / `ai-suggestions` / `ai-citations` / `ai-voice-input` schema event 字段表

## Closure

Status Note: pending
Closure Audit Evidence: pending
Follow-up: pending — 仅记录 non-blocking follow-up；confirmed live defect 不得出现在这里

## Optional Sections

### Problem

参见 `docs/analysis/2026-08-17-ai-control-display-analysis.md` 与 `docs/analysis/2026-08-17-ai-dead-buttons-analysis.md` 完整描述。

### Root Cause

- Phase 1 根因：`apps/playground/src/styles.css:53-80` `:root` 没定义 `--success` / `--warning` / `--info`；theme-tokens 提供在 `[data-theme]` 选择器内但 playground 没挂该属性
- Phase 2 根因：demo JSON 编写时漏挂 `onSelect` / `onSourceClick` / `onResult` 块；渲染器 `events?.onSelect?.()` 可选链 no-op；单元测试 `mockProps` 直构造 props 不走 schema→registry 链路未发现
- Phase 3 根因：`ai-voice-input.tsx:295-304` 仅 wrap Tooltip，无默认可见 UI 标记
- Phase 4 根因：`ai-widgets-demo` schema 没 mount `ai-feedback`
- Phase 5 根因：`ai-component-handle-example.json:35` `ai-chat` 缺 `min-w-0`
- Phase 6 根因：各 demo `createMessageEngine` 漏传 `createReactMessageAdapter()`

### Risks And Rollback

- Phase 1：挂 `data-theme="classic" data-mode="light"` 可能影响既有 base-ui 组件样式（依赖 var(--\*) token）→ 风险低（playground 自有 `:root` 已覆盖大部分），回滚：移除 `setAttribute` 即可
- Phase 2：demo JSON 接线引用 `setSenderDraft` / `showToast`，需 host 实现；如果宿主 demo PageCode 不支持，会 no-op。但渲染器行为不变，rollback 仅恢复 demo JSON
- Phase 3：unavailable badge 视觉变化 → 风险低（仅 headless 可见），rollback 恢复 Tooltip 即可
- Phase 4：补 `ai-feedback` → 不影响现有 demo 行为，仅增加可见 widget
- Phase 5：`min-w-0` 仅影响 flex 子项收缩 → 风险低，rollback 去掉 min-w-0
- Phase 6：传 adapter → 消除警告 + 缓存快照；回滚：去除 adapter（恢复原状态）

### Outdated Note

不适用 — 本 plan 为新建 plan，无 outdated baseline。

### Supersession Note

不适用 — 本 plan 不替换既有 plan；仅收口 13 demo 的视觉 + dead-click 面。

### Documentation Follow-Up

- `docs/references/quick-reference.md` 补 "AI demo 控件 wiring 必备事件" 节（Phase 7 收口前）
- `docs/logs/2026/08-17.md` 收口记录本 plan
- 本 plan 中的 deferred 项不再生成独立 plan 文件
