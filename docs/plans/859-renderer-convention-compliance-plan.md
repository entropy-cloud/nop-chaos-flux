# 859 渲染器约定合规：raw-HTML 绕过迁移 ui 组件 + effect 镜像消除

> Plan Status: completed（draft review round 3 pass；closure audit round 1 issues → ⑧处置 → round 2 approved，见 Closure Audit Evidence）
> Last Reviewed: 2026-11-10
> Source: `docs/analysis/2026-11-05-full-repo-deep-audit.md` §F-D（D1–D3）；draft review round 1（agent_012423f6）扩围裁定
> Related: AGENTS.md「MANDATORY: UI Component Usage」「MANDATORY: React 19 Best Practices」、`docs/architecture/styling-system.md`（styling contract owner doc，满足 plan-first 证据）

## Purpose

把 5 个渲染器包中**全量盘点出的 raw HTML 控件绕过**（23 处 / 11 文件，2026-11-05 复核盘点）迁移到 `@nop-chaos/ui` 组件（AGENTS MANDATORY 规则的执行落差——规则存在、无扫描器覆盖、积压成片），并消除 5 处 clear-cut 的 useEffect+setState 镜像。每个位点走 migrate 或 adjudicated-exception 两条路线之一，全部改动保持既有 DOM 契约面（data-slot / 测试标记 / class 钩子）不破坏。

## Current Baseline

