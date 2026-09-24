# [card] control:ai-chat

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-chat` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：①dialog 宿主 + 流式（c8AiChatDialogSchema，bug 73 pattern）②流式 DOM 契约（c8AiStreamSchema，mock connector 15ms/chunk）③HITL dead-click（c8HitlSchema，wired + no-handler 双卡））
- **矩阵裁剪**: simplified（matrixReason：会话面板根布局。裁掉的状态：error 终态（mock connector 恒成功，error banner `ListErrorBanner` 载体不可驱动；源码通道 `ai-message-list.tsx` L118-119 + `requestState==='error'` 链已核对）、engine-null-switch / connector-missing 空错面（源码 L547-585 已核对，fixture 不触）、header/beforeMessages/afterMessages/footer region 槽（fixture 未配）、glass 皮肤。流式中间态为本卡必查已全做——见截图清单）

## 1. 截图清单

| 状态                           | light                                                                                                          | dark（真 data-mode，自采）                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 空态 1280×800（场景②）         | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-empty-1280-light.png`                                  | —                                                                                   |
| 流式进行中（用户气泡+停止钮）  | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-mid-1280-light.png`                                    | —                                                                                   |
| 流式进行中（assistant 光标 ▍） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-assistant-mid-1280-light.png`                          | —                                                                                   |
| 完成态（user+assistant+retry） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-done-1280-light.png`                                   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-done-aborted-1280-dark.png` |
| 长内容回复                     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-long-content-1280-light.png`                           | —                                                                                   |
| abort 中（停止钮 48×28）       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-abort-mid-1280-light.png`                              | —                                                                                   |
| abort 后（已停止生成 note）    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-aborted-1280-light.png`                                | —                                                                                   |
| dialog 宿主开/流式/完成        | `dialog-chat-open-1280-light.png` / `dialog-chat-streaming-1280-light.png` / `dialog-chat-done-1280-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/dialog-chat-done-1280-dark.png`    |
| HITL pending / decided         | `hitl-pending-1280-light.png` / `hitl-decided-1280-light.png`                                                  | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/hitl-decided-1280-dark.png`        |
| 空态 ~800 宽 / 完成 ~800 宽    | `stream-empty-800-light.png` / `stream-done-800-light.png`                                                     | —                                                                                   |

（均落 `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（发送/停止钮 hover 归 ai-sender 卡 A1 族——本卡 R2-2a-A1-03 引用见 §4）A2 pass（textarea focus oklab ring、`occludedBy: null`）A3 pass（可交互元素 <24px 零命中；停止/发送 48×28）A4 pass（空草稿/流式中 submit `disabled: true`；no-handler HITL 卡 拒绝/批准 disabled）A5 **fail(R2-2c-A5-02)**（空态 340px 全空白无引导，见发现）A6/A8 n/a A7 pass（dialog 关闭钮/遮罩/焦点困住归 dialog 卡族）A9 pass（全链路：发送→aria-busy true→光标▍增量→完成 retry/copy 显形；abort→"已停止生成" note（G5-R2 终止态）；HITL 批准→badge 替换按钮 + probe 恰一次 `approve|call_c8_1` count 1）
- B 颜色：B1 pass（done assistant 正文 compositor 17.08:1；aborted note 真底手算 ≈9:1——探针 compositor 对 oklch 页底失效产出 1.91 假值已弃用，PNG `list-scrolled-up-1280-dark.png` 目视复核）B2 pass B3 pass B4 pass（角色气泡走令牌：user `rgb(36,47,66)` / assistant `rgb(15,23,41)` dark）B5 pass（dark 双角色气泡底/输入框 oklab 底均正确换挡；dialog 内白底为宿主弹层亮底已知族 §4）B6 pass
- C 布局：C1 pass（1280/800、列表 scrollWidth=clientWidth、长内容 `listOverX 0` `docOverX 0`）C2 pass（scroll-to-bottom 悬浮钮按设计叠于滚动口右下，与 copy 钮无碰撞）C3 pass（消息区 flex-1 min-h-0 + sender 底部，主次清晰）C4 pass（800 宽 chat 438px、right 739 < 800）C5 pass（滚动收缩在 `[data-slot=ai-message-list]` 内，无双滚动条）C6 n/a
- D 间隔：D1 pass（chat 容器 gap-3 12px 栅格）D2–D8 n/a/pass（面板本体归 ai-sender/ai-bubble 卡）
- E 排布：E1 pass（发送主操作+流式状态可答）E2 pass（user 右置 primary 底 / assistant 左置 surface 底，placement 语义正确）E3 pass（停止/发送右下落点符合惯例）E4–E6 pass/n/a（空态引导缺失已计 A5-02）
- F 一致性：F1–F3 n/a F4 warn（"停止/发送/已批准/拒绝/批准/已停止生成/回复生成中，可继续输入" 中文上英文宿主——R2-2a-F4-11 族实例，§4）F5 n/a
- G 设计器：n/a
- H 弹层：pass（dialog 宿主：560×514、bottom 574 < 792、内容流式增高不撑破——几何归 dialog 卡锚点复检通过口径）

## 3. 发现条目

### [R2-2c-A5-02] 会话空态为 340px 纯空白：emptyState region 未接线且渲染器无默认引导

- **页面/路由**: `#/lab/ai-chat`（场景② "Host streaming DOM contract"，首屏即空态；场景① dialog 内空态同险；`#/lab/ai-message-list` 载体同根因同险）
- **主题/视口/状态**: 双主题 / 全视口 / 首屏未发消息
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-chat/stream-empty-1280-light.png`（消息区整块空白，仅底部输入框）
- **目视描述**: 打开页面首屏，420px 高的聊天面板上部 ~340px 完全空白，无"开始新对话/示例问题"等任何引导，三问中的"这页是干什么的、主操作是什么"只能靠输入框 placeholder 猜。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w1-chat.mjs` emptyState 段
  - 输出: `listEmpty: true`、`listRole: "log"`、`listAriaLive: "polite"`、`listText: ""`、`listH: 340`——`ai-message-list.tsx` L133-148 空态分支渲染 `data-empty` 空 div，内容完全取决于 `emptyNode`（`emptyState` region / `emptyRegion`），fixture（`c8AiStreamSchema`）未配 region，渲染器也无默认空态文案。
