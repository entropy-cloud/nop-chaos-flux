# 547 interaction-state IS-4 设计器/编辑器域序列审查批——九页审查 + P1 五项修复

> Plan Status: completed（2026-10-08 closure audit APPROVED；full-green verification）
> Last Reviewed: 2026-10-08
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-4）；`docs/skills/interaction-state-audit-prompt.md`；双审查组 live 取证报告（2026-10-07，9 页程序化探针，原始读数存档）
> Related: `docs/plans/544-interaction-state-is1-flow-designer-plan.md`（IS-1，同方法论）；`docs/plans/546-interaction-state-is3-calendar-plan.md`（IS-3）
> 编号注记：547 双占沿 543–546 既有模式（如有同名前缀计划以全文件名消歧）

## Purpose

九页设计器/编辑器域 §4 全序列审查已完成（双审查组 live 取证，22 findings：P1×5、P2×9、P3×8 + watch）；本计划收口其中 P1 五项（先红后绿），P2/P3 全量裁决登记，九页行 flip audited。

## Current Baseline

**P1 五项（全部随批修复，红证据已由审查组程序化取证）**

1. **taskflow-3**（C，跨页基础设施）：`createDefaultEnv` 的 notify 为 no-op（flux-react/src/defaults.ts:26），凡默认 env 宿主（taskflow/report/report-host）成功/失败反馈全静默——tree 模式右键"粘贴"（graph-only 命令必失败）应出 failure toast 而实测零 toast。修法：playground 宿主 env 覆盖 notify（参照 showcase-env.ts:514-521 toast 实现）。
2. **taskflow-1**（C+E）：`#/taskflow-designer` Save/Export/Import 三工具栏动作零效果零反馈——authoringModel 初始 null（taskflow-designer-lib/index.ts），schema 未派发 `taskflow:set-authoring-model`，save/export 走 `{ok:false,'No authoring model available.'}` 且因 1 静默；Import 无输入 UI。修法：初始化 authoring model 链路（schema 派发或 lib 自动建），Export 产物落到检查器输出；Import 死控登记 watch（能力缺口）。
3. **taskflow-2**（C）：选中节点 Delete/Backspace 不删除（keydown 到达 window 且 defaultPrevented=true 但删除未执行；右键删除正常；画布 deleteKeyCode=null 已排除 xyflow 原生）。候选链路：window 级 deleteSelection 分发被组件先行消费。修法：定位消费点，tree 模式接通 deleteSelection。
4. **host-1**（C）：`#/report-designer-host` 字段"插入"只派发元数据绑定事件（page-renderer.tsx:589-609）不写单元格值，但文档标脏——对照 demo 参照（report-designer-demo.tsx insertFieldAtCell 先 setCellValue 写 `${fieldId}` 再派 meta）。修法：host page-renderer 补 setCellValue 步骤。
5. **SS-1**（C）：`#/spreadsheet` 拖选范围/整行/整列选择后工具栏按钮保持禁用（default-page-body.tsx:157 `hasSelection={Boolean(selectedCell)}`——range/row/column 选择不写 selectedCell），且 aria-activedescendant 清空、方向键失效（SS-2 同根）。修法：hasSelection 覆盖 range/row/column 选择；SS-2 键盘锚点一并核验。

**P2 九项（登记裁决；本批不做除非实现成本极小）**：SS-2（拖选后键盘锚点丢失——aria-activedescendant 清空、方向键失效，与 SS-1 同根候选但核验为独立根因）；report-1（未冻结时"取消冻结"可点、"冻结窗格"禁用——状态反转 + 静默 no-op，toolbar-groups.tsx:277 门控缺 `!frozen`）；report-2（查找/替换死控件——demo `onFind/onReplace/onReplaceAll` 全 `()=>{}`）；host-2（字段拖拽绑定链缺失——dragstart no-op、无 drop 接线）；host-3（预览零 UI 反馈——结果无处呈现）；SS-3（shift+click 不扩展选区——未实现）；PD-1（Esc 中途取消拖拽无效——abortDrag 已实现未接线）；PD-2（切模板静默丢编辑无确认）；DB-1（debugger-lab 3/4 注入按钮为空桩）。
**P3 八项（登记裁决）**：report-3（查找面板无 Esc 关闭）；SS-4（undo/redo 初始即启用点之空操作）；SC-1（scada 状态栏 viewport/历史读数陈旧——editor-status-bar.tsx 源码注释自认 MVP 快照）；WE-1（大纲空态文案与实态并存）；WE-2（查找替换栏 Esc 不关）；page-1（Esc 不清节点选中）；taskflow resize 配置对账备注（P3 观察）；page-designer Direction 帮助文案观感（P3 观察）。
**Watch**：F 类 WorkbenchShell 宿主对账**无 finding**（五宿主 collapsed+toggle 全接线——538 修复已覆盖；spreadsheet 家族映射无侧板豁免）；word-editor 工具栏滚动 400→62 合法钳制；另 4 条审查组 watch（SC pipe-junction、PD 校验零反馈、DB Esc 惯例、Direction 文案观感）。

