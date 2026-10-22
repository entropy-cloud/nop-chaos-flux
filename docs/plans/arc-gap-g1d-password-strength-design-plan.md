# Arc Gap G1D — `input-password` 强度指示（`showStrength`）协议设计

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G1 / §6 Wave 1 G1D / §7 G1D（roadmap work item G1D，`todo`）
> Related: `missions/arc-component-gap.json`（commitFormat：`feat(arc-component-gap): <description>`）

## Purpose

把 G1D 收口为：`showStrength` 协议在 owner doc（`docs/components/input-password/design.md`）定稿，登记进 `existing-components-improvement-analysis.md`，命名过 `docs/references/naming-conventions.md` §5 checklist。本计划是纯文档计划（不写产品代码），为 G1I（实现 plan）提供唯一契约事实源。

## Current Baseline（live 实测 2026-10-22，worktree `arc-component-gap` @ 58aeec3d7）

- `docs/components/input-password/design.md:24` 决策表行：密码强度指示 **暂不实现**；`:40`：**能力预留**——"后续如果增加 strength，优先使用 `showStrength` 这类直接语义字段"；`:63`：密码强度规则优先通过验证或辅助渲染层接入。
- `revealPassword` 先例（E2a-bis 已落地）：字段加在共享 `InputSchema`（`packages/flux-renderers-form/src/schemas.ts:67`），field rule 加在 `inputEnhancementFieldRules`（`packages/flux-renderers-form/src/renderers/input.tsx:71`），**仅 input-password renderer 消费**（`input.tsx:139`）；reveal toggle 渲染在 InputGroup inline-end addon（`input.tsx:210-226`，`data-slot="input-password-reveal"`），end addon 顺序 suffix → counter → clear → reveal（`design.md:68`）。
- i18n 走 `t()`（`@nop-chaos/flux-i18n`），既有 key 先例 `flux.common.showPassword`/`flux.common.hidePassword`（`packages/flux-i18n/src/locales/zh-CN.ts:40-41`、`en-US.ts:39-40`）。
- ui 包无 `StrengthMeter`/`Meter` primitive（live `rg` 零命中）；本设计**不触碰** `packages/ui/src/index.ts`（避开 ask-first 保护区域）。
- Arc 对照（`~/sources/arc-library/registry/components/password-strength/password-strength.tsx`，live 实测）：4 段 meter + 五级词 `tooShort/weak/fair/good/strong` + 本地规则计分 + 规则勾选清单 + motion 动效。
- `markdown`/`chart` 等无关联；本项不涉依赖新增（零新 npm 依赖）。

## Goals

- `docs/components/input-password/design.md` 承载完整 `showStrength` 契约：字段定义、等级划分算法、颜色语义、a11y 语义、与 `pattern`/校验链的关系、DOM marker、不采纳项（对齐 Arc 对照的裁决）。
- `docs/components/existing-components-improvement-analysis.md` 完成能力扩展登记（含 plan 交叉引用）。
- 命名 pass：`showStrength` 过 `naming-conventions.md` §5 checklist 并留核对记录（本 plan『命名 Checklist 核对记录』节）。
- G1I 可仅凭 design.md + 本 plan 无歧义实现。

## Non-Goals

- 不写任何产品代码 / 测试代码（G1I 的事）。
- 不引入 zxcvbn 等熵计算依赖（零新依赖；规则计分即可）。
- 不做 Arc 的规则勾选清单 UI、motion 动效（无 motion 引擎，违背 §5.4 动效边界）。
- 不改 `packages/ui/src/index.ts`（无新 primitive；强度条为 renderer 包内自绘）。
- 不定制化等级阈值/文案的 schema 面（首版固定，同 reveal icon 先例 `design.md:80`）。

## Scope

### In Scope

- `docs/components/input-password/design.md` 更新（决策表 flip、schema 字段、状态归属、样式/DOM/a11y、风险节）。
- `docs/components/existing-components-improvement-analysis.md` 登记。
- 本 plan 内留命名 checklist 核对记录。

### Out Of Scope

