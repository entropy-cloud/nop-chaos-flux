# [card] control:dialog

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/dialog` ｜ **载体**: lab 页（MultiScenarioLabPage，6 场景：信息弹层 / 表单弹层 / edit-submit 回归 / real-schema 18 字段 / CRUD 行编辑 / C1a 尺寸矩阵）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件——dialog 为单弹层 surface，弹层开态必查已全做（点外关/Esc 关/footer 按钮/焦点落点/尺寸阶梯/长内容滚动/堆叠）；裁掉的状态：glass 皮肤、`confirm` 内建确认条（fixture 未触发，确认按钮条路径走 dialog-host 源码核对）、showMask=false / closeOnEsc=false 变体开关矩阵）
- **runner dark 列作废声明**：同前（R2-2a-B5-34），弹层 dark 证据以自采 `r2-2a/dialog/` 显式 data-mode 截图为准。

## 1. 截图清单

| 状态                              | light                                                                          | dark（真 data-mode，自采）                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-23/lab-dialog-default-1280x800-light.png`      | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/edit-open-dark-1280.png`（弹层开）                       |
| 默认 800×900                      | `_tmp/visual-inspection-2026-09-23/lab-dialog-default-800x900-light.png`       | —                                                                                                        |
| 信息弹层开                        | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/info-open-light-1280.png`      | —                                                                                                        |
| 表单弹层开                        | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/form-open-light-1280.png`      | —                                                                                                        |
| sm 尺寸弹层                       | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/size-sm-open-light-1280.png`   | —                                                                                                        |
| full 尺寸弹层                     | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/size-full-open-light-1280.png` | —                                                                                                        |
| 堆叠弹层                          | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/stacked-open-light-1280.png`   | —                                                                                                        |
| 长内容弹层（编辑记录，滚动前/后） | —                                                                              | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/edit-open-dark-1280.png` / `edit-scrolled-dark-1280.png` |
| real-schema 18 字段弹层           | —                                                                              | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/real-open-dark-1280.png`                                 |
| Esc 关闭后                        | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/after-esc-light-1280.png`      | —                                                                                                        |
| 800 宽表单弹层                    | `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/form-open-light-800.png`       | —                                                                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 pass（弹层内按钮 hover 归 button 卡 A1 族，本卡不重复）A2 pass（focus 落点在弹层内不逃逸：`inSurface: true`）A3 pass A4 n/a A5 n/a A6/A8 n/a A7 pass（关闭钮存在、遮罩存在、焦点困在弹层内）A9 pass（关闭通道全部生效）
- B 颜色：B1–B4 n/a/pass（弹层 chrome 走令牌）B5 warn（**已知宿主问题引用不另立项**：`--popover dark 亮底`——edit-open-dark-1280.png 弹层整面白底，见 drawer 卡同族说明）B6 n/a
- C 布局：C1 **warn(R2-2a-C1-10)**（real-schema 弹层内容 4–5px 横向溢出）C2 pass C3 pass C4 pass（800 宽弹层 560 不溢出视口）C5 pass（body 区滚动，无双滚动条）C6 n/a
- D 间隔：D1 pass（footer gap 8px 落栅格）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（real-schema 取消/确定主次 variant 正确：确定 primary）E3 pass（确定在右主位，`footerButtons: [取消 x752, 确定 x832]`）E4–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 **warn(R2-2a-F4-11)**（英文宿主弹层 a11y 标签出中文）F5 pass（footer 布局与 H5 锚点一致）
- G 设计器：n/a
- H 弹层：H1 pass（xs360/sm480/md560/lg720/xl960/full 100vw 全落 `--overlay-size-*` 阶梯，plan490 锚点复检通过）H2 n/a H3 **fail(R2-2a-H3-08)**（长内容弹层底部越出视口 28px）H4 pass（关闭钮与标题无重叠）H5 **warn(R2-2a-H5-09)**（schema 层 form actions 左对齐，已知族实例）H6 pass（label 顶对齐统一、字段间距成栅格）H7 pass（header/body/footer padding 走 `--dialog-*` 令牌，无双层 padding）H8 pass（滚动在 `[data-slot="dialog-body"]` overflow-y auto，scrollTop 106 生效，footer/header 不随滚）H9 pass（800 宽重开不溢出、按钮组不破版）

## 3. 发现条目

### [R2-2a-H3-08] 顶部锚定长内容弹层底部越出视口：`--dialog-top-offset` 未计入 max-height（bottom 828 > 792）

- **页面/路由**: `#/lab/dialog`（场景 3 "Edit dialog submits edited field value"，一切 top 锚定 + 内容高于视口的开态弹层同险）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 弹层开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/edit-open-dark-1280.png`（弹层下缘被视口裁断，无收边）
- **目视描述**: 编辑记录弹层从 top 60px 锚定，内容撑到 828px，视口 800px——弹层底边越出屏幕 28px，看不到底部收边，位于 body 底部的表单 OK 按钮需滚动才能看到。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-overlays.mjs`（surface boundingRect + body scroll 探测）
  - 输出: `editOpenDark: { top: 60, height: 768, bottom: 828, viewportH: 800 }`——height 768 恰为 `max-h: calc(100vh-32px)` 档（ui DialogContent），但 top 锚定 `calc(var(--dialog-top-offset) + stack*step)`（`packages/flux-react/src/dialog-host.tsx` L268）使 60+768=828 > `innerHeight−8`。H3 判据 `contentRect.bottom ≤ innerHeight − 8` 不成立。
- **对照基准**: 检查提示词 H3（弹层高度 ≤ 视口，长内容不把 footer 顶出屏幕）
- **严重程度**: P2（长表单弹层高频；底部操作按钮被推出视口需滚动发现）
- **用户影响**: 打开长内容编辑弹层时确认/提交按钮在首屏不可见，用户易漏操作；弹层无下边的"破版"观感。
- **修复方向**: `packages/flux-react/src/dialog-host.tsx` surfaceStyle 在 top 锚定分支同步约束高度：`maxHeight: calc(100vh - var(--dialog-top-offset) - ${stackIndex} * var(--dialog-stack-step) - 16px)`，或在 ui DialogContent 将 max-h 改为 `calc(100vh - var(--dialog-top-offset, 0px) - 16px)`。
- **归族**: systemic → R2-3 批（弹层几何单点根因，所有 top 锚定长弹层收一修复）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）

### [R2-2a-H5-09] schema 层 form actions 左对齐渲染在 body 内（弹层无 footer 右对齐条）——弹层 actions 左对齐已知族实例

- **页面/路由**: `#/lab/dialog`（场景 2 Edit Contact / 场景 3 Edit Record——form.actions 定义在 form schema 内）
- **主题/视口/状态**: light / 1280 / 弹层开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/form-open-light-1280.png`（Confirm/Cancel 左对齐于 body 底部）
- **目视描述**: Confirm/Cancel 按钮左对齐排在表单尾部，不在弹层 footer 区，不右对齐，与 real-schema 场景（footer 取消/确定右对齐）同页两种形态。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-overlays.mjs`
  - 输出: `formOpen.footerJustify: null, footerButtons: []`（弹层 footer 区不存在，actions 随 form body 渲染）；对照 `realOpenDark.footerJustify: 'flex-end', footerButtons: [取消@x752, 确定@x832]`（gap 8px，右对齐正确）。
