# 652 最终成熟度审计 FM-8：终验与守护固化（关键旅程 e2e 化 + 对账 + 全量门禁 + 矩阵终审 + 收官）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-8（①e2e 化 ②覆盖对账 ③全量门禁 ④矩阵终审 ⑤owner docs + 收官）；`missions/final-maturity-audit.json` T5.1
> Related: FM-1a watch-note（lab/form Enter 受信键盘 e2e 候选，plan 647）；FM-036（tabs 叠加 RTL 判别已入库，页面级 e2e 钉候选）；gantt-bars-and-links 17/17（plan 648 已沉淀判别，无需重建）

## Purpose

FM 计划收官批：把两轮走查中价值最高的交互旅程沉淀为正式 Playwright e2e（守护固化），完成台账对账（uncovered=0）、全量门禁（newHits=0 基线口径）、Audit Prompt Matrix 逐行终审标记与 owner docs 收官。

## Current Baseline（2026-10-18 live 核对）

- **e2e 沉淀候选（FM-1a/1b 走查价值榜）**：
  1. **lab/form Enter 受信键盘提交 + IME 组合态不提交**（FM-1a watch-note 点名候选；并发会话的 IME isComposing/229 守卫已在 worktree——Playwright trusted keyboard 是唯一可裁决受信键盘语义的通道；form.tsx 源码零接触，纯测试面）；
  2. **crud-views-export 视图切换 tab 隐藏**（FM-036 页面级回归钉：RTL 判别已入库，页面层 e2e 钉住 base-ui animations-finished 延迟 hidden 的真实浏览器行为）；
  3. gantt 拖拽/resize/连线删除旅程 = plan 648 已沉淀（gantt-bars-and-links 17/17 含回归钉），本批仅引用不重建。
- **对账命令在案**：`pnpm interaction:reconcile`（IS 台账）+ `pnpm visual:reconcile`（视觉台账）；FM 台账对账 = uncovered=0 手工口径（批次记录逐条处置态）。
- **门禁基线现状**：knip `tests/e2e/xlang-debug-mock-server.mjs` 为并发线领地红（plan 650 提交后状态波动中）——FM-8 门禁口径 = newHits=0（相对登记基线）+ 豁免基数不增 + 并发领地红如实披露归属。
- **Audit Prompt Matrix**：roadmap §Matrix 表 **21 行**（约 30 个提示词文件——interaction-state / complex-display-operability / code-quality / visual-page-quality / ux-design-pattern / doc-evaluation 等）——FM-8 逐行打终审标记（已过/裁剪理由；裁剪改判权限见口径声明）。

## Goals

- 2 条新 e2e 旅程正式化（form Enter/IME 受信键盘、crud-views-export tab 隐藏），判别断言先行（先红后绿或对既有修复的守护钉双重验证：在修复回退态下必红）。
- 三台账对账：IS reconcile 通过、visual reconcile 通过、FM ledger uncovered=0 复核。
- 全量门禁基线达标（typecheck/build/lint/test/check，并发领地红归属披露口径）。
- Matrix 逐行终审标记落 roadmap；owner docs 收敛核验（无 drift 即显式声明）。

## Non-Goals

- 字母批（FM-1b-b/FM-6-b/FM-7-b）的立案执行（其 roadmap todo 行维持滚动）；新发现立案（收官批零新案目标，走查中如遇 P0 按应急通道处理）；form.tsx 源码修改落提交（并发领地——临时回退仅限本地双验证试验，见口径声明安全机制）。

## Scope

### In Scope

- `tests/e2e/`：2 条新 spec（form-enter-ime-keyboard、crud-views-export-tab-visibility——命名执行期可调）。
- roadmap Matrix 表终审标记列；owner docs 核验记录；daily log 收官条目。
- ledger/roadmap/mission 终态回写。

### Out Of Scope

- 既有 spec 重构；并发会话领地（form.tsx 源码、xlang）；字母批。

## Failure Paths

