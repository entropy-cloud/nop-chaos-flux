# UX-R6 全局外壳治理（徽章遮挡 + 主题控制单一路径 + console 基线）

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（G-1/G-2 + G-1 计数误读改判）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R6
> Related: `packages/nop-debugger/`（launcher chrome owner）、`apps/playground/src/theme-switcher.tsx`、`apps/playground/src/theme.ts`

## Purpose

把全局外壳从"调试徽章压住每页标题/返回按钮、主题控制双入口、console 噪音疑云"修复为"launcher 默认停靠左下角不侵入内容区、主题控制单一路径、console 告警处于个位数基线并有探针证据"。

## Current Baseline

- **G-1 徽章遮挡（实锤）**：`nop-debugger` launcher 默认位置 `{x:24,y:24}`（`controller-helpers.ts:12` DEFAULT_POSITION + playground `App.tsx:97` 显式配置同值）——launcher 渲染在视口左上角，压住每页 "Back/Home" 按钮与标题（审计截图）。launcher 可拖拽且位置持久化，但默认值与所有页面 header 冲突。
- **G-1 计数改判（R6 探针证据）**：审计"计数随 console 告警膨胀至 386"系误读——badge 计数是 debugger **事件时间线**（action/state/api 等全 kind 事件，含交互产生的事件，max 400），不是 console 告警。R6 探针（`_tmp/console-noise-probe.mjs`，17 路由 × 6s 停留）实测 console warn/error：**16 路由为 0，仅 graph-demo 2 条**（"畸形数据"演示卡的有意 dev 告警，`graph-demo.tsx:156-168`，L162 注释明示演示失败路径）→ console 基线已达个位数，无需渲染器侧清理。徽章计数值随交互增长属 debugger 设计行为（时间线事件），不属缺陷。
- **G-2 主题控制重复（实锤）**：全局 `ThemeSwitcher`（`apps/playground/src/theme-switcher.tsx`，右下角 classic/glass × light/dark 双下拉，plan 471 V1-F3 的单点实现）之外，`pivot-table-demo.tsx:159-171` 另有页内「暗色/亮色」开关（`setThemeMode` 直调，L153-155；按钮 ~L163-169；原引 159-171 作废）——同一能力两套入口；全仓 grep 仅此一处页内开关。
- 现有测试：nop-debugger 包套件全绿（panel/panel-minimized/store 等）；playground 套件全绿。

## Goals

- launcher 默认停靠视口**左下角**（不与任何页面 header/标题/工具栏重叠）；用户拖拽后维持既有位置持久化行为（拖拽即转 floating 并按绝对坐标持久化）。
- 主题控制单一路径：移除 pivot 页内暗色开关，全局 ThemeSwitcher 为唯一入口。
- console 告警基线：维持个位数（探针复测入档），graph-demo 2 条为有意演示、登记改判不清理。
- `dock` 配置面语义落地：`DebuggerWindowDock` 扩展 `bottom-left` 并被 controller/store/panel 消费（此前声明未消费）。

## Non-Goals

- 不改 debugger 时间线事件模型与 badge 计数语义（事件计数随交互增长是设计行为）。
- 不移除全局 ThemeSwitcher 或改变其位置（plan 471 既有裁决）。
- 不做各渲染器 console.warn 的清理（探针证实无噪音；graph-demo 告警为有意演示）。

## Scope

### In Scope

- `packages/nop-debugger/src/`（types dock 扩展、controller-helpers 默认值、controller/store dock 传递、panel launcher 停靠渲染 + 首次拖拽坐标换算）
- `apps/playground/src/App.tsx`（`__NOP_DEBUGGER__` 配置改 `dock: 'bottom-left'`）
- `apps/playground/src/pages/pivot-table-demo.tsx`（移除页内暗色开关）
- nop-debugger 单测 + playground 相关单测

### Out Of Scope

- 全局 ThemeSwitcher 位置/样式调整（G-2 "浮层盖内容"的滚动末端遮挡为右下角小胶囊的固有形态，plan 471 已裁决；如需调整另立 plan）
- 各演示页 console 逐条清理（探针证实无噪音）

## Failure Paths

| 可测场景编号                  | 触发                                     | 行为                                                                                                    | 可重试 | 用户可见表现           |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------ | ---------------------- |
| g1-launcher-dock-default      | 全新会话（无持久化位置）打开任一演示页   | launcher 渲染于视口左下角，不与 header 重叠                                                             | 否     | 标题/返回按钮完整可见  |
| g1-launcher-drag-persists     | 拖拽 launcher 到新位置后刷新             | launcher 停在持久化位置（floating），不再回停靠点                                                       | 否     | 位置记忆保持           |
| g1-docked-panel-drag-converts | docked 状态（最小化条/打开面板）首次拖拽 | 按当前盒 getBoundingClientRect 换算基准坐标（不瞬移回 {24,24} header 区），拖拽落点转 floating 并持久化 | 否     | 拖拽从当前视觉位置跟手 |
| g2-single-theme-path          | pivot 页渲染                             | 页内无暗色开关；全局 ThemeSwitcher 仍可切换且状态同步                                                   | 否     | 主题控制单一路径       |

## Test Strategy

档位选择：`必须自动化`

dock 默认值与拖拽转 floating 是可断言 DOM 行为（style left/bottom + 持久化 store 断言），单测先红后绿；pivot 页内开关移除为组件断言；console 基线由探针脚本证据入档（非断言类）。

## Execution Plan

### Phase 1 - launcher 底部停靠

Status: completed
Targets: `packages/nop-debugger/src/`（types/controller-helpers/controller/store/panel(+hooks)）、`apps/playground/src/App.tsx`

- Item Types: `Proof`, `Fix`

