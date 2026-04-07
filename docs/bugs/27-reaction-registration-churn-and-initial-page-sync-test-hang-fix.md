# 27 Reaction Registration Churn And Initial Page Sync Test Hang Fix

## Problem

- `pnpm -r test` 看起来会长期卡住在 `packages/flux-renderers-basic`，表面现象像是 workspace 测试超时或 Vitest 没退出。
- 实际可见症状是 `reaction` 相关测试不稳定或一直等不到期望值，尤其是 `coalesces reaction triggers during debounce windows` 会一直停在 `message = "start"`。
- 这个问题跨越 `flux-react`、`flux-renderers-basic`、`flux-runtime` 三层，单看任何一层都很容易误判。

## Diagnostic Method

- **Diagnosis difficulty: high.** 最先看到的是根命令 `pnpm -r test` 长期不返回，容易先怀疑 pnpm、Vitest worker、异步资源泄漏，或者 workspace 并行调度本身。
- 先把 workspace 测试串行化，确认真正停住的位置是 `packages/flux-renderers-basic`，而不是整个 monorepo 都卡住。
- 再把 `flux-renderers-basic/src/index.test.tsx` 按测试组拆开跑，确认非 `reaction` 用例和 `dynamic-renderer` 用例都能结束，问题被收敛到 `reaction` 用例。
- 再进一步拆成单测，确认至少有一个不是“挂住”而是**确定失败**：`coalesces reaction triggers during debounce windows` 始终看不到 `count:3`。
- 为了排除按钮事件和 `setValue` 写入路径，又新增了不带 `reaction` 的按钮回归测试，证明三次点击后 `count` 本身能稳定变成 `3`，所以按钮/action 写值链路没有问题。
- 再增加 runtime 级回归测试，证明 `runtime.registerReaction(...)` 自身可以正确把三次 `count` 更新收敛为一次 `message = count:3`，从而把问题锁定到 React 渲染层的 reaction 注册生命周期，而不是 reaction runtime 本身。
- 最后结合 React 层代码确认了两个叠加原因：
  - `SchemaRenderer` 在 mount 后还会把初始 `pageData` 整体写回 root scope，覆盖掉子树 mount effect/reaction 已经写入的值。
  - `ReactionRenderer` 依赖 `props.helpers.dispatch` 重新注册 reaction；一旦节点因为普通 rerender 获取到新 helper 引用，旧 registration 会被 cleanup，正在等待的 debounce timer 也会一起丢失。

## Root Cause

- `packages/flux-react/src/schema-renderer.tsx` 在 page runtime 已经用初始数据创建完成后，仍然在首个 effect 中再次 `setSnapshot(pageData)`；这会把 mount 阶段子树写入的状态覆盖回初始值。
- `packages/flux-renderers-basic/src/reaction.tsx` 把 reaction registration 绑定到了不稳定的 `props.helpers.dispatch` 引用上；普通 rerender 会触发 dispose + re-register，导致 debounce reaction 在定时器真正执行前被清理掉。
- 两个问题叠加后，现象会误导成“workspace test 卡死”或“Vitest 不退出”，因为最终可见的是等待条件永远不满足，而不是明确报错。

## Fix

- 在 `packages/flux-react/src/schema-renderer.tsx` 中保留初始 `pageData` 的已应用引用，跳过首轮重复 root-scope 回写，只在后续真实 `props.data` 变更时才同步到 page scope。
- 在 `packages/flux-renderers-basic/src/reaction.tsx` 中让 reaction registration 对外保持稳定：
  - registration 不再依赖 `props.helpers.dispatch` 的引用变化反复重建
  - 用 `ref` 持有最新 dispatch，并在 effect 外保持同一 registration 生命周期
- 这样修复后：
  - mount-time immediate reaction 的写入不会再被 root 数据同步覆盖
  - debounce reaction 不会因为普通 rerender 丢失尚未触发的 timer

## Tests

- `packages/flux-renderers-basic/src/index.test.tsx`
  - 验证 repeated button `setValue` 点击本身可以把 `count` 推进到 `3`
  - 验证 debounce reaction 最终能得到 `count:3`
  - 验证 mount-time immediate reaction 写入不会被初始 page data 同步覆盖
- `packages/flux-runtime/src/index.test.ts`
  - 验证 runtime 级 `registerReaction(...)` 可以把多次 `count` 更新收敛成最新 `message`

## Affected Files

- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-renderers-basic/src/reaction.tsx`
- `packages/flux-renderers-basic/src/index.test.tsx`
- `packages/flux-runtime/src/index.test.ts`

## Notes For Future Refactors

- 如果某个 `reaction` / effect 类 renderer 需要长生命周期订阅，不要把 registration 直接绑定到频繁变化的 helper/function 引用上；优先稳定 registration，再单独持有最新回调。
- root scope 的初始数据同步必须区分“初始化时已写入的数据”和“后续 props 更新”，否则很容易覆盖子树 mount effect 写入。
- 当 `pnpm -r test` 看起来像卡住时，先串行化 workspace，再把嫌疑包拆到单测；这类问题常常是“等待条件永远不满足”，而不是测试进程真的死循环。
