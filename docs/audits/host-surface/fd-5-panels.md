# 审计卡：fd-5 面板（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-5 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-inspector.tsx` + `designer-field.tsx`（属性面板）+ `designer-palette.tsx`（节点库）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + config-schema.md）

## 面身份

fd-5 面板面：inspector 属性面板（`designer-inspector.tsx` + `designer-field.tsx`）+ palette 节点库。宿主契约 = `designerHostContract`。表单参与：inspector 字段编辑路径（updateNodeData/updateEdgeData）。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                             | 证据                                                           | 发现           |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------- |
| 1   | Schema 契约                 | nodeType.inspector.body（SchemaInput）经 props.renderSchema 渲染；DesignerFieldSchema（label/name/fieldType/options）            | designer-inspector.tsx:31-32,375-377；designer-field.tsx:19-28 | —              |
| 2   | RendererComponentProps 合规 | DefaultInspector 为纯组件（props.renderSchema）；designer-field 用 props.props/meta + resolveRendererSlotContent                 | designer-field.tsx:18-28                                       | —              |
| 3   | 值所有权三态                | activeNode/activeEdge from snapshot；value = activeNode.data[name] ?? activeEdge.data[name]；label/description 编辑即时 dispatch | designer-field.tsx:27-41；designer-inspector.tsx:349-373       | —              |
| 4   | 表单参与                    | 字段编辑为 host 内部（非 flux 表单）；updateNodeData/updateEdgeData 命令                                                         | designer-inspector.tsx:96-100                                  | —              |
| 5   | DOM 与选择器契约            | `nop-designer-field` marker + data-testid/cid；`fd-panel-card`/`fd-panel-caption` 锚定类；collapse-inspector testid              | designer-inspector.tsx:288-296,311-313                         | —              |
| 6   | 嵌套 schema 分类            | inspector.body 经 renderSchema 透传（host 自渲染）；无嵌套 action args 污染                                                      | designer-inspector.tsx:375-377                                 | —              |
| 7   | 事件与 action 契约          | 面板交互全走 dispatch 内部命令；无 schema 事件派发面                                                                             | designer-inspector.tsx:294,450                                 | —              |
| 8   | a11y                        | 面板标题/按钮 aria-label 全走 t()；branch 按钮 aria-pressed/aria-label 完整                                                      | designer-inspector.tsx:154,171,188                             | —              |
| 9   | i18n                        | 面板全部文案走 t()（propertyPanel/editNodeOrEdge/branchGroup/…）；generic fields 用数据 key 作 label（数据驱动）                 | designer-inspector.tsx:303-444；designer-field.tsx 无硬编码    | P3-1           |
| 10  | 四态覆盖                    | 无选中态显示快捷键卡片；activeNode/activeEdge 分支渲染                                                                           | designer-inspector.tsx:421-442                                 | —              |
| 11  | 异步生命周期                | 无异步                                                                                                                           | —                                                              | —              |
| 12  | 组合宿主场景                | collapsible（折叠/展开）/ resizable（拖拽/键盘 resize）/ summary-renderers（节点卡/边行汇总）/ ui（toolbar + JSON 弹窗）         | tests/e2e/\*.spec.ts                                           | pass（基线绿） |
| 13  | 样式契约                    | 面板自样式 widget（fd-panel-card）；主题独立（CSS 变量）                                                                         | designer-theme.css                                             | —              |
| 14  | React 19 规范               | branchItems useMemo；无冗余 callback                                                                                             | designer-inspector.tsx:33-39                                   | —              |
| 15  | 性能边界                    | selector 局部字段；branch list 规模 = 分支数                                                                                     | designer-inspector.tsx:24-29                                   | —              |
| 16  | 测试质量                    | designer-controls.test.tsx（面板 UI）+ designer-page-\*.test.tsx                                                                 | 包级测试                                                       | —              |
| 17  | 文档对照                    | config-schema.md inspector 字段契约 ↔ designer-field.tsx 一致（textarea/select/number/text）                                     | designer-field.tsx:56-96                                       | —              |
| 18  | 注册/边界/IO                | 无 IO                                                                                                                            | —                                                              | —              |
| H1  | host 契约                   | inspector 为 host 注入区（DESIGNER_CAPABILITY_PUBLICATION capableRegions: inspector）；renderSchema 透传                         | designer-manifest.ts:491-495                                   | —              |
| H2  | 事务 undo                   | 字段编辑命令可 undo（fd-8 详审）                                                                                                 | —                                                              | —              |
| H3  | 拖拽                        | palette item draggable + DESIGNER_PALETTE_NODE_MIME → canvas onDrop（fd-9 详审）                                                 | designer-palette.tsx:136-139                                   | —              |
| H4  | 键盘                        | palette 按钮键盘可达（原生 button）；resizable 键盘箭头路径 e2e 在案                                                             | flow-designer-resizable.spec.ts:64-81                          | —              |
| H5  | 剪贴板                      | 无                                                                                                                               | —                                                              | —              |
| H6  | e2e 可操作性                | 4 spec 覆盖本面；`[data-testid="left-panel-expanded"]`/`[data-testid="right-panel-expanded"]` 定位                               | 见 #12                                                         | pass           |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                            | —                                                              | —              |

## 发现清单

- [P1-1] **toolbar 模板态冻结**：`designer-toolbar.tsx` items useMemo 只依赖 `[config.toolbar?.items, resolveToolbarValue, props.readOnly]`——snapshot 变化（canUndo/canRedo/isDirty/doc）后 disabled/active/body/level 永不重解析：撤销/重做/保存按钮状态与 dirty 徽章全冻结（e2e 实测：Delete 删除节点后撤销按钮仍 disabled）→ 状态: **fixed**（test-first：`designer-controls.test.tsx` `re-resolves toolbar button disabled templates when the snapshot changes` 先红后绿；实现：items 改渲染期内联派生 + `useHostScope` StrictMode disposed-scope 守卫补丁（`flux-react/workbench/hooks.ts` + `flux-runtime/runtime-host-projection-scope.ts`，**fdDisposed** 标记）；e2e 3 用例全绿）。复杂 bug note：`docs/bugs/90-designer-toolbar-stale-disabled-template-not-re-resolved-fix.md`
- [P3-1] `designer-inspector.tsx:91,403` renderGenericFields/边字段用数据 key 直接作 Label 文案 → 状态: 卡内记录（数据驱动字段名语义，宿主可经 inspector.body schema 覆盖；非缺陷）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-collapsible.spec.ts`（palette/inspector 折叠/展开 + canvas 宽度联动） | 断言: 面板可见性 + canvas clientWidth 变化 | 结果: pass（基线绿）
- 场景: `flow-designer-resizable.spec.ts`（拖拽 resize + 键盘箭头 + max clamp + 折叠后宽度保持） | 断言: 面板宽度 / clamp 值 | 结果: pass（基线绿）
- 场景: `designer-summary-renderers.spec.ts`（inspector 汇总节点卡/边行 marker + 派发） | 断言: marker + 派发计数 | 结果: pass（基线绿）
- 场景: `flow-designer-ui.spec.ts`（toolbar JSON 按钮 → 弹窗开合） | 断言: dialog role | 结果: pass（基线绿）
- 缺口: 无

## 修复记录

- Phase 5（plan `2026-08-08-0900-1`）：P1-1 补测 1 条（`designer-controls.test.tsx`）+ 实现修复（designer-toolbar.tsx + flux-react hooks.ts + flux-runtime runtime-host-projection-scope.ts），包级 35 files / 241 tests 全绿 + e2e 3 用例全绿；bug note 90；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
