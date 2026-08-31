# R1 — 成熟框架对标分析（美观度 × 完善度双维评分卡）

> Last Updated: 2026-08-19（基点 9d8a3fd96；web 调研 2026-08-19 实测快照）
> Mission: `missions/ui-review.json` · Roadmap: `docs/backlog/ui-review-roadmap.md`（R1 产出文档）
> 输入：R0 实测基线（122 renderer / 62+16 ui / 324 tokens / 19 页）、`docs/components/amis-baseline-matrix.md`、`docs/analysis/2026-06-21-flux-vs-vant-*.md`、web 调研（来源见 §7）

## 0. 评分口径

双维各 1–5 分，分维打分后取加权综合（非拍脑袋总分）：

- **美观度** = 令牌体系（1 无→5 全语义令牌+双主题暗色）｜密度与层次 ｜微交互（悬停/按压/过渡/键盘焦点）｜暗色完整度｜产品完成度（demo 级 vs 产品级）
- **完善度** = 组件覆盖｜**页面模板层**（页面级预设）｜交互深度（键盘/拖拽/批量/命令面板）｜a11y｜主题化

评分对象：nop-chaos-flux（live 实测）× 5 组参照。**证据等级**：⚡=live 实测本仓库；🌐=官方文档/预览（2026-08-19）；📊=第三方对比（vendor 口径已标注）。

## 1. 五组评分卡总表

| 参照组                                 |  美观度 |  完善度 | 一句话判词                                                                                            |
| -------------------------------------- | ------: | ------: | ----------------------------------------------------------------------------------------------------- |
| **nop-chaos-flux**                     | **3.5** | **3.0** | 结构层与组件底座已到第一梯队门槛，页面模板层与键盘/命令交互是两级明显台阶（P2/P4 的靶子）             |
| AMIS（直接前身）                       |     2.5 |     4.5 | 覆盖之王（含 excel/word/tasks 等超集），审美停留在 AntD v4 时代"后台感"，令牌分层弱                   |
| Ant Design + Pro                       |     4.0 |     5.0 | 企业后台金标准：组件+**页面模板两层**齐备（list/form×4 布局/detail/result/dashboard），微交互克制一致 |
| shadcn/ui + blocks                     |     4.5 |     3.0 | 行业审美基线（Tailwind v4 极简）；blocks 是"复制源码"不是配置驱动，表格/表单语义要自带                |
| Retool / Appsmith / ToolJet / Budibase | 2.5~3.5 | 4.0~4.5 | 同品类参照：Retool 打磨最好；ToolJet 60+ / Appsmith 45+ 组件（📊vendor 口径）；键盘与 a11y 全家普遍弱 |
| Vant（移动端）                         |     4.0 |     4.5 | 移动端成熟商业组件库（80+ 组件）；flux-mobile 5 renderer 对其主组件族覆盖差（既有分析）               |

## 2. 分组详评（证据 + 分维拆解）

### 2.1 AMIS（对照 `amis-baseline-matrix.md` ⚡）

- 完善度 4.5：renderer 覆盖面是 flux 的超集目标（AMIS 含 office 类 tasks/excel/word；flux 另有 graph/scheduling/ai 等 AMIS 弱项）。CRUD wrapper 即"页面模板"事实标准（查询栏+表格+批量栏+弹窗表单一体）。
- 美观度 2.5：视觉语言继承 AntD v4（密集、边框重、阴影/圆角语汇旧）；无独立令牌层（主题=AntD 主题）；暗色为皮肤级翻转；微交互以 hover 变色为主，无按压/弹簧/焦点环治理。
- **flux 对其优势**：令牌化主题（4 调色板）、React 19 + Tailwind v4 底座、AI/调度/图族超集；**劣势**：AMIS 的 CRUD 一体化模板语义（filter bar 自动生成、批量栏开箱）在 flux 需手写组合（standard-crud 360 行手搓 ⚡）。

### 2.2 Ant Design + Ant Design Pro（🌐 preview.pro.ant.design + ProComponents 文档）

