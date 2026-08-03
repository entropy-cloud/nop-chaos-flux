# I3 Gate 结论：设计文档 review（I2 四份 design-\*.md 终轮复核）

> 日期：2026-08-03
> 版本：v1（I3.1 产出）
> 上游：plan `docs/plans/2026-08-03-2113-1-i3-design-gate-review.md`；讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §八/§九；4 份设计文档 `docs/components/industrial-hmi/design-*.md`（I2.1–I2.4）；调研汇总 `docs/analysis/industrial-hmi/research-summary.md`（I0.5）；项目架构文档 `docs/architecture/renderer-runtime.md` / `flux-core.md` / `flux-runtime-module-boundaries.md`；roadmap `docs/components/roadmap-industrial-hmi.md` 全文；前一 gate 结论 `docs/analysis/industrial-hmi/gate-1-review.md`（I1.1/I1.2，含 §3 实测数字/§4 A1–A5/§6 约束映射）
> 下游：`docs/plans/2026-08-03-2113-2-i4-package-infra-and-leafer-dependency.md`（I4 包基建）、`docs/plans/2026-08-03-2113-3-i5-engine-core-wave1.md`（I5 引擎 Wave 1）
> 依据：roadmap I3.1 + Cross-Cutting（review gate 纪律/文档共识审查不叠加/人工确认阈值/Rule 4）；`docs/references/new-renderer-introduction-audit.md` 仅作设计期预审补充对照（不属审查依据，本文件不以其为准绳）

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session，task `ses_038269c7affe73Ay2yKtzDrR60`）审查，判定 `REVISE`——2 Minor（F1：§4 差异 2 第 1 条编辑器→I16 证据链误列 `symbols §12.2（:233）`，该行实为 `scada-symbol` deferred 内容，已从第 1 条移除；F2：§2 核对项 A 行 research-summary 引注范围 :64-109 未覆盖 §3 V5/V7（:53/:55），已拆分标注），全部落地，未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session，task `ses_03822cb92ffe1INyj2TcmY8gUL`）确认轮，判定 `REVISE`——F1/F2 落地验证通过（第 1 条无 `symbols §12.2` 残留、第 3 条保留；A 行引注拆分正确）；新增 1 Minor（N1：A 行 V5 使用处节标注错——design-symbols.md:41 属 §2 能力对照决策表而非 §4.1，已改为 `symbols §2:41`），已落地。
- **Round 3（2026-08-03）**：独立 agent（fresh session，task `ses_0381d3a60ffeqv6j2yEfh071yS`）确认轮，判定 `AGREE`——N1 落地验证（A 行 `symbols §2:41` 与 design-symbols.md:41 §2 决策表 V5 引用逐字吻合、全文无 `symbols §4.1` 残留）+ 全文通读（判定/修正项/差异裁定/终轮结论/收口清单自洽，抽查引注全部存在，R1/R2 修复无回归），**零新增修正项，达成共识**（共识循环：R1-R2 修正 2 轮 + R3 确认轮，未超轮次上限）。

## 1. 审查输入

### 1.1 证据集

| 类别                     | 文件                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主审对象                 | `design-engine.md`（I2.1）、`design-data-binding.md`（I2.2）、`design-symbols.md`（I2.3）、`design-renderer.md`（I2.4）                                                                                                                                    |
| I0.5 调研结论            | `docs/analysis/industrial-hmi/research-summary.md`（含 §3 V1–V8 / §4.1 E1–E12 / §4.2 D1–D9 / §4.3 A1–A6 / §4.4 S1–S4 / §5 差距分析）；按需对照 `research-render-engines.md` / `research-scada-apps.md` / `research-supplement.md` / `research-download.md` |
| 项目架构文档             | `docs/architecture/renderer-runtime.md`、`flux-core.md`、`flux-runtime-module-boundaries.md`                                                                                                                                                               |
| roadmap                  | `docs/components/roadmap-industrial-hmi.md` 全文（Purpose/执行必读/Phase Status/Work Items I0–I16/Phase Details/Dependency Graph/Cross-Cutting/Rule）                                                                                                      |
| 前一 gate 证据           | `docs/analysis/industrial-hmi/gate-1-review.md`（§3.2 实测 11 行数字、§3.3 判定口径、§4 A1–A5、§5 选型结论、§6 I2 约束映射）                                                                                                                               |
| 补充对照（不属审查依据） | `docs/references/new-renderer-introduction-audit.md`（INV-1–INV-5）；`design-renderer.md` §12.2 五边界审计预审快照仅做内部一致性核对                                                                                                                       |

