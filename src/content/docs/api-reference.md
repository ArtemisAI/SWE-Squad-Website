---
title: API Reference
description: Complete API reference for SWE-Squad CLI, Dashboard, A2A protocol, and Webhooks
section: API
order: 1
---

# API Reference

This page provides a complete API reference for all programmatic interfaces in SWE-Squad: the CLI commands, the Dashboard Data API, the Agent-to-Agent (A2A) protocol, and the Webhook Listener.

---

## 1. SWE-CLI Command Reference

The `swe` command-line tool provides incident management, ticket operations, and reporting. All subcommands accept a `--format` flag to control output rendering.

### Global Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format` | string | `table` | Output format. Accepted values: `table`, `json`, `csv`. |
| `--team` | string | `$SWE_TEAM_ID` | Team ID to scope the operation. Overrides the `SWE_TEAM_ID` environment variable. |
| `--no-color` | boolean | `false` | Disable colored output. Useful for piping or CI environments. |
| `--help` | boolean | `false` | Show help text and exit. |

---

### `swe status`

Show real-time system status including active agents, queue depth, and recent activity.

**Syntax:**

```bash
swe status [flags]
```

**Flags:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--watch` | boolean | `false` | Continuously refresh status every 5 seconds. |
| `--refresh-interval` | number | `5` | Refresh interval in seconds when `--watch` is set. |

**Example:**

```bash
$ swe status

System Status: healthy
Active Agents:    3  (explorer, planner, coder)
Queue Depth:      2 tickets pending
Uptime:           14h 23m

Recent Activity (last 10 minutes):
  14:32:01  INC-042  fix.completed     Coder agent submitted patch
  14:28:15  INC-042  fix.started       Planner selected strategy
  14:25:40  INC-041  ticket.resolved   Fix merged to main
  14:20:03  INC-043  ticket.created    DB connection timeout (critical)
```

**JSON output:**

```bash
$ swe status --format json
```

```json
{
  "status": "healthy",
  "active_agents": ["explorer", "planner", "coder"],
  "queue_depth": 2,
  "uptime_seconds": 51780,
  "recent_activity": [
    {"timestamp": "2026-05-16T14:32:01Z", "ticket": "INC-042", "event": "fix.completed"},
    {"timestamp": "2026-05-16T14:28:15Z", "ticket": "INC-042", "event": "fix.started"},
    {"timestamp": "2026-05-16T14:25:40Z", "ticket": "INC-041", "event": "ticket.resolved"}
  ]
}
```

---

### `swe tickets`

List, inspect, create, and close tickets.

**Syntax:**

```bash
swe tickets list   [flags]
swe tickets show   <ticket-id> [flags]
swe tickets create --title <title> --body <body> [flags]
swe tickets close  <ticket-id> --reason <reason> [flags]
```

**Subcommands and Flags:**

| Subcommand | Flags | Description |
|------------|-------|-------------|
| `list` | `--status`, `--severity`, `--limit`, `--sort` | List tickets with optional filters. |
| `show` | *(positional: ticket-id)* | Display full ticket detail including fix history. |
| `create` | `--title` (required), `--body` (required), `--severity` | Create a new ticket manually. |
| `close` | `--reason` (required) | Close a ticket with a human-supplied reason. |

**Filter flags for `list`:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--status` | string | *(all)* | Filter by status: `open`, `in_progress`, `resolved`, `closed`. |
| `--severity` | string | *(all)* | Filter by severity: `critical`, `high`, `medium`, `low`. |
| `--limit` | number | `20` | Maximum number of tickets to return. |
| `--sort` | string | `created_desc` | Sort order. Accepted values: `created_desc`, `created_asc`, `severity`. |

**Example:**

```bash
$ swe tickets list --severity critical --limit 5

TICKET   TITLE                        SEVERITY   STATUS        CREATED
INC-043  DB connection timeout         critical   open          3m ago
INC-037  Payment gateway 502 errors    critical   in_progress   1h ago
INC-029  Auth service crash loop       critical   resolved      1d ago
```

