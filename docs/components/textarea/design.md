# Textarea 组件设计

## 1. 组件定位

- `textarea` 是多行文本输入字段。
- 它复用文本输入的验证和 field chrome 规则，但强调长文本编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已实现 `rows` 和输入基线字段。
- E2b 已落地自动高度（`minRows`/`maxRows`）、`showCounter`/`clearable`/`trimContents`/原生 `maxLength`；Markdown 模式不在 textarea 范围（用独立 markdown renderer）。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。文本输入族共享面（prefix/suffix/clearable/trimContents/showCounter/native maxLength/minLength-maxLength-pattern 双重生效）见 `input-text/design.md` §2 Flux 决策表，本表只列 textarea 特化差异。

| 能力                             | 采纳                                                                                                                                                                                                                                        | 不采纳       | 理由                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| 多行基线                         | **实现**：`stringAdapter` + `rows`（默认 4）                                                                                                                                                                                                | —            | 当前基线                                                                        |
| 禁用/只读                        | **实现**：`disabled`/`readOnly`                                                                                                                                                                                                             | —            | 当前基线                                                                        |
| `placeholder`/`className`/aria   | **实现**                                                                                                                                                                                                                                    | —            | 当前基线                                                                        |
| focus/change/blur 事件接入       | **实现**                                                                                                                                                                                                                                    | —            | 当前基线                                                                        |
| `minRows`/`maxRows` 自动高度     | **实现**：ref 测量 `scrollHeight`（Phase 1 Decision A，权威路径），按 `minRows`/`maxRows` × `resolveTextareaLineHeightPx()` 像素区间钳制 `height`；超出 `maxRows` 后 `overflow-y: auto`；保留 `field-sizing-content` 作为 Chromium 渐进增强 | —            | 长文本高频需求；Firefox/Safari 无 `field-sizing` 支持，故 JS 测量为权威路径     |
| `showCounter` 字数计数           | **实现**：`<span data-slot="textarea-counter">`，有 `maxLength` 显示 `n / max`，无时显示 `n`；实时随 onChange 更新；位于 textarea 下方 footer 行                                                                                            | —            | 长文本高频需求（与 input-text 共享命名）；footer 独立行避免 InputGroup 破坏测量 |
| `clearable` 清空                 | **实现**：值非空且非 disabled/readOnly 时在 footer 渲染 `<button data-slot="textarea-clear">`（XIcon），点击清空为 `''`                                                                                                                     | —            | 对齐 shadcn 输入族（X3 §2/§4.1 肯定式）                                         |
| `trimContents`（blur 自动 trim） | **实现**：blur handler 中 `String(value).trim()` 再写入 form runtime（onChange 不 trim）                                                                                                                                                    | —            | 数据卫生（与 input-text 共享命名）                                              |
| 原生 `maxLength`                 | **实现**：声明时透传 `<textarea maxlength=...>`（与编译期校验双重生效，对齐 input-text E0a 模式）                                                                                                                                           | —            | 传到 `<textarea>` 原生属性                                                      |
| prefix/suffix 多行前后缀         | —                                                                                                                                                                                                                                           | **暂不实现** | 多行控件前后缀视觉不典型；InputGroup 包裹破坏 auto-height 测量（归 E3 P2 评估） |
| amis `borderMode`                | —                                                                                                                                                                                                                                           | **不采纳**   | Flux 样式系统（marker + Tailwind，X3 §3 样式 amis 化）                          |
| amis markdown 模式               | —                                                                                                                                                                                                                                           | **不采纳**   | 用独立 markdown renderer，不让 textarea 兼任富文本编辑器                        |
| amis 组件级 `api`                | —                                                                                                                                                                                                                                           | **不采纳**   | 请求下沉 data-source + action（X3 §1/§3）                                       |

## 3. Flux 中的 renderer/type 定义

