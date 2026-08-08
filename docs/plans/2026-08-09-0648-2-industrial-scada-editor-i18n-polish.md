# N2 Industrial SCADA 编辑器图元库/工具箱可见文案 i18n 收口

> Plan Status: active
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog（P2-6 / P2-7，源 audit `docs/audits/2026-08-08-1712-multi-audit-industrial-hmi-component-audit.md:313-314`）
> Related: `docs/plans/2026-08-08-1931-2-industrial-scada-serialization-export-contract-polish.md`（N=2 已 completed，遗留 i18n/doc/adjudication 轮）；`docs/plans/2026-08-09-0648-1-industrial-scada-design-doc-file-tree-references.md`（N=1 doc 轮）
> Mission: industrial-hmi-component-audit

## Purpose

收口编辑器两个 UI 面板可见文案的 i18n 缺口：图元库（palette）直接渲染符号注册表的 raw 英文 `name`，工具箱（toolbox）word 按钮可见 `label` 硬编码英文（仅 `title`/tooltip 走 i18n）。使两类用户可见字符串都经 `useFluxTranslation().t()` 解析，与编辑器其余已 i18n 化文案纪律一致。

## Current Baseline

live 仓库现状（2026-08-09 核对）：

- **P2-6 palette** `src/editor/palette/editor-palette.tsx:51,53`：`<Button title={def.name}>{def.name}</Button>` 直接渲染 `listScadaSymbols()` 返回的 `ScadaSymbolDefinition.name`。该字段（`symbol-types.ts:139` `name: string`）在各图元定义中存的是**字面英文**（`base-shapes/rect.ts:9` `name: 'Rectangle'`、`arrow.ts:18` `name: 'Arrow'` 等），非 i18n key。面板内已 import `@nop-chaos/ui` 但未 import `useFluxTranslation`。
- **P2-7 toolbox** `src/editor/toolbox/toolbox-panel.tsx:130-187`：`btn(label, onClick, disabled, title)` 的可见 `label` 硬编码英文。**word 按钮**（label 为英文词/缩写）：`'Del'`/`'Group'`/`'Ungroup'`/`'Copy'`/`'Cut'`/`'Paste'`/`'Undo'`/`'Redo'`/`'Export'`/`'Import'`（`:139,140,141,171,172,173,177,178,182,183`）**以及** `'Fit'`/`'Center'`（`:145,146`，同型 word label，原文 finding 漏列，本轮补入）。**glyph 按钮**（label 为符号/字形）：`'+'`/`'−'`/`'⌅L'`/`'⌅R'`/`'⌅H'`/`'⌅T'`/`'⌅B'`/`'⌅V'`/`'↔'`/`'↕'`/`'⤒'`/`'↑'`/`'↓'`/`'⤓'`（i18n 不适用）。**边界项** `'1:1'`（`:147`）非纯词亦非纯字形，需裁定（见 Phase 1）。`title` 已走 `t('industrial.scada.editor.toolbox.<key>')`（locale 已存在，`en-US.ts:1003-1028`）。`useFluxTranslation` 已 import（`toolbox-panel.tsx:3,32`）。
- locale 现状：`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts` 的 `industrial.scada.editor.toolbox.*` 均为**长描述式**值（`delete: 'Delete selected'`、`group: 'Group selection'`、`fit: 'Fit view'`、`center: 'Center view'`），适合 tooltip，不适合紧凑按钮可见 label；无 `industrial.scada.symbol.<type>` 类命名空间，无短按钮 label 键。
- i18next 解析行为：`useFluxTranslation().t()` 底层经 i18next（`flux-i18n/src/i18n.ts:122-125`），**未命中键时返回 key 字符串本身**（非 falsy）→ 表达式 `t(nameKey) || def.name` 的 `||` 分支永不触发，会渲染 raw key。故 fallback 必须用显式未命中检测（见 Phase 1 裁定）。
- 符号计数：`register-builtin.ts` 注册 **24** 个定义（含 `scadaGroupDefinition`/Group）；`listScadaSymbols()` 返回含 Group 的全集，Group 亦出现在 palette 列表中，需裁定是否给 Group 配 i18n 键（见 Phase 1）。

前序已落地：所有 industrial 审计 work item done；polish 各波 completed。本计划属 N=2 遗留「i18n 轮」。

## Goals