- `docs/references/quick-reference.md`、`docs/index.md`、playground example（交付铁律 3/5/6 归 G1I）。
- schema-file-validator / capability manifest 扩展评估（G1I 如触达则按其 plan 处理）。

## Failure Paths

| 可测场景编号          | 触发                           | 行为（设计语义）                                                                         | 可重试 | 用户可见表现      |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------- | ------ | ----------------- |
| strength-non-password | input-text 声明 `showStrength` | schema 层不阻止（同 `e2abis-reveal-non-password` 先例），仅 input-password renderer 消费 | 是     | 无强度条渲染      |
| strength-empty-value  | 值为空                         | 强度条整体不渲染（无 `No password yet` 态，区别于 Arc）                                  | 是     | 无强度条          |
| strength-with-error   | 值同时触发校验错误             | 强度条与错误链互不干扰：input `aria-describedby` 仍归 field frame 错误链所有             | 是     | 强度条 + 错误并存 |

## Test Strategy

档位选择（三选一）：`必须自动化 / 建议有测 / 不适用：理由`

本档选择：`不适用：纯文档计划，无行为变更`（G1I 承担自动化测试）。

## Execution Plan

### Phase 1 — `showStrength` 协议定稿（owner doc 更新）

Status: completed
Targets: `docs/components/input-password/design.md`

- Item Types: `Decision`

- [x] §2 决策表行"密码强度指示"由 `暂不实现` flip 为 **实现**：`showStrength: true` 启用强度条（boolean，肯定式命名，预留字段转正）
- [x] §2 决策表补不采纳行：Arc 规则勾选清单 UI（组合层职责，非 renderer 最小能力）、motion 动效（无动效引擎，§5.4）、熵计算依赖（零新依赖硬门禁）
- [x] §4 schema：`showStrength?: boolean` 加在共享 `InputSchema`，仅 input-password renderer 消费（revealPassword 同款先例）；声明"等级阈值/文案首版不做 schema 化"
- [x] 协议核心写定：**等级算法**（本地确定性规则计分——输入域全域定义：值为空 = 不渲染；非空且长度 < 6 = level 0 太短；否则 level = max(1, 满足计数)，计数四条目：长度 ≥ 8 / 同时含小写与大写字母 / 含数字 / 含符号（非字母数字字符），计数 0–4 → level 钳位落在 1–4，无未定义输入域）；**meter 解剖**（固定 4 段；填充段数 = max(1, level)——level 0 与 level 1 同为 1 段填充、由等级词与 `aria-valuenow` 区分；所有填充段统一取当前 level 的颜色；`aria-valuemin=0`、`aria-valuemax=4`、`aria-valuenow=level`）；**颜色语义**（等级 → 既有语义 token 工具类：level 0–1 `bg-destructive`、level 2 `bg-warning`、level 3–4 `bg-success`——与 `packages/theme-tokens/src/styles.css` `--destructive/--warning/--success` 族对应，同 `alert-renderer.tsx:19-21` 语义色用法，禁原始色板色号）；**a11y**（meter 容器 `role="meter"` + 上述 aria 三值 + `aria-valuetext`=等级词；**不改** input 的 `aria-describedby`——该链归 field frame 错误引用所有（`cx11-consumer-contract-pins.test.tsx:101-115` 已 pin），强度条以 DOM 顺序紧随输入框成为可及读出，裁决理由写入 design.md）；**与校验关系**（强度条是纯展示反馈，不参与校验、不阻塞提交、不写表单值；强度策略强制走 `pattern`/`validate`）
- [x] §7 状态归属：强度等级为渲染期派生值（value 的纯函数），非 local state、非表单值
- [x] §9 数据源/表达式节：在"密码强度规则优先通过验证或辅助渲染层接入"原句处补指向说明（强度条 = 纯展示辅助渲染层；强制策略走 `pattern`/`validate`），消除"暂不实现"时代残留句的歧义
- [x] §10 样式/DOM：marker `nop-input-password-strength`（容器，widget 自绘）+ `data-slot="input-password-strength-segment"`（段，aria-hidden）+ `data-slot="input-password-strength-label"`（等级词）；渲染位置 = 输入框（组）下方整行；五级 i18n key 定稿 `flux.common.passwordStrength`（meter 的 `aria-label`，不可见）+ `passwordStrengthTooShort/Weak/Fair/Good/Strong`（等级词，供 label 与 `aria-valuetext`；zh/en 词表：密码强度/太短/弱/一般/良好/强；Password strength/Too short/Weak/Fair/Good/Strong）

