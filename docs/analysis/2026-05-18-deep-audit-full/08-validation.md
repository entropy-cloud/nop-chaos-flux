# 维度 08：验证系统一致性

## 第 1 轮（初审）

### [维度08-01] 顶层非 `page` schema 不会生成 page-root fallback validation plan

- **文件**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts:534-553`
- **证据片段**:
  ```ts
  validationPlan:
    renderer.scopePolicy === 'form' || schema.type === 'page'
      ? collectValidationModel(
          Object.values(regions)
            .map((region) => region.node)
            .filter(
              (candidate): candidate is TemplateNode | TemplateNode[] => candidate != null,
            ),
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 编译
- **现状**: 顶层 validation plan 只在 `form` 或根节点 `schema.type === 'page'` 时编译。按当前基线，`SchemaRenderer` 自有 page scope 的根渲染应提供 page-root 非表单 validation owner；但对根节点是 `container` 或其他普通可含字段节点的页面级 schema，这里不会产出 root validation plan，page-root owner 会长期停留在无可执行模型状态。
- **风险**: 顶层非 `page` schema 下的字段可能完全失去 page-root fallback 校验能力，表现为 owner 一直 bootstrapping 或无模型、普通校验入口被阻塞，导致真实页面级非表单校验契约失效。
- **建议**: 将根级 validation plan 的生成条件从仅 `page` 或 `form` 改为凡是 page-owned root render 且根树内存在可收集 validation 节点时都生成 root plan；至少不要把 page-root fallback 绑定死在 `schema.type === 'page'`。
- **为什么值得现在做**: 这是 owner 建模入口缺口；一旦 schema 不以 `page` 为根但仍依赖 page-root 校验，整条校验链直接失效，不是局部 UX 问题。
- **误报排除**: 这不是在要求嵌入式 `parentScope` 场景自动造 owner。文档明确排除了 embedded parent-owned render；这里指的是自有 page scope 的顶层渲染主路径。
- **历史模式对应**: 主路径 fallback owner 缺口本身就是缺陷证据。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/references/form-validation-execution-details.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度08-02] runtime-registered 异步校验绕过 owner 级 `validating` 与治理语义

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:180-233`
- **证据片段**:
  ```ts
  async function validateRuntimeRegistrationRoot(
    sharedState: FormRuntimeValidationState,
    path: string,
    registration: RuntimeFieldRegistration,
  ): Promise<ValidationResult> {
    const capturedGeneration = sharedState.modelGeneration;
    const runId = (sharedState.validationRuns.get(path) ?? 0) + 1;
    sharedState.validationRuns.set(path, runId);
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: `registration.validate()` 或 `validateChild()` 即使返回 Promise，也只是直接 `await`；没有像 compiled async rule 那样进入 `validating` 状态、没有 async governance run、也没有 abort signal 参与取消。
- **风险**: 长耗时 runtime validator 运行期间，field 或 scope 可能仍显示为非 validating、`ready` 计算不诚实、调试快照缺失、提交或切换时无法按统一异步治理语义解释取消与过期完成。
- **建议**: 把 runtime-registration 的异步校验纳入与 compiled async rule 同一 owner-local async pipeline：显式 `validating`、统一 governance 记录、支持取消或过期落盘抑制。
- **为什么值得现在做**: 这是 validation owner 的核心一致性问题；异步校验只要存在第二条旁路，状态与调试都会持续分叉。
- **误报排除**: 这里不是要求 runtime registration 支持更多规则类型，而是指出现有 Promise 校验已在主路径运行，却没有遵守文档要求的统一 async owner 语义。
- **历史模式对应**: 不是包间风格差异，而是同一 owner 的执行合同前后不一致。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/references/form-validation-execution-details.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度08-03] 隐藏态清理未尊重 runtime registration 的 `validateWhenHidden` 覆盖

- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:307-325`
- **证据片段**:

  ```ts
  for (const [fieldPath, existingFieldState] of Object.entries(fieldStates)) {
    if (fieldPath !== path && !fieldPath.startsWith(`${path}.`)) {
      continue;
    }

    const field = getCompiledValidationField(currentValidation, fieldPath);
    if (field?.hiddenFieldPolicy.validateWhenHidden) {
      continue;
    }
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 触发
- **现状**: 隐藏子树时的错误或 validating 清理只检查 compiled field 的 `hiddenFieldPolicy`；对 runtime-registered field 的 `hiddenFieldPolicy.validateWhenHidden` 覆盖完全无感知。
- **风险**: 某个 runtime field 明确声明隐藏时仍参与校验后，一旦被隐藏，现有错误和 pending 状态仍会被立即清空，直到下一次显式重校验才恢复，造成 hidden-field 参与语义前后不一致。
- **建议**: 在 hidden subtree 清理阶段同时查询 runtime registration 覆盖策略；若 registration 指定 `validateWhenHidden: true`，不要清空该路径的 errors 或 validating。
- **为什么值得现在做**: 这是同一 hidden-field 合同在 validate entry 与 hidden transition cleanup 两个阶段的自相矛盾，容易造成难复现的隐藏态校验闪断。
- **误报排除**: 这不是质疑默认隐藏即跳过校验。问题只出在文档和现有校验入口都已承认 registration override 后，隐藏切换清理仍按默认策略硬清。
- **历史模式对应**: 同一 owner 内部合同不一致，不是包间风格差异。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-04] `code-editor` 直接绕过 compiled trigger，强制在 change 或 blur 校验

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:43-50,63-70`
- **证据片段**:
  ```ts
  if (currentForm && hasName) {
    currentForm.setValue(name, newValue);
    void currentForm.validateField(name, 'change');
  } else if (hasName) {
    currentValidationScope?.touchField?.(name);
    scope.update(name, newValue);
    void currentValidationScope?.validateAt(name, 'change');
  }
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 触发
- **现状**: `code-editor` 在 `handleChange` 与 `handleBlur` 中都直接触发校验，没有像共享 field handler 那样通过 `shouldValidateOn` 或 `shouldValidateOnOwner` 先检查 compiled `validateOn`。
- **风险**: `submit`-only、`blur`-only 或更保守触发策略的 `code-editor` 字段会提前执行校验；若带 async rule，还会产生额外请求、过早错误状态与无谓 pending。
- **建议**: 复用 `@nop-chaos/flux-renderers-form` 的 trigger 判定逻辑，或直接改用共享 field handler 路径，确保 `code-editor` 与普通字段遵守同一 compiled trigger 合同。
- **为什么值得现在做**: 这会让单个高频输入控件系统性偏离 validation trigger 规范，且最容易放大 async 校验成本。
- **误报排除**: 这不是 widget 自主交互细节。`code-editor` 已声明自己是普通 validation field，并应服从同一 `validateOn` 规则。
- **历史模式对应**: 不是局部控件私有状态，而是直接绕过共享 validation trigger 合同。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度08-05] runtime registration 的 `clearValueWhenHidden` override 仍是死配置

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-field-ops.ts:383-437`
- **证据片段**:
  ```ts
  function collectClearValueWhenHiddenPaths(
    currentValidation: CompiledValidationModel | undefined,
    path: string,
  ) {
    // ...
    const field = getCompiledValidationField(currentValidation, fieldPath);
    if (field?.hiddenFieldPolicy.clearValueWhenHidden) {
      paths.push(fieldPath);
    }
  }
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 触发
- **现状**: `notifyFieldHidden()` 隐藏时只调用 `collectClearValueWhenHiddenPaths(currentValidation, path)`；该函数只遍历 compiled `currentValidation.nodes` 并通过 `getCompiledValidationField(...)` 判断 `hiddenFieldPolicy.clearValueWhenHidden`。`RuntimeFieldRegistration.hiddenFieldPolicy` 从未参与这里的 clear-path 选择。
- **风险**: runtime-only field，或 compiled policy 为 `false` 但 runtime registration override 为 `true` 的 field，隐藏后都不会按文档约定清值；`hiddenFieldPolicy` 的 value-clear 半边合同与 runtime override 脱节。
- **建议**: 在 hidden transition 的 clear-path 收集阶段同时查询 runtime registration 覆盖策略；若 registration 指定 `clearValueWhenHidden: true`，应把该路径纳入清值集合。
- **为什么值得现在做**: 这不是与 `[维度08-03]` 相同的问题。`08-03` 是 `validateWhenHidden` 的错误或 validating 清理失配；本条是值清理分支同样漏掉 runtime override，说明 hidden-field contract 在多个子路径上系统性分叉。
- **误报排除**: 这不是要求 runtime registration 获得更多能力，而是指出现有 `hiddenFieldPolicy` override 已被暴露，却在 clear-value 分支完全不生效。
- **历史模式对应**: 同一 owner 内部的 hidden-field 合同前后不一致。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-06] `array-editor` 与 `key-value` 仍会在普通编辑时无条件触发父路径校验，绕过 compiled `validateOn`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:249-267,379-384`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:283-299,430-433`
- **证据片段**:
  ```ts
  currentForm.setValue(name, nextValue);
  void currentForm.validateField(name);
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 触发
- **现状**: `syncItems()` 与 `syncField()` 在 form 场景里直接 `currentForm.setValue(name, ...)` 后立刻 `void currentForm.validateField(name)`，没有 `shouldValidateOn(...)` 判断；子输入 `onChange` 先调用这两个 sync helper，再做子路径 trigger-gated 校验，所以父数组或对象根路径会先被强制校验一次。新增条目按钮也同样直接 `validateField(name)`。
- **风险**: `validateOn: 'submit'`、`blur` 的父级 aggregate 规则如 `minItems`、`uniqueBy` 仍会在 change 路径提前执行；若后续带 async 或重型 aggregate 规则，还会产生过早 pending、额外请求和不诚实的 owner 状态。
- **建议**: 复用共享 field handler 的 trigger 判定逻辑，或把父路径校验也纳入 `shouldValidateOn(...)` 或 owner-level trigger gate，确保 aggregate root 与普通字段遵守同一 compiled trigger 合同。
- **为什么值得现在做**: 这不是单个 widget 的小偏差。数组和对象类复合字段是聚合规则最常见的载体，提前校验会系统性放大 async 成本与错误曝光时机偏差。
- **误报排除**: 现有测试只证明 submit-only 时 UI 没提前显示父错误，并没有证明父路径校验根本没执行；本条针对的是 owner trigger 语义被提前触发，而不是最终 UI 是否立刻显示。
- **历史模式对应**: 直接绕过共享 validation trigger 合同的复合字段残留模式。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度08-07] `array-editor` 或 `key-value` 直接突变 `childPaths`，绕过 runtime child-path 重建索引

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:220-224,294-328`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:277-281,330-386`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-field-ops.ts:203-245`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-registration.ts:18-23`
- **证据片段**:

  ```ts
  if (registrationRef.current) {
    registrationRef.current.childPaths = childPaths;
  }

  if (patch.childPaths !== undefined) {
    const oldChildPaths = entry.registration.childPaths;
    // ...
    for (const childPath of patch.childPaths) {
      childPathToRegistrationId.set(childPath, registrationId);
    }
  }

  const childRegId = sharedState.childPathToRegistrationId.get(path);
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 注册
- **现状**: `array-editor` 与 `key-value` 在 `childPaths` 变化时都直接改写 `registrationRef.current.childPaths`，但没有调用 `currentForm.updateFieldRegistration(...)`。runtime 侧真正维护 child-path 可见性的来源是 `childPathToRegistrationId` 映射；该映射只会在 `registerField()` 或 `updateFieldRegistration()` 中重建，而 `findRuntimeRegistration()` 查找子路径时也只读这个映射，不读被突变后的 `registration.childPaths` 描述对象。
- **风险**: 动态增删条目后，live registration 描述与 owner-local child-path 索引会在一段时间内失步；凡是在 effect 重新 unregister/register 完成前对新子路径发起的 `validateField(...)`、子树目标收集或 runtime registration 查询，都可能把该新路径误判为没有 runtime child validator，从而漏跑 `validateChild()`。
- **建议**: 去掉对 `registrationRef.current.childPaths` 的直接突变；在 `childPaths` 变化时显式走 `currentForm.updateFieldRegistration(registrationId, { childPaths })`，让 containment 校验、旧索引删除和新索引建立都通过 runtime 统一入口完成。若仍保留重注册方案，也应避免先改写已注册对象本身。
- **为什么值得现在做**: 这是 runtime registration 合同的一致性缺口，不是单个控件的私有实现细节。复合字段后续越多复用这种改 ref 不改索引的模式，动态字段校验就越容易出现时序型漏校验。
- **误报排除**: 这里不是忽略了后面的 `registerField(...)` effect。代码确实会在 `childPaths` 依赖变化后重新注册，但那发生在被动 effect 周期；在此之前 runtime 已持有描述对象已变、`childPathToRegistrationId` 仍旧的失配窗口，而 `findRuntimeRegistration()` 明确只查 map。
- **历史模式对应**: owner-local 参与账本与可变描述对象双写失步。
- **参考文档**: `docs/architecture/form-validation.md:279-285,962-968`; `docs/architecture/flux-runtime-module-boundaries.md:329-330`
- **复核状态**: 未复核

