# R6 M1 调研阶段开放审计（open audit）

> Auditor: 独立 fresh sub-agent（open audit；与 R1-R4 执行者、R5 深度审计员均无共享上下文，未复用任何执行会话材料）
> Date: 2026-10-30
> 审计对象:
>
> - `docs/analysis/business-replication/r1-erp-page-inventory.md`（R1，plan 786）
> - `docs/analysis/business-replication/r2-ai-mes-mall-page-inventory.md`（R2，plan 787）
> - `docs/analysis/business-replication/r3-entropy-iot-page-inventory.md`（R3，plan 788）
> - `docs/analysis/business-replication/r4-capability-gap-matrix.md`（R4，plan 789）
> - R5 深审报告：`docs/audits/business-replication/r5-research-deep-audit.md`（Pass）
>   审计依据:
> - `docs/audits/00-audit-execution-guide.md`（Pass = 零 Blocker AND 零 Major；open-ended = 对抗性、信号驱动的无清单探查）
> - `docs/backlog/business-page-replication-roadmap.md` L21 审计纪律（open audit：独立 fresh sub-agent 开放评审，不复用执行者上下文）
>   上游仓库: `~/app/nop-app-erp`、`~/app/nop-app-mall-wt/nop-app-mall-master`、`~/app/nop-entropy`、`~/app/nop-app-iot`
>   方法: 三个自由评审面（结论可信度挑战 / 方法论盲区 / 下游可用性），全部结论以 live repo + 上游四仓实证取证。**不复核 R5 已覆盖的六类核对**（type 归属 30 条、上游锚点 35+ 条、G 分级三方一致 12 条、依据链 12 行、跨文档计数、contract drift）——本次抽检中凡与 R5 覆盖面重叠的事实均直接采信 R5 结论，只在其外围做对抗性延伸。除本报告外未修改任何文件。

---

## 结论速览

**Verdict: Fail**（零 Blocker、**2 Major**、6 Minor）。

定性说明（重要）：

1. R5 已证实的全部**事实性声称**在本次开放审计中**无一被推翻**——六次针对具体分级/可行性结论的反驳尝试，四次被 live 证据击退（C1 拖拽绑定、C2 calendar、W2 gantt、W1 扫码链），两次部分成立（总体可行性结论的评估面、G9 缺口表述）。
2. 两条 Major 均为**机制/交接缺陷**而非事实错误：① R4 §4 登记映射丢失 G9（K2 的"能力扩展→先登记→再临时过验收"承重链断裂，违反 roadmap M3 前言的强制时序）；② "21/21 页均可过验收"结论的评估面只覆盖了 roadmap §1 验收三支柱中的一柱（renderer 覆盖），axe/focus 两柱未评估且存在两项已归档的反向信号（map 路由 axe 超时排除、mobile 族零 axe 覆盖）。
3. 修复成本低：R4 §4 补一条登记去向 + R4 §1 汇总行加限定语 + D1 增设两节（axe 策略、验证项/底账对账清单）+ 三份盘点标注词汇统一。修复后按审计指南复审即可放行 M2。

---

## 1. 评审面一：结论可信度挑战（对抗性反驳尝试）

方法：挑选"若要推翻 M1 结论，最值得攻击"的分级/可行性条目，逐条构造反驳论点，再以 live repo 实证裁决。反驳成立 → finding；被击退 → 记录反驳过程（本身也是对结论的增益验证）。

### 1.1 反驳 C1（商机漏斗看板）"直接组合"——**反驳不成立（结论保持）**

- **反驳论点**：C1 的头牌交互是"拖拽阶段流转"，上游 `opportunity-kanban.page.yaml` L6 明确裁决"不使用拖拽"，roadmap §4 也把"kanban 拖拽阶段流转的深度（C1）"列为已知缺口；R4 一边把拖拽落点→moveStage 绑定推迟到"D2 设计时验证"，一边把 C1 判为直接组合——承重交互未验证就给绿色分级，过度乐观。
- **取证**：`packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx` L146-158：`onCardMove` 事件携带完整 payload（cardId/fromColumnId/toColumnId/fromIndex/toIndex/card），事件经 `eventCtx` 进入 action 上下文；kanban 目录下存在 `kanban-dnd-integration.test.tsx`、`kanban.integration.test.tsx`、`kanban-ownership-gating.test.tsx` 等成套集成测试。更强的先例在交付物自己手里：R2K2 已登记上游活页 `ErpCsTicket/kanban.flux.yaml` 的 `onCardMove` 按目标列路由 assign/start/resolve/close/reopen mutation——同一生态内"看板拖拽→mutation"已被真实页面消费。C1 还有 fallback（上游自用的 dialog 换阶段模式）。
- **裁定**：直接组合分级成立；但 R4 G2 的证据链只引了 missing-components/improvement 旁证，**未引用 R2 自己包含的最强先例**（kanban.flux.yaml onCardMove）与本仓集成测试——证据链缺陷并入 Minor-1。

