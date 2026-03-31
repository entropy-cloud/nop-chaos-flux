# Development Logs

Development log entries are organized by date — one file per day.

## Structure

```
docs/logs/
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
# Development Log — 2026-04-01

### 2026-04-01

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
