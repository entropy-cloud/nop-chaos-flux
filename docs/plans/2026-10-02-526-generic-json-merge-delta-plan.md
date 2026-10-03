# 526 Schema-Agnostic JSON Merge / Delta Utility

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: 用户讨论（2026-10-02）关于 `vercel-labs/json-render` 与 `~/app/nop-entropy` `nop-core/lang/json/delta` 的对比；`docs-for-ai/02-core-guides/xdef-and-xdsl.md`「无 xdef 的并行 JSON 合并链路」
> Related: `docs/architecture/flux-core.md`, `packages/page-designer-core/src/tree-patch.ts`

## Purpose

在 `flux-core` 中落一套**schema-agnostic** 的 JSON 合并 / 差量提取工具，作为通用数据能力提供，与 Flux schema 语义解耦。目标是让"基线 + 差量 = 结果"这一模式在仓库内成为一等能力，而不是每个消费方各写一套。

## Current Baseline

- `packages/flux-core/src/utils/` 已托管通用 JSON 工具：`object.ts`（`isPlainObject` / `shallowEqual` / `cloneDeep`）、`array.ts`、`path.ts`（`getIn` / `setIn` / `toJsonPointer`）。新增同族工具落在此处符合既有分层。
- **仓库内不存在 schema 合并语义。** 全仓 grep `mergeMap|mergeSchema|schemaMerge|jsonMerge|applyOverride` 在 `packages/*/src` 下唯一命中 `flux-renderers-content/src/mapping.tsx`（内容渲染器，无关）。
- `packages/page-designer-core/src/tree-patch.ts` 提供 `diffSchemaInput` / `applyTreePatches`（JSON Pointer patch 列表），但**唯一生产消费者**是 `packages/page-designer-core/src/session.ts:68-69`，接进 `createEditorCore` 作 undo/redo 的 forward/inverse diff 栈。无 renderer / runtime / 其它 designer 使用。
- 文件态 schema 的节点身份是可选的：`BaseSchema.id?: string`（`packages/flux-core/src/types/schema.ts:104`）。设计器会话私有键 `xui:sid`（`packages/page-designer-core/src/round-trip.ts:33`）在导出时剥离（INV-E），**不进持久化文件**。
- 参考实现（NOP，`~/app/nop-entropy/nop-kernel/nop-core/src/main/java/io/nop/core/lang/json/delta/`）已验证该模式可服务 5+ 种互不相关格式（`_nop-auth.i18n.yaml`、amis 页面 JSON、`scheduler.yaml`、`module-meta.json`、ORM xdsl），并显式声明 schema-free（`JsonMerger.java:28`「不依赖schema，直接对任意json进行merge操作」）。identity 与列表形态均在运行时从数据发现（`DeltaMergeHelper.buildUniqueKey:235-264`、`DeltaJsonNormalizer.getListKind:48`）。

## Goals

- 提供 `mergeJson(base, delta, options)`：identity-keyed 的对象/数组合并，支持可配置 identity 链、可配置控制标记、可观测诊断。
- 提供 `diffToDelta(resolved, base, options)`：求出满足 `mergeJson(base, diffToDelta(resolved, base))` 深度等于 `resolved` 的最小差量文档。
- 保证 round-trip 性质由自动化测试锁定。
- 工具层零 Flux schema 依赖：签名与实现不出现 `SchemaInput` / `BaseSchema` / renderer 相关类型。
- 记录工具与 `page-designer-core/src/tree-patch.ts` 的分工，避免后续误替换。

## Non-Goals

