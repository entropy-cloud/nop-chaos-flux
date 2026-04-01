# Development Log

Development log entries are organized by date — one file per day.

## Structure

```
docs/logs/
├── index.md          ← this file (writing guide + index)
├── 2026/
│   ├── 03-31.md
│   ├── 03-30.md
│   └── ...
└── 2027/
    └── ...
```

**Convention**: `docs/logs/{year}/{month}-{day}.md`

## Writing Guide

### Purpose

Each daily log captures short dated notes about:

- What document was added or updated
- What design decision was made
- What work is planned next
- Small context useful to remember later but not belonging in formal architecture docs

### Rules

- **One file per day** — all work on the same day goes into the same file
- **Append new entries** — add new `### YYYY-MM-DD` sections at the top of the file (reverse chronological)
- **Keep entries short** — prefer bullet points, link to main docs or code paths
- **Not source of truth** — this is lightweight context, not normative architecture
- **Link to real docs** — when referencing a design decision, link to the architecture doc or code path

### Entry Format

```markdown
# Development Log — YYYY-MM-DD

### YYYY-MM-DD

- Brief description of what happened.
- Link to doc or code path: `docs/architecture/foo.md` or `packages/bar/src/baz.ts:42`
- Key decision: ...
- Next step: ...
```

### Adding a New Entry

When adding a new log entry for today:

1. Open `docs/logs/{year}/{month}-{day}.md` (create if it doesn't exist)
2. Add a `### YYYY-MM-DD` section at the top (before any existing entries)
3. Write your bullets
4. If the day already has earlier entries, append after a blank line separator

## Index (Reverse Chronological)

### 2026-03

- [03-31](2026/03-31.md) — test fixes, types.ts split, word editor phases, architecture audit, debugger inspector, refactoring guidelines
- [03-30](2026/03-30.md) — condition builder, code editor (full implementation + SQL enhancement), amis editor research, sticky headers, report designer refactoring, shadcn/ui migration
- [03-29](2026/03-29.md) — testid support, architecture conformance audit, spreadsheet canvas CSS, AGENTS.md routing table, expression editor, nop-debugger phases 1-3
- [03-28](2026/03-28.md) — shadcn/ui migration phases, flow designer node visual matching + button theme token fix
- [03-27](2026/03-27.md) — flow designer production-parity refactor, canvas-bridge schema-driven rendering, component resolution, action syntax, nop-debugger pinned errors, FieldFrame, formula parser fix
- [03-26](2026/03-26.md) — flow designer JSON rendering, dynamic-renderer, data-source renderer, ApiObject/DataSource design
- [03-25](2026/03-25.md) — flux-core refactoring, rename AMIS→Flux, AMIS type definitions, styling system, classAliases, TailwindCSS integration, flow canvas simplification, report designer migration, React Flow v12 fix
- [03-24](2026/03-24.md) — flow editor parity phases 2-6, theme compatibility, debugger launcher fixes, playground refactor
- [03-23](2026/03-23.md) — playground experience design, flow designer collaboration docs, canvas adapters, action scope runtime
- [03-22](2026/03-22.md) — action scope and import design, flow designer core package creation
- [03-21](2026/03-21.md) — flow designer playground plan, flow designer documentation review, amis-debugger entry-point refactor
- [03-20](2026/03-20.md) — bug fixes (array-editor, submit race, validate overwrite), bug analysis, checkbox-group fix, debugger design and implementation
