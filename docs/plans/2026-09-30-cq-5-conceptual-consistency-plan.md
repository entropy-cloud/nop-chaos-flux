# CQ-5 概念一致性收敛（i18n / variant 词表 / 空态 / 命名 / 交付惯例）

> Plan Status: active
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-C1、C2、C4、C7、C8、C9、C10、C12）+ 首轮独立评审 live 勘误
> Related: `docs/architecture/variant-vocabulary.md`、`docs/architecture/renderer-markers-and-selectors.md`、`packages/flux-i18n/src/i18n.ts`

## Purpose

对"同一概念多种命名/多种解法"的八处聚类做一次收敛决断：真重复键合并、词表文档与 live 对齐、空态与加载反馈规约化、包内命名统一、交付惯例单制化。原则：**以 live 中已被多数派与文档共同认可的形态为基准**，文档漂移回写文档，代码漂移向基准收敛；对行为无影响的纯风格漂移只立约定不做全仓 churn。

## Current Baseline

- i18n：`flux.` 前缀 792 处为主流（`FLUX_NAMESPACE='flux'`）；裸前缀 328 处。`check-i18n-keys.mjs:49-51` 自动补前缀 + 运行时 `normalizeTranslationKey` + i18next `defaultNS:'flux'`，两种拼法门禁与运行时均解析等价。**真问题（重复键）**：`flux.barcode.cameraUnavailable`（en-US.ts:1585 / zh-CN.ts:1580，barcode 块内）↔ `flux.cameraUnavailable`（en:1395 / zh:1390 顶层散键）双键同义；en-US.ts:1175 的 `flux.wordEditor.cameraUnavailable` 是第三份同名但**合法保留**（word editor 域）；`flux.table.noData`（en-US.ts:238）仅 1 处调用（table-renderer.tsx:109）↔ `flux.common.noData`（en-US.ts:33，约 20 处调用）；另有一批顶层散键（alignBarcode/offlineQueueMessage/itemsScanned/batchConfirm，en:1395-1400）。check 脚本对 onlyInZh/onlyInEn 只告警不 exit 1，扫描排除 `__tests__`——键残留检查须覆盖 zh/en 两词表 + 测试文件。
- variant 词表：`variant-vocabulary.md:38/:75` 称 primary 非法，且文档内部自相矛盾（第 2 节 AMIS 兼容集含 primary vs Current Target Vocabulary 不含）；ui cva（button.tsx:22 注释自称 schema-facing）、`schemas.ts:285`、`basic-renderer-definitions.ts:244-258` union、`styling-system.md:16/:644-647` 均已接纳 primary（R2 审计 `R2-consistency-audit.md:98` 记录过修复）。`destructive`(:29) 与 `danger`(:38) 同 cva 并存；`theme-tokens/src/styles.css:65-67`（`--danger` 家族）与 :76-77 等三主题块（`--destructive`）并存；`tailwind-preset/src/index.ts:49-53` 互为 fallback。
- 空态：ui Empty（transfer-renderer.tsx:545、tree-option-list.tsx:404）/自定义 div+data-slot（tree-renderer.tsx:634、list-renderer.tsx:381、**echarts-renderer.tsx:381 已带 `data-slot="echarts-empty"`**）/类名标记（diff-view-renderer.tsx:147 `nop-diff-empty-state`，CSS 消费点 diff-view.css:132 已确认存在）/纯文本 fallback（crud-renderer.tsx:57、chart-renderer.tsx:586 空 fallback 是否带 data-slot 执行时确认）。
- 裸 `Loader2 + animate-spin` 2 处（ai-tool-call.tsx:346、ai-attachments.tsx:407）绕过 ui Spinner。
- form-advanced 行写回 `onSync` 精确清单（评审核实）：`key-value-row.tsx`（声明 :22、调用 :98/:149、memo 比较 :236）、`array-editor.tsx`（:46/:64/:121/:547）、`key-value.tsx:402` 传参；**combo/input-table 无 onSync**。表单公共契约为 `onChange`。
- `flux-renderers-form` CSS 交付离群：`src/index.tsx:1` entry import `./form-renderers.css` + 导出键 `./form-renderers.css`。**消费者全景（评审核实）**：`flux-bundle/src/style.css:2`（唯一生产消费者）、`flux-bundle/src/index.test.tsx:90`（硬断言旧 import 字符串）、`tsconfig.base.json:43-44` 与 `vite.workspace-alias.ts:61-62`（旧 specifier alias）、form 包自有两个测试（form-renderers-css.test.ts:4、markdown-editor-styles.test.ts:11 readFileSync）、`scripts/audit/ui-consistency-exemptions.mjs:371-376` 与 `docs/audits/visual-quality/exemption-baseline-v0.json:170`（按旧路径登记豁免）。`apps/playground/src/styles.css` **没有** form 的 @import（现经 entry import 间接进入）——标准化后需**新增** `@import '@nop-chaos/flux-renderers-form/styles.css'`。
- 测试放置混用 4 包（`.test.tsx` 口径）：form-advanced 87+50、content 5+30、layout 3+17、mobile 4+8；两包还有 `.test.ts`（form-advanced **tests** 11 + 同目录 15）——迁移口径含 `.test.ts`。`vitest.shared.ts:33` include 为全包 glob、coverage exclude 双模式兜底，移动不需改 vitest 配置。
- 内联裸 `<button type="button">` 约 13 文件（grep 口径执行时重定清单）；`tabs.tsx:383-389` 有注释先例；org-select-panel（flux-renderers-form/src/renderers/org/）为代表。
- Protected Area：styling contract plan-first——本 plan 即 plan；`ui/src/index.ts` 不动（Empty/Spinner 均已存在）。