```bash
$ swe tickets create \
  --title "API latency spike on /v2/orders" \
  --body "P99 latency exceeded 5s threshold starting at 14:00 UTC." \
  --severity high

Created ticket INC-044
```

```bash
$ swe tickets show INC-043

Ticket:     INC-043
Title:      DB connection timeout
Severity:   critical
Status:     open
Created:    2026-05-16 14:20:03 UTC
Source:     prometheus alert

Fix History:
  (no fix attempts yet)

Assigned Agents: (pending assignment)
```

---

### `swe issues`

Sync and browse GitHub issues linked to the configured repository.

**Syntax:**

```bash
swe issues sync  [flags]
swe issues list  [flags]
swe issues show  <issue-number> [flags]
```

**Subcommands and Flags:**

| Subcommand | Flags | Description |
|------------|-------|-------------|
| `sync` | `--full` | Fetch latest issues from GitHub. Use `--full` to re-sync entire issue history. |
| `list` | `--labels`, `--state`, `--limit` | Browse locally cached issues with filters. |
| `show` | *(positional: issue-number)* | Show issue body, comments, and linked ticket status. |

**Filter flags for `list`:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--labels` | string | *(all)* | Comma-separated GitHub labels to filter on. Example: `bug,incident`. |
| `--state` | string | `open` | Issue state: `open`, `closed`, `all`. |
| `--limit` | number | `20` | Maximum issues to return. |

**Example:**

```bash
$ swe issues sync
Synced 14 issues from myorg/payment-service

$ swe issues list --labels bug,incident --limit 10

ISSUE   TITLE                         LABELS            STATE   LINKED TICKET
#127    Memory leak in order worker    bug, incident     open    INC-043
#124    Stale cache on product API     bug               open    (none)
#119    Retry storm on DB failover     incident          closed  INC-037
```

---

### `swe repos`

Manage repository registrations for the current team.

**Syntax:**

```bash
swe repos add     <repo-url> [flags]
swe repos remove  <repo-url> [flags]
swe repos list    [flags]
```

**Subcommands and Flags:**

| Subcommand | Flags | Description |
|------------|-------|-------------|
| `add` | `--branch-prefix` | Register a repository for monitoring. Defaults to `swe-fix/`. |
| `remove` | *(positional: repo-url)* | Unregister a repository. |
| `list` | *(none)* | Show all registered repositories and their status. |

**Example:**

```bash
$ swe repos add https://github.com/myorg/payment-service --branch-prefix fix/
Registered myorg/payment-service (branch prefix: fix/)

$ swe repos list

REPOSITORY                           BRANCH PREFIX   STATUS   LAST SYNC
myorg/payment-service                fix/            active   2m ago
myorg/frontend-web                   swe-fix/        active   5m ago
myorg/platform-core                  swe-fix/        active   1h ago
```

---

### `swe summary`

Generate summary reports for ticket activity, agent performance, and resolution trends.

**Syntax:**

```bash
swe summary daily   [--date <YYYY-MM-DD>] [flags]
swe summary weekly  [--week <YYYY-WNN>] [flags]
swe summary agent   [--agent <name>] [--period <days>] [flags]
```

**Subcommands and Flags:**

| Subcommand | Flags | Description |
|------------|-------|-------------|
| `daily` | `--date` | Daily summary. Defaults to today. |
| `weekly` | `--week` | Weekly summary. Format: `2026-W20`. Defaults to current week. |
| `agent` | `--agent`, `--period` | Agent performance breakdown. `--period` defaults to 7 days. |

**Example:**

```bash
$ swe summary daily --date 2026-05-16

Daily Summary — 2026-05-16

Tickets Created:     8
Tickets Resolved:    5
Tickets In Progress: 3

Mean Resolution Time:  23m 14s
Median Resolution Time: 18m 02s

Agent Invocations:
  Explorer:  12 calls  (avg 4.1s)
  Planner:    8 calls  (avg 11.3s)
  Coder:      8 calls  (avg 34.7s)
  Reviewer:   5 calls  (avg 18.2s)

