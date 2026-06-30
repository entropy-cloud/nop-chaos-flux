# 08 Input-File & Input-Image — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/input-file/design.md`, `docs/components/input-image/design.md`
> amis cluster: `form/upload` (37 issues)
> Priority summary: Flux's upload design lists `uploadAction` + `onUploadSuccess`/`onUploadError` + `valueMode` (url/object/array) but is thin on lifecycle state-machine, merge-vs-replace on incremental upload, delete lifecycle, and client-side rejection. These are the residual gaps.
> Triage: ~10 deep-reads → 8 entries.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis upload designs Flux rejects)

| amis feature                                 | Reason rejected                                   | AMIS-REF        |
| -------------------------------------------- | ------------------------------------------------- | --------------- |
| Component-level `api` for upload             | Upload goes through `uploadAction` (action graph) | (whole cluster) |
| amis `receiver`/`fileReceptor` host coupling | Flux uses standard action/fetcher indirection     | (whole cluster) |

---

## A. Upload Lifecycle State-Machine

| #   | Property                                                                                                                                             | Signal                                                                                                                                                                                                                                                    | Severity   | AMIS-REF |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ----- |
| U1  | The upload lifecycle state-machine is explicit and documented: `pending → uploading → uploaded                                                       | error`, with guaranteed payloads + ordering for `onChange`/`onUploadSuccess`/`onUploadError`. A change/selection event carries the selected File info (name/size) with `state:"pending"`BEFORE upload starts; success fires after with`state:"uploaded"`. | DESIGN-GAP | P0       | #4118 |
| U2  | `onUploadError` event payload includes the server/action error message (`ActionResult.error`/`msg`), not a hardcoded generic "upload failed" string. | DESIGN-GAP                                                                                                                                                                                                                                                | P1         | #3702    |

**Recommended action U1/U2:** Add design note to `input-file` §8: define upload lifecycle state-machine + payloads; `onUploadError` carries server error msg.

**Recommended tests:**

- U1: assert ordering and non-empty payload at each phase (pending → uploading → uploaded/error).
- U2: upload action rejects with `{msg:"quota exceeded"}` → `onUploadError` receives that msg.

---

## B. Multiple & Incremental Upload

| #   | Property                                                                                                                                                                                                                                   | Signal     | Severity | AMIS-REF |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | -------- |
| U3  | With `multiple` + `autoUpload`, each successive file selection triggers upload and APPENDS to the value list (not replace, not silently skip).                                                                                             | TEST-GAP   | P0       | #5053    |
| U4  | Initializing with an existing file list (edit mode) + adding new files MERGES (existing uploaded entries preserved; only pending entries mutate). The design defines how uploaded-vs-pending entries are distinguished in the value model. | DESIGN-GAP | P1       | #5935    |

**Recommended action U4:** Add design note to `input-file` §7: initializing with existing file list + adding merges; define uploaded-vs-pending entry distinction.

**Recommended tests:**

- U3: `multiple` + `autoUpload` → select 2 files, then 1 more → all 3 uploaded and present in value array.
- U4: init with 2 existing files; add 1 new → value has 3, existing 2 preserved.

---

## C. Delete Lifecycle & Rejection

| #   | Property                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Signal     | Severity | AMIS-REF                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| U5  | Removing an already-uploaded file optionally notifies the backend via a **`deleteAction` action reference** — mirroring the existing Flux-idiomatic `uploadAction` pattern (`input-file/design.md` §"W3d upload action 桥接裁定": action ref passed as `kind:'prop'`, renderer dispatches via `props.helpers.dispatch(deleteAction, {scope:{__deletedFile}})` on **user click-remove**, NOT at mount). Plus `onDeleteSuccess`/`onDeleteError` events. **This is user-interaction-driven (bug-15 §1 compliant pattern #3), NOT a component-level initApi/auto-fetch.** OR the absence of server-delete is an explicit documented non-goal. | DESIGN-GAP | P1       | #3221                                                                                                                                  |
| U6  | `maxSize` client-side validation exists; rejected files (size/accept) do NOT enter the pending list nor count against `maxFiles`; an `onReject`/`onFileRejected` event fires with the rejected file + reason.                                                                                                                                                                                                                                                                                                                                                                                                                             | DESIGN-GAP | P1       | #5631                                                                                                                                  |
| U7  | `accept:"*"` or `accept:""` permits all files; the client-side accept check aligns with native `<input accept>` semantics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | TEST-GAP   | P2       | #334 — **RESOLVED (B7)**: watch-only (`accept:"*"`/`""` permits all, aligns with native `<input accept>`; construct-true; P2 low-risk) |

**Recommended actions:**

- U5: Add design note to `input-file`/`input-image`: `deleteAction` action-ref (mirrors `uploadAction`, user-click-driven dispatch via `props.helpers.dispatch`, scope carries `__deletedFile`) + `onDeleteSuccess`/`onDeleteError` events OR explicit non-goal. Explicitly user-interaction-driven per bug-15, not mount-time auto-fetch.
- U6: Add design note: `maxSize` + `accept`; rejected files don't enter value list / count vs `maxFiles`; emit `onReject`.

**Recommended tests:**

- U6: oversized file → `onReject` fires; value list unchanged; `maxFiles` count unaffected.
- U7: `accept:"*"` and `accept:""` → any file; `accept:".pdf,.png"` → only those pass.

---

## D. Request Body Hygiene

| #   | Property                                                                                                                                                                                                                         | Signal   | Severity | AMIS-REF                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| U8  | The upload multipart body contains only the file part + explicitly-declared fields — no stray empty-name/undefined part. The `__uploadFile`/`__uploadFileRef` bridge scope does not leak undefined fields into the request body. | TEST-GAP | P2       | #1982 — **RESOLVED (B7)**: watch-only (multipart body only file+declared fields construct-true via uploadAction payload; P2 low-risk) |

**Recommended test U8:** upload via `uploadAction` → inspect dispatched multipart body → no empty-name/undefined part beyond declared fields.

---

## Highest-Leverage Items

1. **U1** — upload lifecycle state-machine (the foundation; amis flipped ordering and emptied payloads across versions).
2. **U3/U4** — multiple/incremental upload append + merge-on-existing (silent data loss otherwise).
3. **U5/U6** — deleteAction + maxSize/reject (real production needs; Flux design is silent).
4. **U2** — server error propagation in `onUploadError` (UX correctness).
