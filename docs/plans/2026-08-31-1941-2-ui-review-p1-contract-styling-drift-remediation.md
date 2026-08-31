# 2 ui-review 审计 P1 契约/样式契约漂移收敛（批次二：content / data / basic 四项）

> Plan Status: completed（2026-08-31 执行完毕：Phase 1–3 全部 completed，4 条 P1 契约/样式漂移先红后绿收口，closure audit 通过——fresh session `ses_fa784e6aaffeFePYmCdGdYVW24` 1 轮 APPROVED 零 Blocker/零 Major，见 Closure Audit Evidence）
> Last Reviewed: 2026-08-31
> Source: `docs/audits/2026-08-28-1659-multi-audit-ui-review.md`（P1 组 B「Contract drift / wiring」全部 4 条：15-02 / 22-02 / 10-01 / 10-02，均为独立 review 后 retained 的 verified contract drift）
> Mission: ui-review
> Related: `docs/plans/2026-08-31-1941-1-ui-review-p1-interaction-behavior-remediation.md`（批次一）、`docs/plans/2026-08-31-1941-3-ui-review-p1-a11y-and-test-protection.md`（批次三）

## Purpose

把 ui-review 双阶段审计组 B 的 4 条 verified P1 契约漂移全部收敛到"代码行为 = 文档承诺 = 样式契约"三方一致：link `blob:` 下载通道复活、batch-bar × table 选择接线的前置条件可发现、page 布局渲染器回归 marker-only 契约、command-palette 补齐同批次 sibling 均有的 `meta.className` 合并。

## Current Baseline

- 审计基线（2026-08-31 审计执行时全绿）；4 条 finding 均经独立 review agent live 复核，起草时 executor 抽查再证实（见下）。
- **15-02**：`packages/flux-renderers-content/src/link.tsx:29-46` href 经 `isSafeNavigationUrl` 守卫（经 `./sanitize.js` 再导出自 flux-core）；`packages/flux-core/src/utils/url.ts:14` `SAFE_NAVIGATION_SCHEMES = ['http:','https:','mailto:','tel:','data:']` 无 `blob:` → `blob:` href 被静默清空；同文件 `:37-46` 的 `download` 透传（注释 [G7-R2-视角11-01]）对 `blob:` 不可达。作者文档 `packages/flux-renderers-content/src/schemas.ts:142` 明确写"对 data:/blob: 同源导出链接必须设置 download"——文档指引的路径复现文档警告的"点击无响应"症状。既有测试 `link-download.test.tsx` 只覆盖 `data:` 主路径。Minor：`rel=' '`（空格串）过 `length>0` 检查不补 noopener（浏览器隐式 noopener，实际风险≈零，随本项 trim 收敛）。
- **22-02**：`packages/flux-renderers-data/src/batch-bar.tsx:39-52` 靠 `selectionPath` 指向的 scope 路径渲染；table 默认 `selectionOwnership:'local'`（`table-renderer/use-table-selection.ts:32` 附近默认值），三个写分支（`:271-274`、`:373-378`、`:413-419`）在 local 下全部跳过 scope 路径。三处文档（`docs/references/renderer-interfaces.md:733-737`、`packages/flux-renderers-data/src/schemas.ts:354-360` selectionPath 描述、`packages/flux-renderers-data/src/batch-bar-definition.ts:84-85` propContract 描述）都说"bind the table's selectionStatePath"，从未说明只有 `'scope'` 所有权下该路径才被写入。作者按文档接线 → bar 永不渲染，与"什么都没选"不可区分，零诊断（文件内 dev warn 只覆盖 countTemplate/clearTarget）。
- **10-01**：`packages/flux-renderers-basic/src/page.tsx:65` `BREADCRUMB_ITEM_CLASS = 'min-w-0 max-w-40 truncate'`、`:265` `page-heading` 槽位类 `flex min-w-0 flex-wrap items-center gap-2`、`:273` `page-extra` 槽位类 `ml-auto flex flex-wrap items-center gap-2` —— 三处均为本分支 diff 新增的代码侧布局类。page 是显式 layout renderer（`docs/architecture/styling-system.md` "Renderer Categories"），契约要求 marker-only、theme-tunable 间距只能来自包级 `@layer base` CSS + slot selector（styling-system.md:470 与 `flux-react/default-spacing.css` 先例）；`packages/flux-renderers-basic/src/schemas.ts` PageSchema 只有 `headerClassName`/`bodyClassName` 等 region 级字段，新槽位（page-heading/page-extra）无 per-slot className 通道。
- **10-01 CSS 通道现状（live 实测，执行前置事实）**：`packages/flux-renderers-basic` 当前**无任何 CSS 通道**——无 `.css` 文件、`exports` 仅 `"."`、`"sideEffects": false`、build 为纯 `tsc` 无资产拷贝。可沿的完整接线先例是 `flux-react/default-spacing.css`：(a) `packages/flux-react/package.json` 的 `"sideEffects": ["*.css"]` + `"./default-spacing.css"` 导出 + build 脚本追加 `copy-build-assets.mjs` 拷贝；(b) 加载路径二选一——`apps/playground/src/styles.css` `@import`（各带 CSS 的 renderer 包多在彼处导入；basic 因无 CSS 从未导入；form 包走自导入路径，见下）或包入口自导入（`packages/flux-renderers-form/src/index.tsx:1` `import './form-renderers.css'` 先例）；(c) `packages/flux-bundle/src/style.css` 聚合是否纳入需随接线裁定。`scripts/__tests__/check-package-css-exports.test.ts:20` 断言字面量 `Verified 22 CSS export subpaths across 22 resolved targets`（该字面量在 08-07/08-09/08-10 日志中已随新增 CSS 包 11→17→19→22 多次同步，basic 成为第 23 个后须随本 Phase 同步，否则 `pnpm test:scripts` 红）。
- **10-02**：`packages/flux-renderers-basic/src/command-palette.tsx:404-409` 根节点 `className="nop-command-palette"` 未合并 `props.meta.className`；同批次 4 个 sibling 全部合并（`batch-bar.tsx:120`、`query-filter.tsx:31`、`result.tsx:65`、`link.tsx:76-79`）。样式契约"Respect schema className"。
- worktree 纪律：全部改动在 worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），commit 格式 `feat(ui-review): <description>`。

