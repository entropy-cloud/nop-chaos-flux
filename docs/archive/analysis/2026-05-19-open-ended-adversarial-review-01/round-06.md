# Open-Ended Adversarial Review 06

## Finding 1: Flow Designer dynamically publishes `designer:navigate-back`, but the manifest still omits that public method

**Where**

- `packages/flow-designer-renderers/src/designer-page-helpers.tsx:110-140`
- `packages/flow-designer-renderers/src/designer-page-body.tsx:137-143`
- `packages/flow-designer-renderers/src/designer-toolbar.tsx:210-228`
- `packages/flow-designer-renderers/src/designer-controls.test.tsx:143-193`
- `packages/flow-designer-renderers/src/designer-manifest.ts:59-373`

**What**

Flow Designer now has a live path that explicitly injects `navigate-back` into the designer namespace provider whenever an upstream back handler exists:

```ts
if (methods.includes('navigate-back')) {
  return methods;
}
return [...methods, 'navigate-back'];
```

and routes invocation back through the upstream handler:

```ts
if (method === 'navigate-back') {
  return upstreamBackHandler.provider.invoke(upstreamBackHandler.method, payload, ctx);
}
```

The built-in toolbar treats that as the default back action:

```ts
const action = item.action ?? 'designer:navigate-back';
```

and the focused tests also treat `designer:navigate-back` as the supported button contract.

But `designer-manifest.ts` still does not declare any `navigate-back` method in the `designer` capability contract.

**Why it matters**

This is a fresh static/runtime split-brain. Runtime discovery, built-in UI behavior, and tests all say `designer:navigate-back` is part of the usable `designer:*` surface when an upstream owner is present. The manifest, which drives schema validation and tooling discovery, still says that method does not exist. So schema-authored toolbar/host actions can be rejected or under-described at compile time even though the live page will publish and honor them at runtime.

This is especially relevant here because the Flow Designer back button is no longer an incidental internal callback; it is wired through the same namespaced action path the rest of the host-contract system is supposed to make discoverable.

**Confidence**

High. The provider augmentation, toolbar default, tests, and manifest omission are all explicit in live code.

**Non-duplication note**

This is different from the earlier Flow Designer finding that the built-in toolbar bypasses `ActionScope` for most normal buttons. That earlier issue was about command-routing inconsistency. This one is about a namespaced action that runtime now publicly exposes while the manifest still fails to publish it.

---

## Round summary

This round found one more live host-contract drift in Flow Designer. I did not keep the broader `report-designer-demo` toolbar-presence E2E concern as a separate issue because the repo already has older coverage-gap reports for that area, and the new evidence there was weaker than the manifest/runtime mismatch above.
