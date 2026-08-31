# 3 ui-review 审计 P1 可访问性批次 + command-palette 测试保护（批次三：ui / data / scheduling / content / basic 九项）

> Plan Status: active（2026-08-31 独立子 agent fresh session 两轮 review 达成共识：零 Blocker / 零 Major，证据见 Draft Review Record）
> Last Reviewed: 2026-08-31
> Source: `docs/audits/2026-08-28-1659-multi-audit-ui-review.md`（P1 组 C「Accessibility」全部 7 条：20-01/02/03/04/05/07/10 + 组 D「Test protection」全部 2 条：23-01/23-02，均为独立 review 后 retained）
> Mission: ui-review
> Related: `docs/plans/2026-08-31-1941-1-ui-review-p1-interaction-behavior-remediation.md`（批次一）、`docs/plans/2026-08-31-1941-2-ui-review-p1-contract-styling-drift-remediation.md`（批次二）

## Purpose

把 ui-review 双阶段审计组 C/D 的 9 条 verified P1 收口成两个同质批次：① 新语义组件的可访问性缺口（WCAG 4.1.2/4.1.3/1.3.1/3.3.1 + a11y 名称 i18n）——全部小而局部、仓内均有先例（kanban sr-only aria-live、ui i18n 通道）；② command-palette 两条已文档化公共契约的测试保护缺口（dispatch 分支零断言、skip 契约零区分度），补齐后删除对应实现代码将导致测试红。

## Current Baseline

- 审计基线（2026-08-31 审计执行时全绿）；9 条 finding 均经独立 review agent live 复核，起草时 executor 抽查再证实（见下）。
- **20-01**：`packages/ui/src/components/ui/command.tsx:23-24` `CommandDialog` 默认 `title='Command Palette'`/`description='Search for a command to run...'` 硬编码英文并渲染进 sr-only DialogHeader（:38-41）；消费方 `flux-renderers-basic/src/command-palette.tsx:397-403` 未传 title/description。同文件 placeholder/emptyText 经 flux 侧 `t()` 本地化。ui 包自带 i18n 通道 `packages/ui/src/lib/i18n.ts`（`flux.*` 英文默认 + `setI18nGetter` 桥接，drawer/sidebar 等 key 先例齐备）。
- **20-02**：`packages/ui/src/components/ui/command.tsx:88-99` `CommandEmpty` 仅 `role` 无（上游 cmdk 1.1.1 为 `role="presentation"`），"no results" 对屏幕阅读器静默（WCAG 4.1.3）。消费点 `command-palette.tsx:445`。
- **20-03**：`packages/flux-renderers-data/src/batch-bar.tsx:50-52` 空集 null gate、`:116-148` bar 渲染体无 `aria-live`/`role="status"`——出现/计数变化对 AT 静默（4.1.3）。仓内先例：`packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:573` sr-only `aria-live="polite"`。
- **20-04**：`packages/flux-renderers-data/src/table-renderer/table-editable-cell.tsx:459-476` NativeSelect 编辑分支缺 `aria-invalid`；`:485` Input 分支有 `aria-invalid` 无 `aria-describedby`；`:513-521` 错误 `role="alert"` span 无稳定 id——同一组件内 4.1.2/3.3.1 不一致。
- **20-05**：`packages/flux-renderers-data/src/table-renderer/table-column-settings.tsx:163-173` overlay DropdownMenu 形态 fine；`:176-191` inline 形态为裸 `useState` + 条件 div，无 `aria-expanded`/`aria-controls`/面板 id（4.1.2）。
- **20-07**：`packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx:131-136` WIP 超限徽章两态文本相同，仅 `bg-red-100 text-red-600 font-bold` vs 灰；`kanban-column.tsx:226` `border-red-400` 第三颜色通道——超限仅颜色可感知（1.3.1/4.1.x）。与已登记的 hardcoded-literal-color 门禁豁免不同（那是令牌治理，本条是非颜色通道缺失）。
- **20-10**：`packages/flux-renderers-content/src/result.tsx:24-31` 状态图标全部 `aria-hidden`；`:57-77` section 仅 `data-status`（AT 不可见）、title 是可选槽（`:47,78` 证实）——status-only 配置下组件核心语义（success/error/warning）对 AT 不可感知。
- **23-01**：`packages/flux-renderers-basic/src/__tests__/command-palette-items-execute.test.tsx:301-340` 全部用例使用默认 stub fetcher（`packages/flux-renderers-basic/src/test-support.tsx:7-12`，静默返回 `{status:0,data:null}`），零断言观察 `command-palette.tsx:288-299` 的 `item.action` dispatch 分支——删除 `:291-299` 全部测试仍绿；e2e 零 command-palette 覆盖。landing commit 曾声称该分支有覆盖。
- **23-02**：`packages/flux-renderers-basic/src/__tests__/command-palette.test.tsx:174-197`"skipped no-op" 用例标题声称锁定 `{ok,skipped:true}` 契约（实现在 `command-palette.tsx:176-182`、`surface-renderer-definitions.ts:135`），但断言无法区分 skip 与无条件重开，re-dispatch 的 `onOpen`/statusPath 在测试中不可观测。
- i18n 基础：renderer 侧 `flux.*` key 在 `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`（`check:i18n-keys` 门禁校验 key 存在性）；ui 侧 `flux.*` 英文默认在 `packages/ui/src/lib/i18n.ts`。新 key 必须两侧登记以过门禁。
- worktree 纪律：全部改动在 worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），commit 格式 `feat(ui-review): <description>`。
- **跨批次执行顺序**：本 plan 与批次一（`2026-08-31-1941-1`）存在同文件交集——批次一 Phase 1 改 `table-editable-cell.tsx`（saving 门禁）与 `batch-bar.tsx`（selection fallback），本 plan Phase 2 改同两文件的 a11y 属性（select 分支 aria-invalid / null gate 附近 aria-live）。两组编辑区域语义不重叠，但**本 plan 须在批次一之后执行**；批次一合入后本 plan Current Baseline 的行号锚会漂移，执行时按语义锚（select 分支、null gate、错误 span）重新定位。

