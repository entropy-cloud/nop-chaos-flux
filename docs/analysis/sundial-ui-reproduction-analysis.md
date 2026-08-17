# Sundial UI 复刻可行性分析报告

> 分析对象：`~/sources/ui/sundial`（Kotlin Compose Multiplatform 待办应用）
> 复刻目标：nop-chaos-flux（schema 驱动的 React 低代码渲染器）
> 日期：2026-08-16
> 验证产物：`apps/playground/src/complex-pages/page-schemas/sundial-*.json` + `apps/playground/src/sundial-replica/sundial-replica.css`

## 1. 应用概述

Sundial 是一个用 Kotlin Compose Multiplatform 实现的"本地优先 + 可选 Supabase 同步"的待办（Reminder）应用，目标平台 Android / iOS / Desktop。160 个 Kotlin 文件，90+ 单元测试，版本 0.10.0。

产品核心流程：**捕获（收件箱）→ 安排（今天/未来）→ 推进（工作台压力分组）→ 复盘（分析页）**。

- **工作台**：默认展示所有未完成事项，按 逾期/今天/未来 7 天/无日期/待整理 分组展开
- **列表**：清单边界 + 每个列表独立的待办分布与分析入口
- **收件箱**：快速捕获临时事项
- **分析**：完成趋势、连续记录、完成率、精力输出图表
- **设置**：同步方式（本地/Supabase/自建服务器）、列表管理、数据导出、外观（主题/密度/字体）

## 2. 设计系统提取（复刻基准）

全部 UI 手绘 Compose Canvas（无 Material、无图片资源），设计令牌集中在 `ui/theme/DesignTokens.kt`。

### 2.1 色彩令牌（浅色 / 深色）

| 令牌         | 浅色      | 深色      | 用途                          |
| ------------ | --------- | --------- | ----------------------------- |
| bgPrimary    | `#FFFFFF` | `#212121` | 页面背景                      |
| bgSecondary  | `#F2F2F2` | `#1C1C1C` | 工作台/分析页背景、hover 反馈 |
| surface      | `#FFFFFF` | `#242424` | 卡片/分组表面                 |
| surfaceAlt   | `#F7F7F5` | `#1B1B1B` | 设置导航栏条带                |
| surfaceInset | `#F6F6F4` | `#1B1B1B` | 内嵌区域                      |
| brand        | `#EA7A2A` | 同左      | 主品牌色（橙色）              |
| brandHover   | `#E79255` | 同左      | 主按钮 hover                  |
| brandSubtle  | `#FFF2E8` | `#3A2416` | 选中态背景（导航/行/选项）    |
| textHigh     | `#0D0D0D` | `#F5F5F5` | 标题/主文本                   |
| textNormal   | `#333333` | `#C4C4C4` | 正文                          |
| textLow      | `#636363` | `#8F8F8F` | 次要文本/占位符               |
| border       | `#D9D9D9` | `#333333` | 输入框/控件边框               |
| borderSubtle | `#EAE7E2` | `#363331` | 分割线/卡片描边               |
| inputBg      | `#F5F5F5` | `#333333` | 输入框背景                    |
| rowHover     | `#F4F4F2` | `#2C2C2C` | 次级导航 hover                |
| rowSelected  | `#FFF2E8` | `#3A2416` | 行选中                        |
| error        | `#D25151` | `#FF6B6B` | 错误/逾期                     |
| success      | `#54B04F` | 同左      | 成功                          |
| warning      | `#DB7706` | `#E0913E` | 警告/待整理                   |
| info         | `#3C83F6` | 同左      | 信息                          |

列表颜色（7 色，iOS 风格）：blue `#0A84FF` / red `#FF3B30` / orange `#FF9500` / yellow `#FFCC00` / green `#34C759` / teal `#5AC8FA` / purple `#AF52DE`。

压力分区语义色：逾期=error，今天=brand，未来 7 天=info，无日期=textLow(neutral)，待整理=warning。

### 2.2 排版

| 令牌                              | 字号/字重             | 用途           |
| --------------------------------- | --------------------- | -------------- |
| text10 / text12 / text14 / text16 | 10/12/14/16sp Regular | 次级文本、正文 |
| title18 / title20 / title24       | 18/20/24sp SemiBold   | 标题           |
| label10 / label12                 | 10/12sp SemiBold      | 小标签、按钮   |

