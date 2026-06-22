---
name: dependabot-pr-fixer
description: Diagnose and fix failing Dependabot dependency-update pull requests, then push the fix to the PR's own branch without undoing the version bump. Use this whenever the user points at a Dependabot PR (by URL or number) and asks to fix it, make its checks pass, resolve the breakage from a version bump, or "push to the same branch" — including major-version bumps that need code migration, lockfile or peer-dependency conflicts, type and build errors, and pub or github-actions update PRs. Trigger even when the user just pastes a `dependabot/...` PR link with a terse "fix this", and whenever a dependency-bump branch needs to go green.
---

# Dependabot PR Fixer

Diagnose why a Dependabot dependency-update PR is failing (or otherwise needs work), apply the smallest change that makes it pass, and push that change to the PR's own branch — without undoing the version bump Dependabot proposed.

## Core principle: keep the bump, fix the fallout

A Dependabot PR exists to land a new dependency version. The job is to make *that version* work, not to make the checks green by any means. Two tempting shortcuts both defeat the point:

- **Reverting the bump.** Pinning the dependency back, loosening a constraint so the old version resolves again, or dropping the change makes the PR pointless. If the new version genuinely can't be adopted, stop and report why — don't quietly neutralize it.
- **Hiding the failure.** Skipping the failing test, adding a blanket `// @ts-ignore`, disabling the lint rule, or `continue-on-error` makes CI lie. Fix the underlying cause. The only acceptable suppressions are ones that would survive code review.

Everything below flows from this: make a minimal, honest diff that adapts the code/config to the new version, verify it locally, and push.

## Before you start

This skill assumes a Claude Code-style environment with:
- `git` and the GitHub CLI (`gh`) already authenticated for the repo,
- the ability to install dependencies and run the project's build/tests,
- write access to the repo (Dependabot branches live on the same repo, so a normal `git push` updates the PR).

If `gh` isn't authenticated or the build can't be run, say so rather than guessing.

## Procedure

### 1. Resolve the PR
Accept a URL (`https://github.com/<owner>/<repo>/pull/<n>`) or a bare number. Derive `<owner>/<repo>` and the number. If only a number is given and the working directory is a clone, infer the repo from the remote.

### 2. Check out the branch
```
gh pr checkout <n>
```
This puts you on the PR's head branch (the `dependabot/...` branch). This *is* "the same branch" the user means — every commit and push from here updates the PR automatically. No separate branch name needs to be supplied.

### 3. Understand the change and the failure
- `gh pr view <n>` — title, body (Dependabot lists the version delta and links release notes / changelog / commits) and the checks.
- `gh pr checks <n>` — which checks are red.
- **Find the ecosystem and working directory from the changed files, not the branch name.** Branch names mangle scoped packages and nested paths, so trust the diff:
  ```
  gh pr view <n> --json files --jq '.files[].path'
  ```
  Map the changed manifest to an ecosystem:

  | Changed manifest | Ecosystem | Reference |
  |---|---|---|
  | `package.json`, `yarn.lock`, `package-lock.json`, `pnpm-lock.yaml` | npm / yarn / pnpm | `references/npm-yarn.md` |
  | `pubspec.yaml`, `pubspec.lock` | Dart / Flutter (pub) | `references/pub.md` |
  | `.github/workflows/*.yml` | GitHub Actions | `references/github-actions.md` |

  The manifest's directory is your working directory (a changed `api/package.json` means `cd api`).
- Note the **package name and version delta**, and whether it's a **major** bump. Major bumps are where breaking changes live — expect to read the changelog.

### 4. Read the failing logs
Don't guess from the check name. Pull the actual error:
```
gh run view <run-id> --log-failed      # run-id from `gh pr checks`
```
Read enough to identify the *category* of failure: install/lockfile, peer/version conflict, type error, runtime/test failure, or build error. The ecosystem reference maps categories to fixes.

### 5. Reproduce locally
`cd` into the working directory and run the same steps CI runs (install, then the failing job — typecheck, build, test, lint). Reproduce the red before trying to make it green; a failure you can't reproduce is one you can't confidently fix.

### 6. Diagnose and fix
Open the matching reference file and work through its failure catalog. For **major bumps**, before editing code, read the new version's breaking changes — the Dependabot PR body usually links them; otherwise check the package's CHANGELOG, release notes, or migration guide. Then search the codebase for the package's APIs and apply the smallest set of edits that adapts the project to the new version.

### 7. Verify
Re-run the exact checks that were failing, locally, until they pass. If a check depends on secrets or services not available locally, note which ones couldn't be verified and let CI confirm them after the push — but verify everything you *can*. Never report success on the strength of a check you didn't run.

### 8. Commit and push to the same branch
- Stage only the files the fix needed. Keep Dependabot's own commit; add yours on top.
- Use a clear conventional message, e.g. `fix(deps): adapt to firebase-admin 14 breaking changes`.
- Push:
  ```
  git push
  ```
  Because you're on the checked-out PR branch, this updates the PR. **Do not force-push or rebase** unless a check specifically requires it (e.g. a required-linear-history rule) — and if you must, say so explicitly.
- Relay this heads-up: once a human or agent pushes to a Dependabot branch, Dependabot stops auto-rebasing and recreating that PR. That's expected behavior, not a problem.

### 9. Confirm and report
Re-check `gh pr checks <n>` (CI re-runs on push), then give the report below.

## Guardrails

- **Only the PR's branch.** Never push to the default branch or any other branch, and never touch files unrelated to making this bump pass.
- **Minimal diff.** Adapt to the new version and nothing more — no opportunistic refactors, formatting sweeps, or unrelated bumps. A reviewer should see only the bump and its necessary fallout.
- **Keep the version Dependabot chose** (see core principle).
- **No dishonest greens** — no skipped tests, blanket ignores, or `continue-on-error` to dodge a real failure.
- **Stop and report** if the fix would need risky changes outside the PR's scope, or if the new version conflicts with a constraint that shouldn't be changed unilaterally. A clear "here's why this bump is hard" beats a quietly broken merge.

## Report format

End with a short summary:
- **What was failing** — one line per failing check plus the root cause.
- **What you changed** — the files and the gist (e.g. "migrated `getAuth()` call sites to the v14 modular API").
- **Verification** — which checks ran locally and their result; which were left to CI and why.
- **Pushed** — commit SHA, confirmation it went to the PR branch, and the Dependabot hand-off note if relevant.
- **Anything left** — checks still pending in CI, follow-ups, or a blocker if you stopped.

## Worked example

> "Please fix https://github.com/TPN-Labs/Grilutze/pull/782 and push to the same branch."

1. `gh pr checkout 782` → now on `dependabot/npm_and_yarn/api/firebase-admin-14.0.0`.
2. `gh pr view 782 --json files --jq '.files[].path'` shows `api/package.json` + `api/yarn.lock` → npm/yarn ecosystem, working dir `api/`. The bump is `firebase-admin` to `14.0.0`, a **major** bump.
3. `gh pr checks 782` shows the `api` build red; `gh run view <id> --log-failed` shows TypeScript errors at the Firebase Admin call sites.
4. `cd api && yarn install --immutable && yarn build` reproduces the errors.
5. Read firebase-admin v14's breaking changes (linked in the PR body), then update the affected call sites following `references/npm-yarn.md`.
6. `yarn build && yarn test` pass.
7. Commit `fix(deps): adapt api to firebase-admin 14`, then `git push`.
8. `gh pr checks 782` is re-running; report what changed, what's verified, and what's pending.
