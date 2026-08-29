# Airtable grid 网格编辑复刻分析（P6 输入）

> 分析对象：Airtable grid view（单元格全型别行内编辑、列菜单、行高、分组、键盘导航、批量选区）（开源状态：**闭源，风格等价复刻 + 差异声明**）
> 调研日期：2026-08-29（来源见 §8；任务给定 5 个 `support.airtable.com/docs/{slug}` URL 全部 404，已替换为现行 `/articles/{id}` 官方文章——官方 28 型别清单/键盘快捷键/grid 行为三篇全文抓取成功；px/色值类为社区口径，标注 📊）
> 上游：R1 §2.4/§4 G-D、C1-3/4（网格压测构想）、C2 **G-D（网格编辑深度：单元格编辑器矩阵/列菜单/分组/行高）——本应用主对照行**；下游：P6a / P6b

## 1. 应用概述

Airtable grid 是"电子表格体验的关系型网格"：**导航态/编辑态双态分离**（单击选中导航、Enter/F2 进入编辑）、28 型别单元格编辑器矩阵、列宽/行高/列序自由调整、group by 分组聚合。这是 C2 G-D"网格编辑深度"的原型参照，也是 flux `input-table`/`inline-edit-table` 底座的最高压力场景。

## 2. 设计令牌结构

### 2.1 色彩（官方未公开 token 表；📊 通用口径，复刻前吸管比对校准）

| 令牌位              | 参考值 📊                                              | 用途                                         |
| ------------------- | ------------------------------------------------------ | -------------------------------------------- |
| 页面底 / 工具栏区   | `#ffffff` + 浅灰面板 `#f7f7f8` 类                      | 视图栏、表格区白底                           |
| 网格底（cell 默认） | `#ffffff`                                              | 行分隔浅灰 `#dddddd`~`#e5e5e5` 类            |
| 表头底              | `#f7f7f8` 类                                           | 表头行高可拖拽调（🌐 官方证实 ↕）            |
| 选中列蓝（主色）    | `#2d7ff9` 类                                           | 选中单元格边框/列头选中态/链接/主按钮        |
| 行 hover            | `#f5f5f5` 类                                           | 非选中悬停铺底                               |
| 字段彩色盘          | 约 15–20 色系 × 多明度档（绿/青/蓝/紫/粉/红/橙/黄/灰） | select 选项 chip                             |
| 语义色              | 红=删除/错误、黄=警示、绿=开启                         | toggle "green switched right"（🌐 行为证实） |
| 协作者头像盘        | 彩色圆底 + 姓名首字母                                  | collaborator/user 字段 avatar                |

### 2.2 排版

专有字体（Colfax 类）→ 复刻用 `Inter, -apple-system, "Segoe UI", sans-serif` 近似即可达风格等价。网格正文 **13px**（高密度核心）；表头 12–13px 加粗；summary bar 12px。

### 2.3 间距/圆角/行高密度档

**行高四档**（档位与语义 🌐 官方证实，px 为 📊 社区口径）：

| 档位              | px 📊 | 行为（🌐 证实）                 |
| ----------------- | ----- | ------------------------------- |
| Short（默认最密） | ≈32   | 单行文本 + 小附件缩略图         |
| Medium            | ≈48   | 多行文本 / 多行 select 标签换行 |
| Tall              | ≈80   | 更大图片、更多行                |
| Extra Tall        | ≈160  | 最大图片、最多行数              |

视图栏 switcher 即选即生效、全视图统一；表头行高与行高档独立；列宽表头边缘 ↕ 拖拽无档位。圆角：chip 3–4px、按钮 4–6px、记录 modal 8px 类；单元格左右 padding ≈8px；溢出省略 + 单元格内展开按钮放大查看（🌐 证实）。

### 2.4 交互习惯

单击=选中/导航，**Enter/F2=进入编辑，Space=展开整条记录，Shift+Space=展开单元格**（🌐 全证实）——双态分离是网格灵魂。拖拽文化：表头拖宽/拖排序、六点把手拖字段序（🌐）、**Alt+拖=复制记录或字段**（🌐）。所有视图配置（hide/filter/sort/group）即时自动保存（🌐）。

### 2.5 图标

