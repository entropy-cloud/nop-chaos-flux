# Round-2 Audit Master Index (round2-index)

> Plan Status: active（DG Guard 沉淀 work item 产物，2026-08-09 建成；plan `docs/plans/2026-08-08-2034-3-round2-dg-guard-sedimentation.md` Phase 3）
> Last Updated: 2026-08-09
> Purpose: 第二轮逐面审计（4 个 host 大面 37 张审计卡）的 arm 风格汇总索引——逐卡索引、P0/P1 发现索引（+ 低成本 P2 当场修复）、CX-n 模式索引（本轮无共性插入显式声明）、DR 路由终态、门禁升级基线、交叉引用。
> Source: `docs/audits/host-surface/*.md`（37 卡，live 核对 2026-08-09：卡数 37、`状态: closed` 37）+ `docs/audits/round2-dr-adjudication.md`（17 条终态）+ `docs/audits/round2-p3-adjudication.md`（149 零悬挂）+ `docs/backlog/component-audit-round2-roadmap.md`
> Paradigm: `docs/audits/per-component/pc-index.md`（第一轮逐组件轮 master index，113 卡先例）

## Family / Work-Item Index

| Work Item | Plan                                                                              | 卡数 | 面                                                                                                                   | 宿主 e2e 场景                                                                                             |
| --------- | --------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| D0        | `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md`                | —    | 编排基线（host 模板 §6 + surface-inventory + 保护区域地图）                                                          | —                                                                                                         |
| D1        | `docs/plans/2026-08-08-0715-2-round2-d1-gate-drift-pattern-family-rescan.md`      | —    | 门禁漂移回扫 + 四模式族回扫（10 个 flux-renderers-\* 包，host 包归 D3.x）                                            | —                                                                                                         |
| D2        | `docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`              | —    | 149 P3 逐条裁决 + @reserved 核对 + 6 条 watch-only e2e 复核                                                          | —                                                                                                         |
| DB        | `docs/plans/2026-08-08-0900-2-round2-db-bug-note-backfill.md`                     | —    | bug note 回补（92–106 + README 索引漂移修复）                                                                        | —                                                                                                         |
| DL        | `docs/plans/2026-08-08-0900-3-round2-dl-lessons-distillation.md`                  | —    | lessons 06–08 沉淀                                                                                                   | —                                                                                                         |
| D3.1      | `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`          | 13   | flow-designer（fd-1..13）                                                                                            | 既有 14 spec + 新增 `flow-designer-undo-clipboard.spec.ts`（3）+ `flow-designer-slot-drag.spec.ts`（2）   |
| D3.2      | `docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md`            | 10   | spreadsheet（ss-1..10）                                                                                              | 既有 report-designer-demo 间接 + 新增 `spreadsheet-demo.spec.ts`（10）+ 独立宿主页 `#/spreadsheet`        |
| D3.3      | `docs/plans/2026-08-08-1315-2-round2-d33-report-designer-surface-audit.md`        | 7    | report-designer（rd-1..7）                                                                                           | 既有 report-designer-demo + 新增 `report-designer-host.spec.ts`（5）+ 独立宿主页 `#/report-designer-host` |
| D3.4      | `docs/plans/2026-08-08-1315-3-round2-d34-word-editor-surface-audit.md`            | 7    | word-editor（we-1..7）                                                                                               | 既有 4 spec + 新增 `word-editor-recovery.spec.ts`（6）                                                    |
| DR        | `docs/plans/2026-08-08-2034-1-round2-dr-cross-surface-centralized-remediation.md` | —    | 跨面集中修复（DR-1..DR-17 全部终态）+ Tiptap label-activation 竞态（bug 117）                                        | —                                                                                                         |
| DV        | `docs/plans/2026-08-08-2034-2-round2-dv-full-verification.md`                     | —    | 全量验证（full-green：typecheck/build/lint 32/32 + test 10,703/0 + e2e 1086/43/3 全 watch-only 50Hz + check exit 0） | 全量 e2e + component-lab 336/0 + smoke 111/111 + host-surfaces 133/0                                      |
| DG        | `docs/plans/2026-08-08-2034-3-round2-dg-guard-sedimentation.md`                   | —    | Guard 沉淀（本索引 + lessons 09-10 + 门禁升级 + checklist 修订 + 基线回写）                                          | —                                                                                                         |

