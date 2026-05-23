# 深度审核汇总报告

## 审核范围

- 执行的维度: 01-20 全量
- 覆盖的包: 全部 `packages/*` 与 `apps/playground`
- 审核日期: 2026-05-07
- 执行方式: 多轮迭代深挖 + 维度复核 + 关键 P1/P0 子项复核

## 深挖统计

- 维度总数: 20
- 各维度深挖轮次:
  - 01=1
  - 02=3
  - 03=3
  - 04=3
  - 05=3
  - 06=3
  - 07=3
  - 08=3
  - 09=3
  - 10=3
  - 11=1
  - 12=1
  - 13=1
  - 14=3
  - 15=3
  - 16=1
  - 17=1
  - 18=1
  - 19=1
  - 20=1
- 深挖总轮次: 42
- 深挖总发现数: 95

## 复核统计

- 深挖发现总数: 95
- 已独立复核条目数: 95
- 维度级复核完成数: 20
- 子项逐条复核数: 15
- 批量复核覆盖条目数: 0
- 保留: 44
- 降级: 33
- 驳回: 18

## P1 清单

| 文件                                                                                                              | 维度 | 问题                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| `packages/flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx`                                          | 02   | 超 700 行且跨 page/layout/tabs/dialog/drawer 多主题，必须拆分          |
| `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx`                                         | 02   | 超 700 行且混 submit/init/valuesPath/form.data/surface scope，必须拆分 |
| `packages/flux-renderers-data/src/__tests__/use-table-controls.test.tsx`                                          | 02   | 超 700 行且混 pagination/selection/sort/filter/expand，必须拆分        |
| `packages/flow-designer-renderers/src/designer-manifest.ts`                                                       | 03   | `gridVisible` 与 live `gridEnabled` 漂移                               |
| `docs/architecture/flow-designer/api.md`                                                                          | 03   | action 名与 payload 形状与 live provider/manifest 漂移                 |
| `packages/report-designer-renderers/src/page-renderer.tsx` / `packages/report-designer-core/src/core-dispatch.ts` | 04   | spreadsheet subtree 双 owner                                           |
| `packages/word-editor-renderers/src/word-editor-page.tsx`                                                         | 04   | datasets 初始化 precedence 冲突                                        |
| `packages/flow-designer-renderers/src/designer-page.tsx`                                                          | 06   | create dialog confirm 缺方法级并发保护                                 |
| `packages/flux-runtime/src/form-runtime-array.ts`                                                                 | 08   | 数组结构变更不重映射 `hiddenFields`                                    |
| `packages/flux-renderers-form/src/renderers/input.tsx` 等                                                         | 09   | 多个字段型 renderer 缺失 `props.meta.className` 透传                   |
| `packages/flow-designer-renderers/src/designer-field.tsx`                                                         | 09   | 未消费 `props.meta.disabled`                                           |
| `tests/e2e/component-lab/simple-form.spec.ts`                                                                     | 14   | 表单语义提交链路缺真实浏览器级 E2E                                     |
| `packages/flow-designer-core/src/tree-layout.ts`                                                                  | 15   | 多处平方级/近平方级扫描仍存在                                          |
| `README.md` / `README.zh-CN.md`                                                                                   | 17   | `closeDialog` 继续污染正式动作基线                                     |
| `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx`                                              | 20   | 键盘激活路径与点击业务路径脱节                                         |

## 高频问题文件

| 文件                                                                                                       | 命中维度       | 说明                                                    |
| ---------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------- |
| `packages/flow-designer-renderers/src/designer-page.tsx`                                                   | 02, 05, 06     | 文件边界、订阅精度、异步并发都存在问题                  |
| `packages/word-editor-renderers/src/word-editor-page.tsx`                                                  | 02, 04, 07     | 页面职责、state ownership、lifecycle 都偏宽             |
| `packages/report-designer-renderers/src/page-renderer.tsx`                                                 | 04, 05, 07, 14 | owner split、whole-snapshot、bootstrap effect、测试缺口 |
| `packages/flux-runtime/src/form-runtime-owner.ts` / `form-runtime-array.ts` / `form-runtime-validation.ts` | 08             | 多条验证语义不一致集中在同一子系统                      |
| `packages/flux-renderers-form/src/renderers/input.tsx`                                                     | 02, 09         | 文件边界与 renderer contract 同时存在问题               |

## 跨维度模式

- Flow Designer 的 page/canvas/tree-layout 同时暴露文件边界、订阅粒度和性能热路径问题
- Word Editor 的 bootstrap/persistence/state ownership 三条链路互相牵连
- Report Designer 的双 owner 问题同时拖累 host projection、订阅粒度、初始化 lifecycle 与测试覆盖
- 字段型 renderer 的 `props.meta` 透传一致性仍不稳，已从多个控件族反复出现
- 多处问题不是“完全错误实现”，而是“已收敛一半但仍残留 split-brain / bridge gap / fallback path drift”

## 已自动化的检查项

- 代码文件大小的 `>700` 强门禁与 `>500` 警告基线
- ESLint `max-lines`
- 许多 plan/doc 锚点可通过现有脚本扫描

## 建议新增的自动化检查

- Flow Designer manifest 与 live host projection 字段名一致性检查
- Flow Designer `api.md` action surface 与 manifest/provider 对齐检查
- renderer contract lint/check: 字段型 renderer 是否透传 `props.meta.className` / `meta.disabled`
- a11y 回归测试: `WrappedFieldAction` Enter/Space 与 click 等价
- report-designer toolbar dispatch 参数测试，锁定 `report-designer:report-designer:*` 双前缀回归

## 可暂缓项

- `flux-code-editor` / `spreadsheet-renderers` / `flow-designer` 的 token 化样式债
- `detail-view` / `auto-layout` 的“只有 stale-drop 无真正 abort”
- report/designer/word 的 bridge surface 收敛方向

## 误报排除清单

- `renderers -> flux-core/flux-formula/flux-runtime` 的公开 API 依赖
- `report-designer-renderers -> spreadsheet-renderers` 复用本身
- `TextRenderer` 使用 `nop-text` marker
- `container` / `flex` 基于语义 props 发出布局类
- `WrappedFieldAction` 作为 `span[role="button"]` 的存在本身
- raw HTML 出现在 spreadsheet 高性能宿主表面或 `input[type=file|color]`
