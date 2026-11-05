# 858 core 包导出级测试补齐与无断言套件修复（core test debt）

> Plan Status: completed（closure audit round 3 approved 2026-11-06；draft review 通过，见 Draft Review Record）
> Last Reviewed: 2026-11-06
> Source: `docs/analysis/2026-11-05-full-repo-deep-audit.md` §F-E（E1–E2）
> Related: `docs/architecture/flux-core.md`（protected area owner doc，满足 autonomy policy plan-first 证据）、AGENTS.md Bug Fix Test Coverage Rule

## Purpose

补齐深审定位的 9 组公开导出的零测试引用（flux-core / flux-formula——六个高 stakes 包中 src:test 比最差两个），并把 4 处"零断言/伪断言"套件改为真断言。改动为测试新增/修复 + 测试基建登记（scanner-baselines）+ docs，不改任何产品代码。

## Current Baseline

- 全量单测绿：16,837 passed / 0 failed（46 vitest project，2026-11-05 实测）。
- repo 全域 grep 确认以下导出在所有 `*.test.*`/`*.spec.*` 中零引用。其中 6 组在包公开导出面（`bindAst` index.ts:9；`isCompiledActionProgram`/`isCanonicalBuiltInActionName`/`normalizeHiddenFieldPolicy`/`toCompiledRendererContract`/`isSchemaArray`/`isSchemaInput`/`formatRegistry` 均经 index 链公开）；另 3 组为包内导出（非公开面），测试以包内相对导入覆盖：
  - `packages/flux-formula/src/bind-ast.ts:100` `bindAst`（依赖绑定 pass；index.ts:9 公开导出）【公开】
  - `packages/flux-formula/src/parser-node-factories.ts:4,8,22,30` `createSourceLocation`/`createLiteralNode`/`createIdentifierNode`/`createMemberExpressionNode`【包内，相对导入】
  - `packages/flux-core/src/value-adapter.ts:437` `isCompiledActionProgram`【公开】
  - `packages/flux-core/src/constants.ts:94` `isCanonicalBuiltInActionName`【公开】
  - `packages/flux-core/src/validation-model.ts:16` `normalizeHiddenFieldPolicy`【公开】
  - `packages/flux-core/src/json-merge/identity.ts:73` `identityCompositeKey`【包内，相对导入】
  - `packages/flux-core/src/json-merge/types.ts:82,92` `resolveContext`/`joinPath`【包内，相对导入】
  - `packages/flux-core/src/types/compiled-renderer-contract.ts:46` `toCompiledRendererContract`（RM-1 单源派生，经 types/index.ts 公开链；现仅类型级测试 `renderer-contract-types.test.ts`——typecheck 层 fail，运行时派生漂移无网）【公开】
  - `packages/flux-core/src/utils/schema.ts:9,13` `isSchemaArray`/`isSchemaInput`【公开】；`packages/flux-core/src/format-registry.ts:72` `formatRegistry`【公开】；`value-adapter.ts` `booleanMappingAdapter`【公开】
- 无断言/伪断言测试 4 处：
  - `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.test.ts:215,324,411,431` 四套件调 engine 方法后 destroy，零 expect
  - `packages/flux-renderers-3d/src/engine/scene-manager-branches3.test.ts:51` rAF 路径 init/dispose 零断言
  - `packages/flux-renderers-industrial/src/engine/scada-engine-events-declarations.test.ts:92` "should not emit" 仅靠不崩溃，无 handler-absence spy
- flux-core src:test 比 1.50（84 src / 56 test），flux-formula 1.33（20/15）——为六个高 stakes 包最差。
- 受保护区核对：新增测试 colocate 于各包既有测试约定位置（`*.test.ts(x)` 与源文件同目录，或既有 `__tests__/` 目录——按各包现状就近，Phase 1 按 flux-formula 现状执行），不改任何 src 产品文件；autonomy policy 的 flux-core `plan-first` 证据 = 本 plan + owner doc `docs/architecture/flux-core.md` 在案。

## Goals

- 9 组导出全部获得 focused 单测：正例 + 边界 + 负例（能区分真实语义的断言，不是 smoke）。
- 4 处无断言套件补真断言（engine 状态/effects spy），使其能 fail。
- 不改任何产品源文件；改动限于测试文件 + 测试基建登记（`scripts/baselines/scanner-baselines.json`）+ docs。
- 全量单测收口时保持 0 failed，且新增测试数计入当日 log。

## Non-Goals

- 不追求覆盖率数字目标（不为凑 ratio 写低质测试）。
- 不给 type-only 测试（`expectTypeOf` 族）补运行时断言——该模式刻意，fail 在 typecheck 层。
- 不补 flux-runtime/flux-compiler（比率已良好：0.59/0.82）。
- 不改 public API 语义或加导出。

