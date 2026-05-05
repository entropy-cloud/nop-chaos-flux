# flux-formula: 表达式引擎设计

## 目标

为 `@nop-chaos/flux-formula` 包实现一个自研的表达式引擎，替代对 `amis-formula` 的依赖。

设计参考 nop-entropy 中 `nop-xlang` 的 SimpleExpr 语法体系，采用类 JavaScript/TypeScript 表达式语法。实现 **解析 → AST → 直接求值** 的管线，不做 AST → Executable 编译、不做词法作用域分析、不做类型推导。变量全部从运行时 scope 中获取，不支持 `var`/`let`/`const` 声明。

---

## 语法规范

### 设计原则

1. **类 JS/TS 语法子集** — 前端开发者无需学习新语法
2. **严格相等** — `==` 和 `===` 语义相同（不做类型转换），`!=` 和 `!==` 语义相同
3. **函数调用统一** — `IF()`、`SUM()` 等用普通函数调用语法
4. **无过滤器管道** — `|` 仅作位运算，不做 amis 风格的 `${x | filter}` 管道
5. **单表达式** — 不支持语句、声明、循环、`new`；变量全部从 scope 中获取
6. **纯运行时** — 无编译期表达式，无多阶段模板，无扩展方法
7. **收敛 v1 语法面** — 暂不支持表达式内模板字符串、正则字面量、spread、后缀非空断言

### 运算符（按优先级从低到高）

| 优先级 | 运算符                         | 说明                         |
| ------ | ------------------------------ | ---------------------------- |
| 1      | `? :`                          | 三元条件                     |
| 2      | `??`                           | 空值合并                     |
| 3      | `\|\|` `or`                    | 逻辑或                       |
| 4      | `&&` `and`                     | 逻辑与                       |
| 5      | `\|`                           | 位或                         |
| 6      | `^`                            | 位异或                       |
| 7      | `&`                            | 位与                         |
| 8      | `==` `!=` `===` `!==`          | 相等（均严格，无类型转换）   |
| 9      | `<` `<=` `>` `>=` `instanceof` | 比较                         |
| 10     | `<<` `>>` `>>>`                | 位移                         |
| 11     | `+` `-`                        | 加减                         |
| 12     | `*` `/` `%`                    | 乘除模                       |
| 13     | `**`                           | 幂                           |
| 14     | `!` `~` `-`(一元) `+`(一元)    | 一元前缀                     |
| 15     | `.` `?.` `[]` `()`             | 成员访问、可选链、下标、调用 |

逻辑运算使用 `&&`/`||` 运算符或 `and`/`or` 关键字，不提供 `AND()`/`OR()` 函数。`&&`/`||` 本身就是短路求值，不需要额外函数包装。

### 字面量

- 数字：`123`、`1.5`、`1e10`
- 字符串：`'abc'`、`"abc"`
- 布尔：`true`、`false`
- 空：`null`、`undefined`
- 数组：`[1, 2, 3]`
- 对象：`{a: 1, b: 2}`

### 主要表达式

```
primary := literal
         | identifier
         | '(' expr ')'
         | '[' exprList? ']'
         | '{' propertyList? '}'

factor := primary ( '.' identifier
                  | '?.' identifier
                  | '[' expr ']'
                  | '(' exprList? ')' )*
```

### 箭头函数

```
arrow := identifier '=>' expr
       | '(' paramList ')' '=>' expr
```

箭头函数仅支持单表达式体，用于 `ARRAYMAP`、`ARRAYFILTER` 等高阶函数的回调。

### 模板表达式

在文本模板中，`${expr}` 表示运行时求值。纯表达式模式（`evalMode`）下直接解析为表达式 AST，不嵌模板层。只有 `${}` 一种模板语法，不引入 `%{}` `#{}` `@{}` 等多阶段模板。

---

## AST 节点类型

所有节点共享基础结构：

```typescript
interface ASTNode {
  type: string;
  loc?: SourceLocation;
}
```

### 节点清单

