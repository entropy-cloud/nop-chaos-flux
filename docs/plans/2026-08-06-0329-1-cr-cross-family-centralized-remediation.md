# CR 跨族集中修复与裁决（shared 缺陷 / P2 backlog / 机制复验 / 跨组件裁决 / e2e 残余）

> Plan Status: active（draft → active：独立子 agent 审查 pass-with-minors，零 Blocker/零 Major，Minor 全部处理，共识达成）
> Mission: component-audit
> Work Item: CR
> Last Reviewed: 2026-08-06
> Source: `docs/backlog/component-audit-roadmap.md`（CR Phase Details、Work Item Status、自动修复机制 §2/§7、Cross-Cutting）、`docs/audits/per-component/*.md`（45 张审计卡 backlog 与 dim 17 留痕）、`docs/audits/component-audit-checklist.md`
> Related: 前置依赖——全部 C\*（C0..C9）与 CX-1..CX-12 均 `done`；CR 首批预提取由 `docs/plans/2026-08-05-1359-1-p2p3-rigor-remediation-plan.md`（active）承接（i18n I1–I10、a11y ×6、data-slot ×15、design.md ×6、`docs/audits/cr-input-inventory.md` 预提取），本 plan 不重复其 scope；后继 `docs/plans/2026-08-06-0329-2-cv-full-verification.md`（CV）依赖本 plan 收口后执行。

## Purpose

把逐组件审计（C1–C9）结束后仍留在线上代码的跨族/共享缺陷与登记 backlog 收口：shared 缺陷（根因公共层，≥2 组件受影响）、各 C 阶段登记到 CR 的 P2 backlog、跨组件同型裁决（需设计决策项）、机制落地后复验项、审计卡 dim 17 文档漂移留痕集中同步，以及 e2e pre-existing 残余（c5-2 host-timeline 断言与 timeline v2 契约冲突）。收口后 roadmap CR 行可标 `done`，为 CV（全量验证）提供干净基线。

## Current Baseline

- **roadmap 状态**：全部 C\*（C0–C9）与 CX-1..CX-12 `done`；CR `todo`；CV `todo`（依赖 CR）；CG `todo`（依赖 CV）。C6.3 行已于 2026-08-06 由 mission-driver 机械同步 `planned → done`（父 plan completed + closure-audit pass，见 `2026-08-04-1757-1` Closure Audit Evidence）。
- **预提取状态**：p2p3 plan（active）Phase 5 将产出 `docs/audits/cr-input-inventory.md`（当前未生成）；审计卡 `rg "归 CR"` 现存 ~110 处引用（45 张卡），其中 p2p3 Phase 1–4 覆盖项（i18n I1–I10、搜索框/aria-live/transfer a11y、data-slot 15 文件、object-field/array-field/detail-field/detail-view/variant-field/statistics 6 个 design.md）**不在本 plan 重复**，仅做交叉核对。
- **P1 债务**：全部 C 阶段 P1 均已同 plan 修复（live 核对：无 open P1 backlog），CR 无 P1 修复义务。
- **已确认 live shared 缺陷（本 plan 修复义务）**：
  - button href 无 URL 协议校验（`packages/flux-renderers-basic/src/button.tsx:238-241` 直接 `href={props.props.href}`；`javascript:` URI 可点击执行脚本；C6.1 已修 content `link.tsx` 引入 `isSafeNavigationUrl`（`packages/flux-renderers-content/src/sanitize.ts`），button 同源未接——C1.3 卡 P2-3 shared 登记）。
  - condition-builder P2-4 shared：readOnly 组合宿主内 select/combobox 视觉仍可交互（根因 form 包公共层 `input-choice-renderers.tsx` combobox 路径，C3.3 卡登记；写阻断成立、视觉残留）。