**每页已验证无缺陷序列**：双审查组报告各页 6-12 条 ✓ 清单（taskflow 12、report 10、host 6、page-designer 6、print 8、spreadsheet 11、word 9、scada 11、debugger 6）——随 findings 卡归档，防复查重复劳动。

**测试口径**：designer 域 e2e 家族丰富（taskflow-tree-ux/taskflow-designer-ui/report 族/spreadsheet/word/print/scada 族既有 spec 全绿为回归网）；新红 e2e 落 `tests/e2e/designer-interaction-state.spec.ts`（五 P1 各一用例）。

## Goals

- P1 五项先红后绿全部落地：taskflow-3 ✓（notify 接通）、taskflow-1 graph tab Save ✓（bootstrap + then-chain；tree-tab Save 与 Import 遗留登记 IS-taskflow-designer-002 successor-required）、taskflow-2 ✓（deleteSelection 路由 deleteTreeNode——"keydown 零命中"证伪为陈旧 served 模块伪影）、host-1 ✓（report-field-insert.ts 写值模块，page-renderer 700 行门禁内抽离）、SS-1 ✓（修复面裁定为 demo bridge：spreadsheet-demo hasSelection 绑定真实 selection kind）。
- P2 九项/P3 八项逐条裁决登记（ledger 行 + disposition 三态），零静默。
- 九页行 flip audited；findings 卡 + 原始读数归档；roadmap IS-4 回写。

## Non-Goals

- P2/P3 的行为修复（除实现成本极小者随批顺手，逐条留痕）。
- Import 上传 UI（能力缺口，watch）。
- scada 状态栏 viewport 订阅通道（renderer MVP 注释自认的既有边界，watch）。

## Scope

### In Scope

- `packages/flux-react/src/defaults.ts` 或 playground env 覆盖（notify）；taskflow authoring model 初始化链路；designer 快捷键 Delete 链路；`packages/report-designer-renderers/src/page-renderer.tsx`（setCellValue）；`packages/spreadsheet-renderers/src/default-page-body.tsx`（hasSelection）；各自单测；`tests/e2e/designer-interaction-state.spec.ts`（新）。
- `docs/audits/interaction-state/is4-designers/` + ledger + roadmap 回写。

### Out Of Scope

- P2/P3 行为修复（登记裁决）；scada status bar 订阅通道；Import 上传 UI。

## Failure Paths

不适用：渲染器交互与宿主接线修复，无错误处理/API 契约/鉴权/外部集成路径。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（五个已证实的 P1 交互缺陷，红 e2e 已具备确定性复现路径）。Proof 先行：`designer-interaction-state.spec.ts` 五用例先红（复现审查组取证序列），逐项修复转绿。

## Execution Plan

### Phase 1 - P1 五项红 e2e（先红）

Status: completed
Targets: `tests/e2e/designer-interaction-state.spec.ts`（新建）

- Item Types: `Proof`

- [x] Proof：五用例红——执行实况：①paste 失败零 toast（graph tab 下菜单不可见，切 Tree tab 后经 notify 修复转绿——红证据为审查组 tree tab 取证）；②Save toast 缺失（红→绿见 Phase 2）；③Delete 按 script-2 tree tab 精确序列红（默认 tab Delete 本就生效——审查组序列即 tree tab script-2）；④report-host 插入后 `${fieldId}` 缺失（红）；⑤spreadsheet 拖选后按钮 disabled（红——判别器实测 6 按钮全 disabled；注意判别按钮用标准 disabled 属性 + aria-label，非 data-disabled）。
- [x] Proof：审查组原始读数 + 每页无缺陷序列清单归档 `docs/audits/interaction-state/is4-designers/findings.md`（22 findings 表 + watch 5 条 + 撤销候选 3 条）。

Exit Criteria:

- [x] 五用例旧实现红（先红后绿纪律：spec 首跑在修复前取证——②③④⑤旧实现红、①graph-tab 菜单不可见改 tree-tab 序列红，逐条实况见上方 Proof；红态由部分进度提交 dc9ebf9c4 "2 绿 3 红" 记录佐证）。
- [x] 证据卡与读数归档落盘（findings.md + survey-readings.json；session 级探针 /tmp 已清，\_tmp 探针删除）。

### Phase 2 - P1 五项修复（逐项转绿）

