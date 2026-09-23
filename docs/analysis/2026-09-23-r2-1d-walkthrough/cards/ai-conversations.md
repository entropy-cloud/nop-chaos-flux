# [card] page:ai-conversations

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-conversations` ｜ **载体**: 域页面（flux-renderers-ai P1 demo：ai-conversations 侧栏 + ai-chat + `ai` ActionScope 命名空间 + 外部 ai:send 按钮，useConversation 控制器）
- **矩阵裁剪**: simplified（matrixReason：控件 demo 页，无 Dialog/Sheet → H n/a；无拖拽；rename/delete 因列表恒空无法触达（见 A9-02），已如实登记为不可验证项；~375 档未跑）
- 本页实际裁掉的状态：会话重命名/删除/点击切换（被 A9-02 阻断）、glass 皮肤、~375 移动档

## 1. 截图清单

| 状态                          | light                                                                        | dark                      |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------- |
| 默认 1280×800（侧栏空）       | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-conversations/default-light.png` | —                         |
| 外部 ai:send → 流式中         | `external-send-mid-light.png`                                                | —                         |
| 外部 ai:send 完成（侧栏仍空） | `external-send-completed-light.png`                                          | `completed-dark.png`      |
| 点击“新建会话”后              | `after-create-light.png`（无任何变化）                                       | —                         |
| 默认 ~800 宽                  | `default-narrow-light.png`                                                   | `default-narrow-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass（按钮/输入 focus ring 可见）A3 pass（新建会话钮 93×28）A4 pass A5 pass（流式中间态正常）A6 n/a A7 n/a A8 n/a A9 **fail(R2-1d-A9-02)**
- B 颜色：B1 pass B2 pass B3 pass B4 pass B5 pass（dark 复拍正常）B6 pass
- C 布局：C1 pass（overflow 扫描空）C2 fail→**R2-1d-C2-01**（跨页已知）C3 pass（256px 侧栏 + chat 主区结构清晰——但侧栏内容空，见 A9-02）C4 pass（800px 下侧栏 256px 固定 + chat ~490px 不塌；**无折叠属窄视口 flex/固定壳层已知族 → R2-3c 候选，不另立项**）C5 pass C6 n/a
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a D7 warn→**R2-1d-D7-01**（sender 通用）D8 pass
- E 排布：E1 warn（并入 A9-02：侧栏区 256×600 空白面板，P1 demo 名不副实）E2 pass E3 pass E4 pass E5 pass E6 **fail（并入 R2-1d-A9-02：空侧栏无空态提示）**
- F 一致性：F1 pass（“External ai:send” 与 component-handle 页外部按钮同位同 variant）F2 pass（侧栏宽度与设计器域左侧树 256px 档一致）F3 pass F4 fail→**R2-1d-F4-01**（“新建会话”中文 vs 页面英文）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1d-A9-02] 会话侧栏恒为空：聊天后与点击“新建会话”后均无任何会话行、无反馈

- **页面/路由**: `#/ai-conversations`（P1 demo 主张 "ai-conversations sidebar + ai-chat"）
- **主题/视口/状态**: light / 1280×800 / ①完成一轮外部 ai:send 后 ②点击“新建会话”后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-conversations/external-send-completed-light.png`（聊天完成、侧栏仅剩“新建会话”钮）、`after-create-light.png`（点击新建后画面零变化）
- **目视描述**: 256px 宽、整高的侧栏面板里只有一个“新建会话”按钮，下方 600px 空白；完成聊天一轮后仍无会话出现；点击“新建会话”无 toast、无报错、无行出现。
- **程序化证据**:
  - 探针: `panel.textContent` / 面板内 button/li/`[data-slot="ai-conversation-item"]` 全量枚举（点击前后对比）
  - 输出: 初始 `itemCount:1`（仅“新建会话”钮）；`afterCreateDom.text === "新建会话"`（面板全部文本仅此 4 字）；外部 ai:send 完成后 `bubbles:2, state:completed` 而面板文本不变。onItemClick/onItemRename/onItemDelete 因无行可点全部不可达。
- **对照基准**: 检查提示词 A9（操作后反馈可见，非静默更新）、E6（空态有引导）；路由描述承诺的 sidebar 能力。
- **严重程度**: P1（本页核心任务“管理会话”在默认配置下完全不可用，且静默）
- **用户影响**: 用户看到空侧栏、点新建无反应，会认为功能损坏；P1 demo 的核心卖点（会话切换/持久化入口）无法体验。
- **修复方向**: 需运行时归因：`ai:createConversation` ActionScope 是否真正落到 `useConversation` controller（pageData.conversations 绑定是否随 hook 状态刷新）；修复前先给空侧栏补空态提示（“暂无会话，点击新建”）。ai-conversations 渲染器侧建议对 `conversations` 空数组渲染 empty slot。
- **归族**: local → R2-4 批（demo/控制器绑定；若归因为 ai:createConversation action 契约缺陷则升 systemic → R2-3，复核时裁定）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后由汇总 agent 统一回写 ledger。
