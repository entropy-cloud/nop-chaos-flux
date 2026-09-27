# QA.5 集成审计 #4 — missing-components（gate = L5 完成）

> Auditor / Agent: 独立 fresh 子 agent（QA.5 集成审计员，2026-09-27，与 plan 522 执行/closure 会话无关）
> 审计对象: E6/E9.2 包络 benchmark 复测（3 条 primary 实跑核对 ≥30fps@≤1k / <100ms / ≤320MB）；SCADA 编辑态 e2e 谱实跑（interaction-correctness 7 + plan522 5）；双态隔离不泄漏复核（`editor-session.ts` R5 三层 + plan 522 preview 门控：edit 态注入 no-op / touched 快照还原 / station load 在 preview 的行为裁定 + focused 单测）；plan 522（L5.3/L5.4/L5.5）交付铁律核对；roadmap §13 L5 行回写准确性
> 审计基线: HEAD `fe5636a09`（521 L5 收口 + 516-519 retrofit 已入库）。**工作树含 plan 522 全批次未提交改动**（L5.3 binding-panel / L5.4 template·station / L5.5 preview + 三份设计文档 + i18n + e2e spec + roadmap/dev log 回写，`git status` 32 M + 12 ??）——522 即本 gate 审计对象本身，全部 live 核对在工作树实跑（有效性证据：被审行为未提交恰是本审计要钉住的状态），归因处用「HEAD worktree 对照」消化（见 §6）
> 审计依据: `docs/backlog/missing-components-and-designer-roadmap.md` §11 QA.5 行（Pass = benchmark 达标 + e2e 全绿）/ §13 L5 行；`docs/components/industrial-hmi-editor/design-renderer.md` §4.2（R5 三层）/ §13（plan 522 增补节）；`docs/plans/522-missing-components-l5-scada-design-completion-plan.md`（completed）；`docs/audits/00-audit-execution-guide.md`（Pass = 0 Blocker 且 0 Major）；格式先例 `QA.4-integration-audit.md`
> 审计输入: Fresh Context 三件套（审计依据文档 + live 仓库 + 实跑验证输出），未读执行会话历史

## 1. E6/E9.2 包络 benchmark 复测（实跑）

命令：`npx playwright test tests/e2e/scada-editor-perf.spec.ts --reporter=list` → **3 passed（25.6s，exit 0）**，程序化断言零截图，与 `editing-envelope-2026-08-06.md` §3 裁定建议值逐项对照：

| 包络                                       | 阈值   | 实跑值（本次审计）                                                                                        | 结论 |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------- | ---- |
| ① 拖拽响应 fps @ 选区 1k（primary 包络）   | ≥30fps | 3 采样 60.4 / 60.6 / 60.7，best **60.7fps**（headless 3 采样取最大口径，与 scada-perf 同规）              | ✅   |
| ② 编辑操作 per-call 响应延迟（n=100/1000） | <100ms | n=100 max **6.5ms**（align 4.2 / distribute 0.1 / zOrder 6.5 / copy 0 / paste 4.6）；n=1000 max **6.8ms** | ✅   |
| ④ 编辑器内存（1k 图元场景，CDP JS heap）   | ≤320MB | **66.1MB**（HeapProfiler.collectGarbage + 3 次取最小）                                                    | ✅   |

- 三项全部留有 `[PERF-EDITOR]` 数值输出（非仅 pass 态），余量巨大（fps 2 倍于下界、延迟 <7% 上界、内存 21% 上限），E9.2 复测报告（`editing-envelope-retest-2026-08-07.md`）primary 档结论在本审计时点**可复现成立**；L5.7「primary 数值化达标」行的依据经本次独立实跑再钉一次（R7 人工确认维持 roadmap 登记口径，不在本审计改判范围）。

**本项结论：E6/E9.2 三条 primary 包络全部达标，benchmark 复测可复现。**

## 2. SCADA 编辑态 e2e 谱（实跑）

命令：`npx playwright test tests/e2e/scada-editor-interaction-correctness.spec.ts tests/e2e/scada-editor-plan522.spec.ts --reporter=list` → **12 passed（27.5s，exit 0，首轮全绿零 flaky 零重试）**：

