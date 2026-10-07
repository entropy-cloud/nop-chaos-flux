# 动态交互状态质量路线图（Interaction-State Quality Roadmap）

> Last Updated: 2026-10-07
> Source: 2026-10-07 用户报告五项交互缺陷（钉钉审批流/Action 编排"+"错位、插入节点后居中跳靠左、节点/边摘要边界不可辨、calendar 拖拽移动假反馈、gantt 拖拽后滚动归零）；`docs/skills/interaction-state-audit-prompt.md`（审查方法，随本 roadmap 新立）；`docs/references/ui-interaction-review-checklist.md`（分级与原则基线）

## Purpose

本文是动态交互状态质量轨道的阶段索引与状态面，按 `docs/backlog/00-roadmap-authoring-guide.md` 拟制：AI 或维护者读完 Phase Status 即知哪些工作项未开始（`todo`）、已立 plan（`planned`）、已完成（`done`）。

背景：此前三轮 UI 审查（ui-review R2/R3 一致性审查、visual-quality 一期读代码普查、二期渲染面静态走查）的证据形态全部是**静态状态**——代码结构或渲染后的单帧截图。已坐实缺陷全部属于"交互前-中-后状态连续性"与"家族能力接线 parity"维度，静态证据天然不可见，所以多轮审查全绿而体感仍差。本轨道是第三维专项：以 `docs/skills/interaction-state-audit-prompt.md` 为统一方法（六类缺陷 A–F、六条状态不变量 V1–V6、交互前后程序化读数对账 + 共享壳宿主 props 对账），对 playground 页面逐批做交互序列审查并修复，最后同探针复检 + e2e 守卫固化。

本文是编排层，**不是 execution plan、不是审查方法文档**；审查方法看 prompt，分级原则看 checklist。

## Phase Status

> **这是全文件唯一的动态状态区。更新状态只改这里。**
> 状态流转：plan 通过独立 draft review → `todo` 改 `planned`；plan 通过 closure audit → `planned` 改 `done`（不得提前）。一个 plan 对应本文一个工作项；执行顺序 = 本列表顺序。

