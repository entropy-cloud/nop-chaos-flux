# 2026-09-28 性能与 UI/UX 深度优化分析报告

> Status: final
> Last Reviewed: 2026-09-28
> Source: 三路独立探索 agent 代码审计（核心响应式热路径 / 数据展示渲染器 / UI-UX 代码级）+ playground 浏览器实测 + bundle 产物实测 + 既有一键审计脚本基线核对
> Related: `docs/architecture/performance-design-requirements.md`（规范契约）、`docs/architecture/table-row-identity-and-scope-performance.md`

## 目的

对本项目做一轮性能与 UI/UX 的深度优化前分析：找出真实、可执行的优化项，与既有已登记基线（gated audit scripts）区分开，并为后续 owner plans 提供逐条证据。所有 finding 均经过实现代码核验（非猜测），关键项另做了运行时复现。

## 方法与输入

1. **静态门禁核对**：`check:audit-performance-suspects`（33 hits，全部为已登记的 JSON.stringify 用法）、`find-react19-optimization-candidates`、`find-styling-suspects`（221 hits 已登记）、`find-ui-consistency-gaps`（220 instances 全部 exempt）、`find-canvas-wrapper-a11y-gaps`（0）——`pnpm check` 全链 exit 0（2026-09-28 基线，`_tmp/perf-ux-audit-20260928/pnpm-check-baseline.txt`）。本报告的 findings 均为**门禁未覆盖的新发现**。
2. **核心热路径代码审计**（flux-formula / flux-runtime / flux-react 订阅链）。
3. **数据展示渲染器审计**（table / select / list / tree / transfer）。
4. **UI/UX 代码级审计**（form 校验链、Dialog、scheduling、mobile、content）。
5. **浏览器实测**：playground（dev server 4175）表单提交校验反馈、Dialog 焦点行为、combo 重复 id 检测、performance-table 页加载。
6. **bundle 实测**：`apps/playground/dist`（2026-09-27 构建）chunk 尺寸与 gzip。

---

## 一、性能 Findings（按用户可见影响排序）

### P1 [HIGH] 原始表达式字符串每次 `helpers.evaluate()` 都完整重编译（每行每渲染）

- **位置**：`packages/flux-runtime/src/runtime-eval-helpers.ts:20-25`（`compileValue` 仅对 object 目标走 WeakMap 缓存，字符串直接落空）；`packages/flux-formula/src/compile/formula-compiler.ts:101-141`（每次 compile 完整跑 rewrite→parse→bind→diagnostics→static-eval；且 `ensureCompileOptions` 每次重建整张 builtin symbol table，`buildBindingContext` 每次新建 3 个 Set）。
- **热调用点**：`table-body-row-rendering.tsx:192`（`classNameExpr` 每行每列每渲染）、`table-row-leading-cells.tsx:72-73`（`expandableWhen`）、`use-table-selection.ts:149-155`（`checkableWhen`）、`flux-renderers-basic/src/keyboard.tsx:97`。
- **规模**：1000 行 × 5 个 `classNameExpr` 列 = 每次渲染 ~5000 条完整编译管线。
- **修复方向**：在 `createFormulaCompiler.compileExpression/compileTemplate` 内加字符串键缓存（键 = 归一化 source + options 指纹，有界 LRU）；`compileValue` 对字符串目标同样缓存。
- **亲测证实**（executor 复核 `runtime-eval-helpers.ts` 与 formula-compiler 全文无 cache）。

### P2 [HIGH] 节点解析时 meta 表达式双重求值（`resolveNodeProps` 重跑 `resolveNodeMeta` 刚算过的结果）

- **位置**：`packages/flux-runtime/src/node-runtime.ts:195-290`（meta 求值）与 `:358-397`（`projectRendererFacingMeta` 重新 `evaluateCompiledValue` 同四个 leaf：disabled/className/frameClassName/testid）；`packages/flux-react/src/node-renderer-resolved.tsx:97-100` 同一 pass 内背靠背调用两者。
- **机制**：`evaluateLeaf`（`flux-formula/src/evaluate.ts:92-129`）在引用复用检查前**无条件执行** `node.compiled.exec`，且每次分配独立 dependency collector。
- **修复方向**：`resolveNodeProps` 优先读取同一 `getNodeResolution` pass 中已写入的 `state.resolvedMeta`，缺失时回退现算。
- **亲测证实**。

### P3 [HIGH] 行级 scope 缓存快照每次渲染分配新 Map，击穿 flattened-items memo

