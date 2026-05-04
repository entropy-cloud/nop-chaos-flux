# 对抗性审查报告 — 2026-05-04 (第七轮: V9 无障碍用户 + V-new 构建工具链)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。

---

## 视角选择

- **V9 无障碍用户** — 此前报告只零星提及 aria-label 缺失，未系统检查 focus management、live region、label association。
- **V-new 构建/工具链审计**（新增视角）— 从未被使用。检查 tsconfig、依赖版本、构建配置中的隐藏风险。

---

## V9 发现：无障碍深度审计

### 发现 1：验证错误无 `aria-live` 通告 (CRITICAL)

**在哪里**

- `packages/flux-renderers-form/src/renderers/shared/error.tsx:8`

**是什么**

`FieldError` 组件渲染为 `<span data-slot="field-error">`，无 `role="alert"` 或 `aria-live="assertive"`。当表单验证错误动态出现时，屏幕阅读器**不会主动通告**用户有新错误。用户必须手动导航到错误位置才能发现。

**为什么值得关心**

这是 WCAG 2.1 SC 4.1.3 (Status Messages) 的直接违规。对于盲人用户，表单提交后不知道哪里出错，无法完成操作。

**严重度**: CRITICAL  
**信心水平**: 确定。

---

### 发现 2：`FieldLabel` 使用 `<span>` 而非 `<label>` — 无 label-input 关联 (CRITICAL)

**在哪里**

- `packages/flux-renderers-form/src/renderers/shared/label.tsx:12`

**是什么**

标签渲染为 `<span data-slot="field-label">`，没有 `<label>` 元素和 `htmlFor` 属性。Inputs 用 `aria-label` 作为回退，但：

- 点击标签文本**不会聚焦**到对应输入框
- 屏幕阅读器在表单模式下可能不关联标签与控件

**为什么值得关心**

WCAG 2.1 SC 1.3.1 (Info and Relationships) 和 SC 4.1.2 (Name, Role, Value) 违规。这是最基础的表单无障碍要求。

**严重度**: CRITICAL  
**信心水平**: 确定。

---

### 发现 3：Condition Builder 删除按钮仅 hover 可见 + 无 accessible name (HIGH)

**在哪里**

- `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx:141-148`

**是什么**

删除按钮使用 `opacity-0 group-hover:opacity-100` 样式，对键盘用户**永远不可见**（键盘无法触发 hover）。且按钮只含 `<Trash2Icon>` 无 `aria-label`。

**修复方案**: 改为 `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100` + 添加 `aria-label={t('flux.conditionBuilder.removeCondition')}`。

**严重度**: HIGH  
**信心水平**: 确定。

---

### 发现 4：Array Field 增删操作无 focus 管理 (HIGH)

**在哪里**

- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:279-303`

**是什么**

`handleAdd()` 后 focus 停留在 Add 按钮，`handleRemove()` 后 focus 丢失（回到 body）。键盘用户在长列表中操作会频繁迷路。

**修复方案**: Add 后 focus 到新增项的第一个输入；Remove 后 focus 到相邻项或 Add 按钮。

**严重度**: HIGH  
**信心水平**: 确定。

---

### 发现 5：Tree 渲染器缺少 ARIA tree role 语义 (MEDIUM)

**在哪里**

- `packages/flux-renderers-data/src/tree-renderer.tsx:209-229`

**是什么**

Tree 使用 `<div>` 而非 `role="tree"` / `role="treeitem"` / `role="group"`。缺少 `aria-expanded` 在节点层面。标准树键盘导航（Up/Down/Left/Right 箭头键）未实现。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

### 发现 6：Table 排序状态缺少 `aria-sort` (MEDIUM)

**在哪里**

- `packages/flux-renderers-data/src/table-renderer.tsx:420-437`

**是什么**

可排序表头无 `aria-sort="ascending|descending|none"` 属性，屏幕阅读器用户无法知道当前排序状态。

**严重度**: MEDIUM  
**信心水平**: 中高。

---

### 发现 7：加载状态无 `role="status"` 通告 (MEDIUM)

**在哪里**

- `packages/flux-renderers-data/src/table-renderer/table-loading-overlay.tsx:10-11`

**是什么**

加载覆盖层无 `aria-live="polite"` 或 `role="status"`。数据加载/完成状态对屏幕阅读器不可见。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

## V-new 发现：构建/工具链审计

### 发现 8：双 TypeScript 版本并存 (HIGH)

**在哪里**

- 根 `package.json` devDependencies

**是什么**

同时安装 `@typescript/native-preview: 7.0.0-dev.20260421.2` 和 `@typescript/typescript6: ^6.0.0`。`AGENTS.md` 声称 "TypeScript 6.0" 但存在 7.0-dev。不清楚 `pnpm typecheck` 使用哪个版本。两个版本的类型检查行为可能不同，导致本地/CI 结果不一致。

**严重度**: HIGH  
**信心水平**: 确定（配置可见）。实际影响取决于 `tsc` 的 resolve 路径。

---

### 发现 9：`ignoreDeprecations: "6.0"` 抑制迁移警告 (MEDIUM)

**在哪里**

- `tsconfig.base.json:19`

**是什么**

静默允许 TS 6.0 废弃特性，可能掩盖真实配置问题。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

### 发现 10：无 project references — 类型错误不级联 (MEDIUM)

**在哪里**

- `tsconfig.base.json`（无 `references`）
- 各包 tsconfig.json（无 `composite: true`）

**是什么**

每个包独立 `tsc --noEmit`，依赖包的类型变更不会自动触发下游包的重新检查。`flux-core` 改了一个接口签名，`flux-runtime` 可能在下次独立 typecheck 前不知道。

`AGENTS.md` 提到 "Add to tsconfig.json project references" 但实际未实现。

**严重度**: MEDIUM  
**信心水平**: 确定。

---

### 发现 11：tsconfig paths 缺少部分包 (LOW)

**在哪里**

- `tsconfig.base.json:20-47`

**是什么**

`@nop-chaos/flux-renderers-form-advanced` 和 `@nop-chaos/flux-i18n` 不在 paths map 中。IDE go-to-definition 可能无法解析这些包的 source。

**严重度**: LOW  
**信心水平**: 确定。

---

## 总评

### 最值得关注的方向

1. **表单无障碍基础缺失**（发现 1、2）— `FieldError` 无 live region + `FieldLabel` 无 `<label>` 是整个表单系统的基础性无障碍缺陷。影响所有使用表单的页面，修复方案明确（改 HTML 元素 + 加 role）。

2. **键盘用户被排除的交互模式**（发现 3、4）— hover-only 可见性和无 focus management 使得键盘用户在复杂表单操作中无法正常工作。这不是 "nice to have" 而是 "无法使用"。

3. **构建配置的隐藏脆弱性**（发现 8、10）— 双 TS 版本 + 无 project references 意味着构建正确性依赖于执行顺序和环境，而非配置保证。

### 盲区自评

- 未检查 `flux-react` 中的 `DialogHost` / `DrawerHost` 是否正确管理 focus trap。
- 未检查 color contrast（需要运行时渲染才能验证）。
- 未检查 pnpm-workspace.yaml 中是否有包被遗漏导致 phantom dependencies。
- 未验证 `vite.workspace-alias.ts` 的别名与 tsconfig paths 是否完全一致。

**建议下次视角**：V-new2（依赖安全审计 — 检查依赖版本是否有已知 CVE）或 V12（未来破坏者）深入 SSR/RSC 兼容性。

---

## 新增视角记录

| 编号  | 视角            | 核心问题                                    | 典型发现类型                                |
| ----- | --------------- | ------------------------------------------- | ------------------------------------------- |
| V-new | 构建/工具链审计 | "构建配置中是否有隐藏的正确性/一致性问题？" | tsconfig 不一致、依赖版本冲突、打包配置缺陷 |
