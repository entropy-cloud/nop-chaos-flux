# 624 包清单与基线卫生（deep-audit 2026-10-16 findings D2-D5 + B5）

> Plan Status: completed
> Last Reviewed: 2026-10-17
> Source: docs/analysis/2026-10-16-deep-audit-report.md §4/§3-B5（依赖卫生 + 基线收缩）
> Related: scripts/baselines/knip-baseline.json、scripts/baselines/scanner-baselines.json、docs/plans/00-plan-authoring-and-execution-guide.md

## Purpose

peer/devDep 背书补齐（隔离安装脆弱面）、三处版本漂移对齐、knip/scanner 基线收缩（ratchet 重新收紧）、死依赖逐项裁决——包清单与门禁基线回到"声明即真实"状态。

## Current Baseline

- D2（2026-10-17 live 复核确认）peer/devDep 不对称 5 包 13 项：
  - `flux-bundle`：peers `@nop-chaos/ui`（**workspace peer**）/`i18next`/`react-i18next`/`recharts`/`zustand` 无 devDep 背书（devDeps 已有 echarts/react/react-dom/lucide-react）。**注意**：bundle src 对 i18next/react-i18next/recharts/zustand 零 import（`@nop-chaos/ui` 仅 index.test.tsx:31 字符串出现）——背书属"隔离安装健壮性"性质，Phase 1 落地后会产生 ~4-5 个新 knip unused-devDependencies hits（历史上基线 3 条漂移条目正是同类），须在 Phase 2 逐条登记豁免理由。
  - `flux-renderers-scheduling`：peers `html2canvas`/`ical.js`/`jspdf`/`xlsx` 无 devDep。**消费面拆分**：仅 `html2canvas` 有真实 import（`src/shared/html2canvas-loader.ts:13` 动态 + `src/calendar/hooks/use-calendar-export.test.ts:3` 静态）；`ical.js`/`jspdf`/`xlsx` 零 import（R2 复核）——背书属纯 peer 声明健壮性，落地后各产生 1 个新 knip unused-devDependencies hit，同上登记。
  - `flux-i18n`：peer `react` 无 devDep（仅 @types/react）。
  - `ui`：peers `react`/`react-dom` 无 devDep。
  - `tailwind-preset`：peer `tailwindcss` 无 devDep（devDeps 空；`src/index.ts:1` 有 tailwindcss type import——背书不会产生 knip hit）。
- D3 版本漂移 3 处：recharts（bundle peer `^3.8.0` vs data/ui/word-editor `^3.8.1`）；lowlight（content `^3.1.0` vs ai `^3.0.0`）；@types/qrcode（content `^1.5.6` vs print-core `^1.5.5`）。
- D4 基线卫生：`check-knip-baseline` 实测 **107 条可收缩**（R2 复核明细：85 exports + 18 types + 1 dependency + 3 devDependencies）；3 条 flux-bundle devDep 漂移条目（指向已删 manifest 依赖）含于其中；header 双重失同步——叙文 unlisted=30 vs counts.unlisted=35、counts.exports=430 vs exports 列表实长 429。**门禁现状红**：`check-knip-baseline` 当前 exit 1——新 hit `apps/playground/package.json#@nop-chaos/flux-xlang-lang`（并发会话 plan 621 Phase 2 引入，归其收口流程）。scanner-baselines：discover-audit-suspects 基线 737 vs 实测 727（可收缩 10）；lastUpdated 2026-10-15。
- D5（R2 复核勘正）死依赖候选：
  - `flux-renderers-mobile` 的 `@nop-chaos/flux-react` dep **有真实引用**——`src/test-support.ts:7` 转出口 `@nop-chaos/flux-react/test-support`（createMockRendererProps），被包内 8 个测试文件消费；live knip 已不再报它，基线的 dependency 条目（唯一一条）恰在 107 可收缩内——预期裁决 = **保留 dep + 收缩基线条目（历史 false-positive 勘误）**。
  - root devDeps 五项：`i18next`/`react-i18next`（zero 引用候选）；`three`/`@types/three`（唯一消费 = `scripts/three-perf/bench-scene-graph.mjs`，该 script 本身是 knip registered unused file；playground 自带 three/@types/three——root 删除安全，若连带删 script 可再收缩一条 files 基线）；`@stryker-mutator/vitest-runner`（`audit:mutants` 经 `stryker.runtime.conf.mjs` `--plugins` 真实加载——预期保留 + 豁免登记；`@stryker-mutator/core` 经 stryker bin 使用、knip 本就不报，**不在本 plan 五项清单内且不得顺手删**）。
