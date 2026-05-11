# Round 05 - Shared UI And Infrastructure Boundary Audit

## Findings

### 1. P1 | 跨包契约未覆盖 / 误导性 coverage

- 契约：`@nop-chaos/theme-tokens`、`@nop-chaos/tailwind-preset`、`@nop-chaos/ui` 组合后，shared sidebar token 默认值必须存在，保证 UI 消费 `bg-sidebar` / `text-sidebar-foreground` / `ring-sidebar-border` 等稳定样式接口时可用。
- 位置：
  - 实现：`packages/tailwind-preset/src/index.ts`，`packages/ui/src/components/ui/sidebar-layout.tsx`，`packages/theme-tokens/src/styles.css`
  - 兜底：`apps/playground/src/styles-theme-utilities.css`
  - 测试：`packages/theme-tokens/src/styles.test.ts`，`packages/tailwind-preset/src/index.test.ts`
- 现状：
  - preset 公开了 `sidebar.*` 颜色映射，UI sidebar 组件直接消费这些类。
  - 但 `theme-tokens` 的公开 stylesheet 没有提供任何 `--sidebar*` 默认值。
  - 当前只有 playground 私有样式为这些 token 兜底。
  - 现有测试分别证明“token 文件存在”和“preset 存在颜色映射”，却没有验证三包组合后的真实跨包契约。
- 为什么 coverage 会误导：
  - 三个包各自都有测试，容易让人误以为 shared token contract 已被保护。
  - 实际上消费者只通过公开包入口组合 `theme-tokens + tailwind-preset + ui` 时，sidebar 默认样式契约并未被证明成立。
- 最小补强建议：
  - 增加一个跨包 contract test，验证公开 `styles.css` + preset + sidebar 组件组合时，`--sidebar*` token 集合完整存在。
  - 若设计上要求默认 token 由 `theme-tokens` 提供，应把 `--sidebar*` 正式收进 `theme-tokens` 公共样式，而不是依赖 playground 私有兜底。

### 2. P1 | 公共入口覆盖错误层级

- 契约：`@nop-chaos/ui` 的稳定接口是 `src/index.ts` 与 `package.json.exports`，不是内部组件文件路径；公开入口和 subpath export 断裂必须有测试拦截。
- 位置：
  - 实现：`packages/ui/src/index.ts`，`packages/ui/package.json`
  - 测试：现有 `button.test.tsx`、`input.test.tsx`、`field.test.tsx`、`select.test.tsx`、`dialog.test.tsx`、`checkbox.test.tsx`、`switch.test.tsx`、`native-select.test.tsx`
- 现状：
  - UI 自测多数直接 import 内部文件，命中的是组件实现层，不是公开包入口。
  - `package.json.exports` 公开的 `.`、`./chart`、`./lib/utils`、`./base.css`、`./styles.css` 没有对应的导出契约测试。
- 为什么 coverage 会误导：
  - UI 包测试很多，容易误判 `@nop-chaos/ui` 公共入口安全。
  - 实际上 `src/index.ts` 漏导出、误导出，或 CSS/chart subpath 断掉，都可能静默逃过现有 coverage。
- 最小补强建议：
  - 增加一个 entry-boundary test，专门从 `@nop-chaos/ui` 根入口和公开 subpath 导入代表性符号，验证 exports 与 `src/index.ts` 的稳定对齐。

### 3. P1 | 错误契约被测试固化

- 契约：repo-level `disabled/value/onChange` 接口应遵循真实控件禁用语义；disabled 状态不应被测试写成“仍触发 change”。
- 位置：
  - 实现：`packages/ui/src/components/ui/native-select.tsx`
  - 测试：`packages/ui/src/components/ui/native-select.test.tsx`
  - 相关文档：`docs/architecture/styling-system.md`
- 现状：
  - `NativeSelect` 只是把 props 透传给原生 `<select>`。
  - 但现有测试在 `disabled` 状态下手动触发 `change` 并断言 `onChange` 被调用，把错误语义标记成“public contract”。
- 为什么 coverage 会误导：
  - 这不是单纯漏测真实交互，而是在主动固化错误契约。
  - 对仓库里大量 renderer 依赖的 `disabled` 稳定接口来说，这会让 synthetic test 与真实用户交互语义分叉，产生假安全感。
- 最小补强建议：
  - 修正测试语义：disabled 状态下不应把 `fireEvent.change` 后 handler 被调用视为 contract proof。
  - 为 `disabled/value/onChange` 建立面向真实交互语义的共享 UI contract test，而不是只验证事件系统能否被人工触发。

## 本轮新增证据 / 新增结论

- 本轮新增的问题不是“基础设施包测试少”，而是更具体地识别出 shared token contract、UI 公共入口边界，以及 `disabled` 语义这三类被现有 coverage 伪装成“已覆盖”的断层。
- 其中最危险的是 `NativeSelect`：它不是缺测试，而是现有测试正在把错误的 repo-level 行为写死成契约。