线性 14–16px、1.5px 描边；**字段型别图标为彩色小方块**（每型别一个专属 glyph，表头左侧与字段菜单）——复刻需自绘一套 28+ 型别 glyph（不复制原图，按型别语义重绘）。

## 3. 页面清单与复杂度排序

| 页面/状态         | 复杂度 | 说明                                                                                                                                                  |
| ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grid 视图（主）   | ★★★★★  | 虚拟滚动大数据量 + 28 型别单元格渲染 + 列宽/行高/列序拖拽 + 导航/编辑双态 + 选区模型；flux 无现成"电子表格型网格底座"，input-table 需大改（G-D 核心） |
| Record 展开 modal | ★★★★   | 全字段大表单 + 字段分区 + 上一条/下一条导航（⌘⇧>/<，🌐）+ "Show XX hidden fields" 反向控制视图列（🌐）                                                |
| 批量选区 + 填充   | ★★★★   | ⇧/⌘ 点选、⇧ 方向键范围选、**fill handle 拖拽填充（日期等差序列，🌐 官方证实）**、范围复制粘贴                                                         |
| Group 分组态      | ★★★★   | 多级分组 + 组头折叠/展开 + 组内计数 + summary bar 汇总（sum 等）+ 分组态键盘边界改变（⌘↑↓ 跳组顶/底，🌐）                                             |
| Field 列头菜单    | ★★★    | 下拉菜单（Hide field 🌐；edit/换型别/sort A-Z/insert left-right/delete 为 📊 标准项）+ 型别子菜单                                                     |
| 行高切换态        | ★★     | 视图栏四档，联动附件缩略图/文本截断行数                                                                                                               |
| Hide fields 面板  | ★★     | 逐字段 toggle + Find a field 搜索 + Hide all/Show all + 拖排序 + **主字段不可隐藏**（🌐 全证实）                                                      |

## 4. 核心交互清单

### 4.1 单元格编辑器矩阵（型别清单 🌐 官方 28 型全文核验；进入编辑 = 单击选中 → Enter/F2）

| 单元格型别                  | 行内展示形态                              | 编辑器形态                                                        |
| --------------------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| Single line text            | 纯文本单行截断                            | 直接键入覆盖；Enter 提交                                          |
| Long text（富文本）         | 单行截断 + 展开按钮（🌐）                 | ⇧+Space 展开大编辑浮层（🌐）；富文本工具栏 + @mention（🌐）       |
| Single select               | 彩色 chip                                 | 下拉单选 📊                                                       |
| Multiple select             | 多 chip 换行（行高联动 🌐）               | 下拉多选标签勾选增删 📊                                           |
| Date & Time                 | 本地化日期串                              | **calendar widget 日历选择器**（🌐 原话证实）；⌘+; 置为今天（🌐） |
| Number / Currency / Percent | 右对齐数字（% 按 75% 格式 🌐）            | 文本框键入，失焦/Enter 提交；精度/千分位由字段配置 📊             |
| Checkbox                    | 方形勾选框                                | 单击即翻转 📊                                                     |
| Attachment                  | 缩略图（行高档联动 🌐）                   | 缩略图网格 + 上传窗口 + ⌘V 粘贴（🌐）；Alt+拖复制                 |
| User / Collaborator         | 彩色 avatar + 名字 chip                   | 下拉选人（自动协作者名单 🌐），user 字段可多选                    |
| Created/Modified By & time  | avatar / 日期只读                         | —（自动字段）                                                     |
| Email / URL / Phone         | 蓝链接文本（点击唤起 🌐）                 | 文本框编辑；phone 美式格式化（🌐）                                |
| Duration                    | `h:mm:ss` 串                              | 数字输入 + 单位档位（秒/毫秒 🌐）                                 |
| Rating                      | 星星序列（满分档可配 📊）                 | 点击星级即提交 📊                                                 |
| Barcode                     | 条码串                                    | 弹扫码/输入编辑器；移动端相机扫码（🌐）                           |
| Autonumber / Count          | 数字只读                                  | —                                                                 |
| Formula / Lookup / Rollup   | 按输出型别渲染只读（文本/数字/chip/数组） | —（🌐 varied outputs）                                            |
| Linked record               | 记录名 chip 列表（高档多行 🌐）           | 点 chip 展开目标记录；搜索选记录浮层 📊                           |
| Button                      | 彩色按钮（label 可配）                    | 点击触发动作（打开 URL 等 🌐）                                    |