## Goals

- i18n 重复键归一（真重复双键合一、散键归位），约定成文。
- variant-vocabulary.md 与 live 对齐（primary 合法化 + 文档内部矛盾收敛 + danger/destructive 双轨映射表），token 双定义注记。
- 空态/加载反馈规约落文档；裸 Loader2 清零；空态标记统一 data-slot + `flux.common.noData`。
- form-advanced 行写回命名统一 `onChange`；form 包 CSS 交付标准化（全部 7 类消费点同步）；4 包测试放置单制化；裸 button 判据成文。

## Non-Goals

- 不做 328 处裸前缀键的全仓 re-prefix（门禁与运行时解析已等价，纯 churn；约定文档写明新代码必须带前缀）。
- 不改任何 cva/组件视觉行为（向后兼容）；不新增 ui 导出。
- 不迁移 Spinner↔Skeleton 存量选择（只立规约，两态各自合法）。
- 不做全仓测试放置大迁移（只收敛 4 个混用包）。

## Scope

### In Scope

- `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`、scheduling 两个调用文件、`flux-renderers-data/src/table-renderer.tsx`（noData 归一唯一调用点）
- `docs/architecture/variant-vocabulary.md`、`docs/architecture/renderer-markers-and-selectors.md`、`docs/architecture/styling-system.md`（交叉引用修正如需）
- `packages/theme-tokens/src/styles.css`、`packages/tailwind-preset/src/index.ts`（仅注记）
- 空态：`flux-renderers-data`（tree/list/crud/chart；echarts 已合规仅核对）、`flux-renderers-content/diff-view`
- `packages/flux-renderers-ai/src/renderers/{ai-tool-call,ai-attachments}.tsx`
- `packages/flux-renderers-form-advanced/src/{key-value,key-value-row,array-editor}.tsx`
- `packages/flux-renderers-form/`（CSS 交付 + 两个自测试）、`packages/flux-bundle/`（style.css + 测试断言）、`tsconfig.base.json`、`vite.workspace-alias.ts`、`apps/playground/src/styles.css`（新增 @import）、`scripts/audit/ui-consistency-exemptions.mjs`、`docs/audits/visual-quality/exemption-baseline-v0.json`
- 测试放置：form-advanced/content/layout/mobile 四包（含 `.test.ts`）

### Out Of Scope

- 全仓 i18n re-prefix；cva 行为变更； Spinner/Skeleton 存量迁移；其余包测试迁移。

## Failure Paths