数字计数（badge、accordion count、时间）一律用 Monospace；无显式行高/字距。

### 2.3 间距/圆角/控件尺寸

- 间距刻度：2 / 4 / 8 / 12 / 16 dp（8dp 为节奏基准）
- 圆角：r2=2dp（badge/输入框/图标按钮），r3=16dp（对话框），r4=8dp（按钮/卡片/行）
- 控件：iconSmall=32dp、iconMedium=36dp、touch=44dp、rowDesktop=42dp、rowMobile=48dp（舒适密度）
- 布局常量：sidebar 272dp，detail inspector 348dp，dialog 最大宽 360dp，内容最大宽 920dp，移动端断点 900dp
- **全应用无阴影**——扁平表面 + 可选 1dp `borderSubtle` 描边

### 2.4 交互习惯

- hover：行/ghost 按钮→`bgSecondary`；主按钮→`brandHover`；danger→error@8% alpha
- 按压反馈：控件前景 80% alpha（不是整体透明度）；checkbox 0.85 缩放（150ms tween）
- checkbox：16dp 圆形，勾选后 brand 填充 + 白色对勾，spring 动画（damping 0.6 / stiffness 400）
- badge 惯例：强调色 @8% alpha 背景 + 全色文字，圆角 2dp，文字 text10 等宽
- 对话框：面板固定 `#FEFEFE`（深色 `#2A2A2E`）+ 1dp border + 圆角 16dp + 黑 @45% 遮罩（深色 60%），fadeIn 180ms + scale 0.95→1

### 2.5 图标

27 个手绘矢量图标（24×24 网格、1.8u 描边、圆头）：Calendar、Today、Scheduled、Tray、CheckCircle、Trash、Search、Plus、Close、ChevronBack/Right/Down、Flag、DotsThree、Cloud、Server、Device、Key、Eye/EyeOff、Settings、Sync、Clock、Inbox、Layers、Chart、Send。

## 3. 复杂页面识别

按"页面复杂度 × 与低代码能力的差距"排序：

| 页面                           | 复杂度 | 说明                                                                                                                                                                                                                                         |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1 工作台 MainLedger**       | ★★★★★  | 三栏 Shell（sidebar 272 + 内容 + inspector 348）+ 搜索 + 压力分布 rail（分段条形）+ 5 个带色调条的可折叠分组（逾期/今天/未来7天/无日期/待整理）+ 任务行（圆形 checkbox/标题/截止 badge/旗标）+ 建议处理面板（每行多个 ghost 按钮）           |
| **P2 分析 AnalyticsScreen**    | ★★★★☆  | 4 张 KPI 卡 + 4 张图表卡（完成趋势折线 / 精力输出柱状 / 待办压力多色柱状+图例 / 输出结构洞察行+badge）；响应式 2×2 KPI 与图表配对；图表空值兜底（0.08 最小柱）                                                                               |
| **P3 待办详情 Detail**         | ★★★★☆  | 状态行（checkbox + 状态文案 + 日期 badge）+ 无边框标题输入 + 备注内嵌框 + 4 个字段行（日期/重复/旗标/列表，hover 背景）+ 日期选择器对话框 + 重复选择器 + 列表选择器 + 子任务行内编辑 + 底部"移到列表/移到垃圾箱"按钮                         |
| **P4 设置 Settings**           | ★★★☆☆  | 280dp 导航 rail（5 节：同步/列表/数据/外观/关于）+ 同步面板（3 种模式选项卡 + 连接信息 + 状态卡 + 统计行）+ 列表管理（色点行 + 新建/编辑/删除对话框 + 列表分析面板）+ 外观（主题/密度/字体选择行）+ 数据（事实行 + 3 指标 + 维护按钮）+ 关于 |
| **P5 新建待办 TodoFormDialog** | ★★★☆☆  | 360dp 对话框：标题（自动聚焦）+ 备注多行 + 日期行（badge+清除）+ 旗标行 + 列表行（色点 + 名称）+ 取消/添加                                                                                                                                   |
| P6 今日时间线 TodayRhythm      | ★★★★☆  | 06:00–24:00 时间线 rail：基线 + 刻度（0/⅓/⅔/1）+ 任务圆点（过去=warning@45%/未来=info/下一件=brand 5dp）+ "现在"品牌色竖条 + 06:00/12:00/18:00/24:00 时间标签                                                                                |
| P7 建议处理 OrganizePanel      | ★★★☆☆  | brand 色 header（Send 图标 + 建议处理 + 计数）+ 建议行（标题 + "·"连接的原因文案 + 安排今天/安排明天/移动列表/编辑标题/删除 按钮组）                                                                                                         |
| P8 移动端 MobileShell          | ★★★☆☆  | 顶部栏（brand logo + 标题 + 同步/加号/设置/搜索）+ 列表 chips 条 + 紧凑时间线 + 底部 3 项导航（工作台/列表/分析）+ 底部弹层详情                                                                                                              |

