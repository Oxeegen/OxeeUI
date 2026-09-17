<p align="center">
  <img src="brand/assets/generated/icon.png" alt="OxeeUI" width="120" />
</p>

<h1 align="center">OxeeUI</h1>

<p align="center">
  <sub><strong>English</strong> · <a href="docs/readme/README.fr.md">Français</a></sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey?style=flat" alt="Platform: Windows and Linux" />
  <img src="https://img.shields.io/badge/agents-any%20CLI-5E4AF5?style=flat" alt="Works with any CLI agent" />
  <img src="https://img.shields.io/badge/license-MIT-08C?style=flat" alt="License: MIT" />
</p>

<p align="center">
  Oxeegen's agentic development environment — run any CLI coding agent in its own<br/>
  git worktree, with the terminal, editor and diff review in one window.
</p>

<h3 align="center"><a href="https://github.com/Oxeegen/OxeeUI/releases/latest"><ins>Download the latest release</ins></a></h3>

<p align="center">
  <img src="brand/assets/readme/feature-wall/split-screen.jpg" alt="OxeeUI running an agent beside the editor and file tree" width="960" />
</p>

---

**OxeeUI** runs coding agents the way a team actually works: several at once, each isolated in its own git worktree, with the terminal, file tree, editor and diff review side by side. Claude Code, Codex, Grok, Cursor, Copilot, OpenCode, Qwen, Kimi — if it runs in a terminal, it runs here.

Agents run under **your own subscriptions**. There is no Oxeegen account, no per-seat service in the middle, and no usage analytics: OxeeUI builds ship without an analytics key, so no usage telemetry is sent.

## Download

Builds live on the [**Releases**](https://github.com/Oxeegen/OxeeUI/releases) page.

| Version | Platform | File |
|---|---|---|
| **0.4.204** | Windows x64 | `oxeeui-windows-setup.exe` |
| **0.4.204** | Linux x86_64 | `oxeeui-linux-x86_64.AppImage` |

Builds are **unsigned**, so Windows SmartScreen warns on first run — choose **More info → Run anyway**.

**No macOS build yet.** Without an Apple Developer certificate the DMG is refused by Gatekeeper; a macOS build follows once signing is in place.

New versions are published on the Releases page.

## Features

<table>
<tr>
<td width="50%" valign="middle">

### Parallel Worktrees

Fan one prompt across several agents, each in its own isolated git worktree — compare the results and merge the winner.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/parallel-worktrees.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/parallel-worktrees.jpg" alt="Parallel worktrees" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Any CLI Agent

Claude Code, Codex, Grok, Cursor, Copilot, OpenCode, Qwen, Kimi, Goose, Cline and the rest — all driven from one window, on your own subscriptions.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/cli-agents.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/cli-agents.jpg" alt="Running a CLI agent" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Terminal Splits

Fast GPU-rendered terminals with unlimited splits, and scrollback that survives restarts.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/terminal-splits.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/terminal-splits.jpg" alt="Terminal splits" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Annotate AI Diffs

Drop comments on any diff line and send them straight back to the agent — review, edit and commit without leaving the app.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/annotate-diff.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/annotate-diff.jpg" alt="Annotating an AI-generated diff" width="100%" /></picture>
</td>
</tr>
</table>

**Also in the box:** quick open across worktrees, files, agents and commands · drag files and images straight into an agent's prompt · usage and rate-limit resets per provider, with account switching that needs no fresh login · Markdown, image and PDF previews in the workspace · notifications and unread state when an agent finishes or needs attention · automation from the command line.

## Designed for focus

- **A focused Settings panel.** OxeeUI is for agents, git and the terminal. There is no cloud sign-in, sharing service or plugin marketplace to configure.
- **Ready to work.** A new profile opens with Oxeegen's appearance: dark theme, Cascadia Code and Monokai.
- **Familiar file icons.** File and folder icons come from Material Icon Theme, the same set as VS Code, across the explorer, tabs, search, source control and diffs.

## Developing

```bash
pnpm install
pnpm dev
```

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for checks, installer builds and releases.

## License

OxeeUI is open-source software under the [MIT License](LICENSE).

Maintained by [Oxeegen](https://oxeegen.com).
