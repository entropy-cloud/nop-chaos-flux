# 471 视觉质量 V1：主题与暗色横切地基 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-19
> Source: `docs/analysis/visual-quality/V1-theme-darkmode-foundation.md`（已独立核实，M-1+5 Minor 修订后零 Blocker/Major）、`docs/backlog/visual-quality-roadmap.md` V1、`docs/analysis/ui-review/C2-capability-gaps.md:30,50-57`（G-I）
> Related: `docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（V0 工具链，已完成）

## Purpose

把路线图 V1 收口：`:root` 语义色兜底、darkMode 触发器统一到 `data-mode` 单一事实源（含 pivot demo 既有 `.dark` 消费迁移）、playground 运行时主题切换（G-I 最小四态）、暗色适配规约回写 `theme-compatibility.md`。不改各包内部组件样式（那是各域 work item 的事）。

## Current Baseline

- master @ 27ba03729（V0 收口，full-green：unit 74/74、scripts 70/70、e2e 1475 passed / 0 failed）。
- theme-tokens `:root`（100 变量）与四个主题块（各 56 变量）差集为固定 30 变量，其中语义状态色 7 个（`--success/--success-bg/--warning/--warning-bg/--info/--danger/--danger-bg`）无兜底；TS API `BASE_TOKEN_NAMES` 公开 SUCCESS/WARNING/DANGER；包外无回退消费方实存（`sparkline-renderer.tsx:19`、tailwind-preset `:56-58`）。
- 双触发器实证：preset `darkMode:['class','.dark']`（:139）→ dist 编译 `.dark\:x:is(.dark *)`；令牌走 `[data-mode]`；pivot-table-demo.tsx:155 toggle `.dark`（双向半失效）；mobile styles.css:47-55 双触发器选择器（data-mode 半边已工作）。
- tailwindcss 4.2.2 compat 层支持 `['selector', n]` darkMode（→ `&:where(n, n *)`，核实员源码确认）。
- playground `main.tsx:14-15` 硬编码 classic/light；App 壳为 `<div class="nop-theme-root">` + 路由页；`.nop-theme-root` 系 shell 变量全亮色。
- **令牌解析已验证正确**（第二轮 review 实测证伪了起草者一度登记的"遮蔽"假 finding，研究报告 §5 撤回记录）：`data-mode='dark'` 下 theme-tokens classic-dark 值正常胜出（`--background: 222 84% 5%`、`--input: 217 33% 18%`，探针 `_tmp/v1f5-shading-inspect/`）；playground 裸 `:root` 仅为裸宿主兜底，非遮蔽者。
- pivot-table-demo 的 dark 态是本地 `useState` 镜像（:146-157）+ 按钮文案随本地 state 翻转（:167-170）——迁移后必须从全局态派生，否则与 App 切换器共存时文案失真、再点击可能反向强设（draft review M-1）。
- `tests/e2e/pivot-table-demo.spec.ts:39-56` 锁定 `getByRole('button', { name: '暗色' })` 与 `html.dark`。
- ai styles.css:282/336/361 有 `:root:not([data-mode='light'])` 门的 `prefers-color-scheme` 回退（与统一方向兼容）。

## Goals

- theme-tokens `:root` 兜底 7 个语义状态色（classic-light 同值），裸宿主可解析。
- `data-mode` 属性成为唯一 dark 触发器：preset `darkMode` 改 `['selector', '[data-mode="dark"]']` 且**产物实证**；pivot demo/spec 迁移完成。
- playground 四态运行时可切（classic/glass × light/dark）：localStorage 持久化、刷新保持、shell 变量暗色覆盖（dark 下页面外壳与组件面一致换肤）。
- `theme-compatibility.md` 落"暗色模式契约"节（触发器/接入步骤/包适配规约/门控回退范例）。

## Non-Goals

- 不做任何包内组件 dark 配色适配（V5–V11b 各域事务）。
- 不动 `flux-renderers-mobile/src/styles.css`（冗余 `.dark` 半边 watch-only）。
- 不新增主题、不做主题编辑器、不引入 React ThemeProvider。
- 不动 `packages/ui/src/index.ts` 公共导出面（切换器只用既有 ui 组件）。

## Scope

### In Scope

- `packages/theme-tokens/src/styles.css`：`:root` 补 7 语义色；`src/styles.test.ts` 扩展。
- `packages/tailwind-preset/src/index.ts`：darkMode 值；`src/index.test.ts` 同步。
- `apps/playground/src/`：`theme.ts`（读/写/应用 + 校验）、`main.tsx` 启动应用、`App.tsx` 挂切换器、`pivot-table-demo.tsx` 迁移、styles.css shell 暗色覆盖、单测。
- `tests/e2e/theme-switcher.spec.ts`：四态 + 持久化 + `dark:` 变体生效断言；`tests/e2e/pivot-table-demo.spec.ts` 机制迁移。
- `docs/architecture/theme-compatibility.md`（+ styling-system.md 冲突校正）；证据卡 `docs/audits/visual-quality/cross-cutting-theme.md` 裁决列回写。
- 产物实证记录：dark: 编译形态 grep（写入本 plan 执行记录/日志）。

### Out Of Scope

- 各域 dark 配色、第三主题、主题持久化格式演进、ui 包新组件。

## Failure Paths

| 场景                        | 触发                                          | 行为                                                  | 可重试           | 用户可见表现               |
| --------------------------- | --------------------------------------------- | ----------------------------------------------------- | ---------------- | -------------------------- |
| theme-invalid-storage       | localStorage 值非法/损坏                      | 静默回退 classic/light 并覆写                         | 是               | 默认主题                   |
| theme-storage-unavailable   | localStorage 抛异常（隐私模式等）             | 内存态继续，属性照常设置                              | 是               | 会话内切换正常，刷新不记忆 |
| preset-selector-unsupported | `['selector', …]` 编译产物不含 data-mode 形态 | 启用回退案 `@custom-variant`（报告 F2），记录产物证据 | 否（二选一裁决） | 无                         |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——主题切换是用户可感知行为且有既有 e2e 锁定（pivot spec 机制迁移）；触发器统一影响全部 `dark:` 变体的编译形态，必须以产物实证 + 单测先红后绿收口。Proof 项先于 Fix 项。

## Execution Plan

### Phase 1 - `:root` 语义色兜底

Status: completed
Targets: `packages/theme-tokens/src/styles.css`、`packages/theme-tokens/src/styles.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof：`styles.test.ts` 新增断言（先红）：`:root` 块含 `--success/--success-bg/--warning/--warning-bg/--info/--danger/--danger-bg` 兜底；四个主题块对同名词保持覆盖（写法：解析 `:root` 与主题块各自声明，断言主题块值存在——防止兜底误升格为主题定义）
- [x] Fix：`:root` 块补 7 个语义色（值 = classic-light 主题块同值），置于基础块语义分区；不补其余 23 个主题身份变量
- [x] Fix：单测转绿；`pnpm --filter @nop-chaos/theme-tokens test` 全绿

