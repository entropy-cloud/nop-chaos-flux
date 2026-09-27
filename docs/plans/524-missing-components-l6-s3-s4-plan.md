# 524 Missing Components L6 S3+S4 — 数据与动作 + 模板画廊（page-designer 深化）

> Plan Status: completed
> Last Reviewed: 2026-09-27
> Source: `docs/components/page-designer/design-architecture.md`（S1 §11.2 三预埋契约位 + §8.1 controlAdapters S3 formula 编辑器挂点）；roadmap §9（S3 数据与动作 / S4 键盘漫游、模板画廊、协作预留）；plan 523（S2 MVP 已 completed）
> Related: `packages/page-designer-core`（Session 六命令）+ `packages/page-designer-renderers`（palette/canvas/inspector/source-view）

## Purpose

实现 L6 S3（数据绑定编辑、`xui:actions` 可视化编排、表达式编辑器）与 S4（键盘漫游、模板画廊、协作命令模型预留——仅预埋），完成 L6 线全部阶段。

## Current Baseline

- S2 MVP completed（plan 523）：core 六命令 + Session、inspector transient+commit、source view、`#/page-designer` 入口。
- S1 §11.2 三预埋位：控件适配位（InspectorControlAdapter，S3 formula 编辑器挂点）/ 批量树命令 / 数据面板位。
- 表达式编辑器复用面：code-editor formula（packages/flux-code-editor）+ report-designer ExpressionEditorAdapter 先例。
- 数据面板：flux 数据源契约（data-source renderer）与 Session 文档的对接无 page-designer 面。

## Goals

- S3-1 数据绑定编辑：选中节点数据源/表达式绑定的结构化编辑面板（绑定到 data-source/表达式，输出经 updateProps 命令落文档）。
- S3-2 xui:actions 可视化编排：事件动作的可视化列表编辑（动作类型/参数/顺序；产出 `xui:actions` 节点写入）。
- S3-3 表达式编辑器：controlAdapters 挂点接入 code-editor formula（`${...}` 表达式编辑 + 校验）。
- S4-1 键盘漫游：结构树/canvas 键盘导航（方向键移动选择、Enter 进 inspector、Delete 删除——走命令）。
- S4-2 模板画廊：页面模板画廊（保存整页为模板 + 画廊浏览 + 实例化=importDocument；存储宿主回调）。
- S4-3 协作命令模型预留：命令序列化接口预留（不实现协作）。
- 登记：flux-guide/design-architecture S3/S4 状态回写 + roadmap §13 L6 行 S3/S4 done + QA.1-L6 出口解锁。

## Non-Goals

- 实时协作（仅命令序列化接口预留）；移动端设计器；六域编辑器内嵌。

## Failure Paths

| 编号                   | 触发               | 行为                          | 可重试 | 用户可见 |
| ---------------------- | ------------------ | ----------------------------- | ------ | -------- |
| expr-invalid           | 表达式编辑器语法错 | 校验失败行内提示，不落文档    | 是     | 行内错误 |
| action-unknown-type    | 动作类型不在已知集 | 保留原样 + 标注未知（不丢弃） | —      | 标注     |
| template-gallery-empty | 模板画廊空         | 空态                          | —      | 空态文案 |

## Test Strategy

档位：**必须自动化**（core 命令序列化接口单测 + 面板组件测试 + e2e 叙事：动作编排→导出含 xui:actions→导入还原）。

## Execution Plan

### Phase 1 - S3 数据与动作

Status: done（2026-09-26，实施回写）
Targets: `packages/page-designer-renderers/`（binding/actions 面板 + formula adapter）、`page-designer-core`（controlAdapters 挂点补全）

