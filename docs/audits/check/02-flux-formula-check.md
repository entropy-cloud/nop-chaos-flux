# 02 flux-formula 实现代码检查报告

- 检查日期：2026-08-20
- 范围：packages/flux-formula/src/ 全部 20 个源文件（排除 `*.test.ts` 与 `__tests__`），共 3418 行。求值器（evaluator.ts）、函数库（builtins.ts）、词法（lexer.ts）、语法（parser.ts）、静态求值（compile/static-eval.ts）、编译器（compile/formula-compiler.ts、compile-node.ts）全文精读；其余文件（ast/bind-ast/registry/scope/template/evaluate/date-helper/pipe-syntax/symbol-diagnostics/expression-compiler 等）精读 + 定向 grep 交叉验证。
- 结论概览：P0 x2 / P1 x3 / P2 x5 / P3 x12。总评：解析器与求值器总体工程质量较高（原型链防御、解析/求值深度限制、短路求值、惰性 IF/SWITCH 均正确实现），但存在两个高价值缺陷——optional chaining 混合链在前段为 null 时崩溃（`?.` 核心语义失效）、非确定性 namespace 调用（`$Date.now()`/`$Math.random()`）被编译期静态求值固化；另有浮点 ROUND 进位误差与 SUM 静默丢弃 Infinity 等数值语义问题。

严重级别定义：P0 = 常规输入即触发错误结果（附输入→路径→错误结果推理链）；P1 = 特定条件触发；P2 = 契约/风险；P3 = 提示。

## P0 缺陷

### F-01 混合 optional 链 `a?.b.c` 在 a 为 null 时抛异常，而非返回 undefined

- 位置：`packages/flux-formula/src/evaluator.ts:248-262`（`evaluateMemberTarget`）
- 摘录：

```ts
if (objectValue == null) {
  if (node.optional) {
    return { value: undefined, receiver: undefined, name: undefined };
  }
  throw createExpressionError('Cannot access member of null or undefined');
}
```

- 推理链：
  1. 输入：`${user?.profile.name}`（schema 中最常见的防御性写法），scope 数据 `{ user: null }`。
  2. parser.ts:333-407 `parsePostfix` 先产出内层 `Member(?.profile, optional=true)`，再产出外层 `Member(.name, optional=false)`。`?.` 只标记紧随其后的一跳。
  3. 求值外层 `.name` 时：`evaluateNode(node.object)` 求值内层 `user?.profile` → `user == null` 且内层 `optional=true` → 返回 `{ value: undefined }`。
  4. 外层拿到 `objectValue === undefined`，但外层自身的 `node.optional === false` → 走 throw 分支。
- 错误结果：JS/AMIS 语义应返回 `undefined`，实际整条表达式抛 `Cannot access member of null or undefined`，被 formula-compiler.ts:131 包装为 `Expression evaluation failed` 上抛，整个 prop 求值失败。
- 反误报核对：`contract-boundary.test.ts:86-102` 只覆盖了全链 optional（`a?.b?.c?.d`、`user?.address?.city`）与非 optional 访问 throw 两个极端，混合链无测试覆盖；作者显然已考虑 null 场景，混合链是遗漏而非设计。
- 影响：`?.` 的设计目的就是处理"前段可能为 null"，在该输入下崩溃等于功能失效。所有 `x?.a.b` 形态的表达式（防御写法的自然产物）在 x 为 null 时全部失败。
- 修复方向：optional 语义应短路整条后续链。方案一：求值 MemberExpression 时若 object 是 optional member 且值为 undefined，则链上后续非计算访问直接返回 undefined（可让内层 optional 返回带标记的结果向外传播）；方案二：parser 阶段把 `a?.b.c` 的后续链标记为 optional（类似 TS 的链式可选传播）。

### F-02 非确定性 namespace 调用（`$Date.now()`、`$Math.random()` 等）被编译期静态求值固化

- 位置：`packages/flux-formula/src/compile/static-eval.ts:130-172`（CallExpression 分支）
- 摘录：

```ts
const rootSymbol = symbolTable?.resolve(calleePath[0]);
if (rootSymbol?.kind !== 'builtin-namespace') {
  return { static: false };
}
...
return {
  static: true,
  value: (fn as (...args: unknown[]) => unknown).apply(objectValue.value, args),
};
```

