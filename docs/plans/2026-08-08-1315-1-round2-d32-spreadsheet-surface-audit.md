# D3.2 spreadsheet 大面审计（spreadsheet-core + spreadsheet-renderers）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: D3.2
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（D3.2 行 + D3.x Phase Details + Cross-Cutting + Dependency Graph）、`docs/audits/host-surface/README.md`（§1 spreadsheet 行 + §2 spreadsheet coverage gap Decision + owner doc gap Decision）、`docs/audits/host-surface/surface-inventory.md`（ss-1..ss-10）、`docs/audits/component-audit-checklist.md` v2 §6（host 审计卡模板）
> Related: `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md`（completed，host 模板与面清单）、`docs/plans/2026-08-08-0715-2-round2-d1-gate-drift-pattern-family-rescan.md`（completed）、`docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`（completed，watch-only e2e 复核终态）、`docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`（completed，同型 plan 先例 + DR 表首个写入者）、`docs/plans/2026-08-08-0900-2-round2-db-bug-note-backfill.md`（completed，bug note 编号占用 92–106）

## Purpose

对 spreadsheet 大面（`spreadsheet-core` + `spreadsheet-renderers`，10 个审计面 ss-1..ss-10）执行首次逐面审计：按 checklist v2 §6 host 审计卡模板产出逐面审计卡（18 维降维 + H1–H7 designer 特有维度）落 `docs/audits/host-surface/`；每面 ≥1 真实浏览器宿主场景（bug 73 模式专项，programmatic DOM 断言，禁截图）——**spreadsheet 无独立宿主页与独立 spec（D0 已确认 coverage gap），本 plan 承接补齐**；P0/P1 自动修复（test-first）；P2 显式登记 `docs/audits/round2-dr-adjudication.md`（DR-3+）路由 DR；P3 卡内记录；复杂 bug 行内补写 bug note（编号 107 起）；spreadsheet owner doc gap（D0 登记）在审计中裁决是否新建架构 owner doc；回归验证后由独立 fresh session 执行 closure-audit。收口后 roadmap D3.2 行 `todo`→`done`。

## Current Baseline

（live repo 核对事实，2026-08-08）

