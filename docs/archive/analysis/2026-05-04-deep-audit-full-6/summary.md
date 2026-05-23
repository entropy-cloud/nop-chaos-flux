# 深度审核汇总报告

## 审核范围

- 执行的维度：01–18（全部 18 个维度）
- 覆盖的包：全部 24 个 workspace packages + apps/playground
- 审核日期：2026-05-04
- 执行方式：每个维度一个初审子 agent + 一个维度复核子 agent（批量复核模式），共约 30 个子 agent 调度

## 复核统计

- 初审发现总数：22
- 已独立复核条目数：22
- 维度级复核完成数：18（全部维度）
- 保留：18
- 降级：1（维度10 从零发现降级为 1×Low）
- 驳回：0
- 不需要报告（确认通过）：3（维度04零发现确认、维度08零发现确认、维度12零发现确认）

## P0 清单

无。

## P1 清单

无。

## P2 清单（按文件分组）

| #   | 维度 | 文件                                                                                    | 问题                                                     |
| --- | ---- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | 05   | `packages/word-editor-renderers/src/word-editor-page.tsx:123-138`                       | editorRuntime selector 冗余订阅（与独立订阅重复）        |
| 2   | 05   | `packages/word-editor-renderers/src/word-editor-page.tsx:116-121`                       | selection 订阅无 equalityFn                              |
| 3   | 05   | `packages/word-editor-renderers/src/word-editor-page.tsx:140-145`                       | datasets 订阅无 equalityFn                               |
| 4   | 09   | `packages/flux-renderers-form-advanced/src/tag-list.tsx:73`                             | 未合并 props.meta.className                              |
| 5   | 09   | `packages/flux-renderers-form-advanced/src/key-value.tsx:337`                           | 未合并 props.meta.className                              |
| 6   | 09   | `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:110` | 缺失 data-testid/data-cid/meta.className                 |
| 7   | 13   | `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:87`                 | KeyboardEvent as unknown as MouseEvent（跨事件类型伪装） |

## P3 清单

| #   | 维度 | 文件                                                           | 问题                                      |
| --- | ---- | -------------------------------------------------------------- | ----------------------------------------- |
| 1   | 01   | `packages/word-editor-renderers/package.json`                  | 对 theme-tokens 的非常规直接依赖          |
| 2   | 15   | `packages/flux-runtime/src/`（全局）                           | 缺少 performance.mark/measure 观察性      |
| 3   | 06   | `packages/flux-runtime/src/async-data/reaction-runtime.ts:321` | void Promise.resolve().then() 无 .catch() |

## Low 清单

| #   | 维度 | 文件                                                              | 问题                                                           |
| --- | ---- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | 03   | `packages/flux-action-core/src/index.ts:37`                       | 无消费者的 re-export（cancelPendingDebounce/scheduleDebounce） |
| 2   | 07   | `packages/flux-renderers-data/src/crud-renderer-state.ts:273-304` | scope 初始化放在 effect 中（概念归属不干净）                   |
| 3   | 10   | `packages/flux-renderers-basic/src/container.tsx:42-49`           | schema-conditional 布局类（严格解读违反 marker-only）          |
| 4   | 13   | `packages/flux-react/src/render-nodes.tsx:186`                    | meta 动态 key 绕过类型接口                                     |
| 5   | 14   | `packages/flux-action-core/`                                      | 测试密度相对重要性偏低（6 files）                              |
| 6   | 14   | `packages/flux-i18n/`                                             | 仅 1 个测试文件覆盖 6 个源文件                                 |
| 7   | 16   | `docs/architecture/flux-runtime-module-boundaries.md`             | 遗漏 projected-scope-store.ts 和 form-component-handle.ts      |
| 8   | 17   | `packages/report-designer-renderers/src/helpers.ts`               | 应统一为 utils.ts                                              |
| 9   | 18   | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:60`  | 硬编码英文 aria-label                                          |
| 10  | 18   | `packages/flux-renderers-form-advanced/src/key-value.tsx:376`     | 硬编码英文 fallback "Add entry"                                |

## 高频问题文件

| 文件                                                      | 出现维度            |
| --------------------------------------------------------- | ------------------- |
| `packages/word-editor-renderers/src/word-editor-page.tsx` | 05（3×P2）          |
| `packages/flux-renderers-form-advanced/src/key-value.tsx` | 09（P2）, 18（Low） |
| `packages/flux-renderers-form-advanced/src/tag-list.tsx`  | 09（P2）            |

## 跨维度模式

1. **word-editor-renderers 订阅质量**：维度05集中发现的3个P2均在此文件，说明该包的 store 订阅精度未达到其他渲染器包的水平。
2. **flux-renderers-form-advanced className/testid 传递遗漏**：维度09发现的3个P2均在此包，说明该包在 renderer 契约的"最后一公里"（className 合并、testid 传递）有系统性遗漏。
3. **i18n 硬编码遗漏**：同一包中已有 `t()` 使用但个别位置遗漏，属小范围漏网。

## 已自动化的检查项（lint/check 已覆盖）

- 文件大小 >700 行：`pnpm check:oversized-code-files` + ESLint `max-lines:700`
- 无 eval/new Function：可由 ESLint `no-eval` / `no-new-func` 覆盖
- BEM 残留：无当前违规，暂不需自动化

## 建议新增的自动化检查

1. **Renderer className 合并检查**：lint 规则确保渲染器根元素的 `cn()` 调用包含 `props.meta.className`
2. **equalityFn 缺失检查**：lint 规则对 `useSyncExternalStoreWithSelector` 调用中 selector 返回对象时要求第5参数

## 可暂缓项

- performance.mark/measure（P3，有 benchmark test 作为替代）
- container.tsx schema-conditional 布局类（Low，设计意图是 semantic props → classes）
- flux-action-core re-export 清理（Low，无运行时影响）

## 误报排除清单

- 维度02：所有 500+ 行文件按 calibration pattern #1 downgrade，无需拆分
- 维度04：零发现确认（历史 bug 已修复且有回归测试）
- 维度08：零发现确认（验证系统与架构文档高度一致）
- 维度11：零违规（原生HTML均属高性能宿主/浏览器原生能力排除）
- 维度12：零发现确认（field metadata 和 slot 建模完整正确）
- 维度13：7 处 `as unknown as` 被确认为合理的 schema/sentinel/第三方桥接
