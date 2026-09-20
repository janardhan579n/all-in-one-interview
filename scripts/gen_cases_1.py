"""Case studies batch 1: URL shortener + rate limiter. Run: python3 scripts/gen_cases_1.py"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "system-design" / "case-studies"
OUT.mkdir(parents=True, exist_ok=True)
CS = []

CS.append({
  "id": "url-shortener",
  "title": "Design a URL Shortener",
  "difficulty": "beginner",
  "estimatedMinutes": 45,
  "summary": "Turn a long URL into a short code and redirect. Small surface, but it exercises estimation, key generation, caching, read/write asymmetry and eventually sharding.",
  "interactive": "url-shortener",
  "steps": [
    {"key": "requirements", "title": "1. Clarify the problem", "content": "Before designing anything, establish what is actually being asked. Good questions here:\n\n- Are custom aliases (`/my-brand`) required, or only generated codes?\n- Do links expire?\n- Do we need click analytics? Real-time or batch?\n- Is the same long URL always mapped to the same short code, or may duplicates create new codes?\n- What is the expected read:write ratio?\n\nThe answers change the design substantially. For this walkthrough: generated codes with optional custom aliases, optional expiry, asynchronous analytics, duplicates allowed to create distinct codes (which simplifies a great deal)."},
    {"key": "functional", "title": "2. Functional requirements", "content": "- `POST /urls` with a long URL returns a short code.\n- `GET /{code}` redirects to the original URL.\n- Optional custom alias, rejected if already taken.\n- Optional expiry time, after which the code returns 404 or 410.\n- Click counts available to the link owner (eventually consistent is fine)."},
    {"key": "nonfunctional", "title": "3. Non-functional requirements", "content": "- **Read-heavy**: roughly 100 reads per write. The redirect path is the one that matters.\n- **Latency**: redirect p99 under 50 ms. The user is staring at a blank tab.\n- **Availability**: 99.9%+ on reads. A dead shortener breaks every link ever shared — including in printed material.\n- **Durability**: a mapping must never be lost or, worse, silently repointed.\n- **Scale target**: 100M new links per month, 10B redirects per month.\n\nNote which one drives the design: availability and read latency, not write throughput."},
    {"key": "estimation", "title": "4. Back-of-the-envelope estimation", "content": "Do this early — it decides whether you need one machine or a hundred, and interviewers weight it heavily.\n\n**Writes**: 100M/month ÷ (30 × 86,400 s) ≈ **40 writes/s**. Peak at 3x ≈ 120/s. That is small; a single database handles it comfortably.\n\n**Reads**: 10B/month ≈ **4,000 reads/s**, peak ≈ 12,000/s. This is the number that shapes the architecture.\n\n**Storage**: each row ≈ short code (7 B) + long URL (~200 B) + user id, timestamps, expiry (~50 B) ≈ **~300 bytes**. 100M/month × 300 B = **30 GB/month**, ≈ **360 GB/year**, ~1.8 TB over five years. Comfortably within one machine's disk, so sharding is not needed for storage — only possibly for throughput.\n\n**Keyspace**: base62 (a-z, A-Z, 0-9) with 7 characters = 62⁷ ≈ **3.5 trillion** codes. At 100M/month that is ~2,900 years of supply. Six characters gives 56 billion — about 47 years, also fine, but 7 leaves more headroom against collisions.\n\n**Cache**: link popularity is extremely skewed. Caching the hottest 20% plausibly serves 80%+ of redirects. 20% of one year's links × 300 B ≈ 72 GB — too big for one node, so cache by recency/popularity with an LRU and a modest memory budget instead of trying to hold everything."},
    {"key": "api", "title": "5. API design", "content": "Keep the redirect path as simple as physically possible — it is the hot path.\n\nNote the choice of **301 vs 302**: a 301 (permanent) is cached by browsers, which cuts your traffic dramatically but means you stop seeing clicks and can never change or revoke the target for those users. A 302 (temporary) sends every click to you, which is what you want if analytics or revocation matter. Most shorteners use 302 for exactly that reason — a good detail to raise unprompted."},
    {"key": "datamodel", "title": "6. Data model", "content": "A single table, keyed by the short code, with a unique index on it. The access pattern is a point lookup by primary key — the simplest and fastest thing a database does.\n\nNo joins are needed on the redirect path. Analytics are written separately and aggregated offline so they never slow a redirect."},
    {"key": "keygen", "title": "7. Generating the short code", "content": "Three approaches, in increasing order of sophistication:\n\n**(a) Random base62 + collision check.** Generate 7 random characters, attempt the insert with a unique constraint, retry on conflict. With 3.5 trillion slots and 6 billion links, the collision probability per insert is under 0.2% — retries are negligible. Simple, stateless, codes are unguessable.\n\n**(b) Counter + base62 encode.** Take a globally increasing integer and encode it. No collisions by construction, and codes are short from the start. But it needs a global counter (a single point of contention), and the codes are sequential, so anyone can enumerate every link ever created — usually disqualifying.\n\n**(c) Hash the URL, take a prefix.** MD5/SHA the long URL, base62-encode the first 43 bits. Deterministic, so the same URL gives the same code — which may be desirable or not. Collisions require a check-and-extend strategy.\n\n**Choice: (a)** for this design, because it is stateless, scales horizontally with no coordination, and does not leak how many links exist or let anyone walk the namespace."},
    {"key": "architecture", "title": "8. Basic architecture", "content": "Start with the simplest thing that satisfies the requirements — a load balancer, stateless app servers, one database. Then find the pressure points and add exactly what relieves each one. The Evolution tab shows that sequence stage by stage; do not skip to the final picture."},
    {"key": "caching", "title": "9. Caching the redirect path", "content": "Redirects are 99% of traffic and the mapping is immutable once created — the ideal caching situation. Cache-aside with Redis: check cache, on a miss read the database and populate, then redirect.\n\nAt an 90% hit rate the database sees 400 reads/s instead of 4,000. Cache the *negative* results too (a short TTL for 'no such code'), otherwise a scanner hammering random codes bypasses the cache entirely and lands every request on the database — that is cache penetration, and it is a real attack.\n\nBecause entries are immutable, invalidation is nearly free: there is nothing to invalidate except deletions and expiries."},
    {"key": "scaling", "title": "10. Scaling", "content": "Follow the pressure:\n\n- **App tier**: stateless, so add instances behind the load balancer. Trivial.\n- **Reads**: cache first, then read replicas. Replication lag is harmless here because rows never change after creation.\n- **Writes at 40/s**: nowhere near a bottleneck. Do not shard for this.\n- **Storage at 1.8 TB/5 years**: fits one machine. Still no sharding needed.\n- **If you did shard**: partition by the short code's hash. Every read and write already carries the code, so every operation is single-shard — an unusually clean sharding story.\n\nThe honest conclusion, and a good thing to say out loud: this system does not need sharding at the stated scale. Being able to say 'we do not need this yet, and here is when we would' scores better than adding it reflexively."},
    {"key": "analytics", "title": "11. Click analytics without slowing redirects", "content": "Do not write a row to the database on every redirect — that turns a 4,000/s read workload into a 4,000/s write workload and destroys the design.\n\nInstead, publish a lightweight event to a queue (or a local buffer flushed in batches) and let consumers aggregate. The redirect returns before any of that completes. Counts become eventually consistent, which is exactly right for a click counter."},
    {"key": "failure", "title": "12. Failure handling", "content": "- **Cache down**: fail open to the database. Slower, still correct. Ensure the database has the headroom to absorb it, or you have converted a cache outage into a full outage.\n- **Database primary down**: promote a replica. Reads continue from cache and replicas throughout; writes pause. Losing the ability to create links for a minute is far less serious than failing redirects.\n- **A bad code**: return 404, and cache that fact briefly.\n- **Expired link**: 410 Gone is more informative than 404, and tells caches it is deliberate.\n- **Hot link** (a code in a viral post): the cache absorbs it; this is the case a CDN in front of the redirect would help most."},
    {"key": "tradeoffs", "title": "13. Trade-offs to state explicitly", "content": "- 301 vs 302: browser caching and lower traffic versus analytics and revocability.\n- Random vs sequential codes: unguessable versus shortest-possible and collision-free.\n- Deduplicating identical URLs: saves storage, but breaks per-link analytics and per-link expiry.\n- Strong vs eventual consistency for click counts: eventual, obviously — and saying so quickly shows judgement.\n- Sharding now vs later: later, with the partition key identified in advance."},
    {"key": "final", "title": "14. Final architecture", "content": "Client → CDN/DNS → Load balancer → stateless app servers → Redis cache → database (primary + replicas), with an async analytics pipeline hanging off the redirect path via a queue.\n\nEvery component in that list is there because a specific number from the estimation step put pressure on something. That is the argument to be able to make."}
  ],
  "estimation": {
    "assumptions": ["100M new links per month", "100:1 read:write ratio", "~300 bytes stored per link", "5-year retention", "3x peak factor"],
    "calculations": [
      {"label": "Writes/s (average)", "value": "~40/s", "working": "100,000,000 / (30 × 86,400)"},
      {"label": "Reads/s (average)", "value": "~4,000/s", "working": "40/s × 100"},
      {"label": "Reads/s (peak)", "value": "~12,000/s", "working": "4,000 × 3"},
      {"label": "Storage per year", "value": "~360 GB", "working": "100M × 12 × 300 bytes"},
      {"label": "Storage over 5 years", "value": "~1.8 TB", "working": "360 GB × 5 — fits one machine"},
      {"label": "Keyspace, 7 base62 chars", "value": "~3.5 trillion", "working": "62^7 = 3,521,614,606,208"},
      {"label": "Years of code supply", "value": "~2,900 years", "working": "3.5e12 / 1.2e9 per year"}
    ]
  },
  "api": [
    {"method": "POST", "path": "/api/v1/urls", "request": "{ \"longUrl\": \"https://…\", \"customAlias\": \"optional\", \"expiresAt\": \"optional ISO-8601\" }", "response": "201 { \"shortCode\": \"a1B9xKq\", \"shortUrl\": \"https://sho.rt/a1B9xKq\", \"expiresAt\": null }", "notes": "409 if the custom alias is taken. Accepts an Idempotency-Key so a retry does not create a second link."},
    {"method": "GET", "path": "/{code}", "request": "—", "response": "302 Found, Location: <longUrl>", "notes": "The hot path. Cache-first, no auth, no database write. 404 if unknown, 410 if expired."},
    {"method": "GET", "path": "/api/v1/urls/{code}/stats", "request": "—", "response": "200 { \"clicks\": 18422, \"createdAt\": \"…\", \"lastClickAt\": \"…\" }", "notes": "Owner only. Eventually consistent — served from the aggregated analytics store, not counted live."},
    {"method": "DELETE", "path": "/api/v1/urls/{code}", "request": "—", "response": "204", "notes": "Owner only. Must also evict the cache entry, or the link stays alive until the TTL expires."}
  ],
  "dataModel": [
    {"name": "urls", "fields": [
      {"name": "short_code", "type": "VARCHAR(10) PRIMARY KEY", "notes": "base62; the partition key if ever sharded"},
      {"name": "long_url", "type": "TEXT NOT NULL", "notes": "~200 bytes typical, cap at 2048"},
      {"name": "user_id", "type": "BIGINT", "notes": "nullable for anonymous links"},
      {"name": "created_at", "type": "TIMESTAMP NOT NULL", "notes": ""},
      {"name": "expires_at", "type": "TIMESTAMP", "notes": "nullable; indexed for the cleanup job"}
    ], "indexes": ["PRIMARY KEY (short_code)", "INDEX (user_id, created_at) for the user's link list", "INDEX (expires_at) WHERE expires_at IS NOT NULL"]},
    {"name": "click_events (append-only, async)", "fields": [
      {"name": "short_code", "type": "VARCHAR(10)", "notes": ""},
      {"name": "occurred_at", "type": "TIMESTAMP", "notes": "partitioned by day"},
      {"name": "referrer", "type": "TEXT", "notes": ""},
      {"name": "country", "type": "CHAR(2)", "notes": "derived at the edge"}
    ], "indexes": ["Partitioned by day; rolled up into daily counters and dropped after 90 days"]}
  ],
  "evolution": [
    {
      "stage": "Stage 1 — 100 users",
      "problem": "Nothing is wrong. This is the correct starting architecture and it would be a mistake to build anything more.",
      "change": "One server, one database.",
      "why": "At 100 users you are optimising for the ability to change your mind, not for throughput. Every component you add now is a component you must operate and debug while the product is still being defined.",
      "architecture": {
        "nodes": [
          {"id": "client", "label": "Clients", "type": "client", "x": 180, "y": 300},
          {"id": "app", "label": "App server", "type": "server", "x": 500, "y": 300, "note": "Creates codes, serves redirects."},
          {"id": "db", "label": "Database", "type": "db", "x": 820, "y": 300, "note": "Single Postgres instance. Point lookups by primary key."}
        ],
        "edges": [{"from": "client", "to": "app"}, {"from": "app", "to": "db"}]
      }
    },
    {
      "stage": "Stage 2 — 10,000 users",
      "problem": "The single app server is both the capacity ceiling and a single point of failure. Deploys cause visible downtime, and a crash at 3am is a full outage.",
      "change": "Add a load balancer and a second app server.",
      "why": "Availability is the driver here, not throughput — one server could still handle this load. Two instances behind a balancer give rolling deploys and survive a single crash. This requires the app to be stateless, which is why session state (if any) moves out now rather than later.",
      "architecture": {
        "nodes": [
          {"id": "client", "label": "Clients", "type": "client", "x": 120, "y": 300},
          {"id": "lb", "label": "Load Balancer", "type": "lb", "x": 380, "y": 300, "note": "Health checks remove a dead instance within seconds."},
          {"id": "app1", "label": "App 1", "type": "server", "x": 660, "y": 200},
          {"id": "app2", "label": "App 2", "type": "server", "x": 660, "y": 400},
          {"id": "db", "label": "Database", "type": "db", "x": 920, "y": 300}
        ],
        "edges": [
          {"from": "client", "to": "lb"}, {"from": "lb", "to": "app1"}, {"from": "lb", "to": "app2"},
          {"from": "app1", "to": "db"}, {"from": "app2", "to": "db"}
        ]
      }
    },
    {
      "stage": "Stage 3 — 1M users, ~500 redirects/s",
      "problem": "Every redirect is a database query. The database is at 70% CPU, p99 latency is climbing, and the connection pool saturates during spikes.",
      "change": "Add a Redis cache in front of the database, cache-aside, including short-TTL negative caching.",
      "why": "Redirect data is immutable once written and access is heavily skewed toward recent and popular links — the textbook caching profile. At a 90% hit rate the database load drops tenfold and p99 falls from ~15 ms to ~2 ms. Negative caching matters here: without it, a scanner requesting random codes bypasses the cache entirely.",
      "architecture": {
        "nodes": [
          {"id": "client", "label": "Clients", "type": "client", "x": 100, "y": 300},
          {"id": "lb", "label": "Load Balancer", "type": "lb", "x": 320, "y": 300},
          {"id": "app1", "label": "App 1", "type": "server", "x": 560, "y": 200},
          {"id": "app2", "label": "App 2", "type": "server", "x": 560, "y": 400},
          {"id": "cache", "label": "Redis cache", "type": "cache", "x": 800, "y": 180, "note": "~90% hit rate. Also caches 'not found' briefly."},
          {"id": "db", "label": "Database", "type": "db", "x": 800, "y": 420}
        ],
        "edges": [
          {"from": "client", "to": "lb"}, {"from": "lb", "to": "app1"}, {"from": "lb", "to": "app2"},
          {"from": "app1", "to": "cache"}, {"from": "app2", "to": "cache"},
          {"from": "app1", "to": "db", "label": "miss", "dashed": True},
          {"from": "app2", "to": "db", "label": "miss", "dashed": True}
        ]
      }
    },
    {
      "stage": "Stage 4 — 10M users, ~4,000 redirects/s",
      "problem": "Two things now. Cache misses alone exceed what one database comfortably serves, and writing a click row per redirect has turned a read workload into a write workload.",
      "change": "Add read replicas for cache misses, and move analytics onto a queue with batch aggregation.",
      "why": "Replicas absorb miss traffic and give a failover target; replication lag is irrelevant because rows never change after creation. Moving analytics off the request path is the bigger win — it removes 4,000 writes/s from the primary and means an analytics outage can never affect a redirect.",
      "architecture": {
        "nodes": [
          {"id": "client", "label": "Clients", "type": "client", "x": 80, "y": 300},
          {"id": "lb", "label": "Load Balancer", "type": "lb", "x": 260, "y": 300},
          {"id": "app", "label": "App servers", "type": "server", "x": 460, "y": 300},
          {"id": "cache", "label": "Redis", "type": "cache", "x": 680, "y": 150},
          {"id": "primary", "label": "DB primary", "type": "db", "x": 680, "y": 300},
          {"id": "replica", "label": "Read replica", "type": "replica", "x": 900, "y": 300},
          {"id": "queue", "label": "Click event queue", "type": "queue", "x": 460, "y": 470},
          {"id": "agg", "label": "Aggregator", "type": "worker", "x": 700, "y": 470, "note": "Batches click events into daily counters."},
          {"id": "analytics", "label": "Analytics store", "type": "db", "x": 920, "y": 470}
        ],
        "edges": [
          {"from": "client", "to": "lb"}, {"from": "lb", "to": "app"},
          {"from": "app", "to": "cache"},
          {"from": "app", "to": "replica", "label": "miss", "dashed": True},
          {"from": "app", "to": "primary", "label": "writes"},
          {"from": "primary", "to": "replica", "label": "replication"},
          {"from": "app", "to": "queue", "label": "click event", "dashed": True},
          {"from": "queue", "to": "agg"}, {"from": "agg", "to": "analytics"}
        ]
      }
    },
    {
      "stage": "Stage 5 — 100M users, global",
      "problem": "Users in Asia and Europe pay 150–250 ms just in network latency to reach a US region. That dwarfs everything the application does.",
      "change": "Multi-region deployment with GeoDNS, a CDN in front of redirects, and regional read replicas. Writes stay in one region.",
      "why": "At this point the bottleneck is the speed of light, not compute. Serving redirects from an edge close to the user is the only fix. Writes are only 40/s and do not benefit from being distributed — keeping a single write region preserves the simplicity of one authoritative copy and avoids multi-leader conflict resolution for no gain.",
      "architecture": {
        "nodes": [
          {"id": "u1", "label": "Users (Asia)", "type": "client", "x": 80, "y": 180},
          {"id": "u2", "label": "Users (EU)", "type": "client", "x": 80, "y": 420},
          {"id": "cdn", "label": "CDN / GeoDNS", "type": "cdn", "x": 290, "y": 300, "note": "Routes each user to the nearest region; caches redirects at the edge."},
          {"id": "r1", "label": "Region: Asia\\n(app + cache + replica)", "type": "server", "x": 560, "y": 180},
          {"id": "r2", "label": "Region: EU\\n(app + cache + replica)", "type": "server", "x": 560, "y": 420},
          {"id": "primary", "label": "Write region\\n(DB primary)", "type": "db", "x": 870, "y": 300, "note": "All writes, 40/s. Async replication outward."}
        ],
        "edges": [
          {"from": "u1", "to": "cdn"}, {"from": "u2", "to": "cdn"},
          {"from": "cdn", "to": "r1"}, {"from": "cdn", "to": "r2"},
          {"from": "r1", "to": "primary", "label": "writes + async replication", "dashed": True},
          {"from": "r2", "to": "primary", "label": "writes + async replication", "dashed": True}
        ]
      }
    }
  ],
  "tradeoffs": [
    {"option": "302 Found (temporary redirect)", "pros": ["Every click reaches you, so analytics are complete", "Links can be revoked or retargeted at any time"], "cons": ["No browser caching, so you carry the full traffic", "Higher infrastructure cost"]},
    {"option": "301 Moved Permanently", "pros": ["Browsers cache it, cutting your traffic dramatically", "Faster for repeat visitors, better for SEO"], "cons": ["You stop seeing most clicks", "Revocation does not reach clients that cached it — effectively permanent"]},
    {"option": "Random codes", "pros": ["Unguessable, no enumeration of other people's links", "Stateless generation, scales horizontally with no coordination"], "cons": ["Needs a collision check", "Codes are longer than strictly necessary"]},
    {"option": "Counter-based codes", "pros": ["No collisions by construction", "Shortest possible codes"], "cons": ["Global counter is a coordination point", "Sequential codes leak volume and allow anyone to walk the entire namespace"]}
  ],
  "interviewStages": [
    {"key": "requirements", "prompt": "What questions would you ask before designing this?", "hints": ["Think about what changes the design: custom aliases, expiry, analytics, deduplication", "Ask about the read:write ratio — it is the single most shaping number here"], "modelAnswer": ["Custom aliases? Expiry? Analytics, and how fresh?", "Same URL → same code, or always a new code?", "Expected traffic and read:write ratio", "Availability target — redirects breaking is worse than creation breaking"]},
    {"key": "estimation", "prompt": "100M new links/month, 100:1 read:write. Work out traffic, storage and keyspace.", "hints": ["Seconds in a month ≈ 2.6M", "Assume ~300 bytes per row", "62^7 for a 7-character base62 code"], "modelAnswer": ["~40 writes/s, ~4,000 reads/s, peak ~12,000/s", "~360 GB/year, ~1.8 TB over five years — fits one machine", "62^7 ≈ 3.5 trillion codes ≈ 2,900 years of supply"]},
    {"key": "api", "prompt": "Define the API. Which status code does the redirect return, and why?", "hints": ["The choice between 301 and 302 has real consequences", "How would you make link creation safe to retry?"], "modelAnswer": ["POST /urls to create; GET /{code} to redirect", "302, because 301 is cached by browsers and you lose analytics and the ability to revoke", "Idempotency-Key on creation so a retried request does not create a second link"]},
    {"key": "keygen", "prompt": "How do you generate the short code?", "hints": ["Consider random, counter-based and hash-based", "What does each leak, and what does each require in the way of coordination?"], "modelAnswer": ["Random base62 with a unique-constraint retry: stateless, unguessable, collisions negligible at this keyspace", "Counter-based is collision-free but needs coordination and lets anyone enumerate every link", "Hashing gives deduplication for free but couples the code to the URL"]},
    {"key": "scaling", "prompt": "Traffic reaches 4,000 redirects/s. Walk me through what you add and in what order.", "hints": ["What is cheapest and highest-leverage first?", "Does this system actually need sharding?"], "modelAnswer": ["Cache first — immutable data, skewed access, ~90% hit rate, tenfold database reduction", "Then read replicas for misses, plus a failover target", "Move analytics to a queue so redirects never write to the database", "No sharding: 40 writes/s and 1.8 TB do not justify it. Name the partition key (the code) as the plan if it ever does"]},
    {"key": "failure", "prompt": "Redis goes down at peak. What happens?", "hints": ["Fail open or fail closed?", "Can the database absorb the full load?"], "modelAnswer": ["Fail open to the database: slower but correct", "This only works if the database has headroom — otherwise a cache outage becomes a full outage", "Mitigate with per-instance local caches and by keeping replica capacity for the miss path"]}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "At 100M links/month, how long does a 7-character base62 keyspace last?",
     "options": ["About 3 years", "About 290 years", "About 2,900 years", "It runs out immediately"],
     "answerIndex": 2,
     "explanation": "62^7 ≈ 3.5 trillion. At 1.2 billion links per year that is roughly 2,900 years — the keyspace is emphatically not the constraint."},
    {"id": "q2", "type": "architecture", "question": "Why do most URL shorteners return 302 rather than 301?",
     "options": ["302 is faster", "301 is cached by browsers, so you stop seeing clicks and can no longer revoke or retarget the link", "301 is not supported by all browsers", "302 uses less bandwidth"],
     "answerIndex": 1,
     "explanation": "A 301 is a genuine performance win and a genuine loss of control. If analytics or revocation matter — and for a shortener they usually do — 302 is the right trade."},
    {"id": "q3", "type": "architecture", "question": "Does this system need sharding at 100M links/month?",
     "options": ["Yes, immediately", "No — 40 writes/s and ~1.8 TB over five years fit one primary comfortably; caching and replicas handle the reads", "Yes, because of the read volume", "Only if you use NoSQL"],
     "answerIndex": 1,
     "explanation": "Reads are handled by cache and replicas; writes and storage are both small. Recognising when NOT to add a component is as valuable as knowing how to add it — though you should still name the short code as the partition key you would use."},
    {"id": "q4", "type": "architecture", "question": "Someone scans random 7-character codes at 5,000 requests/s. What breaks and how do you defend it?",
     "options": ["Nothing", "Every request misses the cache and hits the database (cache penetration) — defend with negative caching, a bloom filter and rate limiting", "The load balancer fails", "The CDN blocks it automatically"],
     "answerIndex": 1,
     "explanation": "Caches only protect against repeated *hits*. Missing keys pass straight through, which is why negative caching and rate limiting belong in the design rather than being added after the incident."}
  ],
  "related": ["cache", "sharding", "rate-limiting", "cdn"]
})

CS.append({
  "id": "rate-limiter",
  "title": "Design a Distributed Rate Limiter",
  "difficulty": "intermediate",
  "estimatedMinutes": 45,
  "summary": "Enforce 'at most N requests per window per caller' across many servers, in under a millisecond, without becoming the bottleneck or the single point of failure.",
  "interactive": "rate-limiter",
  "steps": [
    {"key": "requirements", "title": "1. Clarify the problem", "content": "Questions worth asking before designing:\n\n- What is the identity being limited — user, API key, IP, or endpoint? (IP limiting punishes everyone behind a corporate NAT.)\n- Are limits global or per endpoint? Per plan tier?\n- Must the limit be exact, or is approximate acceptable? This single answer picks the algorithm.\n- What happens when the shared store is unavailable — fail open or fail closed?\n- Is it enforced at the edge, in a gateway, or inside each service?"},
    {"key": "functional", "title": "2. Functional requirements", "content": "- Allow or reject each request against a configured limit for its key.\n- Return 429 with `Retry-After` and the `X-RateLimit-*` headers on rejection.\n- Support different limits per endpoint and per plan tier.\n- Limits configurable at runtime without a deploy.\n- Exempt health checks and internal traffic."},
    {"key": "nonfunctional", "title": "3. Non-functional requirements", "content": "- **Latency**: the check must add under 1 ms at p99. It runs before every request, so its cost is paid on every request including the ones that get rejected.\n- **Accuracy**: approximate is acceptable for abuse prevention; exactness matters for billing.\n- **Availability**: higher than the service it protects. If the limiter is down, the service must still make a sensible decision.\n- **Scale**: 100,000 checks/s across many instances.\n- **Memory**: O(1) per key, not O(requests) — an algorithm whose memory grows with traffic is itself a denial-of-service vector."},
    {"key": "estimation", "title": "4. Estimation", "content": "**Traffic**: 100,000 checks/s.\n\n**Keys**: 10M active API keys. Token bucket stores 2 values per key — token count and last-refill timestamp — about 50 bytes with overhead. 10M × 50 B = **500 MB**, which fits comfortably in one Redis node with room to spare.\n\nCompare with a sliding-window log: storing a timestamp per request for a 1-minute window at 100,000/s means 6 million timestamps at ~16 bytes = ~100 MB *per minute of traffic*, and it grows with load precisely when you are under attack. That asymmetry is the argument for token bucket in one sentence.\n\n**Redis throughput**: one node handles 100k+ ops/s, so a single node suffices; shard by key if you outgrow it, which is trivial because keys are independent."},
    {"key": "algorithms", "title": "5. Choosing the algorithm", "content": "**Fixed window** — one counter per key per window. Simplest, O(1) memory. Fatal flaw: a client can send the full limit at the end of one window and the full limit at the start of the next, achieving 2× the intended rate across the boundary.\n\n**Sliding window log** — store every request timestamp, drop those outside the window, count what remains. Exactly correct, but memory grows with traffic.\n\n**Sliding window counter** — keep the current and previous window counters and weight the previous one by how much of it still overlaps. O(1) memory, close to exact. A good middle ground.\n\n**Token bucket** — tokens refill at a constant rate up to a capacity; each request costs one token. O(1) memory, allows bursts up to the capacity while capping the sustained rate, and matches how real clients behave (a page load fires ten requests at once).\n\n**Leaky bucket** — requests queue and drain at a fixed rate. Perfectly smooth output, no burst allowance.\n\n**Choice: token bucket**, because O(1) state, burst tolerance and a lazy refill computation that needs no background timer."},
    {"key": "algorithm-detail", "title": "6. Token bucket, precisely", "content": "State per key: `tokens` (a float) and `lastRefillMillis`.\n\nOn each request:\n1. `elapsed = now - lastRefillMillis`\n2. `tokens = min(capacity, tokens + elapsed × refillRatePerMs)`\n3. `lastRefillMillis = now`\n4. If `tokens >= 1`, decrement and allow. Otherwise reject, and compute `Retry-After` as the time until one token accrues.\n\nThe refill is computed lazily from elapsed time rather than by a background job — no timers, no sweeping, and a key that is never touched costs nothing."},
    {"key": "distributed", "title": "7. Making it work across many servers", "content": "With 50 API instances, per-instance counters mean the effective limit is 50× the intended one. The state must be shared.\n\n**The race**: read-modify-write against Redis from many instances is not atomic, so two instances can both read 1 token remaining and both allow. The fix is to make the whole check atomic — a Lua script evaluated inside Redis, or an atomic INCR with an expiry for the counter-based algorithms. This is the detail that separates a working distributed limiter from one that leaks 2× under concurrency.\n\n**Latency**: one Redis round trip is ~0.5 ms, which meets the budget. If it did not, the usual answer is a local token bucket per instance holding a fraction of the global budget, periodically reconciled — approximate, but with no per-request network call."},
    {"key": "failure", "title": "8. When Redis is down", "content": "There is no universally correct answer, and being able to argue both sides is the point of the question.\n\n**Fail open** — allow everything. The service stays usable but unprotected; an ongoing attack gets through. Standard for public APIs where availability outranks protection.\n\n**Fail closed** — reject everything. The backend is protected but you have created an outage from a dependency failure. Appropriate when the downstream is fragile or expensive.\n\n**The usual compromise**: fail open globally, while each instance falls back to a conservative local limit (global limit ÷ instance count). Traffic is still bounded, no request is wrongly rejected because of an infrastructure failure, and the protection degrades gracefully rather than vanishing."},
    {"key": "placement", "title": "9. Where to enforce it", "content": "**At the edge / CDN**: cheapest — rejected traffic never reaches your infrastructure at all. Least context about who the caller is.\n\n**At the API gateway**: the usual choice. One implementation, full request context, still before any application work.\n\n**In each service**: most context (can limit by business rules), but duplicated logic and the request has already consumed connection and parsing resources.\n\nMany systems use all three: coarse volumetric limits at the edge, per-key limits at the gateway, and per-operation limits inside services for genuinely expensive endpoints."},
    {"key": "response", "title": "10. What to return", "content": "Status **429 Too Many Requests**, with:\n\n- `Retry-After: 30` — seconds until the caller may retry\n- `X-RateLimit-Limit: 1000`\n- `X-RateLimit-Remaining: 0`\n- `X-RateLimit-Reset: 1699999999`\n\nReturning the headers on *successful* responses too lets well-behaved clients slow down before they are rejected, which is the outcome everyone prefers. Add jitter guidance: if every rejected client retries exactly after `Retry-After`, they all return simultaneously and you have built a synchronised thundering herd."},
    {"key": "tradeoffs", "title": "11. Trade-offs", "content": "- Exactness versus memory: sliding-window log is exact but unbounded; token bucket is approximate and O(1).\n- Shared state versus latency: central Redis is accurate but adds a network hop; local buckets are fast but approximate.\n- Fail open versus fail closed: availability versus protection.\n- Per-user versus per-IP: per-IP is available before authentication but punishes shared NATs; per-user is fairer but requires an authenticated request, so login endpoints still need IP-based limits."},
    {"key": "final", "title": "12. Final design", "content": "Token bucket, state in Redis, the check implemented as an atomic Lua script, enforced at the API gateway, with per-instance local fallback buckets when Redis is unreachable, and configuration pushed at runtime. Volumetric protection sits in front at the CDN.\n\nThe interactive simulator on this page runs the real token-bucket maths — change the rate and burst and watch which requests are rejected."}
  ],
  "estimation": {
    "assumptions": ["100,000 rate-limit checks/s", "10M active API keys", "Token bucket: ~50 bytes of state per key", "1-minute windows"],
    "calculations": [
      {"label": "Memory, token bucket", "value": "~500 MB", "working": "10M keys × 50 bytes — one Redis node"},
      {"label": "Memory, sliding window log", "value": "~100 MB per minute of traffic", "working": "6M requests/min × 16 bytes, and it grows under attack"},
      {"label": "Redis ops needed", "value": "100k/s", "working": "one atomic script call per request — within a single node's capacity"},
      {"label": "Added latency", "value": "~0.5 ms", "working": "one same-datacentre Redis round trip"}
    ]
  },
  "api": [
    {"method": "ANY", "path": "(gateway middleware)", "request": "key = apiKey or userId or IP; cost = 1", "response": "allow / deny + remaining + resetAt", "notes": "Runs before routing. Must be O(1) and allocation-free on the hot path."},
    {"method": "GET", "path": "/api/v1/limits/{key}", "request": "—", "response": "200 { \"limit\": 1000, \"remaining\": 842, \"resetAt\": \"…\" }", "notes": "Lets clients self-regulate rather than discovering the limit by being rejected."},
    {"method": "PUT", "path": "/api/v1/limits/{tier}", "request": "{ \"capacity\": 1000, \"refillPerSecond\": 16.6 }", "response": "204", "notes": "Runtime configuration, no deploy. Admin only."}
  ],
  "dataModel": [
    {"name": "Redis key: rl:{scope}:{key}", "fields": [
      {"name": "tokens", "type": "float", "notes": "current allowance"},
      {"name": "last_refill_ms", "type": "long", "notes": "epoch millis of the last computation"}
    ], "indexes": ["TTL set to a few multiples of the refill period so idle keys evict themselves"]},
    {"name": "limit_config (relational, cached in memory)", "fields": [
      {"name": "tier", "type": "VARCHAR", "notes": "free / pro / enterprise"},
      {"name": "endpoint_pattern", "type": "VARCHAR", "notes": "e.g. /api/v1/search"},
      {"name": "capacity", "type": "INT", "notes": "burst size"},
      {"name": "refill_per_second", "type": "FLOAT", "notes": "sustained rate"}
    ], "indexes": ["PRIMARY KEY (tier, endpoint_pattern)"]}
  ],
  "evolution": [
    {
      "stage": "Stage 1 — one server",
      "problem": "One abusive client can consume all capacity.",
      "change": "An in-memory token bucket per key inside the single app server.",
      "why": "With one instance, in-process state IS the global state. No network hop, no coordination, sub-microsecond checks. Correct and complete — until there are two servers.",
      "architecture": {
        "nodes": [
          {"id": "client", "label": "Clients", "type": "client", "x": 180, "y": 300},
          {"id": "app", "label": "App server\\n(in-memory buckets)", "type": "server", "x": 520, "y": 300, "note": "HashMap<key, Bucket>. Exact, and free."},
          {"id": "db", "label": "Database", "type": "db", "x": 850, "y": 300}
        ],
        "edges": [{"from": "client", "to": "app"}, {"from": "app", "to": "db"}]
      }
    },
    {
      "stage": "Stage 2 — several servers, and the limit stops working",
      "problem": "With 5 instances each holding its own counters, a client spreading requests across them gets 5× the intended limit. The limit is silently wrong, which is worse than having none.",
      "change": "Move the bucket state to shared Redis.",
      "why": "The limit is a property of the caller, not of the machine that happened to answer. Shared state is the only way to enforce a global budget — and the check must become atomic, because read-modify-write from 5 instances races.",
      "architecture": {
        "nodes": [
          {"id": "client", "label": "Clients", "type": "client", "x": 110, "y": 300},
          {"id": "lb", "label": "Load Balancer", "type": "lb", "x": 330, "y": 300},
          {"id": "app1", "label": "App 1", "type": "server", "x": 570, "y": 190},
          {"id": "app2", "label": "App 2", "type": "server", "x": 570, "y": 410},
          {"id": "redis", "label": "Redis\\n(atomic Lua check)", "type": "cache", "x": 840, "y": 300, "note": "One round trip, ~0.5 ms. The script makes refill+consume a single atomic operation."}
        ],
        "edges": [
          {"from": "client", "to": "lb"}, {"from": "lb", "to": "app1"}, {"from": "lb", "to": "app2"},
          {"from": "app1", "to": "redis"}, {"from": "app2", "to": "redis"}
        ]
      }
    },
    {
      "stage": "Stage 3 — the limiter becomes the weak point",
      "problem": "Redis is now on the critical path for every single request. If it is slow, everything is slow; if it is down, you must choose between an outage and an unprotected service.",
      "change": "Move enforcement into the API gateway, add per-instance local fallback buckets, and replicate Redis.",
      "why": "Rejecting at the gateway means bad traffic never reaches application servers at all. The local fallback bounds traffic even when Redis is unreachable, converting a hard dependency into a degraded mode — the limiter must be more available than the service it protects.",
      "architecture": {
        "nodes": [
          {"id": "client", "label": "Clients", "type": "client", "x": 90, "y": 300},
          {"id": "gw", "label": "API Gateway\\n(limit enforced here)", "type": "proxy", "x": 330, "y": 300, "note": "Rejected requests never reach the app tier."},
          {"id": "local", "label": "Local fallback bucket", "type": "cache", "x": 330, "y": 130, "note": "Used only when Redis is unreachable: global limit ÷ instance count."},
          {"id": "redis", "label": "Redis primary", "type": "cache", "x": 600, "y": 190},
          {"id": "redisr", "label": "Redis replica", "type": "replica", "x": 600, "y": 410},
          {"id": "app", "label": "App servers", "type": "server", "x": 880, "y": 300}
        ],
        "edges": [
          {"from": "client", "to": "gw"},
          {"from": "gw", "to": "redis"},
          {"from": "redis", "to": "redisr", "dashed": True},
          {"from": "gw", "to": "local", "label": "on Redis failure", "dashed": True},
          {"from": "gw", "to": "app", "label": "admitted only"}
        ]
      }
    },
    {
      "stage": "Stage 4 — global, and under attack",
      "problem": "Volumetric attacks saturate the gateway's bandwidth before any rate-limit logic runs. Cross-region checks against one Redis cost 150 ms.",
      "change": "Coarse volumetric limits at the CDN edge, regional Redis clusters for per-key limits, accepting approximate global enforcement.",
      "why": "You cannot rate-limit traffic that has already consumed your bandwidth — the edge is the only place to drop it cheaply. Regional state means a client could get the limit in each region; for abuse prevention that approximation is fine, and the alternative (synchronous cross-region coordination on every request) costs more than the problem it solves.",
      "architecture": {
        "nodes": [
          {"id": "u", "label": "Global users", "type": "client", "x": 90, "y": 300},
          {"id": "cdn", "label": "CDN edge\\n(volumetric limits)", "type": "cdn", "x": 310, "y": 300, "note": "Drops floods before they cost you anything."},
          {"id": "gw1", "label": "Gateway (Asia)", "type": "proxy", "x": 570, "y": 180},
          {"id": "gw2", "label": "Gateway (EU)", "type": "proxy", "x": 570, "y": 420},
          {"id": "r1", "label": "Redis (Asia)", "type": "cache", "x": 830, "y": 180},
          {"id": "r2", "label": "Redis (EU)", "type": "cache", "x": 830, "y": 420},
          {"id": "app", "label": "Services", "type": "server", "x": 1000, "y": 300}
        ],
        "edges": [
          {"from": "u", "to": "cdn"}, {"from": "cdn", "to": "gw1"}, {"from": "cdn", "to": "gw2"},
          {"from": "gw1", "to": "r1"}, {"from": "gw2", "to": "r2"},
          {"from": "gw1", "to": "app"}, {"from": "gw2", "to": "app"}
        ]
      }
    }
  ],
  "tradeoffs": [
    {"option": "Central Redis state", "pros": ["Accurate global enforcement", "One place to inspect and configure"], "cons": ["A network hop on every request", "A new critical dependency", "A hot key can become a hotspot"]},
    {"option": "Local per-instance buckets", "pros": ["Zero added latency", "No shared dependency to fail"], "cons": ["Effective limit multiplies by the instance count unless budgets are divided", "Inaccurate as instances scale in and out"]},
    {"option": "Token bucket", "pros": ["O(1) memory", "Tolerates natural bursts", "Lazy refill needs no timers"], "cons": ["Approximate", "Two parameters to tune per tier"]},
    {"option": "Sliding window log", "pros": ["Exact at every instant"], "cons": ["Memory grows with request volume — worst exactly when under attack"]}
  ],
  "interviewStages": [
    {"key": "requirements", "prompt": "What do you need to know before designing a rate limiter?", "hints": ["What is the unit of identity?", "Does it need to be exact?", "What happens when the shared store fails?"], "modelAnswer": ["Limit by user, API key, or IP — each has different availability and fairness properties", "Exact or approximate: this picks the algorithm", "Fail open or fail closed", "Where it is enforced: edge, gateway, or service"]},
    {"key": "algorithm", "prompt": "Which algorithm, and why not the others?", "hints": ["Think about memory per key and behaviour at window boundaries"], "modelAnswer": ["Token bucket: O(1) state, burst tolerance, lazy refill", "Fixed window allows 2× across a boundary", "Sliding log is exact but its memory grows with traffic — a vulnerability, not just a cost", "Leaky bucket smooths perfectly but forbids legitimate bursts"]},
    {"key": "distributed", "prompt": "You have 50 API servers. How do you enforce one global limit?", "hints": ["What goes wrong with per-instance counters?", "What race appears with shared state?"], "modelAnswer": ["Per-instance counters give 50× the intended limit", "Shared state in Redis, with the whole refill-and-consume step atomic (Lua script or INCR+EXPIRE)", "Without atomicity, concurrent instances both see the last token and both allow"]},
    {"key": "failure", "prompt": "Redis becomes unavailable. What is your behaviour?", "hints": ["Argue both sides", "Is there a middle option?"], "modelAnswer": ["Fail open: available but unprotected. Fail closed: protected but an outage", "Most public APIs fail open, because an infrastructure failure should not reject legitimate users", "Better: fail open globally with a conservative per-instance local bucket, so traffic stays bounded"]},
    {"key": "response", "prompt": "What exactly do you return to a rejected client?", "hints": ["Status code and headers", "What happens if every client obeys Retry-After precisely?"], "modelAnswer": ["429 with Retry-After and X-RateLimit-Limit/Remaining/Reset", "Send the headers on success too, so clients can slow down before being rejected", "Advise jitter — synchronised retries recreate the spike you just rejected"]}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "Five API servers each keep their own in-memory counters for a 100/min limit. What is the effective limit?",
     "options": ["100/min", "500/min — each instance enforces its own 100", "20/min", "Unlimited"],
     "answerIndex": 1,
     "explanation": "A limit is a property of the caller, not of the server that answered. This is the single most common bug in hand-rolled rate limiters, and it is silent."},
    {"id": "q2", "type": "architecture", "question": "Why is a sliding-window log a risky choice under attack?",
     "options": ["It is inaccurate", "Its memory grows with request volume, so an attack inflates the limiter's own memory use — the defence amplifies the attack", "It is slow to compute", "It cannot be distributed"],
     "answerIndex": 1,
     "explanation": "O(requests) memory in a component designed to absorb floods is a poor combination. Token bucket keeps O(1) state per key regardless of how much traffic arrives."},
    {"id": "q3", "type": "architecture", "question": "Two gateway instances concurrently read '1 token remaining' from Redis and both allow the request. What is the fix?",
     "options": ["Add more Redis nodes", "Make the read-refill-write sequence atomic — a Lua script inside Redis, or INCR with EXPIRE", "Use a longer window", "Use local counters"],
     "answerIndex": 1,
     "explanation": "Read-modify-write over the network is not atomic. Pushing the whole decision into a single server-side operation eliminates the race."},
    {"id": "q4", "type": "mcq", "question": "Which status code and header should a rejected request receive?",
     "options": ["503 with Retry-After", "429 with Retry-After", "403 with no headers", "400 with an error body"],
     "answerIndex": 1,
     "explanation": "429 Too Many Requests is specifically for this. Retry-After tells a well-behaved client exactly when to come back — and advising jitter prevents synchronised retries."}
  ],
  "related": ["rate-limiting", "cache", "api", "load-balancer"]
})

for c in CS:
    (OUT / (c["id"] + ".json")).write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", len(CS), "case studies")
