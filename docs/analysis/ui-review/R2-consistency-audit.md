# R2 — 全量 UI 一致性审查（owner doc）

> Last Updated: 2026-08-29（**R2 收口 + R3 修复收口**：8 轮发现 + 独立复核 + 汇总 + R3 P0/P1 修复与 P2/P3 裁决全部完成；本文档为 R2 owner doc 终稿）
> Mission: `missions/ui-review.json` · Roadmap: `docs/backlog/ui-review-roadmap.md`（R2 产出文档 / R3 修复条目）
> Plan: `docs/plans/2026-08-28-1701-1-r2-consistency-audit.md`（R2）· `docs/plans/2026-08-29-0419-1-r3-consistency-p0p1-remediation.md`（R3）
> 工作文件目录: `docs/analysis/ui-review/r2-audit/`（round-NN.md / review.md / summary.md / dedup-baseline.md / r3-p2-adjudication.md）

## 口径声明（owner doc 头部义务，Phase 1 落盘）

### 范围扩展声明（roadmap R2 裁定的扩围义务，沿 skill 附录 B §5 显式声明形式）

skill 共享提示词前缀的默认聚焦清单仅列 4 包（form / form-advanced / data / basic）。**本次审查范围显式扩围为**：

1. **14 个 renderer 包** `src/`：ai / basic / content / dashboard / data / form / form-advanced / graph / industrial（含 `src/editor/`） / layout / map / mobile / pivot / scheduling——与 roadmap Platform Reuse 表一致，以 plan Current Baseline 的 live `ls packages/` 复核为准；
2. **`@nop-chaos/ui` 全部 62 个组件模块**（`packages/ui/src/components/ui/` 非 test 模块，含 sidebar 族与 navigation 族边界；作为"正确用法"参照 + 一致性审查对象双角色）；
3. **playground 19 张复杂页 schema**（`apps/playground/src/complex-pages/page-schemas/`），其中 sundial 5 页按 roadmap Cross-Cutting 7 将"产品完成度/视觉原创性"（视角 11/12）作为验收维度必查。

覆盖口径以 roadmap R2 为准（`docs/backlog/ui-review-roadmap.md` Phase Details R2 条）。

### 视角数勘误

skill 正文"按以下 10 个视角"为笔误，其实际枚举为视角 1–12；本审查一律以 **12 视角**枚举为准（含视角 11 产品完成度、视角 12 视觉原创性）。

### dashboard 包 registry 口径复核结论（Phase 1 live 复核，修正 R0 §1 明细表缺席项）

- `registerDashboardRenderers`（`packages/flux-renderers-dashboard/src/index.ts:29`）注册 **2 个 type**：`dashboard`（运行态，`dashboard-definitions.ts:6`）+ `dashboard-editor`（编辑态，`editor/dashboard-editor-definitions.ts:6`）。注意 `dashboard-definitions.ts:18-19` 的 `type: 'value'` 是 propContracts `fieldRules` 字段规则，不是 renderer type，勿误计。
- **注册面归属：页面级 registry，非全局**。调用点仅 2 处：`apps/playground/src/pages/dashboard-demo.tsx:95`（页面级 registry）与 `apps/playground/src/renderer-prop-coverage-audit.test.ts`（测试口径）；playground `App.tsx` 的全局 registry 未调用它。
- **122 总数口径不含 dashboard**：R0 §1 合计 122 的逐包明细（16+22+19+19+10+8+5+4+1+1+1+1+1+14）未列 dashboard 行。含 dashboard 的全量口径为 **124**（122 + `dashboard` + `dashboard-editor`）；R0 的 122 继续有效，口径 = "App.tsx 全局 registry 组装（不含页面级注册的 dashboard 包）"。R2 审查按 **14 包含 dashboard** 的包数口径执行，dashboard 2 个 type 全部纳入审查面。

### 审查目标面实测（Phase 1 pre-flight，2026-08-28 live）

- 14 个 renderer 包 `src/` 全部存在且非空（非 test 文件数：ai 66 / basic 28 / content 37 / dashboard 13 / data 80 / form 49 / form-advanced 64 / graph 9 / industrial 120 / layout 15 / map 9 / mobile 9 / pivot 6 / scheduling 85。口径注：此为 pre-flight `find` 非 test 源文件计数，含纯逻辑/类型/样式文件；round-01.md 覆盖率清单为"含 UI 表面的审查对象文件"口径（如 mobile 12 / scheduling 91），两口径统计对象不同，以 round-01 覆盖率清单为审查覆盖依据）。
- `packages/ui/src/components/ui/` 非 test 模块 = 62（live 复核与 R0 §2 一致）。
- `apps/playground/src/complex-pages/page-schemas/` = 19 张 schema（live 复核与 R0 §4 一致）。

