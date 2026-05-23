# 01 依赖图与包边界

## 复核统计

- 初审条目: 2
- 维度复核: 完成
- 子项复核: 2 条
- 复核新增: 1 条
- 保留: 1
- 降级: 2
- 驳回: 0

## 依赖图

```text
@nop-chaos/flow-designer-core -> @nop-chaos/flux-core, @nop-chaos/flux-formula
@nop-chaos/flow-designer-renderers -> @nop-chaos/flow-designer-core, @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-action-core -> @nop-chaos/flux-core, @nop-chaos/flux-compiler
@nop-chaos/flux-code-editor -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/ui
@nop-chaos/flux-compiler -> @nop-chaos/flux-core, @nop-chaos/flux-formula
@nop-chaos/flux-core -> (none)
@nop-chaos/flux-formula -> @nop-chaos/flux-core
@nop-chaos/flux-i18n -> @nop-chaos/flux-core
@nop-chaos/flux-react -> @nop-chaos/flux-compiler, @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-basic -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-data -> @nop-chaos/flux-compiler, @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-renderers-form, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-form -> @nop-chaos/flux-compiler, @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-renderers-basic, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-form-advanced -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-renderers-basic, @nop-chaos/flux-renderers-form, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-runtime -> @nop-chaos/flux-action-core, @nop-chaos/flux-compiler, @nop-chaos/flux-core, @nop-chaos/flux-formula
@nop-chaos/nop-debugger -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/ui
@nop-chaos/report-designer-core -> @nop-chaos/flux-core, @nop-chaos/spreadsheet-core
@nop-chaos/report-designer-renderers -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/report-designer-core, @nop-chaos/spreadsheet-core, @nop-chaos/spreadsheet-renderers, @nop-chaos/ui
@nop-chaos/spreadsheet-core -> (none)
@nop-chaos/spreadsheet-renderers -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/spreadsheet-core, @nop-chaos/ui
@nop-chaos/tailwind-preset -> (none)
@nop-chaos/theme-tokens -> (none)
@nop-chaos/ui -> @nop-chaos/flux-i18n
@nop-chaos/word-editor-core -> (none)
@nop-chaos/word-editor-renderers -> @nop-chaos/flux-core, @nop-chaos/flux-i18n, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/ui, @nop-chaos/word-editor-core
```

## 保留

### [维度01] 共享审核规则已落后于 live dependency baseline

- **文件**: `docs/skills/deep-audit-prompts.md:337-342`, `AGENTS.md:40-55`, `packages/flux-runtime/package.json:16-19`, `packages/ui/package.json:31-33`
- **证据片段**:
  ```md
  337: c. flux-runtime 只能依赖 flux-core 和 flux-formula
  342: h. ui 不依赖任何 @nop-chaos/\* 包（peerDependencies 除外）
  ```
  ```md
  40: flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime -> flux-react
  48: flux-core -> flux-i18n -> flux-react, ui
  ```
- **严重程度**: P1
- **现状**: 维度 01 的共享规则仍把 `flux-runtime -> flux-compiler/flux-action-core` 和 `ui -> flux-i18n` 视为违规候选。
- **风险**: 后续按该手册执行审核会系统性误报当前合规依赖。
- **建议**: 同步 `docs/skills/deep-audit-prompts.md` 中维度 01 的固定背景和检查规则。
- **为什么值得现在做**: 这是审核基线文档，错误规则会污染后续多轮审计结果。
- **误报排除**: 不是理想化分层争议，`AGENTS.md` 和 live `package.json` 已明确当前合法依赖流。
- **历史模式对应**: 审核规则落后于 live baseline
- **参考文档**: `AGENTS.md`, `docs/index.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度01] CSS 子路径导出直接绑定到 `src/`

- **文件**: `packages/flux-react/package.json:11-17`, `packages/theme-tokens/package.json:11-17`
- **证据片段**:
  ```json
  11:   "exports": {
  16:     "./default-spacing.css": "./src/default-spacing.css"
  ```
  ```json
  11:   "exports": {
  16:     "./styles.css": "./src/styles.css"
  ```
- **严重程度**: P2
- **现状**: 公开 CSS 子路径依赖源码目录布局，而不是 `dist/` 产物。
- **风险**: manifest/build 约定不收口，后续若改动目录或构建策略更容易失配。
- **建议**: 明确这是工作区内约定，或补齐 CSS 复制产物后再切到 `dist/*` 导出。
- **为什么值得现在做**: 当前 Vite alias 也绑定了同样的 `src` 路径，说明这是可见的工程约定缺口。
- **误报排除**: 当前仓库是 `private` workspace，问题主要是导出/构建约定不收口，不是已证实的对外发布故障。
- **历史模式对应**: manifest 与 build 产物契约未收口
- **参考文档**: `AGENTS.md`
- **复核状态**: `已降级`

### [维度01] exports 子路径约定仍不一致

- **文件**: `packages/flux-react/package.json:11-17`, `packages/theme-tokens/package.json:11-17`, `packages/ui/package.json:11-25`
- **证据片段**:
  ```json
  16:     "./base.css": "./dist/styles/base.css",
  17:     "./styles.css": "./dist/styles/index.css"
  ```
- **严重程度**: P3
- **现状**: TS/JS 根导出统一使用 `{ types, default }`，CSS 子路径则混用字符串形式。
- **风险**: 自动化检查和包级公开面约定不够一致。
- **建议**: 为 CSS 子路径是否允许例外补一条明确规则，不必把该项上升为边界违规。
- **为什么值得现在做**: 后续如果继续增加样式子路径，约定不清会重复制造杂音。
- **误报排除**: `ui` 的 CSS 子路径本身并不构成 live bug，问题仅在约定不一致。
- **历史模式对应**: 子路径导出规则未文档化
- **参考文档**: `docs/skills/deep-audit-prompts.md`
- **复核状态**: `已降级`

## 零发现

- 未发现跨包 `@nop-chaos/*/src/...` 内部路径导入。
- 未发现 manifest 级循环依赖。
- 未发现 `*-core -> *-renderers` 反向依赖。
- 未发现缺失 `build` 脚本或 `tsconfig.build.json` 的包。

## 合规包清单

- `@nop-chaos/flow-designer-core`, `@nop-chaos/flow-designer-renderers`, `@nop-chaos/flux-action-core`, `@nop-chaos/flux-code-editor`, `@nop-chaos/flux-compiler`, `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`
- `@nop-chaos/flux-renderers-basic`, `@nop-chaos/flux-renderers-data`, `@nop-chaos/flux-renderers-form`, `@nop-chaos/flux-renderers-form-advanced`, `@nop-chaos/flux-runtime`, `@nop-chaos/nop-debugger`, `@nop-chaos/report-designer-core`, `@nop-chaos/report-designer-renderers`
- `@nop-chaos/spreadsheet-core`, `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/tailwind-preset`, `@nop-chaos/word-editor-core`, `@nop-chaos/word-editor-renderers`