- **对照基准**: 已知族 #1 弹层 actions 左对齐（R2-3b 引用）+ 本卡实例；H5（确认在主位、右对齐）
- **严重程度**: P3（schema 作者把 actions 放 form 内的用法问题，surface 层 actions 通道正确；同一页面出现两种 footer 形态放大不一致感）
- **用户影响**: 主操作按钮不在视觉动线终点（右下），确认/取消发现成本高。
- **修复方向**: schema 层把 `actions` 提升到 `openDialog.args.actions`（dialog-host footer 通道）；或在 flux-renderers-basic form 渲染层将 form.actions 转投 surface footer 槽（对齐 AMIS dialog actions 语义）。
- **归族**: systemic → 弹层 actions 左对齐族（R2-3b 已知族引用）+ 本卡实例
- **复核状态**: 未复核

### [R2-2a-C1-10] real-schema 弹层内表单内容 4–5px 横向溢出

- **页面/路由**: `#/lab/dialog`（场景 4 real-schema 18 字段弹层；横向 mode 双字段行同险）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 弹层开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/real-open-dark-1280.png`
- **目视描述**: 弹层内表单区右缘有细微裁切感（input-group 右缘贴住滚动边界）。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-overlays.mjs` realOverflow 段（弹层内 overflow 扫描）
  - 输出: `nop-form overX 4`、`[data-slot="tabs-root"] overX 4`、`[data-slot="input-group"] overX 5`、`[data-slot="field-control"] overX 4`（rectW 512，scrollWidth 516）；sr-only input 的 69/173px 溢出为有意隐藏，白名单排除。
