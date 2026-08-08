# 2 Industrial SCADA 数据管线与公共契约 polish（parse 非对象 / clone 统一 / 导出 parity / error code 注册）

> Plan Status: active
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog（F5 / F6 / P2-1 / P2-2 / P2-3 / P2-8），源自 `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` + `docs/audits/2026-08-08-1712-multi-audit-industrial-hmi-component-audit.md`
> Related: `docs/plans/2026-08-09-0121-2-industrial-scada-p2-polish-runtime-symbols.md`（Non-Goals 显式把 serialization/contract P2 留给本系列 plan）；`docs/plans/2026-08-08-1931-1-industrial-scada-editor-interaction-polish.md`（N=1，editor 交互切片）
> Mission: industrial-hmi-component-audit

## Purpose

把 industrial SCADA 数据管线 + 公共导出契约面 6 个已确认 P2 缺陷收口为「parse 非对象不再类型谎言 / 单一 clone 实现 / serialization 与 definitions 导出 parity / editor-internal-error 码注册到位」，使包的公共导出面与既有注释承诺一致，并消除 prod 派发的 error code 降级到 `.unknown` 的沉默缺口。

## Current Baseline

经 live repo 核对（2026-08-08），6 个 finding 全部仍然成立：

- **F5（parse 非对象返回类型谎言 + 浅拷贝共享引用）**：`src/serialization/parse.ts:3-24` `parseScadaConfig(input)` 签名声明返回 `ScadaConfig`，但 `:14` `return shallowCopy(input)` 对非对象 input 直接 cast 返回（类型谎言）；`shallowCopy`（`:17`）浅拷贝顶层 → 调用方与原对象共享嵌套引用（symbols 数组等），后续 mutate 会回流。注释 `:12` 对 JSON 字符串路径用 `JSON.parse` 是安全的，问题在 object 分支。
- **F6（两份 clone 实现语义分裂）**：`src/editor/editor-session.ts:113` `cloneConfig(config)`（allowlist 字段 + 硬编码 `version:1` + 深克隆 variable `.map((v) => ({ ...v }))`）vs `src/editor/editor-working-helpers.ts:71` `cloneConfigSnapshot(config)`（spread 顶层 + 保留原 version + 深克隆节点 + **浅克隆 variable** `[...config.variables]`）。两者被 session 创建（`:66-67`、`:79-80` 用 `cloneConfig`）与 working helpers（`cloneConfigSnapshot`）分别使用，语义分裂 + 硬编码 version + variables 隔离深度不一致是 footgun。
- **P2-1（serialization 导出不对称）**：`src/index.ts:54` 仅 `export { serializeScadaConfig }`；`parseScadaConfig` / `validateScadaConfig` / `diffScadaConfig` / `ScadaValidationResult` 未导出。注释（index.ts:49-54 附近）称 "host 校验/审计" 但只导出 serialize，host 无法用包内 parse/validate 做入口校验。
- **P2-2（ScadaEditorSession 泄漏内部 UndoStack）**：`src/editor/editor-session.ts:2` `import { UndoStack }` + `:41` `undoStack: UndoStack` 暴露在 `export interface ScadaEditorSession`；`src/editor/index.ts:17` `export type { ScadaEditorSession, ... }`。UndoStack 是域内部实现类，经公开 session type 透传到包公共面，与 docstring "域内部持有 INV-4" 矛盾。
- **P2-3（industrialRendererDefinitions 未导出）**：`src/index.ts:3` `import { industrialRendererDefinitions }` + `:66` `registerRendererDefinitions(registry, industrialRendererDefinitions)`，但未 re-export。与所有兄弟 `flux-renderers-*` 包注册模式（导出 definitions 数组供 host 自定义注册）分叉。
- **P2-8（editor-internal-error 码未注册）**：`src/editor/runtime-factories.ts:175` + `src/editor/runtime-mutators.ts` 在 prod 派发 `'editor-internal-error'`；但 `src/editor/renderer/editor-errors.ts:13-25` `SCADA_EDITOR_ERROR_CODES` 数组不含该码（仅 editor-mount-failed / invalid-node / duplicate-id / invalid-patch / invalid-config + M2 码）→ `scadaEditorErrorI18nKey('editor-internal-error')` 走 `.unknown` fallback（`:50-53`）。locale 文件 `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts` 也无对应翻译键。

