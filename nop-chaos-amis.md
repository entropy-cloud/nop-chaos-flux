你对以下设计有什么看法？# 低代码渲染引擎核心技术架构决策文档（最终版）

## 1. 概述

本文档旨在记录从零构建类似 amis 的低代码系统所做出的核心技术架构决策。系统目标为：通过 JSON 配置驱动 UI 渲染和交互，支持复杂页面逻辑（CRUD、表单、对话框），并具备高性能、可扩展性。核心设计借鉴了 amis 的 ApiObject、表达式、Env 等概念，采用现代 React 技术栈及 Zustand 状态管理。

---

## 2. 整体架构分层

系统分为三层：

- **组件层**：基于 shadcn/ui 构建的基础组件库，以及自定义业务组件，均注册到组件注册表。
- **渲染核心**：包括递归渲染器（Renderer）、组件注册表（ComponentRegistry）、表达式解析器（ExpressionParser）、API 请求器（ApiFetcher）。
- **状态管理层**：基于 Zustand 实现全局 PageStore 和独立 FormStore，通过 React Context 构建数据域作用域链。

```
┌─────────────────────────────────────────┐
│             React 组件层                  │
│  ┌───────────┐ ┌───────────┐            │
│  │shadcn/ui  │ │ 自定义组件  │            │
│  └───────────┘ └───────────┘            │
├─────────────────────────────────────────┤
│              渲染器核心                   │
│  - 组件注册表 (ComponentRegistry)         │
│  - 递归渲染器 (JSONRender)                │
│  - 表达式解析 (ExpressionParser)          │
│  - API 请求器 (ApiFetcher)                │
├─────────────────────────────────────────┤
│              状态管理层                   │
│  - PageStore (Zustand)                   │
│  - FormStore (独立 Zustand 实例)          │
│  - DataScope Context (作用域链)           │
└─────────────────────────────────────────┘
```

---

## 3. 技术选型

| 领域             | 技术栈                        | 选型理由                                                                 |
| ---------------- | ----------------------------- | ------------------------------------------------------------------------ |
| 核心框架         | React 18+                     | 生态丰富，组件化模型契合低代码渲染                                       |
| UI 组件库        | shadcn/ui                     | 基于 Radix UI，无样式，可自由定制，满足低代码主题需求                    |
| 状态管理         | Zustand                       | 轻量、灵活，支持独立 store 实例，完美适配 PageStore + FormStore 模式    |
| 表达式引擎       | amis-formula                  | 成熟、独立，支持 AST 预处理，可无缝集成作用域链                          |
| API 请求         | fetch + 自定义封装             | 原生支持，易于拦截和扩展，可集成 ApiObject 规范                          |
| 表格虚拟滚动     | TanStack Table + react-window | 高性能渲染万级数据，仅渲染可视区域行                                     |
| 表单验证         | React Hook Form + Yup         | 非受控设计性能优异，与独立 FormStore 天然契合，Yup 提供声明式验证规则   |
| 工具库           | lodash-es、immer               | 数据处理、不可变更新                                                     |
| 唯一ID生成       | 基于路径哈希                   | 服务端与客户端一致，支持 SSR                                             |
| 防抖/取消        | lodash/debounce + AbortController | 控制高频事件，同时取消过期请求                                       |

---

## 4. 核心设计要点

### 4.1 数据域嵌套与链式查找（词法作用域）

- **实现方式**：通过 React Context（`DataScopeContext`）构建嵌套的数据域。每个容器组件（如 `Page`、`Form`、`Dialog`）在渲染时会创建一个新的作用域对象，其原型指向父作用域对象。这样数据查找天然支持链式访问，无需手动合并。
- **作用域结构**：
  ```typescript
  interface Scope {
    [key: string]: any;                // 实际数据属性
    _dataPath?: string;                 // 当前作用域对应的数据路径（可选）
    _update: (path: string, value: any) => void; // 更新函数，替代直接引用 Store
  }
  ```