- **C 阶段登记 P2 backlog（live 代码缺口，非 block-supported-baseline）**：
  - calendar P2-4：loadAction fire-and-forget 无错误处理（`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:132` `void ev.loadAction?.(...)`）。
  - barcode-input P2-4：scannerError 无清除路径（`barcode-input.tsx:104-105`）。
  - gantt P2-1/P2-3/P2-4：自定义 editor region `onSave` 不持久化（`gantt-editor.tsx:48`）；拖拽/链接/删除/编辑器保存绕过 undo 栈（design §12.8 部分接线）；`use-gantt-keyboard` 每次 render 重挂（`use-gantt-keyboard.ts:25,123`）。
  - kanban P2-3/P2-4：controlled 模式变更事件/activity log 仍派发（`kanban-board.tsx:294-310,323-334`）；onCardMove/onCardClick payload 缺 `card: BoardItem`（design.md:190,205 承诺）。
- **需设计裁决项（p2p3 Deferred 已归 CR）**：
  - cards P2-1：交互态 item `role="button"` + `aria-selected` 非 ARIA 规范（selectable-card 模式，ui Card `:25` 覆盖 renderer role）——需裁决规范模式（aria-pressed 或 listbox/option）。
  - wizard 焦点管理（P3 记录项，卡内 `wizard.md:57` 已记 keep——复核以卡内 keep 为起点终裁）。
  - list P2-3：infinite 无显式 total/hasMore 时 hasMore 恒 true 与 design §9 两条款张力（`list-pagination.ts:159-164`）——跨组件分页语义裁决。
  - 推荐句柄未实现（json-view `component:copy/onCopy`、collapse `component:setValue/openItem/closeItem`、wizard `component:*` G6、pagination）——p2p3 Non-Goals 已裁定 P3 keep（"recommended" 非承诺契约），本 plan 复核登记。
- **e2e 残余**：`tests/e2e/component-lab/c5-2-host-surfaces.spec.ts:189` host-timeline 断言 `not.toHaveAttribute('data-ownership')`（:201）与 timeline v2 恒发 `data-ownership`（`timeline-renderer.tsx:201,243`，timeline-v2 plan 契约）冲突 → live 失败（C7 记录归属 CR）。其余机器负载 flake（c3-5 editor/link Tiptap 批次、gantt-perf/kanban-perf）为 watch-only，不进本 plan。
- **i18n 残留**：C7/C8/C9 审计后，scheduling 已修 ~40 键（C9）、ai BranchPicker 已修（C8.1 ai-bubble 卡 P2-1，`flux.ai.branchGroups/branchPrevious/branchNext`）；剩余硬编码（graph/scheduling/ai/mobile 早期估计 ~15 处，p2p3 Deferred 归 CR）需 `rg` 实证后清理。另含 roadmap CX-7 行登记的**潜伏项**：`useFluxTranslation` `t()` 为命名空间相对 key 语义，barcode-input 的 `flux.*` 前缀用法为同型潜伏问题（记 CR 归集）——纳入 Phase 1 裁决表与 Phase 4 实证扫描。
- **文档漂移留痕（dim 17，卡内 No owner-doc update required 登记）**：calendar P2-3（onEventClick nativeEvent/swap 键名/长按 500ms vs 300ms）、kanban P2-4（statusPath/注释过时，`scheduling-renderer-definitions.ts:89-92`）、barcode P3-1（离线 IndexedDB 队列/降级 tooltip 等未实现功能文档超前）、gantt P3-2（design.md §8.1/§8.3/§9.0/§12.7/undoLimit phantom + `example.json` `${event.taskId}`）、variant-field P3-2（顶层 transform\*Action `kind:'ignored'` 文档化建议）、statistics P2-4（amis-baseline-matrix 零提及）、diff-view/kanban 卡内其余留痕——本 plan 集中同步或终裁。
- **P3 记录项（keep 复核）**：input-file P3-1/P3-2（in-flight 取消、existing key url+name+size 重复告警）、input-date/input-datetime P3-1（onFocus/onBlur 挂 PopoverContent）、editor P3-1（focus outline）、checkbox P3-1（required 语义）、checkbox-group P3-1（aria-errormessage）、combo/array-field/object-field P3-1（data-slot 嵌套——p2p3 Phase 3 已覆盖裁决面，本 plan 复核）、input-date P3-2（valueFormat 非法 token 静默降级）——逐一裁决 keep/fix 并留痕。

