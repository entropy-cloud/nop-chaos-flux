# [card] page:ai-attachments

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-attachments` ｜ **载体**: 域页面（flux-renderers-ai P2 demo：ai-attachments 内嵌 ai-chat beforeMessages，image/card 预览 + 拖放/粘贴 + maxSize/maxFiles 校验）
- **矩阵裁剪**: simplified（matrixReason：控件 demo 页，无 Dialog/Sheet → H n/a；无拖拽排序（拖放仅为文件入列）→ A6 按 drop-surface 反馈专项核查；粘贴态未采（headless clipboard files 注入受限），以拖放探针等价覆盖）
- 本页实际裁掉的状态：paste 注入、card 模式预览（demo 固定 auto→image 模式）、~375 移动档、glass 皮肤

## 1. 截图清单

| 状态                             | light                                                                                                       | dark                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| 默认 1280×800                    | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-attachments/default-light.png`                                  | —                          |
| 默认 ~800 宽                     | `default-narrow-light.png`                                                                                  | `default-narrow-dark.png`  |
| 选中后预览（thumb + 发送钮出现） | `picked-light.png`（注：首拍测试 PNG 为白色图不可见，复拍 `thumb-red-light.png` 证实 80×80 缩略图正常渲染） | `picked-dark.png`          |
| 超限拒绝（maxSize 5MB）          | `oversize-reject-light.png`（红色 “文件过大”）                                                              | `oversize-reject-dark.png` |
| maxFiles=4 满                    | `maxfiles-light.png`                                                                                        | —                          |
| 移除后                           | `after-remove-light.png`                                                                                    | —                          |
| widget 发送后（含图气泡）        | `ab-widget-path-light.png`、`chat-send-with-1img-light.png`                                                 | —                          |
| chat sender 发送后（图被丢）     | `sent-with-image-light.png`                                                                                 | —                          |
| dragover 中                      | `dragover-light.png`（与默认帧无差异，见 A6-01）                                                            | —                          |

## 2. A–H 维度勾选表

- A 交互：A1 pass（移除钮 hover/focus 出现，`opacity-0 group-hover:opacity-100 focus-visible:opacity-100`）A2 pass A3 **已知族**（移除钮 20×20 <24px → 并入 R2-1a A3 小目标族，不另立项）A4 pass（发送钮 disabled 逻辑正确）A5 pass（“文件过大” 即时可见）A6 **fail(R2-1d-A6-01)** A7 n/a A8 pass（拖放入列有点击“添加附件”等价替代）A9 **fail(R2-1d-A9-01)**
- B 颜色：B1 pass B2 pass B3 pass（拒绝文案 destructive 红）B4 pass B5 pass（dark 复拍无异常）B6 pass
- C 布局：C1 pass（overflow 扫描 light/dark/narrow 均空）C2 fail→**R2-1d-C2-01**（跨页已知，见 ai-chat 卡）C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a D7 warn→**R2-1d-D7-01**（sender 通用，见 ai-chat 卡）D8 pass
- E 排布：E1 pass（“添加附件/发送 → 消息流” 动线可答）E2 pass E3 pass E4 pass E5 pass E6 pass
- F 一致性：F1 pass F2 n/a F3 pass F4 fail→**R2-1d-F4-01**（见 ai-chat 卡；本页另见发现 A9-01 内“两个发送钮”问题）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A9-01] 附件组合发送断裂：sender 路径静默丢图，widget 路径丢文字

