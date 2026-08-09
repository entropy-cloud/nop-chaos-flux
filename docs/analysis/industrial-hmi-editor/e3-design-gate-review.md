# E3 Gate 结论：设计文档 review（E2 六份 design-\*.md 终轮复核）

> 日期：2026-08-06
> 版本：v1（E3.1 产出）
> 上游：plan `docs/plans/2026-08-06-2118-1-e3-design-gate-review.md`；E1 两份产物 `docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md`（§3 路径 A 维持 + §5 9 条设计约束 + §6 watch-only residual）+ `docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（§3 五项裁定建议值 + §3.2 双态隔离声明）；spike 报告 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（§1.4 适配层 cost + §2.5 flux action 派发链 + §3.6 覆盖物方案 A）；6 份设计文档 `docs/components/industrial-hmi-editor/design-*.md`（E2.1–E2.6）；runtime 4 份设计文档 `docs/components/industrial-hmi/design-*.md`（12 节结构先例 + 复用点 live 锚点）；立项材料 `docs/components/industrial-hmi/editor-initiation.md`（§2 功能域 + §3 复用点三态 + §4 选型 + §6 风险）；roadmap `docs/components/roadmap-industrial-hmi-editor.md` 全文
> 下游：`docs/components/industrial-hmi-editor/design-*.md`（6 份，修正落地）、roadmap（头部记录 + Phase Status）；E4.1（包结构裁定）、E5.1（编辑态画布组件 + 双态切换，消费修正后设计契约）
> 依据：roadmap E3.1 + Cross-Cutting（review gate 纪律 / 文档共识审查终轮复核不另开一轮 / 人工确认阈值 / Rule 4）；`docs/references/new-renderer-introduction-audit.md` 是 E5/E6 实现期 INV-1/INV-2 五边界审计依据，**非 E3 设计 gate 输入**（本 gate 只审设计文档，不审实现），仅在边界模糊时作设计期预审补充对照

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。

- **Round 1（2026-08-06，本 gate agent `ses_0292` fresh session，task 待回填）**：E3.1 设计 gate 审查执行完毕（8 维度核对 + live 引注逐项核实 + 跨文档一致性重核）。判定与修正项清单见 §2/§3。**round-1 verdict slot 特意留空**——依据 plan Phase 1 `Proof` item「f-1 教训落地」+ AGENTS.md「执行 session 不自审」纪律，本 gate agent（执行 session）的 round-1 判定须由**独立 consensus reviewer（fresh session）复核确认**后方可写入本块。Round 1 review 已完成，pending independent consensus confirmation。
- **Round 1（2026-08-06，fresh session 独立 consensus reviewer，task id `fresh-session sub-agent (task id visible in caller context)`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit（本轮 0 新增修正项）。全文复扫 7 项核对 PASS：① **citation fidelity**——live 抽查 7 处引注全部存在且内容相符（`use-scada-handles.ts:11-21` SCADA_HANDLE_METHODS 9 方法 fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy；`config-types.ts:108-113` ScadaConfigDiff 四字段 added/removed/updated/variables；`pipe-junction.ts:8-14` ScadaPipeConnection id/x/y/direction/target；editor-initiation §3 #5 组件句柄面 9 方法（line 57）；roadmap 总览 line 78-87 复用点表 10 行；architecture §4.4 line 153 scada-engine.ts 18 命令面逐个可数；editing-envelope §3 五项包络值 ≥30fps@≤1k/<100ms/≤1k primary·≤10k extended/≤320MB/E6·E9.2）；② **verdict consistency**——§2 判定 `pass-with-minors`（0B/0M/1m/1n）与 §3 修正项清单 m-1(Minor)+n-1(Nit) 计数逐项对齐；③ **scope discipline**——仅审 6 份设计文档、不裁定包结构（显式 defer E4.1）、不预写实现代码（算法签名为设计期契约）、不重新仲裁选型（路径 A 全文假设维持）；④ **completeness**——§1–§7 七节齐备且结构良好（§1.1 证据集/§1.2 任务范围摘要/§1.3 差异清单/§2 审查判定/§3 修正项清单/§4 差异清单裁定 5 项/§5 终轮复核结论/§6 E6 gate 观察项 8 条/§7 收口动作清单）；⑤ **8-dimension coverage**——§2 摘要表 A–H 八维度全覆盖（对齐 plan Scope E3.1 In Scope 八项核对维度，逐项 ✅）；⑥ **findings honesty**——m-1 + n-1 均经本 reviewer live 逐字核实真实存在且严重度分级恰当（见下「关键观察项」）；⑦ **f-1 lesson discipline**——本 gate agent round-1 verdict slot 已特意留空（执行 session 不自审），由本独立 reviewer 填入判定，符合 plan Phase 1 f-1 教训。**关键观察项**：(a) m-1 属 design-undo-redo.md:42 §2 决策表「内存上限守护」行 stale「总体内存预算 ≤10MB（10 万图元场景）」——该数字恰是 Round 1 M-1（Major）修正点识别的预算口径，M-1 联动更新范围列明「§4.1/§4.3/§5/§7/§8/§11/§12」**未含 §2**，致 §2 残留 stale ≤10MB 与 §4.1.2（:180「100 × KB 级 ≈ 100KB 量级」）+ §12.1 U1（:428「≈ 100KB 量级」）矛盾 100×；`rg` 全文核实 line 42 是 body 中唯一 stale ≤10MB 残留（line 13/15 属共识记录历史引用，非 body），Minor（内部数值一致性）分类精确恰当；(b) n-1 属 design-architecture.md:362 §8.5「editor-initiation §3 #5 + roadmap 总览 line 81」次级交叉引用 off-by-one——权威引注 editor-initiation §3 #5（组件句柄面 9 方法）正确，但 roadmap line 81 实为复用点 #4（组态 JSON 序列化）、#5 在 line 82（live 核实 roadmap:78–87 逐行），Nit（citation precision，权威引注正确）分类恰当。全文经独立 live 复核未发现 gate reviewer 遗漏的新增修正项（其余设计文档引注 / 跨文档一致性 6 维度 / 包络数字 / 9 spike 约束映射经抽查均无新冲突）。**Round 1 达成共识**（连续一轮 0 新增修正项，未超 ≤3 轮上限）。

## 1. 审查输入

### 1.1 证据集

| 类别                     | 文件                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主审对象（6 份）         | `design-architecture.md`（E2.1）、`design-property-panel.md`（E2.2）、`design-connection.md`（E2.3）、`design-undo-redo.md`（E2.4）、`design-toolbox.md`（E2.5）、`design-renderer.md`（E2.6）                                                          |
| E1 选型裁定              | `selection-gate-2026-08-06.md`（§3 路径 A 维持 + §5 9 条设计约束 + §6 watch-only residual）、`editing-envelope-2026-08-06.md`（§3 五项裁定建议值 + §3.2 双态隔离声明 + R7 待人工确认）                                                                  |
| spike 事实               | `spike-2026-08-05.md`（§1.4 适配层 cost + §1.5 15 项真实 API 锚点 + §2.2 六大事件族载荷 + §2.5 flux action 派发链 + §3.3 fps 矩阵 + §3.6 覆盖物方案 A）                                                                                                 |
| runtime 设计文档（参照） | `design-engine.md`（§8.2 18 命令面 + §6 sky 层 Editor 预留）、`design-renderer.md`（§5 D-1 裁定 + §8.5 句柄面 + §8.4 测试句柄 + §12.2 五边界）、`design-symbols.md`（§4.2 flow/dashOffset + §4.4 pipe-junction）、`design-data-binding.md`（§4.4 flow） |
| 立项材料                 | `editor-initiation.md`（§2.1 五功能域 + §3 复用点三态 10 项 + §4 选型 + §6 R1–R8）                                                                                                                                                                      |
| roadmap                  | `roadmap-industrial-hmi-editor.md` 全文（Phase Status / Work Items E2 / Dependency Graph / Cross-Cutting / Rule）                                                                                                                                       |
| live 源码（引注核实）    | `packages/flux-renderers-industrial/src/`：`use-scada-handles.ts`、`serialization/config-types.ts`、`serialization/diff.ts`、`symbols/pipe/pipe-junction.ts`、`symbols/composite.ts`、`symbols/symbol-types.ts`                                         |
| 补充对照（不属审查依据） | `docs/references/new-renderer-introduction-audit.md`（INV-1–INV-5）；仅边界模糊时作设计期预审补充                                                                                                                                                       |

### 1.2 任务范围摘要（editor-initiation §2.1 五功能域 + M1/M2/M3 边界）

| 功能域          | 优先级 | M 归属 | 设计文档    | 核心设计契约                                                                                  |
| --------------- | ------ | ------ | ----------- | --------------------------------------------------------------------------------------------- |
| 图元拖拽放置    | P0     | M1     | E2.1 / E2.6 | 双态切换 + Editor 装配（方案 A）+ 适配层节流                                                  |
| 属性面板 schema | P0     | M1     | E2.2        | 单源化抽取 `ScadaSymbolDefinition.props` + 六类分类 + validate 衔接                           |
| 连线            | P1     | M2     | E2.3        | pipe-junction 端点吸附 + `custom.connections` 声明写入 + 联动算法（**M1 不实现**）            |
| undo-redo       | P1     | M2     | E2.4        | diff 命令栈 forward+inverse（不持全量 prevSnapshot）+ 事务语义 + R4 严格满足（**M1 不实现**） |
| 画布工具箱      | P2     | M3     | E2.5        | 视图工具复用 + 对齐分布层级 + 复制粘贴 + 导入导出 + 图元库只读（**M1/M2 不实现**）            |

M1 边界（roadmap §E5）：双态切换 + 图元库面板 + 拖拽放置 + 属性面板 schema（几何/样式/绑定）+ 保存/加载 + 编辑期校验。**不含**连线 / 多选框选 / undo-redo / 对齐分布。

### 1.3 差异清单（6 份设计文档 vs roadmap E2 work items 范围/顺序/选型 逐项对照）

1. **范围一致性**：6 份设计文档非目标（不实现代码 / 不裁定包结构 / 不修改 runtime）vs roadmap E2 work items 描述 + E3/E4/E5+ 边界。
2. **顺序一致性**：设计文档实现阶段映射（E4.1 包结构裁定 → E4.2 注册空壳 → E5/E7/E9 实现）vs roadmap Dependency Graph（E2→E3→E4→E5→E6→E7→E8→E9→E10）。
3. **选型一致性**：路径 A（leafer-editor 插件底座 + 自研组态语义适配层）维持，覆盖物方案 A（leafer Editor 内置）采纳——跨 6 文档 / selection-gate §3 / spike §3.6 / editor-initiation §4.3 一致。
4. **包络一致性**：编辑态包络五项（≥30fps@≤1k primary / <100ms / ≤1k primary·≤10k extended / ≤320MB / E6·E9.2）跨 design-architecture §4.7 + design-renderer §4.7 + editing-envelope §3。
5. **9 spike 约束一致性**：design-architecture §4.8 9 行映射表 + design-renderer/design-undo-redo/design-connection 引用 vs selection-gate §5 逐条。

## 2. 审查判定

**判定：`pass-with-minors`**——0 Blocker、0 Major、1 Minor（m-1，design-undo-redo.md §2 决策表 stale 内存预算数字）、1 Nit（n-1，design-architecture.md §8.5 roadmap 行号 off-by-one）。6 份设计文档的设计决策本身不重新裁决（E2 per-doc 共识已确立 + 跨文档一致性已核对）；本 gate 为终轮复核，核对一致性 / 完整性 / 符合性 / scope discipline。

审查范围核对摘要（A–H 逐项，均以实际文件 + live 源码核对）：

| 核对项                                                                         | 结果 | 关键证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. 设计 ↔ E1 选型裁定一致性（路径 A + 9 spike 约束 + 覆盖物方案 A + 双态隔离） | ✅   | 路径 A 跨 6 文档一致（architecture §2 决策表 P0 采用 + renderer §2 + connection §2 等）；9 spike 约束 architecture §4.8 9 行映射表逐条对应 selection-gate §5（editable:true/真实点击/editor.move 抽 payload+nodeId/editor.cancel()/scale→width-height/selectKeep/group 结构 diff/InnerEditor 插件/方案 A）；覆盖物方案 A 跨 6 文档一致；双态隔离 editable:true 开关跨 architecture §4.2 + renderer §4.2 + 各 doc §3 一致                                                                                                                                                                                                                                                                                                |
| B. 设计 ↔ 编辑态包络一致性                                                     | ✅   | architecture §4.7 + renderer §4.7 五项包络（≥30fps@≤1k / <100ms / ≤1k primary·≤10k extended / ≤320MB / E6·E9.2）逐值对齐 editing-envelope §3；各文档标注「E1.2 裁定建议值，R7 待人工确认」措辞一致；undo-redo §12.1 U1 R4 内存防护与 envelope 内存项无冲突                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| C. 设计 ↔ runtime 复用点三态（reuse-overclaim 核对）                           | ✅   | 10 复用点 + 2 新造面 + 3 衔接扩展逐项 live 一致，**无 reuse-overclaim**：① 引擎层 18 命令面（architecture §4.4 枚举 18 方法，live 核实 editor-initiation §3 #1 + roadmap line 78）；② ConfigAdapter nodeById O(1)（引用正确）；③ 图元注册表 24 内置（toolbox §4.5 =24 口径，editor-initiation:55）；④ 序列化 diff（undo-redo §4.1 `ScadaConfigDiff` 经 live 核实 `config-types.ts:108-113` 逐字段）；⑤ 句柄面 9 方法（renderer §8.5.1 经 live 核实 `use-scada-handles.ts:11-21` SCADA_HANDLE_METHODS）；3 衔接扩展均标注「需扩展」**非**「现成可用」（architecture §4.4 diff 事务 + §4.5 暂存提交 + §4.6 事件预览）；2 新造面均明确声明为编辑器域核心新造（property-panel §4 schema 抽取 + architecture §4.3 覆盖物族） |
| D. 设计 ↔ spike 事实一致性（design-mock-leak 核对）                            | ✅   | 6 文档引用的交互 API 均经 spike 固化，**无 mock-leak**：editor.move/scale/rotate/skew/group/ungroup/select/InnerEditor 载荷（spike §2.2）；editor.cancel()（spike §1.5 #5）；new App({editor:{}})（spike §1.5 #1）；selectKeep:true（spike §2.3）；pipe-junction connections（I9.4 live `pipe-junction.ts:8-14` 经本 gate live 核实逐字段）；**禁直传 leafer 事件**（spike §2.5 循环 Leaf 引用）跨 architecture §4.6 + renderer §8.2 一致引用                                                                                                                                                                                                                                                                           |
| E. 六文档交叉一致性                                                            | ✅   | 6 维度无矛盾：① 双态隔离机制（architecture §4.2 三层 + 4 验证 ↔ renderer §4.2 ↔ property-panel/connection/undo-redo/toolbox §3 一致）；② 编辑会话组态存储模型（architecture §4.5 `ScadaEditorSession` workingConfig/committedBaseline/undoStack/redoStack/selection/mode 跨 5 sibling 消费一致）；③ 提交语义（architecture §4.5 commitPolicy manual/auto ↔ renderer §4.5 一致）；④ 句柄面扩展 addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo/save/load（architecture §8.5 ↔ undo-redo §4.3 ↔ connection §8.2 ↔ toolbox §8.2 ↔ renderer §8.5.2 一致 8 句柄 + runtime 9）；⑤ 事件派发链策略（编辑态不派发 symbol:\* action 跨 6 文档一致）；⑥ 包络数字（见 B 行）                                            |
| F. 设计 ↔ editor-initiation §2/§3/§4 一致性                                    | ✅   | 5 功能域范围（M1/M2/M3 边界）逐文档对齐（property-panel M1 / connection M2 / undo-redo M2 / toolbox M3）；复用点三态标注口径一致；选型路径 A 对齐 §4.3 否决条件精确两项（手势仲裁不成立 / API 漂移成本≥自研成本）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| G. 设计可行性 + 12 节结构对齐 runtime design-\*.md 先例                        | ✅   | 6 文档均含 12 节（组件定位 / 能力对照 / renderer-type / schema / 字段分类 / 图层场景树或域特化 / 运行期状态 / 事件句柄 / 数据源 / 样式 DOM marker / 实现拆分 / 风险后续）；property-panel/toolbox 的 §6 按域特化（非 canvas 层 → 校验衔接 / 图元库只读）属合理适配非缺节；算法签名（computeInverse / recomputeConnectionAnchor）为设计期契约 + 纯逻辑单测先行声明，非预写实现                                                                                                                                                                                                                                                                                                                                           |
| H. scope discipline（不裁定包结构 E4.1 / 不预写实现代码 / 不重新仲裁选型）     | ✅   | 6 文档均声明「待 E4.1 裁定」+ 呈现方案 A/B trade-off input（非裁定）；TypeScript 接口 + 算法签名为设计契约（标注「设计期契约，Ex.x 落地」），非实现代码；选型均假设路径 A 维持（无重新仲裁）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 3. 修正项清单

### m-1（Minor，内部一致性 / 数值精度 — stale after Round 1 M-1 fix）

- **位置**：`design-undo-redo.md` §2 Flux 决策表「内存上限守护」行（`:42`）
- **描述**：§2 决策表保留 stale 数字「总体内存预算 **≤10MB**（10 万图元场景）」。该数字恰是 Round 1 **M-1（Major）**修正点识别为数学不一致的预算口径——10 万图元单份 ≈ 11.6MB（`design-renderer.md §12.3`），100 entry 全量快照 ≈ 1.16GB 远超 ≤10MB（差距 ~116×）。M-1 修正移除 `prevSnapshot` 字段 + push 时预计算 `inverse`，栈元素只持 forward + inverse 两条增量 diff；Round 1 记录列明的联动更新范围为「§4.1/§4.3/§5/§7/§8/§11/§12」——**§2 决策表被遗漏**。当前 §4.1.2（`:180`）「100 × KB 级 ≈ 100KB 量级」+ §12.1 U1（`:428`）「≈ 100KB 量级」与 §2 的 ≤10MB 矛盾 100×，读者读 §2 概述即得错误预算量级。Round 3 复核「全文复扫 0 新增修正项」未捕获此 stale 行。
- **要求修正**：§2 决策表「内存上限守护」行理由列回写为「栈深度上限 100（可配置）+ 单 diff 大小估计 + 满栈丢弃最旧；总体内存预算 **≈100KB 量级**（forward + inverse 两条增量 diff，不持全量 prevSnapshot，§4.1.2 R4 内存约束）」，与 §4.1.2 + §12.1 U1 口径一致。同步该文档头部共识记录新增 E3.1 gate 修正条目。
- **类别**：内部数值一致性（stale after M-1 fix，§2 未联动更新）

### n-1（Nit，引用精度 / off-by-one）

- **位置**：`design-architecture.md` §8.5 句柄面扩展段（`:362`）
- **描述**：引注「runtime 复用点三态「需扩展」，**editor-initiation §3 #5 + roadmap 总览 line 81**」。权威引注 `editor-initiation §3 #5`（组件句柄面）正确；但 `roadmap-industrial-hmi-editor.md` 的复用表 line 81 实为复用点 **#4（组态 JSON 序列化）**，复用点 **#5（组件句柄面 9 方法）**在 **line 82**（本 gate 经 live 核实 roadmap:78–87 逐行）。off-by-one in 次级交叉引用。
- **要求修正**：「roadmap 总览 line 81」→「line 82」（或移除 roadmap 行号引注，因 `editor-initiation §3 #5` 为权威引注）。同步该文档头部共识记录。
- **类别**：citation precision（次级交叉引用 off-by-one，权威引注正确）

## 4. 差异清单裁定

### 差异 1：范围一致性——**裁定：一致，无修正**

- 6 份设计文档 Non-Goals（不实现代码 / 不裁定包结构 / 不修改 runtime pipe-junction / 不定义事件 action 编辑器等）与 roadmap E2 work items 描述 + E3/E4/E5+ 边界逐项吻合：E2.1 架构（→E4.1/E5.1）、E2.2 属性面板（→E5.3）、E2.3 连线（→E7.1，M2）、E2.4 undo-redo（→E7.2，M2）、E2.5 工具箱（→E9.1，M3）、E2.6 renderer（→E4.2/E5.1）。M1/M2/M3 边界在 6 文档 §1 组件定位 + §12.3 后续阶段表逐项标注，与 roadmap §E5（M1 边界）/§E7（M2）/§E9（M3）一致。

### 差异 2：顺序一致性——**裁定：一致，无修正**

- 6 份设计文档 §12.3 后续阶段表实现映射与 roadmap Dependency Graph（E2→E3→E4→E5→E6→E7→E8→E9→E10）逐项吻合，无跳序/逆行映射。design-architecture §12.3（E2.2/E2.3/E2.4/E2.5/E2.6→E3→E4.1→E4.2→E5.1→E5.4→E7.2→E6/E9.2）；design-renderer §12.3（E3→E4.1→E4.2→E5.1–E5.4→E7.1→E7.2→E9.1→E9.2→E6/E8/E10）等。

