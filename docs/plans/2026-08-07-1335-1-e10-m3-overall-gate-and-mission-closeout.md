# 1 Editor Mission E10 M3 整体 gate + 整体收尾

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E10 work items E10.1/E10.2、Phase Details E10「第五个固定 review gate + 整体收尾（功能/性能/测试/文档四面审查 + 风险清单关闭 + 人工确认项闭环）」、Work Items §E10 表、Phase Status E10=`todo`、Cross-Cutting review gate 执行纪律/人工确认阈值/双态隔离/spike 先行纪律/测试纪律/文档共识审查/组件注册/Follow-up Backlog）、`docs/components/industrial-hmi/editor-initiation.md`（§2.1 五功能域 M1/M2/M3 边界（画布工具箱 P2 M3）+ §2.2 M3 里程碑「对齐/分布/层级/复制粘贴/图元库管理 + 导入导出完善 + 撤销深化」+ §3 复用点 #1 引擎层视口命令 + #3 图元注册表只读 + #5 句柄面 exportConfig/importConfig + §6 R1–R8 风险清单 + 人工确认项汇总③ R1/R7/M1 边界）、`docs/plans/2026-08-07-0906-2-e9-m3-toolbox-completion-and-closeout.md`（E9 上游，被审对象，Plan Status `completed` + 独立 fresh-session closure-audit PASS）、`docs/references/new-renderer-introduction-audit.md`（§3 强制审计 Checklist A–G + INV-1/INV-2 IO 边界，E10.1 契约审查依据）、`docs/components/industrial-hmi-editor/design-toolbox.md`（E2.5 M3 契约，五项工具复用映射 §4.1–§4.5 + 风险清单 T1–T5 §12.1）+ `design-undo-redo.md`（E2.4，§4.4 跨操作合并 M3 完善 + §4.5 边界提示）+ `design-renderer.md`（E2.6，§8.4 toolbox sub-handle + §3 同步清单「组件注册」）+ 全部 6 份 design 文档（E10.1 整体性审查对照）、`docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`（E9.2 runtime 3 层 App benchmark 复测，R7 最终状态推进依据）、`docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§七 Q8 + §八 决策 1，编辑器后置范围裁定，E10.1 整体性审查对照）
> Related: `docs/plans/2026-08-07-0404-1-e6-m1-overall-gate.md`（E6 M1 gate 先例）+ `docs/plans/2026-08-07-0906-1-e8-m2-overall-gate.md`（E8 M2 gate 先例，gate 执行/共识审查/roadmap 回写/性能抽查档位/收尾流程范本）、`docs/plans/2026-08-07-0906-2-e9-m3-toolbox-completion-and-closeout.md`（E9 被审 plan，deferred 项指向 E10.1/E10.2）
> Mission: industrial-hmi-editor
> Work Item: E10

## Purpose

