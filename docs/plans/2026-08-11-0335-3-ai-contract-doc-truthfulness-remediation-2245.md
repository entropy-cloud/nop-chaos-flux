# 3 契约/文档族 P2 治理（contentResolverName 死字段 / 未导出类型 / manifest 不一致 / 双命名接口 / 文档锚点漂移）（ai-invariant-loop）

> Plan Status: active
> Mission: ai-invariant-loop
> Work Item: Follow-up Backlog P2（2026-08-10-2245 双审计 契约/文档族）：FIND-07 / FIND-08 / FIND-09 / FIND-14 / FIND-19 / FIND-10 / FIND-11 / FIND-15 / FIND-16 / FIND-17 / FIND-18
> Last Reviewed: 2026-08-11
> Source: `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（2026-08-10-2245 双审计 P2 填充节）、`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-07/08/09/10/11/14/15/16/17/18/19）、`docs/components/flux-renderers-ai/engine.md`、`design.md`、`implementation.md`、`docs/audits/ai-invariants/*`；live repo 核对 2026-08-11（HEAD `6085f697d`，行号以审计时点为准，执行时 live 复核）
> Related: `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`（engine/adapter 族 P2，独立 closure surface）、`docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md`（renderer/UI 族 P2，独立 closure surface）

## Purpose

治理 2026-08-10-2245 双审计遗留的 **契约/文档族 11 条 P2**（0 P0/P1）：① `contentResolverName` 死契约字段——schema/RendererDefinition/renderers.md 三方声明、全包零消费、承诺的「按名注册」机制不存在（FIND-07，autofocus 死字段 drop 同族）；② `ConversationStorageErrorEvent` 被公开 `UseConversationOptions.onStorageError` 签名引用但未从包入口导出（FIND-08，宿主无法命名该类型）；③ `@tiptap/core` 生产值导入但仅 devDependencies（FIND-09，与同族 optional peer 处理不一致）；④ `jsonrepair` dependencies/devDependencies 重复声明（FIND-14，P2-trivial）；⑤ `AiConversationController` / `AiConversationControllerBridge` 同包双命名公共接口无解释（FIND-19）；⑥-⑪ 六处文档锚点/契约漂移（FIND-10 engine.md §7.1 `ChatMessageUIState` 代码块 / FIND-11 §9.4 `runtime.registerImport` 虚构 API / FIND-15 `engine-invariants-p2.test.ts` 未进运行命令清单与 gates.md ⑧ 行 / FIND-16 invariant-catalog §4.1 `controller` 锚点漂移 ~240 行 / FIND-17 design.md §14.3 line 锚失效 / FIND-18 cycle2-findings/adjudication 行号失效）。

dead field drop（FIND-07）与双命名接口（FIND-19）为契约裁定 + 一致性治理，遵循 1606-3 autofocus 死字段 drop 先例与 P2-16 行号校准先例。

## Current Baseline

（live repo 核对 2026-08-11；行号 = 审计时点 2026-08-10，0008-1/2/3 修复后部分漂移，执行时 live 复核）

