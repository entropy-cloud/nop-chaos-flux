# 859 渲染器约定合规：raw-HTML 绕过迁移 ui 组件 + effect 镜像消除

> Plan Status: active（draft review 通过：round 1 fail → 全量盘点重写 → round 2 单一残留 Major → 修正 → round 3 pass，见 Draft Review Record）
> Last Reviewed: 2026-11-05
> Source: `docs/analysis/2026-11-05-full-repo-deep-audit.md` §F-D（D1–D3）；draft review round 1（agent_012423f6）扩围裁定
> Related: AGENTS.md「MANDATORY: UI Component Usage」「MANDATORY: React 19 Best Practices」、`docs/architecture/styling-system.md`（styling contract owner doc，满足 plan-first 证据）

## Purpose

把 5 个渲染器包中**全量盘点出的 raw HTML 控件绕过**（23 处 / 11 文件，2026-11-05 复核盘点）迁移到 `@nop-chaos/ui` 组件（AGENTS MANDATORY 规则的执行落差——规则存在、无扫描器覆盖、积压成片），并消除 5 处 clear-cut 的 useEffect+setState 镜像。每个位点走 migrate 或 adjudicated-exception 两条路线之一，全部改动保持既有 DOM 契约面（data-slot / 测试标记 / class 钩子）不破坏。

## Current Baseline

