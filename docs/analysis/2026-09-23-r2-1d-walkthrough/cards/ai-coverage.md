# [card] page:ai-coverage

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-coverage` ｜ **载体**: 域页面（gantt/ai e2e 覆盖页：slow/flaky/eof/mock 确定性连接器 + 气泡内容画廊 + sender 模式 + 全部 widget 边缘态 + tool-call 状态族 + 会话静态列）
- **矩阵裁剪**: simplified（matrixReason：本页本身即“状态矩阵页”，以整页 fullPage 双主题 + 定向中间态截帧覆盖；顶部探针种子文本（COMPLETE: 等空值行）为 e2e 断言桩，属页面设计，不计视觉缺陷；~375 档未跑）
- 本页实际裁掉的状态：voice 输入真实录音态（Web Speech 不可 headless）、glass 皮肤、~375 移动档

## 1. 截图清单

| 状态                                                     | light                                                                        | dark                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| 整页 fullPage 1280                                       | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-coverage/default-light-full.png` | `default-dark-full.png`        |
| 整页 fullPage ~800                                       | `default-narrow-light-full.png`                                              | `default-narrow-dark-full.png` |
| slow 聊天流式中（processing + 停止钮 + submit disabled） | `slow-processing-light.png`                                                  | —                              |
| slow 聊天完成后                                          | `slow-completed-light.png`                                                   | —                              |
| flaky 首呼 500 → 错误条 + 重试钮                         | `flaky-error-light.png`                                                      | —                              |
| eof 部分回复（completed 态）                             | `eof-after-light.png`                                                        | —                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（重试钮/反馈/建议项 hover 族为 shadcn 基础件）A2 pass（探针 Tab 轮询无 focus 丢失）A3 **已知族**（citations sup 触发钮 9×24 命中 R2-1a A3 小目标族；其余按钮 ≥24px）A4 pass（slow 流式中 submit disabled + 停止钮出现，程序化核实）A5 pass（错误条/空态/no-connector 均有指示，见 §3 探针输出）A6 n/a A7 n/a A8 n/a A9 pass（错误条给“重试”、成功给操作栏、工具卡状态徽章齐备：running/success/failed/已批准/已拒绝 六态探针全命中）
- B 颜色：B1 pass B2 pass B3 pass（flaky 错误条 destructive 红底红字、success 绿徽章、warning 语义未见错用）B4 pass B5 pass（dark fullPage 全量令牌化，无纯白块）B6 pass
- C 布局：C1 pass（light/dark/narrow overflow 扫描仅 sr-only 假阳性，属有意隐藏）C2 fail→**R2-1d-C2-01**（跨页已知）C3 pass（场景块纵向堆叠、间距一致）C4 pass（~800 满页无横向溢出）C5 pass C6 n/a
- D 间隔：D1 pass（场景块间 space-y-4/16px 栅格）D2 pass D3 pass D4 pass D5 pass D6 n/a D7 warn→**R2-1d-D7-01**（sender 通用）D8 pass
- E 排布：E1 pass E2 pass E3 pass（错误条“重试”右置主位）E4 pass E5 pass E6 pass（各聊天块 emptyState/no-connector/null-engine 均有内容）
- F 一致性：F1 pass F2 n/a F3 pass（错误面与 ai-chat 卡错误条同构）F4 fail→**R2-1d-F4-01**（“AI 请求失败/重试/发送/未配置 AI 连接器。”全中文）F5 n/a
- G 设计器：n/a
- H 弹层：n/a（本页无弹层；suggestions-popover 槽为 e2e 数据桩未开）

## 3. 发现条目

### [R2-1d-A5-01] abrupt-EOF 部分回复以“正常完成”呈现，无截断标识

- **页面/路由**: `#/ai-coverage`（`cov-chat-eof`：连接器流出 "Partial reply" 两词后无 finish_reason 直接断流）
- **主题/视口/状态**: light / 1280×800 / 发送后 ~1.5s
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-coverage/eof-after-light.png`
- **目视描述**: 断流回复与正常完成回复视觉完全一致——无错误条、无“回复可能不完整”标识，data-state 直取 completed。
- **程序化证据**:
  - 探针: 发送后轮询 `[data-testid="cov-chat-eof"]` data-state 与文本
  - 输出: `state:'completed', text:'eof streamPartial reply发送'`；对照 flaky 路径（state:'error' + 错误条）→ EOF 未走错误面也无提示面。
- **对照基准**: 检查提示词 A5（error/异常路径有指示）；engine.md Failure Path（abrupt EOF 属异常收尾）。
- **严重程度**: P3（边缘态，覆盖页专测场景；真实用户遇断流时会把半截答案当完整答案）
- **用户影响**: 网络断流时用户拿到无提示的半截回复，可能据其行动。
- **修复方向**: engine 收流未遇 `finish_reason` 时置中间态（如 `data-state="incomplete"`）或至少在末尾气泡追加截断标记；渲染器按该状态显示“回复不完整”提示条。
- **归族**: watch-only → 台账（行为语义待 engine.md 裁决后决定是否立项）
- **复核状态**: 未复核

其余维度引用跨页已知项：R2-1d-C2-01、R2-1d-D7-01、R2-1d-F4-01（本页中文文案样本：“AI 请求失败”“重试”“发送”“停止”“未配置 AI 连接器。”，探针文本已留档）。正向确认（供复检）：slow 流式 processing 帧（submitDisabled:true + cancel:true + 光标）、flaky 500 → state=error + 重试钮、no-connector → state=error + 文案、null-engine → state=empty + emptyState 内容、tool-call 六状态徽章文案齐全。

## 4. 台账回写

- 本卡完成后由汇总 agent 统一回写 ledger。