- palette 图元库可见名称经 i18n 解析（`t()`），不再直接渲染字面英文。
- toolbox word 按钮（含 `'Fit'`/`'Center'`，共 12 个）可见 label 经 i18n 解析；glyph 按钮 label 保持符号不变（明确裁定为 i18n 不适用）；`'1:1'` 边界项裁定并记录。
- 新增 locale 键在 `en-US.ts` + `zh-CN.ts` 双语落地，无单语缺口。
- i18n fallback 经**显式未命中检测**（非 `||` 短路），未命中时回退字面英文/`def.name`，不渲染 raw key。
- i18n 行为有 focused 测试守护（按钮渲染解析后文案、palette 渲染解析后名称）。

## Non-Goals

- 不重构 `ln.*` / `industrial.scada.*` 两套并存的 locale 命名空间（pre-existing，非本轮 finding；若执行中发现影响，记 Non-Blocking Follow-up）。
- 不改 symbol 注册表 `name` 字段的既有契约（`ScadaSymbolDefinition.name` 仍为 string；i18n 经并行 key/字段解析，见 Decision）。
- 不处理 P2-9/P2-10/P2-11（doc，归 N=1 plan）、P2-5/本轮-12（test/adjudication，归 N=3 plan）。
- 不对 runtime（非编辑器）侧文案做 i18n 扩展。

## Scope

### In Scope

- `src/editor/palette/editor-palette.tsx`（palette 可见名称 i18n）
- `src/editor/toolbox/toolbox-panel.tsx`（word 按钮可见 label i18n）
- `src/symbols/symbol-types.ts`（若 Decision 选「新增 i18n key 字段」则扩展 `ScadaSymbolDefinition`）
- `packages/flux-i18n/src/locales/en-US.ts` + `zh-CN.ts`（新增 palette 名称键 + toolbox 短 label 键）
- 新增/扩展 focused 单测

### Out Of Scope

- glyph 按钮可见 label（符号，i18n 不适用）。
- 非 industrial 编辑器面板（inspector/connection overlay 等）的文案。
- runtime `scada-canvas` 错误码 i18n（已由 editor-errors / HCAX-1 覆盖）。

## Failure Paths

| 场景           | 触发            | 行为                                                                                                               | 用户可见表现                                   |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 缺失 locale 键 | `t(key)` 未命中 | **显式未命中检测**（`t(key) === key` 判定未命中）→ 回退字面英文 fallback（palette=`def.name`，toolbox=原英文短词） | 显示英文而非本地化文案，不抛错，不渲染 raw key |

## Test Strategy

本档选择：`建议有测`

理由：i18n 是用户可见行为变更，且 palette 引入新的 key 解析路径，需 focused 测试断言「渲染解析后文案」而非 not-throw。

## Execution Plan

### Phase 1 - i18n key 方案裁定（Decision）

Status: planned
Targets: 本 plan + locale 结构

- Item Types: `Decision`

- [ ] 裁定 palette 名称 i18n key 方案，二选一并记录于本 plan：
  - **方案 A（推荐）**：`ScadaSymbolDefinition` 增可选 `nameKey?: string`（如 `ln.symbol.rect`），palette 渲染经显式未命中检测后取 `def.name` fallback；locale 增对应键。
  - **方案 B**：由 `def.type` 派生固定 key（`industrial.scada.symbol.${def.type}`），不改 `ScadaSymbolDefinition` 结构；locale 增 `industrial.scada.symbol.<type>` 键。
- [ ] 裁定 **Group 符号**是否配 palette i18n 键（Group 经 `listScadaSymbols()` 返回、出现在 palette 列表，但它是容器语义非视觉图元；二选一：配键 / 在 palette 过滤掉 Group，记录裁定）
- [ ] 裁定 toolbox word 按钮 label 方案：新增短 label 键（如 `industrial.scada.editor.toolbox.label.delete: 'Delete'` / `zh: '删除'`），**12 个 word 按钮**（Del/Group/Ungroup/Copy/Cut/Paste/Undo/Redo/Export/Import + Fit/Center）可见 label 改 `t(labelKey)`；glyph 按钮 label 保持原符号（裁定 i18n 不适用，本 plan 显式记录）
- [ ] 裁定边界项 `'1:1'`（reset view 按钮，`:147`）：归为 glyph（i18n 不适用，保持 `'1:1'`）或归为 word（配 `label.reset` 键）；记录裁定
- [ ] 确认 fallback 策略：经**显式未命中检测**（`t(key) === key` 视为未命中 → 回退 `def.name`/原英文短词），不依赖 `||` 短路（i18next 未命中返回 key 字符串本身，`||` 永不触发）

Exit Criteria:

- [ ] 本 plan 文本明确记录 palette（含 Group 裁定）与 toolbox（含 12 word 按钮 + 1:1 裁定 + glyph 不适用）两处 key 方案选型与理由
- [ ] fallback 经显式未命中检测（非 `||` 短路），与 Failure Paths 一致
- [ ] glyph 按钮 + `'1:1'` 的 i18n 不适用/裁定已显式记录

