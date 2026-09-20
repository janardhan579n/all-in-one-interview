# API specification

Base URL: `http://localhost:8080/api`. All responses are JSON. There is no authentication —
the platform is local-first and single-user (`userId = "local"`). Errors use:

```json
{ "error": "NOT_FOUND", "message": "No lesson with id 'slidding-window'", "path": "/api/dsa/lessons/slidding-window" }
```

## Health & meta

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | `{ "status": "UP", "contentItems": 63, "version": "1.0.0" }` |
| GET | `/api/meta/stats` | counts per content type — used by the dashboard |

## DSA

| Method | Path | Description |
|---|---|---|
| GET | `/api/dsa/lessons` | summaries; filters: `?kind=pattern&level=2&group=Trees&tag=array` |
| GET | `/api/dsa/lessons/{id}` | full lesson, **quiz answers stripped** |
| GET | `/api/dsa/pattern-map` | the interactive map tree |
| GET | `/api/dsa/groups` | `[{ "group": "Arrays & Strings", "lessonIds": [...] }]` |

## Problems

| Method | Path | Description |
|---|---|---|
| GET | `/api/problems` | summaries; filters `?patternId=sliding-window&difficulty=beginner&q=substring` |
| GET | `/api/problems/{id}` | full problem |
| GET | `/api/problems/by-pattern` | grouped `pattern → difficulty → [problems]` (§9) |
| GET | `/api/problems/daily` | deterministic daily challenge (seeded by date) |

## System design

| Method | Path | Description |
|---|---|---|
| GET | `/api/system-design/concepts` | summaries, `?group=Performance` |
| GET | `/api/system-design/concepts/{id}` | full concept |
| GET | `/api/system-design/case-studies` | summaries |
| GET | `/api/system-design/case-studies/{id}` | full case study incl. evolution stages |
| GET | `/api/decision-trees/{id}` | decision tree |

## Learning paths & recommendation

| Method | Path | Description |
|---|---|---|
| GET | `/api/learning/paths` | all paths |
| GET | `/api/learning/paths/{id}` | path with per-step progress merged in |
| GET | `/api/learning/next` | `{ "lessonId": "...", "reason": "..." }` — next recommended item |
| GET | `/api/learning/readiness` | interview-readiness breakdown + weak areas |

## Progress

| Method | Path | Description |
|---|---|---|
| GET | `/api/progress` | full snapshot: lessons, problems, quizzes, streak, totals |
| PUT | `/api/progress/lessons/{id}` | `{ "status": "completed", "percent": 100 }` |
| POST | `/api/progress/problems/{id}/attempt` | `{ "solved": true, "confidence": 3 }` |
| GET | `/api/progress/summary` | dashboard aggregates (§25) |
| GET | `/api/progress/export` | `progress.json` download (§48) |
| POST | `/api/progress/import` | restore from `progress.json` |

## Quiz

| Method | Path | Description |
|---|---|---|
| GET | `/api/quiz/{contentId}` | questions **without** answers |
| POST | `/api/quiz/{contentId}/evaluate` | `{ "answers": { "q1": 2 } }` → per-question correctness, explanations, score; also records the result |

## Notes & bookmarks

| Method | Path | Description |
|---|---|---|
| GET/PUT/DELETE | `/api/notes/{contentId}` | free-text note for any content id |
| GET | `/api/notes` | all notes |
| GET | `/api/bookmarks` | all bookmarks |
| POST/DELETE | `/api/bookmarks/{contentId}` | toggle bookmark |
| PUT | `/api/progress/flags/{contentId}` | `{ "difficult": true, "mastered": false }` |

## Search

| Method | Path | Description |
|---|---|---|
| GET | `/api/search?q=cache&limit=20` | `[{ "id", "title", "type", "group", "snippet", "score" }]` across lessons, problems, concepts, case studies |

## Interview preparation

| Method | Path | Notes |
|---|---|---|
| GET | `/api/interview/tracks` | every track with live question counts and level spread |
| GET | `/api/interview/tracks/{id}` | one track, topics in the order the track declares them |
| GET | `/api/interview/sets/{id}` | one topic's questions in full |
| GET | `/api/interview/questions` | filters: `?track=java&topic=concurrency&level=senior&type=scenario&q=text` |
| GET | `/api/interview/questions/{id}` | one question |
| GET | `/api/interview/drill?track=&level=&count=10&seed=` | randomised set; the seed defaults to the day so a reload is stable |

Answers are **not** stripped here, unlike `/api/quiz`. A quiz is a test, so an answer key would
defeat it; an interview bank is study material and the model answer is the content. The
attempt-before-you-look discipline lives in the UI.

Per-question progress uses the existing `PUT /api/progress/flags/{id}` (difficult / mastered),
so a question needs no table of its own and appears in the same weak-area reporting.

## Languages

| Method | Path | Notes |
|---|---|---|
| GET | `/api/i18n/languages` | registry plus honest coverage: `translatedDocuments`, `coveragePercent` |
| GET | `/api/i18n/strings/{language}` | UI strings; the client falls back to English per key |

Content endpoints accept `?lang=`:

| | |
|---|---|
| `GET /api/dsa/lessons/{id}?lang=hi` | Hindi where translated, English elsewhere |
| `GET /api/dsa/lessons?lang=te` | list summaries with translated titles |
| `GET /api/system-design/concepts/{id}?lang=ta` | |
| `GET /api/system-design/case-studies/{id}?lang=kn` | |

Every localised response carries a marker so the client can say which it got:

```json
{ "id": "sliding-window", "title": "…", "translation": { "language": "hi", "translated": true } }
```

`translated: false` means no overlay exists and the document is English — the UI shows a notice
rather than pretending.

## Practice

| Method | Path | Description |
|---|---|---|
| GET | `/api/practice/pattern-recognition?count=10` | randomised question set, answers stripped |
| POST | `/api/practice/pattern-recognition/evaluate` | `{ "answers": { "pr-01": "sliding-window" } }` → correctness + explanations |