## Goals

- 2 个 shared 缺陷（button href 协议校验、combobox readOnly 视觉残留）修复落地（test-first），root-cause 文档更新（如 helper 位置变更）。
- 7+ 项 C 阶段登记 P2 backlog（calendar/barcode/gantt×3/kanban×2）修复或显式裁决为 keep（每项有记录，无静默挂起）。
- 5 项决策（cards ARIA 模式、wizard 焦点、list hasMore 语义、推荐句柄复核、button helper 位置）各自产出终裁记录，已裁 fix 项在同 plan 落地。
- e2e 残余修复：c5-2 host-timeline 断言与 timeline v2 契约对齐（spec 或契约任一侧修正，记录决策），相关 e2e 零失败。
- dim 17 文档漂移留痕集中同步（design.md/definitions/example.json/locales），i18n 残留 `rg` 实证清零。
- roadmap CR 行收口 `todo → done`（closure-audit pass 后），CV 前置依赖满足。

## Non-Goals

- **不重复 p2p3 plan scope**：i18n I1–I10、6 处 a11y、15 个 data-slot 文件、6 个 design.md 创建、cr-input-inventory 预提取（均由 active p2p3 plan 处理；本 plan 只消费其产物并交叉核对）。
- **不处理 watch-only 机器负载 flake**（c3-5 Tiptap 批次、gantt-perf/kanban-perf、diff-perf 已校准 <5000ms 全绿）——归 CV 复验归因，非 CR 修复义务。
- **不引入新组件能力**（推荐句柄、selectable-card 新模式若裁 keep 则仅记录）。
- **不重开已闭 C\* 卡**：除本 plan 登记的 backlog/留痕项外，不重新审计已 closed 组件。
- **不做结构性重构**（公共 API 签名、包边界、编译期机制变更）——如 button 协议校验 helper 需跨包共享，若改动 `flux-core` 导出面则属结构性，须先记录决策再执行（本 plan 内 Decision 先行，涉及公共导出时维持 mission 授权边界内操作并留痕理由）。

## Scope

### In Scope

- shared 缺陷修复（button href、combobox readOnly 视觉残留）。
- C 阶段登记 P2 backlog 修复/裁决（calendar/barcode/gantt/kanban/list）。
- 设计裁决 5 项（cards ARIA / wizard 焦点 / list hasMore / 推荐句柄复核 / button helper 位置）+ P3 记录项逐一裁决。
- c5-2 host-timeline e2e 契约冲突修复。
- dim 17 文档漂移集中同步 + i18n 残留实证清理。
- 受影响审计卡状态同步（backlog 项处理结果回写）+ roadmap CR 行收口。

### Out Of Scope

- p2p3 plan 全部已列 scope。
- CV 的全量验证动作（本 plan 只保证"相关回归零新增失败"，全量验证在 CV）。
- CG 的 guard 沉淀（pc-index/lessons/checklist v2/工具升级）。
- 非登记项的新审计。

## Failure Paths

> 不适用：本 plan 为缺陷修复/裁决/文档同步，无外部 IO、鉴权、错误码契约。安全面唯一相关项（button href javascript: URI）由 focused 测试 + `rg` 实证覆盖（非失败路径表场景）。

## Test Strategy

本档选择：`必须自动化`

- button href 协议校验是安全红线（XSS 面）与既有 `isSafeNavigationUrl` 契约的跨包复用——**Proof 项（test-first）必须先于 Fix**（guide Rule 12）。
- combobox readOnly 视觉残留是 DOM 交互契约（组合宿主场景 C3.3 实证过），test-first 断言 readOnly select 视觉不可交互。
- P2 backlog 修复（calendar loadAction 错误处理、barcode scannerError 清除、gantt onSave/undo/keyboard、kanban payload/controlled）各配 focused 测试；契约面（payload 形状）test-first。
- c5-2 host-timeline 为 e2e 契约修复：先改 spec 断言（或契约侧），跑通 spec 作为回归门禁。
- 全量验证（typecheck/build/lint/test + e2e 全量）归 Closure Gates（guide Rule 18）。