- **D0/D1/D2/DB/DL/D3.1 全部 completed**（2026-08-08）：host 面清单 ss-1..ss-10 在案（`docs/audits/host-surface/surface-inventory.md`）；checklist v2 §6 host 审计卡模板（6.1 降维表 / 6.2 H1–H7 / 6.3 卡模板 / 6.4 保护区域地图）就位。
- **spreadsheet owner doc gap（D0 登记 Decision）**：`docs/architecture/` 无 spreadsheet 独立目录（D0 live `ls` 确认）；契约基准取 `docs/architecture/report-designer/spreadsheet-canvas-css.md`（样式面）+ `docs/architecture/report-designer/contracts.md`（host 契约面）；**D3.2 审计中评估是否新建 spreadsheet 架构 owner doc**（本 plan Phase 1 裁决）。
- **spreadsheet 宿主 e2e coverage gap（D0 登记 Decision，口径更正）**：`tests/e2e/` 下 spreadsheet **无独立 spec**（D0 以 `rg -i spreadsheet` 零结果登记）；live 复核（2026-08-08）：既有 spreadsheet 表面宿主场景 = `report-designer-demo.spec.ts`（9 用例，`spreadsheet-toolbar`/`spreadsheet-grid`/`spreadsheet-cell-editor` 等 data-slot 断言——宿主归属 report-designer，映射 ss-1/ss-3 等面）+ `exploratory/subagent-a-independent-review.spec.ts`（1 用例，工具栏可见 + 零 error 断言，**describe.skip 未启用**）——**真实缺口 = 独立宿主页与独立 spec**；由本 plan 承接补齐（每面 ≥1）。D0 README §2「rg 零结果」表述过宽，Phase 1 复核时以 live 场景清单更正。live 复核（2026-08-08）：`apps/playground/src` 无独立 spreadsheet 宿主页（仅 `report-designer-demo.tsx` 内部承载 spreadsheet canvas）→ 宿主页方案需 Phase 1 Decision。
- **CV full-green 基线**（2026-08-06 实测）：typecheck/build/lint 32/32；test 59/59（10,397 passed / 0 failed）；e2e 1054 passed / 43 skipped / 6 failed 全为 watch-only 归因清单（gantt-perf/kanban-perf 50Hz 环境阈值 + c3-5 ×2 + w3d-editor:28——w3d-editor 为 Tiptap 富文本编辑面，**不属 spreadsheet 面范围**）。`pnpm check` exit 0（oversized 2 条既有 locale 豁免；audit 三门禁零命中 + 7 条 allowlist）。
- **门禁对 host 包的覆盖**：`check:audit-renderer-browser-io`（INV-1）扫描正则已覆盖 4 个 host renderer 包（`scripts/audit/find-renderer-browser-io.mjs:152`，live 零命中）；**`check:audit-event-dispatch-ctx` 仅覆盖 10 个 `flux-renderers-*` 包**（`scripts/audit/find-event-dispatch-without-ctx.mjs:343` 正则限定 `/^packages\/flux-renderers-/`），`spreadsheet-renderers` 事件派发 ctx 不在门禁范围，靠本 plan 逐面人工核对（Phase 2/3 18 维清单 #7 已含）。
- **`docs/audits/round2-dr-adjudication.md` 存在**（D3.1 Phase 4 建表，DR-1/DR-2 flow-designer 已登记）；表 §3 维护节约定「D3.2–D3.4 P2 路由追加登记（ID 顺延 DR-3+）」——本 plan Phase 4 为第二个写入者。
- **已知遗留输入（live 在案，执行时核对终态）**：MA4.3 覆盖缺口（`docs/audits/arm-MA4-designer-office-test-coverage.md`）——MA43-P1-06 `resolveSpreadsheetManifest`、MA43-P1-07 `spreadsheetHostContract`（**arm-index 已标 fixed R2.37/R2.38；live 直接测试在 `spreadsheet-manifest.test.ts` 两 describe 块——Phase 1 复核终态确认，非 re-fix 候选**）；spreadsheet-core 默认工厂（`createDefaultSelection`/`createDefaultViewport`/`createDefaultHistory`/`createDefaultLayout`）零测试；MA5 记录（`docs/audits/arm-MA5-designer-operability.md`）——P3-03 `use-spreadsheet-interactions.test.ts` 同义反复（仅编译期 key 计数）、P3-06 `setCellValue`/`setCommentText` no-op 空回调、P3-12 `getSelectedAxisInfo` 计数返回 span 而非实际选中数（H7 维度回归基准）。
- **既有 08-06/08-07 零散 P2 终态**（live 在案）：10-01 `canvas-styles.css` 7 处 `.report-designer-demo` 选择器锚定（fixed，plan `2026-08-07-0819-3`）、10-02 `rd-toolbar` BEM 死类 16 处（fixed，同 plan，修复记录 16 处）——Phase 1 复核无回潮；`check:audit-styling-suspects` 对 spreadsheet canvas-styles.css 的 127 hits 属自绘面混合 CSS（既有门禁认知，非本 plan 缺陷信号）。
- **保护区域地图**（checklist §6.4）：spreadsheet 两包默认 `implement`；`packages/ui/src/index.ts` 公共导出 `ask-first`；结构性重构（公共 API/包边界）人工确认；Renderer 定义 fields 与样式契约 `plan-first`。
- **bug note 纪律**（roadmap Cross-Cutting）：本 plan 修复的复杂 bug 必须**当 plan 行内**补写 `docs/bugs/` note + README 索引同步。编号：**107 起**（live 核对：90/91 被 D3.1 占用、92–106 被 DB 占用；D3.2 为 107 首个占用者，D3.3/D3.4 按执行顺序承接递增）。
- **D1 共性缺陷声明**：D1 已显式声明无共性缺陷（CX-13+ 未插入）；D3.1 亦未插入；本 plan 如发现跨 host 面共性模式，登记 daily log + DR 裁决表待裁，按 roadmap Rule 需人工确认后插入 CX-13+（AI 不自行增删路线图）。