## 4. 复刻方案与 flux 能力映射

### 4.1 已落地的复刻页面（本仓 playground）

| Sundial 页面 | flux 复刻页                | 使用的 flux 原语                                                                                                     |
| ------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P1 工作台    | `sundial-workbench.json`   | page / flex / container / text / icon / checkbox / data-source / collapse（CSS 重塑为 Sundial 分组）/ button / badge |
| P2 分析      | `sundial-analytics.json`   | chart（line / bar + 自定义 colors）、KPI 卡（container + icon + text）、insight 行                                   |
| P3 详情      | `sundial-detail.json`      | checkbox + 字段行 + badge + dialog（日期/重复/列表选择器简化版）+ input-text / textarea                              |
| P4 设置      | `sundial-settings.json`    | 导航 rail（flex + 选中态 CSS）+ 模式选项卡 + 状态卡 + 事实行                                                         |
| P5 新建待办  | `sundial-todo-dialog.json` | dialog + form 字段（input-text/textarea）+ 行交互                                                                    |

样式复刻手段（与既有 dashboard.json 同模式）：

- JSON `className` 直接使用 Tailwind 工具类（Tailwind 扫描 JSON 内容，`*.json` 已在 content 配置）
- Sundial 专有视觉（圆形 checkbox、压力 rail、时间线、色调条分组、badge、导航选中态）通过 `apps/playground/src/sundial-replica/sundial-replica.css` 的自定义类复刻，CSS 变量承载全部设计令牌
- 图表数据经 mock 后端 `Sundial__*` 端点（`showcase-env.ts`）走 `data-source` 拉取

### 4.2 能力映射矩阵

| Sundial 元素                                     | flux 映射                                                                                                                                                                           | 保真度                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 设计令牌（颜色/字号/圆角）                       | CSS 变量 + 自定义类                                                                                                                                                                 | 高                                                              |
| 卡片/表面（无阴影、1dp 描边）                    | container/card + className                                                                                                                                                          | 高                                                              |
| Badge（8% 背景 + 彩色文字 + 等宽）               | `badge` 或 text + 自定义类                                                                                                                                                          | 高                                                              |
| 按钮（Default/Ghost/Danger）                     | `button` variant=default/ghost/destructive + 自定义 CSS 覆盖                                                                                                                        | 高                                                              |
| 图标（24 网格手绘）                              | lucide `icon`（kebab-case 名称、size、color）                                                                                                                                       | 中高（线条风格近似，笔画略粗）                                  |
| 圆形 checkbox（16dp 圆圈 + brand 填充 + 白对勾） | `checkbox` 表单字段 + `shape:'circle'` 透传（ui `data-shape` 输出，2026-08-16 落地）                                                                                                | 高                                                              |
| 分组折叠（色调条 + 标题彩色 + 等宽计数）         | `collapse` + `tone`/`count`/`leading` 语义字段（渲染器输出 `data-tone`/`collapse-tone-bar`/`collapse-count`/`collapse-leading` marker，2026-08-16 落地）                            | 高（原生语义，不再依赖 CSS 覆盖内部 DOM）                       |
| 压力分布 rail（分段彩色条 + 图例）               | 自定义 CSS（纯展示）                                                                                                                                                                | 高                                                              |
| 今日时间线 rail（点/刻度/now 竖条）              | 自定义 CSS（纯展示）                                                                                                                                                                | 高                                                              |
| 图表（折线/柱状/多色柱）                         | `chart`（recharts）+ colors 数组；单 series 逐点上色用 `series.colors`/`colorRegionKey`（bar/scatter Cell，2026-08-16 落地）                                                        | 高（压力图已单 series 化）                                      |
| 无边框标题输入、备注内嵌框                       | input-text/textarea + CSS                                                                                                                                                           | 中（field-frame 包装需要 CSS 拆解，用 frameWrap:false）         |
| 对话框（360dp、16dp 圆角、FEFEFE 面板）          | `dialog` + className 覆盖                                                                                                                                                           | 高                                                              |
| 日期选择器（月历网格 + 时间步进器）              | `input-date`（**popover 月历选择器**：trigger + Calendar single-mode 网格 + 时间输入 + 清除）；`input-time` **steppers 模式**（新增 renderer 增强，±hourStep/±minuteStep 循环步进） | **高（点选交互一致；时间步进器已由 input-time steppers 落地）** |
| 列表选择器 / 重复选择器                          | dialog + radio 行（手工 schema）                                                                                                                                                    | 中                                                              |
| 移动端 Shell（底部导航/顶部栏）                  | 未复刻（playground 展示桌面向）                                                                                                                                                     | —（移动端另有 m1–m5 展示）                                      |

