# 03 flux-compiler 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-compiler/src/` 全部 41 个源文件、7734 行（排除 `*.test.*` 与 `__tests__`；含 6 个 `*.test-support.ts`/fixtures 文件，均已快扫）。核心编译管线（schema-compiler.ts、node-compiler.ts、node-compiler-helpers.ts、runtime-value-compilation.ts、fields.ts、action/source/reaction/validation 编译器、diagnostics、authoring-transform、target-enrichment、static-analysis、shape-validation 全族、symbol-helpers、validation-collection/compiler）全文精读；其余文件按模式扫描并抽查。
- 结论概览：P0 x0 / P1 x4 / P2 x7 / P3 x8。总评：flux-compiler 整体防御性良好（深度守卫、copy-on-write 保输入不可变、诊断去重、duplicate-id 检测齐备），未发现"合法输入→静默产出错误产物"级 P0；主要风险集中在①reaction watch 裸字符串与数组两种写法语义分裂（其一静默产出死 reaction）②closed-model renderer 的 onMount/onUnmount 在 validate 模式被误报 unknown-property ③插件 beforeCompile/afterCompile 按嵌套深度被重复应用 ④编译管线按深度级冗余重做 canonicalize/enrich（O(N·D)）。

## P0 缺陷

无。未发现满足"输入 → 路径 → 错误结果"完整推理链的静默错误产物级缺陷。候选 F-01 因其行为已被 `reaction-compiler.test.ts:30-46`（rx-2）固化为契约而降级为 P1。

## P1 隐患

### F-01 reaction watch 裸路径字符串与数组形式语义分裂，字符串形式静默产出"永不触发的 reaction"

`packages/flux-compiler/src/reaction-compiler.ts:19-39`

```ts
function extractWatchTemplate(watch: unknown): string {
  if (typeof watch === 'string') {
    return watch; // 字符串原样返回，不走 normalizeWatchEntry
  }
  if (Array.isArray(watch) && watch.length > 0 && typeof watch[0] === 'string') {
    return normalizeWatchEntry(watch[0]); // 数组条目做裸路径归一化
  }
  return '';
}
function normalizeWatchEntry(watch: string): string {
  if (watch.includes('${')) return watch;
  const rootPath = normalizeRootPath(watch);
  return rootPath ? `\${${watch}}` : watch;
}
```

问题：`watch: 'status'`（裸路径字符串）直接交给 `compiler.compileValue`，编译为 static-node 常量 `'status'`；而语义等价的 `watch: ['status']`（单元素数组）经 `normalizeWatchEntry` 包成 `${status}` 编译为动态读取（测试 rx-2 与 rx-3b 分别固化了这两种相反行为）。`validateReactionShape`（shape-validation-rules-reaction.ts:28-41）接受任意非空字符串，不要求 `${}`，也无任何诊断。

影响：作者写 `watch: 'status'` 时编译完全成功、无诊断，运行时 watch 值恒为常量，reaction 永不触发——静默功能失效；且同一语义两种写法行为相反，属作者陷阱。另注意 `extractWatchTemplate` 对数组只取第一个元素，其余 watch 项被静默丢弃（注释自认 v1 限制，validate 侧同样不提示）。

修复方向：`typeof watch === 'string'` 分支同样过 `normalizeWatchEntry`（或至少在字符串不含 `${` 且形如 root path 时发 warning）；数组多元素被忽略时发 diagnostic；同步更新 rx-2 测试契约。

### F-02 closed-model renderer 的 onMount/onUnmount 在 validate 模式被误报 `unknown-property`（默认 severity error）

`packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts:242-269`（主循环 unknown 检查）与 `:313-318`（lifecycle 校验）

```ts
if (
  (closedModel || strictMode) &&
  !acceptedKeys.has(key) &&                       // 'onMount'/'onUnmount' 不在 acceptedKeys
  diagnostics.validation.unknownBarePropertyPolicy !== 'ignore'
) {
  const severity = closedModel ? (strictMode ? 'error' : ...policy==='warn' ? 'warning' : 'error') : 'warning';
  emitSchemaDiagnostic(diagnostics, { code: 'unknown-property', ... });
```

