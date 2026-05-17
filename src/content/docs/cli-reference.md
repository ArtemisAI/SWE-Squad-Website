---
title: CLI Reference
description: Command-line interface reference for SWE-Squad
section: Reference
order: 2
---

# CLI Reference

SWE-Squad provides a command-line interface for running fix cycles, checking status, and managing configuration.

## Global Options

| Flag | Description |
|------|-------------|
| `--help` | Show help message and exit |
| `--version` | Print version and exit |
| `--verbose` | Enable verbose logging |
| `--config PATH` | Path to `swe_team.yaml` (default: `./swe_team.yaml`) |

## Commands

### swe-squad bootstrap

Initialize the ticket store and verify all connections.

```bash
python3 -m swe_squad bootstrap
```

### swe-squad cycle

Run a single fix cycle for the highest-priority open ticket.

```bash
python3 -m swe_squad cycle
```

| Flag | Description |
|------|-------------|
| `--ticket ID` | Process a specific ticket instead of the highest priority |
| `--dry-run` | Show what would be done without making changes |

### swe-squad daemon

Continuously poll for and process tickets.

```bash
python3 -m swe_squad daemon [OPTIONS]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--poll-interval SECONDS` | `60` | Time between polling cycles |
| `--max-cycles N` | unlimited | Stop after N cycles |
| `--team-id TEAM` | default | Process tickets for a specific team |

### swe-squad status

Display current system status including connected services, active tickets, and recent results.

```bash
python3 -m swe_squad status
```

### swe-squad config

Validate and display the current configuration.

```bash
python3 -m swe_squad config
```

| Flag | Description |
|------|-------------|
| `--validate` | Validate configuration and exit |
| `--show-secrets` | Display configured API keys (masked) |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Configuration error |
| `3` | Authentication error |
| `4` | Connection error |
