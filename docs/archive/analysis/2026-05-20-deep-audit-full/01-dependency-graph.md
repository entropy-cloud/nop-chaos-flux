# 维度 01: 依赖图与包边界

## 第 1 轮（初审）

## 零发现结论

本轮按当前审计基线 `v1 / 无兼容负担 / 不接受过渡态主路径` 执行，未发现需要作为维度 01 初审发现上报的真实包边界问题。

已阅读并对照的关键文档：

- `docs/index.md`
- `AGENTS.md`
- `docs/references/audit-tooling.md`
- `docs/references/deep-audit-calibration-patterns.md`
- `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- `docs/skills/react19-best-practices-review.md`
- `docs/skills/deep-audit-prompts.md` 的共享提示词前缀与维度 01 正文
- owner 文档：`docs/architecture/flux-runtime-module-boundaries.md`

已检查范围：

- 读取并审计全部 25 个 `packages/*/package.json`
- 基于 `dependencies` / `peerDependencies` 重建内部 `@nop-chaos/*` 依赖图
- 对照维度 01 规则 a-i 检查基础层、runtime 层、React 层、renderers 层、designer/editor core/renderers 层、`ui`、`tailwind-preset`、`theme-tokens`
- 检查跨包内部路径导入：
- 未发现 `@nop-chaos/*/src/...`
- 未发现 `@nop-chaos/*/internal...`
- 仅发现已由 `exports` 声明或 owner 文档支撑的公开子路径，例如 `@nop-chaos/flux-react/unstable`、`@nop-chaos/ui/chart`、`@nop-chaos/flux-renderers-form/definitions`
- 检查循环依赖迹象：
- 未发现生产依赖环
- 若计入 `devDependencies`，存在测试/构建便利依赖，但未形成生产边界环或运行时反向依赖
- 检查 `exports` 字段一致性：
- 所有 JS/TS 入口均使用 `types` + `default`
- CSS subpath exports 使用字符串或 `{ default }` 指向 `dist`，与已通过的 `check:package-css-exports` 基线一致
- 检查 `tsconfig.build.json` 与 `build` 脚本：
- 25 个包均存在 `tsconfig.build.json`
- 25 个包均声明 `build` 脚本

说明：

- `@nop-chaos/flux-runtime` 依赖 `@nop-chaos/flux-compiler` 与 `@nop-chaos/flux-action-core`，虽然维度 01 旧规则 c 写作 “flux-runtime 只能依赖 flux-core 和 flux-formula”，但当前 owner 文档明确记录：
- action execution framework 已抽取到 `@nop-chaos/flux-action-core`
- action precompile / schema compile ownership 位于 `@nop-chaos/flux-compiler`
- `flux-runtime` 通过这些公开包组装运行时
- 因此该依赖不是反向依赖、不是过渡态豁免、也不是私有耦合，而是当前 owner 文档支撑的生产依赖边界。
- `renderers -> flux-core / flux-formula / flux-runtime / flux-react` 的公开 API 依赖按 calibration 文档克制处理；本轮未发现 renderers 通过私有路径或未导出路径耦合这些包。

## 完整依赖图

以下图基于全部 `packages/*/package.json` 的 `dependencies` 与 `peerDependencies` 中的内部 `@nop-chaos/*` 引用重建；`devDependencies` 不计入主生产依赖图，另在后文说明。

### 基础与运行时层

```text
@nop-chaos/flux-core
  -> 无内部依赖

@nop-chaos/flux-formula
  -> @nop-chaos/flux-core

@nop-chaos/flux-compiler
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula

@nop-chaos/flux-action-core
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-compiler

@nop-chaos/flux-runtime
  -> @nop-chaos/flux-action-core
  -> @nop-chaos/flux-compiler
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-core

@nop-chaos/flux-i18n
  -> @nop-chaos/flux-core

@nop-chaos/flux-react
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-runtime
  -> @nop-chaos/ui
```

### UI、主题、Tailwind 层

```text
@nop-chaos/ui
  -> 无内部 @nop-chaos/* dependencies / peerDependencies

@nop-chaos/theme-tokens
  -> 无内部依赖

@nop-chaos/tailwind-preset
  -> 无内部依赖
```

### Flux renderer 与 facade 层

```text
@nop-chaos/flux-renderers-basic
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui

@nop-chaos/flux-renderers-form
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui

@nop-chaos/flux-renderers-form-advanced
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/flux-renderers-form
  -> @nop-chaos/ui

@nop-chaos/flux-renderers-data
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui

@nop-chaos/flux-code-editor
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui

@nop-chaos/flux
  -> peerDependencies:
     -> @nop-chaos/ui
  -> 无内部 runtime/renderers 生产 dependencies
  -> 内部 Flux 包仅出现在 devDependencies，用于 facade build/test 组合
```

### Flow Designer 层

```text
@nop-chaos/flow-designer-core
  -> @nop-chaos/flux-core

@nop-chaos/flow-designer-renderers
  -> @nop-chaos/flow-designer-core
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui
```

### Spreadsheet / Report Designer 层

```text
@nop-chaos/spreadsheet-core
  -> 无内部依赖

@nop-chaos/spreadsheet-renderers
  -> @nop-chaos/spreadsheet-core
  -> @nop-chaos/flux-react
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/ui

@nop-chaos/report-designer-core
  -> @nop-chaos/flux-core
  -> @nop-chaos/spreadsheet-core

@nop-chaos/report-designer-renderers
  -> @nop-chaos/spreadsheet-core
  -> @nop-chaos/spreadsheet-renderers
  -> @nop-chaos/report-designer-core
  -> @nop-chaos/flux-react
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/ui
```

### Word Editor 层

```text
@nop-chaos/word-editor-core
  -> 无内部依赖

@nop-chaos/word-editor-renderers
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui
  -> @nop-chaos/word-editor-core
```

### Debugger 层

```text
@nop-chaos/nop-debugger
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/ui
```

## 违规清单

本轮未发现需要上报的违规项。

已排除的可疑但合规项：

- `@nop-chaos/flux-runtime -> @nop-chaos/flux-compiler / @nop-chaos/flux-action-core`
- owner 文档明确支撑当前 runtime assembly 与 action/compiler ownership。
- `@nop-chaos/report-designer-renderers -> @nop-chaos/spreadsheet-renderers`
- calibration 文档要求不要机械地把跨 domain renderer 复用视为边界错误；本轮未发现私有路径或生命周期问题。
- `@nop-chaos/flux-react/unstable`
- package exports 已声明，owner 文档明确列出 renderer-facing unstable convenience surface。
- `@nop-chaos/ui/chart`
- package exports 已声明。
- `@nop-chaos/flux-renderers-form/definitions`
- package exports 已声明。
- CSS subpath exports 不使用 `types + default` 双条件：
- CSS exports 指向 `dist`，且主 agent 已提供 `pnpm check:package-css-exports` 通过基线；不作为 JS/TS 入口一致性问题上报。

## 合规包清单

以下 25 个包在本轮维度 01 初审中未发现依赖图、内部路径导入、exports、build 脚本或 `tsconfig.build.json` 方面的需上报问题：

- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-compiler`
- `@nop-chaos/flux-action-core`
- `@nop-chaos/flux-runtime`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-i18n`
- `@nop-chaos/flux`
- `@nop-chaos/flux-code-editor`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-form-advanced`
- `@nop-chaos/flux-renderers-data`
- `@nop-chaos/ui`
- `@nop-chaos/theme-tokens`
- `@nop-chaos/tailwind-preset`
- `@nop-chaos/flow-designer-core`
- `@nop-chaos/flow-designer-renderers`
- `@nop-chaos/spreadsheet-core`
- `@nop-chaos/spreadsheet-renderers`
- `@nop-chaos/report-designer-core`
- `@nop-chaos/report-designer-renderers`
- `@nop-chaos/word-editor-core`
- `@nop-chaos/word-editor-renderers`
- `@nop-chaos/nop-debugger`

## 总结评估

维度 01 第 1 轮初审未发现高价值包边界缺陷。

当前生产依赖总体呈现清晰分层：

```text
flux-core
  -> flux-formula
  -> flux-compiler
  -> flux-action-core
  -> flux-runtime
  -> flux-react
  -> flux-renderers-* / designer-renderers / editor-renderers
```

同时存在几个当前 owner 文档支撑的合理例外：

- `flux-runtime` 生产依赖 `flux-compiler` 与 `flux-action-core`
- renderer 包可依赖 `flux-core` / `flux-formula` / `flux-runtime` / `flux-react` 的公开 API
- renderer 包可使用 `@nop-chaos/flux-react/unstable` 中已导出的 renderer-facing convenience surface
- facade 包 `@nop-chaos/flux` 通过 dev/build 组合内部包，但不把内部 Flux runtime/renderers 包暴露为 host-facing production install requirements

自动化基线与人工复核结果一致：

- `pnpm check:workspace-manifest-deps` 已通过，未发现 source workspace imports 缺 manifest 声明
- `pnpm check:package-css-exports` 已通过，CSS export targets 指向 `dist`
- `pnpm check:src-artifacts` 已通过，未发现 src 构建产物
- 本轮人工搜索未发现跨包 `src/` 或 `internal` 私有路径导入
- 本轮未发现生产依赖循环
- 本轮未发现缺失 `tsconfig.build.json` 或 `build` 脚本的包

## 维度复核结论

- 独立复核后，维度 01 的零发现结论仍成立；基于 live `packages/*/package.json` 复建的 25 包生产依赖图，未发现 `flux-core` 反向依赖、`flux-react -> renderers`、`*-core -> *-renderers`、`spreadsheet-core -> report-designer-core`，也未发现生产依赖环。
- 已复核跨包导入面，仍仅见已声明 `exports` 的公开子路径使用（如 `@nop-chaos/flux-react/unstable`、`@nop-chaos/ui/chart`、`@nop-chaos/flux-renderers-form/definitions`、`@nop-chaos/spreadsheet-renderers/canvas-styles.css`）；未见 `@nop-chaos/*/src/*`、`/internal/*` 这类私有路径耦合，因此零发现判断可保留。
- 已复核包发布/构建基线：25 个包均存在 `tsconfig.build.json` 与 `build` 脚本；JS/TS 入口 `exports` 保持 `types + default`，CSS 子路径导出为已声明的静态资源例外，未构成需上报的边界问题。
- 残余风险/缺口：本次复核主要覆盖 manifest 生产依赖与静态 import 面；`devDependencies` 级测试/构建耦合未按生产边界上报，后续若 owner 文档收紧跨域 renderer 复用或 `unstable` 子路径政策，需再做一次针对公开子路径的专项复核。

## 子项复核结论

- 维度 01：零发现结论成立，无需进入子项追加复核。

## 最终保留项

- 无。
