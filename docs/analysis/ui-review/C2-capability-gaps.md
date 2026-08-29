# C2 — 能力差距汇总与分级裁决（滚动文档）

> Last Updated: 2026-08-19（**初版裁决**；后续各 Pi-b closure 以追加方式回写本文件，不重开状态）
> Mission: `missions/ui-review.json` · Roadmap: `docs/backlog/ui-review-roadmap.md`（C2 产出文档）
> 输入：C1 压力预判、R1 差距清单、plan 460 B8 runtime 语义发现、sundial 分析 G1-G5 既有登记

## 0. 裁决级别定义

| 级别                  | 含义                                                                     | 实施载体                           |
| --------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| **L1 CSS 可解**       | playground/schema 层样式即可，无 renderer/runtime 改动                   | 复刻页 CSS + schema 组合           |
| **L2 渲染器语义增强** | 既有 renderer 加语义字段/区域（plan-first：renderer 定义字段属保护区域） | 独立 plan（D1 产品化）             |
| **L3 新原语**         | 新 renderer type / ui 组件入 `ui/src/index.ts`（ask-first）              | 独立 plan（D1 产品化）             |
| **L4 runtime 能力**   | 编译器/scope/action/表面运行时语义                                       | 独立 plan + flux-core 保护区域流程 |

## 1. 初版裁决表（2026-08-19）

| ID        | 缺口                                                             | 级别                               | 证据来源                                                                                                            | 裁决理由 / 影响面                                                                 | 状态                           |
| --------- | ---------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| G-A       | 页面模板层（PageHeader/查询区/result 预设）                      | **L2**                             | R1§2.2/§3、C1-10                                                                                                    | 语义件而非运行时能力；AMIS CRUD wrapper 同级对标                                  | 待 P2 回写                     |
| G-B1      | ⌘K 命令面板原语                                                  | **L3**                             | C1-2、R1§2.4                                                                                                        | ui `command` 模块已有底座、无 renderer type                                       | 待 P4 回写                     |
| G-B2      | 键盘导航框架（chord/peek/多选/键盘重排）                         | **L4**                             | C1-2/5、R1§3 交互深度 2 分                                                                                          | 焦点管理与全局快捷键是运行时横切能力                                              | 待 P4 回写                     |
| G-B3      | 批量操作栏语义（选择集绑定 + 批量动作）                          | **L2~L3**                          | C1-3/7                                                                                                              | crud 已有选择集；"批量栏"缺语义件与选择集 scope 契约                              | 待 P6/P7 回写                  |
| G-C       | 多视图数据库（视图切换状态机 + filter 面板联动 + 行内新建）      | **L2**（状态机 L4 风险）           | C1-4                                                                                                                | tab+visible 可模拟但重渲染与视图配置持久化需语义化                                | 待 P5 回写                     |
| G-D       | 网格编辑深度（单元格编辑器矩阵/列菜单/分组/行高）                | **L2**                             | C1-3/4、R1§2.4                                                                                                      | input-table 底座有；矩阵完整度与列菜单语义缺失                                    | 待 P6 回写                     |
| G-E       | 高密度排版（密度档位/等宽计数/语义色状态/chip 筛选条）           | **L1 为主 + 密度档 L2**            | C1-3/8                                                                                                              | sundial 复刻已证 CSS 令牌可解；密度档位值得一个语义字段                           | 待 P7 回写                     |
| G-F (=G5) | hover/选中态 schema 表达（`option-row` 通用原语候选）            | **L3**                             | sundial G5 预登记（分析文档建议 option-row）、plan460 双渲染实践（settings rail 5 行×2 份实测成本）、C1 §2 五页命中 | 双渲染模拟的维护成本已实测                                                        | **已裁决，D1 候选首项**        |
| G-F2      | className 表达式绑定（`${flag ? 'a' : 'b'}`）                    | **L3**（编译器求值边界 → L4 风险） | roadmap 预登记、G5 同根                                                                                             | 与 option-row 互补（样式态 vs 行为态）                                            | D1 候选                        |
| G-H       | 移动端主组件族（vs Vant 80+）                                    | **L2**（量大）                     | R1§2.5 既有分析                                                                                                     | 非本 roadmap P 系列范围；保留裁决防丢                                             | 挂起（P 系列外）               |
| G-I       | 暗色回归 + 运行时主题切换                                        | **L1 + 小 L4**（切换器暴露）       | R1§3 主题化 4 分注                                                                                                  | tokens 已有 4 调色板，缺回归与切换入口                                            | R2 顺带 + D1 记录              |
| G-J       | resizable 面板 schema 化                                         | **L3**                             | C1-1、AGENTS.md 组件清单（ResizablePanelGroup 已宣传，缺 renderer type 暴露）                                       | 底座在 ui 包，缺 schema 原语                                                      | 构想库存（C1 §3）              |
| G-K       | 流程图节点数据驱动着色                                           | **L2**                             | C1-7                                                                                                                | graph renderer 语义字段                                                           | 构想库存（C1 §3）              |
| G3-余     | input-date 行触发形态                                            | **L2**（优化项）                   | sundial 分析 G3                                                                                                     | 非阻塞优化                                                                        | 挂起（优化）                   |
| G-L       | dialog 影子写限制（dialog 内改页面 scope 无原语，plan460 B8 #2） | **L4 观察项**                      | plan460 B8 语义发现                                                                                                 | 现可用 closeDialog{surfaceId} / 页面级 hook 回写绕过；若 P 系列复刻高频撞墙则升格 | 观察中                         |
| G-M       | hook 时刻裸 scope 变量求值不可靠（B8 #3）                        | **L4 观察项**                      | plan460 B8 语义发现 #3                                                                                              | 正确姿势已文档化（data→form→$formData）；根因未深挖                               | 观察中（建议 deep-audit 候选） |