## Goals

- 10 面（ss-1..ss-10）逐面审计卡落 `docs/audits/host-surface/ss-*.md`，全部 `closed`（或带显式路由 `fixing`/`fixed-pending-closure` 终态到 DR）。
- 每面 ≥1 真实浏览器宿主场景：新建 spreadsheet 宿主页（playground）+ e2e spec 落 `tests/e2e/`（programmatic DOM 断言禁截图；行动作 args 模板 `${key}` 真机解析），填补 D0 确认的 spreadsheet 宿主 e2e coverage gap。
- P0/P1 全部自动修复（test-first：复现测试先行再实现），复杂 bug 行内补写 bug note（107 起）。
- P2 显式登记 `docs/audits/round2-dr-adjudication.md`（DR-3+）路由 DR；P3 卡内记录（不积压）。
- spreadsheet owner doc gap 裁决（D0 Decision 承接）：新建 `docs/architecture/spreadsheet/` owner doc 与否的裁决结论 + 落定执行。
- 回归验证 + roadmap D3.2 行 `todo`→`done`（附执行证据）+ daily log 收口 + 独立 fresh session closure-audit。

## Non-Goals

- 不审计其他 3 个 host 大面（flow-designer D3.1 已 done；report-designer/word-editor = D3.3/D3.4 另 plan）。
- 不集中修复 P2（体验/非阻断项路由 DR；本 plan 只修 P0/P1 + 低成本 P2 当场修复）。
- 不改 `packages/*/src/index.ts` 公共导出面；如需新增 `packages/ui` 公共导出走 `ask-first`。
- 不做门禁规则变更（门禁纪律：规则变更必须带 committed 回归测试且属 DG 门禁升级范围）。
- 不重跑 10 个 `flux-renderers-*` 包的模式族回扫（D1 已完成）。
- 不补写历史 bug note（DB 已收口 92–106；本 plan 只承接审计新修复的行内补写）。

## Scope

### In Scope

- 10 面逐面审计（ss-1 表格渲染 / ss-2 单元格编辑 / ss-3 工具栏 / ss-4 状态栏 / ss-5 公式 / ss-6 冻结 / ss-7 选择 / ss-8 键盘导航 / ss-9 搜索 / ss-10 undo）。
- 每面按 §6.1 18 维降维 + §6.2 H1–H7 逐维核对，审计卡落 `docs/audits/host-surface/`。
- 新建 spreadsheet playground 宿主页（Phase 1 Decision 落定方案）+ 每面 ≥1 宿主场景（新增 e2e 落 `tests/e2e/`）。
- P0/P1 自动修复（test-first）+ 行内 bug note + 卡状态回写。
- owner doc gap 裁决（新建与否）+ 收口登记（roadmap 行 / daily log / surface-inventory / README 增量登记）。

### Out Of Scope

- D3.3/D3.4（其他 host 面）。
- DR 集中修复（P2 及跨面共性模式）。
- DV 全量验证轮次（本 plan 只跑收口所需验证，full-green 记录归 DV）。
- DG 门禁升级与 round2-index（归 DG；本 plan 发现的门禁盲区在收口登记中注明供 DG 承接）。

## Failure Paths

不适用（本 plan 无外部集成/鉴权/API 契约变更；宿主场景 e2e 执行遵循既有 watch-only 归因纪律——如遇性能阈值类失败按 D2 裁决终态归因记录，不静默吞掉）。主要执行风险（审计面广、发现量不确定、无既有宿主 e2e 可复用）由 Phase 2/3 批次化 + P0/P1 强制 test-first + P2 显式路由控制；宿主页新建属 playground 层改动，不触碰包公共导出。