Stability Gate:
  Passed: 5/5  (100%)
  Rejected: 0
```

```bash
$ swe summary agent --agent coder --period 14

Agent Performance — coder (last 14 days)

Total Invocations:   62
Avg Response Time:   31.4s
Success Rate:        91.9%  (57 pass / 5 fail)
Avg Tokens Used:     4,218
Total Token Cost:    $12.47

Most Common Tools:
  file_write   48 uses
  file_read    62 uses
  shell        31 uses
  search       27 uses
```

---

### `swe report`

Export detailed reports in JSON, CSV, or Markdown format. Designed for scripting and integration with external tools.

**Syntax:**

```bash
swe report --type <type> --from <date> --to <date> --format <format> [flags]
```

**Flags:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--type` | string | *(required)* | Report type: `tickets`, `agents`, `performance`, `full`. |
| `--from` | string | *(required)* | Start date in `YYYY-MM-DD` format. |
| `--to` | string | *(required)* | End date in `YYYY-MM-DD` format. |
| `--format` | string | `json` | Output format: `json`, `csv`, `markdown`. |
| `--output` | string | *(stdout)* | Write output to a file instead of stdout. |

**Example:**

```bash
$ swe report \
  --type tickets \
  --from 2026-05-09 \
  --to 2026-05-16 \
  --format csv \
  --output weekly-tickets.csv

Exported 43 tickets to weekly-tickets.csv
```

```bash
$ swe report --type performance --from 2026-05-01 --to 2026-05-16 --format json
```

```json
{
  "period": {"from": "2026-05-01", "to": "2026-05-16"},
  "tickets": {"created": 87, "resolved": 74, "open": 13},
  "resolution_time": {"mean_seconds": 1342, "median_seconds": 891},
  "stability_gate": {"pass_rate": 0.946, "total_checks": 74, "passed": 70, "rejected": 4},
  "agents": {
    "explorer": {"invocations": 156, "avg_latency_ms": 4100},
    "planner":  {"invocations": 98,  "avg_latency_ms": 11300},
    "coder":    {"invocations": 98,  "avg_latency_ms": 34700},
    "reviewer": {"invocations": 74,  "avg_latency_ms": 18200}
  }
}
```

---

## 2. Dashboard Data API

The SWE-Squad dashboard is backed by a Python-based API server (`dashboard_data.py`) that serves JSON endpoints for metrics, ticket data, and agent status. The server runs on the port specified by `SWE_DASHBOARD_PORT` (default `8080`).

### Base URL and Authentication

- **Base URL:** `http://localhost:<SWE_DASHBOARD_PORT>/api/dashboard`
- **Authentication:** Bearer token via the `Authorization` header.

```bash
curl -H "Authorization: Bearer $SWE_DASHBOARD_TOKEN" \
  http://localhost:8080/api/dashboard/overview
```

The dashboard token is auto-generated on startup and written to `$HOME/.swe-dashboard-token` unless `SWE_DASHBOARD_TOKEN` is set explicitly in the environment.

---

### `GET /api/dashboard/overview`

Return system-level overview metrics.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `24h` | Aggregation window. Accepted values: `1h`, `24h`, `7d`, `30d`. |

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | System health status: `healthy`, `degraded`, `down`. |
| `tickets_open` | number | Currently open tickets. |
| `tickets_in_progress` | number | Tickets actively being worked on. |
| `tickets_resolved_period` | number | Tickets resolved within the aggregation window. |
| `mean_resolution_seconds` | number | Mean time to resolution in seconds. |
| `active_agents` | array | List of currently running agent identifiers. |
| `queue_depth` | number | Number of tickets waiting for agent assignment. |

**Example:**

```json
{
  "status": "healthy",
  "tickets_open": 3,
  "tickets_in_progress": 2,
  "tickets_resolved_period": 14,
  "mean_resolution_seconds": 892,
  "active_agents": ["explorer", "coder", "reviewer"],
  "queue_depth": 1
}
```

---

