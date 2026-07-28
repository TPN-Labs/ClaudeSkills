---
name: critique
model: sonnet
argument-hint: "[pr-url]"
description: Use when the user asks to critique or review a pull request in any repository and passes its URL — "critique this PR", "/critique PR-URL", "review this PR". Runs a three-axis review of the PR diff (Standards, Spec, Policy & Docs) in parallel sub-agents, posts findings as inline review comments, and submits the review automatically without asking. Triggers on a GitHub PR link plus "critique" or "review".
user-invocable: true
---

# Critiquing a pull request

Three-axis review of a pull request the user identifies **by URL**, in **any** GitHub repository. The PR's own diff (base…head, GitHub's three-dot merge-base comparison) is the review target — no local checkout needed.

Nothing here is hardcoded to one project. Every standard, spec, and policy the review leans on is **discovered in the target repo at review time** (step 3) and named in the output. A bare repo with no docs still gets a useful review — it just runs on fewer sources, and says so.

## Invocation

```
/critique PR-URL
```

The **PR URL is a mandatory parameter** (e.g. `https://github.com/acme/widgets/pull/451`). It is the one thing this skill cannot run without — with no URL there is no diff to review and nowhere to post. If the user invoked the skill without a URL, **stop and ask for it**; do not guess a PR, fall back to a local branch, or review anything else. Once you have it, parse it into `owner` / `repo` / `pullNumber` for every GitHub MCP call.

This skill runs on **Sonnet** (`model: sonnet` in the frontmatter, and every sub-agent is spawned with `model: "sonnet"`).

The three axes run as **parallel sub-agents** so they don't pollute each other's context; this skill stages their findings as inline comments and submits one review.

- **Standards** — does the diff conform to the coding standards this repo documents, plus the Fowler smell baseline below?
- **Spec** — does the diff faithfully implement the ticket / spec / issue it came from?
- **Policy & Docs** — does it respect the repo's policy doc and architecture decisions, clear the production-readiness checklist below, and keep the repo's own artefacts in lockstep?

## The one hard rule: the review posts itself — so the findings must be real

Invoking this skill **is** the go-ahead to publish. Stage the inline comments on a pending review (that is how the API batches them), then submit in the same run **without stopping to ask**. Report to the human afterwards.

Because nothing stands between a finding and the author's inbox, the discipline moves onto the findings themselves:

| Red flag — STOP | Reality |
|---|---|
| "No real findings, but a critique should find something" | Never invent findings to justify a verdict. Zero findings → submit `APPROVE`, and say the diff was clean. |
| "One `judgement`-level smell, so request changes" | `judgement` findings alone → `COMMENT`. Only a `hard` finding blocks merge. See the verdict table. |
| "This repo has no CONVENTIONS.md, I'll apply the standards I know" | An undiscovered standard is not a standard. With no docs, Standards runs on the smell baseline alone and every finding is `judgement`. |
| "I'll cite the rule from memory" | Every finding quotes a source read **in this run** (file + §/rule/criterion). An uncited finding gets dropped, not posted. |
| "31 findings, post them all" | Cap the inline comments (see step 5). Past the cap, the rest go in the summary body. |
| "The user said don't post yet, but the skill auto-submits" | An explicit "dry run" / "don't post" / "show me first" in the request overrides the default. Stage, show, wait. |

## Process

### 1. Resolve the PR

From the URL, read the PR and its diff via the GitHub MCP (`owner`/`repo`/`pullNumber`):

- `pull_request_read` `get` — title, body, base/head refs, **head SHA**, branch name. **A resolvable PR and a non-empty diff must succeed here** — a closed/merged PR or an empty diff fails fast, before any sub-agent runs.
- `pull_request_read` `get_diff` — the review target. Note the changed files and, per hunk header (`@@ -a,b +c,d @@`), the **file line numbers** — inline comments anchor to a file line present in the diff, not a hunk offset.
- `pull_request_read` `get_files` and `get_commits` — the file list (drives which per-directory standards apply) and the commit list (often carries the ticket ref).
- `pull_request_read` `get_reviews` — if you already submitted a review on this PR, review **only the commits since it** and say so in the body. Don't re-post findings the author has already seen.

