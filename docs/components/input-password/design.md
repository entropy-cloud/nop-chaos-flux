# Input Password 组件设计

## 1. 组件定位

- `input-password` 是 `input-text` 的密码语义特化版。
- 它主要区别在输入类型、安全显示策略和后续可能的 reveal/strength 能力。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。能力裁决与决策表见 `input-text/design.md` §2 Flux 决策表（本组件沿用）。
- 当前最小能力与 `input-text` 一致。
- `minLength`/`maxLength`/`pattern` 同 input-text，已实现（双重生效：编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生 `<input>` 属性）。详见 `input-text/design.md` §2、§3。
- 显示切换、强度提示和自动生成密码属于后续增强，不应在首版文档里直接固化成复杂协议。
- **revealPassword 显示切换** 为 E2a-bis 工作项（基础能力，amis 默认开启，当前 Flux 缺失）。

### Flux 决策表

> Flux 决策主语。文本输入族共享面（`name`/`placeholder`/`required`/`minLength`/`maxLength`/`pattern` 双重生效/prefix/suffix/clearable/trimContents/showCounter/autoComplete/nativeAutoComplete/input-mask/amis `addOn`/amis `transform`/amis `borderMode`/amis `clearValueOnEmpty`/amis 组件级 `api`）见 `input-text/design.md` §2 Flux 决策表，本表只列 input-password **特化差异**。命名对齐 X3 基线（`docs/references/naming-conventions.md`）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                      | 采纳                                                               | 不采纳             | 理由                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| HTML input type           | **实现**：`type='input-password'` → 渲染 `<input type="password">` | —                  | 密码语义特化；浏览器原生密码输入/凭据管理集成                                                                                         |
| `revealPassword` 显示切换 | **计划实现（E2a-bis）**：显式 reveal toggle 按钮                   | —                  | 基础能力，amis 默认开启，当前 Flux 缺失；明文状态为 `local` UI state，不写入表单值（见 §7）                                           |
| 密码强度指示              | **暂不实现**                                                       | —                  | 后续按需；密码强度规则优先通过验证或辅助渲染层接入（见 §9）                                                                           |
| 自动生成密码              | —                                                                  | **不采纳**（首版） | 引入随机生成逻辑耦合，后续如有需要按独立 feature plan 评估                                                                            |
| 密码管理器专用字段        | —                                                                  | **不采纳**         | 浏览器原生 `autocomplete="current-password"`/`"new-password"` 已覆盖（见 input-text `nativeAutoComplete` 实现）；不在 schema 平行发明 |

## 3. Flux 中的 renderer/type 定义

- `type: 'input-password'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 沿用 `InputSchema`。
- 后续如果增加 reveal/strength，优先使用 `showRevealToggle`、`showStrength` 这类直接语义字段。

## 5. 字段分类

- 与 `input-text` 相同。

## 6. regions 与 slot 约定

- 与 `input-text` 相同。

## 7. 运行期状态归属

- 字段值归 form runtime。
- 若未来增加“显示明文”状态，应明确为 `local` UI state，不写入表单值。

## 8. 事件、动作与组件句柄能力

- 与 `input-text` 相同。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 等可接表达式。
- 密码强度规则优先通过验证或辅助渲染层接入。

## 10. 样式与 DOM marker 约定

- 建议输出 `nop-input-password` marker，并复用共享 field frame。

## 11. 实现拆分建议

- 保持在通用 input renderer 体系中，通过 type 参数驱动差异。

## 12. 风险、取舍与后续阶段

- reveal、strength、password manager 集成等增强功能需要谨慎引入，避免把密码输入演变为复杂 widget。
