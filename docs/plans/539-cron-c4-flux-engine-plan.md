# 539 Cron 轨道 C4 flux cron 引擎纯模块

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/cron-scheduling-roadmap.md`（工作项 C4）、`docs/components/cron-editor/design.md` §4/§11（schema 与拆分）、`docs/components/cron-editor/golden-vectors.json`（全量契约向量，meta.conventions 为语义权威）
> Related: plan 535（C1 向量）、536（C2 Java 语法）、537（C3 Java 锚点）；TS 侧与 Java 语义不一致时**以 Java 为准修 TS**（roadmap 跨仓对账规则）

## Purpose

把 cron 引擎移植为 flux 侧 TS 纯模块（零 IO、零 React 依赖）：解析 / 序列化 / 诊断 / next-run（含 `L`/`W`/`#` 动态日谓词与可选年段）+ `repeat` 锚点过滤 + `range` 截断 + 频率档位派生 + 预设数据。判别性验证吃 C1 全量黄金向量（nextRun/diagnostics/repeat/range 四节全消费，Proof 先行），为 C5/C6 渲染器与 C7 跨仓对账提供引擎基座。

## Current Baseline

- `packages/flux-renderers-form/src/`：无任何 cron 代码（C1 已 grep 核实）；同型先例 `field-utils/` 子目录 + `__tests__/` colocated 测试。
- `tsconfig.base.json` 已开 `resolveJsonModule`；黄金向量位于 `docs/components/cron-editor/golden-vectors.json`（91 条：nextRun 40 + diagnostics 31 + valueDiagnostics 6 + repeat 7 + range 7），包内测试可经相对路径 import。
- Java 权威语义已定型（plan 536/537）：6/7 段方言、动态日谓词（`L`/`L-n`/`nW`/`LW`/`d#N`/`dL`/单独 `L`=周六）、年段 1970-2099（BitSet 1970 偏移、跳年 dot 重基）、两守卫（366 日扫描 / 4 年 runaway）、周奇偶锚定（week=floor(diff/7)%every）、count 纪元（range.start ?? 1970-01-01）、`impossible`↔runaway 两端不对称（TS parse 级拦截、Java 运行期 runaway）。
- 测试基建：Vitest workspace（turbo 聚合 `pnpm test`）；包内测试用 `@nop-chaos/*` workspace 依赖直接跑。
- 频率档位与预设无任何现存实现（C6 向导的输入面，本计划先落数据与纯函数）。

## Goals

- `packages/flux-renderers-form/src/cron/` 纯模块：`types` / `parse` / `diagnostics`（8 表达式级码 + 2 值对象级码）/ `next-run`（动态日谓词 + 年段 + 两守卫移植）/ `repeat` / `range` / `serialize`（canonical 往返）/ `frequency`（档位派生）/ `presets`（内置预设数据，稳定 id 供 C5/C6 i18n）/ `index.ts` 单一出口。
- 黄金向量四节全对账：nextRun 40（UTC）、diagnostics 31（tsCode + javaValid 口径）、repeat 7、range 7（含 `[]` 与 `expectExhaustedAfter` 终止约定）——TS 实现下全绿。
- L1 单测：序列化往返（对 nextRun 节全部合法表达式——40 条，token 形状超集覆盖 repeat/range 节——parse∘serialize∘parse 幂等）、档位派生规则表、预设数据形状与零诊断、值对象诊断 VD-01~06。
- 时区口径：引擎按**固定偏移分钟数**（缺省 0=UTC）做日历日运算；C5 传浏览器当前 `getTimezoneOffset()` 即够用，跨 DST 边界的预览窗口存在 ≤1h 墙钟漂移（design §12 已记录风险的外延，裁定留 C7）；不引入新日期库（W2b 约束）。

## Non-Goals

- 不建 renderer / definition / i18n 键 / playground 路由（C5/C6）；不改包导出面（`index.tsx` 不引 cron 模块——纯内部 helper，待 C5 接线）。
- 不支持 5 段 Unix、`@` 别名、内联时区（诊断码照 design §4）。
- 不做 DST 切换时刻的精确 wall-clock 解析（固定偏移口径；§12 已记录）。
- 不动 nop-entropy **引擎代码**（Java 侧已收口）；唯黄金向量副本勘误属向量契约同步（须在该仓单独提交，不触任何 Java 源）。勘误落点：dev log 记录 + 两份向量副本就地注记（plan 536 NR-D13 FRL→FRIL 先例路径）。

