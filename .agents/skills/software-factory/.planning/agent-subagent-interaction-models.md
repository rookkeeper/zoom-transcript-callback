# Agent–subagent interaction models

Research note for choosing a **default worker interaction contract** that works in Pi now and can be adapted to other harnesses. “Clawed” is interpreted as **Claude Code**. Focus: launch/wait/message behaviors, not a general comparison of agent quality.

## Short recommendation

Make the factory's conceptual primitive a **tracked job with a stable ID**, not “call a subagent and hope.” Support three common ways to consume it:

1. **Run and return (synchronous):** launch one or more workers; parent waits for the requested result(s), then continues. Parallel fan-out can join all, or explicitly proceed when one/any threshold completes.
2. **Background with notification (asynchronous):** launch and receive job IDs immediately; parent continues its turn/work. Progress and terminal results are made visible and delivered to the orchestrator as a notification/message; the orchestrator can inspect/retrieve them.
3. **Long-lived, steerable worker/team:** keep a named worker addressable; send it new direction, request status, cancel, or resume it. This is not necessary for every adapter, but is valuable for work that needs iterative supervision.

Offer literal **fire-and-forget** only as an explicit low-stakes option. If nobody receives completion or failure, it is not useful for task execution and can leave invisible abandoned work. Even detached jobs should be registered, observable, and recoverable.

## Taxonomy: separate dimensions

These are composable dimensions, not mutually exclusive “agent types.”

### 1. How launch couples to the parent

- **Blocking/foreground:** the delegate operation holds the parent until the worker finishes. The final answer is returned in the same call/turn.
- **Background/non-blocking:** launch returns promptly; parent can keep working while the worker runs.
- **Detached/fire-and-forget:** launch returns and no automatic join/result handoff is promised. Parent may never learn outcome unless it polls or checks shared state.

### 2. How results arrive

- **Return value / join:** final outputs return directly to the launch call; can join one, all, or a policy such as first acceptable result.
- **Completion event / push:** a worker completion (or failure/question) is injected or routed to the parent later, often on its next turn.
- **Explicit wait/poll/retrieve:** parent checks task state or waits by ID, then fetches output. This is valuable even when push notifications exist: notifications may be missed during process/session interruption.
- **Progress stream:** status/tool-call updates arrive while work is running; distinguish informational progress from a request that needs an answer.

### 3. How follow-up control works

- **One-shot:** no further interaction; result only.
- **Steer/message:** send task clarification or revised direction to a running worker; optionally worker can ask a question back.
- **Cancel/stop:** terminate one worker without cancelling siblings/parent.
- **Resume:** restart a stopped/finished worker with its previous context under a stable identity, or create a new worker with a continuation brief. These are different guarantees; adapters must state which they provide.
- **Inspect:** open its transcript/log/artifacts and see current state.

### 4. Number and relationship of workers

- **Single delegate.**
- **Parallel fan-out / fan-in:** independent assignments in parallel, then wait for all, any, or a declared subset and synthesize results.
- **Sequential chain/pipeline:** downstream worker starts with an upstream result; parent coordinates each transition.
- **Nested delegation:** a worker launches children. Useful for decomposition, but requires explicit depth/concurrency limits and ownership rules.
- **Team/peer collaboration:** multiple persistent agents communicate or share a task board. This is more than parent-child delegation and requires coordination/conflict controls.

### 5. Context and workspace

- **Fresh context:** give worker only an explicit task brief and relevant references; low context leakage, more handoff work.
- **Conversation fork:** worker inherits parent conversation; useful for a side investigation needing history, but expensive and less isolated.
- **Shared vs isolated workspace:** read-only investigation, shared checkout, or per-task worktree. This is independent of whether execution is foreground/background. Write workers need clear ownership/isolation to avoid conflicting edits.

## Framework comparison

### Claude Code

