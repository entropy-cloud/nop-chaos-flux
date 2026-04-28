# Drawer 组件设计

## 1. 组件定位

- `drawer` 是抽屉式弹层 renderer。
- 它与 `dialog` 共享弹层语义，但强调边缘滑入和较强的上下文保留。

## 2. 与 AMIS 或既有产品的能力对照

- 当前代码库已同时具备 declarative `drawer` renderer 和 `@nop-chaos/ui` Drawer primitive。
- 首版应优先保留方向、打开态和内容区，不额外复制一整套 dialog 专属字段别名。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'drawer'`
- 预期归属 `@nop-chaos/flux-renderers-basic`
- 预期 regions: `title`、`body`、`actions`

## 4. schema 设计

- 建议字段为 `title`、`body`、`actions`、`data`、`open`、`defaultOpen`、`side`、`size`、`showCloseButton`、`statusPath`。
- `data` 若存在，其语义应与 `page` / `form` / `dialog` 保持一致：初始化 drawer own scope patch。

Current live implementation note:

- 通用 declarative `type: 'drawer'` renderer 已落位，但这里描述的完整 surface contract 仍在逐步补齐
- `statusPath` 已是 declarative drawer 的 current live capability
- `data` 仍属于 target/recommended baseline，不应误读为 declarative renderer 已完整支持

## 5. 字段分类

- `title`: `value-or-region`
- `body`、`actions`: `region`
- `data`: `value`
- `open`、`defaultOpen`、`side`、`size`: `value`
- `onOpen`、`onClose`: `event`

## 6. regions 与 slot 约定

- 与 `dialog` 基本一致。

## 7. 运行期状态归属

- 打开态与 `dialog` 一样应明确 ownership。
- drawer 自己拥有的是 surface state，而不是其子树 form/source/table 的业务状态。
- drawer 外部若需要读取状态，应通过 `statusPath` 读取只读 summary DTO。
- 若未来需要 subtree-local 读取当前弹层状态，优先与 dialog 共用 `$surface`，不要单独发明 `$drawer`。
- 共享 surface owner 规则以 `docs/architecture/surface-owner.md` 为准。

Current live implementation note:

- shared `SurfaceRuntime` / root host stack 当前主要适用于 action-opened managed drawer path
- declarative drawer renderer 当前是直接 UI wrapper path，不应自动视为已经接入同一套 host-managed surface runtime
- declarative drawer 当前已支持在 renderer path 上发布 `statusPath` summary，但这不等于它已经接入 managed surface runtime

## 8. 事件、动作与组件句柄能力

- 推荐支持 `component:open`、`component:close`。
- `onOpen`、`onClose` 通过 action schema 触发，示例应覆盖至少一组最小事件用法。
- `component:open` / `component:close` 只解决 surface control；内部表单提交、source 刷新等仍应进入更具体 owner 的语义入口。

## 9. 数据源、表达式、导入能力接入点

- 与 `dialog` 一致，内容与标题支持表达式和 regions。
- `data` 初始化 drawer own scope；drawer subtree 默认仍按普通 lexical scope 规则继承父级，除非某个更窄 fragment 显式 `isolate`。

Current live implementation note:

- action-opened managed drawer 当前会创建 child scope
- declarative drawer renderer 当前不应被表述为已经完整支持 `data` 初始化 own scope patch

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-drawer` marker。
- 视觉和可访问性交互复用 `@nop-chaos/ui` Drawer。
- 标准 shell 结构应为 `DrawerContent -> DrawerHeader? -> DrawerBody -> DrawerFooter?`。
- `DrawerContent` 负责弹层壳行为；默认 body spacing 应归 `DrawerBody`，并与 dialog 保持相同的 body-slot 责任边界。

## 11. 实现拆分建议

- 抽屉 open-state、方向/尺寸映射和 host integration 分离。

## 12. 风险、取舍与后续阶段

- 需要避免 dialog/drawer 两套契约出现命名漂移；差异应尽量只保留在 `side` 和视觉壳层。
