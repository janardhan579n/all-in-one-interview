"""System design concepts, batch 3. Run: python3 scripts/gen_sd_3.py"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "system-design" / "concepts"
OUT.mkdir(parents=True, exist_ok=True)
C = []

C.append({
  "id": "sharding",
  "title": "Sharding & Partitioning",
  "group": "Data",
  "level": 3,
  "estimatedMinutes": 32,
  "summary": "Split the data across independent machines so each holds a slice — the only way to scale writes beyond one machine, and the hardest thing on this list to undo.",
  "analogy": "One library has outgrown its building. Instead of a bigger building, you open several: authors A-F in one, G-M in the next, and so on. Any single lookup is fast because you know which building to visit. But 'list every book published in 1998' now means visiting every building, and if one author becomes wildly popular, one building is mobbed while the others are quiet.",
  "explanation": {
    "beginner": "Replication gives every machine a full copy, so writes still have to be applied everywhere and one machine must handle them all. Sharding does the opposite: each machine holds only part of the data. User 1-1,000,000 live on shard 1, the next million on shard 2, and so on. Now writes are spread across machines and there is no single write ceiling. The cost is that anything touching many shards — a join, a global report, a transaction across two users — becomes hard or impossible.",
    "interview": "Horizontal partitioning of a dataset across independent nodes by a partition key. Range partitioning supports range scans but is prone to hotspots; hash partitioning distributes evenly but destroys range locality; consistent hashing with virtual nodes limits the data movement on topology change to roughly 1/N. Cross-shard queries require scatter-gather and cross-shard writes require distributed transactions or a saga, so the partition key choice effectively determines which queries remain cheap. Resharding a live system is the expensive operation, which is why the key is chosen carefully up front."
  },
  "diagram": {
    "nodes": [
      {"id": "app", "label": "App", "type": "server", "x": 130, "y": 300},
      {"id": "router", "label": "Shard router\\nhash(user_id) % N", "type": "proxy", "x": 400, "y": 300,
       "note": "Maps a key to a shard. With consistent hashing, adding a shard moves only ~1/N of the keys instead of nearly all of them.",
       "why": {"without": ["Every write funnels into one primary, which is a hard ceiling", "The dataset must fit one machine's disk"], "with": ["Write capacity and storage grow linearly with shard count"], "conclusion": "Sharding is the only real answer to write scaling — and the most disruptive change on this list."}},
      {"id": "s1", "label": "Shard 1\\nusers 0-33%", "type": "db", "x": 740, "y": 170},
      {"id": "s2", "label": "Shard 2\\nusers 34-66%", "type": "db", "x": 740, "y": 300},
      {"id": "s3", "label": "Shard 3\\nusers 67-100%", "type": "db", "x": 740, "y": 430},
      {"id": "r1", "label": "Replica", "type": "replica", "x": 960, "y": 170, "note": "Each shard is usually itself replicated — sharding and replication are complementary, not alternatives."}
    ],
    "edges": [
      {"from": "app", "to": "router"},
      {"from": "router", "to": "s1"}, {"from": "router", "to": "s2"}, {"from": "router", "to": "s3"},
      {"from": "s1", "to": "r1", "dashed": True}
    ]
  },
  "why": {
    "without": ["Write throughput is capped by one primary", "The dataset must fit on one machine", "Index maintenance and vacuum/compaction get slower as the table grows"],
    "with": ["Writes, storage and index size divide across N machines", "A single shard's failure affects 1/N of users rather than all of them"],
    "conclusion": "Do it when you must, not when you can. Every cross-shard operation gets harder, permanently."
  },
  "whenToUse": ["Write throughput exceeds a single primary and you have already tried caching, batching and query tuning", "The dataset no longer fits comfortably on one machine", "Regulatory requirements force data to live in particular regions"],
  "whenNotToUse": ["You have not yet exhausted vertical scaling, caching and read replicas — which is most systems", "Your queries are mostly cross-cutting analytics", "You cannot identify a partition key that most queries filter on"],
  "tradeoffs": [
    {"option": "Hash partitioning", "pros": ["Even distribution by construction", "No hotspots from sequential keys"], "cons": ["Range queries must hit every shard", "Resharding moves data unless you use consistent hashing"]},
    {"option": "Range partitioning", "pros": ["Range scans hit one or few shards", "Human-comprehensible boundaries"], "cons": ["Hotspots are easy to create — partition on a timestamp and all of today's writes land on one shard"]},
    {"option": "Directory / lookup service", "pros": ["Arbitrary, changeable mapping; easy rebalancing"], "cons": ["The directory is a new critical dependency and must itself be highly available and fast"]},
    {"option": "Consistent hashing", "pros": ["Adding or removing a node moves only ~1/N of keys", "Standard for caches and distributed stores"], "cons": ["Uneven load without virtual nodes", "More conceptual complexity"]}
  ],
  "keyNumbers": [
    {"label": "Keys moved when resharding, naive modulo", "value": "Nearly all of them"},
    {"label": "Keys moved with consistent hashing", "value": "~1/N"},
    {"label": "Practical single-primary write ceiling", "value": "Thousands to low tens of thousands of writes/s"}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "You shard a social platform by user_id, then need 'all posts with hashtag #cricket'. What happens?",
     "options": ["It is a single fast query", "It becomes a scatter-gather across every shard, then a merge — slow and it gets slower as you add shards", "It is impossible", "The router handles it transparently at no cost"],
     "answerIndex": 1,
     "explanation": "The partition key determines which queries stay cheap. Access patterns that do not include the key require touching every shard, which is why a separate search index is usually built for them."},
    {"id": "q2", "type": "architecture", "question": "You shard by hash(timestamp). What goes wrong?",
     "options": ["Nothing", "Hashing a timestamp actually distributes well — the classic hotspot comes from RANGE partitioning on time, where all of today's writes hit one shard", "Reads break", "Replication stops"],
     "answerIndex": 1,
     "explanation": "Worth being precise about: hashing scatters sequential values deliberately. Range-partitioning on a monotonically increasing key is what creates the write hotspot — and it also destroys the range locality that was the reason to range-partition in the first place."},
    {"id": "q3", "type": "mcq", "question": "Why is consistent hashing preferred over `hash(key) % N`?",
     "options": ["It is faster to compute", "Changing N with plain modulo remaps almost every key, forcing a full data migration; consistent hashing moves only about 1/N", "It gives better security", "It supports range queries"],
     "answerIndex": 1,
     "explanation": "Going from 4 to 5 shards changes hash % N for roughly 80% of keys. Consistent hashing places nodes and keys on a ring so only the keys in the new node's arc move."}
  ],
  "related": ["replication", "database", "cap-theorem", "scaling"]
})

C.append({
  "id": "rate-limiting",
  "title": "Rate Limiting",
  "group": "Reliability",
  "level": 2,
  "estimatedMinutes": 28,
  "summary": "Cap how much any one caller may consume, so that one client cannot degrade the service for everyone else.",
  "analogy": "A nightclub with a capacity limit and a doorman. Not because the club dislikes people, but because past a certain number nobody inside has a good evening. The doorman also stops one large group taking the whole floor while everyone else queues outside.",
  "explanation": {
    "beginner": "Without a limit, one buggy script or one abusive user can send so many requests that your servers have nothing left for everyone else. A rate limiter counts requests per user (or per IP, or per API key) and rejects those beyond the allowance with status 429, usually with a header telling the caller when to try again. It protects you from accidents as much as from attacks — a retry loop with no backoff is the most common cause of self-inflicted outages.",
    "interview": "Admission control at the edge. Token bucket is the usual choice: tokens refill at a constant rate up to a burst capacity, giving a sustained rate with controlled burstiness in O(1) state per key. Fixed windows are simplest but allow 2x the limit across a boundary; sliding-window log is exact but O(requests) memory; sliding-window counter approximates it cheaply. Distributed enforcement needs shared state (Redis with atomic INCR or a Lua script) and must decide fail-open versus fail-closed when that store is unavailable."
  },
  "diagram": {
    "nodes": [
      {"id": "good", "label": "Normal clients", "type": "client", "x": 110, "y": 190},
      {"id": "bad", "label": "Runaway client", "type": "client", "x": 110, "y": 430},
      {"id": "limiter", "label": "Rate limiter\\n(token bucket)", "type": "proxy", "x": 430, "y": 300,
       "note": "Checked before any real work. Rejecting costs microseconds; serving costs milliseconds.",
       "why": {"without": ["One client at 10,000 rps consumes the capacity of all the others", "Costs scale with abuse", "A retry storm turns a blip into an outage"], "with": ["Each caller gets a predictable share", "Excess is rejected cheaply, with a Retry-After hint", "Capacity planning becomes possible"], "conclusion": "Rate limiting is how a service protects its own availability from its callers — including from itself."}},
      {"id": "redis", "label": "Redis\\n(shared counters)", "type": "cache", "x": 430, "y": 120, "note": "Needed when several limiter instances must enforce one global budget. Atomic INCR or a Lua script keeps it race-free."},
      {"id": "api", "label": "API servers", "type": "server", "x": 770, "y": 300, "note": "Only admitted traffic reaches here."}
    ],
    "edges": [
      {"from": "good", "to": "limiter", "label": "allowed"},
      {"from": "bad", "to": "limiter", "label": "429 Too Many Requests", "dashed": True},
      {"from": "limiter", "to": "redis", "dashed": True},
      {"from": "limiter", "to": "api"}
    ]
  },
  "why": {
    "without": ["A single client can saturate the service", "Infrastructure cost tracks abuse rather than usage", "Retry storms amplify small failures into full outages", "No protection against credential stuffing or scraping"],
    "with": ["Predictable capacity per caller", "Cheap rejection before expensive work", "A lever to enforce plan tiers", "Back-pressure that clients can actually respond to"],
    "conclusion": "Every public endpoint needs a limit. The interesting question is which algorithm and at what granularity."
  },
  "whenToUse": ["Any public or partner-facing API", "Expensive endpoints: search, report generation, anything hitting a third party", "Login and OTP endpoints, to blunt credential stuffing", "Enforcing paid tiers"],
  "whenNotToUse": ["Internal, trusted, low-volume calls where a circuit breaker is the better protection", "As a substitute for capacity — a limit set far below real demand is just a slower outage", "Health checks and monitoring endpoints, which should be exempt"],
  "tradeoffs": [
    {"option": "Token bucket", "pros": ["Allows bursts up to the bucket size while capping the sustained rate", "O(1) state per key: tokens plus a timestamp", "Matches how real clients behave"], "cons": ["Two parameters to tune", "Bursts can still briefly exceed the average"]},
    {"option": "Fixed window counter", "pros": ["Trivial: one counter per key per window", "Cheap"], "cons": ["Boundary problem — a client can send the full limit at the end of one window and again at the start of the next, doubling the intended rate"]},
    {"option": "Sliding window log", "pros": ["Exactly correct at every instant"], "cons": ["Stores a timestamp per request; memory grows with traffic, which is itself a denial-of-service vector"]},
    {"option": "Sliding window counter", "pros": ["Close to exact with two counters and a weighted estimate", "Cheap"], "cons": ["An approximation; slightly wrong during bursts"]},
    {"option": "Leaky bucket", "pros": ["Perfectly smooth output rate, protects fragile downstreams"], "cons": ["No burst allowance, which feels unfair to well-behaved bursty clients"]}
  ],
  "keyNumbers": [
    {"label": "Correct status code", "value": "429 Too Many Requests"},
    {"label": "Headers to return", "value": "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset"},
    {"label": "Token bucket state", "value": "2 values per key — tokens and last refill time"},
    {"label": "Typical public API limit", "value": "100–1,000 requests/minute per key"}
  ],
  "interactive": "rate-limiter-sim",
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "With a fixed window of 100 requests per minute, how many requests can a client make in a two-second span?",
     "options": ["100", "200 — 100 at the end of one window and 100 at the start of the next", "50", "It is impossible to exceed 100"],
     "answerIndex": 1,
     "explanation": "The boundary problem. Sliding window or token bucket smooths this out, which is why fixed windows are rarely used where the limit really matters."},
    {"id": "q2", "type": "architecture", "question": "Your Redis instance backing a distributed rate limiter goes down. Fail open or fail closed?",
     "options": [
       "Always fail closed — reject everything",
       "It is a deliberate trade: fail open keeps the service usable but unprotected; fail closed protects the backend but causes an outage. Most public APIs fail open with local per-instance fallback limits",
       "It does not matter",
       "Always fail open with no fallback"],
     "answerIndex": 1,
     "explanation": "There is no universally right answer, and being able to argue both sides is the point. The usual compromise is fail open globally while each instance applies a conservative local limit."},
    {"id": "q3", "type": "mcq", "question": "Why is token bucket usually preferred over leaky bucket for public APIs?",
     "options": ["It uses less memory", "It permits short bursts up to the bucket size while still capping the sustained rate, which matches how legitimate clients actually behave", "It is more accurate", "It requires no configuration"],
     "answerIndex": 1,
     "explanation": "Real clients are bursty — a page load fires ten requests at once. A leaky bucket would smooth that into a queue and feel sluggish; a token bucket absorbs it as long as the average stays within budget."}
  ],
  "related": ["load-balancer", "api", "message-queue"]
})

C.append({
  "id": "cap-theorem",
  "title": "CAP Theorem & Consistency",
  "group": "Distributed",
  "level": 3,
  "estimatedMinutes": 30,
  "summary": "When the network splits a distributed system in two, you must choose: keep answering with possibly stale data, or refuse to answer until the split heals.",
  "analogy": "Two shop branches sharing one stock list, connected by a phone line. The line goes dead. Each branch now chooses: keep selling and risk selling the same last item twice (available, inconsistent), or stop selling until the line is restored (consistent, unavailable). There is no third option that keeps both promises, and pretending otherwise is how overselling happens.",
  "explanation": {
    "beginner": "In a system spread across several machines, the network between them will occasionally fail. When it does, a machine that cannot reach the others has to decide what to do with an incoming request: answer using what it knows (which may be out of date), or refuse until it can confirm with the others. CAP says you cannot have both — and since network failures are not optional, the real choice is only between those two behaviours.",
    "interview": "Under a network partition (P), a distributed system must sacrifice either linearizability (C) or availability (A). Since partitions cannot be avoided, CP and AP describe the behaviour during a partition, not a permanent classification. PACELC extends it usefully: else (E), when there is no partition, you still trade latency (L) against consistency (C) — which is the trade you make every single day, unlike partitions, which are rare. 'Eventual consistency' means replicas converge given no new writes; it says nothing about how long that takes or what a client observes in the meantime."
  },
  "diagram": {
    "nodes": [
      {"id": "c1", "label": "Client A", "type": "client", "x": 110, "y": 180},
      {"id": "c2", "label": "Client B", "type": "client", "x": 110, "y": 430},
      {"id": "n1", "label": "Node 1", "type": "db", "x": 430, "y": 180,
       "note": "During a partition: answer from local state (AP) or refuse (CP)?",
       "why": {"without": ["Pretending a partition cannot happen means the behaviour is accidental rather than designed"], "with": ["You choose, in advance, what a partitioned system does"], "conclusion": "The choice is made either way. CAP just insists you make it deliberately."}},
      {"id": "n2", "label": "Node 2", "type": "db", "x": 790, "y": 430, "note": "Cannot reach Node 1. Its view of the data is frozen at the moment of the split."},
      {"id": "split", "label": "Network partition", "type": "monitor", "x": 610, "y": 300, "note": "Not hypothetical: cable cuts, switch failures, misconfigured firewalls, cloud AZ isolation."}
    ],
    "edges": [
      {"from": "c1", "to": "n1"},
      {"from": "c2", "to": "n2"},
      {"from": "n1", "to": "n2", "label": "BROKEN", "dashed": True}
    ]
  },
  "why": {
    "without": ["Teams assume 'the database handles it' and discover the actual behaviour during an incident", "Overselling, double-booking and lost updates surface in production"],
    "with": ["The behaviour under partition is a stated product decision", "Each subsystem picks the model its correctness requires"],
    "conclusion": "Different parts of one product make different choices. Payments are CP; the like counter is AP. That is the sophisticated answer."
  },
  "whenToUse": [
    "CP — money, inventory, bookings, unique constraints, anything where a wrong answer is worse than no answer",
    "AP — feeds, likes, view counts, presence, recommendations, caches, anywhere slightly stale is fine and downtime is not"
  ],
  "whenNotToUse": ["Do not apply CAP to a single-node system; without distribution there is no partition to reason about", "Do not treat CA as a real option — it merely means 'we have not thought about partitions'"],
  "tradeoffs": [
    {"option": "CP — consistency under partition", "pros": ["Reads never return stale data", "Invariants such as 'stock never goes negative' hold", "Easier application code"], "cons": ["The minority side of a partition rejects requests", "Higher write latency from coordination (quorums, consensus)"], "examples": "Postgres with synchronous replication, etcd, ZooKeeper, Spanner"},
    {"option": "AP — availability under partition", "pros": ["Always answers", "Low latency, writes accepted locally", "Survives regional isolation"], "cons": ["Stale reads and conflicting writes", "Conflict resolution becomes application work", "Invariants cannot be enforced globally"], "examples": "Cassandra, DynamoDB (tunable), Riak, DNS"}
  ],
  "consistencyModels": [
    {"name": "Linearizable (strong)", "meaning": "Every read sees the most recent completed write, as if there were a single copy. Most expensive."},
    {"name": "Sequential", "meaning": "All nodes see operations in the same order, though not necessarily in real time."},
    {"name": "Causal", "meaning": "Causally related operations are seen in order; concurrent ones may differ. A good default for social systems."},
    {"name": "Read-your-writes", "meaning": "A client always sees its own writes. Often the minimum users actually notice."},
    {"name": "Eventual", "meaning": "Replicas converge if writes stop. Cheapest; says nothing about the interim."}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "Your inventory service partitions and node B cannot reach node A. Two customers each try to buy the last item, one on each node. What should a CP system do?",
     "options": ["Accept both orders and reconcile later", "Refuse the write on the side that cannot reach a quorum, so at most one sale proceeds", "Accept both and cancel one afterwards", "Shut down entirely"],
     "answerIndex": 1,
     "explanation": "CP chooses correctness: the minority side rejects the write rather than risk overselling. An AP system would accept both and leave you apologising to one customer — sometimes an acceptable business decision, but it must be a decision."},
    {"id": "q2", "type": "mcq", "question": "Why is 'CA' not a meaningful choice for a distributed system?",
     "options": ["It is the best choice", "Partitions are not optional — networks fail — so a system claiming CA has simply not defined its partition behaviour", "CA only applies to NoSQL", "It is too expensive"],
     "answerIndex": 1,
     "explanation": "P is a fact about the world, not a design option. The real question is what happens when a partition occurs, and CA is an answer to a different question."},
    {"id": "q3", "type": "architecture", "question": "What does PACELC add that CAP misses?",
     "options": ["Nothing", "That even with no partition you trade latency against consistency — the trade you actually make every day, since partitions are rare and coordination latency is constant", "A third failure mode", "Security considerations"],
     "answerIndex": 1,
     "explanation": "CAP only describes partitioned operation. PACELC names the everyday trade: synchronous cross-region coordination costs real milliseconds on every request, which usually matters more than the rare partition."}
  ],
  "related": ["replication", "sharding", "database"]
})

for c in C:
    (OUT / (c["id"] + ".json")).write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", len(C), "concepts")
