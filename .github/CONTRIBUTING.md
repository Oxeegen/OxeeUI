# Contributing to OxeeUI

Thanks for contributing to OxeeUI.

## Before You Start

- Keep changes scoped to a clear user-facing improvement, bug fix, or refactor.
- OxeeUI releases ship for Windows and Linux, but the codebase targets macOS, Linux, and Windows. Every change must stay compatible with all three platforms unless the code is explicitly guarded by a runtime platform check.
- For keyboard shortcuts, use runtime platform checks in renderer code and `CmdOrCtrl` in Electron menu accelerators.
- For shortcut labels, show `⌘` and `⇧` on macOS, and `Ctrl+` and `Shift+` on Linux and Windows.
- For file paths, use Node or Electron path utilities such as `path.join`.
- OxeeUI must work against local repositories, remote servers, and SSH worktrees. Do not assume a process, file, credential, shell, or network path exists only on the local machine.
- OxeeUI supports many CLI agents and git providers. Keep generic behavior provider-neutral; guard integration-specific logic behind explicit checks.
- Keep changes well-engineered and performant: follow existing architecture, avoid unnecessary work in hot paths, clean up owned resources, and use concrete module names.
- For UI work, follow [`docs/STYLEGUIDE.md`](../docs/STYLEGUIDE.md), use the tokens and shadcn primitives it specifies, and verify polished behavior across platforms, light/dark mode, and SSH latency.

## Local Setup

```bash
pnpm install
pnpm dev
```

Ordinary installs include native optional dependencies for the current OS and CPU only.
Before a cross-architecture build, run `pnpm install:release` to add the other CPU's variants.
See [the install policy](../docs/reference/pnpm-install-policy.md).

## Branch Naming

Use a clear, descriptive branch name that reflects the change.

Good examples:

- `fix/ctrl-backspace-delete-word`
- `feat/shift-enter-newline`
- `chore/update-contributor-guide`

Avoid vague names like `test`, `misc`, or `changes`.

## Before Opening a PR

Run the checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Add high-quality tests for behavior changes and bug fixes. Prefer tests that would actually catch a regression, not shallow coverage that only exercises the happy path.

On Windows, part of the suite fails for environmental reasons (file locks, keychain access, line endings). Compare against a baseline run on `main` before attributing a failure to your change.

If your change affects UI or interaction behavior, verify it on the platforms it could impact.

## Type Declarations: Prefer `.ts` Over `.d.ts`

Project-owned type declarations belong in `.ts` files. `.d.ts` is reserved for ambient shims (e.g., `env.d.ts`, `vite/client.d.ts`). TypeScript's `skipLibCheck: true` setting applies globally, including to our own `.d.ts` files, which means any unresolved type reference in a `.d.ts` silently becomes `any` at its call sites. Write your types in `.ts` files so the compiler actually checks them.

CI enforces this for `src/preload/` and `src/shared/`.

## Pull Requests

Each pull request should follow [`.github/pull_request_template.md`](./pull_request_template.md). In particular:

- open with a plain-language summary of the change (the PR title is the one-liner)
- explain what changed and why, and stay focused on a single topic when possible
- for any UI or interaction change, attach **before and after** screenshots (or short videos); if there is no visual change, say `No visual change` and why
- include high-quality tests when behavior changes or bug fixes warrant them
- include a brief code review summary from your AI coding agent that explicitly checks cross-platform compatibility, SSH/remote/local compatibility, supported agent and integration compatibility, performance risk, UI quality when applicable, and basic security risk
- mention any platform-specific, remote/SSH-specific, agent-specific, integration-specific, or git-provider-specific behavior and testing notes

## Building Installers

```bash
pnpm run build:win:brand     # Windows installer
pnpm run build:linux:brand   # Linux AppImage
```

Both run `brand:assets` first and never publish. Builds are unsigned: Windows SmartScreen warns on install, and macOS is not built until an Apple Developer certificate exists.

## Release Process

Version bumps, tags, and releases are maintainer-managed. Do not include release version changes in a normal contribution unless a maintainer asks for them.

### Cutting a release (maintainers)

OxeeUI has its own version line. A release is an annotated `oxeeui-v<version>` tag:

```bash
git tag -a oxeeui-v0.4.205 -m "OxeeUI 0.4.205 ..."
git push origin oxeeui-v0.4.205
```

Pushing the tag runs [`release-brand.yml`](./workflows/release-brand.yml), which builds Windows and Linux and publishes one GitHub Release. The tag name sets the packaged version, and the tag message becomes the release notes.

**Before tagging:**

- Run `pnpm run typecheck` as well as the tests. Vitest does not typecheck, so a type error in a test passes locally and fails the release build after a full compile on both platforms.
- Run `pnpm run brand:verify`. It checks that the OxeeUI identity, assets and settings are still applied.
- Green unit tests are not evidence that packaging will succeed; the release build is the only step that exercises the packaging contracts.

The release job refuses to publish when `latest.yml` or `latest-linux.yml` is missing, because a release without those manifests can never be seen by an installed client.
