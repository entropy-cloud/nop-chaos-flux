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

### 回写 ④ — P3b Cal.com 预约交互接线实测证据（2026-08-29，plan `2026-08-29-1819-1-p3b-cal-booking-interaction-wiring-and-tests.md` Phase 5）

> 授权链: roadmap Cross-Cutting 5（Pi-b closure 以追加方式回写 C2，不重开初版状态）→ 本 plan Phase 5。初版裁决表零改动，本段仅追加实测证据与素材行。逐条「预测 vs 实测」对照见分析篇 `cal-booking.md` §4.1。

**G-F（option-row 原语）实测证据（槽位三态联动链路）**:

- 三态形态本身体可解（L1 已证，P3a 落 CSS）：`cal-slot-btn` 默认描边 / 选中黑底白字 / 失效灰字禁用，令牌抽查 e2e 锁定（`cal-replica-visual.spec.ts` 01，getComputedStyle 实证）。
- **联动刷新链路成立（P3b 新证）**：scope 写入（calendar `dateOwnership`/tabs `valueStatePath`）→ data-source url 模板逐次物化（`date=${calDate}&duration=${calDuration}&timezone=${calTimezone}` + 显式 `dependsOn`）→ 内建自动刷新（`source-registry.ts` dedup/cascade 护栏），e2e 01/03/04 锁定数据结果。三态按钮的 onClick 动作链（selectSlot → navigate）与 visible 三分支双渲染均 schema 级可达。
- **option-row 语义缺口维持**：三态/hover 仍靠 CSS 类 + visible 表达式模拟（每态一个兄弟节点，双渲染成本随状态数线性增长）；「点日期格选中」手势在 calendar 月视图无内建语义（见 G-C）。G-F 作 D1 首项的依据不变。

**G-C（月/周多视图，L2）实测证据（Booker 月历形态差）**:

- calendar 月视图为**资源时间轴横条**（`calendar-month-view.tsx`，资源行 × 日期列），非 Booker 式 6 周竖网格：无「点日期格」内建选中语义（仅长按拖拽创建事件）；今日强调、月份头 ←/→/Today 导航内建可达（e2e 02）。
- P3b 降级承载：选日手势由内建月份导航触发日期变更（onDateChange → scope 写入 → 槽位 refetch，e2e 01）；移动端「点日期格开 day sheet」由触发按钮替代（e2e 06）。形态产品化（6 周竖网格视图档）归 D1。

**分析篇 §7 两候选的终态回写**:

- **候选 1「预约槽位联动容器」→ 降级组合技巧级（不新增 C2 行）**：P3a 预判 + P3b 接线实证——calendar scope 写入 + url 模板物化 + dependsOn 自动刷新即完整承载月历/时长/时区 ↔ 槽位联动，零新原语（e2e 01/03/04/05）。
- **候选 2「slot 异步刷新策略」→ 裁定落字**：定时 refetch 由 data-source `interval` 内建承载（slots source `interval: 300000` 对齐 Booker 5 分钟实证，配置存在性由 schema 单测锁定）；**窗口聚焦 refetch 无内建支持，裁定不模拟**（`watch-only residual`，产品化归 D1 流程；Booker 语境下 interval 轮询已覆盖数据保鲜主语义）。

**缺口注记引用（接线约束实测，初版已登记项）**:

- input-phone：原生 tel 语义缺口维持（电话字段由 input-text 承载，`type="text"` 实证，visual 02 锁定）；timezoneSelector：声明未消费维持（时区选择器由独立 select 承载）。两缺口均未绕道 renderer 包改码。

**I11 剪贴板能力（新素材行，未分级）**:

- 无剪贴板类 action 词汇（ajax/navigate/openDialog/refreshSource/form submit/reset 之外无 navigator.clipboard 通道）。P3b 裁定语义模拟：copy-link 按钮 → `Cal__shareLink` 无副作用 get 端点 + `messages.success`「链接已复制」（e2e 13）；实际剪贴板写入不做。**D1 输入池候选**：`RendererEnv` clipboard 通道（同 print 族宿主能力候选）。

