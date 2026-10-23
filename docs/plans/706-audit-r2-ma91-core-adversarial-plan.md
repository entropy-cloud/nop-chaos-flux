# 706 审计修复 R2·MA9.1：开放式对抗审计—核心链路（compile→scope→render→action→update）+ 并发/StrictMode/取消/错误传播

> Plan Status: active
> Last Reviewed: 2026-10-23
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA9.1；`docs/audits/arm2-scope-and-dimension-matrix.md` MA9.1 行（报告名注册 `*arm2-MA9.1-core-adversarial.md`）；基础方法 `docs/skills/open-ended-adversarial-review-prompt.md`（开放式姿态/启发式人格/去重与新鲜度/多轮保存/停止条件——**skill 文件不含探针机制，closure review M1 全文核实**）；**探针设计与信号源定义 = roadmap MA9 节 + matrix MA9 节**〔live 信号驱动探针设计：git log 热点、audit:knip 死代码、console 基线、skip/watch-only 清单、MA1–MA8 报告 watch-only 项；明确允许清单外发现；产出探针清单+判别证据；有价值失败模式记 MG 候选〕；owner doc `docs/architecture/flux-design-principles.md`（roadmap :88 owner 列为准；flux-core.md 关联参考）
> Related: matrix MA9 节、`docs/audits/arm2-index.md`、MA5.1 P0-MA5.1-003（React Compiler 判别——同域先例）、MA6.x 全部 watch-only 台账（对抗探针输入）、MA7.1 热点取证
> 方法先例沿用：`_tmp/arm2-ma91/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

对核心链路（compile→scope→render→action→update 主干）+ 并发/StrictMode/取消/错误传播交叉做开放式对抗审计：live 信号驱动探针设计（git log 热点 + knip 死代码 + console 基线 + watch-only 清单 + MA1–MA8 watch 项），明确允许清单外发现；产出探针清单 + 判别证据；有价值失败模式记 MG 候选；零入库变更。

## Current Baseline（2026-10-23 live，HEAD `855ae5151`）

- **live 信号面**：git log 热点（高频改动文件=高风险面）；`audit:knip` 死代码报告；console 基线；skip/watch-only e2e 清单（@watch-only = gantt ×2 + kanban ×1；**scada-editor-perf ×3 为 console-gate 红非 watch-only**〔MA7.1 裁决在案〕——同为探针输入，状态如实分列）；MA1–MA8 各报告内 watch-only/P3-watch 区（**grep `docs/audits/*arm2-MA*.md` 收集——arm2-index 仅计数不含明细**，closure review M2 勘正）。
- **同域先例**：P0-MA5.1-003（React Compiler 误提升——useSyncExternalStoreWithSelector fork 判别法）；MA7.1 P1-MA7.1-001（虚拟化被布局击穿）。
- **核心链路→包映射**：compile=flux-compiler/flux-formula；scope=flux-core/flux-runtime；render=flux-react；action=flux-action-core；update=flux-react/flux-runtime。
- **执行状态**：roadmap MA9.1 `todo`；arm2-index MA9.1 行 `—`；**在案勘误**：MA8.3 行 `done` 翻转两度被并发线回写覆盖（本批激活时再修复 200c12cff）——closure gate sed 回读须在本批提交前即时执行。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA9.1-core-adversarial.md`（矩阵注册名 core-adversarial）：探针清单（每探针：信号源→假设→判别证据）+ finding P0–P3（P1 ID `P1-MA9.1-<nnn>`）+ 有价值失败模式 MG 候选。
- 覆盖面（两轮对抗 + 执行者对账；字母批拆分预授权）：
  - ① **Round A · 信号收集 + 探针设计**（子代理）：git log 热点 TOP、knip 死代码、watch-only/MA1–MA8 watch 项清单 → 设计 ≥10 对抗探针（每探针：信号源→假设→判别方法），覆盖 compile→scope→render→action→update 主干 + 并发/StrictMode/取消/错误传播交叉
  - ② **Round B · 探针执行**（子代理）：逐探针执行 + 判别证据（红/绿/不可判别均记录）；清单外发现明确允许
  - ③ **执行者对账**：判别证据复核；P1 live 复核；MG 候选归并
- 登记 arm2-index（MA9.1 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复（P0 即时通道除外）；非核心链路面（renderer 族 MA9.2/designer-office MA9.3/e2e MA9.4 不覆盖）；性能阈值裁决归 MA7.1（已收官，引用）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA9.1 报告 + arm2-index 登记回填；`_tmp/arm2-ma91/` 实跑；daily log 追加；roadmap MA9.1 行流转；本 plan 流转；收口提交。

### Out Of Scope

- 修复实现；MA9.2+ / MA8 / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号    | 触发            | 行为                                                 | 可重试 |
| --------------- | --------------- | ---------------------------------------------------- | ------ |
| probe-undecided | 探针不可判别    | 记录不可判别原因 + 升级信号设计一轮                  | 是     |
| audit-p0-found  | Rule 2 六类之一 | 即时通道                                             | 否     |
| subagent-quota  | 限流/模型失败   | fresh 重启一次；再败执行者亲跑                       | 是     |
| round-overflow  | 单轮超上限      | **字母批拆分（MA9.1-a/-b，Cross-Cutting 5 预授权）** | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更；对抗探针即取证本体）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - multi：信号收集 + 探针设计 → 执行

Status: completed
Targets: `_tmp/arm2-ma91/round-{A,B}.md`、`_tmp/arm2-ma91/probes/`

- Item Types: `Proof | Decision`

- [x] **Round A · 信号收集 + 探针设计**（子代理）：五信号源全收集（git log 93 commits TOP10/knip 21 文件 342 导出/console 29 条 2 可收窄/watch 清单/WA 台账）→ **17 探针**（超 ≥10 要求；五链路+交叉面全覆盖）+ 6 P3 观察
- [x] **Round B · 探针执行**（子代理）：**23 项判别（17 清单+6 清单外）：红 7/绿 13/不可判别 3**；等 A 落盘 25 分钟轮询受理；探针 20 文件留档
- [x] **执行者对账**：P2-001 :155/:170 对照亲读定罪；红 7 → P2 ×3 + P3 ×1 归并；MG 候选 3 条

Exit Criteria:

- [x] 17 探针清单 + 23 项判别证据落字
- [x] 分类/分级/归族 + MG 候选 3 + P1 零新案核验

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 toast 族归并单根落定；R2 pipe 族与 WA-002 watch 升格落定），末轮显式停止
- [x] MR3 / MG 交叉线索分栏（MR3 +P2-001/002/003；MG +3 候选；文档批 +P3-2 钉扎；MA9.4 +不可判别 3 转入）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred/watch 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: planned

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-1301-arm2-MA9.1-core-adversarial.md`：§0 23 项判别 + P2 ×3 + P3 ×2 + 绿资产 13 + MG 3 + watch 5 + open 两轮 + 收口补记）
- [x] arm2-index：MA9.1 行 + Last Updated 滚动（P0/P1 零立案、累计 69 不变），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma91/`（closure audit R1 通过后执行）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：MA9.1 行路径实存；P0/P1 零立案核验）
- [x] BUILD_VERIFY exit 0 登记（gate-\*.exit 全 0；closure R1 m2 fresh 重跑再登记）

### Phase 4 - 收口与状态流转

Status: planned

- Item Types: `Proof`

- [x] draft review 通过后：plan→`active`（roadmap `todo`→`planned` 翻转在激活提交中遗漏——closure R1 M1 发现，随收口直接 `todo`→`done` + 勘误落字）
- [x] closure audit（fresh subagent `agent_430b61a4`）R1 `issues`（0B/2M/2m——M1 roadmap MA9.1 翻转在激活提交 200c12cff 中遗漏〔该提交仅含 MA8.3 再修复一行；**同类第三例**：MA7.3/MA8.3/MA9.1〕→ 直接 todo→done 手术 + 勘误落字；M2 报告 §2 绿资产枚举错误〔红探针 ID 误列〕→ 重写 13 实项 + 拆分口径声明 + PB 映射移 §4；2m：round-B 红行数笔误随 \_tmp 消失、并发线 git rm --cached ~40 docs 文件 → temp-index 显式路径再入库 + fresh 门禁重登记）approved 后：roadmap MA9.1 `todo`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_a4168f92`（roadmap :88 + MA9 节 :216 逐字、矩阵 :149、arm2-index :98、HEAD `855ae5151`、skill 全文核实不含探针机制（9,730B）、信号源全实存、先例 P0-MA5.1-003/P1-MA7.1-001 实存、核心链路包映射核实、guide 合规）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 Source 改平行结构（skill=基础方法；探针设计=roadmap/matrix MA9 节——skill 不含探针机制如实分列）；M2 watch-only 输入改指各报告 grep 收集（arm2-index 仅计数）；m1 owner doc 对齐 flux-design-principles.md；m2 scada-editor ×3 状态如实分列（console-gate 红非 watch-only）；m3 Last Reviewed 落日期；**另发现 MA8.3 行 done 再遭回写覆盖 → 激活时再修复（200c12cff）**——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma91/` 清理）
- [x] roadmap Work Item Status MA9.1 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4；closure m2 fresh 重跑）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: 核心链路对抗审计收官（P0/P1 零立案；P2 ×3 新案〔取消路径虚假 toast 族 3 面单根 MG 候选 / pipe×三元 WA-002 首个实漂移 / debounce 键互踩〕+ P3 ×2 + 绿 13（closure R1 M2 重写定稿）+ MG 3 + 不可判别 3 转 MA9.4 + 方法学备案 2）；字母批裁定：未拆分；零业务代码变更核验通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_430b61a4`（R1）
- Evidence: R1 **`issues`**（0B/2M/2m）→ 回修 → 全部落地。审计员独立复核：**P2 三根源逐行复现**（runtime-action-helpers.ts :155 无 failureHandled vs :169-170 有 + 反双 toast 注释 / pipe-syntax 双扫描器仅引号+括号深度、`:0` 分割、fallback 回源——`cond ? a | upper : b` 机械追踪为 `upper(cond ? a, b)` / action-core.ts:34-48 键无实例区分）；探针文件 20 实存 + 2 抽检断言与判别一致；17 清单全判别（23 = 17+6）；F-14/15/16 处置有据；69 open 逐行清点精确；zero-code-change 双跑核实；MA8.3/MA9.1 两例激活翻转遗漏勘误随 commit 落地。

Follow-up:

- no remaining plan-owned work；P2-MA9.1-001/002/003 修复行在 MR3 队列（P2-001 单点 cancelled 豁免）；MG 3 候选（cancelled 豁免/A-17 收编/解析器感知）；MA9.4 +不可判别 3；MA9.2（渲染器族跨簇对抗）为下一工作项。

Follow-up:
