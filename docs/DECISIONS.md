# Architecture decision records

Short ADRs. Each records the decision, why, and what it costs us.

## ADR-001 — Content as version-controlled JSON, not database rows or Java classes

**Decision.** Every lesson, problem, concept, case study, path and quiz is a JSON file under
`content/`, loaded into memory at boot.

**Why.** Contributors (including non-Java people) can add a lesson with a text editor and a
pull request. Content diffs are reviewable. No migration is needed to publish a lesson. The
platform is educational, so content volume grows far faster than code.

**Cost.** Editing content requires a backend restart (or a hot reload in dev). Content is not
queryable with SQL — we build in-memory indexes instead, which is fine at this scale
(hundreds of documents, not millions).

## ADR-002 — SQLite for user data, not H2 or Postgres

**Decision.** `org.xerial:sqlite-jdbc`, file at `backend/data/learning.db`.

**Why.** The brief requires no externally installed database and true local-first operation.
SQLite is a single file, survives restarts, is trivially backed up (copy the file) and needs
no server process. H2 remains available via `--spring.profiles.active=h2` for throwaway dev.

**Cost.** Single-writer concurrency — irrelevant for one local learner.

## ADR-003 — `JdbcTemplate` + `schema.sql`, not JPA/Hibernate

**Decision.** Plain Spring JDBC with an idempotent `schema.sql` executed at startup.

**Why.** SQLite needs a community Hibernate dialect; the user-data model is six flat tables
with no interesting relationships. JDBC keeps startup near-instant and the dependency tree
small, and makes the SQL visible to a learner reading the repo.

**Cost.** Hand-written row mappers. Accepted; they are ~5 lines each.

## ADR-004 — Pure step-generating engines for every visualisation

**Decision.** `Engine<I, S> = (input: I) => Step<S>[]`, where a `Step` carries the full state
snapshot, the 1-based code line, an explanation sentence and a variable table.

**Why.** It makes the CODE ↔ STATE ↔ VISUAL relationship structural rather than something we
have to remember to maintain. It also makes animations unit-testable: `expect(steps[3].codeLine)
.toBe(5)` is a real assertion about correctness. A single generic `Player` then drives every
visualisation, so play/pause/step/speed/reduced-motion are implemented once.

**Cost.** Steps are materialised eagerly, so engines must cap output (`MAX_STEPS = 4000`) for
pathological inputs. Acceptable — teaching inputs are small by design.

## ADR-005 — Hand-rolled SVG architecture canvas instead of React Flow

**Decision.** `ArchitectureCanvas` renders nodes/edges from JSON as plain SVG with our own
pan/zoom, click-to-inspect and request-flow animation.

**Why.** We need *request packets travelling along edges* and *staged diffs between evolution
steps* — both are easier to implement directly than to bend a general-purpose flow library
into. It also removes ~120 kB from the bundle and keeps the offline build dependency-free.

**Cost.** No drag-to-rearrange authoring UI; diagram coordinates are authored in JSON.
React Flow stays a viable future swap because the JSON shape is library-agnostic.

## ADR-006 — Frontend works without the backend

**Decision.** `ContentProvider` calls the API first and falls back to a bundled copy of
`content/` plus `localStorage` progress if the API is unreachable. Mode is shown in the top bar.

**Why.** "Offline-first" in the brief, and it means the static build can be hosted anywhere
(or opened from disk) with the full learning experience intact.

**Cost.** Quiz answers are visible in the bundle in fallback mode, and the bundle must be
regenerated when content changes (automated via `predev`/`prebuild`). Progress then lives in
the browser rather than SQLite — the export/import feature bridges the two.

## ADR-007 — Java 17 language level, runs on 17+

**Decision.** `maven.compiler.release = 17`, Spring Boot 3.3.x. Tested on JDK 17 and 21.

**Why.** Java 17 is the LTS the brief asks for; compiling to 17 means the jar also runs on
21/24 without recompilation.

## ADR-008 — No AI dependency anywhere in v1

**Decision.** Zero calls to any model provider. The interview simulator uses authored hints,
staged reveals and self-assessment checklists rather than generated feedback.

**Why.** Hard constraint: free, offline, no paid APIs.

**Forward compatibility.** All tutor-shaped surfaces (`Hint`, `Explain my mistake`, interview
feedback) go through `services/tutor.ts`, which today returns authored content from JSON. A
future local-LLM or API-backed implementation only has to satisfy that interface — see
[ROADMAP.md](ROADMAP.md).
