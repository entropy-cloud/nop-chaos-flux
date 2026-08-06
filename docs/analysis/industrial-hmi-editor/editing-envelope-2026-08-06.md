# Editor Mission E1.2 编辑态包络裁定建议

> 日期：2026-08-06
> 阶段：E1.2 编辑态包络确立 + R7 人工确认（基于 E0.3 spike 三档候选 + runtime 3 层 App calibration）
> 来源 plan：docs/plans/2026-08-06-1931-1-e1-selection-gate-and-editing-envelope.md（Phase 2）
> 输入：spike 报告 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（E0.3 §3.5 三档候选 / §3.4 per-call / §3.3 fps 矩阵 / §3.2 实例化基线 / §spike 局限性声明）、runtime benchmark `docs/analysis/industrial-hmi/benchmark-report.md`（§3.1 实例化 373ms / §3.2 ≥45fps 红线 / §9 总览包络）、`editor-initiation.md §5.2`（编辑态包络另立）、`roadmap-industrial-hmi-editor.md`（Cross-Cutting 双态隔离 / 人工确认阈值 R7）
> 性质：**裁定建议 + R7 人工确认项**（AI 产出建议 + 标记，人工最终确认；包络数字属 benchmark 验收阈值类，roadmap Cross-Cutting「人工确认阈值」）

## 文档共识审查记录（本文件）

