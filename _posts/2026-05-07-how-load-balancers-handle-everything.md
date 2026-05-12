---
layout: post
title: "How One Process Holds 100,000 Connections: A Tour Through the Network Stack"
date: 2026-05-07 12:00:00 +0530
tags: [networking, linux, kernel, nginx, tcp]
---

<iframe src="/assets/video/load-balancers/visualization.html"
        style="width:100%; max-width:1040px; height:680px; display:block; margin:1rem auto; border:none; border-radius:10px; background:#0b0f1a;"
        loading="lazy"
        title="Animated walkthrough: how NGINX holds 100,000 connections"></iframe>

A question that bothered me for a long time: how does one NGINX process handle a hundred thousand simultaneous connections, while a Spring Boot app on the same hardware falls over at five thousand? They're both written in well-engineered languages. They're both running on the same CPU. They both speak HTTP. So what's actually different?

The honest answer takes a tour through the kernel, the network card, sockets, file descriptors, system calls, and the design of TCP itself. Each piece is small. The pieces together explain why a load balancer is fundamentally a different kind of program than the application sitting behind it.

This post is that tour. By the end you'll know what a socket actually is (it's not a port), what the kernel is actually doing while your code sleeps, why `epoll` was invented, what `sendfile` is, and why a TCP connection has no idea where your HTTP request ends.

## Setting up the question

A load balancer's job is simple in description: bytes come in from clients, the load balancer picks an upstream server, bytes go out to that server, the response comes back, the response goes to the client. Repeat.

A web application's job is also simple in description: bytes come in, you parse them, you do something useful (look up a user, run a query, render a template), bytes go out.

If you measure how much CPU each spends per request, the load balancer might spend 5–20 microseconds. The app might spend 5–500 milliseconds. That's a four-to-five order of magnitude gap. So at the end of the day the answer to "why can a load balancer handle so much more?" is partly just **"because it does much less work per request."**

But that's not the whole story. Even if your app's handler returned the string `"ok"` and did nothing else, a default Spring Boot or Django setup would still cap out far below NGINX. The reason is structural — how the program is *built*, not just what it does. That structural difference is what we're here to understand.

## The first wall: userspace and the kernel

Your computer's CPU runs in two privilege levels. This is enforced in hardware.

- **Kernel mode** can do anything. Read memory anywhere. Talk directly to the network card, the disk, the keyboard. Manage virtual memory. Schedule processes.
- **User mode** can do almost nothing privileged. Your programs (Postgres, Chrome, NGINX, your Java app) run here. They're sandboxed.

When your program needs to do anything that touches hardware or other processes — open a file, send a packet, allocate memory — it has to ask the kernel. That request is called a **system call** (`syscall`). Think of it the way a bank teller asks the vault manager to bring out cash. The teller doesn't walk into the vault themselves.

```
┌─────────────────────────────────────┐
│  USER SPACE                         │
│  ┌──────┐  ┌────────┐  ┌────────┐   │
│  │ NGINX│  │Postgres│  │ Chrome │   │
│  └───┬──┘  └───┬────┘  └───┬────┘   │
│      │ syscall │           │        │
├──────┼─────────┼───────────┼────────┤
│      ▼         ▼           ▼        │
│  KERNEL SPACE                       │
│  network stack, file system,        │
│  process scheduler, memory manager  │
└──────────────────┬──────────────────┘
                   ▼
         Hardware (NIC, disk, ...)
```

Crossing that boundary is not free. The CPU has to flush some state, switch privilege level, copy data between user buffers and kernel buffers, then switch back. Doing one syscall is fine. Doing a million per second per request is what you're trying to avoid.

A lot of the tricks we'll see — `epoll`, `sendfile`, `SO_REUSEPORT` — are essentially clever ways to do less work at this boundary, or to do it in larger batches.

## A socket is not a port

If you've used `netstat` or `ss` you've probably absorbed a vague mental model where ports are slots and one program "owns" each slot. That model breaks down quickly. Let's replace it.

A **port** is a 16-bit number on your machine. Nothing more. It's a label, like an apartment number on a building.

A **socket** is a TCP connection. It's identified not by a port, but by the full **4-tuple**:

```
(local_ip, local_port, remote_ip, remote_port)
```

Two sockets are the same if and only if all four fields match. Change any one — including the remote port — and it's a different socket.