`getAcceptedSchemaKeys`（shape-validation-utils.ts:34-64）只合并 `type`/`META_FIELDS`/`COMMON_EVENT_FIELDS`/`defaultSchema`/`propSchema`/`propContracts`/`fields`，不含 `onMount`/`onUnmount`。主循环中 `classifyField` 对 lifecycle 键返回 `kind: 'ignored'`（fields.ts:40-42），但 `inspectSchemaNodeFields` 没有 `ignored` 提前 continue，`onMount` 一路落到 unknown-property 检查。而同函数尾部（313-318 行）又把 onMount/onUnmount 当受支持的 lifecycle 字段做 action 校验——自相矛盾。

影响：任何声明了 `propSchema`/`propContracts`（closed-model，如 table/form/crud）或 strictMode 下的 renderer，schema 使用 `onMount` 时 `validate()`（validate 模式默认 `unknownBarePropertyPolicy: 'error'`）会产出 error 级 `unknown-property` 误报；而 `compile()` 正常编译该字段为 `lifecycleActions`。validate 结果与 compile 行为直接矛盾。现有测试 H47（contract-exploration-part2.test.ts:271）用的 containerRenderer 无 propContracts（非 closed-model），未覆盖此组合。

修复方向：`getAcceptedSchemaKeys` 加入 `onMount`/`onUnmount`，或在主循环对 `rule.kind === 'ignored'` 且属于 LIFECYCLE_KEYS 的键提前 continue；补 closed-model + onMount 的回归测试。

### F-03 renderer plugin 的 beforeCompile/afterCompile 按嵌套深度被重复应用（O(depth) 次）

`packages/flux-compiler/src/schema-compiler.ts:88`（每层递归入口）与 `:152/:193`（每层递归出口）

```ts
function compileSchemaToTemplateNodes(schema, options, depth = 0) {
  ...
  const prepared = applyBeforeCompilePlugins(schema);   // 每个 region 子树递归进来都先跑一遍
  ...
  const template = applyAfterCompilePlugins({ root: nodes, repeatedTemplates: new Map() });
```

region 编译回调（node-compiler.ts:193-194 `compileAtNextDepth → compileSchemaToTemplateNodes(depth+1)`）会再次进入同一函数。深度为 d 的节点，其所在子树会作为参数分别传入 depth 0..d 共 d+1 次 `applyBeforeCompilePlugins`/`applyAfterCompilePlugins`（beforeCompile 收到整棵含该节点的子树；afterCompile 收到含该节点的编译产物）。插件接口契约未声明"必须幂等"。

影响：非幂等插件（计数、注水印、包装节点、追加默认值等）的效果随深度叠加，产出与单次应用预期不同的编译产物，且随 schema 嵌套变化而变化——条件性正确性缺陷；同时这也是 F-05 性能冗余的组成部分。标 suspect：若现存插件全部幂等则暂无实际触发，但 API 层面无任何护栏或文档警示。

修复方向：仅在 depth === 0 时应用 before/after 插件（region 递归透传一个 `pluginsApplied` 标记或拆出内部递归入口）；或在 `RendererPlugin` 类型 JSDoc 上强制幂等契约并用断言防护。

### F-04 缺 formula/action 的 data-source 静默编译出 `action: undefined` 的动作程序；缺 actions 的 `<reaction>` 直接 TypeError 崩溃

`packages/flux-compiler/src/source-compiler.ts:69-86`、`reaction-compiler.ts:59-62`、`action-compiler.ts:233-235`

```ts
// source-compiler.ts
const isFormulaSource = 'formula' in schema && schema.formula !== undefined;
const isActionSource = !isFormulaSource;              // 两者皆缺 → 仍按 action source 处理
...
compiled.action = compileActions(actionSchema as ActionSchema, compiler, {...});  // action 为 undefined
// action-compiler.ts compileActions
const actionArray = Array.isArray(actions) ? actions : [actions];  // undefined → [undefined]
// reaction-compiler.ts
action: compileActions(schema.actions, compiler, {...}),            // actions 缺失 → [undefined] → compileActionNode 内 action.action 抛 TypeError
```

