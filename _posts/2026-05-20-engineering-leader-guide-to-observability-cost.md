---
layout: post
title: "The Engineering Leader's Guide to Observability Cost"
date: 2026-05-20 12:00:00 +0530
tags: [observability, devops]
---

There's a strange thing about good observability. When it's
actually working, you stop noticing it.

Think about the last time your monitoring really earned its
keep. Maybe an alert fired and was already handled by the time
you logged in. Maybe somebody caught a memory leak in canary
and quietly fixed it before it ever touched production. That
kind of work doesn't really leave anything behind. No
postmortem. No Slack thread. Just a thing that quietly didn't
go wrong.

And that is the catch. Anything that looks like nothing
happening is the first thing on the chopping block the moment
budgets get tight.

## The Conversation Nobody Wins

You have probably been in a version of this.

A team starts taking observability seriously. Traces get
added, alerts get cleaned up, some real dashboards finally
get built. Slowly things just... get better. Incidents drop.
On-call stops being a horror story. Customer complaints quiet
down.

A year goes by. Someone in finance opens the observability
bill, gasps, and the question lands in your inbox.

> "We haven't had a major incident in six months. Do we really
> need to spend this much on monitoring?"

The actually-true answer is "yes, that is exactly *why* we
haven't had a major incident." But good luck proving that. The
thing you would prove it with — a record of all the bad things
that didn't happen — was never collected. No system on earth
is built to count nothing.

So the budget gets cut. Six months later the incidents quietly
come back. And nobody connects it to the cuts.

## Why Prevention Always Gets Underpaid

This isn't an observability-only thing. It's the same problem
that messes with vaccines, fire alarms, and security teams.
You can count what happened. You cannot easily count what
would have happened. So anything that prevents bad outcomes
ends up looking expensive, because the thing you would compare
it to is invisible.

In observability there are three things that make this worse.

The wins are not in any system. A trace that helped somebody
fix a bug in 10 minutes instead of 2 hours doesn't get logged
as "saved 110 minutes." It just gets closed.

The data that prevented incidents is the same data you are
told to cut. The "noisy" logs. The high-cardinality metrics.
The verbose traces. They are expensive because they cover edge
cases. The edge cases that happen once a quarter and save you
a full day when they do.

And then survivorship bias. The team that prevents incidents
looks identical, from the outside, to the team that just
doesn't have any. Both have quiet on-call. The difference only
shows up when one of them stops investing.

## What Has Actually Worked for Me

I can't make invisible value visible. But I've learnt a few
things that make it legible enough that leadership will at
least recognise it.

### Keep a Prevention Log

Just a shared doc. One line per save. Date, what got caught,
what would have happened otherwise.

Mine looks something like:

- *2026-04-12: Canary caught a 40% p95 latency spike before
  full rollout. Without that, full prod rollback. Maybe 10k
  users affected.*
- *2026-04-19: Memory growth alert fired, pod restarted
  preemptively. No customer impact. Would have OOM'd around
  peak traffic, probably 2 hours of degraded service.*

I spend about five minutes a week on this. Once a quarter,
it is the single most useful document in the budget
conversation. It doesn't prove anything in a strict sense,
but it turns "nothing happened" into "here is specifically
what didn't happen, and here is why."

### Argue in Deltas, Not Absolutes

Don't say "observability is valuable." That sentence does not
survive contact with a finance team.

Say this instead: "Last year Q1, 4 customer-facing incidents,
18 hours of degraded service. This year Q1, with the new
tracing setup, 1 incident, 2 hours."

The number is the number. Let it speak.

### Know What You Are Actually Paying For

Before you can justify observability cost, you need to know what
is actually in it. Most engineering leaders cannot break down
their own bill cleanly, and that is the first problem.

There are two halves to the cost. The first is the visible bill.
Ingestion. Retention. Query compute. Licenses, per host or per
seat. That is what shows up on the invoice every month, and that
is what finance is staring at.

The second half is the one most leaders forget to count. The
*absence* of observability has a cost too, and it does not show
up on any invoice. Longer MTTR means more revenue lost per
incident. On-call burnout has a real attrition cost — losing one
senior engineer to a brutal on-call rotation costs more than a
year of observability spend, easily. Repeated reliability issues
quietly churn customers. Brand damage from public outages is
real but very hard to price.

A CFO who only sees the visible bill will always think you are
overspending. A CFO who sees both columns understands that the
choice is not "spend money on observability" or "spend nothing."
It is "spend a known amount on observability" or "spend an
unknown, larger amount on the things observability prevents."

The first thing to do before any justification conversation is
write down both columns. Visible cost: itemised, with rupee
amounts. Hidden cost: estimated, with assumptions visible. You
are not arguing about the visible column anymore. You are arguing
about the comparison.

### Put Real Numbers Behind It

The prevention log and the delta framing are useful, but
eventually somebody in finance is going to ask the
actually-hard question.

> "Fine. What is observability costing us per order?"

It is a fair question. Every other line item gets compared
this way. Payment processing has a per-order cost. Hosting
has a per-order cost. Support has a per-order cost. There
is no good reason observability should not have one too.

Total annual observability spend divided by total orders for
the year. That is the number. Now you have something a CFO
can put next to literally anything else on the books. If it
is ₹4 per order and your gross margin per order is ₹400, the
argument is suddenly very different. You are not defending a
big-sounding total. You are defending a 1% line item.

The math runs the other way too. For every incident your
monitoring caught early, you can estimate the impact if it
hadn't. The rough version:

> Revenue at risk per hour = annual revenue ÷ hours in a year
> × percent of revenue that depends on this system.

