# 深度审核汇总报告

## 审核范围

- 执行维度: 01-20 全量维度。
- 覆盖范围: `packages/*`, `apps/*`, `tests/e2e`, `docs/architecture`, `docs/plans`, `docs/bugs`, `AGENTS.md`。
- 审核日期: 2026-05-07。
- 执行方式: 20 个维度多轮迭代深挖，最多 5 轮；每维度独立复核；对构建发布、验证、状态、安全性能、错误传播、可访问性做额外批量子项复核。
- 输出目录: `docs/analysis/2026-05-07-deep-audit-full-8/`。

## 深挖统计

| 维度                  | 轮次 | 结果                                                                     |
| --------------------- | ---: | ------------------------------------------------------------------------ |
| 01 依赖图与包边界     |    5 | 保留构建发布与 manifest 问题                                             |
| 02 模块职责与文件边界 |    5 | 保留 8 项边界/入口问题                                                   |
| 03 API 表面积         |    5 | 保留 7 项 API/subpath/doc surface 问题                                   |
| 04 状态所有权         |    5 | 保留 13 项，8 项 P1                                                      |
| 05 响应式订阅         |    5 | 保留 scope/path 与 host snapshot 精度问题                                |
| 06 异步取消安全       |    1 | 初审零发现，复核补出 3 项                                                |
| 07 生命周期归属       |    4 | 保留 2 项 dispose/lifetime 问题                                          |
| 08 验证一致性         |    5 | 保留 14 项，6 项 P1                                                      |
| 09 渲染器契约         |    5 | 保留 meta/readOnly/region 问题                                           |
| 10 样式系统           |    5 | 保留 widget/global CSS 与 fallback UI 样式问题，驳回 flex/container 指控 |
| 11 UI 组件使用        |    2 | 保留 input-number raw button                                             |
| 12 字段与 Slot        |    5 | 保留 10 项 slot/metadata 问题                                            |
| 13 类型安全           |    5 | 保留/降级低优先级类型逃逸                                                |
| 14 测试覆盖           |    5 | 保留测试门禁、覆盖与 e2e 质量问题                                        |
| 15 安全与性能         |    5 | 保留 7 项 P1 安全/性能红线                                               |
| 16 文档-代码一致性    |    5 | 保留 active doc/plan drift                                               |
| 17 命名与术语         |    2 | 保留 badge/icon 示例契约漂移                                             |
| 18 跨包模式           |    5 | 保留 host/action/projection contract drift                               |
| 19 错误传播           |    5 | 保留 8 项错误保真问题                                                    |
| 20 可访问性           |    5 | 保留 8 类 a11y 问题                                                      |

- 深挖总轮次: 89。
- 维度级复核完成数: 20。
- 子项批量复核数: 6。
- 有效子 agent 结果数: 约 115。

## 复核统计

- P0 保留: 1。
- P1 保留: 约 40 个高优先级条目或缺陷族。
- P2/P3 保留: 约 70 个中低优先级条目或缺陷族。
- 主要降级类别: 大文件但职责集中、host/widget 合理自样式、debug/devtool 专属性能项、历史计划锚点陈旧。
- 主要驳回类别: `container/flex` 显式 semantic layout props、spreadsheet/raw host surface UI 组件例外、`WrappedFieldAction`/CodeEditor toolbar “无键盘”误报、`DataSourceSchema` 应由 `flux-core` owning。

## P0 清单

| 维度 | 文件                                  | 问题                                                                                              | 影响                             |
| ---- | ------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------- |
| 01   | `packages/flux-core/dist/index.js` 等 | 构建产物保留 extensionless ESM 相对导入，`node import('./packages/flux-core/dist/index.js')` 失败 | 发布产物不能被 Node ESM 直接加载 |

## P1 清单

