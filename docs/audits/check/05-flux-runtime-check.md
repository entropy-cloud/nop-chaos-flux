# 05 flux-runtime 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-runtime/src/` 共 83 个源文件（排除 `*.test.*` 与 `__tests__`）、17,460 行。分层抽样：核心链路（runtime 工厂、node runtime、scope 生命周期、async-data 全链路、action adapter、surface、reaction、imports）全文精读约 11,600 行（≈66%）；form-runtime 家族其余文件与 validation 小文件经模式扫描（空 catch / `as any` / `@ts-ignore` / 非空断言 / 定时器与事件监听清理 / Promise 无 catch / 只增不减的 Map/Set / console 吞错）加定点精读覆盖 100% 文件。
- 结论概览：**P0 x0 / P1 x3 / P2 x5 / P3 x9**。总评：flux-runtime 工程质量整体偏高——异步竞态治理（runId + AbortController 链 + async-governance settle）、防抖/级联深度守卫、原型链污染防御成体系，无 `as any`/`@ts-ignore`/TODO 残留，fire-and-forget Promise 几乎全部带 catch；三条 P1 分别是 `resolveNodeMeta` 的 `changed` 字段参与相等比较导致引用交替（无效重渲染 + 语义振荡）、component-handle-registry dispose 漏清 `handlesByScopeId`（内存泄漏）、字段取消隐藏后的 `void revalidateSubtree` 无 catch（unhandled rejection）。跨包线索两条均完成裁定：shallowEqual 消费链在 node-runtime.ts:317 一侧为**误报方向**（真实滞留点在 `structuralShareData`），`$Date.now()` 编译期折叠在本包被 formula 数据源消费放大为永久冻结。

## P0 缺陷

无。未发现满足"输入 → 路径 → 错误结果"完整必然推理链的缺陷。

## P1 隐患

### F-01 `resolveNodeMeta` 的 `changed` 字段参与 shallowEqual 比较，返回引用按调用次数交替，破坏复用机制并造成周期性无效重渲染（D1/D6）

- 位置：`packages/flux-runtime/src/node-runtime.ts:237-249`
- 摘录：

```ts
    changed: true,            // ← 新建 resolved 恒为 true
  };

  if (state?.resolvedMeta && shallowEqual(state.resolvedMeta, resolved)) {
    state.metaDependencies = collectMetaDependencies(state);
    state.resolvedMeta.changed = false;   // ← 复用分支把 stored 改成 false
    return state.resolvedMeta;
  }
```

- 推理链：
  1. 第 1 次求值：stored 为空 → 存入 `changed:true` 的对象 A 并返回。
  2. 第 2 次求值（meta 值未变）：新 resolved `changed:true` vs stored A `changed:true` → 其余键全等 → 复用 A，且 A 被改写为 `changed:false`。
  3. 第 3 次求值（仍未变）：新 resolved `changed:true` vs stored A `changed:false` → `Object.is(false, true)` 为 false → shallowEqual 判**不等** → 存入新对象 C（新引用）并返回。
  4. 即便 meta 完全不变，返回引用按 A,A,C,C,E,E… 交替；`changed` flag 同步在 true/false 间振荡。
- 消费点核实：`packages/flux-react/src/node-renderer-resolved.tsx:118-127` 用 `useSyncExternalStoreWithSelector` 订阅 scope 变更，selector 调 `runtime.resolveNodeMeta(...)`，相等判定是 `prev.meta === next.meta && prev.resolvedProps.value === next.resolvedProps.value`。第 3 步的新引用使该判定失败 → 触发一次**无实际变化的 React 重渲染**；任何读取 `meta.changed` 的消费者看到幻影"变化"。
- 影响：所有含动态 meta（`visible`/`when`/`className` 等表达式）的节点，在"依赖命中但求值结果不变"的 scope 更新中约每两次触发一次无效重渲染（典型：`${a > 0}` 型 visible，a 在同侧取值变化）；大页面下逐节点级联。复用分支（`changed:false` + 复用引用）的设计意图被 `changed` 字段自身抵消。对照 `resolveNodeProps`（node-runtime.ts:318-321）不受影响——它只比较 `.value` 记录、`changed` 不在比较对象内。
- 修复方向：比较前将双方 `changed` 归一（如临时置 false 再比），或复用分支不写回 `state.resolvedMeta.changed`、由调用方读返回值判断；同时为"值未变时引用必须稳定"补一条回归测试。

