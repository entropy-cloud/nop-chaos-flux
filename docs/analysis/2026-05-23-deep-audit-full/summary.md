# 深度审核汇总报告

## 审核范围

- 执行的维度：01 依赖图与包边界，02 模块职责与文件边界，03 API 表面积与契约一致性，04 状态所有权与单一事实来源，05 响应式订阅精度，06 异步模式与取消安全，07 生命周期与副作用归属，08 验证系统一致性，09 渲染器契约合规性，10 样式系统合规性，11 UI 组件使用合规性，12 表单字段与 Slot 建模，13 类型安全与动态边界，14 测试覆盖与质量，15 安全与性能红线，16 文档-代码一致性，17 命名与术语一致性，18 跨包模式一致性，19 错误传播保真度，20 可访问性。
- 覆盖的包：`packages/flux-*`、`packages/flux-renderers-*`、`packages/flow-designer-*`、`packages/report-designer-*`、`packages/spreadsheet-*`、`packages/word-editor-*`、`packages/ui`、`packages/nop-debugger`、`apps/playground`（通过 automation suspect 抽样与 owner-path 复核）。
- 审核日期：2026-05-23。
- 执行方式：全部 20 维均执行“初审 -> 第 2 轮深挖 -> 独立维度复核 -> 必要子项复核/批量复核”，并以 `v1 / 无兼容负担 / 不接受过渡态主路径` 基线裁定。

## 深挖统计

| 维度 | 轮次 | 第 1 轮发现数 | 第 2 轮新增 | 备注                                         |
| ---- | ---- | ------------- | ----------- | -------------------------------------------- |
| 01   | 2    | 0             | 0           | 零发现维度，二轮确认后进入复核               |
| 02   | 2    | 3             | 0           | 三个 oversized hard-fail 文件补充 owner 证据 |
| 03   | 2    | 0             | 0           | 零发现                                       |
| 04   | 2    | 0             | 0           | 零发现                                       |
| 05   | 2    | 2             | 0           | 1 条 scanner 误报、1 条保留                  |
| 06   | 2    | 0             | 0           | 零发现                                       |
| 07   | 2    | 0             | 0           | 零发现                                       |
| 08   | 2    | 0             | 0           | 零发现                                       |
| 09   | 2    | 1             | 0           | fieldframe suspect 经 owner doc 驳回         |
| 10   | 2    | 1             | 0           | spreadsheet CSS batch finding                |
| 11   | 2    | 0             | 0           | 零发现                                       |
| 12   | 2    | 1             | 0           | field-slot/FieldFrame suspect 经复核驳回     |
| 13   | 2    | 0             | 0           | 零发现                                       |
| 14   | 2    | 3             | 0           | 2 条保留，1 条降级保留                       |
| 15   | 2    | 0             | 0           | 零发现                                       |
| 16   | 2    | 1             | 0           | active audit handbook drift                  |
| 17   | 2    | 0             | 0           | 零发现                                       |
| 18   | 2    | 0             | 0           | 零发现                                       |
| 19   | 2    | 0             | 0           | 零发现                                       |
| 20   | 2    | 0             | 0           | 零发现                                       |

- 维度总数：20。
- 深挖总轮次：40。
- 深挖总发现数：12。

## 复核统计

- 深挖发现总数：12。
- 已独立复核条目数：12 / 12。
- 维度级复核完成数：20 / 20。
- 子项逐条复核数：7。
- 批量复核覆盖条目数：5。
- 保留：8。
- 降级：1。
- 驳回：3。

## P0 清单（按文件分组）

| 编号 | 文件 | 摘要             |
| ---- | ---- | ---------------- |
| 无   | -    | 本轮无 P0 保留项 |

## P1 清单（按文件分组）

| 编号  | 文件                                | 摘要                                           |
| ----- | ----------------------------------- | ---------------------------------------------- |
| 16-01 | `docs/skills/deep-audit-prompts.md` | 20 维审核手册的归档目录示例仍遗漏 19/20 文件名 |

