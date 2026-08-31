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

### 回写 ⑥ — P5b Notion database 交互接线实测证据（2026-08-30，plan `2026-08-30-0614-1-p5b-notion-interaction-wiring-and-tests.md` Phase 4）

> 授权链: roadmap Cross-Cutting 5（Pi-b closure 以追加方式回写 C2，不重开初版状态）→ 本 plan Phase 4。初版裁决表零改动，本段仅追加实测证据与素材行。逐条「预测 vs 实测」对照见分析篇 `notion-database.md` §4.1。

**G-C 多视图数据库（L2，状态机 L4 风险）终态实测证据（本应用主对照行）**:

- **视图状态机模拟深度终判（可达面）**：tab（`valueOwnership:'scope'` + `valueStatePath:'activeView'`）+ 五分支 keepMounted hidden 切换 + 会话 viewConfig 覆写（`Notion__updateViewConfig` per-viewId overrides）+ 读端点服务端预应用，可完整承载「视图集合 + activeViewId + 每视图私有配置集生效」三层状态机（interactions e2e 06/07/08/12 锁定：覆写按 viewId 隔离、切 tab 随动、他视图零影响）。**不可达面**：运行时新增视图分支（I2，静态 schema 无渲染分支，显式裁决）；视图 tab 拖拽重排/溢出收纳动态化/三态动态切换生效（I13，tabs 原语缺口）；配置集双层权限（仅我/所有人）真实化（需 schema 外偏好存储层）。
- **嵌套 filter 求值可行性终判（P5a 静态对照③的实测义务）**：**服务端预应用姿势完整可达**——mock 端递归求值器（`evalNotionCondition`，组嵌套 maxDepth=3 与 builder 口径一致、and/or 递归、未知字段/操作符判不命中不抛错），单测覆盖嵌套/深度上限/not 组；e2e 07 端到端锁定（builder 构建规则 → 应用 → 视图过滤）。**客户端公式内联姿势不可达**：公式通道（ARRAYFILTER 等）无嵌套 group 递归展开能力——候选②机制否决理由落字 plan Phase 1。condition-builder 本体（builderMode full、and/or 切换、字段-操作符-值行组）schema 层可用，实测无阻。
- **配置集双层权限与 peek 联动结论**：双层权限（个人 vs 共享）未模拟、缺口维持（L4 候选，见下候选 1 终态）；视图类型↔默认 peek 形态联动以「语境决定载体」静态表达维持（table/board/list→side、gallery/calendar→center，与 I10 规则一致），联动规则本体未建模（原语缺口，P5a 结论维持）。

**分析篇 §7 两候选终态回写（P5a 移交 + P5b 收口）**:

- **候选 1「个人视图偏好存储层」→ 缺口维持（optimization candidate 确认）**：activeViewId 已由 tabs `valueStatePath:'activeView'` 写页面 scope 承载（会话级"当前视图"语义成立）；display 三态"仅本人生效"维持静态样本（I13 原语缺口）。会话级 scope 模拟已可达主语义，跨会话偏好持久化需 schema 外存储层（localStorage/用户偏好层）——产品化归 D1 流程，不新增 C2 行。
- **候选 2「board 列聚合计算」→ 端点动态化收口（语义件缺口维持）**：P5b 裁定 board 读载荷即端点重算（`buildNotionBoardData` 计数/Count/Percent 聚合随会话态刷新，拖拽/覆写后 e2e 09/12 锁定更新），mock 预计算静态条退役；**列头原生聚合（Sum/Avg/Min/Max + 列头内嵌形态）仍为 kanban 语义增强候选**——P5a 既有证据维持：kanban `columnHeader` region 全列共享无 per-column 绑定（G-A 观察面）。语义件产品化归 D1（L2）。

**I11 剪贴板素材行追加（第四例，未分级）**:

- `Notion__copyLink`（get、零副作用、恒成功 `{ok,id,url}`）沿 `Cal__shareLink`/`Linear__copyLink` 语义模拟先例，peek 内复制钮消费（interactions e2e 05），`messages.success`「链接已复制」成对。实际剪贴板写入仍不做；`RendererEnv` clipboard 通道维持 D1 输入池候选。

**自绘 calendar 无事件面注记（I9 calendar 子项终态）**:

- P5a D2⑥ 自绘六周竖网格（container grid + loop）无 renderer 事件面：拖拽改期无拖拽通道、不可模拟裁定维持。hover `+` 建条目以按钮面接线（container 载体 + openDialog 复用新建链路，interactions e2e 13；date 无 renderer 日期字段参数通道，日期预填不接线归 G-D 素材）。注：**text 节点无 onClick 分派面**（`flux-renderers-basic` text renderer 无事件处理），hover 控件接线需 container/button 载体——复刻页通用姿势素材。

**condition-builder 求值边界素材（回写 ⑤ G-C 素材的本应用复现与扩展）**:

- builder 输出（`{conjunction, children:[{left:{field},op,right}]}` 递归组）可由 schema 声明 `fields`（select/number/date）+ `builderMode:'full'` + `showAndOr` 承载；e2e 驱动路径 = 添加条件 → 字段 combobox（`combobox "条件字段"`）→ 值 select（`select-trigger`）。`includeScope:'*'` 合并面坑：表单 loadAction 载入数据会以同名键遮蔽编辑值——复刻页以 `ntPeek*` 规范键 + 端点别名优先级消解（单测锁定）；form 自身 `submitAction` 求值域**不可解析 `$formData`**（表达式求值失败实测），可解析字段名（`${keyword}`）；surface 级 `onSubmitSuccess` 链才可解析 `$formData`（P4b L12 姿势）。
- **scope 写入通道边界（P5b 新证，I5 搜索机制修正）**：dialog 内裸 `input-text` 每键入写 **dialog 子 scope 自有 store**——页面级 data-source 的 `dependsOn` 订阅观察不到子 scope 写入（探针实测六源零重取）；跨树生效须 `setValue`（form `submitOnChange` + `submitAction` 或 surface `onSubmitSuccess` 链）落页面 scope。P4b ⌘K「裸 input scope 写入」的 reactive 面仅限**同 scope 内** loop/表达式绑定，不可跨树——两先例口径在此对齐。

**kanban 拖拽本应用实测注记（回写 ⑤ 同源复现）**:

- `onCardMove` payload `${cardId}`/`${toColumnId}`/`${toIndex}` 契约跨应用成立；拖拽源注册滞后（React Compiler dev 双挂载，P4b G-A finding）本应用同现——e2e 同以 lastMove 钩子数据一致性姿势锁定（interactions e2e 09/11/12），列计数 9→8/9→10 等分布断言随会话态回流成立；分组属性切换（status/category/person）后 moveCard 解码对应属性值翻转，端点契约单测覆盖。注册时效本体归 D1/renderer 修复流程（P4b 结论维持）。

### 回写 ⑦ — P6b Airtable grid 交互接线实测证据（2026-08-30，plan `2026-08-30-0953-1-p6b-airtable-interaction-wiring-and-tests.md` Phase 4）

> 授权链: roadmap Cross-Cutting 5（Pi-b closure 以追加方式回写 C2，不重开初版状态）→ 本 plan Phase 4。初版裁决表零改动，本段仅追加实测证据与素材行。逐条「预测 vs 实测」对照见分析篇 `airtable-grid.md` §4.1。

**G-D 网格编辑深度（L2，本应用主对照行）终态实测证据（P6a 静态 + P6b 接线后复核）**:

- **可达面（接线锁定，interactions e2e 01–10）**：读端点流动 + 型别分派 + 客户端分页维持高承载（P6a）；接线新增可达面——记录编辑保存（record modal 15 字段编辑子集 → `Airtable__updateRecord` 会话库，atEdit\* 规范键消解 includeScope 遮蔽）、底部插行（`createRecord` 表尾插行 + required 拦截）、列头菜单排序（会话 viewConfig + 服务端预应用）、分组切换（group url 物化 + 泛化分组 category/owner/done）、行高四档切换（className 表达式状态驱动）、搜索参数化（keyword url 物化）、prev/next 导航（dialog 内数据重载）。summary/组内计数随会话刷新（端点重算）。
- **零承载面（终判维持）**：单元格原位编辑与同格双态（导航态/编辑态空间分离近似维持）、动态列模型（隐藏/换型别/插删列运行时变更）、范围选区、fill handle、键盘导航层——键盘十五键位终态见下。产品化归 D1（G-D 语义件族 + G-B2/G-B3 依赖）。

**G-B2/G-B3 键盘/批量终态（十五键位终态表 + 分组态补充键位，P6b 处置表 A15/A16）**:

- **G-B2 正面素材（新发现）**：table renderer 行 keydown 中继**在库**——声明 `onRowClick` 事件后行 `tabIndex=0` 且 Enter/Space 内建中继派发行动作（`table-body-row-rendering.tsx:196-227`，a11y 语义）。G-B2「键盘导航框架 L4」缺口据此精确化：**单点键盘中继已有 renderer 层先例，缺口收敛在框架层**（焦点管理/roving/chord/修饰键/选区扩展），非键盘事件通道完全缺失。P6b 因 modal 体复制成本与单击行语义冲突未激活该通道（A13 显式裁决，注记锁定 e2e 07），通道本身可复用。
- **G-B3 维持**：范围选区/⌘ 多选/⌘C·X·V/⌘Z·Y/fill handle 全部零通道（回写 ⑤ P4b 口径跨应用维持）；批量操作栏未启用（Airtable grid 无常驻批量栏形态，同 P5b N14 裁定姿势——选区语义件候选维持 D1）。

**分析篇 §7 两候选终态回写（P6a 移交 + P6b 收口）**:

- **候选 1「grid 分组聚合语义」→ 并入 G-D 行（不新增 C2 行）**：`group=` 参数化分组 + 组内计数 + 组内 summary 由「mock 服务端预聚合 + 读端点重算」完整承载（分组切换 e2e 03、写后随会话刷新 e2e 06/08）；table renderer 无内建分组/聚合渲染语义维持为 G-D 子能力缺口（初判 L2 维持，产品化随 G-D 语义件族）。
- **候选 2「范围选区 + fill handle 编辑模型」→ 并入 G-B3 观察面（不新增行，行语义扩注）**：实测确认其超出"批量操作栏"语义——是**编辑器选区模型**（选区锚点 + 等差填充拖拽原语 + 键盘选区扩展），与 G-B2 键盘选区同根；P6b 零承载实测维持。G-B3 行的"批量操作栏语义件"之外追加此选区模型维度，产品化归 D1。

**P6a Deferred 三项终态（本计划收口）**:

1. **交互接线全谱** → 收口：处置表 A1–A16 全部落终态（接线锁定 8 / 显式裁决 8 复合计，无静默跳过），每条接线锁定项 ≥1 条先红后绿 e2e。
2. **键盘双态模型/fill handle/范围选区/⌘ 多选/Space 展开** → 十五键位终态表落字（内建锁定 1 / 按钮面接线 + 键盘裁决复合 4 / 纯显式裁决 14）；Space 通道发现见 G-B2 正面素材。
3. **rating/collaborator 选人/grid 分组聚合/范围选区归属** → rating 原语缺口维持（★ 序列近似承载 + 编辑子集 input-number(1–5)）；collaborator 选人原语缺口维持（自绘头像 + 不进编辑子集）；分组聚合并入 G-D（候选 1）；范围选区+fill handle 并入 G-B3 观察面（候选 2）。

**新素材行（P6b 执行期发现，供 D1/deep-audit 参考，未分级）**:

- **`component:<method>` 通用组件动作 + form 句柄 = dialog 内数据重载通道（G-L 关联正面证据）**：form 组件句柄注册 `refresh` 方法（重跑 loadAction），`{action:'component:refresh', componentId:<form id>}` 可在 dialog 内实现「setValue 换参 → form 数据重载」（P6b prev/next 导航即此通道，e2e 10）——**无需嵌套浮层、无需跨树写 scope**。与 G-L「dialog 影子写限制」观察项对齐：dialog 内需要改"自身数据源"时，组件句柄方法是 scope 限制的合法绕道；跨树改页面 scope 的限制本身维持（见下条）。
- **dialog 开启位置决定 surface form 写入域（回写 ⑥ scope 通道边界的精化）**：回写 ⑥ 已证「dialog 内裸 input 写子 scope 不可跨树」；P6b 追加精化——**form `submitScope:'surface'` 的 setValue 写入域 = 打开 dialog 时捕获的 owner scope**：入口在 page body（视图栏）→ 落页面 scope（搜索 A1 可用）；入口在 table 列头/行内 → 落 table 局部子 scope，页面级 dependsOn 不可观察（排序 A5 候选① 由此实测否决，改走会话写端点）。deep-audit 候选：surface 写入域与开启位置的耦合语义。
- **表达式 className 状态驱动成立（G-F/G-F2 既有口径精化）**：静态节点 className 表达式对 scope 变量的响应性实测成立（行高分段控件 setValue → 网格 wrapper className `${'at-density-live-' + (atRowDensity ?? 'short')}` → 行高随动，e2e 04）。回写 ③–⑥「schema 层无选中/hover 态表达通道」的口径据此精化：**表达式机制本身可用，缺口在交互态状态源**（选中集/键盘焦点/hover 等状态无 schema 承载）——G-F option-row 原语 D1 首项依据不变，G-F2 缺口面收窄。
- **columns 显隐 scope 通道在库（较初判乐观的事实修正）**：table `columnSettings:{enabled:true}` + `toggledStatePath` 已支持 scope 驱动列显隐（`use-table-visible-columns.ts:44-80`，回写 ③「勾选显隐原生可达」的 plain-table 对应物）；P6b 不接线裁决基于 chrome 副作用（启用即挂设置按钮）与 20-toggle 表达式数组手术成本（A6），非机制缺失。
- **includeScope 载荷遮蔽坑第五例**：`atEdit*` 编辑面规范键 + 端点别名优先级消解（`ntPeek*` 先例第五处复用：cal/linear/notion/antdpro 后），模式已稳定可沉淀为接线规范条目。

### 回写 ⑧ — P7b Stripe dashboard 交互接线实测证据（2026-08-30，plan `2026-08-30-1333-1-p7b-stripe-interaction-wiring-and-tests.md` Phase 4）

> 授权链: roadmap Cross-Cutting 5（Pi-b closure 以追加方式回写 C2，不重开初版状态）→ 本 plan Phase 4。初版裁决表零改动，本段仅追加实测证据与素材行。逐条「预测 vs 实测」对照见分析篇 `stripe-dashboard.md` §4.1。

**G-E 高密度排版/金融表格（L2，本应用主对照行）终态实测证据（P7a 静态 + P7b 接线后复核）**:

- **密度档证据链闭环（切换不接线裁定 + 机制证据引用）**：参照值三档 32/40/48px 实测锁定（P7a §1，e2e getComputedStyle ±2px）维持；档位**切换不接线**为本计划显式裁决——Stripe 原版无密度切换控件（分析篇 I8「密度档为拟定补充」），且 className 表达式状态驱动的切换机制可用性已由 P6b A9 实测承载（回写 ⑦ 素材行）——G-E 密度档缺口证据链就此闭环：**参照值实测在库 + 切换机制可达在库 + 原版无控件故复刻不发明**，密度档语义字段（按档渲染行高的语义承载）产品化归 D1 输入池。
- **金额等宽排版承载终判维持**：mock 预计算轨（`formatStAmount` 币种注册表 + 千分位）+ cell `className` 复刻类（`.st-money` tabular-nums + 右对齐）为终态承载；schema 表达式轨 `toFixed` 边界维持（无千分位/按币种小数位需分支，单测对照锁定）——**`formatCurrency` registry 函数候选维持 D1 输入池**。
- **语义状态 pill 型别候选维持**：四语义色阶对 pill 以 mock 预计算 `statusPillClass` 投影 className 承载（P5a notion `statusChipClass` 同源第二例），renderer 无内建语义 pill 型别缺口维持，产品化归 D1。

**G-B3 批量操作栏「无批量栏」对照终态（P7a 素材行收口）**:

- **Stripe 原生无批量栏**（分析篇 I11 调研结论）跨 P7a/P7b 两段维持：复刻页零选择集列、零批量栏（e2e `stripe-no-batch-note` 注记断言锁定）——「参考应用无此件，复刻无需新增」终态收口。
- **flux 侧通道现状对照维持**：批量选择集 + 批量动作为 crud 域内建（回写 ⑤ scope 选择集契约），table 复刻面不自带——P7b 接线未产生新批量缺口证据，G-B3 行零扩充。

**分析篇 §7 两候选归属裁决（P7a 移交 + P7b 收口）**:

- **候选 1「筛选状态 URL 同步」（chip/日期/搜索词入 URL 可书签）→ runtime/页面壳层能力候选（D1 输入池，不新增 C2 行）**：schema 层验证了筛选状态集的**会话内**承载完整可达（页面 scope 变量 + url 参数物化 + `dependsOn` 自动刷新，interactions e2e 01–03 锁定）；**路由 query ↔ 筛选状态双向绑定**零通道维持（无路由参数读写 action 词汇/数据源 URL 回写通道），G-B2 同族口径（页面壳层状态面），产品化归 D1。禁 hack（hash 手工拼装绕道）维持。
- **候选 2「语法搜索解析器」（`amount:>100`/`is:refunded` 类）→ 自研解析器候选（D1 输入池，复刻维持降级）**：P7b 搜索接线止步于 keyword 参数化（mock `keyword=` 过滤 + 空态兜底，e2e 01）；语法解析→数据源查询参数语义的反哺潜力维持分析篇 §7 初判，产品化归 D1，§6.2 降级声明维持。

**D1 输入池素材行汇总（P7b 登记，全部未分级）**：①`formatCurrency` registry 函数（金额格式化——千分位 + 按币种小数位 + locale）；②语义状态 pill 型别（colorLadder 语义字段）；③密度档语义字段（行高档位语义承载）；④download/print 宿主通道（`RendererEnv` 缺口，回写 ③ 同源第五例——导出确认载荷语义模拟为现役替代）；⑤筛选状态 URL 同步（runtime/页面壳层）；⑥语法搜索解析（自研解析器 + data-source 查询语义反哺）。

**新素材行（P7b 执行期发现，供 D1/deep-audit 参考，未分级）**:

- **checkbox 字段 `defaultValue` 不生效，form 级 `data` 预填为可达通道**：checkbox 字段 `defaultValue: true` 对 `aria-checked` 零效果（live 探针，`useDefaultValuePush` 管线未触达 boolean 型默认）；**form `data` 预填可达**且支持绑定页面 scope 表达式（`"data": {"widgetRefunds": "${(stWidgetRefunds ?? 'on') === 'on'}"}`）实现**重开浮层预填当前会话态**（搜索 keyword 回显同款机制的第二用例）。select/`input-number` 的 `defaultValue` 正常（P6b A10 先例）——默认值通道按字段型别分裂。
- **form `submitAction` 求值域不可解析 select 字段名（P5b 口径按字段型别精化）**：`${filterStatus}`（select 字段名）在 submitAction 表达式域求值失败 → 该 setValue 静默不执行（live 探针：refetch 发生但参数为空）；`$formData` 在 dialog 级 `onSubmitSuccess` 域可解析且**携带 select 选中值**。终态姿势：submitAction 保留字面量写（保证成功链）+ 真实写入全部落 dialog `onSubmitSuccess` 链。P5b「可解析字段名」口径据此精化为**按字段型别/值注册路径而异**。
- **table 内建 sorter 客户端排序可达（P7b I4 实测，与 P6b A5 会话端点变体互为备选）**：列 `sortable: true` + 列 name 对齐数据字段即可承载点击排序（asc→desc→null 内建循环 + 内建升降箭头 + `th[aria-sort]` 视觉态），`processTableData` 对全量 source 客户端排序在客户端分页形态下完整可达（金额列以 minor 单位数值序、日期列以 ISO 串字典序承载）。纯展示型部分列排序无需会话端点。
- **`__stripeTestHooks.lastUrl` 观察 affordance**：端点计数钩子旁挂最后一次请求 url（notion `lastUpdate`/`lastMove` 同族第五例），e2e 排查「refetch 发生但参数未物化」类问题的关键探针——opt-in 钩子载荷观察从"写载荷"扩展到"读 url"，模式可沉淀为复刻接线规范条目。

### 回写 ⑨ — D1 option-row 原语产品化终态（2026-08-30，plan `2026-08-30-1333-2-d1-gf-option-row-primitive.md`）

> 授权链: roadmap Cross-Cutting 5（追加式回写，初版裁决表零改动）+ D1 work item 本体（G-F/G-F2 终态裁决由本 plan Phase 4 承载）。HEAD 见当日 dev log。

**G-F（option-row 原语，L3）已产品化（本 plan）——终态证据**:

- 契约落地：行类 renderer `optionRow` 语义字段族（`OptionRowConfig`：`value` 选中值绑定（owner scope SchemaValue、数组 any-match、失败兜底无选中）+ `valueField`（list 默认 keyField / table 默认 rowKey）+ `selectedClass` schema 消费类）+ `@nop-chaos/flux-react` 共享状态 helper（`getOptionRowStateAttributes`/`getOptionRowStateTokens`/`optionRowValueMatches`/`optionRowBindingEquals`）。marker 输出协议：`data-option-row` / `data-state`（token 集）/ `data-selected` / `aria-selected` / `aria-disabled`，hover 走 `[data-option-row]:hover` + `@media (hover: hover)` 门（触摸端协议级 no-op），未声明 optionRow 输出与现行为渲染快照等价。契约文档：`docs/references/renderer-interfaces.md` §Option-Row Interaction-State Contract；flux-guide `design-patterns/list.md` §3.1 + `design-patterns/table.md` §4.1。
- 采纳面：list（`list-renderer.tsx`）+ table 行（`table-body-row-rendering.tsx` DataRowView，memo comparator 同步）+ 族2 成员 ai-feedback 投票态（经 `getOptionRowStateTokens` 接入标准通道，`data-active` 保留兼容）。先红后绿单测：`list-option-row.test.tsx`（12 条：兼容矩阵/属性类输出矩阵/绑定响应式/失败兜底/clash dev warn/无 JS hover 断言）+ `table-option-row.test.tsx`（7 条）+ `ai-feedback-option-row.test.tsx`（3 条）。
- **族2（状态已发射、样式零消费）消解结论（回写 ② 实证闭环）**：TableRow 选中（改造前行级零选中 marker）与 ai-feedback 投票态（`data-active` 零消费）均经原语消解——修复模式从「逐个渲染器补丁」收敛为「schema 声明 + host CSS 消费标准 marker」。
- **族2 余量成员终态登记（successor / 维持）**：notice-bar 变体——live 复核已被 MA-06 调色板消费（`styles.css` `[data-variant]` 四变体），不构成零消费样本，关闭；gantt 任务条选中——渲染器层已硬编码消费（`bg-blue-50`），即回写②「逐个补丁」在案样本，维持现状（按价值可后续采纳 `selectedClass` 通道）；calendar drop-target——`data-drop-target`/`data-drop-valid` DOM 直写零 CSS 消费，属拖拽瞬态语义非行选中态，option-row 通道不承载，留 CSS 消费 successor 候选（successor 登记即本回写条目，r3-p2 台账对应行不做回改——台账为历史执行记录）。
- **G-F2（className 表达式绑定，L3）终态：关闭（被 G-F 吸收）**。依据：回写 ⑦ A9 实测表达式机制可用；其剩余缺口面（交互态状态源）由本原语承载；表达式 className 用法文档面由 flux-guide option-row 条目覆盖（`selectedClass` + 标准 marker 双通道）。
- styling-system 核查结论：`data-state` marker 与既有「state 用 data-_/aria-_ 表达」规则兼容（map/code-editor 已有 `data-state` 先例），styling-system.md 零改动（无凑条目）。

### 回写 ⑩ — D1 G-B1 command-palette 原语产品化终态（2026-08-30，plan `2026-08-30-1737-1-d1-gb1-command-palette-renderer-primitive.md`）

> 授权链: roadmap Cross-Cutting 5（追加式回写，初版裁决表零改动）+ D1 work item 本体（G-B1 终态由本 plan Phase 3 承载）。HEAD 见当日 dev log。

**G-B1（⌘K 命令面板原语，L3——级别锚定以初版裁决表 L3 为准）已产品化（本 plan）——终态证据**:

- 契约落地：`command-palette` renderer type 落 `@nop-chaos/flux-renderers-basic`（dialog/drawer surface 家族，`category: 'layout'`），包装 `@nop-chaos/ui` Command 九件（cmdk ^1.0.0 底座），ui 包零改动（Command 族在 `ui/src/index.ts:16` 既有导出面，ask-first 门禁未触发）。字段族：静态双轨（`items` 扁平 + `item.group` 聚类 / `groups` 显式分段，先 groups 后 items）+ 动态轨（`source`，`allowSource` + `sourceStateKey:'sourceState'`，tree-controls 先例）+ 搜索语义（`placeholder`/`shouldFilter` 平铺，嵌套对象否决——门禁按字段粒度）+ `emptyText` 空态 + surface 开合字段取舍（`open`/`defaultOpen`/`statusPath`/`container`/`closeOnEsc`/`closeOnOutsideClick`/`showMask`/`onOpen`/`onClose`；`title/body/actions/header/footer` regions、`data/isolate`、`size/width/height`、`confirm`、`showCloseButton` 不采纳——palette 内容由命令条目承载、常驻页面树不建 surface 子 scope）。契约文档：`docs/references/renderer-interfaces.md` §Command Palette Surface Contract；flux-guide `design-patterns/page-dialog-drawer.md` §8。
- 命令执行双轨：事件轨 `onCommand`（payload `{id, item, groupId}`，CX-10 ctx 约定，恒派发）+ 静态轨条目 `action`（`helpers.dispatch`，args 模板 `${id}`/`${item.*}` 派发期求值）；并存时静态轨先于事件轨。**面板即关**（先关后派发：onClose 先于 onCommand，palette 不入 SurfaceRuntime 条目栈、关面板后组件保持挂载，派发上下文存活）。兜底：缺 label 回退 id→空串、缺 id 合成键、非对象条目跳过，清单不中断（`palette-item-invalid`）。
- **P4b 手感缺口逐项消解终态**：键盘选择/焦点指针 → cmdk 内建 ↑↓/Enter/Esc + `data-selected`（包装即得）；内建过滤 → cmdk filter（`shouldFilter:false` 保留 P4b 外置公式过滤姿势为官方通道）；面板即关 → 执行后先关后派发；键位呼出 → palette 级 `hotkey` 单键位 prop（`mod+k`，renderer 局部 window keydown + 卸载清理，受控 palette no-op——外控优先与 `palette-open-clash` 同口径，`templateNode.schema` 零回读）。**未纳入项（successor 登记）**：模糊搜索自定义评分/最近使用排序（cmdk 内建评分采纳之上，Non-Blocking Follow-ups）；移动端 bottom-sheet 降级形态（v1 维持 dialog 形态，无对照证据不发明）；跨页 palette 单例/app 级命令注册中心（runtime/页面壳层候选池）。
- **受控重开对等（dialog plan-459 同语义）**：受控 `open` 简单路径表达式经编译期 `SchemaFieldRule.compile` 钩子捕获（flux-core 既有扩展点，renderers 包内首例）——用户关闭（Esc/外部点击/执行）自动写回 `false` + latch，幂等 `setValue(open,true)` 可重开；复合表达式/字面量布尔纯 latch（dialog 同口径）。**flux-core 零改动、runtime 裸 schema 读取零新增**。
- 先红后绿单测：`command-palette.test.tsx`（14 条：定义契约 + 开合矩阵含句柄 no-op/外控优先/Esc 抑制/hotkey 受控 no-op/statusPath 发布/plan-459 幂等重开）+ `command-palette-items-execute.test.tsx`（17 条：items 双轨矩阵/过滤/键盘选择/空态/执行双轨/面板即关/禁用跳过）共 31 条。执行期三项契约级发现（compile 期 open 路径捕获、`sourceStateKey` 缺失导致失败 source 冻结节点 props、`CommandList` 是 cmdk 键盘/空态语义承载前提）已落字 plan Phase 2 实现记录。
- styling-system 核查结论：面板根 `nop-command-palette` marker + ui `data-slot="command*"` 内部标记 + `data-selected`/`aria-selected` 状态属性——与「widget renderer 自样式 + root marker + data-slot + data-\*/aria-\* 状态」既有规则完全兼容，styling-system.md 零改动（无凑条目）。
- 执行顺序约束履行：本 plan 先于同批 G-A plan（`2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`）触碰 `flux-renderers-basic` 定义登记文件，冲突面消除。

### 回写 ⑪ — D1 G-A 页面模板层语义件族产品化终态（2026-08-30，plan `2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`）

> 授权链: roadmap Cross-Cutting 5（追加式回写，初版裁决表零改动）+ D1 work item 本体（G-A 终态由本 plan Phase 5 承载）。HEAD 见当日 dev log。

**G-A（页面模板层语义件族，L2——级别锚定以初版裁决表 L2 为准）已产品化（本 plan）——终态证据**:

- **载体裁定终态（三语义件分轨）**：①PageHeader → `page` renderer 语义增强（L2，零新 type）：`breadcrumb`（`{label, href?}` 条目数组/表达式，坏条目跳过不中断）+ `extra` region（标题行右端 `data-slot="page-extra"`）；语义分支与 legacy 分支共存（无语义字段时 DOM 逐字节等价，`pageheader-compat` 锁定）；溢出 = 截断 + 原生 title 提示（`pageheader-overflow`）；内容 tab **不纳入**（既有 `tabs` 在 body 组合，零增量语义）。②QueryFilter → 新独立 `query-filter` renderer type 落 `@nop-chaos/flux-renderers-data`：`body` 经 authoring transform 降为嵌套 form（`filterForm` region，crud `queryFormRegion` 先例）、查询/重置内建（`onSubmit` 降 form `submitAction`、Reset = `component:reset` + onReset 链）、`togglable` 展开收起包络、网格布局转发；无声明链时空管线不抛错（`queryfilter-no-form-ctx`）；无隐式 host 检测无 dev warn（`queryfilter-clash` 裁定：crud.queryForm 文档级约定通道，运行时零冲突面，预期 warn 分支因误报面大于收益不采纳）。③Result → 新 `result` renderer type 落 `@nop-chaos/flux-renderers-content`（`empty` 兄弟）：status 四语义映射（success/error/warning/info → 默认图标 + 语义色，alert 先例）+ `icon` lucide 覆盖 + title/description value-or-region + `actions` region 单通道（否决 AntD `extra` 命名，包内 empty/card/alert 同名一致性优先）；非法 status → info 兜底 + dev warn（`result-status-invalid`）。
- **dead config 处置终态（分轨，零静默失效）**：`queryForm.defaultCollapsed/collapsedLabel/expandedLabel` → `@deprecated` JSDoc + authoring transform emit warning 诊断指向 `filterTogglable`（不接线：接线会静默改变既有 schema 行为且语义位置错置）；live 复核新增登记的 `filterTogglable.collapsedLabel/expandedLabel` → 接线消费（crud toggle 包络 collapsed 文案 / expanded aria-label，纯增量零回归）。执行期同源发现并修复：`filterTogglable: true` boolean 形态被 propContract shape 门禁静默丢弃（在库 bug，`use-crud-filter-toggle.ts` boolean 分支为死代码）——crud propContract 改精确 union 修复 + 回归测试锁定；query-filter `togglable` 同款 union 预防。
- 契约文档：`docs/references/renderer-interfaces.md` §Page Header Semantic Fields / §Query Filter Semantic Component / §Result Semantic Component（终稿，live 行为逐项核对 + landed 状态标注）；flux-guide `design-patterns/page-templates.md`（新增，三语义件用法样例 + 组合页样例）。
- 先红后绿单测：`page-header-semantics.test.tsx`（9 条：compat 2 + breadcrumb 输出矩阵 4 + extra/结构 3）+ `query-filter.test.tsx`（19 条：定义契约 1 + transform 6 + 渲染行为 8 + dead config/crud 回归 4）+ `result-renderer.test.tsx`(10 条：定义契约 + 四语义矩阵 + 缺省/兜底 + value-or-region + actions + icon 覆盖 + marker)。crud 既有 queryForm/filterTogglable 零回归（既有测试全绿 + boolean 形态回归新增）。
- styling-system 核查结论：三语义件 marker 面（`nop-page` 既有 + `nop-query-filter`/`nop-result` root marker、`page-breadcrumb`/`page-extra`/`page-heading`/`query-filter-*`/`result-*` data-slot 内部区域、`data-status`/`data-collapsed` 状态属性）与「widget renderer 自样式 + root marker + data-slot + data-\* 状态」既有规则完全兼容，styling-system.md 零改动（无凑条目）。
- **未纳入项（successor 登记）**：schema 模板预设库（blocks 式整页模板分发，基于本 plan 语义件组装——roadmap C2 预登记候选的另一半，独立 plan 候选）；既有复刻页（antdpro 等）语义件化 retrofit（复刻页迭代时采纳）；回写 ⑤ G-A 观察面三项（kanban cardTemplate params 绑定 / 拖拽源注册滞后 / container-body wrapper 透传）维持观察面登记，归 renderer 修复流程/D1 输入池；G-B3/G-C/G-D 语义件族（C2 §2 第 6 位）独立 plan。