| type                      | 字段                                                                       | 说明                                |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `Literal`                 | `value: unknown`                                                           | 数字、字符串、布尔、null、undefined |
| `Identifier`              | `name: string`                                                             | 变量引用                            |
| `BinaryExpression`        | `op: string, left: ASTNode, right: ASTNode`                                | 二元运算                            |
| `LogicalExpression`       | `op: string, left: ASTNode, right: ASTNode`                                | `\|\|` / `&&` 链                    |
| `UnaryExpression`         | `op: string, argument: ASTNode`                                            | 一元前缀运算                        |
| `ConditionalExpression`   | `test: ASTNode, consequent: ASTNode, alternate: ASTNode`                   | 三元 `? :`                          |
| `MemberExpression`        | `object: ASTNode, property: ASTNode, computed: boolean, optional: boolean` | `a.b` / `a[b]` / `a?.b`             |
| `CallExpression`          | `callee: ASTNode, arguments: ASTNode[]`                                    | 函数/方法调用                       |
| `ArrayExpression`         | `elements: ASTNode[]`                                                      | 数组字面量                          |
| `ObjectExpression`        | `properties: Property[]`                                                   | 对象字面量                          |
| `ArrowFunctionExpression` | `params: Identifier[], body: ASTNode`                                      | 箭头函数                            |
| `NullCoalesceExpression`  | `left: ASTNode, right: ASTNode`                                            | `??`                                |

### Property 节点

```typescript
interface Property extends ASTNode {
  type: 'Property';
  key: ASTNode;
  value: ASTNode;
  computed: boolean;
  shorthand: boolean;
}
```

---

## 架构

### 模块结构

```
packages/flux-formula/src/
├── ast.ts              # AST 节点类型定义
├── operators.ts        # 运算符枚举与优先级
├── features.ts         # Feature flags（位掩码）
├── lexer.ts            # 分词器
├── parser.ts           # 递归下降解析器
├── evaluator.ts        # AST 直接求值器
├── builtins.ts         # 内置函数（IF, SWITCH, SUM, AVG 等）
├── compile.ts          # FormulaCompiler 适配层
├── evaluate.ts         # CompiledValueNode 求值框架（复用）
├── scope.ts            # Scope 适配 + 依赖追踪 Proxy（复用）
├── template.ts         # 模板分割（复用）
└── index.ts            # 公共 API
```

### 管线

```
源字符串
   │
   ├─ 纯表达式 ──→ parser(source, { evalMode: true }) ──→ AST ──→ evaluator(ast, scope)
   │
   └─ 模板 ──→ template.parseSegments(source)
                   ├─ text segment → 原样保留
                   └─ expr segment → parser(expr, { evalMode: true }) → AST → evaluator
               ──→ 拼接结果
```

不需要 AST → Executable 编译步骤。解析器直接产出到 AST，求值器在 AST 上做 tree-walking 递归求值。

### 求值流程

```
evaluator(ast, scope, env?)
   │
   ├── Literal         → ast.value
   ├── Identifier      → localFrame[ast.name] ?? builtinIdentifiers[ast.name] ?? scope.get(ast.name)
   ├── BinaryExpression → binaryOp(op, eval(left), eval(right))
   ├── LogicalExpression → shortCircuit(op, eval(left), () => eval(right))
   ├── UnaryExpression  → unaryOp(op, eval(argument))
   ├── ConditionalExpression → eval(test) ? eval(consequent) : eval(alternate)
   ├── MemberExpression → eval(object)?.[eval(property)]
   ├── CallExpression   → if (shortCircuitFn) invoke(eval(callee), args.map(a => () => evaluate(a)))
    │                     else invoke(eval(callee), args.map(eval))
   ├── ArrayExpression  → elements.map(eval)
   ├── ObjectExpression → reduce properties to object
   ├── ArrowFunction    → 返回闭包 (args) => eval(body, extendedScope)
   └── NullCoalesce     → eval(left) ?? eval(right)
```

