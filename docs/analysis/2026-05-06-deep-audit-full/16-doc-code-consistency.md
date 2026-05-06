# 维度 16：文档-代码一致性

## 第 1 轮（初审）

### P2 发现（2 个）

1. schema-file-validator.md 引用已消除的 CompiledSchemaNode（应改为 TemplateNode）
2. renderer-runtime.md hooks 列表与实际公开导出不同步（useCurrentImportFrame 未公开，useCurrentValidationValues 未列出）

### P3 发现（3 个）

1. scope-ownership-and-isolation.md dialog/drawer data 语义未标记为 planned
2. form-validation.md Compilation Sketch Block 可能被误读（已有声明但视觉权重问题）
3. AGENTS.md 路由表路径全部有效（确认通过）

### 正面发现

- flux-runtime-module-boundaries.md 所有 50+ 文件路径全部有效
- terminology.md 的 "formerly" 标注准确

---

# 维度 17：命名与术语一致性

## 第 1 轮（初审）

### P2 发现（1 个）

1. WrappedFieldAction 命名不够描述性（渲染 span role=button，建议 FieldActionButton）

### P3 观察（2 个）

1. useIsMobile 命名（shadcn/ui 上游惯例，保留）
2. create*/register* 工厂函数命名一致（确认通过）

### 正面发现

- is*/has* 前缀仅用于 boolean 返回值
- use* 前缀仅用于 React hooks
- 文件命名统一 kebab-case

---

# 维度 20：可访问性 (WCAG)

## 第 1 轮（初审）

### P2 发现（6 个）

1. Checkbox 渲染器缺少 aria-describedby 关联 visible label
2. Switch 渲染器缺少 label 关联（on/off 文本未通过 ARIA 传递）
3. RadioGroup 缺少 aria-required 和错误消息 role="alert"
4. CheckboxGroup 缺少 role="group" 和 aria-required
5. ConditionBuilder 缺少 ARIA role 结构
6. Table 选择 checkbox 缺少行标识 aria-label

### P3 观察（1 个）

1. WrappedFieldAction span role=button 可接受但非最优

### 正面发现

- FieldFrame 为子控件注入完整 ARIA 属性
- Input/Textarea/Select aria 属性完整
- TreeRenderer 使用正确的 role="tree"/"treeitem"
- Fieldset 可折叠标题键盘交互完整
- ArrayEditor 焦点管理良好
