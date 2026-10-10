# 102. 空依赖 loadAction reaction fail-open：wizard 内 picker 弹框真实点击主线程卡死 30s+

- **日期**: 2026-10-11
- **受影响组件**: `flux-runtime` renderer-reaction-handle × `flux-react` fragment scope × `flux-renderers-layout` wizard（valuesPath 表单）× `flux-renderers-data` crud（loadAction reaction）
- **现象**: playground `#/complex-pages/form-wizard` 步骤二的部门 picker（picker v3 契约、弹框内容为 crud）在**真实指针点击**触发器后弹框"大概率不开"或页面主线程硬卡死 30 秒以上（极端情况下标签页直接崩溃）。合成 `el.click()` 时好时坏，无任何控制台报错。见 `docs/testing/2026/10-10.md` #41。

## 根因

一个**结构性死循环**，真实点击只是把它带入最不利时序的变量之一（合成点击同样会进入循环，能否自愈取决于 fetch 与 reaction force 的竞态）：

1. **reaction 空 dependsOn = fail-open。** `createRendererReactionHandle` 用 `createRootDependencySet(plan.dependsOn)` 派生依赖集；`dependsOn` 缺失/为空时返回 `undefined`，而 `scopeChangeHitsDependencies(change, undefined)` **恒返回 true**——未声明依赖的 loadAction reaction 对订阅链上**任何** scope 变更都会响应式触发。编译器侧 `invalid-reaction-deps` 诊断早就以 error 级别要求声明 `dependsOn`，但 `continueOnError` 让 schema 继续运行，这个校验错误在运行时被放大成了"监听一切"。

2. **picker 内容 crud 直接落在表单 scope 里。** `pickerSchema` region 无 slot 参数 → `shouldUseFragmentScope = !!fragmentBindings` 为 false → 弹框内容不建独立 fragment scope，crud 的 `useRenderScope()` 就是**表单的 runtimeScope**，其自定义 `update` 把 `$_picker.selection`/`$_picker.rows` 写进**表单 values**。

3. **valuesPath 发布喂回 reaction。** wizard 步骤表单声明 `valuesPath: wizardData.step2` → form store 任何 values 身份变化都会把整个 values 对象发布到 wizard scope（每次都是新对象身份，`Object.is` 守卫必然放行）。

4. **闭环成形**：写 `$_picker.rows`（每次 fetch 产生新数组身份）→ form values 变 → `wizardData.step2` 发布 → wizard scope 变更沿组合 store 传播 → crud reaction（空依赖 = 命中一切，`wizardData` 也不在 `ignoreWritesTo` 名单）→ `force()` 重新 fetch → onSettle `setRows(新数组)` → 再写 `$_picker.rows` → 循环。每一圈还叠加 React dev 模式全树 `warnUnknownProperties` + `logComponentRender`，同步主线程被吃满。

`ignoreWritesTo` 防护（crud-renderer-load.ts 注释里明确防的正是 "fetch → state write → fetch loop"）只覆盖 crud 自己拥有的路径（`$crud.*`/`$_picker.*`），盖不住无关祖先路径 `wizardData.step2`。

## 诊断方法

无头 Chromium 复现后，`Profiler.stop` 会排在堵死的主线程后面永远取不到；改用 **CDP `Debugger.pause()`**（V8 中断可在死循环中生效，即 DevTools 暂停按钮的机制）连采 3 次现场栈，直接看到旋转路径：

```
commitHookPassiveMountEffects → publish → update → setValue → setState（表单 valuesPath 发布）
→ store listener → handleScopeChange → force → runReaction → dispatchWithAbortChain（loadAction 重新 fetch）
→ setState → setValue → update → publish（crud 结果写回）→ checkIfSnapshotChanged → resolveNodeProps → exec
```

`Debugger.paused` 帧的 `functionName + location` 逐帧映射回源码，把 `publish`/`update`/`setValue`/`force` 各归其位后闭环即显形。探针脚本模式存档于修复会话 `_tmp/wizard-picker-jank-probe2/4.mjs`（已清理，模式记录于此）。

## 修复

`packages/flux-runtime/src/renderer-reaction-handle.ts`：空 `dependsOn` 改为 **fail-closed**——`handleScopeChange` 在 `dependencySet === undefined` 时直接返回，不再做任何反应式触发。命令式 `dispatch()`、显式 `force()`（刷新按钮/reload）、以及 crud 自身 state 驱动的重新加载（load effect 的分页/查询/排序依赖）都不受影响；声明了 `dependsOn` 的 reaction 行为不变。

语义依据：编译器已要求 reaction 必须声明 `dependsOn`（error 级诊断），运行时对缺声明的正确姿态是"没有触发面"而不是"监听一切"。

## 回归防护

- `flux-runtime` 包内单测：`renderer-reaction-handle.test.ts` "does NOT reactively fire with an EMPTY dependsOn (fail-closed, #41)"——空依赖下任意 scope 变更零触发、`pendingChange` 不置位、命令式 dispatch 与显式 force 正常。
- e2e：`complex-pages-interaction-state.spec.ts` "form-wizard: picker opens on a real pointer click" 强化为全链路——真实坐标点击 → 弹框 crud **行内容渲染**（同时守 #40 死属性漂移）→ 选行 → 确认 → 值回写断言。
- 门禁基线收缩：`page-schemas-validation.test.ts` 中 `form-wizard.json` 的 5 个 picker 死属性基线项随 schema 迁移完成删除。
