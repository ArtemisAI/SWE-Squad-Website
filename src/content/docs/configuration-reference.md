---
title: "Configuration Reference"
description: "Complete reference for all SWE-Squad configuration options"
section: "Reference"
order: 1
---

# Configuration Reference

This page provides a complete reference for every configuration option available in SWE-Squad. Configuration is split between **environment variables** (secrets and runtime toggles) and the **`swe_team.yaml`** project file (structural and behavioral settings).

---

## 1. Environment Variables

Environment variables are used for secrets, API keys, and runtime behavior that may differ between environments (development, staging, production). Set them in a `.env` file at the project root or export them directly in your shell.

### Required Variables

These variables must be set before SWE-Squad can start.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ANTHROPIC_API_KEY` | string | *(required)* | Anthropic API key for Claude model access. Used by default for all LLM invocations. |
| `GITHUB_TOKEN` | string | *(required)* | GitHub personal access token with `repo` and `issues` permissions. Used to read incidents, create branches, and open pull requests. |
| `SUPABASE_URL` | string | *(required)* | Supabase project URL for ticket state persistence. Example: `https://xyzproject.supabase.co` |
| `SUPABASE_ANON_KEY` | string | *(required)* | Supabase anonymous key for client-side authentication and REST API access. |
| `SWE_TEAM_ID` | string | *(required)* | Unique team identifier used for namespacing tickets, branches, and persisted state. Must be unique per team sharing a Supabase instance. |

### Optional Variables

These variables have sensible defaults and only need to be overridden for specific use cases.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SWE_MODEL` | string | `claude-sonnet-4-6` | Default model for agent invocations when no per-agent override is set. |
| `SWE_MAX_CYCLES` | number | `10` | Maximum orchestration cycles before halting. Prevents infinite fix loops. |
| `SWE_LOG_LEVEL` | string | `INFO` | Logging verbosity. Accepted values: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| `SWE_DOCKER_ENABLED` | boolean | `false` | Enable Docker sandboxed execution for agent tool calls. Recommended for production. |
| `SWE_POLL_INTERVAL` | number | `30` | Seconds between polling for new incidents when running in daemon mode. |
| `SWE_WEBHOOK_SECRET` | string | *(none)* | Secret for validating incoming GitHub webhook payloads. Required when using webhook-based monitoring. |
| `SWE_DASHBOARD_PORT` | number | `8080` | Port for the local dashboard and API server. |
| `SWE_CACHE_ENABLED` | boolean | `true` | Enable semantic cache for previously resolved patterns. Cached fixes are reused at zero model cost. |
| `SWE_CACHE_TTL` | number | `3600` | Cache TTL in seconds for resolved patterns. After expiry, patterns are re-evaluated on next occurrence. |
| `SWE_REMOTE_WORKERS` | number | `0` | Number of remote worker processes for distributed execution. Set to `0` for single-process mode. |

---

## 2. swe_team.yaml Reference

The `swe_team.yaml` file defines project-level configuration. Place it in your project root alongside your `.env` file.

### Top-Level Structure

```yaml
version: 1
project: { ... }
monitor: { ... }
governance: { ... }
agents: { ... }
models: { ... }
providers: { ... }
remote: { ... }
integrations: { ... }
```

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `version` | number | yes | `1` | Config schema version. Currently only version `1` is supported. |
| `project` | object | yes | *(none)* | Project identification and repository settings. |
| `monitor` | object | no | *(see defaults)* | Incident monitoring configuration. |
| `governance` | object | no | *(see defaults)* | Governance rules and stability thresholds. |
| `agents` | object | no | *(see defaults)* | Per-agent configuration overrides. |
| `models` | object | no | *(see defaults)* | Model tier definitions and routing rules. |
| `providers` | object | no | *(see defaults)* | LLM provider configuration. |
| `remote` | object | no | *(see defaults)* | Remote worker configuration for distributed execution. |
| `integrations` | object | no | *(none)* | External service integrations (Slack, PagerDuty, Datadog). |

### project

| Key | Type | Required | Default | Description |
|-----|------|----------|---------|-------------|
| `project.name` | string | yes | *(none)* | Project name used in tickets, logs, and dashboard display. |
| `project.language` | string | no | auto-detected | Primary programming language. Used to select linters, test runners, and file patterns. |
| `project.repository` | string | yes | *(none)* | Git repository URL. Example: `https://github.com/org/repo` |
| `project.branch_prefix` | string | no | `swe-fix/` | Prefix for auto-created branches. Example: `swe-fix/ticket-abc123` |

