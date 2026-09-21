# V8b 研究报告：Word 编辑器视觉补齐

> 核查日期: 2026-09-21
> 基线: master @ 39a2f38ab（V6/plan 476 已收口），工作区与本域零交集
> 输入: 普查报告 §6/§8（`docs/analysis/2026-09-15-visual-quality-deep-survey.md`）、路线图 V8b 行、证据卡 `docs/audits/visual-quality/word.md`、owner doc `docs/components/word-editor-page/design.md`、`docs/architecture/word-editor/design.md`
> 依赖: V0（已 done）、V1（已 done）
> 状态: **待独立核实**（本报告为 fresh-session 深挖产出，所有 文件:行 均经 live 读取核实；独立核实通过前不得进入 plan）

## 0. 勘误与域定位

- **包定位**：实际包为 `packages/word-editor-core`（bridge/数据模型/持久化）+ `packages/word-editor-renderers`（页面/工具栏/面板/对话框）。三方渲染库 `@hufe921/canvas-editor@0.9.130`（core `package.json:10` 声明 `^0.9.130`，node_modules 实装 0.9.130）。canvas-editor 以纯 Canvas 2D 渲染文档纸张，工具栏/面板/对话框为我们的 React 组件。
- **普查口径核对**：①「自有 CSS 仅 15 行」**准确**——包内唯一 CSS 文件 `packages/word-editor-renderers/src/styles.css`，正文恰好 15 行（:1-15）；②「字体/字号硬编码枚举 `toolbar/font-controls.tsx:23-24`，6 字体 16 档」**准确**——`FONTS` 6 项、`FONT_SIZES` 16 项逐一命中；③「无页眉页脚编辑 UI」**成立但需细化**——canvas-editor 内建了 zone 编辑（双击 + 悬停提示，默认 `editable: true`），缺的是我们这一侧的 zone 感知 UI 与 options 配置面，详见 §1 F2。
- **e2e 基数**：word 相关 spec 共 5 个 32 test（`tests/e2e/word-editor.spec.ts` 13、`-dataset` 5、`-template-expr` 7、`-recovery` 6、`-persistence` 1），全部功能型断言，零视觉断言（§1 F5）。
- 消费入口：playground 路由 `#/word-editor`（`apps/playground/src/domain-route-entries.ts:128`，页面壳 `apps/playground/src/pages/word-editor-page.tsx`）；`ThemeSwitcher` 挂全局（`apps/playground/src/App.tsx:399`），word 路由上可直接做 light/dark 双态断言。

## 1. Findings 逐项核实

### F1 字体/字号硬编码枚举（成立，且发现「枚举外值显示空白」缺陷）

- `packages/word-editor-renderers/src/toolbar/font-controls.tsx:23`：`FONTS = ['Microsoft YaHei', 'SimSun', 'SimHei', 'Arial', 'Times New Roman', 'Courier New']`（6 项）；`:24`：`FONT_SIZES = [8,9,10,11,12,14,16,18,20,22,24,26,28,36,48,72]`（16 档）。字体下拉 `:60-72`、字号下拉 `:73-85`，均为 `NativeSelect`。
- **库侧合法域大于枚举域**：canvas-editor 默认 `defaultFont: "Microsoft YaHei"`、`defaultSize: 16`、`minSize: 5`、`maxSize: 72`（canvas-editor dist bundle :4370-4372；`IEditorOption` 同名字段）。即文档元素可携带任意字体串、5–72 任意字号；选区回显取 `curElement.font || defaultFont`（bundle :10033）。
- **新缺陷（初裁并入主交付）**：`NativeSelect` 是原生 `<select>` 薄封装（`packages/ui/src/components/ui/native-select.tsx:9-36`）；受控 value 不在 options 集内时 selectedIndex 落 -1，**显示空白**。因此打开含非枚举字体（如「楷体」）或非枚举字号（如 15）的文档时，工具栏静默丢失状态回显——这不是「少了几个预设」而是「live 数据已存在枚举无法表示的状态」。字号场景尤其实际：枚举步进（28→36→48）之间的任何值都会触发。
- **改造面**：自定义输入可复用 ui 包已导出的 Combobox（Base UI 系，`packages/ui/src/components/ui/combobox.tsx`，`ComboboxInput` 支持自由文本；barrel `packages/ui/src/index.ts:15` 已导出，无 ui 包改动）。命令面已备：`command.executeFont/executeSize`（canvas-editor `Command.d.ts:20-21`），提交通道零新增。现有单测仅 1 条（`font-controls.test.tsx:39` redo/undo 渲染），枚举外值回显无覆盖。
- 备注：字号下拉 onChange `Number(e.target.value)`（:75）——若引入自定义输入需保留数值归一与 min/max 钳制（5–72）。