### Phase 2 - locale 键落地 + palette i18n

Status: planned
Targets: `packages/flux-i18n/src/locales/en-US.ts`、`zh-CN.ts`、`src/editor/palette/editor-palette.tsx`、（若方案 A）`src/symbols/symbol-types.ts` + 各图元定义

- Item Types: `Fix`

- [ ] `en-US.ts` + `zh-CN.ts` 新增 palette 名称键（按 Phase 1 裁定的命名空间，覆盖 24 注册定义中需配键者——含/不含 Group 按 Phase 1 裁定）
- [ ] palette `editor-palette.tsx` import `useFluxTranslation`，`title` 与可见文本均改「显式未命中检测 → 回退 `def.name`」解析
- [ ] （方案 A）`ScadaSymbolDefinition` 增 `nameKey?`，各图元定义补 `nameKey`；（方案 B）不改结构

Exit Criteria:

- [ ] `en-US.ts` 与 `zh-CN.ts` 键集对称（无单语缺口，对照 grep 计数一致；含 palette + toolbox label 两簇）
- [ ] palette fallback 经显式未命中检测，注入 locale 渲染本地化名称、未注入回退 `def.name`（单测断言两路径）

### Phase 3 - toolbox word 按钮 label i18n + focused 测

Status: planned
Targets: `src/editor/toolbox/toolbox-panel.tsx`、`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`、新增/扩展测

- Item Types: `Fix | Proof`

- [ ] locale 新增 toolbox 短 label 键（en + zh，覆盖 **12 个 word 按钮**：Del/Group/Ungroup/Copy/Cut/Paste/Undo/Redo/Export/Import/Fit/Center）
- [ ] `toolbox-panel.tsx` word 按钮（含 `:145 Fit` / `:146 Center`）`label` 改「显式未命中检测 → 回退原英文短词」；glyph 按钮 + `'1:1'`（按 Phase 1 裁定）label 不变
- [ ] focused 测：渲染 toolbox，断言 word 按钮可见文本为 locale 解析值（注入 zh locale 断言中文）且未命中时回退英文；glyph 按钮 + 1:1 文本不变
- [ ] focused 测：palette 渲染断言（Phase 2 落地配套，若已在 Phase 2 测则引用不重复）

Exit Criteria:

- [ ] toolbox **12 个 word 按钮**（含 Fit/Center）可见 label 经显式未命中检测解析（单测断言解析后文案 + 未命中回退）；glyph 按钮 + `'1:1'`（按裁定）label 未改
- [ ] locale 双语键集对称，无单语缺口
- [ ] industrial 包 `pnpm --filter @nop-chaos/flux-renderers-industrial test` focused 用例通过

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session `ses_01c6c5593ffeg8DlWdiKbdZhlX`（R1）→ `ses_01c6943d9ffefWwFEt13XpiBmh`（R2）
- Verdict: `pass`（R2 共识）
- Rounds: 2（R1 `revised` 1 Major + 4 Minor → 已修订；R2 `pass` 0/0/0）
- Findings addressed: R1-Major word 按钮漏列 Fit/Center（已扩到 12 个）；R1-Minor 符号计数 23→24 含 Group + Group-in-palette 裁定项；R1-Minor '1:1' 边界项裁定项；R1-Minor fallback `||` 短路失效→改显式未命中检测 `t(key)===key`（i18next 未命中返回 key 字符串）

## Closure Gates

- [ ] palette 可见名称 + toolbox **12 个 word 按钮**（含 Fit/Center）label 均经显式未命中检测解析（live code 核对，无 `||` 短路 fallback）
- [ ] glyph 按钮 + `'1:1'` label i18n 不适用/裁定落地（未改）
- [ ] `en-US.ts` + `zh-CN.ts` 新增键双语对称，无单语缺口（palette 含/不含 Group 按裁定）
- [ ] focused 测试断言解析后文案（非 not-throw）
- [ ] 无 in-scope live defect 被静默降级到 deferred
- [ ] 受影响 owner doc 同步（若 `ScadaSymbolDefinition` 结构变更 → `docs/components/industrial-hmi/design-symbols.md`；若仅文案 → 无 owner-doc 更新，裁定记录于 plan）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- `ln.*` 与 `industrial.scada.*` locale 命名空间并存属 pre-existing，非本轮 finding；若执行中发现影响解析正确性，记录并升级，否则留作 out-of-scope improvement。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<或者明确写 no remaining plan-owned work>>
