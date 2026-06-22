# npm / yarn / pnpm fixes

Failure catalog for JavaScript/TypeScript Dependabot bumps. Work top to bottom: identify the package manager and the failure category, then apply the matching fix. Always run commands from the manifest's directory (e.g. `cd api`).

## Identify the package manager and commands

| Lockfile present | Manager | Mutating install (updates lockfile) | CI-style verify install |
|---|---|---|---|
| `yarn.lock` | Yarn | `yarn install` | `yarn install --immutable` (Berry) / `yarn install --frozen-lockfile` (v1) |
| `package-lock.json` | npm | `npm install` | `npm ci` |
| `pnpm-lock.yaml` | pnpm | `pnpm install` | `pnpm install --frozen-lockfile` |

The "verify install" is what CI runs — it fails if the lockfile is out of sync, which is itself a common Dependabot failure.

## Categories

### Lockfile out of sync
**Symptom:** `npm ci` / `yarn install --immutable` / `pnpm --frozen-lockfile` fails saying the lockfile doesn't match the manifest, or a transitive version can't be satisfied.
**Fix:** run the *mutating* install in the working dir to regenerate the lockfile, then commit it. This is the single most common fix and often the only one needed. Commit the lockfile change.

### Peer dependency conflict
**Symptom:** npm `ERESOLVE could not resolve` / `peer dep` errors; Yarn or pnpm peer warnings escalating to failures.
**Fix, in order of preference:**
1. **Align versions.** The cleanest fix is usually to bump the *related* package(s) so the peer range is satisfied (e.g. if a plugin now needs `eslint@^9`, bump eslint too — within reason and still minimal).
2. **Constrain transitives** if the conflict is deep: npm `overrides`, Yarn `resolutions`, pnpm `pnpm.overrides` in `package.json`.
3. **Escape hatch, last resort:** `--legacy-peer-deps` (npm). Only if the peer range is overly strict and the combination actually works. If used, record it (e.g. in `.npmrc`) so CI and humans behave the same — don't rely on an ad-hoc flag that only you passed.
Prefer aligning over forcing: a forced install that "works" today can break at runtime, whereas matching the declared ranges is honest.

### Node engine bump
**Symptom:** install warns/errors that the new version requires a newer Node than the project targets, or the build behaves differently.
**Check:** the package's `engines.node`, the repo's `.nvmrc` / `.node-version`, and the Node version in the CI workflow.
**Fix:** if the project can move, bump the CI Node version (and `.nvmrc`) to match. If moving Node is a larger decision (other deps, runtime constraints), **stop and report** — this is bigger than the bump.

### TypeScript type errors
**Symptom:** `tsc` / build fails with type errors at the dependency's call sites after the bump.
**Fix:**
- If it's a `@types/...` package or a library that ships its own types, make sure the **matching `@types/*` is bumped together** — a runtime-package/type-package mismatch is a frequent cause.
- Otherwise the type surface changed in the new version: update the call sites to the new API. Read the changelog for renamed/removed exports.
- Do **not** blanket-`// @ts-ignore` real breakage. A targeted, commented suppression for a genuine upstream type bug is acceptable; silencing a real API change is not.

### ESM / CJS interop
**Symptom:** `ERR_REQUIRE_ESM`, `exports`-map resolution errors, or a default import that's suddenly `undefined` after a major bump (many libraries go ESM-only on a major).
**Fix:** adjust the import style (named vs default), use a dynamic `import()` where a CJS module must load an ESM-only dep, or update `module` / `moduleResolution` in `tsconfig.json` if the project is ready. If the package is now ESM-only and the project is committed to CommonJS, that's an architecture decision — **report it** rather than forcing a half-migration.

### Runtime / test failures from behavior changes
**Symptom:** install and build pass, but tests fail because the new version changed behavior or output.
**Fix:** read the release notes to confirm the behavior change is intentional, then update the code (or the assertions) to match the new, correct behavior. For snapshot tests, regenerate **only when the new output is genuinely correct** (`jest -u`, `vitest -u`), never reflexively. If a test fails because the bump introduced a real regression upstream, that may be a blocker — report it.

## Major-bump checklist
1. Read the breaking changes (PR body links, then CHANGELOG / migration guide / GitHub releases).
2. Grep the codebase for the package's imports and APIs to scope the blast radius.
3. Apply the migration as a minimal diff.
4. Re-run install → typecheck → build → test in the working dir until green.

## Verify (run what CI runs)
From the working dir, typically some subset of:
```
<verify-install>          # e.g. yarn install --immutable
yarn typecheck            # or: tsc --noEmit
yarn build
yarn test
yarn lint
```
Match the project's actual scripts (check `package.json` "scripts" and the CI workflow). Commit the lockfile if it changed.