Exit Criteria:

- [x] design.md 六处（§2/§4/§7/§9/§10/§12）与上述协议逐条一致，无 "Proposed vs Current" 残留（直接写最终设计）
- [x] §2 决策表包含对 Arc 对照的采纳/不采纳裁决且各附理由
- [x] 协议四要素（等级/颜色/a11y/校验关系）齐备且相互无矛盾

### Phase 2 — 登记与命名 pass

Status: completed
Targets: `docs/components/existing-components-improvement-analysis.md`

- Item Types: `Decision | Proof`

- [x] §7.1 工作项表"第 2 批：P1 表单与表面"新增登记行（G1 / arc-component-gap 来源标注 + `showStrength` 强度指示 + input-password），附 ✅ 设计完成标记与本 plan 交叉引用（Decision）
- [x] 命名 pass：`showStrength` 过 `naming-conventions.md` §5 checklist（布尔肯定式 ✓ / 非 amis 词汇 ✓ / 通道 = props ✓ / 无平行词汇 ✓ / 无组件级请求 ✓），核对记录写入本 plan『命名 Checklist 核对记录』节（Proof）
- [x] 勘误指针：roadmap §7 G1D"命名 pass（`naming-conventions.md` §2）"行内指针勘误为 §5（§5 才是"新增字段审查 Checklist"操作节；closure 回写时按"前提就地勘误"规则在 roadmap 原文处附注）（Decision）
- [x] G1I 输入核对：design.md + 本 plan 足以无歧义实现（字段、算法、i18n key、DOM 契约、测试断言面齐备）（Proof）

Exit Criteria:

- [x] improvement-analysis 登记行存在且指向本 plan 与 roadmap G1
- [x] 命名 checklist 九项逐项有结论（本 plan『命名 Checklist 核对记录』节）
- [x] grep 全仓无第二处 strength 契约定义（单一事实源 = design.md，live 复核 2026-10-22：packages/apps 下 `showStrength|passwordStrength` 仅 design.md 与本 plan 命中）

## Draft Review Record

- Reviewer / Agent: 独立子 agent R1（fresh session `agent_df1dd732`，general-purpose，review-only）；R2（fresh session `agent_13af9b9a`）；R3（fresh session，见下）
- Verdict: R1 `revised`（0B/2M/5Minor）→ 修正；R2 `revised`（0B/1M/2Minor）→ 修正；R3 见末条
- Rounds: 3（R1 revised → 修正 → R2 revised → 修正 → R3）
- Findings addressed:
  - R1-Major-1 等级算法未定义输入域（count=0 无落点、"含大小写"歧义）→ 算法改为"非空且长度 < 6 = level 0；否则 level = max(1, 满足计数)"，"同时含小写与大写字母"消歧，全域定义无缺口
  - R1-Major-2 颜色语义用原始色板色号（amber/lime/emerald）违背 token 纪律（theme-tokens 仅有 --success/--warning/--destructive 族；alert-renderer.test 有 pinned 拒绝）→ 改挂既有语义 token：level 0–1 `bg-destructive`、level 2 `bg-warning`、level 3–4 `bg-success`
  - R1-Minor-1 补 `## Draft Review Record` 节（本节）
  - R1-Minor-2 `flux.common.passwordStrength` 消费点指明 = meter 的 `aria-label`（不可见）
  - R1-Minor-3 Phase 2 登记行 item type 改 `Decision`（分组 `Decision | Proof`）
  - R1-Minor-4 roadmap §7 G1D "§2" 指针勘误列为执行项（closure 回写时就地附注）
  - R1-Minor-5 Test Strategy 补模板两行格式
  - R2-Major-1 meter 段数与 level 0 可视编码未定义 → 钉死 meter 解剖：4 段、填充数 = max(1, level)、填充段统一当前 level 色、aria-valuemin=0/max=4/now=level
  - R2-Minor-1 指针统一：三处"Closure 证据节"改指『命名 Checklist 核对记录』节
  - R2-Minor-2 design.md §9 残留句补指向说明，列入 Phase 1 执行项
  - R3（fresh session `agent_6e79a3f0`）**`pass`**（0 Blocker / 0 Major / 1 Minor）：meter 解剖与算法/颜色/a11y 四要素互洽（全 level 推演无矛盾）；R2 修正全落地；引用对账全数命中。R3-Minor-1（Phase 1 Exit 枚举漏 §9）已顺手修正为"六处（§2/§4/§7/§9/§10/§12）"。共识达成，plan 升 `active`。

