# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] 4（实为 7）个 >700 行文件触发 check:oversized-code-files 退出码 1

- **文件**: grid-selection.test.tsx(797)、chart-renderer.unit.test.tsx(767)、runtime-sources-refresh.test.ts(741)、infinite-scroll.test.tsx(704) ＋ form-store.ts(744)、form-runtime-owner.ts(728)、node-compiler.ts(701)
- **证据片段**:
  ```
  [check-oversized-code-files] ERROR: 7 files exceed 700 lines (MUST split): ... ; exit=1
  ```
- **严重程度**: P0
- **现状**: >700 硬门禁失败。初审只列了 4 个测试文件；复核修正 ERROR 清单共 7 个文件（4 测试 + 3 源文件）。仅修 4 个测试文件不会让门禁转绿。
- **风险**: CI 红线持续。calibration pattern #1 明示"越过 >700 硬规则"是保留 finding 合法条件。
- **建议**: 按现有 describe 边界纯文件移动拆分测试文件；form-store.ts 拆 page/surface store（见维度 02）；form-runtime-owner.ts/node-compiler.ts 有文档化决策注释但门禁不豁免，需拆分或引入显式豁免机制。
- **误报排除**: 实测退出码=1，非已通过门禁重复报告。
- **复核状态**: 维度复核通过并修正（保留 P0，4→7 文件）→ AUDIT-01。

### [维度14-02] flow-designer-core 与 spreadsheet-core 缺 coverage 阈值（实为 4 包）

- **文件**: `packages/flow-designer-core/vitest.config.ts`、`packages/spreadsheet-core/vitest.config.ts`（+ tailwind-preset、theme-tokens）
- **证据片段**:
  ```ts
  export default createSharedVitestConfig({ environment: 'node' }); // 无 coverage.thresholds
  ```
- **严重程度**: P2（初审）→ P3（复核降级）
- **现状**: 24 包有阈值，4 包无。flow-designer-core/spreadsheet-core 是非平凡核心包；tailwind-preset/theme-tokens 是纯配置包。初审漏算 2 包。
- **风险**: 核心运行时回归覆盖空洞静默通过 CI；破坏"核心包均受覆盖率保护"一致性。
- **建议**: 给 flow-designer-core/spreadsheet-core 补 ≥70% 阈值；配置包可保留无阈值。
- **复核状态**: 降级 P2→P3，修正 4 包 → AUDIT-18。

### [维度14-03] 17（实为 18）个测试文件冗余声明 @vitest-environment happy-dom

- **文件**: flow-designer-renderers/src/\*.test.tsx、flux-bundle/src/index.test.tsx
- **证据片段**:
  ```tsx
  // @vitest-environment happy-dom   // 包级 vitest.config.ts 已设 environment:'happy-dom'
  ```
- **严重程度**: P3
- **现状**: 文件级 pragma 与包级配置完全重复。复核修正为 18 个文件。
- **建议**: 清理冗余 pragma，统一包级配置。
- **复核状态**: 维度复核通过（保留 P3，修正 17→18）→ AUDIT-19。

### [维度14-04] apps/playground 缺 coverage 阈值

- **文件**: `apps/playground/vitest.config.ts`
- **严重程度**: P3
- **现状**: demo/integration 层 19 个测试文件，新增 demo 页无测试不被门禁发现。
- **建议**: 可设较低阈值（如 50%）兜底。
- **复核状态**: 维度复核通过（保留 P3 → AUDIT-20）。

## 维度复核结论

- [14-01]: 保留 P0，修正 4→7 文件 → AUDIT-01。
- [14-02]: 降级 P2→P3，修正 2→4 包（仅 2 核心包值得阈值）→ AUDIT-18。
- [14-03]: 保留 P3，修正 17→18 → AUDIT-19。
- [14-04]: 保留 P3 → AUDIT-20。

所有 test-module-top-let / test-global-patch suspect（21 处）经复核全部正确 cleanup（beforeEach/afterEach/finally），驳回。proof-fidelity 抽样清洁（E2E 主 oracle 是用户可见通道，diagnostic-only spec 已 skip）。

## 最终保留项

| 编号  | 严重程度 | 文件                             | 摘要                                          |
| ----- | -------- | -------------------------------- | --------------------------------------------- |
| 14-01 | P0       | 7 个文件                         | check:oversized-code-files 门禁红（修正 4→7） |
| 14-02 | P3       | 4 个 vitest.config.ts            | 缺 coverage 阈值（降级 P2→P3）                |
| 14-03 | P3       | 18 个测试文件                    | 冗余 @vitest-environment pragma（修正 17→18） |
| 14-04 | P3       | apps/playground vitest.config.ts | 缺 coverage 阈值                              |