- `@nop-chaos/ui` barrel（`packages/ui/src/index.ts`）已导出 `Button` / `Select`+`SelectItem` / `NativeSelect` / `DropdownMenu`+`DropdownMenuItem` / `ToggleGroup`；本 plan 只 import 既有组件，**不改 ui 公共导出面**（autonomy policy ask-first 项不触发）。
- **全量 raw 控件位清单（2026-11-05 grep 盘点，排除 test 文件与 test-support.tsx 测试基建；widget 渲染器"自绘内部控制"豁免不适用于通用控件位；`ui-consistency-exemptions` 无 raw-HTML 规则故零豁免覆盖）**：

  | #   | 文件:行                                                               | 现状                                                          | 预分类（Phase 1 确认）                                                                   | 终分类（2026-11-06）                  |
  | --- | --------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- |
  | 1   | `flux-renderers-data/src/crud-query-actions.tsx:19`                   | raw `<button>` 手抄 Button 样式面                             | migrate → Button                                                                         | migrate → Button(default/sm)          |
  | 2   | `flux-renderers-data/src/crud-query-actions.tsx:27`                   | 同上                                                          | migrate → Button                                                                         | migrate → Button(outline/sm)          |
  | 3   | `flux-renderers-ai/src/renderers/ai-message-list.tsx:220`             | scroll-to-bottom raw button                                   | migrate → Button(ghost/icon)                                                             | migrate → Button(outline/icon)        |
  | 4   | `flux-renderers-ai/src/renderers/ai-bubble/assistant-actions.tsx:43`  | copy raw button                                               | migrate → Button(ghost/icon)                                                             | migrate → Button(ghost/icon-xs)       |
  | 5   | `flux-renderers-ai/src/renderers/ai-bubble/assistant-actions.tsx:53`  | retry raw button                                              | migrate → Button(ghost/icon)                                                             | migrate → Button(ghost/icon-xs)       |
  | 6   | `flux-renderers-3d/src/renderer/three-canvas.tsx:211`                 | retry raw button（import Spinner 无 Button）                  | migrate → Button(outline)+Spinner                                                        | migrate → Button(outline/xs)          |
  | 7   | `flux-renderers-form/src/renderers/org/region-columns.tsx:24`         | retry raw button                                              | migrate → Button                                                                         | **exception**（句内文字链接）         |
  | 8   | `flux-renderers-form/src/renderers/org/region-columns.tsx:52`         | node select raw button                                        | Phase 1 定（倾向 migrate → Button ghost）                                                | **exception**（行内截断标签）         |
  | 9   | `flux-renderers-form/src/renderers/org/region-columns.tsx:63`         | expand raw button                                             | Phase 1 定（倾向 migrate → Button ghost/icon）                                           | migrate → Button(ghost/icon-xs)       |
  | 10  | `flux-renderers-form/src/renderers/org/region-columns.tsx:78`         | load-more raw button                                          | Phase 1 定（倾向 migrate → Button ghost）                                                | migrate → Button(ghost/xs)            |
  | 11  | `flux-renderers-form/src/renderers/org/region-renderer.tsx:97`        | region field trigger raw button                               | Phase 1 定（倾向 migrate → Button）                                                      | migrate → Button(outline)             |
  | 12  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:42`       | trigger raw button（:39-41 有 button-content-model 理由注释） | Phase 1 定（migrate 或注释升级为正式 exception）                                         | **exception**（行内截断标签）         |
  | 13  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:55`       | raw button                                                    | Phase 1 定                                                                               | migrate → Button(ghost/icon-xs)       |
  | 14  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:220`      | 树行/列表行 raw button（自定义复合控件内部）                  | Phase 1 定（ui 无 Tree/List 语义等价物时走 exception 路线，对齐 calendar-gridcell 先例） | migrate → Breadcrumb + BreadcrumbLink |
  | 15  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:231`      | 同上                                                          | 同上                                                                                     | migrate → Breadcrumb + BreadcrumbLink |
  | 16  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:266`      | 同上                                                          | 同上                                                                                     | migrate → Button(ghost/sm)            |
  | 17  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:288`      | 同上                                                          | 同上                                                                                     | **exception**（句内文字链接）         |
  | 18  | `flux-renderers-form/src/renderers/org/org-select-panel.tsx:321`      | 同上                                                          | 同上                                                                                     | migrate → Button(ghost/sm)            |
  | 19  | `flux-renderers-form/src/renderers/cron-editor-renderer.tsx:221`      | 分档选择器 raw button（roving tabIndex radio 语义）           | Phase 1 定（候选：ToggleGroup 语义对齐迁移；或 exception）                               | **exception**（segmented radio）      |
  | 20  | `flux-renderers-form/src/renderers/cron-editor-renderer.tsx:280`      | raw `<select>`（同文件已 import Button/Input）                | migrate → NativeSelect（行为等价优先）或 Select                                          | migrate → NativeSelect(xs)            |
  | 21  | `flux-renderers-industrial/src/editor/context-menu.tsx:165`           | 手搓 menuitem raw button                                      | migrate → DropdownMenuItem（canvas 定位/键盘强耦合则 exception）                         | **exception**（canvas 引擎菜单）      |
  | 22  | `flux-renderers-industrial/src/editor/toolbox/layers-panel.tsx:80`    | raw button（同文件 import Button）                            | migrate → Button                                                                         | migrate → Button(ghost/xs)            |
  | 23  | `flux-renderers-industrial/src/editor/palette/editor-palette.tsx:158` | raw button（同文件 import Button）                            | migrate → Button                                                                         | migrate → Button(ghost/xs)            |

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

Status: completed
Targets: 23 位点 + spec/test 引用面

- Item Types: `Proof | Decision`

- [x] 逐位点读现位语义，落最终分类（终分类已回写 Current Baseline 清单表"终分类"列；exception 位点记入 Deferred But Adjudicated 节）
- [x] grep tests/e2e + 各包测试对 23 位点的 DOM 引用（引用清单见 `docs/logs/2026/11-06.md` 859 段；13/23 位点有测试/e2e 引用，全部走 data-slot 或 testid 选择器）
- [x] 对零覆盖且行为敏感位点补 focused 断言（旧实现下先绿）：引用清单显示仅 `region-load-more` 与 `table-filter-option`（scope-expansion 附表）两处零覆盖 → 在 `org-input-city.test.tsx` 内新增 `describe('input-city region-load-more (plan 859 Phase 1)')` 块，并新增 `table-filter-option-label.test.tsx`；plan 点名的 cron 分档/preset（既有 `cron-editor-renderer.test.tsx:246-273` 覆盖 radiogroup/roving tabindex/方向键/preset 应用）、crud 按钮对（`crud-query-and-pagination.test.tsx` 8 处）、org-select-panel（`org-select-renderers.test.tsx` + org-select-\*.spec.ts）均已有覆盖，无需新增
- [x] 确认各受影响包测试当前全绿（基线快照：data 1174 / ai 859 / 3d 218 / form 1121+1skip / industrial 1723 / scheduling 1099 / content 380 / mobile 384 / playground 569——取自 860 轮全量 `_tmp/audit-1106/860-full-verify.log`）

