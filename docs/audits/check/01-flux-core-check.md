# 01 flux-core 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-core/src/` 全部 58 个非测试源文件（排除 `*.test.*` 与 `__tests__/`），共 7460 行。全部文件已通读；实现逻辑文件（path/value-adapter/contract-honesty/validation-model/strict-mode/url 等）逐行精读，纯类型文件做契约比对。
- 结论概览：**P0 x0 / P1 x2 / P2 x3 / P3 x11**。总评：flux-core 整体质量高——纯函数风格纪律严明、原型污染防护（`DANGEROUS_PATH_SEGMENTS`）成体系、无空 catch、无 `as any`/`@ts-ignore`、无 eval/new Function、环引用防护到位；两条 P1 分别是 `isSafeNavigationUrl` 的前导空白绕过（安全守卫失效路径）和 `shallowEqual` 对 Date 等无 own-key 对象的恒等误判（会经 `flux-runtime/node-runtime.ts` 的 props 复用链造成旧值滞留 UI），均已在真实调用路径上验证成立。

## P0 缺陷

无。未发现无条件即触发的错误行为。两条最接近的缺陷（F-01/F-02）均需特定输入条件（数据绑定注入畸形 URL / props 顶层值为 Date 类对象），按严重级别定义归入 P1。

## P1 隐患

### F-01 `isSafeNavigationUrl` 前导空白/控制字符绕过（XSS 守卫失效）

- 位置：`packages/flux-core/src/utils/url.ts:23-29`
- 证据：

```ts
export function isSafeNavigationUrl(url: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (!match) {
    return true; // ← 无 scheme 匹配一律判"安全"（视为相对路径）
  }
  return SAFE_NAVIGATION_SCHEMES.has(match[1].toLowerCase() + ':');
}
```

- 问题：正则以 `^` 锚定，字符串携带前导空格/制表符/换行（WHATWG URL 规范中的 "leading C0 control or space"）时不匹配任何 scheme，函数返回 `true`（按相对路径放行）。但浏览器在解析 `<a href>` 时会**先剥除前导 C0 控制字符与空格再解析 scheme**，因此 `" javascript:alert(1)"`、`"\tjavascript:alert(1)"` 在点击时仍按 `javascript:` 执行。已实测验证：`/^([a-z][a-z0-9+.-]*):/i.exec(' javascript:alert(1)')` 与 `exec('\tjavascript:alert(1)')` 均返回 `null`。
- 影响链（输入→路径→后果）：schema 数据绑定的 href（如 `${item.link}`，`item.link` 来自 API/用户数据）携带前导空白的 `javascript:` URL → `packages/flux-renderers-content/src/link.tsx:29-33` 与 `packages/flux-renderers-basic/src/button.tsx` 用本函数判安全后原样输出到 `<a href>` → 点击在页面自身 origin 执行任意脚本。这正是该函数存在要防御的场景（`docs/architecture/flux-core.md` § URL Safety Utility 声明 "can never execute script in the current page context on click"），守卫承诺被打破。React 对 `javascript:` href 仅 console.warn，不阻断。
- 修复方向：匹配前先剥除前导/尾随 C0 控制字符与空白（`url.replace(/^[\x00-\x20]+/g, '')` 或等效 trim）再做 scheme 判定；顺带覆盖全角/不可见字符等浏览器宽容解析变体。补一条带前导空白 payload 的回归测试。

### F-02 `shallowEqual` 对无 own-enumerable-key 的对象（Date/RegExp/Map/Set 等）恒判相等，props 复用链滞留旧值

- 位置：`packages/flux-core/src/utils/object.ts:32-63`（分支 L53-62）
- 证据：

```ts
const leftKeys = Object.keys(left);
const rightKeys = Object.keys(right);

if (leftKeys.length !== rightKeys.length) {
  return false;
}

return leftKeys.every((key) =>
  Object.is((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]),
);
```

