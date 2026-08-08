# D3.4 word-editor 大面审计（word-editor-core + word-editor-renderers）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: D3.4
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（D3.4 行 + D3.x Phase Details + Cross-Cutting + Dependency Graph）、`docs/audits/host-surface/README.md`（§1 word-editor 行 + §2 宿主 e2e 清单）、`docs/audits/host-surface/surface-inventory.md`（we-1..we-7）、`docs/audits/component-audit-checklist.md` v2 §6（host 审计卡模板）
> Related: `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md`（completed，host 模板与面清单）、`docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`（completed，同型 plan 先例）、`docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md` + `-2-round2-d33-report-designer-surface-audit.md`（draft，本 plan 执行序在最后）、`docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`（completed，w3d-editor:28 判真缺陷路由 DR——与 word-editor 宿主面区分）

## Purpose

对 word-editor 大面（`word-editor-core` + `word-editor-renderers`，7 个审计面 we-1..we-7）执行首次逐面审计：按 checklist v2 §6 host 审计卡模板产出逐面审计卡（18 维降维 + H1–H7 designer 特有维度）落 `docs/audits/host-surface/`；每面 ≥1 真实浏览器宿主场景（bug 73 模式专项，programmatic DOM 断言，禁截图——既有 4 个 word-editor spec 可复用，缺口补新场景）；P0/P1 自动修复（test-first）；P2 显式登记 `docs/audits/round2-dr-adjudication.md` 路由 DR（D3.2/D3.3 之后顺延）；P3 卡内记录；复杂 bug 行内补写 bug note（编号承接顺序递增）；回归验证后由独立 fresh session 执行 closure-audit。收口后 roadmap D3.4 行 `todo`→`done`。

## Current Baseline

（live repo 核对事实，2026-08-08）

