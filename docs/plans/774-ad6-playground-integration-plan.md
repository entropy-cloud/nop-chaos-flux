# 774 AD-6 Playground 集成、文档与收口（AI Debugger Copilot）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/ai-debugger-copilot-roadmap.md` AD-6 work item；owner doc `docs/architecture/nop-debugger-ai.md`；用户指令 2026-10-27（执行路线图至完成）
> Related: `docs/plans/770-ad2-ai-session-panel-plan.md`（completed）、`docs/plans/771-ad3-schema-patch-contract-plan.md`（completed）、`docs/plans/772-ad4-patch-candidates-plan.md`（completed）、`docs/plans/773-ad5-local-model-fixtures-plan.md`（completed）

## Purpose

落地 AD-6（路线图收口项）：debugger-lab 提供显式启用/关闭的 AI Copilot 演示路径（默认关闭、零加载零注册；演示 connector + 参考宿主 applier——补齐 AD-4 遗留的宿主参考实现）；e2e 程序化断言全链路（提案→采纳→回滚→还原）；`flux-runtime-module-boundaries.md` 补 AI 扩展包边界节；owner doc 最终态收口。

## Current Baseline（2026-10-27 live 核对）

- AD-0..AD-5 全部 `done`（roadmap §4）；`@nop-chaos/nop-debugger-ai` 完整交付（工具面/会话面/候选/夹具）。
- `apps/playground/src/pages/debugger-lab-page.tsx`：API 演练页，无 AI 面、无 schema 渲染；App.tsx 经 `createNopDebugger({exposeAutomationApi:true})` 注入 controller，路由 `/#/debugger-lab`。
- flux-basic-page 先例：`SchemaRenderer`（createSchemaRenderer + createDefaultRegistry + register\*Renderers）+ `onRuntimeChange → controller.setRuntime`、`onComponentRegistryChange → controller.setComponentRegistry`、`onActionScopeChange → setActionScope`——组件树/runtime 接线即目标解析（活树）成立的前提。
- `NopSchemaPatchApplier.preview?` 可选钩子（plan 772）；宿主参考实现（AD-4 Follow-up 明确归 AD-6）未落地。
- playground 依赖含 `@nop-chaos/nop-debugger`，**不含** `@nop-chaos/nop-debugger-ai`（零加载前提——不装包则 chunk 不存在）。
- e2e 先例：`tests/e2e/debugger.spec.ts` hash 路由 `/#/debugger-lab`、`.nop-debugger` 面板、`.ndbg-tab` 计数、程序化断言纪律（AGENTS/owner doc：截图仅诊断）。
- `docs/index.md` owner doc 路由行已存在（AD-0 落地）；`flux-runtime-module-boundaries.md` 现无 nop-debugger/nop-debugger-ai 记载。

## Goals

- playground `@nop-chaos/nop-debugger-ai` 依赖接入（workspace:\*）；debugger-lab 新增「AI Copilot」SectionCard：**显式启用开关**（默认 OFF）——ON 时动态 `import('@nop-chaos/nop-debugger-ai/panel')` 并 `createAiDebuggerExtension`；OFF/再次点击 → `dispose()`。未启用零加载、零注册（e2e 断言 4 tab）。
- 演示 connector（宿主持有、零密钥零网络）：scripted 两轮——首轮对用户消息回 propose 工具调用（目标取活树中 **rendererType === 'input-text'** 的首个项的 cid——过滤容器节点，保证命中演示字段；ops = set-prop label → 演示新值，reason = 演示文案），次轮文本确认 staged；后续消息文本作答。
- applier 注册接线（对称）：启用时 `controller.registerSchemaPatchApplier(applier)` 并保存注销函数；停用时调用注销（OFF 态不留活 applier，fail-closed 契约回到"无 applier 拒绝"）。
- **参考宿主 applier**（AD-4 遗留归此项；demo-scope 标注）：`createDemoSchemaPatchApplier({ getSchema, setSchema })` 纯逻辑工厂——apply 前深拷贝当前 schema 为还原点，逐 op 校验 field==='label'（其余 op 抛错=原子失败），全部成功才 setSchema（演示 schema 为单字段表单，label op 一律落在 body[0]，无需节点级寻址）；revert(token) 还原快照；preview 返回 `{kind:'rendered', summary}` 文本摘要。debugger-lab 渲染迷你 flux 表单片段（SchemaRenderer + env/setRuntime/setComponentRegistry/setActionScope 四接线，flux-basic-page 同款）承载演示目标。
- e2e `tests/e2e/debugger-ai.spec.ts`（程序化断言）：①未启用时 4 tab（零注册）+ **零加载网络断言**（`page.on('request')` 收集 OFF 期间全部请求 URL，断言无一命中 `nop-debugger-ai`；启用后正向断言该模块被动态拉取——加载判别双向）；②启用后 5 tab → AI tab 发消息 → 候选卡出现 → 采纳 → 渲染 demo 表单 label 变更（DOM 文本断言）→ 回滚 → label 还原。
- 文档收口：`flux-runtime-module-boundaries.md` 增「诊断与 AI 扩展包」节（nop-debugger-ai → nop-debugger 方向、runtime 零依赖、可整体移除）；owner doc Current Code Anchors 补 playground 参考实现 + Host reference integration 段；`docs/index.md` 核对既有登记（AD-0 已建行）。

