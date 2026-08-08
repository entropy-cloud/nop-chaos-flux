# D3.3 report-designer 大面审计（report-designer-core + report-designer-renderers）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: D3.3
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（D3.3 行 + D3.x Phase Details + Cross-Cutting + Dependency Graph）、`docs/audits/host-surface/README.md`（§1 report-designer 行 + §2 宿主 e2e 清单）、`docs/audits/host-surface/surface-inventory.md`（rd-1..rd-7）、`docs/audits/component-audit-checklist.md` v2 §6（host 审计卡模板）
> Related: `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md`（completed，host 模板与面清单）、`docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`（completed，同型 plan 先例 + DR 表首个写入者）、`docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md`（draft，本 plan 执行序在后）

## Purpose

对 report-designer 大面（`report-designer-core` + `report-designer-renderers`，7 个审计面 rd-1..rd-7）执行首次逐面审计：按 checklist v2 §6 host 审计卡模板产出逐面审计卡（18 维降维 + H1–H7 designer 特有维度）落 `docs/audits/host-surface/`；每面 ≥1 真实浏览器宿主场景（bug 73 模式专项，programmatic DOM 断言，禁截图——既有 `report-designer-demo.spec.ts` 1 spec 9 用例可复用，缺口补新场景）；P0/P1 自动修复（test-first）；P2 显式登记 `docs/audits/round2-dr-adjudication.md`（DR-3+ 顺延）路由 DR；P3 卡内记录；复杂 bug 行内补写 bug note（编号承接 107 起顺序递增）；回归验证后由独立 fresh session 执行 closure-audit。收口后 roadmap D3.3 行 `todo`→`done`。

## Current Baseline

（live repo 核对事实，2026-08-08）

