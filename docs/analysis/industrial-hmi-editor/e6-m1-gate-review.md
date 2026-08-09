# E6 Gate 结论：M1 实现 review（E5 `packages/flux-renderers-industrial/src/editor/` 终轮复核）

> 日期：2026-08-07
> 版本：v1（E6.1 产出）
> 上游：plan `docs/plans/2026-08-07-0404-1-e6-m1-overall-gate.md`（E6.1 Phase 1 item 5 授权本 review）；E5 被审 plan `docs/plans/2026-08-06-1931-1-e5-m1-mvp-editor-implementation.md`（4 Phase 交付 + closure-audit PASS + deferred 项）；E2 设计契约 3 份 M1 文档 `docs/components/industrial-hmi-editor/design-architecture.md`（E2.1）+ `design-renderer.md`（E2.6）+ `design-property-panel.md`（E2.2）；E1 选型 `docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md`（§3 路径 A 维持 + §5 9 设计约束 + §6 watch-only residual）+ `docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（§3 五项包络裁定建议值）；spike 报告 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（9 约束 + 事件族载荷 + 性能矩阵）；立项 `docs/components/industrial-hmi/editor-initiation.md`（§2.1 五功能域 + §2.2 M1 边界 + §6 R3/R5/R7）；五边界审计 `docs/references/new-renderer-introduction-audit.md`（§3 Checklist A–G + INV-1/INV-2）；roadmap `docs/components/roadmap-industrial-hmi-editor.md`（Phase Status E5=`done` E6=`planned` + Cross-Cutting）；E3 设计 gate 先例 `docs/analysis/industrial-hmi-editor/e3-design-gate-review.md`（结构范本）
> 下游：E6.2 修正落地（m-1～m-4 逐条回写 editor 源码 + 补 focused 测试）；roadmap（头部记录 + Phase Status E6 + M1 边界确认标记 + R7 状态）；E7（M2 连线 + undo-redo）输入交接
> 依据：roadmap E6.1 + Cross-Cutting（review gate 执行纪律 / 文档共识审查终轮复核 / 人工确认阈值 / Rule 4）；`new-renderer-introduction-audit.md §3` Checklist A–G + INV-1/INV-2 是 E6.1 五边界审计权威依据；AGENTS.md「MANDATORY: UI Component Usage」+「Renderer Component Contract」是契约边界硬约束

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」+ plan Phase 1 f-1 教训，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。

- **Round 1（2026-08-07，本 gate agent fresh session，task 待回填）**：E6.1 M1 实现 gate 审查执行完毕（六维度核对 + 五边界审计逐项 + live 引注逐项核实 + 测试质量逐文件判读）。判定与修正项清单见 §2/§3。**round-1 verdict slot 特意留空**——依据 plan Phase 1 `Proof` item「f-1 教训落地」+ AGENTS.md「执行 session 不自审」纪律，本 gate agent（执行 session）的 round-1 判定须由**独立 consensus reviewer（fresh session）复核确认**后方可写入本块。Round 1 review 已完成，pending independent consensus confirmation。
- **Round 1（2026-08-07，fresh session 独立 consensus reviewer，task id `fresh-session sub-agent (task id visible in caller context)`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit（本轮 0 新增修正项）。全文 + live repo 逐项核对 7 项 PASS：① **findings honesty**——4 项 Minor 经本 reviewer live 逐字核实全部真实存在且严重度分级恰当：**m-1** `inspector-field.tsx:69` 确为 raw `<select>` + 自定类 `nop-scada-editor-select`（:70），同文件其余 widget（Input/Textarea/Switch/Label，:2/:91/:38/:58）均正确复用 `@nop-chaos/ui`，且 `rg "<(input|textarea|select|button|label)\b" src/editor/ -g '*.tsx' -g '!*.test.tsx'` 证实 `<select>` 是 editor src 中**唯一**原生 HTML 元素（无遗漏），Minor（MANDATORY UI 规则违背但功能可用）分级精确；**m-2** `renderer-definitions.ts:39-42` 确声明 palette/inspector/toolbox/statusBar 4 region，`scada-editor-canvas.tsx:173` 仅解构 `loading/empty`，:191-206 走 override 而 :209/:230 硬编码内置面板、toolbox/statusBar 完全未渲染，Minor（扩展点偏离非 INV-x 违背）分级恰当；**m-3** `scada-editor-canvas.tsx:133-139` 确仅派发 `{canUndo:false, canRedo:false}` 缺 selection+mode，design-renderer.md §4.1（:88 载荷含 canUndo/canRedo/selection/mode）+ §8.1（onSessionChange 载荷四字段）经 `rg` 核实，同包 `projectSessionChange`（`editor-session.ts:95-102`，返回全四字段）确存在但**在派发路径未被调用**（`use-editor-engine.ts:144` `notifySession` 传 session 但 handler 忽略之），Minor（事件载荷契约 drift）分级恰当；**m-4** `scada-editor-demo.tsx:54` 确接 `component:setPointValue`（runtime `use-scada-handles.ts:16` 既有句柄，editor-canvas 仅注册 EDITOR_HANDLE_METHODS 5 方法不含 setPointValue），demo 文案 :118 宣称「双态切换 edit↔preview」与实际不符，Minor（demo 演示不可达路径）分级恰当。② **citation fidelity**——live 抽查 12+ 引注全部存在且内容相符：`EDITOR_HANDLE_METHODS`（`use-editor-handles.ts:11-17`）精确 5 方法（addSymbol/removeSymbol/updateSymbol/save/load）；`editor-engine.ts:6` `import '@leafer-in/editor'` 唯一 runtime import + :83 `new App`；`editor-adapter.ts:56-67` onTransform 读 target 几何 / `:121-145` readTargetGeometry / `:11` 节流占位注释；`use-editor-engine.ts:163-171` syncWorkingCopy + `:294-304` ResizeObserver+rAF + `:330` cloneConfigSnapshot；`dual-state.test.tsx:80-87` 断言 `not.toContain('editable')` + `:105-111` unmount 句柄移除；`ops.test.tsx:126-152` 断言 working copy 写回 + `:159` 「No crash」弱断言（gate doc 诚实标注）；`editor-test-handle.ts:31` switchMode。③ **verdict consistency**——§2 判定 `pass-with-minors`（0B/0M/4m/0n）与 §3 修正项清单 m-1～m-4 计数逐项对齐 + §7 终轮复核结论一致。④ **五边界审计**——`rg` 复核 INV 声明全部成立：A IO（`rg "fetch\(|WebSocket|EventSource|localStorage|..." src/editor/` = ZERO）+ hardcoded endpoint（ZERO）；C 内部 state（`rg "useStore|scope\.get|store\.getState" src/editor/` = ZERO，INV-4 PASS）；G 包结构（`@leafer-in/editor` runtime import 唯一于 `editor-engine.ts:6`，余为 test `vi.mock` + 注释；主入口 `src/index.ts` `rg "editor"` = ZERO；`/editor` subpath 在 package.json）；F 样式（`rg "nop-scada-editor__|nop-scada-editor--"` = ZERO 无 BEM）。⑤ **scope discipline**——gate 全程假设路径 A 维持（未重新仲裁 selection-gate §3）+ 未改 M1 边界（§4 评估维持 as-is，裁定权属人工，4 Minor 不涉能力域增删）+ 不审实现期以外的设计文档 arithmetic。⑥ **completeness**——§1–§8 八节齐备（证据集/差异清单/审查判定/五边界审计子表/修正项清单/M1 边界评估/性能抽查/文档一致性/终轮复核/收口动作），六维度 A–F + 五边界 A–G 全覆盖。⑦ **f-1 lesson discipline**——本 gate agent round-1 verdict slot 已特意留空（执行 session 不自审），由本独立 reviewer 填入判定，符合 plan Phase 1 f-1 教训。**1 项观察项（不构成修正项，below REVISE threshold）**：§6「§8.5.2 editor 扩展 8 句柄——M1 实现 5...缺 group/ungroup/undo/redo 4」中 5+4=9 与「8」标签存在计数张力——经核实 design-renderer.md §8.5.2（:285 标题「编辑扩展 8 句柄」+ :287-296 表 9 方法，undo/redo 合并一行）原设计文档即以「undo/redo 为一对」计 8 条目，gate doc 忠实重复设计文档标签，属 E3-approved 设计文档既有计数口径（非本 gate 新引入缺陷，不影响 verdict / 任何可操作修正项 / citation fidelity）。**Round 1 达成共识（连续一轮 0 新增修正项，未超 3 轮上限）**。本文件作为 E6.2 修正落地 + M1 边界确认裁定的权威 gate 依据就绪。

---

## 1. 审查输入

### 1.1 证据集

| 类别                    | 文件                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主审对象（E5 实现）     | `packages/flux-renderers-industrial/src/editor/` 全树（见 plan Current Baseline 文件清单：主渲染器 + 适配层 + 会话 + 测试句柄 + 引擎 + 错误码 + 2 hooks + palette + inspector 4 件 + styles.css）+ `symbols/symbol-types.ts`（editor hints 扩展）+ `apps/playground/src/pages/scada-editor-demo.tsx` |
| 主审对象（测试）        | `editor/` 下 15 个 `*.test.ts(x)`（质量逐文件判读）                                                                                                                                                                                                                                                  |
| E2 设计契约（对照基线） | `design-architecture.md`（E2.1）/ `design-renderer.md`（E2.6）/ `design-property-panel.md`（E2.2）                                                                                                                                                                                                   |
| M1 边界 + 复用点        | `editor-initiation.md`（§2.1/§2.2/§3/§6）                                                                                                                                                                                                                                                            |
| 选型 + 包络 + spike     | `selection-gate-2026-08-06.md`（§3/§5/§6）/ `editing-envelope-2026-08-06.md`（§3）/ `spike-2026-08-05.md`（9 约束 + 事件族 + §3.3）                                                                                                                                                                  |
| 五边界审计              | `new-renderer-introduction-audit.md`（§3 A–G + INV-1/INV-2）                                                                                                                                                                                                                                         |
| E5 plan + roadmap+log   | `2026-08-06-1931-1-e5-*.md`（Non-Goals + Deferred + Closure Evidence）/ `roadmap-industrial-hmi-editor.md` / `docs/logs/2026/08-07.md`                                                                                                                                                               |

### 1.2 任务范围摘要（editor-initiation §2.1/§2.2 M1 边界）

| 功能域          | M 归属 | E5 Phase  | M1 边界裁定（§2.2）                                                      | M1 **不含**                        |
| --------------- | ------ | --------- | ------------------------------------------------------------------------ | ---------------------------------- |
| 图元拖拽放置    | M1     | E5.1/E5.2 | 双态切换 + 图元库面板（24 内置只读）+ 拖入放置 + 画布单选/拖动/缩放/旋转 | 多选/框选（M2/E7.2）               |
| 属性面板 schema | M1     | E5.3      | schema 单源抽取 + 六类分组 + validate 衔接 + 只写声明结构                | ActionSchema 编辑器（M3/E9）       |
| 连线            | M2     | —         | （不实现）                                                               | pipe-junction 端点吸附（M2/E7.1）  |
| undo-redo       | M2     | —         | （不实现；onSessionChange canUndo/canRedo 恒 false）                     | diff 命令栈（M2/E7.2）             |
| 画布工具箱      | M3     | —         | （不实现）                                                               | 对齐/分布/层级/复制粘贴（M3/E9.1） |
| 句柄扩展        | M1     | E5.4      | addSymbol/removeSymbol/updateSymbol/save/load（M1 子集）                 | group/ungroup/undo/redo（M2/E7）   |

### 1.3 差异清单（E5 实现交付物 vs roadmap E5 work items E5.1–E5.4 范围/边界 逐项对照）

1. **E5.1 编辑态画布 + 双态切换**：`scada-editor-canvas.tsx`（loading/ready/error/destroyed 四态，`data-status="shell"` 已移除）+ `editor-engine.ts:83` `new App({ editor:{} })` + 三层 ground/tree/sky + viewport + `editor-session.ts`（M1 子集无 undoStack/redoStack）+ `editor-adapter.ts`（事件族抽纯 payload+nodeId）+ `editor-test-handle.ts`（`__flux_scada_editor_<cid>`）+ `use-editor-engine.ts`（生命周期 + ResizeObserver + 测试句柄 mount/remove）—— **范围一致**。
2. **E5.2 图元库面板 + 拖拽放置**：`editor-palette.tsx:18` `listScadaSymbols()` 只读 24 内置 + HTML5 drag-drop `onDrop`→`addWorkingSymbol`（`scada-editor-canvas.tsx:216-228`）+ 单选/拖动/缩放/旋转经 leafer Editor 原语 + 适配层读 target 几何（`editor-adapter.ts:121-145`）—— **范围一致**。
3. **E5.3 属性面板 schema**：`symbol-types.ts:98-124` 扩展 optional editor hints + `schema-extractor.ts` `extractPanelFields` 六类分组（geometry/style 推导 + binding/state/animation/event 虚拟字段注入）+ `field-errors.ts` + `inspector-panel.tsx`/`inspector-field.tsx` UI + `inspector-panel.tsx:41` `validateScadaConfig` 衔接 —— **范围一致**（24 内置图元 editor hints 经推导而非显式声明，E5 closure-audit 已记录为 non-blocking observation，M1 可接受）。
4. **E5.4 句柄扩展 + save/load**：`use-editor-handles.ts:11-17` `EDITOR_HANDLE_METHODS` = addSymbol/removeSymbol/updateSymbol/save/load（M1 子集，无 group/ungroup/undo/redo）+ `editor-errors.ts` 错误码 + 独立 i18n 映射 + `use-editor-engine.ts:217-241` save/load 提交语义 —— **范围一致**。

## 2. 审查判定

**判定：`pass-with-minors`**——0 Blocker、0 Major、4 Minor（m-1 raw `<select>` 违 MANDATORY UI 规则 / m-2 palette/inspector/toolbox/statusBar regions 声明未消费 / m-3 onSessionChange 载荷缺 selection+mode / m-4 demo「Switch Preview」按钮接错 action）。M1 核心能力（双态隔离 R5 三层 + 4 不泄漏 / 图元库 + 拖拽 / 六类属性面板 + validate 衔接 / 5 句柄 + save-load 提交语义）实质落地；五边界审计 IO/复用/内部state/契约/扩展点/样式/包结构 7 项 INV 逐项 PASS（详见下表）；M1 边界纪律维持（无越界 M2/M3）；测试质量良好（断言可观测结果，非仅「不抛错」）。

审查范围核对摘要（A–F 六维度 + 五边界审计逐项，均以实际文件 + live 源码核对）：

| 核对项（plan Scope E6.1 六维度）                                          | 结果 | 关键证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. 功能完整性 ↔ M1 边界**（E5.1–E5.4 交付 + 边界纪律）                  | ✅   | 四 Phase 交付物逐项落地（§1.3）；`EDITOR_HANDLE_METHODS`（`use-editor-handles.ts:11-17`）精确 5 方法；`editor-session.ts` 无 undoStack + canUndo/canRedo 恒 false（:95-101）；无连线/多选/框选/对齐分布（forbidden 特性仅现于注释/JSDoc/错误码常量/region 占位/既有 group 树遍历）                                                                                                                                                                                                    |
| **B. 契约一致性 ↔ 五边界审计**（A–G + INV-1/INV-2，见下子表）             | ✅   | 7 项 INV 逐项 PASS；4 Minor（m-1～m-4）属 MANDATORY 规则/扩展点/事件载荷/demo 层面，**非 INV-x 违背**（IO/复用/内部state/契约签名/包结构 5 项硬 INV 全 PASS）                                                                                                                                                                                                                                                                                                                         |
| **C. 性能 ↔ 编辑态包络**（§3，M1-tier focused）                           | ✅   | transform 族经适配层读 target 几何写 working copy（`editor-adapter.ts:56-67`），不写 scope（INV-4）、不入 undo 栈（M1 无栈）→ 无逐帧入栈爆炸；resize 经 rAF 防抖（`use-editor-engine.ts:294-304`）；working copy ref + diff 增量无全量快照泄漏；起止帧节流为 M1 单选骨架（plan 授权 M2 完善）                                                                                                                                                                                         |
| **D. 测试完整性 + 质量**（≥90% + 可观测断言 + e2e 纪律）                  | ⚠️   | industrial 70 files / 921 tests（≥90%，editor 15 测试文件）；质量良好——`dual-state.test.tsx:80-87` 断言 serialize 无 editable / `:105-111` unmount 句柄移除 / `ops.test.tsx:126-152` 断言 working copy 写回 / `editor-adapter.test.ts:53-87` 断言回调载荷 / `use-editor-handles.test.tsx:81-216` 失败路径全覆盖；少量弱断言（`ops.test.tsx:154-160`「No crash」/`editor-adapter.test.ts:186-192`）属负路径可接受；禁截图判定，走测试句柄 + page.evaluate —— ⚠️ 仅因少量弱断言，非缺陷 |
| **E. 文档一致性**（3 design drift + roadmap + daily log + deferred 诚实） | ✅   | drift 集中在 m-2（regions）+ m-3（onSessionChange 载荷）+ §8.4 测试句柄 sub-handle 分期交付（documented staged，非隐藏）；roadmap E5=`done` 与 live 一致（line 59）；daily log `08-07.md` 完整（closure + 3 缺陷修复 + full-green）；deferred 项诚实（M2/M3 明确归属，无 in-scope defect 偷偷 deferred）                                                                                                                                                                              |
| **F. scope discipline**（E5 未越界 + gate 不重新仲裁/不改边界）           | ✅   | E5 未越界（A 行已核）；本 gate 全程假设路径 A 维持（未重新仲裁 selection-gate §3 裁定）+ 未改 M1 边界（§4 评估维持 as-is，裁定权属人工）                                                                                                                                                                                                                                                                                                                                              |

### 五边界审计逐项（`new-renderer-introduction-audit.md` §3 Checklist A–G + INV-1/INV-2）

| 边界              | INV / 条款              | 结果 | live 证据（`rg` / 文件:行）                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. IO 边界**    | INV-1 / INV-2           | ✅   | `rg "fetch\(\|WebSocket\|EventSource\|localStorage\|sessionStorage\|IndexedDB\|history\.pushState\|window\.open" src/editor/` = **ZERO**；`rg "api[_-]?key\|baseURL\|http://\|https://"` = **ZERO**（无硬编码 endpoint）                                                                                                                                            |
| **B. 复用边界**   | INV-3                   | ✅   | editor 经相对路径 import runtime 面（parse/validate/serialize/diff/listScadaSymbols/getScadaSymbolDefinition/instantiateSymbol/resolveSymbolStyle/TreeRegistry/viewport 函数族）；UI 复用 `@nop-chaos/ui`（Button/Input/Textarea/Switch/Label）—— 无重造（**m-1 raw `<select>` 例外**）                                                                             |
| **C. 内部 state** | INV-4                   | ✅   | engine + session + adapter 域内部 ref 持有（`use-editor-engine.ts:79-88` latest ref）；`rg "useStore\|scope\.get\|scope\.materializeVisible\|store\.getState" src/editor/` = **ZERO**（不写 scope）；transform 高频只写 working copy ref；env 变化不重建（latest ref）                                                                                              |
| **D. 契约边界**   | INV-5                   | ✅   | 签名 `(props: RendererComponentProps<ScadaEditorCanvasSchema>)`（`scada-editor-canvas.tsx:64`）；读 `props.props`/`meta`/`regions`/`events`/`helpers`；无平行组件协议；无直访 store；events 整体 prop D-1（`renderer-definitions.ts:38`）                                                                                                                           |
| **E. 扩展点**     | region/event/handle     | ⚠️   | event（onSessionChange 等）+ handle（5 句柄经 ComponentHandleRegistry）PASS；**region 偏离**——palette/inspector/toolbox/statusBar `kind:'region'`（`renderer-definitions.ts:39-42`）但 `scada-editor-canvas.tsx:173` 仅消费 loading/empty，palette/inspector 硬编码内置面板（:209/:230）未 consult `props.regions.palette/inspector` → host 无法 override → **m-2** |
| **F. 样式**       | marker+data-slot+禁 BEM | ⚠️   | root `nop-scada-editor-canvas` + `data-slot` + 双态 `data-status`/`data-mode`（`scada-editor-canvas.tsx:186-189`）；`rg "nop-scada-editor__\|nop-scada-editor--"` = **ZERO**（无 BEM）；8 marker 齐；**m-1 例外**：`inspector-field.tsx:69` raw `<select>` + 自定类 `nop-scada-editor-select`，违 MANDATORY UI 规则                                                 |
| **G. 包结构**     | subpath+模块图          | ✅   | `package.json:16` `/editor` subpath；主入口 `src/index.ts` `rg "editor"` = **ZERO**；`@leafer-in/editor` runtime import **唯一**于 `editor-engine.ts:6`（余为 test `vi.mock` + 注释）；runtime src `rg "editor"` = **ZERO** → bundle 隔离维持（`bundle-isolation-fail`/`envelope-regression` 不触发）                                                               |

## 3. 修正项清单

### m-1（Minor，契约边界 / MANDATORY UI 规则 — raw `<select>` 违规）

- **位置**：`packages/flux-renderers-industrial/src/editor/inspector/inspector-field.tsx:69`
- **描述**：select widget 分支使用原生 `<select>` HTML 元素渲染枚举字段，而非 `@nop-chaos/ui` 的 `Select`/`NativeSelect` 组件。AGENTS.md「MANDATORY: UI Component Usage」明示「**NEVER use raw HTML elements when `@nop-chaos/ui` provides a component**」，且 `Select`/`NativeSelect` 在 `packages/ui/src/index.ts` 可用。E5 closure-audit Evidence C 将此处记为「复用 @nop-chaos/ui Input/Textarea/Switch/Label/**select**」（小写 select）——将原生元素误记为复用，该偏离未被 closure-audit 捕获。同文件其余 widget（Input/Textarea/Switch/Label）均正确复用 `@nop-chaos/ui`，唯独 select 分支偏离。附带：自定 class `nop-scada-editor-select`（:70）非 BEM 但属额外样式类，改用 `@nop-chaos/ui` 组件后可消除。
- **要求修正**：select widget 分支改用 `@nop-chaos/ui` `NativeSelect`（或 `Select`）+ 对应 trigger 项（`<SelectTrigger>`/`<SelectContent>`/`<SelectItem>` 或 NativeSelect `<option>` 子），对齐同文件其他 widget 的复用模式；移除自定 `nop-scada-editor-select` 类。补 focused 测试：select widget 渲染 `@nop-chaos/ui` 组件 + enum 选项 + onChange 写回 working copy。
- **类别**：契约边界（MANDATORY UI Component Usage）· **type: Fix**

### m-2（Minor，扩展点边界 — palette/inspector/toolbox/statusBar regions 声明未消费）

- **位置**：`packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:173`（仅 `const { loading, empty } = props.regions;`）+ `renderer-definitions.ts:39-42`（palette/inspector/toolbox/statusBar `kind:'region'`）
- **描述**：fields 声明 palette/inspector/toolbox/statusBar 4 个 region 槽（对齐 design §4.4 regions 表），但渲染路径仅消费 `loading`/`empty`（`scada-editor-canvas.tsx:191-206` 走 `loading?.render() ?? <default>` 标准 override），palette/inspector 直接硬编码 `<EditorPalettePanel>`/`<EditorInspectorPanel>`（:209/:230）、toolbox/statusBar 完全未渲染。后果：host/schema 无法经 `props.regions.palette/inspector` 注入自定义内容覆盖内置面板（Checklist E 偏离）；同渲染器内 loading/empty 走 override 而 palette/inspector 不走，模式不一致。design §4.4 将 4 者并列为 region，隐含 host 可定制语义。
- **要求修正**：二选一——**选项 A（推荐）**：palette/inspector 渲染前 consult `props.regions.palette?.render() ?? <EditorPalettePanel>` / `props.regions.inspector?.render({ nodeId }) ?? <EditorInspectorPanel>`（与 loading/empty 同模式）；**选项 B**：若 M1 不开放定制，则在 design §4.4 + renderer-definitions.ts + schemas.ts 注释标注「palette/inspector M1 内置固定面板，region 槽保留供 M2/M3」，toolbox/statusBar 标「M3/E9.1 占位」。选项 A 更契合 flux region 语义。补 focused 测试（注入 region override 时渲染 host 内容，若选 A）。
- **类别**：扩展点边界（Checklist E region override）· **type: Fix**（选项 A）或 **type: Decision**（选项 B 文档标注）

### m-3（Minor，契约边界 — onSessionChange 载荷缺 selection + mode）

- **位置**：`packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:133-139`（`handleSessionChange` 派发 `{ canUndo: false, canRedo: false }`）
- **描述**：design §4.1（:88「载荷含 canUndo/canRedo/selection/mode」）+ §8.1（:200「载荷 `{ canUndo, canRedo, selection: string[], mode }`」）规定 `onSessionChange` 载荷四字段；实现 `handleSessionChange` 仅派发 `{ canUndo: false, canRedo: false }`，**缺 `selection` 与 `mode`**。同包已有正确 helper `projectSessionChange(session)`（`editor-session.ts:95-102`，返回全四字段），但在派发路径**未被调用**（`scada-editor-canvas.tsx` inline 硬编码两字段）。后果：订阅 `onSessionChange` 的 schema action 经 `event.selection`/`event.mode` 读取得 `undefined`，无法反应选区/模式变化（设计承诺未兑现）。
- **要求修正**：`handleSessionChange` 复用 `projectSessionChange(session)` 派发全四字段（或 inline 补 selection+mode）；最简路径是在 `useEditorEngine` 的 `onSessionChange` 回调读 runtime.session 投影。补 focused 测试：addSymbol/updateSymbol/switchMode/setSelection 后 `onSessionChange` action 收到完整四字段（经 vi.fn 捕获 dispatch payload）。
- **类别**：契约边界（design §4.1/§8.1 事件载荷契约 drift）· **type: Fix**

### m-4（Minor，demo 缺陷 — 「Switch Preview」按钮接错 action）

- **位置**：`apps/playground/src/pages/scada-editor-demo.tsx:54`（「Switch Preview」按钮 `onClick: { action: 'component:setPointValue', componentId: 'editor-canvas', args: {} }`）
- **描述**：demo 页「Switch Preview」按钮的 onClick 接到 `component:setPointValue`（runtime scada-canvas 既有句柄，非 editor 扩展句柄）。editor 扩展句柄面（`use-editor-handles.ts:11-17` EDITOR_HANDLE_METHODS）= addSymbol/removeSymbol/updateSymbol/save/load，**不含 switchMode**；`setPointValue` 对编辑态画布是 no-op（编辑态不消费点表绑定，design-renderer.md §9）。后果：点击「Switch Preview」按钮无任何模式切换效果（demo 宣称「palette + canvas 编辑态画布（双态切换 edit↔preview）」与实际不符）。模式切换在 M1 仅经 `mode` prop（初始）+ 测试句柄 `switchMode`（`editor-test-handle.ts:31`）+ `onModeChange` 事件可达，**无 schema 级 component 句柄**。
- **要求修正**：二选一——**选项 A**：移除「Switch Preview」按钮（M1 模式切换非 schema 句柄可达，demo 不应演示不可达路径）；**选项 B**：在 editor 扩展句柄面补 `switchMode(mode)` 句柄（design-renderer.md §8.5.2 全集未列 switchMode 为句柄，需评估是否越界 M2——倾向不在 E6.2 扩句柄面，选 A）。推荐选项 A：移除该按钮或在 demo 文案标注「M1 模式切换经 mode prop + 测试句柄，schema 句柄 M2 评估」。同步 daily log。
- **类别**：demo 缺陷（playground 演示不可达路径）· **type: Fix**（选项 A 移除/标注）

## 4. M1 边界评估（editor-initiation §2.2）

**评估结论：M1 交付边界维持 as-is（§2.1 P0 功能域 + §2.2 M1 内容，E5 实现覆盖且 M2/M3 能力正确排除）。**

- **覆盖性**：§2.2 M1 里程碑内容（双态切换 + 图元库面板 + 拖拽放置 + 属性面板 schema 几何/样式/绑定 + 保存/加载 + 编辑期校验）经 §1.3 逐项核对全部覆盖；E5.1–E5.4 四 Phase 交付物实质落地（closure-audit Evidence A–D 已核实，本 gate 复核一致）。
- **排除性**：§2.2 明确「不含连线/多选/undo-redo（M2）/对齐分布（M3）」—— E5 实现无越界（A 行 + closure-audit Evidence F 已核实；`EDITOR_HANDLE_METHODS` 精确 5 方法；editor-session 无 undoStack；无 connections 编辑/框选/对齐分布代码）。
- **边界变更判定**：**无需变更**。4 项 Minor（m-1～m-4）均为 MANDATORY 规则/扩展点/事件载荷/demo 层面的修正项，**不涉及 M1 能力域增删**（不增删 M1 功能域、不提前 M2/M3 能力、不后置 M1 已交付能力）。
- **人工确认触发**：**`gate-m1-boundary-change` 不触发**（边界维持 as-is，裁定权属人工——本 gate 标记「M1 边界维持，待人工最终确认」，AI 不自确认范围级边界，plan Phase 2 Decision item 落地标记）。

## 5. 性能抽查结论（M1-tier）

**M1-tier focused 性能抽查：达标（无需 R7 触发）。**

| 包络维度（editing-envelope §3）    | 裁定建议值         | M1 实现机制（live 证据）                                                                                                                                                                                                                                                                | M1-tier 抽查        |
| ---------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 拖拽响应 fps @ 选区 ≤1k（primary） | ≥30fps             | transform 族经适配层读 target 几何写 working copy（`editor-adapter.ts:56-67`），**不写 scope**（INV-4）、**不入 undo 栈**（M1 无栈）→ 无逐帧入栈爆炸路径；resize 经 rAF 防抖（`use-editor-engine.ts:294-304`）；M1 仅单选（选区 ≤1）→ per-call cost 远低于 spike §3.4 的 8–10ms（n≤1k） | ✅ 达标（机制存在） |
| 编辑操作响应                       | <100ms（per-call） | `syncWorkingCopy`（`use-editor-engine.ts:163-171`）diff 增量 + `engine.applyDiff`（`editor-engine.ts:220-233`）只重建变更节点；单选场景 per-call 同步成本极小                                                                                                                           | ✅ 达标             |
| 内存                               | ≤320MB             | working copy ref 持有（不进 scope）+ diff 增量应用（无全量快照泄漏）+ `cloneConfigSnapshot` 浅拷贝 symbols（`use-editor-engine.ts:330-336`）；M1 无 undo 栈（无 forward+inverse 增量累积）                                                                                              | ✅ 达标             |
| transform 高频更新不写 scope       | （INV-4）          | `rg "scope\.get\|useStore" src/editor/` = ZERO；adapter 只回调 `onGeometryChange` 写 working copy ref                                                                                                                                                                                   | ✅ 达标             |

**节流机制说明**：design §4.6 + envelope §3 提「transform 族节流起止帧」——M1 实现为每事件读 target 几何写 working copy（`editor-adapter.ts:11` 注释明示「M1 单选场景节流逻辑骨架，M2 多选完善节流」），**E5 plan Scope 显式授权此 M1 占位**（E5.1「transform 族节流起止帧占位（M1 单选场景节流逻辑骨架，M2 多选完善）」）。节流的核心目的（防 undo 栈爆炸 + 逐属性 applyAttrs 泄漏，design §4.6）在 M1 **不适用**（无 undo 栈；applyDiff 是粗粒度非逐属性），故 M1 per-event applyDiff 在单选场景成本有界（远 < 100ms），未违背包络。**起止帧节流属 M2 落地项**（多选 + undo 栈到达后，per-event 入栈会爆炸，届时需 `editor.before_move` 起始 + pointerup/末帧终止的累计 diff 入栈 1 个）。

**R7 状态推进**：M1-tier 抽查达标，R7 编辑态包络数字（≥30fps@≤1k / <100ms / ≤320MB）在 M1 实现机制层面**未发现违背**；R7 人工最终确认**不闭环于 E6**（全量 runtime 3 层 App benchmark 复测属 E9.2，AI 仅推进状态 + 标记）。`gate-perf-below-envelope` Failure Path **不触发**。

**watch-only residual `[E1.1-sg]`**：大规模选区首次拖拽 simulateTarget 初始化延迟（rAF 驱动 fps 未单独捕获端到端指针延迟）—— M1 单选场景不触及（选区 = 1），保持感知留 E9.2 在 runtime 3 层 App 下加测（对齐 selection-gate §6 + envelope §5）。

## 6. 文档一致性核对

- **design-architecture.md（E2.1）vs E5 实现**：双态隔离三层机制（§4.2 editable 开关 / working copy 分离 / 事件派发链隔离）+ 4 不泄漏验证逐项落地（§2 子表 C/R5 已核）；编辑会话模型 §4.5（workingConfig/committedBaseline/selection/mode）M1 子集一致（无 undoStack/redoStack，editor-session.ts 注释明示 M2/E7.2 接通）；事件派发链 §4.6 策略表一致（adapter 抽纯 payload+nodeId，不派发 symbol:\*）。**drift**：design §4.6 提 transform 族节流起止帧，M1 占位骨架（§5 已述，plan 授权，非隐藏 drift）。
- **design-renderer.md（E2.6）vs E5 实现**：ScadaEditorCanvasSchema §4.1 完整字段（config/width/height/mode/commitPolicy/viewport/4 regions/events）一致（schemas.ts）；fields 规则 §4.3 D-1（events 整体 prop）一致（renderer-definitions.ts:38）；DOM marker §10 8 个 + data-slot 一致（styles.css）；句柄面 §8.5.2 editor 扩展 8 句柄——M1 实现 5（addSymbol/removeSymbol/updateSymbol/save/load），缺 group/ungroup/undo/redo 4（M2/E7，documented staged delivery）；测试句柄 §8.4 全集含 undoRedo/connection/toolbox 3 sub-handle——M1 实现 session + editor/engine/app + switchMode/setSelection/clearSelection/save/load/addSymbol/removeSymbol/updateSymbol（editor-test-handle.ts），3 sub-handle 缺（M2/M3，documented staged delivery，注释 :12 明示）。**drift**：§4.4 regions（palette/inspector/toolbox/statusBar）声明 vs 实现只消费 loading/empty → **m-2**；§4.1/§8.1 onSessionChange 载荷四字段 vs 实现两字段 → **m-3**。
- **design-property-panel.md（E2.2）vs E5 实现**：schema 单源化 §4（从 `ScadaSymbolDefinition.props` 抽取）一致（schema-extractor.ts:82-107，无第二套 schema）；六类字段 §5 一致（GROUP_ORDER + GEOMETRY_KEYS/STYLE_KEYS 推导 + 虚拟字段注入）；validate 衔接 §6 一致（inspector-panel.tsx:41 调 validateScadaConfig 单源）；只写声明结构 §7 一致（json-editor fallback for binding/state/animation/event）。**drift**：§5 表提 select widget 经 `@nop-chaos/ui`，实现用 raw `<select>` → **m-1**。
- **roadmap 一致性**：Phase Status E5=`done`（line 59）+ E6=`planned`（line 60）与 live 一致；roadmap 头部共识日志完整（E0–E5 各阶段记录在案，E6 待本 gate 回写）。
- **daily log**：`docs/logs/2026/08-07.md` 存在且完整记录 E5 closure 验证（3 缺陷修复：i18n 缺失键 + 测试断言依赖 + playground mock 补全）+ full-green（typecheck/build/lint/test 32/32 + 59/59，industrial 70 files / 921 tests）。
- **deferred 项诚实**：E5 plan Deferred But Adjudicated 4 项（undo-redo→E7.2 / 连线→E7.1 / 多选+group-ungroup→E7.2/E7 / 性能 benchmark+R7→E6·E9.2）+ InnerEditor optimization candidate —— 全部 M2/M3 明确归属，**无 in-scope live defect 偷偷 deferred**（closure-audit Evidence F 已核实，本 gate 复核一致）。

## 7. 终轮复核结论 + 人工确认触发

- **E6.1 M1 实现 gate 审查：pass-with-minors（差 4 项 Minor 落地）**——0 Blocker / 0 Major / 4 Minor（m-1 raw `<select>` / m-2 regions 未消费 / m-3 onSessionChange 载荷缺字段 / m-4 demo 按钮接错 action）/ 0 Nit。六维度核对 A–F 全覆盖（D 测试标 ⚠️ 仅因少量弱断言，非缺陷；E/F ✅）；五边界审计 7 项 INV 逐项 PASS（E/F 标 ⚠️ 因 m-1/m-2，非 INV-x 违背）。按 roadmap Cross-Cutting 共识判据（连续一轮 0 新增修正项），存在未落地修正即未达成；**E6.2 将 m-1～m-4 落地后，经独立 consensus reviewer 确认轮复核（0 新增）即达成共识**。共识循环轮次：本 gate Round 1（执行 session，verdict slot 留空待独立 reviewer）→ 独立 consensus reviewer 复核（pending）；未超 ≤3 轮上限。
- **人工确认阈值：均未触发**——
  - `gate-m1-boundary-change`（§2.2 范围级确认）：**不触发**——M1 边界维持 as-is（§4 已评估，4 Minor 不涉能力域增删）；标记「待人工最终确认」（AI 不自确认范围级边界）。
  - `gate-perf-below-envelope`（R7）：**不触发**——M1-tier 抽查达标（§5），R7 状态推进但不闭环（全量复测属 E9.2）。
  - `gate-path-blocker`（R1）：**不触发**——路径 A 维持，无双态隔离不可成立/运行态污染不可修复的架构阻断（R5 三层隔离 + 4 不泄漏 + bundle 隔离全 PASS）。
  - `consensus-round-limit`：**不触发**——本 gate Round 1 完成，pending 独立 consensus reviewer，未超 3 轮。
- **E7 unblock 前置**：E6.2 修正落地 + 回归 green + M1 边界确认标记 + roadmap 回写后，E6 收口，E7（M2 连线 + undo-redo）前置依赖满足。

## 8. 收口动作清单（E6.2 plan Phase 2 执行）

- **落地 m-1**：`inspector-field.tsx:69` select widget 改用 `@nop-chaos/ui` `NativeSelect`/`Select`；移除自定 `nop-scada-editor-select` 类；补 focused 测试（渲染 ui 组件 + enum + onChange 写回）。
- **落地 m-2**：`scada-editor-canvas.tsx:209/:230` palette/inspector consult `props.regions.{palette,inspector}?.render(...) ?? <内置>`（选项 A）；或 design §4.4 + renderer-definitions + schemas 注释标注「M1 内置固定」（选项 B）；toolbox/statusBar 注释标「M3/E9.1 占位」；补 focused 测试（若选 A）。
- **落地 m-3**：`scada-editor-canvas.tsx:133-139` `handleSessionChange` 复用 `projectSessionChange(session)` 派发全四字段；补 focused 测试（onSessionChange 收到 canUndo/canRedo/selection/mode）。
- **落地 m-4**：`scada-editor-demo.tsx:54` 移除「Switch Preview」按钮（选项 A，M1 模式切换非 schema 句柄可达）或文案标注；同步 daily log。
- **回归验证**：全量 `pnpm typecheck/build/lint/test` green（修正触及 editor 代码 + demo，Closure Gates 必跑；`regression-fail` 禁带 failing 关闭）。
- **M1 边界确认裁定标记**：gate 文档 + roadmap 标「M1 边界维持 as-is，待人工最终确认」（§4，AI 不自确认范围级边界）。
- **R7 状态推进标记**：gate 文档 §5 标「M1-tier 抽查达标，全量复测待 E9.2」（AI 推进状态，不闭环）。
- **roadmap 回写**：头部「文档共识审查记录」块新增 E6.1 gate 条目（判定 `pass-with-minors` + 六维度摘要 + 修正项数 4 + 审查/共识 task id + 共识轮次 + M1 边界「维持 as-is 待人工」+ R7「M1-tier 达标待 E9.2」+ 人工确认「均未触发」）—— 对齐 E1/E3 gate 回写先例。
- **daily log**：`docs/logs/2026/08-07.md` 记录 E6.1 产出摘要（gate 判定 + 4 Minor + 共识轮次 + M1 边界确认 + 回归结果 + E7 输入交接）。
- **E7 输入交接清单**：E6 收口后的编辑器基线（M1 实现 + 4 修正落地）+ M1 边界确认（维持 as-is）+ deferred 指向（undo-redo→E7.2 / 连线→E7.1 / 多选+group-ungroup→E7.2/E7）+ M2 起始注意（transform 起止帧节流需在 E7.2 undo 栈接通时落地防逐帧爆炸；多选 simulateTarget 首次拖拽延迟留 E9.2 加测）。
