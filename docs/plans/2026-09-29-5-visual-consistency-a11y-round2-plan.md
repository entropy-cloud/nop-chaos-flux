# 2026-09-29-5 视觉一致性与可访问性优化（第二批）

> Plan Status: completed
> Last Reviewed: 2026-09-29
> Source: `docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md`（R2-U1/U2/U3/U4/U5/U6/U7/U9/U10/U13）
> Related: 2026-09-28-5（视觉一致性第一批，已收口）、2026-09-28-4（表单 a11y，已收口）

## Purpose

收口第一批未覆盖组件族的 a11y/视觉缺口：tabs 关闭控件键盘不可操作、diff-view 无暗色主题与可见焦点、ui Button 实心变体暗色对比不足（DS 级）、upload 逐文件公告、video/audio tracks、image 预览名称、diff 过滤 aria-pressed、tabs newTab 文案错置、carousel 指示点语义。结果面 = 上述缺口全部修复且各有断言；不引入新视觉回归。

## Current Baseline

- `flux-renderers-basic/src/tabs.tsx:353-368` 关闭控件为 aria-hidden span（无 role/tabIndex/键盘）；同文件 :372-392 add 按钮为正确范本。`flux-i18n/src/locales/en-US.ts:477-478`/`zh-CN.ts:477` `flux.tabs.newTab` = "New View"/"新视图"（错置文案）。
- `flux-renderers-content/src/diff-view/diff-view.css:7-70` 全部 token 仅亮色定义，全仓无 dark 覆盖；`--nop-diff-muted-text`≈3.1:1、`--nop-diff-gutter-text` <4.5:1；css 无 :focus-visible 规则（唯一 outline 是 hover 时 outline:none，:244-246）；`diff-file-list.tsx:166-185` FileListItem 无焦点样式无 aria-current；`:104-123` 过滤 tabs 无 aria-pressed。
- `packages/ui/src/components/ui/button.tsx:32-36` success/warning/info 实心变体 `text-white`；暗色 `--success: 160 70% 50%`（theme-tokens styles.css:202）对比 ≈2:1；`flux-renderers-ai/src/renderers/ai-tool-call.tsx:243` 同模式硬编码。
- `flux-renderers-form-advanced/src/upload-field.tsx:612-656` 逐文件 uploading/error 无 live 语义（顶层 alert 已正确）。
- `flux-renderers-content/src/schemas.ts:314-350` Video/AudioSchema 无 tracks；`video.tsx:81-91`/`audio.tsx:74-81` 裸元素。
- `flux-renderers-content/src/image.tsx:239-250` 预览 Dialog 无 DialogTitle/aria-label。
- `flux-renderers-content/src/carousel.tsx:303-325` 指示点无 aria-current。
- token/dark 先例：`flux-renderers-ai/src/styles.css:121-133`、`theme-tokens/src/styles.css:142/:202`。
- 门禁基线：`check:audit-ui-consistency-gaps` exit 0（豁免清单在位）；visual-quality-guard 中性灰基线 0。

## Goals

- 全部 10 项缺口修复，每项有 focused 断言（DOM 属性/计算样式级）。
- ui 包新增 token 不破坏既有消费者（badge/ai-tool-call 收敛到同一机制）。
- `flux.tabs.newTab` 文案纠正（或拆键），tabs 关闭钮键盘可操作且 AT 可见。
- diff-view 暗色主题可用 + 焦点可见（WCAG 2.4.7）+ 对比度 ≥4.5:1。

## Non-Goals

