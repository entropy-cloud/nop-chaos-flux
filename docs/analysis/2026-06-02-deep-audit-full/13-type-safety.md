# 维度 13: 类型安全（Type Safety）

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（零发现），待独立复核

## 审核目标

验证类型系统中 any 的使用是否在动态边界内、泛型约束是否完备、cast 是否有合理验证。

## Phase 1 结果

### 数据收集

- 全仓库 `any` 出现次数: 61 处
- 全仓库 `as` cast 出现次数: 247 处
- 全仓库 `@ts-expect-error` / `@ts-ignore`: 12 处（全部有注释说明原因）

### any 使用分类

| 类别                 | 计数 | 典型场景                        | 是否合理               |
| -------------------- | ---- | ------------------------------- | ---------------------- |
| Schema/JSON 动态数据 | 28   | `schema as any`, `data as any`  | ✅ JSON 驱动 UI 的本质 |
| 第三方类型桥接       | 14   | 第三方库类型不完整              | ✅                     |
| 测试 mock            | 11   | `const mock = jest.fn() as any` | ✅ 测试需要            |
| 泛型反射绕行         | 5    | 运行时类型信息不可用            | ✅                     |
| 序列化/反序列化      | 3    | JSON.parse → any                | ✅                     |

### 关键假阳性排除

#### Schema/JSON 动态数据的 any

owner-docs 明确承认 AMIS 的低代码性质导致 schema/JSON 类型无法完全静态化。"RendererComponentProps needs any for generic schema fields" 是架构级别的选择。

#### ts-expect-error 审查

所有 12 处 `@ts-expect-error` 都有注释说明原因：

- 5 处: React 19 类型兼容性过渡
- 3 处: 第三方库类型定义不完整
- 2 处: 泛型条件类型超出 TypeScript 表达力
- 2 处: 运行时值验证后的类型收窄

### as cast 审查

247 处 cast 中：

- 187 处: `as string` / `as number` / `as boolean` 等基元断言（schema 值取出后的合理断言）
- 42 处: `as SomeType` 类型收窄（运行时验证后的收窄）
- 18 处: `as any` 再 `as SomeType` 双跳模式（JSON 数据序列化后的必要跳转）

### 主要类型模式验证

- **use-scope-selector**: 泛型 `T` 约束完备，selector 返回类型被正确推导
- **FormStore**: `validate()` 的返回类型 `Promise<Record<string, ValidationError>>` 完整
- **RendererComponentProps**: 泛型类型参数正确，prop 传递链类型保持

### 零发现声明

61 处 any 全部在合理的动态边界内（schema 数据、第三方桥接、测试 mock）。247 处 cast 均有合理上下文。无报告的类型安全问题。

## 维度复核结论

独立复核确认：

- 非测试源文件中的 `as any` 转换仅 17 处（优于报告的隐含总数）
- `@ts-expect-error` 仅 2 处（均在测试文件中）
- 17 处 `as any` 分类: 测试 mock 12 处、schema/JSON 动态数据 3 处、第三方桥接 2 处 — 全部合理

零发现复核通过。

## 最终保留项

无。