### 1.2 反驳 C2（客户 360）"直接组合/全要素现成 type"——**反驳不成立（结论保持）**

- **反驳论点**：C2 依赖 calendar，而 R1C2 自己登记了"上游 `ErpCrmActivity/calendar.page.yaml` L4 渲染报错降级为分组卡片"——同源生态的 calendar 实页是坏的，flux 侧 calendar凭什么"现成"？
- **取证**：本仓 calendar 能力有完整背书链：`apps/playground/src/pages/calendar-demo.tsx` + `calendar-perf-scale-demo.tsx` + `component-lab/renderers/calendar-lab-page.tsx` 三级 demo；e2e 有 `calendar-demo.spec.ts`、`calendar-grid-shape.spec.ts`、`calendar-interaction-state.spec.ts`、`calendar-perf.spec.ts`、`cal-replica-interactions.spec.ts` 五个 spec。上游降级是上游那次实现的问题，不构成 flux 侧能力反证。
- **裁定**：C2 结论成立。R4"上游 calendar 降级项在 flux 侧回归验证"的措辞过于保守——风险实际已被本仓 e2e 大幅 retire，证据可以引得更硬（增益观察，不立 issue）。

### 1.3 反驳 W2（拣货路径看板）"直接组合"——**反驳不成立（结论保持）**

- **反驳论点**：R1W2 给 gantt 标注"bars/links/zoom/CPM"，若 gantt 实为骨架实现（只渲染静态 bars），W2 的核心可视化就是纸面能力。
- **取证**：`packages/flux-renderers-scheduling/src/gantt/` 下 `cpm.ts`+`cpm.test.ts`（CPM 真实实现）、`gantt-links.tsx`+`gantt-links-delete.test.tsx`（links）、`gantt-zoom-fit.test.ts`+`gantt-header-zoom-fit.test.tsx`（zoom）、`gantt-keyboard-edit.test.tsx`（键盘编辑）、`undo-stack.ts`（撤销）——四项声称全部有实现与测试。
- **裁定**：R1W2 的 gantt 能力描述成立，W2 直接组合保持。

### 1.4 反驳 W1（PDA 收货/上架）"直接组合"——**反驳不成立（结论保持）**

- **反驳论点**：W1 的"扫码→校验→落行→清空续扫"闭环依赖 barcode-input 与 action 编排的深度配合；若 barcode-input 只有扫码 UI 没有事件/队列契约，闭环不成立。
- **取证**：`packages/flux-renderers-scheduling/src/barcode-input/barcode-input.types.ts` L28-40：`batchMode`（"accumulates scanned barcodes in a queue for batch submission"）+ `onScan`/`onScanError` 均为 ActionSchema 契约；`barcode-input-schemas.ts` L61/L69-70 对应字段规则；R5 已实证离线队列（overlay L80 + barcode-queue-utils）。W1 的 action 编排属 flux-action-core 既有职责。
- **裁定**：W1 直接组合保持。

### 1.5 反驳总体可行性结论"21/21 均可过验收——整体可行，无阻塞性缺口"——**反驳部分成立（→ Major-2、Minor-4）**