- [x] 单测先红：`panel-dock.test.tsx` 5 例（dock 默认停靠渲染、显式 position 保持 floating 回归钉、**持久化位置重载→floating**（g1-launcher-drag-persists 重载分支 Proof）、**docked 打开态面板首拖换算**（g1-docked-panel-drag-converts Proof）、store.setPosition 翻转 floating）
- [x] types：`DebuggerWindowDock` 扩展 `'bottom-left'` + snapshot 增 dock 字段；controller 传 dock 入 store（持久化位置或显式 position 存在即 floating）；store.setPosition（拖拽落点）置 dock=floating 并持久化坐标
- [x] panel/hooks：**dock 范围裁定为全部三种 chrome 状态**（launcher/minimized/打开面板，`chromeBoxStyle` 统一 bottom 锚定）；`useLauncherDrag` 与 `useDraggablePosition` **两者**均实现 docked 首拖 getBoundingClientRect 换算基准坐标转 floating（review round-1 Major-1：仅 launcher 换算会让 docked 面板/最小化条拖拽瞬移回 {24,24} header 区——已修复并以 `panel-dock.test.tsx` "docked 打开态面板首拖按当前盒换算基准" 钉住，缺陷基准 {24,24} 会得到 {64,44} 而非断言的 {140,520}）
- [x] playground `__NOP_DEBUGGER__` 配置改 `dock: 'bottom-left'`（移除显式 position）
- [x] nop-debugger 包测试全绿（21 files / 135 tests；controller-helpers 窗口配置契约测试按新契约更新）

Exit Criteria:

- [x] dock 默认/拖拽持久化用例先红后绿
- [x] 包测试全绿

### Phase 2 - 主题单一路径与基线入档

Status: completed
Targets: `apps/playground/src/pages/pivot-table-demo.tsx`

- Item Types: `Proof`, `Fix`

- [x] pivot 页内暗色开关移除（dark/mode state 与 toggleTheme 死代码清理）；断言落在 pivot e2e（`expect button /暗色|亮色/ toHaveCount(0)` + 主题切换改走全局 ThemeSwitcher 单一路径并验证 data-mode 翻转与 canvas 存活）
- [x] console 噪音探针复测（17 路由，`_tmp/console-noise-probe.mjs`）结果入档 daily log：16×0 + graph-demo 2 条（畸形数据演示卡有意设计）；launcher 停靠探针（4 路由 bottom=24px、Back 无重叠 + 截图 `_tmp/ux-r6-launcher-dock.png`）入档；审计报告 G-1/G-2 行补注
- [x] playground 套件全绿（41 files / 408 tests）

Exit Criteria:

- [x] 主题单一路径断言绿
- [x] 探针证据与审计改判入档

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: round 1 `fail`（0 Blocker / 2 Major）→ 修订 → round 2 `pass`（0 Blocker / 0 Major；residual：plan 行 16 陈旧引注已清、测试内 draft 注释已删；非阻塞建议=最小化条真浏览器拖拽抽查已纳入 closure 证据）
- Rounds: 2
- Findings addressed: R6-M1（**真缺陷**：dock 范围歧义导致 docked 面板/最小化条拖拽瞬移回 header 区——已修 useDraggablePosition 换算 + Failure Path 行 + Proof 测试钉住；plan 裁定 dock 范围=全部 chrome 状态）；R6-M2（**流程**：draft 未达共识即开工——如实记录：Phase 1/2 实现先于 review 完成，review 发现的实现缺陷（M1）正是该流程要防的成本，后续 plan 恢复"共识后执行"纪律）；R6-M3（引文行号已修正）；R6-M4（持久化重载分支补 Proof 测试）；R6-M5（store.test 字面量已由 dock 可选缺省 'floating' 消解）。

## Closure Gates

- [x] Phase 1/2 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log；panel-dock.test.tsx 5 例含 2 条 review 补充 Proof）
- [x] 浏览器/e2e 实测证据存档（launcher 停靠 4 路由探针 + 截图；docked 最小化条真浏览器拖拽抽查：跟手 + 设计 clamp、刷新持久化；pivot e2e 4 passed）
- [x] `pnpm typecheck`（42 tasks 全绿）
- [x] `pnpm build`（42 tasks 全绿）
- [x] `pnpm lint`（42 tasks 全绿）
- [x] `pnpm test`（78 tasks 全绿：nop-debugger 135 / playground 408 / i18n 30 等）
- [x] `pnpm check`（exit 0，零新增红项）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- ThemeSwitcher 右下角小胶囊对滚动内容末端的遮挡（固有形态，如需优化另立 plan）
- graph-demo 畸形数据卡 dev 告警（有意设计，保留）

## Closure

Status Note: 2026-10-01 completed。R1-R6 修复轮第 6 项收口；审计改判 G-1 计数为 debugger 事件时间线误读（console 基线本就个位数），真缺陷 = launcher 默认位置压 header，已修 + dock 配置面语义落地。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），2026-10-01
- Evidence: VERDICT: approved（0 Blocker；4 Minor 文档同步项已在 closure 提交中落实：daily log 测试数 133→135、review 第 2 轮状态同步、chip-drag 探针结果入档、roadmap R6 行补链）。审计独立复跑：nop-debugger 21 files/135 tests、flux-i18n 2 files/30 tests 全绿；并实测复跑 launcher-dock 与 chip-drag 两个探针（4 路由 bottom=24px 零重叠；chip {24,848}→{144,850} x 精确跟手 + y 设计 clamp + 刷新持久化，无 header 瞬移）；逐项核对 dock 链路（types/store/controller/helpers/panel/两 hooks）、5 测试非空洞性（{140,520} 与缺陷基准 {64,44} 可区分）、playground 配置与 pivot 单一路径、Failure Paths 四行全覆盖。