## Scope

### In Scope

- `packages/flux-formula/src/**` 新增测试文件（bind-ast、parser-node-factories）
- `packages/flux-core/src/**` 新增测试文件（value-adapter、constants、validation-model、json-merge、compiled-renderer-contract、schema guards、format-registry）
- `packages/flux-renderers-industrial/src/**` 两处既有测试文件修复 + 拆分新文件 `editor-engine-editor-targets.test.ts`（oversized 拆分，见执行中裁决）
- `scripts/baselines/scanner-baselines.json`（拆分副作用的 test-infra 登记）
- `packages/flux-renderers-3d/src/engine/scene-manager-branches3.test.ts` 修复

### Out Of Scope

- 任何 `src/` 产品代码文件（测试写不出合理断言而需改产品代码时，停下来裁决，不得顺手改码）
- 其余包的测试补齐
- mutation testing / 覆盖率门禁

## Failure Paths

| 可测场景编号             | 触发                     | 行为                                                                                                                                                    | 可重试 | 用户可见表现               |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------- |
| test-exposes-live-defect | 新增测试在当前实现上失败 | 停止：该断言揭示 live defect——按 AGENTS.md Bug Fix Test Coverage Rule 升级为独立 finding 登记（docs/bugs/ 或新 plan），不得为本 plan 收口弱化断言或改码 | 是     | 当日 log + 新 finding 记录 |

## Test Strategy

档位选择：`必须自动化`——本 plan 交付物即自动化测试。每个导出的测试先写、实跑、确认在当前实现上绿（若红走 Failure Paths 表）；无断言套件修复后必须演示"能 fail"（临时注入变异确认断言咬合，随后还原）。

## Execution Plan

### Phase 1 - flux-formula 测试补齐

Status: completed
Targets: `packages/flux-formula/src/`

- Item Types: `Proof`

- [x] `bind-ast` 测试：literal/identifier/member-expression 的依赖绑定结果、嵌套表达式、非法输入形态
- [x] `parser-node-factories` 测试：四种工厂产出的 AST 形状字段（type/位置字段/子节点引用）
- [x] 测试文件按该包既有 colocate 约定放置与命名

Exit Criteria:

- [x] 新测试在当前实现上全绿（`pnpm --filter @nop-chaos/flux-formula test`）
- [x] 每个导出至少含一个负例断言（能区分语义正确/错误的输入）

### Phase 2 - flux-core 测试补齐

Status: completed
Targets: `packages/flux-core/src/`

- Item Types: `Proof`

- [x] `isCompiledActionProgram`：合法 compiled program / 普通 ActionSchema / null/undefined / 形状残缺对象
- [x] `isCanonicalBuiltInActionName`：allowlist 内/外/大小写边界
- [x] `normalizeHiddenFieldPolicy`：合法值 / 非法值 fallback / undefined 默认
- [x] `identityCompositeKey` + `resolveContext`/`joinPath`：复合键组成顺序、数值 token、嵌套路径、转义边界
- [x] `toCompiledRendererContract` 运行时派生：以合成 renderer definition 输入（改判见 Deferred「合成定义」），断言派生面与声明类型契约一致（字段集合精确相等/可选性）
- [x] `isSchemaArray`/`isSchemaInput`/`formatRegistry`/`booleanMappingAdapter`：guard 正负例 + registry 注册/查询 + boolean 映射边界

Exit Criteria:

- [x] 新测试全绿（`pnpm --filter @nop-chaos/flux-core test`）
- [x] `toCompiledRendererContract` 测试断言的是运行时派生结果（非 type-of 断言）

### Phase 3 - 无断言套件修复

Status: completed
Targets: `flux-renderers-industrial`（2 文件）、`flux-renderers-3d`（1 文件）

- Item Types: `Proof | Fix`

- [x] Proof（判别性前置）：证明四处现有"测试"是"无网"而非"有网不用"——改判为直读确认 4 套件零 `expect`（见 Deferred「前置 Proof」）
- [x] `editor-engine.test.ts` 四套件（:215/:324/:411/:431）：对 `setEditorTargets`/`setMode` 后的 engine 状态/effects 补真断言
- [x] `scene-manager-branches3.test.ts:51`：rAF init/dispose 路径补状态断言（场景创建/资源释放可观测面）
- [x] `scada-engine-events-declarations.test.ts:92`："should not emit" 改为可失败断言（区分"未 emit"与"handler 未接线"）——改判为 `EventBridge.prototype.attach` spy + 带 handler 对照组（见 Deferred「scada spy」）
- [x] Proof（判别性收尾）：对每处新断言做一次反向变异演示（旧无断言形态必挂），过程记录当日 log，不留变异

Exit Criteria:

- [x] 三个包测试全绿；四个套件均含 ≥1 个能 fail 的断言（变异演示记录在案）
- [x] git diff 仅测试文件 + scanner-baselines 登记（拆分副作用，见执行中裁决「文件拆分」）；零产品源文件

执行中裁决（2026-11-05）：

- **文件拆分**：4 个 patched 套件落地后 editor-engine.test.ts 达 703 行（> 700 oversized ERROR 阈值）→ 拆分至新 colocated 文件 `editor-engine-editor-targets.test.ts`（终态 118 行；原文件 650 行〔初记 661 为误记，closure audit round 1 M1 勘正〕）。副作用：模块级 `let container` 测试基建形态 +1 → scanner-baselines 登记 114→115 / discover 797→798（test-infra family，R2.5/727 先例，注记在册）。
- **契约发现**（测试即文档）：identity 读路径用 utils/object 的 toString-tag `isPlainObject`（class 实例通过、Date 拒），与 json-merge 自有 prototype 链 `isJsonObject`（diff/merge 消费）语义不同；uniqueAttrKey 为"身份键名"间接指针；isSchemaInput 接受 plain-class 实例。三者均按真实实现断言并注释记录。
- **closure audit round 1（2026-11-06，独立子代理）verdict issues → 处置**：
  - M1 计数失真（plan/log 记 bind-ast 10 / factories 5 / identity +17 / 合计 54 / industrial 1722 / 拆分后 661 行；实测 9 / 6 / +10 / 47 / 1721 / 650 行）→ 11-05 log 就地勘误标注；修订后终态见本节末条。
  - Minor 1（scada "handler spy" 未落，改用私有字段 + 恒真 `not.toThrow()`）→ **改判**：无 handler 场景不存在可 spy 的 handler；改为 `vi.spyOn(EventBridge.prototype, 'attach')` 断言未装配，并新增带 handler 的对照组断言恰装配一次；恒真断言移除。
  - Minor 2（Phase 3 前置 Proof 实际以"直读确认 4 套件零 expect"替代临时变异）→ **改判记录**：零 expect 的套件对任何变异都必然 pass，直读即证明"无网"，临时变异冗余；本条勾选按该等价证明成立。
  - Minor 3（变异演示不全）→ 补跑：editor-engine 多目标（`target = nodes[0]`）红、叶子守卫（`if (true)`）红；setMode preview 去掉 `clearEditorSelection` **原存活** → 新增 setMode 选区清空/幂等测试后红，setMode 幂等守卫移除红；scene-manager init 的 `disposed` 守卫 **原存活** → 断言 `rendererFactory` 仅调用一次后红，frame cancel 移除红；scada 早退守卫移除红。唯一存活：`dispose()` 首行 `disposed` 守卫——**顺序调用下的等价变异体**（全部句柄首轮释放后置 null，二次无守卫 dispose 只重复内部 `highlighter.revert()`/`loader.cancel()`/`splice`/`Set.clear()`，公开面不可观测；仅当注入的 renderer/controls stub 在自身 `dispose()` 内重入 `manager.dispose()` 时守卫才可观测——真实 three 无此重入），测试注释已改为不再声称"守卫"判别。变异脚本 `_tmp/audit-1106/mutate858.sh`，每次变异后 `git checkout` 还原源文件（git status 核验为空）。
  - Minor 4 → bind-ast 新增 2 例：未知节点类型不抛错不绑定、未知包装节点不下钻。Minor 5 → `createLiteralNode` 专测迁入 parser-node-factories（精确形状 + value/raw 互不强转）。Minor 6 → 断言 plain-class 实例通过 `isSchemaInput`。Minor 7 → 新增契约键集精确相等测试、乱码标题 "own噪声" 改写；"真实 renderer definition" 改判为合成定义——flux-core 处于依赖链底层，不能 import 渲染器包；合成定义与 `RendererDefinitionShape` 的 Pick 通道一一对应，键集测试兜底。Minor 8 → spy 全局 `requestAnimationFrame`/`cancelAnimationFrame`：init 恰调度一次、dispose 取消同一 handle。
  - round 1 处置后终态（被 round 2 修订，见下条）：新增 53 例；flux-formula 17/264。
