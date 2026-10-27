# 775 PH-10 e2e flake 归因闭环：归因协议 + flake 台账 + 表完备门禁

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-10（C 组；输入 = plan 762 台账 §5 C 类 4 项 + QA.7 §C 家族）
> Related: `docs/references/e2e-test-diagnostic-guide.md`（owner doc）；`docs/testing/e2e-baseline-ledger.md` "C 类（flake）登记" 节（PH-9 输入）；plan 767 在同一台账的 "Skip 面清单" 节（内容锚定登记先例）；`playwright.config.ts`（`E2E_EXCLUDE_WATCH_ONLY`、retries=1）

## Purpose

把 flake 治理从"顺手评估"升级为**归因闭环机制**：每条 flake 有归因（重现性判定）+ 状态（OPEN/ATTRIBUTED/CLOSED）+ 关闭出口（修复 / sanctioned-skip / watch-only / retries 吸收），落新台账 `docs/testing/e2e-flake-ledger.md`（内容锚定，接替 QA.7 §C），并以机械门禁保证 `@watch-only` 标记与台账互锁（表完备）。

## Current Baseline

2026-10-27 live（HEAD `305e39591` 附近，以执行时 `git log -1` 为准）：

- plan 762 台账 "C 类（flake）登记" 节登记 4 项（内容锚 + 首败签名）：ai-attachments ×2（`[data-slot="ai-chat-root"]` 15s 冷启动超时）、complex-pages-interaction-state picker ×1（**新 flaky**，5s 未出现；台账签名串中的 `[data-open"]` 为**转录多余引号**——spec 源 `:198` 为 `[data-open]`，迁入新台账时修正）、flow-designer-ux-visual ring ×1（**隔离复跑绿** → 跨 spec 干扰）。
- QA.7 §C 家族：gantt 拖拽 resize / gantt-demo 区段 / map-demo smoke / openPage 冷启动 / scada perf rAF（后者归 F/PH-12 无关，watch-only）。
- `@watch-only` 标记仅存在于 `tests/e2e/gantt-perf.spec.ts` 与 `kanban-perf.spec.ts`（3 用例）；`E2E_EXCLUDE_WATCH_ONLY=1` 为 plan 623 的干净运行出口。
- plan 767 已在 `docs/testing/e2e-baseline-ledger.md` 建 "Skip 面清单" 节（内容锚定 + 口径说明；`e2e-test-diagnostic-guide.md` 本身无登记表，仅隔离诊断指引）——本 plan 的 flake 台账沿用该登记形态。
- playwright 支持 `--repeat-each=N`；单 worker（`--workers=1`）隔离重跑是区分"资源争用型"与"真时序缺陷"的既有手段。

## Goals

- **归因**：对台账 C 类 4 项 + QA.7 §C 的 gantt/map-demo/openPage 家族做单 worker `--repeat-each=5` 隔离重跑（webServer 已热），产出分类：`timing-defect`（repeat 中再现非确定失败，附比例）/ `not-reproduced (warm-run)`（repeat 全绿——**不得**据此判为 contention 或否定冷启动族：热服务器下 repeat 根本不经历首入口冷启动窗口）/ `contention`（仅当全量运行红 + 单独隔离绿 + repeat 全绿三证齐备，如 flow-designer ring）/ `cold-start`（**仅**经 fresh-server 冷启动探针再现才可正向判定；本 plan 不强制做）。**QA.7 家族标签作为二级标签随条目保留，任何单次矩阵不覆盖它。**
- **机制**：`e2e-test-diagnostic-guide.md` 新节 "Flake Attribution And Closure Protocol"——状态机 `OPEN → ATTRIBUTED(contention|cold-start|timing-defect) → CLOSED(fixed | sanctioned-skip | watch-only | retry-absorbed)`；每状态迁移的证据要求（repeat 次数、签名、commit）；watch-only 是 timing-defect 的合法出口但须台账登记。
- **台账**：`docs/testing/e2e-flake-ledger.md`（内容锚定：spec + 测试全名；列：状态/分类/证据/复触发条件/关闭出口）；QA.7 §C 加"已由本台账接替"指针。
- **表完备门禁** `check:e2e-flake-ledger`：①tests/e2e 内每个 `@watch-only` 标记的测试名必须在台账中登记；②台账中每条 CLOSED-fixed 的测试名必须存在于 tests/e2e（防幽灵条目）。匹配口径：解析 `test('<title>')` 字面标题（含 describe 嵌套的 " > " 全路径，空白折叠），台账条目以 `spec 文件 > 全标题路径` 内容锚；参数化标题暂不在三条现有 watch-only 中出现，协议节写明"参数化标题须以字面展开登记"。fixture 位于 `scripts/__tests__/`，脚本支持 `--specs-dir/--ledger` 注入。fixture 先红后绿；入 `pnpm check`。

