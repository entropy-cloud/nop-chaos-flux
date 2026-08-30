# Notion database 多视图复刻分析（P5 输入）

> 分析对象：Notion database 全视图族（table/board/gallery/calendar/list + 视图切换 + filter/sort + 行内编辑 + 记录展开）（开源状态：**闭源，风格等价复刻 + 差异声明**）
> 调研日期：2026-08-29（来源见 §8；`/help/properties` 404，已替换为 `/help/database-properties`；视觉值为社区逆向，tokens 落地时标注"逆向近似"）
> 上游：R1 §4 G-C、C1-4（多视图数据库构想）、C2 **G-C（多视图数据库：视图切换状态机 + filter 面板联动 + 行内新建）——本应用主对照行**；下游：P5a / P5b

## 1. 应用概述

Notion database 是"多视图同一数据集"的品类标杆：一个数据源挂多套视图（table/board/gallery/calendar/list），每套视图携带私有的 layout/filter/sort/group 配置集，记录以行内编辑 + 记录展开页双形态编辑。flux 复刻依托：crud（视图 tab + visible 模拟）、condition-builder（filter）、kanban/calendar（scheduling）、dialog/drawer（记录展开）。

## 2. 设计令牌结构

### 2.1 色彩（浅色为主；社区逆向值，官方未文档化）

| 角色          | 值                                                    | 用途               |
| ------------- | ----------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 页面底        | `#FFFFFF`                                             | 内容画布           |
| 侧栏底        | `#FBFBFA`（近 `#F1F1EF`）                             | 侧导航             |
| hover 灰      | `#F7F7F5`（文本系灰底 `#F1F1EF`）                     | 行/项悬停          |
| 正文          | `#37352F`（新版测得 `#373530`，两值并存取一套并注明） | 主文本             |
| 次级文本/占位 | `rgba(55,53,47,0.65)` ≈ `#787774`                     | 说明文字           |
| 边框/分隔     | `rgba(55,53,47,0.09)` ≈ `#E9E9E7`                     | 极浅低对比分隔     |
| 主操作蓝      | `#2383E2`                                             | New 按钮/链接/选中 |
| 语义色盘      | \*\*10 色 × (文本                                     | 背景               | 图标) 三套\*\*：Orange `#CC782F`/`#F8ECDF`/`#D87620`、Green `#548164`/`#EEF3ED`/`#448361`、Red `#C4554D`/`#FAECEC`/`#D44C47`、Blue `#487CA5`/`#E9F3F7`/`#337EA9` 等（Default/Gray/Brown/Orange/Yellow/Green/Blue/Purple/Pink/Red） | Select/Status 标签；背景低饱和 pastel、文本中饱和、图标更饱和 |

### 2.2 排版

系统字体栈 `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", …`（可选 Default/Serif/Mono 三套页面字体）；UI 基准 14px、正文 16px、标题 40/30/26/20/16 层级；表格行高 ~33px 高密度。

### 2.3 间距/圆角/密度

4px 基数小间距；标签/按钮圆角 3–6px、卡片 4–8px；表格默认主列+少量列按需展开；list 单行高密度；board 卡片 small/medium/large 三档。

### 2.4 交互习惯

**控件 hover 才显现**（行 hover 出 OPEN、日历 hover 当日出 `+`、inline 库 hover 出控制条）；过渡轻 ~100ms 淡入；弹层 popover 而非整页跳转；拖拽 ghost + 落点指示线。hover 显隐控件是 G-F 的典型变体（复刻页以 CSS `.group:hover` 或双渲染模拟）。

### 2.5 图标

16–20px 线性图标（搜索/筛选/排序/⋮⋮ 拖拽把手）；页面/库图标为 **emoji 体系**（开源 emoji picker + 原生字符即可，免版权）；property 图标走 10 色图标色盘（emoji 不可用作 property 图标——官方限制，复刻同样裁剪）。

## 3. 页面清单与复杂度排序

