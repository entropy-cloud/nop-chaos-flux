# CR 输入盘点与跨组件裁决表（cr-inventory-adjudication）

> 生成：2026-08-06，来源 `docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md` Phase 1
> 方法：消费 `docs/audits/cr-input-inventory.md`（p2p3 plan Phase 5 预提取产物，69 条剩余 + 17 条已处理）+ `rg "归 CR" docs/audits/per-component/*.md` 全量交叉核对
> 用途：CR 阶段逐条裁决基准。每条目含分类（`handled-by-p2p3` / `fix` / `keep` / `defer-other`）+ 来源 file:line + 一句理由。零未分类、零静默挂起。
> 联动：本表同时覆盖 roadmap CX-7 行登记项（barcode-input `flux.*` 前缀 t() 语义潜伏问题 → 见「CX-7 潜伏项裁决」节）与 Phase 4 i18n 实证扫描的联动登记。

## 计数汇总（live 2026-08-06）

| 分类            | 条目数 | 说明                                                                    |
| --------------- | ------ | ----------------------------------------------------------------------- |
| handled-by-p2p3 | 17     | 已由 plan-2026-08-05-1359-1 Phase 1–4 修复，卡内状态已翻转 fixed        |
| fix             | 19     | 本 plan 修复（Phase 2 ×2 / Phase 3 ×9 / Phase 4 ×7 / Phase 5 ×1）       |
| keep            | 33     | 裁决非缺陷或低影响 P3 记录，理由逐条写明                                |
| defer-other     | 7      | 明确 successor（推荐句柄 capability 面 / transfer 远程选项）            |
| **合计**        | **76** | finding 级独立条目；另有 16 处卡状态/全卡复查聚合引用（覆盖于组件条目） |

> 与 `cr-input-inventory.md` 口径核对：69（剩余）+ 17（p2p3 已处理）= 86 ≥ 76（本表 finding 级去重后）。差异来自 inventory 的 other 类目对同组件同编号的「维度行 + backlog 行」计为 1 条，而本表以卡内 `[Pn-x]` 行为主键逐条列示（含 select P3-1 的维度行聚合、markdown-editor P3-4 的维度行聚合等）。聚合引用（卡状态说明 `P2×n backlog 归 CR` 与全卡复查行）不单独成条，覆盖于该组件条目，无遗漏。

## 五项 Decision 终裁（Phase 1 必达项）

### D1. cards P2-1 selectable-card ARIA 模式 → `fix`（aria-pressed，候选 a）

- 候选：a) `aria-pressed` 保持 role=button；b) role=listbox/option 结构；c) keep 现状。
- 终裁：**a) aria-pressed**。依据：
  - ui Card（`packages/ui/src/components/ui/card.tsx:25`）在 onClick 存在时强制 `role="button"` + tabIndex + Enter/Space 键盘路径（renderer 自身 role/tabIndex 被覆盖——live 实证 cards-renderer.tsx:168-186）。
  - `aria-selected` 仅允许于 gridcell/option/row/tab/treeitem 等 role，button 非规范组合（ARIA 1.2）；`aria-pressed` 是 button 的标准切换态属性。
  - 候选 b（listbox/option）需容器 role=listbox + roving tabindex 焦点管理重构，属新能力引入，与本 plan Non-Goals「不引入新组件能力」冲突；且 ui Card 覆盖机制下实现成本 >15 分钟。
  - 修复形态：交互态 item（selectionMode≠none 或 onItemClick）输出 `aria-pressed={selected}`（替代 `aria-selected`）；非交互态维持 `role="listitem"` 零变化。已裁 fix → 本 plan Phase 3 落地 + focused 测试（cards-renderer.test.tsx aria-selected 断言同步迁移）。
- 落地：Phase 3 `cards-renderer.tsx` + content 包测试。

### D2. wizard 焦点管理（P3-2 复核）→ `keep`