## 维度复核结论

- [维度08-01]: 保留 (P1)。编译器仍只在 `form` 或根节点 `type === 'page'` 时产出 root `validationPlan`，而 `SchemaRenderer` 只会在 `rootNode.validationPlan` 存在时给 page-root owner `refreshCompiledModel(...)`；顶层非 `page` 的 page-owned root render 仍会卡在 bootstrapping 或无模型。
- [维度08-02]: 保留 (P2)。runtime registration 的 `validate()` 或 `validateChild()` 返回 Promise 时仍是直接 `await`，未进入 `validating` 标记、async governance、abort/cancel 统一治理。
- [维度08-03]: 保留 (P2)。`notifyFieldHidden()` 的隐藏清理仍只查 compiled field 的 `hiddenFieldPolicy.validateWhenHidden`，未尊重 runtime registration override。
- [维度08-04]: 保留 (P2)。`code-editor` 的 change 或 blur 仍直接 `validateField` 或 `validateAt`，没有走 `shouldValidateOn` 或 `shouldValidateOnOwner`。
- [维度08-05]: 保留 (P2)。`clearValueWhenHidden` 收集仍只扫 compiled model；runtime registration 的 `hiddenFieldPolicy.clearValueWhenHidden` 仍未接线。
- [维度08-06]: 降级。原结论过宽；`array-editor` 的 change 或 add 父路径校验已加 `shouldValidateOn(...)` gate，但 `key-value` 仍有无条件父路径校验，且 `array-editor` remove 仍直接 `validateSubtree(name)`。
- [维度08-07]: 降级。代码确有直接突变 `childPaths` 的坏味道，但同时存在基于 `childPaths` 变化的重注册收敛路径；当前更像瞬时时序窗口风险，不足以按稳定绕过索引重建 原级别保留。

## 子项复核结论

- [维度08-06]: 建议后续拆分复核 `key-value` 的 `syncField()` 或 add 路径是否继续保留为独立问题，以及 `array-editor` 的 remove 路径无条件 `validateSubtree(name)` 是否单列。
- [维度08-07]: 建议后续聚焦增删项后、effect 重注册前立即触发子路径校验或提交这一瞬时窗口是否可稳定复现。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                        | 一句话摘要                                                       |
| ----- | -------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 08-01 | P1       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts:534-553`                       | 顶层非 `page` schema 不会生成 page-root fallback validation plan |
| 08-02 | P2       | `packages/flux-runtime/src/form-runtime-validation.ts:180-233`                              | runtime-registered 异步校验未进入统一 validating/governance 流程 |
| 08-03 | P2       | `packages/flux-runtime/src/form-runtime-field-ops.ts:307-325`                               | hidden cleanup 未尊重 runtime override 的 `validateWhenHidden`   |
| 08-04 | P2       | `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:43-50,63-70` | `code-editor` 直接绕过 compiled `validateOn` 触发规则            |
| 08-05 | P2       | `packages/flux-runtime/src/form-runtime-field-ops.ts:383-437`                               | `clearValueWhenHidden` 的 runtime override 仍未接线              |
