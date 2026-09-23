# [card] page:code-editor

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/code-editor` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/code-editor-page.tsx`，CodeMirror 6 renderer）
- **矩阵裁剪**: simplified → 按疑点升级局部 full（14 个编辑器逐节双主题走查 + 全屏弹层/补全/执行三处中间态取证；拖拽不适用；glass 抽查省略——无 glass 专属样式面）

## 1. 截图清单

| 状态                                 | light                                                                           | dark                           |
| ------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------ |
| 默认 1280（首屏）                    | `default-light-1280.png`                                                        | `default-dark-1280.png`        |
| 默认 1280（页尾 colorize 区）        | `default-light-1280-bottom.png`                                                 | `default-dark-1280-bottom.png` |
| ~800 宽                              | `default-light-800.png`                                                         | —（800 布局与 1280 同构单列）  |
| 全页长图                             | `full-light-1280.png` / `full-dark-1280.png`                                    | 同左                           |
| sql-enhanced 区域（工具栏+变量面板） | `region-sql-enhanced-light.png` / `sql-enhanced-light.png`                      | `region-sql-enhanced-dark.png` |
| SQL 补全弹层                         | `sql-completion-slow-typing.png`                                                | —                              |
| JSON 全屏弹层                        | `fullscreen-json-light.png`                                                     | `fullscreen-json-dark.png`     |
| colorize JS dark 取证                | —                                                                               | `colorize-js-dark.png`         |
| focus/lint/运行                      | `focus-expression-light.png` / `lint-error-light.png` / `run-clicked-light.png` | —                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（工具栏 hover 反馈、步进钮 hover）A2 pass（编辑器 focus 后 border+ring 变化，`focused: true` 探针）A3 **warn（A3 族实例：全屏触发钮 24×20）** A4 n/a A5 pass（placeholder 齐全）A6 n/a A7 **fail(A7-51)** A8 n/a（无拖拽）A9 **warn（A9-51 运行无反馈，存环境 stub 疑义）**
- B 颜色：B1 pass（正文 12.6:1）B2 pass B3 pass B4 pass（工具栏 bg 为 color-mix 令牌 `--nop-code-editor-toolbar-*`）B5 **fail(B5-51)** B6 pass
- C 布局：C1 pass（cm-gutter 18/14 为 CodeMirror 内部测量噪声）C2 pass C3 **warn(C3-51 全屏编辑器不涨高)** C4 pass C5 pass C6 n/a
- D 间隔：D1–D6 pass D7 pass D8 **warn(D8-51 空工具条残带)**
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 pass（remote source 编辑器空态可接受）
- F 一致性：F1–F5 pass（补全弹层为 CodeMirror 默认样式，light 下合格）
- G 设计器：n/a
- H 弹层：H1 n/a（全屏覆盖层非阶梯弹层）H3 pass H4 pass（标题+关闭钮）H8 n/a **H-语义 fail 见 A7-51**

## 3. 发现条目

### [R2-1d-B5-51] dark 宿主下编辑器保持 light 主题：colorize 代码不可读、行号槽恒白

- **页面/路由**: `#/code-editor`（Colorized JS / Colorized SQL / 所有编辑器行号槽；全屏弹层同样命中）
- **主题/视口/状态**: dark / 1280 / 默认
- **截图**: `default-dark-1280-bottom.png`（colorize JS/SQL 黑底深字）、`colorize-js-dark.png`、`fullscreen-json-dark.png`（行号槽白色块）
- **目视描述**: dark 宿主下 colorize 编辑器容器变黑但语法配色仍是 light 主题——`console.log(...)` 普通代码近黑色文字压在近黑底上几乎不可见；所有编辑器行号槽保持 `rgb(245,245,245)` 白底 + 白蓝 activeLine，与暗底形成亮条。
- **程序化证据**:
  - 探针: 双主题读 `.nop-code-editor` 的 `data-theme`、`.cm-gutters`/`.cm-activeLineGutter` computed bg、colorize `<pre>` 的 `data-colorize-theme` 与高亮 span 类色（`_tmp/r2-1d-probes/w5-ce-final-out.json`、`w5-ce-struct2-out.json`）
  - 输出: dark 宿主下 `data-theme="light"` 不变；gutter light/dark 同为 `rgb(245,245,245)`、activeLineGutter 同为 `rgb(226,242,255)`；colorize `data-colorize-theme="light"`，容器 bg `rgb(2,8,23)`，light 调色板类 `.ͼ5{color:#404740}`/`.ͼc{color:#219}` 等未切换——普通代码文字对黑底对比度约 1.3–2:1。
- **对照基准**: WCAG 1.4.3；styling-system.md 主题令牌契约（dark 平价）；demo 自带的 `editorTheme:'dark'`（Colorized JSON 正确示范了应有效果）。
- **严重程度**: P1（dark 下代码内容不可读）
- **用户影响**: dark 用户在 colorize 阅读器与全部编辑器行号区看到破损的混合主题；colorize 页近乎不可用。
- **修复方向**: renderer 监听宿主 `data-mode`（或新增 `theme: 'auto'` 缺省）将 `data-theme`/`data-colorize-theme` 同步为 dark；CodeMirror 侧切换到 dark highlight（参照页面内 `editorTheme:'dark'` 已有实现）。
- **归族**: systemic → R2-3 批（嵌入第三方表面的宿主主题同步缺口）
- **复核状态**: 未复核

### [R2-1d-A7-51] 全屏弹层无 dialog 语义、焦点不移入覆盖层

