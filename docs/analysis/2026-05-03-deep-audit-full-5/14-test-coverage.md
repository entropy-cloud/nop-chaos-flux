# 14 测试覆盖与质量

- 初审发现数: 8
- 维度复核: 完成
- 子项复核: 3
- 最终结果: 保留 1 / 降级 5 / 驳回 2

## 保留

### [维度14] `document-io.test.ts` 全局 `localStorage` stub 未恢复

- **文件**: `packages/word-editor-core/src/__tests__/document-io.test.ts:40-43`
- **证据片段**:
  ```ts
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock());
  });
  ```
- **严重程度**: P2
- **类别**: 隔离性
- **现状**: 测试文件里全局 stub 了 `localStorage`，但未见 `vi.unstubAllGlobals()` 或等价恢复逻辑。
- **建议**: 在 `afterEach` 里恢复全局对象，并视情况补 `vi.restoreAllMocks()`。
- **为什么值得现在做**: 这是单文件可直接修复的测试隔离风险。
- **误报排除**: 复核已排除大量已经成对恢复 timer/mock 的测试，只保留这一处明确缺口。
- **参考文档**: `AGENTS.md` Testing 章节
- **复核状态**: 维度复核通过

## 已降级

- async data-source controller 缺少聚焦测试: **已降级**
  - 复核发现 `request-runtime-polling.test.ts` 与 `runtime-sources*.test.ts` 已覆盖 controller 主路径；剩余更像 `formula-data-source-controller` 的 seam 测试缺口。
- namespaced/component-target action 缺少 E2E: **已降级**
  - 单元测试覆盖已较强，缺的是浏览器级联调防线。
- `simple-form.spec.ts` 自定义校验用例不验证结果: **已降级**
  - 复核确认这是刻意缩小断言范围的 lab 用例，但仍不提供结果层回归保障。
- `action-dispatcher.test.ts` setup 膨胀: **已降级**
- `import-stack.test.ts` setup 膨胀: **已降级**

## 已驳回

- `runtime-imports.test.ts` 跨域: **已驳回**
- `runtime-scope-actions.test.ts` 跨域: **已驳回**
  - 复核认为两者都仍围绕各自 runtime 集成缝和 action-scope 公共契约，不足以作为“跨域混测”问题。
