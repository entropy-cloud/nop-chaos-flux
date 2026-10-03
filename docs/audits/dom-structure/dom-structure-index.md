# DOM 结构审计卡汇总索引（dom-structure-index）

> 建成：2026-10-03（路线图全部 work item 收口时，模式同 `per-component/pc-index.md`）
> 驱动方：`docs/backlog/dom-structure-audit-roadmap.md`（W0–W9 全部 done）
> 清单与卡模板：`docs/audits/dom-structure-checklist.md`（v1）
> 契约 owner doc：`docs/architecture/renderer-markers-and-selectors.md`

## 总览

- **132 张审计卡**，覆盖 9 个渲染器包的全部 renderer type（基本卡按包计数见下）。
- 每卡六维判定：D1 根身份（nop-\<type\> + data-renderer + data-cid）/ D2 根自然性 / D3 包装付租 / D4 区域 data-slot / D5 无自带 frame / D6 canvas a11y。
- 判定分布口径：`pass` / `fix`（已落地）/ `exempt`（豁免理由落卡）/ `n-a`（结构性/null-render/非 canvas）。
- 每包冻结契约测试：`dom-structure-contract.test.*`（basic 16 / form 10 / form-advanced 5 / data 4 / layout 5 / content 4 / mobile 3 / scheduling 3 / ai 2 = 52 用例，另 flux-react stamp/a11y 层 12 用例）。

## 按包索引

| 包 | Work Item | Plan | 卡数 | 关键整改 | 关键豁免口径 |
| --- | --------- | ---- | ---- | -------- | ------------ |
| flux-react（共享层） | W0 | 527 | — | `data-renderer` stamp 通道（Provider 链下钻 + wrap:true 跳过 + WeakMap 身份）、frame `nop-frame-${anchor}`、共享断言 helper | data-cid 不由 stamp 补（唯一性） |
| flux-renderers-basic | W1 | 528 | 18 | button 根标记、command-palette 自盖章、portal/surface 口径 | structural/null-render 五 type、leaf D4 |
| flux-renderers-form | W2 | 529 | 30 | 注入链精化、hidden stamp | unwrap 显式退出、字段族 class 命名 |
| flux-renderers-form-advanced | W3 | 530 | 19 | array-editor/key-value 行链、upload ul/li、editor 边框层、variant-field rendererType | transfer/condition-builder/icon-picker 布局层 |
| flux-renderers-data | W4 | 531 | 13 | td[data-field] 六分支（owner-doc drift 补实现）、crud-toolbar-row | 日期族 D4 testid 口径、data-source null-render |
| flux-renderers-layout | W5 | 532 | 9 | responsive 根 slot、resizable forced wrapper 归因 | collapse padding 层、steps/timeline 双标签根 |
| flux-renderers-content | W6 | 533 | 20 | carousel-item-frame、diff-view three-column 根 slot | vendor 双 div forced wrapper、卡片壳层 |
| flux-renderers-mobile | W7 | 534 | 5 | 无（全合规） | notice-bar 动画层（已带 slot） |
| flux-renderers-scheduling | W8 | 535 | 4 | kanban/calendar role=application+i18n label、gantt-layout 单根标记 | gantt 保留 grid 命令式语义层、barcode-input D6 n-a |
| flux-renderers-ai | W9 | 536 | 14 | 无（全合规） | ai-message-list wrap 定位层、watch-only 三项 |

## 卡片清单（132）

- **basic（18）**：badge button command-palette container dialog drawer dynamic-renderer flex fragment icon keyboard loop page reaction recurse scope-debug tabs text
- **form（30）**：button-group-select checkbox checkbox-group date-range fieldset form hidden input-city input-color input-date input-datetime input-email input-file input-image input-month input-number input-password input-quarter input-signature input-text input-time input-year markdown-editor radio-group rating select slider switch textarea user-select department-select verification-code
- **form-advanced（19）**：array-editor array-field combo condition-builder detail-field detail-view editor icon-picker input-file input-image input-table key-value object-field picker tag-list transfer tree-select variant-field
- **data（13）**：batch-bar chart crud data-source echarts list pagination query-filter sparkline stat-tile statistics table tree
- **layout（9）**：button-group collapse dropdown-button grid resizable responsive steps timeline wizard
- **content（20）**：alert audio card cards carousel diff-view empty html image json-view link mapping markdown progress qrcode result separator spinner status video
- **mobile（5）**：countdown infinite-scroll notice-bar pull-refresh swipe-cell
- **scheduling（4）**：barcode-input calendar gantt kanban
- **ai（14）**：ai-attachments ai-bubble ai-chat ai-citations ai-conversations ai-feedback ai-message-list ai-prompts ai-sender ai-suggestions ai-token-usage ai-tool-call ai-voice-input ai-welcome

## Non-Blocking Follow-ups（跨包汇总）

- echarts 数据派生可访问名 + sr-only 数据等价物（对齐 chart 模式）
- alert close 按钮 testid 改 `${testid}-close` 派生
- `data-psid` 旧锚定通道退役评估（待下游确认）
- watch-only 三项（ai 包：bubble shape / suggestions overflowMode 默认不一致、tool-call decided Badge 选择器缺口）