## 高频问题文件（出现在多个维度中的文件）

| 文件                                                                             | 维度   | 模式                                             |
| -------------------------------------------------------------------------------- | ------ | ------------------------------------------------ |
| `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`              | 02, 14 | 超大测试文件同时体现模块边界与测试边界膨胀       |
| `packages/report-designer-renderers/src/page-renderer.test.tsx`                  | 02, 14 | 超大测试文件同时体现模块边界与测试边界膨胀       |
| `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx` | 09, 12 | FieldFrame bypass suspect 经 owner docs 双维驳回 |

## 跨维度模式

- 真实保留项主要集中在三类：超大测试文件的职责/测试边界混合、公开调试 renderer 的过宽订阅、以及 active audit docs 自身的执行说明漂移。
- 多个 automation suspect（reactive read、fieldframe bypass、async failure path）在本轮复核后被明确压缩为“候选线索而非事实问题”，说明 handbook 中的“automation-first + live code adjudication”规则是必要的。

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- `pnpm lint` 已通过，因此未重复手工报告 `eval/new Function`、legacy React API、`max-lines > 700` 的机械命中、已覆盖的 JSX/Hook 基础规则。
- `pnpm check:audit-missing-renderer-markers` 无 suspect，本轮未重复手工扫描 marker 缺失。
- `pnpm check:audit-runtime-raw-schema-reads` 无 suspect，本轮未重复报告 compile-once raw schema read。
- `pnpm check:audit-non-retained-renderer-references` 无 suspect，本轮未重复报告旧 renderer type 引用。

## 建议新增的自动化检查

- 为 `docs/skills/deep-audit-prompts.md` 增加结构一致性检查：目录示例中的维度文件名数量应与总览维度数量一致，防止 20 维手册继续发布 18 文件示例。
- 为 `packages/spreadsheet-renderers/src/canvas-styles.css` 这类包级 CSS 增加更严格的 scoped `data-slot` 检查，允许白名单前提下禁止裸 `spreadsheet-*` selector。
- 为 oversized test 文件增加“跨顶层 describe 域”或“多 owner 契约混合”提示，而不只停留在线数硬门禁层面。

## React 19 最佳实践合规性

- 最终复核时已对照 `docs/skills/react19-best-practices-review.md`。
- 本轮未将“手写 `useMemo`/`useCallback` 冗余”作为主问题清单，因为抽样路径缺少足够 profiling/contract 证据；仅在结论中避免重复 lint 已覆盖的项目。

## 可暂缓项（有问题但 ROI 暂时不高）

- [14-03] `field-panel-renderer.test.tsx` 的模块级 mutable mock state：当前已有 `afterEach` reset，建议随下一轮测试重构一起处理。
- [05-02] `scope-debug` 的整 scope 序列化订阅：问题真实但主要影响显式调试 renderer，优先级低于 active docs drift 与 hard-fail test splitting。

## 误报排除清单（看起来像问题但不建议动）

- `packages/flux-react/src/render-nodes.tsx:340` 的 `readOwn()`：发生在 `useLayoutEffect` 内的 commit-phase scope reconciliation，不是 render-phase reactive read。
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx` 的 direct `FieldFrame`：`field-frame.md` 已明确允许 `rootTag="div"` 的局部 wrapper 例外。
- `packages/flux-react/src/lazy-renderer-component.tsx` 的 `load().then(...)`：reject 由 `React.lazy` / ErrorBoundary 路径承接，不构成本轮可证成的异常吞没缺陷。

## 结论

- 本轮 20 个维度已全部写回，且每个维度都完成了至少一轮深挖收敛与独立复核。
- 高优先级保留项只有 1 条：deep-audit 执行手册自身的归档示例 drift。
- 最值得后续立即处理的工程项是三组超大测试文件/测试边界问题和 spreadsheet canvas CSS selector scope 收口；其余大部分 suspect 已在 owner-doc 复核后被明确排除。