## 2. D1 产品化输入预清单（按裁决级别 + 价值排序）

1. **G-F option-row 通用原语**（L3，证据最厚：sundial G5 预登记 + B8 实测 + C1 五页命中）
2. **G-B1 command-palette renderer**（L3，P4 前置依赖）
3. **G-A 页面模板预设族**（L2，P2 前置依赖：PageHeader/QueryFilter/result）
4. **G-B2 键盘导航框架**（L4，P4 依赖，需 flux-core 保护区域流程）
5. G-F2 className 表达式绑定（L3，与 1 同 plan 可行）
6. G-B3/G-C/G-D 语义件族（L2，P5/P6 回写后定形）

## 3. 回写区（各 Pi-b closure 追加，勿动上方初版）

### 回写 ① — R2 一致性审查（2026-08-29，plan `2026-08-28-1701-1-r2-consistency-audit.md` Phase 5）

> 首个回写。授权链: G-I 行"**R2 顺带**"（承接 R0 §3 "4 调色板 dark 逐变量对齐度留 R2 抽查"遗留）→ R2 plan Phase 5 义务产出。C2 状态不重开，本段仅追加证据与素材。

**G-I 证据回写（dark token 对齐度抽查，HEAD `0f183874a`）**:

- token 结构对称性: `packages/theme-tokens/src/styles.css` 四块（classic/glass × light/dark）逐变量完全对称——每块 56 变量，四个方向（classic L↔D、glass L↔D、classic↔glass 同 mode）均零缺失零多出（探针 `_tmp/dark-token-symmetry-inspect.mjs`）。
- 值级抽查: 10 个关键语义变量（background/foreground/primary/danger/warning/success/info/border/muted/accent）在 dark 块均为调谐真暗色，无 light 照抄；`*-bg` 族 dark 为 `* 30% 20%` 暗底，gray 阶整体反转。模式无关常量（`--primary-foreground` 等白前景）为合理设计非照抄；glass 对的 `--secondary`（dark 下浅薰衣草作高亮前景）建议知会但可接受。
- 复杂页暗色抽查（4 页抽样）: 2/4 合格——standard-crud 全 token 零硬编码、dashboard 6 处中间调强调色可接受；sundial-workbench / sundial-settings 为自述 light-only 的复刻页（`--sd-*` 硬编码 + schema 118/151 处裸色值），dark 不适配（属复刻页迭代范畴，非 token 层回归）。
- **对 G-I 裁决的影响**: "暗色回归"的 token 层风险低于初判（结构已对齐），G-I 真实缺口收窄为 ①运行时主题切换入口缺失（L4 小项，playground `main.tsx:13-15` 硬编码 light）；②复刻页 light-only（L1）；③渲染器亮色假设散点（scheduling 固定白前景/kanban `bg-white`/`color-mix(...,white)` 等——已入 R2 发现清单 P2 路由修复，无需新增 C2 项）。

