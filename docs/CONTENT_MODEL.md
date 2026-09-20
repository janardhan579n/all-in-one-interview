# Content model

All learning content lives in `content/` as JSON. Nothing is hard-coded in Java or TSX.
Adding a lesson = adding a file. IDs are globally unique kebab-case slugs.

```
content/
├── dsa/
│   ├── foundations/      level-0/1 lessons (what is an algorithm, Big-O, arrays …)
│   ├── patterns/         the pattern lessons (two-pointers, sliding-window …)
│   ├── data-structures/  stack, queue, linked-list, tree, graph …
│   ├── problems/         one file per practice problem
│   └── pattern-map.json  the interactive pattern map
├── system-design/
│   ├── concepts/         load-balancer, cache, sharding …
│   └── case-studies/     url-shortener, rate-limiter …
├── paths/                predefined learning paths
├── practice/             pattern-recognition question bank
└── decision-trees/       interactive decision trees
```

## 1. Lesson (`dsa/foundations`, `dsa/patterns`, `dsa/data-structures`)

```jsonc
{
  "id": "sliding-window",
  "kind": "pattern",                  // foundation | pattern | data-structure
  "title": "Sliding Window",
  "group": "Arrays & Strings",        // used by the sidebar + pattern map
  "level": 2,                         // 0..4, matches the Learning Levels
  "difficulty": "beginner",           // beginner | intermediate | advanced
  "estimatedMinutes": 30,
  "summary": "One sentence shown on cards and in search results.",
  "prerequisites": ["arrays", "loops-and-iteration"],
  "tags": ["array", "string", "subarray"],

  "analogy": {                        // Beginner Mode / Interview Mode (§19, §20)
    "beginner": "Plain-language story, no jargon.",
    "interview": "Same idea in precise technical language."
  },
  "intuition": "Markdown. Why this idea exists at all.",

  "problemFirst": {                   // §42 — never teach the solution first
    "motivatingProblem": "…",
    "bruteForce": {
      "idea": "…",
      "code": ["line 1", "line 2"],   // array of source lines, Java
      "complexity": { "time": "O(n*k)", "space": "O(1)" },
      "whySlow": "…"
    },
    "observation": "The repeated work we noticed.",
    "leap": "The idea that removes it."
  },

  "howItWorks": ["step", "step", "step"],

  "patternRecognition": {             // §7
    "signals": ["contiguous subarray", "longest / shortest"],
    "antiSignals": ["order may be changed", "subsequence, not substring"],
    "decisionTreeId": "sliding-window"
  },

  "visualizations": [{                // §4, §5
    "id": "fixed-window",
    "title": "Fixed-size window, k = 3",
    "engine": "slidingWindowFixed",   // key in frontend/src/visualizers/registry.ts
    "input": { "array": [2,1,5,1,3,2], "k": 3 },
    "code": ["int windowSum = 0;", "…"]   // lines the engine's codeLine points into
  }],

  "implementations": [                // §6 — always Simple + Optimized
    { "label": "Simple",    "language": "java", "code": ["…"], "explanation": "…" },
    { "label": "Optimized", "language": "java", "code": ["…"], "explanation": "…" }
  ],

  "complexity": { "time": "O(n)", "space": "O(1)", "why": "Explain, don't just state." },

  "commonMistakes": [{ "mistake": "…", "fix": "…" }],
  "realWorldUses": ["…"],
  "interviewNotes": ["…"],

  "quiz": [{                          // §22
    "id": "q1", "type": "mcq",
    "question": "…", "options": ["…"], "answerIndex": 1, "explanation": "…"
  }],

  "practiceProblems": ["max-sum-subarray-k"],   // ids from dsa/problems
  "related": ["two-pointers", "prefix-sum"]
}
```

`answerIndex` and `explanation` are **stripped** by the backend when a lesson is served, and
returned only by `POST /api/quiz/evaluate`. (In offline fallback mode the browser has the
whole file, so evaluation happens client-side — documented, accepted trade-off.)

## 2. Problem (`dsa/problems`)

