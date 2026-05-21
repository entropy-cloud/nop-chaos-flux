# Inefficiency Analysis & Recommendations

> Generated: 2026-05-21 UTC
> Data source: Top 30 sessions (by message count) from `opencode.db`

## 1. Edit Failure Root Cause Analysis

### Overview

From 5,670 edit/apply_patch operations in top 30 sessions:

- **Completed**: 5,370 (94.7%)
- **Error**: 300 (5.3%)

### Error Classification

| Error Type                                             | Count | % of Errors | Description                                                                                                                                    |
| ------------------------------------------------------ | ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **oldString not found** (edit tool)                    | ~250  | 83%         | The `oldString` content no longer matches the file — typically because a **previous edit** in the same session changed the surrounding context |
| **apply_patch verification failed** (apply_patch tool) | ~36   | 12%         | Patch expected certain lines but they were modified by a prior patch — **stale context after serial edits**                                    |
| **multiple matches**                                   | 6     | 2%          | `oldString` matched multiple locations — needs more surrounding context                                                                        |
| **empty/other**                                        | 8     | 3%          | Edge cases                                                                                                                                     |

### Root Cause: Sequential Edit Drift (NOT concurrent editing)

**The dominant failure mode is NOT concurrent editing — it is serial edit drift.**

When the agent edits file A at line 100, then edits file A again at line 200 using an `oldString` that it read **before** the first edit, the line numbers and surrounding context may have shifted. The pattern is:

```
1. Read file (sees content at lines 1-500)
2. Edit at line 200 (success) — shifts content
3. Edit at line 350 using oldString from step 1 (FAILS) — context has drifted
```

**Evidence from data**:

| File                                  | Total Edits | Success-to-Error Drift | Notes                                                 |
| ------------------------------------- | ----------- | ---------------------- | ----------------------------------------------------- |
| `docs/analysis/2026-04-16-*`          | 30          | 6                      | Documentation file; edits shifting markdown structure |
| `flux-renderers-data/src/...`         | 27          | 3                      | Renderer code; edits changing imports/types           |
| `templates/amis/.../menu.tsx`         | 11          | 2                      | Component file; concurrent edits on same file         |
| `docs/plans/97-comprehensive-*`       | 21          | 2                      | Plan document; edits shifting checklist items         |
| `flux-runtime/src/schema-compiler.ts` | 5           | 5                      | **5 consecutive failures** — classic drift loop       |

**The `schema-compiler.ts` case is illustrative**: the agent edited this file 5 times in a row, each time the LSP detected errors, the agent tried to fix them, but each fix introduced new errors because the file content kept changing. This is a **fix-introduces-new-error loop**, not a concurrent edit problem.

### Distinction from Concurrent Editing

There is **no evidence of concurrent editing** (two parallel agents editing the same file simultaneously). All failures are:

1. **Serial drift**: Edit A changes file, then Edit B (based on pre-A content) fails
2. **Fix loops**: Edit succeeds but introduces LSP errors, triggering more edits that also fail

---

## 2. Search Inefficiency Classification

### Category A: File Too Large (multi-offset reads)

**1,546 file-session pairs** show multi-offset reads in top 30 sessions alone.

| File                                      | Reads | Offset Reads | Size Estimate |
| ----------------------------------------- | ----- | ------------ | ------------- |
| `amis-runtime/src/index.ts`               | 119   | 116          | ~2,000+ lines |
| `flux-runtime/src/index.test.ts`          | 93    | 92           | ~2,000+ lines |
| `report-designer-renderers/src/index.tsx` | 67    | 65           | ~2,000+ lines |
| `FlowDesignerExample.tsx`                 | 53    | 48           | ~1,500+ lines |
| `flow-designer-renderers/src/index.tsx`   | 51    | 47           | ~2,000+ lines |

