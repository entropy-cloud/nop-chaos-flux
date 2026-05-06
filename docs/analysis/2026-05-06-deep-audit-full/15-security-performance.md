# 维度 15：安全与性能红线

## 第 1 轮（初审）

## 安全部分

**R2 规则（无动态代码执行）**: **通过** — 源码中零 eval/new Function。
**R3 规则（fail-closed 行为）**: **通过** — 运行时无权限判断逻辑。
**R5 规则（安全假设文档化）**: **通过** — security-design-requirements.md 覆盖完整。

---

## 性能部分

### [维度15] useScopeSelector 使用全量 store 广播而非 per-path 订阅

- **文件**: `packages/flux-react/src/hooks.ts:96-124`
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P7
- **现状**: `useScopeSelector` 通过全量 store 广播 + selector 过滤。scope 数据粒度远小于 form field states。
- **风险**: 大规模行级场景（数百行 x 多字段）可能成为瓶颈。
- **建议**: 已知设计取舍。若未来出现性能问题，可为 ScopeStore 增加 subscribeToPaths 支持。

### [维度15] Select 组件渲染大量选项时无虚拟化

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:175-180`
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P7
- **现状**: SelectRenderer 直接 `options?.map()` 渲染所有选项，无虚拟化。
- **风险**: >200 选项时 DOM 开销显著。
- **建议**: 使用 Combobox 替代或添加虚拟化支持。

### [维度15] CheckboxGroupRenderer 中 options.map 内嵌 selectedValues.some

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:350-353`
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P2
- **现状**: O(options * selectedValues) 复杂度。
- **风险**: 典型场景规模小，无实际影响。
- **建议**: 若未来出现大列表需求，可预转 Set。

### [维度15] report-designer-core metadata.ts getMetaContainer 原位修改参数

- **文件**: `packages/report-designer-core/src/runtime/metadata.ts:44-63`
- **严重程度**: P3
- **类别**: 性能/安全
- **规则编号**: P3
- **现状**: 使用 `??=` 对传入参数原位修改。但当前未被任何调用方使用。
- **风险**: 若将来被使用，违反不可变更新原则。
- **建议**: 未接入代码，标记为观察项。

### [维度15] form.tsx initAction 的 .catch(() => undefined) 吞掉错误

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:271-273`
- **严重程度**: P2
- **类别**: 性能（P6 可观察性）
- **规则编号**: P6
- **现状**: initAction 的 Promise 链使用 `.catch(() => undefined)` 吞掉所有错误，不记录日志。
- **风险**: initAction 失败在用户未配置 onError 时完全不可观察。
- **建议**: 增加 `env.monitor?.onError` 上报。

### [维度15] debugger panel 大量静默 catch 块缺少降级诊断

- **文件**: `packages/nop-debugger/src/controller-helpers.ts:204,251,264,279,292,305,320,341,354`
- **严重程度**: P3
- **类别**: 性能（P6 可观察性）
- **规则编号**: P6
- **现状**: 9 处 `catch {}` 块，全部是 debugger 持久化操作防御性 catch。
- **风险**: debugger 状态保存失败时完全静默。
- **建议**: 开发模式下 console.warn 输出降级提示。

---

## 已确认合规的区域

| 检查项 | 结果 |
|--------|------|
| R2: eval/new Function | 通过 |
| R3: fail-closed | 通过 |
| R5: 安全假设文档化 | 通过 |
| P1: JSON.stringify 热路径 | 通过 |
| P2: O(n^2) 嵌套循环 | 通过 |
| P3: 不可变更新 | 通过 |
| P5: AbortController | 通过 |
| P6: 关键路径可观察性 | 基本通过 |
| P7: per-path 订阅 | 通过 |
| React Compiler 兼容性 | 通过 |
| startTransition 使用 | 通过 |
| 表格虚拟化 | 通过 |

---

## 深挖第 2 轮追加

### [维度15] sourceCascadeDepth/globalCascadeDepth 计数器越限后变负，削弱级联保护

- **文件**: `packages/flux-runtime/src/async-data/source-registry.ts:198-210` 和 `packages/flux-runtime/src/async-data/reaction-runtime.ts:129-272`
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P5/P6
- **现状**: 超限时 counter 重置为 0 + return 跳过 finally，导致外层 finally 的 counter -= 1 使计数器变负。级联保护失效直到计数器自行恢复。
- **建议**: 不在超限时重置为 0，直接 return 让 finally 自然归零。

### [维度15] report-designer-renderers page-renderer.tsx 刷新时静默吞异常

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:97`
- **严重程度**: P2
- **类别**: P6 可观察性
- **现状**: `void core.refreshFieldSources().catch(() => undefined)` 完全吞掉错误。页面加载失败时用户无任何反馈。
- **建议**: 通过 monitor.onError 上报。
