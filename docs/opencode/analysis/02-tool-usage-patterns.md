# Tool Usage Patterns

> Generated: 2026-05-21 UTC

## Global Tool Usage (across all sessions)

| Tool        | Total Calls | Notes                                                 |
| ----------- | ----------- | ----------------------------------------------------- |
| bash        | ~68,000+    | Most used; heavy in build/test cycles and file search |
| read        | ~50,000+    | Second most used; file reading                        |
| apply_patch | ~15,000+    | Code modification (primary edit tool)                 |
| todowrite   | ~12,000+    | Progress tracking in long sessions                    |
| edit        | ~8,000+     | Targeted string replacement                           |
| glob        | ~6,000+     | File pattern search                                   |
| grep        | ~5,000+     | Content search                                        |
| write       | ~4,000+     | Full file writes                                      |
| task        | ~2,000+     | Subagent delegation                                   |
| webfetch    | ~500+       | URL fetching                                          |

## Bash Command Patterns

### Build/Compile Commands

The most repeated bash commands are Maven and pnpm build/test cycles:

| Pattern                           | Frequency | Issue                                 |
| --------------------------------- | --------- | ------------------------------------- |
| `mvn -q -pl <module> test`        | Very high | Repeated compile+test after each edit |
| `mvn -q -DskipTests=true compile` | High      | Compile-only check before test        |
| `pnpm typecheck`                  | High      | Type checking after changes           |
| `pnpm test`                       | Medium    | Running test suites                   |

### Search/Explore Commands

| Pattern                        | Frequency | Issue                                                  |
| ------------------------------ | --------- | ------------------------------------------------------ |
| `find <dir> -name "*.java"`    | Very high | Locating files by name — could use `glob` tool instead |
| `ls -la <dir>`                 | Very high | Directory listing — repeated to navigate tree          |
| `grep -rn "pattern" <dir>`     | High      | Content search — could use `grep` tool instead         |
| `find <dir> -type f -name "*"` | Medium    | Exploratory find with various filters                  |

### Git Commands

| Pattern                 | Frequency | Issue                       |
| ----------------------- | --------- | --------------------------- |
| `git status`            | High      | Checking working tree state |
| `git diff`              | Medium    | Reviewing changes           |
| `git add && git commit` | Medium    | Committing changes          |

## Read Pattern Analysis (top 30 sessions)

### Files Read with Multiple Offsets (file too large for single read)

| File                                    | Total Reads | Offset Reads | Root Cause                           |
| --------------------------------------- | ----------- | ------------ | ------------------------------------ |
| amis-runtime/src/index.ts               | 119         | 116          | File >2000 lines; read in chunks     |
| flux-runtime/src/index.test.ts          | 93          | 92           | Large test file; incremental reading |
| report-designer-renderers/src/index.tsx | 67          | 65           | Generated/large component file       |
| FlowDesignerExample.tsx                 | 53          | 48           | Playground example file              |
| flow-designer-renderers/src/index.tsx   | 51          | 47           | Large renderer file                  |

**Pattern**: These files are typically 500-2000+ lines. The agent reads them in 2000-line chunks with sequential offsets, sometimes re-reading the same sections. This is a **file size problem**: the Read tool's 2000-line default limit forces multiple reads of large files.

### Files Read Once (exploratory navigation)

Many sessions show a pattern of reading 20-50 different files once each, tracing through imports:
`index.ts` -> `schema-compiler.ts` -> `scope.ts` -> `form-store.ts` -> ...

This is a **project knowledge problem**: the agent doesn't know the codebase structure upfront and must follow import chains to find relevant code.

## Observations

1. **File size is the primary read inefficiency**: Large files (500+ lines) require 2-5 reads each. Top offenders: `index.ts` files in renderer packages, large test files.
2. **Import chain tracing is the secondary read inefficiency**: Agent follows `import -> definition -> import -> definition` chains, reading many files once.
3. **Bash is over-used for search**: `find` and `grep` commands in bash could be replaced by native `glob` and `grep` tools which are more efficient on Windows.
4. **Build cycles dominate bash usage**: Maven/pnpm compile+test after every edit change is the single biggest bash time sink.
