# 维度 18：跨包模式一致性

## 第 1 轮（初审）

### [维度18-01] 仓库级 package 结构约定已与 live 多包形态脱节，正在制造模板与迁移误导

- **涉及包**: repo-level package conventions vs multiple live packages
- **文件**:
  - `C:\can\nop\nop-chaos-flux\AGENTS.md`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\index.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\index.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\__tests__\word-editor-page.test.tsx`
- **严重程度**: P2
- **不一致类别**: 包结构 / 测试入口约定
- **包 A 模式**: `AGENTS.md` 规定每个包都应有 `src/index.ts` 和 `index.test.ts`。
- **包 B 模式**: live 包大量使用 `src/index.tsx`，测试也分散在 `index.test.tsx`、`__tests__` 等位置。
- **统一建议**: 更新 repo-level 约定，承认 `index.tsx` 和分散测试布局的 live baseline，或收敛实际包结构到统一模板。
- **为什么值得现在做**: 这是 repo 级脚手架与迁移说明，不是单包实现差异；会直接误导新增包、复制模板和审计测试入口。
- **误报排除**: 不是机械挑 `ts` vs `tsx`；问题是统一约定文档已失真并影响所有包的新增/迁移流程。
- **历史模式对应**: 对应 repo-level package template drift。
- **参考文档**: `AGENTS.md`
- **复核状态**: 未复核

### [维度18-02] `word-editor-page` owner doc 省略 live region override surface，与同类 host-renderer 家族公开契约写法不一致

- **涉及包**: `word-editor-renderers` vs `flow-designer-renderers` / `report-designer-renderers`
- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\types.ts`
  - `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\renderers.tsx`
  - `C:\can\nop\nop-chaos-flux\docs\components\word-editor-page\design.md`
  - `C:\can\nop\nop-chaos-flux\docs\architecture\flow-designer\design.md`
  - `C:\can\nop\nop-chaos-flux\docs\architecture\report-designer\design.md`
- **严重程度**: P2
- **不一致类别**: host page public contract
- **包 A 模式**: `word-editor-renderers` 的 live 类型和 renderer 定义支持 `toolbar`、`leftPanel`、`rightPanel` region override，但 owner doc schema code block 省略这些 surface。
- **包 B 模式**: 同家族的 `designer-page` / `report-designer-page` 文档会明确把对应 region override 写进 schema。
- **统一建议**: 让 `word-editor-page` 文档与 live public type 对齐，按 host page family 一致方式声明 region override surface。
- **为什么值得现在做**: 这已形成真实 doc-code mismatch 和跨包 host page family 的 authoring 面分叉。
- **误报排除**: 不是 bridge 形态差异；问题落在公开 authoring 契约层。
- **历史模式对应**: 对应 host page family 公共 region contract 文档不一致。
- **参考文档**: `docs/components/word-editor-page/design.md`、`docs/architecture/flow-designer/design.md`、`docs/architecture/report-designer/design.md`
- **复核状态**: 未复核

## 初审排除项

- `SchemaInput` vs `BaseSchema | BaseSchema[]`：当前只是等价类型别名或写法差异，未见额外维护成本证据。
- 各包 CSS 导入位置不同：本轮未见明确 owner doc 承诺或已造成公开契约混乱的证据，因此不保留。

## 维度复核结论

- [维度18-01]：保留 (P2)。repo-level package 模板约定已与 live 多包形态脱节。
- [维度18-02]：降级为 P2。`word-editor-page` 文档 schema code block 省略 region override surface，但同文档其它段落已明确这些 surface，属于文档呈现不齐而非完整 contract 缺失。

## 最终保留项

| 编号  | 严重程度 | 文件        | 一句话摘要                                        |
| ----- | -------- | ----------- | ------------------------------------------------- |
| 18-01 | P2       | `AGENTS.md` | repo-level package 结构约定已与 live 多包形态脱节 |
