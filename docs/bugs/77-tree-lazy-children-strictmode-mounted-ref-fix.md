# 77 Tree Lazy Children Dead Under StrictMode — MountedRef Never Reset (bug 73 Pattern)

## Problem

`input-tree` / `tree-select` 的远程 `childrenSource` 懒加载在真实浏览器中**完全不加载**：展开 `deferChildren` 节点后请求确实发出（env fetcher 被调用、返回子节点数组、dispatch `ok:true`），但子节点永不渲染、无 loading、无 error——单测全绿（tree-lazy-children.test.tsx 7 用例含失败/重试/合并路径），真机静默失败（C3.5 宿主场景 host-mr-tree-lazy 实证）。**典型的 bug 73 模式（单测绿但真机失败）**。

## Root Cause

`useTreeLazyChildren`（`tree-control-controllers.ts`）的挂载守卫：

```ts
const mountedRef = React.useRef(true);
React.useEffect(() => {
  return () => {
    mountedRef.current = false;
  };
}, []);
```

cleanup 将 `mountedRef` 置 `false` 后**从未复位**。playground 运行在 React 19 **StrictMode** 下，effects 经历 mount → cleanup → mount 双挂载序列——cleanup 在第一次挂载后就把 ref 置为 `false`，第二次挂载的 effect 体为空（不重置）。此后每次懒加载 resolve 时：

```ts
if (!mountedRef.current || generationRef.current !== generation) {
  return; // ← 永远命中：mounted=false
}
```

→ 加载结果被当作「组件已卸载」静默丢弃。单测环境（vitest render 无 StrictMode）不受影响 → 假绿。`upload-field.tsx:155` 的同类 mountedRef 模式**有** `mountedRef.current = true;` 复位（G11），tree 控制器遗漏。

## Diagnostic Method

1. 宿主场景先红：展开节点 → 子节点不出现、无错误（e2e 失败）
2. 浏览器 console 插桩：env fetcher 被调用（url/parent 正确）→ `await helpers.dispatch` 正常 resolve（ok=true, data 正确）→ **resolve 回调内 `mounted=false`** → 丢弃分支命中
3. 读码确认：mount effect 有 cleanup 无 reset；StrictMode 双挂载语义（React 19 官方 double-invoke）成立
4. 单测复现（先红）：`<StrictMode>` 包裹 SchemaRenderer + input-tree + childrenSource → 展开 → 子节点不出现（修复前 1 failed / 修复后绿）

## Fix

`tree-control-controllers.ts` mount effect 补复位：

```ts
React.useEffect(() => {
  mountedRef.current = true; // StrictMode 双挂载复位
  return () => {
    mountedRef.current = false;
  };
}, []);
```

与 `upload-field.tsx`（G11）同模式对齐。根因单点（共享 `tree-control-controllers.ts`，input-tree/tree-select 双组件同时修复），不插 CX-n。

## Regression Tests

- `tree-lazy-children.test.tsx` 新增「C3.5: lazy children still load under React StrictMode double-mount」用例（StrictMode 包裹 + 展开 + 子节点可见 + fetcher 调用断言）——先红后绿实测
- 宿主 e2e `host-mr-tree-lazy`（input-tree + tree-select 双组件：成功加载 + 失败 inline error + retry 重试成功 + 提交值形状）——修复前 2 用例红、修复后 2/2 绿

## Evidence

- 修复前：`tree-lazy-children.test.tsx` StrictMode 用例 1 failed（1012ms 超时）；`c3-5-host-surfaces.spec.ts` 树 2 用例失败（fetcher 已调用但子节点不渲染）
- 修复后：form-advanced 1014 tests 全绿；c3-5-host-surfaces 7/7 全绿（详见 `docs/logs/2026/08-03.md` C3.5 执行记录）
