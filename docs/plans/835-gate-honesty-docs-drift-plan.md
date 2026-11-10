# 835 门禁工具诚实性与文档漂移收口（deep-audit 2026-11-01 G2-G6、D1-D3）

> Plan Status: completed（closure audit approved；见 Closure Audit Evidence）
> Last Reviewed: 2026-11-11
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

Status: completed（G2-G4 脚本修复已在 commit 62422620a（2026-11-05 gate honesty hardening）落地于 HEAD 祖先；本 plan 执行会话（2026-11-11）核对覆盖面、补齐反向验证红证据并实跑验证；G5 由前一会话（2026-11-10/11）完成）
Targets: `check-oversized-code-files.mjs`、`check-i18n-keys.mjs`、`check-scanner-baselines.mjs`、`check-duplicates.mjs`、`scripts/__tests__/`

- Item Types: `Proof | Fix`

- [x] Fix（G2）：全豁免时输出 `INFO: N files exceed limit — all exempt`（live 实测 `INFO: 3 files exceed 700 lines — all exempt`，exit 0）；unreadable 文件（countLines -1）计入 `UNREADABLE_FILES` → ERROR + exit 1，ENOENT（工作区已删 tracked 文件）按非门禁关注跳过。证据：live 实跑 + commit 62422620a diff
- [x] Fix（G3）：`SCAN_DIRS` 缺失目录 → exit 1 列出路径（`CHECK_I18N_SCAN_DIRS=packages,apps,renamed-away` 实测 exit 1，stderr 列 `renamed-away`）；动态 map 正则零命中 → 警告含常量名（check-i18n-keys.mjs:350-354）
- [x] Fix（G4）：check 模式经 `missingEntries`（requireAll）覆盖 BASELINED_SCANNERS 未登记项（"baseline missing"）；null/非数值基线报 "baseline corrupt" 不强转（live 实测 null → exit 1）；update 模式无可解析计数拒写（exit 1）。证据：live 实跑 + check-scanner-baselines.test.ts
- [x] Fix（G5）：`inputIndex < 0`；jscpd 失败打 stderr 且非零退出；报告目录调用前清空（前一会话完成；红证据 `_tmp/audit-1106/835-red.log` 首段 3 failed → 修复后 6 passed `_tmp/audit-1106/835-green.log`）
- [x] Proof：每项一条测试接入 `pnpm test:scripts`（G2 check-oversized-code-files.test.ts、G3 check-i18n-keys-scan-roots.test.ts、G4 check-scanner-baselines.test.ts null/missing 两例、G5 check-duplicates.test.ts 3 例；反向验证见「执行中裁决」G2-G4 条）

Exit Criteria:

- [x] 四条脚本测试在 `pnpm test:scripts` 下通过且反向验证（2026-11-11 实跑 213 passed | 2 skipped；反向红证据 `_tmp/audit-1106/835-red.log` 追加段：pre-fix 脚本 @62422620a~1 一次性 worktree 实跑——G2 全豁免仍 "MUST split" ERROR + exit 0、G3 apps 改名后 exit 0 静默、G4 null 基线 "within baseline" exit 0，三者均使现行测试断言失败）
- [x] `pnpm check` 全链绿且 oversized 段落输出为 INFO 形态（2026-11-11 实跑 exit 0，`:19` 行为 INFO 形态；日志 `_tmp/audit-1106/835-check-final.log`）

### Phase 2 - 脚本残留与文档漂移（G6、D1-D3）

Status: completed（前一会话 2026-11-10/11 完成，本会话逐项抽查核验）
Targets: 上述 6 个脚本、`knip-baseline.json`、`docs/index.md`、`quick-reference.md`、`calendar-week-view.tsx`

- Item Types: `Fix | Proof`

