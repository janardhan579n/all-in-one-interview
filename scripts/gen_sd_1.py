"""System design concepts, batch 1. Run: python3 scripts/gen_sd_1.py"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "system-design" / "concepts"
OUT.mkdir(parents=True, exist_ok=True)
C = []

C.append({
  "id": "client-server",
  "title": "Client & Server",
  "group": "Foundations",
  "level": 0,
  "estimatedMinutes": 15,
  "summary": "One program asks, another answers. Everything else in system design is a refinement of that sentence.",
  "analogy": "A restaurant. You (the client) read a menu, decide, and tell the waiter what you want. The kitchen (the server) has the ingredients and the equipment; you do not. You cannot walk in and cook, and the kitchen never cooks for someone who has not ordered. The menu is the API: the agreed list of what you are allowed to ask for.",
  "explanation": {
    "beginner": "Your phone or browser is the client. It does not hold Instagram's photos — it asks a computer in a data centre for them, and that computer sends them back. The client's job is to show things and collect input; the server's job is to hold the real data and decide what is allowed. They talk over the internet using an agreed format, and each request stands on its own.",
    "interview": "A request-response architecture separating presentation from state and policy. Servers own the authoritative data and enforce authorisation; clients are untrusted and disposable. HTTP servers are conventionally stateless per request, with session state externalised to a store or carried in a signed token, which is what makes horizontal scaling behind a load balancer possible."
  },
  "diagram": {
    "nodes": [
      {"id": "client", "label": "Client\\n(browser / app)", "type": "client", "x": 140, "y": 300,
       "note": "Renders UI, collects input, holds no authoritative data. Cannot be trusted — anyone can modify it.",
       "why": {"without": ["Every user would need a copy of the whole database", "No way to share data between users"], "with": ["Thin, replaceable, runs anywhere"], "conclusion": "Clients present; they do not decide."}},
      {"id": "server", "label": "Server\\n(application)", "type": "server", "x": 500, "y": 300,
       "note": "Validates input, enforces authorisation, applies business rules, reads and writes the database.",
       "why": {"without": ["Clients would write to the database directly, so any user could write anything"], "with": ["One place enforces the rules, and it is the only thing the database trusts"], "conclusion": "The server is where trust lives."}},
      {"id": "db", "label": "Database", "type": "db", "x": 840, "y": 300,
       "note": "Durable, authoritative state. Survives server restarts and is shared by every server instance."}
    ],
    "edges": [
      {"from": "client", "to": "server", "label": "request"},
      {"from": "server", "to": "client", "label": "response", "dashed": True},
      {"from": "server", "to": "db", "label": "query"}
    ]
  },
  "why": {
    "without": [
      "Every user needs the entire dataset locally — impossible for anything shared",
      "No single place to enforce rules, so validation runs on a machine the attacker controls",
      "Two users editing the same thing have no way to reconcile"
    ],
    "with": [
      "One authoritative copy of the data, many lightweight clients",
      "Rules enforced somewhere the user cannot modify",
      "Clients can be upgraded, replaced or written in any language"
    ],
    "conclusion": "Centralise state and policy; distribute presentation. That split is why the web works at all."
  },
  "whenToUse": ["Multiple users share or collaborate on data", "Rules must be enforced and cannot be trusted to the client", "The data outlives any one device"],
  "whenNotToUse": ["A purely local tool with no sharing (a calculator, an offline note-taking app)", "Peer-to-peer is a better fit — file sharing, some real-time collaboration, local-first sync"],
  "tradeoffs": [
    {"option": "Thick client (logic in the browser/app)", "pros": ["Snappy interactions, less network chatter", "Works offline", "Server load reduced"], "cons": ["Logic must STILL be re-validated server-side — client checks are a UX nicety, never a security control", "Harder to update: old app versions linger for months"]},
    {"option": "Thin client (logic on the server)", "pros": ["One place to change behaviour, deploys instantly for everyone", "Nothing sensitive is shipped to the user"], "cons": ["Every interaction costs a round trip", "Useless without a network"]}
  ],
  "keyNumbers": [
    {"label": "Same-datacentre round trip", "value": "~0.5 ms"},
    {"label": "Same-region round trip", "value": "~5 ms"},
    {"label": "Cross-continent round trip", "value": "~150 ms"},
    {"label": "Mobile network round trip", "value": "50–300 ms"}
  ],
  "quiz": [
    {"id": "q1", "type": "mcq", "question": "You validate an email address in your React form. Do you still need to validate it on the server?",
     "options": ["No, the client already did it", "Yes — the client is under the user's control and anyone can call the API directly", "Only for paid accounts", "Only if you use a database"],
     "answerIndex": 1,
     "explanation": "Client-side validation is a UX feature: instant feedback. Anyone can bypass the UI with curl. Every rule that matters must be enforced server-side."},
    {"id": "q2", "type": "mcq", "question": "Why are HTTP servers usually kept stateless between requests?",
     "options": ["It uses less memory", "So any server instance can handle any request, which is what allows a load balancer to spread traffic and instances to be added or replaced freely", "Because HTTP forbids state", "To make logging easier"],
     "answerIndex": 1,
     "explanation": "If request 2 must reach the same machine as request 1, you cannot freely add, remove or reroute servers. Externalising session state is what makes horizontal scaling possible."}
  ],
  "related": ["http", "api", "load-balancer"]
})

C.append({
  "id": "http",
  "title": "HTTP — How Clients and Servers Talk",
  "group": "Foundations",
  "level": 0,
  "estimatedMinutes": 20,
  "summary": "A text-based request-response protocol: a method, a path, headers, an optional body — and a status code coming back.",
  "analogy": "Posting a letter with a very strict form on the envelope. The method is what you want done (READ this / ADD this / REPLACE this / DESTROY this), the path is which thing, the headers are the notes in the margin (what language you read, who you are, what formats you accept), and the body is the enclosure. The reply comes back with a three-digit code that tells you, before you read a word of it, whether things went well.",
  "explanation": {
    "beginner": "When you open a web page, your browser sends a short text message to a server: 'GET /products/42, and by the way I accept JSON, and here is my login token.' The server sends back a code — 200 means fine, 404 means no such thing, 500 means the server broke — plus the data. Each message is independent: the server does not remember you between requests unless you send something that identifies you, which is what cookies and tokens are for.",
    "interview": "A stateless application-layer protocol over TCP (HTTP/1.1, HTTP/2) or QUIC/UDP (HTTP/3). Methods carry semantics that matter operationally: GET and HEAD are safe, and GET, PUT and DELETE are idempotent, which is what makes retries safe for them and dangerous for POST. Statelessness is the property that permits horizontal scaling; caching semantics are negotiated via Cache-Control, ETag and conditional requests."
  },
  "diagram": {
    "nodes": [
      {"id": "client", "label": "Client", "type": "client", "x": 130, "y": 300},
      {"id": "dns", "label": "DNS", "type": "dns", "x": 380, "y": 140, "note": "Resolves api.example.com to an IP address. Cached aggressively — which is why DNS changes take time to propagate."},
      {"id": "tls", "label": "TLS handshake", "type": "proxy", "x": 380, "y": 440, "note": "Negotiates encryption. One extra round trip in TLS 1.3, two in 1.2 — a real cost on high-latency links."},
      {"id": "server", "label": "Server", "type": "server", "x": 700, "y": 300, "note": "Parses the request line, headers and body; returns a status code, headers and body."},
      {"id": "app", "label": "Handler", "type": "worker", "x": 930, "y": 300, "note": "Your code: routing, validation, business logic."}
    ],
    "edges": [
      {"from": "client", "to": "dns", "label": "1. resolve name"},
      {"from": "client", "to": "tls", "label": "2. secure channel"},
      {"from": "client", "to": "server", "label": "3. GET /products/42"},
      {"from": "server", "to": "app", "label": "4. route"},
      {"from": "server", "to": "client", "label": "5. 200 OK + JSON", "dashed": True}
    ]
  },
  "why": {
    "without": ["Every application would invent its own wire format", "No shared caching, no proxies, no standard error semantics", "Intermediaries could not understand or optimise traffic they forward"],
    "with": ["Any client can talk to any server", "Caches, proxies, load balancers and CDNs understand the traffic and can act on it", "Status codes give machine-readable outcomes"],
    "conclusion": "A shared protocol is what lets infrastructure you did not write make your system faster and more reliable."
  },
  "whenToUse": ["Request-response interactions", "Public APIs and anything that must traverse firewalls and proxies", "When you want caching and CDNs to work for free"],
  "whenNotToUse": ["Server-initiated push at high frequency — use WebSockets or Server-Sent Events", "Very low-latency internal RPC between services — gRPC over HTTP/2 is leaner", "Streaming media — purpose-built protocols do better"],
  "tradeoffs": [
    {"option": "REST over HTTP/JSON", "pros": ["Universally understood, debuggable with curl", "Cacheable by existing infrastructure", "No client codegen required"], "cons": ["Verbose on the wire", "Over- and under-fetching", "No schema unless you add one"]},
    {"option": "gRPC over HTTP/2", "pros": ["Compact binary encoding, strong schema, streaming", "Lower latency for service-to-service calls"], "cons": ["Not browser-native without a proxy", "Harder to inspect", "HTTP caches cannot help"]},
    {"option": "GraphQL", "pros": ["Client asks for exactly the fields it needs", "One endpoint for many views"], "cons": ["HTTP caching largely bypassed", "Easy to write queries that are catastrophically expensive server-side"]}
  ],
  "keyNumbers": [
    {"label": "Status 2xx", "value": "Success"},
    {"label": "Status 3xx", "value": "Redirect / not modified"},
    {"label": "Status 4xx", "value": "The client got it wrong — 400, 401, 403, 404, 409, 429"},
    {"label": "Status 5xx", "value": "The server got it wrong — 500, 502, 503, 504"}
  ],
  "quiz": [
    {"id": "q1", "type": "mcq", "question": "Which HTTP methods are idempotent (repeating them has the same effect as doing them once)?",
     "options": ["Only GET", "GET, PUT and DELETE", "POST and PATCH", "All of them"],
     "answerIndex": 1,
     "explanation": "Repeating a GET reads the same thing; repeating a PUT sets the same value; repeating a DELETE leaves it deleted. POST creates something new each time, which is why safely retrying a POST needs an idempotency key."},
    {"id": "q2", "type": "architecture", "question": "Your API returns 500 for a request containing an invalid email address. What is wrong?",
     "options": ["Nothing", "5xx means the server failed; invalid input is the client's error and should be 400", "It should return 200 with an error message", "It should return 404"],
     "answerIndex": 1,
     "explanation": "Status classes drive real behaviour: clients and load balancers retry 5xx, alerting fires on 5xx rates, and health checks may pull the instance. Misclassifying validation errors as 5xx creates false alarms and pointless retries."},
    {"id": "q3", "type": "mcq", "question": "What does it mean that HTTP is stateless?",
     "options": ["It cannot store data", "The server keeps no memory of previous requests; any identity or context must be re-supplied each time", "It does not use TCP", "Responses cannot be cached"],
     "answerIndex": 1,
     "explanation": "Each request is self-contained, which is exactly why a load balancer can send consecutive requests from one user to different servers."}
  ],
  "related": ["client-server", "api", "cdn", "load-balancer"]
})

C.append({
  "id": "api",
  "title": "APIs — The Contract",
  "group": "Foundations",
  "level": 1,
  "estimatedMinutes": 20,
  "summary": "The published set of operations a service offers, and the promises it makes about them — which is the part you cannot change later.",
  "analogy": "A restaurant menu. It lists what you can order, what each dish contains and what it costs. The kitchen can replace its oven, hire a new chef, or move to a bigger building, and none of that concerns you — as long as the menu still means what it said. The day the menu changes what a dish means, every regular customer is surprised.",
  "explanation": {
    "beginner": "An API is the list of things one program will do for another, plus the exact shape of the questions and answers. 'POST /orders with these fields creates an order and returns its id.' Once other people build against it, you cannot quietly change what a field means — their code will break. That is why versioning exists.",
    "interview": "A contract comprising resources or operations, request and response schemas, error semantics, authentication, idempotency guarantees, pagination and rate limits. The internal implementation is free to change; the contract is not. Backwards compatibility rules follow: adding optional fields is safe, removing or repurposing fields is breaking, and tightening validation is breaking."
  },
  "diagram": {
    "nodes": [
      {"id": "mobile", "label": "Mobile app", "type": "client", "x": 120, "y": 180},
      {"id": "web", "label": "Web app", "type": "client", "x": 120, "y": 420},
      {"id": "gw", "label": "API\\n(the contract)", "type": "proxy", "x": 450, "y": 300,
       "note": "Auth, validation, rate limiting, versioning. The stable surface everything else hides behind.",
       "why": {"without": ["Each client would talk to internal services directly and break whenever they change"], "with": ["Internals can be refactored freely as long as the contract holds"], "conclusion": "The API is a firewall against your own future refactoring."}},
      {"id": "svc1", "label": "Orders service", "type": "server", "x": 790, "y": 170},
      {"id": "svc2", "label": "Catalog service", "type": "server", "x": 790, "y": 300},
      {"id": "svc3", "label": "Payments service", "type": "server", "x": 790, "y": 430}
    ],
    "edges": [
      {"from": "mobile", "to": "gw", "label": "HTTPS"},
      {"from": "web", "to": "gw", "label": "HTTPS"},
      {"from": "gw", "to": "svc1"},
      {"from": "gw", "to": "svc2"},
      {"from": "gw", "to": "svc3"}
    ]
  },
  "why": {
    "without": ["Every client couples to your internal data model, so a column rename becomes a customer incident", "No single place for auth, rate limiting or validation", "Rewriting a service means rewriting every caller"],
    "with": ["Internals change freely behind a stable surface", "Cross-cutting concerns live in one layer", "Teams integrate against a document rather than a codebase"],
    "conclusion": "The API is the promise; the implementation is a detail. Design the promise carefully because it is the expensive thing to change."
  },
  "whenToUse": ["Anything other people (or other teams) will call", "Whenever you want the freedom to rewrite internals later"],
  "whenNotToUse": ["Inside a single module where a function call is simpler and type-checked", "Do not add an API gateway to a two-service system for its own sake"],
  "tradeoffs": [
    {"option": "Versioned URLs (/v1/, /v2/)", "pros": ["Explicit and obvious", "Old clients keep working indefinitely", "Easy to route and to reason about"], "cons": ["Two code paths to maintain", "Versions tend never to be retired"]},
    {"option": "Additive-only evolution (no versions)", "pros": ["One code path", "No migration work for clients"], "cons": ["The schema accretes deprecated fields forever", "Some changes genuinely cannot be made additively"]}
  ],
  "designRules": [
    "Nouns for resources, HTTP methods for verbs: POST /orders, not POST /createOrder.",
    "Return the created resource and a 201 with a Location header.",
    "Paginate every list endpoint from day one — cursor-based, not offset, if the data changes underneath.",
    "Make writes idempotent with a client-supplied Idempotency-Key so retries cannot double-charge.",
    "Errors need a machine-readable code plus a human-readable message. Never only prose.",
    "Adding an optional field is safe; removing one, renaming one or tightening validation is a breaking change."
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "Which change to a public API is safe to ship without a new version?",
     "options": ["Renaming a response field", "Adding a new optional response field", "Making a previously optional request field required", "Changing a status code from 200 to 204"],
     "answerIndex": 1,
     "explanation": "Well-written clients ignore unknown fields, so additions are safe. Renames, new requirements and changed status codes all break existing callers."},
    {"id": "q2", "type": "architecture", "question": "A payment API times out after the charge succeeded, and the client retries. How do you prevent a double charge?",
     "options": ["Tell clients not to retry", "Require a client-supplied idempotency key that the server records, returning the original result on repeat", "Use GET instead of POST", "Add a longer timeout"],
     "answerIndex": 1,
     "explanation": "The network cannot tell 'request lost' from 'response lost', so retries are inevitable. An idempotency key makes the second attempt return the first attempt's result instead of performing the action again."}
  ],
  "related": ["http", "client-server", "rate-limiting"]
})

C.append({
  "id": "load-balancer",
  "title": "Load Balancer",
  "group": "Performance",
  "level": 1,
  "estimatedMinutes": 25,
  "summary": "One address in front of many servers, spreading requests and routing around the ones that are unhealthy.",
  "analogy": "The person at the front of a bank who directs you to the next free teller. You queue once instead of guessing which line moves fastest; if a teller goes on break, new customers simply stop being sent to them, and nobody in the queue notices.",
  "explanation": {
    "beginner": "One server can only handle so many requests. So you run several identical ones and put a load balancer in front. Everyone connects to the load balancer's address, and it passes each request to whichever server is free and healthy. If a server crashes, the load balancer stops sending traffic there, and users never see the failure — that is often more valuable than the extra capacity.",
    "interview": "A reverse proxy distributing traffic across a pool of backends, with active or passive health checking. Layer 4 balancers forward TCP connections and are extremely fast; Layer 7 balancers parse HTTP and can route by path, host or header, terminate TLS, and retry idempotent requests. Algorithms range from round-robin to least-connections to consistent hashing. Backends must be stateless — or the balancer must provide sticky sessions, which undermines even distribution and complicates deployments."
  },
  "diagram": {
    "nodes": [
      {"id": "client", "label": "Clients", "type": "client", "x": 110, "y": 300},
      {"id": "lb", "label": "Load Balancer", "type": "lb", "x": 400, "y": 300,
       "note": "Health checks every few seconds; removes failing backends from rotation automatically.",
       "why": {"without": ["One server is both your capacity ceiling and your single point of failure", "A crash is a full outage", "Deploys mean downtime"], "with": ["Capacity scales by adding instances", "A dead instance is routed around within seconds", "Rolling deploys become invisible to users"], "conclusion": "Availability is usually the bigger win. Capacity is the one people remember."}},
      {"id": "app1", "label": "App 1", "type": "server", "x": 740, "y": 170},
      {"id": "app2", "label": "App 2", "type": "server", "x": 740, "y": 300},
      {"id": "app3", "label": "App 3 (unhealthy)", "type": "server", "x": 740, "y": 430, "note": "Failing its health check, so it receives no traffic until it recovers."},
      {"id": "db", "label": "Database", "type": "db", "x": 960, "y": 300, "note": "Shared state lives here — which is exactly what lets any app instance serve any request."}
    ],
    "edges": [
      {"from": "client", "to": "lb"},
      {"from": "lb", "to": "app1"},
      {"from": "lb", "to": "app2"},
      {"from": "lb", "to": "app3", "label": "no traffic", "dashed": True},
      {"from": "app1", "to": "db"},
      {"from": "app2", "to": "db"}
    ]
  },
  "why": {
    "without": ["Capacity is capped by the biggest machine you can buy", "Any single failure is a total outage", "Every deploy causes downtime"],
    "with": ["Add instances to add capacity", "Failures are detected and routed around in seconds", "Rolling deploys, canaries and zero-downtime releases become possible"],
    "conclusion": "A load balancer buys throughput, but its real value is that no single machine's death is visible to users."
  },
  "whenToUse": ["More than one instance of anything", "You need zero-downtime deploys", "You want failures handled automatically rather than by a pager"],
  "whenNotToUse": ["A single instance where the balancer itself would be the new single point of failure (unless it is a managed, redundant service)", "Genuinely stateful long-lived connections that cannot be moved — though even then, balance the connection setup"],
  "tradeoffs": [
    {"option": "Layer 4 (TCP)", "pros": ["Extremely fast, minimal processing", "Protocol-agnostic"], "cons": ["Cannot route on URL, host or header", "Cannot retry a failed HTTP request", "No TLS termination"]},
    {"option": "Layer 7 (HTTP)", "pros": ["Route by path or header, terminate TLS, retry idempotent requests, rewrite and compress"], "cons": ["More CPU per request, slightly higher latency", "Must understand the protocol"]},
    {"option": "Round-robin", "pros": ["Trivial, no state"], "cons": ["Ignores that requests differ wildly in cost; a slow backend still gets its share"]},
    {"option": "Least connections", "pros": ["Adapts to uneven request costs automatically"], "cons": ["Requires tracking state per backend"]},
    {"option": "Consistent hashing", "pros": ["The same key reliably lands on the same backend, which makes local caches effective"], "cons": ["Uneven distribution with skewed keys; needs virtual nodes to smooth out"]}
  ],
  "keyNumbers": [
    {"label": "Typical health check interval", "value": "2–10 s"},
    {"label": "Time to evict a dead backend", "value": "Interval × unhealthy threshold, commonly 10–30 s"},
    {"label": "L7 added latency", "value": "~1 ms"}
  ],
  "interactive": "load-balancer-sim",
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "Users are randomly logged out after you add a second app server. What is the most likely cause?",
     "options": ["The load balancer is misconfigured", "Session state is stored in each server's memory, so a request routed to the other server does not find it", "The database is too slow", "TLS is failing"],
     "answerIndex": 1,
     "explanation": "The classic symptom of stateful app servers. Fix it by externalising sessions to Redis or using signed tokens — sticky sessions work but undermine even balancing and make deploys messier."},
    {"id": "q2", "type": "mcq", "question": "Why do health checks matter more than the load-spreading itself for small systems?",
     "options": ["They do not", "Because automatic removal of a failed instance converts a total outage into an invisible blip", "Because they reduce latency", "Because they encrypt traffic"],
     "answerIndex": 1,
     "explanation": "At small scale one server may well have enough capacity. The reason to run two behind a balancer is that one of them will eventually die at 3am."},
    {"id": "q3", "type": "architecture", "question": "Your backends keep a local in-memory cache and hit rates are poor behind a round-robin balancer. What routing helps?",
     "options": ["Least connections", "Consistent hashing on the cache key, so the same key lands on the same backend", "Random", "Weighted round-robin"],
     "answerIndex": 1,
     "explanation": "Round-robin scatters requests for the same key across all backends, so each caches everything. Consistent hashing gives each backend a stable slice of the key space."}
  ],
  "related": ["scaling", "cache", "client-server"]
})

C.append({
  "id": "scaling",
  "title": "Scaling — Vertical and Horizontal",
  "group": "Performance",
  "level": 1,
  "estimatedMinutes": 22,
  "summary": "Get a bigger machine, or get more machines. The first is easier; the second is the only one that keeps working.",
  "analogy": "A restaurant getting busier. Vertical scaling is buying a bigger oven — quick, no reorganisation, and it works right up until no bigger oven exists. Horizontal scaling is opening a second kitchen: more work to coordinate, but there is no ceiling, and if one kitchen catches fire you still serve dinner.",
  "explanation": {
    "beginner": "When a system gets slow you have two options. Move it to a more powerful computer — more CPU, more memory — which needs no code changes but has a hard limit and usually means a restart. Or run the same program on several computers and split the traffic between them, which has no real limit but only works if the program does not keep important things in its own memory.",
    "interview": "Vertical scaling raises per-node resources: simple, no distribution semantics, but bounded by the largest instance type and typically requiring downtime. Horizontal scaling adds nodes behind a load balancer: effectively unbounded and fault-tolerant, but requires statelessness and moves the bottleneck to shared dependencies — usually the database, which is why read replicas, caching and eventually sharding follow. Amdahl's law bounds the benefit by the serial fraction."
  },
  "diagram": {
    "nodes": [
      {"id": "lb", "label": "Load Balancer", "type": "lb", "x": 500, "y": 120},
      {"id": "a1", "label": "App", "type": "server", "x": 260, "y": 290},
      {"id": "a2", "label": "App", "type": "server", "x": 500, "y": 290},
      {"id": "a3", "label": "App", "type": "server", "x": 740, "y": 290, "note": "Adding instances is cheap and fast — as long as they are interchangeable."},
      {"id": "db", "label": "Database\\n(the new bottleneck)", "type": "db", "x": 500, "y": 470,
       "note": "Stateless app tiers scale easily; the shared database is where horizontal scaling gets hard.",
       "why": {"without": ["Adding app servers eventually just multiplies the load on one database"], "with": ["Read replicas, caching and sharding are the next moves"], "conclusion": "Scaling moves the bottleneck; it never removes it."}}
    ],
    "edges": [
      {"from": "lb", "to": "a1"}, {"from": "lb", "to": "a2"}, {"from": "lb", "to": "a3"},
      {"from": "a1", "to": "db"}, {"from": "a2", "to": "db"}, {"from": "a3", "to": "db"}
    ]
  },
  "why": {
    "without": ["Traffic growth translates directly into latency and then errors", "One machine's failure is the whole system's failure"],
    "with": ["Capacity tracks demand, and can shrink again when demand falls", "Redundancy comes as a side effect"],
    "conclusion": "Scale vertically while it is cheap and simple; design for horizontal from the start so you are not rewriting under pressure."
  },
  "whenToUse": ["Vertical: early, when engineering time costs more than hardware", "Horizontal: when you need redundancy, or you are approaching the largest available instance", "Auto-scaling: when load is predictably spiky"],
  "whenNotToUse": ["Do not scale before you have measured — the bottleneck is frequently one bad query, and no number of servers fixes an N+1", "Auto-scaling responds in minutes, so it does not save you from a traffic spike measured in seconds; that needs headroom or a queue"],
  "tradeoffs": [
    {"option": "Vertical (scale up)", "pros": ["No code changes", "No distributed-systems problems", "Often the cheapest fix for a small system"], "cons": ["Hard ceiling", "Usually needs a restart", "Cost grows faster than capacity at the top end", "Still a single point of failure"]},
    {"option": "Horizontal (scale out)", "pros": ["No practical ceiling", "Redundancy included", "Commodity hardware, elastic cost"], "cons": ["Requires stateless services", "Needs a load balancer and service discovery", "Shifts pressure to the database", "Debugging is harder across many nodes"]}
  ],
  "keyNumbers": [
    {"label": "A well-tuned app server", "value": "1,000–10,000 rps for simple requests"},
    {"label": "A single Postgres instance", "value": "Thousands of writes/s, tens of thousands of cached reads/s"},
    {"label": "Auto-scale reaction time", "value": "1–5 minutes — too slow for a sudden spike"}
  ],
  "quiz": [
    {"id": "q1", "type": "architecture", "question": "You add five more app servers and throughput barely improves. What is the most likely explanation?",
     "options": ["The load balancer is broken", "The bottleneck moved — most likely the shared database, which all servers still contend for", "You need even more servers", "Horizontal scaling does not work"],
     "answerIndex": 1,
     "explanation": "Scaling the stateless tier only helps until the shared dependency saturates. The next moves are caching, read replicas, query optimisation, and eventually sharding."},
    {"id": "q2", "type": "mcq", "question": "What must be true of your application before horizontal scaling works?",
     "options": ["It must use microservices", "Any instance must be able to serve any request — no per-user state in local memory or on local disk", "It must be written in Java", "It must use NoSQL"],
     "answerIndex": 1,
     "explanation": "Statelessness is the prerequisite. Sessions, uploaded files and in-memory caches must move to shared services, or requests become pinned to particular machines."}
  ],
  "related": ["load-balancer", "cache", "sharding", "replication"]
})

for c in C:
    (OUT / (c["id"] + ".json")).write_text(json.dumps(c, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", len(C), "concepts")
