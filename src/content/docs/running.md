---
title: Running SWE-Squad
description: Run SWE-Squad in bootstrap, single-cycle, or daemon mode
section: Getting Started
order: 4
---

# Running SWE-Squad

SWE-Squad can operate in several modes depending on your workflow. This page covers bootstrap initialization, single-cycle execution for testing or CI/CD, and continuous daemon mode for ongoing ticket processing.

## Bootstrap Mode (First Run)

```bash
python3 -m swe_squad --bootstrap
```

The first run uses bootstrap mode to initialize the ticket store, verify all connections (GitHub API, Supabase, Claude), and acknowledge any existing errors in the repository. This creates the baseline state for future cycles. Run this once before using any other mode.

## Single Cycle Mode

```bash
python3 -m swe_squad --cycle
```

Runs a single fix cycle — picks up the highest-priority open ticket, investigates the issue, produces a fix, creates a pull request, and exits. Use this mode for testing, debugging, or integrating with CI/CD pipelines where you want deterministic one-shot behavior.

## Daemon Mode

```bash
python3 -m swe_squad --daemon
```

Continuously polls for new tickets and processes them one at a time. The daemon runs until stopped with `Ctrl+C` or `SIGTERM`. By default it checks for new tickets every 60 seconds; configure the poll interval with the `SWE_POLL_INTERVAL` environment variable.

## Daemon Mode Options

| Flag | Description |
|------|-------------|
| `--poll-interval SECONDS` | Time between polling cycles (default: 60) |
| `--max-cycles N` | Stop after N cycles (default: unlimited) |
| `--team-id TEAM` | Process tickets for a specific team |

Example — poll every 30 seconds, stop after 50 cycles, targeting the `backend` team:

```bash
python3 -m swe_squad --daemon --poll-interval 30 --max-cycles 50 --team-id backend
```

## Verifying It Works

### Check the logs

```bash
# Recent log entries
tail -f logs/swe-squad.log
```

### Run the status command

```bash
python3 -m swe_squad status
```

The expected output shows connected services, active tickets, and recent cycle results. If all services report as connected and tickets are listed, your setup is working.

## Troubleshooting Common Issues

- **"ANTHROPIC_API_KEY not set"** — Check that your `.env` file is in the project root and contains a valid `ANTHROPIC_API_KEY` entry.
- **"GitHub authentication failed"** — Run `gh auth status` and re-authenticate with `gh auth login` if needed. Confirm the token has `repo` and `read:org` scopes.
- **"Supabase connection error"** — Verify that `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your `.env` file match the values from your Supabase project dashboard under **Settings > API**.

## Next Steps

- [Architecture Deep-Dive](/docs/architecture) — understand how agents collaborate
- [Configuration Reference](/docs/configuration) — all available environment variables
- [API Reference](/docs/api-reference) — programmatic access
