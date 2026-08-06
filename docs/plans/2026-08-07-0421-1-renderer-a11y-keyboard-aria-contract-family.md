# 1 渲染器 a11y 键盘与 ARIA 语义契约族修复（11-01/11-02/20-01..20-10）

> Plan Status: completed
> Mission: component-audit
> Work Item: Follow-up Backlog a11y 键盘与 ARIA 语义契约族（11-01 / 11-02 / 20-01 / 20-02 / 20-03 / 20-04 / 20-05 / 20-06 / 20-07 / 20-08 / 20-09 / 20-10）
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（维度 11/20，12 条 P2）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 2026-08-06-0711 节）
> Related: `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md`（completed，事件 ctx 家族）、`docs/components/carousel/design.md`（20-03 对照先例）、`docs/components/infinite-scroll/design.md`（20-02 对照先例）

## Purpose

把 Follow-up Backlog 中维度 11（2 条）与维度 20（10 条）的可访问性契约发现一次性收口：12 条均为 WCAG Level A/AA 或 ARIA 语义确定性失败（键盘可达性、焦点可见、live region、accessible name、角色-内容结构匹配、roving tabindex、暂停机制），涉及 7 个渲染器包（data/mobile/layout/form-advanced/form/ai/content）11 个组件。修复方式以「同仓正确先例 + ARIA/APG 规范」为基准，test-first 落地 DOM 契约断言，消除读屏/键盘用户的可观察缺陷。

## Current Baseline

- **12 条发现全部 open**（roadmap Follow-up Backlog 2026-08-06-0711 节，未勾选），来源审计 `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`，维度复核全部通过（无 R2 翻案）。
- **对照先例已确认存在**（live 核对）：20-02 对照 mobile `infinite-scroll.tsx:232-268`（正确 role="status" 实现）；20-03 对照 `carousel.tsx:87-168`（hover/focus 暂停 + reduced-motion 处理）；20-01 对照 `use-row-drag-sort.ts:205-248`（键盘拖动先例，注释引用 WCAG 2.1.1）；20-07 无先例需新建；20-10 对照同文件 Next（:145-149 有 aria-disabled）与 `table-pagination-bar.tsx:83,141`。
- **20-03 表述修正已在审计内记录**：CSS 动画有全局 base.css 兜底（`ui/src/styles/base.css:31-39` 压 animation-duration 至 0.01ms），但 3 秒轮播内容切换（setTimeout）不受 reduced-motion 影响——修复必须覆盖 JS 轮播 tick，不只改 CSS。
- **live 文件核对**（2026-08-07）：`table-header-row.tsx:287-297,302-312`（resize handle role="separator"）；`crud-infinite-scroll-area.tsx:25-36`（状态文本无 live region）；`notice-bar.tsx:139-156,225-243`（marquee + 轮播）；`steps-renderer.tsx:262-282`（finish/error 仅 lucide 图标）；`transfer-renderer.tsx:418-441`（role="listbox" + Checkbox）；`ai-attachments.tsx:199-224,235-244`（role="button" 未接线）与 :299-309（opacity-0 无 focus-visible）；`markdown-editor-renderer.tsx:227-254`（role="toolbar" 15 Button 独立 tab stop）；`list-renderer.tsx:124-145`（listitem + aria-selected）；`wizard-renderer.tsx:235-267,561-579`（无焦点移动/播报）；`crud-renderer-toolbar.tsx:128-151`（Previous 无 aria-disabled）；`diff-file-list.tsx:86-94`（原生 input）。
- **验证基线**：CV full-green（2026-08-06，typecheck/build/lint 32/32 + test 59/59 10,397 passed + e2e 1054/43/6 watch-only）；`pnpm check` 零新增命中要求有效。

## Goals

- 12 条 a11y 发现全部修复并落地 focused 契约测试（先红后绿），P0/P1 语义不存在——全部为 P2 但属 confirmed 契约缺陷，同一 plan 内清零。
- 修复形态与「同仓正确先例」对齐（infinite-scroll/carousel/use-row-drag-sort），不引入新组件模式。
- 受影响组件 design.md 中声明的键盘/ARIA 契约与 live 行为一致（table/transfer design.md 已确认含相关声明；wizard design.md 无键盘/ARIA 声明，按 live 核对后仅在确有契约声明处同步）。