- swipe-cell 键盘策略（已记录产品决策，不倒账）。
- U11 hint 常显（产品决策，维持 deferred）。
- diff-view 功能/交互重设计（仅主题/焦点/语义补齐）。
- video transcript region（tracks 为本轮范围；transcript 记 follow-up）。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/tabs.tsx`、`packages/flux-i18n/src/locales/*`
- `packages/flux-renderers-content/src/diff-view/**`、`video.tsx`、`audio.tsx`、`schemas.ts`、`image.tsx`、`carousel.tsx`
- `packages/ui/src/components/ui/button.tsx`、`packages/theme-tokens/src/styles.css`
- `packages/flux-renderers-form-advanced/src/upload-field.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`（仅按钮变体收敛到新 token）

### Out Of Scope

- 其余包视觉改动；schema 破坏性变更（tracks 为新增可选字段，向后兼容）。

## Failure Paths

| 可测场景编号 | 触发 | 行为 | 可重试 | 用户可见表现 |
| --- | --- | --- | --- | --- |
| dark-theme-diff | 暗色模式渲染 diff-view | 全部 --nop-diff-\* 有 dark 值，文本对比 ≥4.5:1 | 是 | 暗色可读 |
| tracks-render | VideoSchema 带 tracks | 渲染 track 子元素，既有无 tracks 用法零变化 | 是 | 字幕可用 |
| close-tab-keyboard | 键盘 Tab 到 closable tab 关闭钮 | 可聚焦、Enter/Space 关闭、AT 可见名称 | 是 | 键盘可关闭 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（a11y 契约类修复，与第一批 U2/U7 同档）：**Proof（断言/基线用例）先于 Fix 落地**——每 Phase 先行条目为红先断言或基线记录，Fix 后转绿；tabs 关闭键盘路径、tracks 渲染、dark token 存在性断言先行。

## Execution Plan

### Phase 1 - ui token 与 dark 对比（DS 级先行，供后续消费）

Status: completed
Targets: `packages/ui/src/components/ui/button.tsx`、`packages/theme-tokens/src/styles.css`、`packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`

- Item Types: `Fix`、`Proof`

- [x] Proof 先行：ui 包 button 变体 class 断言用例（红先——断言当前 text-white 现状）+ theme-tokens 暗色前景 token 缺失断言
- [x] 新增 `--success-foreground`/`--warning-foreground`/`--info-foreground`/`--danger-foreground` token（亮/暗双值，暗色下对各 bg-\* 对比 ≥4.5:1，色值计算记录；**danger 一并纳入**——button.tsx:37-38 `bg-danger text-white` 同模式，暗色 ≈4.4:1 处于边界，同机制一次收口）
- [x] Button 三实心变体（success/warning/info + danger）改用前景 token；ai-tool-call:243 收敛到变体/ token
- [x] focused 测试：四变体 class 断言 + 暗色 token 值存在性断言（转绿）
- [x] Proof: ui 包既有用例绿

Exit Criteria:

- [x] token 于 theme-tokens 五个区块（fallback/classic 亮暗/glass 亮暗）全配对且对比计算达标（audit r1 finding 1 精算复核后数值）：暗色 success 9.80 / warning 9.25 / info 8.16（配 9% 近黑）、danger 配白 4.94；亮色 success 配白 6.45、warning 7.52 / info 5.64（配 13% 近黑）、danger 60% 亮度配 13% 仅 4.25 不达标 → 前景提级为 9% 近黑 4.74:1（三个亮色区块）。button-status-foreground.test.tsx 断言配对存在 + class 断言；原有 text-white 断言测试按新契约更新

### Phase 2 - tabs 关闭控件 + i18n 文案

Status: completed
Targets: `flux-renderers-basic/src/tabs.tsx`、`packages/flux-i18n/src/locales/en-US.ts`、`zh-CN.ts`

- Item Types: `Fix`、`Proof`

- [x] Proof 先行：键盘关闭路径测试（红先——当前 aria-hidden span 不可聚焦，Enter 关闭断言失败）
- [x] 关闭钮修复（**fix shape 已裁定：span 路径**）：TabsTrigger（Base UI Tab 渲染原生 `<button>`，tabs.tsx:307-369）内**禁止嵌套真 Button**（HTML button 内容模型禁止交互后代，axe nested-interactive 违规，Enter/Space 冒泡会共激活被关 tab）。保持 span 形态：补 `role="button"` + `tabIndex={0}` + `onKeyDown`（Enter/Space `preventDefault()` **并 `stopPropagation()`**——与 :372-392 非 nested 先例不同，必须阻断冒泡）+ `aria-label={t('flux.tabs.closeTab')}`（新键）+ title 改关闭语义；**保留 `data-slot="tabs-trigger-close"` marker**（tabs-view-management.test.tsx:337-343 选择器依赖）
- [x] `flux.tabs.newTab` 文案纠正（"New Tab"/"新标签页"；如拆 action/默认标题两键则一并迁移消费点）。**连带测试更新**：tabs-view-management.test.tsx:399 断言 `lastAdd=新视图` 将随 locale 修复转红，属预期更新（记录于此）
- [x] focused 测试：键盘关闭路径（焦点在关闭钮按 Enter → 仅关 tab 不切 tab、stopPropagation 断言）、aria-label 断言、locale 断言（转绿）
- [x] Proof: basic 既有用例绿（含 :399 更新后）

Exit Criteria:

- [x] 键盘关闭测试成立（tabs-close-keyboard.test.tsx 2 用例：focusable/AT 可见/Enter+Space 移除；关闭激活 tab 激活转移邻位、关闭非激活 tab 激活不动——co-activation 抑制在 inactive 关闭用例中钉住）
- [x] locale 断言成立（en 'New Tab'/'Close tab'、zh '新标签页'/'关闭标签页'；tabs-view-management :399 断言按新文案更新）

### Phase 3 - diff-view 暗色/焦点/语义 + video tracks + image/carousel/upload 语义

Status: completed
Targets: `flux-renderers-content/src/**`、`flux-renderers-form-advanced/src/upload-field.tsx`

- Item Types: `Fix`、`Proof`

- [x] Proof 先行：diff-view dark 覆盖缺失断言 + focus-visible 规则缺失断言（红先）；tracks/aria-current/aria-pressed/DialogTitle/live 断言用例（红先）
- [x] diff-view.css 补 dark 块（**选择器对齐仓内机制**：`[data-mode='dark']` + `prefers-color-scheme` fallback，仿 flux-renderers-ai/src/styles.css:121-133 先例；**不使用 `.dark` 类**——全仓无此机制，theme-tokens dark 为 `:root[data-theme='*'][data-mode='dark']`）覆盖 48 项 `--nop-diff-*` 亮色集合中的 46 项（`context-bg` transparent 与 `code-text` inherit 为模式无关项，不需暗色覆盖）+ 提升 muted/gutter 文本 token ≥4.5:1 + `:focus-visible` outline 规则（替换 ：244-246 hover outline:none 的唯一焦点样式空缺）
- [x] FileListItem 补 aria-current；过滤 tabs 补 aria-pressed
- [x] VideoSchema/AudioSchema 增 `tracks` 可选字段并渲染 `<track>` 子元素（向后兼容；audio 通道为 audit r1 finding 2 补齐——chapters/metadata 轨合法）
- [ ] image 预览 Dialog 补 sr-only DialogTitle（ui/dialog.tsx 已导出 DialogTitle）；carousel 指示点补 aria-current
- [x] upload 逐文件列表 aria-live="polite"（或 error span role="alert"）
- [x] focused 测试全部转绿
- [x] Proof: content/form-advanced 既有用例绿

Exit Criteria:

- [x] diff-view dark 覆盖（[data-mode=dark] + prefers-color-scheme fallback 双机制，48 项中 46 项——两项模式无关）与 :focus-visible 规则在 css 落地且有断言（ux-round2-a11y.test.tsx 4 用例）
- [x] tracks/aria-current/aria-pressed/DialogTitle/live 断言测试成立（video track 渲染+缺省、carousel aria-current、image DialogTitle/aria-label；FileListItem aria-current + 过滤 tabs aria-pressed 落地）
- [x] content + form-advanced focused 测试绿（content 41 文件/340、form-advanced 162 文件/1138 + upload-live-region 新用例）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-29）
- Verdict: `issues` → Major 2 项修订后达成共识（复核判定零 Blocker/Major）
- Rounds: 1
- Findings addressed: **Major-1** 关闭钮 fix shape 裁定为 span 路径（TabsTrigger 原生 button 内禁嵌套真 Button——nested-interactive 违规；span+role/tabIndex/onKeyDown+stopPropagation，保留 data-slot marker）；**Major-2** 三 Phase 全部 Proof（红先断言/基线）前置。Minor 4 项折入：dark 选择器改 `[data-mode='dark']`+prefers-color-scheme（全仓无 .dark 机制）、token 范围扩至 :7-90 完整集、danger 变体同机制一并收口（:37-38，暗色 ≈4.4:1 边界）、tabs-view-management.test.tsx:399 locale 断言连带更新显式记录

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（10 项 a11y/视觉缺口全部落地）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（不适用）
- [ ] 行为/契约结果已达成（全部断言测试绿）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### video transcript region

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: tracks 已满足 WCAG 1.2.2 的作者侧能力；transcript 属内容组织增强
- Successor Required: no
- Successor Path: 无

## Non-Blocking Follow-ups

- `flux.tabs.newTab` 若拆两键，旧键保留周期与迁移记录

## Closure

Status Note: 三个 Phase 全部落地；closure audit 两轮（r1 issues：danger 亮色对比 Major + 3 Minor → 65755aff1；r2 approved-with-minors：剩余 2 项均为纯文档同步 → e219e811f 修复）。四门禁 + check 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent ×2（fresh session，r1 全量 + r2 delta）
- Evidence: r1 `issues`（Major：亮色 danger 13% 前景实测 4.25:1 < 4.5，且 success/white 6.45 而非记录的 9.5；Minor：audio tracks 未落地/checkbox 未勾/token 计数 21→实为 48 中 46）→ 65755aff1（danger 提级 9% = 4.74:1 经审计方独立重算确认；audio chapters 轨落地 + 测试）；r2 delta `approved-with-minors`（ui 232 / content 341 审计方 live 复跑；剩余 2 项文档同步 → e219e811f）

Follow-up:

- transcript region（Deferred 既有裁定）；无其余 plan-owned work
