---
title: "Provider Plugin Development Guide"
description: "Build custom provider plugins for SWE-Squad's provider-agnostic architecture"
section: "Advanced"
order: 1
---

# Provider Plugin Development Guide

This guide explains how to build custom provider plugins for SWE-Squad's provider-agnostic architecture. It covers the core design philosophy, all seven provider interfaces, a step-by-step tutorial for building a Slack notification provider, YAML registration, and testing patterns.

See also: [Configuration Reference](/docs/configuration-reference) for the full `swe_team.yaml` schema and environment variable documentation. See also: [Architecture](/architecture) for the high-level provider plugin architecture diagram.

---

## 1. Provider-Agnostic Architecture Philosophy

SWE-Squad is built on a single guiding principle: **if it can be replaced by a competitor, it must be behind an interface.** Every external dependency in the system -- from the LLM backend to the notification channel to the vector database -- is isolated behind an abstract Python class. The core pipeline never imports or references a concrete implementation directly. Instead, it depends entirely on abstract interfaces and resolves concrete implementations at runtime through a central registry.

This design has three practical consequences:

- **Zero lock-in.** Swapping Anthropic for OpenAI, Pinecone for Weaviate, or Slack for Discord requires a single configuration change, not a code change. The pipeline code is identical regardless of which concrete provider is active.
- **Hybrid deployments.** Different providers can handle different stages simultaneously. A team can use Anthropic for investigation, OpenAI for triage, a local model server for embedding, and Redis for task queuing -- all in the same pipeline run.
- **Custom extensions.** Any team can write a provider plugin for an internal or niche service and register it alongside the built-in implementations. No fork required.

### BaseProvider and ProviderRegistry

Every provider interface in SWE-Squad inherits from a common `BaseProvider` abstract class. At a minimum, `BaseProvider` defines the lifecycle contract that all providers must satisfy:

```python
from abc import ABC, abstractmethod

class BaseProvider(ABC):
    """Base class for all SWE-Squad provider plugins."""

    @abstractmethod
    async def initialize(self, config: dict) -> None:
        """Called once after construction to pass runtime configuration."""
        ...

    @abstractmethod
    async def shutdown(self) -> None:
        """Called during graceful shutdown to release resources."""
        ...

    @abstractmethod
    def health_check(self) -> bool:
        """Return True if the provider is operational."""
        ...
```

Concrete providers extend `BaseProvider` and implement the domain-specific abstract methods for their interface type (for example, `complete` and `embed` for `CodingEngine`).

The `ProviderRegistry` is a singleton that manages provider registration and lookup. It is populated at startup from the `swe_team.yaml` configuration file and can be extended programmatically:

```python
from swe_team.providers import ProviderRegistry

# The registry is populated automatically from swe_team.yaml at startup.
# You can also register providers programmatically:

registry = ProviderRegistry.instance()
registry.register("notifications", "slack", SlackNotificationProvider(
    bot_token="xoxb-...",
    default_channel="#alerts"
))

# Lookup by interface type and provider name
provider = registry.get("notifications", "slack")
```

### Provider Registry Pattern

The following diagram shows how the registry connects the pipeline to concrete implementations at runtime:

```mermaid
flowchart TD
    subgraph Pipeline["SWE-Squad Pipeline"]
        A1[Explorer Agent]
        A2[Planner Agent]
        A3[Coder Agent]
        A4[Reviewer Agent]
    end

    subgraph Registry["ProviderRegistry"]
        R1[notifications: slack]
        R2[coding: anthropic]
        R3[issues: github]
        R4[sandbox: docker]
        R5[embedding: openai]
        R6[vectorstore: pinecone]
        R7[taskqueue: redis]
    end

    subgraph Interfaces["Abstract Interfaces"]
        I1[NotificationProvider]
        I2[CodingEngine]
        I3[IssueTracker]
        I4[SandboxProvider]
        I5[EmbeddingProvider]
        I6[VectorStore]
        I7[TaskQueueProvider]
    end

    Pipeline -->|"depends on"| Interfaces
    Interfaces -->|"resolved by"| Registry

    subgraph Implementations["Concrete Implementations"]
        C1[SlackNotificationProvider]
        C2[AnthropicProvider]
        C3[GitHubIssueTracker]
        C4[DockerSandboxProvider]
        C5[OpenAIEmbeddingProvider]
        C6[PineconeVectorStore]
        C7[RedisTaskQueue]
    end

    Registry -->|"instantiates"| Implementations
```

When an agent needs to send a notification, it asks the registry for the current `NotificationProvider`. The registry returns the concrete instance that was registered under that interface type, and the agent calls its methods without knowing or caring which implementation is active.

---

## 2. Interface Definitions for Each Provider Type

SWE-Squad defines seven provider interfaces. Each interface is an abstract class with a fixed set of methods that concrete providers must implement. This section documents every interface, its methods, and the built-in implementations that ship with SWE-Squad.

### 2.1 CodingEngine

The `CodingEngine` interface wraps the large language model backend. All agent invocations -- exploration, planning, code generation, and review -- go through this interface.

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator

class CodingEngine(BaseProvider):
    """Abstract interface for LLM completion and embedding backends."""

    @abstractmethod
    async def complete(self, prompt: str, **kwargs) -> str:
        """Generate a completion for the given prompt.

        Args:
            prompt: The input prompt string.
            **kwargs: Optional overrides for model, temperature, max_tokens, etc.

        Returns:
            The generated completion text.
        """
        ...

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Generate an embedding vector for the given text.

        Args:
            text: The input text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        ...

    @abstractmethod
    async def stream(self, prompt: str, **kwargs) -> AsyncIterator[str]:
        """Stream a completion token by token.

        Args:
            prompt: The input prompt string.
            **kwargs: Optional overrides for model, temperature, max_tokens, etc.

        Yields:
            Individual tokens as they are generated.
        """
        ...
