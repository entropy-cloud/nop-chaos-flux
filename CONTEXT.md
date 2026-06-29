# nop-chaos-flux — CRUD 域

CRUD 是面向业务数据工作流的复合 renderer，负责查询表单、数据加载、表格展示、分页、筛选、选择、排序的完整生命周期。本域记录 CRUD + loadAction + Picker 的设计语言。

## Language

**loadAction**:
CRUD 用来获取数据的 ActionSchema。遵循 Nop 平台的显式声明原则——所有请求参数必须在 `args.params`/`args.data` 中声明，无隐式注入。与 AMIS 的 `api` 等价但泛化为完整 action 协议。
_Avoid_: api, initApi

**CRUD Scope**:
CRUD 实例自身定义的虚拟作用域。`loadAction` 的表达式在此 scope 中解析，路径结构与 scope store 中的实际存储路径一致。无快捷别名，无父 scope 回退。
_结构_:

```
pagination: { currentPage, pageSize }
query: { <queryForm字段名>: <值>, ... }
sort: { column, direction }
filters: { <列名>: { filters?: string[], keyword?: string }, ... }
selection: string[]
```

**query.** \*:
过滤表单（queryForm）收集后的值，直接以字段名作为 key，不经过 `values` 包装层。`refreshCount` 是内部实现细节，不暴露在 CRUD scope 中。
_Avoid_: query.values

**includeScope**:
`loadAction.args` 上的可选配置，声明需要自动包含的 CRUD scope 变量。`includeScope: "*"` 包含所有 CRUD scope 变量。取值为 `string[]` 时精确指定要包含的路径。
_范围_: 仅限 CRUD scope，不包含父 render scope。