### `GET /api/dashboard/tickets`

List tickets with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | *(all)* | Filter by status: `open`, `in_progress`, `resolved`, `closed`. |
| `severity` | string | *(all)* | Filter by severity: `critical`, `high`, `medium`, `low`. |
| `limit` | number | `20` | Maximum results per page. |
| `offset` | number | `0` | Pagination offset. |
| `sort` | string | `created_desc` | Sort order: `created_desc`, `created_asc`, `severity`, `updated_desc`. |

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `tickets` | array | Array of ticket objects. |
| `tickets[].id` | string | Ticket identifier (e.g. `INC-043`). |
| `tickets[].title` | string | Ticket title. |
| `tickets[].severity` | string | Severity level. |
| `tickets[].status` | string | Current status. |
| `tickets[].created_at` | string | ISO 8601 timestamp. |
| `tickets[].updated_at` | string | ISO 8601 timestamp. |
| `tickets[].assigned_agent` | string or null | Currently assigned agent, if any. |
| `total` | number | Total matching tickets (for pagination). |
| `limit` | number | Applied limit. |
| `offset` | number | Applied offset. |

**Example:**

```bash
curl "http://localhost:8080/api/dashboard/tickets?severity=critical&limit=3"
```

```json
{
  "tickets": [
    {
      "id": "INC-043",
      "title": "DB connection timeout",
      "severity": "critical",
      "status": "open",
      "created_at": "2026-05-16T14:20:03Z",
      "updated_at": "2026-05-16T14:20:03Z",
      "assigned_agent": null
    },
    {
      "id": "INC-037",
      "title": "Payment gateway 502 errors",
      "severity": "critical",
      "status": "in_progress",
      "created_at": "2026-05-16T13:01:44Z",
      "updated_at": "2026-05-16T14:28:15Z",
      "assigned_agent": "coder"
    }
  ],
  "total": 2,
  "limit": 3,
  "offset": 0
}
```

---

### `GET /api/dashboard/tickets/:id`

Retrieve full detail for a single ticket, including fix history and agent assignments.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Ticket identifier (e.g. `INC-043`). |

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Ticket identifier. |
| `title` | string | Ticket title. |
| `body` | string | Full ticket description. |
| `severity` | string | Severity level. |
| `status` | string | Current status. |
| `source` | string | Origin of the ticket (e.g. `github`, `prometheus`, `manual`). |
| `created_at` | string | ISO 8601 creation timestamp. |
| `updated_at` | string | ISO 8601 last-update timestamp. |
| `resolved_at` | string or null | ISO 8601 resolution timestamp, if resolved. |
| `assigned_agents` | array | Ordered list of agents that have been assigned. |
| `fix_history` | array | Array of fix attempt objects. |
| `fix_history[].attempt` | number | Fix attempt number (1-indexed). |
| `fix_history[].agent` | string | Agent that produced this fix. |
| `fix_history[].status` | string | Result: `passed`, `failed`, `escalated`. |
| `fix_history[].started_at` | string | ISO 8601 timestamp. |
| `fix_history[].completed_at` | string | ISO 8601 timestamp. |
| `fix_history[].failure_reason` | string or null | Reason for failure, if applicable. |
| `stability_gate` | object or null | Gate results if a fix was validated. |
| `stability_gate.passed` | boolean | Whether all stages passed. |
| `stability_gate.stages` | array | Per-stage pass/fail results. |

**Example:**

```bash
curl http://localhost:8080/api/dashboard/tickets/INC-041
```