```

| Method | Returns | Description |
|--------|---------|-------------|
| `complete(prompt, **kwargs)` | `str` | Generate a full completion for the prompt. Accepts optional `model`, `temperature`, `max_tokens`, and `system` keyword arguments. |
| `embed(text)` | `list[float]` | Generate a dense embedding vector for the input text. Used by the semantic memory system. |
| `stream(prompt, **kwargs)` | `AsyncIterator[str]` | Stream a completion token by token. Used for real-time dashboard display and interactive CLI sessions. |

**Built-in implementations:**

| Implementation | Description |
|---------------|-------------|
| `AnthropicProvider` | Default provider. Connects to the Anthropic API using the `ANTHROPIC_API_KEY` environment variable. Supports Claude Haiku, Sonnet, and Opus models. |
| `OpenAIProvider` | Connects to the OpenAI API using the `OPENAI_API_KEY` environment variable. Supports GPT-4o, GPT-4o-mini, and compatible endpoints. |
| `LocalProvider` | Connects to a local model server via an OpenAI-compatible API. Configure with `base_url` in `swe_team.yaml`. |

### 2.2 NotificationProvider

The `NotificationProvider` interface handles all outgoing notifications. SWE-Squad uses it to alert engineers about new incidents, fix approvals, escalations, and deployment events.

```python
class NotificationProvider(BaseProvider):
    """Abstract interface for notification delivery backends."""

    @abstractmethod
    async def send_notification(self, recipient: str, message: str, **kwargs) -> bool:
        """Send a notification to a single recipient.

        Args:
            recipient: The recipient identifier (email, channel, user ID, etc.).
            message: The notification message body.
            **kwargs: Optional overrides such as channel, subject, priority, or attachments.

        Returns:
            True if the notification was sent successfully, False otherwise.
        """
        ...

    @abstractmethod
    async def send_batch(self, recipients: list[str], message: str) -> dict:
        """Send the same notification to multiple recipients.

        Args:
            recipients: A list of recipient identifiers.
            message: The notification message body.

        Returns:
            A dict mapping each recipient to a boolean success indicator.
        """
        ...
```

| Method | Returns | Description |
|--------|---------|-------------|
| `send_notification(recipient, message, **kwargs)` | `bool` | Send a notification to a single recipient. Supports `channel`, `subject`, `priority`, and `attachments` keyword arguments. |
| `send_batch(recipients, message)` | `dict` | Send the same message to multiple recipients. Returns a dict mapping each recipient to a boolean indicating success or failure. |

**Built-in implementations:**

| Implementation | Description |
|---------------|-------------|
| `EmailNotificationProvider` | Sends notifications via email using SMTP. Configured with `SMTP_HOST`, `SMTP_PORT`, and `SMTP_FROM` environment variables. |
| `WebhookNotificationProvider` | Posts JSON payloads to a configurable webhook URL. Useful for custom integrations and chatops pipelines. |

### 2.3 IssueTracker

The `IssueTracker` interface wraps issue tracking systems. SWE-Squad uses it to create, read, update, and list issues during incident management.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Issue:
    """Represents a tracked issue."""
    id: str
    title: str
    body: str
    status: str
    labels: list[str]
    assignee: Optional[str] = None
    metadata: Optional[dict] = None

class IssueTracker(BaseProvider):
    """Abstract interface for issue tracking backends."""

    @abstractmethod
    async def create_issue(self, title: str, body: str, **kwargs) -> Issue:
        """Create a new issue.

        Args:
            title: The issue title.
            body: The issue body in markdown.
            **kwargs: Optional fields such as labels, assignee, and metadata.

        Returns:
            The created Issue object with its assigned ID.
        """
        ...

    @abstractmethod
    async def get_issue(self, id: str) -> Issue:
        """Retrieve an issue by its identifier.

        Args:
            id: The issue identifier.

        Returns:
            The Issue object.
        """
        ...

    @abstractmethod
    async def update_issue(self, id: str, **kwargs) -> Issue:
        """Update an existing issue.

        Args:
            id: The issue identifier.
            **kwargs: Fields to update such as status, labels, assignee, or body.

        Returns:
            The updated Issue object.
        """
        ...

    @abstractmethod
    async def list_issues(self, **kwargs) -> list[Issue]:
        """List issues matching the given filters.

        Args:
            **kwargs: Filter criteria such as status, labels, assignee, or since.

        Returns:
            A list of matching Issue objects.
        """
        ...
```

| Method | Returns | Description |
|--------|---------|-------------|
| `create_issue(title, body, **kwargs)` | `Issue` | Create a new issue. Accepts `labels`, `assignee`, and `metadata` keyword arguments. |
| `get_issue(id)` | `Issue` | Retrieve a single issue by its unique identifier. |
| `update_issue(id, **kwargs)` | `Issue` | Update fields on an existing issue. Accepts `status`, `labels`, `assignee`, and `body` keyword arguments. |
| `list_issues(**kwargs)` | `list[Issue]` | List issues matching filters. Accepts `status`, `labels`, `assignee`, and `since` keyword arguments. |

**Built-in implementations:**

| Implementation | Description |
|---------------|-------------|
| `GitHubIssueTracker` | Default tracker. Uses the GitHub REST API with the `GITHUB_TOKEN` environment variable. Supports labels, milestones, and assignees. |
| `JiraIssueTracker` | Connects to Jira Cloud or Jira Server. Configured with `JIRA_URL`, `JIRA_USER`, and `JIRA_TOKEN` environment variables. |
| `LinearIssueTracker` | Connects to Linear via the Linear API. Configured with `LINEAR_API_KEY` and `LINEAR_TEAM_ID` environment variables. |

### 2.4 SandboxProvider

The `SandboxProvider` interface manages isolated execution environments. SWE-Squad uses sandboxes to run agent-generated commands, tests, and validation scripts in a safe, reproducible manner.

```python
from dataclasses import dataclass

@dataclass
class SandboxHandle:
    """Opaque handle to a running sandbox instance."""
    id: str
    created_at: str
    config: dict

@dataclass
class ExecutionResult:
    """Result of a command executed inside a sandbox."""
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int

class SandboxProvider(BaseProvider):
    """Abstract interface for isolated execution environments."""

    @abstractmethod
    async def create_sandbox(self, config: dict) -> SandboxHandle:
        """Create a new sandbox instance.

        Args:
            config: Sandbox configuration including image, memory limit,
                    CPU limit, environment variables, and mount points.

        Returns:
            A SandboxHandle identifying the created instance.
        """
        ...

    @abstractmethod
    async def execute(self, handle: SandboxHandle, command: str) -> ExecutionResult:
        """Execute a command inside the sandbox.

        Args:
            handle: The sandbox handle returned by create_sandbox.
            command: The shell command to execute.

        Returns:
            An ExecutionResult with exit code, stdout, stderr, and duration.
        """
        ...

    @abstractmethod
    async def destroy(self, handle: SandboxHandle) -> None:
        """Destroy the sandbox and release all resources.

        Args:
            handle: The sandbox handle to destroy.
        """
        ...
```