- **反驳论点**：roadmap §1 定义验收为三支柱（程序化 e2e 交互断言 + axe a11y 基线 + focus 管理），且明文"不接受'看起来像'"。R1-R4 的全部可行性论证只覆盖第一柱（renderer type 覆盖）；后两柱零评估。若 axe/focus 维度存在已知的硬障碍，"无阻塞性缺口"就是超出证据范围的结论。
- **取证（两项已归档的反向信号）**：
  1. `tests/e2e/a11y-axe-baseline.spec.ts` L13-19（PH-17，roadmap §3 指定 F1 复用的设施）：axe 基线仅 7 条路由，且 **map-demo 被显式排除**——spec 注释原文"its axe analysis exceeds a practical timeout (heavy SVG DOM, >120 s single-worker in the plan 781 count run)"。V3 以 map（OpenLayers SVG DOM）为底座，F1 对 V3 的 axe 扫描可能重演超时，而 R1-R4 无任何一处登记此风险。
  2. 7 条 axe 基线路由中 **mobile 族零覆盖**（W1/M3/S1 三页为 mobile 交互主战场），pivot/input-table/detail-view/kanban/calendar 也无 axe 先例（仅 gantt/crud/dashboard/ai 族有）。复刻页 axe 首基线的违规面完全未知，而 mobile/自绘近似形态（吸底栏、floating-panel 近似）恰是 axe 高危区。
- **附带张力（→ Minor-4）**：R4 V3"绘制/轨迹/流媒体不做交互验收"与 roadmap §1"不接受'看起来像'"冲突；roadmap M3 V3 行明列"围栏绘制"，该 W-item 定义被 R4 静默收窄（有披露、无裁定记录）。
- **裁定**：反驳成立。结论措辞超出了被评估的维度（详见 Major-2、Minor-4）。

### 1.6 反驳 G9（桌面端 countdown）"能力扩展"——**反驳部分成立（→ Major-1、Minor-3）**

- **反驳论点 A（登记丢失）**：R4 §2 给 G9 的建议登记去向是"missing-components 新 type 候选"，但 §4 登记映射汇总的三个清单里都没有 G9——孤项。
- **取证 A**：grep "G9" 在 R4 全文仅命中 4 处：L28（§1 K2 行）、L55（§2 表行）、L74（§2 汇总）、L80（§3.3"可登记"）。§4 三个清单逐项核对：improvement 候选 = G1/G14/G22/G24；missing-components 候选 = G5/G10/G15/G19/G21/G23/G25 + G26 播放器半条；不登记 = G2/G3/G4/G6/G7/G8/G11/G12/G13/G16/G17/G18/G20 + G26 iframe 半条。**G9 三处皆无**。§4 自述"供 F2 缺口沉淀与 D 阶段设计引用"——F2 按 §4 执行会静默丢失 G9。而 roadmap M3 前言规定"扩展/新类型类**先落缺口登记**再以临时形态过验收"：K2 以"静态剩余时长文本"过验收的前提恰是 G9 已登记。**成立 → Major-1**。
- **反驳论点 B（缺口表述不精确）**："countdown 仅 mobile 包注册（桌面端无）"暗示桌面不可用；但本仓 renderer 注册是全局共享的——`packages/flux-bundle/src/index.tsx` L44-54 `registerDefaultFluxRenderers` 将全部包（含 `registerMobileRenderers`）注册进同一个 `FluxRendererRegistry`，mobile type 在任意页面（含桌面 dashboard 页）均可解析。旁证：同为 mobile-only 注册的 `notice-bar`（`mobile-renderer-definitions.ts` L313 唯一注册点）被 R2M1 直接用作桌面车间大屏的跑马灯且未立任何缺口——两个 mobile-only type 一个立缺口、一个不立，口径不一。countdown 的真实约束更可能是"表格行内 cell 级倒计时的集成方式"而非"桌面端无此 type"。
- **取证 B**：`flux-bundle/src/index.tsx` L11/L53（mobile 注册进共享 registry）；notice-bar `schemas.ts` L96-104 确有 `text?: string | string[]` + `scrollable`/`loop` 多文本轮播能力（M1 用法本身成立）。
- **裁定**：部分成立——G9 分级（能力扩展）可保持，但表述需精化、口径需统一（→ Minor-3）；登记孤项独立成 Major-1。

### 1.7 评审面一小结

| 反驳目标                      | 反驳结果     | 产出                       |
| ----------------------------- | ------------ | -------------------------- |
| C1 直接组合（拖拽绑定）       | 不成立       | 证据链缺陷记录（→Minor-1） |
| C2 直接组合（calendar）       | 不成立       | 证据可引得更硬（观察）     |
| W2 直接组合（gantt 深度）     | 不成立       | —                          |
| W1 直接组合（扫码闭环）       | 不成立       | —                          |
| "21/21 可过验收"总体结论      | **部分成立** | Major-2、Minor-4           |
| G9 能力扩展（桌面 countdown） | **部分成立** | Major-1、Minor-3           |

