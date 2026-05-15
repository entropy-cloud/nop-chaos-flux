# 维度 17：命名与术语一致性

## 第 1 轮（初审）

### [维度17-01] `closeSurface` 已是正式基线，但 README 与 playground 仍继续教学 `closeDialog`

- **文件**:
  - `C:\can\nop\nop-chaos-flux\README.md:133`
  - `C:\can\nop\nop-chaos-flux\README.zh-CN.md:133`
  - `C:\can\nop\nop-chaos-flux\apps\playground\src\pages\fluxBasicPageSchema.json:199,384`
  - `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\actions.ts`
- **证据片段**:

  ```md
  README 仍把 `closeDialog` 放进正式动作介绍
  ```

  ```json
  // fluxBasicPageSchema.json 仍直接使用 closeDialog
  ```

- **严重程度**: P2
- **冲突名称**: `closeSurface` vs `closeDialog`
- **冲突位置**: README / playground 继续教学 `closeDialog`；正式基线与 action types 已以 `closeSurface` 为 canonical。
- **统一建议**: README 和 playground 统一改为 `closeSurface`；若必须提 `closeDialog`，只保留“兼容别名，不建议新 schema 使用”的说明。
- **为什么值得现在做**: 仓库最外层入口文档和活示例仍在继续向作者传授 alias 词汇，已形成真实 authoring 词汇分裂。
- **误报排除**: 不是单纯内部还兼容旧名；问题在于外层文档和示例仍把旧词当正常教学词汇。
- **历史模式对应**: 对应公开 action 词汇 canonical 与 alias 教学分裂。
- **参考文档**: `docs/references/flux-json-conventions.md`、`docs/architecture/action-scope-and-imports.md`、`docs/architecture/surface-owner.md`
- **复核状态**: 未复核

## 初审排除项

- `flux-code-editor` 的 legacy `dataPath`：当前只剩兼容读取且已显式 `@deprecated`，未见 active docs/examples 继续把它当 canonical authoring 字段教学。
- `data-source` 的 `name` / legacy `dataPath`：active architecture 已明确 `name` 是规范路径，`dataPath` 是 legacy compatibility。
- `variant` / `intent` / `level`：本轮未看到 active public docs 与 live public contract 形成必须上报的新双词汇冲突。

## 维度复核结论

- [维度17-01]：降级为 P2。README 已明确 `closeSurface` 是正式基线，仍成立的漂移主要在 playground 活示例继续使用 `closeDialog` alias。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度无通过独立复核的保留项 |
