# 15 Security Performance

- 深挖轮次: 1
- 深挖发现数: 1

## 第 1 轮初审

### [维度15-01] Table column settings 在渲染循环内重复线性查找列与顺序，形成宽表 O(n²) 热路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer.tsx:291-307,350-374`
- **行号范围**: `291-307`；同类 inline 分支见 `350-374`
- **证据片段**:

  ```tsx
  {orderedColumns.map((key) => {
    const columnIndex = columns.findIndex(
      (column, index) => (column.name ?? `column-${index}`) === key,
    );
    if (columnIndex < 0) {
      return null;
    }

    const column = columns[columnIndex];
    const orderedIndex = orderedColumns.indexOf(key);
  ```

- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P2
- **现状**: `orderedColumns.map(...)` 的每次迭代都对 `columns.findIndex(...)` 和 `orderedColumns.indexOf(...)` 做线性扫描；同文件 inline column settings 分支还重复 `visibleColumns.includes(key)`。
- **风险**: 宽表列设置面板在每次 TableRenderer 渲染时构造 children，列数增长后会把列设置渲染推成 O(columns²)，并与 header/filter/selection 等表格交互重渲染叠加。
- **建议**: 在进入 JSX 前用 `useMemo` 构建 `columnsByKey: Map<string, { column, index }>`、`orderIndexByKey: Map<string, number>` 和 `visibleColumnSet`，两个 column-settings 分支复用 O(1) lookup。
- **为什么值得现在做**: table 是已明确纳入高性能 row identity / scope 性能基线的复杂 renderer；这里修复局部、低风险，并能同时消除 overlay 与 inline 两条分支的重复查找。
- **误报排除**: 这不是单纯“大文件”或风格问题，也不是测试代码；命中的是性能文档明示的“repeated id-based lookup in loops”模式。虽然 column settings 不是所有用户都会打开，但 JSX children 当前仍随 TableRenderer render 构造，且宽表列数是可增长输入。
- **历史模式对应**: 对应 `docs/architecture/performance-design-requirements.md` 的 P2 “pre-index by id before transformation” 与历史 table hot-path 拆分/row identity 性能收敛模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/table-row-identity-and-scope-performance.md`; `docs/components/table/design.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度15-02] Dialog/Drawer validationPlan 编译失败时静默降级为无验证，违反 fail-closed 与可观察性要求

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-adapter.ts`
- **行号范围**: `43-51`；调用点见 `220-229`、`270-279`
- **证据片段**:
  ```ts
  try {
    const compiled = runtime.compile({
      type: 'page',
      body,
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    return root?.validationPlan;
  } catch {
    return undefined;
  }
  ```
- **严重程度**: P1
- **类别**: 安全 / 观察性
- **规则编号**: R3 / R4 / P6
- **现状**: `resolveSurfaceValidationPlan` 在 dialog/drawer body 编译失败时直接返回 `undefined`，随后 `openDialog` / `openDrawer` 仍继续打开 surface，只是缺失 `validationPlan`。
- **风险**: 本应阻止提交或提示用户的表单验证可能因 schema 编译异常被静默跳过；同时没有 monitor/diagnostic 输出，宿主只看到弹窗正常打开，很难发现验证边界已经降级。
- **建议**: 将编译失败转为 action failure 或至少阻止创建带表单提交能力的 surface；同时通过 `env.monitor?.onError` 或结构化 diagnostics 记录失败路径、surface kind、node instance 信息。
- **为什么值得现在做**: dialog/drawer 是高频运行时入口，修复点集中在一个 helper；当前行为会把初始化失败伪装成正常无验证状态，后续排查成本高。
- **误报排除**: 这不是已裁定的 declarative surface 双状态或 lifecycle 问题；问题不是 surface open/close，而是 validation owner 初始化失败被吞掉并降级为无验证。也不是单纯开发体验日志缺失，因为代码改变了验证执行结果。
- **历史模式对应**: 对应安全设计 R3 “errors must not silently grant capability” 与 R4 “Do not swallow security-relevant initialization failures silently”；也对应性能设计 P6 “Swallowed errors that can cause hidden degraded behavior are prohibited in runtime-critical paths”。
- **参考文档**: `docs/architecture/security-design-requirements.md`; `docs/architecture/performance-design-requirements.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

### [维度15-03] ConditionBuilder 多选值渲染对 options/selected 做重复线性扫描，选项规模增长后形成 O(n²) 路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\value-input.tsx`
- **行号范围**: `173-186`、`230-236`
- **证据片段**:

  ```tsx
  const selected = Array.isArray(value) ? value.map(String) : [];

  const toggle = (itemValue: string) => {
    const next = selected.includes(itemValue)
  ...
        selected.map((v) => {
          const opt = options.find((o) => String(o.value) === v);
  ...
          {options
            .filter((o) => !selected.includes(String(o.value)))
            .map((opt) => (
  ```

- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2
- **现状**: 多选值组件在每次渲染时对 `selected` 执行 `includes`，对每个 selected 值再 `options.find`，并对所有 options 过滤时再次 `selected.includes`。
- **风险**: 条件构建器字段/枚举选项来自 schema 或远端数据时，`selected × options` 的重复线性扫描会使复杂规则编辑、搜索和选择交互退化；该路径位于表单高级控件渲染链路内，用户每次切换条件值都会触发。
- **建议**: 在渲染前用 `useMemo` 构建 `selectedSet` 和 `optionByStringValue`，badge label 与剩余 option 过滤都改为 O(1) lookup。
- **为什么值得现在做**: 修复局部、无契约变化，且与既有 Table column settings 发现属于同一类“循环内重复 id/value 查找”，可复用同一优化模式。
- **误报排除**: 不是小数组风格问题；`options` 是外部 schema 数据，规模不由组件保证。也不同于已覆盖的 `table-renderer.tsx` column settings，本问题发生在 condition-builder 多选值控件。
- **历史模式对应**: 对应 `docs/architecture/performance-design-requirements.md` P2 “For repeated id-based lookup in loops, pre-index by id (`Map`) before transformation”。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核