### 回写 ⑫ — D1 G-B2 键盘导航框架产品化终态（2026-08-31，plan `2026-08-30-2312-1-d1-gb2-keyboard-navigation-framework.md`）

> 授权链: roadmap Cross-Cutting 5（追加式回写，初版裁决表零改动）+ D1 work item 本体（G-B2 终态由本 plan Phase 4 承载）。HEAD 见当日 dev log。执行顺序约束履行：本 plan（N=1）按 C2 §2 排序先于同批 G-B3 plan（`2026-08-30-2312-2`，N=2）执行，共写面冲突消除。

**G-B2（键盘导航框架：chord/peek/多选/键盘重排，L4——级别锚定以初版裁决表 L4 为准）已产品化（本 plan）——终态证据**:

- **绑定通道契约落地**：独立不可见 renderer type `keyboard` 落 `@nop-chaos/flux-renderers-basic`（`category: 'logic'`，`reaction` 兄弟，恒渲染 null、零 DOM 零 marker）。字段族：`bindings`（`keys` 单键位组合 `"mod+shift+s"` 或空格分隔 chord 序列 `"g o"` + `when` 裸表达式门控（`checkableWhen` 先例）+ `allowInInput`（缺省 false）+ `preventDefault`（缺省 true）+ `action` 静态派发轨）+ 节点级 `chordTimeout`（缺省 1000ms）+ `onTrigger` 事件轨（payload `{ keys, index, nativeEvent }`）。**回写 ⑤「chord（G/O/M）与 J/K 高亮指针零通道」缺口就此消解**——chord 序列与页面级绑定均为 schema 可表达。
- **共享键盘解析 helper**：`@nop-chaos/flux-react` `src/keyboard.ts`（`parseKeyCombo`/`parseModifierHotkey`/`parseKeySequence`/`comboMatchesKey`/`isEditableKeyboardTarget`/`createChordMatcher` chord 缓冲状态机）+ `use-keyboard-bindings.ts` window 监听 hook（输入焦点门控 / defaultPrevented 内建优先跳过 / surface 层叠路由 / chord 超时与最长匹配兜底）。command-palette `parseHotkey` 私有实现抽出替换为共享 `parseModifierHotkey` + `comboMatchesKey`（行为零变化，既有 31 条单测零回归）。
- **语义裁定终态（kb-\* Failure Paths 全部终态化）**：kb-input-focus 输入优先；kb-chord-timeout 失配/超时复位 + 失配键 idle 重评（重叠序列可启动）；kb-prefix-conflict 最长匹配（短绑定等待→超时兜底派发短）；kb-conflict 同节点重复序列登记序优先 + dev warn 一次；kb-surface-stack surface 栈非空时页面级绑定暂停、surface 内声明保持活跃（scope 祖先链判定，`SurfaceEntry.scope`）；kb-action-error dev warn 不解绑。
- **table 选区修饰键语义落地**：`rowSelection.modifierSelect`（checkbox 模式有效、radio 惰性、缺省 false 行为逐字节等价）——⇧click 加法并集范围选（锚点 = 最近无修饰键操作行；不可选行跳过；上限沿视图行序截断；永不取消；keepOnPageChange 保留键共存）+ meta/ctrl-click 独立切换（既有行为契约落字）+ ⌘/ctrl+A 表内全选（容器级触发域 + editable target 门控）。**回写 ⑤「table 选择列零 shift/meta 修饰键处理」缺口就此消解**。先红后绿：hook 级矩阵 11 条 + UI 手势矩阵 7 条（`table-modifier-select-hook.test.tsx` + `table-modifier-select.test.tsx`），共存矩阵（maxSelectionLength/checkableWhen/keepOnPageChange/toggleOnRowClick/radio 惰性/缺省兼容）逐项锁定；行 memo 局部性经 ref 镜像 rows/anchor 保持（perf locality 诊断回归全绿）。
- **J/K 指针组合验证**：绑定通道（J/K → setValue 指针变量）+ G-F `optionRow.value` 绑定组合用例测试锁定（`keyboard-pointer-option-row.test.tsx`——J 下移/K 上移/边界钳制/无关键不动，行选中 marker 随动）。**P4b「J/K 高亮指针」手感缺口经原语组合可表达成立**；表达式能力充足（三元投影），零公式函数候选。
- **回写 ⑤ 表述修正（本 plan Proof 节实测义务履行）**：回写 ⑤「kanban 无 ⌥↑↓ 键盘重排 schema 通道（renderer 内部 moveCardKeyboard 存在但无 schema 事件面）」中「无 schema 事件面」**表述不精确**——`moveCardKeyboard`（`use-kanban-dnd.ts:180-202`）确实派发 schema 事件（`moveEvent?.(...)` → `kanban-board.tsx` 统一 wrapper → `events.onCardMove`）。真实余量收窄为两条：①手势变体固定 Space+←/→（非 ⌥↑↓ 直移）且无 schema 配置面；②键盘重排挂接以 `draggable` 为门（`use-kanban-board-effects.ts:76`），无独立开关。roving tabindex 在库复核一致（`kanban-column.tsx:270,296`）。
- **未纳入维度 successor 登记（Deferred But Adjudicated，plan Decision 4/5 终态）**：①范围选区 + fill handle 编辑器选区模型 → `out-of-scope improvement` deferred，successor D1 输入池 / G-D 语义件族 plan（依赖 G-B2+G-B3 双前置就位后重评）；②共享 roving helper → `not adopted`（单采纳方投机基础设施；≥2 renderer 需网格键盘导航时再抽取，届时 kanban ad-hoc 回归采纳评估）；③kanban 手势变体/draggable 解耦 → `optimization candidate` deferred（本 plan kanban 零改动确认）；④hover-peek（Space hover 保持计时事件）→ `watch-only residual` deferred，successor D1 输入池 / deep-audit 候选。
- 契约文档：`docs/references/renderer-interfaces.md` §Keyboard Binding Contract + §Table Modifier Selection Contract（终稿，live 行为逐项核对 + landed 状态标注）；flux-guide `07-structural-nodes.md` §Keyboard Bindings（键位绑定 + chord 用法 + J/K 指针组合样例）+ `design-patterns/table.md` §4 `modifierSelect` 条目。
- 先红后绿单测汇总：flux-react `keyboard.test.ts` 20 条（纯逻辑 helper + chord 状态机）+ flux-renderers-basic `keyboard-bindings.test.tsx` 20 条（定义契约/键位派发矩阵/chord 时序矩阵/输入门控/内建优先/冲突 dev warn/when 门控/非法 keys/surface 路由/卸载清理）+ data 包 19 条（选区修饰键 + J/K 组合）。
- styling-system 核查结论：`keyboard` 恒渲染 null（零 DOM 零 marker）；选区修饰键复用既有 `table-select-cell` slot 与 checkbox 通道，零新增 marker/CSS 面——styling-system.md 零改动（无凑条目）。

