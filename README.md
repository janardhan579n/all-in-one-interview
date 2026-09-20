# DSA & System Design — a local-first learning platform

An offline, free, open-source-friendly platform that teaches **how to think about problems**,
not how to memorise solutions. Every pattern is taught the way you would actually discover it:
a real problem first, a brute-force attempt, the moment that attempt becomes unbearable, the
observation that rescues it, and only then the code.

No account. No cloud. No API keys. No paid services. Once installed it runs with the network
cable unplugged.

---

## Quick start

```bash
./start.sh
```

Then open **http://localhost:5173**.

`start.sh` installs frontend dependencies on first run, starts the Spring Boot API if Java 17
and Maven are on your `PATH`, and starts the app either way. If Java is missing you lose
nothing visible: the whole content library is bundled into the frontend and progress is saved
in your browser.

```bash
./start.sh --frontend   # skip the backend entirely
./start.sh --backend    # API only, on :8080
./start.sh --build      # production build, served statically
```

### Sharing it

`docs/DEPLOYMENT.md` covers the three steps: a full test pass, putting it on your wifi
(`npm run dev -- --host`), and publishing the static build free on Cloudflare Pages, Netlify,
Vercel or GitHub Pages. Read the warning there before exposing the backend: it has one user and
no authentication by design, so a public deployment should be the frontend alone.

### With Docker

```bash
docker compose up --build     # → http://localhost:3000
```

The build needs a network connection once (npm and Maven downloads). After that both
containers run offline, and your progress lives in the `learnplatform-data` volume.

### Requirements

| | Needed for | Version |
|---|---|---|
| Node.js | the app | 18+ |
| Java | the optional backend | 17+ |
| Maven | building the backend | 3.9+ |
| Docker | the container route only | any recent |

---

## Two ways to run, one application

The frontend is the product; the backend is an optional upgrade. This is deliberate — a
learning tool that cannot start because a database will not start is not a learning tool.

| | Offline mode (no backend) | Online mode (backend running) |
|---|---|---|
| Lessons, problems, case studies | bundled in the app | served from `/content` by the API |
| Progress, notes, bookmarks | `localStorage` | SQLite at `data/learning.db` |
| Quiz marking | in the browser | server-side, answers never sent to the client |
| Search | in-memory index | server-side index |

The app detects which mode it is in at startup and shows it in the sidebar. Switching costs
nothing: **Progress → Export** writes a `progress.json` that **Import** accepts in either mode.

---

## How the teaching works

Every DSA lesson follows the same eight beats, because the order is the pedagogy:

**CONCEPT → INTUITION → VISUALIZATION → PATTERN → EXAMPLE → CODE → PRACTICE → INTERVIEW**

Some specifics worth knowing before you look around:

- **The insight is gated.** A pattern lesson shows you the motivating problem, the brute-force
  solution, its complexity and *why that is too slow* — and stops. The observation that leads
  to the optimisation is behind a "Show me the insight" button. You are meant to try first.
- **Visualisations are step machines, not videos.** Play, pause, step back, step forward,
  reset, 0.5× / 1× / 2×, and a scrubber. At every step the current line of Java is
  highlighted, the variable panel shows what a debugger would show, and a sentence explains
  what just happened. Code, state and picture cannot drift apart because they come from the
  same step object.
- **Two registers for every explanation.** The Beginner/Interview toggle in the sidebar swaps
  analogies written for someone changing careers for the language an interviewer expects.
- **Trade-offs never have a winner.** System design content is not allowed to say "SQL is
  better". Every option carries both pros and cons, and the content validator fails the build
  if one of them does not.
- **Architectures evolve.** Case studies do not present a finished diagram. They start at one
  server and grow, one stage at a time, each stage triggered by a specific thing that broke at
  the previous scale. New components are highlighted as they appear.

---

## What is in the box