```json
{
  "id": "INC-041",
  "title": "Redis connection pool exhaustion",
  "body": "Connection pool reached max capacity under sustained load...",
  "severity": "high",
  "status": "resolved",
  "source": "prometheus",
  "created_at": "2026-05-16T12:05:22Z",
  "updated_at": "2026-05-16T14:25:40Z",
  "resolved_at": "2026-05-16T14:25:40Z",
  "assigned_agents": ["explorer", "planner", "coder", "reviewer"],
  "fix_history": [
    {
      "attempt": 1,
      "agent": "coder",
      "status": "passed",
      "started_at": "2026-05-16T14:10:00Z",
      "completed_at": "2026-05-16T14:24:18Z",
      "failure_reason": null
    }
  ],
  "stability_gate": {
    "passed": true,
    "stages": [
      {"name": "syntax_check", "passed": true},
      {"name": "unit_tests", "passed": true},
      {"name": "lint", "passed": true},
      {"name": "type_check", "passed": true},
      {"name": "security_scan", "passed": true},
      {"name": "regression_test", "passed": true},
      {"name": "scope_check", "passed": true},
      {"name": "confidence_score", "passed": true, "score": 0.94}
    ]
  }
}
```

---

### `GET /api/dashboard/agents`

Return status and recent invocation history for all agents.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `24h` | History window: `1h`, `24h`, `7d`, `30d`. |
| `agent` | string | *(all)* | Filter to a specific agent name. |

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `agents` | array | Array of agent status objects. |
| `agents[].name` | string | Agent identifier (e.g. `explorer`). |
| `agents[].status` | string | `idle`, `busy`, or `error`. |
| `agents[].current_ticket` | string or null | Ticket the agent is currently working on. |
| `agents[].invocations_period` | number | Total invocations in the period. |
| `agents[].avg_latency_ms` | number | Average invocation latency. |
| `agents[].success_rate` | number | Success rate as a decimal (0.0-1.0). |
| `agents[].last_active` | string | ISO 8601 timestamp of last activity. |

**Example:**

```json
{
  "agents": [
    {
      "name": "explorer",
      "status": "idle",
      "current_ticket": null,
      "invocations_period": 12,
      "avg_latency_ms": 4100,
      "success_rate": 1.0,
      "last_active": "2026-05-16T14:25:40Z"
    },
    {
      "name": "coder",
      "status": "busy",
      "current_ticket": "INC-042",
      "invocations_period": 8,
      "avg_latency_ms": 34700,
      "success_rate": 0.875,
      "last_active": "2026-05-16T14:32:01Z"
    }
  ]
}
```

---

### `GET /api/dashboard/metrics`

Return aggregated performance metrics and resolution trends.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `7d` | Trend window: `1d`, `7d`, `30d`. |
| `granularity` | string | `1h` | Data point spacing: `1h`, `6h`, `1d`. |

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `period` | string | Requested period. |
| `resolution_time` | object | Resolution time statistics. |
| `resolution_time.mean_seconds` | number | Mean time to resolution. |
| `resolution_time.median_seconds` | number | Median time to resolution. |
| `resolution_time.p95_seconds` | number | 95th percentile resolution time. |
| `throughput` | object | Ticket throughput counts. |
| `throughput.created` | number | Tickets created in the period. |
| `throughput.resolved` | number | Tickets resolved in the period. |
| `throughput.escalated` | number | Tickets escalated to humans. |
| `stability_gate_pass_rate` | number | Overall gate pass rate (0.0-1.0). |
| `trend` | array | Time-series data points. Each entry has `timestamp`, `tickets_created`, `tickets_resolved`, `avg_resolution_seconds`. |

**Example:**

```json
{
  "period": "7d",
  "resolution_time": {
    "mean_seconds": 1342,
    "median_seconds": 891,
    "p95_seconds": 3420
  },
  "throughput": {
    "created": 87,
    "resolved": 74,
    "escalated": 4
  },
  "stability_gate_pass_rate": 0.946,
  "trend": [
    {"timestamp": "2026-05-09T00:00:00Z", "tickets_created": 11, "tickets_resolved": 9, "avg_resolution_seconds": 1210},
    {"timestamp": "2026-05-10T00:00:00Z", "tickets_created": 14, "tickets_resolved": 12, "avg_resolution_seconds": 980}
  ]
}
```

---

### `GET /api/dashboard/activity`