- **FIND-07（contentResolverName 死字段）**：`schemas.ts:123` `contentResolverName?: string` + `ai-renderer-definitions.ts:105` `{ key: 'contentResolverName', kind: 'prop' }`（live `:106`）+ `renderers.md:125`「注册的内容解析器名字（默认 'default'）」；`rg contentResolver` 全包零消费者、无 registry——真实机制是注入的 `contentRenderers` matcher 数组。live 核对：`ai-renderer-definitions.ts:106` 仍声明 prop，`ai-bubble/index.tsx:286-341` 零读取。
- **FIND-08（未导出类型）**：`use-conversation.ts:36,39-51` `ConversationStorageErrorEvent` 供 `UseConversationOptions.onStorageError`（`:36`）公开签名引用；`index.ts:129-134` 导出 options 但不导出该事件类型；`ConversationStorageStrategy`（`index.ts:111`）已导出——不对称。live 核对：`index.ts` 无 `ConversationStorageErrorEvent` 导出（grep 零命中），exports map 无深路径。
- **FIND-09（@tiptap/core manifest）**：`tiptap-sender.tsx:19` `import { Extension } from '@tiptap/core'`（值导入，运行时基类）；`dist/rich-text/tiptap-sender.js:19` 证实裸导入存活；`package.json:33-49,53` 仅 devDependencies 声明，同族 `@tiptap/react`/`@tiptap/starter-kit` 为 optional peer——host 选 rich-text 子路径无声明安装通道。live 核对：`package.json` devDeps 含 `@tiptap/core: ^3.27.1`（`:49` 区域），peerDeps 无。
- **FIND-14（jsonrepair 重复声明）**：`package.json:31`（dependencies，生产 import 于 `ai-tool-call.tsx:11`）与 `:57`（devDependencies 冗余）双声明。live 核对：两处均在（deps `:34` 区域 + devDeps `:57` 区域）。
- **FIND-19（双命名接口）**：`ai-conversation-controller.ts:19-24` `AiConversationController`（4 方法，`MaybePromise` 返回）与 `use-conversation.ts:692-697` `AiConversationControllerBridge`（3/4 成员逐一同构，`renameConversation` 仅返回类型宽度差）双导出 `index.ts:124-126,133`；hook 产出 Bridge、props/action-provider 消费 Controller，结构性可赋值；无文档解释差异。live 核对：`index.ts:125` 导出 Controller、`:133` 导出 Bridge type。
- **FIND-10（engine.md §7.1 漂移）**：`engine.md:51-55` 仍示 `thinking?: { open: boolean }`；live `types.ts:67-84` 为 `{ open?: boolean; startedAt?: number; endedAt?: number }` + `editing`（`:82`）；`engine.md:203` §8.3 已同步新契约——数据模型块漏同步。live 核对：`engine.md:51-55` 旧形状仍在。
- **FIND-11（§9.4 虚构 API）**：`engine.md:437-448` 示例用 `runtime.registerImport('ai', {...})`；`rg registerImport` 全仓零命中——真实机制 = schema `xui:imports` + `env.importLoader`（`apps/playground/src/ai/mock-ai-env.ts:90-115`）；§9.4 自述 `:437`「在 xui:imports 注册」与其代码块矛盾；同虚构 API 扩散 `design.md:504`、`implementation.md:162`。live 核对：`engine.md:437-448` 虚构 API 仍在。
- **FIND-15（运行命令清单漏文件）**：1606-1 抽取产出 `engine-invariants-p2.test.ts`（⑧ break/throw/regenerate 成员 `:45-160`）但 `engine.md:520-526` 6 文件命令清单与 `gates.md:19` ⑧ 行「同上」均漏——按文档 focused 命令静默跳过 4 个 branch 戳泄漏臂中的 3 个（`pnpm test` 全量仍覆盖）。live 核对：`engine.md:522` 清单 6 文件无 p2 文件；`gates.md:19` ⑧ 行运行列「同上」指向 ⑥⑦ 文件。
- **FIND-16（catalog §4.1 锚点漂移）**：`invariant-catalog.md:125`「controller（:425-430 为 4 方法组合桥）」在 P2-16 校准后仍漂移——live 定义 `use-conversation.ts:667-672`，`:425-430` 现为 createConversation pending-save drain 链。live 核对：`invariant-catalog.md:125-128` 仍注 `:425-430`；`use-conversation.ts:667-672` 为 controller 对象字面量。
- **FIND-17（design.md line 锚失效）**：`engine.md:123-127` / `types.ts:332-336` 注释引「design.md §14.3 line 556」；design.md 已增长，§14.3 现于 `:655-666`（`:655` 标题），`:556` 为无关 §11.5 token-usage 行。live 核对：`design.md:655`「### 14.3 ComponentHandle」。
- **FIND-18（历史记录行号失效）**：1606-1 模块抽取后 `cycle2-findings.md:74,170,173` / `cycle2-adjudication.md:43,76,79` 的 `文件:行` 引用失效（K-⑩-3 autoSave 已迁 `use-conversation-autosave.ts:42/:85`；W-E/W-⑨-c create-engine 锚点漂移 ~90 行）。live 核对：`cycle2-findings.md:74` 仍示 `use-conversation.ts:190/:203-209`（已迁）。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中；AI 包基线 **79 files / 678 tests 全绿**（0008-3 收口后）。
- Bug note 编号：live 最高 **153**（FIND-19 裁定与 FIND-07 drop 视情补 note，按 guide）。
- 授权：全为 P2 backlog 既定治理，按 roadmap Rule 走 plan 生命周期。FIND-19 为公开导出面裁定——**不删除/合并公共接口**（结构性变更需人工确认），本 plan 只做文档化 + 类型注记（如可行，Bridge 类型注记指向 Controller）；FIND-08 为**新增导出**（additive，非破坏性）。