| Method | Returns | Description |
|--------|---------|-------------|
| `create_sandbox(config)` | `SandboxHandle` | Create a new isolated environment. The `config` dict accepts `image`, `memory`, `cpu`, `env`, and `mounts` keys. |
| `execute(handle, command)` | `ExecutionResult` | Run a shell command inside the sandbox. Returns exit code, stdout, stderr, and execution duration. |
| `destroy(handle)` | `None` | Tear down the sandbox and release all associated resources. |

**Built-in implementations:**

| Implementation | Description |
|---------------|-------------|
| `DockerSandboxProvider` | Default sandbox. Uses Docker containers with configurable images, memory limits, and network isolation. Enabled with `SWE_DOCKER_ENABLED=true`. |
| `LocalSandboxProvider` | Runs commands directly on the host with subprocess isolation. Intended for development only. No network or filesystem isolation. |

### 2.5 EmbeddingProvider

The `EmbeddingProvider` interface handles text embedding generation. SWE-Squad uses embeddings for semantic memory matching, similarity search, and trajectory distillation.

```python
class EmbeddingProvider(BaseProvider):
    """Abstract interface for text embedding backends."""

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Generate an embedding vector for a single text input.

        Args:
            text: The input text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        ...

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embedding vectors for multiple text inputs.

        Args:
            texts: A list of input strings to embed.

        Returns:
            A list of embedding vectors, one per input text.
        """
        ...
```

| Method | Returns | Description |
|--------|---------|-------------|
| `embed(text)` | `list[float]` | Generate a single embedding vector for the input text. |
| `embed_batch(texts)` | `list[list[float]]` | Generate embedding vectors for a batch of inputs. More efficient than calling `embed` in a loop for large batches. |

**Built-in implementations:**

| Implementation | Description |
|---------------|-------------|
| `OpenAIEmbeddingProvider` | Uses OpenAI's embedding API (text-embedding-3-small by default). Configured with `OPENAI_API_KEY`. |
| `LocalEmbeddingProvider` | Runs sentence-transformers locally. No API key required. Suitable for air-gapped environments. |

### 2.6 VectorStore

The `VectorStore` interface wraps vector databases used for semantic memory storage and retrieval. SWE-Squad stores issue embeddings, fix trajectories, and distilled playbooks in the vector store.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class SearchResult:
    """A single result from a vector similarity search."""
    id: str
    score: float
    metadata: Optional[dict] = None

class VectorStore(BaseProvider):
    """Abstract interface for vector storage backends."""

    @abstractmethod
    async def upsert(self, id: str, embedding: list[float], metadata: dict) -> None:
        """Insert or update a vector entry.

        Args:
            id: Unique identifier for the entry.
            embedding: The embedding vector.
            metadata: Optional metadata dict to store alongside the vector.
        """
        ...

    @abstractmethod
    async def query(self, embedding: list[float], k: int = 10) -> list[SearchResult]:
        """Search for the k nearest neighbors of the given embedding.

        Args:
            embedding: The query embedding vector.
            k: The number of results to return.

        Returns:
            A list of SearchResult objects sorted by similarity score.
        """
        ...

    @abstractmethod
    async def delete(self, ids: list[str]) -> None:
        """Delete entries by their identifiers.

        Args:
            ids: A list of entry identifiers to delete.
        """
        ...
```

| Method | Returns | Description |
|--------|---------|-------------|
| `upsert(id, embedding, metadata)` | `None` | Insert a new entry or update an existing one if the ID already exists. |
| `query(embedding, k)` | `list[SearchResult]` | Return the `k` most similar entries to the given embedding. Results include ID, similarity score, and stored metadata. |
| `delete(ids)` | `None` | Remove one or more entries by their identifiers. |

**Built-in implementations:**

| Implementation | Description |
|---------------|-------------|
| `PineconeVectorStore` | Connects to Pinecone via its REST API. Configured with `PINECONE_API_KEY` and `PINECONE_INDEX` environment variables. |
| `WeaviateVectorStore` | Connects to a Weaviate instance. Configured with `WEAVIATE_URL` environment variable. |
| `ChromaVectorStore` | Uses ChromaDB as an embedded vector store. No external service required. Ideal for development and single-node deployments. |

### 2.7 TaskQueueProvider

The `TaskQueueProvider` interface wraps asynchronous task queue systems. SWE-Squad uses task queues for distributed remote worker coordination, background incident processing, and long-running fix orchestration.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Task:
    """Represents a queued task."""
    id: str
    payload: dict
    queue: str
    status: str
    created_at: Optional[str] = None

class TaskQueueProvider(BaseProvider):
    """Abstract interface for async task queue backends."""

    @abstractmethod
    async def enqueue(self, task: dict, queue: str = "default") -> str:
        """Add a task to the queue.

        Args:
            task: The task payload as a dict.
            queue: The queue name. Defaults to "default".

        Returns:
            The assigned task ID.
        """
        ...

    @abstractmethod
    async def dequeue(self, queue: str = "default") -> Task:
        """Retrieve and remove the next task from the queue.

        Args:
            queue: The queue name. Defaults to "default".

        Returns:
            The next Task object from the queue.
        """
        ...

    @abstractmethod
    async def acknowledge(self, task_id: str) -> None:
        """Acknowledge that a task has been processed successfully.

        Args:
            task_id: The ID of the task to acknowledge.
        """
        ...

    @abstractmethod
    async def queue_size(self, queue: str = "default") -> int:
        """Return the number of pending tasks in the queue.

        Args:
            queue: The queue name. Defaults to "default".

        Returns:
            The number of pending tasks.
        """
        ...
```