- IS-0. 审查基建（页面交互清单程序化枚举 + findings 台账 + V1–V6 读数探针模板 + 序列 e2e 模板）: `done`（plan `docs/plans/543-interaction-state-is0-audit-infra-plan.md`，draft review 3 轮 R1/R2 fail→修订→R3 pass；closure audit 独立子 agent APPROVED 零 Blocker/零 Major，2 Minor 随收口回写修正、3 Trivial 记录在案）
- IS-1. flow-designer 域修复批（已坐实三项："+"几何锚定 / 插入节点后视口跳变 / 摘要卡边界对比度）: `done`（plan `docs/plans/544-interaction-state-is1-flow-designer-plan.md`，draft review R2 pass-with-minors；closure audit R1 issues 1M+5m 退回修复 → R2 APPROVED 零残留；批内新立 P1 004 一并修复，P2 005/006/007 裁决 watch/successor）
- IS-1b. shell 能力接线修正批（scada/dashboard WorkbenchShell collapsed 契约接线 + 面板头收起 affordance + 符合性守卫规则 + family mapping 契约硬化）: `done`（plan `docs/plans/538-shell-collapse-wiring-plan.md`，draft review R2 pass-with-minors；closure audit 独立子 agent APPROVED 零 Blocker/零 Major/零 Minor，2 Trivial 记 follow-up）
- IS-2. Gantt 域修复批（拖拽提交后滚动归零 + gantt 族三页序列审查）: `done`（plan `docs/plans/545-interaction-state-is2-gantt-plan.md`，draft review 4 轮 fail→修订→pass；closure audit 3 轮 R1/R2 issues 退回 → R3 APPROVED 零残留；根因 live 定位并修复，附带缺陷 002 一并修复，P2 观察项零静默）
- IS-3. Calendar 域修复批（移动语义闭环 + 区间选择可发现性/框选能力裁定 + calendar 族页面序列审查）: `done`（plan `docs/plans/546-interaction-state-is3-calendar-plan.md`，draft review R2 pass-with-minors；closure audit 3 轮 R1/R2 issues 退回 → R3 APPROVED 零残留；归属裁定 demo 接线、marquee 不做、perf 豁免、batchScheduling/SchemaRenderer 框架语义 watch 登记）（勘误 2026-10-07：原文 `#/complex-pages/cal-replica` 在 live 复合页模型中不存在，calendar 复刻面实为 `cal-booking`/`cal-confirm`/`cal-success` 三条复合页，批次归属按 plan 543 枚举器规则落 IS-3）
- IS-4. 其余设计器/编辑器域序列审查批（taskflow-designer、report×3、spreadsheet、word、print、dashboard-editor、scada-editor、debugger-lab 等）: `todo`（勘误 2026-10-07："report×3" 在 live 域路由中实为 2 条（`report-designer`、`report-designer-host`）；"dashboard-editor" 无独立域路由，该编辑器面内嵌于 `#/dashboard-demo`，随 IS-5 审查）
- IS-5. 数据可视化与表格域序列审查批（dashboard / pivot / map / graph / three / 表格 CRUD 与分页等 domain 页）: `todo`
- IS-6. 表单/AI/移动端与其余 domain 页序列审查批: `todo`
- IS-7a. complex-pages 序列审查批一（复刻页 + 工作台/编辑类复合页）: `todo`
- IS-7b. complex-pages 序列审查批二（其余复合页）: `todo`
- IS-8a. renderer lab 序列审查批一（basic / form / form-advanced / data）: `todo`
- IS-8b. renderer lab 序列审查批二（content / layout / mobile / ai）: `todo`
- IS-8c. renderer lab 序列审查批三（scheduling / graph / map / pivot / dashboard / 3d / industrial）: `todo`（勘误 2026-10-07：live shared lab 路由中该组仅 scheduling 有 4 条；graph/map/pivot/dashboard/3d/industrial 无 lab 路由，其审查面为 domain 页、已归 IS-4/IS-5）
- IS-9. 复检与守护固化（同探针复检轮 + V1–V6 不变量共享 e2e helper 沉淀 + 覆盖对账 uncovered=0 + 门禁扩展评估）: `todo`

## Framework / Platform Reuse

以下能力已存在，**不得重建**，只做组装：

| 能力                         | 提供方                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 说明                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 审查方法与分类法             | `docs/skills/interaction-state-audit-prompt.md`                                                                                                                                                                                                                                                                                                                                                                                                                  | 六类 A–F + 不变量 V1–V6 + 前后读数协议 + 共享壳宿主对账，所有批次统一口径                               |
| 契约符合性守卫               | `scripts/check-designer-conformance.mjs` + `scripts/__tests__/check-designer-conformance.test.ts`                                                                                                                                                                                                                                                                                                                                                                | F 类 finding 的守卫固化落点（进 `pnpm check` 链）                                                       |
| 分级与原则基线               | `docs/references/ui-interaction-review-checklist.md`                                                                                                                                                                                                                                                                                                                                                                                                             | P0–P3 分级、上下文连续原则（§4.2）                                                                      |
| 清单程序化枚举与覆盖台账机制 | visual-quality R2-0 先例（`docs/audits/visual-quality-r2/inventory/` + `ledger.md` + 对账命令）                                                                                                                                                                                                                                                                                                                                                                  | 状态机模式照搬（本轨道：`pending → found → fixed → verified`），台账落 `docs/audits/interaction-state/` |
| 浏览器真实驱动               | Playwright（`tests/e2e/`）、browser-use / web-gui-tester 技能                                                                                                                                                                                                                                                                                                                                                                                                    | 交互序列执行与取证                                                                                      |
| 计算样式/几何断言基建        | `tests/e2e/helpers/`                                                                                                                                                                                                                                                                                                                                                                                                                                             | boundingRect、computedStyle 读数断言                                                                    |
| e2e 诊断方法                 | `docs/references/e2e-test-diagnostic-guide.md`、`playwright.config.ts`                                                                                                                                                                                                                                                                                                                                                                                           | 序列测试编写与调试                                                                                      |
| 裁决台账惯例                 | `docs/analysis/ui-review/R2-consistency-audit.md` §R3（逐条 ID + 去向三态）                                                                                                                                                                                                                                                                                                                                                                                      | P2/P3 登记不修时的显式裁决                                                                              |
| playground 路由模型          | `apps/playground/src/route-model.ts` + `domain-route-pages.tsx`（75 domain 页；勘误 2026-10-07：live `DOMAIN_RENDERER_ROUTES` 为 80 条）+ `complex-pages-model.ts`（47 复合页；勘误 2026-10-07：live `COMPLEX_PAGE_ENTRIES` 为 40 条，47 是文件内 `id:` 出现次数的表面计数）+ `renderer-lab-registry.ts`（~133 lab 路由；勘误 2026-10-07：该文件实为 React 组件注册表不含路由 id，lab 路由清单在 `route-model.ts` `ALL_SHARED_RENDERER_ROUTES`，live 为 134 条） | 枚举源，禁止手抄清单                                                                                    |

