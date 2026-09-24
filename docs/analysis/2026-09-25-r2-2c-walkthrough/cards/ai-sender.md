# [card] control:ai-sender

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-sender` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host sender submit + word limit C8.1，standalone ai-sender maxLength 60 / showWordLimit / submitType enter / onSubmit+onChange probe）
- **矩阵裁剪**: simplified（matrixReason：单输入面控件，无弹层/拖拽/画布面。裁掉的状态：loading/Stop 态与 meta.disabled 态（载体 fixture 未接线 loading/disabled，standalone 无 AiChatContext，loading 恒 false；源码通道 `ai-sender.tsx` L132-149 已核对）、extension rich-text 路径（host 未注入）、IME 组合输入实测（isComposing 守卫走源码核对 L43））

## 1. 截图清单

| 状态                       | light                                                                                                               | dark（真 data-mode，自采）                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 默认 1280×800（空草稿）    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/default-light-1280.png`                                          | —                                                                              |
| focus（textarea）          | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/focus-light-1280.png`                                            | —                                                                              |
| 填写 17 字符               | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/filled-light-1280.png`                                           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/filled-dark-1280.png`       |
| hover 发送钮（enabled）    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/hover-send-light-1280.png` / `hover-send-enabled-light-1280.png` | —                                                                              |
| Enter 提交后（草稿清空）   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/after-submit-light-1280.png`                                     | —                                                                              |
| 多行 2 行（Shift+Enter）   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/multiline-light-1280.png`                                        | —                                                                              |
| 多行 4 行（裁剪态）        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/multiline-4line-light-1280.png`                                  | —                                                                              |
| 上限 60/60（原生钳制）     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/overlimit-light-1280.png`                                        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/overlimit-dark-1280.png`    |
| 计数器与满行文本（1280）   | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/counter-overlap-light-1280.png`                                  | —                                                                              |
| 计数器与满行 CJK（800 窄） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/counter-cjk-narrow-800-light.png`                                | —                                                                              |
| 默认 ~800 宽填写           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/filled-narrow-800-light.png`                                     | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/filled-narrow-800-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（发送钮 hover 零反馈为 R2-2a-A1-03 已知族实例，引用见 §4）A2 pass（textarea focus 边框翻转 primary rgb(35,114,242) + oklab ring，`focused: true`）A3 pass（可交互元素 min(w,h) 扫描零命中；发送钮 48×28）A4 pass（空草稿 `disabled: true`；节点级 disabled 态载体不可达已注明）A5 n/a（loading/Stop 态载体不可达，见裁剪）A6/A8 n/a A7 n/a A9 pass（Enter 提交：probe `__c8SenderSubmit="Hello flux sender"`、草稿清空、焦点回归输入框；无 toast 属 lab notify no-op 已知族备注）
- B 颜色：B1 pass（正文 12.61:1、计数 7.46:1、发送白字 4.6:1）B2 pass（focus ring oklab 非none）B3 pass B4 pass（destructive 计数分支走 token）B5 **warn**（dark：textarea 内文 PNG 采样 ≈14.4:1 过；发送钮 dark bg rgb(77,141,245) 白字 3.26:1 — `--primary` dark 过亮已知族实例，§4 引用；探针 compositor 对 oklab 底失效产出 1.19 假值已弃用，以 PNG 采样为准）B6 pass
- C 布局：C1 **fail(R2-2c-C1-41)** C2 **warn(R2-2c-C2-43)** C3 pass C4 pass（800 宽 `docOverX 0`）C5 n/a C6 n/a
- D 间隔：D1–D6 pass/n/a D7 **fail(R2-2c-D7-44)**（输入区与动作行 0px 贴死）D8 pass
- E 排布：E1 pass（输入面+发送主操作可答）E2 pass E3 pass E4–E6 n/a/pass
- F 一致性：F1–F3 n/a F4 **warn**（发送钮文案"发送"中文上英文宿主 — R2-2a-F4-11 族实例，§4 引用）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2c-C1-41] 多行草稿固定 40px 不自动长高：4 行时前两行被裁出可视区（scrollHeight 96 vs clientHeight 38）

