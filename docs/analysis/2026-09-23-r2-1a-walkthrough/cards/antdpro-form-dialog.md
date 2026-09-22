# [card] page:antdpro-form-dialog

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-form-dialog` ｜ **载体**: complex-page（antdpro 复刻域；页面本体只是一个页头 + 触发按钮，弹层即页面主体，H1–H9 全查）
- **矩阵裁剪**: full（Sheet/Drawer 本页无 → H2 n/a；本页无拖拽/列表异步）

## 1. 截图清单

| 状态                                         | light                                                                                               | dark                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 默认 1280×800                                | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-dialog/antdpro-form-dialog-default-light.png` | `…/antdpro-form-dialog-default-dark.png`        |
| 默认 800×900                                 | `…/antdpro-form-dialog-default-light-narrow.png`                                                    | `…/antdpro-form-dialog-default-dark-narrow.png` |
| 弹层打开（ModalForm，页面唯一弹层 = 主体验） | `…/antdpro-form-dialog-dialog-open-light.png`                                                       | `…/antdpro-form-dialog-dialog-open-dark.png`    |
| 弹层 800 窄视口（H9）                        | `…/antdpro-form-dialog-dialog-open-narrow-light.png`                                                | —                                               |
| hover / focus-visible                        | 按钮 hover 含于 default；focus 探针 `antdpro-focus-verify.mjs`（border 变蓝）                       | —                                               |
| 拖拽 / loading                               | n/a                                                                                                 | n/a                                             |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔（Tab 真实键盘事件 + 400ms transition 后：输入框 border `rgb(28,110,242)` + ring；`antdpro-focus-verify.mjs`） A3 fail(R2-1a-A3-01 实例：弹层内数字步进钮 24×16) A4 n/a A5 n/a A6 n/a A7 ✔（关闭钮 ✔/遮罩 ✔/焦点落弹层拖拽把手（"使用方向键移动对话框"提示），Esc 可关） A8 n/a A9 n/a（提交流转归 P2b）
- B 颜色：B1 ✔（light 弹层内标签/输入 21:1） B2 ✔ B3 ✔ B4 ✔ B5 **fail(R2-1a-B5-02)**（dark 弹层：标签隐形只剩红星、输入框灰药丸内容不可辨；弹层亮底本身属宿主 `--popover` 覆盖已知项，本卡确认"弹层内的标签翻转"为其叠加放大器） B6 n/a
- C 布局：C1 ✔ C2 ✔ C3 ✔（页面本体简单，弹层即主体） C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（弹层字段行高 58/58/58/58/124 一致、gap-4） D2 ✔ D3 n/a D4 n/a D5 ✔（弹层内 label-控件 8px） D6 n/a D7 ✔ D8 ✔（body pad 16/24）
- E 排布：E1 ✔（页头描述直接告诉用户"点击按钮打开弹窗表单"） E2 ✔（确定 primary/取消 outline） E3 fail(R2-1a-H5-01 实例：取消/确定左下角而非右下主位) E4 ✔（label 与控件 x 成对相等 384/648） E5 ✔ E6 n/a
- F 一致性：F1 ✔（与 antdpro-list 新建订单弹层完全同构） F5 n/a
- G 设计器：n/a
- H 弹层（主查项）：H1 ✔（560px = `--overlay-size-base`） H2 n/a H3 ✔（h=383、maxHeight 768 ≤ 800 视口；余量充足） H4 fail(R2-1a-H4-01 实例：标题 x=376 vs body 384，8px 缩进差) H5 fail(R2-1a-H5-01：footer `justify-content: normal` 左对齐、gap 12px≠8px、按钮 60×32 < 72px min) H6 ✔（2 列栅格 label/input 左缘成对对齐、字段节奏一致） H7 ✔（header/body/footer 三段 padding 与 list 弹层一致，无双层 padding） H8 ✔（body 区 `overflow-y:auto`、header/footer 在滚动容器外固定） H9 ✔（800px 视口 w=560 居中、两侧 120px，无溢出）

## 3. 发现条目

### [R2-1a-H5-01]（本页主实例）ModalForm 弹层 footer 左对齐 + 按钮尺寸低于 anatomy 档