影响（两条路径）：

1. `{type:'data-source', name:'x'}`（formula/action 均缺）在默认 compile 模式（diagnostics 关闭）下不报错、不崩溃，产出 `CompiledActionProgram`，其节点 `action: undefined`——错误被推迟到运行时派发才以"unknown action undefined"形式远处爆炸。`inspectSchemaNodeFields` 的 `invalid-source-shape`（"requires exactly one of formula or action"，node-fields.ts:272-288）只在 diagnostics enabled 时发出，默认编译路径完全绕过。
2. `<reaction>` schema 缺 `actions` 时 `compileReaction` 在编译期直接抛 `TypeError: Cannot read properties of undefined (reading 'action')`——虽是 fail-loud，但无路径上下文、无诊断码，且 `validateReactionShape` 本可给出结构化诊断（仅 validate 模式生效）。

修复方向：`compileDataSource` 在 `!isFormulaSource && schema.action === undefined` 时发 `invalid-source-shape` 诊断并按 continueOnError 决定降级（如 `noop` 动作或 `createCompileFailureNode` 同类的占位）；`compileActions` 对 `undefined/null` 输入显式发诊断或抛带 path 的错误，而非依赖 TypeError。

## P2 风险

### F-05 编译管线按深度级冗余：每层递归重跑 prepareSchemaRoot/canonicalize + enrichTemplateNodeIds 全量 Map 拷贝，整体 O(N·D)

`packages/flux-compiler/src/schema-compiler.ts:88-98`、`authoring-transform.ts:38-105`、`target-enrichment.ts:56-121`

- 每个 region 子树递归进入 `compileSchemaToTemplateNodes` 都会执行 `prepareSchemaRoot → canonicalizeSchemaInput(subtree)`，而 canonicalize 自身递归整个子树（含其 region）。深度 D 的树上每个节点被 canonicalize 约 D 次（每次 `{...node}` 浅拷贝 + `classifyField` 全键分类）。
- `enrichTemplateNodeIds`（target-enrichment.ts:61-66）每次调用都复制 `byId`、`idPaths`（逐项 `[...value]`）、`duplicateIds`，并通过 `collectAllTemplateNodes` 重走整棵子树；子树级 enrich 的赋值随后又被根级 enrich 全部重写（templateNodeId 逐个重排、cidState 重 attach）。最终结果正确（根级 enrich 覆盖全树、id 全树唯一），但中间层级的工作全部作废。
- region 回调（node-compiler.ts:199-217）不透传 `cidState`，每层 `prepareSchemaRoot` 各自 `createCompiledCidState()`，加剧上述浪费。

影响：深嵌套 schema（如 10+ 层布局嵌套、大表单）编译时间随深度近似线性放大；schema 面积大时 Map 拷贝与重复分类成为热点。静态正确性无损。

修复方向：region 递归透传 cidState 与 canonicalize 结果（或拆出"已预备"的内部编译入口，跳过 prepareSchemaRoot）；enrichTemplateNodeIds 仅在根级执行一次。

### F-06 validate() 路径 authoringTransform 被应用两次，非幂等 transform 会使 validate 与 compile 结果漂移

`packages/flux-compiler/src/schema-compiler/validation-compiler.ts:44-66`

```ts
const canonicalPrepared = canonicalizeSchemaInput(schema, {...}, diagnostics);  // 第 1 次（含 authoringTransform）
try {
  compileSchemaToTemplateNodes(canonicalPrepared, {...});                        // 内部 prepareSchemaRoot 第 2 次 canonicalize
```

