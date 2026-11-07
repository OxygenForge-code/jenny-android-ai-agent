# Modifications

This repository is an unofficial fork of
[`flagdizero/jenny-android-ai-agent`](https://github.com/flagdizero/jenny-android-ai-agent),
maintained by [`@OxygenForge-code`](https://github.com/OxygenForge-code), based on
upstream commit `ae77139` (release 2.0.0).

The upstream project is licensed under the **GNU Affero General Public License v3.0**
(see [`LICENSE`](LICENSE)). This fork adds no term, restriction or exception to that
license: it is distributed under the AGPL-3.0 exactly as upstream is, and the complete
corresponding source stays in this repository.

## What this fork changes

Per AGPL-3.0 section 5(a), every change made here is recorded below. Anything not listed
is identical to upstream.

| Date | Change |
| --- | --- |
| 2026-11-07 | Added `.github/workflows/build-apk.yml`: builds the `foss` APK (debug and release) with JDK 17, Python 3.11 and Android SDK 34, runs the JVM unit tests, verifies the FOSS flavor with `scripts/check_foss_apk.py`, uploads the APKs as a build artifact, and attaches them to a GitHub release when a `v*` tag is pushed. Upstream CI (`ci.yml`) checks Python only and never compiles Kotlin or Chaquopy. |
| 2026-11-07 | Added this file and a fork notice at the top of `README.md`. |

No application code, asset or dependency was modified in this pass. The exact diff against
upstream is always readable with:

```bash
git remote add upstream https://github.com/flagdizero/jenny-android-ai-agent.git
git fetch upstream
git diff upstream/main...main
```

## Building an APK from this fork

The workflow is also the reference build recipe:

1. JDK 17, Android SDK Platform 34, `build-tools;34.0.0`.
2. **Python 3.11** on the build machine: Chaquopy runs `pip` there for the pinned
   requirements and for bytecode compilation, and it requires the same major.minor version
   as the app's embedded runtime.
3. Network access on the first build (Gradle, the Chaquopy runtime and every wheel).

```bash
cd android
echo "sdk.dir=/path/to/your/Android/sdk" > local.properties
./gradlew :app:testFossDebugUnitTest :app:assembleFossDebug
```

The APK lands in `android/app/build/outputs/apk/foss/debug/app-foss-debug.apk`.

### Signed releases from CI

`android/app/build.gradle.kts` already reads the signing material from the environment.
To have the workflow attach a signed release APK, add these repository secrets
(*Settings → Secrets and variables → Actions*):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 your-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password |

Without them the build still succeeds: the release APK is left unsigned, and the release
page carries the debug-signed APK only.

## Trademark

The AGPL-3.0 covers the source code. It does **not** cover the *Jenny* name, the logo or
the mascot artwork, which remain the upstream owner's property — see
[`TRADEMARK.md`](TRADEMARK.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

This fork is a development and personal build of unmodified upstream code, published with
its attribution intact and with no claim to the name:

- It is **not** the official Jenny, and nothing here is endorsed by or affiliated with
  upstream.
- The APKs produced by CI are builds of upstream's own sources, not a rebranded product.
- If you take this code and **distribute a modified version** — your own app, store
  listing, package id or domain — upstream's trademark policy requires shipping it under a
  different name and logo, without the *Jenny* name or the mascot artwork, and allows you
  to state that it is based on Jenny.

If you want to publish your own variant, treat the rename as part of the work, not as an
afterthought: application id, launcher label, icon, notification icons, and the strings and
mascot assets the UI reads. Ask upstream first if you believe your use needs permission.

## Keeping the fork in sync

```bash
git remote add upstream https://github.com/flagdizero/jenny-android-ai-agent.git  # once
git fetch upstream
git merge upstream/main      # or: git rebase upstream/main
```

The only local files that can conflict in practice are `README.md` (fork notice) and
whatever you add under `.github/workflows/`.
