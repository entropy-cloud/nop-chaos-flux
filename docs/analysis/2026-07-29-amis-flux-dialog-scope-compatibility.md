# AMIS/Flux Dialog Scope Compatibility Analysis

## Problem

`view.xml` generated CRUD pages (NopAuthUser-main, etc.) need to work with both AMIS and Flux rendering. The current `flux-web.xlib` templates generate Flux JSON from AMIS-oriented page definitions, but there is a fundamental scope/data compatibility gap:

- **AMIS**: Row data is at the top level of the data context. `${id}` resolves directly.
- **Flux**: Row data is nested under `record: { id, name, ... }`. `${id}` does NOT resolve; `${record.id}` does.

## Scope Chain Analysis

When a row action button (e.g., "查看") dispatches `openDialog`:

### AMIS

1. Button click → dialog opens with full parent data context
2. Form's `initApi` URL `@query:NopAuthUser__get?id=${id}` → `${id}` resolves from context
3. Dialog has access to all parent scope variables at top level

### Flux

1. Button click → `openDialog` action dispatched
2. Dialog scope created via `createSurfaceScope("dialog", ctx, dialogData)`:
   ```
   dialogScope {dialogId}
     → openingScope {}
       → ctx.scope (button/fragment scope, has `record: {id, name, ...}`)
         → rowScope {record, index}
   ```
3. Form scope created as child of dialog scope:
   ```
   formScope {form field values}
     → dialogScope {dialogId}
       → openingScope {}
         → ... (has `record.id` under `record`)
   ```
4. Form's `loadAction` evaluates URL `${id}` via `scope.get("id")`:
   - formScope.readOwn() → no `id`
   - dialogScope.readOwn() → no `id` (unless `args.data` provided)
   - openingScope.readOwn() → no `id`
   - buttonScope.readOwn() → no `id` (has `record` which contains `id`)
   - Result: **undefined** ❌

## Key Findings

### 1. `scope.get()` walks the prototype chain

`scope.get("id")` checks own data, then walks up via `scope.parent`. But at each level, it looks for a **direct key** named `id`. The row scope has `record: {id: "abc"}`, not `id: "abc"`. So `${id}` never resolves.

`scope.get("record.id")` WOULD resolve to `"abc"` once it finds `record` in the row scope.

### 2. `includeScope: '*'` vs `includeScope: ['key']` are inconsistent

- `includeScope: '*'` → calls `scope.readOwn()` → **only own data, NO inheritance**
- `includeScope: ['id']` → calls `scope.get('id')` → **walks prototype chain**
- This is a design bug: `'*'` should also walk the chain (e.g., use `materializeVisible()`)

### 3. `args.data` is the correct AMIS-compat mechanism

The flux-guide patterns explicitly show:

```json
"onClick": {
  "action": "openDialog",
  "args": {
    "data": { "id": "${id}", "name": "${name}" },
    "body": { ... }
  }
}
```

`args.data` expressions are evaluated at dispatch time against the action context scope. BUT: `${id}` won't resolve here either — need `${record.id}`.

### 4. The `NormalizeAction` template evaluates expressions against `genScope`, not runtime scope

The genScope has `formData` placeholders like `{ userName: '${userName}' }`. The actual `${id}` in the URL comes from the page YAML definition, which is part of the view definition.

## Solution Options

### Option A: Transform `${field}` → `${record.field}` in loadAction URL (backend template, no Flux changes)

In `page_simple.xpl`, after `NormalizeApi`, transform URL template variables:

```
@query:NopAuthUser__get?id=${id} → @query:NopAuthUser__get?id=${record.id}
```

**Pros**: Backend-only fix, simple, targeted  
**Cons**: Only fixes URL templates; doesn't fix `args.data` expressions; assumes all template vars are record fields

### Option B: Fix `extractScopeData` for `includeScope: '*'` (Flux runtime change)

Change `extractScopeData` to use `scope.materializeVisible()` instead of `scope.readOwn()` when `includeScope === '*'`.

**Pros**: Makes `includeScope: '*'` consistent with `includeScope: ['key']`  
**Cons**: Doesn't fix the fundamental name mismatch (`id` vs `record.id`); `materializeVisible()` still uses direct key names

### Option C: Add dialog-level `includeScope` (new Flux feature)

In `openDialog`, when `args.includeScope === '*'`, flatten parent scope's `record` into dialog scope:

```typescript
if (invocation.args?.includeScope === '*') {
  const record = ctx.scope?.get('record');
  if (record) dialogData = { ...dialogData, ...record };
}
```

**Pros**: Explicit, controllable by backend; backend template controls when to apply  
**Cons**: New Flux feature; only handles `record`, not arbitrary parent scope data

### Option D: Backend generates `data` with explicit record fields (current flux-guide pattern)

In `NormalizeAction`, add `data: { id: "${record.id}" }` to dialog args when the action is a row action:

```js
args.data = { ...(args.data || {}), id: '${record.id}' };
```

**Pros**: Follows existing flux-guide pattern; explicit and predictable  
**Cons**: Hardcodes `id`; doesn't generalize to other primary key names; user rejected this

### Option E: `includeScope` at dialog level + `include:record` scope concept

New scope mechanism: `includeScope: "record"` at dialog level tells Flux to merge the parent's `record` fields into the dialog scope as direct keys.

```json
{
  "action": "openDialog",
  "args": {
    "includeScope": {"record": "*"},
    "body": { ... }
  }
}
```

**Pros**: Generalizes to any scope path; explicit; extensible  
**Cons**: New Flux feature; more complex

## Recommendation

The root cause is a design mismatch between AMIS (flat data context) and Flux (scoped data context). The cleanest solution is:

**Option C + Option A**:

1. Add a dialog-level `includeScope` feature to Flux runtime (the user hinted at this with "在nop-chaos-flux中增加这个功能")
2. Have the backend template set `includeScope: { record: "*" }` on dialog args when the action originates from a row context

This way:

- The backend doesn't need to know which fields to pass
- Flux explicitly merges the `record` fields into the dialog scope
- `${id}` resolves because `id` is now a direct key in the dialog scope
- No assumptions about primary key names (the entire record is merged)
- Consistent with AMIS semantics (all row fields available at top level)

**Implementation sketch for Flux runtime (action-adapter.ts):**

```typescript
case 'openDialog': {
  let dialogData = ...;
  // Handle dialog-level includeScope
  const inc = invocation.args?.includeScope;
  if (inc && typeof inc === 'object' && !Array.isArray(inc) && inc.record === '*') {
    const record = ctx.scope?.get('record');
    if (record && typeof record === 'object') {
      dialogData = { ...dialogData, ...record as Record<string, unknown> };
    }
  }
  const dialogScope = input.createSurfaceScope('dialog', ctx, dialogData);
  ...
}
```

**Implementation sketch for backend (NormalizeAction):**

```js
if (actionType == 'dialog') {
  let dialog = xpl('thisLib:LoadPage', ...);
  let args = _.delete({...dialog}, ['page','name']);
  if (!args.data) {
    args.includeScope = { record: "*" };
  }
  ...
}
```
