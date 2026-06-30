# Flux 开发指南 - 给 AI 看的精简版

> **一句话**：Flux 是 nop-chaos-flux 的 JSON-to-React 低代码框架。你写 JSON Schema，引擎编译并渲染成 UI。

---

## 核心架构

```
JSON Schema (含 type 字段)
  → SchemaCompiler 编译为 CompiledTemplate (TemplateNode + CompiledValueNode)
  → RendererRegistry 按 type 查找匹配的 React 组件
  → 递归渲染子节点 regions.body.render() / regions.header.render()
  → 每个渲染器可关联 FormRuntime / SurfaceRuntime / DataSource 等运行时
```

- **渲染器注册**：`registry.register({ type: 'xxx', component: MyRenderer })`
- **类型系统**：所有组件继承 `BaseSchema`（`flux-types/common.d.ts`），通过 `type` 字段区分
- **数据域**：组件树通过 `ScopeRef` 形成词法作用域，子可访问父，父不可访问子
- **响应式系统**：Value 原语内建依赖跟踪，`useScopeSelector` 实现细粒度重渲染
- **Action Algebra**：声明式动作 DAG（`when`/`then`/`onError`/`parallel`），编译器预编译执行图

## 类型定义位置

**所有组件的 TypeScript 接口定义在 `flux-types/*.d.ts`，这是绝对准确的知识源。** 需要查组件字段时直接看对应文件：

| 文件          | 内容                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `common.d.ts` | `BaseSchema`, `BoundFieldSchemaBase`, `ActionShapeFields`, `ApiSchema`, `SchemaInput`, `SchemaExpression` |
| `schema.d.ts` | 所有组件 Schema 接口（Page/Form/Table/Dialog/Mobile 等）                                                  |
| `index.ts`    | `FluxSchema`（所有组件的联合类型）+ `FluxSchemaByType`（type→接口映射）                                   |

> 看 TypeScript 接口即知 JSON 怎么写：接口的属性名就是 JSON key，类型就是值的类型。

## 跨组件共性

所有组件共用 `BaseSchema` 的属性：`id`, `name`, `label`, `title`, `className`, `frameClassName`, `classAliases`, `when`, `visible`, `hidden`, `disabled`, `testid`, `frameWrap`, `validateOn`, `showErrorOn`, `onMount`, `onUnmount`, `xui:imports`。

所有表单项继承 `BoundFieldSchemaBase`：`name`, `readOnly`, `required`, `mode`, `labelAlign`, `labelWidth`, `hint`, `description`, `remark`, `labelRemark`。

选项类控件还继承选项能力：`options`, `source`, `multiple`, `clearable`, `creatable` 等。

## 如何用

```typescript
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { pageRenderer } from '@nop-chaos/flux-renderers-basic';
import { textRenderer } from '@nop-chaos/flux-renderers-basic';

// 创建 SchemaRenderer 组件
const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer]);

// 配置 env
const env = {
  fetcher: (config) => fetch(config.url, config).then((r) => r.json()),
  notify: (type, msg) => alert(msg),
  confirm: (msg) => window.confirm(msg),
  navigate: (to) => (window.location.href = to),
};

// render 返回 ReactNode
const schema = { type: 'page', title: '首页', body: 'Hello' };
<SchemaRenderer schema={schema} schemaUrl="local" env={env} />;
```

## 文件索引

| 文件               | 解决什么问题                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `01-quickstart.md` | 17 个最常用代码段速查（page/CRUD/form/dialog/combo/action/source/wizard/tabs/loop/relation/upload/confirm/alert） |
| `02-reference.md`  | 表达式语法、API 配置、事件系统、数据流、Action Algebra、表单校验、结构节点、Tabs 状态管理                         |
| `flux-types/`      | 所有组件的 TypeScript 接口（字段知识源）。入口见 `flux-types/index.ts`                                            |
| `design-patterns/` | 常见业务场景的完整解法 cookbook                                                                                   |
| `mobile/`          | 移动端原生组件专题（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar）                                |

### `design-patterns/` 清单

| 文件                                  | 场景                                     |
| ------------------------------------- | ---------------------------------------- |
| `design-patterns/crud.md`             | 标准 CRUD + 搜索 + 新增/编辑/删除        |
| `design-patterns/form.md`             | 表单提交 + 校验 + 嵌套表单               |
| `design-patterns/data-source.md`      | 命名数据源 + 轮询 + 公式派生             |
| `design-patterns/conditional.md`      | 显隐 + 条件激活 + loop 集合展开          |
| `design-patterns/custom.md`           | 自定义渲染器 / 自定义表单项 / 自定义动作 |
| `design-patterns/tabs.md`             | Tab 导航布局 + 受控/非受控切换           |
| `design-patterns/cascading-select.md` | 远程选项联动（省市区级联）               |
| `design-patterns/file-upload.md`      | 文件/图片上传                            |
| `design-patterns/cards.md`            | 卡片列表展示                             |

### `mobile/` 清单

| 文件                        | 场景           |
| --------------------------- | -------------- |
| `mobile/pull-refresh.md`    | 下拉刷新容器   |
| `mobile/infinite-scroll.md` | 触底加载更多   |
| `mobile/swipe-cell.md`      | 左滑操作单元格 |
| `mobile/countdown.md`       | 倒计时组件     |
| `mobile/notice-bar.md`      | 通知栏组件     |