## Goals

- 15-02：`blob:` + `download` 组合下 href 保留（下载语义可达）；文档承诺与代码行为一致；`rel` 判定先 trim；既有 `data:` 主路径零回归。
- 22-02：三处 owner doc/描述补 `selectionOwnership:'scope'` 前置条件；补一次性 dev 诊断区分"路径从未写入"与"选择集为空"。
- 10-01：page 三个新槽位的布局类从组件代码迁出至包级 CSS（`[data-slot="page-heading"]` 等 slot selector），组件代码回归 marker-only；主题可调性经包 CSS 通道成立。
- 10-02：command-palette 根节点合并 `props.meta.className`，对齐 4 个 sibling。

## Non-Goals

- 不重构 `isSafeNavigationUrl` 的整体 scheme 白名单策略（只增量处理 `blob:`+`download` 组合与 rel trim）。
- 不改 batch-bar/table 的选择所有权默认值（`selectionOwnership` 默认 `'local'` 维持；本计划只做可发现性，不翻默认行为）。
- 不动 PageSchema 的字段面（不加 per-slot className props——布局类迁包 CSS 后该通道非必需；若执行中证明 CSS 方案不可行，按 Failure Path 落 Decision 再评估 props 方案）。
- 不修复 P2 项与 a11y/行为缺陷（归批次一/三 plan 与 backlog）。

## Scope

### In Scope

