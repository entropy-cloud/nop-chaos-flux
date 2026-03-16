# NOP Chaos AMIS 核心架构说明

## 1. 文档目的

本文档用于定义 NOP Chaos AMIS 渲染内核的正式设计方向，并替换早期讨论稿中的部分过时结论。

当前已经确认的核心目标是：

- 使用 JSON Schema 驱动页面、表单、表格、对话框和动作系统
- 使用统一的表达式值模型，而不是为每类字段发明 `visibleOn`、`disabledOn`、`xxxExpr` 之类平行语法
- 使用词法作用域链而不是反复合并大对象
- 对 schema 做 compile once, execute many times
- 在静态路径上做到零执行成本，在动态路径上做到引用稳定复用
- 让运行时具备可观测性、可扩展性和高性能

本文档描述的是目标架构，不要求完全等同于 amis 的历史实现细节。

---

## 2. 当前正式结论

### 2.1 统一值语义

所有字段统一遵循一条规则：

- 普通值就是普通值
- 使用表达式语法就是表达式
- 不再额外引入 `visibleOn`、`disabledOn`、`labelExpr` 等平行字段

例如：

```json
{
  "visible": true,
  "disabled": false,
  "label": "创建用户"
}
```

```json
{
  "visible": "${currentUser.role === 'admin'}",
  "disabled": "${saving}",
  "label": "Hello ${currentUser.name}"
}
```

说明：

- 布尔、数值、对象字段只接受字面量或纯表达式
- 字符串字段可接受字面量、模板字符串、纯表达式
- 哪些字段允许哪种表达式形态，由 schema 类型系统约束，而不是靠平行字段名表达

### 2.2 整体 props 统一编译，不再执着于 `staticProps` / `dynamicProps` 外部分裂

渲染节点的 props 应作为一个完整值树进行编译。

- 如果整个值树没有表达式，编译结果就是静态节点，执行时直接返回原值引用
- 如果值树中包含表达式，编译结果就是可执行值树，运行时递归求值并做引用复用

也就是说：

- 编译器内部必须知道某棵子树是否静态
- 但运行时公开模型不需要长期维持 `staticProps` 和 `dynamicProps` 两套结构

### 2.3 作用域读取以 scope chain 为主，不以对象合并为主

作用域系统的正式方向是：

- 高频读取走 `scope.get(path)` / `scope.has(path)`
- `scope.readOwn()` 返回当前层数据
- `scope.read()` 只作为少数整对象场景的惰性 materialize 接口，并带版本缓存

不再把“每次渲染前先合并一份完整 scope 对象”当作主路径。

### 2.4 amis-formula 需要改造成 resolver 驱动执行

`amis-formula` 不应继续建立在“先传入完整上下文对象，再由执行器自己取属性”的模型上。

正式方向是：

- 表达式编译阶段输出 AST / compiled evaluator
- 表达式执行阶段接收 `EvalContext`
- 变量读取和属性链读取通过 `EvalContext.resolve(path)` / `has(path)` 完成
- 只有在对象展开、枚举等少数场景下，才通过 `materialize()` 构造整对象

这意味着 `amis-formula` 是可改造库，而不是不可变黑盒。

---

## 3. 架构总览

系统分为五层：

1. `SchemaCompiler`
2. `ExpressionCompiler`
3. `RendererRuntime`
4. `Store/Scope`
5. `React Renderer`

```text
raw schema
  -> SchemaCompiler
compiled schema tree
  -> RendererRuntime
resolved node meta + compiled value tree + action dispatch
  -> React renderer
concrete component render
```

### 3.1 SchemaCompiler

负责：

- 原始 schema 标准化
- 识别子区域，如 `body`、`actions`、`columns.buttons`
- 将普通值编译为 `CompiledValueNode`
- 将节点绑定到对应 renderer definition

### 3.2 ExpressionCompiler

负责：

- 识别字面量、模板字符串、纯表达式、数组、对象
- 将整棵值树编译为可执行结构
- 标记静态子树
- 提取依赖路径，为后续缓存和跳过执行做准备

### 3.3 RendererRuntime

负责：

- 创建 page/form/dialog runtime
- 解析节点 meta 和 props
- 分发动作
- 管理请求取消、防抖、动作链、monitor hooks

### 3.4 Store/Scope

负责：

- PageStore 管理页面级数据、对话框、刷新令牌等
- FormStore 管理表单局部值和提交
- ScopeRef 管理词法作用域链读取和当前层写入

### 3.5 React Renderer

负责：

- 将 compiled node 绑定到 React 组件
- 提供 context hooks
- 承担 `DialogHost`、fragment render、render monitor 等职责