| | Count | |
|---|---|---|
| DSA lessons | **33** | 6 foundations, 10 data structures, 17 patterns |
| Interactive visualisations | **53 engines** | driving 106 configured animations, every one of them run by a test |
| Practice links | **162 LeetCode problems** | on every problem page and in every lesson's practice set |
| Practice problems | **165** | pattern → difficulty → problem, 12 sections each; 29 patterns, all three difficulties |
| System design concepts | **31** | 7 groups, foundations through senior distributed systems |
| Case studies | **4** | URL shortener, rate limiter, chat, notifications |
| Interview questions | **168** | 4 tracks: Java/Spring, SQL, .NET, production scenarios |
| Decision trees | **7** | "which pattern / which data structure / which graph algorithm" |
| Learning paths | **4** | beginner, system design, **system design (senior)**, interview crash course |
| Languages | **6** | English plus Hindi, Telugu, Tamil, Kannada, Malayalam |

**Foundations** — what is an algorithm · data, variables and memory · loops and functions ·
Big-O · recursion · sorting

The sorting lesson covers merge sort, quicksort and how to choose between them.

**Data structures** — arrays · hashing · linked list · stack · queue · trees & BSTs · graphs ·
heap / priority queue · trie · union-find

**Patterns** — two pointers · sliding window · binary search · fast & slow pointer · prefix sum ·
BFS · DFS · backtracking · dynamic programming basics · monotonic stack · intervals · greedy ·
topological sort · shortest paths (Dijkstra) · bit manipulation · matrix traversal · DP patterns
(knapsack, LCS, LIS, unbounded)

**System design**, in seven groups:

- *Foundations* — client & server · HTTP · DNS · APIs · forward and reverse proxies ·
  real-time transport (polling → long polling → SSE → WebSockets)
- *Performance* — scaling · load balancing · caching · CDNs · consistent hashing
- *Data* — databases (SQL/NoSQL) · indexing · connection pooling · replication · sharding ·
  object storage · full-text search · Bloom filters
- *Reliability* — rate limiting · circuit breakers · idempotency · observability
- *Security* — authentication & authorization (sessions vs JWT, OAuth 2.0 / OIDC, RBAC vs ABAC)
- *Architecture* — monolith vs microservices · API gateway · event-driven architecture
- *Distributed* — CAP & consistency · message queues · consensus & leader election ·
  sagas & distributed transactions

**Interview tracks** — Java & Spring Boot (core language, collections, concurrency, JVM & GC,
Spring core, Spring Boot, JPA/Hibernate, REST, testing, microservices) · SQL & databases
(querying, indexing, transactions, performance) · .NET & C# (language, ASP.NET Core, EF Core,
async & memory) · production scenarios (ten real incidents to debug, design-review rounds,
STAR-structured project stories)

The simulators compute; they do not pretend. The rate limiter runs real token-bucket
arithmetic and the URL shortener runs real base62 encoding. The consistent-hashing ring really
hashes 600 keys and really walks the ring, so when you switch it to `hash % N` and add a node it
reports the *measured* share of keys that moved — around 80%, which is the number the whole
concept exists to avoid. The Bloom filter really sets and probes bits, so the false positives it
shows you are genuine collisions, and its measured error rate tracks the sizing formula printed
beside it. The circuit breaker really runs the CLOSED → OPEN → HALF_OPEN machine over a rolling
window.

---

## The problem bank

165 problems across 29 patterns, every one of them built the same way — and the shape is the
point. A problem file is not a solution write-up; it is a guided discovery in a fixed order:

1. **the problem**, and where that shape actually turns up in production work
2. **the approach you reach for first**, written out in full rather than dismissed
3. **why that is too slow** — not "it's O(n²)" but *what work is being wasted*. This is the
   field that does the teaching, and `docs/PROBLEM_AUTHORING.md` holds every author to it.
4. **the observation that unlocks the better answer**, written as a transferable signal rather
   than an answer to this one problem
5. only then, **the optimised solution** — behind the insight gate, so you try before you are told

Then three common mistakes, each naming a specific bug *and the symptom it produces*, so you
recognise it when it happens to you rather than reading past it.

Every problem is reachable from at least one other through `similar`, so the bank is a graph you
can wander rather than a list you work down.

### And then go and type it

Every problem carries its **LeetCode number and a direct link**, the problems index shows the
number beside each title, and finishing a lesson hands you that pattern's set —
`167, 26, 977, 125, 11, 15, 42` for two pointers, easiest first. Three problems have no honest
counterpart on a judge and say so on their page rather than pointing you somewhere approximate.

That loop is the point. This library can teach you to recognise a pattern and reconstruct the
algorithm; it cannot teach your fingers to produce a correct `while (left < right)` under a
clock, because the code panes are read-only. Read here, type there.

