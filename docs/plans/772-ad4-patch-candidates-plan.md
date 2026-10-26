# 772 AD-4 Patch 候选预览、采纳、回滚与冲突（AI Debugger Copilot）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/ai-debugger-copilot-roadmap.md` AD-4 work item；owner doc `docs/architecture/nop-debugger-ai.md` §Schema Patch Protocol（plan 771 已收口）；用户指令 2026-10-27（执行路线图至完成——AD-4 patch 应用路径结构性门控的事前人工确认，见 roadmap Rule 9 / mission ②；应用的人工确认门 = 本计划的预览-采纳 UI，模型不可自行应用）
> Related: `docs/plans/770-ad2-ai-session-panel-plan.md`（completed，会话面）、`docs/plans/771-ad3-schema-patch-contract-plan.md`（completed，apply/revert seam）

## Purpose

落地 AD-4：把 AD-3 的 patch 契约接入 AI 会话面——`propose_schema_patch` 模型工具（校验后**暂存候选，不应用**）、候选预览卡（diff 摘要 + 可选宿主沙箱预览）、采纳/放弃/回滚操作面、预览期间 scope 变化冲突检测、端到端链路测试（程序化断言）。应用路径的人工门 = 预览卡上的采纳按钮，模型无任何直接 apply 通道。

## Current Baseline（2026-10-27 live 核对）

- AD-3 已落地：controller `validateSchemaPatch/applySchemaPatch/revertSchemaPatch/getSchemaPatchAudit/registerSchemaPatchApplier`（fail-closed、审计、活跃表）；`NopSchemaPatch` 判别联合 op；目标活树解析 + 歧义拒绝。
- AD-2 已落地：`createAiDebuggerExtension`（`x-ai` tab、engine 单例、tools 来自 `createDebuggerAiTools` 只读白名单 10 工具）；`AiSessionTab` 会话面。
- 工具执行面：`createDebuggerAiTools` 返回 `{ tools, toolExecutor }`，executor 按显式 registry 分发；`propose_schema_patch` 目前不在面内（探针种子含此名）。
- `NopSchemaPatchApplier` 接口：`apply(patch) → { revertToken }` / `revert(token)`；无 preview 钩子（沙箱渲染预览需宿主配合，v1 以**可选** `preview?` 钩子扩展接口——向后兼容加法）。
- window automation API 无 patch 面（AD-3 裁定保持）；工具经 nop-debugger-ai 直接持 controller 引用（extension 输入）。
- 会话面工具注入点：extension 创建 engine 时传 `tools + toolExecutor`；当前 executor 只认 10 只读工具名。

## Goals

