# V1 研究报告：主题与暗色横切地基

> 核查日期: 2026-09-19
> 基线: master @ 27ba03729（V0 已收口，full-green）
> 输入: 普查报告 §7.1、路线图 V1、`docs/analysis/ui-review/C2-capability-gaps.md:30,50-57`（G-I 回写证据）、D2-closure §2.2 G-I 行
> V1 边界（路线图）: 不改各包内部样式（那是各域 work item 的事）——本报告核实横切地基四项交付的真实缺口
> 状态: 已独立核实（revised → M-1 与 5 Minor 修订后零 Blocker/Major，见文末核实记录）

## 0. 令牌层现状（前置事实）

`packages/theme-tokens/src/styles.css`（350 行）五块结构：

| 选择器                                           | 行    | 变量数 |
| ------------------------------------------------ | ----- | ------ |
| `:root`（基础块）                                | 1–111 | 100    |
| `:root[data-theme='classic'][data-mode='light']` | 112+  | 56     |
| `:root[data-theme='classic'][data-mode='dark']`  | 172+  | 56     |
| `:root[data-theme='glass'][data-mode='light']`   | 232+  | 56     |
| `:root[data-theme='glass'][data-mode='dark']`    | 292+  | 56     |

四个主题块与 `:root` 的差集为**同一组 30 个变量**（程序化 diff 验证）：`--gray-50..900`（10）、`--card-surface`、`--border-surface`、`--app-topbar-bg/--app-tabs-bg/--app-sidebar-bg`、`--glass-blur`、`--primary-bg/--primary-dark/--primary-light`、`--secondary`、`--secondary-foreground/--secondary-surface/--secondary-surface-hover`、**`--success/--success-bg/--warning/--warning-bg/--info/--danger/--danger-bg`（语义状态色 7 个）**。

TS API `BASE_TOKEN_NAMES`（`packages/theme-tokens/src/index.ts`）公开 `SUCCESS/WARNING/DANGER` 三键——语义状态色属公共令牌面。

## 1. Findings 与裁决

### V1-F1：`:root` 无语义状态色兜底（死配置风险的公共面）

**证据**：主题块外的裸宿主（仅 `@import '@nop-chaos/theme-tokens/styles.css'`、未设 `data-theme`/`data-mode` 属性）拿不到 `--success/--warning/--info` 等 7 个语义色——`main.tsx:11-13` 注释自证（"Mount theme attributes so theme-tokens data-theme selectors resolve (provides --success/--warning/--info defaults…)"）。当前 playground 恰好不受影响仅因 `apps/playground/src/styles.css:61-94` 有**第二套** `:root` 令牌（shadcn 风格 HSL）兜了语义色（:88-93）——兜底责任现在实际落在消费方，属倒挂。包外确有无回退消费方：`flux-renderers-data/src/sparkline-renderer.tsx:19` `hsl(var(--success))`、`tailwind-preset/src/index.ts:56-57`。

**裁决**：theme-tokens `:root` 补 **7 个语义状态色兜底**（`--success/--success-bg/--warning/--warning-bg/--info/--danger/--danger-bg`，取 classic-light 同值）。路线图只点名 3 个；扩展 `-bg` 伴随量与 `--danger` 属同族补齐（`--danger` 在 TS API 与主题块中均存在，缺兜底同理），作为轻微 scope 扩展在此显式声明。其余 23 个差集变量（gray 系/表面系/主题结构系）**不兜底**——它们是主题身份变量，兜底会掩盖"主题未加载"缺陷。

### V1-F2：darkMode 双触发器（单一事实源缺失）

**证据**（全部实证）：