`compileSchemaToTemplateNodes` 内部再次 `prepareSchemaRoot → canonicalizeSchemaInput`，即 validate 一次调用中 `renderer.authoringTransform` 对同一内容执行两遍；compile 模式则是"每祖先层一遍"（见 F-03/F-05）。非幂等 transform（追加默认值、改写键名）下 validate 诊断针对的是二阶产物，与 compile 单遍语义不一致。

影响：validate 结果不能可靠代表 compile 输入；诊断路径失真。标 suspect（取决于各 renderer authoringTransform 的幂等性，未逐一核查全部 renderer）。

修复方向：validate 复用内部编译入口并跳过二次 canonicalize；或 compileSchemaToTemplateNodes 增加可选 `alreadyCanonical` 标记。

### F-07 `computeStaticAnalysis` 谓词不完整且产物全仓无消费者：`isStaticContent` 无人读取、`collectDependencies` 恒返 `[]`

`packages/flux-compiler/src/schema-compiler/static-analysis.ts:26-28, 51-111`

```ts
function collectDependencies(_node: TemplateNode): readonly string[] {
  return [];
}
```

- `isStaticContent` 的检查遗漏 `lifecycleActions`、`namedActionPlans`、`reactionPlans`、`structuralFields`——带 onMount 动作的节点仍可能被判为 static content。
- 全仓 grep：`isStaticContent` 仅出现在类型定义、flux-compiler 自身实现与自身测试中，flux-react/flux-runtime 无任何消费方；`StaticAnalysisResult.dependencies` 是恒空占位。

影响：每个节点编译期都计算一份无人消费的分析结果（D6 浪费 + D2 契约漂移：核心类型 `TemplateNode.staticAnalysis` 属"已发布但未接线"的表面）。若未来有人开始消费，谓词缺口（lifecycle 等未纳入）会立即变成正确性缺陷。

修复方向：要么接线（消费者出现前补全谓词），要么降级为 internal 并从 `TemplateNode` 公开类型中收编，删除占位函数。

### F-08 quick-reference 的 `CompiledTemplate` 形状与实际产物漂移；`repeatedTemplates` 恒为空 Map

`docs/references/quick-reference.md`（Compilation Types Summary）声明：

```ts
interface CompiledTemplate {
  nodes: TemplateNode[];
}
```

实际类型（flux-core `types/node-identity.ts:209-212`）为 `{ root: TemplateNode | readonly TemplateNode[]; repeatedTemplates: ReadonlyMap<...> }`；且 `schema-compiler.ts:154/195/222` 三处均硬编码 `repeatedTemplates: new Map()`——该契约字段从未被填充（D2 双向漂移：文档写错字段名，代码留死字段）。

影响：按 quick-reference 写 host 集成的开发者会取 `compiled.nodes` 得 undefined；`RepeatedTemplate` 能力形同虚设。

修复方向：修正 quick-reference；删除 `repeatedTemplates` 或明确其未实现状态（标注 @deprecated 或计划）。

### F-09 analyzeSchemaInput / collectComponentTargets / collectSchemaImportSpecs 递归无循环引用与深度守卫

`shape-validation-analyze.ts:287-307`（无 depth 参数）、`shape-validation-traversal.ts:21-55`、`symbol-helpers.ts:55-92`

```ts
// shape-validation-traversal.ts
for (const value of Object.values(schema)) {
  collectComponentTargets(value, out, registry); // 无 visited/depth 保护
}
```

compile 侧有 `MAX_COMPILE_DEPTH=64`（schema-compiler.ts:82-85，超限抛错）与 canonicalize 的 maxDepth 截断，但 validate/prepare 侧三条全树遍历对程序化构造的环形 schema（JSON 不可能、JS 对象引用可能）会栈溢出：validate 中被 `catch` 成一条 `unhandled-compilation-error`（"Maximum call stack size exceeded"，validation-compiler.ts:67-76）；`prepare()` 路径（collectSchemaImportSpecs）则直接崩溃无捕获。

影响：环形/自引用 schema（动态生成、设计器草稿等宿主场景）下 validate 退化成无路径信息的单条诊断、prepare 直接抛裸 RangeError。属防御缺口而非可触发于 JSON 的缺陷。

