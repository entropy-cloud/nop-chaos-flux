# 审计卡：fd-2 节点（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-2 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-node-card.tsx` + `designer-node-appearance.ts`（外观解析）+ `designer-xyflow-canvas/designer-xyflow-node.tsx`（画布节点）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（dingflow-visual-spec.md 视觉契约 + design.md）

## 面身份

fd-2 节点面：`designer-node-card.tsx`（inspector 汇总节点卡）+ `designer-node-appearance.ts`（label/icon/颜色/尺寸解析）+ `designer-xyflow-node.tsx`（画布节点渲染/选中/外观）。宿主契约 = `designerHostContract`。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                      | 证据                                                                                            | 发现                          |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Schema 契约                 | DesignerNodeCardSchema（nodeId）经 props.props 读取；nodeType.body schema 经 RenderNodes 渲染                                             | designer-node-card.tsx:21；designer-xyflow-node.tsx:326-331                                     | —                             |
| 2   | RendererComponentProps 合规 | node-card 只读 props.props/meta + useDesignerContext/useDesignerSnapshotSelector；不直访 store                                            | designer-node-card.tsx:20-31                                                                    | —                             |
| 3   | 值所有权三态                | summary 由 resolveNodeSummary 派生（doc 局部）；选中/激活态 from snapshot；position 展示用 Math.round                                     | designer-node-card.tsx:23-31,100-104                                                            | —                             |
| 4   | 表单参与                    | 无                                                                                                                                        | —                                                                                               | —                             |
| 5   | DOM 与选择器契约            | `nop-designer-node-card` marker + data-node-id/type/selected/active；画布节点 `nop-designer-node` marker + data-slot designer-node-body   | designer-node-card.tsx:14,80-83；designer-xyflow-node.tsx:298-301                               | —                             |
| 6   | 嵌套 schema 分类            | nodeType.body/quickActions 均为 schema 渲染（RenderNodes），scopeKey 隔离 `node:${id}`                                                    | designer-xyflow-node.tsx:326-372                                                                | —                             |
| 7   | 事件与 action 契约          | dispatch({selectNode/duplicateNode/deleteNode}) 内部命令；quickActions 经 actionScope（onEdit/onDuplicate/onDelete）注入 bindings         | designer-node-card.tsx:36-50；designer-xyflow-node.tsx:97-108                                   | —                             |
| 8   | a11y                        | node-card/画布节点 role=button + tabIndex=0 + aria-pressed + aria-label；toolbar role=toolbar                                             | designer-xyflow-node.tsx:272-304,342-349                                                        | P3-1（aria-label 硬编码英文） |
| 9   | i18n                        | DEFAULT_NODE_TYPE_META 硬编码中文标签 15 条（发起人/审批节点/…）用户可见（tree 加号菜单 + inspector 徽章）                                | designer-node-appearance.ts:3-20；消费点 designer-canvas.tsx:177-186、designer-inspector.tsx:74 | **P2-1**                      |
| 10  | 四态覆盖                    | 无 summary → 空态 div（aria-hidden + data-empty）；tree 终态节点渲染 circle；readOnly 由 page 层                                          | designer-node-card.tsx:52-63；designer-xyflow-node.tsx:307-316                                  | —                             |
| 11  | 异步生命周期                | 无异步（纯渲染面）                                                                                                                        | —                                                                                               | —                             |
| 12  | 组合宿主场景                | label-text（节点 title/desc 表达式解析）/ node-title-subtitle-gap（标题 gap）/ dingtalk-visual（节点视觉契约）/ taskflow-ui（7 节点渲染） | tests/e2e/\*.spec.ts                                                                            | pass（基线绿）                |
| 13  | 样式契约                    | 节点自样式 widget 语义（cn() + tailwind 视觉类）；appearance（minWidth/borderColor/…）经 style 注入；主题 CSS 变量                        | designer-xyflow-node.tsx:149-166                                                                | —                             |
| 14  | React 19 规范               | toolbar 显示/隐藏 timeout 有 unmount cleanup；nodeRenderData useMemo 依赖完整                                                             | designer-xyflow-node.tsx:121-147                                                                | —                             |
| 15  | 性能边界                    | snapshot selector 局部字段 + 比较器；appearanceStyle useMemo                                                                              | designer-xyflow-node.tsx:149-166                                                                | —                             |
| 16  | 测试质量                    | designer-node-card-edge-row.test.tsx / designer-xyflow-node.keyboard.test.tsx（13-01 + 15-2 fail-closed）                                 | 包级测试文件                                                                                    | —                             |
| 17  | 文档对照                    | dingflow-visual-spec.md 视觉契约 ↔ designer-node-appearance 默认色/图标一致                                                               | designer-node-appearance.ts:22-39                                                               | —                             |
| 18  | 注册/边界/IO                | 无 IO；无安全红线                                                                                                                         | —                                                                                               | —                             |
| H1  | host 契约                   | 节点面消费 config.nodeTypes（host 注入）→ nodeTypeConfig；无 manifest 直读                                                                | designer-xyflow-node.tsx:30                                                                     | —                             |
| H2  | 事务 undo                   | 节点命令走 core（undo 可回退，fd-8 详审）                                                                                                 | —                                                                                               | —                             |
| H3  | 拖拽                        | 画布节点拖拽 = ReactFlow 内部 + position commit（fd-9 详审）                                                                              | —                                                                                               | —                             |
| H4  | 键盘                        | 节点 Enter/Space 选择；toolbar Enter/Space 选择；槽位路径 fd-4                                                                            | designer-xyflow-node.tsx:114-119,352-357                                                        | —                             |
| H5  | 剪贴板                      | 无直接剪贴板（fd-11 详审）                                                                                                                | —                                                                                               | —                             |
| H6  | e2e 可操作性                | 4 spec 覆盖本面；`[data-testid="rf__node-task-1"]` 定位                                                                                   | 见 #12                                                                                          | pass                          |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                                     | —                                                                                               | —                             |

## 发现清单

- [P2-1] `designer-node-appearance.ts:3-20` DEFAULT_NODE_TYPE_META 硬编码中文标签（15 条）——tree 加号菜单与 inspector 节点徽章在 host 未配置 label 时直接展示 → 状态: **已路由 DR**（round2-dr-adjudication.md DR-2，i18n 化改造，非阻断）
- [P3-1] `designer-xyflow-node.tsx:175` nodeAriaLabel 硬编码英文 "Selected Node …" → 状态: 卡内记录（读屏语义，英文环境可接受，i18n 化归 DR 候选）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-label-text.spec.ts`（任务节点 title/描述表达式真机解析 + 非 raw 表达式断言） | 断言: textContent 与 data-slot | 结果: pass（基线绿）
- 场景: `node-title-subtitle-gap.spec.ts`（标题/副标题 gap computed style） | 断言: getComputedStyle | 结果: pass（基线绿）
- 场景: `flow-designer-dingtalk-visual.spec.ts`（卡片变体色 + 结束节点圆点） | 断言: computed style / data-slot/variant | 结果: pass（基线绿）
- 缺口: 无

## 修复记录

- 无 P0/P1（本面零修复）；P2-1 路由 DR（Phase 4 登记）。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
