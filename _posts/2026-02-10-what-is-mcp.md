---
layout: post
title: "Why AI Needed Its Own Protocol"
date: 2026-02-10 12:00:00 +0530
tags: [mcp, ai, apis]
---

If you've built anything with REST APIs, you know the drill. You have endpoints, you send requests, you get responses. It works. It's been working for over two decades.

But something shifted. AI assistants — Claude, Gemini, ChatGPT — started becoming genuinely useful. Not just for generating code snippets, but for doing real work. Querying databases. Checking logs. Investigating production issues.

And suddenly, REST APIs weren't quite enough. Not because they're broken. Because the way AI needs to interact with systems is fundamentally different from how humans or apps do.

That's where MCP comes in.

## First, let's remember how REST works

You have a server. It exposes endpoints. A client sends HTTP requests.

```
Client                          Server
  │                               │
  │  GET /api/users/123           │
  │──────────────────────────────►│
  │                               │
  │  { "name": "Nimisha", ... }   │
  │◄──────────────────────────────│
  │                               │
```

Simple. The client knows exactly what endpoint to hit, what parameters to send, and what the response looks like. The client is a piece of code written by a developer who read the API docs, understood the schema, and hardcoded the integration.

This works perfectly when the client is an app. A mobile app knows it needs to call `/api/users/123` because a developer wrote that code. A frontend knows to POST to `/api/orders` because someone wired it up.

But what if the client is an AI?

## The problem: AI doesn't read your API docs

Imagine you want Claude to help you debug a production issue. You'd say something like: *"Why is the payment service slow?"*

For Claude to answer that, it needs to:
1. Figure out what services exist
2. Find the payment service
3. Query traces for that service
4. Filter for slow requests
5. Maybe look at the span breakdown
6. Interpret the data
7. Tell you what's wrong

With a REST API, Claude would need to know:
- The base URL of your API
- Every endpoint path (`/api/v1/services`, `/api/v1/traces`, `/api/v1/spans/{id}`)
- The request format for each endpoint
- What query parameters are available
- How authentication works
- What the response schema looks like

That's a lot of hardcoded knowledge. And it's different for every API. Your observability platform has different endpoints than your e-commerce backend, which has different endpoints than your CI/CD system.

You'd have to write custom integration code for every single API. That's what we've been doing for years — building Slack bots, writing scripts, creating dashboards. All of it is custom glue code between a system and its consumers.

## What if the AI could discover what's available?

This is the core idea behind MCP (Model Context Protocol). Instead of the AI needing to know your API upfront, the server **tells the AI what it can do**.

```
AI Assistant                    MCP Server
  │                               │
  │  "What tools do you have?"    │
  │──────────────────────────────►│
  │                               │
  │  Here are my tools:           │
  │  - get_services               │
  │  - search_traces              │
  │  - query_logs                 │
  │  - get_metrics                │
  │  Each with descriptions       │
  │  and parameter schemas        │
  │◄──────────────────────────────│
  │                               │
```

The AI now knows what buttons it can press. It knows each tool's purpose, what parameters are required vs optional, and what kind of data comes back. No hardcoded integration. No custom glue code.

This is called **tool discovery**, and it's the thing that makes MCP fundamentally different from REST.

## REST vs MCP: a side-by-side

Let's trace through the same scenario — "Why is the payment service slow?" — with both approaches.

### With REST (traditional integration)

A developer needs to build this entire flow in advance:

```
Developer writes code:
  1. Call GET /api/v1/services → parse response
  2. Find "payment-service" in the list
  3. Call GET /api/v1/traces?service=payment-service&min_duration=1s
  4. Parse the traces, pick the slowest one
  5. Call GET /api/v1/traces/{trace_id}/spans
  6. Format everything into a readable output

This code is:
  - Specific to this one API
  - Breaks if endpoints change
  - Needs updating when new features are added
  - Only does what the developer anticipated
```

The user gets a pre-built dashboard or a script that does exactly these steps. Nothing more, nothing less.

### With MCP

No developer writes integration code. The AI figures it out at runtime:

```
┌───────────────────┐                    ┌──────────────────┐
│   AI Assistant    │                    │   MCP Server     │
│                   │                    │                  │
│ User asks: "Why   │  1. discover tools │                  │
│ is payment slow?" │───────────────────►│  Returns: 9 tools│
│                   │◄───────────────────│  with schemas    │
│                   │                    │                  │
│ AI thinks: I need │  2. get_services() │                  │
│ to find services  │───────────────────►│  Returns list    │
│ first             │◄───────────────────│                  │
│                   │                    │                  │
│ AI thinks: found  │  3. search_traces  │                  │
│ payment-service,  │  (service, 1s min) │                  │
│ let me get slow   │───────────────────►│  Returns traces  │
│ traces            │◄───────────────────│                  │
│                   │                    │                  │
│ AI thinks: let me │  4. get_trace_by_id│                  │
│ drill into the    │───────────────────►│  Returns spans   │
│ slowest one       │◄───────────────────│                  │
│                   │                    │                  │
│ AI: "The payment  │                    │                  │
│ gateway span is   │                    │                  │
│ the bottleneck,   │                    │                  │
│ taking 3.2s..."   │                    │                  │
└───────────────────┘                    └──────────────────┘
```

