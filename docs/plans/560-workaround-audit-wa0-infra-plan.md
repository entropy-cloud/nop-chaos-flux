# 560 workaround-audit WA-0 审计基建——模块枚举器/findings 台账/对账命令/审计报告模板

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-0 工作项，Phase Status 第 1 行）；`docs/skills/workaround-code-smell-audit-prompt.md`（§5 取证协议与 §6 报告格式——本基建要支撑的方法口径）；`docs/audits/interaction-state/`（IS-0 枚举/台账/对账先例，plan 543）
> Related: `missions/workaround-code-smell-audit.json`（本轨道 mission driver）

## Purpose

为临时方案与坏味道审计轨道（WA-0–WA-16，另含执行期动态插入的 CX-n）建立审计基建：审计对象（41 包 + playground 子域）的程序化枚举器、findings 台账与对账命令、按 prompt §6 固化的审计报告模板。后续 WA-1–WA-15c 各批取证与 WA-16 收口对账全部复用本基建。本计划零产品代码修改。

## Current Baseline

- **live 包清单（2026-10-11 复测）**：`ls packages/ | wc -l` = 41，与 roadmap 基线一致；`apps/playground/src/` 顶层含目录 `ai/`、`complex-pages/`、`component-lab/`、`designer-hosts/`、`env/`、`pages/`、`taskflow-designer-lib/`、`schemas/`（实测仅 `.json`）与 7 个 `*-replica/` 目录（实测 airtable/antdpro/cal/linear/notion/stripe/sundial，仅 `.css`），根级非测试 `.ts`/`.tsx` 散文件 17 个（App/main/route-model/theme/use-route/home-cards/各 route-entries 与 renderer-routes 等）——与 roadmap WA-15a 注记（`*-replica/` 仅 CSS、`schemas/` 仅 JSON，非 TS 审计对象）吻合。
- **IS-0 先例可照搬**（`scripts/interaction-state/` + plan 543）：vitest 测试形态枚举器（`pnpm interaction:inventory` 即其运行形态，独立 vitest config 不入 turbo `pnpm test` 任务族）、注释式 section 标记的 markdown 台账（`<!-- ledger:xxx -->`，parse/serialize lib）、对账命令 `pnpm interaction:reconcile`（`--strict` 供收口门禁）。本轨道沿同一组织方式，落 `scripts/workaround-audit/`。
- **枚举源差异**：interaction-state 枚举 live 路由模型（TS import）；本轨道审计对象是**文件系统模块**（`packages/*/src` + playground 子域），枚举器走目录扫描 + 逐文件行数统计，无 TS import 依赖，可用纯 node 环境 vitest config。
- **roadmap 基线计数（2026-10-10 实测，枚举器首跑须复核）**：字面英文标记 1 处、中文临时标记 13 处、`as any|@ts-ignore` 46 处、`setTimeout(` packages 口径 72 处；`check:audit-*` 族 16 项（线索源，本基建不重建其检查逻辑）。
- **台账落点不存在**：`docs/audits/workaround-code-smell/` 尚未创建。
- **roadmap 已钉死的契约**（本基建必须如实实现）：发现 ID `WA-<pkg短名>-<seq>`（与工作项 ID `WA-0`…`WA-16` 两个命名空间）；发现状态机 `pending → found → fixed → verified`；不修走显式去向四态 `watch-only / successor-required / withdrawn / n-a`；批次报告目录小写 `wa-<N>/`（CX-n 用 `cx-<n>/`）；WA-16 关闭前置 = `uncovered=0 且未处置=0`。

## Goals

