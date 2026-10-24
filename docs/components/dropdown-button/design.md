# Dropdown Button 组件设计

## 1. 组件定位

- `dropdown-button` 是带下拉菜单的动作按钮 renderer。
- 它服务于“主动作 + 次级菜单动作”场景，不替代通用导航菜单组件。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `dropdown-button`。
- Flux 正式契约应优先对齐当前 `button` 与 menu primitive 语言，而不是复制历史 `level` / `hideCaret` 兼容面作为核心字段。
- **split-button（arc-component-gap G5，2026-10-24）**："主动作 + 附着下拉"分体形态。**落点裁决：能力扩展，不新增 type**——决策表：

| 候选                                                  | 裁决     | 理由                                                                                                                                                                                                 |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) `dropdown-button` 能力扩展 `split` + `mainAction` | **采纳** | items/触发/关闭/定位协议已含全部机制（复用率 ~90%）；分体仅是触发面拆分，无独立契约边界；type 增殖需 matrix human gate                                                                               |
| (b) ui 新增 SplitButton primitive + 独立 type         | 拒绝     | 触碰 `packages/ui/src/index.ts` ask-first 保护区域；与 (a) 相比零契约增益（菜单协议完全同构）                                                                                                        |
| (c) `variant="split"` 枚举扩展（roadmap 暂定名）      | 拒绝     | `variant` 是与 `button` 家族共享的**视觉风格枚举**（default/outline/secondary/ghost/destructive/link），语义过载会造成"outline 分体按钮"这类非法组合；按 `showStrength` 先例改用直接语义字段 `split` |

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'dropdown-button'`
- 归属 `@nop-chaos/flux-renderers-layout`

## 4. schema 设计

- W3b 已落地字段（live `schemas.ts:236-266`）：`icon`、`variant`（视觉枚举 default/outline/secondary/ghost/destructive/link）、`size`、`items`、`trigger`（click/hover）、`side`、`align`、`sideOffset`、`disabled`；`label` 继承 BaseSchema。
- **split 模式（G5 新增）**：

```typescript
interface DropdownButtonSchema {
  // …W3b 既有字段…
  /** 分体模式（默认 `false`——缺省即现状合并态，行为零变化）：true 时主段派发 mainAction、caret 段打开菜单 */
  split?: boolean;
  /** 主段点击派发的动作（仅 split 模式消费；缺失时主段等同 caret 段打开菜单，见 §7） */
  mainAction?: ActionSchema | ActionSchema[];
}
```

## 5. 字段分类

- `label`: `value-or-region`
- `icon`、`variant`、`size`、`items`、`trigger`、`disabled`、`side`、`align`、`sideOffset`: `value`
- `split`: `value`（boolean）；`mainAction`: `value`（action，编译通道同 items 的 action 形状）

## 6. regions 与 slot 约定

- 首版优先使用 `items` 值配置，不开放额外 menu regions。

## 7. 运行期状态归属

- 打开态属于组件自身交互状态。
- **split 模式**：主段点击 → `helpers.dispatch(mainAction, { scope: node.scope })`（同 items action 派发通道，`evaluationBindings` 不注入 item/index）；caret 段打开/关闭菜单（打开态共享既有 `open` state）。`trigger: 'hover'` 在 split 模式仅作用于 caret 段（主段 hover 不开菜单——误触发成本不对称）。`disabled` 为整体禁用（两段同时）。主段无 `mainAction` 时退化为"两段均开菜单"（分体视觉 + 合并行为，不报错）。

## 8. 事件、动作与组件句柄能力

- 可长期支持 `component:open`、`component:close`，但首版重点仍是稳定 items contract。

## 9. 数据源、表达式、导入能力接入点

- `items` 可由表达式或 loader 产出最终菜单项。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dropdown-button` marker、`data-slot="dropdown-button-root"`。
- 视觉层复用 `Button` 与 `DropdownMenu` 相关 primitive。
- **split 模式 DOM（G5）**：根追加 `data-mode="split"`（未声明不输出）；两段包一层 `role="group"`（`data-slot="dropdown-button-group"`）；主段 `data-slot="dropdown-button-main"`（普通 button 语义，Enter/Space 派发）；caret 段 `data-slot="dropdown-button-caret-trigger"`（`aria-haspopup="menu"`，复用 DropdownMenuTrigger）；段间以 1px 分隔线衔接（视觉类，widget 自样式契约允许）。既有 `data-slot="dropdown-button-trigger"`/`caret` 仅存在于合并态，split 态不输出（判别锚点）。

## 11. 实现拆分建议

- 主按钮桥接、菜单项归一化、弹层状态桥接分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是和 `button-group`、导航菜单或通用 dropdown 重新重叠。
- **split 模式（G5）**：与 `button-group` 的边界——button-group 是多动作选择/编排容器，split 是单动作 + 附着菜单的分体触发；与 `button` + `dropdown` 组合的边界——split 共享一份 items/disabled/定位协议，宿主不自拼双按钮。首版不裁暗色 caret 分隔样式细节（widget 自样式）；`component:open`/`close` 句柄仍归后续阶段。