```jsonc
{
  "id": "longest-substring-no-repeat",
  "title": "Longest Substring Without Repeating Characters",
  "patternId": "sliding-window",
  "difficulty": "intermediate",
  "statement": "…",
  "realWorld": "Why anyone would ever need this.",
  "examples": [{ "input": "…", "output": "…", "explanation": "…" }],
  "constraints": ["…"],
  "bruteForce": { "idea": "…", "code": ["…"], "complexity": {…}, "whySlow": "…" },
  "patternIdentification": "Which signals point at the pattern.",
  "optimized":  { "idea": "…", "code": ["…"], "complexity": {…} },
  "visualization": { "engine": "…", "input": {…}, "code": ["…"] },
  "commonMistakes": ["…"],
  "similar": ["…"]
}
```

## 3. System-design concept (`system-design/concepts`)

```jsonc
{
  "id": "cache",
  "title": "Cache",
  "group": "Performance",             // Foundations | Data | Performance | Reliability | Distributed
  "level": 1,
  "summary": "…",
  "explanation": { "beginner": "…", "interview": "…" },
  "analogy": "…",
  "diagram": { "nodes": [ … ], "edges": [ … ] },   // see §5 below
  "why": {                            // §17 — the WHY button
    "without": ["1,000 reads → 1,000 DB queries", "DB CPU saturates"],
    "with":    ["1,000 reads → ~50 DB queries at 95% hit rate"],
    "conclusion": "Lower latency, lower DB load, higher throughput."
  },
  "whenToUse": ["…"], "whenNotToUse": ["…"],
  "tradeoffs": [{ "option": "Write-through", "pros": ["…"], "cons": ["…"] }],
  "interactive": "cache-sim",         // optional id of an interactive widget
  "quiz": [ … ],
  "related": ["cdn", "database"]
}
```

## 4. Case study (`system-design/case-studies`)

```jsonc
{
  "id": "url-shortener",
  "title": "Design a URL Shortener",
  "difficulty": "beginner",
  "summary": "…",
  "steps": [ { "key": "requirements", "title": "Requirements", "content": "markdown" }, … ],
  "estimation": { "assumptions": ["…"], "calculations": [{ "label": "…", "value": "…", "working": "…" }] },
  "api": [{ "method": "POST", "path": "/api/v1/urls", "request": "…", "response": "…", "notes": "…" }],
  "dataModel": [{ "name": "urls", "fields": [{ "name": "…", "type": "…", "notes": "…" }], "indexes": ["…"] }],
  "evolution": [{                     // §16, §44 — architecture grows in front of the learner
    "stage": "10k users",
    "problem": "One server saturates at ~2k rps.",
    "change": "Add a load balancer and a second app server.",
    "why": "…",
    "architecture": { "nodes": [ … ], "edges": [ … ] }
  }],
  "tradeoffs": [ … ],
  "interactive": "url-shortener",
  "interviewStages": [{ "key": "requirements", "prompt": "…", "hints": ["…"], "modelAnswer": ["…"] }],
  "quiz": [ … ]
}
```

## 5. Architecture diagram objects

Used by concepts, case studies and the evolution timeline. Coordinates are on a
1000 × 600 virtual canvas; the renderer scales to fit.

```jsonc
{
  "nodes": [
    { "id": "lb", "label": "Load Balancer", "type": "lb", "x": 500, "y": 180,
      "note": "Round-robin across healthy app servers.",
      "why": { "without": ["…"], "with": ["…"], "conclusion": "…" } }
  ],
  "edges": [ { "from": "client", "to": "lb", "label": "HTTPS", "dashed": false } ]
}
```

`type` ∈ `client · dns · cdn · lb · proxy · server · worker · cache · db · replica · queue ·
storage · search · monitor` — each maps to an icon + colour in `ArchitectureCanvas`.

## 6. Decision tree (`decision-trees`)

```jsonc
{
  "id": "sliding-window",
  "title": "Is this a Sliding Window problem?",
  "start": "n1",
  "nodes": {
    "n1": { "type": "question", "text": "Does the problem ask about a contiguous range?",
            "options": [{ "label": "Yes", "next": "n2" }, { "label": "No", "next": "r-other" }] },
    "r-other": { "type": "result", "text": "Probably not Sliding Window.", "detail": "…" }
  }
}
```

