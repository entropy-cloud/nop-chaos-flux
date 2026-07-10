# 宿主集成（env 与 SchemaRenderer props）

> Schema 只是 JSON 声明；请求、字典、权限、动态页面、命名空间导入等**能力由宿主提供**。本文列出宿主必须/可选提供的接口。类型源看 `packages/flux-core/src/types/renderer-api.ts` 的 `RendererEnv` 与 `renderer-hooks.ts` 的 `SchemaRendererProps`。

---

## SchemaRenderer props 全量

`createSchemaRenderer()` 返回的组件接收以下 props（必填项加粗）：

| prop                  | 类型                        | 说明                                                       |
| --------------------- | --------------------------- | ---------------------------------------------------------- |
| **`schema`**          | `SchemaInput`               | 要渲染的 JSON schema                                       |
| **`schemaUrl`**       | `string`                    | schema 逻辑地址，用作缓存键 / `xui:imports` 解析基准       |
| **`env`**             | `RendererEnv`               | 宿主能力集合（见下）                                       |
| **`formulaCompiler`** | `FormulaCompiler`           | 表达式编译器，`createFormulaCompiler()` 创建               |
| `registry`            | `RendererRegistry`          | 渲染器注册表（不传则用 `createSchemaRenderer(defs)` 内建） |
| `data`                | `Record<string, any>`       | 页面初始数据                                               |
| `plugins`             | `RendererPlugin[]`          | 编译/动作管线插件（见下）                                  |
| `moduleCache`         | `ModuleCache`               | `xui:imports` 模块缓存，`createModuleCache()` 创建         |
| `strictValidation`    | `boolean`                   | 严格校验模式（未知属性等升级为 error）                     |
| `onActionError`       | `(error, ctx) => void`      | 全局动作错误回调                                           |
| `onRuntimeChange`     | `(runtime \| null) => void` | 运行时实例变更回调                                         |

```tsx
<SchemaRenderer
  schemaUrl="app://users/list"
  schema={schema}
  registry={registry}
  env={env}
  formulaCompiler={formulaCompiler}
  data={{ tenantId: 1 }}
  plugins={plugins}
  strictValidation={false}
/>
```

---

## RendererEnv 契约

```ts
interface RendererEnv {
  // ── 必填 ──
  fetcher: (api, ctx) => Promise<ApiResponse>; // 所有 ajax action 走这里
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;

  // ── 常用可选 ──
  confirm?: (message, title?) => Promise<boolean>; // confirm action 依赖它
  alert?: (message, title?) => void; // alert action 依赖它
  navigate?: (to: string | number, options?: { replace?: boolean }) => void;

  // ── 数据/字典/页面 ──
  loadDict?: (name, signal?) => Promise<DictBean>; // select 等的 dict 字段依赖它
  loadPage?: (path, signal?) => Promise<SchemaInput>; // 动态加载子页面 schema

  // ── 权限 ──
  hasRole?: (role: string) => boolean; // xui:roles 过滤（配合插件）

  // ── 表达式扩展 ──
  functions?: Record<string, (...args) => any>; // ${MYFUNC(...)}
  filters?: Record<string, (input, ...args) => any>; // ${x | myFilter}

  // ── xui:imports ──
  importLoader?: ImportedLibraryLoader; // 加载命名空间库
  resolveImportUrl?: (schemaUrl, from, options?) => string; // 解析 import 的 from

  locale?: string; // 缓存分段键
}
```

### fetcher

所有 `ajax` / `submitAction` 请求最终调用 `env.fetcher(api, ctx)`。返回 `ApiResponse`：

```ts
interface ApiResponse<T> {
  status: number; // 0 = 成功，非 0 = 失败
  data: T;
  msg?: string; // 错误消息
  code?: string; // 错误码
}
```

```ts
const env = {
  fetcher: async (api) => {
    const res = await fetch(api.url, {
      method: api.method ?? 'get',
      headers: api.headers,
      body: api.data ? JSON.stringify(api.data) : undefined,
    });
    return res.json(); // 需符合 { status, data, msg? }
  },
  notify: (level, message) => toast[level](message),
};
```

> `api` 的类型是 `ExecutableApiRequest`（已解析好的 `url/method/data/headers`）；`params`/`includeScope`/`responseAdaptor` 等已在运行时消化，不会出现在这里。

---

## loadDict：字典/枚举选项

选项类控件（`select`/`radio-group`/`checkbox-group` 等）除了 `options` 静态选项、`data-source` 远程选项外，还可用 `dict` 字段声明**字典名**，由 `env.loadDict` 解析：

```json
{ "type": "select", "name": "status", "label": "状态", "dict": "order-status" }
```

```ts
const env = {
  // ...
  loadDict: async (name) => {
    const res = await fetch(`/api/dict/${name}`);
    return res.json(); // DictBean
  },
};
```

