# 687 审计修复 R2·MA4.3：测试有效性审计—content+mobile+domain+scheduling+ai 簇（C4–C7 十一包）契约覆盖

> Plan Status: completed
> Last Reviewed: 2026-10-21
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA4.3；`missions/audit-remediation-r2.json`；方法论 `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md` 为权威 + 工具输出消费（`check:audit-test-global-leaks` / `check:jsdom-pragma-whitelist` / `check:audit-todo-exitless`）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA4 节（报告名模式 `*arm2-MA4.3-content-domain-tests.md`）、`docs/audits/arm2-index.md`、MA1.4/1.5/1.6、MA2.3、MA3.7–3.11（同簇已审面不预载）、MA4.1/MA4.2（机制先例：`_tmp/` 中间件、P1 执行者 grep 复核、单一 BUILD_VERIFY 运行、显式路径提交）；owner docs `docs/architecture/renderer-runtime.md`（本项 Owner Doc）、`renderer-env.md`（INV-1/INV-2 IO 边界）、`docs/references/quick-reference.md`
> 前提勘误注记（live vs roadmap 簇表 2026-10-19 快照）：**flux-renderers-mobile 9→34 src/16→34 test**（merge `bce166dbc` 并入 M6-M11 新增组件：action-sheet/floating-bubble/floating-panel 等）、flux-renderers-3d 23→24 src/24→25 test——以 live 实测为准；roadmap 簇表为历史快照不回写，报告落勘误。C4–C7 live 合计 **482 src / 526 test**（非簇表 456/507）。
> 方法先例沿用（MA4.1/4.2 closure 定案）：子代理轮次中间件落 `_tmp/arm2-ma43/`（收口清理）；报告为唯一长期产物；P1 注册前执行者 grep 复核；收口提交前 `grep` 零残留自验 + prettier；**声称复核禁用会截断的 `git show --stat` grep**（MA4.1 M1' 教训，用 `--name-only`）。

## Purpose

对 C4 content 族（content/layout/dashboard/pivot）+ C5 domain 族（industrial/3d/graph/map）+ C6 scheduling + C7 ai 共 **11 包**执行**测试有效性审计**（matrix MA4.3）：专审**现有单元测试对渲染器稳定契约的守护效力**（异步 IO 边界〔INV-1/INV-2〕、ai 流式/工具调用/HITL 契约、scada/scheduling 交互契约、数据链贯通、历史 bug family 回归）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-21 live 实测，HEAD `f815edb58`）

- **工作树**：并发 mobile 线残留未提交文件（`docs/index.md` 修改 + `docs/backlog/platform-hardening-roadmap.md` 未跟踪）——本项产物与提交**不含之**；无其他 agent 在本 worktree 活跃（live 核对）。
- **规模（口径同 arm2-index：src 列排除 `__tests__/`、`test-support/`、`*test*`；test 列 colocated `*.test.ts(x)`）**：

  | 包                        | src 文件 | test 文件 | `src/index.ts(x)` export 行 |
  | ------------------------- | -------- | --------- | --------------------------- |
  | flux-renderers-content    | 40       | 45        | 25                          |
  | flux-renderers-layout     | 21       | 23        | 11                          |
  | flux-renderers-dashboard  | 15       | 12        | 8                           |
  | flux-renderers-pivot      | 8        | 4         | 3                           |
  | flux-renderers-mobile     | 34       | 34        | 30                          |
  | flux-renderers-industrial | 158      | 152       | 12                          |
  | flux-renderers-3d         | 24       | 25        | 10                          |
  | flux-renderers-graph      | 10       | 7         | 3                           |
  | flux-renderers-map        | 9        | 6         | 3                           |
  | flux-renderers-scheduling | 92       | 114       | 3                           |
  | flux-renderers-ai         | 71       | 104       | 44                          |
  | **合计**                  | **482**  | **526**   | 152                         |

