# Field rubrics

How to fill each field of a TPN bug ticket, the ready-made question panels, and one worked example end to end.

## Title formula

```
<what is observably wrong> <under what condition>
```

The title is read in a list of forty others. It has to say what is broken and when, with no ticket body.

| ✅ | ❌ | Why |
|---|---|---|
| `Date input not saved correctly due to locale mismatch` | `Date bug` | Names neither symptom nor condition |
| `Checkout total shows £0.00 for orders with a discount code` | `Checkout broken` | "Broken" is not a symptom |
| `Avatar upload fails silently for PNGs over 5MB` | `Upload issue on profile page` | Names the area, not the failure |

Avoid leading with the component (`[Profile] date wrong`) — Linear has labels and projects for that.

## Severity ladder

Severity is about **user pain**, not about how hard the fix looks. It is the reporter's call.

| Severity | Linear `priority` | The test |
|---|---|---|
| **Blocker** | 1 — Urgent | The user cannot complete a core job at all, and there is no workaround. Data loss, corruption, a security exposure, or the build/env is down for everyone. |
| **Major** | 2 — High | A core flow is broken or produces wrong data, but there is a workaround, or it hits a defined subset of users. *Wrong data shown to a user is Major at minimum — never Minor.* |
| **Minor** | 3 — Medium | A secondary flow misbehaves, or the main flow is right but awkward. The user can finish the job unaided. |
| **Trivial** | 4 — Low | Cosmetic: spacing, a typo, a misaligned icon, a wrong hover state. Nothing behaves wrongly. |

Two rules that settle most arguments:

- **Wrong data beats ugly data.** A date silently stored as `06.14.2025` is Major even though nothing crashed.
- **Blast radius raises severity, it does not set it.** "Affects all non-US locale users" moves a Minor to Major; it does not make a cosmetic bug a Blocker.

## Frequency

| Value | Write it as | Means |
|---|---|---|
| Always | `Always` | Reproduced on every attempt following the steps |
| Intermittent | `Intermittent (3 of 10 attempts)` | Reproduced some of the time — **always give the ratio you actually observed** |
| Once | `Seen once` | Observed once, not reproduced since. Still worth filing; say so plainly |

`Seen once` is honest and useful. Dressing it up as `Intermittent` tells a developer to expect a repro they will not get.

## Environment capture

Give the version, not the name. "Chrome" is not an environment; "Chrome 123" is.

| Platform | Capture |
|---|---|
| Web | Browser + version, OS + version, app/build version, environment name and URL |
| iOS / Android | Device model, OS version, app version + build number, environment |
| API / backend | Endpoint, environment, app or image version, client used (curl, Postman, the app) |
| Desktop | App version, OS + version, architecture where it matters (Apple silicon vs Intel) |

Always name **which environment**: local, dev, test, staging, production. A bug that only reproduces on one of them is half-diagnosed already.

## Ready-made question panels

Use these verbatim with `AskUserQuestion`. Recommendation first, no hand-rolled "Other".

**Severity**

```
header:   "Severity"
question: "How badly does this hurt the user? (TPN severity ladder)"
options:
  - Major — Core flow broken or wrong data shown, but there's a workaround or it hits a subset of users
  - Blocker — Core job impossible, no workaround; or data loss, corruption, security exposure
  - Minor — Secondary flow misbehaves, or it's awkward but completable unaided
  - Trivial — Cosmetic only: spacing, typo, alignment. Nothing behaves wrongly
```

**Frequency**

```
header:   "Frequency"
question: "How reliably does it reproduce when you follow the steps?"
options:
  - Always — Happened on every attempt
  - Intermittent — Some attempts only (I'll ask for the ratio)
  - Seen once — Observed once, hasn't reproduced since
```

**Project** — build the options from `list_projects`; never hardcode them.

```
header:   "Project"
question: "Which Linear project does this bug belong to? Every TPN bug ticket needs one."
options:  <up to 4 plausible projects, name + one-line summary as the description>
```

If more than four are plausible, ask the narrowing question first (which product or client), then the project.

## Worked example

> **Every value below is fictional and belongs to this example only.** It shows the *shape* of a finished ticket. The versions, dates, locale, click path, severity and frequency here are not defaults, not fallbacks, and not a starting point to edit down — a real ticket takes every one of those from the real reporter. If the bug you are filing resembles this one, that resemblance is a trap: copying these values produces a ticket that looks complete and sends a developer chasing a bug that works exactly as written.

**What the reporter said:**

> "Dates are saving wrong on test env when my browser is set to Romanian. I enter 14.06.2025 and after reload it says 06.14.2025. Happens every time. I've got a screenshot."

**What is already answered:** Environment (partially — no versions), Frequency (Always), Expected, Actual, Screenshot (exists), and enough for a Title.

**What is missing:** Project, Severity, exact versions, Steps, Notes.

**One panel** (Project + Severity are independent), **one prose ask** ("Which Chrome/Windows/app versions, and the exact click path from a fresh login?").

**Resulting ticket**

Title:

```
Date input not saved correctly due to locale mismatch
```

Description:

```markdown
**Environment:** Chrome 123, Windows 11, Test Env v2.1.0
**Severity:** Major
**Frequency:** Always

## Steps to Reproduce
1. Set the browser locale to Romanian (`ro-RO`) and restart Chrome.
2. Log in to Test Env v2.1.0 and open Settings → Profile.
3. Enter `14.06.2025` in the Date of birth field.
4. Click Save.
5. Reload the page.

## Expected
Date remains as 14.06.2025.

## Actual
Date shows as 06.14.2025.

## Notes
API is receiving the date in MM/dd/yyyy regardless of input locale.
Affects all non-US locale users.

## Screenshot
![Profile after reload showing 06.14.2025](https://…)

---
Filed with Claude Code's `/file-a-bug` skill.
```

`save_issue` arguments:

```json
{
  "team": "Engineering",
  "project": "<id chosen by the reporter>",
  "title": "Date input not saved correctly due to locale mismatch",
  "description": "<the markdown above>",
  "priority": 2,
  "labels": ["Bug"]
}
```

Note what did **not** happen: no step was invented to pad the repro, severity came from the reporter rather than from a guess, and the project was chosen by a human before anything was created.