变量没有词法作用域分析步骤，`Identifier` 节点在求值时直接从运行时 scope 中按名称查找。因为没有声明语句，所有变量都是外部注入的。

### 名称解析与作用域语义

当前设计不做编译期词法作用域分析，但运行时仍然需要定义稳定的名称查找顺序。

#### 标识符查找顺序

1. 当前 lambda 调用帧参数
2. 内置命名空间变量：`$Math`、`$JSON`、`$Date`
3. 运行时 scope：`scope.get(name)`

#### 规则

1. 普通标识符从运行时 scope 中读取，不做声明解析。
2. lambda 参数只在当前 lambda 执行期间有效。
3. lambda 参数可以遮蔽同名 scope 变量，例如 `ARRAYMAP(items, x => x + tax)` 中的 `x` 优先取参数，`tax` 取外部 scope。
4. 嵌套 lambda 允许捕获外层 lambda 参数；运行时通过 `extendedScope` 链实现，不做编译期捕获分析。
5. 以 `$` 开头的内置命名空间名保留，不能作为 lambda 参数名。

#### 依赖追踪边界

1. 只有运行时 scope 读取参与依赖追踪。
2. lambda 参数读取不记录为 scope 依赖。
3. `user.name` 记录根依赖 `user`，不承诺精确到深层路径。
4. 枚举对象键、结构反射或整对象展开视为对根对象的广义读取，记录根依赖或 wildcard，具体以 `docs/architecture/dependency-tracking.md` 为准。

### 调用语义

`CallExpression` 需要区分普通函数调用与成员方法调用，避免丢失接收者。

#### 普通调用

```ts
fn(arg1, arg2);
```

1. 先求值 `fn`
2. 再按 eager 或 lazy 规则求值参数
3. 以 `undefined` 作为 `this` 调用

#### 成员调用

```ts
obj.method(arg1, arg2);
$Math.abs(-3);
$JSON.stringify(value);
$Date.format(date, 'yyyy-MM-dd');
```

1. 先求值 `obj`
2. 再读取 `obj.method`
3. 调用时保留 `obj` 作为 receiver

这条规则同样适用于 `$Math`、`$JSON`、`$Date` 这类命名空间对象。

#### 可选调用

v1 仅支持可选成员访问 `obj?.prop`，不支持 `obj?.method()` 或 `fn?.()` 形式的可选调用，避免额外语法和调用分派复杂度。

### 与 flux-core 的集成

`compile.ts` 中的 `FormulaCompiler` 实现满足 `@nop-chaos/flux-core` 的 `FormulaCompiler` 接口：

```typescript
interface FormulaCompiler {
  hasExpression(input: string): boolean; // 检测是否包含 ${...}
  compileExpression<T>(source: string): CompiledExpression<T>;
  compileTemplate<T>(source: string): CompiledStringTemplate<T>;
}
```

`CompiledExpression.exec(context, env)` 和 `CompiledStringTemplate.exec(context, env)` 在运行时调用 evaluator，并显式传入当前 compiler 持有的 registry snapshot。

函数和命名空间对象不从 `env` 注入，而是从 `FormulaRegistry` snapshot 读取。`env` 仍然保留给 monitor、fetcher、notify 等运行时基础设施使用。

### 依赖追踪

沿用现有 Proxy 方案（`scope.ts` 中的 `createFormulaScope`），但文档语义以根依赖收集为准：表达式读取 `user.name` 时，至少记录 `user`；深层路径是否保留只作为实现细节，不能成为上层契约。若与 `docs/architecture/dependency-tracking.md` 冲突，以后者为准。

---

## 内置函数

函数通过实例级 `FormulaRegistry` 注册。`createFormulaCompiler(registry?)` 会持有一个 registry 实例；若调用方未提供，compiler 会创建自己的实例并安装 builtins。

### Registry 模型

```ts
const registry = createFormulaRegistry();
installBuiltins(registry);

registry.registerNamespace('$Math', Math);
registry.registerFunction('MY_FN', (input: unknown) => input);

const compiler = createFormulaCompiler(registry);
```

