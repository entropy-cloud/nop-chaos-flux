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

## 深挖第 10 轮追加

### [维度14-14] 支持中的 Component Lab E2E 仍把 `scope-debug-json` 调试渲染器当成主要断言通道，端到端可信度失真

- **文件**: `tests/e2e/component-lab/complex-form.spec.ts:183-199`, `tests/e2e/component-lab/simple-form.spec.ts:49-79`, `tests/e2e/component-lab/action-logic.spec.ts:83-90`, `packages/flux-renderers-basic/src/scope-debug.tsx:49-68`
- **行号范围**: `complex-form.spec.ts:183-199`; `simple-form.spec.ts:49-79`; `action-logic.spec.ts:83-90`; `scope-debug.tsx:49-68`
- **证据片段**:
  ```tsx
  test('read: simple condition builder publishes its preloaded rule shape into scope state', async ({
    page,
  }) => {
    ...
    await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText('"field": "status"');
    await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText('"operator": "eq"');
    await expect(stage.locator('[data-slot="scope-debug-json"]')).toContainText('"value": "active"');
  });
  ```
  ```tsx
  const scopeDebug = stage.locator('[data-slot="scope-debug-json"]');
  ...
  await expect(scopeDebug).toContainText('"errorCount": 1');
  await expect(scopeDebug).toContainText('"valid": false');
  ...
  await expect(scopeDebug).toContainText('"secretCode": "alpha-42"');
  ```
  ```tsx
  const scopeText = useScopeSelector((scopeData) => stringifyDebugValue(scopeData));
  ...
  <div data-slot="scope-debug-body">
    <pre data-slot="scope-debug-json">{scopeText}</pre>
  </div>
  ```
- **严重程度**: P1
- **类别**: 验证可信度 / E2E 断言通道
- **现状**: 多个受支持的 Playwright E2E 直接断言 `[data-slot="scope-debug-json"]`。其中 `condition-builder` 用例几乎完全依赖这个调试 `<pre>` 的 JSON 文本来证明规则已渲染；`simple-form` 也把 `errorCount/valid/secretCode` 的正确性主要交给 debug dump 验证。该节点来自 `ScopeDebugRenderer`，本质是把 `useScopeSelector` 读到的内部 scope 状态序列化后输出。
- **风险**: 这类 E2E 可以在“内部 scope 数据正确、但真实用户可见表单/条件构建 UI 渲染错误、文案错误、交互错误”时继续通过；反过来，若仅 debug 序列化格式变化而用户行为未坏，测试又会误报。结果是 suite 对真实端到端行为给出虚高信心。
- **建议**: 将这些用例的主断言改为用户可见结果通道：例如 condition-builder 断言实际规则行/字段标签/operator/value 控件已渲染；hidden-required 场景断言错误提示出现/消失、提交结果文本或表单控件状态变化。`scope-debug-json` 最多保留为辅助诊断，不应作为 supported E2E 的主要成功判据。
- **为什么值得现在做**: 这是维度 14 明确新增的“验证可信度检查”命中项，而且影响的是已纳入默认 E2E 套件的 component-lab 场景，不是孤立调试脚本。
- **误报排除**: 这不是泛泛反对 `page.evaluate` 或任何内部探针。问题点更具体：这些 spec 直接把名为 `scope-debug-json` 的调试渲染器当作核心 oracle；而实现文件也明确表明它只是 scope 数据的 JSON dump，不是面向用户的稳定结果通道。

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

## 深挖第 2 轮追加

### [维度14-05] flow-designer-renderers 的 package test 脚本遗漏 3 个已提交测试文件

- **文件**: `packages/flow-designer-renderers/package.json:24-28`, `packages/flow-designer-renderers/src/designer-page.graph-regression.test.tsx:13-17`, `packages/flow-designer-renderers/src/designer-page.tree-history.test.tsx:16-18`, `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.test.tsx:8-10`
- **行号范围**: `package.json:24-28`; `designer-page.graph-regression.test.tsx:13-17`; `designer-page.tree-history.test.tsx:16-18`; `ding-flow-add-node-menu.test.tsx:8-10`
- **证据片段**:
  ```json
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node ../../scripts/copy-build-assets.mjs src/designer-theme.css dist/designer-theme.css",
    "typecheck": "tsc -p tsconfig.json",
    "test": "set NODE_OPTIONS=--max-old-space-size=8192 && vitest run --passWithNoTests src/designer-controls.test.tsx src/designer-page-shell.test.tsx src/designer-page.tree.test.tsx src/index.xyflow.test.tsx src/edge-label-expression.test.tsx src/auto-layout-guards.test.tsx && vitest run --passWithNoTests src/designer-provider-and-manifest.test.tsx src/canvas-bridge.test.tsx src/edge-label-xyflow.test.tsx src/designer-command-adapter.test.ts src/designer-command-adapter.tree.test.ts src/designer-page.resolved-props.test.ts src/designer-page-helpers.test.ts src/public-surface.test.ts && vitest run --passWithNoTests src/dingflow/ding-flow-add-branch-overlay.test.tsx src/dingflow/dingflow-overlays.test.ts src/dingflow/dingflow-command-dispatch.test.ts src/designer-xyflow-canvas/use-xyflow-sync.test.tsx src/designer-xyflow-canvas/xyflow-utils.test.ts",
    "lint": "eslint src --ext .ts,.tsx --cache --cache-location node_modules/.cache/eslint"
  }
  ```
  ```tsx
  describe('DesignerPageRenderer graph mode regression', () => {
    it('graph mode still works correctly', () => {
  ```
