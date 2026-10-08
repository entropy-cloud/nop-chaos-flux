# IS-4 设计器/编辑器域九页序列审查证据（plan 547 基线）

> 审查方法：docs/skills/interaction-state-audit-prompt.md §4/§6/§9；双审查组独立 fresh session 真实驱动浏览器取证（2026-10-07）。
> 完整 finding 全文与每页已验证无缺陷序列清单（taskflow 12 / report 10 / host 6 / page-designer 6 / print 8 / spreadsheet 11 / word 9 / scada 11 / debugger 6 条 ✓）见 plan 547 Current Baseline 与本卡 §findings 摘要；探针与原始读数存审查组 /tmp/isa-audit/ 与 /tmp/is-audit/（会话级），关键读数已摘录至各 finding 行。

## Findings 摘要（22 = P1×5 + P2×9 + P3×8）

| ID              | 页面          | 症状                                                                                                | 类别/级别 | 归属                                  |
| --------------- | ------------- | --------------------------------------------------------------------------------------------------- | --------- | ------------------------------------- |
| taskflow-3      | taskflow      | createDefaultEnv notify no-op，成功/失败反馈全静默（粘贴失败应出 toast 而零）                       | C/P1      | renderer 默认 env + demo 未接         |
| taskflow-1      | taskflow      | Save/Export/Import 零效果零反馈（authoringModel null → 'No authoring model available.'）            | C+E/P1    | demo 接线                             |
| taskflow-2      | taskflow      | 选中节点 Delete/Backspace 不删除（keydown 到达且 defaultPrevented，删除未执行；右键删除正常）       | C/P1      | renderer（候选：window 级分发被消费） |
| host-1          | report-host   | 字段"插入"只派发元数据不写单元格值，文档标脏（page-renderer.tsx:589-609；demo 参照先 setCellValue） | C/P1      | renderer 半接线                       |
| SS-1            | spreadsheet   | 拖选/整行/整列选择后工具栏保持禁用（hasSelection=Boolean(selectedCell) 不含 range/row/column）      | C/P1      | renderer                              |
| report-1        | report        | 未冻结时"取消冻结"可点/"冻结窗格"禁用（反转）+ 静默 no-op（toolbar-groups.tsx:277 缺 !frozen 门控） | D/P2      | renderer                              |
| report-2        | report        | 查找/替换/全部替换死控件（demo onFind/onReplace/onReplaceAll 全 ()=>{}）                            | C/P2      | demo 接线                             |
| host-2          | report-host   | 字段拖拽绑定链缺失（dragstart no-op、无 drop 接线；demo 两处全接）                                  | E/P2      | renderer                              |
| host-3          | report-host   | 预览零 UI 反馈（adapter 结果无处呈现；数据侧调用证实）                                              | C/P2      | renderer                              |
| SS-2            | spreadsheet   | 拖选后键盘锚点丢失，方向键失效（aria-activedescendant null；与 SS-1 同根候选）                      | A/P2      | renderer                              |
| SS-3            | spreadsheet   | shift+click 不扩展选区（无 shiftKey 分支）                                                          | E/P2      | renderer 能力缺口                     |
| PD-1            | print         | Esc 中途取消拖拽无效，拖拽入 undo 栈（abortDrag 已实现未接线）                                      | E/P2      | renderer                              |
| PD-2            | print         | 切换模板静默丢全部编辑（无确认闸）                                                                  | E/P2      | demo 接线                             |
| DB-1            | debugger-lab  | EVENT INJECTION 3/4 按钮空桩（monitor 移除残留 stub）                                               | C/P2      | demo 接线                             |
| report-3        | report        | 查找替换面板无 Esc 关闭/无关闭钮                                                                    | E/P3      | renderer                              |
| SS-4            | spreadsheet   | 初始 undo/redo 即启用，点击空操作（disabled 未绑 undoStack 深度）                                   | C/P3      | renderer                              |
| SC-1            | scada         | 状态栏 viewport/历史读数陈旧（editor-status-bar.tsx 自认 MVP 快照）                                 | C/P3      | renderer                              |
| WE-1            | word          | 大纲空态文案与实态并存（显隐未绑条目数）                                                            | D/P3      | renderer                              |
| WE-2            | word          | 查找替换栏 Esc 不关                                                                                 | E/P3      | renderer                              |
| page-1          | page-designer | Esc 不清节点选中                                                                                    | E/P3      | 能力缺口                              |
| taskflow-resize | taskflow      | 无 shell 配置 → 无 resize（对照 workflow schema 有；family mapping 允许 config 差异）               | 观察/P3   | config                                |
| direction-copy  | page-designer | Direction 字段 '"col" is rejected' 帮助文案观感像报错                                               | 观察/P3   | 文案                                  |