**Size guard.** If the diff exceeds ~1500 changed lines or ~40 files, don't fan the whole thing out three ways. Say so, and either review the highest-risk subset (name it explicitly in the review body) or ask the user to narrow the scope.

### 2. Identify the spec source

Take the first that resolves, and **name which one you used** in the review body — the axis's authority depends on it:

1. **A ticket reference** in the PR title, branch, body, or commits: `ABC-123` (Linear), `PROJ-123` (Jira), `#123` or `Closes #123` (GitHub issue). Fetch it — Linear MCP `get_issue` for a Linear id, `issue_read` for a GitHub issue, whatever MCP is connected for others. This is the strongest source: acceptance criteria written before the code.
2. **A spec/design file** the user passed, or one in the repo matching the ticket id or feature — try `docs/specs/**`, `specs/**`, `docs/rfcs/**`, `docs/design/**`, `**/requirements.md`, `**/design.md`.
3. **The PR description itself.** Weakest source — it is the author's own account of the change, so it can't catch "built the wrong thing". Findings from it are `judgement`, never `hard`, and the body must say the review had no independent spec.
4. **Nothing.** Skip the Spec sub-agent and report "no spec available" as an axis result, not a finding.

### 3. Discover the standards, policy & ADR sources

Fetch everything **at the PR's head SHA** (`get_file_contents` with `ref: HEAD_SHA`) — not from a local checkout, and not from the default branch: a PR that edits the conventions must be judged against its own version. List the repo root and `docs/` once, then fetch only what exists. **A file that isn't there is a source you drop, not a rule you infer.**

| Source | Try, in order | If absent |
|---|---|---|
| **Coding standards** | `CONVENTIONS.md`, `docs/CONVENTIONS.md`, `CONTRIBUTING.md`, `docs/STYLEGUIDE.md`, `.editorconfig` for hard formatting facts | Standards axis runs on the smell baseline alone; all its findings are `judgement` |
| **Agent/dir instructions** | root `CLAUDE.md` or `AGENTS.md`, plus the **nearest** `CLAUDE.md`/`AGENTS.md` above each touched file (e.g. `api/CLAUDE.md` for `api/**`) | skip |
| **Policy / constitution** | `CONSTITUTION.md`, `docs/CONSTITUTION.md`, `.github/POLICY.md`, a "Non-Negotiables"/"Principles" section in `CONTRIBUTING.md` | Policy axis runs on the built-in checklist + ADRs only |
| **ADRs** | `docs/adr/`, `docs/adrs/`, `doc/adr/`, `architecture/decisions/` | no ADR findings |

Load only the per-directory guides whose directory the diff actually touches. Record which sources resolved — the review body lists them, so the author can see what the critique was measured against.

### 4. Spawn all three sub-agents in parallel

Send **one message with three `Agent` tool calls** (`general-purpose`, `model: "sonnet"` on each). Each sub-agent sees only what you paste or name — it has no independent access to the diff or the repo docs. Tell each to **return a findings list** where every finding carries: `path`, `line` (a file line present in the diff), `side` (`RIGHT` for added/current lines, `LEFT` for removed), `severity` (`hard` violation vs `judgement` call), and a concise `body` citing its source. Findings that are file-wide, not line-specific, set `subjectType: FILE`.

**Standards sub-agent** — give it: the PR coordinates, the `get_diff`/`get_files` output, the contents of whatever standards and directory-instruction files resolved in step 3, and **the full smell baseline below pasted in** (it has no other access to it). Brief: *"Report, per file/line: (a) every place the diff violates a standard documented in the files I gave you — quote the file + rule; (b) any baseline smell — name it, quote the hunk. Documented-standard breaches may be `hard`; baseline smells are always `judgement`; a documented repo standard overrides the baseline. If I gave you no standards files, report baseline smells only. Never cite a rule that isn't in what I gave you. Skip anything tooling (linter/compiler/formatter/CI) already enforces. Under 400 words."*

