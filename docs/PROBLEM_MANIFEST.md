# Problem bank manifest

Every problem id in the library, existing and planned. This file exists so that parallel
authors can put each other's ids in `similar` without the build breaking — the id list is
fixed here first, and the files are written against it.

`patternId` must be one of the 33 lesson ids. `difficulty` is `beginner` | `intermediate` |
`advanced`.

---

## Already on disk (63)

```
accounts-merge            alien-dictionary             binary-search-basic
binary-tree-level-order   cheapest-flights-k-stops     climbing-stairs
coin-change               container-with-most-water    contains-duplicate
counting-bits             course-schedule              course-schedule-ii
daily-temperatures        edit-distance                find-duplicate-number
gas-station               group-anagrams               house-robber
implement-trie            insert-interval              jump-game
koko-eating-bananas       kth-largest-element          largest-rectangle-histogram
linked-list-cycle         longest-common-prefix        longest-increasing-subsequence
longest-substring-no-repeat                            max-depth-binary-tree
max-sum-subarray-k        meeting-rooms-ii             merge-intervals
merge-k-sorted-lists      merge-sorted-array           middle-of-linked-list
min-window-substring      n-queens                     network-delay-time
next-greater-element      non-overlapping-intervals    number-of-islands
number-of-provinces       path-with-minimum-effort     permutations
redundant-connection      rotate-image                 rotting-oranges
running-sum               search-rotated-array         set-matrix-zeroes
single-number             sort-colors                  spiral-matrix
subarray-sum-equals-k     subsets                      subsets-bitmask
three-sum                 top-k-frequent                two-sum
two-sum-sorted            unique-paths                 valid-parentheses
word-search-ii
```

---

## To be written (98)

### Batch A — arrays, two pointers, prefix sum

| id | patternId | difficulty |
|---|---|---|
| `best-time-to-buy-sell-stock` | arrays | beginner |
| `product-of-array-except-self` | arrays | intermediate |
| `move-zeroes` | arrays | beginner |
| `rotate-array` | arrays | intermediate |
| `find-missing-number` | arrays | beginner |
| `valid-palindrome` | two-pointers | beginner |
| `remove-duplicates-sorted` | two-pointers | beginner |
| `squares-of-sorted-array` | two-pointers | beginner |
| `trapping-rain-water` | two-pointers | advanced |
| `range-sum-query` | prefix-sum | beginner |
| `pivot-index` | prefix-sum | beginner |
| `contiguous-array` | prefix-sum | intermediate |

### Batch B — linked lists, fast & slow, sorting

| id | patternId | difficulty |
|---|---|---|
| `reverse-linked-list` | linked-list | beginner |
| `merge-two-sorted-lists` | linked-list | beginner |
| `remove-nth-from-end` | linked-list | intermediate |
| `reorder-list` | linked-list | intermediate |
| `add-two-numbers` | linked-list | intermediate |
| `lru-cache` | linked-list | advanced |
| `happy-number` | fast-slow-pointer | beginner |
| `palindrome-linked-list` | fast-slow-pointer | intermediate |
| `largest-number` | sorting | intermediate |
| `sort-list` | sorting | intermediate |
| `h-index` | sorting | intermediate |

### Batch C — trees and recursion

| id | patternId | difficulty |
|---|---|---|
| `invert-binary-tree` | trees | beginner |
| `same-tree` | trees | beginner |
| `binary-tree-inorder-traversal` | trees | beginner |
| `balanced-binary-tree` | trees | beginner |
| `validate-bst` | trees | intermediate |
| `lowest-common-ancestor-bst` | trees | intermediate |
| `diameter-of-binary-tree` | trees | intermediate |
| `kth-smallest-in-bst` | trees | intermediate |
| `serialize-deserialize-tree` | trees | advanced |
| `fibonacci-memo` | recursion | beginner |
| `power-function` | recursion | intermediate |
| `tower-of-hanoi` | recursion | intermediate |

### Batch D — stacks, queues, monotonic stack, hashing

| id | patternId | difficulty |
|---|---|---|
| `min-stack` | stack | beginner |
| `evaluate-rpn` | stack | intermediate |
| `decode-string` | stack | intermediate |
| `asteroid-collision` | stack | intermediate |
| `implement-queue-using-stacks` | queue | beginner |
| `moving-average-stream` | queue | beginner |
| `design-circular-queue` | queue | intermediate |
| `remove-k-digits` | monotonic-stack | intermediate |
| `sum-of-subarray-minimums` | monotonic-stack | advanced |
| `valid-anagram` | hashing | beginner |
| `first-unique-character` | hashing | beginner |
| `longest-consecutive-sequence` | hashing | intermediate |
| `four-sum-count` | hashing | intermediate |