## 5. 困难与 gap 分析

### 5.1 可直接用 CSS/组合解决的（已解决）

1. **手绘图形组件**（空状态插画、时间线 rail、压力 rail）：flux 无对应渲染器，但均为纯 CSS/伪元素可实现，playground 层自定义类解决，不触及渲染器本身。
2. **Sundial 式折叠分组**：最初靠 `.sd-*` 类选择器全量覆盖 `collapse` trigger/body（依赖内部 DOM 结构）——**已由 `collapse` tone/count/leading 语义字段替代**（2026-08-16，plan 456），见 §5.3 G1。
3. **无边框输入**：input-text 的 field-frame 会包 label/边框，通过 `frameWrap:false` + CSS 覆盖达到 Sundial 外观。
4. **多色柱状压力图**：最初用 4 个 series（每 bucket 一个）模拟分组柱——**已由单 series + `colorRegionKey` 逐点上色替代**（2026-08-16，plan 456），见 §5.3 G4。

### 5.2 已修复的限制（复刻过程中发现并修复，2026-08-16）

| #   | 原限制                                                                              | 修复                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | 作用域表达式不支持 `?.[0]` 可选索引（parser 的 `?.` 分支强制 identifier）           | `flux-formula/src/parser.ts` parsePostfix 新增 `?.[` 计算成员解析（computed+optional）；求值层本就支持 optional null 短路。sundial-analytics legend 表达式已改回 `?.[0]` 形式端到端验证     |
| F2  | openDialog/openDrawer 创建的 surface 无法传 className/testid（surface.meta 未设置） | `flux-runtime/src/action-adapter.ts` 新增 `resolveSurfaceMeta`，从 args 提取 className/testid/cid 透传到 options.meta，与声明式 dialog 走同一通道；bodyClassName/headerClassName 原本就有效 |

> 部分插值（"逾期${x}"）经核实**原本就支持**（compileTemplate 混合 text/expr 段）——最初观察到的"原样输出"实为 `?.[0]` 解析失败导致的整体回退，属错误归因。

### 5.3 已落地与剩余的 gap（2026-08-16 更新）

**已落地（plan `docs/plans/456-flux-renderer-improvements-plan.md`，最终设计 `docs/architecture/responsive-and-renderer-enhancements.md`）**：

| #   | Gap                               | 落地                                                                                                                                                                                         |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | `collapse` trigger 无 schema 语义 | ✅ `CollapseItemSchema.tone/count/leading` + marker 输出（`data-tone`/`collapse-tone-bar`/`collapse-count`/`collapse-leading`）；Sundial workbench 5 分组已改用语义字段                      |
| G2  | checkbox 圆形形态不可配置         | ✅ `CheckboxSchema.shape` 透传（`data-shape="circle"`）；Sundial 复刻页任务行已用                                                                                                            |
| G4  | chart 单 series 逐点上色          | ✅ `ChartSeriesSchema.colors`（定长色板按索引循环）/`colorRegionKey`（记录取色）；bar/scatter 用 recharts `Cell`；Sundial 压力图已单 series 化（line/area 逐点未落地，见架构文档 §5.2 注记） |
| G6  | 对话框配色例外（className 覆盖）  | ✅ F2 修复后 openDialog/声明式 dialog 均可传 className/testid（`resolveSurfaceMeta`）；Sundial 对话框 `#FEFEFE` 面板经 className 复刻                                                        |
| G7  | 结构级响应式断点                  | ✅ 新增 `responsive` 渲染器（`variants` 按断点匹配、整树切换、scope 共享）；Sundial workbench 已用（默认=桌面树，`max:'lg'` 移动变体）                                                       |

