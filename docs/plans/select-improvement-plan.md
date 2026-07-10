# Select 组件改进计划

> Plan Status: active
> Created: 2026-07-10
> Review: 2026-07-10 独立 agent 审查通过（needs-revision → 已修订 → approved）
> Source: `docs/components/select/design.md`、live-repo audit（select renderer + `@nop-chaos/ui` Combobox）、amis-react19 对比分析

## Purpose

修复 Select 组件的"no results found"显示问题，并优化搜索过滤体验。

## Problem Statement

### 问题 1：下拉框显示"no results found"

**现象**：点击 Select 下拉框时，即使有选项数据，也显示"无匹配项"

**根因**：

- base-ui Combobox 的 `ComboboxRoot` 内部维护 `filteredItems` 状态
- 当 `items` prop 未正确传递时，内部过滤返回空数组
- `ComboboxEmpty` 组件根据 `filteredItems.length === 0` 显示"无匹配项"

### 问题 2：搜索过滤质量不足

**现象**：搜索只支持简单子串匹配，不支持模糊搜索

**对比**：
| 方案 | 匹配方式 | 优缺点 |
|------|----------|--------|
| Flux 当前 | `String.includes()` | 简单但不支持模糊匹配 |
| amis-react19 | `match-sorter` | 支持模糊匹配、排序、权重 |

## Solution

### Phase 1：修复"no results found"问题

**目标**：确保下拉框正确显示选项数据

**根因详解**：

- base-ui `ComboboxEmpty` 要求 `items` prop 存在于根组件（`ComboboxEmpty.d.ts:5`）
- 当前 renderer 没有向 `<Combobox>` 传递 `items`，导致 base-ui 无法计算内部过滤项
- renderer 独立计算 `visibleOptions`（line 245-247）并直接渲染，绕过了 base-ui 内部过滤机制

**方案**：使用 `filteredItems` prop 覆盖 base-ui Combobox 内部过滤，同时设置 `filter={null}` 完全禁用内部过滤

```tsx
// packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx
<Combobox
  open={menuOpen}
  onOpenChange={setMenuOpen}
  value={comboboxValue}
  onValueChange={interactive ? handleValueChange : undefined}
  multiple={multiple}
  disabled={effectiveDisabled}
  itemToStringLabel={(option: ChoiceOption) => option.label}
  isItemEqualToValue={(a: ChoiceOption, b: ChoiceOption) => Object.is(a.value, b.value)}
  onInputValueChange={(nextQuery: string) => setInputValue(nextQuery)}
  filteredItems={visibleOptions} // 传递已过滤的选项
  filter={null} // 禁用 base-ui 内部过滤，renderer 为唯一过滤源
>
  {/* children */}
</Combobox>
```

**为什么需要 `filter={null}`**：

- 设置 `filteredItems` 仅覆盖显示项，但 base-ui 可能仍尝试内部过滤
- `filter={null}` 完全禁用内部过滤，确保 renderer 的 `visibleOptions` 是唯一过滤源
- 避免双重过滤风险（Phase 2 的搜索改进才能正确工作）

**验证**：

- [ ] 单选下拉框正确显示所有选项
- [ ] 多选下拉框正确显示所有选项
- [ ] 搜索过滤后下拉框显示匹配项
- [ ] 无匹配项时显示"无匹配项"
- [ ] 编程验证 `ComboboxEmpty` 在有选项时隐藏（`page.locator('[data-slot="combobox-empty"]').isHidden()`）
- [ ] 分组 option 场景：`filteredItems`（扁平数组）+ 手动 `ComboboxGroup`/`ComboboxLabel` 渲染与 base-ui 正确协作

**审查记录**（2026-07-10 独立 agent 审查）：

- 根因分析正确，但需补充 `ComboboxEmpty` 要求 `items` prop 的细节
- `filteredItems` prop 已验证为有效公开 API（`AriaCombobox.d.ts:136-141`）
- 需添加 `filter={null}` 完全禁用内部过滤
- 计划范围合适，无范围蔓延

