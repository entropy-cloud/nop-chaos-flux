# AMIS React 19 独立迁移计划

> Plan Status: draft
> Last Reviewed: 2026-04-09
> Target Repo: `C:\can\nop\templates\amis`
> Scope: 只产出迁移分析与计划，不在目标仓库执行代码修改

## 目标

在 `templates/amis` 仓库内，独立完成 AMIS 到 React 19 的迁移计划。

这里的“独立”有两个含义：

- 迁移问题在 `templates/amis` 内部闭环处理，不混入 `nop-chaos-next-master` 或 `nop-chaos-flux` 的集成方案。
- React 19 迁移完成后，在这个仓库内单独做安装、类型检查、构建、测试和 smoke 验证。

本计划优先级是：

- 先解决 AMIS runtime 的 React 19 兼容。
- editor 相关包不是本轮必须完成项，但必须在计划中明确边界和 gate，避免和 runtime 迁移混为一谈。

## 目标结果

### 第一目标：Runtime 可用

在不重写 AMIS 渲染器架构的前提下，让以下运行时闭包在 React 19 下成立：

- `amis-formula`
- `amis-core`
- `amis-ui`
- `amis`

至少达到：

- `npm install` 可完成
- runtime 相关 `typecheck` 可完成
- runtime 相关 `build` 可完成
- runtime 相关 `test` 可完成或只有可接受的非 blocker 警告
- 示例页与核心运行时交互 smoke 可用

### 第二目标：整仓边界清晰

- `amis-editor-core`
- `amis-editor`
- `amis-theme-editor-helper`
- `office-viewer`

这些包不和 runtime 主线绑死。

具体策略是：

- editor 包不作为 runtime React 19 迁移完成的前置条件。
- 是否继续处理 editor，单独作为后续项目或附加 gate。
- `office-viewer` 只在确认 runtime 主线真的被它阻塞时再纳入首轮；否则不进入主计划主线。

## 当前真实基线

以下基线必须以 `git show HEAD` 为准，而不是以当前工作区未提交实验改动为准。

### 根仓基线

- 根 `package.json` 仍固定：
  - `react@^18.2.0`
  - `react-dom@^18.2.0`
  - `@types/react@^18.0.24`
  - `@types/react-dom@^18.0.8`
- 根 `tsconfig.json` 仍是：
  - `jsx: "react"`
- 也就是说，当前正式基线仍是 React 18 + classic JSX transform。

### Runtime 包基线

- `packages/amis/package.json` 仍是 React 18、`@testing-library/react@13.4.0`、`react-test-renderer@18`、`mobx-react@6.3.1`。
- `packages/amis-core/package.json` 仍是 React 18、`mobx-react@6.3.1`。
- `packages/amis-ui/package.json` 仍是 React 18、`mobx-react@6.3.1`。

### 当前工作树状态

`templates/amis` 当前工作树里已经有一批未提交的 React 19 试验改动，包括：

- React 版本升级
- `mobx-react` 升到 `9.2.1`
- `tsconfig.json` 切到 `react-jsx`
- `Custom` / `Alert` / `ContextMenu` / `debug` 的 `createRoot` 兼容尝试
- `InputImage` 去掉字符串 ref
- `mobileCity.test.tsx` 中 `act` 导入迁移

这些改动只能视为“已探索到的 patch 草稿”，不能视为迁移已完成。

## 关键发现

## 1. React 19 迁移不能只改 React 版本号

当前正式基线里，至少以下内容需要一起处理：

- `react`
- `react-dom`
- `@types/react`
- `@types/react-dom`
- `react-test-renderer`
- `@types/react-test-renderer`
- `@testing-library/react`
- `tsconfig.json` 的 JSX transform

其中 `@testing-library/react@13.4.0` 和 `react-test-renderer@18` 都不适合作为 React 19 正式基线继续保留原样。

## 2. `mobx-react@6.3.1` 不是“可能有风险”，而是正式 blocker

核对 npm registry 后：

- `mobx-react@6.3.1` 的 peerDependencies 只覆盖 `react: ^16.8.0 || 16.9.0-alpha.0`
- 它并不覆盖 React 18，更不覆盖 React 19

因此在 React 19 路线上：

- `mobx-react@6.3.1` 不能再被当作“先试试看也许能跑”的组件
- 它必须被当成明确迁移步骤处理

但这里还有第二层风险：

- `mobx-react@9.2.1` 的 peerDependencies 要求 `mobx:^6.9.0`
- 而 AMIS 当前运行时包依赖的是 `mobx:^4.5.0`

