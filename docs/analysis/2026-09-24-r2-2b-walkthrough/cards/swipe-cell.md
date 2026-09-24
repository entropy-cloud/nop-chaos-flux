# [card] control:swipe-cell

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/swipe-cell` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host swipe-cell row action (C7)——loop 三行 swipe-cell，左侧归档钮（outline sm，threshold 30），onAction 解析 `${side}|${$slot.index}`）
- **矩阵裁剪**: simplified（matrixReason：状态机 closed / 拖拽中（跟手）/ open-left（提交）/ 回弹 / outside-close / action 自动回弹已全链路驱动；open-right 与 `direction:left|right|both` 变体无右侧 action fixture 通路不可达（归渲染器单测）；disabled / closeOnOutside=false 开关同裁；三视口 × 双主题 + A8 鼠标路径核对）
- **dark 证据声明**：dark 截图为自采真 `data-mode="dark"`（R2-2a-B5-34）；归档钮对比度按像素采样判读（渐变背景 DOM 合成失真）。

## 1. 截图清单

| 状态                             | light                                                                      | dark（真 data-mode，自采）            |
| -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| closed 1280×800（三行默认）      | `_tmp/visual-inspection-2026-09-24/r2-2b/swipe-cell/closed-light-1280.png` | `…/swipe-cell/closed-dark-1280.png`   |
| 拖拽中（+20px，跟手未过阈值）    | `…/swipe-cell/middrag-light-1280.png`                                      | —（状态机与主题无关）                 |
| 拖拽中（+60px，过阈值）          | `…/swipe-cell/drag60-light-1280.png`                                       | —                                     |
| open-left（归档钮露出）          | `…/swipe-cell/openleft-light-1280.png`                                     | `…/swipe-cell/openleft-dark-1280.png` |
| action 点击后（自动回弹 closed） | `…/swipe-cell/after-action-light-1280.png`                                 | —                                     |
| closed 800×900                   | `…/swipe-cell/closed-light-800.png`                                        | `…/swipe-cell/closed-dark-800.png`    |
| open-left 800                    | `…/swipe-cell/openleft-light-800.png`                                      | —                                     |
| closed 375×812                   | `…/swipe-cell/closed-light-375.png`                                        | `…/swipe-cell/closed-dark-375.png`    |
| open-left 375                    | `…/swipe-cell/openleft-light-375.png`                                      | —                                     |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 n/a（关闭态区域 inert（OA-08 `leftInert:true→open 时 false` 实测翻转），无虚假焦点面）A3 pass（归档钮 48×28 ≥24，`smallTargets` 全页扫描零命中——本波重点核对项通过，与 R2-1d 实测一致）A4 n/a A5 n/a A6 **pass（拖拽全链路）**（+20px 时 content translateX(20px) 跟手且 state 仍 closed；+60px 过阈值后释放提交 open-left，300ms cubic-bezier 回弹过渡；NEW-C7-02 区域落位修正生效——归档钮揭示位 x=301 恰在内容位移后的缺口内）A7 n/a A8 **fail（家族引用 R2-1d-A8-01，不另立项）**（鼠标拖拽零响应：120px mouse drag 后 `state:'closed'/tx:0` 不变；无键盘/按钮替代入口）A9 pass（归档点击 → `__c7action === "open-left|0"`（side+index 解析正确）+ 自动回弹 closed；closeOnOutside 点击外部 x=700,600 后 `state:'closed'`）
- B 颜色：B1 pass（归档钮文本 dark 像素采样 13.56:1）B2 **warn（家族引用，不立项）**（dark 下 outline 钮边界/填充对 stage 对比 ~1.1–1.2:1 低于 3:1——WCAG 1.4.11，dark 对比度族实例，见 §4 #3）B3 pass（归档 outline 非破坏语义，正确）B4 pass（边框/填充走令牌：border `rgb(31,42,61)`、半透明 oklab 填充）B5 **warn（同 B2，族引用）**B6 n/a
- C 布局：C1 pass（全程零横向溢出；揭示区经 `overflow:hidden` 裁切属有意设计）C2 pass（揭示层与内容零叠压异常）C3 pass C4 pass（800 正常；375 见 C5 表注——手势与揭示仍工作，`openLeft375: state open-left, 归档钮 48×28 @ x301`）C5 pass C6 n/a
- D 间隔：D1–D8 n/a/pass（行距走宿主 gap，节奏一致）
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 n/a
- F 一致性：F1 pass（归档钮 outline sm 与全站按钮同构）F2 n/a F3 n/a F4 n/a（"归档"为 fixture 文案）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（本卡零新立项发现：手势链路、inert 门控、action 契约、目标尺寸全部 pass；A8 可及性与 dark 边界对比命中既有族）

- **手势全链路探针**（`out-w6-swipe-cell.json`）：`closed(inert:true, tx 0) → midDrag +20px(tx 20px, state closed) → +60px(tx 47.6px) → open-left(inert:false, 归档钮 x253→301 露出) → action 点击(probe "open-left|0", 自动回弹 tx 0) → 重开(open-left) → 外部点击(closed)`。OA-08 inert 门控、MA-09/OA-02 close-after-action、closeOnOutside 逐项吻合。
- **A3 本波重点核对**：归档钮 48×28（≥24 达标），三视口一致（375 下同值）；对比 R2-1d 实测（48×28）无回归。

## 4. 已知族命中（引用，不另立项）

- **A8 手势无单指针替代（R2-1d-A8-01 P2，systemic→R2-3）现状复核：仍复现**。① 鼠标拖拽零响应（5 步 100px mouse drag 后 `state:'closed'`、`tx:0`）；② 关闭态归档钮 `inert:true` 且无任何替代触发器（无"···"钮/长按菜单/键盘通路）——键盘用户在关闭态完全无法触达归档。附带可供性观察：三行为裸文本（无卡片/边框/分隔线/滑动暗示），手势可发现性为零，同属该族契约面。原条目维持，引用不另立项。
- **A3 小目标族核对结论**：本控件归档钮 48×28 达标——R2-1a-A3 族在 swipe-cell 上无新实例。
- **dark 平价/对比度族（R2-4）**：open-left dark 下归档钮 outline 边界（`rgb(31,42,61)`）与半透明填充对 stage 底对比仅 ~1.1–1.2:1（像素采样 `btnTopEdge 1.19 / btnArea fill vs stage ≈1.1`，`w6-pixel-sample4.mjs`），低于 WCAG 1.4.11 UI 边界 3:1；文本本身 13.56:1 合格。系 ui Button outline 变体 dark 令牌的通用面（非 swipe-cell 局部）——族实例证据入库，引用不立项。
- **计划内正向锚点**：NEW-C7-02 揭示位修正生效（归档钮落在内容让出的缺口内，非 R2-1d 时代"永远裁在界外"的旧行为）；OA-12 ResizeObserver 重测量在本载体无变异场景，契约归单测。

## 5. 误报排除记录

| 疑点                                        | 排除理由                                                                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 关闭态归档钮已存在 DOM（x=253）疑似冗余渲染 | 滑出层标准实现：`overflow:hidden` 裁切 + `inert` 双重锁定（OA-08），AT 不可达、视觉不可见；问题仅在替代路径（A8 族引用），非 DOM 缺陷                |
| 提交偏移 47.6px ≠ 拖拽 60px                 | 提交后偏移收敛到区域实测宽度 47.6094px（归档钮 48px 减边），MA-24/OA-12 机制正确，非跟手丢失                                                         |
| 375 下归档钮 x=301 越出 375 内容列（~87px） | 载体壳层压挤下面向绝对坐标的解释失真；手势/揭示机制在 375 仍完整工作（state/inert/probe 全对），壳层根因引用窄视口族（countdown 卡 §4 #1），不另立项 |

## 交互键登记

- 无注册交互键：揭示/回弹全靠 TouchEvent 序列（渲染器仅挂 touch handler），interactions.mjs 键集无手势 action（closure audit F2 补录 2026-09-24；手势取证见本卡探针）。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-swipe-cell` → carded（卡列填本路径）；
- findings：零新立项；A8 族引用 R2-1d-A8-01（systemic→R2-3）、dark 边界对比引用 R2-4 族，随各自主条目走；批内复检通过后 → verified。