- **取值规则**：控件通过 `name` 属性从当前作用域取值，若不存在则沿原型链向上查找，直至根 `PageStore` 的全局数据。
- **表达式求值**：使用 `amis-formula` 引擎，传入当前作用域对象（已包含所有父级数据）进行求值，实现表达式 `${user.name}` 的正确解析。`amis-formula` 内部会处理变量访问，并通过 Proxy 或直接读取作用域属性。
- **性能优势**：原型链查找无需合并对象，极快；作用域对象采用不可变更新，每次数据变化创建新对象，但通过 React 的 memo 和 Zustand 选择器减少渲染。

### 4.2 PageStore（全局单例）与 FormStore（独立实例）

- **PageStore**：使用 Zustand 创建的单例 store，负责管理：
  - 全局数据域（`data`）
  - 环境变量（`env`，如路由参数、用户信息）
  - 对话框实例列表（`dialogs`）
  - 顶层动作调度器（`doAction`）
- **FormStore**：每个表单实例通过 `createFormStore` 创建独立的 Zustand store，管理表单私有状态：
  - 表单数据（`values`）
  - 验证状态（`errors`、`touched`）
  - 表单提交逻辑
- **职责分离**：PageStore 协调全局，FormStore 专注于表单内聚，避免状态污染。

### 4.3 表达式求值机制（基于 amis-formula）

- **预处理阶段**：在渲染前对 schema 进行编译，将包含表达式的字段（如 `label`、`placeholder`、`api.url` 等）解析为 AST，并存储 AST 或预编译函数（`amis-formula` 提供 `parse` 方法）。
- **运行时求值**：渲染时调用 `amis-formula` 的 `resolveMapping` 或 `Evaluator.evaluate`，传入当前作用域对象。由于作用域通过原型链已包含所有数据，引擎能正确解析变量。
- **变量访问控制**：通过 Proxy 包装作用域对象，可插入日志、监控或自定义查找逻辑，但通常情况下直接读取原型链即可。
- **无结果缓存**：依赖 React 的渲染优化（如 memo）避免不必要的重新求值。
- **插值字符串处理**：`amis-formula` 原生支持插值字符串，直接传入即可。

### 4.4 表单更新的两种模式

在复杂交互场景（如流程图节点编辑）中，表单存在两种更新模式：

- **内部更新**：用户直接在表单控件中输入，触发控件 `onChange`，通过动作系统调用 `setValue` 更新 FormStore。此模式增量更新，触发字段级验证。
- **外部更新**：由外部事件（如切换流程图节点）触发，需要批量替换表单数据。通过扩展动作类型 `resetForm` 实现：
  - 动作定义中包含 `api` 获取新数据，成功后调用 FormStore 的 `reset` 方法（基于 React Hook Form 的 `reset`），批量更新表单值并触发表单整体验证。
  - 外部更新也可以直接调用 `FormStore.setState` 修改整个 `values`，但需确保验证同步。

两种模式均通过统一的 `_update` 函数写入数据，确保数据源唯一。

### 4.5 API 对象与请求封装

- **ApiObject 类型**：定义 `url`、`method`、`data`、`headers`、`responseAdaptor` 等字段，支持表达式的动态值。
- **请求函数**：封装 `request(api, context)`，在发送前对 `url`、`data` 等字段进行插值求值（使用 `amis-formula`），支持 `adaptor` 转换响应数据。
- **请求取消**：集成 `AbortController`，在组件卸载或重复请求时自动取消前一次请求，避免竞态条件和内存泄漏。
- **缓存策略**：对 GET 请求可配置 `cache: true`，使用内存缓存（TTL 5分钟），基于 URL + 参数序列化作为缓存键。

### 4.6 动作系统（doAction 调度器）

- **统一动作入口**：所有交互动作（点击、提交、对话框等）均通过 `doAction(action, context)` 触发。
- **支持的动作类型**：
  - `setValue`：更新数据域（内部更新）
  - `resetForm`：外部更新，批量重置表单数据
  - `ajax`：发送 API 请求（自动处理取消）
  - `dialog`：打开对话框（动态创建实例）
  - `closeDialog`：关闭对话框
  - `refreshTable`：刷新表格（递增令牌）
  - `submitForm`：提交表单（由 FormStore 处理）
