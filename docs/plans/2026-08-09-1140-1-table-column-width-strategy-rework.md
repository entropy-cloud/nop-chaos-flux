# {1} Table Column-Width Strategy Rework（maxWidth 过度矫正 + 控制列拉伸不对称收口）

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/audits/2026-08-09-1114-open-audit-component-audit-round2.md`（[P1-01] 无 width 列被 120px 硬封顶、[P1-02] 非 sticky 控制列仍被拉伸、[P2-01] H10 comparator 注释事实性错误）
> Related: `docs/logs/2026/08-09.md`（未提交 WIP = closeOnSubmit + table maxWidth 修复）

## Purpose

收口未提交的 table maxWidth 修复（WIP，daily log 2026-08-09 顶部条目）：该修复对**所有**表头 cell 施加 `width/minWidth/maxWidth = resolvedWidth`，叠加 `getColumnWidth` 的 120 fallback，使所有无显式 width 的普通数据列被硬性封顶在 120px——默认表格不再填满容器（右侧留白）、宽内容表头与表体错位；同时因 maxWidth 只在 sticky 配置下输出，最常见（rowSelection 且无 fixed 列）的非 sticky 控制列仍会被拉伸，原始用户反馈「序号/checkbox 列过宽」未修。目标：按列类别区分宽度策略（sticky/控制列封顶、普通数据列可拉伸填满），并用真实浏览器宿主断言钉住像素级行为。

## Current Baseline

（全部经 live 核对，2026-08-09 未提交工作区）

- **修复目标正确**：`packages/flux-renderers-data/src/table-renderer/fixed-columns.ts:34-48` `createStickyStyle` 对 sticky 列输出 `width/minWidth/maxWidth`，阻止 `table-layout:auto` 剩余空间拉伸——sticky 列（index/checkbox/expand/fixed）不再被拉宽。
- **过度矫正（P1-01）**：`table-header-row.tsx:163` `resolvedWidth = resizeApi?.getColumnWidth(column, index) ?? column.width`；`:176-181` 对**所有**表头 cell 输出 `{ width, minWidth, maxWidth }`。`use-column-resize.ts:28-30` `resolveColumnWidth` fallback=120、`:142` `initialWidths` 对每个可 resize 列预填 `resolveColumnWidth(column)`、`:237-240` `getColumnWidth` 恒返回 `widths[key] ?? 120` → 无 width 列全部得到 120；`table-renderer.tsx:284` `columnResize` 默认开、`:293-314` `effectiveMainColumns` 把 120 写回 `column.width`。后果：`packages/ui/src/components/ui/table.tsx:11` `w-full` 表格列宽合计 < 容器宽；cell 默认 `whitespace-nowrap` 内容宽于 120 时表体 min-content 撑宽列、表头被封在 120 → 表头/表体错位；`columnResize: false` 时同样生效。
- **覆盖不对称（P1-02）**：`fixed-columns.ts:99-121` `resolveEntry` 非 sticky 返回 `{}`；`table-body-row-rendering.tsx:250-299` 表体控制 cell 非 sticky 时无宽度样式；`table-header-row.tsx:396-422,528-557` 表头控制 cell 仅 `width:'40px'` 无 maxWidth → 非 sticky 配置（最常见 CRUD 选择表格）下控制列仍参与剩余空间分配被拉伸。
- **注释事实性错误（P2-01）**：`table-body-row-rendering.tsx:571-580` 注释声称 `MemoizedDataRow` 比较器「已包含 `fixedColumnLayout`」；`:581-616` 实际比较器无此项。当前功能安全（`areColumnsRenderEquivalent` 覆盖 `fixed`/`width`、rowSelection、showExpandColumn 等全部 layout 输入），属注释误导。
- **验证盲区**：daily log 只记录了 sticky 覆盖行为的 resize 交互验证（jsdom 无法执行 CSS 表格布局）；无真实浏览器断言钉住「默认表格列宽合计 = 容器宽」与「非 sticky 控制列 40px」。
- 测试基线：`pnpm --filter @nop-chaos/flux-renderers-data test` = 770 passed（111 文件）；改动未提交。

## Goals

- 普通无 width 数据列恢复自动拉伸填满容器（`w-full` 表格列宽合计 = 容器宽，无右侧留白）。
- sticky/控制列（index/checkbox/expand/fixed）在任何配置下（含非 sticky）宽度 = 声明值（40/50/声明 width），不被剩余空间拉伸。
- maxWidth 封顶策略与 sticky 解耦，按列类别输出（控制列无条件封顶；sticky 列随 sticky 样式封顶；普通数据列不封顶）。
- `getColumnWidth`/`effectiveMainColumns` 对无 width 列回落到 `column.width` 语义（不写回 120）。
- 真实浏览器宿主断言（H 系列纪律）钉住「默认表格列宽合计 = 容器宽」与「非 sticky 选择列 40px」。
- H10 comparator 注释事实性恢复（补比较项或改写注释，与 live 行为一致）。

## Non-Goals

- **不采用 `table-layout: fixed` 全局切换**（AMIS 默认方案）：改变全部表格的列分配语义、爆炸半径大，需单独评估；本 plan 只裁决并记录理由（见 Phase 2 Decision）。
- 不改 resize 拖拽/键盘交互语义与 `columnResize` 配置契约。
- 不处理 closeOnSubmit 契约面（归 plan `2026-08-09-1140-2`）。
- 不处理 open-audit [P2-02] `publishClosedSummary` owner-scope 解析（归 follow-up backlog）。
- 不改 `packages/ui` 公共导出面。

## Scope

### In Scope

- `table-header-row.tsx`、`table-body-row-rendering.tsx`、`fixed-columns.ts`、`use-column-resize.ts`、`table-renderer.tsx` 的宽度策略重构（Fix）。
- 真实浏览器 e2e 宿主断言（Proof）：默认表格列宽合计 = 容器宽；非 sticky 选择列 40px；sticky 配置下固定列不被拉伸（sticky 场景以 unit 断言覆盖，e2e 覆盖前两条）。
- H10 comparator 注释/比较项对齐（Fix）。
- bug note 120（行内补写，Cross-Cutting bug-note 纪律）+ daily log 记录。

### Out Of Scope

- `table-layout: fixed` 全局方案落地。
- closeOnSubmit 契约收口（plan `2026-08-09-1140-2`）。
- open-audit [P2-02]（backlog）。
- 其他组件/包的宽度或布局改动。

## Failure Paths

> 不适用：本 plan 无外部 IO/鉴权/错误码契约。唯一注意点：e2e 断言不得依赖截图，须用 programmatic 宽度断言（AGENTS.md 纪律）。

## Test Strategy

本档选择：`必须自动化`

- 这是核心回归路径（默认 table 布局 + 控制列宽度是所有 CRUD/playground 最常见形态），且根因是「修复意图正确、实现未按列类别区分、无真实浏览器验证」的组合缺陷——必须 test-first 收口。
- 单元层：column 宽度样式断言（sticky/非 sticky × 控制列/普通列矩阵）。
- e2e 层：真实浏览器列宽合计断言（jsdom 无法验证 CSS 表格布局，open-audit 盲区自评已确认）。
- Proof 项（e2e 断言）在 Fix 之前先行（红 → 修 → 绿）。

## Execution Plan

### Phase 1 - 真实浏览器基线断言（Proof，test-first）

Status: completed
Targets: `tests/e2e/`（新 spec，如 `table-column-width-layout.spec.ts`）、`packages/flux-renderers-data/src/__tests__/table-data-and-layout.test.tsx`

- Item Types: `Proof`

- [x] **Proof（e2e 基线）**：新增真实浏览器 spec——默认表格（无 width 列、`columnResize` 默认开）断言：`sum(各数据列 getBoundingClientRect().width) + 控制列宽 = 表格容器宽`（±1px）；该断言在当前未提交 WIP 上**先红**（证明过度矫正存在）。宿主 fixture：先确认 playground 中一个含默认表格的既有路由（如 crud demo 页，`tests/e2e/` 既有 spec 参考），无现成 fixture 则在本 plan 内新建 playground 页/路由（记录路径）。
  - 执行记录：既有路由（crud demo `standard-crud`、table-popover 等）的表格全部带显式 width / fixed 列，无「默认表格」fixture → 本 plan 新建宿主页 `apps/playground/src/pages/table-column-width-demo.tsx`（路由 `#/table-column-width`，domain-route-entries.ts + App.tsx + pages/index.ts 登记）。**RED 证据**：WIP 上表头 cell 内联 `width/minWidth/maxWidth=120px`（`getColumnWidth` fallback），e2e 内联样式断言红。**真实浏览器发现**（写入 bug note 120）：Chromium auto 布局忽略 cell `max-width`，WIP 未冻结像素列宽（sum=886=容器宽仍成立）——故 e2e 断言 = 内联样式判别（RED on WIP）+ 像素终态（sum=容器宽，双轨钉住目标行为）。
