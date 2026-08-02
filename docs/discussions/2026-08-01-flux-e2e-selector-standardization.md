# Flux 控件 E2E Selector 标准化分析报告

> 日期：2026-08-01
> 范围：跨项目分析——分析对象 `nop-entropy-e2e/packages/e2e-shared`（`FluxAdapter` / `AmisAdapter`），改进落点 `nop-chaos-flux`（flux 渲染器）。
> 目标：让 e2e 测试“更简单准确地定位 flux 控件，并知道如何获取/设置它的值”，用稳定的 DOM 契约属性替换当前的“试错探测”。

---

## 1. 背景与现状

### 1.1 e2e-shared 的抽象架构

`e2e-shared` 用经典的 **适配器 + Page Object** 模式抽象了两套渲染引擎（AMIS / Flux）：

```
EngineAdapter (types.ts)            ← 接口：crudContainer / rows / cellValue /
   ├─ FluxAdapter (FluxAdapter.ts)     formField / setFieldValue / selectOption ...
   └─ AmisAdapter (AmisAdapter.ts)
        ▲
        │ 调用
   CrudListPage.ts / FormDialog.ts  ← Page Object，面向测试用例
```

接口统一了**方法签名**，但**没有统一定位语义**——每个 adapter 各自用引擎特定的 selector 实现。

### 1.2 FluxAdapter 当前的 selector 实情

通读 `FluxAdapter.ts`（475 行），字段“定位 + 取值/赋值”是用一套**多分支试错**机器实现的。典型证据：

**字段定位**分散在至少 3 种 selector，按控件类型不同而不同：

```ts
// formField：input/textarea 按 name，combobox 按 id
dialog.locator(`input[name="${f}"], textarea[name="${f}"], #${f}-control`)
// boolean → checkbox：id 在 wrapper label 上，不是 interactive 元素
`#${f}-control-label [data-slot="checkbox"][role="checkbox"]`
// boolean → switch：同上
`#${f}-control-label [data-slot="switch"][role="switch"]`
// combobox：按 id
`#${f}-control`;
```

**赋值 `setFieldValue`（FluxAdapter.ts:134-244）** 是一条 ~110 行的探测链，每一层都要 `.count() > 0` 试探 DOM 是否存在：

1. `typeof value === 'boolean'` → 探 checkbox → 探 switch
2. native input/textarea/select → 探 tagName / type / 是否在 combobox 内 / 是否 disabled
3. combobox → 点 trigger → 等 popup → 按**文本**匹配选项（还可能重试一次）
4. fallback → `getByLabel`

**选项匹配（`clickVisibleComboboxItem`:256-270）** 只能按文本模糊匹配，且要兼容字典 `value-label` 格式：

```ts
text === val || text.startsWith(`${val}-`) || text.includes(val);
```

**表格单元格取值（`cellValue`:21-37）** 靠列索引，还要处理“占位空表头导致整体偏移”的修正逻辑。

---

## 2. 痛点清单（带确凿证据）

| #   | 痛点                             | 证据                                                                                                                                    | 后果                                                                                                                                                |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **字段名没有统一钩子**           | `field-frame.tsx:220-233` 根元素输出 `data-field-visited/touched/dirty/invalid/mode`、`data-cid`、`data-testid`，**唯独没有 name**      | checkbox/switch 的 `${name}-control` id 还不在 interactive 元素上（在 wrapper label，形如 `${name}-control-label`），adapter 不得不用 3 套 selector |
| P2  | **控件类型靠运行时探测**         | `setFieldValue` 用 tagName/role/data-slot/aria 反推类型                                                                                 | 110 行试错链，每个分支 `count()>0`，慢且脆                                                                                                          |
| P3  | **combobox 选项无 value 钩子**   | `field-controls-dom-contract.test.tsx:243-269` 明确断言“combobox-item 无 data-value，必须按文本定位”                                    | 选项只能文本模糊匹配，字典 `1-男` 格式有歧义风险                                                                                                    |
| P4  | **表格 cell 无字段标识**         | `table-body-row-rendering.tsx:434-460` 的 `<TableCell>` 只输出 `className/style/data-fixed`，`column.name` 仅作 React `key`（不进 DOM） | `CrudListPage.findRowByField` 的 `[data-field]` **永远失效**，靠 `td:nth-child(2)` 兜底；`cellValue` 靠列索引+占位偏移修正                          |
| P5  | **combobox 点击绕过 Playwright** | `clickVisibleComboboxItem` 用 `page.evaluate` 原生 click                                                                                | Base UI combobox-item 的 actionability 检查会静默超时，被迫降级                                                                                     |
| P6  | **跨引擎 selector 不可复用**     | FluxAdapter（`data-slot`/id）vs AmisAdapter（`cxd-` class/`data-amis-name`）实现差异巨大                                                | 接口只统一签名，新引擎/新控件要重写一遍试错链                                                                                                       |

**根因一句话**：渲染器把“字段名”和“控件语义类型”当作内部实现细节，没有暴露为稳定的 DOM 契约；e2e 层被迫从派生的 DOM 结构（id/slot/role/tagName）反推，这些派生信号又因控件类型不同而碎片化、且会被 Base UI 内部 id 机制打断。

---

## 3. 改进方案

核心思想：**把“如何定位一个字段、它是什么控件、它的选项 value 是什么”提升为渲染器公开的 DOM 契约**，让 selector 从“探测”变成“直读”。所有改动都是**纯新增属性**，向后兼容，且已有 `field-controls-dom-contract.test.tsx` 契约测试保护。

### 方案 A（推荐，分优先级）

#### A0 · 字段根元素统一暴露 `data-field={name}` 【P0，收益最大】

落点：`packages/flux-react/src/field-frame.tsx:221` 的根 `<Tag>`。

```tsx
<Tag
  {...rootProps}
  className={cn('nop-field', className)}
  data-field={name || undefined}      // ← 新增：唯一稳定的字段名钩子
  data-label-align={resolvedLabelAlign}
  // ...其余不变
