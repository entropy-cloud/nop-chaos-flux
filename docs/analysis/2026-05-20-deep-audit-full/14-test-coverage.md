# 维度 14: 测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] report field panel 失败路径测试只断言“出现 warning”，未捕获实现中的重复通知

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx:114-127`, `packages/report-designer-renderers/src/field-panel-renderer.test.tsx:379-389`
- **行号范围**: `field-panel-renderer.tsx:114-127`; `field-panel-renderer.test.tsx:379-389`
- **证据片段**:
  ```tsx
  function handleKeyboardInsertError(error: unknown) {
    reportRuntimeHostIssue({
      env,
      error,
      phase: 'action',
      path: props.path,
      details: {
        operation: 'report-field-panel-insert',
      },
    });
    env.notify?.(
      'warning',
      error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
    );
  }
  ```
  ```tsx
  await waitFor(() => {
    expect(notify).toHaveBeenCalledWith('warning', 'Insert failed');
    expect(reportRuntimeHostIssueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        phase: 'action',
        path: 'page.body.0',
        details: { operation: 'report-field-panel-insert' },
      }),
    );
  });
  ```
- **严重程度**: P1
- **类别**: 验证可信度 / 失败路径质量
- **现状**: 实现先调用 `reportRuntimeHostIssue({ env, error })`，该 helper 默认会 `env.notify(level, message)`，随后又显式调用 `env.notify('warning', ...)`；测试只用 `toHaveBeenCalledWith('warning', ...)`，没有断言调用次数、没有排除默认 `error` 通知。
- **风险**: 失败路径可能在真实 UI 中产生重复 toast 或错误级别与 warning 级别混杂，但当前测试仍会通过；这降低了失败路径测试对用户可见行为的可信度。
- **建议**: 先明确期望行为：若只需要 warning toast，应让 `reportRuntimeHostIssue({ notify: false, ... })` 或移除额外 `env.notify`；同时把测试改为断言 `notify` 调用次数、调用顺序和 level，例如 `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith('warning', ...)`。
- **为什么值得现在做**: 该测试覆盖的是 report designer 字段插入的错误路径，属于跨 renderer/action host 的关键失败面；弱断言会让后续修复误以为失败通知语义已被稳定保护。
- **误报排除**: 这不是“测试没有覆盖所有细节”的泛化抱怨；live code 明确存在两个通知入口，而测试的断言方式恰好无法区分“一个 warning”与“先 error 后 warning”。
- **历史模式对应**: 对应 `docs/skills/deep-audit-prompts.md` 维度 14 的“验证可信度检查”：测试必须断言用户可见结果通道，而不是只证明某个内部 hook/monitor 被调用。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1403-1408`, `docs/references/audit-tooling.md:54`, `AGENTS.md:215-223`
- **复核状态**: 未复核