### monitor

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `monitor.enabled` | boolean | `true` | Enable incident monitoring. Set to `false` to operate in manual dispatch mode only. |
| `monitor.sources` | array | `["github"]` | Monitoring sources. Accepted values: `github`, `prometheus`, `datadog`, `pagerduty`. |
| `monitor.poll_interval` | number | `30` | Polling interval in seconds for checking new incidents from enabled sources. |
| `monitor.severity_filter` | array | *(all)* | Severity levels to act on. Accepted values: `critical`, `high`, `medium`, `low`. Defaults to all levels if omitted. |
| `monitor.labels` | array | `[]` | GitHub issue labels that trigger incident creation. Example: `["bug", "incident"]`. Leave empty to monitor all issues. |

### governance

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `governance.require_approval` | boolean | `false` | Require manual human approval before merging any PR. |
| `governance.auto_merge` | boolean | `false` | Automatically merge PRs that pass the stability gate. |
| `governance.max_file_changes` | number | `20` | Maximum number of files per PR before flagging for review. |
| `governance.max_line_changes` | number | `500` | Maximum lines changed per PR. PRs exceeding this are blocked. |
| `governance.stability_gate` | boolean | `true` | Enable the stability gate validation step in the pipeline. |
| `governance.test_threshold` | number | `0.8` | Minimum test pass ratio (0.0-1.0). PRs below this threshold are rejected. |
| `governance.rejection_limit` | number | `3` | Maximum rejections before escalating to a human reviewer. |

### agents

Each agent type can be individually configured. All four agent types share the same set of configurable properties.

#### Common Agent Properties

| Key | Type | Description |
|-----|------|-------------|
| `model` | string | Model identifier to use for this agent. Can reference any configured provider model. |
| `temperature` | number | Sampling temperature (0.0-1.0). Lower values produce more deterministic output. |
| `max_tokens` | number | Maximum tokens in the model response. |
| `timeout` | number | Timeout in seconds for a single agent invocation. |
| `tools` | array | List of tools this agent is permitted to use. Example: `["file_read", "search", "shell"]` |
| `enabled` | boolean | Whether this agent type is active. Set to `false` to skip a stage in the pipeline. |

#### Default Agent Configurations

| Agent | model | temperature | max_tokens | timeout |
|-------|-------|-------------|------------|---------|
| `explorer` | `haiku` | `0.1` | `2048` | `60` |
| `planner` | `sonnet` | `0.3` | `4096` | `120` |
| `coder` | `sonnet` | `0.2` | `8192` | `180` |
| `reviewer` | `opus` | `0.0` | `4096` | `120` |

The **Explorer** agent uses the fast tier (Haiku) for rapid read-only search and classification. The **Planner** uses the balanced tier (Sonnet) with higher temperature for creative solution design. The **Coder** uses the balanced tier with lower temperature for precise implementation. The **Reviewer** uses the expert tier (Opus) with zero temperature for thorough, deterministic code review.

Example override:

```yaml
agents:
  explorer:
    model: haiku
    temperature: 0.1
    max_tokens: 2048
    timeout: 60
    enabled: true
  coder:
    model: sonnet
    temperature: 0.2
    max_tokens: 8192
    timeout: 180
    tools:
      - file_read
      - file_write
      - shell
      - search
  reviewer:
    model: opus
    temperature: 0.0
    max_tokens: 4096
    timeout: 120
```

### models

The `models` section defines model tiers and routing rules that map pipeline stages to appropriate model tiers.

#### Tiers

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `models.tiers.fast` | string | `haiku` | Fast tier model. Used for triage and initial classification. Lowest cost. |
| `models.tiers.balanced` | string | `sonnet` | Balanced tier model. Used for investigation and patch generation. |
| `models.tiers.expert` | string | `opus` | Expert tier model. Used for complex fixes and architecture decisions. Highest quality. |

#### Routing

Routing determines which model tier is used at each pipeline stage.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `models.routing.triage` | string | `fast` | Model tier for the triage stage (initial classification). |
| `models.routing.investigation` | string | `balanced` | Model tier for the investigation stage (root-cause analysis). |
| `models.routing.patch_generation` | string | `balanced` | Model tier for the fix stage (code generation). |
| `models.routing.complex_fix` | string | `expert` | Model tier for complex fixes that require architectural reasoning. |

