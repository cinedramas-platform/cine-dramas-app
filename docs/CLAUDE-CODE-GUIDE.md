# Claude Code — Account, Context & Model Guide

A reference for managing accounts, project context, and models in Claude Code CLI.

---

## 1. Check Your Current Login

To see which account/email you're logged in with:

```bash
/status
```

This displays your current account, model, and session info.

To log out:

```bash
/logout
```

To log in with a different account (after logout):

```bash
claude
```
This launches the browser-based OAuth flow again.

---

## 2. Switching Between Accounts (No Native Aliases)

Claude Code does **not** have a built-in account alias/profile system. The workaround is using environment variables.

### Option A: Switch via API Key

```bash
export ANTHROPIC_API_KEY=your-other-api-key
claude
```

API keys take precedence over OAuth login.

### Option B: Switch via Auth Token

```bash
export ANTHROPIC_AUTH_TOKEN=your-token
claude
```

### Option C: Use a Shell Alias (Recommended Workaround)

Add aliases to your `~/.bashrc` or `~/.zshrc`:

```bash
alias claude-personal='ANTHROPIC_API_KEY=key-for-personal-account claude'
alias claude-work='ANTHROPIC_API_KEY=key-for-work-account claude'
```

Then simply run `claude-personal` or `claude-work` in your terminal.

### Authentication Precedence Order

1. Cloud provider env vars (Bedrock, Vertex, Foundry)
2. `ANTHROPIC_AUTH_TOKEN`
3. `ANTHROPIC_API_KEY`
4. `apiKeyHelper` script
5. OAuth subscription login (from `/login`)

---

## 3. Giving Claude Persistent Project Context (CLAUDE.md)

`CLAUDE.md` is the primary way to give Claude persistent, per-project instructions. It is loaded into every session automatically.

### Where to Put It

| Scope | Location | Notes |
|-------|----------|-------|
| This project | `./CLAUDE.md` (project root) | Shared with team via git |
| Hidden project config | `./.claude/CLAUDE.md` | Also version-controlled |
| Personal (all projects) | `~/.claude/CLAUDE.md` | Only your machine |

### Auto-Generate It

```bash
/init
```

Claude analyzes your codebase and generates a starter `CLAUDE.md` with discovered commands, conventions, and structure.

### What to Put in CLAUDE.md

```markdown
# Project: CineDramas

## Overview
[Brief description of the project]

## Architecture
- Key folders and their purpose
- Important files to know about

## Build & Run Commands
- npm start / yarn dev / etc.

## Coding Standards
- Indentation, naming conventions
- Folder structure rules

## Testing
- How to run tests
- What coverage is expected

## Git Workflow
- Branch naming
- Commit message format
```

### View / Edit All Loaded Context Files

```bash
/memory
```

This lists every CLAUDE.md and rules file currently loaded and lets you open them in your editor.

### Import Other Files Into CLAUDE.md

```markdown
See @README.md for overview.
@docs/architecture.md
@CineDramas-Architecture-Blueprint.md
```

Use the `@path` syntax to reference other files — Claude will pull them in automatically.

### Advanced: Path-Specific Rules

Create files under `.claude/rules/` that only load when Claude works with matching files:

```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API Rules
- All endpoints must validate input
- Use standard error format
```

### CLAUDE.md Best Practices

- Keep each file **under 200 lines** — longer files reduce adherence
- Be specific and direct (Claude follows instructions, not hints)
- Update it as the project evolves

---

## 4. Selecting a Model

### Available Models

| Alias | Description |
|-------|-------------|
| `default` | Best for your subscription tier |
| `sonnet` | Latest Sonnet — fast, great for daily coding |
| `opus` | Latest Opus — deeper reasoning, complex tasks |
| `haiku` | Fastest and most lightweight |
| `sonnet[1m]` | Sonnet with 1M token context window |
| `opus[1m]` | Opus with 1M token context window |
| `opusplan` | Opus for planning, Sonnet for execution |