**新素材行（P3b 执行期新撞见，供 D1/deep-audit 参考）**:

- **refreshSource 的 scope 桶限定（renderer 级 finding）**：`refreshDataSource` 带 `ctx.scope` 时只查该 scope 自身桶、不走父链（`source-registry.ts`），form 内按钮对页面级 data-source 派发 `refreshSource` 必然 `Source not found`（本计划实测撞墙）；跨树刷新须走 `component:refresh` + `componentId`（data-source 节点显式 `id`，handle 注册 `refresh` 方法）。建议：①`flux-guide` 补 data-source 刷新姿势注意点（文档项）；②deep-audit 候选——scoped lookup 的父链回退语义。
- **toast 生命周期素材行复现（回写 ③ 同源）**：P3b 提交/取消跳转链再次以 `control: {debounce: 1200}` 延迟 navigate 保 `messages.success` 可观察（e2e 09/15），与回写 ③ 裁定一致；「host 级常驻 toast 容器」候选维持。

### 回写 ⑤ — P4b Linear 交互接线实测证据（2026-08-30，plan `2026-08-30-0040-1-p4b-linear-interaction-wiring-and-tests.md` Phase 5）

> 授权链: roadmap Cross-Cutting 5（Pi-b closure 以追加方式回写 C2，不重开初版状态）→ 本 plan Phase 5。初版裁决表零改动，本段仅追加实测证据与素材行。逐条「预测 vs 实测」对照见分析篇 `linear.md` §4.8。

**G-B1 ⌘K 命令面板（L4）实测证据（模拟深度与手感缺口）**:

- 过滤可达：dialog 继承页面 scope（P4a Decision 2）→ 裸 `input-text` 每键入 `scope.update`（`field-handlers.tsx` 无 form 分支实测）→ 命令清单 loop `items` 绑 `ARRAYFILTER+CONTAINS+LOWER` 公式内联过滤，零请求、空查询恒真显示全量（e2e 01 锁定三态：命中过滤/无命中清空/清空恢复）。
- 执行可达：命令数据扩载 `href`（导航）/`act`（动作）双字段，条目 onClick 按 `when` 门控分流——navigate / openDialog / ajax 端点 / 静态帮助面板，e2e 02/03 锁定。
- **手感缺口维持**：无焦点指针/键盘选择/模糊搜索/最近使用排序等 palette 语义；动作类命令呼出的浮层与面板堆叠（Esc 逐层退出，e2e 03），非原版「面板即关」。`ui command` 模块仍无 renderer type 包装，schema 级组装成本即为缺口本体。产品化归 D1（G-B1 依据不变）。

**G-B2 键盘导航框架（L4）终态证据（chord/J·K/修饰键手势/⌥↑↓/Space hover 逐项不模拟裁定）**:

- 不可绕道证据（P4b 全谱复核维持）：动作词汇无键盘序列监听通道（chord G/O/M、J/K 高亮指针）；table 选择列 checkbox 为普通 toggle，零 shift/meta 修饰键处理、无范围锚点逻辑（⇧click 范围选/⌘A chord/⇧↑↓ 扩展选择不可表达）；kanban 无 ⌥↑↓ 键盘重排 schema 通道（renderer 内部 `moveCardKeyboard` 存在但无 schema 事件面）；无 hover 保持计时事件（Space hover-peek）。禁 hack（全局 keydown 注入/焦点劫持）绕道。
- 鼠标等价路径全部接线锁定（侧栏导航钮/行点选+表头全选/peek 按钮/拖拽），模板感治理底线不破。产品化归 D1，`watch-only residual` 维持。

**G-B3 批量栏动态化实测（scope 选择集契约可达面）**:

- table 页可达面（`linear-issues.json` 实证 + e2e 05/07 锁定）：`rowSelection` + `selectionOwnership:'scope'` + `selectionStatePath:'issueSelection'` → 批量栏计数 `${issueSelection?.length}` 表达式、动作钮 `disabled` 空集门控、批量写端点经 `data.ids` 透传、清选择走 `component:setSelection` 空集（table 句柄；`component:clearSelection` 仅为 crud 句柄——crud `$crud.*` scope 契约与 table scope 契约为**两套平行 API**，不可平移）。
- 「批量栏 alert 包络」无语义件维持：计数/按钮/清空仍手工拼装。表头全选内建语义实测=**源数据全量进选择集**（34 行），客户端分页仅裁剪显示——「全选本页」子语义不可表达，并入 D1 选择集语义件候选。

**G-A 关联实测（骨架族 renderer 侧 finding，P4b 执行期新撞见）**:

- **cardTemplate region 无 params 绑定（P4a Phase 3 证据引用，供本回写的移交项落 C2）**：kanban `cardTemplate` region 渲染时不携带卡片 params/scope 绑定，schema 侧无法以 cardTemplate 承载每卡字段差异——P4a 实测后改用 kanban 默认卡面（title/description/color dot/tags/members）承载标识符·估算/标签 pill/指派首字圆/优先级色点（`mock-backend-linear-issues.ts` `buildLinearBoardData` 数据侧映射，`linear-replica-visual.spec.ts` 02 字段断言锁定）。该证据 P4a 执行期登记为「G-A 证据、供 C2 回写」，此处落 C2 终态：kanban 卡面自定义深度（region params 绑定）缺口成立，产品化归 D1（G-A 观察面）。
- **kanban 拖拽源注册滞后（renderer 级 finding）**：卡片 dragstart 载荷（p-dnd `source.data.cardId`）在 React Compiler dev 双挂载下可滞后 reconciliation 一拍——同一卡片元素 `data-card-id` 与实际派发 cardId 不一致（抓 ENG-101 派发 ENG-119/111/105，随渲染时序浮动）。接线行为（onCardMove → 端点 → 会话态 → refresh）以 lastMove 钩子做数据一致性断言锁定（e2e 11/13）；注册时效本体归 D1/renderer 修复流程。
- **container-body wrapper 布局语义（styling-system 侧 finding，P4a 形态的成因注记）**：container 渲染器将多子节点包进单 `container-body` wrapper（`flex: 0 1 auto`），schema 容器上的 `flex flex-row` 行向声明不透传 wrapper，多栏骨架在 shell 预画画布内呈纵排收缩（P4a 收口产物即此形态）。非本计划回归；D1 候选：container schema 布局类透传 body wrapper。

**I11 剪贴板素材行追加（第二例，未分级）**:

- `Linear__copyLink`（get、零副作用、恒成功 `{ok,id,url}`）沿 `Cal__shareLink` 语义模拟先例，两处消费（命令面板 copy 项 + peek/详情复制钮，e2e 03/06/16），`messages.success`「链接已复制」成对。实际剪贴板写入仍不做；`RendererEnv` clipboard 通道维持 D1 输入池候选。

**分析篇 §7 两候选终态回写（P4a 移交 + P4b 收口）**:

- **快捷键帮助面板 → 静态承载收口（不并入 G-B2 新行）**：`?` 呼出的帮助内容为纯静态文案（已接线清单 + 未模拟键位归因），openDialog 静态内容完整承载，经命令面板 `act=help` 与帮助条目呼出（e2e 03）；零键盘原语依赖，无需独立语义件，不构成 C2 新缺口。
- **富文本描述编辑器 → 缺口维持（optimization candidate 确认）**：详情页描述区维持纯 text 多段静态承载，本计划零编辑义务；无对应原语为本体缺口，产品化归 D1 流程。

**既有素材行复现注记**:

- **toast 生命周期（回写 ③/④ 同源第三例）**：detail 归档跳转链以 `control: {debounce: 1200}` 延迟 navigate 保 toast 可观察（e2e 18）；「host 级常驻 toast 容器」候选维持。
- **refreshSource scope 桶限定（回写 ④ 同源）**：跨树刷新一律 `component:refresh` + data-source 显式 `id`（本计划 4 张 schema 均落 `linear-*-source` id），未再撞 `Source not found`。
