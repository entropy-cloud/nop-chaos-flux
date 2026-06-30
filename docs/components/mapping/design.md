# Mapping 组件设计

## 1. 组件定位

- `mapping` 是值到展示结果的映射 renderer，用来把业务值稳定地转换成文本、badge 或小片段内容。
- 它不是通用表达式 escape hatch，也不是地图组件。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `mapping` / `map`。
- Flux 只保留 canonical `mapping` 名称，不保留 `map` 作为第二个 type 名。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'mapping'`
- 归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议正式字段为 `value`、`map`、`placeholder`、`defaultLabel`、`item`。

## 5. 字段分类

- `value`、`map`、`placeholder`、`defaultLabel`: `value`
- `item`: `region`

## 6. regions 与 slot 约定

- `item` 可作为命中映射项后的可选模板区。

## 7. 运行期状态归属

- `mapping` 无复杂 owner 状态。

## 8. 事件、动作与组件句柄能力

- 首版不要求专门事件或句柄。

## 9. 数据源、表达式、导入能力接入点

- `value` 与 `map` 均为 value-or-expression prop（`map: "${statusMap}"` 合法）。`map` 取值来源仅限**静态对象或表达式**，无组件级 `source`/loader 字段（`MappingSchema` 不含 `source`/`initApi`/`api`；与请求下沉审计一致，组件级请求被显式拒绝）。`map` 应由 loader/组装层注入到 scope，或经 `map:"${...}"` 表达式从 page scope 取得。

### 9.1 source-scope 契约（重复上下文）

- `map` 是 per-row prop：在 `cards`/`list`/`crud` 行内，`map` 对各自 row scope 求值。
- 绑 page-level 的共享 `map` 表达式（如 `map:"${statusMap}"`，`statusMap` 在 page scope）经词法继承每行解析到**同一对象**（无 per-row 发散）。
- renderer 无 once-per-renderer cache；行为 = 每 row / 每 render 的 prop 重求值（与所有 prop 一致，无特殊缓存语义）。

### 9.2 empty `map` / 未命中 / 无 wildcard fallback

- `map:{}` + 有 value → miss → 落 `defaultLabel ?? placeholder ?? null`。
- `lookupMap` 逐字 key 匹配（`hasOwnProperty(String(value))`），**无 `*` 通配 fallback**：即使 `map` 含 `'*'` 键，未命中 value 也不会命中该键。`'*'` 仅作为字面 key，当 value 本身等于字符串 `"*"` 时才命中。

### 9.3 loader-sourced map + 「loader wins」precedence —— DESIGN-ACK-NOT-IMPL

- Flux 当前无 mapping loader/source 机制。loader-sourced map + 「loader wins」precedence 是**独立 feature**（Flux 从未声称）。
- 裁定：`DESIGN-ACK-NOT-IMPL` + successor B7。如产品判断需要，开独立 feature plan，评估为 loader/组装层职责（`map` 经 loader 注入 scope 或表达式），而非在 mapping renderer 内加 `api`/`source`。
- 当前 vacuously 满足「无 precedence 冲突」（无 loader → 无 loader-vs-static 冲突）。详见 `docs/plans/2026-06-26-2016-1-b62-button-mapping-toast-styling-contract-plan.md` 的 `Deferred But Adjudicated` 节。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-mapping` marker。

## 11. 实现拆分建议

- 映射规则归一化、默认显示、可选 badge/template 投影分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是继续把 `mapping` 和“任意值渲染逻辑”混为一谈，失去稳定 contract。