## 7. Learning path (`paths`)

```jsonc
{ "id": "java-dsa-beginner", "title": "…", "audience": "…", "description": "…",
  "steps": [{ "ref": "what-is-an-algorithm", "kind": "lesson" }, { "ref": "big-o", "kind": "lesson" }] }
```

## 8. Pattern-recognition bank (`practice/pattern-recognition.json`)

```jsonc
[{ "id": "pr-01", "prompt": "Find the longest substring with at most K distinct characters.",
   "options": ["sliding-window", "binary-search", "dfs", "dp-1d"],
   "answer": "sliding-window",
   "signals": ["substring", "longest", "at most K"],
   "explanation": "…" }]
```

## 9. Validation

`npm run validate:content` (frontend) and `ContentStoreTest` (backend) both check:
ids unique, referenced `practiceProblems` / `related` / `prerequisites` / `decisionTreeId`
exist, every `engine` is registered, every quiz `answerIndex` is in range, every
`architecture.edges` endpoint refers to a declared node.


---

## Interview question sets — `content/interview/<track>/<topic>.json`

The track registry is `content/interview/tracks.json`; each track declares its topics in
teaching order, and each topic is one file whose filename **is** the topic id.

```jsonc
{
  "id": "java-concurrency",      // must equal "<trackId>-<topic>"
  "trackId": "java",
  "topic": "concurrency",        // must equal the filename
  "title": "Concurrency",
  "summary": "one line",
  "questions": [
    {
      "id": "jcc-01",            // unique across the whole library
      "level": "junior | mid | senior",
      "type": "concept | code | scenario | tradeoff | behavioural",
      "question": "…",
      "answer": "markdown — the model answer",
      "codeExample": { "language": "java", "code": ["line", "line"] },   // optional
      "keyPoints": ["what the interviewer is listening for"],
      "followUps": [{ "q": "…", "a": "…" }],
      "redFlags": ["answers that lose marks"],
      "related": ["hashing", "java-jpa-hibernate"]   // lessons, problems, concepts, case studies or other sets
    }
  ]
}
```

The loader denormalises `trackId`, `topic` and `setId` onto every question, because the drill
screen serves a question on its own and would otherwise have no way to say where it came from.

`validate:content` enforces: ids unique library-wide, level and type from the fixed sets, every
question having keyPoints and redFlags, an answer of at least 80 words (a one-line answer is not
an interview answer), every `related` resolving, and every topic declared by exactly one set.

---

## Translations — `content/i18n/`

```
content/i18n/
  languages.json                       # the registry; exactly one entry has "default": true
  <code>/ui.json                       # { "language": "hi", "strings": { "nav.dsa": "…" } }
  <code>/<mirrored path>/<id>.json     # a PARTIAL overlay of one document
```

An overlay mirrors the English document's path and carries **only the translated fields**:

```jsonc
{
  "id": "sliding-window",
  "title": "Sliding Window (स्लाइडिंग विंडो)",
  "summary": "…",
  "analogy": { "beginner": "…", "interview": "…" },
  "intuition": "…"
}
```

Three rules, each load-bearing:

1. **Partial, not a copy.** A full copy per language would drift the moment an English lesson
   gained a field, and nobody would notice until a learner saw a page missing a section.
2. **Objects merge recursively; arrays and scalars replace wholesale.** Merging arrays element
   by element sounds helpful and is a trap — a translator who reorders or half-finishes a list
   would silently produce a page mixing two languages.
3. **Technical vocabulary stays in English.** `array`, `hash map`, `O(n)`. That is how engineers
   in these languages speak, and the code on the same screen is English.

Anything untranslated falls back to English and the response says so via `translation.translated`,
which the UI surfaces as a notice. Adding a language is a `languages.json` entry plus a directory
— no code change.

`validate:content` enforces: the language is registered, the overlay id matches its filename, the
document exists, and **every overlay field exists on the English document** — a typo'd field
would otherwise merge in and never render.