**剩余（未落地）**：

| #       | Gap                                                                                                                            | 影响                                                                           | 建议                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G3 剩余 | `input-date` 行触发/对话框承载形态与 Sundial 样式令牌（popover 月历 + `input-time` steppers 已落地，剩余仅触发形态与样式差异） | 详情页日期行是"点击行打开对话框"而非字段按钮 popover——交互形态差异，视觉已近似 | 优化项（deferred，见 plan 456）；核心点选交互已具备                                                                                                            |
| G5      | **hover/选中态的 schema 表达**：Sundial 大量"行 hover 变灰、选中变 brandSubtle"                                                | 只能在 CSS 里写 `.group:hover` 组合；schema 无法声明"这是可选行、选中值绑定 X" | 列表类原语（`list`/radio-group 行级）已部分具备；建议通用 `option-row` 或增强 `radio-group` 的自定义行渲染，让"行 = 图标 + 文本 + 值 + 选中态"成为 schema 表达 |

### 5.4 交互缺口（非样式）

- **拉刷同步 / 底部弹层详情（移动端）**：移动端原语已有 pull-refresh、sheet 等（m1–m5 展示），本复刻未覆盖移动 Shell。
- **复选框/表单与 mock 后端的持久化**：复刻页为静态展示 + 交互演示（checkbox 可点、dialog 可开），不追求数据持久化；Sundial 本体是 SQLDelight 本地库 + 同步，属业务层，不在渲染器职责范围。

## 6. 结论

1. **Sundial 的桌面端复杂页面（工作台/分析/详情/设置/新建对话框）可以用 nop-chaos-flux 复刻到高保真**：核心原因是 Sundial 是"扁平、无阴影、令牌化"的设计，flux 的 className + 自定义 CSS + 既有渲染器（chart/checkbox/dialog/collapse）足以承载。验证产物为 5 个 schema JSON 页面 + 1 个 CSS 文件 + mock 端点 + 测试。
2. **复刻过程中推动的 flux 能力改进（全部落地，plan 456）**：`?.[0]` 可选索引、openDialog className/testid 透传（F1/F2）、`responsive` 结构断点容器、`collapse` tone/count/leading 语义化、`checkbox` shape 透传、`chart` 逐点上色、`input-time` steppers——**"外部应用复刻"作为能力发现器成立**：7 项改进中 6 项由 Sundial 复刻直接驱动。
3. **剩余差距**：G3 剩余（`input-date` 行触发形态，优化项）与 G5（hover/选中态 schema 表达，列表类原语增强）——均不阻塞桌面端复刻。
4. **成功模式**：dashboard.json 已有的"schema className + 自定义 marker CSS"模式被验证可扩展到整个外部应用 UI 的复刻；复刻中发现的能力缺口回流为渲染器语义增强（schema 驱动 → 渲染器发 marker → 宿主 CSS 定视觉）。

## 附：验证清单（2026-08-16 终版，plan 456 closure 后）

- [x] `pnpm typecheck` 通过（全仓 37/37）
- [x] `pnpm lint` 通过（全仓 37/37，0 警告）
- [x] `pnpm test` 通过（全仓 0 失败：playground 153/153 含 10 个 sundial 测试；flux-renderers-form 809/809 含 checkbox shape + input-time steppers；flux-renderers-layout 124/124 含 responsive + collapse 语义；flux-renderers-data 870/870 含 chart 逐点上色；flux-react 481/481；flux-renderers-basic 489/489）
- [x] `pnpm build` 通过（全仓 37/37）
- [x] `pnpm check` 无新增命中（`check:oversized-code-files` 的 wizard-renderer.tsx 与 `check:audit-event-dispatch-ctx` 的 industrial 6 处为既有登记红，非本次引入；`check:schema-prop-coverage`（checkbox.shape 在扫描内）与 `check:i18n-keys` 全绿）
- [x] 独立 closure audit（plan 456）：`approved`（零 Blocker/Major）
