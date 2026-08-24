# 01 D0 产品标准基线（fixture 设计与 typography 决策）

> Plan Status: active
> Last Reviewed: 2026-08-24
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D0；`docs/analysis/2026-08-23-ai-widgets-vs-tiny-robot-comparison.md` §6–§7；`docs/skills/ux-design-pattern-audit-prompt.md`
> Mission: ai-widgets-product
> Work Item: D0
> Related: `docs/plans/2026-08-24-1045-2-d1-rich-markdown-fixture.md`、`docs/plans/2026-08-24-1045-3-d2-markdown-typography-css.md`（两者以本 plan 产物为设计输入）

## Purpose

把「`# /ai-widgets` 产品级化」从主观判断落成一份可执行的产品标准文档：为 D1（fixture 内容）、D2（typography CSS）、D3（avatar / welcome icon）提供唯一设计输入，避免后续各 phase 各自凭感觉定标准。

## Current Baseline

（2026-08-24 live 核实）

- 代码现状与 roadmap「当前基线」逐项一致：
  - `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:40` 挂 `prose prose-sm max-w-none break-words dark:prose-invert`；`@tailwindcss/typography` 全仓 0 引入（仅 mission 描述文本提及）→ prose 是死样式（G2 成立）
  - `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:134` 为空 avatar div（G3）；`packages/flux-renderers-ai/src/renderers/ai-welcome.tsx:24-27` 将 `icon` 字符串字面渲染（G8）
  - `apps/playground/src/ai/mock-ai-env.ts:25` `CANNED_REPLY_WORDS` 8 词（G1）；`createMockAiEnv()` 无参数，全 playground 13 处调用点（12 个 `pages/ai-*-demo.tsx` + `component-lab/renderers/data-c8-1-host.ts:31`）均零参
  - e2e：13 个 `tests/e2e/ai-*.spec.ts`；`ai-widgets-demo.spec.ts` 10 测试全 DOM 结构断言（G12）；其中 `:98-114` 发送 `'widgets test'` 断言回复含 `'Hello'` —— D1 default fixture 必须兼容（已在 D1 plan 记录）
  - `packages/flux-renderers-ai/src/styles.css` 126 行，无 typography 规则、无 `prefers-color-scheme` / `data-mode` 规则
- 主题双轴：`docs/architecture/theme-compatibility.md:165` 使用 `:root[data-theme='classic'][data-mode='dark']`；roadmap 已裁定 ai-bubble typography 走 `[data-mode='dark']` 单轴 + `@media (prefers-color-scheme: dark)` 双触发（ai-bubble 不感知 theme variant）
- G5 LaTeX supersession 已由 2026-08-23 human gate 裁定并写入 owner-doc（`design.md` §10.4 / `improvement-analysis.md` §4.2 / plan A3），D0 不再重新讨论「是否内置」
- `docs/components/flux-renderers-ai/` 现有 design.md / renderers.md / engine.md / implementation.md / improvement-analysis.md / audit.md；`product-spec.md` 尚不存在。本 plan 是 ai-widgets-product roadmap 的第一个 plan。

## Goals

- `docs/components/flux-renderers-ai/product-spec.md` 落地。与 `design.md` 的分工：design.md 描述引擎/renderer 架构不变式；product-spec.md 只描述本 roadmap 范围内 showcase 的**目标态标准**。至少包含 7 类内容：
  1. **UX 诊断结论**：按 `docs/skills/ux-design-pattern-audit-prompt.md` 对 `# /ai-widgets` 现状诊断，结论映射到 G1–G12（以 `docs/analysis/2026-08-23-ai-widgets-vs-tiny-robot-comparison.md` 为证据基线引用，不重写该分析）
  2. **Typography CSS 设计决策**：自定义 `[data-slot="ai-bubble-markdown"]` scoped CSS 方案；拒绝 `@tailwindcss/typography` 的体积依据（roadmap 实测：tarball ~25-30KB / unpacked ~78KB / gzip ~17KB，违反包体积纪律）；dark 双触发规则；排版节奏表（标题层级 scale / 段落行距 / 列表缩进 / 引用样式 / 表格分隔 / 代码块背景，数值映射到既有 CSS variables，如 `--muted` / `--muted-foreground` / `--border` / `--background`）
  3. **Avatar / icon 规格**：气泡 avatar 32×32 圆形 lucide（`Bot` / `User` 按 role）+ 背景与 1px border 的 token 取值；welcome icon lucide 预设映射表（含字符串回退的向后兼容口径）
  4. **Fixture 内容标准**：恰好 11 种 markdown 元素清单（本 plan 裁定项）；6 个 preset 内容大纲（关键词 `weather` / `code` / `formula` / `reasoning` / `citation` / 默认 default），每个 preset 给出语义场景 + 所覆盖元素；11 元素在 6 preset 全集上每元素 ≥1 次；default preset 开头词须为 `Hello`（兼容 `ai-widgets-demo.spec.ts:111` 既有断言）
  5. **流式节奏基线**：widgets demo `delayMs=200`、其余 demo 默认 15ms（G10 口径）
  6. **Showcase 完整性口径**（供 D5）：首屏可见 widget ≥ 8 的计数口径与 widget 清单
  7. **DV 断言清单**（供 DV）：typography / avatar / icon / 副作用 / fixture / 高亮各面的程序化断言基线（`getComputedStyle` / DOM 结构 / `getBoundingClientRect`，不做肉眼截图判定）

