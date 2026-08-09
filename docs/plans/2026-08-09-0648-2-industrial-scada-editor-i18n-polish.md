# N2 Industrial SCADA 编辑器图元库/工具箱可见文案 i18n 收口

> Plan Status: completed
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

Status: completed
Targets: 本 plan + locale 结构

- Item Types: `Decision`

- [x] 裁定 palette 名称 i18n key 方案，二选一并记录于本 plan：
  - **方案 A（推荐）**：`ScadaSymbolDefinition` 增可选 `nameKey?: string`（如 `ln.symbol.rect`），palette 渲染经显式未命中检测后取 `def.name` fallback；locale 增对应键。
  - **方案 B**：由 `def.type` 派生固定 key（`industrial.scada.symbol.${def.type}`），不改 `ScadaSymbolDefinition` 结构；locale 增 `industrial.scada.symbol.<type>` 键。

  **裁定 = 方案 B**。理由：(1) Non-Goal 明确「不改 `ScadaSymbolDefinition.name` 既有契约」——方案 A 给接口加 `nameKey?` 字段属结构性变更，且需逐个编辑 24 个图元定义，违反最小改动；(2) `def.type` 是注册表/序列化的 canonical 唯一稳定键（如 `scada-rect`），派生 `industrial.scada.symbol.${def.type}` 完全确定，无需新增定义侧字段；(3) 改动收敛在 palette + locale 两处。

- [x] 裁定 **Group 符号**是否配 palette i18n 键（Group 经 `listScadaSymbols()` 返回、出现在 palette 列表，但它是容器语义非视觉图元；二选一：配键 / 在 palette 过滤掉 Group，记录裁定）

  **裁定 = 给 Group 配键**（`industrial.scada.symbol.scada-group` → en 'Group' / zh '组合'）。理由：Group 经 `listScadaSymbols()` 返回且 palette 当前直接渲染全集（`editor-palette.tsx:42` 无过滤）；「过滤掉 Group」是 palette 可见行为的改动，超出本轮 i18n 范围。i18n 化不应顺带改可见集合。

- [x] 裁定 toolbox word 按钮 label 方案：新增短 label 键（如 `industrial.scada.editor.toolbox.label.delete: 'Delete'` / `zh: '删除'`），**12 个 word 按钮**（Del/Group/Ungroup/Copy/Cut/Paste/Undo/Redo/Export/Import + Fit/Center）可见 label 改 `t(labelKey)`；glyph 按钮 label 保持原符号（裁定 i18n 不适用，本 plan 显式记录）

  **裁定 = 新增 `industrial.scada.editor.toolbox.label.<key>` 子命名空间**（与既有长描述 tooltip 键分离），12 个 word 按钮全部 i18n 化。理由：既有顶层 `toolbox.delete/fit/...` 键存的是**长描述式 tooltip 值**（`delete: 'Delete selected'`、`fit: 'Fit view'`），适合 hover tooltip 不适合紧凑按钮可见 label；复用会导致紧凑按钮塞长串，或改动既有 tooltip 语义。`label.*` 子命名空间使 tooltip（长）与 button label（短）解耦互不影响。glyph 按钮（`+`/`−`/`⌅L`/.../`↔`/`↕`/`⤒`/`↑`/`↓`/`⤓`）label 为字形符号，i18n 不适用，保持原符号。

- [x] 裁定边界项 `'1:1'`（reset view 按钮，`:147`）：归为 glyph（i18n 不适用，保持 `'1:1'`）或归为 word（配 `label.reset` 键）；记录裁定

  **裁定 = '1:1' 归为 glyph（i18n 不适用），label 保持 `'1:1'`**。理由：'1:1' 是比率符号记法（重置到 100% 缩放），非可翻译词；中英文 SCADA/编辑器 UI 均通用 '1:1' 表 1:1 缩放，本地化无收益且会破坏符号识别性。

- [x] 确认 fallback 策略：经**显式未命中检测**（`t(key) === key` 视为未命中 → 回退 `def.name`/原英文短词），不依赖 `||` 短路（i18next 未命中返回 key 字符串本身，`||` 永不触发）

  **确认**。palette fallback = `def.name`；toolbox fallback = 各 word 按钮原英文短词（Del/Group/.../Fit/Center）。实现：`const resolved = t(key); const label = resolved === key ? fallback : resolved;`（palette inline；toolbox 抽 `labelOr(key, fallback)` 复用）。