### F-02 component-handle-registry `dispose()` 漏清 `handlesByScopeId`，注册表销毁后按 scope 索引的 handle 全量泄漏（D3）

- 位置：`packages/flux-runtime/src/component-handle-registry.ts:446-463`（对照索引定义 :27、填充 :207-211）
- 摘录：

```ts
    dispose() {
      for (const child of childRegistries) { child.dispose?.(); }
      childRegistries.clear();
      if (input.parent) { ... }
      handles.clear();
      handlesByCid.clear();
      debugDataByCid.clear();
      handlesById.clear();
      handlesByName.clear();
      nameIndex.clear();
      debugEnabledListeners.clear();
      // ↑ 缺 handlesByScopeId.clear()
    },
```

- 问题：`dispose` 清理了 7 个索引结构，唯独遗漏 `handlesByScopeId`（`findFirstInScope` 的数据源）。泄漏的 handle 闭包持有 `capabilities`（含 form store、CRUD controller 等）、`scope` 等强引用。
- 影响：每次嵌套 registry（dialog/surface 专属 registry、`useNodeScopes` 创建的 per-policy registry）销毁，其 scope 索引桶整体滞留。行为层面无错（桶内 handle `_mounted === false` 会被 `findFirstInScope` 过滤），属纯内存泄漏，长会话 + 高频开关 dialog 场景累积。
- 修复方向：`dispose()` 增加 `handlesByScopeId.clear()`；补一条"dispose 后 `findFirstInScope` 数据不残留"的测试。

### F-03 字段取消隐藏后的 `void revalidateSubtree?.(path, 'system')` 无 catch，校验基础设施失败成为 unhandled rejection（D5/D1）

- 位置：`packages/flux-runtime/src/form-runtime-field-ops.ts:440`
- 摘录：

```ts
  } else {
    sharedState.hiddenFields.delete(path);
    void revalidateSubtree?.(path, 'system');
  }
```

- 问题：`revalidateSubtree` → `ownerRuntime.validateSubtree` → `validatePath` 会因 async 校验规则的网络/传输失败或 validator 编程错误 reject（同家族其余入口均有 catch：`form-runtime.ts:570-574`、`form-runtime-owner.ts:251-269`、`form-runtime-owner.ts:371-402` 均路由到 `reportDependentRevalidationFailure` 诊断缝）。这是全包唯一一个裸 `void` 且无 `.catch` 的 Promise 调用点（全包扫描确认其余 fire-and-forget 均有 catch 或内部全路径 catch）。
- 影响：字段从 hidden 转为可见（`notifyFieldHidden(path, false)`）且其子树含 async 校验规则、请求失败时，产生 unhandled promise rejection——浏览器中为控制台噪音并可能触发宿主的全局错误上报误报；Node/vitest 环境中 unhandled rejection 默认可使进程/测试中止。
- 修复方向：改为 `void revalidateSubtree?.(path, 'system').catch((error) => reportFailure(path, error))`，与 M-09 诊断缝对齐；补一条"取消隐藏 + async 规则失败不产生 unhandled rejection"的回归测试。

## P2 风险

### F-04 data-source 的 async-governance owner 记录在 source 注销时不清除，governance store 无界增长（D3）

