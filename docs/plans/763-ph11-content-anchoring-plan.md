# 763 PH-11 台账内容锚定推广：QA.7 §C 行号键转内容锚 + 指令沉淀为规则与门禁

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-11（C 组）；指令源头 commit `caf780ed1` + `docs/logs/2026/10-19.md`
> Related: `docs/audits/missing-components/QA.7-residual-debt-register.md` §C；`docs/references/maintenance-checklist.md`（owner doc）

## Purpose

把 `caf780ed1` 的"行号键 → 内容锚定键"指令从两条已迁移的机器基线推广到**全部台账**：现状约束/标识不得以行号为键。本 plan 完成：剩余面迁移（QA.7 §C flake 台账）、指令沉淀为 owner doc 规则、加机械防护门禁防回退。

## Current Baseline

2026-10-26 live（HEAD ~`309a3a567`）实测：

- `caf780ed1`（2026-10-19）已完成：`renderer-metamodel-residue-whitelist.json`（键 `ruleId::path:line` → `ruleId::path::normalizedLineText`）与 `jsdom-pragma-whitelist.json`（`path:line` → 文件级），并声明"其余基线核查无行号键"；行号仅允许出现在**历史审计记录、诊断报告（当前行号）、`ref` 类历史指针**三类位置。
- 复核 `scripts/baselines/*.json` 全部 9 个文件：**约束键**零行号；行号字符串出现在**允许类自由文本**——`renderer-metamodel-residue-whitelist.json` 的 `"ref"`（4 键）与 `"reason"` 字段、`scanner-baselines.json` 的 `"reRegistrationNotes"` 数组（历史登记注记）。**门禁豁免须按键名 allowlist（`ref`/`reason`/`reRegistrationNotes`/`notes` 等历史/裁定文本桶）而非仅 `ref`**，否则当前树必红。
- **剩余面**：`docs/audits/missing-components/QA.7-residual-debt-register.md` §C（flake/watch-only 台账，**现行状态**清单）以 `gantt-bars-and-links.spec.ts:131`、`gantt-demo.spec.ts:69:16` 等 spec:line 标识条目——行号漂移即无法对账（PH-11 动机案例：scada residual 名称失对账）。§A 区的 A-3/A-16 等 `file:line` 属历史审计裁定记录（允许保留）。
- 指令未沉淀：`docs/references/maintenance-checklist.md` 无该规则；无机械防护（未来新台账仍可能行号键控）。
- 新增台账面：plan 762 的 `docs/testing/e2e-baseline-ledger.md` 设计为内容锚定（测试全名）；**落盘后复核**（起草时尚未落盘），若 762 未及落盘则 skip-with-note。

## Goals

- QA.7 §C 条目标识改为**内容锚**（spec 文件 + 测试全名/描述性签名），行号移入"历史观测"括注（允许类）。
- `maintenance-checklist.md` 新增"行号使用规则"节（三类允许 + 台账/约束一律内容锚定 + 迁移先例指针）。
- 新门禁 `check:baseline-line-keys`：①baselines json 只扫**键位置**（对象键 / 标识性字符串值），键名 allowlist（`ref`/`reason`/`reRegistrationNotes`/`notes`）下的自由文本豁免；②QA.7 §C 表的标识列扫任意 `[\w-]+:\d+(:\d+)?` 记号（覆盖 `layout-family:58`、`kanban-perf:34` 等无扩展名形态）。fixture 先红后绿；入 `pnpm check`。
- 复核其余活跃台账（arm2-index、known-good-baselines、e2e-baseline-ledger、两份 invariant catalog）零行号键违例，结论落 plan。

## Non-Goals

- 不改历史审计记录中的行号（允许类）。
- 不重构 QA.7 §A 区的裁定记录表述（历史类）。
- 不扫描 docs/ 全库（logs/audits 历史文件大量合法行号引用；只扫上列表面）。

## Scope

### In Scope

- `docs/audits/missing-components/QA.7-residual-debt-register.md` §C（条目标识改内容锚）
- `docs/references/maintenance-checklist.md`（规则节）
- `scripts/check-baseline-line-keys.mjs`（新）+ fixture 测试 + `package.json` 接线
- roadmap PH-11 回写、daily log

### Out Of Scope

- `docs/logs`、历史 audits、roadmap 行内引用；`docs/architecture/*`

## Failure Paths

| 场景             | 触发                               | 行为                              | 可重试 | 用户可见        |
| ---------------- | ---------------------------------- | --------------------------------- | ------ | --------------- |
| line-keyed-entry | 新台账条目以 `file.ext:123` 作标识 | `check:baseline-line-keys` exit 1 | 是     | `pnpm check` 红 |

## Test Strategy

本档选择：**必须自动化**（门禁交付）。fixture 注入行号键条目 → 红；ref 字段行号 → 绿；QA.7 §C 现行文件 → 绿（迁移后）。

## Execution Plan

### Phase 1 - Proof：fixture 先红

Status: completed
Targets: `scripts/__tests__/check-baseline-line-keys.test.ts`

- Item Types: `Proof`