16 页"直接组合"中被攻击的 4 页全部守住——页面级 renderer 覆盖分级的质量是可靠的；被攻破的是**总体结论的评估边界**与**登记交接机制**。

---

## 2. 评审面二：方法论盲区扫描

### 2.1 输入源盲区：上游 roadmap 之外，两类证据源未被系统性使用

1. **上游自有 flux 活页语料**（数量级最大的一类）：`find` 实证 nop-app-erp 有 **132 个 `.flux.yaml`** 页面、mall 仓 10 个（nop-entropy/nop-app-iot 为 0）。R1/R3 完全未触及 flux 系页面（只采了 AMIS 系 `.page.yaml`），R2 仅用了 module-cs 的 2-3 个。其中与复刻页直接同构的活页包括：`module-inventory/erp-inv-web/.../dashboard/main.flux.yaml`（KPI+chart+crud+`refreshSource`/`then` 级联刷新链——即 C3/I2/W3 的页面骨架活样）、`module-hr/.../team-vacation-calendar.flux.yaml`、`module-hr/.../org-chart.flux.yaml` 等。**诚实性限定**：该语料是上游自有方言（大量使用 `i18nEn`，本仓 `packages/*/src` 全文无此字段），**不能直接当作本仓 contract 证据**；但 R2 已采信其交互语义（kanban onCardMove），且动作链词汇 `refreshSource`/`then` 与本仓 `flux-guide/01-quickstart.md` L47/L70 一致——作为 M2 的页面结构与动作编排设计参考，它是现存最强的模板库。R1 的盘点章程明文包含"模块 UI 中的典型复杂页面清单"，flux 系半边未入视野属章程内输入的系统性半开采（→ Minor-1）。
2. **本仓自身的能力证据下沉层**（demo/e2e/事件契约）：R1-R4 的能力声称止步于"type 注册存在"，多处标"待核/回归验证/D2 验证"的项，本仓 live 当期即可闭合——kanban onCardMove 契约（1.1）、calendar demo+5 e2e（1.2）、gantt CPM/zoom/links（1.3）、barcode onScan/batchMode（1.4）、`button-group-select`（form 包实存，S1 近似方案成立）、notice-bar 多文本轮播（1.6）。调研阶段的验证债若能在 M1 当期闭合，D2 的设计输入确定性更高（→ Minor-1）。

### 2.2 登记底账盲区：improvement-analysis 只被当"冲突核对"用，未当"已知弱点清单"用

R4 对 improvement-analysis 的使用仅限"导出/echarts 不采纳"冲突裁定（G6/G1）。但该文档 §1.2 的 **P0 缺口族（select/table/crud）与 8 处契约漂移**正是"既有组件与 schema 表面承诺不符"的登记簿——恰是页面分级最需要的风险源。对账抽查结果（live 复核）：

- 部分 P0/漂移**已被后续修复**（底账滞后）：`input.tsx` L166-167 minLength/maxLength 已接 nativeAttrs 且有 `input-validation-drift.test.tsx`；condition-builder 有 `condition-builder-drift.test.tsx`/`c3-3-schema-contract-honesty.test.tsx`。
- 部分**已演化为显式 opt-in 契约**（需页面显式配置）：crud 跨页选择保留 = `keepOnPageChange`（`crud-schema.ts` L172、`crud-renderer-definition.ts` L204）——**O2 HITL 审批收件箱的"多选+批量通过"若跨页即依赖此 flag**，R3O2/R4O2 的缺口列（G21/G22）均未携带该契约知识。
- table P0（缺列宽 resize/多列排序/单元格合并）对 21 页中几乎所有列表页有体验影响，未进入任何页面风险注记。
- 条件方向也成立：R1-R4 引用的底账行号均属实（R5 已核），问题是**对账方向缺失**——既没用底账校准页面风险，也没发现底账本身滞后（→ Minor-2）。

### 2.3 标注体系盲区：〔flux 侧预期〕词汇表漂移

