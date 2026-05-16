---
title: Introduction
description: Get started with SWE-Squad
section: Getting Started
order: 1
---

# Introduction

Welcome to SWE-Squad, a multi-agent AI system for autonomous software engineering. This guide will walk you through what SWE-Squad is, how it works, and what you need before installing it.

## What is SWE-Squad?

SWE-Squad is a multi-agent AI system that autonomously triages, investigates, fixes, and resolves GitHub issues. Instead of manually debugging and patching problems, SWE-Squad deploys a team of specialized AI agents that work together to resolve issues end-to-end:

- **Orchestrator** - Coordinates the overall workflow, assigns tasks to agents, and manages the fix cycle.
- **Investigator** - Analyzes the issue, reproduces the problem, and identifies the root cause in the codebase.
- **Fixer** - Implements the code changes required to resolve the identified issue.
- **Reviewer** - Reviews the proposed fix for correctness, style, and potential regressions before submission.

Each agent plays a distinct role in the pipeline, and together they form a complete loop from issue ingestion to pull request creation.

## How It Works

SWE-Squad connects directly to your GitHub repository and operates in an automated fix cycle:

1. **Connect to GitHub issues** - SWE-Squad monitors and ingests open GitHub issues from your repository.
2. **Assign agents** - The Orchestrator assigns the appropriate agents to each issue based on its classification and complexity.
3. **Run fix cycles** - The Investigator analyzes the issue and identifies root causes; the Fixer implements the necessary code changes; the Reviewer validates the fix.
4. **Create pull requests** - Once the fix passes review, SWE-Squad automatically creates a pull request against your repository with the full patch and a summary of the changes.

This cycle can run autonomously or with human oversight, depending on your configuration.

## Prerequisites

Before installing SWE-Squad, ensure your system meets the following requirements:

| Prerequisite | Required? | Purpose | Install | Verify |
|---|---|---|---|---|
| Python 3.10+ | Required | Core runtime | Use your OS package manager or [python.org](https://www.python.org/) | `python3 --version` |
| Claude Code CLI | Required | AI agent runtime | `npm install -g @anthropic-ai/claude-code` | `claude --version` |
| GitHub CLI (`gh`) | Required | Issue and PR management | `brew install gh` or `sudo apt install gh` | `gh --version` |
| Git 2.30+ | Required | Version control | Use your OS package manager or [git-scm.com](https://git-scm.com/) | `git --version` |
| Docker | Optional | Containerized execution | [docker.com](https://www.docker.com/) | `docker --version` |

Run the verification commands in the table above to confirm each tool is installed and available on your `PATH`.

## Next Step

With the prerequisites confirmed, you are ready to install SWE-Squad.

Continue to [Installation](/docs/installation) →