| Method | Returns | Description |
|--------|---------|-------------|
| `enqueue(task, queue)` | `str` | Add a task to the named queue and return its assigned ID. |
| `dequeue(queue)` | `Task` | Pop the next task from the named queue. Blocks until a task is available. |
| `acknowledge(task_id)` | `None` | Mark a task as successfully processed. Required for at-least-once delivery semantics. |
| `queue_size(queue)` | `int` | Return the number of pending (unacknowledged) tasks in the queue. |

**Built-in implementations:**

| Implementation | Description |
|---------------|-------------|
| `RedisTaskQueue` | Default queue backend. Uses Redis LIST and SET operations. Configured with the `remote.redis_url` setting in `swe_team.yaml`. |
| `CeleryTaskQueue` | Uses Celery with a configurable broker (Redis or RabbitMQ). Suitable for complex workflow orchestration with task chaining. |
| `SQSTaskQueue` | Uses Amazon SQS. Configured with `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` environment variables. |
| `MemoryTaskQueue` | In-process async queue using Python's `asyncio.Queue`. Intended for development and testing only. |

---

## 3. Step-by-Step Tutorial: Building a Custom NotificationProvider (Slack)

This section walks through building a complete Slack notification provider from scratch. The finished provider will support single and batch notifications, rate limiting, retries, and proper error handling.

### Prerequisites

Before you begin, ensure you have the following:

- **Python 3.11+** installed on your development machine
- A **Slack workspace** with permission to create bots
- A **Slack Bot User OAuth Token** starting with `xoxb-`. Create one at `api.slack.com/apps` by creating a new app, attaching it to your workspace, and granting it the `chat:write` and `chat:write.public` bot token scopes
- The `aiohttp` package installed (`pip install aiohttp`) for async HTTP requests
- A running SWE-Squad development environment (see the [Configuration Reference](/docs/configuration-reference) for setup instructions)

### Step 1: Create the Provider File

Create a new Python module for your provider. Place it in the `providers/` directory at the root of your SWE-Squad installation:

```bash
mkdir -p providers
touch providers/__init__.py
touch providers/slack_provider.py
```

The directory structure should look like this:

```
your-project/
  providers/
    __init__.py
    slack_provider.py
  swe_team.yaml
  ...
```

### Step 2: Implement the NotificationProvider Interface

Open `providers/slack_provider.py` and implement the `NotificationProvider` abstract class:

```python
"""Slack notification provider for SWE-Squad."""

import asyncio
import logging
from typing import Any

import aiohttp

from swe_team.providers import NotificationProvider, ProviderRegistry

logger = logging.getLogger(__name__)


class SlackNotificationProvider(NotificationProvider):
    """Send SWE-Squad notifications to Slack channels and users."""

    def __init__(self, bot_token: str, default_channel: str):
        self.bot_token = bot_token
        self.default_channel = default_channel
        self._client: aiohttp.ClientSession | None = None
        self._base_url = "https://slack.com/api/chat.postMessage"

    async def initialize(self, config: dict) -> None:
        """Initialize the aiohttp session."""
        self._client = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.bot_token}",
                "Content-Type": "application/json",
            }
        )
        logger.info("SlackNotificationProvider initialized for channel %s",
                     self.default_channel)

    async def shutdown(self) -> None:
        """Close the aiohttp session."""
        if self._client and not self._client.closed:
            await self._client.close()
            logger.info("SlackNotificationProvider shut down")

    def health_check(self) -> bool:
        """Check whether the HTTP client session is active."""
        return self._client is not None and not self._client.closed

    async def send_notification(
        self, recipient: str, message: str, **kwargs: Any
    ) -> bool:
        """Send a notification to a Slack channel or user.

        Args:
            recipient: A Slack user ID (e.g. @U12345678), channel name
                       (e.g. #general), or channel ID (e.g. C12345678).
            message: The notification text.
            **kwargs: Optional overrides:
                - channel: Override the target channel.
                - blocks: Slack Block Kit blocks for rich formatting.
                - unfurl_links: Whether to unfurl links (default False).

        Returns:
            True if Slack accepted the message, False otherwise.
        """
        channel = kwargs.get("channel", self._resolve_channel(recipient))
        payload: dict[str, Any] = {
            "channel": channel,
            "text": message,
            "unfurl_links": kwargs.get("unfurl_links", False),
        }
        if "blocks" in kwargs:
            payload["blocks"] = kwargs["blocks"]

        return await self._post_message(payload)

    async def send_batch(
        self, recipients: list[str], message: str
    ) -> dict[str, bool]:
        """Send the same message to multiple recipients.

        Args:
            recipients: A list of Slack user IDs or channel names.
            message: The notification text.

        Returns:
            A dict mapping each recipient to a boolean success indicator.
        """
        results: dict[str, bool] = {}
        for recipient in recipients:
            results[recipient] = await self.send_notification(recipient, message)
            # Respect Slack rate limits: space out messages by 300ms
            await asyncio.sleep(0.3)
        return results

    def _resolve_channel(self, recipient: str) -> str:
        """Resolve a recipient string to a Slack channel identifier.

        If the recipient starts with '#', treat it as a channel name.
        If it starts with '@', treat it as a user ID for a DM.
        Otherwise, fall back to the default channel.
        """
        if recipient.startswith("#") or recipient.startswith("@"):
            return recipient
        if recipient.startswith("C") or recipient.startswith("D"):
            return recipient
        return self.default_channel

    async def _post_message(self, payload: dict[str, Any]) -> bool:
        """Post a message to the Slack API with basic error handling.

        Args:
            payload: The JSON payload to send.

        Returns:
            True if the API responded with ok=true, False otherwise.
        """
        if not self._client:
            logger.error("SlackNotificationProvider not initialized")
            return False

        try:
            async with self._client.post(self._base_url, json=payload) as resp:
                body = await resp.json()
                if body.get("ok"):
                    logger.debug("Slack message sent to %s", payload["channel"])
                    return True
                else:
                    logger.error(
                        "Slack API error: %s", body.get("error", "unknown")
                    )
                    return False
        except aiohttp.ClientError as exc:
            logger.error("HTTP error sending Slack message: %s", exc)
            return False
```

