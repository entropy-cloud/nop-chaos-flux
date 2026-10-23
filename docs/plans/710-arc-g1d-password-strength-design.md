# 710 Arc G1D — input-password 强度指示设计（`showStrength` 能力扩展协议）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G1 / §7 G1D（roadmap item G1D，`todo`）
> Related: `docs/components/input-password/design.md`、`docs/components/existing-components-improvement-analysis.md`、`docs/references/naming-conventions.md`

## Purpose

产出 `input-password` 强度指示（`showStrength`）的**设计协议**并完成登记链：等级划分、配色语义、i18n 文案、a11y（`aria-describedby`）、与 `pattern`/校验链的关系、DOM marker。本 plan 只做设计与登记（纯 docs），不改任何代码；实现归 G1I。

## Current Baseline（live 核对 2026-10-24）

- `docs/components/input-password/design.md:40` 已预留："后续如果增加 strength，优先使用 `showStrength` 这类直接语义字段"；`:24` 决策表"密码强度指示：暂不实现"。
- `revealPassword` 已由 E2a-bis 落地（`InputGroup` inline-end addon、`data-slot="input-password-reveal"`），强度指示的落位可对照该先例（addon 子元素顺序：suffix → counter → clear → reveal）。
- ui 无 StrengthMeter primitive（roadmap §4 live `rg` 零命中）；G1I 若新增 ui primitive 触 `packages/ui/src/index.ts` ask-first（本 plan 不触碰）。
- `existing-components-improvement-analysis.md` 无 strength 登记（live grep 零命中）。
- 命名基线 `naming-conventions.md`：明确布尔用肯定式（`clearable`/`searchable` 先例），`showStrength` 符合。
- 仓库无密码强度第三方依赖；本设计禁止引入新依赖（评分用 renderer 内规则实现）。

## Goals

- `input-password/design.md` 落定 `showStrength` 完整协议：schema 字段、四档等级与评分规则、配色语义、文案与 i18n key、a11y 接线、与校验链的关系声明、DOM marker 与 addon 位置、失败路径。
- 决策表 `:24` 行"暂不实现"就地翻转为"已设计（G1D），实现归 G1I"，并注明能力扩展（非新 type）裁决。
- `existing-components-improvement-analysis.md` 登记 strength 能力扩展条目（指向本 plan 与 design.md）。
- 命名 pass：`showStrength` 及全部新增 schema 字段对照 `naming-conventions.md` §1/§2 逐条过审，结论写入 design.md。

## Non-Goals

- 不写任何实现代码（renderer 字段接线、ui primitive、测试均归 G1I）。
- 不引入第三方强度评分库（zxcvbn 等）；不引入新动效。
- 不改 `input-text`/`input-email` 共享行为（字段进共享 `InputSchema` 与否按 design.md 既有先例裁决，但不改变其他 type 行为）。
- 不动 `packages/ui/src/index.ts`。

## Scope

### In Scope

- `docs/components/input-password/design.md` 协议章节 + 决策表翻转。
- `docs/components/existing-components-improvement-analysis.md` 登记条目。
- `docs/references/quick-reference.md` live 核实无 `input-password` 条目（零命中）——走 Deferred 归 G1I 交付铁律 5，本 plan 不改。
- roadmap §2/§6 G1D `todo`→`done` 回写（closure 同 commit）。

### Out Of Scope

- G1I 全部实现面；matrix 增行（能力扩展不触 matrix）；其他 roadmap 线。

## Failure Paths

| 编号                       | 触发                               | 行为                                                          | 可重试 | 用户可见表现          |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------- | ------ | --------------------- |
| strength-no-value          | 输入框为空                         | 不渲染强度条（或渲染空轨道，按设计裁决），无等级文案          | 是     | 仅密码框              |
| strength-with-pattern-fail | 强度高但 `pattern` 校验失败        | 两者独立：强度条照常显示，校验错误走既有 form validation 展示 | 是     | 强度条 + 校验错误并存 |
| strength-disabled-readOnly | `meta.disabled` / `props.readOnly` | 强度条只读展示（随当前值），不阻断                            | —      | 静态强度条            |

## Test Strategy

不适用：纯设计/文档 plan，无行为变更。G1I 承担 focused 单测 + e2e（Test Strategy: 必须自动化）。

## Execution Plan

### Phase 1 — 协议设计与 design.md 落稿

Status: completed
Targets: `docs/components/input-password/design.md`