| 页面/区域                     | 复杂度 | 说明                                                                                                                                                                                                      |
| ----------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| table 视图                    | ★★★★   | 行=记录、列=属性；列宽/隐藏/冻结列（Freeze up to column）；首列 hover OPEN；底部 +New；行条件配色。单元格按型别分派编辑器 + 列头菜单（→G-D）                                                              |
| filter/sort/search/group 面板 | ★★★★   | View settings 滑杆面板（Layout/属性可见性/Filter/Sort/Group/条件配色/Copy link）；**advanced filter 组嵌套 ≤3 层 and/or**；sort 多键可拖排序；≥3 条记录出即时搜索（→G-C 主对照）                          |
| board 视图                    | ★★★★☆  | 按 select/status/person 分组列；卡片拖拽跨列=改分组值；列头计数+聚合（Count/Sum/Avg/Min/Max/Percent）；列彩色可关；卡片三档（flux kanban 有拖拽，分组聚合需补）                                           |
| 记录展开页（peek）            | ★★★☆   | 三态：side peek（右抽屉，左表仍可交互）/center peek（居中 modal）/full page；上部属性逐行（点值编辑、⋮⋮ 拖排序/换类型）、下部自由块区（复刻裁剪）                                                         |
| 视图 tab 条                   | ★★★    | 库名+视图 tab 组；tab name/icon/both 三态；拖拽重排；`{#} more...` 溢出收纳；`+` 新建视图；侧栏内嵌视图。"每 tab 独立配置集"是状态机问题（→G-C）                                                          |
| calendar 视图                 | ★★★    | 按日期属性落格；hover 日格 `+` 建条目；拖拽改期；条件配色                                                                                                                                                 |
| gallery 视图                  | ★★     | 卡片网格 + 封面（Files&media 或页面内容）+ 末尾空卡 +New                                                                                                                                                  |
| list 视图                     | ★      | 极简单列 + 行内属性 chip + 底部 +New                                                                                                                                                                      |
| 属性头/类型系统               | ★★★★   | 20+ 类型（Text/Number/Select/Status/Multi-select/Date/Formula/Relation/Rollup/Person/File/Checkbox/URL/Email/Phone/Created×2/Edited/Button/ID…）；类型切换=列 schema 变更（→G-D 边缘，P5a 裁剪清单见 §6） |

## 4. 核心交互清单

| #   | 交互           | 触发                                                                   | 反馈                                                                                                                                                      |
| --- | -------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | 视图 tab 切换  | 点 tab / 侧栏内嵌视图                                                  | 整视图换布局 + 该视图专属 filter/sort/group 生效；当前视图记忆（URL/本地）                                                                                |
| I2  | 新建视图       | tab 区 `+`                                                             | 弹层选类型（Table/Board/Timeline/Calendar/List/Gallery/Chart）→命名→进入                                                                                  |
| I3  | filter 构建器  | 设置菜单 Filter / Add advanced filter                                  | 属性-条件-值行组；组间 and/or；嵌套 ≤3 层；即时过滤；可 Save for everyone                                                                                 |
| I4  | sort 面板      | 设置菜单 Sort                                                          | 多键升降序，⋮⋮ 拖改优先级，X 删除，即时生效                                                                                                               |
| I5  | 搜索           | 🔍                                                                     | 输入即过滤，匹配标题+属性值                                                                                                                               |
| I6  | 行内单元格编辑 | 点单元格                                                               | 按类型分派：文本输入 / Select 输入即建 tag（回车确认、色随机）/ 日期 picker（End date/Include time/Remind/Clear）/ checkbox 直切 / Person @提及；失焦提交 |
| I7  | 属性列头菜单   | 点列头                                                                 | 改名/换类型/filter by/sort by/计算/Insert left-right/隐藏/Freeze up to column/Unfreeze                                                                    |
| I8  | 新建行         | 右上 New / 表底 `+ New` / board 底部 / 日历格 hover `+` / gallery 空卡 | **插行并聚焦标题（行内新建）**                                                                                                                            |
| I9  | 行/卡/列拖拽   | ⋮⋮ 或卡片/列头                                                         | ghost+落位指示；跨 board 列=改分组属性值；表格行拖=手动排序                                                                                               |
| I10 | 记录展开       | 行 OPEN / 卡片 / list 标题                                             | side peek 默认（table/board/list），center peek（gallery/calendar）；`⤡` 转全页；属性逐行点值编辑                                                         |
| I11 | group by 切换  | 设置菜单 Group/Sub-group                                               | 换分组属性即时重排；组可隐藏/排序/隐藏空组/Remove grouping；board 列 Color columns 开关                                                                   |
| I12 | 条件配色       | 滑杆图标 Conditional color                                             | 按属性规则染 Page background；table 可仅染属性列；视图级配置                                                                                              |
| I13 | 视图 tab 定制  | tab 菜单 Display as                                                    | Icon only/Text only/both（仅本人生效）；拖 tab 重排；溢出收纳                                                                                             |
| I14 | 记录右键       | 右键行/卡                                                              | Delete/Duplicate/Copy link/Rename/Move to/Edit property                                                                                                   |

