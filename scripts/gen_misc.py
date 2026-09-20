"""Pattern map, decision trees, learning paths, pattern-recognition bank. Run: python3 scripts/gen_misc.py"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "content"
(ROOT / "decision-trees").mkdir(parents=True, exist_ok=True)
(ROOT / "paths").mkdir(parents=True, exist_ok=True)
(ROOT / "practice").mkdir(parents=True, exist_ok=True)

def write(path, obj):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

# ---------------------------------------------------------------- pattern map
write(ROOT / "dsa" / "pattern-map.json", {
  "id": "dsa-pattern-map",
  "title": "The DSA Pattern Map",
  "description": "Click any node to open its lesson. Patterns are grouped by the structure they operate on; the colour of a node shows your progress.",
  "root": {
    "id": "dsa", "label": "DSA", "kind": "root",
    "children": [
      {"id": "g-foundations", "label": "Foundations", "kind": "group", "children": [
        {"id": "what-is-an-algorithm", "label": "What Is an Algorithm?", "kind": "lesson"},
        {"id": "data-and-variables", "label": "Data & Memory", "kind": "lesson"},
        {"id": "loops-and-functions", "label": "Loops & Functions", "kind": "lesson"},
        {"id": "big-o", "label": "Big-O", "kind": "lesson"},
        {"id": "recursion", "label": "Recursion", "kind": "lesson"}
      ]},
      {"id": "g-arrays", "label": "Arrays & Strings", "kind": "group", "children": [
        {"id": "arrays", "label": "Arrays", "kind": "lesson"},
        {"id": "hashing", "label": "Hashing", "kind": "lesson"},
        {"id": "two-pointers", "label": "Two Pointers", "kind": "pattern"},
        {"id": "sliding-window", "label": "Sliding Window", "kind": "pattern"},
        {"id": "prefix-sum", "label": "Prefix Sum", "kind": "pattern"}
      ]},
      {"id": "g-search", "label": "Binary Search", "kind": "group", "children": [
        {"id": "binary-search", "label": "Binary Search", "kind": "pattern"}
      ]},
      {"id": "g-list", "label": "Linked List", "kind": "group", "children": [
        {"id": "linked-list", "label": "Linked List", "kind": "lesson"},
        {"id": "fast-slow-pointer", "label": "Fast & Slow Pointer", "kind": "pattern"}
      ]},
      {"id": "g-stackqueue", "label": "Stack & Queue", "kind": "group", "children": [
        {"id": "stack", "label": "Stack", "kind": "lesson"},
        {"id": "queue", "label": "Queue", "kind": "lesson"}
      ]},
      {"id": "g-trees", "label": "Trees", "kind": "group", "children": [
        {"id": "trees", "label": "Trees & BST", "kind": "lesson"}
      ]},
      {"id": "g-graphs", "label": "Graphs", "kind": "group", "children": [
        {"id": "graphs", "label": "Graph Basics", "kind": "lesson"},
        {"id": "bfs", "label": "BFS", "kind": "pattern"},
        {"id": "dfs", "label": "DFS", "kind": "pattern"}
      ]},
      {"id": "g-recursion", "label": "Recursion & Backtracking", "kind": "group", "children": [
        {"id": "backtracking", "label": "Backtracking", "kind": "pattern"}
      ]},
      {"id": "g-dp", "label": "Dynamic Programming", "kind": "group", "children": [
        {"id": "dynamic-programming-basics", "label": "DP Basics", "kind": "pattern"}
      ]}
    ]
  }
})

# ------------------------------------------------------------- decision trees
trees = [
{
  "id": "sliding-window",
  "title": "Is this a Sliding Window problem?",
  "start": "n1",
  "nodes": {
    "n1": {"type": "question", "text": "Does the problem involve a **contiguous** subarray or substring (elements must be adjacent)?",
           "options": [{"label": "Yes", "next": "n2"}, {"label": "No — elements can be skipped", "next": "r-dp"}]},
    "n2": {"type": "question", "text": "Are you asked for a longest / shortest / maximum / minimum over that range, or a count of qualifying ranges?",
           "options": [{"label": "Yes", "next": "n3"}, {"label": "No, I need arbitrary range sums repeatedly", "next": "r-prefix"}]},
    "n3": {"type": "question", "text": "Is the window size fixed and given (e.g. 'of size k')?",
           "options": [{"label": "Yes, fixed size k", "next": "r-fixed"}, {"label": "No, it depends on a condition", "next": "n4"}]},
    "n4": {"type": "question", "text": "Can the array contain **negative** numbers while the condition is about sums?",
           "options": [{"label": "Yes, negatives are possible", "next": "r-prefix-hash"}, {"label": "No, all values are non-negative", "next": "r-variable"}]},
    "r-fixed": {"type": "result", "text": "Fixed-size Sliding Window", "detail": "Add the entering element, and once the window is k wide, record the answer and remove the leaving element at index right-k+1. O(n) time, O(1) space.", "lessonId": "sliding-window"},
    "r-variable": {"type": "result", "text": "Variable-size Sliding Window", "detail": "Grow with `right`; while the window is invalid, shrink from `left`. Record after shrinking for 'longest', inside the shrink loop for 'shortest'.", "lessonId": "sliding-window"},
    "r-prefix-hash": {"type": "result", "text": "Prefix Sum + HashMap — NOT a sliding window", "detail": "With negatives, growing the window can decrease the sum, so shrinking on invalidity is unsound. Use prefix sums and look up `running - k` in a map.", "lessonId": "prefix-sum"},
    "r-prefix": {"type": "result", "text": "Prefix Sum", "detail": "Precompute cumulative totals once; every range query becomes a single subtraction.", "lessonId": "prefix-sum"},
    "r-dp": {"type": "result", "text": "Probably Dynamic Programming", "detail": "A subsequence (non-contiguous) has no window to slide. Think about a state defined by position and choice.", "lessonId": "dynamic-programming-basics"}
  }
},
{
  "id": "two-pointers",
  "title": "Is this a Two Pointers problem?",
  "start": "n1",
  "nodes": {
    "n1": {"type": "question", "text": "Are you looking for a pair, triplet, or a relationship between two positions in a sequence?",
           "options": [{"label": "Yes", "next": "n2"}, {"label": "No, I am modifying the array in place", "next": "n4"}]},
    "n2": {"type": "question", "text": "Is the input sorted, or may you sort it (the answer does not depend on original indices)?",
           "options": [{"label": "Yes", "next": "r-opposite"}, {"label": "No — I must return original indices", "next": "r-hash"}]},
    "n4": {"type": "question", "text": "Do you need O(1) extra space while removing, partitioning or compacting elements?",
           "options": [{"label": "Yes", "next": "r-same"}, {"label": "No", "next": "r-other"}]},
    "r-opposite": {"type": "result", "text": "Opposite-end (converging) Two Pointers", "detail": "left = 0, right = n-1. Move the pointer that can improve the situation, and be able to say why the discarded element cannot be part of any answer.", "lessonId": "two-pointers"},
    "r-same": {"type": "result", "text": "Same-direction (read/write) Two Pointers", "detail": "`fast` reads every element; `slow` marks where the next kept element goes. In-place, O(1) space.", "lessonId": "two-pointers"},
    "r-hash": {"type": "result", "text": "HashMap, not Two Pointers", "detail": "Sorting destroys the original indices. A map of value → index gives O(n) time for O(n) space.", "lessonId": "hashing"},
    "r-other": {"type": "result", "text": "Probably something else", "detail": "Without an ordering or monotonic property, nothing justifies a pointer move. Reconsider hashing, sorting, or a sliding window.", "lessonId": "hashing"}
  }
},
{
  "id": "binary-search",
  "title": "Can I binary search this?",
  "start": "n1",
  "nodes": {
    "n1": {"type": "question", "text": "Is there an ordered search space — a sorted array, or a range of candidate answers?",
           "options": [{"label": "Yes", "next": "n2"}, {"label": "No", "next": "r-no"}]},
    "n2": {"type": "question", "text": "Is there a yes/no test that, once it flips, never flips back (a monotonic predicate)?",
           "options": [{"label": "Yes", "next": "n3"}, {"label": "No", "next": "r-no"}]},
    "n3": {"type": "question", "text": "Are you searching an array for a value, or searching a range of possible answers?",
           "options": [{"label": "An array", "next": "n4"}, {"label": "A range of answers ('minimum X such that…')", "next": "r-answer"}]},
    "n4": {"type": "question", "text": "Do you need an exact match, or the first/last position satisfying a condition?",
           "options": [{"label": "Exact match", "next": "r-exact"}, {"label": "A boundary", "next": "r-boundary"}]},
    "r-exact": {"type": "result", "text": "Classic binary search", "detail": "while (low <= high) with low = mid+1 / high = mid-1. Use the overflow-safe midpoint.", "lessonId": "binary-search"},
    "r-boundary": {"type": "result", "text": "Lower/upper bound binary search", "detail": "while (low < high) with high = mid (keep mid — it may be the boundary) and low = mid+1. `low` is the answer on exit.", "lessonId": "binary-search"},
    "r-answer": {"type": "result", "text": "Binary search on the answer", "detail": "Binary search the candidate range; each probe runs a feasibility check. Total O(n log range). Watch for overflow in the feasibility function.", "lessonId": "binary-search"},
    "r-no": {"type": "result", "text": "Binary search does not apply", "detail": "Without monotonicity, halving can discard the answer. Consider hashing, a linear scan, or sorting first if you will search many times.", "lessonId": "big-o"}
  }
},
{
  "id": "which-data-structure",
  "title": "Which data structure should I use?",
  "start": "n1",
  "nodes": {
    "n1": {"type": "question", "text": "How will you look things up?",
           "options": [{"label": "By position / index", "next": "n2"}, {"label": "By key or value", "next": "n3"}, {"label": "By order — smallest, largest, next", "next": "n4"}, {"label": "By relationship to other items", "next": "r-graph"}]},
    "n2": {"type": "question", "text": "Do you insert or remove in the middle frequently?",
           "options": [{"label": "No, mostly at the end or read-only", "next": "r-array"}, {"label": "Yes, and I already hold the position", "next": "r-list"}]},
    "n3": {"type": "question", "text": "Do you also need the keys in sorted order or range queries?",
           "options": [{"label": "No, exact lookups only", "next": "r-hash"}, {"label": "Yes", "next": "r-tree"}]},
    "n4": {"type": "question", "text": "Which end do you need?",
           "options": [{"label": "Most recently added (LIFO)", "next": "r-stack"}, {"label": "Longest waiting (FIFO)", "next": "r-queue"}, {"label": "Highest or lowest priority", "next": "r-heap"}]},
    "r-array": {"type": "result", "text": "Array / ArrayList", "detail": "O(1) access by index, excellent cache locality. O(n) to insert in the middle.", "lessonId": "arrays"},
    "r-list": {"type": "result", "text": "Linked List (or ArrayDeque)", "detail": "O(1) insert/delete given the node. But measure — ArrayList frequently wins in practice due to cache locality.", "lessonId": "linked-list"},
    "r-hash": {"type": "result", "text": "HashMap / HashSet", "detail": "O(1) average lookup, insert and delete. No ordering guarantees.", "lessonId": "hashing"},
    "r-tree": {"type": "result", "text": "TreeMap / TreeSet (balanced BST)", "detail": "O(log n) operations, sorted iteration, floor/ceiling and range views.", "lessonId": "trees"},
    "r-stack": {"type": "result", "text": "Stack (ArrayDeque)", "detail": "Matching, nesting, undo, iterative DFS, monotonic-stack problems.", "lessonId": "stack"},
    "r-queue": {"type": "result", "text": "Queue (ArrayDeque)", "detail": "Fair processing, buffering, and BFS.", "lessonId": "queue"},
    "r-heap": {"type": "result", "text": "PriorityQueue (binary heap)", "detail": "O(log n) insert and extract-min. Top-K problems, Dijkstra, merging sorted streams.", "lessonId": "queue"},
    "r-graph": {"type": "result", "text": "Graph (adjacency list)", "detail": "Map<Node, List<Node>>. Traverse with BFS for shortest paths, DFS for reachability, ordering and cycles.", "lessonId": "graphs"}
  }
},
{
  "id": "graph-algorithm",
  "title": "Which graph algorithm?",
  "start": "n1",
  "nodes": {
    "n1": {"type": "question", "text": "What are you actually asking of the graph?",
           "options": [{"label": "Shortest path", "next": "n2"}, {"label": "Is it reachable / how many groups", "next": "r-dfs"}, {"label": "A valid ordering of dependencies", "next": "r-topo"}, {"label": "All paths satisfying a constraint", "next": "r-backtrack"}]},
    "n2": {"type": "question", "text": "Do the edges have different weights?",
           "options": [{"label": "No — every edge costs the same", "next": "r-bfs"}, {"label": "Yes, non-negative weights", "next": "r-dijkstra"}, {"label": "Yes, and some are negative", "next": "r-bellman"}]},
    "r-bfs": {"type": "result", "text": "BFS", "detail": "FIFO queue guarantees the first time you reach a node is by the fewest edges. O(V+E).", "lessonId": "bfs"},
    "r-dijkstra": {"type": "result", "text": "Dijkstra", "detail": "BFS with a priority queue ordered by cumulative cost. O((V+E) log V). Requires non-negative weights.", "lessonId": "bfs"},
    "r-bellman": {"type": "result", "text": "Bellman-Ford", "detail": "Relax every edge V-1 times; O(V·E). Handles negative weights and detects negative cycles.", "lessonId": "graphs"},
    "r-dfs": {"type": "result", "text": "DFS (or BFS)", "detail": "Either works for reachability. Start a fresh traversal from each unvisited node; the number of starts is the number of components.", "lessonId": "dfs"},
    "r-topo": {"type": "result", "text": "Topological sort", "detail": "Kahn's algorithm with in-degrees, or DFS recording nodes as they finish and reversing. Both detect cycles, which mean no valid ordering exists.", "lessonId": "dfs"},
    "r-backtrack": {"type": "result", "text": "DFS with backtracking", "detail": "Explore, record, undo. Prune as early as possible — enumeration without pruning is exponential.", "lessonId": "backtracking"}
  }
},
{
  "id": "dp-or-not",
  "title": "Is this Dynamic Programming?",
  "start": "n1",
  "nodes": {
    "n1": {"type": "question", "text": "Are you asked for a count, a maximum/minimum, or whether something is achievable — rather than for the items themselves?",
           "options": [{"label": "Yes", "next": "n2"}, {"label": "No, I must list every solution", "next": "r-backtrack"}]},
    "n2": {"type": "question", "text": "Can you express the answer in terms of the answer to a smaller version of the same problem?",
           "options": [{"label": "Yes", "next": "n3"}, {"label": "No", "next": "r-other"}]},
    "n3": {"type": "question", "text": "Does the naive recursion solve the same subproblem repeatedly?",
           "options": [{"label": "Yes", "next": "n4"}, {"label": "No, each subproblem is distinct", "next": "r-divide"}]},
    "n4": {"type": "question", "text": "Is there a locally optimal choice you can PROVE is globally optimal?",
           "options": [{"label": "Yes, and I can prove it", "next": "r-greedy"}, {"label": "No", "next": "r-dp"}]},
    "r-dp": {"type": "result", "text": "Dynamic Programming", "detail": "Write the recursion, add memoisation, then convert to a table if useful. Define the state in words first: 'dp[i] = …'.", "lessonId": "dynamic-programming-basics"},
    "r-greedy": {"type": "result", "text": "Greedy — but prove it", "detail": "Greedy is faster and simpler when it is correct. Coin change with [1,3,4] and amount 6 is the standard counterexample for unproven greed.", "lessonId": "dynamic-programming-basics"},
    "r-backtrack": {"type": "result", "text": "Backtracking", "detail": "Enumerating all solutions is exponential by nature, because the output is. Prune aggressively.", "lessonId": "backtracking"},
    "r-divide": {"type": "result", "text": "Divide and conquer", "detail": "Non-overlapping subproblems need no memo — merge sort and binary search are the archetypes.", "lessonId": "recursion"},
    "r-other": {"type": "result", "text": "Look for another pattern", "detail": "Re-read the problem for contiguity (sliding window), ordering (two pointers, binary search) or lookups (hashing).", "lessonId": "big-o"}
  }
},
{
  "id": "complexity-budget",
  "title": "What complexity do the constraints allow?",
  "start": "n1",
  "nodes": {
    "n1": {"type": "question", "text": "What is the maximum input size n in the constraints?",
           "options": [{"label": "n ≤ 20", "next": "r-exp"}, {"label": "n ≤ 5,000", "next": "r-quad"}, {"label": "n ≤ 10^5 or 10^6", "next": "r-nlogn"}, {"label": "n ≥ 10^7", "next": "r-linear"}]},
    "r-exp": {"type": "result", "text": "Exponential is intended — O(2ⁿ) or O(n!)", "detail": "A tiny n is a deliberate signal: backtracking, subsets, permutations or bitmask DP.", "lessonId": "backtracking"},
    "r-quad": {"type": "result", "text": "O(n²) is fine", "detail": "25 million operations runs comfortably. Nested loops, 2-D DP, or an anchor loop wrapping two pointers.", "lessonId": "big-o"},
    "r-nlogn": {"type": "result", "text": "O(n log n) or O(n)", "detail": "O(n²) would be 10^10 operations and will time out. Sort, use a heap, binary search, or find a single-pass approach.", "lessonId": "big-o"},
    "r-linear": {"type": "result", "text": "O(n) or better, and watch memory", "detail": "At this size even the input may not fit comfortably. Think single pass, streaming, or O(1)-space tricks.", "lessonId": "big-o"}
  }
}
]
for t in trees:
    write(ROOT / "decision-trees" / (t["id"] + ".json"), t)

# ------------------------------------------------------------- learning paths
paths = [
{
  "id": "java-dsa-beginner",
  "title": "Java + DSA for Complete Beginners",
  "audience": "You have never written code, or you write code but have never studied algorithms.",
  "description": "Starts from 'what is an algorithm' and ends with you recognising patterns in unseen problems. Roughly 8-10 hours of lessons plus practice.",
  "steps": [
    {"ref": "what-is-an-algorithm", "kind": "lesson"},
    {"ref": "data-and-variables", "kind": "lesson"},
    {"ref": "loops-and-functions", "kind": "lesson"},
    {"ref": "big-o", "kind": "lesson"},
    {"ref": "arrays", "kind": "lesson"},
    {"ref": "hashing", "kind": "lesson"},
    {"ref": "two-sum", "kind": "problem"},
    {"ref": "two-pointers", "kind": "lesson"},
    {"ref": "sliding-window", "kind": "lesson"},
    {"ref": "max-sum-subarray-k", "kind": "problem"},
    {"ref": "prefix-sum", "kind": "lesson"},
    {"ref": "binary-search", "kind": "lesson"},
    {"ref": "binary-search-basic", "kind": "problem"},
    {"ref": "stack", "kind": "lesson"},
    {"ref": "queue", "kind": "lesson"},
    {"ref": "valid-parentheses", "kind": "problem"},
    {"ref": "linked-list", "kind": "lesson"},
    {"ref": "fast-slow-pointer", "kind": "lesson"},
    {"ref": "recursion", "kind": "lesson"},
    {"ref": "trees", "kind": "lesson"},
    {"ref": "max-depth-binary-tree", "kind": "problem"},
    {"ref": "graphs", "kind": "lesson"},
    {"ref": "bfs", "kind": "lesson"},
    {"ref": "dfs", "kind": "lesson"},
    {"ref": "number-of-islands", "kind": "problem"},
    {"ref": "backtracking", "kind": "lesson"},
    {"ref": "dynamic-programming-basics", "kind": "lesson"},
    {"ref": "climbing-stairs", "kind": "problem"}
  ]
},
{
  "id": "system-design-beginner",
  "title": "System Design from First Principles",
  "audience": "Backend developers who can build a service but have never designed one for scale.",
  "description": "Builds the vocabulary component by component, then applies it to complete systems. Every concept answers 'what problem forced this to exist?'.",
  "steps": [
    {"ref": "client-server", "kind": "concept"},
    {"ref": "http", "kind": "concept"},
    {"ref": "api", "kind": "concept"},
    {"ref": "database", "kind": "concept"},
    {"ref": "scaling", "kind": "concept"},
    {"ref": "load-balancer", "kind": "concept"},
    {"ref": "cache", "kind": "concept"},
    {"ref": "cdn", "kind": "concept"},
    {"ref": "replication", "kind": "concept"},
    {"ref": "message-queue", "kind": "concept"},
    {"ref": "rate-limiting", "kind": "concept"},
    {"ref": "sharding", "kind": "concept"},
    {"ref": "cap-theorem", "kind": "concept"},
    {"ref": "url-shortener", "kind": "case-study"},
    {"ref": "rate-limiter", "kind": "case-study"},
    {"ref": "notification-system", "kind": "case-study"},
    {"ref": "chat-application", "kind": "case-study"}
  ]
},
{
  "id": "interview-crash-course",
  "title": "Interview Crash Course",
  "audience": "You know the fundamentals and have an interview in two weeks.",
  "description": "Pattern recognition first, then one representative problem per pattern, then two system designs. Optimised for breadth of recognition rather than depth of any one topic.",
  "steps": [
    {"ref": "big-o", "kind": "lesson"},
    {"ref": "hashing", "kind": "lesson"},
    {"ref": "two-pointers", "kind": "lesson"},
    {"ref": "sliding-window", "kind": "lesson"},
    {"ref": "binary-search", "kind": "lesson"},
    {"ref": "longest-substring-no-repeat", "kind": "problem"},
    {"ref": "three-sum", "kind": "problem"},
    {"ref": "koko-eating-bananas", "kind": "problem"},
    {"ref": "bfs", "kind": "lesson"},
    {"ref": "dfs", "kind": "lesson"},
    {"ref": "course-schedule", "kind": "problem"},
    {"ref": "dynamic-programming-basics", "kind": "lesson"},
    {"ref": "coin-change", "kind": "problem"},
    {"ref": "backtracking", "kind": "lesson"},
    {"ref": "url-shortener", "kind": "case-study"},
    {"ref": "rate-limiter", "kind": "case-study"}
  ]
}
]
for p in paths:
    write(ROOT / "paths" / (p["id"] + ".json"), p)

# --------------------------------------------------- pattern recognition bank
bank = [
 {"id": "pr-01", "prompt": "Find the longest substring containing at most K distinct characters.",
  "options": ["sliding-window", "binary-search", "dfs", "dynamic-programming-basics"], "answer": "sliding-window",
  "signals": ["substring (contiguous)", "longest", "a constraint that can be violated then repaired"],
  "explanation": "Contiguity plus an optimum plus a repairable constraint is the variable-size sliding window. Keep a frequency map inside the window and shrink while it has too many distinct keys."},
 {"id": "pr-02", "prompt": "Given a sorted array, find two numbers adding to a target using O(1) extra space.",
  "options": ["two-pointers", "hashing", "sliding-window", "binary-search"], "answer": "two-pointers",
  "signals": ["sorted input", "a pair", "O(1) space required"],
  "explanation": "Sorted plus a pair suggests converging pointers; the O(1) space requirement rules out the HashMap solution explicitly."},
 {"id": "pr-03", "prompt": "Given an unsorted array, return the indices of two numbers adding to a target.",
  "options": ["hashing", "two-pointers", "binary-search", "sliding-window"], "answer": "hashing",
  "signals": ["unsorted", "original indices required", "complement is computable"],
  "explanation": "Sorting would destroy the indices. A map from value to index answers 'have I seen target - x?' in O(1)."},
 {"id": "pr-04", "prompt": "Determine whether a linked list has a cycle using constant extra space.",
  "options": ["fast-slow-pointer", "hashing", "dfs", "two-pointers"], "answer": "fast-slow-pointer",
  "signals": ["linked list", "cycle", "O(1) space"],
  "explanation": "A HashSet solves it in O(n) space. The constant-space constraint points directly at Floyd's tortoise and hare."},
 {"id": "pr-05", "prompt": "Find the minimum eating speed so that all banana piles are finished within h hours.",
  "options": ["binary-search", "dynamic-programming-basics", "sliding-window", "backtracking"], "answer": "binary-search",
  "signals": ["minimum X such that a condition holds", "feasibility is monotonic in X"],
  "explanation": "No sorted array appears anywhere. The search space is the range of speeds, and canFinish(speed) flips from false to true exactly once."},
 {"id": "pr-06", "prompt": "Count the subarrays summing to k, where the array may contain negative numbers.",
  "options": ["prefix-sum", "sliding-window", "two-pointers", "binary-search"], "answer": "prefix-sum",
  "signals": ["subarray sum", "negatives allowed", "count rather than a single answer"],
  "explanation": "Negatives break the sliding window's monotonicity. Prefix sums plus a HashMap of previously seen prefix values counts them in one pass."},
 {"id": "pr-07", "prompt": "Return the values of a binary tree grouped by level.",
  "options": ["bfs", "dfs", "backtracking", "recursion"], "answer": "bfs",
  "signals": ["level by level", "tree"],
  "explanation": "Level-order is breadth-first by definition. Freeze queue.size() before the inner loop so each iteration drains exactly one level."},
 {"id": "pr-08", "prompt": "Count the islands in a grid of land and water cells.",
  "options": ["dfs", "bfs", "dynamic-programming-basics", "prefix-sum"], "answer": "dfs",
  "signals": ["grid", "connected regions", "count the groups"],
  "explanation": "Connected components. Flood fill from each unvisited land cell; BFS works equally well, but DFS is shorter to write."},
 {"id": "pr-09", "prompt": "Given course prerequisites, decide whether all courses can be completed.",
  "options": ["dfs", "bfs", "dynamic-programming-basics", "two-pointers"], "answer": "dfs",
  "signals": ["dependencies", "is this possible", "implicit directed graph"],
  "explanation": "Cycle detection on a directed graph. DFS with three-colour marking or Kahn's in-degree algorithm, both O(V+E)."},
 {"id": "pr-10", "prompt": "Return every subset of a set of 10 distinct numbers.",
  "options": ["backtracking", "dynamic-programming-basics", "bfs", "hashing"], "answer": "backtracking",
  "signals": ["all subsets", "small n", "enumerate rather than count"],
  "explanation": "'Find all' means the output itself is exponential. Choose, explore, unchoose — and remember to store a copy, not the live list."},
 {"id": "pr-11", "prompt": "Count the distinct ways to climb n stairs taking 1 or 2 steps at a time.",
  "options": ["dynamic-programming-basics", "backtracking", "bfs", "binary-search"], "answer": "dynamic-programming-basics",
  "signals": ["how many ways", "count only, not the list", "overlapping subproblems"],
  "explanation": "Backtracking would enumerate exponentially many paths just to count them. ways(n) = ways(n-1) + ways(n-2) memoises to O(n)."},
 {"id": "pr-12", "prompt": "Check whether a string of brackets is correctly nested.",
  "options": ["stack", "queue", "hashing", "two-pointers"], "answer": "stack",
  "signals": ["matching", "nesting", "most recent unmatched"],
  "explanation": "A closer can only match the most recent unmatched opener — LIFO. Remember both failure modes: popping empty, and leftovers at the end."},
 {"id": "pr-13", "prompt": "For each day, find how many days until a warmer temperature.",
  "options": ["stack", "sliding-window", "binary-search", "prefix-sum"], "answer": "stack",
  "signals": ["next greater element", "most recent unresolved items resolve first"],
  "explanation": "Monotonic stack of indices awaiting a warmer day. Each index is pushed and popped once, giving O(n) despite the nested while loop."},
 {"id": "pr-14", "prompt": "Find the maximum sum of any 5 consecutive elements in a large array.",
  "options": ["sliding-window", "prefix-sum", "two-pointers", "dynamic-programming-basics"], "answer": "sliding-window",
  "signals": ["consecutive", "fixed size", "maximum"],
  "explanation": "Fixed-size window: add the entering element, subtract the leaving one. O(n) regardless of the window width."},
 {"id": "pr-15", "prompt": "Find the middle node of a singly linked list in a single pass.",
  "options": ["fast-slow-pointer", "two-pointers", "hashing", "stack"], "answer": "fast-slow-pointer",
  "signals": ["linked list", "middle", "one pass"],
  "explanation": "When the fast pointer has moved 2k steps, the slow pointer has moved k. No length count needed."},
 {"id": "pr-16", "prompt": "Answer 100,000 queries of the form 'sum of elements between index i and j' on a static array.",
  "options": ["prefix-sum", "sliding-window", "binary-search", "hashing"], "answer": "prefix-sum",
  "signals": ["repeated range queries", "static array", "sum"],
  "explanation": "O(n) preprocessing makes every query a single subtraction. Note the caveat: if the array were mutable you would need a Fenwick tree."},
 {"id": "pr-17", "prompt": "Find the shortest path through a maze grid where every move costs the same.",
  "options": ["bfs", "dfs", "dynamic-programming-basics", "backtracking"], "answer": "bfs",
  "signals": ["shortest", "unweighted", "grid"],
  "explanation": "Uniform cost plus shortest path is BFS. DFS finds a path but offers no guarantee that it is the shortest."},
 {"id": "pr-18", "prompt": "Group words that are anagrams of one another.",
  "options": ["hashing", "sliding-window", "two-pointers", "backtracking"], "answer": "hashing",
  "signals": ["group by a shared property", "compare many against many"],
  "explanation": "Derive a canonical key per word — sorted letters, or a 26-length count — and bucket by it in a map. O(n·k) beats pairwise O(n²·k)."},
 {"id": "pr-19", "prompt": "Find the fewest coins needed to make an amount, with denominations [1,3,4].",
  "options": ["dynamic-programming-basics", "backtracking", "binary-search", "two-pointers"], "answer": "dynamic-programming-basics",
  "signals": ["minimum", "compounding choices", "greedy provably fails here"],
  "explanation": "Greedy gives 4+1+1 for amount 6; the optimum is 3+3. Overlapping subproblems plus an optimum means unbounded-knapsack DP."},
 {"id": "pr-20", "prompt": "Find all unique triplets in an array that sum to zero.",
  "options": ["two-pointers", "hashing", "backtracking", "sliding-window"], "answer": "two-pointers",
  "signals": ["triplet", "values not indices, so sorting is allowed", "duplicates must be suppressed"],
  "explanation": "Sort, fix an anchor, two-point the suffix. Sorting also makes duplicates adjacent, which is how the deduplication requirement is met."}
]
write(ROOT / "practice" / "pattern-recognition.json", bank)

print("wrote pattern map, 7 decision trees, 3 paths, and a bank of", len(bank), "questions")