- **D0/D1/D2/DB/DL/D3.1/D3.2 全部 completed 或已立 plan**（2026-08-08）：host 面清单 rd-1..rd-7 在案（`docs/audits/host-surface/surface-inventory.md`）；checklist v2 §6 host 审计卡模板就位。
- **契约基准齐备**（README §1 report-designer 行）：9 份 owner docs——`docs/architecture/report-designer/{design,api,contracts,codec-design,config-schema,inspector-design,nop-report-profile,spreadsheet-canvas-css}.md` + `README.md`；`inspector-design.md` 承载 inspector 契约、`contracts.md` 承载 host 契约、`codec-design.md` 承载编解码契约（rd-6 undo 面契约基准）。
- **宿主 e2e 场景存在**（README §2）：`report-designer-demo.spec.ts`（1 spec 9 用例：demo 页工具栏/画布/字段面板交互，含 data-slot 定位）——面覆盖矩阵（1 spec ↔ rd-1..rd-7）为本 plan Phase 1 输出；缺口（rd-4 预览 / rd-5 保存 / rd-6 undo / rd-7 模板 预计无直接覆盖）为 Phase 5 新增场景候选。
- **CV full-green 基线**（2026-08-06 实测）：typecheck/build/lint 32/32；test 59/59（10,397 passed / 0 failed）；e2e 1054 passed / 43 skipped / 6 failed 全为 watch-only 归因清单（c3-5 ×2 Tiptap、w3d-editor:28 Tiptap 富文本编辑面——**不属 report-designer 面范围**、gantt-perf/kanban-perf 50Hz 环境阈值）。`pnpm check` exit 0（oversized 2 条既有 locale 豁免；audit 三门禁零命中 + 7 条 allowlist）。
- **门禁对 host 包的覆盖**：`check:audit-renderer-browser-io`（INV-1）扫描正则已覆盖 4 个 host renderer 包（`scripts/audit/find-renderer-browser-io.mjs:152`，live 零命中）；**`check:audit-event-dispatch-ctx` 仅覆盖 10 个 `flux-renderers-*` 包**（`scripts/audit/find-event-dispatch-without-ctx.mjs:343` 正则限定 `/^packages\/flux-renderers-/`），`report-designer-renderers` 事件派发 ctx 不在门禁范围，靠本 plan 逐面人工核对（Phase 2/3 18 维清单 #7 已含）。
- **`docs/audits/round2-dr-adjudication.md` 存在**（D3.1 建表 DR-1/DR-2；D3.2 为第二个写入者）；表 §3 维护节约定「D3.3 后续 P2 路由追加登记（ID 顺延）」——本 plan Phase 4 按 D3.2 之后顺延登记。
- **已知遗留输入（live 在案，执行时核对终态）**：MA4.3 覆盖缺口（`docs/audits/arm-MA4-designer-office-test-coverage.md`）——report-designer 缺口最密集：MA43-P0-01 `isReportDesignerCommand`、MA43-P0-02 `resolveReportDesignerManifest`、MA43-P0-03 `REPORT_DESIGNER_CAPABILITY_PUBLICATION`、MA43-P0-04 `useReportDesignerHostScope`、MA43-P0-05 `readReportFieldDragPayload`、MA43-P1-02 `registerPreview`、MA43-P1-03 readonly mode guard、MA43-P1-04 `toReportDesignerActionResult`、MA43-P1-05 `createReportFieldDragPayload`/`writeReportFieldDragPayload`（**arm-index 已标大部分 fixed（R2.12–16/R2.33–36），直接测试落 `__tests__/commands.test.ts`/`__tests__/adapters-and-helpers.test.ts`/`__tests__/report-designer-manifest-and-helpers.test.ts`/`host-action-provider.test.ts` 等在案——Phase 1 逐条 live 复核终态，非 re-fix 候选**——H7 维度回归基准）；MA5 P3-09 `bridge.ts:75-86` `as never` 类型断言绕过编译期检查（runtime aggregate，H1 面必检）。
- **既有 08-06/08-07 零散 P2 终态**（live 在案）：10-01/10-02 属 spreadsheet-renderers 样式面（fixed）；15-2 NaN fail-closed 属 flow-designer；report-designer 面 08-06/08-07 触及点（canvas-bridge、rd-toolbar）均已收口——Phase 1 复核无回潮。
- **保护区域地图**（checklist §6.4）：report-designer 两包默认 `implement`；`packages/ui/src/index.ts` 公共导出 `ask-first`；结构性重构（公共 API/包边界）人工确认；Renderer 定义 fields 与样式契约 `plan-first`。
- **bug note 纪律**（roadmap Cross-Cutting）：本 plan 修复的复杂 bug 必须**当 plan 行内**补写 `docs/bugs/` note + README 索引同步。编号：**107 起顺序递增**（live 核对：90/91 D3.1、92–106 DB；D3.2 首个占用 107；本 plan 承接 D3.2 之后的剩余编号，执行时以 live `docs/bugs/` 最大编号 +1 为准）。
- **D1 共性缺陷声明**：D1/D3.1/D3.2 均无 CX-13+ 插入；本 plan 如发现跨 host 面共性模式，登记 daily log + DR 裁决表待裁，按 roadmap Rule 需人工确认后插入 CX-13+（AI 不自行增删路线图）。

## Goals

- 7 面（rd-1..rd-7）逐面审计卡落 `docs/audits/host-surface/rd-*.md`，全部 `closed`（或带显式路由终态到 DR）。
- 每面 ≥1 真实浏览器宿主场景（复用 `report-designer-demo.spec.ts` 覆盖面 + 缺口新增 e2e 落 `tests/e2e/`，programmatic DOM 断言禁截图；行动作 args 模板 `${key}` 真机解析）。
- P0/P1 全部自动修复（test-first：复现测试先行再实现），复杂 bug 行内补写 bug note（107 起顺序递增）。
- P2 显式登记 `docs/audits/round2-dr-adjudication.md` 路由 DR（D3.2 之后顺延 ID）；P3 卡内记录（不积压）。
- 回归验证 + roadmap D3.3 行 `todo`→`done`（附执行证据）+ daily log 收口 + 独立 fresh session closure-audit。