修复方向：三处遍历加 depth 上限（复用 MAX_COMPILE_DEPTH）或 visited Set（WeakSet）。

### F-10 schema-definition 区域提取的 fallback 分支把 region 引用写后即删，compiledKey 引用静默丢失

`packages/flux-compiler/src/schema-compiler/node-compiler-helpers.ts:258-279`

```ts
if (resolved.compiledKey) {
  if (resolved.compiledKey.includes('.')) {
    const owner = copyAlongPath(item, resolved.compiledKey);
    if (owner) {
      owner[resolved.compiledKey.split('.').pop() as string] = regionKey;
    } else {
      item[fieldKey] = regionKey;      // (A) 兜底写入
    }
  } else {
    item[resolved.compiledKey] = regionKey;   // (B) compiledKey === fieldKey 时写后即删
  }
} else {
  item[fieldKey] = regionKey;
}
...
} else if (resolved.compiledKey) {
  delete item[fieldKey];               // (A)/(B) 写入被此行撤销
}
```

影响：① dotted compiledKey 的中间节点不是 plain object 时（copyAlongPath 返回 undefined），兜底写入 `item[fieldKey]=regionKey` 随即被 `delete item[fieldKey]` 撤销——item 上无任何 region 引用，renderer 按 `item.<compiledKey>` 取值为 undefined，区域仍在 `regions` map 中但永远找不到；② `spec.regionKey === fieldKey`（元数据作者的天然笔误，两个键语义不同但同名）时 set+delete 同键，引用同样丢失。两处均无诊断。标 suspect：当前仓库内置 renderer 元数据未踩中此组合（table/crud 的 compiledKey 均与 fieldKey 不同名），但属公开元数据契约下的静默失效面。

修复方向：fallback (A) 分支去掉兜底写入或改为不删除；`regionKey === fieldKey` 时发 warning；补两条边界测试。

### F-11 公共 API `compileNode()` 不执行 enrichTemplateNodeIds：templateNodeId 恒 0、无 cidState、无 duplicate-id 检测

`packages/flux-compiler/src/schema-compiler.ts:228-262`

```ts
compileNode(schema, options) {
  ...
  return compileSingleNodeForExternal(canonicalSchema, {...}, diagnostics, 0);
  // 无 enrichTemplateNodeIds —— 对比 compile() 路径 schema-compiler.ts:151/175
}
```

`SchemaCompiler.compileNode` 是 flux-core `renderer-compiler.ts:58` 声明的公开契约。经其产出的 TemplateNode `templateNodeId` 保持字面量 0，`createNodeId` 冲突不检测、`attachCompiledCidState` 未执行。当前仓内无生产消费者（仅类型与测试使用），故降 P2；一旦 runtime/react 接线（如热更新子树替换），全 0 的 templateNodeId 会破坏"模板级节点身份"唯一性假设（docs/architecture/flux-core.md "internal-id baseline"）。

修复方向：compileNode 尾部补 `enrichTemplateNodeIds`（可用独立 cidState），或在该 API 的 JSDoc/类型上显式声明返回未富集节点。

## P3 提示

### F-12 fields.ts classifyField 事件启发式的 if/else 两分支完全相同（死代码）+ 线性扫描

`fields.ts:44-52`：`/^on[A-Z]/` 命中但不在 `COMMON_EVENT_FIELDS` 时，if 与 else 均 `return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' }`，注释宣称"走 unknown-property 检测"但代码无差异。另外 `renderer.fields?.find()` 每键线性扫、`buildMetaProgram` 对每个 META_FIELD 再调一遍 classifyField，O(F×K) 小常数浪费。建议删死分支、按 renderer 预构建 Map。

### F-13 buildMetaProgram 用 `value as any` 且不带 symbolTable/sourcePath