- **工具口径基线（本日实测）**：`check:audit-test-global-leaks` 108 = M0，C4–C7 命中 **64 处**（头部：industrial use-editor-engine ×9、scada-canvas-lifecycle ×6、scada-canvas-viewport-resize ×4、content carousel-autoplay ×4、scheduling barcode/kanban 数处、mobile swipe-cell/notice-bar 各 2、layout responsive-renderer 2 等——执行期逐处定性）；`check:jsdom-pragma-whitelist` no new entries；`check:audit-todo-exitless` 1 = M0（scheduling undo-stack 注册件——C6 内唯一，属已注册裁定件）。
- **mutation**：C4–C7 不在 stryker mutate 范围（scope 仅 flux-runtime/validation）——本项口径 N/A（扩展归 MA4.5）。
- **历史材料（仅作检测启发）**：`docs/bugs/` 路径点名 C4–C7 的 bug note **75 份 raw**（grep 实测；74/74a 逐字符重复〔md5 相同，同时点名 layout/form——MA4.2 E 轮同一对〕→ 唯一 note **74 份**）；MA4.1/4.2 已确立「引用存活性零机制」「测试重组销毁守卫」systemic 与「编译产出→runtime 消费交接」「跨 scope 目标解析」两族——Round G 沿用检测启发、判定全部本轮 live 取证。
- **执行状态**：roadmap MA4.3 `todo`；arm2-index MA4.3 行 `—`；MA4.1/4.2 已收口（`a8af98e95`/`f815edb58`）。

## Goals

