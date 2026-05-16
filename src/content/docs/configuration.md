---
title: Configuration
description: Configure SWE-Squad for your project
section: Getting Started
order: 3
---

# Configuration

SWE-Squad uses a configuration file to define project settings.

## Config File

Create a `swe-squad.config.yaml` in your project root:

```yaml
version: 1
project:
  name: my-project
  language: typescript
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `version` | number | required | Config schema version |
| `project.name` | string | required | Project name |
| `project.language` | string | auto | Primary language |
