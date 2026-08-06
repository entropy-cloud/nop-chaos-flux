# 1 门禁真实性与审计发现路由收口（P0 workspace-manifest-deps + P1 oversized 基线 + 扫描发现登记）

> Plan Status: completed（draft → active：独立子 agent 审查 pass-with-minors，零 Blocker/零 Major，共识达成；execution → completed：4 Phase 全 completed + 全量验证绿 + closure-audit pass（独立 fresh sub-agent task `ses_02943cfa8ffeXmhE1xS5XyUCE6`，verdict approved，零 Blocker/零 Major，2 Minor 非阻塞），证据见 Closure 节）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-05-0656-open-audit-component-audit.md`（F1 P1：multi-audit 扫描 P0/P1 发现无路由去向、CR/CV/CG 基线断言与 live 门禁矛盾）、`docs/analysis/2026-08-05-multi-audit-component-audit/{01,14,16}.md`（R1 扫描）、`docs/plans/2026-08-06-0329-1-cr-*.md`、`docs/plans/2026-08-06-0329-2-cv-*.md`、`docs/plans/2026-08-06-0343-1-cg-*.md`
> Related: `docs/plans/2026-08-06-0529-2-scan-p1-doc-drift-and-coverage.md`（文档漂移/覆盖修复）、`docs/plans/2026-08-06-0529-3-button-href-security-remediation.md`（button href 安全）；CV（`2026-08-06-0329-2`）依赖本 plan 的门禁基线修正；CR（`2026-08-06-0329-1`）Phase 1 裁决表与本 plan Phase 3 路由登记互见

## Purpose

把 open audit F1（P1）及其包裹的扫描 P0/P1 发现收口到可验证的真实基线：①修复 `check:workspace-manifest-deps` 硬门禁 FAIL（扫描裁定 P0，当前任何 plan 均未认领）；②修正 `check:oversized-code-files` 的基线记录（plan 记 14 文件、live 实为 16 文件，其中 1 个为 mission 自引新命中 coverage-manifest-entries.ts、1 个为 mission 自增命中 wizard-renderer.tsx 734→774）并对这两个命中做拆分；③把 multi-audit 扫描的 P0/P1 发现显式登记进 roadmap/裁决表（含 CR「无 open P1 backlog」断言、CV 基线数字、CG successor 归属三处 plan 文本校正），使 CV 的 full-green 承诺建立在真实门禁状态上。

## Current Baseline

- **workspace-manifest-deps（P0，无 owner）**：`node scripts/check-workspace-manifest-deps.mjs` exit 1，5 条 ERROR（live 复现）：`flux-renderers-form` devDeps 缺 `@nop-chaos/flux-renderers-data`（`dialog-form-submit-refresh-crud.test.tsx:7`）、缺 `@nop-chaos/nop-debugger`（`form-submit-on-submit-success-refresh-nearest.test.tsx:4`）；`flux-renderers-scheduling` devDeps 缺 `@nop-chaos/flux-formula`（`{calendar,gantt,kanban}.create-schema-renderer.test.tsx:5` ×3）。归因：3 个 scheduling 测试创建于 fb4456e4（07-28），2 个 form 测试创建于 e4b4c247/038ba042（07-29/30），均早于 mission 提交（dd59dcd9/4bfffd4d 仅触碰未引入）。
- **oversized-code-files（P1）**：`node scripts/check-oversized-code-files.mjs` exit 1，16 文件 >700 行（live 复现）。CV plan Phase 1 记「14 文件 >700 行（08-04 VERIFY 轮记录在案）」、CG plan Non-Goals 记「14 文件」——数字均与 live（16）不符。其中 **mission 自引新命中**：`tests/e2e/component-lab/coverage-manifest-entries.ts`（816 行，mission C8.2 commit `aa56bd20` 创建，数据区按 `// --- Layout ---` 等分类注释组织，单数组 `COMPONENT_LAB_COVERAGE_MANIFEST`）；**mission 自增命中**：`packages/flux-renderers-layout/src/wizard-renderer.tsx`（mission 前 734 行已超限（`cd4953f3~1` 实测 734 行），C5.1 commit `cd4953f3` 期间增至 774，属 pre-existing 命中被 mission 增长 40 行；导出 `isStepDisabled` + `WizardRenderer`）。其余 14 个为既有超限文件（含 locale 1000+ 行、测试文件等）。
- **CR/CV/CG 断言**：CR plan `:18`「全部 C 阶段 P1 均已同 plan 修复（live 核对：无 open P1 backlog），CR 无 P1 修复义务」——与扫描 P0/P1 存在矛盾；CV plan `:73` 只记 oversized 14 文件、未记 workspace-manifest-deps；CG plan `:37` 把 oversized 治理归「successor」，但未登记 manifest-deps。
- **扫描发现路由状态**：`docs/analysis/2026-08-05-multi-audit-component-audit/` 8 个维度文件（R1 态）落盘后，无任何 plan/roadmap/审计卡引用（全仓 grep 无路由引用）；其中 P0：01-01；P1：01-02（boundaries.md 漂移，与 16-1 同根）、14-1（useDesignerShortcuts 零覆盖）、14-2（oversized gate）、16-2（docs/components/index.md phantom `service` + 遗漏 4 个已注册组件）；P1 候选待 R2 复核：19-1（tree-session success 无 ack 看门狗）、19-2（calendar exportToPNG rethrow + void）、23-1（xui-roles-plugin 死代码）、23-2（gantt 死组件家族）。
- **commit 验证清单**：AGENTS.md 验证清单含 typecheck/build/lint/test，未含 `pnpm check`——mission「full-green」承诺与仓库门禁链脱节（audit F1 第 3 点）。

