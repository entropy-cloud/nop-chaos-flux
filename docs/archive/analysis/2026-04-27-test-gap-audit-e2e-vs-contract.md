# 2026-04-27 测试增补审计：E2E 与契约测试边界

## 目的

- 核对当前仓库哪些地方值得新增 E2E。
- 核对哪些地方更应该继续补单元测试/契约测试。
- 明确哪些现有 E2E 属于高价值契约，哪些更接近调试或样式冻结，不应继续扩张。

## 审计范围

- `tests/e2e/`
- `packages/*/src/**/*.{test,spec}.{ts,tsx}`
- `apps/playground/src/**/*.{test,spec}.{ts,tsx}`
- `playwright.config.ts`
- `apps/playground/src/route-model.ts`
- 历史审计：`docs/analysis/2026-04-17-deep-audit/14-test-coverage-quality.md`

## 判断原则

1. 默认优先补单元测试，而且应当是输入/输出导向的契约测试。
2. 只有在浏览器真实行为、跨包真实装配、或需要固化隐秘设计要求时，才新增 E2E。
3. 不为实现细节写测试：不锁定内部 DOM 层级、React fiber、类名拼接细节、局部布局数值，除非该数值本身就是设计契约。
4. 对已有 E2E，优先提升少量高价值契约，不追求页面数量或 spec 数量继续膨胀。

## 当前基线

### 单元/契约测试基线

- 核心链路已经有较强测试密度：`flux-core`、`flux-formula`、`flux-compiler`、`flux-action-core`、`flux-runtime`、`flux-react`、`flux-renderers-*`、`flow-designer-*`、`word-editor-*`、`report-designer-*`、`spreadsheet-*`、`nop-debugger` 都已有较多测试。
- `apps/playground` 也有一定的路由和页面级测试，不完全依赖 Playwright。
- 当前明显缺口主要不是核心运行时，而是少数基础设施包和共享 UI 包：
  - `packages/tailwind-preset`: 未发现源码级测试
  - `packages/theme-tokens`: 未发现源码级测试
  - `packages/ui`: 有测试，但密度明显低于其在仓库中的复用程度

### E2E 基线

- `component-lab` 已对全部 shared renderer route 建立了 route-inventory/coverage-manifest 驱动的冒烟与分组行为覆盖。
- domain route 已有入口页 smoke：`flux-basic`、`flow-designer`、`report-designer`、`debugger-lab`、`condition-builder`、`code-editor`、`word-editor`、`performance-table`。
- 已有较强 E2E 纵深的页面：
  - `debugger`
  - `flow-designer`
  - `code-editor`
  - `report-designer`
  - `word-editor`
- 现有 E2E 中也混有一些“调试/诊断型”用例：
  - `tests/e2e/debug-collapsible*.spec.ts`
  - `tests/e2e/node-title-subtitle-gap.spec.ts`
  - `tests/e2e/tailwind-css-scan.spec.ts`
  - `tests/e2e/flow-designer-ui.spec.ts` 中部分 computed-style 断言

## 结论

### 是否需要继续补 E2E

需要，但范围应当很小。

当前仓库不缺“页面能打开”的 E2E，也不缺大量普通 UI 可见性断言。真正还值得新增的 E2E，应该集中在当前尚未被真实浏览器契约覆盖、而且确实只能在浏览器里暴露的问题。

### 是否需要继续补单元测试/契约测试

需要，而且优先级高于新增大多数 E2E。

当前更值得增加的是少量基础设施包与共享抽象的契约测试，而不是继续把更多页面行为推到 Playwright。

## 建议新增的 E2E

### 1. `performance-table` 增加 1 组真正的页面契约 E2E

- 当前状态：只有 `tests/e2e/playground-entry-pages.spec.ts` 的入口 smoke，没有独立行为契约。
- 需要新增的原因：这是唯一一个已注册 domain route、但目前基本只验证“页面能打开”的大型浏览器压力场景。
- 适合固化的契约：
  - 初始可见区能稳定渲染表格内容
  - 选择/分页/排序/批量 host mutation 后，页面不会进入空白或错乱状态
  - 编辑或选择后的用户可见结果在滚动或重新渲染后仍然成立
- 为什么适合 E2E：大数据量渲染、滚动、可见区切换、真实 DOM 与浏览器事件联动，属于单元测试难以完整替代的场景。

### 2. `flow-designer` 增加 1 条“真实连线创建”E2E

- 当前状态：已有 palette 折叠、minimap、JSON 预览、增删节点等 E2E，但缺少真正依赖 pointer gesture 的连线创建契约。
- 需要新增的原因：边连接是 React Flow 类画布中最典型的浏览器手势契约，往往单测能过、浏览器里仍会坏。
- 建议断言：
  - 从 source handle 拖到 target handle 后产生一条新 edge
  - JSON 预览或 inspector 能反映新增 edge
  - 新 edge 在画布中可见且可再次选中