- **严重程度**: P1
- **类别**: 覆盖缺口 / CI 验证可信度
- **现状**: `packages/flow-designer-renderers` 没有使用默认 `vitest run` 发现全部测试，而是在 `package.json` 中手工枚举测试文件；当前枚举未包含已存在的 `src/designer-page.graph-regression.test.tsx`、`src/designer-page.tree-history.test.tsx`、`src/dingflow/ding-flow-add-node-menu.test.tsx`。
- **风险**: `pnpm test` / turbo package test 会跳过这 3 个回归测试，导致 graph mode regression、tree history continuity、DingFlow add-node menu 键盘导航等关键路径即使损坏也不会被默认测试门禁发现；后续开发者可能误以为这些回归已有 CI 保护。
- **建议**: 将该 package 的 `test` 脚本改回可自动发现的 `vitest run --passWithNoTests`，或至少把 3 个遗漏文件加入当前分段命令；同时增加一个轻量脚本/约束检查，防止手工枚举测试列表再次与实际 `*.test.ts(x)` 文件漂移。
- **误报排除**: 这不是“测试文件数量少”或“手工枚举不优雅”的泛化问题；live `package.json` 的 test 命令确实没有包含上述 3 个已提交测试文件，而这些文件包含实际 `describe/it` 用例，不是 helper、fixture 或跳过的草稿文件。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1380-1384,1403-1408`, `AGENTS.md:27-31,175-178`, `package.json:21`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度14-06] Vitest 覆盖率阈值配置未接入默认 `pnpm test` 门禁，阈值实际不会被执行

- **文件**: `package.json:21-22`, `packages/flux-runtime/package.json:27-31`, `packages/flux-runtime/vitest.config.ts:5-15`
- **行号范围**: `package.json:21-22`; `packages/flux-runtime/package.json:27-31`; `packages/flux-runtime/vitest.config.ts:5-15`
- **证据片段**:
  ```json
  "test": "turbo run test --concurrency=2",
  "test:e2e": "playwright test",
  ```
  ```json
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run --passWithNoTests",
    "lint": "eslint src --ext .ts,.tsx --cache --cache-location node_modules/.cache/eslint"
  },
  ```
  ```ts
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**'],
    thresholds: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
  ```
- **严重程度**: P2
- **类别**: 覆盖质量 / CI 验证可信度
- **现状**: 多个 package 的 `vitest.config.ts` 配置了 `coverage.thresholds`，但 root `pnpm test` 只运行 `turbo run test`，各 package 的 `test` 脚本也只是 `vitest run` / `vitest run --passWithNoTests`，没有 `--coverage` 或独立 `test:coverage` 门禁；Vitest 覆盖率阈值只有在启用 coverage 时才会执行。
- **风险**: 维护者容易误以为 80% 覆盖率阈值已经被默认测试门禁保护，但实际 `pnpm test` 可以在覆盖率大幅下降时继续通过；这会削弱 runtime、compiler、renderer 等核心包的覆盖率回归防线，并让覆盖率配置变成“看起来存在但不生效”的假护栏。
- **建议**: 明确二选一收敛：要么新增并接入 `pnpm test:coverage` / package `test:coverage`，在关键包执行 `vitest run --coverage` 并让阈值失败进入 CI；要么从普通 config 中移除或注释这些阈值，改成文档化的手动审计命令，避免默认测试门禁产生误导。
- **误报排除**: 这不是要求所有包都必须追求固定覆盖率数字，也不是报告当前覆盖率不足；问题点是 live config 已声明阈值，而默认验证路径没有启用 coverage，导致阈值本身不可达。前两轮已覆盖“测试文件遗漏”和“弱断言/隔离性”，本条是独立的覆盖率门禁真实性问题。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1380-1384,1403-1408`, `AGENTS.md:27-31,203-210`, `docs/references/audit-tooling.md:13-19`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度14-07] Report Designer 多个失败路径测试仍只断言 warning 命中，无法发现 `reportRuntimeHostIssue` 默认 error 通知与显式 warning 的重复 toast

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:350-363`, `packages/report-designer-renderers/src/page-renderer.test.tsx:301-305`, `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:213-227`, `packages/report-designer-renderers/src/report-spreadsheet-canvas.test.tsx:157-174`
- **行号范围**: `page-renderer.tsx:350-363`; `page-renderer.test.tsx:301-305`; `report-spreadsheet-canvas.tsx:213-227`; `report-spreadsheet-canvas.test.tsx:157-174`
- **证据片段**:
  ```tsx
  reportRuntimeHostIssue({
    env,
    error,
    phase: 'render',
    path: props.path,
    details: {
      schemaPath: props.path,
      operation: 'resolveReportDesignerPageInputs',
      invalidProps: issues,
    },
  });
  env.notify?.('warning', error.message);
  ```
  ```tsx
  await waitFor(() => {
    expect(fieldSourceProvider.load).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('warning', 'field sources exploded');
    expect(onError).toHaveBeenCalled();
  });
  ```
  ```tsx
  reportRuntimeHostIssue({
    env,
    error,
    phase: 'action',
    path: 'report-designer.spreadsheet-canvas',
    details: {
      operation: 'report-field-drop',
      sheetId,
    },
  });
  env.notify?.('warning', getFailureMessage(error));
  ```
  ```tsx
  await waitFor(() => {
    expect(spreadsheetBridge.dispatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'spreadsheet:setCellValue',
        value: '${amount}',
      }),
    );
    expect(spreadsheetBridge.dispatch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'spreadsheet:clearCells',
        clearValues: true,
      }),
    );
    expect(testMocks.notify).toHaveBeenCalledWith('warning', 'designer rejected drop');
    expect(testMocks.reportRuntimeHostIssue).toHaveBeenCalled();
  });
  ```
- **严重程度**: P1
- **类别**: 验证可信度 / 失败路径质量
- **现状**: 第 1 轮已覆盖 `field-panel-renderer` 的同类弱断言；继续复核发现 `page-renderer` 初始化/非法输入失败路径、`report-spreadsheet-canvas` 字段 drop 回滚失败路径也存在同一结构：实现先调用未设置 `notify: false` 的 `reportRuntimeHostIssue({ env, error })`，该 helper 默认会 `env.notify('error', message)`，随后又显式调用 `env.notify('warning', ...)`。对应测试只断言 warning 被调用，或 mock 掉 `reportRuntimeHostIssue` 后断言它“被调用”，没有验证真实通知调用次数、顺序和 level。
- **风险**: Report Designer 关键失败路径在真实运行时可能同时出现 error toast 与 warning toast，但当前测试仍会通过；字段源加载失败、非法 page props、字段 drop 回滚失败都属于用户可见故障面，重复/错级通知会降低错误恢复体验并污染监控信号。
- **建议**: 对这些失败路径统一明确通知 contract：如果只期望 warning，应在 `reportRuntimeHostIssue` 调用中传 `notify: false`，或移除后续显式 warning；测试侧改为使用真实 `reportRuntimeHostIssue` 行为并断言 `notify` 的 `toHaveBeenCalledTimes(1)`、调用顺序和 level。对于需要同时监控和 warning toast 的路径，测试应显式断言 monitor 被调用但 notify 不重复。
- **为什么值得现在做**: 这不是新增功能覆盖缺口，而是已有失败路径测试给出了“已覆盖”的假信心；第 1 轮只列出 field panel 一个点，live code 显示同一模式已扩散到页面初始化和 spreadsheet canvas drop 路径，值得一次性收敛。
- **误报排除**: `reportRuntimeHostIssue` 的实现明确在 `input.notify !== false` 时调用 `input.env.notify(level, message)`，默认 level 为 `error`；上述调用没有传 `notify: false`，因此不是理论上的重复风险。测试断言 `toHaveBeenCalledWith('warning', ...)` 也确实无法排除额外 error 调用。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1403-1408`, `docs/references/audit-tooling.md:54`, `AGENTS.md:215-223`
- **复核状态**: 未复核