## Goals

- 11 条 P2 全部收口：FIND-07 死字段 drop（schema + RendererDefinition + renderers.md 三方清理，grep 清零）；FIND-08 补导出 `ConversationStorageErrorEvent`（type export + engine.md 注记）；FIND-09 manifest 修正（`@tiptap/core` 升 optional peer，对齐同族）；FIND-14 去重（devDependencies 移除冗余 jsonrepair）；FIND-19 双命名接口文档化裁定（engine.md/renderers.md 说明两接口关系 + 消费面，不做结构性合并）。
- 六处文档锚点/契约修复：FIND-10（§7.1 代码块同步 live types.ts）、FIND-11（§9.4 重写为真实 `xui:imports` + `importLoader` 机制，design.md/implementation.md 同步）、FIND-15（engine.md 运行命令清单 + gates.md ⑧ 行补 `engine-invariants-p2.test.ts`）、FIND-16（catalog §4.1 controller 锚点校准至 live）、FIND-17（engine.md/types.ts 的 design.md §14.3 行锚更新）、FIND-18（cycle2 历史记录补锚点失效注记/校准，对齐 multi-audit 交叉模式 4「anchor-epoch + live-verify」建议）。
- 验证：doc 修复后 `rg` 目标模式零残留（死字段 / 虚构 API / 失效行锚）；`pnpm check` 零新增命中；AI 包测试全绿（本 plan 改动面：package.json + index.ts + 测试文件引用，如有）。
- 收口：engine.md / renderers.md / design.md / implementation.md / invariant-catalog.md / gates.md / cycle2 记录 / bug notes / daily log 同步。

## Non-Goals

- 不处理 engine/adapter 族 P2（FIND-12 + R1-F2/R1-F3/R1-F4 + FIND-22/R2-F3）——已在 `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`。
- 不处理 renderer/UI 族 P2（FIND-13/FIND-20 + R2-F1/R2-F2/R3-F1 + R1-F5）——已在 `docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md`。
- **不做 FIND-19 结构性合并/删除公共接口**（需人工确认）；不做 R1-F5 完整实例隔离方案。
- 不做全量 docs 行锚全文比对（open-audit 盲区自评 §3 的更大工程）；只修本轮 audit 点名的锚点 + 与本 plan 改动相邻的漂移（如发现同族未点名锚点，记录进 Non-Blocking Follow-ups 而非扩散 scope）。
- 不裁决 P3/观察项；不执行全量仓库验证（归 Closure Gates）。

## Scope

### In Scope

- `src/schemas.ts`（FIND-07 drop）、`src/ai-renderer-definitions.ts`（FIND-07 drop）、`src/index.ts`（FIND-08 补导出）、`package.json`（FIND-09 optional peer + FIND-14 去重）。
- `docs/components/flux-renderers-ai/engine.md`（FIND-10/11/15/17 + FIND-08/FIND-19 注记）、`renderers.md`（FIND-07 清理 + FIND-19 注记）、`design.md`（FIND-11 同步）、`implementation.md`（FIND-11 同步）。
- `docs/audits/ai-invariants/invariant-catalog.md`（FIND-16 锚点校准）、`gates.md`（FIND-15 ⑧ 行）、`cycle2-findings.md` / `cycle2-adjudication.md`（FIND-18 锚点失效注记）。
- 测试：涉及行为面（FIND-08 导出后 host 命名可用性 typecheck 断言；FIND-07 drop 后 schema 编译面零回归）在既有测试文件补/核对；纯文档项以 grep/`rg` 验证。
- Bug notes（如需要）、daily log。

### Out Of Scope

- engine/adapter 族 P2、renderer/UI 族 P2、FIND-19 结构性合并、全量 docs 锚点全文比对、P3/观察项、全量仓库验证。

## Failure Paths

