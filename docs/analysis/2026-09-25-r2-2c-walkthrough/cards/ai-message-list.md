# [card] control:ai-message-list

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-message-list` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：c8AiStreamSchema 内嵌 message list（role=log / aria-live / auto-scroll / scroll-to-bottom；经由 ai-chat 载体驱动——message list 无独立输入面，发送经宿主 ai-sender））
- **矩阵裁剪**: simplified（matrixReason：消息流面。裁掉的状态：200 消息虚拟窗口化（`VIRTUAL_SCROLL_THRESHOLD=200`，载体经 UI 逐轮发送不可实际到达——源码 L33/L123-131 `useVirtualizer` enabled 分支 + 单测覆盖核对；长列表滚动契约以 1652px 内容实测替代）、loading/error/aborted 列表级 banner（mock connector 恒成功，error banner 不可驱动；aborted note 已在 ai-chat 卡实测 `已停止生成` 显形）、分组（list 为 flat role=log 无分组概念，任务书"分组"项按契约核对为 n/a）、branch picker/loop-limit note（需宿主 branches/toolLoopMaxReached 注入，源码 L42-52/L202 已核对））

## 1. 截图清单

| 状态                     | light                                                                                     | dark（真 data-mode，自采）                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 空态 1280×800            | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-message-list/list-empty-1280-light.png`       | —                                                                                        |
| 长内容填满（自动钉底）   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-message-list/list-filled-1280-light.png`      | —                                                                                        |
| 上滚后（回到底部钮显形） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-message-list/list-scrolled-up-1280-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-message-list/list-scrolled-up-1280-dark.png` |
| 点钮回跳后（重新钉底）   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-message-list/list-repinned-1280-light.png`    | —                                                                                        |
| 长内容 ~800 宽           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-message-list/list-filled-800-light.png`       | —                                                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（列表本体无 hover 面；气泡内按钮归 ai-bubble 卡）A2 n/a（列表非焦点容器）A3 pass（回到底部钮 36×36 ≥24）A4 n/a A5 warn（空态为 `data-empty` 空白 div 无引导——与 ai-chat 卡 **R2-2c-A5-02 同根因同载体**，交叉引用不另立编号）A6–A8 n/a A9 pass（钉底链路：流式中 `pinned: true` 实时跟底；上滚 → 钮显形；点钮 → `pinned: true` + 钮消失，全闭环探针坐实）
- B 颜色：B1 pass（长内容正文 dark `rgb(248,250,252)` on `rgb(15,23,41)` 17:1 档——ai-chat 卡 compositor 同源）B2 pass（回底钮 dark 底 `rgb(15,23,41)` + 边 `rgb(31,42,61)`，对内容底可分辨）B3 pass B4 pass B5 pass（dark 气泡/按钮换挡正常，PNG `list-scrolled-up-1280-dark.png` 目视复核）B6 n/a
- C 布局：C1 pass（列表 `listOverX 0`、`docOverX 0`；长内容正常折行 576px 宽气泡）C2 pass（回底钮悬浮于滚动口右下为设计位置，与末气泡 copy 钮间距无碰撞）C3 pass（消息区占满、sender 底置）C4 pass（800 宽 438px 无溢出）C5 pass（滚动收缩在列表容器，无双滚动条）C6 n/a
- D 间隔：D1 pass（气泡间 gap 由宿主 gap-3 12px + 气泡内 gap-2 8px 组成，全落栅格）D2–D8 n/a
- E 排布：E1 pass（流方向 user 右/assistant 左可答）E2–E4 pass E5 pass（role 分区靠 placement+底色，视觉语言一致）E6 warn（空态引导缺失——A5-02 交叉引用）
- F 一致性：F1–F3 n/a F4 warn（回底钮 aria-label "回到底部" 中文上英文宿主——R2-2a-F4-11 族实例，§4）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无新立 finding——auto-scroll 钉底 / scroll-to-bottom 显形-回跳闭环 / 长内容折行 / role=log+aria-live 语义全部程序化坐实 pass；空态项交叉引用 R2-2c-A5-02（ai-chat 卡），同一 fixture+渲染器空隙不重复立项。）

## 4. 已知族命中（引用，不另立项）

- **R2-2c-A5-02（ai-chat 卡，本波新立 watch）**：空态 340px 纯空白——本卡载体 `data-empty` 空 div 同根因（fixture 未配 emptyState region + 渲染器无默认空态文案，`ai-message-list.tsx` L133-148），按重叠说明引用不另立。
- **R2-2a-F4-11（i18n zh-CN 回退）**：aria-label "回到底部"（`t('flux.ai.scrollToBottom')`）、loop-limit/aborted note 文案中文（源码 L49/L67）。
- **R2-1d-A5-01（ai-coverage EOF 半截回复）相邻观察**：本载体流式正常完成，无半截态可采样；维持原 watch 裁决。
- **虚拟窗口化契约核对（非走查项，记录）**：`useVirtualizer` `estimateSize 120 / overscan 6`（L125-131），200 阈值达成的长列表回归面归单测；载体不可达已列矩阵裁剪。
- **runner dark 列作废声明**：dark 证据全部自采真 `data-mode` 截图；主题选择器 "light" 不同步为 lab chrome 族内已知。

## 5. 交互键上报

```json
{
  "lab-ai-message-list": [
    { "action": "waitFor", "ms": 400 },
    { "action": "click", "selector": "[data-slot=ai-scroll-to-bottom]" }
  ]
}
```

滚动上翻（显形回底钮）需先有溢出内容 + `wheel`/scrollTop 操作——键集无滚动 action 无法注册；探针以 `scrollTop=0` 驱动（`_tmp/r2-2c-probes/w1-message-list.mjs`）。发送消息填充列表同样需 `fill`（无对应 action），注明。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-message-list`（control）→ carded（卡列填本路径）；交叉引用归族后 → digested。