| spec                    | 条数 | 覆盖面                                                                                                                                                                                                                        | 结果   |
| ----------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| interaction-correctness | 7    | #40 canvas 不重叠兄弟面板 + #1 连线拖拽不平移视口（plan 2026-08-08-0900-1 Phase 4 两交互正确性项）；plan 521 W7 叙事 5 条（W1 连线写入 / W7 undo 往返 / U1-U3 弹层+clipboard / W4+U4 statusBar+受控切换 / W2+W3 save+export） | ✅ 7/7 |
| scada-editor-plan522    | 5    | L5.3 绑定面板结构化行写入→save 序列化可见；L5.4 模板保存→插入 id 自增 + 建站建画面→切换多文档往返；L5.5 previewMock 自动注入+切回 edit 还原+edit 态注入门控（R5 #5）+ `component:previewInject` 动作通道                      | ✅ 5/5 |

- 与 roadmap §13 L5.1 行「M2M3 e2e 新增 5 条（spec 共 7）」及 plan 522 Phase 3「e2e spec 5 条叙事断言」的条数口径逐一相符（7+5=12）。
- plan522 spec 含 remount-safe 句柄挂载轮询（:25-40）与正弦波形等值竞态消解（:220-232 注释），断言语义与 design-renderer.md §13.4 不泄漏验证第 5 项对齐。

**本项结论：SCADA 编辑态 e2e 谱 12/12 全绿，Pass 标准「e2e 全绿」满足。**

## 3. 双态隔离不泄漏复核（live 核对 + focused 单测）

### 3.1 R5 三层（editor-session.ts + 既有契约）

| 层                 | live 落点                                                                                                                                                                                                        | 结论 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 图元 editable 开关 | 引擎按 mode 注入（`editor-engine.ts` applyDiff/build 以 `this.mode === 'edit'` 决定 editable）；`rg "editable" serialization/` = **0 hit**（editable 不进序列化，§4.2 不泄漏验证 #1 复核通过）                   | ✅   |
| 编辑会话组态分离   | `editor-session.ts:81-82` working copy/committedBaseline 均 `cloneConfigSnapshot` 深克隆；`:42` undoStack 域内部 ref 不进 scope；`:56` 公共投影 `ScadaEditorSessionPublic = Omit<..., 'undoStack'>` 不泄漏实现类 | ✅   |
| 事件派发链隔离     | design-renderer.md §4.1/§4.2 契约在案（Editor 事件族只入栈、不派发 `symbol:*`）；canvas 双 slot marker 隔离（`scada-editor-canvas` vs 运行态 `scada-canvas`）                                                    | ✅   |

### 3.2 plan 522 preview 门控（第四条不泄漏保证，§13.2/§13.4）