## 维度复核结论

- [维度14-01]: 保留 (P1)。`packages/report-designer-renderers/src/field-panel-renderer.tsx:114-127` 仍先 `reportRuntimeHostIssue(...)` 再 `env.notify('warning', ...)`，而 `field-panel-renderer.test.tsx:379-389` 仍只断言 warning 命中，无法排除重复通知。
- [维度14-02]: 保留 (P2)。`packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx` 的多处 `spyOn(...).mockReturnValue(...)` / hook spies 仍在测试成功路径末尾 `mockRestore()`，而 `afterEach` 仍未统一 `vi.restoreAllMocks()`。
- [维度14-03]: 保留 (P2)。同一测试文件仍从 `../../../flux-react/src/contexts.js` 导入私有 context，并手工伪造 `WordEditorPage` 的完整 renderer props，验证路径仍绕过公开 runtime/render 入口。
- [维度14-04]: 保留 (P2)。`tests/e2e/flow-designer-edge-creation.spec.ts:10-32` 仍只覆盖 `nop-designer:test-connect` synthetic hook，没有真实拖拽建边 E2E。
- [维度14-05]: 保留 (P1)。`packages/flow-designer-renderers/package.json:24-28` 的手工枚举 test 脚本仍未包含已存在的 `designer-page.graph-regression.test.tsx`、`designer-page.tree-history.test.tsx`、`ding-flow-add-node-menu.test.tsx`。
- [维度14-06]: 保留 (P2)。root `package.json:21-22` 仍只跑普通 `pnpm test`，`packages/flux-runtime/package.json:27-31` 仍是 `vitest run --passWithNoTests`，而 `vitest.config.ts:5-15` 的 coverage thresholds 仍未被默认门禁触发。
- [维度14-07]: 保留 (P1)。`packages/report-designer-renderers/src/page-renderer.tsx:350-363` 与 `report-spreadsheet-canvas.tsx:213-227` 仍存在 `reportRuntimeHostIssue + explicit warning notify` 双通道；对应测试 `page-renderer.test.tsx:301-305`、`report-spreadsheet-canvas.test.tsx:157-174` 仍只做弱 warning 断言。
- [维度14-08]: 保留 (P2)。mutation testing 入口仍是文档化但非默认门禁的独立脚本，且当前配置/CI 路径未把它变成可失败的常规质量护栏。
- [维度14-09]: 保留 (P1)。`check:flux-bundle-pack` 仍未接入 root `check` / `lint` / CI 默认路径，包产物完整性校验护栏依旧是手动命令。
- [维度14-10]: 保留 (P1)。GitHub CI 仍未运行 `pnpm check`，默认流水线继续遗漏整组 workspace/static audit guards。
- [维度14-11]: 保留 (P1)。`set NODE_OPTIONS=... && ...` 仍是 Windows 风格写法；在 Linux CI shell 下不会按预期设置 `NODE_OPTIONS`。
- [维度14-12]: 保留 (P2)。workspace/package 默认测试路径仍广泛依赖 `--passWithNoTests`，继续削弱“测试被实际发现并执行”的信号强度。
- [维度14-13]: 保留 (P2)。Playwright 仍未在默认配置中启用 `forbidOnly`，误提交 `.only` 的护栏仍不够硬。
- [维度14-14]: 保留 (P1)。supported component-lab E2E 仍把 `[data-slot="scope-debug-json"]` 当主断言通道，端到端可信度问题未收敛。

