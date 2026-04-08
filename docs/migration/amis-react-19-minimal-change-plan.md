# AMIS React 19 最小化迁移计划

> Plan Status: draft
> Last Reviewed: 2026-04-08
> Target Repo: `C:\can\nop\templates\amis`
> Scope: 只产出迁移分析与计划，不在目标仓库执行代码修改

## 目标

在不重构 AMIS 渲染器、编辑器和 MobX 架构的前提下，把当前 `amis` workspace 从 React 18.2 升级到 React 19，并以最小修改达到：

- `npm install` 可完成
- `npm run typecheck` 通过
- `npm run build --workspaces` 通过
- `npm test --workspaces` 通过
- 示例页、embed 模式、editor 基本可用

## 当前基线

- 根仓库仍固定 `react`/`react-dom` `^18.2.0`，`@types/react`/`@types/react-dom` 为 18，`@testing-library/react` 为 13.4.0，`react-test-renderer` 为 18。
- 根 `tsconfig.json` 使用 `"jsx": "react"`，属于 classic JSX transform；React 19 要求 modern JSX transform。
- 入口层已经部分完成 React 18 迁移：`examples/index.jsx`、`examples/embed.tsx`、`packages/amis-editor/index.tsx` 已改用 `createRoot`。
- `peerDependencies` 多数写的是 `react >=16.8.6` / `react-dom >=16.8.6`，语义上已覆盖 React 19，因此消费者 peer 范围不是第一优先级。

## 关键发现

### 已经就绪的部分

- 公共入口并不依赖 `ReactDOM.render`。
- 大部分类组件默认值都写在 class `defaultProps` 上；React 19 仍支持 class `defaultProps`，这不是 blocker。
- 大量 DOM 定位调用已经统一走 `findDomCompat`，说明仓库已经有“兼容层优先”的迁移思路。

### React 19 硬 blocker

- classic JSX transform：`C:\can\nop\templates\amis\tsconfig.json`
- 已移除的 `react-dom` 挂载 API：
- `packages/amis/src/renderers/Custom.tsx`
- `packages/amis-ui/src/components/Alert.tsx`
- `packages/amis-ui/src/components/ContextMenu.tsx`
- `packages/amis-core/src/utils/debug.tsx`
- 已移除的字符串 ref / `this.refs`：`packages/amis/src/renderers/Form/InputImage.tsx`
- 已移除的 `react-dom/test-utils` `act` 导入：`packages/amis/__tests__/renderers/Form/mobileCity.test.tsx`
- 测试依赖版本落后：
- `@testing-library/react@13.4.0` 只声明支持 React 18
- `react-test-renderer@18` 必须至少和 React 主版本对齐

### React 19 高风险点，但不建议一上来全面重构

- `packages/amis-core/src/utils/findDomCompat.ts` 直接依赖 React Fiber 内部结构，并在兜底分支调用 `ReactDom.findDOMNode`。
- 许多组件继续通过 `findDomCompat as findDOMNode` 获取宿主 DOM；这一层如果在 React 19 下仍然稳定，就可以避免大面积改造。
- `mobx-react@6.3.1` 当前 peer 只覆盖旧 React 版本，且与仓库现有 `mobx@4.5.0` 绑定很深。若它在 React 19 下安装或运行不稳定，迁移就不再是“最小改动”问题，而会升级为 React + MobX 联动升级。

## 最小化修改原则

- 不做 class component 到 function component 重写。
- 不做 React Router、Vite、Rollup 的连带升级，除非验证阶段证明它们是 blocker。
- 不先清理全部 `findDOMNode` 风格调用，只先修 React 19 明确移除的 API。
- 优先新增一个很小的 `createRoot` / `root.unmount()` 兼容 helper，替换散落的隐式挂载逻辑。
- 不额外引入 `StrictMode`；先保持当前运行模式，避免旧生命周期噪声放大。

## 分阶段计划

### Phase 0: 18.3 预演

- 先把 `react`、`react-dom` 从 `18.2` 升到 `18.3`，不改业务代码。
- 运行 `npm install`、`npm run typecheck`、`npm run build --workspaces`、`npm test --workspaces`。
- 记录 React 18.3 给出的 deprecation warning，作为 React 19 清单。
- 这一步只用于缩小不确定性，不追求长期停留在 18.3。

### Phase 1: 依赖与编译基线

- 升级根仓库和相关 package 的以下依赖到 React 19 对齐版本：
- `react`
- `react-dom`
- `@types/react`
- `@types/react-dom`
- `react-test-renderer`
- `@types/react-test-renderer`
- `@testing-library/react`
- 把根 `tsconfig.json` 的 `jsx` 从 `react` 切到 `react-jsx`。
- 只在 declaration 配置实际受影响时同步调整 `packages/amis/tsconfig-for-declaration.json`，其他 declaration-only 配置不是首批 blocker。
- 保持 `peerDependencies` 原样，除非发布验证时发现 npm 解析或文档说明需要更精确的范围。

### Phase 1 Gate: MobX 兼容性判定

- 用 React 19 重新安装依赖，先确认 `mobx-react@6.3.1` 是否导致安装失败或关键运行异常。
- 若只存在 peer warning，但示例、测试、editor 能跑，则继续最小化路线。
- 若安装或运行失败，不要直接在 React 19 变更中顺手升级 MobX 体系；应单独立项评估 `mobx@4 -> 6`、`mobx-react@6 -> 9`、`mobx-state-tree` 连动升级。到这一步就意味着“最小化修改”前提失效。