### 4.1 P5b 接线实测「预测 vs 实测」对照（2026-08-30 追加，plan `2026-08-30-0614-1-p5b-notion-interaction-wiring-and-tests.md` Phase 4）

> 沿 P2b/P3b/P4b 先例追加。逐行复核 §4 交互清单与 §5 能力映射；实测与预估不符处仅做事实勘误（下方 §5 表已同步标注），无矛盾行不动。处置表终态（N1–N14）见 P5b plan。

| 交互（出处）               | §5 预判                                      | P5b 实测终态                                                                                                                                                                                                                                              | 结论                   |
| -------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| I1 视图 tab 切换           | tab+visible 模拟，配置集随动                 | 内建锁定 + 随动成立：tabs scope 写 activeView + 五分支 keepMounted hidden 切换；会话 viewConfig 覆写按 viewId 隔离（该视图生效、他视图零影响），切 tab 随目标视图自身配置（e2e 06/08）                                                                    | 与预判一致             |
| I2 新建视图（§3 类型清单） | dialog + 表单＝高                            | **改判：显式裁决静态维持**——五视图分支为静态 schema，运行时新增视图无渲染分支可达（G-C）；类型清单 dialog 静态样本 + 裁决注记锁定（e2e 14）                                                                                                               | 勘误（行为面不可达）   |
| I3 filter 构建器           | condition-builder＝高（嵌套 3 层求值需验证） | 接线锁定 + 求值可行性终判：builder（full 模式、and/or、字段-操作符-值）→ updateViewConfig 会话态 → mock 端递归求值（maxDepth=3）服务端预应用，端到端 e2e 07；**客户端公式内联姿势不可达**（公式无嵌套组递归通道）——「需验证」项已验证，姿势=服务端        | 与预判一致（姿势注记） |
| I4 sort 面板               | data-source 查询参数＝高                     | 单键排序接线锁定（ntSort select → 会话 sorts 覆写 → table 读服务端预应用，e2e 06）；多键拖改优先级子项归 G-D 显式裁决                                                                                                                                     | 与预判一致（子项裁决） |
| I5 搜索                    | 输入即过滤＝高                               | 接线锁定：匹配域=标题+属性值（id/分类/状态/负责人/标签/日期）；**机制修正**——裸 input 写 dialog 子 scope 不可跨树，须经 form `submitOnChange` + `setValue` 落页面 scope 再 url 物化（300ms debounce 内联过滤，e2e 01）                                    | 与预判一致（机制注记） |
| I6 行内单元格编辑          | table + form 族行内编辑＝中（G-D 边缘）      | 勘误面确认：plain `table` 无 rowSelection/inline-edit/schema 直编辑通道（与 crud 不同源）；编辑态收敛 peek form（title/status/category 编辑保存链路 e2e 04/05）；单元格直编辑器矩阵归 G-D 维持                                                            | 与预判一致             |
| I7 属性列头菜单            | 列菜单＝G-D 边缘                             | 全条目显式裁决静态维持：9 列静态复制体无列上下文参数通道；按列 sort/filter 为 View settings 已接线能力的重复入口；动态列模型（改名/换型别/冻结/插列）归 G-D                                                                                               | 与预判一致             |
| I8 新建行                  | 行内新建＝缺口（插行可模拟）                 | 接线锁定：四处静态入口（右上/表底/gallery 空卡/list 底部）+ 日历 hover `+`（Phase 3 按钮面）共享 `Notion__createRecord` 链路，必填拦截 + 表尾插行 + 默认值（e2e 02/03/13）；**行内聚焦标题不可达**（G-D）                                                 | 与预判一致（插行面）   |
| I9 行/卡/列拖拽            | 跨列=改分组值                                | board 跨列接线锁定：`draggable` 内建 + `onCardMove` → `Notion__moveCard`（分组属性翻转 + 会话排序），计数/聚合随 refresh 更新，失败分支卡片回原列，跨视图一致性成立（e2e 09/10/11/12）；行拖排序归 G-D、calendar 拖改期（自绘网格无事件面）显式裁决不模拟 | 与预判一致（board 面） |
| I10 记录展开               | dialog/drawer 双形态＝高                     | 确认 + 深化：peek 双形态（side×3/center×2）只读展开（P5a）+ 属性编辑保存链路全接线，跨视图会话一致（e2e 04/05）；`⤡` 转全页不在裁剪清单                                                                                                                   | 与预判一致             |
| I11 group by 切换          | 换分组属性即时重排＝高                       | 接线锁定：会话 viewConfig group 覆写（status/category/person；「无分组」选项裁定移除——board 恒有分组）→ board 列集重建 + moveCard 解码新属性翻转（e2e 12）；组隐藏/隐藏空组/Sub-group 子项不在复刻清单                                                    | 与预判一致             |
| I12 条件配色               | 视图级配置＝G-F                              | 显式裁决静态维持：数据侧 `condRowClass`（nt-cond-red/yellow）已承载数据驱动条件配色样本；规则编辑器→className 表达式绑定无 schema 通道（G-F2 缺口）                                                                                                       | 与预判一致             |
| I13 视图 tab 定制          | 拖拽重排需扩展                               | **确认改判：显式裁决不模拟**——tabs 无拖拽重排/动态 label/溢出收纳动态化通道（G-C/G-B2 原语缺口），三态 display 静态样本维持（e2e 14）                                                                                                                     | 与预判一致（改判落字） |
| I14 记录右键               | DropdownMenu + 批量栏＝中                    | **勘误：不启用批量栏**——`rowSelection` scope 契约在 plain table 可用（P4b 实证）但按 Notion 原版形态裁定不启用；按钮面等价路径接线（peek 编辑 + `Notion__copyLink` 复制链接语义模拟第四例，e2e 05）；右键原语缺口归 G-B3                                  | 勘误（形态裁定）       |

