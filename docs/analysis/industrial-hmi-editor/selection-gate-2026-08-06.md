# Editor Mission E1.1 选型 gate 裁定

> 日期：2026-08-06
> 阶段：E1.1 选型 gate（独立 review，fresh session）
> 来源 plan：docs/plans/2026-08-06-1931-1-e1-selection-gate-and-editing-envelope.md（Phase 1）
> 输入：spike 报告 + editor-initiation.md §4/§4.3/§6 R1 + roadmap Cross-Cutting + 本 plan
> 审查 agent：独立 fresh-session sub-agent（不复用 plan 执行上下文）

## 文档共识审查记录（本文件）

> 本文件作为 E1 产物之一，在 E1.3 Phase 经独立 fresh-session sub-agent 执行文档共识审查 Round 1（≤3 轮）。

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_0291740fbffeAbZiLlKe5S9KA0`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit。逐项核对：① citation fidelity（spike §3.3 fps 矩阵 / §3.4 per-call / §3.5 三档候选 / `benchmark-report.md §3.1` 373ms + §3.2 ≥45fps / 1.56× + 1.6× + 7% + 10% 余量算术）全部对照 PRIMARY 源核实准确；② veto-condition framing（精确两项 + E0.3 R7-only）与 `editor-initiation.md §4.3 line 95` 一致；③ R7 framing 诚实（裁定建议 + 待人工确认，非自确认）；④ 内部一致性（§5 9 约束表 ↔ §2 narrative ↔ spike line 321-329）；⑤ 跨文档一致性（本文件 §7 ↔ editing-envelope §6）；⑥ scope discipline（产出 E2 输入，不漂移至 E2 设计）；⑦ calibration honesty（定性类比 + E6/E9.2 数值化确认显式留）。**Round 1 达成共识（连续一轮 0 新增修正项，未超 3 轮上限）**。本文件可作为 E2 阶段的权威输入。

## 1. 审查范围与输入

本裁定由独立 fresh-session sub-agent 执行，不复用 plan 起草/执行上下文。逐项核对所读输入（全部完整阅读）：

1. `docs/plans/2026-08-06-1931-1-e1-selection-gate-and-editing-envelope.md` —— 授权本 review 的 plan（Phase 1 line 81-98，含 `Proof` item 6 项核对清单 line 89 + Failure Paths line 68-73）。
2. `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md` —— E0 spike 报告（**PRIMARY 事实依据**，全文 368 行）。
3. `docs/components/industrial-hmi/editor-initiation.md` —— §4 选型考量 / §4.3 选型裁定（否决条件精确两项 line 95）/ §6 R1（line 124，选型变更人工确认）。
4. `docs/components/roadmap-industrial-hmi-editor.md` —— Cross-Cutting（文档共识审查 line 255-260 / review gate 执行纪律 line 261 / 人工确认阈值 line 279 / spike 先行纪律 line 280）+ 头部共识审查日志（line 12-19，spike 三轮 AGREE + closure-audit PASS）。

**否决条件口径锁定**（editor-initiation.md §4.3 line 95 + roadmap Cross-Cutting「人工确认阈值」+ 执行必读 #1 + spike 报告 §3.6/§3.7 + plan Failure Paths line 69-71 七处一致）：路径 A → 路径 B 反转的否决条件**精确两项**——(a) 手势仲裁不成立；(b) Editor 插件 API 漂移成本 ≥ 自研交互原语成本。**E0.3 性能不是否决条件**——仅触发 R7（编辑态包络数字人工确认），不触发 R1（选型变更）。任何将性能作为选型反转触发项的裁定均为口径错误。

## 2. 逐项审查（6 项核对）

### 2.1 E0.1 手势仲裁事实判定

**核对点**：深探针 P1 的「Editor 完整接管拖拽」结论是否基于真实测量（真实 pointerdown→pointerup + 70×60px rect 位移 + 9 editor.move 帧 + viewport 不变），而非 mock 推断；spike-mock-leak 教训的初测误判自纠正是否到位。

**证据核对**（spike 报告）：

- **初测误判事实**（§1.1 line 26-30 + §1.2 line 42-49）：初测 5 场景中 S2（API select + 拖拽）/ S4（框选）/ S5（双向切换）判定为 FAIL/CONFLICT/PARTIAL，**显式标注「误判」**。§1.2 根因诊断：demo 配置不完整——Rect 缺 `editable:true` + 用 `editor.select(rect)` API 替代真实点击。这正是 spike plan Failure Path `spike-mock-leak` 的真实复现。
- **深探针 P1 真实测量**（§1.1 line 34 + §1.3 line 53-60）：配置 = `tree:viewport + move:drag:'auto' + editor + editable:true + 真实点击`。证据链四条均为真实测量产物：① rect 位移 70×60px（150,140 → 220,200，即 rect.x:100→170 / rect.y:100→160）；② **事件流真实抽取** `editor.select → tree.pointer.down → tree.pointer.up（首次点击）→ tree.pointer.down → editor.move × 9 帧 → tree.pointer.up（拖拽期）`；③ viewport 同步正确（拖拽期 app.tree.x/y 不变，rect.x/y 改变）；④ 深探针 P3 对照组去掉 `move:drag:'auto'` 后 Editor 同样工作 → `move:drag:'auto'` 非手势仲裁阻断因素。
- **变体测试排除**（§1.1 line 31-33）：变体 A/B/C（runtime default / `move:drag:false` / 无 move 配置 + API select）均 FAIL——证明「API select + 缺 editable:true」是初测误判根因，深度探针纠正后主路径成立。

**自纠正质量评估**：spike 报告未掩盖初测误判——§1.1 矩阵显式标注「误判」、§1.2 单列「spike-mock-leak 教训触发」章节、§1.3 证据链基于深探针 P1（非初测）。spike-mock-leak 教训的落地（§1.5 15 项真实 API 锚点表 + 真实 leafer-ui@2.2.9 dist 验证）符合 roadmap Cross-Cutting「spike 先行纪律」+ editor-initiation.md §4.3「禁止以 mock 行为推断真实 API」。

**verdict**：✅ **事实成立**。深探针 P1 的手势仲裁成立性基于真实测量（真实点击 + rect 位移 + 9 editor.move 帧 + viewport 零污染），非 mock 推断。初测 S2/S4/S5 误判经深度探针自纠正，spike-mock-leak 教训真实复现并规避。**否决条件 (a) 不触发**。

### 2.2 E0.2 事件族 0 漂移 + 适配层 cost

**核对点**：六大 Editor 事件族类名是否与 `research-render-engines.md §5:122` 一致；载荷是否真实抽取（非推断）；适配层 cost 估计（小～中）是否合理；InnerEditorEvent §5:122 列举遗漏是否确为无害漂移。

**证据核对**（spike 报告）：

- **六大事件族类名 0 漂移**（§2.4 line 217-223）：EditorEvent / EditorGroupEvent / EditorMoveEvent / EditorScaleEvent / EditorRotateEvent / EditorSkewEvent 与 §5:122 完全一致。✅
- **载荷真实抽取**（§2.1 line 113-128 + §2.2 line 130-207）：六大事件族均经**真实 Playwright 手势触发**（点击/拖拽图元本体或 EditBox 控制点 / shift 多选 / 双击 / group API），`page.evaluate` 抽取序列化纯 JSON 载荷（剥除 Leaf 循环引用）。每族含真实 JSON 样本 + 字段语义注释（基于 `leafer-in/packages/editor/src/event/*.ts` 真实类定义）。具体：
  - ① EditorMoveEvent：`{type, moveX, moveY, target}`（8 帧）
  - ② EditorScaleEvent：`{type, scaleX, scaleY, target, worldOrigin, ...}`（10 帧；实测默认 `editSize:'size'` 改写 width/height 而非 scaleX）
  - ③ EditorRotateEvent：`{type, rotation, target, worldOrigin}`（10 帧；`rotateGap:45` 吸附）
  - ④ EditorSkewEvent：`{type, skewX, skewY, target, worldOrigin}`（10 帧；触发 = ctrl+resize-line）
  - ⑤ EditorGroupEvent：group/ungroup/open_group/close_group 各 before+主事件（`editTarget`）
  - ⑥ InnerEditorEvent：innerEditor.before_open/open/before_close/close（`editTarget` + `innerEditorTag`）
- **InnerEditorEvent §5:122 列举遗漏**（§2.4 line 220）：⚠️ 无害漂移——InnerEditorEvent 存在于 `leafer-in/packages/editor/src/event/` 并由 `@leafer-in/editor` 导出，§5:122 列名遗漏。**不影响适配层**（spike 已真实抽取载荷），已登记 Follow-up Backlog（roadmap line 291）建议补文档。符合 plan Non-Blocking Follow-ups（line 180）。
- **适配层 cost 估计**（§2.5 line 226-238）：关键约束 = leafer Editor 事件携带循环/非序列化 Leaf 引用（target/editor/value/drag 均为 Leaf 实例）→ **不能直传** `createNormalizedActionEvent`（对齐 `packages/flux-react/src/renderer-helpers.ts:98` 单参数签名）。cost 分摊：① transform 事件族（move/scale/rotate/skew，高频每帧）= 字段抽取 + nodeId 映射 + undo-redo 节流（起止帧，E2.4 落点），cost **小**；② editor.select/hover = 直接映射 `{type, listNodeIds}`，cost **极小**；③ group/ungroup = 结构 diff（addSymbol/removeSymbol，非属性增量）+ nodeId 重映射，cost **中**；④ open_group/close_group/innerEditor.\* = 直接映射（低频），cost **极小**。**总 cost = 小～中**，主要工作量在 transform 节流 + group/ungroup 结构 diff。无事件「永不派发」风险（gate-3 M-1 教训规避：载荷读取面已逐族真实抽取）。

**verdict**：✅ **事实成立**。六大事件族类名 0 漂移 + 载荷真实抽取（非推断）；适配层 cost（小～中）估计合理且有真实证据支撑；InnerEditorEvent §5:122 遗漏确为无害漂移（已登记 Follow-up，不影响选型）。**否决条件 (b) 不触发**——API 漂移成本（仅 1 项 `editor.list=[]` getter-only，§1.5 #4，已用 `editor.cancel()` 规避）远 < 自研交互原语成本（全量重建拖拽/多选/手柄/参考线/对齐，editor-initiation.md §4.2 路径 B「工程量最大头」）。

### 2.3 E0.3 性能候选达标 + 主路径中立

**核对点**：最低性能候选（32.2fps）是否 ≥ 30fps 候选阈值；性能是否确实不影响选型主路径（仅触发 R7，不触发 R1）。

**证据核对**（spike 报告）：

- **候选达标**（§3.3 line 270-275 + §3.5 line 290-295）：方案 A（leafer Editor 内置覆盖物）在 10k 选区（最极端）moveFps = **32.2fps** ≥ 30fps 候选阈值；方案 B = 36.4fps。三档候选（保守 ≥30fps@≤10k / 中性 ≥30fps@≤1k / 激进 ≥45fps@≤1k）均有实测支撑。内存 final 102.8MB 远低于运行态 320MB 红线（§3.2 line 264）。
- **主路径中立 framing**（spike 报告 n-4 修正后选型路径建议开篇 line 319）：「主路径否决条件（手势仲裁不成立 / 事件族漂移成本≥自研成本）均不触发，编辑态性能候选达标（**R7 包络数字待 E1.2 确立，不影响选型主路径**）」。此 framing 经 spike 共识审查 Round 2（n-4 修正）+ Round 3（AGREE）确认，与 plan line 14/19 + Failure Paths line 69-71 + editor-initiation.md §4.3 line 95 + roadmap line 33/100/195 七处跨文档一致。
- **R1/R7 标记**（§3.7 line 307-308）：R1（选型变更）**不触发**（性能不否决主路径）；R7（编辑态包络数字）**不在 E0 触发**（候选实测达标，最终包络经 E1.2 + R7 人工确认确立）。spike-perf-fail Failure Path 不触发（无 <30fps 场景）。

**verdict**：✅ **事实成立 + 主路径中立**。性能候选最低 32.2fps ≥ 30fps 阈值；性能精确 framed 为 R7-only（不影响选型主路径），否决条件口径无污染。**R1 不因性能触发；R7 留待 E1.2 确立。**

### 2.4 9 条关键设计约束作为 E2 输入

逐条核对 spike 报告「选型路径建议」9 条约束（line 321-329）是否有真实 spike 证据支撑 + 可作为 E2.1 架构输入。详见 §5 9 条约束确认/修正清单表。

**核对结论**：9 条约束全部 grounded in real spike evidence（§1.2/§1.3/§1.4/§1.5/§2.2/§2.3/§2.5/§3.3/§3.6），可作为 E2.1 架构 / E2.4 undo-redo / E2.6 renderer 契约 / E4.2 依赖引入的权威输入。**全部确认 as-is，无需修正**。

### 2.5 覆盖物挂载形态方案 A 采纳

**核对点**：方案 A（leafer Editor 内置覆盖物）推荐是否合理——典型工业编辑选区（≤几百）两方案持平；方案 A 性能劣势仅在极端 10k 选区显现（4fps 差距）；方案 A 开箱提供完整交互原语；方案 B 作 fallback 路径 B 保留。

**证据核对**（spike 报告）：

- **性能对比**（§3.3 line 270-275）：≤1k 选区两方案持平（~50fps，远超 30fps 候选）；10k 选区方案 B 略优（+4.2fps，36.4 vs 32.2），方案 A 的 simulateTarget 跨 1 万元素重算 + editBox 维护成本显现，但两方案均 ≥30fps 候选。
- **方案 A 推荐理由**（§3.6 line 299-303）：① 实际工业组态编辑选区远小于 10k（典型 ≤几百），两方案持平，方案 A 性能「劣势」仅在极端 10k 显现且差距小（4fps）；② 方案 A 开箱提供完整交互原语（8 向 resize + 旋转 + 斜切 + 成组 + 框选 + InnerEditor），E0.1 已证手势仲裁成立、E0.2 已证事件族载荷适配 cost 极小——自研方案 B 需重建全部原语（editor-initiation.md §4.2 路径 B「工程量最大头」）；③ 方案 B 作否决条件触发时的 fallback 路径 B 保留，性能数据证明 fallback 可行（10k 选区仍 ≥30fps）。
- **测量口径**（§3.1 line 255）：fps 经内部 rAF 驱动（page.evaluate 循环调用 editor.move），规避 Playwright page.mouse IPC 对 wall-clock 污染，方案 A/B 同口径。此为 declared measurement scope（见 §6 watch-only residual）。

**verdict**：✅ **采纳合理**。方案 A 在典型工业编辑选区（≤几百）与方案 B 持平且开箱提供完整交互原语；性能劣势（4fps）仅在极端 10k 选区显现且不破阈值；方案 B 作 fallback 路径 B 保留（性能可行）。**方案 A 采纳**。

### 2.6 未发现的事实性错误扫描

**核对点**：独立扫描 spike 报告是否存在未发现的事实性错误足以反转选型（路径 A → 路径 B）。

**扫描结果**（逐项排查）：

- §1.5 #4 `editor.list = []` getter-only 错误：**declared drift**，§1.4 + §1.5 #5 已给 `editor.cancel()` 规避方案。非反转级。
- §1.5 #15 editor.children 名 minified：真实观察（minified 后名变但结构 editMask/selector/editBox 对齐），非事实错误。
- §2.4 InnerEditorEvent §5:122 列举遗漏：**declared harmless drift**，已登记 Follow-up。非反转级。
- §3.3 fps 测量口径（内部 rAF 驱动 editor.move）：**declared measurement scope**（§3.1 + §spike 局限性声明 line 352 明示），非未披露事实错误。其对 E2 设计的含义（fps 反映 TransformTool per-frame 吞吐，未单独捕获端到端指针交互延迟含命中检测 + simulateTarget 首次初始化）已在 §"spike 局限性声明"诚实声明，且 per-call 同步成本（8–20ms）已单独实测远低于 100ms 候选——不足以反转选型，但值得 E2 设计感知（登记为 watch-only residual，见 §6）。
- §"spike 局限性声明"（line 348-354）：scratch 单层 App vs runtime 3 层 App / headless+swiftshader 下界 / 程序化 select vs 真实点击 / 覆盖范围——全部诚实声明，E1.2 calibration caveat 已在 plan Phase 2 处理。
- 跨文档否决条件一致性：spike 报告 §选型路径建议/§3.6/§3.7 + plan line 14/19 + Failure Paths line 69-71 + editor-initiation.md §4.3 line 95 + roadmap line 33/100/195/279 七处一致（精确两条件否决 + E0.3→R7-only）。spike 共识审查 Round 2 n-4 修正 + Round 3 AGREE 已确认此一致性。

**verdict**：✅ **未发现足以反转选型的事实性错误**。spike 报告内部自洽、诚实声明局限性、证据链支持路径 A。唯一值得 E2 设计感知的测量口径 nuance（rAF 驱动 fps 未含端到端指针延迟）登记为 watch-only residual（Failure Path `spike-fact-dispute`），**非反转触发项**。

## 3. 选型裁定 (verdict)

**Verdict: 维持路径 A（leafer-editor 插件底座 + 自研组态语义适配层）**

**裁定依据**（基于 spike 报告事实，独立核对）：

1. **否决条件 (a) 手势仲裁不成立 → 不触发**：spike §1.3 深探针 P1 真实测量证明 `tree:viewport + move:drag:'auto' + editable:true + 真实点击` 配置下 Editor 完整接管拖拽（rect 70×60px 位移 + 9 editor.move 帧 + viewport 零污染）。初测 S2/S4/S5 误判经深度探针自纠正（spike-mock-leak 教训复现并规避）。
2. **否决条件 (b) API 漂移成本 ≥ 自研成本 → 不触发**：spike §2.4 六大事件族类名 0 漂移 + §2.2 载荷真实抽取；唯一 API 漂移（`editor.list=[]` getter-only，§1.5 #4）已用 `editor.cancel()` 规避；适配层 cost = 小～中（§2.5），远 < 自研全量交互原语成本。
3. **E0.3 性能 main-path-neutral**：候选最低 32.2fps ≥ 30fps 阈值（§3.3）；性能精确 framed 为 R7-only（§3.7 + 选型路径建议开篇），不触发 R1。

路径 A 成立，无否决条件触发，无需转路径 B。

## 4. R1 标记状态

**R1（选型变更）：不触发** ✅

维持路径 A，选型未变更。**E1.2（编辑态包络确立）/ E1.3（回写 + 共识审查）may proceed.**

（R7 编辑态包络数字确立留待 E1.2 Phase 提交人工确认——性能候选达标，但包络数字属 benchmark 验收阈值类，AI 产出裁定建议 + 标记，人工最终确认。）

## 5. 9 条关键设计约束确认/修正清单（E2.1 输入）

| #   | 约束（spike 选型路径建议 line 321-329）                                                                                                                                       | spike 证据                                                                                                           | 确认/修正     | E2 落点                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------- |
| 1   | 图元必须显式 `editable: true`（双态切换：编辑态开 / 运行态关，双态隔离 R5 落点）                                                                                              | §1.4 适配项「图元可编辑开关：必须显式 editable:true」+ §1.5 #1（`new App({editor:{}})` 注入 editor 实例）            | ✅ 确认 as-is | E2.1 架构（双态隔离）                         |
| 2   | 选中触发必须真实点击（不能用 `editor.select()` API 替代完整接管——spike-mock-leak 教训）                                                                                       | §1.2 spike-mock-leak 教训触发 + §1.3 事件流（editor.select→pointer.down→pointer.up→editor.move × 9 帧）              | ✅ 确认 as-is | E2.1 架构（选中交互）                         |
| 3   | 拖拽事件经 `editor.move` 派发，需适配层抽纯 payload + nodeId → `createNormalizedActionEvent`（**禁直传 leafer 事件**：循环 Leaf 引用）→ 转 diff（transform 事件族节流起止帧） | §2.2 ① EditorMoveEvent 载荷 + §2.5 关键约束（Leaf 循环引用不能直传）                                                 | ✅ 确认 as-is | E2.4 undo-redo（diff 命令栈 + 节流）          |
| 4   | 清空选区用 `editor.cancel()` 替代 `editor.list = []`（API 漂移 #4 规避）                                                                                                      | §1.5 #4（`editor.list=[]` 初次报 getter-only 错）+ #5（`editor.cancel()` 清空选区，推荐 API）                        | ✅ 确认 as-is | E2.1 架构（选区管理 API）                     |
| 5   | scale 默认 `editSize:'size'` 改写 width/height（非 scaleX）；rotate 经 `rotateGap:45` 吸附；skew 触发 = ctrl+resize-line                                                      | §2.2 ② EditorScaleEvent（实测宽 100→40）+ ③ EditorRotateEvent（rotateGap:45）+ ④ EditorSkewEvent（ctrl+resize-line） | ✅ 确认 as-is | E2.1 架构 + E2.2 属性面板（几何字段写回语义） |
| 6   | 框选 selectArea：move:'auto' 冲突 + 默认 release 清空选区 → E2 需 `selectKeep:true` 或自定义 release 或双态切换 move 配置                                                     | §1.4（move:'auto' 与框选冲突双因）+ §2.3（selectArea 拖拽过程峰值 listLen=5 但释放后 finalListLen=0）                | ✅ 确认 as-is | E2.1 架构（框选交互）                         |
| 7   | group/ungroup 需适配层转组态模型结构 diff（addSymbol/removeSymbol，非属性增量）                                                                                               | §2.2 ⑤ EditorGroupEvent（editTarget=Group）+ §2.5（group/ungroup 需结构 diff + nodeId 重映射，cost 中）              | ✅ 确认 as-is | E2.4 undo-redo（结构 diff）                   |
| 8   | InnerEditor 事件依赖 inner-editor 插件装载（`@leafer-in/text-editor` 注册 TextEditor）——编辑器包需引入对应 inner-editor 插件                                                  | §2.2 ⑥ InnerEditorEvent（innerEditorTag='TextEditor'）+ §2.3（双击 Text 进入 TextEditor）                            | ✅ 确认 as-is | E4.2 依赖引入（inner-editor 插件）            |
| 9   | 编辑态覆盖物采用方案 A（leafer Editor 内置，10k 选区仍 32fps ≥30 候选；方案 B 自研挂 sky 作 fallback 路径 B）                                                                 | §3.6 推荐方案 A（开箱交互原语 + 典型选区持平）+ §3.3（10k A=32.2fps / B=36.4fps，均 ≥30）                            | ✅ 确认 as-is | E2.1 架构（覆盖物挂载形态）                   |

**全部 9 条确认 as-is，无需修正。** 每条均有真实 spike 证据支撑（非 mock 推断），可作为 E2.1 架构 / E2.4 undo-redo / E2.6 renderer 契约 / E4.2 依赖引入的权威输入。

## 6. watch-only residual（若有）

**1 项 watch-only residual（Failure Path `spike-fact-dispute`，非阻断）**：

- **rAF 驱动 fps 测量口径 nuance**：spike §3.3 fps 数字（32.2–50fps）经内部 rAF 驱动 `editor.move()` 测得（§3.1 line 255 + §spike 局限性声明 line 352 诚实声明），反映 TransformTool per-frame 吞吐，**未单独捕获端到端指针交互延迟**（含命中检测 + simulateTarget 首次初始化）。含义：大规模选区（如 10k）首次拖拽启动时，simulateTarget 跨 N 元素初始化可能产生未反映在稳态 fps 中的延迟尖峰。**不足以反转选型**——per-call 同步成本（8–20ms，§3.4）已单独实测远低于 100ms 候选；E0.1 手势仲裁经真实指针拖拽验证（深探针 P1）。但 E2.1 架构设计 + E6（M1 gate）/E9.2（M3 benchmark 复测）应对「大规模选区首次拖拽 simulateTarget 初始化延迟」保持感知，必要时在 runtime 3 层 App 下加测端到端指针延迟。登记 editor mission Follow-up Backlog 供 E2 设计规避。

（注：spike §1.5 #4 `editor.list=[]` drift + §2.4 InnerEditorEvent §5:122 遗漏均为 declared drift 且已登记 Follow-up，不重复登记为 watch-only residual。）

## 7. E2 输入交接声明

本裁定（selection-gate-2026-08-06.md）作为 E2 阶段的权威输入，交接内容：

1. **选型裁定**：路径 A（leafer-editor 插件底座 + 自研组态语义适配层）维持，R1 不触发。
2. **9 条关键设计约束**（§5 表）：E2.1 架构（editable:true 双态 / 真实点击选中 / editor.cancel() / 框选 selectKeep / 方案 A 覆盖物）、E2.4 undo-redo（editor.move 适配层抽 payload+nodeId + transform 节流 + group/ungroup 结构 diff）、E2.6 renderer 契约（编辑态画布 fields/events/handles）、E4.2 依赖引入（inner-editor 插件）。
3. **覆盖物挂载形态**：方案 A（leafer Editor 内置）采纳；方案 B 作 fallback 路径 B 保留。
4. **编辑态包络规格**：留待 E1.2 Phase 裁定（基于 E0.3 §3.5 三档候选 + runtime 3 层 App calibration），R7 人工确认。
5. **runtime 复用点**（editor-initiation.md §3 + roadmap Cross-Cutting 复用表）：2 类需新造面（图元属性 schema 统一抽取 / 编辑态交互覆盖物族 + undo 事务语义）+ 3 处衔接语义扩展（引擎层 diff 事务 / 序列化暂存提交 / 事件预览派发）。
6. **watch-only residual**（§6）：rAF 驱动 fps 口径 nuance → E2.1/E6/E9.2 对大规模选区首次拖拽 simulateTarget 初始化延迟保持感知。

E1.2/E1.3 may proceed（R1 不触发）。
