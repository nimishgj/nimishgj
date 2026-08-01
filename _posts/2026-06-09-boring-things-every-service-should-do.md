---
layout: post
title: "10 Things Every Service Should Do Before Production"
date: 2026-06-09 12:00:00 +0530
tags: [sre, devops]
---

The incidents that hurt the most are almost never about a
missing big feature. They are about a missing small one — a
timeout never set, a retry without backoff, a health check that
lied.

This is the checklist I run through before any service goes to
production. For each item: what it is, and why it is needed.

<style>
.anim{border:1px solid var(--border-color,#e5e5e5);border-radius:8px;padding:1.1rem .8rem .7rem;margin:1.4rem 0 1.8rem;overflow-x:auto}
.anim svg{display:block;margin:0 auto;max-width:100%;height:auto}
.anim figcaption{color:var(--tint-color,#aaa);font-size:.78rem;text-align:center;margin-top:.65rem;line-height:1.5}
.anim text{font-family:Helvetica,Arial,sans-serif;font-size:11.5px;fill:var(--text-color,#555)}
.anim .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px}
.anim .lbl{font-size:10px;fill:var(--tint-color,#aaa)}
.anim .bx{fill:none;stroke:var(--tint-color,#999);stroke-width:1.2}
.anim .ln{stroke:var(--tint-color,#aaa);stroke-width:1.2;fill:none}
.anim .tk{fill:#2ea043}.anim .tb{fill:#e5534b}.anim .tw{fill:#c69026}.anim .ta{fill:var(--link-color,#4a9ae1)}.anim .td{fill:var(--tint-color,#aaa)}
@media (prefers-reduced-motion:reduce){.anim *{animation:none!important}}
</style>

## 1. Graceful Shutdown

On SIGTERM: stop accepting new requests, finish what is in
flight, deregister from the load balancer, then exit.

**Why it is needed: every deploy sends SIGTERM to a pod that is
mid-request. Without a handler, those requests die as 502s —
quietly, on every single deploy.**

<figure class="anim">
<style>
@keyframes gsD{0%{opacity:0;transform:translateX(0)}1.5%{opacity:1;transform:translateX(20)}11%{opacity:1;transform:translateX(455)}12.5%,100%{opacity:0;transform:translateX(455)}}
@keyframes gsSig{0%,21%{opacity:0}24%,96%{opacity:1}100%{opacity:0}}
@keyframes gsSvc{0%,21%{stroke:var(--tint-color,#999)}24%,70%{stroke:#c69026}78%,100%{stroke:#2ea043}}
@keyframes gsRej{0%,26%{opacity:0;transform:translateX(0)}27.5%{opacity:1}31%{transform:translateX(96);fill:var(--link-color,#4a9ae1)}33%{transform:translateX(74);fill:#e5534b}40%{opacity:1;transform:translateX(74)}44%,100%{opacity:0;transform:translateX(74)}}
@keyframes gsRejX{0%,31%{opacity:0}33%,44%{opacity:1}48%,100%{opacity:0}}
@keyframes gsNoNew{0%,28%{opacity:0}31%,52%{opacity:1}56%,100%{opacity:0}}
@keyframes gsF1{0%,24%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}26%{opacity:1}30%{fill:var(--link-color,#4a9ae1)}44%{opacity:1;transform:translateX(290);fill:#2ea043}47%,100%{opacity:0;transform:translateX(290)}}
@keyframes gsF2{0%,28%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}30%{opacity:1}36%{fill:var(--link-color,#4a9ae1)}52%{opacity:1;transform:translateX(230);fill:#2ea043}55%,100%{opacity:0;transform:translateX(230)}}
@keyframes gsDrain{0%,32%{opacity:0}36%,56%{opacity:1}60%,100%{opacity:0}}
@keyframes gsLink{0%,44%{opacity:1}52%,100%{opacity:.15}}
@keyframes gsDereg{0%,50%{opacity:0}54%,94%{opacity:1}100%{opacity:0}}
@keyframes gsExit{0%,72%{opacity:0}78%,96%{opacity:1}100%{opacity:0}}
.gs-d1{animation:gsD 12s linear infinite}
.gs-d2{animation:gsD 12s linear infinite .6s}
.gs-d3{animation:gsD 12s linear infinite 1.2s}
.gs-sig{animation:gsSig 12s linear infinite}
.gs-svc{animation:gsSvc 12s linear infinite}
.gs-rej{animation:gsRej 12s linear infinite}
.gs-rejx{animation:gsRejX 12s linear infinite}
.gs-nonew{animation:gsNoNew 12s linear infinite}
.gs-f1{animation:gsF1 12s linear infinite}
.gs-f2{animation:gsF2 12s linear infinite}
.gs-drain{animation:gsDrain 12s linear infinite}
.gs-link{animation:gsLink 12s linear infinite}
.gs-dereg{animation:gsDereg 12s linear infinite}
.gs-exit{animation:gsExit 12s linear infinite}
</style>
<svg viewBox="0 0 640 215" role="img" aria-label="Animation of a graceful shutdown: SIGTERM arrives, new requests are rejected, in-flight requests drain, the service deregisters and exits cleanly">
  <g class="gs-sig" opacity="0">
    <rect x="255" y="10" width="130" height="24" rx="12" fill="#c69026" fill-opacity=".12" stroke="#c69026"/>
    <text x="320" y="26" text-anchor="middle" class="mono tw">SIGTERM</text>
  </g>
  <rect x="20" y="85" width="110" height="50" rx="6" class="bx"/>
  <text x="75" y="106" text-anchor="middle">load</text>
  <text x="75" y="122" text-anchor="middle">balancer</text>
  <g class="gs-link">
    <line x1="132" y1="110" x2="242" y2="110" class="ln"/>
    <polygon points="242,105 252,110 242,115" fill="var(--tint-color,#aaa)"/>
  </g>
  <text x="190" y="150" text-anchor="middle" class="lbl gs-dereg" opacity="0">deregistered ✓</text>
  <rect x="255" y="70" width="170" height="80" rx="6" class="bx gs-svc"/>
  <text x="340" y="63" text-anchor="middle" class="lbl">service</text>
  <text x="340" y="116" text-anchor="middle" class="tk gs-exit" opacity="0">exit 0</text>
  <text x="340" y="168" text-anchor="middle" class="lbl gs-drain" opacity="0">draining in-flight…</text>
  <text x="265" y="52" class="tb gs-rejx" opacity="0" font-size="13">✕</text>
  <text x="150" y="52" class="lbl gs-nonew" opacity="0">new requests refused</text>
  <circle class="gs-d1" cx="140" cy="110" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="gs-d2" cx="140" cy="110" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="gs-d3" cx="140" cy="110" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="gs-rej" cx="146" cy="92" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="gs-f1" cx="310" cy="110" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="gs-f2" cx="370" cy="128" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <text x="612" y="114" text-anchor="end" class="lbl">responses</text>
  <text x="612" y="128" text-anchor="end" class="lbl">complete ✓</text>
</svg>
<figcaption>SIGTERM arrives → stop accepting new work → finish what is in flight → deregister → exit&nbsp;0. Nobody gets a 502.</figcaption>
</figure>

## 2. Health Checks (Liveness, Readiness, Startup)

Three probes, three jobs. Liveness: "are you alive" — fail and
you get restarted. Readiness: "should I get traffic" — fail and
traffic stops, but you keep running. Startup: "done booting" —
until it passes, the other two wait.

**Why it is needed: wiring a dependency check to liveness turns
a database hiccup into a cascading restart of every pod.
Readiness sheds traffic; liveness kills. Mixing them up is the
most common Kubernetes misconfiguration there is.**

<figure class="anim">
<style>
@keyframes hcR1{0%,1%{opacity:.3}4%,32%{opacity:1}36%,100%{opacity:.3}}
@keyframes hcR2{0%,34%{opacity:.3}38%,65%{opacity:1}69%,100%{opacity:.3}}
@keyframes hcR3{0%,66%{opacity:.3}70%,99%{opacity:1}100%{opacity:.3}}
@keyframes hcX1{0%,10%{opacity:0}13%,32%{opacity:1}36%,100%{opacity:0}}
@keyframes hcPodBlink{0%,14%{opacity:1}16%{opacity:.1}18%{opacity:1}20%{opacity:.1}23%,100%{opacity:1}}
@keyframes hcSpin{0%,15%{opacity:0;transform:rotate(0deg)}18%{opacity:1}28%{opacity:1;transform:rotate(360deg)}31%,100%{opacity:0;transform:rotate(360deg)}}
@keyframes hcL1{0%,18%{opacity:0}22%,34%{opacity:1}38%,100%{opacity:0}}
@keyframes hcX2{0%,43%{opacity:0}46%,65%{opacity:1}69%,100%{opacity:0}}
@keyframes hcTraf{0%,46%{opacity:1}50%,66%{opacity:.08}70%,100%{opacity:1}}
@keyframes hcL2{0%,50%{opacity:0}54%,67%{opacity:1}71%,100%{opacity:0}}
@keyframes hcBar{0%,70%{transform:scaleX(0)}86%,100%{transform:scaleX(1)}}
@keyframes hcOk3{0%,86%{opacity:0}89%,100%{opacity:1}}
@keyframes hcL3{0%,89%{opacity:0}92%,100%{opacity:1}}
.hc-r1{animation:hcR1 12s linear infinite}
.hc-r2{animation:hcR2 12s linear infinite}
.hc-r3{animation:hcR3 12s linear infinite}
.hc-x1{animation:hcX1 12s linear infinite}
.hc-podblink{animation:hcPodBlink 12s linear infinite}
.hc-spin{animation:hcSpin 12s linear infinite;transform-box:fill-box;transform-origin:center}
.hc-l1{animation:hcL1 12s linear infinite}
.hc-x2{animation:hcX2 12s linear infinite}
.hc-traf{animation:hcTraf 12s linear infinite}
.hc-l2{animation:hcL2 12s linear infinite}
.hc-bar{animation:hcBar 12s linear infinite;transform-box:fill-box;transform-origin:left center}
.hc-ok3{animation:hcOk3 12s linear infinite}
.hc-l3{animation:hcL3 12s linear infinite}
</style>
<svg viewBox="0 0 640 216" role="img" aria-label="Animation of liveness, readiness and startup probes: a failing liveness probe restarts the pod, a failing readiness probe only removes traffic, and a startup probe holds the others until boot finishes">
  <g class="hc-r1">
    <rect x="16" y="14" width="86" height="22" rx="11" class="bx"/>
    <text x="59" y="29" text-anchor="middle" class="mono">liveness</text>
    <text x="118" y="29" class="td">“are you alive?”</text>
    <text x="248" y="30" class="tb hc-x1" opacity="0" font-size="13">✕</text>
    <rect x="290" y="8" width="34" height="34" rx="5" class="bx hc-podblink"/>
    <g class="hc-spin" opacity="0">
      <path d="M 352 25 a 11 11 0 1 1 -4 -8" fill="none" stroke="#c69026" stroke-width="2"/>
      <polygon points="344,13 354,15 347,22" fill="#c69026"/>
    </g>
    <text x="380" y="29" class="lbl hc-l1" opacity="0">fails → pod restarted</text>
  </g>
  <g class="hc-r2">
    <rect x="16" y="86" width="86" height="22" rx="11" class="bx"/>
    <text x="59" y="101" text-anchor="middle" class="mono">readiness</text>
    <text x="118" y="101" class="td">“send traffic?”</text>
    <text x="248" y="102" class="tb hc-x2" opacity="0" font-size="13">✕</text>
    <g class="hc-traf">
      <line x1="255" y1="94" x2="283" y2="94" class="ln"/>
      <line x1="255" y1="103" x2="283" y2="103" class="ln"/>
      <line x1="255" y1="112" x2="283" y2="112" class="ln"/>
    </g>
    <rect x="290" y="80" width="34" height="34" rx="5" class="bx"/>
    <text x="380" y="101" class="lbl hc-l2" opacity="0">fails → traffic stops, pod stays up</text>
  </g>
  <g class="hc-r3">
    <rect x="16" y="158" width="86" height="22" rx="11" class="bx"/>
    <text x="59" y="173" text-anchor="middle" class="mono">startup</text>
    <text x="118" y="173" class="td">“done booting?”</text>
    <rect x="240" y="166" width="100" height="9" rx="4.5" class="bx"/>
    <rect x="240" y="166" width="100" height="9" rx="4.5" fill="#2ea043" fill-opacity=".55" class="hc-bar"/>
    <text x="352" y="175" class="tk hc-ok3" opacity="0">✓</text>
    <text x="380" y="173" class="lbl hc-l3" opacity="0">only now do the other probes fire</text>
  </g>
</svg>
<figcaption>Three probes, three different consequences. Wire “can I reach the database” to readiness, never to liveness.</figcaption>
</figure>

## 3. Timeouts at Every Layer

A timeout on every network call, database query, and HTTP
client — always lower than the timeout of whatever is calling
you.

**Why it is needed: the default in most libraries is "no
timeout". One downstream slows to 30s, your workers pile up
waiting on it, and soon requests that have nothing to do with
it are stuck too. Your service is down without anything having
crashed. This is the single highest-leverage item on the list.**

<figure class="anim">
<style>
@keyframes toPh1{0%,46%{opacity:1}50%,100%{opacity:0}}
@keyframes toPh2{0%,50%{opacity:0}54%,100%{opacity:1}}
@keyframes toS1{0%,5%{fill:transparent}8%,38%{fill:#c69026}40%,48%{fill:#e5534b}50%,54%{fill:transparent}57%,61%{fill:#c69026}63%,100%{fill:transparent}}
@keyframes toS2{0%,10%{fill:transparent}13%,38%{fill:#c69026}40%,48%{fill:#e5534b}50%,60%{fill:transparent}63%,67%{fill:#c69026}69%,100%{fill:transparent}}
@keyframes toS3{0%,15%{fill:transparent}18%,38%{fill:#c69026}40%,48%{fill:#e5534b}50%,66%{fill:transparent}69%,73%{fill:#c69026}75%,100%{fill:transparent}}
@keyframes toS4{0%,20%{fill:transparent}23%,38%{fill:#c69026}40%,48%{fill:#e5534b}50%,72%{fill:transparent}75%,79%{fill:#c69026}81%,100%{fill:transparent}}
@keyframes toS5{0%,25%{fill:transparent}28%,38%{fill:#c69026}40%,48%{fill:#e5534b}50%,78%{fill:transparent}81%,85%{fill:#c69026}87%,100%{fill:transparent}}
@keyframes toS6{0%,30%{fill:transparent}33%,38%{fill:#c69026}40%,48%{fill:#e5534b}50%,84%{fill:transparent}87%,91%{fill:#c69026}93%,100%{fill:transparent}}
@keyframes toQ1{0%,28%{opacity:0;transform:translateX(0)}30%{opacity:1}34%{transform:translateX(80);fill:var(--link-color,#4a9ae1)}36%,46%{opacity:1;transform:translateX(80);fill:#e5534b}49%,100%{opacity:0}}
@keyframes toQ2{0%,33%{opacity:0;transform:translateX(0)}35%{opacity:1}39%{transform:translateX(62);fill:var(--link-color,#4a9ae1)}41%,46%{opacity:1;transform:translateX(62);fill:#e5534b}49%,100%{opacity:0}}
@keyframes toStuck{0%,36%{opacity:0}40%,46%{opacity:1}50%,100%{opacity:0}}
@keyframes toFlow1{0%,54%{opacity:0;transform:translateX(0)}56%{opacity:1}70%{opacity:1;transform:translateX(470)}72%,100%{opacity:0}}
@keyframes toFlow2{0%,70%{opacity:0;transform:translateX(0)}72%{opacity:1}86%{opacity:1;transform:translateX(470)}88%,100%{opacity:0}}
@keyframes toOk{0%,60%{opacity:0}64%,96%{opacity:1}100%{opacity:0}}
.to-ph1{animation:toPh1 13s linear infinite}
.to-ph2{animation:toPh2 13s linear infinite}
.to-s1{animation:toS1 13s linear infinite}.to-s2{animation:toS2 13s linear infinite}.to-s3{animation:toS3 13s linear infinite}
.to-s4{animation:toS4 13s linear infinite}.to-s5{animation:toS5 13s linear infinite}.to-s6{animation:toS6 13s linear infinite}
.to-q1{animation:toQ1 13s linear infinite}
.to-q2{animation:toQ2 13s linear infinite}
.to-stuck{animation:toStuck 13s linear infinite}
.to-f1{animation:toFlow1 13s linear infinite}
.to-f2{animation:toFlow2 13s linear infinite}
.to-ok{animation:toOk 13s linear infinite}
</style>
<svg viewBox="0 0 640 225" role="img" aria-label="Animation showing a worker pool: without timeouts every worker gets stuck waiting on a slow downstream, with a two second timeout workers free themselves and requests keep flowing">
  <text x="20" y="24" class="mono tb to-ph1">no timeout</text>
  <text x="20" y="24" class="mono tk to-ph2" opacity="0">timeout: 2s</text>
  <rect x="150" y="60" width="180" height="115" rx="6" class="bx"/>
  <text x="240" y="53" text-anchor="middle" class="lbl">service — worker pool</text>
  <rect x="170" y="80" width="34" height="24" rx="3" class="bx to-s1"/>
  <rect x="216" y="80" width="34" height="24" rx="3" class="bx to-s2"/>
  <rect x="262" y="80" width="34" height="24" rx="3" class="bx to-s3"/>
  <rect x="170" y="126" width="34" height="24" rx="3" class="bx to-s4"/>
  <rect x="216" y="126" width="34" height="24" rx="3" class="bx to-s5"/>
  <rect x="262" y="126" width="34" height="24" rx="3" class="bx to-s6"/>
  <line x1="332" y1="117" x2="428" y2="117" class="ln" stroke-dasharray="4 4"/>
  <rect x="432" y="85" width="180" height="64" rx="6" class="bx" stroke="#c69026"/>
  <text x="522" y="112" text-anchor="middle" class="tw">downstream</text>
  <text x="522" y="130" text-anchor="middle" class="lbl">replying in 30s…</text>
  <circle class="to-q1" cx="55" cy="117" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="to-q2" cx="40" cy="117" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <text x="150" y="200" class="lbl to-stuck" opacity="0">every worker stuck waiting — unrelated requests queue too</text>
  <circle class="to-f1" cx="55" cy="117" r="5" fill="#2ea043" opacity="0"/>
  <circle class="to-f2" cx="55" cy="117" r="5" fill="#2ea043" opacity="0"/>
  <text x="150" y="200" class="lbl to-ok" opacity="0">calls give up at 2s — workers free, the pool keeps breathing ✓</text>
</svg>
<figcaption>One slow downstream. Without a timeout it silently owns your whole worker pool; with one, it only owns two seconds of it.</figcaption>
</figure>

## 4. Retries With Backoff (And Limits)

Four properties: exponential backoff between attempts, jitter
so clients do not retry in sync, a cap on total attempts
(three is usually enough), and ideally a circuit breaker
around it all.

**Why it is needed: naïve retries make outages worse. A small
hiccup turns into a sustained flood — every client retries,
fails, retries again — and now the dependency cannot recover
even after the original problem is gone.**

<figure class="anim">
<style>
@keyframes rtCur{0%{transform:translateX(0);opacity:1}80%{transform:translateX(500);opacity:1}81%,100%{opacity:0;transform:translateX(500)}}
@keyframes rtT0{0%,1%{opacity:0}3%,100%{opacity:1}}
@keyframes rtT1{0%,7%{opacity:0}9%,100%{opacity:1}}
@keyframes rtT2{0%,13%{opacity:0}15%,100%{opacity:1}}
@keyframes rtT3{0%,19%{opacity:0}21%,100%{opacity:1}}
@keyframes rtT4{0%,25%{opacity:0}27%,100%{opacity:1}}
@keyframes rtT5{0%,31%{opacity:0}33%,100%{opacity:1}}
@keyframes rtT6{0%,37%{opacity:0}39%,100%{opacity:1}}
@keyframes rtT7{0%,43%{opacity:0}45%,100%{opacity:1}}
@keyframes rtT8{0%,49%{opacity:0}51%,100%{opacity:1}}
@keyframes rtT9{0%,55%{opacity:0}57%,100%{opacity:1}}
@keyframes rtT10{0%,61%{opacity:0}63%,100%{opacity:1}}
@keyframes rtT11{0%,67%{opacity:0}69%,100%{opacity:1}}
@keyframes rtFlood{0%,72%{opacity:0}76%,97%{opacity:1}100%{opacity:0}}
@keyframes rtB0{0%,2%{opacity:0}4%,100%{opacity:1}}
@keyframes rtB1{0%,7%{opacity:0}9%,100%{opacity:1}}
@keyframes rtB2{0%,18%{opacity:0}20%,100%{opacity:1}}
@keyframes rtB3{0%,40%{opacity:0}42%,100%{opacity:1}}
@keyframes rtCap{0%,46%{opacity:0}50%,97%{opacity:1}100%{opacity:0}}
.rt-cur{animation:rtCur 11s linear infinite}
.rt-t0{animation:rtT0 11s linear infinite}.rt-t1{animation:rtT1 11s linear infinite}.rt-t2{animation:rtT2 11s linear infinite}
.rt-t3{animation:rtT3 11s linear infinite}.rt-t4{animation:rtT4 11s linear infinite}.rt-t5{animation:rtT5 11s linear infinite}
.rt-t6{animation:rtT6 11s linear infinite}.rt-t7{animation:rtT7 11s linear infinite}.rt-t8{animation:rtT8 11s linear infinite}
.rt-t9{animation:rtT9 11s linear infinite}.rt-t10{animation:rtT10 11s linear infinite}.rt-t11{animation:rtT11 11s linear infinite}
.rt-flood{animation:rtFlood 11s linear infinite}
.rt-b0{animation:rtB0 11s linear infinite}.rt-b1{animation:rtB1 11s linear infinite}
.rt-b2{animation:rtB2 11s linear infinite}.rt-b3{animation:rtB3 11s linear infinite}
.rt-cap{animation:rtCap 11s linear infinite}
</style>
<svg viewBox="0 0 640 185" role="img" aria-label="Animation comparing retry patterns: naive retries hammer the dependency continuously, exponential backoff with jitter spaces attempts out and stops at a cap">
  <line x1="110" y1="30" x2="110" y2="150" stroke="var(--border-color,#e5e5e5)" stroke-width="1" class="rt-cur"/>
  <text x="14" y="64" class="lbl">no backoff</text>
  <line x1="110" y1="75" x2="610" y2="75" class="ln" stroke-opacity=".35"/>
  <rect class="rt-t0" x="118" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t1" x="155" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t2" x="192" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t3" x="229" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t4" x="266" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t5" x="303" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t6" x="340" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t7" x="377" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t8" x="414" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t9" x="451" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t10" x="488" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <rect class="rt-t11" x="525" y="46" width="3.5" height="22" fill="#e5534b" opacity="0"/>
  <text x="560" y="62" class="tb rt-flood" opacity="0" font-size="10.5">sustained flood</text>
  <text x="14" y="124" class="lbl">backoff + jitter</text>
  <line x1="110" y1="135" x2="610" y2="135" class="ln" stroke-opacity=".35"/>
  <rect class="rt-b0" x="126" y="106" width="3.5" height="22" fill="#2ea043" opacity="0"/>
  <rect class="rt-b1" x="160" y="106" width="3.5" height="22" fill="#2ea043" opacity="0"/>
  <rect class="rt-b2" x="228" y="106" width="3.5" height="22" fill="#2ea043" opacity="0"/>
  <rect class="rt-b3" x="366" y="106" width="3.5" height="22" fill="#2ea043" opacity="0"/>
  <text x="390" y="122" class="tk rt-cap" opacity="0" font-size="10.5">stop — cap hit, breaker takes over</text>
  <text x="110" y="170" class="lbl">t=0</text>
  <text x="610" y="170" text-anchor="end" class="lbl">time →</text>
</svg>
<figcaption>Same failure, two clients. The top one is why the dependency cannot recover; the bottom one waits 1s, 2s, 4s — a little jittered — then gives up.</figcaption>
</figure>

## 5. Idempotency on Write Endpoints

An idempotency key: the caller sends a unique ID per logical
action, the server stores it, and a duplicate ID gets the
original result back instead of the work being done twice.

**Why it is needed: the moment callers retry — and by the
previous section, they will — a lost response means the same
valid-looking request arrives twice. Without the key, that is a
user charged twice.**

<figure class="anim">
<style>
@keyframes idReq1{0%,3%{opacity:0;transform:translateX(0)}5%{opacity:1}14%{opacity:1;transform:translateX(255)}16%,100%{opacity:0;transform:translateX(255)}}
@keyframes idFlash{0%,14%{fill-opacity:0}17%{fill-opacity:.14}21%,100%{fill-opacity:0}}
@keyframes idC0{0%,16%{opacity:1}17%,100%{opacity:0}}
@keyframes idC1{0%,16%{opacity:0}17%,100%{opacity:1}}
@keyframes idKey{0%,17%{opacity:0}20%,100%{opacity:1}}
@keyframes idKeyGlow{0%,48%{stroke:var(--tint-color,#999)}52%,60%{stroke:#2ea043;stroke-width:2}66%,100%{stroke:var(--tint-color,#999)}}
@keyframes idResp1{0%,20%{opacity:0;transform:translateX(0)}22%{opacity:1}27%{opacity:1;transform:translateX(-130)}29%,100%{opacity:0;transform:translateX(-130)}}
@keyframes idLost{0%,27%{opacity:0}29%,36%{opacity:1}39%,100%{opacity:0}}
@keyframes idTimeout{0%,29%{opacity:0}32%,44%{opacity:1}47%,100%{opacity:0}}
@keyframes idReq2{0%,38%{opacity:0;transform:translateX(0)}40%{opacity:1}49%{opacity:1;transform:translateX(255)}51%,100%{opacity:0;transform:translateX(255)}}
@keyframes idSeen{0%,50%{opacity:0}53%,68%{opacity:1}72%,100%{opacity:0}}
@keyframes idGhost{0%,52%{opacity:0}55%,64%{opacity:1}68%,100%{opacity:0}}
@keyframes idResp2{0%,58%{opacity:0;transform:translateX(0)}60%{opacity:1}70%{opacity:1;transform:translateX(-255)}72%,100%{opacity:0;transform:translateX(-255)}}
@keyframes idDone{0%,70%{opacity:0}74%,96%{opacity:1}100%{opacity:0}}
.id-req1{animation:idReq1 13s linear infinite}
.id-flash{animation:idFlash 13s linear infinite}
.id-c0{animation:idC0 13s linear infinite}
.id-c1{animation:idC1 13s linear infinite}
.id-key{animation:idKey 13s linear infinite}
.id-keyglow{animation:idKeyGlow 13s linear infinite}
.id-resp1{animation:idResp1 13s linear infinite}
.id-lost{animation:idLost 13s linear infinite}
.id-timeout{animation:idTimeout 13s linear infinite}
.id-req2{animation:idReq2 13s linear infinite}
.id-seen{animation:idSeen 13s linear infinite}
.id-ghost{animation:idGhost 13s linear infinite}
.id-resp2{animation:idResp2 13s linear infinite}
.id-done{animation:idDone 13s linear infinite}
</style>
<svg viewBox="0 0 640 215" role="img" aria-label="Animation of an idempotency key: a payment request succeeds but the response is lost, the client retries with the same key, and the server replays the stored result instead of charging twice">
  <rect x="25" y="85" width="105" height="48" rx="6" class="bx"/>
  <text x="77" y="113" text-anchor="middle">client</text>
  <text x="77" y="150" class="tw id-timeout" opacity="0" text-anchor="middle" font-size="10.5">timeout — retry</text>
  <text x="77" y="150" class="tk id-done" opacity="0" text-anchor="middle" font-size="10.5">got result ✓</text>
  <rect x="455" y="55" width="160" height="115" rx="6" class="bx"/>
  <rect x="455" y="55" width="160" height="115" rx="6" fill="#4a9ae1" fill-opacity="0" class="id-flash"/>
  <text x="535" y="76" text-anchor="middle">server</text>
  <rect x="470" y="118" width="130" height="38" rx="5" class="bx id-keyglow"/>
  <text x="535" y="132" text-anchor="middle" class="lbl">seen keys</text>
  <g class="id-key" opacity="0">
    <rect x="505" y="137" width="58" height="15" rx="4" fill="#2ea043" fill-opacity=".12"/>
    <text x="534" y="148.5" text-anchor="middle" class="mono tk" font-size="9.5">ab12</text>
  </g>
  <text x="614" y="30" text-anchor="end" class="mono id-c0">charges: 0</text>
  <text x="614" y="30" text-anchor="end" class="mono id-c1" opacity="0">charges: 1</text>
  <text x="614" y="46" text-anchor="end" class="mono tb id-ghost" opacity="0" text-decoration="line-through">2?</text>
  <g class="id-req1" opacity="0">
    <rect x="140" y="82" width="158" height="20" rx="10" fill="var(--link-color,#4a9ae1)" fill-opacity=".12" stroke="var(--link-color,#4a9ae1)" stroke-width="1"/>
    <text x="219" y="96" text-anchor="middle" class="mono ta" font-size="9.5">POST /pay key=ab12</text>
  </g>
  <g class="id-resp1" opacity="0">
    <rect x="390" y="112" width="60" height="20" rx="10" fill="#2ea043" fill-opacity=".12" stroke="#2ea043" stroke-width="1"/>
    <text x="420" y="126" text-anchor="middle" class="mono tk" font-size="9.5">200 ✓</text>
  </g>
  <text x="300" y="128" class="tb id-lost" opacity="0" font-size="12">✕ response lost</text>
  <g class="id-req2" opacity="0">
    <rect x="140" y="82" width="158" height="20" rx="10" fill="#c69026" fill-opacity=".12" stroke="#c69026" stroke-width="1"/>
    <text x="219" y="96" text-anchor="middle" class="mono tw" font-size="9.5">retry     key=ab12</text>
  </g>
  <text x="360" y="185" text-anchor="middle" class="lbl id-seen" opacity="0">key already seen → replay stored result, do not charge again</text>
  <g class="id-resp2" opacity="0">
    <rect x="395" y="112" width="130" height="20" rx="10" fill="#2ea043" fill-opacity=".12" stroke="#2ea043" stroke-width="1"/>
    <text x="460" y="126" text-anchor="middle" class="mono tk" font-size="9.5">200 ✓ same result</text>
  </g>
</svg>
<figcaption>The response gets lost, the client retries, and the user is still charged exactly once. That is the whole point of the key.</figcaption>
</figure>

## 6. Context Propagation

Generate a request ID at the edge, include it in every log
line, pass it in headers to every downstream call.

**Why it is needed: without it, a slow request is a mystery —
"service A took 800ms" in one file, "service B took 600ms" in
another, and no way to know they are the same request. One
propagated ID makes the problem obvious.**

<figure class="anim">
<style>
@keyframes cpChip{0%,3%{opacity:0;transform:translateX(0)}6%,12%{opacity:1;transform:translateX(0)}18%,28%{transform:translateX(160)}34%,44%{transform:translateX(320)}50%,92%{opacity:1;transform:translateX(480)}97%,100%{opacity:0;transform:translateX(480)}}
@keyframes cpLog1{0%,20%{opacity:0}24%,97%{opacity:1}100%{opacity:0}}
@keyframes cpLog2{0%,36%{opacity:0}40%,97%{opacity:1}100%{opacity:0}}
@keyframes cpLog3{0%,52%{opacity:0}56%,97%{opacity:1}100%{opacity:0}}
@keyframes cpPulse{0%,64%{fill-opacity:0}70%{fill-opacity:.22}76%{fill-opacity:0}82%{fill-opacity:.22}88%,100%{fill-opacity:0}}
@keyframes cpNote{0%,66%{opacity:0}70%,94%{opacity:1}98%,100%{opacity:0}}
.cp-chip{animation:cpChip 12s ease-in-out infinite}
.cp-log1{animation:cpLog1 12s linear infinite}
.cp-log2{animation:cpLog2 12s linear infinite}
.cp-log3{animation:cpLog3 12s linear infinite}
.cp-pulse{animation:cpPulse 12s linear infinite}
.cp-note{animation:cpNote 12s linear infinite}
</style>
<svg viewBox="0 0 640 210" role="img" aria-label="Animation of a request ID generated at the edge travelling through three services, then appearing highlighted in each service's log line">
  <rect x="15" y="42" width="110" height="40" rx="6" class="bx"/>
  <text x="70" y="66" text-anchor="middle">edge</text>
  <line x1="127" y1="62" x2="169" y2="62" class="ln"/>
  <polygon points="169,58 177,62 169,66" fill="var(--tint-color,#aaa)"/>
  <rect x="175" y="42" width="110" height="40" rx="6" class="bx"/>
  <text x="230" y="66" text-anchor="middle">checkout</text>
  <line x1="287" y1="62" x2="329" y2="62" class="ln"/>
  <polygon points="329,58 337,62 329,66" fill="var(--tint-color,#aaa)"/>
  <rect x="335" y="42" width="110" height="40" rx="6" class="bx"/>
  <text x="390" y="66" text-anchor="middle">payments</text>
  <line x1="447" y1="62" x2="489" y2="62" class="ln"/>
  <polygon points="489,58 497,62 489,66" fill="var(--tint-color,#aaa)"/>
  <rect x="495" y="42" width="110" height="40" rx="6" class="bx"/>
  <text x="550" y="66" text-anchor="middle">ledger</text>
  <g class="cp-chip" opacity="0">
    <rect x="42" y="10" width="56" height="18" rx="9" fill="var(--link-color,#4a9ae1)" fill-opacity=".14" stroke="var(--link-color,#4a9ae1)"/>
    <text x="70" y="23" text-anchor="middle" class="mono ta" font-size="9.5">7f3a</text>
  </g>
  <g class="cp-log1" opacity="0">
    <text x="60" y="128" class="mono td">checkout  req=</text>
    <rect x="148" y="117" width="30" height="14" rx="3" fill="var(--link-color,#4a9ae1)" class="cp-pulse" fill-opacity="0"/>
    <text x="150" y="128" class="mono ta">7f3a</text>
    <text x="185" y="128" class="mono td">  120ms</text>
  </g>
  <g class="cp-log2" opacity="0">
    <text x="60" y="152" class="mono td">payments  req=</text>
    <rect x="148" y="141" width="30" height="14" rx="3" fill="var(--link-color,#4a9ae1)" class="cp-pulse" fill-opacity="0"/>
    <text x="150" y="152" class="mono ta">7f3a</text>
    <text x="185" y="152" class="mono td">  644ms  ← slow</text>
  </g>
  <g class="cp-log3" opacity="0">
    <text x="60" y="176" class="mono td">ledger    req=</text>
    <rect x="148" y="165" width="30" height="14" rx="3" fill="var(--link-color,#4a9ae1)" class="cp-pulse" fill-opacity="0"/>
    <text x="150" y="176" class="mono ta">7f3a</text>
    <text x="185" y="176" class="mono td">   38ms</text>
  </g>
  <text x="400" y="152" class="lbl cp-note" opacity="0">one ID, one grep, and the 800ms mystery is solved</text>
</svg>
<figcaption>Generate the ID at the edge, log it everywhere, pass it in headers. Three log files become one story.</figcaption>
</figure>

## 7. Structured Logging

JSON or key-value logs with consistent field names across
services. One line of config in most logging libraries. No
`DEBUG` in production, no PII or secrets.

**Why it is needed: it turns "grep for an hour across six
services" into "filter by user_id in thirty seconds" — and
converting later means redoing every grep, dashboard, and alert
built on the unstructured logs.**

<figure class="anim">
<style>
@keyframes slSweep{0%{transform:translateY(0);opacity:.6}20%{transform:translateY(100)}40%{transform:translateY(20)}60%{transform:translateY(90)}80%{transform:translateY(40)}100%{transform:translateY(0);opacity:.6}}
@keyframes slTired{0%,55%{opacity:0}60%,100%{opacity:1}}
@keyframes slChip{0%,22%{opacity:0}26%,100%{opacity:1}}
@keyframes slHit{0%,30%{opacity:.25}34%,100%{opacity:1}}
@keyframes slMiss{0%,30%{opacity:1}34%,100%{opacity:.22}}
@keyframes slHitBg{0%,30%{fill-opacity:0}34%,100%{fill-opacity:.13}}
@keyframes slTag{0%,36%{opacity:0}40%,100%{opacity:1}}
.sl-sweep{animation:slSweep 10s ease-in-out infinite}
.sl-tired{animation:slTired 10s linear infinite}
.sl-chip{animation:slChip 10s linear infinite}
.sl-hit{animation:slHit 10s linear infinite}
.sl-miss{animation:slMiss 10s linear infinite}
.sl-hitbg{animation:slHitBg 10s linear infinite}
.sl-tag{animation:slTag 10s linear infinite}
</style>
<svg viewBox="0 0 640 215" role="img" aria-label="Animation comparing plain text logs, where a search sweeps endlessly, with structured JSON logs where filtering by user id instantly highlights the three matching lines">
  <text x="30" y="24" class="lbl">plain text</text>
  <text x="150" y="24" class="mono td" font-size="9.5">grep 12345 *.log</text>
  <rect x="30" y="44" width="230" height="9" rx="4.5" fill="var(--tint-color,#aaa)" opacity=".3"/>
  <rect x="30" y="64" width="180" height="9" rx="4.5" fill="var(--tint-color,#aaa)" opacity=".3"/>
  <rect x="30" y="84" width="255" height="9" rx="4.5" fill="var(--tint-color,#aaa)" opacity=".3"/>
  <rect x="30" y="104" width="205" height="9" rx="4.5" fill="var(--tint-color,#aaa)" opacity=".3"/>
  <rect x="30" y="124" width="240" height="9" rx="4.5" fill="var(--tint-color,#aaa)" opacity=".3"/>
  <rect x="30" y="144" width="165" height="9" rx="4.5" fill="var(--tint-color,#aaa)" opacity=".3"/>
  <rect x="26" y="42" width="264" height="13" rx="3" fill="#c69026" fill-opacity=".2" class="sl-sweep"/>
  <text x="30" y="185" class="tw sl-tired" opacity="0" font-size="10.5">…forty minutes in, still grepping</text>
  <line x1="320" y1="14" x2="320" y2="200" stroke="var(--border-color,#e5e5e5)"/>
  <text x="350" y="24" class="lbl">structured</text>
  <g class="sl-chip" opacity="0">
    <rect x="440" y="12" width="120" height="17" rx="8.5" fill="var(--link-color,#4a9ae1)" fill-opacity=".13" stroke="var(--link-color,#4a9ae1)"/>
    <text x="500" y="24.5" text-anchor="middle" class="mono ta" font-size="9.5">user_id=12345</text>
  </g>
  <rect x="346" y="42" width="268" height="14" rx="3" fill="#2ea043" class="sl-hitbg" fill-opacity="0"/>
  <text x="350" y="53" class="mono sl-hit">{"user_id":12345,"svc":"pay"}</text>
  <text x="350" y="73" class="mono sl-miss">{"user_id":98801,"svc":"pay"}</text>
  <rect x="346" y="82" width="268" height="14" rx="3" fill="#2ea043" class="sl-hitbg" fill-opacity="0"/>
  <text x="350" y="93" class="mono sl-hit">{"user_id":12345,"svc":"cart"}</text>
  <text x="350" y="113" class="mono sl-miss">{"user_id":55102,"svc":"auth"}</text>
  <rect x="346" y="122" width="268" height="14" rx="3" fill="#2ea043" class="sl-hitbg" fill-opacity="0"/>
  <text x="350" y="133" class="mono sl-hit">{"user_id":12345,"svc":"auth"}</text>
  <text x="350" y="153" class="mono sl-miss">{"user_id":77216,"svc":"cart"}</text>
  <text x="350" y="185" class="tk sl-tag" opacity="0" font-size="10.5">3 hits, thirty seconds ✓</text>
</svg>
<figcaption>The same six log lines, twice. The only difference is whether “find everything for this user” is a filter or an archaeology project.</figcaption>
</figure> The cost of doing it on day one is
nothing. The cost of converting later is enormous, because every
grep, every dashboard, every alert built on the unstructured
logs has to be redone.

## 8. Rate Limiting and Backpressure

A per-client rate limit on every public endpoint, plus
backpressure: notice when the queue grows faster than it
drains, and shed work early instead of falling over.

**Why it is needed: one client with a buggy retry loop can hit
you ten thousand times a second and take the service down for
everyone. And "what to do when overloaded" is much easier to
design before you are overloaded.**

<figure class="anim">
<style>
@keyframes rlLevel{0%{transform:scaleY(.18)}20%{transform:scaleY(.3)}50%{transform:scaleY(.68)}58%{transform:scaleY(.72)}70%{transform:scaleY(.7)}90%{transform:scaleY(.35)}100%{transform:scaleY(.18)}}
@keyframes rlIn{0%{opacity:0;transform:translateX(0)}4%{opacity:1}14%{opacity:1;transform:translateX(250)}16%,100%{opacity:0;transform:translateX(250)}}
@keyframes rlRej{0%,52%{opacity:0;transform:translateX(0)}54%{opacity:1;fill:var(--link-color,#4a9ae1)}60%{transform:translateX(238);fill:var(--link-color,#4a9ae1)}62%{fill:#e5534b}68%{opacity:1;transform:translateX(150);fill:#e5534b}72%,100%{opacity:0;transform:translateX(150)}}
@keyframes rlRej2{0%,62%{opacity:0;transform:translateX(0)}64%{opacity:1;fill:var(--link-color,#4a9ae1)}70%{transform:translateX(238);fill:var(--link-color,#4a9ae1)}72%{fill:#e5534b}78%{opacity:1;transform:translateX(150);fill:#e5534b}82%,100%{opacity:0;transform:translateX(150)}}
@keyframes rl429{0%,56%{opacity:0}60%,80%{opacity:1}84%,100%{opacity:0}}
@keyframes rlOut{0%{opacity:0;transform:translateX(0)}4%{opacity:1}20%{opacity:1;transform:translateX(230)}23%,100%{opacity:0;transform:translateX(230)}}
@keyframes rlShed{0%,54%{opacity:0}58%,84%{opacity:1}88%,100%{opacity:0}}
.rl-level{animation:rlLevel 11s linear infinite;transform-box:fill-box;transform-origin:center bottom}
.rl-i1{animation:rlIn 11s linear infinite}
.rl-i2{animation:rlIn 11s linear infinite 1.4s}
.rl-i3{animation:rlIn 11s linear infinite 2.6s}
.rl-i4{animation:rlIn 11s linear infinite 3.5s}
.rl-i5{animation:rlIn 11s linear infinite 4.3s}
.rl-rej{animation:rlRej 11s linear infinite}
.rl-rej2{animation:rlRej2 11s linear infinite}
.rl-429{animation:rl429 11s linear infinite}
.rl-o1{animation:rlOut 11s linear infinite}
.rl-o2{animation:rlOut 11s linear infinite 2.75s}
.rl-o3{animation:rlOut 11s linear infinite 5.5s}
.rl-o4{animation:rlOut 11s linear infinite 8.25s}
.rl-shed{animation:rlShed 11s linear infinite}
</style>
<svg viewBox="0 0 640 205" role="img" aria-label="Animation of a queue as a bucket: bursty requests pour in faster than the steady drain, the level approaches the limit, and new requests are rejected with 429 until the queue recovers">
  <text x="30" y="30" class="lbl">bursty inflow</text>
  <text x="612" y="30" text-anchor="end" class="lbl">steady drain</text>
  <rect x="300" y="45" width="46" height="125" rx="4" class="bx"/>
  <text x="323" y="188" text-anchor="middle" class="lbl">queue</text>
  <rect x="303" y="48" width="40" height="119" fill="var(--link-color,#4a9ae1)" fill-opacity=".35" class="rl-level"/>
  <line x1="290" y1="78" x2="356" y2="78" stroke="#e5534b" stroke-width="1.3" stroke-dasharray="5 4"/>
  <text x="364" y="74" class="tb" font-size="10">limit</text>
  <circle class="rl-i1" cx="40" cy="120" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="rl-i2" cx="40" cy="120" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="rl-i3" cx="40" cy="120" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="rl-i4" cx="40" cy="120" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="rl-i5" cx="40" cy="120" r="5" fill="var(--link-color,#4a9ae1)" opacity="0"/>
  <circle class="rl-rej" cx="52" cy="105" r="5" opacity="0"/>
  <circle class="rl-rej2" cx="52" cy="132" r="5" opacity="0"/>
  <text x="230" y="90" class="mono tb rl-429" opacity="0" font-size="10.5">429</text>
  <text x="120" y="182" class="lbl rl-shed" opacity="0">shedding load before the queue explodes</text>
  <circle class="rl-o1" cx="360" cy="120" r="5" fill="#2ea043" opacity="0"/>
  <circle class="rl-o2" cx="360" cy="120" r="5" fill="#2ea043" opacity="0"/>
  <circle class="rl-o3" cx="360" cy="120" r="5" fill="#2ea043" opacity="0"/>
  <circle class="rl-o4" cx="360" cy="120" r="5" fill="#2ea043" opacity="0"/>
</svg>
<figcaption>The drain rate never changes — that is the point. When inflow outruns it, saying 429 early beats falling over later.</figcaption>
</figure>

## 9. Circuit Breakers on Dependencies

Count recent failures. Past a threshold, "open" the circuit and
stop calling for a while. Then let one trial request through —
success closes the circuit, failure keeps it open.

**Why it is needed: failing fast is almost always better than
timing out — your service stays responsive while a dependency
is down, and the dependency gets room to recover instead of
being hammered.**

<figure class="anim">
<style>
@keyframes cbStClosed{0%,24%{opacity:1}27%,74%{opacity:.3}78%,100%{opacity:1}}
@keyframes cbStOpen{0%,24%{opacity:.3}27%,50%{opacity:1}53%,100%{opacity:.3}}
@keyframes cbStHalf{0%,51%{opacity:.3}54%,74%{opacity:1}78%,100%{opacity:.3}}
@keyframes cbSw{0%,24%{transform:rotate(0deg)}27%,52%{transform:rotate(-38deg)}55%,74%{transform:rotate(-19deg)}78%,100%{transform:rotate(0deg)}}
@keyframes cbOk1{0%,1%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}3%{opacity:1}9%{opacity:1;transform:translateX(370);fill:#2ea043}11%,100%{opacity:0;transform:translateX(370)}}
@keyframes cbF1{0%,9%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}11%{opacity:1}17%{opacity:1;transform:translateX(370);fill:#e5534b}19%,100%{opacity:0;transform:translateX(370)}}
@keyframes cbF2{0%,14%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}16%{opacity:1}22%{opacity:1;transform:translateX(370);fill:#e5534b}24%,100%{opacity:0;transform:translateX(370)}}
@keyframes cbDep{0%,12%{stroke:var(--tint-color,#999)}15%,56%{stroke:#e5534b}60%,100%{stroke:var(--tint-color,#999)}}
@keyframes cbCnt{0%,16%{opacity:0}20%,27%{opacity:1}31%,100%{opacity:0}}
@keyframes cbB1{0%,29%{opacity:0;transform:translateX(0)}31%{opacity:1;fill:var(--link-color,#4a9ae1)}35%{transform:translateX(150);fill:var(--link-color,#4a9ae1)}37%{fill:#e5534b}42%{opacity:1;transform:translateX(30);fill:#e5534b}45%,100%{opacity:0}}
@keyframes cbB2{0%,38%{opacity:0;transform:translateX(0)}40%{opacity:1;fill:var(--link-color,#4a9ae1)}44%{transform:translateX(150);fill:var(--link-color,#4a9ae1)}46%{fill:#e5534b}51%{opacity:1;transform:translateX(30);fill:#e5534b}53%,100%{opacity:0}}
@keyframes cbFast{0%,32%{opacity:0}36%,50%{opacity:1}54%,100%{opacity:0}}
@keyframes cbTimer{0%,27%{transform:scaleX(1)}52%,100%{transform:scaleX(0)}}
@keyframes cbTrial{0%,56%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}58%{opacity:1}66%{opacity:1;transform:translateX(370);fill:#2ea043}69%,100%{opacity:0;transform:translateX(370)}}
@keyframes cbTrialL{0%,64%{opacity:0}68%,76%{opacity:1}80%,100%{opacity:0}}
@keyframes cbOk2{0%,80%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}82%{opacity:1}90%{opacity:1;transform:translateX(370);fill:#2ea043}92%,100%{opacity:0;transform:translateX(370)}}
@keyframes cbOk3{0%,86%{opacity:0;transform:translateX(0);fill:var(--link-color,#4a9ae1)}88%{opacity:1}96%{opacity:1;transform:translateX(370);fill:#2ea043}98%,100%{opacity:0;transform:translateX(370)}}
.cb-stc{animation:cbStClosed 15s linear infinite}
.cb-sto{animation:cbStOpen 15s linear infinite}
.cb-sth{animation:cbStHalf 15s linear infinite}
.cb-sw{animation:cbSw 15s linear infinite;transform-box:fill-box;transform-origin:left center}
.cb-ok1{animation:cbOk1 15s linear infinite}
.cb-f1{animation:cbF1 15s linear infinite}
.cb-f2{animation:cbF2 15s linear infinite}
.cb-dep{animation:cbDep 15s linear infinite}
.cb-cnt{animation:cbCnt 15s linear infinite}
.cb-b1{animation:cbB1 15s linear infinite}
.cb-b2{animation:cbB2 15s linear infinite}
.cb-fast{animation:cbFast 15s linear infinite}
.cb-timer{animation:cbTimer 15s linear infinite;transform-box:fill-box;transform-origin:left center}
.cb-trial{animation:cbTrial 15s linear infinite}
.cb-triall{animation:cbTrialL 15s linear infinite}
.cb-ok2{animation:cbOk2 15s linear infinite}
.cb-ok3{animation:cbOk3 15s linear infinite}
</style>
<svg viewBox="0 0 640 225" role="img" aria-label="Animation of a circuit breaker cycling through closed, open and half-open states: failures open the circuit, requests then fail fast, a single trial request succeeds and the circuit closes again">
  <g class="cb-stc">
    <rect x="150" y="14" width="86" height="24" rx="12" fill="#2ea043" fill-opacity=".1" stroke="#2ea043"/>
    <text x="193" y="30" text-anchor="middle" class="mono tk">CLOSED</text>
  </g>
  <g class="cb-sto" opacity=".3">
    <rect x="268" y="14" width="70" height="24" rx="12" fill="#e5534b" fill-opacity=".1" stroke="#e5534b"/>
    <text x="303" y="30" text-anchor="middle" class="mono tb">OPEN</text>
    <rect x="268" y="44" width="70" height="4" rx="2" fill="#e5534b" fill-opacity=".5" class="cb-timer"/>
  </g>
  <g class="cb-sth" opacity=".3">
    <rect x="370" y="14" width="104" height="24" rx="12" fill="#c69026" fill-opacity=".1" stroke="#c69026"/>
    <text x="422" y="30" text-anchor="middle" class="mono tw">HALF-OPEN</text>
  </g>
  <rect x="30" y="105" width="120" height="55" rx="6" class="bx"/>
  <text x="90" y="137" text-anchor="middle">service</text>
  <line x1="152" y1="132" x2="290" y2="132" class="ln"/>
  <circle cx="296" cy="132" r="3" fill="var(--tint-color,#aaa)"/>
  <line x1="296" y1="132" x2="344" y2="132" stroke="var(--text-color,#555)" stroke-width="2" class="cb-sw"/>
  <circle cx="350" cy="132" r="3" fill="var(--tint-color,#aaa)"/>
  <line x1="352" y1="132" x2="468" y2="132" class="ln"/>
  <rect x="470" y="105" width="140" height="55" rx="6" class="bx cb-dep"/>
  <text x="540" y="137" text-anchor="middle">dependency</text>
  <circle class="cb-ok1" cx="160" cy="132" r="5" opacity="0"/>
  <circle class="cb-f1" cx="160" cy="132" r="5" opacity="0"/>
  <circle class="cb-f2" cx="160" cy="132" r="5" opacity="0"/>
  <text x="230" y="185" class="lbl cb-cnt" opacity="0">failure threshold crossed → open the circuit</text>
  <circle class="cb-b1" cx="160" cy="120" r="5" opacity="0"/>
  <circle class="cb-b2" cx="160" cy="145" r="5" opacity="0"/>
  <text x="230" y="185" class="lbl cb-fast" opacity="0">failing fast — no thread waits, dependency gets a break</text>
  <circle class="cb-trial" cx="160" cy="132" r="5" opacity="0"/>
  <text x="230" y="185" class="lbl cb-triall" opacity="0">one trial request succeeds → close the circuit</text>
  <circle class="cb-ok2" cx="160" cy="132" r="5" opacity="0"/>
  <circle class="cb-ok3" cx="160" cy="132" r="5" opacity="0"/>
</svg>
<figcaption>Closed → open → half-open → closed. The switch in the middle is the entire idea: when things are bad, stop touching them.</figcaption>
</figure>

## 10. Safe Database Migrations

Additive first: add the column, then write to it, then read
from it, then drop the old one. No long locks. Always a
rollback plan. Every step safe with the previous version of the
code still running.

**Why it is needed: migrations are how most "the deploy broke
prod" incidents actually happen — the code is fine, but the
migration locked a table for two minutes or removed a column
the old version still reads.**

<figure class="anim">
<style>
@keyframes mgP1{0%,1%{opacity:0}4%,22%{opacity:1}26%,100%{opacity:0}}
@keyframes mgP2{0%,26%{opacity:0}29%,47%{opacity:1}51%,100%{opacity:0}}
@keyframes mgP3{0%,51%{opacity:0}54%,72%{opacity:1}76%,100%{opacity:0}}
@keyframes mgP4{0%,76%{opacity:0}79%,97%{opacity:1}100%{opacity:0}}
@keyframes mgNewDash{0%,5%{opacity:0}9%,16%{opacity:1}18%,100%{opacity:0}}
@keyframes mgNewSolid{0%,15%{opacity:0}19%,100%{opacity:1}}
@keyframes mgWOld{0%,28%{opacity:0}31%,49%{opacity:1}53%,100%{opacity:0}}
@keyframes mgWNew{0%,30%{opacity:0}33%,72%{opacity:1}76%,100%{opacity:0}}
@keyframes mgROld{0%{opacity:1}53%,55%{opacity:1}59%,100%{opacity:.1}}
@keyframes mgRNew{0%,57%{opacity:0}61%,100%{opacity:1}}
@keyframes mgDrop{0%,79%{opacity:1}88%,100%{opacity:.1}}
@keyframes mgDropL{0%,84%{opacity:0}88%,98%{opacity:1}100%{opacity:0}}
@keyframes mgDash{to{stroke-dashoffset:-24}}
.mg-p1{animation:mgP1 16s linear infinite}
.mg-p2{animation:mgP2 16s linear infinite}
.mg-p3{animation:mgP3 16s linear infinite}
.mg-p4{animation:mgP4 16s linear infinite}
.mg-newdash{animation:mgNewDash 16s linear infinite}
.mg-newsolid{animation:mgNewSolid 16s linear infinite}
.mg-wold{animation:mgWOld 16s linear infinite}
.mg-wnew{animation:mgWNew 16s linear infinite}
.mg-rold{animation:mgROld 16s linear infinite}
.mg-rnew{animation:mgRNew 16s linear infinite}
.mg-drop{animation:mgDrop 16s linear infinite}
.mg-dropl{animation:mgDropL 16s linear infinite}
.mg-flow{stroke-dasharray:6 6;animation:mgDash 1.2s linear infinite}
</style>
<svg viewBox="0 0 640 235" role="img" aria-label="Animation of a safe four phase database migration: add the new column, write to both, switch reads to the new column, then drop the old one — each phase safe with the previous code version still running">
  <text x="320" y="26" text-anchor="middle" class="mono mg-p1" opacity="0">1 · add new_col</text>
  <text x="320" y="26" text-anchor="middle" class="mono mg-p2" opacity="0">2 · write to both</text>
  <text x="320" y="26" text-anchor="middle" class="mono mg-p3" opacity="0">3 · read from new</text>
  <text x="320" y="26" text-anchor="middle" class="mono mg-p4" opacity="0">4 · drop old_col</text>
  <rect x="30" y="80" width="120" height="70" rx="6" class="bx"/>
  <text x="90" y="110" text-anchor="middle">app</text>
  <text x="90" y="128" text-anchor="middle">code</text>
  <text x="395" y="60" text-anchor="middle" class="lbl">orders table</text>
  <g class="mg-drop">
    <rect x="290" y="72" width="100" height="86" rx="5" class="bx"/>
    <text x="340" y="118" text-anchor="middle" class="mono">old_col</text>
  </g>
  <text x="340" y="176" text-anchor="middle" class="lbl mg-dropl" opacity="0">dropped — nothing reads it</text>
  <rect x="410" y="72" width="100" height="86" rx="5" class="bx mg-newdash" stroke-dasharray="5 4" opacity="0"/>
  <g class="mg-newsolid" opacity="0">
    <rect x="410" y="72" width="100" height="86" rx="5" class="bx" stroke="#2ea043"/>
    <text x="460" y="118" text-anchor="middle" class="mono tk">new_col</text>
  </g>
  <g class="mg-wold" opacity="0">
    <path d="M 152 100 C 220 90 250 92 286 96" fill="none" stroke="var(--link-color,#4a9ae1)" stroke-width="1.5" class="mg-flow"/>
    <text x="210" y="82" class="lbl ta">write</text>
  </g>
  <g class="mg-wnew" opacity="0">
    <path d="M 152 115 C 260 130 330 140 406 140" fill="none" stroke="var(--link-color,#4a9ae1)" stroke-width="1.5" class="mg-flow"/>
    <text x="250" y="152" class="lbl ta">write</text>
  </g>
  <g class="mg-rold">
    <path d="M 286 130 C 240 140 200 138 154 130" fill="none" stroke="#c69026" stroke-width="1.5" class="mg-flow"/>
    <text x="196" y="155" class="lbl tw">read</text>
  </g>
  <g class="mg-rnew" opacity="0">
    <path d="M 406 90 C 300 66 220 72 154 88" fill="none" stroke="#2ea043" stroke-width="1.5" class="mg-flow"/>
    <text x="260" y="64" class="lbl tk">read</text>
  </g>
  <text x="320" y="215" text-anchor="middle" class="tk" font-size="11">✓ every phase is safe with the previous version of the code still running</text>
</svg>
<figcaption>Expand, migrate, contract. At no point does the running old version lose a column it depends on.</figcaption>
</figure>

## What NOT to Build Too Early

The other half of production-readiness is not over-engineering.
Almost certainly not needed yet: dynamic config reload,
unsampled tracing on every span, custom retry frameworks,
feature flags on every line, multi-region active-active before
your first incident.

**Why it matters: each of these costs complexity today for a
failure you cannot see yet. Build for the failures you can
already see.**

## Closing

None of this is glamorous. But the gap between services that
run quietly for years and services that page somebody every
other week is almost entirely in this list.

> Build for boring. Boring is what survives.
