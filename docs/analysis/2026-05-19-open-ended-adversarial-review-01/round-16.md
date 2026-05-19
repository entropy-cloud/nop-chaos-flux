# Open-Ended Adversarial Review 16

## Finding 1: Component Lab CRUD quick-edit scenarios expose a user-visible success toast, but the supported E2Es never assert it

**Where**

- `apps/playground/src/component-lab/renderers/crud-lab-page.tsx:221-230`
- `tests/e2e/component-lab/crud-editing-and-selection.spec.ts:12-47`

**What**

The `CRUD quick-edit baseline` is configured with an explicit user-visible success channel:

```ts
quickSaveItemAction: {
  action: 'showToast',
  args: {
    level: 'success',
    message: 'Saved item',
  },
},
```

So successful quick-save is supposed to do more than mutate internal state; it also emits a visible success toast.

But the supported E2Es for both inline and dialog quick edit never check that toast. They only inspect editor-local values or dialog reopen state after clicking save.

That means the suite currently leaves the success-feedback contract completely unverified, even though the page config makes it part of the supported user experience.

**Why it matters**

This is distinct from the earlier CRUD finding about row persistence. Even if row data happened to update, a regression that breaks or drops success feedback would still leave both quick-edit specs green.

That matters because the schema explicitly chose `showToast` as part of the save flow. In other words, the page author treats success feedback as part of the contract, but the supported regression suite does not.

**Confidence**

High. The toast action is explicit in the lab page, and the E2E bodies contain no toast assertions.

**Non-duplication note**

This is different from `round-08`. There the issue was that the tests did not prove row-level persistence. Here the narrower issue is that the page's explicit success-feedback channel (`Saved item` toast) is not covered at all.

---

## Round summary

This round found another supported user-visible result channel that the E2E suite ignores. The remaining productive slice is to keep scanning scenarios that declare toast/result/viewer output in page config and verify whether the corresponding tests assert that visible feedback or only intermediate state.
