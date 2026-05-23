# 对抗性审查 — 2026-05-05 第 5 轮（Canonical-Only 继续）

## 发现 1：CRUD 仍把迁移别名当作正式可接受 DSL，canonical schema 无法真正收口

- 在哪里
  - `packages/flux-renderers-data/src/data-schema-validation.ts:175-227`
  - `packages/flux-renderers-data/src/schema-validator.test.ts:143-188`
  - `packages/flux-compiler/src/schema-compiler-registry-features.test.ts:111-174`
  - `docs/components/crud/design.md:129-144,201-222`
- 是什么
  - live transform 仍主动接受并 lower：
    - `filter -> queryForm`
    - `primaryField -> rowKey`
    - `perPageField -> pageSizeField`
    - `bulkActions -> listActions`
  - 测试明确锁定“legacy authoring 仍接受”和“canonical 与 legacy 共存时 canonical 优先”。
  - 文档也把 `bulkActions` 继续描述成“迁移别名或 authoring sugar”。
- 为什么值得关心
  - 这意味着 CRUD 不是一套 DSL，而是两套 DSL 加一个 lowering 层。
  - 在没有兼容性负担的前提下，这会持续放大 schema 生成、文档示例、AI 产出、lint/validator 规则的复杂度，因为系统必须永远理解“旧写法也合法”。
  - 更关键的是，一旦 validator/compiler 正式接受这些别名，canonical 命名就再也不是硬约束，只是“推荐风格”。
- 信心水平
  - 确定

## 发现 2：Surface close 语义仍公开三种 action 名字，canonical `closeSurface` 没真正成为唯一入口

- 在哪里
  - `packages/flux-core/src/constants.ts:3-18`
  - `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:132-183`
  - `packages/flux-runtime/src/action-adapter.ts:201-219`
  - `packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts:120-147`
  - 对照文档：`docs/architecture/surface-owner.md:231-245`
- 是什么
  - built-in action 名称集合仍公开 `closeDialog`、`closeDrawer`、`closeSurface`。
  - dispatcher 虽然会把前两者 lower 到 `closeSurface`，但 public action selector 仍是三选一。
  - runtime 测试还在显式断言三者全部可用。
- 为什么值得关心
  - 这不是内部 lowering 细节，而是公共 authoring surface 仍然分裂。
  - 既然文档已经把 `closeSurface` 定为长期统一基线，那么继续把另外两个名字保留为 first-class built-in 并在测试中背书，只会把 canonical close primitive 永远降格成“三个都行”的其中一个。
  - 这也会拖慢后续 surface family 收敛，因为任何 action 教程、schema 示例、自动化生成器都还得考虑三套写法。
- 信心水平
  - 确定

## 发现 3：`flux-formula` 仍同时公开 instance-local registry 和 process-global mutable registry，两套扩展模型并存

- 在哪里
  - `packages/flux-formula/src/registry.ts:26-102`
  - `packages/flux-formula/src/index.ts:5-12`
  - 对照说明：`docs/plans/197-architecture-evolution-formula-di-treeshaking-build-config-plan.md:5`
- 是什么
  - 包里已经有 `createFormulaRegistry()` 这条 instance-local canonical 路径。
  - 但同一个 public package 仍继续导出全局可变 wrapper：`registerFunction`、`registerNamespace`、`getFormulaRegistrySnapshot`、`resetFormulaRegistry`。
  - `registry.ts` 甚至直接标注这是“Default global instance for backward compatibility”。
- 为什么值得关心
  - 这会让 formula 扩展模型长期保持二义性：到底应该把函数注册到 runtime 局部 registry，还是改全局默认 registry？
  - 在你明确声明“v1 不保留兼容设计”后，这种 dual model 已经不是温和遗留，而是架构方向仍未真正裁决的证据。
  - 它也会持续反向污染文档、测试、示例和新功能设计，因为任何地方都可能继续顺手用全局 wrapper。
- 信心水平
  - 确定

## 发现 4：Compiled validation model 仍把同一遍历语义暴露为 `order` 和 `validationOrder` 两个字段

- 在哪里
  - `packages/flux-core/src/types/validation.ts:104-113`
  - `packages/flux-core/src/validation-model.ts:147-166`
  - `packages/flux-core/src/validation-model.test.ts`（`prefers validationOrder when present` / `falls back to order when validationOrder is absent`）
  - `docs/references/form-validation-runtime-types.md:135-150`
- 是什么
  - `CompiledFormValidationModel` 导出类型同时包含 `order` 和 `validationOrder`。
  - 构建模型时两者都会被写同一份值。
  - helper `getCompiledValidationTraversalOrder()` 又把 `validationOrder ?? order` 当作正式 fallback 逻辑。
- 为什么值得关心
  - 这把一个本应非常基础的内部遍历合同做成了双字段 API，而且 helper/test/doc 都在共同承认这种双轨。
  - 对外部消费者来说，这会持续制造“哪个字段才是正式的”疑问；对内部演进来说，这意味着任何一次字段收敛都要先处理兼容 fallback。
  - 相比前 3 条，它的破坏面略小，因为 runtime 内部多数调用已经统一走 helper；但从 canonical-only 视角看，它仍然是不必要的公开类型分叉。
- 信心水平
  - 很可能

## 本轮小结

- 本轮进一步确认：canonical 设计没有真正落地到“类型 + validator/compiler + built-in action name + public package export”这些最硬的边界层。
- 如果不主动清掉这些仍被 live 代码接受和测试锁定的兼容面，后续任何“收敛 canonical 设计”的工作都会不断被旧入口拖回去。
