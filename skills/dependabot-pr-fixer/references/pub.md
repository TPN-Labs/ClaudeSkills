# pub (Dart / Flutter) fixes

Failure catalog for `pubspec.yaml` / `pubspec.lock` Dependabot bumps. Run commands from the directory containing the changed `pubspec.yaml`.

## Identify the toolchain and commands

| Signal | Toolchain | Install | Verify |
|---|---|---|---|
| `flutter:` section or Flutter SDK in `environment` | Flutter | `flutter pub get` | `flutter analyze`, `flutter test`, `flutter build <target>` |
| pure Dart package (no Flutter) | Dart | `dart pub get` | `dart analyze`, `dart test` |

`pub get` regenerates `pubspec.lock` from `pubspec.yaml`. Commit the updated lockfile.

## Categories

### Version solving failure
**Symptom:** `pub get` reports `version solving failed` — the bumped package's constraint conflicts with another dependency's requirements.
**Fix:**
- Adjust the conflicting constraint in `pubspec.yaml` — usually loosening or bumping a *related* package so a compatible set resolves. `dart pub upgrade --major-versions <package>` can show what a consistent upgrade looks like, but apply the minimal change that resolves the conflict.
- Re-run `pub get` and commit the regenerated `pubspec.lock`.
- If no compatible set exists without changing a constraint you shouldn't touch on your own, **report it**.

### Lockfile out of sync
**Symptom:** CI's `pub get` fails because `pubspec.lock` doesn't match `pubspec.yaml`.
**Fix:** run `dart pub get` / `flutter pub get` to regenerate, then commit `pubspec.lock`.

### Analyzer / breaking API changes
**Symptom:** `dart analyze` / `flutter analyze` reports errors at the package's call sites after the bump.
**Fix:** read the package's CHANGELOG on pub.dev (the PR body links the version), then migrate the call sites to the new API. Keep the diff scoped to what the new version requires.

### Stale generated code
**Symptom:** errors about mismatched `*.g.dart` / `*.freezed.dart` / other generated files after a bump to a code-gen package (`json_serializable`, `freezed`, `build_runner`, etc.).
**Fix:** regenerate and commit the output:
```
dart run build_runner build --delete-conflicting-outputs
```
(Use `flutter pub run build_runner ...` on older Flutter setups.) Commit the regenerated files.

### Dart / Flutter SDK constraint bump
**Symptom:** the new package major requires a newer Dart or Flutter SDK than the project's `environment:` constraint or CI SDK.
**Check:** `environment: sdk:` (and `flutter:`) in `pubspec.yaml`, plus the SDK version pinned in CI.
**Fix:** if the project can move, raise the SDK constraint and the CI SDK to match. If that's a larger decision, **stop and report** — it affects the whole package, not just this dependency.

## Verify (run what CI runs)
From the package directory, typically:
```
<flutter|dart> pub get
<flutter|dart> analyze
<flutter|dart> test
flutter build <target>     # if it's an app and CI builds it
```
Commit `pubspec.lock` (and any regenerated code) if it changed.