## Scope

### In Scope

- `packages/flux-renderers-form/src/cron/**`（新建，全文件 ≤500 行红线）
- `packages/flux-renderers-form/src/cron/__tests__/*.test.ts`（向量对账 + L1 单测）
- `docs/backlog/cron-scheduling-roadmap.md`（C4 状态）、`docs/logs/2026/10-07.md`

### Out Of Scope

- `packages/flux-renderers-form/src/index.tsx`、`definitions.ts`、renderers、schemas（C5）
- playground / e2e / coverage manifest（C5）
- quick-reference 文档（C5 随 renderer 一起补）

## Failure Paths

| 场景              | 触发                                                                                        | 行为                                                                                                                                                     | 可重试 | 用户可见              |
| ----------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------- |
| parse-invalid     | 段数/越界/倒置/步进/`?` 错位/`L`·`W`·`#` 错位/非法 token                                    | `parseCron` 返回 `{ok:false, code}`（8 码之一）；不抛异常                                                                                                | 是     | C5 编辑器实时诊断展示 |
| parse-impossible  | `0 0 0 30 2 ?` 等结构性永不匹配                                                             | parse 级返回 `impossible`（error 级拦截，**前置**于运行期——与 Java runaway 不对称，向量已注记）                                                          | 是     | 编辑器报「永不匹配」  |
| next-run-terminal | range end/count 耗尽、impossible、静态漏网的运行期永不匹配（如 `0 0 0 29 2 ? 2027` 非闰年） | 一律 `nextRunAfter` 返回 `null` **不抛异常**（TS 终止约定，对齐向量 conventions「Java -1 / TS null」；Java 侧 runaway 异常口径为引擎层差异，向量已注记） | —      | 预览序列终止          |
| value-invalid     | VD-01~06 值对象级组合                                                                       | `validateCronScheduleValue` 返回对应码；cron 串本身另行 parse                                                                                            | 是     | 区块级错误提示（C6）  |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap C4 明示 Proof 先行）。Proof 形态：Phase 1 先落全部测试（向量对账 + L1 单测），此时 `src/cron/` 模块不存在 → 套件红（import 失败级），红证据留 plan；Phase 2 实现 → 向量四节全绿；Phase 3 档位/预设 + 全量门禁。

## Execution Plan

### Phase 1 - Proof：向量对账与 L1 测试落盘（先于实现）

Status: completed
Targets: `packages/flux-renderers-form/src/cron/__tests__/`

- Item Types: `Proof`

- [x] `golden-vectors.test.ts`：import 黄金向量（相对路径）；nextRun 节逐条（civil 引擎 + UTC、严格递增、`+1s` 种子语义、expectExhaustedAfter→null）；diagnostics 节逐条断言 `parseCron(expr).ok === !tsCodeError` 且 `code === tsCode`（`impossible` 条目含 javaValid=true 的不对称注记断言——TS 侧 parse 即拒）；repeat/range 节经 `fireSequence` 全链路（count 纪元、`[]` 终止、exhausted；执行期定名 fireSequence）
- [x] `serialize.test.ts`：nextRun 节全部合法表达式（40 条，token 形状超集覆盖 repeat/range 节）parse→serialize→parse 幂等（深等）+ canonical 形状用例（月/周名→数字、`?`→`*`、7 段保年、步进/区间保形）
- [x] `value-diagnostics.test.ts`：VD-01~06 六条 + 判别用例（repeat+range.start 回退合法、合法值零诊断）
- [x] `frequency.test.ts` + `presets.test.ts`：先写期望规则表与预设形状（id 唯一、cron 全部零诊断、覆盖 Office 五档代表形）——此两套件在 Phase 3 实现后转绿
- [x] 跑套件记录红证据（模块不存在 → 全部 fail）

Exit Criteria:

- [x] 测试文件就位且套件实跑为红（fail 原因 = 模块缺失），红证据（用例数/失败数）记录于本 plan。实跑证据：`vitest run src/cron` → 4 test files 全 fail（`../index` 模块不存在，no tests collected），golden-vectors/value-diagnostics/serialize/frequency-presets 四套件就位

### Phase 2 - 实现：引擎移植（向量四节转绿）

Status: completed
Targets: `packages/flux-renderers-form/src/cron/parse.ts`、`next-run.ts`、`repeat.ts`、`range.ts`、`serialize.ts`、`diagnostics.ts`、`types.ts`

- Item Types: `Fix`（引擎缺口）+ `Decision`（civil 日历 + 固定偏移时区）。**Decision 补充**：Java Calendar 在固定 UTC 偏移（无 DST）下 add/set 与 civil 历法算术逐秒等价；非 UTC 等价性不在判别范围（固定偏移 Non-Goal）；判别手段 = nextRun 40 条 + repeat/range 全链 UTC 向量

- [x] `types.ts` + `parse.ts`：分词（连续空格合法）/6-7 段预检/字段解析（BitSet 语义集合 + 动态日描述符）/静态 impossible 判定——**作用在物化后 BitSet（含 `a/n` 步进、区间、列表）与允许月集上：min(daySet) > max(各允许月最大天数) → impossible，步进/区间/列表与单值同规则无特判；`#N`≥6、`L-n` 边界（n≥31；月集全 2 月时 n≥29）同前**；AND 日×周组合类永不匹配不在 parse 级拦截（交运行期守卫）；`?` 仅日/周位/月名周名大小写不敏感/0-7 归一。L1 断言钉裁决：`parseCron("0 0 0 30/2 2 ?")` → impossible
- [x] `next-run.ts`（超 500 行时 civil 换算助手拆 `calendar.ts`，可接受偏差）：Java `doNext/findNext/findNextDay` 忠实移植（civil y/mo/d/h/mi/s 结构 + 固定偏移换算 instant；366 日扫描守卫、`year - dot > 4` runaway 守卫、年段 doNext 顶部过滤 + 跳年 dot 重基、`?`→`*`、AND 语义、单独 `L`=周六、W 不跨月、种子命中 +1s）。**nW 探针 lenient quirk 复制**：target 超出当月最大天数时按 Java lenient Calendar 滚入次月口径取星期（首日 + (n−1) 天溢出），不做 clamp；匹配日本身仍不跨月。若认为系 Java bug 亦须先走向量勘误程序再改，不得静默偏离
- [x] `repeat.ts` / `range.ts`：锚点过滤（day 整日差 / week 周奇偶、fire ≥ anchor）+ 截断（start/end 当地日界、count 绝对语义、纪元 range.start ?? 1970-01-01、终止 null）
- [x] `diagnostics.ts`：8 码表达式级 + `validateCronScheduleValue` 值对象级 2 码（VD-01~06 映射、判别顺序 rangeConflict 先于 invertedRange）
- [x] `serialize.ts`：canonical 输出（数字、`*`、7 段保年）+ 往返幂等
- [x] 跑 `pnpm --filter @nop-chaos/flux-renderers-form test src/cron` → 向量四节 + 序列化 + 值诊断全绿（frequency/presets 两套件仍红）

Exit Criteria:

- [x] 黄金向量 nextRun 40 + diagnostics 31 + repeat 7 + range 7 在 TS 实现下全部通过；序列化往返幂等；VD-01~06 通过；步进物化 impossible 断言补落（audit M-1）
- [x] 与 Java 权威的任何不一致按「以 Java 为准修 TS」处置；如发现向量错（需修权威向量）则同步 nop 副本并记录勘误
- [x] 全文件 ≤500 行（`pnpm check` oversized 红线预核）

### Phase 3 - 档位派生、预设数据与全量门禁

Status: completed
Targets: `packages/flux-renderers-form/src/cron/frequency.ts`、`presets.ts`、`index.ts`

- Item Types: `Fix`（C6 输入面缺口）

