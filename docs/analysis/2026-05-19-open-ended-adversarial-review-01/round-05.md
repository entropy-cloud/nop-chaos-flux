# Open-Ended Adversarial Review 05

## Finding 1: Spreadsheet host manifest leaves many live methods untyped even though runtime forwards arbitrary payloads into strongly-shaped commands

**Where**

- `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:115-410`
- `packages/spreadsheet-renderers/src/host-action-provider.ts:31-45`
- `packages/spreadsheet-core/src/commands-base.ts:91-255`
- `packages/spreadsheet-core/src/commands-style.ts:4-153`

**What**

The spreadsheet host manifest now lists a broad set of public methods, but a large tail of those methods still has no `args` contract at all. At runtime, `createSpreadsheetActionProvider()` accepts any object payload, falls back to `{}` for non-objects, and spreads that directly into `type: 'spreadsheet:${method}'` before casting to `SpreadsheetCommand`.

This means compile-time host validation has no way to reject malformed calls for methods like `renameSheet`, `moveSheet`, `hideSheet`, `selectAll`, `selectRow`, `find`, `replaceAll`, `setCellFontFamily`, `setCellTextAlign`, and many others, even though the core command types require concrete fields such as `sheetId`, `name`, `targetIndex`, `options`, `replacement`, `target`, or `row`.

**Why it matters**

This is a live static/runtime contract hole, not just missing documentation. The host manifest is the only thing the schema validator can use to prove action payload shape. When that manifest omits `args`, invalid toolbar or host actions become compile-clean and only fail after the provider has already manufactured an underspecified command object. That reintroduces exactly the kind of runtime-only spreadsheet action failure that the host contract system is supposed to prevent.

**Confidence**

High. The manifest entries are visible in one file, the provider's `{}` fallback and unchecked spread are visible in another, and the core command interfaces show the required fields those methods actually need.

**Non-duplication note**

This is narrower than the previously reported spreadsheet manifest/provider drift that focused on missing method coverage. The new issue is that many now-public methods still publish no payload schema, so `args` validation remains effectively absent for a large part of the surface.

---

## Finding 2: `word-editor-persistence` can pass even if the explicit Save button stops persisting anything

**Where**

- `tests/e2e/word-editor-persistence.spec.ts:32-66`
- `packages/word-editor-renderers/src/editor-canvas.tsx:52-73`

**What**

The persistence E2E claims to verify that a document marker survives reload after clicking `保存`, but the test proves the marker has already reached `localStorage` before the save button is pressed:

```ts
await page.keyboard.type(marker);
await expect.poll(() => readSavedDocumentText(page), { timeout: 10_000 }).toContain(marker);

const saveButton = page.getByRole('button', { name: '保存' });
await saveButton.click();
```

`EditorCanvas` independently autosaves to `localStorage` on content changes after a 500 ms debounce:

```ts
localStorage.setItem('nop-word-editor-document', JSON.stringify(saved));
onAutosaveRef.current?.(saved);
```

So this spec would still go green if explicit save became a no-op, as long as autosave continues to run and reload restores from the autosaved draft.

**Why it matters**

This test currently gives false confidence about the manual-save contract. The product has distinct semantics around explicit host save versus local autosave/recovery, and this spec is cited as persistence coverage. If the explicit save callback regresses, CI can still report green because the assertion is satisfied by the autosave path before the button interaction ever matters.

**Confidence**

High. The test ordering and the autosave side effect are explicit in code.

**Non-duplication note**

Earlier findings already covered Word Editor save/autosave truth-surface bugs. This one is specifically about the E2E harness no longer distinguishing explicit save from autosave-backed recovery.

---

## Round summary

This round found one still-open host-contract hardening gap in spreadsheet and one supported E2E that no longer proves the behavior it claims to protect. I did not keep the `performance-table` tag-list check because the live schema does not mark that cell as required, so its zero-error assertion is weak but not a regression proof target on its own.
