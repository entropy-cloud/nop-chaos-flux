# 16 文档-代码一致性

## 复核统计

- 初审条目: 4
- 维度复核: 完成
- 子项复核: 4 条
- 保留: 2
- 降级: 2
- 驳回: 0

## 保留

### [维度16] `renderer-runtime.md` 仍文档化已删除的 `instantiate()` / `data` API

- **文档路径**: `docs/architecture/renderer-runtime.md:575-604`, `docs/architecture/renderer-runtime.md:788-801`, `docs/architecture/renderer-runtime.md:820-845`
- **代码路径**: `packages/flux-core/src/types/renderer-hooks.ts:22-37`, `packages/flux-core/src/types/renderer-hooks.ts:57-84`
- **证据片段**:
  ```ts
  interface RenderRegionHandle {
    instantiate(options?: {
      scope?: ScopeRef;
      bindings?: Record<string, unknown>;
    }): React.ReactNode;
  }
  ```
  ```ts
  export interface RenderFragmentOptions {
    bindings?: Record<string, unknown>;
    scope?: ScopeRef;
  }
  ```
- **严重程度**: P1
- **漂移类型**: 行为不一致
- **文档描述**: 文档仍把 `instantiate()` 和 `data?: object` 当作现行 renderer contract。
- **代码现状**: live type surface 已只剩 `render(...)` 与 `bindings`。
- **建议**: 删除过时接口定义、示例和说明。
- **为什么值得现在做**: 这是核心 renderer contract 文档，错误会直接误导实现和审查。
- **误报排除**: item review确认代码层已完全移除这些字段，不是兼容别名。
- **历史模式对应**: 架构文档仍保留已删除 API
- **参考文档**: `docs/index.md`
- **复核状态**: `子项复核通过`

### [维度16] `docs/bugs/README.md` 的 bug note 索引当前遗漏 10 个 live 文件

- **文档路径**: `docs/bugs/README.md:13-44`
- **代码路径**: `docs/bugs/24-word-editor-e2e-tabs-role-mismatch-and-state-divergence-fix.md` 等 10 个未列出的 note
- **证据片段**:
  ```md
  37: - `docs/bugs/19-code-editor-label-click-forwarding-triggers-fullscreen-fix.md`
  44: - `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
  ```
- **严重程度**: P2
- **漂移类型**: 索引过时
- **文档描述**: `Current Entries` 未覆盖当前目录中的全部 bug note。
- **代码现状**: live `docs/bugs/` 下有 40 个 md bug-note/template 文件，README 仅索引其中 30 个。
- **建议**: 重新生成或手动同步 `Current Entries`。
- **为什么值得现在做**: bug history 检索会直接受影响。
- **误报排除**: item review已给出具体缺失文件列表。
- **历史模式对应**: 文档索引未随目录增长更新
- **参考文档**: `docs/index.md`, `AGENTS.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度16] Plan 161 的 Phase 3 已落地，但计划状态仍未同步

- **文档路径**: `docs/plans/161-workspace-quality-and-dx-improvement-plan.md:3-4`, `docs/plans/161-workspace-quality-and-dx-improvement-plan.md:123-140`, `docs/plans/161-workspace-quality-and-dx-improvement-plan.md:215-224`
- **代码路径**: `packages/flux-react/src/dialog-host.tsx:78-93`, `apps/playground/src/App.tsx:15-17`, `packages/word-editor-renderers/src/editor-canvas.tsx:127-134`
- **证据片段**:
  ```md
  3: > Plan Status: proposed
  123: ### Phase 3 - 代码质量修复
  124: Status: planned
  215: Phase 3 已在本 commit (0ebe0acd) 中完成：
  ```
- **严重程度**: P2
- **漂移类型**: 计划状态失真
- **文档描述**: 顶部仍显示 `proposed`，Phase 3 仍是 planned/unchecked。
- **代码现状**: sampled Phase 3 代码已落地，计划正文也写明已完成。
- **建议**: 更新 header、phase 状态与 checklist。
- **为什么值得现在做**: 这是执行文档，不同步会误导后续排期。
- **误报排除**: item review确认该计划并非整体完成，因此只保留为状态漂移。
- **历史模式对应**: plan status 未随 live repo 更新
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`
- **复核状态**: `已降级`

### [维度16] `flux-runtime-module-boundaries.md` 只有局部 inventory 漏项

- **文档路径**: `docs/architecture/flux-runtime-module-boundaries.md:146-153`
- **代码路径**: `packages/flux-runtime/src/projected-scope-store.ts:3`, `packages/flux-runtime/src/status-owner.ts:2,25`, `packages/flux-runtime/src/index.ts:9`
- **证据片段**:
  ```md
  146: - `form-runtime-owner-external-errors.ts`
  148: - `form-runtime-owner-lifecycle.ts`
  150: - `runtime-host-projection-scope.ts`
  152: - `runtime-owned-factories.ts`
  ```
- **严重程度**: P3
- **漂移类型**: owner inventory 轻度不完整
- **文档描述**: 初始 lead 认为缺失多份 active runtime module。
- **代码现状**: 其中四份其实已在文档中，真正遗漏的是 `projected-scope-store.ts` 等个别 live module。
- **建议**: 补齐个别漏项即可，不必按重大 owner drift 处理。
- **为什么值得现在做**: 保持 owner inventory 精确，但优先级低于前两项。
- **误报排除**: item review已驳回“缺多份 active module”的强表述。
- **历史模式对应**: inventory 局部漏项
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `已降级`

## 零发现

- 抽查 `AGENTS.md` route 和 package list 当前仍基本有效。
- 抽查 terminology reference 未发现新的重大 live mismatch。
