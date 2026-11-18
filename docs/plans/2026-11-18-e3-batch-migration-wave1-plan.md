# E3 批量迁移 Wave 1（驱动能力补齐 + 双引擎对照 + 批次 1 ≤20 spec）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-test-backend-design.md（§5.2 T2 批量迁移、§5.4 覆盖缺口、§3.3 Console 增强）、docs/research/2026-11-17-flux-debugger-roadmap.md E 轨道 E3
> Related: docs/plans/2026-11-18-e2-test-console-v1-plan.md（completed）、docs/plans/2026-11-18-e1-flux-test-backend-foundation-plan.md（completed）

## Purpose

E3 总目标（双引擎 CI + 批量迁移 + Console 增强）远超单个 plan 可收口面。本 plan 承接 E3 的第一波：① 补齐 E2 试点实测的兼容层缺口（Playwright 风格 web 断言 shim、嵌套 locator、boundingBox、键盘组合键、mouse 拖拽序列、viewport 设置、kernel 页面错误断言 helper）；② 提供机械迁移 codemod + 双引擎对照台账（Playwright 为 oracle）；③ 完成批次 1（≤20 spec）"引擎替换→语义重写"迁移（新全绿 + 旧删除同 commit）。剩余批次以后继 plan 排队（见 Deferred/Successor）。

## Current Baseline

- E2 已收口：Console v1 + T0 试点 2 spec（`boolean-control-value-contract`、`ai-chat-ux-visual`）迁移完成，存量 Playwright spec 245 个。
- 驱动现状（flux-test-driver）：`ft` 全局（goto/reload/byCid/dispatch/waitFor/scope/snapshotAt/screenshot/evaluate/locator/getByTestId）；Locator 子集（click/dblclick/fill/type/press/hover/text/innerHTML/attr/isVisible/isEnabled/count/nth/first/waitFor；真实输入 hover/click 经 gateway `input.*` → CDP）；`ft.expect` 语义骨架（cid.meta/prop/rendered/not.rendered、scope.toEqual、event.ended、snapshotPath）。无 web 断言 shim（toBeVisible/toContainText/toHaveAttribute 等）、无嵌套 locator、无 boundingBox、无 last()、无键盘 Chord、无 mouse 拖拽、无 setViewportSize。
- 245 spec API 分布（grep 实测）：goto 220 / locator 230 / evaluate 138 / waitFor 113 / keyboard 85 / mouse 41 / viewportSize 48 / expect.poll 21 / screenshot 17 / download|clipboard 17 / request 1 / frameLocator 1。
- 试点实测缺口清单（design doc §5.1 勘误附注，6 条）：嵌套 locator、元素级 evaluate、getByRole name 过滤、键盘组合键 Chord、mouse 拖拽序列、viewport 投影；`waitForValue` 兜底待语义重写。
- 迁移铁律：每 spec "新全绿 + 旧删除"同 commit；断言强度不得降级；终态无 DOM 判断（例外白名单：视觉截图/axe/真输入/跨 tab）。

## Goals

- 驱动能力补齐后，批次 1 内 spec 的引擎替换步骤以 codemod 起步、逐 spec 精修：Playwright 风格 web 断言在 flux 引擎下等价重试语义（timeoutMs 默认 5s，重试到超时）。判别性基线：E2 试点 `boolean-control-value-contract` 的 poll→stability 升级为规范先例——每 spec 迁移必须至少含一处"旧实现下会假绿、新实现下严格"的升级点（如 retry 断言换 stability 门控、console 错误检查换 kernel getLatestErrors 白盒），迁移 checklist 逐 spec 记录该升级点。
- 批次 1（20 个最低复杂度 spec）全绿；对应 20 个旧 Playwright spec 同 commit 删除（245→225）。
- codemod（`scripts/e2e-migrate-codemod.mjs`）产出引擎替换草案（page._→ft._ 常见模式映射 + 未覆盖 API 清单标注），人工精修后跑引擎；双引擎对照台账（`docs/research/` 附表：每 spec 新旧引擎判定结论一致）。
- Console 增强：Watch 模式（`--watch`，fs.watch specs 目录 → 变更重跑该 spec）+ 断言详情抽屉（Runner 结果行展开失败 spec 的 error 摘要与 Command Log 尾部）。
- 缺口清单逐条销账或登记后继（getByRole name 过滤按批次需要补）。

## Non-Goals

