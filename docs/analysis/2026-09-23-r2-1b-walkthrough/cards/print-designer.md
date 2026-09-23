# [card] page:print-designer

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/print-designer` ｜ **载体**: 域页面（PrintDesigner 壳：print-toolbar + PrintPalette w-32 + PrintDesignerCanvas 纸张画布 + PrintInspector w-64 + PrintPreview Dialog；demo 顶栏 A4 出库单/80mm 小票切换 + 打印/导出 PDF）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查；H9 未在 800 视口复开弹层；80mm 模板未重复走查全部 G 子项——只截双主题帧验证纸张切换，G1–G7 以 A4 模板取证）

## 1. 截图清单（状态矩阵）

| 状态                             | light                                                                                          | dark                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 默认 1280×800                    | `_tmp/visual-inspection-2026-09-23/r2-1b/print-designer/print-designer-default-wide-light.png` | `…/print-designer-default-wide-dark.png`     |
| 默认 800×900                     | `…/print-designer-default-narrow-light.png`                                                    | `…/print-designer-default-narrow-dark.png`   |
| 选中元素（选中框+8 手柄+旋转柄） | `…/print-designer-element-selected-light.png`                                                  | `…/print-designer-element-selected-dark.png` |
| 拖拽进行中（元素跟手中段帧）     | `…/print-designer-drag-mid-light.png`                                                          | —                                            |
| 拖后/undo 后                     | `…/print-designer-after-move-light.png`、`…/print-designer-after-undo-light.png`               | —                                            |
| 缩放 80% 选中态                  | `…/print-designer-zoomed-selected-light.png`                                                   | —                                            |
| inspector 双向写入               | `…/print-designer-inspector-edit-light.png`                                                    | —                                            |
| 弹层打开（预览 Dialog，长内容）  | `…/print-designer-preview-dialog-light.png`                                                    | `…/print-designer-preview-dialog-dark.png`   |
| 80mm 小票模板                    | `…/print-designer-receipt-80mm-light.png`                                                      | `…/print-designer-receipt-80mm-dark.png`     |
| disabled                         | 初始 撤销/重做 置灰（见默认帧；代码 `disabled={!state.canUndo}`）                              | —                                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（元素 hover cursor:move 常驻、按钮 hover tint） A2 ✔（ui Button focus-visible ring 类） A3 ✔（工具栏按钮 ≥28px；8 个 resize 手柄 6–7.5px<24 但 inspector 提供数值输入等价路径，WCAG 2.5.8 例外条款成立） A4 ✔（初始 undo/redo disabled 置灰） A5 n/a A6 ✔（拖拽元素零偏移跟手；palette 拖入新增元素 5→6 实测） A7 ✔（预览弹层：遮罩/header 关闭钮/footer 关闭钮/焦点完整） A8 ✔（inspector X/Y/宽/高/旋转 数值输入=拖拽的单指针等价物） A9 ✔（校验按钮 errorCount 徽标、导出/打印有状态行输出）
- B 颜色：B1 ✔（light 纸面墨色 rgb(33,53,71) on 白 ≈12:1） B2 ✔（选中框 --primary） B3 ✔ B4 ✔（选中/手柄走 --primary/--background 令牌） B5 **fail(R2-1b-G8-01)**（dark 纸面墨色翻转不可读 + 标尺刻度洗白；周边 chrome dark 正常） B6 ✔
- C 布局：C1 ✔（1280 无意外溢出；html sh=1304 系 C5 项） C2 **fail(R2-1b-C2-01)**（悬浮 Home 胶囊遮压"A4 出库单"切换按钮） C3 ✔（工具栏/palette/画布/inspector 四区清晰） C4 ✔（800 视口画布区内部滚动正常，palette/inspector 收窄不塌） C5 **warn(R2-1b-C5-01)**（画布区高度不受限，内部 overflow-auto 不生效，整页滚动替代） C6 ✔（纸张画布按 mm×zoom 精确渲染，A4=794×1123@100%、80mm=302×454）
- D 间隔：D1 ✔ D2 ✔ D3 ✔ D4 ✔（工具栏 gap/分隔符统一） D5 n/a D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔（纸面画布+左侧元素面板+右侧属性 3 秒可答） E2 ✔（校验=outline/预览=outline、破坏态 destructive 语义） E3 ✔ E4 ✔（inspector label w-24 + 控件列对齐一致） E5 ✔ E6 ✔（inspector 空选中态有"未选中元素，点击画布中的元素进行编辑"引导）
- F 一致性：F1 ✔（undo/redo/缩放/预览语义与其它设计器一致） F2 ✔（palette w-32 / inspector w-64 落侧栏宽度档） F3 ✔ F4 ✔（全中文术语一致） F5 n/a
- G 设计器：G1 ✔ G2 ✔ G3 **warn(R2-1b-G3-01)**（吸附静默无参考线） G4 ✔ G5 ✔ G6 ✔ G7 ✔ G8 **fail(R2-1b-G8-01)**
- H 弹层：H1 ✔（960=lg 档） H2 n/a H3 ✔（544 ≤ 800−8） H4 ✔（header 标题"打印预览/页码"+右上 X，无重叠） H5 ✔（footer 右对齐单"关闭"钮） H6 n/a H7 ✔ H8 ✔（长内容在 body 区内部滚动，header/footer 固定；截图见裁切行在边界） H9 未复测（裁剪）

## 3. 发现条目

### [R2-1b-G8-01] dark 模式纸张保持白底（豁免项）但纸面元素墨色跟着主题翻成浅色，画布内容整体不可读

- **页面/路由**: `#/print-designer`（画布内全部元素：文本/表格/页码等；80mm 模板同现）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/print-designer/print-designer-default-wide-dark.png`（"出库单"、`${orderNo}`、表头全部浅灰白 on 白纸，40 行数据"消失"）、对照 `…/print-designer-default-wide-light.png`；`…/print-designer-receipt-80mm-dark.png`
- **目视描述**: dark 下纸张仍为白色（纸面语义，V8a 裁决豁免不报），但纸上的文字/表格线翻成极浅灰白，肉眼几乎不可见，模板内容像被清空。
- **程序化证据**:
  - 探针: `[data-element-id="title"]` computed color 双主题采样 + WCAG 对比度（`print-designer-followup.json` → inkLight/inkDark；`print-designer-out.json` → scanDark.ruler-tick）
  - 输出: light 墨色 `rgb(33,53,71)`（on 白 12:1）→ dark 墨色 `rgb(230,236,243)`（on 白纸 **1.19:1**，阈值 4.5:1）；标尺刻度 `rgb(175,189,207)` on 浅灰标尺带 ≈1.1:1 同步洗白；纸张 `backgroundColor` 恒 `rgb(255,255,255)`（豁免成立的部分）
