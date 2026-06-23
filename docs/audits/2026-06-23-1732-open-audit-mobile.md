> Audit Status: planned
> Audit Type: open-ended
> Mission: mobile
> Remediation Plan: `docs/plans/2026-06-23-1810-1-mobile-post-reaudit-remediation-owner-plan.md` (single owner plan; covers OA-14, OA-15, OA-16, OA-17 together with NEW-MM-01..06 from the sibling multi-audit — all 10 findings share one package / one verification path / one closure surface, bundled per Plan Guide Rules 22–26).

# Open-Ended Adversarial Audit — `packages/flux-renderers-mobile` (post-remediation re-audit)

- **Audit date**: 2026-06-23 (timestamp 17:32)
- **Auditor**: opencode main agent (single discovery-driven session; no fixed checklist)
- **Scope**: `packages/flux-renderers-mobile/` — all 5 renderers (`pull-refresh`, `infinite-scroll`, `swipe-cell`, `countdown`, `notice-bar`), `use-touch` hook, `schemas.ts`, `mobile-renderer-definitions.ts`, `index.ts`, `test-support.ts`, `styles.css`, config (`package.json`, `tsconfig*`, `vitest.config.ts`), all 7 `*.test.ts(x)` + markers contract test; cross-referenced against the 5 `docs/components/*/design.md`, the playground consumer (`apps/playground/src/pages/mobile-components-demo.tsx`), the e2e (`tests/e2e/mobile-components.spec.ts`), and the `@nop-chaos/ui` icon util the package depends on. Read completely.
- **Method**: read code first, let anomalies surface, chase each lead across renderer ↔ schema ↔ definition ↔ design.md ↔ playground ↔ e2e ↔ sibling util.
- **Seed lens**: 契约考古学家 (contract archaeologist) + 异常路径侦探 (exception-path detective). Most findings came from tracing the _direction/geometry contract_ and the _host-recovery state machine_, not from a dimension table.
- **Baseline**: v1, no compat burden, no "transitional/future" excuses for live main-path code.

## Dedup & freshness

- This is a **fresh, code-driven re-execution** against a package that has already been audited hard. It does **not** repeat: the 24 `MA-*` findings (all verified resolved in live code), the 13 `OA-*` findings from the prior open-audit (verified resolved in live code: OA-08 `inert`, OA-09 absolute indicator, OA-10 error-guard, OA-13 reset contract, OA-01 loop guard, etc.), or the 6 current `NEW-MM-*` residuals from the sibling multi-audit at this same timestamp.
- **`docs/references/reopened-design-decisions-and-audit-adjudications.md` checked**: none of the 5 recorded adjudications touch the mobile package. Nothing here is a re-report of an already-adjudicated decision.
- Every finding below was checked against the full MA-01..25 / OA-01..13 / NEW-MM-01..06 set; each is either absent or a **materially different root/impact** (flagged inline).

**Result: Issues found.** This round contributes **4 new, non-duplicate findings** (OA-14..OA-17) spanning geometry/direction contract inversion, a silently-dead carousel feature, an unrecoverable host-error-recovery deadlock, and a contract-honesty gap. The headline (OA-14) is a shipped, documented feature (`direction: 'up'`) whose visual is inverted on every device.

---

## New findings

### [OA-14] `pull-refresh` `direction: 'up'` translates the body in the WRONG direction (down, opposite the finger), keeps the indicator on the wrong side, and contradicts its own design doc