`fields.ts:83-88`：meta 表达式（when/visible/…）编译时不传 `symbolTable`（props 编译传，见 node-compiler.ts:348-353）也不传 `sourcePath`——meta 中的未解析符号（如 import alias）不做校验、诊断缺路径上下文，与 props 通道不一致。`as any` 顺带丢失类型检查。

### F-14 验证 pattern 的正则安全门不完整 + 库代码 console.warn

`validation-lowering.ts:216-241`：`isSafeValidationPattern` 拦截 `.*`/`.+`/嵌套量词/字符类量词，但不拦 `(a|a)*` 类交替+量词回溯灾难；解析失败走 `console.warn`（库内副作用，建议改走 diagnostics）。`compileValidationRules` 的 id `${path}#${index}:${rule.kind}` 依赖数组顺序，规则重排即变 id（当前无外部持久化依赖，可接受）。

### F-15 诊断码与消息复用错位

- `rules-action.ts:39-48`：`definition.argsRequired` 为通用检查，消息硬编码 `"ajax actions require args payload."`——其他动作声明 argsRequired 时消息错称 ajax。
- `rules-reaction.ts:233-271`：debounce/once/control 不支持均复用 code `invalid-reaction-immediate`。
- `host-action-validation.ts:140-148`：deprecated 方法用 code `unknown-host-capability-method`（warning），按 code 过滤的消费方会把弃用告警当未知方法。

### F-16 sendOn 空串/非法表达式静默降级

`source-compiler.ts:109-118`：`sendOn: ''` 包成 `${}` 交给 formula 编译必失败；compile 模式 diagnostics 关闭时 `reportDiagnostic` 被 emit 丢弃，按 flux-core 契约回退为 static 值——refresh 门控条件静默变成常量（truthy/falsy 取决于回退值）。建议空串先行拦截发诊断。

### F-17 isImportSpecCandidate 两处实现不一致；collectSchemaImportSpecs 遍历一切对象

`symbol-helpers.ts:8-10`（数组也通过）vs `node-compiler-helpers.ts:33-35`（排除数组）；`collectSchemaImportSpecs.visit` 深入所有属性对象（含 initialData 等纯数据），大 schema 上 prepare() 阶段有多余遍历（且见 F-09 无守卫）。建议统一谓词、只走 schema 状分支。

### F-18 boolean-like 契约对 readOnly/required 无默认强制

`constants.ts:1-11` META_FIELDS 不含 `readOnly`/`required`（BaseSchema 中为 `boolean | string`）。布尔归一化（`normalizeBooleanLikeCandidate`）只在 `rule.valueType === 'boolean'` 时应用——renderer 未显式声明 valueType 时 `"readOnly": "true"` 字符串原样进入 resolved props，违反 flux-core.md "boolean-like fields expose only boolean | undefined" 的架构契约。属"机制有、默认关"的声明性缺口。

### F-19 normalizeValidationTriggers/VisibilityTriggers 非法值静默丢弃

`validation-lowering.ts:154-181`：`validateOn: ['onBlur']`（拼错）被过滤后静默回退 `['blur']`，无诊断——作者拼写错误被默认值掩盖，表单触发时机悄然改变。建议对被过滤项发 warning。

### D8 结构核对（超 500 行文件 vs 注册红名单）

包内超 500 行文件 3 个：`schema-compiler/node-compiler-helpers.ts`（617，包内最大）、`schema-compiler/node-compiler.ts`（597，已在 `scripts/check-oversized-code-files.mjs` OVERSIZED_EXEMPTIONS 注册豁免并引用 Plan 444/AUDIT-01 决策）、`schema-compiler/flux-value-shape-validation.ts`（544）。均低于 ERROR_LINES=700，不构成未注册红；无新增违规。按 AGENTS.md "超 500 行应评估拆分"，node-compiler-helpers.ts 617 行值得列入下次拆分评估。

## 检查过程记录