- 为什么适合 E2E：这类 pointer/drag 行为是典型浏览器专属契约。

### 3. `word-editor` 增加 1 条“保存并刷新后仍可恢复”的 E2E

- 当前状态：已有“可输入”“可保存”“可开各类对话框”的 E2E，但保存后的 reload 恢复契约没有直接锁定。
- 需要新增的原因：文档编辑器最容易出现“保存动作成功但刷新后状态不一致”的跨层回归。
- 建议断言：
  - 在编辑器输入可识别文本
  - 点击保存
  - 刷新页面
  - 通过公开 UI 或持久化契约确认内容/保存时间仍可恢复
- 为什么适合 E2E：canvas/editor 输入、持久化、页面重建属于真实浏览器装配链路。

## 暂不建议新增 E2E 的区域

### `component-lab` shared renderers

- 原因：已经有 manifest 驱动的 route 覆盖和分组行为用例。
- 后续策略：优先把现有断言维持在“用户可见行为”层，不再按 renderer 继续横向扩张 spec 数量。

### `debugger`

- 原因：已经有较完整的 automation API 与 explanation contract E2E。
- 后续策略：只有在新增公开 automation/explanation 契约时，再补对应 Playwright；否则优先写包内 focused tests。

### `code-editor`

- 原因：当前 E2E 已覆盖较多浏览器专属交互，且包内也有 integration/unit tests。
- 后续策略：除非新增浏览器专属能力，例如 IME、复杂 completion 弹层、selection/clipboard 边界，否则不建议继续扩张。

### `report-designer`

- 原因：已有页面 surface、cell click、inspector、sheet tab 行为契约。
- 后续策略：更适合继续补 renderer/core 包内契约测试，而不是继续加大量 page-level E2E。

## 更值得新增的单元测试/契约测试

### 1. `packages/theme-tokens`

- 当前状态：未发现源码级测试。
- 建议新增：
  - 导出的 token CSS 文件存在且可解析
  - 关键 CSS 变量名集合稳定存在
  - 主题根选择器/变量命名不发生无意破坏
- 原因：这是样式基础设施契约，适合轻量静态契约测试，不需要 Playwright。

### 2. `packages/tailwind-preset`

- 当前状态：未发现源码级测试。
- 建议新增：
  - preset 导出形状契约
  - 仓库依赖的关键 theme extension/plugin 配置存在
  - 若仓库依赖自定义 alias/semantic token 映射，应对这些映射建立稳定断言
- 原因：这是构建时配置契约，单元测试足够，没必要继续依赖浏览器侧 CSS 探测来兜底。

### 3. `packages/ui`

- 当前状态：只有少量工具和单个组件测试，和其复用范围不匹配。
- 建议新增对象：优先仓库自有抽象，而不是机械性覆盖所有 shadcn 包装。
- 建议优先级：
  - `Field` 及其 label/help/error slot 契约
  - 仓库自定义的 `NativeSelect` / `Combobox` / `ButtonGroup` / 其它被 renderer 广泛依赖的薄封装
  - `data-slot`、disabled、value/onChange 等 repo-level 稳定接口
- 原因：这些是 renderer 与 UI 基座的边界层，适合做最小输入/输出契约测试。

## 不建议继续扩张的测试模式

### 1. 调试型 Playwright spec 不应继续增加

- `debug-collapsible*.spec.ts` 使用了调试输出、React fiber 探针等方式，更适合作为排障材料，不适合作为长期主线契约模板。

### 2. 纯 computed-style 数值断言不应泛化

- `node-title-subtitle-gap.spec.ts`、`tailwind-css-scan.spec.ts`、`flow-designer-ui.spec.ts` 中部分断言有其局部价值，但它们属于“固化隐藏设计要求”或“样式系统回归冻结”。
- 这类测试只应在下列前提下保留或新增：
  - 曾出现过真实线上/开发回归
  - 对应样式数值本身就是产品契约
  - 无法被更高层的行为断言替代

### 3. 不为现有页面再追加大量“控件可见”E2E

- 例如 Word Editor、Code Editor、Report Designer 当前已经有不少“按钮/面板可见”用例。
- 后续若要增补，应优先补“状态变化或结果写回”的契约，而不是继续加同类型可见性断言。

## 优先级建议

1. 先补 `theme-tokens`、`tailwind-preset`、`ui` 的最小契约测试。
2. 为 `performance-table` 新增 1 组真正的页面契约 E2E。
3. 为 `flow-designer` 新增 1 条真实连线创建 E2E。
4. 为 `word-editor` 新增 1 条保存后刷新恢复 E2E。
5. 后续新增 E2E 时，先审查是否能被包内契约测试替代。

## 最终判断

- 本仓库现在不需要“大量补 E2E”。
- 本仓库需要的是“少量新增高价值 E2E + 继续优先补契约测试”。
- 若只能做一件事，优先补基础设施包和共享 UI 边界的单元契约测试。
