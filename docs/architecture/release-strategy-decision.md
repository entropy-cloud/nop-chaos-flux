# Release Strategy Decision

> Status: current decision (plan 776, roadmap PH-12)
> Supersedes: no prior decision (this area was undocumented)
> Revisit when: any condition in "Flip conditions" fires — the implementation work (publishConfig, changesets, CI publish) is a separate plan-first effort.

## A. npm publishing: not now

- Fact: all 45 `packages/*/package.json` are `private: true` with uniform version `0.1.0`, no `publishConfig`, no `.changeset/`, no npm credentials, no CI publish job (live 2026-10-27).
- Decision: the repository does not publish to npm. The only host-facing artifact is the `@nop-chaos/flux` tarball built by `scripts/pack-flux-bundle.mjs` into `dist-packages/`, guarded by `check:flux-bundle-pack` and `check:bundle-size`, and distributed manually to hosts.
- Flip condition: an external host needs registry installation, or independent per-package version cadence becomes necessary. Flipping spawns an implementation plan (publishConfig across packages, changesets, credentials, CI publish) — protected surfaces, human-confirmed.

## B. Changesets: not adopted

- Decision: no changeset tooling until decision A flips. With no publishing channel there is no consumer for changelog entries.
- Flip condition: same as A.

## C. Source maps: ship inside the tarball

- Fact: the tarball contains `dist/index.js.map` (10.3 MB, ~60% of the tarball).
- Decision: keep shipping maps — host-side debuggability outweighs download size while distribution is manual. `check:bundle-size` guards total growth (its `tarballBytes` metric includes the map, noted in the baseline header).
- Flip condition: host feedback on download size, or decision A flips (then maps become a publishing question again).

## D. Credentials channel: none (explicit non-goal)

No registry credentials exist or are stored. Non-goal while A stands.