## Goals

- 7 条 a11y 缺口全部修复：状态语义、live-region、aria 状态属性、i18n 化的可访问名称，全部有 AT 可感知的非颜色/非隐藏通道，且均有仓内先例模式可循。
- 2 条测试保护缺口补齐：command-palette `item.action` dispatch 分支有真断言（fetcher spy 证明 `${id}` 解析与派发），skip 契约有区分度断言；实现被删时测试红。
- 新增 i18n key（ui `flux.command.*`、flux-i18n `scheduling.kanban.wipExceeded`/`flux.result.status*` 若采用 sr-only 文案方案）在 flux-i18n `en-US.ts` 与 `zh-CN.ts` **双侧**登记，`check:i18n-keys` 零新增红且零新增单侧 warning。

## Non-Goals

- 不做全量 WCAG 合规扫尾（P2 的 20-06/20-09 已裁定 polish/observation，不入本计划）。
- 不改 command-palette 的开合/派发契约语义（只补测试断言；若测试证明 close-then-dispatch 顺序即契约，按既有实现锁定顺序，不翻转顺序）。
- 不动键盘零 DOM 契约（`keyboard.tsx` documented zero-DOM，20-09 观察项不采纳）。
- 不给 hotkey 锚点/导航 span 添加 role（20-06 显式文档化 tradeoff 维持）。
- 不动 20-01 之外其他 ui 组件的 i18n 存量 key 面。

## Scope

### In Scope