## Execution Plan

### Phase 1 - CR 输入盘点与跨组件裁决

Status: planned
Targets: `docs/audits/per-component/*.md`、`docs/audits/cr-input-inventory.md`（消费 p2p3 Phase 5 产物，若已生成）、`docs/plans/2026-08-05-1359-1-p2p3-rigor-remediation-plan.md`

- Item Types: `Decision | Follow-up`

- [ ] **Decision（裁决总表）**：生成 `docs/audits/cr-inventory-adjudication.md` 裁决表——逐条处理审计卡 `rg "归 CR"` 全部引用（~110 处），分类：`handled-by-p2p3`（交叉核对 p2p3 覆盖项）/ `fix`（本 plan 修复）/ `keep`（裁决非缺陷）/ `defer-other`（明确 successor）；每条带 file:line 与一句理由，无静默挂起。**另含 roadmap CX-7 行登记项**（barcode-input `flux.*` 前缀 t() 语义潜伏问题）与 Phase 4 i18n 实证扫描的联动登记。
- [ ] **Decision（cards P2-1 selectable-card ARIA）**：裁决交互态 item 规范模式——候选：a) `aria-pressed` 保持 role=button；b) role=listbox/option 结构（需 ui Card role 覆盖调整）；c) keep 现状（记录不规范性）。裁决后记录于裁决表与 cards 卡，若裁 fix 则在 Phase 3 落地。
- [ ] **Decision（wizard 焦点管理）**：复核 wizard 焦点缺口（P3 记录）是否构成可用性阻断——按 p2p3 既有裁定口径复核并终裁 keep/fix，记录依据。
- [ ] **Decision（list P2-3 hasMore 语义）**：裁决 infinite 无 total/hasMore 时 hasMore 恒 true 的 design §9 两条款张力——对照 pagination 族（crud/table/list）同型语义终裁，记录为跨组件分页语义基准。
- [ ] **Decision（推荐句柄复核）**：确认 p2p3 Non-Goals 的 keep 裁定覆盖 json-view/collapse/wizard/pagination 四组件推荐句柄（`component:*`），在裁决表中登记"复核通过 + 依据"，不重复修复。
- [ ] **Decision（button helper 位置）**：裁决 `isSafeNavigationUrl` 复用路径——候选：a) basic 包内联等价实现（重复）；b) 提升到公共层（flux-core 或共享模块，涉及包边界→记录决策 + 执行时若触碰公共导出面按 mission 授权留痕理由）；c) basic 依赖 content 包（依赖方向反转，否决）。裁决结果决定 Phase 2 实施形态。
- [ ] **Follow-up**：与 p2p3 plan Phase 5 产物交叉核对（若 cr-input-inventory 已生成，核对条目数一致；未生成则本 phase 以卡级 grep 为准并在 plan 中记录）。

Exit Criteria:

- [ ] `docs/audits/cr-inventory-adjudication.md` 存在，覆盖 `rg "归 CR"` 全部引用（零未分类条目），每条含 file:line + 分类 + 理由。
- [ ] 5 项 Decision（cards ARIA / wizard 焦点 / list hasMore / 推荐句柄 / button helper 位置）均有终裁记录。

### Phase 2 - shared 缺陷修复