- 批次 2–6（约 225 spec）：后继 plan（每批一个或合并两个批次为一 plan，视实作速度裁定）。
- Playwright 删除、DOM 断言门禁（E4）；语义清零（E5）。
- 跨 tab 编排（ft.tabs）、download/clipboard CDP 能力（批次内 spec 未触及时不预建）。
- JUnit reporter（roadmap E1 deferred，随 CI 正式接入时评估）。

## Scope

### In Scope

- `packages/flux-test-driver/`：web 断言 shim（`ft.expectWeb(locator)` 或等价 API）、Locator 嵌套/boundingBox/last/selectOption/check/uncheck、`ft.keyboard`（press Chord 经 gateway 真实输入）、`ft.mouse`（move/down/up/wheel）、`ft.setViewportSize`、`ft.errors()`（kernel getLatestErrors 白盒）；单测。
- `packages/flux-test-server/`：CLI `--watch`；Console Watch 开关 + 断言详情抽屉；gateway input 通道扩展（keyboard/wheel）。
- `scripts/e2e-migrate-codemod.mjs`：机械替换脚本。
- `tests/e2e/flux/<batch1>/*.flux-spec.ts`（20 个）+ 删除对应 20 个旧 spec。
- 双引擎对照台账（design doc §5.2 勘误附注或独立 `docs/research/` 表）。
- docs：roadmap E3 行勘误（标部分收敛：批次迁移 Wave 1 + Console Watch/抽屉；CI 接线与剩余批次记 successor）、E2 plan Deferred successor-path 就地勘误（预览/scrub 最终归 E4）、daily log。

### Out Of Scope

- 其余 225 个 spec 任何改动；Playwright config/依赖改动。
- Console 预览 iframe 投影 + 时间旅行 scrub（再裁决：归 E4 Console v2，见 Deferred）。

## Failure Paths

| 可测场景编号                 | 触发                                                 | 行为                                                         | 可重试 | 用户可见表现                 |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ | ------ | ---------------------------- |
| watch-restart-loop           | watch 模式下 spec 文件写入中（半写状态触发多次事件） | 500ms debounce 合并触发                                      | 是     | CLI/Console 显示最后一次触发 |
| web-assert-timeout           | web 断言重试超时                                     | 抛错带 locator/断言/实际值摘要（spec 失败）                  | 否     | Runner 失败行详情抽屉可见    |
| keyboard-channel-unavailable | gateway 真实输入通道不可用                           | 键盘走页内合成 KeyboardEvent 兜底并在 payload 标记 synthetic | 是     | 报告字段标记                 |

## Test Strategy

档位选择：`必须自动化`

理由：web 断言 shim 的重试语义是"断言强度不降级"的根基（假绿风险，design doc §7 最高风险）；键盘/mouse 真实输入通道是 batch 内 spec 的依赖路径；watch debounce 与批次迁移等价性是回归路径。

## Execution Plan

### Phase 1 - 驱动能力补齐（web 断言 shim + locator/keyboard/mouse/viewport + errors 白盒）

Status: completed
Targets: `packages/flux-test-driver/src/{ft,locator,expect-web,kernel}.ts`、`packages/flux-test-server/src/{gateway,launcher,runner}.ts`

- Item Types: `Fix | Proof`