### 差异 3：选型一致性——**裁定：一致，无修正**

- 路径 A（leafer-editor 插件底座 + 自研组态语义适配层）维持：跨 6 文档 §2 决策表 + selection-gate §3 + spike §选型路径建议 + editor-initiation §4.3 全链一致。覆盖物方案 A（leafer Editor 内置）采纳：architecture §4.3 + renderer §6 + connection §6 等一致；方案 B 作 fallback 保留。否决条件精确两项（手势仲裁不成立 / API 漂移成本≥自研成本）跨文档无污染（E0.3 性能仅 R7，不影响选型主路径）。

### 差异 4：包络一致性——**裁定：一致（无修正）**

- 编辑态包络五项（≥30fps@≤1k primary / <100ms / ≤1k primary·≤10k extended / ≤320MB / E6·E9.2）：architecture §4.7 + renderer §4.7 + 各文档「E1.2 裁定建议值，R7 待人工确认」标注逐值对齐 editing-envelope §3。undo-redo §4.1.2 + §12.1 R4 内存防护（≈100KB 量级，不持全量快照）与 envelope 内存项 ≤320MB 无冲突（R4 是编辑器域内 undo 栈占用，远低于运行态红线）。**注**：undo-redo §2 决策表 stale ≤10MB 数字属 m-1（文档内部一致性，非包络维度裁定差异——envelope §3 内存项 ≤320MB 在 6 文档引用正确）。