## Goals

- `check:workspace-manifest-deps` 修复后 exit 0（5 条 ERROR 清零），该 P0 有明确 owner。
- `check:oversized-code-files` 的 mission 自引/自增命中（coverage-manifest-entries.ts、wizard-renderer.tsx）拆分落地；CV/CG 基线记录修正为 live 真实数字；剩余既有超限文件以命名清单显式登记为治理 successor（零静默）。
- multi-audit 扫描 P0/P1（含 P1 候选）全部登记进 roadmap / CR 裁决表，逐条有裁决去向（fix-owner / keep 理由 / defer-other 路径）；CR「无 open P1 backlog」、CV 14 文件、CG successor 三处 plan 文本与 live 一致。
- 扫描 P1 候选（19-1/19-2/23-1/23-2）完成 R2 live 复核并给出路由裁决（修复归 CR 或本计划族、keep 记录、或 successor），零悬挂。
- `pnpm check` 进入 commit/验证清单（AGENTS.md 或等价门禁文档），full-green 承诺口径与仓库门禁链一致。

## Non-Goals

- **不拆分全部 16 个超限文件**：除 mission 自引/自增命中（2 个文件）外，其余 14 个既有超限文件（locale/测试/渲染器等）为 pre-existing 治理债，本 plan 只做真实登记 + successor 归属；全量治理归 future 治理 plan（CG Non-Goals 已有同口径，本 plan 把数字改对）。
- **不修复扫描 P1 候选本身**（19-1/19-2/23-1/23-2）：本 plan 只做 R2 复核 + 路由裁决；修复动作按裁决落入 CR（`2026-08-06-0329-1`）或本计划族其他 plan。
- **不重开已 closed 审计卡**、不做新审计维度。
- **不动 renderer/产品行为**（本 plan 唯一代码落点是 2 个拆分文件 + 2 个 package.json 的 3 条 devDeps）。
- 不重复 `docs/plans/2026-08-06-0529-2-scan-p1-doc-drift-and-coverage.md` 的 boundaries.md / index.md 修复（本 plan 只登记路由，修复在 0529-2）。

## Scope

### In Scope

- 2 个 package.json 的 3 条 devDeps 补齐（form ×2、scheduling ×1）+ `check:workspace-manifest-deps` exit 0 证明。
- `coverage-manifest-entries.ts`（816 行）按数据分类拆 2-3 个数据文件；`wizard-renderer.tsx`（774 行）按 `isStepDisabled` 等纯函数区（约 `:57-140`）+ `WizardStepBody`（约 `:140-188`）+ 主组件边界拆分至 <700 行。
- CV/CG/CR 三处 plan 文本基线校正 + roadmap 扫描发现登记（新增路由登记区或裁决表条目）。
- 扫描 P1 候选 R2 复核 + 路由裁决 + CR plan 吸收机制（确认修复项追加进 CR checklist）。
- AGENTS.md 验证清单补 `pnpm check`（含「已登记 pre-existing red 之外的零新增命中」口径）。

