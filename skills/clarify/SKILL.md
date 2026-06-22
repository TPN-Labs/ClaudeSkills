---
name: clarify
description: Use when the user wants to stress-test, pin down, or clarify a plan, design, spec, or approach before building — or uses 'grill me', 'clarify', 'interview me', or 'stress-test' trigger phrases.
---

# Clarify

## Overview

Interview the user relentlessly about every aspect of a plan or design until you reach a shared understanding, then summarize what was decided. Every question is asked through the interactive `AskUserQuestion` tool (multiple-choice panels) — never as plain prose or an A/B/C/D list typed into a message.

**Core principle:** A clarifying question with no selectable options is a weaker question. Force every open decision into concrete choices with a recommended default, and let the user click.

## When to Use

- The user wants to pin down or stress-test a plan, design, spec, or approach before building.
- The user says "grill me", "clarify", "interview me", "stress-test this", or similar.
- You are about to act on a request that still has unresolved ambiguity or undecided trade-offs.

Not for: a question the codebase already answers (read it instead), or a single trivial confirmation (just ask inline).

## The Loop

1. **Map the open decisions.** Walk down each branch of the design tree. List what is ambiguous or undecided, and how decisions depend on one another.
2. **Resolve what you can yourself.** If exploring the codebase, docs, or files answers a question, do that instead of asking.
3. **Ask via `AskUserQuestion`.** For each remaining open decision, present an interactive question (see Question Shape).
4. **Incorporate and recurse.** Feed answers back in; new answers open new branches. Repeat until no open decisions remain.
5. **Summarize.** Restate the agreed understanding concisely and offer to proceed (e.g., to planning or building).

Keep going until everything is clarified. Stopping with open decisions on the table defeats the purpose.

## Question Shape

Every question goes through `AskUserQuestion`. For each one:

- Give **2-4 concrete options**, each a real, distinct choice.
- Put the **recommended option first**, with `(Recommended)` at the end of its label. (This is how "provide your recommended answer" maps onto the interactive UI — the recommendation is the first option.)
- Put the trade-off or implication in each option's `description`, not the label.
- **Never add your own "Other" option.** The tool always offers a free-form "Other" automatically; duplicating it is noise.
- Set **`multiSelect: true`** when the choices are not mutually exclusive ("which of these should it support?").
- Write the `question` text so it stands alone — enough context to answer without scrolling back.

## Adaptive Batching

`AskUserQuestion` shows up to 4 questions in one panel. Decide per turn:

- **One question** when the next question depends on this answer. Resolve dependencies in order — asking dependent questions out of order wastes the user's choices.
- **Batch 2-4 questions** in a single panel only when they are genuinely independent of each other.

Independence is the bar for batching — not convenience. When in doubt, ask one.

## Example

User: *"I want to build `notesync`, a CLI that watches my notes folder and auto-commits and pushes to git."*

You explore the repo first (empty but for a README — nothing to reconcile). The foundational fork is *what problem this solves*; later questions (conflict handling, debounce interval) depend on it, so ask it alone:

```
AskUserQuestion(questions=[{
  header: "Primary goal",
  question: "What is notesync primarily for? This drives nearly every later decision, especially conflict handling.",
  multiSelect: false,
  options: [
    { label: "Durable backup (Recommended)",
      description: "Get notes safely off-machine. Single writer, history rarely read. Simplest design." },
    { label: "Multi-device sync",
      description: "Edit on multiple machines and converge. Requires pull-before-push and merge-conflict handling." },
    { label: "Versioned history",
      description: "A browsable, meaningful git history with readable commits; the remote is secondary." }
  ]
}])
```

After the answer, the next branch (commit granularity, debounce interval, failure handling) opens — continue until the plan is fully pinned, then summarize.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Asking questions as plain prose or A/B/C/D text | Always route every question through `AskUserQuestion`. |
| Adding a manual "Other" option | The tool adds "Other" automatically — never duplicate it. |
| Batching dependent questions to save turns | Ask dependent questions one at a time, in dependency order. |
| Asking what the codebase already answers | Explore first; only ask what code and docs cannot tell you. |
| No recommended option | The first option is your recommendation, labelled `(Recommended)`. |
| Stopping while decisions remain open | Loop until shared understanding, then summarize and offer to proceed. |
