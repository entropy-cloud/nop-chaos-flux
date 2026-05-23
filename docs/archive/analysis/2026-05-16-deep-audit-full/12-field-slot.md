# 维度 12：表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] slot param 校验只屏蔽固定保留名，仍允许任意 `$foo` 参数名进入 slot namespace

- **文件**: `packages/flux-compiler/src/schema-compiler/regions.ts:23-33`
- **证据片段**:

  ```ts
  const RESERVED_SLOT_PARAM_NAMES = new Set(['$parent', '$name', '$key', '$depth']);

  if (RESERVED_SLOT_PARAM_NAMES.has(name)) {
    throw new Error(
      `Region ${regionPath} declares reserved param name "${name}". ` +
        'Names starting with "$" are reserved for slot-frame metadata.',
    );
  }
  ```

- **严重程度**: P1
- **现状**: 注释/文档宣称 `$` 前缀保留，但实现只拒绝 4 个固定名字。
- **风险**: author 可声明 `$foo` 之类参数，侵入 slot metadata 命名空间。
- **建议**: 改为统一拒绝 `name.startsWith('$')`。
- **为什么值得现在做**: 这是低成本但明确的 contract 修正。
- **误报排除**: 不是建议扩展规则；是实现没有兑现自己写下的命名保留契约。
- **历史模式对应**: reserved namespace under-enforced。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

### [维度12-02] deep extracted region 在 compile 路径已支持，但 validation traversal 仍不可见

- **文件**: `packages/flux-compiler/src/schema-compiler/shape-validation.ts:522-567`
- **证据片段**:

  ```ts
  if (rule.kind === 'region') {
    analyzeSchemaInput(value, `${path}.${rule.regionKey ?? key}`, ...)
  }

  if (rule.kind === 'value-or-region' && isSchemaInput(value) && ...) {
    analyzeSchemaInput(value, `${path}.${rule.regionKey ?? key}`, ...)
  }
  ```

- **严重程度**: P1
- **现状**: compile 已能识别 table column 等 deep region，但 validation 只遍历顶层 `region` / `value-or-region`。
- **风险**: 嵌套 region 子节点可绕过 shape validation，造成 compile/validate 行为不一致。
- **建议**: 让 validation 重用 deep normalizer / nested-region extraction 逻辑。
- **为什么值得现在做**: 这是编译与验证 contract 对不齐的真实缺口。
- **误报排除**: 不是在说 runtime compile 本身坏了；问题是 compile-aware、validation-blind 的不对称。
- **历史模式对应**: compile/validate parity gap。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

### [维度12-03] `onMount` / `onUnmount` 的文档表述容易被误读为普通 `event` 字段

- **文件**: `docs/architecture/field-metadata-slot-modeling.md:相关段落`
- **证据片段**:
  ```md
  `onXX` 风格字段通常建模为 event ...
  ```
- **严重程度**: P3
- **现状**: 初审把这条记为建模违约候选，但 code 其实明确把 lifecycle 走独立通道。
- **风险**: 如果不降级，会把 docs wording ambiguity 当成实现缺陷。
- **建议**: 在最终结论中只保留为文档歧义，不作为主发现推动改码。
- **为什么值得现在做**: 保证维度文件只保留证据强的结论。
- **误报排除**: 代码没有把 lifecycle 错当 event；问题只在文档表述边界。
- **历史模式对应**: wording ambiguity downgrade。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度12-01]：保留 (P1)。`$` 保留命名空间 under-enforced。
- [维度12-02]：保留 (P1)。compile/validate parity gap 成立。
- [维度12-03]：降级为 P3。属于文档歧义，不是 live 建模错误。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                     | 一句话摘要                                              |
| ----- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| 12-01 | P1       | `packages/flux-compiler/src/schema-compiler/regions.ts:23-33`            | slot param 校验仍允许任意 `$foo` 名称进入保留命名空间   |
| 12-02 | P1       | `packages/flux-compiler/src/schema-compiler/shape-validation.ts:522-567` | deep extracted region compile-aware 但 validation-blind |
| 12-03 | P3       | `docs/architecture/field-metadata-slot-modeling.md`                      | lifecycle 字段与普通 event 字段的文档边界不够清晰       |
