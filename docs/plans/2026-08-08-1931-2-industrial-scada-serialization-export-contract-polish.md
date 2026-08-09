# 2 Industrial SCADA 数据管线与公共契约 polish（parse 非对象 / clone 统一 / 导出 parity / error code 注册）

> Plan Status: completed
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

Status: completed
Targets: `src/serialization/parse.ts`

- Item Types: `Decision | Proof | Fix`

- [x] Decision：非纯对象 input 处理策略——选 **(a) 抛 `Error('scada config must be an object')`**（fail-closed，与 validate `isPlainObject` 广度对齐，消除签名类型谎言）；纯对象分支改 `structuredClone` 深隔离（不再 shallowCopy 共享嵌套引用）
- [x] failing-first：`serialization-parse-serialize.test.ts` 重写「非对象 pass-through」为「throw」（null/array/原始值），新增 `parseScadaConfig(42/null/[1,2])` 抛错；增强 object 分支断言 `parsed.symbols[0].x = 999` 不回流到 source
- [x] Fix：`parse.ts` 重写——纯对象窄化守卫 + `structuredClone` 深克隆；移除 `shallowCopy`
- [x] Proof：`serialization-parse-serialize.test.ts` 9 测全过（含既有 JSON 字符串解析 + serialize 往返零回归）；全包 1424 测全绿；`pnpm typecheck` 绿

Exit Criteria:

- [x] `parseScadaConfig` 对非对象 input 不返回类型谎言（抛 `scada config must be an object`）
- [x] object input 与调用方不共享嵌套引用（focused 测断言 mutate symbols[0].x 隔离）
- [x] 既有 parse 往返测试零回归

### Phase 2 - clone 实现统一（F6）

Status: completed
Targets: `src/editor/editor-session.ts`, `src/editor/editor-working-helpers.ts`, `src/editor/undo-redo/undo-redo-adapter.ts`

- Item Types: `Decision | Proof | Fix`

- [x] Decision：以 `cloneConfigSnapshot`（spread 顶层 + `cloneNodeDeep` 深克隆节点 + 保留 version）为单一实现基座。variables 加深到 `.map((v) => ({ ...v }))`（修复 reviewer m-1 指出的 cloneConfigSnapshot 浅 `[...config.variables]` 缺口）；viewport 浅拷贝 + background `structuredClone` 与原 cloneConfig 同隔离纪律。editor-session.cloneConfig 删除（改为调 cloneConfigSnapshot）；**额外统一 `undo-redo-adapter.structuredCloneSafe`**（第三处同型 clone，硬编码 `version:1`，经核对无循环依赖——editor-working-helpers import 闭包不含 undo-redo-adapter——一并收敛为 cloneConfigSnapshot，满足「仓库内单一 clone 实现」closure gate）
- [x] failing-first：`editor-working-helpers.test.ts` 增 variables 元素深隔离 + version 保留；`editor-session.test.ts` 增 session 级 variables 元素深隔离 + version 保留（统一后实现下转绿）
- [x] Fix：`editor-session.ts` 删除 `cloneConfig`/`cloneNode`，import + 调 `cloneConfigSnapshot`（createScadaEditorSession / resetSession 两处调用点同步）；`editor-working-helpers.ts` 加深 cloneConfigSnapshot；`undo-redo-adapter.ts` 删除 `cloneConfig`/`structuredCloneSafe`/`cloneNodeDeep` 三 helper，改调 cloneConfigSnapshot
- [x] Proof：editor-session / editor-working-helpers / undo-redo-adapter / runtime-error-propagation / editor-state-integrity / runtime-mutators-nested 69 测零回归；全包 1427 测全绿；`pnpm typecheck` 绿；`structuredClone(node.custom)` 在统一 cloneConfigSnapshot 中仍生效（custom 深克隆测覆盖）

Exit Criteria:

- [x] 仓库内只剩一份 clone-config 实现（editor-session.cloneConfig + undo-redo-adapter.structuredCloneSafe 均删除，统一到 cloneConfigSnapshot）
- [x] clone 深隔离 symbols 节点 + variables + custom（focused 测断言）
- [x] version 字段保留原值（非硬编码）
- [x] 既有 session/working-helpers 测试零回归

### Phase 3 - serialization / definitions 导出 parity（P2-1 / P2-3）

Status: completed
Targets: `src/index.ts`

- Item Types: `Decision | Proof | Fix`

- [x] Decision：选「导出」分支——P2-1 导出 `parseScadaConfig`/`validateScadaConfig`/`diffScadaConfig` + `export type ScadaValidationResult`（与 host 校验/审计注释承诺对齐）；P2-3 导出 `industrialRendererDefinitions`（与兄弟 flux-renderers-\* 包注册模式对齐）。host 入口校验 + 自定义注册均为合理用例
- [x] Proof：新增 `src/index-exports.test.ts` 断言包入口 barrel 导出 5 serialization 符号 + industrialRendererDefinitions（数组 + 非空）+ parse→validate host 入口校验联通
- [x] Fix：`src/index.ts` 增 4 个 `export { ... }`（parse/validate/diff/serialize 既存 + 新增）+ `export type { ScadaValidationResult }` + `export { industrialRendererDefinitions }`，附契约注释
- [x] Proof：包公共面既有消费者（renderer-definitions.test / playground import）零回归（全包 1430 测全绿）；`pnpm typecheck` 绿

Exit Criteria:

- [x] serialization 5 符号（serialize/parse/validate/diff/ScadaValidationResult）+ `industrialRendererDefinitions` 在 `src/index.ts` 导出状态与 Decision 一致（全部导出）
- [x] 导出断言测试通过（`index-exports.test.ts` 3 测）
- [x] 包公共面零回归（typecheck + 既有 import 测试）

### Phase 4 - editor-internal-error 码注册（P2-8）

Status: completed
Targets: `src/editor/renderer/editor-errors.ts`, `packages/flux-i18n/src/locales/en-US.ts`, `packages/flux-i18n/src/locales/zh-CN.ts`, `docs/components/industrial-hmi-editor/design-renderer.md`

- Item Types: `Proof | Fix`

- [x] failing-first：`editor-errors.test.ts` 增断言 `scadaEditorErrorI18nKey('editor-internal-error')` === `'industrial.scada.editor.error.editor-internal-error'`（修复前走 `.unknown` fallback，红）+ M1/全集 registry 含该码
- [x] Fix：`SCADA_EDITOR_ERROR_CODES` + `SCADA_EDITOR_ERROR_CODES_M1` 同步增 `'editor-internal-error'`（M1 子集，mutator applyDiff 失败属 M1 路径）
- [x] Fix：`en-US.ts` 增 `'editor-internal-error': 'Editor internal error'` / `zh-CN.ts` 增 `'编辑器内部错误'`
- [x] Fix：`design-renderer.md` §8.5.2 码表 + 注释块增 `editor-internal-error`（语义 + 沉默缺口闭合说明）
- [x] Proof：`runtime-error-propagation.test.ts`（6 测）+ `editor-state-integrity.test.ts`（12 测）既有 onError 派发断言零回归；`i18n-contract.test.ts`（19 测）双 locale key parity 通过

Exit Criteria:

- [x] `scadaEditorErrorI18nKey('editor-internal-error')` 命中正确 i18n key（非 `.unknown`）
- [x] 两 locale 含对应翻译键（i18n-contract parity 测通过）
- [x] design-renderer.md §8.5.2 码表含 `editor-internal-error`
- [x] 既有 runtime-error-propagation 测试零回归

### Phase 5 - ScadaEditorSession 公开 type 不泄漏 UndoStack（P2-2）

Status: completed
Targets: `src/editor/editor-session.ts`, `src/editor/index.ts`

- Item Types: `Decision | Proof | Fix`

