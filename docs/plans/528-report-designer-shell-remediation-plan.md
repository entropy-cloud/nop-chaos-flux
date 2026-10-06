# 528 Report Designer 外壳体验修正计划

> Plan Status: completed
> Last Reviewed: 2026-10-05
> Source: docs/analysis/2026-10-05-designer-ai-ux-comparative-analysis.md（§3.1 / §4.3 report-designer 差距矩阵 / §4.4 word-editor）
> Related: docs/plans/526-flow-designer-drag-visual-remediation-plan.md 等 527/529

## Purpose

收口 report-designer 外壳（字段面板/WorkbenchShell/Inspector/拖放）与业界标准的已确认差距：面板可调宽、字段面板搜索、字段拖放 ghost、空态/加载态；word-editor 面板可调宽跟随收口。

## Current Baseline

- report-designer 画布复用 spreadsheet 网格（`report-spreadsheet-canvas.tsx` 内嵌 `SpreadsheetGrid` + `SheetTabBar`），spreadsheet 本体交互（框选/填充柄/行列 resize/右键菜单/键盘）为仓库最佳，不在本 plan 范围。
- **两个生效路由、两条外壳路径（评审 M1 修订）**：
  - `/#/report-designer`（demo，report-designer-demo.spec / report-designer-ux-r9.spec 被测页）＝ `apps/playground/src/pages/report-designer-demo.tsx` 自行组合 WorkbenchShell（:469 起，leftPanel 自带 header + ReportFieldPanel，leftCollapsed 为本地 state），不经过 renderer 的 `page-renderer.tsx`。
  - `/#/report-designer-host`（report-designer-host.spec 被测页）＝ renderer 路径 `packages/report-designer-renderers/src/page-renderer.tsx:645-674`（未传 leftResizable/rightResizable）。
- WorkbenchShell（`packages/flux-react/src/workbench/workbench-shell.tsx`）支持 `leftResizable`/`rightResizable`（:24,35），带指针/键盘 resize + aria valuenow；resize 手柄为 `w-1`（4px，:50-51）；仅 ≥1024px 视口（TABLET_BREAKPOINT :58）生效。**无宽度持久化机制**（:149-160 controlled/uncontrolled 均为内存态）；flow 的宽度持久是宿主侧会话内状态（core shell-state + `setPanelWidths` 命令），跨 reload 不持久。→ report/word-editor 用页面本地 useState 即可达「与 flow 行为一致」，不触碰 core 命令面。
- 字段面板（`report-field-panel.tsx`）：HTML5 DnD MIME `application/x-nop-report-field`（:8，JSON payload + text/plain 兜底 :28-29），dragstart 仅 setData 无 setDragImage（:93-103），无搜索过滤；Insert 按钮带禁用原因 aria-describedby（:125-129）。字段数据源 `fieldSources: FieldSourceSnapshot[]`（groups[].fields[].label/fieldType，page-renderer.tsx:584 传入）。可见面板头由 `page-renderer.tsx:150-186` renderPanelFrame（demo 页自带 header）渲染——搜索框落在 report-field-panel.tsx 顶部、frame header 之下。
- 第二套字段面板实现 `field-panel-renderer.tsx`（注册名 'report-field-panel'，renderers.tsx:224-225）经核实**两个 live 路由均不使用**（host-demo schema 无 fieldPanel 节点；demo 页直接 import ReportFieldPanel :536-560）——本 plan 不改它，记 Follow-up。
- Inspector shell 空态/loading/错误三分支为纯 `<p>` 文字（`inspector-shell-renderer.tsx:51-63`）。
- word-editor（`word-editor-page.tsx:337-375`）**确实使用 WorkbenchShell**（左=datasets/fields Tabs :201-257，右=OutlinePanel :297-325），仅缺 resizable props。
- 落点反馈已有：单元格 drop-target 虚线 outline + 底色（spreadsheet canvas-styles.css:775-779），drop 失败回滚（report-designer-demo.tsx:380-397）。
- e2e：report-designer-demo/host/ux-r9 + word-editor 共 6 支 spec；master 最近 full e2e 1671/0（收口时以实跑为准）。

## Goals