- **页面/路由**: `#/ai-attachments`（placeholder 明示 "Attach an image below, then send…"，页头宣传 "image_url send"）
- **主题/视口/状态**: light / 1280×800 / 附图 + 输入文字后分别经两条路径发送
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-attachments/sent-with-image-light.png`（sender 路径：纯文字气泡）、`ab-widget-path-light.png`（widget 路径：纯图无文字气泡）
- **目视描述**: 先添加图片再在输入框打字、点聊天自己的“发送”→ 用户气泡只有文字，图片消失且无任何提示；改点附件区的“发送”→ 气泡只有图片，输入框文字被丢。两条路径都无法产出“文字+图”单条消息。
- **程序化证据**:
  - 探针: A/B 两路径发送后扫描 `[data-slot="ai-bubble"]` 的 img/textContent
  - 输出: A（sender 提交）`hasImg:false, text:'XSENTX via sender'`；B（widget 发送钮）`text:'', imgCount:2`；源码核实 ai-sender/ai-chat 不读附件状态，仅 `ai-attachments.tsx handleUpload()`（L208-221）自行 `ctx.sendMessage(buildImageContentParts(...))`。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；检查提示词 E1（页面承诺的主任务可完成）；renderers.md §9.1 multimodal 组装契约。
- **严重程度**: P2（主路径静默丢用户数据；widget 路径可绕达纯图发送）
- **用户影响**: 演示页宣传的多模态流在最后一步断裂；用户附图发送后图“消失”，误以为上传失败。
- **修复方向**: ai-sender 提交前合并 chat context 内 staged attachments（text + image_url parts 一次 sendMessage）；合并前先给 `ai-attachments` 增加被丢弃时的 alert/toast。demo schema 亦可显式接 `onUpload` 自行组装。
- **归族**: systemic → R2-3 批（ai-sender × ai-attachments 跨渲染器集成契约，非单页问题）
- **复核状态**: 未复核

### [R2-1d-A6-01] 拖放面无任何 drop-target 视觉反馈

- **页面/路由**: `#/ai-attachments`（enableDrop=true 的拖放入列面）
- **主题/视口/状态**: light / 1280×800 / 文件拖入悬停中
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-attachments/dragover-light.png`（与 default 帧无肉眼差异）
- **目视描述**: 文件拖到附件区上空时区域无高亮/虚线框/文案变化，与静止态完全一致，用户无从判断可松手。
- **程序化证据**:
  - 探针: dispatch dragenter/dragover（DataTransfer 携带 File）后读根节点 `data-dragging` + 全仓 CSS 扫描
  - 输出: 渲染态 `data-dragging` 由 state 驱动（ai-attachments.tsx L243），但**全仓无任何 `[data-dragging]` CSS 规则、组件也无条件类名**——即便 state 翻转，视觉也不会变化（合成事件未翻转 state 属探针局限，CSS 缺失是决定性证据）。
- **对照基准**: NN/g 拖放 UX（落位必须有清晰 drop-target 反馈）；检查提示词 A6；styling-system.md（widget 渲染器应自带完整视觉设计）。
- **严重程度**: P2（宣传的 drag-drop 能力无可感知反馈）
- **用户影响**: 拖拽悬停时不敢松手/不知可松手；拖放功能等于隐藏功能。
- **修复方向**: 在 ai-attachments 根节点补 `data-[dragging]:ring-2 data-[dragging]:ring-primary/40 data-[dragging]:bg-muted/50` 一类条件类（或在 flux-renderers-ai styles.css 加 `[data-slot='ai-attachments'][data-dragging]` 规则）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### 附：误报排除与已知族归并记录

- 首拍 `picked-light.png` 缩略图“不可见”：复拍（红色测试 PNG + rect/naturalWidth 探针）证实 80×80 blob 缩略图正常渲染，系白色测试图叠白底 —— 不立项。
- 移除钮 20×20 <24px（dark targets 扫描 4 处命中）：并入 R2-1a 已裁定 **A3 小目标族**，不另立项。
- maxFiles=4 恰好收满 4 个（无拒绝文案）属边界正确行为，非缺陷。
- 顶部“发送”（widget 上传语义）与底部“发送”（聊天发送语义）同屏同标签：并入 **R2-1d-F4-01** 修复时一并消歧（如 widget 钮改“上传”）。

## 4. 台账回写

- 本卡完成后由汇总 agent 统一回写 ledger。