> 汇总：**37 卡全 closed**（fd-1..13 + ss-1..10 + rd-1..7 + we-1..7）；P0 零 / P1 ×14（全 fixed，test-first）/ 低成本 P2 当场修复 ×7 / P2 路由 DR ×16 + DR 执行中发现 ×1（DR-17，bug 117）。D3.x 每面 ≥1 真实浏览器宿主场景纪律全满足（bug 73 模式专项，programmatic DOM 断言）。

## Per-Surface Card Index（逐面卡索引）

> 每面一行；链接指向审计卡文件。宿主场景结果取值自卡内「组合宿主场景」节「结果:」行。P0/P1 与路由终态以卡内发现清单为准（`fixed` / `DR-n`）。

### flow-designer（D3.1，13 卡）

| 面                                                                    | 状态   | P0  | P1  | 低成本 P2 | 路由终态                                      | 宿主场景摘要                                             |
| --------------------------------------------------------------------- | ------ | --- | --- | --------- | --------------------------------------------- | -------------------------------------------------------- |
| [fd-1 canvas 渲染](host-surface/fd-1-canvas-rendering.md)             | closed | 0   | 0   | 0         | —                                             | pass（css-diag + dingtalk-visual + taskflow-ui）         |
| [fd-2 节点](host-surface/fd-2-nodes.md)                               | closed | 0   | 0   | 0         | DR-2（DEFAULT_NODE_TYPE_META i18n，FIXED）    | pass（label-text + tree-mode + node-title-subtitle-gap） |
| [fd-3 边](host-surface/fd-3-edges.md)                                 | closed | 0   | 0   | 0         | —                                             | pass（edge-creation + label-text + taskflow-ui）         |
| [fd-4 槽位](host-surface/fd-4-slots.md)                               | closed | 0   | 0   | 0         | —                                             | pass（tree-mode + slot-drag 新增）                       |
| [fd-5 面板](host-surface/fd-5-panels.md)                              | closed | 0   | 1   | 0         | P1-1 fixed（bug 90）                          | pass（resizable + flow-designer-ui + undo-clipboard）    |
| [fd-6 树视图](host-surface/fd-6-tree-view.md)                         | closed | 0   | 0   | 0         | —                                             | pass（tree-mode + slot-drag）                            |
| [fd-7 命令系统](host-surface/fd-7-command-system.md)                  | closed | 0   | 0   | 0         | DR-1（命令适配器 i18n，FIXED）+ H7 补测 fixed | pass（edge-creation + taskflow-ui + undo-clipboard）     |
| [fd-8 事务与 undo](host-surface/fd-8-transactions-undo.md)            | closed | 0   | 0   | 0         | —                                             | pass（undo-clipboard 新增）                              |
| [fd-9 拖拽](host-surface/fd-9-drag.md)                                | closed | 0   | 0   | 0         | —                                             | pass（resizable + slot-drag 新增）                       |
| [fd-10 键盘](host-surface/fd-10-keyboard.md)                          | closed | 0   | 0   | 0         | —                                             | pass（edge-creation + undo-clipboard）                   |
| [fd-11 剪贴板](host-surface/fd-11-clipboard.md)                       | closed | 0   | 1   | 0         | P1-1 fixed（bug 91）                          | pass（undo-clipboard 新增：Ctrl+C/V）                    |
| [fd-12 缩放平移](host-surface/fd-12-zoom-pan.md)                      | closed | 0   | 0   | 0         | —                                             | pass（minimap-pan + resizable）                          |
| [fd-13 JSON.parse 失败路径](host-surface/fd-13-json-parse-failure.md) | closed | 0   | 0   | 0         | 19-3 收敛（reportHostIssue + 用户可见文案）   | 维持单元级覆盖（显式决策）                               |

> D3.1 小结：2 P1 + 0 低成本 P2 + DR-1/DR-2；2 条 bug note（90/91）；新增 e2e 2 spec 5 用例。

### spreadsheet（D3.2，10 卡）