- `pnpm workaround:inventory` 一条命令再生成 `docs/audits/workaround-code-smell/inventory/modules.json`（模块 × 批次 × 非测试源码行数 × 文件清单 × 字面/模式扫描基线计数）+ 台账 modules section 行（保留既有状态、新增 pending、消失标 orphan），清单全部来自 live 文件系统，零手抄。
- `docs/audits/workaround-code-smell/ledger.md` 双 section 台账：modules（`pending → audited`，orphan 终态）+ findings（`pending → found → fixed → verified` + 去向四态，逐条 `WA-<pkg短名>-<seq>`）。
- `pnpm workaround:reconcile` 结构对账 + 机器判定计数报告（`audited / uncovered / findings / found / fixed / verified / watch / withdrawn / n-a / 未处置`）；`--strict` 模式 uncovered>0 或未处置>0 或结构违例即 exit 1（WA-16 关闭前置的机器判定）。
- `docs/audits/workaround-code-smell/report-template.md`：按 prompt §6 单条发现模板 + 汇总五项 + 覆盖声明节（批次报告必须声明覆盖的模块清单，与台账 modules 行 audited 翻转对账）固化。
- `docs/audits/workaround-code-smell/README.md`：再生命令、状态机语义、对账口径、批次报告目录约定。

## Non-Goals

- 任何产品代码/renderer/playground 修改（WA-0 不做产品代码修改，roadmap WA-0 节明文）。
- 任何批次的实际取证审计与 findings 立案（WA-1 起）。
- 字面/模式扫描作为门禁接入 `pnpm check` 链（WA-16 静态门禁扩展评估统一裁决；本基建只产出基线计数）。
- 重复块归一化比对工具（prompt §5 第 4 步的 token 归一化相似度脚本）——各批取证时按需以 `_tmp/` 探针形态执行，不预先沉淀（沉淀与否由 WA-16 评估）。
- `check:audit-*` 族 16 项门禁的输出解析/去重自动化（各批按 prompt §5 第 5 步人工交叉核对）。

## Scope

### In Scope

- `scripts/workaround-audit/`：`generate-workaround-inventory.test.ts`（枚举器）、`workaround-ledger-lib.ts`（台账 parse/serialize，erasable-only TS——node 25 原生类型剥离直跑 reconcile，vitest 同消费）、`reconcile-coverage.ts`（对账）、`vitest.inventory.config.ts`。
- `package.json`：新增 `workaround:inventory`、`workaround:reconcile` 两个 script。
- `docs/audits/workaround-code-smell/`：`README.md`、`ledger.md`、`inventory/modules.json`、`report-template.md`。
- `docs/backlog/workaround-code-smell-audit-roadmap.md`：WA-0 状态回写（draft review pass 后 `todo → planned`；closure audit pass 后 `planned → done`）+ 执行中发现的前提漂移就地勘误。
- `docs/index.md`：roadmap 表补本轨道 audits 台账落点登记（如缺）。

### Out Of Scope

- `docs/audits/workaround-code-smell/wa-<N>/`、`cx-<n>/` 批次证据目录（各批 plan 自建，git 不跟踪空目录）。
- findings 的 `found` 及之后状态推进（各批 plan 驱动）。
- `docs/audits/workaround-code-smell/` 之外的任何 docs 重构。

## Failure Paths

不适用：纯审查基建，无错误处理/API 契约/鉴权/外部集成路径。（对账命令对结构违例与未达标的失败行为在 Phase 1 Exit Criteria 写实。）

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（本计划交付物本身就是自动化基建）。Proof 先行/同批豁免说明：枚举器即测试（vitest 形态，Fix 与 Proof 在同一交付物内语义合并，不存在"先写测试再实现"的分离面），断言包数/批次映射全覆盖/playground 三分文件零遗漏，计数读 live 文件系统而非硬编码；台账幂等再生成有断言；对账命令的 strict/非 strict/结构违例行为有脚本级验证。

## Execution Plan

### Phase 1 - 枚举器、台账与对账命令

Status: completed
Targets: `scripts/workaround-audit/`、`package.json`、`docs/audits/workaround-code-smell/`

- Item Types: `Fix | Proof | Decision`