- [x] 6 用例（合成 fixture，`--file/--mode` 注入）：①baselines 键含 `.ts:123` → 1；②`reason`/`notes` 自由文本含行号 → 0（豁免）；③`ref` 字段 → 0；④§C 标识含 `spec.ts:131` → 1；⑤§C 标识无扩展名 `layout-family:58` → 1；⑥clean → 0。第七条 live 用例 → 0。
- [x] 先红证据：实现前四条违规形态 fixture 按构造即红（检测器不存在，ENOENT）；**执行修订 E（顺序披露）**：QA.7 §C 迁移先于 fixture 定稿完成，live §C 的红态未及捕获——以合成 fixture + live 反向探针（§C 表内临时插 `probe-row:77` → 红，精确还原）替代，判别力等价。

Exit Criteria:

- [x] 先红证据在本节（含顺序披露）。

### Phase 2 - Fix：迁移 + 规则 + 门禁

Status: completed
Targets: QA.7 §C、maintenance-checklist.md、脚本、package.json

- Item Types: `Fix`

- [x] QA.7 §C 三行条目标识改内容锚（spec + 用例描述；行号移入「（历史观测 :N）」括注）——`gantt flake 家族` / `layout-family 断言` / `scada perf rAF 口径` 三行。
- [x] `maintenance-checklist.md` 新增 "Line-Number Usage Rule" 节（三类允许 + 内容锚定义 + 三先例 + 门禁指针）。
- [x] `check-baseline-line-keys.mjs`：baselines JSON 键位置扫描（键名 allowlist `ref`/`reason`/`reRegistrationNotes`/`notes`/`description` 等豁免；键含 `.ext:digits` → 红）+ QA.7 §C 标识列 `name:digits` 记号扫描（仅剥「（历史观测 …）」括注）。**执行修订**：实现过程修了三处自伤（`readFileSync` 未导入被误报 unparseable；全角括号整体剥离导致真违规不可见——改为仅剥历史观测括注；main() 混用 async readFile）。
- [x] `package.json` 接线 `check:baseline-line-keys`（聚合末尾）；`check:wiring-coverage` 绿。
- [x] 反向探针：§C 表内插 `probe-row:77` → 红（`§C identifier still line-keyed`）；精确还原。其余活跃台账复核：机器基线 9 文件零行号键；`e2e-baseline-ledger.md` 尚未落盘（plan 762 并行，skip-with-note，落盘后由 762 closure 复核内容锚定）。

Exit Criteria:

- [x] fixture 6/6；live exit 0；反向探针红。

### Phase 3 - Docs 与回写

Status: completed
Targets: roadmap、daily log

- Item Types: `Fix`

- [x] roadmap PH-11 `todo`→`planned`（draft review R1 fail(2M)→修订）→`done`（closure 同 commit）；daily log（closure 同 commit）。

Exit Criteria:

- [x] `pnpm check` exit 0（见 Closure Gates）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agents `agent_0d3d8410`（R1）、`agent_b665b352`（R2），2026-10-26
- Verdict: R1 `fail`（2 Major / 2 Minor）→ R2 `pass-with-minors`（0/0/3）
- Rounds: 2
- Findings addressed: Major①——baselines 行号字符串实际分布在 `reason`/`reRegistrationNotes` 等自由文本（非仅 `ref`），门禁豁免改按键名 allowlist；Major②——§C 有无扩展名形态（`layout-family:58`/`kanban-perf:34`），探测改任意 `name:digits` 记号 + 2 条先红 fixture；Minor——ledger 未落盘改为条件复核、planned 切换证据、fixture 计数 4→6。R2 三 Minor 已修：①QA.7 括注统一「历史观测 :N」+ 剥离正则放宽；②EXEMPT_KEYS 收敛至声明集合；③Phase-1 顺序披露按其口径补记。

## Closure Gates

- [x] QA.7 §C 内容锚化（3 行）；规则沉淀（maintenance-checklist）；门禁落地且反向验证红（执行者 `probe-row:77` + 审计者 `probe:99`/json 键双探针）
- [x] 其余活跃台账复核结论：机器基线 9 文件零行号键（仅允许类自由文本）；`e2e-baseline-ledger.md` 未落盘（plan 762 并行，skip-with-note，落盘后由 762 closure 复核内容锚定）；known-good-baselines / 两份 invariant catalog / roadmap 快照行为历史或引用类，允许保留行号。
- [x] 无 in-scope 项被静默降级（docs/ 全库扫描 Deferred 有理由）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_ca097c40`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 3 Minor，见 §Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### docs/ 全库行号扫描

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 历史文件行号引用合法（指令明示），全库扫描无法机械区分"历史 vs 现状"——判定属人工审读，非机械门禁可承载。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: "行号键 → 内容锚定键"指令完成全表推广：QA.7 §C 三行条目内容锚化、规则沉淀为 maintenance-checklist 正式节、`check:baseline-line-keys` 机械防护入 `pnpm check`（键位置 + §C 标识列双面，自由文本桶豁免）。机器基线 9 文件本就零行号键（caf780ed1 遗产）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_ca097c40`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 3 Minor）。审计者独立：live scanner exit 0、fixture 6/6、QA.7 diff 恰为 3 行迁移、双反向探针（§C 行 `probe:99` + json 键 `fake.spec.ts:9`）红并还原、`pnpm check` exit 0、checklist 与 EXEMPT_KEYS 对照。3 Minor（plan 豁免清单陈旧 / checklist 桶数与脚本宽松超集不一致 / roadmap 注记陈旧）已在本 closure commit 折入（EXEMPT_KEYS 维持宽松超集，checklist 措辞已注明"含单复数变体"）。

Follow-up:

- no remaining plan-owned work。