### How far to trust the solutions

Not blindly, and `docs/VERIFICATION.md` says exactly how far. In short: **all 165 solutions
compile**, **124 reproduce the answers printed on their own page**, and **32 agree with an
independent brute-force implementation across 12,800 random inputs** drawn from each problem's
own stated constraints. `./tools/verify/run.sh` re-runs all of it.

What that does *not* prove is that a solution would pass LeetCode — the problem statements here
are a reconstruction, so the specification itself is unverified. The harness has already earned
its keep: it found two real defects, both in brute-force code, both invisible to every other
check in the project.

---

## Interview preparation

168 questions, junior through senior, each with a model answer, **what the interviewer is
listening for**, the follow-ups you should expect, and the answers that lose marks. The answer
stays hidden behind a button for the same reason the lessons gate the insight: reading a model
answer feels productive and transfers almost nothing.

Everything is grounded in real mechanisms — connection pool exhaustion after a database
failover, a cache stampede on a synchronised TTL, consumer lag from rebalance churn, p50
improving while p99 doubles. Nothing is attributed to a company's interview, because that
cannot be verified. The behavioural section teaches you how to structure *your own* story
rather than supplying one to recite.

Mark yourself honestly as you go and the ones you fumbled join your weak areas alongside
lessons and problems. `/interview/drill` gives you a randomised mock round, one question at a
time, stable across a reload so you can leave one and come back.

## Languages

The learning content reads in **English, Hindi, Telugu, Tamil, Kannada and Malayalam** — the
buttons are under ⚙ in the header.

Two rules make this honest rather than decorative. Technical vocabulary stays in English
(`array`, `hash map`, `O(n)`) because that is how engineers in these languages actually speak,
and because the code on the same screen is in English. And anything not yet translated falls
back to English **and says so on the page**, with each language button showing its real
coverage — a button that silently served English would be worse than no button.

Translations are partial overlays keyed by document id, not copies, so an English lesson
gaining a section can never leave a translated page with a hole in it. Adding a language is a
directory and a registry entry; see `docs/CONTENT_MODEL.md`.

## Using it

| Where | What it is |
|---|---|
| `/` | Dashboard — continue where you left off, streak, next step |
| `/dsa` | All lessons by level and group |
| `/pattern-map` | The interactive map of how patterns relate |
| `/problems` | Problems grouped pattern → difficulty |
| `/system-design` | Concepts, building blocks first |
| `/system-design/case-studies` | Full designs with architecture evolution |
| `/practice` | "Identify the pattern" drills |
| `/interview/tracks` | Interview question banks by technology |
| `/interview/drill` | Randomised mock round, one question at a time |
| `/interview` | System-design interview simulator with staged hints |
| `/progress` | Charts, weak areas, readiness, export/import |
| `/bookmarks` | Saved items and your notes |

**Keyboard**: `⌘K` / `Ctrl-K` opens search. Inside a visualisation (click it first):
`Space` play/pause, `←` `→` step, `R` reset.

**Accessibility**: every visualisation carries a live text transcript, so it is followable
without seeing it. Keyboard navigation throughout, ARIA roles on the interactive widgets, and
animation respects `prefers-reduced-motion` — plus an explicit "Reduce motion" switch for when
the OS setting is not what you want here.

---

## Layout

```
.
├── content/              # the entire library — JSON, version-controlled, no code
│   ├── dsa/{foundations,data-structures,patterns,problems}/
│   ├── system-design/{concepts,case-studies}/
│   ├── decision-trees/  paths/  practice/
├── frontend/             # React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── visualizers/  # 41 step engines + one renderer + one player
│       ├── components/   # shell, learning widgets, architecture canvas, simulators
│       ├── pages/        # 17 routes
│       └── services/     # the single data layer: online ⇄ offline
├── backend/              # Java 17 + Spring Boot 3 + SQLite (optional)
│   └── src/main/java/com/learningplatform/
│       ├── common config content user learning
│       └── dsa systemdesign problems progress quiz notes search practice
├── docs/                 # ARCHITECTURE, CONTENT_MODEL, API, DECISIONS, ROADMAP
├── docker-compose.yml    start.sh
```