- 问题：两个不同内容的 Date（或 RegExp、Map、Set、无字段 class 实例）`Object.keys()` 长度均为 0，`0 === 0` 通过后 `every` 对空数组返回 `true`，函数判定"相等"。已实测确认：`new Date(1000)` 与 `new Date(2000)` 的 own keys 均为 0。该函数自 flux-core 公共导出（`src/index.ts:27`），下游 17+ 文件使用。
- 影响链：关键消费点 `packages/flux-runtime/src/node-runtime.ts:317-322` 用 `shallowEqual(lastProjectedValue, finalValue)` 决定是否复用上一次 props 引用（`reusedReference: true, changed: false`）。当某个 prop 的**顶层值**是 Date 类对象且 scope 更新后求值产生新值（不同时间戳的新 Date 实例）时：shallowEqual 误判相等 → 复用旧值 → `changed: false` → React 层不重渲染，UI 持续显示过期数据（如日期选择联动、图表时间窗口）。注意仅顶层值直接是 Date 时触发；嵌套在普通对象内的 Date 走 `Object.is` 引用比较反而判不等（会更新）。触发条件：host 通过 `env.data`/scope 注入 JS Date（无类型约束阻止），schema 用 `${expr}` 求值为该 prop。
- 修复方向：在对象分支前加内建对象判别——对 `left instanceof Date && right instanceof Date` 用 `getTime()` 比较（RegExp 用 `toString()`，Map/Set 用 size+逐项），或对"keys 长度为 0 但 `Object.prototype.toString` 标签非 `[object Object]`"的输入直接返回 `Object.is` 结果。同时在 JSDoc 标注该函数仅适用于 plain object/array 一层浅比较。

## P2 风险

### F-03 相对依赖 rebase 漏掉 `..` 精确值，dependents 映射键不可命中（suspect）

- 位置：`packages/flux-core/src/validation-model.ts:102-104`
- 证据：

```ts
const resolvedPath = dependencyPath.startsWith('../')
  ? resolveRelativePath(path, dependencyPath)
  : dependencyPath;
```

- 问题：`resolveRelativePath`（`utils/path.ts:143-146`）自身支持 `remaining === '..'` 的精确父路径形式，但这里（以及下游 `packages/flux-runtime/src/validation/validators.ts:209/225/241/254` 的四处 `rule.path?.startsWith('../')`）只识别 `'../'` 前缀。当 `CompiledValidationRule.dependencyPaths` 中出现精确 `'..'`（来自 `equalsField`/`requiredWhen` 等规则的 `path: '..'`）时：(a) dependents map 以字面 `'..'` 为键，而 `getCompiledValidationDependents(model, path)` 的调用方传真实解析后路径，永不命中 → 联动重校验静默丢失；(b) validators 侧 `getIn(scope, '..')` 因 `parsePath('..')` 产出空段而返回整个 scope 对象，比较语义混乱。
- 影响：条件苛刻（作者须写 `path: '..'`），但一旦发生无任何 diagnostic，表现为"改了父级数据、依赖校验不刷新"。标 suspect：`'..'` 精确值在现有 schema 语料中可能不存在。
- 修复方向：判定条件改为与 `resolveRelativePath` 前置守卫一致（`startsWith('../') || === '..'`），四处调用点统一；或在编译期对 `'..'` 精确依赖发出 `invalid-reaction-deps` 类 diagnostic 明确拒绝。

### F-04 `NodeMetaProgram`/`ResolvedNodeMeta` 的 `when`/`frameWrap` 字段未列入架构文档契约（D2 漂移）

- 位置：`packages/flux-core/src/types/node-identity.ts:104-114`、`packages/flux-core/src/types/resolved-node-types.ts:7-19`、`packages/flux-core/src/constants.ts:1-11`
- 证据：

```ts
export type NodeMetaProgram = {
  id?: ...; className?: ...; frameClassName?: ...;
  when?: CompiledRuntimeValue<boolean | unknown>;      // ← 文档未列
  visible?: ...; hidden?: ...; disabled?: ...; testid?: ...;
  frameWrap?: CompiledRuntimeValue<boolean | 'label' | 'group' | 'none' | undefined>;  // ← 文档未列
};
```