| 审计点                             | live 落点                                                                                                                                                                                                                                                                                                                                                                    | 结论 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| edit 态注入 no-op                  | `preview-data-injector.ts:62-67` `inject` 首行 `currentMode !== 'preview'` → 返回 0；单测 `preview-data-injector.test.ts:91-95`（0 应用 + 零 patch）+ e2e plan522 `:262-268`（edit 态 inject 返回 0）                                                                                                                                                                        | ✅   |
| touched 快照还原                   | `:45` touched Map（nodeId → 属性 → 注入前原值）；`:183-189` 首触记录（等值短路 :182 不记）；`clear()` :76-84 按 originals 生成 updated patch 还原；`onModeChange('edit')` :90-98 stopMock + clear；单测 `:118-125`（fill/opacity/text 全还原）+ `:150-170`（preview→edit 停模拟+还原）                                                                                       | ✅   |
| 注入永不触碰 working copy / 序列化 | injector 只走 `engine.applyDiff({added:[],removed:[],updated})` **不传 nextConfig** → `editor-engine.ts:243` `if (nextConfig)` 才更新引擎 config 模型（纯视觉态）；`serializeScadaConfig(session.workingConfig)` 读 working copy（injector 零写入）；单测 `:106` 显式断言「working copy 不被触碰」                                                                           | ✅   |
| 程序化通道 preview 门控            | `runtime-mutators.ts:49-53` `editingBlockedInPreview` 罩住 writeConnection / updateWorkingNode / addWorkingSymbol / removeWorkingSymbol / undo / redo / groupSymbols / ungroupSymbols 八写入口（闭合 test handle / clipboard paste / undo-redo 句柄通道）；读/选择/模式/存取通道（setSelection/clearSelection/switchMode/save/load）按注释裁定不门控                         | ✅   |
| station load 在 preview 的行为裁定 | load 不门控 → `resetSession`（`editor-session.ts:93-98`）把 session.mode 重置回 edit + `runtime-mutators.ts:328-330` build 后 engine.mode 校正对齐（不脱钩）；裁定被 focused 单测钉住：`runtime-mutators-guards.test.ts:116-124`「load rebuilds and re-syncs engine mode to session mode when loading in preview」（session.mode='edit' + engine.currentMode='edit' 双断言） | ✅   |
| switchMode ↔ 注入器联动            | `runtime-mutators.ts:268-278` switchMode 调 `ctx.previewData?.onModeChange(mode)`（edit → 停模拟+还原；preview → 声明开启自启模拟）；`use-editor-engine.ts:208-218` 注入器装配 + previewMock 声明回读 + 初始即 preview 时自启；`:343-350` 声明变化同步                                                                                                                       | ✅   |
| mock 模拟源边界                    | 确定性正弦 42..78（`:147-163`，与 §13.5「非真实协议接入」一致）；startMock 幂等（双启动不叠定时器，单测 `:198-229`）；未声明点入 store 即弃（`:140-148` 无害语义）                                                                                                                                                                                                           | ✅   |

- **测试句柄面**：`editor-test-handle.ts:58-64` preview 子面（inject/clear/mockStart/mockStop + isMockRunning 消费）+ `use-editor-handles.ts:40-41/:219/:227` `previewInject`/`previewClear` 入 ALL_HANDLE_METHODS + invoke 分支——§13.3 契约增补两处接线全在。
- **focused 单测 live 复跑**：`npx vitest run src/editor/inspector/binding-panel.test.tsx src/editor/station src/editor/template src/editor/preview` → **6 files / 74 tests passed**；全包 `pnpm --filter @nop-chaos/flux-renderers-industrial test` → **134 files / 1611 passed（exit 0）+ Branches 91.51%**（≥90% 门禁达标，覆盖率与 roadmap 行一致）。
- 边缘路径留痕见 §7 Observation-1（load-in-preview 绕过注入器模式联动——非泄漏、非本 gate 阻断项）。

**本项结论：R5 三层 + preview 第四条不泄漏保证全部 live 成立，注入零触碰 working copy/序列化/undo 栈，三件行为裁定均有 focused 单测钉住，双态隔离不泄漏复核通过。**

## 4. 交付铁律核对（L5.3/L5.4/L5.5，plan 522）

