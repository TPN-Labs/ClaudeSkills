# TPN Labs — Skills

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Format: Agent Skills](https://img.shields.io/badge/format-Agent%20Skills-7c3aed)

A curated, open library of the **Agent Skills** we use day-to-day at TPN Labs. Each skill is a small, self-contained folder that teaches an AI agent how to do one job the way we do it — from formatting client deliverables to running internal workflows.

These skills follow the open [Agent Skills](https://agentskills.io) standard, so they work with any agent that supports it: Claude Code, the Claude API, Claude apps, and other agents that adopt the format.

> Some skills here encode TPN-specific conventions — our tone, our checklists, our defaults. They're shared openly as working examples. Adapt them freely.

## What is a Skill?

A **skill** is a folder with one required file, `SKILL.md`, plus any helper files it needs. The `SKILL.md` file contains two things:

- a short block of **metadata** — a name, and a description of what the skill does and when to use it; and
- plain-language **instructions** the agent follows when the skill is relevant.

The agent reads only the name and description up front. When a request matches, it loads the full instructions on demand. This keeps the agent fast while still giving it deep, specialized know-how exactly when it's needed. (This pattern is sometimes called *progressive disclosure*: load a little, then load more only if it turns out to be relevant.)

A skill can also bundle:

- **`scripts/`** — code the agent runs for repeatable, deterministic steps
- **`references/`** — longer documents the agent reads only when needed
- **`assets/`** — templates, images, or other files used in the output

## Repository structure

```
.
├── README.md
├── LICENSE
└── skills/
    ├── skill-name/
    │   ├── SKILL.md        # required: metadata + instructions
    │   ├── scripts/        # optional: executable helpers
    │   ├── references/     # optional: supporting docs
    │   └── assets/         # optional: templates, resources
    └── another-skill/
        └── SKILL.md
```

Each skill lives in its own folder under `skills/`. The folder name matches the skill's `name`.

## Skills catalog

| Skill | What it does | When to use it |
| --- | --- | --- |
| [`clarify`](skills/clarify/) | Interviews you with interactive multiple-choice questions until a plan or design is fully clarified | You want to stress-test, pin down, or clarify a plan before building — or you say "grill me", "clarify", "interview me", or "stress-test this" |
| [`dependabot-pr-fixer`](skills/dependabot-pr-fixer/) | Diagnoses and fixes a failing Dependabot dependency-update PR, then pushes the fix to the PR's own branch — keeping the version bump intact. | When a Dependabot PR (npm/yarn/pnpm, pub, or GitHub Actions) is failing or needs work: point at it by URL or number and ask to fix it, make its checks pass, or "push to the same branch". |
<!-- Add one row per skill. Keep the "when to use it" column specific — it mirrors the skill's description and helps both people and agents pick the right skill. -->

## Using these skills

> **A note on trust.** Skills can include instructions and code that an agent will run. These are skills we use internally and share openly, but — as with any skill from any source — review a skill's contents before running it in your own environment.

**Claude Code.** Install the whole library as a **plugin**, so every skill is available as a `/` command in any project — no per-repo `.claude/` folder required.

*Quick install (per user):*

```
/plugin marketplace add TPN-Labs/ClaudeSkills
/plugin install tpn-labs-skills@tpn-labs
```

The skills then show up as `/clarify`, `/dependabot-pr-fixer`, and so on, across all your projects.

*Auto-load (per user, no commands):* register the marketplace and enable the plugin in `~/.claude/settings.json`, and it loads on every launch:

```json
{
  "extraKnownMarketplaces": {
    "tpn-labs": { "source": { "source": "github", "repo": "TPN-Labs/ClaudeSkills" } }
  },
  "enabledPlugins": { "tpn-labs-skills@tpn-labs": true }
}
```

*Org-wide (admins):* put those same two keys in `managed-settings.json` to push the skills to everyone with zero per-machine setup — see [`examples/managed-settings.json`](examples/managed-settings.json). The file lives at:

| OS | Path |
| --- | --- |
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux / WSL | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\ProgramData\ClaudeCode\managed-settings.json` |

For Claude Code on the **web**, file-based managed settings don't reach the cloud container — push the plugin through your Team/Enterprise admin console ([server-managed settings](https://code.claude.com/docs/en/server-managed-settings)) instead.

*Manual route:* or just copy a skill folder into `~/.claude/skills/` (all projects) or `.claude/skills/` (a single repository), reload, and ask the agent to use it (for example: *"use the clarify skill to ..."*).

**Claude API.** Upload a skill through the Skills API and reference it in your requests; the model uses it automatically when relevant.

**Claude apps (claude.ai).** Add a custom skill in settings on a paid plan.

Custom skills don't automatically sync between these surfaces. If you want the same skill in Claude Code, the API, and claude.ai, add it to each one separately.

## Authoring a skill

Every skill starts with a `SKILL.md` file. The top of the file is YAML metadata between `---` markers; everything after is the instructions.

```markdown
---
name: my-skill-name
description: What this skill does, and the situations in which an agent should use it.
---

# My Skill

Step-by-step instructions, examples, and guidelines the agent should follow
when this skill is active.
```

Two fields are required:

- **`name`** — a unique identifier in lowercase, with hyphens for spaces (e.g. `client-update-email`). It should match the folder name.
- **`description`** — the most important field. It's how the agent decides *when* to reach for the skill, so be concrete about both what the skill does and when to use it. A slightly "pushy" description that names the triggers (*"...use this whenever someone asks for X, Y, or Z"*) works better than a vague one.

Keep the instructions focused. If `SKILL.md` grows long, move detail into `references/` and link to it, so the agent only loads what it needs.

## Contributing (TPN team)

1. Create a branch.
2. Add a folder under `skills/` named after your skill.
3. Write its `SKILL.md` (plus any `scripts/`, `references/`, or `assets/` it needs).
4. Add a row to the **Skills catalog** above.
5. Open a pull request for review.

Before merging, confirm the skill does what its description claims and that any bundled scripts are safe to run.

## Learn more

- Agent Skills standard — [agentskills.io](https://agentskills.io)
- Anthropic's reference skills and documentation — [github.com/anthropics/skills](https://github.com/anthropics/skills)

## License

Released under the MIT License — see [`LICENSE`](LICENSE).

## About TPN Labs

TPN Labs is a full-stack product and applied-AI studio based in Timișoara, Romania. We design and build complete products — web, mobile, and cloud — across a wide range of industries.

- Website: [tpn-labs.com](https://tpn-labs.com)
- Contact: office@tpn-labs.com