For most product companies, that comes out somewhere between
₹50K and ₹5L of revenue per hour of full downtime, depending
on scale. Even at the low end, preventing a 2-hour outage is
₹1L of revenue you did not lose. You don't need precise
numbers here. You need defensible ones. A range with the
assumptions visible will always beat a precise number with
nothing behind it.

Run this across the real entries in the prevention log, sum
it up, and put your observability cost next to it. The ratio
is the actual argument.

If you are walking into a meeting with finance, the words
you need are not "traces" or "spans." They are cost per order,
revenue avoided, engineering hours reclaimed times loaded
cost per hour, and payback period. Same metrics you already
had. Different labels. Very different reception.

The cleanest version of this argument I have heard came from
a friend who runs SRE at a larger company:

> "We are spending less on observability than we would lose
> to one bad incident a year. Last year, we caught seven."

That is the whole argument in one sentence. Every word backed
by a number.

### Don't Buy the "No Incidents, Don't Need It" Argument

When this comes up — and it will — the answer is simple. The
absence of incidents is the deliverable. You wouldn't fire
your security team because there hasn't been a breach. Same
logic.

That argument doesn't always win the room. But it is the
right argument to be making.

### Handle the Other Common CFO Pushbacks

If you have done all of the above, you have your numbers. That
is not the end of the conversation. A finance team usually walks
in with three other pushbacks. Be ready for each one.

**"Competitors spend less than this."**

You do not actually know what competitors spend, and they do not
know what their incidents cost. Comparing observability bills
across companies without comparing incident outcomes is
meaningless. Two companies can spend the same on observability
and have wildly different MTTR, customer churn, and engineering
attrition. The answer is: "I can't speak to their spend. I can
speak to our outcomes. Last year we caught seven incidents that
would have cost us ₹X collectively. That is the number that
matters."

**"Can we sample more aggressively?"**

Yes. On the data you already know is low-value. Not on the data
you have not yet had a chance to need. The trap with aggressive
sampling is you are not sampling randomly — you are sampling
*before you know what is going to matter*. The bug you are about
to hit next quarter might live entirely in the 95% of traces you
just threw away. The right answer is "yes, here are the specific
sources where we have headroom to sample harder. Here are the
ones where the cost is paying for coverage of edge cases we have
already been bitten by." Make it specific.

**"This is engineering's budget to manage, not finance's."**

It stops being engineering's problem the moment an incident hits
the P&L. The cost of a bad outage shows up on the same line as
revenue. The cost of preventing it should sit in the same
conversation. Reframe it: this is not an engineering line item
being defended to finance. It is a risk-management decision that
happens to be paid out of engineering's budget.

None of these responses will end the conversation in your favour
every time. But each of them moves it from "this number is too
big" to "what specifically would we cut, and what would we lose."
That is the conversation you want to be in.

### Don't Just Cut the Biggest Spender

This one I keep watching teams get wrong, and it hurts every
single time.

The conversation goes like this. "We need to cut observability
cost." Somebody pulls up the bill, sorts by spend descending,
picks the top item, cuts it. Bill drops next month. Everyone
moves on.

Short term, this is fine. Cost graph points down, leadership
is happy.

But here is the thing nobody is asking. **Why was that thing
put there in the first place?**

The biggest spender usually got that way for a reason. Maybe
it was a high-cardinality metric somebody added after an
outage that took two days to debug. Maybe it is a verbose log
line that's the only way to find a specific bug in a specific
service. Maybe it is the trace dimension that's the reason
your canary deploys actually catch things at all.

Cut it without knowing why it exists, and you are quietly
unwinding the exact instrumentation that has been keeping you
out of trouble. The cost goes away immediately. The capability
also goes away. You just don't realise it until the next
incident. The one this thing would have caught.

> ## **The goal isn't *less* observability. It is the *right* observability.**

So when the cost conversation comes up, flip the question.
Don't ask "what is this costing me?" Ask:

> "What would break, or get a lot harder to debug, if this
> disappeared tomorrow?"

Anything that cannot answer that second question is fine to
cut. Anything that can, is not. Even if it is the most
expensive line on the bill.

### Treat Cuts as Experiments, Not Decisions

If you do need to cut, treat it like a test, not a final call.
Drop one log source, or one trace dimension, for 60 days. See
what happens to MTTR. See what stops showing up in the
prevention log. Then decide.

Every team I know that did this learnt the same lesson the
hard way. The cheap stuff to cut was almost never the cheap
stuff to lose.

## A Quick Note on Honesty

I want to be careful about something.

Invisible value is real. But it is also the perfect excuse
for not measuring anything. Every observability vendor pitch
has some flavour of "the value is the incidents you didn't
have", and a lot of that is hand-waving.

So the actual discipline is to do both.

Measure what you can. MTTR, escalations, hours spent in
incidents.

Document what you can't, as specifically as possible. The
prevention log. The comparison framing. The "what would break
if this disappeared" question.

Teams that only do the first end up cutting the things that
mattered most. Teams that only do the second sound like they
are defending the indefensible. Do both, and the question
stops being "is observability worth it" and starts being
"where exactly is it earning its keep." That is a much better
conversation to be in.

## Wrapping Up

Good observability looks like nothing happening. That is hard
to sell, but it is not impossible. You just have to keep score
of the things your system was built to prevent.

The alert that fired at 2am and resolved itself? That was the
work. The trace nobody looked at because nothing went wrong?
Also the work. Your actual job is making sure somebody,
somewhere, knows that.

> Learn more at [Base14](https://base14.io)