- `propose_schema_patch` 工具（nop-debugger-ai，显式注册进会话工具集）：入参 `{ target: {cid?,nodeId?,path?}, ops, reason? }` → 组装 `NopSchemaPatch`（id `patch-<timestamp>-<seq>`、createdAt 由包生成、scope.controllerId = 本 controller）→ `controller.validateSchemaPatch` → 失败返回结构化错误（模型可修正重试）；成功**暂存候选**（不应用）并返回 `{ candidateId, resolvedTarget, ops 摘要 }`——返回面经 redactData + 字节上限（沿 trim 复用；内容为模型自报数据，脱敏属纵深）。实现形态：**复合 dispatcher 分支**（propose 需 controller 引用，不合入只读 `invoke(automation,args)` 定义形态），与只读 executor 同一入口分发。
- CandidateStore（per-controller，module 级）：`{ patch, validation, stagedAt, status: 'staged'|'applied'|'reverted'|'discarded'|'conflicted' }`。名额记账：只有 staged/conflicted 占用 ≤ 10 的活跃名额（溢出拒绝新候选并提示处理既有候选）；终态卡（applied/reverted/discarded）不占名额、各带关闭（✕）控件、展示历史 FIFO 上限 10 张。
- CandidateStore 响应式契约：`subscribe`/`getSnapshot` 返回缓存数组 identity（panel tabs 同款，防 useSyncExternalStore 循环）；冲突重验触发 = 卡片渲染时 + 采纳时（采纳时为承载门，controller.applySchemaPatch 内部另有第三重校验）。冲突措辞为「渲染时 + 采纳时」两时点，不称实时。
- 预览卡 UI（AI tab 内，会话侧栏）：候选卡列表并列呈现（点击卡片聚焦该候选，即「切换」的 v1 形态；独立候选切换器/并排对比视图不做）。每卡渲染 diff 摘要：每 op 展示 field、原值 → 新值（原值从目标 inspect 投影的 metaSummary/propsSummary 可得则展示，不可得则显式标注原值不可得、仅显示新值；set-expression 卡显示表达式原文）、校验结果与 resolvedTarget、冲突态；**采纳**（重验 → 通过才 `applySchemaPatch`，状态 applied）/ **放弃**（discarded）；applied 卡显示 **回滚**（`revertSchemaPatch`）；宿主 preview 结果（input.preview——宿主可取自其 applier 的 preview 实现——可用时）展示其文本摘要，否则 fallback diff 卡（fallback 即 v1 默认形态）。
- 冲突检测：卡片渲染重跑 `validateSchemaPatch`——目标消失/歧义/越权 → 状态置 `conflicted` 且采纳禁用；采纳前再重验一次（fail-closed）。回滚活跃性以 CandidateStore status + `revertSchemaPatch` 自身的 no-active 拒绝为准（不依赖审计 ring——50 条 drop-oldest 不可靠）。
- 预览通道（裁定：经 `AiDebuggerExtensionInput.preview?` 注入，不扩 controller 面）：宿主把沙箱预览函数与 applier 一起在宿主侧持有，并把 `preview?: (patch: NopSchemaPatch) => Promise<{ kind: 'rendered'; summary: string } | { kind: 'unsupported' }>` 传给 extension——包内不新增 controller 读访问器；`summary` 为文本摘要（v1 不传 HTML，避免注入面；AD-6 落真实渲染时再扩展形态）。`NopSchemaPatchApplier` 增加可选 `preview?` 方法（向后兼容加法）供宿主在 applier 对象上就近实现，extension 侧以 input.preview 优先。
- 端到端链路测试（程序化断言）：mock connector 发起 tool_calls propose → 工具暂存 → 预览卡出现 → 点击采纳 → applier.apply 收到 patch → 回滚 → applier.revert 收到 token；冲突链路：暂存后目标从 registry 移除 → 卡片 conflicted → 采纳拒绝；**注入断言延伸**：patch 卡上的模型自报字符串（op 值/表达式/reason）以 React 文本节点渲染（不进 HTML/属性），测试断言含指令样文本的候选仅以文本内容出现。
- M2/M3/M4 裁决（评审 round 1）：①propose 审计条目**不在 controller 侧落地**（controller 审计保持 validate/apply/revert/reject 四动作）——propose 溯源由 CandidateStore 的 stagedAt/status 承载（有界 10），owner doc 的 propose 预留句在 Phase 3 就地勘误；②editableProps 深门控**改判 residual**：v1 由「预览卡展示 field+原值→新值 + 人工采纳门」承载风险控制，authoringContract 校验需扩 AD-3 validate 语义（超出本计划 Non-Goal「不动 AD-3 契约语义」），归 AD-6 集成面随宿主参考 applier 一并裁定；③「候选切换与原版对比」：原值→新值 diff 与卡片聚焦式切换即 v1 交付（见预览卡 UI 条），独立切换器不做。

## Non-Goals

- 不做批量候选/候选排序/候选编辑（单条流程）。
- 不在包内实现沙箱渲染（宿主 preview 钩子的职责；包内只有 fallback diff 卡）。
- 不改 automation/window API；不动 AD-3 契约语义（仅接口可选加法）。
- 不做候选持久化（会话内有效，随 dispose 清理）。

## Scope

### In Scope

- `packages/nop-debugger/src/types.ts`：`NopSchemaPatchApplier` 可选 `preview?` 加法（向后兼容）
- `packages/nop-debugger-ai/src/{types.ts,panel/patch-candidates.ts(新,存储),panel/propose-tool.ts(新),panel/patch-queue.tsx(新,预览卡),panel/session.tsx,panel/extension.tsx}`：工具、候选存储、预览卡 UI、工具集组装
- `packages/nop-debugger-ai/src/__tests__/patch-chain.test.tsx(新)`：端到端链路 + 冲突链路 + 采纳门测试
- owner doc：§Schema Patch Protocol 补 preview 可选钩子与候选生命周期两句（与既有裁定一致化）；`docs/logs/2026/10-27.md`、roadmap §4 AD-4 行状态推进

### Out Of Scope

- playground 参考宿主（AD-6）；flux-core；automation API；AD-5 离线夹具

## Failure Paths