### 1.2 任务范围摘要（讨论文件 §八 8 条最终决策）

1. 范围：运行时渲染优先（引擎 + 图元库 + 数据驱动 + 画面渲染）；编辑器后置为后继 mission（I16 仅立项入口，不实现）。
2. 选型：LeaferJS（leafer-ui）为渲染底座（MIT/百万图形/70KB/Editor 插件）；组态语义层（点表/绑定/动画/图元模型/组态 JSON/React 桥接）自研。
3. 数据模型：双轨——组态内点表（自包含）+ flux 表达式 `$xxx` 桥接。
4. 组件形态：单 renderer type `scada-canvas`，props 内嵌组态 JSON；图元级 type（`scada-symbol`）后置（§九 待定事项）。
5. 测试：纯逻辑 Vitest 单测 + Playwright e2e 程序化断言（测试句柄 `window.__flux_scada_<cid>` 读场景树；无截图、无 node-canvas）；Benchmark 对标 LeaferJS 官方性能档。
6. 回顾机制：roadmap 固定 4 个 review gate（I1/I3/I7/I12），每个由独立 agent 对照上游产物审查。
7. 调研下载：`~/sources/industrial-hmi-research/`（6 组 clone + 浅调研补充）。
8. 产物：`missions/industrial-hmi.json`、roadmap、讨论记录、调研报告、设计文档。

### 1.3 差异清单（设计文档 vs roadmap，逐项裁定见 §4）

1. **依赖清单措辞差异**：roadmap 总览「依赖引入 `leafer-ui`（+ 按需 `@leafer-ui/core`/`@leafer-ui/draw`）」（roadmap:81）vs design-engine.md §4.2/§12.2 强制 `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9`（gate-1 A1：viewport 插件需显式 `tree: { type: 'viewport' }`）。
2. **范围一致性**：设计文档非目标（编辑器 → I16；报警/趋势不内置；`scada-symbol` 注册契约 deferred）vs roadmap/讨论 §九。
3. **顺序一致性**：设计文档实现映射（I4.1/I4.2 → I5.1–5.4 → I6.1–6.4 → I10.x → I11.x）vs roadmap 依赖图与 work items。
4. **选型一致性**：leafer-ui v2.2.9 版本锁定 + LeaferJS 底座 + 自研语义层决策跨设计文档/roadmap/gate-1 一致。
5. **性能包络一致性**：验收包络（10 万图元 ≥45fps / 首屏 <2s / 内存 ≤320MB；1 万点刷新 <200ms）与 I1.2 spike 数字在 design 文档中的引用 vs gate-1-review §3.2 逐项一致。

## 2. 审查判定

**判定：`pass-with-minors`**——0 Blocker、0 Major、2 Minor（m-1 为 roadmap 回写项，m-2 为 design-engine.md 数字分解精度项）。设计决策本身不重新裁决（I2 共识已确立），本 gate 只检查一致性/完整性/符合性。

审查范围核对摘要（A–G 逐项，均以实际文件核对）：