## Non-Goals

- 不审计其他 3 个 host 大面（flow-designer/spreadsheet = D3.1/D3.2；word-editor = D3.4 另 plan）。
- 不集中修复 P2（体验/非阻断项路由 DR；本 plan 只修 P0/P1 + 低成本 P2 当场修复）。
- 不改 `packages/*/src/index.ts` 公共导出面；如需新增 `packages/ui` 公共导出走 `ask-first`。
- 不做门禁规则变更（门禁纪律：规则变更必须带 committed 回归测试且属 DG 门禁升级范围）。
- 不重跑 10 个 `flux-renderers-*` 包的模式族回扫（D1 已完成）。
- 不补写历史 bug note（DB 已收口；本 plan 只承接审计新修复的行内补写）。

## Scope

### In Scope

- 7 面逐面审计（rd-1 画布 / rd-2 字段拖拽 / rd-3 inspector / rd-4 预览 / rd-5 保存 / rd-6 undo / rd-7 模板）。
- 每面按 §6.1 18 维降维 + §6.2 H1–H7 逐维核对，审计卡落 `docs/audits/host-surface/`。
- 每面 ≥1 宿主场景（复用现有 9 用例 + 新增 e2e 落 `tests/e2e/`）。
- P0/P1 自动修复（test-first）+ 行内 bug note + 卡状态回写。
- 收口登记（roadmap 行 / daily log / surface-inventory / README 增量登记）。

### Out Of Scope

- D3.2/D3.4（其他 host 面）。
- DR 集中修复（P2 及跨面共性模式）。
- DV 全量验证轮次（本 plan 只跑收口所需验证，full-green 记录归 DV）。
- DG 门禁升级与 round2-index（归 DG；本 plan 发现的门禁盲区在收口登记中注明供 DG 承接）。

## Failure Paths

不适用（本 plan 无外部集成/鉴权/API 契约变更；宿主场景 e2e 执行遵循既有 watch-only 归因纪律——如遇性能阈值类失败按 D2 裁决终态归因记录，不静默吞掉）。主要执行风险（审计面广、发现量不确定）由 Phase 2/3 批次化 + P0/P1 强制 test-first + P2 显式路由控制。

## Test Strategy

本档选择：**必须自动化**——审计类 work item：P0/P1 修复必须 test-first（Proof 项先于 Fix 项）；每面 ≥1 宿主场景落 `tests/e2e/`（programmatic DOM 断言）；roadmap D3.x 条款（每面 ≥1 真实浏览器交互，bug 73 专项）。纯文档交付（审计卡/roadmap 登记/bug note）不新增测试。

## Execution Plan

### Phase 1 - 审计准备与基线核对

Status: completed
Targets: `docs/audits/host-surface/surface-inventory.md`、`docs/audits/host-surface/README.md`、`packages/report-designer-{core,renderers}/src`、`docs/audits/arm-MA4-designer-office-test-coverage.md`、`docs/audits/arm-MA5-designer-operability.md`、`tests/e2e/report-designer-demo.spec.ts`、新建 `docs/audits/host-surface/rd-{1..7}-*.md`

- Item Types: `Proof | Decision | Follow-up`

