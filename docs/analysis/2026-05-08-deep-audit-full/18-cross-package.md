# 18 Cross Package

- 深挖轮次: 1
- 深挖发现数: 1

## 第 1 轮初审

### [维度18-01] advanced form 字段的校验文案仍绕过共享 i18n/validation 文案模型

- **涉及包**: `@nop-chaos/flux-renderers-form-advanced` vs `@nop-chaos/flux-renderers-form` / `@nop-chaos/flux-i18n`
- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:305-310`, `packages/flux-renderers-form-advanced/src/key-value.tsx:358-375`, `packages/flux-i18n/src/locales/en-US.ts:54-89`, `packages/flux-i18n/src/locales/zh-CN.ts:54-89`
- **行号范围**: `array-editor.tsx:305-310`, `key-value.tsx:358-375`, `en-US.ts:54-89`, `zh-CN.ts:54-89`
- **证据片段**:
  ```ts
  305:         return [
  306:           {
  307:             path,
  308:             rule: 'required',
  309:             message: `${props.props.itemLabel ?? 'Item'} ${Number(match[1]) + 1} is required`,
  310:           },
  ```
  ```ts
  359:         if (match[2] === 'key' && keyEmpty) {
  360:           return [
  361:             {
  362:               path,
  363:               rule: 'required',
  364:               message: `Entry ${Number(match[1]) + 1} key is required`,
  365:             },
  ```
  ```ts
  54:     form: {
  55:       required: 'Required',
  ...
  63:       remove: 'Remove',
  64:       addItem: 'Add item',
  65:       addEntry: 'Add entry',
  ```
- **严重程度**: P2（可排期）
- **不一致类别**: 文本
- **包 A 模式**: `@nop-chaos/flux-renderers-form-advanced` 在 `array-editor`、`key-value` 的 validation contributor 中直接拼接英文默认错误消息，包括 `Item ... is required`、`Entry ... key is required`、`Entry ... value is required`。
- **包 B 模式**: 基础 form / shared i18n 层已经维护 `flux.form.*`、`flux.conditionBuilder.*`、`flux.validation.*` 双语资源；普通输入渲染器通过共享 field controller / FieldFrame 路径复用字段呈现与错误展示。
- **统一建议**: 为 array/key-value 这类 composite field 的子项 required 错误补齐 `flux.validation` 或 `flux.form` 下的参数化 key，例如 `arrayItemRequired`、`entryKeyRequired`、`entryValueRequired`，并在 `array-editor` / `key-value` 中通过 `t('flux....', { index, label })` 生成消息；不要扩大为全仓库机械 i18n 清理。
- **现状**: advanced form 包已经部分使用 `t('flux.form.remove')`、`t('conditionBuilder.requiredMessage')` 等共享资源，但同一包内的核心校验错误仍直接拼英文；这会导致中文资源存在时，复合字段的 required 错误仍固定显示英文。
- **风险**: 表单校验错误展示路径在基础字段与复合字段之间产生用户可见分叉；后续新增 locale 或统一 validation 文案时需要追踪 renderer-local 拼接逻辑，形成重复维护成本，并可能让产品误以为所有 form validation 已经由 `flux-i18n` 接管。
- **为什么值得现在做**: 这不是单纯“风格统一”：`array-editor` / `key-value` 是表单字段，错误消息直接进入 validation UI；仓库已经存在双语 i18n 与 validation key 基线，修复范围可限定在少数 concrete strings，ROI 高且不会触碰 report-designer -> spreadsheet-renderers 共享复用边界。
- **误报排除**: 已排除测试 fixture、schema 示例、用户可配置 label、以及仍处于合理 domain-owned UI 文案的情况；保留本项是因为这些字符串是 renderer 生成的 validation error，不是 host 自有文案或可解释的临时实现差异。
- **历史模式对应**: 命中 calibration pattern 10“Cross-Package Consistency Ideas Reported As Current Defects”的 stronger-evidence 门槛：不一致已表现为用户可见 validation contract 分叉与重复维护成本；同时与 full-7 维度 18 中“advanced form widget 默认文案分叉”相邻，但当前证据聚焦 live code 中仍存在的 required validation messages，而不是机械复开所有 i18n 清理。
- **参考文档**: `docs/architecture/flux-design-principles.md`, `docs/references/integrating-third-party-components.md`, `docs/references/deep-audit-calibration-patterns.md`, `docs/plans/212-renderer-workbench-contract-and-accessibility-closure-plan.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的问题。深挖结束。