- 推理链：
  1. 输入：schema 模板 `${$Date.now()}`（或 `${$Math.random()}`、`${$Date.today()}`）。
  2. `compileTemplate`/`compileExpression`（formula-compiler.ts:110、173）对 AST 调 `evaluateStaticAst`。
  3. CallExpression 分支：callee 是 MemberExpression，`buildMemberPath` 得 `['$Date','now']`；`$Date` 在 `ensureCompileOptions` 的 fallback symbolTable 中是 `builtin-namespace`；args 为空全部 static → **在编译时刻执行** `dateHelper.now()` 即 `new Date()`。
  4. 返回 `{ static: true, value: 编译时刻的 Date }` → `staticValue` → compile-node.ts 落成 `static-node` → 之后每次求值直接返回该固定值。
  5. flux-runtime 的 `adaptorExpressionCache` / `compiledValueCache`（request-runtime-adaptor.ts:10、runtime-eval-helpers.ts:18）按 source 缓存 compiled 结果，固化持续整个应用生命周期。
- 错误结果：`$Date.now()` 永远返回编译那一刻的时间（页面永不刷新时间）；`$Math.random()` 每次渲染返回同一个"随机数"。无任何报错，静默错误数据。
- 反误报核对：grep 全部测试无 `$Date.now`/`$Math.random` 静态化用例；flux-formula 内无 `evaluateStaticAst`/`staticValue` 的任何测试。注意 eager 注册的 `RAND()`（Identifier callee）不受影响——静态分支只放行 MemberExpression callee，缺陷恰好集中在 namespace 成员调用上。
- 影响：任何依赖 `$Date.now()` 做展示/判断的公式数据错误且极难排查；同时对有副作用的自定义 namespace 函数，编译期即触发副作用。
- 修复方向：为 registry 增加"确定性"元数据（如 `deterministic: false` 白名单 `$Date.now/$Date.today/$Date.today/$Math.random`），static-eval CallExpression 分支命中非确定成员时返回 `{ static: false }`；或默认所有 namespace 成员调用不做静态折叠，仅白名单纯函数（`$Math.abs` 等）。

## P1 隐患

### F-03 ROUND 存在经典浮点进位误差：ROUND(1.005, 2) = 1

- 位置：`packages/flux-formula/src/builtins.ts:187-198`
- 摘录：

```ts
const factor = 10 ** places;
return Math.round(value * factor) / factor;
```

- 问题：`1.005 * 100 === 100.49999999999999` → `Math.round` → 100 → 结果 1（期望 1.01）。同类：`ROUND(2.675, 2) = 2.67`。
- 反误报核对：`builtins.test.ts:181-202` 的用例全是"好"值（3.14159、1.23456），无进位边界用例；`ROUND(-1.5) = -1` 是测试固化的 JS `Math.round` 语义（不算缺陷）。
- 影响：金额/比率展示场景静默少一分；schema 作者无法从公式表面看出问题。
- 修复方向：用指数字符串修正法（`Number(Math.round(value + 'e' + places) + 'e-' + places)`）或 epsilon 校正（`Math.round((value * factor) * (1 + Number.EPSILON * Math.abs(value * factor))) / factor`），并补 1.005/2.675 边界用例。

### F-04 SUM/AVG 静默丢弃 Infinity（合法数值被 `Number.isFinite` 过滤）

- 位置：`packages/flux-formula/src/builtins.ts:5-8`、92-98
- 摘录：

```ts
return flattened.map((value) => Number(value)).filter((value) => Number.isFinite(value));
...
registry.registerFunction('SUM', (...args: unknown[]) =>
  flattenNumericArgs(args).reduce((sum, value) => sum + value, 0),
);
```

- 问题：`SUM(1, 1/0)` 中 `1/0 = Infinity` 是合法数值，但被 `isFinite` 过滤 → 结果 1（应传播 Infinity 或报错）。AVG 更隐蔽：非数值项被剔除后分母随之变小，`AVG(1, 2, 'x') = 1.5` 而非 NaN/报错。
- 反误报核对：`builtins.test.ts:39` 固化了 `'x'`（字符串）被过滤是有意行为；Infinity（数值类型）无测试，与"过滤非数值垃圾"是两回事。
- 影响：上游数据含除零结果（Infinity）或 NaN 时，聚合值静默偏小，无诊断。
- 修复方向：区分"非数值输入"（可过滤或报错，维持现状）与"数值型 ±Infinity/NaN"（应传播 NaN/Infinity 或提供严格模式参数）。

