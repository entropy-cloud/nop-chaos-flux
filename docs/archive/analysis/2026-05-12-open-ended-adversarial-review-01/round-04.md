# 开放式对抗性审查 — 2026-05-12 — 第四轮

> 审查方式：继续按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 去重背景：前几轮覆盖 data state bridge、table slot、hidden policy；本轮切到 UI interaction。已回查 `docs/references/reopened-design-decisions-and-audit-adjudications.md`，本轮不涉及已裁定的 wrapped secondary action 非 labelable 问题。
> 本轮切入点：form advanced tree controls 中，`readOnly` 和键盘操作是否与鼠标操作、同族 `tree-select` 保持同等保护。

---

## 发现 1：`input-tree` 接收 `readOnly` 但没有禁用选项交互，read-only 字段仍会写表单值

**在哪里**

- `InputTreeRenderer` 把 `readOnly` 传入 `useFormFieldController()`：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:162-168`
- 但传给 `TreeOptionList` 的 `disabled` 只包含 `presentation.effectiveDisabled` 和 loading，不包含 `presentation.readOnly`：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:185-194`
- `TreeOptionNode` 只根据 `disabled` 决定是否绑定 click/key handlers：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:48-55`
- controller 在 `disabled === false` 时会直接 `onChange(toggleTreeSelection(...))`：`packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:66-72`
- 同文件里的 `tree-select` trigger/clear button 已经把 `presentation.readOnly` 纳入 disabled 条件：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:241-248,261-268`

**是什么**

`input-tree` 看起来支持 read-only，因为它把 `readOnly` 交给了 form field controller。但这个状态没有进入实际 option list 的 disabled gate。最终只要字段不是 disabled、options 也不在 loading，用户仍可以点击或键盘激活 tree item，触发：

```ts
onChange(toggleTreeSelection(value, option.value, multiple));
```

这和同族 `tree-select` 的行为不一致：`tree-select` 的 trigger 和 clear button 都显式在 read-only 时禁用。

**为什么值得关心**

read-only 是 field interaction contract，不是视觉提示。`input-tree` 在 read-only 下仍可变更值，会导致：

1. schema 作者以为该字段不可编辑，用户却能修改提交值。
2. 表单 dirty/touched/validation 可能被 supposedly read-only 控件触发。
3. 同族控件 `tree-select` 与 `input-tree` 行为分叉，增加作者和测试维护成本。

**信心水平**：确定

---

## 发现 2：tree option chevron 只阻止 click 冒泡，键盘激活 chevron 可能同时选择 tree item

**在哪里**

- 外层 `treeitem` 是 focusable，并在 `onKeyDown` 中处理 Enter/Space 作为选择：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:48-55`、`packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:74-83`
- 内层 chevron 是一个 `Button`，只绑定了 `onClick={handleChevronClick}`：`packages/flux-renderers-form-advanced/src/tree-controls.tsx:57-75`
- `handleChevronClick` 只 `event.stopPropagation()` click 事件，不处理 keydown：`packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:98-101`

**是什么**

鼠标点击 chevron 时，click 冒泡被阻止，因此只展开/折叠，不会选择节点。但键盘用户 focus 到 chevron button 后按 Enter/Space，button 自己会触发 click，同时 keydown 仍可能冒泡到父级 `treeitem`。父级 `handleKeyDown()` 看到 Enter/Space 后会执行 `handleSelect()`。

结果是“键盘展开/折叠”可能同时变成“选择该节点”。鼠标路径和键盘路径语义不等价。

**为什么值得关心**

这是可访问性和数据正确性的组合问题：

1. 键盘用户无法可靠地只展开/折叠 tree branch。
2. 在单选树里可能误选节点；在多选树里可能误 toggle checkbox 值。
3. 该问题只出现在键盘事件路径，常规 click 测试不会覆盖。

**信心水平**：很可能

---

## 本轮小结

本轮确认 tree controls 中有两条同源交互漏洞：状态 gate 和事件 gate 都只覆盖了部分路径。`input-tree` 的 disabled gate 忘了纳入 read-only；chevron 的事件隔离只覆盖 mouse click，未覆盖 keyboard activation。两者都会把“看似不可编辑/只展开”的交互变成实际 value mutation。

## 本轮盲区自评

- 本轮没有审查所有 form advanced 控件的 read-only 实现，只验证了 tree family。
- 第二条键盘冒泡结论基于 React/DOM 事件路径和代码静态分析，尚未用 Testing Library 做 focused probe。
- 下一轮适合对其它 UI/renderer 做一次 fresh sweep；如果没有新的非重复高价值问题，应停止。
