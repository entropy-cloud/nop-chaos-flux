# [card] page:ai-component-handle

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-component-handle` ｜ **载体**: 域页面（flux-renderers-ai P2 demo：ai-chat 注册 Layer C ComponentHandle，外部按钮 `component:sendMessage` 跨组件驱动）
- **矩阵裁剪**: simplified（matrixReason：单交互 demo，唯一中间态为外部按钮触发的流式过程（已截帧）；无弹层/拖拽/独立异步面；~375 档未跑）
- 本页实际裁掉的状态：glass 皮肤、componentId 冲突/缺失等异常分支（属 e2e 覆盖页职责）、~375 移动档

## 1. 截图清单

| 状态                                           | light                                                                           | dark                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- |
| 默认 1280×800                                  | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-component-handle/default-light.png` | —                         |
| 外部按钮发送 → 流式中（data-state=processing） | `external-send-mid-light.png`                                                   | —                         |
| 流式完成（data-state=completed）               | `external-send-completed-light.png`                                             | `completed-dark.png`      |
| 默认 ~800 宽                                   | `default-narrow-light.png`                                                      | `default-narrow-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（外部按钮 hover/active 正常，shadcn Button 族）A2 pass（Tab 可达按钮与 textarea，focus ring 可见）A3 pass（最小目标 28px）A4 pass（流式中 submit disabled 已核实，state=processing）A5 pass（流式光标可见）A6 n/a A7 n/a A8 pass（外部按钮本身就是输入框之外的替代通道——本页主题）A9 pass（点击 → 立即出用户气泡 + processing 态 + 完成回显，链路反馈完整；双击连发产生 2 轮 4 气泡，无丢帧）
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass（dark 复拍无异常）B6 pass
- C 布局：C1 pass（overflow 扫描 light/dark/narrow 均空）C2 fail→**R2-1d-C2-01**（跨页已知，见 ai-chat 卡）C3 pass（标题行 + chat 主体 flex-1）C4 pass（800px 下不塌）C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a D7 warn→**R2-1d-D7-01**（sender 通用，见 ai-chat 卡）D8 pass
- E 排布：E1 pass（标题 + 右侧外部按钮即页面主操作，3 秒可答）E2 pass（外部按钮 primary 蓝为主操作）E3 pass E4 pass E5 pass E6 pass（placeholder 引导明确："Type, or click the external button above…"）
- F 一致性：F1 pass F2 n/a F3 pass F4 fail→**R2-1d-F4-01**（跨页已知：发送钮中文）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

本页无独立新发现。跨页已知项引用：R2-1d-C2-01（debugger 悬浮球压 Back）、R2-1d-D7-01（发送钮 0px 贴 textarea）、R2-1d-F4-01（控件中文文案）。

[visual-only] 观察（不影响判级）：外部按钮连点两次产生两轮独立问答（4 气泡），引擎无节流——与 ai-chat 主路径行为一致，属产品语义而非视觉缺陷，不立项。

## 4. 台账回写

- 本卡完成后由汇总 agent 统一回写 ledger。
