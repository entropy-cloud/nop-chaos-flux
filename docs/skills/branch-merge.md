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

### Procedure

1. **Commit all uncommitted work** on the source branch first.

2. **Checkout master and rebase onto source branch**:

```bash
git checkout master
git rebase <source-branch>
```

   This replays all of master's commits on top of the source branch's tip, producing a **fully linear history**. Every commit from the source branch appears directly in master's log with no merge nodes.

3. **If master is checked out in another worktree**, remove it first:

```bash
git worktree remove <path-to-master-worktree>
git checkout master
git rebase <source-branch>
```

4. **Verify** on master:

```bash
pnpm typecheck && pnpm build  # (or project-appropriate commands)
```

5. **Result**: `git log --graph` shows a single linear chain. No branch names, no merge bubbles.

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
