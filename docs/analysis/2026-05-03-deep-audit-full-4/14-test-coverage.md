# 维度14 测试覆盖与质量

- 初审发现数: 7
- 复核结果: 保留 4 / 降级 3 / 驳回 0

### [维度14] `@nop-chaos/ui` 的重型公共组件缺少回归测试

- **文件**: `packages/ui/src/index.ts`, `packages/ui/src/components/ui/combobox.tsx`, `packages/ui/src/components/ui/sidebar.tsx`, `packages/ui/src/components/ui/chart.tsx`
- **证据片段**:

```ts
export * from './components/ui/combobox';
export * from './components/ui/sidebar';
export * from './components/ui/chart';
```

- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: UI 包导出面很大，但交互性最强的公共组件没有相应测试守护。
- **建议**: 先补 `Combobox`、`Sidebar`、`Chart` 的交互/bridge 回归。
- **为什么值得现在做**: 共享 UI 缺测试会向多个 renderer/designer 包扩散。
- **误报排除**: 不是按“组件数量多”机械上报；只点名复杂、状态化、公共的组件。
- **历史模式对应**: thin coverage on shared UI substrate。
- **参考文档**: `AGENTS.md` Testing 章节
- **复核状态**: `维度复核通过`

### [维度14] `@nop-chaos/flux-i18n` 测试覆盖过于单薄

- **文件**: `packages/flux-i18n/src/i18n.test.ts:1-16`, `packages/flux-i18n/src/i18n.ts`, `packages/flux-i18n/src/index.ts`
- **证据片段**:

```ts
it('translates known key', () => { ... })
```

- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 当前只有单条 smoke test，未覆盖 reset/init/changeLanguage/global formatter 等共享行为。
- **建议**: 补 hook/export/lifecycle 回归，尤其是全局 formatter side effect。
- **为什么值得现在做**: 这是共享单例基础设施，缺测试会影响全仓语言与消息格式化。
- **误报排除**: 不是要求 statement coverage 拉满；是共享基础行为几乎无防护。
- **历史模式对应**: singleton infra with smoke-only tests。
- **参考文档**: `AGENTS.md` Testing 章节
- **复核状态**: `维度复核通过`

### [维度14] 多个测试直接跨包导入 `src/*`

- **文件**: `packages/flow-designer-renderers/src/index.xyflow.test.tsx:3-8`, `packages/flow-designer-renderers/src/designer-command-adapter.test.ts:2-12`, `packages/flux-renderers-form-advanced/src/__tests__/form-runtime-fields.test.tsx:9`
- **证据片段**:

```ts
import ... from '../../flow-designer-core/src/index';
import ... from '../../../flux-renderers-form/src/test-support';
```

- **严重程度**: P1
- **类别**: 跨域测试 / boundary bypass
- **现状**: 测试直接依赖其他包源码路径，绕过真实 package export surface。
- **建议**: 共享测试能力下沉为正式 `test-support` 导出；跨包集成移到专门 integration 层。
- **为什么值得现在做**: 这会掩盖真实包边界与发布面问题。
- **误报排除**: 不是 workspace alias 正常用法；这里是真实 `src/*` 直连。
- **历史模式对应**: test bypasses package boundary。
- **参考文档**: `AGENTS.md`
- **复核状态**: `维度复核通过`

### [维度14] 多个超大测试文件降低维护性

- **文件**: `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts:1-698`, `packages/flux-compiler/src/schema-compiler-diagnostics.test.ts:1-697`, `packages/flow-designer-renderers/src/designer-page.tree.test.tsx:1-691`, `packages/flux-action-core/src/__tests__/action-dispatcher.test.ts:1-682`
- **证据片段**:

```ts
// 700 行左右的大型测试文件
```

- **严重程度**: P2
- **类别**: setup/场景堆叠
- **现状**: 多行为域测试堆在单文件内，定位失败信号成本高。
- **建议**: 按行为域拆分，抽共享 fixture/helper。
- **为什么值得现在做**: 已接近仓库对大文件的警戒阈值。
- **误报排除**: 不是因测试长就报；这些文件确实承载多个正交主题。
- **历史模式对应**: mega-test accretion。
- **参考文档**: `AGENTS.md`
- **复核状态**: `维度复核通过`

## 已降级

- `flux-renderers-form` 共享 mutable harness: 真实存在顺序依赖窗口，但高风险定性证据不足，降为 P2。
- `flow-designer-renderers` 默认 `node`、大量 UI 测试文件头切 `jsdom`: 自洽但维护成本偏高，降为 P3。
- 全仓 `--passWithNoTests`: 属于治理风险而非当前直接缺口，降为 P3。

## 复核备注

- 维度复核额外指出多个关键包缺 coverage gate，这比环境切换和 `--passWithNoTests` 更值得后续补齐，但未纳入本轮初审统计条目。