### 回写 ⑬ — D1 G-B3 批量操作栏语义件产品化终态（2026-08-31，plan `2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`）

> 授权链: roadmap Cross-Cutting 5（追加式回写，初版裁决表零改动）+ D1 work item 本体（G-B3 终态由本 plan Phase 4 承载）。HEAD 见当日 dev log。执行顺序约束履行：本 plan（N=2）于 G-B2 plan（N=1）收口后执行，共写面 `use-table-selection.ts`/`data-renderer-definitions.ts` 冲突消除。

**G-B3（批量操作栏语义：选择集绑定 + 批量动作，L2~L3——级别锚定以初版裁决表 L2~L3 为准）已产品化（本 plan）——终态证据**:

- **批量栏语义件契约落地**：新 renderer type `batch-bar` 落 `@nop-chaos/flux-renderers-data`（QueryFilter/Result 先例；命名与 dead `bulkActions` 零共享词元，dead 状态维持原样零复活）。字段族：`selectionPath`（raw scope path 反应式绑定，双宿主通用：crud 嵌套 `$crud.selectedRowKeys` / table 页面级 `selectionStatePath` 同源路径）+ `countTemplate`（`lazyEval` 编译进 structuralFields，渲染期在 `{count, selectedRowKeys}` 子作用域求值——loop `itemData` 先例；缺省 i18n）+ `actions` region + `clearTarget`/`clearLabel`（内建清空：registry 解析 → crud `clearSelection` 优先 → table `setSelection` 空集兜底的统一句柄解析 facade）。**内建非空可见门控**：选择集空/路径缺失/求值失败 → 包络渲染 null（batch-bar-empty），与 schema 级 `visible` 取 AND（不可绕过）。**回写 ③⑤「批量栏 alert 包络无语义件、toolbar 文案节点 + 按钮 + visible 手工拼装」缺口就此消解**。
- **「全选本页」选择语义收口（回写 ⑤ 登记的子语义缺口）**：`rowSelection.selectAllMode: 'all' | 'page'`（缺省 'all' 零回归）双侧采纳（crud `selection.selectAllMode` 经 `buildCrudTableSchema` 透传内部 table 载体）。'page' 语义 = check/uncheck-all-visible（勾选 = 既有选择集 ∪ 页行集、取消 = 移除页行集保留他页键），与手动逐行勾选语义同构；服务端分页下与 'all' 同源（已流入行集，回写 ⑤ 34 行实证口径）；表头勾选态跟随页作用域；`maxSelectionLength`/`checkableWhen`/`modifierSelect`（G-B2）共存矩阵锁定，radio 惰性。
- **双选择集契约对接边界落字（Goal 3）**：语义件以「读 = 显式 scope path 反应式绑定；写（清空）= 组件句柄解析 facade」的边界与 crud `$crud.*`、table scope 两套平行 API 对接——两套 API 本体零改动、不合并不平移（统一治理维持 Follow-up 登记，`Non-Blocking Follow-ups` 区）。
- 失败路径全落字：batch-bar-empty（空集/路径缺失/求值失败 → 静默 null）/ batch-bar-target-invalid（清空目标缺失 → no-op + 一次性 dev warn）/ batch-bar-count-expr（模板求值失败 → 原始计数回退 + dev warn）/ batch-bar-clash（读路径权威，按空集处理）/ selectall-page-server / compat（缺省行为渲染等价）。
- **参考应用形态对照终态**：AntD Pro alert 包络手工拼装（回写 ③）与 Linear 容器批量栏（回写 ⑤）两形态均被语义件等价表达（双宿主对接用例先红后绿锁定）；Stripe 无批量栏（回写 ⑧）维持零扩充——本 plan 零复刻页 retrofit（`Deferred But Adjudicated` 区登记，复刻页迭代时采纳）。
- 先红后绿单测：`batch-bar.test.tsx` 13 条（可见性/计数模板/清空句柄/动作区/校验矩阵）+ `batch-bar-hosts.test.tsx` 2 条（双宿主对接）+ `table-select-all-mode.test.tsx` 11 条（缺省零回归/page 语义/服务端/max+checkable 共存/crud 透传/校验）共 26 条；连带面 playground route-matrix + lab page 三场景登记。
- 契约文档：`docs/references/renderer-interfaces.md` §Batch Bar Semantic Component + §Table Select-All Mode Contract（终稿，live 行为逐项核对）；flux-guide `design-patterns/crud.md` §4a（crud 宿主 + table 宿主双样例 + selectAllMode 说明）+ `design-patterns/table.md` §4 rowSelection 字段表 selectAllMode 条目；styling-system 核查零改动（根 marker + data-slot + data-count 状态属性符合既有规则，widget renderer 自样式，无凑条目）。
- **观察面余量登记**：范围选区/fill handle 编辑器选区模型归 G-B2 plan 专项 Decision 的 successor 登记（本 plan Non-Goal 边界确认，零改动）；G-C 多视图状态机 / G-D 网格编辑语义件族（C2 §2 #6 其余成员）拆分后续独立 plan（G-D 依赖 G-B2 + 本计划双前置，两前置均已就位）。