§5 表勘误标注（两行事实性修正）：

| 参考元素      | 原预估                  | 勘误（2026-08-30，P5b 实测）                                                                                |
| ------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| 新建视图菜单  | 保真度＝高              | 改判＝高（结构）/不可达（行为）——dialog 静态承载成立，运行时新增视图分支归 G-C 缺口（I2 显式裁决）          |
| 右键/批量操作 | DropdownMenu+批量栏＝中 | 改判＝按钮面等价路径已接线（peek + copyLink 语义模拟）；批量栏按 Notion 形态裁定不启用；右键原语缺口归 G-B3 |

§7 两候选终态（P5b 收口，详见 C2 回写 ⑥）：①个人视图偏好存储层——会话级 scope 模拟可达主语义（activeViewId 已接线），跨会话持久化缺口维持，产品化归 D1；②board 列聚合计算——mock 端点动态化收口（计数/Count/Percent 随会话态刷新），列头原生聚合语义件（Sum/Avg/Min/Max）缺口维持 kanban L2 候选。

## 5. 能力映射初稿

| 参考元素                     | flux 原语（schema 落点）                                                                                                                                                                      | 保真度预估                | C2 对照     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------- |
| 视图 tab 条                  | tabs（拖拽重排需扩展）                                                                                                                                                                        | 高                        | **G-C**     |
| 新建视图菜单                 | dialog + 表单                                                                                                                                                                                 | 高                        | G-C         |
| table 视图                   | table + form 族行内编辑                                                                                                                                                                       | 中（冻结列/类型切换缺）   | G-D（边缘） |
| board 视图                   | kanban（scheduling）                                                                                                                                                                          | 中高（分组聚合计算需补）  | G-D/G-C     |
| gallery 视图                 | card 网格 + data-source                                                                                                                                                                       | 高                        | G-E         |
| calendar 视图                | calendar（scheduling）（P5a 实测勘误 2026-08-30：calendar 月视图为资源时间轴横条形态，非 Notion 六周竖向月网格——原语直载形态不符，P5a 以 container grid + loop 自绘承载，原语复用度低于预估） | 中（格内联建+拖改期需补） | G-C         |
| list 视图                    | list                                                                                                                                                                                          | 高                        | G-E         |
| filter 构建器                | condition-builder                                                                                                                                                                             | 高（嵌套 3 层求值需验证） | **G-C**     |
| sort/搜索                    | data-source 查询参数                                                                                                                                                                          | 高                        | G-C         |
| 记录展开（side/center 双态） | dialog/drawer 双形态 + 字段行                                                                                                                                                                 | 高                        | G-C         |
| 属性 chip                    | badge + 10 色语义盘                                                                                                                                                                           | 高                        | G-E         |
| hover 显控件（OPEN/⋮⋮/+）    | CSS hover / 双渲染                                                                                                                                                                            | 中                        | **G-F**     |
| 右键/批量记录操作            | DropdownMenu + 批量栏                                                                                                                                                                         | 中                        | G-B3        |
| 库名+图标+视图族页面骨架     | 页面组合 schema                                                                                                                                                                               | 中                        | G-A         |
| 高密度行排版                 | 行高/字号 token                                                                                                                                                                               | 高                        | G-E         |