>
```

**命名**：表单字段根与表格 `<td>`（A2）统一用 `data-field`——语义一致（都是“字段名”），且 selector 始终带 scope（`dialog` 查表单字段、`row` 查 td），不交叉。这也让 `CrudListPage.findRowByField` 现有的 `[data-field]` 直接生效（此前因 flux 不输出该属性而失效）。

**为什么这一个属性就能解决 P1/P2 的大头**：定位到字段根后，所有控件类型都落在同一个根下；adapter 不再需要为 checkbox/switch/input/combobox 各写一套按 name 的 selector。控件类型本来就已由字段内部的 `data-slot`（`input`/`textarea`/`checkbox`/`switch`/`combobox-trigger`/`input-group-control`/`radio-group-wrapper`）清晰区分——缺的只是“把 name 绑到统一根上”这一步。

#### A1 · combobox 选项暴露 `data-value={option.value}` 【P1】

落点：select renderer 的选项渲染处（ComboboxItem 封装层）。当前契约明确“无 data-value”——主动**改契约**，让选项可按 value 精确选择。

#### A2 · 表格 `<td>` 暴露 `data-field={column.name}` 【P1】

落点：`table-body-row-rendering.tsx` 中所有 `<TableCell>` 分支（普通列 :434、cellRegion :376、operation :342、quickEdit :405）。

```tsx
<TableCell
  key={column.name ?? `op-${columnIndex}`}
  data-field={column.name || undefined}     // ← 新增
  data-field-type={column.type || undefined} // ← 可选：列类型（operation/normal…）
  // ...其余不变
>
```

直接消灭 P4 的列索引偏移问题。

#### A3 · 字段根暴露 `data-renderer={rendererType}` 【P1，低成本】

让 `setFieldValue` 能一次性 `getAttribute('data-renderer')` 确定性分派，不再组合读内部 data-slot/role/tagName。

**落点比预想更省**：`rendererType`（即 schema 控件类型，如 `input-text`/`select`/`checkbox`/`input-number`）运行时已现成（`templateNode.rendererType`），且已在 `NodeMetaContext`（`node-renderer-providers.tsx:99`）。当前它只经 `use-node-debug-data.ts` 在 `debugEnabled` 时写入内存调试注册表，**未进 DOM**。field-frame 用 `useCurrentNodeMeta()` 即可读到，在根 `<Tag>` 一处输出 `data-renderer={type}`，所有 wrap 字段即获得类型标记——**无需各 renderer 透传**。

---

### 方案 B（配合）：e2e-shared 用新属性重写 selector

基于方案 A 的契约，`FluxAdapter` 重写为确定性逻辑：

```ts
// before：3 套 selector + 探测
formField(dialog, name) {
  return dialog.locator(
    `input[name="${name}"], textarea[name="${name}"], #${name}-control`,
  );
}
// setFieldValue：110 行 4 分支 count()>0 试探……

// after：1 套 selector，按 data-slot 确定性分派
formField(dialog, name) {
  return dialog.locator(`[data-field="${name}"]`);
}
async setFieldValue(scope, name, value) {
  const field = scope.locator(`[data-field="${name}"]`).first();
  // 字段内部 data-slot 已能区分类型，无需探测 tagName/role
  if (typeof value === 'boolean') {
    const w = field.locator('[data-slot="checkbox"], [data-slot="switch"]').first();
    if ((await w.getAttribute('aria-checked') === 'true') !== value) await w.click();
    return;
  }
  const native = field.locator('input:not([role="combobox"]), textarea').first();
  if (await native.count()) { await native.fill(String(value)); return; }
  // select：用 data-value 精确匹配，替代文本模糊匹配
  const trigger = field.locator('[data-slot="combobox-trigger"], [role="combobox"]').first();
  await trigger.click();
  await field.page().locator(`[data-slot="combobox-item"][data-value="${value}"]`).click();
}
```

```ts
// 表格选项 before：文本模糊匹配 "1-男"
text === val ||
  text.startsWith(`${val}-`) ||
  text.includes(val)
  // after：按 value 精确
  `[data-slot="combobox-item"][data-value="${value}"]`;