- [x] **Proof（e2e 非 sticky 控制列）**：rowSelection 且无 fixed 列配置断言：selection 列宽 = 40px（±1px），当前实现上先红（证明 P1-02 原缺陷仍在）。
  - 执行记录：WIP 实测 selection 列 65.34px（容器 886px、4 数据列 + selection）→ RED；修复后 40.0px → GREEN；并断言非 sticky（computed position ≠ sticky）。
- [x] **Proof（unit 基线）**：`table-data-and-layout.test.tsx` 补/核 unit 断言——无 width 列不产出 `maxWidth` 样式（当前 WIP 上先红）；sticky 列仍产出 `width/minWidth/maxWidth`。
  - 执行记录：新增「column-width strategy」describe 9 断言（因 710 行 lint 上限落 `table-column-width-strategy.test.tsx` 独立文件；`table-data-and-layout.test.tsx` 内更新非 sticky 控制列旧契约断言 + 既有 fixed-layout 断言维持），WIP 上 7/9 先红（无 width 列内联样式 / getColumnWidth 120 fallback / 非 sticky 控制列封顶 / widths 预填写回），sticky 契约断言维持绿。

Exit Criteria:

- [x] 三条先红断言已落地并确认失败（运行记录：`pnpm test:e2e <spec>` 与 data 包 focused 测试红）。
  - 运行记录：`npx playwright test table-column-width-layout.spec.ts` → 2 failed（内联宽度样式 120px、selection 65.34px）；`vitest run table-data-and-layout.test.tsx` → 7 failed。