Key design decisions in this implementation:

- The `aiohttp.ClientSession` is created in `initialize()` and closed in `shutdown()`, matching the `BaseProvider` lifecycle contract.
- `_resolve_channel()` handles three common recipient formats: channel names (`#general`), user mentions (`@U12345678`), and raw channel IDs (`C12345678`), falling back to the configured default channel.
- `send_batch()` spaces messages 300 milliseconds apart to stay within Slack's rate limits.
- All errors are logged and returned as `False` rather than raised, matching the interface contract that expects a boolean return.

### Step 3: Add Error Handling, Retries, and Rate Limiting

Production Slack integrations must handle transient failures, rate limiting responses, and network timeouts gracefully. Extend the `_post_message` method with retry logic:

```python
import asyncio
import logging
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)


class SlackNotificationProvider(NotificationProvider):
    """Send SWE-Squad notifications to Slack channels and users."""

    MAX_RETRIES = 3
    RETRY_BASE_DELAY = 1.0  # seconds

    def __init__(self, bot_token: str, default_channel: str):
        self.bot_token = bot_token
        self.default_channel = default_channel
        self._client: aiohttp.ClientSession | None = None
        self._base_url = "https://slack.com/api/chat.postMessage"

    async def initialize(self, config: dict) -> None:
        """Initialize the aiohttp session with retry-friendly timeouts."""
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        self._client = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.bot_token}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )
        logger.info("SlackNotificationProvider initialized for channel %s",
                     self.default_channel)

    async def shutdown(self) -> None:
        """Close the aiohttp session."""
        if self._client and not self._client.closed:
            await self._client.close()
            logger.info("SlackNotificationProvider shut down")

    def health_check(self) -> bool:
        """Check whether the HTTP client session is active."""
        return self._client is not None and not self._client.closed

    async def send_notification(
        self, recipient: str, message: str, **kwargs: Any
    ) -> bool:
        """Send a notification to a Slack channel or user."""
        channel = kwargs.get("channel", self._resolve_channel(recipient))
        payload: dict[str, Any] = {
            "channel": channel,
            "text": message,
            "unfurl_links": kwargs.get("unfurl_links", False),
        }
        if "blocks" in kwargs:
            payload["blocks"] = kwargs["blocks"]

        return await self._post_message(payload)

    async def send_batch(
        self, recipients: list[str], message: str
    ) -> dict[str, bool]:
        """Send the same message to multiple recipients."""
        results: dict[str, bool] = {}
        for recipient in recipients:
            results[recipient] = await self.send_notification(recipient, message)
            await asyncio.sleep(0.3)
        return results

    def _resolve_channel(self, recipient: str) -> str:
        """Resolve a recipient string to a Slack channel identifier."""
        if recipient.startswith("#") or recipient.startswith("@"):
            return recipient
        if recipient.startswith("C") or recipient.startswith("D"):
            return recipient
        return self.default_channel

    async def _post_message(self, payload: dict[str, Any]) -> bool:
        """Post a message to the Slack API with retries and rate limit handling.

        Retries up to MAX_RETRIES times with exponential backoff. Handles
        Slack's HTTP 429 rate limit response by respecting the Retry-After
        header.

        Args:
            payload: The JSON payload to send.

        Returns:
            True if the message was accepted, False after exhausting retries.
        """
        if not self._client:
            logger.error("SlackNotificationProvider not initialized")
            return False

        for attempt in range(self.MAX_RETRIES):
            try:
                async with self._client.post(
                    self._base_url, json=payload
                ) as resp:
                    # Handle Slack rate limiting
                    if resp.status == 429:
                        retry_after = int(
                            resp.headers.get("Retry-After", "60")
                        )
                        logger.warning(
                            "Slack rate limited. Retrying after %ds "
                            "(attempt %d/%d)",
                            retry_after, attempt + 1, self.MAX_RETRIES
                        )
                        await asyncio.sleep(retry_after)
                        continue

                    body = await resp.json()
                    if body.get("ok"):
                        logger.debug(
                            "Slack message sent to %s", payload["channel"]
                        )
                        return True

                    error = body.get("error", "unknown")
                    # Do not retry client errors (except rate limiting)
                    if error in ("channel_not_found", "not_authed",
                                 "invalid_auth", "account_inactive"):
                        logger.error(
                            "Slack API client error: %s (not retryable)", error
                        )
                        return False

                    logger.warning(
                        "Slack API error: %s (attempt %d/%d)",
                        error, attempt + 1, self.MAX_RETRIES
                    )

            except aiohttp.ClientError as exc:
                logger.warning(
                    "HTTP error sending Slack message: %s (attempt %d/%d)",
                    exc, attempt + 1, self.MAX_RETRIES
                )

            # Exponential backoff before retrying
            delay = self.RETRY_BASE_DELAY * (2 ** attempt)
            logger.info("Retrying in %.1fs", delay)
            await asyncio.sleep(delay)

        logger.error(
            "Failed to send Slack message after %d attempts",
            self.MAX_RETRIES
        )
        return False
```

The retry logic handles three categories of failure:

- **Rate limiting (HTTP 429):** Reads the `Retry-After` header and sleeps for the specified duration before retrying.
- **Transient errors (network failures, server errors):** Retries with exponential backoff starting at 1 second.
- **Client errors (invalid auth, missing channel):** Returns `False` immediately without retrying, since these errors will not resolve themselves.

### Step 4: Register the Provider

There are two ways to register your custom provider: programmatically or through `swe_team.yaml`. The YAML approach is recommended because it keeps configuration separate from code and works with the standard startup sequence.

**Programmatic registration** is useful for testing or dynamic setup:

```python
from providers.slack_provider import SlackNotificationProvider
from swe_team.providers import ProviderRegistry

# Create the provider instance
slack = SlackNotificationProvider(
    bot_token="xoxb-your-token-here",
    default_channel="#swe-squad-alerts"
)

# Initialize it
await slack.initialize({})

# Register with the global registry
registry = ProviderRegistry.instance()
registry.register("notifications", "slack", slack)

# Verify it works
assert registry.get("notifications", "slack").health_check()
```

