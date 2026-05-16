---
title: Installation
description: How to install SWE-Squad
section: Getting Started
order: 2
---

# Installation

Set up SWE-Squad on your local machine by cloning the repository, creating a virtual environment, and installing all dependencies.

## Clone the Repository

Clone the SWE-Squad repository from GitHub and navigate into the project directory:

```bash
git clone https://github.com/swe-squad/swe-squad.git
cd swe-squad
```

## Create a Virtual Environment

Isolate your Python dependencies by creating and activating a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# or: .venv\Scripts\activate  # Windows
```

Always activate the virtual environment before running any SWE-Squad commands.

## Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

For development work, install the package in editable mode with dev dependencies instead:

```bash
pip install -e ".[dev]"
```

## Install Claude Code CLI

If you have not already installed the Claude Code CLI, install it globally with npm:

```bash
npm install -g @anthropic-ai/claude-code
```

This provides the AI agent runtime that SWE-Squad relies on to execute fix cycles.

## Authenticate GitHub CLI

Authorize the GitHub CLI so SWE-Squad can interact with your repositories:

```bash
gh auth login
```

Follow the interactive prompts to select GitHub.com, choose your preferred authentication method (HTTPS or SSH), and complete the authorization flow.

## Verify Installation

Confirm that all required tools are installed and accessible:

```bash
python3 --version   # 3.10+
claude --version    # Claude Code CLI
gh --version        # GitHub CLI
git --version       # 2.30+
```

Each command should print a version number without errors. If any command fails, revisit the corresponding installation step in the [prerequisites](/docs/introduction#prerequisites) section.

## Next Step

With SWE-Squad installed and all tools verified, you are ready to configure the system for your repository.

Continue to [Configuration](/docs/configuration) →