- **Where**: `packages/flux-renderers-mobile/src/pull-refresh.tsx:81-84, 164-167, 189, 202-221`; schema contract `schemas.ts:8-9` (`direction?: 'down' | 'up'` — "'down' 下拉刷新，'up' 上拉加载"); design doc `docs/components/pull-refresh/design.md:5,90,114`.
- **What**: The implementation derives the gesture _threshold detection_ with a sign flip, but reuses the **down-anchored geometry verbatim** for the `up` direction:

  ```ts
  const sign = direction === 'down' ? 1 : -1;          // :81
  const rawOffset = state.deltaY * sign;               // :82
  const directionalDelta = Math.max(0, rawOffset);     // :83  (always >= 0)
  const pullDistance = Math.min(directionalDelta * 0.5, MAX_PULL_DISTANCE); // :84 (>= 0)
  ...
  const trackTranslate = (loading/success) ? threshold : pullDistance;      // :164  (>= 0)
  // :189
  transform: `translateY(${trackTranslate}px)`,         // ALWAYS translates DOWN
  ```

  For `direction: 'up'`, the user swipes **up** (deltaY < 0). `sign=-1` flips that to a positive `directionalDelta` so the threshold check passes — but `trackTranslate` stays **positive**, so the root `translateY(+N px)` moves the body **DOWN** while the finger moved **UP**. The body travels _opposite_ to the finger. Additionally the loading/success indicator is hard-anchored `top:0; transform: translateY(-100%)` (`:204-210`) — i.e. revealed _above_ the content — which is the wrong side for a pull-up-to-load (it should be at the bottom).

  This directly violates the package's own just-fixed geometry contract: `design.md:90` ("几何跟手 1:1 … body 屏幕位移 === 根 translate === 手指位移") — for `up`, the body's screen offset is the _negation_ of the finger's, not equal to it.