- 复核起点：卡内 keep 记录（`wizard.md:57`「步进切换无焦点管理（dim 8；step body 无 heading 目标元素）」）。
- 终裁：**keep**。依据：nav 已有 `aria-current="step"` + 按钮 disabled 门控（线性模式未来步 disabled），AT 用户可感知步进位置；step body 无 heading 元素，焦点迁移需新增结构性目标（heading 或 aria-live 通告区），属可用性增强非阻断缺陷；无宿主场景报障记录。保持卡内 keep 记录，本表登记复核通过。
- 落地：裁决表记录（无代码变更）。

### D3. list P2-3 hasMore 语义（design §9 两条款张力）→ `keep`（跨组件分页语义基准）

- 对照：crud/table 的 total 恒来自数据源（data-source/API 响应），`currentPage < totalPages` 可计算；list 的 total 缺省时按 items.length 推导（`list-pagination.ts:85`）且 `explicitTotal` 缺省时 hasMore 恒 true（`list-pagination.ts:159-164`）。
- 终裁：**keep 现行为**，确立为跨组件分页语义基准：**total 已知 → hasMore = currentPage < totalPages；total 未知 → hasMore 缺省 true（支持 items 增长模式的 design 意图）**；「currentPage >= totalPages 隐藏 sentinel」条款仅在 total 已知时适用。静态有限数据列表应由宿主显式传 `total` 或 `hasMore:false`（design §9 已立契，行为以实现为准）。
- 依据：`list-pagination.ts:159-164` 注释口径 + audit 卡 `list.md:18`「「else true」为支持 items 增长模式的设计意图」；crud/table 语义同向（total 来自数据源），无跨组件矛盾。
- 落地：裁决表记录（无代码变更）。

### D4. 推荐句柄复核（json-view/collapse/wizard/pagination `component:*`）→ `keep`（复核通过）

- p2p3 Non-Goals 已裁定 P3 keep（「recommended」非承诺契约）；本 plan 复核：
  - json-view `component:copy/onCopy`（json-view.md:22,39）、collapse `component:setValue/openItem/closeItem`（collapse.md:32,41）、wizard `component:setValue/getValue/next/prev/goToStep/commitStep`（wizard.md:55，flux-vs-amis-analysis G6 改进计划项）、list/pagination 组件句柄（list design §7 gotoPage/getPagination 已实现；「推荐句柄」指 design 中标注「推荐支持」的 capability 面，均非承诺契约）。
  - 实现需组件 capability 注册面（>15 分钟/件），属未来 capability 面组件计划（本 plan Deferred But Adjudicated 已登记）。
- 终裁：复核通过，维持 keep；本表登记「复核通过 + 依据」，不重复修复。
- 落地：裁决表记录（无代码变更）。

### D5. button helper 位置 → `fix`（提升到 flux-core 公共层，候选 b）

- 候选：a) basic 包内联等价实现（重复代码）；b) 提升到公共层；c) basic 依赖 content 包（依赖方向反转，否决——live 核对两包均只依赖 flux-core/flux-i18n/flux-react/ui，content 不依赖 basic、basic 不依赖 content）。
- 终裁：**b) 提升到 `packages/flux-core/src/utils/url.ts`**（导出 `isSafeNavigationUrl`，flux-core index.ts 按既有 utils 导出惯例追加）。依据：
  - flux-core 已是 basic/content 的共同依赖层（包依赖图 live 核对），`utils/` 下已有 path/schema/debounce 等同型纯函数 helper 惯例（`flux-core/src/utils/path.ts` 等）。
  - content `sanitize.ts` 保留再导出（`import { isSafeNavigationUrl } from '@nop-chaos/flux-core'` + re-export），其现有消费者与 `sanitize.test.ts` 零改动；DOMPurify 相关 `sanitizeHtml` 留在 content（依赖 dompurify peer）。
  - 触及 `flux-core` 导出面属结构变更 → 本 Decision 先行记录（本 plan 授权边界内，理由如上），并同步 `docs/architecture/flux-core.md`（Goals 明示「root-cause 文档更新（helper 位置变更）」）。
  - `data:` 口径：**与 link.tsx 现行 helper 一致放行全部 `data:`**（数据下载链路 CRUD export 使用 `data:text/csv;base64,...`，收窄到 `data:csv` 会破坏既有下载契约；data: 导航为 opaque-origin 文档，与 javascript: 执行上下文风险不同质）。button 与 link 共享同一 helper → 同一契约，测试断言对齐。
