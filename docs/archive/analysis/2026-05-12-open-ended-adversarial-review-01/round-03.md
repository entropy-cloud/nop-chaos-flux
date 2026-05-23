# 开放式对抗性审查 — 2026-05-12 — 第三轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：已回查近期 hidden-field 相关审查与计划；本轮不重复 5 月 6 日“runtime-registered hidden fields skip `validateWhenHidden`”已修问题，也不重复 5 月 1 日 `submitWhenHidden` 字段不存在的问题。本轮只报告 live authoring contract 中“字符串策略被接受但 runtime 只实现 object 策略”的独立残留。
> 本轮切入点：form renderer definition、compiler test、core validation model 三者对 `hiddenFieldPolicy` 的 shape 是否一致。

---

## 发现 1：`hiddenFieldPolicy` 字符串策略被 renderer contract/tests 接受，但 runtime 只实现 object shape，字符串会静默退化为默认行为

**在哪里**

- form renderer definition 公开接受字符串字面量 `'validate'` / `'ignore'`，以及 object shape：`packages/flux-renderers-form/src/renderers/form-definition.ts:89-107`
- core `HiddenFieldPolicy` 类型只有 object 字段 `validateWhenHidden` / `clearValueWhenHidden`：`packages/flux-core/src/types/validation.ts:4-7`
- compiler 在 form owner 上直接把 schema 的 `hiddenFieldPolicy` cast 进 `defaultHiddenFieldPolicy`，没有 lowering：`packages/flux-compiler/src/schema-compiler/node-compiler.ts:680-700`
- validation collection 对嵌套 form/field policy 也直接读取并保留 schema 值：`packages/flux-compiler/src/schema-compiler/validation-collection.ts:95-105,148-160`
- runtime resolver 只通过 object spread 合并 policy：`packages/flux-core/src/validation-model.ts:15-28`
- compiler 测试还明确固化了字符串 passthrough，且使用的是不在 renderer union 中的 `'validate-and-submit'`：`packages/flux-compiler/src/validation-collection.test.ts:354-368`
- runtime hidden-field 行为只检查 object 字段：`packages/flux-runtime/src/form-runtime-validation.ts:27-28,453`、`packages/flux-runtime/src/form-runtime-field-ops.ts:268,353`

**是什么**

作者侧 contract 暗示下面这种写法是合法的：

```json
{
  "type": "form",
  "hiddenFieldPolicy": "validate"
}
```

但 runtime 语义只认识：

```json
{
  "validateWhenHidden": true,
  "clearValueWhenHidden": false
}
```

中间没有把字符串 lowering 成 object。`resolveHiddenFieldPolicy()` 对字符串做 object spread 时，不会得到 `validateWhenHidden` 或 `clearValueWhenHidden`，只会产生字符索引键；后续 runtime 检查 `field.hiddenFieldPolicy.validateWhenHidden` / `clearValueWhenHidden` 时仍是 `undefined`，等价于默认 false。

更糟的是，现有 compiler test 不是防止这种漂移，而是在断言字符串应当原样 passthrough：

```ts
expect(root.validationPlan?.defaultHiddenFieldPolicy).toBe('validate-and-submit');
```

这说明测试把 runtime 不可执行的 shape 固化成了当前行为。

**为什么值得关心**

这是一个跨包 contract 断裂：

1. renderer definition 告诉 schema author 可以使用字符串快捷策略。
2. compiler/test 保留字符串，不报错、不规范化。
3. runtime 只按 object 字段执行，字符串策略不会生效。

结果是作者以为隐藏字段会参与校验或被忽略/清理，实际运行时退回默认隐藏字段不校验、不清理。该失败模式非常隐蔽，因为 schema 编译成功、validation plan 也存在，只是 policy 字段在 runtime 读取时没有任何有效属性。

**信心水平**：确定

---

## 本轮小结

本轮暴露的是 authoring sugar 没有收口到 runtime canonical shape：`hiddenFieldPolicy` 的最终执行模型已经是 object，但 renderer definition 和 compiler test 仍保留字符串历史形态。应选择一种方向收敛：要么移除字符串 contract 并让 schema validator/diagnostics 拒绝它，要么在 compiler 阶段把 `'validate'` / `'ignore'` 等字符串明确 lowering 成 runtime object policy，并删除 `'validate-and-submit'` 这类无 owner 的 passthrough 测试。

## 本轮盲区自评

- 本轮没有检查其它 form policy 字段是否也存在 authoring sugar passthrough 而 runtime 不识别的问题。
- 没有写 focused test；结论来自 renderer contract、compiler preservation、runtime object-only 读取三者的交叉核对。
- 下一轮适合切到 UI keyboard/readonly interaction，寻找与 schema/runtime contract 不同类型的用户可见缺陷。
