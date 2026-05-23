# 深度审核汇总报告

## 审核范围

- 执行的维度: `01-18` 全量
- 覆盖的包: `packages/*`、`apps/playground`、`tests/e2e`、`docs/architecture`、`docs/bugs`、`docs/plans`、`docs/skills`
- 审核日期: `2026-05-02`
- 执行方式: 18 个初审子 agent + 18 个维度复核子 agent + 39 个子项/批量复核子 agent，共 75 个子 agent

## 复核统计

- 初审发现总数: 57
- 已独立复核条目数: 60
- 维度级复核完成数: 18
- 子项逐条复核数: 38
- 批量复核覆盖条目数: 2
- 保留: 26
- 降级: 26
- 驳回: 8

## P0 清单

无。

## P1 清单

| 文件                                                                                                                                                      | 维度  | 问题                                                                   | 复核结论   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------- | ---------- |
| `docs/skills/deep-audit-prompts.md`                                                                                                                       | 01    | 维度 01 共享规则落后于当前依赖基线，会误报合法依赖                     | 保留       |
| `packages/flux-compiler/src/schema-compiler-registry.test.ts`                                                                                             | 02    | 746 行 mega test，超过仓库强制拆分阈值                                 | 保留       |
| `packages/flux-compiler/src/schema-compiler-shape-validation.test.ts`                                                                                     | 02    | 744 行 mega test，超过仓库强制拆分阈值                                 | 保留       |
| `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx`                                                                                 | 02/14 | 742 行且跨多个测试域，既触发 must-split 又影响测试质量                 | 保留       |
| `packages/report-designer-core/src/core-dispatch.ts`                                                                                                      | 06    | preview 缺少方法入口 guard/真实取消，旧请求可提前清 running 或覆盖结果 | 保留       |
| `packages/flux-runtime/src/form-runtime.ts` + `packages/flux-runtime/src/runtime-owned-factories.ts` + `packages/flux-react/src/schema-renderer.tsx`      | 08    | page-root validation owner 在 compiled model 为空时就以 `active` 暴露  | 保留       |
| `packages/flux-runtime/src/runtime-owned-factories.ts` + `packages/flux-react/src/node-renderer.tsx` + `packages/flux-renderers-form/src/field-utils.tsx` | 08    | non-form owner 缺少 hidden-field participation 通道                    | 降级后保留 |
| `packages/flux-renderers-basic/src/container.tsx`                                                                                                         | 09/10 | layout renderer 在 flex-child 路径中偷偷注入默认 gap                   | 保留       |
| `docs/architecture/renderer-runtime.md`                                                                                                                   | 16    | 仍文档化已删除的 `instantiate()` / `data` renderer API                 | 保留       |
| `packages/word-editor-core/src/index.ts`                                                                                                                  | 17    | 同一公开 surface 混用 `DataSet` 和 `Dataset` 两套词汇                  | 保留       |

## 高频问题文件

| 文件                                                                      | 涉及维度       | 模式                                                                                     |
| ------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `packages/flux-renderers-basic/src/container.tsx`                         | 09/10          | renderer contract 与 styling contract 同时漂移                                           |
| `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx` | 02/14          | oversized + mixed-domain test suite                                                      |
| `packages/flow-designer-renderers/src/designer-page.tsx`                  | 04/18          | host shell owner/i18n 双重收口不足                                                       |
| `packages/flux-code-editor/src/*`                                         | 03/09/10/17/18 | API surface、event contract、theme token、naming、registration convention 多点轻中度漂移 |
| `packages/report-designer-core/src/*`                                     | 06/07          | async/concurrency 与 lifecycle kickoff owner 边界交叠                                    |

## 跨维度模式

- 审核/文档基线与 live code 有多处收口落差：`deep-audit-prompts.md`、`renderer-runtime.md`、Plan 161、`docs/bugs/README.md`。
- 大型测试文件持续膨胀，且已经跨过仓库硬阈值，成为 02/14 两个维度的共同热点。
- 若干 host shell 仍存在 owner/i18n/theme contract 的局部分叉：flow designer 文案、code editor / spreadsheet chrome token 化、report preview 并发控制。
- 表单/字段 contract 已大体成形，但 wrapper/channel 仍留有少量 raw schema fallback 与 non-form owner 缺口。
- workspace 内仍有一批低优先级 public-surface / naming / registration drift，单项风险不高，但会持续抬高长期维护噪音。

## 已自动化的检查项

- `pnpm check:oversized-code-files` 已覆盖 `>500` / `>700` 行阈值，并对 `>700` 直接报错。
- ESLint `max-lines` 已作为超大文件第二道防线。
- 当前 live source 未发现 `eval(` / `new Function(` 违规。

## 建议新增的自动化检查

- docs consistency check: 校验 `docs/skills/deep-audit-prompts.md` 中维度 01 固定规则是否与 `AGENTS.md` / live manifests 一致。
- docs API check: 从 `packages/flux-core/src/types/renderer-hooks.ts` 对比 `docs/architecture/renderer-runtime.md` 中的接口片段。
- lint/check: layout renderer 禁止在 renderer code 中注入默认 gap / padding / margin。
- contract check: code-editor 事件 payload 至少要带 `type`，避免 normalized event 丢失。
- docs inventory check: `docs/bugs/README.md` 自动比对 `docs/bugs/*.md` 目录。
- focused test debt check: 为 `validation-lowering.ts` 建 focused helper suite，为 cross-field/conditional validation 建 E2E 守卫。

## 可暂缓项

- `packages/flux-runtime/src/index.ts` 对 core registry helper 的 convenience re-export。
- `packages/flow-designer-renderers/src/index.tsx` 对 `designer-context` 的过宽 `export *`。
- `packages/flux-react/src/hooks.ts` 的 broad wake/select 与 `useCurrentFormModelGeneration()` 的轻度订阅粒度问题。
- `packages/word-editor-renderers/src/hooks/use-word-editor-shortcuts.ts` 的 `scopeRef` DOM ref 命名。
- `packages/flow-designer-renderers/src/dingflow/*` 的文件前缀漂移。
- `packages/flux-code-editor/src/index.ts` 的 registration helper 轻度实现分歧。

## 误报排除清单

- report designer field-source refresh 已有 abort + stale-result guard，原“旧结果覆盖新状态”线索被驳回。
- `flux-react` 的 `RendererDefinition` 是文档支持的 React alias，不是重复契约。
- `flux-code-editor` root barrel 不是 compiler internal leak；剩余问题主要是低优先级 surface/naming 收口。
- `variant-field` 的 nested `variants[]` 和 `*Action as prop` 在当前 baseline 下仍属接受中的例外/中间态，不直接计为 defect。
- `word-editor` 的 file/color input 与 `spreadsheet-renderers` 的原生 host surface 属于 UI 合理例外。
- `runtime-factory.ts` 当前主要是 500+ 警戒问题，不构成“owner doc 已失真”的强结论。
