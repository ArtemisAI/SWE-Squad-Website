---
title: API Reference
description: SWE-Squad REST API reference
section: API
order: 1
---

# API Reference

The SWE-Squad API provides programmatic access to the platform.

## Authentication

All API requests require a bearer token:

```bash
curl -H "Authorization: Bearer $TOKEN" https://api.swe-squad.dev/v1/tasks
```

## Endpoints

### List Tasks

`GET /v1/tasks`

### Create Task

`POST /v1/tasks`

### Get Task

`GET /v1/tasks/:id`