- 位置：`packages/flux-runtime/src/async-data/source-registry.ts:361-389`（entry.dispose）对照 `packages/flux-runtime/src/async-data/reaction-runtime.ts:543`（reaction 侧有 `clearOwner`）
- 摘录：

```ts
      dispose() {
        ...
        abortController.abort();
        unsubscribe?.();
        controller.stop();
        // ← 无 input.asyncGovernance?.clearOwner(`data-source:${ownerScopeId}:${args.id}`)
        const currentBucket = scopeEntries.get(ownerScopeId);
```

- 问题：runtime-factory 把 `asyncGovernance` 传入 source registry（runtime-factory.ts:680-684）与 controller；reaction registry 的 `dispose` 显式 `input.asyncGovernance?.clearOwner(...)`，source entry 的 `dispose` 没有对应调用。每个注册过的数据源在 `owners` Map 留下 `AsyncGovernanceOwnerRecord`（含 `recentRuns` ≤8 条、每条可携带 error stack）。
- 影响：StrictMode 双挂载、dialog/CRUD 反复注册注销、长会话下 owner 记录只增不减（每条数百字节～KB 级）；`getAsyncOwnerDebugSnapshot` 快照也随之膨胀。对照同包 reaction 路径已有正确模式，属一致性遗漏。
- 修复方向：entry.dispose 末尾增加 `input.asyncGovernance?.clearOwner(...)`（注意 api-data-source-controller-runtime.ts:361-368 注释里 StrictMode 下 dispose 期间 late settle 的约束——clearOwner 后 late settleRun 会经 `getOrCreateOwner` 重建记录，需确认重建记录最终也会被下一次注册的 clearOwner 回收，或在 settleRun 后二次清理）。

### F-05 跨包线索裁定（修正）：shallowEqual 的 Date/Map 恒等 bug 在 node-runtime props 复用链为误报；真实滞留消费点是 `structuralShareData`（D1，root cause 在 flux-core，01 号报告 F-02）

- 位置 A（误报修正）：`packages/flux-runtime/src/node-runtime.ts:317-321`

```ts
    const lastProjectedValue = state?._lastPropsResult?.value as Record<string, unknown> | undefined;
    const finalResult =
      lastProjectedValue && shallowEqual(lastProjectedValue, finalValue)
        ? { ...result, value: lastProjectedValue, changed: false, reusedReference: true }
```

此处 shallowEqual 的操作数是 props **记录**（`Object.assign({}, ...)` 产物，恒为普通对象）。prop 值为 Date/Map 时按 `Object.is` 逐键引用比较 → 新实例判**不等** → 不复用。即 01 号报告所称"顶层值为 Date 时复用旧值导致 UI 滞留"在本消费点不成立；该点的实际症状方向相反（每次求值产生新 Date 引用 → 恒判 changed → 过度失效/重渲染）。

- 位置 B（真实消费点）：`packages/flux-runtime/src/async-data/data-source-state.ts:55-57`

```ts
export function structuralShareData(previousData: unknown, nextData: unknown): unknown {
  return shallowEqual(previousData, nextData) ? previousData : nextData;
}
```

这里 shallowEqual 的操作数**就是数据源 payload 本身**。当 payload 顶层是 Date/Map/Set/RegExp（无 own-enumerable-key 对象，`Object.keys` 均为空）时，两个不同内容的实例被恒判相等 → 保留 previousData。下游 `publishControllerData`（api-data-source-controller-state.ts:76-93）继而 `Object.is(currentValue, effectiveData)` 提前 return，**跳过 scope 写入** → 订阅者永远看不到新数据。

- 触发条件与影响：API/action 数据源经 adaptor 返回顶层 Date/Map（或 formula 数据源求值为 `NOW()`/`$Date.now()` 类 Date 值——见 F-06 的冻结前提）时，轮询/刷新静默滞留旧值，`dataUpdatedAt` 不更新。条件窄但一旦命中极难排查。
- 归因：root cause 为 flux-core `shallowEqual`（utils/object.ts:32，01 号 F-02 已立案）；本包消费点从 node-runtime.ts:317 改判为 data-source-state.ts:55（以及 source-observer.ts:57 的快照 value 比较，同为记录比较、顶层 Date 值按 Object.is 判不等，不受影响）。修复在 flux-core 侧为无 own-key 对象加类型分支即可同时消除两处风险。