| 铁律项           | 核对结果                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 结论 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| ① 设计文档       | `design-binding-panel.md`（v1，2026-09-26，D1 上游 gap audit §4.3，binding/state 结构化契约 + animations/events 维持 json-editor 的 O1 边界）；`design-template-station.md`（v1，D2，模板=ScadaSymbolNode[] 片段/画面=serializedConfig/存储归宿主 storage 回调，serialization 零新增格式）；`design-renderer.md` §13（13.1 host 入口 / 13.2 注入契约 / 13.3 schema 增补 / 13.4 不泄漏验证 #5 / 13.5 边界）——三份齐、无待定、与实现零 drift（抽查：widget 枚举 binding-editor/state-editor = `symbol-types.ts`；`previewMock` = `schemas.ts:62` + `renderer-definitions.ts:91/:186` fields 注册 `{ kind: 'prop' }`） | ✅   |
| ② example + 入口 | `apps/playground/src/pages/scada-editor-demo.tsx`：`previewMock: { intervalMs: 800 }` + demo-live-text 绑定 tank_level + template/station 内存 storage 注入 + `editor-btn-inject` 演示按钮；入口 `#/scada-editor-demo` 沿用 521 登记，e2e 5 条全在 demo 页跑通                                                                                                                                                                                                                                                                                                                                                      | ✅   |
| ③ 代码 + 测试    | `inspector/binding-panel.tsx`(568) + `template/`×4 + `station/`×4 + `preview/`×2 + guards 单测 + test-handle preview 子面；industrial 1611/1611 + tsc 0 错 + Branches 91.51%（live 实测）                                                                                                                                                                                                                                                                                                                                                                                                                           | ✅   |
| ④ 登记           | `editor/index.ts:20-26` 导出 template/station/preview 类型 + `createInMemory*Storage`；roadmap §13 :237 done 行；dev log 09-27 §522 三件明细节；check 链 `schema-prop-coverage`/`scada-symbol-keys` exit 0（props 契约面无漏登）                                                                                                                                                                                                                                                                                                                                                                                    | ✅   |
| ⑤ i18n           | `check-i18n-keys` **exit 0**（0 undefined key；zh/en parity 由 checker 双语互查强校验）；**QA.4 Observation-2 的 57 个暂态 undefined key 已随 522 locales 批次全部消解**（zh-CN.ts 1726→1802 行 / en-US.ts 1729→1800 行）                                                                                                                                                                                                                                                                                                                                                                                           | ✅   |
| ⑥ 前置裁决       | O1 动作绑定编辑器边界（animation/event 维持 json-editor）在 plan Non-Goals + design-binding-panel §1 双处登记；宿主持久化归 storage 回调（demo 内存 store）边界在 design-template-station §1 明示                                                                                                                                                                                                                                                                                                                                                                                                                   | ✅   |
| ⑦ 审计           | plan 522 Closure Audit Evidence 在案（独立 fresh 子 agent，approved 0B/0M/3m，3m 簿记清零含 m4 补测）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | ✅   |
| ⑧ full-green     | 本审计实跑：industrial+i18n typecheck 0 错、check 链 EXIT=0、定向 e2e 12/12 + perf 3/3、focused 74/74；plan Closure Gates 自记 typecheck/build/lint/test/check/test:e2e 全勾（build/lint 未由本审计重跑，见 §7 口径注记）                                                                                                                                                                                                                                                                                                                                                                                           | ✅   |

**本项结论：L5.3/L5.4/L5.5 三件交付铁律八项全在案，设计文档↔实现抽查零 drift，i18n 欠账（QA.4 遗留观察项）已消解。**

## 5. roadmap §13 L5 行回写准确性

- **:237（L5.3/L5.4/L5.5 → done，522）**：结构化描述逐项与 live 相符——「实例化复用 clipboard 管线 id 自增+connection 重写」= `template-model.ts:61-72`（buildClipboardCopy/Paste 复用 + `resolveUniqueNodeId` 同族碰撞自增）；「画面切换=save→load」= station-dialog + `runtime.load`（e2e 往返断言绿）；「存储归宿主注入回调」= `ScadaTemplateStorage`/`ScadaStationStorage` + demo 内存 store；「PointStore+BindResolver 复用、preview 门控、touched 快照还原、previewMock 模拟源、previewInject/previewClear 句柄」= §3.2 全表；「Branches 91.51%」「e2e plan522 spec 5/5」「closure audit approved」均经本审计实跑/在案复核。**唯「industrial 1608 测试绿」数字滞后**：live 实测 1611（closure audit m4 补测 ×3 在 1608 记录之后落盘，lineage 在 plan Draft Review Record 可溯但数字未随刷新；dev log 09-27 验证段还停留在批次中途口径 1550 + 「未 commit」）→ Minor-2。
- **:236（L5.1–L5.2 + L5.6 → done，521）/ :235（L5.0 → done）/ :238（L5.8 demand-gated）**：QA.4 时点已核或属 demand-gated 登记，本次无新 drift。
- **§4 线状态表 L5 行 `todo`**：列头为「初始状态」（历史初始值非当前态），非回写缺陷。
- QA.2–QA.6 行「QA.5 gate=L5 完成（待 522）」——待本审计后由编排层/执行 session 回写，本审计不代写（沿 QA.4 先例）。