- 问题：`docs/architecture/flux-core.md`（ResolvedNodeMeta 列表）与 `docs/references/terminology.md`（NodeMetaProgram 条目）均声明 meta 字段集合为 `id, className, frameClassName, visible, hidden, disabled, testid`（+ resolved 的 `changed, cid`），代码实际多出 `when` 与 `frameWrap`，且 `META_FIELDS` 常量（含 `when`/`frameWrap`）与代码一致——即代码内部自洽、文档滞后。按 `source-of-truth-and-precedence` 的口径，以文档为契约做审计/写渲染器的一方会漏消费这两个字段；反向也会让"meta 字段白名单"类校验误报。
- 影响：契约面漂移，误导消费方与后续审计；`frameWrap` 已参与 FieldFrame 包装语义（`renderer-definition-types.ts:96-102`），文档不提会导致渲染器作者绕过该机制。
- 修复方向：更新 `flux-core.md` 与 `terminology.md` 的字段清单补上 `when`、`frameWrap`（以及 resolved 形态的语义）；或在文档中显式声明"列表为最小集，以 `node-identity.ts` 为准"。

### F-05 `isPlainObject` 将 class 实例判定为 plain object，`setIn` 会静默剥离其原型（suspect）

- 位置：`packages/flux-core/src/utils/object.ts:1-3`，消费点 `packages/flux-core/src/utils/path.ts:217-223`
- 证据：

```ts
export function isPlainObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]';
}
```

```ts
    const next = cursor[segment];
    const nextClone = Array.isArray(next)
      ? [...next]
      : isPlainObject(next)          // class 实例命中此分支
        ? { ...next }                // spread 丢原型与方法
        : ...
```

- 问题：`Object.prototype.toString` 对任何未自定义 Symbol.toStringTag 的 class 实例都返回 `'[object Object]'`，与字面量对象不可区分（lodash `isPlainObject` 通过原型链判别会排除它们）。`setIn` 中间节点是 class 实例时走 `{ ...next }` 浅拷贝，原型方法与 getter 语义被静默丢弃，返回结构替换原值；`isSchema`（`utils/schema.ts:4-6`）同理会把带 `type` 字符串属性的 class 实例当 BaseSchema。
- 影响：scope 数据由 host 注入任意 JS 值（无 schema 约束），若路径穿越 class 实例（如 ORM row、URLSearchParams 包装对象），写路径产生数据损坏且无报错。概率低（生态内 scope 数据以 JSON 形状为主），标 suspect。
- 修复方向：判别收紧为 `Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null`；或在 `setIn` 的 spread 分支保留 `Object.create(Object.getPrototypeOf(next))` + assign。收紧前需回归全仓库使用点（本函数是基础设施，行为变更面大，建议先只加测试锚定现状）。

## P3 提示

### F-06 `numberAdapter`/`toPositiveNumber`：`Number()` 强转的边界（Symbol throw、十六进制字符串静默解析）

- 位置：`packages/flux-core/src/value-adapter.ts:234-249`、`packages/flux-core/src/utils/object.ts:13-16`
- 证据：

```ts
    in(value: unknown) {
      if (value == null || value === '') return undefined;
      if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
      const parsed = Number(value);   // Symbol → TypeError；'0x10' → 16；'1e3' → 1000
```

- 问题与影响：`Number(Symbol())` 直接 throw TypeError（未捕获，沿表单值适配链上抛）；`Number('0x10')` 返回 16、`Number('Infinity')` 返回 Infinity（`Number.isFinite` 未检查，会流入数值 prop）。用户在数字字段输入 `0x10` 被静默改写。
- 修复方向：对 `typeof value === 'symbol'`/`'bigint'` 显式短路返回 undefined；字符串解析改用 `const parsed = /^\s*-?\d+(\.\d+)?([eE][+-]?\d+)?\s*$/.test(value) ? Number(value) : NaN` 一类的十进制白名单，并补 `Number.isFinite` 检查。