## Test Strategy

本档选择：**必须自动化**——审计类 work item：P0/P1 修复必须 test-first（Proof 项先于 Fix 项）；每面 ≥1 宿主场景落 `tests/e2e/`（programmatic DOM 断言，新增 spec 为 spreadsheet 首个独立宿主 spec）；roadmap D3.x 条款（每面 ≥1 真实浏览器交互，bug 73 专项）。纯文档交付（审计卡/roadmap 登记/bug note/owner doc 裁决）不新增测试。

## Execution Plan

### Phase 1 - 审计准备与基线核对

Status: completed
Targets: `docs/audits/host-surface/surface-inventory.md`、`docs/audits/host-surface/README.md`、`packages/spreadsheet-{core,renderers}/src`、`docs/audits/arm-MA4-designer-office-test-coverage.md`、`docs/audits/arm-MA5-designer-operability.md`、`tests/e2e/`、`apps/playground/src`（宿主页方案）、新建 `docs/audits/host-surface/ss-{1..10}-*.md`

- Item Types: `Proof | Decision | Follow-up`

- [x] 面清单核对：ss-1..ss-10 每面引用 README §1 契约基准（spreadsheet 两包行——基准为 report-designer 侧 spreadsheet-canvas-css.md + contracts.md）+ §2 宿主场景（0 spec 基线）；live 核对每面核心文件（ss-1 `spreadsheet-grid/` + `canvas-styles.css`；ss-2 `use-spreadsheet-interactions.ts` + 编辑状态族；ss-3 `spreadsheet-toolbar/`（toolbar-groups/toolbar-status）；ss-4 `toolbar-status.tsx`；ss-5 `SetCellFormulaCommand` + core commands；ss-6 `FreezePanesCommand`/`UnfreezePanesCommand` + `SpreadsheetFrozenPane`；ss-7 `SpreadsheetSelection` 族 + `createDefaultSelection`；ss-8 键盘移动/编辑路径；ss-9 `FindCommand`/`FindNextCommand`/`ReplaceCommand` 族；ss-10 `UndoSpreadsheetCommand`/`RedoSpreadsheetCommand` + `Begin/Commit/RollbackSpreadsheetTransaction`）。
- [x] 已知遗留输入终态核对（Decision）：MA43-P1-06 `resolveSpreadsheetManifest` / MA43-P1-07 `spreadsheetHostContract` 直接测试存在与否终态确认（`spreadsheet-manifest.test.ts` 两 describe 块在案，arm-index 标 fixed——纯复核非 re-fix）；spreadsheet-core 默认工厂 4 函数零测试复核；MA5 P3-03 同义反复测试复核（仍同义反复则 Phase 4 重写为行为断言）、P3-06 `setCellValue`/`setCommentText` no-op 复核（no-op 属声明即契约嫌疑，H1/H2 面必检）、P3-12 `getSelectedAxisInfo` 计数语义复核（仍返回 span 则 ss-7 面 P1/P2 登记）。
- [x] **宿主页方案 Decision**：新建独立 playground spreadsheet 宿主页 + route（默认方案，对齐 `report-designer-demo.tsx` 先例，宿主归属无歧义）vs 复用 report-designer-demo 页（宿主归属歧义，不取）；裁决结论回写 README §2 增量登记。
- [x] **spreadsheet owner doc gap 裁决（Decision）**：评估是否新建 `docs/architecture/spreadsheet/` 架构 owner doc——裁决输入：本 plan 审计发现是否改变既有契约基线（host 契约/命令面/样式契约）、`spreadsheet-host-method-contracts-{core,formatting}.ts` 契约面现状、D3.3 report-designer 侧两文件作为基线的充分性；裁决结论落 README §1 增量登记；如新建，Phase 5 落地（文档 <40 KB，只写最终设计状态）。
- [x] 面级 e2e 覆盖矩阵：现有 spec 面映射（`report-designer-demo.spec.ts` 9 用例 → ss-1/ss-3 等面，live 逐用例核对；`exploratory/subagent-a-independent-review.spec.ts` 1 用例 → ss-3）+ 0 独立 spreadsheet spec；映射后仅**真缺口** = Phase 5 新增场景全集（含宿主页 URL 与断言骨架）。
- [x] 卡文件骨架建立：10 张 `docs/audits/host-surface/ss-{1..10}-*.md`（§6.3 模板：面身份 / 维度审查记录表 / 发现清单 / 组合宿主场景 / 修复记录 / Closure），卡头 `> 审查 plan:` 指本 plan。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `docs/audits/host-surface/ss-*.md` 10 张骨架存在且每张含面身份 + 契约基准引用 + 覆盖矩阵映射行。
- [x] 遗留输入复核结论、宿主页方案裁决、owner doc gap 裁决全部落面清单/README 增量登记（Decision 有明确结论，不留空）。