| 核对项                                                  | 结果 | 关键证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. 各文档引注与 research-summary/gate-1-review 逐条相符 | ✅   | E1–E12/D1–D9/A4/A5/S1–S4 引注编号与内容全部对上 research-summary.md:64-109（§4.1–§4.4）；V5/V7（§3 选型验证点 @:53/:55）与使用处（engine §2:40、symbols §2:41）核对一致；A1–A5 映射逐条存在（engine §12.1/data-binding §12.1/renderer §12.1/symbols §12.1）                                                                                                                                                                                                                                                                            |
| B. 跨文档一致性（句柄/测试句柄/类型/命名/术语）         | ✅   | 引擎 §8.2 句柄清单被其余 3 档一致引用（data-binding:125、symbols:197、renderer:157/219/221/237）；测试句柄契约 engine §8.3 ↔ renderer §8.4 ↔ data-binding §7 一致；`ScadaConfig`/`ScadaSymbolProps`/点表/绑定/状态/动画类型互通；命名约定 symbols §4.4 ↔ renderer §4.2 双向对齐                                                                                                                                                                                                                                                        |
| C. 与 live repo 架构模式符合                            | ✅   | `createNormalizedActionEvent` 单参签名核实（renderer-helpers.ts:98，`FluxActionEvent` @ flux-core/src/types/actions.ts:307）；`registerSchedulingRenderers` 模式核实（flux-renderers-scheduling/src/index.ts:22-24）；RendererComponentProps 契约（quick-reference.md:66-96）；useScopeSelector/useActionDispatcher 复用（roadmap 平台能力复用表）；域核心无 React 依赖（engine/binding/symbols §11）；INV-4 域状态不进 scope（4 档 §7 均声明）；`RendererEnv.fetcher/importLoader/stream/openSocket` 存在（renderer-env.md:16,23,43） |
| D. 完整性 vs roadmap I2.1–I2.4 work item 内容           | ✅   | I2.1 引擎（§4.2 生命周期/§4.3 场景树/§6 图层/§4.4 坐标/§4.5 渲染循环/§4.6 性能策略）；I2.2 绑定动画（§4.1–§4.5）；I2.3 图元模型（§4.1–§4.4）；I2.4 序列化与 renderer 契约（§4.2–§4.3、§5–§8）——各 work item 要求内容齐备                                                                                                                                                                                                                                                                                                               |
| E. 4 档共识记录完整且无预写判定/悬空引用                | ✅   | 各档头部 Round 记录均为已发生事实（engine R1-R2/symbols R1-R4/data-binding R1-R3/renderer R1-R2）；「终轮复核说明（I3.1 gate）」bullet 4 档齐备                                                                                                                                                                                                                                                                                                                                                                                        |
| F. design-renderer.md 头部 5 行交叉核对记录准确         | ✅   | 5 行契约锚点与结果逐行核实（类型命名/三源/绑定状态动画/scada-canvas fields 单字段承载/A2 测试句柄）均与实际文档一致                                                                                                                                                                                                                                                                                                                                                                                                                    |
| G. 无遗留占位符（待填写/TBD）                           | ✅   | 4 档全文扫描无「待填写」/「TBD」/「TODO」；「§九 待定事项」均为对讨论文件 §九 的正常引用                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## 3. 修正项清单

### m-1（Minor，一致性）

- **位置**：roadmap `docs/components/roadmap-industrial-hmi.md` 总览（:81）
- **描述**：总览依赖措辞「依赖引入 `leafer-ui`（+ 按需 `@leafer-ui/core`/`@leafer-ui/draw`）」与设计契约不一致：① 遗漏 `@leafer-in/viewport`——该插件为 **A1 固化必需依赖**（gate-1-review §4 A1：默认 `'design'` 类型无平移/缩放，需显式 `tree: { type: 'viewport' }`；design-engine.md §4.2 写死该配置），spike 工程亦使用 `leafer-ui 2.2.9 + @leafer-in/viewport 2.2.9`（gate-1-review §3.1）；②「按需 `@leafer-ui/core`/`@leafer-ui/draw`」为过时表述——core/draw 是 leafer-ui 的**内部子包**（research-download.md:30,107），没有任何设计文档或 plan 采用直接引入它们的方式。
- **要求修正**：roadmap 总览依赖措辞回写为 `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9`（对齐 design-engine.md §12.2 版本锁定与 I4 plan 依赖清单；roadmap Rule 4 回写）。
- **类别**：一致性（roadmap ↔ 设计契约 ↔ gate-1 证据）

### m-2（Minor，一致性/精度）

- **位置**：design-engine.md §4.6 性能基线表「组态 JSON 加载」行（:131）
- **描述**：实测分解「178.9 ms（parse 23.4 + 实例化 88.5）」与所引证据 gate-1-review §3.2 #8（:55）「178.9 ms（JSON 11.6 MB：parse 23.4 + 实例化 88.5 + 渲染）」不一致——设计文档分解遗漏「渲染」分量（23.4 + 88.5 = 111.9 ≠ 178.9，约 67 ms 无归属），读者无法由分解复核总数。
- **要求修正**：分解补全为「parse 23.4 + 实例化 88.5 + 渲染 ~67」（或直接引用 gate-1-review §3.2 #8 口径）。
- **类别**：一致性（与 gate-1 实测数字引用精度）

## 4. 差异清单裁定