### F-07 `booleanStringAdapter.in` 对非字符串走 `Boolean()` truthiness

- 位置：`packages/flux-core/src/value-adapter.ts:193-203`
- 证据：

```ts
    in(value) {
      if (typeof value === 'string') return value === 'true';
      return Boolean(value);   // [] → true, 'yes' 之外的 truthy 均为 true
    },
```

- 问题与影响：`in([])`、`in('1')` 之外的 truthy 值（如空数组）映射为 `true`，与架构文档 "runtime never applies JavaScript truthiness coercion to boolean-like fields" 的基调相悖。属 legacy 兼容 adapter（`booleanMappingAdapter` 的 JSDoc 已声明新版语义），但本函数 JSDoc 未标注此例外，容易在新代码中误用。
- 修复方向：至少补 JSDoc 声明 truthiness 行为与迁移指引到 `booleanMappingAdapter`；理想情况下 `in` 对非布尔非字符串输入返回 `undefined`（与 boolean-like 契约一致）。

### F-08 `normalizeHiddenFieldPolicy` 尾行死三元

- 位置：`packages/flux-core/src/validation-model.ts:32`
- 证据：

```ts
return Object.keys(policy).length > 0 ? policy : {};
```

- 问题与影响：两分支等价（policy 为空对象时 `: {}` 与 `policy` 相同），条件无效果，徒增阅读成本。
- 修复方向：直接 `return policy;`。

### F-09 `reportImportFailure` 死参数：`imports`/`nodeId`/`path`/`reason`/`phase` 全部未使用

- 位置：`packages/flux-core/src/utils/import-failure.ts:15-31`
- 证据：

```ts
export function reportImportFailure(input: {
  env: RendererEnv; error: Error;
  imports?: readonly XuiImportSpec[]; nodeId?: string; path?: string;
  message?: string; phase?: ...; reason?: string;
}): Error {
  const error = markImportErrorReported(input.error);
  const message = input.message ?? error.message;
  input.env.notify('error', message);   // ← 其余字段无人消费
  return error;
}
```

- 问题与影响：五个参数收了不用，调用方以为上报了定位信息实际没有；`ErrorMonitorPayload` 类型（`types/renderer-api.ts:166-172`）成为死契约。注释表明 monitor 已移除、字段"保留兼容"（`runtime-host-reporting.ts:9` 有同类声明），但本函数连 JSDoc 说明都没有。
- 修复方向：按 feature-deprecation 流程标注 `@deprecated` 收缩签名，或补注释声明兼容占位；顺带评估调用方是否可迁移到 `reportRuntimeHostIssue`。

### F-10 `createTemplateRegion` 调用 `validateRegionParams` 永不传 collector，collector 分支从主路径不可达

- 位置：`packages/flux-core/src/nested-regions.ts:72`
- 证据：

```ts
if (regionMeta?.params) {
  validateRegionParams(regionMeta.params, path); // ← 无第三参
}
```

- 问题与影响：`validateRegionParams` 设计了 collector 可选参（diagnostic 通道），但 `createTemplateRegion` 这个包内唯一生产调用点不传，参数非法时总是 throw；实际走 collector 通道的只有 `flux-compiler/shape-validation-analyze.ts` 两处直接调用。两条路径行为分叉（同错误一边 throw 一边 collect）但函数签名暗示统一。
- 修复方向：`createTemplateRegion` 接受并透传 collector（签名已有 `compileSchema` 的 options 可携带），或删减 collector 分支统一为 throw + 文档声明。

### F-11 `parsePath` 容错行为三则：trim 吞空格、引号 bracket 无转义、异形 bracket 并入段名

- 位置：`packages/flux-core/src/utils/path.ts:44-79`、`96-98`
- 证据：

```ts
      const closePos = path.indexOf(quote + ']', i + 2);  // key 内含 `"]` 时提前截断
      ...
      current += ch;   // 异形 bracket（如 a[b]）把 '[' 并入段名，最终段为 'a[b]'
      ...
  if (current) {
    segments.push(current.trim());   // 非引号段一律 trim
  }
