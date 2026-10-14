# E2E 交互就绪态 DOM 契约（第二轮：状态与残留）

> 日期：2026-10-14
> 范围：跨项目分析——脆弱交互证据来自宿主仓库 `nop-chaos-next` 的 `packages/e2e-shared`（`CrudListPage` / `FluxAdapter`）与 `tests/e2e/`；改进落点 `nop-chaos-flux` 渲染器与 `packages/ui`。
> 前序：`docs/discussions/2026-08-01-flux-e2e-selector-standardization.md` 解决了"字段在哪、是什么控件、选项 value"（`data-field` / `data-renderer` / `data-value`），已落地为 Layer 2 契约。本轮解决剩余的"**什么时候可以安全交互**"——加载就绪、弹层关闭残留、确认点击竞态。
> 目标：把宿主 E2E 里的 force-click、盲等 sleep、input 轮询、reload 兜底、点击重试，替换为按契约直读的确定性等待。

---

## 1. 背景：宿主 E2E 的碎交互清单（实证）

宿主 `CrudListPage`（510 行）当前携带以下 workaround，每一处注释都写明了竞态机制：

| #   | Workaround                                       | 位置（nop-chaos-next）                           | 规避的问题                                                 |
| --- | ------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------- |
| W1  | `waitForListWithReload`：30s 等不到就整页 reload | `packages/e2e-shared/src/CrudListPage.ts:95-103` | SPA 首次挂载 CRUD 偶发不挂载/不查询，无就绪信号可等        |
| W2  | `clickEdit` 轮询非空 input + 固定 300ms          | `CrudListPage.ts:299-332`                        | 编辑弹窗 loadAction `setValues()` 异步填充，无"已回填"标记 |
| W3  | search/refresh `click({ force: true })` ×3       | `CrudListPage.ts:134`、`:144`、`:438`            | 行操作下拉 Menu 关闭后残留全屏 inert 层拦截指针            |
| W4  | `tryClickConfirm` 点击后验证关闭，失败重试 ×3    | `CrudListPage.ts:186-211`                        | 确认框首次点击可能落在重渲染窗口期被吞掉                   |
| W5  | `rowActionWithConfirm` 整体重试 ×2               | `CrudListPage.ts:218-232`                        | 菜单关闭时指针下元素已更替，菜单项点击落空                 |
| W6  | 遍布全文的 `waitForLoadState('networkidle')`     | `CrudListPage.ts:82`、`:147`、`:312`、`:439` 等  | 表格/CRUD 无 DOM 加载态标记，只能等网络静默                |

W1–W6 全部是"渲染器没把生命周期状态暴露为 DOM 契约"的症状。继续在宿主侧加 sleep/重试只能包住症状；flux 自持渲染管线，正确路径是**从源头补契约**。

## 2. 根因（flux 侧逐一核实，2026-10-14 live baseline）

技术栈前提：`packages/ui` 基于 **Base UI**（`@base-ui/react@1.3.0`），非 Radix。

### 2.1 表单 loadAction 无"已回填"标记（→ W2）

- `packages/flux-renderers-form/src/renderers/form-load-action.ts:42`：`const [loadLoading, setLoadLoading] = useState(false)`——**首帧为 false**；置 true 的 effect 在首帧之后才跑（`:67`），存在"busy 缺席但数据未加载"的首帧窗口。
- 同文件 `:79` `.then` 里 `setValues(result.data)`、`:99` `.finally` 里 `setLoadLoading(false)`——两者批入同一次 commit，"busy 消失 ⇒ 值已写入"在 commit 后成立，但首帧窗口 + busy 与 submit 共用节点使其不可作为可靠等待信号。
- `packages/flux-renderers-form/src/renderers/form.tsx:617-629`：`loadLoading || formSubmitting` 共用唯一标记 `[data-slot="form-busy"]`（presence-only），缺席时语义歧义（未开始 / 已完成 / 无 loadAction）。
- 字段级 `data-field-dirty`（`flux-react/src/field-frame.tsx:265-269`）只反映**用户编辑**，loadAction 回填不算 dirty，无法替代。全仓无 `data-loaded` / `formLoaded` 类标记（grep 0 命中）。

### 2.2 CRUD/表格无加载就绪标记（→ W1、W6）