## Goals

- F5：`parseScadaConfig` 对非纯对象 input 不再返回类型谎言（抛错或显式 TSDoc 声明只读共享）；object 分支不再与调用方共享嵌套引用。
- F6：统一为单一 clone 实现（深克隆节点 + spread 顶层 + 守卫 variables + 不硬编码 version），消除 `cloneConfig`/`cloneConfigSnapshot` 语义分裂。
- P2-1：`index.ts` serialization 导出 parity（parse/validate/diff/ScadaValidationResult 与 serialize 同步导出，或收窄注释说明为何不导出）。
- P2-2：`ScadaEditorSession` 公开 type 不再泄漏内部 `UndoStack` 类（投影为公开 session type）。
- P2-3：`industrialRendererDefinitions` 与兄弟包对齐导出，或在 owner doc 显式记为接受的例外。
- P2-8：`editor-internal-error` 加入 `SCADA_EDITOR_ERROR_CODES` + 两 locale 翻译键 + design-renderer.md §8.5.2 文档。

## Non-Goals

- 不改 editor 交互行为（F11 / 本轮-11 / P2-4）——属 N=1 plan。
- 不改 align/distribute 坐标语义（本轮-12）/ i18n 渲染层（P2-6 / P2-7）/ design doc file-tree rot（P2-9 / P2-10 / P2-11）——留待后续 i18n/doc/adjudication 轮。
- 不重构 serialization 层架构（config-types / validate 拆分已在 HCA-CG 落地）。
- 不改 runtime error code（runtime scada-errors.ts 不在本 plan；只改 editor 扩展码注册表）。

## Scope

### In Scope

- `src/serialization/parse.ts`（F5）
- `src/editor/editor-session.ts` + `src/editor/editor-working-helpers.ts`（F6）
- `src/index.ts`（P2-1 / P2-3 导出）
- `src/editor/index.ts` + `src/editor/editor-session.ts`（P2-2 投影 type）
- `src/editor/renderer/editor-errors.ts` + `packages/flux-i18n/src/locales/en-US.ts` + `zh-CN.ts`（P2-8）
- owner doc：`docs/components/industrial-hmi-editor/design-renderer.md` §8.5.2（P2-8 码登记）+ §11 导出说明（P2-1/P2-3 若改导出）
- 对应 focused 回归测试（failing-first）

### Out Of Scope

- renderer / engine / binding / symbols 层
- runtime（非 editor 扩展）error code
- e2e

## Failure Paths

| 场景编号            | 触发                                                    | 行为                                                                               | 可重试 | 用户可见表现                        |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ | ----------------------------------- |
| parse-non-object    | `parseScadaConfig(42)` / `parseScadaConfig("not-json")` | 抛 `Error('scada config must be an object')`（Decision 见 Phase 1）                | 否     | host 捕获错误，不得到类型谎言返回值 |
| clone-mutate-leak   | clone 后 mutate clone.symbols[0]                        | 原 config 不受影响（深隔离）                                                       | 否     | 无静默数据串改                      |
| error-code-fallback | mutator 失败派发 editor-internal-error                  | i18n 命中 `industrial.scada.editor.error.editor-internal-error`，不降级 `.unknown` | 否     | host 显示正确文案而非 unknown       |

## Test Strategy

档位选择：**建议有测**

F5 / F6 涉及数据隔离正确性（共享引用 / clone 语义），需 failing-first 断言 mutate 不回流。P2-1 / P2-2 / P2-3 是导出面变更，用导入断言 + 既有测试零回归验证。P2-8 是 registry/locale 完整性，用 registry 完整性测（既有 `editor-errors.test.ts` 已有「prod 派发码必须在 registry」类断言可扩展）。不属 auth / 对外 API 契约硬门禁档（包内导出面），故选「建议有测」。

## Execution Plan

### Phase 1 - parse 非对象守卫 + 浅拷贝共享引用（F5）

Status: planned
Targets: `src/serialization/parse.ts`

