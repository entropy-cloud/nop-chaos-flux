# U6 归族表 — 系统性归族与设计系统层整改（plan 852）

> Date: 2026-11-04
> Source: `docs/plans/852-replication-ux-u6-family-remediation-plan.md`（U1-U5 走查报告 §共性根因/§残留 汇总归族）
> 状态标记：`fixed`（渲染器/共享 CSS 就地修复 + 判别单测）、`registered`（improvement-analysis 登记，Why Not Blocking）、`watch-only`（族 G 保留不修，逐项 Why Not Blocking）。

## 归族表（族 A-G → 修复落点 → 验证 → 状态）

| 族  | 根因 / finding                                                                                                                                                | 修复落点                                                                                                                                                                                                                                                                       | 验证                                                                                                                                                                  | 状态       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| A-1 | 裸 HSL 分量令牌 × pivot `resolveDesignTokens()` probe：`var(--background)` 直作颜色值 invalid → 恒回退 light fallback → 深色 pivot 画布白底（W3/I2 实证）     | `packages/flux-renderers-pivot/src/pivot-option.ts`：probe 首试 `var(--token)`，invalid 时 `hsl(var(--token))` 包裹重试（border 保留 `1px solid ` 前缀模板）；判别单测 `pivot-option.test.ts`（mock getComputedStyle 按 probe 值形态分流，裸分量场景旧实现必挂）               | `pnpm --filter @nop-chaos/flux-renderers-pivot test`（68 绿，含 2 条判别单测）+ 深色抽检取证（§3）                                                                    | fixed      |
| A-2 | flux-renderers-layout `styles.css` 17 处 bare `var()` 引用 HSL 分量令牌 → steps/wizard 八态状态色失效（V2 实证）                                              | `packages/flux-renderers-layout/src/styles.css`：颜色令牌全量 `hsl(var(...))` 包裹（`--radius` 等非颜色令牌除外）；判别单测 `styles-token-resolution.test.ts`（bare var() 禁止断言 + hsl 通道正向哨兵 + 禁止双重包裹）                                                         | layout 包 165 测试绿；replication.css `.nop-steps/.nop-wizard` V2 覆盖块移除后 `replication-iot-ota-rollout` spec 7/7 绿（裁决见 §2）                                 | fixed      |
| A-3 | floating-panel inline `background: var(--nop-floating-panel-bg)` 无 fallback → 宿主未定义令牌时面板透明（S1 实证）                                            | `packages/flux-renderers-mobile/src/floating-panel.tsx`：补 `var(--nop-floating-panel-bg, #ffffff)` fallback；单测 `bottom-panels.test.tsx`（源码契约断言——happy-dom 在 CSSStyleDeclaration 层丢弃 var() 背景声明，DOM 断言不可行，故 readFileSync 断言，旧实现必挂）          | mobile 包 384 测试绿；replication.css `--nop-floating-panel-bg` 页面级定义保留为深色防御层（裁决见 §2）                                                               | fixed      |
| B   | ui `ChartContainer` `aspect-video` × 定高 → svg 宽钉扎横裁切（C3 实证）                                                                                       | —（packages/ui 公共导出面/样式契约为保护区）                                                                                                                                                                                                                                   | improvement-analysis 2026-11-04 条目确认在案（plan 847 登记 + U6 回写）；页面级 `aspect-ratio:auto` 兜底维持                                                          | registered |
| C   | `--repl-mall-*` 令牌定义在 `.repl-mobile-canvas-screen`（mobile 画布），desktop `.repl-mall-dist` 无继承通道 → 重复定义块                                     | `apps/playground/src/complex-pages/shared/replication.css`：令牌上提 `:root`（浅）+ `:root[data-mode='dark']`（深），mobile canvas 与 S2 `.repl-mall-dist` 两处定义块收敛为消费面                                                                                              | 21 页 replication spec 全量绿（§4）；`--repl-mall-price` 深色值 `#ff7a45` 双主题抽检                                                                                  | fixed      |
| D   | kanban 列 CSS `min-width:280px/max-width:360px` 单边钳断 schema 数值 `columnWidth`（U3 F-K2-1：`minWidth/maxWidth: undefined` 被 React 省略、CSS 钳制仍生效） | `packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx`：`columnWidth` 数值时内联 `minWidth/maxWidth` 同值声明完成覆盖；CSS 钳制仅服务无 schema 宽度的默认态；判别单测 `kanban-list-structure.test.tsx`（columnWidth=400 内联 min/max-width:400px 断言，旧实现必挂） | scheduling 包 focused 测试绿（8/8 结构测试文件）                                                                                                                      | fixed      |
| E   | crud `CrudQueryActions` 合成 Search/Reset 对 × queryForm carrier 默认 actions 同屏重复（U3 F-I1-1）                                                           | —（消重涉及 action 组合契约裁决：合成对与 carrier 自带 submit/reset 的所有权语义，非低风险就地修）                                                                                                                                                                             | improvement-analysis U6 条目登记（Why Not Blocking：页面级 `queryForm.actions: []` 已兜底、21 页全绿，契约裁决 crud owner 主导单独立项）                              | registered |
| F   | replication.css 自身收敛（P2 MIN-5）：浅色硬编码直值、hsl(var()) 写法复核                                                                                     | `replication.css`：新增 `--repl-mall-text-inverse` 令牌（§2.1 --mall-text-inverse 等价），4 处 `color:#ffffff` 白面收敛变量引用；`hsl(var())` 全量复核——文件内零 bare var() 颜色引用（grep 证零残留）                                                                          | V2/S2/M3 spec 抽样 + 全量绿（§4）；保留直值均为防御性 fallback 或上游实测基线值（`rgba(255,255,255,.72)` 次级白面、box-shadow 阴影——§2.2 实测档位，非浅色语义硬编码） | fixed      |
| G   | watch-only residual 集                                                                                                                                        | —（逐项保留）                                                                                                                                                                                                                                                                  | 见 §4 清单                                                                                                                                                            | watch-only |

