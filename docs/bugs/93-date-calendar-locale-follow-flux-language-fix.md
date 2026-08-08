# 93 Date Family Calendar Locale Not Following Flux Language Fix

## Problem

In `input-date` / `input-datetime` / `date-range`, the calendar popup's month
and weekday headers stayed in English even when the flux runtime language was
`zh-CN`. The rest of the UI followed the language switch; only the calendar
grid did not.

## Diagnostic Method

- Hard part: the popup is rendered by a third-party library
  (react-day-picker), so the wiring between flux i18n and the library locale
  prop is invisible in the renderer's own JSX at a glance.
- Started from the shared date control (`date-field-control.tsx:220`) — the
  `Calendar` creation site — and checked which props the library accepts for
  localization.
- Hypothesis "renderer reads its own locale prop" rejected: the control has no
  locale prop; flux i18n is provided through `useFluxTranslation()`.
- Decisive evidence: react-day-picker defaults to `en-US` when no `locale`
  prop is passed; the shared control never passed one.

## Root Cause

- `date-field-control.tsx:220` created the react-day-picker `Calendar` without
  a `locale` prop, so it always used the library default `en-US`.
- Same shared root cause across the whole date family (`input-date`,
  `input-datetime`, `date-range`) because they share the same control.

## Fix

- The Calendar now receives `useFluxTranslation().i18n.language` mapped to the
  react-day-picker locale pack (`enUS` / `zhCN`), in `date-field-control.tsx`
  and `date-range-renderer.tsx`.
- When the flux language changes, the calendar grid re-renders with the
  matching month/week header language.

## Tests

- `packages/flux-renderers-form/src/__tests__/date-calendar-locale.test.tsx`
  (test-first, red before the fix): asserts the calendar grid uses
  `zh-CN` headers when flux language is `zh-CN` and `en-US` otherwise.

## Affected Files

- `packages/flux-renderers-form/src/date-field-control.tsx`
- `packages/flux-renderers-form/src/date-range-renderer.tsx`

## Notes For Future Refactors

- Any third-party control with its own locale concept must be wired to
  `useFluxTranslation().i18n.language`; library defaults silently diverge from
  flux i18n.
- Keep the mapping table (flux language → library locale pack) next to the
  control, not buried in the renderer.
