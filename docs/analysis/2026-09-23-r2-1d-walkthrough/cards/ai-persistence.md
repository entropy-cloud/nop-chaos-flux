# [card] page:ai-persistence

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-persistence` ｜ **载体**: 域页面（P3：useConversation + localStorage storage + ai-chat engine 绑定；左侧会话列表 host 自管 + 右侧 ai-chat）
- **矩阵裁剪**: simplified（matrixReason：功能验证型 demo，无弹层/拖拽 → H、A6/A8 n/a；刷新一致性已程序化取证（本页核心，未裁剪）；glass 皮肤统一裁剪；窄视口 800px 一档）
- 本页实际裁掉的状态：弹层打开、拖拽、glass 皮肤、375 移动档、会话切换 A→B→A 水合逐帧视觉对比（switchConversation 已由刷新水合路径覆盖）

## 1. 截图清单

| 状态                                | light                                                                                          | dark                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 默认 1280×800                       | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-persistence/ai-persistence-default-1280-light.png` | `…/ai-persistence-default-1280-dark.png` |
| 默认 800×900                        | `…/ai-persistence-default-800-light.png`                                                       | `…/ai-persistence-default-800-dark.png`  |
| engine-null 空态（净 localStorage） | `…/ai-persistence-empty-nullengine-light.png`                                                  | —                                        |
| 建会话 + 发送一轮                   | `…/ai-persistence-one-turn-light.png`                                                          | —                                        |
| 刷新后（水合恢复）                  | `…/ai-persistence-after-reload-light.png`                                                      | `…/ai-persistence-after-reload-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（同族 clip 证据）A3 pass（删除 ✕ 按钮 h-6=24px 恰在下限；+ New conversation 28px）A4 pass（发送 disabled 核实）A5 pass（null-engine 空态文案 “Create or select a conversation to start.” 存在非空白；侧栏空态 “No conversations yet.”）A6 n/a A7 n/a A8 n/a A9 pass（创建/删除会话、发送、刷新水合均即时反馈）
- B 颜色：B1 warn(R2-1d-B1-01，dark “+ New conversation” 3.26:1，systemic) B2 pass B3 pass（active 会话 accent 高亮）B4 pass B5 pass（dark 复检无纯白块）B6 pass
- C 布局：C1 pass C2 warn(R2-1d-C2-01 shell 浮件) C3 pass（侧栏+聊天双栏清晰）C4 pass（800 宽双栏保持）C5 pass C6 n/a
- D 间隔：D1 pass D2–D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 pass（双空态都有引导文案）
- F 一致性：F1–F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（本页无独立新发现；B1-01 命中 dark 主按钮（全文见 ai-linkage 卡），C2-01 shell 浮件命中（全文见 ai-linkage 卡）。）

**持久化一致性验证（briefing 指定专项，程序化取证通过）**：

- 探针: 建 1 会话 → 发送 “persist me please” → 读 DOM（convItems/bubbles）+ `localStorage['nop-chaos-flux:ai-persistence-demo']` → `page.reload()` → 复读对比。
- 输出: before `{convItems:1, bubbles:2}` / after `{convItems:1, bubbles:2, lastBubbleText:"Echo: persist me please Hello from the mock AI connector! Streaming works."}`；verdict `{conversationRestored:true, messagesRestored:true, contentMatch:true}`。storage JSON 含完整 messages 映射。
- 结论: 刷新前后一致性 pass（P3 demo 页面验证目标达成）。测试后 localStorage 已清理，未留脏态。

## 4. 误报排除记录

- GAPS 探针报侧栏 “+ New conversation” 与空态 P 负 gap：条件分支互斥渲染帧（创建后空态消失），非同屏元素，不报。
- 会话项 hover:bg-accent/50 与 active bg-accent 同色系：有意的主次态，不报。

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；无新独立 findings。