### [维度14-02] 多个测试内 `spyOn/mockReturnValue` 只在成功路径末尾恢复，失败时会污染同文件后续用例

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:22-30,101-126`
- **行号范围**: `22-30`; `101-126`
- **证据片段**:

  ```tsx
  afterEach(() => {
    cleanup();
    if (originalWindowConfirm.hasOwn) {
      window.confirm = originalWindowConfirm.value;
    } else {
      Reflect.deleteProperty(window, 'confirm');
    }
    vi.useRealTimers();
  });
  ```

  ```tsx
  const providerSpy = vi
    .spyOn(wordEditorActionProvider, 'createWordEditorActionProvider')
    .mockReturnValue({
      kind: 'host',
      listMethods() {
        return ['save'];
      },
      invoke,
    } as any);

  renderWordEditor();
  fireEvent.click(screen.getByRole('button', { name: '保存' }));

  await waitFor(() => {
    expect(invoke).toHaveBeenCalledTimes(1);
    const invokeCall = invoke.mock.calls[0] as unknown[] | undefined;
    const invokeCtx = invokeCall?.[2] as { signal?: AbortSignal } | undefined;
    expect(invokeCtx?.signal).toBeInstanceOf(AbortSignal);
  });

  providerSpy.mockRestore();
  ```

- **严重程度**: P2
- **类别**: 隔离性 / mock 清理
- **现状**: `afterEach` 只清理 DOM、`window.confirm` 和 timers，没有统一 `vi.restoreAllMocks()`；多个用例在测试体内创建 spy，并在最后一行 `mockRestore()`。如果中间 `renderWordEditor()`、点击或 `waitFor` 断言失败，restore 不会执行。
- **风险**: 一条失败用例可能把 `createWordEditorActionProvider` 或 `FluxReact` hook mock 留给后续用例，导致后续失败/通过都不可信；这类污染会让 CI 结果呈现顺序相关和难复现。
- **建议**: 对每个测试内 spy 使用 `try/finally`；或在该文件 `afterEach` 中加入 `vi.restoreAllMocks()`，同时保留必要的显式全局状态恢复；对当前文件中 `providerSpy`、`useHostScopeSpy`、`useRendererEnvSpy` 等同类模式统一收敛。
- **为什么值得现在做**: 该文件测试 Word Editor action、save、status publication、abort、failure reporting 等关键路径，且同文件已有多个手工 spy；隔离不稳会直接降低这些回归测试的诊断价值。
- **误报排除**: 这不是启发式脚本对“用了 mock”的机械报告；问题点在于 restore 位于成功路径末尾，而不是 `finally` 或 `afterEach`，一旦断言抛错就会真实泄漏。
- **历史模式对应**: 对应 `pnpm check:audit-test-global-leaks` 的测试隔离关注方向；虽然该具体模式不是全局 patch suspect 的逐字命中，但属于同一类“测试间隐式共享状态”风险。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1389-1392`, `docs/references/audit-tooling.md:54,72-77`, `AGENTS.md:175-178`
- **复核状态**: 未复核