### Switch Model During a Session

```bash
/model opus
/model sonnet
/model haiku
/model opusplan
```

### Switch Model at Startup

```bash
claude --model opus
claude --model sonnet[1m]
```

### Set a Default Model Permanently

In `~/.claude/settings.json` (global) or `.claude/settings.json` (this project):

```json
{
  "model": "sonnet"
}
```

Or via environment variable:

```bash
export ANTHROPIC_MODEL=opus
```

### Control Reasoning Effort (Depth vs Speed)

```bash
/effort low     # Fastest
/effort medium  # Default
/effort high    # Deeper reasoning
/effort max     # Maximum (Opus only)
```

Or set permanently:

```bash
export CLAUDE_CODE_EFFORT_LEVEL=high
```

---

## 5. Jira Integration via MCP

Claude Code has **no native Jira integration**, but connects to Jira through **MCP (Model Context Protocol)** servers. Once connected, Claude can read and create Jira tickets conversationally.

### Step 1: Get a Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Copy and store it securely

### Step 2: Add the Jira MCP Server

Run in your terminal:

```bash
claude mcp add --scope user --transport http jira https://mcp.atlassian.com/v1/mcp
```

Or add it manually to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "jira": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

> **Note**: Atlassian provides an official remote MCP server. It uses OAuth — no manual token injection needed.

### Step 3: Authenticate

Inside a Claude Code session:

```bash
/mcp
```

Look for `jira` in the list. If it shows "Authentication required", follow the browser OAuth prompt to connect your Atlassian account.

### Step 4: Verify Connection

```bash
/mcp
```

You should see the Jira server listed as **connected** with available tools (e.g., `create_issue`, `search_issues`, `get_issue`).

---

### Creating Jira Tickets with Claude

Once connected, just ask naturally in conversation:

```
Create a Jira ticket:
- Title: "Build streaming video player component"
- Project: CIN
- Type: Story
- Priority: High
- Description: Implement a responsive HLS video player for episode playback
```

Or for a bug:

```
Create a Jira bug ticket for the login flow breaking on mobile — high priority, assign to me
```

Or batch create from a feature spec:

```
Read CineDramas-Architecture-Blueprint.md and generate Jira tickets for the MVP features listed there, in project CIN
```

### Querying Tickets

```
Show me all open high-priority tickets in project CIN
```

```
What's the status of ticket CIN-42?
```

```
List all tickets assigned to me
```

---

### Project-Level Jira Config (Team Sharing)

To share the Jira MCP config with your whole team, create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "jira": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

Each team member authenticates individually via `/mcp` — credentials are never shared.

---

### Limitations

- Claude can only perform actions your Jira account has permission for
- Large ticket lists may be truncated (MCP output capped at ~25,000 tokens)
- Jira Server/Data Center (self-hosted) requires a self-hosted MCP server setup instead

---

## 6. Useful Slash Commands Reference

| Command | What it does |
|---------|--------------|
| `/status` | Show current model, account, and session info |
| `/model <name>` | Switch model for this session |
| `/effort <level>` | Set reasoning depth (low/medium/high/max) |
| `/memory` | View and manage loaded CLAUDE.md files |
| `/init` | Auto-generate CLAUDE.md from your project |
| `/login` | Log in to Claude |
| `/logout` | Log out |
| `/help` | Show all available commands |
| `/fast` | Toggle Fast mode (quicker responses) |
| `/clear` | Clear conversation context |

---

## 6. CineDramas Project Context Setup

To give Claude permanent context for this project:

1. Run `/init` in the project root to auto-generate a `CLAUDE.md`
2. Edit it to reference the architecture file: add `@CineDramas-Architecture-Blueprint.md`
3. Run `/memory` to confirm it's loaded

From then on, every Claude session in this folder will have project context automatically.

---

*Generated: 2026-03-27*