| 面                                                        | 状态   | P0  | P1  | 低成本 P2 | 路由终态                                   | 宿主场景摘要                          |
| --------------------------------------------------------- | ------ | --- | --- | --------- | ------------------------------------------ | ------------------------------------- |
| [ss-1 表格渲染](host-surface/ss-1-table-rendering.md)     | closed | 0   | 0   | 1         | P2-1 setViewport readonly 白名单 fixed     | pass（spreadsheet-demo 渲染/滚动）    |
| [ss-2 单元格编辑](host-surface/ss-2-cell-editing.md)      | closed | 0   | 1   | 0         | P1-1 fixed（bug 109）+ DR-3/DR-4 FIXED     | pass（spreadsheet-demo 编辑/提交）    |
| [ss-3 工具栏](host-surface/ss-3-toolbar.md)               | closed | 0   | 0   | 0         | —                                          | pass（spreadsheet-demo 工具栏）       |
| [ss-4 状态栏](host-surface/ss-4-status-bar.md)            | closed | 0   | 0   | 0         | DR-5（buildSpreadsheetStatusLabel，FIXED） | pass（spreadsheet-demo 状态行）       |
| [ss-5 公式](host-surface/ss-5-formula.md)                 | closed | 0   | 0   | 0         | —                                          | pass（spreadsheet-demo 公式写入）     |
| [ss-6 冻结](host-surface/ss-6-freeze.md)                  | closed | 0   | 1   | 0         | P1-1 fixed（bug 107）                      | pass（spreadsheet-demo 冻结固定断言） |
| [ss-7 选择](host-surface/ss-7-selection.md)               | closed | 0   | 1   | 0         | P1-1 fixed（bug 108）                      | pass（spreadsheet-demo 多选/删除）    |
| [ss-8 键盘导航](host-surface/ss-8-keyboard-navigation.md) | closed | 0   | 0   | 1         | P2-1 Escape 关面板 fixed                   | pass（spreadsheet-demo 键盘）         |
| [ss-9 搜索](host-surface/ss-9-search.md)                  | closed | 0   | 1   | 0         | P1-1 fixed（bug 110）+ DR-6 FIXED          | pass（spreadsheet-demo 查找）         |
| [ss-10 undo](host-surface/ss-10-undo.md)                  | closed | 0   | 0   | 0         | —                                          | pass（spreadsheet-demo undo/redo）    |

> D3.2 小结：4 P1 + 2 低成本 P2 + DR-3..DR-6；4 条 bug note（107–110）；新增独立宿主页 + spec 10 用例。

### report-designer（D3.3，7 卡）

| 面                                               | 状态   | P0  | P1  | 低成本 P2 | 路由终态                             | 宿主场景摘要                                 |
| ------------------------------------------------ | ------ | --- | --- | --------- | ------------------------------------ | -------------------------------------------- |
| [rd-1 画布](host-surface/rd-1-canvas.md)         | closed | 0   | 2   | 1         | P1-1/P1-2 fixed（bug 111/112）+ P2-1 | pass（report-designer-host 渲染/undo）       |
| [rd-2 字段拖拽](host-surface/rd-2-field-drag.md) | closed | 0   | 0   | 0         | DR-11（字段拖放 i18n，FIXED）        | pass（report-designer-host 字段拖入）        |
| [rd-3 inspector](host-surface/rd-3-inspector.md) | closed | 0   | 0   | 0         | —                                    | pass（report-designer-host inspector）       |
| [rd-4 预览](host-surface/rd-4-preview.md)        | closed | 0   | 0   | 0         | DR-7（preview i18n，FIXED）          | pass（report-designer-host preview mock）    |
| [rd-5 保存](host-surface/rd-5-save.md)           | closed | 0   | 0   | 0         | DR-8（save i18n，FIXED）             | pass（report-designer-host save dirty 清除） |
| [rd-6 undo](host-surface/rd-6-undo.md)           | closed | 0   | 1   | 0         | P1-2 fixed（bug 113）+ DR-9 FIXED    | pass（report-designer-host undo/redo）       |
| [rd-7 模板](host-surface/rd-7-template.md)       | closed | 0   | 0   | 0         | DR-10（模板 i18n，FIXED）            | pass（report-designer-host 空模板 fallback） |

> D3.3 小结：3 P1（bug 111/112/113，rd-1 P1-1 = rd-6 P1-1 同源）+ 1 低成本 P2 + DR-7..DR-11；新增独立宿主页 + spec 5 用例。