- 落地：Phase 2（Proof test-first + Fix），`button.tsx:238-249` href 分支接入。

## 逐条裁决表（finding 级）

### handled-by-p2p3（17 条，交叉核对 `cr-input-inventory.md` 交叉核对表）

| 组件            | 编号             | 来源                                     | 理由                                                                 |
| --------------- | ---------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| icon-picker     | P3-3             | icon-picker.md（inventory 交叉核对表）   | p2p3 Phase 1 I1：`t('flux.form.selectIcon')`                         |
| alert           | P2-2             | alert.md:24                              | p2p3 Phase 1 I2：`t('flux.common.close')`                            |
| carousel        | P2-4             | carousel.md:23,24                        | p2p3 Phase 1 I3：`t('flux.carousel.goToSlide')`                      |
| diff-view       | P2-2             | diff-view.md:24                          | p2p3 Phase 1 I4–I6：`flux.diff.*` 键                                 |
| variant-field   | P3-1             | variant-field.md（inventory 交叉核对表） | p2p3 Phase 1 I7：`t('flux.form.variantUpdateFailed')`                |
| tree            | P3-2             | tree.md（inventory 交叉核对表）          | p2p3 Phase 1 I8：`t('flux.data.tree')` 兜底                          |
| icon-picker     | P3-2             | icon-picker.md（inventory 交叉核对表）   | p2p3 Phase 2：搜索框 `t('flux.form.searchIcon')`                     |
| picker          | P3-1             | picker.md（inventory 交叉核对表）        | p2p3 Phase 2：搜索框 aria-label 复用 `flux.picker.search`            |
| markdown-editor | P3-1             | markdown-editor.md:23                    | p2p3 Phase 2：预览区 `aria-live="polite"`                            |
| transfer        | P3-1             | transfer.md（inventory 交叉核对表）      | p2p3 Phase 2：aria-multiselectable 按 multiple 条件发布              |
| input-table     | P3-1             | input-table.md:41                        | p2p3 Phase 3：data-slot 去重（FieldFrame 唯一 owner）                |
| object-field    | P2-1             | object-field.md:32,41                    | p2p3 Phase 4：design.md 创建                                         |
| array-field     | P2-1             | array-field.md:32,40                     | p2p3 Phase 4：design.md 创建                                         |
| detail-field    | P2-1             | detail-field.md:32,41                    | p2p3 Phase 4：design.md 创建                                         |
| detail-view     | P2-1             | detail-view.md:32,41                     | p2p3 Phase 4：design.md 创建                                         |
| variant-field   | P2-1             | variant-field.md:32,40                   | p2p3 Phase 4：design.md 创建                                         |
| statistics      | P2-4（文档补全） | statistics.md:32                         | p2p3 Phase 4：design.md 创建（amis-baseline-matrix 提及见下 fix 行） |

> 备注：scope-debug P2-1（scope-debug.md:32）卡内明示「非归 CR」（C 阶段已补写 design.md + example.json + index.md 条目，live 核对 `docs/components/scope-debug/` 存在），不列入本表。
> 备注：button P0-1（button.md:33，countDown 直调 localStorage INV-1 红线）已于 C1.3 同 plan 修复（host 注入 adapter，button.tsx:86-89 注释留痕 + lab 页真机实证），卡内状态 fixed——其 dim 18 行与 P2-3 同源「归 CR」引用由 P2-3 fix 行覆盖。