### Phase 2: 移除 React 19 明确删除的 API

- 把所有仍在使用的 `ReactDOM.render` / `unmountComponentAtNode` 改为 `createRoot` / `root.unmount()`。
- 优先引入一个小型 root registry/helper，避免在 `Alert`、`ContextMenu`、`debug`、`Custom` 中各写一套重复逻辑。
- 具体改动点：
- `packages/amis/src/renderers/Custom.tsx`
- `packages/amis-ui/src/components/Alert.tsx`
- `packages/amis-ui/src/components/ContextMenu.tsx`
- `packages/amis-core/src/utils/debug.tsx`
- 清理 `packages/amis-editor-core/src/component/factory.tsx` 中未使用的旧 `react-dom` 导入，避免误导后续排查。
- 把 `packages/amis/__tests__/renderers/Form/mobileCity.test.tsx` 的 `act` 导入改到 `react`。
- 把 `packages/amis/src/renderers/Form/InputImage.tsx` 中的 `this.refs.dropzone` 改为现有 `createRef` 字段 `this.dropzone.current`。

### Phase 3: 保留 `findDomCompat`，只做点状补强

- 第一轮不要尝试替换全部 `findDOMNode` 风格调用。
- 先修改 `packages/amis-core/src/utils/findDomCompat.ts`：
- 删除对 `ReactDom.findDOMNode` 的运行时依赖兜底。
- 只保留 Fiber 路径，并在失败时给出更可定位的错误。
- 在 React 19 下执行高风险交互 smoke test，优先覆盖以下类型：
- Overlay / PopOver / Tooltip / Dialog / Drawer
- Table / ColumnToggler / HeadCell filter/search dropdown
- Select / NestedSelect / TreeSelect / InputTag
- QuickEdit / ContextMenu / Alert / Confirm
- Editor 面板和 region wrapper
- 若失败点集中在少数组件，再把这些组件改成显式 DOM ref。
- 若失败呈系统性扩散，不继续硬推“最小改动”，而是转入“显式 ref 替代 `findDomCompat`”专题重构。

### Phase 4: 测试与回归收口

- 保留现有 `react-test-renderer` 测试，不在首轮迁移中全面改写到 Testing Library。
- 只做版本对齐和最少量 API 修正，接受 React 19 对 `react-test-renderer` 的 deprecation warning。
- 对以下场景做人工 smoke：
- `examples/index.jsx` 示例页启动
- `examples/embed.tsx` 的 `updateProps` / `updateSchema` / `unmount`
- `Custom` renderer 子树挂载、更新、卸载
- `Alert` / `confirm` / `ContextMenu`
- `Dialog` / `Drawer` / `PopOver`
- `InputImage` 选择文件
- `packages/amis-editor/index.tsx` editor 启动
- 通过后再决定是否处理控制台 warning 和非 blocker 的测试去旧化。

## 建议的实际改动顺序

1. React 18.3 预演。
2. 升级 React 19 依赖与 types。
3. 切 `react-jsx`。
4. 修 `ReactDOM.render` / `unmountComponentAtNode`。
5. 修 `this.refs.dropzone`。
6. 修 `react-dom/test-utils` `act` 导入。
7. 验证 `findDomCompat`。
8. 只对失败热点做显式 ref 补丁。
9. 完整回归与文档记录。

## 非目标

- 不升级 React Router 5。
- 不把 editor / renderer 全量函数化。
- 不在本次迁移里升级 MobX 体系，除非 Phase 1 Gate 证明这是不可回避的 blocker。
- 不在首轮迁移里重写所有 snapshot tests。
- 不顺手清理全部 `UNSAFE_componentWillReceiveProps` / `UNSAFE_componentWillMount`。

## 风险清单

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| `mobx-react@6.3.1` 与 React 19 不兼容 | 安装或运行直接失败 | 先做 gate；失败则拆出 MobX 升级项目 |
| `findDomCompat` 依赖 React internals | 大量弹层/选择器/编辑器 DOM 定位异常 | 先验证 compat helper，再对热点组件补显式 ref |
| `react-test-renderer` 已废弃 | 测试有 warning | 首轮只对齐版本，不做全量改写 |
| classic JSX transform 未切换 | React 19 启动即警告或行为不一致 | 在 Phase 1 一次性切到 `react-jsx` |
| 隐式挂载逻辑分散 | 容易漏掉一个旧 API 点 | 用共享 root helper 收口 |

## Go / No-Go 标准

### Go

- React 19 下可以完成安装。
- `mobx-react` 不导致关键路径崩溃。
- 旧 `react-dom` 挂载 API 已清零。
- 主要示例、embed、editor smoke 通过。
- build / typecheck / test 可重复通过。

### No-Go

- `mobx-react` 迫使同时升级 MobX 4/5/6 体系。
- `findDomCompat` 在 React 19 下出现系统性失效，需要大面积显式 ref 改造。
- 关键测试工具链因 React 19 出现大范围重写需求。

## 结论

按当前仓库状态，AMIS 升 React 19 可以先按“最小化修改”路线推进，但前提是两个 gate 成立：

- `mobx-react@6.3.1` 在当前 MobX 基线上仍能安装并基本运行；
- `findDomCompat` 在 React 19 下大体可用。

如果这两个 gate 任一失败，这次工作就不再是小升级，而是 React / MobX / DOM ref 兼容层的联合改造，需要另起更大计划。