**本项结论：§13 L5 回写结构准确、行为描述零 drift；1 处测试计数台账滞后降级为 Minor-2 簿记项。**

## 6. `pnpm check` 复跑（工作树实跑 + HEAD worktree 对照归因）

全链实跑（工作树）：**EXIT=0**（15 sub-check 全过，含 `check-i18n-keys` exit 0——QA.4 时点唯一红已消解）。

- **oversized 计数漂移归因**（沿 QA.4 同法：`git worktree` 挂 HEAD `fe5636a09` 临时树实跑对照，事后已移除、未触碰工作树）：HEAD = **206w**/2e/2exempt（与 QA.4 在册口径一致）；工作树 = **207w**/2e/2exempt。逐条 diff 定位新增 warn 唯一文件 = `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx: 507`（HEAD 481 行，522 批次 +29/-4 toolbox 按钮/弹层接线后越过 500 warn 线）——100% 归因 plan 522 批次。2e 仍为 flux-i18n locales 双文件在册豁免（豁免事由本批次恰好强化：locales 因补 522 键继续增长，豁免登记完整覆盖）。
- **前瞻欠账**：522 批次**未跟踪新文件** `inspector/binding-panel.tsx` 实测 **568 行**（>500）——checker 走 `git ls-files` 只扫 tracked 文件，当前不可见；**commit 时点起将使 warn 计数再 +1（207w→208w 投影）**。其余新文件全部 <500（template/station/preview 最大 307）。→ Minor-1。

**结论：check 链当前 exit 0、无 i18n 红；oversized 相对在册 206w 已 +1（522 已跟踪文件）且 commit 时点将再 +1（522 未跟踪文件），台账须随 522 收口批次登记/拆分（Minor-1）。**

## 7. Findings

**Blocker：无。Major：无。**

### Minor-1 oversized 台账漂移：在册 206w → 实跑 207w，且 commit 时点投影 208w（均 plan 522 批次）

- 位置：+1 = `scada-editor-canvas.tsx`（507 行，522 接线 +29 行后越线，tracked、当前 warn 可见）；投影 +1 = `binding-panel.tsx`（568 行，untracked、commit 后进入 warn 集）。AGENTS.md 要求新增 hit split/register before finishing；两文件分别属「弹层接线面」与「绑定面板单组件面」，均有可拆分维度（弹层接线 → toolbox 子模块；binding-panel → state-editor 子组件）。
- 影响：warn 档不翻 exit（check 链 EXIT=0 不受影响），但「在册口径」须准确——与 QA.4 Minor-1（205w→206w，toolbox-panel.test.tsx）同链第三跳。
- 建议：随 522 commit 批次二选一——拆分两文件，或按豁免机制登记 + 台账（roadmap/dev log）统一改 208w 口径并追溯 QA.4 Minor-1 的 206w 旧账。**登记 QA.7 ⑥ 残余债登记册。**

### Minor-2 测试计数台账三层漂移：dev log 1550 / plan+roadmap 1608 / live 1611

- 位置：dev log 09-27 §522 验证段「vitest 1550/1550（132 文件）」为批次中途口径（补测 +58 与 m4 +3 落盘前）且「未跑全量 e2e，未 commit」表述已过时；plan :78/:127 与 roadmap :237 记 1608（closure 时点）；live 实测 **1611/134 files**（+3 = closure audit m4 station-model 辅助函数补测 ×3，lineage 在 plan Draft Review Record 可溯，仅数字未回刷）。
- 影响：权威面（roadmap/plan）差 +3、dev log 差 +61，均不改变「全绿 + Branches 91.51% 达标」的结论，但违背「在册口径须准确」纪律（QA.4 Minor-1/Minor-2 同类簿记）。
- 建议：随 522 commit 批次一行勘误——roadmap :237 与 plan :78/:127 改/注 1611，dev log 验证段补 closure 终态句（1611/1611 + e2e 全量口径）。**登记 QA.7 ⑥ 残余债登记册。**