- Item Types: `Decision | Proof | Fix`

- [ ] Decision：非纯对象 input 处理策略——(a) 抛 `Error('scada config must be an object')`（fail-closed，与 plan 2026-08-08-1809-1 validate 广度对齐），或 (b) TSDoc 显式声明 object input 只读共享不克隆。倾向 (a)（类型不应撒谎；host 入口校验 fail-closed 更安全）
- [ ] failing-first：`parseScadaConfig(42)` 抛错（非 cast 返回）；`parseScadaConfig({symbols:[...]})` 后 mutate 返回值的 symbols[0] 不回流到原 input
- [ ] Fix：`parse.ts:14` object 分支按 Decision 改（抛错或深克隆节点）；`shallowCopy` 改名/改语义以诚实反映行为
- [ ] Proof：既有 `serialization-parse-serialize.test.ts` 往返测试零回归

Exit Criteria:

- [ ] `parseScadaConfig` 对非对象 input 不返回类型谎言（抛错或显式声明）
- [ ] object input 与调用方不共享嵌套引用（focused 测断言 mutate 隔离）
- [ ] 既有 parse 往返测试零回归

### Phase 2 - clone 实现统一（F6）

Status: planned
Targets: `src/editor/editor-session.ts`, `src/editor/editor-working-helpers.ts`

- Item Types: `Decision | Proof | Fix`

- [ ] Decision：统一方向——以 `cloneConfigSnapshot`（spread 顶层 + `cloneNodeDeep` 深克隆节点 + 保留 version）为单一实现的基座，`editor-session.ts` 的 `cloneConfig` 删除或改为 thin wrapper 调用它，消除硬编码 `version:1`。**注（reviewer 核对）**：`cloneConfigSnapshot`（`editor-working-helpers.ts:75`）当前对 variables 是 `[...config.variables]`（浅数组拷贝，共享 variable 对象引用），而 `cloneConfig`（`editor-session.ts:118`）是 `.map((v) => ({ ...v }))`（深一层）。故统一实现**不能直接继承 cloneConfigSnapshot 的 variables 处理**，必须把 variables 加深到 `.map((v) => ({ ...v }))` 或等价深隔离，否则会引入新的共享引用缺口
- [ ] failing-first：session 创建后 mutate `workingConfig.symbols[0]` 不影响传入的原始 config；`variables` 字段被深隔离（mutate `workingConfig.variables[0]` 不回流原件，对统一后的实现红）；config 原始 `version` 被保留（非硬编码 1）
- [ ] Fix：`editor-session.ts:113` `cloneConfig` 删除或改为 thin wrapper 调 `cloneConfigSnapshot`；`:66-67`、`:79-80` 调用点同步
- [ ] Proof：既有 editor-session / editor-working-helpers 测试零回归；`structuredClone(node.custom)`（plan 2026-08-08-1316-2 HCA11 P2-1 已落地的 cloneNodeDeep）在统一实现中仍生效

Exit Criteria:

- [ ] 仓库内只剩一份 clone-config 实现（`cloneConfig` 删除或为 thin wrapper）
- [ ] clone 深隔离 symbols 节点 + variables + custom（focused 测断言）
- [ ] version 字段保留原值（非硬编码）
- [ ] 既有 session/working-helpers 测试零回归

### Phase 3 - serialization / definitions 导出 parity（P2-1 / P2-3）

Status: planned
Targets: `src/index.ts`

- Item Types: `Decision | Proof | Fix`

- [ ] Decision：P2-1 导出 `parseScadaConfig`/`validateScadaConfig`/`diffScadaConfig`/`ScadaValidationResult`（与注释承诺对齐），或收窄注释说明只导出 serialize 的原因。P2-3 导出 `industrialRendererDefinitions`（与兄弟包对齐），或在 `design-renderer.md §11` 记为接受的例外。倾向两者都导出（host 入口校验 + 自定义注册是合理用例）
- [ ] Proof（仅当 Decision 选「导出」分支时执行）：新增测试 `import { parseScadaConfig, validateScadaConfig, diffScadaConfig, industrialRendererDefinitions, serializeScadaConfig } from '@nop-chaos/flux-renderers-industrial'` 全部 defined；若选「收窄注释」分支，改为断言 `index.ts` 注释与实际导出一致
- [ ] Fix：`src/index.ts` 增对应 `export { ... }` re-export（导出分支）；核对 `ScadaValidationResult` 是 type export（`export type`）
- [ ] Proof：包公共面既有消费者（playground / 兄弟包 import）零回归（typecheck 兜底）