### providers

The `providers` section configures LLM backends. SWE-Squad supports Anthropic, OpenAI, and custom providers.

#### Anthropic (Default)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `providers.anthropic.api_key_env` | string | `ANTHROPIC_API_KEY` | Environment variable name holding the API key. |
| `providers.anthropic.base_url` | string | `https://api.anthropic.com` | API base URL. Override for proxies or enterprise endpoints. |
| `providers.anthropic.default_model` | string | `claude-sonnet-4-6` | Default model when using this provider. |

#### OpenAI

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `providers.openai.api_key_env` | string | `OPENAI_API_KEY` | Environment variable name holding the API key. |
| `providers.openai.base_url` | string | `https://api.openai.com/v1` | API base URL. Override for Azure OpenAI or compatible endpoints. |
| `providers.openai.default_model` | string | `gpt-4o` | Default model when using this provider. |

#### Custom Providers

You can add any OpenAI-compatible provider under `providers.custom`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `providers.custom.<name>.api_key_env` | string | *(none)* | Environment variable name holding the API key. |
| `providers.custom.<name>.base_url` | string | *(none)* | API base URL for the provider endpoint. |
| `providers.custom.<name>.default_model` | string | *(none)* | Default model identifier for this provider. |

#### Provider Selection

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `providers.default` | string | `anthropic` | Default LLM provider. Accepted values: `anthropic`, `openai`, or a custom provider name. |

### remote

The `remote` section configures distributed execution with remote worker processes.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `remote.enabled` | boolean | `false` | Enable distributed remote workers. |
| `remote.workers` | number | `0` | Number of worker processes. Set to `0` for single-process mode. |
| `remote.queue` | string | `redis` | Queue backend for task distribution. Accepted values: `redis`, `sqs`, `memory`. |
| `remote.redis_url` | string | `redis://localhost:6379` | Redis connection URL. Only used when `queue` is `redis`. |
| `remote.timeout` | number | `300` | Worker task timeout in seconds. Tasks exceeding this are killed and retried. |

### integrations

The `integrations` section configures external service notifications and data feeds. All integrations are optional and disabled by default.

#### Slack

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `integrations.slack.webhook_url` | string | *(none)* | Slack incoming webhook URL for posting incident notifications. |

#### PagerDuty

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `integrations.pagerduty.api_key` | string | *(none)* | PagerDuty API key for reading incident data and posting status updates. |

#### Datadog

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `integrations.datadog.api_key` | string | *(none)* | Datadog API key for reading metrics and monitor alerts. |
| `integrations.datadog.app_key` | string | *(none)* | Datadog application key. Required alongside the API key for full API access. |

---

## 3. Provider Configuration

SWE-Squad uses a provider abstraction layer that allows you to swap LLM backends without changing agent configuration. This section explains how to configure each provider and route specific agents to specific models.

### 3.1 Default Provider (Anthropic)

By default, SWE-Squad uses the Anthropic provider with Claude models. The only required secret is `ANTHROPIC_API_KEY`:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

With no provider configuration in `swe_team.yaml`, all agents use Anthropic models through the tier system (Haiku, Sonnet, Opus).

### 3.2 Switching to OpenAI

To use OpenAI as the default provider:

1. Set the `OPENAI_API_KEY` environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

2. Update `swe_team.yaml`:

```yaml
providers:
  default: openai
  openai:
    api_key_env: OPENAI_API_KEY
    base_url: https://api.openai.com/v1
    default_model: gpt-4o
```

All agents will now use OpenAI models unless overridden per-agent.

### 3.3 Custom Provider

To connect a custom or self-hosted LLM endpoint (any OpenAI-compatible API):

```yaml
providers:
  default: my_provider
  custom:
    my_provider:
      api_key_env: MY_CUSTOM_API_KEY
      base_url: https://llm.internal.example.com/v1
      default_model: my-model-v2
```

Set the `MY_CUSTOM_API_KEY` environment variable to your provider's API key. The endpoint must be compatible with the OpenAI Chat Completions API format.

### 3.4 Per-Agent Model Overrides

You can route individual agents to different providers or models regardless of the default provider:

```yaml
providers:
  default: anthropic
  anthropic:
    api_key_env: ANTHROPIC_API_KEY
  openai:
    api_key_env: OPENAI_API_KEY

agents:
  explorer:
    model: haiku           # Uses Anthropic (default provider)
  planner:
    model: gpt-4o          # Uses OpenAI explicitly
  coder:
    model: claude-sonnet-4-6  # Uses Anthropic explicitly
  reviewer:
    model: opus            # Uses Anthropic (default provider)
```

### 3.5 Model Compatibility Notes

- Model names referenced in `agents.*.model` and `models.tiers.*` must match a model identifier available from the configured provider.
- The tier shortcuts (`haiku`, `sonnet`, `opus`) map to Anthropic model families. When using a non-Anthropic default provider, specify full model names instead of tier shortcuts.
- Temperature and token limits are agent-level settings and apply regardless of which provider or model is used.
- If a model is unavailable or returns an error, SWE-Squad will retry with exponential backoff up to the `SWE_MAX_CYCLES` limit before halting.

---

## 4. Example Configurations

### 4.1 Minimal Configuration

The simplest possible configuration. Everything uses defaults except the required project identification.

```yaml
version: 1

project:
  name: my-service
  repository: https://github.com/myorg/my-service
```

This configuration:
- Uses Anthropic as the default provider (requires `ANTHROPIC_API_KEY`)
- Monitors GitHub issues by default
- Uses the default model tiers (Haiku, Sonnet, Opus)
- Runs in single-process mode
- Enables the semantic cache
- Applies default governance settings (stability gate on, no auto-merge)

### 4.2 Full Supabase Configuration

A complete configuration with Supabase persistence, all monitoring sources, governance rules, and per-agent tuning.

```yaml
version: 1

project:
  name: payment-service
  language: typescript
  repository: https://github.com/myorg/payment-service
  branch_prefix: swe-fix/

monitor:
  enabled: true
  sources:
    - github
    - prometheus
    - datadog
  poll_interval: 15
  severity_filter:
    - critical
    - high
  labels:
    - bug
    - incident
    - sre

governance:
  require_approval: false
  auto_merge: true
  max_file_changes: 15
  max_line_changes: 300
  stability_gate: true
  test_threshold: 0.9
  rejection_limit: 3

agents:
  explorer:
    model: haiku
    temperature: 0.1
    max_tokens: 2048
    timeout: 60
    enabled: true
  planner:
    model: sonnet
    temperature: 0.3
    max_tokens: 4096
    timeout: 120
    enabled: true
  coder:
    model: sonnet
    temperature: 0.2
    max_tokens: 8192
    timeout: 180
    enabled: true
  reviewer:
    model: opus
    temperature: 0.0
    max_tokens: 4096
    timeout: 120
    enabled: true

models:
  tiers:
    fast: haiku
    balanced: sonnet
    expert: opus
  routing:
    triage: fast
    investigation: balanced
    patch_generation: balanced
    complex_fix: expert

providers:
  default: anthropic
  anthropic:
    api_key_env: ANTHROPIC_API_KEY
    base_url: https://api.anthropic.com
    default_model: claude-sonnet-4-6

integrations:
  slack:
    webhook_url: https://hooks.slack.com/services/T00/B00/xxx
  datadog:
    api_key: dd-api-key-here
    app_key: dd-app-key-here
```

Corresponding `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
SUPABASE_URL=https://myproject.supabase.co
SUPABASE_ANON_KEY=eyJ...
SWE_TEAM_ID=payment-service-team
SWE_CACHE_ENABLED=true
SWE_CACHE_TTL=3600
```

### 4.3 Multi-Team Configuration

Two teams sharing a single Supabase instance, each with an isolated `SWE_TEAM_ID` to prevent state collisions.

**Team A (backend-api)** -- `swe_team.yaml`:

```yaml
version: 1

project:
  name: backend-api
  language: go
  repository: https://github.com/myorg/backend-api
  branch_prefix: swe-fix/backend-api/

monitor:
  sources:
    - github
    - pagerduty
  severity_filter:
    - critical
    - high
  labels:
    - incident

governance:
  require_approval: true
  auto_merge: false
  stability_gate: true
  test_threshold: 0.85
  rejection_limit: 2

agents:
  coder:
    max_tokens: 8192
    timeout: 240

integrations:
  pagerduty:
    api_key: pd-api-key-team-a
  slack:
    webhook_url: https://hooks.slack.com/services/T00/B00/team-a
```

**Team A** `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
SUPABASE_URL=https://shared.supabase.co
SUPABASE_ANON_KEY=eyJ...
SWE_TEAM_ID=backend-api-team
```