- **不改 `tree-patch.ts` 的算法或调用方。** positional patch 在 undo/redo 场景是正确的（会话内 base 不漂移），本工具服务的是跨版本 / 跨文件 / 跨人场景，两者并存。
- 不实现 `x:extends` 多级继承链解析（`DeltaJsonLoader` / `XDslExtender` 的职责）。本计划只做单层 `mergeJson(base, delta)`，多级链由调用方折叠。
- 不引入 provenance / `SourceLocation` 追踪（Java 侧 `JObject` / `ValueWithLocation` 的能力）。
- 不做数组锚点占位符压缩（Java 侧 `JsonDiffer.simplify` 的优化）。
- 不提供 YAML 线格式、文本解析、diff 渲染。
- 不接入任何消费方（page designer / AI 生成路径）。理由见 `Out Of Scope`。

## Scope

### In Scope

- `packages/flux-core/src/json-merge/`：`types.ts` / `identity.ts` / `list-order.ts` / `merge-json.ts` / `diff-delta.ts` / `index.ts`。
- 对应 `*.test.ts` focused 测试，含 round-trip 性质测试。
- `packages/flux-core/src/index.ts` 导出新增 API。
- `docs/architecture/flux-core.md` 新增 owner 章节。
- `docs/logs/2026/10-02.md` 记录。

### Out Of Scope

- **消费方接入**（把 `mergeJson` 接进 `page-designer-core` 差量持久化、AI 生成路径的差量回写等）。前置条件未成立：base 来源尚未裁定（AI 一次生成 / 平台下发模板 / 设计器模板库三种候选的落点与调用时机不同），过早接入会锁定错误契约。归 successor ownership。
- YAML 支持。
- NOP 侧对接（`applyViewOverride` 前端等价物）。属于 nop-entropy 仓库范围。

## Protected Area Declaration

本计划触及 `packages/flux-core/src/`（`docs/context/ai-autonomy-policy.md` Protected Areas 第 1 行）与 `packages/flux-core/src/index.ts` 公开导出面（第 26 行「changing a public export surface」）。

裁定依据：

1. Protected Area 第 1 行的括号限定为 `compiler: scope, expressions, schema`。本计划新增代码不涉及 scope 解析、表达式编译/求值、schema 校验任一 concern；它是纯数据结构运算，落位与既有 `utils/object.ts` 同族。
2. 导出面变更已在本 plan 中显式登记（`index.ts` 导出清单），可由 human 单点否决。

若 human 裁定不应进入 `flux-core`，则改为独立叶子包 `@nop-chaos/json-merge`（需按 `AGENTS.md`「Adding New Packages」补 `package.json` / `tsconfig.json` / `tsconfig.build.json` / `vitest.config.ts` / root `tsconfig.json` references / `vite.workspace-alias.ts` / `pnpm install`），Phase 划分与 Exit Criteria 不变。

## Failure Paths

| 场景 | 触发 | 行为 | 可重试 | 调用方可见表现 |
| --- | --- | --- | --- | --- |
| `list-not-keyed` | base 数组存在元素缺 identity | 整段取 delta，并产出 diagnostic | 是 | `diagnostics` 数组含 code `list-not-keyed` + JSON Pointer 路径 + `listKind` |
| `duplicate-identity` | base 数组内 identity 重复 | 取首个匹配，其余视为 delta 新增，并产出 diagnostic | 是 | `diagnostics` 含 code `duplicate-identity` |
| `identity-empty` | identity 键存在但值为空串/null | 该元素不参与 identity 匹配 | 是 | 该元素走追加；计入 `list-not-keyed` 判定 |
| 非 plain object 输入（Date / class instance） | 调用方误传 | 视为标量，delta 覆盖 base | 是 | 无 diagnostic（schema-free 边界内）。**评审修订（2026-10-03）**：实现以原型链严格判定（`isJsonObject`，identity.ts）保证本行成立——toString tag 无法区分 class instance，原 `isRecord` 结构判定会将其误入递归合并（评审 Major-1） |

本工具**不抛异常**：所有降级都通过 `diagnostics` 可观测。理由：它定位在 JSON 合并这一通用层，抛异常会把策略问题升级成调用方负担；对比 NOP 的静默 `return listB`（`JsonMerger.java:219`），诊断可见是本实现的核心改进。

## Test Strategy