### word-editor（D3.4，7 卡）

| 面                                                       | 状态   | P0  | P1  | 低成本 P2 | 路由终态                                         | 宿主场景摘要                                  |
| -------------------------------------------------------- | ------ | --- | --- | --------- | ------------------------------------------------ | --------------------------------------------- |
| [we-1 文档渲染](host-surface/we-1-document-rendering.md) | closed | 0   | 0   | 1         | P2-2 死参数 fixed + DR-15 ADJUDICATED-KEEP       | pass（word-editor + recovery 投影回显）       |
| [we-2 工具栏](host-surface/we-2-toolbar.md)              | closed | 0   | 1   | 1         | P1-1 fixed + P2-2 Ctrl+F fixed + DR-12 FIXED     | pass（word-editor 逐按钮）                    |
| [we-3 选区](host-surface/we-3-selection.md)              | closed | 0   | 0   | 0         | P2-1 e2e 收敛（recovery spec bold 回显）         | pass（recovery 新增选区回显断言）             |
| [we-4 数据集](host-surface/we-4-datasets.md)             | closed | 0   | 3   | 0         | P1-1/P1-2/P1-3 fixed（bug 116/115）+ DR-13 FIXED | pass（recovery 字段展示/删除 + dataset spec） |
| [we-5 恢复](host-surface/we-5-recovery.md)               | closed | 0   | 0   | 0         | DR-16 ADJUDICATED-DOC-ALIGNED                    | pass（persistence + recovery）                |
| [we-6 导出](host-surface/we-6-export.md)                 | closed | 0   | 0   | 1         | P2-2 补测 fixed + DR-14 FIXED                    | pass（template-expr spec）                    |
| [we-7 导入](host-surface/we-7-import.md)                 | closed | 0   | 1   | 0         | P1-1 fixed（bug 114）                            | pass（recovery seed/损坏 JSON fail-closed）   |

> D3.4 小结：5 P1（we-2 ×1 + we-4 ×3 + we-7 ×1）+ 4 低成本 P2 + DR-12..DR-16；3 条 bug note（114–116）；新增 recovery spec 6 用例。

## P0/P1 Finding Index（发现索引）

> **P0 全量索引：本轮 P0 零**（live 核对：37 卡 `[P0-` 零命中）。P1（14 条）逐条收录，状态取卡内发现行终态；低成本 P2 当场修复（7 条）代表性收录。

### P1（14 条，全 fixed / test-first）

