# Link 组件设计

## 1. 组件定位

- `link` 是导航或可点击文本 renderer。
- 它负责语义化链接，而不是按钮式主操作。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`）。
- 保留 `label`、`href`、`target`、`rel` 与 `onClick`，负责语义化链接而非按钮式主操作。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'link'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `label`、`href`、`target`、`rel`、`disabled`、`onClick`。

## 5. 字段分类

- `label`: `value-or-region`
- `href`、`target`、`rel`: `value`
- `onClick`: `event`

## 6. regions 与 slot 约定

- `label` 可为简单文本或受限 schema 片段。

## 7. 运行期状态归属

- 无复杂状态。

## 8. 事件、动作与组件句柄能力

- `onClick` 可与导航并存，但需要明确优先级与默认阻止策略。
- `example.json` 应展示 `onClick` 与基础导航字段并存的最小写法。

## 9. 数据源、表达式、导入能力接入点

- `href` 和 label 支持表达式。
- 更复杂的路由跳转仍应与 action/runtime 集成。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-link` marker。

## 11. 实现拆分建议

- 导航适配、action-click 兼容和文本内容渲染分离。

## 12. 风险、取舍与后续阶段

- 需要清楚区分 `link` 与 `button`：前者偏导航文本，后者偏动作触发。
- **URL 协议校验（安全红线）**：`href` 在进入 `<a href>` 前经 `isSafeNavigationUrl` 白名单校验（`sanitize.ts`）——放行 `http/https/mailto/tel/data:` 与无 scheme 相对 URL；`javascript:`/`vbscript:`/`blob:`/`file:` 等 scheme 一律视为无 href（label 仍渲染，链接不可导航）。`href` 可绑定数据源记录（`${item.link}`），不做此校验即构成点击在当前页面上下文执行脚本的 XSS 面；该姿态与 html/markdown sanitize 门禁剥除 `javascript:` URI 一致。`data:` 为既有下载链路保留（CRUD export 写入 `data:text/csv` href）——data: 导航打开 opaque origin 文档，不触达 opener（C6.1 link P0-1）。
