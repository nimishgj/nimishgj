---
layout: post
title: "How Will We Know? Building Features That Are Observed From Day Zero"
date: 2026-10-19 12:00:00 +0530
tags: [observability, product, engineering]
---

Most teams treat observability as something you add after
launch. The feature ships, someone sets up a dashboard, and
an alert gets written after the first incident. It's an
operations concern, owned by engineering, and mostly looked
at when something breaks.

I think that leaves most of the value on the table. When
observability is part of the design from day zero, it stops
being only a way to catch failures. It becomes how the whole
team, engineering and product, finds out what is really
happening with the thing they built.

## What "day zero" means

It doesn't mean buying a tool before you write code. It
means that when you design a feature, you also design how
you'll see it working.

The design doc already covers the API, the schema and the
edge cases. Add one more section: **How will we know?**

| Question | Who asks | Example signals |
|---|---|---|
| Is it working? | Engineering | errors, latency, broken down by how it's used |
| Is it being used? | Product | how often, by whom, from where |
| Is it helping? | Product | time to result, drop-offs, dead ends |

The instrumentation for those answers ships in the same pull
request as the feature. Not in a follow-up ticket, because
follow-up tickets for instrumentation don't get done.

## What it gives engineering

Engineering observability usually stops at the system: is
the service up, how fast does it respond, how many requests
fail. That catches outages. It doesn't tell you how the
system behaves for the way people actually use it.

When the instrumentation is designed alongside the feature,
it records the things that matter for that feature, and you
can slice performance by them.

I worked on a log search product where our overall query
latency looked fine for months. When we finally recorded
the time range and filters on each query, the picture
changed. Searches over the last hour were fast. Searches
over thirty days were painfully slow. Those were people
looking for trends, a small share of queries, so they
barely moved the average. And every one of them filtered on
`environment`, because we required it for long ranges, but
`environment` wasn't indexed. One index fixed it.

{% include viz/latency-by-range.html %}

The fix was trivial. Seeing the problem was the hard part,
and the system-level metrics were never going to show it.
If those attributes had been there from launch, we'd have
seen it in the first week instead of months later.

## What it gives product

Product teams usually learn about usage from interviews,
support tickets and the customers who talk the loudest.
Those are useful, but they're slow, and they over-represent
people who complain. Most users never tell you anything.
They work around the problem or quietly stop using the
feature.

**Observability designed in from day zero lets product see
what users do, not what they say. Which parts of a feature
get used, which get ignored, where people hesitate, where
they give up.**

On the same product, our filters lived in a few different
places on the page. Once we tracked search bar input and
filter clicks, a pattern showed up: people typed a filter
name like `environment` into the search bar, got nothing
back, paused for a few seconds, and then found the filter
selector somewhere else. Nobody had ever filed a ticket
about it. We changed the search bar to suggest filters from
anywhere on the page, and the pause disappeared.

That's the kind of thing no dashboard of error rates will
ever tell you, and no customer will think to mention.

And that's the real payoff. You didn't improve the product
based on a guess or on whoever complained the loudest. You
fixed something real people were running into every day,
and you can see in the same data that it's gone. That's a
change that actually makes their day a little easier.

## One set of data, one conversation

The quiet benefit is that engineering and product end up
looking at the same data. Usage and performance live on the
same spans and events, so a product question ("why do people
abandon long searches?") and an engineering question ("why
are long searches slow?") turn out to be the same question,
answered with the same query.

{% include viz/one-span-two-audiences.html %}

You don't need a separate analytics pipeline, a data team
to join two systems, or a meeting where each side brings
numbers the other doesn't trust.

## Why not add it later?

You can. We did. But adding it later costs more than it
looks.

- **You lose the baseline.** Launch is when you learn the
  most about a feature, and if you weren't measuring, you
  can't tell whether your next change made things better.
- **The questions get forgotten.** At design time you know
  exactly what you're unsure about. Six months later, nobody
  remembers what the feature was supposed to do for users.
- **It never gets prioritised.** Once a feature is live,
  instrumentation competes with new work, and it loses.
- **You find problems late.** Both of the issues above sat
  in production for months. Neither was hard to find once we
  looked.

## How to start

You don't need much:

- **Add the "How will we know?" section to your spec
  template**, and don't approve a design without it.
- **Put product attributes on the spans you already have.**
  Time range, filters used, where the user came from. It's
  usually a few lines of code.
- **Record the shape, not the content.** Field names and
  counts, not what users typed. You keep privacy and still
  get the answers.
- **Look at slices, not averages.** Most interesting
  problems hide inside an average that looks fine.
- **Give product their own dashboard**, and make looking at
  it a habit, not something that happens when someone asks.

## Conclusion

Observability built in from day zero turns a feature launch
from a guess into something you can learn from. Engineering
sees how the system behaves for real usage, product sees
what users actually do, and both see it from the start
instead of months later. If you can't say how you'll know a
feature worked, you're not ready to build it yet.

> Learn more at [Base14](https://base14.io)