执行 industrial-hmi-editor mission 的 **E10 M3 整体 gate + 整体收尾**——本 mission 第五个也是**最后一个固定 review gate**（roadmap Phase Status 五 gate 之一，E1/E3/E6/E8/**E10**）。由**独立子 agent（fresh session，不复用 E9 执行上下文）**对照 E2 设计契约（design-toolbox.md / design-undo-redo.md §4.4+§4.5 / design-renderer.md §8.4+§3 / 全部 6 份 design 文档）+ `editor-initiation.md §2.1/§2.2` M3 边界 + `new-renderer-introduction-audit.md` 五边界审计 Checklist（A–G + INV-1/INV-2）+ 讨论文件 §七 Q8/§八 决策 1，从**功能 / 性能 / 测试 / 文档**四面审查 E9 M3 实现完整性（对齐/分布/层级/复制粘贴/图元库管理/导入导出完善/撤销深化），并做 **mission 级整体性审查**（五功能域 M1/M2/M3 全链完整性 + R1–R8 风险清单状态 + 人工确认项闭环 + deferred 项诚实性），产出 gate 审查文档 + 分级修正项；修正项落地后做回归验证；完成 **M3 交付边界确认**（维持 as-is 或标记范围级变更人工确认）+ **R7 编辑态包络状态最终推进**（基于 E9.2 已完成的 runtime 3 层 App 复测，标记待人工最终确认）+ **风险清单关闭**（R1–R8 逐项最终状态）+ **人工确认项闭环**（R1/R7/M1 边界最终标记）。

E10 收口后，roadmap Phase Status E9 由 `planned` → `done`、E10 `todo` → 经 plan 生命周期 → `done`，mission 全部 work item 落地。E10 不重新实现 E9（只落地 gate 修正项）、不实现 M3 后可选项（InnerEditor / OS clipboard / 断开连接工具 / 撤销历史面板 UI）、不替代 R7 人工最终确认（AI 推进状态 + 标记，人工最终确认）、不重跑 E9.2 已完成的 benchmark 全量复测。

## Current Baseline

- **E9 M3 实现已落地并通过自身 closure-audit**（roadmap Phase Status E9 = `planned`——实现 plan 已 `completed` + 独立 fresh-session closure-audit PASS；Phase Status 维持 `planned` 是 mission 的 gate-pair 约定：E10 gate 通过才翻 `done`，与本 plan 不冲突）：`packages/flux-renderers-industrial/src/editor/` 含完整 M3 实现——
  - **工具箱完整（E9.1）**：`toolbox/` 4 模块（align-distribute.ts 对齐分布算法 / z-order.ts 层级 toTop/toBottom / clipboard.ts 复制粘贴（分配新 id，T4）/ toolbox-panel.tsx 面板 UI）+ 4 配套单测（align-distribute/z-order/clipboard/toolbox-panel .test.ts/.test.tsx）；`use-editor-engine.ts` 工具箱扩展句柄（fit/center/reset/zoom/align/distribute/reorderZOrder/copy/cut/paste/exportConfig/importConfig/listSymbolLibrary）；`editor-test-handle.ts` `toolbox` 子句柄（fit/center/zoomAt + align/distribute/toTop/toBottom + copy/cut/paste/getClipboard + exportConfig/importConfig + listSymbolLibrary）；`operation-coalesce.ts` M3 跨操作合并完善（coalesceGroup：连续同方向对齐/分布/层级合并）；`scada-editor-canvas.tsx` toolbox region 默认内容 consult（`props.regions.toolbox?.render(...) ?? <EditorToolboxPanel>`）；toolbox e2e 经测试句柄程序化断言 working copy / clipboard / undoStack / viewport。五项工具复用映射按 design-toolbox.md §4.1–§4.5 全部落地——视图工具复用 engine.fit/center/setViewport/zoomAt/getViewport（不重复实现）、导入导出复用 serialize/parse/validate、图元库复用 listScadaSymbols 只读、层级经 symbols 数组重排（T3）、clipboard 分配新 id（T4）、导入确认对话框（T5）。
  - **R5 双态隔离**：工具箱操作不派发 `symbol:*` action（e2e 断言）；R4 内存约束维持（operation-coalesce M3 coalesceGroup 仍只持 forward+inverse 增量，无全量快照）。
  - **E9.2 M3 收尾**：编辑态 benchmark 复测报告 `docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`（runtime 3 层 App，对照 §3 裁定建议值：② per-call max 13.1ms <100ms / ① 拖拽 best 50.2fps @1k ≥30fps / ④ 内存 50.2MB ≤320MB，三项 primary 包络全部达标余量充足；`envelope-below-candidate` 不触发）+ 指针延迟抽查（[E1.1-sg] watch-only residual：1k 首次拖拽初始化 jank ~7.5fps、稳态 50fps，非阻断）+ 文档收尾（`docs/index.md:87` editor 篇导航 / `docs/references/quick-reference.md:822` scada-editor-canvas 组件表 / `flux-guide/design-patterns/scada-editor.md` 新增 / `design-toolbox.md:5` E9.1 实现收口标注 / `examples.manifest.json:64` runtime 数组含 scada-editor-canvas）。
- **E9 测试基线**：industrial 包 89 files / 1199 tests pass（editor 子目录含 toolbox/ 4 单测 + toolbox e2e），coverage 90.25% branches ≥ 90% threshold；E9 closure-audit spot-check workspace 全量 typecheck/build/test green。
- **设计契约已稳定（E10 审查对照基线）**：6 份 design 文档落地于 `docs/components/industrial-hmi-editor/`（design-architecture E2.1 / design-property-panel E2.2 / design-connection E2.3 / design-undo-redo E2.4 / design-toolbox E2.5 / design-renderer E2.6）；E3 设计 gate `e3-design-gate-review.md` verdict `pass-with-minors`（设计层已收口）。M3 直接相关：design-toolbox.md（五项工具复用映射 §4.1–§4.5 + 风险 T1–T5 §12.1）/ design-undo-redo.md（§4.4 跨操作合并 M3 完善 + §4.5 边界提示）/ design-renderer.md（§8.4 toolbox sub-handle + §3 同步清单）。
- **编辑态包络（R7 状态：primary 达标，待人工最终确认）**：`editing-envelope-retest-2026-08-07.md` 经 runtime 3 层 App 复测，primary 包络 ① 拖拽 ≥30fps@≤1k / ② 编辑操作 <100ms / ④ 内存 ≤320MB 全部达标（数据见复测报告，余量充足）；R7 编辑态包络数字属人工确认阈值（benchmark 验收阈值类），**待人工最终确认**（AI 产出裁定建议 + 复测数据 + 标记，不自确认）。E6（M1-tier 达标）→ E8（M2-tier 达标）→ E9.2（全量 runtime 3 层 App 复测 primary 达标）状态推进链完整，E10 做最终状态标记。
- **E9 deferred 项（明确属 M3 后可选项，E10 收尾时在风险清单 / deferred 裁定中给最终归属，非 E10 实现范围）**：InnerEditor（文本双击编辑，依赖 `@leafer-in/text-editor`，spike 约束 #8 + design-renderer §1 非目标）→ M3 后可选；OS clipboard 桥接（design-toolbox T2，M3 编辑器内 clipboard）→ M3 后可选；「断开连接」工具 / dangling connection 批量清理 / 撤销历史面板 UI（design-connection §12.3 / design-undo-redo §4.5）→ M3 后可选；ActionSchema 编辑器（M3 事件走 json-editor fallback）→ M3 后可选。
- **watch-only residual（E10 保持感知，非阻断）**：`[E0-spike]` InnerEditorEvent 在 `research-render-engines.md §5:122` 未枚举（无害漂移，roadmap Follow-up Backlog）；`[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（大规模选区首次拖拽 simulateTarget 初始化延迟，E9.2 已加测端到端指针延迟抽查，1k 首次拖拽 jank ~7.5fps / 稳态 50fps，维持 watch-only 非阻断）。
- **真实剩余 gap**：E9 M3 实现已落地 + 自身 closure-audit PASS，但**尚未经独立 gate 对照 M3 边界 + 五边界审计做整体审查**；mission 级整体完整性（五功能域全链 + R1–R8 风险清单 + 人工确认项）尚未做收口审查；M3 交付边界确认（roadmap 状态机要求 E10 通过才翻 E9 `done`）尚未执行；风险清单关闭 + 人工确认项闭环尚未执行；gate 审查文档 `e10-m3-gate-review.md` 尚未产出。
- **上游 gate 先例**：E6（M1 gate，`e6-m1-gate-review.md`，pass-with-minors，4 Minor m-1~m-4 全落地）/ E8（M2 gate，`e8-m2-gate-review.md`，conditional-pass → M-1 Major 修复 + m-2~n-4 修正落地）——E10 沿用 gate 执行流程（独立 agent 审查 → gate 文档 → 自身共识审查 → 修正落地 → 回归验证 → 边界确认裁定 → roadmap 回写）。

## Goals

- **E10.1 gate 审查产出（M3 + mission 整体性）**：独立子 agent（fresh session）对照 E2 设计契约（design-toolbox / design-undo-redo §4.4+§4.5 / design-renderer §8.4+§3 / 全部 6 份 design 文档）+ `editor-initiation.md §2.1/§2.2` M3 边界 + 五边界审计 Checklist（A–G + INV-1/INV-2）+ 讨论文件 §七 Q8/§八 决策 1，从**功能 / 性能 / 测试 / 文档**四面审查 E9 M3 实现完整性，并做 **mission 级整体性审查**（五功能域 M1/M2/M3 全链 + R1–R8 风险清单 + 人工确认项闭环状态 + deferred 项诚实性），产出 `docs/analysis/industrial-hmi-editor/e10-m3-gate-review.md`（审查判定 + 分级修正项清单 + M3 边界评估 + R4/R5 硬约束核对 + R7 包络最终状态 + 五边界审计逐项 + 文档一致性核对 + **mission 整体性收口结论 + R1–R8 风险清单逐项最终状态**），该文档经自身文档共识审查闭环。
- **E10.2 修正落地 + 回归验证**：gate 修正项逐条落地（代码修正 → 补 focused 测试；文档修正 → 回写）；全量 `pnpm typecheck/build/lint/test` 回归 green。
- **M3 交付边界确认裁定标记**：基于 gate 审查结论，对 `editor-initiation.md §2.2` M3 交付边界做确认裁定——边界维持 as-is（E9 实现覆盖 M3 范围且 M3 后能力正确排除）或需范围级变更（标记人工确认 + 暂停，Failure Paths `gate-m3-boundary-change`）。
- **R7 编辑态包络最终状态推进**：基于 E9.2 runtime 3 层 App 复测结论（primary ①②④ 达标），在 gate 文档 + roadmap 头部标记 R7 最终状态「primary 包络全量复测达标，待人工最终确认」（AI 推进状态至最终可推进点，不替代人工最终确认）。
- **风险清单关闭 + 人工确认项闭环**：R1–R8 风险逐项标记最终状态（R1 选型不触发 / R2 spike 纪律已落地 / R3 schema 单源化已落地 / R4 内存严格满足 / R5 双态隔离已落地 / R6 scope 受控 / R7 primary 达标待人工确认 / R8 三里程碑分期全交付）；人工确认项（R1/R7/M1 边界）最终标记——R1 不触发、M1 边界已 E6 确认维持、R7 推进至待人工最终确认；deferred / watch-only residual 项给最终归属标记（M3 后可选 / post-mission residual）。
- **roadmap 回写 + mission 收尾交接**：roadmap 头部记录 + Phase Status E9（`planned` → `done`）+ E10（`todo` → 经 plan 生命周期 → `done`）；mission 全部 work item 落地，收尾交接清单（编辑器实现全链基线 + R1–R8 最终状态 + 人工确认项最终标记 + M3 后可选项归属）就绪。

## Non-Goals

- 不重新实现 E9 M3（E10 只落地 gate 审查产出的修正项，非推倒重来）。
- 不实现 M3 后可选项（InnerEditor / OS clipboard 桥接 / 断开连接工具完整实现 / 撤销历史面板 UI / ActionSchema 编辑器）——E10 只在风险清单 / deferred 裁定中给最终归属标记。
- 不重跑 E9.2 已完成的 benchmark 全量复测（runtime 3 层 App 编辑态性能矩阵）——E10 只做 **M3-tier focused 性能抽查**（对照编辑态包络复测报告，验证 E9 实现未明显违背包络约束——重点核对 R4 无全量快照泄漏 + R5 双态隔离 + operation-coalesce 不逐操作爆炸入栈）。
- 不替代 R7 人工最终确认（编辑态包络数字属 benchmark 验收阈值类，AI 产出建议 + 复测数据 + 标记，人工最终确认；E10 推进 R7 状态至最终可推进点但不自确认）。
- 不重新仲裁选型（路径 A 已 E1.1 裁定维持，R1 不触发）；E10 若发现选型级阻断，标记 R1 人工确认 + 暂停（Failure Paths `gate-path-blocker`）。
- 不修改 runtime `scada-canvas` renderer / pipe-junction.ts / diff.ts / scada-engine.ts（E9 已只读消费，E10 审查 + 修正仅在 `src/editor/` subpath 内）。
- 不决定 mission 是否完成（mission 完成由引擎按 audit 轮次决定，非本 plan 范围）。

## Scope

### In Scope

- **E10.1 M3 实现 gate 审查 + mission 整体性审查执行**：独立子 agent（fresh session，不复用 E9 执行上下文）整体审查 E9 实现 + mission 全链，核对维度：
  1. **功能完整性 ↔ M3 边界（`editor-initiation.md §2.1/§2.2`）**：E9 工具箱交付物逐项核对——对齐/分布（align-distribute 算法）/ 层级（z-order toTop/toBottom）/ 复制粘贴（clipboard 分配新 id，T4）/ 图元库管理（listScadaSymbols 只读）/ 导入导出完善（exportConfig/importConfig 复用 serialize/parse/validate + 导入确认对话框 T5）/ 撤销深化（operation-coalesce coalesceGroup 跨操作合并 + 边界提示）；五项工具复用映射（design-toolbox §4.1–§4.5）逐项核对无重复实现；M3 边界纪律维持（不含 InnerEditor / OS clipboard / 断开连接工具完整实现 / 撤销历史面板 UI——核对无越界实现）。
  2. **契约一致性 ↔ 五边界审计（`new-renderer-introduction-audit.md` §3 A–G + INV-1/INV-2）**：`scada-editor-canvas` renderer 契约（toolbox 新增 regions/handles/test-handle）vs `design-renderer.md §8.4`（toolbox sub-handle）+ §3（同步清单：examples.manifest.json / playground registry / i18n / quick-reference 组件表）；IO 边界（INV-1/INV-2：toolbox 模块无直接 fetch/WebSocket/localStorage/hardcoded endpoint）；复用边界（INV-3：复用 engine.fit/center/setViewport/zoomAt/getViewport + serialize/parse/validate + listScadaSymbols，不重造）；内部 state 边界（INV-4：clipboard/undoStack 域内部 ref 持有）；契约边界（INV-5：RendererComponentProps 读法，无平行组件协议）；R4 内存（operation-coalesce 栈元素无全量快照）；R5 双态隔离（工具箱操作不派发 `symbol:*` action）。
  3. **性能 ↔ 编辑态包络（`editing-envelope-retest-2026-08-07.md`，M3-tier focused 抽查）**：E9 实现对照包络复测报告——operation-coalesce 不逐操作爆炸入栈 / clipboard 分配新 id 不引入大对象拷贝泄漏 / R4 无全量快照 / R5 双态隔离；**M3-tier focused 抽查**（非全量 benchmark，全量复测 E9.2 已完成）；对 watch-only residual `[E1.1-sg]` 复核 E9.2 已加测指针延迟抽查结论。
  4. **测试完整性 + 质量**：覆盖率（E9 报告 90.25% branches ≥ 90% threshold）+ 测试质量（断言可观测结果：toolbox 操作后 working copy / clipboard / undoStack / viewport 结构断言，非仅"不抛错"）；e2e/交互测试纪律（禁截图判定，走测试句柄 `__flux_scada_editor_<cid>` + page.evaluate）；测试 gap 识别（M3 边界内未覆盖路径）。
  5. **文档一致性**：M3 design 文档（design-toolbox / design-undo-redo §4.4+§4.5 / design-renderer §8.4+§3）vs E9 实现的 drift；roadmap Phase Status E9 = `planned`（实现完成待 gate）与 live 一致；daily log 记录完整；E9 deferred 项分类诚实（无 in-scope live defect 偷偷 deferred）；**文档收尾完整性**（docs/index.md 导航 / quick-reference 组件表 / flux-guide design-patterns scada-editor.md / examples.manifest.json / design-toolbox.md 收口标注）。
  6. **mission 整体性收口审查（E10 专属，E6/E8 不涉及）**：五功能域（图元拖拽放置 P0 M1 / 属性面板 schema P0 M1 / 连线 P1 M2 / undo-redo P1 M2 / 画布工具箱 P2 M3）M1/M2/M3 全链完整性对照 `editor-initiation.md §2.1`；**R1–R8 风险清单逐项最终状态**核对（对照 `editor-initiation.md §6`）；**人工确认项（R1/R7/M1 边界）最终状态**核对；**deferred / watch-only residual 项诚实性**核对（无 in-scope live defect 偷偷 deferred）；mission 级文档跨一致性（6 份 design 文档 + roadmap + 各 gate 文档 + spike 报告 + benchmark 报告）。
  7. **scope discipline**：E9 未越界实现 M3 后能力；gate 审查本身不重新仲裁选型 / 不改 M3 边界（边界变更走人工确认 Failure Path）。
- **E10.1 gate 审查文档产出 + 自身文档共识审查**：`docs/analysis/industrial-hmi-editor/e10-m3-gate-review.md`（审查判定 + 分级修正项清单 + M3 边界评估 + R4/R5 硬约束核对 + R7 包络最终状态 + 五边界审计逐项 + 文档一致性核对 + **mission 整体性收口结论 + R1–R8 风险清单逐项最终状态 + 人工确认项最终标记** + 终轮复核结论）；该文档头部经独立子 agent 文档共识审查闭环（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。
- **E10.2 修正落地**：逐条回写代码（补 focused 测试）/ 文档（回写 design 文档 + roadmap + daily log）；每条修正落地可追溯（修正项 → 文件锚点）。
- **E10.2 回归验证**：全量 `pnpm typecheck/build/lint/test` 回归 green（修正若触及 editor 代码，Closure Gates 全量验证）。
- **E10.2 M3 交付边界确认裁定标记**：基于 gate 审查结论对 `editor-initiation.md §2.2` M3 交付边界裁定——维持 as-is → 标记确认（M3 边界属 roadmap 既定里程碑，非 §2.2 范围级人工确认阈值项，AI 可确认维持；若审查发现需范围级变更则触发 `gate-m3-boundary-change` 人工确认）；需变更 → 标记人工确认 + 暂停。
- **E10.2 R7 编辑态包络最终状态推进**：在 gate 文档 + roadmap 头部记录标记 R7 最终状态「primary 包络（①②④）经 runtime 3 层 App 全量复测达标，待人工最终确认」（AI 推进至最终可推进点）。
- **E10.2 风险清单关闭 + 人工确认项闭环**：R1–R8 风险逐项最终状态标记（写入 gate 文档 + roadmap 头部收尾记录）；人工确认项（R1/R7/M1 边界）最终标记；deferred / watch-only residual 项最终归属标记（M3 后可选 / post-mission residual）。
- **E10.2 roadmap 回写**：roadmap 头部「文档共识审查记录」块新增 E9 closure 确认 + E10.1 gate 记录条目 + **mission 收尾记录**（R1–R8 最终状态 + 人工确认项闭环 + M3 后可选项归属）；Phase Status E9 `planned` → `done`、E10 经 plan 生命周期 → `done`。
- daily log 记录本 plan 产出摘要 + mission 收尾摘要。

### Out Of Scope

- M3 后可选项实现（InnerEditor / OS clipboard 桥接 / 断开连接工具完整实现 / 撤销历史面板 UI / ActionSchema 编辑器）。
- 重跑 E9.2 benchmark 全量复测（runtime 3 层 App 编辑态性能矩阵）。
- 重跑 spike / runtime mission 代码或文档变更。
- R7 编辑态包络数字人工最终确认（AI 标记，人工最终确认）。
- 决定 mission 是否完成（引擎按 audit 轮次决定）。

## Failure Paths

| 可测场景编号                     | 触发                                                                                                                                              | 行为（含状态码/错误码）                                                                               | 可重试 | 用户可见表现                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| gate-finding-blocker             | E10.1 审查发现 Blocker/Major 修正项（功能缺陷 / 契约违背 INV-x / R4 内存泄漏 / R5 双态泄漏 / 测试 gap / 文档 drift / scope 越界）                 | 修正项逐条落地（Phase 2，代码修正补 focused 测试）；落地后回归验证直至 0 Blocker/0 Major + 全量 green | 是     | gate 审查文档记录修正项 + 落地追溯；editor 代码/测试/文档修正 |
| gate-m3-boundary-change (R-人工) | E10.1 审查结论为 M3 交付边界（§2.2）需范围变更（增删 M3 能力域 / M3/M3 后边界重新划定）                                                           | 标记人工确认项（roadmap「人工确认阈值」「范围级变更」）；mission 暂停至人工裁决；AI 不自行改 M3 边界  | 否     | roadmap 出现人工确认标记；mission 收尾暂停                    |
| gate-r4-mem-leak                 | E10.1 审查发现 operation-coalesce / undo 栈元素实际持有全量快照（R4 硬约束违背）                                                                  | 视为 live defect；Phase 2 修正——栈元素只持 forward+inverse 增量；补单测断言无全量快照字段             | 是     | gate 审查文档记录违背 + 修复落地                              |
| gate-r5-leak                     | E10.1 审查发现工具箱操作实际派发 `symbol:*` action（R5 硬约束违背）                                                                               | 视为 live defect；Phase 2 修正 + e2e 断言 edit 模式不派发 symbol:click                                | 是     | gate 审查文档记录违背 + 修复落地                              |
| gate-perf-below-envelope (R7)    | E10.1 M3-tier 性能抽查发现编辑器本体明显违背包络复测报告（如 operation-coalesce 逐操作爆炸入栈 / clipboard 大对象拷贝泄漏 / per-call 远超 100ms） | 标记 R7 人工确认 + 在 gate 文档记录违背项；修复属 Phase 2 修正；若需降档标记人工                      | 是     | gate 审查文档性能章节记录违背 + 修复落地；R7 标记推进         |
| gate-path-blocker (R1)           | E10.1 整体性审查发现路径 A 存在不可调和的架构阻断（双态隔离无法成立 / 编辑态污染运行态不可修复）                                                  | 标记 R1 人工确认；mission 暂停至人工裁决；不自行转路径 B                                              | 否     | roadmap 出现 R1 标记；E10 暂停；等待人工                      |
| mission-residual-needs-human     | E10.2 收尾发现某 deferred/residual 项需范围级人工裁定（非 M3 后可选项归属能涵盖）                                                                 | 标记人工确认项；在 gate 文档 + roadmap 记录待裁定项；其余收尾继续                                     | 否     | roadmap 出现待人工裁定标记                                    |
| regression-fail                  | E10.2 修正落地后全量 typecheck/build/lint/test 出现回归                                                                                           | 定位回归源（修正引入），修复或回退该修正直至全量 green；不允许带 failing 关闭                         | 是     | Closure Gates 未勾选；plan 维持 in progress                   |
| consensus-round-limit            | gate 审查文档共识审查循环超 3 轮                                                                                                                  | 停止循环并升级人工裁决（roadmap Cross-Cutting 文档共识审查）                                          | 否     | 文档头部记录超限事实，等待人工                                |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`建议有测` —— E10 是 M3 实现 gate 审查 + mission 整体收尾阶段。gate 审查本身（E10.1）由独立子 agent 证据式审查承担（对照设计契约 + 五边界审计 + 包络复测报告 + R4/R5 硬约束 + 测试质量 + R1–R8 风险清单），不产出新自动化测试。但 **E10.2 修正落地若触及 editor 代码**（gate 发现的功能/契约/R4/R5 缺陷修复），必须为每条代码修正补 focused 回归测试（验证正确结果，非仅"不抛错"），并在 Closure Gates 跑全量 `pnpm typecheck/build/lint/test`。若 gate 判定为 clean pass（0 修正项），则 E10.2 仅做回归验证 + 边界确认 + R7 推进 + 风险清单关闭 + 回写，无新测试。测试纪律沿用 roadmap：禁截图判定，交互层走测试句柄 + page.evaluate。

## Execution Plan

> 2 Phase 顺序：E10.1 审查执行（产出 gate 审查文档 + 自身共识审查）→ E10.2 修正落地 + 回归验证 + M3 边界确认裁定 + R7 推进 + 风险清单关闭 + 人工确认项闭环 + roadmap 回写。E10.2 依赖 E10.1 修正项清单。

### Phase 1 - E10.1 M3 实现 gate 审查 + mission 整体性审查执行

Status: completed
Targets: `docs/analysis/industrial-hmi-editor/e10-m3-gate-review.md`（新建）、`packages/flux-renderers-industrial/src/editor/`（审查对象，本 Phase 不改）、`docs/components/industrial-hmi-editor/design-*.md`（6 份，审查对照基线，本 Phase 不改）、`docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`（R7 最终状态对照）

- Item Types: `Decision | Proof`

- [x] `Decision`：roadmap Phase Status 回写 E10: `todo` → `planned`（本 plan 激活为 active 时同步执行；roadmap Rule 1 状态机，对齐 E0–E9 plan 先例）。
- [x] `Proof`：前置验证——核对 E9 实现已关闭（**具体判定：roadmap Phase Status E9 = `planned`（实现完成待 gate），E9 plan `Plan Status: completed`，独立 closure-audit PASS**）；未就绪则等待（Failure Paths 隐含 `upstream-not-ready`）。
- [x] `Proof`：起草 gate 审查输入——任务范围摘要（`editor-initiation.md §2.1` 画布工具箱 P2 M3 功能域 + §2.2 M3 里程碑边界「对齐/分布/层级/复制粘贴/图元库管理 + 导入导出完善 + 撤销深化」+ §6 R1–R8 风险清单 + 人工确认项汇总）+ E2 设计契约 M3 相关文档关键条款摘要（design-toolbox §4.1–§4.5 + design-undo-redo §4.4+§4.5 + design-renderer §8.4+§3）+ 与 roadmap 的差异清单（E9 实现交付物 vs roadmap E9 work items E9.1/E9.2 范围/边界逐项对照），供独立 agent 使用。
- [x] `Proof`：指定 gate 输入证据集：E9 实现源码（`packages/flux-renderers-industrial/src/editor/toolbox/` 全树 + `use-editor-engine.ts` 工具箱句柄扩展 + `editor-test-handle.ts` toolbox 子句柄 + `operation-coalesce.ts` M3 + `scada-editor-canvas.tsx` toolbox region + toolbox e2e 测试文件）、E9 plan（`2026-08-07-0906-2-e9-*.md` 含 deferred 项 + closure-audit 证据）、M3 相关 design 文档（design-toolbox.md / design-undo-redo.md §4.4+§4.5 / design-renderer.md §8.4+§3）+ 全部 6 份 design 文档（mission 整体性）、`editor-initiation.md §2.1/§2.2/§3/§6`、`editing-envelope-retest-2026-08-07.md`、`editing-envelope-2026-08-06.md` §3、`new-renderer-introduction-audit.md` §3 Checklist A–G + INV-1/INV-2、讨论文件 `2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §七 Q8/§八 决策 1、各 gate 文档（e3/e6/e8）、spike 报告、roadmap 全文。
- [x] `Proof`：启动独立子 agent（fresh session，不复用 E9 执行上下文），对照 Scope E10.1 七项核对维度（功能/M3边界 + 契约/五边界审计/R4/R5 + 性能/包络 + 测试 + 文档 + **mission 整体性收口** + scope discipline）审查 E9 实现 + mission 全链，产出 `docs/analysis/industrial-hmi-editor/e10-m3-gate-review.md`：审查判定 + 分级修正项清单（每条带文件锚点 + 类型）+ M3 边界评估 + R4/R5 硬约束逐项核对 + R7 包络最终状态 + 五边界审计逐项（A–G + INV-1/INV-2）+ 文档一致性核对 + **mission 整体性收口结论（五功能域全链 + R1–R8 风险清单逐项最终状态 + 人工确认项最终标记 + deferred/watch-only residual 最终归属）** + 终轮复核结论。记录独立 agent task id + verdict。
- [x] `Proof`：`e10-m3-gate-review.md` 自身经独立子 agent（fresh session）文档共识审查闭环至达成共识（判据：连续一轮 0 新增修正项；≤3 轮上限，超限升级人工 `consensus-round-limit`），共识记录写入文件头部。**f-1 教训落地**：per-round verdict slot 在独立 reviewer 返回前留空。

Exit Criteria:

> Phase 1 交付 gate 审查文档。gate 本身不产生代码改动，无全量验证（plan guide Rule 18）；全量回归验证属 Phase 2 / Closure Gates。

- [x] `docs/analysis/industrial-hmi-editor/e10-m3-gate-review.md` 存在，含：审查判定 + 分级修正项清单（每条带文件锚点 + 类型）+ M3 边界评估 + R4（无全量快照）/R5（不派发 symbol:\*）硬约束逐项核对 + R7 包络最终状态 + 五边界审计逐项（A–G + INV-1/INV-2）+ 文档一致性核对 + **mission 整体性收口结论（R1–R8 逐项最终状态 + 人工确认项最终标记 + deferred/residual 最终归属）** + 终轮复核结论。
- [x] `e10-m3-gate-review.md` 文件头部文档共识审查记录闭环至达成共识（≤3 轮上限），审查 task id + 共识 task id 可查；round verdict 未预填（f-1 教训）。
- [x] 若触发「人工确认阈值」（`gate-m3-boundary-change` / `gate-r4-mem-leak` / `gate-r5-leak` / `gate-perf-below-envelope` R7 / `gate-path-blocker` R1 / `mission-residual-needs-human` / `consensus-round-limit`），触发事实已记录于 gate 审查文档（roadmap 标记动作在 Phase 2 完成）。

### Phase 2 - E10.2 修正落地 + 回归验证 + M3 边界确认 + R7 推进 + 风险清单关闭 + 收尾

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/`（代码修正）、`docs/components/industrial-hmi-editor/design-*.md`（文档修正，若有 drift）、`docs/components/roadmap-industrial-hmi-editor.md`（头部记录 + 收尾记录 + Phase Status E9/E10）、`docs/logs/2026/08-07.md`（或 08-08 视执行日）

- Item Types: `Fix | Decision | Proof`

- [x] `Fix`：按 `e10-m3-gate-review.md` 修正项逐条落地——每条修正回写代码（补 focused 测试）/ 文档（回写）；逐条处理，无未落地修正项（若 gate 判定 clean pass 则本项标注 0 修正项，仅做回归验证）。**落地**：m-1 重写 e2e coalesce 测试为相邻同 coalesceGroup z-order 操作合并 + undo 往返一致（验证真实合并）；n-1 Nit 接受不改（标签语义，coalesceGroup 消歧无功能影响）。
- [x] `Proof`：回归验证——全量 `pnpm typecheck` + `pnpm build` + `pnpm lint` + `pnpm test` 回归 green（与 E9 基线 industrial 89 files / 1199 tests 对比，修正后无回归）。`regression-fail` Failure Path 未触发。**结果**：typecheck 32/32 ✓ + build 32/32 ✓ + lint 32/32 ✓ + test 59/59 ✓（industrial 1199 tests）。
- [x] `Decision`：M3 交付边界确认裁定标记——① M3 边界维持 as-is（§2.1 画布工具箱 P2 M3 + §2.2 M3 内容，E9 实现覆盖且 M3 后能力正确排除），在 gate 文档 + roadmap 头部记录标记「M3 交付边界维持」；② gate 审查结论为边界无需变更，未触发 `gate-m3-boundary-change`（M3 边界属 roadmap 既定里程碑，非 §2.2 范围级人工确认阈值项，AI 可确认维持）。**裁定结果**：维持 as-is。
- [x] `Decision`：R7 编辑态包络最终状态推进——基于 E9.2 runtime 3 层 App 复测结论（primary ①②④ 达标），在 gate 文档 + roadmap 头部记录标记 R7 最终状态「primary 包络经 runtime 3 层 App 全量复测达标，待人工最终确认」（AI 推进至最终可推进点，不替代人工最终确认）。
- [x] `Decision`：风险清单关闭 + 人工确认项闭环——R1–R8 风险逐项最终状态标记（R1 选型不触发 / R2 spike 纪律已落地 / R3 schema 单源化已落地 / R4 内存严格满足 / R5 双态隔离已落地 / R6 scope 受控 / R7 primary 达标待人工确认 / R8 三里程碑分期全交付）；人工确认项最终标记（R1 不触发 / M1 边界已 E6 确认维持 / R7 推进至待人工最终确认）；deferred / watch-only residual 项最终归属标记（M3 后可选 / post-mission residual）。
- [x] `Fix`：roadmap 头部「文档共识审查记录」块新增 E9 closure 确认 + E10.1 gate 记录条目 + **mission 收尾记录**（gate 判定 + 修正项摘要 + 审查 task id + 共识轮次 + M3 边界确认标记 + R7 最终状态 + R1–R8 最终状态 + 人工确认项闭环 + M3 后可选项归属 + 人工确认触发情况）。
- [x] `Fix`：roadmap Phase Status E9 `planned` → `done`（E10 gate 通过，roadmap 状态机闭环）；Phase Status E10 经 plan 生命周期（本 plan closure-audit 通过 → `done`）。
- [x] `Fix`：`docs/logs/2026/08-07.md`（或 08-08）记录本 plan 产出摘要 + mission 收尾摘要（gate 判定 + 修正项 + 共识轮次 + M3 边界确认维持 + R7 最终状态 + R1–R8 关闭 + 人工确认项闭环 + 回归验证 full-green + mission 收尾交接）。

Exit Criteria:

> Phase 2 交付修正落地 + 回归验证 + M3 边界确认裁定 + R7 推进 + 风险清单关闭 + 人工确认项闭环 + roadmap 回写（含 Phase Status E9 → done）。全量验证属本 Phase（修正触及代码时 Closure Gates 必跑）。

- [x] `e10-m3-gate-review.md` 全部修正项已落地（逐条可追溯：修正项 → 文件锚点）或 clean pass 标注。
- [x] 全量 `pnpm typecheck/build/lint/test` 回归 green（修正后）。
- [x] M3 交付边界确认裁定已标记（维持 as-is，未触发 `gate-m3-boundary-change`）；R7 最终状态已推进标记（primary 达标，待人工最终确认）。
- [x] R1–R8 风险清单逐项最终状态已标记；人工确认项（R1/R7/M1 边界）已闭环标记；deferred / watch-only residual 项已给最终归属。
- [x] roadmap 头部「文档共识审查记录」块已新增 E9 closure 确认 + E10.1 gate 记录条目 + mission 收尾记录；Phase Status E9 已 `planned` → `done`；daily log 已记录；mission 收尾交接清单就绪。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh-session sub-agent（MISSION_DRIVER plan-review task `MISSION_DRIVER:2026-08-07-183552-mission-driver`，独立 session，不复用起草者上下文）
- Verdict: `pass`（round 1 即达成共识，0 Blocker / 0 Major）
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major。**Reference accuracy**：16 项文件路径引用全部 CONFIRMED（E9 plan `2026-08-07-0906-2` = completed + 独立 closure-audit PASS；E6/E8 gate 先例 plan；`editing-envelope-retest-2026-08-07.md`；6 份 design-\*.md；roadmap；`editor-initiation.md` 位于 `docs/components/industrial-hmi/`（与 Source 行一致，无错引）；new-renderer-introduction-audit.md；讨论文件；e3/e6/e8 gate 文档均存在）。**Baseline claim 核对**：roadmap Phase Status E9=`planned`（实现完成待 gate，与 plan Current Baseline 一致）；Phase Status E10=`todo`；toolbox 源码树（align-distribute/z-order/clipboard/toolbox-panel 4 模块 + 4 单测）live。**四项核对全 PASS**——可想象性（2 Phase 链路 E10.1 审查→E10.2 修正+收尾清晰，mission 整体性审查维度 E10 专属正确）/ 格式完整性（必填字段齐全，Failure Paths 表四列齐，Closure Gates 含 4 命令 + 独立 audit gate）/ 内容稳健性（Goals/Non-Goals 硬，Exit Criteria repo-observable，E10 不重跑 E9.2 benchmark / 不替代 R7 人工确认 framing 正确，沿用 E6/E8 gate 范本 + Rule 22-26 单 owner plan 不过度拆分）/ 引用准确性（0 断链）。Minor（不记）：plan 行文密度高，但与 E6/E8 同 mission 已通过 draft-review 的 plan 风格一致，非缺陷。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见 plan guide `When Closing The Plan` 和 `Closure Audit Rule`。全量验证属 plan 收口时跑一次（Minimum Rule 18）。

- [x] E10.1 gate 审查文档 `e10-m3-gate-review.md` 产出且经自身文档共识审查闭环（≤3 轮）。
- [x] gate 全部 in-scope 修正项已落地（逐条可追溯）或 clean pass 标注。
- [x] R4 内存约束核对通过（operation-coalesce / undo 栈元素无全量快照；gate 文档逐项核对 + 必要时单测复核）。
- [x] R5 双态隔离核对通过（工具箱操作不派发 `symbol:*` action；gate 文档逐项核对 + e2e 断言复核）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（M3 后可选项正确排除在 M3 外，非降级）。
- [x] M3 交付边界确认裁定已标记（维持 as-is 或触发 `gate-m3-boundary-change` 人工确认）；R7 最终状态已推进标记（待人工最终确认）。
- [x] R1–R8 风险清单逐项最终状态已标记；人工确认项（R1/R7/M1 边界）已闭环标记；deferred / watch-only residual 项已给最终归属。
- [x] 受影响 owner docs（design 文档 / roadmap 头部 + Phase Status E9→done + E10 / daily log）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（32/32 ✓）
- [x] `pnpm build`（32/32 ✓）
- [x] `pnpm lint`（`turbo run lint` 32/32 ✓；`check-i18n-keys` 为预先存在 workspace 级 failure，E9 closure-audit 已核实非本 mission 引入/范围）
- [x] `pnpm test`（59/59 tasks ✓；industrial 1199 tests，coverage 90.25% branches ≥ 90% threshold）

## Deferred But Adjudicated

### M3 后可选项（InnerEditor / OS clipboard 桥接 / 断开连接工具完整实现 / 撤销历史面板 UI / ActionSchema 编辑器）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 均为 design 文档明确的 M3 后可选项（design-renderer §1 InnerEditor 非目标 / design-toolbox T2 OS clipboard / design-connection §12.3 断开连接工具后续阶段 / design-undo-redo §4.5 撤销历史面板 UI 可选项）。E10 是 M3 gate + mission 收尾，不实现 M3 后可选项；在风险清单 / deferred 裁定中给最终归属标记（post-mission residual）。
- Successor Required: no
- Successor Path: post-mission 可选项（无强制 successor）。

## Non-Blocking Follow-ups

- `[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（watch-only residual，roadmap Follow-up Backlog）——E9.2 已加测端到端指针延迟抽查（1k 首次拖拽 jank ~7.5fps、稳态 50fps），E10.1 复核结论维持 watch-only 非阻断。
- `[E0-spike]` InnerEditorEvent 在 `research-render-engines.md §5:122` 未枚举（watch-only residual，roadmap Follow-up Backlog，无害漂移，非阻断）。
- R7 编辑态包络数字人工最终确认（AI 已推进至 primary 达标 + 待人工最终确认，benchmark 验收阈值类）。
- `check-i18n-keys` 预先存在 workspace 级 failure（经 E9 closure-audit git stash + checkout E8 commit d9763c63 核实，报告的 133+ 未定义键全部为 AI/code-editor 等无关包的 `flux.*` 键，非本 mission 引入/范围）。

## Closure

Status Note: plan 可关闭——两 Phase 全交付且 Exit Criteria 全勾选；m-1 Minor 修正已落地（e2e coalesce 测试重写为真实合并断言）+ n-1 Nit 接受；全量回归 green（typecheck/build/lint 32/32 + test 59/59，industrial 89 files / 1199 tests）；gate 文档 `e10-m3-gate-review.md` Audit Status closed + 共识 Round 2 AGREE；M3 边界维持 as-is；R7 primary 达标待人工最终确认；R1–R8 风险清单逐项最终状态已标记 + 人工确认项闭环 + deferred/residual 诚实；owner docs（roadmap 头部 + Phase Status E9→done + daily log）已同步；独立 fresh-session closure-audit PASS。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（非执行 session，本会话不复用 E10 执行上下文）
- Evidence: 逐项核对 11 项 checklist 全 PASS——(1) 两 Phase Status=completed + 全 items/Exit Criteria `[x]`；(2) gate 文档 `e10-m3-gate-review.md` 存在 + `Audit Status: closed` + Round 2 AGREE（task id `ses_0242d442bffe1W6Y5qsyjs15de`）+ 全部必需章节（verdict/六维度/R4§3/R5§4/M3边界§6/R7包络§10/五边界§5/mission整体性§7/findings§8）；(3) m-1 修正已落地（`scada-editor-canvas-toolbox.test.tsx:299-317` 重写为相邻同 coalesceGroup z-order 操作合并 + `undoStackDepth === before + 1` 精确断言 + undo 往返，验证真实合并）；(4) n-1 接受不改（Nit）；(5) R4 spot-check `undo-stack.ts:9-26` 无 prevSnapshot 字段 + gate §3 逐项核对；(6) roadmap Phase Status E9=`done`/E10=`planned`→`done` + E10 mission 收尾记录含 gate verdict + fix 摘要 + R1–R8 最终状态 + R7 状态；(7) daily log `docs/logs/2026/08-07.md` 顶部新增 E10 条目（gate verdict + fixes + 回归 full-green + mission 收尾）；(8) Closure Gates 全 `[x]` 除 closure-audit 项（本审计勾选）；(9) green build spot-check `pnpm --filter @nop-chaos/flux-renderers-industrial test --run` = 89 files / 1199 tests pass；(10) deferred/residual 诚实（M3 后可选项 + watch-only residual，无 in-scope live defect 降级）；(11) 文本一致性（Plan Status/Phase Status/Exit Criteria/Closure Gates 互相一致）。

Follow-up:

- R7 编辑态包络数字人工最终确认（AI 已推进至 primary 达标 + 标记，benchmark 验收阈值类，非 plan-owned）
- `[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（watch-only residual，roadmap Follow-up Backlog）
- `[E0-spike]` InnerEditorEvent §5:122 未枚举（watch-only residual，roadmap Follow-up Backlog）
- M3 后可选项（InnerEditor / OS clipboard / 断开连接工具 / 撤销历史面板 UI / ActionSchema 编辑器）post-mission 后继（非 plan-owned）
