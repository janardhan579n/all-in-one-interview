"""Generates problem JSON files (batch 3). Run from the repo root: python3 scripts/gen_problems_3.py"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "dsa" / "problems"
OUT.mkdir(parents=True, exist_ok=True)
P = []

P.append({
  "id": "rotting-oranges",
  "title": "Rotting Oranges",
  "patternId": "bfs",
  "difficulty": "intermediate",
  "tags": ["grid", "bfs", "multi-source"],
  "statement": "In a grid, 0 is empty, 1 is a fresh orange and 2 is rotten. Every minute, a rotten orange rots any fresh orange in the four adjacent cells. Return the number of minutes until no fresh orange remains, or -1 if that is impossible.",
  "realWorld": "Any spreading process on a network: cache invalidation propagating through a topology, a rumour or outage cascading across dependent services, or a wildfire model. The question 'how long until everything is affected' is the same computation.",
  "examples": [
    {"input": "[[2,1,1],[1,1,0],[0,1,1]]", "output": "4", "explanation": "Rot spreads outward from the single source; the far corner is reached at minute 4."},
    {"input": "[[2,1,1],[0,1,1],[1,0,1]]", "output": "-1", "explanation": "The bottom-left orange is isolated and never rots."}
  ],
  "constraints": ["1 <= rows, cols <= 10", "grid[i][j] is 0, 1 or 2"],
  "bruteForce": {
    "idea": "Simulate minute by minute: scan the whole grid, mark every fresh orange adjacent to a rotten one, repeat until nothing changes.",
    "code": [
      "int minutes = 0;",
      "boolean changed = true;",
      "while (changed) {",
      "    changed = false;",
      "    int[][] snapshot = copyOf(grid);      // must not rot twice in one minute",
      "    for (int r = 0; r < rows; r++)",
      "        for (int c = 0; c < cols; c++)",
      "            if (snapshot[r][c] == 1 && hasRottenNeighbour(snapshot, r, c)) {",
      "                grid[r][c] = 2;",
      "                changed = true;",
      "            }",
      "    if (changed) minutes++;",
      "}"
    ],
    "complexity": {"time": "O(minutes * rows * cols)", "space": "O(rows * cols) for the snapshot"},
    "whySlow": "Each minute rescans every cell, including long-dead regions. It also needs a snapshot to stop rot cascading multiple cells in a single minute — a subtle bug that catches most people writing the naive version."
  },
  "patternIdentification": "Rot spreads one ring per minute from every rotten cell simultaneously. Simultaneous starts plus per-ring timing is multi-source BFS: seed the queue with all sources at distance 0, and each BFS level is one minute.",
  "optimized": {
    "idea": "Enqueue every initially rotten cell, count the fresh ones, then run level-by-level BFS. Each level is one minute. At the end, if any fresh orange remains it was unreachable.",
    "code": [
      "public static int orangesRotting(int[][] grid) {",
      "    int rows = grid.length, cols = grid[0].length;",
      "    Queue<int[]> queue = new ArrayDeque<>();",
      "    int fresh = 0;",
      "",
      "    for (int r = 0; r < rows; r++) {",
      "        for (int c = 0; c < cols; c++) {",
      "            if (grid[r][c] == 2) queue.offer(new int[]{r, c});   // all sources",
      "            else if (grid[r][c] == 1) fresh++;",
      "        }",
      "    }",
      "    if (fresh == 0) return 0;          // nothing to rot: zero minutes",
      "",
      "    final int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};",
      "    int minutes = 0;",
      "",
      "    while (!queue.isEmpty() && fresh > 0) {",
      "        int levelSize = queue.size();   // exactly one minute's worth",
      "        for (int i = 0; i < levelSize; i++) {",
      "            int[] cell = queue.poll();",
      "            for (int[] d : DIRS) {",
      "                int r = cell[0] + d[0], c = cell[1] + d[1];",
      "                if (r < 0 || r >= rows || c < 0 || c >= cols) continue;",
      "                if (grid[r][c] != 1) continue;",
      "                grid[r][c] = 2;         // the grid itself is the visited set",
      "                fresh--;",
      "                queue.offer(new int[]{r, c});",
      "            }",
      "        }",
      "        minutes++;",
      "    }",
      "    return fresh == 0 ? minutes : -1;",
      "}"
    ],
    "complexity": {"time": "O(rows * cols)", "space": "O(rows * cols)"}
  },
  "visualization": {
    "engine": "gridBfs",
    "input": {"grid": [[0,0,1,0,0],[1,0,1,0,1],[0,0,0,0,0],[0,1,1,1,0],[0,0,0,1,0]], "start": [0,0], "target": [4,4]},
    "code": [
      "// same expanding-frontier structure, shown as shortest path:",
      "while (!q.isEmpty()) {",
      "    int size = q.size();",
      "    for (int i = 0; i < size; i++) { /* expand 4 neighbours */ }",
      "    steps++;",
      "}"
    ]
  },
  "commonMistakes": [
    "Running a separate BFS from each rotten orange instead of seeding them all at once.",
    "Incrementing minutes even when the last level added nothing, giving an answer one too high. Guarding the loop with `fresh > 0` avoids it.",
    "Returning 0 vs -1 incorrectly for a grid with no fresh oranges — it is 0, not -1.",
    "Forgetting that rot must not cascade several cells within a single minute; level-by-level BFS handles this automatically, naive simulation does not."
  ],
  "similar": ["binary-tree-level-order", "number-of-islands"]
})

P.append({
  "id": "max-depth-binary-tree",
  "title": "Maximum Depth of Binary Tree",
  "patternId": "dfs",
  "difficulty": "beginner",
  "tags": ["tree", "dfs", "recursion"],
  "statement": "Given the root of a binary tree, return its maximum depth: the number of nodes along the longest path from the root down to a leaf.",
  "realWorld": "Measuring nesting depth — of a JSON payload before accepting it (deeply nested input is a denial-of-service vector), of a category hierarchy, or of a call tree in a profiler.",
  "examples": [
    {"input": "root = [3,9,20,null,null,15,7]", "output": "3", "explanation": "3 -> 20 -> 15 is three nodes."},
    {"input": "root = []", "output": "0", "explanation": ""}
  ],
  "constraints": ["0 <= number of nodes <= 10^4"],
  "bruteForce": {
    "idea": "Enumerate every root-to-leaf path, measure each, keep the longest.",
    "code": [
      "void allPaths(TreeNode node, int depth) {",
      "    if (node == null) return;",
      "    if (node.left == null && node.right == null) best = Math.max(best, depth);",
      "    allPaths(node.left,  depth + 1);",
      "    allPaths(node.right, depth + 1);",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(h)"},
    "whySlow": "This is actually already O(n) and perfectly fine — it is just phrased awkwardly, tracking a mutable best rather than returning a value. The cleaner formulation makes the recursion return the answer, which generalises to every other tree aggregation."
  },
  "patternIdentification": "The classic tree question: what do I need from my children, and what do I return to my parent? Here: the deeper of the two subtree depths, plus one for myself. That is post-order DFS.",
  "optimized": {
    "idea": "depth(node) = 1 + max(depth(left), depth(right)), with depth(null) = 0. Three lines, and the shape generalises to sums, balance checks, diameters and subtree sizes.",
    "code": [
      "public static int maxDepth(TreeNode root) {",
      "    if (root == null) return 0;                // base case",
      "    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));",
      "}",
      "",
      "/** Iterative BFS alternative — useful when the tree could be 10^5 deep. */",
      "public static int maxDepthIterative(TreeNode root) {",
      "    if (root == null) return 0;",
      "    Queue<TreeNode> queue = new ArrayDeque<>();",
      "    queue.offer(root);",
      "    int depth = 0;",
      "    while (!queue.isEmpty()) {",
      "        int levelSize = queue.size();",
      "        for (int i = 0; i < levelSize; i++) {",
      "            TreeNode node = queue.poll();",
      "            if (node.left  != null) queue.offer(node.left);",
      "            if (node.right != null) queue.offer(node.right);",
      "        }",
      "        depth++;",
      "    }",
      "    return depth;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(h) — O(log n) balanced, O(n) skewed"}
  },
  "commonMistakes": [
    "Returning 1 for a null node, which over-counts by one at every leaf.",
    "Confusing depth in nodes (this problem) with height in edges — state your convention.",
    "Assuming O(1) space because the code is three lines; the call stack is O(h).",
    "Recursing on an untrusted deeply nested structure in production — use the iterative version there."
  ],
  "similar": ["binary-tree-level-order", "number-of-islands"]
})

P.append({
  "id": "number-of-islands",
  "title": "Number of Islands",
  "patternId": "dfs",
  "difficulty": "intermediate",
  "tags": ["grid", "dfs", "bfs", "connected-components"],
  "statement": "Given a grid of '1' (land) and '0' (water), count the number of islands. An island is land connected horizontally or vertically, surrounded by water.",
  "realWorld": "Counting connected clusters: distinct regions in an image after thresholding, groups of related accounts in fraud detection, or isolated partitions in a network after link failures.",
  "examples": [
    {"input": "[[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]", "output": "3", "explanation": "Top-left block, the single middle cell, and the bottom-right pair."},
    {"input": "[[1,1,1],[0,1,0],[1,1,1]]", "output": "1", "explanation": "All land is connected through the middle column."}
  ],
  "constraints": ["1 <= rows, cols <= 300", "grid[i][j] is '0' or '1'"],
  "bruteForce": {
    "idea": "Try to pair up adjacent land cells and merge groups, repeatedly scanning until no merges happen.",
    "code": [
      "// repeatedly relabel: give each land cell its own id, then keep sweeping,",
      "// merging ids of adjacent cells until a full sweep changes nothing",
      "boolean changed = true;",
      "while (changed) { changed = mergeAdjacentLabels(grid, labels); }",
      "return distinctLabels(labels);"
    ],
    "complexity": {"time": "O((rows * cols)^2) worst case", "space": "O(rows * cols)"},
    "whySlow": "A long snaking island needs many sweeps for labels to propagate end to end. Union-Find fixes the merging approach properly, but a traversal is simpler here."
  },
  "patternIdentification": "Counting connected components. Start a traversal at each unvisited land cell; the traversal absorbs the entire island so it is never counted again. The number of times you have to start is the answer.",
  "optimized": {
    "idea": "Scan the grid. On each unvisited land cell, increment the count and run a DFS flood fill that sinks the whole island (marks it visited). Every cell is visited at most twice — once by the scan, once by a flood fill.",
    "code": [
      "public static int numIslands(char[][] grid) {",
      "    int islands = 0;",
      "    for (int r = 0; r < grid.length; r++) {",
      "        for (int c = 0; c < grid[0].length; c++) {",
      "            if (grid[r][c] == '1') {",
      "                islands++;        // a cell no earlier flood fill reached",
      "                sink(grid, r, c); // absorb the whole island",
      "            }",
      "        }",
      "    }",
      "    return islands;",
      "}",
      "",
      "private static void sink(char[][] grid, int r, int c) {",
      "    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;",
      "    if (grid[r][c] != '1') return;",
      "    grid[r][c] = '0';             // mark BEFORE recursing, or you loop forever",
      "    sink(grid, r + 1, c);",
      "    sink(grid, r - 1, c);",
      "    sink(grid, r, c + 1);",
      "    sink(grid, r, c - 1);",
      "}"
    ],
    "complexity": {"time": "O(rows * cols)", "space": "O(rows * cols) worst-case recursion depth for an all-land grid"}
  },
  "visualization": {
    "engine": "gridDfs",
    "input": {"grid": [[1,1,0,0,1],[1,0,0,0,1],[0,0,1,0,0],[0,0,1,1,0]]},
    "code": [
      "int islands = 0;",
      "for (int r = 0; r < rows; r++) {",
      "    for (int c = 0; c < cols; c++) {",
      "        if (grid[r][c] == 1) {",
      "            islands++;",
      "            sink(grid, r, c);",
      "        }",
      "    }",
      "}",
      "return islands;"
    ]
  },
  "commonMistakes": [
    "Marking the cell visited after recursing rather than before, which revisits cells endlessly.",
    "Comparing against 1 instead of '1' — the grid holds chars, and '1' is 49.",
    "Including diagonals; this problem defines connectivity as the four orthogonal neighbours only.",
    "Mutating the caller's grid without mentioning it. If that is unacceptable, use a separate visited array (and say so).",
    "Stack overflow on a 300x300 all-land grid; mention the iterative BFS variant."
  ],
  "similar": ["rotting-oranges", "course-schedule"]
})

P.append({
  "id": "course-schedule",
  "title": "Course Schedule",
  "patternId": "dfs",
  "difficulty": "advanced",
  "tags": ["graph", "dfs", "topological-sort", "cycle-detection"],
  "statement": "There are numCourses courses labelled 0..numCourses-1 and a list of prerequisite pairs [a, b] meaning you must take b before a. Return true if it is possible to finish all courses.",
  "realWorld": "Exactly what a build system, package manager or database migration runner does before executing anything. The 'circular dependency' error you have seen in Maven, npm or Spring is this algorithm reporting a cycle.",
  "examples": [
    {"input": "numCourses = 2, prerequisites = [[1,0]]", "output": "true", "explanation": "Take 0, then 1."},
    {"input": "numCourses = 2, prerequisites = [[1,0],[0,1]]", "output": "false", "explanation": "Each requires the other."}
  ],
  "constraints": ["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000", "All prerequisite pairs are distinct"],
  "bruteForce": {
    "idea": "For each course, follow its prerequisite chains to see whether you can return to the starting course.",
    "code": [
      "for (int course = 0; course < numCourses; course++) {",
      "    if (canReach(course, course, new HashSet<>())) return false;",
      "}",
      "return true;"
    ],
    "complexity": {"time": "O(V * (V + E))", "space": "O(V)"},
    "whySlow": "Each course re-explores the graph with no memory carried across runs. Subgraphs already proven acyclic are re-walked up to V times."
  },
  "patternIdentification": "Model it as a directed graph: courses are nodes, prerequisites are edges. 'Can all courses be finished' is exactly 'is this digraph acyclic'. Two standard answers: DFS with three-colour marking, or Kahn's algorithm using in-degrees.",
  "optimized": {
    "idea": "Kahn's algorithm. Repeatedly take a course with no unmet prerequisites, remove it, and decrement its dependents' counters. If every course comes out, the graph is acyclic; if some never reach in-degree zero, they are in a cycle.",
    "code": [
      "public static boolean canFinish(int numCourses, int[][] prerequisites) {",
      "    List<List<Integer>> dependents = new ArrayList<>();",
      "    for (int i = 0; i < numCourses; i++) dependents.add(new ArrayList<>());",
      "    int[] inDegree = new int[numCourses];",
      "",
      "    for (int[] pair : prerequisites) {",
      "        int course = pair[0], prereq = pair[1];",
      "        dependents.get(prereq).add(course);   // edge prereq -> course",
      "        inDegree[course]++;",
      "    }",
      "",
      "    Queue<Integer> ready = new ArrayDeque<>();",
      "    for (int i = 0; i < numCourses; i++) {",
      "        if (inDegree[i] == 0) ready.offer(i);",
      "    }",
      "",
      "    int taken = 0;",
      "    while (!ready.isEmpty()) {",
      "        int course = ready.poll();",
      "        taken++;",
      "        for (int next : dependents.get(course)) {",
      "            if (--inDegree[next] == 0) ready.offer(next);",
      "        }",
      "    }",
      "    return taken == numCourses;   // anything left is stuck in a cycle",
      "}",
      "",
      "// DFS alternative: 0 = unvisited, 1 = on the current path, 2 = finished.",
      "// Meeting a node marked 1 is a back edge, i.e. a cycle.",
      "private static boolean hasCycle(int node, List<List<Integer>> adj, int[] colour) {",
      "    if (colour[node] == 1) return true;",
      "    if (colour[node] == 2) return false;",
      "    colour[node] = 1;",
      "    for (int next : adj.get(node)) {",
      "        if (hasCycle(next, adj, colour)) return true;",
      "    }",
      "    colour[node] = 2;",
      "    return false;",
      "}"
    ],
    "complexity": {"time": "O(V + E)", "space": "O(V + E)"}
  },
  "commonMistakes": [
    "Getting the edge direction backwards. [a, b] means b must come first, so the edge is b -> a.",
    "Using a single visited set in the DFS version; you need to distinguish 'on the current path' from 'already finished'.",
    "Forgetting to clear the on-path mark when the recursive call returns, which reports cycles that do not exist.",
    "Assuming the graph is connected — seed the queue with every in-degree-zero node, and in the DFS version loop over every node.",
    "Not handling the empty prerequisites list, which is trivially true."
  ],
  "similar": ["number-of-islands", "rotting-oranges"]
})

P.append({
  "id": "climbing-stairs",
  "title": "Climbing Stairs",
  "patternId": "dynamic-programming-basics",
  "difficulty": "beginner",
  "tags": ["dp", "recursion", "fibonacci"],
  "statement": "You are climbing a staircase of n steps. Each time you may climb 1 or 2 steps. In how many distinct ways can you reach the top?",
  "realWorld": "Counting the ways a sequence of fixed-size operations can fill a budget — packet fragmentation options, tiling a strip, or the number of valid decodings of a message.",
  "examples": [
    {"input": "n = 2", "output": "2", "explanation": "1+1 and 2."},
    {"input": "n = 3", "output": "3", "explanation": "1+1+1, 1+2, 2+1."},
    {"input": "n = 45", "output": "1836311903", "explanation": "Note this is close to Integer.MAX_VALUE."}
  ],
  "constraints": ["1 <= n <= 45"],
  "bruteForce": {
    "idea": "Recursively branch on taking 1 step or 2 steps and add the counts.",
    "code": [
      "public static int climbStairs(int n) {",
      "    if (n <= 1) return 1;",
      "    return climbStairs(n - 1) + climbStairs(n - 2);",
      "}"
    ],
    "complexity": {"time": "O(2^n)", "space": "O(n) call stack"},
    "whySlow": "n = 45 makes over 3 billion calls and takes minutes, despite there being only 45 distinct values to compute. The call tree recomputes the same subproblems exponentially many times."
  },
  "patternIdentification": "A recurrence whose subproblems overlap heavily. Only the count is wanted, not the enumeration of every path — that combination is the dynamic-programming signal. (Enumerating the paths themselves would be backtracking, and genuinely exponential.)",
  "optimized": {
    "idea": "ways(i) = ways(i-1) + ways(i-2), because the last move was either a 1-step or a 2-step. Compute bottom-up; since only the previous two values are ever read, two variables replace the whole table.",
    "code": [
      "/** O(n) time, O(1) space. */",
      "public static int climbStairs(int n) {",
      "    if (n <= 1) return 1;",
      "    int twoBack = 1;   // ways to reach step 0",
      "    int oneBack = 1;   // ways to reach step 1",
      "    for (int i = 2; i <= n; i++) {",
      "        int current = oneBack + twoBack;",
      "        twoBack = oneBack;",
      "        oneBack = current;",
      "    }",
      "    return oneBack;",
      "}",
      "",
      "/** Tabulated version — clearer first, optimise space afterwards. */",
      "public static int climbStairsTable(int n) {",
      "    if (n <= 1) return 1;",
      "    int[] dp = new int[n + 1];",
      "    dp[0] = 1;",
      "    dp[1] = 1;",
      "    for (int i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];",
      "    return dp[n];",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(1) with rolling variables, O(n) tabulated"}
  },
  "visualization": {
    "engine": "dp1d",
    "input": {"kind": "climbStairs", "n": 8},
    "code": [
      "int[] dp = new int[n + 1];",
      "dp[0] = 1;",
      "dp[1] = 1;",
      "for (int i = 2; i <= n; i++) {",
      "    dp[i] = dp[i - 1] + dp[i - 2];",
      "}",
      "return dp[n];"
    ]
  },
  "commonMistakes": [
    "Setting dp[0] = 0. There is exactly one way to stand at the bottom having climbed nothing.",
    "Optimising to two variables before the tabulated version is verified correct.",
    "Using int for larger n — this is Fibonacci, so it overflows quickly past n = 46.",
    "Reaching for backtracking to enumerate the paths when only the count is required."
  ],
  "similar": ["house-robber", "coin-change", "unique-paths"]
})

P.append({
  "id": "house-robber",
  "title": "House Robber",
  "patternId": "dynamic-programming-basics",
  "difficulty": "intermediate",
  "tags": ["dp", "array"],
  "statement": "Each house on a street holds some amount of money, but robbing two adjacent houses triggers the alarm. Return the maximum you can take without robbing two adjacent houses.",
  "realWorld": "Selecting non-conflicting items from a sequence: scheduling jobs that cannot run back to back, choosing ad slots with a minimum gap, or picking maintenance windows that must not be consecutive.",
  "examples": [
    {"input": "nums = [1,2,3,1]", "output": "4", "explanation": "Houses 0 and 2: 1 + 3 = 4."},
    {"input": "nums = [2,7,9,3,1]", "output": "12", "explanation": "Houses 0, 2 and 4: 2 + 9 + 1 = 12."}
  ],
  "constraints": ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
  "bruteForce": {
    "idea": "Try every valid subset of non-adjacent houses and keep the richest.",
    "code": [
      "int rob(int[] nums, int i) {",
      "    if (i >= nums.length) return 0;",
      "    int takeThis = nums[i] + rob(nums, i + 2);   // skip the neighbour",
      "    int skipThis = rob(nums, i + 1);",
      "    return Math.max(takeThis, skipThis);",
      "}"
    ],
    "complexity": {"time": "O(2^n)", "space": "O(n)"},
    "whySlow": "Every house is a binary choice, so the recursion tree has 2^n leaves — and rob(i) is recomputed from many different branches."
  },
  "patternIdentification": "A sequence of decisions where each choice constrains the next, an optimum is wanted rather than an enumeration, and subproblems repeat. Textbook 1-D DP.",
  "optimized": {
    "idea": "dp[i] = max loot considering the first i houses = max(dp[i-1] (skip house i), dp[i-2] + nums[i] (rob it)). Only the last two values are needed, so two rolling variables suffice.",
    "code": [
      "/** O(n) time, O(1) space. */",
      "public static int rob(int[] nums) {",
      "    int skipPrev = 0;   // best total if we did NOT rob the previous house",
      "    int robPrev  = 0;   // best total that includes the previous house",
      "",
      "    for (int money : nums) {",
      "        int robThis  = skipPrev + money;                 // must skip the last one",
      "        int skipThis = Math.max(skipPrev, robPrev);      // free choice",
      "        robPrev  = robThis;",
      "        skipPrev = skipThis;",
      "    }",
      "    return Math.max(robPrev, skipPrev);",
      "}",
      "",
      "/** Tabulated, if the rolling version is hard to read. */",
      "public static int robTable(int[] nums) {",
      "    int n = nums.length;",
      "    if (n == 1) return nums[0];",
      "    int[] dp = new int[n];",
      "    dp[0] = nums[0];",
      "    dp[1] = Math.max(nums[0], nums[1]);",
      "    for (int i = 2; i < n; i++) {",
      "        dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i]);",
      "    }",
      "    return dp[n - 1];",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(1) rolling, O(n) tabulated"}
  },
  "commonMistakes": [
    "Assuming the answer alternates houses (all even or all odd indices). [2,1,1,2] disproves it: the answer is 4, taking houses 0 and 3.",
    "Setting dp[1] = nums[1] instead of max(nums[0], nums[1]).",
    "Mishandling n == 1 in the tabulated version, which indexes dp[1] out of bounds.",
    "Being greedy — taking the largest remaining house repeatedly is not optimal."
  ],
  "similar": ["climbing-stairs", "coin-change"]
})

P.append({
  "id": "coin-change",
  "title": "Coin Change",
  "patternId": "dynamic-programming-basics",
  "difficulty": "advanced",
  "tags": ["dp", "knapsack"],
  "statement": "Given coin denominations and a target amount, return the fewest coins needed to make that amount, or -1 if it cannot be made. You have an unlimited supply of each denomination.",
  "realWorld": "Change-making in point-of-sale systems, but also splitting a payout across available note denominations, and choosing the fewest packet sizes to fill a transfer budget.",
  "examples": [
    {"input": "coins = [1,2,5], amount = 11", "output": "3", "explanation": "5 + 5 + 1."},
    {"input": "coins = [2], amount = 3", "output": "-1", "explanation": "Odd amounts are unreachable with only 2s."},
    {"input": "coins = [1,3,4], amount = 6", "output": "2", "explanation": "3 + 3. Greedy would pick 4 + 1 + 1 = 3 coins and be wrong."}
  ],
  "constraints": ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1", "0 <= amount <= 10^4"],
  "bruteForce": {
    "idea": "Greedily take the largest coin that fits, repeatedly.",
    "code": [
      "Arrays.sort(coins);",
      "int count = 0;",
      "for (int i = coins.length - 1; i >= 0; i--) {",
      "    while (amount >= coins[i]) { amount -= coins[i]; count++; }",
      "}",
      "return amount == 0 ? count : -1;"
    ],
    "complexity": {"time": "O(amount)", "space": "O(1)"},
    "whySlow": "Not slow — simply WRONG. With coins [1,3,4] and amount 6, greedy gives 4+1+1 = 3 coins; the optimum is 3+3 = 2. Greedy happens to work for real currency systems because they are designed to be canonical, but it is not correct in general. This is the best kind of brute force to show an interviewer, because it demonstrates you tested your assumption."
  },
  "patternIdentification": "An optimum over choices that compound, with overlapping subproblems (the amount 6 is reachable many ways) and no valid greedy rule. That is unbounded-knapsack DP.",
  "optimized": {
    "idea": "dp[a] = fewest coins to make amount a. For each amount, try every coin: dp[a] = min(dp[a], dp[a - coin] + 1). Because each coin may be reused, iterate amounts outwards and coins inside.",
    "code": [
      "public static int coinChange(int[] coins, int amount) {",
      "    int[] dp = new int[amount + 1];",
      "    Arrays.fill(dp, amount + 1);        // sentinel: larger than any real answer",
      "    dp[0] = 0;                          // zero coins make zero",
      "",
      "    for (int target = 1; target <= amount; target++) {",
      "        for (int coin : coins) {",
      "            if (coin <= target && dp[target - coin] != amount + 1) {",
      "                dp[target] = Math.min(dp[target], dp[target - coin] + 1);",
      "            }",
      "        }",
      "    }",
      "    return dp[amount] > amount ? -1 : dp[amount];",
      "}"
    ],
    "complexity": {"time": "O(amount * coins.length)", "space": "O(amount)"}
  },
  "commonMistakes": [
    "Using greedy. Check it against [1,3,4] with amount 6 before trusting it.",
    "Initialising dp to 0 — zero is a valid coin count and wins every Math.min, poisoning the table.",
    "Using Integer.MAX_VALUE as the sentinel and then computing dp[x] + 1, which overflows to a negative number.",
    "Forgetting dp[0] = 0, which makes everything unreachable.",
    "Calling this polynomial. It is pseudo-polynomial: the cost depends on the numeric value of `amount`, not the input's length, so amount = 10^9 is infeasible."
  ],
  "similar": ["climbing-stairs", "house-robber", "unique-paths"]
})

P.append({
  "id": "unique-paths",
  "title": "Unique Paths",
  "patternId": "dynamic-programming-basics",
  "difficulty": "intermediate",
  "tags": ["dp", "grid", "combinatorics"],
  "statement": "A robot starts at the top-left of an m x n grid and may only move right or down. How many distinct paths reach the bottom-right corner?",
  "realWorld": "Counting routes through a street grid, or the number of distinct orderings of two interleaved task types — the same combinatorial object appears in scheduling and in lattice-path problems.",
  "examples": [
    {"input": "m = 3, n = 7", "output": "28", "explanation": ""},
    {"input": "m = 3, n = 2", "output": "3", "explanation": "RDD, DRD, DDR."}
  ],
  "constraints": ["1 <= m, n <= 100", "The answer fits in a 32-bit signed integer"],
  "bruteForce": {
    "idea": "Recurse: from each cell, branch right and down, counting the paths that reach the corner.",
    "code": [
      "int paths(int r, int c, int m, int n) {",
      "    if (r >= m || c >= n) return 0;      // fell off the grid",
      "    if (r == m - 1 && c == n - 1) return 1;",
      "    return paths(r + 1, c, m, n) + paths(r, c + 1, m, n);",
      "}"
    ],
    "complexity": {"time": "O(2^(m+n))", "space": "O(m + n)"},
    "whySlow": "The cell (5,5) is reached by many different prefixes, and its subtree is recomputed for each one. For a 100x100 grid this never finishes."
  },
  "patternIdentification": "The number of ways to reach a cell depends only on the cell, not on the route taken to it — the definition of an overlapping subproblem. 2-D grid DP.",
  "optimized": {
    "idea": "dp[r][c] = dp[r-1][c] + dp[r][c-1]: every path into a cell arrives from above or from the left. The first row and first column are all 1, since there is only one way along an edge. Because each row depends only on the row above, one 1-D array can be reused.",
    "code": [
      "/** O(m*n) time, O(n) space — one rolling row. */",
      "public static int uniquePaths(int m, int n) {",
      "    int[] row = new int[n];",
      "    Arrays.fill(row, 1);                 // the top row: exactly one path each",
      "",
      "    for (int r = 1; r < m; r++) {",
      "        for (int c = 1; c < n; c++) {",
      "            row[c] = row[c] + row[c - 1];  // from above  +  from the left",
      "        }",
      "    }",
      "    return row[n - 1];",
      "}",
      "",
      "/** Full table, easier to read first. */",
      "public static int uniquePathsTable(int m, int n) {",
      "    int[][] dp = new int[m][n];",
      "    for (int r = 0; r < m; r++) {",
      "        for (int c = 0; c < n; c++) {",
      "            if (r == 0 || c == 0) dp[r][c] = 1;",
      "            else dp[r][c] = dp[r - 1][c] + dp[r][c - 1];",
      "        }",
      "    }",
      "    return dp[m - 1][n - 1];",
      "}"
    ],
    "complexity": {"time": "O(m * n)", "space": "O(n) rolling, O(m*n) tabulated"}
  },
  "visualization": {
    "engine": "dpGrid",
    "input": {"rows": 4, "cols": 5},
    "code": [
      "int[][] dp = new int[rows][cols];",
      "for (int r = 0; r < rows; r++) {",
      "    for (int c = 0; c < cols; c++) {",
      "        if (r == 0 || c == 0) dp[r][c] = 1;",
      "        else dp[r][c] = dp[r-1][c] + dp[r][c-1];",
      "    }",
      "}",
      "return dp[rows-1][cols-1];"
    ]
  },
  "commonMistakes": [
    "Forgetting to initialise the first row and column to 1.",
    "In the rolling-array version, reading row[c-1] after it has been updated — that is intentional here (it IS the left neighbour of the current row), but the same trick is wrong in problems where you need the previous row's value; be explicit about which you want.",
    "Overflow for large grids if the constraints were relaxed; the closed form C(m+n-2, m-1) has the same issue and needs care."
  ],
  "similar": ["climbing-stairs", "coin-change"]
})

P.append({
  "id": "subsets",
  "title": "Subsets",
  "patternId": "backtracking",
  "difficulty": "beginner",
  "tags": ["backtracking", "recursion", "combinatorics"],
  "statement": "Given an array of distinct integers, return all possible subsets (the power set). The solution set must not contain duplicate subsets.",
  "realWorld": "Feature-flag combination testing, generating every possible configuration of optional components, and exploring candidate index sets in a query planner.",
  "examples": [
    {"input": "nums = [1,2,3]", "output": "[[],[1],[1,2],[1,2,3],[1,3],[2],[2,3],[3]]", "explanation": "2^3 = 8 subsets, in any order."},
    {"input": "nums = [0]", "output": "[[],[0]]", "explanation": ""}
  ],
  "constraints": ["1 <= nums.length <= 10", "All elements are distinct"],
  "bruteForce": {
    "idea": "Iterate a bitmask from 0 to 2^n - 1 and include element i whenever bit i is set.",
    "code": [
      "for (int mask = 0; mask < (1 << n); mask++) {",
      "    List<Integer> subset = new ArrayList<>();",
      "    for (int i = 0; i < n; i++) {",
      "        if ((mask & (1 << i)) != 0) subset.add(nums[i]);",
      "    }",
      "    result.add(subset);",
      "}"
    ],
    "complexity": {"time": "O(n * 2^n)", "space": "O(n)"},
    "whySlow": "For plain subsets this is genuinely fine and even elegant. It stops working the moment the problem adds a constraint (e.g. 'subsets summing to k'), because it must generate all 2^n candidates before rejecting any. Backtracking can abandon a doomed prefix and skip its whole subtree."
  },
  "patternIdentification": "'Find all ...' with a decision per element is the backtracking signature: choose, explore, unchoose.",
  "optimized": {
    "idea": "Walk the decision tree. At each node, record the current partial subset (every node is a valid subset), then for each remaining element, add it, recurse on the elements after it, and remove it.",
    "code": [
      "public static List<List<Integer>> subsets(int[] nums) {",
      "    List<List<Integer>> result = new ArrayList<>();",
      "    backtrack(nums, 0, new ArrayList<>(), result);",
      "    return result;",
      "}",
      "",
      "private static void backtrack(int[] nums, int start, List<Integer> current,",
      "                              List<List<Integer>> result) {",
      "    result.add(new ArrayList<>(current));      // COPY — not the live list",
      "",
      "    for (int i = start; i < nums.length; i++) {",
      "        current.add(nums[i]);                  // choose",
      "        backtrack(nums, i + 1, current, result);  // explore (i+1: never reuse)",
      "        current.remove(current.size() - 1);    // unchoose",
      "    }",
      "}"
    ],
    "complexity": {"time": "O(n * 2^n) — 2^n subsets, O(n) to copy each", "space": "O(n) recursion depth, excluding the output"}
  },
  "visualization": {
    "engine": "backtrackingSubsets",
    "input": {"array": [1, 2, 3]},
    "code": [
      "void backtrack(int start, List<Integer> current) {",
      "    result.add(new ArrayList<>(current));",
      "    for (int i = start; i < nums.length; i++) {",
      "        current.add(nums[i]);",
      "        backtrack(i + 1, current);",
      "        current.remove(current.size() - 1);",
      "    }",
      "}"
    ]
  },
  "commonMistakes": [
    "result.add(current) instead of result.add(new ArrayList<>(current)) — every stored entry is the same list, which the recursion then empties.",
    "Passing start instead of i + 1, which reuses elements and produces combinations with repetition.",
    "Forgetting the unchoose line, leaking state into sibling branches.",
    "With duplicate input values, forgetting to sort and skip equal values at the same depth."
  ],
  "similar": ["permutations", "n-queens"]
})

P.append({
  "id": "permutations",
  "title": "Permutations",
  "patternId": "backtracking",
  "difficulty": "intermediate",
  "tags": ["backtracking", "recursion", "combinatorics"],
  "statement": "Given an array of distinct integers, return all possible permutations in any order.",
  "realWorld": "Exhaustive search over orderings: brute-forcing a small travelling-salesman instance, testing every execution interleaving in a concurrency test, or trying join orders in a query planner.",
  "examples": [
    {"input": "nums = [1,2,3]", "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", "explanation": "3! = 6."},
    {"input": "nums = [0,1]", "output": "[[0,1],[1,0]]", "explanation": ""}
  ],
  "constraints": ["1 <= nums.length <= 6", "All elements are distinct"],
  "bruteForce": {
    "idea": "Generate random orderings and collect the distinct ones until you have n! of them.",
    "code": [
      "Set<List<Integer>> found = new HashSet<>();",
      "while (found.size() < factorial(nums.length)) {",
      "    List<Integer> shuffled = new ArrayList<>(asList(nums));",
      "    Collections.shuffle(shuffled);",
      "    found.add(shuffled);",
      "}"
    ],
    "complexity": {"time": "Unbounded in the worst case (coupon-collector behaviour)", "space": "O(n * n!)"},
    "whySlow": "Correctness is only probabilistic and the last few permutations take a very long time to appear. Systematic construction is both faster and guaranteed."
  },
  "patternIdentification": "'All orderings' means order matters and every unused element is a candidate at every position — backtracking with a used[] marker rather than a start index.",
  "optimized": {
    "idea": "Build the permutation position by position. At each position try every element not already placed; mark it used, recurse, then unmark.",
    "code": [
      "public static List<List<Integer>> permute(int[] nums) {",
      "    List<List<Integer>> result = new ArrayList<>();",
      "    backtrack(nums, new ArrayList<>(), new boolean[nums.length], result);",
      "    return result;",
      "}",
      "",
      "private static void backtrack(int[] nums, List<Integer> current, boolean[] used,",
      "                              List<List<Integer>> result) {",
      "    if (current.size() == nums.length) {",
      "        result.add(new ArrayList<>(current));",
      "        return;",
      "    }",
      "    for (int i = 0; i < nums.length; i++) {",
      "        if (used[i]) continue;            // already placed",
      "        used[i] = true;",
      "        current.add(nums[i]);",
      "",
      "        backtrack(nums, current, used, result);",
      "",
      "        current.remove(current.size() - 1);   // unchoose",
      "        used[i] = false;",
      "    }",
      "}"
    ],
    "complexity": {"time": "O(n * n!)", "space": "O(n) recursion depth, excluding the output"}
  },
  "visualization": {
    "engine": "backtrackingPermutations",
    "input": {"array": [1, 2, 3]},
    "code": [
      "void backtrack(List<Integer> current, boolean[] used) {",
      "    if (current.size() == nums.length) {",
      "        result.add(new ArrayList<>(current));",
      "        return;",
      "    }",
      "    for (int i = 0; i < nums.length; i++) {",
      "        if (used[i]) continue;",
      "        used[i] = true;  current.add(nums[i]);",
      "        backtrack(current, used);",
      "        used[i] = false; current.remove(current.size() - 1);",
      "    }",
      "}"
    ]
  },
  "commonMistakes": [
    "Using a start index (as in subsets) instead of used[] — that generates combinations, not permutations.",
    "Resetting used[i] but forgetting to remove the element from current, or the reverse. Undo both.",
    "Storing the live list rather than a copy.",
    "With duplicate values, producing repeated permutations; sort first and skip nums[i] == nums[i-1] when used[i-1] is false."
  ],
  "similar": ["subsets", "n-queens"]
})

P.append({
  "id": "n-queens",
  "title": "N-Queens",
  "patternId": "backtracking",
  "difficulty": "advanced",
  "tags": ["backtracking", "recursion", "constraint-satisfaction", "pruning"],
  "statement": "Place n queens on an n x n chessboard so that no two attack each other (no shared row, column or diagonal). Return all distinct solutions.",
  "realWorld": "The canonical constraint-satisfaction problem. The same search-and-prune structure underlies exam timetabling, shift rostering, frequency assignment and register allocation in compilers.",
  "examples": [
    {"input": "n = 4", "output": "2 solutions", "explanation": "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]"},
    {"input": "n = 1", "output": "1 solution", "explanation": "A single queen on a 1x1 board."}
  ],
  "constraints": ["1 <= n <= 9"],
  "bruteForce": {
    "idea": "Generate every way to place n queens on n^2 squares and test each arrangement for validity.",
    "code": [
      "for (each combination of n squares out of n*n) {",
      "    if (noTwoQueensAttack(combination)) record(combination);",
      "}"
    ],
    "complexity": {"time": "C(n^2, n) — about 4.4 billion for n = 8", "space": "O(n)"},
    "whySlow": "It validates only complete boards. Placing two queens in the same row is detectable immediately, but this approach still completes every board containing that mistake before rejecting it."
  },
  "patternIdentification": "Constraint satisfaction with early failure detection. Since exactly one queen goes in each row, the search is a decision per row, and conflicts can be detected the moment a queen is placed — that is pruning, and it is where all the speed comes from.",
  "optimized": {
    "idea": "Place one queen per row. Track occupied columns and both diagonal families in boolean arrays so conflict checking is O(1). Cells on a '\\' diagonal share (row - col); cells on a '/' diagonal share (row + col). Skip any conflicting column, which prunes its entire subtree.",
    "code": [
      "public class NQueens {",
      "    private int n;",
      "    private int[] queenCol;",
      "    private boolean[] colUsed, diagUsed, antiUsed;",
      "    private List<List<String>> solutions;",
      "",
      "    public List<List<String>> solveNQueens(int n) {",
      "        this.n = n;",
      "        queenCol  = new int[n];",
      "        colUsed   = new boolean[n];",
      "        diagUsed  = new boolean[2 * n - 1];   // row - col + (n-1)",
      "        antiUsed  = new boolean[2 * n - 1];   // row + col",
      "        solutions = new ArrayList<>();",
      "        place(0);",
      "        return solutions;",
      "    }",
      "",
      "    private void place(int row) {",
      "        if (row == n) { solutions.add(render()); return; }",
      "",
      "        for (int col = 0; col < n; col++) {",
      "            int diag = row - col + (n - 1);",
      "            int anti = row + col;",
      "            if (colUsed[col] || diagUsed[diag] || antiUsed[anti]) continue;  // PRUNE",
      "",
      "            colUsed[col] = diagUsed[diag] = antiUsed[anti] = true;",
      "            queenCol[row] = col;",
      "",
      "            place(row + 1);",
      "",
      "            colUsed[col] = diagUsed[diag] = antiUsed[anti] = false;  // unchoose",
      "        }",
      "    }",
      "",
      "    private List<String> render() {",
      "        List<String> board = new ArrayList<>(n);",
      "        for (int row = 0; row < n; row++) {",
      "            char[] line = new char[n];",
      "            Arrays.fill(line, '.');",
      "            line[queenCol[row]] = 'Q';",
      "            board.add(new String(line));",
      "        }",
      "        return board;",
      "    }",
      "}"
    ],
    "complexity": {"time": "O(n!) upper bound, but pruning explores far fewer nodes — roughly 2,000 for n = 8 versus 4.4 billion for naive enumeration", "space": "O(n)"}
  },
  "visualization": {
    "engine": "backtrackingNQueens",
    "input": {"n": 5},
    "code": [
      "void place(int row) {",
      "    if (row == n) { record(); return; }",
      "    for (int col = 0; col < n; col++) {",
      "        if (!isSafe(row, col)) continue;   // prune the whole subtree",
      "        board[row] = col;",
      "        place(row + 1);",
      "        board[row] = -1;",
      "    }",
      "}"
    ]
  },
  "commonMistakes": [
    "Scanning the board to check safety, which is O(n) per check instead of O(1) with the three boolean arrays.",
    "Getting the diagonal index wrong; row - col ranges from -(n-1) to n-1, so it must be shifted by n-1 to index an array.",
    "Forgetting to clear all three marks on the way out.",
    "Validating only at row == n, which turns a pruned search back into brute-force enumeration."
  ],
  "similar": ["subsets", "permutations"]
})

for problem in P:
    (OUT / (problem["id"] + ".json")).write_text(json.dumps(problem, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", len(P), "problems")