### 差异 1：依赖清单措辞——**裁定：需修正（Minor，m-1）**

- **理由**：设计契约侧（design-engine.md §4.2 写死 `type: 'viewport'`、§12.2 版本锁定 v2.2.9；gate-1 A1 约束；spike 工程依赖）已一致指向 `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9`；**I4 plan（`docs/plans/2026-08-03-2113-2-i4-package-infra-and-leafer-dependency.md`）已先行解析实现侧清单**：:16（spike 依赖记录）、:27（I4.1 目标）、:45/:79/:81（`pnpm add leafer-ui@2.2.9 @leafer-in/viewport@2.2.9`）、:121（Closure Gate 断言）——实现层无风险。剩余问题仅为 roadmap 总览文本与契约不一致（编排层快照失真），属 Rule 4 回写范围，按 m-1 落地；不构成 Blocker/Major（总览本身声明"本文是编排层，不是设计契约"，roadmap:25，I4 plan 为执行权威）。
- 「按需 `@leafer-ui/core`/`@leafer-ui/draw`」裁定：**过时**，应移除（core/draw 属 leafer-ui 内部聚合子包，research-download.md:30,107；无设计/plan 采用直接引入）。

### 差异 2：范围一致性——**裁定：一致，无修正**

- 编辑器 → I16：roadmap I16（:60,232）、讨论 §八 1（:124）、engine §1 非目标（:24）、renderer §1 非目标（:33）全链一致。
- 报警/趋势不内置：data-binding §9.3（:256）+ §2 决策表（:45），与 roadmap 无冲突（roadmap 未在 I 阶段列报警/趋势 work item）。
- `scada-symbol` 注册契约 deferred：symbols §3（:50）/§12.2（:233）、renderer §1（:32）/§12.3（:320）、roadmap 总览（:82）、讨论 §九（:159）一致。

### 差异 3：顺序一致性——**裁定：一致，无修正**

- 设计文档实现映射与 roadmap 依赖图/work items 逐项吻合：engine §11（:233，I5.1/I5.2/I5.3/I6.4/I10.1）、§12.3（I5/I6/I14/I15.2/I16）；data-binding §11（I6.1–I6.3）、§12.3（I6.1–I6.3/I10.3/I11.1）；symbols §12.3（I5.4/I8.1–8.3/I9.1–9.4）；renderer §11（:293，I4.1/I4.2/I5.3/I10.1–10.3/I11.1–11.2）+ §12.4；roadmap 依赖图（:306-324）与 work item 依赖列（如 I5.3 依赖 I2.1+I5.2、I6.4 依赖 I2.4+I5.1、I10.3 依赖 I6.1+I10.1）全部可对上。无跳序/逆行映射。

### 差异 4：选型一致性——**裁定：一致，无修正**

- leafer-ui v2.2.9 版本锁定：gate-1 §3.1（:39）+ engine §1（:21）/§2 决策表（:35）/§12.2（:249）+ I4 plan（:16,27,45,79,81,121）一致（roadmap 未钉版本但属差异 1 措辞问题，随 m-1 回写）。
- LeaferJS 底座 + 自研组态语义层：讨论 §八 2（:125）/§九（:148）、roadmap（:75）、gate-1 §5（:84）、engine §2（:29）、data-binding §2、symbols §2、renderer §2 决策表全链一致，无冲突项。

### 差异 5：性能包络一致性——**裁定：一致（1 处分解精度 Minor = m-2）**

- 验收包络（10 万 ≥45fps / 首屏 <2s / 内存 ≤320MB / 1 万点 <200ms）：roadmap（:85）、engine §1（:23）/§4.6、讨论 §九（:153）一致。
- I1.2 数字引用逐项对照 gate-1-review §3.2：165.3 ms（#1）、114.3/174.2 fps（#3/#4）、屏内 1.9–2.4 ms（#7）、16.9–19.7 ms（#9）、47.5 MB（#10）、448.4 MB（#11）在 engine §4.6/§12.2 与 data-binding §4.3 中引用全部精确；唯一偏差为 §4.6 组态 JSON 加载行的分解遗漏（m-2）。口径声明（吞吐代理/指针端到端 17–29 fps/I14 复测）在 engine §4.6（:133）与 §12.2（:252）完整保留。

## 5. 终轮复核结论

