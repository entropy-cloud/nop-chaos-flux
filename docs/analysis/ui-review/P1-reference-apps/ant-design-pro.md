# Ant Design Pro 复刻分析（P2 输入）

> 分析对象：Ant Design Pro 标准模板页面族（dashboard / list / form / profile / result / exception / account）（开源状态：**开源 MIT**，源码与令牌可读）
> 调研日期：2026-08-29（来源见 §8；preview.pro.ant.design 与 procomponents 站为 JS shell，已按预案以源码 routes.ts + spec 文档替代）
> 上游：R1 §2.2（美观 4.0 / 完善 5.0，页面模板层行业最全）、C1-10（result 型页构想）、C2 G-A（页面模板层，本应用主对照行）；下游：P2a（分析与静态复刻）/ P2b（交互接线与测试）

## 1. 应用概述

Ant Design Pro 是基于 Ant Design 的企业中后台脚手架，R1 判定为"企业后台金标准"——其价值不在组件（AntD 组件 flux 已对标），而在**页面模板层**：dashboard/list/form/detail/result 页面级预设 + ProComponents 语义件（PageContainer/QueryFilter/ProTable/ProForm/ProDescriptions/StepsForm）。复刻目标 = 把这一层搬到 flux schema 预设，补 G-A。

产品核心流程：登录 → dashboard 概览 → 列表 CRUD → 表单录入（4 布局）→ 详情查看 → result 终态。

## 2. 设计令牌结构

### 2.1 色彩（v5/v6 默认浅色，Seed→Map→Alias 三层派生）

| 令牌                                   | 值                                | 用途                            |
| -------------------------------------- | --------------------------------- | ------------------------------- |
| colorPrimary                           | `#1677ff`                         | 主色/主按钮/选中态              |
| colorPrimaryHover / Active             | `#4096ff` / `#0958d9`             | 主按钮 hover/按压               |
| colorPrimaryBg / Border                | `#e6f4ff` / `#91caff`             | 主色浅底（选中行、标签底）/描边 |
| colorSuccess(+Bg)                      | `#52c41a`（`#f6ffed`）            | 成功/Result                     |
| colorWarning(+Bg)                      | `#faad14`（`#fffbe6`）            | 警告/Alert                      |
| colorError(+Bg/Hover)                  | `#ff4d4f`（`#fff2f0`/`#ff7875`）  | 失败/危险/校验                  |
| colorInfo                              | `#1677ff`                         | 信息                            |
| colorText                              | `rgba(0,0,0,0.88)`                | 主文本                          |
| colorTextSecondary/Tertiary/Quaternary | `rgba(0,0,0,0.65/0.45/0.25)`      | 次级/三级/禁用                  |
| colorBgLayout                          | `#f5f5f5`                         | 页面底                          |
| colorBgContainer / Elevated            | `#ffffff`                         | 容器/浮层                       |
| colorBgMask                            | `rgba(0,0,0,0.45)`                | Modal/Drawer 遮罩               |
| colorBorder / Split                    | `#d9d9d9` / `rgba(5,5,5,0.06)`    | 控件边框/分割线                 |
| colorFill 1~4                          | `rgba(0,0,0,0.15/0.06/0.04/0.02)` | 填充态/hover 灰阶               |

预设色板 12 色（blue/purple/cyan/green/magenta/red/orange/yellow/volcano/geekblue/lime/gold）；深色由 `darkAlgorithm` 同 Seed 派生；Pro 默认 `navTheme:'light'`、`colorPrimary:'#1677ff'`、`layout:'mix'`（defaultSettings.ts 实证）。

### 2.2 排版

字体栈 `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`；代码 `SFMono-Regular, Consolas, …, monospace`。字号 SM 12 / 默认 14 / LG 16 / XL 20；标题 H1–H5 = 38/30/24/20/16；行高默认 1.5714（H1–H5 1.21–1.5）。

### 2.3 间距/圆角/控件尺寸

间距 8pt 系（4/8/12/16/20/24/32/48）；圆角 XS 2 / SM 4 / 默认 **6** / LG 8；控件高 XS 16 / SM 24 / 默认 **32** / LG 40（compact 算法 sizeStep=2）；浮层阴影三层复合，卡片阴影 tertiary（`0 1px 2px` 级）。