### 代码构建状态基线（skill 执行前验证第 3 项）

- 本 worktree（分支 `ui-review`）最近全绿基线 commit：**`06f222664`**（2026-08-25，"full-green verification (unit 68/68 tasks, AI-face e2e 147/147)"）。不引用 master 基线。
- 基线之后至当前 HEAD `0f183874a` 的提交（merge `6a920a58f`、`c05190aed`、`db49efebf`、`788771069`、`0f183874a`）已有 2026-08-28 全量验证记录（`docs/logs/2026/08-28.md`）：`pnpm typecheck` 37/37 ✓、`pnpm build` ✓、`pnpm lint` ✓、`pnpm check` exit 0；`pnpm test` 唯一残余红 = `flux-renderers-form` `input-date-relative-wiring.test.tsx` 4 用例（date 族产品逻辑 bug，master HEAD 同红，已有独立修复建议，与本审查无关）。
- 2026-08-28 现场 focused 复验（plan Phase 1 Failure Path 口径）：`pnpm --filter @nop-chaos/flux-renderers-form test -- --grep input-date-relative-wiring` → 该包 813 用例中 809 通过、4 红均属上述已知 date 族 bug，与 08-28 记录一致。
- **Phase 2 期间全量 `pnpm test` 补充发现**：`nop-debugger` 包存在**第 2 处遗留红**（3 用例：`adapters.test.ts` / `controller-helpers.test.ts` / `index.test.ts` 的 network 断言仍期望 HTTP `status: 200`，实现经 `db49efebf` ApiResponse 迁移后上报应用层 `status: 0`——08-28 日志"唯一残余红"结论不完整，根因是 turbo 在 flux-renderers-form 失败后 bail，nop-debugger 未跑到）。两处红均为 HEAD 既有状态（master 同源、先于本审查存在），与本纯文档审查无关；按 plan Non-Goals（不做代码变更）不在此修复，登记移交独立修复 plan（详见 daily log）。**代码状态对本审查目的而言可靠。**

### 子 agent 派发机制（Phase 1 决策落盘）

- 派发工具：opencode `task` 工具（skill 附录 C `Task()` 的同构调度语义）。
- 子 agent 类型：发现轮用 `general`（需完整读文件 + 镵写发现条目）；复核轮用 `general`/`explore`（fresh session grep 定位独立判断）。
- **每轮/每次复核均为 fresh session**（不复用前轮上下文）；各轮次文件与 `review.md` 记录派发的 agent 类型与任务描述作为 session 标识证据链（opencode task 返回 task_id，记入对应文件头部）。
- 主 agent（本 session）负责：拼接共享前缀、完整性检查（≥8 行 / 证据片段 / 严重度 / 行业惯例 / 具体修复方向 / 真实用户影响检验）、轮间去重校验、不合格打回重生成、落盘。

### 静态口径声明（可运行时审查受限的包）

- `flux-renderers-graph`、`flux-renderers-industrial`（含 `src/editor/` 的 scada-editor-canvas）、`flux-renderers-map` 因 leafer/canvas 类运行时依赖（R0 §1 同因），按**静态口径**审查（逐文件读源码判断视觉/交互输出），沿 R0 industrial/ai 先例在覆盖率表声明。
- schema 类目标（playground 19 页 JSON）天然按静态口径审查（schema → renderer 映射推理其视觉/交互形态）。

## 去重基线登记

见 `r2-audit/dedup-baseline.md`（三类前置清单：ma5-ux 6 条已知发现全部已修复 / C2+R1+sundial 已登记缺口 16 项 / 误报对照 8 条 + 边界排除 4 条）。R2 各轮次与汇总均以该文件为去重依据。

---

## 发现清单（Phase 2–4 收口）

