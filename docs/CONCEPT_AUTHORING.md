# Authoring a system design concept

This is the contract every file in `content/system-design/concepts/` obeys. It exists because
eighteen concepts written by different hands drift unless the shape is written down.

Read `content/system-design/concepts/cache.json` first. It is the reference implementation of
everything below. Match its depth, its voice and its honesty.

---

## The teaching philosophy these files must serve

Three rules from the project spec govern every field:

1. **§12 — building blocks before systems.** A concept explains one component, on its own, at a
   depth where the learner could defend it in an interview.
2. **§42 — never teach a solution before teaching the problem.** `why.without` comes before
   `why.with`. The reader must feel the pain before they are handed the fix. If a reader could
   skip `why.without` and lose nothing, it is not written hard enough.
3. **§14 — trade-offs are always two-sided.** Every entry in `tradeoffs` carries both `pros` and
   `cons`. "X is better" is a recommendation, not a trade-off, and the content validator fails
   the build on it.

And one rule from the user: **no invented facts.** Every number is one you could defend. If you
do not know a figure, describe the shape of it ("roughly an order of magnitude") rather than
inventing a decimal. Never attribute a practice to a named company's internal systems.

---

## Schema

```jsonc
{
  "id": "consistent-hashing",          // kebab-case, MUST equal the filename stem
  "title": "Consistent Hashing",
  "group": "Performance",              // one of the groups below
  "level": 3,                          // 0 = no prerequisites … 3 = senior
  "estimatedMinutes": 30,              // honest reading + thinking time
  "summary": "…",                      // 1–2 sentences. The idea, and the catch.
  "analogy": "…",                      // A concrete everyday scene. See below.
  "explanation": {
    "beginner": "…",                   // 80–140 words, no jargon that is not defined in place
    "interview": "…"                   // 100–180 words, mechanisms and failure modes by name
  },
  "diagram": { "nodes": [...], "edges": [...] },
  "why": { "without": [...], "with": [...], "conclusion": "…" },
  "whenToUse": [ "…" ],                // 3–5 items
  "whenNotToUse": [ "…" ],             // 3–5 items — this one matters more; see below
  "tradeoffs": [ { "option": "…", "pros": [...], "cons": [...] } ],   // ≥ 2 options
  "keyNumbers": [ { "label": "…", "value": "…" } ],                   // 3–6 items
  "interactive": "some-registered-id", // OPTIONAL — omit unless told otherwise
  "quiz": [ { "id": "q1", "type": "…", "question": "…", "options": [...],
              "answerIndex": 0, "explanation": "…" } ],               // exactly 3
  "related": [ "existing-id", … ]      // 3–5 ids that MUST already exist
}
```

### Field notes that are easy to get wrong

**`analogy`** — a physical scene, not a restatement. The test: it must also carry the *limitation*
of the thing. `cache.json` gets this right — the desk of books also explains staleness, because the
library issued a corrected edition. An analogy that only flatters the concept teaches half of it.

**`explanation.beginner`** — assume someone who can write a for-loop and has never run a server.
Define a term the first time you use it. Concrete over abstract: "the request waits in line" beats
"requests are enqueued for asynchronous processing".

**`explanation.interview`** — assume someone who will be asked "and what breaks?" thirty seconds
after they finish. Name the mechanisms (algorithms, protocols, policies) and name the failure modes.
Formulas where a formula is the clearest thing to say.

**`why.without`** — 2–4 bullets, each a *consequence*, not a description. "The database gets more
load" is weak. "1,000 reads/s becomes 1,000 database queries/s; connection pools exhaust and p99
climbs" is the standard.

**`whenNotToUse`** — the single most valuable field in the file, and the one most often written
lazily. Each item is a real situation where adding this component makes the system worse, not a
hedge. "When you don't need it" is not an entry. "Every key is read roughly once — you pay the
write cost and never get a hit" is.

**`keyNumbers`** — orders of magnitude a candidate should have at hand. Latency figures, ratios,
capacity limits. Label them so they read as approximations, because they are.

**`quiz`** — exactly three questions, ids `q1`,`q2`,`q3`, `type` one of `mcq`, `architecture`,
`float`, `long`. At least one must be a *scenario* rather than a definition ("Your service does X
and Y happens — what is this called and how do you prevent it?"). The `explanation` field is
required and is what makes a wrong answer educational; write it for the person who got it wrong.

**`related`** — ids that already exist. Existing concept ids are:
`api`, `cache`, `cap-theorem`, `cdn`, `client-server`, `database`, `http`, `load-balancer`,
`message-queue`, `rate-limiting`, `replication`, `scaling`, `sharding`.
Existing case studies: `url-shortener`, `rate-limiter`, `chat-application`, `notification-system`.
You may also
reference the other new concepts in this batch, since they will exist by the time the validator
runs. A broken reference fails the build.

### `diagram`

Hand-authored coordinates on a **1000 × 600** canvas, scaled to fit at render time. Keep nodes
roughly 250px apart horizontally and 120px vertically — node boxes are 148 × 62, so anything
closer overlaps.

```jsonc
"nodes": [
  { "id": "client", "label": "Client", "type": "client", "x": 110, "y": 300,
    "note": "One sentence shown when the node is clicked.",
    "why": { "without": [...], "with": [...], "conclusion": "…" }   // OPTIONAL, on the node the concept is ABOUT
  }
],
"edges": [ { "from": "client", "to": "app", "label": "1. request", "dashed": false } ]
```

`type` must be one of the registered styles, or it renders as a grey diamond:
`client`, `dns`, `cdn`, `lb`, `proxy`, `server`, `worker`, `cache`, `db`, `replica`, `queue`,
`storage`, `search`, `monitor`.

4–7 nodes. A diagram with twelve boxes teaches nothing; pick the smallest set that shows the
mechanism. Put the `why` block on the node that *is* the concept.

---

## Groups and levels

| Group | What belongs in it |
|---|---|
| `Foundations` | What the pieces are and how they talk. No prerequisites. |
| `Performance` | Making it faster, and which kind of fast you are buying. |
| `Data` | Where state lives, how many copies, who may be wrong. |
| `Reliability` | Staying up when something breaks. |
| `Security` | Proving who someone is and what they may do. |
| `Architecture` | How services are cut apart, and what that costs. |
| `Distributed` | What changes once machines can lose each other. |

`level`: `0` none, `1` junior, `2` mid, `3` senior. Be honest — a senior topic marked level 1
misleads the learner about what they are ready for.

---

## Before you finish

1. `cd frontend && node scripts/validate-content.mjs` — it must print **OK**.
2. Re-read `whenNotToUse` and every `cons` array. If any of them reads like a disclaimer rather
   than a real cost someone has paid, rewrite it.
3. Check every `related` id against the lists above.

Valid JSON, two-space indent, no trailing commas, no comments in the actual files.