## Non-Goals

- 不处理 flow-designer/spreadsheet/report-designer 域 a11y（13-01 属 flow-designer owner 链，另登记）。
- 不做完整 listbox/treeview 交互模式重建（20-05/20-08 按审计建议选择最小正确形态：transfer 去 listbox 角色、list 用 aria-current）。
- 不扩展新组件或新 schema 属性（20-07 若 roving tabindex 成本过高可选「去 toolbar 角色」退化形态，二者择一）。
- 其余 Follow-up Backlog 条目（02-xx/04-01/05-xx/10-xx/12-xx/13-02/18-xx/O-P2-1/O-P2-2）不在本 plan。

## Scope

### In Scope

- data 族：20-01（table 列宽手柄键盘）、20-02（crud 无限滚动 aria-live）、20-08（list aria-selected → aria-current）、20-10（crud PaginationPrevious aria-disabled）。
- layout/mobile 族：20-03（notice-bar 暂停 + reduced-motion）、20-04（steps accessible name）、20-09（wizard 焦点移动 + aria-live）。
- form/form-advanced 族：20-05（transfer 去 listbox）、20-07（markdown-editor toolbar roving tabindex 或退化）。
- ai/content 族：11-01（ai-attachments 拖放区 role=button）、11-02（diff-view 搜索框 → ui Input）、20-06（ai-attachments 移除按钮 focus-visible）。
- 上述组件的 focused DOM 契约测试（键盘路径 / ARIA 属性断言）+ 受影响 design.md 同步。

### Out Of Scope

- flow-designer 域 13-01（tree mode 键盘伪装 MouseEvent，另登记 successor）。
- 10-xx spreadsheet 样式清理、12-xx variant-field 族、18-xx flux-bundle、O-P2-1/O-P2-2（后续轮次）。

## Failure Paths

> 不适用：纯 DOM/ARIA 契约修复，无外部 IO/鉴权/错误码契约。风险形态为「键盘路径与鼠标路径行为分叉」或「ARIA 属性与角色不匹配」，由 focused 契约测试覆盖。

## Test Strategy

本档选择：`必须自动化`（ARIA/键盘契约为公共 DOM 契约，维度 5 契约基准；每项先写失败测试再实现——Proof 先于 Fix）。

## Execution Plan

### Phase 1 - data 族（20-01/20-02/20-08/20-10）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`、`use-column-resize.ts`、`crud-infinite-scroll-area.tsx`、`list-renderer.tsx`、`crud-renderer-toolbar.tsx`、`docs/components/table/design.md`、`docs/components/crud/design.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] (Proof) 20-01：先写 `table-column-resize-keyboard.test.tsx`（tabIndex 存在 + ArrowLeft/ArrowRight 触发宽度步进、与 use-row-drag-sort.ts:205-248 键盘先例同构），红后实现：`use-column-resize.ts` 补键盘入口（ArrowLeft/Right 步进 + 值钳制），`table-header-row.tsx` resize handle 补 `tabIndex` + `onKeyDown`。
- [x] (Proof) 20-02：先写 crud 无限滚动 live region 测试（`role="status"` + `aria-live="polite"`，对照 mobile infinite-scroll.tsx:232-268 断言形态），红后实现 `crud-infinite-scroll-area.tsx:25-36`。
- [x] (Proof) 20-08：先写 list 选中态 ARIA 测试（listitem 不再输出 aria-selected；选中项输出 `aria-current`），红后实现 `list-renderer.tsx:124-145`。
- [x] (Proof) 20-10：先写 crud 工具栏测试（首页时 PaginationPrevious 有 `aria-disabled`，与 Next 对称），红后实现 `crud-renderer-toolbar.tsx:128-151`（onClick 边界直接 return）。
- [x] (Follow-up) `docs/components/table/design.md` 键盘/ARIA 章节与 live 对齐（20-01）；`docs/components/crud/design.md` 同步（20-02/20-10）。

Exit Criteria:

- [x] 4 项 focused 契约测试全绿（先红后绿记录：10 failed → 实现后全绿）；data 包 `pnpm --filter @nop-chaos/flux-renderers-data typecheck && test` 通过（742/742）。
- [x] live DOM 抽查：resize handle 可 Tab 聚焦（tabIndex="0"）、crud 状态文本含 role="status"、list item 无 aria-selected 且选中项有 aria-current、crud Previous 首页 aria-disabled="true"（程序化断言见 4 个新测试文件 + data-list-rendering.test.tsx 两处旧断言改为 aria-current 契约）。