## §2 A-2 / A-3 裁决记录

- **A-2 V2 覆盖块（replication.css `.nop-steps`/`.nop-wizard`）**：移除。渲染器侧 hsl(var()) 化落地后页面级 hsl() 包裹等价声明成纯重复，U5 注明「归族时收敛渲染器侧后可移除」；移除后 `replication-iot-ota-rollout` spec `--retries=0` 7/7 绿反向验证通过。
- **A-3 replication.css `--nop-floating-panel-bg` 变量兜底**：保留为防御层。渲染器 fallback（`#ffffff`）只保证浅色不透明；深色主题下面板需 `#1d1e22`（`[data-mode='dark'] .repl-mobile-canvas-screen` 块），渲染器侧无法按主题取直值，页面级变量定义是深色正确性的唯一通道——非冗余兜底，裁决保留。

## §3 深色主题抽检（P2 MIN-5 复核销单）

- W3 pivot 深色画布：`resolveDesignTokens` 修复后 VTable theme 读到深色 `--background` 分量（hsl 包裹通道），画布底色 computed 取证 + 截图 `_tmp/ux-fidelity/u6/`（white-block 销单取证）。
- I2 双轴趋势页 pivot 同根因同证。
- 证据文件：`_tmp/ux-fidelity/u6/u6-dark-w3-pivot.png`、`u6-dark-i2-pivot.png`（取证后按 AGENTS.md `_tmp` 约定保留至 U7 复检）。

## §4 族 G watch-only residual（U7 复检清单，逐项 Why Not Blocking）

| 项                            | Why Not Blocking                                                    |
| ----------------------------- | ------------------------------------------------------------------- |
| 4px 表格盒模型伪影            | 边框合并模型差异的亚像素伪影，非破损；上游同形态                    |
| 深色 echarts 轴标签低对比     | 可读性降级非不可读；echarts 主题接入归 chart 渲染器 owner           |
| V3 深色 basemap 恒浅灰        | map 底图瓦片无深色源，产品级裁决非页面修复                          |
| O1 深色低置信浅底             | `--repl-low-confidence-bg` 无深色套（上游客户实证形态），watch-only |
| W1 表单桌面形态 / 无导航头    | 壳 chrome 差异豁免在案（baseline §2.3）                             |
| pivot 表头截断                | 长表头换行策略归 VTable 主题裁决                                    |
| steps process/finish 同色实心 | 设计形态（上游同），非缺陷                                          |

## §5 判别单测清单（旧实现必挂机制）

| 单测                                                                                     | 旧实现挂点                                                                       |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pivot-option.test.ts`「裸 HSL 分量令牌：hsl() 包裹重试解析出深色值而非 light fallback」 | 旧实现只 probe `var(--token)`，mock 对裸 var 形态返回 invalid → 恒回退 `#ffffff` |
| `pivot-option.test.ts`「正常直值令牌不走 hsl() 通道」                                    | 守护回归：首次 probe 即 valid 时不得误入包裹通道                                 |
| `styles-token-resolution.test.ts` bare var() 禁止断言                                    | 旧 styles.css 17 处 bare `var(--颜色令牌)` 直接命中                              |
| `bottom-panels.test.tsx` fallback 源码契约断言                                           | 旧 `var(--nop-floating-panel-bg)` 无 `, #ffffff` 后缀                            |
| `kanban-list-structure.test.tsx` columnWidth=400 内联 min/max-width                      | 旧实现 `minWidth/maxWidth: undefined` → style 属性无 min/max-width 声明          |

## §6 全量验证数字（Phase 3 硬门）

- 21 页 replication spec `--retries=0`：209 test 全绿（见 plan Closure Gates 回填）。
- 单测：pivot 68 / layout 164 / mobile 384 / scheduling focused 绿；全仓 `pnpm test` 全绿。
- `pnpm typecheck` / `build` / `lint` / `check` 全过（check 零新增红，见 daily log）。