### fix（19 条，本 plan 落地）

| 组件              | 编号           | 来源                                          | 本 plan 落地                                                                                                      |
| ----------------- | -------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| button            | P2-3           | button.md:33,40                               | Phase 2：href 协议校验（D5 裁决：flux-core `utils/url.ts` + basic 接入）                                          |
| condition-builder | P2-4           | condition-builder.md:52                       | Phase 2：combobox readOnly 视觉冻结（根因 `input-choice-renderers.tsx` 公共层）                                   |
| calendar          | P2-4           | calendar.md:45                                | Phase 3：loadAction rejection 捕获 + 错误态                                                                       |
| barcode-input     | P2-4           | barcode-input.md:47                           | Phase 3：scannerError 清除路径                                                                                    |
| gantt             | P2-1           | gantt.md:42                                   | Phase 3：editor region `onSave` 持久化接线                                                                        |
| gantt             | P2-3           | gantt.md:44                                   | Phase 3：拖拽/链接/删除/编辑器保存入 undo 栈（design §12.8 补齐）                                                 |
| gantt             | P2-4           | gantt.md:45                                   | Phase 3：`use-gantt-keyboard` 监听挂载稳定化                                                                      |
| kanban            | P2-3           | kanban.md:46                                  | Phase 3：controlled 模式变更事件/activity log 按 `kanbanOwnership` 门控                                           |
| kanban            | P2-4           | kanban.md:47                                  | Phase 3：onCardMove/onCardClick payload 补 `card: BoardItem`（design.md:190,205 契约）                            |
| cards             | P2-1           | cards.md:23,39                                | Phase 3：交互态 item `aria-selected` → `aria-pressed`（D1 终裁）                                                  |
| picker            | P3-2           | picker.md:41                                  | Phase 3：定义字段 `searchable` 补 `valueType:'boolean'`（与 `multiple` :531 同型，1 行）                          |
| calendar          | P2-3           | calendar.md:44                                | Phase 4：dim 17 文档同步（nativeEvent/swap 键名/long-press 500ms 口径）                                           |
| barcode-input     | P3-1           | barcode-input.md:49                           | Phase 4：dim 17 文档同步（离线队列/降级 tooltip 标注未实现）                                                      |
| kanban            | P2-4（文档面） | kanban.md:47                                  | Phase 4：`statusPath` 注释过时同步（scheduling-renderer-definitions.ts:89-92）                                    |
| gantt             | P3-2           | gantt.md:47                                   | Phase 4：design.md §8.1/§8.3/§9.0/§12.7/undoLimit phantom + example.json `${event.taskId}`                        |
| variant-field     | P3-2           | variant-field.md:42                           | Phase 4：transform\*Action `kind:'ignored'` 文档化                                                                |
| statistics        | P2-4（矩阵面） | statistics.md:32                              | Phase 4：amis-baseline-matrix 补提及                                                                              |
| CX-7 潜伏项       | —              | roadmap CX-7 行（2026-08-03-0517-2 事后回写） | Phase 4：`useFluxTranslation` t() 归一化 `flux.` 前缀（实证：barcode-input `t('flux.barcode.*')` 现返回原始 key） |
| c5-2 残余         | —              | c5-2-host-surfaces.spec.ts:201                | Phase 5：断言对齐 timeline v2 `data-ownership` 恒发契约                                                           |

### keep（33 条，裁决非缺陷/低影响 P3 记录）

