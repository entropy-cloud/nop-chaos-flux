# Web Print P2 — 打印设计器

> Plan Status: completed
> Last Reviewed: 2026-09-06
> Source: `docs/backlog/web-print-roadmap.md`（P2.1–P2.5）、`docs/components/print/design.md`（§8 设计器架构 / §9 marker 约定）、`docs/analysis/web-print-research.md`（交互结论）
> Related: 前置 plan `2026-09-05-2352-1-web-print-p1-infrastructure-plan.md`（completed）；仓库先例 `packages/flux-renderers-dashboard/src/editor/`（editor-core 接入模式）

## Purpose

收口 roadmap P2 全部 5 个工作项：实现打印设计器画布（P2.1，纸张/标尺/网格/拖拽/缩放手柄）、组件面板（P2.2）、属性面板（P2.3）、打印预览（P2.4）、撤销/重做（P2.5，复用 editor-core）。交付后，用户可在 React 环境中加载/编辑打印模板：拖入元素、移动缩放吸附、属性编辑、撤销重做、单页数据预览。

## Current Baseline

- P1 已收口：`flux-print-core` 提供 `PrintTemplateSchema` 全类型、`createEmptyPrintTemplate`、mm↔px↔pt 换算与 `getContentRect`/`getRegionRect`、`validatePrintTemplate`、`bindPrintTemplate`（含 testData 求值，可直接驱动预览）；`flux-print-renderers` 提供 `createDefaultElement`（九类型默认值工厂）与 `PRINT_ELEMENT_RENDERERS` 骨架渲染件（含 `data-print-role` marker）。
- `editor-core` 契约实测：`createEditorCore(adapter, options)` 提供 working/committed 双态、`UndoCommandStack` diff 栈（forward/inverse 对称）、selection、`subscribe/getState`（适配 `useSyncExternalStore`）、事务与 commit policy；`EditorDomainAdapter` 需实现 `kind/load/serialize/validate/diff/applyDiff`（可选 `getDocumentIds` 修剪选区）。
- 仓库内 editor-core 接入完整先例：`packages/flux-renderers-dashboard/src/editor/`（dashboard-domain-adapter + editor-canvas/inspector/palette + use-dashboard-editor-handles）——本计划按同构模式落 `flux-print-renderers/src/editor/`。
- `@nop-chaos/ui` 组件与 `flux-i18n`（`t()` + zh-CN/en-US locales，`check-i18n-keys` 门禁）就绪；React 19（无 useCallback/useMemo 默认项，渲染期推导优先）。
- 交互结论（调研）：pointerdown 时快照原始 frame、move 按快照算增量（vue-print-designer）；吸附目标=边距线/参考线/元素边缘与中心、阈值约 3px（hiprint adsorbMin 3pt 折算）；位移按 zoom 反算（fastprint）；10mm 网格。
- 全仓基线：test 71/71、typecheck/build/lint 39/39 全绿（P1 收口态）；`check:i18n-keys` 为基线既有红（P1 审计实证与主工作树 diff 为空）。

## Goals

- `flux-print-renderers/src/editor/`：`print-domain-adapter.ts`（模板文档 diff/applyDiff）、`use-print-editor.ts`（EditorCore 会话 hook：选中/缩放/增删改/复制粘贴/微移/undo/redo）、`canvas-math.ts`（frame 快照增量、吸附、手柄命中、zoom 坐标换算——纯函数）。
- `print-designer-canvas.tsx`：纸张画布（zoom 缩放、10mm 网格、mm 标尺、边距/页眉页脚辅助区）、元素绝对定位渲染（复用 P1 骨架渲染件）、拖拽/8 向缩放/旋转、点选与框选。
- `print-palette.tsx`：九类型组件面板（拖入画布或点击添加）。
- `print-inspector.tsx`：按元素类型的属性面板（位置尺寸/样式/数据绑定 field·text·source·columns），@nop-chaos/ui 表单组件 + flux-i18n 文案。
- `print-preview.tsx` + `print-designer.tsx`（设计器壳：画布/面板/工具栏组合，工具栏含 undo/redo/缩放/预览/校验入口）；预览为**单页绑定视图**（`bindPrintTemplate` + `testData` → 纸面只读渲染；分页预览与打印输出属 P3/P4，design.md §11）。
- 快捷键：Delete、方向键微移（1mm/Shift 0.1mm）、Ctrl+Z/Y、Ctrl+C/V/D；输入框聚焦跳过。