Exit Criteria:

- [x] 清单表终分类完成（23/23 位点无一悬空），exception 位点已在 Deferred 节登记
- [x] 引用清单与基线计数落当日 log
- [x] 新补 focused 断言绿（旧实现下）

### Phase 2 - 控件迁移/例外裁决（11 文件 23 位点）

Status: completed
Targets: `flux-renderers-data` / `flux-renderers-ai` / `flux-renderers-3d` / `flux-renderers-form` / `flux-renderers-industrial`

- Item Types: `Fix`

- [x] flux-renderers-data：crud-query-actions 两枚按钮 → ui Button（search: default/sm，reset: outline/sm；`data-slot` 保留——Button 在自身 `data-slot` 之后展开 props）
- [x] flux-renderers-ai：scroll-to-bottom → Button(outline/icon)；copy/retry → Button(ghost/icon-xs)。ai `styles.css` 为非 layer 样式，其 `[data-slot]` 规则继续压过 Button 的 layer 内 utility，视觉不变
- [x] flux-renderers-3d：three-canvas retry → Button(outline/xs)
- [x] flux-renderers-form org 族：expand ×2 / load-more ×3 / region-trigger → Button；breadcrumb ×2 → ui `Breadcrumb` + `BreadcrumbLink render={<button>}`（容器保留 `data-slot="org-select-breadcrumb"`，补 `aria-current`）；row-name ×2 / inline retry ×2 → 裁决例外（in-code rationale，见 Deferred）
- [x] cron-editor：分档选择器 → 裁决例外（segmented radio，见 Deferred）；preset `<select>` → `NativeSelect size="xs"` + `NativeSelectOption`（id/testid/aria-label/defaultValue/onChange 透传到原生 select）
- [x] flux-renderers-industrial：context-menu menuitem → 裁决例外（见 Deferred）；layers-panel 行选择 / editor-palette 分组折叠 → Button(ghost/xs)
- [x] 每处迁移保持 marker/testid/aria 等价（Phase 1 引用清单逐点核；layers-panel 曾试加 `aria-pressed` 后撤回——超出 Non-Goals 且会让 ghost 的 `aria-pressed:bg-muted` 覆盖选中态）

Exit Criteria:

- [x] grep 5 包 `src`（排除 tests/test-support）raw `<button>`/`<select>`/`<label>` 命中 = 6，恰为 6 处裁决例外（每处有 in-code rationale，与 Deferred 节一致）；另 2 处 `BreadcrumbLink render={<button>}` 为 ui 组件 render prop，不属 raw 控件
- [x] 五个受影响包 vitest 全绿；playground vitest 569（= 基线快照）
- [x] 涉及 playground 页面的 focused e2e spec：21 条失败中 19 条与 HEAD 逐条一致（HEAD 同 8 spec 19 红），其中 17 条已登记 ledger、2 条（`ai-bubble-content` corner shape / avatar slot，冷启动疑因）本次补登 ledger F9 增补节；另 2 条为本 plan 回归（见执行中裁决⑤）已修复后复跑 org-select/input-city 9/9 绿。注：迁移的 ai 按钮与 scada 分组折叠所在 spec（`ai-bubble-visual`、`scada-editor-drag-ux:63`）在 HEAD 上即红，这两处迁移暂无可用 e2e 覆盖，由单测 + ai/industrial 包测试覆盖
- [x] 若产生新 ui-consistency 命中已登记豁免或修复（`check:audit-ui-consistency-gaps` 零新增）
- [x] 既有断言零静默弱化（本 plan 未修改任何既有断言，仅新增测试）

