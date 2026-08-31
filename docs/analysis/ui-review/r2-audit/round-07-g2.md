# R2 第 7 轮递归扩展发现（round-07-g2，收敛终判轮·最严格价值判据）

> 组号: G2（form / form-advanced） · 轮次: Round 07（收敛终判轮，最严格价值判据） · 审查日期: 2026-08-29 · agent: general（fresh session，只读审查）
> 派发机制: 提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md`；输入清单 = `round-01.md`（Grep `\[G2-` 精读 19 条）、`round-02-compact.md`（全文 8 条）、`round-03-compact.md`（全文 3 条）、`round-04.md`（Grep `\[G2-` 精读 3 条）、`round-05-g2.md`（全文精读，含"核对过不立案"清单与收敛声明）、`round-06-g2.md`（全文精读，含 8 项弃报留档）；`dedup-baseline.md` §1–§4 强制生效；累积已知发现 274 条（G2 组 36 条）
> 终判口径: 仅立案"前 6 轮所有方法面都未触及的全新根因 + 真实用户影响检验 + 与 274 条逐根因比对为全新"的条目；新实例须注明引根且修复互不覆盖。已有根因复述、纯视觉偏好、零散细节、已弃报候选翻案（无新事实）一律弃报并留档。

---

## 发现（HIGH 0 / MEDIUM 2 / LOW 0，共 2 条）

### [G2-R7-视角9-01] icon-picker 图标网格以 200+ 个独立 Tab 停留点承载 listbox 语义：无 roving、无方向键模型，键盘用户被 Tab 序淹没——与同包 tree-option-list 的 roving 基线同族分裂

- **文件**: `packages/flux-renderers-form-advanced/src/icon-picker.tsx:39,213-244,246-258`；对照基线 `packages/flux-renderers-form-advanced/src/tree-option-list.tsx:89-91,345-352`
- **证据片段**:
  ```tsx
  // icon-picker.tsx:39 — 每页渲染 200 个图标（点击 show more 后 400/600…）
  const VISIBLE_STEP = 200;
  // :213-217 — 容器声明 ARIA listbox（APG 契约：选项不应逐个 Tab，应方向键漫游）
  <div className="grid max-h-72 grid-cols-6 gap-1 overflow-y-auto p-2"
    role="listbox" aria-label={t('flux.form.iconList')}>
  // :227-241 — 每个选项都是独立可聚焦 Button，无 tabIndex 收敛、无 onKeyDown 方向键处理
  <Button key={iconName} variant="ghost" role="option"
    aria-selected={isSelected} aria-label={iconName} title={iconName}
    className={cn('size-8', isSelected && 'bg-accent ...')}
    onClick={() => selectIcon(iconName)}>
  ```
  ```tsx
  // tree-option-list.tsx:89-91,352 — 同包大容量选项列表的既有键盘基线：roving + activedescendant
  tabIndex={props.disabled ? -1 : focused ? 0 : -1}
  onKeyDown={props.disabled ? undefined : handleKeyDown}
  aria-activedescendant={activeDescendantId}
  ```
- **严重程度**: MEDIUM
- **现状**: 图标网格声明 `role="listbox"` + 子项 `role="option"`（ma5-ux [视角3-02] 修复了语义声明），但键盘模型停留在"每个选项一个 Tab 停留点"：默认渲染 200 个可聚焦 `Button`（`VISIBLE_STEP = 200`，点两次 show more 后 600 个），方向键完全无行为（无 onKeyDown、无 aria-activedescendant），焦点从搜索框进入网格后需按 Tab 最多 200+ 次才能到达"显示更多"或清空按钮，读屏用户在 listbox 契约下期望的方向键漫游不存在。同包 `tree-option-list.tsx`（:89-91 roving tabIndex、:352 aria-activedescendant、方向键 handleKeyDown）已为"大容量选项列表"建立了完整键盘基线；[G4-R3-视角9-01]（calendar 约 100 个惰性 gridcell 淹没 Tab 序）为跨包同族先例。icon-picker 是该基线的第三处分裂点。
- **行业惯例**: ARIA APG listbox/grid 模式：容器单焦点 + `aria-activedescendant` 或 roving tabindex + 方向键移动（shadcn/ui 的 Combobox/Select 选项层由 Base UI 自动实现该模型）；Ant Design 的图标/栅格选择器同样单 Tab 停留点 + 方向键。
- **用户影响**: 键盘用户在 icon-picker 弹层选图标：Tab 进网格后每个图标都要单独按 Tab（200 次起步），方向键无响应，退出网格或触达"显示更多"的成本随图标数线性膨胀；读屏用户听到"列表框 200 个选项"却只能逐个 Tab 巡航。非构造场景：搜索不到目标时浏览图标网格是该组件的核心用法之一。通过真实用户影响检验。
- **建议**: 按 `tree-option-list.tsx:89-91,345-352` 的既有同包模型改造：网格容器持焦（`tabIndex={0}` + `onKeyDown` 处理 ArrowRight/Left/Up/Down，6 列步进换行）+ `aria-activedescendant` 指向当前项（选项 Button 改 `tabIndex={-1}` 保留 Enter/Space 原生激活），或最小改法——网格容器统一处理方向键并把选项收敛为 roving tabIndex（仅选中项/首项 `tabIndex={0}`）。补一条"Tab 进网格仅 1 个停留点 + ArrowDown 移动 aria-activedescendant"的断言。
- **引根声明**: 同族引根 = [G4-R3-视角9-01]（calendar 惰性焦点停留点淹没 Tab 序，scheduling 包）；本条为 form-advanced 包新实例，组件、修复面（icon-picker 网格 roving vs calendar gridcell 收敛）互不覆盖；与 ma5-ux [视角3-01]（focus ring，已修复）、[G2-视角9-01]（picker listbox 语义缺失）根因不同（键盘漫游模型 vs 语义声明 vs 焦点可见性）。
- **复核状态**: 未复核

---

### [G2-R7-视角4-01] condition-group 的 maxItemsPerGroup 门禁只覆盖"添加条件"通道："添加分组"按钮无门禁且 handler 无检查，配置上限被静默绕过，同栏两按钮门禁语义自相矛盾

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:161-168,186,411-437`
- **证据片段**:
  ```tsx
  // :161-168 — handleAddGroup 无任何 atMaxItems 检查
  const handleAddGroup = useCallback(() => {
    const newGroup: ConditionGroupValue = { id: genId('group'), conjunction: 'and', children: [] };
    onChange({ ...value, children: [...value.children, newGroup] });
  }, [value, onChange]);
  // :186 — 上限按 children 计（嵌套分组同为 children，即组件自身语义认定分组计入上限）
  const atMaxItems = maxItemsPerGroup != null && value.children.length >= maxItemsPerGroup;
  // :411-437 — 达上限 + 可嵌套时：addCondition 被隐藏（:413 !atMaxItems），addGroup 照常渲染可点（:426 只有 canNest）
  {(!atMaxItems || canNest) && (
    <div className="flex items-center gap-1.5 px-3 pb-3">
      {!atMaxItems && ( <WrappedFieldAction ... onClick={handleAddCondition}>…{addConditionLabel}</WrappedFieldAction> )}
      {canNest && !atMaxItems && <span className="text-muted-foreground/40 text-xs">|</span>}
      {canNest && ( <WrappedFieldAction ... onClick={handleAddGroup}>…{addGroupLabel}</WrappedFieldAction> )}
  ```
- **严重程度**: MEDIUM
- **现状**: `atMaxItems` 按 `value.children.length` 计数——嵌套分组与条件项**同为 children**，即组件自身的上限语义已把分组计入。但该门禁只接到"添加条件"通道（达上限即隐藏按钮，:413），"添加分组"通道双重失守：按钮渲染条件 `:426 {canNest && (` 不含 `!atMaxItems`，`handleAddGroup` 也无检查。结果：`maxItemsPerGroup: 5` 配置下用户加满 5 项后，"+ 添加条件"消失而"+ 添加分组"仍可点击，点击即写入第 6 个 child（空分组），上限被静默突破；且空分组自身 footer 又带"+ 添加分组"，可在顶层无限连锁添加空分组。用户可见的矛盾：同一 footer 内两个添加钮一个消失一个健在，消失/保留遵循的却是同一个计数。
- **行业惯例**: 查询条件构建器的容量上限应约束全部新增通道（Ant Design 条件构造/AG Grid filter builder 类组件的 max 约束作用于面板整体新增动作）；同面板同计数下"一个新增口被禁、另一个放行"在参照系统（shadcn/ui 表单族 / AntD / MUI）中均无先例。
- **用户影响**: 作者配置 `maxItemsPerGroup` 限定查询复杂度（该配置唯一用途），用户达上限后仍可经分组通道继续添加，约束静默失效——提交的查询复杂度超出作者预期；同时"添加条件消失/添加分组健在"的矛盾呈现让用户无从理解规则是什么。通过真实用户影响检验（按钮消失与越限添加都是正常使用路径上的直接可见事件）。
- **建议**: 两点最小改：① `:426` 渲染条件补 `!atMaxItems`（`{canNest && !atMaxItems && (`），与 addCondition 通道同语义；② `handleAddGroup` 开头加 `if (maxItemsPerGroup != null && value.children.length >= maxItemsPerGroup) return;` 防御（footer 之外的路徑/编程调用兜底）。落"达上限后两个添加钮行为一致"的断言。另请与 [G2-R2-视角4-02] 的修复批次（达上限计数+说明）合并验收，避免两处口径再分叉。
- **引根声明**: 上限门禁族引根 = [G2-R2-视角4-02] + round-03 去重备忘 2（达上限静默隐藏无计数——**反馈缺失**根因）；[G2-R4-视角5-02]（并发窗口计数基准错误——**异步计数**根因）。本条为第三种根因：**通道覆盖缺失**（第二新增通道完全未接门禁），与两条已有条目的修复点（计数提示 / 并发基数）互不覆盖；round-03 备忘仅登记"addCondition 隐藏分支应并入反馈批次"，未覆盖 addGroup 绕过面。
- **复核状态**: 未复核

---

## 去重自检（与全部 274 条按根因比对 + dedup-baseline §1–§4）

- **[G2-R7-视角9-01]**:
  - vs **[G4-R3-视角9-01]**（calendar 时段 gridcell 惰性 Tab 停留点）：同族跨包新实例，已按 dedup §1"同类根因的新实例算新发现"与递归盲区 1"修一处必须查全类"上报，引根已注明；修复面（icon-picker 网格 vs calendar 视图 gridcell）互不覆盖。
  - vs **ma5-ux [视角3-01] / [视角3-02]**（icon-picker focus ring / listbox 语义，均已修复）：本条是**键盘漫游模型**缺失——语义声明在位、焦点 ring 在位，唯独方向键/roving 不存在，三者在同一文件但根因、证据行、修复均不同。
  - vs **[G2-视角9-01]**（picker-option-list 缺 role="option"）：彼为语义声明缺失，本条组件为 icon-picker 且语义已在位；彼的建议修复（补 option 语义）不会带来键盘模型，互不覆盖。
  - vs **[G2-R2-视角8-01]**（步进控件点击目标 <24px）：触达尺寸 vs 键盘漫游，不同。
  - vs **tree-option-list 对照**：本条以同包 roving 基线为"内部一致性"依据（视角10），非报 tree 的问题。
  - dedup §1：非 ma5-ux 已修复项复述；§2：非 G-A~G-M 表象（键盘漫游是 ARIA APG 模式实现，非"键盘导航框架"G-B2 的 renderer 级能力缺口——G-B2 指 chord/peek/多选/重排的应用级框架，单组件 listbox 键盘模型属 ARIA 模式合规）；§3：非 8 条误报对照（不涉 opacity-0/ml-auto/ghost/icon 尺寸/截断/role=button div/destructive/transition-all）；§4：role=alert 等语义通道未动，纯键盘交互面，非全量 WCAG（两可处主要影响为键盘交互障碍，归 UX）。
- **[G2-R7-视角4-01]**:
  - vs **[G2-R2-视角4-02] + round-03 去重备忘 2**：彼为"达上限 → 静默置灰/隐藏、无 n/max 说明"（反馈缺失）；本条为"第二通道未接门禁 → 上限失效"（约束执行缺失），且 round-03 备忘明确只登记了 addCondition 隐藏分支。修复互不覆盖（彼加计数说明，本条补 `!atMaxItems` + handler 防御），已在条目内注明并建议合并验收。
  - vs **[G2-R4-视角5-02]**（maxFiles 并发窗口计数基准错误）：异步基数 vs 静态通道门禁，机制不同。
  - vs **[G2-视角4-02]**（checkbox-group maxSelected/minSelected 静默）：同属"限制无反馈/失效"表现族，但彼为选项灰化无说明（反馈），本条为按钮通道绕过（执行），根因不同。
  - vs **[G7-R3-视角11-03]**（未选订单可新增明细）：彼为业务校验缺失（跨表依赖），本条为组件内配置上限门禁缺失，不同。
  - dedup §1–§4：均无交集（非已修复项、非 16 项登记缺口表象、非 8 条误报、不涉维度 09-12 与全量 WCAG）。
- 真实用户影响检验：两条均在条目内通过（键盘巡航成本 / 上限越限+按钮矛盾均为正常使用路径可见事件）。

## 弃报留档（本轮核查过、经终判口径不立案的候选，防复核重复提问）

1. **input-table-renderer.tsx:361 `aria-label="row actions"` 硬编码英文**：i18n 缺失的 aria-only 新实例（无视觉面、单短标签）。根因与 [G2-视角9-02]/[G2-视角9-03] 相同，修复应并入该批次统一 `t()` 化，不另立案。
2. **key-value.tsx:267-269,412 maxItems 静默禁用**：R2-4-02 composite maxItems 族的同根因残余实例（R2 条目枚举未列 key-value），应并入同批修复，不另立案。
3. **transfer 单选模式候选区仍为 Checkbox 且移动时只取第一个勾选**（transfer-renderer.tsx:229-231 `writeValue(additions[0])`）：`multiple` 默认 true，单选为非默认低频配置；AntD 无单选 Transfer 参照，属设计取舍边缘，低于门槛。
4. **condition-group.tsx:386 `aria-describedby="condition-if-formula-hint"` 悬空引用**：全包无该 id 元素；两种模式下均无可见 hint，零视觉影响且 hint 内容无契约可依，属零散细节。
5. **transfer 搜索框无显式清除钮**（`type="search"` 依赖 WebKit 原生清除）：浏览器相关细节，pane 段 R3 已读未报，低于门槛。
6. **picker/icon-picker 触发器选中标签 truncate 无 Tooltip**：dedup §3 误报对照 5 边界内，信息丢失场景已被 [G2-视角4-04] 覆盖面包含，无加重事实。
7. **icon-picker 200 步进非虚拟化渲染的性能面**：属性能维度非 UI 一致性，超出本审查口径。

## 检查范围

- **前 6 轮未触及方法面定向深挖（全文精读）**: `input-suggest.tsx`（combobox 全面：ARIA/键盘/空态/竞态代际守卫）、`condition-item.tsx` + `condition-group.tsx`（全文，含 dnd 键盘 sensor、and/or/not 门禁、maxItems footer）、`icon-picker.tsx`（全文现状，ma5-ux 修复后首度全面复核）、`transfer-renderer.tsx`（全文 1-494：pane/动作区/全选/清空/单选模式）、`button-group-select-renderer.tsx`（全文：选中视觉 variant 切换核实）、`wrapped-field-action.tsx`（全文）、`input-file-renderer.tsx` + `input-image-renderer.tsx`（全文，核实为 upload-field 薄包装无独立交互面）、`detail-field.tsx` :180-299（确认/校验/回写链复核，R4/R6 结论无变化）、`mobile-touch-utils.ts`（全文）、`markdown-editor-renderer.tsx`（viewMode/preview boundary 段）。
- **交叉核实**: `packages/flux-react/src/field-frame.tsx` :150-269（Label 关联：非组字段原生 `<label>` 包裹、组字段 fieldset+legend、labelId 注入链——通过）；`tree-option-list.tsx` :64-170,345-352（roving 基线对照）；`packages/ui` Popover/Dialog 焦点返回由 Base UI 原语承担（无自研缺口）。
- **对照面 grep**: `htmlFor|aria-labelledby`（两包，标签关联矩阵）、`aria-label="[A-Za-z]|placeholder="[A-Za-z]|title="[A-Za-z]`（i18n 残余，命中 1 处已留档）、`onKeyDown|tabIndex|role=|aria-activedescendant`（键盘模型全类排查：tree 有 roving、icon-picker 无）、`onDrop|onDragOver`（upload 拖放面不存在）、`condition-if-formula-hint`（悬空引用证实）、`maxPairs|maxItems`（上限通道全类排查）。

## 检查方法

1. **未触及方法面枚举**: 从 R5 收敛声明 + R6 弃报留档反推已闭合面（disabled 门禁族、async 竞态、maxItems 反馈族、聚焦辅助、折叠校验、步进、富文本、period、移动 sheet、脏关闭守卫、错误通道矩阵、autoFocus/Enter/error-summary 备忘、variant-field/input/date-range/remote-search/tag-list 终扫），列出残余方法面：标签关联、suggest 全面、condition-builder 容量与键盘、icon-picker 修复后全态、transfer 单选模式、markdown viewMode——逐一深挖。
2. **同族查全类**: 对"大容量选项列表键盘模型"做跨文件矩阵（tree-option-list roving ✓ / picker-option-list checkbox 惯例 / icon-picker listbox 声明 ✗），对"配置上限通道覆盖"做通道矩阵（addCondition ✓ / addGroup ✗ / key-value maxItems 静默留档），确立新根因的精确边界与引根。
3. **终判去重双通道**: 274 条逐根因比对 + r2-audit 全目录既有条目关键词回溯（condition-group 上限备忘、icon-picker 语义修复记录），确认两条均无先例立案、引根关系清晰、修复互不覆盖。

## 结论

新发现 **2 条**（HIGH 0 / MEDIUM 2 / LOW 0：视角9-01 icon-picker 键盘漫游缺失、视角4-01 condition-group addGroup 通道绕过上限——均为前 6 轮所有方法面未触及的全新根因，且已按"新实例须注明引根且修复互不覆盖"口径注明族谱）。G2 组累计（R1-R7）：36 + 2 = **38 条**；全审累计 274 + 2 = **276 条**。其余候选经终判口径全部弃报并留档（7 项，见上）。**G2 组收敛终判：除上述 2 条外，未发现其他新的高价值问题。审查结束。**
