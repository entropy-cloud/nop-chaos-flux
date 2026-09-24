# [card] control:ai-conversations

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-conversations` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：会话侧栏 + ai-chat 联动（c8ConversationsSchema：c1/c2 双会话 + activeId 页数据 + onItemClick→setValue + onCreate probe；**未接线 onItemRename / onItemDelete**））
- **矩阵裁剪**: simplified（matrixReason：侧栏列表面。裁掉的状态：meta.disabled 态（fixture 未接线，源码 `ai-conversations.tsx` L38/L77/L130/L148/L162/L192 全通道已核对）、重命名 Escape 取消分支（源码 L119-122 setRenamingId(null) 已核对，Enter 提交路径已实测）、空会话标题兜底文案（fixture 双会话均有 title，L136 `emptyConversationTitle` 已核对）、200+ 长列表滚动（fixture 2 项，列表无虚拟化契约））

## 1. 截图清单

| 状态                             | light                                                                                    | dark（真 data-mode，自采）                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 默认 1280×800（c1 active）       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/default-1280-light.png`        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/default-1280-dark.png` |
| 点击 c2 后（active 迁移）        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/item-c2-active-1280-light.png` | —                                                                                |
| 重命名输入态（autofocus）        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/renaming-c1-1280-light.png`    | —                                                                                |
| Enter 提交后（无效果，见发现）   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/renamed-c1-1280-light.png`     | —                                                                                |
| 删除确认弹层                     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/delete-confirm-1280-light.png` | —                                                                                |
| 删除确认接受后（无效果，见发现） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/after-delete-1280-light.png`   | —                                                                                |
| 默认 ~800 宽                     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/default-800-light.png`         | —                                                                                |

## 2. A–H 维度勾选表

- A 交互：A1 pass（inactive item button hover bg 透明→`rgb(241,245,249)` + li `hover:bg-accent/50`（oklab 0.96/0.5），`inactiveHover.changed: true`）A2 pass（新建钮 focus oklab ring、`occludedBy: null`）A3 pass（item 内可交互元素 <24px 零命中——item 钮 flex-1、rename/delete 图标钮 size sm 28px）A4 n/a（disabled 载体不可达见裁剪）A5 n/a A6–A8 n/a A9 **warn(R2-2c-A9-03)**（重命名/删除/新建三事件静默 no-op，见发现；item 切换链路本身 pass：active 迁移 + probe `c2|Second chat` + onConversationChange `c2` 双探针命中）
- B 颜色：B1 pass（active 项 btn `rgb(33,53,71)` on `rgb(236,243,254)` ≈10:1）B2 pass（active 边框 primary 28,110,242 对底 ≈4:1 ≥3:1；dark active 边框 `rgb(77,141,245)` 对 `rgb(36,47,66)` ≈4.1:1）B3 pass（active/accent 语义一致）B4 pass（border-primary/bg-accent 令牌）B5 pass（dark activeBg `rgb(36,47,66)`、inactive 边框透明、新建钮 oklab 暗底白字——`darkCreateContrast` 1.05 为 compositor 对 oklab 底失效假值已弃用，PNG 目视复核清晰）B6 pass（选中态 border-primary+bg-accent 非裸奔蓝）
- C 布局：C1 pass（1280/800 `docOverX 0`；800 窄侧栏 210 + chat 420 并排 right 739 < 800）C2 pass C3 pass（侧栏/会话面板分区清晰）C4 pass C5 pass C6 n/a
- D 间隔：D1 pass（item 间 gap-1 4px、header→list gap-2 8px 落栅格）D2–D8 n/a/pass
- E 排布：E1 pass（新建主操作置顶）E2 pass（active 项 border+底色强于 inactive）E3 pass E4 pass（标题左对齐、图标右缘对齐）E5 pass E6 n/a
- F 一致性：F1–F3 n/a F4 warn（"新建会话/删除此会话？/取消/删除会话/重命名会话/删除会话" 全中文上英文宿主——R2-2a-F4-11 族实例，§4）F5 n/a
- G 设计器：n/a
- H 弹层：pass（删除确认 AlertDialog 480 落 sm 档；footer `justify-content: flex-end` 右对齐、确认在主位；焦点落"取消"防误触（`focusedEl: BUTTON:取消`）；H1–H5 关键项过，深度归 dialog 卡锚点）

## 3. 发现条目

### [R2-2c-A9-03] 重命名/删除/新建三事件在载体静默 no-op：破坏性确认弹层接受后零效果零反馈

- **页面/路由**: `#/lab/ai-conversations`（场景 "Host conversation list + onConversationChange (C8.1)"；所有未接线 `onItemRename`/`onItemDelete` 的宿主集成同险）
- **主题/视口/状态**: light / 1280 / 重命名 Enter 提交后 + 删除确认接受后
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-conversations/renamed-c1-1280-light.png`（输入 "Renamed via lab" 提交后仍显示 "First chat"）、`after-delete-1280-light.png`（确认 "删除会话" 后列表仍 c1+c2 两项）
- **目视描述**: 走查者点铅笔改名、输入新标题、回车——输入框关闭，标题纹丝不动，无任何提示；点 X 删除 → 弹出"该会话及其全部消息历史将被永久删除，且无法恢复"的破坏性确认 → 点红色"删除会话"——弹层关闭，列表依旧两项，无 toast 无行消失。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w1-conversations.mjs` afterRename/afterDelete/afterCreate 段
  - 输出: `afterRename: { text: "First chat" }`（提交 "Renamed via lab" 后标题未变）；`afterDelete: { itemCount: 2, ids: ["c1","c2"] }`（确认删除后列表不变）；`afterCreate: "create"`（probe 收到事件但列表无新项）。根因：`c8ConversationsSchema`（`apps/playground/src/component-lab/renderers/data-c8-1-host.ts` L147-195）只接线 `onItemClick`/`onCreate`，**未接线 `onItemRename`/`onItemDelete`**——渲染器按契约 dispatch `ai:conversation-rename`/`ai:conversation-delete`（`ai-conversations.tsx` L58/L195）后宿主无人消费，且 dispatch 无任何用户可见反馈通道（lab env notify 亦未覆写 toast——lab 载体族）。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）+ R2-2a-F4-83 fixture 承诺落空族 + 场景描述明言 "new/switch/rename/delete schema events"