```

- 问题与影响：(a) 非 quoted segment 一律 `trim()`，键名本身带前导/尾随空格（JSON key 合法）被静默改写；(b) quoted bracket 用 `indexOf(quote + ']')` 找闭合，key 内出现 `"}` 序列时提前截断、无转义语法；(c) `a[b]`（非数字非引号）把 `[`/`]` 当普通字符并入段名 `a[b]`。三者均无 diagnostic，畸形 path 静默解析成错误 segments，表现为"取不到值"而非报错。
- 修复方向：保持容错的同时在开发态（`isStrictValidationEnabled()`）对上述三类输入发 warning diagnostic；quoted bracket 至少支持 `\\` 与 `\"` 转义或对截断情形降级为整段字面量并告警。

### F-12 两个纯类型文件超 500 行 WARN 阈值（未查到豁免注册）

- 位置：`packages/flux-core/src/types/runtime.ts`（572 行）、`packages/flux-core/src/types/actions.ts`（543 行）
- 问题与影响：`scripts/check-oversized-code-files.mjs` 的 WARN_LINES=500 / ERROR_LINES=700，两文件超 WARN 未超 ERROR，仓库未见 flux-core 豁免注册（豁免清单中无 flux-core 条目），`pnpm check` 会持续报 WARN。均为接口聚合文件（`runtime.ts` 混合 Form/Surface/DataSource/Validation 四族 API），后续按族拆分即可消化。
- 修复方向：拆 `runtime.ts` 为 form-store-types / surface-types / data-source-types / validation-scope-types；拆 `actions.ts` 的 action context 仿真类型（`ActionContextRuntime` 等 local type）到独立文件。

### F-13 深递归无显式深度上限（依赖输入深度兜底）

- 位置：`packages/flux-core/src/validation-model.ts:130-146`（`visit`）、`packages/flux-core/src/schema-diagnostics/value-shape-runtime.ts:87-140`（`matchesFluxValueShape`）、`packages/flux-core/src/class-aliases.ts:1-32`
- 证据（validation-model）：

```ts
  function visit(path: string) {
    const node = nodeMap[path];
    if (!node || seen.has(path)) { return; }
    seen.add(path);
    ...
    for (const childPath of node.children) {
      visit(childPath);   // 深度 = schema 树深
    }
  }
```

- 问题与影响：三处递归均有环防护（`seen`/`visited`），但无深度上限；病态深嵌套 schema（数千层容器）编译时栈溢出。实际风险低——JSON.parse 自身先在同量级深度溢出，且编译器产出的 children 图深度受 schema 层级约束。
- 修复方向：可不改；若要加固，`visit` 改显式栈迭代，`matchesFluxValueShape` 加 `depth` 参数上限（如 200）超出返回 false + diagnostic。

### F-14 错误消息硬编码英文，i18n-sink 未覆盖编译/守卫层错误

- 位置：`packages/flux-core/src/nested-regions.ts:24/41/86`、`packages/flux-core/src/registry.ts:5/17/29`、`packages/flux-core/src/utils/path.ts:200` 等
- 证据：

```ts
const message =
  `Region ${regionPath} declares reserved param name "${name}". ` +
  'Names starting with "$" are reserved for slot-frame metadata.';
```

- 问题与影响：D7 维度下全包错误文案为英文硬编码。这些是 schema 作者/开发者可见的编译与注册错误，非终端用户文案，走 `getMessageFormatter()`（仅 validation message 层消费）的必要性低，现状可接受；但若低代码平台将编译 diagnostic 透传给最终作者（可视化编辑器场景），将出现未国际化文案。
- 修复方向：维持现状即可；若编辑器透传场景出现，将 `SchemaDiagnostic.message` 的构造接入 i18n-sink。

### F-15 `cancelPendingDebounce` 以 `resolve(undefined as T)` 结束在途 Promise，类型契约未标注

