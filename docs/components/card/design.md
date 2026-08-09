# Card 组件设计

## 1. 组件定位

- `card` 是结构化卡片容器 renderer，用来承接标题、正文、尾部和操作区。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`），复用 `@nop-chaos/ui` Card primitive 作为视觉壳层。
- 建模围绕壳层与 regions，视觉变体通过 `variant` 等少量字段表达，而非大量专属字段。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'card'`
- 实际归属 `@nop-chaos/flux-renderers-content`
- 实际 regions: `header`、`body`、`footer`、`actions`

## 4. schema 设计

- 建议字段为 `title`、`header`、`body`、`footer`、`actions`、`image`、`imageClassName`、`variant`。

## 5. 字段分类

- `title`: `value-or-region`
- `header`、`body`、`footer`、`actions`: `region`
- `image`、`imageClassName`、`variant`: `value`

## 6. regions 与 slot 约定

- `header` 负责顶部壳。
- `body` 是主内容。
- `actions` 是卡片交互区。

### Media className 契约（L14）

顶部图片媒体经 `imageClassName?: string` 暴露作者 className 通道：renderer 用 `cn('aspect-video w-full object-cover', imageClassName)` 合并。默认 base（`aspect-video w-full object-cover`）保留合理视觉基线，作者 className 追加其后可扩展或覆盖（Tailwind 后置类覆盖前置）。renderer **不再用硬编码几何覆盖作者意图**——这与 styling-system 契约一致（widget renderer 自带视觉默认，但作者可控制）。回归锚见 `card.test.tsx` 的 L14 anchor。

## 7. 运行期状态归属

- 卡片本身无复杂状态。
- 展开、选中等交互如果需要，应作为专门增强字段并明确 ownership。

## 8. 事件、动作与组件句柄能力

- 可支持 `onClick` 作为卡片整体点击事件。
- 行级 itemScope（per-row `item`/`index` 求值上下文）是**集合** `cards` 的能力（见 `docs/components/cards/design.md` §6/§8），不属于独立的 `card`。独立 `card` 无 per-row itemScope，其 `onClick` 在自身节点 scope 求值。

### 8.1 面板刷新约定（panel-chrome 组合支撑，2026-08-09 裁定）

- **裁定：不新增 `refreshAction` 约定字段**（plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 4 Decision）。判据 = 示例 schema 体积与复用性：
  - 组合式仅需 header region 内一个 Button + `refreshSource` action（`targetId` 寻址 data-source name，约 5 行 schema），复用既有 action 机制，零新 API 面。
  - 字段式需要：card schema 新字段 + renderer 渲染按钮 + 无 data-source 时的禁用/隐藏语义（card 无法感知兄弟 data-source，需额外 registry 探测）——投入产出比低。
- **组合式约定**（供 BI 面板复用，走查单测 `card-refresh-convention.test.tsx`）：
  ```jsonc
  {
    "type": "card",
    "title": "营收走势",
    "header": [
      { "type": "button", "label": "刷新",
        "onClick": { "action": "refreshSource", "targetId": "sales" } }
    ],
    "body": [{ "type": "chart", "source": "${sales}", ... }]
  }
  ```
  `refreshSource`（按 data-source name 寻址）触发 `runtime.refreshDataSource` → 目标 controller `refresh()`，与筛选联动（dashboard-filter `filter.*` 发布）正交共存——见 `docs/components/dashboard-filter/design.md` §7。
- `refreshSource` 作者面参数是 **`targetId`（action 顶层字段）**，非 args 内嵌（`action-adapter`/`built-in-actions` 仅读 `action.targeting.targetId`）。

## 9. 数据源、表达式、导入能力接入点

- 标题、图片和子区域都可由表达式或 loader 产出最终值。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-card` marker。
- 视觉层复用 `@nop-chaos/ui` Card，不内嵌额外布局协议。

## 11. 实现拆分建议

- shell、header/body/footer composition 与点击能力分离实现。

## 12. 风险、取舍与后续阶段

- 需要防止 `card` 继续吸收 list/table 的集合语义。
- **panel-chrome 独立控件化评估（2026-08-09 记录）**：当前组合基线（card regions + header 刷新按钮 + dashboard-filter 联动）已满足 BI 面板需求，不新增独立控件；若未来组合重复 >3 次且出现无样式原语的共享语义，按 `docs/components/dashboard-filter/design.md` §7 的判据再评估。