### [维度14-08] mutation testing 入口有文档化但 `break: 0` 且 CI 不运行，质量门禁实际不可失败

- **文件**: `package.json:14`, `stryker.runtime.conf.mjs:5-22`, `.github/workflows/ci.yml:65-99`, `docs/architecture/frontend-baseline.md:142-149`
- **行号范围**: `package.json:14`; `stryker.runtime.conf.mjs:5-22`; `.github/workflows/ci.yml:65-99`; `frontend-baseline.md:142-149`
- **证据片段**:

  ```json
  "audit:mutants": "stryker run stryker.runtime.conf.mjs --plugins @stryker-mutator/vitest-runner",
  ```

  ```js
  mutate: [
    'packages/flux-runtime/src/validation/*.ts',
    '!packages/flux-runtime/src/validation/index.ts',
    '!packages/flux-runtime/src/validation/*.test.ts',
  ],
  testFiles: ['packages/flux-runtime/src/validation/*.test.ts'],
  ...
  thresholds: {
    high: 80,
    low: 60,
    break: 0,
  },
  ```

  ```yml
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      ...
      - run: pnpm test

  e2e:
    name: E2E
    runs-on: ubuntu-latest
    steps:
      ...
      - run: pnpm test:e2e
  ```

  ```md
  - `pnpm audit:mutants` - Stryker mutation-test entry point for the current `flux-runtime/src/validation` pilot using an isolated Vitest config
  ```