### F-05 SPLIT/CONTAINS/REPLACE 缺参时 `toStringValue(undefined)=''` 产生反直觉结果

- 位置：`packages/flux-formula/src/builtins.ts:14-16`、164-175
- 摘录：

```ts
function toStringValue(input: unknown): string {
  return input == null ? '' : String(input);
}
...
registry.registerFunction('SPLIT', (input: unknown, separator: unknown) =>
  toStringValue(input).split(toStringValue(separator)),
);
registry.registerFunction('CONTAINS', (input: unknown, search: unknown) =>
  toStringValue(input).includes(toStringValue(search)),
);
```

- 问题（同根因三连）：
  - `SPLIT('abc')`（缺 separator）→ `'abc'.split('')` → `['a','b','c']`；JS 语义 `split(undefined)` 应返回 `['abc']`。
  - `CONTAINS('abc', null)` → `includes('')` → **恒 true**。
  - `REPLACE('abc', null, '-')` → `split('')` → `'-a-b-c-'`；JS `String.replace(null, ...)` 只替换一次字面量。
- 反误报核对：无对应测试固化；JOIN 对 `separator == null` 有显式 `','` 默认（171 行），说明作者在 JOIN 处理了缺参，其余三处遗漏。
- 影响：scope 数据为 null/undefined 时（公式最常见输入），过滤类函数给出恒真/错拆结果，逻辑判断静默反转。
- 修复方向：`SPLIT` 在 `separator == null` 时返回 `[input]`；`CONTAINS` 在 `search == null` 时返回 false（或严格校验抛错）；`REPLACE` 在 `search == null`/`''` 时返回原文。

## P2 风险

### F-06 parser `parseUnary`/`parseExponent` 递归无深度保护，超长 `!`/`**` 链可爆栈

- 位置：`packages/flux-formula/src/parser.ts:302-331`
- 摘录：

```ts
private parseExponent(): FormulaAstNode {
  const left = this.parseUnary();
  ...
  const right = this.parseExponent();   // 右递归，无 enterRecursive
}
private parseUnary(): FormulaAstNode {
  if (this.match('operator') && ['!', '~', '-', '+'].includes(this.current().value)) {
    const operator = this.consume();
    const argument = this.parseUnary();  // 直接递归，无 enterRecursive
```

- 问题：`MAX_PARSER_DEPTH=256` 只在 `parseArrowExpression`/`parsePrimary` 施加；`parseUnary` 自递归和 `parseExponent` 右递归不受限。约十万级长度的 `!!!!!…!1` 或 `2**2**…` 输入触发 `RangeError: Maximum call stack size exceeded`。
- 反误报核对：compile-node.ts:84/113 的 catch 会把编译异常降级为 static 原文 + 诊断，不会 crash 应用；但错误信息为引擎栈溢出文本，且该输入长度可来自不受信 schema 字符串。嵌套 `(((())))`/`[[[[]]]]` 受保护（parsePrimary），唯独这两条路径裸奔，属防护不一致。
- 修复方向：为 `parseUnary`/`parseExponent` 补 `enterRecursive/leaveRecursive`，或将一元链循环化（收集 operator 数组后单次建链）。

### F-07 `normalizeExpressionSource` 贪婪正则在多段插值输入下产生损坏表达式（suspect）

- 位置：`packages/flux-formula/src/template.ts:29-38`、`packages/flux-formula/src/compile/formula-compiler.ts:106`
- 摘录：

```ts
const directMatch = /^\$\{([\s\S]+)\}$/.exec(trimmed);
if (directMatch) {
  return directMatch[1].trim();
}
// formula-compiler.ts:106
const normalized = rewriteFilterPipeSyntax(normalizeExpressionSource(source));
```