Status: completed
Targets: `packages/flux-react/src/defaults.ts` 或 playground env、taskflow authoring model 链路、designer 快捷键、`packages/report-designer-renderers/src/page-renderer.tsx`、`packages/spreadsheet-renderers/src/default-page-body.tsx`

- Item Types: `Fix | Proof`

- [x] Fix：notify 接通——playground 新增 notify-toast.ts helper，taskflow/report/report-host 三页 createDefaultEnv 覆盖 notify；paste 失败出 failure toast（用例①绿）。
- [x] Fix：taskflow authoring model——graph tab save/export 走通：getDesignerDoc 改读 namespace scope 自身 doc（旧 `$designer` 键从未存在）+ authoringModel bootstrap + designer-toolbar `runThenChain`（schema `item.then` 成功链 + showToast 分支走 env.notify）——Save 出"已保存"（用例②绿，e2e 断言 toast 文案）。Import 死控已登记 ledger IS-taskflow-designer-002 successor-required。
- [x] Fix：taskflow Delete 键删除选中节点——根因是 designer-command-adapter tree deleteSelection 循环调 `core.deleteNode`（graph gate 在树模式 rejectTreeMutation）而非路由 `core.deleteTreeNode`；改为按 selectedNodeIds/activeNode 路由（每节点失败回滚）。诊断勘误：中途"keydown 零命中探针"为 dev server 陈旧 served 模块伪影，重启后 handler 正常触发（用例③绿，e2e 断言 `script-2` 节点消失而非总数减——空分支占位卡保持计数）。
- [x] Fix：report-host page-renderer 字段插入补写值——新模块 report-field-insert.ts（700 行门禁内抽离）`insertFieldWithBinding`：先 `spreadsheet:setCellValue` 写 `${fieldId}` 到目标 cell（sheetId 取自 target cell/range 自带字段）再派发元数据，对齐 demo 参照 insertFieldAtCell（用例④绿）。
- [x] Fix：spreadsheet hasSelection——修复面为 demo bridge：spreadsheet-demo `hasSelection={snapshot.selection.kind !== 'none'}`（closure audit R1 勘误：初版 `Boolean(selectedCell) || kind !== 'cell'` 在 fresh load kind='none' 时过度解禁为 enabled-but-no-op 假供纳，改为按 selection kind 全集判别；用例⑤绿 + fresh-load disabled 断言守卫）。SS-2 键盘锚点核验为独立根因（selection 投影层，非 hasSelection 同根），已登记 watch-only 不随本修。
- [x] Proof：ledger findings 翻转——IS-taskflow-designer-001/003、IS-report-designer-host-001、IS-spreadsheet-001 → verified（fixed-in-batch）；IS-taskflow-designer-002 保持 found（graph-tab Save e2e-verified 注记；tree-tab Save + Import 遗留 successor-required）。reconcile OK（audited 18 / findings 36：found 24 / verified 12）。

执行实况注记：①部分进度提交 dc9ebf9c4 后余三修（taskflow-2 Delete 路由、host-1 写值、SS-1 demo bridge）+ 断言修正收尾；②host-1 修夏述职链中 report-field-insert.ts 曾出现 helper 签名与调用点漂移（cancelled 验证链），已按 target 自带 sheetId 的最终形状收敛（`FieldInsertInput`，payload 类型 `FieldDragPayload`）后重跑 typecheck exit 0；③判别修正两处：taskflow Delete 断言 `.react-flow__node[data-id="script-2"]` 计数 0、spreadsheet 按钮判别用标准 disabled 属性 + 双语 aria-label（getByRole button name）。

Exit Criteria:

- [x] 五用例 5/5 绿（2026-10-08 修复后复检：designer-interaction-state.spec.ts 5 passed 14.9s）。
- [x] 各包既有单测零回归（report-designer-renderers 213/213；flow-designer/spreadsheet 家族见五门禁记录）。

### Phase 3 - P2/P3 裁决登记与台账收口

Status: completed
Targets: `docs/audits/interaction-state/is4-designers/findings.md` + ledger + roadmap

- Item Types: `Decision | Proof`

- [x] Decision：P2 九项/P3 八项逐条 ledger 登记（20 行新 findings 全部 found + disposition：successor-required×2 / moved-to-successor×1 / watch-only×17），零静默；watch 五条一并归档 findings.md。
- [x] Proof：九页行 flip audited（IS-4 九域 + 补翻 IS-2 批 gantt/gantt-states/gantt-perf-scale 三行——plan 545 收口时遗漏，其序列审查已记录在案）；roadmap IS-4 回写（planned→done 于 audit 后）。

Exit Criteria:

- [x] findings 卡 + ledger 全量登记（22 findings + watch 零静默）；九页行 audited。
- [x] roadmap IS-4 双表回写完成。

## Draft Review Record