求值器在执行时读取当前 registry snapshot：

```ts
evaluateAst(ast, {
  env,
  context,
  registry: registry.getSnapshot(),
});
```

这使 builtins/custom functions 的所有权跟随 compiler/runtime 实例，而不是依赖 process-global mutable state。

### 条件函数的短路求值

nop-xlang 中 `IF` 和 `SWITCH` 是 `@Macro` 编译期宏函数，通过 AST 变换实现短路。前端不引入宏机制，但 `IF` 和 `SWITCH` 仍然需要短路求值——参考 amis-formula 的做法：

**evaluator 根据函数元数据决定 eager 或 lazy 调用**：

```
// evaluator 处理 CallExpression 时：
if (functionMeta[calleeName]?.invoke === 'lazy') {
  args = ast.arguments.map(arg => () => evaluate(arg, scope, env))
} else {
  args = ast.arguments.map(arg => evaluate(arg, scope, env))
}
return fn.apply(null, args)
```

默认调用模式为 `eager`。当前 v1 只有 `IF` 和 `SWITCH` 使用 `lazy`。

函数实现按需调用 thunk：

```typescript
IF(cond, then, orElse) { return cond() ? then() : orElse?.() ?? null }

SWITCH(expr, ...caseValuePairs) {
  const val = expr()
  for (let i = 0; i < caseValuePairs.length - 1; i += 2) {
    if (val === caseValuePairs[i]()) return caseValuePairs[i + 1]()
  }
  // 奇数个参数时最后一个为 default
  if (caseValuePairs.length % 2 === 1) return caseValuePairs[caseValuePairs.length - 1]()
  return null
}
```

好处：`IF(a > 0, expensive(), other())` 不会同时执行两个分支，避免短路分支中的副作用引发不必要的错误。

注意：逻辑与/或通过 `&&`/`||` 运算符实现短路求值，不提供 `AND()`/`OR()` 函数。`&&`/`||` 的短路是运算符级别的，由 evaluator 的 `LogicalExpression` 分支直接保证。

### 条件函数

| 函数     | 签名                                                                    | 说明               |
| -------- | ----------------------------------------------------------------------- | ------------------ |
| `IF`     | `(cond: thunk, then: thunk, else?: thunk) => any`                       | 条件分支，短路求值 |
| `SWITCH` | `(expr: thunk, case1: thunk, val1: thunk, ..., default?: thunk) => any` | 多值匹配，短路求值 |

### 命名空间对象

通过内置变量直接暴露工具对象，收束相关方法，避免单独注册几十个顶层函数：

| 变量    | 返回               | 用法示例                                               |
| ------- | ------------------ | ------------------------------------------------------ |
| `$Math` | `Math`（原生对象） | `$Math.abs(-3)`、`$Math.round(1.5)`、`$Math.max(1, 2)` |
| `$JSON` | `JSON`（原生对象） | `$JSON.stringify(obj)`、`$JSON.parse(str)`             |
| `$Date` | `DateHelper` 对象  | `$Date.now()`、`$Date.format(d, 'iso-date')`           |

`$Math`、`$JSON`、`$Date` 通过 registry namespace 暴露，evaluator 将其作为内置 Identifier 处理，无需注册到 scope。

```typescript
registry.registerNamespace('$Math', Math);
registry.registerNamespace('$JSON', JSON);
registry.registerNamespace('$Date', dateHelper);

// evaluator Identifier 解析
if (ast.type === 'Identifier' && namespaces[ast.name] !== undefined) {
  return namespaces[ast.name];
}
```

`$Math` 和 `$JSON` 直接返回原生对象，零成本。`$Date` 返回一个 `DateHelper` 对象，封装日期操作：

