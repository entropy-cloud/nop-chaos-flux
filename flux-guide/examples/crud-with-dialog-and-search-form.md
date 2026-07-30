# CRUD with dialog, search form, and primary submit form

> Demonstrates `submitScope: 'surface'` to mark only the primary submit form
> as the trigger for the surface lifecycle callback. The dialog contains both
> a search form (local-only) and the main edit form (surface-scoped).
>
> See:
>
> - `docs/architecture/surface-lifecycle-callbacks.md` — design rationale
> - `flux-guide/design-patterns/page-dialog-drawer.md` §6 — authoring patterns

---

## Scenario

A page-level CRUD lists users. Clicking "Edit" opens a dialog that contains:

1. An inner CRUD (loaded with related records) with its own **search form** (filters the inner list)
2. The **main edit form** for the user record

When the user submits the main edit form, the dialog should close and the
outer page-level CRUD should refresh. When the user submits the search form,
**nothing** should happen to the outer CRUD — that search is a local
concern of the inner list.

This is enforced by setting `submitScope: 'surface'` only on the main edit
form. The search form keeps the default `'local'` scope.

---

## Schema

```jsonc
{
  "type": "page",
  "title": "Users",
  "body": [
    {
      "type": "crud",
      "id": "users-page-list",
      "name": "users-page-list",
      "loadAction": {
        "action": "ajax",
        "args": { "url": "/api/users", "method": "get" },
      },
      "columns": [
        { "name": "id", "label": "ID" },
        { "name": "name", "label": "Name" },
        {
          "type": "operation",
          "label": "Actions",
          "buttons": [
            {
              "type": "button",
              "label": "Edit",
              "onClick": {
                "action": "openDialog",
                "args": {
                  "title": "Edit user",
                  "size": "lg",
                  "data": { "id": "${id}", "name": "${name}" },
                  "body": [
                    {
                      "type": "crud",
                      "id": "user-activity-list",
                      "name": "user-activity-list",
                      "loadAction": {
                        "action": "ajax",
                        "args": { "url": "/api/users/${id}/activity", "method": "get" },
                      },
                      "queryForm": {
                        "body": [
                          { "type": "input-text", "name": "keyword", "label": "Search activity" },
                        ],
                      },
                      "columns": [
                        { "name": "ts", "label": "Timestamp" },
                        { "name": "event", "label": "Event" },
                      ],
                    },
                    {
                      "type": "form",
                      "id": "edit-user-form",
                      "submitScope": "surface",
                      "data": { "id": "${id}", "name": "${name}" },
                      "submitAction": {
                        "action": "ajax",
                        "args": {
                          "url": "/api/users/${id}",
                          "method": "put",
                        },
                        "messages": { "success": "Saved" },
                      },
                      "body": [
                        { "type": "input-text", "name": "name", "label": "Name", "required": true },
                      ],
                    },
                  ],
                  "onSubmitSuccess": { "action": "refreshNearest" },
                  "onClose": { "action": "refreshNearest" },
                },
              },
            },
          ],
        },
      ],
    },
  ],
}
```

---

## Key points

- **`users-page-list` CRUD (outer)**: loaded via `loadAction`. No `data-source`
  declaration, so `refreshNearest` will locate it via the component-registry
  `findFirstInScope` path.
- **`user-activity-list` CRUD (inner, inside dialog)**: has its own
  `queryForm`. That form has **no `submitScope`**, so it stays `'local'`
  — submitting the search does not propagate to the dialog's
  `onSubmitSuccess` callback.
- **`edit-user-form` (main)**: explicitly marks `submitScope: 'surface'`. On
  submit success, it fires the dialog's `onSubmitSuccess` hook in the dialog
  owner's ctx (the page scope).
- **`onSubmitSuccess`** runs `refreshNearest` in the **dialog owner's** scope
  (page scope). `refreshNearest` walks up from page scope and finds the outer
  `users-page-list` CRUD — not the inner `user-activity-list` (which lives in
  dialog scope, outside the owner's scope chain).
- **Dialog is closed** via the submit button's `submitForm.then: closeSurface`
  chain, not inside `onSubmitSuccess`. This ensures the data refresh completes
  before the UI closes.
- **`onClose`** also refreshes — covers the case where the user cancels via
  ESC / mask click without submitting.

## What happens when the search form is submitted

1. Search form's `submitAction` (an ajax) executes
2. form-level `onSubmitSuccess` would fire if declared on the search form
3. **Surface callback is NOT triggered** because `submitScope` is `'local'`
   (default)
4. Outer `users-page-list` is untouched

This is exactly the behavior the multi-form scenario requires.