- **位置**：`packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts:77-82,261`——`createRowScopeCacheSnapshot(rowScopeCache, _structureVersion)` 忽略版本参数、无条件 `new Map(...)`；返回值是 `table-virtual-body.tsx:73-107` 与 `table-body-rows.tsx:226-250` 中 `flattenedItems`/`groupedFlattenedItems` useMemo 的依赖 → 每次 TableRenderer 渲染（含选择点击、任意 scope tick）都重跑 O(n) `buildFlattenedItems`（虚拟化下依旧）。`VirtualBody` 是 compiler-skip 组件（`react-hooks/incompatible-library` 豁免），无编译器兜底。
- **修复方向**：快照标识仅在 `structureVersion`（或可见键集）变化时更替。
- **亲测证实**。

### P4 [HIGH] Select（multiple）/CheckboxGroup O(n×m) 选项-值匹配

- **位置**：`packages/flux-renderers-form/src/renderers/input-choice-utils.ts:187-235`（`resolveChoiceComboboxValue` multiple 双向 filter×some；`resolveChoiceMobileTriggerText` 每个选中值一次 find）；`checkbox-group-renderer.tsx:71-72,127-137,181`（`isSelected` 每选项 some、`checkAllState` filter）。
- **规模**：5000 选项 × 1000 选中 = 每次渲染/切换 5M+ `Object.is`；搜索每个键击都触发。
- **修复方向**：一次 O(n+m) 建 `Map`/`Set` 索引（transfer-renderer 已是该模式的范本）。
- **亲测证实**。

### P5 [HIGH] Playground 单入口 chunk 8.56MB（gzip 2.38MB）——manualChunks 配置对 workspace 包完全失效

- **实测**：`dist/assets/index-COfSWHdG.js` 8560KB/gzip 2376KB；总 JS 18.1MB；产物中**不存在** `ui-*`/`spreadsheet-*`/`flow-designer-*`/`report-designer-*` 等 manualChunks 目标 chunk，而 `react-vendor`（188KB）存在。
- **根因**：`apps/playground/vite.config.ts` 的 `manualChunks(id)` 用 `id.includes('@nop-chaos/...')` 匹配，但 workspace 包经 alias 解析为绝对源码路径（`/…/packages/ui/src/index.ts`），永不命中 → 除 react 外全部落入单一入口。
- **次因**：App.tsx 仍有 ~55 个页面静态导入（11 个 lazy 已是既定模式，注释明确该方向），13 个 renderer 包启动即全量注册。
- **修复方向**：manualChunks 按 resolved 路径匹配（如 `id.includes('/packages/spreadsheet-core/')`）；按既有 lazy 模式扩展重页面；可选：renderer 注册延后。属 playground/开发体验与演示首屏，不影响 host 侧产物（host 自行打包）。
- **亲测证实**（chunk 清单 + gzip 实测）。

### P6 [MEDIUM] 列宽测量 digest `JSON.stringify` 每渲染重算全量列定义

- **位置**：`packages/flux-renderers-data/src/table-renderer/column-width-measure.ts:66-87`——`useMemo(() => JSON.stringify(digest), [digest])` 的 `digest` 数组在调用点（`table-renderer.tsx:395-402`）内联构造，标识每渲染刷新 → memo 永不命中；`digest[0]` 是完整列 schema 数组。P1 规范禁止交互 tick 上的深度 stringify。
- **修复方向**：digest 由标量字段（名称+宽度+fixed 等）join 成字符串并以其为 memo 键。

### P7 [MEDIUM] `useRowQuickEditDraft` 在所有行无条件运行（即使表格无快速编辑）

- **位置**：`table-body-row-rendering.tsx:163-169` 每行调用；`use-row-quick-edit-draft.tsx:70-88,164-168` 每行分配 2 个 `{...record}` 拷贝 + draft store；每数据变更 2×n 次 spread。
- **修复方向**：`rowDraftEnabled` 为 false 时返回模块级 stub API 或下沉到条件挂载子组件。

### P8 [MEDIUM] Select 虚拟化为 opt-in；静态路径每次键击重包装全部选项

- **位置**：`input-choice-renderers.tsx:111-123,140,405-421`（`virtualEnabled = virtual && allOptions.length > 100`，未显式 `virtual: true` 则 5000 选项全挂载）；`sanitizeChoiceOptions(props.props.options)` 未 memo 每渲染重建对象数组；静态列表 `highlightText` 每选项每键击编译新 RegExp。
- **修复方向**：memoize sanitize；每查询提升单个 RegExp；virtual-by-default 翻转属兼容性决策需单独裁定。