- [x] Decision：playground 子域边界裁定（枚举器批次规则依据）——`wa-15a` = `complex-pages/`、`taskflow-designer-lib/`、`designer-hosts/`、`ai/`、`env/`、src 根级散文件（含 `*.test.*` 之外的根级 `.ts`/`.tsx`；根级 CSS 不属审计对象但需被清点排除）；`wa-15b` = `pages/`；`wa-15c` = `component-lab/`；`schemas/`（仅 JSON）与 `*-replica/`（仅 CSS）按 roadmap 剔除出 TS 审计对象；roadmap WA-15a 注记的复刻页行为面（`complex-pages/page-schemas/*.json` + `complex-pages/shared/mock-backend-*.ts`）随 `complex-pages/` 整目录归 `wa-15a`——JSON 取证面不进枚举器 TS 清单，但 WA-15a 审计范围含它。枚举器守卫：playground/src 下任何非测试 `.ts`/`.tsx` 文件必须恰好落进一个子域（新目录/新散文件出现 → 枚举器红，逼 roadmap 显式扩范围，不允许静默漏审）。
- [x] Fix：`scripts/workaround-audit/generate-workaround-inventory.test.ts`——vitest 测试形态枚举器（node 环境）：扫描 `packages/*/src` + `apps/playground/src`，排除 `*.test.*`/`*.spec.*`/`__tests__/`，逐文件统计行数；包 → 批次映射硬编码自 roadmap Phase Status（41 包逐一列出，WA-1:flux-core/flux-formula/flux-compiler、WA-2:flux-action-core/flux-runtime、WA-3:flux-react/ui、WA-4:flux-renderers-basic/flux-renderers-form、WA-5:flux-renderers-form-advanced、WA-6:flux-renderers-data、WA-7:flux-renderers-content/flux-renderers-layout/flux-renderers-mobile、WA-8:flux-renderers-scheduling/flux-renderers-dashboard/flux-renderers-pivot、WA-9:flux-renderers-industrial、WA-10:flux-renderers-3d/flux-renderers-graph/flux-renderers-map/flux-print-core/flux-print-renderers/flux-code-editor、WA-11:flux-renderers-ai、WA-12:editor-core/page-designer-core/flow-designer-core/report-designer-core/spreadsheet-core/word-editor-core、WA-13a:flow-designer-renderers/page-designer-renderers、WA-13b:report-designer-renderers/spreadsheet-renderers/word-editor-renderers、WA-14:flux-i18n/nop-debugger/flux-bundle/tailwind-preset/theme-tokens）；守卫断言：`packages/` 下每个含 `src/` 的目录都被映射到恰好一个批次（新包未登记 → 红）；每模块输出 `{id, family, batch, files[], loc, baseline:{literalEn, literalZh, typeBypass, setTimeoutCandidates, silentCatch, keyRemount, domRaid, pixelNudge, testEnvBranch}}`（基线计数 = prompt §5 第 1/2 步主扫描 9 项在本模块范围的命中数，仅作候选线索基线，不做定性；B 类静默吞错候选 `silentCatch` 覆盖 `catch\s*\([^)]*\)\s*\{\s*(return|}\s*$)`）；写 `inventory/modules.json` 并以 ledger-lib 合并台账 modules 行。
- [x] Fix：`scripts/workaround-audit/workaround-ledger-lib.ts`——台账 parse/serialize（modules + findings 两 section，注释式标记 `<!-- ledger:modules -->` / `<!-- ledger:findings -->`）；modules 状态词表 `pending|audited|orphan`，findings 状态词表 `pending|found|fixed|verified`，去向词表 `watch-only|successor-required|withdrawn|n-a`（可空，仅在裁定不修时填）；再生成合并语义：保留既有状态、新增条目 pending、消失条目 orphan（modules）；findings section 为人工维护区，再生成不触碰。
- [x] Fix：`scripts/workaround-audit/reconcile-coverage.ts`——结构对账（inventory 每模块有 ledger 行、finding 行 module 引用存在于 inventory、状态/去向词表合法、orphan 不计 uncovered、audited 模块的批次报告文件 `docs/audits/workaround-code-smell/<batch>/report.md` 存在）+ 计数报告：`audited / uncovered / findings / found / fixed / verified / watch / withdrawn / n-a / 未处置`；`未处置` 口径 = `pending` 行 + 无显式去向的 `found` 行（依据：roadmap 契约「批 closure 前 P0/P1 不得残留 `found` 未处置」——`found` 带去向四态之一即已显式处置，`watch` 等计数可非零；此口径精化为 Decision 项，draft review 复核）；`--strict` 时 uncovered>0 或未处置>0 或结构违例 exit 1，否则 exit 0。
- [x] Fix：`package.json` scripts 增 `workaround:inventory` / `workaround:reconcile`；`scripts/workaround-audit/vitest.inventory.config.ts` 独立 config（node 环境）。
- [x] Proof：首跑 `pnpm workaround:inventory` exit 0 生成 `inventory/modules.json` + `ledger.md`：模块行数 = 41 包 + playground 8 子域（complex-pages/taskflow-designer-lib/designer-hosts/ai/env/src-root/pages/component-lab）= **49**（枚举器以 live 扫描长度断言，不用硬编码期望值）；各模块 loc 总和与 roadmap 基线口径（packages 258,396 + playground 51,611，容差 ±2%）交叉核对，偏差超容差时在台账 note 记录差异原因；基线计数字段总和与 roadmap 基线节四项计数（1/13/46/72）对账（scan 表达式与 roadmap 命令逐字对齐，不一致处属表达式口径差异，逐条记录不静默）。**首跑实测（2026-10-11）**：loc 258,423(+27,+0.01%)/51,611(0)；roadmap 口径 cross-check literalEn 1/1、literalZh 13/13、typeBypass 46/46、setTimeout 全域 89=72(packages)+17(playground) 注记口径——四项 delta 全零；prompt 全表达式补充口径：typeBypass 371=46+325（`as unknown as`/`@ts-expect-error`，grep 复测吻合零重叠行）、silentCatch/keyRemount/testEnvBranch 0/0/0、domRaid 78、pixelNudge 1（grep 复测吻合）；实测数据已落 `README.md` 首跑表。
- [x] Proof：幂等再生成断言（测试内：二次生成 statuses/loc/baseline 不变、无重复行）；`pnpm workaround:reconcile` 非 strict 首跑报告 uncovered=49、未处置=0、exit 0；`--strict` 在 uncovered>0 时 exit 1；人为制造结构违例（删一行 modules 行 / 引用不存在的 module）时两模式均能红（验证后还原）。**实跑证据（2026-10-11）**：幂等——干净重建后连续两跑 4/4 绿且 ledger md5 一致（2ad37512）；reconcile 非 strict uncovered=49/violations=0 exit 0、strict FAIL exit 1；三类违例注入全红（删行→`in inventory but has no ledger row`；audited 无报告→`audited but batch report missing at …/wa-1/report.md`；非法去向+未知 module 两条并报）；守卫红路径——临时 `packages/__guard-test-pkg/`→3 tests failed、playground 根级游离 `.ts`→1 test failed，且（首版缺陷修复后）红路径**不写任何产物**（ledger md5 前后不变，首版曾把未登记包写进台账，已加写入前守卫短路）；验证后全部还原。
- [x] Fix：`docs/audits/workaround-code-smell/README.md`——再生命令、双 section 状态机语义、发现 ID 规则（`WA-<pkg短名>-<seq>`，与工作项 ID 命名空间消敏）、去向四态语义、对账口径（uncovered/未处置定义）、批次报告目录约定（`wa-<N>/report.md` 小写 + `cx-<n>/`）与覆盖声明→modules 行 audited 翻转流程。
- [x] Decision：「未处置」口径精化——`未处置` = `pending` 行 + 无显式去向的 `found` 行；`found` 带去向四态之一（watch-only/successor-required/withdrawn/n-a）即已显式处置。依据：roadmap 自动修复契约 §5 原文「批 closure 前 P0/P1 不得残留 `found` 未处置」的偏正结构预设 found 行可"已处置"；若按 WA-0 字面定义（`未处置 = pending/found 的行`）严格执行，则任何合法 watch-only 行都使 WA-16「未处置=0」数学上不可满足，与去向四态零静默设计矛盾。裁定采纳后须在 roadmap WA-0 定义行就地附注勘误（draft review R1 已裁定此为唯一自洽读法，勘误随本项落地，不依赖"执行中发现"触发）。