这意味着：

- `mobx-react` 升级并不是一个孤立变更
- 它很可能连带 `mobx` 主版本升级
- 这已经超出“单纯 React API 去旧化”范围，是 React + MobX 联动迁移 gate

所以本计划必须把 MobX 体系兼容性作为单独 gate，而不是一句“顺手升级”。

## 3. React 19 明确删除的 API 仍是 runtime 主 blocker

在 runtime 范围内，当前最明确的问题有：

- `packages/amis/src/renderers/Custom.tsx`
  - 仍保留 `ReactDOM.render` 语义路径
- `packages/amis-ui/src/components/Alert.tsx`
  - 隐式 body 挂载逻辑需要 `createRoot`
- `packages/amis-ui/src/components/ContextMenu.tsx`
  - 隐式 body 挂载逻辑需要 `createRoot`
- `packages/amis-core/src/utils/debug.tsx`
  - 调试面板挂载逻辑需要 `createRoot`
- `packages/amis/src/renderers/Form/InputImage.tsx`
  - 使用字符串 ref / `this.refs`
- `packages/amis/__tests__/renderers/Form/mobileCity.test.tsx`
  - 仍从 `react-dom/test-utils` 取 `act`

当前未提交实验改动已经覆盖了这些点的大部分方向，但还没有经过完整回归。

## 4. `findDomCompat` 是 React 19 最大系统性风险

`packages/amis-core/src/utils/findDomCompat.ts` 当前问题有两层：

- 它依赖 React Fiber 内部结构
- 在找不到 fiber 时还会回退到 `ReactDom.findDOMNode`

此外，`amis` 和 `amis-ui` 中仍存在大量 `findDomCompat as findDOMNode` 调用，集中在：

- Dialog / Drawer / PopOver
- QuickEdit
- Table / ColumnToggler / HeadCell 筛选与搜索下拉
- Select / NestedSelect / TreeSelect / InputTag / Combo
- Tooltip / Tabs / DateRangePicker / MonthRangePicker / ColorPicker 等

所以 React 19 runtime 迁移是否能保持“最小改动”，核心就看两点：

- 去掉 `findDOMNode` fallback 后，fiber 路径是否仍足够稳定
- 即使不稳定，失败是否只集中在少数热点组件

如果失败是系统性的，这个项目就会从“最小迁移”升级成“显式 DOM ref 专项重构”。

## 5. editor 相关问题必须和 runtime 主线分开

当前搜索结果表明：

- editor 体系仍大量使用 `findDOMNode`
- `packages/amis-editor-core/src/component/factory.tsx` 还直接使用 `react-dom` 的旧挂载 API

这再次说明：

- editor 的 React 19 兼容是独立问题
- 不应该和 runtime 主线共用完成标准

## 最小化迁移原则

- 不把 class component 全量改写成 function component。
- 不一次性清理所有 `findDomCompat` 调用。
- 不把 editor 迁移混入 runtime 主线。
- 优先用一个共享 `reactRoot` helper 收口所有隐式挂载点。
- 先修 React 19 明确移除的 API，再观察运行时热点是否需要显式 ref 补丁。
- 不因为测试工具老旧，就在首轮把所有 snapshot / renderer 测试重写。

## 分阶段计划

### Phase 0: 清理认知和工作树

- 明确所有分析和决策都以 `HEAD` 为基线，不以当前未提交实验改动为基线。
- 保留当前未提交实验改动作为参考 diff，但不要直接假设它们是正确答案。
- 先整理出一个 runtime-only 待改文件清单。

### Phase 1: 依赖与编译基线升级

- 根仓升级：
  - `react`
  - `react-dom`
  - `@types/react`
  - `@types/react-dom`
- runtime 包升级：
  - `packages/amis`
  - `packages/amis-core`
  - `packages/amis-ui`
- runtime 测试依赖升级：
  - `@testing-library/react`
  - `react-test-renderer`
  - `@types/react-test-renderer`
- 把根 `tsconfig.json` 的 `jsx` 从 `react` 切到 `react-jsx`。
- 同步调整受 declaration 影响的配置：
  - `packages/amis/tsconfig-for-declaration.json`
  - `packages/amis-formula/tsconfig-for-declaration.json`
  - `packages/office-viewer/tsconfig-for-declaration.json`

### Phase 1 Gate: MobX 体系兼容性判定

必须先独立判定：

- React 19 下是否还能保留 `mobx@4.5.0`
- `mobx-react` 该升到哪个版本
- runtime 包是否被迫同时升级到 `mobx@6`

