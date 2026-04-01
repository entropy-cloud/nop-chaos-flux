# Branch Merge Skill

AI-assisted git branch merge with conflict resolution.

## Trigger

User asks to merge one branch into another, or mentions merging branches with potential conflicts.

## Prerequisites

- Both branches exist locally (fetch first if needed)
- Working tree is clean (stash or commit first)

## Procedure

### Phase 1: Pre-Merge Analysis

Run in parallel before any merge action:

```bash
git branch --show-current
git log --oneline -10 <target-branch>
git log --oneline -10 <source-branch>
git merge-base <target-branch> <source-branch>
git diff --name-only <merge-base>..<target-branch>
git diff --name-only <merge-base>..<source-branch>
# Files changed on BOTH branches (potential conflicts)
comm -12 <(sort <(git diff --name-only <merge-base>..<target-branch>)) \
         <(sort <(git diff --name-only <merge-base>..<source-branch>))
```

Present to user: changed file count per branch, overlapping files, brief summary of each branch's changes.

### Phase 2: Dry-Run Merge

```bash
git merge --no-commit --no-ff <source-branch> 2>&1
git diff --name-only --diff-filter=U  # conflicted files
```

### Phase 3: Conflict Resolution

For each conflicted file, read both versions and resolve:

```bash
git show :2:<file>  # ours
git show :3:<file>  # theirs
```

**General principles (apply to all file types):**

1. **Lock files** — never manually merge. Pick either side, regenerate with the project's package manager.
2. **Dependency manifests** — union both dependency sets; for the same dependency, keep the higher version unless context suggests otherwise.
3. **Config/build files** — union fields/sections; preserve structure of both branches.
4. **Source code** — read both versions, understand each branch's intent, produce a semantically correct combined result that preserves all functional changes from both sides.
5. **Generated/vendored files** — pick one side, regenerate from source if possible.
6. **Docs/text** — union sections, resolve text conflicts by keeping all unique content.

### Phase 4: Post-Merge Verification

```bash
git diff --name-only --diff-filter=U  # must be empty
```

Then run the project's build and test commands. Detect the build system from root-level files (`pom.xml`, `build.gradle`, `package.json`, `go.mod`, `Cargo.toml`, `Makefile`, etc.) and run appropriate commands.

If verification fails, diagnose and fix before committing.

### Phase 5: Commit

Only after user confirms or verification passes:

```bash
git commit -m "Merge <source-branch> into <target-branch>"
```

Summarize what was merged and any notable resolution decisions.

## Safety

- `git merge --abort` at any point to restore pre-merge state.
- If more than 10 conflicted files: report list, group by strategy, process auto-resolvable first, AI-merge in batches of 3-5, verify after each batch.

---

## Rebase-to-Master (Linear History)

### When to Use

User wants to integrate a feature/fix branch into master **without any branch trace** — the commit history on master should look as if all work was done directly on master. No merge commits, no branch references visible in `git log --graph`.

### Prerequisites

- All changes on the source branch are committed (no dirty working tree)
- The source branch has been merged or rebased to include all needed content

### ⚠️ Critical: `--ours` / `--theirs` Semantics Inversion

During rebase, the meaning of "ours" and "theirs" is **reversed** compared to merge:

| Context | `--ours` means | `--theirs` means |
|---|---|---|
| `git merge` | Current branch (target) | Incoming branch (source) |
| `git rebase` | Base branch (target/master) | Commit being replayed (source/feature) |

This is a common gotcha. If you want the feature branch's version during a rebase conflict, use `git checkout --theirs <file>` — NOT `--ours`.

```bash
# During rebase: accept the FEATURE branch's version of a file
git checkout --theirs <file>

# During rebase: accept MASTER's version of a file
git checkout --ours <file>
```

### Procedure

1. **Commit all uncommitted work** on the source branch first.

2. **Checkout source branch and rebase onto master** (preferred — replays source commits on top of master):

```bash
git checkout <source-branch>
git rebase master
# Resolve conflicts commit-by-commit (see Sequential Conflicts below)
git checkout master
git merge <source-branch> --ff-only  # fast-forward master to rebased tip
```

   OR **checkout master and rebase onto source branch** (alternative):

```bash
git checkout master
git rebase <source-branch>
```

3. **If the branch is in a worktree**, rebase directly in that worktree instead of removing it:

```bash
# Run rebase in the feature branch's worktree directory
git -C <worktree-path> stash push -u -m "pre-rebase"  # stash including untracked
git -C <worktree-path> rebase master
# Resolve conflicts in the worktree
# Then fast-forward merge from master
git checkout master
git merge <source-branch> --ff-only
```

4. **Verify** on master:

```bash
pnpm typecheck && pnpm build  # (or project-appropriate commands)
```

5. **Result**: `git log --graph` shows a single linear chain. No branch names, no merge bubbles.

### Sequential Conflict Resolution

Unlike `git merge` which exposes all conflicts at once, **rebase presents conflicts one commit at a time**. This means:

1. **The same file may conflict multiple times** across different commits (e.g., a dev-log or changelog that both branches append to). Each occurrence must be resolved independently.
2. **Resolution loop**:

```bash
# Rebase starts, hits conflict
git status --porcelain            # identify conflicted files (UU = both modified)
# ... resolve conflicts ...
git add <resolved-files>
git rebase --continue             # moves to next commit, may hit more conflicts
# Repeat until rebase completes
```

3. **Abort if lost**: `git rebase --abort` at any point returns to pre-rebase state.

### Module Extraction Conflicts

When master has **refactored a monolithic file into multiple modules** (e.g., `index.ts` → `compile.ts` + `evaluate.ts` + `scope.ts`), and the source branch has changes to the **original monolithic file**, text-level conflict resolution will fail. Strategy:

1. **Identify the refactoring intent**: check what master did — `git diff <merge-base>..master -- <file>`
2. **Locate where each logical change belongs** in the new module structure.
3. **Apply the source branch's *functional changes* to the correct new module**, not the old file. For example, if source added try-catch resilience to `compileNode()` and master moved `compileNode()` to `compile.ts`, apply the try-catch to `compile.ts` — don't try to resurrect the old `index.ts` structure.
4. **Restore master's version** of the file that should remain a thin re-export barrel, then apply the source branch's actual logic changes to the appropriate extracted module.

This pattern applies to any language where refactoring extracts functions/types/classes from one file into multiple files.

### Post-Rebase Fix Commits

Conflict resolution during rebase may introduce **compilation or type errors** that only surface when running typecheck/build. This is especially common with module extraction conflicts where imports/references get broken.

After rebase completes:

```bash
pnpm typecheck  # (or project-appropriate check)
```

If errors appear:

1. Check if the error is in a file you modified during conflict resolution.
2. If yes, fix the file and commit as a post-rebase fixup:

```bash
git add <fixed-files>
git commit -m "fix: correct rebase conflict resolution in <module>"
```

3. If the error existed on master before the rebase (check by running the same command on master), it's pre-existing — note it but don't fix unless asked.

### Why `rebase` Instead of `merge --squash`

| Approach | Commit granularity | Original messages | Branch traces |
|---|---|---|---|
| `git rebase <source>` | Preserved | Preserved | None |
| `git merge --squash <source>` | Single blob | Lost | None |
| `git merge --no-ff <source>` | Preserved | Preserved | Merge bubble visible |

`rebase` is preferred because it keeps the original commit structure (useful for `git bisect`, `git log -S`, blame) while still producing a clean linear history on master.

### Caveats

- Commit hashes will change (rewrite). This is expected and harmless for private repos.
- If the source branch was already pushed to remote, rebase requires `git push --force-with-lease` on master.
- If master was already pushed and others have based work on it, coordinate with the team before force-pushing.

---

## Universal Conflict Patterns

These patterns recur across **all** projects and languages. When you encounter a conflict, classify it by pattern first — the resolution strategy follows automatically.

### Pattern 1: Parallel Addition to Shared Registry

**Signature**: Both branches add entries to the same array, union type, switch statement, export list, or key-value map.

**Examples**:
- TypeScript union type: `'home' | 'page-a'` vs `'home' | 'page-b'` → `'home' | 'page-a' | 'page-b'`
- Route switch: `{page === 'a' && <A/>}` vs `{page === 'b' && <B/>}` → keep both cases
- Barrel export: `export { A } from './a'` vs `export { B } from './b'` → keep both lines
- Config paths map: `"@pkg/a": [...]` vs `"@pkg/b": [...]` → keep both entries
- Nav/sidebar config: both branches add a new item to a JSON array

**Resolution**: Union — keep all additions from both sides. Order should match the convention of the file (alphabetical, feature-grouped, etc.).

**Why it works**: Additions to registries are commutative. Neither branch knew about the other's addition, but they never contradict each other.

### Pattern 2: Chronological Log Collision

**Signature**: Both branches append entries under the same date heading, version, or changelog section.

**Examples**:
- Dev logs: both branches add `### 2026-03-31` entries with different content
- CHANGELOG.md: both add entries under `## [Unreleased]`
- Release notes: same version, different feature lists

**Resolution**: Keep all entries from both sides. If dates/versions match exactly, preserve chronological order within the section (earlier work first). Do NOT merge entries into one — keep them as separate paragraphs.

**Pitfall**: During rebase, this pattern may fire **multiple times** (once per commit that touched the log). Each occurrence must be resolved independently.

### Pattern 3: Dependency Version Divergence

**Signature**: Both branches modify the same dependency version in `package.json`, `pom.xml`, `Cargo.toml`, etc.

**Resolution**:
1. If one branch **bumps** and the other **didn't touch it** → take the bump
2. If both **bump to different versions** → take the higher version, unless one is a major breaking change that the other branch doesn't support
3. If one **adds** and the other **removes** → understand intent (was it replaced? removed?)
4. Always regenerate lock files after resolving manifest conflicts