- [x] 面清单核对：rd-1..rd-7 每面引用 README §1 契约基准（report-designer 9 份 owner docs）+ §2 宿主场景（`report-designer-demo.spec.ts`）；live 核对每面核心文件（rd-1 `page-renderer*.tsx`（host projection/init/snapshots）+ `report-spreadsheet-canvas.tsx`；rd-2 `report-field-panel.tsx` + `REPORT_FIELD_DRAG_MIME`；rd-3 `report-designer-inspector.tsx` + `inspector-shell-renderer.tsx`；rd-4 预览路径；rd-5 保存链路（`nop-report-profile.md`）；rd-6 命令事务 + `codec-design.md` 编解码契约；rd-7 `ReportTemplateDocument`/`createReportTemplateDocument`）。
- [x] 已知遗留输入终态核对（Decision）：MA4.3 九条缺口（MA43-P0-01..05 + P1-02..05）逐条 live 核对当前覆盖终态（直接测试落 `__tests__/commands.test.ts`/`__tests__/adapters-and-helpers.test.ts`/`__tests__/report-designer-manifest-and-helpers.test.ts`/`host-action-provider.test.ts` 等在案——逐条确认 direct coverage，与 arm-index fixed 标注核对一致，全部收敛非 re-fix）；MA5 P3-09 `bridge.ts:75-86` `as never` 复核 = 仍存在 → H1 面登记裁决（P2 低成本当场修复，Phase 4 落地）。
- [x] 面级 e2e 覆盖矩阵：`report-designer-demo.spec.ts` 9 用例 ↔ rd-1..rd-7 映射（rd-1 ✓用例1/3/4/6/9、rd-2 ✓用例2/8、rd-3 ✓用例2/5、rd-4/rd-5/rd-6/rd-7 ✗ 无直接覆盖），缺口显式列出（= Phase 5 新增场景候选，全部闭合）落 surface-inventory D3.3 增量登记。
- [x] 卡文件骨架建立：7 张 `docs/audits/host-surface/rd-{1..7}-*.md`（§6.3 模板：面身份 / 维度审查记录表 / 发现清单 / 组合宿主场景 / 修复记录 / Closure），卡头 `> 审查 plan:` 指本 plan。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `docs/audits/host-surface/rd-*.md` 7 张骨架存在且每张含面身份 + 契约基准引用 + 覆盖矩阵映射行。
- [x] 遗留输入复核结论与 e2e 覆盖矩阵缺口落面清单（surface-inventory.md 增量登记或 README 行内注记）。

### Phase 2 - 批次 A 面审计（rd-1..rd-4）

Status: completed
Targets: `packages/report-designer-renderers/src/page-renderer*.tsx`、`report-spreadsheet-canvas.tsx`、`report-field-panel.tsx`、`report-designer-inspector.tsx`、`inspector-shell-renderer.tsx`、`report-designer-toolbar*.ts`、`bridge.ts`、`host-action-provider.ts`、`host-data.ts`、`packages/report-designer-core/src/adapters.ts`、`docs/audits/host-surface/rd-{1..4}-*.md`

- Item Types: `Fix | Proof | Decision`

- [x] 逐面审计（每面一张卡）：§6.1 18 维降维逐维核对（Schema 契约 / RendererComponentProps 合规 / 值所有权三态（host snapshot 同步 `deriveDesignerHostSnapshot`）/ 表单参与 / DOM 与选择器契约 / 嵌套 schema 分类 / 事件与 action 契约（事件派发 ctx 人工核对——零 schema 事件派发点，action 面经 actionScope namespace 双注册 + 12 方法三向一致核对 / reaction 三件套不适用 / `component:*` 句柄零登记零派发）/ a11y / i18n 硬编码 `rg` 兜底（生产代码零中文字面量）/ 四态覆盖 / 异步生命周期 / 组合宿主场景 / 样式契约 / React 19 规范 / 性能边界 / 测试质量 / 文档对照 / 注册包边界与 IO 安全红线（INV-1 实跑零命中））+ §6.2 H1（host 契约：`REPORT_DESIGNER_MANIFEST_V1`/`reportDesignerHostContract`/`createReportDesignerBridge`/`createReportDesignerActionProvider` 与宿主消费双向核对——12 方法 manifest ↔ provider ↔ core-dispatch 四向一致；MA5 P3-09 as never 复核 = 仍存在 → P2 裁决）+ H2（命令事务：command + undo 语义——**发现 P1-1 undo/redo/importTemplate 不回传 spreadsheet canvas**）+ H3（拖拽：`REPORT_FIELD_DRAG_MIME` payload 契约 + HTML5 DnD 无 pointercancel 需求 + drop 落点 + 失败回滚）+ H4（键盘：canInsertToSelection 守卫 + insert 按钮路径 + demo canvas Enter/Space）+ H5（剪贴板：无路径）+ H6（e2e 可操作性）+ H7（MA4.3 九条缺口逐条回归收敛）。
- [x] 声明即契约双向核对（08 检测法）：`reportDesignerRendererDefinitions`/`defineReportDesignerPageSchema` 注册项 vs 消费矩阵（12 fields 全消费）；`component:*` 句柄登记 vs 派发点（零登记零派发）；schema 字段声明 vs design.md/config-schema.md/inspector-design.md（document/config/adapters/profile/statusPath 全对齐，readOnly 声明可达）。
- [x] 发现分级 P0/P1/P2/P3（带 `文件:行` 证据）逐条入卡；**P1-1 留待 Phase 4 修复（test-first 已先行复现红）**，P2 当场低成本修复（MA5 P3-09 as never 已修）+ 其余登记待 Phase 4 路由 DR，P3 卡内记录。
- [x] 面内宿主场景初验（每面 ≥1，程序化 DOM 断言；rd-1/2/3 复用 `report-designer-demo.spec.ts` 已覆盖面 pass，rd-4 缺口登记待 Phase 5 新增）。