## Watch（不立案）

- F 类 WorkbenchShell 宿主对账：五宿主 collapsed+toggle 全接线（538 修复覆盖）、spreadsheet 家族映射无侧板豁免——无 finding。
- SC pipe-junction 拖拽不动（可能设计意图）；PD 校验通过零反馈；DB Esc 面板惯例偏离；Direction 文案观感；word 工具栏滚动 400→62 合法钳制。

## 修复收口（plan 547，2026-10-08）

| ID         | 裁决                                                  | 修复面与证据                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| taskflow-3 | **fixed→verified**（IS-taskflow-designer-001）        | notify-toast.ts helper（notifyWithToast）接入 taskflow/report/report-host 三页 createDefaultEnv({notify})；红→绿 e2e：粘贴失败出 failure toast。                                                                                                                                                                                                                  |
| taskflow-1 | **部分 fixed**（IS-taskflow-designer-002 保持 found） | graph tab：getDesignerDoc 改读 namespace scope 自身 doc（旧 `$designer` 键从未存在）+ authoringModel bootstrap + designer-toolbar then-chain 执行与 showToast 分支；e2e：Save 出"已保存"。遗留：tree-tab Save 的树结构 doc→model 同步、Import 无 input UI——successor-required。                                                                                   |
| taskflow-2 | **fixed→verified**（IS-taskflow-designer-003）        | designer-command-adapter tree deleteSelection 按 selectedNodeIds/activeNode 路由 core.deleteTreeNode。诊断勘误：先前"keydown 零命中"是 dev server 陈旧 served 模块伪影——重启后 shortcut handler 正常触发；e2e：Delete 后 `script-2` 节点消失（非总数减），空分支占位卡保持计数。                                                                                  |
| host-1     | **fixed→verified**（IS-report-designer-host-001）     | report-field-insert.ts（新模块，page-renderer 700 行门禁内抽离）：插入先 `spreadsheet:setCellValue` 写 `${fieldId}` 到目标 cell（sheetId 取自 target cell/range 自带字段；closure audit R2 补强：await 写入结果、`!ok`/`cancelled` 即中止——对齐 demo 参照的 abort 语义）再派发 `report-designer:dropFieldToTarget` 元数据。e2e：断言目标单元格出现 `${fieldId}`。 |
| SS-1       | **fixed→verified**（IS-spreadsheet-001）              | 修复面为 demo bridge：spreadsheet-demo `hasSelection={snapshot.selection.kind !== 'none'}`（closure audit R1 勘误：初版 `Boolean(selectedCell) \|\| kind !== 'cell'` 在 fresh load kind='none' 时过度解禁——enabled-but-no-op 假供纳同类缺陷；改为按 kind 全集判别，cell/range/row/column/sheet 均解禁、none 禁用）。e2e：拖选后 Copy (Ctrl) 按钮 toBeEnabled。    |

判别口径修正（先红后绿纪律保留的红用例现全绿）：taskflow Delete 断言改为 `.react-flow__node[data-id="script-2"]` 计数 0（原"总数减一"断言对分支占位卡渲染不判别）；spreadsheet 按钮判别用标准 `disabled` 属性 + 双语 aria-label 集合（getByRole button name）。

e2e 全量：tests/e2e/designer-interaction-state.spec.ts 5/5 passed（2026-10-08，修复后复检；closure audit R1 修 SS-1 判别 + host-1 abort 语义后复跑 5/5 passed）。原始 survey 读数存本目录 survey-readings.json。