### 视图切换状态机（G-C 主对照，拆到状态/迁移级）

| 状态                                                                                                   | 迁移                                                                                                           | 持久化                                                                        |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 视图集合 `V=[{id,type,name,icon,display}]` + `activeViewId`                                            | I2 新建 → V+1 且 active=新；I13 display 三态仅本人                                                             | 视图定义=共享 schema（Save for everyone 分叉）；activeViewId/display=个人偏好 |
| `activeViewId` → 渲染分支（table/board/gallery/calendar/list）                                         | I1 切换 → activeViewId 变，整棵视图配置树随动（filter/sort/group/layout 全套）                                 | 当前视图可直达：URL/Copy link to view；侧栏内嵌视图直跳                       |
| 每视图私有配置集 `C={layout, propVisibility, filters, sorts, group, subGroup, condColor, openPagesIn}` | 任何 C 变更只作用当前视图；复制视图 C 随拷；默认 peek 按类型（table/board/list=side；gallery/calendar=center） | C 存视图级且**权限分"仅我/所有人"两层**                                       |

**L4 风险点实测判断（本篇调研判断，终判归 P5a/P5b）**：风险**高**。三处超出现有 crud/tabs 状态模型——① 配置集双层权限（个人 vs 共享）需要 schema 外的偏好存储层；② 视图类型↔布局↔默认 peek 的隐式联动规则；③ advanced filter 嵌套组与视图实例绑定的求值时机。建议 G-C 回写时显式建模 `viewDefs[] + activeId + perViewConfig`，个人偏好走 localStorage/用户偏好层、不进 schema；P5a 先以"tab + visible + 每视图一套 filter/sort 参数对象"模拟并压测重渲染成本（C1-4 预测的 tab 模拟重渲染成本实测点）。

## 6. 可复刻边界与差异声明

### 6.1 可复刻

五视图布局结构、视图 tab 条、filter/sort/group 面板结构、行内编辑分派模式、记录展开双形态、10 色语义盘架构、hover 显隐交互。

### 6.2 差异声明（令牌/布局与原版偏离点）

- 令牌偏离：正文 `#37352F`/`#373530` 两值并存（社区逆向），取一套并注明"逆向测得"；侧栏/hover/主蓝为社区共识值非官方 token；营销站品牌紫 `#5645d4` **不得混入 App 复刻**（属营销品牌，非 UI 令牌）。
- 布局偏离：属性类型裁剪——Formula/Relation/Rollup/Place/Button/ID 等长尾类型与 Chart 视图（付费）不进入 P5a 复刻清单，记录裁剪声明；500 属性上限、协同权限（Can edit content/Lock database）不复刻。
- 交互偏离：块编辑器（自由块区/drag-handle 文本块）不在本次范围；"Save for everyone" 双层权限以静态演示替代。
- 文案与图标：logo/wordmark/插画（catLookingUp 等）/原文案（"Save for everyone"、菜单标签）全部替换为自拟中文；emoji 图标体系用开源 picker + 原生字符实现。

## 7. 转 C2 候选

- **个人视图偏好存储层**（activeViewId/display 三态等"仅本人生效"配置）：G-C 状态机 L4 风险的伴生缺口，C2 未单独登记；随 P5b 回写时判断是否并入 G-C 行。
- **board 列聚合计算**（列头 Count/Sum/Avg/Percent）：kanban 语义增强候选，C2 未登记；随 P5b 一并处理。

## 8. 调研来源

- 🌐 notion.com/help/views-filters-and-sorts（视图类型/tab/filter 嵌套/sort/group/搜索/冻结列/peek 三态）（2026-08-29）
- 🌐 notion.com/help/intro-to-databases（库结构/inline-fullpage/记录页/自定义页/权限锁）（2026-08-29）
- 🌐 notion.com/help/database-properties（**替代** 404 的 /help/properties：20+ 类型/编辑方式/条件配色）（2026-08-29）
- 🌐 notion.com/help/boards（board 分组/拖拽/卡片尺寸封面/列聚合）（2026-08-29）
- 🌐(社区逆向) matthiasfrank.de/en/notion-colors/（10 色盘三套 hex、Default 文本 `#373530`）（2026-08-29）
- 🌐(慎用) designmd.co/d/notion（营销站令牌，仅作差异声明素材，非 App UI）（2026-08-29）
- 📊 web-search ×2（视图族综述定位、色值/字体栈来源定位）（2026-08-29）