- **D0/D1/D2/DB/DL/D3.1/D3.2/D3.3 全部 completed 或已立 plan**（2026-08-08）：host 面清单 we-1..we-7 在案（`docs/audits/host-surface/surface-inventory.md`）；checklist v2 §6 host 审计卡模板就位。
- **契约基准**（README §1 word-editor 行）：`docs/architecture/word-editor/design.md` 为唯一 owner doc（两包共用）——每面审计的契约对照基准。
- **宿主 e2e 场景齐备**（README §2）：4 个 spec——`word-editor.spec.ts`（文档编辑）、`word-editor-dataset.spec.ts`（数据集）、`word-editor-persistence.spec.ts`（持久化/恢复）、`word-editor-template-expr.spec.ts`（模板表达式）——面覆盖矩阵（4 spec ↔ we-1..we-7）为本 plan Phase 1 输出；缺口（we-2 工具栏 / we-3 选区 / we-7 导入 预计部分间接覆盖）为 Phase 5 新增场景候选。
- **w3d-editor:28 区分声明**：D2 已判 `tests/e2e/w3d-editor.spec.ts:28`（Tiptap click+type keystroke 丢失竞态）为**真缺陷并显式路由 DR（editor/Tiptap 面）**——Tiptap 富文本编辑属 `flux-renderers-form-advanced` 家族，**不属 word-editor 宿主面**（word-editor 封装 `@hufe921/canvas-editor`，见 `canvas-editor-bridge.ts`）；本 plan 不承接该修复，仅作 out-of-face 声明避免混淆。
- **CV full-green 基线**（2026-08-06 实测）：typecheck/build/lint 32/32；test 59/59（10,397 passed / 0 failed）；e2e 1054 passed / 43 skipped / 6 failed 全为 watch-only 归因清单（c3-5 ×2 Tiptap、w3d-editor:28、gantt-perf/kanban-perf 50Hz 环境阈值——均不属 word-editor 宿主面）。`pnpm check` exit 0（oversized 2 条既有 locale 豁免；audit 三门禁零命中 + 7 条 allowlist）。
- **门禁对 host 包的覆盖**：`check:audit-renderer-browser-io`（INV-1）扫描正则已覆盖 4 个 host renderer 包（`scripts/audit/find-renderer-browser-io.mjs:152`，live 零命中）；**`check:audit-event-dispatch-ctx` 仅覆盖 10 个 `flux-renderers-*` 包**（`scripts/audit/find-event-dispatch-without-ctx.mjs:343` 正则限定 `/^packages\/flux-renderers-/`），`word-editor-renderers` 事件派发 ctx 不在门禁范围，靠本 plan 逐面人工核对（Phase 2/3 18 维清单 #7 已含）。
- **`docs/audits/round2-dr-adjudication.md` 存在**（D3.1 建表 DR-1/DR-2；D3.2/D3.3 顺延追加）；表 §3 维护节约定「D3.4 P2 路由追加登记（ID 顺延）」——本 plan Phase 4 按最后顺延登记。
- **已知遗留输入（live 在案，执行时核对终态）**：MA4.3 覆盖缺口（`docs/audits/arm-MA4-designer-office-test-coverage.md`）——MA43-P1-08 `normalizeWordDocument` 等 5 个数据完整性函数零测试（word-editor-core）、MA43-P1-09 `resolveWordEditorManifest` 零测试、MA43-P1-10 `wordEditorHostContract` 零直接验证（live 复核：`word-editor-manifest.ts` 在案、core 14 个测试文件/renderers 19 个测试文件——逐条核对是否已补直接测试，H7 维度回归基准）；MA5 P3-01「word-editor-renderers 整包零测试」为**过期记录**（live 19 个测试文件，Phase 1 终态核对时标注作废）。
- **既有 08-06/08-07 零散 P2 终态**（live 在案）：word-editor 面在 08-06/08-07 的触及点为 w3d-editor:28（Tiptap，已路由 DR）与 document-io persist 测试族（we-5 面回归基准）——Phase 1 复核无回潮。
- **保护区域地图**（checklist §6.4）：word-editor 两包默认 `implement`；`packages/ui/src/index.ts` 公共导出 `ask-first`；结构性重构（公共 API/包边界）人工确认；Renderer 定义 fields 与样式契约 `plan-first`。`@hufe921/canvas-editor` 为第三方封装边界（INV-1/IO 面专项核对）。
- **bug note 纪律**（roadmap Cross-Cutting）：本 plan 修复的复杂 bug 必须**当 plan 行内**补写 `docs/bugs/` note + README 索引同步。编号：**107 起顺序递增**（live 核对：90/91 D3.1、92–106 DB；D3.2 首个占用 107；本 plan 执行时以 live `docs/bugs/` 最大编号 +1 为准）。
- **D1 共性缺陷声明**：D1/D3.1/D3.2 均无 CX-13+ 插入；本 plan 如发现跨 host 面共性模式，登记 daily log + DR 裁决表待裁，按 roadmap Rule 需人工确认后插入 CX-13+（AI 不自行增删路线图）。

## Goals

- 7 面（we-1..we-7）逐面审计卡落 `docs/audits/host-surface/we-*.md`，全部 `closed`（或带显式路由终态到 DR）。
- 每面 ≥1 真实浏览器宿主场景（复用既有 4 spec 覆盖面 + 缺口新增 e2e 落 `tests/e2e/`，programmatic DOM 断言禁截图；行动作 args 模板 `${key}` 真机解析）。
- P0/P1 全部自动修复（test-first：复现测试先行再实现），复杂 bug 行内补写 bug note（107 起顺序递增）。
- P2 显式登记 `docs/audits/round2-dr-adjudication.md` 路由 DR（D3.2/D3.3 之后顺延 ID）；P3 卡内记录（不积压）。
- 回归验证 + roadmap D3.4 行 `todo`→`done`（附执行证据）+ daily log 收口 + 独立 fresh session closure-audit。

## Non-Goals