- 完善度 5.0：**页面模板层是行业最全**——dashboard（统计卡+图表+tabbed 排行）、list（QueryFilter+ProTable+批量栏）、form（**4 种布局模式**：整页/分组/弹窗/分步）、detail（基础/高级 tab 分组）、result（成功/失败终态页）、personal/settings。ProComponents 把页面级语义组件化（PageContainer/PageHeader/QueryFilter/ProTable/ProForm/ProDescriptions）。
- 美观度 4.0：专业、一致、密度得当；但审美保守（企业后台语汇十年演进缓慢），微交互克制有余、精致不足。
- **flux 差距直译**：flux 122 renderer 中无 PageHeader/QueryFilter/ResultPage 语义件 ⚡（R0 §1/§4：企业页全部手写组合）→ **P2 复刻的正是这一层**。

### 2.3 shadcn/ui + blocks 生态（🌐 ui.shadcn.com/blocks 2026-08-19 实测）

- 美观度 4.5：当前行业审美基线（flux 的 ui 包即其移植，⚡62 模块）；令牌（CSS 变量+Tailwind）+暗色一等公民。
- 完善度 3.0：blocks 分类（featured/sidebar/login/signup + dashboard-01 等）是**源码级页面组合**（复制后自改），无 schema/配置层；表格/表单/日历等语义组件"有零件无页面"；键盘可达性依赖底层 base-ui 逐件实现。
- **flux 对其优势**：同源审美 + 配置驱动（schema→页面）+ 数据联动运行时——这正是 shadcn 生态没有的；**差距**：blocks 的"页面级即取即用"体验（sidebar-07 折叠/团队切换器等）flux 无对应预设 → P2/D1 的"页面模板 schema 预设"候选。

### 2.4 Retool / Appsmith / ToolJet / Budibase（📊 2026-08 对比文 + 官方口径）

- 定位差：Retool 闭源打磨最佳（组件 100+、表格行内编辑/键盘表格导航成熟）；ToolJet 60+ / Appsmith 45+ 拖拽组件（vendor 自报）；Budibase 自动生成 UI（快速但定制受限）。
- 分维（区间口径，个体见各官方站）：美观度——Retool 3.5（打磨最好）/ToolJet 3.0/Appsmith 2.5/Budibase 2.5，共性是"工具感"强于"产品感"；完善度——Retool 4.5（组件+表格+键盘）/ToolJet 4.0/Appsmith 4.0/Budibase 4.0（模板库与内置 DB 补分）。
- 共性短板：键盘交互与 a11y 普遍薄弱；demo 应用形态 = "查询面板+表格+侧栏详情"——flux 的 standard-crud/master-detail 已是同级形态 ⚡。
- **flux 对其优势**：开源 schema 契约（vs 拖拽锁死）、渲染层可扩展；**差距**：他们的"表格内行内编辑 + 列菜单（类型/隐藏/排序）"成熟度 → P6 Airtable 复刻的压力点。

### 2.5 Vant（复用 `2026-06-21-flux-vs-vant-full-comparison.md` ⚡）

- 既有结论：Vant 80+ 组件、移动端交互语汇（粘性布局/下拉刷新/手势）完整；flux-mobile 5 renderer（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar）为精选集，主组件族（ NavBar/Tabbar/Picker/Calendar/ActionSheet 级）覆盖差。
- 美观度 4.0（商业级移动打磨）｜完善度 4.5。**R1 增量判断**：移动端不是本 roadmap P 系列复刻对象（P2-P7 全桌面态），差距裁决归 C2 记录、暂不开线。

## 3. nop-chaos-flux 自评（分维证据）

| 维度           |    分 | 证据                                                                                                                                                       |
| -------------- | ----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 令牌体系       |     4 | 4 调色板 × 81 变量 ⚡R0§3；无 ThemeProvider 契约 ⚡                                                                                                        |
| 密度与层次     |     4 | sundial 复刻五页高保真（扁平/无阴影/令牌化 ⚡）；企业页密度档位未系统化                                                                                    |
| 微交互         |   2.5 | hover/选中态缺 schema 表达（G5：仅 CSS `.group:hover` 或双渲染模拟 ⚡plan460）；按压反馈按 AMIS 对齐刻意移除 translate（B2）；无过渡/焦点环治理（R2 待查） |
| 暗色完整度     |     3 | tokens 有 dark 变体 ⚡，但 playground 默认 light、复杂页未做暗色回归                                                                                       |
| 产品完成度     |   3.5 | sundial 系列达"产品级复刻"（plan460 全交互+e2e ⚡）；企业 14 页 demo 级（部分按钮"demo 占位"明示 ⚡）                                                      |
| 组件覆盖       |   4.5 | 122 renderer ⚡R0§1，含 AMIS 外超集（scheduling/graph/ai）；字段级编辑器矩阵待 P6 压测                                                                     |
| **页面模板层** | **2** | 无 PageHeader/QueryFilter/Result/页面预设语义件 ⚡；19 页全部手写组合 ⚡R0§4                                                                               |
| 交互深度       |     2 | 无 command palette/chord 导航/多选批量框架 ⚡；kanban 拖拽有（scheduling）但无键盘重排；受控 dialog/嵌套表面 459/460 已补强 ⚡                             |
| a11y           |   2.5 | base-ui 原语带 aria（radio/dialog role ⚡tests）；全量 WCAG 未审（R2 范围）                                                                                |
| 主题化         |     4 | 主题独立契约 + 4 调色板 ⚡；运行时切换器未暴露（dark toggle 为 tech debt ⚡main.tsx 注释）                                                                 |

