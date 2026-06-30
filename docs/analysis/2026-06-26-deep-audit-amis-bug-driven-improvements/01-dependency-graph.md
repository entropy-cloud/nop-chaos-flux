# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] flux-code-editor 运行时值导入 formFieldChromeRules 仅声明于 devDependencies

- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx:6,54`; `packages/flux-code-editor/package.json` (devDeps); `packages/flux-renderers-form/src/field-utils/field-reading.tsx:21`
- **证据片段**:
  ```ts
  // code-editor-renderer.tsx:6  —— 值导入（无 type）
  import { formFieldChromeRules } from '@nop-chaos/flux-renderers-form';
  // :54  —— 运行期展开到导出的 renderer 定义
  export const codeEditorFieldRules: SchemaFieldRule[] = [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    ...formFieldChromeRules,
  ```
  `package.json` 中 `@nop-chaos/flux-renderers-form` 仅在 devDependencies。
- **严重程度**: P3
- **现状**: `flux-code-editor` 在运行时源码值导入 `flux-renderers-form` 的 `formFieldChromeRules`（const 数组），展开进注册期即执行的 renderer 定义；但该 dep 仅声明于 devDependencies。全仓唯一处"运行时值导入却置于 devDeps"的情形（其余 devDeps 命中均在 `*-test-support.*`）。
- **风险**: manifest 语义违约；`private:true` + workspace 解析掩盖当前无故障，但独立发布/host 安装时会 `Cannot resolve module`；`check-workspace-manifest-deps.mjs` 将 deps/devDeps/peer 求并集，整类"运行时值导入放 devDeps"缺陷无自动化兜底。
- **建议**: 将该 dep 提升到 dependencies；可选增强 check 门禁对源码值导入要求落在 deps/peer。
- **误报排除**: 非 calibration pattern 2（公开 renderer 依赖 core 运行时）——本发现是"声明桶位（deps vs devDeps）错误"，pattern 2 不覆盖。
- **复核状态**: 维度复核通过（独立复核保留 P3）。

## 维度复核结论

- [维度01-01]: 保留 (P3)。复核 agent 读取 `code-editor-renderer.tsx:6,54` 确认值导入与运行期展开真实存在，`check:workspace-manifest-deps` PASS 因并集掩盖，符合报告。

基线可疑点复核（非缺陷）：flux-renderers-mobile 缺 flux-react（源码纯展示，不导入 flux-react，合规）；nop-debugger 缺 flux-react（仅测试用，合规）；CSS exports 对象 vs 字符串形式（命中 pattern 10 downgrade，门禁通过，非缺陷）。

## 最终保留项

| 编号  | 严重程度 | 文件                                                 | 摘要                                           |
| ----- | -------- | ---------------------------------------------------- | ---------------------------------------------- |
| 01-01 | P3       | `flux-code-editor/src/code-editor-renderer.tsx:6,54` | 运行时值导入 formFieldChromeRules 仅在 devDeps |

依赖图结论：干净有向无环 DAG，分层清晰，规则 a–i 全部满足，无 P0–P2。
