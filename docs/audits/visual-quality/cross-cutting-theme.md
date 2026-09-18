# 视觉质量证据卡：横切主题与暗色（V1）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.1（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/architecture/styling-system.md`、`docs/architecture/theme-compatibility.md`

## 域状态前置事实

令牌层对称：`packages/theme-tokens/src/styles.css` 324 变量、classic/glass × light/dark 四块对称。缺口全部在**消费层**与触发器统一；各包内部 dark 适配归各域 work item，V1 只做横切地基。

## Findings 清单

- [V1-F1] `:root` 无 `--success/--warning/--info` 兜底：三令牌只在 classic/glass 主题块定义（`apps/playground/src/main.tsx:11-13` 注释自证）
  - 证据: 普查 §7.1
  - 裁决: pending
  - 状态: open
- [V1-F2] darkMode 触发器双轨：tailwind-preset `darkMode:['class','.dark']`（`:139`）与 tokens `data-mode` 触发器不一致，双触发器由各包手写——需统一为单一事实源
  - 证据: 普查 §7.1
  - 裁决: pending
  - 状态: open
- [V1-F3] 运行时主题切换缺失：playground `main.tsx:14-15` 硬编码 classic/light（即 ui-review D2 的 G-I）——最小实现 classic/glass × light/dark 四态可切
  - 证据: 普查 §7.1
  - 裁决: pending
  - 状态: open
- [V1-F4] graph/map/dashboard/pivot/scheduling 五包 styles.css 零 dark 规则，dark 全靠变量重定义而大量组件写死浅色（barcode `text-white` 族、gantt-bars `bg-white/blue-400`）——各包内修复归各域 work item，本卡登记为横切现状
  - 证据: 普查 §7.1
  - 裁决: pending（V1 出规约，修复归 V11a/V11b 等各域）
  - 状态: open

## 视觉证据

待 V1 plan 落地：`:root` 兜底令牌解析（L3 `expectCssVarResolves`）、四态主题切换（L3 双态计算样式断言）、暗色适配规约回写 `theme-compatibility.md`。

## Closure

（V1 closure audit 后回写）