## Non-Goals

- 不实现分页引擎 `layout.ts`、`render-html.ts`、`print.ts`、`export-pdf.ts`（P3.1–P3.3）；预览不含分页语义。
- 不做 playground 演示页与路由（P4.1–P4.2）、e2e（P4.3）。
- 不实现参考线用户编辑（拖出参考线）、多页模板管理、组合/解组、右键菜单（v2）。
- 不改动 `flux-print-core` 公共导出（若实现中发现必须改，属契约偏差，须回写 design.md 并在 plan 记录）。

## Scope

### In Scope

- `packages/flux-print-renderers/` 新增：`src/editor/{print-domain-adapter.ts, use-print-editor.ts, canvas-math.ts}` + `src/{print-designer-canvas.tsx, print-palette.tsx, print-inspector.tsx, print-preview.tsx, print-designer.tsx}` + 对应 `*.test.ts(x)`；`src/index.ts` 导出更新。
- `packages/flux-print-renderers/package.json`：新增 `@nop-chaos/editor-core`、`@nop-chaos/flux-i18n`（均 workspace:\*）依赖——面板文案消费 `useFluxTranslation`（dashboard 先例同模式），未声明则 Phase 3 编译即失败。
- `packages/flux-i18n/src/locales/{zh-CN.ts,en-US.ts}`：新增 `flux.print.*` 命名空间文案（面板/工具栏/预览）。
- `docs/logs/` 记录。

### Out Of Scope

- P3 渲染链路四文件、P4 playground/e2e、v2 交互（参考线编辑/多页/组合/右键菜单）。
- `flux-print-core` 导出面变更（除非契约偏差，见 Non-Goals）。

## Failure Paths

| 可测场景编号         | 触发                                                          | 行为                                                                                                     | 可重试 | 用户可见表现                |
| -------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | --------------------------- |
| d-drag-out-of-paper  | 拖拽元素超出所属区域（坐标相对 region 原点，见 design.md §4） | 相对坐标 clamp：向上/左不小于 0，向下/右不超出所属 region rect（允许贴 region 边缘，不允许进入相邻区域） | 是     | 元素贴边停止                |
| d-resize-min         | 缩放手柄拖至小于最小尺寸（1mm）                               | 尺寸 clamp 至 1mm，对角手柄保持对角固定                                                                  | 是     | 元素不再缩小                |
| d-empty-undo         | 空栈触发 undo/redo                                            | editor-core noop + console.warn，不抛错                                                                  | 是     | 工具栏按钮禁用态            |
| d-paste-no-clipboard | 空剪贴板 Ctrl+V                                               | 无操作                                                                                                   | 是     | 无变化                      |
| d-preview-bind-fail  | 预览时 testData 缺失绑定                                      | bind 产出空串 + warning 诊断（P1 契约），预览仍渲染，诊断列表显示在预览面板                              | 是     | 预览区域空白占位 + 警示列表 |
| d-invalid-template   | validatePrintTemplate 存在 error 诊断                         | 工具栏校验入口标红计数；不阻断编辑                                                                       | 是     | 校验面板列诊断              |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`建议有测` —— 一般功能；但其中纯逻辑面（canvas-math 吸附/增量/命中、domain-adapter diff/applyDiff 对称性、use-print-editor 会话操作语义）按仓库惯例以 Vitest 单测固化（Proof 项先行或随实现同批落地）；React 渲染件以 @testing-library 冒烟；端到端交互验证归 P4 e2e。

## Execution Plan

### Phase 1 - 编辑会话基座：domain-adapter + use-print-editor（P2.5）

> roadmap 依赖表写 P2.5 依赖 P2.1（撤销重做接线到画布交互）；本计划按架构依赖把会话基座前置为 Phase 1（画布是消费方），roadmap 回写不受影响——P2.1–P2.5 在本计划内全部收口。

