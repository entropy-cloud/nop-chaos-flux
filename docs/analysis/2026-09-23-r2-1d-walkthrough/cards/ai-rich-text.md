# [card] page:ai-rich-text

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-rich-text` ｜ **载体**: 域页面（P6/A6：Tiptap senderExtensions——template bar / @mention popup / slash popup / 纯文本序列化发送）
- **矩阵裁剪**: simplified（matrixReason：控件 demo 页，无 Dialog/Sheet/拖拽 → H 以 typing 型 SuggestionPopup 抽查、A6/A8 n/a；briefing 指定“工具栏态/选区态”均未裁剪（template bar 常驻 + ::selection 取证）；glass 统一裁剪；窄视口 800px 一档）
- 本页实际裁掉的状态：slash 命令 “clear” 执行链路（action 为 no-op demo）、弹层键盘导航全序列（ArrowDown 已验一帧）、glass 皮肤、375 移动档

## 1. 截图清单

| 状态                            | light                                                                                      | dark                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-rich-text/ai-rich-text-default-1280-light.png` | `…/ai-rich-text-default-1280-dark.png`                                           |
| 默认 800×900                    | `…/ai-rich-text-default-800-light.png`                                                     | `…/ai-rich-text-default-800-dark.png`                                            |
| 编辑器 focus（模板栏=工具栏态） | `…/ai-rich-text-editor-focused-light.png`                                                  | —                                                                                |
| @mention popup（输入 “@al”）    | `…/ai-rich-text-mention-popup-light.png`                                                   | `…/ai-rich-text-mention-popup-dark.png` + `popup-element-dark.png`（元素级特写） |
| mention 高亮项移动（ArrowDown） | `…/ai-rich-text-mention-active-moved-light.png`                                            | —                                                                                |
| slash popup（输入 “/”）         | `…/ai-rich-text-slash-popup-light.png`                                                     | —（dark bg-popover 亮底已知族，元素级证据见 dark mention）                       |
| 选区态（全选编辑器文本）        | `…/ai-rich-text-selection-state-light.png`                                                 | —（light 已坐实高亮可见）                                                        |
| 模板插入（点 Greeting）         | `…/ai-rich-text-template-inserted-light.png`                                               | —                                                                                |
| 发送后（纯文本序列化+回显气泡） | `…/ai-rich-text-sent-bubble-light.png`                                                     | —（dark 回显见 mention-popup-dark 顶部）                                         |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（编辑器/按钮 Tab focus 环可见）A3 pass（模板按钮 28px 高；popup 项 28px）A4 pass（发送 disabled opacity .5 核实）A5 n/a A6 n/a A7 **fail(R2-1d-A7-01)**（popup 打开态遮压发送钮且按钮弧线穿帮）A8 n/a A9 pass（模板插入/mention 插入/发送清空编辑器/回显气泡全断言通过）
- B 颜色：B1 warn(R2-1d-B1-01 systemic) B2 pass B3 pass B4 pass B5 pass（页面本体 dark 平价 OK；popup 亮底 = 宿主 --popover 已知族，本页以元素级特写坐实其“容器亮底+active 项暗底”混合态，归已知族不另立）B6 pass
- C 布局：C1 pass C2 warn(R2-1d-C2-01 shell 浮件) C3 pass C4 pass（800 宽面板自适应）C5 pass C6 n/a
- D 间隔：D1 pass（模板栏 gap-1、popup 项距一致）D2–D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 pass（placeholder 引导明确）
- F 一致性：F1 pass F2 pass F3 pass F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a（无 Dialog/Sheet/Drawer；SuggestionPopup 为锚定浮层：宽度 w-full 随 wrapper、项高 28 一致、Esc/点外可关——A7 穿穿帮项见发现）

## 3. 发现条目

### [R2-1d-A7-01] mention/slash popup 遮压发送按钮，按钮圆角弧线从 popup 顶边穿出

- **页面/路由**: `#/ai-rich-text`（输入 `@`/`/` 触发 SuggestionPopup 时）
- **主题/视口/状态**: light+dark / 1280×800 / popup 打开态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-rich-text/ai-rich-text-mention-popup-light.png`（popup 右上角蓝色弧形穿帮）、`…/ai-rich-text-slash-popup-light.png`（同）
- **目视描述**: popup（`w-full`、`z-50`、`mt-1`）向下展开时正好盖住 sender 操作行的发送按钮，按钮顶部圆弧从 popup 上边缘右侧露出，形似渲染残渣；popup 关闭后消失。
- **程序化证据**: 探针: popup rect 与 `[data-slot="ai-sender-submit"]` rect 求交 + z-index 读取；输出: 相交（popup 覆盖按钮行整体），popup z-50 压按钮；露出部分为按钮超出 popup 顶边的圆角区。
- **对照基准**: 检查提示词 A7（弹层打开态基本完整性）/ H 浮层质量（覆盖物不得产生视觉穿帮）；NN/g 浮层不应与被遮挡控件产生半遮半露的歧义轮廓。
- **严重程度**: P3（不阻塞输入，但每次唤起 popup 都可见，高频路径）
- **用户影响**: 看似 UI 破损/误渲染，降低对组件质量的信任。
- **修复方向**: `packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx` 的 SuggestionPopup 容器：popup 打开期间对 sender-actions 行加透明化（`data-popup-open` + opacity-0）或让 popup 自身加不透明背景+完整覆盖（`bg-popover` 已有不透明——穿帮源于按钮在 popup 矩形之外的高度差，改为 popup 覆盖整个 wrapper 高度或下移锚点）。
- **归族**: local → R2-4 批（rich-text sender 专属锚定逻辑）
- **复核状态**: 未复核

## 4. 误报排除记录

- **已提交 mention 渲染为纯文本（无 pill 高亮）**：`extensions/mention.ts` 明文注释 “inserts `@label ` as plain text（engine contract only accepts plain strings）”——有意设计，不报。
- **选区态 ::selection computed 背景 transparent**：截图证实选区有可见浅蓝高亮（UA 默认高亮未被覆盖），computed 读数为假阴性，不报。
- **focus computed outline/box-shadow 读数透明**：clip 截图证实 focus 环实际可见（Tailwind v4 ring 绘制路径与 computed 读数不符），A2 不报。
- dark popup “容器亮底”：宿主 `--popover` 已知族（briefing 已知事实），元素级特写仅作影响面确认。

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；A7-01 归族 R2-4 后 → `digested`。