### F2 页眉页脚（成立：数据全链路已通、内建 zone 编辑已在，缺我们侧的 zone UI 与配置面）

**bridge 透传数据（逐层核实，全部在）**：

| 层          | 证据                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 库数据模型  | `IEditorData { header?, main, footer? }`、`IEditorResult.data` 同构（canvas-editor `Editor.d.ts`）                                |
| 挂载        | `editor-canvas.tsx:66-72` 组装 `{header, main, footer}` 传入 `bridge.mount`；无文档时默认 `header: [], footer: []`（:74-79）      |
| 保存快照    | `document-io.ts` `captureDocumentSnapshot` 读 `value.data.header/footer`（约 :355-370）；`createSavedDocumentData`（约 :318-330） |
| 恢复/规范化 | `normalizeWordDocument`（约 :169-183）；图表/条码占位符扫描同样遍历 header/main/footer（约 :270/:299）                            |
| manifest    | `word-editor-manifest.ts:82-84` 声明 `header`/`footer` array 字段                                                                 |
| 预览        | `preview/doc-preview-page.tsx:25-27` 透传 header/footer                                                                           |
| 契约文档    | `docs/architecture/word-editor/design.md` WordDocument shape（:75-81）                                                            |

**内建编辑能力（已默认开启，非从零引入）**：canvas-editor 默认 `defaultHeaderOption/defaultFooterOption` 均为 `editable: true, disabled: false`（bundle :4207-4213/:4192-4198）；`EditorZone = HEADER|MAIN|FOOTER`（`dataset/enum/Editor.d.ts:24-28`）；悬停页眉/页脚区域显示内建 i18n 提示「双击编辑页眉/页脚」（zhCN bundle :16858-16859、en :16955-16956，渲染于 :17093）；双击切换 zone；命令 `executeSetZone`（`Command.d.ts:104`）；zone 状态监听 `listener.zoneChange`（`Listener.d.ts` `IZoneChange = (payload: EditorZone) => void`）。

**我们侧缺失面（grep 证实）**：

1. 两包 `setZone`/`EditorZone` 消费 **0 命中**——无 zone 切换控件、无当前 zone 指示，页眉页脚唯一入口是画布上不可见的「先悬停才知道能双击」。
2. `bridge.mount` 调 `new Editor(container, data)` **不传 options**（`canvas-editor-bridge.ts:55`）——`IEditorOption.header/footer/locale` 配置面整体不可达。
3. 内建 zone tip 的 locale 跟随 canvas-editor 默认 `locale: "zhCN"`（bundle options 默认值），宿主语言非中文时提示仍为中文——i18n 一致性缺口，随 options 透传一并解决。
4. `flux.wordEditor.*` i18n 命名空间（`flux-i18n/src/locales/zh-CN.ts:913` 起）**无任何页眉/页脚键**；:850-861 的 `regionHeader`/`页眉高度` 等键属 print designer inspector 命名空间，与 word 域无关。

**裁决所需证据小结**：引入成本 = 低（数据面零改动；UI 面 = 工具栏一个 zone 切换控件接 `executeSetZone` + `zoneChange` 回显状态；可选：bridge.mount 增补 options 参数透传 locale）。使用场景 = Word 模板设计器的页眉页脚（文档标题、页码）是文档模板的常规组成，且**现状已可经内建双击写入并随保存持久化**——即「半可用」状态：功能在、可发现性/可控性/一致性缺。

### F3 中文字体族预览核对（结论：font-family 链真实生效，三个已知边界）

- **链路成立**：`getElementFont(el)` = `${italic}${bold}${size*scale}px ${el.font || options.defaultFont}`（bundle :20247-20251），直接进入 `ctx.font`（:10959/:12346/:12376 等十余处渲染点）；另有 DOM 面 `dom.style.fontFamily = element.font || options.defaultFont`（:5207）。选择「SimSun」后画布字形确实按该族绘制，不是仅改工具栏显示。
- **边界 1（客户端字体栈）**：canvas-editor bundle 内 `FontFace`/`document.fonts` **0 命中**——不做任何 web 字体加载，族名完全依赖客户端已安装字体；缺失时 canvas 静默回退到浏览器默认绘制，无提示。枚举内 SimSun/SimHei 为 Windows 字体，mac/Linux 客户端天然缺。该边界不可在域内消除，只能登记。
- **边界 2（无 WYSIWYG 预览）**：下拉项 `NativeSelectOption` 未按各自字体族渲染——用户在选中前看不到各族的字形样貌，与 Word/WPS 字体选择器的逐项预览惯例不符。属我们自己组件的改造面（非库问题）。
- **边界 3（回显缺口）**：见 F1——`selection.font` 可为枚举外字符串，NativeSelect 显示空白；`recoveryRangeStyle` 无选区时回 `defaultFont`（:10091），空态显示正常。