### Phase 2 - layout/mobile 族（20-03/20-04/20-09）

Status: completed
Targets: `packages/flux-renderers-mobile/src/notice-bar.tsx`、`packages/flux-renderers-layout/src/steps-renderer.tsx`、`wizard-renderer.tsx`、`docs/components/notice-bar/design.md`、`docs/components/steps/design.md`、`docs/components/wizard/design.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] (Proof) 20-03：先写 notice-bar 暂停契约测试（hover/focusin 暂停 tick 与动画、prefers-reduced-motion 下轮播不启动——含 JS 轮播 tick，不只 CSS，按审计 20-03 表述修正），红后实现 `notice-bar.tsx:139-156,225-243`（对照 carousel.tsx:87-168 先例）。
- [x] (Proof) 20-04：先写 steps accessible name 测试（finish/error 按钮 accessible name 非空，如 `${t('flux.steps.step')} ${index+1}: ${item.title}` 或 aria-labelledby 关联标题），红后实现 `steps-renderer.tsx:262-282`。
- [x] (Proof) 20-09：先写 wizard 测试（步骤切换后焦点移入新步骤体首个可聚焦元素或提供 role="status"/aria-live 播报，二者取其一实现），红后实现 `wizard-renderer.tsx:235-267,561-579`。
- [x] (Follow-up) 对应 design.md 键盘/暂停/焦点章节同步。

Exit Criteria:

- [x] 3 项 focused 测试全绿（先红后绿记录：mobile 3 fail + layout 3 fail → 实现后全绿，`notice-bar-pause-a11y.test.tsx`/`steps-a11y.test.tsx`/`wizard-a11y.test.tsx`）；mobile + layout 包 `typecheck && test` 通过（174/174 + 109/109）。新增 i18n key `flux.steps.step`（en-US/zh-CN，flux-i18n typecheck 通过）。
- [x] live 抽查：notice-bar hover 暂停（tick + animation-play-state）、steps finish/error 按钮可访问名非空（aria-label 含序号+标题）、wizard 切步后有焦点目标（首个可聚焦元素）+ `role="status"` 播报节点（程序化断言见 3 个新测试文件）。

### Phase 3 - form/form-advanced 族（20-05/20-07）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx`、`packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx`、`docs/components/transfer/design.md`、`docs/components/markdown-editor/design.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] (Proof) 20-05：先写 transfer 测试（无 role="listbox"/aria-multiselectable 残留；Checkbox 勾选语义保留），红后实现 `transfer-renderer.tsx:418-441`（移除 listbox 角色，按审计建议最小形态）。
- [x] (Proof) 20-07：先写 markdown-editor toolbar 测试（roving tabindex：仅一个 tab stop + ArrowLeft/Right 移动，或实现后无 role="toolbar"），红后实现 `markdown-editor-renderer.tsx:227-254`；实现前 Decision 记录二选一。
- [x] (Follow-up) transfer/markdown-editor design.md 同步。

Exit Criteria:

- [x] 2 项 focused 测试全绿（先红后绿记录：transfer-a11y 1 fail + markdown-editor-toolbar-a11y 1 fail → 实现后全绿；另更新 3 处旧断言：transfer-renderer.test.tsx 2 条 listbox 断言、markdown-editor-i18n.test.tsx 2 条 toolbar role 断言改为新契约）。form + form-advanced 包 `typecheck && test` 通过（736/736 + 1047/1047）。
- [x] live 抽查：transfer 列表无 listbox 角色（含 aria-multiselectable 零残留）、markdown 工具栏角色退化完成（无 role="toolbar"，12 按钮独立 tab stop + aria-label 保留）。（Decision：20-07 选「去 toolbar 角色」退化形态——12 按钮已独立 tab stop 无 2.1.1 失败，含分隔符分组布局 roving 收益低；i18n key `markdown.toolbarLabel` 随角色移除同步删除（en-US/zh-CN），见 `Deferred But Adjudicated` 20-07 条目更新。）

### Phase 4 - ai/content 族（11-01/11-02/20-06）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx`、`packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx`