- 不审计其他 3 个 host 大面（flow-designer/spreadsheet/report-designer = D3.1/D3.2/D3.3）。
- **不承接 w3d-editor:28 Tiptap 缺陷修复**（已路由 DR editor/Tiptap 面；word-editor 宿主面使用 `@hufe921/canvas-editor`，非 Tiptap）。
- 不集中修复 P2（体验/非阻断项路由 DR；本 plan 只修 P0/P1 + 低成本 P2 当场修复）。
- 不改 `packages/*/src/index.ts` 公共导出面；如需新增 `packages/ui` 公共导出走 `ask-first`。
- 不做门禁规则变更（门禁纪律：规则变更必须带 committed 回归测试且属 DG 门禁升级范围）。
- 不重跑 10 个 `flux-renderers-*` 包的模式族回扫（D1 已完成）。
- 不补写历史 bug note（DB 已收口；本 plan 只承接审计新修复的行内补写）。

## Scope

### In Scope

- 7 面逐面审计（we-1 文档渲染 / we-2 工具栏 / we-3 选区 / we-4 数据集 / we-5 恢复 / we-6 导出 / we-7 导入）。
- 每面按 §6.1 18 维降维 + §6.2 H1–H7 逐维核对，审计卡落 `docs/audits/host-surface/`。
- 每面 ≥1 宿主场景（复用现有 4 spec + 新增 e2e 落 `tests/e2e/`）。
- P0/P1 自动修复（test-first）+ 行内 bug note + 卡状态回写。
- 收口登记（roadmap 行 / daily log / surface-inventory / README 增量登记）。

### Out Of Scope

- D3.2/D3.3（其他 host 面）。
- DR 集中修复（P2 及跨面共性模式；w3d-editor:28 已在 DR 登记）。
- DV 全量验证轮次（本 plan 只跑收口所需验证，full-green 记录归 DV）。
- DG 门禁升级与 round2-index（归 DG；本 plan 发现的门禁盲区在收口登记中注明供 DG 承接）。

## Failure Paths

不适用（本 plan 无外部集成/鉴权/API 契约变更；宿主场景 e2e 执行遵循既有 watch-only 归因纪律——如遇性能阈值类失败按 D2 裁决终态归因记录，不静默吞掉）。主要执行风险（审计面广、发现量不确定）由 Phase 2/3 批次化 + P0/P1 强制 test-first + P2 显式路由控制。

## Test Strategy

本档选择：**必须自动化**——审计类 work item：P0/P1 修复必须 test-first（Proof 项先于 Fix 项）；每面 ≥1 宿主场景落 `tests/e2e/`（programmatic DOM 断言）；roadmap D3.x 条款（每面 ≥1 真实浏览器交互，bug 73 专项）。纯文档交付（审计卡/roadmap 登记/bug note）不新增测试。

## Execution Plan

### Phase 1 - 审计准备与基线核对

Status: completed
Targets: `docs/audits/host-surface/surface-inventory.md`、`docs/audits/host-surface/README.md`、`packages/word-editor-{core,renderers}/src`、`docs/audits/arm-MA4-designer-office-test-coverage.md`、`docs/audits/arm-MA5-designer-operability.md`、`tests/e2e/word-editor*.spec.ts`、新建 `docs/audits/host-surface/we-{1..7}-*.md`

- Item Types: `Proof | Decision | Follow-up`