| 组件                           | 编号 | 来源                     | 理由                                                                                                                                                                                                                                   |
| ------------------------------ | ---- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| array-editor                   | P3-2 | array-editor.md:44       | `labelBase`/itemLabel 为 schema 定制语义标签路径，默认 "Item N" 为英文惯例文案；i18n key 化属增强（out-of-scope improvement 不入 defer-other 因成本 <15 分钟但无用户可见缺陷）                                                         |
| array-editor                   | P3-3 | array-editor.md:45       | E3 non-goals 复验裁定成立：copyable/deleteConfirmDialog/addable-removable toggle 归 form runtime 层统一更优，次要 UX 非缺陷                                                                                                            |
| checkbox                       | P3-1 | checkbox.md:40           | required 对 `false` 不报错为平台级 isEmptyValue 语义（false 非空），行为一致非缺陷                                                                                                                                                     |
| checkbox-group                 | P3-1 | checkbox-group.md:39     | `aria-errormessage` 未接低影响：FieldFrame 层已处理校验文案，item 级已有 errormessage                                                                                                                                                  |
| combo/array-field/object-field | P3-1 | p2p3 Phase 3 裁决面      | data-slot 嵌套已由 p2p3 Phase 3 统一裁决（FieldFrame 为 field-control 唯一 owner，根节点移除重复 data-slot）；复核一致                                                                                                                 |
| condition-builder              | P3-5 | condition-builder.md:57  | picker 模式 conditionCount 仅计顶层 children（组算 1 项）为计数口径选择，无契约承诺                                                                                                                                                    |
| editor                         | P3-1 | editor.md:50             | 富文本编辑器焦点环：Tiptap contenteditable 有浏览器默认 caret 反馈，视觉评估非阻断                                                                                                                                                     |
| input-date                     | P3-1 | input-date.md:40         | onFocus/onBlur 挂 PopoverContent：submit 路径校验不受影响（卡内实证），移动 focus 事件到 trigger 有 popover 关闭回归风险，keep                                                                                                         |
| input-date                     | P3-2 | input-date.md:41         | valueFormat 非法 token 静默降级：schema 级校验属 schema-file-validator 机制面（保护区域），非本 plan 修复义务；记录为 schema 校验增强建议                                                                                              |
| input-datetime                 | P3-1 | input-datetime.md:41     | 同 input-date P3-1（共享 date-field-control.tsx:217-218）                                                                                                                                                                              |
| input-file                     | P3-1 | input-file.md:41         | 单选模式 in-flight 旧上传不取消：last-wins 值语义正确，取消 in-flight 需 AbortController 联动改造（优化候选）                                                                                                                          |
| input-file                     | P3-2 | input-file.md:42         | existing key=url+name+size 同文件重复上传 key 冲突：DOM 正确、仅 dev 告警（React key），不修                                                                                                                                           |
| input-image                    | P3-1 | input-image.md:41        | crop 零实现为 design §11 显式保留扩展点（文档诚实），keep                                                                                                                                                                              |
| input-text                     | P3-2 | input-text.md:44         | attemptedFetch 不随输入重置 → 空态提前显示 ≤300ms（debounce 窗口瞬态），用户继续输入即重试，低影响                                                                                                                                     |
| input-text                     | P3-3 | input-text.md:45         | refreshSource rejection 有 `.catch(() => undefined)` 吞掉（非 unhandled）：suggest 失败仅弹层不展示，重输即重试，与日历 loadAction（首屏数据错误需错误态）语义不同                                                                     |
| input-tree                     | P2-1 | input-tree.md:53         | onlyLeaf 非 cascade 父节点可选为 input-tree/tree-select 共享语义（公共控制器 `toggleTreeSelection`，tree-options.ts:136 仅 flatten 列表过滤）；AMIS 差异在 design 声明范围外（仅 cascade 节承诺只叶），行为一致性 = supported baseline |
| input-tree                     | P3-1 | input-tree.md:49         | 根 data-testid 透传与 FieldFrame 重复（field-frame.tsx:229 实证冲突已回退），tree-select 既有透传行为无害，keep                                                                                                                        |
| input-tree                     | P3-2 | input-tree.md:50         | clear handle 写 undefined vs tree-select 写 ''：两组件各自契约内部一致，统一为跨组件一致性记录                                                                                                                                         |
| input-tree                     | P3-3 | input-tree.md:51         | valuePathMap 基于 baseOptions：enableNodePath + 懒加载回退 String(v) 为文档化限制，keep                                                                                                                                                |
| detail-view                    | P3-1 | detail-view.md:42        | name 仅作 scopePath fallback 为 container 级语义边界（design 已立契），keep                                                                                                                                                            |
| list                           | P2-3 | list.md:18               | hasMore 缺省 true 支持 items 增长模式（D3 终裁，跨组件分页语义基准）                                                                                                                                                                   |
| markdown-editor                | P3-2 | markdown-editor.md:41    | rows 固定 8：textarea 族增强项（schema prop 非承诺），keep                                                                                                                                                                             |
| markdown-editor                | P3-4 | markdown-editor.md:30,43 | 大文档每键全量 parse：live preview 固有取舍（design §10），useDeferredValue 为优化候选                                                                                                                                                 |
| object-field                   | P3-2 | object-field.md:43       | transformIn/Out 失败 console.warn + env.notify 兜底：重试由宿主动作触发为设计意图                                                                                                                                                      |
| select                         | P3-1 | select.md:26,42          | loadingWithRemote 期间 clearable 可用：低风险（清空不触发请求），keep                                                                                                                                                                  |
| table                          | P3-2 | table.md:57              | `pagination.mode:'infinite'` 声明 crud 消费（crud-query-region.tsx:123-124），非 table 行为，keep                                                                                                                                      |
| table                          | P3-3 | table.md:58              | `showSizeChanger` 声明 crud 传值（crud-renderer.tsx:385），非 table 行为，keep                                                                                                                                                         |
| tag-list                       | P3-1 | tag-list.md:41           | `_fieldState` 未消费订阅为维持响应性的有意订阅（无死代码），keep                                                                                                                                                                       |
| tree                           | P3-1 | tree.md:40               | `aria-selected={isTabbable}` 表达 roving-tabindex 活动节点：行为无害，a11y 专项改进候选                                                                                                                                                |
| tree                           | P?   | tree.md:22               | tree 无事件字段为 design §2 不采纳行（与 AMIS 差异声明），keep                                                                                                                                                                         |
| tree-select                    | P3-1 | tree-select.md:51        | 同 input-tree P3-1（testid 透传重复行为无害）                                                                                                                                                                                          |
| tree-select                    | P3-2 | tree-select.md:52        | 同 input-tree P3-2（清空值类型差异，两组件内部一致）                                                                                                                                                                                   |
| tree-select                    | P3-3 | tree-select.md:53        | 同 input-tree P3-3（valuePathMap 限制文档化）                                                                                                                                                                                          |
| wizard                         | P3-2 | wizard.md:57             | 步进切换无焦点管理（D2 终裁 keep，AT 上下文已由 aria-current 提供）                                                                                                                                                                    |