---

## 4. Schema 值模型

所有 schema 字段统一编译为值节点。

```ts
type CompiledValueNode<T = unknown> =
  | { kind: 'static'; value: T }
  | { kind: 'expression'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template'; source: string; compiled: CompiledTemplate<T> }
  | { kind: 'array'; items: CompiledValueNode[] }
  | { kind: 'object'; keys: string[]; entries: Record<string, CompiledValueNode> };
```

执行语义：

- `static`：直接返回 `value`
- `expression`：通过 `EvalContext` 求值
- `template`：通过 `EvalContext` 插值求值
- `array` / `object`：递归执行，并对结果做引用复用

### 4.1 静态快路径

如果整个值树无表达式：

- 编译结果必须是 `kind: 'static'`
- 执行阶段直接返回原始值引用
- 不得再走递归 evaluator

### 4.2 动态引用复用

如果整个值树包含表达式：

- 对每个动态节点维护 `lastValue`
- 如果本轮执行结果和上次一致，则返回旧引用
- 对对象和数组使用浅比较或子节点 unchanged 信息判断是否复用

---

## 5. EvalContext 与表达式执行

正式执行上下文：

```ts
interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, any>;
}
```

### 5.1 变量读取规则

表达式中的：

- `username`
- `record.name`
- `api.url`
- `payload.items[0]`

都应通过 resolver 读取，而不是依赖 `with(scope)` 或完整上下文对象的直接属性访问。

### 5.2 `materialize()` 的定位

`materialize()` 只服务于少数场景：

- 对象展开
- 枚举型函数
- 必须拿完整对象的外部接口

要求：

- 惰性构造
- 带版本缓存
- 同一轮求值中复用

### 5.3 不再使用 `new Function` 和 `with(scope)`

历史原型实现中的 `new Function('scope', 'with(scope) { ... }')` 只用于验证缓存思路，不进入正式方案。

正式实现要求：

- 基于可控 AST 或可改造 evaluator
- 变量访问必须可劫持
- 可接入 ScopeRef 的链式读取语义

---

## 6. Scope 设计

正式接口方向：

```ts
interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  read(): Record<string, any>;
  update(path: string, value: unknown): void;
}
```

### 6.1 读取规则

`scope.get('record.name')` 的读取规则不是“每层都 getIn”，而是：

1. 先检查当前层是否存在顶级 key `record`
2. 如果存在，则在当前层对象内部继续读取 `.name`
3. 如果不存在，再向父 scope 查找 `record`
4. 一旦某层命中顶级 key，不再向父层继续回退

这保证了词法遮蔽语义正确。

### 6.2 写入规则

- 默认 `update()` 只写当前 scope
- Form 内字段更新写 FormStore
- Page 级动作写 PageStore
- 不隐式回写父 scope

### 6.3 `read()` 的定位

`read()` 不是热路径，而是兜底接口：

- 对整对象消费方提供 materialized snapshot
- 使用版本缓存，避免重复合并

---

## 7. CompiledSchemaNode 设计

目标是让渲染节点只维护一套 props compiled value，而不是公开的 static/dynamic 双结构。

```ts
interface CompiledSchemaNode {
  id: string;
  type: string;
  path: string;
  schema: BaseSchema;
  props: CompiledValueNode<Record<string, unknown>>;
  regions: Record<string, CompiledRegion>;
  component: RendererDefinition;
  flags: {
    isStatic: boolean;
    isContainer: boolean;
  };
}
```

`flags.isStatic` 的语义是：

- 该节点 props 无动态执行成本
- runtime 可以直接走静态快路径

---

## 8. RendererRuntime 设计

`RendererRuntime` 是所有稳定运行时能力的统一入口，至少包含：

- `compile(schema)`
- `evaluate(valueNode, scope)`
- `resolveNodeMeta(node, scope)`
- `resolveNodeProps(node, scope)`
- `createChildScope(parent, data, options)`
- `dispatch(action, ctx)`

### 8.1 Action 模型

支持的动作至少包括：

- `setValue`
- `ajax`
- `submitForm`
- `dialog`
- `closeDialog`
- `refreshTable`

动作系统支持：

- `then`
- `continueOnError`
- `debounce`
- request cancellation
- plugin hook interception

补充约定：

- `closeDialog` 默认关闭当前动作所在的最近对话框
- 只有在极少数需要跨层精确关闭特定实例的场景下，才考虑扩展显式定位能力
- 普通 schema 编写不应要求显式传 `dialogId`

### 8.2 API 模型

ApiObject 支持：

- `url`
- `method`
- `data`
- `headers`
- `requestAdaptor`
- `responseAdaptor`