### [维度14-03] Word Editor renderer 测试跨包导入 `flux-react/src/contexts` 并手工伪造 RendererComponentProps，绕过公开渲染入口

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:17-19,211-244`
- **行号范围**: `17-19`; `211-244`
- **证据片段**:
  ```tsx
  import * as wordEditorActionProvider from '../word-editor-action-provider.js';
  import { WordEditorPage } from '../word-editor-page.js';
  import { RuntimeContext, ScopeContext } from '../../../flux-react/src/contexts.js';
  ```
  ```tsx
  render(
    <RuntimeContext.Provider value={{ env: { notify: vi.fn() } } as any}>
      <ScopeContext.Provider
        value={{
          id: 'word-editor-scope',
          path: '$.body[0]',
          value: {},
          get: () => undefined,
          has: () => false,
          readOwn: () => ({}),
          readVisible: () => ({}),
          materializeVisible: () => ({}),
          update: () => undefined,
          merge: () => undefined,
        } as any}
      >
        <WordEditorPage
          id="word-editor"
          path="$.body[0]"
          schema={{ type: 'word-editor-page' } as any}
          props={{} as any}
          meta={{} as any}
          regions={{} as any}
          events={{ onBack }}
          helpers={{ render: vi.fn(), evaluate: vi.fn(), createScope: vi.fn(), dispatch: vi.fn(), executeSource: vi.fn() } as any}
        />
  ```
- **严重程度**: P2
- **类别**: 一致性 / 验证可信度 / 跨包测试边界
- **现状**: 测试从 sibling package 的 `src/contexts.js` 私有路径导入 React contexts，并直接渲染 `WordEditorPage`，同时手工拼装大量 `RendererComponentProps` 字段和 scope 方法。
- **风险**: 该测试可以在 `createSchemaRenderer`、runtime provider、标准 renderer hooks 或公开 barrel 出现集成问题时继续通过；它同时把 `word-editor-renderers` 的测试耦合到 `flux-react` 内部文件布局，降低重构安全性。
- **建议**: 优先用已有 `renderWordEditor()` / `createSchemaRenderer()` 公开路径覆盖 onBack/onSave 事件；如确需低层单元测试，应在 `flux-react` 暴露受控 test helper，而不是跨包相对导入 `src/contexts` 并伪造完整 runtime props。
- **为什么值得现在做**: Word Editor 是宿主级复杂 renderer，测试应证明它在真实 SchemaRenderer/runtime contract 下工作；当前绕过路径会让 renderer contract 回归被漏报。
- **误报排除**: 低代码动态边界允许 `any` 出现在 schema/runtime 测试中；本发现不针对 `any` 本身，而针对跨包私有源码路径 + 绕过公开渲染入口造成的验证失真。
- **历史模式对应**: 对应 calibration 中“Public Renderer Dependencies On Core Runtime Packages”需要更强证据的模式；这里的问题不是依赖公开 API，而是测试直接引用 `flux-react/src/contexts.js` 私有源码路径并绕过公开 contract。
- **参考文档**: `AGENTS.md:118-143`, `docs/skills/deep-audit-prompts.md:1403-1408`, `docs/references/deep-audit-calibration-patterns.md:54-60`
- **复核状态**: 未复核

### [维度14-04] Flow Designer 连线创建 E2E 只覆盖 synthetic test hook，缺少真实用户拖拽建边路径

- **文件**: `tests/e2e/flow-designer-edge-creation.spec.ts:10-31`
- **行号范围**: `10-31`
- **证据片段**:

  ```ts
  test('synthetic connect event updates the live edge count', async ({ page }) => {
    await openFlowDesigner(page);

    const edgeCount = page.locator('.react-flow__edge');
    await expect(edgeCount).toHaveCount(6);
    await expect(page.getByText('6 个节点')).toBeVisible();
    await expect(page.getByText('6 条连线')).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('nop-designer:test-connect', {
          detail: {
            source: 'task-1',
            target: 'end-1',
          },
        }),
      );
    });
  ```

- **严重程度**: P2
- **类别**: E2E 可信度 / 覆盖缺口
- **现状**: 当前连线创建 spec 明确通过 `page.evaluate()` 派发 `nop-designer:test-connect` 自定义事件来增加边数；它验证了内部 test hook 到状态更新的链路，但没有覆盖用户从 React Flow handle 拖拽到目标节点的真实交互。
- **风险**: handle 命中区域、pointer/mouse 事件、React Flow connection lifecycle、画布缩放/坐标转换、阻止非法连接等真实用户路径回归时，该 E2E 仍可能通过。
- **建议**: 保留 synthetic hook 测试作为快速集成测试，但新增一个真实用户拖拽建边 E2E：定位 source/target handle，使用 Playwright mouse/pointer 操作完成连接，并断言边 DOM、计数、JSON/状态摘要均更新。
- **为什么值得现在做**: Flow Designer 的“创建连线”是核心交互；当前 E2E 已覆盖删除边和 synthetic connect，但没有覆盖最容易受 CSS、React Flow、布局坐标影响的真实建边路径。
- **误报排除**: 测试标题已声明 `synthetic`，所以这不是“测试名称与行为不匹配”；问题是覆盖缺口：当前没有等价的真实用户建边 E2E 来支撑端到端可信度。
- **历史模式对应**: 直接命中维度 14 新增“验证可信度检查”中的 test hook / 直接 dispatch 绕过 UI 层路径。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1403-1408`, `docs/testing/e2e-standards.md:7-21,33-46`, `AGENTS.md:27-35`
- **复核状态**: 未复核

## 测试覆盖统计摘要