### defer-other（7 条，明确 successor）

| 组件        | 编号      | 来源                      | successor 路径                                                                                           |
| ----------- | --------- | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| json-view   | P2-b      | json-view.md:22,39        | 推荐句柄 `component:copy/onCopy`：未来 capability 面组件计划（D4 复核通过）                              |
| collapse    | P2 / P2-b | collapse.md:32,41         | 推荐句柄 `component:setValue/openItem/closeItem`：同上                                                   |
| wizard      | P2-b      | wizard.md:55              | 推荐句柄 `component:*`（G6-G10）：同上                                                                   |
| tag-list    | P3-2      | tag-list.md:42            | `component:addItem/removeItem` handles：同上                                                             |
| icon-picker | P3-5      | icon-picker.md:46         | iconTemplate region（design §6「后续可开放」）+ `component:open` handle（design §8「归后续评估」）：同上 |
| transfer    | P2        | transfer.md:26            | 远程选项/分页：design §2/§8 明确本地 searchable 首版，P2/P3 successor                                    |
| pagination  | —         | list design §7 推荐句柄节 | 推荐句柄复核登记（D4）：非承诺契约                                                                       |

## 聚合引用覆盖说明

以下卡状态/全卡复查行含「归 CR」聚合引用，已由上述组件条目覆盖（不单独成条）：

