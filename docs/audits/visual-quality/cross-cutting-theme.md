# 视觉质量证据卡：横切主题与暗色（V1）

> 状态: verified
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.1（已经三轮独立核实）
> Owner plan: `docs/plans/471-visual-quality-v1-theme-darkmode-foundation-plan.md`
> Owner docs: `docs/architecture/styling-system.md`、`docs/architecture/theme-compatibility.md`

## 域状态前置事实

令牌层对称：`packages/theme-tokens/src/styles.css` 324 变量、classic/glass × light/dark 四块对称。缺口全部在**消费层**与触发器统一；各包内部 dark 适配归各域 work item，V1 只做横切地基。

## Findings 清单

- [V1-F1] `:root` 无 `--success/--warning/--info` 兜底：三令牌只在 classic/glass 主题块定义（`apps/playground/src/main.tsx:11-13` 注释自证）
  - 证据: 普查 §7.1；研究报告核实扩展为 7 个语义色族（含 -bg 与 --danger，`--danger` 在 TS API `BASE_TOKEN_NAMES` 与主题块均在）
  - 裁决: fixed（plan 471 Phase 1：`:root` 补 7 个语义色兜底，classic-light 同值；styles.test.ts 先红后绿，主题块覆盖不变式断言在）
  - 状态: fixed
- [V1-F2] darkMode 触发器双轨：tailwind-preset `darkMode:['class','.dark']`（`:139`）与 tokens `data-mode` 触发器不一致，双触发器由各包手写——需统一为单一事实源
  - 证据: 普查 §7.1；研究报告实证：preset `['class','.dark']` 编译为 `.dark` 类变体而全仓无人加类（dark: 全体失效）、唯一 `.dark` 消费方 pivot demo 已迁移、mobile 文件本就双触发器
  - 裁决: fixed（plan 471 Phase 2：preset `darkMode: ['selector', '[data-mode="dark"]']`，dist 产物 grep 实证 `dark:bg-input/30` 编译为 `[data-mode=dark]` 形态且 `.dark` 变体零残留；pivot demo/spec 同步迁移；data-mode 单一事实源契约回写 theme-compatibility.md）
  - 状态: fixed
- [V1-F3] 运行时主题切换缺失：playground `main.tsx:14-15` 硬编码 classic/light（即 ui-review D2 的 G-I）——最小实现 classic/glass × light/dark 四态可切
  - 证据: 普查 §7.1
  - 裁决: fixed（plan 471 Phase 2/3：`theme.ts` 全局态 + subscribe、main.tsx 启动应用持久化值、App 壳 ThemeSwitcher 四态、shell `[data-mode='dark']` 暗色覆盖；theme-switcher.spec 4 断言：四态属性/计算样式翻转含 dark: 变体/classic↔glass 令牌差/刷新持久化）
  - 状态: fixed
- [V1-F4] graph/map/dashboard/pivot/scheduling 五包 styles.css 零 dark 规则，dark 全靠变量重定义而大量组件写死浅色（barcode `text-white` 族、gantt-bars `bg-white/blue-400`）——各包内修复归各域 work item，本卡登记为横切现状
  - 证据: 普查 §7.1
  - 裁决: 规约已由 plan 471 回写（theme-compatibility.md "Dark Mode Contract" 节：单一触发器/接入三步/包适配规约/门控回退范例/mobile 冗余半边 watch-only）；五包内 dark 适配修复归属 V11a/V11b 等各域 plan（路线图排程）
  - 状态: adjudicated

## 视觉证据

待 V1 plan 落地：`:root` 兜底令牌解析（L3 `expectCssVarResolves`）、四态主题切换（L3 双态计算样式断言）、暗色适配规约回写 `theme-compatibility.md`。

## Closure

（V1 closure audit 后回写）