## Non-Goals

- 不修复 timing-defect 本身（出口裁决；修复归 owner 面）。
- 不改 playwright.config（retries=1 与 watch-only 机制保持）。
- 不处理 248 failed 中非 C 类项（PH-9 台账已承接）。

## Scope

### In Scope

- 归因重跑（只读运行）；`docs/testing/e2e-flake-ledger.md`（新）；`e2e-test-diagnostic-guide.md` 新节 + QA.7 §C 指针；`scripts/check-e2e-flake-ledger.mjs` + fixture 测试 + `package.json` 接线；roadmap PH-10 回写、daily log

### Out Of Scope

- timing-defect 修复；G/F 类；playwright 配置变更

## Failure Paths

| 场景                    | 触发                                 | 行为        | 可重试 | 用户可见        |
| ----------------------- | ------------------------------------ | ----------- | ------ | --------------- |
| watch-only-unregistered | 新增 `@watch-only` 测试未登台账      | 门禁 exit 1 | 是     | `pnpm check` 红 |
| ledger-ghost            | 台账 CLOSED-fixed 条目的测试已不存在 | exit 1      | 是     | 红              |

## Test Strategy

本档选择：**必须自动化**（门禁）。归因重跑为 Proof（运行证据落台账）。

## Execution Plan

### Phase 1 - Proof：归因重跑

Status: completed
Targets: 运行证据（`_tmp/ph10-flake/`，gitignored；结论转录台账）

- Item Types: `Proof`

- [x] 单 worker `--repeat-each=5 --retries=0`：6 spec 文件 140 用例 × 5 = 700 次（29.2m）+ flow-designer ring 单用例 ×5。矩阵：**10 个用例有失败**——其中 8 个 5/5 红 = PH-9 已知 B 类稳定红（非 flake，排除）；complex-pages picker **1/5**；map-demo region map **1/5**；flow-designer ring **3/5**；ai-attachments ×2 / gantt 两文件 / openPage smoke 集（排除 B 类）全部 0/5。
- [x] 四态归因：timing-defect ×3（picker 1/5、map 1/5、flow ring **4/10 有日志**——closure audit R1 指出原 3/5 为未留日志观测且其复跑 0/5，遂以 `ring-repeat10.log` 十次重跑锚定；三次观测全部如实记入台账；推翻 PH-9 单样本"contention"初判）；not-reproduced(warm-run) ×6（ai-attachments ×2、gantt resize、gantt-demo 区段、openPage 族；QA.7 族标签保留）；contention 0（无三证齐备项）；cold-start 0（未做冷探针，族标签作为历史保留）。

Exit Criteria:

- [x] 矩阵与四态结论落台账 §登记（每项含失败比例/0-5 计数）。

### Phase 2 - Fix：台账 + 协议 + 门禁

Status: completed
Targets: `docs/testing/e2e-flake-ledger.md`、`docs/references/e2e-test-diagnostic-guide.md`、`scripts/check-e2e-flake-ledger.mjs`、`package.json`

- Item Types: `Fix`

- [x] 台账建账（12 条：3 watch-only CLOSED / 3 timing-defect / 6 not-reproduced / 1 历史 CLOSED-fixed）；状态机 + 判定规则写入台账头部；PH-9 台账 `[data-open"]` 转录引号在迁入时修正。
- [x] guide 新节 "Flake Attribution And Closure Protocol"（记录/归因/关闭三步 + 四态规则 + 出口 + 内容锚约定）；QA.7 §C 加接替指针。
- [x] `check-e2e-flake-ledger.mjs`：解析 `test('title')` 字面标题（叶标题，含 `@watch-only`）↔ 台账 `` `spec > title` `` 锚；规则①未登记 watch-only → 红；②CLOSED-fixed 幽灵 → 红；`--specs-dir/--ledger` 注入；5 fixture（未登记红 / 已登记绿 / 幽灵红 / OPEN-ATTRIBUTED 绿 / live）。**执行修订**：匹配口径取"文件 + 叶标题"而非 describe 全路径（三条 watch-only 叶标题唯一；协议写明参数化标题须字面展开登记）。先红：live 用例在台账不存在时红（ENOENT）。
- [x] `package.json` 接线（`check:*` 键按字母序重排，`check:deps-baseline` 等既有键位置随之移动，内容不变）；`check:wiring-coverage` / `check:baseline-line-keys` 绿。**执行修订（closure audit R1 N1）**：无锚行可绕过幽灵检查 → 门禁改为逐行判定，`CLOSED-fixed` 无锚 → 红，其它无锚行列为 history-only 提示；layout-family 历史行改状态 `HISTORY-closed`；fixture +1（6 条）。
- [x] 反向探针：map-demo 临时加 `@watch-only` → 红（点名）；精确还原。