Nobody programmed this flow. The AI decided on its own to:
1. List services first (because it didn't know the exact service name)
2. Search for slow traces
3. Drill into the slowest one
4. Explain the root cause

Tomorrow, if you ask a completely different question — *"Were there any errors after the last deployment?"* — the AI will use the same tools in a completely different order with completely different parameters. No code changes needed.

## What REST API was lacking

REST isn't broken. It's brilliant for app-to-app communication. But it wasn't designed for AI-to-app communication. Here's what's missing:

### 1. No self-description

A REST API doesn't tell you what it can do. You need docs, OpenAPI specs, or trial and error. A human developer reads the docs once and writes code. But an AI needs to understand capabilities dynamically, at runtime, every time it connects.

MCP servers describe themselves. When the AI connects, it gets a complete catalog of tools, their descriptions in natural language, and structured parameter schemas. The AI reads these descriptions the same way you'd read API docs — except it does it automatically every time.

### 2. No semantic context

REST endpoints are mechanical: `GET /api/v1/traces?service=foo&limit=10`. There's no explanation of *when* you'd use this endpoint vs another, or *why* you'd want to filter by service.

MCP tools come with natural language descriptions:

```
Tool: search_traces
Description: "Query traces from a service with optional filters.
Supports filtering by span name, status code, and attributes.
Use discover_spans first to understand available span names."
```

That last sentence — *"Use discover_spans first"* — is a hint that helps the AI plan its query strategy. REST doesn't have a place for this.

### 3. No standard for tool calling

REST has conventions (GET for reads, POST for writes, status codes for errors) but no standard way to say "here's a function, here are its typed parameters, call it and get structured results back."

Every REST API is different. Query parameters here, request body there, headers for auth, path parameters for IDs. Each API has its own conventions.

MCP standardizes this. Every tool has:
- A name
- A description
- An input schema (JSON Schema for parameters)
- An output schema (what comes back)

```
┌────────────────────────────────────────────┐
│              MCP Tool Definition           │
├────────────────────────────────────────────┤
│  Name: query_logs                          │
│                                            │
│  Description: Query logs from a service    │
│  with optional filters. Supports severity, │
│  body content, and attribute filtering.    │
│                                            │
│  Parameters:                               │
│  ├─ service_name (string, required)        │
│  ├─ start_time (RFC3339, required)         │
│  ├─ end_time (RFC3339, required)           │
│  ├─ severity (array, optional)             │
│  │   └─ enum: DEBUG, INFO, WARN, ERROR     │
│  ├─ body_contains (string, optional)       │
│  └─ limit (integer, optional, default 100) │
│                                            │
│  Returns: Array of log entries with        │
│  timestamp, severity, body, trace_id       │
└────────────────────────────────────────────┘
```

The AI reads this schema and knows exactly how to call the tool. No guessing, no trial and error.

### 4. No built-in auth handshake

REST APIs use various auth mechanisms — API keys, OAuth, JWTs, cookies. Each requires different setup. MCP has a built-in OAuth flow. When the AI connects to an MCP server, authentication happens as part of the protocol. The user logs in once via their browser, and the AI gets a token. No API key management, no manual token passing.

## "But isn't MCP just an API call?"

Yes. Under the hood, when an AI calls an MCP tool, it's ultimately making a request and getting a response. You could build the same thing with REST endpoints. So why call it something new?

For the same reason REST is a thing.

REST is just HTTP. You could do everything REST does with raw HTTP requests and your own conventions. But REST defines *semantics* — use GET for reads, POST for writes, status codes mean this, URLs are structured that way. Those shared conventions mean any REST client can talk to any REST server without custom integration code.

MCP does the same thing, but for AI-to-tool communication. It defines semantics for how an AI discovers tools, how tools describe their parameters, how the AI calls them, and how results come back. Without MCP, every team would invent their own way to expose tools to AI — different URL structures, different schema formats, different auth flows. With MCP, you write one server and it works with Claude, Gemini, and any future AI assistant that supports the protocol.

```
REST  = semantics for app-to-app communication over HTTP
MCP   = semantics for AI-to-tool communication over a transport layer
```

### Transport types

MCP isn't tied to HTTP. The protocol supports multiple [transport types](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports):

**stdio** — communication over standard input/output. The MCP server runs as a local process, and the AI client talks to it via stdin/stdout. This is the most common transport for local tools (file system access, code execution, etc.). No network involved.

**Streamable HTTP** — the standard for remote MCP servers. The client sends HTTP POST requests to call tools, and the server can optionally use Server-Sent Events (SSE) to stream responses. This is what you'd use for a hosted service like an observability platform or a database.

**SSE (legacy)** — the original remote transport, now deprecated in favor of Streamable HTTP. It required two separate endpoints — one for requests (HTTP POST) and another for responses (SSE stream). Streamable HTTP simplified this into a single endpoint.

```
┌──────────────────────────────────────────────────────┐
│                  MCP Transports                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  stdio              For local tools                  │
│  AI ◄──stdin/stdout──► MCP Server (local process)    │
│                                                      │
│  Streamable HTTP    For remote services              │
│  AI ◄──HTTP POST/SSE──► MCP Server (hosted)          │
│                                                      │
│  SSE (deprecated)   Legacy remote transport          │
│  AI ◄──POST + SSE──► MCP Server (two endpoints)      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

The transport is an implementation detail. The tool discovery, tool calling, and schema format work the same way regardless of which transport you use. Just like REST works the same whether you're on HTTP/1.1 or HTTP/2 — the semantics don't change.

## How MCP actually works under the hood

MCP is a protocol — a set of rules for how AI assistants and servers communicate. It's not a framework or a library. It's a specification, similar to how HTTP is a specification.

Here's the lifecycle of an MCP connection:

```
Phase 1: Connect & Authenticate
┌──────────┐                        ┌──────────┐
│    AI    │── connect ────────────►│  Server  │
│  Client  │◄── OAuth redirect ──── │          │
│          │── user logs in ───────►│          │
│          │◄── token issued ───── ─│          │
└──────────┘                        └──────────┘

Phase 2: Discover Tools
┌──────────┐                        ┌──────────┐
│    AI    │── list tools ─────────►│  Server  │
│  Client  │◄── tool definitions ── │          │
│          │   (names, schemas,     │          │
│          │    descriptions)       │          │
└──────────┘                        └──────────┘

Phase 3: Use Tools (repeated)
┌──────────┐                        ┌──────────┐
│    AI    │── call tool X(args) ──►│  Server  │
│  Client  │◄── result data ─────── │          │
│          │                        │          │
│          │── call tool Y(args) ──►│          │
│          │◄── result data ────── ─│          │
└──────────┘                        └──────────┘
```

Phase 1 happens once. Phase 2 happens once per connection. Phase 3 happens as many times as needed to answer your question.

The key insight: **the AI decides which tools to call and in what order**. The server just executes individual requests and returns data. All the intelligence — the multi-step reasoning, the strategy, the interpretation — lives in the AI.

## A useful analogy

Think of it like a new employee joining your company.

**REST approach**: You hand them a 200-page internal wiki with every process, every system, every endpoint documented. They need to read it all, understand it, and memorize which system to query for what. When systems change, someone needs to update the wiki and the employee needs to re-read it.

**MCP approach**: You give them access to a set of tools — a dashboard, a log viewer, a trace explorer. Each tool has a clear label and description. The employee looks at what's available, understands what each tool does, and uses them to investigate problems. When a new tool is added, it just appears in their toolkit with a description. No wiki update needed.

The employee's skill is in knowing *how* to investigate — what to look at first, how to connect the dots, when to dig deeper. The tools just give them access to the data.

That's exactly how an AI works with MCP. The tools give access. The AI brings the reasoning.

## Who builds what

If you're a developer, you might be wondering: what do I need to build?

```
┌─────────────────────────────────────────────────────┐
│                  You DON'T build                    │
│                                                     │
│  The AI assistant (Claude, Gemini, etc.)            │
│  - Already knows how to use MCP                     │
│  - Already knows how to reason about tools          │
│  - Already knows how to chain multi-step queries    │
│                                                     │
│  The MCP protocol                                   │
│  - Already specified and standardized               │
│  - Client libraries exist for major languages       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   You DO build                      │
│                                                     │
│  The MCP server                                     │
│  - Define tools (name, description, parameters)     │
│  - Implement the execution logic (database queries, │
│    API calls, calculations, etc.)                   │
│  - Handle authentication                            │
│                                                     │
│  That's it. The AI handles everything else.         │
└─────────────────────────────────────────────────────┘
```

Building an MCP server is conceptually simple: you define a list of functions with typed parameters, implement what each function does, and expose them over the MCP protocol. The AI takes care of figuring out when and how to use them.

## Where this is headed

MCP is still early. Anthropic published the spec, and it's being adopted across the ecosystem. Claude, Gemini, and others already support it natively.

The interesting part isn't the protocol itself — it's what it enables. Every internal tool, every database, every monitoring system can become an MCP server. Your AI assistant stops being a chatbot that guesses, and becomes an operator that works with real data.

I'm part of the team building this at [Base14](https://base14.io). Our observability platform exposes traces, logs, metrics, service topology, and alerts as MCP tools. When you connect Claude or Gemini to it, the AI can investigate production issues using your actual data — not hallucinations.

And the experience is surprisingly natural. You just ask a question in plain English, and the AI figures out which tools to call, in what order, and how to interpret the results. No dashboards to navigate. No query languages to learn. Just a conversation.

That's the promise of MCP. Not replacing REST APIs — they'll continue powering app-to-app communication for decades. But for the new world where AI is the client, something different was needed. Something that lets the AI discover, reason, and act.

MCP is that something.
