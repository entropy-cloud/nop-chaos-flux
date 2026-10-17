# 638 跨 roadmap UR-11 UI 组件与测试质量（7 条收口）

> Plan Status: active
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-11（Wave C，audit-remediation Follow-up Backlog：D11 组 11-02/03/04 + P2-C/D/H/I）
> Related: `docs/backlog/audit-remediation-roadmap.md` Follow-up Backlog、AGENTS.md（测试布局惯例：colocation 与 `__tests__/` 双轨皆为 sanctioned）

## Purpose

收口 UR-11 全部 7 条：2 条已修复/失效（状态同步回写）；11-02/11-04 实修（playground 原生控件换 `@nop-chaos/ui`）；P2-I 实修（diff-view 19 处静态 inline style → Tailwind，全部为静态值已核实）；P2-D 有界加固（4 个低断言测试）；P2-C 裁定（colocation 为 AGENTS.md 双轨 sanctioned 惯例——登记指向已失效）。

## Current Baseline

（2026-10-17 独立核对，证据 file:line：）

- 11-03 env-stream-demo：已修复——`<label htmlFor>` + NativeSelect/NativeSelectOption（:131-133/:147-149）——状态同步回写。
- P2-H DiffGutterCell：已失效——文件已删除，全仓 src 零引用（dist 残留非源码）——状态同步回写。
- 11-02 diff-demo.tsx:180-218：原生 label（180/192/203/211）、select（182/194）、checkbox（204/212）——实修。
- 11-04 event-prevention-demo.tsx:62-82：Toggle 原生 label（:72）+ checkbox（:74）——实修。
- P2-I diff-view 19 处 style={{...}}（diff-view-renderer.tsx ×4、diff-file-list.tsx ×14、diff-three-column-view.tsx ×1）——**16 处静态 + 3 处含运行时条件**（R1 M1 勘误）：静态 16 处直接平移 Tailwind；条件位点集中在 diff-file-list.tsx（status tab 三元 :111-119、isActive bg + JS 命令式 hover 突变 :164/:174/:186-187、status badge 三层三元 :190-210），需语义转换（data-[active] 变体 / hover: 变体替代 JS hover / 条件 className），JS hover→CSS hover 存在微差风险——无法等价转换的位点保留 inline 并注记（visual-regress 兜底）。
- P2-D flux-core 低断言测试 4 个真实候选：utils/id.test.ts（2 expect）、class-aliases.test.ts（3）、json-merge/round-trip.test.ts（4）、utils/instance-path.test.ts（4）；renderer-contract-types.test.ts 为 expectTypeOf 类型钉（合理例外，不动）。
- P2-C flux-core 51 个测试文件散置（登记时 34，增长至 51）：AGENTS.md 明文「Tests may be colocated as _.test.ts / _.test.tsx or grouped under src/**tests**/; do not assume a single index.test.ts layout」——**双轨皆 sanctioned**，51 文件搬移是对现行惯例的反向 churn。裁定：登记失效（惯例裁定），回写说明。

## Goals

- 11-02/11-04 实修（原生控件 → `@nop-chaos/ui`：Label/Select(NativeSelect)/Checkbox）。
- P2-I 实修：19 处静态 inline style → Tailwind 工具类（含 var() 令牌的 arbitrary 形态）。
- P2-D：4 个低断言测试补足有意义断言。
- P2-C/11-03/P2-H 状态同步回写；Backlog 7 行 + cross-roadmap UR-11 + daily log。

## Non-Goals

- flux-compiler 测试归位（plan 628 Phase⑤ 领地）；新增 UI 组件导出。

## Scope

### In Scope

- `apps/playground/src/pages/{diff-demo,event-prevention-demo}.tsx`。
- `packages/flux-renderers-content/src/diff-view/`（19 处 style→class）。
- `packages/flux-core/src/` 4 个低断言测试文件。
- Backlog 7 行回写 + cross-roadmap UR-11 行 + daily log。

### Out Of Scope

- 测试布局迁移（P2-C 裁定）；其它 UR 条目。

## Failure Paths

| 编号           | 触发                           | 行为                                                     | 可重试 | 用户可见表现 |
| -------------- | ------------------------------ | -------------------------------------------------------- | ------ | ------------ |
| visual-regress | diff-view style→class 改变视觉 | 逐位点核对计算样式；无法等价转换的位点保留 inline 并注记 | 是     | 无           |
| ui-api-missing | @nop-chaos/ui 缺少等价组件     | 就地用最接近组合（Label+NativeSelect+Checkbox 均已在册） | 是     | 无           |

## Test Strategy

档位选择：**必须自动化**（11-02/11-04/P2-I 触及渲染面）——**Proof 先行**：P2-I 判别测试 = 扩展 `diff-view/__tests__/diff-file-list-a11y.test.tsx` 既有 no-inline-style 断言（:28 `expect(input.getAttribute('style')).toBeNull()` 先例）至 19 位点（旧实现 style 属性非空必挂）；11-02/11-04 以既有语义 marker 断言守护（diff-demo.spec.ts 全用 role/marker 选择器，实读核实不锁 DOM 形态）。flux-renderers-content 全量 + flux-core 全量 + playground focused 回归。