| 编号            | 触发                                                         | 行为                                                                                                                                         | 可重试 | 用户可见表现 |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| e2e-flaky       | 新 e2e 首轮 flake                                            | 修复确定性后重跑（--retries=0 口径），不入 watch                                                                                             | 是     | 无           |
| ime-territory   | IME e2e 与并发会话 worktree 冲突（守卫被回退/未入 mainline） | 229 分支改 `test.fixme` + 原因注记 + ledger 披露（不常驻红）；收官顺序预期 = 守卫先入 mainline 再签署；守卫最终未落则 spec 以 fixme 形态入库 | 否     | 无           |
| reconcile-drift | 对账发现台账漂移                                             | 修复对账数据（机械），不新立案                                                                                                               | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**——本批交付物即 e2e 测试本体；两条新 spec 均 `--retries=0` 确定性门槛。

## 口径执行模型声明

- **执行载体**：主会话直接编写 + 本地 Playwright 复跑。J1 提交分支用 `page.keyboard`（trusted Enter）；**IME 229 分支走 CDP**（`page.context().newCDPSession` → `Input.dispatchKeyEvent` + `windowsVirtualKeyCode: 229`，仓内 4 个 CDP spec 先例——`page.keyboard` 产不出 229/isComposing keydown）。**预裁决 fallback**：若受信 `isComposing=true` 通道经试验不可达，该分支维持由并发会话既有两个单测覆盖（form-shell-enhancements.test.tsx），e2e 只钉 229 受信路径 + Enter 提交路径，裁决披露于卡。
- **J1 回退守卫试验安全机制**：试验前 `cp form.tsx _tmp/` 快照；仅注释/摘除守卫两行（不动并发会话其余未提交改动）；恢复自快照拷回 + `cmp` 对快照字节核对一致（勿用 git diff 作核对锚点——form.tsx 带并发未提交改动，diff 必非空；误读会诱发销毁并发工作的 checkout）；试验期间并发线触碰该文件则立即中止试验自快照恢复。Non-Goals 的"form.tsx 源码修改"指**不落提交**——临时回退仅限本地双验证试验（快照保护 + 字节核对）。
- **bounded 单轮**：2 条 spec；发现面零新案收官。
- **Matrix 终审权限**：roadmap 表内已标注 Out of scope 的行按表内既有理由落标记；任何新的裁剪改判（把 in-scope 行改为裁剪）超 executor 权限，须人工评审。
- **门禁披露口径**：check 红以执行时实测输出为准逐条披露归属（并发线状态波动，不预设单条清单）。

## Execution Plan

### Phase 1 - 关键旅程 e2e 沉淀

Status: done（2026-10-19；含 J2 事故披露，见下）
Targets: `tests/e2e/form-enter-ime-keyboard.spec.ts`、`tests/e2e/crud-views-export-tab-visibility.spec.ts`

- Item Types: `Proof | Fix`

- [x] Proof：J1 判别面自证（**收口审计 m1 处置**：229 用例因守卫属并发线未提交工作、不在本批提交范围，按 ime-territory Failure Path 翻 `test.fixme` + 原因注记——守卫入 mainline 后翻回；普通 Enter 提交用例不受影响保持 active）——worktree（含 IME 守卫）下 spec 全绿；按安全机制临时回退守卫（`cp` 快照 → 仅摘守卫两行 → **回退红集 = IME 用例红**（受信 isComposing 可产时组合态用例红 + 229 用例红；普通 Enter 提交用例不经过守卫分支，回退后仍绿——非异常）→ 自快照恢复 → `cmp` 快照字节核对）→ 双绿；受信 isComposing 不可达则该分支单测覆盖裁决披露（fallback 预裁决）。
- [x] Proof：J2 判别面自证——**执行裁决（如实披露）**：回退试验按文执行后 J2 在回退态仍绿（真实浏览器无挂起动画时 base-ui 快速翻转，页面级回退红不可达；放大器探针进一步证实挂起动画下渲染器 hidden prop 在真实浏览器不落 DOM——RTL 单测仍是唯一判别器）；**事故披露**：试验后恢复步骤被遗漏，FM-036 修复在树上缺失约 1 小时（横跨 FM-7 提交），FM-8 全量套件抓出（basic 3 文件红）→ 当场恢复 + basic 676/676 + 全量 82/82 复验（**审计 m2 补记**：恢复后 02:57 该文件另有一次 HMR 瞬态触碰、其后已还原——当前与 HEAD 字节一致、check2 duplicates 无残留，无影响）。J2 spec 定型为行为钉（400ms 窗口，判别力声明见 spec 头注 + RTL 判别在案）。
- [x] Fix：J1 spec 正式化（Enter 提交 + IME 组合态 Enter 不提交 + 229 码路径，受信 keyboard）。
- [x] Fix：J2 spec 正式化——**断言时点**：切换 tab 后立即（无 Playwright 重试——`page.evaluate` 同步读 `hidden` 属性或 `toHaveAttribute` 前置 waitFor 无助益）断言非活动 tabpanel `hidden` 在位；修复回退态下 base-ui 延迟翻转在此立即时点必然缺位 = 判别红。