- report 两条外壳路径（demo 页 + renderer 页）与 word-editor 三栏外壳获得与 flow-designer 一致的面板调宽能力（会话内有效，不做跨 reload 持久）。
- 字段面板支持按名称/类型子串过滤，含空结果态。
- 字段拖起有自定义 ghost（类型色 + 字段名），MIME payload 不变。
- Inspector/面板空态与加载态升级（骨架/图标 + 文案卡片，非裸文字）。

## Non-Goals

- spreadsheet 网格本体交互/视觉改造
- 报表模板 schema、字段绑定协议、drop 回滚逻辑变更
- 宽度跨 reload 持久化（core `setPanelWidths` 命令面扩展，见 Deferred）
- 缩放/标尺/minimap（文档流画布，见 Deferred）
- word-editor Ribbon/编辑内核（canvas-editor 库内）
- `field-panel-renderer.tsx` 第二套实现（live 路由不使用，记 Follow-up）

## Scope

### In Scope

- `packages/report-designer-renderers/src/page-renderer.tsx`（renderer 路径 resizable 接线）
- `apps/playground/src/pages/report-designer-demo.tsx`（demo 路径 resizable 接线，本地 useState）
- `packages/word-editor-renderers/src/word-editor-page.tsx`（resizable 接线）
- `packages/report-designer-renderers/src/report-field-panel.tsx`（搜索 + ghost）
- `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`（空态/加载态）
- 相关 i18n 键 + 单测/e2e（report-designer-demo/host/ux-r9、word-editor\*.spec 扩展）

### Out Of Scope

- `packages/spreadsheet-*`
- report-designer-core / word-editor-core 命令面变更

## Failure Paths

| 编号           | 触发                          | 行为                                      | 可重试 | 用户可见表现 |
| -------------- | ----------------------------- | ----------------------------------------- | ------ | ------------ |
| filter-empty   | 字段搜索无匹配                | 空态文案 + 清除                           | 是     | 空态         |
| ghost-fallback | setDragImage 在宿主环境不可用 | 降级浏览器默认截图（feature-detect 守卫） | 是     | 默认拖拽视觉 |

## Test Strategy

档位选择：`建议有测`。
字段过滤纯函数单测；resizable/ghost/空态用 e2e 程序化断言（面板宽度 getBoundingClientRect 前后对比、data-testid、aria 状态）；resize 断言须在 ≥1024px 视口执行（WorkbenchShell TABLET_BREAKPOINT）。

## Execution Plan

### Phase 1 - 面板可调宽（report 双路径 + word-editor）

Status: completed
Targets: `report-designer-renderers/src/page-renderer.tsx`, `apps/playground/src/pages/report-designer-demo.tsx`, `word-editor-renderers/src/word-editor-page.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: report renderer 路径 `page-renderer.tsx` WorkbenchShell 传入 `leftResizable`/`rightResizable`，宽度走页面本地 useState（会话内有效，对齐 demo 页 leftCollapsed 模式；shell 无持久化，不触碰 core 命令面）
- [x] Fix: report demo 路径 `report-designer-demo.tsx` 自组合的 WorkbenchShell 同样传入两 props（本地 useState）
- [x] Fix: word-editor `word-editor-page.tsx` WorkbenchShell 接入左右 resizable（同法）
- [x] Proof: e2e（≥1024px 视口）断言三处拖动 4px 分隔手柄后面板宽度变化（getBoundingClientRect 前后对比）+ 键盘 focus-visible 可达

Exit Criteria:

- [x] report demo/renderer 两路径 + word-editor 面板可调宽落地，与 flow 行为一致（会话内）
- [x] report-designer-demo/host/ux-r9、word-editor 既有 e2e 不回归
- [x] focused e2e 通过

### Phase 2 - 字段面板搜索与拖放 ghost

Status: completed
Targets: `report-designer-renderers/src/report-field-panel.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: 面板顶部（frame header 之下）新增搜索 Input，按字段 label/fieldType 子串过滤（大小写不敏感；数据源 fieldSources 快照），空结果空态 + 清除
- [x] Fix: dragstart 构造类型色 ghost（字段类型 pill 色 + 名称）`setDragImage`（feature-detect 守卫），dragend 清理；MIME payload 不变
- [x] Proof: 过滤纯函数单测；e2e 断言搜索过滤与 drop 流程（既有 drop-target 断言、失败回滚断言）共存

Exit Criteria:

- [x] 搜索 + ghost 落地
- [x] 单测通过；report drop 回滚既有断言不回归
- [x] i18n 新键通过 check

