# 478 视觉质量 V8b：Word 编辑器视觉补齐 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V8b-word-editor.md`（独立核实 revised → 勘误回写后 pass）、`docs/backlog/visual-quality-roadmap.md` V8b、`docs/components/word-editor-page/design.md`、`docs/architecture/word-editor/design.md`
> Related: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`（V0 helper 双态断言先例）

## Purpose

把路线图 V8b 收口：字体/字号自定义输入（解 `toolbar/font-controls.tsx:23-24` 硬编码枚举 + 枚举外值静默空白回显缺陷）+ 字体下拉逐项 fontFamily 预览；页眉页脚最小 zone UI（数据链路已全通，缺我们侧切换/指示 UI）；自有 CSS 与 canvas-editor 皮肤令牌化边界核对落卡；word e2e 视觉断言补齐。

## Current Baseline

- **枚举回显缺陷（研究核心发现，比普查"少预设"更实质）**：`font-controls.tsx:23-24` 6 字体/16 档（8…72）为 NativeSelect 薄封装（ui native-select.tsx:10-34 原生 select）；canvas-editor 合法域为任意字体串 + 5-72 任意字号（bundle :4370-:4373）；`editor-canvas.tsx:102-103` 将 payload.font/size 原样入 store（editor-store.ts:13-14 无归一）——打开含枚举外值（字号 15、字体「楷体」）的文档时 `selectedIndex=-1` 工具栏**静默显示空白**（HTML 标准行为）。单测现状：font-controls.test.tsx:39 仅 1 条 redo 按钮断言。
- **页眉页脚半可用**：数据链路全通——editor-canvas.tsx:66-72 挂载 {header,main,footer}、document-io.ts 快照/恢复（:337 起/:359-361/:314/:166/:270/:299）、manifest :82-84、preview :25-27；canvas-editor 内建 zone 编辑默认开启（defaultFooterOption bundle:4192-4198/defaultHeaderOption :4207-4213 均 editable:true；双击切 zone bundle:8537/:8849-8850；executeSetZone=Command.d.ts:104；listener.zoneChange=Listener.d.ts:44）；**我们侧零消费**（setZone/EditorZone/zoneChange 两包 grep 0 命中）；`canvas-editor-bridge.ts:55` new Editor 不传 options——内建 tip 固定 zhCN（bundle:4367）不受宿主 i18n 控制。
- **皮肤边界**：自有 CSS 恰 15 行（styles.css:1-15）、9 个 `--nop-*` 令牌全部有消费（styles.test.ts:7-19 契约在）；dark 零自有规则但经令牌间接链自动翻转（playground styles.css :185/:189）；第三方 `.ce-*` 皮肤 67 类（注入 CSS 含 126 处 hex）**不轻动**——`IEditorOption`（defaultColor/rangeColor/searchMatchColor 等）是唯一合法调色通道；纸张白底（bundle:20227）为正确文档语义。
- **font-family 链真实生效**：getElementFont（bundle:20247-20251）写 ctx.font（:10959 等 15+ 处）+ DOM 面 :5207；`document.fonts` 零命中——完全依赖客户端字体，SimSun/SimHei 缺失环境静默回退（预览核对结论：选择即生效，渲染保真受环境字体限制）。
- **e2e**：5 spec 共 32 test，`getComputedStyle/toHaveCSS/screenshot` 零命中；V0 helper（visual-assert.ts）与 theme-switcher.spec 先例可复用。
- ui 包 Combobox 已导出（packages/ui/src/index.ts:15）可零 ui 改动复用。

## Goals

- 字体/字号控件升级 Combobox：自由输入（钳制 5-72 / 任意字体串）+ 枚举外值回显修复（当前值不在预设集时正确显示）+ 字体项逐项 fontFamily 预览。
- 页眉页脚最小 zone UI：页眉页脚 zone 切换按钮组（主文档/页眉/页脚）+ 激活态指示（listener.zoneChange 必需状态源）；bridge options 透传（locale 跟随宿主 i18n）；扩展能力（zone 高度拖拽等）deferred 落卡。
- 皮肤边界核对结论落 owner doc（A3：第三方 `.ce-*` 不轻动、IEditorOption 唯一通道、纸张白底语义）。
- e2e 视觉断言：字体值回显、zone 切换指示、双态（light/dark）工具条面（V0 helper）。

## Non-Goals

- `.ce-*` 皮肤 hex 清理（第三方内部分层）；zone 高度可视化拖拽、页眉页脚内容结构化编辑器（deferred）；document.fonts 字体加载检测；word 导出/打印视觉。

## Scope

### In Scope

- `packages/word-editor-renderers/src/toolbar/font-controls.tsx`（Combobox 升级 + 回显 + 预览）、`editor-canvas.tsx`/`canvas-editor-bridge.ts`（options 透传：locale）、`word-editor-page.tsx`（zone 切换 UI 挂载点）、`packages/word-editor-core`（editor-store zone 扩展字段 + canvas-editor 类型再导出）、对应单测扩展；`tests/e2e/word-editor*.spec` 视觉断言扩展；owner docs（word-editor-page/design.md、word-editor/design.md、证据卡 word.md、roadmap、daily log）。

### Out Of Scope

- packages/ui 公共导出变更（Combobox 现状复用）；canvas-editor 升级/换库；zone 内容结构化编辑。

## Failure Paths

| 场景                 | 触发                        | 行为                                                                     | 可重试 | 用户可见表现     |
| -------------------- | --------------------------- | ------------------------------------------------------------------------ | ------ | ---------------- |
| invalid-font-input   | 用户输入空串/超长字体串     | 输入钳制为非空 trim；空串不提交（保持原值）                              | 是     | 工具栏维持原显示 |
| size-out-of-range    | 输入 <5 或 >72              | 钳制到 [5,72]（与 canvas-editor maxSize 一致）                           | 是     | 工具栏显示钳制值 |
| zone-api-absent      | executeSetZone 在库版本缺失 | zone 按钮禁用态 + title 提示，不抛错                                     | 否     | 按钮置灰         |
| editor-options-order | options 透传时序            | locale 在 Editor 构造时一次性传入，切换宿主语言不热更（登记 watch-only） | 否     | tip 语言需刷新   |

## Test Strategy

档位选择：**必须自动化**——回显修复与 zone UI 是用户可感知行为（先红后绿单测）；e2e 双态断言消费 V0 工具链。

## Execution Plan

### Phase 1 - 字体/字号 Combobox + 回显修复

Status: completed
Targets: `font-controls.tsx`、单测

- Item Types: `Proof | Fix`

- [x] Proof：单测先红——①受控 value 为枚举外字号（15）时输入框显示 15（现状空白）；②枚举外字体（「楷体」）同理；③自由输入提交后 executeSize 收到钳制后 payload（5-72；store 回显走 rangeStyleChange 通道）
- [x] Fix：font/size 控件升级为 ui Combobox（可自由输入 + 预设列表；自由文本需显式 Enter/blur 提交路径——onValueChange 仅列表项触发；枚举外回显沿 field-select buildItems 注入先例）；字体项逐项 fontFamily 预览（ComboboxItem children 注入 style）；回显 fallback（当前值不在预设集时作为自由值显示）；size 输入钳制 [5,72]
- [x] Fix：单测转绿 + 既有 toolbar 单测零回归

Exit Criteria:

- [x] 单测先红后绿有记录（回显/钳制/预览断言在）；word-editor-renderers 既有测试零回归
- [x] font-controls.tsx 无原生 select 残留（grep 证 NativeSelect 移除）

### Phase 2 - 页眉页脚最小 zone UI

Status: completed
Targets: `word-editor-page.tsx`（或页面级宿主组件）、`canvas-editor-bridge.ts`、单测

- Item Types: `Proof | Fix`

- [x] Proof：单测先红——zone 切换 UI 渲染三档（页眉/主文档/页脚）、点击翻转激活态、且 zoneChange 事件驱动指示器同步（canvas 双击切 zone 后指示器不失同步）
- [x] Fix：zone 切换按钮组（调 executeSetZone；API 缺失时禁用态）+ 激活指示——**listener.zoneChange 订阅为必需状态源**（点击仅作乐观更新；否则 canvas-editor 内建双击切 zone 后指示器失同步），zone 状态归宿 = word-editor-core editor-store 扩展字段（沿研究硬约束，EditorZone/IEditorOption 经 core 再导出——renderers 无 canvas-editor 直接依赖）；bridge options 透传 locale（宿主 i18n 语言）；i18n 键新增（zh/en 对称）

Exit Criteria:

- [x] 单测先红后绿；zone API 缺失降级路径有断言；zoneChange 驱动同步有断言
- [x] 页眉页脚 tip 语言跟随宿主（代码走查 + 单测断言 options 传递）

### Phase 3 - e2e 断言 + 边界落卡 + docs

Status: completed
Targets: e2e、owner docs、证据卡、roadmap、daily log

- Item Types: `Proof | Decision | Fix`

- [x] Proof：e2e 扩展——字体值回显（设置枚举外字号后工具栏显示）、zone 切换指示、双态（light/dark）工具条计算样式（V0 helper + data-mode 切换）
- [x] Decision：A3 皮肤边界核对结论落 owner doc（`.ce-*` 不轻动、IEditorOption 唯一通道、纸张白底语义、locale 热更 watch-only）
- [x] Fix：owner docs——word-editor-page/design.md（zone UI 契约）、word-editor/design.md（bridge options 契约）、证据卡 word.md 回写、roadmap、daily log
- [x] Fix：全仓验证链核对（归 Closure Gates——收口会话最终链全绿，见 daily log 收口会话节）

Exit Criteria:

- [x] e2e 新断言绿；既有 word spec 32 test 零回归
- [x] 裁决落卡无 pending；owner docs 与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-21，一轮，25+ 引用零错误）
- Verdict: `revised`（0 Blocker / 1 Major / 5 Minor，全部吸收）
- Rounds: 1
- Findings addressed: Major-1——zone 激活指示状态源定为 listener.zoneChange 必需（点击仅乐观更新），Proof/Exit 增双击切 zone 同步断言，状态归宿钉 word-editor-core editor-store；Minor-1——In Scope 补 word-editor-core 类型再导出面；Minor-2——Proof ③ 改为 executeSize 钳制 payload 口径；Minor-3——自由文本 Enter/blur 提交路径 + buildItems 注入先例写入；Minor-4——R7（DocPreviewPage 二选一）与页码/watermark 登记 follow-ups；Minor-5——Goals 措辞订正。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–3 Exit Criteria 全勾）
- [x] in-scope contract drift 已收敛：枚举外值静默空白、页眉页脚 UI 缺失、locale 不受控
- [x] A3 边界裁决显式落卡；扩展 zone 能力 deferred 有据
- [x] 行为/契约结果已达成：回显/钳制/zone 切换在单测与 e2e 成立
- [x] 必要 focused verification 已完成（单测先红后绿 + e2e 断言）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步：word-editor-page/design.md、word-editor/design.md、证据卡、roadmap、daily log
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新 hit）

## Deferred But Adjudicated

### zone 高度可视化拖拽/内容结构化编辑

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: canvas-editor 内建双击编辑已可用，最小 UI 先行；结构化编辑属功能迭代
- Successor Required: `no`（证据卡承载）

### locale 热更

- Classification: `watch-only residual`
- Why Not Blocking Closure: Editor locale 构造期一次性注入，切换语言刷新后即正确；无静默失效
- Successor Required: `no`

## Non-Blocking Follow-ups

- 客户端字体缺失环境的预览保真提示（document.fonts 检测）：环境依赖型，登记。
- host-demo 页 word 面断言：随域内后续迭代。
- DocPreviewPage 孤儿组件（研究 R7）：接线或显式删除的二选一裁决——登记为独立小裁决项。
- 页码插入控件、watermark 扩展（研究 A2 deferred）：功能型，归域功能 roadmap。

## Closure

Status Note: 三 Phase 全部落地且独立 closure audit 通过（approved，0 Blocker / 0 Major / 3 Minor）：Phase 1–3 exit criteria 逐条 live 核对确认（Combobox 自由输入+钳制+枚举外回显注入、zone 三档切换+bridge locale/zoneChange+就绪降级、e2e 全程序化断言、A3 边界四要素落卡、证据卡 F1–F5 closed）；M-1 簿记（roadmap 翻 done、证据卡 Closure 回写、Closure Gates 填写）已由收口会话完成；M-2（e2e 就绪门 zh 标签耦合）登记为测试健壮性备注不阻塞；M-3 全仓链数字以收口会话最终链记录为准（typecheck 40/40、build、lint、test 74/74、check exit 0）。

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent fresh session 填写）
- Evidence: verdict `approved`——两 focused 套件独立复跑 core 272/272、renderers 163/163；Phase 1 Combobox 行为级核对（withCurrentValueAsFreeValue 注入回显/clampFontSize/预览 span）；Phase 2 store/bridge/page 全链行号核对；Phase 3 e2e 3 用例程序化判据确认；daily log `docs/logs/2026/09-21.md` plan 478 节与收口会话节。

Follow-up:

- （closure 时填写，或写 no remaining plan-owned work）
