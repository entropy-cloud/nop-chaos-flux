# Icon 组件设计

## 1. 组件定位

- `icon` 是独立的图标展示 renderer，用来输出语义图标而不是通用图片资源。
- 它服务于按钮、标签、状态展示和标题补充等轻量场景。

## 2. 与 AMIS 或既有产品的能力对照

- 当前实现只需要 `icon` 名称。
- 图标尺寸、颜色和可访问性文本应通过通用样式字段与必要的 `aria-label` 扩展补齐，而不是把图标 renderer 做成迷你图片组件。

### Flux 决策表（X5 扩展，E3）

| 能力                                                   | 首版决定                                                           | 理由                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size: number \| 'sm' \| 'md' \| 'lg'`（像素 / token） | **实现**（缺省回退 `16`；token 映射 `{ sm: 12, md: 16, lg: 20 }`） | 与 `lucide-react` `size` prop 一致（number 路径）；token（`sm`/`md`/`lg`）是 DX 糖，作者无需记像素值。`md` = 既有缺省 `16`，零迁移成本。pixel 值是 Flux icon 自定 token，不绑定 shadcn `Button` size 语义。invalid token（如 `'xl'`）回退 `16` + dev warn（Failure Path `icon-size-token-invalid`）。 |
| `color: string`（CSS color / 语义值）                  | **实现**                                                           | 映射到 inline `style.color`，lucide SVG 走 `currentColor`；保留 `meta.className` 优先级（外层样式仍可覆盖）。                                                                                                                                                                                         |
| `decorative` / `title`（a11y 字段）                    | 不采纳（首版，follow-up）                                          | a11y 字段与 size/color 视觉维度正交；当前 `aria-hidden="true"` 固定满足装饰图标默认语义；归独立 a11y 增强（已记入 plan Deferred）。                                                                                                                                                                   |
| echarts / 自定义 SVG 集合                              | 不采纳                                                             | 继续用 `resolveLucideIcon` + `lucide-react`；自定义 SVG 集合与 `image` 边界模糊，归后续评估（见 §12）。                                                                                                                                                                                               |

**Decision（`size` 类型）**：`number | 'sm' | 'md' | 'lg'`（union 类型，保留 number 逃生口；不用 object 形态 `{ preset?, pixels? }`，避免过度设计）。number 路径直接对齐 lucide `size` prop（缺省回退 `16`）；token 映射 `{ sm: 12, md: 16, lg: 20 }`，与 lucide 默认尺寸阶梯对齐，`md` = 既有缺省 `16`。invalid token（如 `'xl'`）回退 `16` + dev warn。**注**：pixel 值是 Flux icon 自定 token，不强行绑定 shadcn `Button` `size` 语义（后者是 `xs/sm/lg/icon` 视觉变体，非像素 token）。

**Decision（`color` 传递方式）**：`color` 字符串 → inline `style={{ color }}`（lucide 走 `currentColor`）；保留 `meta.className` 优先级，外层 `className` 仍可覆盖。理由：inline style 简单可观测，不与 `className` 系统 conflict。

## 3. Flux 中的 renderer/type 定义

- `type: 'icon'`
- `category: 'content'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`

## 4. schema 设计

- 当前导出字段为 `icon`、`size?`、`color?`。
- `size?: number | 'sm' | 'md' | 'lg'` — 像素尺寸或 token。number 路径缺省回退 `16`；非有限值或 `<=0` 回退 `16`。token 映射 `{ sm: 12, md: 16, lg: 20 }`（与 lucide 默认尺寸阶梯对齐；`md` = 既有缺省 `16`，零迁移成本）。invalid token（如 `'xl'`）回退 `16` + dev warn（Failure Path `icon-size-token-invalid`）。
- `color?: string` — CSS color 字符串（如 `#ff0000`、`currentColor`、`var(--my-token)`）；映射到 inline `style.color`（lucide 走 `currentColor`）；缺省不应用。
- `title`/`decorative` 等 a11y 字段后续补充，名称对齐 `lucide-react` / UI icon adapter 通用语言（见 §2 follow-up）。

## 5. 字段分类

- `icon`: `value`
- `size`: `value`（number | `'sm'` | `'md'` | `'lg'`）
- `color`: `value`（string）

## 6. regions 与 slot 约定

- `icon` 不暴露 regions。
- 复杂图标组合应通过容器或按钮等上层组件完成。

## 7. 运行期状态归属

- 无内部状态。

## 8. 事件、动作与组件句柄能力

- 首版不提供事件。
- 如果图标需要交互，应由 `button` 或 `link` 包裹，不建议把 `icon` 直接升级为操作组件。

## 9. 数据源、表达式、导入能力接入点

- `icon` 字段可接表达式结果，但结果必须是稳定图标名。
- 外部图标映射和注册应由 icon adapter 负责。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-icon` marker。
- `size` 由 schema 字段驱动（缺省 `16`），替代历史硬编码 `size={16}`；token（`sm`/`md`/`lg`）解析为 `{ sm: 12, md: 16, lg: 20 }` 像素值，number 路径不变，invalid token 回退 `16`。
- `color` 映射到 inline `style.color`（lucide `currentColor`）；保留 `meta.className` 优先级。

## 11. 实现拆分建议

- 图标查找、fallback 和错误处理应集中在共享 icon utils。

## 12. 风险、取舍与后续阶段

- 如果未来支持自定义 SVG，需要明确与 `image` 的边界。
- 未注册图标的回退策略需要统一，避免各 renderer 自己兜底。