| 维度 | 文件/范围                                               | 复核保留问题                                                                                                          |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 01   | 多包 `tsconfig.build.json`                              | build 未统一排除 tests/test-support，存在 dist 污染风险                                                               |
| 01   | 多包 CSS imports                                        | 生产 JS import CSS，但 `tsc` build 不复制 CSS 到 `dist`                                                               |
| 01   | package manifests                                       | 多个 package 把 test-only workspace deps 放在 production deps；`tailwind-preset` 漏声明 `tailwindcss`                 |
| 04   | `use-surface-renderer.ts`                               | declarative surface cleanup 可因依赖变化关闭仍应打开的 surface                                                        |
| 04   | `surface-runtime.ts`                                    | runtime close/closeTop/dispose 不触发 `onClose`，UI close 与 runtime close 生命周期分裂                               |
| 04   | CRUD/Table state hooks                                  | CRUD sort/filter 与 Table sort/filter shape 不一致；CRUD ownership 配置被强制 scope 覆盖                              |
| 04   | `use-table-sort.ts`, `use-table-filter.ts`              | `controlled` ownership 实际退回 local state                                                                           |
| 04   | `flow-designer-core/src/core.ts`                        | host replace document 被写入 history/dirty                                                                            |
| 04   | `object-field.tsx`, `dynamic-renderer.tsx`              | stale async transformOut 可覆盖 owner；loadAction 切换期间显示旧 schema                                               |
| 06   | Flow Designer / Table quick-edit / Report field source  | 创建节点与 quick-edit save 仅靠 React state 防重入；report field source provider 不接收 abort signal                  |
| 07   | `form.tsx`, component registries                        | FormRuntime 与 component registry 局部卸载未 dispose                                                                  |
| 08   | `surface-runtime.ts`                                    | action-opened surface validation owner 可能永久 bootstrapping                                                         |
| 08   | `form-runtime-field-ops.ts`                             | hidden parent 不失效 descendant in-flight async validation                                                            |
| 08   | `form-runtime-array.ts`                                 | array mutations 不 remap/clear `externalErrors`                                                                       |
| 08   | `projected-validation-runtime.ts`                       | projected validation writes 未 prefix                                                                                 |
| 08   | `form-runtime-owner.ts`, `form-runtime-validation.ts`   | applyChanges 不清 external errors；普通 validation 可覆盖/删除 external errors                                        |
| 09   | form and advanced renderers                             | `readOnly` 未阻止实际写入；高级控件未传 readOnly 给 field controller                                                  |
| 12   | table/quick-edit/variant/domain slots                   | quickEdit region 走私有 helper channel；variant-field deep slots 缺 metadata；domain renderers 绕过 `region.render()` |
| 15   | `value-adapter.ts`                                      | transform action 失败默认 fail-open                                                                                   |
| 15   | `ui/chart.tsx`                                          | chart CSS style 拼接未校验 key/color，存在 CSS 注入风险                                                               |
| 15   | `spreadsheet-core`                                      | 大范围 cell 更新反复 clone cells；find regex/空 query replace 可造成 ReDoS/膨胀                                       |
| 15   | `flow-designer-core/tree-layout.ts`                     | `queue.shift()` 与 O(VE) depth 计算影响大图布局                                                                       |
| 15   | `api-cache.ts`                                          | `stableStringify` 无 cycle/depth/size 防护，可被 deep/cyclic data 打爆                                                |
| 15   | validation pattern                                      | schema pattern 直接执行用户 regex，非法 pattern fail-open                                                             |
| 16   | `docs/architecture/flow-designer/api.md`                | public action/API docs 与 live provider/manifest 漂移                                                                 |
| 18   | flow/spreadsheet/report host contracts                  | manifest/projection/action/snapshot 多真源不一致                                                                      |
| 19   | `reaction-runtime.ts`                                   | reaction dispatch 返回 `ok:false` 仍 settle succeeded                                                                 |
| 19   | `runtime-action-helpers.ts`                             | async validation action `ok:false` 被当作通过                                                                         |
| 20   | table/tree/condition/chart/spreadsheet/flow/report/word | 多个交互仅鼠标/拖拽路径或缺程序化 label/keyboard equivalent                                                           |

