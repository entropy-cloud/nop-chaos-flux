# 维度 16：文档-代码一致性

## 第 1 轮（初审）

硬门禁 `pnpm check:active-doc-code-anchors` PASS（259 docs verified）。所有发现均为内容/语义漂移，非路径锚点失效。漂移集中在一个高流量文档 `docs/references/quick-reference.md`。

### [维度16-01] quick-reference.md 把 flux-bundle npm 名误记为 @nop-chaos/flux-bundle

- **文档**: `docs/references/quick-reference.md:30`
- **代码**: `packages/flux-bundle/package.json:2`（`@nop-chaos/flux`）
- **严重程度**: P2（与 03-05 合并去重后保留 P3 → AUDIT-22）
- **漂移类型**: 文档-代码事实性漂移（npm 包名错误）
- **文档描述**: `| flux-bundle | @nop-chaos/flux-bundle | 8 |`
- **代码现状**: 实际 `@nop-chaos/flux`；同仓 audit-tooling.md 已正确。
- **建议**: 改为 `@nop-chaos/flux`；可标注"目录名 flux-bundle，发布名 @nop-chaos/flux"。
- **误报排除**: 非路径锚点（anchors gate 不覆盖 npm 名字符串）；会误导 host 按误名安装。
- **复核状态**: 维度复核通过（保留，合并 → AUDIT-22）。

### [维度16-02] quick-reference.md Package Directory Map 缺 3 个活跃渲染器包

- **文档**: `docs/references/quick-reference.md:14-40`
- **代码**: `packages/flux-renderers-{content,layout,mobile}/` 均存在
- **严重程度**: P2
- **漂移类型**: 文档-代码完整性漂移
- **文档描述**: 仅列 basic/form/form-advanced/data；并断言"{feature}-renderers 命名 NOT flux-renderers-{feature}"。
- **代码现状**: 共 7 个 flux 渲染器包；AGENTS.md Project Overview 已列全 7 个。
- **建议**: 补齐 content/layout/mobile 三行。
- **误报排除**: ls 确认三目录存在；AGENTS.md 确认活跃成员；非路径失效。
- **复核状态**: 维度复核通过（保留 P2 → AUDIT-08）。

### [维度16-03] quick-reference.md 把 useRenderInstancePath 返回类型标为 string

- **文档**: `docs/references/quick-reference.md:501`
- **代码**: `packages/flux-react/src/context-hooks.ts:36`（`readonly InstanceFrame[] | undefined`）
- **严重程度**: P3
- **漂移类型**: 类型签名漂移 + 文档间不一致
- **文档描述**: `| useRenderInstancePath() | string | ... |`
- **代码现状**: 返回 `readonly InstanceFrame[] | undefined`；renderer-runtime.md:755 已正确。
- **建议**: 改为 `readonly InstanceFrame[] | undefined`。
- **误报排除**: 直接读 context-hooks.ts:36 确认；非主观数字/风格——明确 TS 签名事实；anchors gate 不覆盖类型签名。
- **复核状态**: 维度复核通过（保留 P3 → AUDIT-21）。

### [维度16-04] quick-reference.md 把 useCurrentFormError/useFieldError 返回标为数组

- **文档**: `docs/references/quick-reference.md:481,483`
- **代码**: `packages/flux-react/src/hooks/use-form-hooks.ts:233,272`（单值 `ValidationError | undefined`）
- **严重程度**: P2
- **漂移类型**: 类型签名漂移（数组 vs 单值，语义性）
- **文档描述**: 两行均 `ValidationError[] | undefined`。
- **代码现状**: 单数返回（源码用 `[0]`）；useCurrentFormErrors（复数）才返回数组；renderer-runtime.md:772/780 与源码一致。
- **建议**: 两行改为 `ValidationError | undefined`（保留复数行为组）。
- **误报排除**: 直接读源码确认；数组 vs 单值会改变消费方代码（.map/.length 误用致 TypeError）；anchors gate 不覆盖。
- **复核状态**: 维度复核通过（保留 P2 → AUDIT-09）。

## 维度复核结论

- [16-01]: 保留（与 03-05 合并去重 → AUDIT-22，P3）。
- [16-02]: 保留 P2 → AUDIT-08。
- [16-03]: 保留 P3 → AUDIT-21。
- [16-04]: 保留 P2 → AUDIT-09。

已核实无漂移：flux-runtime-module-boundaries.md 所有权映射与代码一致；styling-system.md classAliases 机制与 flux-core 实现一致；form-validation.md 验证阶段与实现一致；terminology.md 抽样一致；AGENTS.md 路由表路径全部有效；docs/plans/ 状态无失真（145 文件无矛盾态）；docs/bugs/ "Notes For Future Refactors" 均为前瞻性清理建议。

## 最终保留项

| 编号  | 严重程度 | 文档                         | 摘要                                                         |
| ----- | -------- | ---------------------------- | ------------------------------------------------------------ |
| 16-01 | P3       | `quick-reference.md:30`      | flux-bundle 包名误记（合并 AUDIT-22）                        |
| 16-02 | P2       | `quick-reference.md:14-40`   | Package Map 缺 content/layout/mobile                         |
| 16-03 | P3       | `quick-reference.md:501`     | useRenderInstancePath 返回类型误                             |
| 16-04 | P2       | `quick-reference.md:481,483` | useCurrentFormError/useFieldError 返回类型误（数组 vs 单值） |