### Phase 3 - effect 镜像消除 + D3 裁决

Status: completed
Targets: `flux-renderers-scheduling` / `flux-renderers-content` / `flux-renderers-mobile`

- Item Types: `Fix | Decision`

- [x] `use-kanban-filter.ts`：externalFilterText 改 render-time adjust；activeText = `useDebouncedValue` 直用（首帧行为差异见执行中裁决②）
- [x] `media-shared.tsx`：render-time reset（`{src, errored}` 状态，src 变化即重置；既有 `audio.test.tsx:108` 覆盖重置，新增 A→B→A 用例——见执行中裁决⑧）
- [x] `number-keyboard.tsx`：open 改 render-time adjust（本地 confirm/mask 关闭仍持有 open）；digitKeys 重排 effect 合法——Math.random 不能进 render/useMemo（StrictMode/compiler 重执行会重排可见键盘），已加注释留档
- [x] `qrcode.tsx`：failed 按失败输入键派生（`failedKey === renderKey`，键含 value/size/level/颜色）+ 输入变化时 render-time 清除——**同时修复一个 live defect**，见执行中裁决①⑧
- [x] D3 Decision：**加**——以 scanner-baselines ratchet 形态新增 raw 控件扫描器（增长即 `pnpm check` 红）；实现归 successor plan 864 Phase 1（见 Deferred）

Exit Criteria:

- [x] 三包 vitest 全绿（scheduling 1099 / content 381 / mobile 384）；行为语义不变或改进已裁决（qrcode 缺陷修复、kanban 首帧，见执行中裁决①②），既有断言零弱化
- [x] grep 复核五位点无 `useEffect`+`setState` 镜像残留；保留的 digitKeys effect 有注释约束且在裁决记录中
- [x] D3 裁决落档（Deferred 节）

## 执行中裁决（2026-11-06）

① **qrcode live defect（Phase 3 发现并修复）**：旧实现在渲染失败后显示 fallback figure（无 `<canvas>`）；输入改正时 effect 先 `setFailed(false)` 再查 `canvasRef.current`——此时 canvas 尚未挂载，effect 早退，随后挂载的 canvas 永不绘制（空白二维码）。既有测试"recovers from a failed render"只断言 canvas 元素存在、不断言绘制，掩盖了缺陷。新增判别测试"draws the corrected value onto the remounted canvas"：旧实现红（`renderedValues` 仅 `['fail-me']`，`_tmp/audit-1106/859-qrcode-red.log`），派生实现绿。
② **kanban 首帧行为差异**：旧实现 `activeText` 初值 `''`、effect 后才等于外部 filterText——带初始 filterText 挂载时首帧绘制未过滤卡片；新实现 `useDebouncedValue` 以输入初始化，首帧即过滤。属可观测改进（消除一帧闪烁），既有 1099 条 scheduling 测试无一依赖旧首帧。
③ **scope-expansion 附表**：Phase 1 全包 grep 发现清单外 2 处 raw `<label>`（`table-header-row.tsx` 过滤选项行、`cron-editor-renderer.tsx` preset 标签）→ 同规则迁 ui `Label`（前者先补 focused 测试 `table-filter-option-label.test.tsx`）。`<input type="file">`（ai-attachments）与 `type="hidden"` 属 Current Baseline 已列的可接受面。
⑤ **focused e2e 发现的本 plan 回归（已修）**：org-select 面包屑首版把 `BreadcrumbSeparator`（渲染 `<li>`）放进 `BreadcrumbItem`（`<li>`）内，形成非法 `li > li`，React 报 console.error，e2e console 门使 `org-select-department.spec.ts:15` 与 `org-select-user.spec.ts:20` 失败（happy-dom 单测不校验嵌套，未捕获）。改为分隔符与条目同级（`Fragment` 包裹）后两 spec + input-city 9/9 绿。基线对照方法：以命名 stash `plan859-baseline-probe` 暂存本 plan 全部文件、在 HEAD 上跑同 8 个 spec（19 failed），逐条比对得出仅这 2 条为本 plan 引入。
⑥ **oversized 修复**：`table-header-row.tsx` 因 `Label` import 增一行到 701 行（>700 硬阈值，首轮全量 `pnpm check` 红）→ 抽取过滤选项行为 `table-renderer/table-header-filter-options.tsx`（新文件 24 行；`table-header-row.tsx` 降至 691 行），而非挤压行数。
⑦ **全量负载下的既有不稳定测试**：首轮 `pnpm test` 中 mobile `wheel-picker-family.test.tsx` / `wheel-time-picker-form-write.test.tsx` 各 1 条失败（与本 plan 改动无关、单独运行稳定通过）→ 登记为 plan 863 T8，复跑全量 0 failed。