The YAML registration approach is covered in detail in the next section.

---

## 4. Registration in swe_team.yaml

Custom providers are registered in the `providers` section of `swe_team.yaml`. The configuration system dynamically loads the specified Python module, instantiates the class, and registers it with the `ProviderRegistry` at startup.

### Basic Registration

Add a `custom` block under the relevant provider type in your `swe_team.yaml`:

```yaml
providers:
  notifications:
    default: "slack"
    custom:
      slack:
        module: "providers.slack_provider"
        class: "SlackNotificationProvider"
        config:
          bot_token_env: "SLACK_BOT_TOKEN"
          default_channel: "#swe-squad-alerts"
```

The registration schema for custom providers is:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `module` | string | yes | Dotted Python module path to the provider file. Must be importable from the SWE-Squad root directory. |
| `class` | string | yes | Name of the provider class within the module. Must inherit from the correct abstract interface. |
| `config` | object | no | Configuration dict passed to the provider's `initialize()` method. |
| `config.bot_token_env` | string | no | Name of the environment variable containing the API token. The startup loader reads this variable and passes the value to the provider. |
| `config.default_channel` | string | no | Default Slack channel for notifications when no channel is specified. |

Set the corresponding environment variable:

```bash
export SLACK_BOT_TOKEN="xoxb-your-bot-token-here"
```

### Registration for Other Provider Types

The same pattern applies to all seven provider types. Each type has its own top-level key under `providers`:

```yaml
providers:
  # LLM coding engine
  coding:
    default: "anthropic"
    custom:
      my_local_llm:
        module: "providers.my_local_provider"
        class: "MyLocalLLMProvider"
        config:
          base_url: "http://localhost:8080/v1"
          model: "llama-3.1-70b"

  # Notification backends
  notifications:
    default: "slack"
    custom:
      slack:
        module: "providers.slack_provider"
        class: "SlackNotificationProvider"
        config:
          bot_token_env: "SLACK_BOT_TOKEN"
          default_channel: "#swe-squad-alerts"

  # Issue tracking systems
  issues:
    default: "github"
    custom:
      linear:
        module: "providers.linear_provider"
        class: "LinearIssueTracker"
        config:
          api_key_env: "LINEAR_API_KEY"
          team_id_env: "LINEAR_TEAM_ID"

  # Sandboxed execution
  sandbox:
    default: "docker"
    custom:
      firecracker:
        module: "providers.firecracker_provider"
        class: "FirecrackerSandboxProvider"
        config:
          kernel_path: "/var/lib/firecracker/vmlinux"
          rootfs_path: "/var/lib/firecracker/rootfs.ext4"

  # Text embeddings
  embedding:
    default: "openai"
    custom:
      local:
        module: "providers.local_embedding"
        class: "LocalEmbeddingProvider"
        config:
          model_name: "all-MiniLM-L6-v2"

  # Vector storage
  vectorstore:
    default: "chroma"
    custom:
      pinecone:
        module: "providers.pinecone_store"
        class: "PineconeVectorStore"
        config:
          api_key_env: "PINECONE_API_KEY"
          index_name: "swe-squad-memory"
          dimension: 1536

  # Task queues
  taskqueue:
    default: "redis"
    custom:
      sqs:
        module: "providers.sqs_queue"
        class: "SQSTaskQueue"
        config:
          region: "us-east-1"
          queue_url: "https://sqs.us-east-1.amazonaws.com/123456789/swe-tasks"
```

### Per-Agent Notification Overrides

Some teams want specific agents to use different notification channels. For example, the reviewer agent might post to a dedicated review channel while the coder sends status updates to the general alerts channel. Configure this in the `agents` section:

```yaml
providers:
  notifications:
    default: "slack"
    custom:
      slack:
        module: "providers.slack_provider"
        class: "SlackNotificationProvider"
        config:
          bot_token_env: "SLACK_BOT_TOKEN"
          default_channel: "#swe-squad-alerts"

agents:
  explorer:
    notifications:
      channel: "#swe-exploration"
  reviewer:
    notifications:
      channel: "#swe-reviews"
      priority: "high"
  coder:
    notifications:
      channel: "#swe-deploys"
```

The per-agent notification settings are passed as keyword arguments when the agent calls `send_notification()`, allowing the provider to route messages to the correct channel.

### Multiple Providers of the Same Type

You can register multiple providers under the same interface type and switch between them by changing the `default` key:

```yaml
providers:
  notifications:
    default: "slack"
    custom:
      slack:
        module: "providers.slack_provider"
        class: "SlackNotificationProvider"
        config:
          bot_token_env: "SLACK_BOT_TOKEN"
          default_channel: "#swe-squad-alerts"
      discord:
        module: "providers.discord_provider"
        class: "DiscordNotificationProvider"
        config:
          webhook_url_env: "DISCORD_WEBHOOK_URL"
          default_username: "SWE-Squad Bot"
```

To switch from Slack to Discord, change `default` from `"slack"` to `"discord"`. No code changes required. You can also route specific agents to specific providers:

```yaml
providers:
  notifications:
    default: "slack"
    custom:
      slack:
        module: "providers.slack_provider"
        class: "SlackNotificationProvider"
        config:
          bot_token_env: "SLACK_BOT_TOKEN"
          default_channel: "#swe-squad-alerts"
      discord:
        module: "providers.discord_provider"
        class: "DiscordNotificationProvider"
        config:
          webhook_url_env: "DISCORD_WEBHOOK_URL"

agents:
  explorer:
    notifications:
      provider: "discord"
  reviewer:
    notifications:
      provider: "slack"
```

### Startup Loading Process

When SWE-Squad starts, the configuration loader processes the `providers` section in this order:

1. Read `swe_team.yaml` and parse the `providers` section.
2. For each provider type (coding, notifications, issues, etc.), identify the `default` provider.
3. For each entry under `custom`, import the specified `module` using Python's importlib.
4. Instantiate the specified `class`, passing the `config` dict to the constructor.
5. Call the provider's `initialize()` method with the full config dict. If `config` contains `*_env` keys, the loader resolves the environment variable values before passing them.
6. Register the instance with `ProviderRegistry` under the interface type and provider name.
7. Run `health_check()` on the default provider for each type. If it returns `False`, log a warning but continue startup.

