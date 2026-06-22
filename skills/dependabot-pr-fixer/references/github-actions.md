# GitHub Actions fixes

Failure catalog for `dependabot/github_actions/...` bumps. These change a `uses:` reference in `.github/workflows/*.yml` (and sometimes composite-action files). Most are trivial; the failures that do happen come from a new major changing the action's interface or runtime.

## What changed
`gh pr view <n> --json files --jq '.files[].path'` shows the affected workflow file(s). The diff is a version bump on a `uses:` line, e.g. `actions/checkout@v4` → `actions/checkout@v5`.

## Categories

### Changed inputs / outputs
**Symptom:** the workflow run fails with "unexpected input", a now-required input missing, or a step that consumed an output getting an empty value.
**Fix:** read the action's release notes / README for the new major (Dependabot links the version). Update the step's `with:` block — rename or remove dropped inputs, add newly required ones — and update any references to renamed outputs.

### New permissions requirement
**Symptom:** the run fails with a permissions/`GITHUB_TOKEN` scope error after the bump.
**Fix:** add the needed scope under `permissions:` for the job or workflow. If the new major demands broad permissions that shouldn't be granted without sign-off, **report it** rather than widening access unilaterally.

### Runner / runtime bump
**Symptom:** the action now requires a newer node runtime or a different runner image.
**Fix:** if it's a node-version bump inside the action, usually no change is needed beyond the bump itself; if it requires a newer `runs-on` image, update it where appropriate. If it forces a runner change with wider implications, report.

## Verify
You usually can't run the full workflow locally. Do what you can:
- Validate the workflow YAML — `actionlint` if available, otherwise a YAML parse to catch syntax errors.
- (`act` can run workflows locally but is often unavailable and imperfect; don't block on it.)
- Push, then watch the re-run with `gh pr checks <n>` / `gh run watch`, since CI is the real test here.

## Guardrail
Don't pin the action back to the old version to dodge a failure — adapt the workflow to the new major, which is the whole point of the bump.