- `packages/flux-core/src/utils/url.ts` + `isSafeNavigationUrl` 相关测试（`isSafeNavigationUrl` 消费方含 button/link，测试落 flux-core 或消费包既有测试文件）
- `packages/flux-renderers-content/src/link.tsx` + `link-download.test.tsx` + `schemas.ts`（仅当文案需随行为修订）
- `packages/flux-renderers-data/src/batch-bar.tsx`（dev 诊断）+ `schemas.ts`、`batch-bar-definition.ts`（描述补写）+ `docs/references/renderer-interfaces.md:733-737`（契约补写）
- `packages/flux-renderers-basic/src/page.tsx`、`packages/flux-renderers-basic` 包级 CSS（新增 slot selector 规则；沿 `flux-react/default-spacing.css` 先例确认包 CSS 出口与 `check:package-css-exports` 相容）
- `packages/flux-renderers-basic/src/command-palette.tsx:404-409` + 对应测试

### Out Of Scope

- Non-Goals 全部；`use-dialog-drag`/drawer（批次一 Phase 5）；selectionOwnership 行为翻转；amis 兼容层。

## Failure Paths

| 可测场景编号                | 触发                                                                                                         | 行为                                                                                                                  | 可重试          | 用户可见表现         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------- |
| link-15-02-blob-download    | `href='blob:…'` + `download` 设置                                                                            | href 保留、download 透传、`rel` trim 后判定                                                                           | 是              | 点击触发下载         |
| link-15-02-blob-no-download | `href='blob:…'` 无 `download`                                                                                | 维持现有守卫（清空 href）或按 Decision 落字口径                                                                       | 否（fail-safe） | 与现状一致的保守行为 |
| link-15-02-rel-space        | `rel=' '` + `target=_blank`                                                                                  | trim 后判定为空 → 自动补 noopener                                                                                     | 是              | 隐式 noopener 补齐   |
| bb-22-02-local-ownership    | table 默认 local + bar 绑定 selectionStatePath                                                               | 一次性 dev warn 指明 `'scope'` 前置条件；生产零噪音                                                                   | 是              | dev 下作者可自诊     |
| pg-10-01-theme-tune         | host 覆写 `[data-slot="page-heading"]` 间距                                                                  | 包 CSS 基线可被 host CSS 覆盖（layer 顺序成立）                                                                       | 是              | 主题可调             |
| pg-10-01-css-infeasible     | 沿 default-spacing.css 先例的接线（exports/sideEffects/build 拷贝/加载路径）任一环节与既有门禁或打包约束冲突 | 按 Decision 落字切换备选（per-slot className props 或包入口自导入），并同步 Non-Goals 第 3 条口径；不得静默降级 10-01 | 是              | 契约仍收敛，路径不同 |
| cp-10-02-meta-className     | schema 给 command-palette 传 className                                                                       | 根节点类为 `nop-command-palette` + 自定义类合并                                                                       | 是              | 消费覆盖生效         |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（4 条均为契约漂移修复：link 是对外 href/download 契约、className 合并是样式契约、dev 诊断与 CSS 迁移各配 focused 断言；先红后绿）。

## Execution Plan

### Phase 1 - content link `blob:` 下载契约收敛（15-02）

Status: completed（2026-08-31 执行：先红 4 用例（blob:+download href 保留 ×2 / flux-core download 选项语义 / rel trim）后绿；`pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37、`pnpm test` 68/68 task 全绿）
Targets: `packages/flux-core/src/utils/url.ts`、`packages/flux-renderers-content/src/link.tsx`、`link-download.test.tsx`、`packages/flux-renderers-content/src/schemas.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Proof（先红）：`link-download.test.tsx` 补 `blob:`+`download` 用例——断言 href 保留且 `download` 属性渲染（当前红：href 被清空）；补 `rel=' '` trim 用例（实测红 4 失败后转绿）
- [x] Decision：`blob:` 放行口径落字——采用"`blob:` 仅在 `download` 已设置时视为安全"（与作者文档 :142 承诺一致）；无 `download` 的 `blob:` 维持清空（保守 fail-safe）。落地形态：`isSafeNavigationUrl(url, options?: SafeNavigationUrlOptions)` 增量 `download?: boolean` 选项，仅 `blob:` scheme 可被解锁，script 执行类 scheme 任何选项下仍拒；`SafeNavigationUrlOptions` 类型经 flux-core index.ts 导出
- [x] Fix：`isSafeNavigationUrl` 增加 download 语义的放行通道（函数签名或调用侧组合，保持 flux-core 既有消费方 button 兼容；button 无 download 概念则行为不变）；`resolveRel` 判定前 `rel.trim()`（trim 后返回 trimmed 值）——link.tsx 计算顺序调整：`download` 先解析，href 守卫传 `{ download: download !== undefined }`；button 消费方（`button.tsx:253`）零改动、行为不变（`button-href-safety.test.tsx` 7/7 绿实证）
- [x] Fix：核对 `packages/flux-renderers-content/src/schemas.ts:142` 文案与实现一致——补写"blob: 链接仅在设置 download 时 href 才通过安全守卫（未设置则 href 被清空、链接不可导航）"；owner docs 同步：`docs/architecture/flux-core.md` URL Safety Utility 节 + `docs/components/link/design.md` §12