- [x] 面清单核对：we-1..we-7 每面引用 README §1 契约基准（word-editor `design.md` 唯一 owner doc）+ §2 宿主场景（4 spec）；live 核对每面核心文件（we-1 `word-editor-page.tsx` + `editor-canvas.tsx`（CanvasEditorBridge 封装）；we-2 `toolbar/`（工具按钮族）；we-3 `editor-store.ts` `EditorSelectionState`；we-4 `dataset-store.ts` + `dataset-model.ts`；we-5 `document-io.ts` recovery 路径；we-6 导出路径（`template-expr.ts`/`template-model.ts`）；we-7 导入路径（`document-io.ts` load））。
- [x] 已知遗留输入终态核对（Decision）：MA43-P1-08 `normalizeWordDocument` 等 5 函数（core）零测试复核（live 14 个测试文件——逐函数核对是否已补）；MA43-P1-09 `resolveWordEditorManifest` / MA43-P1-10 `wordEditorHostContract` 直接测试存在与否（live 核对 `word-editor-manifest.ts` 与测试文件）；MA5 P3-01 过期记录标注作废（live 19 个 renderers 测试文件）。
- [x] 面级 e2e 覆盖矩阵：4 个 spec ↔ we-1..we-7 映射，缺口显式列出（缺口 = Phase 5 新增场景候选）。
- [x] 卡文件骨架建立：7 张 `docs/audits/host-surface/we-{1..7}-*.md`（§6.3 模板：面身份 / 维度审查记录表 / 发现清单 / 组合宿主场景 / 修复记录 / Closure），卡头 `> 审查 plan:` 指本 plan。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `docs/audits/host-surface/we-*.md` 7 张骨架存在且每张含面身份 + 契约基准引用 + 覆盖矩阵映射行。
- [x] 遗留输入复核结论与 e2e 覆盖矩阵缺口落面清单（surface-inventory.md 增量登记或 README 行内注记；MA5 P3-01 过期标注在案）。

### Phase 2 - 批次 A 面审计（we-1..we-4）

Status: completed
Targets: `packages/word-editor-renderers/src/word-editor-page.tsx`、`editor-canvas.tsx`、`toolbar/`、`panels/`、`dialogs/`、`preview/`、`hooks/`、`packages/word-editor-core/src/editor-store.ts`、`dataset-store.ts`、`dataset-model.ts`、`canvas-editor-bridge.ts`、`docs/audits/host-surface/we-{1..4}-*.md`

- Item Types: `Fix | Proof | Decision`

- [x] 逐面审计（每面一张卡）：§6.1 18 维降维逐维核对（Schema 契约 / RendererComponentProps 合规 / 值所有权三态（文档/选区/数据集状态三态路径 + host snapshot 同步）/ 表单参与 / DOM 与选择器契约 / 嵌套 schema 分类 / 事件与 action 契约（事件派发 ctx 人工核对 + reaction 三件套 + `component:*` 句柄）/ a11y（canvas 自绘面读屏替代）/ i18n 硬编码 `rg` 兜底 / 四态覆盖 / 异步生命周期（save/load abort 竞态）/ 组合宿主场景 / 样式契约 / React 19 规范 / 性能边界（editor-canvas 大文档渲染路径）/ 测试质量 / 文档对照 / 注册包边界与 IO 安全红线（INV-1：`@hufe921/canvas-editor` 第三方封装边界））+ §6.2 H1（host 契约：`WORD_EDITOR_MANIFEST_V1`/`wordEditorHostContract`/`createWordEditorActionProvider` 与宿主消费双向核对）+ H2（事务 undo：document 状态快照/恢复语义）+ H3（拖拽：数据集/字段拖拽如有）+ H4（键盘：工具栏快捷键 + isEditable 守卫 + 画布键盘路径）+ H5（剪贴板：复制/粘贴路径 + 权限降级）+ H6（e2e 可操作性）+ H7（MA4.3 缺口回归）。
- [x] 声明即契约双向核对（08 检测法）：`wordEditorRendererDefinitions`/`defineWordEditorPageSchema` 注册项 vs 消费矩阵；`component:*` 句柄登记 vs 派发点；schema 字段声明 vs design.md。
- [x] 发现分级 P0/P1/P2/P3（带 `文件:行` 证据）逐条入卡；P0/P1 留待 Phase 4 修复，P2 当场低成本则立即修复否则登记待 Phase 4 路由 DR，P3 卡内记录。
- [x] 面内宿主场景初验（每面 ≥1，程序化 DOM 断言；可复用既有 4 spec 覆盖面）。