If a custom module fails to import or a class fails to instantiate, SWE-Squad logs the error and falls back to the built-in default for that provider type. The pipeline does not crash due to a misconfigured custom provider.

---

## 5. Testing Provider Implementations

Thorough testing is critical for provider plugins because they wrap external services with complex failure modes. This section covers unit testing, integration testing, and contract validation patterns.

### Unit Testing with Mocks

Unit tests verify your provider's logic without making real network calls. Mock the HTTP layer and assert that your provider handles responses correctly.

Create a test file at `tests/test_slack_provider.py`:

```python
"""Unit tests for SlackNotificationProvider."""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from providers.slack_provider import SlackNotificationProvider


@pytest.fixture
def provider():
    """Create a provider instance for testing."""
    return SlackNotificationProvider(
        bot_token="xoxb-test-token",
        default_channel="#test-channel"
    )


@pytest.fixture
async def initialized_provider(provider):
    """Create and initialize a provider with a mocked HTTP session."""
    await provider.initialize({})
    yield provider
    await provider.shutdown()


@pytest.mark.asyncio
async def test_health_check_before_initialize(provider):
    """health_check returns False before initialize() is called."""
    assert provider.health_check() is False


@pytest.mark.asyncio
async def test_health_check_after_initialize(initialized_provider):
    """health_check returns True after initialize() is called."""
    assert initialized_provider.health_check() is True


@pytest.mark.asyncio
async def test_health_check_after_shutdown(initialized_provider):
    """health_check returns False after shutdown() is called."""
    await initialized_provider.shutdown()
    assert initialized_provider.health_check() is False


@pytest.mark.asyncio
async def test_send_notification_success(initialized_provider):
    """send_notification returns True when Slack API accepts the message."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"ok": True})
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=False)

    initialized_provider._client.post = MagicMock(return_value=mock_response)

    result = await initialized_provider.send_notification(
        "@U12345678", "Test message"
    )
    assert result is True


@pytest.mark.asyncio
async def test_send_notification_api_error(initialized_provider):
    """send_notification returns False when Slack API returns an error."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={
        "ok": False,
        "error": "channel_not_found"
    })
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=False)

    initialized_provider._client.post = MagicMock(return_value=mock_response)

    result = await initialized_provider.send_notification(
        "#nonexistent", "Test message"
    )
    assert result is False


@pytest.mark.asyncio
async def test_send_notification_rate_limited(initialized_provider):
    """send_notification retries on HTTP 429 and eventually succeeds."""
    rate_limited_response = AsyncMock()
    rate_limited_response.status = 429
    rate_limited_response.headers = {"Retry-After": "0"}
    rate_limited_response.__aenter__ = AsyncMock(
        return_value=rate_limited_response
    )
    rate_limited_response.__aexit__ = AsyncMock(return_value=False)

    success_response = AsyncMock()
    success_response.status = 200
    success_response.json = AsyncMock(return_value={"ok": True})
    success_response.__aenter__ = AsyncMock(return_value=success_response)
    success_response.__aexit__ = AsyncMock(return_value=False)

    initialized_provider._client.post = MagicMock(
        side_effect=[rate_limited_response, success_response]
    )

    # Patch asyncio.sleep to avoid real delays in tests
    with patch("providers.slack_provider.asyncio.sleep",
               new_callable=AsyncMock):
        result = await initialized_provider.send_notification(
            "@U12345678", "Test message"
        )
    assert result is True


@pytest.mark.asyncio
async def test_send_notification_network_error(initialized_provider):
    """send_notification returns False after exhausting retries."""
    import aiohttp

    initialized_provider._client.post = MagicMock(
        side_effect=aiohttp.ClientError("Connection refused")
    )

    with patch("providers.slack_provider.asyncio.sleep",
               new_callable=AsyncMock):
        result = await initialized_provider.send_notification(
            "@U12345678", "Test message"
        )
    assert result is False


@pytest.mark.asyncio
async def test_send_batch(initialized_provider):
    """send_batch returns a dict mapping each recipient to its result."""
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"ok": True})
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=False)

    initialized_provider._client.post = MagicMock(return_value=mock_response)

    with patch("providers.slack_provider.asyncio.sleep",
               new_callable=AsyncMock):
        results = await initialized_provider.send_batch(
            ["@user1", "@user2", "@user3"], "Batch test message"
        )

    assert results == {
        "@user1": True,
        "@user2": True,
        "@user3": True,
    }


@pytest.mark.asyncio
async def test_send_notification_not_initialized(provider):
    """send_notification returns False if the provider is not initialized."""
    result = await provider.send_notification("@user", "message")
    assert result is False


def test_resolve_channel_with_hash(provider):
    """Channel names starting with # are passed through."""
    assert provider._resolve_channel("#general") == "#general"


def test_resolve_channel_with_at(provider):
    """User IDs starting with @ are passed through."""
    assert provider._resolve_channel("@U12345678") == "@U12345678"


def test_resolve_channel_with_channel_id(provider):
    """Channel IDs starting with C are passed through."""
    assert provider._resolve_channel("C12345678") == "C12345678"


def test_resolve_channel_fallback(provider):
    """Unknown formats fall back to the default channel."""
    assert provider._resolve_channel("unknown") == "#test-channel"
```

### Integration Testing Patterns

Integration tests verify that your provider works correctly against the real external service. These tests are slower and require real credentials, so they should be marked separately and run only in CI or on demand.

```python
"""Integration tests for SlackNotificationProvider.

Requires the SLACK_BOT_TOKEN environment variable to be set.
Run with: pytest -m integration tests/test_slack_integration.py
"""

import os
import pytest

from providers.slack_provider import SlackNotificationProvider


@pytest.fixture
async def live_provider():
    """Create a provider connected to the real Slack API."""
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        pytest.skip("SLACK_BOT_TOKEN not set")

    provider = SlackNotificationProvider(
        bot_token=token,
        default_channel="#swe-squad-test"
    )
    await provider.initialize({})
    yield provider
    await provider.shutdown()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_live_send_notification(live_provider):
    """Send a real notification to the test channel."""
    result = await live_provider.send_notification(
        "#swe-squad-test",
        "Integration test message from SWE-Squad provider tests."
    )
    assert result is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_live_send_batch(live_provider):
    """Send batch notifications to the test channel."""
    results = await live_provider.send_batch(
        ["#swe-squad-test"],
        "Batch integration test message."
    )
    assert all(results.values())


@pytest.mark.integration
@pytest.mark.asyncio
async def test_live_health_check(live_provider):
    """Verify health check passes with a live connection."""
    assert live_provider.health_check() is True
```