### F4 自有 CSS 与 canvas-editor 默认皮肤的令牌化边界（成立，边界已可划定）

**包内可控面（15 行 + 组件 Tailwind）**：

- `styles.css:1-15`：`.nop-word-editor-page` 上 9 个 `--nop-*` fallback 令牌（`--nop-app-bg/--nop-app-text/--nop-accent/--nop-text-strong/--nop-body-copy/--nop-surface-soft/--nop-border/--nop-nav-surface/--nop-playground-stage-bg`），模式为「自引用 fallback」`var(--nop-x, hsl(var(--语义令牌, 兜底)))`——宿主已定义则让位，未定义则从语义令牌派生。
- 9 个令牌在 src 内**全部有消费**（无死令牌）：`word-editor-page.tsx:115/128/129/135/156/247/318`、`dataset-panel.tsx:130-131`、`template-snippets.tsx:61`、`doc-preview-page.tsx:61-62/89`。
- 契约测试 `styles.test.ts:7-19` 钉住两点：作用域必须在 `.nop-word-editor-page` 而非 `.nop-theme-root`、共享 HSL 片段令牌必须 `hsl()` 包裹后派生——与 owner doc §10（:164）一致。
- 组件层用语义 utility（`bg-background`/`text-muted-foreground`/`border-input` 等，9 文件约 30 处）+ `--nop-*` 直引，无裸 hex 组件样式。

**dark 现状**：两包 `data-mode`/`.dark`/`prefers-color-scheme` **0 命中**（无自有 dark 规则）。dark 依赖令牌间接层：playground `styles.css:62-73`（light 语义令牌）+ `:185/:189`（`[data-mode='dark']` 重调）→ `--nop-*` fallback 与语义 utility 自动翻转。即**包内 chrome 已天然跟随 dark**，前提是不新增绕过令牌的颜色。

**canvas-editor 内部皮肤（第三方，不轻动）**：

- import 时注入 `<style id="canvas-editor-style">`（bundle :1），66 个 `.ce-*` 类，内含大量硬编码浅色（`#e4e7ed` 边、`#fff` 底、`#666` 文字、`#eef2fd` 悬停等）；bundle 全量 hex 126 处。
- 纸张画布 `canvas.style.backgroundColor = "#ffffff"`（:20227）——白纸是文档语义（同 Word），dark 下保持白底**判定为正确行为**，非缺陷。
- 约 30 个带色的 `IEditorOption` 默认值（`defaultColor #000000`、`rangeColor #AECBFA`、`searchMatchColor #FFFF00`、`resizerColor #4182D9`、`marginIndicatorColor #BABABA`、`defaultHyperlinkColor #0000FF`、`underlineColor`/`strikeoutColor` 等）——这是库的**正式配置面**（目前因 bridge 不传 options 而全部走默认），是未来适配的唯一合法通道；禁止 CSS 覆盖 `.ce-*` 或 fork。
- 先例对齐：`--ss-*`（`spreadsheet-renderers/src/canvas-styles.css:1-11`，dark 块 `:50`）、`--fd-*`（`flow-designer-renderers/src/designer-theme.css`）——V6/V5 均未触碰三方内部皮肤，本域同 stance。

### F5 word e2e 视觉断言（成立：32 test 全功能型，零视觉断言）

- 全部 `page.evaluate` 用途为 localStorage 种子/清理与 rAF 等待（`word-editor.spec.ts:4`、`-dataset.spec.ts:8/13`、`-persistence.spec.ts:27`、`-recovery.spec.ts:24/57/70/83/107/139`）；`getComputedStyle`/`screenshot`/颜色断言 0 命中；light/dark 双态 0 覆盖。
- 最接近视觉的断言是 recovery spec 的「selection echo」（`word-editor-recovery.spec.ts:97-103`）：点击 bold 后断 `aria-pressed` true/false——属性级，非计算样式。
- **V0 helper 可复用性（全部直接可用）**：`tests/e2e/helpers/visual-assert.ts` `getComputedStyleValue`(:15)/`expectComputedStyle`(:22)/`expectCssVarResolves`(:37)/`expectComputedStyleNot`(:52)/`captureVisualEvidence`(:81)；`tests/e2e/helpers/canvas-pixel-probe.ts` `probeCanvasPixels`（word 画布为 2d canvas，无 WebGL preserveDrawingBuffer 问题）可断「纸张有绘制」；light↔dark 计算样式翻转先例 `theme-switcher.spec.ts:40-60`；`ThemeSwitcher` 在 word 路由可用（`App.tsx:399`）。画布内联样式（如 `canvas.style.backgroundColor`）可经 `evaluate` 直读。
- 附带发现：`preview/doc-preview-page.tsx` 的 `DocPreviewPage` **未被 barrel 导出**（`src/index.ts` 仅 4 组导出）且全仓无消费点，仅自身单测引用——孤儿组件，页面内实际是文本回显型预览（`word-editor-page.tsx:158-160`）。