- **总发现 276 条**（8 轮：R1 127 / R2 63 / R3 34 / R4 29 / R5 16 / R6 5 / R7 2 / R8 0，收敛趋势见 `r2-audit/round-08.md`），独立复核后**保留 273 / 降级 3 / 驳回 0**，终判严重度 **HIGH 17 / MEDIUM 172 / LOW 87**。
- 全文与证据: `r2-audit/round-01..08.md`（+ 组分文件）；逐条复核: `r2-audit/review.md` + `r2-audit/review-g1..g7.md`；汇总与清单: `r2-audit/summary.md`。
- 覆盖率: 14 包 + 62 ui 模块 + 19 页全部纳入（round-01.md 覆盖率清单 + 各轮台账）；静态口径 = graph / map / industrial+editor / 19 页 schema（头部口径声明节）。
- HIGH 17 条一览（终判全维持）: G1×3（variant:"primary" 渲染断裂、锚点 disabled 不生效、button-group 选中态零样式）、G2×3（input-time steppers 门禁穿透、period 快捷钮门禁穿透、草稿弹层脏关闭丢数据）、G3×5（虚拟化 radio 失效、虚拟化 scrollRef 恒 null、quick-edit/drag 列错位×2、列宽手柄几何）、G4×1（barcode-input 五通道 disabled 穿透）、G5×1（会话删除无确认）、G6×2（DrawerBody 无滚动契约、Drawer resizable 死链）、G7×2（schema variant:"primary"、导出链接 data: URL 拦截）。

## P0–P3 映射与共性归类（Phase 5 收口）

### 映射规则（roadmap 裁定）

HIGH→P0/P1（进 R3 预授权修复集）；MEDIUM→P2（裁决路由集）；LOW→P3。P0/P1 切分判据: **P0 = 不可逆数据丢失/破坏 或 主要数据面完全不可用**；P1 = 其余 HIGH（可绕过、影响受限或属交互障碍）。

| P 级                                  | 数量 | 条目                                                                                                                                                                                                                                              |
| ------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**（R3 预授权·数据丢失/核心失效） | 5    | [G2-R6-视角6-01]（草稿弹层静默丢弃多字段编辑）、[G5-视角10-01]（会话删除无确认、物理删除）、[G7-R2-视角11-01]（导出最末一步 100% 无响应）、[G3-R3-视角4-01]（虚拟化 radio 单选完全失效）、[G3-R4-视角5-01]（虚拟化 scrollRef 恒 null → 零行空表） |
| **P1**（R3 预授权·其余 HIGH）         | 12   | [G1-视角2-01]、[G1-视角3-02]、[G1-视角3-03]、[G2-R2-视角3-01]、[G2-R3-视角3-01]、[G3-视角5-01]、[G3-R3-视角8-01]、[G3-R4-视角8-01]、[G4-R4-视角3-01]、[G6-R2-视角6-01]、[G6-R3-视角6-01]、[G7-视角2-01]                                           |
| **P2**（裁决路由集）                  | 172  | MEDIUM 全量清单见 `r2-audit/summary.md` §MEDIUM 清单                                                                                                                                                                                              |
| **P3**（backlog）                     | 87   | LOW 全量清单见 `r2-audit/summary.md` §可暂缓项                                                                                                                                                                                                    |

### 共性归类（同根因模式聚合，标注涉及组件面）

| #   | 根因族                             | 涉及组件面                                                                                                                                                | 代表条目                                                                                  |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | disabled/readOnly 门禁通道覆盖缺失 | input-time、period 族、editor、upload、composite Add、checkbox-group、barcode-input、scada 编辑器、board 类（gantt/kanban/calendar 零消费 meta.disabled） | [G2-R2-视角3-01]、[G2-R3-视角3-01]、[G4-R4-视角3-01]、[G2-R4-视角3-01]、[G2-R2-视角4-02]  |
| 2   | 状态已发射、样式零消费（死状态）   | button-group、ai-feedback、calendar drop-target、gantt 任务条选中态、TableRow 选中、notice-bar 变体、`data-horizontal:` 全族、collapse disabled           | [G1-视角3-03]、[G4-R2-视角3-02]、[G6-R6-视角3-01]、[G6-R5-视角6-01]、[G4-R5-视角3-01]     |
| 3   | 长内容无滚动/溢出契约 + 几何断裂   | DrawerBody、桌面 TabsList、markdown 容器、steps 连接线、timeline 轴线、gantt 缩放锚定                                                                     | [G6-R2-视角6-01]、[G1-R6-视角8-01]、[G1-R5-视角8-01]、[G1-R2-视角8-01]、[G1-R4-视角8-01]  |
| 4   | hover-only / 低触点 / 触摸不可达   | gantt 手柄、kanban 删除钮、附件缩略图、dashboard 面板删除、步进钮 16-20px                                                                                 | [G4-视角8-01]、[G4-视角8-02]、[G5-R2-视角8-01]、[G3-R2-视角8-01]、[G2-R2-视角8-01]        |
| 5   | 失败/错误静默                      | 复制（table copyable、ai-feedback）、上传失败滞留、pull-refresh、calendar 导出、ai-attachments 拒绝、barcode/map 错误直出                                 | [G3-R2-视角10-01]、[G2-R2-视角5-02]、[G4-R2-视角5-01]、[G4-R2-视角5-02]、[G5-R2-视角5-01] |
| 6   | 写后界面不同步                     | sundial 写库动作、dashboard KPI、master-detail、sundial-detail 删除路径                                                                                   | [G7-R2-视角11-03]、[G7-R3-视角11-04]、[G7-R5-视角11-01]、[G7-R5-视角11-02]                |
| 7   | 键盘等价路径缺失                   | 行点击勾选、画布面板移动/缩放、拖拽把手、icon-picker 网格、calendar 时段 tabIndex                                                                         | [G3-R2-视角3-01]、[G3-R5-视角3-02]、[G1-视角8-14]、[G2-R7-视角9-01]、[G4-R3-视角9-01]     |
| 8   | 确认/取消按钮语义与顺序分裂        | kanban 新增列、HITL 卡片、sundial 确定/确认三形态、垃圾箱按钮样式                                                                                         | [G4-视角6-01]、[G5-R2-视角6-01]、[G7-视角10-09]、[G7-R2-视角10-01]                        |
| 9   | i18n / 语义色硬编码 + 枚举直出     | graph HSL、scheduling hex/red-400、`'+ 添加列'`、graph 布局按钮、原始 error.message 直出                                                                  | [G5-视角7-01]、[G4-视角7-01]、[G4-视角1-01]、[G5-R2-视角9-01]、[G5-R2-视角5-02]           |
| 10  | 空态/加载态标准分裂                | gantt 空 div / kanban 文案 / calendar 图标三标准、虚拟化 vs 非虚拟化空态、content 空值双轨                                                                | [G4-视角5-01]、[G3-R4-视角5-01]、[G1-R4-视角5-01]、[G2-视角5-04]                          |