- [x] Decision：选 **(a) 导出投影公开 type**——`type ScadaEditorSessionPublic = Omit<ScadaEditorSession, 'undoStack'>`，`editor/index.ts` 改导出此投影 type（不再导出 impl 接口）。grep 复核：apps/ + 兄弟包无直接 `session.undoStack` 访问（Draft Review 已确认；所有 `.undoStack` 消费者均为 editor 域内部经 relative path import impl 接口，不触公共 barrel），投影 type 分支可行。undo/redo 对外经 `component:undo`/`redo` 句柄 + `onSessionChange` payload canUndo/canRedo 消费，外部无需触 undoStack 字段
- [x] Proof（type-level failing-first）：新增 `editor/editor-public-types.test.ts`——经 `import type { ScadaEditorSessionPublic } from './index.js'` 断言公开 barrel session type 不含可变 undoStack（`@ts-expect-error` 守 undoStack 访问；泄漏则 directive unused → typecheck 红；tsconfig 含 src 故 typecheck 强制）
- [x] Fix（导出分支）：`editor-session.ts` 增 `export type ScadaEditorSessionPublic = Omit<ScadaEditorSession, 'undoStack'>`（impl 接口保留含 undoStack 供域内部）；`editor/index.ts:17` 改 `export type { ScadaEditorSessionPublic, ... }`（移除 ScadaEditorSession 导出）
- [x] Proof：既有 editor-session / editor 消费测试零回归（全包 1434 测全绿，含 toolbox-panel/runtime-factories/test-handle-factory 等内部 undoStack 消费者经 relative import 不受影响）；`pnpm typecheck` 绿

Exit Criteria:

- [x] `editor/index.ts` 导出的 session type 不再泄漏可变 `UndoStack` 实例字段（投影 type 落地，与 docstring INV-4 一致）
- [x] 包外无直接 `session.undoStack` 访问被破坏（grep 确认无外部消费者；内部消费者经 relative import impl 接口不变）
- [x] 既有 editor session 测试零回归

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

- [x] F5：parse 非对象不再类型谎言 + 不共享嵌套引用（focused 测断言）
- [x] F6：仓库内单一 clone 实现，深隔离 + 不硬编码 version（focused 测断言）
- [x] P2-1：serialization 导出与注释承诺一致（导出 parse/validate/diff + ScadaValidationResult）
- [x] P2-2：ScadaEditorSession 公开 type 不泄漏 UndoStack（投影 type 落地，type-level 测守卫）
- [x] P2-3：industrialRendererDefinitions 已导出（与兄弟包对齐）
- [x] P2-8：editor-internal-error 注册 + locale + doc 三处齐
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（本 plan 6 个 finding 全部收口；undo-redo-adapter 第三处 clone 作为 F6 同型缺陷一并统一，非 deferred）
- [x] 受影响 owner docs 已同步（runtime design-renderer §4.3 反序列化 + 序列化导出归属 / editor design-renderer §8.5.2 码表）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（32/32 全绿）
- [x] `pnpm build`（32/32 全绿）
- [x] `pnpm lint`（32/32 全绿）
- [x] `pnpm test`（workspace 59/59 任务全绿；industrial 1434 测）

## Deferred But Adjudicated

> 本 plan 暂无 deferred 项。若 P2-2 投影 type 改造因 UndoStack 被 session 消费者直接访问而无法纯投影，则降级为「保留 UndoStack 暴露 + TSDoc 显式声明其为内部实现」，并在此记录 Why Not Blocking Closure；但默认假设投影 type 可行（session 消费者经方法访问 undo/redo，非直接触 undoStack 字段）。

## Non-Blocking Follow-ups

- 本轮-12 / P2-5（嵌套 group 坐标语义 + false-green 测试）留待后续 i18n/doc/adjudication 轮。
- P2-6 / P2-7（palette / toolbox i18n）/ P2-9 / P2-10 / P2-11（design doc file-tree rot）留待后续 i18n/doc polish 轮。

## Closure