- **对照基准**: 检查提示词 G8（画布内文字双主题可读；纸面语义色恒定须有 design.md 依据——恒白有依据，**恒白纸+浅墨**无依据）/B5（dark 专有缺陷：不可读字）；V8a 裁决范围仅覆盖"纸面 dark 恒白"，不覆盖墨色翻转
- **严重程度**: P1（dark 下画布关键信息整体不可读、40 行表格数据视觉消失，命中"关键信息不可读"判据）
- **用户影响**: dark 主题用户无法辨认所设计的打印模板内容，编辑等于盲操作。
- **修复方向**: 纸面元素渲染器（flux-print-renderers 元素 renderer 与画布内联样式）的墨色不消费主题前景令牌，钉为纸面常量（如 `#213547`/`#1a1a1a`）或引入 `--nop-print-ink` 纸面域令牌（不随 data-mode 翻转）；标尺刻度/标尺带同法钉纸面常量。周边工具栏/palette/inspector 已正确翻 dark，无需改动。
- **归族**: local → R2-4 批（print 纸面域令牌缺失；word-editor 等其它纸面页建议 R2-3 批排查同模式）
- **复核状态**: 未复核

### [R2-1b-C2-01] 悬浮 Home 胶囊遮压"A4 出库单"模板切换按钮，命中测试被劫持

- **页面/路由**: `#/print-designer`（demo 顶栏左上）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/print-designer/print-designer-default-wide-light.png`、`…/print-designer-default-wide-dark.png`（左上角胶囊压住首按钮）
- **目视描述**: playground 悬浮"选 0 / Home"导航胶囊叠在 demo 第一个模板切换按钮上，按钮文字被遮半截。
- **程序化证据**:
  - 探针: 首按钮几何 + `elementFromPoint` 命中测试（`print-designer-followup.json` → overlap）
  - 输出: 首按钮 rect `{x:16, y:16, w:79.6, h:28}`，中心点命中 `BUTTON text="0"`（Home 胶囊内元素），`covered: true`——点按钮中心实际点到胶囊
- **对照基准**: 检查提示词 C2（无意外重叠：绝对定位元素压操作）；R2-1a-C2-01 为右下角主题切换器悬浮的同族宿主遮压记录（不同角落，本条为独立新位）
- **严重程度**: P2（真实控件被遮 + 误触劫持；点击首按钮中心会跳回 Home）
- **用户影响**: 用户想切回 A4 模板时可能误触 Home 离开页面；按钮文字不可完整阅读。
- **修复方向**: print demo 页根容器加顶部让位 padding（如 `pt-14`）或把 demo 顶栏下移；playground 悬浮胶囊统一让位策略后回收 R2-1a-C2-01。
- **归族**: local → R2-4 批（playground 宿主悬浮件与 demo 页让位基线）
- **复核状态**: 未复核

### [R2-1b-G3-01] 元素拖拽支持网格/元素吸附但全程无吸附参考线，落位反馈静默

- **页面/路由**: `#/print-designer`（画布内元素 move/resize/palette 拖入）
- **主题/视口/状态**: light / 1280×800 / 拖拽进行中与落位后
- **截图**: `…/print-designer-drag-mid-light.png`（拖拽中无任何参考线/drop indicator）、`…/print-designer-after-move-light.png`
- **目视描述**: 拖动元素时只有元素本身跟手，接近网格线/其它元素边线时无参考线出现，吸附是否发生不可感知。
- **程序化证据**:
  - 探针: `page.mouse` 序列拖拽 + 中段/落位 rect 采样 + 参考线 DOM 检索（`print-designer-out.json` → g3）
  - 输出: 跟手精确（start x=224.69 → +20px → +41px 后 265.69，偏移 0px）；`hasGuideElement: false`（拖拽全程无 `[class*=snap]/[class*=guide]` 类元素）；吸附逻辑存在于 `computeSnap`（canvas-math.ts，阈值 3px）但纯数值生效