- 既有 known-deferred：playground unlisted deps（CQ-S17 → cq-6 Phase 5）——本 plan 不动。
- 运行前置：manifest 变更需 `pnpm install` 刷新 lockfile（触及全局 node_modules——执行前核对并发会话静默）。Phase 1 新增 devDep 均已有 lockfile 解析（R2 复核：html2canvas@1.4.1/ical.js@2.2.1/jspdf@2.5.2/xlsx@0.18.5 可解析，其余为工作区在用版本）——install 风险低。

## Goals

- 13 项 peer 全部获得 devDep 背书；消费面差异（真实 import vs 纯声明背书）在基线登记中分别留痕。
- 3 处版本漂移收敛为单一区间（取超集/主导区间）。
- knip 基线收缩：以 `npx knip --reporter json` 程序化 diff 为准（107 条起点 = 85+18+1+3，含 3 条漂移条目），**外科手编**（禁 `--update-baselines` 全量重照）；header 双重同步（叙文/counts/列表实长）；Phase 1 新增 hits 逐条登记豁免。
- scanner-baselines audit-suspects 737→727（手编单值）。
- D5 逐项裁决零悬空（mobile 预期保留+收缩条目；root 五项各自裁决）。
- 收口时 `check:workspace-manifest-deps` 绿；`check:knip-baseline` 绿（含或显式处置并发会话名下的 `playground#@nop-chaos/flux-xlang-lang` hit）；`check:scanner-baselines` 绿且更紧。

## Non-Goals

- 不动 playground unlisted deps（CQ-S17 既有 successor）。
- 不动 xlang 域（并发会话领地）；不代为处置其 knip 新 hit（登记归属，若收口时仍未处置则该门禁条目按"显式处置"记录后收口）。
- 不做依赖版本升级（仅区间对齐）；不重构 peer 策略。
- 不删 `scripts/three-perf/bench-scene-graph.mjs`（除非 D5 three 裁决连带需要，且单独留痕）。

## Scope

### In Scope

- `packages/flux-bundle/package.json`、`packages/flux-renderers-scheduling/package.json`、`packages/flux-i18n/package.json`、`packages/ui/package.json`、`packages/tailwind-preset/package.json`（devDep 背书 + 区间对齐）
- `packages/flux-renderers-content/package.json`、`packages/flux-renderers-ai/package.json`、`packages/flux-print-core/package.json`（lowlight/@types/qrcode 区间对齐）
- `scripts/baselines/knip-baseline.json`、`scripts/baselines/scanner-baselines.json`（收缩 + 双重同步）
- `packages/flux-renderers-mobile/package.json`（裁决对象——预期保留）、根 `package.json`（D5 五项裁决）

### Out Of Scope

- 其余 38 包 manifest；peerDependencies 语义策略；apps/\* 清单；lockfile 手工编辑；xlang 域及其 knip hit 本体处置

## Failure Paths

| 场景             | 触发                          | 行为                                   | 可重试 | 用户可见表现      |
| ---------------- | ----------------------------- | -------------------------------------- | ------ | ----------------- |
| install-break    | devDep 新增引发 peer 解析冲突 | 回退该条、记录冲突、逐条重放定位       | 是     | install 报错      |
| baseline-overcut | 收缩误删仍活跃条目            | check 门禁红即回滚该条（门禁即判别器） | 是     | check 红          |
| dep-still-used   | 死依赖删除后脚本/构建失败     | 恢复 + 记录真实消费点                  | 是     | build/script 报错 |

