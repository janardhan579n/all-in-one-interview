# Roadmap and status

This file says what is built, what is deliberately not built, and what is unverified. Nothing
in the application pretends to work when it does not; where a feature is partial it is listed
here and marked `TODO` at the place in the code where it would go.

Legend: **✅ done and verified** · **🟡 built but unverified** · **⬜ not built (TODO)**

---

## Phase 1 — Foundations ✅

| | |
|---|---|
| ✅ | Monorepo: `content/`, `frontend/`, `backend/`, `docs/`, `start.sh`, Docker |
| ✅ | Content-as-data model, one JSON file per lesson/problem/concept/case study |
| ✅ | `validate:content` — cross-reference integrity as a build gate |
| ✅ | Design docs written before implementation (ARCHITECTURE, CONTENT_MODEL, API, DECISIONS) |
| ✅ | Dark/light theming as a CSS-variable token swap; reduced-motion support |

## Phase 2 — The visualisation engine ✅

| | |
|---|---|
| ✅ | `Engine = (input) => Step[]`, each step carrying scene + code line + explanation + variables |
| ✅ | 41 engines across arrays, windows, pointers, search, hashing, lists, stacks/queues, trees, graphs, recursion, DP |
| ✅ | One `SceneView` renderer for 14 panel kinds; one `usePlayer` for all timing |
| ✅ | Player: ▶ ⏸ ⏮ ⏭ 🔄, 0.5×/1×/2×, scrubber, keyboard control |
| ✅ | Code ↔ state ↔ visualisation stay in sync structurally, verified in a real browser |
| ✅ | Live text transcript of every step (the accessible equivalent of the animation) |
| ✅ | 39 engine unit tests |

## Phase 3 — DSA curriculum ✅