- **严重程度**: P2
- **类别**: 测试质量门禁 / mutation coverage 可信度
- **现状**: 仓库根脚本和架构文档都把 `pnpm audit:mutants` 作为当前 `flux-runtime/src/validation` mutation-test pilot 入口，但 Stryker 配置的 `thresholds.break` 为 `0`，即使 mutation score 极低也不会让命令因阈值失败；CI workflow 只运行 `pnpm test` 和 `pnpm test:e2e`，没有运行 `pnpm audit:mutants`。
- **风险**: validation 这类高风险规则代码即使新增测试只覆盖执行路径、不杀死关键 mutants，也不会被任何默认门禁捕获；维护者看到 `high: 80 / low: 60` 和文档化 mutation pilot，容易误以为 mutation quality 已有保护，但实际不会阻断回归。
- **建议**: 如果该 pilot 要作为质量门禁，应把 `thresholds.break` 提升到明确的最低可接受值，并在 CI 增加独立 job 或定期 gate 运行 `pnpm audit:mutants`；如果暂时只是手动诊断工具，应在文档和脚本命名中明确“非门禁”，避免与默认测试质量保证混淆。
- **为什么值得现在做**: 第 3 轮已发现 coverage thresholds 没有接入默认 test；本条是独立的 mutation testing 真实性问题：即使手动运行 mutation 入口，当前阈值也不会失败。它直接影响 validation pilot 的测试质量信号，而不仅是覆盖率数字。
- **误报排除**: 这不是要求所有包都必须启用 mutation testing；问题点在于 live repo 已提供并文档化 mutation pilot，但配置 `break: 0` 使其不具备失败门禁语义，CI 也没有补充运行该入口。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1380-1384,1403-1408`, `docs/architecture/frontend-baseline.md:142-149`, `AGENTS.md:175-178`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度14-09] 文档列为质量门禁的 `check:flux-bundle-pack` 未接入 root `check/lint` 或 CI，facade tarball artifact 回归不会被默认验证捕获

- **文件**: `docs/architecture/frontend-baseline.md:104-111,131-140`, `package.json:8,21,36,47,53`, `.github/workflows/ci.yml:31-63`
- **行号范围**: `frontend-baseline.md:104-111,131-140`; `package.json:8,21,36,47,53`; `.github/workflows/ci.yml:31-63`
- **证据片段**:

  ```md
  - the repo-owned tarball output convention is `dist-packages/`
  - `pnpm check:flux-bundle-pack` validates the real packed tarball shape, not only local `dist/`
    ...
    The repository should keep these checks passing:
  - `pnpm build`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm lint`
  - `pnpm check:flux-bundle-pack`
  ```

  ```json
  "check": "pnpm check:react19 && pnpm check:src-artifacts && pnpm check:oversized-code-files && pnpm check:active-doc-code-anchors && pnpm check:package-css-exports && pnpm check:i18n-keys && pnpm check:workspace-manifest-deps && pnpm check:schema-prop-coverage && pnpm check:audit-suspects",
  "test": "turbo run test --concurrency=2",
  "check:flux-bundle-pack": "node scripts/check-flux-bundle-pack.mjs",
  "lint": "node scripts/clean-src-artifacts.mjs && node scripts/verify-no-src-artifacts.mjs && node scripts/check-react19-legacy-apis.mjs && node scripts/check-active-doc-code-anchors.mjs && node scripts/check-package-css-exports.mjs && node scripts/check-renderer-definition-fields-only.mjs && node scripts/check-finite-prop-contracts.mjs && node scripts/check-i18n-keys.mjs && node scripts/check-schema-prop-coverage.mjs && turbo run lint",
  ```

  ```yml
  build:
    name: Build
    ...
    - run: pnpm build

  lint:
    name: Lint
    ...
    - run: pnpm lint
  ```