### Out Of Scope

- 其余 14 个既有超限文件的拆分（治理 successor）。
- 扫描 P1 候选的修复实现（本 plan 只做 R2 复核 + 路由；修复按裁决由 CR 执行）。
- button href 安全修复（`2026-08-06-0529-3`）、boundaries.md/index.md 文档修复（`2026-08-06-0529-2`）。

## Failure Paths

> 不适用：本 plan 为静态门禁修复 + 文档登记，无外部 IO/鉴权/错误码契约。门禁脚本自身的退出码即验证面，由 Phase Exit Criteria 覆盖。

## Test Strategy

本档选择：`必须自动化`

- 门禁脚本（`check:workspace-manifest-deps`、`check:oversized-code-files`）是仓库固定规则（plan guide Rule 13 不可降级硬约束），其退出码即自动化验收；Proof 项（先记录 FAIL 状态）先于 Fix 项（guide Rule 12）。
- 拆分文件以「新文件存在 + 门禁脚本不再命中 + 既有测试零回归」为自动化证明。
- 全量 typecheck/build/lint/test 归 Closure Gates。

## Execution Plan

### Phase 1 - workspace-manifest-deps 硬门禁修复（P0）

Status: completed
Targets: `packages/flux-renderers-form/package.json`、`packages/flux-renderers-scheduling/package.json`

- Item Types: `Fix | Proof`

- [x] **Proof**：`node scripts/check-workspace-manifest-deps.mjs` 先红——记录 5 条 ERROR 清单（form ×2、scheduling ×3），作为修复前基线证据写入 daily log。
- [x] **Fix**：`flux-renderers-scheduling` devDeps 补 `@nop-chaos/flux-formula`（workspace:\* 协议）。**form ×2 执行变更（2026-08-06 记录）**：原计划「form devDeps 补 flux-renderers-data + nop-debugger」经 live 验证会闭合 turbo build 图检测的测试-only 双向 devDep 环（data→form、nop-debugger→form 已存在）→ `pnpm build` 硬门禁 FAIL。改为等价且无环的落地：`dialog-form-submit-refresh-crud.test.tsx` 迁至 `flux-renderers-data/src/__tests__/`（CRUD 集成测试归 data 包，data 已 devDep form，方向单向）、`form-submit-on-submit-success-refresh-nearest.test.tsx` 迁至 `nop-debugger/src/`（debugger harness 集成测试，nop-debugger 已 devDep form）；form manifest 零新增 devDep。效果：manifest-deps 同样 exit 0（form 不再有未声明跨包导入），turbo build 图无环。
- [x] **Proof**：`node scripts/check-workspace-manifest-deps.mjs` exit 0；受影响 5 个测试文件局部运行绿（`pnpm --filter @nop-chaos/flux-renderers-form test`、`pnpm --filter @nop-chaos/flux-renderers-scheduling test`）。

Exit Criteria:

- [x] 门禁脚本 exit 0（ERROR 零条）；form/scheduling 包测试全绿。

### Phase 2 - oversized-code-files mission 自引命中拆分与基线修正（P1）

Status: completed
Targets: `tests/e2e/component-lab/coverage-manifest-entries.ts`、`packages/flux-renderers-layout/src/wizard-renderer.tsx`、`docs/plans/2026-08-06-0329-2-cv-*.md`、`docs/plans/2026-08-06-0343-1-cg-*.md`

- Item Types: `Fix | Proof | Decision`