建议 gate 规则：

- 若 `mobx@4 + mobx-react@6.3.1` 在安装阶段就因 peer/运行问题失效，则不能继续假装这是非 blocker。
- 若 runtime 最终必须切到 `mobx@6 + mobx-react@9`，则把它明确定义为本次 React 19 迁移的正式组成部分。
- 若 editor 对新的 MobX 体系不兼容，不要因此阻塞 runtime 主线；应把 editor 作为单独后续项目。

### Phase 2: 修 React 19 明确删除的 API

- 引入一个共享 `reactRoot` helper：
  - `createRoot`
  - root registry
  - `root.render`
  - `root.unmount`
- 用它替换所有 runtime 范围内的隐式挂载点：
  - `packages/amis/src/renderers/Custom.tsx`
  - `packages/amis-ui/src/components/Alert.tsx`
  - `packages/amis-ui/src/components/ContextMenu.tsx`
  - `packages/amis-core/src/utils/debug.tsx`
- 在 `amis-core/src/utils/index.ts` 暴露该 helper。
- 把 `packages/amis/src/renderers/Form/InputImage.tsx` 中的字符串 ref 改成现有 `createRef` 字段。
- 把 `packages/amis/__tests__/renderers/Form/mobileCity.test.tsx` 的 `act` 导入改到 `react`。

### Phase 3: 保守处理 `findDomCompat`

首轮不重写所有组件。

只做以下动作：

- 修改 `packages/amis-core/src/utils/findDomCompat.ts`
- 删除 `ReactDom.findDOMNode` 的运行时兜底
- 保留 fiber 路径
- 在失败时给出更可定位的错误

然后只做 runtime 相关高风险 smoke：

- Overlay / PopOver / Tooltip / Dialog / Drawer
- Table / ColumnToggler / HeadCell filter/search dropdown
- Select / NestedSelect / TreeSelect / InputTag / Combo
- QuickEdit / ContextMenu / Alert / Confirm
- Custom renderer 子树挂载、更新、卸载

结果分流：

- 若失败点集中在少数组件，对这些组件补显式 DOM ref。
- 若失败大面积扩散，则另起“findDomCompat 清退”专项，不再称为最小迁移。

### Phase 4: Runtime-only 验证与收口

不要继续只用根级 `npm run build --workspaces` / `npm test --workspaces` 作为首轮完成标准，因为这会把 editor 一起拖进来。

首轮应拆成 runtime-only 验证序列：

- `npm install`
- `npm run typecheck`
- runtime 包单独 build：
  - 在 `packages/amis-formula` 下执行 `npm run build`
  - 在 `packages/amis-core` 下执行 `npm run build`
  - 在 `packages/amis-ui` 下执行 `npm run build`
  - 在 `packages/amis` 下执行 `npm run build`
- runtime 包单独 test：
  - 在 `packages/amis-formula` 下执行 `npm test`
  - 在 `packages/amis-core` 下执行 `npm test`
  - 在 `packages/amis-ui` 下执行 `npm test`
  - 在 `packages/amis` 下执行 `npm test`

人工 smoke 至少覆盖：

- 示例页启动
- `embed` 模式挂载、更新、卸载
- `Custom` renderer
- `Alert` / `confirm` / `ContextMenu`
- `Dialog` / `Drawer` / `PopOver`
- `InputImage` 选择文件
- 常用下拉和日期类控件

### Phase 5: editor 与附属包单独决策

在 runtime 主线完成后，再决定是否继续处理：

- `amis-editor-core`
- `amis-editor`
- `amis-theme-editor-helper`
- `office-viewer`

这一步的结论应该单独记录，不回写到 runtime 主线完成标准里。

## 建议的实际改动顺序

1. 以 `HEAD` 为基线重新整理 patch，不直接继承当前工作树。
2. 升级 React / types / 测试依赖。
3. 切 `react-jsx`。
4. 处理 MobX 体系 gate。
5. 引入 `reactRoot` helper。
6. 替换 `Custom` / `Alert` / `ContextMenu` / `debug` 挂载点。
7. 修 `InputImage` 字符串 ref。
8. 修 `act` 导入。
9. 去掉 `findDomCompat` 的 `findDOMNode` fallback。
10. 对 runtime 热点做 smoke。
11. 只对失败热点补显式 ref。
12. 以 runtime-only 验证序列收口。
13. 再单独决定 editor / office-viewer 后续计划。