- **对照基准**: 检查提示词 A5（empty 有意义提示非空白）+ E6（空/首屏态有任务引导，非"组件壳堆叠"）
- **严重程度**: P3（首屏体验缺陷，不阻断任务；demo/模板场景下放大"壳堆叠"观感）
- **用户影响**: 新会话首屏无任何可点/可读引导，空态用户需要自己想到"输入框可以打字"。
- **修复方向**: 二选一并文档化：①fixture 接线 `emptyState` region（如欢迎语 + 示例 prompt，ai-welcome 渲染器现成）；②渲染器层在无 emptyNode 时给默认轻量空态（`flux.ai.emptyConversation` 类 i18n 键），与 engine-null-switch 分支的 `selectConversation` 文案对齐。
- **归族**: watch-only → 台账（fixture 未接线 + 渲染器无默认值的契约空隙；与 R2-2a-F4-83 fixture 承诺落空族相邻）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **R2-2a-A1-03（default variant 按钮 hover 零反馈）**：发送钮 hover 无感为同族（ai-sender 卡已实证探针输出），本卡不重复采样。
- **R2-2a-F4-11（i18n zh-CN 回退）**：停止/发送/已批准/拒绝/批准/已停止生成/标题 tooltip "回复生成中，可继续输入" 全部中文上英文宿主（`t('flux.ai.*')`）。
- **宿主弹层 dark 亮底族**：`dialog-chat-done-1280-dark.png` dialog 整面白底（真 data-mode），页面本体 dark 正常——dialog 卡 §4 同源引用，修复后需本卡 B5/H 复检。
- **scope 响应性缺口（R2-3 候选）正向对照**：本载体 `onConversationChange` 经 `activeConversationId` prop 变化正确触发（场景见 ai-conversations 卡 probe `c2`），R2-1d demo 页侧栏冻结在 lab 载体不复现——缺口收敛于 demo 页 wiring，非渲染器本体。
- **HITL dead-click 专项 PASS**：wired 卡批准 → probe `approve|call_c8_1` **count=1**（恰好一次）、badge "已批准" 替换按钮；no-handler 卡 拒绝/批准 `disabled: true`（`hitlBefore/hitlAfter`）。控件级深度走查归 ai-tool-call 卡（wave2），本卡为场景级佐证。
- **runner dark 列作废声明**：dark 证据全部自采真 `data-mode` 截图；主题选择器 "light" 不同步为 lab chrome 族内已知。

## 5. 交互键上报

```json
{
  "lab-ai-chat": [
    { "action": "click", "selector": "[data-testid=c8-dialog-open]" },
    { "action": "waitFor", "selector": "[data-slot=dialog-surface]" },
    { "action": "clickText", "text": "批准" },
    { "action": "waitFor", "ms": 400 }
  ]
}
```

流式中间态复现需向 textarea 注入文本（`fill`），交互键 action 集无打字能力，无法注册——以探针 `_tmp/r2-2c-probes/w1-chat.mjs` / `w1-chat-fixup.mjs` 为复现路径。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-chat`（control）→ carded（卡列填本路径）；R2-2c-A5-02 归族后 → digested。