- 问题：正则贪婪匹配**最后一个** `}`。输入 `${a} + ${b}` 时提取出 `a} + ${b`（损坏串），parse 必然报错。`compileNode`（compile-node.ts:68）先用 `isPureExpression` 守卫故主路径安全；但 `flux-runtime/src/async-data/request-runtime-adaptor.ts:43` 直接调 `compileExpression`，若 adaptor 表达式误写成多段 `${}` 形态，得到的是令人困惑的语法错误而非"应为单表达式"的清晰提示。
- 反误报核对：adaptor 约定为单表达式（normalizeAdaptorSource 只做 trim/去 return 前缀），实际触发概率低，标 suspect。
- 修复方向：`normalizeExpressionSource` 先用 `countBraceDepth` 验证首尾配对（与 `isPureExpression` 同一逻辑），仅当整体是单个 `${...}` 时剥壳；否则原样返回。

### F-08 date-helper `format` 的 `date`/`datetime` 输出 UTC 值但无时区标注；`addDays` 非数字 count 静默产生 Invalid Date

- 位置：`packages/flux-formula/src/date-helper.ts:29-46`、109-118`
- 摘录：

```ts
case 'datetime':
  return `${datePart} ${timePart}`;   // UTC 值，无 Z 标注
...
result?.setUTCDate(result.getUTCDate() + Number(count || 0));  // count='abc' → NaN
```

- 问题：
  - `format(now, 'datetime')` 输出如 `2026-08-20 03:00:00`——这是 UTC 时刻，东八区用户看到的"当前时间"差 8 小时，且字符串无 `Z` 提示（`iso-datetime` 有 `Z`，`datetime` 没有）。
  - `addDays(d, 'abc')`：`'abc' || 0` → truthy → `Number('abc')=NaN` → `setUTCDate(NaN)` → Invalid Date 对象（非 null），下游 `getTime()=NaN` 静默传播；而 `parse` 对非法输入是返回 null 的。
- 修复方向：`datetime`/`date` 格式改用本地时区 parts，或在文档/实现中统一标注 UTC；`addDays/addMonths/addYears` 对 `Number.isNaN(Number(count))` 返回 null 与 `parse` 对齐。

### F-09 `createFormulaScope`/`wrapTrackedValue` 是仅测试引用的死代码，且每次属性访问新建 Proxy

- 位置：`packages/flux-formula/src/scope.ts:131-228`
- 摘录：

```ts
function createFormulaScope(context: EvalContext): Record<string, any> {
  function wrapTrackedValue(value: unknown, basePath: string): unknown {
    ...
    return new Proxy(value as Record<string, any>, {
      get(target, property) {
        ...
        return wrapTrackedValue(Reflect.get(target, property), nextPath);
```

- 问题：grep 全仓 `createFormulaScope`，生产代码与 `index.ts` 导出均无使用者，仅 `scope.test.ts` 引用——约 100 行未接线代码。且 `wrapTrackedValue` 每次 `get` 都递归新建 Proxy（无 WeakMap 缓存），若未来被接为求值热路径，`a.b.c.d` 每次求值分配 4 个 Proxy。
- 修复方向：要么在 `index.ts` 导出并接入（配 WeakMap proxy 缓存），要么连同测试删除；避免留下未验证的性能陷阱。

### F-10 模板字符串无 `\${` 字面量转义逃生舱（suspect）

- 位置：`packages/flux-formula/src/template.ts:50-80`（`parseTemplateSegments`）
- 摘录：

```ts
const exprStart = source.indexOf('${', i);
```

- 问题：`indexOf('${')` 不识别 `\${` 前缀，含字面 `${xxx}` 的纯文本（如展示代码示例、含占位符的文案）会被切为 expr 段，变量未定义时该段输出空串，原文静默丢失。grep `flux-guide/` 与 playground 均无转义写法文档，当前无法在模板中表达字面 `${`。
- 反误报核对：未找到 AMIS 转义对齐的明确需求，标 suspect；但 AMIS 生态中 `\${` 转义是既有约定，迁移场景会踩。
- 修复方向：`parseTemplateSegments` 中识别 `\${`，输出字面 `${` 并消耗反斜杠；同步补 flux-guide 文档。

## P3 提示

### F-11 static-eval 与 evaluator 安全检查不一致

`static-eval.ts:116-129/96-115` 的静态 Member/Object 求值不做 `DANGEROUS_MEMBER_KEYS` 检查（evaluator.ts:280 会 throw）：`$Math.toString` 静态路径返回函数引用、对象字面量 `{'__proto__': {...}}` 静态求值写入 `__proto__`（局部对象，无全局污染）；`instanceof` 也是编译通过、运行时才 throw（evaluator.ts:98）。同一表达式"静态编译成功、动态运行抛错"的不一致会给诊断带来困惑。建议静态路径复用同一份 key 黑名单。

### F-12 evaluateCall 的 lazy invokeMode 按 name 误配 member 调用

`evaluator.ts:324-326`：invokeMode 由 `callable.name` 查 `registry.functionMeta` 决定，而 name 来自 property 字符串（含 computed `obj['IF']`）。数据对象上名为 `IF`/`SWITCH` 的方法会被按 lazy 模式传入 thunk 而非实参。当前 functionMeta 中 lazy 的只有 IF/SWITCH，现实数据几乎不会撞名，但契约上应以"解析到的 fn 身份"而非名字决定调用约定。

### F-13 双引号字符串走 `JSON.parse`，合法 JS 转义被拒

`parser.ts:24-27`：`"\x41"`、`"\'"` 等 JS 合法转义在 JSON 语法下抛错；单引号路径对未知转义 `'\q'` 同样抛错（JS 宽松处理为 `q`）。报错更严格可接受，但与 JS 迁移预期有差。

### F-14 lexer 不支持 `1.e5` 形态数字

`lexer.ts:88`：`1.e5` 中 `.` 后必须紧跟数字，否则 `.` 落为 punctuation → 解析为 `1` 的 member access `.e5`（运行时 undefined）。JS 中 `1.e5 === 100000`。同类：`0x1F` 十六进制不支持（会清晰报错，可接受）。

### F-15 数组/对象字面量不支持尾逗号

`parser.ts:484-502/504-566`：`[1,2,]`、`{a:1,}` 均抛 `Unexpected token`/`Invalid object key`。JS 允许尾逗号，schema 作者易踩；错误信息（尤其对象场景的 "Invalid object key"）未指明是尾逗号问题。

### F-16 `-2 ** 2` 求值为 4，与 JS（语法错误）和 Python（-4）都不同

`parser.ts:302-316`：parseExponent 的 left 经 parseUnary，一元负号先于 `**` 结合。JS 里 `-2**2` 直接 SyntaxError 正是为规避该歧义；此处静默取 4。建议对齐 JS（报错）或在文档标注。

### F-17 SWITCH 奇数参数歧义、IF/SWITCH/ARRAYMAP 缺参保护不足

`builtins.ts:77-90`：`SWITCH(v, k1, r1, k2)`（漏写结果）时 branches 长度为奇数，末个 `k2` 被当作 default 返回——语义歧义静默。`IF(c)` 缺 whenTrue → 运行时 `whenTrue()` 对 undefined 调用 TypeError（错误信息不含函数名）。ARRAYMAP 传入非函数第二参同理。可在编译期（symbol-diagnostics 已有参数检查框架）或运行时给出带函数名的清晰报错。

### F-18 数值函数的静默类型转换族

`builtins.ts:5-8`：`SUM(null, true)` → null 计 0、true 计 1（`Number()` 转换后 isFinite 通过）；`LEN([1,2,3])` → 5（数组先 toString 成 `'1,2,3'`）；`REPLACE('abc', '', '-')` → `'-a-b-c-'`（空搜索串 split('') 每字符插入）。均无测试固化，建议明确语义或加参数校验。

### F-19 dateHelper.diff('month') 不满月按整月计

`date-helper.ts:68-70/139-146`：`diff('2026-01-31','2026-02-01','month') = 1`（只看年月差，不看日）。业务上"不足月"场景通常期望 0。另 `addMonths('2026-01-31', 1)` 溢出为 03-03（JS 标准行为，moment 一致，但建议文档标注）。

### F-20 监视器 noop 死代码与对象 key 误诊

`compile/formula-compiler.ts:65-67`：`createExpressionMonitorReporter` 为注释标注的 noop，仍被三处调用（reportError 全部无效，错误靠 throw 传播，不算吞错，但调用点是死代码）。`bind-ast.ts:47`/`symbol-diagnostics.ts:196-199` 会 walk 对象字面量的 key：`{$slot: 1}` 的 key 触发 `slot-used-outside-region` 误诊（key 不是变量引用）。

### F-21 parser.ts 594 行超出 500 行治理线

`scripts/check-oversized-code-files.mjs`：WARN=500 / ERROR=700，`OVERSIZED_EXEMPTIONS` 不含 parser.ts。594 行落在 WARN 区（不阻断 exit code、无需豁免），但 AGENTS.md 要求超 500 行评估拆分；docs/logs/2026/04-26.md 记录过一次拆分（抽出 parser-node-factories.ts 45 行）后仍超线。属已注册治理债务的自然延续，建议按 binary-chain/对象/数组子句再拆。

### F-22 `==` 严格相等语义与 AMIS 宽松语义的迁移差异

`builtins.ts:18-40`：`'1' == 1` → false、`0 == false` → false（`builtins.test.ts:149` 有测试固化，属有意设计）。AMIS 表达式（JS 宽松 `==`）中两者均为 true。09-amis-migration 场景下判断逻辑会静默反转，建议在迁移指南中显著标注。

## 检查过程记录

1. 背景阅读：`docs/architecture/flux-core.md`（§flux-formula is the expression base、§Scope prototype-pollution defense——确认"错误显式上抛不吞"是有意设计、scope proxy 防御基线）；`docs/references/terminology.md`（expression-node/EvalContext/ImportFrame 术语）；`packages/flux-formula/package.json`。
2. 全文精读（20/20 文件）：evaluator.ts、builtins.ts、lexer.ts、parser.ts、ast.ts、bind-ast.ts、registry.ts、scope.ts、template.ts、evaluate.ts、date-helper.ts、expression-compiler.ts、index.ts、compile.ts、parser-node-factories.ts、compile/{formula-compiler,compile-node,pipe-syntax,static-eval,symbol-diagnostics}.ts。
3. grep 扫描（src/，排除测试）：空 catch（仅 static-eval.ts:181 带 return 的降级 catch 与 formula-compiler.ts:131 重抛包装，无吞错）；`as any`（evaluator.ts 6 处，均为 `+`/比较/索引的动态语义逃逸，逐条核对无风险）；`@ts-ignore`/非空断言/TODO/FIXME（均无）。
4. 交叉验证（反误报）：
   - 测试固化意图：`contract-boundary.test.ts:86-110`（非 optional 访问 null throw 为预期）、`builtins.test.ts:145-150`（strict equals 预期）、`builtins.test.ts:39`（SUM 过滤非数值字符串预期）、`builtins.test.ts:181-202`（ROUND 无 1.005 边界用例）。
   - 调用路径：`compile-node.ts:68` 的 `isPureExpression` 守卫（F-07 降级依据）；`flux-runtime/src/async-data/request-runtime-adaptor.ts:20-46`（直接调 compileExpression + 无上限 Map 缓存，F-02/F-07 依据）；`flux-runtime/src/runtime-eval-helpers.ts`（WeakMap 编译缓存，F-02 固化依据）。
   - 治理基线：`scripts/check-oversized-code-files.mjs`（WARN=500/ERROR=700/豁免名单无 flux-formula）；`docs/logs/2026/04-26.md`（parser.ts 拆分记录）。
   - 语义约定：`flux-guide/02-expression-syntax.md`（`value | FUNC:args` 管道语法为文档化约定，故 `|` 顶层重写为 pipe 不是缺陷；无 `\${` 转义文档）。
   - 依赖实现：`flux-core/src/utils/path.ts:171` getIn 的危险段拦截；getMessageFormatter 位于 i18n-sink。
5. 短路求值/除零/深度保护专项核对：`&&`/`||`/`??`/`?:` 均真短路（evaluator.ts:149-167）；`/` 除零得 Infinity、NaN 传播与 JS 一致；求值深度 256（evaluator.ts:9）与解析深度 256（parser.ts:22）存在但覆盖不全（见 F-06）；缓存 keyed by 原始串（registry snapshot + runtime 层 compiled cache）语义只依赖 AST 不依赖求值上下文，未发现缓存中毒路径。