| 场景                | 触发                      | 行为                                                            | 可重试           | 用户可见     |
| ------------------- | ------------------------- | --------------------------------------------------------------- | ---------------- | ------------ |
| 提案校验失败        | 模型给出非法 patch        | 工具返回 `ok:false` + 逐条错误（不暂存）                        | 是（模型修正）   | 工具卡失败态 |
| 候选溢出            | 已有 10 个活跃候选        | 工具拒绝并提示处理既有候选                                      | 是               | 工具卡错误   |
| 预览期冲突          | 暂存后目标从活树消失/歧义 | 卡片 `conflicted`；采纳按钮禁用                                 | 否（需重新提案） | 卡片冲突标记 |
| 采纳时校验翻转      | 采纳瞬间校验失败          | 采纳拒绝、状态 conflicted、审计无 apply                         | 否               | 错误提示     |
| adopt 时 apply 抛错 | 宿主 applier 失败         | 状态回 staged、错误横幅（AD-3 原子性：宿主保证无半态）          | 是               | 错误提示     |
| 回滚失败            | revertSchemaPatch 抛错    | 错误横幅，状态保持 applied                                      | 是               | 错误提示     |
| 模型越权应用        | 模型尝试直接调用 apply    | 无此工具：apply 不在模型工具面（唯一应用通道 = 预览卡人工点击） | -                | 无           |

## Test Strategy

本档选择：`必须自动化`（roadmap §7：AD-4 e2e 验证面为必须自动化；链路测试程序化断言）。判别机制点名：采纳门测试在"工具可直达 apply"的旧实现下必挂（断言=模型工具面不含 apply、executor 对 apply 类名字返回 unknown tool）；冲突检测测试在"暂存时校验一次、之后不重验"的旧实现下必挂（暂存后移除目标 → conflicted 断言失败）。Proof（链路/冲突测试）先于 UI 装配落地（先红后绿）。

## Execution Plan

### Phase 1 - propose 工具与候选存储（Proof 先行）

Status: completed
Targets: `packages/nop-debugger-ai/src/{panel/propose-tool.ts,panel/patch-candidates.ts,types.ts}`、`packages/nop-debugger/src/types.ts`（preview 加法）

- Item Types: `Proof`（先红）+ `Fix`（实现）

- [x] 先红：单元级链路测试——propose 工具（非法入参 → ok:false 逐条错误、合法 → staged + candidateId、溢出拒绝）、采纳门（模型工具面枚举不含 apply/revert；**复合 dispatcher**——Phase 1 即构建并导出——对 `apply_schema_patch` 等名字返回 unknown tool）、CandidateStore 状态机（staged→applied→reverted / staged→discarded / conflicted 判定）
- [x] 实现：propose-tool（组装 patch + validate + stage）、patch-candidates（CandidateStore per-controller + 有界 + 状态机）、types preview 加法
- [x] 后绿 + `pnpm --filter @nop-chaos/nop-debugger-ai test` 全绿

Exit Criteria:

- [x] 单元链路测试全绿（先红证据在案）；nop-debugger 既有测试无回归（接口加法向后兼容）

### Phase 2 - 预览卡 UI 与会话集成

Status: completed
Targets: `packages/nop-debugger-ai/src/panel/{session.tsx,extension.tsx,patch-queue.tsx(新)}`

- Item Types: `Fix`

- [x] 预览卡组件：候选列表（diff 摘要/校验结果/渲染时+采纳时冲突态）、采纳（重验→apply）/放弃/回滚操作、applied 卡回滚、宿主 preview 钩子结果展示（fallback diff 卡）
- [x] extension：工具集组装（只读 10 + propose_schema_patch，单一 dispatcher）、CandidateStore 注入会话
- [x] 端到端链路测试（先红后绿）：mock connector 发起 propose 工具调用 → 预览卡出现 → 程序化点击采纳 → fake applier.apply 断言 → 回滚 → applier.revert 断言；冲突链路（暂存后移除 registry 目标 → conflicted → 采纳拒绝）
- [x] `pnpm --filter @nop-chaos/nop-debugger-ai test` 全绿

Exit Criteria:

- [x] 端到端链路与冲突链路测试全绿（先红证据在案）；会话既有行为无回归

执行期实现补充（Phase 2 同批）：冲突重验触发在两时点之外增加 `touch()` 轻量轮询（外部活树变化不触 store，轮询驱动渲染时重验保新鲜；测试以 waitFor 轮询周期断言 conflicted 翻转）

### Phase 3 - owner doc 一致化与全量验证

Status: completed
Targets: `docs/architecture/nop-debugger-ai.md`、`docs/logs/2026/10-27.md`

- Item Types: `Follow-up`（owner doc）+ `Proof`（全量验证）

- [x] owner doc：§Schema Patch Protocol 补候选生命周期与 preview 可选钩子两句 + propose 预留句就地勘误（propose 溯源由候选存储承载，controller 审计四动作不变）；Current Code Anchors 补 patch-candidates/propose-tool
- [x] daily log 记录

Exit Criteria:

- [x] owner doc 锚点经 anchor 门禁；全量验证归 Closure Gates

## Draft Review Record