- `packages/ui/src/components/ui/command.tsx`（CommandDialog 默认 title/description 经 `t()`、CommandEmpty 语义）+ `packages/ui/src/lib/i18n.ts`（新 key）
- `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`（如桥接侧需登记新 key）
- `packages/flux-renderers-basic/src/command-palette.tsx`（传参或消费 ui 默认值，择一）+ `__tests__/command-palette-items-execute.test.tsx`、`__tests__/command-palette.test.tsx`、`src/test-support.tsx`
- `packages/flux-renderers-data/src/batch-bar.tsx`、`table-renderer/table-editable-cell.tsx`、`table-renderer/table-column-settings.tsx` + 对应测试
- `packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx`（+ 必要时 `kanban-column.tsx`）+ 对应测试
- `packages/flux-renderers-content/src/result.tsx` + 对应测试

### Out Of Scope

- Non-Goals 全部；`cmdk` 上游升级；kanban DnD 公告体系重构（既有 sr-only aria-live 只读复用）；e2e 层（14-03 已裁定非缺陷，mod+k e2e 为 backlog 候选）。

## Failure Paths

| 可测场景编号          | 触发                        | 行为                                                                                              | 可重试 | 用户可见表现                  |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| a11y-20-01-name       | 打开 command-palette dialog | 可访问名称/描述来自 i18n key（zh 环境中文），非硬编码英文                                         | 是     | AT 读本地化名称               |
| a11y-20-02-empty      | 过滤无结果                  | "无结果"以 `role="status"`（或 aria-live 等价）公告                                               | 是     | AT 播报空态                   |
| a11y-20-03-count      | 选择集从空→N→清空           | bar 出现/计数变化经 `role="status"`+`aria-live="polite"` 公告                                     | 是     | AT 感知批量栏                 |
| a11y-20-04-invalid    | select 编辑器校验失败       | select 带 `aria-invalid` + `aria-describedby` 指向错误 span id                                    | 是     | AT 感知校验失败               |
| a11y-20-05-disclosure | inline 列设置展开/收起      | 触发钮 `aria-expanded`/`aria-controls` 指向面板 id                                                | 是     | AT 感知展开态                 |
| a11y-20-07-wip        | 列卡片数超 WIP 上限         | 超限有 sr-only 文案（i18n key）或等价非颜色通道                                                   | 是     | 非色觉用户可感知              |
| a11y-20-10-status     | status-only result 渲染     | 状态词经 sr-only（`flux.result.status*`）或 `role="status"` 进入 a11y 树                          | 是     | AT 感知 success/error/warning |
| test-23-01-dispatch   | 命中带 `action` 的条目执行  | fetcher spy 收到 `url === '/r/Executed?id=<key>'`（`${id}` 解析证据）；删除实现分支则本用例红     | 是     | —（纯测试）                   |
| test-23-02-skip       | 面板已开时重复 open 意图    | 断言 `{ok,skipped:true}` 且 `onOpen` 不重复 dispatch（setValue probe 或 statusPath publish-once） | 是     | —（纯测试）                   |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（a11y 断言用 `getByRole`/attribute 断言可程序化验证；23-01/23-02 本身就是测试保护缺口——不写测试等于不修复；全部先红后绿）。

## Execution Plan

### Phase 1 - ui command 可访问名称与空态语义（20-01 / 20-02）

Status: planned
Targets: `packages/ui/src/components/ui/command.tsx`、`packages/ui/src/lib/i18n.ts`、`packages/flux-i18n/src/locales/`（如需桥接）

- Item Types: `Fix | Proof`

- [ ] Proof（先红，20-01）：ui 侧测试——bridge 注入后 CommandDialog 默认 title/description 返回桥接值（red-first 的承载断言；注意内置英文默认串与 t() 未命中输出同形，英文 channel 单独无区分度，不作为先红断言）
- [ ] Fix（20-01）：`CommandDialog` 默认值改 `t()`（新 key `flux.command.title`/`flux.command.searchPlaceholder`）。**双语登记红线**：新 key 必须同时登记 `packages/flux-i18n/src/locales/en-US.ts` 与 `zh-CN.ts`（沿 `flux.sidebar.*` 先例：en-US.ts:417 / zh-CN.ts:415 双侧镜像）——`check:i18n-keys` 只对"两侧都缺"报错，单侧缺失仅 ⚠️ warning（门禁盲区，脚本 `scripts/check-i18n-keys.mjs:407-419, 486-496`）；且 ui 内置 map 未含该 key 而桥接生效时，缺失侧会经 i18next fallback 串语言或渲染裸 key。`ui/src/lib/i18n.ts` 英文默认表可同步登记作为无桥接 host 的兜底，但不替代 flux-i18n 双语登记
- [ ] Proof（先红，20-02）：`CommandEmpty` 渲染含 `role="status"`（或外层 aria-live 等价方案）断言
- [ ] Fix（20-02）：ui wrapper 补 `role="status"`（不依赖 cmdk 上游）