- **页面/路由**: `#/lab/ai-sender`（场景 C8.1；submitType=enter 下 Shift+Enter 换行的所有多行草稿同险）
- **主题/视口/状态**: light / 1280 / 多行输入中
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/multiline-4line-light-1280.png`（框内仅见 "line 3 / line 4"，line 1/2 已滚出）
- **目视描述**: 输入框保持单行高度，连打 4 行后只有末两行可见，前两行内容被裁出可视区，用户看不到自己刚输入的内容。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-sender2.mjs` grow4 段（`clientHeight/scrollHeight/rect.height` + 截图目视确认）
  - 输出: `grow4: { clientH: 38, scrollH: 96, rectH: 40, lines: 4 }`；2 行时 `scrollH 56 > clientH 38` 但 PNG 确认两行尚可见，4 行起裁剪坐实；Textarea 类串 `min-h-[40px] resize-none`（`packages/flux-renderers-ai/src/renderers/ai-sender.tsx` L216）无 auto-grow 逻辑。
- **对照基准**: 检查提示词 C1（无意外裁切）+ IM 发送框行业惯例（iMessage/ChatGPT 输入框随内容长高）
- **严重程度**: P2（多行草稿是 enter 模式的正常用法， composing 中内容不可见直接伤输入任务）
- **用户影响**: 粘贴/换行长草稿时无法核对前文；高度不变造成"内容丢了"的错觉。
- **修复方向**: `ai-sender.tsx` Textarea 增加自动长高（如 `onInput` 时 `el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, maxH) + 'px'`，封顶 ~160px），或 rows 随换行数增长。
- **归族**: local → R2-4 批
- **复核状态**: 已复核（保留 P2，review-a 2026-09-25）

### [R2-2c-A9-42] 原生 maxLength 钳制使"超长 destructive 计数"态经用户输入不可达，且到顶无警示反馈

- **页面/路由**: `#/lab/ai-sender`（场景 C8.1 — fixture 描述明言 "the word limit counter flips to destructive over the cap"）
- **主题/视口/状态**: 双主题 / 全视口 / 输入至 60 字上限
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/overlimit-light-1280.png`（计数 "60/60" 仍为灰色 muted）
- **目视描述**: 打满 60 字后计数器保持灰色 60/60，无任何变色或提示；demo 文案承诺的 destructive 红色态在真实输入下永远看不到。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-sender.mjs` overLimit 段（`keyboard.insertText` 注入 65 字符后读值/样式）
  - 输出: `actualValueLen: 60`、`textareaMaxLengthAttr: "60"`、`countColor: rgb(72,86,106)`（muted，非 destructive）、`submitDisabled: false`；`overLimit = draft.length > maxLength`（L76）仅可经 `component:setSenderDraft` 外部写穿透，键盘/IME/粘贴均被原生 maxlength 钳制。
- **对照基准**: 状态矩阵"值态超长必查"+ R2-2a-F4-83 fixture 承诺落空族（外围）+ R2-2a-A9-64 输入守门静默族形态
- **严重程度**: P3（不阻断任务；上限处零反馈 + demo 承诺态不可达）
- **用户影响**: 用户到顶继续打字无任何感知；demo 声称的警示态无法演示，验收/走查者会误判功能缺失。
- **修复方向**: 二选一并文档化：①改用软上限（去掉原生 maxlength 属性，超出后计数翻 destructive 且禁发送，与 fixture 文案对齐）；②保留硬钳制则 fixture/文档删除 "flips to destructive" 表述，并在到达 `maxLength` 时给出一次性提示（计数变色或 title）。
- **归族**: watch-only → 台账（fixture 承诺落空 + 钳制无反馈，与 A9-64/A9-47 输入边界反馈一致性族相邻）
- **复核状态**: 未复核

### [R2-2c-C2-43] 字数计数器悬浮于输入内容区且无右 padding 预留：满行文本字形与 "60/60" 直接重叠

