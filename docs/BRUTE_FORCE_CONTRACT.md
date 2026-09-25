# Making a brute force runnable

Most `bruteForce.code` blocks in the problem bank are **excerpts** — a few bare statements, or a
loop with a helper below it, written to be read rather than run. That is fine on the page and
useless to the verification harness: with nothing to execute, 117 of 165 problems have no
independent implementation to check the optimised solution against, and the strongest correctness
argument the project has covers a fifth of the library.

This document is the contract for turning one into a program.

---

## The one rule that matters more than the rest

**A brute force must stay brute.**

It is extremely tempting, when making a fragment compile, to reach for the optimised approach —
it is right there in the same file, it is shorter, and it works. Do not. If the two
implementations share an algorithm, the differential test compares a thing to itself, passes
forever, and proves **nothing** while looking like proof. That is worse than no test, because
the report then says "agrees with an independent brute force" and the word *independent* is a
lie.

Concretely:

| Problem | The brute force must still be | NOT |
|---|---|---|
| two-sum | the nested loop over every pair | a hash map |
| longest-substring-no-repeat | recheck every substring | a sliding window |
| subarray-sum-equals-k | sum every subarray | prefix sums + a map |
| merge-intervals | repeatedly scan for an overlap and merge | sort, then sweep once |
| kth-largest | sort the whole array | a size-k heap |

If the honest brute force is O(2ⁿ) or O(n³), that is correct and wanted. The harness runs it on
inputs of at most 8 elements precisely so that an exponential reference implementation is
affordable. **Slow is the point.** Never "improve" it.

If there is genuinely no distinct simpler algorithm — the naive approach *is* the optimal one, as
with running-sum or move-zeroes — say so in your report and leave the file alone rather than
inventing an artificially bad version. A contrived brute force is not an independent
implementation either.

---

## What the harness needs

The differential runner pairs the two implementations by reflection. It needs them to match on
**name, parameter types and return type**:

```java
// optimized.code
public static int[] twoSum(int[] nums, int target) { … }

// bruteForce.code — same name, same parameters, same return type
public static int[] twoSum(int[] nums, int target) { … }
```

If the optimised method is called `lowestCommonAncestor` and the brute force is called `lca`, the
runner can still pair them **only** when each block contains exactly one method and the signatures
are identical. Matching names is safer, so prefer that.

Rules:

1. **Start with a declaration.** The block's first real line must be `public static …` (or a field
   like `private static final int[] TABLE = …`). A block that opens with a bare statement is a
   fragment and stays unrunnable.
2. **Self-contained.** Any helper the method needs goes in the same block, as another method. No
   references to variables that only exist in the prose above.
3. **Same shape as the optimised one.** Same name where possible, and identical parameter and
   return types.
4. **Use the given node types** where the problem has them: `TreeNode` (`val`, `left`, `right`),
   `ListNode` (`val`, `next`), `Node` (`val`, `next`, `neighbors`). Do not declare your own.
5. **Do not change `optimized.code`.** Only `bruteForce.code`, and `bruteForce.idea` /
   `bruteForce.complexity` / `bruteForce.whySlow` if your rewrite made them inaccurate.

## What must not change

The brute force is what the reader meets *first*, before the insight gate. It has to stay
readable and honest:

- Keep it the obvious approach a competent person reaches for under pressure.
- Keep the comment that names the wasteful step, if there is one.
- `whySlow` must still describe what this code does. If you changed the approach, fix `whySlow`
  to match — the two must never describe different programs.

---

## Before you finish

1. `cd frontend && node scripts/validate-content.mjs` — must print **OK**.
2. `./tools/verify/run.sh` — your problems should move from `NO_RUNNABLE_BRUTE_FORCE` to
   `AGREE`. A `DISAGREE` means one of the two is wrong; find out which before touching either.
3. Read your brute force beside the optimised solution. If they use the same algorithm, start
   again.