### F-06 跨包线索确认：flux-formula 编译期折叠非确定 namespace 调用，经本包 formula 数据源 `staticCompiled` 短路被放大为"永久冻结"（D2/D1，root cause 在 flux-formula，02 号报告 F-02）

- 位置：`packages/flux-runtime/src/async-data/formula-data-source-controller.ts:42-47,127-134`
- 摘录：

```ts
  const compiled = input.runtime.expressionCompiler.compileValue(input.formula);
  const staticCompiled = compiled.isStatic ? (compiled as StaticRuntimeValue<unknown>) : undefined;
  ...
      const rawValue = dynamicCompiled
        ? input.runtime.expressionCompiler.evaluateWithState(...).value
        : staticCompiled?.value;   // ← 静态折叠后每次 publish 都读同一编译期值
```

- 核实结论：本包**没有**表达式级编译缓存（`createExpressionCompiler`（flux-formula/expression-compiler.ts）无缓存；本包唯一相关缓存是 `runtime-eval-helpers.ts:18` 的 `compiledValueCache`——WeakMap 按 target 对象键，不含"非确定性标记"问题；flux-compiler schema-compiler 亦无编译缓存）。风险不在于缓存 key，而在于：`$Date.now()`/`$Math.random()` 被 flux-formula static-eval 在**编译期**折叠为常量（02 号 F-02）后，本包 formula 数据源把它当 `staticCompiled` 处理——`publish()` 永远返回编译那一刻的值，且 `valuesEqual`（Object.is）恒等 → 连 dataUpdatedAt 都不推进，runtime 无任何重评估路径或告警。
- 影响：`formula: '$Date.now()'` 类数据源输出永久冻结；依赖它的 visible/reaction 逻辑拿到过期时间。归因 flux-formula（修复方向：static-eval 对非确定成员调用返回 `{static:false}`）；本包侧可选防御：formula 源在注册期做一次非确定性静态值告警（复用 02 号报告建议的 registry 元数据）。
- 缓存 key 结论（任务线索 #2 的直接回答）：**本包不存在需要非确定性标记的编译缓存**；moduleCache 仅按 import URL 键，adaptor 表达式缓存（request-runtime-adaptor.ts:10）按源码字符串键——纯函数复用安全，唯非确定公式需 flux-formula 侧不折叠。

### F-07 `evaluateControllerStopCondition` 用错误文案字符串匹配判定 null-member 访问，且 NODE_ENV 判定在浏览器恒为 dev（D5/D2）

- 位置：`packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:141-153`
- 摘录：

```ts
    if (
      error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.message === 'Cannot access member of null or undefined'
    ) {
      if ((globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== 'production') {
        console.warn(...);
      }
      return false;
    }
```

- 问题 1：以 flux-formula 的错误**文案**精确匹配作为控制流分支——上游文案任何改动都会让行为从"宽容返回 false（继续轮询）"静默跳变为"置 error 状态并停止轮询"（`stopWhen` 求值失败的默认路径），属于跨包隐式契约。
- 问题 2：`process?.env?.NODE_ENV !== 'production'` 在浏览器（无 `process`）恒为 `true` → 生产浏览器构建同样输出 console.warn（意图是 dev-only 告警）。
- 影响：轮询型数据源的 stop 行为依赖脆弱字符串；生产环境告警噪音。修复方向：让 flux-formula 在错误对象上携带结构化 code（如 `cause.code === 'NULL_MEMBER_ACCESS'`）后按 code 匹配；NODE_ENV 判定改用构建期常量替换或 `import.meta.env` 约定。

