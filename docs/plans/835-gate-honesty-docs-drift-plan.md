# 835 门禁工具诚实性与文档漂移收口（deep-audit 2026-11-01 G2-G6、D1-D3）

> Plan Status: active（停滞：立项 2026-11-01 后未动工；收口归属见 docs/logs/2026/11-10.md，plan 864 G4 勘注）
> Last Reviewed: 2026-11-01
> Source: `docs/audits/deep-audit-2026-11-01.md` §6（G2-G6、D1-D3）
> Related: plan 820（门禁红收敛前序）、`docs/logs/`（check 链登记口径）

## Purpose

让静态门禁的输出与退出码一致、不因扫描输入缺失而静默空转、不残留一次性脚本；并修复文档断链与类型签名遗漏。

## Current Baseline

- **G2**：`scripts/check-oversized-code-files.mjs:118-131,155-157`——所有超限文件均豁免时仍打印 `ERROR: 3 files exceed 700 lines (MUST split)` 后 exit 0（2026-11-01 `pnpm check` 实测输出）；unreadable 文件 `countLines` 返回 -1 被静默跳过（:91-93）。
- **G3**：`scripts/check-i18n-keys.mjs:349`（动态 key map 正则失配 `continue` 无告警）、`:446-448`（`SCAN_DIRS` 每项 `catch {}` 吞目录缺失；当前 `SCAN_DIRS = ['packages','apps']` 均存在）——目录改名/导出改名后门禁静默空转仍绿。
- **G4**：`scripts/check-scanner-baselines.mjs`——`BASELINED_SCANNERS` 定义于 :19-34，但 evaluate（:42）与 check 模式（:122）遍历的是**基线文件的 keys**：新加入 `BASELINED_SCANNERS` 而未入基线的 scanner 不设防。`--update-baselines` 在 scanner 无可解析 "Found" 行时可写入 `count: null`；null 在比较中被强转为 0（`5 > null === true`）——正计数会以"exceeds registered baseline null"的误导信息报红，零计数 scanner 则带着损坏基线静默通过，基线损坏本身无从察觉。当前 14 项均为数值（潜伏）。
- **G5**：`scripts/check-duplicates.mjs:116` `if (!inputIndex)` 条件反写（正常 gate 路径提示永不打印）；`:70-76` jscpd 失败被吞、报告目录未预清。
- **G6**：一次性/迁移完成脚本残留：`scripts/inspect-flow-node-html.mjs`、`scripts/rename-to-kebab-case.mjs`、`migrate-jsdom-to-happy-dom.mjs`、`validate-happy-dom-migration.mjs`、`scan-jsdom-usage.mjs`、`split_amis_schema*.py`——仅被 knip 白名单引用。删除前逐个 grep 确认零引用（package.json、scripts、docs、tests）。
- **D1**：`docs/index.md:119` 引用 `analysis/echarts-migration-analysis.md`——该文件**存在且被 git 跟踪于仓库根** `analysis/`（同目录另有 crud 两份），只是相对 `docs/` 解析失败；同行另引 `missions/echarts-integration.json`（仓库根相对）；`docs/index.md` 另有约 10 处同类仓库根相对的 `missions/*.json` 引用（:116-121 等）——同一断链类，一并修正。
- **D2**：`docs/references/quick-reference.md` 类型签名遗漏：`events` 缺 `| undefined`（renderer-core.ts:204）、`RendererHelpers.dispatch` 缺 `CompiledActionProgram`（:75-89）、`executeSource` options 缺 `signal`、`FormRuntime.validateField/validateForm` 缺 `options?: { signal? }` 与 `subscribeToModelGeneration?/setRefreshHandler/refresh()`（runtime.ts:534-585）、`RendererResolvedProps` 实为 `Omit<Partial<RemoveIndexSignature<S>>,…>`（:93-97）。
- **D3**：`packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:23` 注释 `长 按`（全角空格笔误）。

## Goals

- 门禁输出与退出码/语义一致；扫描输入缺失即红。
- `scripts/` 无一次性残留；文档断链与签名遗漏清零。

## Non-Goals

- 不改变任何门禁的阈值与判定规则本身（只修输出诚实性与空转面）；不动 `docs/` 超长治理（owner plan 784）。

## Scope

### In Scope