## Current Baseline

- **已坐实问题种子清单**（2026-10-07 用户报告 + 代码定位，全部待修）：
  1. **"+"插入按钮错位**（钉钉审批流 + Action 编排两 Tab 共用）：按钮渲染 `packages/flow-designer-renderers/src/dingflow/ding-flow-plus-button.tsx`（TB: `bottom: -centerDistance; left: 50%`），几何常量单源 `packages/flow-designer-core/src/tree-projection.ts` L40-56（`BTN_CENTER_DIST=36` / `BTN_DIAMETER=28` / `MIN_CHAIN_GAP`）。候选根因：几何常量与实际节点壳渲染尺寸不一致，或分支/合并 overlay 投影（`dingflow/dingflow-overlays.ts`）在特定树形下过期。待 V4 读数对账定位。
  2. **插入节点后画布从整体居中跳为靠左**（同两 Tab）：候选根因：视口居中/fitView 策略只在初始挂载生效，插入后树重投影改变内容包围盒而视口 transform 不跟随（V2 违反）。待前后读数定位（参考既有 `tests/e2e/flow-designer-alignment.spec.ts`——它只断言节点间对齐，不断言视口变换稳定）。
  3. **节点/边摘要边界不可辨**：`packages/flow-designer-renderers/src/designer-node-card.tsx` L73 常态 `border border-border/60`（60% 透明度灰，接近不可见）；`designer-edge-row.tsx` L76 常态 `border-transparent`；缺失节点渲染裸 div 无占位（L52-63）。D 类 + V6 违反，坐实。
  4. **calendar 拖拽移动假反馈**：demo `apps/playground/src/pages/calendar-demo.tsx` L120 `onEventChange: { action: 'showToast' }` 且 `events` 为模块级静态常量——确认对话框走完只弹 toast，事件永不移动。C 类 + V3 违反，坐实。归属裁定随 IS-3：demo 必须接真实数据回写；renderer 事件载荷若不足以支撑业务闭环则 renderer 缺陷优先。
  5. **calendar 框选感知缺失**：已实现"长按 500ms 拖选单元格创建"（`use-calendar-drag-create.ts` + 类型选择器），但零引导暗示，用户感知为无此功能。E 类，坐实；是否补标准 marquee 框选为能力裁定项（Deferred But Adjudicated，不许静默）。
  6. **gantt 拖拽 bar 后滚动归零**：`packages/flux-renderers-scheduling/src/gantt/`。候选链路：拖拽提交 → store 内部更新 → `recalcLayout()` 重渲染 → 滚动容器内容瞬态变化 → 浏览器钳制 `scrollLeft` 归 0 → scroll 事件把 0 写回 store（`use-gantt-scroll.ts` producer 侧无瞬态守卫）→ 永久归零；另有 `ganttReady` 翻转重挂载、`zoomToFit` 重置 `_scrollLeft`（`gantt-store.ts` L424-452）两条候选。待 live 复现按 V1 读数定位。（勘误 2026-10-07，plan 545：三候选均不成立——live 写入 trap 铁证根因为挂载居中 effect（ux-r8 GT-1）依赖 compiler 增强 deps，拖拽提交换 scaleRange 引用即重跑 `scrollToToday` 写 0 + `scroll-behavior: smooth` 平滑归零；详见 plan 545 Current Baseline 与 `docs/audits/interaction-state/is2-gantt/findings.md`。）
  7. **scada/dashboard 面板无收起能力（F 类，已坐实）**：`WorkbenchShell`（`packages/flux-react/src/workbench/workbench-shell.tsx`）契约内置 collapsed rail 一族 props（`*Collapsed`/`on*Toggle`/`*Label`）+ resize 一族；flow/report/word 三家族 collapsed+resize 全套，而 `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx` 与 `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx` 只接 resize 一族——dashboard 还把 collapse 文案键（`flux.dashboard.editor.collapsePalette/collapseInspector`）挂在 rail aria-label 上（半接线信号）。`designer-workbench-shell.md` L62 要求展开面板头部有可见收起 affordance；`editor-designer-standard.md` L30 写明 collapsed rail 规则沿用不得重写。守卫缺口：`scripts/check-designer-conformance.mjs` 无此规则。归属：renderer 宿主接线缺陷（F 类契约符合性漂移）。