- **严重程度**: P2
- **类别**: CI artifact validation mismatch / 测试质量门禁可信度
- **现状**: `frontend-baseline.md` 把 `pnpm check:flux-bundle-pack` 明确列为应保持通过的仓库质量门禁，并说明它验证真实 packed tarball shape；但 root `pnpm check`、`pnpm lint`、`pnpm test` 均未运行该脚本，GitHub CI 的 build/lint/test/e2e jobs 也没有运行它。该命令只作为独立脚本存在。
- **风险**: facade package `@nop-chaos/flux` 的 tarball 内容、packed manifest、CSS entry、peer dependency shape 或 dist artifact 发生回归时，默认 PR CI 仍可能全绿；维护者看到 owner doc 中的“quality gate”容易误以为真实发布 artifact 已被 CI 保护。
- **建议**: 将 `pnpm check:flux-bundle-pack` 接入 CI（建议 build job 后追加独立 step，或纳入 root `pnpm check`），并确保失败阻断 PR；如果暂不作为默认门禁，应从 `frontend-baseline.md` 的“repository should keep these checks passing”中降级为手动 release check，并明确非 CI gate。
- **误报排除**: 这不是重复报告覆盖率阈值或 mutation gate 不生效；本条针对的是已文档化的发布 tarball artifact 验证与默认 CI 实际执行不一致。`scripts/check-flux-bundle-pack.mjs` 确实会读取 packed tarball 中的 `package/dist/index.js`、`index.d.ts`、`style.css` 和 packed `package.json`，但 `.github/workflows/ci.yml` 没有调用该入口。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1403-1406`, `docs/architecture/frontend-baseline.md:104-111,131-140`, `docs/references/audit-tooling.md:38`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度14-10] GitHub CI 未运行文档化的 `pnpm check` 健康门禁，workspace manifest / oversized 等硬检查不会阻断 PR

- **文件**: `package.json:8,21,47`, `.github/workflows/ci.yml:48-80`, `docs/references/audit-tooling.md:23-41`
- **行号范围**: `package.json:8,21,47`; `.github/workflows/ci.yml:48-80`; `docs/references/audit-tooling.md:23-41`
- **证据片段**:

  ```json
  "check": "pnpm check:react19 && pnpm check:src-artifacts && pnpm check:oversized-code-files && pnpm check:active-doc-code-anchors && pnpm check:package-css-exports && pnpm check:i18n-keys && pnpm check:workspace-manifest-deps && pnpm check:schema-prop-coverage && pnpm check:audit-suspects",
  "test": "turbo run test --concurrency=2",
  ...
  "lint": "node scripts/clean-src-artifacts.mjs && node scripts/verify-no-src-artifacts.mjs && node scripts/check-react19-legacy-apis.mjs && node scripts/check-active-doc-code-anchors.mjs && node scripts/check-package-css-exports.mjs && node scripts/check-renderer-definition-fields-only.mjs && node scripts/check-finite-prop-contracts.mjs && node scripts/check-i18n-keys.mjs && node scripts/check-schema-prop-coverage.mjs && turbo run lint",
  ```

  ```yml
  lint:
    name: Lint
    ...
    - run: pnpm lint

  test:
    name: Test
    ...
    - run: pnpm test
  ```

  ```md
  | `pnpm check` | Health gate plus audit suspects | Runs structural guard scripts, schema property coverage, and `check:audit-suspects`. Fails only on hard gate failures; suspect output is informational. |
  ...
  | `pnpm check:workspace-manifest-deps` | ... | Workspace source imports not declared in local package manifests |
  | `pnpm check:schema-prop-coverage` | ... | JSON-visible schema properties lacking authored-test coverage |
  ```

- **严重程度**: P1
- **类别**: CI 验证可信度 / hard gate 接入缺口
- **现状**: `docs/references/audit-tooling.md` 将 `pnpm check` 定义为 health gate，且 root `check` 包含 `check:workspace-manifest-deps`、`check:oversized-code-files`、`check:audit-suspects` 等默认健康检查；但 GitHub CI 只有 `pnpm lint`、`pnpm test`、`pnpm build`、`pnpm typecheck`、`pnpm test:e2e`、`pnpm format:check`，没有任何 job 运行 `pnpm check`。`pnpm lint` 虽覆盖部分脚本，但没有覆盖 `check:workspace-manifest-deps` 和 `check:oversized-code-files`。
- **风险**: PR 可以在缺失 workspace package manifest 依赖、代码文件重新超过 oversized hard gate、或 audit suspect 基线出现重大漂移时仍通过 CI；维护者看到 `pnpm check` 被文档定义为 health gate，容易误以为这些验证已由默认 CI 执行，导致本地偶发执行与 PR 门禁之间产生可信度落差。
- **建议**: 在 `.github/workflows/ci.yml` 增加独立 `check` job 或在 lint job 中显式运行 `pnpm check`；如果担心 suspect 输出不应阻断，保持当前脚本语义即可，因为 `check:audit-suspects` 按文档为 informational exit 0，而 hard gate 失败仍会阻断。若不准备接入 CI，则应把 `docs/references/audit-tooling.md` 中 `pnpm check` 的 gate 语义降级为本地手动检查，并明确 CI 不覆盖的脚本清单。
- **误报排除**: 这不是重复报告 `check:flux-bundle-pack` 未接入 CI；本条聚焦 root `pnpm check` 本身作为已文档化 health gate 未被 CI 调用，且 `lint` 并非等价替代：它没有运行 `check:workspace-manifest-deps` / `check:oversized-code-files` / `check:audit-suspects`。也不是要求 suspect 输出变成失败门禁，当前 `pnpm check` 已区分 hard gate 与 informational suspect。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1380-1384,1403-1408`, `docs/references/audit-tooling.md:23-41`, `AGENTS.md:27-31`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度14-11] Linux CI 实际不会应用两个 package `test` 脚本里声明的 `NODE_OPTIONS` 内存上限，重型套件的稳定性保护形同虚设