执行规则：

- requestAdaptor 在请求前执行
- responseAdaptor 在请求后执行
- adaptor 同样使用统一表达式编译与 `EvalContext`

---

## 9. React 渲染层设计

React 层遵循：

- 边界输入显式
- 中间能力通过 hooks/context 暴露
- 局部片段通过显式 render handle 渲染

### 9.1 根组件输入

根组件如 `SchemaRenderer` 显式接收：

- `schema`
- `data`
- `env`
- `registry`
- `plugins`

### 9.2 内部 hooks

内部通过 hooks 获取共享能力，例如：

- `useRendererRuntime()`
- `useRenderScope()`
- `useScopeSelector()`
- `useCurrentForm()`
- `useCurrentPage()`
- `useActionDispatcher()`

### 9.3 片段渲染

自定义组件渲染局部 schema 时，不直接拿 raw child schema 自己递归，而是通过统一 render handle：

```ts
props.regions.body?.render()
props.helpers.render(schema, { scope })
```

这样能保证：

- 同一套 runtime
- 同一套作用域规则
- 同一套 monitor 和插件链

---

## 10. Store 模型

### 10.1 PageStore

管理页面级状态：

- `data`
- `dialogs`
- `refreshTick`
- 页面级 action 结果和 monitor 辅助状态

### 10.2 FormStore

每个 form 独立实例，管理：

- `values`
- `submit(api)`
- `setValue(name, value)`
- `reset(values)`

### 10.3 当前阶段不预设外部表单库耦合

设计上不强制依赖 React Hook Form、Yup 或其他特定表单验证库。

表单验证、异步校验、规则编译应作为可插拔层处理，而不是当前核心模型的前提条件。

---

## 11. 监控与可观测性

Env 监控钩子当前正式方向包括：

- `onRenderStart`
- `onRenderEnd`
- `onActionStart`
- `onActionEnd`
- `onApiRequest`
- `onError`

这些能力应覆盖：

- render 生命周期
- action 生命周期
- debounce 被替代取消
- request cancellation
- adaptor 执行链

---

## 12. 性能设计原则

### 12.1 先避免对象构造，再考虑更重的响应式方案

当前优先级不是引入信号系统或 Immutable Trie，而是：

1. 作用域读取走 `get(path)` 而不是整对象合并
2. `read()` 使用缓存 materialize
3. 值树编译后做静态快路径和引用复用
4. 动作链和请求链做防抖与取消

### 12.2 关键优化点

| 目标 | 正式方案 |
| --- | --- |
| 静态 schema 执行 | compile 阶段识别为 `static` 节点，运行时直接返回原引用 |
| 动态对象复用 | object/array 节点使用 child unchanged + shallowEqual 复用旧引用 |
| scope 读取 | 高频走 `scope.get(path)` |
| 表达式求值 | `EvalContext.resolve(path)` 驱动，不依赖完整上下文对象 |
| 高频请求 | debounce + AbortController |
| rerender 控制 | selector 订阅 + stable runtime helpers |

---

## 13. 扩展点

正式扩展点包括：

- `beforeCompile`
- `afterCompile`
- `beforeAction`
- `onError`
- `wrapComponent`

这些扩展点允许：

- 修改 schema
- 修改 compiled node
- 重写 action
- 包装组件
- 上报监控

---

## 14. 对旧稿中不再采用的设计说明

以下设计不再作为正式方向：

- 用原型链对象本身作为表达式执行上下文主路径
- 依赖每次构造完整作用域对象给表达式引擎读取
- `visibleOn` / `disabledOn` / 平行表达式字段体系
- 把 `staticProps` / `dynamicProps` 作为长期外部运行时模型
- `new Function` + `with(scope)` 这类不安全执行方式
- 将某个外部表单库或验证库写死成核心架构前提

---

## 15. 总结

NOP Chaos AMIS 的正式架构方向可以概括为：

- schema 的所有值统一编译为 value tree
- 表达式执行统一通过可改造的 `amis-formula` + `EvalContext` 完成
- 高频读取统一走 scope chain resolver，而不是对象合并
- 运行时保留静态快路径和动态引用复用
- React 层显式边界输入、内部 hooks 化、局部片段统一 render

这套方案比早期“平行字段 + 合并对象 + 黑盒表达式执行”的设计更统一、更高性能，也更适合作为后续可视化设计器、插件生态和复杂 CRUD 页面能力的长期基础。

---

## 16. 完整 JSON 示例

下面给出一份用于说明核心语义的完整 schema 示例。这个示例刻意保持“少而全”：