- **页面/路由**: `#/lab/ai-sender`（场景 C8.1；任何 showWordLimit + 文本触达输入区右缘的组合）
- **主题/视口/状态**: light / 800 窄视口 / 满行 CJK 文本
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/counter-cjk-narrow-800-light.png`（行尾 "测" 字形与 "60/60" 交叠）
- **目视描述**: 计数器绝对定位悬浮在 textarea 内容上层（`absolute bottom-1 right-2`），最后一行文本延伸到右缘时字形直接钻进计数器文字下。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-sender3.mjs`（计数器 rect vs textarea rect 求交 + 截图）
  - 输出: `counterInsideTa: true`、`cntRect { left: 700 }` vs `taRect { right: 739 }`、textarea `paddingRight: 10px`（无计数器宽度预留）；1280 宽 `overlapZone: true`（`_tmp/r2-2c-probes/out-w2-sender2.json` counterOverlap 段）。
- **对照基准**: 检查提示词 C2（无意外重叠）
- **严重程度**: P3（CJK/满行文本下计数与正文交叠，尚可辨认）
- **用户影响**: 长句输入时右下角文字与计数糊在一起，观感差；无功能阻断。
- **修复方向**: `ai-sender.tsx` Textarea 类串补 `pr-12`（为计数器预留宽度），与 reveal/clear 尾缀预留（R2-2a-C1-61 修复面）同一手法。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-2c-D7-44] 输入区与发送动作行 0px 贴死（根容器无纵向 gap）

- **页面/路由**: `#/lab/ai-sender`（场景 C8.1；standalone 使用 ai-sender 的所有宿主同险）
- **主题/视口/状态**: 双主题 / 全视口 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-sender/filled-light-1280.png`（"发送" 钮上缘与输入框下缘贴齐）
- **目视描述**: 发送按钮行紧贴输入框底边，无任何呼吸空隙；在 chat 容器内使用时由父级 `gap-3` 掩盖，standalone 即贴死。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-sender.mjs` narrow 段（根 rect 高度合成校验）
  - 输出: 800 宽 `senderW.h = 68 = 输入框 40 + 动作行 28`（间隙 0）；`styles.css` 无 `.nop-ai-sender` 布局规则（grep 零命中）；根类串仅 `nop-ai-sender` + `props.className`（L194）无 flex/gap。
- **对照基准**: 检查提示词 D7（功能异组兄弟块间隙 <4px 进入发现，0px 无白名单依据）
- **严重程度**: P3（细节 spacing，不影响操作）
- **用户影响**: 输入框与按钮粘连，视觉分层缺失。
- **修复方向**: `ai-sender.tsx` 根类串补 `flex flex-col gap-2`（对齐 `data-slot="ai-sender-actions"` 自身 `gap-2` 的节奏）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **R2-2a-A1-03（default variant 按钮 hover 零反馈）**：发送钮 enabled hover 前后 `bg rgb(28,110,242) → rgb(28,110,242)`、shadow none（`out-w2-sender2.json` hoverDiff），与 button 卡探针输出逐字一致，同根因 `button.tsx` default variant 无 `<button>` 分支 hover 规则。
- **R2-2a-F4-11（i18n zh-CN 回退）**：英文宿主页面发送钮文案渲染中文"发送"（`t('flux.ai.send')`）；loading 态 "停止"/streamingHint 同源（源码 L135-146），可视 chrome 实例。
- **dark 平价/对比度族（R2-4）**：dark 下发送钮 bg `rgb(77,141,245)` 白字 3.26:1（PNG 像素采样，`out-w2-sender2.json` darkSendSamples）——`--primary` dark 过亮（R2-1d 7/7 ai demo 先例）新实例；textarea dark 内文 ≈14.4:1 正常。
- **lab 载体与环境基建族（notify no-op）**：提交反馈仅草稿清空 + 焦点回归，probe 值写入 window 但无 toast（lab env notify 覆写缺失）；渲染器自身反馈通道正常，按族备注不立项。
- **runner dark 列作废声明**：dark 证据全部为自采真 `data-mode` 截图（R2-2a-B5-34 口径）；dark 截图中右下主题选择器仍显示 "light" 为 lab chrome 不同步（族内已知）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-sender` → carded（卡列填本路径）；findings 归族后 → digested。