- `packages/tailwind-preset/src/index.ts:139` `darkMode: ['class', '.dark']`；根 `tailwind.config.ts` 经 presets 消费，playground v4.2.2 经 `@config` 兼容层加载。
- **构建产物实证**（`apps/playground/dist/assets/index-*.css`）：`dark:` 工具类编译为 `.dark\:border-input:is(.dark *)` 形态——即 `@config` 兼容层**确实读取** preset 的 `darkMode`，变体挂在 `.dark` 类上。
- 令牌侧触发器是 `:root[data-mode='dark']`（theme-tokens 四块）。
- **`.dark` 类的现存生产消费方（独立核实 M-1 反证，起草时遗漏）**：`apps/playground/src/pages/pivot-table-demo.tsx:155` `document.documentElement.classList.toggle('dark', next)`，页面头部有「暗色/亮色」切换按钮（:159-171）；`tests/e2e/pivot-table-demo.spec.ts:39-56` 锁定该按钮（`getByRole('button', { name: '暗色' })`）并断言 `html.dark` 出现/消失。→ 现状是**双向半失效**：data-mode 只换令牌不激活 `dark:` 变体；.dark 只激活变体不换令牌。
- `dark:` 工具类分布：ui 包 78 处（含 `dark:bg-input` 10 处、`dark:aria-invalid` 18 处），其余包零星；ai 包 `dark:` 零命中。
- 唯一 `.dark` CSS 消费点 `flux-renderers-mobile/src/styles.css:47-55` 本身就是双触发器选择器列表（`.dark .nop-mobile, [data-mode='dark'] .nop-mobile`），注释明示"host strategy：both"——data-mode 半边已在，**无需迁移**；统一后 `.dark` 半边成冗余但不致错（watch-only，不动包内样式）。

**裁决**：单一事实源 = `data-mode` 属性。tailwind-preset `darkMode` 改为 `['selector', '[data-mode="dark"]']`；**实现时必须实证编译形态**：重建 playground 后 grep dist CSS 确认 `dark:` 变体编译为 `data-mode` 选择器形态（v4 兼容层对 `['selector', …]` 的支持以产物为准——核实员已在 `node_modules/tailwindcss` dist 的 darkMode 处理函数确认 `['selector', n]` → `&:where(n, n *)` 可用；若产物实证失败，回退方案是在 playground `styles.css` 加 `@custom-variant dark (&:where([data-mode='dark'], [data-mode='dark'] *));` 并保留 preset v3 语义注释说明差异——两案取实证通过者）。**pivot demo 切换按钮迁移**（独立核实 M-1 要求）：`pivot-table-demo.tsx` 的 `toggleTheme` 不再 toggle `.dark` 类，改为调共享 `setThemeMode`（见 F3）翻转 `data-mode` + 持久化；`pivot-table-demo.spec.ts:39-56` 同步迁移为断言 `html[data-mode='dark']`（机制变更的测试迁移，非放松）。新 App 壳切换器不得使用「暗色」/「亮色」可访问名（避免与 `getByRole('button', { name: '暗色' })` 类定位 strict-mode 歧义，命名用「主题」/「模式」语汇）。

### V1-F3：运行时主题切换缺失（G-I 最小实现）

**证据**：`main.tsx:14-15` 硬编码 `classic`/`light`（`// Tech debt: dark mode toggle is a separate plan`）；C2-capability-gaps.md:57 裁决 G-I 真实缺口收窄为"运行时主题切换入口缺失（L4 小项）"。

**裁决**（playground 域内实现，不涉包）：

- `main.tsx`：启动时从 `localStorage`（键 `flux.theme`）读 `{theme, mode}`，校验合法值后 `setAttribute`（默认 classic/light）——渲染前应用，无 FOUC。
- App 壳新增固定位置切换器（`apps/playground/src`，用 `@nop-chaos/ui` 组件，`data-testid='theme-switcher'`）：theme（classic/glass）× mode（light/dark）四态，切换即 `setAttribute` + 持久化。**位置约束**（独立核实 Minor-5）：固定浮层须避开页面交互热区——落右下角小尺寸控件（`position:fixed; right/bottom` 贴边），全量 e2e 回归验证无遮挡引发的点击失败。
- **shell 暗色最小适配**：`.nop-theme-root` 系变量（app 背景/文字等，playground styles.css:106-176）现全亮色——dark 下组件面换肤而页面背景仍是亮色渐变，四态切换的视觉差异失真。在 playground styles.css 补 `[data-mode='dark']` 下 shell 变量的最小暗色覆盖（背景/文字/卡片面约 10 个变量）。这是 playground 自有样式（非包内），不违反 V1 边界。
- 切换器只动 `documentElement` 属性与 localStorage，不引入 React ThemeProvider（theme-independence 原则）。

### V1-F4：暗色适配规约缺失

**证据**：`docs/architecture/theme-compatibility.md` 现状需核对（plan 拟制时逐节核对）；当前无任何文档写明 dark 触发器契约（哪个属性、谁负责设置、包如何消费）。