## Test Strategy

建议有测：manifest/基线变更无单测面，验证 = `pnpm install` 成功 + `pnpm typecheck`/`pnpm build`（解析面）+ 三 check 门禁 + focused 包测试（scheduling html2canvas 动态 import 路径）。

## Execution Plan

### Phase 1 - peer 背书与版本对齐（D2、D3）

Status: completed
Targets: 8 个 package.json + pnpm-lock.yaml

- Item Types: `Fix`、`Decision`

- [x] D2：5 包 13 项 devDep 背书补齐（区间取工作区主导值；消费面分类注记：真实 import = html2canvas/tailwindcss(type)/react 系背书，纯声明背书 = bundle i18next/react-i18next + scheduling ical.js/jspdf/xlsx）
- [x] D2 [Decision]：flux-bundle 的 `@nop-chaos/ui` workspace peer——**初裁移除后经验证链改判恢复**：移除使 `src/index.test.tsx` 的 host-owned-peers 契约测试红（toMatchObject 精断言 `'@nop-chaos/ui': 'workspace:*'`——该 peer 是有意钉死的宿主自理契约，非冗余）。**终裁 = 恢复 peer + devDep `workspace:*` 背书**（契约与卫生同时满足）；背书 devDep 使原 `flux-bundle#@nop-chaos/ui` 基线条目重新验证为有效（非新增条目——peer-backing 终态计数 6）
- [x] D3：recharts bundle peer `^3.8.0`→`^3.8.1`；lowlight 统一 `^3.1.0`（ai dep+dev）；@types/qrcode 统一 `^1.5.6`（print-core）
- [x] `pnpm install` 刷新 lockfile（clean，无新增 peer 警告）；`pnpm --filter @nop-chaos/flux-renderers-scheduling test` 1084/1084 绿（html2canvas 动态 import 路径）

Exit Criteria:

- [x] 5 包无 "peer 无 devDep" 项（脚本化核对全 packages：unbacked peers = NONE——bundle ui peer 终裁为恢复+背书）
- [x] 三处漂移依赖全 workspace 单一区间（recharts ^3.8.1 / lowlight ^3.1.0 / @types/qrcode ^1.5.6）
- [x] scheduling focused 测试绿（1084/1084）；install 无新增 peer 警告
- [x] 预期方向登记：实测新增 knip unused-devDependencies hits = **6**（bundle i18next/react-i18next + scheduling ical.js/jspdf/xlsx + ui peer 终裁恢复后的背书条目重验证；bundle recharts/zustand 未被 flag——机制登记为基线事实），Phase 2 已逐条登记（含 Decision 改判的第 6 条终态计数）

### Phase 2 - 基线收缩与新增 hit 裁决（D4 + B5 + Phase 1 交互）

Status: completed
Targets: `scripts/baselines/knip-baseline.json`、`scripts/baselines/scanner-baselines.json`

- Item Types: `Fix`