### 回写 ⑭ — D1 G-C 多视图数据库语义件产品化终态（2026-08-31，plan `2026-08-31-0721-1-d1-gc-multiview-database-semantic-components.md`）

> 授权链: roadmap Cross-Cutting 5（追加式回写，初版裁决表零改动）+ D1 work item 本体（G-C 终态由本 plan Phase 4 承载）。HEAD 见当日 dev log。执行顺序约束履行：本 plan（N=1）先于 G-D plan（N=2）执行，共写面 `renderer-interfaces.md`/flux-guide/C2 回写追加区冲突消除（本回写先落 ⑭，G-D 后落 ⑮）。

**G-C（多视图数据库语义：视图切换状态机 + 列聚合 + 视图管理动态化，L2）已产品化（本 plan）——终态证据**:

- **tabs 视图集合管理动态化落地（回写 ⑥ 不可达面 I2/I13 消解）**：`tabs` renderer 新增集合管理面——四句柄 `addTab`/`removeTab`/`renameTab`/`moveTab` + 四事件 `onTabAdd`/`onTabClose`/`onTabRename`/`onTabMove`（UI affordance 与句柄同源变更通道，kanban 22-12 先例）+ 集合所有权轴 `itemsOwnership`/`itemsStatePath`（kanbanOwnership 命名先例；local 会话受管集合/ scope 写回 / controlled 拒绝）。**「运行时新增视图分支（I2）」「视图 tab 拖拽重排/溢出收纳动态化（I13）」不可达面就此消解**——运行时新增 = addTab 通道；重排 = draggable + moveTab 通道；溢出收纳显式 deferred（见下两维度裁定）。active 指针迁移与 candidate-fix 同规则同函数（nearest-right → nearest-left），走同一 `valueStatePath` 写链——三层状态机「视图集合 + activeViewId + 每视图私有配置集」的**写侧**就此补齐（读侧 P5b 已证）。
- **三姊妹死声明族终态（guide Rule 11「接口已出现、语义未落地」消解）**：`TabsSchema.closable`/`draggable`/`addable`（`schemas.ts:169-174`，起草期 live 实测实现零命中）按 G-A 分轨先例「接线」轨全部落地：closable = per-tab ✕（item 级 `TabsItemSchema.closable` 逐 tab 覆盖；最后一项不渲染 ✕ = 禁止删空兜底 UI 面）；draggable = 原生 HTML5 拖拽重排；addable = 尾部 `+`（缺省 i18n `flux.tabs.newTab`，不自动激活）。零声明 → 零 affordance 零行为变化（兼容矩阵锁定）；无内建删除确认（AMIS 同口径，onTabClose 链 + 宿主 confirm 自组）。
- **kanban per-column 列头聚合落地（回写 ⑥ 候选 2 语义件缺口消解）**：`KanbanSchema.columnAggregate: { fn: sum|avg|min|max|count, field?, label? }` 板级单声明 × 列级求值（每列聚合自身过滤可见卡片集，与列头计数徽章同源——过滤联动一致）。**「列头原生聚合（Sum/Avg/Min/Max/Count + 列头内嵌形态）仍为 kanban 语义增强候选」就此消解**；「per-column 绑定缺失」（G-A 观察面）以求值路径替代 region 参数化路径消解。兜底矩阵：count 忽略 field（空列 `0`，gc-aggregate-empty-column）；sum/avg/min/max 跳过缺失/非数值、全无效显 `-` + 板级一次性 dev warn（gc-aggregate-missing-field），不 NaN 不抛错；`columnHeader` region 覆盖时聚合抑制。
- **两维度显式终态裁定（回写 ⑥ 遗留，无静默跳过）**：①「视图类型↔peek 形态联动」= Deferred But Adjudicated（作者侧创作约定非 runtime 机制缺口，P5b 静态表达承载主语义，successor: no）；②「个人视图偏好存储层」= 维持 optimization candidate（会话级经 valueStatePath + itemsStatePath 已可达；跨会话须 host 注入 adapter——INV-1/CountDownStorage 先例，successor: yes 独立 plan 候选）。溢出收纳第三维度 = 显式 deferred（横向滚动 + scrollIntoView 跟随已承载主语义，successor: DropdownMenu 收纳菜单）。
- 先红后绿单测：tabs 25 条（`tabs-view-management.test.tsx`——句柄矩阵/active 迁移矩阵/死声明接线兼容矩阵/所有权轴）+ kanban 聚合 14 条（`kanban-aggregate.test.ts` 9 纯函数矩阵 + `kanban-column-aggregate.test.tsx` 5 渲染集成）；连带面：`tabs.tsx` 责任拆分（新 `tabs-utils.tsx` + `tabs-renderer-definition.ts`）、`use-kanban-column-aggregate.ts` 抽取，oversized 门禁零新增红。
- 契约文档：`docs/references/renderer-interfaces.md` §Tabs View Collection Management Contract + §Kanban Column Aggregate Contract（landed 终稿）；flux-guide `08-tabs-state.md` items 轴节 + `design-patterns/tabs.md` §视图集合管理 + `design-patterns/kanban.md` §列头聚合与字段表条目；styling-system 核查零改动（tabs affordance 为 widget 式内建交互件 `data-slot` 标记 + ui 组件消费，kanban 聚合为列头内嵌 `data-slot="kanban-column-aggregate"` 文案节点，均无布局 marker 违约）。
- **G-C 族余量**：G-D 网格编辑语义件族（C2 §2 #6 末位成员）独立 plan（N=2）后续轮次执行，与本 plan 代码面零相交。
