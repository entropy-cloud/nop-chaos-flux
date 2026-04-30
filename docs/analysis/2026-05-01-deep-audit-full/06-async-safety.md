# 06 异步模式与取消安全

## 复核结论

- 保留: 2
- 降级: 2
- 驳回: 0

## 保留

### async `adapter.out` 缺少 stale-result guard

- 文件: `packages/flux-renderers-form/src/field-utils.tsx`
- 结论: 保留，P1
- 依据: `adapter.out(...)` 异步 resolve 后直接 `setValue` / `scope.update`，没有 generation / request id / abort guard；较慢的旧 promise 可覆盖新输入。

### word editor save 可重入且失败反馈弱

- 文件: `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/word-editor-renderers/src/word-editor-action-provider.ts`
- 结论: 保留，P1
- 依据: 按钮和快捷键都可触发 save；无 in-flight guard；页面层没有可靠 busy/error 状态，`saveEvent` 失败后用户反馈很弱。

## 已降级

### object-field `transformOut` 卸载后晚到提交风险

- 文件: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- 结论: 已降级
- 依据: 问题真实但范围比初审窄，form-owned path 有部分 disposed guard，主要风险集中在非 form owner 路径。

### word-count 空 `catch` 属低风险 observability 缺口

- 文件: `packages/word-editor-renderers/src/editor-canvas.tsx`, `packages/word-editor-renderers/src/preview/doc-preview-page.tsx`
- 结论: 已降级
- 依据: 影响的是装饰性字数统计，不是核心数据一致性路径。