### 差异 5：9 spike 约束一致性——**裁定：一致，无修正**

- design-architecture §4.8 9 行映射表逐条对应 selection-gate §5 9 约束（editable:true/真实点击/editor.move 抽 payload+nodeId+节流/editor.cancel()/scale→width-height+rotateGap:45+skew/selectKeep/group-ungroup 结构 diff/InnerEditor 插件/方案 A），全部确认 as-is。design-renderer §8.2 事件派发链 + design-undo-redo §4.2 事务语义 + design-connection §4.2 端点吸附引用 9 约束中相关项，无遗漏无矛盾。

## 5. 终轮复核结论

- **E2 设计文档「文档共识审查」终轮复核：达成（差 1 项落地）**——本轮产生 1 项新增 Minor（m-1 属 design-undo-redo.md §2 决策表 stale 数字，E3.2 落地）+ 1 项 Nit（n-1 属 design-architecture.md §8.5 引用精度，E3.2 落地）。按 roadmap Cross-Cutting 共识判据（连续一轮 0 新增修正项），存在未落地修正即未达成；**E3.2 将 m-1/n-1 落地后，经确认轮复核（0 新增）即达成共识**。共识循环轮次：E2 per-doc 共识（5 份 R1 AGREE + E2.4 经 3 轮 R3 AGREE）+ E2 跨文档一致性核对 PASS → E3 终轮复核第 1 轮（本 gate）发现 1 Minor + 1 Nit；落地确认后闭环，未超 ≤3 轮上限。
- **人工确认阈值：未触发**——m-1/n-1 均为措辞 / 数值精度 / 引用精度类修正，**不涉及范围 / 顺序 / 选型变化**。编辑器选型变更（R1）、`scada-editor-canvas` 公共契约重大变更、编辑态 benchmark 包络数字确立（R7）、文档共识循环超 3 轮、M1 交付边界变更均未发生。**显式声明：无人工确认触发，E3 收口后 E4.1 包结构裁定 / E5 M1 实现可按序推进**。