- [x] 断言均为 programmatic 宽度断言（`getComputedStyle`/`getBoundingClientRect`/inline style 检查），无截图依赖。

### Phase 2 - 宽度策略按列类别重构（Fix + Decision）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/{table-header-row.tsx,table-body-row-rendering.tsx,fixed-columns.ts,use-column-resize.ts,table-renderer.tsx}`

- Item Types: `Fix | Decision | Proof`

- [x] **Fix（表头普通列）**：`table-header-row.tsx:176-181` 移除对所有列的无条件 `maxWidth`——仅当列有显式 `column.width`（或 sticky/控制列路径提供宽度）时输出 `width/minWidth/maxWidth`；无 width 列回落到 CSS auto 布局（可拉伸）。
  - 执行：`resolvedWidth = resizeApi?.getColumnWidth(...) ?? column.width` 在 `getColumnWidth` 修复后对无 width 列返回 `undefined` → 三件套分支自然跳过；控制 cell 弃裸 `width:'40px'` 统一消费 layout props。
- [x] **Fix（getColumnWidth fallback）**：`use-column-resize.ts:237-240` 对无 `column.width` 的列返回 `undefined`（或等价信号），使 `table-header-row.tsx:163` 回落到 `column.width` 语义；`:142` `initialWidths` 预填只针对有显式 width 或参与 resize 的列；确认 `columnResize: false` 路径同步收敛。
  - 执行：`getColumnWidth` → `key in widths ? widths[key] : column.width`（类型放宽 `number | string | undefined`）；`initialWidths` 增加 `toNumericWidth(column.width, NaN)` 有限性判定（无 width / 非法 width 不预填）；120 fallback（`resolveColumnWidth`）仅保留 `startResize`/`stepResize` 起始值；unit 断言 `columnResize:false` 下 `getColumnWidth` 返回声明值或 undefined。