## Non-Goals

- 不接真实模型密钥路径进演示（演示 connector 为 scripted；env 键路径属于宿主既有 openai-connector 先例，不在本计划接线）。
- 不改 nop-debugger-ai 包语义；不动 flux-runtime 模块链。
- 不做 AI 能力的其他页面推广（仅 debugger-lab 演示路径）。

## Scope

### In Scope

- `apps/playground/package.json`：+`@nop-chaos/nop-debugger-ai` workspace dep
- `apps/playground/src/ai/debugger-ai-demo.ts`（新：演示 connector + 参考 applier 纯逻辑）+ `apps/playground/src/ai/debugger-ai-demo.test.tsx`（applier 单测）
- `apps/playground/src/pages/debugger-lab-page.tsx`（AI Copilot 卡 + 迷你 flux 演示片段 + 开关接线）
- `tests/e2e/debugger-ai.spec.ts`（新）
- `docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/nop-debugger-ai.md`（锚点 + Host reference integration 段）
- `docs/logs/2026/10-27.md`、roadmap §4 AD-6 行状态推进（closure 后 `done`）

### Out Of Scope

- nop-debugger-ai/nop-debugger 源码语义变更；真实模型接线；其他 playground 页面；flux-runtime 链路

## Failure Paths

| 场景                       | 触发              | 行为                                                                                              | 可重试             | 用户可见   |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- | ------------------ | ---------- |
| 演示片段未渲染/registry 空 | demo 目标无活树项 | 演示 connector 的 propose 被校验拒绝（target not resolved）→ 工具卡失败态（fail-closed 链路自带） | 是（先渲染再启用） | 工具卡错误 |
| applier 收到非 label op    | 演示外的 op 类型  | applier 抛错 → AD-3 原子性保证 schema 不变 + 候选回 staged                                        | 是                 | 错误提示   |
| 二次启用                   | toggle OFF→ON     | 旧 extension 已 dispose（tab 注销、store 清理）；新实例全新会话                                   | 是                 | 新会话     |
| e2e 面板时序               | 面板未开即查 tab  | e2e 先 Show 面板再断言（先例同 debugger.spec）                                                    | 是                 | 无         |

## Test Strategy

本档选择：`必须自动化`（roadmap §7：AD-6 e2e 验证面必须自动化）。判别机制点名：零注册断言（未启用 4 tab）在"静态注册"旧实现下必挂；applier 原子性单测在"逐 op 直接 setSchema"旧实现下必挂（非法 op 中途失败后 schema 已变的断言）；e2e 全链路在"采纳不落 applier"回归下必挂（label 断言）。

## Execution Plan

### Phase 1 - 演示 connector、参考 applier 与页面接线

Status: completed
Targets: `apps/playground/src/ai/debugger-ai-demo.ts`（新）、`apps/playground/src/ai/debugger-ai-demo.test.tsx`（新）、`apps/playground/src/pages/debugger-lab-page.tsx`、`apps/playground/package.json`

- Item Types: `Fix`

- [x] `debugger-ai-demo.ts`：`createDemoConnector(controller)`（scripted 两轮 propose→确认，目标取活树首项）；`createDemoSchemaPatchApplier({ getSchema, setSchema })`（快照还原点、仅 label op、原子、preview 文本摘要）
- [x] applier 单测：apply 生效/revert 还原/非法 op 原子拒绝（schema 不变）/快照独立性
- [x] debugger-lab：AI Copilot 卡（启用开关 + 状态显示）+ 迷你 flux 演示片段（SchemaRenderer 四接线）+ 动态 import 接线；`package.json` 依赖
- [x] `pnpm --filter @nop-chaos/flux-playground typecheck/test` 绿

Exit Criteria:

- [x] applier 单测全绿（6 项：apply/revert/原子性/快照独立/preview 形态/connector 目标过滤）；页面 typecheck 绿；未启用路径不 import 包（动态 import + e2e 网络级断言双证）

执行期修复：patch-queue adopt 按钮一处此前误编辑残留的错位 `>`（tsc 视 JSX 文本 `>` 为合法而 vite:oxc 拒绝——双解析器分歧，由 dev-server 500 + esbuild 定位）；e2e 按钮定位改 testid 前缀（playground locale 非 en，按钮名不稳定）

### Phase 2 - e2e 全链路与文档收口

Status: completed
Targets: `tests/e2e/debugger-ai.spec.ts`（新）、`docs/architecture/{flux-runtime-module-boundaries.md,nop-debugger-ai.md}`、`docs/logs/2026/10-27.md`

- Item Types: `Proof`（e2e）+ `Follow-up`（文档）