Exit Criteria:

- [x] we-1..we-4 四张卡完成维度审查记录 + 发现清单（P0/P1/P2/P3 分级 + `文件:行` 证据），卡状态 `open` 或 `fixing`。
- [x] 每面 ≥1 宿主场景记录（结果 pass/fail + 证据，fail 项登记为对应发现）。

### Phase 3 - 批次 B 面审计（we-5..we-7）

Status: completed
Targets: `packages/word-editor-core/src/document-io.ts`、`template-expr.ts`、`template-model.ts`、`template-tags.ts`、`packages/word-editor-renderers/src/preview/`、`template-tag-helpers.ts`、`docs/audits/host-surface/we-{5..7}-*.md`

- Item Types: `Fix | Proof | Decision`

- [x] 逐面审计（we-5 恢复：`document-io.ts` recovery 路径（persist/load/recovery 全链路 + 失败态）；we-6 导出：导出路径（template-expr/template-model 语义 + 导出失败路径）；we-7 导入：`document-io.ts` load 路径（导入格式校验/失败路径/数据完整性——MA43-P1-08 normalize 函数族回归基准））。
- [x] 维度核对同 Phase 2 清单（含 H1 host 契约 / H2 事务 undo（document 快照恢复）/ H5 剪贴板专项）。
- [x] 发现分级入卡（同 Phase 2 裁决口径）；MA4.3/MA5 遗留输入逐条终态 Decision（收敛 / 残留 / 新发现）。
- [x] 面内宿主场景初验（每面 ≥1）。

Exit Criteria:

- [x] we-5..we-7 三张卡完成维度审查记录 + 发现清单 + 宿主场景记录。
- [x] 遗留输入全部终态 Decision 与全部 P0/P1 清单汇总（`文件:行`）可在 7 张卡中逐一查见。

### Phase 4 - P0/P1 自动修复（test-first）+ 行内 bug note

Status: completed
Targets: 修复站点 `packages/word-editor-{core,renderers}/src/**`、回归测试 `packages/word-editor-{core,renderers}/src/**/*.test.{ts,tsx}`、`docs/bugs/`（107 起顺序递增）、`docs/audits/host-surface/we-*.md` 状态回写、`docs/audits/round2-dr-adjudication.md`（P2 路由追加）

- Item Types: `Fix | Proof | Follow-up`

- [x] 全部 P0/P1：先写复现/断言测试（红）→ 实现修复（绿），证据（测试文件:行 + commit）入卡「修复记录」。
- [x] 低成本 P2 当场修复（同 test-first 纪律）；其余 P2 显式追加登记 `docs/audits/round2-dr-adjudication.md`（ID 顺延，表 §3 维护节已约定；条目 = 卡内 P2 清单，零悬挂）。
- [x] 复杂 bug（根因非平凡 / 跨包 / 加回归测试）行内补写 `docs/bugs/` note（编号 107 起顺序递增——执行时以 live `docs/bugs/` 最大编号 +1 为准，live 最大 113 → 114 起）按 `00-bug-fix-note-writing-guide.md` 模板 + `docs/bugs/README.md` 索引同步。
- [x] 卡状态回写：已修发现 `[P0-x]/[P1-x]` 行标注 `fixed`（+ plan/commit 引用），卡状态 `fixed-pending-closure`。
- [x] 局部验证：`word-editor-core` + `word-editor-renderers` 包级 typecheck + focused 测试全绿（保证 Phase 5 可继续）。

Exit Criteria:

- [x] 全部 P0/P1 修复落地（卡内 test-first 证据逐条在案），无未处置 P0/P1。
- [x] P2 路由登记无悬挂（`round2-dr-adjudication.md` 条目 = 卡内 P2 清单）。
- [x] bug note 行内补写完成（README 索引同步）；两包 typecheck + 包级测试绿。