Exit Criteria:

- [x] rd-1..rd-4 四张卡完成维度审查记录 + 发现清单（P0/P1/P2/P3 分级 + `文件:行` 证据），卡状态 `open` 或 `fixing`。
- [x] 每面 ≥1 宿主场景记录（结果 pass/fail + 证据，fail 项登记为对应发现；rd-4 缺口 = Phase 5 新增场景）。

### Phase 3 - 批次 B 面审计（rd-5..rd-7）

Status: completed
Targets: `packages/report-designer-core/src/core.ts`、`commands.ts`、`adapters.ts`、`runtime/`、`packages/report-designer-renderers/src/bridge.ts`、`host-data.ts`、`report-designer-manifest.ts`、`docs/audits/host-surface/rd-{5..7}-*.md`

- Item Types: `Fix | Proof | Decision`

- [x] 逐面审计（rd-5 保存：host 保存链路（saveDocument 类路径 = core save 导出 + 宿主经 action provider 持久化委托）+ `nop-report-profile.md` 契约对照 + 失败路径（readonly 拦截 + dispatch throw 转换）；rd-6 undo：命令事务撤销/重做/失败回滚 + `codec-design.md` 编解码契约双向核对——**发现并 test-first 修复 P1-1（undo/redo/importTemplate 不回传 spreadsheet canvas，stale syncSource guard）**；rd-7 模板：`ReportTemplateDocument`/`createReportTemplateDocument` 模板创建/语义 + 空模板态（无效 document fallback））。
- [x] 维度核对同 Phase 2 清单（含 H1 host 契约（save/preview/import/export envelope 形状 ↔ manifest）/ H2 事务 undo（save 不入栈 + importTemplate 入栈 + undo 后 savedDocument 保留 dirty:true 语义）/ H5 剪贴板专项 = 不适用）。
- [x] 发现分级入卡（同 Phase 2 裁决口径）；MA4.3/MA5 遗留输入逐条终态 Decision（收敛——九条 MA4.3 全收敛、P2-03 收敛、P3-09 收敛（Phase 4 修复）；无残留）。
- [x] 面内宿主场景初验（每面 ≥1；rd-5/6/7 真缺口登记，Phase 5 新增宿主页场景）。

Exit Criteria:

- [x] rd-5..rd-7 三张卡完成维度审查记录 + 发现清单 + 宿主场景记录。
- [x] 遗留输入全部终态 Decision 与全部 P0/P1 清单汇总（`文件:行`）可在 7 张卡中逐一查见（P1-1 唯一 P1，跨 rd-1/rd-6 卡在案）。

### Phase 4 - P0/P1 自动修复（test-first）+ 行内 bug note