```typescript
const dateHelper = {
  now(): Date,
  today(): Date,
  parse(input: string | number | Date): Date | null,
  format(d: Date, fmt: 'iso-date' | 'iso-datetime' | 'date' | 'datetime'): string,
  year(d: Date): number,
  month(d: Date): number,
  day(d: Date): number,
  hours(d: Date): number,
  minutes(d: Date): number,
  seconds(d: Date): number,
  addDays(d: Date, n: number): Date,
  addMonths(d: Date, n: number): Date,
  addYears(d: Date, n: number): Date,
  diff(a: Date, b: Date, unit: 'day' | 'month' | 'year'): number,
}
```

好处：

1. 不需要为 `abs`/`round`/`max`/`min`/`ceil`/`floor`/`sqrt`/`pow` 等各注册一个顶层函数
2. 不需要为 `stringify`/`parse` 各注册一个顶层函数
3. 用户通过 `$Math.xxx()` 调用，与 JavaScript 完全一致，无学习成本
4. 扩展性好——新增功能直接挂在 helper 对象上，不污染顶层命名空间

`$Date.format()` 在 v1 不采用 moment/dayjs 风格 token 字符串，而是只支持少量命名格式。这样可以直接基于 `Intl.DateTimeFormat` 实现，避免再引入一套 token 解释器。

### 顶层函数

以下函数因调用约定特殊（短路求值）或无法归入命名空间对象，仍作为顶层函数注册在 registry 中：

| 函数             | 签名                                                                    | 说明                    |
| ---------------- | ----------------------------------------------------------------------- | ----------------------- |
| `IF`             | `(cond: thunk, then: thunk, else?: thunk) => any`                       | 条件分支，短路求值      |
| `SWITCH`         | `(expr: thunk, case1: thunk, val1: thunk, ..., default?: thunk) => any` | 多值匹配，短路求值      |
| `SUM`            | `(...args) => number`                                                   | 求和，支持数组展开      |
| `AVG`            | `(...args) => number`                                                   | 平均值，支持数组展开    |
| `COUNT`          | `(arr) => number`                                                       | 元素个数                |
| `ARRAYMAP`       | `(arr, fn) => array`                                                    | 映射，`fn` 接受箭头函数 |
| `ARRAYFILTER`    | `(arr, fn) => array`                                                    | 过滤                    |
| `ARRAYFIND`      | `(arr, fn) => any`                                                      | 查找元素                |
| `ARRAYFINDINDEX` | `(arr, fn) => number`                                                   | 查找索引                |
| `ARRAYSOME`      | `(arr, fn) => boolean`                                                  | 存在性判断              |
| `ARRAYEVERY`     | `(arr, fn) => boolean`                                                  | 全量判断                |
| `ARRAYINCLUDES`  | `(arr, item) => boolean`                                                | 包含判断                |
| `CONCAT`         | `(...arrs) => array`                                                    | 数组合并                |
| `UNIQ`           | `(arr) => array`                                                        | 去重                    |
| `COMPACT`        | `(arr) => array`                                                        | 去除假值                |
| `LEN`            | `(s) => number`                                                         | 字符串长度              |
| `CONCATENATE`    | `(...args) => string`                                                   | 拼接文本                |
| `TRIM`           | `(s) => string`                                                         | 去首尾空白              |
| `UPPER`          | `(s) => string`                                                         | 转大写                  |
| `LOWER`          | `(s) => string`                                                         | 转小写                  |
| `REPLACE`        | `(s, search, replace) => string`                                        | 全量替换                |
| `SPLIT`          | `(s, sep) => string[]`                                                  | 分割字符串              |
| `JOIN`           | `(arr, sep) => string`                                                  | 数组连接                |
| `CONTAINS`       | `(s, search) => boolean`                                                | 是否包含                |
| `ISEMPTY`        | `(s) => boolean`                                                        | 是否为空                |
| `INT`            | `(n) => number`                                                         | 取整                    |
| `MOD`            | `(a, b) => number`                                                      | 取模                    |
| `RAND`           | `() => number`                                                          | 随机数                  |
| `PI`             | `() => number`                                                          | 圆周率                  |