### Phase 2 - 批次 A 面审计（ss-1..ss-5）

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-grid/`、`spreadsheet-interactions/`、`spreadsheet-toolbar/`、`canvas-styles.css`、`bridge.ts`、`packages/spreadsheet-core/src/commands*.ts`、`command-handlers/`、`docs/audits/host-surface/ss-{1..5}-*.md`

- Item Types: `Fix | Proof | Decision`

- [x] 逐面审计（每面一张卡）：§6.1 18 维降维逐维核对（Schema 契约 / RendererComponentProps 合规 / 值所有权三态 / 表单参与 / DOM 与选择器契约（data-slot 稳定输出 + canvas-styles.css 样式契约）/ 嵌套 schema 分类 / 事件与 action 契约（事件派发 ctx 人工核对 + reaction 三件套 + `component:*` 句柄）/ a11y / i18n 硬编码 `rg` 兜底 / 四态覆盖 / 异步生命周期 / 组合宿主场景 / 样式契约 / React 19 规范 / 性能边界（虚拟表格渲染路径）/ 测试质量 / 文档对照 / 注册包边界与 IO 安全红线（INV-1））+ §6.2 H1（host 契约：`SPREADSHEET_MANIFEST_V1`/`spreadsheetHostContract`/`createSpreadsheetBridge`/`createSpreadsheetActionProvider` 与宿主消费双向核对 + `spreadsheet-host-method-contracts-*` 契约面）+ H2（命令事务：Begin/Commit/Rollback + Undo/Redo）+ H3（拖拽：drag/resize/fill pointercancel 守卫）+ H4（键盘：isEditable 守卫 + 键盘导航等价）+ H5（剪贴板：ClipboardCell 契约 + 权限降级）+ H6（e2e 可操作性）+ H7（MA4.3/MA5 缺口回归）。
- [x] 声明即契约双向核对（08 检测法）：`spreadsheetRendererDefinitions`/`defineSpreadsheetPageSchema` 注册项 vs 消费矩阵；`component:*` 句柄登记 vs 派发点（零登记零派发核对）；schema 字段声明 vs 契约基准文档。
- [x] 发现分级 P0/P1/P2/P3（带 `文件:行` 证据）逐条入卡；P0/P1 留待 Phase 4 修复，P2 当场低成本则立即修复否则登记待 Phase 4 路由 DR，P3 卡内记录。
- [x] 面内宿主场景初验（每面 ≥1，程序化 DOM 断言；宿主页 Phase 1 新建后即可用，未建成前以 bridge/单元路径先行初验并登记）。

Exit Criteria:

- [x] ss-1..ss-5 五张卡完成维度审查记录 + 发现清单（P0/P1/P2/P3 分级 + `文件:行` 证据），卡状态 `open` 或 `fixing`。
- [x] 每面 ≥1 宿主场景记录（结果 pass/fail + 证据，fail 项登记为对应发现）。

### Phase 3 - 批次 B 面审计（ss-6..ss-10）

Status: completed
Targets: `packages/spreadsheet-core/src/commands*.ts`、`command-handlers/`、`types.ts`、`packages/spreadsheet-renderers/src/spreadsheet-grid/`、`spreadsheet-interactions/`、`fire.ts`、`bridge.ts`、`docs/audits/host-surface/ss-{6..10}-*.md`

- Item Types: `Fix | Proof | Decision`

- [x] 逐面审计（ss-6 冻结：FreezePanes/UnfreezePanes 命令链 + 冻结窗格渲染；ss-7 选择：SpreadsheetSelection 族 + 选区工具 + 计数语义（P3-12 复核）；ss-8 键盘导航：键盘移动/编辑/Enter 提交路径 + 输入目标排除；ss-9 搜索：Find/FindNext/Replace 命令族 + 无结果路径；ss-10 undo：Undo/Redo 命令 + Begin/Commit/Rollback 事务边界 + 失败回滚）。
- [x] 维度核对同 Phase 2 清单（含 H1 host 契约 / H2 事务 undo / H3 拖拽 / H4 键盘 / H5 剪贴板专项；P3-06 no-op 回调在 ss-2/ss-7 面裁决）。
- [x] 发现分级入卡（同 Phase 2 裁决口径）；对 MA4.3/MA5 遗留输入逐条做终态 Decision（收敛 / 残留 / 新发现）。
- [x] 面内宿主场景初验（每面 ≥1）。

Exit Criteria:

- [x] ss-6..ss-10 五张卡完成维度审查记录 + 发现清单 + 宿主场景记录。
- [x] 遗留输入全部终态 Decision 与全部 P0/P1 清单汇总（`文件:行`）可在 10 张卡中逐一查见。

### Phase 4 - P0/P1 自动修复（test-first）+ 行内 bug note

Status: completed
Targets: 修复站点 `packages/spreadsheet-{core,renderers}/src/**`、回归测试 `packages/spreadsheet-{core,renderers}/src/**/*.test.{ts,tsx}`、`docs/bugs/`（107 起）、`docs/audits/host-surface/ss-*.md` 状态回写、`docs/audits/round2-dr-adjudication.md`（P2 路由追加 DR-3+）

- Item Types: `Fix | Proof | Follow-up`

- [x] 全部 P0/P1：先写复现/断言测试（红）→ 实现修复（绿），证据（测试文件:行 + commit）入卡「修复记录」。
- [x] 低成本 P2 当场修复（同 test-first 纪律）；其余 P2 显式追加登记 `docs/audits/round2-dr-adjudication.md`（ID 顺延 DR-3+，表 §3 维护节已约定；条目 = 卡内 P2 清单，零悬挂）。
- [x] 复杂 bug（根因非平凡 / 跨包 / 加回归测试）行内补写 `docs/bugs/` note（编号 **107 起**，按 `00-bug-fix-note-writing-guide.md` 模板）+ `docs/bugs/README.md` 索引同步。
- [x] 卡状态回写：已修发现 `[P0-x]/[P1-x]` 行标注 `fixed`（+ plan/commit 引用），卡状态 `fixed-pending-closure`。
- [x] 局部验证：`spreadsheet-core` + `spreadsheet-renderers` 包级 typecheck + focused 测试全绿（保证 Phase 5 可继续）。

Exit Criteria:

- [x] 全部 P0/P1 修复落地（卡内 test-first 证据逐条在案），无未处置 P0/P1。
- [x] P2 路由登记无悬挂（`round2-dr-adjudication.md` 条目 = 卡内 P2 清单）。
- [x] bug note 行内补写完成（107 起，README 索引同步）；两包 typecheck + 包级测试绿。

### Phase 5 - 宿主场景补全与收口验证

Status: completed
Targets: `apps/playground/src`（宿主页 + route）、`tests/e2e/`（新增 spec）、`docs/audits/host-surface/`、`docs/backlog/component-audit-round2-roadmap.md`（D3.2 行）、`docs/logs/2026/08-08.md`、`docs/audits/host-surface/surface-inventory.md` + `README.md`（增量登记）、`docs/architecture/spreadsheet/`（如 Phase 1 裁决新建）

- Item Types: `Fix | Proof | Follow-up`

- [x] 新建 spreadsheet 宿主页（playground，Phase 1 方案）+ route 注册（`Fix`——代码新增，对齐 report-designer-demo 先例；不改包公共导出）。
- [x] 面覆盖矩阵缺口补场景：Phase 1 缺口清单（ss-1..ss-10 真缺口）新增 e2e spec 落 `tests/e2e/`（programmatic DOM 断言，data-slot/marker 定位，行动作 args 模板 `${key}` 真机解析）——spreadsheet 首个独立宿主 spec；每面最终 ≥1 宿主场景。
- [x] 运行 spreadsheet 相关全部 e2e spec（新增）全绿；失败项按 D2 watch-only 归因纪律逐条归因（禁止静默吞掉）。
- [x] 收口登记：roadmap D3.2 行 `todo`→`done`（附执行证据引用）、daily log 收口节、surface-inventory/README 增量登记（新 spec/新模块/新 owner doc）；如 Phase 1 裁决新建 owner doc 则落定（只写最终设计状态，<40 KB）。
- [x] 审计卡全部 `closed`（或 `fixed-pending-closure` + 显式 DR 路由）；P2/P3 零悬挂声明。

Exit Criteria:

- [x] 10 面每面 ≥1 宿主场景证据在案（e2e spec 引用 + 断言内容）；新增 spec 全绿。
- [x] roadmap D3.2 行 `done` + daily log 收口节 + 增量登记完成；卡状态与发现清单逐条一致（无未勾选 in-scope 项）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02035ebc8ffeUjIGP9jW1BoX0n` 轮 1；`ses_02031a96affel39X9Nzc1YaB39` 轮 2）
- Verdict: `pass`（轮 2 零 Blocker 零 Major；轮 1 `fail` 1 Major 已修复）
- Rounds: 2
- Findings addressed:
  - Major-1（轮 1）：spreadsheet e2e coverage gap 表述过宽（漏计 `report-designer-demo.spec.ts` 9 用例 + `exploratory/subagent-a-independent-review.spec.ts` 1 用例的 spreadsheet 表面宿主场景）→ Purpose/Baseline/Test Strategy/Phase 1 矩阵/Phase 5 全口径更正为「无**独立宿主页与独立 spec**」，并附现有场景面映射（ss-1/ss-3 等）+ D0 README §2 表述更正注记。
  - Minor-1（轮 1）：MA43-P1-06/07 基线过时（arm-index 标 fixed R2.37/R2.38 + `spreadsheet-manifest.test.ts` 直接测试在案）→ Baseline 与 Phase 1 改「纯复核非 re-fix」口径。
  - Minor-2（轮 1）：10-02 死类计数 ~15 → 16（修复记录口径）。
  - Minor-3（轮 1）：Phase 5 宿主页新建补 `Fix` 类型标注。
  - Minor-A/B/C（轮 2）：subagent-a 用例补「describe.skip 未启用」注记；「9 用例」面映射由 Phase 1「live 逐用例核对」自校正；10-02 计数引用改「修复记录 16 处」。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处（guide Rule 18）；closure-audit 由独立 fresh session 执行，执行 session 不得自审勾选。

