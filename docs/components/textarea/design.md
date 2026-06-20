# Textarea 组件设计

## 1. 组件定位

- `textarea` 是多行文本输入字段。
- 它复用文本输入的验证和 field chrome 规则，但强调长文本编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `rows` 和输入基线字段。
- 自动高度、字数计数应作为后续增强；Markdown 模式不在 textarea 范围（用独立 markdown renderer）。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。文本输入族共享面（prefix/suffix/clearable/trimContents/showCounter/native maxLength/minLength-maxLength-pattern 双重生效）见 `input-text/design.md` §2 Flux 决策表，本表只列 textarea 特化差异。

| 能力                                                           | 采纳                                         | 不采纳     | 理由                                                     |
| -------------------------------------------------------------- | -------------------------------------------- | ---------- | -------------------------------------------------------- |
| 多行基线                                                       | **实现**：`stringAdapter` + `rows`（默认 4） | —          | 当前基线                                                 |
| 禁用/只读                                                      | **实现**：`disabled`/`readOnly`              | —          | 当前基线                                                 |
| `placeholder`/`className`/aria                                 | **实现**                                     | —          | 当前基线                                                 |
| focus/change/blur 事件接入                                     | **实现**                                     | —          | 当前基线                                                 |
| `minRows`/`maxRows` 自动高度（react-textarea-autosize 或等价） | **计划实现（E2b）**                          | —          | 长文本高频需求                                           |
| `showCounter` 字数计数                                         | **计划实现（E2b）**                          | —          | 长文本高频需求（与 input-text 共享命名）                 |
| `clearable` 清空                                               | **计划实现（E2b）**                          | —          | 对齐 shadcn 输入族（X3 §2/§4.1）                         |
| `trimContents`（blur 自动 trim）                               | **计划实现（E2b）**                          | —          | 数据卫生（与 input-text 共享命名）                       |
| 原生 `maxLength`                                               | **计划实现（E2b）**                          | —          | 传到 `<textarea>` 原生属性                               |
| amis `borderMode`                                              | —                                            | **不采纳** | Flux 样式系统（marker + Tailwind，X3 §3 样式 amis 化）   |
| amis markdown 模式                                             | —                                            | **不采纳** | 用独立 markdown renderer，不让 textarea 兼任富文本编辑器 |
| amis 组件级 `api`                                              | —                                            | **不采纳** | 请求下沉 data-source + action（X3 §1/§3）                |

## 3. Flux 中的 renderer/type 定义

- `type: 'textarea'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 继承 `InputSchema` 并增加 `rows`。
- 建议后续补充 `minRows`、`maxRows`、`autoHeight`，但不改变其基础文本字段定位。

## 5. 字段分类

- `label`: `value-or-region`
- `rows`、`placeholder`、`required`、`minLength`、`maxLength`: `value`

## 6. regions 与 slot 约定

- 与 `input-text` 相同，仅 `label` 作为可编译 slot。

## 7. 运行期状态归属

- 文本值归 form runtime。
- 行高自适应这类纯展示状态可为局部状态，不应反写表单值。

## 8. 事件、动作与组件句柄能力

- 与基础文本输入一致。

## 9. 数据源、表达式、导入能力接入点

- 与基础文本输入一致。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-textarea` marker，并复用 `@nop-chaos/ui` Textarea。

## 11. 实现拆分建议

- 继续保持 value 读写和验证逻辑与单行输入共享。

## 12. 风险、取舍与后续阶段

- 需要持续拒绝把代码编辑、富文本编辑等高阶场景塞进 `textarea`。