### P9 [MEDIUM] ListRenderer infinite 模式无 windowing；ListItemView 无显式 memo

- **位置**：`flux-renderers-data/src/list-renderer.tsx:186-195,515-563,92-184`——infinite 已载 1 万条即全挂载；非编译 host 下每次选择点击重渲染全部条目。
- **修复方向**：TanStack Virtual（VirtualBody/ai-message-list 已有先例）+ 显式 `React.memo(ListItemView)`。

### P10 [MEDIUM] Tree 每次焦点移动整树重渲染 + 每 render 未 memo 的 O(n) 遍历 + DOM 扫描找焦点

- **位置**：`flux-renderers-data/src/tree-renderer.tsx:453,461,502-577,632-659`——`knownNodeIds = collectTreeNodeIds(...)` 每 render 重跑；5 个焦点处理函数每 render 重建（fresh closures 击穿 compiler element-memo）；每次按键 `getVisibleTreeItems`（querySelectorAll 全树）+ 线性 find。
- **修复方向**：`useCallback` 五个 handler、`useMemo` knownNodeIds、`Map<nodeId, HTMLElement>` ref 注册表。

### P11 [MEDIUM] checkableWhen 每数据变更创建/销毁 N 个一次性 row scope store

- **位置**：`use-table-selection.ts:134-158`——每行 `createScope`→zustand store+composite 接线→dispose；表格已有持久 row scope cache 可复用。

### P12 [MEDIUM] 作用域级联：组合 scope store 在任何祖先变更时无条件唤醒全部后代

- **位置**：`packages/flux-runtime/src/scope.ts:266-299`——子 store 订阅父 store，父变更先 `readVisible()` 重算（`:177-199`，新 prototype 链视图 + sanitizeSnapshot 键遍历）再做依赖过滤；标识守卫因父可见视图标识必变而永不命中。依赖过滤只在 React 层（`hook-subscriptions.ts:214-232`）一层生效；无 `paths` 的订阅者每次祖先变更都重跑 selector。表格 row scope（`isolate: true`）豁免——这正是表格表现良好的原因。
- **修复方向**：将 change-path 过滤下沉进 composite store（父变更 paths 被子 own keys 遮蔽/不相关时跳过重算与监听器扇出），或脏标记 + `getSnapshot` 惰性重算。语义敏感，需最严格测试门。

### P13 [MEDIUM] 动态 structural 字段强制 wildcard props 依赖 → 任意 scope 变更全量 props 重解析

- **位置**：`node-runtime.ts:348-353,407-412`——任一 dynamic structural field（items/columns/options…）→ `paths: ['*']` → `node-renderer-resolved.tsx:101-115` 订阅每变更触发、全 props 树重求值（React 侧 shallowEqual 兜底，但 JS 成本全付）。
- **修复方向**：记录 structural field 实际收集到的依赖，替代 blanket wildcard。

### P14 [LOW-MEDIUM] 其余已证实但影响较小的条目

- `normalizeNodeInput` 仅按 input 标识 memo，运行时构造 schema 每次全量重编译（`flux-compiler/src/schema-compiler.ts:217-224`、`flux-react/src/render-nodes.tsx:283-286`）→ 可仿 `compiledValueCache` 加 WeakMap。
- 表达式引擎每次 exec 分配 6 个闭包（`flux-formula/src/evaluator.ts:126-212`）+ 每 leaf 一个 dependency collector（`evaluate.ts:92-110`）+ `scope-change.ts:157,166` 每变更×每订阅者重建 Set/路径索引（订阅依赖集本为静态）。
- `hasSourcePropsInValue` 对 `sourcePropKeys.length === 0` 的节点仍做全 props DFS（`use-node-source-props.ts:23-59`）——可加快速路径（需先确认编译器只在声明键下产出 sources）。
- 排序比较器每比较调 `localeCompare`+`getIn`（`table-data.ts:75-134`）——decorate-sort-undecorate。
- `parsePath` 缓存命中仍 `[...cached]` 拷贝（`flux-core/src/utils/path.ts:27-31`）。
- loop `itemData` 每条每渲染创建/销毁真实子 scope（`flux-renderers-basic/src/loop.tsx:87-124`），可用 object-backed eval context。
- 死代码：`flux-formula/src/scope.ts:131-228` `createFormulaScope`（Proxy 追踪）确认全仓无调用点——可删。

### P15 [PROOF GAP] performance-table 压测页从未覆盖 `virtualThreshold` 模式

