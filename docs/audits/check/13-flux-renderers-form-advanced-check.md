# 13 flux-renderers-form-advanced 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-form-advanced/src/`，排除 `*.test.*` 与 `__tests__/` 后共 66 个实现文件 16,641 行。condition-builder（10 文件全家族）、input-table（编辑表格 2 文件）、tree 家族 5 文件（input-tree/tree-select，本包无独立 cascader 渲染器）、upload 家族 4 文件、picker 家族 5 文件、option-normalize、combo、array-field/object-field、投影运行时 6 文件（projected-form/validation/scope/owner-scope/inline-form/detail-view 三件套）、variant-field（4/7 文件）、editor、icon-picker、tag-list、transfer、key-value、array-editor、wrapped-field-action、index 全文精读，合计约 15,925 行（行覆盖率约 95.7%）；其余 716 行（variant-field-view/matching/helpers、key-value-normalizer、remove-when-gating、instance-path-equal、array-field-scalar-validation、composite-schemas、editor-schemas）以 grep 定向扫描覆盖（空 catch / `as any` / `@ts-ignore` / 非空断言 / 监听器定时器清理 / objectURL 配对 / Date.now-key / 硬编码中文）。
- 结论概览：P0 x0 / P1 x2 / P2 x7 / P3 x7 —— 三条已知跨包结论（12 号 F-01 渲染期建 runtime+同步写 store、12 号 F-02 echoOptions 拼接重复 key、02 号 F-02 static-eval 折叠 `$Date.now()`）在本包均核实为**不适用**（见检查过程记录）。本包自有两主线索：condition-builder 对 amis 格式存量值每次渲染重新生成节点 id（自定义字段焦点丢失 + 投影缓存无界增长），以及 tree 懒加载子节点在 options 代际失效后永久卡 loading。总体评价：本包异步纪律（AbortController/mountedRef/sequencer/scope 配对 dispose）在渲染器包中属上乘；风险集中在"投影代理透传父级破坏性操作"、少量异步竞态与 i18n 硬编码。

## P0 缺陷

无。未发现满足"输入 → 路径 → 错误结果"完整链且常规流程必现的 P0 级缺陷。

## P1 隐患

### F-01 condition-builder 对 amis 格式存量值每次渲染重新生成节点 id：条目重挂载/焦点丢失 + projectionCaches 无界增长

