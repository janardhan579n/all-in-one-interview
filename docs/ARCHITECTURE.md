# Architecture

## 1. Goals that drove the design

| Goal | Consequence |
|---|---|
| Must run offline, on a laptop, for free | No cloud services, no paid APIs, embedded DB (SQLite), content shipped in the repo |
| Content must be easy to extend without Java knowledge | Lessons are JSON files in `content/`, never Java classes |
| Visualisations must stay in sync with code | One shared *step* model: engines emit `Step[]`, each step carries state **and** the code line it corresponds to |
| Teaching order: problem → brute force → insight → pattern | Baked into the lesson schema (`problemFirst`), not left to prose |
| Should still be useful if the backend is down | Frontend has a bundled-content + `localStorage` fallback provider |

## 2. Runtime topology

```
                    ┌────────────────────────────────────┐
  Browser  ────────▶│  Vite dev server : 5173            │
                    │  (React + TS + Tailwind)           │
                    └───────┬────────────────────────────┘
                            │  /api/*  (proxied)
                            ▼
                    ┌────────────────────────────────────┐
                    │  Spring Boot : 8080                │
                    │  ├── ContentStore (in-memory)      │◀── content/**.json  (read at boot)
                    │  ├── SearchIndex  (in-memory)      │
                    │  └── JdbcTemplate ─────────────────┼──▶ data/learning.db (SQLite)
                    └────────────────────────────────────┘
```

In production (`docker compose up`) the frontend is built to static files and served by nginx,
which proxies `/api` to the backend container. Same code, different packaging.

## 3. Backend layering

Clean-architecture-lite. Three layers, dependencies point inwards only:

```
web (controller)  ->  service  ->  repository / store
```

```
com.learningplatform
├── common          ApiError, NotFoundException, GlobalExceptionHandler, Json utils
├── config          ContentProperties, DataSource + schema bootstrap, CORS/web config
├── content         ContentStore  (loads + caches every JSON file, the single source of truth)
├── learning        Learning paths, "what should I study next" recommendation
├── dsa             DSA lesson + pattern-map endpoints
├── systemdesign    System-design concept + case-study endpoints
├── problems        Problem catalogue, filtering by pattern/difficulty
├── progress        Lesson/problem/streak state  (SQLite)
├── quiz            Answer evaluation — answers are stripped from lesson payloads
├── notes           Notes + bookmarks           (SQLite)
├── search          Inverted-index search over all content
└── user            Local single-user identity (no auth provider required)
```

### Why `ContentStore` instead of JPA entities

Content is read-only at runtime, version-controlled, and authored by humans in Git.
Loading it once into immutable maps gives O(1) lookups, zero migrations, and means a
contributor can add a lesson by dropping a JSON file in `content/` and restarting.

Only *user* data (progress, notes, bookmarks, quiz results) is mutable, and that lives in SQLite.

### Why `JdbcTemplate` + `schema.sql` instead of JPA/Hibernate

SQLite + Hibernate needs a community dialect and still has sharp edges around
`ALTER TABLE`. The user-data model is 6 flat tables with no relationships worth mapping.
`JdbcTemplate` keeps the dependency tree small and startup fast. Documented in
[DECISIONS.md](DECISIONS.md#adr-003).

## 4. Frontend architecture

```
frontend/src
├── main.tsx, App.tsx          router + providers
├── components/                shell (sidebar, topbar), UI primitives, cards, charts
├── pages/                     one file per route
├── visualizers/
│   ├── engines/               PURE functions: input -> Step[]   (no React, unit-tested)
│   ├── renderers/             PURE React: Step -> SVG           (no timing logic)
│   ├── Player.tsx             the only place that owns time (play/pause/speed/step)
│   └── CodePane.tsx           highlights step.codeLine
├── services/                  api.ts (HTTP) + local.ts (bundled content + localStorage)
├── hooks/                     useProgress, useMode, useTheme, useBookmarks
└── content-bundle/            generated copy of /content (see scripts/sync-content.mjs)
```

### The visualisation contract

Everything animated on the platform — arrays, linked lists, trees, graphs, request flow
through an architecture — is produced by the same contract:

```ts
export interface Step<S> {
  state: S;              // the whole world at this instant (immutable snapshot)
  codeLine?: number;     // 1-based line in the lesson's code listing
  explain: string;       // one sentence, shown under the canvas
  vars?: Record<string, string | number>;  // variable inspector rows
  highlight?: string[];  // ids of nodes/cells to emphasise
}
export type Engine<I, S> = (input: I) => Step<S>[];
```

Consequences:

* engines are **pure** → trivially unit-testable (`engines/*.test.ts` assert exact step
  sequences, which is how we verify "visualization state transitions" are correct);
* the player is generic → `⏮ ⏸ ▶ ⏭ 🔄` and 0.5×/1×/2× work for every visualisation
  without per-visualisation code;
* code ↔ state ↔ picture stay in sync by construction, because one step carries all three.

Engines are registered in `visualizers/registry.ts` by string id. Content JSON references
an engine by that id, so a new lesson can reuse an existing animation with new input.

## 5. Content pipeline

```
content/**/*.json
   │
   ├── read at boot by ContentStore ───────▶ REST API ───▶ frontend (online mode)
   └── copied by scripts/sync-content.mjs ─▶ frontend/src/content-bundle
                                             └─ import.meta.glob(eager) ─▶ frontend (offline/fallback mode)
```

`npm run dev` and `npm run build` both run the sync script first (`predev` / `prebuild`),
so the bundled copy can never silently go stale.

The frontend's `ContentProvider` tries the API first; on any network error it transparently
falls back to the bundle and switches progress storage to `localStorage`. A small badge in
the top bar tells the user which mode they are in — no silent degradation.

## 6. Data model (SQLite)

See [`backend/src/main/resources/schema.sql`](../backend/src/main/resources/schema.sql).

| table | purpose |
|---|---|
| `app_user` | local single user (`local`), created on first boot |
| `lesson_progress` | per-lesson status (`not_started`/`in_progress`/`completed`), % , timestamps |
| `problem_attempt` | per-problem attempts, solved flag, self-rated confidence |
| `quiz_result` | per-quiz score, per-question correctness (JSON blob) |
| `note` | free-text notes attached to any content id |
| `bookmark` | bookmarked content ids |
| `activity_day` | one row per active day → learning streak |

## 7. Performance strategy

* Route-level `React.lazy` code splitting; visualisers load only with their lesson.
* API returns *summaries* for list screens (`/api/dsa/lessons`), full documents only on demand.
* Search uses a pre-built inverted index (backend) / MiniSearch-free hand-rolled index
  (frontend fallback) — no full-text scan per keystroke.
* Engines cap generated steps (`MAX_STEPS`) so a pathological input can't freeze the tab.
* Content is never loaded wholesale in online mode; the bundle is only parsed in fallback mode.

## 8. Accessibility & motion

* All player controls are real `<button>`s with `aria-label`s and keyboard shortcuts.
* `prefers-reduced-motion` is honoured: transitions collapse to instant state changes, and
  the Settings panel exposes an explicit "Reduce motion" switch.
* Every visualisation has a text transcript region (`aria-live="polite"`) that announces
  `step.explain`, so the animation is usable by screen readers.