- **严重程度**: P3（demo/验收载体缺陷，不伤渲染器本体；但破坏性确认"接受后无效果"直接误导走查与验收结论）
- **用户影响**: demo 用户与走查者会误判"删除/改名是坏的"；删除确认的严肃文案与零效果形成反差，损耗对控件真实契约的信任。
- **修复方向**: fixture 补接线：`onItemRename` → `setValue` 更新 `conversations` 数组对应项 title；`onItemDelete` → `setValue` 过滤该 id 并同步 `activeConversationId`；`onCreate` → push 新会话并激活。或场景描述收窄为 "switch-only" 以免承诺落空。
- **归族**: watch-only → 台账（fixture 契约缺口族，R2-2a-F4-83 同族实例；渲染器 dispatch 通道已核对无误）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **scope 响应性缺口（R2-3 候选）正向对照**：本载体 item 点击 → `setValue` → 侧栏 `data-active` 即时迁移（`afterClick.items: [{c1:false},{c2:true}]`）+ ai-chat `onConversationChange` probe `c2` 命中——**R2-1d demo 页侧栏冻结先例在 lab 载体不复现**，缺口定位收敛于 demo 页 wiring（页数据作用域链路正常），佐证 R2-3 候选范围应为 demo 接线而非渲染器。
- **R2-2a-F4-11（i18n zh-CN 回退）**：新建会话/删除确认全家桶/重命名 aria 全中文上英文宿主。
- **lab 载体与环境基建族（notify no-op 吞 toast）**：渲染器 dispatch 后无可见反馈的第二层原因——lab 默认 env 未覆写 notify（mock-ai-env 的 toast 版未注入 lab 页）；与 A9-03 叠加放大静默感。
- **宿主弹层 dark 亮底族**：删除确认弹层若在 dark 下打开同样白底（dialog 卡族），本卡弹层截图为 light 态。
- **runner dark 列作废声明**：dark 证据全部自采真 `data-mode` 截图。

## 5. 交互键上报

```json
{
  "lab-ai-conversations": [
    {
      "action": "click",
      "selector": "[data-slot=ai-conversations-item][data-id='c2'] [data-slot=ai-conversations-item-button]"
    },
    { "action": "waitFor", "ms": 300 },
    {
      "action": "click",
      "selector": "[data-slot=ai-conversations-item][data-id='c1'] [data-slot=ai-conversations-rename]"
    },
    { "action": "waitFor", "selector": "[data-slot=ai-conversations-rename-input]" },
    {
      "action": "click",
      "selector": "[data-slot=ai-conversations-item][data-id='c2'] [data-slot=ai-conversations-delete]"
    },
    { "action": "waitFor", "selector": "[data-slot=ai-conversations-delete-confirm]" }
  ]
}
```

重命名输入（`fill`+Enter）与确认弹层内点击（弹层为 portal 全局容器，clickText "取消"/"删除会话" 可用）已在探针实测；键集内 `clickText` 可覆盖确认步：`{"action":"clickText","text":"删除会话"}`。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-conversations`（control）→ carded（卡列填本路径）；R2-2c-A9-03 归族后 → digested。