### Pattern 4: Structural Refactoring vs. Feature Addition

**Signature**: One branch reorganizes code (file splits, renames, module extraction) while the other adds features to the original locations.

**Examples**:
- Master splits `index.ts` into `compile.ts` + `evaluate.ts` + `scope.ts`, feature branch adds error handling to `index.ts`
- Master moves a class from `service.ts` to `service/` directory, feature branch adds a method to that class
- Master renames `utils.ts` to `helpers.ts`, feature branch adds a function to `utils.ts`

**Resolution**:
1. Identify where each logical change **belongs** in the new structure
2. Apply the feature branch's **functional intent** to the new location — not the old file
3. Do NOT try to resurrect the old file structure
4. The key insight: you're porting *semantics*, not *text*

This is the hardest pattern. See "Module Extraction Conflicts" above for detailed strategy.

### Pattern 5: Auto-Generated / Derived Files

**Signature**: Files that are the output of a tool — lock files, dist/, `.d.ts`, generated code, bundled output.

**Examples**: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `go.sum`, `Cargo.lock`, `*.min.js`, `dist/`, docs generated from source comments

**Resolution**: Never merge textually. Pick one side's version, then regenerate:
- Lock files → pick one side, run `pnpm install` / `npm install` / `cargo build`
- Build output → pick one side, run build command
- Generated code → pick one side, regenerate from source

**Special case for lock files in rebase**: `git checkout --theirs pnpm-lock.yaml && pnpm install` (accept feature's manifest, regenerate lock).

### Pattern 6: Config Drift (Both Sides Add Sections)

**Signature**: Both branches add non-overlapping sections/fields to a config file (JSON, YAML, TOML, XML).

**Examples**:
- Both add new entries to `tsconfig.json` paths
- Both add new `<dependency>` blocks in `pom.xml`
- Both add new `scripts` entries in `package.json`
- Both add new environment variables to `.env.example`

**Resolution**: Union — merge both sets of additions. Preserve the structural ordering convention of the file (alphabetical keys, grouped by feature, etc.).

### Quick-Reference Decision Table

| Pattern | Signal | Strategy | Difficulty |
|---------|--------|----------|------------|
| Parallel registry addition | Two union types / switch cases / exports | Union both | Easy |
| Chronological log | Same date heading, different entries | Keep all entries | Easy (repetitive) |
| Dependency version | Same dep, different versions | Higher version, regenerate lock | Easy |
| Refactoring vs feature | File moved/split, changes to old location | Port semantics to new location | Hard |
| Auto-generated | Lock files, dist, generated code | Pick + regenerate | Trivial |
| Config drift | Non-overlapping sections added | Union both | Easy |

### Heuristic: Estimate Difficulty Before Starting

After `comm -12` identifies overlapping files, classify each:

1. **≥ 50% are registry/log/config patterns** → Quick merge, ~2-5 min
2. **Any refactoring pattern files** → Slow merge, plan before resolving
3. **≥ 5 overlapping generated/lock files** → Resolve all source files first, then regenerate once at the end

---

## Pre-Merge Checklist

Run through before starting any merge or rebase:

1. **Working tree clean?** `git status --porcelain` → stash or commit if dirty
2. **Both branches fetched?** `git fetch --all --prune` → especially if source branch is remote
3. **Worktree check**: `git branch --show-current` → if branch is in a worktree, operate in that worktree directory
4. **Overlapping file analysis**: Run `comm -12` → classify each by pattern above
5. **Identify the harder direction**: If one branch has 49 commits and the other has 7, rebase the smaller branch onto the larger — fewer conflict rounds

### Choosing Merge Direction

| Scenario | Best approach |
|----------|---------------|
| Small feature → large master | Rebase feature onto master, then ff merge |
| Large feature → small master | Rebase master onto feature, or merge --no-ff |
| Both branches large | Rebase the one with fewer commits since merge-base |
| Branch in worktree | Rebase in worktree, don't remove/re-add |
| Hotfix needs to go in fast | merge --no-ff (skip rebase) |

---

## Common Mistakes

1. **Forgetting `git add` before `rebase --continue`** — rebase will refuse to continue. Add the resolved files first.
2. **Resolving the "same" conflict identically each time** — during rebase, the same file may conflict at different commits with different diffs. Read the actual conflict each time; don't copy-paste the previous resolution.
3. **Merging lock files by hand** — always regenerate. Manual merge of lock files produces broken dependency trees.
4. **Not running `pnpm install` after resolving package.json conflicts** — the lock file and manifest must be in sync.
5. **Confusing `--ours`/`--theirs` in rebase** — rebase reverses the semantics. See the table above.
6. **Assuming pre-existing errors are caused by the merge** — always verify: does the error exist on master before the merge? If yes, it's pre-existing.
7. **Not restoring stashes after merge** — remember to `git stash pop` in both the main repo and any worktrees.