- [x] **Decision（拆分边界确认）**：`wizard-renderer.tsx` 拆分边界——`isStepDisabled`/`computeCanGoTo` 等纯函数区（约 `:57-140`）与 `WizardStepBody`（约 `:140-188`）提取到同目录模块，主组件保留编排逻辑；提取后主体 <700 行（live 结构核对：纯函数区 + 子组件约 130 行可移出，可行）。
- [x] **Fix**：`coverage-manifest-entries.ts`（816 行）按既有 `// --- Layout ---` 等分类注释拆分为 2-3 个数据模块（如按家族分组 `coverage-manifest-entries-{layout,data,form,content,...}.ts`），`coverage-manifest.ts` 消费侧聚合不变（导出面保持单入口或显式记录新入口）。
- [x] **Fix**：`wizard-renderer.tsx` 按 Phase 2 Decision 边界拆分（纯函数/子组件提取到同目录模块）。
- [x] **Proof**：`node scripts/check-oversized-code-files.mjs` 不再命中上述 2 文件；layout 包 + component-lab e2e 相关导入零破坏（`pnpm --filter @nop-chaos/flux-renderers-layout test` + component-lab spec 编译通过）。
- [x] **Fix（基线数字记录）**：以门禁输出为准记录拆分后超限文件清单与数字（预期 14 个既有 + 0 新增），作为 Phase 3 文本校正的数据源；数字记录在案。

Exit Criteria:

- [x] 门禁脚本输出不再含 coverage-manifest-entries.ts / wizard-renderer.tsx（2 个 mission 命中拆分落地）；拆分后超限清单与数字已记录。

### Phase 3 - 扫描发现路由登记与 plan 文本校正（P1）