**共性素材回写（供 D1 产品化排序参考）**:

- R2 共性族"状态已发射、样式零消费"（button-group 选中态、TableRow 选中、calendar 拖拽悬停、notice-bar 变体等，276 条发现中的高频族）与 **G-F（option-row 原语）** 同源——schema 层无选中/hover 态表达通道、渲染器层有状态无样式，双向佐证 G-F 作 D1 首项的优先级。
- R2 共性族"键盘等价路径缺失"（icon-picker 200+ Tab 停留点、dashboard 画布面板无方向键移动/缩放、page 侧栏拖拽把手不可聚焦）为 **G-B2（键盘导航框架，L4）** 追加实证面。

### 回写 ② — R3 P0/P1 修复批次共性素材（2026-08-29，plan `2026-08-29-0419-1-r3-consistency-p0p1-remediation.md` Phase 4）

> 授权链: roadmap Cross-Cutting 5（C2 滚动追加回写方式）→ R3 plan Phase 4。C2 状态不重开，仅追加证据与素材行。HEAD `1129772fe`。

**族 2（状态已发射、样式零消费）佐证更新（G-F / option-row）**:

- R3 批次⑨已修 button-group 选中态（`data-selected:` 消费类补齐）与 variant:"primary"（cva 补键 + union 合法化）——两条 HIGH 的修复共同点是"渲染器层补样式消费"，schema 层仍无选中/hover/按压态的表达通道。
- 族 2 其余成员（TableRow 选中、gantt 任务条选中、ai-feedback 投票态、notice-bar 变体、calendar drop-target）已按 R3 裁决登记 successor 候选（台账 `r2-audit/r3-p2-adjudication.md`），修复面仍在渲染器层。**结论: G-F option-row 作 D1 首项的依据加厚——凡 schema 无法表达的状态，最终都要在渲染器层逐个补丁；option-row 原语可一次性消解该族。**

**族 7（键盘等价路径缺失）佐证更新（G-B2 / 键盘导航框架）**:

- R3 裁决后，icon-picker 漫游（[G2-R7-视角9-01]）、calendar 周/日惰性焦点（[G4-R3-视角9-01]）、键盘创建死路（[G4-R3-视角10-02]）、画布面板无方向键（[G3-R5-视角3-02]）均登记候选未修——键盘等价缺口的修复面全部落在"组件级 roving/方向键模型"，与 G-B2 的框架级能力（chord/peek/全局重排）仍按 R2 复核划线（单控件=一致性缺陷，框架=能力缺口）。**G-B2 证据面维持，D1 排序建议不变。**

**族 1（disabled 全通道门禁）修复经验（新渲染器契约素材，供 D1 参考）**:

- R3 批次①一次回溯了 input-time steppers、period 快捷钮、barcode 五通道、upload 完成写入/取消、scada 三面板、三 board 根容器共 6+ 条同根因实例——缺陷模式均为"主输入通道接了门禁、次要写入通道漏接"。
- **素材行**: D1 立项新表面/新渲染器时，建议把"全写入通道门禁"作为 renderer 契约检查项（对应 R2 summary §建议的统一设计规范 #1），而非逐案例后补；form 族已有 `presentation.interactive` 收敛点可直接复用。

**族 3/5/8/10 佐证**: surface 滚动契约（#3）、错误反馈三通道（#5）、确认顺序 `[secondary, primary]`（#8）、空态规范（#10）四条统一设计规范已由 R2 summary 沉淀；R3 修复补齐了 DrawerBody/Dialog 的 body 滚动不对称与会话删除确认两个 HIGH 样本，其余成员见 P2 候选池。

### 回写 ③ — P2b AntD Pro 交互接线实测证据（2026-08-29，plan `2026-08-29-1413-1-p2b-antdpro-interaction-wiring-and-tests.md` Phase 5）

> 授权链: roadmap Cross-Cutting 5（Pi-b closure 以追加方式回写 C2，不重开初版状态）→ 本 plan Phase 5。HEAD `2b3fa8d9a` 起算的 P2b 批次。初版裁决表零改动，本段仅追加实测证据与素材行。

**G-B3 批量操作栏（L2~L3）实测证据（schema 层可达深度与降级点）**:

- 可达面（`antdpro-list.json` 实证 + e2e 01/02 锁定）：`$crud.selectionCount`（toolbar 文案模板「已选择 N 项」）、`$crud.selectedRowKeys`（经 ajax `args.data` 透传写端点）、`$crud.hasSelection`（按钮 `disabled` 门控 + 反馈对 `visible`）、`component:clearSelection`（取消选择）。
- 降级点：「批量栏 alert 包络」无语义件——表顶反馈条由 toolbar 文案节点 + 按钮 + `visible` 手工拼装；无「全选本页/跨页选择集」表达外的选择集持久化语义。产品化落点与初判一致（语义件 + 选择集 scope 契约），D1 排序素材 +1。
- G-B3 关联实测（同列表页）：批量导出按钮 `antdpro-list-export` 静态保留——下载/导出归宿主能力（同 print 族，见下方素材行）。

**G-E 高密度排版（L1 为主 + 密度档 L2）实测证据（I4 裁定结论）**:

- **密度档 L2 缺口成立**：`flux-renderers-data`/`flux-renderers-basic` 源码 grep `density` 零命中（P2b 复测），无密度语义字段；复刻页 `antdpro-toolbar-density` 按钮静态保留（非接线遗漏，双渲染模拟已被 plan460 实测否决——维护成本高且本计划零新增 CSS 无法承载档位样式差异）。
- **列显隐维度预测缺口被实测修正**：初版 C2 未单列，分析篇 §4 I4 预测「列设置 popover（勾选+拖拽排序+固定）缺承载」——实测 crud 原语已有 `columnSettings: { enabled: true }`（勾选显隐 + 上移/下移，overlay dropdown，`table-column-settings.tsx`），勾选显隐维度**原生可达**（e2e 07 锁定），复刻页静态 `antdpro-toolbar-columns` 重复按钮已裁决移除；**拖拽排序与固定列两个子维度仍无 schema 表达**，保留在 G-E/G-D 观察面。
- 语义色状态/chip 筛选条两子项本页未触发新证据，维持初判。

**ProLayout 三布局承载实测结论（分析篇 §7 预登记项的回写义务）**:

- P2a/P2b 复刻范围不含框架 chrome（I16 框架顶栏 + ProLayout mix/side/top 布局壳，P2a Non-Goals 排除），实测未取得「schema 层无承载」的正反证据，按分析篇 §7 预登记口径**不新增行**；若未来 roadmap 结构性变更纳入框架壳复刻，届时按 D1 流程另评。

**新增素材行（供 D1 排序参考，未分级）**:

- **I3 查询分页不对称（renderer 级 finding）**：crud `submitQueryValues` 只更新 query 状态不重置分页，与 reset 分支（同步重置分页）不对称——本计划以 schema 级 `onQuerySubmit` + `setValue` 写 `$_crud.*.pagination` 补齐（e2e 09）。同源实测：分页/排序触发的 reactive loadAction 重派发在无 crud scope 投影上下文求值 `${query.keyword ?? ''}` 抛错（每次一条 action error，实际加载由 effect 派发完成，功能正确）；模板改写 optional-chaining 或任何可解析 `$_crud.*` 依赖会引发 reactive 派发 ↔ 分页回写无限循环。**建议 D1/deep-audit 候选**：loadAction 查询提交自动重置分页 + reactive 重派发的 scope 投影。
- **wizard valuesPath 卸载清发布值**：form runtime dispose 时 `valuesPath` 发布回写 `undefined`（`form-runtime.ts` setupExternalPublication 清理分支），wizard 非 `mountOnEnter` 模式下离开步即丢数据——`mountOnEnter: true` 为分步数据暂存的必要声明。建议补入 `flux-guide/examples/wizard-values-path.md` 作显式注意点（文档项，非产品化项）。
- **toast 生命周期与页面 host 绑定**：复杂页每页 host 各挂 `<Toaster/>`，跳转型动作链里 `messages.success` 存活 <100ms；本计划以 `control: {debounce}` 延迟 navigate 消解（对齐 AntD Pro「message → 延迟跳转」）。若 D1 沉淀「host 级常驻 toast 容器」约定，可消除该 schema 层补丁需求。
- **打印 host 能力候选**：`RendererEnv` 无 print 通道（`window.print` 型），AntD Pro 详情页打印按钮在本复刻中静态保留；未分级，D1 输入池。