Exit Criteria:

- [ ] serialization 5 符号（serialize/parse/validate/diff/ScadaValidationResult）+ `industrialRendererDefinitions` 在 `src/index.ts` 导出状态与 Decision 一致
- [ ] 导出断言测试通过（或 owner doc 显式记录例外）
- [ ] 包公共面零回归（typecheck + 既有 import 测试）

### Phase 4 - editor-internal-error 码注册（P2-8）

Status: planned
Targets: `src/editor/renderer/editor-errors.ts`, `packages/flux-i18n/src/locales/en-US.ts`, `packages/flux-i18n/src/locales/zh-CN.ts`, `docs/components/industrial-hmi-editor/design-renderer.md`

- Item Types: `Proof | Fix`

- [ ] failing-first：扩展 `editor-errors.test.ts`，断言 `scadaEditorErrorI18nKey('editor-internal-error')` === `'industrial.scada.editor.error.editor-internal-error'`（当前返回 `.unknown`，红）
- [ ] Fix：`SCADA_EDITOR_ERROR_CODES`（`editor-errors.ts:13-25`）增 `'editor-internal-error'`（M1 子集，因 mutator applyDiff 失败属 M1 路径）；`SCADA_EDITOR_ERROR_CODES_M1` 同步增
- [ ] Fix：`packages/flux-i18n/src/locales/en-US.ts` + `zh-CN.ts` 增 `industrial.scada.editor.error.editor-internal-error` 翻译键（en: 'Editor internal error' / zh: '编辑器内部错误'，措辞执行时对齐既有码风格）
- [ ] Fix：`docs/components/industrial-hmi-editor/design-renderer.md` §8.5.2 码表增 `editor-internal-error`
- [ ] Proof：`runtime-error-propagation.test.ts` 既有 onError 派发断言零回归（派发 code 不变，只是 i18n 映射不再降级）

Exit Criteria:

- [ ] `scadaEditorErrorI18nKey('editor-internal-error')` 命中正确 i18n key（非 `.unknown`）
- [ ] 两 locale 含对应翻译键
- [ ] design-renderer.md §8.5.2 码表含 `editor-internal-error`
- [ ] 既有 runtime-error-propagation 测试零回归

### Phase 5 - ScadaEditorSession 公开 type 不泄漏 UndoStack（P2-2）

Status: planned
Targets: `src/editor/editor-session.ts`, `src/editor/index.ts`

- Item Types: `Decision | Proof | Fix`

- [ ] Decision：UndoStack 隐藏策略——(a) 导出投影公开 type（如 `type ScadaEditorSessionPublic = Omit<ScadaEditorSession, 'undoStack'> & { undoStack: ReadonlyUndoStack }` 或完全 omit `undoStack`，对外只保留 `canUndo`/`canRedo`/`undo`/`redo` 方法签名），`editor/index.ts` 改导出投影 type；或 (b) 保留 `undoStack: UndoStack` 暴露但在 owner doc 显式声明其为「内部实现，外部不应直接依赖」。倾向 (a)（UndoStack 是域内部实现类，docstring 已标 INV-4 内部持有，泄漏到包公共面与注释矛盾）。**执行时核对**：grep 包外（apps/playground、兄弟包）是否直接访问 `session.undoStack` —— 若有外部消费者直接触该字段，需先确认能否迁移到方法访问，否则降级 (b) 并在 Deferred But Adjudicated 记录理由
- [ ] Proof（failing-first）：新增/扩展测试断言包公共面导出的 session type 不含可变 `UndoStack` 实例字段（投影 type 下 `undoStack` 不可达或只读窄面；或 type-level 断言 `editor/index.ts` 导出的是投影 type 而非原接口）
- [ ] Fix（导出分支）：`editor-session.ts` 增投影公开 type（保留内部 `ScadaEditorSession` 实现接口含 `undoStack`，新增不含/窄化的公开别名）；`editor/index.ts:17` 改导出投影 type
- [ ] Proof：既有 editor-session / editor 消费测试零回归；包公共面 typecheck 通过