- `apps/playground/src/pages/performance-table/schema.ts` 只测分页路径与多字段页；`VirtualBody`、row-scope 快照在滚动下的行为、`buildFlattenedItems` 重算成本均无 harness 覆盖。修复 P3/P6 前应先补第三模式（unpaginated + virtualThreshold + scrollHeight）。

## 二、UI/UX Findings

### U1 [HIGH] combo 重复行产生重复 DOM id，错误关联错乱（浏览器实测证实）

- `packages/flux-react/src/field-frame.tsx:169-171`（`errorId=${name}-error`、`controlId=${name}-control` 仅按 name 派生，未用已持有的 `reactId`）；`node-frame-wrapper.tsx:26-27,61` 直传 schema name。
- **实测**：`#/lab/combo` 两行即出现 `name-control`×4、`phone-control`×4 重复 id → 2 行以上 `aria-describedby` 指向文档序第一个 `#title-error`，读屏播报错误行的错。array-editor 族已用 `${name}-${item.id}-value` 规避（`array-editor.tsx:74-75`），证明问题真实且已知。
- **修复**：errorId/controlId 并入 reactId/cid 保证唯一。

### U2 [HIGH] 同步校验失败时焦点不移到首个错误字段（浏览器实测；代码已具备该逻辑但未触发）

- 实测：`#/lab/form` 空表单点击 Submit → 错误提示与 `aria-invalid`/`aria-describedby` 均正确出现（`username-error` 关联存在），但 `document.activeElement` 停在 BODY。
- 根因（代码定位）：`form.tsx:347-388` 的 focus-first-invalid 订阅 `justStoppedSubmitting && state.submitAttempted`——校验**同步失败**时 `submitting` 可能从未翻 true，转换不发生，焦点逻辑被跳过。待执行期以失败测试先证实该时序。
- **修复**：校验失败路径（无论 submitting 是否翻转）都触发首错聚焦。

### U3 [HIGH] `min-h-touch` 工具类未定义——移动端 select 触控目标静默失效

- `select-mobile-renderer.tsx:69` 使用 `min-h-touch`，但全仓唯一出现处；tailwind-preset/theme-tokens/mobile.css 均无 `--spacing-touch`/minHeight 扩展 → Tailwind v4 直接丢弃该类，≥44px 触控高度从未生效。
- **修复**：补 token 或改 `min-h-11`。

### U4 [HIGH] scheduling 族硬编码 gray-\* 调色板，dark mode 下不可读

- 实测计数：`flux-renderers-scheduling/src` 19 处/9 文件（kanban-column/board、kanban-activity-log/tag-filter/card-tags、calendar 三视图、gantt-timescale）；form/data/content 族 0 处（basic 的命中全在测试文件）。违反 styling contract 的 token 层约定。
- **修复**：机械映射 `text-gray-400/500→text-muted-foreground`、`text-gray-800→text-foreground`、`border-gray-*→border-border`、`bg-gray-100→bg-muted`；手搓 kanban 骨架 div 换 `@nop-chaos/ui` Skeleton。

### U5 [MEDIUM] echarts-renderer 无 loading 态——异步加载期闪现"暂无数据"

- `echarts-renderer.tsx:368-381` 直接以空态渲染，全文无 loading；相邻 `chart-renderer.tsx:570-621` 已有正确范式（loading 优先于空态 + `role="status"` spinner）。

### U6 [MEDIUM] `aria-required` 从未到达控件；动态 required 对读屏不可见

- `field-frame.tsx:190-206` cloneElement 注入 id/labelledby/describedby/errormessage/invalid 唯独缺 aria-required；`:236` 把它挂在 wrapper label/fieldset 上（AT 不暴露）；`:241-245` 可见 `*` 为 aria-hidden。date/time/picker/tree-select/transfer/combo 等控件自身也只声明静态 `props.required`（grep 证实无 aria-required）；FieldFrame 已算出含动态规则的 `effectiveRequired` 却不与控件共享。
- **修复**：注入 `'aria-required': effectiveRequired`，删除各渲染器静态重复。

### U7 [MEDIUM] Dialog 打开时初始焦点未移入对话框（浏览器实测）

- 实测：打开后 `document.activeElement` 仍为触发按钮（Esc 关闭后焦点恢复触发按钮——这部分正确）。base-ui 1.3.0 有 `defaultInitialFocus` 机制，但 flux Dialog 未生效，待执行期定位（wrapSurfaceTabFocus/portal 时序）。违反 WAI-ARIA APG dialog pattern。

