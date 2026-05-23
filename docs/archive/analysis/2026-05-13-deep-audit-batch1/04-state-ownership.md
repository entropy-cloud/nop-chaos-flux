# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] object-field 在父 owner 已存在时仍维护本地 working value 镜像

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:161-205,245-318,356-436`
- **证据片段**:

  ```ts
  const [resolvedValue, setResolvedValue] = React.useState(rawValue);
  const projectedValue = usesWorkingValue ? resolvedValue : rawValue;

  if (usesWorkingValue) {
    setResolvedValue(nextWorkingValue);
  }

  if (isPromiseLike(committedValue)) {
    void committedValue.then((resolvedCommittedValue: unknown) => {
      parentForm.setValue(name, resolvedCommittedValue);
  ```

- **严重程度**: P1
- **现状**: 父 `FormRuntime` / parent scope 已经拥有 `rawValue`，但 renderer 又用 `resolvedValue` 保存一份可编辑副本；并且 `childScope` / `childForm` 继续把这份本地副本作为子树读写来源。
- **风险**: object-field 子树内看到的是 `resolvedValue`，父 owner、兄弟节点、父级验证/发布读取到的仍是旧 `rawValue`，直到 `transformOut` 完成后才提交；这形成真实双源。
- **建议**: 不要在 renderer 本地维护对象值草稿。把 staged value 提升为显式 child owner / draft owner，或把 `transformIn/transformOut` 收敛到 owner 级值适配层，让 store 持有唯一当前值。
- **为什么值得现在做**: 审计基线已声明 `v1 / no compatibility burden / no transitional main-path allowances`；这不是可接受的迁移态，而是 live main path 上的 owner 镜像。
- **误报排除**: 这不是普通 UI 展开态/搜索词之类瞬态状态；`resolvedValue` 被 `projectedValue`、`createProjectedOwnerScope(...)`、`createProjectedInlineForm(...)` 直接当作子树真实值来源。
- **历史模式对应**: 对应 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 中 adjudication 4 提到的 `object-field` 历史双状态模式；但本例在 v1 基线下仍是 live owner 冲突，不能继续按“已知 tradeoff”保留。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`; `docs/architecture/form-validation.md`
- **双状态详情**: 父 owner 持有 `rawValue`；renderer 本地持有 `resolvedValue`；object-field 子树通过 projected scope/form 读取本地副本，父级其他读取路径仍读父 owner。
- **同步失败症状**: sibling / parent validation / parent publication 在 `transformOut` pending 期间可见旧值；外部重写 `rawValue` 时又会通过 effect 回灌本地状态，存在覆盖正在编辑中的 working value 的窗口。
- **复核状态**: 未复核

### [维度04-02] tree mode designer 把 treeDocument 同时放在 props、本地 state、core 中

- **文件**: `packages/flow-designer-renderers/src/designer-tree-mode.tsx:21-49`; `packages/flow-designer-renderers/src/designer-page-inner.tsx:38-50`; `packages/flow-designer-renderers/src/designer-command-adapter.ts:58-68`
- **证据片段**:

  ```ts
  const [treeDocument, setTreeDocument] = useState<TreeDocument | undefined>(inputTreeDocument);

  useEffect(() => {
    setTreeDocument(inputTreeDocument);
  }, [inputTreeDocument]);
  ```

- **严重程度**: P2
- **现状**: `treeDocument` 先从 prop 进入本地 `useState`，随后又被 `useEffect` 持续从 prop 回灌；同时 `DesignerPageInner` 把这份本地 state 暴露给 command adapter，adapter 再用它驱动 `core.replaceDocument(...)`。
- **风险**: 当前 tree document 没有单一 owner。内部编辑命令更新的是本地 state + core；外部 prop 更新时又会把 prop 覆盖回本地/core。设计器文档状态存在覆盖和回退路径。
- **建议**: 二选一收敛：要么做真正 controlled `treeDocument + onChange`；要么只把 prop 当一次性 seed / explicit replace 输入，由 core/内部 store 作为唯一 owner，删除无条件 props→state 同步链。
- **为什么值得现在做**: 设计器是高价值复杂状态区；当前主路径已经把内部命令写入和外部 prop 回灌同时保留，后续只会继续放大 owner 不清晰的问题。
- **误报排除**: 这不是“graph doc 与 tree doc 是不同表示”那么简单；同一个 `TreeDocument` 既存在于 prop，又存在于本地 state，并被命令层直接写回。
- **历史模式对应**: 对应 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 中 adjudication 4 提到的 `designer-page` props-to-state / local draft cache 模式；这里之所以保留，是因为当前代码仍保留 live props→state sync 链且没有单一外部发布 owner。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`; `docs/architecture/scope-ownership-and-isolation.md`
- **双状态详情**: 外部 `inputTreeDocument`、本地 `treeDocument`、designer `core` 内文档三处并存；命令写入命中后两者，prop 变更又回写前两者。
- **同步失败症状**: 当 host 重新提供旧的或替换后的 `treeDocument` 对象时，设计器内部尚未外发的编辑可能被覆盖；host 侧看到的 document 与设计器当前实际编辑态也可能暂时分叉。
- **复核状态**: 未复核

## 已检查但未保留的高风险候选

- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`: 有 props→state sync，但当前编辑同时写回 `rowScope.record.*`，未看到新的 live owner 冲突证据；且与重开裁定中的 `table-quick-edit-controller` 历史项重合。
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`: `openingData` 是 open-time snapshot，符合 `scope-ownership-and-isolation.md` 里“创建时求值一次，不做持续双向同步”的基线，不按双状态保留。
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
  `packages/flux-renderers-form-advanced/src/key-value.tsx`
  `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`: 这里的 `useRef` 主要是 registration / stale-closure bridge，不是 render-time owner。
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`: `compatibilityItemKeys` 是 UI identity / fallback key，不是业务值 mirror。
- `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`
  `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts`
  `packages/flux-renderers-data/src/table-renderer/use-table-filter.ts`
  `packages/flux-renderers-data/src/table-renderer/use-table-pagination.ts`
  `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts`: 这些是显式 ownership mode 分支（local / scope / controlled），当前每次只启用一个 owner，不按“冲突双源”保留。

## 深挖第 2 轮追加

### [维度04-03] `variant-field` 用本地 `userSelectedKey` 持续覆盖父 owner 的真实分型结果

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:163-179,257-314,346-406,448-589`
- **证据片段**:

  ```ts
  const [userSelectedKey, setUserSelectedKey] = React.useState<string | undefined>(undefined);
  const [detectedKey, setDetectedKey] = React.useState<string | undefined>(undefined);

  const activeKey = React.useMemo(() => {
    if (userSelectedKey) return userSelectedKey;
    if (matchedKey) return matchedKey;
    if (detectedKey) return detectedKey;
    return initialKey;
  }, [matchedKey, userSelectedKey, detectedKey, initialKey]);

  React.useEffect(() => {
    if (userSelectedKey && matchedKey === userSelectedKey) {
      setUserSelectedKey(undefined);
    }
  }, [matchedKey, userSelectedKey]);
  ```

- **严重程度**: P2
- **现状**: 父 owner 的 canonical 值在 `currentValue`，其真实分型由 `matchedKey` / `detectedKey` 从该值推导；但 renderer 又额外持有本地 `userSelectedKey`，并在 `activeKey` 计算中把它放在最高优先级。只要父值后续变化后得到的 `matchedKey` 与旧 `userSelectedKey` 不一致，这个本地键就不会被清除，当前 branch 选择将继续由本地 state 而不是父 owner 值决定。
- **风险**: `activeKey` 不只是视觉 tab 状态，它还决定 `createVariantScope(...)` 的投影内容、hidden branch 的 `notifyFieldHidden(...)`、当前 active subtree 的挂载以及 child contract 关联的 validation subtree。于是父 owner 已切换到另一种值形态时，`variant-field` 仍可能按旧 branch 运行，造成 branch owner/publication/validation 参与集与父真实值脱节。
- **建议**: 将 active variant 收敛回父 owner 的 canonical 值分型结果；如果需要保留用户手动切换，应把本地选择态限制为一次切换事务中的短暂 override，并在父值被外部写入、检测结果变化或切换提交完成后立即失效，而不是长期压过 `matchedKey`。
- **为什么值得现在做**: 当前审计基线已声明 `v1 / no compatibility burden / no transitional main-path allowances`。这里不是 harmless UI cache，而是 live main path 上“父值 owner 在一处、当前 branch owner 在另一处”的事实分裂，会直接影响投影 scope、隐藏参与和校验边界。
- **误报排除**: 这不是“active tab/selector 是合理局部 UI 状态”的普通情况。若只是展示态，它不应反过来驱动 scope 投影、hidden-field 发布和 active renderer subtree；但当前 `activeKey` 正在驱动这些 owner-sensitive 路径，因此已越过可接受 UI-local state 边界。
- **历史模式对应**: 对应 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 中 adjudication 4 的 dual-state 复发模式；但本例不同于已拒绝的纯局部交互态，因为 `userSelectedKey` 直接成为 active branch 的事实源。也与 `docs/analysis/2026-05-12-deep-audit-full/04-state-ownership.md` 中已保留的 `04-04` 相邻，后者是 projected editor 却注册 child contract；本项则是 branch 选择本身出现新的 owner 分裂。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`; `docs/architecture/variant-field.md`; `docs/architecture/form-validation.md`
- **双状态详情**: 父 owner 持有唯一 canonical `currentValue`，并可从该值推导 `matchedKey` / `detectedKey`；renderer 本地又持有 `userSelectedKey`，而 `activeKey` 优先取本地值。随后 `variantScope`、hidden branch participation、active subtree render 都跟随 `activeKey` 而不是父 canonical 值，因此同一字段的“当前值属于哪个 variant”同时存在父值分型与本地选择两套事实源。
- **同步失败症状**: 用户先手动切到某个 variant 后，若父 owner 被外部动作、初始化回灌、兄弟字段联动或 host 更新改写成另一种结构，`data-active-variant` 仍可能停留在旧 branch；此时界面继续渲染旧 editor，旧 branch 的 hidden/visible participation 也继续生效，而父 owner 实际保存的已是另一种值形态，表现为当前编辑器与真实值结构不一致、错误显示/清理命中错误分支、提交前校验参与集偏离。
- **复核状态**: 未复核

## 维度复核结论

- [维度04-01]: 驳回。`object-field` 在声明 `transformInAction` / `transformOutAction` 时允许维护 adapted draft；当前更像受支持的值适配基线，而非未裁定双源。
- [维度04-02]: 驳回。tree mode 当前基线允许外部 `TreeDocument` 作为 replace 输入，并由 core 保持 selection/history continuity；现有证据不足以证明是未支持的三重事实源。
- [维度04-03]: 保留 (P2)。`variant-field` 的本地 `userSelectedKey` 会长期压过父 canonical value 推导出的 `matchedKey`/`detectedKey`，已越过可接受 UI 瞬态状态边界。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                | 一句话摘要                                                    |
| ----- | -------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 04-03 | P2       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:163-179` | 本地 `userSelectedKey` 可长期覆盖父 owner 的真实 variant 分型 |