- **防抖支持**：动作配置可指定 `debounce` 时间，调度器使用 `lodash/debounce` 包装，并配合 AbortController 取消过期请求。
- **动作链**：支持 `then` 字段定义后续动作，实现串行执行；可通过 `context.prevResult` 访问前一个动作的返回值；若某个动作失败，默认终止链（可通过配置 `continueOnError` 改变）。

### 4.7 对话框动态管理

- **对话框实例**：PageStore 维护 `DialogInstance[]`，每个实例包含 `id`、`config`（JSON 配置）、`context`（打开时的**作用域引用**，包含 `_dataPath` 和 `_update`）。
- **打开对话框**：`openDialog(config, context)` 直接保存当前作用域对象的引用，推入数组，返回 `dialogId`。
- **实时同步**：对话框内部通过保存的作用域引用访问数据，该作用域的原型指向打开时的父作用域，父作用域后续变化会通过原型链自动反映到对话框中。
- **渲染**：全局 `DialogRenderer` 组件监听 `dialogs` 列表，为每个实例渲染 `Dialog` 组件，并注入保存的作用域作为其数据源。对话框内容使用懒加载：占位符渲染，仅在打开时加载实际内容。

### 4.8 高性能表格（虚拟滚动）

- **表格库**：使用 `@tanstack/react-table` 处理列定义、排序、过滤等逻辑。
- **虚拟化**：结合 `react-window` 的 `FixedSizeList`，仅渲染可视区域的行，支持万级数据流畅滚动。
- **行作用域延迟创建**：每行在渲染时通过 `useMemo` 创建作用域，依赖项为行数据、索引和父作用域，避免全量创建。
- **操作列**：通过列配置 `type: "operation"` 动态渲染按钮，并为每个按钮注入 `record` 上下文（即当前行作用域）。

### 4.9 表单验证集成（React Hook Form + Yup）

- **规则生成**：在 `FormStore` 初始化时，遍历表单项的 `validate` 配置，动态生成 Yup schema，并缓存 schema（基于配置哈希）。
- **异步验证**：使用 Yup 的 `test` 方法支持异步函数，内部调用 API 进行唯一性检查。为每个异步验证配置防抖（300ms）并使用 AbortController 取消前一次请求，确保只处理最后一次结果。
- **注册控件**：控件内部使用 `useFormContext()` 获取 `register` 方法，绑定字段名和验证规则。
- **性能优化**：设置验证模式为 `onBlur` 或 `onChange` 适度触发，避免高频验证。

---

## 5. 错误处理与调试支持

- **优雅降级**：使用 React Error Boundary 包裹每个可渲染组件（如页面、表单、对话框），当组件抛出错误时，展示兜底 UI（如红色边框、错误占位符），并阻止错误扩散导致整个页面崩溃。
- **开发者提示**：在开发环境下，通过控制台输出详细错误信息，包括错误堆栈、组件路径、相关表达式内容、API 请求详情等，方便调试。生产环境下可选择隐藏细节，仅记录日志。
- **全局错误捕获**：在动作调度器、表达式求值、API 请求等关键环节使用 try/catch，将错误信息格式化后通过 `env.notify('error', message)` 展示给用户（可配置是否显示）。

---

## 6. 性能优化策略

| 策略               | 实现方式                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| **虚拟滚动**       | 表格组件仅渲染可视区域行，大幅减少 DOM 节点                              |
| **状态精确订阅**   | 组件使用 Zustand 选择器仅订阅所需数据片段，避免无关更新                  |
| **表达式预编译**   | 使用 `amis-formula` 解析 AST，避免运行时重复解析                         |
| **API 取消**       | 使用 AbortController 取消过期请求，避免竞争                              |
| **防抖**           | 搜索框等高频事件通过动作配置防抖，结合请求取消                           |
| **表单非受控设计** | React Hook Form 默认使用非受控模式，避免状态驱动导致的额外渲染           |
| **批量更新**       | 使用 `immer` 在 Zustand 中批量修改状态，减少通知次数                     |
| **懒加载**         | 对话框、弹窗等组件动态加载（仅在打开时渲染内容）                         |
| **延迟创建作用域** | 表格行、Combo 行在渲染时动态创建作用域，避免全量创建                     |