- `packages/flux-renderers-data/src/crud-renderer.tsx:550-556`：`.nop-crud` 根只有 `data-testid` / `data-cid` / `data-responsive`，**无任何 loading/ready 属性**。
- `packages/flux-renderers-data/src/crud-renderer-load.ts:98`：`const [loading, setLoading] = useState(false)`——与表单同款**首帧 false**；查询在 mount 后的 effect（`:334-398`）才 dispatch。
- 首载期间表格渲染 `[data-slot="table-empty-row"]` 空行（`table-renderer/table-body-rows.tsx:220-222`；virtual 模式第二位点 `table-renderer/table-virtual-body.tsx:139`），与"真·零结果"**不可区分**。
- `packages/flux-renderers-data/src/crud-renderer-schema-builders.ts:95`：`loading: useLoadAction && paginationMode === 'pages' ? loading : undefined`——整表加载 overlay（`table-loading-overlay.tsx:14-26`，`role="status"`）**仅 pages 模式**投射；`.nop-table` 根（`table-renderer.tsx:511-522`）无 `aria-busy` / `data-loading`。source 模式与 infinite 模式刷新期 DOM 无信号。
- 状态摘要只走 scope 通道（`crud-renderer.tsx:210-225` → `statusPath`），且 `refreshing` 首载刻意为 false（`docs/components/crud/design.md:352`）——scope 摘要不能替代 DOM 契约（E2E 测的就是生产 DOM）。

### 2.3 弹层关闭残留与菜单关闭时序（→ W3、W5）

- 行操作下拉 = `dropdown-button` 渲染器（`packages/flux-renderers-layout/src/dropdown-button-renderer.tsx:153` 受控 `DropdownMenu`；item 在 `:187-198`，key 回退 `String(index)`，`data-item-key` 已有）。
- Base UI Menu 默认 **`modal: true`** → 打开期间渲染全屏隐形 `InternalBackdrop`（`[data-base-ui-inert]`）。关闭后 positioner 在 exit 动画（~100ms）内仍 mounted；`!open` 时 positioner 置 `pointer-events: none`，动画结束才卸载——**残留窗口 = 动画时长**，期间全屏 inert 层与关闭中的 popup 仍在 DOM。
- Base UI Menu 的 `outsidePressEvent` 默认 `'sloppy'`：**pointerdown** 落在弹层外即关菜单（Popover 则对 mouse 用 `'intentional'`，click 才关）。配合 `dropdown-button-renderer.tsx:63-79` hover 模式 150ms 关闭宽限，存在"菜单在 pointerdown 与 click 之间关闭、指针下元素更替"的窗口——W5 的直接机制。
- `packages/ui` 层 `data-open` / `data-closed` 属性已由 Base UI 写在 popup 上（`dropdown-menu.tsx:68`、`popover.tsx:39`、`alert-dialog.tsx:32/74` 的 `data-open:` / `data-closed:` 变体即读它），**但未被冻结为契约**，宿主无从依赖"等 `data-closed` / 等 detach"。

### 2.4 alert-dialog 确认点击竞态（→ W4）

- z-index 在 **mount 时**从全局计数器预留（`packages/ui/src/hooks/use-global-z-index.ts`，基线 2000）；常驻实例会压在后开弹窗之下，其全屏 overlay 使确认按钮"可见但 pointer-dead"——playground `confirm-bridge.tsx:46-56` 已记录该机制并以"请求间保持 unmount"规避。
- `AlertDialogAction`（`alert-dialog.tsx:160-177`）无任何 pending 状态：`Button` 本身支持 `loading`（`button.tsx:83-86`，`data-loading` + `aria-busy` + disabled），但 alert-dialog 未接线；关闭后第二次点击静默 no-op。
- `use-surface-focus-wrap.ts:77-99` 补偿焦点在 mount 后**两个 rAF** 才落位，open 后紧接的点击可能与焦点迁移交错。
- `action-interaction-state.md:198` 已预留裁决位：dialog confirm 属 surface 之上的未来 `Semantic Lifecycle Owner`，**不应与 open-state 混为一份**；`:265-273` 明确通用按钮不自动禁用。本轮只做**机制供给**（loading 透传），不做 runtime 自动接线。

### 2.5 data-slot 覆写次序（横切隐患）

`popover.tsx:37→42`、`alert-dialog.tsx:71→78`、`dropdown-menu.tsx:66` 均为先写 `data-slot` 再 `{...props}` 展开——消费方传入的 `data-slot` 会**顶掉**默认值（已知用例：`dirty-close-guard.tsx:63` 有意覆写为 `dirty-close-guard`）。宿主选择器 `[data-slot="popover-content"]` 对 cell-popover（覆写为 `table-cell-popover-content`）失配即此机制。覆写本身是特性，但"默认槽位何时可信"没有契约陈述。