| | |
|---|---|
| ✅ | 21 lessons: 5 foundations, 7 data structures, 9 patterns (§40's 16 required topics, plus 5) |
| ✅ | Fully interactive: two pointers, sliding window, binary search, fast & slow pointer, BFS, DFS (§41) |
| ✅ | Problem-first journey on every pattern: motivating problem → brute force → why slow → observation → leap → optimised |
| ✅ | The insight gate (§42): the leap is behind a button, so you try before you are told |
| ✅ | Pattern recognition: signals, anti-signals, 7 decision trees, interactive pattern map |
| ✅ | 31 problems, grouped pattern → difficulty → problem, each with the 12 required sections |
| ✅ | Dual explanations (beginner / interview) throughout |

## Phase 4 — System design ✅

| | |
|---|---|
| ✅ | 13 concepts, taught building-blocks-first (§12) |
| ✅ | Hand-rolled SVG architecture canvas with request-packet animation |
| ✅ | Architecture **evolution** — stages with a trigger, a change, a reason, and new components highlighted (§16, §44) |
| ✅ | Two-sided trade-off cards, enforced by the content validator (§14) |
| ✅ | 4 case studies; URL shortener and rate limiter carry working simulators (real base62, real token bucket) |
| ✅ | Estimation, API design and data model sections per case study |

## Phase 5 — Practice, progress, shell ✅

| | |
|---|---|
| ✅ | Quizzes with per-option explanations; answers stripped server-side in online mode |
| ✅ | "Identify the pattern" drills that mark on the *signals*, not just the answer |
| ✅ | Interview simulator with staged hints |
| ✅ | Progress tracking, streaks, weak areas, readiness band; export/import `progress.json` |
| ✅ | 3 learning paths, global search, bookmarks, notes, ⌘K palette |
| ✅ | Route-level code splitting — initial JS 36 kB; the content bundle loads lazily |

## Phase 6 — Backend ✅

| | |
|---|---|
| ✅ | Spring Boot 3.3 / Java 17, packages exactly as specified, SQLite via `JdbcTemplate` |
| ✅ | Content store, DSA/problems/system-design/learning/progress/quiz/notes/search/practice controllers |
| ✅ | Idempotent `schema.sql`, created by the DataSource bean itself; H2 profile as a fallback |
| ✅ | **78/78 tests pass** — unit (`AlgorithmsTest`, `ContentStoreTest`) and full-context integration (`ApiIntegrationTest`) |
| ✅ | `scripts/smoke-api.sh` — end-to-end checks against a running instance |

### What the first compile found

The backend was written where Maven Central was blocked, so it was delivered unverified and
compiled for the first time on the target machine. Three defects surfaced. Each is recorded
here because each is a trap that can recur rather than a typo:

1. **`schema.sql` was never executed under test.** `src/test/resources/application.yml`
   *replaces* `src/main/resources/application.yml` — test resources come first on the classpath
   and Spring loads exactly one `application.yml`, so nothing in the main file is inherited.
   `spring.sql.init.mode: always` was therefore absent, and Boot's default `embedded` mode
   skips scripts for SQLite, which it does not classify as embedded. Twenty-six errors, one
   cause. Schema creation now lives in `DatabaseConfig.dataSource()`, so no consumer can hold a
   connection before the tables exist, and the test yml carries a warning about replace-not-merge.
2. **Startup ordering.** `LocalUserService` writes the local user in `@PostConstruct` with no
   ordering edge to schema initialisation. Now annotated `@DependsOnDatabaseInitialization`.
3. **Search scored term frequency instead of field weight.** Summing a field's weight per
   occurrence meant a long problem statement mentioning "window" fifteen times outranked the
   Sliding Window lesson's title — and the backend then disagreed with the offline search in
   the frontend, breaking mode parity. Both now take the best-matching field per token.

The lesson worth keeping: the unit tests were all green while the application could not start.
Integration tests that boot the real context are what caught every one of these.

## Phase 7 — Interview preparation ✅

| | |
|---|---|
| ✅ | 4 tracks, 21 topic banks, **168 questions** — 37 junior, 83 mid, 48 senior |
| ✅ | Every question: model answer, what the interviewer listens for, follow-ups, red flags |
| ✅ | Answer gated behind an attempt, the §42 discipline applied to interview prep |
| ✅ | Self-marking through the existing content flags, so weak areas cover questions too |
| ✅ | Seeded drill mode — the same set survives a reload |
| ✅ | Backend controller, offline parity, validator rules, integration and unit tests |

Grounded in real mechanisms only. No question is attributed to a company's interview, because
that cannot be verified; the behavioural bank teaches how to structure your own story rather
than supplying one to recite.

## Phase 8 — Multi-language content ✅

| | |
|---|---|
| ✅ | 6 languages: English, Hindi, Telugu, Tamil, Kannada, Malayalam |
| ✅ | 14 lessons translated per language (foundations + all 9 patterns) = 70 overlays |
| ✅ | UI strings per language, falling back to English key by key |
| ✅ | Partial overlays deep-merged over English — no copies, no drift |
| ✅ | Untranslated content falls back **and says so**; buttons show real coverage |
| ✅ | `?lang=` on content endpoints; identical merge in the offline bundle |

### A bug worth recording

The frontend bundle collected documents by substring (`path.includes('/dsa/patterns/')`), so the
overlay at `i18n/te/dsa/patterns/sliding-window.json` matched too — and because it shares the
English id, it *replaced* the English lesson in the map. The English page rendered in Telugu
before any language was chosen. The fix is one line excluding the i18n subtree, but the lesson
is the general one: a mirrored directory tree plus substring matching is a collision waiting to
happen, and only a browser check caught it.

## Phase 9 — DSA gap closed ✅

| | |
|---|---|
| ✅ | 12 new lessons: sorting, heap, trie, union-find, monotonic stack, intervals, greedy, topological sort, shortest paths, bit manipulation, matrix, DP patterns |
| ✅ | 12 new visualisation engines — 41 → **53** |
| ✅ | 32 new problems — 31 → **63** |
| ✅ | 18 new engine unit tests asserting the *computation*, not the narration |
| ✅ | Every new lesson wired into the pattern map; group names deduplicated |
| ✅ | All 12 lessons driven in a real browser: rendered, gated, animating |

The library now covers every DSA topic a standard interview draws on. What is left is depth in
the problem bank, not breadth in the curriculum.

### Two things worth recording

**The trie was drawn wrong first.** It reused the binary-tree renderer through the
left-child/right-sibling encoding, which drew a sibling link identically to a parent link — so
"cat" and "car" read as a chain rather than as two words sharing a prefix, which is the single
idea the picture exists to convey. It was replaced with an explicit graph layout. A
visualisation that renders without error can still teach the wrong thing, and only looking at it
catches that.

**Engine tests assert results, not steps.** Each new engine is checked against what the
algorithm should actually produce — heap extraction order, Dijkstra's 3/8/11 distances, spiral
order, next-greater output, a topological order where every edge points forwards. An animation
that tells a confident story about a wrong answer is worse than no animation.

## Phase 10 — System design gap closed ✅

| | |
|---|---|
| ✅ | 18 new concepts — 13 → **31**, in seven groups |
| ✅ | Two new groups: **Security** and **Architecture**, wired into the index with blurbs |
| ✅ | 3 new simulators: consistent-hashing ring, Bloom filter, circuit breaker |
| ✅ | 9 new unit tests asserting the *properties the widgets claim on screen* |
| ✅ | New **System Design for Senior Interviews** path (15 steps); beginner path 17 → 23 steps |
| ✅ | Cross-links rewritten in both directions — `cache` now offers `bloom-filter`, `sharding` offers `consistent-hashing` |

The new concepts: DNS · proxies · WebSockets and the transports before them · indexing ·
connection pooling · object storage · full-text search · Bloom filters · consistent hashing ·
circuit breakers · idempotency · observability · consensus and leader election · sagas ·
event-driven architecture · monolith vs microservices · API gateway · auth.

`docs/CONCEPT_AUTHORING.md` was written first and is the contract the batch was held to —
two-sided trade-offs, a `whenNotToUse` that names real costs, problem before solution.

### The hash was wrong, and only the test knew

The ring simulator hashed with plain FNV-1a. It rendered, it animated, and it was wrong: on
short structured inputs like `node-A#0` and `key-17`, FNV-1a's weak avalanche left whole regions
of the output correlated, and **two of the four nodes owned zero of the 600 keys**. The widget
drew a confident picture of uniformity the code did not have — and worse, the virtual-nodes
slider, whose entire job is to demonstrate that more ring points even out the distribution,
barely moved the number. Adding the murmur3 `fmix32` finaliser brought four nodes within 16% of
a fair share at 150 virtual nodes.

Nothing about this was visible on screen; the picture looked plausible either way. It was caught
because the test asserts the property the widget *claims* — that virtual nodes reduce imbalance —
rather than that the component renders. This is the same lesson Phase 9 recorded about the trie,
arriving from the opposite direction: there, looking at it was what caught it; here, looking at
it would not have.

## Phase 11 — Problem bank depth ✅

| | |
|---|---|
| ✅ | 102 new problems — 63 → **165**, across **29** patterns |
| ✅ | Six lessons that had no problems at all now do: arrays, linked lists, trees, graphs, queues, recursion |
| ✅ | Every core interview pattern has 5+ problems spanning beginner → advanced |
| ✅ | `docs/PROBLEM_AUTHORING.md` + `docs/PROBLEM_MANIFEST.md` — the contract, and the fixed id list authors wrote against |
| ✅ | 106 declared visualisations, **every one executed by a test** (`visualizations.test.ts`) |
| ✅ | `gridBfs` gained multi-source and eight-directional modes; 5 new engine tests |
| ✅ | Ten orphaned problems given inbound `similar` links — the bank is now a connected graph |

Final distribution: 52 beginner, 81 intermediate, 32 advanced. The thinnest patterns are
`queue` and `recursion` at 3 each, which is proportionate to how much interview weight they carry
on their own.

### The visualisation specs were never executed, and seven were wrong

A `visualization` block is content naming code: a problem says "animate me with `gridBfs` and
this input". The content validator checked that the engine name was *registered* and stopped
there. Nothing ever ran one. So `visualizations.test.ts` now runs all 106 — and it failed on
seven, **three of which had been shipping since Phase 3**:

- **Four were line-number drift.** The engine highlighted line 12 of a listing with 9 lines, so
  the code pane confidently narrated a step while highlighting nothing. `number-of-islands`,
  `valid-parentheses` and `rotting-oranges` had been doing this for four phases.
- **Three were worse: the wrong algorithm.** `gridBfs` only knew single-source-walk-to-a-target,
  and `rotting-oranges` and `walls-and-gates` are multi-source distance fills. The animation said
  *"Reached the exit in 8 steps"* over a problem about decay spreading from several origins at
  once. `shortest-path-binary-matrix` is eight-directional and was being animated with four
  neighbours, which produces a different answer from the one the problem asks for.

The first class was fixed by realigning the listings. The second was fixed by giving the engine
the modes the content actually needed — `sources` for multi-source, `diagonal` for eight-way —
which is the better outcome, because multi-source BFS is precisely the technique two of those
problems exist to teach and it now has an animation that shows it.

This is the third phase in a row where the same lesson arrived by a different route: Phase 9
caught a trie drawn with the wrong renderer by *looking* at it, Phase 10 caught a ring built on a
clustering hash by *testing the property*, and Phase 11 caught seven wrong animations by
*running the data*. Content that names code is code, and it needs a test.

## Phase 12 — Practice links and a verification harness ✅

| | |
|---|---|
| ✅ | Every problem carries a **LeetCode number and link** — 162 linked, 8 premium-flagged, 3 with no honest counterpart that say so |
| ✅ | Numbers on the problems index; every lesson hands you its pattern's set, easiest first |
| ✅ | 29 lesson practice sets refreshed — they had gone stale at 2–4 problems while patterns grew to 5–9 |
| ✅ | `tools/verify/` — extract, compile, replay examples, differential test, generate the report |
| ✅ | **165/165 solutions compile**, 124 reproduce their own examples, 32 agree with a brute force over 12,800 random inputs |
| ✅ | `docs/VERIFICATION.md`, generated from the results, with a per-problem table |

The practice link exists because of a question worth recording: *"can I blindly depend on my app?"*
No — and the honest response was to close the two gaps that made the answer no. The first is that
reading cannot teach you to type code under a clock, so every page now points at the judge where
you can. The second is that the bank had only ever been checked against examples its own authors
wrote, which is self-consistency rather than correctness.

### The harness found two real defects, and neither was where anyone was looking

Both were in **brute-force** code — the part the reader is shown *first* and invited to reason
about, and the part every other check in this project ignores.

`house-robber-ii` treated house `i` as adjacent to `(i + 1) % n`, which for a single house is
itself: `rob([9])` returned 0, where the constraints say plainly that one house is trivially
legal. `number-of-operations-to-connect` counted each cable's *individual* redundancy against the
original graph — a triangle has three individually-redundant edges but only one true spare — and
reported 3 moves for a case whose answer is −1.

Both pages' worked examples passed throughout. Only running two independent implementations
against each other found them.

### Most of a verification harness is learning what the problems promise

The first differential run reported fourteen failures and **not one was a defect**. They were
inputs the problems forbid: negative prices fed to a problem constrained to `0 <= prices[i]`,
empty arrays given to one that says `1 <= nums.length`, random integers handed to a problem that
guarantees every element appears exactly twice. An implementation owes no sensible behaviour
outside its stated domain, and a report full of such findings teaches the reader to ignore it —
which is worse than having no report.

So the generator now reads each problem's own `constraints` list, and the eight problems with
*structural* preconditions ("a permutation of 0..n²−1", "both arrays are already sorted") have
named repairs that quote the constraint they enforce. Getting from fourteen noisy failures to two
real ones was most of the work, and it is the part that makes the green tick mean something.

A smaller lesson, recorded because it cost an hour: the extractor clears `build/` on every run,
and the harness's own sources were living there. It deleted itself. Generated output and
hand-written tool source do not share a directory.

### A postscript: the copy is always the one that rots

`mvn test` failed on `sorting references unknown engine 'mergeSortSteps'` — an engine added in
Phase 9, against content that was entirely correct. `ContentStoreTest` carried its own
hand-written `Set.of(...)` of 41 engine names, a second copy of a list whose real home is
`visualizers/registry.ts`.

Note which gate caught it and which did not. `validate-content.mjs` had been green for three
phases, because it *reads* the registry out of the TypeScript source rather than restating it.
The Java test restated it, so the frontend gate and the backend gate had silently disagreed about
what exists since the day Phase 9 landed. The copy rots rather than the original because the
original is edited by whoever adds an engine and the copy is edited by whoever remembers.

The test now parses the same file with the same marker, and skips itself with a reason when the
frontend is not checked out beside the backend, rather than passing quietly or failing falsely.

---

## Not built (explicit TODOs)

These are deliberate scope decisions, not oversights. None of them has a fake button in the UI.

| | Feature | Where it would go | Note |
|---|---|---|---|
| ⬜ | **AI tutor** | `frontend/src/services/tutor.ts` | ADR-008: v1 ships no AI rather than a fake one (§46). The seam is a single interface so a local model (Ollama) or an API key can be dropped in without touching pages. |
| ⬜ | **In-browser code execution** | — | Running the learner's own Java needs either a JVM sandbox or WASM; both are large. Today the code panes are read-only, the visualisations run the algorithm instead, and every problem links out to a judge. **The largest remaining gap in what this app can teach.** |
| ⬜ | **Differential coverage** | `content/dsa/problems/` | 32 of 165 problems have a runnable brute force to test against; the other 117 are written as excerpts. Making them standalone would roughly quintuple the strongest check the project has. |
| ⬜ | **Spaced repetition scheduling** | `progress/` | Progress records everything needed (attempt history, confidence 1–5, quiz scores); the scheduler on top is not written. |
| ⬜ | **More case studies** | `content/system-design/case-studies/` | 4 built; news feed, ride sharing, video streaming, search autocomplete are the obvious next four. **Now the largest remaining gap**, and every concept they would draw on exists as of Phase 10. |
| ⬜ | **Translation depth** | `content/i18n/` | 14 of 87 documents per language. Data structures, system-design concepts and problems are still English-only — which the coverage badge states plainly. |
| ⬜ | **Multi-user accounts** | `user/LocalUserService.java` | Single local user by design (§1: no mandatory auth). The service is the seam if this ever changes. |
| ⬜ | **Mobile-first layout** | — | Responsive down to tablet; desktop-primary as specified (§27). Visualisations with wide scenes scroll horizontally on a phone. |
| ⬜ | **Browser end-to-end suite** | `frontend/` | Unit tests plus a manual Playwright pass today; a committed Playwright suite over the main journeys is the next test investment. |

---

## Known rough edges

- The code pane in a visualisation scrolls horizontally for very long Java lines on narrow
  windows. It widens at `xl`; a soft-wrap toggle would be the fix.
- Search ranks by field weight, not by relevance model. Good enough for ~240 documents; it
  would need an inverted index with scoring at ten times that.
- Architecture diagram node positions are hand-authored `x`/`y` coordinates in content JSON.
  Predictable and diff-friendly, but adding a node to a dense stage means nudging neighbours
  by hand. Auto-layout was rejected (ADR-005) because it moves nodes between stages, which
  destroys the "what's new since the last stage" reading.
- Quiz questions are multiple-choice only. Free-text answers need marking logic that, without
  an AI tutor, would come down to keyword matching — worse than not offering it.

---

## If you pick this up

The highest-value next steps, in order:

1. Add content, not code. The library is the product; the machinery to display it is done.
   `npm run validate:content` and `npx vitest run` will keep you honest — between them they check
   every cross-reference, every trade-off, and every declared animation.
2. Wire `services/tutor.ts` to a local model if you want the AI tutor — the UI seam is a
   "Why?" affordance that already exists as static content, so it degrades cleanly.
