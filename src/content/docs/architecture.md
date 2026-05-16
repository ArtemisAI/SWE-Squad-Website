---
title: Architecture
description: Understanding the SWE-Squad architecture
section: Core Concepts
order: 1
---

# Architecture

SWE-Squad follows a modular architecture designed for extensibility.

## Overview

The platform consists of three main layers:

- **Agent Layer** — Handles task execution and code generation
- **Orchestration Layer** — Manages workflow and coordination
- **Interface Layer** — Provides CLI and API access

## Data Flow

Tasks flow from the user through the interface layer, get orchestrated, and are executed by agents.

## Interactive Architecture Diagrams

For detailed, interactive Mermaid diagrams of the full pipeline, fix loop, semantic memory, and provider plugin architecture, see the **[Architecture Page](/architecture)**.