- 产出 `docs/audits/2026-10-21-HHmm-arm2-MA4.3-content-domain-tests.md`：双风格（multi + open），每条发现含**严重度 / 类别（八类之一）/ 契约 / 位置 / 现状 / coverage 为何误导 / 最小补强建议**，P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA4.3-<nnn>`），发现归族。
- 覆盖面（四口径，逐包）：① **契约 → 测试映射**（11 包导出面 + renderer 定义/注册契约 + 各自 owner 承诺：content 媒体/反馈面、mobile 手势组件〔pull-refresh/swipe-cell/infinite-scroll/countdown/notice-bar + M6-M11 新增件〕、industrial scada 编辑器引擎/画布生命周期、3d/graph/map 资源加载与 IO、scheduling gantt/kanban/calendar/barcode、ai 流式/工具调用/HITL/会话）；② **历史 bug family 回归缺口**（74 份 note）；③ **跨层/跨包贯通**（异步 IO：env.fetcher/stream 边界〔INV-1/INV-2〕、ai streaming→UI→HITL 中断恢复链、scheduling 拖拽→undo→序列化链、industrial 引擎→画布→属性回写链）；④ **测试卫生消费**（leaks 64 处逐处定性〔industrial 32 含 scada-canvas-lifecycle-hardening ×2 单列〕/ jsdom pragma / todo-exitless）。
- 每簇列「高价值无守护契约」清单 + Coverage Assessment + Recommended Next Tests（3–7 条，注明层）。
- 产出即登记 `docs/audits/arm2-index.md`（MA4.3 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9；与 Closure Gates 共用同一次运行）。

## Non-Goals

- 零代码变更（修复归 MR2；mutation/探针/e2e 归 MA4.5；组织归 MA4.4）。不预载 MA1.4/1.5/1.6、MA2.3、MA3.7–3.11 finding。
- 不执行 MA4.4+；浏览器实操走查归 MA5（本项不实操）。
- 不新建 `docs/analysis/` 目录（先例沿用）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA4.3 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：11 包导出面/renderer 定义/owner docs/现有测试/bug notes/三卫生工具输出。
- `docs/logs/2026/10-21.md` 追加 MA4.3 条目；roadmap MA4.3 行状态流转；本 plan 状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 除外）；MA4.4+ / MR / MV / MG；并发线未提交变更（一律排除、不触碰）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                        | 行为                                                         | 是否可重试 | 用户可见表现   |
| -------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 六类之一（本簇典型：ai 流式内存无界增长、XSS 渲染、scada 控制数据损坏路径被必过空断言掩盖） | P0 即时通道：plan 内追加 Fix Phase 或异步注入独立修复 plan   | 否         | 无（修复先行） |
| scanner-drift  | `check:audit-test-global-leaks` ≠108 / `check:audit-todo-exitless` ≠1 / jsdom 新增                          | 停止收口，归因（零代码变更；并发线或基线登记漂移），报告记录 | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi：契约清单 + 多轮子代理映射（四口径）

Status: completed
Targets: `_tmp/arm2-ma43/round-*.md`（中间件）

- Item Types: `Proof | Decision`

- [x] **契约清单**（执行者）：11 包 `src/index.ts(x)` 导出面 dump + renderer 定义/注册契约提炼
- [x] **Round A（子代理）**：content family 四包（content/layout/dashboard/pivot，84/84）契约 → 测试映射
- [x] **Round B（子代理）**：flux-renderers-mobile（34/34，**M6-M11 merge 后新增组件为 in-scope live 代码**：action-sheet/floating-bubble/floating-panel/number-keyboard 等——手势/键盘 IO 与 a11y 契约）
- [x] **Round C（子代理）**：flux-renderers-industrial（158/152，scada 编辑器引擎/画布生命周期/属性回写/undo）
- [x] **Round D（子代理）**：3d + graph + map 三包（43/38，资源加载/IO 边界/销毁）
- [x] **Round E（子代理）**：flux-renderers-scheduling（92/114，gantt/kanban/calendar/barcode 交互 + undo-stack 注册件）
- [x] **Round F（子代理）**：flux-renderers-ai（71/104，流式输出/工具调用/HITL 中断恢复/会话管理/message engine 框架无关面）
- [x] **Round G（子代理）**：75 份 raw〔74 唯一，74/74a 重复〕点名 C4–C7 的 bug note → defect family → 点名回归测试 live 核对
- [x] **Round H（子代理）**：跨层/跨包贯通——env.fetcher/stream IO 边界（INV-1/INV-2）、ai 流式链、scheduling 拖拽→undo 链、industrial 引擎→画布链、mobile 手势→值更新链
- [x] **工具消费**（执行者）：global-leaks 108（C4–C7 命中逐处定性）/ jsdom pragma / todo-exitless（undo-stack 注册件复核）
- [x] 交叉去重 + 八类分类 + P 级判定 + 归族；P1 注册前执行者逐条 grep 复核

Exit Criteria:

- [x] 11 包契约 → 测试映射清单落字（有守护 / 弱守护 / 无守护三列）
- [x] 八轮子代理产物在 `_tmp/arm2-ma43/`，每轮回答「本轮新发现了什么」
- [x] 三项工具输出消费行落字；全部 P1 有执行者复核记录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（更多实例 / 更大影响 / 不同根因），每轮有证据与「新增了什么」
- [x] 深化机会与 MA4.4 / MA4.5 / MG / MA5 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且最后一轮显式停止
- [x] 全部发现归族 + P 级判定；P2/P3 入 deferred 附定级理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-21-HHmm-arm2-MA4.3-content-domain-tests.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-21.md`

- Item Types: `Proof | Decision`

