# [card] page:xlang-debug

- **批次**: FM-5 渲染面复检 · shard1（新增页全量，重点审：CodeMirror 渲染面） ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/xlang-debug`（domain 路由） ｜ **载体**: 域页面（XLang 在线调试演示，plan 621 Phase 2 M4）
- **矩阵裁剪**: simplified（matrixReason：default 视图四态矩阵 + live 定向取证；连接成功后的编辑器面（CodeMirror）经 token 门控进入，用 demo-token 实探取证。裁掉：调试指令交互全链路（需后端 WS 网关）、元素态抽样）

## 1. 截图清单

| 状态                                  | light                                                                                                                                                                                            | dark                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 默认 1280×800（token 门控态）         | `_tmp/visual-inspection-2026-10-18/xlang-debug-default-1280x800-light.png`（矩阵，lazy 加载中）；settled 取证 `_tmp/visual-inspection-2026-10-18/xlang-debug-default-1280x800-light-settled.png` | `_tmp/visual-inspection-2026-10-18/xlang-debug-default-1280x800-dark.png` |
| 默认 800×900（token 门控态）          | `_tmp/visual-inspection-2026-10-18/xlang-debug-default-800x900-light.png`                                                                                                                        | `_tmp/visual-inspection-2026-10-18/xlang-debug-default-800x900-dark.png`  |
| 连接后编辑器面（1280×800，live 取证） | `_tmp/visual-inspection-2026-10-18/xlang-debug-editor-light.png`                                                                                                                                 | `_tmp/visual-inspection-2026-10-18/xlang-debug-editor-dark.png`           |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 fail(FM5-S1-A-3 控件无可辨态) A3 pass(按钮 96×24 达标) A4 warn(连接按钮禁用态仅靠浏览器默认灰) A5 fail(FM5-S1-E-1 下半区空无引导) A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass(门控态文字可读) B2 fail(FM5-S1-A-3 输入框无边框不可辨) B3 pass B4 fail(FM5-S1-B-4 编辑器未走令牌) B5 fail(FM5-S1-B-4) B6 n/a
- C 布局：C1 pass C2 pass C3 warn(连接后无页头/标题，画面突兀) C4 pass C5 pass C6 n/a
- D 间隔：D1 fail(FM5-S1-A-3 工具行无间距体系) D2 fail(同上) D3 n/a D4 fail(同上) D5 n/a D6 n/a D7 warn D8 pass
- E 排布：E1 fail(FM5-S1-E-1) E2 n/a E3 n/a E4 n/a E5 n/a E6 fail(FM5-S1-E-1)
- F 一致性：F1 fail(同页控件与全站 ui 组件语义不一致) F2 n/a F3 n/a F4 pass F5 n/a
- G 设计器：n/a ｜ H 弹层：n/a

## 3. 发现条目

### [FM5-S1-B-4] dark 模式 CodeMirror 编辑器未做主题适配：浅色行号槽嵌在深色编辑器内

- **页面/路由**: `#/xlang-debug`（输入任意 token 连接后的 xlang-debug-editor 渲染面）
- **主题/视口/状态**: dark / 1280×800 / 编辑器挂载态
- **截图**: `_tmp/visual-inspection-2026-10-18/xlang-debug-editor-dark.png`
- **目视描述**: 深色页面上，编辑器行号槽为亮灰底（#f5f5f5）深字，代码区为透明底浅字，整块编辑器呈"左亮右暗"割裂；代码文本无语法高亮（单色）。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-xlang-editor-dark.mjs`
  - 输出: dark 下 `gutterBg=rgb(245,245,245) gutterColor=rgb(108,108,108)`，`cmBg=rgba(0,0,0,0)`，`contentColor=rgb(230,236,243)`；light 下同结构（`gutterBg=rgb(245,245,245)`，contentColor=rgb(33,53,71)）。两态 gutter 恒亮 = 未接主题。
- **对照基准**: WCAG 1.4.11（UI 组件边界对比，深浅割裂虽可读但明显破相）；theme-compatibility.md（组件须双态走令牌）；检查提示词 B5 dark 专有缺陷（纯白底块）
- **严重程度**: P1
- **用户影响**: dark 模式下新增渲染面（CodeMirror 编辑器）观感为"未完成/坏掉"；行号槽与代码区割裂直接可感。
- **修复方向**: 为 `packages/flux-xlang-debug` 的编辑器接入双态 CodeMirror theme（EditorView.theme 以 `--nop-*` surface/border/token 生成，或引入 oneDark 类主题并按 `data-mode` 切换）；语法高亮至少接基础 language bundle。
- **归族**: systemic 候选 → R2-3 批（编辑器族 dark 适配，与本仓 code-editor 页口径对齐后统一修）
- **复核状态**: 未复核

### [FM5-S1-A-3] token 门控表单与调试工具条为裸元素零样式：按钮无可供性、输入框无边界

- **页面/路由**: `#/xlang-debug`（连接前门控态 + 连接后调试工具条）
- **主题/视口/状态**: light + dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/xlang-debug-default-1280x800-dark.png`（门控态裸样式）；`_tmp/visual-inspection-2026-10-18/xlang-debug-editor-light.png`（工具条裸样式）
- **目视描述**: ①门控态："连接调试会话"渲染为无边框无底色的纯文本（不像按钮），access token 输入框透明无边框（不知道哪里可输入）；②连接后：`继续 暂停 步入 步过 出 运行到光标 禁用断点`、`变量 调用栈 日志`、`未挂起` 全部渲染为连续纯文本行，无按钮态、无分组、无间距体系。
- **程序化证据**:
  - 探针: `_tmp/fm5-walk1-xlang-probe.mjs`
  - 输出: 连接按钮 `bg=rgba(0,0,0,0), border=0px, classes=""`；输入框 `border=0px solid, bg=rgba(0,0,0,0), h=24`。源码：`apps/playground/src/pages/xlang-debug-page.tsx:40-53` 原生 `<input>/<button>` 仅 inline style；工具条同属 `flux-xlang-debug` 渲染器内裸元素。
- **对照基准**: AGENTS.md「MANDATORY: UI Component Usage」（禁用裸 HTML 元素，须用 @nop-chaos/ui 的 Button/Input）；WCAG 1.4.11（输入框边界不可辨）
- **严重程度**: P2
- **用户影响**: 用户无法辨认连接按钮是可点击控件、找不到输入位置；调试工具条各指令无按钮反馈。演示页主流程（输入 token → 连接）在视觉上不可操作。
- **修复方向**: 门控表单改用 `@nop-chaos/ui` 的 `Input` + `Button`（variant=default，附 helper 文案"任意字符串即可进入演示"）；调试工具条改用 `ButtonGroup`/`Tabs` 组件并接令牌。源文件：`apps/playground/src/pages/xlang-debug-page.tsx`、`packages/flux-xlang-debug/src`（工具条渲染器）。
- **归族**: local（单页 + 单渲染器；但裸元素violates ui 契约，修复时按 systemic 检查 flux-xlang-debug 全包）
- **复核状态**: 未复核

### [FM5-S1-E-1] 连接后页面下半区整体空白，无空态引导；页头缺失

- **页面/路由**: `#/xlang-debug`（编辑器挂载态）
- **主题/视口/状态**: light + dark / 1280×800 / 编辑器挂载态
- **截图**: `_tmp/visual-inspection-2026-10-18/xlang-debug-editor-dark.png`
- **目视描述**: 编辑器（119px 高）与工具条集中在上 240px，其余 ~550px 全空白；变量/调用栈/日志三个面板入口为裸文本且无面板占位；页面无标题/返回导航。
- **程序化证据**: settled 截图 + `cmRect h=119`（探针输出）[visual-only]（面板预期形态归渲染器作者）
- **对照基准**: E1（首屏三问）/ E6（空态有任务引导）/ A5（empty 有意义提示非空白）
- **严重程度**: P3（演示页；WS 网关未连通时面板无数据可显属预期）
- **用户影响**: 页面像渲染了一半；三入口可点性不可辨。
- **修复方向**: 面板区加空态占位（"未连接调试会话"提示 + 连接引导）；页头补标题与返回。
- **归族**: local
- **复核状态**: 未复核

### 误报排除记录（本页）

- 矩阵 light-1280 截图为居中 Spinner：live settle 后渲染门控表单（`xlang-debug-default-1280x800-light-settled.png`），lazy chunk 采集时序伪影。
- 编辑器连接后无报错（WS 网关 /ws/xlang-debugger 不存在）：console 探针 clean，状态停留"未挂起"，属演示预期，不计噪音发现。

## 4. 台账回写

- 本卡完成：ledger 对应行 → `carded`（card = `docs/analysis/fm5-render-recheck/cards/page:xlang-debug.md`）；P1/P2 修复后复检 → `verified`。
