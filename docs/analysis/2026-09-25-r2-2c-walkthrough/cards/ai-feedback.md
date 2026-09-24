# [card] control:ai-feedback

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-feedback` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：actions ['like','dislike','copy']（c82FeedbackSchema，message m_fb 'hello world'，onAction → probe:feedback `${action}|${message.id}`））
- **矩阵裁剪**: simplified（matrixReason：单行动作条。裁掉的状态：refresh 动作（需 ai-chat context engine 才有实义，fixture actions 未含，源码 L143-151 busy-safe 分支已核对）、sources 弹层动作（fixture 未含 'sources'；popover 空态/列表分支源码 L180-220 已核对，弹层形态归 citations 卡 Popover 面）、disabled 态（meta.disabled fixture 未接线，源码 L100/L178 已核对））

## 1. 截图清单

| 状态                              | light                                                                               | dark（真 data-mode，自采）                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-feedback/default-1280-light.png`        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-feedback/default-1280-dark.png`     |
| like 选中（data-active/selected） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-feedback/like-active-1280-light.png`    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-feedback/like-active-1280-dark.png` |
| 互斥切换后 dislike 选中           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-feedback/dislike-active-1280-light.png` | —                                                                               |
| copy 点击后（已复制态）           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-feedback/copy-clicked-1280-light.png`   | —                                                                               |
| 默认 ~800 宽                      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-feedback/default-800-light.png`         | —                                                                               |

## 2. A–H 维度勾选表

- A 交互：A1 pass（like hover bg 透明→`rgb(241,245,249)` + color 变深，`likeHover.changed: true`——ghost variant 在此有 hover 规则（`hover:bg-muted`），非 A1-03 零反馈形态）A2 pass（like focus oklab ring、`occludedBy: null`）A3 pass（三钮 35/35/48 ×28，全 ≥24）A4 n/a（disabled 见裁剪）A5 n/a A6–A8 n/a A9 pass（提交态全链路：like → `data-active`+`data-state="selected"`+`aria-pressed="true"`+底色 `rgba(28,110,242,0.18)` 四通道同帧；互斥：dislike 点击清除 like（`likeActive: false`）；un-vote 复点清除（state null）；copy → 授权 clipboard 后文案变 "已复制" 1.5s + probe `copy|m_fb`；onAction probe 序列 `dislike|m_fb` count 2 恰当递增）
- B 颜色：B1 pass（默认 muted `rgb(72,86,106)` on 白 ≈7:1；选中 light primary on primary/18 底可读）B2 pass B3 pass B4 pass（D1 option-row 标准态通道 `getOptionRowStateTokens`）B5 warn（**dark 选中态 `rgb(77,141,245)` 字 on `rgba(77,141,245,0.18)` 叠 dark 底，手工合成 ≈4.2:1**（14px 中文钮面文字，4.5 线下缘）——`--primary` dark 过亮已知族实例，§4）B6 pass
- C 布局：C1 pass（800 窄 `overX 0`）C2–C6 n/a/pass
- D 间隔：D1 pass（动作条 gap-1 4px 落栅格）D2–D8 n/a
- E 排布：E1 pass E2 pass（选中强于默认）E3–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 warn（"赞/踩/复制/已复制" 中文上英文宿主——R2-2a-F4-11 族实例，§4）F5 n/a
- G 设计器：n/a
- H 弹层：n/a（sources 弹层未在 fixture actions 中，见裁剪）

## 3. 发现条目

（无新立 finding——投票/互斥/复制三态链路与 onAction payload 全部程序化坐实 pass；dark 选中态对比度落 `--primary` dark 过亮已知族（§4），不另立。）

## 4. 已知族命中（引用，不另立项）

- **dark 平价/对比度族（R2-4，`--primary` dark 过亮）**：dark 选中 like 钮 `activeColor: rgb(77,141,245)`、`activeBg: rgba(77,141,245,0.18)`（`out-w1-feedback.json` darkLike）；探针 compositor 对 oklch 页底失效给出 2.7 假值（白底合成），按真实 dark 底 `rgb(15,23,41)` 复合 18% tint 手工合成 ≈**4.2:1**（`like-active-1280-dark.png` 目视可读但偏亮）——R2-1d 7/7 ai demo 先例 + ai-sender 卡 dark 发送钮 3.26:1 同族新实例。
- **R2-2a-F4-11（i18n zh-CN 回退）**：赞/踩/复制/已复制 aria-label 与可见文案全中文（`t('flux.ai.*')`）。
- **D1 选项行标准态通道正向对照**：`data-state="selected"` + `aria-pressed` + `data-active` 三通道并存（源码 L169-175 注释明言族2 投票态消解），跨宿主选择器统一契约成立。
- **runner dark 列作废声明**：dark 证据全部自采真 `data-mode` 截图；主题选择器 "light" 不同步为 lab chrome 族内已知。

## 5. 交互键上报

```json
{
  "lab-ai-feedback": [
    { "action": "click", "selector": "[data-slot=ai-feedback-like]" },
    { "action": "waitFor", "ms": 200 },
    { "action": "click", "selector": "[data-slot=ai-feedback-dislike]" },
    { "action": "waitFor", "ms": 200 },
    { "action": "click", "selector": "[data-slot=ai-feedback-copy]" },
    { "action": "waitFor", "ms": 300 }
  ]
}
```

copy 反馈（"已复制"）需宿主授权 clipboard-write（探针已 `grantPermissions` 注册路径），纯 GUI 交互键下按钮保持 pre-copy 态（显式失败语义，非缺陷）。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-feedback`（control）→ carded（卡列填本路径）；findings 归族后 → digested。