- **I2 设计文档「文档共识审查」终轮复核：未达成（差 1 项落地）**——本轮产生 2 项新增修正（m-1 属 roadmap 回写项，不涉及设计文档文本；m-2 落于 design-engine.md §4.6）。按 roadmap Cross-Cutting 共识判据（连续一轮 0 新增修正项），存在未落地修正即未达成；**I3.2 将 m-1/m-2 落地后，经确认轮复核（0 新增）即达成共识**。共识循环轮次：本次为终轮复核第 1 轮，落地确认后闭环，未超 ≤3 轮上限。
- **人工确认阈值：未触发**——m-1/m-2 均为措辞/数字精度类修正，不涉及范围/顺序/选型变化；引擎选型变更、`scada-canvas` 公共契约重大变更、benchmark 不达标、共识循环超 3 轮、编辑器提前启动均未发生。**显式声明：无人工确认触发，I4/I5 可在 I3 收口后按序推进**。

## 6. I7 gate 注意项（若有）

供 I7（实现对照 gate）复核的观察项，均为实现期需对照契约核对、但不构成本 gate 修正的注意点：

1. **A1 固化落实**（I5.1）：`ScadaCanvasEngine.create` 中 App/tree 创建参数必须写死 `tree: { type: 'viewport' }` 且不暴露配置项——I7 对照 design-engine.md §4.2 逐字核验。
2. **测试句柄契约落实**（I5.1/renderer I10.1）：`window.__flux_scada_<cid>` 结构（engine/tree/app/getSymbol/getPointValue/getViewport/forceRender）与 cid 传递链（RendererResolvedProps.cid → ScadaEngineOptions.cid）实现一致性；句柄挂载/移除所有权在引擎侧（engine/test-handle.ts）。
3. **`applyAttrs` 唯一批量写入口**：实现不得泄漏逐点写 API（I5.x），symbols `setSymbolProps`/renderer `component:setPointValue` 必须收敛到 `applyAttrs` 路径（合帧义务）。
4. **leafer 配置透传拼写**：`lazySpeard`（非 `lazySpread`）与 `changedThreshold` 键名透传易错（design-engine.md §4.1），I7 对照源码键名核验。
5. **I5.3 序列化 perf 基线**：`parse 23.4 + 实例化 88.5 + 渲染` 全分解口径（m-2 落地后）作为 serialization 性能验收参考，对照 spike 口径。
6. **I10.2 五边界审计**：renderer-definitions fields 规则（`config`/`loading`/`empty`/`events.*`）与 design-renderer.md §12.2 预审快照的一致性；组态 JSON 双 schema 漂移兜底（§4.2 注 + 交叉核对清单）。
7. **注册机制对齐**：`registerScadaRenderers`/`registerScadaSymbol` 与既有 `registerSchedulingRenderers`/`registerRendererDefinitions` 模式的对齐（禁重复实现注册机制）。
8. **e2e 测试锚点**：I15 e2e 必须经测试句柄程序化断言（禁截图判定、禁 node-canvas），句柄缺失时视为测试基建缺陷而非降级截图。

## 7. 收口动作清单（本文件定稿后由 I3 plan 执行）

- **I3.2 落地 m-1**：roadmap 总览（:81）依赖措辞回写为 `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9`（移除「按需 core/draw」表述，对齐 I4 plan 清单；roadmap Rule 4）。
- **I3.2 落地 m-2**：design-engine.md §4.6（:131）组态 JSON 加载行分解补全「渲染」分量；同步补该文档头部共识记录（I3.1 gate 修正条目）。
- roadmap 头部「文档共识审查记录」块新增 I3.1 gate 记录条目（判定 `pass-with-minors`、修正项摘要、审查 task id）——对齐 I1.1 gate 回写先例。
- 四文档交叉一致性复核：修正后 schema/fields/Symbol 属性映射/点表绑定仍一致（沿用 I2.4 核对清单 5 行）。
- `gate-2-review.md` 自身经独立子 agent（fresh session）文档共识审查（≤3 轮，0 新增修正项即共识）。
- I2 设计文档共识达成（m-1/m-2 落地后确认轮 0 新增）→ roadmap Phase Status I3 回写 `done`（前置：独立 closure-audit 通过）。
- `docs/logs/2026/08-03.md` 记录本 gate 产出摘要。
- 无人工确认项：未触发「人工确认阈值」，无需标记暂停。
