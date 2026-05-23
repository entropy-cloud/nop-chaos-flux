# 18 跨包模式一致性

## 复核统计

- 初审条目: 3
- 维度复核: 完成
- 子项复核: 1 条
- 保留: 0
- 降级: 3
- 驳回: 0

## 已降级

### [维度18] flow designer host shell 仍有未本地化的用户可见文案

- **涉及包**: `@nop-chaos/flow-designer-renderers` vs `@nop-chaos/report-designer-renderers` / `@nop-chaos/word-editor-renderers`
- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:342-356`, `packages/flow-designer-renderers/src/designer-page.tsx:389-393`
- **证据片段**:
  ```tsx
  345: leftLabel="Expand palette"
  356: rightLabel="Expand inspector"
  ```
  ```tsx
  391: `Create ${pendingCreateDialog?.nodeType.label ?? 'Node'}`
  ```
- **严重程度**: P2
- **不一致类别**: 文本 / i18n
- **包 A 模式**: flow designer 壳层仍直接写英文 fallback label。
- **包 B 模式**: report/word editor 同类壳层标签已走 i18n key。
- **统一建议**: 为 flow designer 补齐 shell labels / create fallback 文案的 i18n key。
- **为什么值得现在做**: 这是用户直接可见的 host-shell 文案，且会被复制到后续 host 包。
- **误报排除**: item review确认问题范围仅限具体 shell labels/fallback copy，不泛化到整包无 i18n。
- **历史模式对应**: peer host shell i18n contract 漂移
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-design-principles.md`
- **复核状态**: `子项复核通过`

### [维度18] word-editor 包内混用了带前缀和不带前缀的 i18n key

- **涉及包**: `@nop-chaos/word-editor-renderers` / `@nop-chaos/flux-i18n`
- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:198-199`, `packages/word-editor-renderers/src/word-editor-page.tsx:447-452`, `packages/word-editor-renderers/src/panels/outline-panel.tsx:198-211`, `packages/flux-i18n/src/i18n.ts:22-24`
- **证据片段**:
  ```tsx
  198: setSaveMessage(t('wordEditor.saved'));
  447: leftLabel={t('wordEditor.expandFieldPanel')}
  ```
  ```tsx
  199: {t('flux.wordEditor.outline')}
  ```
- **严重程度**: P3
- **不一致类别**: 文本
- **包 A 模式**: 同包不同文件混用 `wordEditor.*` 和 `flux.wordEditor.*`。
- **包 B 模式**: shared guidance 期望统一 `flux.` 前缀。
- **统一建议**: 统一到 `flux.wordEditor.*`，normalize helper 仅保留兼容用途。
- **为什么值得现在做**: grep/discovery 与 code review 会更清晰。
- **误报排除**: item review确认当前不会造成功能错误，只是风格/维护性问题。
- **历史模式对应**: i18n helper 容忍多写法后引发风格漂移
- **参考文档**: `AGENTS.md`, `packages/flux-i18n/src/i18n.ts`
- **复核状态**: `已降级`

### [维度18] `flux-code-editor` 的 registration helper 实现仍与其他 renderer 包略有分歧

- **涉及包**: `@nop-chaos/flux-code-editor` vs 其他 renderer packages
- **文件**: `packages/flux-code-editor/src/index.ts:55-61`, `packages/flux-renderers-basic/src/index.tsx:24-28`, `docs/references/integrating-third-party-components.md:398-411`
- **证据片段**:
  ```ts
  57: export function registerCodeEditorRenderers(registry: RendererRegistry) {
  58:   for (const definition of codeEditorRendererDefinitions) {
  59:     registry.register(definition);
  ```
- **严重程度**: P3
- **不一致类别**: 注册模式
- **包 A 模式**: 手写循环注册。
- **包 B 模式**: 使用 `registerRendererDefinitions(registry, defs)` helper。
- **统一建议**: 统一到 shared helper，减少包级例外。
- **为什么值得现在做**: 修复成本小，但当前仅是低优先级一致性整理。
- **误报排除**: item review确认公开 shape 仍一致，差异只在 helper 实现层。
- **历史模式对应**: public package entrypoint drift from shared helper convention
- **参考文档**: `docs/references/integrating-third-party-components.md`
- **复核状态**: `已降级`

## 零发现

- 抽查 `*-core` / `*-renderers` React boundary 当前未见跨包 owner 混乱。
- 抽查 renderer hook baseline 当前未见 contract split。
- 抽查 Zustand vanilla store baseline 当前未见需要报告的不一致。
