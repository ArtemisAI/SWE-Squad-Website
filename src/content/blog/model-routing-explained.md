---
title: "Model Routing: Matching AI Models to Tasks"
description: "How SWE-Squad routes different incident management tasks to the optimal AI model, balancing cost and quality across Haiku, Sonnet, and Opus."
date: 2025-02-10
author: "Engineering Team"
tags: ["engineering", "ai", "model-routing"]
---

One of the key design decisions in SWE-Squad is how we route tasks to different AI models. Not every task needs the most powerful (and expensive) model. Here's how we think about it.

## The Three Tiers

| Tier | Model | Cost | Use Case |
|------|-------|------|----------|
| Fast | Haiku | ~$0.25/1M tokens | Triage, initial classification |
| Balanced | Sonnet | ~$3.00/1M tokens | Investigation, patch generation |
| Expert | Opus | ~$15.00/1M tokens | Complex fixes, architecture decisions |

## Routing Logic

Our routing system considers several factors:

- **Task complexity** — Simple classification vs. multi-step reasoning
- **Time sensitivity** — Can we afford to use a slower model?
- **Cost budget** — What's the allocated budget for this incident?
- **Historical patterns** — Have we seen similar incidents before?

## Caching Wins

Previously resolved patterns are cached and reused at zero model cost. This means the more incidents SWE-Squad handles, the faster and cheaper it becomes. The cache hit rate in production is already over 40%.

## Results

After three months in production, our routing system has:

- Reduced average incident cost by 62%
- Maintained a 94% auto-resolution rate
- Kept mean-time-to-resolution under 8 minutes

We'll share more detailed benchmarks in a future post.