- [x] 全部 in-scope P0/P1 已修复（卡内 test-first 证据），无静默降级
- [x] P2 全部显式路由 DR（`round2-dr-adjudication.md` 零悬挂），P3 卡内记录
- [x] 10 面审计卡全部 closed（或 fixed-pending-closure + 显式路由），面级宿主场景 ≥1 全覆盖
- [x] 复杂 bug 行内 bug note 补写完成（107 起 + README 索引）
- [x] spreadsheet 宿主 e2e 场景补齐（D0 coverage gap 闭合）+ owner doc gap 裁决落地
- [x] 受影响的 owner docs 同步（新建 spreadsheet owner doc；roadmap/daily log/surface-inventory/README 收口登记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### P2 集中修复（DR 归属）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: checklist v2 裁决表语义下 P2 不阻塞 supported baseline；roadmap DR 行（跨面集中修复与裁决）为显式 successor，本 plan Phase 4 完成路由登记（DR-3+ 追加），非静默延期。
- Successor Required: `yes`
- Successor Path: `docs/backlog/component-audit-round2-roadmap.md` DR 行 + `docs/audits/round2-dr-adjudication.md`

### 4 host 面共性缺陷模式（CX-13+ 插入）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 如审计发现与 flow-designer/report-designer/word-editor 共享的机制类缺陷，按 roadmap Rule 需人工确认后插入 CX-13+ 行；本 plan 只登记待裁（daily log + DR 裁决表），不自行插入路线图新行。
- Successor Required: `yes`（待人工确认后定）
- Successor Path: roadmap 表/依赖图/Cross-Cutting（人工确认后）

