# Icon 组件设计

## 1. 组件定位

- `icon` 是独立的图标展示 renderer，用来输出语义图标而不是通用图片资源。
- 它服务于按钮、标签、状态展示和标题补充等轻量场景。
- 图标解析基于 `lucide-react`，通过名称映射兼容 Ant Design 图标命名。

## 2. 与 AMIS 或既有产品的能力对照

- 当前实现只需要 `icon` 名称。
- 图标尺寸、颜色和可访问性文本应通过通用样式字段与必要的 `aria-label` 扩展补齐，而不是把图标 renderer 做成迷你图片组件。
- 支持 Ant Design 图标名称兼容：输入 `ant-design:setting-outlined` 自动解析为 Lucide `settings`。

### Flux 决策表（X5 扩展，E3）

| 能力                                                   | 首版决定                                                           | 理由                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size: number \| 'sm' \| 'md' \| 'lg'`（像素 / token） | **实现**（缺省回退 `16`；token 映射 `{ sm: 12, md: 16, lg: 20 }`） | 与 `lucide-react` `size` prop 一致（number 路径）；token（`sm`/`md`/`lg`）是 DX 糖，作者无需记像素值。`md` = 既有缺省 `16`，零迁移成本。pixel 值是 Flux icon 自定 token，不绑定 shadcn `Button` size 语义。invalid token（如 `'xl'`）回退 `16` + dev warn（Failure Path `icon-size-token-invalid`）。 |
| `color: string`（CSS color / 语义值）                  | **实现**                                                           | 映射到 inline `style.color`，lucide SVG 走 `currentColor`；保留 `meta.className` 优先级（外层样式仍可覆盖）。                                                                                                                                                                                         |
| `decorative` / `title`（a11y 字段）                    | 不采纳（首版，follow-up）                                          | a11y 字段与 size/color 视觉维度正交；当前 `aria-hidden="true"` 固定满足装饰图标默认语义；归独立 a11y 增强（已记入 plan Deferred）。                                                                                                                                                                   |
| echarts / 自定义 SVG 集合                              | 不采纳                                                             | 继续用 `resolveLucideIcon` + `lucide-react`；自定义 SVG 集合与 `image` 边界模糊，归后续评估（见 §12）。                                                                                                                                                                                               |
| Ant Design 图标名称兼容                                | **实现**                                                           | 通过 `ANT_DESIGN_LUCIDE_MAP` 映射表将 Ant Design 图标名（含 `ant-design:` 前缀和 `-outlined`/`-filled`/`-twotone` 后缀）解析为 Lucide 图标名。映射表约 207 条，覆盖 Ant Design 常用图标集。                                                                                                           |
| FontAwesome 前缀剥离                                   | **实现**                                                           | `toIconLookupKey()` 已剥离 `fa`/`fas`/`far`/`fa-solid` 等前缀，保持向后兼容。不引入 FontAwesome 渲染依赖。                                                                                                                                                                                            |

**Decision（`size` 类型）**：`number | 'sm' | 'md' | 'lg'`（union 类型，保留 number 逃生口；不用 object 形态 `{ preset?, pixels? }`，避免过度设计）。number 路径直接对齐 lucide `size` prop（缺省回退 `16`）；token 映射 `{ sm: 12, md: 16, lg: 20 }`，与 lucide 默认尺寸阶梯对齐，`md` = 既有缺省 `16`。invalid token（如 `'xl'`）回退 `16` + dev warn。**注**：pixel 值是 Flux icon 自定 token，不强行绑定 shadcn `Button` `size` 语义（后者是 `xs/sm/lg/icon` 视觉变体，非像素 token）。

**Decision（`color` 传递方式）**：`color` 字符串 → inline `style={{ color }}`（lucide 走 `currentColor`）；保留 `meta.className` 优先级，外层 `className` 仍可覆盖。理由：inline style 简单可观测，不与 `className` 系统 conflict。

**Decision（Ant Design 兼容层）**：不引入 `@ant-design/icons` 依赖。通过静态映射表 `ANT_DESIGN_LUCIDE_MAP`（~207 条）将 Ant Design 图标名转换为 Lucide 图标名。解析流程：检测 `ant-design:` 剥离前缀 → 剥离 `-outlined`/`-filled`/`-twotone` 后缀 → 查映射表 → 未命中则用原名查 Lucide → 未命中则回退 `Circle`。理由：避免双图标库 bundle 开销，保持 lucide-react 单一渲染源。

## 3. Flux 中的 renderer/type 定义

- `type: 'icon'`
- `category: 'content'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`

## 4. schema 设计

- 当前导出字段为 `icon`、`size?`、`color?`。
- `icon?: string` — 图标名称（kebab-case Lucide 名、`ant-design:*` 兼容名、或 FA 前缀名均可）。经 `resolveLucideIcon()` 解析为 Lucide 组件。
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

## 11. 图标名称解析流程

图标名称通过 `resolveLucideIcon()` 解析，流程如下：

1. **输入规范化**：`normalizeIconName()` 剥离 FA 前缀（`fa`/`fas`/`far`/`fa-solid` 等）、空白/下划线转连字符、小写化。
2. **Ant Design 前缀检测**：若输入含 `ant-design:` 前缀，剥离前缀后进一步处理。
3. **Ant Design 后缀剥离**：移除 `-outlined`/`-filled`/`-twotone` 变体后缀。
4. **映射表查找**：在 `ANT_DESIGN_LUCIDE_MAP` 中查找 Ant Design 名对应的 Lucide 名。约 207 条映射，覆盖方向、文件、图表、表单、导航等常见图标。
5. **别名映射**：应用 `ICON_ALIAS_MAP`（`house` → `home`、`gear`/`cog` → `settings-2` 等）。
6. **PascalCase 转换**：`toLucideKey()` 将 kebab-case 转为 PascalCase（如 `settings-2` → `Settings2`）。
7. **Lucide 查找**：在 `lucide-react` 的 `icons` 对象中按 PascalCase 键查找。
8. **回退**：未命中时返回 `Circle`（`resolveLucideIcon`）或 `null`（`resolveLucideIconStrict`）。

### Ant Design 图标映射表（部分示例）

完整映射见 `packages/ui/src/lib/icon-utils.ts` 中的 `ANT_DESIGN_LUCIDE_MAP`。

| Ant Design 名称            | Lucide 等价                                                | 说明      |
| -------------------------- | ---------------------------------------------------------- | --------- |
| `setting`                  | `settings`                                                 | 齿轮/设置 |
| `robot`                    | `bot`                                                      | 机器人    |
| `dashboard`                | `gauge`                                                    | 仪表盘    |
| `warning`                  | `triangle-alert`                                           | 警告三角  |
| `check-circle`             | `circle-check-big`                                         | 勾选圆    |
| `close`                    | `x`                                                        | 关闭      |
| `loading`                  | `loader-circle`                                            | 加载中    |
| `team`                     | `users`                                                    | 团队      |
| `notification`             | `bell`                                                     | 通知铃铛  |
| `edit`                     | `square-pen`                                               | 编辑      |
| `delete`                   | `trash-2`                                                  | 删除      |
| `search`                   | `search`                                                   | 搜索      |
| `left`/`right`/`up`/`down` | `chevron-left`/`chevron-right`/`chevron-up`/`chevron-down` | 方向箭头  |
| `menu`                     | `menu`                                                     | 菜单      |
| `ellipsis`                 | `ellipsis`                                                 | 更多      |
| `filter`                   | `funnel`                                                   | 筛选      |
| `sort-ascending`           | `arrow-up-narrow-wide`                                     | 升序      |
| `sort-descending`          | `arrow-down-wide-narrow`                                   | 降序      |

## 12. 实现拆分建议

- 图标查找、fallback 和错误处理应集中在共享 icon utils（`packages/ui/src/lib/icon-utils.ts`）。
- `ANT_DESIGN_LUCIDE_MAP` 映射表与 `resolveLucideIcon` 一起维护在 icon-utils 中，避免分散。
- IconRenderer（`packages/flux-renderers-basic/src/icon.tsx`）仅负责渲染，不做名称解析。

## 13. 风险、取舍与后续阶段

- 如果未来支持自定义 SVG，需要明确与 `image` 的边界。
- 未注册图标的回退策略需要统一，避免各 renderer 自己兜底。
- Ant Design 映射表需要定期与 `@ant-design/icons` 版本同步更新。
- FontAwesome 前缀剥离保留向后兼容，但不引入 FA 渲染依赖——纯 lucide-react 渲染源。
