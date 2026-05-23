# 深度审核汇总报告

## 审核范围

- **执行的维度**: 全部 18 个维度（01-18）
- **覆盖的包**: 全部 workspace 包（flux-core, flux-formula, flux-compiler, flux-action-core, flux-runtime, flux-react, flux-renderers-basic, flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flux-i18n, ui, tailwind-preset, theme-tokens, flow-designer-core, flow-designer-renderers, spreadsheet-core, spreadsheet-renderers, report-designer-core, report-designer-renderers, word-editor-core, word-editor-renderers, flux-code-editor, nop-debugger, flux-playground）
- **审核日期**: 2026-04-27 ~ 2026-04-28
- **执行方式**: 每个维度一个初审子 agent + 一个维度复核子 agent + 2 项 P1 子项逐条复核，共 38 个子 agent

## 复核统计

| 统计项             | 数量            |
| ------------------ | --------------- |
| 初审发现总数       | ~55             |
| 已独立复核条目数   | ~55             |
| 维度级复核完成数   | 18              |
| 子项逐条复核数     | 2               |
| 批量复核覆盖条目数 | ~40（低风险项） |
| **保留**           | 31              |
| **降级**           | 14              |
| **驳回**           | 10              |

### 按严重程度分布（复核后）

| 严重程度 | 数量 | 说明                                  |
| -------- | ---- | ------------------------------------- |
| P0       | 0    | 无当前错误行为或安全违约              |
| P1       | 1    | variant-field FieldFrame 属性转发缺失 |
| P2       | 20   | 真实维护成本，可排期处理              |
| P3       | 10   | 观察项，暂不值得立即改动              |

---

## P1 清单（按文件分组）