## 给 R3 的输入清单（Phase 5 收口）

- **预授权修复集（P0/P1，17 条）**: 按"同根因批次"组织可显著降本——① disabled 门禁全通道批（[G2-R2-视角3-01]+[G2-R3-视角3-01]+[G2-R4-视角3-01]+[G4-R4-视角3-01]，一次全次要写入通道回溯）；② 草稿脏态守卫批（[G2-R6-视角6-01]，ui Dialog 层加 dirty-guard 原语）；③ variant:"primary" 批（[G1-视角2-01]+[G7-视角2-01]，cva 补键或运行时归一化，一处修复两处失效面）；④ 虚拟化组合批（[G3-R3-视角4-01]+[G3-R4-视角5-01]，VirtualBody 修 RadioGroup 包裹 + scrollRef 接线）；⑤ 表格列错位批（[G3-视角5-01]+[G3-R3-视角8-01]+[G3-R4-视角8-01]，header/colgroup/fixed 三处配对 + 手柄包含块）；⑥ 会话删除确认（[G5-视角10-01]）；⑦ 导出链接修复（[G7-R2-视角11-01]）；⑧ Drawer 滚动+resize 批（[G6-R2-视角6-01]+[G6-R3-视角6-01]）；⑨ 其余单点（[G1-视角3-02]、[G1-视角3-03]）。
- **裁决路由集（P2，172 条）**: 全量清单 + 逐条修复建议见 `r2-audit/summary.md`；共性族 1–10（上节）建议按族批量裁决而非逐条。
- **backlog（P3, 87 条）**: 见 `r2-audit/summary.md` §可暂缓项。
- R3 修复时的证据精度提示: 复核期 9 处修正（尺寸/行号/机制/失效面）已落 `review-g1..g7.md`，修复前先读对应组复核报告，勿直接按发现原文的精度实施。

## 给 C2 的回写段（Phase 5 收口；已追加至 C2 §3，见该文件）

> 本段为 C2 §3 回写区的首个回写，授权链: C2 G-I 行"R2 顺带"（承接 R0 §3 dark token 抽查遗留）→ plan `2026-08-28-1701-1-r2-consistency-audit.md` Phase 5。