- Item Types: `Fix`、`Proof`
- [x] S3-1 数据绑定面板 + S3-2 动作编排面板 + S3-3 formula adapter（经 InspectorControlAdapter 挂点）
  - S3-1 `DataBindingPanel`（renderers `data-binding-panel.tsx`）：`${source.field}` 结构化编辑，产出经 updateProps；左栏第三 tab「数据」= `DataSourceCatalog`（文档 source 节点扫描 + 宿主注入清单）+ 同一绑定面板；inspector 数据绑定区同步挂接。core 增 `collectDataSourceNames`/`buildDataBindingExpression`/`parseDataBindingExpression`。
  - S3-2 `ActionsEditorPanel`（`actions-editor.tsx` + 纯逻辑 `actions-model.ts`）：`xui:actions` 命名动作链 record 编辑（类型下拉=内建已知集/参数键值对 JSON 归一化/顺序增删；未知类型保留+标注；extras/preserved 保真）；整 record 一次 `updateProps` = 1 undo 步。
  - S3-3 `createFormulaExpressionAdapter()`（`inspector-adapters.tsx` + `expression-validation.ts`）：经 `buildInspectorSchema({ controlAdapters })` 挂点注册（editorType `expression`）；校验复用 flux-formula `compileTemplate`（与 code-editor linter 同引擎，不拖 CodeMirror）；expr-invalid 行内错误不落文档。
  - core `updateProps` 语义补全：`undefined` 值键 = 移除（types.ts/commands.ts，回写测试在 commands.test.ts）。
- [x] focused 单测 + e2e（动作编排 → 导出含 xui:actions → 导入还原）
  - core：`command-serialization.test.ts`(18) + `data-binding.test.ts`(7) + `keyboard-navigation.test.ts`(5——原记 6 系虚记，勘误随 plan 525) + commands.test.ts 扩展 = 140 用例全绿。
  - renderers：`actions-model.test.ts`(11) + `actions-editor.test.tsx`(8) + `data-binding-panel.test.tsx`(8) + `inspector-adapters.test.tsx`(4) + `expression-validation.test.ts`(5) + `template-gallery.test.tsx`(10) + `page-designer-s3-s4.test.tsx`(4) = 141 用例全绿，覆盖 Stmts 97.69 / Branches 90.86 / Funcs 98.32 / Lines 98.58（≥90 门槛全过；QA.1-L6 复测 97.93/90.86/99.15/98.84——Branch 一致，余复测时点微差）。
  - e2e：`tests/e2e/page-designer-s3-s4.spec.ts` 4 条（动作编排→导出→导入还原 / formula+数据绑定 / 键盘漫游 / 模板实例化）。

Exit Criteria:

- [x] 三件 focused/e2e 全绿；S1 预埋位全部填充（design-architecture §11.2 状态回写注记已落）

### Phase 2 - S4 模板画廊 + 键盘漫游 + 预留

Status: done（2026-09-26，实施回写）
Targets: `packages/page-designer-renderers/`（gallery/keyboard）

- Item Types: `Fix`、`Proof`
- [x] S4-1 键盘漫游（命令通道）+ S4-2 模板画廊（整页模板 save/gallery/实例化 importDocument）+ S4-3 命令序列化接口预留
  - S4-1 core `buildKeyboardNavRows`/`resolveKeyboardMove`（`keyboard-navigation.ts`，与结构树同序前序遍历）+ page-designer-page keydown 接线：ArrowUp/Down/Left/Right 移动选择（core.setSelection）、Delete 走既有 removeNode dispatch；文本输入焦点内不劫持。
  - S4-2 `TemplateGallery` + `PageDesignerTemplateStore` 宿主回调 + `createInMemoryTemplateStore` demo（`template-gallery.tsx`）；保存=导出投影（无 sid），实例化=`importDocument`（1 undo 步；rt-unknown-type 拒绝→toast）；空态文案（template-gallery-empty 失败路径）。
  - S4-3 core `serializeCommand`/`deserializeCommand`（`command-serialization.ts`）：六命令 JSON 往返 + 入站校验（kind 白名单/isSchemaInput/必填字段），不实现传输。
  - i18n zh/en：`flux.pageDesigner.*` 新增 40 键（formula/data binding/actions/template 面；原记 46 系虚记，live 实测 zh/en 各 +40，勘误随 plan 525）。
