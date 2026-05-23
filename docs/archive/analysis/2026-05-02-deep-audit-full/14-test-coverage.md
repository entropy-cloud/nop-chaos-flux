# 14 测试覆盖与质量

## 复核统计

- 初审条目: 4
- 维度复核: 完成
- 子项复核: 3 条
- 保留: 4
- 降级: 1
- 驳回: 0

## 覆盖统计摘要

- 所有 workspace package 当前都有测试文件。
- `tests/e2e` 当前包含 30 个 Playwright spec。
- 主要 gap 不在“零测试包”，而在特定高风险场景缺少 focused E2E 或 focused helper regression tests。

## 保留

### [维度14] `schema-renderer-runtime-core.test.tsx` 既超 700 行又跨多个测试域

- **文件**: `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx:38-741`
- **证据片段**:
  ```ts
  39:   it('compiles runtime boundary flags for form, scope, provider, and class alias changes', () => {
  348:   it('reads published data-source status summaries through useDataSourceStatus', async () => {
  663:   it('skips FieldFrame when frameWrap is false', () => {
  689:   it('does not fabricate a cid for createNodeInstance when none is provided', async () => {
  ```
- **严重程度**: P2
- **类别**: 跨域 / oversized
- **现状**: 同一测试文件混合 import/classAlias fast path、data source、FieldFrame、cid/node-instance 等多个域。
- **建议**: 与维度 02 一致，按主题拆分成多个 focused runtime/react suite。
- **为什么值得现在做**: 当前已同时命中测试质量和文件边界问题。
- **误报排除**: item review确认它不只是“大”，而是明显跨域。
- **历史模式对应**: omnibus integration spec
- **参考文档**: `AGENTS.md`
- **复核状态**: `子项复核通过`

### [维度14] `designer-command-adapter.test.ts` 把 graph adapter 与 tree-owner 场景混在一起

- **文件**: `packages/flow-designer-renderers/src/designer-command-adapter.test.ts:63-596`
- **证据片段**:
  ```ts
  63: describe('createDesignerCommandAdapter', () => {
  64:   it('normalizes shared command results for reconnect success and rejection', () => {
  347: describe('insertChainNode in tree mode', () => {
  443:   it('updates the source TreeDocument when a tree owner is provided', () => {
  ```
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 同文件既测通用 graph adapter，又测 tree owner projection / mutation。
- **建议**: 至少拆成 graph adapter 和 tree-mode 两组。
- **为什么值得现在做**: split seam 非常明显，能减少后续 fixture 复杂度。
- **误报排除**: 不是单一窄 API surface 的 scenario matrix。
- **历史模式对应**: adapter spec 吸入相邻 domain tests
- **参考文档**: `docs/architecture/flow-designer/design.md`
- **复核状态**: `维度复核通过`

### [维度14] 缺少 cross-field / conditional validation 的 E2E 断言

- **文件**: `tests/e2e/component-lab/simple-form.spec.ts:103-127`, `packages/flux-renderers-form/src/__tests__/form-validation-rules.test.tsx:10-173`
- **证据片段**:
  ```ts
  103: test('write: mismatched password fields keep the live masked values after submit', async ({
  119:   // custom validation may not fire in current runtime
  124:   await stage.getByRole('button', { name: 'Set Password' }).click();
  125:   await expect(newPasswordInput).toHaveValue('password123');
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: password confirm 场景存在但并未断言 cross-field validation；仓库 E2E 中也未找到 `equalsField` / `notEqualsField` / `requiredWhen` / `requiredUnless` 的浏览器级断言。
- **建议**: 新增一个 focused Playwright spec 覆盖 cross-field/conditional validation。
- **为什么值得现在做**: 这些规则是 validation model 的核心场景，目前只靠 unit/UI test 守护。
- **误报排除**: item review确认 gap 在 E2E 层，而不是“完全无测试”。
- **历史模式对应**: 核心规则只有 unit-level guard，缺少 browser-level regression
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `子项复核通过`

### [维度14] `validation-lowering.ts` 只有间接覆盖，没有 focused helper regression tests

- **文件**: `packages/flux-compiler/src/validation-lowering.ts:35-208`, `packages/flux-compiler/src/validation-collection.test.ts:177-193`, `packages/flux-compiler/src/validation-collection.test.ts:335-351`
- **证据片段**:
  ```ts
  35: export function collectSchemaValidationRules(schema: BaseSchema): ValidationRule[] {
  154: export function normalizeValidationTriggers(
  167: export function normalizeValidationVisibilityTriggers(
  195: export function compileValidationRules(
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 当前测试只间接验证少量 happy path，没有直接 import/命名这些 helper 做 focused regression。
- **建议**: 新增 `validation-lowering.test.ts`，覆盖 rule extraction breadth、trigger normalization、compileValidationRules 细节。
- **为什么值得现在做**: 这是 form validation lowering 的稳定 seam，值得有专门回归保护。
- **误报排除**: item review确认已有 indirect coverage，因此不是零测试；问题仅是缺少 focused helper coverage。
- **历史模式对应**: exported helper 只有集成性覆盖
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度14] `validation-lowering.ts` 的问题应定性为“focused direct tests 缺口”，而不是“完全无覆盖”

- **文件**: `packages/flux-compiler/src/validation-lowering.ts:35-208`, `packages/flux-compiler/src/validation-collection.test.ts:177-193`, `packages/flux-compiler/src/validation-collection.test.ts:335-351`, `packages/flux-compiler/src/validation-collection.test.ts:393-409`
- **证据片段**:
  ```ts
  177:   it('collects validation rules from schema', () => {
  335:   it('respects form-level validateOn and showErrorOn', () => {
  393:   it('lets child validation behavior override inherited form behavior', () => {
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: `validation-lowering.ts` 已有少量间接覆盖，但缺少直接命名 helper 的 focused regression tests。
- **建议**: 保留当前 P2 gap 定位，补一组 focused helper tests 即可。
- **为什么值得现在做**: 该项真实问题在于 coverage precision，不在于 zero coverage。
- **误报排除**: item review已确认间接用例确实存在。
- **历史模式对应**: coverage gap 被过度上升
- **参考文档**: `AGENTS.md`
- **复核状态**: `已降级`

## 零发现

- 未发现零测试包。
- 未发现 repo-wide `jest.fn()`/Vitest 双栈混用。
- 未发现显著的 `.only`、全局 mock 未清理或顺序依赖模式。