---

## 7. 扩展性设计

- **组件注册表**：提供 `registerComponent(type, config)` 方法，允许外部扩展自定义组件。通过 TypeScript 泛型保证类型安全。
- **插件机制**：定义插件接口，支持预处理、表达式解析、动作拦截、组件包装等扩展点。插件管理器按优先级执行钩子。
- **数据源扩展**：API 请求层可扩展支持 GraphQL、WebSocket 等。
- **主题定制**：基于 shadcn/ui 的 CSS 变量，支持运行时切换主题。
- **Env 抽象**：所有外部依赖（请求、提示、跳转）通过 Env 注入，使渲染器成为纯函数，易于测试和跨平台。

---

## 8. 监控与可观测性

- **Env 监控钩子**：在 Env 中预留 `onError`、`onApiRequest`、`onRender` 等钩子，允许外部注入监控 SDK。
- **性能指标**：记录关键操作耗时，通过钩子上报。
- **日志**：开发环境下输出详细日志，生产环境下可通过插件收集错误和性能数据。

---

## 9. 总结

本架构决策围绕**高性能、可扩展、职责清晰**三个核心目标，通过现代 React 技术栈实现了类似 amis 的低代码渲染引擎。PageStore 与 FormStore 的分离、基于原型链的作用域链、动作调度系统（支持内部/外部更新）、基于 `amis-formula` 的表达式引擎、虚拟滚动表格及表单验证集成，共同构成了一个健壮且灵活的基础。后续可基于此继续建设可视化设计器、组件市场、插件生态等能力。

# 完整 JSON 示例：用户管理 CRUD 页面

以下是一个完整的用户管理页面 JSON 配置，展示了低代码渲染引擎的核心能力。该页面包含搜索、虚拟滚动表格、新增/编辑对话框、删除确认、分页以及表单验证（同步 + 异步）。所有交互均通过动作系统驱动。