- **对照基准**: 检查提示词 C1（无意外溢出）；H2（弹层内 C1 复跑）
- **严重程度**: P3（4–5px，肉眼几不可察；横向 mode label+control 双列宽度计算微超）
- **用户影响**: 基本无感；仅长 real schema 弹层右缘有 1–5px 裁切风险。
- **修复方向**: form 横向 mode 字段行（`flex` 双字段）加 `min-w-0` 传递或 field-control 加 `max-w-full`，收敛 scrollWidth 至 clientWidth。
- **归族**: watch-only → 台账（schema fixture 级微溢出；form 布局通用性问题可在 R2-2 后续波次复检）
- **复核状态**: 未复核

### [R2-2a-F4-11] 英文宿主页面弹出中文 chrome 文案：flux-i18n 默认 zh-CN 未随宿主初始化

- **页面/路由**: `#/lab/dialog`（弹层键盘拖拽 a11y 标签"移动对话框"）；同根因实例：`#/lab/dynamic-renderer` 错误态"错误：Request failed (status=500)"、各 lab 页 scope-debug 面板"调试/折叠"
- **主题/视口/状态**: 双主题 / 全视口 / 弹层开 + 错误态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/dialog/info-open-light-1280.png`（focus 落点元素文本含"移动对话框"）；`_tmp/visual-inspection-2026-09-23/r2-2a/dynamic-renderer/failing-load-error-light-1280.png`
- **目视描述**: 全英文的 lab 页与弹层中，键盘移动对话框说明、错误前缀、调试面板标题均为简体中文。
- **程序化证据**:
  - 探针: w1-overlays.mjs `activeEl: "DIV:移动对话框Example Dialog"`；w1-structural.mjs `text: "错误：Request failed (status=500)"`
  - 输出: `apps/playground/src` 无 `initFluxI18n` 调用（grep 零命中）；`packages/flux-i18n/src/i18n.ts` 仅注册 zh-CN/en-US 资源，未初始化时回退 zh-CN（`locales/zh-CN.ts` L430 moveDialog）。
- **对照基准**: 检查提示词 F4（同一概念/文案语言一致）
- **严重程度**: P3（a11y 说明与错误文案语言错乱，不影响任务完成）
- **用户影响**: 英文用户读到中文辅助文案；i18n 消费方（宿主）需知道必须显式 initFluxI18n，否则静默中文。
- **修复方向**: playground 入口（`apps/playground/src/main.tsx`）显式 `initFluxI18n({ lng: 'en-US' })`（或随浏览器语言）；flux-i18n 侧可考虑默认随 `navigator.language` 而非固定 zh-CN。
- **归族**: watch-only → 台账（宿主初始化缺失；跨页同根因，R2-3 候选可收编）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- `--popover dark 亮底`（宿主已知问题）：edit-open-dark-1280.png 弹层整面白底——引用不立项，修复后需本卡 H/B5 复检。
- 调试 chip z9998 遮挡：size-full 弹层标题左上被 chip 覆盖（`size-full-open-light-1280.png`），引用不立项。
- 计划内锚点复检通过：H1 尺寸阶梯 xs360/sm480/md560/lg720/xl960/full(100vw−32) 全中（plan490）；堆叠弹层 Esc 仅关顶层（`stackedCount 2 → afterEscStackedCount 1`）；非顶层弹层 outside-press 抑制生效（dialog-host L306）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-dialog` → carded（卡列填本路径）；findings 归族后 → digested。