Exit Criteria:

- [x] 本 plan 文本明确记录 palette（含 Group 裁定）与 toolbox（含 12 word 按钮 + 1:1 裁定 + glyph 不适用）两处 key 方案选型与理由
- [x] fallback 经显式未命中检测（非 `||` 短路），与 Failure Paths 一致
- [x] glyph 按钮 + `'1:1'` 的 i18n 不适用/裁定已显式记录

### Phase 2 - locale 键落地 + palette i18n

Status: completed
Targets: `packages/flux-i18n/src/locales/en-US.ts`、`zh-CN.ts`、`src/editor/palette/editor-palette.tsx`、（若方案 A）`src/symbols/symbol-types.ts` + 各图元定义

- Item Types: `Fix`

- [x] `en-US.ts` + `zh-CN.ts` 新增 palette 名称键（按 Phase 1 裁定的命名空间，覆盖 24 注册定义中需配键者——含/不含 Group 按 Phase 1 裁定）
  - 落地：`industrial.scada.symbol.<type>` 命名空间，24 键全覆盖（含 Group，按 D2），en/zh 对称。toolbox 短 label 键簇（`industrial.scada.editor.toolbox.label.*`，12 键）亦在本 Phase 一并落地（Phase 3 仅消费）。
- [x] palette `editor-palette.tsx` import `useFluxTranslation`，`title` 与可见文本均改「显式未命中检测 → 回退 `def.name`」解析
- [x] （方案 A）`ScadaSymbolDefinition` 增 `nameKey?`，各图元定义补 `nameKey`；（方案 B）不改结构
  - 选定方案 B，结构未改。

Exit Criteria:

- [x] `en-US.ts` 与 `zh-CN.ts` 键集对称（无单语缺口，对照 grep 计数一致；含 palette + toolbox label 两簇）
  - symbol 键 en/zh 各 24；label 键 en/zh 对称（grep 计数一致）。
- [x] palette fallback 经显式未命中检测，注入 locale 渲染本地化名称、未注入回退 `def.name`（单测断言两路径）
  - `src/editor/palette/editor-palette.test.tsx`：断言 zh 解析后文案（'矩形'/'温度计'）+ 未命中回退 `def.name`（'FallbackWidget'）+ raw key 不泄漏。

### Phase 3 - toolbox word 按钮 label i18n + focused 测

Status: completed
Targets: `src/editor/toolbox/toolbox-panel.tsx`、`packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`、新增/扩展测

- Item Types: `Fix | Proof`

- [x] locale 新增 toolbox 短 label 键（en + zh，覆盖 **12 个 word 按钮**：Del/Group/Ungroup/Copy/Cut/Paste/Undo/Redo/Export/Import/Fit/Center）
  - 落地于 Phase 2 一并写入（`industrial.scada.editor.toolbox.label.*`，en/zh 各 12 键对称）。
- [x] `toolbox-panel.tsx` word 按钮（含 `:145 Fit` / `:146 Center`）`label` 改「显式未命中检测 → 回退原英文短词」；glyph 按钮 + `'1:1'`（按 Phase 1 裁定）label 不变
  - 新增 `labelOr(key, fallback)`（`resolved === key ? fallback : resolved`）；12 个 word 按钮经 `labelOr('...toolbox.label.<k>', '<英文短词>')`；glyph 按钮 + `1:1` (D4) label 保持原符号。另为所有按钮加 `data-testid`，使行为用例 locale 无关（word label 随 locale 变化）。
- [x] focused 测：渲染 toolbox，断言 word 按钮可见文本为 locale 解析值（注入 zh locale 断言中文）且未命中时回退英文；glyph 按钮 + 1:1 文本不变
  - `toolbox-panel.test.tsx`：① zh-CN 解析用例（12 word 按钮 → 中文：删除/组合/.../适配/居中；glyph + 1:1 保持符号；raw key 不泄漏）；② 空资源未命中用例（12 word 按钮 → 英文短词 fallback；raw key 不泄漏，证明显式未命中检测非 `||` 短路）。