Exit Criteria:

- [x] 先红用例转绿：`blob:`+`download` 下载路径可达；`data:` 主路径与既有 `link-download.test.tsx`/`link.test.tsx` 零回归（content 包 link×3 文件 28/28 绿）
- [x] `rel=' '` 场景 noopener 补齐断言绿
- [x] flux-core `isSafeNavigationUrl` 既有测试零回归——守卫测试实际分布在 `packages/flux-renderers-content/src/sanitize.test.ts:67-93`（含 `:92` 现有 `blob:` → `false` 断言，所选放行变体须保持其语义：无 download 的 `blob:` 仍拒）与 `packages/flux-renderers-basic/src/__tests__/button-href-safety.test.tsx`（button 消费方）——sanitize.test.ts 矩阵全绿（含 :92 原断言未改动）+ 新增 download 选项语义用例；button-href-safety 7/7 绿

### Phase 2 - data batch-bar × table 选择接线可发现性（22-02）

Status: completed（2026-08-31 执行：先红 2 用例（local 从未写入 warn / scope 正确接线一次性窗口）后绿 + 3 个防回归负例（写入空数组零 warn / crud 零误报 / 非 dev 零噪音）；数据包 142 文件 1041 tests 全绿、`pnpm test` 68/68 task 全绿、typecheck/lint 绿。执行期落字 Decision：warn 判定经 mount settle 后 macrotask 定时器重读 scope 快照——首渲染快照会误判 page `data` 初始化与 crud `$crud` 状态发布（均 React effect 时点）为"从未写入"）
Targets: `packages/flux-renderers-data/src/batch-bar.tsx`、`schemas.ts`、`batch-bar-definition.ts`、`packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`、`docs/references/renderer-interfaces.md`

- Item Types: `Fix | Proof`

- [x] Proof（先红）：dev 环境渲染"table（默认 local 所有权）+ 绑定 selectionStatePath 的 batch-bar"→ 断言出现一次性 dev warn 且 warn 内容区分"路径从未写入"与"空选择集"（当前红：零诊断）。注意：batch-bar 无通道直接读 table 的 `selectionOwnership`，区分是**间接推断**（scope 路径从未被写入 vs 已写入但为空数组——经 scope 快照是否出现过该 key 判定），Proof 断言按此口径落字（`batch-bar-selection-path-diagnostic.test.tsx` 5 用例：从未写入×1 / scope 接线一次性窗口×1 / 写入空数组零 warn / crud 宿主零误报 / 非 dev 零噪音）
- [x] Fix：batch-bar 补一次性 dev 诊断（沿文件内 `targetWarnedRef`/`countWarnedRef` 既有 dev-warn 模式；仅 dev 生效，生产零噪音）——`batch-bar-selection-path-unwritten` warn 码，路径名 + `'scope'` 前置条件 + `'local'` 默认归因 + "已写入空数组属正常隐藏态"区分语全部在 message 内；`pathWarnedRef` 一次性 + effect cleanup 清定时器；生产构建 effect 入口直接返回（零定时器）
- [x] Fix：三处描述补写前置条件——`schemas.ts` selectionPath 描述、`batch-bar-definition.ts` propContract 描述、`docs/references/renderer-interfaces.md:733-737` dual-host binding boundary 段（table 宿主需 `selectionOwnership:'scope'` 该路径才有写入；默认 `'local'` 从不写入 → bar 不渲染 + 一次性 dev warn）