**裁决**：theme-compatibility.md 回写"暗色模式契约"节：单一触发器 `data-mode`、`data-theme` 语义、宿主接入步骤（引 styles.css + 设属性 + 可选切换器）、包内 dark 适配的规约（用 `[data-mode='dark']` 选择器或经统一后的 `dark:` 变体，禁自造触发器）、以及 mobile 文件冗余 `.dark` 半边的 watch-only 备注。**第三轨登记**（独立核实 Minor-4）：`flux-renderers-ai/src/styles.css:282/336/361` 的 `@media (prefers-color-scheme: dark)` 回退带 `:root:not([data-mode='light'])` 门（显式 data-mode 优先、无属性宿主才回退系统偏好）——与统一方向兼容，作为"门控回退"范例写入规约，不改动。styling-system.md 若有冲突表述一并校正。

## 2. 明确不做（V1 边界）

- 不做任何包内组件的 dark 配色适配（V5–V11b 各域事务；本报告只统一触发器让 `dark:` 变体在未来真正生效）。
- 不动 `flux-renderers-mobile/src/styles.css`（其规则已双触发器兼容，data-mode 半边工作正常）。
- 不做第三主题、不做主题编辑器、不做 per-page 主题覆盖。
- 不动 `flux-core`/renderer 契约（无产品运行时代码变更——本 work item 仅涉 theme-tokens CSS、tailwind-preset 配置、playground app 层）。

## 3. 验证方式（V1 plan 的 Proof 面）

1. theme-tokens 单测（styles.test.ts 扩展）：`:root` 含 7 个语义色兜底且四主题块仍覆盖（特异性不变式：主题块值优先）。
2. tailwind-preset 单测：darkMode 期望更新 + 编译形态实证记录（构建产物 grep）。
3. playground 单测：切换器 setAttribute + localStorage 持久化 + 非法值回退默认。
4. e2e（V0 工具链首批域消费）：四态切换 spec——属性断言 + 计算样式断言（light/dark 下同一元素 `dark:` 类样式的实际变化、classic/glass 下令牌值差异）+ 刷新持久化。
5. `pnpm check` 全链绿（theme-tokens CSS 新增行为纯增量，豁免基数不受影响——语义色兜底在 `:root`，门禁扫描 renderer 包源码）。

## 4. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-19）
- Verdict: `revised`（0 Blocker / 1 Major / 5 Minor）
- 已处理：M-1——补登 pivot-table-demo `.dark` 切换消费方与 pivot spec e2e 锁定（起草时遗漏），裁决追加"切换按钮迁移到共享 setThemeMode + spec 迁移为 data-mode 断言 + 新切换器命名回避"；Minor-1 :root 变量数 82→100；Minor-2 dark: 分布改为 ui 包 78 处（ai 包零）；Minor-3 playground 第二套 :root 行号校正（61-94，语义色 :88-93）；Minor-4 F4 补 ai styles.css 门控 prefers-color-scheme 回退范例登记；Minor-5 F3 补切换器位置约束与全量回归要求。
- 核实亮点：tailwindcss 4.2.2 compat 层源码确认 `['selector', n]` darkMode 可用（→ `&:where(n, n *)`）；`var(--gray-)` 包外零命中支持"主题身份变量不兜底"裁决；replica-visual 系列无像素比对断言、固定切换器无截图类冲突；`flux.theme` localStorage 键无冲突。

## 5. 追加 finding 的更正记录（撤回）

- ~~[V1-F5] playground 自有令牌块遮蔽 theme-tokens mode 响应值~~——**撤回**。起草者在 plan review 阶段声称 playground `styles.css:61-94` 的裸 `:root` 以源序优势遮蔽 theme-tokens 主题块的 dark 值，**该断言为假**：CSS 特异性 `:root[data-theme][data-mode]` (0,3,0) 恒胜裸 `:root` (0,1,0)，与源序无关。独立 plan reviewer 以两级实测证伪（静态忠实复现 + 真实 dev server 金标准，探针 `_tmp/v1f5-shading-inspect/`，gitignored）：设 `data-theme=classic data-mode=dark` 后 `--background` 解析为 classic-dark 的 `222 84% 5%`、`--input` 为 `217 33% 18%`——令牌层 dark 解析正确，无遮蔽。附带修正认知：playground 裸 `:root` 的真实角色是裸宿主兜底（连亮态下其 `40 30% 98%` 都从未在显式主题下生效），非遮蔽者。教训：值级 diff 还须带特异性口径；本记录留档防止该假 finding 被后续 plan 引用。