Return a reverse-chronological feed of recent system events.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `50` | Maximum events to return. |
| `ticket` | string | *(all)* | Filter events to a specific ticket ID. |
| `event_type` | string | *(all)* | Filter by event type (e.g. `fix.completed`). |

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `events` | array | Array of event objects. |
| `events[].id` | string | Unique event identifier. |
| `events[].timestamp` | string | ISO 8601 timestamp. |
| `events[].event_type` | string | Event type (see A2A event types). |
| `events[].ticket_id` | string | Associated ticket. |
| `events[].agent` | string or null | Agent that triggered the event. |
| `events[].details` | object | Event-specific metadata. |

**Example:**

```json
{
  "events": [
    {
      "id": "evt-8a2f",
      "timestamp": "2026-05-16T14:32:01Z",
      "event_type": "fix.completed",
      "ticket_id": "INC-042",
      "agent": "coder",
      "details": {"files_changed": 3, "lines_added": 47, "lines_removed": 12}
    },
    {
      "id": "evt-7b1e",
      "timestamp": "2026-05-16T14:28:15Z",
      "event_type": "fix.started",
      "ticket_id": "INC-042",
      "agent": "coder",
      "details": {"strategy": "increase_pool_size"}
    }
  ]
}
```

---

## 3. A2A Protocol Reference

The Agent-to-Agent (A2A) protocol governs communication between specialized SWE-Squad agents (Explorer, Planner, Coder, Reviewer) and the central hub. It uses JSON-RPC 2.0 as the message format.

### JSON-RPC 2.0 Message Format

All A2A messages follow the JSON-RPC 2.0 specification with three patterns:

**Request:**

```json
{
  "jsonrpc": "2.0",
  "method": "ticket.assign",
  "params": {"ticket_id": "INC-043", "agent": "explorer"},
  "id": 1
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {"status": "assigned", "ticket_id": "INC-043"},
  "id": 1
}
```

**Notification (no response expected):**

```json
{
  "jsonrpc": "2.0",
  "method": "event.emit",
  "params": {"event_type": "fix.started", "ticket_id": "INC-043"}
}
```

**Error Response:**

```json
{
  "jsonrpc": "2.0",
  "error": {"code": -32600, "message": "Invalid params: missing ticket_id"},
  "id": 1
}
```

Standard error codes: `-32700` (parse error), `-32600` (invalid request), `-32601` (method not found), `-32602` (invalid params), `-32603` (internal error).

---

### Event Types

Events represent state transitions in the ticket lifecycle. Each event carries a typed payload.

| Event Type | Trigger | Payload Fields |
|------------|---------|----------------|
| `ticket.created` | New ticket enters the system | `ticket_id`, `title`, `severity`, `source` |
| `ticket.assigned` | Agent is assigned to a ticket | `ticket_id`, `agent`, `assigned_by` |
| `fix.started` | Agent begins generating a fix | `ticket_id`, `agent`, `strategy` |
| `fix.completed` | Agent submits a proposed fix | `ticket_id`, `agent`, `files_changed`, `lines_added`, `lines_removed` |
| `review.requested` | Fix is sent to the reviewer agent | `ticket_id`, `reviewer`, `fix_attempt` |
| `review.completed` | Reviewer finishes evaluating a fix | `ticket_id`, `reviewer`, `approved`, `issues` |
| `ticket.resolved` | Ticket is fully resolved and closed | `ticket_id`, `resolved_by`, `merge_sha` |

**Example event payloads:**

```json
{
  "event_type": "ticket.created",
  "ticket_id": "INC-043",
  "title": "DB connection timeout",
  "severity": "critical",
  "source": "prometheus",
  "timestamp": "2026-05-16T14:20:03Z"
}
```

```json
{
  "event_type": "fix.completed",
  "ticket_id": "INC-042",
  "agent": "coder",
  "files_changed": 3,
  "lines_added": 47,
  "lines_removed": 12,
  "timestamp": "2026-05-16T14:32:01Z"
}
```

```json
{
  "event_type": "review.completed",
  "ticket_id": "INC-042",
  "reviewer": "reviewer",
  "approved": true,
  "issues": [],
  "timestamp": "2026-05-16T14:35:18Z"
}
```

