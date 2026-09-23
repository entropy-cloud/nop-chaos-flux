# [card] page:flux-basic

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/flux-basic` ｜ **载体**: 域页面（playground 参照页，按最高标准走查）
- **矩阵裁剪**: full（参照页升级全矩阵：light/dark × 1280/800、hover/focus/disabled、弹层、异步校验中间态、提交链路）

## 1. 截图清单

| 状态                     | light                                                                                               | dark                       |
| ------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------- |
| 默认 1280×800            | `_tmp/visual-inspection-2026-09-23/r2-1d/flux-basic/default-1280-light.png`                         | `default-1280-dark.png`    |
| 默认 800×900             | `default-800x900-light.png`                                                                         | `default-800x900-dark.png` |
| 底部（表格/分页）        | `bottom-1280-light.png`                                                                             | `bottom-1280-dark.png`     |
| 键盘焦点（A2）           | `kb-focus-light.png`                                                                                | —                          |
| hover（首按钮/表格行）   | `hover-first-button-light.png` / `table-row-hover-light.png`                                        | —                          |
| 弹层打开（Form Preview） | `dialog-open-light.png`                                                                             | `dialog-open-dark.png`     |
| 异步校验中间态           | `validation-typing-light.png` / `validation-error-2.6s-light.png` / `validation-keyboard-light.png` | —                          |
| 提交后                   | `after-submit-dave-light.png` / `after-submit-light.png`                                            | `after-submit-dark.png`    |

## 2. A–H 勾选

- A: A1✔(行 hover 变色 color(srgb .11/.43/.94/0.06)) A2✔(Tab 焦点环可见,kb-focus 截图) **A3✔(仅 1×1 base-ui 隐藏原生 input,误报族)** A4✔(Search Directory disabled+opacity .5) A5✖(A-41) A6 n/a A7✔(弹层有关闭钮/Esc 可关) A8 n/a **A9✖(A-40)**
- B: B1✖(B-42) B2✔ B3✔ B4✔(--nop-\* 宿主变量) **B5✖(B-42)** B6 n/a
- C: **C3✖(C-43)** **C4 族确认(800px docX 61px→R2-3c 候选族)** C5✔
- D: D1✔(字段间隙 16px 等距) D3✔(行高 55/55/54.5) D5✔(字段组 16px) D6✔(分页条与表格间距正常)
- E: E1✔(三问可答) E4✔ E5✔
- F: **F4 warn(F-44 中英混用)**
- G n/a ｜ H: H1✔(弹层 560px=base 档) H3✔(130px 小弹层) H4✔ H5✔(单主按钮) H7✔

## 3. 发现条目

### [R2-1d-A-40] Submit Form 主操作静默失败

- **页面/路由**: `#/flux-basic`（user-form，填 dave/dave@example.com 后点击 Submit Form）
- **主题/视口/状态**: light / 1280 / 提交后 1.8s
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/flux-basic/after-submit-dave-light.png`
- **目视描述**: 点击主提交按钮后表格无新行、无 toast、无任何错误提示，页面像没反应。
- **程序化证据**: 探针=`window.__NOP_DEBUGGER_API__.getInteractionTrace({inferFromLatest:true})`；输出=`anchorEvent {kind:"error", summary:"action error", detail:"{ok:false,error:{},componentId:'user-form',componentType:'form'}"}`；DOM 侧 rows=3 不变、`[role=alert]/[data-slot=field-error]` 为空、toast 为空。
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；页面文案明示"Submit the user form to append a record"。
- **严重程度**: P1（参照页主路径静默失败；错误仅进 debugger 事件流）
- **用户影响**: 用户提交表单后无法区分"成功/失败/未点击"，演示的核心闭环不可完成。
- **修复方向**: 页面 env.notify 对 error 级别 surfaced 到 toast（demoEnv 现仅 console.info）；或 form action 错误接入 `onActionError` 的用户可见出口；并排查 `ok:false` 的 fetcher 侧根因（/api/users 分支 scopeData 读取）。
- **归族**: systemic → R2-3 批（action error 用户侧静默面，疑跨页）
- **复核状态**: 未复核

### [R2-1d-A-41] 异步用户名唯一性校验无任何反馈

- **页面/路由**: `#/flux-basic`（username 字段，schema `validate.api=/api/validate-username`，validateOn:[blur,change] debounce 500）
- **主题/视口/状态**: light / 1280 / 键盘输入 alice（已存在用户）+ blur 后 2.5s
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/flux-basic/validation-keyboard-light.png`
- **目视描述**: 字段填入已存在的 alice，等待远超 debounce+delay 后字段下方无任何错误文案。
- **程序化证据**: 探针=`document.querySelectorAll('[role="alert"],[data-slot="field-error"])` 全文匹配 /already|taken|available/；输出=空数组（pressSequentially 逐键输入 + blur 两种路径复测一致）。field-frame.tsx L276 的 field-error span 未渲染。
- **对照基准**: A5/A9；页面文案明示"validates on blur, debounces async uniqueness checks for 500ms"。
- **严重程度**: P1（宣传的校验行为整体缺失）
- **用户影响**: 用户无法得知用户名重复，提交才可能（静默）失败，与 A-40 叠加成死路。
- **修复方向**: 排查 flux-form `validate.api`+debounce 在该 schema 下的执行链（是否 requestAdaptor 表达式取值失败被吞）；修复后补 e2e。
- **归族**: systemic → R2-3 批（终裁随 review-b：lowering 层只认 `validate.action`，AMIS 风格 `validate.api` 被静默忽略——flux-compiler/validation-lowering 零分支坐实，通用层缺陷；原条件升格已触发）
- **复核状态**: 未复核

### [R2-1d-B-42] dark 下白底 demo 卡片近白文字 1.06:1

- **页面/路由**: `#/flux-basic`（Key-value child cells / Array child items 两张 schema 卡）
- **主题/视口/状态**: dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/flux-basic/after-submit-dark.png`（下半屏）
- **目视描述**: 两张卡保持纯白底，卡内 "Metadata cells"/"Reviewers" 标签与输入文字已切到 dark 前景 token，白上白不可读。
- **程序化证据**: 探针=getComputedStyle 对照；输出=`span "Metadata cells" color rgb(248,250,252) on bg rgb(255,255,255)`（卡根 `nop-container ... bg-white border-gray`），对比度≈1.06:1；键/值/Reviewer input 同白字叠白卡。
- **对照基准**: WCAG 1.4.3；R2-4 dark 平价族（已知 --secondary 破损之外的新实例：schema 字面 bg-white vs token 文字）。
- **严重程度**: P1（参照页 dark 关键标签不可读）
- **用户影响**: dark 用户在参照页直接看到破面，动摇"正确用法"基准。
- **修复方向**: fluxBasicPageSchema.json 中 demo 卡去掉字面 `bg-white`，改语义 surface token（bg-card）或双主题显式类。
- **归族**: systemic → R2-4 批（dark 平价，schema 字面色实例）
- **复核状态**: 未复核

### [R2-1d-C-43] 1280 桌面右侧 385px 永久空列

- **页面/路由**: `#/flux-basic`（flux-basic-page.tsx L267 stage 外层 grid）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/flux-basic/bottom-1280-light.png`（右侧空白带）
- **目视描述**: section 宽 1100px，内容 stage 卡仅 634px，右侧约 385px 恒空。
- **程序化证据**: 探针=section/stage getBoundingClientRect；输出=`section{x:90,w:1100} stage{x:131,w:634} rightBlankW:385`；源码 `lg:grid-cols-[minmax(0,2fr)_minmax(280px,360px)]` 仅挂一个子节点。
- **对照基准**: C3 主轴结构/主内容占比。
- **严重程度**: P2
- **用户影响**: 桌面端页面长期半空，观感"没做完"。
- **修复方向**: 单子节点时改单列（去掉第二列模板），或补第二列（monitor 面板）实际内容。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-F-44] 同屏中英文混用（P3）

