# Cards 组件设计

## 1. 组件定位

- `cards` 是卡片集合 renderer，用来把一组记录渲染成统一的卡片列表或卡片网格。
- 它是有 UI 的 collection renderer，不是 `card` 的简单重复，也不是 `list` 的视觉别名。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `cards`，但 Flux 应优先保留清晰的 collection owner 语义，而不是复制历史字段面。
- `cards` 与 `card`、`list`、`crud` 关系紧密，但边界不同：`card` 是单项壳层，`cards` 是卡片集合，`crud` 是复合数据工作流。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'cards'`
- 归属 `@nop-chaos/flux-renderers-content`（roadmap §95 authoritative；package-reorganization-analysis L210 验证。卡片集合是"内容族"，不是"数据族"，尽管与 `list`(data) 共享 collection 协议——见 §12 watch-only residual）
- 组件性质：`category: 'data'`

## 4. schema 设计

- 建议正式字段为 `items`、`card`、`empty`、`keyField`、`selectionMode`。
- `items` 是唯一正式集合字段。
- `card` 是单条记录的卡片模板 region，不单独发明 `itemCard`、`cardTpl` 之类平行命名。
- `selectionMode`（CD1 锁定）：单一开关控制 none/single/multiple。**`'none'`（含未设的默认值，`resolveSelectionMode` 对 undefined/非法一律回退 `'none'`）同时关闭点击高亮 visual 与 selection state——无部分禁用**。`'none'` 时 `handleSelect` 早退（不写 `selectedKeys`、不触发 `onSelectionChange`），`data-selected`/`aria-selected`/选中 ring 不可能为真。Flux 用 `selectionMode`（受控词表）而非 amis `selectable`（boolean）——后者无法表达 single/multiple 互斥语义，属 NOT-ADOPTED amis 术语。

## 5. 字段分类

- `items`、`keyField`、`selectionMode`: `value`
- `card`: `region`
- `empty`: `value-or-region`
- `onItemClick`、`onSelectionChange`: `event`

## 6. regions 与 slot 约定

- `card` 是单项卡片模板，运行在当前记录作用域内（per-row itemScope）。
- `empty` 是空态区域。

## 7. 运行期状态归属

- `cards` 自己拥有的是集合展示相关交互态，例如选择。选择为 **local controlled state**（renderer 自维护），经 `onSelectionChange` 上报；`selectionMode` 控制 none/single/multiple。
  - `selectionMode:'none'`（含默认）off-disables-both：`handleSelect` 早退（`cards-renderer.tsx:209`），`data-selected`/`aria-selected`/选中 ring 均不可能为真（`cards-renderer.tsx:172,174,183`）。即使绑了 `onItemClick`，卡片可点击（`interactive=true`）但无选择高亮。回归锚：`cards-selection-itemaction.test.tsx`「selectionMode none disables BOTH」。
- 数据加载和错误状态默认仍属于上游 `source` / `data-source` owner。

## 8. 事件、动作与组件句柄能力

- 推荐最小事件为 `onItemClick`、`onSelectionChange`。
- `onItemClick`（CD4 锁定）：action 的求值/target scope 是 **per-row itemScope**（`cards-renderer.tsx:125,151-154`，每张卡 `helpers.createScope({ item, index })`，dispatch 时 `{ scope: itemScope }`）。故 action 内 `${item.x}` / `${index}` 解析到**被点行**的值（非 root），`setValue` 写入也落到该行的 itemScope。回归锚：`cards-selection-itemaction.test.tsx`「onItemClick reads ${item.label} and resolves to the CLICKED row」。
- `onSelectionChange` 的 dispatch scope 是 cards 节点 scope（page 级，`cards-renderer.tsx:225`），与 `onItemClick` 的 per-row itemScope 区分明确。

## 8.1 advertised-but-dead 契约诚实裁定

早期 schema 曾声明 `selectionOwnership`/`selectionStatePath` 与 `onPageChange` 事件，但 renderer 从未读取它们——选择只存于本地 `useState`（local controlled），且 renderer 没有任何分页逻辑（`onPageChange` 永不触发）。这是「发布了 renderer 本体从不接线的契约」一类缺陷，会误导照契约编 schema 的作者。三者已从 `CardsSchema` 与 renderer definition 移除（见 `docs/plans/2026-06-25-0510-2-new-package-advertised-contract-and-lifecycle-honesty-plan.md` WS-A）。

- 选择归属为 **local controlled state**（已由 `selectionMode` + `onSelectionChange` 真实落地）。若未来需要把选择发布到 scope 供兄弟组件读取，应重新引入显式的 ownership 契约**并同时实现** scope 写回管线，再恢复字段声明——不得再次保留暗示了未实现能力的死字段。
- 若未来真正引入分页，应另立 plan 实现 `onPageChange` 桥接（外部分页），再恢复事件声明。
- 推荐最小句柄为 `component:refresh`、`component:getSelection`、`component:setSelection`。

## 9. 数据源、表达式、导入能力接入点

- `items` 应优先接收最终记录数组或标准列表载荷中的 `items`。
- 原始业务数据到卡片视图模型的投影应优先在 loader 或 source adaptor 中完成。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-cards` marker。
- 视觉壳应复用 `@nop-chaos/ui` Card 体系或相关 primitive，不在 renderer 内硬编码布局策略。