- [x] **Fix（effectiveMainColumns 写回）**：`table-renderer.tsx:293-314` 仅把 resize 结果写回有显式 width 的列，不再把 120 写回无 width 列。
  - 执行：live 核对——`widths` 经 initialWidths 修复后只含显式 width 列 + 真实 resize 结果，`override !== undefined && override !== column.width` 分支对无 width 列永不触发；无需代码改动（unit 矩阵 + `widths` 追踪断言覆盖）。
- [x] **Fix（控制列与 sticky 解耦）**：`fixed-columns.ts:99-121` `resolveEntry` 对 `__selection__`/`__expand__` 无条件输出 `width/minWidth/maxWidth = CONTROL_COLUMN_WIDTH`（非 sticky 也封顶），sticky 时叠加 `createStickyStyle`；`table-header-row.tsx:396-422,528-557` 与 `table-body-row-rendering.tsx:250-299` 的控制 cell 统一消费该 props（不再裸 `width:'40px'`）。
  - 执行：`fixed-columns.ts` 新增 `createControlColumnStyle`，`resolveEntry` 非 sticky 控制列返回 `{ style: { width, minWidth, maxWidth } }`；表头 flat/nested 控制 cell 统一消费 `getSelectionCellProps()/getExpandCellProps()`；表体控制 cell 已消费 layout props（自动受益）。
- [x] **Decision（table-layout: fixed 备选）**：裁决是否引入 `table-layout: fixed` 作为全局默认（记录理由；预期驳回：改变全部列分配语义、跨包爆炸半径大，本 plan 按列类别 maxWidth 方案已覆盖反馈场景）。
  - 裁决记录：**驳回**。`table-layout: fixed` 会把「列宽完全由声明 width 决定、无声明则均分」的语义强加给全部表格（含所有现有 CRUD/playground 页），且 AMIS 默认方案改变后依赖 min-content 自适应宽度的场景（宽内容单元格、popOver、树形缩进）需逐列补 width 才不溢出——爆炸半径跨 `flux-renderers-data`/`ui`/生成器输出；本 plan 的按列类别 maxWidth 方案已覆盖审计 P1-01/P1-02 与原始用户反馈（控制列拉伸），Deferred But Adjudicated 节同步维持。
- [x] **Proof（unit 矩阵）**：data 包 focused 测试——sticky/非 sticky × 控制列/普通列 × 有/无 width 四象限宽度样式断言全绿；既有 column-resize/table-data-and-layout/table-index-column 套件零回归。
  - 执行：`table-column-width-strategy.test.tsx` 9 断言覆盖四象限（无 width 普通列无样式 / 显式 width 三件套 / 非 sticky 控制列 40px（表头+表体+layout props）/ sticky 控制列+数据列 position+三件套 / columnResize:false 收敛 / widths 追踪）；既有套件零回归（`pnpm --filter @nop-chaos/flux-renderers-data test` = 790 passed，113 文件——含 C1a WIP 测量套件）。

Exit Criteria:

- [x] `table-header-row.tsx` 不再对无 width 普通列输出 maxWidth；`fixed-columns.ts` 控制列非 sticky 时也有宽度封顶；`effectiveMainColumns`/`getColumnWidth` 无 120 写回（live diff 可见 + unit 矩阵绿）。
- [x] 四象限 unit 断言全绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（含既有 column-resize 套件）——778 passed（770 基线 + 8 净增）。