- **方法论缺口（本轨道要补的根因）**：三轮既有审查均为静态证据；既有 e2e 断言命令与数据（插入命令成功、scroll sync 生效），不断言感知连续性（交互前后 scroll/viewport 读数不变、成功提示必有对应数据变化）。

## Phases

| Phase                         | Status    | Owner Doc                                                                                                                    | Dependencies                | Reuse                                                                 | Plan                                                       |
| ----------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| IS-0 审查基建                 | `done`    | `docs/skills/interaction-state-audit-prompt.md` §4-§7、`docs/audits/interaction-state/`（本 item 新建）                      | —                           | R2-0 枚举/台账先例、e2e helpers                                       | `docs/plans/543-interaction-state-is0-audit-infra-plan.md` |
| IS-1 flow-designer 域修复批   | `done`    | 同上 + `docs/architecture/flow-designer/design.md`                                                                           | IS-0                        | 种子清单 1/2/3、flow-designer e2e 家族                                | —                                                          |
| IS-1b shell 能力接线修正批    | `done`    | `docs/architecture/designer-workbench-shell.md`（collapsed rail 契约）、`scripts/check-designer-conformance.mjs`（守卫落点） | —（缺陷已诊断坐实，可先行） | 种子清单 7、WorkbenchShell 契约 props、report/word 家族 collapse 先例 | `docs/plans/538-shell-collapse-wiring-plan.md`             |
| IS-2 Gantt 域修复批           | `done`    | 同上 + gantt 组件文档                                                                                                        | IS-0                        | 种子清单 6、gantt e2e 家族                                            | `docs/plans/545-interaction-state-is2-gantt-plan.md`       |
| IS-3 Calendar 域修复批        | `planned` | 同上 + calendar 组件文档                                                                                                     | IS-0                        | 种子清单 4/5、calendar e2e 家族                                       | `docs/plans/546-interaction-state-is3-calendar-plan.md`    |
| IS-4 设计器/编辑器域审查批    | `todo`    | prompt + `docs/audits/interaction-state/`                                                                                    | IS-0, IS-1                  | IS-1 沉淀的画布类序列模板                                             | —                                                          |
| IS-5 数据可视化与表格域审查批 | `todo`    | 同上                                                                                                                         | IS-0                        | IS-2 沉淀的滚动容器序列模板                                           | —                                                          |
| IS-6 表单/AI/移动端域审查批   | `todo`    | 同上                                                                                                                         | IS-0                        | 既有序列模板                                                          | —                                                          |
| IS-7a complex-pages 审查批一  | `todo`    | 同上                                                                                                                         | IS-0                        | 枚举器 + 台账                                                         | —                                                          |
| IS-7b complex-pages 审查批二  | `todo`    | 同上                                                                                                                         | IS-7a                       | 同上                                                                  | —                                                          |
| IS-8a renderer lab 审查批一   | `todo`    | 同上                                                                                                                         | IS-0                        | 同上                                                                  | —                                                          |
| IS-8b renderer lab 审查批二   | `todo`    | 同上                                                                                                                         | IS-8a                       | 同上                                                                  | —                                                          |
| IS-8c renderer lab 审查批三   | `todo`    | 同上                                                                                                                         | IS-8b                       | 同上                                                                  | —                                                          |
| IS-9 复检与守护固化           | `todo`    | prompt §8、`docs/references/e2e-test-diagnostic-guide.md`                                                                    | IS-1–IS-8c                  | R2-5 复检/对账先例                                                    | —                                                          |