对比之前的设计：`ABS`/`MAX`/`MIN`/`ROUND`/`FLOOR`/`CEIL`/`SQRT`/`POWER` 等数学函数不再作为顶层函数，改用 `$Math.abs()` 等调用。`ENCODEJSON`/`DECODEJSON` 改用 `$JSON.stringify()`/`$JSON.parse()`。`NOW`/`TODAY`/`YEAR`/`MONTH`/`DAY`/`FORMAT_DATE` 改用 `$Date.now()`/`$Date.format()` 等。

---

## 相等语义

`==`、`===`、`!=`、`!==` 的求值规则：

1. 引用相同 → `true`
2. 任一为 `null`/`undefined` → 仅当两者都为 `null`/`undefined` 时为 `true`
3. 类型不同但都是数字 → 转为数字比较（`1 == 1.0` 为 `true`）
4. 都是字符串 → 值比较
5. 其他 → `false`

这是 **自定义相等规则**，不是 JavaScript 原生 `===` 语义。文档中“严格比较”仅表示“不做 JS 风格的宽松类型转换”，例如 `"1" == 1` 为 `false`。

### 相等语义示例

| 表达式               | 结果    | 说明                         |
| -------------------- | ------- | ---------------------------- |
| `1 == 1`             | `true`  | 同值数字                     |
| `1 == 1.0`           | `true`  | 数字按数值比较               |
| `1 === 1.0`          | `true`  | `===` 与 `==` 同义           |
| `"1" == 1`           | `false` | 不做字符串到数字转换         |
| `null == undefined`  | `true`  | 空值统一语义                 |
| `null === undefined` | `true`  | `===` 与 `==` 同义           |
| `"a" == "a"`         | `true`  | 字符串按值比较               |
| `true == 1`          | `false` | 不做布尔数字转换             |
| `{}` == `{}`         | `false` | 非数字非字符串对象不做深比较 |

---

## Feature Flags

参考 nop-xlang 的 `ExprFeatures` 位掩码设计，允许同一引擎在不同场景下启用/禁用语法特性：

| Flag             | 值      | 说明                        |
| ---------------- | ------- | --------------------------- |
| `FUNCTION_CALL`  | `0x01`  | 函数调用 `f()`              |
| `OBJECT_CALL`    | `0x02`  | 方法调用 `obj.method()`     |
| `OBJECT_PROP`    | `0x04`  | 属性访问 `obj.prop`         |
| `ARRAY_INDEX`    | `0x08`  | 下标访问 `arr[i]`           |
| `BIT_OP`         | `0x10`  | 位运算 `& \| ^ ~ << >> >>>` |
| `JSON`           | `0x20`  | 数组/对象字面量             |
| `LAMBDA`         | `0x40`  | 箭头函数 `x => expr`        |
| `OPTIONAL_CHAIN` | `0x80`  | 可选链 `?.`                 |
| `ALL`            | `0x0FF` | 全部启用                    |

预定义集合：

- **`ALL`** — 默认模式，所有特性
- **`SIMPLE`** — `FUNCTION_CALL | OBJECT_CALL | JSON | OBJECT_PROP | ARRAY_INDEX`
- **`FILTER_EXPR`** — `OBJECT_PROP | JSON`（用于简单过滤条件）

---

## 与 amis-formula 的差异

### 语法差异

