# 开放式对抗性审查 — 2026-05-06 — 第三轮

> 本轮深入 formula 表达式系统和核心工具函数。

---

## 发现 1：Pipe 语法重写器与按位 OR (`|`) 冲突 — `${5 | 3}` 被错误重写为 `3(5)`

**在哪里**

- `packages/flux-formula/src/compile/pipe-syntax.ts:95-103`（重写逻辑）
- `packages/flux-formula/src/compile/formula-compiler.ts:114`（调用入口）

**是什么**

`rewriteFilterPipeSyntax` 在词法分析之前对源码做预处理，把所有顶层（depth=0）的单竖线 `|` 当作管道运算符。`${5 | 3}` 被重写为 `3(5)`（调用数字 3 作为函数），运行时报 "Call target is not a function"，而不是返回正确的按位 OR 结果 `7`。

词法分析器和解析器都完整支持按位 OR，但编译器入口的管道预处理使其不可用。错误信息与真实原因完全无关，用户极难诊断。**管道重写只处理第一个 `|`**，链式管道 `a | f1 | f2` 被重写为 `f1 | f2(a)`，也不按预期工作。

用户必须用括号 `${(5 | 3)}` 包裹才能绕过。

**为什么值得关心**

按位 OR 在权限掩码（`flags | 0x01`）场景中是合理需求。错误信息完全不指向真实原因，debug 成本极高。

**信心水平**：确定

---

## 发现 2：`+` 运算符允许字符串拼接，其他算术运算符都强转 Number — 类型系统不一致

**在哪里**

- `packages/flux-formula/src/evaluator.ts:59`（`+` 不转换）
- 同文件 `:61-69`（`-`/`*`/`/`/`%`/`**` 都用 `Number()` 转换）

**是什么**

```ts
case '+':
  return (left as any) + (right as any);  // "2" + 3 = "23"
case '-':
  return Number(left) - Number(right);     // "2" - 3 = -1
```

`+` 使用原生 JS 行为允许字符串拼接，而所有其他算术运算符显式 `Number()` 转换。结果：`price + 1` 当 price 为 `"10"` 时得到 `"101"` 而非 `11`。

**为什么值得关心**

低代码场景中，API 返回的数据类型不可预测。用户写 `fieldA + fieldB` 时可能无意中触发字符串拼接，且因为其他运算符都做类型转换，用户会形成"公式自动处理类型"的错误预期。

**信心水平**：确定

---

## 发现 3：比较运算符 `<`/`>` 不做 Number 转换 — `"10" < "2"` 返回 `true`

**在哪里**

- `packages/flux-formula/src/evaluator.ts:71-78`

**是什么**

比较运算符使用 JS 原生比较，不做类型转换。`"10" < "2"` 返回 `true`（字典序），而用户几乎一定期望 `10 < 2` 即 `false`。

**为什么值得关心**

当 scope 数据中的数值以字符串形式存储时（API 返回的 `"price": "99"`），条件判断 `${price < 100}` 会使用字典序，得到错误结果。

**信心水平**：确定

---

## 发现 4：公式编译失败静默回退为原始字符串 — UI 显示 `${typo_here +}`

**在哪里**

- `packages/flux-formula/src/compile/compile-node.ts:59-69`

**是什么**

表达式编译失败时，`compileNode` 捕获异常并返回 `static-node` 将原始字符串作为最终值。`${typo_here +}` 编译失败后，UI 上显示的是原始字符串 `"${typo_here +}"` 而不是错误提示。如果调用方没有提供 `reportDiagnostic` 回调，错误被完全吞掉。

**为什么值得关心**

schema 开发者在调试表达式错误时，看到的是原始字符串而非任何错误指示。开发体验极差。

**信心水平**：确定

---

## 发现 5：自定义相等语义：`0 == -0` 返回 `false`，`NaN == NaN` 返回 `true`

**在哪里**

- `packages/flux-formula/src/builtins.ts:17-39`

**是什么**

`==` 和 `===` 都使用 `customEquals`（基于 `Object.is`），语义既不同于 JS `==` 也不同于 JS `===`。`0 == -0` 返回 `false`（JS 中两种都返回 `true`），`NaN == NaN` 返回 `true`（JS 中两种都返回 `false`）。`==` 和 `===` 行为完全相同，`===` 运算符存在价值令人困惑。

**为什么值得关心**

`0 == -0` 返回 `false` 几乎肯定会出乎用户预期。公式语言中有两个功能相同的相等运算符增加了认知负担。

**信心水平**：确定

---

## 发现 6：`shallowEqual` 对 Date 等特殊对象比较不正确

**在哪里**

- `packages/flux-core/src/utils/object.ts:37-43`

**是什么**

`shallowEqual` 对两个 Date 对象，`Object.keys(new Date())` 返回 `[]`，键长度都为 0，所以返回 `true`——即使两个日期完全不同。