1. **G-I dark token 抽查证据（2026-08-29，HEAD `0f183874a`）**: `packages/theme-tokens/src/styles.css` 四块（classic/glass × light/dark，行 112/172/232/292）逐变量结构**完全对称（4/4 块，每块 56 变量，零缺失零多出）**；抽样 10 个关键语义变量均为"真暗色"（dark 值经调谐，无 light 照抄；`*-bg` 族 dark 下为 `* 30% 20%` 暗底，gray 阶整体反转）。复杂页暗色抽查 4 页: **2/4 合格**（standard-crud 0 硬编码、dashboard 6 处中间调可接受）；sundial-workbench/sundial-settings 为自述 light-only 的复刻页（`--sd-*` 硬编码 hex + schema 118/151 处裸色值，dark 不适配）。**结论: G-I 中"暗色回归"的 token 层风险低于预期（结构已对齐），真实缺口收窄为——a) 运行时主题切换入口缺失（playground `main.tsx` 硬编码 light，L4 小项不变）；b) 复刻页 light-only（L1，随复刻页后续迭代处理）；c) 渲染器亮色假设新增同类点（scheduling calendar-event-block 固定白色前景/kanban `bg-white`/`color-mix(...,white)`，已入 R2 发现清单按 P2 路由，不新增 C2 项）。**
2. **共性素材（供 D1 产品化参考）**: R2 共性族 2（"状态已发射、样式零消费"）与 G-F（hover/选中态 schema 表达）同源——button-group/TableRow/calendar 等的选中态在 schema 层无表达通道、在渲染器层有状态无样式，双向佐证 option-row 原语（D1 首项）的价值；共性族 7（键盘等价路径缺失）为 G-B2（键盘导航框架）追加证据面（icon-picker 200+ Tab 停留点、画布面板无方向键、拖拽把手不可聚焦）。

## dark token 对齐度抽查结论（Phase 5 收口）

见上节"给 C2 的回写段"第 1 条（同一份证据，抽查执行记录: 探针 `_tmp/dark-token-symmetry-inspect.mjs`；抽查子 agent fresh session `ses_fb62d76e6ffeGUmNH8r0yHmU7q`，2026-08-29）。一句话结论: **4 调色板 dark 变体逐变量结构对称（4/4），抽样全为真暗色；复杂页暗色可用性 2/4（两张 sundial 复刻页 light-only 为既有设计，非回归）**；R0 §3 遗留抽查义务与 C2 G-I"R2 顺带"项就此闭合。

## 与 ma5-ux 的去重对照结论（Phase 5 收口）

- ma5-ux 6 条已知发现经 Phase 1 逐条 live 复核**全部已修复**（证据行号见 `r2-audit/dedup-baseline.md` §1），R2 各轮以该文件为强制去重基线。
- R2 最终 276 条与 ma5-ux **零交集、零重复报告**；复核期再次确认无 §1 已修复项复述（review-g1..g7 去重记录节）。"同类根因新实例"（如 [G2-视角9-03] array-editor/key-value i18n 同族、focus ring 族其他实例）按 dedup 规则作为新发现报告，符合基线约定。

## 转 C2 候选（renderer 语义缺口，非一致性发现）

按 dedup §2 规则，以下"能力缺失/声明未实现"在审查中撞见但未计入发现，转 C2 裁决:

1. **tabs `closable`/`draggable`/`addable` 声明未实现**（R1 G1）: schema 声明 + designer 可编辑，`tabs.tsx` 不消费，勾选无效果。
2. **dialog `draggable`/`allowFullscreen` 声明未实现**（R1 G1）: 声明+暴露，渲染链仅消费 `resizable`。
3. **carousel `orientation` 声明未实现**（R6 G1）: schema + designer 联合声明，`carousel.tsx` 全文不读取，垂直轮播不存在。
4. **transfer 双面板无移动适配**（R3 G2，G-H 表象）: 固定 `grid-cols-[1fr_auto_1fr]`，是 form-advanced 包内除 picker 外最需要移动适配原语的消费方。
5. **sundial workbench 移动端 stub**（R1 转出、R6 G7 复核维持，G-H 表象）。
6. **chart legend 点击切换系列未实现**（R5 G3 备忘）: 能力缺失非缺陷，若 C2 认为 chart 交互完整性值得立项可并入。

## R3 收口节（P0/P1 修复落点 + 回归测试 + P2/P3 裁决台账）

> 由 plan `docs/plans/2026-08-29-0419-1-r3-consistency-p0p1-remediation.md` 产出，2026-08-29，HEAD `1129772fe`。17 条 P0/P1 全部修复（test-first 先红后绿），P2 172 条裁决台账全覆盖、P3 87 条登记终态。

### 1. P0/P1 修复落点清单（17 条，批次①–⑨）