Exit Criteria:

- [ ] `editor/index.ts` 导出的 session type 不再泄漏可变 `UndoStack` 实例字段（与 docstring INV-4 一致），或在 owner doc 显式记录为接受的例外
- [ ] 包外无直接 `session.undoStack` 访问被破坏（grep 确认，或迁移完成）
- [ ] 既有 editor session 测试零回归

## Draft Review Record

- Reviewer / Agent: fresh sub-agent round 1 `ses_01d229cfcffe10cvhJZqrrhRrW` + round 2 `ses_01d1ed0acffe6946JMkOaZQiRp`
- Verdict: `pass-with-minors`（round 2 共识达成，零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed:
  - Round 1 M-1（P2-2 在 Goals/Scope/Closure Gates 有登记但无执行 Phase，Anti-Slacking 违约）→ 新增 Phase 5「ScadaEditorSession 公开 type 不泄漏 UndoStack」，含 Decision（投影 type vs doc 例外 + grep 包外消费者核对步骤）/ Proof / Fix / Exit Criteria；P2-2 现可从 Goals → Phase 5 → Closure Gates 完整追溯
  - Round 1 m-1（F6 Decision 误述 cloneConfigSnapshot 的 variables 处理）→ Phase 2 Decision 补正：cloneConfigSnapshot（`editor-working-helpers.ts:75`）variables 为浅 `[...config.variables]`，cloneConfig（`editor-session.ts:118`）为深 `.map((v)=>({...v}))`；统一实现须加深 variables 隔离
  - Round 1 m-2（Phase 3 Proof 假定导出分支）→ Proof 改为「仅当 Decision 选导出分支时执行」，补收窄注释分支的断言
  - Round 2 m-1（Current Baseline line 18 variables 深浅标注反向）→ 已改为 cloneConfig=深克隆 variable / cloneConfigSnapshot=浅克隆 variable，与 Phase 2 Decision 一致
  - 包外 `.undoStack` 消费者 grep：apps/ + 其他 packages 无直接访问 ScadaEditorSession.undoStack（仅 scheduling/spreadsheet/report-designer 同名不相关字段），Phase 5 投影 type 分支可行
  - 所有 live 引用经 reviewer 双轮核对：F5/F6/P2-1/P2-2/P2-3/P2-8 全部 confirmed-live

## Closure Gates

- [ ] F5：parse 非对象不再类型谎言 + 不共享嵌套引用（focused 测断言）
- [ ] F6：仓库内单一 clone 实现，深隔离 + 不硬编码 version（focused 测断言）
- [ ] P2-1：serialization 导出与注释承诺一致（导出或收窄注释）
- [ ] P2-2：ScadaEditorSession 公开 type 不泄漏 UndoStack（投影 type 落地）
- [ ] P2-3：industrialRendererDefinitions 导出状态与 Decision 一致
- [ ] P2-8：editor-internal-error 注册 + locale + doc 三处齐
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect
- [ ] 受影响 owner docs 已同步（design-renderer.md §8.5.2 / §11 导出说明）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> 本 plan 暂无 deferred 项。若 P2-2 投影 type 改造因 UndoStack 被 session 消费者直接访问而无法纯投影，则降级为「保留 UndoStack 暴露 + TSDoc 显式声明其为内部实现」，并在此记录 Why Not Blocking Closure；但默认假设投影 type 可行（session 消费者经方法访问 undo/redo，非直接触 undoStack 字段）。

## Non-Blocking Follow-ups

- 本轮-12 / P2-5（嵌套 group 坐标语义 + false-green 测试）留待后续 i18n/doc/adjudication 轮。
- P2-6 / P2-7（palette / toolbox i18n）/ P2-9 / P2-10 / P2-11（design doc file-tree rot）留待后续 i18n/doc polish 轮。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