## 3. 契约方案

延续前序原则：**生产常驻、纯新增、enum 直读、契约测试冻结**。状态用 `data-*` enum 值（timeline v2 `data-active-index` 上 root 的先例），不用 presence-only 存在性（首帧窗口 + 语义歧义的根源）。

### C1 · 表单加载态 `data-load-state`

落点：`form.tsx` 的 `section.nop-form` 根（现有 `data-form-mode` 等属性旁）。

```
data-load-state="idle | loading | loaded | error"
```

| 值        | 语义                                                             |
| --------- | ---------------------------------------------------------------- |
| `idle`    | 无 loadAction 或非 autoLoad，永不自动加载；或加载被显式重置      |
| `loading` | loadAction 请求在途（**含首帧**，见下）                          |
| `loaded`  | 最近一次自动加载成功且回填已提交（与 busy 消失同一 commit 边界） |
| `error`   | 最近一次自动加载失败（abort 除外）                               |

关键实现约束（修根因而非加皮）：

1. **同步初始态**：`form-load-action.ts` 的 `loadLoading` 初值改为 `Boolean(loadAction && autoLoad)`（lazy init），消灭"首帧 idle/loading 缺席"窗口；`data-load-state` 从同一状态源投影。
2. **与 submit 分离**：`data-load-state` 只覆盖 load 轴；`[data-slot="form-busy"]` 视觉节点保留（load|submit 共用不变），但测试等待一律走 `data-load-state`，不再依赖 busy 缺席。
3. `activationKey` 变化重载时按同一状态机走 `loading → loaded/error`。

### C2 · CRUD 查询态 `data-load-state`（同词汇表）

落点：`crud-renderer.tsx` 的 `.nop-crud` 根。

```
data-load-state="idle | loading | ready | error"
```

- `useLoadAction` 为真时：**首帧即 `loading`**（查询必然在 mount 后 dispatch），`onStart` 维持、`onSettle` 按结果转 `ready`/`error`（`crud-renderer-load.ts` 的 loadReaction callbacks `:253-320` 已有全部挂点）。
- source 模式：投影上游 source 的 loading（`sourceRefreshInFlight` 等已知量）；不可知时保持 `idle`，不假装。
- 语义：`ready` = 最近一次查询已 settle 且行数据已 commit。W1 的 reload 兜底、W6 的 networkidle 大部分由此吸收——E2E 改等 `data-load-state="ready"`（挂载竞态中"组件根本没挂"的残余由宿主长超时 + 显式 reload 保留，属宿主策略）。

### C3 · 表格加载投影补齐

- `.nop-table` 容器（或 `[data-slot="table-container"]` 内层）在 `schemaProps.loading === true` 时输出 **`data-loading`**（presence）+ `aria-busy="true"`；与 overlay 正交（overlay 仍只在 pages 模式叠加，遵守 `docs/components/table/design.md:202` "table 不自造请求协议"）。
- CRUD 投影面扩到 source 模式（`crud-renderer-schema-builders.ts:95` 处把 `loading` 从 pages-only 放宽为"loading 已知即投"；infinite 模式仍不叠 overlay，但 `data-loading` 可亮）。
- 首载空行歧义：`loading` 为真时 `table-empty-row` 增加 **`data-loading-placeholder`**——空行保留（布局不闪），但可与真·空结果区分。

### C4 · 弹层关闭契约（冻结 + 时序决策）

1. **冻结现有属性为契约**：popup 的 `data-open` / `data-closed`（Base UI 已写）+ 关闭动画结束后 inert backdrop（`[data-base-ui-inert]`）与 popup 节点均 detach——用契约测试固定（`packages/ui` 层，挨着 `overlay-family-zindex.test.tsx`）。E2E 从此"等 `data-closed` → 等 detach"，取代 force-click（W3）。
2. **`data-slot` 默认槽位陈述**：改为 `data-slot={props['data-slot'] ?? '默认值'}` + 从展开中剔除，行为等价（覆写仍可用）但次序意图显式化；契约测试钉"未覆写时默认槽位存在"。
3. **菜单外点时序 Decision**：dropdown-menu 维持 Base UI 默认 `sloppy`（产品行为，不为测试改 UX）；`dropdown-button` 行操作场景按 `data-trigger`（已有）+ 文档约定"E2E 面向的行操作用 `trigger=\"click\"`"；hover 宽限 150ms 行为不变。W5 的根治靠 C4.1 的确定性等待（点菜单项前等 `data-open` 生效、点完等关闭完成再交互），不在本轮改 outsidePress 语义。