Exit Criteria:

- [x] `pnpm workaround:inventory` exit 0，`inventory/modules.json` + `ledger.md` 落盘，49 模块行与 live 文件系统一致（含批次/文件清单/loc/基线计数），二次运行幂等。
- [x] 枚举器守卫实证：临时新增一个未登记包目录（或 playground 未覆盖 `.ts` 文件）时枚举器红（验证后还原）。
- [x] `pnpm workaround:reconcile` 非 strict exit 0 报告 uncovered=49/未处置=0；`--strict` uncovered>0 exit 1；两类结构违例注入均红（有实跑证据，验证后还原）。
- [x] `README.md` 状态机/对账口径/目录约定与 roadmap 契约逐条一致，发现 ID 两命名空间消敏写明。

### Phase 2 - 审计报告模板与 roadmap 回写

Status: completed
Targets: `docs/audits/workaround-code-smell/report-template.md`、`docs/backlog/workaround-code-smell-audit-roadmap.md`、`docs/index.md`

- Item Types: `Fix | Proof`

- [x] Fix：`docs/audits/workaround-code-smell/report-template.md`——prompt §6 单条发现模板（类别/位置/严重度/现状/按住的根因/违约基准/为什么是临时方案/风险/重构方向/重复组/ROI 裁定/误报排除复核，字段逐条保留）+ 汇总五项（转正清单/重复热区/Top 重构建议/误报排除清单/范围整体判断）+ **覆盖声明节**（本批审计的模块清单 + 逐模块结论：`audited`，作为台账 modules 行翻转 `audited` 的依据与 reconcile 报告存在性检查对象）+ 严重度标准四档引用。
- [x] Proof：draft review 通过、本 plan 转 `active` 时，roadmap WA-0 状态回写 `todo` → `planned`（Phase Status 行 Plan 列填本 plan 路径）。closure audit 通过后的 `planned → done` 回写属 Closure Gates 收口动作（与本计划 Closure Gates「roadmap WA-0 双表回写」条对应），不列为本 Phase Exit 项以免时序环。
- [x] Fix：`docs/index.md` roadmap 表核查补登（本轨道行已存在，补 audits 台账落点引用如缺）。