- 每种核心能力只展示一次
- 不重复堆叠多个相似对话框或多个相似操作
- `closeDialog` 直接表示“关闭离自己最近的对话框”，不要求显式传 `dialogId`

它覆盖的核心能力包括：

- 页面数据
- 模板字符串
- 单字段表达式值语义
- 查询表单
- `ajax`
- `requestAdaptor` / `responseAdaptor`
- `dataPath`
- `dialog`
- `submitForm`
- `closeDialog`
- `refreshTable`
- 表格操作列的 `record` 作用域

```json
{
  "type": "page",
  "title": "用户管理",
  "data": {
    "keyword": "",
    "page": 1,
    "perPage": 20,
    "total": 0,
    "users": [],
    "currentUser": {
      "name": "Architect",
      "role": "admin"
    },
    "searching": false,
    "saving": false
  },
  "body": [
    {
      "type": "container",
      "body": [
        {
          "type": "tpl",
          "tpl": "Hello ${currentUser.name}, welcome to the user center."
        },
        {
          "type": "form",
          "id": "searchForm",
          "data": {
            "keyword": "${keyword}"
          },
          "body": [
            {
              "type": "input-text",
              "name": "keyword",
              "label": "搜索",
              "placeholder": "输入用户名或邮箱"
            }
          ],
          "actions": [
            {
              "type": "button",
              "label": "查询",
              "disabled": "${searching}",
              "onClick": {
                "action": "ajax",
                "debounce": 300,
                "api": {
                  "method": "post",
                  "url": "/api/users/search",
                  "requestAdaptor": "return {data: {keyword: scope.keyword, page: scope.page, perPage: scope.perPage}};",
                  "responseAdaptor": "return {items: payload.items, total: payload.total};"
                },
                "dataPath": "users",
                "then": {
                  "action": "setValue",
                  "componentPath": "total",
                  "value": "${prevResult.data.total}"
                }
              }
            },
            {
              "type": "button",
              "label": "新增用户",
              "visible": "${currentUser.role === 'admin'}",
              "onClick": {
                "action": "dialog",
                "dialog": {
                  "title": "新增用户",
                  "body": {
                    "type": "form",
                    "id": "createUserForm",
                    "data": {
                      "username": "",
                      "email": "",
                      "role": "viewer"
                    },
                    "body": [
                      {
                        "type": "input-text",
                        "name": "username",
                        "label": "用户名"
                      },
                      {
                        "type": "input-email",
                        "name": "email",
                        "label": "邮箱"
                      },
                      {
                        "type": "select",
                        "name": "role",
                        "label": "角色",
                        "options": [
                          {
                            "label": "Viewer",
                            "value": "viewer"
                          },
                          {
                            "label": "Editor",
                            "value": "editor"
                          },
                          {
                            "label": "Admin",
                            "value": "admin"
                          }
                        ]
                      }
                    ],
                    "actions": [
                      {
                        "type": "button",
                        "label": "取消",
                        "onClick": {
                          "action": "closeDialog"
                        }
                      },
                      {
                        "type": "button",
                        "label": "提交",
                        "disabled": "${saving}",
                        "onClick": {
                          "action": "submitForm",
                          "formId": "createUserForm",
                          "api": {
                            "method": "post",
                            "url": "/api/users",
                            "requestAdaptor": "return {data: {username: scope.username, email: scope.email, role: scope.role}};",
                            "responseAdaptor": "return payload.user;"
                          },
                          "then": [
                            {
                              "action": "closeDialog"
                            },
                            {
                              "action": "refreshTable"
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          ]
        },
        {
          "type": "table",
          "source": "${users}",
          "columns": [
            {
              "label": "ID",
              "name": "id"
            },
            {
              "label": "用户名",
              "name": "username"
            },
            {
              "label": "邮箱",
              "name": "email"
            },
            {
              "label": "角色",
              "name": "role"
            },
            {
              "type": "operation",
              "label": "操作",
              "buttons": [
                {
                  "type": "button",
                  "label": "查看",
                  "onClick": {
                    "action": "dialog",
                    "dialog": {
                      "title": "用户详情",
                      "body": {
                        "type": "container",
                        "body": [
                          {
                            "type": "tpl",
                            "tpl": "用户名：${record.username}"
                          },
                          {
                            "type": "tpl",
                            "tpl": "邮箱：${record.email}"
                          },
                          {
                            "type": "tpl",
                            "tpl": "角色：${record.role}"
                          },
                          {
                            "type": "button",
                            "label": "关闭",
                            "onClick": {
                              "action": "closeDialog"
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "tpl",
          "tpl": "共 ${total} 条记录，当前第 ${page} 页，每页 ${perPage} 条。"
        }
      ]
    }
  ]
}
```