### 2.4 交互习惯

过渡 Fast 0.1s / Mid 0.2s / Slow 0.3s；缓动 easeInOut `cubic-bezier(0.645,0.045,0.355,1)`；hover 主按钮提亮 `#4096ff`、行/文本用 colorFill 灰阶；按压加深 `#0958d9`；`focusOutline=true` 可见焦点环。微交互克制一致（R1 判词"精致不足"——复刻时按压反馈不做弹簧/位移）。

### 2.5 图标

菜单/路由全部 Outlined 线性单色；操作 icon 12–16px；复刻按 16px 网格 outline、约 2px 描边，lucide 近似。

## 3. 页面清单与复杂度排序（sundial §3 口径：页面复杂度 × 与 flux 能力差距）

| 页面                                               | 复杂度 | 说明                                                                                                                                 |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/list/table-list`（CRUD 标杆）                    | ★★★★   | QueryFilter 查询区 + ProTable（工具栏/密度/列设置/批量栏/行操作/分页）+ Modal 表单；查询区/批量栏/密度列设置多重 gap（G-A/G-B3/G-E） |
| `/form/advanced-form`                              | ★★★    | 卡片分组 + 弹窗内可选表格 + 可编辑列表（dialog+table 联动，G-D 边缘）                                                                |
| `/dashboard/analysis`                              | ★★★    | KPI 卡×4 + 折线图 + 饼图 + Top10 排行卡；缺 PageHeader/布局预设（G-A）                                                               |
| `/dashboard/workplace` / `/dashboard/monitor`      | ★★★    | 多卡混排（动态列表/项目卡/待办、图表卡组）                                                                                           |
| `/list/search/*`（articles/projects/applications） | ★★★    | tabs 三态（卡片流/项目卡/应用列表）+ 筛选                                                                                            |
| `/profile/advanced`                                | ★★★    | 多 tabs 内嵌卡片/步骤条/告警/图表                                                                                                    |
| `/form/step-form`                                  | ★★     | Steps 3 步 + 分步表单 + 确认页（flux steps/wizard 已有）                                                                             |
| `/result/success` / `fail`                         | ★★     | Result 图形 + 描述 + 动作组；Result 预设缺失（G-A 直接证据 = C1-10）                                                                 |
| `/user/register-result`                            | ★★     | Result 预设 + 动作按钮                                                                                                               |
| `/account/center` / `/account/settings`            | ★★     | 头像卡+tabs 列表；左菜单+右表单区                                                                                                    |
| `/list/basic-list` / `/list/card-list`             | ★★     | 搜索条+标准列表+分页；卡片网格+cover+操作组                                                                                          |
| `/form/basic-form`                                 | ★      | 整页单列表单 + 底部操作条（form 族直接覆盖）                                                                                         |
| `/profile/basic`                                   | ★      | Descriptions 卡（分组分割线）+ 操作按钮组                                                                                            |
| `/user/login` / `/user/register`                   | ★      | 居中卡：tabs + 表单 3 项 + 自动登录（表单族+tabs 全覆盖）                                                                            |
| `/exception/{403,404,500}`                         | ★      | 插画+文案+返回按钮（插画须替换）                                                                                                     |

布局规范（spec 实证）：表单四梯度 = 基础单列 → 弱分组 → 区内分组（小标题）→ 卡片分组（>2 屏）；详情页 = 单卡分割线（基础）→ 多卡 + tabs/步骤条 + 审批操作组（高级）；可编辑列表选型阈值：动态增减 ≤3 项 / 可编辑表 2–5 项 / 折叠面板 6–8 项 / 抽屉 >8 项。**P2a 复刻范围 = ★★★★~★ 全部模板族**（roadmap P2 条目：dashboard/list/form×4/detail 基础+高级/result）。

## 4. 核心交互清单

| #   | 交互            | 触发                               | 反馈                                                                          |
| --- | --------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| I1  | 查询区展开/收起 | 「展开⌄/收起⌃」                    | 默认 3 字段 + 操作按钮，展开流式补全                                          |
| I2  | 查询形态切换    | Segmented                          | 查询表单 ⇄ 轻量行内筛选（LightFilter）                                        |
| I3  | 查询/重置       | 按钮/回车                          | 表格 loading，params 重发，页码回 1                                           |
| I4  | 工具栏 options  | 刷新/密度/列设置/全屏 icon         | reload；密度切 large/middle/small；列设置 popover（勾选+拖拽排序+固定）；全屏 |
| I5  | 批量操作        | rowSelection 勾选                  | 表顶 alert「已选择 N 项」+ 批量删除/导出 + 取消选择（G-B3）                   |
| I6  | 行操作列        | 常驻右侧固定列                     | 编辑/删除 link-button，溢出收「更多」下拉                                     |
| I7  | 删除确认        | 删除                               | Popconfirm/Modal → message + 刷新                                             |
| I8  | 分页            | 页码/条数/跳转                     | 重取数据，显示总数区间                                                        |
| I9  | 列排序/筛选     | 表头 icon                          | 箭头高亮/下拉筛选                                                             |
| I10 | 行展开/树形     | 展开箭头                           | 子行/详情面板                                                                 |
| I11 | 分步导航        | StepsForm 下一步/上一步            | 步骤校验通过才前进；数据暂存末步统一提交                                      |
| I12 | 表单提交        | 提交                               | 按钮 loading → message → result 页                                            |
| I13 | Result 动作组   | 完成页                             | 主按钮（返回）+ 次按钮（再填一份/查看详情）                                   |
| I14 | 弹窗/抽屉编辑   | 新建/编辑                          | ModalForm/DrawerForm，成功关窗+刷新                                           |
| I15 | 页头容器        | PageContainer                      | 面包屑+标题+extra 按钮区+内容 tab，随路由生成                                 |
| I16 | 框架顶栏        | 折叠/搜索/通知/头像/语言/暗色/设置 | 菜单收展/全局搜索/通知抽屉/头像下拉/主题切换/设置抽屉                         |
| I17 | 校验反馈        | 失焦/提交                          | 红框+红字+帮助文案                                                            |
| I18 | 键盘            | Esc/Tab                            | 关浮层；焦点环（**无 ⌘K 命令面板**）                                          |

### 4.1 P2b 逐条处置对照：预测缺口 vs 实测缺口（2026-08-29 回写）

> 授权链：P1 README §5（Pi-b 把"预测缺口 vs 实测缺口"对照记入分析篇）→ plan `2026-08-29-1413-1` Phase 5。终态判定 = 接线锁定（W）/ 内建锁定（B）/ 显式裁决（A）。e2e 锚点 = `tests/e2e/antdpro-replica-interactions.spec.ts` 用例号。

| I#  | 预测（本篇 §4/§5 原判）                       | 实测结论（P2b）                                                                                                                                                                    | 终态              | e2e      |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------- |
| I1  | 查询区展开/收起，collapse 承载（G-A、G-F 注） | `filterTogglable` 原生可达                                                                                                                                                         | B                 | 08       |
| I2  | 查询形态切换（LightFilter）                   | 9 页名单不含该形态，页内无 Segmented 承载——维持 out-of-scope（C2 回写 ③ 注记）                                                                                                     | A（out-of-scope） | —        |
| I3  | 页码回 1 为查询内建行为                       | **预测修正**：`submitQueryValues` 不重置分页（与 reset 不对称）——schema 级 `onQuerySubmit` + `setValue` 补齐；同源发现两条 renderer 级 finding（记 C2 回写 ③，D1 候选）            | B+W               | 09       |
| I4  | 工具栏密度/列设置缺承载（G-E 预测）           | **预测修正（列显隐维度）**：`columnSettings.enabled` 原生可达（勾选显隐），静态重复按钮已移除；密度档 L2 缺口成立（按钮静态保留）；拖拽排序/固定列仍缺；全屏：复刻名单未含，无义务 | B+W+A             | 07       |
| I5  | 批量栏缺语义件（G-B3）                        | 选择集 scope 可达（selectionCount/selectedRowKeys/hasSelection/clearSelection），alert 包络手拼成立——G-B3 证据加厚；批量导出按钮静态保留（宿主下载能力，同 print 族）              | W                 | 01/02    |
| I6  | 行操作列 link-button（高保真，无缺口）        | op-view 走 selectOrder 会话指针 + navigate（navigate 不支持查询参数，既有原语内裁定）；op-edit dialog 预填+保存；均成立                                                            | W                 | 03/04    |
| I7  | 删除确认 Popconfirm/Modal → message + 刷新    | 确认 dialog + `[取消, 确认]` 序；取消/Esc 不删除                                                                                                                                   | W                 | 05       |
| I8  | 分页重取数                                    | 内建可达                                                                                                                                                                           | B                 | 10       |
| I9  | 列排序箭头高亮                                | `sortable` + `aria-sort` 内建可达                                                                                                                                                  | B                 | 11       |
| I10 | 行展开/树形                                   | crud 无 expandable 通道（table schema 专属字段）且数据集无树形语义——维持 out-of-scope（C2 回写 ③ 注记）                                                                            | A（out-of-scope） | —        |
| I11 | StepsForm 分步校验 + 数据暂存（预测高保真）   | **预测修正**：wizard 非 `mountOnEnter` 模式离开步即丢 valuesPath 发布值——须声明 `mountOnEnter: true`；校验闸（formId）与末步 `onComplete` 提交内建可达                             | W+B               | 15       |
| I12 | 表单提交 message → result 页                  | form `submitAction`/`onSubmitSuccess` 全链可达；**实测补丁**：页级 host Toaster 随页卸载，navigate 需 `control.debounce` 延迟以保 message 可观察                                   | W                 | 12–14    |
| I13 | Result 动作组（主/次按钮导航）                | navigate 原语直接承载                                                                                                                                                              | W                 | 21       |
| I14 | ModalForm 成功关窗+刷新                       | `submitScope: 'surface'` + `closeOnSubmit` + `onSubmitSuccess` 链路可达（list 新建/编辑 + form-dialog 弹窗三处实证）                                                               | W                 | 04/06/16 |
| I15 | PageContainer 缺预设（G-A 主证据）            | 无交互义务（P2a 静态结构证据）；G-A 维持                                                                                                                                           | —                 | —        |
| I16 | 框架顶栏                                      | out-of-scope（P2a Non-Goals 已排除框架 chrome）                                                                                                                                    | A（out-of-scope） | —        |
| I17 | 校验反馈红框+帮助文案                         | `data-field-invalid` + `[data-slot="field-error"]` 内建可达；空提交零写请求副作用（端点计数钩子断言）                                                                              | B                 | 13/17    |
| I18 | Esc 关浮层；焦点环                            | Esc 关 dialog 内建可达（delete-confirm 与 form-dialog 两处）；焦点环不重复断言（R2/浏览器内建）                                                                                    | B                 | 05/18    |

事实勘误行（对照本篇前文）：

- §3 表「`/list/table-list`（CRUD 标杆）说明」预测「密度列设置多重 gap（G-A/G-B3/G-E）」——实测列**显隐**子项原生可达，缺口收窄为密度档 + 拖拽排序/固定列（详见 C2 回写 ③）。
- §5 能力映射「ProTable 工具栏/密度/列设置 → 保真度中（G-E）」——列显隐维度上调为「高」，密度档维持「缺承载」。
- §5「StepsForm 分步表单（高，form-wizard 先例）」——维持「高」，但补充 `mountOnEnter: true` 为数据暂存必要声明（否则离开步丢数据）。

## 5. 能力映射初稿

| 参考元素                           | flux 原语（schema 落点）                       | 保真度预估           | C2 对照  |
| ---------------------------------- | ---------------------------------------------- | -------------------- | -------- |
| ProLayout（mix 框架/侧栏折叠）     | page + container + collapse + tabs             | 中高                 | 无       |
| PageContainer（面包屑+标题+extra） | page + text + button 组合                      | **低（缺页头预设）** | **G-A**  |
| QueryFilter 查询区                 | form 族 + container + collapse                 | 中                   | G-A、G-F |
| ProTable 工具栏/密度/列设置        | table/crud + dropdown                          | 中                   | G-E      |
| 批量选择 + 批量栏                  | table/crud 选择集 + button + badge             | 中                   | **G-B3** |
| 行操作列/Popconfirm                | table/crud + dialog + button                   | 高                   | 无       |
| 分页/排序/展开                     | table/crud                                     | 高                   | 无       |
| ProForm 基础/分组布局              | form 族 + card + container                     | 高                   | 无       |
| StepsForm 分步表单                 | steps/wizard form（form-wizard 先例 ⚡）       | 高                   | 无       |
| ModalForm/DrawerForm               | dialog/drawer + form 族                        | 高                   | 无       |
| 可编辑列表/弹窗内选表              | table/crud + form 族                           | 中                   | G-D      |
| ProDescriptions 详情卡             | container + text + card                        | 高                   | 无       |
| Statistic KPI 卡                   | container + text + badge                       | 高                   | 无       |
| 图表（折线/柱/饼）                 | chart（recharts）                              | 中高                 | 无       |
| Result 成功/失败页                 | container+text+button 可拼，**无 result 预设** | 中                   | **G-A**  |
| Exception 页                       | container + text + button                      | 高                   | 无       |
| 全局搜索（顶栏）                   | 无对应原语                                     | 需新原语             | G-B1     |
| 通知 NoticeIcon                    | drawer + list + badge                          | 中                   | 无       |
| 键盘焦点环/导航                    | focusOutline 有交互、无 schema 表达            | 中                   | G-B2     |
| 空状态                             | ui Empty                                       | 高                   | 无       |

## 6. 可复刻边界

### 6.1 可复刻（开源 MIT）

源码（routes.ts/defaultSettings/页面实现）、令牌取值（§2 全表）、交互模式、组件 API 形态均可参考借鉴——P2a 可直接以源码模板为蓝本落 schema。

### 6.2 差异声明（品牌边界）

- 不复制：Ant Design/Pro logo 与 SVG 资产、官方插画（exception/result 配图）、「Ant Design Pro」名称、默认文案与示例数据、蚂蚁品牌暗示。
- 必须替换：logo 与产品名、全部插画（自绘）、文案与菜单命名、示例数据、favicon。
- 风格指纹：`#1677ff + 6px 圆角 + mix 布局` 组合高度接近 AntD 视觉指纹；复刻页建议主色或圆角至少换一项建立差异（P2a 决定，记入该 plan 差异声明）。

## 7. 转 C2 候选

- 无新增行：本篇调研发现的能力缺口（页面模板层/批量栏/命令面板/键盘表达）均已在 C2 G-A/G-B1/G-B2/G-B3/G-E 登记并升级证据。ProLayout 的 `layout: mix/side/top` 三布局若 P2a 实测发现 schema 层无承载，届时经 P2b 回写追加（暂不登记）。
- **P2b 回写结论（2026-08-29）**：P2a/P2b 复刻范围不含框架 chrome（ProLayout 布局壳 + 顶栏），未取得三布局承载性的实测证据，按上条预登记口径**不新增行、不回写**；I1–I18 逐条「预测 vs 实测」对照见 §4.1，renderer 级 finding 与素材行经 C2 回写 ③ 登记。

## 8. 调研来源

- 📁 github.com/ant-design/ant-design-pro `config/routes.ts`（页面族全量实证）、`config/defaultSettings.ts`（布局/主色实证）（2026-08-29）
- 🌐 ant.design/docs/spec/detail-page（详情页规范：基础/高级/审批模板、分割策略）（2026-08-29）
- 🌐 ant.design/docs/spec/research-form（表单四布局梯度、可编辑列表选型阈值）（2026-08-29）
- 🌐 ant.design/docs/react/customize-theme（Seed/Map/Alias 令牌全表、algorithm、motion、阴影）（2026-08-29）
- 📁 github.com/ant-design/pro-components `README.md`（MIT 许可、组件族定位）（2026-08-29）
- ❌→替代：preview.pro.ant.design（JS shell 空渲染）、procomponents.ant.design（JS shell）→ 以源码 + web-search 官方站缓存摘要（📊）替代（2026-08-29）