## Execution Plan

### Phase 1 - 实修

Status: completed
Targets: diff-demo、event-prevention-demo、diff-view 三文件、flux-core 4 测试

- Item Types: `Proof | Fix`

- [x] Proof：扩展 diff-file-list-a11y.test.tsx no-inline-style 断言至 19 位点（先红实测 1 failed——旧实现 style 非空；覆盖 DiffFileList 子树 ~14 位点，其余 5 位点经审计员逐点实读等价核实——见 m1 勘误）。
- [x] 11-02：diff-demo 原生控件换 ui（Label/Select/Checkbox——均在册，实读核实）。
- [x] 11-04：event-prevention-demo Toggle 换 ui（Label+Checkbox，:62-84，保留 aria 语义）。
- [x] P2-I：16 处静态位点平移 Tailwind（var() 令牌 arbitrary 形态——包内无先例、playground 有：event-prevention-demo.tsx:174-177；注意与 diff-view.css 语义类边界）；3 处条件位点语义转换（data-[active]/hover: 变体）或保留 inline 注记。
- [x] P2-D：3 个低断言测试补足有意义断言（id.test.ts：时间戳前缀容差/长度边界；class-aliases.test.ts：自引用/深链/空别名；instance-path.test.ts：非空透传契约（原假设的帧校验不存在——m2 勘误，按实际契约断言））；round-trip.test.ts 移出候选——实读为 24 场景数据驱动表测（for 循环内 ~27 次断言），高质量非低断言（R1 M3）。

Exit Criteria:

- [x] 判别测试红→绿；flux-renderers-content/flux-core/playground focused 全绿；lint 绿。

### Phase 2 - 回写

Status: completed
Targets: audit-remediation Backlog、cross-roadmap、daily log

- Item Types: `Decision | Proof`

- [x] Backlog 7 行注记（11-03/P2-H 状态同步、11-02/11-04/P2-I/P2-D 实修、P2-C 惯例裁定）；cross-roadmap UR-11 行；daily log。

Exit Criteria:

- [x] 回写三面一致。

## Draft Review Record

- Reviewer / Agent: agent_67349b51（fresh session 独立子 agent，2026-10-17）
- Verdict: `pass-with-minors`（R1 **不通过** 0B/3M/5m → 修订：M1 baseline 改 16 静态 + 3 条件位点如实计数；M2 判别测试点名（扩展 a11y no-inline-style 断言）+ Proof 前置；M3 round-trip 移出候选（24 场景表测非低断言）；m1 Phase 2 全量门禁移除、m2 Item Types 加 Decision、m3 位点 :62-84、m5 arbitrary var() 无包内先例注记——修订方向均系审查员自给，达成共识）
- Rounds: 1
- Findings addressed: M1/M2/M3/m1-m5（见上）

## Closure Gates

- [x] Phase 1 实修落地
- [x] Phase 2 回写三面一致
- [x] 全量门禁无非既有红（最终轮：typecheck 0 非既有错、build 唯 vite.config 既有红、lint 绿、test 唯 playground 3 文件既有登记红、check 唯 knip xlang hit——均既有登记）
- [x] 不存在被静默降级的 in-scope 项（round-trip 移出候选经 R1 M3 实读裁定；P2-C 裁定有 AGENTS.md 原文依据）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_12a8cf1a，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（0 非既有错）
- [x] `pnpm build`（43/44；唯 playground vite.config 既有红）
- [x] `pnpm lint`（绿）
- [x] `pnpm test`（除 playground 3 文件既有登记红外全绿；content 356/356、flux-core 720/720）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-17 收口。UR-11 7 条全闭环：11-02/11-04 实修（原生控件→ui）、P2-I 19 处 inline style 全部转 Tailwind（sweep 判别测试红态实测）、P2-D 3 测试加固（round-trip 移出候选）、11-03/P2-H 状态同步、P2-C 惯例裁定（AGENTS.md 双轨 sanctioned）。

Closure Audit Evidence:

- Auditor / Agent: agent_12a8cf1a（独立 fresh-session sub-agent，2026-10-17）
- Evidence: R1 `issues`（M1 Phase 1 勾选回填 + m1 sweep 覆盖面勘误 + m2 instance-path 勘误；零退回执行项——全部实质工作经审计独立实跑核实：flux-core 720/720、content 356/356、typecheck/lint、既有红登记）→ M1/m1/m2 随批修正 → completed。审计附加价值：m3 用 Tailwind 4.3.3 编译探针实测确认 active 态三变体逐状态等价（非激活 tab 字重 400→500 与新增 hover 背景为已接受微差）；m4 确认 ui Label/NativeSelect 视觉微变方向符合 MANDATORY ui 条款。

Follow-up:

- 无 remaining plan-owned work。