## Phase Details

### IS-0. 审查基建

- 页面×可交互面清单**程序化枚举**（复用 R2-0 枚举器口径，按 domain/complex/lab 三族生成，落 `docs/audits/interaction-state/inventory/`，带再生成命令）。
- findings 台账 `docs/audits/interaction-state/ledger.md`：逐条 ID（`IS-<page>-<seq>`）、状态机 `pending → found → fixed → verified`、对账命令（uncovered=0 为 IS-9 关闭前置）。
- V1–V6 读数探针模板库（`page.evaluate` 片段）+ 交互序列 e2e 模板（先红后绿、断言读数非截图）。
- 不做产品代码修改；种子清单 1–6 在各自修复批处理，不在 IS-0。

### IS-1. flow-designer 域修复批

- 修复种子清单 1–3 三项（每项先红后绿：V4 几何对账 e2e / V2 视口稳定 e2e / V6 边界对比读数 e2e）。
- 以 `#/flow-designer` 四 Tab（工作流/钉钉审批流/Action 编排/节点边摘要）+ `#/taskflow-designer` tree 模式为对象跑 prompt §4 全序列审查，新发现进台账，P0/P1 随批修，P2/P3 登记裁决。
- 沉淀画布类页面交互序列模板供 IS-4 复用。

### IS-1b. shell 能力接线修正批

- scada-editor 与 dashboard-editor 两个 WorkbenchShell 宿主补接 collapsed 契约（`leftCollapsed`/`onLeftToggle`/`rightCollapsed`/`onRightToggle`，家族会话态，沿 plan 532 宽度接线的 useState 口径）；四个面板组件（industrial `EditorPalettePanel`/`EditorInspectorPanel`、dashboard `EditorPalette`/`EditorInspector`）面板头加可见收起 affordance（shell doc L62 既有要求），i18n 双 locale 键补齐。
- 守卫固化：`scripts/check-designer-conformance.mjs` 新增规则——渲染侧板的 shell 宿主必须接线 collapsed 一族（i18n 键挂而无 handler 的半接线同判）；`designer-workbench-shell.md` family mapping 硬化（"有侧板的家族必须接线 collapsed 契约，resize-only 不合规"）。
- 判别性单测（旧实现下必挂：点面板头收起按钮必须出现 collapsed rail）+ scada/dashboard e2e 收起-展开交互用例。

### IS-2. Gantt 域修复批

- 按 V1 读数协议 live 复现并定位"拖拽提交后滚动归零"根因，修复（候选方向：scroll producer 瞬态守卫、layout 重渲染期间钳制抑制、`ganttReady`/zoomToFit 两条候选链路逐一证实或排除）。
- `#/gantt`、`#/gantt-states`、`#/gantt-perf-scale` 三页全序列审查；沉淀滚动容器类序列模板供 IS-5 复用。
- 补"滚动位置跨拖拽提交保持"回归 e2e（当前 e2e 家族无此链路覆盖）。