- [x] focused 测：palette 渲染断言（Phase 2 落地配套，若已在 Phase 2 测则引用不重复）
  - palette focused 用例于 Phase 2 落地（`editor-palette.test.tsx`，3 用例）；本 Phase 不重复。

Exit Criteria:

- [x] toolbox **12 个 word 按钮**（含 Fit/Center）可见 label 经显式未命中检测解析（单测断言解析后文案 + 未命中回退）；glyph 按钮 + `'1:1'`（按裁定）label 未改
- [x] locale 双语键集对称，无单语缺口
- [x] industrial 包 `pnpm --filter @nop-chaos/flux-renderers-industrial test` focused 用例通过
  - 1439/1439 passed（含新增 3 palette + 2 toolbox i18n 用例）；并修正下游 editor 用例（affordance/reactivity）的 word 按钮定位为 `data-testid`（locale 无关）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session `ses_01c6c5593ffeg8DlWdiKbdZhlX`（R1）→ `ses_01c6943d9ffefWwFEt13XpiBmh`（R2）
- Verdict: `pass`（R2 共识）
- Rounds: 2（R1 `revised` 1 Major + 4 Minor → 已修订；R2 `pass` 0/0/0）
- Findings addressed: R1-Major word 按钮漏列 Fit/Center（已扩到 12 个）；R1-Minor 符号计数 23→24 含 Group + Group-in-palette 裁定项；R1-Minor '1:1' 边界项裁定项；R1-Minor fallback `||` 短路失效→改显式未命中检测 `t(key)===key`（i18next 未命中返回 key 字符串）

## Closure Gates

- [x] palette 可见名称 + toolbox **12 个 word 按钮**（含 Fit/Center）label 均经显式未命中检测解析（live code 核对，无 `||` 短路 fallback）
- [x] glyph 按钮 + `'1:1'` label i18n 不适用/裁定落地（未改）
- [x] `en-US.ts` + `zh-CN.ts` 新增键双语对称，无单语缺口（palette 含/不含 Group 按裁定）
- [x] focused 测试断言解析后文案（非 not-throw）
- [x] 无 in-scope live defect 被静默降级到 deferred
- [x] 受影响 owner doc 同步（若 `ScadaSymbolDefinition` 结构变更 → `docs/components/industrial-hmi/design-symbols.md`；若仅文案 → 无 owner-doc 更新，裁定记录于 plan）
  - 裁定：方案 B 无 `ScadaSymbolDefinition` 结构变更；改动为文案级 i18n（palette 名称 + toolbox label），无 documented behavior 变化 → 无 owner-doc 更新。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
  - 独立 closure-audit fresh session `ses_closure-audit-06482-20260809`（mission `MISSION_DRIVER:2026-08-08-193117-mission-driver`）已完成：live code 核对（`editor-palette.tsx:22,27-31,54` `resolveName` 显式未命中检测被调用 + title/可见文本双走 i18n；`toolbox-panel.tsx:134-137` `labelOr` 被 12 word 按钮调用，glyph/1:1 保持原符号）、locale 对称核对（`en-US.ts:1035-1077` + `zh-CN.ts:1033-1075`，24 symbol 键 + 12 label 键双语无缺口）、focused 测复跑（`pnpm --filter @nop-chaos/flux-renderers-industrial test -- --run editor-palette.test` → 107 files / 1439 tests passed）、docs/logs/2026/08-09.md 收口记录 + roadmap P2-6/P2-7 ✅ done 核对、5-point 一致性核对通过、deferred honesty 通过（P2-5/本轮-12 显式 Non-Goal 移出至 successor plan `2026-08-09-0648-3`）。Verdict: `approved`。
- [x] `pnpm typecheck`（workspace 32/32 全绿）
- [x] `pnpm build`（workspace 32/32 全绿）
- [x] `pnpm lint`（workspace 32/32 全绿）
- [x] `pnpm test`（workspace 59/59 任务全绿；industrial 1439 测含新增 5 focused i18n 用例）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- `ln.*` 与 `industrial.scada.*` locale 命名空间并存属 pre-existing，非本轮 finding；若执行中发现影响解析正确性，记录并升级，否则留作 out-of-scope improvement。

