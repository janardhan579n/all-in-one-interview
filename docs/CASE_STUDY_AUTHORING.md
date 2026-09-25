# Authoring a case study

The contract for every file in `content/system-design/case-studies/`. Read
`content/system-design/case-studies/url-shortener.json` first — it is the reference
implementation, and the depth you are matching.

A concept page teaches one component. A case study is the other half: it is the interview
itself, walked through from "design X" to a defensible architecture, with the reasoning left in.

---

## The rule that makes a case study different

**§16 / §44: the architecture must EVOLVE, and every stage must be forced by something that
broke.**

A case study does not present a finished diagram. It starts at one server and grows, one stage
at a time, and each stage names the specific thing that failed at the previous scale. That is
the single most valuable thing this format does, because it is exactly what an interviewer is
listening for: not "I would use Kafka" but "at this point writes started blocking reads, which
is why I would decouple them".

A stage that reads "now we add caching because caching is good" has failed. The `problem` field
is where the previous stage died, the `change` is the smallest thing that fixes it, and the
`why` is the argument you would make out loud.

Five stages is the right shape: one server → availability → read scaling → write scaling →
the thing that is specific to *this* problem.

---

## Schema

```jsonc
{
  "id": "news-feed",                  // kebab-case, MUST equal the filename stem
  "title": "Design a News Feed",
  "difficulty": "advanced",           // beginner | intermediate | advanced
  "estimatedMinutes": 45,
  "summary": "…",                     // 1–2 sentences: the system, and the hard part
  "steps": [ { "key": "…", "title": "1. …", "content": "markdown" } ],
  "estimation": {
    "assumptions": [ "…" ],           // 4–6, each a number you would actually state
    "calculations": [ { "label": "…", "value": "…", "working": "…" } ]   // 5–8
  },
  "api": [ { "method": "POST", "path": "/…", "request": "…", "response": "…", "notes": "…" } ],
  "dataModel": [ { "name": "…", "fields": [ { "name": "…", "type": "…", "notes": "…" } ],
                   "indexes": [ "…" ] } ],
  "evolution": [ { "stage": "Stage 1 — …", "problem": "…", "change": "…", "why": "…",
                   "architecture": { "nodes": [...], "edges": [...] } } ],
  "tradeoffs": [ { "option": "…", "pros": [...], "cons": [...] } ],     // ≥ 3, both sides
  "interviewStages": [ { "key": "…", "prompt": "…", "hints": [...], "modelAnswer": [...] } ],
  "quiz": [ { "id": "q1", "type": "…", "question": "…", "options": [...],
              "answerIndex": 0, "explanation": "…" } ],
  "related": [ "existing-concept-id", … ]
}
```

### `steps` — the walkthrough

12–15 steps, each with a `key` (kebab-case, unique), a numbered `title`, and markdown `content`.
Follow the reference's spine, adapting the middle to the problem:

`requirements` → `functional` → `nonfunctional` → `estimation` → `api` → `datamodel` →
*(2–4 steps specific to this problem)* → `architecture` → `scaling` → `failure` → `tradeoffs` →
`final`

The problem-specific steps are the heart of it. For a news feed that is fan-out on write versus
read and the celebrity problem; for a ride-sharing system it is geospatial indexing and matching;
for autocomplete it is the trie and the ranking. Do not pad the generic steps to avoid writing
the hard ones.

### `estimation` — numbers you could defend

`assumptions` are the figures you would say out loud and the interviewer would accept: daily
active users, posts per user per day, read:write ratio, average payload size, retention.
`calculations` derive from them and **show the working**, because the arithmetic is the point —
an interviewer is checking whether you can turn "500M DAU" into "roughly 6,000 writes/second"
without a calculator. Round aggressively and say you are rounding.

Never invent a real company's actual numbers. These are plausible figures for a system of this
shape, and the text should read that way.

### `evolution` — see the rule above

Architecture diagrams are hand-authored coordinates on a **1000 × 600** canvas. Node boxes are
148 × 62, so keep nodes ≥ 250px apart horizontally and ≥ 120px vertically. 4–8 nodes per stage;
a stage with fourteen boxes teaches nothing.

`type` must be one of the registered styles, or the node renders as a grey diamond:
`client`, `dns`, `cdn`, `lb`, `proxy`, `server`, `worker`, `cache`, `db`, `replica`, `queue`,
`storage`, `search`, `monitor`.

A node may carry `note` (one sentence shown on click) and `why` (`{without, with, conclusion}`)
— put `why` on the component that stage exists to introduce.

### `interviewStages` — the simulator

5–7 stages. Each is a question an interviewer actually asks (`prompt`), two or three `hints`
that are nudges rather than answers, and a `modelAnswer` as an array of bullet points — what a
strong candidate covers, not a script to recite.

### `tradeoffs`

At least three options, each with both `pros` and `cons`. §14 — one-sided is a recommendation,
not a trade-off, and the content validator fails the build on it.

### `related`

Concept ids that already exist. The full list:
`api`, `api-gateway`, `auth`, `bloom-filter`, `cache`, `cap-theorem`, `cdn`, `client-server`,
`connection-pooling`, `consensus`, `consistent-hashing`, `database`, `dns`, `event-driven`,
`http`, `idempotency`, `indexing`, `load-balancer`, `message-queue`, `microservices`,
`object-storage`, `observability`, `proxy`, `rate-limiting`, `replication`, `saga`, `scaling`,
`search-engine`, `sharding`, `websockets`, `circuit-breaker`.

Existing case studies: `url-shortener`, `rate-limiter`, `chat-application`, `notification-system`.

### `interactive`

Omit it. Only include one if you are told a specific registered widget id to use — an
unregistered id fails the build.

---

## Before you finish

1. `cd frontend && node scripts/validate-content.mjs` — must print **OK**.
2. Re-read every `evolution[].problem`. If one does not name something that actually broke at
   the previous scale, the stage is decoration.
3. Re-read every `cons` array. If one reads like a disclaimer rather than a cost someone paid,
   rewrite it.
4. Check the estimation arithmetic. Actually multiply it out.

Valid JSON, two-space indent, no comments in the real files.