Status: completed
Targets: 修复站点 `packages/report-designer-{core,renderers}/src/**`、回归测试 `packages/report-designer-{core,renderers}/src/**/*.test.{ts,tsx}`、`docs/bugs/`（107 起顺序递增）、`docs/audits/host-surface/rd-*.md` 状态回写、`docs/audits/round2-dr-adjudication.md`（P2 路由追加）

- Item Types: `Fix | Proof | Follow-up`

- [x] 全部 P0/P1：先写复现/断言测试（红）→ 实现修复（绿），证据（测试文件:行 + commit）入卡「修复记录」。**P1 共 1 条**：P1-1 undo/redo/importTemplate 不回传 spreadsheet canvas（`page-renderer-shell.test.tsx` 复现先红 → `core-dispatch.ts` 清 syncSource + `page-renderer.tsx` applied-clone ref 修复 → 绿；`designer-core-codec-and-selection.test.ts` syncSource 清除语义双保险）。
- [x] 低成本 P2 当场修复（同 test-first 纪律）：MA5 P3-09 `bridge.ts` `as never`（rd-1 H1 裁决 P2）——`buildAggregatedRuntimeSummary` 参数改窄接口 `SpreadsheetRuntimeSummaryInput` + bridge 传类型安全对象（typecheck 红→绿，行为由既有 `bridge.test.ts` 锁定）；其余 P2 显式追加登记 `docs/audits/round2-dr-adjudication.md`（**DR-7..DR-11 五条** = 卡内 P2 清单，零悬挂）。
- [x] 复杂 bug（根因非平凡 / 跨包 / 加回归测试）行内补写 `docs/bugs/` note（编号 107 起顺序递增——执行时以 live 最大编号 +1 为准 = **111**，按 `00-bug-fix-note-writing-guide.md` 模板 7 节）+ `docs/bugs/README.md` 索引同步。
- [x] 卡状态回写：已修发现 `[P1-1]`/`[P2-1]` 行标注 `fixed`（+ plan/commit 引用），卡状态 `fixed-pending-closure`（收口后 closed）。
- [x] 局部验证：`report-designer-core` + `report-designer-renderers` 包级 typecheck + focused 测试全绿（core 185 / renderers 199，保证 Phase 5 可继续）。

Exit Criteria:

- [x] 全部 P0/P1 修复落地（卡内 test-first 证据逐条在案——P1-1 红→绿证据入 rd-1/rd-6 卡修复记录），无未处置 P0/P1。
- [x] P2 路由登记无悬挂（`round2-dr-adjudication.md` 11 条 = 卡内 P2 清单：DR-7..DR-11 五条 rd 面 + 4 条当场修复不路由）。
- [x] bug note 行内补写完成（**111**，README 索引同步）；两包 typecheck + 包级测试绿。

### Phase 5 - 宿主场景补全与收口验证

Status: completed
Targets: `tests/e2e/`（新增 spec）、`docs/audits/host-surface/`、`docs/backlog/component-audit-round2-roadmap.md`（D3.3 行）、`docs/logs/2026/08-08.md`、`docs/audits/host-surface/surface-inventory.md` + `README.md`（增量登记）

- Item Types: `Fix | Proof | Follow-up`

