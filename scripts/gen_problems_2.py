"""Generates problem JSON files (batch 2). Run from the repo root: python3 scripts/gen_problems_2.py"""
import json, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "dsa" / "problems"
OUT.mkdir(parents=True, exist_ok=True)
P = []

P.append({
  "id": "three-sum",
  "title": "3Sum",
  "patternId": "two-pointers",
  "difficulty": "advanced",
  "tags": ["array", "two-pointers", "sorting"],
  "statement": "Given an integer array, return all unique triplets [a, b, c] such that a + b + c == 0. The solution set must not contain duplicate triplets.",
  "realWorld": "Portfolio balancing: find sets of three positions whose net exposure cancels out. The deduplication requirement mirrors real reconciliation work, where the same combination reported twice is a bug.",
  "examples": [
    {"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]", "explanation": "Note that [-1,0,1] appears via two different index pairs but must be reported once."},
    {"input": "nums = [0,1,1]", "output": "[]", "explanation": "No triplet sums to zero."},
    {"input": "nums = [0,0,0]", "output": "[[0,0,0]]", "explanation": "Reported once, not three times."}
  ],
  "constraints": ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
  "bruteForce": {
    "idea": "Three nested loops over all triplets, with a set to deduplicate results.",
    "code": [
      "Set<List<Integer>> found = new HashSet<>();",
      "for (int i = 0; i < n; i++)",
      "    for (int j = i + 1; j < n; j++)",
      "        for (int k = j + 1; k < n; k++)",
      "            if (nums[i] + nums[j] + nums[k] == 0) {",
      "                List<Integer> t = new ArrayList<>(List.of(nums[i], nums[j], nums[k]));",
      "                Collections.sort(t);",
      "                found.add(t);",
      "            }"
    ],
    "complexity": {"time": "O(n^3)", "space": "O(number of triplets)"},
    "whySlow": "2.7 * 10^10 iterations at n = 3000. Sorting each triplet to deduplicate adds more constant cost on top."
  },
  "patternIdentification": "Fix one element and the problem reduces to 'two sum to a target' on the remainder. If the array is sorted first, that inner problem is the O(n) two-pointer scan — and sorting also makes duplicates adjacent, which solves the deduplication requirement structurally.",
  "optimized": {
    "idea": "Sort. For each anchor index i, run converging pointers over the suffix looking for -nums[i]. Skip equal anchors, and after recording a hit skip equal values on both sides so no triplet is emitted twice.",
    "code": [
      "public static List<List<Integer>> threeSum(int[] nums) {",
      "    Arrays.sort(nums);",
      "    List<List<Integer>> result = new ArrayList<>();",
      "",
      "    for (int i = 0; i < nums.length - 2; i++) {",
      "        if (nums[i] > 0) break;                        // sorted: sum can only grow",
      "        if (i > 0 && nums[i] == nums[i - 1]) continue; // skip duplicate anchors",
      "",
      "        int left = i + 1;",
      "        int right = nums.length - 1;",
      "        while (left < right) {",
      "            int sum = nums[i] + nums[left] + nums[right];",
      "            if (sum < 0) {",
      "                left++;",
      "            } else if (sum > 0) {",
      "                right--;",
      "            } else {",
      "                result.add(List.of(nums[i], nums[left], nums[right]));",
      "                while (left < right && nums[left]  == nums[left + 1])  left++;",
      "                while (left < right && nums[right] == nums[right - 1]) right--;",
      "                left++;",
      "                right--;",
      "            }",
      "        }",
      "    }",
      "    return result;",
      "}"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(1) ignoring the output and the sort's internal space"}
  },
  "commonMistakes": [
    "Forgetting to skip duplicate anchors, producing repeated triplets.",
    "Skipping duplicates only on one side after a match.",
    "Deduplicating with a HashSet of sorted lists — it works, but it hides that sorting already solved the problem and costs extra memory.",
    "Not breaking early when nums[i] > 0, which is a free pruning step on sorted input."
  ],
  "similar": ["two-sum-sorted", "container-with-most-water", "two-sum"]
})

P.append({
  "id": "binary-search-basic",
  "title": "Binary Search",
  "patternId": "binary-search",
  "difficulty": "beginner",
  "tags": ["array", "binary-search", "sorted"],
  "statement": "Given a sorted array of distinct integers and a target, return the index of the target, or -1 if it is not present. Your algorithm must run in O(log n).",
  "realWorld": "Every index lookup in a database, every version resolution in a package manager, and `git bisect` are this algorithm with a different predicate.",
  "examples": [
    {"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4", "explanation": ""},
    {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1", "explanation": "Not present."}
  ],
  "constraints": ["1 <= nums.length <= 10^4", "All values are distinct and sorted ascending"],
  "bruteForce": {
    "idea": "Scan from the start until you find the target.",
    "code": [
      "for (int i = 0; i < nums.length; i++) {",
      "    if (nums[i] == target) return i;",
      "}",
      "return -1;"
    ],
    "complexity": {"time": "O(n)", "space": "O(1)"},
    "whySlow": "It discards sortedness. Comparing against the middle element reveals which half the answer is in; a linear scan learns nothing from each comparison beyond that one cell."
  },
  "patternIdentification": "Sorted input plus an explicit O(log n) requirement. The halving structure is being asked for by name.",
  "optimized": {
    "idea": "Track a candidate range. Compare with the midpoint and discard the half that cannot contain the target.",
    "code": [
      "public static int search(int[] nums, int target) {",
      "    int low = 0;",
      "    int high = nums.length - 1;",
      "",
      "    while (low <= high) {",
      "        int mid = low + (high - low) / 2;   // overflow-safe",
      "        if (nums[mid] == target) {",
      "            return mid;",
      "        } else if (nums[mid] < target) {",
      "            low = mid + 1;",
      "        } else {",
      "            high = mid - 1;",
      "        }",
      "    }",
      "    return -1;",
      "}"
    ],
    "complexity": {"time": "O(log n)", "space": "O(1)"}
  },
  "visualization": {
    "engine": "binarySearch",
    "input": {"array": [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], "target": 23},
    "code": [
      "int low = 0, high = nums.length - 1;",
      "while (low <= high) {",
      "    int mid = low + (high - low) / 2;",
      "    if (nums[mid] == target) return mid;",
      "    if (nums[mid] < target) low = mid + 1;",
      "    else                    high = mid - 1;",
      "}",
      "return -1;"
    ]
  },
  "commonMistakes": [
    "mid = (low + high) / 2 overflows for large indices — a real JDK bug for nine years.",
    "Using low < high with mid +/- 1, which can skip the final candidate.",
    "Assigning low = mid instead of mid + 1, producing an infinite loop."
  ],
  "similar": ["search-rotated-array", "koko-eating-bananas"]
})

P.append({
  "id": "search-rotated-array",
  "title": "Search in Rotated Sorted Array",
  "patternId": "binary-search",
  "difficulty": "intermediate",
  "tags": ["array", "binary-search"],
  "statement": "A sorted array of distinct values was rotated at an unknown pivot (e.g. [0,1,2,4,5,6,7] became [4,5,6,7,0,1,2]). Given the rotated array and a target, return its index, or -1. Must run in O(log n).",
  "realWorld": "Searching a circular log buffer or a ring of time-series shards where the write head has wrapped around — the data is still ordered, just starting from an arbitrary offset.",
  "examples": [
    {"input": "nums = [4,5,6,7,0,1,2], target = 0", "output": "4", "explanation": ""},
    {"input": "nums = [4,5,6,7,0,1,2], target = 3", "output": "-1", "explanation": ""}
  ],
  "constraints": ["1 <= nums.length <= 5000", "All values distinct", "The array is a rotation of a sorted array"],
  "bruteForce": {
    "idea": "Linear scan, ignoring the structure.",
    "code": ["for (int i = 0; i < nums.length; i++) if (nums[i] == target) return i;", "return -1;"],
    "complexity": {"time": "O(n)", "space": "O(1)"},
    "whySlow": "The array is not globally sorted, but it is *locally* sorted in a way binary search can still exploit — a linear scan leaves that on the table, and the problem demands O(log n)."
  },
  "patternIdentification": "The key observation: when you split a rotated sorted array at any midpoint, at least one of the two halves is fully sorted. Test which one, then decide whether the target lies inside that sorted half. That restores the halving property.",
  "optimized": {
    "idea": "At each step determine which half is sorted by comparing nums[low] with nums[mid]. If the target lies within the sorted half's range, search there; otherwise search the other half.",
    "code": [
      "public static int search(int[] nums, int target) {",
      "    int low = 0, high = nums.length - 1;",
      "",
      "    while (low <= high) {",
      "        int mid = low + (high - low) / 2;",
      "        if (nums[mid] == target) return mid;",
      "",
      "        if (nums[low] <= nums[mid]) {           // left half is sorted",
      "            if (nums[low] <= target && target < nums[mid]) {",
      "                high = mid - 1;                 // target is inside the sorted left",
      "            } else {",
      "                low = mid + 1;",
      "            }",
      "        } else {                                // right half is sorted",
      "            if (nums[mid] < target && target <= nums[high]) {",
      "                low = mid + 1;                  // target is inside the sorted right",
      "            } else {",
      "                high = mid - 1;",
      "            }",
      "        }",
      "    }",
      "    return -1;",
      "}"
    ],
    "complexity": {"time": "O(log n)", "space": "O(1)"}
  },
  "commonMistakes": [
    "Using < instead of <= in nums[low] <= nums[mid]; when low == mid the left half is trivially sorted and the wrong branch is taken.",
    "Getting the inclusive/exclusive bounds wrong in the range tests — target < nums[mid] but target <= nums[high].",
    "Trying to find the pivot first with a separate search and then binary searching; correct, but two passes where one suffices.",
    "Assuming it still works with duplicates — it does not; nums[low] == nums[mid] becomes ambiguous and the worst case degrades to O(n)."
  ],
  "similar": ["binary-search-basic", "koko-eating-bananas"]
})

P.append({
  "id": "koko-eating-bananas",
  "title": "Koko Eating Bananas",
  "patternId": "binary-search",
  "difficulty": "advanced",
  "tags": ["array", "binary-search", "answer-space"],
  "statement": "Koko has piles of bananas and h hours before the guards return. She picks an eating speed k bananas/hour; each hour she eats from one pile, and if that pile has fewer than k left she finishes it and waits. Return the minimum k that lets her finish all the piles within h hours.",
  "realWorld": "Capacity planning in its purest form: the smallest number of workers, threads or provisioned IOPS that clears a backlog inside an SLA. Autoscalers solve exactly this shape.",
  "examples": [
    {"input": "piles = [3,6,7,11], h = 8", "output": "4", "explanation": "At k=4 the hours are 1+2+2+3 = 8. At k=3 it would be 1+2+3+4 = 10 > 8."},
    {"input": "piles = [30,11,23,4,20], h = 6", "output": "23", "explanation": ""}
  ],
  "constraints": ["1 <= piles.length <= 10^4", "piles.length <= h <= 10^9", "1 <= piles[i] <= 10^9"],
  "bruteForce": {
    "idea": "Try every speed from 1 upwards until one finishes in time.",
    "code": [
      "for (int speed = 1; speed <= max(piles); speed++) {",
      "    if (hoursNeeded(piles, speed) <= h) return speed;",
      "}"
    ],
    "complexity": {"time": "O(max(piles) * n)", "space": "O(1)"},
    "whySlow": "max(piles) can be 10^9 and n can be 10^4, so 10^13 operations. But note the structure the loop ignores: once a speed works, every faster speed also works."
  },
  "patternIdentification": "'Minimum X such that a condition holds' + a feasibility check that is monotonic in X = binary search on the answer. There is no sorted array here at all — the search space is the range of possible speeds.",
  "optimized": {
    "idea": "The predicate canFinish(speed) is false for slow speeds and true from the answer onwards, and never flips back. Binary search the speed range [1, max pile] for that boundary, evaluating the predicate with an O(n) simulation at each probe.",
    "code": [
      "public static int minEatingSpeed(int[] piles, int h) {",
      "    int low = 1;",
      "    int high = Arrays.stream(piles).max().orElseThrow();",
      "",
      "    while (low < high) {",
      "        int mid = low + (high - low) / 2;",
      "        if (hoursNeeded(piles, mid) <= h) {",
      "            high = mid;        // feasible: this speed might be the answer, keep it",
      "        } else {",
      "            low = mid + 1;     // too slow: the answer is strictly faster",
      "        }",
      "    }",
      "    return low;                // low == high == smallest feasible speed",
      "}",
      "",
      "private static long hoursNeeded(int[] piles, int speed) {",
      "    long hours = 0;",
      "    for (int pile : piles) {",
      "        hours += (pile + speed - 1) / speed;   // ceiling division, no floating point",
      "    }",
      "    return hours;",
      "}"
    ],
    "complexity": {"time": "O(n log(max pile))", "space": "O(1)"}
  },
  "visualization": {
    "engine": "binarySearchAnswer",
    "input": {"piles": [30, 11, 23, 4, 20], "hours": 6},
    "code": [
      "int low = 1, high = max(piles);",
      "while (low < high) {",
      "    int mid = low + (high - low) / 2;",
      "    if (hoursNeeded(piles, mid) <= h) high = mid;",
      "    else                              low = mid + 1;",
      "}",
      "return low;"
    ]
  },
  "commonMistakes": [
    "Accumulating hours in an int — 10^4 piles of 10^9 bananas at speed 1 overflows immediately. Use long.",
    "Using Math.ceil with doubles; floating point loses precision at 10^9. Integer ceiling division is exact.",
    "Starting low at 0, which causes division by zero.",
    "Mixing templates: with while (low < high) you must use high = mid, never high = mid - 1, or you can skip the answer."
  ],
  "similar": ["binary-search-basic", "search-rotated-array"]
})

P.append({
  "id": "middle-of-linked-list",
  "title": "Middle of the Linked List",
  "patternId": "fast-slow-pointer",
  "difficulty": "beginner",
  "tags": ["linked-list", "two-pointers"],
  "statement": "Given the head of a singly linked list, return the middle node. If there are two middle nodes, return the second one.",
  "realWorld": "Splitting a stream into halves for merge sort, or finding the median position of a list you can only traverse forwards — for example a paged API result you cannot index into.",
  "examples": [
    {"input": "[1,2,3,4,5]", "output": "Node 3", "explanation": "Odd length: the exact middle."},
    {"input": "[1,2,3,4,5,6]", "output": "Node 4", "explanation": "Even length: the second of the two middles."}
  ],
  "constraints": ["1 <= number of nodes <= 100"],
  "bruteForce": {
    "idea": "Walk the list once to count the nodes, then walk again to node n/2.",
    "code": [
      "int n = 0;",
      "for (Node cur = head; cur != null; cur = cur.next) n++;",
      "Node cur = head;",
      "for (int i = 0; i < n / 2; i++) cur = cur.next;",
      "return cur;"
    ],
    "complexity": {"time": "O(n), two passes", "space": "O(1)"},
    "whySlow": "Correct and O(n), but it needs two traversals. For a stream you can only read once — or a list too large to traverse twice cheaply — that is a real limitation, and interviewers ask for a single pass."
  },
  "patternIdentification": "'Middle in one pass' is the fast/slow pointer. When the fast pointer has travelled 2k steps, the slow pointer has travelled k.",
  "optimized": {
    "idea": "Advance slow by one and fast by two. When fast runs off the end, slow is at the middle by construction.",
    "code": [
      "public static Node middleNode(Node head) {",
      "    Node slow = head;",
      "    Node fast = head;",
      "    while (fast != null && fast.next != null) {",
      "        slow = slow.next;",
      "        fast = fast.next.next;",
      "    }",
      "    return slow;   // second middle when the length is even",
      "}"
    ],
    "complexity": {"time": "O(n), one pass", "space": "O(1)"}
  },
  "visualization": {
    "engine": "fastSlowPointer",
    "input": {"values": [1, 2, 3, 4, 5, 6, 7], "mode": "middle"},
    "code": [
      "Node slow = head, fast = head;",
      "while (fast != null && fast.next != null) {",
      "    slow = slow.next;",
      "    fast = fast.next.next;",
      "}",
      "return slow;"
    ]
  },
  "commonMistakes": [
    "Guarding with fast != null only; fast.next.next then throws on even-length lists.",
    "Starting fast at head.next, which returns the first middle rather than the second — check which the problem wants.",
    "Returning slow.next or slow.prev out of uncertainty instead of reasoning about the two cases."
  ],
  "similar": ["linked-list-cycle", "find-duplicate-number"]
})

P.append({
  "id": "linked-list-cycle",
  "title": "Linked List Cycle",
  "patternId": "fast-slow-pointer",
  "difficulty": "intermediate",
  "tags": ["linked-list", "two-pointers", "cycle"],
  "statement": "Given the head of a linked list, determine whether it contains a cycle. Solve it using O(1) extra space.",
  "realWorld": "Detecting reference cycles that keep objects alive (memory leaks), symlink loops in a filesystem walk, and HTTP redirect loops. All are 'does following the pointers ever bring me back?'.",
  "examples": [
    {"input": "head = [3,2,0,-4], tail connects to index 1", "output": "true", "explanation": "The last node points back to the node with value 2."},
    {"input": "head = [1,2], no cycle", "output": "false", "explanation": ""}
  ],
  "constraints": ["0 <= number of nodes <= 10^4", "O(1) extra space required"],
  "bruteForce": {
    "idea": "Store every visited node in a HashSet; a repeat means a cycle.",
    "code": [
      "Set<Node> seen = new HashSet<>();",
      "for (Node cur = head; cur != null; cur = cur.next) {",
      "    if (!seen.add(cur)) return true;",
      "}",
      "return false;"
    ],
    "complexity": {"time": "O(n)", "space": "O(n)"},
    "whySlow": "The time is optimal; the memory is the problem. Storing a reference per node doubles the footprint of the structure being inspected, and the problem forbids it."
  },
  "patternIdentification": "Cycle detection with an O(1) space constraint is Floyd's tortoise and hare, essentially by definition.",
  "optimized": {
    "idea": "Two pointers at speeds 1 and 2. Inside a cycle the gap closes by exactly one node per step, so a meeting is guaranteed; reaching null proves there is no cycle.",
    "code": [
      "public static boolean hasCycle(Node head) {",
      "    Node slow = head;",
      "    Node fast = head;",
      "    while (fast != null && fast.next != null) {",
      "        slow = slow.next;",
      "        fast = fast.next.next;",
      "        if (slow == fast) return true;   // reference equality, not value",
      "    }",
      "    return false;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(1)"}
  },
  "visualization": {
    "engine": "fastSlowPointer",
    "input": {"values": [3, 2, 0, -4, 9, 6], "cycleAt": 2, "mode": "cycle"},
    "code": [
      "Node slow = head, fast = head;",
      "while (fast != null && fast.next != null) {",
      "    slow = slow.next;",
      "    fast = fast.next.next;",
      "    if (slow == fast) return true;",
      "}",
      "return false;"
    ]
  },
  "commonMistakes": [
    "Comparing slow.val == fast.val instead of slow == fast — duplicate values then report a cycle that does not exist.",
    "Checking equality before advancing, when both start at head and are trivially equal.",
    "Assuming the meeting point is the cycle entry; finding the entry needs a second phase from the head."
  ],
  "similar": ["middle-of-linked-list", "find-duplicate-number"]
})

P.append({
  "id": "find-duplicate-number",
  "title": "Find the Duplicate Number",
  "patternId": "fast-slow-pointer",
  "difficulty": "advanced",
  "tags": ["array", "two-pointers", "cycle"],
  "statement": "Given an array of n+1 integers where each value is in the range [1, n], exactly one value is repeated (possibly many times). Find it without modifying the array and using only O(1) extra space.",
  "realWorld": "Finding a duplicated ID in a batch you are not permitted to mutate — an audit log, a shared buffer, or a memory-mapped file — where allocating a set the size of the batch is not an option.",
  "examples": [
    {"input": "nums = [1,3,4,2,2]", "output": "2", "explanation": ""},
    {"input": "nums = [3,1,3,4,2]", "output": "3", "explanation": ""}
  ],
  "constraints": ["1 <= n <= 10^5", "nums.length == n + 1", "1 <= nums[i] <= n", "Must not modify the array", "O(1) extra space"],
  "bruteForce": {
    "idea": "A HashSet of seen values, or sort and check neighbours.",
    "code": [
      "Set<Integer> seen = new HashSet<>();",
      "for (int x : nums) if (!seen.add(x)) return x;",
      "return -1;",
      "// or: Arrays.sort(nums) then compare adjacent — but that MODIFIES the array"
    ],
    "complexity": {"time": "O(n)", "space": "O(n)"},
    "whySlow": "Both constraints are violated: the set is O(n) space, and sorting mutates the input. The two forbidden solutions are precisely what the constraints are there to rule out."
  },
  "patternIdentification": "The insight is a reframing. Treat the array as a function i -> nums[i]. Starting at index 0 and repeatedly following that mapping traces a path through indices. Because values lie in [1,n] and there are n+1 of them, two indices must map to the same place — the sequence must eventually revisit a value, i.e. it has a cycle, and the cycle entry is the duplicate.",
  "optimized": {
    "idea": "Run Floyd's cycle detection on the implicit linked list defined by next(i) = nums[i]. Phase 1 finds a meeting point; phase 2 restarts one pointer at the beginning and walks both at speed 1 to find the cycle entry, which is the duplicated value.",
    "code": [
      "public static int findDuplicate(int[] nums) {",
      "    // Phase 1: find a meeting point inside the cycle",
      "    int slow = nums[0];",
      "    int fast = nums[0];",
      "    do {",
      "        slow = nums[slow];",
      "        fast = nums[nums[fast]];",
      "    } while (slow != fast);",
      "",
      "    // Phase 2: the distance from the start to the entry equals the distance",
      "    // from the meeting point to the entry, so equal-speed walking converges there",
      "    slow = nums[0];",
      "    while (slow != fast) {",
      "        slow = nums[slow];",
      "        fast = nums[fast];",
      "    }",
      "    return slow;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(1)"}
  },
  "commonMistakes": [
    "Using a while loop instead of do-while in phase 1 — slow and fast start equal, so the loop would exit immediately.",
    "Marking visited values by negating nums[i]; clever and O(1) space, but it modifies the array, which is forbidden here.",
    "Believing the meeting point is the answer. Phase 2 is required.",
    "Missing the alternative: binary search on the value range counting how many elements are <= mid, which is O(n log n) time, O(1) space — worth mentioning as a second valid answer."
  ],
  "similar": ["linked-list-cycle", "contains-duplicate"]
})

P.append({
  "id": "valid-parentheses",
  "title": "Valid Parentheses",
  "patternId": "stack",
  "difficulty": "beginner",
  "tags": ["string", "stack"],
  "statement": "Given a string containing only the characters ()[]{}, determine whether every bracket is closed by the same type in the correct order.",
  "realWorld": "Every parser, linter and syntax highlighter does this. JSON and XML validation is the same algorithm with richer tokens.",
  "examples": [
    {"input": "s = \"()[]{}\"", "output": "true", "explanation": ""},
    {"input": "s = \"([)]\"", "output": "false", "explanation": "Correct counts, wrong nesting order."},
    {"input": "s = \"{[]}\"", "output": "true", "explanation": ""}
  ],
  "constraints": ["1 <= s.length <= 10^4", "s consists only of the six bracket characters"],
  "bruteForce": {
    "idea": "Repeatedly delete adjacent matching pairs until the string stops changing; it is valid if nothing is left.",
    "code": [
      "String prev;",
      "do {",
      "    prev = s;",
      "    s = s.replace(\"()\", \"\").replace(\"[]\", \"\").replace(\"{}\", \"\");",
      "} while (!s.equals(prev));",
      "return s.isEmpty();"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(n)"},
    "whySlow": "Each pass rebuilds the entire string and removes at most a few pairs, so up to n/2 passes of O(n) work. Counting brackets instead would be O(n) but is simply wrong — it accepts \")(\"."
  },
  "patternIdentification": "A closing bracket can only match the most recent unmatched opener. 'Most recent' is LIFO, which is a stack.",
  "optimized": {
    "idea": "Push the expected closing bracket whenever you see an opener. On a closer, pop and compare. Two failure modes: popping an empty stack, and a non-empty stack at the end.",
    "code": [
      "public static boolean isValid(String s) {",
      "    Deque<Character> stack = new ArrayDeque<>();",
      "    for (char c : s.toCharArray()) {",
      "        switch (c) {",
      "            case '(' -> stack.push(')');   // push what we EXPECT next",
      "            case '[' -> stack.push(']');",
      "            case '{' -> stack.push('}');",
      "            default  -> {",
      "                if (stack.isEmpty() || stack.pop() != c) return false;",
      "            }",
      "        }",
      "    }",
      "    return stack.isEmpty();   // leftovers mean unclosed openers",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(n) worst case, e.g. \"((((((\""}
  },
  "visualization": {
    "engine": "balancedBrackets",
    "input": {"text": "{[()]}"},
    "code": [
      "Deque<Character> stack = new ArrayDeque<>();",
      "for (char c : s.toCharArray()) {",
      "    if (isOpener(c)) stack.push(expectedCloser(c));",
      "    else if (stack.isEmpty() || stack.pop() != c) return false;",
      "}",
      "return stack.isEmpty();"
    ]
  },
  "commonMistakes": [
    "Forgetting the final isEmpty() check, so \"(((\" is reported valid.",
    "Popping without checking isEmpty(), throwing on \")))\".",
    "Counting brackets instead of tracking order, which accepts \")(\".",
    "Using java.util.Stack; ArrayDeque is the modern, unsynchronised choice."
  ],
  "similar": ["daily-temperatures"]
})

P.append({
  "id": "daily-temperatures",
  "title": "Daily Temperatures",
  "patternId": "stack",
  "difficulty": "intermediate",
  "tags": ["array", "stack", "monotonic-stack"],
  "statement": "Given daily temperatures, return an array where answer[i] is the number of days you must wait after day i for a warmer temperature. If there is no such day, put 0.",
  "realWorld": "'How long until the next spike above this level?' in monitoring, and 'next higher bid' in order-book processing. The monotonic stack is standard equipment in time-series analysis.",
  "examples": [
    {"input": "temperatures = [73,74,75,71,69,72,76,73]", "output": "[1,1,4,2,1,1,0,0]", "explanation": "Day 2 (75) waits until day 6 (76), which is 4 days."},
    {"input": "temperatures = [30,40,50,60]", "output": "[1,1,1,0]", "explanation": ""}
  ],
  "constraints": ["1 <= temperatures.length <= 10^5", "30 <= temperatures[i] <= 100"],
  "bruteForce": {
    "idea": "For each day, scan forward until a warmer day is found.",
    "code": [
      "int[] answer = new int[n];",
      "for (int i = 0; i < n; i++) {",
      "    for (int j = i + 1; j < n; j++) {",
      "        if (temperatures[j] > temperatures[i]) {",
      "            answer[i] = j - i;",
      "            break;",
      "        }",
      "    }",
      "}",
      "return answer;"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(1) extra"},
    "whySlow": "A long descending run makes every day scan nearly to the end — 10^10 operations at the upper constraint. Each rescan re-examines days already known to be too cold."
  },
  "patternIdentification": "'Next greater element' is the monotonic stack signature. Days waiting for a warmer day resolve most-recent-first, which is LIFO: when a warm day arrives, it settles every pending colder day at once.",
  "optimized": {
    "idea": "Keep a stack of indices whose answer is still unknown, with temperatures decreasing from bottom to top. When a warmer day arrives, pop and resolve every index it beats. Each index is pushed once and popped once.",
    "code": [
      "public static int[] dailyTemperatures(int[] temperatures) {",
      "    int n = temperatures.length;",
      "    int[] answer = new int[n];",
      "    Deque<Integer> pending = new ArrayDeque<>();   // indices, temps decreasing",
      "",
      "    for (int day = 0; day < n; day++) {",
      "        while (!pending.isEmpty()",
      "               && temperatures[day] > temperatures[pending.peek()]) {",
      "            int earlier = pending.pop();",
      "            answer[earlier] = day - earlier;       // resolved",
      "        }",
      "        pending.push(day);",
      "    }",
      "    return answer;   // anything left on the stack keeps its default 0",
      "}"
    ],
    "complexity": {"time": "O(n) — each index is pushed once and popped at most once", "space": "O(n)"}
  },
  "commonMistakes": [
    "Storing temperatures on the stack instead of indices; you need the index to compute the gap.",
    "Using if instead of while, so one warm day resolves only the single most recent pending day.",
    "Claiming O(n^2) because of the nested while — the amortised argument (each index enters and leaves once) gives O(n).",
    "Forgetting that unresolved days keep the default 0, which Java's zero-initialised array gives for free."
  ],
  "similar": ["valid-parentheses"]
})

P.append({
  "id": "binary-tree-level-order",
  "title": "Binary Tree Level Order Traversal",
  "patternId": "bfs",
  "difficulty": "beginner",
  "tags": ["tree", "bfs", "queue"],
  "statement": "Given the root of a binary tree, return its node values grouped by level, from left to right, top to bottom.",
  "realWorld": "Rendering a hierarchy one depth at a time — an org chart, a comment thread, a category menu — or serialising a tree for transport in a format that preserves shape.",
  "examples": [
    {"input": "root = [3,9,20,null,null,15,7]", "output": "[[3],[9,20],[15,7]]", "explanation": "Three levels."},
    {"input": "root = []", "output": "[]", "explanation": "Empty tree."}
  ],
  "constraints": ["0 <= number of nodes <= 2000", "-1000 <= Node.val <= 1000"],
  "bruteForce": {
    "idea": "Compute the height, then for each depth re-walk the tree collecting only the nodes at that depth.",
    "code": [
      "for (int depth = 0; depth < height(root); depth++) {",
      "    List<Integer> level = new ArrayList<>();",
      "    collectAtDepth(root, depth, level);   // re-walks from the root every time",
      "    result.add(level);",
      "}"
    ],
    "complexity": {"time": "O(n * h) — up to O(n^2) for a skewed tree", "space": "O(h)"},
    "whySlow": "Each level re-traverses everything above it. The root is visited h times, its children h-1 times, and so on."
  },
  "patternIdentification": "'Level by level' is breadth-first search by definition. The refinement that makes it produce grouped output is freezing the queue size before each level.",
  "optimized": {
    "idea": "BFS with a queue. Capture queue.size() before the inner loop — that is exactly the number of nodes at the current depth, so one inner loop drains precisely one level.",
    "code": [
      "public static List<List<Integer>> levelOrder(TreeNode root) {",
      "    List<List<Integer>> levels = new ArrayList<>();",
      "    if (root == null) return levels;",
      "",
      "    Queue<TreeNode> queue = new ArrayDeque<>();",
      "    queue.offer(root);",
      "",
      "    while (!queue.isEmpty()) {",
      "        int levelSize = queue.size();          // freeze BEFORE adding children",
      "        List<Integer> level = new ArrayList<>(levelSize);",
      "",
      "        for (int i = 0; i < levelSize; i++) {",
      "            TreeNode node = queue.poll();",
      "            level.add(node.val);",
      "            if (node.left  != null) queue.offer(node.left);",
      "            if (node.right != null) queue.offer(node.right);",
      "        }",
      "        levels.add(level);",
      "    }",
      "    return levels;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(w) where w is the widest level — up to n/2"}
  },
  "commonMistakes": [
    "Not freezing queue.size(), so levels bleed into one another.",
    "Enqueueing null children, then null-checking on dequeue — it works but wastes queue space and invites NPEs.",
    "Forgetting the empty-root case.",
    "Using ArrayList.remove(0) as a queue, which is O(n) per removal and turns this into O(n^2)."
  ],
  "similar": ["rotting-oranges", "max-depth-binary-tree"]
})

for problem in P:
    (OUT / (problem["id"] + ".json")).write_text(json.dumps(problem, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("wrote", len(P), "problems")