The address-and-apartment analogy actually works well here. Your apartment building has one street address. But the building has many residents, each having many active conversations with people outside. The street address (port) is shared by everyone. What identifies a particular conversation (socket) is the full four-way tuple of "who's talking to whom."

So when NGINX listens on port 80 and a thousand clients connect, you don't have one socket. You have a thousand and one:

| Socket | local | remote |
|--------|-------|--------|
| Listening | 10.0.0.5:**80** | * (any) |
| Conn #1 | 10.0.0.5:**80** | 1.2.3.4:51000 |
| Conn #2 | 10.0.0.5:**80** | 1.2.3.4:51001 |
| Conn #3 | 10.0.0.5:**80** | 5.6.7.8:62000 |
| ... | ... | ... |

All on port 80. The kernel keeps a hash table internally and dispatches incoming packets to the right socket using the full 4-tuple from the IP and TCP headers.

In your program, a socket isn't an object — it's a small integer called a **file descriptor**. Open a file, get an FD. Open a socket, get an FD. The kernel maintains a per-process table mapping these integers to actual underlying objects. When you `read(7, buf, size)`, you're saying "kernel, give me bytes from whatever FD #7 is." Sockets and files share most of the same syscall interface (`read`, `write`, `close`) — that uniformity is one of the most useful design choices in Unix.

## The TCP handshake happens without your program

Here's something that surprised me when I first really understood it: when a client connects to your server, your application doesn't see any of the handshake. The kernel does it alone.

Recall the 3-way handshake:

```
Client                          Server (kernel)
  │                                  │
  │ ─────── SYN ──────────────────▶  │   "I want to connect"
  │                                  │
  │ ◀────── SYN-ACK ────────────────  │   "OK, I'm listening"
  │                                  │
  │ ─────── ACK ──────────────────▶  │   "Great, we're connected"
  │                                  │
  │   ── connection established ──   │
```

Three packets fly back and forth. The kernel sends the SYN-ACK. The kernel receives the final ACK. NGINX hasn't been called once.

When the handshake completes, the kernel does four things:

1. Allocates a new socket struct for this connection.
2. Adds it to the **accept queue** of the listening socket.
3. Marks the listening socket as "readable."
4. If a thread is parked waiting for that socket, wake it up.

The connection is *already alive* before the application ever calls `accept()`. The `accept()` call doesn't do networking — it just hands the application the next finished connection from the queue.

This is more like a hospital ER triage desk than anything else. The triage nurse handles intake, paperwork, vitals, and parks the patient in a waiting bay. The doctor only sees patients who are already prepped and ready. The doctor doesn't open the front door.

That separation matters because it means the kernel can absorb bursts of connections without your application doing anything. If a thousand clients all SYN at once, the kernel rides the wave, completes a thousand handshakes, fills the accept queue, and marks the listening socket readable. NGINX wakes up once and pulls a thousand finished connections out of the queue in a tight loop.

## TCP doesn't know what an HTTP request is

This is the second thing I had to reset in my head. TCP delivers a **stream of bytes**. There are no message boundaries inside TCP. The kernel has zero concept of what a "request" is.

The model to hold in your head is a conveyor belt of letters arriving at a post office. The belt never stops. Letters of different sizes drop onto it from outside. The belt itself doesn't know where one envelope ends and the next begins — that's a job for whoever's pulling letters off the belt and looking at the addresses.

So when Alice's browser sends:

```
GET /index.html HTTP/1.1\r\n
Host: example.com\r\n
\r\n
```

Those bytes flow into the kernel's receive buffer for Alice's socket as raw data. The kernel marks the socket readable. NGINX reads bytes. But how does NGINX know it has a *complete* request and not half of one?

It doesn't, until it checks. Specifically, it has to apply HTTP's framing rules:

- For a request with no body (`GET`), the request ends at the blank line `\r\n\r\n`. NGINX scans the bytes for that sequence.
- For a request with a body (`POST`), the headers must include `Content-Length: N`. NGINX reads the headers, sees `N`, then reads exactly `N` more bytes after the blank line.
- For chunked encoding, the body comes in length-prefixed chunks, terminated by a chunk of size zero.

The kernel knows none of this. It knows TCP. The application knows HTTP. The kernel says "you have new bytes." The application says "okay, do those bytes form a complete message yet? If not, I'll wait for more."