- `type: 'textarea'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- fields: `formFieldRules` + `textareaEnhancementFieldRules`（`rows`/`minRows`/`maxRows`/`clearable`/`trimContents`/`showCounter`/`placeholder`/`minLength`/`maxLength`/`pattern`/`validate`/`hiddenFieldPolicy`）
- validation contributor: 标准 scalar field（`createFieldValidation()`）

## 4. schema 设计

- 继承 `InputSchema` 并增加 `rows`。
- E2b 新增 `minRows?: number`、`maxRows?: number`，作为自动高度的钳制区间（见 §7 自动高度机制）。
- 文本输入族共享面（`showCounter`/`clearable`/`trimContents`/原生 `maxLength`/`minLength`/`pattern`/`placeholder`/`validate`）通过 `TextareaSchema extends InputSchema` 继承得到，textarea renderer definition 以 `textareaEnhancementFieldRules` 显式注册适用子集（不含 prefix/suffix/nativeAutoComplete/revealPassword，多行不适用）。

## 5. 字段分类

- `label`: `value-or-region`
- `rows`、`minRows`、`maxRows`、`placeholder`、`required`、`minLength`、`maxLength`: `value`（进入 `props` 通道）
- `clearable`、`trimContents`、`showCounter`: `value`（boolean，`valueType: 'boolean'`）
- `validate`: `value`，内部承接 async rule 描述

## 6. regions 与 slot 约定

- 与 `input-text` 相同，仅 `label` 作为可编译 slot。

## 7. 运行期状态归属

- 文本值归 form runtime。
- **自动高度（minRows/maxRows）测量为 local state**：`TextareaRenderer` 用 `useRef` 持有 `<textarea>`，在 `useEffect`（依赖 `textareaValue`/`autoHeightEnabled`/`minRows`/`maxRows`）中命令式写 `el.style.height` / `el.style.overflowY`。该测量**不写表单值、不持久化**（toggle、reveal、auto-height 三类 local 态都不反写 form runtime，与 `input-password` revealPassword 同一约束）。
- `clearable`/`trimContents`/`showCounter` 均消费 form runtime 值；`clearable` 写回 `''`、`trimContents` 写回 trimmed 值，二者都属于正常的 field value 写入路径。

## 8. 事件、动作与组件句柄能力

- 与基础文本输入一致。
- X1 起落地 `component:clear`/`reset`/`focus` handle（与 input-text 同语义，详见 `docs/components/input-text/design.md` §8）。

## 9. 数据源、表达式、导入能力接入点

- 与基础文本输入一致。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-textarea` marker（`TextareaRenderer` 声明 `clearable`/`showCounter` 时额外用 `nop-textarea-wrapper`），并复用 `@nop-chaos/ui` Textarea（内部为 bare `<textarea data-slot="textarea">`）。
- **无 `showCounter`/`clearable` 声明时**（含仅有 `minRows`/`maxRows` 的 auto-height 场景）：直接渲染 `<Textarea>`（无额外 wrapper）。auto-height 仅命令式写 `style.height`/`style.overflowY`，不改变 DOM 树结构，保证与 E2a 前 baseline 的 DOM 一致（无漂移）。
- **声明 `showCounter`/`clearable` 任一时**：包裹 `<div data-slot="textarea-wrapper" class="nop-textarea-wrapper flex flex-col gap-1">`，内部：
  - `<Textarea>`（`data-slot="textarea"`，`className` 透传 `props.meta.className`）
  - `<div data-slot="textarea-footer" class="flex items-center justify-end gap-2">`：
    - `clearable` + 值非空 + 非 disabled/readOnly 时渲染 `<button type="button" data-slot="textarea-clear" aria-label="Clear">`（XIcon icon-xs）
    - `showCounter` 时渲染 `<span data-slot="textarea-counter" class="text-xs text-muted-foreground tabular-nums">`
- DOM 结构在值变化时保持稳定：声明 `clearable`/`showCounter` 即始终包裹 wrapper，不随按钮/计数显隐切换（与 input-text InputGroup 稳定性裁定同模式）。footer 行在 `<textarea>` 外，不参与 auto-height 的 `scrollHeight` 测量。

## 11. 实现拆分建议

- 继续保持 value 读写和验证逻辑与单行输入共享（`field-utils`）。
- `TextareaRenderer`（`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`）承担 auto-height 测量（`resolveTextareaLineHeightPx` + `useEffect`）+ 增强消费（counter/clear/trim/maxLength）。
- `textareaEnhancementFieldRules`（`packages/flux-renderers-form/src/renderers/input.tsx`）是 textarea definition 的显式字段注册子集，与 `inputEnhancementFieldRules` 平行（不含 prefix/suffix/nativeAutoComplete/revealPassword）。

## 12. 风险、取舍与后续阶段

- 需要持续拒绝把代码编辑、富文本编辑等高阶场景塞进 `textarea`。
- **auto-height 跨浏览器风险**：JS ref 测量 `scrollHeight` 是权威路径，覆盖 Firefox/Safari（无 `field-sizing: content` 支持）；Chromium 保留 `field-sizing-content` 作为渐进增强。`lineHeight` 取 `getComputedStyle` 解析值，回退 `fontSize*1.5`，再回退常量 24px。
- **auto-height 不写表单值**：测量为 local state（命令式 `style` 写入），不触发 form value change，不持久化（`form-state-probe` 单测验证）。
- **counter 行不污染测量**：counter/clear 在 `<textarea>` 外的 footer 行，不参与 `scrollHeight` 测量（单测 `textarea.contains(counter) === false` 验证）。
- **prefix/suffix 暂不实现**：多行前后缀视觉不典型，且 InputGroup 包裹会破坏 auto-height 测量与 `field-sizing` 行为；归 E3 P2 评估。