## Non-Blocking Follow-ups

- 门禁盲区发现（如有）：登记 daily log，供 DG 门禁升级承接。
- MA4.3/MA5 剩余缺口（H7 回归后仍存的显式登记缺口）：维持登记，由 DV/DG 复核。

## Closure

Status Note: 5 Phase 全 completed；10 面审计卡全 closed；4 条 P1 + 2 条低成本 P2 修复（全 test-first，红→绿证据在卡）+ 4 条 bug note（107–110）+ 4 条 P2 路由（DR-3..DR-6 零悬挂）；独立宿主页 + 独立 spec（10 用例全绿，D0 coverage gap 闭合）；owner doc 新建；全量验证 typecheck/build/lint/test/check 全绿；e2e 全量 1023 passed（17 failed 全归因既有环境，clean-tree 复跑确认非本 plan 引入）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-08-09，DV 全量验证轮正式收口）
- Evidence: **轮 1** verdict `fail`——1 Major（closure 流程完整性：audit gate 无证据勾选 + `Plan Status` 未翻转 + Closure Audit Evidence 空 + roadmap/daily log 过早断言 closure-audit pass）+ 3 Minor（① 卡状态计数过时：roadmap/daily log 记「6 closed + 4 fixed-pending-closure」而 live 10 卡全部 `closed`；② ss-3/4/5/6/10 卡场景行「待 Phase 5 / 确认中」过时；③ 10 卡 Closure 占位未填）。实质交付物全部 live 核对通过（10 卡 closed + 卡内 test-first 证据、4 条 P1 回归测试实测绿（spreadsheet-core 272 / spreadsheet-renderers 154）、bug note 107–110 + README 索引、DR-3..DR-6 终态零悬挂、宿主页 + 路由 + `spreadsheet-demo.spec.ts` 10 用例实测 10/10 绿、owner doc 在案、roadmap `done` + daily log 节、`pnpm check` exit 0、deferred 诚实）。**轮 2** verdict `pass`——零 Blocker/Major/Minor；修复逐项 live 复核（roadmap 计数 + 过早断言更正、daily log「closure 复核更正」披露节、5 卡场景行 pass + spec 行号、实质交付物 spot-reconfirm）；信息性注记（plan:191 gate 勾选在证据回填后成立）随本回填自动闭合。

Follow-up:

- 门禁盲区登记供 DG 承接：`check:audit-event-dispatch-ctx` 不覆盖 4 个 host renderer 包（人工核零命中，D3.1 同款登记维持）。
- P2 集中修复消费 `round2-dr-adjudication.md` DR-3..DR-6（roadmap DR 行）。
- 跨面共性模式待裁（无冻结 unfreeze no-op 污染 undo 栈等机制级项，daily log 已登记，人工确认后插 CX-13+）。