That's why a real event loop has to keep a per-connection buffer. A wake-up might give NGINX 30 bytes — half a header line. NGINX appends those 30 bytes to that connection's buffer, checks if it has a full request yet, and if not, goes back to sleep. The next wake-up might give it the rest. Or might give it the next request's first half too, if the client is pipelining. The application has to pull the bytes apart correctly.

This is also why TCP is so universal. The kernel doesn't care if the bytes are HTTP, SSH, MySQL wire protocol, MQTT, or your custom binary format. It just shovels bytes. Every protocol does its own framing on top.

## The C10k problem and why threads stop working

Now we can finally see why naive servers don't scale.

Suppose you wrote a server in Java. The traditional approach is one thread per connection:

```java
ServerSocket server = new ServerSocket(80);
while (true) {
    Socket client = server.accept();
    new Thread(() -> handle(client)).start();
}

void handle(Socket client) {
    InputStream in = client.getInputStream();
    byte[] buffer = new byte[4096];
    int n = in.read(buffer);   // <-- thread parked here, waiting
    // ... process ...
    out.write(response);
    client.close();
}
```

Every call to `in.read()` blocks the thread. The thread is parked inside the kernel until bytes arrive. While parked, that thread is consuming:

- A native OS thread, with its own kernel scheduling structures.
- A stack — by default 1 MB on Linux for Java, sometimes 8 MB elsewhere.
- A slot in the scheduler's runnable/blocked queues.

A thousand connections → a thousand threads → roughly a gigabyte of stack memory just sitting around, doing nothing, *waiting*. That's the cost without any work happening yet.

It gets worse when work *does* happen. Every time the kernel decides to switch from one thread to another (a "context switch"), it has to save registers, swap virtual memory mappings (sometimes), invalidate parts of the CPU cache, and run the scheduler. At a few thousand threads this becomes a meaningful fraction of total CPU time. By 10,000 threads the machine is spending more time switching threads than running them.

This is the **C10k problem**, named in 1999 by Dan Kegel, asking how you'd handle ten thousand concurrent connections on a single machine. The answer is: not with threads.

The deeper observation is this: most of those threads aren't doing work. They're waiting on I/O. A connection spends maybe 5% of its lifetime actually consuming CPU and 95% sitting in `read()` waiting for the network. Threads are the unit of CPU scheduling — using them as the unit of "in-flight connection" wastes most of their capacity.

## The event loop: stop assigning a worker per connection

The fix is to stop binding "a connection" to "a thread." Instead, have one thread that knows about *all* the connections, and only does work for a connection when there's actually something to do.

The pseudocode looks like this:

```python
loop = epoll()
loop.register(listening_socket)
buffers = {}   # per-connection accumulated bytes

while True:
    ready_sockets = loop.wait()    # parks the thread until any socket is ready
    for sock in ready_sockets:
        if sock is listening_socket:
            new_client = sock.accept()
            loop.register(new_client)
            buffers[new_client] = b""
        else:
            chunk = sock.read()
            buffers[sock] += chunk
            if request_is_complete(buffers[sock]):
                response = handle(buffers[sock])
                sock.write(response)
                buffers[sock] = b""
```

The shift is in `loop.wait()`. The thread isn't waiting on one specific socket. It's saying to the kernel: "Here's a list of N sockets I care about. Wake me up when *any* of them has something happen." When the wake-up arrives, the thread gets back a list of just the sockets that are actually ready, processes each one, then loops.

It helps to think of this in terms of a hospital ER again. The old model was "one nurse per patient, every nurse stares at their patient nonstop." The new model is "one nurse stands at the central monitor wall. Every patient is wired up to a sensor. If anyone's sensor goes off, the nurse goes to that bed, does what's needed, comes back to the monitor wall." Most patients are stable most of the time. One nurse is plenty.

The thread really has only two modes:

1. **Asleep** inside `epoll_wait`. CPU is free. Kernel is watching the socket list.
2. **Awake** processing whichever sockets the kernel just flagged. Tiny amount of work each. Then back to step 1.

That's it. There's no state machine of "waiting for client #4's data" because the thread doesn't track that. The kernel does. The thread only sees sockets when they're already ready.

## A walk-through of one request

Let's actually trace what happens, end to end, when Alice's browser hits an NGINX-fronted server. NGINX is in event-loop mode. Nothing else is happening on the server. Alice is on a slow mobile network.

