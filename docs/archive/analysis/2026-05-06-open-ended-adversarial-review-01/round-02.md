# 开放式对抗性审查 — 2026-05-06 — 第二轮

> 延续第一轮方向，本轮深入 renderer 实现细节和异步数据流全链路。

---

## 发现 1：CRUD 服务端分页 `totalPages` 基于 `source.length` 计算 — 分页完全失效

**在哪里**

- `packages/flux-renderers-data/src/table-renderer.tsx:246-249`（`totalPages` 计算）
- `packages/flux-renderers-data/src/crud-renderer.tsx:99-103`（`resolvedSource`）

**是什么**

```ts
// table-renderer.tsx:246-249
const totalPages = useMemo(() => {
  if (!paginationEnabled) return 1;
  return Math.ceil(source.length / pageSize); // source.length = 当前页数据量
}, [source.length, pageSize, paginationEnabled]);
```

Table 的 `totalPages` 基于 `source.length`（当前传入的行数），而非服务端返回的 `total`。在服务端分页模式下（数据源每次只返回当前页），`source.length` 可能是 10 条（当前页），但总数 1000 条。分页组件会显示 "1-10 of 10"，且只有 1 页。

**为什么值得关心**

在服务端分页模式下，这是严重的功能性 bug：用户永远只能看到第一页数据。

**信心水平**：确定

---

## 发现 2：表格行 scope 缓存使用模块级 Map — 组件卸载后永不清理

**在哪里**

- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts:16-28`

**是什么**

```ts
const tableRowScopeCaches = new Map<string, RowScopeCacheState>();
```

`tableRowScopeCaches` 是模块级变量，不随 React 组件卸载而清理。当 Table 组件卸载时，对应的 cache entry 不会被删除。如果同一个页面多次渲染/卸载不同的 Table（例如在 tabs 中切换），缓存持续增长。

更严重的是，如果 Table 的 `ownerKey` 因 `instancePath` 变化而变化，旧 cache 永远不会被清理。

**为什么值得关心**

SPA 中长时间运行的页面（如管理后台）会持续泄漏内存。每次切换 tab 或重新渲染表格，旧缓存永不释放。

**信心水平**：确定

---

## 发现 3：`once` reaction 在 dispatch 异常时不被 dispose — 违反一次性语义

**在哪里**

- `packages/flux-runtime/src/async-data/reaction-runtime.ts:216-225`（once 检查，在 dispatch 成功后）
- 同文件 `:246-265`（catch 块，不检查 once/fireCount）

**是什么**

`fireCount` 在 dispatch 成功后递增并检查 `onceSource`，然后 dispose。但如果 dispatch 抛出异常，控制流跳到 catch 块，而 catch 块**不检查 `onceSource` 或 `fireCount`**。`once` reaction 的 dispatch 失败后仍然存活在订阅列表中，下次触发条件满足时会再次执行。

**为什么值得关心**

`once` 的语义是"只执行一次"。如果 dispatch 的 action 有副作用但最终失败（如网络错误），reaction 不会被清理，可能重复触发副作用。

**信心水平**：确定

---

## 发现 4：API 缓存键不包含 headers — 多用户场景数据泄露

**在哪里**

- `packages/flux-runtime/src/async-data/api-cache.ts:129-136`

**是什么**

```ts
export function generateCacheKey(api: ExecutableApiRequest): string {
  const method = api.method ?? 'get';
  const url = api.url;
  const dataStr = api.data ? stableStringify(api.data) : '';
  return `${method}:${url}:${dataStr}`; // 不包含 headers
}
```

缓存键由 `method:url:data` 组成，不包含 headers。如果两个请求的 URL、方法和 body 相同但 headers 不同（不同的 Authorization token），会产生相同的缓存键。用户 A 的请求结果可能被缓存并返回给用户 B。

**为什么值得关心**

在多用户场景中，这是一个安全漏洞。不同权限的用户可能看到彼此的数据。

**信心水平**：确定

---

## 发现 5：`stableStringify` 不处理循环引用 — 栈溢出崩溃

**在哪里**

- `packages/flux-runtime/src/async-data/api-cache.ts:26-38`

**是什么**

`stableStringify` 递归遍历对象的所有属性，没有循环引用检测。如果 `api.data` 包含循环引用（例如 scope 对象中的 parent 引用），会导致栈溢出崩溃。

**为什么值得关心**

虽然通常 `api.data` 是从 scope 提取的序列化数据，但如果 schema 中的 `data` 配置不小心引用了包含循环引用的对象（如 scope 对象本身），整个请求执行会崩溃而非优雅返回错误。

**信心水平**：很可能

---

## 发现 6：JSON 解析错误会被盲目重试 — 不可恢复错误浪费资源

**在哪里**

- `packages/flux-action-core/src/operation-control.ts:186-189`（withRetry 将所有异常视为可重试失败）
- `packages/flux-runtime/src/async-data/request-runtime.ts`（没有区分可恢复和不可恢复错误）

**是什么**

`withRetry` 将所有 `fn()` 抛出的异常统一处理为可重试的失败。`shouldStop` 回调只在成功时调用（`if (shouldStop(lastResult))`），对异常完全无效。JSON 解析错误（SyntaxError）是不可恢复的，重试多少次结果相同，但系统会盲目重试到达到最大次数。

**为什么值得关心**

API 返回格式错误时导致 N 次不必要的重试，增加延迟和服务器负载。`shouldStop` 对异常无效，无法按错误类型控制重试策略。

**信心水平**：确定

---

## 发现 7：Select 异步选项变化不清除已失效的选中值 — 级联选择场景残留旧值

**在哪里**

- `packages/flux-renderers-form/src/renderers/input.tsx:137-189`

**是什么**

当 `options` 通过 `optionsSourceState` 异步加载后变化时（级联选择），组件不检查当前 `selectedValue` 是否仍存在于新 options 中。选中 "A" 后切换上一级使选项变成 ["B", "C"]，`selectedLabel` 为 `undefined`，用户看到空白选中框，但表单值仍是 "A"。

**为什么值得关心**

级联选择是常见场景。用户切换上级后，下级残留的无效值会导致表单提交时发送一个在新选项中不存在的值。

**信心水平**：确定

---

## 发现 8：Container 的 `align` 在 `direction: 'column'` 下语义错误

**在哪里**

- `packages/flux-renderers-basic/src/container.tsx:44-48`

**是什么**

```ts
align === 'center' && 'items-center justify-center',
align === 'start' && 'items-start justify-start',
align === 'end' && 'items-end justify-end',
```

`align` 同时设置了 `items-*`（交叉轴）和 `justify-*`（主轴）。在 `direction: 'column'` 时，`justify-center` 会让子元素垂直居中。用户通常只想水平居中但保持从上到下排列。

**为什么值得关心**

用户在 column 布局中设置 `align: 'center'` 时，子元素会被同时水平居中和垂直居中，这通常不是预期行为。需要 `direction: 'column'` 时只设置 `items-center` 而不设置 `justify-center`。

**信心水平**：很可能

---

## 发现 9：`parallel` 去重策略下请求不被追踪 — dispose 无法取消并行请求

**在哪里**

- `packages/flux-runtime/src/async-data/request-runtime.ts:382-385`

**是什么**

```ts
if (dedupStrategy !== 'parallel') {
  activeControllers.set(requestKey, controller);
  activePromises.set(requestKey, requestPromise);
}
```

`parallel` 策略下请求不会被记录到 `activeControllers`。`dispose()` 只 abort 被追踪的请求，并行请求变成"孤儿"继续运行。组件卸载后回调可能操作已卸载的组件。

**为什么值得关心**

在 SPA 中路由切换时，未取消的并行请求的回调可能写入已销毁的 scope 或更新已卸载组件的状态。

**信心水平**：确定

---

## 发现 10：Array Editor 删除项后立即验证可能检查到错误的项

**在哪里**

- `packages/flux-renderers-form-advanced/src/array-editor.tsx:110-122`

**是什么**

```ts
currentForm.removeValue(name, index);
void currentForm.validateSubtree(name); // itemsRef 可能还是旧数据
```

`validateSubtree` 是异步的，但 `validateChild` 中使用 `itemsRef.current[Number(match[1])]` 索引查找项目。删除第 2 项后 form 中变成 [A, C]，但 `itemsRef.current` 可能还是旧的 [A, B, C]，导致验证检查了错误位置的项目。

**为什么值得关心**

删除项后立即触发的验证可能将错误信息指向错误的项目索引，用户看到混乱的验证反馈。

**信心水平**：很可能

---

## 总评

本轮最值得关注的两个方向：

1. **功能正确性问题**：CRUD 分页失效（发现 1）和 Select 级联残留（发现 7）是直接影响终端用户的 bug。
2. **资源泄漏链条**：模块级缓存（发现 2）+ 并行请求孤儿（发现 9）+ reaction 不 dispose（发现 3），三个独立问题组合在一起，在长时间运行的 SPA 中会形成持续的资源泄漏。

## 盲区自评

本轮深入了 renderer 实现和异步数据流，但仍有盲区：

- Word Editor 和 Report Designer 的业务逻辑未覆盖
- Playwright E2E 测试的覆盖率和质量未评估
- Vite 构建配置和 tree-shaking 效果未检查
- 错误边界（Error Boundary）的覆盖和行为未审查
