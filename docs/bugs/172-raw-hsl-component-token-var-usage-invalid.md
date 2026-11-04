# 172 裸 HSL 分量令牌直用 var() 渲染失效（复刻页族透明/恒 light 三处实证）

> Created: 2026-11-04（replication-ux-fidelity roadmap U1-U6 收官盘入册；plan 846 F-S1-5 / 847 F-W3-1 / 850 F-V2-1 / 852 族 A）
> 状态：已修复（判别单测在案）

## 现象

playground 复刻页族多处渲染"透明/恒浅色"：S1/M3 floating-panel 背景透明（列表透显重影）、W3/I2/S2 深色主题 pivot 画布整块白底、V2 steps/wizard 八态状态色全部回退 initial、replication.css 既有 sticky-footer/goods-card 背景长期无效。

## 根因

两层叠加：

1. **宿主令牌格式**：playground `styles.css` 令牌为裸 HSL 分量（`--card: 0 0% 100%`，旧 shadcn 约定）。`var(--card)` 直作颜色值时声明 invalid-at-computed-value-time → 属性取 initial（透明），且 **var() 的 fallback 不生效**（fallback 仅在变量未定义时生效，定义了但解析无效不触发）。
2. **渲染器消费通道**：三种消费形态全部中招——inline `background: var(--token)` 无 fallback（floating-panel）；CSS 样式表 bare `var()` 17 处（flux-renderers-layout styles.css，steps 八态色全失效）；canvas 前取样式 probe（pivot `resolveDesignTokens` 读 computed 值 invalid 即回退 light fallback，深色恒白底）。

## 修复

- 页面级：replication.css 全量 `hsl(var(--token, fallback))` 形态（U1）+ `--repl-mall-*` 等页面令牌上提 `:root` 浅/深共享作用域（U6 族 C/F）。
- 渲染器级（U6 族 A，判别单测旧实现必挂）：pivot `resolveToken` invalid 时 `hsl(var(--token))` 包裹重试；layout styles.css 全量 hsl(var()) 化 + `styles-token-resolution.test.ts` 负回顾正则守护；floating-panel 补 fallback。
- V2 页面级 steps 覆盖块在渲染器修复后移除（反向验证 7/7 绿）。

## 教训

- 在令牌格式混合（裸分量 vs 完整函数）的宿主里，任何 `var(--token)` 直作颜色值的代码都是静默失效点；var() fallback 不能防"定义了但无效"。
- CSS 声明失效是 computed-value 时行为，构建期/lint 均不报错，只能靠 computed style 取证或像素采样发现。

## 关联

- improvement-analysis 2026-11-04 三条（floating-panel fallback / 裸 HSL 陷阱 / pivot probe）；plan 846/847/850/852。
