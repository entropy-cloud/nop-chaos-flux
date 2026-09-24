# [card] control:pull-refresh

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/pull-refresh` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host pull-refresh in dialog + onRefresh payload（C7 bug 73 pattern）——openDialog 弹层内 pull-refresh（threshold 50）+ infinite-scroll）
- **矩阵裁剪**: simplified（matrixReason：状态机五态已全链路驱动——pulling（下拉中）/ loosing（过阈值）/ loading（释放后）/ success（500ms 窗口）/ normal（回弹），外加 disabled / error 保持态与自定义 indicator 文案无 fixture 通路不可达（归渲染器单测）；三视口 × 双主题 + A8 鼠标路径核对）
- **dark 证据声明**：dark 截图为自采真 `data-mode="dark"`（R2-2a-B5-34）；指示器区对比度判读受弹层 dark 白底（已知族）影响，随族走。
- **取证方法声明**：loading 态窗口实测 ~1ms（microtask 一帧，`out-w6-pull-refresh.json` timeline t=3360→3361），PNG 截图物理不可捕捉；该态以 MutationObserver 时间线逐帧程序化取证（`data-status='loading'` + `加载中...` + spinner:true + translateY(50px)），截图止步于 success 态（500ms 窗口内）。

## 1. 截图清单

| 状态                                       | light                                                                         | dark（真 data-mode，自采）                   |
| ------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------- |
| 默认 1280×800                              | `_tmp/visual-inspection-2026-09-24/r2-2b/pull-refresh/default-light-1280.png` | —                                            |
| 弹层开（pull-refresh 宿主）                | `…/pull-refresh/dialog-open-light-1280.png`                                   | `…/pull-refresh/dialog-open-dark-1280.png`   |
| pulling（下拉中，dy=40→20px，`下拉刷新`）  | `…/pull-refresh/pulling-true-light-1280.png`                                  | `…/pull-refresh/pulling-true-dark-1280.png`  |
| loosing（过阈值，dy=120→60px，`释放刷新`） | `…/pull-refresh/loosing-clean-light-1280.png`                                 | `…/pull-refresh/loosing-dark-1280-fixup.png` |
| loading（~1ms 窗口，程序化取证）           | `…/pull-refresh/loading-race-light-1280.png`（竞速帧，实落 success）          | —（timeline 证据）                           |
| success（`刷新成功`，500ms 窗口）          | `…/pull-refresh/success-clean-light-1280.png`                                 | —（状态机与主题无关）                        |
| 弹层开 800                                 | `…/pull-refresh/dialog-open-light-800.png`                                    | `…/pull-refresh/default-dark-800.png`        |
| loosing 375×812                            | `…/pull-refresh/loosing-light-375.png`                                        | —                                            |
| 弹层开 375（含 chip 遮挡实例）             | `…/pull-refresh/dialog-open-light-375.png`                                    | —                                            |
| 默认 375×812（场景区）                     | `…/pull-refresh/default-light-375.png`                                        | `…/pull-refresh/default-dark-375.png`        |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 n/a（无焦点面）A3 pass（无按钮；smallTargets 零命中）A4 n/a A5 pass（loading 有 Spinner+文案非纯文本；error 态契约有『刷新失败』文案+无 spinner，fixture 未含）A6 **pass（拖拽全链路）**（时间线实证跟手：translateY 5→25→60px 随 touchmove 连续（阻尼 0.5），状态 pulling→loosing 阈值切换正确，loading/success 钳持在 threshold 50px，释放回弹 0px 带 cubic-bezier 过渡）A7 n/a A8 **fail（家族引用 R2-1d-A8-01，不另立项）**（鼠标拖拽零响应：`afterMouseDrag: status normal / ty 0`；容器内可聚焦元素 `count:0`，无键盘/单指针替代）A9 pass（onRefresh 派发 `${direction}|${threshold}` 解析为 `"down|50"`，成功态指示可见）
- B 颜色：B1 pass\*（指示器文案走 muted 令牌色，弹层白底下可读；dark 实际继承弹层白底，随族 #2）B2 n/a B3 n/a B4 pass（指示器文案/Spinner 走令牌）B5 **warn（家族引用，不立项）**（dark 弹层白底——像素采样 surface `rgb(252,252,252)`，指示器随之亮底）B6 n/a
- C 布局：C1 pass（全程无横向溢出）C2 pass（指示器 absolute translateY(-100%) 出流不压内容，OA-09 修正生效）C3 pass C4 pass（800 弹层正常）C5 pass C6 n/a
- D 间隔：D1–D8 n/a/pass
- E 排布：E1 pass E2 pass E3 pass E4–E6 n/a/pass
- F 一致性：F1 n/a F2 n/a F3 pass（loading Spinner 与全站同构）F4 n/a（指示器中文文案为 flux-i18n 回退，见 §4 #4）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（弹层 560px（md 档）落 `--overlay-size-*` 阶梯）H2 n/a H3 pass（surface top 60 / bottom 219 ≤ 792）H4 pass（关闭钮与标题无重叠——1280 下）H5 n/a H6–H7 pass H8 pass H9 pass（**375 下弹层正确收缩**：w=343 / left 16 / right 359 / `maxWidth: calc(100% - 32px)`，无溢出；初判"右缘裁切"经测量证伪，见 §5）

## 3. 发现条目

（本卡零新立项发现：状态机全链路与弹层几何全部 pass；A8 手势可及性命中既有族）

- **状态机全链路时间线**（`out-w6-pull-refresh.json` timeline，MutationObserver 逐跃迁 + 同帧 DOM 探针）：`pulling(下拉刷新, ty 5px, spinner:false) → loosing(释放刷新, ty 25px) → loading(加载中..., ty 50px, spinner:true) → success(刷新成功, ty 50px) → normal(ty 0px)` 完整两轮，与 OA-14/MA-10/OA-18/OA-09 契约逐项吻合；阈值判定以 delta（60≥50 → loosing）而非阻尼距离，与源码一致。
- **onRefresh payload 契约**：`window.__c7refresh === "down|50"`——evaluationBindings ctx 下 `${direction}|${threshold}` 解析正确（NEW-C7-01 家族约定生效）。
- **触摸不触发文本选择**：全程手势后 `window.getSelection() === ""`（`out-w6-pull-refresh-clean.json` selectionAfterGesture），MA-24 型选择抑制在 pull-refresh 无需介入。

## 4. 已知族命中（引用，不另立项）

- **A8 手势无单指针替代（R2-1d-A8-01 P2，systemic→R2-3）现状复核：仍复现**。① 鼠标拖拽零响应（120px 拖拽后 `status:'normal'/ty:0` 不变）；② 弹层内 pull-refresh 容器可聚焦元素 `count:0`——无按钮/长按/键盘等价刷新入口。渲染器仅挂 onTouchStart/Move/End/Cancel，无 Pointer Events。原条目维持，引用不另立项。
- **宿主级 `--popover` dark 亮底族**：`dialog-open-dark-1280.png` / `loosing-dark-1280-fixup.png` 弹层整面白底（像素采样 252,252,252），pull-refresh 指示器/正文全部继承——引用不立项，修复后需本卡 B5/H 复检。
- **调试 chip z9998 遮挡族**：375 弹层内实例——chip（BUTTON 55×28 @ (24,24)，z≥9990）压住弹层标题"Mobile host"（标题 rect @ (32,32)），实测重叠（`out-w6-dialog-375.json` chipOverlap；截图 `dialog-open-light-375.png` 中标题呈"⑧0 host"）。族新实例证据入库，引用不立项。
- **i18n zh-CN 回退族（R2-2a-F4-11 watch）**：指示器文案"下拉刷新/释放刷新/加载中.../刷新成功"为 flux-i18n zh-CN 默认值，英文宿主出中文 chrome——引用不立项。
- **计划内正向锚点**：OA-05 touchcancel 不提交（本波未单独驱动，契约由渲染器单测覆盖）；MA-01 reject 恢复 normal 路径未在 fixture 出现（无 reject 通路），归单测。

## 5. 误报排除记录

| 疑点                           | 排除理由                                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 375 弹层"右缘越界裁切"（初判） | 测量证伪：surface w=343、right=359、`maxWidth: calc(100%-32px)` 生效，16px 对称边距完整（`out-w6-dialog-375.json` surface）；截图观感系弹层圆角贴近视口边缘                  |
| 手势截图正文出现蓝色选中高亮   | 探针自身伪影：A8 鼠标拖拽检查的 mouse down+move 触发原生文本选择；真触摸手势实测零选择（selectionAfterGesture:""）；已用 clean 重拍（pulling/loosing/success-clean）替换证据 |
| loading 态无截图               | ~1ms 窗口物理不可捕捉（timeline t=3360→3361）；时间线探针已程序化坐实该态存在且内容正确（spinner:true + 加载中... + ty 50px）                                                |

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-pull-refresh` → carded（卡列填本路径）；
- findings：零新立项；A8 族引用 R2-1d-A8-01（systemic→R2-3）随原条目走；批内复检通过后 → verified。