```

```ts
// 表格 cell before：列索引 + 占位偏移修正（cellValue:21-37）
const index = headers.indexOf(fieldName);
row.locator(`td:nth-child(${index + 1})`); // 还要 slice(1) 修占位列
// after：按字段名直读
row.locator(`td[data-field="${fieldName}"]`);
```

`cellValue` 中约 30 行的占位列偏移修正逻辑（`rowHasLeadingSpecialCell` 等）可整体删除。

---

### 方案 C（可选，补充）：显式 `data-testid` 通道

`field-frame.tsx:225` **已经支持** `data-testid={testid}`（schema 可声明）。对于“高价值、易变”的关键场景字段，允许 schema 显式声明 `testid` 作为定位器，完全解耦视觉实现。缺点是需逐字段声明、迁移成本高，不适合作为通用 PO（按 fieldName 批量操作）的主方案——作为 A 的补充即可。

---

## 4. 方案对比

| 维度       | 方案 A（渲染器契约属性）                 | 方案 B（e2e 重写）      | 方案 C（显式 testid） |
| ---------- | ---------------------------------------- | ----------------------- | --------------------- |
| 解决根因   | ✅ 从源头补齐契约                        | ❌ 只重写探测，契约仍缺 | ⚠️ 部分（逐字段）     |
| 改动面     | field-frame + select + table（渲染器侧） | FluxAdapter（e2e 侧）   | 每个 schema           |
| 向后兼容   | ✅ 纯新增属性                            | ✅ 可渐进迁移           | ✅                    |
| 通用性     | ✅ 所有字段/控件自动获得                 | —                       | ❌ 需逐个声明         |
| 依赖方案 A | —                                        | ⚠️ 依赖 A 才能简化      | 独立                  |

**结论：A 为主（A0 必做、A1/A2 强烈建议、A3 可选），B 配合消费，C 补充。**

---

## 5. 落地步骤

1. **A0**：`field-frame.tsx` 根 `<Tag>` 加 `data-field={name || undefined}`。
2. **A2**：`table-body-row-rendering.tsx` 所有 `<TableCell>` 分支加 `data-field={column.name || undefined}`。
3. **A1**：定位 select renderer 选项渲染处，给 combobox-item 加 `data-value={option.value}`。
4. **契约**：更新 `field-controls-dom-contract.test.tsx`（A0/A1），新增表格 cell 契约断言（A2）。
5. **B**：`FluxAdapter` 用新属性重写 `formField`/`setFieldValue`/`clickVisibleComboboxItem`/`cellValue`/`searchField`，删除探测与偏移修正逻辑。
6. **回归**：nop-entropy e2e 全量回归；跨仓库（flux 渲染器先发版、e2e-shared 后升级）协调发布节奏。

---

## 6. 风险与注意事项

- **类型来源已就绪（A3）**：`rendererType` 已在 `NodeMetaContext` 中，field-frame 经 `useCurrentNodeMeta()` 即可取得，一处输出 `data-renderer` 覆盖所有 wrap 字段，成本远低于初版设想的“各 renderer 透传”。非 wrap 控件（容器/纯展示）如需类型标记，可在节点渲染层补一处。
- **name 可空**：无 `name` 的字段（纯展示/布局）不输出 `data-field`/`data-field`，与现有 `controlId`（`name ? ... : undefined`）语义一致。
- **性能**：可忽略。`data-field` 是 string 属性（一次 `setAttribute`），不增加 DOM 节点数；表单字段几十个无感；表格 N×M 个属性为亚毫秒级，且 `column.name` 稳定 + row memo（`MemoizedDataRow`）不触发额外 re-render，相对表格整体渲染占比 <1%。现有常驻的 `data-slot` 数量更大也无问题。
- **无需调试开关**：`data-field` 是契约属性（与常驻的 `data-slot` 同类），生产必须常驻。若用调试开关 gated，e2e 只能在“调试态”运行而生产 DOM 缺该属性，测试即脱离真实生产行为——属测试反模式。调试开关仅适合临时诊断信息（如 cid、trace）。
- **跨仓库节奏**：A 在 `nop-chaos-flux`，B 在 `nop-entropy`，需先发 flux 渲染器、e2e-shared 再升级；过渡期保留旧 selector 作 fallback。
- **契约测试即文档**：新增属性必须在 `field-controls-dom-contract.test.tsx` 立档，避免下游再次试错（这正是该测试文件存在的初衷）。

---

## 7. 一句话总结

> Flux 渲染器没有把“字段名”作为 DOM 契约暴露，导致 e2e 只能从碎片化的派生信号（id/slot/role/tagName）反推，并因 Base UI 内部 id 机制在 checkbox/switch 上断裂。
> **最小且收益最大的改动：给 `field-frame` 根元素加 `data-field={name}`，给 combobox-item 加 `data-value`，给表格 `<td>` 加 `data-field`**——即可把 FluxAdapter 的“试错探测链”替换为“按契约直读”，并删除列索引偏移修正等大量脆弱代码。