Status: completed
Targets: `packages/flux-print-renderers/src/editor/{print-domain-adapter.ts, use-print-editor.ts, canvas-math.ts}`、`package.json`

- Item Types: `Fix | Proof`

- [x] `package.json` 加 `@nop-chaos/editor-core`、`@nop-chaos/flux-i18n` workspace 依赖；`pnpm install`
- [x] Proof：`print-domain-adapter.test.ts`——diff/applyDiff 对称性（`applyDiff(applyDiff(doc, fwd), inv)` 深等于 doc）、add/remove/replace/set-page 四类 op 的 diff 生成、结构化相同返回 null、getDocumentIds 修剪选区
- [x] `print-domain-adapter.ts`：`PrintTemplateDiff`（op: add-element/remove-element/replace-element/set-page/set-name/set-test-data）+ `createPrintDomainAdapter()` 实现 EditorDomainAdapter（validate 委托 `validatePrintTemplate`，error 级拒绝 commit）
- [x] Proof：`use-print-editor.test.ts`（纯控制器直测，无需 DOM）——addElement（默认值工厂+选中+diff 入栈）、updateFrame（替换元素并合并 diff）、deleteSelected、copy/paste（新 id + 偏移 10mm）、nudge（方向键步长）、undo/redo 回到前后状态、zoom 独立于文档
- [x] `canvas-math.ts` 纯函数 + `canvas-math.test.ts`：`screenToPaper`/`screenDeltaToPaper`（client→纸面 mm，含 PX_PER_MM×zoom）、拖拽快照（canvas DragState 内联 pointerdown 起点 frame）、`applyHandleDelta`（8 向手柄增量 + 最小 1mm clamp + 对角固定）、`computeSnap`（网格 10mm / 边距线 / 同区域元素边缘与中心，阈值 3px，Alt 跳过）、`computeRotateAngle`（旋转磁吸 0/90/180/270）

Exit Criteria:

- [x] 三组单测全绿（对称性 9、会话操作 11、吸附/增量数学 10），`pnpm --filter @nop-chaos/flux-print-renderers test` 全绿
- [x] `pnpm --filter @nop-chaos/flux-print-renderers typecheck` 通过

### Phase 2 - 设计器画布（P2.1）

Status: completed
Targets: `packages/flux-print-renderers/src/print-designer-canvas.tsx`

- Item Types: `Fix | Proof`

- [x] `PrintDesignerCanvas`：纸面 div（`mmToPx`×zoom 定宽高，marker 按 design.md §9 全集：`nop-print-canvas`/`nop-print-paper`/`nop-print-element`（`data-print-type`）/`nop-print-region-header|footer|body`）、10mm 网格背景、顶部/左侧 mm 标尺（刻度按 zoom 换算）、边距/页眉/页脚半透明辅助区（getRegionRect + margins）
- [x] 元素渲染：P1 骨架渲染件 + 绝对定位包裹层（left/top/width/height mm→px、rotate、zIndex）+ 选中态描边 + 8 向缩放手柄 + 旋转手柄（点击画布空白取消选中）
- [x] 交互接线：pointerdown 快照 frame → pointermove 增量 + computeSnap → 经 use-print-editor 提交（拖拽结束单条 diff 入栈）；palette 落位（dataTransfer MIME `application/x-print-element`）
- [x] Proof：`print-designer-canvas.test.tsx`——渲染 marker 与元素数、点选/空白取消、拖拽提交后模板更新与 undo 可回退、手柄渲染

Exit Criteria:

- [x] 画布组件可独立渲染一张模板（6 用例：marker/区域辅助线/选中手柄/点选清除/拖拽单步 undo/se 手柄缩放）
- [x] `pnpm --filter @nop-chaos/flux-print-renderers test` 全绿（46/46）；typecheck 通过

### Phase 3 - 组件面板与属性面板（P2.2 + P2.3）

Status: completed
Targets: `packages/flux-print-renderers/src/{print-palette.tsx, print-inspector.tsx}`、`packages/flux-i18n/src/locales/*`

- Item Types: `Fix | Proof`