- G2-G5 修复 + 各一条行为测试（scripts/**tests**）；G6 删除（零引用证实后）+ knip 基线收缩；D1-D3 修复。

### Out Of Scope

- 门禁规则/阈值调整；docs 容量治理。

## Failure Paths

不适用：工具与文档修正。

## Test Strategy

建议有测：门禁脚本行为用 `scripts/__tests__` 覆盖（fixture 输入 → 期望输出/退出码）。

## Execution Plan

### Phase 1 - 门禁输出与空转面（G2-G5）

Status: planned
Targets: `check-oversized-code-files.mjs`、`check-i18n-keys.mjs`、`check-scanner-baselines.mjs`、`check-duplicates.mjs`、`scripts/__tests__/`

- Item Types: `Proof | Fix`

- [ ] Fix（G2）：全豁免时输出 `INFO: N files exceed limit — all exempt`；unreadable 文件计为 error 或显式警告（不得静默跳过）
- [ ] Fix（G3）：`SCAN_DIRS` 缺失目录 → exit 1 列出路径；动态 map 正则零命中 → 警告（正则常量名列入输出）
- [ ] Fix（G4）：evaluate/check 模式遍历 `BASELINED_SCANNERS`，缺基线或基线为 null/非数值 → 显式配置红（报"baseline missing/corrupt"而非强转比较）；update 模式拒写 null。fixture 测试按实际语义写：旧实现下 null 基线 + 零计数 scanner 静默通过、新实现报配置红
- [ ] Fix（G5）：`inputIndex < 0`；jscpd 失败打 stderr 且非零退出；报告目录调用前清空
- [ ] Proof：每项一条 fixture 测试（旧行为下断言失败），接入既有 `pnpm test:scripts`

Exit Criteria:

- [ ] 四条脚本测试在 `pnpm test:scripts` 下通过且反向验证
- [ ] `pnpm check` 全链绿且 oversized 段落输出为 INFO 形态（本 Phase 改的正是 check 链脚本本身，故以全链实跑为退出口径，属 Rule 18 例外）

### Phase 2 - 脚本残留与文档漂移（G6、D1-D3）

Status: planned
Targets: 上述 6 个脚本、`knip-baseline.json`、`docs/index.md`、`quick-reference.md`、`calendar-week-view.tsx`

- Item Types: `Fix | Proof`

- [ ] Proof（G6）：逐个 grep **live 面**（根与各包 package.json、`scripts/`、`tests/`、`.github/`、`packages/*/src`、`apps/*/src`；排除 `docs/archive/`、`docs/logs/`、`docs/audits/` 及 completed plans 等历史记录——Rule 21 不改写历史）确认零引用后删除；同步收缩 knip 基线对应行（surgical hand-edit，不 `--update-baselines`）
- [ ] Fix（D1）：`docs/index.md` 中所有仓库根相对、相对 `docs/` 不可解析的路径引用（`analysis/…`、`missions/*.json` 等）改为可解析的 `../…` 形式；先以脚本列出全部此类引用再逐条修正，修正后同一脚本复跑零命中
- [ ] Fix（D2）：quick-reference 按上列 live 签名补齐五处
- [ ] Fix（D3）：`长 按` → `长按`

Exit Criteria:

- [ ] live 面 `git grep`（同上范围）无残留脚本文件名引用；`pnpm check:knip`（或 check 链中的 knip 段）绿
- [ ] quick-reference 五处与 live 签名一致（对照 renderer-core.ts/runtime.ts 行号）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_7b1e414b-a5ef-4092-8a55-0869d00660e2；round-2 agent_bf31b1ae-56cb-47bc-bf01-09bd5cb8d6e4）
- Verdict: pass（round-1 fail：3 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，2 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 D1 文件实存于仓库根 `analysis/`→改路径修正（并扩至 docs/index.md 同类仓库根相对引用）；Major-2 G4 机制纠正（null 强转 0：正计数误导性报红、零计数静默通过）；Major-3 G6 grep 限定 live 面（Rule 21 不改写历史记录）。

## Closure Gates

- [ ] G2-G6 全部落地；D1-D3 全部修复
- [ ] 门禁脚本行为测试接入并反向验证
- [ ] 不存在被静默降级的 in-scope 缺陷
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待填写
- Evidence: 待填写

Follow-up:

- 待收口填写