Exit Criteria:

- [ ] 两条先红用例转绿；`command-palette` 既有测试零回归（`pnpm --filter @nop-chaos/flux-renderers-basic test` + `pnpm --filter @nop-chaos/ui test`）
- [ ] `check:i18n-keys` 零新增红（新 key 在 flux-i18n en-US 与 zh-CN **双侧**登记；单侧缺失门禁只出 warning，不作为通过依据）

### Phase 2 - data 三组件 a11y 属性（20-03 / 20-04 / 20-05）

Status: planned
Targets: `packages/flux-renderers-data/src/batch-bar.tsx`、`table-renderer/table-editable-cell.tsx`、`table-renderer/table-column-settings.tsx`

- Item Types: `Fix | Proof`

- [ ] Proof（先红，20-03）：batch-bar 测试——bar 根（或 sr-only 伴生节点）带 `role="status"` + `aria-live="polite"`，选择集变化时计数文本为其公告内容（沿 `kanban-board.tsx:573` 先例断言）
- [ ] Fix（20-03）：batch-bar 补 `role="status"` + `aria-live="polite"`（空集 null gate 语义不变：不渲染即不公告，出现即公告）
- [ ] Proof（先红，20-04）：editable-cell 测试——select 编辑分支校验失败后 `aria-invalid=true` 且 `aria-describedby` 指向错误 span 稳定 id；input 分支 `aria-describedby` 同断言
- [ ] Fix（20-04）：错误 span 加稳定 id（`useId` 或确定性 id）；两个编辑分支统一 `aria-invalid` + `aria-describedby`
- [ ] Proof（先红，20-05）：table-column-settings 测试——inline 触发钮带 `aria-expanded` + `aria-controls` 且切换正确、指向面板 id
- [ ] Fix（20-05）：inline 形态补 `aria-expanded`/`aria-controls`/面板 id（overlay 形态不动）

Exit Criteria:

- [ ] 三条先红用例转绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 相关文件绿、既有行为零回归（同文件批次一交集按本 plan 头部跨批次执行顺序约定处理）

### Phase 3 - scheduling kanban + content result 状态通道（20-07 / 20-10）