## Runtime 主线改动清单

### 依赖与配置

- `package.json`
- `tsconfig.json`
- `packages/amis/package.json`
- `packages/amis-core/package.json`
- `packages/amis-ui/package.json`
- `packages/amis/tsconfig-for-declaration.json`
- `packages/amis-formula/tsconfig-for-declaration.json`
- `packages/office-viewer/tsconfig-for-declaration.json`

### runtime 代码

- `packages/amis-core/src/utils/reactRoot.tsx` 新增
- `packages/amis-core/src/utils/index.ts`
- `packages/amis-core/src/utils/debug.tsx`
- `packages/amis-core/src/utils/findDomCompat.ts`
- `packages/amis/src/renderers/Custom.tsx`
- `packages/amis/src/renderers/Form/InputImage.tsx`
- `packages/amis-ui/src/components/Alert.tsx`
- `packages/amis-ui/src/components/ContextMenu.tsx`
- `packages/amis/__tests__/renderers/Form/mobileCity.test.tsx`

### 可能追加的热点补丁

- `packages/amis/src/renderers/Dialog.tsx`
- `packages/amis/src/renderers/Drawer.tsx`
- `packages/amis/src/renderers/QuickEdit.tsx`
- `packages/amis/src/renderers/Table/*`
- `packages/amis/src/renderers/Form/NestedSelect.tsx`
- `packages/amis/src/renderers/Form/TreeSelect.tsx`
- `packages/amis/src/renderers/Form/InputTag.tsx`
- `packages/amis-ui/src/components/Select.tsx`
- `packages/amis-ui/src/components/Tabs.tsx`
- `packages/amis-ui/src/components/DateRangePicker.tsx`

## 非目标

- 不要求本轮同时完成 editor React 19 兼容。
- 不要求本轮完成 `office-viewer` React 19 适配，除非 runtime 主线明确被它阻塞。
- 不要求本轮清零全部 `findDomCompat` 调用。
- 不要求本轮重写所有 `react-test-renderer` 测试。
- 不要求把 MobX 体系升级做成独立架构重构，只要求它为 React 19 路线服务。

## 风险清单

| 风险                                            | 影响                               | 应对                                              |
| ----------------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| `mobx-react@6.3.1` 与 React 19 正式不兼容       | 安装或运行直接不成立               | 把 MobX 体系兼容性列为 Phase 1 Gate               |
| `mobx-react@9` 反向要求 `mobx@6`                | 迁移范围扩大到 MobX 主版本升级     | 明确 React + MobX 联动 gate，不隐含处理           |
| `findDomCompat` 依赖 React internals            | 大量弹层/选择器/定位异常           | 先删 fallback，再做热点 smoke，再决定是否专项重构 |
| `react-test-renderer` 已废弃                    | 测试产生 warning 或部分脆弱        | 首轮只对齐版本并局部修 API，不全量改写            |
| editor 体系继续大量依赖旧 API                   | 根级 workspaces 验证被 editor 拖死 | 首轮完成标准改成 runtime-only 验证序列            |
| `office-viewer` 被 runtime 某些 schema 间接拉起 | 构建或 smoke 出现附加问题          | 只有在 runtime 主线被明确阻塞时再纳入首轮         |

## Go / No-Go 标准

### Go

- `templates/amis` 已切到 React 19 基线。
- runtime 包安装、typecheck、build 可以独立完成。
- React 19 明确删除的挂载 API 已在 runtime 主线上清零。
- `findDomCompat` 没有再回退到 `ReactDom.findDOMNode`。
- 关键 runtime smoke 通过。

### No-Go

- MobX 体系无法形成可运行的 React 19 组合。
- `findDomCompat` 在 React 19 下系统性失效，导致 runtime 组件大面积崩溃。
- runtime-only 范围都无法稳定通过，必须把 editor 一起拖进来才能前进。

## 结论

`templates/amis` 的 React 19 升级应被定义为一个独立项目，但内部也要继续分层：

- runtime React 19 迁移是主线
- editor / office-viewer 是后续独立问题

按当前真实基线看，这个迁移不是单纯的 API 去旧化，至少包含三条硬问题：

- React 19 依赖与编译基线升级
- 旧挂载 API 和字符串 ref 清理
- MobX 体系兼容性 gate

如果 MobX gate 和 `findDomCompat` gate 都能收敛在 runtime 范围内，这个项目仍可按“最小改动”推进。

如果任一 gate 失败，就需要把它升级为更大的 React + MobX + DOM ref 兼容改造项目。