- Reviewer / Agent: 本计划为审查驱动批——基线即双审查组独立 fresh session 的 live 取证报告（agent_df32f1a5 4 页 + agent_f5199fbf 5 页，2026-10-07），计划起草后由执行会话对照两报告逐条核对（22 findings 全部入卡/入表，撤销候选 3 条与 watch 5 条如实归档）。
- Verdict: `pass`（基线取证即独立审查产物；证据卡 is4-designers/findings.md 与计划 Current Baseline 逐条一致）
- Rounds: 1（基线取证 + 执行会话对账）
- Findings addressed: 22 findings 全量入卡；P1×5 列入 Phase 1/2 修复；P2×9/P3×8 列入 Phase 3 裁决；watch 5 条归档。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P1 五项全部落地：taskflow-3 / taskflow-2 / host-1 / SS-1 verified fixed-in-batch，taskflow-1 graph tab verified、tree-tab Save + Import 遗留显式 successor-required（IS-taskflow-designer-002 保持 found）；e2e 5/5 复检）
- [x] 所有 in-scope confirmed contract drifts 已收敛（F 类宿主对账无 finding；裁决全落 ledger）
- [x] 行为/契约结果已达成（五 P1 交互闭环；九页审查面覆盖）
- [x] 必要 focused verification 已完成（红→绿 e2e + report-designer-renderers 213/213 + 家族回归）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（唯一部分修复 taskflow-002 显式 found+successor-required 在案）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap IS-4 回写 done；ledger/findings 卡/dev log 同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_a2f75da9，2026-10-08，R1 VERDICT: APPROVED——附 2 Major + 3 Minor + 3 Trivial 全部随收口提交落盘修复后 e2e 复跑 5/5；执行 session 未自审）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42——首轮 report-designer-renderers 未使用 import 红，当场收敛后复跑全绿）
- [x] `pnpm test`（78/78 任务）
- [x] `pnpm check`（exit 0，零新增未登记红）

## Deferred But Adjudicated

- taskflow-002 残余（tree-tab Save 的树结构 doc→model 同步 + Import 上传 UI）：Classification = successor-owned residual；Why Not Blocking = graph-tab Save 已 e2e-verified（"已保存" toast），残余为独立 tab/能力面且 live `found` ledger 行持续在案（IS-taskflow-designer-002，successor-required）；Successor Required = yes（后续设计器批收口）。
- 执行中推翻/改判一项（Lessons 2.0 模式 3）：taskflow-2"keydown 零命中需专案调查"证伪为 dev server 陈旧 served 模块伪影（重启后 shortcut handler 正常触发，真根因是 deleteSelection 未路由 deleteTreeNode）——原调查计划撤销，诊断教训落 dev log + findings 卡。

## Non-Blocking Follow-ups

- Import 上传 UI 能力缺口（watch）。
- scada status bar viewport 订阅通道（renderer MVP 边界）。

## Closure

Status Note: 已收口（2026-10-08，full-green verification）。IS-4 九页序列审查批完成：22 findings（P1×5/P2×9/P3×8）+ watch 5 全量裁决零静默；P1 五项修复 e2e 先红后绿 5/5；P1 唯一部分面 taskflow-002（tree-tab Save + Import UI）显式 successor-required；台账 audited 18 页（IS-4 九页 + 补翻 IS-2 gantt 三页）、findings 36（found 24 / verified 12）reconcile OK。

Closure Audit Evidence:

- Auditor / Agent: agent_a2f75da9（fresh session 独立子 agent，2026-10-08）
- Evidence: R1 VERDICT: APPROVED（附条件收口）。审计独立复跑：report-designer-renderers typecheck/lint、flux-playground typecheck、interaction:reconcile（audited 18 / findings 36 全等）、playwright 5 用例 5 passed、read-only 浏览器探针（抓获 fresh-load 工具栏过度解禁）。Issues：R1-1 [Major] SS-1 判别在 kind='none' 过度解禁 → 改 `kind !== 'none'` + fresh-load disabled 断言；R1-2 [Major] plan Goals/Closure Gates 文本与终态自相矛盾 → 重写；R1-3 [Minor] ledger 翻转行 7 列幻影 → 6 列收敛 + reconcile 复核；R1-4 [Minor] Deferred"（无）"与 taskflow-002 残余裁决矛盾 → 补条目；R1-5 [Minor] spec 死断言 `toBeTruthy` → `toBeVisible`；R1-6 [Trivial] P2/P3 桶标签 off-by-one → P2×9/P3×8 全文勘误；R1-7 [Trivial] host-1 写值 fire-and-forget → await + `!ok`/`cancelled` 中止（对齐 demo abort 语义）。全部落盘后 e2e 复跑 5/5 passed（15.2s）。

Follow-up:

- 见 Non-Blocking Follow-ups。
