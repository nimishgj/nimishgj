---
layout: post
title: "Right-Sized Observability: How to Avoid Both Blind Spots and Noise"
date: 2025-12-06 12:00:00 +0530
tags: [observability, devops]
---

As developers, we've all been there: chasing a bug that feels like hunting
a ghost through a dark, distributed system. Observability—the ability to
understand a system's internal state from its external outputs (metrics,
logs, and traces)—is the ultimate flashlight. When a system breaks, it's
not enough to know what went wrong; we need to know why.

My journey to the "observability sweet spot" has been a series of high-cost,
high-stress lessons. I've learned that observability is not a binary choice—it's
a dial you have to constantly fine-tune. Too much, and you're drowning in noise
and cost; too little, and you're blind when it matters most.

## What happens when there is too much telemetry data

>The pursuit of total visibility is a tempting, and ultimately, a costly one.

My peak obsession with data came after a painful, hour-long outage. I vowed,
"Never again will I not know exactly what line of code caused the failure!"
The solution? Instrument everything.
I implemented end-to-end tracing that was comprehensive, tracing a single user
request from the ALB through all microservices, to Redis, the Database, and back.
I went a step further, instrumenting every single function to log its inputs and
outputs.

Then the nightmare began we got an alert for increase in 5xx responses

The Data Avalanche: That single trace contained around 30,000 spans.

When I tried to load and filter the trace in the observability platform,
my browser froze. It simply couldn't handle rendering and processing that
much high-cardinality data.
What should have been a 10-minute root cause analysis turned into a
30-40 minute session of limiting data, exporting, and incrementally
sifting through the noise.

The hard truth? The massive investment in instrumentation and storage
did not justify the time it actually took to debug the issue. We had
visibility, but we had lost actionability. This is the painful cost of
data volume over data value.

## What happens when there is very less telemetry data

Burned by the cost and complexity of the data flood, I overcorrected.
I drastically reduced telemetry, only setting up alerts on the most
crucial, high-level metrics—the bare minimum required to hit our
Service Level Objectives (SLOs).

For a couple of weeks, life was quiet. Then, we got an alert: our
application was experiencing a major slowdown due to receiving
too much data from a queue.

My first thought was, "Scale up!" We added more replicas, but the
problem persisted. Looking at the bare-bones metrics, I noticed
something worse: application pods were getting restarted multiple
times a day. Since this was happening frequently and recovering quickly,
the cumulative error rate never crossed the high threshold I'd set for
an immediate, pager-firing alert.

Lesson learnt
> Don't just alert on "Something is broken." Alert on
"Something is starting to go wrong."

My initial alerts were **reactive**. The silent restarts were a sign of
resource saturation or a memory leak that had been brewing for days.
By the time the "major incident" alert fired, the problem was already
systemic and complex. We needed **proactive** alerts on signals like
consistently increasing latency, a downward trend in throughput,
or high saturation indicators (like consistently high memory or
CPU utilization), often known as the Four Golden Signals
(Latency, Traffic, Errors, Saturation).

## Finding the Observability Sweet Spot

So, how do we find the balance? It's not about static,
set-it-and-forget-it instrumentation. It's an ever-evolving
decision tied directly to what you need to know right now.

Here are the developer-centric principles I now follow to
hit that sweet spot:

### 1. Shift from Volume to Value

Every piece of telemetry—metric, log line, or span—must
answer a potential question related to system health or
business value.

### 2. Log Smarter, Not Harder

Avoid logging at the `DEBUG` level in production.
Ensure your logs are structured (JSON) and contain
a trace ID so you can easily correlate the log event
to a specific request trace.

### 3. Define the "Why" Before You Instrument

Before adding a new metric or span, ask this question:
What is the worst-case scenario this data will help me
debug, and what is its business impact?

## Conclusion

The journey to optimal observability is a continuous one.
It requires the discipline to trim the fat and the foresight
to add just the right amount of signal where it matters most.
It's about being strategic, not comprehensive. It's about
getting the answer you need quickly, not having all 30,000
potential answers crashing your browser.