### Batch E — BFS, DFS, graphs

| id | patternId | difficulty |
|---|---|---|
| `word-ladder` | bfs | advanced |
| `open-the-lock` | bfs | intermediate |
| `walls-and-gates` | bfs | intermediate |
| `shortest-path-binary-matrix` | bfs | intermediate |
| `max-area-of-island` | dfs | intermediate |
| `surrounded-regions` | dfs | intermediate |
| `path-sum` | dfs | beginner |
| `pacific-atlantic-water-flow` | dfs | advanced |
| `clone-graph` | graphs | intermediate |
| `graph-valid-tree` | graphs | intermediate |
| `is-graph-bipartite` | graphs | intermediate |
| `min-height-trees` | graphs | advanced |

### Batch F — binary search, sliding window, matrix, bits

| id | patternId | difficulty |
|---|---|---|
| `first-bad-version` | binary-search | beginner |
| `find-min-rotated-array` | binary-search | intermediate |
| `search-2d-matrix` | binary-search | intermediate |
| `median-two-sorted-arrays` | binary-search | advanced |
| `longest-repeating-char-replacement` | sliding-window | intermediate |
| `permutation-in-string` | sliding-window | intermediate |
| `max-consecutive-ones-iii` | sliding-window | intermediate |
| `sliding-window-maximum` | sliding-window | advanced |
| `game-of-life` | matrix | intermediate |
| `diagonal-traverse` | matrix | intermediate |
| `number-of-1-bits` | bit-manipulation | beginner |
| `reverse-bits` | bit-manipulation | beginner |
| `single-number-ii` | bit-manipulation | advanced |

### Batch G — dynamic programming and backtracking

| id | patternId | difficulty |
|---|---|---|
| `min-cost-climbing-stairs` | dynamic-programming-basics | beginner |
| `house-robber-ii` | dynamic-programming-basics | intermediate |
| `decode-ways` | dynamic-programming-basics | intermediate |
| `word-break` | dynamic-programming-basics | intermediate |
| `longest-common-subsequence` | dp-patterns | intermediate |
| `target-sum` | dp-patterns | intermediate |
| `partition-equal-subset-sum` | dp-patterns | advanced |
| `best-time-buy-sell-cooldown` | dp-patterns | advanced |
| `combination-sum` | backtracking | intermediate |
| `word-search` | backtracking | intermediate |
| `letter-combinations-phone` | backtracking | intermediate |
| `palindrome-partitioning` | backtracking | advanced |

### Batch H — heaps, greedy, intervals

| id | patternId | difficulty |
|---|---|---|
| `last-stone-weight` | heap | beginner |
| `k-closest-points` | heap | intermediate |
| `reorganize-string` | heap | intermediate |
| `find-median-from-stream` | heap | advanced |
| `jump-game-ii` | greedy | intermediate |
| `task-scheduler` | greedy | intermediate |
| `partition-labels` | greedy | intermediate |
| `meeting-rooms` | intervals | beginner |
| `minimum-arrows-burst-balloons` | intervals | intermediate |

### Batch I — trie, union-find, topological sort, shortest paths

| id | patternId | difficulty |
|---|---|---|
| `design-add-search-words` | trie | intermediate |
| `longest-word-in-dictionary` | trie | intermediate |
| `number-of-operations-to-connect` | union-find | intermediate |
| `satisfiability-equality-equations` | union-find | intermediate |
| `parallel-courses` | topological-sort | intermediate |
| `sequence-reconstruction` | topological-sort | advanced |
| `path-with-maximum-probability` | shortest-paths | intermediate |
| `swim-in-rising-water` | shortest-paths | advanced |

---

## Final shape

161 problems. Every one of the 33 lessons that should carry problems has at least 2, and every
core interview pattern has 5 or more across all three difficulties.

## Registered visualisation engines

Only these may appear in `visualization.engine`:

```
arrayScanMax memoryBoxes loopTrace growthTable nestedLoopPairs arrayOps hashingOps twoSumHash
prefixSum prefixSumHash slidingWindowFixed slidingWindowVariable slidingWindowShrink
twoPointersOpposite twoPointersPalindrome twoPointersSameDirection binarySearch
binarySearchBoundary binarySearchAnswer linkedListOps linkedListReverse fastSlowPointer stackOps
balancedBrackets queueOps circularQueue treeTraversal bstOps graphRepresentation
connectedComponents graphBfs graphDfs gridBfs gridDfs directedCycle recursionTrace
backtrackingSubsets backtrackingPermutations backtrackingNQueens dp1d dpGrid heapOps topKHeap
trieOps unionFind monotonicStack mergeIntervals mergeSortSteps quickSortSteps bitOps
topologicalSort dijkstra matrixSpiral
```
