# brand/

Everything specific to the OxeeUI fork of upstream Orca lives here. The goal is a
small, stable diff against `upstream/main`: upstream files carry only thin hooks
that read from this directory, so merges stay mechanical.

## Layout

| Path                             | Purpose                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `config/brand.config.json`       | Declarative source of truth: product name, appId, executable names, publish target. |
| `config/brand.ts`                | Typed accessor (`BRAND`, `IS_REBRANDED`). Import via the `@brand` alias.            |
| `i18n/rebrand.ts`                | Rewrites the upstream product name in user-visible copy at render time.             |
| `assets/icon.svg`                | App icon: the banded mark. Generated — do not hand-edit.                            |
| `assets/icon-dev.svg`            | Same mark drained of chroma. This is what `pnpm dev` shows.                         |
| `assets/icon-mono.svg`           | Flat-white cut, for the titlebar and any inverted slot.                             |
| `settings/hidden-sections.ts`    | Settings sections removed from the sidebar and the Cmd+J palette.                   |
| `ci/upstream-workflow-guard.ts`  | Guard expression and the fork-owned workflow allowlist.                             |
| `assets/brand-theme.css`         | Token overrides layered on `src/renderer/src/assets/main.css`.                      |
| `scripts/generate-marks.mjs`     | Draws both marks from the shared circle geometry.                                   |
| `scripts/rasterize-marks.mjs`    | Renders `icon.svg` to a 1024px PNG through Chromium.                                |
| `scripts/apply-brand-assets.mjs` | Copies brand assets over the upstream files that read them by fixed path.           |

`config/electron-builder.brand.cjs` sits in `config/` (not here) because
electron-builder resolves sibling paths like `config/nsis/` relative to itself.

## The hooks in upstream files

Fourteen lines total. If a merge conflicts, these are the places to re-apply.

| File                                                          | Hook                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `electron.vite.config.ts`                                     | `@brand` alias for the main and renderer bundles.             |
| `vite.web.config.ts`, `config/vitest.config.ts`               | Same alias for the web build and tests.                       |
| `tsconfig.json`, `config/tsconfig.{node,web,tc.web}.json`     | `@brand/*` path mapping and `brand/**/*` includes.            |
| `src/main/startup/dev-instance-identity.ts`                   | `BASE_APP_NAME` / `BASE_APP_USER_MODEL_ID` read from `BRAND`. |
| `src/renderer/src/i18n/i18n.ts`, `src/main/i18n/main-i18n.ts` | Register the brand-name post-processor.                       |
| `src/renderer/src/assets/main.css`                            | `@import` of `brand-theme.css`.                               |
| `src/shared/release-channel.ts`                               | `MAIN_RELEASE_REPO` derived from the brand publish target.    |
| `src/main/updater-prerelease-feed.ts`                         | Prerelease feed URLs derived from `MAIN_RELEASE_REPO`.        |
| `src/renderer/src/hooks/useSettingsNavigationMetadata.ts`     | Filters hidden sections out of the sidebar and Cmd+J.         |

## Why the product name is swapped at runtime

The five locale catalogs under `src/renderer/src/i18n/locales/` carry ~670
occurrences of the upstream product name. Rewriting them would conflict on every
upstream merge and break the catalog gates (`verify:localization-catalog`,
`locale-english-regression`, the translation-policy suites), which all assert
against upstream values. The post-processor leaves every catalog byte identical
and swaps the name as strings are rendered.

Only the capitalized standalone word is matched. Lowercase `orca` is load-bearing
— the CLI binary, `orca.yaml`, `~/.orca`, reverse-proxy paths — and `ORCA_*` env
vars must survive verbatim. Both are untouched by the case-sensitive match.

## The mark

One circle, cut by two vertical entailles and two horizontal entrefers. Every
proportion is a fraction of the diameter, taken from the Oxeegen mark:

| Element             | Width                                       |
| ------------------- | ------------------------------------------- |
| Arc latéral         | `0.303 D`                                   |
| Entaille verticale  | `0.122 D`                                   |
| Barre centrale      | `0.149 D`                                   |
| Entrefer horizontal | `38` — deliberately finer than the entaille |

The banded mark splits each arc in two at `2/3 · 1/3` on the left and `1/3 · 2/3`
on the right. That inversion replaces mirror symmetry with rotational symmetry —
the halves match at 180°, nothing repeats horizontally — and the long band sits
top-left so the diagonal runs with the gloss instead of against it. Flipping the
direction is the two fractions in `MARKS.icon`.

Pieces are emitted as exact outlines (arc plus line segments), not as a circle
behind a clip rectangle: the light edge has to run along the straight cuts too,
and a clip strips the stroke from exactly those sides.

**Three files, two marks.** `app-icon.ts` resolves the `classic` icon to
`resources/icon-dev.png` whenever `is.dev`, so a dev run never displays
`icon.png`. `icon-dev.svg` keeps upstream's dev/prod distinction — same geometry,
no chroma — rather than dropping it. The two alternate icons the Settings picker
offers (`resources/app-icons/orca-*.png`) are still upstream artwork; only the
default `classic` entry is branded.

**One mark everywhere.** Below roughly 24px the banded arcs thin out and the
cuts get muddy — inherent to slicing a crescent, and no tuning fixes it. The
parent's three slices held that size better, but running two marks costs more in
recognition than the sharpness it buys back, so the banded mark takes every slot:
app icon, dock, installer, and the titlebar via `icon-mono.svg`.

If the titlebar ever proves unreadable in practice, the three-slice geometry is
in this file's history at `59f2c87a1b`.