### F-08 基线偏离 2（surface-event-ctx 测试失败）归因裁定：root cause 不在 flux-runtime（D2，供 06/10 号审计接手）

- 裁定依据（证据链）：
  1. 失败用例（`flux-renderers-basic/src/__tests__/surface-event-ctx.test.tsx` 第 2 条）走**声明式** `type:'dialog'` + `open:true`（受控）路径，不经由本包 action-adapter 的 openDialog 分支；本包 surface-runtime/surface-store 只负责 entry 栈与状态发布，不渲染任何按钮。
  2. 测试日志显示 `getByRole('dialog')` 的 waitFor **通过**（surface entry 创建、状态发布、宿主渲染链均正常），缺的只是 `data-testid="surface-confirm-submit"` 按钮。该按钮由 `packages/flux-react/src/dialog-host.tsx:273-283`（及 drawer :455）`resolveConfirmButtons({ confirm: surface.surface.confirm, hasExplicitActions: Boolean(surface.actions), ... })` 门控——`confirm` 字段是否从声明式 schema 正确到达 entry、以及 `surface.actions` 是否被误判非空，属 flux-compiler 字段分类 / flux-react 声明式 surface 装配 / renderers-basic 渲染链。
  3. 同文件第 1 条（`defaultOpen:true` 非受控）与第 3 条（drawer onClose）通过——**受控 `open:true` 与非受控 `defaultOpen:true` 的差异是关键复现变量**，指向 declarative surface renderer 的受控分支。
  4. 2026-08-09 DV 全绿基线后触碰本包的提交仅 `1d2fd4f23`（source-registry dashboard-filter dev-warn）与 `d849c6098`（action-adapter `resolveSurfaceMeta` 透传），均不触及声明式 dialog 确认栏渲染。
- 建议：06（flux-react）/10（renderers-basic）号审计沿 `resolveConfirmButtons` 的两个门控输入（`surface.surface.confirm` 到达路径、`surface.actions` 非空误判）+ 受控 open 分支排查。本包附带的间接风险见 P3-1（openDialog 每次全量编译 surface body，编译 throw 时 dialog 静默不开——是另一条"按钮缺失"的候选链路，但与本测试失败无关）。

## P3 提示