## Closure Gates

> 纯文档计划：`pnpm typecheck`/`build`/`lint`/`test` 条目按 guide 模板规则删除。

- [x] Phase 1 / Phase 2 Exit Criteria 全部 `[x]`
- [x] 受影响 owner docs（input-password/design.md、improvement-analysis）已同步且无内部矛盾
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无——本计划无执行中改判）

## Non-Blocking Follow-ups

- （无）

## Closure

Status Note: 2026-10-22 关闭。Phase 1/2 全部 Exit Criteria 经独立 closure audit（fresh session，review-only）逐条 live 核对成立：design.md 六处协议落点、improvement-analysis 登记行双向交叉引用、命名九项、单一事实源 grep 复核；audit 零 Blocker 零 Major，verdict `approved`。4 项 Minor 均不阻塞、随 G1I 消化（design.md:13 "已落地"措辞在 G1I 文档同步时改写；算法"长度"读法由 G1I 测试按 JS `.length` 钉死；熵计算理由归类位置；容器 data-slot 超集属 repo 惯例）。roadmap §2 G1D 同 commit 回写 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session `agent_41290a2e`，general-purpose，review-only）
- Evidence: closure audit 报告（本会话审计记录）：逐 Exit Criteria / Gate PASS 表（design.md:13/24/40-48/63/72/79-80/89、improvement-analysis:234、roadmap:40/:218）、等级算法全域推演表、颜色 token 与 aria pin 测试核验、17 个 [x] 全部对账命中；verdict `approved`（0 Blocker / 0 Major / 4 Minor）

Follow-up:

- （无剩余 plan-owned work；实现归 G1I）

## 命名 Checklist 核对记录（Phase 2 产出，2026-10-22）

`showStrength` 过 `docs/references/naming-conventions.md` §5 九项：

1. **shadcn 对齐** ✓ —— ui 无等价 strength prop/primitive（live rg 零命中）；字段名沿用 `input-password/design.md:40` 既定预留（"直接语义字段"），非 amis 词汇。
2. **受控词表** ✓ —— 无新增 schema 枚举值（强度等级是渲染期派生展示，不入 schema 面）。
3. **布尔肯定式** ✓ —— `showStrength`（非 `notWeak`/`hideStrength` 类否定式）。
4. **选项形状** ✓ —— 不适用（无选项集字段）。
5. **不采纳记录** ✓ —— Arc 规则勾选清单 UI、motion 动效记入 design.md §2 决策表"不采纳"列并附 Flux 理由。
6. **通道归属** ✓ —— `props` 通道（field rule `kind: 'prop'`，与 `revealPassword` 同款）；条件渲染走既有 `when`，无散落条件属性。
7. **无平行词汇表** ✓ —— 无 `strengthExpr`/`strengthHandler` 类平行命名；无组件级请求字段。
8. **出处可查** ✓ —— 字段出处 = design.md 能力预留行；颜色出处 = `theme-tokens` `--destructive/--warning/--success` 族 + `alert-renderer.tsx:19-21` 语义色先例。
9. **词汇三单源** ✓ —— 不适用（非事件/ownership/行键字段）。