| Finding    | 面     | 描述（截断）                                                                                   | 卡                                        | 状态  | bug note / 修复引用 |
| ---------- | ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------- | ----- | ------------------- |
| fd-5-P1-1  | 面板   | toolbar 模板态冻结：items useMemo 不依赖 snapshot，undo/redo/保存按钮状态与 dirty 徽章全冻结   | [fd-5](host-surface/fd-5-panels.md)       | fixed | docs/bugs/90        |
| fd-11-P1-1 | 剪贴板 | pasteClipboard 命令缺口：adaptor execute 无 case，键盘粘贴路径端到端不可用                     | [fd-11](host-surface/fd-11-clipboard.md)  | fixed | docs/bugs/91        |
| ss-2-P1-1  | 单元格 | `spreadsheet:setCellNumberFormat` handler 空 patch no-op（声明即契约漂移）                     | [ss-2](host-surface/ss-2-cell-editing.md) | fixed | docs/bugs/109       |
| ss-6-P1-1  | 冻结   | 冻结窗格渲染不固定：真实浏览器滚动时冻结行/列随内容滚走（仅表头 sticky）                       | [ss-6](host-surface/ss-6-freeze.md)       | fixed | docs/bugs/107       |
| ss-7-P1-1  | 选择   | `getSelectedAxisInfo` count 返回 span 而非实际选中数 → 多选删除丢行数据风险                    | [ss-7](host-surface/ss-7-selection.md)    | fixed | docs/bugs/108       |
| ss-9-P1-1  | 搜索   | findResultShape 契约漂移：声明 result shape 与实现 FindResult 不一致（声明即契约）             | [ss-9](host-surface/ss-9-search.md)       | fixed | docs/bugs/110       |
| rd-1-P1-1  | 画布   | report 侧文档替换不回传 spreadsheet canvas（stale syncSource guard）                           | [rd-1](host-surface/rd-1-canvas.md)       | fixed | docs/bugs/111       |
| rd-1-P1-2  | 画布   | React StrictMode 双挂载下 designer core 被 dispose，字段源/选择/预览永久失效                   | [rd-1](host-surface/rd-1-canvas.md)       | fixed | docs/bugs/112       |
| rd-6-P1-1  | undo   | undo/redo/importTemplate 不回传画布（与 rd-1-P1-1 同源，bug 111）                              | [rd-6](host-surface/rd-6-undo.md)         | fixed | docs/bugs/111       |
| rd-6-P1-2  | undo   | toolbar 布尔取反模板不解析（`${!designer.canUndo}` 恒 undefined）→ Undo/Redo disabled 永不生效 | [rd-6](host-surface/rd-6-undo.md)         | fixed | docs/bugs/113       |
| we-2-P1-1  | 工具栏 | Redo 按钮重复渲染（font-controls 双按钮，仅缺 testId）                                         | [we-2](host-surface/we-2-toolbar.md)      | fixed | —                   |
| we-4-P1-1  | 数据集 | 数据集选中路径缺失 → Fields tab 恒空（datasetStore.select renderers 零调用）                   | [we-4](host-surface/we-4-datasets.md)     | fixed | docs/bugs/116       |
| we-4-P1-2  | 数据集 | MoreVertical 死按钮（handleDatasetMenu 仅 stopPropagation；无编辑/删除入口）                   | [we-4](host-surface/we-4-datasets.md)     | fixed | docs/bugs/116       |
| we-4-P1-3  | 数据集 | 列缺 label 数据集持久化后整集被丢弃（save 门缺失 vs normalize fail-closed）——静默数据丢失      | [we-4](host-surface/we-4-datasets.md)     | fixed | docs/bugs/115       |
| we-7-P1-1  | 导入   | loadDocument 合法 JSON 非对象根崩溃（`parsed.data` 在 parsed=null 时 TypeError）               | [we-7](host-surface/we-7-import.md)       | fixed | docs/bugs/114       |

### 低成本 P2 当场修复（7 条）

| Finding   | 面     | 内容                                                            | 卡                                               | 状态  |
| --------- | ------ | --------------------------------------------------------------- | ------------------------------------------------ | ----- |
| ss-1-P2-1 | 表格   | `spreadsheet:setViewport` 不在 READ_ONLY_COMMANDS 白名单        | [ss-1](host-surface/ss-1-table-rendering.md)     | fixed |
| ss-8-P2-1 | 键盘   | Escape 无法关闭查找/替换与批注面板（isEditableTarget 守卫短路） | [ss-8](host-surface/ss-8-keyboard-navigation.md) | fixed |
| rd-1-P2-1 | 画布   | MA5 P3-09 `as never` 类型绕过 → 窄接口收敛                      | [rd-1](host-surface/rd-1-canvas.md)              | fixed |
| we-1-P2-2 | 渲染   | EditorCanvas charts/codes 死参数（仅写不读）                    | [we-1](host-surface/we-1-document-rendering.md)  | fixed |
| we-2-P2-2 | 工具栏 | Ctrl+F preventDefault 空动作（吞浏览器查找无替代 UI）           | [we-2](host-surface/we-2-toolbar.md)             | fixed |
| we-4 附带 | 数据集 | P1 修复附带：菜单按钮 data-testid + 删除确认 Dialog 入口        | [we-4](host-surface/we-4-datasets.md)            | fixed |
| we-6-P2-2 | 导出   | 5 个 field-reference 解析函数零直接测试（补测 14 用例）         | [we-6](host-surface/we-6-export.md)              | fixed |

### P2 路由终态（DR-1..DR-16 + DR-17，全部 terminal）

> 逐条终态见 `docs/audits/round2-dr-adjudication.md`（17 条零悬挂：DR-1..DR-14 i18n 化 fixed + DR-4/DR-15/DR-16 裁决 + DR-17 执行中发现 bug 117 fixed）。D3.x 卡内 P2 清单 = 本表条目（零悬挂，见裁决表维护节）。

## CX-n Common Pattern Index（本轮：无共性插入，显式声明）