- [x] `print-palette.tsx`：九类型列表（图标+文案 `flux.print.element.*`），HTML5 dragstart 写 MIME 与默认元素，click 直接添加到画布中心
- [x] `print-inspector.tsx`：未选中显示模板属性（名称/纸张预设/方向/边距/页眉页脚高）；选中元素显示——通用组（region/left/top/width/height/rotate/zIndex）+ 类型组（text: text/field/autoGrow；image: src/field/fit；table: source/columns 编辑（label/field/width/align/aggregate 增删）/repeatHeader/footerAggregate；barcode: value/field/barcodeType/textVisible；qrcode: value/field/level/foreground；line: direction；pageNumber/printDate: format）；样式组（fontSize/textAlign/color/backgroundColor/边框）——@nop-chaos/ui Input/Label/Select/Switch/Field，数值以 mm 为单位双向绑定
- [x] `flux-i18n`：新增 `flux.print.*` key（zh-CN + en-US 同步，`check-i18n-keys` 不得新增红）
- [x] Proof：palette 用例（九项渲染、click 添加、dragstart 数据）与 inspector 用例（模板属性编辑回写、元素 frame/样式/绑定编辑回写、table 列增删）同落 `print-inspector.test.tsx`（执行期合并文件布局）

Exit Criteria:

- [x] 面板/检查器与 locale 文案齐备，单测全绿（编辑回写经 use-print-editor 产生可 undo 的 diff）
- [x] `pnpm --filter @nop-chaos/flux-print-renderers test` 全绿；typecheck 通过；`check-i18n-keys` ❌ 红项与基线一致；初版遗留 16 条 unused `flux.print.*`（9 条 ELEMENT_LABEL_KEYS 静态误报 + 7 条真未用），已在审计修复轮消除：注册 DYNAMIC_KEY_MAPS + 消费 7 key（marginLeft/marginRight/columnWidth/columnAggregate/rowHeight/zebra/designer）

### Phase 4 - 预览与设计器壳（P2.4 收口）

Status: completed
Targets: `packages/flux-print-renderers/src/{print-preview.tsx, print-designer.tsx}`

- Item Types: `Fix | Proof`

- [x] `print-preview.tsx`：Dialog 单页预览——`bindPrintTemplate(working, testData)` → 纸面只读绑定渲染（消费 `BoundPrintElement.text/boundRows`，**不复用 P1 设计态骨架渲染件**，对齐 design.md §3「共享 schema 不共享实现」），诊断列表（warning/error）附于预览底部（Failure Path d-preview-bind-fail）
- [x] `print-designer.tsx`：设计器壳组合（Toolbar：undo/redo 缩放控件/预览/校验入口（error 计数标红，Failure Path d-invalid-template）+ Canvas + Palette + Inspector + Preview），受控 props：`template`（初值）、`onTemplateChange(template: PrintTemplateSchema, serialized: string)`（commit 后回调 working 模板对象与 adapter.serialize 产物），键盘快捷键接线（Delete/方向键/Ctrl+Z/Y/C/V/D，输入框聚焦跳过）
- [x] Proof：preview 用例（绑定渲染、诊断展示、表格行）与壳用例（组合渲染、Delete 删除 + Ctrl+Z 回退、方向键微移、输入态跳过快捷键、palette 点击添加）同落 `print-designer.test.tsx`（执行期合并文件布局）

Exit Criteria:

- [x] 设计器壳单组件即可运行完整编辑闭环（拖入→编辑→属性→undo→预览），69/69 全绿（含 region 偏移/区域 clamp/drop 落位/壳级 drop 单添加回归）
- [x] `pnpm --filter @nop-chaos/flux-print-renderers test` 全绿；typecheck 通过
- [x] `docs/logs/` 记录 P2 收口（docs/logs/2026/09-06.md）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b4d93a95-a418-4dd8-a987-2d62ec302b12）
- Verdict: `pass-with-minors`（round 1 fail：1 Major；修订后按审阅意见直接升级，无需第三轮）
- Rounds: 1（修订即收敛）
- Findings addressed:
  - Round 1 M1（`@nop-chaos/flux-i18n` 依赖缺口，Phase 3 编译必败）→ In Scope 与 Phase 1 package.json 条目已补（含 useFluxTranslation 消费方式）
  - Round 1 m1–m6（P2.5 依赖倒置说明、P3 预览升级 successor 义务落名、预览只读渲染路径点名、onTemplateChange 签名、clamp 基准按 region 原点、§9 marker 全集）→ 全部修复

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（audit round-2 实证的壳级 drop 双添加 F-1 已修复并有壳级回归测试守卫）
- [x] 所有 in-scope confirmed contract drifts 已收敛（audit round-2 实证的区域坐标语义偏差已修复：渲染/拖拽/clamp/预览四处一致按 getRegionRect 区域原点；round-3 数学复核回归测试为真守卫）
- [x] 行为/契约结果已达成（编辑闭环由 69 focused 用例守卫；drop 单添加回归测试与审计探针同构）
- [x] 必要 focused verification 已完成（audit round-3 实跑：包 69/69、全仓 test 71/71、typecheck/build/lint 39/39）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（i18n unused +16 已归零至基线；P3 预览升级义务在 Non-Blocking Follow-ups 显式留任）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md §4.2 pageNumber 示例已于 P1 轮修正；§8/§9 本轮实现与其一致）
- [x] roadmap P2 状态回写（两处同步）：Phase Status 区 `P2. 打印设计器` 行 + Work Items 表 P2.1–P2.5 五行 → `done`（closure audit round-3 approved 后）
- [x] `docs/logs/` 已记录 P2 收口（docs/logs/2026/09-06.md P2 段落 + 两轮修复记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_bbebcbd9，三轮：issues → issues → approved）
- [x] `pnpm typecheck`（39/39）
- [x] `pnpm build`（39/39）
- [x] `pnpm lint`（turbo lint --force 39/39；根 lint 链仅败于基线既有 check:i18n-keys）
- [x] `pnpm test`（71/71 task）
- [x] `pnpm check`（零新增红项：check:i18n-keys ❌ 4 undefined 与基线逐条一致，unused=284=基线且零 flux.print.\*；其余门禁 exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- P3 计划起草时必须包含：将 `print-preview.tsx` 从 P2 单页绑定视图升级为 design.md §8 的分页同源预览（调 core layout + render-html）——防止 P2 单页视图被误当终态造成 contract drift。

## Closure

Status Note: 2026-09-06 收口。P2.1–P2.5 全部落地：编辑会话基座（print-domain-adapter/use-print-editor/canvas-math，复用 editor-core UndoCommandStack）、设计器画布（区域坐标系渲染/拖拽/clamp/吸附/旋转、§9 marker 全集）、组件面板与属性面板（九类型、i18n 88 key 双语）、单页绑定预览与设计器壳（工具栏/快捷键/onTemplateChange）。独立子 agent closure audit 三轮：round-1 提出 2 Major（区域坐标语义偏差、drop 落位未实现）+ 4 Minor，round-2 探针实证壳级 drop 双添加回归 + 3 处未落实，round-3 全部 PASS 判 approved。69 focused 用例守卫；全仓 test 71/71、typecheck/build/lint 39/39、i18n 基线一致零新增。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_bbebcbd9-d805-4763-b99c-232bdedfbbc3）
- Evidence: 三轮审计记录——round-1 issues（issues-1 区域语义契约偏差：渲染/拖拽/clamp 缺 region 原点语义，回归测试缺失；issues-2 drop 落位未实现；issues-3 i18n unused +16 表述不诚实；issues-4/5/6 文本）；round-2 issues（F-1 壳级 drop 双添加——探针实证一次 drop 产生 2 元素；F-2 ELEMENT_LABEL_KEYS 未导出致 DYNAMIC_KEY_MAPS 注册无效；F-3/4/5 文本未落实）；round-3 approved（F-1 壳级回归测试与探针同构、F-2 unused=284=基线零 flux.print.\*、区域语义四处一致且回归测试数学复核为真守卫）。全量证据见 docs/logs/2026/09-06.md。

Follow-up:

- no remaining plan-owned work（P3 计划起草时必须包含 print-preview 单页视图 → design.md §8 分页同源预览升级；jsbarcode 在首个引用它的 Phase 声明——均为后续 plan 义务，非本 plan 债务）