1. **前置阅读**：`docs/architecture/flux-core.md`（编译产物契约：SchemaInput → TemplateNode → CompiledTemplate、cid/templateNodeId 基线、declarative lowering、boolean-like 契约）、`docs/references/quick-reference.md`（RendererComponentProps/字段三分层/SchemaFieldKind）；`packages/flux-compiler/package.json`（依赖仅 flux-core/flux-formula）。
2. **文件枚举**：`find packages/flux-compiler/src -name '*.ts' ! -name '*.test.*' ! -path '*__tests__'` → 41 文件 / 7734 行，与任务基线一致。
3. **全文精读**（24 个核心文件）：schema-compiler.ts、schema-compiler-helpers.ts、action-compiler.ts、source-compiler.ts、reaction-compiler.ts、validation-lowering.ts、compile-symbol-table.ts、index.ts、schema-compiler/{node-compiler, node-compiler-helpers, runtime-value-compilation, fields, diagnostics, authoring-transform, target-enrichment, static-analysis, validation-collection, validation-compiler, symbol-helpers, shape-validation-analyze, shape-validation-traversal, shape-validation-node-fields, flux-value-shape-validation, shape-validation-utils, shape-validation-predicates, shape-validation-rules-\*, host-action-validation, action-selector-validation, shape-validation, index}。
4. **契约核对**（flux-core 侧）：`createTemplateRegion`（确认为急切编译，regions 无 lazy 缺口）、`createNodeId`（schema.id 优先 + path 净化，duplicate 由 enrich 检测）、`shallowEqual`（数组/对象逐槽 Object.is）、`attachCompiledCidState`（Symbol 非枚举）、`CompiledTemplate`/`DataSourceSchema`/`ReactionSchema`/`META_FIELDS`/`COMMON_EVENT_FIELDS` 类型与常量、`MAX_COMPILE_DEPTH` 语义（compile 抛错 vs canonicalize 静默截断）。
5. **模式扫描**（grep 全 src，排除 test）：`as any`（2 处：fields.ts:83、prop-coverage.test-support）、`@ts-ignore/@ts-expect-error`（0）、空 catch（0；3 处 catch 均有处理）、非空断言 `!`（3 处，均已核实安全）、TODO/FIXME（0）、JSON.parse/structuredClone（0）、console.\*（1 处 console.warn）、new Map/Set 缓存点（无跨调用编译缓存，enrich 的 Map 拷贝见 F-05）。
6. **反误报验证**：reaction watch 行为对照 `reaction-compiler.test.ts`（rx-2/rx-3b 固化分裂行为 → F-01 定 P1 而非 P0）；onMount 误报对照 `schema-compiler-contract-exploration-part2.test.ts` H47/H48（其 fixture 非 closed-model，未覆盖缺陷组合 → F-02 成立）；`isStaticContent` 全仓 grep（仅类型+自测试 → F-07）；`compileNode` 消费方 grep（无生产消费者 → F-11 降 P2）；compileDataSource "缺 action 崩溃"假设经逐行重推推翻（传入的是 schema 对象本身，不崩、产出 action:undefined 程序 → F-04 路径 1）；`createTemplateRegion` 急切编译排除"lazy region 漏编/validation 漏采"假设。
7. **不可变性核对**：canonicalize（copy-on-write `{...node}`）、classifySchemaDefinitionValue/extractSchemaDefinitionRegion（record 浅拷贝 + copyAlongPath 写时复制）、compileSingleNode（只读 schema）——输入 schema 不被编译过程修改（renderer 自带 authoringTransform 除外，属其自身契约）；仅 F-10 的 fallback 分支存在"写后即删"的引用丢失。
8. **D8**：对照 `scripts/check-oversized-code-files.mjs`（WARN=500/ERROR=700 + OVERSIZED_EXEMPTIONS 注册表）。
9. **限制**：只读审计，未运行 typecheck/build/test/pnpm（主会话基线运行中）；未核查全部 renderer 包的 authoringTransform/fields 元数据幂等性（F-03/F-06/F-10 的触发条件依赖具体元数据，已标 suspect）；flux-formula 表达式/内插解析（`${}` 边界、转义）不在本包范围，仅审到 compiler 侧的包装点（sendOn/watch）。