- [x] 收缩度量：fallback 度量执行（`npx knip --reporter json` 程序化 diff 同一身份逻辑）——首遍实测可收缩 106 = 85 exports + 18 types + 1 dep + 2 devDeps；**【closure R1 勘误】原"两次收缩"叙述算术有误——实际为单次 diff：devDeps 移除共 3（root i18next / root react-i18next / bundle flux-i18n）+ 新增 5，HEAD 基线 16 → 终态 18**
- [x] 外科手编 knip-baseline.json：删除 106 条（含 mobile `@nop-chaos/flux-react` dependency 条目——与 D5 裁决联动 + notes 勘误）；**未运行 `--update-baselines`**（手编 + reRegistrationNotes 留痕）
- [x] Phase 1 新增 5 hits 逐条登记入基线 devDependencies + reRegistrationNotes 豁免理由（隔离安装背书性质）
- [x] header 三重同步：counts.\* = 列表实长（exports 429→344、devDeps 16→18——closure R1 勘误：原记 19→17 有误，HEAD 实为 16）、叙文 unlisted 30→35、description 禁用 --update-baselines 指引
- [x] scanner-baselines：audit-suspects 737→727（单值手编）；lastUpdated 2026-10-17 + re-registration note
- [x] `check-scanner-baselines` 绿（within baseline）；`check-knip-baseline` 状态 = **唯一红为 `apps/playground#@nop-chaos/flux-xlang-lang`**（并发会话 plan 621 Phase 2 引入，归属/处置路径已登记于基线 notes——按 Closure Gate 显式处置条款）

Exit Criteria:

- [x] 两基线文件无"指向已不存在 manifest 依赖"条目；counts/叙文/列表实长三者一致（exports 344/devDeps 18 与列表核对——closure R1 勘误）
- [x] `check-scanner-baselines` exit 0，audit-suspects = 727（ratchet 收紧生效）
- [x] Phase 1 新增 5 hits 全部登记豁免理由（零悬空）
- [x] `check-knip-baseline` 状态明确：唯一红 = xlang hit，归属与处置路径已登记（并发 plan 621 收口流程）

### Phase 3 - 死依赖裁决（D5）

Status: completed
Targets: `packages/flux-renderers-mobile/package.json`、根 `package.json`

- Item Types: `Decision`

- [x] `flux-renderers-mobile` 的 `@nop-chaos/flux-react` dep：引用面核实（`src/test-support.ts:7` 转出口 + **14 个测试文件**消费——本会话复核，多于 R2 的 8）→ **保留**；基线 dependency 条目已收缩（Phase 2 联动）+ reRegistrationNotes false-positive 勘误（原条目登记于 e2111786c，转出口 c11731169 晚于登记）
- [x] root devDeps 逐项核：`i18next`/`react-i18next` 零引用（repo-wide grep）→ **已删**（manifest + lockfile + 基线条目随单次 diff 移除——closure R1 勘误：原记"二次收缩 19→17"算术有误）；`three`/`@types/three` → **保留**（唯一消费 `scripts/three-perf/bench-scene-graph.mjs` 手动基准工具——删 root 声明会破坏该 script；script 处置归独立 follow-up 裁决，留痕）；`@stryker-mutator/vitest-runner` → **保留**（audit:mutants 真实加载）+ 基线条目留置；`@stryker-mutator/core` 未动（经 stryker bin 使用）
- [x] **批量删除后一次性验证链**：`pnpm install`（5.8s clean）→ `pnpm typecheck` 80/82 + `pnpm build` 43/44（唯一红均为 playground vite.config Excessive stack depth **既有红**——10-16 log stash 验证 master 同红，本 plan diff 不含该文件）→ 三 check 门禁（manifest 绿/scanner 绿/knip 唯一 xlang hit）

Exit Criteria:

- [x] 每个候选有明确裁决与判别证据（删 2 = 零引用 grep + 验证链绿；留 3 = 引用面记录）
- [x] mobile 裁决与 Phase 2 基线收缩联动一致（保留 dep + 条目移除 + notes 勘误）
- [x] 验证链一次通过（唯红为文档化既有红，归属披露）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_ccd7556c（fresh session，R1 + R2 两轮）
- Verdict: R1 fail（0 Blocker / 4 Major / 6 Minor，全量修订）→ R2 **pass**（0B/0M/0 actionable Minor）
- Rounds: 2
- Findings addressed: M1 knip 门禁现红（playground#@nop-chaos/flux-xlang-lang，并发会话引入）入基线披露 + fallback 度量法（knip --reporter json diff）+ Closure Gate 措辞改"绿或显式处置"；M2 mobile dep 有真实引用（test-support 转出口 + 8 消费点）——裁决方向反转为保留+收缩条目+勘误；M3 scheduling 消费面拆分（仅 html2canvas 真实 import，3 项纯声明背书 + 预期 knip 登记）；M4 Phase 1 新增 devDep 的 knip 交互显式化（预期 ~7-8 hits + Phase 2 逐条裁决项）；m5 header 双重同步（exports 430 vs 实长 429）；m6 双脚本禁用 --update-baselines（先例 09ed6e5b6）；m7 Goal 算术勘正（3 漂移条目含于 107）；m8 three/@types/three 耦合注记（script 单消费 + playground 自带）；m9 stryker 保留预期 + @stryker-mutator/core 不得顺手删声明；m10 批量删除单次验证链