- **页面/路由**: `#/code-editor`（JSON Editor (Fullscreen) 的 `进入全屏`）
- **主题/视口/状态**: light+dark / 1280 / 全屏打开态
- **截图**: `fullscreen-json-light.png`、`fullscreen-json-dark.png`
- **目视描述**: 全屏覆盖层正常铺满（1280×800）、标题+右上关闭 ×（24×24）、ESC 可关；但打开后键盘焦点仍留在 BODY，未进入覆盖层。
- **程序化证据**:
  - 探针: 打开后读 `document.activeElement` 与覆盖层包含关系、`role/aria-modal` 属性（`w5-ce-final-out.json` fsDetail）
  - 输出: `focusedEl: "BODY"`、`focusInOverlay: false`、`ariaModal: null`；覆盖层为 position:fixed 且无 `role="dialog"`（首轮 `[role="dialog"]` 探针 0 命中）。ESC 关闭 ✔。
- **对照基准**: WCAG 2.4.3 焦点管理；WAI-ARIA dialog 模式；H 维度弹层焦点落点判据（A7）。
- **严重程度**: P2
- **用户影响**: 键盘用户触发全屏后焦点仍在被遮住的页面里，Tab 会在不可见区域游走。
- **修复方向**: 覆盖层根节点加 `role="dialog" aria-modal="true"`；打开时 `focus()` 编辑器 `.cm-content` 或关闭钮；关闭后焦点还原触发钮。
- **归族**: local → R2-4 批（与 condition-builder picker 弹层同属「自绘弹层绕过 plan-490 解剖学」模式，汇总可并案）
- **复核状态**: 未复核

### [R2-1d-C3-51] 全屏态编辑器高度不扩展（65px/800px 视口）

- **页面/路由**: `#/code-editor`
- **主题/视口/状态**: light / 1280 / 全屏打开态
- **截图**: `fullscreen-json-light.png`（编辑器仅顶部一条，其余全白/全黑空屏）
- **目视描述**: 全屏覆盖层内编辑器仍保持近乎原高度（实测 65px），下方 90% 面积空白。
- **程序化证据**: 探针输出 `overlayH: 800, editorH: 65`（`w5-ce-final-out.json`）。
- **对照基准**: 全屏模式惯例（编辑器占满可用高度，如 VS Code zen / 各类在线 IDE）。
- **严重程度**: P3
- **用户影响**: 全屏编辑长 SQL/JSON 无额外收益，仍需在小窗口内滚动。
- **修复方向**: `[data-fullscreen]` 态下 `.cm-editor` 高度改 `calc(100vh - header)` 或 flex:1 拉伸。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-D8-51] 无工具栏功能的编辑器仍渲染空工具条残带

- **页面/路由**: `#/code-editor`（SQL Editor / JSON / JavaScript / CSS / Plain Text 等固定高度编辑器）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `default-light-1280.png`（SQL Editor 行 1 上方灰带）、`region-sql-enhanced-light.png`（对照：sqlEnhanced 工具条有按钮属正常）
- **目视描述**: 未启用 format/snippets/variables/execution 的编辑器顶部仍有一条 ~5px 灰带（工具栏容器）。
- **程序化证据**: 探针输出 plain SQL 编辑器内 `[data-slot="code-editor-toolbar"] children: 0, h: 5`（`w5-ce-last-out.json`）。
- **对照基准**: D8 边缘贴死/无意义空壳；C3 分区可辨识（空条无分区语义）。
- **严重程度**: P3
- **用户影响**: 轻微视觉噪声，用户可能误以为存在隐藏功能。
- **修复方向**: 工具栏无子功能时不渲染 `[data-slot="code-editor-toolbar"]`（条件渲染）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-A9-51] 「▷ 运行」点击无可见反馈（存环境 stub 疑义）

- **页面/路由**: `#/code-editor`（SQL Editor (Format + Snippets + Variables + Execution)）
- **主题/视口/状态**: light / 1280 / 点击后
- **截图**: `run-clicked-light.png`（无 toast、无结果面板出现）
- **目视描述**: 点击运行后无 toast、无结果区、无按钮态变化。
- **程序化证据**: 探针: 点击后扫描 `[data-sonner-toast]/[role=status]/[role=alert]` → 0 命中（`w5-ce-final-out.json`）。
- **对照基准**: A9 交互后反馈可见。
- **严重程度**: P3
- **用户影响**: 用户无法判断执行是否发生（demo 环境的 fetcher 为 stub 返回 `{status:0,data:null}`，`showPreview:true` 的结果面板也未出现）。
- **修复方向**: demo env 补一个可返回结果行的 stub；renderer 侧对 `data:null` 也应渲染空结果面板/错误态而非静默。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**本页正例（记录）**: 表达式/SQL 补全均工作（`data.a` → age/amount 友好名、`FROM u` → users+关键字，252px 弹层含描述行）；长按步进外的工具栏 hover 反馈、变量面板折叠钮、`showFriendlyNames` 渲染正常；工具栏色为令牌 color-mix 且随 dark 级联变暗（B4 pass）；~800 视口无溢出。

**族实例确认（一句话，不另立项）**: 全屏触发钮 24×20（span[role=button]，宽踩线高不足）→ R2-1a-A3 族 / R2-1d-A3-01/02 已裁定族；colorize「Colorized JSON (dark)」在 light 页面恒黑底为 schema 有意演示（`editorTheme:'dark'`），不报。

## 4. 台账回写

- 本卡完成后：ledger.md `code-editor` 行 status → `carded`；findings 归族后 → `digested`。