- alert.md:55、carousel.md:57、diff-view.md:93、json-view.md:58、collapse.md:59、grid.md:58、wizard.md:78、calendar.md:8,63、gantt.md:8,66、kanban.md:8,65、barcode-input.md:8,64、condition-builder.md（卡状态）、input-tree.md（卡状态）、statistics.md:58（P2-4 backlog 行）

## CX-7 潜伏项裁决（roadmap 登记联动）

- 登记：roadmap CX-7 行（2026-08-03-0517-2 事后回写）——`useFluxTranslation` t() 为命名空间相对 key 语义，barcode-input 的 `flux.*` 前缀用法为同型潜伏问题。
- 实证（2026-08-06）：`useFluxTranslation()` → `useTranslation('flux')`（flux-i18n/src/hooks.ts:4-7），i18next 绑定命名空间 t 不做前缀归一化；对照模块级 `t`（i18n.ts:122-125）与 UI bridge（:46）均经 `normalizeTranslationKey` 剥 `flux.` 前缀。node 实证：bound-ns `t('flux.barcode.required')` 返回原始 key（未翻译）。barcode-input `t('flux.barcode.*')` 10+ 处（barcode-input.tsx:123,133,137,141,146,150,239,257,300,311）全部受影响。
- 终裁：**fix（根因修复）**——`useFluxTranslation` 内对 t 做同一前缀归一化（与同包模块级 t / UI bridge 口径一致），使 `flux.*` 前缀 key 恒可解析；barcode-input 既有调用零改动即可解析。落地 Phase 4 + flux-i18n focused 测试（相对 key 与 `flux.` 前缀 key 均解析）。

## Phase 4 i18n 实证扫描结果（联动登记）

`rg`/脚本实证扫描（scheduling/graph/ai/mobile 包非测试源码）后清理项：

| 位置                                    | 原硬编码                                        | 落地                                                                                                                |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| gantt-grid.tsx DEFAULT_COLUMNS          | Task/Start/End/Dur/Pred 列头                    | `scheduling.gantt.columnTask/start/end/duration/columnPredecessor`（render 期 t() 解析，随 locale 响应）            |
| gantt.tsx zoomLevels 默认               | Day/Week/Month                                  | `scheduling.gantt.zoomDay/zoomWeek/zoomMonth`                                                                       |
| gantt/components/resource-load-grid.tsx | aria-label "Resource load" + 表头 Resource/Load | `scheduling.gantt.resourceLoadLabel/resourceColumn/loadColumn`                                                      |
| barcode-scanner-overlay.tsx:267         | aria-label "Camera feed for barcode scanning"   | `flux.barcode.cameraFeedLabel`                                                                                      |
| graph-renderer.tsx:580-607              | aria-label Zoom in/out、Fit view、Toggle layout | `flux.graph.zoomIn/zoomOut/fitView/toggleLayout`（graph 在 flux-i18n 覆盖面内 → 本 plan 清理，非 graph owner 计划） |
| CX-7                                    | useFluxTranslation 前缀归一化                   | hooks.ts normalizeTranslationKey 包裹（+flux-i18n 测试）                                                            |

扫描残留（裁决 keep，非 UI 文案）：

- `ai-action-provider.ts:51 title="New chat"`——位于 JSDoc 注释示例（`ai:createConversation` args 文档），非 UI 渲染文案。
- `mobile-renderer-definitions.ts:185 text="Notice"`——notice-bar schema 内容默认值（作者可配置内容字段），非 UI chrome。

`pnpm check:i18n-keys` 绿（本 plan 新增键全部双 locale 配对）。