## 2. 残余候选（逐项初裁）

| #   | 候选                                                                     | 证据         | 初裁                                                                                                                          |
| --- | ------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| R1  | 字体/字号枚举 + 枚举外值显示空白缺陷                                     | §1 F1        | **并入主交付**（自定义输入 + 回显 fallback 修复，先红后绿）                                                                   |
| R2  | 字体下拉无逐项字体族预览                                                 | §1 F3 边界 2 | **并入主交付**（下拉项按各自 fontFamily 渲染；保真受客户端字体限制，登记已知边界）                                            |
| R3  | 页眉/页脚 zone UI 缺失（无切换/无指示/bridge 不透传 options）            | §1 F2        | **裁决项 A2**（初裁 Fix 最小 zone UI，理由见 A2）                                                                             |
| R4  | 内建 zone tip locale 固定 zhCN                                           | §1 F2.3      | 并入 R3 同 PR（`options.locale` 随 bridge 透传一并接）                                                                        |
| R5  | canvas-editor 内部皮肤 light hex（`.ce-*` 66 类 + IEditorOption 默认色） | §1 F4        | **watch-only / 不轻动**（第三方内部皮肤只核对；合法通道仅 IEditorOption，本域不启用 dark 变体）                               |
| R6  | dark 下纸张仍白、canvas 编辑 chrome（rangeColor 等）浅色调               | §1 F4        | 纸张白底 = **adjudicated 正确语义**；range/search 等 canvas 内配色 dark 表现纳入 A5 断言核对，发现刺眼再走 IEditorOption 微调 |
| R7  | `DocPreviewPage` 孤儿组件（未导出未消费）                                | §1 F5 附带   | **登记处置**（超视觉范围：接线进页面或显式删除，由 plan 二选一；owner doc 补注记）                                            |
| R8  | word e2e 零视觉断言                                                      | §1 F5        | **并入主交付**（A5）                                                                                                          |
| R9  | font-controls 单测仅 1 条                                                | §1 F1        | **并入主交付**（自定义输入/回显先红后绿顺带补齐）                                                                             |

## 3. 裁决

| #   | 项                           | 裁决                                | 要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | 字体/字号自定义输入（R1/R9） | **Fix**                             | 以 ui 包既有 `Combobox`（已导出，零 ui 改动）承载字体与字号：预设（6+16）作为建议项、支持自由输入；枚举外回显 fallback（value 不在预设时原样显示，不空白）；字号数值归一 + 钳制 5–72（canvas-editor minSize/maxSize）；提交仍走 `executeFont/executeSize`。单测先红：含枚举外 font/size 的 selection 渲染须显示原值                                                                                                                                                                        |
| A2  | 页眉/页脚编辑 UI（R3/R4）    | **Fix（最小面）**                   | 工具栏新增 zone 切换（正文/页眉/页脚三态，接 `command.executeSetZone` + `listener.zoneChange` 状态回显，当前 zone 高亮）；bridge.mount 增补可选 options 参数（本 PR 至少透传 `locale` 对齐宿主语言；`header`/`footer` 配置面留到有需求再接）。**显式 deferred**：页码插入控件、页眉高度/顶级偏移配置 UI、watermark（design.md §4 已裁非受支持面）。deferred 理由登记：内建双击编辑已可用，最小面先解决可发现性与一致性，扩展能力待真实场景                                                 |
| A3  | 皮肤令牌化边界（F4/R5/R6）   | **Adjudicated（核对结论，非重构）** | 自有 CSS 维持 15 行 fallback 模式，不新增裸 hex；第三方 `.ce-*` 皮肤与画布内配色**不覆盖、不 fork、不做 dark 重写**；dark 只走既有令牌间接链；`IEditorOption` 是未来唯一合法调色通道。纸张白底登记为正确文档语义。边界结论回写 owner doc §10                                                                                                                                                                                                                                               |
| A4  | 中文字体族预览（R2）         | **Fix**                             | 字体下拉项 `style={{ fontFamily: '<族名>, <回退族>' }}` 逐项渲染；族在客户端缺失时浏览器回退即为现状（登记已知边界，不做字体加载/测量，`document.fonts` 引入超域）                                                                                                                                                                                                                                                                                                                         |
| A5  | e2e 视觉断言补齐（R6/R8）    | **Fix**                             | 新增 word 视觉 spec：①chrome 令牌双态（light/dark 切 ThemeSwitcher，`expectCssVarResolves` + `getComputedStyleValue` 断 `.nop-word-editor-page` 的 `--nop-*` 与工具栏计算样式翻转，沿 theme-switcher.spec 先例）；②canvas 探针（`probeCanvasPixels` 断纸张有绘制 + `backgroundColor` 白底）；③字体/字号链路：e2e 断控件状态回显，元素 font/size 写入断言放单测/集成层（`getValue()` 读回）——canvas 字形保真不做 e2e 判据（浏览器字体栈不可控），登记边界。红线：既有 5 spec 32 test 零回归 |