```ts
shallowEqual(new Date('2024-01-01'), new Date('2025-01-01')); // 返回 true！
```

**为什么值得关心**

`shallowEqual` 被 `useScopeSelector` 用于变更检测。如果 scope 数据中包含 Date 对象（如日期选择器绑定），变更不会被检测到，导致 UI 不更新。

**信心水平**：确定

---

## 发现 7：Form store 的路径监听器无错误隔离 — 一个监听器异常阻断所有后续监听器

**在哪里**

- `packages/flux-runtime/src/form-store.ts:79-87`

**是什么**

```ts
function notifyPathListeners(listeners: Set<() => void> | undefined) {
  if (!listeners) {
    return;
  }
  for (const listener of listeners) {
    listener(); // 如果抛出异常，后续 listener 不会执行
  }
}
```

如果一个表单字段监听器抛出异常，同一路径上的所有后续监听器都不会收到通知。

**为什么值得关心**

一个有 bug 的字段监听器可能导致其他字段不更新，表现为 UI 状态不一致。且错误会冒泡到 `store.setState` 的调用者，可能中断整个表单操作。

**信心水平**：确定

---

## 发现 8：`pathPrefixes` 存在两个完全相同但独立维护的实现

**在哪里**

- `packages/flux-runtime/src/form-store.ts:93-103`
- `packages/flux-runtime/src/scope-change.ts:25-35`

**是什么**

两处复制粘贴了完全相同的 `pathPrefixes` 函数，没有通过 import 共享。如果一处修改另一处没跟上，会导致难以排查的行为不一致。

**为什么值得关心**

维护风险。两个函数应该是共享的，放在 `flux-core/src/utils/path.ts` 中。

**信心水平**：确定

---

## 发现 9：词法分析器接受非法 JSON 转义序列 — 错误信息完全不指向公式语法

**在哪里**

- `packages/flux-formula/src/lexer.ts:63-65`（盲目跳过转义序列）
- `packages/flux-formula/src/parser.ts:384`（JSON.parse 抛出 SyntaxError）

**是什么**

`readString` 遇到 `\` 时盲目跳过两个字符，不验证转义序列的有效性。非法转义（如 `\x41`）被成功分词。但 `JSON.parse` 只允许标准 JSON 转义，抛出的 `SyntaxError: Bad escape character` 完全不指向公式语法问题。

**为什么值得关心**

用户写 `"\x41"`（许多语言支持的转义）时得到的错误信息是 JavaScript 内部的 `Bad escape character`，不会联想到公式语法限制。

**信心水平**：确定

---

## 发现 10：多个独立的 shallow equal 实现 — 存在逻辑分歧风险

**在哪里**

| 文件                                      | 实现                                    |
| ----------------------------------------- | --------------------------------------- |
| `flux-core/src/utils/object.ts:32`        | `shallowEqual` — 通用版                 |
| `flux-core/src/utils/object.ts:22`        | `shallowEqualRecords` — 仅限 Record     |
| `flux-react/src/hook-subscriptions.ts:24` | `shallowEqualArrays` — 仅限数组         |
| `flux-react/src/hook-subscriptions.ts:9`  | `shallowEqualFormFieldState` — 特定字段 |
| `flux-react/src/status-path.ts:10`        | `shallowEqualSummary` — 私有版          |

`shallowEqualSummary` 的实现与 `shallowEqual` 几乎完全一致，但不处理数组情况。如果传入两个数组，它跳过 `Array.isArray` 检查直接走 `Object.keys`——对数组恰好能工作，但这是巧合而非设计。

**为什么值得关心**

5 个 shallow equal 实现意味着维护成本和分歧风险。应该统一到 `flux-core/src/utils/object.ts` 中的参数化实现。

**信心水平**：确定

---

---

## 总评

本轮发现集中在 formula 表达式系统的语言语义不一致性上。最值得关注的方向：

1. **Pipe 语法与按位 OR 的冲突**（发现 1）是 formula 语言中一个"静默改变语义"的陷阱，影响面不限于按位运算——任何包含 `|` 的表达式都可能被意外重写。
2. **算术/比较运算符的类型处理不一致**（发现 2、3）在低代码场景中是高频踩坑点。
3. **公式编译失败的静默回退**（发现 4）严重影响 DX。

## 盲区自评

三轮审查覆盖了 compiler、react 渲染层、action dispatch、runtime scope/store、异步数据流、formula 表达式系统、核心工具函数、renderer 实现细节。可能仍然遗漏的：

- **构建和打包层面**（tree-shaking 效果、bundle size 分析）
- **SSR 兼容性**（`window`/`document` 在 Node.js 环境中的使用）
- **并发模式的完整测试**（React 19 Suspense + use 的边界情况）
- **设计器（Flow/Report/Word）的撤销/重做链完整性**
