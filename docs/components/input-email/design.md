# Input Email 组件设计

## 1. 组件定位

- `input-email` 是 `input-text` 的邮箱语义特化版。
- 它的差异主要体现在默认 HTML input type 和 email 校验贡献，而不是独立的布局或状态模型。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。能力裁决与决策表见 `input-text/design.md` §2 Flux 决策表（本组件沿用）。
- 当前能力与 `input-text` 基本一致，但 validation contributor 默认附带 email 规则。
- `minLength`/`maxLength`/`pattern` 同 input-text，已实现（双重生效：编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生 `<input>` 属性）。详见 `input-text/design.md` §2、§3。
- 文档应明确它不是第二套字段体系，只是字符串输入的语义别名。

### Flux 决策表

> Flux 决策主语。文本输入族共享面（`name`/`placeholder`/`required`/`minLength`/`maxLength`/`pattern` 双重生效/prefix/suffix/clearable/trimContents/showCounter/autoComplete（suggest）/nativeAutoComplete/input-mask/amis `addOn`/amis `transform`/amis `borderMode`/amis `clearValueOnEmpty`/amis 组件级 `api`）见 `input-text/design.md` §2 Flux 决策表，本表只列 input-email **特化差异**。命名对齐 X3 基线（`docs/references/naming-conventions.md`）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                     | 采纳                                                                        | 不采纳             | 理由                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| HTML input type                          | **实现**：`type='input-email'` → 渲染 `<input type="email">`                | —                  | 邮箱语义特化；浏览器原生邮箱键盘/校验辅助                         |
| 默认校验规则                             | **实现**：`createFieldValidation(undefined, true)` 附带默认 email validator | —                  | email 字段默认校验是核心语义，不是可选 addon                      |
| 远端邮箱可用性校验                       | **计划实现**：走 `validate.api`（async rule）                               | —                  | 异步校验走统一 validate action，不加进 renderer 内部（见 §9）     |
| 邮箱特化字段（如 `multiple` 多邮箱输入） | —                                                                           | **不采纳**（首版） | 用 input-text + tag-list 组合替代；避免破坏输入族统一性（见 §12） |

## 3. Flux 中的 renderer/type 定义

- `type: 'input-email'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `createFieldValidation(undefined, true)`

## 4. schema 设计

- 沿用 `InputSchema`。
- 推荐只在邮箱语义明确的字段使用该 type，避免再用额外布尔字段标识邮箱模式。
- E3 suggest 字段（`suggestSource`/`suggestDebounce`/`suggestTrigger`/`suggestMinInputLength`/`suggestTemplate`/`suggestEmpty`）声明在共享 `InputSchema`，input-email renderer 共享消费（走 data-source composition 模式 A，详见 `input-text/design.md` §4 E3 新增字段）。

## 5. 字段分类

- 与 `input-text` 相同。
- 附加语义是默认 email validator，而不是新增 schema 字段。

## 6. regions 与 slot 约定

- 与 `input-text` 相同，仅 `label` 支持 `value-or-region`。

## 7. 运行期状态归属

- 与 `input-text` 相同，值与验证状态由 form runtime 托管。

## 8. 事件、动作与组件句柄能力

- 与 `input-text` 相同（X1 起共享 `createInputRenderer` 工厂，同样发布 `component:clear`/`reset`/`focus`）。

## 9. 数据源、表达式、导入能力接入点

- 与 `input-text` 相同。
- 邮箱可用性校验这类远端异步验证应放在 `validate.api`，而不是加进 renderer 内部。

## 10. 样式与 DOM marker 约定

- 建议输出 `nop-input-email` marker，并复用共享 input field chrome。

## 11. 实现拆分建议

- 保持在 `createInputRenderer('email')` 路径内，避免复制文本输入实现。

## 12. 风险、取舍与后续阶段

- 不要为邮箱输入增加过多专用字段，否则会破坏输入族统一性。