- **文件**: `packages/flow-designer-renderers/package.json:24-28`, `packages/flux-renderers-data/package.json:27-31`, `.github/workflows/ci.yml:65-80`
- **行号范围**: `flow-designer-renderers/package.json:24-28`; `flux-renderers-data/package.json:27-31`; `.github/workflows/ci.yml:65-80`
- **证据片段**:
  ```json
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node ../../scripts/copy-build-assets.mjs src/designer-theme.css dist/designer-theme.css",
    "typecheck": "tsc -p tsconfig.json",
    "test": "set NODE_OPTIONS=--max-old-space-size=8192 && vitest run --passWithNoTests ...",
  }
  ```
  ```json
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc -p tsconfig.json",
    "test": "set NODE_OPTIONS=--max-old-space-size=8192 && vitest run --passWithNoTests",
  }
  ```
  ```yml
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      ...
      - run: pnpm test
  ```
  复核命令输出：
  ```bash
  set NODE_OPTIONS=--max-old-space-size=8192 && python -c "import os; print(os.environ.get('NODE_OPTIONS'))"
  # => None
  ```
- **严重程度**: P2
- **类别**: CI 验证可信度 / 测试稳定性
- **现状**: 两个 package 的 `test` 脚本使用的是 Windows `cmd` 风格的 `set NODE_OPTIONS=... && ...`。但 GitHub CI `test` job 跑在 `ubuntu-latest`，默认 shell 为 bash；在 bash 下该写法不会把 `NODE_OPTIONS` 注入后续 `vitest run` 进程，实测环境变量保持未设置。
- **风险**: 维护者会误以为大套件已在 8 GB Node 堆限制下执行，实际 CI 完全没有应用这层保护。随着 flow-designer / data-renderers 用例继续增长，内存回归、OOM 或随机崩溃会直接表现为难复现的 CI 不稳定，而脚本表面上又给出了“已加内存保护”的假信心。
- **建议**: 将这两个脚本改为跨平台写法，例如 `NODE_OPTIONS=--max-old-space-size=8192 vitest run ...`（配合 `cross-env`）或使用 Node 包装脚本统一设置环境变量；并在 Linux CI 路径上保留一次 focused proof，避免后续再回退到 `set ... &&`。
- **误报排除**: 这不是泛泛地批评“脚本写法不优雅”。证据链是完整的：live package script 使用 Windows `set ... &&`，CI 明确在 Ubuntu 上执行 `pnpm test`，且在当前 bash 环境中同样写法实测得到 `NODE_OPTIONS=None`，说明内存设置确实未生效。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1403-1406`, `docs/references/audit-tooling.md:27-28`, `AGENTS.md:27-31`
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度14-12] workspace 默认 `--passWithNoTests` 让整包“零发现测试”也能在 CI 中通过，`pnpm test` 缺少最小存在性门禁

- **文件**: `package.json:21`, `packages/flux-runtime/package.json:30`, `packages/flux-core/package.json:18`, `apps/playground/package.json:12`
- **行号范围**: `package.json:21`; `packages/flux-runtime/package.json:30`; `packages/flux-core/package.json:18`; `apps/playground/package.json:12`
- **证据片段**:
  ```json
  "test": "turbo run test --concurrency=2"
  ```
  ```json
  "test": "vitest run --passWithNoTests"
  ```
  ```json
  "test": "vitest run --passWithNoTests"
  ```
- **严重程度**: P2
- **类别**: CI 验证可信度 / 测试门禁真实性
- **现状**: root `pnpm test` 通过 turbo 执行各 workspace 的 `test` 脚本，而当前 packages/apps 的默认模式普遍是 `vitest run --passWithNoTests`。这意味着某个包一旦因测试文件被误删、重命名、移动出发现范围、或配置漂移导致“0 tests found”，该包仍会绿过。
- **风险**: 与 [维度14-05] 的“某个包当前已漏跑部分测试”不同，这是一条更底层的门禁缺口：即使没有手工枚举测试文件，整包测试发现失败也不会阻断 PR。后续任何包的整组测试静默消失时，CI 仍可能显示 `pnpm test` 全绿，削弱默认回归保护的可信度。
- **建议**: 对默认应有测试的 workspace 去掉 `--passWithNoTests`；若确有少数允许零测试的例外包，单独白名单化或使用单独脚本，而不是把宽松语义作为全仓默认。至少应让 root test gate 能在“某包 0 tests discovered”时失败。
- **误报排除**: 这不是泛泛批评“测试少”或重复 [维度14-05] 的漏跑变体；问题点是 live CI gate 的脚本语义本身允许“整包零测试发现”成功退出，属于独立的测试门禁真实性缺陷。
- **参考文档**: `docs/skills/deep-audit-prompts.md:1380-1384,1403-1408`, `AGENTS.md:27-31`
- **复核状态**: 未复核

## 深挖第 9 轮追加

### [维度14-13] Playwright E2E 门禁未启用 `forbidOnly`，误提交 `test.only`/`describe.only` 时 CI 仍可能绿过

- **文件**: `playwright.config.ts:46-57`, `package.json:21-23`, `.github/workflows/ci.yml:82-99`
- **行号范围**: `playwright.config.ts:46-57`; `package.json:21-23`; `.github/workflows/ci.yml:82-99`
- **证据片段**:
  ```ts
  export default defineConfig({
    testDir: './tests/e2e',
    timeout: 45_000,
    fullyParallel: true,
    workers: 2,
    retries: 0,
    reporter: 'list',
    use: {
      baseURL: baseUrl,
  ```
  ```json
  "test": "turbo run test --concurrency=2",
  "test:e2e": "playwright test",
  "test:e2e:headed": "playwright test --headed",
  ```
  ```yml
  e2e:
    name: E2E
    runs-on: ubuntu-latest
    steps:
      ...
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
  ```
- **严重程度**: P1
- **类别**: CI 验证可信度 / E2E 门禁真实性
- **现状**: Playwright 配置中没有 `forbidOnly`，root `test:e2e` 也没有追加等价 CLI 保护；CI 直接运行 `pnpm test:e2e`。这意味着一旦有人误提交 `test.only(...)` 或 `describe.only(...)`，E2E job 可能只执行被聚焦的少数用例而不失败。
- **风险**: PR/主干 CI 会呈现“E2E 全绿”的假象，但实际大部分端到端回归路径被静默跳过；这类问题尤其容易在临时调试后遗留，直接削弱默认 E2E 门禁的可信度。
- **建议**: 在 `playwright.config.ts` 显式加入 `forbidOnly: !!process.env.CI`；如需本地保留 focused run 能力，也应至少保证 CI 路径强制失败。可再补一个轻量静态检查，防止 `.only` 漏入提交。
- **为什么值得现在做**: 这是典型“门禁看起来存在、但可被一行 focused test 静默绕过”的高杠杆问题；修复成本极低，但能显著提升整套 E2E 结果的可信度。
- **误报排除**: 这不是要求仓库当前必须存在 `.only` 才能报告；问题点是默认 CI gate 缺少防逃逸保护。与 [维度14-05]/[14-10]/[14-12] 不同，本条关注的是“已运行的 E2E 套件可被 focused test 静默缩小”而非“某些测试未被接入”或“零测试允许通过”。
- **复核状态**: 未复核

## 子项复核结论

- [维度14-01] 至 [维度14-14]: 均成立。复核后主要收敛为四类：弱断言/私有测试入口、漏跑测试、默认门禁未接入或不可失败、CI/跨平台脚本可信度缺口；未见需要再驳回的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                                     |
| ----- | -------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 14-01 | P1       | `packages/report-designer-renderers/src/field-panel-renderer.tsx:114-127`        | field panel 失败路径测试仍无法排除重复通知                     |
| 14-02 | P2       | `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx` | Word Editor tests 仍依赖成功路径末尾 `mockRestore()`           |
| 14-03 | P2       | `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx` | Word Editor tests 仍绕过公开 runtime/render 入口               |
| 14-04 | P2       | `tests/e2e/flow-designer-edge-creation.spec.ts:10-32`                            | Flow Designer 仍缺真实拖拽建边 E2E                             |
| 14-05 | P1       | `packages/flow-designer-renderers/package.json:24-28`                            | 手工枚举 test 脚本仍遗漏 3 个已提交测试文件                    |
| 14-06 | P2       | `package.json:21-22`                                                             | coverage thresholds 仍未接入默认 `pnpm test` 门禁              |
| 14-07 | P1       | `packages/report-designer-renderers/src/page-renderer.tsx:350-363`               | Report Designer 多个失败路径测试仍只做弱 warning 断言          |
| 14-08 | P2       | `stryker.runtime.conf.mjs:5-22`                                                  | mutation testing 入口仍文档化但非默认可失败门禁                |
| 14-09 | P1       | `package.json` / `scripts/check-flux-bundle-pack.mjs`                            | `check:flux-bundle-pack` 仍未接入默认 check/lint/CI            |
| 14-10 | P1       | `.github/workflows/ci.yml`                                                       | GitHub CI 仍未运行 `pnpm check`                                |
| 14-11 | P1       | `packages/flow-designer-renderers/package.json`                                  | Windows 风格 `set NODE_OPTIONS=... &&` 仍会在 Linux CI 下失效  |
| 14-12 | P2       | `package.json` / 多个 package `test` 脚本                                        | 默认测试路径仍广泛依赖 `--passWithNoTests`                     |
| 14-13 | P2       | `playwright.config.ts:46-57`                                                     | Playwright 默认门禁仍未启用 `forbidOnly`                       |
| 14-14 | P1       | `tests/e2e/component-lab*.spec.ts`                                               | supported component-lab E2E 仍把 scope-debug-json 当主断言通道 |