- 位置：`packages/flux-core/src/utils/debounce.ts:12-17`
- 证据：

```ts
const previous = pendingMap.get(key);
if (!previous) return false;
clearTimeout(previous.timer);
previous.resolve(resolveWith as T); // resolveWith 缺省时 resolve(undefined)
```

- 问题与影响：被新调度取消的旧 Promise 以 `undefined` 兑现，`T` 不含 `undefined` 时是类型谎言；调用方（flux-runtime 的异步验证/轮询）若不检查 undefined 会把"已取消"当"结果为空"。当前调用方未发现问题，但契约靠约定不靠类型。
- 修复方向：签名改为 `resolveWith: T | undefined` 并在 JSDoc 明确"取消即 undefined"，或返回带 `{cancelled: true}` 标记的判别联合。

### F-16 `constants.ts` 的 import 语句位于文件中部；`runtime.ts` 一处缩进错位

- 位置：`packages/flux-core/src/constants.ts:23`、`packages/flux-core/src/types/runtime.ts:337`
- 证据（constants.ts）：

```ts
export const COMMON_EVENT_FIELDS = new Set([...]);
                                            // ← 空行
import type { SchemaFieldKind, SchemaFieldRule } from './types/schema.js';
```

- 问题与影响：ESM hoisting 使中部 import 合法且 type-only 编译后消失，但违反常规排版并会触发部分 lint 规则的历史告警风险；`runtime.ts:337` 的 `  surface:` 缩进比同级少两格，纯格式噪音。
- 修复方向：import 上移文件头；缩进对齐（格式化器可自动处理，走 pre-commit hook 即可）。

## 检查过程记录

### 已通读文件（58/58，非测试源文件全集）

- 根级实现：`class-aliases.ts`、`compiled-cid.ts`、`constants.ts`、`contract-honesty.ts`、`i18n-sink.ts`、`index.ts`、`named-action-provider.ts`、`nested-regions.ts`、`registry.ts`、`runtime-inspection.ts`、`strict-mode.ts`、`validation-model.ts`、`value-adapter.ts`
- `schema-diagnostics/`：`index.ts`、`manifest.ts`、`value-shape-runtime.ts`
- `types/` 全部 25 个文件（`actions.ts`、`async-governance.ts`、`compilation.ts`、`compiled-renderer-contract.ts`、`compiled-value-types.ts`、`component-handle-core.ts`、`expression-env-types.ts`、`index.ts`、`node-identity.ts`、`render-fragment-types.ts`、`renderer-api.ts`、`renderer-authoring-contract.ts`、`renderer-component.ts`、`renderer-core.ts`、`renderer-definition-types.ts`、`renderer-hooks.ts`、`renderer-plugin.ts`、`renderer.ts`、`resolved-node-types.ts`、`runtime.ts`、`schema-base-types.ts`、`schema-diagnostics-types.ts`、`schema-validation-types.ts`、`schema.ts`、`scope.ts`）
- `utils/` 全部 13 个文件（`array.ts`、`debounce.ts`、`import-failure.ts`、`instance-path.ts`、`object.ts`、`path-binding.ts`、`path.ts`、`renderer-env.ts`、`runtime-host-reporting.ts`、`schema.ts`、`url.ts`、`validation-utils.ts`）
- `workbench/`：`index.ts`、`types.ts`；另 `src/types.ts`（2 行 barrel）

精读重点（逐行）：`utils/path.ts`、`utils/object.ts`、`utils/url.ts`、`value-adapter.ts`、`validation-model.ts`、`contract-honesty.ts`、`strict-mode.ts`、`schema-diagnostics/value-shape-runtime.ts`、`utils/debounce.ts`、`class-aliases.ts`、`nested-regions.ts`。

### grep 扫描模式（均排除 `*.test.*` 与 `__tests__/`）