Status: planned
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx`、`packages/flux-renderers-content/src/result.tsx`、`packages/flux-i18n/src/locales/`

- Item Types: `Fix | Proof`

- [ ] Proof（先红，20-07）：kanban-column-header 测试——WIP 超限态出现 sr-only 超限文案（`t('scheduling.kanban.wipExceeded')` 或等价 key；zh/en 双语断言其一 + key 存在）
- [ ] Fix（20-07）：超限徽章补 sr-only 后缀（沿 `kanban-board.tsx:573` sr-only 模式）；颜色通道保留
- [ ] Proof（先红，20-10）：result 测试——status-only 配置下，`section[role="status"]` 或 sr-only 状态词（`flux.result.status*` key）进入 a11y 树（`getByRole('status')` 或文本断言）
- [ ] Fix（20-10）：`result.tsx` 补 sr-only 状态词（新 key `flux.result.statusSuccess/statusError/statusWarning/statusInfo` 登记 flux-i18n 双语言）或 `role="status"` 方案，落字选择
- [ ] 核对新 key 过 `check:i18n-keys`

Exit Criteria:

- [ ] 两条先红用例转绿；`pnpm --filter @nop-chaos/flux-renderers-scheduling test` + `pnpm --filter @nop-chaos/flux-renderers-content test` 相关文件绿
- [ ] `check:i18n-keys` 零新增红；kanban 既有 DnD 公告与 result 既有测试零回归

### Phase 4 - command-palette 测试保护（23-01 / 23-02）

Status: planned
Targets: `packages/flux-renderers-basic/src/__tests__/command-palette-items-execute.test.tsx`、`command-palette.test.tsx`、`src/test-support.tsx`

- Item Types: `Proof | Fix`

- [ ] Proof（先红，23-01）：`command-palette-items-execute.test.tsx` 注入 fetcher spy，执行带 `action` 的条目 → 断言 spy 收到 `url === '/r/Executed?id=nav'`（证明 `${id}` 模板解析；当前红：删实现也绿 = 零区分度）；如 close-then-dispatch 顺序是契约，补调用顺序断言锁定
- [ ] Proof（先红，23-02）：`command-palette.test.tsx`"skipped no-op"用例补区分度断言——机制择一：schema `onOpen` 挂 ajax action + fetcher spy 调用计数（复用 23-01 的 fetcher 注入路径，证明 skip 时 `onOpen` 未重复 dispatch），或 `onOpen` 挂公式自增 setValue（每次 dispatch 计数 +1，断言重开意图后计数不变）；证明 skip ≠ 无条件重开
- [ ] Fix（23-01/23-02）：如上述用例暴露实现真实缺陷（预期为零——审计已证实 live 行为正确），转 Fix 单处理并回写审计；否则本 Phase 为纯测试增强（Item Types 的 Proof 即交付物）

Exit Criteria:

- [ ] 两用例转绿且具备"删除实现即红"的区分度（23-01 以临时删除 `:291-299` 验证后恢复作为 self-check 证据，证据落 Exit 勾选注记）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-basic test` command-palette 全文件绿

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session R1 `ses_fa8551158ffeO0nmh1i67x0Etk`（VERDICT: pass-with-minors 附 1 Major / 5 Minor）；R2 scoped re-check `ses_fa84b5c35ffeSWmpmAqdKNEA71`（VERDICT: pass，Major/全部 Minor 确认 resolved，零新 Blocker/Major）
- Verdict: `pass`（共识达成：零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: R1 Major-1（20-01 i18n 单侧登记盲区 → 双语登记红线 + check:i18n-keys 单侧 warning 盲区落字 + red-first 断言改桥接注入承载）；R1 Minor a-e（test-support 路径 / kanban-column 行号 / 跨批次顺序注记升 plan 级并补 batch-bar / 23-02 机制具体化 / Phase 1 Proof 措辞）随修订落实；R2 剩余 1 Minor（In-Scope/Targets 的 test-support 路径）已就地修正。

## Closure Gates

- [ ] 全部 9 条 in-scope P1（7 a11y + 2 test protection）已收敛（finding ID 逐条对应测试证据）
- [ ] 不适用：无独立 contract drift 收口项（20-01 的 i18n key 登记即契约面，随 Phase 1 验收）
- [ ] 行为/契约结果已达成（Failure Paths 表 9 行全部有对应用例且绿）
- [ ] 必要 focused verification 已完成（先红后绿证据落 Phase Exit Criteria）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline（renderer-interfaces.md 的 command-palette/skip 契约若与测试锁定口径有出入则同步一句；a11y 项无既有契约文档改动义务则落字 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无——本计划不设 deferred 项；P2 的 20-06/20-09 已在审计层裁定，不入本计划也不入本表。）

## Non-Blocking Follow-ups

- 14-03 附带的 backlog 候选：mod+k + ArrowDown/Enter 的 linear-replica e2e（审计已裁定非缺陷，属增强）。
- 23-01 延伸：command-palette e2e 覆盖（当前 e2e 为零；unit 层已锁后按需评估）。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