- [x] Proof（G6）：8 个一次性脚本已 `git rm`（inspect-flow-node-html / rename-to-kebab-case / migrate-jsdom-to-happy-dom / validate-happy-dom-migration / scan-jsdom-usage / split_amis_schema×3）；knip 基线收缩 counts.files 21→16 + 数组 5 行删除（surgical hand-edit，附登记 note）。2026-11-11 复查：live 面 git grep（排除 docs/archive|logs|audits|plans、\_tmp、knip 基线本身）6 个名字合计唯一残 hit 为 `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md:240` 对 scan-jsdom-usage 的历史叙述性提及（描述当年漂移事实，非 live 引用，Rule 21 不改写）
- [x] Fix（D1）：`docs/index.md` 断链修正（analysis/echarts-migration、missions/\*.json 及 Directory Roles 节 context/audits 相对引用）；修正前 9 条不可解析（`_tmp/audit-1106/835-d1-before.log`），修正后同脚本复跑 "all path references resolve"（`835-d1-after.log`；2026-11-11 复跑一致）
- [x] Fix（D2）：quick-reference 补齐（events `| undefined`、dispatch `CompiledActionProgram`、executeSource `signal`、validateField/validateForm `options?: { signal? }`、subscribeToModelGeneration/setRefreshHandler/refresh、RendererResolvedProps 改 `Omit<Partial<RemoveIndexSignature<S>>,…>` 并注明 helper 出处）。2026-11-11 抽查与 live 一致（renderer-core.ts:204/:81-89、form-runtime.ts:337/:422、runtime-owned-factories.ts:31）
- [x] Fix（D3）：`长 按` → `长按`（calendar-week-view.tsx:23；2026-11-11 复核 grep `长按` 三处注释均为正常全角词）

Exit Criteria:

- [x] live 面 `git grep`（同上范围）无残留脚本文件名引用（见 G6 条复查证据）；`pnpm check:knip`（check 链内 knip-baseline 段）绿（2026-11-11 `pnpm check` exit 0）
- [x] quick-reference 五处与 live 签名一致（对照 renderer-core.ts / form-runtime.ts 现行路径；原 plan 所记 runtime.ts:534-585 行号已因文件重组漂移，以 live 符号核对为准）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_7b1e414b-a5ef-4092-8a55-0869d00660e2；round-2 agent_bf31b1ae-56cb-47bc-bf01-09bd5cb8d6e4）
- Verdict: pass（round-1 fail：3 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，2 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 D1 文件实存于仓库根 `analysis/`→改路径修正（并扩至 docs/index.md 同类仓库根相对引用）；Major-2 G4 机制纠正（null 强转 0：正计数误导性报红、零计数静默通过）；Major-3 G6 grep 限定 live 面（Rule 21 不改写历史记录）。

## Closure Gates

