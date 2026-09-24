<p align="center">
  <img src="brand/assets/generated/icon.png" alt="OxeeUI" width="120" />
</p>

<h1 align="center">OxeeUI</h1>

<p align="center">
  <sub><strong>English</strong> · <a href="docs/readme/README.fr.md">Français</a></sub>
</p>

<p align="center"><b>Oxeegen's agentic development environment.</b><br/>
Run any CLI coding agent in its own git worktree — terminal, editor and diff review in one window.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Oxeegen/OxeeUI?color=5E4AF5" alt="License: MIT" /></a>
  <a href="https://github.com/Oxeegen/OxeeUI/releases/latest"><img src="https://img.shields.io/github/v/release/Oxeegen/OxeeUI?color=5E4AF5" alt="Latest release" /></a>
  <a href="https://github.com/Oxeegen/OxeeUI/releases"><img src="https://img.shields.io/github/downloads/Oxeegen/OxeeUI/total?color=5E4AF5" alt="Downloads" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-5E4AF5" alt="Platform: Windows and Linux" />
</p>

<p align="center">
  <a href="#download"><b>Download</b></a> ·
  <a href="#features"><b>Features</b></a> ·
  <a href="#supported-agents"><b>Agents</b></a> ·
  <a href="#ai-backends"><b>AI backends</b></a> ·
  <a href="#the-oxeegen-stack"><b>Oxeegen stack</b></a> ·
  <a href="#faq"><b>FAQ</b></a>
</p>

<p align="center">
  <img src="brand/assets/readme/feature-wall/split-screen.jpg" alt="OxeeUI running a coding agent beside the editor and the file tree" width="960" />
</p>

**OxeeUI** runs coding agents the way a team actually works: several at once, each
isolated in its own git worktree, with the terminal, file tree, editor and diff review
side by side. Hand a task to an agent, keep working, and come back to a branch that is
ready to review.

- **Many agents, one window.** Claude Code, Codex, Grok, Cursor, GitHub Copilot,
  OpenCode, Qwen Code, Kimi and twenty more run side by side. If it runs in a terminal,
  it runs here.
- **Isolated work.** Each task gets its own git worktree, so agents never trample
  each other's changes — or yours.
- **Review before you merge.** Read the diff, annotate any line and send the notes back
  to the agent, then commit, all without leaving the app.
- **Local or remote.** Work on this machine, or on an SSH host with file editing, git
  and terminals.
- **No account, no analytics.** Your repositories stay where they are, and OxeeUI builds
  ship without an analytics key, so no usage telemetry is sent.