- [x] e2e：零注册（4 tab）→ 启用（5 tab + AI tab）→ 发消息 → 候选卡 → 采纳 → demo label DOM 断言变更 → 回滚 → 还原（全程程序化）
- [x] `flux-runtime-module-boundaries.md` 增「诊断与 AI 扩展包」节；owner doc 锚点 + Host reference integration 段（须标注 demo-scope：演示 connector 的 cid 取自宿主树扫描而非工具面——真实模型经 inspect 上下文获得 cid；applier 为最小参考非生产形态）；`docs/index.md` 核对既有行（AD-0 登记，无重复）。裁定：roadmap AD-6 行所列 `debugger-runtime.md` 无需改动——AI 面注记已于 plan 768 落地，本计划不改 debugger 语义
- [x] daily log 记录

Exit Criteria:

- [x] e2e 全绿且纯程序化断言；文档三处落地经 anchor 门禁

## Draft Review Record

- Reviewer / Agent: agent_c07a53bb（独立 fresh session）
- Verdict: `revised`（0 Blocker / 4 Major——M1 applier 注册接线未命名、M2 零加载无判别验证、M3 承 772 两条 successor 未清算、M4 活树首项不保证命中演示字段；修订后按评审预期可直接 pass-with-minors）
- Rounds: 1（修订即清算全部 Major；Minor m1 过滤名/m2 debugger-runtime 裁定/m3 demo-scope 措辞/m4 单字段寻址/m5 demo 标注一并落实）
- Findings addressed: M1——启用注册/停用注销对称接线写入 Goals 与 Phase 1；M2——e2e 增网络级零加载双向断言；M3——两条 successor 清算入 Deferred But Adjudicated；M4——目标过滤 rendererType==='input-text' + 单字段 schema 寻址裁定。

## Closure Gates

- [x] playground 启用路径落地：默认关闭、显式开关、动态 import、dispose 对称
- [x] 参考宿主 applier 落地（AD-4 遗留归此项清账）：快照原子 apply/revert、preview 文本摘要、单测在案
- [x] e2e 全链路程序化断言在案（零注册/启用/提案/采纳/回滚/还原）
- [x] 文档三处收口（boundaries 新节 / owner doc 最终态 / index 核对）
- [x] 无被静默降级的 in-scope live defect 或 contract drift
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck` exit 0
- [x] `pnpm build` exit 0
- [x] `pnpm lint` exit 0
- [x] `pnpm test` exit 0（playground demo 单测 6/6，全包绿）
- [x] `pnpm check` exit 0（scanner 净增量注册：react19 664 / performance 30 / discover 797，日期化理由）
- [x] `pnpm test:e2e` exit 1 为**既有基线精确一致**：247 failed = 台账 2026-10-26 稳定红 247 逐项同量、1651 passed、46 skipped；debugger-ai.spec ✓；零新增红

Closure audit round 1（agent_3eca9e18）verdict `issues`：M1 表面外污染文件 `04-e2e-domain-pages.md`（非本队列所改，历史上已裁定为格式劣化）→ 已 `git checkout --` 还原至 HEAD；其余全项 verified；待 round 2 narrow 复审。

## Deferred But Adjudicated

### editableProps 深门控（承 plan 772 交付裁定，Successor=AD-6 到期清算）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 路线图队列至此收口；v1 风险控制由「预览卡原值→新值 diff + 人工采纳门 + 宿主 applier 自身契约」承载，生产化门控属宿主 applier 实现方的 schema 契约职责（非 debugger-ai 包语义）；无后续 plan（无 Loop Rule）。
- Successor Required: `no`（宿主按需在其 applier 内实现字段级门控）

### preview 形态（承 plan 772 "AD-6 落真实渲染时再扩展形态"）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划裁定 preview 以文本摘要为路线图队列内的终态形态；真实沙箱渲染需宿主渲染器配合，超出 debugger-ai 包边界与队列范围；接口（`preview? → {kind, summary}`）已为宿主扩展留位。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 演示 connector 接真实 env 键路径（复用 openai-connector 先例）：属宿主配置项，按需开启。
- debugger-lab 之外的页面推广 AI 能力：不做（v1 裁定）。

## Closure

Status Note: AD-6 交付完整：playground 显式启用路径（默认关闭/动态 import/对称 dispose）、参考宿主 applier（快照原子 + 仅 label op + preview 文本摘要，6 单测）、e2e 全链路程序化断言（零加载网络级双向判别 + 提案→采纳→回滚→还原 + 停用回 4 tab）、文档三处收口；承 772 两条 successor 已清算入 Deferred。全量 e2e 247 failed = 台账稳定红精确一致（零新增红）、1651 passed、debugger-ai.spec ✓。

Closure Audit Evidence:

- Auditor / Agent: agent_3eca9e18（独立 fresh session）
- Evidence: round 1 `issues`——唯一 M1 为表面外污染文件 `04-e2e-domain-pages.md`（非本队列所改、历史已裁定为格式劣化），本计划自身 surface 全项 verified（六门禁独立重跑 exit 0、全量 e2e 日志独立核验 247=台账精确一致、playground 541/541 冷跑、demo 6/6）→ 按指令 `git checkout --` 还原 → round 2 narrow `approved`（工作树恰为 12 条声明路径、注记准确）。残余 minor：新依赖位置排列（cosmetic）。

Follow-up:

- no remaining plan-owned work（AD-0..AD-6 全 done，路线图队列收口）。