1. **openDialog/openDrawer 每次派发全量编译 surface body**：`action-adapter.ts:90-95` `resolveSurfaceValidationPlan` 每次都 `runtime.compile({type:'page', body})`，无缓存（flux-compiler schema-compiler 无编译缓存）。高频开 dialog 的页面重复承担 O(body) 编译；编译 throw 时 openDialog 返回 `ok:false` 仅经 monitor 上报，UI 侧 dialog 静默不开（排障困难）。建议按 schema 引用做 WeakMap 缓存 + 失败时 notify。
2. **`runtime-factory.ts:127` `nextMountedCid = defaultCidState.nextCid` 是死接线**：编译器从不递增 `CompiledCidState.nextCid`（全仓 grep 仅 target-enrichment.ts:108-109 透传、createCompiledCidState 初始化），快照恒为 0，当前无 cid 冲突；但若未来编译器开始分配 cid，两个命名空间将从同一起点重叠。建议改为共享可变计数器或删除该快照。
3. **`settleControllerRunIfNeeded` if/else 两分支完全相同**：`api-data-source-controller-state.ts:110-126` 的 `isCurrentRun` 判断分支与默认分支均 `return settleRun(run, settled)`，死逻辑（疑似历史残留），建议删并。
4. **surface-store `uncontrolledOpenById` 关闭后残留**：`surface-store.ts:119-121` disposeEntry 仅 `setUncontrolledOpen(entry.id, false)`，不调用已有 `clearUncontrolledOpen`（:73-82）→ 每个曾打开的 overlay 残留一条 `false` 记录，长会话缓慢增长。建议 dispose 路径改用 clear。
5. **`dashboardFilterMismatchReported` 模块级 Set 只增不减**：`source-registry.ts:57`。sourceId 含随机 scope 后缀，动态注册场景下无界增长（每条一个小字符串）；且模块级单例被多 runtime 实例共享。建议挂到 registry 实例或加容量上限。
6. **reaction watch 用 Object.is 判变化**：`reaction-runtime.ts:213`。watch 表达式每次求值产生新数组/对象引用（如 `[a, b]` 字面量）时恒判 changed → reaction 在依赖命中时过度触发（有 dependsOn 门控与级联深度守卫兜底）。可考虑对数组/对象 watch 值做浅比较。
7. **`setValues` 失败仅 console.error**：`form-runtime.ts:589-591` `executeSetValues(...).catch((error) => console.error(...))`——调用方无法感知失败（批量写 + 依赖重校验失败被吞）。建议路由到 `reportDependentRevalidationFailure` 同款诊断缝。
8. **`createReadonlyScopeBinding.has()` 对显式 undefined 值误报 false**：`status-owner.ts:207` `getIn(...) !== undefined`——summary 中值为 undefined 的键被判"不存在"。低影响（summary 值通常为 boolean/number）。
9. **D8 结构**：>500 行文件 12 个（runtime-factory 696、form-runtime-owner 666、form-runtime 645、form-store 630、reaction-runtime 619、form-runtime-validation 612、request-runtime 593、scope 589、import-stack 581、action-adapter 567、source-registry 525、api-data-source-controller-runtime 503），全部低于 `check:oversized-code-files` 700 行阈值，**无未注册红**；各文件职责已在 module-boundaries 文档登记为有意的聚焦模块，符合仓库"按职责评估拆分"惯例，无需新登记。

## 检查过程记录

### 精读文件清单（全文或 ≥90%）

- runtime 工厂/装配：`runtime-factory.ts`、`runtime-owned-factories.ts`、`runtime-eval-helpers.ts`、`runtime-action-helpers.ts`、`runtime-plugins.ts`、`runtime-host-projection-scope.ts`、`projected-scope-store.ts`、`node-runtime.ts`、`node-resolver.ts`、`error-utils.ts`
- scope/状态：`scope.ts`、`scope-change.ts`、`page-runtime.ts`、`page-store.ts`、`status-owner.ts`
- async-data 全链路：`request-runtime.ts`、`request-runtime-adaptor.ts`、`request-in-flight-registry.ts`、`api-cache.ts`、`async-governance.ts`、`api-data-source-controller.ts`、`api-data-source-controller-runtime.ts`、`api-data-source-controller-state.ts`、`api-data-source-controller-helpers.ts`、`data-source-state.ts`、`data-source-runtime-utils.ts`、`data-source-runtime.ts`、`formula-data-source-controller.ts`、`source-registry.ts`、`source-observer.ts`、`source-executor.ts`、`reaction-runtime.ts`、`reaction-runtime-helpers.ts`、`blob-download.ts`
- action/surface：`action-adapter.ts`、`action-scope.ts`、`surface-runtime.ts`、`surface-hooks.ts`、`surface-store.ts`、`refresh-nearest.ts`、`abort-signal-helpers.ts`、`renderer-reaction-handle.ts`
- import/能力注册：`imports.ts`、`import-stack.ts`、`component-handle-registry.ts`、`form-component-handle.ts`（头部）、`input-component-handle.ts`（头部）、`composite-field-handle.ts`（头部）、`surface-component-handle.ts`（头部）
- form 家族：`form-runtime.ts`、`form-runtime-owner-lifecycle.ts`、`form-runtime-registration.ts`、`form-runtime-array.ts`、`form-store.ts`（约 60%）、`form-store-owned.ts`（约 60%）、`form-runtime-validation.ts`（约 65%）、`form-runtime-owner.ts`（约 50%）、`form-runtime-submit-flow.ts`（约 40%）、`form-runtime-field-ops.ts`（定点 notifyFieldHidden 及全文件模式扫描）
- validation/plugins：`validation-runtime.ts`、`validation/errors.ts`、`validation/validators.ts`（约 50%）、`plugins/xui-roles-plugin.ts`