> 本文件作为 E1 产物之一，在 E1.3 Phase 经独立 fresh-session sub-agent 执行文档共识审查 Round 1（≤3 轮）。

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_0291740fbffeAbZiLlKe5S9KA0`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit。逐项核对：① citation fidelity（spike §3.3 fps 矩阵 / §3.4 per-call 8.8/8.9/10.0/20.7ms / §3.5 三档候选 / `benchmark-report.md §3.1` 373ms + §3.2 ≥45fps 红线——m-1 修正正确应用，未混淆 § / 1.56× + 1.6× + 7% + 10% 余量算术）全部对照 PRIMARY 源核实准确；② veto-condition framing（精确两项 + E0.3 R7-only）；③ R7 framing 诚实（line 7 裁定建议 + line 70 非最终阈值 + line 104 AI 不自确认）；④ 内部一致性（§3 表 ↔ §3.1 三档对比 ↔ §4 R7 建议）；⑤ 跨文档一致性（本文件 §6 ↔ selection-gate §7）；⑥ scope discipline（产出 E2 输入）；⑦ **calibration honesty（§2 定性类比，不对 fps 候选乘数值化系数；数值化确认显式留 E6/E9.2）**——plan Draft Review m-2 修正正确应用。**Round 1 达成共识（连续一轮 0 新增修正项，未超 3 轮上限）**。本文件可作为 E2 阶段的权威输入（R7 人工确认前的裁定建议）。

## 1. 裁定范围与输入

E1.2 的职责：把 spike E0.3 产出的「编辑态包络数字候选（不确立）」**裁定**为 mission 级编辑态包络阈值（裁定建议值，留 R7 人工最终确认），并处理 spike 局限性中「scratch 单层 App vs runtime 3 层 App」的 calibration caveat。

**输入数字（全部已有实测依据，非新建测试基座）**：

| 数字                                   | 来源                                                                                              | 性质                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| scratch 10 万图元实例化 buildMs 239ms  | spike §3.2（scratch 单层 App）                                                                    | 实例化基线（一次性）                    |
| runtime 10 万图元实例化 buildMs 373ms  | `benchmark-report.md §3.1 / §5 / §9.1`（runtime 3 层 App：registry/样式解析/组态构建/React 桥接） | 实例化基线（一次性）                    |
| 实例化开销比 runtime/scratch ≈ 1.56×   | 373 / 239                                                                                         | 一次性开销比                            |
| 运行态 ≥45fps 红线                     | `benchmark-report.md §3.2 + §9.1` + roadmap 总览包络 line 16/89/281                               | 运行态红线（双态隔离，编辑态另立）      |
| spike ≤1k 选区 moveFps ≈ 50fps         | spike §3.3（两方案 1k≈50fps，headless+swiftshader 下界）                                          | 编辑态拖拽 fps（per-frame）             |
| spike 10k 选区 moveFps A=32.2 / B=36.4 | spike §3.3                                                                                        | 编辑态拖拽 fps（per-frame）             |
| spike editor.move per-call 同步        | spike §3.3 syncAvg + §3.4：8.8/8.9/10.0/20.7 ms（n=10/100/1k/10k）                                | per-frame 同步成本                      |
| spike final 内存 102.8MB               | spike §3.2                                                                                        | 编辑态内存（含选区 + benchmark 副产物） |
| 运行态内存红线 ≤320MB                  | roadmap 总览包络 + `editor-initiation.md §5.2`                                                    | 内存上限（双态共享）                    |
| 复合场景 drag 49.9fps + pan 41.4fps    | spike §3.4（n=1000 选区 + 视口平移）                                                              | 编辑态复合（per-frame）                 |

## 2. calibration 估计（定性类比，不对 fps 候选乘数值化系数）

> **calibration 边界声明**（plan Phase 2 `Proof` + Draft Review m-2）：本节为**定性类比**，**不对 fps 候选乘数值化系数**（如「fps × 0.64 = runtime fps」）——理由是 runtime 3 层 App 对编辑态 fps 的边际影响路径不可数值化（per-frame 热路径与实例化路径解耦，见下）。**数值化 envelope 确认显式留 E6（M1 gate）+ E9.2（M3 benchmark 复测）**，不在 E1.2 闭环（Exit Criteria 已含）。

### 2.1 runtime 3 层 App 开销的路径分析

runtime 3 层 App（`benchmark-report.md §3.1`：registry / 样式解析 / 组态构建 / React 桥接）相对 scratch 单层 App 的 ~1.56× 实例化开销，其作用路径**仅在首屏构建（一次性）**，**不进入编辑态拖拽的 per-frame 热路径**：

| 开销来源（runtime 多出）              | 作用路径                                                                                                    | 是否进入编辑态 per-frame 热路径 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 图元注册表（registerScadaSymbol）     | 首屏构建期一次性注册                                                                                        | ❌ 否（一次性）                 |
| 样式解析（config → leafer attrs）     | 首屏构建期 + 编辑期「提交时」config 同步（非每帧）                                                          | ❌ 否（提交时，非每帧）         |
| 组态构建（config-adapter build）      | 首屏构建期一次性                                                                                            | ❌ 否（一次性）                 |
| React 桥接（renderer reconciliation） | 编辑器→React 回写**经适配层节流**（transform 事件族起止帧，selection-gate §5 约束 #3 / spike §2.5），非每帧 | ❌ 否（节流，非每帧）           |

**结论**：runtime 3 层 App 的 ~1.56× 开销是**实例化开销**（主要影响首屏，`benchmark-report.md §3.1` 口径），**对编辑态稳态拖拽 fps 的边际影响有限**。

### 2.2 编辑态 per-frame 热路径定位（spike 已覆盖）

编辑态拖拽的 per-frame 热路径由两部分主导，**两者 spike 已在 scratch 下实测**（leafer 引擎代码路径在 scratch 与 runtime 中完全一致——runtime 只是宿主，leafer Editor 内部逻辑不变）：

1. **editor.move per-call 同步**（spike §3.3 syncAvg + §3.4）：n≤1k 时 8–10ms，n=10k 时 20.7ms。这是 leafer `TransformTool.move` 的内部成本（per-frame 移动 N 元素 + emit EditorMoveEvent），**与 runtime 宿主无关**。
2. **覆盖物渲染**（EditBox/EditSelect，方案 A）：leafer Editor 内部渲染，**与 runtime 宿主无关**。

**结论**：spike 已覆盖编辑态 fps 的两个主导因素；runtime 宿主开销不进 per-frame 热路径。因此 **spike fps 候选数字（headless+swiftshader 下界）对 runtime 3 层 App 偏保守**（真实 runtime fps 不低于 spike 数字减去 React 桥接节流回写的边际开销，后者因节流而非每帧）。

### 2.3 边际影响的定性估计

- **≤1k 选区**：spike ~50fps。runtime 边际影响 = React 桥接在 transform 起止帧（节流，非每帧）的 reconciliation 开销。即使每帧多消耗 ~20% 帧时间，fps 仍从 50 → ~41fps，**远高于 30fps 候选**（1.6× 余量吸收）。
- **10k 选区**：spike 方案 A = 32.2fps（仅 7% 余量）。runtime 边际影响在此余量带内**有翻车风险**——即使每帧多消耗 ~10% 帧时间，fps 即从 32.2 → ~29fps，**跌破 30fps 候选**。
- **激进取档（≥45fps@≤1k）**：spike ~50fps（10% 余量）。runtime 边际影响 + headless 帧钟波动（`benchmark-report.md §7`：采样 42.3–49.9fps 波动）极易跌破 45fps——**激进取档在 runtime 下不可靠**。

**calibration verdict**：runtime 3 层 App 开销使「保守档（≤10k）」与「激进档（≥45fps@≤1k）」的余量带不足以可靠吸收边际影响；**「中性档（≥30fps@≤1k）」的 1.6× 余量带可可靠吸收 runtime 边际影响**。`envelope-below-candidate` Failure Path **不触发三档全崩**（中性档达标）——无需降档至保守以下；但**保守档与激进档在 runtime 下有风险**，应在 E6/E9.2 数值化确认前避免作为 mission 级承诺。

## 3. 编辑态包络规格（裁定建议值）

> 以下为 **AI 裁定建议**（R7 人工确认项），非最终 mission 级阈值——最终阈值经 R7 人工确认确立（roadmap Cross-Cutting「人工确认阈值」+ `editor-initiation.md §6 R7`）。

| #   | 包络维度                           | 裁定建议值                                                                                                                                                          | spike / benchmark 依据                                                                                                               | 余量 / 风险                                                                                           |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| ①   | **拖拽响应 fps 阈值**              | **≥30fps @ 选区 ≤1k**（中性档，采纳）                                                                                                                               | spike §3.3 两方案 1k≈50fps（1.6× 余量）；calibration §2.3 runtime 边际影响被 1.6× 余量吸收                                           | 余量充足；典型工业编辑选区 ≤几百（远在 1k 内）；激进档 ≥45fps@≤1k 不采纳（runtime 下 10% 余量不可靠） |
| ②   | **编辑操作响应延迟上限**           | **<100ms**（per-call 端到端）                                                                                                                                       | spike §3.4 editor.move per-call 同步 8.8/8.9/10.0ms（n=10/100/1k）远低于 100ms；适配层读 target 几何叠加极小（selection-gate §5 #3） | 余量 ~10×（1k 选区 per-call 10ms vs 100ms）；无翻车风险                                               |
| ③   | **覆盖物密集场景上限（选区规模）** | **选区 ≤1k**（primary 包络，对应 ①）；**≤10k 作 extended 包络**（保守档，spike 实测达标但 runtime 余量紧，留 E6/E9.2 确认是否升级为正式包络）                       | spike §3.3：1k≈50fps（primary）/ 10k A=32.2fps B=36.4fps（extended，均 ≥30）                                                         | primary 余量充足；extended 仅 7% 余量，runtime 风险，不作 mission 级承诺直至 E6/E9.2 数值化确认       |
| ④   | **内存上限**                       | **≤320MB**（运行态红线不变，编辑态另立但共享上限）                                                                                                                  | spike §3.2 final 102.8MB（含 10 万图元 + 选区 + benchmark 副产物）远低于 320MB                                                       | 余量 ~3.1×（320/102.8）；内存非编辑态包络瓶颈（选区规模对内存边际影响可忽略）                         |
| ⑤   | **编辑器本体 runtime 最终验证**    | **留 E6（M1 gate）+ E9.2（M3 benchmark 复测）**——E1.2 仅做基于 spike + runtime benchmark 的 calibration 估计，编辑器 renderer 尚未实现（E5），无法在 runtime 下直测 | plan Non-Goals + Exit Criteria                                                                                                       | 非 E1.2 闭环；E6/E9.2 在 roadmap 已立                                                                 |

### 3.1 三档候选对比与裁定理由

| 档位 | 候选                          | spike 实测依据                                    | runtime calibration 评估                                                | 裁定                                        |
| ---- | ----------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| 保守 | 编辑态拖拽 ≥30fps @ 选区 ≤10k | 方案 A 10k=32.2fps / 方案 B 10k=36.4fps（均 ≥30） | 7% 余量带不足以吸收 runtime 边际影响（§2.3）                            | **降级为 extended 包络**（留 E6/E9.2 确认） |
| 中性 | 编辑态拖拽 ≥30fps @ 选区 ≤1k  | 两方案 1k≈50fps（1.6× 余量）                      | 1.6× 余量带可靠吸收 runtime 边际影响（§2.3）                            | **✅ 采纳为 primary 包络**                  |
| 激进 | 编辑态拖拽 ≥45fps @ 选区 ≤1k  | 两方案 1k≈50fps（逼近运行态 45fps 红线）          | 10% 余量带 + headless 帧钟波动不可靠（§2.3 + `benchmark-report.md §7`） | **不采纳**（runtime 下不可靠）              |

**裁定理由总结**：calibration 估计显示 runtime 3 层 App 对编辑态 fps 的边际影响有限（实例化开销不进 per-frame 热路径），但保守档（≤10k）与激进档（≥45fps@≤1k）的余量带不足以可靠吸收该边际影响 + headless 帧钟波动；**中性档（≥30fps@≤1k）的 1.6× 余量带可可靠吸收**，且典型工业编辑选区（≤几百）远在 1k 内。故采纳中性档为 primary 包络。

### 3.2 与运行态包络的双态隔离声明（roadmap Cross-Cutting 双态隔离）

- 编辑态包络（上表）**仅作用于编辑态画布**，编辑态覆盖物/手柄/工具不得在运行态启用（双态隔离 R5，`editor-initiation.md §6`）。
- 运行态包络不变：10 万图元 ≥45fps / 首屏 <2s / 内存 ≤320MB / 1 万点刷新 <200ms（`benchmark-report.md §9.1` 固化）。
- 编辑态另立：拖拽响应阈值（≥30fps）**低于**运行态 ≥45fps 红线——合理，编辑态交互密度（手柄/参考线/simulateTarget）高于运行态，且编辑态 fps 不是安全/实时性红线（编辑态 fps 低影响编辑体验，不导致工艺误动作）。

## 4. R7 人工确认项

> **R7 = 编辑态 benchmark 包络数字确立**（`editor-initiation.md §6 R7` + roadmap Cross-Cutting「人工确认阈值」）。性质：新包络数字属 benchmark 验收阈值类，AI 产出裁定建议但不自行最终确认。

- **裁定建议**：采纳中性档 `≥30fps @ 选区 ≤1k` 为 primary 编辑态拖拽包络（§3）；编辑操作响应 <100ms；内存 ≤320MB（运行态红线不变）；保守档（≤10k）降级为 extended 包络留 E6/E9.2 确认。
- **calibration 依据**：§2（runtime 3 层 App 实例化开销不进 per-frame 热路径；中性档 1.6× 余量可靠吸收边际影响）。
- **三档候选对比**：§3.1（保守 7% 余量风险 / 中性 1.6× 余量采纳 / 激进 10% 余量不可靠）。
- **人工确认路径**：R7 标记完整——本文件为裁定建议，最终 mission 级阈值经人工确认后回写 roadmap 总览 + `editor-initiation.md §6 R7`（从「新包络数字确认」标记为「已确认，裁定值见 editing-envelope-2026-08-06.md」）。
- **AI 不自确认**：包络数字属 benchmark 验收阈值类，AI 产出建议 + 标记，人工最终确认（roadmap Cross-Cutting「人工确认阈值」条款）。

## 5. 编辑器本体 runtime 最终验证归属（E6/E9.2）

E1.2 的边界（plan Non-Goals）：**不在 runtime 3 层 App 下对编辑器本体做最终性能验证**——编辑器 renderer 尚未实现（E5），E1.2 只做基于 spike 数据 + 已有 runtime benchmark 的 calibration 估计。

编辑器本体在 runtime 3 层 App 下的最终包络验证归属：

- **E6（M1 整体 gate，roadmap line 156-161）**：M1 实现 review（功能/性能/测试/文档），编辑态包络在 runtime 下首次数值化验证（对照本文件裁定建议值）。
- **E9.2（M3 收尾，roadmap line 182）**：M3 benchmark 复测（对照 E1.2 包络），含 conservative 档（≤10k）是否升级为正式包络的最终判定。

两 gate 均已在 roadmap，E1.2 不重复立项。

## 6. E2 输入交接（编辑态包络部分）

本裁定（editing-envelope-2026-08-06.md）作为 E2 阶段的权威输入，交接内容：

1. **编辑态包络规格**（§3 表）：E2.1 架构（双态隔离边界 + 编辑态性能预算）、E2.4 undo-redo（transform 事件族节流起止帧——节流策略需保证 per-call 同步成本在包络内）、E2.6 renderer 契约（编辑态画布性能契约）。
2. **calibration caveat**（§2）：scratch 单层 vs runtime 3 层 App 差异——E2 设计不应假定 runtime fps = spike fps（需保留余量带；中性档 1.6× 余量为 E2 性能预算依据）。
3. **R7 人工确认项**（§4）：E2 设计文档引用包络数字时标注「R7 待人工确认 / 裁定建议值」。
4. **E6/E9.2 最终验证归属**（§5）：E2 设计文档不重复数值化 envelope，引用 E6/E9.2 gate。

## 7. Exit Criteria 自核

- [x] editing-envelope-2026-08-06.md 落地（包络规格四项 ①②③④ + calibration 估计 §2 + 三档候选对比 §3.1 + 裁定建议 §3 + R7 标记 §4）。
- [x] calibration 估计基于已有 benchmark 数字（`benchmark-report.md §3.1` 373ms / §3.2 ≥45fps / spike §3.3 fps 矩阵），非新建测试基座、非臆断；runtime 3 层 App caveat（scratch 单层 vs runtime 3 层）在 §1/§2 显式记录。
- [x] R7 人工确认项标记完整（裁定建议 §3 + 依据 §2 + 三档对比 §3.1 + 人工确认路径 §4）；编辑器本体 runtime 最终验证归属（E6/E9.2）在 §5 显式记录。
- [x] roadmap 总览编辑态包络数字更新为裁定建议值（Phase 2 item 4 `Fix` 落地，见 roadmap line 89）。

> 注：本文件为 R7 人工确认前的「裁定建议」，最终 mission 级阈值经 R7 人工确认后回写。E1.3 共识审查 Round 1 将复核本文件。