**Spec sub-agent** — give it: the PR coordinates and diff; the fetched ticket / spec file / PR description, and **which tier of step 2 it came from**. Brief: *"Report: (a) acceptance criteria the spec asked for that are missing or partial; (b) behaviour in the diff nobody asked for (scope creep); (c) requirements that look implemented but wrong. Quote the spec/criterion line per finding. If the only source is the PR description, every finding is `judgement`. Under 400 words."* Skip this sub-agent entirely if step 2 found nothing.

**Policy & Docs sub-agent** — give it: the PR coordinates and diff; whatever policy doc resolved; the ADR filenames (let it read any it needs); and **the production-readiness checklist below pasted in**. Brief: *"Report: (a) breaches of the policy doc I gave you — cite the §; (b) checklist items the diff trips; (c) ADR breaches — the diff contradicts an accepted ADR, or makes an architectural decision (new protocol, storage tech, service split, dependency, public contract) that this repo records as ADRs and this one has none; (d) artefacts the diff leaves stale — a schema, contract, generated client, README, or spec in the repo that the code now diverges from. Cite the §/ADR/file per finding. A deviation the author justified in-repo (a comment, an ADR, a doc note explaining the exception) is compliant — don't flag it. Under 400 words."*

### 5. Stage the findings as inline comments on a pending review

1. If `get_reviews` shows a **pending** review of yours left over from an aborted run, delete it first — otherwise the API refuses a second one.
2. Open a pending review: `pull_request_review_write` `method: create` **with no `event`** (omitting `event` leaves it pending).
3. **Dedupe by anchor, then budget.** Two axes flagging the same `path:line` become **one** comment carrying both axis labels. Then cap the inline comments at **15**, worst-first (`hard` before `judgement`, and within each keep the axes proportional so no axis is silently zeroed). Everything past the cap goes into the submit body as a bulleted "also noted" list.
4. For each surviving finding, one `add_comment_to_pending_review` call: `path`, `line` (+ `startLine` for a range), `side`, `subjectType`, and a `body` of the form **`[Axis · severity] finding — citation`**. Example: ``[Standards · judgement] Possible Feature Envy: `composeReport` reaches into `listing.*` more than its own fields — consider moving it onto `Listing` (CONVENTIONS.md §3).``
   - Only anchor to a line **present in the diff**; the API rejects a line that isn't. If a finding is about an unchanged line, anchor to the nearest changed line and say so, or use `subjectType: FILE`.
   - **If a comment call is rejected, retry it once as `subjectType: FILE`; if that fails too, move the finding into the submit body.** A finding never disappears because an anchor wouldn't take.

### 6. Submit the review, then report

Submit immediately — no confirmation step — with `pull_request_review_write` `method: submit_pending`. The `body` carries: findings per axis, the worst issue *within each axis*, the **sources the review was measured against** (and which were unavailable), any "also noted" overflow, and any size-guarded subset.

| Findings | `event` |
|---|---|
| Any `hard` finding on any axis | `REQUEST_CHANGES` |
| Only `judgement` findings | `COMMENT` |
| Zero findings on every axis | `APPROVE` |

Never pad with invented findings to force a `REQUEST_CHANGES`.

Then show the human what was posted: the three reports under `## Standards`, `## Spec`, and `## Policy & Docs` — verbatim or lightly cleaned. **Do not merge or rerank across axes** (see _Why three axes_). End with the verdict, the comment count, and the review URL.

If the user asked for a dry run, stop after step 5 instead and show the same report with the review still pending.

## The production-readiness checklist (paste this into the Policy & Docs sub-agent)

Repo-independent, so this axis is useful even with no policy doc. A discovered policy doc **overrides** this list where they overlap, and upgrades its own rules to `hard`.

`hard` — post these regardless of what the repo documents:

- **Committed secret** — a key, token, password, or connection string with credentials in the diff.
- **Missing authorization** — a new endpoint/handler/query that reads or writes user-scoped data with no ownership or permission check on the path.
- **Stub on a production path** — a mock, fake, hardcoded response, or `throw new Error("not implemented")` reachable in production.