- **closure audit round 2（2026-11-06，独立子代理）verdict issues → 处置**：
  - M1（`bind-ast.test.ts` 的 `expect(names).not.toContain('x:scope')` 为伪断言——helper `collectIdentifiers` 从不访问非 computed 属性，computed 守卫变异存活）→ 改为直接持有属性节点断言 `bindingOf(structuralProperty)` 为 undefined；复跑 computed 守卫变异 → 红。
  - Minor 1（Unary/Logical/NullCoalesce/Conditional 四个 walker 分支无测试网，清空各分支均存活）→ 新增"descends into unary/logical/null-coalesce/conditional operands"用例；四个分支逐一变异 → 全部红。
  - Minor 2（Deferred 节"（无）"占位与三处改判矛盾）→ 三处改判落 Deferred 节，对应 `[x]` 文本同步。Minor 3（Exit/Goals "仅测试文件"字面不成立）→ 文本修订为"测试文件 + scanner-baselines 登记 + docs；零产品源文件"。Minor 4（等价论证范围）→ 限定为"顺序调用下等价"。附带：`createSourceLocation` 为纯构造器无非法输入，零宽位置用例即其边界例。
  - 终态：新增测试 **54** 例（formula 19 = bind-ast 11 + factories 8；core 33；industrial 2）；包级 flux-core 58/818、flux-formula 17/**265**、3d 25/218、industrial 153/1723 全绿；editor-engine.test.ts 650 行 / editor-engine-editor-targets.test.ts 118 行。
- **既有 quirk 勘注**（非本轮回归）：industrial 包以 repo 根为 CWD 裸跑 vitest 时 v12e-family2-scada-state / toolbox-panel 两文件因 `readFileSync('src/editor/styles.css')` 相对路径 ENOENT 红——须以包根为 CWD（pnpm --filter）运行。

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_3c43e191（fresh session）
- Verdict: `pass-with-minors`（零 Blocker/Major；9 组零引用声称全部独立复核成立〔非抽查〕、行号引用逐字正确、断言缺失位点逐个打开确认）
- Rounds: 1
- Findings addressed: Minor 4 条中 3 条已吸收进正文（公开面声称收窄为"6 组公开 + 3 组包内相对导入"；colocate 措辞统一为按包现状就近；Phase 3 mutation-demo Proof 前置）；1 条不阻塞——16,837/46 project 与 flux-runtime/flux-compiler 比率未独立复跑（执行不依赖，以审计日志佐证）

## Closure Gates

- [x] 9 组导出测试全部落地且全绿
- [x] 4 处无断言套件全部具备判别性断言（变异演示在案）
- [x] 零产品源文件改动（git diff 核验）
- [x] 新增测试过程中暴露的 live defect（若有）已按 Failure Paths 登记归属，未被静默（本轮无 live defect；3 条实现契约发现已按测试注释记录，见 Phase 3 裁决）
- [x] owner docs 无需更新（纯测试，无行为/契约变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（全量 0 failed，新增数计入当日 log）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### 合成定义（Phase 2 `toCompiledRendererContract`）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: plan 原写"真实 renderer definition"；flux-core 位于依赖链底层，不能 import 任何渲染器包。合成定义与 `RendererDefinitionShape` 的 Pick 通道一一对应，且新增的键集精确相等测试会在通道增删时失败——判别力不依赖定义来源。
- Successor Required: `no`

### 前置 Proof（Phase 3 判别性前置）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 原写"对四处各做一次临时变异"；零 `expect` 的套件对任何变异都必然 pass，直读确认零 `expect` 已等价证明"无网"，临时变异冗余。判别性收尾（新断言的反向变异）已全量执行。
- Successor Required: `no`

### scada spy（Phase 3 scada 套件）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 原写"handler spy"；该用例的前提就是"不提供 handler"，不存在可 spy 的 handler。改为 spy `EventBridge.prototype.attach`（桥线装配面）+ 带 handler 的对照组，二者共同区分"未 emit"与"handler 未接线"；去掉早退守卫的变异会被击杀。
- Successor Required: `no`

## Non-Blocking Follow-ups

- flow-designer-core src:test 1.88 属非 flux core 面，是否补齐挂 improvement-analysis 治理轮。
- 其余 core-facing 包（spreadsheet-core 1.38 / flux-code-editor 1.37）同上。

## Closure

Status Note: 9 组导出测试与 4 处无断言套件全部落地为判别性断言（新增 54 例），零产品源改动；三轮独立 closure audit 共发现并收敛 1+1 个 Major（计数失真、伪断言）与 12 条 Minor，原存活变异体（setMode 选区清空、setMode 幂等、scene-manager init 守卫、bind-ast computed 守卫、四个 walker 分支）全部转为击杀，唯一存活的 `dispose()` 守卫裁定为顺序调用下的等价变异体。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子代理 ×3（round 1 issues → round 2 issues → round 3 **approved**，2026-11-06）
- Evidence: round 3 独立复跑未变异基线 bind-ast 11/11 + 5 个 bind-ast 变异全红并还原；flux-formula 17/265、flux-core 58/818 抽核；54 例逐文件核对；16,885 基线求和核验；四包 typecheck/lint 0；零产品源文件。处置记录见本 plan「执行中裁决」与 `docs/logs/2026/11-06.md`。

Follow-up:

- no remaining plan-owned work（Non-Blocking Follow-ups 两条为非 flux core 面的治理候选）。