- [x] 报告按 MA4.1/4.2 同构格式落盘（含前提勘误注记：簇表快照 vs live 漂移）
- [x] arm2-index：MA4.3 行回填 + P1 行（如有）+ Last Updated 滚动，grep 复核
- [x] daily log 10-21 追加 MA4.3 条目（计数 = 报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，共用同一次运行）并登记；复跑三卫生扫描器核对 = 基线
- [x] 清理 `_tmp/arm2-ma43/`（closure audit 通过、提交前执行）

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（grep 复核）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（实数记录入报告收口补记 + log）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA4.3 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA4.3 `planned`→`done`，本 plan→`completed`
- [x] 提交前 `grep -nE "^- \[ \]|^Status: (planned|in progress)"` 本 plan 零残留 + grep roadmap MA4.3 行字面值 `done` + prettier 五文件
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`；显式路径提交，并发线文件不入 stage

Exit Criteria:

- [x] roadmap MA4.3 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_4f8a5468`（五项检查 + 全量复算：11 包规模表逐格、前提勘误归因〔mobile merge 56 文件〕、三卫生工具实跑〔108/C4-C7 恰 64、todo-exitless 1 undo-stack、jsdom no new〕、bug note 75 推导勘正、mutation N/A、并发线口径、contract-surface 152 行、引用路径、686 机制 8 项沿用、M1' 教训预防、八轮分工无盲区）
- Verdict: R1 `revised`（0B/2M/2m）→ 回修后共识
- Rounds: 1
- Findings addressed: M1 bug note 推导勘正（75 raw = 74/74a 重复对 −1 → 唯一 74 份，guide 不在集合内）；M2 Goals ④ "~34" 起草残留 → 64；m1 contract-surface.md 标题 index.tsx→index.ts（C4-C7 入口实为 .ts）；m2 scada-canvas-lifecycle-hardening ×2 单列要求——均已落字

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、七要素齐全、收口补记实数）
- [x] arm2-index 登记（MA4.3 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:audit-test-global-leaks`=108 / `check:jsdom-pragma-whitelist` no new / `check:audit-todo-exitless`=1
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA4.3 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（`agent_7983a6fd` R1 `approved` 0B/0M/2m——六项全过：九条 P1 亲自实跑复现〔m1 勘正 use-gantt-drag 计数口径 4→19 处最多 3 参、m2 勘正 onReady 零派发表述〕+ 三扫描器独立实跑 = 基线 + C4-C7 泄漏 64 处复现 + P2 降级抽样 3 条成立 + P1-005/006 不入 P0 论证成立；m1/m2 随收口 hunk 落地）
- [x] `pnpm typecheck`（当前全绿，零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: MA4.3 全部 Phase 交付完成——C4–C7 十一包（live 482 src/526 test）测试有效性审计双风格落盘（multi 八轮子代理 A–H + open 三轮），P0=0/**P1=9**（mobile 三连：wheel-time-picker 组件级零测试 / wheel 表单写入正路径零守护 / image-viewer pinch 零守护；three-canvas onReady 三方漂移〔live defect〕；scheduling 三连：「分段绿、贯通零」——gantt undo push 可选链零执行 / calendar 换位提交通道零贯通 / kanban Ctrl+Z 消费链全盲 + 空壳 e2e；kanban WIP 卡片目标旁路〔live defect 嫌疑〕；carousel autoplay interval 契约 harness 致盲）/P2=16/P3 若干；arm2-index 登记 MA4.3 行 + 9 条 P1（累计 29 open 待 MR）；前提勘误在案（mobile 34/34 post-merge，roadmap 簇表为历史快照）。**重要反证**：C4–C7 为全仓最强梯队——bug family 73/74、引用失配 3.5%、ai engine 不变量真覆盖、四处真实跨层贯通。closure audit R1 `approved`（0B/0M/2m，精度修正随本 hunk）。零代码变更经审计员独立复验。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_7983a6fd`（R1 `approved`，0B/0M/2m）
- Evidence: 六项全过——A 残留恰为后置链 7 处；B 双风格 + P1×9 七要素 + P2×16 定级句；C 九条 P1 亲自实跑复现（m1/m2 两处精度勘正随本 hunk）+ 三扫描器独立实跑 + 泄漏 64 处复现；D 降级抽样 3 条成立 + P0 排除论证成立；E 零代码变更（5 in-scope + 2 并发线）；F 五处一致 + Evidence 未自填。

Follow-up:

- no remaining plan-owned work（MR2.0 消费 9 条 P1；MA4.5 消费空壳 e2e 裁决与 C4-C7 mutation 抽样；MG 候选见报告"建议新增的自动化检查"5 条）