- Item Types: `Decision`

- [x] 设计并写入 `showStrength` 协议章节：字段定义（`showStrength?: boolean`）、四档等级（weak/fair/good/strong）、规则评分（长度 + 字符类别组合，纯 renderer 内规则，不引依赖）、每档配色语义（`--warning`/`--success`/`--destructive`/`--secondary` 等语义 token，按仓库 token 实况取，禁止 raw emerald/amber 类——badge/button-status 测试已强制状态色走 token）、文案 i18n key（`flux.common.*` 嵌套 camelCase 风格，先例 `flux-i18n/src/locales/en-US.ts:39-40` `showPassword`/`hidePassword`）、a11y（强度条 `aria-describedby`/`aria-live` 接线、`<input>` 与 meter 关联）、与 `pattern`/required 校验链独立性的声明、DOM marker（`data-slot="input-password-strength"`）与 addon 位置（input 下方独立行 vs addon 内，给出裁决与理由）。
- [x] 决策表 `:24` "暂不实现"行翻转为"已设计，实现归 G1I"，写明能力扩展（非新 type）裁决与 roadmap G1 出处。
- [x] §7 运行期状态归属补 strength 条目（评分纯派生、无 local state 写入表单值）。

Exit Criteria:

- [x] design.md 含完整协议章节，四档/评分/配色/i18n key/a11y/marker 全部落定，无"待定"占位。
- [x] 决策表行与 §4/§9 旧表述（`:13`、`:24`、`:40`、`:63`、`:77`）一致更新，无自相矛盾残留。

### Phase 2 — 登记与命名 pass

Status: completed
Targets: `docs/components/existing-components-improvement-analysis.md`、`docs/references/quick-reference.md`

- Item Types: `Decision | Proof`

- [x] improvement-analysis 登记 strength 条目（能力扩展、owner=input-password、设计出处链接）。
- [x] 命名 pass：逐字段对照 `naming-conventions.md` §1/§2，结论段写入 design.md（含被拒命名如 `strengthIndicator`/`passwordStrength` 的排除理由）。
- [x] quick-reference 处置：live 已核实无 `input-password` 条目 → Deferred 归 G1I（无悬空）。

Exit Criteria:

- [x] improvement-analysis 出现 strength 条目且链接可达（路径/锚点真实存在）。
- [x] design.md 含命名 pass 结论段；quick-reference 处置已落定（改或 Deferred 二选一，无悬空）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `pass`（零 Blocker / 零 Major / 3 Minor，全部当场采纳：token 措辞改语义 token 并禁 raw emerald/amber、quick-reference 处置写死 Deferred、i18n key 锚定 `flux.common.*` 先例）
- Rounds: 1
- Findings addressed: 3 Minor 全部采纳（不阻塞项，见上文对应修订）

## Closure Gates

> 纯文档 plan（无代码变更），`pnpm typecheck/build/lint/test` 条目按 guide 规则删除。

- [x] design.md 协议完整、内部一致，与 live repo 事实（token、i18n 风格、InputGroup 先例）核对相符
- [x] improvement-analysis 登记与命名 pass 落地
- [x] roadmap §2/§6 G1D `todo`→`done` 回写（与 closure 证据同 commit）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

### quick-reference `showStrength` 条目

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `docs/references/quick-reference.md` live 核实无 `input-password` 条目（审查 R1 已核实零命中），无既有条目可补；交付铁律 5 明确归 G1I 实现时登记。
- Successor Required: `yes`
- Successor Path: G1I（arc-component-gap roadmap 下一 work item）

## Non-Blocking Follow-ups

- G1I 实现时的交付铁律面（example、manifest/quick-reference/index、i18n 实键、e2e）归 G1I plan。

## Closure

Status Note: G1D 三要素（§4a/§4b 协议设计、improvement-analysis E2a-ter 登记、命名 pass）全部落地；closure audit 首轮 approved（0B/0M/2m，Minor 均为格式级并已当场修复：§12 重复行删除、§5 双空行清理）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-24）
- Evidence: approved（零 Blocker）：§4a 协议完整性（design.md:41-78）、决策表翻转（:24）、E2a-ter 登记（improvement-analysis:234）、token/i18n 先例 live 复核（styles.css:45-84、en-US.ts:39-40）、quick-reference 零命中核实、声称-实况逐条对账 PASS。审计 Minor 2 条已在 closure commit 修复。