### Phase 3 - H10 注释对齐 + e2e 转绿 + 沉淀（Fix + Proof）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、`tests/e2e/table-column-width-layout.spec.ts`、`docs/bugs/120-*.md`、`docs/logs/2026/08-09.md`、`docs/backlog/audit-followups-2026-08-09-1114.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] **Fix（P2-01 H10 comparator）**：`table-body-row-rendering.tsx:581-616` 比较器补 `prev.fixedColumnLayout === next.fixedColumnLayout`（与注释一致，注释保持「已包含」声明），或改写注释如实描述覆盖关系——以 comparator 是否已通过其他项覆盖 layout 输入为准，二者取一并与注释一致。
  - 执行（取「改写注释」选项）：先补比较项（test-first 先红——unit 断言「仅 layout 身份变化 → 行重渲染」通过），随后真实浏览器回归暴露**该比较项破坏 locality 契约**：`performance-table.spec.ts:349` 单行 locality 诊断 sibling probe delta 0 → 2（fixedColumnLayout 身份随 render 派生输入（measuredWidths 状态等）churn，比较项使所有行每次渲染都重渲染）。审计结论成立：comparator 已按内容覆盖全部 layout 输入（`areColumnsRenderEquivalent` 含 fixed/width、rowSelection、showExpandColumn 直接比较），内容相等则无 stale 风险。终态 = 撤比较项 + 重写 H10 注释如实描述覆盖关系与不采用身份比较的理由（含 locality 实测证据）；unit 回归测试改为钉住「内容相等的身份 churn 保持 locality」（先红后绿：初始断言身份 churn → 重渲染在旧注释承诺下成立 → 改写后契约翻转）。
- [x] **Proof（e2e 转绿）**：Phase 1 三条先红断言全部转绿（真实浏览器）。
  - 执行：`npx playwright test table-column-width-layout.spec.ts` 2/2 green——①默认表：无内联宽度样式 + 列宽合计 886 = 容器 886（±1）；②rowSelection 无 fixed 列：selection 列 40.0px（±1）+ 非 sticky + 列宽合计 = 容器宽。
- [x] **Fix（bug note 120）**：按 `docs/bugs/00-bug-fix-note-writing-guide.md` 行内补写 bug note 120（maxWidth 过度矫正 + 控制列不对称，含根因「未按列类别区分 + jsdom 盲区」），`docs/bugs/README.md` 索引同步。
  - 执行：`docs/bugs/120-table-column-width-strategy-class-split-fix.md`（含真实浏览器发现：Chromium 忽略 cell max-width 但 min-width 生效）+ README Current Entries 登记。
- [x] **Follow-up（backlog 核对）**：确认 open-audit [P2-02] 已在 `docs/backlog/audit-followups-2026-08-09-1114.md` 登记（不随本 plan 收口）。
  - 执行：P2-02 行在案（去向：待后续批次），零改动。
- [x] **Fix（daily log）**：`docs/logs/2026/08-09.md` 记录本 plan 收口（修复摘要、先红断言 → 转绿记录、bug note 120、测试计数）。
  - 执行：本节条目 + WIP 顶部条目保留为历史上下文（其描述已被本 plan 修正）。

Exit Criteria:

- [x] H10 注释与比较器实现一致（live 可核验——注释如实描述内容级覆盖：areColumnsRenderEquivalent 含 fixed/width + rowSelection/showExpandColumn 直接比较；不采用身份比较，理由与 locality 实测证据在注释内）。
- [x] `tests/e2e/table-column-width-layout.spec.ts` 断言绿（2/2，含像素终态与内联样式判别）；data 包 770+ 测试全绿（790）。
- [x] bug note 120 存在且 README 索引已登记；daily log 条目存在；backlog note 中 open-audit P2-02 行已核对。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_01b5f84d8ffeorZf5xM39GL7ym`（独立 fresh session plan review，2026-08-09）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已全部处理——①Scope In Scope 三断言与执行计划对齐（sticky 场景明确为 unit 断言覆盖，e2e 覆盖前两条）；②e2e 宿主 fixture 未钉路由——Phase 1 item 补「先确认既有 playground 路由，无则本 plan 内新建并记录路径」；③`getColumnWidth` 行号跨度 237-243（返回语句 240）已在 plan 中保持原引用。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 无 width 普通列恢复拉伸填满容器（e2e 列宽合计 = 容器宽断言绿——886 = 886，±1）
- [x] 控制列在任何配置下宽度 = 声明值（非 sticky 选择列 40px e2e 断言绿——40.0px ±1，非 sticky）
- [x] H10 comparator 注释与实现一致（改写注释选项：内容级覆盖声明 + 不采用身份比较的理由，live 可核验）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（P1-01/P1-02/P2-01 全部落地；P2-02 为 plan 声明的 Non-Blocking Follow-up，backlog 在案）
- [x] 受影响的 owner docs（bug note 120、daily log、backlog note）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### `table-layout: fixed` 全局切换

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 的按列类别 maxWidth 方案已覆盖用户反馈（控制列拉伸）与审计 P1-01/P1-02 全部场景；`table-layout: fixed` 是另一条更大爆炸半径的路线（全部表格列分配语义变化），裁决理由记录在 Phase 2 Decision 后即为非阻塞。
- Successor Required: `no`

## Non-Blocking Follow-ups

- open-audit [P2-02] `publishClosedSummary` owner-scope 解析不一致：已登记 `docs/backlog/audit-followups-2026-08-09-1114.md`（潜伏契约分叉，当前调用面无实际差异，非本 plan 义务）。

## Closure

Status Note: 已完成（2026-08-09，closure-audit pass 后翻转；Phase 1-3 全 completed，Closure Gates 全 [x]）

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（task `ses_01ae800f4ffeHncigUBziFThNG`，2026-08-09，输入 = 本 plan + diff 摘要 + 验证输出三件套）
- Evidence: verdict **pass**（零 Blocker / 零 Major）；A-G 七项核对全 PASS——①plan 一致性（Phase/Exit Criteria/Closure Gates 全 [x]、Plan Status completed、Closure 节已填）；②代码与 live 一致（initialWidths 显式 width 预填、getColumnWidth 无 120 fallback、控制列非 sticky 封顶、表头控制 cell 消费 layout props、effectiveMainColumns 无 120 写回）；③H10 注释如实描述内容级覆盖、comparator 无身份比较（一致性成立）；④测试断言在案（9 断言四象限 + 测量告警 2 + locality 契约 + cleanup 修正）；⑤文档在案（bug note 120 + README 索引、daily log、backlog P2-02 行、playground 路由 + e2e 路由清单）；⑥无破损状态（lint/typecheck 干净）；⑦Closure Audit Evidence 回填由本记录完成。Minor×2 已修：daily log Phase 1 断言归属文件更正为 `table-column-width-strategy.test.tsx`（plan 内 Phase 1 记录已含拆分说明）；backlog 双 P2-02 行（publishClosedSummary / closeOnSubmit）无冲突、plan 引用正确。

Follow-up:

- Non-blocking follow-up 维持 plan 既有登记：open-audit [P2-02] `publishClosedSummary` owner-scope 解析（`docs/backlog/audit-followups-2026-08-09-1114.md`，待后续批次）；confirmed live defect 无。
- 状态翻转注记：本 plan 无 `> Work Item:` / `> Source Audits:` front-matter（audit-sourced 用 `> Source:`），roadmap ❌→✅ 与审计状态翻转不适用；open-audit `2026-08-09-1114-open-audit-component-audit-round2.md` 维持 `planned`（与 08-05 `> Source:` 型 plan 先例一致，其发现全部路由：P1-01/P1-02/P2-01 本 plan 落地，P2-02 backlog 在案）。