## Non-Goals

- 不改任何代码、不安装任何依赖（纯文档 plan）
- 不讨论 LaTeX 是否内置（supersession 已裁定，D6 直接执行）
- 不回写 `design.md` / `renderers.md`（owner-doc 同步统一归 DG；G11 补 `ai-bubble-typography` 段也归 DG）
- 不做 tiny-robot 像素级复刻——spec 是产品标准，不是克隆规格

## Scope

### In Scope

- `docs/components/flux-renderers-ai/product-spec.md`（新文件，全部 7 类章节）
- 诊断结论表直接写进 spec 诊断章节，不另立 analysis 文件

### Out Of Scope

- `docs/components/flux-renderers-ai/design.md` / `renderers.md` 的任何修改
- D1–D6 的实现细节（fixture 文本最终稿、CSS 具体规则行、组件代码）
- `docs/analysis/` 历史文档回写（plan guide Rule 21）

## Failure Paths

不适用：纯文档计划，无错误契约面。

## Test Strategy

不适用：纯文档计划，无行为变更（按 plan guide 模板注记，Closure Gates 移除 pnpm 验证项）。

## Execution Plan

### Phase 1 - UX 诊断与设计决策记录

Status: planned
Targets: `docs/components/flux-renderers-ai/product-spec.md`（诊断 + 决策章节）

- Item Types: `Decision`

- [ ] 按 `docs/skills/ux-design-pattern-audit-prompt.md` 对 `# /ai-widgets`（playground 实跑 + 源码走读）做诊断，产出「现状问题 → G1–G12」映射表写入 spec 诊断章节
- [ ] 记录 typography 决策：自定义 scoped CSS 方案 + 拒绝 typography 插件的体积依据 + dark 双触发规则
- [ ] 记录 avatar / welcome icon 规格（32×32 圆形 / lucide 按 role 映射 / 字符串回退口径）
- [ ] 记录 fixture 命名裁定：关键词用 `formula`（非 `math`）及理由（对齐 D6 KaTeX 渲染产物语义）

Exit Criteria:

- [ ] spec 文件已创建，「诊断与决策」章节包含上述四类记录（文件内可直接核对）

### Phase 2 - 产品标准成文与一致性核对

Status: planned
Targets: `docs/components/flux-renderers-ai/product-spec.md`（全 7 类章节）

- Item Types: `Decision | Proof`

- [ ] 裁定并写出恰好 11 种 markdown 元素清单（建议基线：标题、段落、无序列表、有序列表、任务列表、引用块、围栏代码块、行内代码、链接、表格、分隔线；`img` / `strong` / `em` 计为附加项——最终以 spec 裁定为准，D1/D2 以裁定结果为契约）
- [ ] 写出 6 preset 内容大纲（每 preset：语义场景 + 覆盖元素 + 触发关键词；11 元素全集覆盖矩阵每元素 ≥1；default preset 开头词 `Hello`）
- [ ] 写出排版节奏表（元素 → 规则要点 → CSS variable 映射）+ 流式节奏基线 + showcase 计数口径 + DV 断言清单
- [ ] 一致性核对：已起草的 D1 / D2 plan 所引用的每一项 spec 输入 + roadmap §D3（avatar / welcome icon 规格；D3 plan 尚未起草，以 roadmap 细节为准）所需输入，都能在 spec 中找到对应章节（逐项列出核对结果，作为本 plan 收口证据）

Exit Criteria:

- [ ] `docs/components/flux-renderers-ai/product-spec.md` 存在且 Goals 列出的 7 类内容齐备
- [ ] 11 项 markdown 元素清单 + 6 个 fixture preset 内容大纲 + typography CSS 决策记录三项 D0 判定物齐备（roadmap D0 完成判定）
- [ ] 一致性核对逐项通过（D1/D2 plan + roadmap §D3 输入无悬空引用）

## Draft Review Record

- Reviewer / Agent: fresh session `ses_fce520033ffeu1H3GAF2AVudq6`（2026-08-24）
- Verdict: `pass`
- Rounds: 1
- Findings addressed: （Minor，不阻塞，已顺手修正）① 调用点计数 14→13（12 个 pages + component-lab 1 处）；② 「D3 plan」引用改为「roadmap §D3（D3 plan 尚未起草）」避免悬空引用

## Closure Gates

> 纯文档计划：`pnpm typecheck` / `build` / `lint` / `test` 按模板注记移除，不适用。

- [ ] `product-spec.md` 存在且 7 类章节齐备（诊断映射 / typography 决策 / avatar 规格 / fixture 标准 / 节奏基线 / showcase 口径 / DV 断言清单）
- [ ] roadmap D0 三项判定物齐备：11 元素清单 + 6 preset 大纲 + typography CSS 决策记录
- [ ] D1/D2 plan + roadmap §D3 输入一致性核对通过（无悬空引用）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无——D0 产物全部被 D1–D6/DV 消费，无 deferred 项）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link>>

Follow-up:

- 明确写 no remaining plan-owned work（D0 无代码变更，无 deferred 项）
