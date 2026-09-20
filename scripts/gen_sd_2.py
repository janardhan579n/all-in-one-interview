"""System design concepts, batch 2. Run: python3 scripts/gen_sd_2.py"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "system-design" / "concepts"
OUT.mkdir(parents=True, exist_ok=True)
C = []

C.append({
  "id": "database",
  "title": "Databases — SQL and NoSQL",
  "group": "Data",
  "level": 1,
  "estimatedMinutes": 30,
  "summary": "Durable, queryable, concurrent storage. The real choice is not 'which is better' but 'which access patterns and guarantees do I need'.",
  "analogy": "A filing system for an office. A relational database is a set of ruled ledgers with strict columns, cross-references between books, and a rule that a transfer is written in both books or neither. A document store is a drawer of folders: each folder holds everything about one customer in whatever shape suits them, which is fast to fetch whole and awkward to query across.",
  "explanation": {
    "beginner": "A database stores data so it survives restarts, can be searched quickly, and can be used safely by many people at once. Relational databases (Postgres, MySQL) keep data in tables with fixed columns and can guarantee that a group of changes either all happen or none do — essential for money. NoSQL databases relax some of those rules to make it easier to spread data across many machines or to store records with varying shapes.",
    "interview": "Relational systems provide ACID transactions, a declarative query language, and referential integrity via a normalised schema, with B-tree indexes making point and range queries O(log n). NoSQL is an umbrella: document, key-value, wide-column, and graph stores, each trading some of relational's guarantees or query flexibility for horizontal scalability or a better fit to a specific access pattern. The decisive questions are the consistency requirement, the query shapes, and whether the working set exceeds one machine."
  },
  "diagram": {
    "nodes": [
      {"id": "app", "label": "Application", "type": "server", "x": 140, "y": 300},
      {"id": "sql", "label": "Relational\\n(Postgres / MySQL)", "type": "db", "x": 480, "y": 170,
       "note": "Tables, joins, transactions, constraints. Strong consistency by default.",
       "why": {"without": ["Invariants like 'balance never goes negative' must be enforced in application code across many services"], "with": ["The database enforces them for every writer, including the ones you forgot about"], "conclusion": "Constraints in the schema outlive the code that wrote them."}},
      {"id": "doc", "label": "Document store\\n(MongoDB)", "type": "db", "x": 480, "y": 300, "note": "Nested documents, flexible schema, easy horizontal partitioning. Weaker cross-document guarantees."},
      {"id": "kv", "label": "Key-value\\n(Redis / DynamoDB)", "type": "db", "x": 480, "y": 430, "note": "O(1) access by key, enormous throughput, minimal query ability."},
      {"id": "index", "label": "Index (B-tree)", "type": "search", "x": 810, "y": 170, "note": "Turns an O(n) table scan into an O(log n) descent — at the cost of slower writes and more storage."}
    ],
    "edges": [
      {"from": "app", "to": "sql"}, {"from": "app", "to": "doc"}, {"from": "app", "to": "kv"},
      {"from": "sql", "to": "index", "dashed": True}
    ]
  },
  "why": {
    "without": ["Data vanishes on restart", "Concurrent writers overwrite each other", "Every query is a full scan of a file"],
    "with": ["Durability, indexing, concurrency control and a query language you do not have to write"],
    "conclusion": "You are not going to out-engineer forty years of database work. Choose one and learn its failure modes."
  },
  "whenToUse": [
    "Relational: transactions, relationships, ad-hoc queries, reporting, anything involving money or inventory",
    "Document: records that are read and written as a whole and vary in shape — product catalogues, user profiles, event payloads",
    "Key-value: caching, sessions, counters, feature flags, anything looked up by a single known key",
    "Wide-column (Cassandra): write-heavy time-series at very large scale with known query patterns",
    "Graph: relationship traversal is the primary query — recommendations, fraud rings, social graphs"
  ],
  "whenNotToUse": [
    "Do not choose NoSQL for 'scale' before you have measured; a single Postgres instance handles far more than most people assume",
    "Do not use a relational database as a queue or a cache — dedicated tools do both far better",
    "Do not pick a graph database because your data has a few foreign keys"
  ],
  "tradeoffs": [
    {"option": "SQL (relational)", "pros": ["ACID transactions across rows and tables", "Joins and ad-hoc queries without pre-planning", "Constraints enforce invariants centrally", "Mature tooling, well-understood operations"], "cons": ["Horizontal scaling of writes is genuinely hard", "Schema migrations need planning on large tables", "Object-relational mapping friction"]},
    {"option": "NoSQL (document / wide-column)", "pros": ["Partitioning built in, near-linear write scaling", "Flexible schema suits varying record shapes", "Optimised for known access patterns"], "cons": ["Limited or no joins — you denormalise instead", "Weaker cross-record guarantees, often eventual consistency", "A query pattern you did not design for can be impossible or catastrophically slow"]}
  ],
  "keyNumbers": [
    {"label": "Indexed point read", "value": "~1 ms"},
    {"label": "Unindexed scan of 1M rows", "value": "hundreds of ms to seconds"},
    {"label": "Single-node Postgres writes", "value": "thousands per second"},
    {"label": "Redis operations", "value": "100k+ per second per node"},
    {"label": "ACID", "value": "Atomicity · Consistency · Isolation · Durability"}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "You are designing payments. Which storage guarantee matters most?",
     "options": ["Eventual consistency for speed", "ACID transactions, so a debit and the matching credit either both happen or neither does", "Schema flexibility", "Horizontal write scaling"],
     "answerIndex": 1,
     "explanation": "Money demands atomicity and isolation. Financial systems are the clearest case where a relational database's guarantees are the requirement, not a preference."},
    {"id": "q2", "type": "architecture", "question": "An unindexed query over 10 million rows takes 8 seconds. What is the first thing to try?",
     "options": ["Switch to NoSQL", "Add an index on the filtered column, turning the scan into a B-tree lookup", "Add more app servers", "Add a cache"],
     "answerIndex": 1,
     "explanation": "A missing index is by far the most common cause of a slow query. Caching hides the problem for repeated reads; switching databases is an expensive way to avoid running CREATE INDEX."},
    {"id": "q3", "type": "mcq", "question": "What does adding an index cost you?",
     "options": ["Nothing", "Slower writes (every insert and update maintains the index too) and additional storage", "Slower reads", "Loss of transactions"],
     "answerIndex": 1,
     "explanation": "Indexes are a read-write trade. A table with ten indexes does ten extra structure updates per insert, which is why write-heavy tables are indexed sparingly."}
  ],
  "related": ["replication", "sharding", "cache", "cap-theorem"]
})

C.append({
  "id": "cache",
  "title": "Cache",
  "group": "Performance",
  "level": 1,
  "estimatedMinutes": 30,
  "summary": "Keep the answers you keep needing somewhere faster and closer. The hard part is not storing them — it is knowing when they have gone stale.",
  "analogy": "Keeping the three books you are actually using on your desk instead of walking to the library each time. The desk is small, so you keep only what you reach for most; and if the library issues a corrected edition, the copy on your desk is quietly wrong until you notice.",
  "explanation": {
    "beginner": "Fetching data from a database takes a few milliseconds; fetching it from memory takes microseconds. If the same data is requested over and over, storing it in a fast in-memory store like Redis means most requests never touch the database at all. The catch is that when the underlying data changes, the cached copy is out of date — so every cache needs a rule for when entries expire or get removed.",
    "interview": "An in-memory tier exploiting temporal and spatial locality. Effectiveness is governed by the hit rate: effective latency = hit_rate × cache_latency + (1 - hit_rate) × origin_latency, so 95% hits removes about 95% of origin load. The real design decisions are the write policy (cache-aside, write-through, write-behind), the invalidation strategy (TTL, explicit, versioned keys) and the eviction policy (LRU, LFU, TTL). Failure modes worth naming: stampede on expiry, cache penetration by missing keys, and inconsistency windows after writes."
  },
  "diagram": {
    "nodes": [
      {"id": "client", "label": "Client", "type": "client", "x": 110, "y": 300},
      {"id": "app", "label": "App server", "type": "server", "x": 370, "y": 300},
      {"id": "cache", "label": "Cache (Redis)", "type": "cache", "x": 660, "y": 180,
       "note": "Sub-millisecond in-memory lookups. Volatile by design: losing it must be survivable.",
       "why": {"without": ["1,000 reads/s => 1,000 database queries/s", "Database CPU saturates; p99 latency climbs; connection pools exhaust"], "with": ["At a 95% hit rate, 1,000 reads/s => ~50 database queries/s", "Reads served in ~0.5 ms instead of ~5 ms"], "conclusion": "Lower latency, 20x less database load, and headroom you did not have to buy."}},
      {"id": "db", "label": "Database", "type": "db", "x": 660, "y": 430, "note": "The source of truth. Only cache misses reach it."}
    ],
    "edges": [
      {"from": "client", "to": "app"},
      {"from": "app", "to": "cache", "label": "1. check"},
      {"from": "app", "to": "db", "label": "2. on miss", "dashed": True},
      {"from": "app", "to": "cache", "label": "3. store", "dashed": True}
    ]
  },
  "why": {
    "without": ["Every read hits the database, whose capacity is the hardest and most expensive thing to grow", "Read latency is bounded by disk and network", "Traffic spikes translate directly into database load"],
    "with": ["Most reads never leave memory", "Origin load drops by roughly the hit rate", "Spikes are absorbed by the cheap tier"],
    "conclusion": "Caching is the highest-leverage performance change in most systems — and the most common source of 'why is this data wrong?'."
  },
  "whenToUse": ["Reads greatly outnumber writes", "The same data is requested repeatedly", "Slightly stale data is acceptable — and you can say how stale", "Computing the value is expensive"],
  "whenNotToUse": ["Data must be exactly current (account balances at the moment of a transfer)", "Every key is read roughly once — you pay the write cost and never get a hit", "The working set is so large that the hit rate would be low anyway", "Write-heavy workloads, where invalidation costs more than it saves"],
  "tradeoffs": [
    {"option": "Cache-aside (lazy loading)", "pros": ["Only requested data is cached", "Cache failure degrades to slow, not broken", "Simple and by far the most common"], "cons": ["First request per key is always a miss", "Stale data possible between write and invalidation", "Vulnerable to stampede when a hot key expires"]},
    {"option": "Write-through", "pros": ["Cache is always consistent with the database", "No stale reads"], "cons": ["Every write pays both costs", "Caches data that may never be read"]},
    {"option": "Write-behind", "pros": ["Very fast writes, batches well"], "cons": ["Data loss if the cache dies before flushing — unacceptable for anything that matters"]},
    {"option": "TTL-only invalidation", "pros": ["Dead simple, self-healing, no invalidation bugs"], "cons": ["Staleness up to the TTL", "Synchronised expiry causes thundering herds"]}
  ],
  "keyNumbers": [
    {"label": "In-process memory read", "value": "~100 ns"},
    {"label": "Redis over the network", "value": "~0.5 ms"},
    {"label": "Database indexed read", "value": "~5 ms"},
    {"label": "Load reduction at 95% hit rate", "value": "20× fewer origin queries"},
    {"label": "Load reduction at 80% hit rate", "value": "5× fewer origin queries"}
  ],
  "interactive": "cache-sim",
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "At a 95% cache hit rate with cache reads at 0.5 ms and database reads at 5 ms, what is the average read latency?",
     "options": ["0.5 ms", "0.725 ms", "2.75 ms", "5 ms"],
     "answerIndex": 1,
     "explanation": "0.95 × 0.5 + 0.05 × 5 = 0.475 + 0.25 = 0.725 ms. Note how much the 5% of misses still contribute — which is why tail latency stays dominated by the origin."},
    {"id": "q2", "type": "architecture", "question": "A popular cached key expires and 10,000 concurrent requests all miss and hit the database at once. What is this called and how do you prevent it?",
     "options": ["Cache penetration; use a bloom filter", "Cache stampede; use a mutex/single-flight so one request refills while others wait, plus randomised TTL jitter", "Eviction; increase memory", "Cache poisoning; validate input"],
     "answerIndex": 1,
     "explanation": "A stampede (or thundering herd). Standard fixes: single-flight locking per key, staggered TTLs, and proactive refresh shortly before expiry."},
    {"id": "q3", "type": "mcq", "question": "Which data is the worst candidate for caching?",
     "options": ["A product catalogue updated daily", "A user's current account balance during a transfer", "Yesterday's analytics report", "Static configuration"],
     "answerIndex": 1,
     "explanation": "Stale money is a correctness bug, not a performance trade-off. Cache things where a small staleness window is acceptable and say explicitly how large that window is."}
  ],
  "related": ["cdn", "database", "load-balancer", "replication"]
})

C.append({
  "id": "cdn",
  "title": "CDN — Content Delivery Network",
  "group": "Performance",
  "level": 1,
  "estimatedMinutes": 22,
  "summary": "Copies of your static content in data centres near your users, so bytes travel hundreds of kilometres instead of thousands.",
  "analogy": "A chain of local warehouses instead of one central depot. When someone in Chennai orders a popular item, it ships from a Chennai warehouse rather than from Germany. Rare items still come from the central depot — but those are the minority of orders.",
  "explanation": {
    "beginner": "Data travels at roughly two-thirds the speed of light through fibre, and it cannot go faster. A request from India to a server in Virginia takes about 200 ms round trip no matter how fast your servers are. A CDN keeps copies of your images, CSS, JavaScript and videos in hundreds of locations worldwide, so users download them from a machine a few milliseconds away.",
    "interview": "A geographically distributed reverse-proxy cache. Edge PoPs terminate TLS close to the user, serve cached objects directly and forward misses to the origin, often over optimised backbone links with connection reuse. Benefits are latency reduction, origin offload and absorption of volumetric attacks. The design questions are cache-key design, TTLs, invalidation (purge versus versioned URLs) and what can safely be cached at all."
  },
  "diagram": {
    "nodes": [
      {"id": "u1", "label": "User (Mumbai)", "type": "client", "x": 110, "y": 170},
      {"id": "u2", "label": "User (London)", "type": "client", "x": 110, "y": 430},
      {"id": "e1", "label": "Edge PoP (Mumbai)", "type": "cdn", "x": 420, "y": 170, "note": "~10 ms away. Serves cached objects without ever contacting the origin."},
      {"id": "e2", "label": "Edge PoP (London)", "type": "cdn", "x": 420, "y": 430, "note": "Independent cache with its own hit rate."},
      {"id": "origin", "label": "Origin server\\n(Virginia)", "type": "server", "x": 790, "y": 300,
       "note": "Only cache misses reach it. Typically 80-95% of static traffic is absorbed at the edge.",
       "why": {"without": ["Every user waits for a trans-continental round trip on every asset", "The origin serves every byte of every image, repeatedly"], "with": ["Assets served from ~10 ms away", "Origin bandwidth and CPU drop by an order of magnitude"], "conclusion": "You cannot beat the speed of light — so move the content, not the packets."}}
    ],
    "edges": [
      {"from": "u1", "to": "e1", "label": "~10 ms"},
      {"from": "u2", "to": "e2", "label": "~8 ms"},
      {"from": "e1", "to": "origin", "label": "miss only", "dashed": True},
      {"from": "e2", "to": "origin", "label": "miss only", "dashed": True}
    ]
  },
  "why": {
    "without": ["Physics imposes 150–250 ms on intercontinental round trips", "The origin pays bandwidth for every byte, repeatedly", "A traffic spike or attack lands directly on your servers"],
    "with": ["Content served from tens of milliseconds away", "Origin traffic falls by 80–95% for static assets", "Volumetric attacks are absorbed by a network built for it"],
    "conclusion": "For static content a CDN is close to a free win. The judgement calls are all about invalidation."
  },
  "whenToUse": ["Static assets: images, CSS, JS, fonts, video", "A geographically spread user base", "Traffic spikes you cannot provision for", "Large downloads"],
  "whenNotToUse": ["Per-user personalised responses (unless you cache fragments or use edge compute carefully)", "Rapidly changing data where staleness is unacceptable", "A purely local user base already close to your origin — the benefit is small", "Anything private that must never be cached by an intermediary"],
  "tradeoffs": [
    {"option": "Long TTL + versioned URLs (app.a1b2c3.js)", "pros": ["Near-perfect hit rates", "Deploys are instantly effective because the URL changes", "No purge needed"], "cons": ["Build tooling must produce hashed filenames", "HTML itself must stay short-TTL to point at the new URLs"]},
    {"option": "Short TTL", "pros": ["Simple, content refreshes on its own"], "cons": ["Lower hit rate, more origin traffic", "Still stale for up to the TTL"]},
    {"option": "Explicit purge on deploy", "pros": ["Immediate control"], "cons": ["Propagation across hundreds of PoPs is not instantaneous", "A missed purge is a hard-to-reproduce bug"]}
  ],
  "keyNumbers": [
    {"label": "Mumbai to Virginia round trip", "value": "~200 ms"},
    {"label": "User to nearest PoP", "value": "5–30 ms"},
    {"label": "Typical static hit rate", "value": "85–95%"},
    {"label": "Speed of light in fibre", "value": "~200,000 km/s — about 1 ms per 100 km each way"}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "You deploy new JavaScript but users keep running the old version for hours. What is the standard fix?",
     "options": ["Reduce the TTL to zero", "Include a content hash in the filename so a new deploy produces a new URL the CDN has never seen", "Ask users to clear their cache", "Stop using a CDN"],
     "answerIndex": 1,
     "explanation": "Cache-busting by URL. The asset gets a one-year TTL and the deploy changes the URL, so there is nothing to invalidate — this is why build tools emit hashed filenames."},
    {"id": "q2", "type": "mcq", "question": "Why can't faster servers fix a 200 ms load time for users in Australia hitting a US origin?",
     "options": ["They can, with enough CPU", "Because most of that time is propagation delay — the speed of light through fibre, which no amount of compute changes", "Because of database queries", "Because of TLS"],
     "answerIndex": 1,
     "explanation": "Round-trip time is dominated by distance. The only fix is to shorten the distance, which is precisely what a CDN does."}
  ],
  "related": ["cache", "http", "load-balancer"]
})

C.append({
  "id": "message-queue",
  "title": "Message Queue",
  "group": "Distributed",
  "level": 2,
  "estimatedMinutes": 30,
  "summary": "Put the work in a durable buffer and let a consumer take it later — decoupling the speed of the producer from the speed of the consumer.",
  "analogy": "A restaurant's order rail. The waiter clips the ticket to the rail and goes straight back to the floor; the kitchen takes tickets in order at its own pace. Nobody waits for anybody. When a rush hits, the rail gets longer — it does not stop the waiters taking orders, and no order is lost.",
  "explanation": {
    "beginner": "Some work does not need to finish before you reply to the user. Sending a welcome email, generating a thumbnail, updating analytics — the user does not need to wait. Instead of doing it during the request, you write a message to a queue and reply immediately. A separate worker picks messages up and does the work. If the worker is slow or briefly down, messages wait in the queue instead of being lost, and the user never notices.",
    "interview": "An asynchronous, durable buffer that decouples producers from consumers in time, throughput and failure. It provides load levelling (bursts are absorbed as queue depth rather than backpressure), fault isolation (a failed consumer does not fail the request path) and independent scaling of consumers. Delivery is typically at-least-once, so consumers must be idempotent; ordering is usually only guaranteed within a partition or key. The operational signal that matters is consumer lag."
  },
  "diagram": {
    "nodes": [
      {"id": "client", "label": "Client", "type": "client", "x": 100, "y": 300},
      {"id": "api", "label": "API server", "type": "server", "x": 320, "y": 300, "note": "Writes the message and returns 202 Accepted in milliseconds."},
      {"id": "queue", "label": "Queue\\n(Kafka / SQS / RabbitMQ)", "type": "queue", "x": 580, "y": 300,
       "note": "Durable buffer. Depth absorbs bursts; lag is the metric that tells you whether consumers are keeping up.",
       "why": {"without": ["The user waits for thumbnailing and email delivery inside the request", "A third-party outage becomes YOUR outage", "A traffic spike must be absorbed by synchronous capacity you pay for permanently"], "with": ["Responses return in milliseconds", "Downstream failure delays work rather than losing it", "Spikes become queue depth"], "conclusion": "Decoupling converts a latency and availability problem into a throughput problem, which is much easier to manage."}},
      {"id": "w1", "label": "Worker", "type": "worker", "x": 850, "y": 190},
      {"id": "w2", "label": "Worker", "type": "worker", "x": 850, "y": 300},
      {"id": "dlq", "label": "Dead letter queue", "type": "queue", "x": 850, "y": 430, "note": "Messages that failed repeatedly land here for inspection instead of blocking the queue forever."}
    ],
    "edges": [
      {"from": "client", "to": "api"},
      {"from": "api", "to": "queue", "label": "publish"},
      {"from": "api", "to": "client", "label": "202 Accepted", "dashed": True},
      {"from": "queue", "to": "w1", "label": "consume"},
      {"from": "queue", "to": "w2", "label": "consume"},
      {"from": "w1", "to": "dlq", "label": "after N failures", "dashed": True}
    ]
  },
  "why": {
    "without": ["Slow downstream work inflates user-visible latency", "A dependency's outage becomes your outage", "Traffic spikes must be met with synchronous capacity", "Retrying failed work means writing your own scheduler"],
    "with": ["Fast responses; work happens behind the scenes", "Failures are retried automatically and isolated from the request path", "Bursts are absorbed as queue depth", "Consumers scale independently of the API tier"],
    "conclusion": "If the user does not need the result to continue, do not make them wait for it."
  },
  "whenToUse": ["Work that can happen after the response: emails, thumbnails, indexing, analytics, notifications", "Smoothing bursty traffic", "Fanning one event out to several independent consumers", "Long-running jobs", "Communication between services that must not fail together"],
  "whenNotToUse": ["The user needs the result now — do not queue a request/response interaction", "Strict global ordering across all messages is required", "Simple, fast, reliable work where a queue adds operational burden for nothing", "As a database: queues are for transit, not storage"],
  "tradeoffs": [
    {"option": "At-least-once delivery (the usual default)", "pros": ["No message is lost", "Simple broker implementation"], "cons": ["Duplicates WILL occur, so every consumer must be idempotent"]},
    {"option": "At-most-once", "pros": ["No duplicates"], "cons": ["Messages can be lost — acceptable only for disposable telemetry"]},
    {"option": "Exactly-once (effectively-once)", "pros": ["Cleanest semantics for the application"], "cons": ["Costly, requires transactional coordination, and is only 'exactly once' within the system's own boundary — the moment you call an external API it is at-least-once again"]},
    {"option": "Log-based (Kafka)", "pros": ["Replay from any offset, multiple independent consumer groups, very high throughput, ordering per partition"], "cons": ["More operational complexity", "Ordering only within a partition", "Retention must be planned"]},
    {"option": "Classic broker (RabbitMQ / SQS)", "pros": ["Simple queue semantics, per-message ack, easy to run or fully managed"], "cons": ["No replay after consumption", "Weaker ordering guarantees"]}
  ],
  "keyNumbers": [
    {"label": "Queue publish latency", "value": "~1–5 ms"},
    {"label": "Kafka throughput", "value": "Hundreds of thousands of messages/s per broker"},
    {"label": "The metric to alert on", "value": "Consumer lag — depth is fine, growing depth is not"}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "Your email service is down for 20 minutes. With a queue in front of it, what happens to signups during that window?",
     "options": ["Signups fail", "Signups succeed; the email messages accumulate in the queue and are delivered when the service recovers", "Emails are lost", "The queue crashes"],
     "answerIndex": 1,
     "explanation": "This is fault isolation. The request path never touches the email provider, so its outage becomes a delay in a background system rather than a failed signup."},
    {"id": "q2", "type": "architecture", "question": "A worker crashes after charging a card but before acknowledging the message. The message is redelivered. How do you avoid a double charge?",
     "options": ["Use at-most-once delivery", "Make the consumer idempotent — record the message/payment id and skip work already done", "Acknowledge before processing", "Disable retries"],
     "answerIndex": 1,
     "explanation": "At-least-once delivery guarantees this scenario will happen. Idempotent consumers are not optional; acknowledging before processing just converts duplicates into lost work."},
    {"id": "q3", "type": "mcq", "question": "Which of these should NOT go through a queue?",
     "options": ["Sending a welcome email", "Generating a video thumbnail", "Returning search results to a user waiting on the page", "Updating an analytics warehouse"],
     "answerIndex": 2,
     "explanation": "The user is waiting for the result, so the interaction is synchronous by definition. Queues decouple in time, which is exactly what you do not want here."}
  ],
  "related": ["scaling", "rate-limiting", "database"]
})

C.append({
  "id": "replication",
  "title": "Replication",
  "group": "Data",
  "level": 2,
  "estimatedMinutes": 28,
  "summary": "Keep more than one copy of the data — for surviving failures, for serving more reads, and for serving them closer to users.",
  "analogy": "A shop keeping its ledger in triplicate, in three different buildings. If one burns down, business continues. Clerks can read from whichever copy is nearest. But there is a catch: a sale written in the main ledger takes a moment to appear in the copies, so for a few seconds a clerk reading a copy may tell a customer the item is still in stock.",
  "explanation": {
    "beginner": "Running one database means that when it dies, everything stops, and all reads compete for one machine. Replication keeps synchronised copies: one primary takes the writes, and replicas receive a stream of those changes. Reads can be spread across the replicas, and if the primary fails a replica is promoted. The trade-off is replication lag — a replica is always a little behind, so a user can write something and then not see it if their next read goes to a lagging replica.",
    "interview": "Single-leader replication is the common case: all writes go to the leader, which streams its log to followers. Synchronous replication guarantees durability at the cost of write latency bounded by the slowest replica; asynchronous is fast but can lose recently acknowledged writes on failover. Replication lag produces read-your-writes anomalies, mitigated by routing a user's reads to the leader for a period after their write, or by tracking a log position per session. Multi-leader and leaderless designs relax coordination further and require conflict resolution."
  },
  "diagram": {
    "nodes": [
      {"id": "app", "label": "App servers", "type": "server", "x": 130, "y": 300},
      {"id": "primary", "label": "Primary\\n(all writes)", "type": "db", "x": 460, "y": 300,
       "note": "Single writer keeps ordering simple. It is also the write-capacity ceiling — which is what sharding later addresses.",
       "why": {"without": ["One copy: its failure is total data unavailability, and possibly data loss"], "with": ["A replica can be promoted in seconds to minutes", "Reads spread across copies"], "conclusion": "Replication buys availability and read capacity — not write capacity."}},
      {"id": "r1", "label": "Replica 1", "type": "replica", "x": 800, "y": 180, "note": "Serves reads. Typically milliseconds behind, but can fall far behind under write bursts."},
      {"id": "r2", "label": "Replica 2", "type": "replica", "x": 800, "y": 300, "note": "Also a standby for promotion on failover."},
      {"id": "r3", "label": "Replica 3 (other region)", "type": "replica", "x": 800, "y": 430, "note": "Serves local reads with low latency and survives a regional outage."}
    ],
    "edges": [
      {"from": "app", "to": "primary", "label": "writes"},
      {"from": "primary", "to": "r1", "label": "replication log"},
      {"from": "primary", "to": "r2", "label": "replication log"},
      {"from": "primary", "to": "r3", "label": "async", "dashed": True},
      {"from": "app", "to": "r1", "label": "reads", "dashed": True}
    ]
  },
  "why": {
    "without": ["One machine's failure loses availability and possibly data", "All reads contend with all writes on the same hardware", "Distant users pay the full round trip to one region"],
    "with": ["Failover in seconds instead of a restore from backup in hours", "Read capacity grows by adding replicas", "Regional replicas cut read latency and survive a region loss"],
    "conclusion": "Replication is how you get availability and read scale. It does nothing for write scale — that is what sharding is for."
  },
  "whenToUse": ["Read-heavy workloads", "You need failover, not a backup restore", "Users are spread across regions", "Running analytics without disturbing production traffic"],
  "whenNotToUse": ["Write-heavy workloads — every replica applies every write, so this adds no write capacity", "Every read must be perfectly current and you cannot route those to the primary", "The complexity is not yet justified — a single well-provisioned instance with good backups is a legitimate starting point"],
  "tradeoffs": [
    {"option": "Synchronous replication", "pros": ["No data loss on failover — the write is on at least two machines before it is acknowledged"], "cons": ["Write latency is bounded by the slowest replica", "If a replica stalls, writes stall (unless you fall back to async)"]},
    {"option": "Asynchronous replication", "pros": ["Fast writes, unaffected by replica health", "Works across regions"], "cons": ["Recently acknowledged writes can be lost if the primary dies before shipping them", "Replication lag is visible to users"]},
    {"option": "Semi-synchronous (one sync replica, rest async)", "pros": ["Durability of two copies without waiting for all"], "cons": ["More moving parts to reason about during an incident"]},
    {"option": "Multi-leader / leaderless", "pros": ["Writes accepted in multiple regions; survives partitions"], "cons": ["Write conflicts are now your problem — last-write-wins silently loses data, and CRDTs or application merges are real work"]}
  ],
  "keyNumbers": [
    {"label": "Same-region replication lag", "value": "Typically < 100 ms"},
    {"label": "Cross-region lag", "value": "Hundreds of ms, seconds under load"},
    {"label": "Automated failover", "value": "Seconds to a few minutes"},
    {"label": "RPO / RTO", "value": "How much data you can lose / how long you can be down — decide these numbers before the incident"}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "A user updates their profile then immediately reloads the page and sees the old values. What is happening and how do you fix it?",
     "options": ["The cache is stale; clear it", "Replication lag — the read went to a replica that had not received the write yet. Route a user's reads to the primary for a short window after they write", "The database is corrupted", "The write failed silently"],
     "answerIndex": 1,
     "explanation": "This is the read-your-writes anomaly. Standard fixes: sticky-to-primary after a write, or tracking the user's last log position and requiring a replica at least that current."},
    {"id": "q2", "type": "architecture", "question": "Your write throughput is saturated. Will adding read replicas help?",
     "options": ["Yes, it spreads the load", "No — every replica must apply every write, so replication adds read capacity only. Write scaling needs sharding", "Yes, if you add enough", "Only with synchronous replication"],
     "answerIndex": 1,
     "explanation": "Replicas duplicate the write workload rather than dividing it. Partitioning the data across independent primaries is the only way to scale writes horizontally."},
    {"id": "q3", "type": "mcq", "question": "What is the risk of asynchronous replication during a failover?",
     "options": ["None", "Writes acknowledged by the old primary but not yet shipped to the replica are lost when the replica is promoted", "Reads become slower", "The schema diverges"],
     "answerIndex": 1,
     "explanation": "This is your RPO, and it must be an explicit decision. Synchronous replication trades write latency for a zero-data-loss guarantee."}
  ],
  "related": ["sharding", "database", "cap-theorem", "cache"]
})

for c in C:
    (OUT / (c["id"] + ".json")).write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", len(C), "concepts")
