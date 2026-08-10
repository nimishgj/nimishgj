---
layout: post
title: "Why Resolving Incidents Is Still Slow, Even With Good Observability"
date: 2026-08-02 12:00:00 +0530
tags: [observability, sre, incident-response]
preview_video: /assets/video/incident-story/visualization.html
preview_alt: "Animated story: an incident diagnosed in six minutes that took ninety-one more to resolve"
---

Let me tell you about a Tuesday.

We had done everything right: structured logs with consistent
field names, request IDs propagated through every hop, traces,
metrics, dashboards, the whole stack. When something broke, we
could see it break in glorious detail.

This is the story of how an incident we understood in six
minutes still took ninety-one more to fix, and what each of
those minutes taught us.

<iframe src="/assets/video/incident-story/visualization.html"
        style="width:100%; max-width:1040px; height:520px; display:block; margin:1.5rem auto; border:1px solid var(--border-color,#e5e5e5); border-radius:10px;"
        loading="lazy"
        title="Animated story: an incident diagnosed in six minutes that took ninety-one more to resolve, and how it looks after the fixes"></iframe>

If you'd rather read it, keep going; the video and the text
tell the same story.

## 14:03

The pager goes off. Payment service latency, breaching the SLO.

I open the dashboard, and honestly, the observability stack is
beautiful. The latency graph is right there. I grab a slow
trace, follow the request ID across four services, and the
culprit is obvious: payment calls to the pricing service
slowed to a crawl at almost exactly 14:00.

14:09, six minutes from page to diagnosis. Money well spent.

I remember thinking: this will be resolved by 14:15.

## 14:10 — What Changed?

Something happened at 14:00. Nothing tells me what.

The trap is that whoever shipped that change has no idea this
incident exists. Their deployment succeeded. Their service's
dashboards are green. The alert fired on *my* SLO, not theirs.
The blast radius landed on another team's pager entirely. Nobody
is coming to confess, because from where they sit, there is
nothing to confess to.

The traces pin the *symptom* down precisely. But
the deployment that caused it lives in the CI system. The feature
flags live in a second dashboard. Config changes live in a
third. Migrations, in a fourth. I have four tabs open, cross-
referencing timestamps by hand, asking in Slack: "did anyone
deploy pricing around 14:00?"

It took fourteen minutes to get to a yes: a pricing deployment went
out at 13:58. The single most useful fact of the incident, and my
telemetry, for all its detail, never knew it.

> The graphs showed everything except the thing that caused
them.

## 14:24 — Finding the Owner

Small wrinkle: the harmful part of that deployment wasn't pricing's
application code. Bundled into the release was a tweak to the
routing config of the shared API gateway pricing sits behind:
the gateway three teams use and no team owns.

Pricing shipped it, sure. But nobody on pricing understands
the gateway they tweaked. Who does? The channel
says "try Ravi, he touched it last year". Ravi has left the
company. Eleven minutes of asking around to find someone
willing to say "yeah, I can look at that".

## 14:35 — Knowing the Fix, Waiting to Apply It

By now we know the fix: roll the 13:58 deployment back, taking the
gateway config with it. This is where I expected the story to
end. It didn't, for three reasons.

First, rollback was a "plan", not a button. A wiki page, last
updated two quarters ago, describing a manual process.

Second, the 13:58 release had also run a database migration.
Could we roll back the deployment without the migration biting us?
Nobody was sure. Twenty minutes of reading migration files to
confirm what should have been guaranteed by design: that every
change stays compatible with the previous version.

Third, and this is the one that stung: once we were sure, I
still waited. I pinged my lead: "planning to roll back, ok?"
He was in a meeting. We lost twelve minutes to a question I
already knew the answer to, because nowhere was it written down
that the on-call may roll back without asking.

## 15:10 — The Humans

Meanwhile, in the incident channel, a second incident was
running: the humans organising themselves. Two people debugging
the same thing without knowing it. Someone asking "is anyone
updating the status page?" Nobody was. A teammate who came to
help discovered he didn't have production access, and the
person who could grant it was the same lead, in the same
meeting.

None of this shows up on any dashboard. All of it shows up in
the MTTR.

## 15:40

Rollback applied. Latency drops back under the SLO within
minutes. Incident closed: one hour and thirty-seven minutes,
of which observability accounted for six.

> This time, the telemetry wasn't the bottleneck — everything
around it was. Get observability wrong and it can be;
get it right and you find out what else is slow.

## The Retro That Almost Didn't Matter

This is the part of the story where most teams fail quietly. We
held the retro, wrote seven action items, and the sprint
arrived, and the roadmap was hungry. I have watched that movie
before: six months later the same incident recurs, exactly as
slow, because everything was noticed and nothing was changed.

This time we cut the list to five items and treated them as
production work. This is what we built:

**1. Changes on the telemetry timeline.**

The build is smaller than it sounds. The last step of every
deployment pipeline now posts an event to the observability
backend: service, version, git SHA, who triggered it, and a
link to the diff. Ours is a curl call in CI:

```yaml
- name: annotate deployment
  run: |
    curl -s -X POST "$GRAFANA_URL/api/annotations" \
      -H "Authorization: Bearer $GRAFANA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"tags\": [\"deployment\", \"$SERVICE\"],
           \"text\": \"$SERVICE $GIT_SHA by $GITHUB_ACTOR\"}"
```

The flag platform sends the same event from its webhook when a
flag flips, and the migration tool fires one when a migration
runs. Every dashboard renders these as vertical annotation
lines on the graphs. On the Tuesday in this story, the latency
graph would have shown a line labeled "pricing 13:58" exactly
where the curve bends. Fourteen minutes of tab archaeology
becomes reading one label.

And yes, this one is still observability. That was the lesson:
we had been watching the system obsessively while never
watching the things we did to it. It was the one gap on this
list that more telemetry could close.

> The system is only half of what needs observing. What you do
to the system is the other half. Watch both, and the first
question of every incident answers itself.

**2. Rollback as a button.**

`deploy rollback pricing` now re-deploys the previous artifact
and its config from the registry. Nothing gets rebuilt, nothing
gets decided; for us it is a thin wrapper around `helm
rollback` that also reverts the gateway config store to its
previous version, because this incident taught us those two
travel together.

The button is only trustworthy because CI enforces the
migration rule. A linter runs on every pull request and fails
any migration that is not expand-contract safe: no dropped
columns, no renames, no type changes shipped in the same
release as the code that depends on them. The twenty minutes we
spent reading migration files mid-incident is now a check that
runs before merge. And once a quarter, someone rolls back a
healthy service in production on purpose. If the button has
rusted, we find out on a calm afternoon instead of at 2am.

Before the button is even needed: deployments go out to a small
slice of traffic first, and an analysis job compares error rate
and p95 against the pre-deployment baseline for ten minutes.
The job watches our direct consumers' SLO metrics too, because
"verify your deployment" cannot be a human clicking around.
A smoke test passes cheerfully while someone else's p95 melts
under production load; a canary comparing metrics catches it
and reverts on its own. Argo Rollouts and Flagger both do this
out of the box. The real work is choosing which metrics gate
the rollout, and this incident chose them for us.

**3. Roles and authority, decided in advance.**

The paging tool now assigns roles when it creates the incident:
whoever is on the incident-commander rotation gets named in the
channel topic, same for communications. Nobody negotiates roles
in the channel because the channel opens with them filled in.

Production access stopped being a favor. Anyone on the paging
rotation can run one break-glass command that grants an
elevated role for an hour, logs the grant, and posts it to the
incident channel. No approver in the path; the audit trail is
the control. The teammate who sat idle waiting for the lead
would have been working within a minute.

And one sentence in the runbook did more for our MTTR than any
tool: *the on-call may roll back any change without asking
anyone.* We had leadership sign that line once, in writing, so
nobody relitigates it mid-incident. An unnecessary rollback
costs a deployment; twelve minutes of permission-seeking costs
the SLO.

**4. An owner for everything.**

The service catalog is not a wiki page. It is a YAML file in
one repository: every service, queue, cron job, and shared
component maps to a team, a Slack channel, and a runbook. Two
rules give it teeth. CI fails any alert whose `owner` label
does not resolve to a catalog entry, and the pager routes on
that label. An alert without a real owner cannot ship.

The gateway from this story now belongs to the platform team,
in writing. For everything else in the "nobody" column, we set
a deadline: a component that still has no owner after a quarter
gets one assigned by the directors or gets decommissioned.
Unowned stopped being an option someone can quietly choose.

**5. The alert contract.**

Every alert must carry three things before CI lets it merge:
the SLO it protects, a link to the dashboard that shows the
problem, and a link to the runbook for this exact situation.
Alerts fire on user-facing burn rate, not on CPU. Once a
quarter we pull the list of everything that fired and ask one
question: did a human take an action because of this page? Any
alert that answers "no" twice in a row gets deleted. Fewer
pages, and each one means something.

## Conclusion

Buying observability was the easy part, and it genuinely
worked: six minutes to understand. The other ninety-one minutes
lived in the gaps between tools, between teams, and between
"knowing" and "being allowed to act". One of those gaps turned
out to be an observability gap after all: we were watching the
system but not our own changes. The rest, no amount of
telemetry was ever going to close.

The teams that resolve incidents quickly are the ones that
built the unglamorous machinery around the seeing.

> Observability buys you the first six minutes. The rest you
have to build.

> Learn more at [Base14](https://base14.io)