- **Part of Oxeegen's stack.** Runs Oxeegen Hermes on Oxeegen's own models, on your
  machine or as a managed cloud computer — see [The Oxeegen stack](#the-oxeegen-stack).

**Get it:** [Windows](https://github.com/Oxeegen/OxeeUI/releases/latest/download/oxeeui-windows-setup.exe) (x64) ·
[Linux](https://github.com/Oxeegen/OxeeUI/releases/latest/download/oxeeui-linux-x86_64.AppImage) (AppImage) —
requirements in [Download](#download).

## Features

<table>
<tr>
<td width="50%" valign="middle">

### Parallel worktrees

Fan one prompt across several agents, each in its own isolated git worktree — compare
the results and merge the winner.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/parallel-worktrees.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/parallel-worktrees.jpg" alt="Parallel worktrees" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Any CLI agent

Claude Code, Codex, Grok, Cursor, OpenCode, Qwen Code, Kimi, Goose, Cline and the rest —
all driven from one window, on your own subscriptions.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/cli-agents.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/cli-agents.jpg" alt="A CLI coding agent running in OxeeUI" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Terminal splits

Fast GPU-rendered terminals with unlimited splits, and scrollback that survives
restarts.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/terminal-splits.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/terminal-splits.jpg" alt="Splitting terminals" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Annotate AI diffs

Drop comments on any diff line and send them straight back to the agent — review, edit
and commit without leaving the app.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/annotate-diff.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/annotate-diff.jpg" alt="Annotating an AI-generated diff" width="100%" /></picture>
</td>
</tr>
<tr>
<td width="50%" valign="middle">

### Drag files to agents

A full editor with autosave everywhere — drag a file or an image from the tree straight
into an agent's prompt.

</td>
<td width="50%">
  <picture><source srcset="brand/assets/readme/feature-wall/drag-files.gif" type="image/gif"><img src="brand/assets/readme/feature-wall/drag-files.jpg" alt="Dragging a file from the file tree into an agent's prompt" width="100%" /></picture>
</td>
</tr>
</table>

**Also in the box:**

- **SSH worktrees** — run agents on a remote machine with file editing, git and
  terminals, and reconnect automatically when the link drops.
- **GitHub in the app** — browse pull requests and issues, and open a worktree straight
  from a task.
- **Quick open** — jump across worktrees, files, agents and commands without leaving
  the keyboard.
- **Accounts and usage** — usage and rate-limit resets per provider, with account
  switching that needs no fresh login.
- **Markdown and previews** — edit Markdown in a rich editor, and preview images and
  PDFs in the workspace.
- **Notifications and unread state** — know when an agent finishes or needs attention,
  and mark threads unread to come back to them later.
- **File icons you already know** — Material Icon Theme, the same set as VS Code, across
  the explorer, tabs, search, source control and diffs.
- **Ready to work** — a new profile opens with Oxeegen's appearance: dark theme,
  Cascadia Code and Monokai.

## Why OxeeUI

- **Made for many agents.** OxeeUI tracks which agent works where, what it changed and
  when it needs you.
- **Real git, reviewed in place.** Every agent works on a real branch in its own worktree
  of your repository, and its diffs, line comments and commits sit in the same window.
- **One stack, end to end.** Oxeegen Hermes runs on Oxeegen's own models — the same ones
  behind OxeeOffice — while Claude Code, Codex and 27 other agents still run alongside it
  on their own sign-ins.
- **Ready without the setup.** An agent stack is hard to set up. Oxeegen delivers the
  whole platform as a monthly managed service, on a dedicated cloud computer.
- **24/7 Ultra-Support.** With an Oxeegen contract, Oxeegen's support team takes care of
  assistance, updates, maintenance and monitoring for the platform.
- **Runs where your code runs.** On this machine, in WSL on Windows, on an SSH host, or in
  a dedicated virtual desktop in Oxeegen's datacenter.
- **Automation built in.** Scheduled agent runs, each in a fresh workspace, and a
  coordinator agent that dispatches work to others.
- **Open source and private.** MIT-licensed and free, with no usage analytics.

## Supported agents

Works with **any CLI agent**. These are recognised out of the box:

<table>
<tr>
<td><a href="https://ampcode.com/manual#install"><img src="https://www.google.com/s2/favicons?domain=ampcode.com&sz=64" width="16" height="16" alt="" /> Amp</a></td>
<td><a href="https://antigravity.google/docs/cli-overview"><img src="https://www.google.com/s2/favicons?domain=antigravity.google&sz=64" width="16" height="16" alt="" /> Antigravity</a></td>
<td><a href="https://docs.augmentcode.com/cli/overview"><img src="https://www.google.com/s2/favicons?domain=augmentcode.com&sz=64" width="16" height="16" alt="" /> Auggie</a></td>
<td><a href="https://github.com/autohandai/code-cli"><img src="https://www.google.com/s2/favicons?domain=autohand.ai&sz=64" width="16" height="16" alt="" /> Autohand Code</a></td>
<td><a href="https://docs.anthropic.com/claude/docs/claude-code"><img src="brand/assets/readme/agents/claude.svg" width="16" height="16" alt="" /> Claude Code</a></td>
</tr>
<tr>
<td><a href="https://docs.cline.bot/cline-cli/overview"><img src="https://www.google.com/s2/favicons?domain=cline.bot&sz=64" width="16" height="16" alt="" /> Cline</a></td>
<td><a href="https://www.codebuff.com/docs/help/quick-start"><img src="https://www.google.com/s2/favicons?domain=codebuff.com&sz=64" width="16" height="16" alt="" /> Codebuff</a></td>
<td><a href="https://github.com/openai/codex"><img src="https://www.google.com/s2/favicons?domain=openai.com&sz=64" width="16" height="16" alt="" /> Codex</a></td>
<td><a href="https://commandcode.ai/docs/quickstart"><img src="https://www.google.com/s2/favicons?domain=commandcode.ai&sz=64" width="16" height="16" alt="" /> Command Code</a></td>
<td><a href="https://docs.continue.dev/guides/cli"><img src="https://www.google.com/s2/favicons?domain=continue.dev&sz=64" width="16" height="16" alt="" /> Continue</a></td>
</tr>
<tr>
<td><a href="https://github.com/charmbracelet/crush"><img src="https://www.google.com/s2/favicons?domain=charm.sh&sz=64" width="16" height="16" alt="" /> Crush</a></td>
<td><a href="https://cursor.com/cli"><img src="https://www.google.com/s2/favicons?domain=cursor.com&sz=64" width="16" height="16" alt="" /> Cursor</a></td>
<td><a href="https://devin.ai/cli"><img src="https://www.google.com/s2/favicons?domain=devin.ai&sz=64" width="16" height="16" alt="" /> Devin</a></td>
<td><a href="https://docs.factory.ai/cli/getting-started/quickstart"><img src="brand/assets/readme/agents/droid.svg" width="16" height="16" alt="" /> Droid</a></td>
<td><a href="https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli"><img src="https://www.google.com/s2/favicons?domain=github.com&sz=64" width="16" height="16" alt="" /> GitHub Copilot</a></td>
</tr>
<tr>
<td><a href="https://block.github.io/goose/docs/quickstart/"><img src="https://www.google.com/s2/favicons?domain=goose-docs.ai&sz=64" width="16" height="16" alt="" /> Goose</a></td>
<td><a href="https://x.ai/cli"><img src="https://www.google.com/s2/favicons?domain=x.ai&sz=64" width="16" height="16" alt="" /> Grok</a></td>
<td><a href="https://hermes-agent.nousresearch.com/docs/"><img src="https://www.google.com/s2/favicons?domain=nousresearch.com&sz=64" width="16" height="16" alt="" /> Hermes Agent</a></td>
<td><a href="https://kilo.ai/docs/cli"><img src="https://www.google.com/s2/favicons?domain=kilo.ai&sz=64" width="16" height="16" alt="" /> Kilo Code</a></td>
<td><a href="https://www.kimi.com/code/docs/en/kimi-code-cli/getting-started.html"><img src="https://www.google.com/s2/favicons?domain=moonshot.cn&sz=64" width="16" height="16" alt="" /> Kimi</a></td>
</tr>
<tr>
<td><a href="https://kiro.dev/docs/cli/"><img src="https://www.google.com/s2/favicons?domain=kiro.dev&sz=64" width="16" height="16" alt="" /> Kiro</a></td>
<td><a href="https://mimo.xiaomi.com/coder"><img src="https://www.google.com/s2/favicons?domain=mimo.xiaomi.com&sz=64" width="16" height="16" alt="" /> MiMo Code</a></td>
<td><a href="https://github.com/mistralai/mistral-vibe"><img src="https://www.google.com/s2/favicons?domain=mistral.ai&sz=64" width="16" height="16" alt="" /> Mistral Vibe</a></td>
<td><a href="https://omp.sh"><img src="https://omp.sh/favicon.svg" width="16" height="16" alt="" /> oh-my-pi</a></td>
<td><a href="https://openclaude.gitlawb.com/"><img src="brand/assets/readme/agents/openclaude.png" width="16" height="16" alt="" /> OpenClaude</a></td>
</tr>
<tr>
<td><a href="https://opencode.ai/docs/cli/"><img src="https://www.google.com/s2/favicons?domain=opencode.ai&sz=64" width="16" height="16" alt="" /> OpenCode</a></td>
<td><a href="https://pi.dev"><img src="https://pi.dev/favicon.svg" width="16" height="16" alt="" /> Pi</a></td>
<td><a href="https://github.com/QwenLM/qwen-code"><img src="https://www.google.com/s2/favicons?domain=qwenlm.github.io&sz=64" width="16" height="16" alt="" /> Qwen Code</a></td>
<td><a href="https://support.atlassian.com/rovo/docs/install-and-run-rovo-dev-cli-on-your-device/"><img src="https://www.google.com/s2/favicons?domain=atlassian.com&sz=64" width="16" height="16" alt="" /> Rovo Dev</a></td>
<td><b>+ any CLI agent</b></td>
</tr>
</table>

## AI backends

**Oxeegen Hermes.** OxeeUI's main backend is Oxeegen Hermes, Oxeegen's own version of
the Hermes agent. It calls Oxeegen's models — Max, Pro, Flash and Instant — through the
Oxeegen API: the same models and API that OxeeOffice uses, served from Oxeegen's servers
in a US and an EU region, each with its own keys.

**Managed by Oxeegen.** Wiring an agent, model access, keys, runtimes and remote hosts
together is where most teams stall. With an Oxeegen contract, the full platform runs in a
dedicated virtual desktop (VDI) in Oxeegen's cloud datacenter, installed and configured,
as a monthly package managed by Oxeegen and covered by **24/7 Ultra-Support**:
assistance, updates, maintenance and monitoring. See
[Oxeegen cloud computers](https://www.oxeegen.com/computer).

**Any other agent.** OxeeUI never calls a model itself — each agent does, with whatever it
is set up to use: a Claude or ChatGPT plan, an API key, or a self-hosted endpoint. Agents
that accept a custom OpenAI-compatible provider, such as OpenCode, Qwen Code, Cline or
Kilo Code, can use the Oxeegen API too: set the endpoint and key in the agent's own
configuration, or as environment variables in **Settings → Agents**.

**Accounts and runtimes.** **Settings → Accounts** switches between several Claude and
Codex sign-ins without logging in again, and shows live usage and rate-limit resets.
Agents run on this machine, in WSL or on an SSH host; **Settings → Agents** sets the
default agent and the permission default, **Yolo** or **Manual**.

## The Oxeegen stack

Oxeegen is building a **sovereign AI stack**: its own models, served from its own
inference servers, and the desktop apps that put them to work.

| | |
|---|---|
| **Oxeegen models** | Max, Pro, Flash and Instant, running on Oxeegen's servers and served through an OpenAI-compatible API, with US and EU regions. |
| **Oxeegen Hermes** | Oxeegen's own version of the Hermes agent, running on Oxeegen's models — OxeeUI's main backend. |
| **[OxeeOffice](https://github.com/Oxeegen/OxeeOffice)** | The AI office suite: Word, Excel, PowerPoint and PDF files, edited with an AI that runs on Oxeegen's models. |
| **[VOxee](https://github.com/Oxeegen/VOxee)** | Voice to text: dictation, meeting transcription and notes on Oxeegen's self-hosted models. |
| **OxeeUI** | The agentic development environment — this repository. |
| **[Cloud computers](https://www.oxeegen.com/computer)** | Managed virtual desktops in Oxeegen's datacenter with 24/7 Ultra-Support, including a dedicated OxeeUI platform. |

OxeeUI is the developer's seat in that stack. It runs Oxeegen Hermes and the coding
agents your team already uses, on your own machine or in an Oxeegen cloud computer — see
[AI backends](#ai-backends).

## Download

| Platform | Requirements | Download |
|---|---|---|
| **Windows** (x64) | Windows 10 or later | [`oxeeui-windows-setup.exe`](https://github.com/Oxeegen/OxeeUI/releases/latest/download/oxeeui-windows-setup.exe) |
| **Linux** (x86_64) | FUSE 2 runtime | [`oxeeui-linux-x86_64.AppImage`](https://github.com/Oxeegen/OxeeUI/releases/latest/download/oxeeui-linux-x86_64.AppImage) |

Every version and its notes are on the [Releases](https://github.com/Oxeegen/OxeeUI/releases)
page. The installers are **unsigned**: on first run, Windows SmartScreen warns — choose
**More info → Run anyway**. There is no macOS build yet, because without an Apple
Developer certificate Gatekeeper refuses the app.

<details>
<summary><b>Running the AppImage on Linux</b></summary>

The AppImage runs in place. Install the FUSE 2 runtime if it is missing
(`sudo apt install libfuse2`; on Ubuntu 24.04 the package is `libfuse2t64`), make the
file executable, then start it:

```bash
chmod +x oxeeui-linux-x86_64.AppImage
./oxeeui-linux-x86_64.AppImage
```

</details>

## FAQ

<details>
<summary><b>Is OxeeUI free?</b></summary>

Yes. OxeeUI is open-source software under the MIT License. Oxeegen Hermes uses an
Oxeegen API key, other agents use your own subscriptions or API keys, and the managed
cloud platform with 24/7 Ultra-Support is a monthly package from Oxeegen.

</details>

<details>
<summary><b>Which coding agents does it work with?</b></summary>

Any agent that runs in a terminal. The ones listed under
[Supported agents](#supported-agents) are recognised out of the box; any other CLI agent
runs in a regular terminal tab.

</details>

<details>
<summary><b>Does OxeeUI send my code anywhere?</b></summary>

No. Repositories and worktrees stay on your machine, or on the SSH hosts you connect.
OxeeUI builds carry no analytics key, so no usage telemetry is sent. The agents you run
talk to their own model providers, exactly as they do in any terminal.

</details>

<details>
<summary><b>Can I use Oxeegen's models?</b></summary>

Yes. Oxeegen Hermes runs on them, and so can any agent that accepts a custom
OpenAI-compatible endpoint, such as OpenCode, Qwen Code, Cline or Kilo Code. Keys are
issued per region (US or EU); [AI backends](#ai-backends) explains where the endpoint and
key go.

</details>

<details>
<summary><b>Can Oxeegen host and manage it for us?</b></summary>

Yes. With an Oxeegen contract, the full platform runs in a dedicated virtual desktop in
Oxeegen's cloud datacenter, installed and configured, as a monthly managed package with
24/7 Ultra-Support. See [Oxeegen cloud computers](https://www.oxeegen.com/computer).

</details>

<details>
<summary><b>Can agents run on a remote machine?</b></summary>

Yes. SSH worktrees give an agent a remote host with file editing, git and terminals,
and reconnect automatically when the connection drops.

</details>

<details>
<summary><b>Is there a macOS version?</b></summary>

Not yet. A macOS build needs an Apple Developer certificate; without one, Gatekeeper
refuses the app.

</details>

<details>
<summary><b>Why does Windows warn me when I install it?</b></summary>

The installer is not code-signed yet, so SmartScreen does not recognise it. Choose
**More info → Run anyway**.

</details>

## Developing

```bash
pnpm install
pnpm dev
```

Checks, installer builds and releases are covered in [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

OxeeUI is open-source software under the [MIT License](LICENSE).

Maintained by [Oxeegen](https://oxeegen.com).
