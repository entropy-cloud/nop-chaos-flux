# UI/UX 审查复核结论

## 复核概要

- 审查日期：2026-05-21
- 发现来源轮次：R01-R03
- 复核 agent 独立验证方式：grep 确认 + 文件重新读取

## 逐条复核清单

| 编号     | 来源轮次 | 判定 | 新严重程度 | 理由                                                                                                                                                                                               |
| -------- | -------- | ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 视角4-01 | R01      | 保留 | MEDIUM     | `tree-controls.tsx` 的 `TreeOptionList` 在搜索态仅渲染 `filteredOptions.map(...)`，未命中时没有空状态分支；符合“无结果直接留白”的描述。                                                            |
| 视角5-01 | R01      | 保留 | MEDIUM     | `dynamic-renderer.tsx` 维护 `loading`，但渲染分支只处理 `error` / `schema` / fallback body，未按 `loading` 渲染任何内建 Spinner 或 loading UI。                                                    |
| 视角5-02 | R01      | 降级 | LOW        | `detail-surface.tsx` 的确认中状态确实只有文案切换，没有 Spinner；但它同时禁用了按钮，属于“弱反馈”而非“完全无反馈”。                                                                                |
| 视角5-03 | R01      | 保留 | MEDIUM     | `crud-renderer.tsx` 先得到 `emptyContent`，随后又把传给 table 的 `empty` 压成 `typeof emptyContent === 'string' ? emptyContent : defaultEmptyLabel`；rich empty content 在 CRUD 路径里确实被降级。 |
| 视角6-01 | R01      | 保留 | MEDIUM     | `detail-surface.tsx` 的 drawer 分支只渲染 `DrawerHeader` + `DrawerTitle`；`@nop-chaos/ui` 的 `drawer.tsx` 也不会自动注入可见关闭按钮。                                                             |
| 视角4-02 | R02      | 降级 | LOW        | `tree-controls.tsx` 的搜索框确实没有内建 clear 按钮；但它是普通输入框，用户仍可直接退格清空，影响偏轻。                                                                                            |
| 视角5-04 | R02      | 保留 | MEDIUM     | `table-quick-edit-cell.tsx` 和 `table-quick-edit-controller.ts` 显示存在 `saving` 状态，但 UI 仅用 `disabled` 抑制保存，没有 Spinner、saving 文案或其它可见保存反馈。                              |
| 视角5-05 | R03      | 保留 | MEDIUM     | `detail-view.tsx` 和 `detail-field.tsx` 都是在 `handleOpen()` 里先 `await runTransformIn(...)`，完成后才 `openDraft(...)`；触发按钮无 pending 态，surface 也未先打开承载 loading。                 |

## 去重记录

无直接重复。

- `视角4-01` / `视角4-02` 都落在 `TreeOptionList` 搜索体验，但分别是“无结果空态缺失”和“缺少清除入口”，根因不同。
- `视角5-02` / `视角5-05` 都在 detail-view 系列，但分别对应“确认中反馈”和“异步打开前反馈”，不是重复。

## 高风险逐项复核详情

### [视角5-02] 降级为 LOW

- **复核过程**: 读取 `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx:75-82`，确认按钮 pending 时仍会切换文案并禁用自身。
- **判定理由**: 问题存在，但不是“完全没有反馈”，而是“反馈偏弱，没有 Spinner 或更强视觉指示”。
- **判定**: 降级

### [视角4-02] 降级为 LOW

- **复核过程**: 读取 `packages/flux-renderers-form-advanced/src/tree-controls.tsx:192-202`，确认搜索框无 clear affordance。
- **判定理由**: 用户仍可通过普通输入编辑行为清空内容，属于便捷性缺口而非明显交互障碍。
- **判定**: 降级
