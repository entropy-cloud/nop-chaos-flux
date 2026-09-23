# [card] control:editor

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/editor` ｜ **载体**: lab 页（5 场景：html 输出 / readOnly / host 编辑提交 bug73 / sanitize 边界 / host link 提交 bug73）
- **矩阵裁剪**: simplified（matrixReason：单 surface 富文本控件；工具栏 15 键、加粗 apply、link 流、readOnly、sanitize 已查；值态含空/初始/改写）。裁掉：图片插入流（与 link 同为 window.prompt 通道，根因同一发现）、disabled（fixture 无）、glass 皮肤。dark 用真 data-mode 自采。

## 1. 截图清单

| 状态                              | light                                                                                                                   | dark（真 data-mode，自采）                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/default-1280-light-viewport.png` / `default-1280-light-fullpage.png`    | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/default-1280-dark-viewport.png`        |
| 输入 + 全选加粗后（B 键激活态）   | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s1-bold-applied-light-1280.png` / `s1-bold-active-state-light-1280.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s1-editor-dark-1280.png`（B 激活深底） |
| link 流：点链接钮后（无 UI 弹出） | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s5-link-dialog-light-1280.png`                                          | —                                                                                      |
| link prompt accept 后锚体         | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s5-after-prompt-accept-light-1280.png`                                  | —                                                                                      |
| javascript: 拒绝反馈条            | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s5-unsafe-link-feedback-light-1280.png`                                 | —                                                                                      |
| link 提交 echo（rel+href 落值）   | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s5-after-link-light-1280.png`                                           | —                                                                                      |
| readOnly（无工具栏、不可编辑）    | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s2-readonly-light-1280.png`                                             | —                                                                                      |
| sanitize 场景渲染                 | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s4-sanitize-light-1280.png`                                             | —                                                                                      |
| 默认 800×900（工具栏折行）        | `_tmp/visual-inspection-2026-09-23/r2-2a/editor/default-800x900-light-fullpage.png` / `s1-toolbar-800x900-light.png`    | —                                                                                      |

## 2. A–H 维度勾选表

- A 交互：A1 pass A2 pass A3 pass（15 个工具栏按钮 30×30，`small:0`）A4 n/a（无 disabled fixture）A5 n/a A6/A8 n/a A7 **warn(R2-2a-A7-84)**：link/image URL 录入走原生 window.prompt，无域内弹层（见发现）；unsafe-link 反馈条 `editor-toolbar-feedback` 正常显示 A9 pass（加粗即时生效 `<strong>`；提交 echo 落值 `MR-LINK:<p><a rel="noopener noreferrer nofollow" …>`
- B 颜色：B1–B4 pass（light/dark 工具栏与内容区均走令牌，dark 内容区深底白字正常——**无弹层白底族命中**）B5 pass B6 pass（B 键激活态有填充底：light 深底 `s1-bold-active-state`、dark 更强对比 `s1-editor-dark`）
- C 布局：C1 pass（1280 三态零命中；800 宽工具栏折行两排无破版、`overX 0`；渲染器容器 overX 329 为 scope-debug JSON 同根因，见 array-editor 卡 R2-2a-C1-81，不另立项）C2–C6 pass/n-a
- D 间隔：D1 pass（工具栏按钮间距一致 30px 档）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（工具栏 ghost 键 vs 内容层级清晰）E3 pass E4 pass（工具栏与内容左缘对齐）E5 pass E6 n/a
- F 一致性：F1 pass F2 n/a F3 pass F4 warn（已知族 F4-11：工具栏"加粗/斜体/…/撤销"全中文、unsafe 反馈"链接地址被拒绝：存在不安全的协议"中文）
- G 设计器：n/a
- H 弹层：n/a（无域内弹层；原生 prompt 见 A7-84）

## 3. 发现条目

### [R2-2a-A7-84] 链接/图片 URL 录入使用原生 window.prompt：无主题弹层面、headless/自动化不可见、与设计系统弹层契约脱节

- **页面/路由**: `#/lab/editor`（S5 场景，工具栏"链接/图片"键；`editor-toolbar-config.ts` L120 `window.prompt(t('flux.editor.linkPrompt'))`）
- **主题/视口/状态**: light / 1280 / 选中文本点击"链接"
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/editor/s5-link-dialog-light-1280.png`（点击后无任何域内 UI 出现）
- **目视描述**: 选中文字点击链接按钮，页面上不出现任何弹层/输入框（原生 prompt 在截图与 DOM 探针中均不可见）；unsafe URL 被拒时工具栏下出现中文反馈条。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w5-editor.mjs`（`linkDialog: null`——`[data-slot=dialog-content]/[role=dialog]/[data-slot=popover-content]` 全查无）+ `_tmp/r2-2a-probes/w5-editor-followup.mjs`（page.on('dialog') accept 后）
  - 输出: accept('https://example.com/ok') 后 `hasAnchor:true, href:"https://example.com/ok"`，echo `MR-LINK:"<p><a rel=\"noopener noreferrer nofollow\" href=…>link me</a></p>"`；accept('javascript:alert(1)') 后 href 保持旧值 + 反馈条"链接地址被拒绝：存在不安全的协议"——安全闸门有效，但入口 UI 是浏览器原生 prompt。
- **对照基准**: 检查提示词 A7/H（弹层完整性——本项目弹层应走 `--overlay-size-*` 契约面）；ui Dialog/Popover 组件契约（AGENTS.md UI 组件强制条款）
- **严重程度**: P3（功能与安全闸门均正常；原生 prompt 无主题、不可定制文案位置、自动化/嵌入式环境不可用）
- **用户影响**: 桌面浏览器内弹出一个与页面风格完全无关的原生对话框；嵌入 webview/自动化环境下面板体验断裂。
- **修复方向**: `editor-toolbar-config.ts` link/image 的 run 回调改为派发域内小弹层（Popover + Input + 确认/取消，复用 `--popover` 令牌），prompt 字符串仅作迁移期回退。
- **归族**: local → R2-4 批（单渲染器交互入口替换）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: 工具栏 15 键全中文（"加粗/斜体/下划线/删除线/一级标题/二级标题/无序列表/有序列表/行内代码/引用/链接/图片/高亮/撤销"），unsafe-link 反馈条中文（`default-1280-light-fullpage.png`、`s5-unsafe-link-feedback-light-1280.png`）。
- **scope-debug JSON 不换行（R2-2a-C1-81 同根因）**: 800 宽下 renderer 容器 overX 329 源自 JSON 面板长串（`default-800x900-light-fullpage.png` 右缘可见裁断），引用 array-editor 卡发现，不重复立项。
- 计划内正面锚点：sanitize 边界（`hasScript:false`、`hasJsAnchor:false`，XSS 红线保持）；readOnly 隐藏工具栏 + contenteditable=false。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-editor` → carded（卡列填本路径）；findings 归族后 → digested。
- 交互键上报：`{"lab-editor":[{"action":"waitFor","ms":800},{"action":"clickText","text":"加粗"},{"action":"waitFor","ms":300}]}`