档位选择：`必须自动化`。

理由：round-trip 性质 `mergeJson(base, diffToDelta(resolved, base)) ≡ resolved` 是本工具唯一的正确性契约，属核心回归路径；且这是新增公开 API 契约。`Proof` 项排在实现之前。

## Execution Plan

### Phase 1 - Identity / 列表顺序 / 合并引擎

Status: completed
Targets: `packages/flux-core/src/json-merge/{types,identity,list-order,merge-json}.ts` + 同名测试

- Item Types: `Proof` `Decision` `Fix`

- [x] **Proof（先红）**：`identity.test.ts` 覆盖 identity 链优先级、`uniqueAttr` 间接寻址、空值不参与匹配。
- [x] **Proof（先红）**：`list-order.test.ts` 覆盖 NOP 文档给出的三个基准用例：`a=[a1..a5] b=[b1,a2,b3] → [a1,b1,a2,b3,a3,a4,a5]`；`b` 全覆盖 `a`；`b` 与 `a` 零交集。
- [x] **Proof（先红）**：`merge-json.test.ts` 覆盖：标量覆盖、对象递归合并、嵌套 identity 数组合并、`list-not-keyed` 诊断产出、`remove` / `replace` 标记消费后不残留于输出、未知标记键原样透传。
- [x] `types.ts`：定义 `JsonMergeOptions` / `MergeDiagnostic` / `MergeResult` / `MergeMarkers` / `IdentityRef`，不含任何 flux schema 类型。
- [x] `identity.ts`：`resolveIdentityKey`（按 `options.identityKeys` 顺序回退，支持 `uniqueAttr` 间接寻址）、`readIdentity`、`classifyList`（返回 `all` / `some` / `none`）。
- [x] `list-order.ts`：`planListMerge(baseCount, deltaIndexes)` —— 锚点式顺序重建，保持 delta 顺序优先、未匹配 base 元素尽量保序、delta 新元素插入到其锚点之后。
- [x] `merge-json.ts`：`mergeJson(base, delta, options)` 返回 `{ value, diagnostics }`；纯函数，不修改入参，输出与入参不共享引用。
- [x] 语义裁定落文档：`delta` 中 `undefined` / 缺键 = 未触及；`null` = 显式置空；`remove` 标记 = 删除该子树；`replace` 标记 = 整段替换并剥除标记键。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core test -- json-merge` 全绿，且上述 Proof 用例在实现落地前已先失败过一轮。
- [x] `merge-json.ts` 不 import 任何 flux schema 类型（可用 import 语句核对）。

### Phase 2 - 最小差量提取

Status: completed
Targets: `packages/flux-core/src/json-merge/diff-delta.ts` + 测试

- Item Types: `Proof` `Decision` `Fix`

- [x] **Proof（先红）**：`diff-delta.test.ts` 覆盖：对象键增/删/改、base 独有键产出 `remove` 标记、identity 数组逐元素求差、删除元素产出 `remove` 标记、数组重排通过 delta 顺序表达、无 identity 数组整体替换。
- [x] **Proof（先红）**：`round-trip.test.ts` 属性测试：对多组 `(base, resolved)` 断言 `mergeJson(base, diffToDelta(resolved, base)).value` 与 `resolved` 深度相等。
- [x] `diffToDelta(resolved, base, options)` 实现；键缺失于 `resolved` 的 base 侧条目以 `{ [identityKey]: value, [replaceMarker]: 'remove' }` 表达；identity 数组按 `resolved` 顺序完整输出 + 追加 base 独有元素的 remove 标记。
- [x] 标记键复用 `options.markers`，与 `mergeJson` 对称。

Exit Criteria:

- [x] round-trip 性质测试全绿（含嵌套对象、嵌套 identity 数组、数组重排、删除、多层 identity 链）。
- [x] `diff-delta.ts` 不 import 任何 flux schema 类型。

### Phase 3 - 导出 / owner doc / 治理

Status: completed
Targets: `packages/flux-core/src/index.ts`, `docs/architecture/flux-core.md`, `docs/logs/2026/10-02.md`

- Item Types: `Fix` `Decision`

- [x] `packages/flux-core/src/index.ts` 导出 `mergeJson` / `diffToDelta` / `classifyList` / `readIdentity` / 全部 public option 与 diagnostic 类型。
- [x] `docs/architecture/flux-core.md` 新增章节「Schema-Agnostic JSON Merge / Delta Utility」：只写最终设计（工具签名、identity 策略、标记语义、诊断码、与 `tree-patch.ts` 的分工），不写演进叙事（Minimum Rule 14）。
- [x] `docs/logs/2026/10-02.md` 记录实现范围、验证命令与结果。

Exit Criteria:

- [x] `docs/architecture/flux-core.md` 章节内容与 live code 签名逐字一致。
- [x] `pnpm --filter @nop-chaos/flux-core typecheck` 通过。

## Draft Review Record

- Reviewer / Agent: 独立子代理（fresh session，agent_316191ed）
- Verdict: revised（Round 1 发现 1 项 Major：Failure Paths「非 plain object 视为标量」与 `isRecord` 结构判定相悖——裁定改实现侧（`isJsonObject` 原型链严格判定）+ 补 Date/类实例 merge 与 round-trip 用例；Minor 行号漂移一并修正。Round 2 修订完成后达成共识，draft → active）
- Rounds: 2
- Findings addressed: Major-1（isJsonObject 修正 + 3 个测试用例）；Minor（schema.ts:104 / round-trip.ts:33 / autonomy-policy:36 / planListMerge 参数名）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本计划无既有 live defect）
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成：`mergeJson` 与 `diffToDelta` 的 round-trip 性质由自动化测试锁定
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（`docs/architecture/flux-core.md`）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_964feaec，approved）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` 无新增红项