- Item Types: `Fix | Proof`

- [x] (Proof) 11-01：先写 ai-attachments 测试（容器无 role="button"/tabIndex；内部 Button 键盘激活不被容器劫持；Enter/Space 不再双重触发），红后实现 `ai-attachments.tsx:199-224,235-244`（移除容器 role/tabIndex/onKeyDown 或 handler 内 `event.target === event.currentTarget` 守卫——二选一，以测试断言为准）。
- [x] (Proof) 11-02：先写 diff-view 测试（搜索框为 ui Input，含 data-slot + focus-visible 主题继承），红后实现 `diff-file-list.tsx:86-94`（替换为 `<Input className="h-8 w-full text-xs" />`，删手写内联样式）。
- [x] (Proof) 20-06：先写 ai-attachments 图片移除按钮测试（键盘聚焦时 opacity 非 0），红后实现 `ai-attachments.tsx:299-309`（补 `focus-visible:opacity-100`）。

Exit Criteria:

- [x] 3 项 focused 测试全绿（先红后绿记录：ai 3 fail + content 1 fail → 实现后全绿，`ai-attachments-a11y.test.tsx` + `diff-file-list-a11y.test.tsx`）；ai + content 包 `typecheck && test` 通过（512/512 + 286/286）。
- [x] live 抽查：拖放区无 role="button"（含 tabIndex/aria-label 零残留、Enter/Space 不再触发 input click）、diff 搜索框为 ui Input（data-slot="input" + 无内联样式）、移除按钮聚焦可见（className 含 focus-visible:opacity-100）（程序化断言见 2 个新测试文件）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_027401724ffed5DfjerHE0rP3B`，2026-08-07）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major）
- Findings addressed: 12 条 finding 引用逐条 live 核对全部属实（文件:行、先例、基线）；Minor×3 已修正——①Goal#3「wizard design.md 已确认含声明」事实有误（仅 table/transfer 含，wizard 无）→ 改写为按 live 核对后同步；②「8 渲染器包」应为 7 → 已改；③Related 中 `docs/components/mobile/infinite-scroll` 路径不存在（实为 `docs/components/infinite-scroll/`）→ 已改。

## Closure Gates

- [x] 12 条 in-scope 发现全部修复，focused 契约测试全绿（先红后绿记录）
- [x] 无 in-scope confirmed a11y 缺陷被静默降级到 deferred / follow-up
- [x] 受影响 design.md 与 live 行为一致（table/crud/notice-bar/steps/wizard/transfer/markdown-editor）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 20-07 roving tabindex vs 角色退化二选一

- Classification: `watch-only residual`（实现形态二选一，均为合规终点）
- Why Not Blocking Closure: APG 两种形态（完整 roving tabindex 或去掉 toolbar 角色退化为普通按钮组）都消除「组合控件角色与实现不匹配」；Phase 3 执行时 Decision 记录，不影响 closure。
- Decision（2026-08-07 执行时记录）：**选「去 toolbar 角色」退化形态**。live 核对 12 个工具栏按钮（非审计所述 15）全部独立 tab stop 且带 aria-label，键盘可达性完整（无 WCAG 2.1.1 失败）；工具栏含 3 组分隔符，roving tabindex 在此布局收益低而实现复杂度高。角色移除同时删除孤立 i18n key `markdown.toolbarLabel`（en-US/zh-CN），`markdown-editor/design.md` §9 已记录 Decision。
- Successor Required: `no`

### flow-designer 域 13-01（tree mode 键盘 MouseEvent 伪装）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 非 component-audit 113 组件授权面，flow-designer 属独立 owner 域（O-P2-1 建议 docs/backlog 登记），本 plan 只覆盖渲染器包 a11y。
- Successor Required: `yes`
- Successor Path: flow-designer 域登记（O-P2-1 建议的 `docs/backlog/` 条目或既有 453/workbench-shell 链）

## Non-Blocking Follow-ups

- 其余 a11y 类 P2 若在修复中顺带发现（同文件同模式），按同机制当场修复或登记同 family successor，不静默跳过。

## Closure

Status Note: 12 条 in-scope 发现全部落地并经独立 closure-audit（fresh session）复核通过：接口-语义比对（interface-vs-semantics）逐条对 live 代码、新测试、design.md、roadmap、daily log 核对一致；验证链（typecheck 32/32、build 32/32、lint 32/32、test 59/59、受影响 7 包 focused 测试 3606/3606、`check:audit-event-dispatch-ctx` 与 `check:i18n-keys` 双绿）全部通过，无未决 plan-owned 工作，可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，任务 `nop-chaos-flux-master` closure-audit，2026-08-07；执行 session 未自审）
- Evidence: 逐条 live 核对（文件:行）——
  - Phase 1：`use-column-resize.ts:62,343-356` `stepResize` 存在、min/max 钳制、经 `persistWidth` 与 pointer drag 同 commit 路径；`table-header-row.tsx:35,145-162` resize handle `tabIndex:0` + ArrowLeft/Right 10px 步进；`crud-infinite-scroll-area.tsx:26-30` `role="status"`+`aria-live="polite"`；`list-renderer.tsx:130` listitem 无 aria-selected、选中项 `aria-current="true"`；`crud-renderer-toolbar.tsx:129-136` PaginationPrevious 首页 `aria-disabled` + onClick 边界 return。测试：`table-column-resize-keyboard.test.tsx`（tabIndex/步进/钳制）、`crud-infinite-scroll-live-region.test.tsx`、`list-selection-aria.test.tsx`、`crud-toolbar-pagination-a11y.test.tsx`；data 包 742/742 绿。
  - Phase 2：`notice-bar.tsx:64-98,183-185,276` hover/focus 暂停 tick + `animation-play-state: paused` + reduced-motion 响应式停 tick；`steps-renderer.tsx:268-271` 指示按钮 aria-label 含序号+标题；`wizard-renderer.tsx:126-152` 步骤变更（初始 mount 除外）焦点移入新步骤体首个可聚焦元素 + `:673-681` `role="status"`/`aria-live="polite"` sr-only 播报。测试 `notice-bar-pause-a11y.test.tsx`/`steps-a11y.test.tsx`/`wizard-a11y.test.tsx`（含 no-focus-on-mount 断言）；mobile 174/174 + layout 109/109 绿。
  - Phase 3：`transfer-renderer.tsx:418` 无 listbox/aria-multiselectable（Checkbox 语义保留）；`markdown-editor-renderer.tsx:231` 无 role="toolbar"/aria-label，12 按钮独立 tab stop（live 计数 4+5+3=12，与 Decision 一致），i18n `markdown.toolbarLabel` 已删（en/zh）。测试 `transfer-a11y.test.tsx`/`markdown-editor-toolbar-a11y.test.tsx`；form 736/736 + form-advanced 1047/1047 绿。
  - Phase 4：`ai-attachments.tsx:215` 容器 `role="region"`（无 role="button"/tabIndex/aria-label/onKeyDown，lint 要求拖放面带 role）、`:299` 移除按钮 `focus-visible:opacity-100`；`diff-file-list.tsx:88-94` ui Input（data-slot="input"、className="h-8 w-full text-xs"、无手写内联样式）。测试 `ai-attachments-a11y.test.tsx`/`diff-file-list-a11y.test.tsx`；ai 512/512 + content 286/286 绿。
  - 文档同步：七份 design.md（table/crud/notice-bar/steps/wizard/transfer/markdown-editor）a11y 契约条目 live 核对一致；roadmap 11-01/11-02/20-01..20-10 十二行 `[x]`；daily log `docs/logs/2026/08-07.md` 顶部条目为本 plan 记录。
  - 验证命令与结果：`pnpm typecheck` 32/32；`pnpm build` 32/32；`pnpm lint` 32/32；`pnpm test` 59/59（全缓存）；受影响 7 包 focused 测试 3606/3606 全绿；`pnpm check:audit-event-dispatch-ctx` 绿（allowlist 行号 160/166/172→198/204/210 位移已同步）；`pnpm check:i18n-keys` 绿。

Follow-up:

- 无剩余 plan-owned 工作。已知非阻塞项：①`markdown-editor-toolbar-a11y.test.tsx:13` 注释残留审计口径「15 buttons」，live 为 12（与 Decision 一致），纯注释过期不影响行为；②`docs/logs/2026/08-07.md` 重复 `### 2026-08-07` 标题（格式瑕疵）。flow-designer 13-01 按 Deferred But Adjudicated 走 successor（flow-designer 域登记，O-P2-1）。
