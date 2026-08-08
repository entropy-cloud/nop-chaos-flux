# 审计卡：fd-4 槽位（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-4 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-xyflow-canvas/designer-xyflow-node.tsx`（slot affordance）+ `designer-canvas.tsx`（DingFlowAddNodeMenu）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + tree-mode.md）

## 面身份

fd-4 槽位面：tree mode 空槽位（`designer-tree-empty-slot`）键盘激活路径（Enter/Space → `openSlotMenuFromElement` → onPlusButtonClick → DingFlowAddNodeMenu）+ 鼠标路径（handleSlotAffordanceClick）。宿主契约 = `designerHostContract`。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                 | 证据                                               | 发现                          |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------- |
| 1   | Schema 契约                 | 槽位为投影产物（TREE_EMPTY_SLOT_NODE_TYPE 虚拟节点），非 schema 面                                                   | designer-xyflow-node.tsx:43；tree-validation.ts:11 | —                             |
| 2   | RendererComponentProps 合规 | 槽位渲染经 props.data + useDesignerContext，无 store 直访                                                            | designer-xyflow-node.tsx:29-43                     | —                             |
| 3   | 值所有权三态                | slotData（ownerId/branchId）来自投影 data；坐标由 getBoundingClientRect 推导                                         | designer-xyflow-node.tsx:193-216                   | —                             |
| 4   | 表单参与                    | 无                                                                                                                   | —                                                  | —                             |
| 5   | DOM 与选择器契约            | `data-testid="designer-tree-empty-slot"` + `data-slot="designer-tree-empty-slot-affordance"`；宽高常量 EMPTY*SLOT*\* | designer-xyflow-node.tsx:226,247-253               | —                             |
| 6   | 嵌套 schema 分类            | 无嵌套 schema                                                                                                        | —                                                  | —                             |
| 7   | 事件与 action 契约          | onPlusButtonClick（canvas 层注入）→ handlePlusButtonClick → setPopover → createDingFlowMenuCommand 派发              | designer-canvas.tsx:116-126,192-200                | —                             |
| 8   | a11y                        | 槽位 role=button + tabIndex=0 + aria-label + Enter/Space 激活                                                        | designer-xyflow-node.tsx:222-243                   | P3-1（aria-label 硬编码英文） |
| 9   | i18n                        | affordance 文案走 t('flux.flowDesigner.addNode')；aria-label "Empty branch slot for …" 硬编码英文                    | designer-xyflow-node.tsx:225,256                   | P3-1                          |
| 10  | 四态覆盖                    | 空槽位渲染完整 affordance；零尺寸矩形 fail-closed 已锁（15-2 收敛）                                                  | designer-xyflow-node.keyboard.test.tsx:121-139     | —                             |
| 11  | 异步生命周期                | 无异步                                                                                                               | —                                                  | —                             |
| 12  | 组合宿主场景                | tree-mode spec 覆盖槽位渲染（虚拟槽位节点存在）；**键盘激活无真实浏览器场景（缺口）**                                | flow-designer-tree-mode.spec.ts                    | 缺口 → Phase 5 新增           |
| 13  | 样式契约                    | affordance 虚线圆角胶囊自样式（widget）；CSS 变量主题                                                                | designer-xyflow-node.tsx:246-257                   | —                             |
| 14  | React 19 规范               | 无冗余 memo；键盘 handler 内联绑定                                                                                   | designer-xyflow-node.tsx:237-242                   | —                             |
| 15  | 性能边界                    | 槽位节点数 = 空分支数，规模小                                                                                        | —                                                  | —                             |
| 16  | 测试质量                    | designer-xyflow-node.keyboard.test.tsx（13-01 Enter/Space 精确中心 + 15-2 零矩形 fail-closed + 鼠标路径）            | 同上                                               | —                             |
| 17  | 文档对照                    | tree-mode.md 槽位契约 ↔ 实现一致                                                                                     | —                                                  | —                             |
| 18  | 注册/边界/IO                | 无 IO                                                                                                                | —                                                  | —                             |
| H1  | host 契约                   | onPlusButtonClick 由 page-body 注入（tree mode），无 manifest 直读                                                   | designer-page-body.tsx:158-172                     | —                             |
| H2  | 事务 undo                   | 槽位加节点 → insertBranchChild 命令走 core（fd-8 详审）                                                              | —                                                  | —                             |
| H3  | 拖拽                        | 槽位无拖拽（点击/键盘激活）                                                                                          | —                                                  | —                             |
| H4  | 键盘                        | Enter/Space 激活 + preventDefault（防滚动/防重复触发）                                                               | designer-xyflow-node.tsx:237-242                   | —                             |
| H5  | 剪贴板                      | 无                                                                                                                   | —                                                  | —                             |
| H6  | e2e 可操作性                | tree-mode 间接覆盖；键盘激活场景缺失                                                                                 | flow-designer-tree-mode.spec.ts                    | 缺口                          |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                | —                                                  | —                             |

## 发现清单

- [P3-1] `designer-xyflow-node.tsx:225` aria-label "Empty branch slot for …" 硬编码英文 → 状态: 卡内记录（i18n 化归 DR 候选）
- 15-2 终态 Decision（Phase 3 遗留复核在案）: **收敛**——零尺寸矩形 → 有限 (0,0) 回退 + 调用计数锁定（`designer-xyflow-node.keyboard.test.tsx:121-139`），无 NaN 传播，不登记 P1。

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-tree-mode.spec.ts`（tree mode 挂载 + 投影节点/空槽位渲染 + 边共享线） | 断言: programmatic DOM（`.react-flow__node` 计数 + 槽位存在） | 结果: pass（基线绿）
- 场景: `flow-designer-slot-drag.spec.ts`（**新增，Phase 5**）——tree mode 节点 plus button（aria-label 添加节点）→ Add node 菜单出现（含 审批人 等项）→ 选择菜单项 → 节点数 +1（槽位同一加号菜单链路的真实浏览器验证） | 断言: menu role + 节点计数 | 结果: pass（3.3s）
- 覆盖决策（Phase 5）: **空槽位键盘激活（Enter/Space）维持单元级覆盖**（`designer-xyflow-node.keyboard.test.tsx` 13-01 + 15-2 fail-closed 全路径）——playground 两个 tree 示例（dingtalk/action-flow）live 核对均无空分支（分支全部带 child），空槽位需宿主提供空分支文档才能渲染；键盘路径与 plus button 菜单共享 `onPlusButtonClick → DingFlowAddNodeMenu` 同一链路，真实浏览器菜单链路已由本 spec 覆盖。

## 修复记录

- Phase 5（plan `2026-08-08-0900-1`）：新增 e2e `flow-designer-slot-drag.spec.ts`（plus button 菜单链路）；空槽位键盘维持单元覆盖（覆盖决策在案）；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
