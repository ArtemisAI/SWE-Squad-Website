---
title: Architecture
description: Understanding the SWE-Squad architecture
section: Core Concepts
order: 1
---

# Architecture

SWE-Squad automates the entire incident lifecycle through a pipeline of specialized agents, iterative feedback loops, and a semantic memory system. This guide covers every major subsystem and how they fit together.

For interactive Mermaid diagrams of the full pipeline, fix loop, semantic memory, and provider plugin architecture, see the **[Architecture Page](/architecture)**.

## Pipeline Overview

SWE-Squad processes incidents through a five-stage pipeline. Each stage is responsible for a specific concern, from raw log ingestion all the way to validated deployment:

```
Monitor --> Triage --> Investigate --> Fix --> Stability Gate --> Deploy
```

| Stage | Purpose |
|---|---|
| **Monitor** | Ingest logs and metrics, detect anomalous patterns, generate structured alerts |
| **Triage** | Classify alerts by severity, deduplicate recurring issues, assign to agents |
| **Investigate** | Explore the codebase, perform root-cause analysis, assemble fix context |
| **Fix** | Generate targeted code patches, produce tests, run self-review |
| **Stability Gate** | Validate fixes through unit tests, lint, type check, security scan, smoke tests |

Fixes that pass the Stability Gate are deployed. Fixes that fail loop back to the Investigate stage with failure context, giving the agent a chance to correct its approach.

## Agent Roles

SWE-Squad deploys specialized agents at each pipeline stage. Each agent has a defined role, specific inputs and outputs, and decision logic that governs its behavior.

### Monitor Agent

Continuously ingests logs, metrics, and error signals from production systems.

- **Inputs:** Raw log streams, metric thresholds, alert rules
- **Outputs:** Structured alerts with severity hints
- **Decision logic:** Anomaly detection via pattern matching against known signatures and statistical baselines

### Triage Agent

Classifies each alert by severity and deduplicates against active incidents.

- **Inputs:** Structured alerts from the Monitor Agent
- **Outputs:** Classified, deduplicated incident tickets
- **Decision logic:** Severity scored by error category, blast radius, and user impact; duplicates detected via semantic similarity against open tickets

### Investigator Agent

Performs deep root-cause analysis by exploring the codebase and tracing error paths.

- **Inputs:** Classified incident ticket, codebase access, commit history, semantic memory
- **Outputs:** Root cause summary, relevant file list, context window for fix generation
- **Decision logic:** Follows call-stack traces, identifies recent commits touching failing paths, and cross-references with historical fixes

### Developer Agent

Generates targeted code patches and corresponding test cases.

- **Inputs:** Root cause context from the Investigator, file contents, project conventions
- **Outputs:** Code diff, test suite, self-review notes
- **Decision logic:** Applies a minimal-diff strategy -- prefers surgical edits over rewrites, and validates generated code against project lint and type rules before submission

### Ralph Wiggum (Stability Gate)

Validates every proposed fix through a comprehensive quality gate.

- **Inputs:** Code diff and tests from the Developer Agent
- **Outputs:** Pass/fail verdict with a detailed failure report
- **Decision logic:** Runs unit tests, lint checks, type verification, security scanning (OWASP Top 10), and smoke tests. Rejects any fix that fails a single check and returns failure context to the Developer Agent for the next retry

### Creative Agent

Activated when the Developer Agent exhausts its retry budget without a passing fix.

- **Inputs:** Accumulated failure context from previous attempts
- **Outputs:** Alternative solution strategies and unconventional approaches
- **Decision logic:** Breaks out of the local optimization loop by proposing fundamentally different solution paths -- a different algorithm, a different module boundary, or a configuration-based fix instead of a code change

### Distiller Agent

Runs post-resolution to extract reusable knowledge from each completed incident.

- **Inputs:** Full incident trace, root cause, fix diff, and test results
- **Outputs:** Condensed lesson entries written to semantic memory
- **Decision logic:** Identifies which parts of the investigation were novel versus redundant, and stores only the new knowledge that would accelerate future resolutions

## Data Flow

Follow a single error log line on its journey from ingestion to resolved ticket:

1. **Ingestion.** A production service emits an error log line. The Monitor stage ingests it in real time alongside thousands of other entries, normalizing format and attaching metadata (service name, timestamp, environment).

2. **Pattern Detection.** The incoming stream is scanned against known anomaly signatures. The error line matches a threshold breach or a novel pattern and is promoted from a raw log entry to a structured alert.

3. **Triage.** The Triage Agent classifies severity (critical, high, medium, low), checks whether an identical or similar issue is already being tracked, and deduplicates if necessary to avoid parallel agents working the same problem.

4. **Assignment.** The incident is routed to the right AI agent based on service, language, and error category. Model routing ensures a fast Haiku-class model handles straightforward classification while a heavier Sonnet or Opus model is reserved for complex root-cause analysis.

5. **Investigation.** The assigned agent explores the codebase, traces the error path through the call stack, and assembles a rich context window that includes surrounding code, recent commits, and any related historical fixes from semantic memory.