| #   | 维度 | 文件                                                                                | 问题                                                                                                                 |
| --- | ---- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | 12   | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:243-256` | FieldFrame 缺少 7 个 BoundFieldSchemaBase 属性（required/hint/description/remark/labelRemark/labelAlign/labelWidth） |

---

## P2 清单（按文件分组）

### flux-renderers-form-advanced

| #   | 维度 | 文件                                     | 问题                            |
| --- | ---- | ---------------------------------------- | ------------------------------- |
| 1   | 12   | `variant-field/variant-field.tsx`        | FieldFrame 属性缺失（P1，同上） |
| 2   | 12   | `detail-view/detail-view.tsx`            | 使用 FieldLabel 而非 FieldFrame |
| 3   | 09   | `array-editor.tsx`                       | 缺少 data-testid/data-cid       |
| 4   | 09   | `key-value.tsx`                          | 缺少 data-testid/data-cid       |
| 5   | 09   | `tag-list.tsx`                           | 缺少 data-testid/data-cid       |
| 6   | 18   | `detail-field.tsx` + `variant-field.tsx` | 异步操作缺少 AbortController    |

### flux-renderers-form

| #    | 维度 | 文件                                | 问题                                                                      |
| ---- | ---- | ----------------------------------- | ------------------------------------------------------------------------- |
| 7-11 | 09   | `renderers/input.tsx`（5 个渲染器） | Select/Checkbox/Switch/RadioGroup/CheckboxGroup 缺少 data-testid/data-cid |

### flux-react

| #   | 维度 | 文件                                | 问题                                   |
| --- | ---- | ----------------------------------- | -------------------------------------- |
| 12  | 05   | `surface/surface-scope-snapshot.ts` | 订阅整个 scope 而非按路径              |
| 13  | 10   | `field-frame.tsx:116`               | BEM `--` 修饰符 `nop-field--label-top` |

### flux-renderers-basic

| #   | 维度 | 文件               | 问题                                |
| --- | ---- | ------------------ | ----------------------------------- |
| 14  | 10   | `tabs.tsx:131-132` | BEM `--` 修饰符 `nop-tabs--${mode}` |

### flux-compiler

| #   | 维度 | 文件                         | 问题                           |
| --- | ---- | ---------------------------- | ------------------------------ |
| 15  | 15   | `schema-compiler.ts:395-397` | 吞噬编译异常，无日志/telemetry |

### flux-runtime

| #   | 维度 | 文件                                                    | 问题                 |
| --- | ---- | ------------------------------------------------------- | -------------------- |
| 16  | 15   | `async-data/reaction-runtime.ts` + `source-registry.ts` | 全量 store subscribe |

### flux-core

| #   | 维度 | 文件                         | 问题                                             |
| --- | ---- | ---------------------------- | ------------------------------------------------ |
| 17  | 13   | `types/scope.ts`             | Record<string, any> 应为 Record<string, unknown> |
| 18  | 17   | `types/renderer-core.ts:118` | RendererRendererClass 双前缀                     |
| 19  | 17   | `types/schema.ts:107-108`    | adaptor vs adapter 拼写不一致                    |

### 文档

| #   | 维度 | 文件                                    | 问题                          |
| --- | ---- | --------------------------------------- | ----------------------------- |
| 20  | 16   | `flux-runtime-module-boundaries.md:181` | 引用不存在的 debounce.ts 路径 |

### 测试

| #   | 维度  | 文件                         | 问题             |
| --- | ----- | ---------------------------- | ---------------- |
| 21  | 02/14 | `object-field.test.tsx`      | 755 行，必须拆分 |
| 22  | 02/14 | `controller-inspect.test.ts` | 750 行，必须拆分 |

---

## 高频问题文件（出现在多个维度中的文件）

| 文件                              | 涉及维度   | 问题摘要                           |
| --------------------------------- | ---------- | ---------------------------------- |
| `variant-field.tsx`               | 12, 18     | FieldFrame 属性缺失 + 异步缺少取消 |
| `input.tsx` (flux-renderers-form) | 09         | 5 个渲染器缺少 testid/cid          |
| `field-frame.tsx`                 | 10         | BEM -- 修饰符                      |
| `tabs.tsx`                        | 10         | BEM -- 修饰符                      |
| `object-field.test.tsx`           | 02, 14, 15 | 超过 700 行                        |
| `controller-inspect.test.ts`      | 02, 14, 15 | 超过 700 行                        |

---

## 跨维度模式（多个维度报告的同类问题）

### 1. 测试文件过大（维度 02, 14, 15）

2 个测试文件超过 700 行必须拆分（object-field.test.tsx 755 行, controller-inspect.test.ts 750 行），16+ 个在 500-700 行需评估。

### 2. 渲染器 testid/cid 遗漏（维度 09）

8 个渲染器缺少 data-testid/data-cid 透传，集中在 2 个文件（input.tsx 中的 5 个 + form-advanced 中的 3 个）。

### 3. BEM -- 残留（维度 10）

2 个文件仍使用 BEM `--` 修饰符（field-frame.tsx, tabs.tsx），与 styling-system.md 禁止规则冲突。

### 4. 文档漂移集中在验证相关文档（维度 08, 16）

form-validation.md 和 form-validation-runtime-types.md 有类型名称偏差和 Phase 标注缺失。

---

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）

- 文件大小 >700 行：`pnpm check:oversized-code-files` + ESLint `max-lines` 规则
- TypeScript strict mode：`pnpm typecheck`
- ESM 导入：Vite 处理
- 无 eval/new Function：项目无此使用

---

## 建议新增的自动化检查

1. **渲染器 testid/cid 透传检查** — 可编写 AST 检查脚本，验证所有使用 RendererComponentProps 的组件是否将 testid/cid 传递到根元素。
2. **BEM -- 修饰符检测** — CSS linter 规则检测 `nop-*.+--` 模式。
3. **FieldFrame 属性完整性检查** — 对于不使用 `wrap: true` 的 BoundField 渲染器，检查是否完整传递 FieldFrame 所需属性。

---

## 可暂缓项（有问题但 ROI 暂时不高）

| #   | 项                              | 维度 | 原因                                      |
| --- | ------------------------------- | ---- | ----------------------------------------- |
| 1   | ScopeRef Record<string, any>    | 13   | 改为 unknown 会产生大量类型断言噪音       |
| 2   | ui 包测试覆盖                   | 14   | shadcn re-export，核心逻辑在上游          |
| 3   | spreadsheet/flow-designer 测试  | 14   | domain 包仍在演进中                       |
| 4   | code-editor 注册模式            | 18   | 功能正确，仅模式不一致                    |
| 5   | crud-renderer 类名模式          | 10   | widget 渲染器拥有 UI 壳层，当前模式可工作 |
| 6   | Context Provider value 稳定性   | 05   | 实际性能影响有限                          |
| 7   | crud-renderer-toolbar `<label>` | 11   | 非关键路径                                |

---

## 误报排除清单（看起来像问题但不建议动）

| #   | 项                                    | 维度 | 排除原因                             |
| --- | ------------------------------------- | ---- | ------------------------------------ |
| 1   | flux-runtime → flux-compiler 依赖     | 01   | AGENTS.md 已声明，是有意架构决策     |
| 2   | ui → flux-i18n 依赖                   | 01   | AGENTS.md 已声明                     |
| 3   | domain renderers useSyncExternalStore | 18   | 访问自身 domain core store，标准实践 |
| 4   | table-quick-edit-cell draft/saved     | 04   | 合理的编辑器模式                     |
| 5   | array-editor itemsRef                 | 04   | 性能缓存，非状态源                   |
| 6   | dialog/drawer 开闭状态                | 04   | 标准受控/非受控模式                  |
| 7   | useLayoutEffect namespace 注册        | 07   | 需要在 DOM 更新前完成                |
| 8   | chart.tsx dangerouslySetInnerHTML     | 15   | ECharts 主题注入标准方式             |
| 9   | spreadsheet .js 后缀导入              | 03   | 功能正确，仅风格不一致（保留为 P2）  |
| 10  | fieldset title string-only            | 12   | 纯标签文本，非 value-or-region 候选  |

---

## 维度评估总览

| 维度 | 名称               | 初审发现 | 复核后             | 最高级别 | 整体评价                |
| ---- | ------------------ | -------- | ------------------ | -------- | ----------------------- |
| 01   | 依赖图与包边界     | 3        | 2 P3               | P3       | 健康                    |
| 02   | 模块职责与文件边界 | 4        | 2 P2               | P2       | 良好（仅测试文件超限）  |
| 03   | API 表面积         | 4        | 1 P2               | P2       | 良好                    |
| 04   | 状态所有权         | 5        | 0                  | —        | 优秀                    |
| 05   | 响应式订阅精度     | 5        | 1 P2 + 2 P3        | P2       | 良好                    |
| 06   | 异步模式           | 0        | 0                  | —        | 优秀（标杆级）          |
| 07   | 生命周期归属       | 5        | 1 P2               | P2       | 良好                    |
| 08   | 验证系统           | 7        | 1 P3               | P3       | 良好                    |
| 09   | 渲染器契约         | 8        | 8 P2               | P2       | 良好（testid 遗漏）     |
| 10   | 样式系统           | 4        | 2 P2 + 1 P3        | P2       | 良好                    |
| 11   | UI 组件使用        | 1        | 1 P3               | P3       | 优秀                    |
| 12   | 字段 Slot 建模     | 4        | 1 P1 + 1 P2 + 1 P3 | P1       | variant-field 需修复    |
| 13   | 类型安全           | 5        | 2 P2 + 3 P3        | P2       | 良好                    |
| 14   | 测试覆盖           | 6        | 5 P2               | P2       | 良好（覆盖缺口）        |
| 15   | 安全与性能         | 5        | 2 P2 + 1 P3        | P2       | 良好                    |
| 16   | 文档-代码一致性    | 5        | 5 P2               | P2       | 良好（文档准确率 >95%） |
| 17   | 命名一致性         | 3        | 2 P2               | P2       | 良好                    |
| 18   | 跨包模式           | 5        | 1 P2 + 1 P3        | P2       | 良好                    |

---

## 修复优先级建议

### 立即修复（P1）

1. **variant-field FieldFrame 属性补全** — 在手动实例化 FieldFrame 时补全 required/hint/description/remark/labelRemark/labelAlign/labelWidth 等 7 个属性。修改文件：`packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`

### 近期排期（P2，按 ROI 排序）

1. **8 个渲染器 testid/cid 补全** — 修改 2 个文件，影响 E2E 测试可靠性
2. **2 个超大测试文件拆分** — `object-field.test.tsx` + `controller-inspect.test.ts`
3. **编译器异常日志化** — `schema-compiler.ts` catch 块添加 structured logging
4. **BEM -- 清理** — `field-frame.tsx` + `tabs.tsx`
5. **文档路径修正** — `flux-runtime-module-boundaries.md` debounce.ts 路径
6. **异步操作取消机制** — detail-field + variant-field 添加 AbortController
7. **其他 P2** — 按维度报告逐项排期