### Phase 5 - 宿主场景补全与收口验证

Status: completed
Targets: `tests/e2e/`（新增 spec）、`docs/audits/host-surface/`、`docs/backlog/component-audit-round2-roadmap.md`（D3.4 行）、`docs/logs/2026/08-08.md`、`docs/audits/host-surface/surface-inventory.md` + `README.md`（增量登记）

- Item Types: `Proof | Follow-up`

- [x] 面覆盖矩阵缺口补场景：Phase 1 缺口清单中尚未覆盖的面新增 e2e spec 落 `tests/e2e/`（programmatic DOM 断言，data-slot/marker 定位，行动作 args 模板 `${key}` 真机解析）；每面最终 ≥1 宿主场景（含复用既有 4 spec 的面）。
- [x] 运行 word-editor 相关全部 e2e spec（现有 4 spec + 新增）全绿；失败项按 D2 watch-only 归因纪律逐条归因（禁止静默吞掉；w3d-editor:28 不属本面，不重跑归因）。
- [x] 收口登记：roadmap D3.4 行 `todo`→`done`（附执行证据引用）、daily log 收口节、surface-inventory/README 增量登记（新 spec/新模块）。
- [x] 审计卡全部 `closed`（或 `fixed-pending-closure` + 显式 DR 路由）；P2/P3 零悬挂声明。

Exit Criteria:

- [x] 7 面每面 ≥1 宿主场景证据在案（e2e spec 引用 + 断言内容）；新增 spec 全绿。
- [x] roadmap D3.4 行 `done` + daily log 收口节 + 增量登记完成；卡状态与发现清单逐条一致（无未勾选 in-scope 项）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02035baf2ffed8Di7SeFkdNJE9` 轮 1；`ses_020319875ffeJSW6a5L18htCBz` 轮 2 聚焦复核）
- Verdict: `pass`（轮 1 零 Blocker 零 Major；轮 2 复核编辑点亦零 Blocker 零 Major）
- Rounds: 2
- Findings addressed:
  - Minor-1（轮 1）：`check:audit-event-dispatch-ctx` 覆盖范围补正则引用（`find-event-dispatch-without-ctx.mjs:343`）。
  - Minor-2/3（轮 1）：08 检测法枚举补齐 `WORD_EDITOR_MANIFEST_V1`/`createWordEditorActionProvider`（H1 维度已含，纯列举补全，不改语义）；CV 基线为 2026-08-06 快照、正文已标注日期，维持。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处（guide Rule 18）；closure-audit 由独立 fresh session 执行，执行 session 不得自审勾选。

- [x] 全部 in-scope P0/P1 已修复（卡内 test-first 证据），无静默降级
- [x] P2 全部显式路由 DR（`round2-dr-adjudication.md` 零悬挂），P3 卡内记录
- [x] 7 面审计卡全部 closed（或 fixed-pending-closure + 显式路由），面级宿主场景 ≥1 全覆盖
- [x] 复杂 bug 行内 bug note 补写完成（README 索引同步）
- [x] 受影响的 owner docs 同步（行为变更 → `docs/architecture/word-editor/design.md` 或新增归档；roadmap/daily log/surface-inventory/README 收口登记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（verdict `approved`，task `ses_01eb53775ffeR6VtvDLmmczaB2`，零 Blocker/Major，4 Minor 全部收口——证据见本文件 Closure 节与 `docs/logs/2026/08-08.md` D3.4 节）
- [x] `pnpm typecheck`（32/32 全绿）
- [x] `pnpm build`（32/32 全绿）
- [x] `pnpm lint`（32/32 全绿）
- [x] `pnpm test`（59/59 任务全绿；word-editor-core 265 / word-editor-renderers 147）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

### P2 集中修复（DR 归属）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: checklist v2 裁决表语义下 P2 不阻塞 supported baseline；roadmap DR 行（跨面集中修复与裁决）为显式 successor，本 plan Phase 4 完成路由登记，非静默延期。
- Successor Required: `yes`
- Successor Path: `docs/backlog/component-audit-round2-roadmap.md` DR 行 + `docs/audits/round2-dr-adjudication.md`

### w3d-editor:28 Tiptap 竞态（D2 已路由 DR）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: D2 已判真缺陷并显式路由 DR（editor/Tiptap 面跨面集中修复）；Tiptap 属 `flux-renderers-form-advanced` 家族，不在 word-editor 宿主面（`@hufe921/canvas-editor`）范围内，本 plan 无承接义务。
- Successor Required: `yes`
- Successor Path: roadmap DR 行（`docs/audits/round2-dr-adjudication.md` 关联登记）

### 4 host 面共性缺陷模式（CX-13+ 插入）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 如审计发现与其他 host 面共享的机制类缺陷，按 roadmap Rule 需人工确认后插入 CX-13+ 行；本 plan 只登记待裁（daily log + DR 裁决表），不自行插入路线图新行。
- Successor Required: `yes`（待人工确认后定）
- Successor Path: roadmap 表/依赖图/Cross-Cutting（人工确认后）

## Non-Blocking Follow-ups

- 门禁盲区发现（如有）：登记 daily log，供 DG 门禁升级承接。
- MA4.3/MA5 剩余缺口（H7 回归后仍存的显式登记缺口）：维持登记，由 DV/DG 复核。

## Closure

Status Note: 2026-08-08 执行完毕——7 面（we-1..we-7）审计卡全 closed；5 条 P1（loadDocument null 根崩溃 / 数据集选中路径缺失 / 死菜单按钮 / 空 label 列恢复丢弃 / 重复 Redo 按钮）全 test-first 修复 + 4 条低成本 P2 修复 + 5 条 P2 路由 DR-12..DR-16 零悬挂 + 3 条 bug note（114–116）；新增 `tests/e2e/word-editor-recovery.spec.ts` 6 用例全绿（we-7 导入恢复 + we-3 选区回显 + we-4 P1 e2e 确认点）；roadmap D3.4 行 `todo`→`done` + daily log 收口 + surface-inventory/README 增量登记；全量验证（typecheck/build/lint 32/32、test 59/59、word-editor 关联 e2e 32/32、`pnpm check` exit 0）全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（task `ses_01eb53775ffeR6VtvDLmmczaB2`，2026-08-08）
- Evidence: verdict `approved`——零 Blocker/Major；4 Minor 全部收口（① we-1 P2-3 显式收敛注记（runtime 投影维持 unit-only watch）② DR 表零悬挂枚举补全（we-1 P2-3/we-3 P2-1 经 Phase 5 e2e 收敛不路由）③ we-6 补测计数更正 13→14 ④ `word-editor-persistence.spec.ts:22` 一次批量超时 flake 归因 watch-only（单跑/重跑 26/26 绿，非本 plan 引入））；审计复核：plan 文本一致性（Phase/Exit Criteria 全 `[x]` + Status completed）、修复落地 code+test 双核对、两包测试实测绿（core 265 / renderers 147）、e2e recovery 6/6、注册登记逐项在案。

Follow-up:

- 门禁盲区（供 DG 承接）：`check:audit-event-dispatch-ctx` 不覆盖 word-editor-renderers（人工核零 schema 事件派发点）；manifest docsPath 双文档并存（`docs/components/word-editor-page/design.md` vs owner doc）文档治理项。
- MA4 包簇 8 残留（5 个 field-reference 函数）→ 本 plan 已补测闭合。
- MA5 P3-01 过期记录 → 已标注作废（live 19 测试文件）。
- we-3 P3-1（selection undo/redo 禁用滞后）与 we-1 P3-1（outline render 期读桥）维持 watch-only 卡内记录。
- no remaining plan-owned work。