## 11. 实现拆分建议

- 集合迭代、选择状态桥接、分页桥接、卡片模板渲染分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把 `cards` 重新做成 `list` 的视觉变体而失去独立的 collection contract。
- 第二个风险是把卡片集合的查询、分页、批量操作都塞回 `cards`，与 `crud` 发生 owner 重叠。

## 13. 响应式行为

> 实现落地于「新落地 renderer 响应式 successor」plan（`docs/plans/2026-06-24-2358-1-newly-landed-renderer-responsive-followups-plan.md`）。引用 M0 移动端基线（`docs/architecture/mobile-responsive-baseline.md`，断点 768px）。

- **schema 字段**：`columns?: number | { sm?: number; md?: number; lg?: number }`。
  - 缺省（`undefined`）= 原默认行为，由 Tailwind `sm:grid-cols-2 lg:grid-cols-3` 表达（mobile 1 / sm 2 / lg 3），**逐字节零回归**。
  - `number`（如 `3`）= 全断点统一列数，经内联 `style.gridTemplateColumns = repeat(N, minmax(0, 1fr))` 表达，硬编码 Tailwind 列类移除。
  - `{ sm?, md?, lg? }` = per-breakpoint，经运行时 `useIsMobile()` 分支派生（见下）。
- **裁定（Decision B — 运行时分支派生列数）**：`columns` 为对象时，列数经 `useIsMobile()` 运行时分支切换内联 `gridTemplateColumns`（与 grid `buildGridStyle` 范式一致），并在移动视口发布 `data-responsive="narrow"`（与 crud/chart/grid 范式对齐）。理由：内联 style 无法表达 `@media`，且 Tailwind 动态列类无法被 content scanning 识别，故 per-breakpoint 用运行时分支而非纯 CSS。
- **断点解析**（`useIsMobile()` 单一 768px 阈值，`md`/`lg` 合并到桌面桶）：
  - 移动（< 768px）：`sm ?? 1`
  - 桌面（≥ 768px）：`lg ?? md ?? 3`
- **marker**：`.nop-cards` 根在 `columns` 为对象且当前为移动视口时增 `data-responsive="narrow"`；`number` 与缺省均不输出 marker。
- **hairline 迁移裁定**：cards 卡片间当前用 `gap-3`（间距）作视觉分隔，**无** `divide-*`/`border` 分隔线需要迁移。故 `nop-hairline` 迁移项裁定为「无需迁移」（gap 间距即视觉分隔，非分隔线），记录于此。`nop-cards` marker 与 `data-slot="cards-root"` 保留不变。
- **schema 透明**：无新 `mobileUI` 标志位、无 `*-mobile` 组件。移动分支完全在 renderer 内部由 `useIsMobile()` 决定；缺省行为与改动前一致。