6. **Fix Generation.** The Developer Agent generates a targeted code patch, writes corresponding unit tests, and runs a self-review pass to catch syntax errors, off-by-one mistakes, or obvious logic flaws before submitting.

7. **Validation.** The proposed fix is handed to the Stability Gate, which runs the full validation suite: unit tests, linting, type checking, security scanning, and smoke tests. If any check fails, the fix is rejected and the loop restarts with the failure context. If all checks pass, the gate opens and the fix is cleared for deployment.

8. **Deploy and Learn.** The validated fix is merged and deployed to production. The semantic memory store is updated with the new findings so that future encounters with the same pattern are resolved faster -- often without invoking a model at all.

## Ticket Lifecycle

Every incident follows a well-defined state machine from first alert to resolution:

```
New --> Triaged --> Investigating --> InDevelopment --> InReview --> Deployed
```

**State transitions:**

| From | To | Trigger |
|---|---|---|
| * | New | Alert ingested |
| New | Triaged | Classified by Triage Agent |
| Triaged | Investigating | Agent assigned |
| Investigating | In Development | Root cause found |
| In Development | In Review | Fix submitted |
| In Review | Deployed | All Stability Gate checks pass |
| In Review | In Development | Checks fail (retry) |
| In Development | Escalated | Retry limit hit |
| Escalated | In Development | Human provides guidance |
| Deployed | * (Resolved) | Post-deployment verification complete |

Tickets move linearly through the pipeline under normal conditions. When the Stability Gate rejects a fix, the ticket loops back to In Development. If the retry budget is exhausted, the ticket escalates to a human engineer while remaining in the active queue. Once deployed, the ticket transitions to Resolved and feeds its findings back into semantic memory.

## Model Routing

SWE-Squad routes each task to the most cost-effective model capable of handling it. Three tiers are available:

| Model | Cost | Best For |
|---|---|---|
| **Haiku** | ~$0.25 / 1M tokens | Simple classification, deduplication, alert routing |
| **Sonnet** | ~$3.00 / 1M tokens | Investigation, patch generation, root-cause analysis |
| **Opus** | ~$15.00 / 1M tokens | Complex architectural decisions, multi-service incidents |

**Auto-escalation flow:**

1. The system classifies incoming incident complexity (simple, standard, complex).
2. Each complexity level maps to a starting model tier.
3. If the chosen model fails to produce a passing fix within its retry budget, the system upgrades to the next model tier and retries.
4. If all tiers are exhausted, the incident escalates to a human engineer with the full diagnostic trace.

This ensures every issue eventually reaches the right level of expertise -- whether AI or human.

## Fix Loop

When the Stability Gate rejects a fix, the system does not give up. Instead, it enters an iterative feedback loop:

```
Generate Fix --> Validate (Stability Gate) --> Pass? --> Deploy
                                         --> Fail? --> Review Failures
                                                    --> Adjust Approach
                                                    --> Generate Fix (retry)
```

**Loop constraints:**

- **Maximum 3 retries** before escalation.
- Each retry carries forward the full failure context so the agent avoids repeating the same mistake.
- If the standard Developer Agent exhausts its retry budget, the **Creative Agent** is activated to propose fundamentally different solution strategies.
- If the Creative Agent also fails, the incident is **escalated to a human engineer** with the complete diagnostic trace, ensuring no issue is silently abandoned.

## Semantic Memory

SWE-Squad maintains a semantic memory store that accumulates knowledge across incidents. This store is consulted before any agent begins work:

```
Incoming Issue --> Match Against Memory
                              --> Hit:  Return cached fix context (zero model cost)
                              --> Miss: Run full investigation pipeline
                                          --> Store new findings in memory
```

**How it works:**

1. Every incoming issue is matched against the memory store to surface relevant historical context.
2. If a match is found (a previously resolved issue with the same or similar root cause), the agent can skip redundant exploration and apply the known fix pattern directly -- often without invoking a model at all.
3. If no match is found, the agent runs the full investigation pipeline. The **Distiller Agent** then extracts the novel findings and writes them back to the memory store.
4. Over time, findings are distilled into a persistent knowledge base of lessons learned and recurring patterns. This means the system becomes progressively faster and more accurate with each resolved incident.

## Multi-Team Scoping

SWE-Squad supports multiple engineering teams within a single deployment. Each team is scoped to its own boundaries while sharing a common memory store for cross-team learning.

**Key concepts:**

- **Team Router** -- Directs incoming alerts to the correct team based on service ownership metadata. A backend alert goes to the backend team; a frontend error goes to the frontend team.
- **Scoped Codebase Access** -- Within each team, agents operate within strictly scoped codebase boundaries. A backend agent cannot access frontend repositories, and vice versa. This prevents accidental cross-team changes and keeps each team's context window focused.
- **Shared Memory Store** -- Despite scoped codebases, the semantic memory store is shared across all teams. Lessons learned by one team benefit others encountering similar patterns.
- **Cross-Team Incidents** -- When an issue spans multiple teams (for example, an API change that breaks a frontend consumer), the Team Router detects the overlap and broadcasts the incident to all affected teams simultaneously.
