# brand/

Everything specific to the OxeeUI fork of upstream Orca lives here. The goal is a
small, stable diff against `upstream/main`: upstream files carry only thin hooks
that read from this directory, so merges stay mechanical.

## Layout

| Path                               | Purpose                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| `config/brand.config.json`         | Declarative source of truth: product name, appId, executable names, publish target. |
| `config/brand.ts`                  | Typed accessor (`BRAND`, `IS_REBRANDED`). Import via the `@brand` alias.            |
| `i18n/rebrand.ts` | Rewrites the upstream product name in user-visible copy at render time.             |
| `assets/logo.svg`                  | Monochrome mark for the titlebar and in-app logo slots.                             |
| `assets/icon.svg`                  | Full-color app icon source.                                                         |
| `assets/brand-theme.css`           | Token overrides layered on `src/renderer/src/assets/main.css`.                      |
| `scripts/apply-brand-assets.mjs`   | Copies brand assets over the upstream files that read them by fixed path.           |

`config/electron-builder.brand.cjs` sits in `config/` (not here) because
electron-builder resolves sibling paths like `config/nsis/` relative to itself.

## The hooks in upstream files

Twelve lines total. If a merge conflicts, these are the places to re-apply.

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

## Assets

`apply-brand-assets.mjs` overwrites upstream files in place rather than aliasing
them, because `resources/logo.svg` is imported by relative path from five modules
and the app icons are read off disk by electron-builder, never through the bundler.

```bash
pnpm run brand:assets
```

Those destinations are tracked upstream, so `git merge upstream/main` can conflict
on them. Resolve with `git checkout --ours <path>` and re-run the command.

Raster icons are not generated yet: `.icns` / `.ico` / hicolor PNGs need a
rasterizer that is not a repo dependency, so the build still ships upstream's icon.
To produce them, render `assets/icon.svg` into `assets/generated/` as `icon.png`
(1024×1024), `icon.ico`, and `icon.icns` — the script picks them up automatically.
On macOS `resources/icon-source/generate.sh` already does this from an Icon
Composer project and can be pointed at the brand art.

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

## Not yet branded

Settings pruning and forced/locked configuration are not wired. The registry at
`src/renderer/src/hooks/useSettingsNavigationMetadata.ts` returns one array with an
`id` per section and backs both the Settings sidebar and the Cmd+J palette, so a
single filter there hides a section from both. Forced defaults belong in
`getDefaultPersistedState()` in `src/main/persistence.ts`, and locked keys need
re-application in the save handler at `src/main/ipc/settings.ts`.

Telemetry needs no work: `ORCA_BUILD_IDENTITY` and `ORCA_POSTHOG_WRITE_KEY` are
substituted at compile time only by upstream's release CI, so any fork build
resolves them to `null` and the transport short-circuits.