**Team B (frontend-web)** -- `swe_team.yaml`:

```yaml
version: 1

project:
  name: frontend-web
  language: typescript
  repository: https://github.com/myorg/frontend-web
  branch_prefix: swe-fix/frontend-web/

monitor:
  sources:
    - github
    - datadog
  poll_interval: 20
  severity_filter:
    - critical
    - high
    - medium

governance:
  require_approval: false
  auto_merge: true
  stability_gate: true
  test_threshold: 0.8
  max_file_changes: 25

agents:
  explorer:
    max_tokens: 4096
  reviewer:
    model: opus
    max_tokens: 8192

integrations:
  datadog:
    api_key: dd-api-key-team-b
    app_key: dd-app-key-team-b
  slack:
    webhook_url: https://hooks.slack.com/services/T00/B00/team-b
```

**Team B** `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
SUPABASE_URL=https://shared.supabase.co
SUPABASE_ANON_KEY=eyJ...
SWE_TEAM_ID=frontend-web-team
```

Both teams write to the same Supabase instance, but ticket state is isolated by `SWE_TEAM_ID`.

### 4.4 Production with Remote Workers

A production-grade configuration with Redis-backed remote workers, strict governance, and all integrations enabled.

```yaml
version: 1

project:
  name: platform-core
  language: python
  repository: https://github.com/myorg/platform-core
  branch_prefix: swe-fix/

monitor:
  enabled: true
  sources:
    - github
    - prometheus
    - datadog
    - pagerduty
  poll_interval: 10
  severity_filter:
    - critical
    - high
  labels:
    - incident
    - sre
    - oncall

governance:
  require_approval: true
  auto_merge: false
  max_file_changes: 10
  max_line_changes: 200
  stability_gate: true
  test_threshold: 0.95
  rejection_limit: 2

agents:
  explorer:
    model: haiku
    temperature: 0.1
    max_tokens: 2048
    timeout: 45
    enabled: true
  planner:
    model: sonnet
    temperature: 0.2
    max_tokens: 4096
    timeout: 90
    enabled: true
  coder:
    model: sonnet
    temperature: 0.1
    max_tokens: 8192
    timeout: 120
    enabled: true
    tools:
      - file_read
      - file_write
      - shell
      - search
      - test_runner
  reviewer:
    model: opus
    temperature: 0.0
    max_tokens: 8192
    timeout: 90
    enabled: true

models:
  tiers:
    fast: haiku
    balanced: sonnet
    expert: opus
  routing:
    triage: fast
    investigation: balanced
    patch_generation: balanced
    complex_fix: expert

providers:
  default: anthropic
  anthropic:
    api_key_env: ANTHROPIC_API_KEY
    base_url: https://api.anthropic.com
    default_model: claude-sonnet-4-6

remote:
  enabled: true
  workers: 4
  queue: redis
  redis_url: redis://redis.internal:6379
  timeout: 300

integrations:
  slack:
    webhook_url: https://hooks.slack.com/services/T00/B00/prod-incidents
  pagerduty:
    api_key: pd-prod-api-key
  datadog:
    api_key: dd-prod-api-key
    app_key: dd-prod-app-key
```

Corresponding `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
SUPABASE_URL=https://platform.supabase.co
SUPABASE_ANON_KEY=eyJ...
SWE_TEAM_ID=platform-core-prod
SWE_MODEL=claude-sonnet-4-6
SWE_MAX_CYCLES=8
SWE_LOG_LEVEL=WARNING
SWE_DOCKER_ENABLED=true
SWE_POLL_INTERVAL=10
SWE_WEBHOOK_SECRET=whsec_...
SWE_DASHBOARD_PORT=8080
SWE_CACHE_ENABLED=true
SWE_CACHE_TTL=7200
SWE_REMOTE_WORKERS=4
```

This production configuration features:
- **Strict governance**: Manual approval required, high test threshold (95%), low change limits
- **All monitoring sources**: GitHub, Prometheus, Datadog, and PagerDuty
- **Remote workers**: Four workers backed by Redis for parallel incident processing
- **Docker sandboxing**: Agent tool calls are sandboxed for security
- **All integrations**: Slack notifications, PagerDuty sync, and Datadog metric ingestion
- **Aggressive caching**: 2-hour TTL to maximize reuse of previously resolved patterns