Status: planned
Targets: `packages/flux-renderers-basic/src/button.tsx`、`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`packages/flux-renderers-content/src/sanitize.ts`（只读参考）、相关测试

- Item Types: `Fix | Proof | Decision`

- [ ] **Proof（test-first，button href）**：新增 `button-href-safety.test.tsx`：`javascript:` / `vbscript:` URI → 渲染剥离或降级（与 link.tsx 修复后行为同构：不安全 href 不落锚点 href），白名单协议（http/https/mailto/tel）保留；`data:` 语义以 Phase 1 Decision（button helper 位置）中钉死的口径为准（link.tsx 现行 helper 放行全部 `data:`，button 侧是否收窄到 `data:csv` 由该 Decision 裁定，测试断言与之对齐）；先红（当前 `javascript:` 原样进 DOM）后绿。
- [ ] **Fix（button href）**：按 Phase 1 Decision 的 helper 位置接入协议校验；`button.tsx:238-241` href 分支过滤不安全协议；同步 button 卡 P2-3 状态。
- [ ] **Proof（test-first，combobox readOnly）**：新增/扩展 `input-choice-renderers`（或 condition-builder 关联）测试：readOnly select（combobox 路径）输入视觉不可交互（输入框 disabled/pointer-events 阻断或等价 DOM 契约断言）；先红后绿。
- [ ] **Fix（combobox readOnly）**：form 包公共层 `input-choice-renderers.tsx` combobox 路径 readOnly 冻结补全（与选择路径 onValueChange unwired 同构）；同步 condition-builder 卡 P2-4 状态；回归 C2.3 既有 select/radio-group/button-group-select 测试零回归。
- [ ] 受影响 design.md/quick-reference 若引用 href 契约或 readOnly 视觉语义则同步（按实际影响，无则跳过）。

Exit Criteria:

- [ ] `rg "javascript:" packages/flux-renderers-basic/src/button.tsx` 相关渲染路径零残留不安全 href 直传（或剥离实现可实证）；button href 安全测试全绿。
- [ ] combobox readOnly 视觉不可交互测试全绿；form 包 `pnpm --filter @nop-chaos/flux-renderers-form test` + basic 包局部测试通过；审计卡 P2-3/P2-4 状态回写。

### Phase 3 - C 阶段登记 P2 backlog 修复/裁决

Status: planned
Targets: `packages/flux-renderers-scheduling/src/{calendar,gantt,kanban,barcode-input}/`、`packages/flux-renderers-data/src/list-*.ts`（如涉及）、相关测试

- Item Types: `Fix | Proof | Decision`

- [ ] **Fix（calendar P2-4）**：`calendar/calendar.tsx:132` loadAction fire-and-forget 补错误处理——rejection 捕获 + 错误态呈现（与 data-source/其他组件 loadAction 错误面同构）；test-first 断言 reject 不静默、有用户可见错误态。
- [ ] **Fix（barcode-input P2-4）**：scannerError 清除路径（重扫/关闭/清除时复位，`barcode-input.tsx:104-105`）；test-first 断言错误显示后可清除。
- [ ] **Fix（gantt P2-1/P2-3/P2-4）**：a) 自定义 editor region `onSave` 持久化接线（`gantt-editor.tsx:48`）；b) 拖拽/链接/删除/编辑器保存入 undo 栈（design §12.8 补齐）；c) `use-gantt-keyboard` 监听挂载稳定化（避免每次 render 重挂）；各配 focused 测试。
- [ ] **Fix（kanban P2-3/P2-4）**：a) controlled 模式变更事件/activity log 不派发（`kanban-board.tsx:294-310,323-334` 按 valueOwnership 门控，与 C8.1 timeline/其他受控组件先例同构）；b) onCardMove/onCardClick payload 补 `card: BoardItem`（design.md:190,205 承诺）；test-first payload 形状断言 + controlled 不派发断言。
- [ ] **Decision（P3 记录项逐一裁决）**：input-file P3-1/P3-2、input-date/input-datetime P3-1、editor P3-1、checkbox P3-1、checkbox-group P3-1、combo/array-field/object-field P3-1（data-slot 嵌套复核，对照 p2p3 Phase 3 裁决）、input-date P3-2——每项终裁 keep/fix 并写回裁决表（裁 fix 项本 phase 内完成，keep 项写明非阻断理由）。
- [ ] 受影响审计卡状态同步（backlog → fixed/keep 回写）。

Exit Criteria:

- [ ] calendar/barcode/gantt/kanban 修复项各配 focused 测试且全绿；scheduling 包 `pnpm --filter @nop-chaos/flux-renderers-scheduling test` 通过。
- [ ] P3 记录项裁决表无未分类条目；裁 fix 项测试全绿。
- [ ] 局部 typecheck：scheduling/data/form 相关包 `pnpm --filter @nop-chaos/flux-renderers-{scheduling,data,form} typecheck` 通过。

### Phase 4 - dim 17 文档漂移同步 + i18n 残留实证清理

Status: planned
Targets: `docs/components/{calendar,gantt,kanban,barcode-input}/design.md`、`packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`、`docs/components/*/design.md`（按留痕清单）、`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`、相关 `example.json`

- Item Types: `Fix`（文档）| `Fix`

- [ ] **Fix（dim 17 留痕集中同步）**：calendar P2-3（nativeEvent/swap 键名/长按时长口径）、kanban P2-4（statusPath/注释）、barcode P3-1（离线队列/降级 tooltip 标注未实现）、gantt P3-2（§8.1 payload 命名/§8.3 句柄/§9.0 loadAction/§12.7/undoLimit phantom + `example.json` `${event.taskId}` → 裸键）、variant-field P3-2（transform\*Action ignored 文档化）、statistics P2-4（amis-baseline-matrix 补提及）——按"行为以实现为准"口径同步 design.md/definitions/example.json，留痕项清零。
- [ ] **Fix（i18n 残留实证清理）**：`rg` 实证 scheduling/graph/ai/mobile 包内剩余硬编码英文/中文字面量（对照 p2p3 Phase 1 已清 10 处），剩余项走 `t()`（复用既有键或新增双语键，命名空间惯例 `flux.*`）；`check:i18n-keys` 绿。
- [ ] **Fix（route-matrix 校验强度核对）**：`apps/playground/src/route-matrix.test.ts` layout/content 包 route 校验强度核对（p2p3 Non-Blocking Follow-ups 登记项）——统一为 def 枚举或记录 keep 裁决。
- [ ] 受影响审计卡 dim 17 状态回写。

Exit Criteria:

- [ ] dim 17 留痕清单条目全部有同步 commit 或 keep 裁决记录（零悬挂）。
- [ ] `rg` 实证：上述包内硬编码字面量零残留（测试断言除外）；`pnpm check:i18n-keys` 通过。

### Phase 5 - e2e 残余修复（c5-2 host-timeline）与相关回归

Status: planned
Targets: `tests/e2e/component-lab/c5-2-host-surfaces.spec.ts`、`packages/flux-renderers-layout/src/timeline-renderer.tsx`（只读参考，契约侧）、timeline design.md（如契约侧修正）

- Item Types: `Fix | Proof`

- [ ] **Decision（契约对齐方向）**：裁定 c5-2 `:201` `not.toHaveAttribute('data-ownership')` 与 timeline v2 恒发 `data-ownership` 的冲突——方向候选：a) spec 断言更新为接受 v2 契约（`data-ownership` 存在且值为 display-only 语义，timeline-v2 plan 已定契）；b) 渲染器侧 display-only 模式不输出该属性（契约回退，需 timeline-v2 复审）；记录决策与依据（timeline-v2 plan completed + renderer-markers-and-selectors.md 已登记 data-ownership 契约为首选方向）。
- [ ] **Fix**：按决策落地（默认方向 a：更新 `c5-2-host-surfaces.spec.ts:189-205` 断言为 v2 契约语义，保留 display-only 断言面：marker-only 根 + data-mode/data-orientation + item 数 + CSS 类）；若方向 b 则改 `timeline-renderer.tsx:201,243` 并同步 timeline design.md/renderer-markers 登记。
- [ ] **Proof**：`npx playwright test tests/e2e/component-lab/c5-2-host-surfaces.spec.ts:189 --reporter=list` 全绿；timeline v2 既有 e2e（w4b-process-display-family.spec.ts）零回归。
- [ ] 相关族回归：本 plan 触及的 basic/form/form-advanced/scheduling/data/layout 相关 e2e spec（button/form 组合宿主、c3-3 host-cb-custom、c9 host 场景、w4b）复跑零新增失败。

Exit Criteria:

- [ ] c5-2 host-timeline 用例全绿（fresh 重跑）；w4b 9/9 零回归。
- [ ] 相关族 e2e 复跑零新增失败（记录在案）。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_02c969ea7ffevNA4CR1r3NT8D5`（独立 fresh session plan review，2026-08-06）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已全部处理——①Proof 中 `data:text/html` 与 helper 契约（sanitize.ts 放行全部 data:）矛盾 → 改为"data: 语义由 Phase 1 Decision 钉死、测试断言对齐"；②route-matrix 路径修正为 `apps/playground/src/route-matrix.test.ts`；③BranchPicker i18n 归因修正为 C8.1 ai-bubble 卡；④CX-7 行 barcode `flux.*` t() 潜伏项纳入 Phase 1 裁决表与 Phase 4 扫描；⑤Goals/Closure Gates"4 项"修正为"5 项决策"；⑥wizard P3-2 以卡内 keep 记录为复核起点；⑦graph i18n Deferred 条目改写为单一路径（Phase 4 实证 + 记录）；⑧`button-href.test.tsx` 不存在 → 仅新文件选项；condition-builder 从 data-slot 嵌套复核清单移除（其 P3-1 无关，模式源自 combo 卡）。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 2 个 shared 缺陷（button href 协议校验、combobox readOnly 视觉残留）已 test-first 修复 + 回归测试（Phase 2 Exit）
- [ ] 全部 C 阶段登记 P2 backlog（calendar/barcode/gantt/kanban/list）已修复或显式裁决 keep（Phase 3 Exit + 裁决表）
- [ ] 5 项决策 + P3 记录项全部有终裁记录，裁 fix 项已落地（Phase 1/3 Exit）
- [ ] c5-2 host-timeline e2e 契约冲突已修复（spec 或契约侧），相关 e2e 零新增失败（Phase 5 Exit）
- [ ] dim 17 文档漂移留痕同步完成 + i18n 残留实证清零（Phase 4 Exit）
- [ ] `docs/audits/cr-inventory-adjudication.md` 裁决表覆盖全部"归 CR"引用且无未分类条目（Phase 1 Exit）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（guide Rule 16）
- [ ] 受影响 owner docs（design.md/definitions/locales/审计卡/裁决表/roadmap CR 行）已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### watch-only 机器负载 e2e flake（c3-5 Tiptap 批次、gantt-perf/kanban-perf）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 全量跑偶发、隔离重跑全绿、clean HEAD 同值复现（C7/C9 记录在案），机器负载归因；本 plan 无法从代码侧消除，由 CV 全量验证轮复验归因。
- Successor Required: `yes`
- Successor Path: CV（`2026-08-06-0329-2`）复验归因

### 推荐句柄未实现（json-view/collapse/wizard/pagination `component:*`）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md 明示「推荐支持」非承诺契约；p2p3 Non-Goals 已裁定 P3 keep；实现需组件 capability 注册面（>15 分钟新能力），非本 plan 修复义务。
- Successor Required: `yes`
- Successor Path: 未来 capability 面组件计划（非 component-audit 路线）

### graph 包硬编码文案（若 `rg` 实证在 flux-i18n 覆盖面外）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: graph 组件属 `components` mission（G1）非 component-audit 113 组件清单；Phase 4 的 `rg` 实证扫描覆盖其面——若在 flux-i18n 覆盖面内则本 plan 清理，否则归属 graph owner 计划（Phase 4 记录实证结论）。
- Successor Required: `no`（Phase 4 实证后裁决，见「Non-Blocking Follow-ups」）

## Non-Blocking Follow-ups

- 裁决表中 `defer-other` 类条目（若有）汇总为单行 successor 提示，供未来路线图规划。
- 各审计卡"归 CR"项状态与裁决表交叉标注（CR 收口时统一回写，与 p2p3 plan 互见）。

## Closure

Status Note: pending（执行完成后填写）

Closure Audit Evidence: pending

Follow-up:

- pending（仅记录 non-blocking follow-up）
