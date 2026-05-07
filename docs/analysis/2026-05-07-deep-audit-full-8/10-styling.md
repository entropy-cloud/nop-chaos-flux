# 维度 10: 样式系统合规性

## 深挖轮次

- 第 1 轮: spreadsheet toolbar styles in canvas CSS.
- 第 2 轮: spreadsheet global CSS namespace/theme issues, report field panel selector candidates.
- 第 3 轮: word/code/form/flow CSS, WorkbenchShell, hardcoded theme candidates.
- 第 4 轮: NodeErrorBoundary inline styles, debugger inline styles, input-number raw button.
- 第 5 轮: flex/container semantic layout candidate.

## 维度复核结论

### 保留

- spreadsheet CSS namespace/theme risks, with spreadsheet canvas exception applied.
- report field panel CSS/data-slot self-styled widget accepted but tracked as package CSS scope.
- word/code/form/flow widget CSS/global hardcoded values retained as package-owned widget styling follow-up, not layout renderer violation.
- WorkbenchShell hardcoded layout retained as shell design issue, not schema layout renderer violation.
- debugger inline styles retained as devtool style consolidation issue.
- input-number raw button styling retained under UI component rule, not pure style violation.

### 降级

- NodeErrorBoundary inline styles: core fallback UI should migrate to class/token Alert-like styling, but not layout renderer contract violation.
- flow designer hardcoded inline/canvas styles: widget/canvas allowed, tokenization can improve.

### 驳回

- `container` / `flex` semantic props: explicit schema semantic layout props are allowed; root marker defaults are not implicit `gap-4` style violation.
- report field panel bare data-slot as violation: `data-slot` is recommended selector protocol.

## 最终保留项

- Prioritize asset/copy and namespace/global leakage issues from dimensions 01/03.
- Migrate core fallback UI and package CSS globals incrementally; do not treat `container/flex` semantic props as defect.
