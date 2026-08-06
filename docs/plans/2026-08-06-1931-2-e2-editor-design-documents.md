# 3 Editor Mission E2 编辑器设计文档

> Plan Status: active
> Last Reviewed: 2026-08-06
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E2 work items E2.1–E2.6、Phase Details、Cross-Cutting 文档共识审查/平台能力复用/spike 先行纪律/双态隔离/设计文档归属）、`docs/components/industrial-hmi/editor-initiation.md`（§2.1 功能域 + §3 复用点三态 + §4 选型 + §6 风险）、`docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（9 条关键设计约束 + 事件族载荷 + 覆盖物形态建议）
> Related: `docs/plans/2026-08-06-1931-1-e1-selection-gate-and-editing-envelope.md`（E1 上游，选型裁定 + 编辑态包络 + 设计约束输入）、`docs/components/industrial-hmi/design-*.md`（runtime 4 份设计文档，12 节结构参考）
> Mission: industrial-hmi-editor
> Work Item: E2

## Purpose

执行 industrial-hmi-editor mission 的 E2 work item：产出编辑器 6 份设计文档（`docs/components/industrial-hmi-editor/design-*.md`），把 E1 选型裁定（路径 A）+ 9 条 spike 设计约束 + 编辑态包络规格 + runtime 10 复用点（2 类新造面 / 3 处衔接扩展）收敛为编辑器实现契约，作为 E4（包基建）/ E5（M1 实现）/ E7（M2）/ E9（M3）的权威设计输入。

E2 是设计契约产出阶段：每份 design 文档描述对应功能域的**最终目标设计**（参考 runtime design-\*.md 12 节结构），消费 E1 结论与 spike 事实，禁止以 mock 推断设计（Cross-Cutting「spike 先行纪律」）。E2 自身做 per-doc 文档共识审查；E3（设计 gate，独立 plan）是 E2 的终轮复核。

## Current Baseline

- **E1 选型 gate 结论（E1 输入，本 plan 假设 E1 维持路径 A）**：路径 A（leafer-editor 插件底座 + 自研组态语义适配层）成立；9 条关键设计约束（spike 报告「选型路径建议」+ E1.1 确认）作为 E2.1/E2.4/E2.6 输入；覆盖物挂载形态方案 A（leafer Editor 内置）采纳。
- **编辑态包络规格（E1.2 输入）**：拖拽响应 fps 阈值 / 编辑操作响应延迟 <100ms / 覆盖物密集上限 / 内存 ≤320MB（运行态红线不变）；E2.1 架构 + E2.6 renderer 契约须满足此包络。
- **runtime 10 复用点全部 live 核对**（`editor-initiation.md §3` + roadmap Cross-Cutting 复用表）：引擎层（`engine/scada-engine.ts`，18 命令面 + applyDiff，**需扩展**：编辑操作→diff 事务 + undo 栈衔接）/ ConfigAdapter nodeById（`engine/config-adapter.ts:16`）/ 图元注册表（`symbols/symbol-registry.ts` + `register-builtin.ts`，24 内置，**需扩展**：属性 schema 统一抽取）/ 序列化（`serialization/{parse,validate,serialize,diff}.ts`，**需扩展**：编辑会话暂存/提交语义）/ 句柄面（`renderer/hooks/use-scada-handles.ts:10-20`，9 方法，**需扩展**：addSymbol/removeSymbol/updateSymbol）/ sky 覆盖物（`engine/interaction-overlay.ts`，**需扩展**：编辑态覆盖物族）/ 测试句柄（`engine/test-handle.ts`）/ 绑定动画（`binding/`）/ 事件派发（`renderer/hooks/use-scada-events.ts`，**需扩展**：编辑态预览派发策略）/ benchmark 基座（`apps/playground/src/pages/scada-perf-scale-demo.tsx`，**需扩展**：编辑态测量档位）。
- **spike 事件族载荷事实（E2.1/E2.4 输入）**：六大事件族真实载荷 + 衔接路径（move/scale/rotate/skew 需适配层节流起止帧 + nodeId 映射；select/hover 直接映射；group/ungroup 需结构 diff；innerEditor 低频直接映射）；leafer Editor 事件携带循环 Leaf 引用**不能直传** `createNormalizedActionEvent`（`packages/flux-react/src/renderer-helpers.ts:98`），需薄适配层抽纯 payload。
- **runtime 设计文档结构参考**：`docs/components/industrial-hmi/`（design-engine.md / design-renderer.md / design-symbols.md / design-data-binding.md，12 节结构）+ scheduling 设计文档先例。
- **目标目录**：`docs/components/industrial-hmi-editor/`（**当前不存在**，E2 Phase 1 创建）。
- **roadmap Phase Status**：E2 `todo`（本 plan 激活时 → `planned`）。
- **真实剩余 gap**：6 份编辑器设计文档均未产出；编辑态画布架构 / 属性 schema 统一抽取 / 连线声明 / undo diff 事务 / 工具箱 / scada-editor-canvas renderer 契约均未设计。

## Goals

- **E2.1**：产出 `design-architecture.md`（编辑器架构：编辑态画布独立 sky Group / 双态隔离机制 / 与 runtime 引擎层衔接：复用 scada-engine vs 独立 editor-engine / 覆盖物挂载形态方案 A 落地 / 编辑会话与运行组态分离提交语义）。
- **E2.2**：产出 `design-property-panel.md`（图元定义属性 schema 统一抽取方案 + 面板字段六类分类 + 编辑期校验衔接 validate 面）。
- **E2.3**：产出 `design-connection.md`（pipe-junction 端点吸附 + custom.connections 声明写入 + 折线重拖 + 连接关系与图元移动联动）。
- **E2.4**：产出 `design-undo-redo.md`（diff 命令栈 + 编辑操作→diff 事务语义 + 跨操作合并/边界提示 + 内存上限）。
- **E2.5**：产出 `design-toolbox.md`（视图工具 / 对齐分布层级 / 复制粘贴 / 导入导出 / 图元库管理）。
- **E2.6**：产出 `design-renderer.md`（scada-editor-canvas renderer type 契约：fields/events/regions/handles + React 桥接 + save/load 提交语义 + 满足编辑态包络）。
- 6 份文档均经独立子 agent per-doc 文档共识审查（≤3 轮）；E3 设计 gate（独立 plan）为终轮复核。
- roadmap Phase Status 回写（E2: `todo` → `planned` 本 plan 激活时；→ `done` 留待 closure-audit 通过）。
- E2 设计契约作为 E4/E5/E7/E9 输入正式交接。

## Non-Goals

- 不实现任何编辑器代码 / renderer / 引擎扩展（E4 包基建 / E5 M1 实现 / E7 M2 / E9 M3 职责）。
- 不创建 `flux-renderers-industrial-editor` 包 or 修改 `flux-renderers-industrial`（E4 职责；E2 只设计，E4.1 才裁定包结构）。
- 不裁定包结构（方案 A 放入既有包 vs 方案 B 新建包）——E4.1 裁定（基于 E2.1 架构设计输入）；E2.1 只给出架构对包结构的影响 input。
- 不执行 E3 设计 gate（独立 plan；E2 只产 per-doc 共识审查，E3 为终轮）。
- 不重新 spike（E0 已 done；E2 消费 spike 事实，设计层若发现新交互 API 需求，登记 Follow-up 由后续 spike 处理，不在 E2 自行 spike）。
- 不修改 runtime mission 的 roadmap / 设计文档（本 plan 仅消费 runtime 能力，设计编辑器侧适配）。
- 不变更选型主路径（路径 A，E1 已裁定）；E2 设计基于路径 A，若设计中发现路径 A 不可行，标记人工确认（R1）而非自行改路径。

## Scope

### In Scope

- **E2.1 编辑器架构设计** `design-architecture.md`：① 编辑态画布架构（独立 sky Group，对齐 design-engine.md §6 预留 E12 模型）；② 双态隔离机制（编辑态开关 editable:true 双向切换 / 编辑会话组态与运行组态分离 / 提交语义衔接 use-scada-config-sync / 状态不泄漏 R5）；③ 与 runtime 引擎层衔接裁定 input（复用 scada-engine applyDiff vs 独立 editor-engine 的 trade-off，供 E4.1 裁定）；④ 覆盖物挂载形态方案 A 落地（leafer Editor 内置 EditBox/EditSelect，editable:true 开关）；⑤ 编辑会话序列化暂存/提交语义（复用 serialization 面，扩展衔接）；⑥ 事件派发链编辑态预览派发策略（建议不派发，编辑会话隔离）；⑦ 满足编辑态包络（E1.2 规格）；⑧ 消费 9 条 spike 设计约束。
- **E2.2 属性面板 schema 设计** `design-property-panel.md`：① 图元定义属性 schema 统一抽取方案（从 `symbols/register-builtin.ts` 24 定义导出声明式 props schema，单源化防双维护漂移 R3）；② 面板字段六类分类（几何/样式/绑定/状态/动画/事件）；③ 编辑期校验衔接 `serialization/validate.ts`（即时报错）；④ 绑定/状态/动画/事件声明**只写声明结构**（config-types.ts 类型，运行时装配零改动）。
- **E2.3 连线设计** `design-connection.md`：① pipe-junction 端点吸附（归一化坐标/流向/目标设备）；② `custom.connections` 声明写入（I9.4 已落地的 connections 结构，编辑器只写声明）；③ 折线重拖；④ 连接关系与图元移动联动；⑤ 序列化往返（flow/dashOffset，design-symbols.md §4.2 既有）。
- **E2.4 undo-redo 设计** `design-undo-redo.md`：① diff 命令栈（逆 diff 撤销，载荷复用 `serialization/diff.ts` ScadaConfigDiff）；② 编辑操作→diff 事务语义（一次拖拽 = 一个 diff，防逐属性 applyAttrs 泄漏；transform 事件族节流起止帧——spike E0.2 §2.5）；③ group/ungroup 结构 diff（addSymbol/removeSymbol，非属性增量）；④ 跨操作合并/边界提示；⑤ 内存上限（10 万图元 MB 级，对齐 design-renderer.md §12.3，不用全量快照 R4）；⑥ 引擎层扩展衔接（applyDiff + undo 栈）。
- **E2.5 工具箱设计** `design-toolbox.md`：① 视图工具（缩放/平移/fit/center 复用引擎命令）；② 对齐/分布/层级（toTop/toBottom）；③ 复制粘贴；④ 导入导出（exportConfig/importConfig 复用句柄面）；⑤ 图元库管理（注册表只读浏览）。
- **E2.6 renderer 契约设计** `design-renderer.md`：① `scada-editor-canvas` renderer type 注册（fields/events/regions/handles，对齐 RendererComponentProps）；② React 桥接（编辑会话与运行组态分离，save/load 提交语义）；③ 句柄面扩展（addSymbol/removeSymbol/updateSymbol 入 SCADA*HANDLE_METHODS）；④ 编辑态测试句柄 `window.\_\_flux_scada_editor*<cid>`；⑤ 满足编辑态包络 + 双态隔离；⑥ 消费 E2.1–E2.5 设计。
- 6 份文档 per-doc 文档共识审查（独立子 agent，fresh session，≤3 轮）。
- roadmap Phase Status 回写 + daily log。

### Out Of Scope

- 编辑器实现代码（E5+）。
- 包基建 / 依赖引入 / 包结构裁定（E4）。
- E3 设计 gate（独立 plan）。
- 重跑 spike。
- runtime mission 代码或文档变更。
- playground demo 页 / e2e 测试（E5/E6/E9）。

## Failure Paths

| 可测场景编号              | 触发                                                                             | 行为（含状态码/错误码）                                                                    | 可重试 | 用户可见表现                                             |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------- |
| design-reuse-overclaim    | E2 任一设计把 runtime "需扩展" 复用点写成"现成可用"（editor-initiation Failure） | 该 design 文档修正为标注扩展衔接路径 + cost；文档共识审查标记 Major                        | 是     | design 文档复用点三态标注修正                            |
| design-mock-leak          | E2 设计引用未在 spike 固化的交互 API（以 mock 推断真实行为）                     | 停止该设计项；登记 Follow-up 由后续 spike 固化后再设计；对齐 gate-3 §3 + docs/bugs/76 教训 | 否     | design 文档标注「待 spike 固化」+ Follow-up Backlog 登记 |
| design-path-blocker (R1)  | E2 设计中发现路径 A 存在不可调和的架构阻断（非 spike 已知）                      | 标记 R1 人工确认（roadmap「人工确认阈值」）；mission 暂停至人工裁决；不自行转路径 B        | 否     | roadmap 出现 R1 标记；E2 暂停；等待人工                  |
| schema-dual-maintain (R3) | E2.2 属性 schema 抽取方案导致面板与图元定义双维护（无单源化）                    | 修正为单源化方案（从定义导出/生成 schema）；文档共识审查标记 Major                         | 是     | design-property-panel.md 修正为单源化                    |
| consensus-round-limit     | 任一 design 文档共识审查循环超 3 轮                                              | 停止循环并升级人工裁决（roadmap Cross-Cutting）                                            | 否     | 文档头部记录超限事实，等待人工                           |

## Test Strategy

本档选择：`不适用：理由` —— E2 是设计文档产出阶段，不涉及任何仓库代码变更（仅新增 `docs/components/industrial-hmi-editor/design-*.md`）。E2 的"验证"由独立子 agent per-doc 文档共识审查承担（核对设计↔runtime 复用点 live 一致性 / 设计↔spike 事实一致性 / 设计可行性）。设计文档不产出自动化测试；实现层测试由 E5/E6/E9 承担。

## Execution Plan

> 6 Phase 按 roadmap E2.1–E2.6 顺序，依赖：E2.1 基础 → E2.2/E2.3/E2.5 依赖 E2.1 → E2.4 依赖 E2.1+E2.3 → E2.6 依赖 E2.2/E2.3/E2.4/E2.5。每 Phase 含 per-doc 文档共识审查。E3 设计 gate（独立 plan）为终轮复核。

### Phase 1 - E2.1 编辑器架构设计

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-architecture.md`（新建）、`docs/components/industrial-hmi-editor/`（目录创建）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Decision`：roadmap Phase Status 回写 E2: `todo` → `planned`（本 plan 激活为 active 时同步执行）；创建 `docs/components/industrial-hmi-editor/` 目录。
- [ ] `Fix`：产出 `design-architecture.md`（参考 runtime design-engine.md 12 节结构），覆盖 Scope E2.1 八项：编辑态画布独立 sky Group / 双态隔离机制（editable:true 开关 + 编辑会话分离 + 提交语义衔接 use-scada-config-sync + R5 不泄漏）/ runtime 引擎层衔接 trade-off input（复用 scada-engine applyDiff vs 独立 editor-engine，供 E4.1 裁定）/ 覆盖物形态方案 A 落地 / 编辑会话序列化暂存提交语义 / 事件派发链编辑态预览策略 / 满足 E1.2 编辑态包络 / 消费 9 条 spike 设计约束。
- [ ] `Proof`：per-doc 文档共识审查——独立子 agent（fresh session），输入 = 本 plan + spike 报告 + E1 选型裁定 + `editor-initiation.md §3/§4` + runtime design-engine.md；核对：① 复用点三态标注无 reuse-overclaim；② 9 条 spike 约束逐条落地；③ 双态隔离机制无状态泄漏路径；④ 与 runtime design-engine.md §6/§12.3 一致。轮次 ≤3，修正项落地。
- [ ] `Fix`：文档头部记录共识审查轮次与判定。

Exit Criteria:

> Phase 1 交付编辑器架构设计契约。纯文档 Phase，无全量验证（plan guide Rule 18）。

- [ ] `design-architecture.md` 落地（8 项设计内容 + 12 节结构对齐 runtime 先例）。
- [ ] per-doc 文档共识审查达成共识（≤3 轮），复用点无 reuse-overclaim，9 条 spike 约束逐条落地，双态隔离无泄漏路径。

### Phase 2 - E2.2 属性面板 schema 设计

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-property-panel.md`（新建）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Fix`：产出 `design-property-panel.md`，覆盖 Scope E2.2 四项：图元定义属性 schema 统一抽取方案（从 `symbols/register-builtin.ts` 24 定义导出声明式 props schema，单源化防 R3 双维护）/ 面板字段六类分类（几何/样式/绑定/状态/动画/事件）/ 编辑期校验衔接 `serialization/validate.ts`（即时报错）/ 绑定状态动画事件声明只写声明结构（config-types.ts，运行时装配零改动）。
- [ ] `Proof`：per-doc 文档共识审查——独立子 agent（fresh session），核对：① schema 单源化方案无双维护（R3）；② 六类字段覆盖 editor-initiation §2.1 属性面板边界；③ validate 衔接路径 live 一致；④ 只写声明结构不触发运行时改动。轮次 ≤3，修正项落地。
- [ ] `Fix`：文档头部记录共识审查轮次与判定。

Exit Criteria:

- [ ] `design-property-panel.md` 落地（schema 抽取方案 + 六类分类 + validate 衔接 + 声明结构）。
- [ ] per-doc 共识审查达成（≤3 轮），schema 单源化（无 R3 双维护），validate 衔接 live 一致。

### Phase 3 - E2.3 连线设计

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-connection.md`（新建）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Fix`：产出 `design-connection.md`，覆盖 Scope E2.3 五项：pipe-junction 端点吸附（归一化坐标/流向/目标设备）/ `custom.connections` 声明写入（I9.4 既有结构，编辑器只写声明）/ 折线重拖 / 连接关系与图元移动联动 / 序列化往返（flow/dashOffset，design-symbols.md §4.2）。
- [ ] `Proof`：per-doc 文档共识审查——独立子 agent（fresh session），核对：① connections 声明结构与 I9.4 live 一致；② 端点吸附坐标模型可行；③ 序列化往返无丢失；④ 只写声明不动引擎。轮次 ≤3，修正项落地。
- [ ] `Fix`：文档头部记录共识审查轮次与判定。

Exit Criteria:

- [ ] `design-connection.md` 落地（端点吸附 + connections 声明 + 折线重拖 + 联动 + 序列化往返）。
- [ ] per-doc 共识审查达成（≤3 轮），connections 结构与 I9.4 live 一致。

### Phase 4 - E2.4 undo-redo 设计

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-undo-redo.md`（新建）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Fix`：产出 `design-undo-redo.md`，覆盖 Scope E2.4 六项：diff 命令栈（逆 diff 撤销，载荷复用 `serialization/diff.ts` ScadaConfigDiff）/ 编辑操作→diff 事务语义（一次拖拽 = 一个 diff，防逐属性 applyAttrs 泄漏；transform 事件族节流起止帧——spike E0.2 §2.5）/ group/ungroup 结构 diff（addSymbol/removeSymbol）/ 跨操作合并/边界提示 / 内存上限（不用全量快照 R4，对齐 design-renderer.md §12.3）/ 引擎层扩展衔接（applyDiff + undo 栈）。
- [ ] `Proof`：per-doc 文档共识审查——独立子 agent（fresh session），核对：① diff 载荷与 `serialization/diff.ts` ScadaConfigDiff live 一致；② 事务语义防逐属性泄漏；③ group/ungroup 结构 diff 路径正确；④ 内存上限不用全量快照（R4）；⑤ transform 节流与 spike E0.2 §2.5 一致。轮次 ≤3，修正项落地。
- [ ] `Fix`：文档头部记录共识审查轮次与判定。

Exit Criteria:

- [ ] `design-undo-redo.md` 落地（diff 命令栈 + 事务语义 + 结构 diff + 合并/边界 + 内存上限 + 引擎扩展衔接）。
- [ ] per-doc 共识审查达成（≤3 轮），diff 载荷与 ScadaConfigDiff live 一致，无全量快照（R4）。

### Phase 5 - E2.5 工具箱设计

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-toolbox.md`（新建）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Fix`：产出 `design-toolbox.md`，覆盖 Scope E2.5 五项：视图工具（缩放/平移/fit/center 复用引擎命令）/ 对齐分布层级（toTop/toBottom）/ 复制粘贴 / 导入导出（exportConfig/importConfig 复用句柄面）/ 图元库管理（注册表只读浏览）。
- [ ] `Proof`：per-doc 文档共识审查——独立子 agent（fresh session），核对：① 视图工具复用引擎命令面（无重复实现）；② 导入导出复用句柄面；③ 图元库管理只读；④ 与 design-engine.md 命令面 live 一致。轮次 ≤3，修正项落地。
- [ ] `Fix`：文档头部记录共识审查轮次与判定。

Exit Criteria:

- [ ] `design-toolbox.md` 落地（视图工具 + 对齐分布层级 + 复制粘贴 + 导入导出 + 图元库管理）。
- [ ] per-doc 共识审查达成（≤3 轮），工具复用引擎/句柄面无重复实现。

### Phase 6 - E2.6 renderer 契约设计 + 跨文档一致性 + E3 交接

Status: planned
Targets: `docs/components/industrial-hmi-editor/design-renderer.md`（新建）、`docs/components/industrial-hmi-editor/design-*.md`（跨文档一致性核对）、`docs/components/roadmap-industrial-hmi-editor.md`（头部记录 + Phase Status）、`docs/logs/2026/08-06.md`（daily log）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] `Fix`：产出 `design-renderer.md`，覆盖 Scope E2.6 六项：`scada-editor-canvas` renderer type 注册（fields/events/regions/handles，对齐 RendererComponentProps + runtime design-renderer.md）/ React 桥接（编辑会话与运行组态分离，save/load 提交语义）/ 句柄面扩展（addSymbol/removeSymbol/updateSymbol 入 SCADA*HANDLE_METHODS）/ 编辑态测试句柄 `window.\_\_flux_scada_editor*<cid>` / 满足编辑态包络 + 双态隔离 / 消费 E2.1–E2.5 设计。
- [ ] `Proof`：per-doc 文档共识审查（design-renderer.md）——独立子 agent（fresh session），核对：① renderer 契约对齐 RendererComponentProps + runtime design-renderer.md；② 句柄扩展与 use-scada-handles.ts live 一致；③ 双态隔离 + 包络满足；④ 消费 E2.1–E2.5 无矛盾。轮次 ≤3，修正项落地。
- [ ] `Proof`：跨文档一致性核对——6 份 design 文档之间无矛盾（双态隔离口径 / 复用点三态 / 包络数字 / 9 条 spike 约束 / 提交语义跨 E2.1+E2.4+E2.6 一致）；与 roadmap + editor-initiation + spike 报告 + runtime design-\*.md 一致。
- [ ] `Fix`：roadmap 头部「文档共识审查记录」追加 E2 条目（6 份文档 per-doc 共识审查摘要 + 跨文档一致性）；Phase Status E2 → `planned`（待 closure-audit 后 → `done`）；Rule 4 review gate 修正项回写（若 per-doc 审查产生范围/顺序修正）。
- [ ] `Fix`：daily log 追加 E2 条目（plan path + 6 Phase 摘要 + 共识审查状态 + closure-audit 状态 + Follow-up）。
- [ ] `Fix`：E2 设计契约作为 E3（设计 gate）/ E4（包基建）/ E5（M1）输入正式交接（E7/E9 经 E5 下游隐式承接）——在 roadmap 或 E2 产物中列输入清单（6 份 design 文档路径 + 关键设计决策 + 待 E4.1 裁定项 + 待 E3 终轮复核项）。

Exit Criteria:

> Phase 6 交付 renderer 契约 + 跨文档一致性 + E3 交接。纯文档 Phase。

- [ ] `design-renderer.md` 落地（renderer 契约 + React 桥接 + 句柄扩展 + 测试句柄 + 包络/双态隔离 + 消费 E2.1–E2.5）。
- [ ] per-doc 共识审查达成（≤3 轮）。
- [ ] 跨文档一致性核对通过（6 份 design 无矛盾 + 与 roadmap/editor-initiation/spike/runtime design 一致）。
- [ ] roadmap 头部 + Phase Status 回写；daily log 追加；E3/E4/E5 输入清单就绪（E7/E9 经 E5 下游隐式承接）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent `ses_0292277e8ffeQzJfhHjXmG3VhA`（fresh session，不复用起草上下文）
- Verdict: `pass-with-minors`
- Rounds: 1（首轮即达成共识：0 Blocker / 0 Major / 3 Minor）
- Findings addressed:
  - **m-1（Minor，保留原状）**：Current Baseline 引 `use-scada-handles.ts:10-20`（实际声明起于 :11）off-by-one——该引用继承自权威文档 editor-initiation §3 + roadmap Cross-Cutting 复用表（均 :10-20），为避免与上游权威文档产生新的跨文档不一致，本 plan 保留 :10-20 原口径（非阻断，live 文件确实存在该面）。
  - **m-2（Minor，已落地）**：Goals 称"E4/E5/E7/E9 输入"但 Phase 6 handoff 仅列 E3/E4/E5 → 补「E7/E9 经 E5 下游隐式承接」于 Phase 6 handoff item + Exit Criteria + Closure Gates 三处。
  - **m-3（Minor，保留原状）**：Phase Status 在 Phase 1（todo→planned 激活时）+ Phase 6（reconfirm planned + done 待 closure-audit）两处触及——语义正确（激活 vs 收口），冗余可接受。
  - 引用全项经 live 核对：10 个 runtime 复用点文件（scada-engine/config-adapter/symbol-registry/register-builtin/serialization 件/use-scada-handles/interaction-overlay/test-handle/binding/use-scada-events）✅ 存在；runtime design-\*.md 4 份参考文档 ✅ 存在（12 节结构 + design-engine.md §6 Editor=独立 sky Group 预留）；docs/components/industrial-hmi-editor/ ✅ 不存在（Phase 1 创建）；scada-perf-scale-demo.tsx ✅；E2.1–E2.6 phase 顺序符合 roadmap 依赖；6 phase 合并为 1 owner plan 符合 Rule 22-26；Rule 14 合规（design 文档在 docs/components/ 非 docs/architecture/，"最终目标设计" 非 "Proposed vs Current"）；Failure Paths 把 reuse-overclaim/mock-leak/R1/R3 正确归为 Failure Path 而非 deferred。

## Closure Gates

> **关闭条件**：所有条目 + 每个 Phase Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。
>
> **纯文档 plan**：本 plan 不涉及任何仓库代码变更（仅新增 `docs/components/industrial-hmi-editor/design-*.md`），`pnpm test`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 这些条目可从 Closure Gates 删除（plan guide「纯文档计划」条款）。6 份 design 文档定稿前须经独立子 agent per-doc 文档共识审查（各 Phase 已含）+ 跨文档一致性核对（Phase 6）；E3 设计 gate（独立 plan）为终轮复核。

- [ ] E2.1–E2.6 六 Phase 全部 Exit Criteria 勾选。
- [ ] 6 份 design 文档全部落地（`docs/components/industrial-hmi-editor/design-{architecture,property-panel,connection,undo-redo,toolbox,renderer}.md`）。
- [ ] 每份 design 经 per-doc 文档共识审查达成共识（≤3 轮）。
- [ ] 跨文档一致性核对通过（6 份无矛盾 + 与 roadmap/editor-initiation/spike/runtime design 一致）。
- [ ] 复用点三态标注无 reuse-overclaim（10 复用点 + 2 新造面 + 3 扩展衔接逐项 live 一致）。
- [ ] 9 条 spike 设计约束逐条在设计文档落地（无 mock 推断）。
- [ ] 双态隔离机制跨 E2.1/E2.4/E2.6 一致（编辑态覆盖物/手柄/工具不污染运行态；R5 不泄漏）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 设计项（6 份文档必须落事实设计；若发现需 spike 的交互 API，登记 Follow-up 并标注「待 spike 固化」）。
- [ ] roadmap 头部 + Phase Status 回写；Rule 4 review gate 修正项（若有）回写。
- [ ] daily log 追加 E2 条目。
- [ ] E3/E4/E5 输入清单就绪（E7/E9 经 E5 下游隐式承接）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。

## Deferred But Adjudicated

_（无——E2 的 6 份设计文档必须在 Exit Criteria 收口；若某设计项依赖未 spike 固化的交互 API，触发 design-mock-leak Failure Path，登记 Follow-up 并标注「待 spike 固化」，不允许 deferred in-scope 设计。）_

## Non-Blocking Follow-ups

- E2 设计中若发现需 spike 固化的新交互 API（design-mock-leak 类），登记 editor mission Follow-up Backlog，由后续 spike 处理（非 E2 收口范围）。
- InnerEditorEvent 文档列举遗漏（roadmap Follow-up Backlog `[E0-spike]`）可在 E2.6 跨文档一致性核对时顺手补 `research-render-engines.md §5:122`，非 E2 收口必需。

## Closure

Status Note: _（完成或关闭时填写）_

Closure Audit Evidence:

- Auditor / Agent: _待独立 fresh-session sub-agent closure-audit_
- Evidence: _待定_

Follow-up:

- _待定（或明确写 no remaining plan-owned work）_