```ts
interface DictBean {
  name: string;
  options: Array<{ label: string; value: string; code?: string; description?: string }>;
  label?: string;
  locale?: string;
}
```

> 未配置 `env.loadDict` 时，带 `dict` 的控件会打印告警并渲染空选项。

---

## loadPage：动态子页面

`env.loadPage(path)` 由宿主实现「按路径取 schema」（含缓存、URL 解析、角色过滤）。返回 `SchemaInput`。常配合 `dynamic-renderer`（见 `design-patterns/dynamic-renderer.md`）。

```ts
const pageCache = new Map();
const env = {
  // ...
  loadPage: async (path, signal) => {
    if (pageCache.has(path)) return pageCache.get(path);
    const schema = await fetch(path, { signal }).then((r) => r.json());
    pageCache.set(path, schema);
    return schema;
  },
};
```

---

## xui:roles + hasRole：按角色过滤

任意节点可声明 `xui:roles`，宿主提供 `hasRole` 判定后过滤掉无权限节点。过滤逻辑由一个 `beforeCompile` 插件执行——它**不是默认开启**，需在 `plugins` 中显式挂载一个基于 `env.hasRole` 的插件。

```json
{ "type": "button", "label": "删除", "xui:roles": ["admin"] }
```

```ts
// 用 RendererPlugin 在编译前裁剪无权限节点（伪代码，按需实现遍历）
const rolesPlugin: RendererPlugin = {
  name: 'xui-roles',
  beforeCompile: (schema) => filterNodesByRole(schema, (role) => currentUser.roles.includes(role)),
};
// 传给 <SchemaRenderer plugins={[rolesPlugin]} .../>
```

> flux-runtime 内部有等价实现（`filterByRoles`），但当前未从包入口公开导出；如需产品级角色裁剪，或复制该逻辑到宿主插件，或直接用 `env.hasRole` + 字段 `visible: "${...}"` 组合。`xui:roles` 的价值是**编译期整树裁剪**。

---

## xui:imports：命名空间能力导入

`xui:imports` 声明某子树需要外部命名空间提供者（动作 `ns:method` / 表达式别名 `$ns.fn`）。宿主通过 `env.importLoader` + `env.resolveImportUrl` 提供实际模块。详见 `docs/architecture/action-scope-and-imports.md`。

```json
{
  "type": "page",
  "xui:imports": [{ "from": "taskflow-designer", "as": "taskflow" }],
  "body": [{ "type": "button", "label": "加节点", "onClick": { "action": "taskflow:addNode" } }]
}
```

```ts
const env = {
  // ...
  resolveImportUrl: (_schemaUrl, from) =>
    from === 'taskflow-designer' ? 'taskflow-designer://' : from,
  importLoader: {
    load(spec) {
      if (spec.from === 'taskflow-designer://') return Promise.resolve(TASKFLOW_LIB_MODULE);
      throw new Error(`Unknown import: ${spec.from}`);
    },
  },
};
```

`importLoader.load` 返回的 `ImportedLibraryModule`：

```ts
interface ImportedLibraryModule {
  createNamespace(ctx): ActionNamespaceProvider | Promise<...>;      // 提供 ns:method 动作
  createExpressionHelpers?(ctx): Record<string, unknown> | Promise<...>; // 提供 $ns.fn 表达式
  getStaticMeta?(): ImportedLibraryStaticMeta | Promise<...>;
}
```

> schema 内含 `xui:imports` 时**必须**提供 `env.importLoader`，否则运行时报错。命名空间是**词法作用域**（lexical）的，不是全局注册——子树可覆盖父树同名命名空间。

---

## plugins：编译/动作管线

`RendererPlugin` 在编译与动作各阶段插入钩子：

```ts
interface RendererPlugin {
  name: string;
  priority?: number;
  beforeCompile?(schema): SchemaInput; // 编译前改写 schema（xui:roles 即此类）
  afterCompile?(template): CompiledTemplate; // 编译后改写模板
  wrapComponent?(definition): definition; // 包裹渲染器组件
  beforeAction?(action, ctx): ActionSchema | Promise; // 动作执行前拦截
  onError?(error, payload): void; // 错误监控
}
```

---

## 扩展表达式：functions / filters

在 `env` 上挂 `functions` / `filters` 即可在 `${}` 中调用（大写函数名，见 `02-expression-syntax.md`）：

```ts
const env = {
  // ...
  functions: { GREET: (name) => `Hello ${name}` }, // ${GREET(user.name)}
  filters: { money: (n) => `¥${Number(n).toFixed(2)}` }, // ${price | money}
};
```

> 领域聚合类 helper 更推荐注册到 formula registry 命名空间（`registry.registerNamespace('$Arr', {...})`），见 `apps/playground/src/complex-pages/shared/render-host.tsx`。