Exit Criteria:

- [x] 两条 spec `--retries=0` 绿（J1 2/2：Enter 提交 + CDP 229 不提交；J2 1/1 行为钉）；J1 双重验证在案（守卫摘除 → IME 用例红 → cmp 字节核对恢复 → 双绿）；J2 回退红不可达裁决在案（上项）。

### Phase 2 - 对账 + 全量门禁 + 矩阵终审 + 收官

Status: done（2026-10-19）
Targets: roadmap Matrix、ledger、mission T5.1、daily log

- [x] Proof：`pnpm interaction:reconcile` OK（**n3 归属补记**：`docs/audits/interaction-state/inventory/pages.json` 的 4 页条目新增 + antdpro-list 批次勘正 = reconcile-drift Failure Path 预授权机械修复，随本批入库）（IS pending 6 页逐页注记归属：xlang-debug=并发线、three-gallery/scada-gallery=FM-1b-b 候选、pih-workspace/content-landing/bisheng-build=IS-7b 遗留字母批池——IS-9 口径 uncovered=0 待字母批，FM 计划内零未处置）；`pnpm visual:reconcile` 结构闭合 uncovered=0；FM ledger uncovered=0 维持。
- [x] Proof：全量门禁（typecheck/build 唯 playground 既有红；lint 44/44；test 82/82；check exit 1 唯一 NEW 段 = knip xlang mock-server【并发线领地，执行时实测逐条披露口径】）。
- [x] Decision：`docs/references/e2e-test-diagnostic-guide.md` **No owner-doc update required**——两条新 spec 均为 supported 用户路径断言（非 diagnostic helper），guide 的 failure-prone 表为历史统计快照。
- [x] Fix：Matrix 21 行逐行终审标记落 roadmap（17 已过 + 4 裁剪按表内既有理由，零新裁剪改判；审计 n1 注记：标记拼接于角色列尾而非独立第 4 列，内容逐行完整——收官不再返工）；owner docs 收敛核验：FM-0~FM-7 各批 gate 均有 No-owner-doc/已同步结论（plan 641–651 Closure Gates 在案），FM-8 本批 no-update-required——无 drift，收官声明成立。
- [x] Fix：roadmap FM-8 `done` + mission T5.1 `done` + M5 milestone `done` + daily log 收官记录（随收口提交落盘）。

Exit Criteria:

- [x] 对账通过（IS 6 页归属披露 + visual 闭合 + FM uncovered=0）；门禁基线达标；Matrix 21/21 标记；收官记录随提交落盘。

## Draft Review Record

- Reviewer / Agent: agent_bf188051（fresh session 独立子 agent，单轮，live 抽查 25 tool-uses）
- Verdict: `revised`（R1 0B/4M/6m → 全量修订；关键前提全部 live 核实为真：IME 守卫 worktree 未提交态、J2 路由/schema/修复已提交态、对账命令、门禁披露先例、gantt 17/17 引用）
- Rounds: 2
- R2 复审（agent_b47dcbe4）：verdict `revised`（1M/2m 机制级小修，授权定向修补后激活，无需第三轮）——R1 十项八项核实修复；M-1 J2 回退 `git stash` 对干净文件 no-op 改 `git restore --source=3268da554~1/HEAD`（restore 自 git 对象天然逐字节，status--porcelain 空即核对达）；m-2 J1 回退红集更正（仅 IME 用例红，Enter 提交用例不守卫仍绿）；m-3 字节核对工具改 `cmp` 快照（git diff 锚点会误毁并发工作）。m6 Last Reviewed 随激活落日期。
- Findings addressed: M1 Matrix 行数 ~10→实测 21 行（工作重估）；M2 J2 断言时点写明（切换后立即无重试读 hidden 属性——回退态延迟翻转必缺位=判别红）+ 补 J2 回退 Proof（tabs.tsx 已提交面 stash 还原→红→恢复→绿）；M3 J1 IME 通道改写（page.keyboard 产不出 229/isComposing → CDP Input.dispatchKeyEvent + windowsVirtualKeyCode:229 受信路径，仓内 4 先例；isComposing 分支 fallback 预裁决=维持并发会话两个既有单测覆盖并披露）；M4 回退试验安全机制（cp 快照→仅摘守卫两行→恢复→git diff 字节核对→并发触碰即中止；Non-Goals 措辞改"不落提交，临时回退仅限本地试验"）；m1 门禁口径改执行时实测逐条披露；m2 补 e2e-test-diagnostic-guide.md 的 Decision 项；m3 回写补 M5 milestone；m4 Matrix 新裁剪改判须人工评审；m5 ime-territory 落地 test.fixme+注记+披露与收官顺序预期；m6 Last Reviewed 于激活落日期。