| 可测场景编号        | 触发                                                                                              | 行为                                                           | 可重试 | 用户可见表现     |
| ------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------ | ---------------- |
| i18n-key-merge-miss | 删除旧键后仍有源码调用点引用（测试文件残留由 Phase 1 grep proof 兜底，gate 扫描排除 `__tests__`） | `check:i18n-keys` exit 1（缺失键）                             | 是     | check 红并报键名 |
| css-export-rename   | form 包导出键变更后有消费者未同步                                                                 | flux-bundle 构建红（@import 解析不到）+ flux-bundle 单测断言红 | 是     | build/test 红    |

## Test Strategy

档位：**建议有测**——键合并与命名改动由既有 i18n 门禁 + 全量测试兜底；onSync→onChange、CSS 交付迁移各补 focused 断言（导出键存在性、props 契约、bundle 测试同步）。

## Execution Plan

### Phase 1 - i18n 重复键合并

Status: completed
Targets: `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`、scheduling 两文件、`flux-renderers-data/src/table-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] Fix：全部完成（双语词表同步；cameraUnavailable 顶层重复删除=barcode ns 已有同值条目;5 散键归位 barcode ns;table.noData 双语条目删除+调用点归一）
- [x] Proof：`check:i18n-keys` exit 0；scheduling 1070 / data 1200 / flux-i18n 30 绿；旧键 grep 零残留（0 命中）

Exit Criteria:

- [ ] 两对重复键在词表中各只剩一条（wordEditor 域键除外）；调用点全部指向归一键
- [ ] i18n 门禁 + focused 测试绿

### Phase 2 - variant 词表对齐 + token 注记

Status: completed

Audit M1 补正：:241-253 Current Target Vocabulary 节加作用域界定（long-range guidance 非 live 契约,类型更名 ButtonVariantTarget）+ primary 表述改为 intent 优先/AMIS 兼容保留;§5 的 destructive-only 表述调和为「destructive 优先,danger 为注册别名」。
Targets: `docs/architecture/variant-vocabulary.md`、`packages/theme-tokens/src/styles.css`、`packages/tailwind-preset/src/index.ts`

- Item Types: `Decision | Fix`

- [x] Decision：primary 合法(实况:contract union 13 值含 primary,§2 AMIS 兼容集本已声明)——§1 三条 shadcn 语境 bullet 改写为"shadcn 基线 + Flux schema-facing 扩展"表述消除内部矛盾;danger/destructive 双轨映射写入 §1 bullets
- [x] Fix：三处失真回写(:38 语境化/:75 改为 primary 合法+越界值报错/Button 表格行 13 值 union);theme-tokens --danger 家族与 tailwind-preset 别名处补 dual-track 契约注记
- [x] Proof：三检查全绿(anchors 354 docs/garbled/ui-consistency 无新增)

Exit Criteria:

- [ ] 词表文档无与 live cva/contract union 矛盾的陈述、无内部自相矛盾；双定义注记在位
- [ ] 相关 check 门禁全绿

### Phase 3 - 空态与加载反馈规约化

Status: completed
Targets: data 包（tree/list/crud/chart 空态；echarts 核对）、diff-view 空态、ai 2 处 Loader2、`docs/architecture/renderer-markers-and-selectors.md`

- Item Types: `Fix | Decision | Proof`

- [x] Decision：规约三条成文（renderer-markers-and-selectors.md「Empty-State, Loading, And Inline Affordance Conventions」节,含内联 affordance 裸 button 判据——CQ-C12 一并落地）
- [x] Fix：**live 勘察:tree/list/crud/echarts/chart 已合规**(common.noData + 各自 data-slot——前几轮已收敛,本 Phase 仅核验);diff-view 空态补 `data-slot="diff-view-empty"`(类名保留,css 不动);ai 两处裸 Loader2 → ui Spinner(aria-hidden 传入后 AT 行为与原装饰性 glyph 一致,Spinner props 展开序已核实)
- [x] Proof：ai 838 / content 341 绿

Exit Criteria:

- [x] 裸 Loader2 零残留（grep 0）
- [x] 规约条目落档；测试绿

### Phase 4 - form-advanced onSync → onChange

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/{key-value,key-value-row,array-editor}.tsx`

- Item Types: `Fix | Proof`

- [x] Fix：11 处改名完成（key-value-row 6、array-editor 4、key-value 传参 1）+ key-value.test 2 处 props 同步;R3-P25 行契约随 props 同名更新
- [x] Proof：form-advanced 1144 绿;包外 grep 仅剩 industrial 无关同名方法与 dist 产物