### U8 [LOW] key-value 移动按钮硬编码英文 aria-label

- `form-advanced/key-value.tsx:213,229`（`Move up entry N`）；同文件 `:246` 已正确用 `t('flux.form.remove')`；array-editor 同位按钮已用 i18n。

### U9 [LOW] Tree chevron 命中区 20px

- `tree-option-list.tsx:94-99` `size="icon-xs"`（24px）再被 `size-5` 覆盖为 20×20，低于 WCAG 2.5.8 下限。

### U10 [MEDIUM] Transfer 无列表键盘导航（每选项一个 Tab stop）

- `transfer-renderer.tsx:421-444` 无 roving tabindex/方向键/虚拟化；对照 `tree-option-list.tsx` 三者齐备（含 >100 行虚拟化 + scroll-to-active）。图标按钮已有正确标签与禁用态（可操作，只是大选项集下痛苦）。

### U11 [OBS] 其余观察项（不建议本期修复，判定理由见 plans）

- hint 文本 focus-only（`field-frame.tsx:173`）：与 AMIS parity 的设计取舍，描述行与 hint 互斥隐藏。记为 optimization candidate。
- 表格分页器中英文混排（table lab 页）：playground 演示数据层面问题，非产品代码。

## 三、已核查为"已优化良好"、本期不动的内容

**性能面**：`useSyncExternalStoreWithSelector` fork 的标识守卫；依赖过滤订阅（scope-change 索引 + 单段快速路径）；node 解析引用稳定门（resolvedMeta/\_lastPropsResult shallowEqual、static folding）；form store per-path 订阅（P7 合规，1000 字段键击 O(变更路径)）；表格行身份管线（持久隔离 row scope + MemoizedDataRow 内容比较器 + TanStack 虚拟化 + duplicate-key 计数单遍）；action dispatch（program WeakMap 缓存、prevention 预扫描、无深拷贝）；zustand store 生命周期（非每渲染创建）；debug 捕获 P9 门禁；组件句柄 O(1) 注册表。
**表格专项**：transition 包载面（分页/排序/筛选/选择/tab）符合契约；expand 切换未包 transition 属契约外项（已记 P14 级 hygiene）；树子节点 50/tick 分批挂载（H17）；transfer 全量 memo 化；auto-fill height 的 ResizeObserver+rAF。
**UX 面**：form 校验链（错误关联/alert/live region/Enter 提交防呆/submitOnChange debounce 300ms）；select 远程搜索（300ms debounce + AbortController + 下拉内 loading/error + 回显缓存）；input-suggest 完整 combobox ARIA；tree-select（roving tabindex/activedescendant/mixed/lazy 重试/虚拟化）；Dialog 焦点陷阱 + Tab 兜底 + sr-only 关闭标签 + 键盘拖拽 toolbar；kanban 键盘移动 + aria-live 公告；gantt 键盘条编辑 + skeleton + inert；data 族 lazy 节点重试/分页 aria/列设置 expanded；mobile 触控链（pull-refresh live region、scroll-into-view、inputMode）；AI 消息 log/live；condition-builder 组合 ARIA；carousel 自动播放三停（WCAG 2.2.2）；upload 逐文件进度/错误；图标按钮 aria-label 全覆盖核查。

## 四、结论与后续工作项

以上 findings 按结果面合并为 6 个 owner plans（避免逐条碎片化，符合 plan guide Rule 22/25/26）：

| Plan                               | 结果面                                             | 覆盖 findings                        |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------ |
| 1 表达式求值与节点解析热路径优化   | flux-formula/runtime 编译求值链                    | P1、P2、P11                          |
| 2 表格与数据展示渲染器性能优化     | table/select/list/tree 渲染器                      | P3、P4、P6-P10                       |
| 3 Playground bundle 体积优化       | playground 构建                                    | P5                                   |
| 4 表单可访问性与错误关联修复       | 表单族 a11y/焦点/错误关联                          | U1-U3、U6-U8（+U7 验证修）           |
| 5 视觉一致性与交互修复             | scheduling token 化 + loading/空态 + transfer 键盘 | U4、U5、U9、U10                      |
| 6 作用域级联与依赖过滤 JS 成本优化 | flux-runtime scope/依赖管线                        | P12、P13、P14（含 P15 harness 补缺） |

P14 中影响最小且需 profiling 确认收益的条目（表达式引擎闭包提升、parsePath 拷贝）与 U11（hint 常显）在对应 plan 内显式裁定 deferred / watch-only，不作为静默降级。
