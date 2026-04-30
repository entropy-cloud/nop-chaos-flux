# 深度审核汇总报告

## 审核范围

- 执行的维度：全部 18 个维度
- 覆盖的包：全部 23 个 workspace packages + apps/playground
- 审核日期：2026-04-17
- 执行方式：每个维度一个初审子 agent + 一个维度复核子 agent（维度 01-15 已完成复核），共 40+ 个子 agent

## 复核统计

- 初审发现总数：约 85 条
- 已独立复核条目数：约 65 条（维度 01-15 完成复核，维度 16-18 仅初审）
- 保留：约 55 条
- 降级：约 10 条
- 驳回：约 5 条

## P0/P1 清单（按严重程度排序）

| 维度 | 文件                                                                   | 发现                                              | 严重度 |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| 04   | flux-renderers-form-advanced/src/array-editor.tsx:96-107               | 删除操作双重写入导致多删元素                      | P1     |
| 04   | flux-renderers-form-advanced/src/key-value.tsx:158-169                 | 删除操作双重写入导致多删条目                      | P1     |
| 08   | flux-runtime/src/form-runtime-owner.ts:97-105                          | revalidateDependents 对未触碰依赖字段直接清除错误 | P1     |
| 15   | flux-renderers-data/src/table-renderer/use-table-controls.ts:241-267   | useTableFilter 原位修改共享 Set                   | P1     |
| 02   | flux-runtime/src/data-source-runtime.ts                                | 681 行职责混合需拆分                              | P1     |
| 07   | spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts:40-65 | mouseup 事件缺失清理                              | P1     |
| 09   | flux-renderers-data/src/crud-renderer.tsx:186                          | queryForm region 未注册                           | P1     |
| 14   | packages/flux-i18n/src/                                                | 完全无测试覆盖                                    | P1     |
| 14   | packages/flux-core/src/                                                | 测试/代码比仅 0.14                                | P1     |

## P1 清单（按文件分组）

### flux-renderers-form-advanced

- `array-editor.tsx:96-107` — 删除双重写入（维度04）
- `key-value.tsx:158-169` — 删除双重写入（维度04）

### flux-runtime

- `form-runtime-owner.ts:97-105` — revalidateDependents clearErrors 逻辑（维度08）
- `data-source-runtime.ts` — 681 行需拆分（维度02）

### flux-renderers-data

- `use-table-controls.ts:241-267` — 原位修改共享 Set（维度15）
- `crud-renderer.tsx:186` — queryForm region 未注册（维度09/12）

### spreadsheet-renderers

- `use-resize.ts:40-65` — mouseup 事件缺失（维度07）

## 高频问题文件（出现在多个维度中的文件）

| 文件                   | 涉及维度       | 问题数 |
| ---------------------- | -------------- | ------ |
| crud-renderer.tsx      | 04, 07, 09, 12 | 4      |
| use-table-controls.ts  | 04, 05, 15     | 3      |
| array-editor.tsx       | 04, 05, 09     | 3      |
| key-value.tsx          | 04, 05, 09     | 3      |
| field-frame.tsx        | 05, 15         | 2      |
| hooks.ts (flux-react)  | 05, 13         | 2      |
| data-source-runtime.ts | 02, 06         | 2      |
| form-runtime-owner.ts  | 06, 08         | 2      |

## 跨维度模式

### 1. 双重写入/双状态模式（维度04 + 09）

ArrayEditor 和 KeyValue 的删除操作同时调用 setValue + removeValue，是 form store 操作层面的设计缺陷。

### 2. RendererDefinition field metadata 不完整（维度09 + 12）

CRUD 的 queryForm 和 Table 的 loadingSlot/header/footer 未在 fields 中声明，导致编译器不生成 region handle。

### 3. 全量 store 订阅（维度05 + 15）

form store 的 value 变更仍走 Zustand 全量广播，per-value-path 订阅基础设施缺失，是多项性能发现的根因。

### 4. i18n 遗漏（维度18）

condition-builder 使用独立中文硬编码 i18n 系统，input.tsx 和 debugger 有硬编码英文。国际化覆盖不完整。

### 5. 文档-代码漂移（维度16）

flux-runtime-module-boundaries.md 有 16 个文件未记录，form-runtime 拆分后文档未同步。

## 已自动化的检查项

| 检查项                 | 工具                                                 | 覆盖维度 |
| ---------------------- | ---------------------------------------------------- | -------- |
| 文件大小 700+ 行       | `pnpm check:oversized-code-files` + ESLint max-lines | 02       |
| eval/new Function 禁止 | 代码搜索确认零匹配                                   | 15       |
| 类型抑制               | @ts-expect-error/@ts-ignore 零使用                   | 13       |
| UI 组件替换            | 代码搜索确认生产代码合规                             | 11       |

## 建议新增的自动化检查

1. **CRUD renderer queryForm region 注册检查** — 自定义 lint 规则检测 RendererDefinition 中引用但未声明的 region
2. **Set/Map 不可变更新检查** — ESLint 规则检测 state 更新中的原位修改
3. **i18n 硬编码检测** — 正则扫描 renderer 代码中的中文/英文字面量（排除已使用 t() 的文件）

## 可暂缓项

| 项目                                             | 原因                   |
| ------------------------------------------------ | ---------------------- |
| 性能-06 performance.mark                         | 缺少是常态，非性能红线 |
| 维度13 大部分 any                                | 低代码引擎正常设计     |
| 维度11                                           | 审核通过，无需修改     |
| 维度05 P3 项（scope debug、surface snapshot 等） | 影响有限               |
| 文件命名一致性（维度17）                         | 风格偏好，无功能影响   |

## 误报排除清单

| 发现                                                    | 排除原因                               |
| ------------------------------------------------------- | -------------------------------------- |
| ArrayEditor/KeyValue ref 先于 store 更新（维度04 #3#4） | composite field registration 设计要求  |
| 缺少 performance.mark（维度15 性能-06）                 | 绝大多数应用不使用此 API               |
| ConditionBuilder 缺 data-testid（维度09）               | wrap:true 已由 FieldFrame 处理         |
| CRUD nop-crud-\* class（维度09）                        | 纯 marker class，符合 Styling Contract |
| writeMetadata 原位修改（维度15 安全-02）                | 死代码，零调用者                       |