### 4.2 列头菜单 / 行操作 / 行高 / 分组

- 列头菜单：Hide field（🌐）、拖拽表头重排、列宽拖拽、表头底缘拖拽调高（🌐）；edit field/换型别/sort A→Z Z→A/Insert left/right/Delete field（📊 标准项，截图校准）。
- 行操作：Space 展开记录、Esc 关闭（🌐）；展开态 ⌘⇧>/< 上下条（🌐）；Alt+拖=复制记录（🌐）；⌥↑/⌥↓ 移动记录序（🌐）；**⇧+Enter 下方插行 / ⌘⇧+Enter 末尾插行**（🌐）。
- 行高：四档即选即生效（🌐）；视图可锁定防改动（🌐 付费项，不复刻）。
- Group by：组头 = 分组值 + **组内计数**（必有）+ **summary bar 汇总**（按字段型别选聚合）；折叠/展开组；⌘⇧+D 开分组菜单、Enter 折叠/展开全部（🌐）；分组态 ⌘↑↓ 跳组顶/底（🌐）。

### 4.3 键盘导航（全部 🌐 官方快捷键文章）

| 键                | 行为                         | 键             | 行为                       |
| ----------------- | ---------------------------- | -------------- | -------------------------- |
| 方向键            | 单元格间移动                 | Tab / ⇧Tab     | 前进/后退                  |
| Enter / F2        | 进入编辑                     | Esc            | 退出编辑/关展开/关查找     |
| ⇧+方向键 / ⇧+点击 | 范围选区                     | ⌘+点击         | 非相邻多选                 |
| ⌘+方向键          | 跳表格边缘（分组态=组顶/底） | ⌘⇧+方向键      | 跳边缘并选区               |
| ⌘C/X/V            | 单元格/范围复制剪切粘贴      | Space / ⇧Space | 展开记录 / 展开单元格      |
| ⇧Enter / ⌘⇧Enter  | 下插行 / 末尾插行            | ⌘F             | 视图内查找（非浏览器查找） |
| ⌘Z / ⌘Y           | 撤销/重做                    | ⌘;             | 选中日期置为今天           |

批量：fill handle 右下角拖拽填充（日期选 1 格下拉=重复、2 格=等差，🌐）；⇧/⌘+点击 批量字段操作（🌐）。

## 5. 能力映射初稿

| 参考元素                                | flux 原语（schema 落点）                                        | 保真度预估                                     | C2 对照        |
| --------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- | -------------- |
| 网格底座（虚拟滚动+双态+选区+键盘模型） | `input-table` / `inline-edit-table`                             | **中**（需补双态/范围选区/fill handle/键盘层） | **G-D 核心行** |
| 单行/长文本编辑                         | `input-text`（长文本→textarea/浮层）                            | 高                                             | G-D 矩阵       |
| 数字/货币/百分比                        | `input-number` + 格式配置                                       | 高                                             | G-D 矩阵       |
| Date + 日历 widget                      | `input-date`（popover 月历已落地 ⚡）                           | 高                                             | G-D 矩阵       |
| Single/Multiple select 彩色 chip        | `select` + badge/chip 渲染                                      | 中高（需 chip 色盘 token）                     | G-D 矩阵       |
| Checkbox                                | `checkbox`                                                      | 高                                             | G-D 矩阵       |
| Attachment 缩略图墙+粘贴                | `upload`                                                        | 中（缩略图行高联动）                           | G-D 矩阵       |
| Rating 星级                             | form 族 rating 原语存疑——P6a 实测确认，无则以 badge/select 模拟 | 中 / 缺口                                      | G-D 矩阵       |
| Collaborator avatar 选人                | **缺口**（无 avatar select）                                    | 缺口                                           | G-D 矩阵       |
| Email/URL/Phone/Duration                | `input-text` + 校验/格式化                                      | 中高                                           | G-D 矩阵       |
| Barcode 编辑器                          | scheduling 包 `BarcodeInput`（⚡ 已注册）                       | 中高                                           | G-D 矩阵       |
| Formula/Lookup/Rollup 只读列            | `table` 计算列 / 表达式求值                                     | 中高                                           | G-D 矩阵       |
| Linked record chip + 搜索浮层           | select 远程源 / `data-source` + dialog                          | 中                                             | G-D 矩阵       |
| Button 字段                             | action 系统（action-scope-and-imports）                         | 高                                             | G-D 矩阵       |
| 列头菜单/字段增删改                     | context menu + 字段配置 dialog                                  | 中（动态改列模型）                             | **G-D 列菜单** |
| Group by + 折叠 + summary bar           | table 分组聚合（现无则大缺口）                                  | 缺口~中                                        | **G-D 分组**   |
| 行高四档                                | inline-edit-table 密度 prop（纯样式）                           | 中高                                           | **G-E** 密度档 |
| hover/选中态                            | CSS 令牌                                                        | 高                                             | **G-F**        |
| 键盘导航模型（双态+方向键+Enter/Esc）   | input-table 键盘层（需自建）                                    | 缺口~中                                        | **G-B2**       |
| 批量选区 + fill handle                  | input-table 选区层（需自建）                                    | 缺口                                           | **G-B3**       |
| Record 展开 modal                       | `dialog`/`drawer` + form 族                                     | 高（形态拼装）                                 | G-D            |
| 条件过滤                                | `condition-builder`                                             | 高（天然对应）                                 | G-D            |