## 4. 边界

- **不做**：canvas-editor fork/补丁、`.ce-*` CSS 覆盖；页码插入/页眉页脚几何配置/watermark（A2 显式 deferred 项）；`document.fonts` 字体加载；`DocPreviewPage` 重设计（R7 仅显式处置二选一）；word-editor-core 数据结构变更（`WordDocument`/`SavedDocumentData` shape 不动）。
- **硬约束**：`packages/ui/src/index.ts` 公共导出只消费不改动；`styles.test.ts` 两条契约（scoping、hsl 包裹）保持并扩展「禁新增裸 hex」守卫；bridge options 增补必须可选参数、向后兼容（既有 mount 调用零改动）；新增 i18n 键 zh-CN/en-US 双语补齐；renderer 契约（`RendererComponentProps`/标准 hooks）不因 zone UI 引入 ad-hoc context——zone 状态走 editor-store 扩展字段。
- **e2e 红线**：word 5 spec 32 test + playground 既有路由零回归。
- **Owner docs 回写清单**：`docs/components/word-editor-page/design.md`（§10 样式边界注记 + A2 裁决与 deferred 项回写）、`docs/architecture/word-editor/design.md`（若 bridge options 扩展则补 bridge 契约段）、证据卡 `docs/audits/visual-quality/word.md`（F1-F5 裁决/状态回写）、路线图 V8b 行状态、`docs/logs/` 日志。

## 5. 验证方式

1. 单测（先红后绿）：`font-controls.test.tsx` 增枚举外值回显、自定义值提交（executeFont/executeSize 收到归一化 payload）、字号钳制；bridge options 透传断言（locale）；`styles.test.ts` 扩展禁裸 hex 守卫。
2. e2e：新视觉 spec 双态计算样式断言（V0 helper）+ canvas 探针；`pnpm --filter` 维度跑 word 全量 spec 确认零回归。
3. `pnpm check`：`word-editor-renderers` 不在一致性门禁扫描集内（`scripts/audit/find-ui-consistency-gaps.mjs:290` `RENDERER_PACKAGE_SCOPE = /^packages\/flux-renderers-[^/]+\//` 不匹配，与 spreadsheet/flow 同例）——新增硬编码色不会被门禁拦截，防回归依赖 §5.1 的 styles 守卫单测；i18n 新键走既有 `check:i18n-keys`。

## 6. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-21，只读 live 验证，含 canvas-editor 0.9.130 bundle 逐行核对）
- Verdict: `revised` → 勘误回写后 **pass**。F1-F5、R1-R9、A1-A5 全部实质成立（枚举外值静默空白链路逐环证实；页眉页脚全链路行号精确；15 行 CSS/9 令牌/dark 翻转链成立；font-family 链与 document.fonts 零命中证实；ui Combobox 可零改动复用）。已回写勘误：①core package.json 依赖行 :10 → :16；②bundle maxSize:72 在 :4373（非 :4372）；③standalone .ce-\* 类 67 个（unique token 84）；④recoveryRangeStyle 函数体 :10086-10094；⑤ui index.ts 为 5 组 export；⑥font-controls.tsx:128/:136 两处颜色默认 hex 属控件功能默认非组件样式。单测口径：font-controls.test.tsx:39 仅 1 条 redo 按钮断言。
- 已处理: 全部核实确认项

（待独立子 agent fresh session 核实后回写；核实要点：§1 各 文件:行 证据、F1 空白回显缺陷的浏览器行为、F2 zone 内建能力与 listener 面、A2 最小面成本评估、A5 断言可行性。）