| 批次 | 发现 ID                     | 修复落点                                                                                                                                                | 修复方式摘要                                                                                                                                                            |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------ |
| ② P0 | [G2-R6-视角6-01]            | `ui/dirty-close-guard.tsx`（新原语 `useDirtyCloseGuard`）+ `detail-surface.tsx` + `detail-view.tsx` + `detail-field.tsx` + `detail-draft-controller.ts` | X/ESC/遮罩三通道统一经 `requestClose` 拦截；脏草稿弹 `AlertDialog`「放弃更改？」确认；`isDetailDraftDirty` 按打开时基线比对                                             |
| ④ P0 | [G3-R3-视角4-01]            | `table-renderer/table-body-rows.tsx` VirtualBody                                                                                                        | 虚拟路径与非虚拟路径同款 RadioGroup 受控包裹（`render={<TableBody/>}`）                                                                                                 |
| ④ P0 | [G3-R4-视角5-01]            | `table-renderer.tsx` 容器 ref 回调                                                                                                                      | 拆掉 if/else 互斥路由：autoFill 与虚拟滚动各自绑定同一容器元素                                                                                                          |
| ⑥ P0 | [G5-视角10-01]              | `ai/renderers/ai-conversations.tsx`                                                                                                                     | 删除钮改 only arm `pendingDeleteId`；`AlertDialog` destructive 确认后才派发 `ai:conversation-delete`                                                                    |
| ⑦ P0 | [G7-R2-视角11-01]           | `content/link.tsx` + `LinkSchema` + `crud-views-export.json`                                                                                            | link 渲染器 `download` 透传（true→`download=""`，字符串→文件名）；导出 schema 补 `"download": true`                                                                     |
| ① P1 | [G2-R2-视角3-01]            | `form/renderers/date/stepper-button.tsx` + `input-time-renderer.tsx`                                                                                    | StepperButton 增 disabled 透传 + `stepField` 入口守卫（对齐 input-number 双层门禁）                                                                                     |
| ① P1 | [G2-R3-视角3-01]            | `form/renderers/period-renderers.tsx`                                                                                                                   | 快捷钮 `disabled={!interactive}` + `applyShortcut` 入口守卫                                                                                                             |
| ① P1 | [G4-R4-视角3-01]            | `scheduling/barcode-input/barcode-input.tsx`                                                                                                            | `locked = meta.disabled                                                                                                                                                 |     | readOnly` 收敛五通道（clear/scanOnFocus/scanClick/scanResult/scanNow）+ 两处渲染条件 |
| ③ P1 | [G1-视角2-01]+[G7-视角2-01] | `ui/button.tsx` cva + `basic/schemas.ts` + `basic-renderer-definitions.ts`                                                                              | cva 补 `primary` 键（=default 实底权重）+ schema union/propContract union 补 `primary`（一处修复两处失效面；8 处 playground schema 由编译期剥离降级恢复为合法 primary） |
| ⑤ P1 | [G3-视角5-01]               | `table-header-row.tsx` + `table-renderer.tsx` + `table-body-row-rendering.tsx`                                                                          | `__row_save_bar__` 补配对表头 th + colgroup col + columnCount 计入                                                                                                      |
| ⑤ P1 | [G3-R3-视角8-01]            | 同上 + `fixed-columns.ts`                                                                                                                               | `__drag__` 补配对表头 th + colgroup col + `createFixedColumnLayout` 左固定条目 + body 拖拽 cell 消费 `getDragCellProps()`                                               |
| ⑤ P1 | [G3-R4-视角8-01]            | `table-header-row.tsx`                                                                                                                                  | 非固定列表头 th 增加 `relative` 定位上下文，resize 手柄贴列边                                                                                                           |
| ⑧ P1 | [G6-R2-视角6-01]            | `ui/drawer.tsx` DrawerBody                                                                                                                              | 补 `min-h-0 min-w-0 flex-1 overflow-y-auto`（对齐 DialogBody 契约）                                                                                                     |
| ⑧ P1 | [G6-R3-视角6-01]            | `ui/drawer.tsx` DrawerContent + `useDrawerResize`                                                                                                       | resize 变量直接消费到 Popup 几何（width/height + maxWidth/Height + `--drawer-resize-size`）+ 90% 视口 max 钳制                                                          |
| ⑨ P1 | [G1-视角3-02]               | `basic/button.tsx` 锚点分支                                                                                                                             | disabled/loading：`preventDefault` + href 置 undefined + `aria-disabled` + `pointer-events-none opacity-60`（对齐 link.tsx 基线）                                       |
| ⑨ P1 | [G1-视角3-03]               | `layout/button-group-renderer.tsx`                                                                                                                      | selectionMode 项补 `data-selected:` 消费类（bg-accent/text-accent-foreground），状态发射与样式消费闭环                                                                  |

### 2. 回归测试清单（测试名 ↔ 发现 ID，全部先红后绿）