**T = 0 ms.** NGINX is parked in `epoll_wait`. The watch list contains one socket: the listening socket on port 80.

**T = 1 ms.** Alice's SYN packet hits the network card. The NIC raises an interrupt. The kernel's network stack runs, processes the SYN, sends a SYN-ACK back to Alice. NGINX is still asleep — it never sees this.

**T = 51 ms.** Alice's final ACK arrives. The handshake is complete. The kernel allocates a new socket for this connection, queues it on the listening socket's accept queue, marks the listening socket readable, and wakes the NGINX thread.

**T = 51.01 ms.** NGINX wakes up. The list it got back from `epoll_wait` contains one entry: the listening socket. NGINX calls `accept()`, gets back a new file descriptor — let's say FD 8. NGINX registers FD 8 with epoll. NGINX calls `epoll_wait` again. Asleep.

**T = 90 ms.** Alice's browser finally sends the first chunk of her HTTP request. Maybe just `GET /index.h`. The bytes arrive at the NIC, the kernel routes them to FD 8's receive buffer, marks FD 8 readable, wakes NGINX.

**T = 90.01 ms.** NGINX wakes, sees FD 8 in the ready list, calls `read(8, buf, 4096)`, gets back 11 bytes. It appends those to FD 8's buffer (`b"GET /index.h"`). Checks if it has `\r\n\r\n` yet. No. Goes back to sleep.

**T = 130 ms.** Rest of the request arrives: `tml HTTP/1.1\r\nHost: example.com\r\n\r\n`. Kernel marks FD 8 readable. NGINX wakes.

**T = 130.01 ms.** NGINX reads the new bytes, appends, now has the full request. The framing rule says a `GET` ends at the blank line, and the blank line is here. NGINX parses the request, decides what to do, calls `write(8, response_bytes, length)`. The bytes copy from NGINX's userspace into the kernel's send buffer for FD 8. `write()` returns immediately — the kernel will deliver them as fast as TCP allows. NGINX goes back to `epoll_wait`.

**T = 130–200 ms.** Kernel sends packets, gets ACKs from Alice, retransmits any that drop, finishes delivery. NGINX is asleep through all of this. If Alice's connection is keep-alive, FD 8 stays registered with epoll, ready to accumulate the next request.

The interesting beats of that timeline: NGINX did three short bursts of work and was asleep for 99.99% of the elapsed time. That's the whole secret. While Alice's connection was idle (the human-scale gap between her phone deciding to send a packet and the bytes actually arriving), NGINX could be servicing other clients. And there's nothing about Alice's connection consuming a thread, a stack, or a scheduler slot.

## Zooming in: what one wake-up actually looks like

The timeline above was in milliseconds — the human-scale view, where most of the time is just waiting for the network. But each of those wake-ups is itself a tiny choreography of kernel and userspace work. If you zoom into just one of them — say, the moment bytes arrive on a socket and NGINX has to handle them — the events play out in microseconds, and the most interesting structural detail emerges: NGINX crosses the user/kernel boundary **four times** in a single request.

```
TIME    LOCATION                  WHAT'S HAPPENING
────    ────────                  ────────────────
0 µs    KERNEL (network stack)    packet arrives, bytes land in recv buffer
2 µs    KERNEL (epoll)            client_A added to ready list
3 µs    KERNEL (scheduler)        NGINX thread marked runnable
5 µs    KERNEL (context switch)   CPU saves prev, loads NGINX
6 µs    KERNEL (epoll_wait)       fills events[], returns to userspace
        ─────────── boundary crossed UP ───────────
7 µs    USERSPACE (NGINX loop)    sees client_A, EPOLLIN, dispatches
8 µs    USERSPACE                 calls read()
        ─────────── boundary crossed DOWN ──────────
9 µs    KERNEL                    copies recv buffer → NGINX buffer
10 µs   KERNEL                    returns
        ─────────── boundary crossed UP ───────────
11 µs   USERSPACE                 appends to per-connection buffer
12 µs   USERSPACE                 scans for \r\n\r\n, request complete
13 µs   USERSPACE                 builds response in memory
20 µs   USERSPACE                 calls write()
        ─────────── boundary crossed DOWN ──────────
21 µs   KERNEL                    copies NGINX buffer → send buffer, returns
        ─────────── boundary crossed UP ───────────
22 µs   USERSPACE                 minor cleanup, calls epoll_wait
        ─────────── boundary crossed DOWN ──────────
23 µs   KERNEL (epoll_wait)       ready list empty, parks NGINX
24 µs   KERNEL (scheduler)        NGINX off run queue, on epoll wait queue
                                  CPU is free
        ─────────── NGINX is asleep again ──────────
```