## 高频问题文件

| 文件/区域                                                 | 维度                       | 模式                                                              |
| --------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| `packages/flux-runtime/src/form-runtime-*`                | 08, 15, 19                 | validation lifecycle, external errors, action failure propagation |
| `packages/flux-renderers-data/src/table-renderer*`        | 04, 09, 12, 15, 20         | state ownership, slot extraction, accessibility, O(n²) paths      |
| `packages/spreadsheet-*`                                  | 02, 10, 15, 18, 20         | host surface CSS/API, batch operations, a11y, contract discovery  |
| `packages/flow-designer-*`                                | 02, 04, 05, 15, 16, 18, 20 | host projection/action drift, state ownership, layout performance |
| `packages/word-editor-renderers/src/word-editor-page.tsx` | 02, 04, 10, 18, 20         | host page responsibilities, data owner, styling/a11y              |
| `packages/flux-renderers-form-advanced/src/*`             | 04, 08, 09, 12, 20         | composite field owner, readOnly, slot metadata, a11y              |

## 跨维度模式

- 构建产物不是可发布契约: tsc-only ESM output, CSS asset copy, test pollution, package manifest dependencies 没有统一检查。
- Owner/source-of-truth 分裂: CRUD/Table, surface runtime/UI, validation external errors, host projection snapshots。
- Slot/renderer contract 残留: `props.meta`/`readOnly`/`props.regions` 的标准通道尚未被所有 renderer 遵守。
- Host/component API 多真源: flow/spreadsheet/report manifests, providers, bridge snapshot 与 docs 未完全同源。
- Safety guard 缺少 fail-closed: value-adapter transform, regex/pattern, async action result propagation。
- 可访问性集中在 complex widgets: drag/drop-only、clickable div/th、tree semantics、icon-only/dialog label。

## 已自动化但仍有漏洞的检查项

- `max-lines` 存在，但测试文件可 `eslint-disable max-lines` 绕过。
- Vitest coverage thresholds 存在，但默认 `pnpm test` 未启用 coverage。
- Playwright trace 配置为 `on-first-retry`，但 retries 为 0，失败时不会生成 trace。
- `pnpm check:oversized-code-files` 已能发现 >700/>500 文件，但当前仓库仍有 3 个 >700 测试文件。

## 建议新增自动化检查

- `pnpm check:dist-esm-imports`: build 后用 Node ESM import 每个 package export。
- `pnpm check:dist-assets`: 验证 production JS import 的 CSS 已复制到 dist 或有显式 export。
- `pnpm check:build-excludes`: 所有 package build 排除 tests/test-support。
- `pnpm check:package-deps`: production source import 与 `dependencies` 对齐，test-only workspace deps 进 `devDependencies`。
- slot/renderer contract tests: `props.meta.className/testid/cid`, `readOnly`, `props.regions` usage。
- validation external error regression tests: array mutation, projected writes, applyChanges, validate path overlay。

## 可暂缓项

- 大文件但职责集中: parser, reaction runtime, form store, spreadsheet grid。
- Debugger-only 性能项: debugger regex/search scans，除非影响 devtools 可用性。
- Host/page full snapshot subscriptions: 需要结合 profiling 与 host projection contract 分阶段收敛。
- 部分 CSS hardcoded theme values: widget/host surface 可分批迁移，先处理全局污染与 publish asset 问题。

## 误报排除清单

- `container`/`flex` 的 schema 显式 semantic props 生成 layout class，不作为 layout renderer implicit style violation。
- Spreadsheet grid raw table/input/button 属高性能 host surface，维度 11 不要求替换为 shadcn `Table/Input/Button`。
- `WrappedFieldAction` 保留非 `<Button>` element shape 是既有裁定；本轮只关注真实键盘/ARIA 缺陷。
- `DataSourceSchema` 的 public owner 是 `@nop-chaos/flux-core`，不要求由 `flux-renderers-data` root re-export。