Status: completed
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/plans/2026-08-06-0329-1-cr-*.md`、`docs/plans/2026-08-06-0329-2-cv-*.md`、`docs/plans/2026-08-06-0343-1-cg-*.md`、`docs/analysis/2026-08-05-multi-audit-component-audit/*.md`

- Item Types: `Fix | Decision`

- [x] **Fix（roadmap 登记）**：`docs/backlog/component-audit-roadmap.md` 新增「扫描发现路由」登记区（或并入 CR Phase Details）：逐条登记扫描 P0/P1 发现（01-01 P0、01-02/16-1 P1、14-1 P1、14-2 P1、16-2 P1 + 待 R2 候选 19-1/19-2/23-1/23-2），每条含来源文件、severity、路由去向（本 plan / `2026-08-06-0529-2` / `2026-08-06-0529-3` / CR / keep / successor），零未分类条目。
- [x] **Fix（CR plan 文本）**：CR plan `:18`「无 open P1 backlog」断言修正——改为「存在扫描 P0/P1 与 P1 候选，路由见 `2026-08-06-0529-1` Phase 3 登记区」；CR Phase 1 裁决表输入补扫描发现（`rg "归 CR"` 之外的新增来源）。
- [x] **Fix（CV/CG plan 文本）**：CV plan Phase 1 `pnpm check` 条目改为「先记录 pre-existing red 真实清单（本 plan Phase 2 产出），再核对新增命中」并引用本 plan；CG plan Non-Goals/Deferred 的 oversized 条目改为引用本 plan 修正后的清单与数字。
- [x] **Fix | Decision（提交验证清单）**：AGENTS.md 验证清单补 `pnpm check`（与现有 typecheck/build/lint/test 并列，口径「已登记 pre-existing red 清单之外的零新增命中」），使 full-green 口径与仓库门禁链一致；记录决策理由（audit F1 第 3 点：mission 自引命中证明「pre-existing red 归类」需以真实门禁输出为准）。

Exit Criteria:

- [x] roadmap 扫描发现登记区存在且逐条有去向（零未分类）；CR/CV/CG 三处 plan 文本与 live 门禁一致；AGENTS.md 验证清单含 `pnpm check`。

### Phase 4 - 扫描 P1 候选 R2 复核与路由裁决

Status: completed
Targets: `packages/flow-designer-renderers/src/tree-session.ts:257-263`、`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:204-206`、`packages/flux-runtime/src/plugins/xui-roles-plugin.ts`、`packages/flux-renderers-scheduling/src/gantt/components/*`

- Item Types: `Proof | Decision | Fix`

- [x] **Proof（R2 复核）**：逐条 live 复核 4 个 P1 候选——19-1（tree-session success 分支不移队首、无 ack 看门狗，对照 `tree-session.test.ts` 有无 success-无-ack 用例）、19-2（calendar exportToPNG `void` + rethrow + `{ok:true}`）、23-1（xui-roles-plugin 是否已从 barrel/exports 可达）、23-2（gantt components 家族是否仍有生产引用）；每条记录复核结论（属实/已修复/环境差异）。
- [x] **Decision（路由裁决）**：按 R2 结论给每条路由裁决——属实 → 归 CR 修复；已修复 → 标记 closed 并附 commit 证据；keep → 记录非阻断理由；裁决写入 roadmap 登记区。
- [x] **Fix（CR 吸收机制落地）**：把 R2 确认「属实且归 CR 修复」的条目**显式追加进 CR plan（`2026-08-06-0329-1`）对应 Phase 的 checklist item**（如 19-2 → CR Phase 3 calendar 清单、23-2 → CR Phase 3 gantt 清单），保证确认的 live defect 有实际执行者而非停留在本 plan 登记区；追加内容记录于 roadmap 登记区。

Exit Criteria:

- [x] 4 条 P1 候选均有 R2 复核结论 + 路由裁决（零悬挂），裁决去向在登记区可查；确认归 CR 的条目已追加进 CR plan checklist（有实际执行者）。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_02c22a1edffe6hOOTe4Em5qKMZ`（round 1，fresh session，`revised`）+ task `ses_02c1b4888ffe1z72vKr7vIDVxA`（round 2，fresh session，`pass-with-minors`，2026-08-06）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: ①Round 1 Major 1（wizard 豁免分支与 Exit Criteria 矛盾）——已删除豁免分支，Phase 2 强制拆分（纯函数区 ~:57-140 + WizardStepBody ~:140-188 提取，live 结构核对 774−130≈644 <700 可行），Goals/Phase 2/Exit/Closure Gates 口径一致；②Major 2（R2 确认修复项归 CR 无交接机制）——Phase 4 新增 Fix 项：确认条目显式追加进 CR plan（0329-1）对应 Phase checklist（19-2→CR Phase 3 calendar、23-2→CR Phase 3 gantt），Deferred 措辞同步；③Major 3（`{2}`/`{3}` 占位符对调）——全部替换为实际 plan 文件名（0529-2=文档漂移、0529-3=button href）；④Round 2 Minor：Non-Goals devDeps 措辞「2 个 package.json 的 3 条 devDeps」、Closure Gate「自引/自增命中」、wizard 归因精度（cd4953f3~1 实测 734 行 pre-existing 自增 40 行）；Round 1 Minors（AGENTS.md 零新增命中口径、Phase 2/3 文本编辑去重、item 类型 Fix|Decision）均已处理。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `check:workspace-manifest-deps` exit 0（P0 修复，5 条 ERROR 清零）
- [x] `check:oversized-code-files` mission 自引/自增命中（coverage-manifest-entries.ts、wizard-renderer.tsx）已拆分；CV/CG 基线数字与 live 一致；剩余超限文件命名清单 + successor 归属已登记
- [x] 扫描 P0/P1（含候选）全部登记进 roadmap 且逐条有路由裁决；CR/CV/CG plan 文本校正落地
- [x] 扫描 P1 候选 R2 复核完成（4 条零悬挂）
- [x] AGENTS.md 验证清单含 `pnpm check`
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs（roadmap、CR/CV/CG plan、AGENTS.md、daily log）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（独立 fresh sub-agent task `ses_02943cfa8ffeXmhE1xS5XyUCE6` verdict approved，证据见 Closure Audit Evidence；本项由 executor 于审计 pass 后 finalization 勾选）
- [x] `pnpm typecheck`（32/32）
- [x] `pnpm build`（32/32）
- [x] `pnpm lint`（32/32）
- [x] `pnpm test`（59/59 task，10,397 passed / 0 failed）

## Deferred But Adjudicated

### 其余 14 个既有超限文件（>700 行）全量拆分

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 均为 pre-existing 治理债（locale 1000+ 行、测试文件、渲染器等），非 component-audit mission 引入；本 plan 已修正记录数字、拆分 mission 自引命中、以命名清单显式登记并归属 successor——不构成「静默吞掉」；gate 的 pre-existing red 由 CV Phase 1「记录真实清单 + 核对新增」机制承载。
- Successor Required: `yes`
- Successor Path: 未来治理/优化 plan（CG plan 已声明同口径 successor，本 plan 提供修正后清单）

### 扫描 P1 候选的修复实现（19-1/19-2/23-1/23-2）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 完成 R2 复核与路由裁决（Phase 4），并把确认「属实且归 CR 修复」的条目显式追加进 CR plan checklist（Phase 4 Fix 项）——确认的 live defect 有实际执行者，不悬挂。
- Successor Required: `yes`
- Successor Path: CR plan（`2026-08-06-0329-1`）按本 plan Phase 4 追加后的 checklist 执行

## Non-Blocking Follow-ups

- 扫描维度文件（`docs/analysis/2026-08-05-multi-audit-component-audit/`）的 R1「待复核」状态回写为「已路由」并指向本 plan 登记区（执行期顺手完成，或在 closure 时核对）。

## Closure

Status Note: completed（2026-08-06 执行完毕——4 Phase 全 completed + closure-audit pass（独立 fresh sub-agent）后收口）：① `check:workspace-manifest-deps` exit 0（5 ERROR 清零：scheduling devDep 补 flux-formula；form 侧 2 个测试迁至 data/nop-debugger 规避 turbo 双向 devDep 环——`pnpm build` 32/32 实证无环，偏差已在 Phase 1 与 daily log 记录）；② `check:oversized-code-files` mission 自引/自增命中拆分落地（coverage-manifest-entries 拆 3 模块 104 条目零变化、wizard-renderer 644 行 + 2 新模块），超限基线 14 既有 + 0 新增（命名清单 daily log）；③ 扫描 P0/P1 + 4 条 P1 候选全部登记 roadmap（零未分类），CR/CV/CG 三处 plan 文本校正 + AGENTS.md 验证清单补 `pnpm check`；④ R2 复核 4 条全部属实 → 追加 CR plan Phase 3 checklist（有实际执行者）；⑤ 全量验证：typecheck/build/lint 32/32、test 59/59（10,397 passed/0 failed）、`pnpm check` 仅 oversized 14 既有 pre-existing red（其余 10 项全绿，零新增）。roadmap 扫描发现路由登记区 + 5 个维度文件复核结论已同步。

Closure Audit Evidence: 独立 fresh sub-agent（task `ses_02943cfa8ffeXmhE1xS5XyUCE6`，2026-08-06）**approved**——① manifest-deps exit 0 + 迁移文件存在 + `pnpm build --force` 32/32 无环 + 偏差双处文档化；② oversized ERROR 恰为 14 既有清单、新模块存在、104 条目对账一致、`isStepDisabled` re-export 保 API；③ roadmap 10 行登记区 + CR/CV/CG 文本 + AGENTS.md 全部 live 核对；④ CR plan Phase 3 追加 4 条与 live 代码逐条对应（tree-session.ts:259-263 / calendar.tsx:224-226 + use-calendar-export.ts:66-74 / xui-roles-plugin 仅自身+测试引用 / gantt components 零生产引用）；⑤ 全量门禁实测复核（32/32 ×3、59/59 10,397/0、check 链仅 oversized 14 既有）；⑥ 一致性核对（4 Phase completed + 全部 [x] + 仅 audit gate 留待本审计、deferred 分类诚实）。零 Blocker/零 Major；2 Minor 非阻塞（daily log wizard 行数 644 vs live 639 计数口径差异；roadmap 01-01 行 form 735 → 已修正为 733）。

Follow-up:

- 扫描 P1 候选 4 条（19-1/19-2/23-1/23-2）修复执行归 CR plan（`2026-08-06-0329-1` Phase 3 追加 checklist）。
- 其余 14 个既有超限文件（>700 行）治理归未来治理/优化 plan（CG Non-Goals 同口径 successor，命名清单见 daily log）。
- 扫描 P2 候选（01-03/14-3/14-4/16-3..16-7/19-3/23-3）维持 roadmap Follow-up Backlog「先补 R2 复核再决定路由」。