| 发现 ID                                         | 回归测试文件（包内路径省略 `src/`）                                                                                                  | 用例数 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| [G2-R6-视角6-01]                                | `detail-view/detail-view-dirty-guard.test.tsx` "[G2-R6-视角6-01] detail draft dirty guard (dirty-guard-confirm)"                     | 7      |
| [G3-R3-视角4-01]                                | `__tests__/table-virtual-radio.test.tsx` "[G3-R3-视角4-01] virtual body keeps radio selection inside a RadioGroup"                   | 2      |
| [G3-R4-视角5-01]                                | `__tests__/table-virtual-autofill-scrollref.test.tsx` "[G3-R4-视角5-01] autoFillHeight × virtualization keeps the scroll ref alive"  | 2      |
| [G5-视角10-01]                                  | `renderers/__tests__/ai-conversations-delete-confirm.test.tsx` "[G5-视角10-01] conversation delete requires confirmation"            | 5      |
| [G7-R2-视角11-01]                               | `link-download.test.tsx` "[G7-R2-视角11-01] link download passthrough (export-no-response)"                                          | 4      |
| [G2-R2-视角3-01]                                | `__tests__/input-time-steppers-disabled.test.tsx` "[G2-R2-视角3-01] input-time steppers honor the disabled gate"                     | 3      |
| [G2-R3-视角3-01]                                | `__tests__/period-shortcut-disabled.test.tsx` "[G2-R3-视角3-01] period shortcut buttons honor the disabled gate"                     | 3      |
| [G4-R4-视角3-01]                                | `barcode-input/barcode-input-disabled-channels.test.tsx` "[G4-R4-视角3-01] barcode-input secondary channels honor meta.disabled"     | 4      |
| [G1-视角2-01]+[G7-视角2-01]                     | `__tests__/button-primary-and-anchor-disabled.test.tsx` "[G1-视角2-01][G7-视角2-01] variant:\"primary\" renders with primary weight" | 4      |
| [G1-视角3-02]                                   | 同上文件 "[G1-视角3-02] href anchor branch honors disabled/loading"                                                                  | 2      |
| [G3-视角5-01]+[G3-R3-视角8-01]+[G3-R4-视角8-01] | `__tests__/table-helper-column-pairing.test.tsx`（三个 describe 对应三条发现）                                                       | 7      |
| [G6-R2-视角6-01]+[G6-R3-视角6-01]               | ui `drawer-body-scroll-resize.test.tsx`（两个 describe 对应两条发现）                                                                | 4      |
| [G1-视角3-03]                                   | `__tests__/button-group-selected-visual.test.tsx` "[G1-视角3-03] button-group selection mode has a selected visual"                  | 2      |

### 3. 类别清扫记录（grep 模式 + 命中清单 + 处置）

| 批次            | grep 模式                                                                                  | 命中清单                                                                                                                                                                                                                         | 处置                                                   |
| --------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| ② 脏态守卫      | `rg "DetailSurface\|closeDraft" packages`                                                  | 消费面仅 detail-view / detail-field（同一 DetailSurface 通道）；dispose 单点 `detail-draft-controller.closeDraft`                                                                                                                | 两消费方均已接线守卫；无新增命中                       |
| ④ 虚拟化组合    | `rg "useVirtualizer\|virtualThreshold"` + `rg "RadioGroup\|RadioGroupItem"` 于全部命中文件 | kanban/gantt/calendar 虚拟器、ai-message-list、form 选项列表、tree-option-list、table-body-rows；RadioGroup 仅 `input-choice-renderers.tsx` RadioGroupRenderer（自包裹 group，无根因）；ref 互斥路由仅 `table-renderer.tsx` 一处 | 仅 table-body-rows/table-renderer 命中修复；无新增命中 |
| ⑥ 删除确认      | `rg "conversation-delete"`                                                                 | 生产点唯一 `ai-conversations.tsx`                                                                                                                                                                                                | 已加确认层；无新增命中                                 |
| ⑦ 下载链接      | `rg "data:text\|data:application"`                                                         | 唯一生成点 `showcase-env.ts:219`（对应 schema 已加 `download: true`）                                                                                                                                                            | 无新增命中                                             |
| ① disabled 门禁 | `rg "readOnly\) return"` 全包 + `meta.disabled` 消费反查                                   | [G2-R4-视角3-01]（upload-field，P2 随批修）、[G5-R3-视角3-01]（scada 三面板，P2 随批修）、[G4-R5-视角3-02]（三 board 四分支根容器，P2 随批修）；同根因不同落点文件者（editor-renderer / ai-chat / collapse）登记候选             | 3 条 P2 随批修复 + 回归测试；其余记 Phase 3 台账       |
| ⑤ 列配对        | body-only helper cell 清点（`data-slot="table-*"` 全集）+ `__index__` 检查                 | index 列为真实 columns 条目天然配对；孤儿列仅 `__drag__`/`__row_save_bar__` 两个                                                                                                                                                 | 两处均补配对；无新增命中                               |
| ⑧⑨ 家族扫查     | `DrawerBody` 消费面（dialog-host / detail-surface）；`data-selected` 消费反查              | DrawerBody 两消费方直接受益于基类修复；button-group 选中态消费类已补                                                                                                                                                             | 无新增命中                                             |