### C5 · `AlertDialogAction` loading 透传（机制供给）

- `AlertDialogAction` 增加可选 `loading?: boolean`（`Pick<Button, 'loading'>`），透传至内层 `Button` → 自动获得 `data-loading` + `aria-busy` + disabled + 视觉 pending。
- **不做** runtime 自动接线（谁在何时置 loading 由 schema 作者/宿主 bridge 决定，遵循 `action-interaction-state.md` Auto-Disable Rules"generic button 不自动禁用"）。W4 的重试在宿主侧可逐步改为"置 loading → 等关闭"，弹窗常驻 + z-index 坑沿用 confirm-bridge 已有规避（属宿主模式，非本轮）。

## 4. 与前序方案的关系

| 维度   | 前序（2026-08-01，已落地）                    | 本轮                                                                                                |
| ------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 解决   | 字段**在哪**、**是什么**、选项 **value**      | 何时**可以安全交互**（就绪/关闭/挂起）                                                              |
| 属性   | `data-field` / `data-renderer` / `data-value` | `data-load-state` / `data-loading` / `data-loading-placeholder` / `data-open`·`data-closed`（冻结） |
| 层级   | Layer 2 字段选择器契约                        | Layer 2 生命周期状态契约（`action-interaction-state.md` 的 DOM 投影面）                             |
| 消费方 | `FluxAdapter.setFieldValue/cellValue` 重写    | `CrudListPage.waitForList/clickEdit/search/rowAction*` 重写                                         |

两轮合计后，宿主 `e2e-shared` 的确定性等待链条闭合：**定位（前序）→ 就绪（本轮 C1/C2/C3）→ 交互 → 关闭确认（本轮 C4/C5）**。

## 5. 落地步骤

执行细节归 plan（`docs/plans/593-e2e-readiness-contracts-plan.md`），此处只记顺序意图：

1. C1 表单 `data-load-state`（同步初始态 + 状态机 + 契约测试）。
2. C2/C3 CRUD `data-load-state` + 表格投影补齐 + 空行占位标记（契约测试）。
3. C4 弹层关闭契约测试 + `data-slot` 次序显式化。
4. C5 `AlertDialogAction.loading` 透传 + 契约测试。
5. owner-doc 回写：`docs/architecture/renderer-markers-and-selectors.md`（登记新状态属性）、`flux-guide/13-testing.md`（等待契约速查）、`docs/components/{form,crud,table}/design.md` 对应小节。

宿主侧消费（`e2e-shared` 重写、`sync-e2e-shared.sh` 下游同步）**不在本仓 plan 范围**，由 nop-chaos-next 侧接续（契约属性均为纯新增，宿主可灰度切换）。

## 6. 风险与注意事项

- **首帧即 loading 的回归面**：`data-load-state` 首帧 `loading` 要求 settle 必然发生；若 `enabled` 为假导致 effect 不 dispatch，状态机须停在可解释态（方案：`enabled` 为假时 `idle`，契约测试覆盖）。strict 校验开关下新增属性不得引入 schema diagnostic。
- **与 `statusPath` 的边界**：本轮全部走 DOM 契约，不扩 scope 摘要 DTO；两者并存（DOM 给机器/测试，statusPath 给 schema 表达式），文档写明分工。
- **Base UI 升级面**：C4 依赖 Base UI 在 popup 上写 `data-open`/`data-closed`——契约测试同时是升级护栏；若上游改属性名，测试先红。
- **不做的事**：不引入 agent 式兜底（宿主已裁定：flux 自持管线，agent 只对 external/iframe 页面有意义）；不改 outsidePress 语义；不做 dialog confirm 的 runtime 自动禁用（留给未来 Semantic Lifecycle Owner 工作）。

## 7. 一句话总结

> 宿主 E2E 的 force-click / sleep / 轮询 / reload 兜底，根因全是"flux 没把**加载就绪**与**弹层关闭**暴露为 DOM 契约"。**最小收益最大的改动：form/crud 根上 `data-load-state` enum（首帧即真值）、table `data-loading`+空行占位标记、弹层 `data-open`/`data-closed` 契约化冻结、`AlertDialogAction` 透传 `loading`**——即可把宿主的时序猜测替换为确定性等待，且全部纯新增、契约测试冻结、向后兼容。
