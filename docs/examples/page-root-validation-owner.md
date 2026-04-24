# Page-Root Validation Owner Example

## Purpose

This example shows the first landed non-form validation-owner slice in Flux.

- the root `page` owns validation because there is no nearer `form` or draft owner
- bound fields outside `<form>` still validate on blur/change through the page-owned validation owner
- error visibility still follows the compiled validation behavior
- this fallback applies only when `SchemaRenderer` renders against its own `page.scope`
- embedded `SchemaRenderer` trees rendered with `parentScope` remain parent-owned and do not auto-create a second page validation owner

## Example

```json
{
  "type": "page",
  "title": "Profile Basics",
  "body": [
    {
      "type": "text",
      "text": "Edit the page-owned profile values below."
    },
    {
      "type": "input-text",
      "name": "displayName",
      "label": "Display Name",
      "required": true,
      "minLength": 3
    },
    {
      "type": "input-email",
      "name": "email",
      "label": "Email",
      "required": true
    },
    {
      "type": "text",
      "text": "Live page data: ${displayName || '(empty)'} / ${email || '(empty)'}"
    }
  ]
}
```

## Expected Behavior

1. Focusing and blurring `displayName` or `email` without entering a value runs page-owned validation.
2. The field shows the same required/min-length errors that a form-owned field would surface for the same compiled rules.
3. Updating the field writes through the page-owned scope and validation store, so sibling renderers continue to read the latest page data.
4. If the same schema is rendered through `SchemaRenderer` with `parentScope`, the subtree stays parent-owned and this page fallback owner is intentionally suppressed.

## Notes

- This is a validation owner, not a submit owner. There is no implicit `$form`, submit lifecycle, or `canSubmit` contract.
- Future non-form owner families such as filter/search panels should follow the same nearest-owner rule, but they are not part of the current shipped slice.
