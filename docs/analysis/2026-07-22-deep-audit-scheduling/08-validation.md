# Dimension 08: Validation System Consistency

## Findings

### [D08-01] Missing validation contributor — barcode-input bypasses form validation

- **File**: `scheduling-renderer-definitions.ts:166-176`
- **Severity**: P1
- **Evidence**: No `validation` property on barcode-input definition. Compiler never collects `required`, `minLength`, `maxLength`, `pattern`, `validate` rules.
- **Recommendation**: Add validation contributor.

### [D08-02] Barcode-input onChange blocks input instead of integrating validation

- **File**: `barcode-input/barcode-input.tsx:105-113`
- **Severity**: P2
- **Evidence**: Client-side input guard blocks keystrokes violating minLength/maxLength/pattern. Prevents form value from being set, so validation rules can never fire.
- **Recommendation**: Replace blockers with validation lifecycle calls. Let FieldFrame display errors.

### [D08-03] Missing FieldFrame chrome fields in barcode-input schema

- **File**: `barcode-input/barcode-input-schemas.ts:3-16`
- **Severity**: P3
- **Evidence**: `hint`, `description`, `remark`, `labelRemark`, `labelAlign`, `labelWidth` missing from field rules.
- **Recommendation**: Use shared formFieldRules.

### [D08-04] Barcode-input never touches/visits field

- **File**: `barcode-input/barcode-input.tsx:56-76`
- **Severity**: P2
- **Evidence**: No `form.touchField()`, `form.visitField()`, or `form.validateField()` calls on focus/blur.
- **Recommendation**: Add standard field interaction handlers.

### [D08-05] required/validate.action have no runtime enforcement

- **File**: `barcode-input/barcode-input.tsx:105-121`, `barcode-input.types.ts:22`
- **Severity**: P2
- **Evidence**: `required` never checked. `validate.action` never wired as async rule.
- **Recommendation**: Wire through validation contributor + lifecycle.

### [D08-06] Barcode-input tests mock form validation layer — no validation coverage

- **File**: `barcode-input/barcode-input.test.tsx:30-49`
- **Severity**: P3
- **Evidence**: Mock form has no validateField/touchField/visitField methods.
- **Recommendation**: Add validation lifecycle integration tests.