- 自动化基线（主 agent 已提供）：`pnpm check:oversized-code-files` 为 80 个 `>500` warning、0 errors；大量 warning 是测试文件。
- `pnpm check:audit-test-global-leaks` 为 11 suspects。
- `test-module-top-let` suspects: `packages/flux-code-editor/src/use-code-mirror.test.tsx:12`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx:8`, `packages/report-designer-renderers/src/field-panel-renderer.test.tsx:15-17`。
- `test-global-patch` suspects: `apps/playground/src/pages/performance-table/measurement.test.ts:62/83`, `packages/flux-react/src/__tests__/schema-renderer-runtime-scope.test.tsx:165/203`, `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:25/168`。
- 本轮 live code 复核结论：`use-code-mirror.test.tsx` 的 module-top mock state 在 `beforeEach/afterEach` 中重置，初审未作为发现保留。
- 本轮 live code 复核结论：`detail-view-owner-updates.test.tsx` 的 `viewerMountCount` 只用于 lifecycle probe 用例且在用例内重置，初审未作为发现保留。
- 本轮 live code 复核结论：`performance-table/measurement.test.ts` 和 `schema-renderer-runtime-scope.test.tsx` 的全局 patch 使用 `try/finally` 恢复，初审未作为发现保留。
- 本轮 live code 复核结论：`word-editor-page-actions.test.tsx` 中 `window.confirm` 有 afterEach 恢复，但同文件多处 spy restore 仍依赖成功路径，因此保留为 [维度14-02]。
- 按当前文件扫描估算：packages 下约 520 个 `*.test.ts(x)` / `*.spec.ts(x)`，测试代码约 119,728 行。
- 按当前文件扫描估算：apps 下约 18 个 Vitest 测试文件，测试代码约 2,060 行。
- 按当前文件扫描估算：`tests/e2e` 下约 43 个 Playwright spec，测试代码约 7,375 行。
- 覆盖较重：`flux-runtime` 86 个测试文件 / 约 25,961 行；`flux-renderers-form-advanced` 68 个 / 约 17,785 行；`flux-react` 45 个 / 约 10,944 行；`flux-renderers-data` 32 个 / 约 9,575 行；`flux-compiler` 29 个 / 约 8,276 行。
- 覆盖较轻但非零：`flux-bundle` 1 个 / 约 91 行；`tailwind-preset` 1 个 / 约 67 行；`theme-tokens` 1 个 / 约 58 行；`flux-i18n` 2 个 / 约 264 行。
- 本轮未发现 `packages/*` 中测试文件数量为 0 的包。
- 当前存在大量超过 400 行的测试文件，且至少有数十个超过 500 行；这与主 agent 的 oversized baseline 一致。
- 本轮没有把“测试文件大”单独作为发现，因为 `docs/references/deep-audit-calibration-patterns.md` 要求大文件必须同时证明职责漂移、隔离风险或验证失真；本轮仅在存在具体隔离/验证风险时报告。

## 覆盖缺口清单

- Flow Designer: 缺少真实用户拖拽创建连线 E2E；当前只有 synthetic `nop-designer:test-connect` 路径，详见 [维度14-04]。
- Report Designer: 字段面板失败路径测试没有断言通知调用次数和 level，导致重复通知或错误级别漂移无法被捕获，详见 [维度14-01]。
- Word Editor: 部分 action tests 使用私有 context 和伪造 renderer props，覆盖了组件局部行为，但没有充分证明公开 `SchemaRenderer` 集成入口，详见 [维度14-03]。
- Word Editor: 同文件 spy 清理依赖成功路径，失败时可能影响后续用例，详见 [维度14-02]。
- E2E 支撑面: `tests/e2e` 已普遍使用 `tests/e2e/fixtures.ts` 的 zero-error gate；本轮未发现 supported spec 直接从 `@playwright/test` 导入 `test` 的问题。
- E2E 支撑面: 仍存在 skipped/debug/exploratory spec 和诊断输出文件，初审未列为独立发现，但建议后续轮次单独评估是否需要迁移到非默认 E2E suite 或文档化用途。

## 优先级排序建议

1. 先修 [维度14-01]：失败路径弱断言已对应 live code 中可见的重复通知风险，ROI 最高。
2. 再修 [维度14-02]：把 Word Editor action tests 的 spy 清理改为 `try/finally` 或 `afterEach vi.restoreAllMocks()`，提升整文件稳定性。
3. 再修 [维度14-04]：为 Flow Designer 增加真实用户拖拽建边 E2E，保留 synthetic hook 测试但不要让它代表完整端到端覆盖。
4. 最后修 [维度14-03]：收敛跨包私有 context 导入和手工 props 伪造测试，改用公开 renderer/runtime test helper，减少测试对内部实现布局的耦合。