```json
{
  "event_type": "ticket.resolved",
  "ticket_id": "INC-041",
  "resolved_by": "auto",
  "merge_sha": "a1b2c3d4e5f6",
  "timestamp": "2026-05-16T14:25:40Z"
}
```

---

### Agent Card Schema

Each agent publishes a card describing its capabilities, endpoints, and authentication requirements. Cards are used for agent discovery and registration.

**Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | string | Unique agent identifier (e.g. `explorer`, `coder`). |
| `name` | string | Human-readable agent name. |
| `version` | string | Agent version string. |
| `description` | string | Short description of agent capabilities. |
| `capabilities` | array | List of capability strings (e.g. `file_read`, `search`, `shell`). |
| `endpoint` | string | URL where the agent accepts JSON-RPC requests. |
| `authentication` | object | Auth configuration for the agent endpoint. |
| `authentication.type` | string | Auth method: `bearer`, `api_key`, or `none`. |
| `authentication.header` | string | Header name for the auth token (e.g. `Authorization`). |
| `metadata` | object | Additional key-value metadata. |

**Example agent card:**

```json
{
  "agent_id": "coder",
  "name": "Coder Agent",
  "version": "2.1.0",
  "description": "Implements code changes based on planned fix strategies.",
  "capabilities": ["file_read", "file_write", "shell", "search", "test_runner"],
  "endpoint": "http://localhost:8081/a2a/agents/coder",
  "authentication": {
    "type": "bearer",
    "header": "Authorization"
  },
  "metadata": {
    "model": "claude-sonnet-4-6",
    "temperature": 0.2,
    "max_tokens": 8192
  }
}
```

---

### Hub API Endpoints

The A2A hub coordinates agent communication and event dispatch.

#### `POST /a2a/dispatch`

Dispatch a task or message to a specific agent.

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `jsonrpc` | string | Must be `"2.0"`. |
| `method` | string | Method to invoke on the target agent. |
| `params` | object | Method parameters. |
| `target` | string | Target agent identifier. |

**Example:**

```bash
curl -X POST http://localhost:8080/a2a/dispatch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "investigate",
    "params": {"ticket_id": "INC-043", "context": {"repository": "myorg/payment-service"}},
    "target": "explorer",
    "id": 42
  }'
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "accepted",
    "task_id": "task-9e4a",
    "agent": "explorer"
  },
  "id": 42
}
```

#### `GET /a2a/agents/:id/card`

Retrieve the agent card for a registered agent.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Agent identifier. |

**Example:**

```bash
curl http://localhost:8080/a2a/agents/coder/card \
  -H "Authorization: Bearer $TOKEN"
```

Returns the agent card JSON object (see Agent Card Schema above).

#### `GET /a2a/events`

Stream or poll recent A2A events.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `since` | string | *(all)* | ISO 8601 timestamp. Only return events after this time. |
| `event_type` | string | *(all)* | Filter to a specific event type. |
| `ticket_id` | string | *(all)* | Filter to events for a specific ticket. |
| `limit` | number | `100` | Maximum events to return. |

**Example:**

```bash
curl "http://localhost:8080/a2a/events?since=2026-05-16T14:00:00Z&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "events": [
    {
      "id": "evt-8a2f",
      "event_type": "fix.completed",
      "ticket_id": "INC-042",
      "agent": "coder",
      "timestamp": "2026-05-16T14:32:01Z",
      "payload": {"files_changed": 3, "lines_added": 47, "lines_removed": 12}
    }
  ],
  "has_more": true,
  "next_cursor": "evt-8a2f"
}
```

#### `POST /a2a/events/:id/ack`

