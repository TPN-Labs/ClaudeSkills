---
name: cutting-releases
description: Use when cutting, publishing, or announcing a new release/version of AnunțReal for a deployment (dev or prod) — turning the work merged into main since the last release tag into a PM-friendly CHANGELOG entry, a GitHub release, and a Slack announcement, deploying to the target environment (dev is already live via merge; prod is dispatched here), moving the shipped Linear tickets to the right status, and listing the tickets shipped. Triggers include "cut a release", "release v1.1.x to dev/prod", "deploy to prod", "publish the changelog", "announce the release".
user-invocable: true
---

# Cutting Releases

## Overview

Turn everything merged into `main` since the last release tag into a deployed, announced release:

1. A **CHANGELOG.md** entry written for **non-technical product managers** — plain English, grouped by user-visible value, not by commit.
2. A **deployment to the target environment** (Coolify): **dev** is already live (it auto-deploys on every merge to `main`), so the release documents what's live; **prod** is dispatched here via the deploy workflows and watched to green before anything is announced.
3. A **GitHub release** for the new version, using those notes.
4. A **Slack announcement** to the release channel (`C0BK4HXD4TD`, `#anunt-real-ops`).
5. A **Linear status transition** for the shipped tickets, keyed to the target **environment** (see below).
6. A returned **list of the Linear tickets shipped**.

The mechanical "what changed" step is deterministic (a script). But **commit messages lie by omission** — verifying the changelog against the real file diff (via a subagent) and translating technical commits into PM-facing value are judgement steps that are yours.

## Environment parameter

Every run targets one environment — pass it explicitly (`--env=dev` or `--env=prod`). It controls the deploy action in the Publish phase and the Linear transition:

| `--env` | Deploy action | Linear transition |
|---|---|---|
| `dev` | **None to dispatch.** Dev deploys automatically on merge to `main` (Coolify push trigger on `api/**` and `web/**`), so the current `main` is already live on dev. The release just documents it. | Move each shipped ticket → **Deployed in DEV**. |
| `prod` | **Dispatch both prod deploys** — `api_deploy.yml` and `web_deploy.yml` via `workflow_dispatch` (prod Coolify UUID) — and watch each to green **before** the release is announced. | Find tickets currently in **Deployed in DEV** (intersected with this release's shipped set) and move them → **Done**. |

If the environment isn't given, ask — do not guess. It changes whether a prod deploy is dispatched, which tickets move, and where.

## The one hard rule: preview before you publish

**A GitHub release, a Slack post, a Linear status change, a `workflow_dispatch` that deploys prod, and a `git push` are outward-facing and effectively irreversible.** The Prepare steps touch nothing the outside world sees. The Publish steps do — including dispatching the prod deploy and moving Linear tickets. **Never run a Publish step until you have shown the human the drafted CHANGELOG entry, release notes, Slack message, target environment (and what deploy action it implies), and the exact list of Linear tickets that will be moved — and they have approved.**

| Red flag — STOP | Reality |
|---|---|
| "The drafts look obviously fine, I'll just publish" | The channel and the release are public to the team. Show the drafts, get a yes. |
| "They asked me to cut the release, that's approval to post" | Cutting the release ≠ approving unseen wording. Preview is the approval gate. |
| "I'll create the release now and fix the notes after" | A published release notifies watchers immediately. Get the notes right first. |
| "Dry-run and publish are basically the same" | Dry-run writes nothing external. Only cross the line on an explicit yes. |
| "The prod deploy is just CI, I can kick it off early" | It rolls out prod to real users — it's a Publish step, behind the same gate. |

Default to **preview mode**. Only enter Publish on an explicit go-ahead for *these specific drafts*.

## Workflow

### Prepare (no external side effects)

1. **Confirm the environment** (`dev` or `prod`) and **pick the range.** Base = the latest semver tag reachable from `main` (the script finds it). Head = `main` (releases are cut from main, not a feature branch — pass `--head=main`). New version = the next semver bump (patch by default; ask if unsure whether it's minor/major). **First release:** there is no tag yet, so the collector reports the whole history and the version is **`v1.0.0`** (see `references/changelog-style.md` for how to write a first-release entry).
2. **Collect the changes** deterministically:
   ```bash
   node .claude/skills/cutting-releases/scripts/collect-changes.mjs --head=main
   ```
   It prints JSON: grouped features/fixes/other, dependency-update count, deduped Linear IDs (prefix `ENG`), PR numbers, the compare URL, and a diffstat. It publishes nothing.
3. **Verify against the real file diff — do NOT trust commit names.** Commit subjects describe intent, not what actually landed. **Dispatch a subagent (Sonnet)** to read `git diff <base>..main` and check the draft against the actual code: what's confirmed, what's overstated/wrong, and what user-visible change is present in the diff but missing from the commit messages. Tell it to ignore dependency bumps/lockfiles and focus on real `api/`, `web/`, `apps/extension/`, `contracts/`, `docker/`, `.github/` changes. Fold its corrections into the draft before showing anyone. (See the launch prompt shape in `references/diff-verification.md`.)
4. **Curate the Linear tickets.** The script's `linearIds` includes IDs found in commit *bodies* — many are "blocked-by"/"related" references, not work shipped in this range. For each candidate, check status with the Linear MCP (`get_issue`). Keep only tickets whose code actually landed here (typically the ones that are the commit *scope*, e.g. `feat(ENG-207):`). Drop anything still in Backlog/Todo or merely referenced. This curated set drives both the "tickets shipped" report and the Linear transition in the Publish phase.
5. **Draft the artifacts** in the house style (see `references/changelog-style.md`): the `CHANGELOG.md` entry, the GitHub release notes / `releases/<version>.md`, and the Slack message. **Show all of them — plus the environment (with the deploy action it implies) and the list of Linear tickets that will be transitioned — to the human and stop for approval.**

### Publish (only after explicit approval)

6. **Deploy the target environment.**
   - **`--env=dev`:** nothing to dispatch. Dev already deployed the merge that produced this `main`. Confirm the current `main` is what's live (no pending deploy run failed), and move on.
   - **`--env=prod`:** dispatch **both** prod deploys and watch each to green **before** creating the release or announcing anything:
     ```bash
     gh workflow run api_deploy.yml --ref main
     gh workflow run web_deploy.yml --ref main
     gh run list --workflow=api_deploy.yml --limit 1   # note the <run-id>
     gh run list --workflow=web_deploy.yml --limit 1    # note the <run-id>
     gh run watch <run-id> --exit-status                # once per run
     ```
     If either run fails, **stop** — do not tag, release, or announce a prod rollout that didn't land. (`workflow_dispatch` uses the prod Coolify UUID; the `push`-triggered job is the dev deploy and does not run here.)
7. **Write the files.** Insert the new entry at the top of the version list in `CHANGELOG.md` (create the file on the first release), and create `releases/<version>.md`. Commit on a branch and open a PR (never commit release notes straight to `main` locally, unless told otherwise). These files are documentation only — they do **not** trigger a deploy (the dev auto-deploy watches `api/**`/`web/**`, not root docs), so the PR can merge independently of the rollout in step 6.
8. **Create the GitHub release:**
   ```bash
   gh release create <version> --title "<version> — <headline>" --notes-file releases/<version>.md --target main
   ```
   (Use `--notes-file`; do not paste multi-line notes inline.)
9. **Transition the Linear tickets** for the curated shipped set, using the Linear MCP (`get_issue` to read the current state, `save_issue`/`update_issue` to set the state by name). **Never move a ticket backward** — the workflow order is `Backlog → Todo → In Progress → In Review → Deployed in DEV → Done`:
   - `--env=dev` → move each shipped ticket to **Deployed in DEV**, but **skip any already at or past it** (already Deployed in DEV, or already Done — don't regress a finished ticket).
   - `--env=prod` → for each shipped ticket currently in **Deployed in DEV**, set state to **Done**. Skip (and report) tickets not in that state — don't force a Done on a ticket that never reached dev, and don't touch ones already Done.
   Report every transition made and every one skipped, with the reason.
10. **Post to Slack** via the Slack MCP tool `slack_send_message` to channel `C0BK4HXD4TD` with the approved message. (Use the MCP tool — no bot token needed.)
11. **Report** the curated list of Linear tickets shipped (with links), their new statuses, and — for `--env=prod` — the deploy run URLs; for `--env=dev`, note that the current `main` is what's live.

## Quick reference

| Need | Command / tool |
|---|---|
| What changed since last tag | `node .claude/skills/cutting-releases/scripts/collect-changes.mjs --head=main` |
| Verify collector logic | `node --test '.claude/skills/cutting-releases/scripts/*.test.mjs'` |
| Verify draft vs real diff | Dispatch a Sonnet subagent on `git diff <base>..main` (see `references/diff-verification.md`) |
| Confirm a ticket actually shipped | Linear MCP `get_issue ENG-XX` → check status |
| Move ticket state | Linear MCP `save_issue`/`update_issue` → state `Deployed in DEV` (dev) or `Done` (prod) |
| Deploy prod (api + web) | `gh workflow run api_deploy.yml --ref main` · `gh workflow run web_deploy.yml --ref main` |
| Wait for a deploy to finish | `gh run watch <run-id> --exit-status` |
| Create the release | `gh release create <version> --notes-file releases/<version>.md --target main` |
| Announce | Slack MCP `slack_send_message` → channel `C0BK4HXD4TD` |
| Constants | Release channel `C0BK4HXD4TD` (`#anunt-real-ops`) · Linear workspace slug `tpn-labs`, team `Engineering` (prefix `ENG`) · states `Deployed in DEV`, `Done` |

## Common mistakes

- **Cutting from the wrong ref.** Running against the current feature branch instead of `main` pulls in unreleased work. Always `--head=main`.
- **Trusting commit names over the diff.** A commit says `fix: X` but the diff also quietly changed Y. Always run the Sonnet diff-verification step (step 3) before finalizing the changelog.
- **Copying commit subjects into the changelog.** PMs don't read `feat(ENG-285): admin explorer UX — group sizes, compare page`. Translate to value: "Reviewers can now see at a glance why two listings were flagged as the same property." Collapse a multi-slice epic into one user-facing feature.
- **Listing every referenced Linear ID as "shipped."** Curate against real status (step 4).
- **Forcing a prod → Done on a ticket that never reached dev.** On `--env=prod`, only advance tickets already in **Deployed in DEV**; report the rest.
- **Announcing prod before the deploy finished green.** On `--env=prod`, dispatch `api_deploy.yml` + `web_deploy.yml`, `gh run watch` both to success, *then* create the release and post to Slack. A prod release that names a rollout that failed is worse than a late one.
- **Assuming the changelog PR deploys anything.** It doesn't — the dev auto-deploy watches `api/**`/`web/**`, and prod is `workflow_dispatch` only. The rollout is step 6; the docs PR is separate.
- **Moving Linear tickets before showing the drafts.** Linear transitions are outward-facing too — they're behind the same approval gate. See the hard rule above.
- **Overstating gated work.** If a feature ships behind a flag that defaults off, say so — don't imply users see it today.