- Reviewer / Agent: agent_d3b41ebd（独立 fresh session）
- Verdict: `pass-with-minors`（Round 1 `revised`：6 Major——preview 通道经 extension input 注入、propose 审计改判候选存储承载、editableProps 改判 residual、原值→新值 diff 即 v1 对比/切换、CandidateStore 响应式契约与两时点冲突措辞、名额记账只计活跃；Round 2 复核 0 Blocker / 0 Major，共识达成）
- Rounds: 2
- Findings addressed: M1-M6 全部按 round-2 复核确认落地；round-2 五条 Minor 已就地清扫（实时措辞、Phase 3 勘误项镜像、preview 读取路径措辞、Follow-up 镜像 editableProps、M3 理由精确化）。

## Closure Gates

- [x] propose 工具/候选存储/预览卡/冲突检测/采纳-回滚链路全部落地且链路测试在案（采纳门 + 冲突判别机制点名）
- [x] 模型工具面不含任何直接 apply/revert 通道（唯一应用通道 = 预览卡人工点击，测试证明）
- [x] AD-3 契约零语义变更（preview 为可选加法；automation/window 零改动）
- [x] owner doc 一致化（live 基线变化已反映）
- [x] 无被静默降级的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

Closure audit round 1（agent_32d60d72）verdict `issues`：M1 preview 钩子死管线（已接线：staged 卡 useEffect 调用 preview、摘要文本展示、fallback diff 卡）、M2 diff 卡缺原值→新值（已实现：originalValue 从目标 inspect 投影解析，不可得时显式「(original unavailable)/原值不可得」标注；owner doc :77 措辞随之成立）、M3 注入断言空转（已硬化：reason 以文本节点渲染进卡片、探针含 HTML 片段、断言「转义存在 + 真实 img 元素为零」的可证伪判别）+ m1 flux-core 转 devDep、m2 补测试（名额释放/rollback 状态门/FIFO 修剪断言——修剪点由 stage 扩展到终态转移、always-false 残句删除）、m3 展示序改为活跃优先。另补 preview 摘要渲染与原值标注两组渲染测试。round 2 复审（agent_32d60d72）确认 M1/M2/M3 全部修复，唯 m2 记录不实（残句当时未删、FIFO 无断言、+2 非 +3）→ 已按实况补正：残句确删、FIFO 断言落点移至终态转移、记录以实况为准。待 round 3 复审。

- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（无——执行中改判须当场落节。）

## Non-Blocking Follow-ups

- 候选批量提案/排序/编辑：单条流程为 v1 裁定，批量属优化候选。
- 宿主 preview 钩子的参考实现（playground 沙箱渲染）：归 AD-6 集成面。
- editableProps 深门控（round-1 M3 改判 residual，承 771 交付裁定）：v1 风险控制 = 预览卡 field+原值→新值展示 + 人工采纳门；工具侧实现该门控需把 authoringContract 数据接通候选生成路径，归 AD-6 随宿主参考 applier 一并裁定（Successor: AD-6）。

## Closure

Status Note: AD-4 交付完整：propose_schema_patch（stage-only 复合 dispatcher）、CandidateStore（缓存 identity 快照、活跃名额 ≤10、终态 FIFO 修剪含 dismiss 路径）、预览卡（原值→新值 diff + 不可得标注、宿主 preview 摘要 + fallback、reason 文本渲染）、采纳门（模型工具面零 apply/revert 通道，判别测试钉死）、冲突两时点重验 + 轮询、端到端链路与冲突链路测试。55 tests 绿。

Closure Audit Evidence:

- Auditor / Agent: agent_32d60d72（独立 fresh session）
- Evidence: round 1 `issues`（M1 preview 死管线 / M2 diff 缺原值→新值 / M3 注入断言空转 + m1-m3）→ 修复批次（preview 接线、originalValue 解析与标注、探针含 HTML 片段 + 转义判别、flux-core devDep、渲染测试）；round 2 `issues`（M-A 记录不实——残句当时未删、FIFO 无断言）→ 残句实删 + FIFO 断言落定（暴露真 bug：修剪只在 stage 时触发，终态转移后可超限——pruneTerminalHistory 提取并挂 stage/setStatus 双路径，判别测试在旧实现下必挂）；round 3 `approved`（七门禁独立重跑 exit 0、55/55 绿、记录与实况一致）。残余 m-r1（dismiss 修剪）已随收口修复；m-r2（原值分支的已知值断言）记录为非阻塞。

Follow-up:

- originalValue 渲染测试可补已知原值断言（fake registry 提供 propsSummary 投影）——优化候选，非阻塞。
- 宿主 preview 钩子参考实现归 AD-6；批量候选/排序/编辑不做（v1 裁定）。