- [x] `frequency.ts`：`deriveFrequency(cron)` → daily/weekly/monthly/yearly/custom 派生规则（时分秒单值 + 日/周/月形状判定；不可解析 → custom）
- [x] `presets.ts`：内置预设数据（稳定 id：如 hourly / daily-9 / workday-9 / weekly-mon-10 / monthly-last-day-23 / yearly-1-1 等，覆盖 nop 存量形态；label 由 C5/C6 i18n 按 `flux.cron.preset.<id>` 供给）
- [x] `index.ts` 单一出口（模块内 barrel，不接入包主出口）；**至少一个测试从 `../index` 导入**（防 knip unused-file 新增红；执行时预核 `pnpm check`）
- [x] 全量门禁：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check`（零新增红）

Exit Criteria:

- [x] frequency/presets 套件转绿；全量门禁五项通过（与 Closure Gates 同源，此处为终局 Phase 就地复核）。实跑：typecheck/build/lint/test/check 全 exit 0，cron 套件 106/106（含 audit M-1 补钉）；执行期 knip 三处收敛（barrel 收窄到当前消费面 + weekdayOfCivilLenient/FireSequenceResult/CronPreset/ValueDiagnosticCode 转私有）+ parse.ts catch 体正名 diagnostic（audit-suspects 结构化失败路径）
- [x] roadmap C4 行随 plan 生命周期翻转；dev log 记录

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，2 轮）
- Verdict: `pass`（Round 1 fail 3 Major → 修订后 Round 2 pass，零 Blocker/Major/Minor）
- Rounds: 2
- Findings addressed: R1 M-1 Non-Goal 与向量勘误路径矛盾 → 收窄为「不动 Java 引擎代码，向量副本勘误属契约同步」+ 勘误落点；M-2 静态 impossible 作用域未定义 → 物化 BitSet + 允许月集规则 + L1 断言钉裁决；M-3 nW 探针 lenient Calendar 越界 quirk 未记录 → 复制口径条款（偏离须先走向量勘误）；R1 Minor 1-6（civil 等价性论证、运行期守卫 null 终止、Phase 3 门禁同源注记、knip barrel 预核、C5 时区衔接、calendar.ts 拆分留口）全修

## Closure Gates

- [x] 所有 in-scope confirmed contract gaps 已收敛（引擎四节向量对账全绿）
- [x] 行为/契约结果已达成（与 Java 权威语义一致，判别向量钉定）
- [x] 必要 focused verification 已完成（Proof 先行红→绿证据链）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract gap
- [x] 受影响的 owner docs 已同步（roadmap C4 行；dev log；无新增 architecture 变更——design §11 拆分与实现一致即可）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增红）

## Deferred But Adjudicated

（无——执行中未推翻任何计划内条目；审计 R2 的重编号 538→539 属并行会话撞号避让，非推翻）

## Non-Blocking Follow-ups

- range.ts GUARD 边界（end-only + 逐秒 cron 静默截断）已注释声明，后继渲染器如需高频无 start 场景把枚举起点钳到 afterMs（C7 收口候选，audit R1 Mn-4 裁定 non-blocking）

## Closure

Status Note: TS cron 引擎纯模块交付且与 Java 权威五处语义抽查（doNext/findNext/findNextDay 移植与两守卫、nW lenient 探针、周奇偶锚定 RP-04、count 纪元 RG-04/07、静态 impossible 物化规则）全部一致；黄金向量 91 条四节 + L1 共 106/106 全绿；五门禁 full-green。closure audit 三轮（R1 issues 1M+4Mn → R2 issues 1M+2Mn → R3 approved）全部收敛；roadmap C4 随本收口翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，3 轮）
- Evidence: R1 issues（M-1 `30/2` 钉裁决断言缺失 + 4 Minor）→ R2 issues（M-2 Mn-2 修复声称未落盘 + Mn-5 重编号残渣/Mn-6 计数陈旧）→ R3 approved（grep 零残留 + 106/106 + check/lint exit 0 独立复跑）；审计独立实证五处语义对照与 knip 零新增红。

Follow-up:

- no remaining plan-owned work（C5 渲染器接线 cron 模块并按需扩 barrel；C7 宿主映射示例）