- [x] G2-G6 全部落地；D1-D3 全部修复（见 Phase 1/2 Status 与「执行中裁决」）
- [x] 门禁脚本行为测试接入并反向验证（test:scripts 213 passed；反向红证据 `_tmp/audit-1106/835-red.log`）
- [x] 不存在被静默降级的 in-scope 缺陷（两处无 fixture 的残余分支已在裁决节披露并经源码核对）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`（收口会话统一跑；本会话已跑 scheduling 包 typecheck 通过）
- [ ] `pnpm build`
- [ ] `pnpm lint`（本会话已跑 scheduling 包 lint 0 error）
- [ ] `pnpm test`
- [x] `pnpm check`（2026-11-11 全链实跑 exit 0；`_tmp/audit-1106/835-check-final.log`）

## Deferred But Adjudicated

### 执行会话 1（2026-11-10/11，前一会话）

- **G5**（落地）：check-duplicates.mjs `inputIndex < 0` 修正、jscpd 失败 stderr + 非零退出、报告目录预清空；check-duplicates.test.ts 扩 3 例（红证据 `_tmp/audit-1106/835-red.log` 首段 3 failed → 修复后 `835-green.log` 6 passed）。
- **G6**（落地）：8 个一次性脚本 git rm（清单见 Phase 2）+ knip 基线 surgical 收缩（counts.files 21→16，附登记 note）；删除前 grep-before 证据 `_tmp/audit-1106/835-g6-grep-before.log`，2026-11-11 复查零 live 引用（唯一残 hit 为 docs/analysis 历史叙述性提及）。
- **D1**（落地）：docs/index.md 9 条仓库根相对断链修正；scan 脚本 `_tmp/audit-1106/835-d1-scan.mjs`，before/after 证据 `835-d1-before.log` / `835-d1-after.log`。
- **D2**（落地，部分已被 plan 856/857/864 期间改动覆盖）：quick-reference 按现行 live 签名补齐六处（含 RendererResolvedProps 语义修正）；本会话逐项对照 live 符号核实一致。
- **D3**（落地）：`长 按`→`长按`。

### 执行会话 2（2026-11-11，本会话）

- **G2-G4 覆盖面裁决**：三脚本修复与测试已在 commit 62422620a（2026-11-05，"gate honesty hardening"，plan 820/856 期间的前序 hardening）落地于 HEAD 祖先，非本 plan 立项后的新改动。本会话裁决为**按 plan 验收口径补齐证据**而非重写：(a) live 实跑三 gate 逐条确认行为符合本 plan Fix 条目原文；(b) 以 62422620a~1 一次性 worktree 实跑 pre-fix 脚本补反向红证据（G2 "MUST split" ERROR+exit 0 / G3 apps 改名 exit 0 / G4 null 基线 "within baseline" exit 0，追加于 `_tmp/audit-1106/835-red.log`，映射到现行测试的断言均会在旧实现下失败）；(c) 阈值与判定规则零改动。
- **G2 残余（不阻塞）**：unreadable 分支（countLines 返回 -1 → ERROR + exit 1）无 fixture 测试——脚本 rootDir 由自身路径推导、无注入 seam，tracked 文件触发 -1 需权限故障，fixture 成本高于收益；行为经 live 源码核对确认。
- **G3 残余（不阻塞）**：动态 key map 正则零命中警告无 fixture 测试（需让 DYNAMIC_KEY_MAPS 文件失配，只能靠改动 live 源码模拟）；警告行为经源码核对确认（check-i18n-keys.mjs:350-354）。
- **G4 口径说明**：plan 原文"evaluate/check 遍历 BASELINED_SCANNERS"在现行实现中由 check 模式 `missingEntries`（requireAll）达成（缺登记项报 "baseline missing"），evaluate 函数仍遍历基线 keys 但对非数值报 "baseline corrupt"——语义等价，未改判定规则。
- **验证口径**：本会话实跑 `pnpm test:scripts`（213 passed | 2 skipped）、`pnpm check` 全链（exit 0，`_tmp/audit-1106/835-check-final.log`）、scheduling 包 typecheck/lint（0 error；gantt-grid.tsx 1 条 react-hooks/incompatible-library warning 为既有、非本 plan 触碰文件）。`pnpm typecheck/build/lint/test` 全量留待收口会话（工作区另有 plan 862 等未收口改动混在树内）。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: G2-G4 经核实已在祖先提交 62422620a 落地（执行会话以 pre-fix worktree 反向验证红证据补齐验收口径）；G5/G6/D1-D3 本会话落地。五命令 exit 0（835-closure-verify.log）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session）
- Evidence: git show 62422620a 核实 G2-G4 修复+测试已进 HEAD 祖先；现行脚本关键分支抽读与 plan Fix 原文一致；红证据 835-red.log（pre-fix @62422620a~1 worktree 实跑）与现行测试断言一一对应；G5 diff/G6 删除+knip/D1 实跑 scan/D2 抽查/D3 diff 全部核验通过；独立实跑 test:scripts 213 passed；两处无 fixture 残余分支披露合理（residual-risk-only）。详见 docs/logs/2026/11-11.md。

Follow-up:

- no remaining plan-owned work