R1/R2 §0 只定义两态标注（无标注=上游明示 / 〔flux 侧预期〕），R3O2 ② 出现第三态**〔常规推导〕**未在 §0 声明；R2K1 ②"Enter 提交、字数上限、附件"等 UI 细节更接近"对标形态推导"（MaxKB/FastGPT 形态），按 R2 自己的约定应属未标注的灰色地带。标注体系是这套交付防"把推测包装成上游明示"的核心机制（R5 §7 亦确认其执行严格），词汇在三份文档间漂移会削弱下游对要素来源的判别（→ Minor-5）。

### 2.4 候选页纳入评估：41 个候选页是否有应纳入 1.0 的——**结论：无必须纳入项**

21 页已覆盖 roadmap 八方向的全部承重 renderer 族（mobile/scheduling/data/pivot/dashboard/content/layout/ai/form-advanced/map/industrial）。唯一未被任何 1.0 页面触及的 renderer 包是 3d/graph/print 三包，但它们不在本 roadmap 八方向的目标域内，不构成范围缺陷。一个观察供 F2/1.1 参考：R3 智能单据候选①"自助分析配置页"（semantic-dataset §3.6/§3.8 拖拽透视配置+Panel 字段选择器）是候选集中唯一覆盖 pivot **配置面**交互（而不仅是 pivot 呈现）的页，建议标注为 1.1 优先候选（→ 并入 Minor-6 处置）。

---

## 3. 评审面三：下游可用性走查（M2 消费视角）

以"M2 D1/D2/D3/D4 设计者拿到四份交付后开工"为场景走查：

**不被误导的部分**（占大头）：21 页的交互要素→renderer 映射链条完整且经 R5+本次双重实证；缺口 G1-G26 编号连续、R1→R2→R3 续接清晰；两条登记冲突（G6/G26）裁定有底账行号背书；"上游无直接章节"的 7 页均显式标注佐证链。D2-D4 的分域设计可以安全消费。

**会被卡住或误导的部分**：

1. **"D2 验证项"散落无合并清单**：C1 拖拽绑定（R4 §1）、footer 统计带绑定（R1C1 缺口行，无 G 编号）、C2 calendar 回归（R4 §1）、W2 gantt 形态适配（R4 §1）、G16 规格求交 formula 方案——分散在三份文档的不同位置，D2 逐域设计时容易漏接（→ Minor-6）。
2. **mock fixture 影响未登记**：D1 负责 fixture 规范，但"哪些页需要什么形态的 fixture"是调研产出职责——O1 需带 bbox 坐标的样例扫描件、V1 需遥测时序序列、K1 需 streaming fixture、S1 需多维规格 SKU 矩阵。盘点只登记了 ORM 实体字段，fixture 影响要 D1 自己重新推导（→ Minor-6）。
3. **axe/focus 设计输入缺失**：见 Major-2——D1 的"每页验收断言模板：交互断言 + axe 基线 + focus 断言"是 roadmap 明文职责，但 M1 没有给它任何 axe 维度的输入（哪几页是 axe 高危、map 页可能扫不动、mobile 页无先例），D1 若不主动读 PH-17 spec 就会漏掉。
4. **登记交接断链**：见 Major-1——F2 按 §4 沉淀会丢 G9。
5. **G9 口径若不统一**，D3 设计 K2 时会按"桌面缺 countdown type"去找错方向（应先解决"表格行内倒计时"的集成方式问题）（→ Minor-3）。

---

## 4. Issue 清单

级别定义（本报告采用）：Blocker = 结论错误或交付不可用；Major = 会实际误导下游动作、或使 roadmap 强制规则失效的缺陷；Minor = 不阻塞但应修，逐条给处置。

### Major（2 条）