⑧ **closure audit round 1（独立子代理，verdict issues）处置**：

- Major（media 行为回归）：首版派生 `errored = failedSrc?.src === src` 从不清除，A 失败 → 切 B → 回 A 时直接显示错误且不重试（HEAD 每次 src 变化都重置）。改为 render-time reset（`{src, errored}` 状态，src 变化即重置），新增 `audio.test.tsx` "retries a previously failed src after switching away and back (A→B→A)"；qrcode 同类问题（Minor 4：回到已失败值不重绘、不再触发 onLoadError）同法修复（`lastRenderKey` 变化即清 `failedKey`），新增 "re-attempts the draw and re-reports when returning to a previously failed value"。两条新测试在首版派生实现下红、修复后绿（变异演示，备份还原）。
- Minor：e2e 计数 17→19 勘正、2 条未登记红补登 ledger；Phase 1 测试文件名勘正；layers-panel 行选择在 Button（inline-flex）内 `truncate` 失效 → 标签包进 `span.min-w-0.truncate`（与 org 行例外的区别：此处是可点击的整行选择控件，保留 Button 并恢复省略号）；⑥ 的行数归属勘正。

④ **分类规则**：以 owner doc `renderer-markers-and-selectors.md:345` 为准——control-level chrome → ui Button；text-level inline affordance（句内链接、行内 flex-1 截断标签）→ 裸 `<button data-slot>` + 约束注释。org-select-panel 原注释写"nested ui Button inside the selectable row button would violate the button content model"——该行是 div 而非 button，约束表述不实，已改写为真实约束。

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_012423f6（fresh session）
- Verdict: `pass`（round 1 **fail**〔Major-1 计数失真 + Major-2 枚举不全〕→ 全量盘点重写 → round 2 **fail**〔单一残留 Major：文件轴 10→11〕→ 五处修正 → round 3 **pass**，零 Blocker/Major 零残留 finding，共识达成）
- Rounds: 3
- Findings addressed: round-1 Major-1/Major-2 → 全量盘点重写（**23 处/11 文件**逐位点清单版 + 预分类列 + Failure Path scope-expansion + exit 绑定全包 grep 与例外清单；原审计报告 §F-D D1 同源失真已就地勘正）；round-2 Major（文件数 10→11）→ 五处修正（Purpose/Goals/In Scope/Phase 2 标题/审计报告勘正行）；Minor 全吸收——kanban 行号 :13-15/:20-22、playground 计数改"不低于基线快照"、number-keyboard :37-50 显式留档项、cron:221 预分类前置（round 3 逐项复核确认）

## Closure Gates

- [x] 23 位点全部走 migrate 或 adjudicated-exception（清单表终分类与 Deferred 登记一致，无第三态）
- [x] 5 处 effect 镜像消除（或保留处有注释约束 + 裁决记录）；number-keyboard digitKeys 留档
- [x] 受影响包 vitest + playground vitest 全绿；focused e2e 无新增红（19 条失败与 HEAD 逐条一致，已全部登记 ledger——其中 2 条本次补登；本 plan 引入的 2 条已修复）
- [x] 零断言弱化（Phase 1 引用清单逐点核，改动断言逐条裁决在案）
- [x] styling contract 无违背（无 BEM、data-slot 语义保持）
- [x] owner docs 同步判定已执行：无需更新——迁移为组件内部实现，6 处例外均落在 `renderer-markers-and-selectors.md:345` 既有允许形态内（无新约定）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### 6 处 adjudicated exception（23 位点终分类：17 migrate + 6 exception）