Exit Criteria:

- [x] `report-template.md` 与 prompt §6 字段逐条对齐（单条 12 字段 + 汇总 5 项 + 覆盖声明节），batch 目录命名小写契约写明。
- [x] roadmap WA-0 行状态回写 `todo → planned` 已落（`planned → done` 在 closure audit 通过时随收口 commit 落，见 Closure Gates）。
- [x] `docs/index.md` 登记无悬空链接（roadmap 表第 118 行本轨道行既有 audits 落点引用；audits 目录枚举节补 workaround-code-smell 台账一句）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_e058ee52-9be2-4734-981d-6d56d7cf27f2，review-only）
- Verdict: `pass-with-minors`（零 Blocker、零 Major、5 Minor）
- Rounds: 1
- Findings addressed: Blocker/Major 零条。5 Minor 共识修订（转 active 前落盘）：①「未处置口径」roadmap 勘误触发改为确定性落点（裁定采纳后随 Decision 项在 roadmap WA-0 定义行就地附注，不依赖"执行中发现"）；②Phase 2 Exit 的 closure 后回写条移入 Closure Gates 语义消除时序环；③基线计数字段补 `silentCatch`（prompt §5 第 2 步 B 类候选）使字段清单与声称自洽；④playground 子域 Decision 复述 WA-15a「复刻页行为面随批」注记；⑤Test Strategy 补「枚举器即测试、Fix/Proof 语义合并」豁免说明。两项核心裁定均获审查员支持：「未处置」精化口径为唯一自洽读法（strict 读法下 WA-16 数学上不可关闭）；41 包批次映射 41/41 逐包核对通过零遗漏零重复，49 模块行数正确。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本计划为基建交付型，无产品缺陷修复面——N/A 说明而非跳过）
- [x] 所有 in-scope confirmed contract drifts 已收敛（「未处置」定义漂移经 draft review 裁定后已在 roadmap WA-0 定义行就地勘误；roadmap 其余前提经枚举器首跑复核无漂移——loc 258,423/51,611、四项计数 delta 全零）
- [x] 行为/契约结果已达成（枚举器/台账/对账/模板/README 五件套可运行、可复用、守卫真实有效）
- [x] 必要 focused verification 已完成（枚举器断言 + 幂等 + reconcile 三态行为 + 违例注入实证，详见 Execution Plan 内实跑证据注）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-0 行 todo→planned 已回写 + 未处置定义就地勘误；index.md audits 目录枚举补登）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（R1 `issues`→M1/m1/m2 修正→审计员声明复验口径下 delta 复核通过，证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务）
- [x] `pnpm check`（exit 0；knip 未用导出两类新红当场消解）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 重复块归一化比对脚本是否沉淀为共享工具（WA-16 静态门禁扩展评估统一裁决）。
- 对账命令接入 `pnpm check` 链的时机与形态（WA-16 门禁扩展评估统一裁决）。