- **Why it wasn't caught**: the only `up`-direction test (`pull-refresh.test.tsx:196-207`, "respects up direction") asserts solely that `onRefresh` fires once and that `data-direction === 'up'`. It never reads `root.style.transform`'s sign, never checks the indicator's anchor side. So the inversion is invisible to CI — exactly the "tests assert `data-*`, never geometry" blind spot the prior open-audit flagged (OA-09), now re-appearing on the untested `up` branch.
- **A second, design-level contradiction**: `design.md:114` (§8 edge cases) states "上拉加载使用 InfiniteScroll，下拉刷新使用 PullRefresh" — pull-up loading is `infinite-scroll`'s job, _not_ `pull-refresh`'s. Yet `schemas.ts:8-9` and `design.md:5,38` advertise `direction: 'up'` = 上拉加载 on `pull-refresh`. So the feature is simultaneously (a) misplaced per the design doc's own integration guidance, and (b) visually inverted in the code that ships it.
- **Consequence**: any author who sets `direction: 'up'` (a documented, schema-validated option) gets a pull-to-refresh whose content runs away from the finger and whose spinner pops out the top — on every device, every time. For a package whose entire purpose is native-feel gesture geometry, a permanently inverted gesture mode is the highest-urgency item in this round.
- **Fix direction**: pick one. Either (a) make `up` genuinely bottom-anchored: translate the body **up** (`translateY(-trackTranslate)`), anchor the indicator at `bottom:0; transform: translateY(100%)`, and gate on `deltaY < 0`; or (b) accept `design.md §8` and **remove** the `up` option from schema + definition + design.md (pull-up load-more is `infinite-scroll`'s responsibility), deleting the misleading branch. Either way add a transform-sign/anchor assertion to the `up` test so it cannot regress.
- **Confidence**: **确定** (pure transform math from the inline styles; no runtime/geometry dependency; the `sign` only feeds the threshold gate, never the translate sign or indicator anchor).
- **Discovery source**: contract-archaeologist lens — re-read `design.md §5`'s "跟手 1:1" guarantee and asked "does the `up` branch still satisfy it?" Tracing `trackTranslate`'s sign answered no.

---

### [OA-15] `notice-bar` multi-text carousel is silently dead unless the text overflows — an array `text` shows only `text[0]` forever whenever the marquee animation does not run

- **Where**: `packages/flux-renderers-mobile/src/notice-bar.tsx:59-75` (scroll detection), `:150-165` (animation gated on `shouldScroll`, carousel advance in `onAnimationIteration`); design contract `docs/components/notice-bar/design.md:45,87,146`.
- **What**: `currentIndex` — the only state that selects which array entry is shown — is mutated in exactly one place: the `onAnimationIteration` handler (`:161-165`):

  ```tsx
  onAnimationIteration={() => {
    if (loop && textList.length > 1) {
      setCurrentIndex((idx) => (idx + 1) % textList.length);
    }
  }}
  ```

  That handler lives on the text `<span>`, and that span only receives `animationName`/`animationDuration`/… when `shouldScroll === true` (`:151`). `shouldScroll` is computed in `useLayoutEffect` (`:72-73`) as `textEl.scrollWidth > contentEl.clientWidth` — i.e. **only when the current text overflows the bar**. So:
  - `scrollable: false` → `shouldScroll` forced false (`:60-64`) → no animation → **zero** `animationiteration` events → carousel never advances → a `text: ['A','B','C']` bar shows `'A'` until unmount.
  - `scrollable: true` but each item is short enough to fit → `shouldScroll === false` → same dead carousel.
  - Even in the happy overflowing case, the carousel only advances _after the first item finishes a full marquee sweep_; if item 0 is long but items 1..n are short, the moment a short item becomes active `shouldScroll` flips false, the animation is removed, and the carousel **sticks on that short item** mid-rotation.

  This is a _different root_ from OA-01 (the `!loop` guard that made rotation unreachable in every config — that was fixed by inverting to `loop && …`). OA-01 was boolean-logic; OA-15 is the **structural coupling of carousel advancement to overflow detection**. The schema actively invites the broken config: `text?: string | string[]` with `scrollable?: boolean` defaulting to `false`.

- **Why it matters / contract drift**: `design.md:45` ("scrollable 模式下支持多条文本自动轮播") and `:87` ("多条文本：轮播显示，每条滚动完毕后切换下一条") document multi-text as a rotating feature. `design.md:146` even recommends the implementation approach: "多条文本轮播可用简单的 index + timeout 切换" — a **timeout**-based switch, which would advance regardless of overflow. The implementation instead tied advancement to the CSS animation iteration, silently breaking rotation for the common case (short notices). The failure is completely silent: no error, no log, the bar just looks like a single static message.
- **Consequence**: a mall/activity-notice bar authored as `text: ['活动A','活动B']` with default `scrollable:false` (or short texts) advertises only the first message forever; the others are never shown. Authors have no signal that their array is being flattened.
- **Fix direction**: decouple carousel advancement from overflow. Either drive `currentIndex` with an independent `setInterval`/timeout (as `design.md §9` suggests) when `textList.length > 1`, or document that multi-text rotation requires `scrollable:true` AND overflowing text and clamp the schema/defaults accordingly. Add a test that advances a **non-overflowing** multi-item bar (today every carousel test spies `scrollWidth`/`clientWidth` to _force_ overflow, so the non-overflow dead path is never exercised).
- **Confidence**: **确定** (traced every `setCurrentIndex` call site — there is exactly one, inside an event that only fires when `shouldScroll`; the dead path is unambiguous).
- **Discovery source**: exception-path detective — "what advances the carousel, and under what conditions does that path never execute?" Led to diffing the advance trigger against the overflow gate.

---

### [OA-16] `infinite-scroll` in-flight guard resets only on a `loading` transition — a host that recovers by clearing `error` (without toggling `loading`) deadlocks the list AND the retry button

- **Where**: `packages/flux-renderers-mobile/src/infinite-scroll.tsx:57-60` (the only `isLoadingRef` reset), `:66-75` (`fireLoadMore` sets it true), `:119-124` (`triggerLoadMore` — the retry path — also guards on it).
- **What**: MA-13's local in-flight guard is reset in exactly one place:

  ```ts
  const isLoadingRef = React.useRef(false);
  React.useEffect(() => {
    isLoadingRef.current = false; // :59 — deps: [loading] ONLY
  }, [loading]);
  ```

  The guard is set `true` in `fireLoadMore` (`:67`) and consumed by **both** auto-load paths (observer `:115`, immediateCheck `:115`) **and** the user-facing retry control (`triggerLoadMore` `:122`). Because the reset effect depends _only_ on `[loading]`, an `error → undefined` transition (the host clearing the error) does **not** release the guard. Trace of the deadlock:
  1. Host sets `error: true`; user clicks the retry `<Button>` → `triggerLoadMore()` → `fireLoadMore()` sets `isLoadingRef.current = true`, dispatches `onLoadMore`.
  2. Host recovers by clearing the error **without** touching the `loading` prop (e.g. `onLoadMore: () => { setError(undefined); runFetch() }`, where `runFetch` manages its own loading via a separate store path that never writes the renderer's `loading` prop). `loading` never transitions → `isLoadingRef` stays `true`.
  3. Observer rebuilds with `hasError=false`, but every entry-point now hits `if (isLoadingRef.current) return/continue` → **no auto-load**.
  4. The user clicks retry again → `triggerLoadMore()` hits `if (isLoadingRef.current) return` (`:122`) → **the retry button is dead too**.

  The list is now permanently stuck with no auto-load and no working retry, and (per NEW-MM-01) with **zero diagnostic**.

- **Why this is not just MA-13**: MA-13 added the guard and explicitly framed "over-locking [as] the conservative, safe failure mode (better than duplicate requests)" (`:55-56` comment). That framing is correct _for the auto-load duplicate-request concern_, but it overlooks that the same ref also gates the **explicit retry control**. Over-locking here is not merely "no more auto-loads" — it is "the user-facing recovery affordance silently stops working." That is a strictly worse outcome than the comment promises, and it triggers on a plausible host-recovery shape (clearing `error` rather than round-tripping `loading`).
- **Consequence**: a host that follows the _error_ half of the documented runtime contract (`error?: boolean | string` to suspend; clear it to resume) but drives loading through a different channel gets an unrecoverable, silent dead list. The documented contract presents `loading` and `error` as independent levers; the implementation silently makes `loading` the _only_ lever that can unstick the guard.
- **Fix direction**: release `isLoadingRef` on an `error` transition as well (add `error` to the reset effect deps, or reset whenever `error` clears), so any documented recovery lever unblocks the retry path. Add a test: error → retry → host clears `error` only → assert a subsequent intersection / retry click fires `onLoadMore` again.
- **Confidence**: **很可能** (the reset-effect dep array and the `triggerLoadMore` guard are certain; the residual uncertainty is only how common the "clear error without toggling loading" host pattern is — but it is a documented-contract-compliant pattern, so the deadlock is real even if uncommon).
- **Discovery source**: lifecycle-tracker lens — "a ref is set true in one place and false in another; what transitions _don't_ hit the false?" Led to diffing the reset deps `[loading]` against the full set of runtime props `{hasMore, loading, error}`.

---

### [OA-17] `infinite-scroll` discards the host's `error` string content — always renders the generic `errorText`, never the message the host passed

- **Where**: `packages/flux-renderers-mobile/src/infinite-scroll.tsx:160-167` (status text resolution), `:177-188` (retry `<Button>` label); schema `schemas.ts:49-50`.
- **What**: The schema types the runtime error as `error?: boolean | string` with the note "`true` 或错误字符串将暂停自动加载并显示重试" — implying the string carries a host-supplied message. But the rendered text is unconditionally the generic `errorText`:

  ```ts
  data-status-text={
    status === 'loading' ? loadingText
    : status === 'finished' ? finishedText
    : status === 'error' ? errorText        // :166 — always the generic literal
    : undefined
  }
  ...
  <Button ...>{errorText}</Button>           // :187 — same generic literal
  ```

  A host that sets `error: '网络超时，请稍后重试'` expects the user to see that message; the user instead sees the generic `errorText` (default "加载失败，点击重试"). The host's string is consumed purely as a truthy suspension trigger and its content is thrown away.

- **Why it matters**: this is a contract-honesty gap, not a crash. The `boolean | string` union (and the schema note) invite authors to pass a meaningful message that is then silently dropped. `design.md §4` only documents the generic "加载失败，点击重试" text and never mentions surfacing the host string, so the design doc and code agree on "generic only" — but the _schema_ disagrees with both, making the schema the odd one out. Authors reading the schema field docstring are misled.
- **Consequence**: integrators who localize or contextualize error messages via the `error` string find their message ignored; they must instead re-thread the message through `errorText`, which the schema does not signal. Low functional impact, real authoring trap.
- **Fix direction**: pick one source of truth. Either (a) surface the host string when present (`typeof error === 'string' ? error : errorText`) so the union pays off; or (b) narrow the schema to `error?: boolean` and drop the "错误字符串 … 显示" wording, so the field honestly reflects "boolean suspension flag, message comes from `errorText`".
- **Confidence**: **确定** (the resolution chain is a single ternary; the string branch is never read for display).
- **Discovery source**: contract-archaeologist lens — "the schema offers a `string` variant; where is it rendered?" Tracing `error` through `resolveStatus` → status text showed it is only ever a truthiness check.

---

## Overall assessment (1-3 directions most worth attention)

1. **The package's _directional_ and _overflow_ contracts were validated only on the happy branch.** OA-14 (`up` translate inverted) and OA-15 (carousel dead without overflow) are two instances of the same gap: a feature works on the path the author demoed (`down` pull; overflowing long text) and is silently wrong on every other path (`up`; short/non-scrolling text). The unit tests are the enabler — they assert `data-*` attributes and event counts, never the _sign of a transform_ or _whether an advance actually fires under non-overflow_. The durable fix is geometry/behavior assertions (transform sign; carousel advance on a non-overflowing bar), not another per-feature patch. OA-14 in particular means a documented, schema-valid option is broken on every device.

2. **The host/runtime contract is presented as several independent levers but implemented with a single hidden coupling.** OA-16 (`isLoadingRef` only resets on `loading`, so clearing `error` deadlocks even the retry button) and OA-17 (the `error` string is accepted but discarded) both stem from the runtime-props surface (`hasMore`/`loading`/`error`) advertising more authority than the implementation honors. A host following the documented contract in good faith can end up with an unrecoverable, silent dead list. The fix is to make every documented lever actually do what the schema says, and to make the in-flight guard release on the same prop set the schema exposes.

3. **(Lower urgency, carried from the sibling audit) silent-failure posture.** OA-16's deadlock is compounded by NEW-MM-01 (no dev diagnostic on swallowed `onLoadMore` failures). Together they mean a contract-violating host gets a dead UI with no console signal — the single highest-leverage cheap fix across both audits remains adding a gated `import.meta.env.DEV` `console.error` in `infinite-scroll.tsx:69`.

## Blind-spot self-assessment (what this round likely missed)

- **Real-device geometry and animation timing.** OA-14 is reasoned from inline-style transform math, not a captured `getBoundingClientRect` trace on a touch device. A follow-up that drives the playground mobile page through CDP touch emulation + `page.evaluate()` geometry assertions (per AGENTS.md "NEVER diagnose UI via screenshots") would promote OA-14 from "确定-by-math" to device-confirmed and could surface animation-timing issues (e.g. the `animationDuration = ceil((textWidth+100)/speed)` formula under variable widths — the prior audit's noted blind spot, still unmeasured).
- **Concurrent/scale behavior.** I did not benchmark N simultaneous countdowns (the `time`-mode `setInterval` decrement drifts vs wall-clock, unlike the `targetTime` mode which is `Date.now()`-accurate) or N swipe-cells. A flash-sale list of countdowns in `time` mode could drift several seconds over a minute; I noted this but did not report it as it is a known tradeoff and low-severity.
- **`useTouch` / `useCountdownTimer` public-export freeze.** I confirmed `useTouch` returns a fresh `touchHandlers` container object each render (inner handlers are `useCallback`-stable, the wrapper is not), which busts any consumer `useCallback` that lists `touchHandlers` in its deps — but React Compiler memoizes the container, so this is a style note, not a defect, and per the React-19 guide hand-written memo removal is not high-priority. A "should these hooks be public before v1?" round (zero external consumers by grep) remains open.
- **Best next切入点**: a single playground pass with real touch + geometry + an axe-core a11y scan would confirm OA-14/OA-15 on-device and is the highest-ROI follow-up.

## Related

- Prior open-audit: `docs/audits/2026-06-22-2039-open-audit-mobile.md` (OA-01..OA-13, remediated).
- Sibling multi-audit (same timestamp): `docs/audits/2026-06-23-1732-multi-audit-mobile.md` (NEW-MM-01..06 current residuals).
- Round artifacts: `docs/analysis/2026-06-23-1732-open-ended-adversarial-review-mobile/round-01.md`.