### IS-3. Calendar 域修复批

- 移动语义闭环：demo 页 `onEventChange`/`onEventCreate` 接真实数据回写（state 驱动），"排班已更新"文案与实际变化 V3 对账；若 renderer 事件载荷不足支撑闭环，renderer 侧修复优先并登记。
- 区间选择可发现性：给"长按拖选创建"加引导暗示（首次提示/空态文案/光标反馈，方案随 plan 裁定）；标准 marquee 框选是否新增 = 能力裁定项，结论显式登记（做/不做 + 理由），禁止静默搁置。
- `#/scheduling-calendar`、`#/calendar-perf-scale`、`#/complex-pages/cal-replica` 序列审查 + 回归 e2e。

### IS-4–IS-8. 各域序列审查批

- 每批 = 对本批页面跑 prompt §4 五步审查（枚举 → 读数集 → 驱动序列 → diff 定罪 → 归类归属），findings 全量进台账；P0/P1 随批先红后绿修复，P2/P3 登记裁决。
- 分批边界按 Phases 表；批次内页面清单以 IS-0 枚举器输出为准，不手抄。

### IS-9. 复检与守护固化

- 同探针复检轮（对已修页面重放序列，读数对账）+ 覆盖对账 uncovered=0。
- V1–V6 逐不变量沉淀共享 e2e helper（如 `expectScrollPreserved` / `expectViewportStable` / `expectFeedbackTruthful`），登记进 `tests/e2e/helpers/`。
- 门禁扩展评估：可静态检测子集（V4 几何常量对账、V6 border 透明度令牌等）评估纳入 `check:audit-ui-consistency-gaps`；契约符合性类（F 类）固化为 `scripts/check-designer-conformance.mjs` 规则（IS-1b 已落首条：shell 宿主 collapsed 接线）；不可静态检测的记录豁免理由。

## Dependency Graph

```mermaid
graph TD
    IS0[IS-0 审查基建] --> IS1[IS-1 flow-designer 修复批]
    IS1b[IS-1b shell 能力接线修正批]
    IS0 --> IS2[IS-2 Gantt 修复批]
    IS0 --> IS3[IS-3 Calendar 修复批]
    IS1 --> IS4[IS-4 设计器/编辑器审查批]
    IS2 --> IS5[IS-5 数据可视化/表格审查批]
    IS0 --> IS6[IS-6 表单/AI/移动端审查批]
    IS0 --> IS7a[IS-7a complex-pages 一]
    IS7a --> IS7b[IS-7b complex-pages 二]
    IS0 --> IS8a[IS-8a lab 一]
    IS8a --> IS8b[IS-8b lab 二]
    IS8b --> IS8c[IS-8c lab 三]
    IS3 --> IS9[IS-9 复检与守护]
    IS1b --> IS9
    IS4 --> IS9
    IS5 --> IS9
    IS6 --> IS9
    IS7b --> IS9
    IS8c --> IS9
```

## Cross-Cutting

- **归属裁定规则**：demo/playground 页是 renderer 契约的消费者。假反馈类缺陷（C 类）先裁定归属：若 renderer 事件载荷足以支撑业务闭环，则 demo 接线缺陷，修 demo；若不足以支撑，则 renderer 缺陷优先修。裁定结论写进台账，不得两边都改了却不留痕。
- **先红后绿**：每条 P0/P1 修复必须先把复现序列固化为 e2e 读数断言（红），修复转绿；禁止只修不加测试。
- **全量登记**：批次 findings 一律进台账；P2/P3 允许登记不修，但必须走裁决台账模式（逐条 ID + 去向三态），零静默跳过。
- **静态审查不回退**：本轨道审查不替代 visual-quality A–H 静态走查与一致性门禁；发现交叉问题登记转发，不扩本轨道范围。
- **更新规则**：按 `docs/backlog/00-roadmap-authoring-guide.md`（状态流转 draft review → `planned`、closure audit → `done`；表格与依赖图冲突时表格赢）。