## Deferred But Adjudicated

### 数组锚点占位符压缩（NOP `JsonDiffer.simplify`）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 本实现对 identity 数组按 `resolved` 顺序完整输出 delta 元素，语义上已能无损 round-trip；`simplify` 只压缩 delta 体积，不改变可重建性。不影响当前 supported baseline 成立。
- Successor Required: `no`

### 消费方接入（page designer 差量持久化 / AI 差量回写）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: base 来源尚未裁定（三种候选落点与调用时机不同），提前接入会把未裁定契约固化进调用方。本计划交付的是工具本身，其正确性由 round-trip 契约独立成立，不依赖任何消费方存在。
- Successor Required: `yes`
- Successor Path: 待 base 来源裁定后新开 plan

## Non-Blocking Follow-ups

- 是否拆为独立发布包 `@nop-chaos/json-merge`（取决于 Protected Area 裁定）。
- `tree-patch.ts` 是否新增 `byId` 模式以复用于 AI 编辑传输（与本工具不同层，不阻塞）。

## Closure

Status Note: 2026-10-03 收口。三 Phase 实现经独立 draft review（1 Major：isJsonObject 原型链严格判定修正 + Date/类实例用例）与独立 closure audit（approved：634/634 实测、owner doc 逐字一致、Deferred 分类诚实）。工具保持零消费方接入（successor 待 base 来源裁定）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_964feaec）
- Evidence: approved——五源文件+5 测试在位、index.ts:31-52 全量导出、owner doc :466 逐字一致、NOP 三基准与 round-trip 21+3 组实测、isJsonObject 修正到位、634/634 绿；minor（评审前状态说明 blockquote 残留、日志补记）已随收口完成。

Follow-up:

- 消费方接入（page designer 差量持久化 / AI 差量回写）：待 base 来源裁定后新开 plan（Deferred 已登记）。
- 独立发布包 `@nop-chaos/json-merge` 评估（Protected Area 裁定后）。
- `tree-patch.ts` byId 模式评估（不同层，不阻塞）。