### Observation-1 load-in-preview 绕过注入器模式联动（边缘路径，非泄漏）

- 链条：preview 态注入产生 touched + mock timer → 程序化 `load`（station 切画面/host load）不门控 → `resetSession` 把 mode 静默重置为 edit（既有契约，522 前已存在）+ engine mode 校正，但**不经过 `switchMode`** → `previewData.onModeChange('edit')` 不触发：mock timer 存活（tick 被 inject 门控挡为 no-op，无视觉副作用）、touched 快照跨 engine.build 存活；此后若 host 在 edit 态调 `previewClear`，且新旧场景存在同 id 图元，stale originals 会作为 updated patch 重放（仅视觉态，working copy/序列化/undo 栈零涉及，下一轮 rebuild 即愈）。
- 定性：R5 四条不泄漏保证（working copy/baseline/undo 栈/序列化）全部不受影响；属 §13.4 未裁定的 pathological 序列（load 已隐式退出 preview，规范 host 应经 onModeChange/句柄清理）。建议登记 QA.7 ⑥：后续触碰 editor 时给 load 路径补 `previewData` 清理联动或在 §13.4 补一句裁定，现状不阻断。

### Observation-2 设计文档簇内链缺失（纯文档卫生）

- `design-binding-panel.md`/`design-template-station.md` 目前仅被 plan 522/roadmap/dev log/彼此引用；`design-renderer.md` 头部上游清单与 `design-architecture.md`/`design-property-panel.md` 均未回链两份新档（binding-panel 单向声明上游 property-panel）。后续触碰该簇时顺手补链即可，不单列 gate 要求（QA.4 Observation-1 同型）。

### Observation-3 「全绿」与验证口径留痕

- ① 本审计实跑的 perf/e2e 均首轮零重试全绿（无 flake 消化需求）；② build/lint 未由本审计重跑（gate Pass 标准 = benchmark 达标 + e2e 全绿，两者均实跑满足；typecheck/check/单测已实跑补强），plan Closure Gates 自记 build/lint 勾选维持登记口径；③ dev log 09-27 提及的 playground-entry cold-start flake 经执行会话 HEAD stash 对照判为先在问题，本审计两轮 e2e 实跑未复现（非 QA.5 范围 spec），留痕不追。

## 8. Verdict

**pass**（0 Blocker / 0 Major / 2 Minor + 3 Observation）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。两项 Minor 均为簿记类（oversized 台账 + 测试计数口径），登记 QA.7 ⑥ 残余债登记册并建议随 522 commit 批次当场消化，不阻断本 gate。
- 五项审计内容逐项结论：①E6/E9.2 三条 primary 包络实跑全达标（60.7fps / 6.5·6.8ms / 66.1MB，§1）；②SCADA 编辑态 e2e 谱 12/12 实跑全绿 exit 0（7+5，§2）；③R5 三层 + plan 522 preview 门控（edit 态 no-op / touched 还原 / station load 裁定）live 逐条成立 + focused 单测 74/74、全包 1611/1611 + Branches 91.51% 实测（§3）；④L5.3/L5.4/L5.5 交付铁律八项齐、i18n 欠账消解（check-i18n exit 0，QA.4 Observation-2 闭环）（§4）；⑤roadmap §13 L5 行回写结构准确、唯测试计数滞后（§5）；⑥check 链 EXIT=0、oversized 漂移逐条归因 522 批次（§6）。
- Minor-1（oversized 207w→commit 投影 208w）/ Minor-2（测试计数 1550/1608/1611 三层漂移）登记 QA.7 ⑥；Observation-1（load-in-preview 注入器联动边缘）登记 QA.7 ⑥ 供后续裁定；Observation-2/3 留痕无动作。
- QA.5 集成审计 #4 通过，L5 线出口获集成审计背书；roadmap §11 QA.5 行与 §13 QA.2–QA.6 行的状态回写由编排层/执行 session 执行（本审计不代写）。