| #       | 问题                                                                                                                                                                                                                                                                                                                                                                                  | 证据                                                                                                                                                                                                                                                                                                                                                                    | 处置建议                                                                                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Major-1 | R4 §4 登记映射孤项：G9 在 §4 三个清单中全部缺失，F2 按 §4 沉淀将静默丢失该条；K2 的"能力扩展→先落缺口登记→再以临时形态过验收"承重链断裂，违反 roadmap M3 前言强制时序。附带定性矛盾：R2 G9 性质="既有控件跨包扩展"，R4 §2 登记去向却是"missing-components 新 type 候选"（能力扩展按 §4 惯例应走 improvement-analysis，如 G1/G14/G22/G24）。                                           | grep "G9" 在 R4 仅命中 L28/L55/L74/L80；§4 三清单逐项核对均无 G9；R4 L80 明言"可登记"；roadmap M3 前言"扩展/新类型类先落缺口登记再以临时形态过验收"；§4 自述"供 F2 缺口沉淀…引用"。R5 只核对了 §2 计数（12+5+7+2=26），未做 §2↔§4 双向核对。                                                                                                                            | R4 §4 补 G9 登记去向（建议归 improvement-analysis input 族跨包扩展条目，与 R2 定性对齐；如坚持 missing-components 需先改 R2 G9 性质措辞）；F2 执行前对 §2↔§4 做一次双向核对（26 条逐条落到四个清单之一）。                                            |
| Major-2 | "21/21 页均可过验收——整体可行，无阻塞性缺口"结论的评估面只覆盖 roadmap §1 验收三支柱（交互断言+axe 基线+focus 管理）中的一柱；axe 支柱存在两项已归档反向信号未进入任何 M1 交付：① PH-17 axe 设施对 map-demo 显式超时排除（V3 以 map 为底座，F1 axe 扫描可能重演超时）；② 7 条 axe 基线路由中 mobile 族零覆盖（W1/M3/S1 无先例），pivot/input-table/detail-view/kanban/calendar 亦无。 | `tests/e2e/a11y-axe-baseline.spec.ts` L13-19 注释原文"map-demo is excluded: its axe analysis exceeds a practical timeout (heavy SVG DOM, >120 s)"；ROUTES 仅 7 条（flux-basic/component-handles/ai-widgets/w4a-multimedia/gantt-demo/crud-demo/dashboard-demo）；roadmap §1"不接受'看起来像'"、§3"F1 直接复用 PH-17/PH-18 设施"。R1-R4 全文无 a11y/focus 维度风险评估。 | R4 §1 汇总行加限定语（"可行性结论限于 renderer 覆盖维度；axe/focus 维度待 D1 设计评估"）；D1 必须包含 per-page axe 策略（V3 类重 SVG 页的子树扫描/排除面策略、mobile 页首基线登记策略、focus 断言模板），并将"map axe 超时风险"显式列为 D4 设计输入。 |

### Minor（6 条）