Exit Criteria:

- [x] fixture 5/5；live exit 0；反向探针红。

### Phase 3 - Docs 与回写

Status: completed
Targets: QA.7 §C、roadmap、daily log

- Item Types: `Fix`

- [x] QA.7 §C 接替指针；roadmap PH-10 `todo`→`planned`（active 时已记）→`done`（closure 同 commit）；daily log（closure 同 commit）。

Exit Criteria:

- [x] `pnpm check` exit 0（见 Closure Gates）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agents `agent_2156038c`（R1）、`agent_4861e9eb`（R2），2026-10-27
- Verdict: R1 标注 `pass-with-minors` 但含 2 Major → 按 Major 处理修订；R2 `pass-with-minors`（0/0/2，措辞「三分类」→「四态归因」已改）
- Rounds: 2
- Findings addressed: Major①——skip 面清单先例在 `e2e-baseline-ledger.md` 而非 guide（引用对象错位）→ 全文改正；Major②——热服务器 repeat 全绿不可判 contention/否定冷启动族 → 新增 `not-reproduced (warm-run)` 桶、contention 三证、cold-start 仅冷探针正向判定、QA.7 族二级标签保留。Minor——`[data-open"]` 为转录多余引号（spec 源 `[data-open]`）、§5 歧义改按节标题引用、门禁标题匹配口径与 fixture 位置、entry-pages 整集为对照。

## Closure Gates

- [x] 归因矩阵落台账（每条 C 类有四态归因结论）
- [x] 协议落 guide；台账建账；QA.7 §C 接替指针
- [x] `check:e2e-flake-ledger` 落地，fixture 先红后绿，反向探针红
- [x] 无 in-scope 项被静默降级
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——R1 `agent_686e6acb` `issues`（1 Major 2 Minor）→ 修复 → R2 `agent_c205f53c` `approved`，2026-10-27（见 §Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### timing-defect 项的修复

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: PH-10 交付归因与关闭机制；timing-defect 修复归渲染器 owner 面，台账条目即 backlog。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: flake 治理从"顺手评估"升级为闭环机制：四态归因协议（guide）+ 内容锚定 flake 台账（接替 QA.7 §C）+ `check:e2e-flake-ledger` 表完备门禁（watch-only ↔ 台账互锁、CLOSED-fixed 幽灵与无锚检查）。归因矩阵（700 + 10 次有日志重跑）得 3 项真时序缺陷（picker 1/5、map 1/5、flow ring 4/10——后者推翻 PH-9 单样本 contention 初判）、6 项热服务器未再现（族标签保留）、0 contention/cold-start。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agents `agent_686e6acb`（R1 `issues`）、`agent_c205f53c`（R2 `approved`），2026-10-27
- Evidence: R1 逐项复算 700 次矩阵与台账转录完全一致、反向探针红、B 类排除交叉核对；Major——ring 3/5 为未留日志观测且其复跑 0/5 → 以 `ring-repeat10.log` 十次重跑（4/10）锚定并如实记三次观测；Minor——无锚行绕过门禁 → 逐行判定 + CLOSED-fixed 无锚红 + HISTORY-closed 状态 + fixture 6；package.json 差异为字母序重排（check:deps-baseline 在 HEAD 已有）。R2 复核日志 4/10、台账措辞、门禁 6/6、自做无锚 CLOSED-fixed 探针红、`pnpm check` exit 0。

Follow-up:

- no remaining plan-owned work。3 项 timing-defect 修复归 owner 面（crud picker / flow-designer 选中态 / map 装配），retries=1 暂吸收；冷启动族正向判定留 fresh-server 探针（协议已定义）。