## 6. E6 gate 注意项（供下一 gate 复核的观察项，non-blocking）

供 E6（M1 实现 gate）复核的观察项，均为实现期需对照契约核对、但不构成本 gate 修正的注意点：

1. **editable:true 注入不进序列化**（E5.1）：`serialize.ts` 恒不输出 `editable`——E6 对照 architecture §4.2 不泄漏验证 #1 + renderer §4.2 逐字核验（`rg "editable" serialization/*.ts` 返回空）。
2. **transform 事件族节流起止帧落实**（E7.2）：`editor.before_move` 起始 + 最后一帧 `editor.move`（或 pointerup）终止的累计 diff 入栈 1 个——E6/E8 对照 undo-redo §4.2 事务边界规则表核验（防逐属性 applyAttrs 泄漏）。
3. **computeInverse push 时预计算 + forward∘inverse=identity**（E7.2）：`computeInverse(forward, prevSnapshot)` 在 push 时调用（prevSnapshot 可用），返回后 prevSnapshot 丢弃；栈元素只持 forward + inverse——E6/E8 对照 undo-redo §4.1.1 + §4.1.2 单测覆盖 undo/redo 后 working copy 一致性。
4. **双态隔离 cid 命名空间**（E5.1）：`window.__flux_scada_editor_<cid>` 与 runtime `window.__flux_scada_<cid>` 独立命名空间——E6 对照 renderer §8.4 核验两套测试句柄不冲突。
5. **events 整体 prop（D-1 裁定）**（E4.2/E5.1）：`events` 为 `{ kind: 'prop' }`（非 events.\* event 规则）——E6 对照 renderer §4.3 fields 规则表 + flux-compiler classifyField 顶层 key 精确匹配核验。
6. **i18n 错误码映射 editor 专用函数**（E5）：editor 新增错误码（invalid-node/duplicate-id/...）走 `editor-errors.ts` 独立映射函数（前缀 `industrial.scada.editor.error.<code>`），不经 runtime `scadaErrorI18nKey`（runtime 数组守卫会 fallback .unknown）——E6 对照 renderer §8.5.2 核验。
7. **pipe-junction connections 只写声明不动引擎**（E7.1）：编辑器只写 `custom.connections` 声明 + 联动算法重算 x/y，不修改 runtime `pipe-junction.ts`——E8 对照 connection §1 Non-Goals + §12.2 核验。
8. **w1/w2 watch-only residual**（E6/E9.2）：rAF 驱动 fps 测量口径 nuance（大规模选区首次拖拽 simulateTarget 初始化延迟未单独捕获）——E6/E9.2 在 runtime 3 层 App 下加测端到端指针延迟，必要时调整包络（对齐 selection-gate §6 + editing-envelope §5）。