**综合：美观 3.5 / 完善 3.0**（§3 分维分的算术均值，四舍五入到半档：美观 (4+4+2.5+3+3.5)/5=3.4→3.5；完善 (4.5+2+2+2.5+4)/5=3.0。D2 复评时按同口径重算）。

## 4. 差距清单（喂给 C2，按可感知度排序）

| #   | 差距                                                                       | 级别初判              | 去向                |
| --- | -------------------------------------------------------------------------- | --------------------- | ------------------- |
| G-A | 页面模板层缺失（PageHeader/查询区/result/页面预设）                        | 渲染器语义增强/新原语 | P2 复刻 + D1 产品化 |
| G-B | 键盘/命令交互框架（⌘K palette、chord、多选批量、键盘重排）                 | 新原语/runtime        | P4 复刻压测 + D1    |
| G-C | 多视图数据库形态（table/board/gallery 切换 + filter/sort 面板 + 行内新建） | 渲染器语义增强        | P5 复刻压测         |
| G-D | 网格编辑深度（全型别单元格编辑器矩阵、列菜单、分组、行高档位）             | 渲染器语义增强        | P6 复刻压测         |
| G-E | 高密度数据页排版（等宽计数/语义色状态/密度档位/chip 筛选）                 | CSS 可解为主          | P7 复刻压测         |
| G-F | hover/选中态 schema 表达（G5 既有）+ className 表达式绑定                  | 新原语                | C2 裁决 → D1        |
| G-H | 移动端主组件族覆盖（vs Vant）                                              | 渲染器增强（量大）    | C2 记录，暂不开线   |
| G-I | 暗色回归与运行时主题切换                                                   | CSS 可解 + 小 runtime | C2 裁决             |

## 5. 与 roadmap 工作假设的对照（复核 Current Baseline 初判）

roadmap 初判"结构层完备、短板在页面模板层/键盘命令/多视图数据库/行内网格编辑"——**R1 实测支持该判断**，并新增两条初判未列项：微交互治理（G-F，plan460 B8 的 runtime 语义发现提供直接证据）与暗色回归（G-I）。

## 6. 结论

flux 的**组件底座与审美基线已站在 shadcn 一线**（这是对 AMIS 的代际优势），真正的两级台阶是：① AntD Pro 式**页面模板层**（P2 直接补）；② Linear 式**键盘优先交互**（P4 压测）。两者都是"配置驱动"框架相对源码型框架（shadcn）应得的差异化能力，也是对标 Retool 系同类（拖拽 IDE 无 schema 契约）的护城河。

## 7. 调研来源

- 🌐 shadcn/ui blocks：ui.shadcn.com/blocks（2026-08-19；分类 featured/sidebar/login/signup，dashboard-01 为 9 文件高复杂度档）
- 🌐 Ant Design Pro 预览：preview.pro.ant.design（标准模板集 dashboard/list/form/detail/result/personal；ProComponents 文档 404，结构以预览站+公开文档口径）
- 📊 Retool 系：blog.tooljet.com/appsmith-vs-budibase-vs-tooljet（60+/45+ 为 vendor 自报）；stackfyi.com/guides/retool-vs-appsmith-vs-budibase-2026
- ⚡ 仓库内：amis-baseline-matrix.md、2026-06-21-flux-vs-vant-{full-comparison,gap-analysis}.md、R0-baseline-inventory.md、plan 460 B8 执行记录
