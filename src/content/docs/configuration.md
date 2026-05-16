---
title: Configuration
description: Configure SWE-Squad environment variables and API keys
section: Getting Started
order: 3
---

# Configuration

SWE-Squad is configured through environment variables loaded from a `.env` file in your project root. This page covers every required and optional variable, how to obtain API keys, and how to verify your setup.

## Environment Setup

Copy the example environment file into your project root:

```bash
cp .env.example .env
```

Then edit `.env` with your own values as described below.

## Required Variables

All of the following variables must be set before running SWE-Squad:

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude models | `sk-ant-...` |
| `GITHUB_TOKEN` | GitHub personal access token (needs `repo`, `read:org` scopes) | `ghp_...` |
| `SUPABASE_URL` | Supabase project URL for ticket storage | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SWE_TEAM_ID` | Team identifier for multi-team setups | `default` |

## Getting Your API Keys

### ANTHROPIC_API_KEY

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to **API Keys**
4. Click **Create Key** and copy the value (prefixed with `sk-ant-`)

### GITHUB_TOKEN

1. Go to GitHub and open **Settings**
2. Navigate to **Developer Settings** then **Personal Access Tokens**
3. Click **Generate new token**
4. Select the following scopes:
   - `repo` — full control of private repositories
   - `read:org` — read organization membership
5. Copy the generated token (prefixed with `ghp_`)

### Supabase Keys

1. Open your Supabase project dashboard
2. Navigate to **Settings** then **API**
3. Copy the **Project URL** for `SUPABASE_URL`
4. Copy the **anon / public** key for `SUPABASE_ANON_KEY`

## Optional Variables

These variables have sensible defaults and can be omitted unless you need custom behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `SWE_MODEL` | `claude-sonnet-4-6` | Default model for agents |
| `SWE_MAX_CYCLES` | `10` | Maximum fix cycles per ticket |
| `SWE_LOG_LEVEL` | `INFO` | Logging verbosity (DEBUG, INFO, WARNING, ERROR) |
| `SWE_DOCKER_ENABLED` | `false` | Enable Docker-based agent isolation |

## Verifying Configuration

After editing your `.env` file, confirm that the critical variables are loaded correctly:

```bash
python3 -c "from dotenv import load_dotenv; import os; load_dotenv(); print('ANTHROPIC_API_KEY:', 'set' if os.environ.get('ANTHROPIC_API_KEY') else 'MISSING'); print('GITHUB_TOKEN:', 'set' if os.environ.get('GITHUB_TOKEN') else 'MISSING')"
```

If either variable reports `MISSING`, double-check your `.env` file path and contents.

## Next Step

Continue to [Running SWE-Squad](/docs/running)