Official docs: [Subagents](https://code.claude.com/docs/en/sub-agents), [Agent teams](https://code.claude.com/docs/en/agent-teams), [Agent view](https://code.claude.com/docs/en/agent-view), [Cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging).

- The Agent tool can run a **foreground** subagent (parent waits) or a **background** subagent (parent continues). Claude chooses based on mode/context; interactive fork mode normally backgrounds spawned subagents. Users can press `Ctrl+B` to background a running task. `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` forces foreground.
- In background mode, completion is delivered to Claude as a notification on a later turn; it can report still-running status if asked early. `/tasks` and the task panel expose status/transcript. Permission prompts from a background agent surface in the main session.
- Parallel invocations are supported; ask Claude to run independent investigations in parallel. It gathers their reports for synthesis. Output volume can consume parent context.
- Named agents are addressable. `SendMessage` can steer or resume a subagent by ID/name; completed agents can resume with conversation history. Subagents can report questions/messages through the supported messaging flow. A subagent can also launch nested subagents (default up to three layers below main, with limits).
- A **fork** inherits the whole conversation but returns only its final result; separate from ordinary fresh-context subagents.
- **Agent teams** are a distinct collaboration mode: persistent teammates, shared task coordination, and messaging, not simply “a few subagents whose results are joined.”
- Version-sensitive behaviors exist; Claude docs explicitly call out tool availability differences between foreground/background and changing version gates. Follow current docs at integration time.

### OpenAI Codex

Official docs: [Subagents](https://developers.openai.com/codex/multi-agent/) (currently redirects to OpenAI's subagent guidance).

- Current Codex releases support spawning multiple specialized agents/threads and collecting summarized results. CLI exposes agent threads (`/agent`) while they run; app/IDE clients expose activity and child threads.
- Orchestration handles spawning, follow-up direction, waiting for results, and closing threads. A prompt can explicitly say whether to wait for all results; guidance recommends that a delegation brief define the split, wait condition, and expected summary.
- The user can inspect a child thread and ask Codex to steer a running agent, stop it, or close completed threads. Agents inherit parent sandbox/permission policy; approval requests can be attributed to an inactive child.
- Parallel read-heavy work (exploration, triage, tests, review) is the recommended starting point; simultaneous write-heavy work needs caution.
- Current official overview describes workflow orchestration and inspect/steer/stop, but does not specify a portable low-level “launch and inject completion callback” API or promise arbitrary detached fire-and-forget semantics. Treat the exact wait/notification behavior as client/runtime-specific; specify it in an adapter instead of assuming Claude parity.

### Pi

Pi docs: [Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md); [official subagent example](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/subagent). Local installed Pi checked: `@earendil-works/pi-coding-agent` **0.87.1**.

- Pi core deliberately has no built-in subagent orchestration; extensions can implement it. Core/extension APIs permit custom tools and external processes.
- The official example registers a `subagent` tool and spawns separate Pi processes. It supports **single**, **parallel** (example limit: max 8 requested, 4 concurrent), and **chain** modes; streams progress/tool calls, returns final results through the tool result, tracks usage, and propagates abort (Ctrl+C).
- This is principally **call-and-wait from the parent model's perspective**: the parent tool call stays active until requested subprocess work returns. The example does not document a “return job ID, let parent continue, inject later completion” mode, nor persistent named worker resume/steer as its interaction contract. A separate extension/adapter could add those using process/session controls plus shared durable state/events.
- It supports separate contexts and agent definitions; project-agent scope/trust and child process permissions are important security considerations.
- `tmux`/multiple Pi sessions are another possible adapter, but require a tested protocol for status, questions, completion delivery, cancellation, restart, and workspace ownership.

### OpenCode (additional current comparison)

Official docs: [OpenCode v2 agents](https://opencode.ai/v2/docs/agents/); [legacy/current agents page](https://opencode.ai/docs/agents/).

- The v2 docs explicitly describe subagents in **foreground or background child sessions**, with fresh context. Agent mode/permissions determine which child agents a parent may invoke. The exact completion/wait semantics should be tested against the selected v2 release; do not infer them solely from “background.”
- Older docs describe child-session navigation and automatic/manual invocation; current v2 has a separate docs surface, so version matters. There are third-party plugins for async delegation, but they are not the native contract and some are explicitly retired for v2.

## Portable factory contract proposal

A useful lowest common denominator can be implemented even when the harness offers no subagents:

### Operations

```text
start(task, context, workspace, mode) -> job_id
status(job_id) -> state + concise progress
wait(job_ids, condition=all|any|subset, timeout?) -> completed states
result(job_id) -> final report/artifact pointers
message(job_id, direction, body) -> accepted/rejected
cancel(job_id) -> stop status
resume(job_id, continuation?) -> running state or explicit unsupported
list() -> active/recent jobs
```

An adapter may implement these as tools, extension calls, tmux commands, process handles, RPC sessions, or native framework features. Explicitly declare unsupported operations; never silently pretend a one-shot synchronous delegate is async/resumable.

### Lifecycle and event behavior

Use stable job IDs and explicit transitions such as `starting → running → needs_input | succeeded | failed | cancelled`; terminal states do not regress. Persist state before emitting terminal notification. Keep outputs/artifacts retrievable if notification delivery is missed. Distinguish worker progress from a question that blocks it. A worker request for human judgment routes to the orchestrator, not peer agents. On orchestrator restart, reconcile registry with actual process/session state before resuming or relaunching.

### Recommended default policy

- Short, bounded read-only work: synchronous single call or parallel join; ask for a concise summary and evidence.
- Independent long-running work: start in background, return IDs immediately, continue orchestrator work, receive/report progress and completion notifications, then retrieve results by ID. Allow explicit `wait(all|any)` when downstream work depends on results.
- Code-writing task: isolated worktree and named/registered task worker; background by default only if status, questions, cancellation, recovery, and eventual result delivery have been proven in that adapter. Otherwise prefer synchronous tool mode or keep the task explicitly in progress across sessions.
- Fire-and-forget: only for disposable work where no result, QA, or cleanup is required. Never use for a task represented as complete-able factory work.
- Default concurrency recommendation: three workers, user configurable. User decides whether workers may spawn subworkers. If allowed, impose agreed depth/concurrency and require escalation/decomposition when scope is too large.
- No worker-to-worker coordination by default. The orchestrator remains the sole user-facing coordinator.

## Open design/testing questions

1. When a worker asks a question, does it pause and emit an event while other workers continue? Can the orchestrator answer asynchronously without resending the full task?
2. Does “background” survive closing/restarting the parent process, or only yield during the current turn? Test this explicitly per adapter.
3. For parallel fan-out, should default join be all-results, first-result, or allow per-task selection? Factory implementation/QA normally needs all assigned results.
4. How is cancellation scoped: one task, its descendants, or whole batch? Who owns cleanup after cancellation?
5. Where do progress logs and full outputs live, and how are compact summaries kept out of the parent context until useful?
6. What branch/worktree rules prevent write-worker collisions when adapters permit simultaneous changes?

## Sources and caveats

Official docs are live and version-sensitive; consult them again when implementing an adapter. Pi details above were checked against local version 0.87.1 and its bundled example. Codex page is OpenAI's current subagent overview and may describe multiple clients rather than a single CLI API. OpenCode v2 and v1 docs differ. No claim here that all products expose identical control or persistence semantics.
