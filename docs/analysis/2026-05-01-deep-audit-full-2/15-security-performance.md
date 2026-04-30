# 维度 15 审核结果：安全与性能红线（初审）

## 安全部分

### [维度15-安全-01] R2 规则合规：无 eval/new Function 违规

- **文件**: packages/\*\*/src/** 以及 apps/\*\*/src/**
- **严重程度**: (合规确认)
- **规则编号**: R2
- **现状**: 零 `eval(` 和 `new Function(` 实例。

---

### [维度15-安全-02] setIn 路径未过滤 **proto** 等危险键名

- **文件**: `packages/flux-core/src/utils/path.ts:107-117`
- **严重程度**: P3
- **类别**: 安全
- **规则编号**: R5
- **现状**: `setIn` 函数不检查 segment 是否为 `__proto__`、`constructor` 或 `prototype`。`scope.ts:87` 的 `DANGEROUS_KEYS` 守卫仅在 `materializeVisible` 中生效，`setIn` 和 `readVisible` 缺失同级保护。

```typescript
// packages/flux-core/src/utils/path.ts:107-117
const segments = parsePath(path);
let cursor: any = clone;
for (let index = 0; index < segments.length; index += 1) {
  const segment = segments[index];
  if (index === segments.length - 1) {
    cursor[segment] = value;   // ← 无 __proto__ 守卫
    break;
  }
```

- **风险**: 当前所有路径均来自 schema 编译时生成的字段名，实际风险极低。但保护不一致。
- **建议**: 在 `setIn` 中为 segment 添加 `DANGEROUS_KEYS` 守卫。

---

### [维度15-安全-03] readVisible 未过滤 DANGEROUS_KEYS，与 materializeVisible 不一致

- **文件**: `packages/flux-runtime/src/scope.ts:125`
- **严重程度**: P3
- **类别**: 安全
- **规则编号**: R5
- **现状**: `readVisible` 未过滤 ownSnapshot 中的危险键，`materializeVisible` 显式过滤了。

```typescript
// scope.ts:125 — readVisible: 无过滤
lastVisibleView = Object.assign(safeCreate(parentVisible), ownSnapshot);

// scope.ts:150-157 — materializeVisible: 有过滤
const result: Record<string, any> = {};
for (const key of Object.keys(parentMat)) {
  if (!DANGEROUS_KEYS.has(key)) {
    result[key] = parentMat[key];
  }
}
```

- **风险**: 实际影响极低，但违反了 R5。
- **建议**: 在 `readVisible` 中对 `ownSnapshot` 添加与 `materializeVisible` 相同的过滤。

---

### [维度15-安全-04] 导入失败可观测性良好 (R4 合规确认)

- **文件**: `packages/flux-core/src/utils/import-failure.ts:15-41`
- **规则编号**: R4
- **现状**: `reportImportFailure` 双通道上报（env.notify + env.monitor）。

---

### [维度15-安全-05] value-adapter 空 catch 在异常时保留原值

- **文件**: `packages/flux-core/src/value-adapter.ts:234` 和 `:262`
- **严重程度**: P3
- **规则编号**: R3
- **现状**: `transformInAction` / `transformOutAction` 的 catch 块静默返回原始值。这是 fail-safe 行为。
- **建议**: 在文档中补充说明这是设计意图。

---

## 性能部分

### [维度15-性能-01] P1 规则合规：无 JSON.stringify 变更检测

- **规则编号**: P1
- **现状**: 无 `JSON.stringify(a) === JSON.stringify(b)` 模式。变更检测使用引用比较和 revision counter。

---

### [维度15-性能-02] P3 规则合规：Zustand store 均使用不可变更新

- **规则编号**: P3
- **现状**: 所有 Zustand store 状态更新均通过 spread 操作符或 `setIn` 产生新对象。

---

### [维度15-性能-03] P5 规则合规：无 `let cancelled = false` 反模式

- **规则编号**: P5
- **现状**: 所有异步取消均使用 `AbortController`。

---

### [维度15-性能-04] form-store diffAndNotifyValuePaths 对所有订阅路径线性扫描

- **文件**: `packages/flux-runtime/src/form-store.ts:87-93`
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P7
- **现状**: 每次值变更遍历所有已订阅路径，逐个 `getIn` 比较。

```typescript
// form-store.ts:87-93
function diffAndNotifyValuePaths(before: Record<string, any>, after: Record<string, any>) {
  for (const path of pathListeners.keys()) {
    if (getIn(before, path) !== getIn(after, path)) {
      notifyPath(path);
    }
  }
}
```

- **风险**: 大型表单（500+ 字段）每次击键触发 500+ 次 getIn。
- **建议**: 维护反向索引，将通知分发从 O(N) 降至 O(changed_paths \* matched_subscribers)。已有对应计划 plan 90。

---

### [维度15-性能-05] table-renderer 列设置渲染中的 O(n\*m) 查找

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:286-297` 和 `:345-356`
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P2
- **现状**: 列设置 UI 在 `orderedColumns.map()` 内部调用 `columns.findIndex()`，形成 O(n\*m)。

```typescript
// table-renderer.tsx:286-297
{orderedColumns.map((key) => {
  const columnIndex = columns.findIndex(
    (column, index) => (column.name ?? `column-${index}`) === key,
  );
```

- **风险**: 不在热渲染路径上。典型表格列数 < 50，实际影响可忽略。
- **建议**: 用 `useMemo` 预建 Map，O(1) 查找。

---

### [维度15-性能-06] 虚拟化覆盖评估 (合规确认)

- **规则编号**: P6
- **现状**: 表格行使用 `@tanstack/react-virtual`，电子表格通过 viewport 计算实现手动虚拟化。

---

### [维度15-性能-07] 热路径无 performance.mark/measure (观察项)

- **文件**: packages/\*\*/src/\*\*
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P6
- **现状**: 零 `performance.mark/measure` 实例。性能敏感路径没有结构化性能埋点。
- **建议**: 在 scope 读取、校验执行、表格数据处理等关键路径添加可选埋点。