## Closure

Status Note: 全部 3 个 Phase 执行完成（Phase 1 Decision / Phase 2 locale+palette / Phase 3 toolbox+tests），并经独立 closure-audit fresh session 复核 approved。palette（方案 B，`industrial.scada.symbol.<type>`，24 键含 Group）+ toolbox（`industrial.scada.editor.toolbox.label.*`，12 word 按钮）可见文案均经 `useFluxTranslation().t()` 解析，fallback 经显式未命中检测（`resolved === key`，非 `||` 短路）。glyph 按钮 + `1:1` 裁定 i18n 不适用保持原符号。en/zh 双语对称无单语缺口。验证：typecheck/build/lint 32/32、workspace test 59/59（industrial 1439 测含新增 5 focused i18n 用例，closure-audit 复跑 1439 passed）。closure-audit gate 已由独立 fresh session 关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh session `ses_closure-audit-06482-20260809`（mission `MISSION_DRIVER:2026-08-08-193117-mission-driver`；不复用执行者上下文）
- Evidence:
  - live code 核对：`packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx:22,27-31,54`（`useFluxTranslation` + `resolveName(type, def.name)` 显式未命中检测被 JSX 调用，title 与可见文本均走 i18n）；`packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:134-137`（`labelOr(key, fallback)` 显式未命中检测 helper）+ `:161,162,163,167,168,193,194,195,199,200,204,205`（12 word 按钮全部经 `labelOr(...)` 解析；glyph 按钮 `+`/`−`/`⌅L`/.../`↔`/`↕`/`⤒`/`↑`/`↓`/`⤓` 与 `1:1` (`:169`) label 保持原符号）；anti-hollow 通过（无 `{}`/`return null` 占位、无吞异常、helper 真实调用）
  - locale 双语对称核对：`packages/flux-i18n/src/locales/en-US.ts:1035-1077` + `zh-CN.ts:1033-1075`——24 symbol 键（含 `scada-group`，D2 裁定）+ 12 toolbox label 键，en/zh 对称无单语缺口
  - focused 测复跑：`pnpm --filter @nop-chaos/flux-renderers-industrial test -- --run editor-palette.test` → 107 files / 1439 tests passed（含 `editor-palette.test.tsx` 3 i18n 用例：zh 解析 '矩形'/'温度计' + title 同步 + 未命中回退 'FallbackWidget'；`toolbox-panel.test.tsx` 2 i18n 用例：zh-CN 12 word 按钮 → 中文 + glyph/1:1 保持符号 + raw key 不泄漏，空资源未命中 → 英文短词 fallback）；测试断言「解析后文案」非 not-throw，且守护 `||` 短路误用（i18next 未命中返回 key 串非 falsy）
  - 5-point 一致性：Plan Status `completed` / 3 Phase Status 全 `completed` / 各 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]`（含 audit gate 本轮勾选）/ `docs/logs/2026/08-09.md` 收口记录——彼此一致
  - deferred honesty：`Deferred But Adjudicated` 空；`Non-Blocking Follow-ups` 仅 `ln.*` vs `industrial.scada.*` 命名空间并存（pre-existing，watch-only residual，理由明确）；P2-5 / 本轮-12 经 Non-Goals 显式移出至 successor plan `2026-08-09-0648-3`（test/adjudication 轮），非 in-scope 缺陷降级
  - owner-doc sync：方案 B 无 `ScadaSymbolDefinition` 结构变更、文案级 i18n 无 documented behavior 变化 → 裁定无 owner-doc 更新（Closure Gates 第 6 项已记录裁定）
  - roadmap 同步：`docs/backlog/industrial-hmi-component-audit-roadmap.md` P2-6/P2-7 标 ✅ done（:314-315）+「i18n polish 轮执行进度」块（:277）
- Verdict: `approved`

Follow-up:

- 无 plan-owned 剩余工作（P2-5/本轮-12 归后续 test/adjudication 轮 successor plan `2026-08-09-0648-3`，与本 plan Non-Goals 一致，已在 roadmap Follow-up Backlog 记录）。
- closure-audit gate 已由独立 fresh session 关闭（Verdict: `approved`）。