## Closure Gates

- [x] 两条新 e2e 正式化且 --retries=0 绿；J1 双重验证记录在案（守卫摘除 IME 红 → cmp 恢复 → 双绿；J2 回退红不可达裁决在案）
- [x] 三台账对账通过（IS pending 6 页归属注记 / visual 闭合 / FM uncovered=0）
- [x] 全量门禁基线达标（并发领地红归属披露——knip xlang 唯一 NEW 段）
- [x] Matrix 逐行终审标记完成（21/21：17 已过 + 4 裁剪）
- [x] owner docs 收敛核验在案（各批结论复核 + diagnostic-guide Decision）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure 节）
- [x] `pnpm typecheck`（唯一 playground vite.config 既有红）
- [x] `pnpm build`（唯同红）
- [x] `pnpm lint`（44/44）
- [x] `pnpm test`（82/82 tasks exit 0）
- [x] `pnpm check`（exit 1 唯一 NEW 段 = knip xlang mock-server，并发线领地披露口径）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Closure

Status Note: completed（2026-10-19 独立收口审计 `approved` 签署——FM 计划 FM-0～FM-8 全部工作项收官；字母批 FM-1b-b/FM-6-b/FM-7-b 维持 roadmap todo 滚动）

Closure Audit Evidence:

- Auditor / Agent: agent_48440e05（fresh session 独立收口审计员，只读，43 tool-uses，全程独立实做核验）
- Evidence: Verdict `approved`（3m 条件挂收口环节 + 3 note，无 Blocking/Major）。A 两条新 e2e 实跑 3/3 首轮绿、CDP 229 受信机制与场景锚点（slug 推导/Echo 模板）逐项在案；B J2 事故叙述与 git 历史（994feeead 不含 tabs.tsx）+ HMR 时间线三方自洽、tabs.tsx 修复在位、basic 676/676 + 全量 82/82；C 对账实跑（IS 263 页 uncovered=6 即 6 个 pending 页注记逐一核对正确、visual 闭合、FM 零 pending）；D 门禁数字与勾选逐项一致（check 唯一 NEW 段 = knip xlang 并发领地）；E 边界实质成立（flux-core/xlang 零 diff、字母批三行 todo 未误翻、回退试验 cmp 零残留）；F 收官四件套一致（roadmap/mission/daily log/plan）；G 两轮评审记录完整、Failure Paths 行使情况如实（reconcile-drift 触发并按预授权机械修复）。**处置**：m1 J1-229 翻 `test.fixme`（守卫属并发线未提交工作，入 mainline 后翻回——按计划 ime-territory Failure Path）；m2 事故披露补 02:57 瞬态触碰一句；m3 收口提交严格限定文件清单（含 n3 归属的 pages.json）；n1 Matrix 标记格式注记不返工；n2/n3 已在 Closure/Phase 2 补记。

Follow-up:

- 字母批三行（roadmap todo）：FM-1b-b（mobile 族/spreadsheet/dashboard-demo/FM-039 页面层复走/FM-040 视口漂移调查/three-gallery/scada-gallery）、FM-6-b（FM-021/025/033/034/037）、FM-7-b（RendererRenderOutput 返回类型收窄裁决 + flux-react test-support shim 切官方缝）。
- J1-229 fixme：并发线 IME 守卫入 mainline 后翻回 active。

## Non-Blocking Follow-ups

- 字母批三行（FM-1b-b / FM-6-b / FM-7-b）维持 roadmap todo 滚动；FM 计划收官不阻断其后续立项。