- [x] 面覆盖矩阵缺口补场景：Phase 1 缺口清单（rd-4 预览 / rd-5 保存 / rd-6 undo / rd-7 模板）新增 e2e spec 落 `tests/e2e/`（`report-designer-host.spec.ts` 5 用例，programmatic DOM 断言，data-slot/marker 定位）；新建宿主页 `apps/playground/src/pages/report-designer-host-demo.tsx` + `report-designer-host-page.tsx`（route `#/report-designer-host`，真实 `report-designer-page` renderer 宿主：toolbar 派发 undo/redo/save/preview + 画布编辑 + 字段面板 + inspector shell + 空模板 toggle + window hook 导出；domain-route-entries + App.tsx + playground-entry-pages ROUTE_ASSERTIONS 同步）；**宿主页验收当场暴露 2 条新 P1（StrictMode core dispose、toolbar 取反模板死代码）——均 test-first 修复（bug note 112/113）并回写卡**；每面最终 ≥1 宿主场景。
- [x] 运行 report-designer 相关全部 e2e spec（demo 9 用例 + host 5 用例 + playground-entry-pages 64 用例）**78 全绿**；失败项按 D2 watch-only 归因纪律逐条归因（本批零失败）。
- [x] 收口登记：roadmap D3.3 行 `todo`→`done`（附执行证据引用）、daily log 收口节、surface-inventory/README 增量登记（新 spec 行 + 新宿主页 + P1-111/112/113 与 DR-7..11 登记）。
- [x] 审计卡全部 `closed`（P0 零 / P1 3 条全 fixed / P2 当场修复 1 条 + 路由 5 条 / P3 卡内记录）；P2/P3 零悬挂声明。

Exit Criteria:

- [x] 7 面每面 ≥1 宿主场景证据在案（e2e spec 引用 + 断言内容）；新增 spec 全绿（5/5）。
- [x] roadmap D3.3 行 `done` + daily log 收口节 + 增量登记完成；卡状态与发现清单逐条一致（无未勾选 in-scope 项）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02035d3d7ffeZdsLMBKT0aEhBp` 轮 1；`ses_020319875ffeJSW6a5L18htCBz` 轮 2 聚焦复核）
- Verdict: `pass`（轮 1 零 Blocker 零 Major；轮 2 复核编辑点亦零 Blocker 零 Major）
- Rounds: 2
- Findings addressed:
  - Minor-1（轮 1）：MA4.3 基线口径过时（arm-index 已标 MA43-P0-01..05/P1-02..05 fixed R2.12–16/R2.33–36）→ Baseline 与 Phase 1 更新为「arm-index fixed + 直接测试文件清单在案，Phase 1 逐条复核终态非 re-fix」。
  - Minor-2（轮 1）：Phase 1 测试文件清单补齐实际 MA43 覆盖文件（`__tests__/commands.test.ts`/`__tests__/adapters-and-helpers.test.ts`/`__tests__/report-designer-manifest-and-helpers.test.ts`/`host-action-provider.test.ts`）。
  - Minor-3/4（轮 1）：bug note 编号「107 起顺序递增 + live 最大编号 +1 为准」措辞维持（两计划自洽）；7 面 vs roadmap ~8 卡预估以 live surface-inventory 为准（D3.1 先例同裁）。
  - Minor（轮 2）：readonly guard 实际落 `designer-core.test.ts:316`、`useReportDesignerHostScope` 落 `report-designer-manifest-and-helpers.test.ts`——「等在案」「逐条确认」措辞覆盖，Phase 1 live 逐条复核兜底，不另行改文。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处（guide Rule 18）；closure-audit 由独立 fresh session 执行，执行 session 不得自审勾选。

- [x] 全部 in-scope P0/P1 已修复（卡内 test-first 证据——P1-111/112/113 三条红→绿在案），无静默降级
- [x] P2 全部显式路由 DR（`round2-dr-adjudication.md` DR-7..DR-11 零悬挂），P3 卡内记录
- [x] 7 面审计卡全部 closed，面级宿主场景 ≥1 全覆盖（demo 9 用例 + host 5 用例）
- [x] 复杂 bug 行内 bug note 补写完成（**111/112/113**，README 索引同步）
- [x] 受影响的 owner docs 同步（roadmap D3.3 行/daily log/surface-inventory/README 收口登记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（task `ses_01f0649b3ffeqLuHEbeiX9iC80`，Verdict `approved`，证据见 Closure 节）；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### P2 集中修复（DR 归属）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: checklist v2 裁决表语义下 P2 不阻塞 supported baseline；roadmap DR 行（跨面集中修复与裁决）为显式 successor，本 plan Phase 4 完成路由登记，非静默延期。
- Successor Required: `yes`
- Successor Path: `docs/backlog/component-audit-round2-roadmap.md` DR 行 + `docs/audits/round2-dr-adjudication.md`

### 4 host 面共性缺陷模式（CX-13+ 插入）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 如审计发现与其他 host 面共享的机制类缺陷，按 roadmap Rule 需人工确认后插入 CX-13+ 行；本 plan 只登记待裁（daily log + DR 裁决表），不自行插入路线图新行。
- Successor Required: `yes`（待人工确认后定）
- Successor Path: roadmap 表/依赖图/Cross-Cutting（人工确认后）

## Non-Blocking Follow-ups

- 门禁盲区发现（如有）：登记 daily log，供 DG 门禁升级承接。
- MA4.3/MA5 剩余缺口（H7 回归后仍存的显式登记缺口）：维持登记，由 DV/DG 复核。

## Closure

Status Note: 5 Phase 全 completed；7 面审计卡全 closed；**P1 修复 3 条 test-first**（111 undo/redo/importTemplate 不回传画布——stale syncSource guard + applied-clone ref；112 StrictMode core dispose——ref-diff 托管；113 toolbar `!` 取反模板死代码——NUL hack 移除直读 readStatePath，红→绿证据在卡）+ 低成本 P2 修复 1 条（MA5 P3-09 `as never` 收敛）+ **P2 路由 5 条**（DR-7..DR-11 零悬挂）+ **bug note 111–113**（README 索引同步）；独立宿主页（report-designer-host）+ 独立 spec 5 用例全绿（关联 78 用例全绿，P1-111/113 e2e 确认点）；MA4.3 九条缺口全部复核收敛；全量验证 typecheck/build/lint 32/32、test 59/59、check exit 0；e2e 全量 1033 passed / 43 skipped / 14 failed 全为 D2 watch-only 归因清单（Tiptap c3-5 ×1、diff-view 批次 ×6、gantt ×3、gantt-perf/kanban-perf 50Hz ×3、w3d-editor:28 ×1——零新增，非本 plan 引入）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，task `ses_01f0649b3ffeqLuHEbeiX9iC80`）
- Evidence: Verdict `approved`（2 条 non-blocking process notes：① 交付物需收口 commit（本 commit 完成，标题含 full-green verification）；② 卡内跨卡 P1 编号并号（111/112/113 bug note 编号消歧，无碍））。审计核验：5 Phase 全 completed 无残留 `[ ]`；7 卡 closed + 卡内 test-first 证据（红→绿）逐条在案；代码修复 live 核对（core-dispatch syncSource 清除 / page-renderer applied-clone + ref-diff 托管 / host-data+bridge 窄接口无 as never / toolbar-helpers 无 NUL 字节）；回归测试断言正确行为；bug note 111-113 + README 索引；DR-7..11 零悬挂；宿主页 + spec 5 用例 + 路由 + entry-pages 断言；roadmap 行 done + daily log + surface-inventory 增量登记；验证命令独立复跑：core 185 / renderers 202 / typecheck 32/32 / build 32/32 / lint 32/32 / check exit 0 / e2e host+demo 14 用例全绿；诚实延期检查 pass（无已确认 live defect 静默延期）。

Follow-up:

- 门禁盲区登记供 DG 承接：`check:audit-event-dispatch-ctx` 不覆盖 report-designer-renderers（人工核零 schema 事件派发点，D3.1/D3.2 同款登记维持）。
- P2 集中修复消费 `round2-dr-adjudication.md` DR-7..DR-11（rd-2/4/5/6/7 i18n 族，roadmap DR 行）。
- 快捷键面（Ctrl+Z/Y/S）与两套 undo UI 并存分歧（rd-6 P3-2/P3-3）为卡内 watch 项，DR 候选。
- 跨面共性模式待裁：StrictMode effect-dispose 家族（bug 112 与 bug 90 同机制）已登记 daily log，人工确认后插 CX-13+。