| #       | 问题                                                                                                                                                  | 证据                                                                                                                                                                                                                                                                                                                                                   | 处置建议                                                                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minor-1 | 证据面未下沉：多处"待核/D2 验证"项本仓 live 当期可闭合；上游 132 个 `.flux.yaml` 活页语料（自有方言，含 i18nEn）未被系统性开采，仅 R2 用了 2-3 个。   | kanban onCardMove payload（kanban-board.tsx L146-158）+集成测试；calendar demo×3+e2e×5；gantt cpm.ts/links/zoom；barcode-input.types.ts L28-40；button-group-select（form 包）；上游 `module-inventory/.../dashboard/main.flux.yaml`（refreshSource/then 链与本仓 flux-guide L47/L70 词汇一致）；`grep i18nEn packages/*/src` 零命中（方言差异实证）。 | D1 开篇设"验证项闭合清单"专项：先以本仓 live（契约/demo/e2e）闭合待核项，再以上游语料作 M2 设计模板（显式标注方言差异）。                               |
| Minor-2 | improvement-analysis 底账未与 21 页矩阵做风险对账，且底账与 live 存在双向漂移未被察觉（部分已修复、部分已演化为显式 opt-in 契约）。                   | live：input minLength/maxLength 已接 nativeAttrs（input.tsx L166-167）+drift 测试；condition-builder 有 drift 测试——底账滞后；crud 跨页选择保留=`keepOnPageChange` 显式契约（crud-schema.ts L172、definition L204）——O2 批量通过跨页依赖此 flag，未进入 R3O2/R4O2 缺口列；table P0（列宽 resize/多列排序缺失）影响多数列表页。                         | D1 增"登记底账↔live↔页面矩阵"三方对账节；将 keepOnPageChange 等 opt-in 契约写入 O2/I1/K2 的设计输入。                                                   |
| Minor-3 | G9 表述不精确 + mobile-only 包 type 桌面可用性口径不一：countdown 立缺口 vs notice-bar（同为 mobile-only）用于 M1 桌面大屏未立缺口。                  | `flux-bundle/src/index.tsx` L44-54 全部包注册进同一 `FluxRendererRegistry`（mobile type 桌面页可解析）；notice-bar 唯一注册点 mobile-renderer-definitions.ts L313；notice-bar 多文本轮播能力实存（schemas.ts L96-104，M1 用法成立）。真实约束更可能是"表格行内 cell 级倒计时集成方式"。                                                                | D3 前以 playground 实测 mobile countdown/notice-bar 在桌面 dashboard 页的渲染交互，统一口径并回改 G9 表述；实测通过则 G9 可降为 table cell 集成设计项。 |
| Minor-4 | V3"绘制/轨迹/流媒体不做交互验收"与 roadmap §1"不接受'看起来像'"张力；roadmap M3 V3 行明列"围栏绘制"被静默收窄（有披露、无裁定记录、未回注 roadmap）。 | roadmap §1/M3 V3 行；R4 §1 V3 行"绘制/轨迹/流媒体不做交互验收"。roadmap M3 前言允许临时形态过验收，但未定义临时形态的断言下限。                                                                                                                                                                                                                        | D4 显式定义 V3 缩减断言基线（pin/cluster/geojson 回显/mp4 渲染的存在级程序化断言清单）；roadmap M3 V3 行加注或 F1 记录豁免裁定。                        |
| Minor-5 | 交互要素标注词汇在三份文档间漂移：R3O2 出现第三态〔常规推导〕未在 §0 声明；R2K1"Enter 提交、字数上限"等对标形态推导细节未标注。                       | R1/R2 §0 仅定义两态；R3O2 ②；R2K1 ②。                                                                                                                                                                                                                                                                                                                  | 三份盘点统一三态标注词汇表（上游明示/上游范式推导/flux 侧预期）并在各 §0 声明；随下次触碰顺手更正。                                                     |
| Minor-6 | 下游消费包缺口：D2 验证项散落无合并清单；per-page mock fixture 影响未登记（O1 bbox 样例/V1 遥测序列/K1 streaming/S1 SKU 矩阵）。                      | C1 拖拽绑定、footer 统计带、C2 calendar、W2 gantt 形态、G16 分散于 R1C1/R4 §1/§2 各处；R1-R3 只登记 ORM 实体字段，无 fixture 影响清单。                                                                                                                                                                                                                | D1 开篇建"契约验证清单"+"fixture 影响清单"两索引；F2 沉淀候选页沿用复杂度降序，R3 候选①（自助分析配置页）标注为 1.1 优先候选。                          |

---

## 5. 最终 Verdict

**Fail**（零 Blocker、2 Major、6 Minor）——M1 暂不放行进入 M2，待两条 Major 修复并复审后放行。

依据 `docs/audits/00-audit-execution-guide.md`（Pass = 零 Blocker AND 零 Major）。

**修复路径预估（低成本，均不触碰已验证的事实层）**：

1. Major-1：R4 §4 补一行 G9 登记去向 + 与 R2 G9 性质措辞对齐（10 分钟级）。
2. Major-2：R4 §1 汇总行加限定语一句话；axe 策略本体属 D1 设计职责，M1 侧只需把风险登记为 D1/D4 设计输入（15 分钟级 + D1 一节）。
3. Minor-1/-2/-5/-6：主体并入 D1 开篇的两个新节（验证项闭合清单、底账对账/fixture 清单）；Minor-3 待 D3 前一次 playground 实测；Minor-4 待 D4 裁定。

**对既有结论的背书声明**：本次开放审计的六次对抗性反驳中，页面级 renderer 覆盖分级（C1/C2/W2/W1 四页抽样）全部守住；R5 已证实的 type 归属、上游锚点、计数、登记冲突裁定等事实层无一被推翻。M1 的**事实质量**是可靠的；Fail 判定仅针对**登记交接机制**（Major-1）与**可行性结论的评估边界**（Major-2）两处机制缺陷。修复后建议由独立 fresh sub-agent 做一次轻量复审（只需核对 R4 §4 补行与 R4 §1 限定语落地），即可放行 M2。