> 第二轮**未插入 CX-13+ 新行**（roadmap Rule：新 work item 由人工确认后插入，AI 不自行增删）。证据链：

| 声明来源 | 声明内容                                                                                                                                                                                                                                          | 证据                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| D1       | 四模式族回扫（事件 ctx / reaction 三件套 / scope 配对 / i18n 硬编码）**显式声明零共性缺陷**                                                                                                                                                       | plan `2026-08-08-0715-2`（D1 completed，回扫节「共性缺陷显式声明无」） |
| D3.x     | 4 host 面逐面审计未发现需插入的机制级共性模式；有发现仅登记待裁（ss-3 P3-2 / ss-6 P3-2 / ss-10 P3-4 no-op 命令 pushUndo 机制级 + ss-3 P3-4 onLog 宿主接线）——**CX-13+ 插入建议**已登记 `round2-dr-adjudication.md` §2 + daily log，人工确认后路由 | DR plan Phase 4 裁决 + `docs/logs/2026/08-08.md`                       |
| DR       | 跨面共性候选逐条裁决 = keep（P3 语义维持），无静默升级为 P2                                                                                                                                                                                       | `round2-dr-adjudication.md` §2 表 + §「P3 残留复核结论」               |

> 后续路线图插入 CX-13+ 时须同步更新本表、roadmap 表 + 依赖图 + Cross-Cutting（roadmap Rule）。

## Audit Tool Baseline（门禁基线）

> 基线：D0（2026-08-08）28 项 `check:*` 27/28 exit 0 + `check:duplicates:detail` 非门禁归因；DV（2026-08-09）fresh 复跑 `pnpm check` exit 0 + `pnpm test:scripts` 6/15 全绿（harness `testTimeout: 30_000`）。DG 门禁升级见下表追加行。

| 检查                             | DG 升级（2026-08-09）                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-event-dispatch-ctx` | **范围扩展**：扫描正则从 `^packages\/flux-renderers-`（10 包）扩展至 `^packages\/(?:flux-renderers-[^/]+ | flow-designer-renderers | spreadsheet-renderers | report-designer-renderers | word-editor-renderers)\//`（14 包，对齐 browser-io 覆盖形态）——D3.1–D3.4 四连登记盲区闭合；**0150-1 stagedDirs 治理**：`FLUX_AUDIT_SCAN_ROOT`env 判别 + 临时目录镜像夹具（对齐`find-renderer-browser-io.test.ts` 先例），测试不再写入真实包目录；**committed 回归测试先红后绿**（`scripts/**tests**/find-event-dispatch-without-ctx.test.ts` 6 用例：flux-renderers-data 正/负/原生转发 ×3 + host 包正/负 ×2 + 非 renderer 包负 ×1；RED = 2 失败 → GREEN = 6/6）；全仓复扫零命中 exit 0 |

## Cross References

- **Plans**: 各 work item plan 见 Family / Work-Item Index；收口记录见 `docs/logs/2026/08-08.md`（D0/D1/D2/DB/DL/D3.x/DR）+ `docs/logs/2026/08-09.md`（DV + DG）。
- **Bugs**: D3.x 行内 bug note 90/91/107–116 + DR 执行中发现 117 + DV 执行中发现 118/119；`docs/bugs/README.md` ↔ live 零缺口（126 条目 = 126 文件，2026-08-09 终验）。
- **e2e**: 各面宿主场景 spec 见 Family / Work-Item Index + `docs/audits/host-surface/README.md` §2 / `surface-inventory.md` 覆盖矩阵；DV 全量 1086 passed / 43 skipped / 3 failed（全 watch-only 50Hz，2026-08-09）。
- **裁决衔接**: P2 路由终态见 `round2-dr-adjudication.md`（17 条）；P3 裁决见 `round2-p3-adjudication.md`（149 零悬挂）；卡内 P3 以卡内记录为准。

## Maintenance

- 本索引随 host 面审计卡更新同步维护（DG Phase 3 建立；后续审计轮次若新增卡，须同步本文件逐卡表与计数节）。
- 逐卡表行数 = 卡数（37），发现计数节与卡内 `[P<n>-<seq>]` grep 对账；失效即修。
- 本索引与 `docs/audits/per-component/pc-index.md`（第一轮 113 卡）分工：pc-index 管逐组件轮，本文件管 host 面轮。