**矩阵缺口初判（本篇判断，终判归 P6a 实测）**：flux 编辑器矩阵基本盘厚（文本/数字/日期/select/checkbox/upload 均有原生对应，barcode 可用 scheduling BarcodeInput），缺口集中在六处——① collaborator avatar 选人；② rating（存疑）；③ 分组折叠 + summary bar；④ fill handle/范围选区/导航态键盘模型；⑤ 富文本单元格浮层编辑器（@mention）；⑥ 列头"动态改列 schema"菜单语义。①~⑥ 中属渲染器语义增强/新原语的部分按 C2 裁决级别走 D1 流程，P6a 只做 style-equivalent 模拟并记录。

## 6. 可复刻边界与差异声明

### 6.1 可复刻

网格布局、行高四档密度模型、双态交互、键盘模型、chip 化字段渲染、分组汇总条、列头菜单结构、记录展开 modal——功能模式层面 style-equivalent 复刻，实现按截图重写、不引用原代码与素材。

### 6.2 差异声明（令牌/布局与原版偏离点）

- 令牌偏离：官方无公开 token 表，§2 全部色值/px 为社区口径 📊，P6a 落 CSS 前实机截图逐项吸管/测量校准；主蓝 `#2d7ff9` 需替换为自有主色或确认仅作风格参考。
- 布局偏离：专有字体 → Inter 系近似栈（字形可见差异）；28+ 型别 glyph 全套自绘。
- 交互偏离：付费能力（视图锁定、高级权限）不复刻；fill handle 等差填充若 P6a 以 mock 演示降级为"重复填充"，记录降级声明。
- 文案与图标：logo/商标/插画/产品原文案（"Base""Expand record" 等）全部替换为自拟中文。

## 7. 转 C2 候选

- **grid 分组聚合语义**（group by + 组内计数 + summary bar）：G-D 行的子能力但 C2 未单独列名，初判 L2；随 P6b 回写时并入或加行。
- **范围选区 + fill handle 编辑模型**：超出 G-B3"批量操作栏"语义（是编辑器选区模型而非工具栏），C2 未登记；随 P6b 一并判断归属。

## 8. 调研来源

- 🌐 support.airtable.com/articles/4808831313（supported field types overview，28 型全文）（2026-08-29）
- 🌐 support.airtable.com/articles/7905594155（grid view：双态/拖拽/行高/展开/Alt 复制/fill handle 引用）（2026-08-29）
- 🌐 support.airtable.com/articles/7980233311（keyboard shortcuts 全表）（2026-08-29）
- 🔍 support.airtable.com/articles/7361540623（grouping：summary bar/count，搜索摘要）（2026-08-29）
- 🔍 support.airtable.com/docs/quickly-filling-cells-using-fill-handle（经 grid view 文章引用证实）（2026-08-29）
- ❌ 任务给定 5 个 `docs/{slug}` URL 全部 404 → 已替换为上列 `/articles/{id}` 现行官方文章（2026-08-29）
- 📊 web-search（行高 px/色值 `#2d7ff9`/13px 字号/列头菜单完整项——社区口径，需实机校准）（2026-08-29）