- `@nop-chaos/ui` barrel（`packages/ui/src/index.ts`）已导出 `Button` / `Select`+`SelectItem` / `NativeSelect` / `DropdownMenu`+`DropdownMenuItem` / `ToggleGroup`；本 plan 只 import 既有组件，**不改 ui 公共导出面**（autonomy policy ask-first 项不触发）。
- **全量 raw 控件位清单（2026-11-05 grep 盘点，排除 test 文件与 test-support.tsx 测试基建；widget 渲染器"自绘内部控制"豁免不适用于通用控件位；`ui-consistency-exemptions` 无 raw-HTML 规则故零豁免覆盖）**：

  | #   | 文件:行                                                               | 现状                                                          | 预分类（Phase 1 确认）                                                                   |
  | --- | --------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
  | 1   | `flux-renderers-data/src/crud-query-actions.tsx:19`                   | raw `<button>` 手抄 Button 样式面                             | migrate → Button                                                                         |
  | 2   | `flux-renderers-data/src/crud-query-actions.tsx:27`                   | 同上                                                          | migrate → Button                                                                         |
  | 3   | `flux-renderers-ai/src/renderers/ai-message-list.tsx:220`             | scroll-to-bottom raw button                                   | migrate → Button(ghost/icon)                                                             |
  | 4   | `flux-renderers-ai/src/renderers/ai-bubble/assistant-actions.tsx:43`  | copy raw button                                               | migrate → Button(ghost/icon)                                                             |
  | 5   | `flux-renderers-ai/src/renderers/ai-bubble/assistant-actions.tsx:53`  | retry raw button                                              | migrate → Button(ghost/icon)                                                             |
  | 6   | `flux-renderers-3d/src/renderer/three-canvas.tsx:211`                 | retry raw button（import Spinner 无 Button）                  | migrate → Button(outline)+Spinner                                                        |
  | 7   | `flux-renderers-form/src/renderers/org/region-columns.tsx:24`         | retry raw button                                              | migrate → Button                                                                         |
  | 8   | `flux-renderers-form/src/renderers/org/region-columns.tsx:52`         | node select raw button                                        | Phase 1 定（倾向 migrate → Button ghost）                                                |
  | 9   | `flux-renderers-form/src/renderers/org/region-columns.tsx:63`         | expand raw button                                             | Phase 1 定（倾向 migrate → Button ghost/icon）                                           |
  | 10  | `flux-renderers-form/src/renderers/org/region-columns.tsx:78`         | load-more raw button                                          | Phase 1 定（倾向 migrate → Button ghost）                                                |
  | 11  | `flux-renderers-form/src/renderers/org/region-renderer.tsx:97`        | region field trigger raw button                               | Phase 1 定（倾向 migrate → Button）                                                      |
  | 12  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:42`       | trigger raw button（:39-41 有 button-content-model 理由注释） | Phase 1 定（migrate 或注释升级为正式 exception）                                         |
  | 13  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:55`       | raw button                                                    | Phase 1 定                                                                               |
  | 14  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:220`      | 树行/列表行 raw button（自定义复合控件内部）                  | Phase 1 定（ui 无 Tree/List 语义等价物时走 exception 路线，对齐 calendar-gridcell 先例） |
  | 15  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:231`      | 同上                                                          | 同上                                                                                     |
  | 16  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:266`      | 同上                                                          | 同上                                                                                     |
  | 17  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:288`      | 同上                                                          | 同上                                                                                     |
  | 18  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:321`      | 同上                                                          | 同上                                                                                     |
  | 19  | `flux-renderers-form/src/renderers/cron-editor-renderer.tsx:221`      | 分档选择器 raw button（roving tabIndex radio 语义）           | Phase 1 定（候选：ToggleGroup 语义对齐迁移；或 exception）                               |
  | 20  | `flux-renderers-form/src/renderers/cron-editor-renderer.tsx:280`      | raw `<select>`（同文件已 import Button/Input）                | migrate → NativeSelect（行为等价优先）或 Select                                          |
  | 21  | `flux-renderers-industrial/src/editor/context-menu.tsx:165`           | 手搓 menuitem raw button                                      | migrate → DropdownMenuItem（canvas 定位/键盘强耦合则 exception）                         |
  | 22  | `flux-renderers-industrial/src/editor/toolbox/layers-panel.tsx:80`    | raw button（同文件 import Button）                            | migrate → Button                                                                         |
  | 23  | `flux-renderers-industrial/src/editor/palette/editor-palette.tsx:158` | raw button（同文件 import Button）                            | migrate → Button                                                                         |

  注：`flux-renderers-form/src/test-support.tsx:192` 的 raw button 属测试基建，不入清单。

- 判定可接受、不入清单的对照面：`<input type="file">` sr-only 触发 / `type="hidden"` 值镜像（shadcn 标准形态，ui 无对应物）；scheduling 日历 gridcell / mobile 手势域控件（无语义等价物）。
- clear-cut effect 镜像 5 处：`flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts:13-15`（externalFilterText prop-mirror）与 `:20-22`（activeText 冗余态，debouncedValue 可直用）；`flux-renderers-content/src/media-shared.tsx:23-26`（src 变化重置 errored，`failedFor` 派生形态）；`flux-renderers-mobile/src/number-keyboard.tsx:25-28`（open prop-mirror；同文件 :37-50 的 digitKeys 重排 effect 属每次开盘随机语义，Phase 3 一并确认合法性并留档）；`flux-renderers-content/src/qrcode.tsx:49-50`（failed 重置挂在 canvas effect）。
- 相关回归面：playground vitest（569/569 基线）与各包单测；crud-query-actions / cron-editor / org 组件出现在 playground 页面，DOM 断言引用需逐点核（Phase 1 grep）。
- styling contract 约束（plan-first 证据 = 本 plan + owner doc `styling-system.md`）：widget 渲染器内部布局类合法；迁移后不得引入 BEM、不得破坏既有 `data-slot` 语义。

## Goals

- 清单 23 位点（11 文件）全部走 migrate 或 adjudicated-exception 之一，无第三态。
- 5 处 effect 镜像改为 render-time 派生或消除冗余态，行为不变；number-keyboard digitKeys effect 合法性留档。
- 每处改动有判别性验证：改动前后受影响包测试绿；凡 DOM 断言/e2e 引用的位点点名核验。
- D3 裁决落地：是否给 raw-control-element 绕过新增机械扫描规则给出明确决定（加/不加 + 理由）——本 plan 的全量盘点已证明人工盘点会漏（round 1 review 实证漏 12+ 处），此事实是 D3 裁决的直接输入。

## Non-Goals

- 不给 `@nop-chaos/ui` 增删组件/改导出。
- 不重设计这些控件的视觉（variant/样式仅作最小等价映射）。
- 不处理"判定可接受"对照面（file-input/hidden/calendar-grid/mobile-gesture）。
- 不新增渲染器功能、不改组件行为语义。

## Scope

### In Scope

- 上列 11 文件的 23 位点（flux-renderers-data / ai / 3d / form / industrial）
- 5 处 effect 镜像文件（scheduling / content / mobile）+ number-keyboard digitKeys effect 留档
- 受影响位点的既有测试适配（若断言引用旧 DOM 结构，改断言须逐条记录裁决——语义不得弱化）
- `scripts/audit/ui-consistency-exemptions.mjs`（仅当迁移产生新颜色类命中需登记豁免时）
- D3 扫描器规则裁决（Decision）

### Out Of Scope

- `packages/ui/` 本体
- 非 in-site 渲染器的重构
- e2e 全量复跑（聚焦面按需：playground 相关 spec）

## Failure Paths

| 可测场景编号                    | 触发                                                                                         | 行为                                                                                                                | 可重试 | 用户可见表现        |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| dom-contract-break              | 迁移后既有测试/e2e 断言红（locator/class 依赖旧结构）                                        | 先看断言语义：若断言针对用户可见行为则改实现保断言；若断言钉死旧 DOM 形态则改断言并逐条记录裁决（不得静默弱化）     | 是     | 测试绿 + 裁决记录   |
| ui-component-semantics-mismatch | ui 组件默认行为与现位语义冲突（Button type 默认值、Select 键盘行为、ToggleGroup 单值语义等） | 以现位语义为准配置 props；仍不可达成就地裁决为正式 exception（in-code rationale 注释 + 本 plan 裁决记录），不得硬迁 | 是     | 行为不变 + 裁决登记 |
| scope-expansion                 | 执行中发现清单外新 raw 位点（本轮盘点后新增的代码）                                          | 记入清单附表并同规则处置（不静默扩围、不静默遗漏）                                                                  | 是     | 清单附表更新        |

## Test Strategy

档位选择：`建议有测`——迁移类改动以既有测试套件为回归网（data/ai/3d/form/industrial/scheduling/content/mobile 各包 vitest + playground vitest）；对行为可能变化位点（cron 分档选择器/select、crud 按钮对、org 面板交互）在改动前先确认既有断言覆盖，若无覆盖则补一条 focused 断言再迁移（Proof 先于 Fix）。e2e：涉及 playground 页面的位点跑对应 focused spec。

## Execution Plan

### Phase 1 - 全量清单确认与判别面前置核验（Proof 先行）

Status: planned
Targets: 23 位点 + spec/test 引用面

- Item Types: `Proof | Decision`

- [ ] 逐位点读现位语义，落最终分类（migrate → 目标 ui 组件/variant；exception → rationale），更新 Current Baseline 清单表的"预分类"列为终分类（exception 位点同步记入 Deferred But Adjudicated 节）
- [ ] grep tests/e2e + 各包测试对 23 位点的 DOM 引用（locator/class/text），产出引用清单（写入当日 log）
- [ ] 对零覆盖且行为敏感位点（cron 分档/:280、crud 按钮对、org-select-panel 交互）补 focused 断言（旧实现下先绿）
- [ ] 确认各受影响包测试当前全绿（基线快照计数记入当日 log）

Exit Criteria:

- [ ] 清单表终分类完成（23/23 位点无一悬空），exception 位点已在 Deferred 节登记
- [ ] 引用清单与基线计数落当日 log
- [ ] 新补 focused 断言绿（旧实现下）

### Phase 2 - 控件迁移/例外裁决（11 文件 23 位点）

Status: planned
Targets: `flux-renderers-data` / `flux-renderers-ai` / `flux-renderers-3d` / `flux-renderers-form` / `flux-renderers-industrial`

- Item Types: `Fix`

- [ ] flux-renderers-data：crud-query-actions 两枚按钮 → ui Button（保留 testid/aria/handler；variant 按 `bg-primary` 语义就近映射）
- [ ] flux-renderers-ai：ai-message-list scroll-to-bottom + assistant-actions copy/retry → ui Button(ghost/icon)
- [ ] flux-renderers-3d：three-canvas retry → ui Button(outline) 保留 Spinner 组合
- [ ] flux-renderers-form org 族：region-columns ×4 / region-renderer ×1 / org-select-panel ×7 按 Phase 1 终分类执行（migrate 或 in-code rationale exception）
- [ ] cron-editor：:221 分档选择器按终分类（ToggleGroup 语义迁移或 exception）；:280 → NativeSelect/Select（行为等价优先）
- [ ] flux-renderers-industrial：context-menu menuitem（DropdownMenuItem 或 exception）；layers-panel / editor-palette → ui Button
- [ ] 每处迁移保持 marker/testid/aria 等价（Phase 1 引用清单逐点核）

Exit Criteria:

- [ ] grep 5 包 `src`（排除 tests/test-support）raw `<button>`/`<select>` 命中 = 0（exception 位点不计，但每处有 in-code rationale + Deferred 登记，且例外总数与 Deferred 节一致）
- [ ] 五个受影响包 vitest 全绿；playground vitest 全绿且计数不低于 Phase 1 基线快照
- [ ] 涉及 playground 页面的 focused e2e spec 绿（按 Phase 1 引用清单）
- [ ] 若产生新 ui-consistency 命中已登记豁免或修复
- [ ] 既有断言零静默弱化（改动断言逐条裁决在案）

### Phase 3 - effect 镜像消除 + D3 裁决

Status: planned
Targets: `flux-renderers-scheduling` / `flux-renderers-content` / `flux-renderers-mobile`

- Item Types: `Fix | Decision`

- [ ] `use-kanban-filter.ts:13-15`：externalFilterText mirror 消除；`:20-22`：activeText 冗余态消除（debouncedValue 直用）
- [ ] `media-shared.tsx`：errored 重置改 render-time 派生（`failedFor === src` 形态）
- [ ] `number-keyboard.tsx:25-28`：open prop-mirror 消除（以 prop 驱动渲染，仅在受控/非受控分界确需处保留并注释约束）；`:37-50` digitKeys 重排 effect 合法性确认并留档
- [ ] `qrcode.tsx:49-50`：failed 重置改 `failedFor === valueStr` 派生
- [ ] D3 Decision：raw-control-element 机械扫描规则——裁决加/不加并落 Deferred 或 Follow-up（含理由与归属；输入=本 plan 全量盘点漏检实证）

Exit Criteria:

- [ ] 三包 vitest 全绿；改动的每个 hook/组件行为语义不变（既有断言零弱化）
- [ ] grep 复核五位点无 `useEffect`+`setState` 镜像残留（保留处须有注释约束且在裁决记录中）
- [ ] D3 裁决落档（Deferred 节或 Follow-up 行）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_012423f6（fresh session）
- Verdict: `pass`（round 1 **fail**〔Major-1 计数失真 + Major-2 枚举不全〕→ 全量盘点重写 → round 2 **fail**〔单一残留 Major：文件轴 10→11〕→ 五处修正 → round 3 **pass**，零 Blocker/Major 零残留 finding，共识达成）
- Rounds: 3
- Findings addressed: round-1 Major-1/Major-2 → 全量盘点重写（**23 处/11 文件**逐位点清单版 + 预分类列 + Failure Path scope-expansion + exit 绑定全包 grep 与例外清单；原审计报告 §F-D D1 同源失真已就地勘正）；round-2 Major（文件数 10→11）→ 五处修正（Purpose/Goals/In Scope/Phase 2 标题/审计报告勘正行）；Minor 全吸收——kanban 行号 :13-15/:20-22、playground 计数改"不低于基线快照"、number-keyboard :37-50 显式留档项、cron:221 预分类前置（round 3 逐项复核确认）

## Closure Gates

- [ ] 23 位点全部走 migrate 或 adjudicated-exception（清单表终分类与 Deferred 登记一致，无第三态）
- [ ] 5 处 effect 镜像消除（或保留处有注释约束 + 裁决记录）；number-keyboard digitKeys 留档
- [ ] 受影响包 vitest + playground vitest 全绿；focused e2e 绿
- [ ] 零断言弱化（Phase 1 引用清单逐点核，改动断言逐条裁决在案）
- [ ] styling contract 无违背（无 BEM、data-slot 语义保持）
- [ ] owner docs 同步判定已执行（组件内部实现迁移无 owner 行为变更；exception 位点若涉组件契约，登记到对应组件 doc 约定节）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check` exit 0

## Deferred But Adjudicated

（round-1 修订后暂空——Phase 1 终分类产生的 exception 位点在此逐条登记：Classification / Why Not Blocking / in-code rationale 落点）

## Non-Blocking Follow-ups

- D3 扫描器规则若裁决"加"，实现归工具治理轮新 plan。
- 其余渲染器包（basic/mobile/content/scheduling…）widget 内部控件的同规则盘点与迁移挂 improvement-analysis（本 plan 的 5 包盘点方法可直接复用）。

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<收口时填写>>