Across the whole window, NGINX's userspace code ran for maybe 12 of the 24 microseconds. The rest was kernel work the application doesn't see — scheduler decisions, buffer copies, context switches. And the boundary got crossed four times: up out of `epoll_wait`, down into `read`, down into `write`, down into `epoll_wait` again. Each crossing has the cost we already named — privilege switch, register save/restore, buffer copy.

For one request, this is invisible. For a hundred thousand requests per second, those crossings start to add up. That's why every modern optimization at this layer — `epoll` itself, `sendfile`, `io_uring`, kernel bypass — is fundamentally about **doing more work per crossing**, or eliminating crossings entirely.

## How `epoll` actually keeps the watch list

Worth a moment on what `epoll` is internally, because the design is what makes it scale.

Earlier interfaces like `select` and `poll` worked, but each call had to pass the *entire* list of file descriptors being watched into the kernel, every time. Every `select()` was O(N) with N being your connection count. At 100,000 connections that's catastrophic.

`epoll` flips it. You set up an epoll instance (also a file descriptor, charmingly) and tell the kernel once: *"add this FD to my watch set, here's what events I care about."* The kernel keeps that set as a red-black tree internally. When events occur, the kernel moves the affected FDs onto a separate **ready list** within the epoll instance. When you call `epoll_wait`, the kernel hands back whatever's currently on the ready list. O(number of ready events), not O(total registered).

This is the difference between standing at a monitor wall checking each screen one by one (`select`) versus having lights that flash on the screens that need attention (`epoll`). The kernel does the watching; you just see the events.

## Going multi-core: SO_REUSEPORT

A single epoll loop runs on a single core. Eventually, with enough connections, that one core saturates — not from waiting (the waiting is free) but from the actual processing of ready events. To use a 16-core server, you want 16 event loops in parallel.

The intuitive approach is: have 16 worker processes, all sharing the same listening socket, all calling `accept()`. The problem is the **thundering herd** — when a connection arrives, all 16 worker processes wake up, race to call `accept()`, only one succeeds, and the other 15 go back to sleep having achieved nothing. At high connection rates this wastes a measurable chunk of CPU.

The fix is `SO_REUSEPORT`. Normally only one process can `bind` a port; the second one to try gets `EADDRINUSE`. With this socket option set, the kernel allows multiple processes to each open *their own* listening socket on the same port. The kernel maintains them as a group. When a new connection's SYN arrives, the kernel hashes the 4-tuple, picks one of the listening sockets in the group, and delivers the connection only there. No herd. No contention.

```
                  Port 80
                     │
              ┌──────┴──────┐
              │   Kernel    │   ← hashes incoming connection,
              │  picks one  │     routes to exactly one worker
              └──┬──┬──┬──┬─┘
                 ▼  ▼  ▼  ▼
              W1 W2 W3 W4   (worker processes, one per CPU core)
              │  │  │  │
            (each runs its own epoll loop)
```

A neat way to picture this: a multi-counter post office where the entry doors automatically issue you a numbered ticket and direct you to a specific counter. You never see a crowd at any one counter, because the entry system does the spreading. The kernel is that ticketing system; the counters are the worker processes.

This is also why pinning workers to specific CPU cores can squeeze out more throughput. Once a connection has been hashed to worker 3, all of its packets will keep going to worker 3, which means worker 3's CPU cache stays warm for that connection's data. No bouncing between cores.

## `sendfile` and the zero-copy trick

The last optimization worth understanding is `sendfile`. It's not strictly part of the load-balancer story, but it's the same school of design — squeeze unnecessary work out of the user/kernel boundary.

Imagine NGINX is serving `/index.html` from disk. The naive way:

```
1. read(file_fd, buffer, size)    → bytes flow disk → kernel → userspace buffer
2. write(socket_fd, buffer, size) → bytes flow userspace buffer → kernel → NIC
```

Each byte gets copied four times. It crosses the user/kernel boundary twice. NGINX never even modifies the bytes — they go in one side and out the other, untouched.

