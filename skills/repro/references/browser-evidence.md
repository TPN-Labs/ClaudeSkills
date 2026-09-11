# Driving the browser and capturing evidence

Mechanics for the browser half of `/repro`. Read this when the connection misbehaves, or when deciding what to capture at a step.

## The connection

Browser control comes from the **`claude-in-chrome` MCP server**, backed by the [Claude in Chrome extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) (v1.0.36+). It is available when Claude Code was started with `claude --chrome`, when Chrome is enabled by default, or in the VS Code extension with the extension installed.

Check and fix, in order:

1. `/chrome` — working when the panel shows **Status: Enabled** and **Extension: Installed**.
2. `/mcp` → `claude-in-chrome` → **View tools** — the authoritative list of tool names for the installed version. Prefer it over any list written down here.
3. Not connected → the user runs `/chrome` → **Reconnect extension**, or restarts Chrome and Claude Code.

Constraints worth knowing before promising a run:

- Requires a direct Anthropic plan (Pro, Max, Team, Enterprise) and `/login`. **API-key and `setup-token` sessions can't use it** — Claude Code keeps the integration off even with `--chrome`.
- Not available through Bedrock, Vertex, or Foundry, and **not supported in WSL**.
- Works with Chrome, Edge, and other Chromium browsers (Brave, Arc, Vivaldi, Opera).

Common errors:

| Error | Fix |
|---|---|
| "Browser extension is not connected" | Restart Chrome and Claude Code, then `/chrome` to reconnect |
| Extension shows "Not detected" | Install/enable it in `chrome://extensions` |
| "No tab available" | Create a new tab and retry |
| "Receiving end does not exist" | Service worker went idle — `/chrome` → Reconnect extension |
| Browser stops responding mid-run | A JavaScript modal (`alert`/`confirm`) blocks events. Ask the user to dismiss it, then continue |

A dropped connection mid-repro invalidates the steps after it. Reconnect and re-run from the start rather than stitching two partial runs into one verdict.

## Read-only vs state-changing

This distinction is the extension's, and it matters in plan mode, where read-only calls run without a prompt and state-changing ones ask.

**Read-only:** `read_page`, `get_page_text`, `find`, reading console messages, reading network requests, taking a screenshot.

**State-changing:** clicks, typing, navigation, tab and window management, recording a GIF.

Three traps where an apparently read-only call becomes state-changing:

- `createIfEmpty` on `tabs_context_mcp`
- `clear` on the console or network reader
- `save_to_disk` on a screenshot

A `browser_batch` call is read-only only if **every** action inside it is.

## What to capture per step

The verdict rests on the observable named in the repro plan. At each step capture the minimum that proves what happened:

| Step type | Capture |
|---|---|
| Any step | `get_page_text` or `read_page` — cheapest proof of what rendered |
| The decisive step | Screenshot **and** page text — the comment quotes the exact string |
| A step that submits, saves, or uploads | Network reader: status codes, and whether the request fired once or twice |
| Anything that errors, hangs, or does nothing | Console reader, filtered to errors — then also capture what the UI shows |
| A step that should change state | Evidence **after** the change, not the optimistic UI before it |

Read console and network with a filter (`error`, a path fragment) rather than pulling everything. Unfiltered logs are enormous and mostly noise from third-party scripts.

**Screenshots are for the report, not for reading text.** Use `get_page_text` to know what the page says; use a screenshot to show it.

## Eliminating the flake

Before calling anything `Solved`:

1. Re-run the decisive step in a **fresh tab**.
2. **Bypass cache** on that load — a stale bundle is the classic false green, especially minutes after a deploy.
3. Watch the network reader for a `304`/memory-cache hit on the app bundle. If the browser never fetched new code, the run tested the old build.

Two runs disagreeing is a finding, not noise: report it as intermittent with both observations.

## Login walls and CAPTCHAs

The extension shares the browser's login state and **pauses when it hits a login page or CAPTCHA**, by design.

When that happens: stop, tell the user exactly which URL blocked the run and what account is needed, and wait. Never type credentials, never accept them pasted into chat, never work around a CAPTCHA. If the user can't unblock it, the outcome is `Blocked` — post it with the blocking URL named.

## Test data hygiene

- Prefix anything created with an obvious marker: `QA repro ENG-123 2026-09-11`.
- Prefer an account the user nominates for testing over a real customer record.
- Report everything created, so cleanup is possible.
- A repro step that deletes, cancels, pays, emails, or notifies real users stops and asks first — even on staging.