```json
{
  "type": "page",
  "title": "用户管理",
  "data": {
    "keyword": "",
    "page": 1,
    "perPage": 20,
    "total": 0,
    "users": []
  },
  "initApi": {
    "url": "/api/users",
    "method": "get",
    "data": {
      "keyword": "${keyword}",
      "page": "${page}",
      "perPage": "${perPage}"
    },
    "dataPath": "users",
    "responseAdaptor": "return {items: payload.data, total: payload.total}",
    "cache": true
  },
  "body": [
    {
      "type": "form",
      "mode": "inline",
      "body": [
        {
          "type": "input-text",
          "name": "keyword",
          "label": "搜索",
          "placeholder": "输入用户名",
          "onChange": {
            "action": "setValue",
            "componentPath": "keyword",
            "value": "${event.target.value}",
            "debounce": 300,
            "then": {
              "action": "setValue",
              "componentPath": "page",
              "value": 1,
              "then": {
                "action": "ajax",
                "api": {
                  "url": "/api/users",
                  "method": "get",
                  "data": {
                    "keyword": "${keyword}",
                    "page": "${page}",
                    "perPage": "${perPage}"
                  }
                },
                "dataPath": "users",
                "responseAdaptor": "return {items: payload.data, total: payload.total}"
              }
            }
          }
        },
        {
          "type": "button",
          "label": "新增",
          "level": "primary",
          "onClick": {
            "action": "dialog",
            "dialog": {
              "title": "新增用户",
              "size": "md",
              "body": {
                "type": "form",
                "id": "userForm",
                "mode": "horizontal",
                "body": [
                  {
                    "type": "input-text",
                    "name": "username",
                    "label": "用户名",
                    "placeholder": "请输入用户名",
                    "validate": {
                      "required": true,
                      "minLength": 3,
                      "maxLength": 20,
                      "async": {
                        "url": "/api/check-username",
                        "method": "get",
                        "data": {
                          "username": "${value}"
                        },
                        "responseAdaptor": "return payload.available ? null : '用户名已被占用'"
                      }
                    }
                  },
                  {
                    "type": "input-email",
                    "name": "email",
                    "label": "邮箱",
                    "placeholder": "请输入邮箱",
                    "validate": {
                      "required": true,
                      "email": true,
                      "async": {
                        "url": "/api/check-email",
                        "method": "get",
                        "data": {
                          "email": "${value}"
                        },
                        "responseAdaptor": "return payload.available ? null : '邮箱已被注册'"
                      }
                    }
                  },
                  {
                    "type": "input-password",
                    "name": "password",
                    "label": "密码",
                    "placeholder": "请输入密码",
                    "validate": {
                      "required": true,
                      "minLength": 8,
                      "pattern": "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$",
                      "patternMessage": "密码需包含字母和数字，至少8位"
                    }
                  }
                ],
                "actions": [
                  {
                    "type": "button",
                    "label": "取消",
                    "onClick": {
                      "action": "closeDialog",
                      "dialogId": "${dialogId}"
                    }
                  },
                  {
                    "type": "button",
                    "label": "提交",
                    "level": "primary",
                    "onClick": {
                      "action": "submitForm",
                      "formId": "userForm",
                      "api": {
                        "method": "post",
                        "url": "/api/users"
                      },
                      "then": [
                        {
                          "action": "closeDialog",
                          "dialogId": "${dialogId}"
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
      "rowKey": "id",
      "height": 500,
      "columns": [
        {
          "label": "ID",
          "name": "id",
          "width": 80
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
          "label": "操作",
          "type": "operation",
          "buttons": [
            {
              "label": "编辑",
              "level": "link",
              "onClick": {
                "action": "dialog",
                "dialog": {
                  "title": "编辑用户",
                  "size": "md",
                  "body": {
                    "type": "form",
                    "id": "userForm",
                    "mode": "horizontal",
                    "data": "${record}",
                    "body": [
                      {
                        "type": "input-text",
                        "name": "username",
                        "label": "用户名",
                        "validate": {
                          "required": true,
                          "minLength": 3,
                          "maxLength": 20
                        }
                      },
                      {
                        "type": "input-email",
                        "name": "email",
                        "label": "邮箱",
                        "validate": {
                          "required": true,
                          "email": true
                        }
                      }
                    ],
                    "actions": [
                      {
                        "type": "button",
                        "label": "取消",
                        "onClick": {
                          "action": "closeDialog",
                          "dialogId": "${dialogId}"
                        }
                      },
                      {
                        "type": "button",
                        "label": "提交",
                        "level": "primary",
                        "onClick": {
                          "action": "submitForm",
                          "formId": "userForm",
                          "api": {
                            "method": "put",
                            "url": "/api/users/${record.id}"
                          },
                          "then": [
                            {
                              "action": "closeDialog",
                              "dialogId": "${dialogId}"
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
            },
            {
              "label": "删除",
              "level": "link",
              "confirmText": "确定删除该用户吗？",
              "onClick": {
                "action": "ajax",
                "api": {
                  "method": "delete",
                  "url": "/api/users/${record.id}"
                },
                "then": {
                  "action": "refreshTable"
                }
              }
            }
          ]
        }
      ],
      "pagination": {
        "page": "${page}",
        "perPage": "${perPage}",
        "total": "${total}",
        "onChange": {
          "action": "setValue",
          "componentPath": "page",
          "value": "${page}",
          "then": {
            "action": "ajax",
            "api": {
              "url": "/api/users",
              "method": "get",
              "data": {
                "keyword": "${keyword}",
                "page": "${page}",
                "perPage": "${perPage}"
              }
            },
            "dataPath": "users",
            "responseAdaptor": "return {items: payload.data, total: payload.total}"
          }
        }
      }
    }
  ]
}