## Closure

Status Note: 2026-10-11 收口。两 Phase 全 completed：WA-0 审计基建五件套落地——①程序化枚举器（live 文件系统零手抄，49 模块 = 41 包 + playground 8 子域，批次映射全覆盖守卫 + playground 文件零遗漏守卫，红路径不写产物）；②双 section 台账（modules pending→audited/orphan + findings pending→found→fixed→verified + 去向四态，再生成保状态、findings 人工区不触碰）；③对账命令（`pnpm workaround:reconcile`，audited/uncovered/findings/found/fixed/verified/watch/withdrawn/n-a/未处置 机器判定计数，--strict 供 WA-16 门禁，三类结构违例与守卫红路径实证）；④审计报告模板（prompt §6 单条 12 字段 + 汇总 5 项 + 覆盖声明节，批次目录小写契约）；⑤README（状态机/对账口径/再生命令/首跑实测表）。roadmap「未处置」定义勘误就地落字 + WA-0 行双态回写（todo→planned→done）。首跑 cross-check：roadmap 口径四项 delta 全零（literalEn 1/1、literalZh 13/13、typeBypass 46/46、setTimeout 89=72+17 注记口径），loc 258,423(+27)/51,611(0)。执行期消解三类新红（knip 未用导出 ×2、.d.mts unused file、strict tsc 隐式 any）——台账 lib 转正 erasable-only TS 由 node 25 原生直跑。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_a3cf6760-6da6-4b0c-91c5-3cf7a781ed7b）
- Evidence: R1 verdict `issues`（1 Major + 2 Minor；12 项关键核验独立复现全过：inventory 三跑幂等 md5 一致、reconcile 两模式、三类违例注入逐字吻合、守卫红路径零产物污染、ledger 49 行契约、批次归属抽查 9/9、基线计数 grep 复算精确、report-template vs prompt §6 齐备、pnpm check + knip 亲跑 exit 0、文本一致性、Deferred 诚实性、roadmap 勘误就地性）。**M1** dev log「strict tsc 复核通过」声称不可复现（当时 ad-hoc 检查实际失败、退出码误读）→ 退回实修：枚举器全量补类型标注 + 台账 lib `.mjs`→`.ts`（删除 .d.mts 假红面），`tsc --strict --allowImportingTsExtensions` 实跑 exit 0，声称成立；**m1** reconcile 头注释 exit code 口径失准 → 就地改正；**m2** 死 if 分支 → 删除。R1→修正→审计员声明复验口径（(a) strict tsc exit 0 或 dev log 改口；(b) reconcile exit 0 + inventory 4/4 绿）逐项满足，delta 复核通过转 approved。

Follow-up:

- 见 Non-Blocking Follow-ups（归一化脚本沉淀、对账接入 check 链——均归 WA-16 门禁扩展评估统一裁决）。