- [x] focused 单测 + e2e（键盘漫游 + 模板实例化叙事）

Exit Criteria:

- [x] S3/S4 focused/e2e 全绿

### Phase 3 - 收口 + L6 出口

Status: completed（2026-09-27：closure audit approved + QA.1-L6 pass 后收口翻转）
Targets: 全仓 + 登记面

- Item Types: `Proof`
- [x] 本 plan 范围验证链：page-designer-core/renderers + playground vitest 全绿（阈值内覆盖率≥90%）+ tsc 0 错 + lint 0 错 + 两包 build 过 + 新 e2e 实跑绿；roadmap §13 L6 行 S3/S4 状态回写；design-architecture §11.2 注记
- [x] 全量链（`pnpm check`/`pnpm test:e2e` 全量口径）+ dev log 全量口径核对——QA.7 §1 实测：五链全绿（typecheck/build/lint 42×3、单测 14993/0 失败、check 链 CHAIN-EXIT:0）、e2e 全量零新增红口径在案（QA.1-L5/QA.7 各轮实跑背书）；dev log 09-26/09-27 记录核对一致
- [x] closure audit + QA.1-L6 出口审计（独立 fresh 子 agent 执行）——`QA.1-L6-line-exit-audit.md`（closure approved 0B/0M/2m+3Obs + 出口 pass 0B/0M/3m+3Obs）

Exit Criteria:

- [x] QA.1-L6 pass；roadmap/dev log 落盘（2026-09-27：QA.1-L6 pass 档在库、roadmap QA.1 行 L6 pass + dev log QA.7 节落盘，簿记尾项随 plan 525 消化）

## Draft Review Record

- Reviewer / Agent: 批次合并模式——两份独立 fresh 子 agent 审查覆盖 draft-review 职能（QA.6 集成审计〔S2 面〕+ QA.1-L6 线出口/closure 合并审计，均对实现后状态）
- Verdict: closure audit `approved`（0B/0M/2m+3Obs）+ QA.1-L6 `pass`（0B/0M/3m+3Obs）
- Rounds: 1（2026-09-27 单轮 approved；2m/3m 簿记随 plan 525 消化）
- Findings addressed: Minor-2 计数口径簇（×46→×40、keyboard 6→5、coverage 复测值）与本行内注记随 plan 525 落地；Obs-1/Obs-2/Obs-3 归登记册 A-15/A-16①/A-3 留痕

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（approved 0B/0M/2m+3Obs，2026-09-27）
- [x] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红；`pnpm test:e2e` 零新增红口径（链 42×3+78/78 + QA.7 §1 全链实测背书）

## Deferred But Adjudicated

### 实时协作

- Classification: `watch-only residual`
- Why Not Blocking Closure: roadmap S4 明文「（可选）协作命令模型预留」——仅接口预留即满足
- Successor Required: `no`

## Closure

Status Note: S3/S4 六件全部落地（数据绑定/动作编排/formula 表达式适配器/键盘漫游/模板画廊/命令序列化预留）并经 closure audit approved + QA.1-L6 出口 pass。验证：core 140/renderers 141/playground 391 全绿、链 42×3+78/78 EXIT=0、e2e 定向 7/7。L6 线出口达成，QA.7 解锁。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27，含 QA.1-L6 出口合并审计）
- Evidence: 524 closure **approved**（0B/0M/2m+3Obs——六件实现逐项全实、core 140+renderers 141+playground 391 实跑绿、e2e 4+3 全绿、coverage 四维 ≥90 门禁双过）；QA.1-L6 **pass**（0B/0M/3m+3Obs——523 两 Major 消解核验、QA.6 3m 复核、L6 行回写实跑复核；import 边界扫描项再登记 QA.7）。审计档 `QA.1-L6-line-exit-audit.md`。

Follow-up:

- no remaining plan-owned work（Obs 尾项归登记册：A-15 gallery keydown 门控 / A-16① isSchemaNode 裁定 / A-3 计数口径，触发条件见登记册）
