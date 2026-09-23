# [card] page:ai-virtual-scroll

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-virtual-scroll` ｜ **载体**: 域页面（A-8：1000 条种子消息触发 ai-message-list 窗口化虚拟滚动，@tanstack/react-virtual）
- **矩阵裁剪**: simplified（matrixReason：单聊天面板 perf demo，无弹层/拖拽 → H n/a、A6/A8 n/a；briefing 指定“滚动中间态行渲染正确性 D3、滚动条 C5”均未裁剪且为程序化取证重点；glass 统一裁剪；窄视口 800px 一档）
- 本页实际裁掉的状态：滚动惯性逐帧动画（以 80ms 抓帧代替）、glass 皮肤、375 移动档、发送新消息后窗口重组（种子数据 demo 为主）

## 1. 截图清单

| 状态                              | light                                                                                                                 | dark                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 默认 1280×800（初始=底部）        | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-virtual-scroll/ai-virtual-scroll-top-light.png`（命名 top，实际初始视图） | `…/ai-virtual-scroll-default-1280-dark.png` |
| 默认 800×900                      | `…/ai-virtual-scroll-default-800-light.png`                                                                           | `…/ai-virtual-scroll-default-800-dark.png`  |
| 滚动至列表中部（scrollTop≈59.5k） | `…/ai-virtual-scroll-mid-scroll-light.png`                                                                            | `…/ai-virtual-scroll-mid-scroll-dark.png`   |
| 滚动至底部                        | `…/ai-virtual-scroll-bottom-light.png`                                                                                | —                                           |
| 快速甩动后 80ms 抓帧              | `…/ai-virtual-scroll-fast-flick-80ms-light.png`                                                                       | —                                           |
| 中部滚动 800 宽                   | `…/ai-virtual-scroll-mid-scroll-800-light.png`                                                                        | —                                           |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（同族证据）A3 pass（发送钮/输入框达标）A4 pass（发送 disabled 核实）A5 n/a A6 n/a A7 n/a A8 n/a A9 pass（scroll-to-bottom FAB 出现/消失跟随滚动位置）
- B 颜色：B1 warn(R2-1d-B1-01 systemic) B2 pass B3 pass B4 pass B5 pass（dark 中部滚动态复检，气泡/背景全令牌化）B6 pass
- C 布局：C1 pass C2 warn(R2-1d-C2-01 shell 浮件；另 scroll-to-bottom FAB 悬浮压住气泡文字属标准聊天 FAB 惯例，白底+阴影可辨，不立案) C3 pass（70vh 面板下方留白为 demo 布局选择，P3 观察不立案）C4 pass（800 宽窗口渲染正常）**C5 pass**（程序化：全页仅 `.nop-ai-message-list` 一个纵向滚动容器，无双滚动条；overlay 滚动条 barW=0 为 macOS 环境特性）
- D 间隔：**D3 pass**（程序化：中部窗口 17 行行高 88.8–94.8px，无离群行；行内含操作行为有意密度）D1 pass D2 pass D4 pass D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 pass
- F 一致性：F1–F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（本页无发现。briefing 指定专项核验记录：）

**滚动中间态行渲染正确性（D3/C5 专项，程序化取证全通过）**：

- 窗口化：1000 条种子消息初始仅挂载 **11** 个气泡（#990–#1000，初始定位底部=聊天惯例）；中部滚动挂载 **17** 行（#495–#511）。
- 序列正确性：可见行编号单调递增（seqMonotonic=true），无跳变/重复。
- 几何正确性：行间重叠 0、行内空白累计 0px；快速甩动后 80ms 抓帧 visibleRows=5、blankGapPx=0（无白窗/空白窗口期）；稳定后复测同结果。
- C5：滚动容器唯一（`nop-ai-message-list` sh=118432/ch=387），无双滚动条。
- 对照基准：检查提示词 D3（行高离群）、C5（滚动容器计数）、A-8 验收口径（挂载远小于 1000）。

## 4. 误报排除记录

- scroll-to-bottom FAB（`data-slot="ai-scroll-to-bottom"`）悬浮遮住气泡尾部文字：标准聊天 FAB 模式（Intercom/Teams 同款），白底圆钮+阴影可辨识，不按 C2 报。
- 初始截图命名 `top-light` 实为“初始视图”（自动定位于底部）：命名瑕疵，非缺陷。
- 一行消息行高 ~89–95px 偏大：行内含复制操作行 + 气泡内边距，行高一致无离群，不按 D3 报。

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；无 findings 需归族。