---

## 总结

| 类别 | P0  | P1  | P2  | P3  | 合规确认 |
| ---- | --- | --- | --- | --- | -------- |
| 安全 | 0   | 0   | 0   | 3   | 2        |
| 性能 | 0   | 0   | 1   | 2   | 4        |

## 维度复核结果

| 编号         | 初审 | 复核        | 理由                                     |
| ------------ | ---- | ----------- | ---------------------------------------- |
| 安全-01      | 合规 | **保留**    | 全量 grep 确认零 eval/new Function       |
| 安全-02 (P3) | 保留 | **保留**    | 代码确认无过滤；不存在全局原型污染风险   |
| 安全-03 (P3) | 保留 | **保留**    | 与 materializeVisible 保护标准不一致确认 |
| 安全-04      | 合规 | **保留**    | import-stack 错误处理链确认              |
| 安全-05 (P3) | 保留 | **保留**    | 静默吞没确认                             |
| 性能-01      | 合规 | **保留**    | 69 处全部非热路径                        |
| 性能-02      | 合规 | **保留**    | 全部热路径使用 spread/setIn              |
| 性能-03      | 合规 | **保留**    | 零 let cancelled = false                 |
| 性能-04 (P2) | 保留 | **保留**    | 线性遍历确认                             |
| 性能-05 (P3) | 保留 | **保留**    | 仅用户交互时触发                         |
| 性能-06      | 合规 | **保留**    | 条件虚拟化确认                           |
| 性能-07 (P3) | 保留 | **保留**    | 零 performance 插桩确认                  |
| 补充-01      | 新增 | **新增 P3** | scope.merge 未过滤 DANGEROUS_KEYS        |

复核新增：scope.merge DANGEROUS_KEYS 过滤缺失 (P3)。其余全部保留。
