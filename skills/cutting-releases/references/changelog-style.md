# Changelog & release-notes house style

The audience is **product managers, QA, and ops — not engineers.** Someone who has
never seen the code should understand what changed and why it matters. AnunțReal is
a Romanian forensic checker for real-estate listings; write for the people who
run and sell it, not the people who build it.

## Format

- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/): one
  `## [<version>] - YYYY-MM-DD` section per release, newest first, with
  `### Added` / `### Changed` / `### Fixed` subsections (omit empty ones).
- Date is the release date (UTC), `YYYY-MM-DD`.
- Each bullet: **`- **Short bold headline** — plain-English explanation.`**
- Link Linear tickets in parentheses at the end of a bullet: `(ENG-207)`. When one
  bullet covers several tickets, list them: `(ENG-206, ENG-207, ENG-208)`.
- Do **not** put PR numbers, SHAs, file names, or GitHub-Actions detail in the
  PM changelog. Those belong in the git history, not here.

## Voice

- Lead with the user-visible outcome, then briefly why it matters.
- Translate mechanics into value:
  - ✗ "feat(ENG-285): admin explorer UX — group sizes, original/copy cards, compare page, interactive match graph"
  - ✓ "**Clearer duplicate-listing review** — the admin explorer now shows group
    sizes, original-vs-copy cards, and an interactive match graph, so reviewers
    can see at a glance why two listings were flagged as the same property."
- **Collapse an epic into one feature.** Several slices under one Linear epic
  (e.g. ENG-206/207/208) become one user-facing bullet with the tickets grouped —
  not one bullet per internal slice.
- Be honest about **gated / opt-in** work: if it defaults off behind a flag, say
  "available behind a setting; the existing flow stays the default until switched on."
- Roll routine dependency bumps into a single line, e.g. under a light
  `### Maintenance` note or a Changed bullet: "N dependency updates."

## Two files, one message

- **`CHANGELOG.md`** — the running log (no per-entry compare link).
- **`releases/<version>.md`** — the standalone release note used as the GitHub
  release body: a `## <version> — <Title>` heading, a 2–4 sentence intro
  paragraph, then the same Added/Changed/Fixed bullets, and a closing
  `**Full history:** <compareUrl>` line (the `compareUrl` from the collector).

### First release (v1.0.0)

There is no previous tag, so:

- The collector reports the whole history and emits a `commits/<sha>` URL rather
  than a `compare/...` one — use that as the `**Full history:**` link.
- Don't try to enumerate years of commits bullet by bullet. Describe what
  AnunțReal *is* and does today, in 3–6 grouped `### Added` bullets covering the
  main capabilities, plus any notable recent `### Changed`/`### Fixed` items.

## Slack announcement

- Short and celebratory, `mrkdwn`. 2–4 sentences of what shipped + why it matters,
  then 3–5 highlight bullets, then a link to the GitHub release.
- Same plain-English voice as the changelog. No SHAs. Ticket links optional.
- Posts to the release channel **`C0BK4HXD4TD`** (`#anunt-real-ops`).
- Example shape:
  > :rocket: *AnunțReal v1.0.0 is out* — <one-sentence summary>.
  > • <highlight> • <highlight> • <highlight>
  > Full notes: <release url>