### Phase 2：优化搜索过滤体验

**目标**：提升搜索质量和用户体验

**前置条件**：Phase 1 已设置 `filter={null}` 禁用 base-ui 内部过滤，renderer 的 `visibleOptions` 是唯一过滤源。Phase 2 的搜索改进才能正确工作。

**方案**：增强 `matchChoiceLabel` 函数支持模糊匹配

```typescript
// 当前实现
function matchChoiceLabel(label: string, query: string, ignoreCase: boolean): boolean {
  if (!query) return true;
  return ignoreCase ? label.toLowerCase().includes(query.toLowerCase()) : label.includes(query);
}

// 改进方案：支持模糊匹配
function matchChoiceLabel(label: string, query: string, ignoreCase: boolean): boolean {
  if (!query) return true;

  // 精确匹配（最高优先级）
  if (ignoreCase ? label.toLowerCase() === query.toLowerCase() : label === query) {
    return true;
  }

  // 前缀匹配
  if (ignoreCase ? label.toLowerCase().startsWith(query.toLowerCase()) : label.startsWith(query)) {
    return true;
  }

  // 子串匹配
  if (ignoreCase ? label.toLowerCase().includes(query.toLowerCase()) : label.includes(query)) {
    return true;
  }

  // 模糊匹配（可选，需要引入 fuzzy matching 库）
  // return fuzzyMatch(label, query, { ignoreCase });

  return false;
}
```

**验证**：

- [ ] 搜索"adm"能匹配"Admin"
- [ ] 搜索"us"能匹配"United States"
- [ ] 搜索"uk"能匹配"United Kingdom"
- [ ] 大小写不敏感匹配

### Phase 3：添加搜索高亮（可选）

**目标**：在搜索结果中高亮匹配关键词

**方案**：在 `renderItem` 中添加高亮逻辑

```tsx
function highlightText(text: string, query: string): ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? <mark key={index}>{part}</mark> : part,
  );
}
```

**验证**：

- [ ] 搜索"adm"时，"Admin"中的"adm"被高亮
- [ ] 高亮不区分大小写
- [ ] 特殊字符正确转义

## Implementation Steps

### Step 1：修复"no results found"（1天）

1. 修改 `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`
2. 在 `Combobox` 组件上添加 `filteredItems={visibleOptions}`
3. 运行测试验证
4. 更新测试用例

### Step 2：优化搜索过滤（2天）

1. 增强 `matchChoiceLabel` 函数
2. 添加精确匹配、前缀匹配、子串匹配
3. 可选：引入 fuzzy matching 库（如 `fuse.js`）
4. 添加搜索高亮功能
5. 更新测试用例

### Step 3：文档更新（0.5天）

1. 更新 `docs/components/select/design.md`
2. 添加 base-ui Combobox 集成注意事项
3. 添加数据绑定机制对比
4. 更新决策表状态

## Risk Assessment

| 风险                         | 影响 | 缓解措施                                                         |
| ---------------------------- | ---- | ---------------------------------------------------------------- |
| base-ui Combobox 版本升级    | 中   | 锁定版本，定期检查 breaking changes                              |
| 搜索性能问题                 | 低   | 虚拟滚动已支持大数据量                                           |
| 与 amis-react19 行为差异     | 低   | Flux 有自己的数据绑定机制，不需要完全对齐                        |
| Phase 2 搜索改进产生双重过滤 | 高   | **Phase 1 必须设置 `filter={null}`**，确保 renderer 为唯一过滤源 |

## Success Criteria

1. [ ] Select 下拉框正确显示所有选项
2. [ ] 搜索过滤支持精确匹配、前缀匹配、子串匹配
3. [ ] 搜索结果高亮匹配关键词
4. [ ] 所有现有测试通过
5. [ ] 文档更新完成
6. [ ] 分组 option 场景正常工作