| 维度                         | amis-formula                           | flux-formula（新）                       |
| ---------------------------- | -------------------------------------- | ---------------------------------------- | ---------------- | -------------------------- |
| 基础语法风格                 | Excel 公式 + 自定义模板混合            | 类 JS/TS 表达式子集                      |
| 模板语法                     | `${expr}` 内嵌完整语言                 | `${expr}` 仅作运行时求值，无多阶段       |
| 过滤器管道                   | `${x \| html\| truncate:10}`           | 不支持，`                                | ` 仅作位或运算符 |
| `==` 语义                    | 做隐式类型转换（`"1" == 1` 为 `true`） | 严格比较，不做类型转换                   |
| `===`                        | 支持，与 JS `===` 行为一致             | 支持，但与 `==` 同义，采用自定义相等规则 |
| `and`/`or` 关键字            | 不支持                                 | 支持，与 `&&`/`                          |                  | ` 同义                     |
| `AND()`/`OR()` 函数          | 支持，接收 thunk 短路求值              | 不提供，用 `&&`/`                        |                  | `运算符或`and`/`or` 关键字 |
| `??` 空值合并                | 不支持                                 | 支持                                     |
| `?.` 可选链                  | 不支持                                 | 支持                                     |
| `!` 非空断言                 | 不支持                                 | 不支持                                   |
| `instanceof`                 | 不支持                                 | 支持                                     |
| `**` 幂运算                  | 不支持                                 | 支持                                     |
| `new` 表达式                 | 不支持                                 | 不支持                                   |
| 模板字符串 `` `...${}...` `` | 不支持                                 | 不支持（v1 延后）                        |
| 正则字面量                   | 不支持                                 | 不支持（v1 延后）                        |
| 位运算 `& \| ^ ~ << >> >>>`  | 仅 `\|` 用于过滤器                     | 完整位运算（feature flag 控制）          |

### 函数差异

| 维度         | amis-formula                           | flux-formula（新）                             |
| ------------ | -------------------------------------- | ---------------------------------------------- | --- | ----------------------------------- |
| `IF` 实现    | 运行时函数，参数包装 thunk 短路求值    | 同 amis-formula 做法，参数包装 thunk 短路求值  |
| `SWITCH`     | 不支持（用嵌套 `IF` 替代）             | 支持，参数包装 thunk 短路求值                  |
| 逻辑组合     | `AND()`/`OR()` 函数 + thunk 短路       | 用 `&&`/`                                      |     | `/`and`/`or` 运算符，运算符级别短路 |
| 数学函数     | `ABS()`/`MAX()`/`ROUND()` 等顶层函数   | `$Math.abs()`/`$Math.max()`/`$Math.round()` 等 |
| JSON         | `ENCODEJSON()`/`DECODEJSON()` 顶层函数 | `$JSON.stringify()`/`$JSON.parse()`            |
| 日期         | `NOW()`/`TODAY()`/`YEAR()` + moment.js | `$Date.now()`/`$Date.format()` + 原生 Intl     |
| 函数注册     | 静态注册到全局 `Evaluator`             | 实例级 `FormulaRegistry`                       |
| 函数数量     | ~70 个顶层函数                         | ~25 个顶层函数 + 3 个命名空间对象              |
| 中文大写金额 | `UPPERMONEY()`                         | 不内置，按需通过 registry 扩展                 |

### 架构差异

| 维度          | amis-formula                                                            | flux-formula（新）                                         |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| Lexer         | 785 行，5 种状态机嵌套（START/SCRIPT/EXPRESSION/BLOCK/Filter/Template） | 预计 ~400 行，仅 EXPRESSION + Template 两种状态            |
| Parser        | 887 行，需处理过滤器管道 `\|` 与位或 `\|` 的歧义                        | 预计 ~800 行，无过滤器歧义                                 |
| Evaluator     | 2902 行单类（`Evaluator`），含所有内置函数                              | 分离为 `evaluator.ts`（~300 行）+ `builtins.ts`（~300 行） |
| 求值方式      | tree-walking，`evalute(ast)` 按类型分派方法                             | tree-walking，`evaluate(ast, scope)` 按类型 switch         |
| 外部依赖      | moment + lodash（6 个函数）                                             | 零依赖                                                     |
| Feature flags | 3 种模式（evalMode / variableMode / allowFilter）                       | 8 位位掩码，精细控制                                       |
| 浏览器绑定    | 直接访问 `document.cookie`、`window`                                    | 无浏览器 API 依赖                                          |

### 兼容性

| amis 写法                 | 新引擎是否兼容 | 替代写法                                                   |
| ------------------------- | -------------- | ---------------------------------------------------------- |
| `${a + b}`                | 兼容           | 不变                                                       |
| `${a == 1 ? '是' : '否'}` | 兼容           | 不变                                                       |
| `${IF(a > 0, 1, 0)}`      | 兼容           | 不变                                                       |
| `${SUM(scores)}`          | 兼容           | 不变                                                       |
| `${a && b}`               | 兼容           | 不变                                                       |
| `${a \|\| b}`             | 兼容           | 不变                                                       |
| `${ABS(-3)}`              | **不兼容**     | `$Math.abs(-3)`                                            |
| `${MAX(1, 2, 3)}`         | **不兼容**     | `$Math.max(1, 2, 3)`                                       |
| `${ROUND(1.5)}`           | **不兼容**     | `$Math.round(1.5)`                                         |
| `${ENCODEJSON(obj)}`      | **不兼容**     | `$JSON.stringify(obj)`                                     |
| `${DECODEJSON(str)}`      | **不兼容**     | `$JSON.parse(str)`                                         |
| `${NOW()}`                | **不兼容**     | `$Date.now()`                                              |
| `${TODAY()}`              | **不兼容**     | `$Date.today()`                                            |
| `${FORMAT_DATE(d, fmt)}`  | **不兼容**     | `$Date.format(d, 'date')` 或 `$Date.format(d, 'iso-date')` |
| `${AND(a, b)}`            | **不兼容**     | `a && b` 或 `a and b`                                      |
| `${OR(a, b)}`             | **不兼容**     | `a \|\| b` 或 `a or b`                                     |
| `${value \| html}`        | **不兼容**     | `html(value)` 或 `${value}` 自动转义                       |
| `${value \| truncate:10}` | **不兼容**     | `$Math.trunc(value)` 或自定义函数                          |
| `${value \| isTrue:a:b}`  | **不兼容**     | `value ? a : b`                                            |
| `$varName`（旧变量语法）  | **不兼容**     | `${varName}`                                               |
| `$$`（当前上下文引用）    | **不兼容**     | 直接用变量名                                               |
| `${window:xxx}`           | **不兼容**     | 从 scope 传入                                              |
| `${cookie:key}`           | **不兼容**     | 从 scope 传入                                              |
| 中文变量名 `${姓名}`      | 兼容           | 不变                                                       |

### 迁移矩阵

| 类别     | 范围                                                                   | 处理方式                                       |
| -------- | ---------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | -------- |
| 自动迁移 | `${expr                                                                | filter:arg}` 这类过滤器管道                    | 在模板切分层预处理为 `filter(expr, arg)` |
| 直接兼容 | 三元、算术、比较、`IF()`、`SUM()`、`&&`、`                             |                                                | `                                        | 无需修改 |
| 手工迁移 | `AND()`、`OR()`、`ABS()`、`MAX()`、`ROUND()`、`NOW()`、`FORMAT_DATE()` | 分别改写为运算符、`$Math.xxx()`、`$Date.xxx()` |
| 不支持   | `$varName`、`$$`、`window:`、`cookie:`                                 | 改为显式 scope 注入                            |

上层接口（`FormulaCompiler`、`ExpressionCompiler`、`CompiledRuntimeValue`）保持不变，`flux-runtime` 和 `flux-react` 无需修改。文档不再声称“所有存量 schema 零修改迁移”，只有过滤器管道可自动迁移，其余不兼容项需按矩阵处理。

### 错误语义

1. 语法错误在 `compileExpression` / `compileTemplate` 阶段抛出，调用方可选择回退为静态字符串。
2. 运行时未知标识符默认返回 `undefined`，与当前 scope 读取语义一致。
3. 非可选成员访问遇到 `null`/`undefined` 时抛出表达式错误；可选成员访问返回 `undefined`。
4. 调用目标不是函数时抛出表达式错误。
5. 错误通过现有 `RendererEnv.monitor?.onError` 路径上报，phase 为 `expression`。

---

## 未来可能

当前不实现，设计上不阻塞未来引入：

1. **类型推导** — 参考 nop-xlang 的 `TypeInferenceProcessor`，在编译期推断表达式类型，用于 IDE 提示和 schema 校验。需要先完善 AST 节点的类型元信息。