| 场景                     | 触发                                   | 行为                                                                                          | 可重试 | 用户可见表现              |
| ------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| dead-field-drop          | host schema 仍写 `contentResolverName` | drop 后该字段进 prop 但无消费（行为不变——原就零消费）；schemas/registry 面同步清理；grep 清零 | 是     | 无（契约面 truthfulness） |
| missing-type-export      | host 想命名 `onStorageError` 事件类型  | 补导出后 `import type { ConversationStorageErrorEvent }` 可用                                 | 否     | 类型契约面可用性          |
| tiptap-core-peer         | host 消费 rich-text 子路径             | `@tiptap/core` 升 optional peer 后安装通道声明                                                | 否     | 依赖声明面一致            |
| dual-interface-confusion | host 阅读/消费两接口                   | 文档化差异 + 消费面注记；不合并                                                               | 是     | 文档 truthfulness         |
| doc-anchor-rot           | 维护者按旧行锚/虚构 API 阅读           | 全部校准到 live；rg 目标模式零残留                                                            | 是     | 文档 truthfulness         |

## Test Strategy

本档选择：必须自动化（涉行为/契约面）/ 文档面以 grep 验证（按 guide 不凑测试条目）

- FIND-07 drop 后：AI 包 schema 编译面测试全绿（schemas 死字段移除不破坏既有 schema 测试）+ `rg contentResolver` 零残留。
- FIND-08 补导出后：typecheck 断言（负向→正向：导出后 `import type { ConversationStorageErrorEvent }` 可用）。
- FIND-09/FIND-14：manifest 变更后 `pnpm install --lockfile-only` 或现有 lockfile 更新 + `pnpm check`（workspace-manifest-deps）零新增。
- 纯文档锚点项：`rg` 目标模式（`registerImport`、`line 556`、`:425-430` 等）零残留 + engine.md 运行命令清单实跑（`engine-invariants-p2.test.ts` 进入清单后 focused 命令可跑）。

## Execution Plan

### Phase 1 — 死字段 drop（FIND-07）+ 未导出类型补导出（FIND-08）

Status: planned
Targets: `packages/flux-renderers-ai/src/schemas.ts`、`src/ai-renderer-definitions.ts`、`src/index.ts`、`src/adapters/use-conversation.ts`、`docs/components/flux-renderers-ai/renderers.md`

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: 基线 grep——`rg contentResolver` 全包零消费者确认（记录证据，证明 drop 无行为影响；grep 范围 = live 源码 + 本 plan 列出的文档面）
- [ ] Fix: FIND-07 drop——`schemas.ts:123` 删除 `contentResolverName` 字段 + `ai-renderer-definitions.ts:106` 删除 `{ key: 'contentResolverName', kind: 'prop' }` + `renderers.md:125` 删除声明 + **`flux-guide/flux-types/schema.d.ts:1645`（`contentResolverName?: SchemaValue`）与 `flux-guide/design-patterns/ai.md:163`（ai-bubble 字段表）同步清理**（1606-3 autofocus drop 先例曾因漏 6 处已入库声明/文档面被 Round-1 Major-1 打回，本面全仓 grep 确认后再收口）
- [ ] Proof: RED 型验证（FIND-08）——修复前 `import type { ConversationStorageErrorEvent } from '@nop-chaos/flux-renderers-ai'` typecheck 失败（负向断言记录）
- [ ] Fix: FIND-08 补导出——`index.ts` 补 `export type { ConversationStorageErrorEvent }`（对齐 `ConversationStorageStrategy` 先例 `:111`）；`use-conversation.ts` 无需改（定义已导出面，index 转发即可）
- [ ] Proof: 正向 typecheck 断言——补导出后 `import type { ConversationStorageErrorEvent }` 通过（AI 包 typecheck + 或负向→正向切换测试文件断言）
- [ ] Fix: 类别清扫——全包「公共签名引用但未导出类型」面核对：`ConversationStorageErrorEvent`（本面）/ `ConversationStorageStrategy`（已导出）/ 其余 options 引用类型；清扫记录入档
- [ ] Fix: renderers.md / engine.md 同步——FIND-07 清理残留声明；FIND-08 注记（§8.6 `UseConversationOptions.onStorageError` 事件类型现已导出）

Exit Criteria:

- [ ] FIND-07：`rg contentResolver` 目标面零残留——**scope = live 源码 + 本 plan 列出的文档面（schemas.ts / ai-renderer-definitions.ts / renderers.md / flux-guide schema.d.ts / flux-guide ai.md）**；豁免面显式登记（历史审计记录 `docs/audits/2026-08-10-2245-multi-audit…`、roadmap Follow-up Backlog、per-component card、已完成 plan 等**永久保留记录的既有字符串引用**按 1606-3 `:121` 豁免清单模式逐面列出，不重写历史记录——Minimum Rule 21）
- [ ] FIND-08：`ConversationStorageErrorEvent` 经包入口可 `import type`（typecheck 正向断言在案）
- [ ] 类别清扫记录入档（未导出类型面核对结论）

### Phase 2 — manifest 修正（FIND-09 @tiptap/core + FIND-14 jsonrepair 去重）

Status: planned
Targets: `packages/flux-renderers-ai/package.json`

- Item Types: `Fix | Proof`

- [ ] Fix: FIND-09——`@tiptap/core` 加入 peerDependencies + peerDependenciesMeta（optional: true），devDependencies 保留（测试仍需）；对齐 `@tiptap/react`/`@tiptap/starter-kit` 处理
- [ ] Fix: FIND-14——devDependencies 移除冗余 `jsonrepair`（dependencies 保留，生产 import 于 `ai-tool-call.tsx:11`）
- [ ] Proof: `pnpm install --lockfile-only`（或按仓库惯例更新 lockfile）后 `pnpm check`（workspace-manifest-deps）零新增命中
- [ ] Proof: `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 通过（tiptap-sender 值导入在 optional peer 下仍可解析——peer 已安装于 dev 环境）
- [ ] Fix: 类别清扫——`package.json` 全量声明核对：dependencies/devDependencies/peerDependencies 三区逐项「声明-引用」一致性（生产代码 import ∩ 三区覆盖），记录结论；同族 tiptap 三件套 + jsonrepair + 其余依赖

Exit Criteria:

- [ ] FIND-09/FIND-14 修复落地（manifest diff 在案）+ `pnpm check` 零新增
- [ ] AI 包 typecheck 通过（tiptap 导入链未破坏）
- [ ] 类别清扫记录入档（依赖声明-引用一致性核对结论）

### Phase 3 — 双命名接口文档化裁定（FIND-19）

Status: planned
Targets: `docs/components/flux-renderers-ai/engine.md`、`renderers.md`、`src/adapters/use-conversation.ts`（类型注记）、`src/index.ts`（如需）

- Item Types: `Decision | Fix | Proof`

- [ ] Decision: 裁定记录——不做结构性合并/删除（公共接口变更需人工确认）；两接口关系文档化：`AiConversationController`（action namespace 消费面，`MaybePromise` 语义）与 `AiConversationControllerBridge`（hook 产出面，3/4 成员同构、`renameConversation` 返回类型宽度差）结构性可赋值、双命名保留理由（hook 产物类型稳定性）入档；**未来风险条款一并记录**（「任一未来成员新增即分叉契约」——审计 FIND-19 原注，作为 watch-only residual 登记）
- [ ] Fix: `use-conversation.ts:692-697` Bridge 定义补 doc-comment——指向 Controller 说明关系（对齐 `ai-conversation-controller.ts:19-24` 现有注释风格）
- [ ] Fix: engine.md / renderers.md 补注记——「§8.6/§14.2 两接口关系：hook 产出 Bridge，props/action-provider 消费 Controller，结构性可赋值；命名差异为历史保留」；与 sibling 2（R1-F5 多实例注记）同文档面协调 merge-aware
- [ ] Proof: 类型兼容性验证——`AiConversationControllerBridge` 可赋值给 `AiConversationController` 的既有消费面（action-provider / props）typecheck 通过（现状已成立，验证记录在案）
- [ ] Proof: `rg AiConversationController` 全部消费面核对（index exports / action-provider / ai-chat props / 文档）——确认零其他未记录消费面

Exit Criteria:

- [ ] FIND-19 裁定与文档化落地（engine.md / renderers.md / Bridge 注记一致）
- [ ] 类型兼容验证通过（消费面 typecheck 零回归）
- [ ] 消费面核对记录入档

### Phase 4 — engine.md / design.md / implementation.md 文档契约修复（FIND-10 / FIND-11 / FIND-15 / FIND-17）

Status: planned
Targets: `docs/components/flux-renderers-ai/engine.md`、`design.md`、`implementation.md`、`packages/flux-renderers-ai/src/engine/types.ts`（注释锚）

- Item Types: `Fix | Proof`

- [ ] Fix: FIND-10——`engine.md:51-55` §7.1 `ChatMessageUIState` 代码块同步 live `types.ts:67-84`（`thinking` 形状 + `editing` 字段）；与 §8.3（engine.md:203）一致
- [ ] Fix: FIND-11——`engine.md:437-448` §9.4 示例重写为真实机制（schema `xui:imports` + `env.importLoader`，对齐 `apps/playground/src/ai/mock-ai-env.ts:90-115` 真实用法）；`design.md:504` / `implementation.md:162` 同步；移除 `runtime.registerImport` 虚构 API
- [ ] Fix: FIND-15——`engine.md:520-526` 运行命令清单补 `engine-invariants-p2.test.ts`（7 文件清单）；`gates.md:19` ⑧ 行「同上」改显式清单或补注（含 p2 文件）
- [ ] Fix: FIND-17——`engine.md:123-127` / `types.ts:332-336` 的 design.md §14.3 行锚更新为 live（`:655-666`，或改节引用去行号——按文档稳定性选优，记录选择理由）
- [ ] Proof: `rg registerImport` 目标面零残留（scope = live 源码 + 本 plan 列出的文档面 engine.md/design.md/implementation.md；**历史记录豁免**——源审计、roadmap backlog、已完成 plan 的既有引用不重写）；`rg "line 556"` 目标文件（engine.md / types.ts 注释面）零残留
- [ ] Proof: engine.md 修正后 focused 命令实跑——`pnpm --filter @nop-chaos/flux-renderers-ai exec vitest run src/engine/__tests__/engine-invariants-p2.test.ts`（清单内文件可独立运行）

Exit Criteria:

- [ ] FIND-10/11/15/17 修复落地（rg 零残留 + 清单实跑通过）
- [ ] §7.1 代码块与 live types.ts 一致（目测 + §8.3 自洽）
- [ ] 运行命令清单 7 文件可实跑（engine-invariants-p2 覆盖 ⑧ break/throw/regenerate 臂）

### Phase 5 — ai-invariants 记录锚点校准（FIND-16 / FIND-18）+ 收口

Status: planned
Targets: `docs/audits/ai-invariants/invariant-catalog.md`、`cycle2-findings.md`、`cycle2-adjudication.md`、`docs/bugs/`、`docs/logs/2026/08-11.md`

- Item Types: `Fix | Proof | Follow-up`

- [ ] Fix: FIND-16——`invariant-catalog.md:125` §4.1 controller 锚点校准至 live `use-conversation.ts:667-672`（P2-16 校准表漏掉的「adapter 非函数字段」注记行；语义/检测方法不变）
- [ ] Fix: FIND-18——`cycle2-findings.md:74,170,173` / `cycle2-adjudication.md:43,76,79` 行号校准（K-⑩-3 autoSave 引用改 `use-conversation-autosave.ts:42/:85`；W-E/W-⑨-c create-engine 锚点按 live 更新）；补「anchor-epoch + live-verify」注记（对齐 multi-audit 交叉模式 4 建议，`active` 头部注记：行号 = 2026-08-09/10 时点，live 以复核为准）
- [ ] Proof: `rg "use-conversation.ts:190|:203-209|:425-430"` 目标文件（cycle2-findings.md / cycle2-adjudication.md / invariant-catalog.md）零残留（校准后）；catalog §4.1 控制器锚点与 live 定义一致
- [ ] Fix: bug notes（如 FIND-19 裁定 / FIND-07 drop 需留痕则补；纯文档项按 guide 可并入 daily log）
- [ ] Proof: `pnpm check`（含 `check:ai-engine-invariants` 与 workspace-manifest-deps）零新增命中 + AI 包 typecheck/test（index.ts/package.json 改动面）全绿
- [ ] Follow-up: daily log `docs/logs/2026/08-11.md` 记录本 plan 收口

Exit Criteria:

- [ ] FIND-16/18 校准落地（rg 零残留 + anchor-epoch 注记入档）
- [ ] `pnpm check` 零新增命中（manifest / 文档门禁面）
- [ ] AI 包 typecheck/test 全绿零回归；daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_012cd52ceffe7vNCm3Z5J9MsrU` Round 1 → `ses_012c7b3d1ffeyyAdbBMITvAZ2i` Round 2）
- Verdict: `pass-with-minors`（Round 1 `revised`（2 Major）→ 修正 → Round 2 达成共识：零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed:
  - Major-1（FIND-07 drop 漏 `flux-guide/flux-types/schema.d.ts:1645` + `flux-guide/design-patterns/ai.md:163`，1606-3 先例曾因此被打回）→ Phase 1 Fix/Exit 已补两文件
  - Major-2（零残留 grep 口径不可满足——历史审计/roadmap/已完成 plan 永久保留字符串，Minimum Rule 21）→ Phase 1/4/5 + Closure Gates 全部改为「目标面 scope + 豁免清单」口径（1606-3 `:121` 模式）
  - Minor-1（FIND-16 controller live 位置 :664-669 → :667-672）→ Baseline 与 Phase 5 均已校准
  - Minor-2（执行中发现同族漂移不得进 Non-Blocking Follow-ups）→ 已改路由 Deferred But Adjudicated
  - Minor-3（FIND-19 未来分叉风险条款未记录）→ Phase 3 Decision 已补 watch-only 登记
  - Minor-A（Closure Gates grep 措辞未带 scope）→ 已补「scope = live 源码 + 本 plan 列出的文档面；历史记录豁免按 Phase 1/4/5 口径」
  - Minor-B（Baseline FIND-16 行号不一致）→ 已校准 :667-672
  - Minor-C（FIND-19 Bridge 引用 :689-694 → :692-697）→ 已校准
  - Minor-D（Non-Blocking Follow-ups 重复 FIND-19 条目）→ 已改显式指针

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 11 条 P2（FIND-07/08/09/14/19/10/11/15/16/17/18）全部收口落地（drop/补导出/文档化/校准证据在案）
- [ ] `rg` 目标模式零残留（`contentResolver` / `registerImport` / 失效行锚）——**scope = live 源码 + 本 plan 列出的文档面；历史记录豁免按 Phase 1/4/5 口径**
- [ ] `pnpm check` 零新增命中（含 `check:ai-engine-invariants`）；AI 包 typecheck/test 全绿零回归
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（FIND-19 结构性合并为显式裁定非降级）
- [ ] 受影响的 owner docs 已同步（engine.md / renderers.md / design.md / implementation.md / invariant-catalog.md / gates.md / cycle2 记录 / bug notes / daily log）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### engine/adapter 族 + renderer/UI 族 P2 全量（12 条）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分属不同结果面（engine/adapter 行为 / renderer 交互），已分别路由 `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md` 与 `docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md`，不阻塞本 plan 的 11 条契约/文档 P2 收口
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-11-0335-1-engine-adapter-p2-remediation-2245.md`、`docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md`（同一起草轮三 plan 并行路由）

### FIND-19 双命名接口结构性合并（删除/合并公共接口）

- Classification: `optimization candidate`（结构性方案）
- Why Not Blocking Closure: 涉及公共导出面变更（`index.ts`），属结构性重构需人工确认；文档化 + 类型注记已消除「无解释的双命名」信息缺失，结构性可赋值成立（消费面 typecheck 实证）
- Successor Required: `yes`
- Successor Path: 非阻塞 follow-up（需人工确认后另立 plan）

### FIND-21（ai-bubble-hitl.test.tsx 模块级 `let captured`）

- Classification: `watch-only residual`（已修复核销）
- Why Not Blocking Closure: 已在 plan `docs/plans/2026-08-11-0008-1-renderer-contract-wiring-onapproval-and-projection-remediation.md` Phase 1 顺带修复，本 plan 不重复处理
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-2245 双审计 P2 填充节，本 plan 收口时同步回写路由收口注记）。
- open-audit 盲区自评 §3：docs 全量行锚全文比对（本轮只修点名锚点，全量比对为更大工程，P3 级观察项）。
- **执行中发现的本 plan 未点名的同族锚点漂移**：不得放入本清单——按 Anti-Slacking Rule 移入 `Deferred But Adjudicated`（`out-of-scope improvement` + successor 注记），或经记录 scope change 后纳入本 plan。（FIND-19 结构性合并已在 Deferred But Adjudicated 登记，此处不再重复。）

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （待填）
- Evidence: （待填）

Follow-up:

- （待填）