**Root cause**: The `read` tool returns max 2000 lines per call. Files larger than this require multiple reads with offset. The agent sometimes re-reads the same section multiple times because it can't hold the entire file in context.

**Impact**: Each large file read is 3-6x more expensive than a small file. With 1,546 multi-offset reads across 30 sessions, this accounts for an estimated **3,000-6,000 extra read operations**.

### Category B: Exploratory Search (many files, one read each)

Many sessions show 20-50 unique files read once. This is import chain tracing:

```
read index.ts -> see import from './scope' -> read scope.ts -> see import from './form-store' -> ...
```

**Root cause**: No upfront project index. The agent discovers the codebase structure by following imports, reading each file to find the next.

**Impact**: Each import chain trace reads 5-15 files. In a session with multiple chains, this can total 30-60 reads that could be avoided with a proper index.

### Category C: Directory Exploration (ls/find loops)

Particularly in the `nop-entropy` (Java) project, sessions show patterns like:

```bash
ls -la nop-ai
find nop-ai -type f -name "*.java" | head -20
ls -la nop-ai/nop-ai-skills
find nop-ai -name "*.xdef" | head -10
ls -la nop-ai/nop-ai-mcp-server
find nop-ai -name "*.java" | xargs grep -l "MCP" | head -20
```

**Root cause**: Flat directory structure with many subdirectories; agent must explore tree structure via repeated `ls` + `find`.

**Impact**: 10-30 bash commands per "locate a file" task in unfamiliar directories.

---

## 3. Time Inefficiency: Interruption Tax

### Global Time Stats

| Metric                      | Value        |
| --------------------------- | ------------ |
| Total wall clock time       | 69,305 hours |
| Total active execution time | 2,649 hours  |
| Active ratio                | 3.8%         |

The 3.8% active ratio means **96.2% of wall clock time is idle** (user away, overnight, weekend).

### Session Resumption Cost

When a session is interrupted and resumed, the agent must:

1. Re-read the current state of modified files (they may have changed during the break)
2. Re-establish context about what was being done
3. Re-discover where it left off

For the top 10 most-interrupted sessions (13-27 interruptions each), this "resumption tax" likely accounts for 10-20% of their active time.

---

## 4. Recommendations

### High Priority (eliminates 30-50% of waste)

1. **Split large files**: Files >500 lines should be evaluated for extraction (already noted in AGENTS.md). The worst offenders are `index.ts` barrel files — split into focused modules.
   - Target: `amis-runtime/src/index.ts`, `flux-runtime/src/index.test.ts`, renderer `index.tsx` files.

2. **Maintain `AGENTS.md` project index per repo**: Key directories, naming conventions, entry points, module ownership. This eliminates import-chain tracing and directory exploration.
   - Current state: `nop-chaos-flux` has AGENTS.md; `nop-entropy` does not.

3. **Use `glob`/`grep` tools instead of bash `find`/`grep`**: Native tools handle Windows paths better and avoid shell escaping issues.

### Medium Priority (reduces edit failure rate)

4. **Edit batching**: When making multiple edits to the same file, compute all `oldString` values from the **current** file state (after previous edits), not from the originally-read state.
   - Implementation: After each edit, re-read the file before computing the next edit's `oldString`.

5. **Reduce fix-introduce-error loops**: When an edit introduces LSP errors, read the error carefully and plan the fix before applying. The `schema-compiler.ts` case (5 consecutive failures) could have been avoided with one careful read.

6. **Prefer `edit` over `apply_patch`**: The `edit` tool has clearer error messages ("Could not find oldString" vs "Failed to find expected lines"). Use `apply_patch` only for multi-file changes.

### Low Priority (hygiene)

7. **Session restart after 500 messages**: Context degradation after long sessions leads to more errors. Start a fresh session and summarize state.

8. **Batch file reads**: Read multiple files in parallel when they are independent.

9. **Cache build results**: Avoid `mvn clean` unless truly necessary; use incremental compilation.