Acknowledge that an event has been processed. Required for events that require explicit confirmation.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Event identifier to acknowledge. |

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"processed"` or `"failed"`. |
| `details` | object | Optional metadata about the processing result. |

**Example:**

```bash
curl -X POST http://localhost:8080/a2a/events/evt-8a2f/ack \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "processed", "details": {"reviewer": "reviewer", "approved": true}}'
```

**Response:**

```json
{
  "acknowledged": true,
  "event_id": "evt-8a2f",
  "timestamp": "2026-05-16T14:36:00Z"
}
```

---

## 4. Webhook Listener API

SWE-Squad can receive incoming webhooks from GitHub to trigger incident creation on push, issue, and pull request events. Webhooks are validated using HMAC signatures.

### `POST /webhooks/github`

The primary endpoint for receiving GitHub webhook deliveries.

**Authentication:**

Every request is validated against the `X-Hub-Signature-256` header using HMAC-SHA256 with the `SWE_WEBHOOK_SECRET` configured in your environment.

```
X-Hub-Signature-256: sha256=<hex-digest>
```

Validation steps:
1. Read the raw request body.
2. Compute `HMAC-SHA256(raw_body, SWE_WEBHOOK_SECRET)`.
3. Compare the hex digest to the value in the `X-Hub-Signature-256` header using a constant-time comparison.
4. Reject with `401` if the signatures do not match.

### Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | Accepted | Payload validated and queued for processing. |
| `401` | Unauthorized | Invalid or missing HMAC signature. |
| `400` | Bad Request | Payload could not be parsed or is missing required fields. |

### Supported Event Types

The webhook listener handles the following GitHub event types, determined by the `X-GitHub-Event` header:

| `X-GitHub-Event` | Trigger |
|-------------------|---------|
| `push` | Code pushed to any branch. |
| `issues` | Issue opened, edited, closed, or reopened. |
| `pull_request` | PR opened, closed, merged, or synchronized. |

### Payload Schemas

#### Push Event

```json
{
  "ref": "refs/heads/main",
  "before": "a1b2c3d4e5f6",
  "after": "f6e5d4c3b2a1",
  "repository": {
    "full_name": "myorg/payment-service",
    "html_url": "https://github.com/myorg/payment-service"
  },
  "sender": {
    "login": "ci-bot"
  },
  "commits": [
    {
      "id": "f6e5d4c3b2a1",
      "message": "fix: increase connection pool size",
      "author": {"name": "SWE-Squad Coder Agent"},
      "added": [],
      "removed": [],
      "modified": ["src/db/pool.py", "src/config.py", "tests/test_pool.py"]
    }
  ]
}
```

#### Issues Event

```json
{
  "action": "opened",
  "issue": {
    "number": 127,
    "title": "Memory leak in order worker",
    "body": "The order worker process grows to 4GB RSS under sustained load...",
    "state": "open",
    "labels": [{"name": "bug"}, {"name": "incident"}],
    "created_at": "2026-05-16T14:45:00Z"
  },
  "repository": {
    "full_name": "myorg/payment-service"
  },
  "sender": {
    "login": "oncall-engineer"
  }
}
```

#### Pull Request Event

```json
{
  "action": "closed",
  "pull_request": {
    "number": 84,
    "title": "fix: resolve Redis connection pool exhaustion (INC-041)",
    "body": "Automated fix generated by SWE-Squad Coder Agent.\n\nIncreases pool max size and adds idle timeout.",
    "state": "closed",
    "merged": true,
    "merge_commit_sha": "a1b2c3d4e5f6",
    "base": {"ref": "main"},
    "head": {"ref": "swe-fix/ticket-inc041"}
  },
  "repository": {
    "full_name": "myorg/payment-service"
  },
  "sender": {
    "login": "swe-squad-bot"
  }
}
```

### Retry Behavior

When the webhook listener returns a non-200 response, the caller should retry delivery with the following policy:

| Attempt | Delay |
|---------|-------|
| 1st retry | 5 seconds |
| 2nd retry | 25 seconds |
| 3rd retry | 125 seconds |

After 3 failed attempts (4 total deliveries), the webhook is logged as permanently failed and an alert is emitted to the configured notification channels. Retries use exponential backoff with a base of 5 seconds.

### Example: Validating a Webhook in Python

```python
import hmac
import hashlib

def validate_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```