### 4. P2 172 条裁决台账（全覆盖）

- **台账文件**: [`r2-audit/r3-p2-adjudication.md`](r2-audit/r3-p2-adjudication.md)（172 行，每行: 条目 / 落点首证据 / 族归属 / 裁决 / 回链；追溯链 = 台账行 → summary §MEDIUM 对应行 → round 原文 → 复核报告）。
- **裁决规则**: `随批清扫修` 仅限与 Phase 1/2 批次同根因且同落点文件的实例；其余 `登记后续修复候选`（统一理由: 非本计划修复面、未命中批次同落点文件——Non-Goals 明确不做与批次不同落点的独立新修复，避免无界膨胀，归 successor plan 候选池）；无拒绝项。
- **裁决结果**: `随批清扫修` 3 条（[G2-R4-视角3-01]、[G5-R3-视角3-01]、[G4-R5-视角3-02]，均批次①，均有回归测试）；`登记后续修复候选` 169 条。
- **族分布**: 族1×9（3 随批修 + 6 候选）、族2×7、族3×6、族4×1、族5×12、族6×7、族7×5、族8×8、族9×17、族10×11、单点/跨族 89。
- **共性族 1（disabled 门禁）P2 同根因实例逐条处置**: [G2-R4-视角3-01] 随批修✅；[G5-R3-视角3-01] 随批修✅；[G4-R5-视角3-02] 随批修✅；[G2-R2-视角4-02]（composite maxItems 静默）、[G2-R3-视角3-02]（editor disabled 同步）、[G5-R4-视角3-01]（ai-chat 半量门控）、[G1-R2-视角3-01]（collapse disabled 视觉）、[G3-R2-视角4-01]（maxSelectionLength 静默）、[G2-R7-视角4-01]（addGroup 绕上限）→ 候选（不同落点文件）。
- **共性族 2（死状态）P2 同根因实例逐条处置**: [G4-R2-视角3-02]、[G6-R6-视角3-01]、[G6-R5-视角6-01]、[G4-R5-视角3-01]、[G5-R3-视角3-02]、[G1-R2-视角3-02]、[G4-R2-视角3-01] → 全部候选（族代表 [G1-视角3-03] 为 P1 已修于批次⑨；其余落点文件互不相同、互不覆盖）。

### 5. P3 87 条登记声明

LOW 87 条（`r2-audit/summary.md` §可暂缓项）登记即为终态，归属 roadmap backlog（`docs/backlog/ui-review-roadmap.md` backlog 区），不入 D2 门禁候选；修复归属后续独立裁决，本计划不展开（Non-Goals）。台账见 summary §可暂缓项，此处不再复制清单。

### 6. 全量验证记录（R3 收口）

- `pnpm typecheck` 37/37 / `pnpm build` 37/37 / `pnpm lint` 37/37 / `pnpm test` 68/68 任务全绿（2026-08-29，R3 修复后，R3 新增 15 个回归测试文件全部随包通过）；`pnpm check` exit 0 零新增命中。
- 全量 e2e **1315 passed / 11 failed / 3 flaky / 43 skipped**（2026-08-29，20.3m），对比 08-25 登记 baseline red 14 条**零新增红**。11 条失败归属：barcode ×4（登记 ×5 之子集，`BarcodeDetector` 能力面既有缺陷）+ crud-demo ×6（登记同 6 条）+ scada-perf:155 fps 吞吐 ×1（stash 实证干净树 HEAD `1129772fe` 同红、R3 工作树通过——机器负载波动型既有红，与 08-15 登记「scada-perf 全量并行性能波动×1」同型；功能断言 TE-1 视口位移与指针路径 ≥45fps 均过）；登记清单中 sundial ×2 本次未触发、scada-edge-cases ×2 转 flaky 复跑过、watch-only gantt-perf ×2 / kanban-perf ×1 未触发；3 条 flaky 复跑全过与 R3 变更面无关。明细与归因过程见 daily log `docs/logs/2026/08-29.md` §R3 全量验证结果。
