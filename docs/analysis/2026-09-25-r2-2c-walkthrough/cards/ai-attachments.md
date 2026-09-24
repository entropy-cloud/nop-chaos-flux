# [card] control:ai-attachments

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-attachments` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：①dialog 宿主 + 超限校验（C8.2 bug 73 pattern，c82AttachDialogSchema：accept image/\* + maxSize 5MB + onError probe）②URL/文件名安全门（c82AttachSafetySchema：javascript: URL 恶意值 + `<img src=x onerror>` 恶意文件名受控 value））
- **矩阵裁剪**: simplified（matrixReason：上传面控件，无拖拽画布/无会话流。裁掉的状态：host 驱动 `status: uploading/error` 缩略图角标态（载体受控 value fixture 未带 status 字段，无法经 UI 驱动；源码通道 `ai-attachments.tsx` L403-425 AttachmentStatus 已核对：uploading→spinner、error→destructive 文案）、dragging 拖入高亮态（Playwright DataTransfer 拖拽在 lab 载体不可稳定合成，源码 L175-191 data-dragging 通道已核对）、disabled 态（meta.disabled fixture 未接线，源码 L67/L268/L358 已核对）、glass 皮肤）

## 1. 截图清单

| 状态                          | light                                                                                       | dark（真 data-mode，自采）                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 默认 1280×800                 | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/default-1280-light.png`             | —                                                                                       |
| 安全门场景默认 1280           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/safety-default-1280-light.png`      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/safety-default-1280-dark.png`   |
| 缩略图 hover（remove 显形）   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/safety-thumb-hover-1280-light.png`  | —                                                                                       |
| 弹层开（空附件）              | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/dialog-open-1280-light.png`         | —                                                                                       |
| 弹层内选图后（缩略图+发送钮） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/dialog-with-thumb-1280-light.png`   | —                                                                                       |
| 超限拒绝（文件过大 alert）    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/dialog-rejection-1280-light.png`    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/dialog-rejection-1280-dark.png` |
| 非图片 sendBlocked 态         | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/dialog-send-blocked-1280-light.png` | —                                                                                       |
| 800 窄视口弹层（拒绝态）      | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-attachments/dialog-rejection-800-light.png`     | —                                                                                       |

注：tiny.png fixture 为 1×1 透明像素，缩略图 80×80 blob img 存在（`out-w1-attach-fixup.json`：naturalWidth 1 / rect 80×80 / complete true）但视觉透明，截图内不可见——fixture 取舍非渲染缺陷。

## 2. A–H 维度勾选表

- A 交互：A1 pass（添加附件 outline 钮 hover bg `rgb(255,255,255)→rgb(241,245,249)`，`hoverPick.changed: true`）A2 pass（pick 钮 focus oklab ring、`occludedBy: null`）A3 pass（本体钮 ≥28px；remove 钮 20×20 → **A3 已知族实例**，见 §4）A4 pass（超限文件不入列 `itemCount: 1`；sendBlocked 面发送钮 disabled（dark 截图场景②灰钮））A5 pass（rejection/blocked 均 role=alert 非纯文本）A6/A8 n/a A7 pass（弹层有关闭钮、Esc 关闭、焦点落弹层内——弹层本体归 dialog 卡）A9 pass（超限 → `probeError: "attachment-too-large"`、rejection note 显形；remove 后 item 数变化）
- B 颜色：B1 warn（**已知族引用不另立项**：rejection "文件过大" destructive 红 `rgb(239,67,67)` 上弹层底 `rgb(251,250,249)` = 3.63:1、"仅图片附件可发送" 3.78:1，12px 小字 <4.5——与 R2-2a-B1-05 destructive 令牌 light 对比度同根因，§4）B2 pass（focus ring oklab ≥3:1）B3 pass（destructive 红仅真错误）B4 pass（走 text-destructive/muted 令牌）B5 warn（弹层 dark 整面 `rgb(251,250,249)` 白底 = 宿主弹层 dark 亮底已知族，§4；页面本体 dark 正常：item border `rgb(31,42,61)`、rejection dark `rgb(217,38,38)` 4.73:1）B6 pass
- C 布局：C1 pass（1280 `docOverX 0` 全页零命中；800 窄 `docOverX 0`——scope-debug pre 溢出 34px 为已知族沿祖先链传播实例，§4）C2 pass C3 pass C4 pass（800 宽弹层 560px、right 680 < 800）C5 pass（弹层 body 区滚动）C6 n/a
- D 间隔：D1 pass（工具行 gap-2 8px、列表 mt-2 8px 落栅格）D2–D6 pass/n/a D7 pass（按钮行/告警/列表垂直 8px）D8 pass
- E 排布：E1 pass（pick 主操作左上可答）E2 pass（outline pick vs primary 发送主次分明）E3 n/a/pass E4 pass（图标-文件名-大小-移除一行对齐）E5–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 warn（"添加附件/发送/文件过大/移除/仅图片附件可发送" 中文上英文宿主——R2-2a-F4-11 族实例，§4）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（560 落 md 档，plan490 锚点）H3 pass（bottom 293 < 792）H4 pass H5 n/a（弹层内无 footer 动作条，本体归 dialog 卡）H6–H9 pass/n/a（800 窄重开不溢出）

## 3. 发现条目

（无新立 finding——本控件渲染面全部命中既有已知族，见 §4；安全门/校验/反馈链路均程序化坐实为 pass。）

## 4. 已知族命中（引用，不另立项）

- **R2-2a-B1-05（destructive 令牌 light 对比度族，同根因新实例）**：rejection `text-xs text-destructive` `rgb(239,67,67)` on `rgb(251,250,249)` = **3.63:1**、sendBlocked 同色 on 白底 **3.78:1**（`out-w1-attachments.json` rejectionContrast/blockedContrast；12px 小字 WCAG 1.4.3 需 4.5:1）。与 button 卡 B1-05（destructive 底白字 3.78:1）同一 `--destructive` light 令牌值过浅，修复面一致（加深令牌双向收益），故按重叠说明引用不另立项。
- **A3 小目标族（R2-1a-A3 族）**：缩略图 remove 钮 `h-5 w-5` = **20×20** < 24（`smallTargetsS2`、`removeHover`；`ai-attachments.tsx` L355）。image 模式 hover 才显形（opacity-0→1 已验证），card 模式常驻。族实例挂账，不另立。
- **R2-2a-F4-11（i18n zh-CN 回退）**：英文宿主渲染 "添加附件/发送/文件过大/移除/仅图片附件可发送"（`t('flux.ai.*')`，`ai-attachments.tsx` L143/L272/L282/L292）。
- **宿主弹层 dark 亮底族**（dialog 卡 §4 同源）：`dialog-rejection-1280-dark.png` 弹层整面 `rgb(251,250,249)` 白底（真 data-mode），页面本体 dark 正常；修复后需本卡 B5 复检。
- **R2-2a-C1-63（scope-debug pre 长令牌溢出沿祖先链传播）**：800 窄 `scope-debug-json` overX 34 → nop-page overX 18（`narrowOverflow.hits`），同修复面。
- **R2-2a-E2-26（默认栈宽基线）**：场景① "Open attachments dialog" 主按钮全行拉伸 ~895px（`default-1280-light.png`），族实例。
- **安全门 PASS（程序化坐实，非误报排除）**：javascript: URL 仅渲染 `<img>`（`anchors: []`、`jsAnchors: []`），恶意文件名纯文本转义（`htmlHasRawTag: false`）；超限 onError probe `attachment-too-large` 恰好一次；非图片进 card 模式且发送钮 gating 生效。
- **runner dark 列作废声明**：dark 证据全部自采真 `data-mode` 截图；dark 截图右下主题选择器仍显示 "light" 为 lab chrome 不同步（族内已知）。

## 5. 交互键上报

```json
{
  "lab-ai-attachments": [
    { "action": "click", "selector": "[data-testid=c82-attach-open]" },
    { "action": "waitFor", "selector": "[data-slot=dialog-surface]" }
  ]
}
```

文件选择（`setInputFiles`）无对应 action，超限拒绝/缩略图态无法经交互键注册——以探针 `_tmp/r2-2c-probes/w1-attachments.mjs` 为复现路径。

## 6. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-attachments`（control）→ carded（卡列填本路径）；findings 归族后 → digested。