- 位置：`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:38-74`（`convertAmisRule`/`toGroupValue`）、`:140-149`（渲染期 `effectiveValue = toGroupValue(value)`）、`:190-253`（projectionCaches 三张 Map 只 set 不 delete）
- 摘录：
  ```ts
  function convertAmisRule(rule: unknown): ConditionGroupValue | ConditionItemValue {
    ...
    return {
      id: genId('item'),                       // 每次调用自增新 id
      left: { type: 'field', field: (r.field as string) ?? '' },
      ...
  function toGroupValue(value: unknown): ConditionGroupValue {
    if (value && typeof value === 'object') {
      if ('children' in value) { return sanitizeNode(value as ConditionGroupValue) ...; }
      if ('rules' in value)     { return sanitizeNode(convertAmisRule(value) ...); }  // amis 分支
  ```
  ```ts
  const effectiveValue = toGroupValue(value); // 每次渲染执行（condition-builder.tsx:149）
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：表单初始/外部写入的值为 amis 兼容格式 `{ combinator: 'and', rules: [{ field, operator, value }] }`（`convertAmisRule` 的存在即声明支持该形状）。
  2. 路径：只要存储值停留在 amis 格式（用户未做过任何编辑），`ConditionBuilderRenderer` 的**每次重渲染**都会走 `'rules' in value` 分支 → `convertAmisRule` → `genId()` 生成全新 item/group id。重渲染触发源包括：`useFieldPresentation` 订阅的 field state 变化（聚焦 custom 字段触发 `visitField`）、form submitting 翻转（`presentation.fieldState.submitting` 参与 `disabled`）、NodeRenderer 依赖集命中、父级重渲染等。
  3. 错误结果 A（焦点丢失回路）：custom 类型字段的值编辑器是真实表单控件（`CustomValueEditorHost` 包 FormContext），其 `onFocus` → `visitField` → field state 变化 → builder 重渲染 → 全部 item id 更换 → `ConditionItem key={child.id}` 变化 → 整棵条目子树重挂载 → 刚聚焦的输入框被卸载、焦点即时丢失，用户难以完成第一次输入（第一次写入前值一直是 amis 格式）。
  4. 错误结果 B（缓存无界增长）：`projectionCaches.scope/form/validation` 三张 Map 以 item id 为 key `set` 且从不删除（`:249/:295/:321`），Map 仅在 `currentForm/currentValidationScope/scope/name/disabled` 变化时整体重建；amis 格式下每次渲染都会向 Map 追加全新 key 条目（含 projected scope/form 闭包），页面常驻 + 高频 scope 写入场景下持续增长。
  5. 标准类型字段（text/number/select）仅在"未被编辑窗口内发生与值无关的重渲染且恰逢聚焦"时丢一次焦点；首次写入后值被 `syncValue` 转为 flux 格式（`{id, conjunction, children}`），id 随之稳定——因此自定义字段是最重灾区。
- 影响：amis 存量条件数据（迁移场景）下 custom 字段基本不可交互；长驻页面内存缓慢增长；React key 不稳定造成的额外重挂载开销。
- 修复方向：`toGroupValue` 对 amis 分支做记忆化——以 value 的引用/深比较为键缓存转换结果（例如 ref 保存 `lastRawValue + lastConverted`，`groupValuesEqual` 判等后复用），保证同一逻辑值跨渲染 id 稳定；同时为 projectionCaches 增加淘汰（条目删除或上限）。

### F-02 tree 懒加载子节点在 options 代际失效后永久卡 loading：nodeStates 残留 + requestedRef 去重阻断重试

- 位置：`packages/flux-renderers-form-advanced/src/tree-control-sources.ts:217-273`（`runLoad` 代际守卫）、`:275-287`（`loadChildren` 的 requestedRef 去重）、`:205-209`（generation cleanup）
- 摘录：
  ```ts
  executeTreeSource(childrenSource, helpers, { expandedNodeValue: option.value })
    .then((result) => {
      if (!mountedRef.current || generationRef.current !== generation) {
        return;                                   // 早退：不清 nodeStates，不撤销 requested
      }
      ...
  const loadChildren = React.useCallback((option: TreeOptionMeta) => {
    ...
    if (requestedRef.current.has(option.valueKey)) {
      return;                                     // 永远不会重试
    }
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：`input-tree`/`tree-select` 声明 `childrenSource` + `options` 允许 source（`allowSource`），且 options source 在懒加载进行中刷新（例如带 `interval` 的 data-source，或父级表达式重算产生新 options 数组引用）。
  2. 路径：`baseOptions` 身份变化 → cleanup effect 执行 `generationRef.current += 1`（`:205-209`）→ 在途 `runLoad` 的 `.then` 命中 `generationRef.current !== generation` 早退 → 该节点的 `nodeStates` 残留 `{ loading: true }`，且 `requestedRef` 仍含该 valueKey；`reset()` 只在 `enabled` 翻 false 时执行（`:300-304`），不清两者。注意 `options` 返回 `mergedOptions ?? baseOptions`，陈旧 merged 树中该节点仍 `deferChildren: true` 且 `children: []`。
  3. 错误结果：该节点 chevron 永久显示 Spinner（`tree-option-list.tsx:114`），用户再点展开因 requestedRef 去重而 no-op，子节点数据从此不可用，直到组件卸载重挂或 `enabled` 翻转。
- 影响：options 自动刷新 + 懒加载同用的树，展开中的节点永久假死；H14 注释表明作者考虑过陈旧合并，但漏掉了"失效路径不清理 loading 态 + 不允许重试"的组合。
- 修复方向：代际失配早退分支中同时 `setNodeStates` 删除该 valueKey 并从 `requestedRef` 移除该 key（或直接调用 `reset()` 重建懒加载态），使新代际可重新发起加载。

## P2 风险

### F-03 投影 runtime 代理把父级破坏性操作原样透传给子树：`dispose()` 销毁整个父 owner，`submit/reset` 提交/重置整个父表单

- 位置：`packages/flux-renderers-form-advanced/src/detail-view/projected-validation-runtime.ts:342-344`（`dispose() { parentOwner.dispose(); }`）；`detail-view/projected-form-runtime.ts:250-251`（`...parentForm` 展开把 `submit/reset/dispose` 按引用复制到代理）
- 摘录：
  ```ts
  dispose() {
    parentOwner.dispose();      // 投影是视图，却暴露了销毁本体的能力
  },
  const proxy: FormRuntime = {
    ...parentForm,              // submit/reset/dispose 直接继承父表单语义
  ```
- 问题：这些代理经 `FormContext.Provider`/`ValidationContext.Provider` 注入给任意 schema 子树（input-table 每行、combo 每项、condition-builder 每条目、object-field/variant-field）。子 schema 中的 `submitForm`（最近 form 解析到代理）、`reset()` 或任何持有 owner 引用的清理逻辑，都会作用于**整个父表单/父 owner**：行内编辑器点"提交"会提交整个外层表单；对行 validation scope 调 dispose 会杀死父表单校验运行时。`clearErrors()` 已专门做了子树限定（P0-5 注释），证明"代理必须子树限定"是既定契约，dispose/submit/reset 是同一契约下的漏网点。
- 影响：特定条件（子树 schema 含 submit 类动作/组件句柄清理调用 dispose）+ 后果（全表单提交、父 owner 被销毁后整表校验瘫痪）——契约型风险，当前包内未见直接调用方，但作为 context 值暴露给任意宿主 schema。
- 修复方向：代理上覆写 `dispose` 为 no-op（或仅断开投影缓存）；覆写 `submit/reset` 为子树语义（如 `validateSubtree(ownerRootPath,'submit')`）或显式 throw `not-supported`；与 `clearErrors` 的子树限定策略对齐。

### F-04 upload `removeExisting` 异步删除后按陈旧 index 过滤：并发删除/迟到上传提交会移除错误的文件

- 位置：`packages/flux-renderers-form-advanced/src/upload-field.tsx:380-428`
- 摘录：
  ```ts
  async function removeExisting(index: number) {
    const item = committedItems()[index];
    ...
    if (deleteAction && item) {
      ... await props.helpers.dispatch(deleteAction, { scope: deleteScope });  // 可能耗时
    }
    // H26: read from the committed-value ref ...
    const next = committedItems().filter((_, idx) => idx !== index);            // 仍按旧 index 过滤
    commitItems(next);
  ```
- 问题：`await` 之后 `committedItems()` 可能已变（另一路删除已完成、或并行上传完成 append），此时 `filter(idx !== index)` 剔除的是**新列表**的第 index 项而非当初点击的那一项。触发条件：声明了 `deleteAction`（慢速）+ 用户快速连点两个移除按钮，或删除等待期间有上传完成——先完成的删除使列表左移，第二个删除命中错误条目（原 index+1 被删、目标条目存活），且被删条目的服务端 delete 可能已不可逆。
- 影响：多文件上传场景数据级错误（删错文件），且与 H26 注释所防范的同类陈旧快照问题恰好同源。
- 修复方向：进入函数时先捕获目标 item 的稳定标识（如 url+name），await 后按标识而非 index 过滤；或在整个 await 期间禁用其余移除按钮。

### F-05 editor 动态 disabled 不生效：`editor.setEditable` 同步只看 `readOnly`，运行期禁用后仍可输入并提交值

- 位置：`packages/flux-renderers-form-advanced/src/editor-renderer.tsx:256`（初始 `editable: !readOnly`，`readOnly = presentation.readOnly || !presentation.interactive`）、`:328-334`（同步 effect 只比较 `presentation.readOnly`）
- 摘录：
  ```ts
  const readOnly = presentation.readOnly || !presentation.interactive;   // 含 disabled
  ...
  useEffect(() => {
    if (!editor) return;
    if (presentation.readOnly !== editor.isEditable) {                   // 只对账 readOnly
      editor.setEditable(!presentation.readOnly);
    }
  ```
- 问题：`interactive = !disabled && !readOnly`（`flux-renderers-form/src/field-utils/field-presentation.tsx:118`）。挂载时 disabled=true 会正确初始为不可编辑，但运行期 `disabled` 由表达式翻 true（如 `${submitting}`）而 `readOnly` 不变时，对账条件 `false !== true` 不成立，contenteditable 保持可编辑；`handlers.onChange`（`field-handlers.tsx:428-434`）只拦 readOnly 不拦 disabled，键入内容照常写入表单值。
- 影响：特定条件（运行期动态禁用）+ 后果（禁用字段仍接受输入并改变提交载荷）。
- 修复方向：同步 effect 改为对账 `readOnly || !presentation.interactive` 与 `editor.isEditable`。

### F-06 TreeOptionList 挂载即抢焦点 + 过滤使 active 项消失时把焦点从搜索框夺走

- 位置：`packages/flux-renderers-form-advanced/src/tree-option-list.tsx:278-294`（focus effect）、`tree-control-controllers.ts:318-327`（mount/过滤后自动 `setActiveItemKey(visibleOptions[0])`）
- 摘录：
  ```ts
  React.useEffect(() => {
    if (!activeDescendantId || props.disabled) return;
    ...
    const activeElement = treeRef.current?.querySelector<HTMLElement>(`#${CSS.escape(activeDescendantId)}`);
    activeElement?.focus();                       // 无"用户已交互"门槛
  }, [activeDescendantId, ...]);
  ```
- 问题：控制器在挂载时就把 activeItemKey 设为首个可见项（非用户交互），focus effect 随后把真实 DOM 焦点移到树首行——页面加载即发生焦点劫持（滚动定位、读屏播报错位）。同类地：搜索框输入使当前 active 项被过滤掉时，active 重置为首项 → focus effect 抢走搜索框焦点，用户输入被打断。
- 影响：可访问性/键盘流缺陷；embedded input-tree 挂载即抢焦点，searchable 树输入被截断。
- 修复方向：焦点移动仅限键盘导航（ArrowUp/Down/Home/End）与点击路径触发（传 interaction 来源标志），mount/过滤驱动的 active 重置只更新 `aria-activedescendant`，不调用 `.focus()`。

### F-07 object-field 投影 form 的 `prefixPath('')` 返回 `''`：根路径操作逃逸出对象子树（suspect）

- 位置：`packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:429-435`
- 摘录：
  ```ts
  prefixPath(path) {
    if (!path || !name) {
      return path;                                // path='' 时返回 '' 而非 name
    }
    return `${name}.${path}`;
  },
  ```
- 问题：对比 input-table 行代理（`input-table-row.tsx:98-101`，`''` → `${arrayPath}.${index}`）与 condition-builder 条目代理（`condition-builder.tsx:270-276`，`'value'` → name），object-field 对空路径不做前缀映射。子树内任何以 `''`/根路径发起的调用——`validateAt('')`、`registerField({path: ''})`、`getFieldState('')`——都会命中父表单根而不是 `name` 子树：根级校验跑遍整个父表单、根级注册写到父 owner 根（可能被 containment 规则拒绝）。标注 suspect：常规字段都带自身 name 发起调用，空路径入口较少，但三个兄弟实现的不一致本身就是契约漂移信号。
- 影响：特定条件（子树存在根路径调用，如 `submitForm` 前的整段校验或某些组件句柄）+ 后果（作用域扩大到父表单）。
- 修复方向：`prefixPath('')` 返回 `name`，与兄弟投影实现统一。

### F-08 D7 i18n：校验消息、aria-label、错误兜底文案硬编码英文；transfer 计数器使用全角括号

- 位置与摘录（同类问题合并列举）：
  - `input-table-renderer.tsx:466-467`：`` `${schema.label ?? schema.name ?? 'Field'} requires at least one row` ``（combo-renderer.tsx:613-624、transfer-renderer.tsx:487、picker-renderer.tsx:552 同类，均为用户可见的校验错误消息，无 t() 包裹；而同文件 UI 文案大量使用 `t('flux.form.*')`，标准不一致）
  - `input-table-renderer.tsx:361`：`<TableHead className="w-px" aria-label="row actions" />`
  - `key-value.tsx:213/229/246`：`aria-label={`Move up entry ${index+1}`}` 等；`:544`：`t('validation.required', { label: `Entry ${n} key` })`（label 参数硬编码英文）；`array-editor.tsx:82/102-103/150/166` 同类（`Item ${index+1}`、`Move up ...`）
  - `tree-control-controllers.ts:44`：`return 'Failed to load tree options.'`；`tree-control-sources.ts:127/136/252/264`：`'Search failed.'` / `'Failed to load children.'`（错误兜底直接进 UI）
  - `transfer-renderer.tsx:380-382`：`（{props.options.length}/{props.totalCount}）` —— 全角括号 `（）` 写死在 JSX，所有 locale 下都渲染中文标点
  - `picker-helpers.ts:111/120/151`：`'Label'` / `'Keyword'` 列标题与查询框 label
- 影响：非英文 locale 下错误提示/无障碍标签不可理解；全角括号在任何 locale 都不合适。属 D7 批量契约风险（`check:i18n-keys` 门禁只覆盖静态 t() key，检测不到这些）。
- 修复方向：统一收敛到 `flux.*`/`validation.*` 命名空间；aria-label 用带 index 参数的 i18n key；transfer 计数括号改半角或随 locale。

### F-09 投影 validation scope 复用 `parentScope.id`：与 `disposeScope(id)` 键空间冲突风险（suspect）

- 位置：`packages/flux-renderers-form-advanced/src/detail-view/projected-validation-runtime.ts:190-192`
- 摘录：
  ```ts
  return {
    id: parentScope.id,                          // 投影 scope 与父 scope 同 id
    path: options.ownerRootPath ? ... : parentScope.path,
  ```
- 问题：该 scope 作为 `ScopeContext` 值注入子树（input-table 每行共用同一个父 id）。子树内任何按 id 管理作用域的清理路径（如 `helpers.disposeScope(scope.id)`、runtime 的 ownedScope 登记表）会命中**父 scope 本体**。本包内部未发现实际调用点（上传字段只 dispose 自建 scope），且 `createProjectedOwnerScope` 的 scopeId 是全新字符串（`...:arr:...`/`...:condition-builder:...`）无此问题，因此标 suspect——但同包两种投影 scope 的 id 策略不一致，属易踩雷契约。
- 影响：子树 schema/宿主代码若按 id dispose 将误伤父 scope。
- 修复方向：投影 scope 使用派生 id（如 `${parentScope.id}:val:${ownerRootPath}`），或文档明示投影 scope 不可作为 dispose 目标。

## P3 提示

### F-10 picker/transfer 校验收集器接受 `required === 'true'` 字符串

- 位置：`picker-renderer.tsx:549`、`transfer-renderer.tsx:484`
- 摘录：`if (schema.required === true || schema.required === 'true') {`
- 问题：renderer-runtime.md「Resolved Boolean Props」明确布尔字段校验模式**拒绝** `"true"` 字面量，runtime 代码不得做字符串强制；此处收集器重新接纳了被编译契约禁止的形状，与同文件 `disabled`/`readOnly` 的严格布尔判断不一致。修复方向：删去 `|| schema.required === 'true'` 分支。

### F-11 tree options 重复 value → valueKey 冲突无告警；tree-select 空标签选中项导致清除按钮消失

- 位置：`tree-options.ts:71-74`（`valueKey = String(value)`，重复 value 即重复 key，expandedKeys/React key 双双冲突；对比 input-table/combo 对重复 rowKey 有 console.warn 兜底）；`tree-control-controllers.ts:424-431`（`hasSelection: Boolean(triggerText)`——label 为空串的已选中项使 triggerText 为空，清除按钮不渲染、显示回退 placeholder）。修复方向：构建期检测重复 valueKey 并告警/去重；hasSelection 改判 value 而非展示文本。

### F-12 upload maxFiles 剩余额度只按已提交值计算；existing 列表 key 可重复

- 位置：`upload-field.tsx:353-356`（`remaining = maxFiles - committedItems().length` 不含本批在途条目，两批连续选择可超上限）；`:502-504`（`key={`existing-${entry.url}-${entry.name ?? ''}-...`}`，同名同 url 同 size 的重复文件会产生 duplicate key）。修复方向：额度计算并入 pending 条目；key 追加 index 兜底。

### F-13 picker CRUD 确认兜底把行 key 字符串直接当值写入（类型漂移）

- 位置：`picker-renderer.tsx:398`（`nextValues.push(key as PickerValue)`——选项/缓存/已载行均未命中时（如 `keepOnPageChange` 保留的跨页选择在刷新后），把 String化的 rowKey 写回字段值；数值 value 会变成字符串）。修复方向：命中失败时跳过并提示，或经 valueKey 反解还原原始类型。

### F-14 variant-field 切换到未知 key 时写 scope 而非 form（所有权不一致）

- 位置：`variant-field/variant-field-controller.ts:238-241`（`nextOption` 未命中且 `parentForm` 存在时落入 `else if (name)` 分支 `parentScope.update(name, null)`，绕过 form 写值）。正常 UI 选择器只会传已知 key，故为防御分支的所有权错位。修复方向：form 模式下未知 key 直接 return。

### F-15 杂项：select 型值输入的 duplicate key 风险 + 两处渲染期派生开销

- `condition-builder/value-input.tsx:337-341/374`：`key={String(opt.value)}` 与 `selected.map((v) =>` 对重复 value 的 options/value 数组产生 duplicate React key（与 12 号 F-02 同类但源数据为作者静态配置）。
- `input-table-renderer.tsx:151-180` 与 `combo-renderer.tsx:332-361`：`removeBlockedByIndex` useMemo 内对每行 `createItemScope` 生成临时投影 scope 仅用于一次 `removeWhen` 求值——投影 scope 是纯 JS 包装（GC 可回收，无泄漏），但大表（数百行）每次 items/keys 变化都整表重建；可改为单 scope + 参数化 bindings 求值。
- `composite-field/object-field.tsx:400-448`：`childScope`/`childForm` 依赖 `projectedValue`，transformIn 场景下每次键击都重建 context 值导致子树全量重渲染（无正确性问题，D6 提示）。

### F-16 D8 结构：11 个文件超 500 行（warn 级），无超 700 行（error 级）

- `key-value.tsx(687)`、`array-editor.tsx(644)`、`combo-renderer.tsx(632)`、`detail-view/detail-view.tsx(627)`、`composite-field/array-field.tsx(610)`、`upload-field.tsx(598)`、`tree-controls.tsx(585)`、`condition-builder/condition-builder.tsx(577)`、`picker-renderer.tsx(559)`、`condition-builder/value-input.tsx(555)`、`composite-field/object-field.tsx(525)`。按 `scripts/check-oversized-code-files.mjs`（WARN 500 / ERROR 700）口径全部为 warn 级，无需注册豁免；`docs/logs/` 未见本包 error 级注册项。提示：key-value.tsx 已逼近 700，新增行数前应评估拆分（如行组件/校验收集器分离）；combo 与 input-table 存在大量同构的 add/remove/move + removeWhen 逻辑，可提取共享 composite-array 控制器。

## 检查过程记录

1. 前置阅读：`docs/references/quick-reference.md`、`docs/architecture/form-validation.md`（全文）、`docs/architecture/renderer-runtime.md`（1-1014 行，含 Architecture Guardrails、One-shot evaluation scope discipline）、`packages/flux-renderers-form-advanced/package.json`、`src/index.tsx` 与目录结构。
2. 精读路径：condition-builder 10 文件 → input-table 2 文件 → composite-field 支撑件（array-field-runtime/composite-item-keys/composite-item-id/projected-inline-form/projected-owner-scope）→ detail-view 投影运行时 6 文件 → upload 4 文件 → tree 5 文件 → picker 5 文件 + option-normalize → combo/array-field/object-field/transfer/key-value/array-editor → detail-field/detail-view/detail-draft-controller/detail-surface/value-adaptation-helper → variant-field 4 文件 → editor/icon-picker/tag-list/wrapped-field-action/index。
3. 跨包结论核实：
   - 12 号 F-01（渲染期创建 runtime + 构造尾部同步写 store）：**不适用**。本包投影件（projected-form-runtime/projected-validation-runtime/projected-owner-scope）为惰性纯代理，构造期零 store 写入；`createItemScope`/`createProjectedValidationRuntime` 虽在 useMemo 渲染期创建，但均为纯 JS 包装对象，不注册 runtime-owned disposer、不写 store。detail-field/detail-view 真正的子 FormRuntime 创建发生在异步事件处理器 `handleOpen` 内（transformIn 之后），并配 sequencer + mountedRef + dispose-on-close/unmount，符合 renderer-runtime.md「commit-safe」基线。
   - 12 号 F-02（echoOptions 并列拼接重复 key）：**不适用**。本包无 options echo 池：tree 远程搜索为整体替换（`remoteOptions ?? baseOptions`），懒加载合并为结构化子树合并（`mergeChildOptions`），picker/transfer 走 `normalizeOptions` 投影无拼接。
   - 02 号 F-02（static-eval 编译期折叠 `$Date.now()`/`$Math.random()`）：**不适用**。全部唯一 id 均为运行时 JS 生成——`genId` 模块计数器、`createNextCompositeItemId` 确定性推导、upload 条目 id（`upload-field.tsx:360`，运行时 Date.now+random）、detail draft runtime id（`detail-field.tsx:199`/`detail-view.tsx:352`）；未发现经表达式编译生成唯一 id 的用法。
4. 渲染器契约（D2）核查：全部渲染器经 `props.props/meta/regions/events/helpers` 取数；无直接 store 访问（`useStore/getStore()/zustand` 零命中）；标准 hooks 使用齐全；scope 配对纪律良好——`executeTreeSource` formula/action 双路径 finally dispose（被 renderer-runtime.md 点名为正确先例）、upload `createChildScope`/`disposeScope` 严格配对、picker autoFill 一击式 scope 立即 dispose、condition-builder formula evaluator finally dispose。唯一契约偏差见 F-03/F-07/F-09/F-10。
5. grep 扫描（排除 test）：`as any` 0、`@ts-ignore/@ts-expect-error` 0、硬编码 CJK 字符（[一-龥]）0（transfer 全角括号属标点，单列于 F-08）；`addEventListener` 0；`setInterval` 0、`setTimeout` 仅 tree 远程搜索 debounce 且 cleanup `clearTimeout + abort`；`URL.createObjectURL/revokeObjectURL` 0（无对象 URL 需求）；AbortController 5 处全部在 cleanup/换代时 abort；非空断言 8 处均为长度守卫后的安全访问（如 `entries[0]!`、`newEntries[index]!.id`）；空 catch 3 处均有注释且为 best-effort（upload 重置 input.value ×2、editor setContent 未就绪）。
6. D8 对照：`scripts/check-oversized-code-files.mjs` 阈值 WARN 500/ERROR 700，本包 0 个 error 级、11 个 warn 级（F-16）；`docs/logs/` 未见本包超限注册条目，`pnpm check` 口径下无新增未注册红。
7. 精读覆盖率：全文精读约 15,925/16,641 行（95.7%，64/66 文件全文 + variant-field 3 个小文件未全文）；未精读部分经定向 grep（上述第 5 条）与用途判断（纯类型声明/纯工具函数）覆盖。
8. 报告口径：行号以当前工作区文件为准；F-07/F-09 标注 suspect（推理链成立但包内未见直接触发调用方）；D6/D7/D8 合并条目已注明全部命中位置。