- [x] Locator 扩展：嵌套 `locator.locator()`（后代组合选择器）、`last()`、`boundingBox()`（gateway `dom.getBoundingClientRect` 请求 → CDP DOM.getBoxModel 或页内 evaluate 兜底）、`selectOption/check/uncheck`（合成事件 + stability 门控）。
- [x] `ft.expectWeb(locator)`：toBeVisible/toBeHidden/toContainText/toHaveText/toHaveValue/toHaveAttribute/toHaveCount/toBeEnabled/toBeDisabled——统一重试轮询（默认 timeoutMs 5000），失败消息含 selector/断言/最近实际值；`not` 反转。
- [x] `ft.keyboard`：press（Chord 拆解 ControlOrMeta+键）、type、down/up——真实输入通道（gateway `input.key` → CDP `Input.dispatchKeyEvent`），不可用时合成 KeyboardEvent 兜底并标 synthetic。
- [x] `ft.mouse`：move/down/up/wheel（gateway `input.mouse` → CDP `Input.dispatchMouseEvent` / `Input.dispatchMouseEvent(type:mouseWheel)`）。
- [x] `ft.setViewportSize`（gateway → CDP `Emulation.setDeviceMetricsOverride`）。
- [x] `ft.getByRole(role, { name?, level? })` 基础版：`[role=...]` 属性选择器 + accessible name 匹配（name 优先 aria-label，其次 text content 正则/子串），返回 Locator——批次 1 有 5 个 spec 依赖 heading/button name 过滤。
- [x] `ft.errors()`：kernel `getLatestErrors()` 白盒透出；shared helper `expectNoPageErrors(ft)`（可被 spec import，esbuild 打包内联）。
- [x] 单测：shim 重试/超时/not 反转/消息内容；嵌套 locator 选择器组合；keyboard Chord 拆解 + 真实输入通道不可用时 synthetic 兜底并标记 synthetic（Failure Path keyboard-channel-unavailable 的判别覆盖）；getByRole name 匹配（aria-label/text/level）；watch debounce；批次内用到的每个新 API 至少 1 正例。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-test-driver test`、`flux-test-server test` 全绿（新增用例覆盖上述）。
- [x] 真机 Proof：1 个 scratch flux-spec（`_tmp/` 政策外、`tests/e2e/flux/demo-*` 命名）串起 expectWeb + keyboard Chord + mouse drag + viewport + errors()，`pnpm test:flux --spec` 绿后保留为 demo 或删除（记账）。
- [x] 局部 typecheck 通过。

### Phase 2 - codemod + 双引擎对照台账 + Console Watch/详情抽屉

Status: completed
Targets: `scripts/e2e-migrate-codemod.mjs`、`packages/flux-test-server/src/cli.ts`、`packages/flux-test-server/src/console-server.ts`、`packages/flux-test-server/src/console/app.tsx`、design doc §5.2 附注

- Item Types: `Fix | Proof`

- [x] codemod：`node scripts/e2e-migrate-codemod.mjs <spec.ts>` 输出 `.flux-spec.ts` 草案——覆盖 goto/testid/locator 基本链/expectWeb 常见断言/waitFor/assertTrackedPageErrors 的机械映射；未覆盖 API 逐处 `// TODO(migrate)` 标注并列清单。
- [x] 双引擎对照台账：批次 1 每 spec 记录新旧引擎判定结论（passed/failed 一致性，非像素），落 design doc §5.2 勘误附注表格。
- [x] Console：Watch 开关（CLI `--watch` + Console UI toggle）、断言详情抽屉（失败 spec 展开 error 摘要 + Command Log 尾部 20 条）。
- [x] 单测：codemod 对 fixtures 输入的映射快照；watch debounce。

Exit Criteria:

- [x] focused 单测全绿；`pnpm check` 无新增红项。
- [x] Console Watch/抽屉真机 Proof（程序化断言：改 spec 文件 → 自动重跑 → 结果更新；失败行可展开详情）。

### Phase 3 - 批次 1 迁移（20 spec，新全绿 + 旧删除）

Status: completed
Targets: `tests/e2e/flux/*.flux-spec.ts`（新增 20）、删除对应 `tests/e2e/*.spec.ts`

- Item Types: `Fix | Proof`

- [x] 批次 1 名单（draft review 逐 spec API 扫描后勘定，全部落在 Phase 1 能力内）：kanban-card-template、calendar-grid-shape、ai-tools、ai-citations、table-density、ai-hitl、ai-p4-widgets、scada-editor-panel-collapse、form-atoms-input-color、form-atoms-rating、ai-attachments、ai-branches-linkage、w1b-feedback-family、input-city、org-select-department、nop-report-profile、calendar-demo、three-industrial-demo、gantt-states、w3d-upload-family。换出与换入理由：linear-issues-fetch-failure（依赖 addInitScript——Phase 1 不建）、url-filter-sync（expect.poll + hasText 选项——后续批次配 poll 语义时迁）、input-suggest（getByLabel）、three-canvas-ux（waitForTimeout + 原始 mouse 拖拽）。
- [x] 每 spec：codemod 草案 → 精修（断言强度不降级；`assertTrackedPageErrors` → `expectNoPageErrors`）→ `pnpm test:flux --spec` 单独绿 → 批量绿。
- [x] 全批绿后同 commit 删除 20 个旧 spec（存量 225；55 旧用例 Playwright oracle 复跑绿后删除，双引擎结论一致）。
- [x] 对照台账表格填写（20 行，design doc §5.5；含 6 条新增缺口回灌 §5.1 延伸）。

Exit Criteria:

- [x] `pnpm test:flux --dir tests/e2e/flux` 全绿（25 = 存量 4 + 批次 1 新增 20 + demo-capabilities 1；含 1 expected-fail demo）。
- [x] `npx playwright test --list` 不再收集已删 spec，存量 225。
- [x] design doc 台账 + roadmap E3 行勘误（部分收敛口径）+ E2 plan Deferred 就地勘误 + daily log 完成。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成：Phase 1 能力真机可用 + 批次 1 迁移完成（新绿旧删同 commit）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（design doc 台账 + roadmap + daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Draft Review Record