- 空/可疑 catch：`catch\s*(\(|\{)` → 5 处，逐一核对（`strict-mode.ts` x3 有意吞 localStorage/URL/import.meta 异常并注释；`value-adapter.ts:382`、`utils/debounce.ts:34` 均转换错误为结果，非吞没）
- `JSON.parse` / `new Function` / `eval(` / `@ts-ignore` / `@ts-expect-error` / `as any` / `as unknown as` → 实现代码零命中（仅 `renderer-api.ts:125` 一处受控 `as unknown as` 用于 V8 `captureStackTrace` 能力探测，类型收窄合理）
- `TODO|FIXME|HACK|XXX` → 零命中
- 非空断言 `!` → 仅 `contract-honesty.ts:344/382` 两处，均为 Map.has 预检后的紧邻取值，安全
- `new Date|Date.parse|toLocale|toISOString` → 零命中（本包不做日期解析）
- `new RegExp` → 6 处全在 `contract-honesty.ts`（test-time 静态分析工具，均经 `escapeRegExp` 转义）
- 递归函数：`validation-model.ts visit`、`value-shape-runtime.ts matchesFluxValueShape`、`class-aliases.ts resolveClassAliases`（均有防环，见 F-13）
- 文件行数核对：`wc -l` 全量枚举，>500 行者 `types/runtime.ts`(572)、`types/actions.ts`(543)，与 `scripts/check-oversized-code-files.mjs` 阈值（WARN 500 / ERROR 700）及豁免清单比对，无 flux-core 注册项

### 反误报交叉验证

- F-01：`node -e` 实测正则对 `' javascript:alert(1)'`、`'\tjavascript:alert(1)'` 均不匹配；核对 `packages/flux-renderers-content/src/link.tsx:29-60`（判安全后原样输出 `href={...}`）与 `packages/flux-renderers-basic/src/button.tsx` 的消费方式
- F-02：实测两个不同时间戳 Date 的 `Object.keys` 长度均为 0；核对公共导出（`src/index.ts:27`）与下游 17 个消费文件，定位关键链 `packages/flux-runtime/src/node-runtime.ts:317-322`（props 复用判定）
- F-03：追溯 `dependencyPaths` 生成源 `packages/flux-compiler/src/validation-lowering.ts:183-192`（来自 `rule.path` 与 extraDependencyPaths）及 `packages/flux-runtime/src/validation/validators.ts:209-255` 的四处 `startsWith('../')` 同型判定，确认 `'..'` 精确值在整条链上均漏处理；因触发需作者显式写 `path: '..'`，标 suspect
- F-10：全仓库 grep `validateRegionParams` 调用点，确认 collector 通道仅 `flux-compiler/shape-validation-analyze.ts:453/515` 使用
- F-12：核对 `scripts/check-oversized-code-files.mjs` 阈值与豁免名单中无 flux-core 条目
- `resolveRelativePath` 文档示例（`items.0.field` + `../sibling` → `items.0.sibling`）、根越界（`resolveRelativePath('a','..')` → `''`，`getIn(x,'')` 返回 `x`）、`setIn` 数字中间段建数组、`moveArrayValue` clamp 语义、`decorateRendererEnv` 各 hook 透传、`markSyncAdapter` 同步标记传播、`createPathBinding` 前缀点号防前缀混淆（`items` vs `itemsX`）等均验证无问题，未上报

### 维度覆盖结论

- D1 正确性：F-01、F-02、F-06、F-11
- D2 契约合规：F-04、F-07（boolean-like truthiness 基调）、F-10
- D3（本包无 React；映射为资源清理/闭包）：`debounce` 的 timer/entry 清理正确，`i18n-sink` 为文档化例外单例，无闭包陷阱发现
- D5 错误处理：无空 catch、无 JSON.parse 无守卫（本包不直接 JSON.parse）；F-13（递归深度）
- D6 性能：`parsePath` LRU（insert-time 提升，读命中不提升，属可接受近似）、无热路径 O(n²)；contract-honesty 的正则构造仅 test-time，未上报
- D7 i18n：F-14（developer-facing，现状可接受）
- D8 结构：F-12（超限两文件）、F-08/F-09（死代码）
