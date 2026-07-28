# Diff-verification subagent

Commit subjects state intent, not what shipped. Before finalizing the changelog,
dispatch a **Sonnet** subagent to read the real diff and correct the draft.

## Why a subagent

The diff for a release can be hundreds of files. Reading it inline burns the main
context. A subagent reads the diff, returns only the corrections, and keeps the
orchestrating context clean.

## Launch prompt shape

Give the subagent: the repo path, the exact range, the draft changelog, and tight
focus rules. Ask for a structured report, not a rewrite.

```
You are verifying a draft release changelog against the ACTUAL file changes (not
commit messages) for the AnunțReal repo.

Range: tag `<base>` to `main` (use `git diff <base>..main` and `git log <base>..main`).
On the FIRST release there is no <base> tag — use the whole history: `git log main`
and spot-check `git diff` on the most recent substantive commits instead.

Read the real code diff and tell me where the draft below is WRONG, INCOMPLETE, or
OVERSTATED. Do NOT rely on commit subjects — open the changed files.

Focus rules:
- IGNORE dependency bumps and lockfiles (yarn.lock, package-lock.json, node_modules, chore(deps*)).
- Focus on real source/behavior under api/ and web/, plus apps/extension/, contracts/,
  docker/, .github/, and deployment config if user-visible.
- Audience is non-technical product managers.
- Start with `git diff --stat <base>..main -- api web apps/extension contracts` then read the substantive diffs.

DRAFT:
<paste the draft CHANGELOG entry>

Return:
1. CONFIRMED — draft bullets the diff supports (one line each).
2. CORRECTIONS — wrong/overstated bullets, with the accurate version + file evidence.
3. MISSING — user-visible changes in the diff but absent from the draft, with file evidence.
4. VERDICT — safe to ship as-is, or needs the listed edits?
Cite file paths. Do not modify any files.
```

## Using the result

Fold CORRECTIONS and MISSING into the draft before the approval gate. If the verdict
flags something material (a new endpoint, a security change, a behavior the commit
messages hid), the PM changelog must reflect it.