```bash
pnpm run brand:marks   # redraw both SVGs after changing the geometry
pnpm run brand:icon    # rasterize icon.svg to a 1024px PNG
pnpm run brand:assets  # copy everything into the upstream paths
```

`rasterize-marks.mjs` drives Playwright's Chromium, already a dev dependency for
the e2e suite. If it is missing, run `pnpm exec playwright install chromium`.

`apply-brand-assets.mjs` overwrites upstream files in place rather than aliasing
them, because `resources/logo.svg` is imported by relative path from five modules
and the app icons are read off disk by electron-builder, never through the bundler.
Those destinations are tracked upstream, so `git merge upstream/main` can conflict
on them — resolve with `git checkout --ours <path>` and re-run `pnpm run brand:assets`.

electron-builder derives `.icns` and `.ico` from the 1024px PNG at package time,
so neither container format is committed, and neither has to be authored on a
Linux dev box.

## Building

```bash
pnpm run build:linux:brand
```

`build:win:brand` and `build:mac:brand` are the other targets. All three run
`brand:assets` first and pass `--publish never`.

Linux is AppImage-only on purpose. The deb/rpm targets carry an `orca-ide` package
name, a PATH symlink, and after-install hooks wired to that name; rebranding those
safely is its own change.

`BRAND_VERSION` overrides the packaged version, e.g. from a release tag.

## Known gaps

Both are macOS-only and self-consistent — they use upstream's bundle id where the
real one is now `com.oxeegen.oxeeui`.

- `src/main/macos-tcc-prompt-watch.ts` matches TCC log lines against hardcoded
  `com.stablyai.orca*` identifiers, so the "we triggered a permission prompt"
  notice never fires on a branded build.
- `src/shared/local-build-compatibility-contract.{ts,json}` stamps upstream's
  appId into local dev builds. Both sides compare the same constant so the feature
  works, but an upstream Orca local build would read as compatible with this app.

## Settings pruning

`brand/settings/hidden-sections.ts` removes 13 of the 33 Settings sections. Three
reach an upstream first-party service and are not merely off-brand — a fork build
would authenticate with someone else's OAuth client (`orca-account`) or publish to
someone else's host (`artifacts`, `plugins`). Three are development and first-run
scaffolding. Seven are capabilities outside what this product ships.

The filter lives in the `useSettingsNavigationMetadata` hook, not in
`buildSettingsNavigationMetadata`. Both the Settings sidebar and the Cmd+J palette
read the hook, so one line covers both surfaces while upstream's own metadata
tests keep asserting upstream's full registry and never need touching.

**This removes entry points, not capabilities.** A hidden feature is still
compiled in and often still reachable from its own UI — browser tabs, mobile
pairing, and voice each have surfaces of their own. Anything that must be
genuinely unavailable needs a real gate. Deep links into a hidden pane are safe:
Settings already falls back to the first visible section when the active one is
not in the nav (the `visibleSectionIds` effect in `Settings.tsx`).

`hidden-sections.test.ts` asserts every hidden id still exists in the upstream
registry, so a rename upstream fails loudly instead of quietly restoring a pane.

## GitHub Actions

Upstream ships 28 workflows and 16 fire on `push`, `pull_request`, or `schedule`.
This is a real GitHub fork of `stablyai/orca`, public, with Actions enabled — so
without a guard the first push would start macOS build matrices, Windows e2e
suites, and mobile release jobs on our quota for no benefit.

Every one of the 57 jobs carries `if: github.repository == 'stablyai/orca'`. That
is upstream's own fork-protection idiom: six of their jobs already used that exact
expression. Jobs resolve and then skip, and skipped jobs bill nothing.

**Guarding rather than deleting was measured, not assumed.** Upstream changed
`.github/workflows` 232 times in six months. A deleted workflow conflicts on every
one of those commits that touches it; a guarded one merges cleanly unless the edit
lands on the guard line. Deleting also broke the 17 upstream test files that read
these workflows, costing 87 tests and two edits to `reliability-gates.jsonc`.
Guarding cost four assertions relaxed from `toBe` to `toContain` and no coverage
at all — the suite still runs its full 756 tests.

**The guard only takes effect once it is on `main`.** `pull_request` evaluates
the workflow from the merged base+head, so a guard on a feature branch already
applies there. `pull_request_target` and `schedule` do not: they run the workflow
as it exists on the base branch. Until this lands on `main`, those two keep
executing upstream's unguarded definitions — which is why the fork accumulated
failing scheduled E2E and Terminal Perf runs before any of this existed. Nothing
in a branch can prevent that; merging is the fix.

**On every upstream merge, re-apply the guard to anything new.** A conflict on the
guard line is the visible case. The dangerous one is silent: a workflow or job
added upstream after we guarded arrives as a clean add with no conflict.
`brand/ci/upstream-workflow-guard.test.ts` fails on any unguarded job, so both
paths surface as a red test rather than a CI bill.

## Not yet branded

Forced and locked configuration is not wired. Defaults belong in
`getDefaultPersistedState()` in `src/main/persistence.ts`; locking a key further
needs it re-applied in the save handler at `src/main/ipc/settings.ts` and rendered
read-only through a helper.

The two alternate icons in the Settings picker (`resources/app-icons/orca-*.png`)
are still upstream artwork; only the default `classic` entry is branded.

Telemetry needs no work: `ORCA_BUILD_IDENTITY` and `ORCA_POSTHOG_WRITE_KEY` are
substituted at compile time only by upstream's release CI, so any fork build
resolves them to `null` and the transport short-circuits.