### 模式扫描（全包 100% 文件）

`as any` x0；`@ts-ignore`/`@ts-expect-error`/eslint-disable x0；TODO/FIXME x0；非空断言 `!` 共 10 处（逐一核读均有守卫或立即删除，见 form-store.ts:299-308、form-runtime-owner\*.ts:89/491 的 `undefined!` + 紧随 delete 模式）；空 catch 共 5 处（blob-download.ts:18/88、request-runtime.ts:241、api-data-source-controller.ts:36、source-registry.ts:66，全部为有意义的 fallback：decodeURIComponent 失败降级、JSON.stringify 环引用降级、JSON-in-blob 解析失败转下载、initFetch 求值失败默认 true）；setTimeout 共 6 个使用点（poll/validating/submittting/debounce/objectURL revoke）均在 stop/dispose/finally 清理；addEventListener 4 处均配对 removeEventListener（request-runtime.ts:551-553、form-runtime-validation.ts:302-303、form-runtime-submit-flow.ts:152-156、abort-signal-helpers）；fire-and-forget Promise 9 处中 8 处带 catch（唯一例外即 F-03）；console.error/warn 9 处均为配对 reportRuntimeHostIssue 的 dev 可见诊断（无纯吞错）。

### 跨包线索核验记录

1. **flux-core shallowEqual（01 号 F-02）**：读 flux-core `utils/object.ts:32-64` 确认 Date/RegExp/Map/Set 顶层操作数恒判相等（Object.keys 为空）；推导 node-runtime.ts:317 消费链为记录级比较（Object.is 逐键）→ 判定该消费点不产生滞留（F-05 位置 A 修正）；定位真实顶层操作数消费点 `structuralShareData`（F-05 位置 B）。
2. **flux-formula static-eval 折叠（02 号 F-02）**：确认本包无表达式编译缓存（expression-compiler/runtime-eval-helpers/flux-compiler schema-compiler 三处核实），折叠风险经 `formula-data-source-controller` 的 `staticCompiled` 短路放大为永久冻结（F-06）。
3. **baseline surface-event-ctx 失败**：读失败测试全文 + `dialog-host.tsx` confirm 栏渲染门控 + git log（8-09 后本包相关提交 `1d2fd4f23`/`d849c6098` diff 核读）→ 归因排除本包，给出 06/10 号接手方向（F-08）。
4. **cid 分配疑点（自查）**：追 `createCompiledCidState` → compiler `nextCid` 从不递增 → `allocateMountedCid` 快照为死接线、无现实冲突（P3-2，反误报记录）。

### 覆盖率估计

- 精读（全文/近全文）：约 11,600 行 ≈ 66%。
- 模式扫描 + 定点精读：其余 form-runtime-\* 派生文件、form-path-state、form-store-diagnostics-bridge、validation/{rules,message,registry,index}、index.ts 等 ≈ 34%。
- 未逐行阅读部分均经风险模式扫描且无命中；form 家族未精读部分（form-runtime-values/status/derived-state/subtree/lifecycle/submit、array-ops、owner-external-errors/field-states/validation-utils）的公开行为均被精读文件（form-runtime.ts、form-runtime-owner.ts、form-runtime-array.ts）的调用面覆盖。

### 工具性约束

本次为只读审计：未修改 `packages/` 下任何文件、未运行 pnpm；仅引用 `docs/audits/check/00-baseline-tooling.md` 的既有工具结果（typecheck/lint exit 0；test 失败与 oversized 新红均为跨包事实，见 F-08 与 P3-9）。