Exit Criteria:

- [x] `styles.test.ts` 新断言先红后绿有记录（先红 1 failed；后绿 10/10）；theme-tokens 包测试全绿
- [x] `:root` 恰好新增 7 个变量（git diff：+7 声明 +3 行注释），主题块零改动

### Phase 2 - darkMode 触发器统一（data-mode 单一事实源）

Status: completed
Targets: `apps/playground/src/theme.ts`（新）、`packages/tailwind-preset/src/index.ts`、`packages/tailwind-preset/src/index.test.ts`、`apps/playground/src/pages/pivot-table-demo.tsx`、`tests/e2e/pivot-table-demo.spec.ts`

- Item Types: `Proof | Fix`

- [x] Fix（前置子步骤，draft review Minor-1 钉死顺序）：新建 `theme.ts` 最小 API：`THEMES/MODES` 常量、`readStoredTheme`（校验 + storage 容错）、`applyTheme`、`setThemeMode/setThemeTheme`、**`subscribeTheme` + 全局态通知**（draft review M-1：消费方经 `useSyncExternalStore` 从全局态派生，不保留本地镜像）
- [x] Proof：preset 单测改为断言 `darkMode: ['selector', '[data-mode="dark"]']`（先红 1 failed/4 passed）；pivot spec 迁移为 `data-mode` 断言
- [x] Fix：preset `darkMode` 改值；重建 playground 并 grep dist CSS 记录 `dark:` 编译形态（`where([data-mode="dark"]…)` 出现且 `:is(.dark` 消失）——产物证据写入日志；若不支持则执行 Failure Paths 回退案并记录裁决
- [x] Fix：`pivot-table-demo.tsx` 移除 `classList.toggle('dark')` 与本地 dark state 镜像，按钮文案改经 `useSyncExternalStore(subscribeTheme)` 从全局 mode 派生，点击调 `setThemeMode`；spec 断言转 `html[data-mode='dark']` 计数 0↔1，画布存活性断言保留

