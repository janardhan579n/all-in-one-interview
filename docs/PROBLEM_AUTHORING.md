# Authoring a practice problem

The contract for every file in `content/dsa/problems/`. Read
`content/dsa/problems/two-sum.json` first — it is the reference implementation of everything
below, and the depth you are matching.

---

## The one rule everything else serves

**§42 — never teach a solution before teaching the problem.** A problem file is not a solution
write-up. It is a guided discovery, in this order:

1. the problem, and where it shows up in real work (`statement`, `realWorld`)
2. the approach a competent person reaches for first (`bruteForce.idea`, `bruteForce.code`)
3. **why that is too slow** — not "it's O(n²)" but what the wasted work actually is
   (`bruteForce.whySlow`)
4. the observation that unlocks the better answer (`patternIdentification`)
5. only then, the optimised solution (`optimized`)

If a reader could skip straight to `optimized` and lose nothing, the file has failed. The three
fields that carry the teaching are `whySlow`, `patternIdentification` and `commonMistakes`;
everything else is scaffolding. Write those three first.

---

## Schema

```jsonc
{
  "id": "two-sum",                  // kebab-case, MUST equal the filename stem
  "title": "Two Sum",
  "patternId": "hashing",           // MUST be an existing lesson id — see the manifest
  "difficulty": "beginner",         // beginner | intermediate | advanced
  "tags": ["array", "hashing"],
  "statement": "…",                 // self-contained; a reader needs nothing else to start
  "realWorld": "…",                 // where this shape actually appears in production work
  "examples": [                     // 2–3, at least one non-obvious
    { "input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "…" }
  ],
  "constraints": ["2 <= nums.length <= 10^4", "…"],
  "bruteForce": {
    "idea": "…",
    "code": ["line", "line"],       // Java, array of lines, no trailing semicolonless fragments
    "complexity": { "time": "O(n^2)", "space": "O(1)" },
    "whySlow": "…"                  // THE IMPORTANT ONE — see below
  },
  "patternIdentification": "…",     // the signal that tells you which pattern applies
  "optimized": {
    "idea": "…",
    "code": ["…"],                  // complete, compilable Java method
    "complexity": { "time": "O(n)", "space": "O(n)" }
  },
  "visualization": {                // OPTIONAL — omit unless an engine genuinely fits
    "engine": "twoSumHash",         // MUST be registered in visualizers/registry.ts
    "input": { "array": [2,7,11,15,3], "target": 18 },
    "code": ["…"]                   // the lines the player highlights, array of strings
  },
  "commonMistakes": ["…"],          // 3, each a specific bug with its symptom
  "similar": ["two-sum-sorted", "three-sum"]   // 3–5 ids from the manifest
}
```

### `whySlow` — the field that does the work

Not a complexity class. The *wasted work*, named.

- Weak: "It's O(n²), which is too slow for n = 10⁴."
- Right: "n(n−1)/2 pairs. The inner loop exists only to ask 'is target − nums[i] present?',
  which is a lookup dressed up as a search."

The reader should finish this sentence thinking "…so I should be able to avoid that", which is
exactly the state of mind `patternIdentification` then resolves.

### `patternIdentification`

The transferable signal, not the answer to this problem. "Any time you can name exactly what you
are looking for, use a hash map instead of scanning for it" transfers; "use a HashMap here"
does not. A reader who has read fifty of these should be able to classify a problem they have
never seen, and that only happens if this field is written about the *shape*.

### `commonMistakes`

Exactly three. Each names a specific bug **and the symptom it produces**, so the reader
recognises it when it happens to them.

- Weak: "Off-by-one errors in the loop bounds."
- Right: "Putting the current value in the map before checking for its complement — target 6
  with a single 3 then wrongly returns [0,0]."

Prefer the mistakes that pass the sample input and fail on an edge case, since those are the
ones that cost people interviews: empty input, one element, all-equal elements, integer
overflow, duplicate values, the answer being the whole array.

### `realWorld`

A concrete engineering situation, not a metaphor. "Reconciling payments: given a list of
transaction amounts and an expected total, find the two that make it up" is right. "Like
finding a matching sock" is not. If you cannot think of one honestly, write the algorithmic
context where the technique appears (a database query planner, a scheduler, a rate limiter) —
but never invent a company's internal practice.

### `code`

Java, as an array of lines, indented with 4 spaces. `optimized.code` must be a complete method
someone could paste into a class and call. Comment the line that carries the insight, and only
that line — a file where every line is commented teaches nothing about which one matters.

### `visualization`

Optional, and a wrong one is worse than none. Include it only when a registered engine actually
animates *this* problem's mechanism; otherwise omit the field. The engine's `input` keys must be
what that engine reads (open `frontend/src/visualizers/engines/` and check — the engines take
things like `array`, `target`, `k`, `grid`, `edges`, `values`). Roughly two thirds of problems
carry one; that is the right proportion.

### `similar`

3–5 ids that exist in `docs/PROBLEM_MANIFEST.md` — either already on disk or being written in
the same batch. A broken reference fails the build. Prefer links that teach: the same pattern at
a harder difficulty, or the same-looking problem that needs a *different* pattern.

---

## Before you finish

1. `cd frontend && node scripts/validate-content.mjs` — must print **OK**.
2. Re-read every `whySlow`. If one states a complexity instead of naming the waste, rewrite it.
3. Check your `optimized.code` actually solves the stated problem, including the edge cases in
   your own `commonMistakes`. Trace it once by hand on example 2.

Valid JSON, two-space indent, no comments in the actual files.