- Reviewer / Agent: agent_b8edaba9（fresh session）
- Verdict: 首轮 fail（0 Blocker / 2 Major / 6 Minor）→ 全部处置后修订（本节即 Round 2 修订记录）：Major-1 批次名单换出 4 个超能力面 spec 并核验新名单（getByRole 基础版入 Phase 1，5 个 spec 依赖）；Major-2 新增"双引擎 CI 接线"Deferred + roadmap 勘误改部分收敛口径；Minor-1 targets 路径修复；Minor-2 exit 算术修正（4 存量 + 20）；Minor-3 E2 plan Deferred 就地勘误入 scope；Minor-4 判别性升级点要求写入 Goals/checklist；Minor-5 follow-up 措辞改裁定条件；Minor-6 keyboard synthetic 兜底单测显式化。
- Rounds: 2

## Deferred But Adjudicated

### 双引擎 CI 接线（roadmap E3 行"双引擎 CI（Playwright 为 oracle 对照）"的 CI 化部分）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: Wave 1 交付的对照台账（人工记录每 spec 新旧引擎判定结论）已构成双引擎对照的数据面；CI 化（两份机器报告自动比对 + JUnit 输出 + CI job 接入）依赖仓库 CI 工作面与 reporter 格式裁定，与批次迁移无依赖耦合——批次迁移铁律本身只要求"新全绿 + 旧删除同 commit"。
- Successor Required: `yes`
- Successor Path: E4 plan（E4 本就含删 Playwright 与迁移 handbook 定稿；CI 双引擎对照在 E4 收口期天然归位——批量迁移全部完成后 CI 对照改为纯 flux 引擎单跑）

### E3 剩余批次（约 225 spec）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: 本 plan 明确为 Wave 1（E3 首批 + 能力地基）；design doc §5.2 T2 本就要求分批推进、每批独立 full-green 节奏，单 plan 无法诚实收口 245 spec。
- Successor Required: `yes`
- Successor Path: `docs/plans/` E3 Wave 2..N（每批 ≤20 spec，随能力面扩展逐批覆盖 keyboard/mouse/evaluate 密集 spec），全部完成后才进入 E4。

### Console 预览 iframe 投影 + 时间旅行 scrub（E2 deferred 指向 E3）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: 需要被测页 iframe 投影 + 跨 frame 网关通道 + M2 预览协议接线，是 Console 架构级工作面；与 E4 Console v2（会话/诊断页：历史 run、DevSession 回放、视觉 diff 画廊）同一投影/通道底座，拆两次做重复建设。批次迁移与 Watch/抽屉不依赖预览/scrub。
- Successor Required: `yes`
- Successor Path: E4 plan（Console v2：投影底座 + 预览/scrub + 会话/诊断页）

## Closure

Status Note: 已收口（2026-11-19）。Phase 1–3 全部落地；独立 closure audit（agent_9016c2ce）verdict **pass**（0 Blocker / 0 Major / 2 Minor）。Minor-1（补 Closure/Evidence 节）= 本节；Minor-2（1 次瞬态 flux-run 失败 watch-only 记账）已在 daily log 登记，Wave 2 观察。

Closure Audit Evidence:

- Auditor / Agent: agent_9016c2ce（fresh session，plan + diff summary + verification output 三件套输入）
- Evidence: verdict pass；审计会话独立复跑 driver 69/69、server 43/43（含 2 watch）、codemod 3/3；20 flux-spec 抽读 5 + 3 spec 与 `git show HEAD` 逐用例对照（断言强度不降级）；Playwright `--list` 0 收集 flux-spec、存量 225；§5.5 台账 20 行与 4 处 evaluate 债务核对一致；roadmap/E2 plan 勘误与 daily log 就位；plan 文本一致性核对（除 closure-audit 行外全部 `[x]`）。

Follow-up:

- 见 Non-Blocking Follow-ups

## Non-Blocking Follow-ups

- getByRole 深度语义（aria-labelledby/aria-describedby 解析）：批次 1 以 aria-label + text content 匹配够用；含 labelledby 的 spec 进入批次名单前必须先补该能力（换入条件，不是"需要时再说"）。
- 元素级 evaluate：整页 ft.evaluate 兜底已登记债务；语义重写期（每 spec 第二步）优先清偿——含 evaluate 债务的 spec 不得标记"迁移完成（语义重写完成）"，只可标"引擎替换完成"。
- JUnit reporter：随上方"双引擎 CI 接线"successor（E4）一并裁定。