- **页面/路由**: `#/flux-basic`（分页条/添加项/弹层按钮 vs 全英文页面 copy）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `bottom-1280-light.png`（"每页行数:"/"第 1-3 条, 共 3 条"/"+ 添加项"）、`dialog-open-light.png`（"Close Dialog"）
- **目视描述**: 英文界面内混入中文分页文案与中文按钮，且弹层内有 "Close Dialog"（英文）双语义按钮。
- **程序化证据**: 探针=body innerText 抽样；输出=`每页行数 / 第 1-3 条, 共 3 条 / + 添加项 / Submit array demo` 同屏。
- **对照基准**: F4 术语与文案一致。
- **严重程度**: P3
- **用户影响**: 观感粗糙，不影响任务。
- **修复方向**: schema 内 demo 文案统一语言（或接 i18n 键）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 误报排除 / 族确认

- 1×1 无类 INPUT×8：base-ui 控件隐藏原生 input（opacity-0 族误报，勿立）。
- `nop-field`/checkbox/radio/switch 上 clipY 7–8px、clipX 12px：`overflow: visible` 下的计算溢出（peer 结构），无可见裁切，勿立。
- 程序化 `el.focus()` 读不到 ring：`el.focus()` 不触发 `:focus-visible` 的探针假象；键盘 Tab 后 focusVisible=true、ring 可见（kb-focus-light.png），A2 实际 pass。
- 800px docX 61px：已知"窄视口 flex/固定壳层（R2-3c 候选）"族确认，不重复立项。