`judgement` — post with the reasoning, let the author decide:

- **Untested code path** — new behaviour with no accompanying test, or an existing test weakened/deleted so the change passes.
- **Unbounded work** — a new query, loop, or fan-out with no limit, pagination, or timeout.
- **Undefined failure mode** — a new external call whose error path is swallowed, ignored, or unhandled.
- **Deferred control** — a `TODO`/`FIXME`/comment postponing a security or correctness control the diff needed.
- **Stale artefact** — a schema, contract, generated client, README, or spec in the repo the diff makes wrong.

## The smell baseline (paste this into the Standards sub-agent)

A fixed set of Fowler code smells (_Refactoring_, ch.3) — always **judgement calls** ("possible Feature Envy"), never hard violations. A documented repo standard always overrides the baseline; skip anything tooling enforces.

- **Mysterious Name** — a function/variable/type whose name doesn't reveal what it does or holds. → rename; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape in more than one hunk/file. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move it onto the data it envies.
- **Data Clumps** — the same few fields/params keep travelling together. → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive/string standing in for a domain concept (Money, Verdict, Trust Score…). → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs. → polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files. → gather what changes together into one module.
- **Divergent Change** — one file edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction/params/hooks for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method.
- **Middle Man** — a class/function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass/implementer that ignores most of what it inherits. → drop the inheritance, use composition.

## Why three axes

A change can pass one axis and fail another; separating them stops one from masking the others.

- Follows every coding standard but builds the wrong thing → **Standards pass, Spec fail.**
- Does exactly what the ticket asked but breaks conventions → **Spec pass, Standards fail.**
- Clean code that implements the ticket but ships untested, contradicts an ADR, or leaves a schema stale → **Standards & Spec pass, Policy & Docs fail.**

A repo's policy doc supersedes its conventions, so that axis is never folded into Standards.

## Quick reference

| Need | Tool |
|---|---|
| Read PR title/branch/base/head SHA | `pull_request_read` `get` |
| Get the review diff | `pull_request_read` `get_diff` |
| Changed files / commits | `pull_request_read` `get_files` / `get_commits` |
| Check for your earlier or pending reviews | `pull_request_read` `get_reviews` |
| Discover / read a standards, policy, or ADR file | `get_file_contents` (`ref: HEAD_SHA`) |
| Fetch acceptance criteria | Linear MCP `get_issue`, or `issue_read` for a GitHub issue |
| Open a pending review | `pull_request_review_write` `method: create` (no `event`) |
| Stage one inline comment | `add_comment_to_pending_review` (`path`, `line`, `side`, `subjectType`, `body`) |
| Submit the review | `pull_request_review_write` `method: submit_pending` (`event: …`) |

## Common mistakes

- **Inventing a standard the repo doesn't document.** No conventions file → baseline smells only, all `judgement`. Never import house rules from another project.
- **Anchoring a comment to a line not in the diff.** The API rejects it. Only comment on lines the PR actually changed — else `subjectType: FILE`, else the body.
- **Blocking merge over a smell.** `judgement`-only → `COMMENT`. `REQUEST_CHANGES` needs a `hard` finding.
- **Padding to force REQUEST_CHANGES.** No findings means `APPROVE`, honestly stated — never invented issues.
- **Reading docs from the default branch or a local checkout.** Use the head SHA, or drop the source and say so.
- **Treating the PR description as a spec.** It's the author's own account — `judgement` only, and say the review had no independent spec.
- **Merging the axes.** Keep Standards / Spec / Policy & Docs separate; don't rerank one against another.
- **Loading every directory guide.** Only the nearest `CLAUDE.md`/`AGENTS.md` above files the diff actually touches.
- **Flagging a justified deviation.** A deviation the author documented in-repo is compliant — don't report it as a violation.
- **Dropping a finding because its anchor failed.** Retry as `FILE`, then fall back to the body.