Content is **data, not code**. Adding a lesson means adding one JSON file — no rebuild of any
component, no new React page. See `docs/CONTENT_MODEL.md` for the schema and
`docs/DECISIONS.md` for why (ADR-001).

---

## Development

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173, proxies /api to :8080
npm test                  # 53 unit tests
npm run typecheck
npm run validate:content  # every cross-reference in content/ must resolve
```

```bash
cd backend
mvn spring-boot:run       # http://localhost:8080
mvn test                  # 78 tests
```

With the backend running, `./scripts/smoke-api.sh` exercises the assembled application over
real HTTP — content endpoints, search ranking, that quiz answers never leave the server, and
that a progress export imports back. It writes real rows, so point it at a throwaway database
if that matters: `APP_DATASOURCE_FILE=/tmp/smoke.db mvn spring-boot:run`.

`npm run validate:content` is the guard rail for the content library. It reads the engine and
interactive registries out of the TypeScript source (rather than keeping a second list in sync
by hand) and fails if a lesson names an animation that does not exist, a path step points at a
deleted lesson, a quiz answer is out of range, a decision-tree node is unreachable, or a
system-design trade-off is one-sided. Run it before committing content.

### Adding a lesson

1. Drop a JSON file into `content/dsa/patterns/` following an existing one.
2. `npm run validate:content` — it will tell you exactly what is missing.
3. `npm run dev`. The lesson appears; the sync step copies content into the offline bundle
   automatically.

### Adding a visualisation

Write a pure function `(input) => Step[]` in `frontend/src/visualizers/engines/`, register it
in `registry.ts`, and name it from content JSON. The engine returns data only; rendering,
timing and controls are already handled. Because it is pure, it is unit-testable without a
browser — see `engines.test.ts`.

---

## Data and privacy

Everything stays on your machine. In offline mode progress lives in `localStorage` under
`dsa-platform-progress-v1`; with the backend it lives in a SQLite file at
`backend/data/learning.db` (or the Docker volume). There is no telemetry, no analytics, no
account, and no outbound request of any kind after installation.

Export a portable `progress.json` at any time from **Progress → Export**.

---

## Status

- **Backend**: builds and passes **78/78** tests (`mvn test`), including integration tests that
  exercise every endpoint through the full Spring context.
- **Frontend**: builds clean, **53** unit tests pass, and the routes, the visualiser
  (code↔state↔picture stepping), theme switching and the §42 insight gate were exercised in a
  real headless browser.
- **Content**: 81 files, every cross-reference resolving, checked by `validate:content`.

The backend was written in an environment that blocked Maven Central, so its first real
compile happened after delivery. Three defects came out of it, all now fixed — they are worth
knowing about because each one is a trap that could recur:

1. **`schema.sql` never ran under test.** `src/test/resources/application.yml` *replaces* the
   main `application.yml` rather than merging with it, so `spring.sql.init.mode: always` was
   absent — and Boot's default mode skips scripts for SQLite, which it does not classify as
   embedded. Schema creation now happens inside the `dataSource` bean, where nothing can obtain
   a connection before the tables exist.
2. **A startup-ordering hazard**, fixed with `@DependsOnDatabaseInitialization` on
   `LocalUserService`.
3. **Search ranked term frequency over field weight**, so a long problem statement outranked
   the lesson named after the query, and the backend disagreed with the offline search. Both
   now score presence-per-field.

Known gaps and what comes next are in `docs/ROADMAP.md`, with anything unfinished marked
`TODO` in the code rather than faked in the UI.

Known gaps and what comes next are listed in `docs/ROADMAP.md`, with anything unfinished
marked `TODO` in the code rather than faked in the UI.

---

## Documentation

- `docs/ARCHITECTURE.md` — how the pieces fit, and the visualisation engine contract
- `docs/CONTENT_MODEL.md` — the JSON schemas, field by field
- `docs/API.md` — every endpoint, with request/response examples
- `docs/DECISIONS.md` — ADR-001…008: what was chosen, what was rejected, and why
- `docs/DEPLOYMENT.md` — testing it end to end, sharing it on your wifi, hosting it free
- `docs/ROADMAP.md` — phases, current status, explicit TODOs

## Licence

Content and code are yours to use and modify. All dependencies are permissively licensed
(MIT / Apache-2.0) and there are no paid services anywhere in the stack.