Exit Criteria:

- [x] `theme.ts` 提供 subscribe 语义（pivot 组件无本地 dark state，grep 可核：仅 useSyncExternalStore + setThemeMode）
- [x] preset 单测先红后绿；tailwind-preset 包测试全绿（5/5）
- [x] dist 产物 grep 证据落日志：`dark\:bg-input/30:where([data-mode=dark],[data-mode=dark] *)` 在、`:is(.dark` 零残留（无回退案需要）
- [x] pivot spec 迁移后全绿（3/3）

### Phase 3 - 运行时主题切换（G-I 最小实现）

Status: completed
Targets: `apps/playground/src/main.tsx`、`apps/playground/src/App.tsx`、`apps/playground/src/styles.css`、`apps/playground/src/app.test.tsx`

- Item Types: `Proof | Fix`

- [x] Proof：app 单测新增（theme.test.tsx 5 用例）：`readStoredTheme` 非法存储值回退 classic/light；`setThemeMode/setThemeTheme` 设 `documentElement` 属性并持久化 `flux.theme`；切换器渲染与四态切换（fireEvent 驱动——`@testing-library/user-event` 未安装，draft review Minor-2）
- [x] Fix：`theme.ts`（Phase 2 已建全 API：read/apply/setThemeMode/setThemeTheme/subscribe）+ 切换器独立文件 `theme-switcher.tsx`
- [x] Fix：`main.tsx` 用 `applyTheme(readStoredTheme())` 替换硬编码两行；`App.tsx` 挂 `data-testid='theme-switcher'` 固定控件（右下贴边，NativeSelect ×2，可访问名「主题」/「模式」）
- [x] Fix：playground styles.css 补 `[data-mode='dark']` 下 `.nop-theme-root` shell 变量暗色覆盖（app 背景/文字/卡片面约 10 变量，语义暗色）+ `color-scheme: dark`（draft review Minor-3，styles.css:171 现硬编码 light）

Exit Criteria:

- [x] app 单测 5/5 绿（store 校验/容错/通知/切换器/subscribe 重渲染；组件独立成 `theme-switcher.tsx` 以避免 App 全依赖链进单测）
- [x] 切换器四态操作改 `documentElement` 的 `data-theme`/`data-mode` 且 `flux.theme` 持久化（单测断言）；无 React ThemeProvider/新增 context
- [x] `localStorage` 异常路径有容错（单测断言 Storage.getItem mock throw SecurityError）

### Phase 4 - e2e 四态验证与规约回写

Status: completed
Targets: `tests/e2e/theme-switcher.spec.ts`（新）、`docs/architecture/theme-compatibility.md`、`docs/architecture/styling-system.md`（如有冲突）、`docs/audits/visual-quality/cross-cutting-theme.md`

- Item Types: `Proof | Fix`

- [x] Proof：新建 `theme-switcher.spec.ts`（消费 V0 helper）：①切换四态断言 `data-theme`/`data-mode` 属性；②light↔dark 计算样式差异（`expectCssVarResolves('--background')` 值变化 + `dark:` 变体生效证据：flux-basic 页 `input-text` 渲染器输出的 ui `InputGroup`（根类带 `dark:bg-input/30`，`packages/ui/src/components/ui/input-group.tsx:17`，draft review Minor-4 钉名）在两态下 `getComputedStyleValue('background-color')` 实际变化）；③classic↔glass 令牌值差异；④`flux.theme` 持久化：reload 后属性保持
- [x] Fix：`theme-compatibility.md` 回写"暗色模式契约"节（单一触发器/data-theme 语义/宿主接入三步/包内适配规约/ai styles.css 门控回退范例/mobile 冗余半边 watch-only 备注）；styling-system.md 冲突表述校正（如无则不凑条目）
- [x] Fix：证据卡 `cross-cutting-theme.md` 四条 findings 裁决列回写（F1/F2/F3 → fixed 本 plan；F4 五包零 dark 现状 → 归属各域 plan 的登记确认），状态 `verified`

Exit Criteria:

- [x] `npx playwright test tests/e2e/theme-switcher.spec.ts` 全绿（4/4；执行修正：断言目标 InputGroup→`.nop-input`，flux-basic 页无 InputGroup 渲染物）。pivot spec 机制迁移 3/3 绿
- [x] `theme-compatibility.md` "Dark Mode Contract" 节与 live 行为一致（触发器/接入三步/门控回退范例 `flux-renderers-ai/src/styles.css`/mobile watch-only 备注均可溯源）；证据卡 F1/F2/F3 fixed、F4 adjudicated
- [x] 全量 `pnpm test:e2e` 回归：1480 passed / 1 failed / 43 skipped——唯一失败为 scada-perf 10 万图元 fps 负载型用例（40fps 阈值贴线），隔离复跑 5/5 全绿（best=43.3），判定负载型 flake 非本次回归；无任何切换器遮挡引发的点击失败

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-19，两轮）
- Verdict: `pass`（Round 1：revised，1 Major M-1 + 5 Minor；Round 2 复核：M-1 消解确认，但起草者新引入的 V1-F5 扩围被判假 finding（新 Major M-2，静态复现 + dev server 双实测证伪"令牌遮蔽"）——按修订清单撤回后零 Blocker/Major）
- Rounds: 2
- Findings addressed: M-1——pivot 按钮状态派生钉死方案 (b)：`theme.ts` 提供 `subscribeTheme`，组件经 `useSyncExternalStore` 从全局态派生、无本地镜像；Minor 1–5 全部吸收（Phase 2 前置子步骤建 theme.ts / fireEvent 驱动 / `color-scheme: dark` / 断言目标钉名为 ui InputGroup / 行号 :56-58）。M-2——V1-F5"令牌遮蔽"撤回（研究报告 §5 更正记录留档，特异性 (0,3,0) vs (0,1,0) 与源序无关），plan 中 Phase 3 令牌覆盖块、不可证伪 Exit、Phase 4 依赖括注全部移除。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–4 Exit Criteria 全勾）
- [x] 全部 in-scope confirmed live defect 已修复：双触发器双向半失效（F2）经统一 + pivot 迁移收口；`:root` 兜底缺失（F1）收口
- [x] 行为/契约结果已达成：`data-mode` 单一事实源有产物级证据（dist grep）；四态切换可交互可持久化（e2e 4 断言）
- [x] 必要 focused verification 已完成（各 Phase 先红后绿记录于日志 + 全量 e2e 回归，唯一失败为隔离复现通过的负载型 perf flake）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步：`theme-compatibility.md`、证据卡 cross-cutting-theme.md、roadmap 状态、daily log（styling-system.md 无冲突表述，未改动）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（2026-09-19 独立 closure auditor：**approved**，0 Blocker / 0 Major / 2 Minor，证据见 Closure 节）
- [x] `pnpm typecheck`（40/40）
- [x] `pnpm build`（40/40）
- [x] `pnpm lint`（40/40）
- [x] `pnpm test`（74/74 tasks + scripts 70/70 + 全量 e2e 1480 passed / 1 负载型 flake 见 Phase 4）
- [x] `pnpm check`（全链 exit 0 零新 hit——theme-tokens/playground styles.css 未触发 ui-consistency 规则）

## Deferred But Adjudicated

无——V1 四项交付全部在 scope 内；mobile `.dark` 冗余半边为已登记 watch-only（不属本 plan 修复面，改动它反而违反"不改包内样式"边界）。

## Non-Blocking Follow-ups

- 各域组件 dark 配色适配：归属 V5–V11b（路线图依赖列已排程）；V1 完成后 `dark:` 变体已可被各域直接消费。

## Closure

Status Note: 四 Phase 全 completed、Closure Gates 全勾；独立 closure auditor（fresh session，2026-09-19）实跑三项单测（theme-tokens 10/10、preset 5/5、theme.test 5/5）、dist 产物级证据（data-mode 变体在、`.dark` 变体零残留、dist 新鲜度核对）、pivot+theme-switcher e2e 独立复跑 7/7、Dark Mode Contract 逐条溯源、e2e 失败鉴别诚实核查（1480/1/43 + 隔离复现，无 full-green 虚报）、边界干净（零 ui/flux-core 变更）——verdict **approved**。Plan 标 `completed`，路线图 V1 行同日翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，2026-09-19）
- Evidence: 本节 verdict approved + `docs/logs/2026/09-19.md` plan 471 节；实跑证据：单测 20/20（三包合计）、dist grep data-mode 形态、pivot/theme-switcher spec 7/7、`grep classList pivot-table-demo.tsx` 零命中。2 Minor：①04-e2e-domain-pages.md 格式化 diff 系已登记前序残留随提交入库；②roadmap V1 行 planned→done 属本审计后收尾动作（已随本标记翻转）。

Follow-up:

- no remaining plan-owned work（各域 dark 配色适配归属 V5–V11b，路线图已排程；V2 起各域 work item 可直接消费 `dark:` 变体与 data-mode 触发器）