## Closure Gates

- [x] 所有 in-scope 项落地（Phase Exit Criteria 全勾）
- [x] `check:workspace-manifest-deps` 绿
- [x] `check:knip-baseline` 绿，或唯一红为并发会话名下 xlang hit 且归属/处置路径已登记（显式处置）——**实测：唯一红 = apps/playground#@nop-chaos/flux-xlang-lang，归属 plan 621 Phase 2，登记于基线 reRegistrationNotes**
- [x] `check:scanner-baselines` 绿（audit-suspects ratchet 737→727）
- [x] `pnpm install --frozen-lockfile` 校验通过（163ms）
- [x] `pnpm typecheck`（80/82；唯一红 = playground vite.config 既有红，归因披露）
- [x] `pnpm build`（43/44；同一既有红，归因披露）
- [x] `pnpm lint`（44/44 绿）
- [x] `pnpm test`（单测全量：80/82 任务绿，唯一红 = playground 4 项，归因并发 db67dba02——plan 623 收口时已归因披露；其余包与 registered 基线一致）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 当日 daily log 已记录

## Deferred But Adjudicated

### D1 playground unlisted deps（CQ-S17）

- Classification: `watch-only residual`（既有登记）
- Why Not Blocking Closure: 已有 successor 归 cq-6 Phase 5，hoisting 兜底现状可用
- Successor Required: `yes`
- Successor Path: cq-6 Phase 5（既有记账，不新增 plan）

## Non-Blocking Follow-ups

- `scripts/three-perf/bench-scene-graph.mjs` 的处置（unused file 候选——删否独立裁决，连带 files 基线收缩）
- flux-bundle peers 是否长期保留（echarts/recharts/zustand 直出面）——独立 peer 策略讨论
- scada-editor-perf ×3 未裁决阈值失败（plan 623 移交）——独立裁决归 watch-only 台账或修复

## Closure

Status Note: 2026-10-17 收口。13 项 peer 背书 + 3 处版本对齐 + knip 基线收缩（106 条外科手编 + 6 条 peer-backing 登记 + header 三重同步）+ scanner ratchet（737→727）+ D5 死依赖裁决（删 2 留 3）全部落地。执行中的一个中途改判（ui peer 移除→验证链抓到契约测试红→终裁恢复+背书）被验证链按设计捕获并如实记账——验证链即判别器的价值实证。closure audit 两轮：R1 issues（2M 文本算术/日志未记改判 + 2m）→ 勘误 → R2 **approved**。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_d35d8011（fresh session，R1 + R2 两轮）
- Evidence: R1 issues（Major 1 基线 devDeps 算术与实况漂移；Major 2 daily log 未记 ui peer 改判；2 Minor）→ 四处勘误 → R2 **approved**（0B/0M；门禁独立复跑：manifest-deps 0 / scanner 0 / knip 唯一 xlang hit 与披露一致 / frozen-lockfile 164ms；基线三重同步程序化验证；Decision 改判叙事记录为真；diff 无 apps//src 越界）。R2 残留一项非阻塞观察：基线 notes[2] 的"registers here"措辞未同步（修正权威文本在 plan；append-only 台账不改历史条目）。