### Phase 3 - 空态与加载态升级

Status: completed
Targets: `report-designer-renderers/src/inspector-shell-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] Fix: Inspector 空态 → 图标 + 标题 + 引导文案卡片；loading → 骨架条（Skeleton 或 CSS 骨架），错误态保留文字但加图标与 destructive 令牌
- [x] Proof: e2e 断言三态结构（data-testid/aria-busy）

Exit Criteria:

- [x] 三态升级落地
- [x] focused e2e 通过；既有 report e2e 不回归

## Draft Review Record

- Reviewer / Agent: 独立子 agent（round 1，task agent_cc119645 verdict fail 0B/1M；task agent_01d24955 round 2: pass（零残留））
- Verdict: pass-with-minors（round 2 复核通过，零 Blocker/Major）
- Rounds: 2
- Findings addressed: M1 demo/renderer 双路径 gap → demo 页（report-designer-demo.tsx）纳入 In Scope 与 Phase 1 Targets，双路径都接线；m1 → 显式裁决：shell 无持久化，页面本地 useState；m2 → 基线手柄宽度改 4px（w-1）；m3 → 写明搜索框落点与 field-panel-renderer 第二套实现 parity 裁决（不使用，Follow-up）；m4 → resize e2e 须 ≥1024px 视口写入 Test Strategy/Proof；m5 → e2e 全绿以收口实跑为准

## Closure Gates

- [x] 所有 in-scope confirmed live UX gaps 已修复（§4.3 表逐条对账 + §4.4 面板调宽）
- [x] 行为结果已达成（Goals 逐条可观测）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响 owner docs 已同步（report-designer/word-editor owner 文档交互节，如涉及）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 宽度跨 reload 持久化

- Classification: `optimization candidate`
- Why Not Blocking Closure: WorkbenchShell 无持久化机制，flow 的持久也是会话内状态；跨 reload 持久需 core `setPanelWidths` 命令面 + 存储约定，属契约扩展
- Successor Required: `no`（需要时新开 plan）

### 画布缩放/标尺/minimap

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: report 画布为文档流表格（非自由画布），无缩放导航诉求；spreadsheet 已有视口虚拟滚动
- Successor Required: `no`

## Non-Blocking Follow-ups

- `field-panel-renderer.tsx` 第二套字段面板的搜索/ghost parity（live 路由当前不使用）
- 字段面板类型分组折叠
- Inspector 空态引导直达「插入字段」动作

## Closure

Status Note: 三 Phase 落地：Phase 1 三处面板可调宽（report renderer 路径 / playground demo 路径 / word-editor 经 use-word-editor-state 透传，本地 useState 会话内有效——WorkbenchShell 无持久化机制已裁决）；Phase 2 字段面板检索（matchesReportFieldQuery 纯函数 + 4 单测 + 空态清除）与拖拽 ghost（typeof+try/catch 双守卫降级）；Phase 3 Inspector 三态升级（空态卡 ClipboardList/骨架 aria-busy+sr-only/错误卡 TriangleAlert+destructive 令牌）+ 三态确定性单测。Closure Gates 全绿：typecheck/build/lint 42/42、pnpm test 78 tasks、pnpm check exit 0（scanner-baselines 716→717 有意识注册：ghost 降级 catch 属 UI 降级而非错误吞噬，理由落 reRegistrationNotes）、report/word-editor e2e 32 passed（新增 ux-visual 4 例）。执行期顺手修复存量 flux-runtime 测试 stale mock（HEAD 上 TS2554，与本 plan 无关）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，round1 task agent_3cdddb26 verdict issues；round2 task agent_f5d857d3 verdict approved 零 findings）
- Evidence: round1 两 Major（en-US 丢键 insertDisabledNoSelection / scanner-baselines 未注册）与两 Minor（Inspector 三态零断言 / Phase 1 Proof 收窄）全部处理后 round2 复核 approved：en-US 键恢复（en-US.ts:997）、基线注册含日期理由、inspector-shell-states.test.tsx 三态真实断言（包 21 files/213 tests 绿）、ux-visual 4/4 绿、双包 typecheck 通过

Follow-up:

- 见 Non-Blocking Follow-ups（field-panel-renderer 第二套实现 parity / 字段面板类型分组 / Inspector 空态直达插入）；无剩余 plan-owned work