Exit Criteria:

- [x] 先红用例转绿；生产构建（非 dev）零 warn 断言绿（`vi.stubEnv('DEV', false)` 沿 infinite-scroll-advanced 先例）
- [x] 三处文档/描述与 live 行为逐字一致（table 默认 local 时 bar 不渲染属预期，文档不再误导）
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` batch-bar/table-selection 相关文件绿（batch-bar×4 文件 21/21；全包 142 文件 1041/1041）

### Phase 3 - basic page 样式契约回归 + command-palette className（10-01 / 10-02）

Status: completed（2026-08-31 执行：先红 5 用例（marker-only ×2 / CSS 基线 / 接线 / command-palette className）后绿；`pnpm typecheck`/`pnpm build`/`pnpm lint` 37/37、`pnpm test` 68/68、`pnpm check` exit 0 零新增红（oversized 2 文件为 registered exempt i18n locales，非本计划引入）。执行期接线补点：`vite.workspace-alias.ts` 增 `'@nop-chaos/flux-renderers-basic/styles.css'` 源别名（置于裸包别名之前，沿 industrial/editor/styles.css ENOTDIR 先例）——无此别名 flux-bundle 构建的 postcss-import 会把子路径解析成 `src/index.tsx/styles.css` 报 ENOTDIR）
Targets: `packages/flux-renderers-basic/src/page.tsx`、`packages/flux-renderers-basic/package.json`、新增包级 CSS 文件、build 资产拷贝接线、`apps/playground/src/styles.css`（或包入口自导入）、`packages/flux-renderers-basic/src/command-palette.tsx`

- Item Types: `Fix | Proof | Decision`

- [x] Proof（先红，10-01）：page 测试断言组件输出不携带 `gap-2`/`ml-auto` 等布局工具类（marker-only 断言）+ 包 CSS 文件含 `[data-slot="page-heading"]`/`[data-slot="page-extra"]`/breadcrumb item 槽位选择器的基线布局规则（当前红）——`page-slot-styling-contract.test.tsx` 2 个 marker-only 用例先红（heading/extra/breadcrumb-link/breadcrumb-page 均带迁移类）后绿
- [x] Proof（10-01 消费可见性）：**接线断言**——basic `package.json` 具备 CSS 导出（`sideEffects` 含 `*.css` + 子路径导出）且加载路径落地（playground `styles.css` `@import` 或包入口自导入，择一落字）；无此断言则"文件存在但无宿主加载、全部宿主视觉回归"可通过静态断言漏网（当前红）——接线断言用例先红后绿
- [x] Fix（10-01）：`page.tsx:65,265,273` 三处布局类迁入包级 `@layer base` CSS slot selector；接线全套沿 `flux-react/default-spacing.css` 先例——`package.json` exports/sideEffects + build 追加资产拷贝（`copy-build-assets.mjs` 先例）+ 加载路径（`apps/playground/src/styles.css` `@import` 或 `flux-renderers-form/src/index.tsx:1` 自导入先例，择一 Decision 落字）；`packages/flux-bundle/src/style.css` 聚合是否纳入随同一 Decision 裁定；组件保留 `data-slot` marker。**Decision 落字**：加载路径采用 playground `@import`（content/mobile/scheduling/ai/layout/dashboard 等 8+ 包主流先例，宿主显式 opt-in，符合主题独立原则）；`flux-bundle/src/style.css` 聚合纳入 basic styles.css（page 是全栈默认渲染器，bundle 聚合面须完整）；间距/宽度经 `var(--space-page-heading-gap, 0.5rem)`/`var(--space-page-breadcrumb-max, 10rem)` CSS 变量通道主题可调（带 fallback 视觉等价 gap-2/max-w-40）
- [x] Fix（10-01 门禁同步）：`scripts/__tests__/check-package-css-exports.test.ts:20` 字面量 `Verified 22 …22 resolved targets` 同步为 23（该字面量有多次随新增 CSS 包同步的先例）——实测 `Verified 23 CSS export subpaths across 23 resolved targets`、`pnpm test:scripts` 68/68 绿
- [x] Proof（先红，10-02）：command-palette 测试——schema `meta.className` 合并进根节点类名（当前红）
- [x] Fix（10-02）：`command-palette.tsx:404-409` 根节点改 `className={cn('nop-command-palette', props.meta.className)}`（补 `cn` 导入）

Exit Criteria:

- [x] marker-only 断言、CSS 基线断言、**接线/加载断言**全部转绿；page 既有测试零回归且默认布局视觉等价（槽位布局规则由包 CSS 在 playground 实际加载承载）——page 相关 7 测试文件 98/98 绿；`page-header-semantics.test.tsx` pageheader-overflow 用例随契约迁移同步（`truncate` 类断言翻转为 not.toContain，title 提示断言保留）
- [x] `check:package-css-exports` 零新增红 + `pnpm test:scripts` 绿（门禁测试字面量已同步 23）
- [x] command-palette className 合并用例转绿；同批次 4 个 sibling 模式一致（batch-bar/query-filter/result/link 均 `cn(..., meta.className)`）
- [x] `pnpm --filter @nop-chaos/flux-renderers-basic test` 相关文件绿（全包 60 文件 599/599）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session R1 `ses_fa8554b7affeSLUMXDcewYBSUe`（VERDICT: issues，0 Blocker / 1 Major / 5 Minor）；R2 scoped re-check `ses_fa84b86a2ffeDqvVQDryBTjYgm`（VERDICT: pass-with-minors，Major/全部 Minor 确认 resolved，零新 Blocker/Major，基线接线事实逐项 live 实测证实）
- Verdict: `pass-with-minors`（共识达成：零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: R1 Major-1（basic 包 CSS 通道接线缺失、Phase 3 可在 CSS 无宿主加载时假通过 → 基线补 10-01 CSS 通道现状 + 新增消费可见性 Proof + 接线/门禁字面量 Fix + 消费可见 Exit Criteria）；R1 Minor a-e（门禁字面量同步归 Phase 3 / 22-02 间接推断口径 / isSafeNavigationUrl 测试文件具名 / 新增 pg-10-01-css-infeasible Failure Path / sanitize 再导出措辞）随修订落实；R2 剩余 2 Minor（"6 行"→7 行计数、styles.css 导入措辞收敛）已就地修正。

## Closure Gates

- [x] 全部 4 条 in-scope confirmed contract drifts 已收敛（15-02 / 22-02 / 10-01 / 10-02 逐条对应测试证据——Phase 1–3 Exit Criteria 全勾，closure audit 独立复核 live 代码逐条证实）
- [x] 行为/契约结果已达成（Failure Paths 表 7 行全部有对应用例且绿——6 行 live 测试覆盖 + `pg-10-01-css-infeasible` 未触发（CSS 接线路径全程可行，closure audit 确认判定正确））
- [x] 必要 focused verification 已完成（先红后绿证据落 Phase Exit Criteria——红态实测 Phase 1 4 failed / Phase 2 2 failed / Phase 3 5 failed 均记录）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（Non-Blocking Follow-ups 两条均为 out-of-scope/pre-existing 登记，非 in-scope 降级）
- [x] 受影响的 owner docs 已同步到 live baseline（renderer-interfaces.md dual-host binding boundary 段 + data schemas.ts / batch-bar-definition.ts 描述 + content schemas.ts 文案 + flux-core.md URL Safety Utility 节 + link design.md §12；styling-system.md 无新增规则不改——marker-only 是既有条款（:470）的回归执行，closure audit 确认）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（独立子 agent `ses_fa784e6aaffeFePYmCdGdYVW24`，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37，含 flux-bundle 聚合 basic styles.css 端到端）
- [x] `pnpm lint`（37/37）
- [x] `pnpm test`（68/68 task；`pnpm check` exit 0 零新增红、`pnpm test:scripts` 68/68 含门禁字面量 23）

## Deferred But Adjudicated

（无——本计划不设 deferred 项。）

## Non-Blocking Follow-ups

- 审计 15-02 提到的 button 消费方是否需要 download 语义（当前 button 无此概念）：out-of-scope improvement，登记不动。
- closure audit Minor-1（pre-existing，非本计划引入）：`packages/flux-renderers-content/src/styles.css:33` 嵌套 `@import` 位于规则之后，flux-bundle 构建打印 `[postcss] @import must precede all other statements` warning（build exit 0）——登记归 content 包后续独立裁决。

## Closure

Status Note: 2026-08-31 三 Phase 全部执行完毕并收口——15-02（flux-core `isSafeNavigationUrl` download 选项放行 `blob:`+download、rel trim、docs 三处同步）、22-02（batch-bar 一次性 dev warn + mount settle 延迟判定 Decision + 三处前置条件补写）、10-01（page 三处布局类迁包级 @layer base CSS slot selector + 全套 CSS 通道接线 + vite 源别名补点 + 门禁字面量 22→23）、10-02（command-palette `meta.className` cn 合并）全部先红后绿收口，full-green verification（typecheck/build/lint 37/37、test 68/68 task、check exit 0 零新增红）。closure audit 独立 fresh-session 子 agent 1 轮 APPROVED 零 Blocker/零 Major（3 Minor：1 条 pre-existing postcss warning 登记 follow-up、2 条文字勘误随共识修复）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_fa784e6aaffeFePYmCdGdYVW24`（2026-08-31，1 轮）
- Evidence: VERDICT **APPROVED** 零 Blocker/零 Major。审计独立重跑：`pnpm test` 全 workspace exit 0（content 37 files/312、data 142 files/1041 含新诊断 5 条、basic 60 files/599、flux-core 35 files/513）+ `pnpm test:scripts` 68/68（门禁字面量 `Verified 23 CSS export subpaths across 23 resolved targets` 实测）+ basic 包 typecheck/build（`dist/styles.css` 经 copy-build-assets 落盘）+ `pnpm --filter @nop-chaos/flux build`（bundle `dist/style.css:270-289` 含 `.nop-page [data-slot='page-heading']` 与 CSS var 规则——vite 别名 + 聚合接线端到端证实）+ `pnpm check` exit 0（oversized 2 ERROR 均 registered exempt locale）。四条 drift live 代码逐条复核成立（blob: 仅 download 解锁 / button 零改动 / rel trim；warn 区分"从未写入"与"已写入空数组"+ 生产静默；page marker-only + exports/sideEffects/build 拷贝/playground @import/bundle 聚合/别名顺序全接线链；cn 合并）；测试真实性逐文件核（pre-fix red 推理成立、无弱化——`page-header-semantics` truncate 断言翻转保留 title 断言且带契约变更注释、sanitize `:92` 原断言原样维持）；Failure Paths 7 行映射（6 行 live 覆盖 + css-infeasible 未触发判定正确）；scope 纪律（23 modified + 3 untracked 全部对应 plan 面，`use-table-selection.ts` 零触碰、PageSchema 零触碰、无 ui/a11y/amis 溢出）；协议状态（审计前 Plan Status `active`、closure-audit gate 未勾、executor 未自审）。3 Minor：① content styles.css:33 嵌套 @import 顺序 postcss warning（pre-existing，登记 Non-Blocking Follow-ups）；② daily log Phase 1 红态计数措辞（随共识修复已改）；③ 诊断测试 case 1 注释口径（随共识修复已改）。

Follow-up:

- button 消费方 download 语义评估（out-of-scope，本 plan 起草前已登记，维持不动）。
- content 包 styles.css 嵌套 @import 顺序 postcss warning（closure audit Minor-1 登记，pre-existing，归 content 包后续独立裁决）。