Exit Criteria:

- [x] 包内 src 零残留
- [x] 全包测试绿（1144）

### Phase 5 - form 包 CSS 交付标准化（全消费点同步）

Status: completed
Targets: `packages/flux-renderers-form/`（css 改名 + index.tsx + 2 个自测试）、`packages/flux-bundle/src/style.css`、`packages/flux-bundle/src/index.test.tsx`、`tsconfig.base.json`、`vite.workspace-alias.ts`、`apps/playground/src/styles.css`、`scripts/audit/ui-consistency-exemptions.mjs`、`docs/audits/visual-quality/exemption-baseline-v0.json`

- Item Types: `Fix | Proof`

- [x] Fix：git mv + 全部 9 类触点同步（package.json 导出键+build copy 脚本、entry import 移除、bundle style.css、bundle 测试两处、tsconfig alias、vite alias、form 两个自测试、exemptions.mjs、baseline-v0.json、playground 新增 @import）
- [x] Proof：form build 绿（styles.css→dist）;bundle 8 测试绿（含改写断言）;check:package-css-exports 25/25 exit 0;ui-consistency 门禁无新增;form 943 绿（form-renderers-css/markdown-editor-styles 自测试改路径后通过）

Exit Criteria:

- [x] 交付模式一致;src/配置面零旧 specifier（残留仅 dist 产物与 eslint 缓存,重建即消）
- [x] 构建/测试/豁免门禁全绿

### Phase 6 - 测试放置单制化（4 包）+ 裸 button 判据

Status: completed
Targets: form-advanced/content/layout/mobile 测试文件（含 `.test.ts`）、`docs/architecture/renderer-markers-and-selectors.md`、org-select-panel

- Item Types: `Fix | Decision`

- [ ] Decision：判据成文——文本级内联 affordance 用裸 `<button type="button" data-slot>`，控件级交互用 ui Button；org-select-panel 补 tabs.tsx 式注释
- [x] Fix：14 个文件 git mv（form-advanced 4 进 `__tests__`;content 1/layout 5/mobile 4 出至同目录）+ 相对导入层级重写(首版出向映射写错被 typecheck 即时拦截后修正);裸 button 判据已随 Phase 3 落档
- [x] Proof：四包计数一致全绿（1144/341/140/186——移动前后逐一相同,零丢失）

Exit Criteria:

- [x] 四包单制化完成（目录清单核验:同 dir 或全 **tests**）
- [x] 判据落档(Phase 3);测试零丢失

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_a7accdfe，两轮）
- Verdict: 首轮 `fail`（1 Major）→ 修订 → 第二轮 `pass`（零 Blocker/Major；4 条文字级 Minor 已当场修正：onSync 计数、Failure Path 括注、openingCamera 散键、grep 措辞）
- Rounds: 2
- Findings addressed: M1（Phase 5 消费者清单补全至 7 类 + playground 改"新增 @import" + Failure Path flux-bundle 归因 + Proof 增 audit-ui-consistency-gaps 复跑）；Minor 10 条吸收/落定

## Closure Gates

- [x] 两对 i18n 重复键归一且门禁绿
- [x] variant 词表文档与 live 一致
- [x] 空态/加载规约成文且违规点清零
- [x] onSync 包内归一；form CSS 交付标准化（9 类触点全同步）；4 包测试单制化
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] owner docs 已同步（variant-vocabulary、renderer-markers 更新）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### 全仓 i18n 裸前缀 re-prefix（328 处）

- Classification: `optimization candidate`
- Why Not Blocking Closure: `normalizeTranslationKey` 与 check 门禁已使两种拼法解析等价，re-prefix 纯 churn 无行为收益；新代码约束已由约定文档覆盖
- Successor Required: `no`
- Successor Path: —

### Spinner/Skeleton 存量选择迁移

- Classification: `watch-only residual`
- Why Not Blocking Closure: 两态各自合法，规约已立；存量均为合理选择
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- CQ-C11 入口/导出组织漂移（允许范围内，新包趋 type-block+named）

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<>>
- Evidence: <<>>

Follow-up:

- <<>>