- Classification: `out-of-scope improvement`（owner doc 允许的形态，非缺陷）
- Why Not Blocking Closure: 每处都有 in-code rationale 注释，落在 owner doc 允许的"text-level inline affordance"或 ui 组件无语义等价物的情形：
  - `region-columns.tsx`（region-retry）、`org-select-panel.tsx`（org-select-retry）：错误句内联文字链接
  - `region-columns.tsx`（region-node-name）、`org-select-panel.tsx`（org-select-node-name）：行内 flex-1 截断左对齐标签，Button 控件盒（固定高/居中/nowrap）冲突
  - `cron-editor-renderer.tsx` 分档：segmented radio（role=radio + roving tabindex + 方向键），ToggleGroup 改变语义、RadioGroupItem 为圆形 radio
  - `industrial/editor/context-menu.tsx` menuitem：canvas 引擎在指针坐标打开、自管 roving focus；ui ContextMenu/DropdownMenu 需要 DOM trigger 并自管 open 态
- Successor Required: `no`（例外总数 6 将作为 plan 864 raw 控件 ratchet 的基线组成部分）

### D3：raw 控件机械门禁

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本 plan 的结果面是存量位点收口；防增长门禁是独立的治理产物，需要扫描器 + 基线 + wiring + 回归测试，归治理 plan 更诚实。
- Successor Required: `yes`
- Successor Path: `docs/plans/864-governance-gates-and-plan-hygiene-plan.md` Phase 1

### region-trigger 内嵌 `role="button"` 清除控件

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 既有 a11y 问题（交互元素嵌套在 button 内），迁移为 ui Button 前后形态一致、未引入也未加剧；修正需改清除交互设计（移出 trigger），超出本 plan "不改组件行为语义"的 Non-Goal。
- Successor Required: `yes`
- Successor Path: 本会话收敛轮复审时立项（`docs/logs/2026/11-06.md` 记录归属）

## Non-Blocking Follow-ups

- D3 扫描器规则若裁决"加"，实现归工具治理轮新 plan。
- 其余渲染器包（basic/mobile/content/scheduling…）widget 内部控件的同规则盘点与迁移挂 improvement-analysis（本 plan 的 5 包盘点方法可直接复用）。

## Closure

Status Note: 23 位点收口（17 migrate + 6 adjudicated exception，in-code rationale 齐备，落在 owner doc 允许形态内）；5 处 effect 镜像消除（qrcode 顺带修复 live defect，含旧实现必挂的判别测试）；closure audit round 1 Major（media A→B→A 回归）已修并补判别测试，round 2 独立审计 approved 零 Blocker/Major/Minor。五项验证命令（typecheck/build/lint/test/check）在本 plan 状态下全部 exit 0（859-verify-rerun.log）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_e4aa6c74（fresh session，round 1 issues → 处置；round 2 agent（同会话延续审计）approved）
- Evidence: git diff 逐位点核对 23 位点落地 + 6 exception in-code rationale；⑧ 修复核验（media-shared.tsx render-time reset + audio.test.tsx A→B→A + qrcode.test.tsx 回退重绘，变异演示日志 \_tmp/audit-1106/859-qrcode-red.log）；验证日志 \_tmp/audit-1106/859-full-verify.log + 859-verify-rerun.log（五命令 exit 0）；focused 实跑 content 386/386、data 1175/1175、scheduling 1099/1099；ledger F9 增补核验（e2e-baseline-ledger.md:231-233）。详见 docs/logs/2026/11-10.md。

Follow-up:

- region-trigger 内嵌 role="button" 清除控件 a11y 改造（Deferred 节已裁决，successor 立项归属见日志）
- 其余渲染器包 raw 控件同规则盘点（挂 improvement-analysis）
