# 开放式对抗性审查 — 2026-05-11 — 第三轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：`valuesPath` 的“外部 mutation 是否会污染 form store”曾在 `2026-05-10-exploratory-contract-testing-run-01` 中被主执行者探针证伪；本轮不重报 `valuesPath`，只检查其它公开读面是否仍把 live values object 当作 snapshot/result 暴露出去。
> 本轮切入点：form handle `getValues` 与默认 submit fallback 的返回值是否兑现了“snapshot / result data”应与 owner 写入路径隔离的承诺。

---

## 发现 1：`component:getValues` 和默认 submit fallback 直接返回 form store 的 live values object，把“snapshot/result”变成可变内部状态泄露

**在哪里**

- form renderer capability 合同把 `getValues` 描述为 “Read the current form values snapshot.”：`packages/flux-renderers-form/src/renderers/form-definition.ts:187-193`
- 组件文档与架构文档都把外部值读面描述为 readonly values snapshot：`docs/components/form/design.md:23-29`、`docs/architecture/form-external-publication-and-reserved-bindings.md:348-364`、`docs/logs/2026/04-24.md:5-7`
- form component handle 的 `getValues` 直接返回 `form.store.getState().values`：`packages/flux-runtime/src/form-component-handle.ts:54-55`
- form 默认 submit fallback 也直接把 `store.getState().values` 塞进 `ActionResult.data`：`packages/flux-runtime/src/form-runtime-submit-flow.ts:249-253`
- 真实调用方会把 `getValues` 结果作为普通对象继续消费：`packages/flux-renderers-data/src/crud-renderer-ownership.ts:191-207`

**是什么**

当前两个公开出口都没有返回 snapshot copy，而是直接把 form store 内部当前那份 `values` 对象原样暴露出去：

```ts
case 'getValues':
  return { ok: true, data: form.store.getState().values };
```

以及：

```ts
const executeSubmit = submitLifecycleAction
  ? () => submitLifecycleAction(options)
  : () => Promise.resolve({ ok: true, data: store.getState().values });
```

这和 `valuesPath` 是不同问题。`valuesPath` 走的是 scope publication，之前已有一次外部 mutation 探针未能证明会反向污染 form store。而这里的问题是：

1. `component:getValues` 是显式公共 capability。
2. 默认 submit fallback 把同一内部对象作为 action result 暴露给 follow-up/调用方。
3. 这两个出口都把“snapshot/result data”直接绑定到 live owner storage 引用上。

因此外部调用者拿到的不是一个与 owner 写入路径解耦的值快照，而是 runtime 当前内部容器本身。

**为什么值得关心**

这会破坏 form owner 最核心的写入边界：理论上，form 值应只通过 `setValue` / `setValues` / reset / submit lifecycle 这些 owner-controlled 路径变化，以便同步维护 dirty/touched、lastChange、依赖重校验和订阅通知。但一旦公共读面把 live `values` object 直接泄露出去，外部代码就可能：

1. 在不经过 `FormRuntime.setValue()` / `setValues()` 的情况下原地修改对象。
2. 让后续读者看到已变更的内容，但不会经过 `setLastChange`、dirty/touched、dependent revalidation 等配套流程。
3. 把“只读 snapshot / submit result data”这个作者和维护者的心智模型变成假的。

这条风险在 CRUD query bridge 上尤其敏感，因为它明确依赖 `getValues` 作为 form handle 的稳定公共 API；现在这个 API 返回的是 live object，不是 contract wording 所暗示的独立 snapshot。

**信心水平**：很可能

---

## 本轮小结

本轮确认了一条和前两轮不同类型的 contract 漏洞：不是 targeting 语义蒸发，而是 owner 读面把内部 live 容器直接伪装成 snapshot/result 暴露出去。它比 `valuesPath` 更值得关注，因为这里是显式公共 capability 和默认 submit 结果，不是内部 publication wiring 的副产品。

## 本轮盲区自评

- 本轮尚未写探针测试去证明“外部 mutation 后 form store 会静默污染且无 revalidation/notification”；结论目前基于返回引用路径与 owner write contract 的静态分析。
- 还没追 `ActionResult.data` 在 follow-up action / monitor / debugger 中是否会被进一步保留或变形，这会扩大影响面。
- 如果继续下一轮，最适合做一次 focused 证伪/证实：给 `component:getValues` 或默认 submit fallback 返回值做外部原地 mutation，观察 form store、dirty/touched、依赖重算是否保持静默。