`sendfile` is a single syscall that says "kernel, please move bytes directly from this file FD to this socket FD." The kernel does it without ever bringing the bytes up into userspace.

```
   DISK                              NETWORK
    │                                   ▲
    ▼                                   │
 ┌─────────────┐    direct copy   ┌─────────────┐
 │ kernel buf  │─────────────────▶│ kernel buf  │
 └─────────────┘                  └─────────────┘
```

Two copies become one, two syscalls become one, no userspace buffer needed. On modern Linux, with the right setup, you can go further — DMA from the disk controller straight into the network card's buffer, with the CPU barely touching the bytes at all.

Think of a librarian. The slow way is: a customer asks for a book; the librarian fetches it from the shelves, brings it to the counter, hands it across to the customer. The fast way: a chute connects the shelves directly to the pickup window; the librarian just routes the book through the chute. Same delivery, less handling.

This is why static-file serving from NGINX is so absurdly fast that it's almost cheating. NGINX isn't doing work — it's coordinating the kernel to do work without copying bytes through it.

## Why your application can't just do this

Reading all this, you might be wondering: if event loops, epoll, and zero-copy are so great, why don't backend apps just adopt the same model?

Some do — Node.js, Netty, Vert.x, async Python (asyncio, FastAPI), Go (which hides this behind goroutines but uses epoll under the hood). Asynchronous frameworks exist precisely because people wanted to bring the load-balancer architecture to applications.

But the load balancer's secret isn't *only* the architecture. It's also that the load balancer's per-request work is **pure I/O**. Read some bytes. Write some bytes. Forward them to a backend. There's nothing CPU-bound between reading the request and writing the response.

A real application is rarely that lucky. It probably needs to:

- Parse a JSON body. CPU-bound.
- Validate it against a schema. CPU-bound.
- Talk to a database. I/O-bound, but the result might be 100 MB of rows you have to deserialize. CPU-bound.
- Render a template. CPU-bound.
- Compute something — checksums, ML inference, image resizing. CPU-bound.

Every CPU-bound segment in your handler blocks the event loop. While you're parsing JSON, you're not handling other connections. A single slow request can stall thousands of others. Async frameworks solve this by giving you tools (worker pools, offloading to threads) to push CPU work somewhere else. But the further you go down that path, the more your async server starts looking and feeling like the threaded server you were trying to escape.

The honest summary: a load balancer can hold 100,000 connections on one core because **its work per request is genuinely tiny and genuinely I/O-bound**. An application can use the same architecture and get gains, but it cannot escape the fact that doing real business logic costs real CPU.

## Putting it all together

So here's the load balancer's stack of advantages, cleaned up:

1. **Almost no work per request.** Read headers, pick a backend, forward bytes. Microseconds.
2. **Event loops instead of threads.** One thread can hold tens of thousands of idle connections without paying a thread-per-connection cost.
3. **`epoll` for cheap event delivery.** O(ready events), not O(total connections).
4. **`SO_REUSEPORT` for multi-core scaling.** Kernel-level connection distribution, no thundering herd.
5. **Zero-copy data paths via `sendfile` and friends.** Bytes flow through the kernel without bouncing through userspace.
6. **TCP's stream model leaves framing to userspace.** The kernel is a generic byte pipe — extremely cheap, lets the same machinery serve any protocol.
7. **Connections are mostly idle.** I/O patterns make consolidation work. If every client was constantly transmitting at line rate, none of this would help — but real clients spend most of their time waiting for humans or for round trips.

Each piece is small. Together they explain how a single NGINX worker can sit in front of dozens of application servers and not be the bottleneck. The load balancer is doing the boring, repetitive part of HTTP — the part the kernel and the network are already shaped to make easy. The application servers do the part that's actually hard, which is the work itself.

The most useful mental shift for me from learning all this was realizing that **waiting is not a resource cost** when you do it right. The old threaded server treats waiting as expensive because it ties up a thread. The event-loop server treats waiting as free because the thread isn't doing the waiting — the kernel is, on behalf of all connections at once. Once you internalize that, "100,000 idle connections" stops sounding impressive and starts sounding like the obvious thing to build for.

## Question

Where do you think the next bottleneck shows up after you've gotten event loops, `epoll`, and `SO_REUSEPORT` working? At what point does the kernel itself become the thing slowing you down?