Status Note: 全部 5 Phase 执行完成（executor pass）。6 个 in-scope P2 finding（F5/F6/P2-1/P2-2/P2-3/P2-8）全部收口；F6 额外统一了第三处同型 clone（undo-redo-adapter.structuredCloneSafe）。typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent（fresh session，不复用 executor 上下文；本次 audit pass 于 2026-08-09 完成）
- Audit Scope: 逐条核对 5 个 Phase Exit Criteria + Closure Gates + deferred 诚实性 + anti-hollow + owner-doc 同步，全部对照 `packages/flux-renderers-industrial/` live code
- Evidence:
  - 全工作区 `pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32、`pnpm test` 59/59 任务全绿（industrial 包 1434 测）。
  - F5（Phase 1）：`serialization/parse.ts:14-17` 纯对象窄化守卫 + `structuredClone` 深隔离，非对象抛 `scada config must be an object`；旧 `shallowCopy` 已移除，无类型谎言。`serialization-parse-serialize.test.ts` 在场。
  - F6（Phase 2）：仓库内唯一 clone-config 实现为 `editor-working-helpers.ts:76 cloneConfigSnapshot`（symbols `cloneNodeDeep` + variables `.map((v)=>({...v}))` 深隔离 + viewport/background `structuredClone` + version 经 `...config` 保留）。`editor-session.ts:81/82/94/95` + `undo-redo-adapter.ts:44` 均调它；`editor-session.cloneConfig/cloneNode` + `undo-redo-adapter.structuredCloneSafe/cloneNodeDeep/cloneConfig` 三 helper 已删（grep 无残留函数定义，仅注释/测试历史引用）。
  - P2-1/P2-3（Phase 3）：`src/index.ts:58-69` 导出 serialize/parse/validate/diff + `export type ScadaValidationResult` + `industrialRendererDefinitions`；`src/index-exports.test.ts` 在场。
  - P2-8（Phase 4）：`editor-errors.ts:25/46` `SCADA_EDITOR_ERROR_CODES` + `_M1` 均含 `editor-internal-error`；`scadaEditorErrorI18nKey` 命中正 key（非 `.unknown`）。**Anti-hollow 核对**：该码在 prod 真实派发——`runtime-factories.ts:175` + `runtime-mutators.ts:162` 经 `onError?.('editor-internal-error', ...)`，注册非空壳。`en-US.ts:982`/`zh-CN.ts:980` 翻译键在场；`design-renderer.md §8.5.2`（行 318/322）码表登记。
  - P2-2（Phase 5）：`editor-session.ts:56` `ScadaEditorSessionPublic = Omit<ScadaEditorSession,'undoStack'>`；`editor/index.ts:19` 导出投影 type（不再导出 impl 接口）。**包外泄漏核对**：grep `\.undoStack` 无 industrial editor 公共面外部消费者（scheduling/report-designer/spreadsheet 命中为同名不相关字段）。`editor-public-types.test.ts` `@ts-expect-error` type-level 守卫在场。
  - Owner docs 同步：runtime `docs/components/industrial-hmi/design-renderer.md` §4.3（行 170 反序列化 fail-closed + 深隔离）；editor `docs/components/industrial-hmi-editor/design-renderer.md` §8.5.2（行 318/322 码表）。
  - Deferred 诚实性：`Deferred But Adjudicated` 无 deferred 项；`Non-Blocking Follow-ups` 仅本轮-12/P2-5/P2-6/P2-7/P2-9/P2-10/P2-11（均与本 plan Non-Goals 一致，非 in-scope live defect 降级）。
  - 文本一致性：`Plan Status: completed` / 5 Phase 全 `Status: completed` / 所有 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` 彼此一致。

Follow-up:

- 本轮-12（align/distribute world 坐标语义 + false-green 测试）、P2-5（collectWorldBounds 父偏移 false-green）、P2-6/P2-7（palette/toolbox i18n）、P2-9/P2-10/P2-11（design doc file-tree rot）留待后续 i18n/doc/adjudication 轮（与本 plan Non-Goals + Non-Blocking Follow-ups 一致）。