Run unit tests and integration tests separately:

```bash
# Unit tests only (fast, no network)
pytest tests/test_slack_provider.py -v

# Integration tests only (requires SLACK_BOT_TOKEN)
pytest -m integration tests/test_slack_integration.py -v

# All tests
pytest tests/ -v
```

### Testing Against the Provider Contract

Every provider must implement all abstract methods defined by its interface. Use a contract test to verify that no methods are missing:

```python
"""Contract tests to verify provider implementations satisfy their interface."""

import inspect
from abc import ABC

import pytest

from swe_team.providers import (
    BaseProvider,
    NotificationProvider,
    CodingEngine,
    IssueTracker,
    SandboxProvider,
    EmbeddingProvider,
    VectorStore,
    TaskQueueProvider,
)
from providers.slack_provider import SlackNotificationProvider


def test_slack_provider_inherits_notification_provider():
    """SlackNotificationProvider must inherit from NotificationProvider."""
    assert issubclass(SlackNotificationProvider, NotificationProvider)


def test_slack_provider_inherits_base_provider():
    """SlackNotificationProvider must inherit from BaseProvider."""
    assert issubclass(SlackNotificationProvider, BaseProvider)


def test_all_abstract_methods_implemented():
    """All abstract methods from the interface must be implemented."""

    abstract_methods = set()
    for cls in SlackNotificationProvider.__mro__:
        if hasattr(cls, "__abstractmethods__"):
            abstract_methods.update(cls.__abstractmethods__)

    # After the concrete class, there should be no remaining abstract methods
    assert len(SlackNotificationProvider.__abstractmethods__) == 0, (
        f"Unimplemented abstract methods: "
        f"{SlackNotificationProvider.__abstractmethods__}"
    )


def test_expected_methods_exist():
    """Verify that all required methods are present on the class."""
    required_methods = [
        "initialize",
        "shutdown",
        "health_check",
        "send_notification",
        "send_batch",
    ]
    for method in required_methods:
        assert hasattr(SlackNotificationProvider, method), (
            f"Missing method: {method}"
        )
        assert callable(getattr(SlackNotificationProvider, method))


@pytest.mark.asyncio
async def test_provider_lifecycle():
    """Test the full initialize -> use -> shutdown lifecycle."""
    provider = SlackNotificationProvider(
        bot_token="xoxb-test",
        default_channel="#test"
    )

    # Before initialization
    assert provider.health_check() is False

    # After initialization
    await provider.initialize({})
    assert provider.health_check() is True

    # After shutdown
    await provider.shutdown()
    assert provider.health_check() is False
```

### Mocking External Services

For providers that wrap HTTP APIs, you can use `aioresponses` to mock HTTP responses at the `aiohttp` level. This is more realistic than mocking the `post` method directly because it exercises the full request construction path:

```python
"""Unit tests using aioresponses for HTTP mocking."""

import pytest
from aioresponses import aioresponses

from providers.slack_provider import SlackNotificationProvider


@pytest.fixture
async def provider():
    """Create and initialize a provider for HTTP-level mocking."""
    p = SlackNotificationProvider(
        bot_token="xoxb-test-token",
        default_channel="#test"
    )
    await p.initialize({})
    yield p
    await p.shutdown()


@pytest.mark.asyncio
async def test_send_notification_with_aioresponses(provider):
    """Test send_notification with realistic HTTP mocking."""
    with aioresponses() as mocked:
        mocked.post(
            "https://slack.com/api/chat.postMessage",
            payload={"ok": True}
        )

        result = await provider.send_notification(
            "#test", "Hello from mocked HTTP"
        )
        assert result is True


@pytest.mark.asyncio
async def test_send_notification_server_error(provider):
    """Test send_notification handles 500 errors from Slack."""
    with aioresponses() as mocked:
        mocked.post(
            "https://slack.com/api/chat.postMessage",
            status=500
        )
        # Also mock retries
        mocked.post(
            "https://slack.com/api/chat.postMessage",
            payload={"ok": True}
        )

        import asyncio
        from unittest.mock import patch

        with patch.object(asyncio, "sleep"):
            result = await provider.send_notification(
                "#test", "Retry test"
            )
        assert result is True
```

### Test Configuration Summary

The recommended test configuration for provider plugins:

| Test Type | Scope | Speed | Network | When to Run |
|-----------|-------|-------|---------|-------------|
| Contract tests | Interface compliance | Fast | No | Every commit |
| Unit tests (mocked) | Internal logic | Fast | No | Every commit |
| Unit tests (aioresponses) | HTTP handling | Fast | No | Every commit |
| Integration tests | Real API | Slow | Yes | Pre-merge / CI |
| End-to-end tests | Full pipeline | Slow | Yes | Release |

### Checklist for New Provider Plugins

Before submitting a custom provider, verify that it passes all of the following checks:

- [ ] Inherits from the correct abstract interface (e.g., `NotificationProvider`)
- [ ] Implements all abstract methods from both the interface and `BaseProvider`
- [ ] `initialize()` creates resources, `shutdown()` releases them, `health_check()` reports status
- [ ] All external network calls are wrapped in try/except with appropriate error logging
- [ ] Retry logic handles transient failures with exponential backoff
- [ ] Rate limiting responses (HTTP 429) are respected
- [ ] The provider can be configured entirely through `swe_team.yaml` without code changes
- [ ] Secrets are read from environment variables, never hardcoded
- [ ] Unit tests cover success, error, rate-limiting, and network-failure scenarios
- [ ] Contract tests confirm all abstract methods are implemented
- [ ] The provider is registered in `swe_team.yaml` with a unique name under the correct interface type