- **对照基准**: 检查提示词 G3（吸附/对齐参考线出现 <100ms 且坐标精确——"出现"前提缺失）；NN/g 拖放指南（吸附辅助线要"出现得及时、消失得干脆"）
- **严重程度**: P3（吸附功能本身有效、无数据错误；缺的是可视反馈，对齐精度依赖用户心算）
- **用户影响**: 用户无法预知元素将吸附到哪条线，精排版全靠放大检查。
- **修复方向**: 拖拽 move/resize 时按 `computeSnap` 返回的吸附轴渲染临时参考线元素（1px `--primary` 线，`pointer-events:none`），pointerup 即移除；palette 拖入同理。
- **归族**: local → R2-4 批（print 画布拖拽反馈）
- **复核状态**: 未复核

### [R2-1b-C5-01] 画布区高度不受视口约束：A4 满页时内部滚动失效、整页滚动替代，工具栏/palette 随页滚走

- **页面/路由**: `#/print-designer`
- **主题/视口/状态**: light+dark / 1280×800 / 默认 A4 模板
- **截图**: `…/print-designer-default-wide-light.png`（纸张下缘越出视口，需页面滚动）
- **程序化证据**:
  - 探针: html scrollHeight vs clientHeight + 画布 region 滚动属性采样（`print-designer-out.json` → scanLight.overflow / c6）
  - 输出: `html sh=1304 ch=800`（整页可滚 504px）；A4 纸张 794×1123 直接撑高 `.flex` 行——设计器根 `.flex` 行仅有 `minHeight:320` 无高度上限，`flex-1 overflow-auto` 画布区从不产生内部滚动（receipt 80mm 时 region `scrollH=529=ch` 亦证内部滚动未启用）
- **对照基准**: 检查提示词 C5（sticky/固定元素不遮内容、不产生双滚动条——本例反向：该内部滚动的容器不滚）；设计器画布惯例（Figma/dingflow 画布区独立滚动，chrome 常驻）
- **严重程度**: P3（功能可达但编辑 A4 长页时工具栏滚出视野，反复上下滚动）
- **用户影响**: 对纸张下半部元素操作时找不到工具栏/inspector，需来回滚动。
- **修复方向**: PrintDesigner 壳给 `.flex` 行设 `height: calc(100vh - toolbar)` 或 demo 层约束 PrintDesigner 高度，让 `[role="region"]` 画布区真正启用 overflow-auto 内滚。
- **归族**: local → R2-4 批（print 壳高度约束）
- **复核状态**: 未复核

### watch-only（不立项）

- 画布表格元素仅渲染 `data-print-role="table-skeleton"` 骨架（表头+单空行），40 条 testData 不上画布——预览弹层内数据完整（货物-1..9/¥ 格式化/合计可见），画布=结构骨架为有意设计，误报排除。
- 预览弹层顶部 X（视觉隐藏文本"关闭"）+ footer"关闭"双关闭钮共存，属惯例布局非冗余缺陷。
- 缩放输入框 `sw=61 cw=54` 7px 内容溢出——值居中显示未见裁字（screenshot 复核），不立项。
- 预览弹层 dark 下 `rgb(251,250,249)` 亮底 = 宿主 --popover 已知项，本卡确认影响面（960 预览弹层命中），不另立项。

## 4. 误报排除记录

| 疑点                      | 排除理由                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------- |
| 纸张 dark 恒白            | V8a 已裁决纸面语义恒白，不报（本卡报的是墨色翻转，见 G8-01）                        |
| dark 截图"表格数据消失"   | 即 G8-01 墨色翻转本体，非数据缺失（preview 弹层同数据完整渲染可证）                 |
| resize 手柄 <24px         | WCAG 2.5.8 例外：inspector 数值输入提供同效单指针路径（A8 ✔），设计器惯例手柄小而准 |
| 80mm 视图 C6 纸张宽高失配 | 302×454 = 80×120mm × 3.78px/mm 精确换算，非拉伸                                     |
| 拖拽"ghost 不跟手"嫌疑    | move 模式即元素本体跟手（rect 序列偏移 0px），无 ghost 元素属该设计器交互模型       |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：G8-01/C2-01/C5-01/G3-01 → R2-4 local 批（G8-01 建议同步排查其它纸面域页面）；
- 批内复检通过后 → `verified`。