## 7. 收口动作清单（E3.2 plan Phase 2 执行）

- **E3.2 落地 m-1**：`design-undo-redo.md` §2 决策表（`:42`）「内存上限守护」行预算数字回写为 ≈100KB 量级（对齐 §4.1.2 + §12.1 U1）；同步该文档头部共识记录新增 E3.1 gate 修正条目。
- **E3.2 落地 n-1**：`design-architecture.md` §8.5（`:362`）「roadmap 总览 line 81」→「line 82」（或移除 roadmap 行号）；同步该文档头部共识记录。
- roadmap 头部「文档共识审查记录」块新增 E3.1 gate 记录条目（判定 `pass-with-minors`、修正项摘要 m-1 + n-1、审查 task id、共识轮次）——对齐 E1/E2 gate 回写先例。
- 六文档交叉一致性复核：修正后双态隔离 / 编辑会话组态存储模型 / 提交语义 / 句柄面扩展 / 事件派发链策略 / 包络数字 仍一致（沿用 E2 跨文档一致性 6 维度核对清单重核，无新冲突）。
- `e3-design-gate-review.md` 自身经独立子 agent（fresh session）文档共识审查（≤3 轮，0 新增修正项即共识）；round-1 verdict slot 由独立 consensus reviewer 填写（执行 session 不预填）。
- E2 设计文档共识终轮达成（m-1/n-1 落地后确认轮 0 新增）→ roadmap Phase Status E3 回写 `done`（前置：独立 closure-audit 通过）。
- `docs/logs/2026/08-06.md` 记录本 gate 产出摘要。
- 无人工确认项：未触发「人工确认阈值」，无需标记暂停。