- **页面/路由**: `#/complex-pages/antdpro-form-dialog`（本页即 ModalForm 形态专页；`#/complex-pages/antdpro-list` 新建订单同构同现）
- **主题/视口/状态**: light / 1280×800 / Dialog 打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-dialog/antdpro-form-dialog-dialog-open-light.png`
- **目视描述**: 取消/确定按钮贴弹层左下角，右侧留白 424px；与 AntD Pro / shadcn 弹层"主操作在右下"惯例相反。
- **程序化证据**:
  - 探针: footer 容器 computed + 按钮 rect（`_tmp/r2-1a-probes/antdpro-form-dialog-probe.mjs` → `dialog`）
  - 输出: `footerJustify: "normal"`、`footerGap: "12px"`、取消 x=384 w=60、确定 x=456 w=60、弹层 x=360 w=560（右缘 920）；基准 `--overlay-anatomy-footer-gap: 8px`、`--overlay-anatomy-footer-button-min-width: 72px`
- **对照基准**: styling-system.md「Overlay Size Ladder And Anatomy」/「Dialog / Form Action Button Convention」（actions 右对齐、`[secondary, primary]` 顺序——顺序正确、对齐错误）
- **严重程度**: P1（弹窗表单高频主路径；与 standard-crud 卡同 ID 同根因）
- **用户影响**: 确认落点违反桌面惯例，与项目内 AlertDialog（右对齐 72px 按钮）双标准。
- **修复方向**: form dialog actions 容器补 `flex justify-end gap-2`；按钮 `min-width: var(--overlay-anatomy-footer-button-min-width)`、容器 gap 换 `var(--overlay-anatomy-footer-gap)`。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-B5-02]（弹层实例）dark 下弹层内表单标签隐形

- **页面/路由**: `#/complex-pages/antdpro-form-dialog`
- **主题/视口/状态**: dark / 1280×800 / Dialog 打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-form-dialog/antdpro-form-dialog-dialog-open-dark.png`
- **目视描述**: 弹层亮底（宿主 `--popover` 覆盖已知项）之上，五个字段标签全部隐形，仅"客户名称"红星可见；文本输入框呈灰药丸、占位符近乎不可读。
- **程序化证据**: 弹层 bg `rgb(251,250,249)`（已知项确认）+ label span computed `rgb(248,250,252)`（翻转）+ input bg dark muted（`antdpro-form-dialog-probe.mjs` → `dialogDark`）
- **对照基准**: B5；已知项"宿主 --popover 覆盖"按简报要求只确认不重复立项，但**标签颜色翻转**属 flux 侧叠加缺陷，是 dark 弹层不可读的直接原因之一
- **严重程度**: P1 ｜ **用户影响**: dark 用户在弹窗表单内只能靠占位符猜字段。｜ **修复方向**: 同 R2-1a-B5-02 主修复
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-H4-01]（本页实例）弹层标题左缩进 8px

- **程序化证据**: `title.x=376`（header pad 16px）vs 首 label `x=384`（body pad-x 24px）
- **截图**: `…/antdpro-form-dialog-dialog-open-light.png` ｜ **严重程度**: P3
- **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                 | 排除理由                                                                                                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 弹层顶部出现一条蓝色横线疑"边框异常" | 为弹层打开后焦点落于拖拽把手（`cursor-grab` header，activeCls 探针证实）绘制的 focus-visible 环，被弹层圆角裁剪仅顶边可见；A7 焦点落点正确的伴生现象，非缺陷（P3 观感项，watch-only 不单独立项） |
| 首次 focus 探针"边框无变化"          | 150ms transition 未等待所致；`antdpro-focus-verify.mjs` 等 400ms 后 border/ring 均出现                                                                                                           |
| `input x=359` 越过弹层 body 内边距   | opacity-0 原生 select 叠放层（注册误报白名单），不可见不交互                                                                                                                                     |
| 800 窄视口弹层未变窄                 | 560px 弹层在 800 视口本就无需收缩（`max-w-[calc(100%-2rem)]` 为更窄断点回退），非缺陷                                                                                                            |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：H5-01/B5-02/H4-01/A3-01 → R2-3 系统性批；批内复检通过后 → `verified`。
