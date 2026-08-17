# 渲染器能力增强：responsive 结构断点 + collapse/checkbox/chart

> 状态：最终设计（2026-08-16 实现并验证，plan `docs/plans/456-flux-renderer-improvements-plan.md`）
> 来源：`docs/analysis/sundial-ui-reproduction-analysis.md` G1/G2/G4/G7 + Sundial 复刻实测

## 1. 背景与问题

Sundial 复刻暴露了 flux 渲染层的四个 gap（详见 `docs/analysis/sundial-ui-reproduction-analysis.md` §5）：

| 编号 | 问题                                                       | 场景                                                                      |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| G7   | 无"同一区域按断点渲染不同子树"的 schema 原语               | Sundial 900dp 桌面三栏 ↔ 移动两页式、720dp rail↔pills、760dp KPI 2×2↔单行 |
| G1   | `collapse` 的 trigger 外观无法由 schema 语义化配置         | Sundial 折叠分组：色调条 + 彩色标题 + 等宽计数（当前靠 CSS 覆盖内部 DOM） |
| G2   | checkbox 圆形形态不可透传（ui 组件支持 `shape: 'circle'`） | Sundial 任务行 16dp 圆形 checkbox                                         |
| G4   | chart 单 series 无法逐点上色                               | Sundial 待办压力图：一桶一色（当前用多 series 分组柱近似）                |

已有能力（不复刻）：

- 样式层响应式：`flex.responsiveDirection` / `responsiveWrap`（Tailwind 断点类）
- 结构层先例：`page.aside` 移动端自动转 Sheet（page.tsx:95,260）
- 时间步进器：`input-time` steppers 模式（本日已落地）

## 2. D1：`responsive` 容器（G7，结构级响应式原语）

### 2.1 设计定位

Sundial 的 `BoxWithConstraints + when { wide -> TreeA else -> TreeB }`（App.kt:93-120）本质是：**同一逻辑区域，按视口断点选择一棵完整子树渲染**。CSS 只能切换同一棵树的样式，无法表达"换一棵树"（sidebar ↔ 底部导航、检查器 ↔ sheet 是不同组件树）。`responsive` 节点把这一模式提升为 schema 原语。

分工原则：**样式级（方向/间距/显隐）用 CSS 断点类（已有 responsiveDirection）；结构级（换树）用 `responsive` 变体**。

### 2.2 Schema

```jsonc
{
  "type": "responsive",
  "id": "app-shell",
  "testid": "app-shell",
  "variants": [
    {
      "key": "desktop",
      "min": "lg",
      "body": [
        /* 桌面树 */
      ],
    },
    {
      "key": "mobile",
      "body": [
        /* 默认树 */
      ],
    },
  ],
}
```

`ResponsiveVariantSchema`:

| 字段          | 类型                             | 说明                                                                                                                                                     |
| ------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`         | string                           | 变体标识（渲染调试用）                                                                                                                                   |
| `min` / `max` | `ResponsiveBreakpoint \| number` | 命名断点（sm=640/md=768/lg=1024/xl=1280/2xl=1536，对齐既有 `ResponsiveBreakpoint`）或任意 px 数值（Sundial 用 900/720/760 这类自定义值，仅命名断点不够） |
| `body`        | `BaseSchema[]`                   | 该变体的完整子树                                                                                                                                         |

匹配规则：按声明顺序取第一个同时满足 `min`/`max` 的变体；无匹配时用第一个无断点条件的变体（默认树，必填一个）。

### 2.3 运行时语义

- **检测**：`@nop-chaos/ui` 新增 `useBreakpoint(query: string): boolean | null`（单 query 契约：true=命中/false=未命中/null=环境无 matchMedia；内部 matchMedia 封装 + unsubscribe 清理，与 `useIsMobile` 同先例，符合 INV-1）。responsive 渲染器内部为每个变体断点建独立订阅，多断点监听是渲染器实现细节，不进 hook API。
- **切换**：断点跨越时整树卸载重建——与 Sundial 组合期分支语义一致；**scope 数据由页面层持有**，两棵树读同一份 scope，切换不丢状态（与 `page.aside` 移动端转 Sheet 的"同一 schema 不同渲染形态"先例同构）。
- **SSR/测试**：无 matchMedia 环境 `useBreakpoint` 返回 null，渲染器回退默认变体；测试通过 `vi.mock('@nop-chaos/ui')` 假 `useBreakpoint`（仓库既有先例 `page-responsive.test.tsx:5-11`，不注入 window.matchMedia）断言各变体。

### 2.4 落点

- `packages/flux-core/src/types/`：`ResponsiveBreakpoint` 已有（`flux-renderers-basic/src/schemas.ts:17`，需上移到 core 共享）+ 新增 `ResponsiveVariantSchema`
- `packages/flux-renderers-layout/`：新增 `responsive-renderer.tsx`（订阅断点 → 选变体 → `RenderNodes` 渲染 body）+ definition 注册
- `packages/ui/`：新增 `useBreakpoint(query)` hook（内部 matchMedia 封装）

### 2.5 示例（Sundial 900dp shell 切换）

```jsonc
{
  "type": "responsive",
  "variants": [
    {
      "min": 900,
      "body": [
        {
          "type": "flex",
          "direction": "row",
          "body": [
            {
              "type": "fragment",
              "body": [
                /* sidebar */
              ],
            },
            {
              "type": "fragment",
              "body": [
                /* 台账 */
              ],
            },
            {
              "type": "fragment",
              "body": [
                /* 检查器 */
              ],
            },
          ],
        },
      ],
    },
    {
      "body": [
        /* 顶栏 + 台账 + 底部导航 */
      ],
    },
  ],
}
```

### 2.6 拒绝的替代方案

| 方案                                      | 拒绝原因                                                       |
| ----------------------------------------- | -------------------------------------------------------------- |
| CSS 双树（`hidden md:block`）             | 两棵树同时存活：状态双活、事件冲突、schema 翻倍；仅过渡可用    |
| 给 flex/container 加 `mobileVariant` 特判 | 每类组件定制，组合爆炸，不通用                                 |
| 断点属性散布到每个节点                    | 侵入全部 schema；"换子树"语义放属性里混乱                      |
| 变体用 scope 表达式 `when` 驱动           | 响应式是视口问题而非数据问题；表达式引入依赖追踪复杂度，收益低 |

## 3. D2：`collapse` trigger 语义化（G1）

### 3.1 问题

`collapse` 的 trigger 外观 baked 在渲染器里（`px-4 py-3 border rounded-lg`），Sundial 分组头（色调条 + 彩色标题 + 等宽计数）只能靠 CSS 选择器覆盖内部 DOM（`.sd-section [data-slot='collapse-trigger']::before`），schema 无法表达"色调"语义。

### 3.2 Schema 扩展（向后兼容，全部可选）

```jsonc
{
  "type": "collapse",
  "items": [
    {
      "key": "overdue",
      "title": "逾期", // 现有：字符串标题
      "tone": "danger", // 新增：'brand'|'info'|'warning'|'danger'|'success'|'neutral'
      "count": 3, // 新增：右侧等宽计数（或表达式）
      "leading": { "type": "icon", "icon": "flag" }, // 新增：title 前自定义节点（色调条/图标）
    },
  ],
}
```

渲染器输出 marker 类（遵循样式契约：**渲染器只发 marker，视觉由宿主 CSS 决定**）：

- trigger 根：`data-tone="danger"`（`data-open` 在 collapse-item 根，既有）
- 色调条：`[data-slot="collapse-tone-bar"]`（tone 存在时渲染，3×18px，CSS 变量上色）
- 计数：`[data-slot="collapse-count"]`（monospace 由宿主 CSS 控制）
- `leading` region：`[data-slot="collapse-leading"]`（经 definition fieldRules 声明 `leading → leadingRegionKey`，复用现有 region 机制）

### 3.3 兼容性

- 现有 `title: string` 行为不变；`title` 为 schema（region）的用法保留
- 新增字段全部 optional，无破坏性
- Sundial 复刻页的 `.sd-section` CSS 覆盖可替换为原生 marker 类（后续清理，非本计划强制）

## 4. D3：checkbox `shape` 透传（G2）

### 4.1 问题

`@nop-chaos/ui` 的 `Checkbox` 支持 `shape?: 'square' | 'circle'`（`packages/ui/src/components/ui/checkbox.tsx:9`），但 flux `checkbox` 渲染器未透传，Sundial 圆形 checkbox 需 CSS 覆盖。

### 4.2 方案

`CheckboxSchema` 增加 `shape?: 'square' | 'circle'`（默认 `'square'`，向后兼容），`CheckboxRenderer` 透传给 ui `Checkbox` 的 `shape` prop。

### 4.3 边界

- 圆形形态只影响视觉（border-radius + checked 指示器），值语义不变
- Sundial 复刻页 `.sd-checkbox` CSS 覆盖可保留（自定义 checkmark），也可切换为 shape='circle'（默认圆点指示器）——宿主按需选择

## 5. D4：chart 逐点上色（G4）

### 5.1 问题

`ChartSchema.colors: string[]` 按 series 顺序取色；Sundial 压力图"同一数据系列内逐根柱不同色"（逾期=红/今天=橙/未来=蓝/无日期=灰）需 4 个 series 近似。

### 5.2 方案

`ChartSeriesSchema` 增加两个互斥字段（沿用 recharts `Cell` 模式）：

```jsonc
{
  "type": "chart",
  "source": "${pressure?.items}",
  "series": [{ "name": "压力", "dataRegionKey": "count", "colorRegionKey": "tone" }], // 新增：每数据点取色字段
}
```

- `series.colors?: string[]`：定长色板，按数据点索引取色（超出循环）
- `series.colorRegionKey?: string`：从数据记录中取色值（CSS 颜色字符串或语义色名）

实现：line/area/bar/scatter 渲染处，当 series 声明逐点上色时用 recharts `Cell` 包裹（bar/scatter）或 `stroke/point` 逐点赋值（line/area）。pie 已有 sector 上色能力，不重复支持。**已落地范围（2026-08-16）**：bar/scatter 用 recharts `Cell`；line/area 逐点着色未实现（recharts `Cell` 不适用于线图路径），line/area 声明 `colors`/`colorRegionKey` 时回退 series 色，见 §7。

### 5.3 兼容性

- 新字段 optional；未声明时行为与现状完全一致
- Sundial 压力图可改为单 series + `colorRegionKey`（mock 数据加 `tone` 字段），简化 schema

## 6. 非目标

- **不实现**：`input-date` 行触发/对话框承载形态与 Sundial 样式令牌（G3 剩余）——优化项，deferred
- **不实现**：移动端 Sundial Shell 完整复刻页（P8）
- **不修改**：`page.aside` 既有移动端行为
- **不引入**：容器查询（ResizeObserver 级响应式）——当前需求是视口级断点，matchMedia 足够；容器级留作后续扩展点

## 7. 测试与实现状态（2026-08-16 已落地）

- D1 `responsive`：`packages/flux-renderers-layout/src/responsive-renderer.tsx` + `packages/ui/src/hooks/use-breakpoints.ts` + `ResponsiveBreakpoint`/`ResponsiveVariantSchema`/`ResponsiveSchema`（flux-core）；Sundial workbench 已用（默认=桌面树，`max:'lg'` 移动变体）
- D2 `collapse`：`CollapseItemSchema.tone/count/leading` + `collapse-renderer.tsx` marker（`data-tone`/`collapse-tone-bar`/`collapse-count`/`collapse-leading`）；Sundial workbench 分组已改用语义字段
- D3 `checkbox`：`CheckboxSchema.shape` 透传到 ui `Checkbox`（`data-shape`）；Sundial 复刻页任务行已用 `shape:'circle'`
- D4 `chart`：`ChartSeriesSchema.colors`/`colorRegionKey` + bar/scatter Cell 逐点着色；Sundial 压力图已单 series 化
- 测试：各包 focused 测试 + playground 端到端断言；`check:schema-prop-coverage`（checkbox.shape 在扫描内）与 `check:i18n-keys` 全绿

## 8. 测试策略（原始设计，实现时按此执行）

（D1 部分调整：测试 mock 从 vi.mock 改为 window.matchMedia 注入，见 plan Phase 1 执行偏差记录）

- D1：`responsive-renderer.test.tsx`（`vi.mock('@nop-chaos/ui')` 假 `useBreakpoint`，仓库既有先例 page-responsive.test.tsx:5-11：默认变体 / 断点命中 / 切换重建 / scope 数据保持）
- D2：`collapse-renderer.test.tsx` 扩展（tone/count/leading 渲染 + marker 类 + 向后兼容）
- D3：`checkbox` 渲染器测试扩展（shape='circle' 透传；`shape` 字段在 check:schema-prop-coverage 扫描范围内，必须出现在测试中）
- D4：`chart-renderer` 测试扩展（colors/colorRegionKey 逐点上色，bar 为主）
- 覆盖载体：collapse/chart/responsive 不在 schema-prop-coverage 脚本扫描范围（rendererFiles 硬编码清单不含 layout/data definitions），以 focused 测试为覆盖载体
