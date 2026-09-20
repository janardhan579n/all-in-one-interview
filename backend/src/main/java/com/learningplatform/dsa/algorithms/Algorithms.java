package com.learningplatform.dsa.algorithms;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Executable reference implementations of the algorithms taught in the content library.
 *
 * <p>These exist so the Java in the lessons is not merely prose: {@code AlgorithmsTest} exercises
 * every method here, including the edge cases the lessons warn about. If a lesson's code and this
 * class ever disagree, the test suite is the thing that is right.
 *
 * <p>Each method names the pattern it demonstrates and states its complexity.
 */
public final class Algorithms {

    private Algorithms() {
    }

    // ------------------------------------------------------------ sliding window

    /** Fixed-size sliding window. O(n) time, O(1) space. */
    public static int maxSumOfSizeK(int[] nums, int k) {
        if (nums == null || k <= 0 || nums.length < k) {
            throw new IllegalArgumentException("need a non-null array of at least k elements");
        }
        int windowSum = 0;
        int best = Integer.MIN_VALUE;
        for (int right = 0; right < nums.length; right++) {
            windowSum += nums[right];
            if (right >= k - 1) {
                best = Math.max(best, windowSum);
                windowSum -= nums[right - k + 1];
            }
        }
        return best;
    }

    /** Variable-size sliding window. O(n) time, O(min(n, alphabet)) space. */
    public static int longestSubstringWithoutRepeating(String s) {
        if (s == null || s.isEmpty()) {
            return 0;
        }
        Map<Character, Integer> lastSeen = new HashMap<>();
        int left = 0;
        int best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            Integer previous = lastSeen.get(c);
            if (previous != null && previous >= left) {
                left = previous + 1;
            }
            lastSeen.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }

    /** Shrink-while-valid window. Returns 0 when no window qualifies. O(n) time, O(1) space. */
    public static int shortestSubarrayWithSumAtLeast(int[] nums, int target) {
        int left = 0;
        int sum = 0;
        int best = Integer.MAX_VALUE;
        for (int right = 0; right < nums.length; right++) {
            sum += nums[right];
            while (sum >= target) {
                best = Math.min(best, right - left + 1);
                sum -= nums[left++];
            }
        }
        return best == Integer.MAX_VALUE ? 0 : best;
    }

    // -------------------------------------------------------------- two pointers

    /** Converging pointers on a sorted array. O(n) time, O(1) space. */
    public static int[] twoSumSorted(int[] sorted, int target) {
        int left = 0;
        int right = sorted.length - 1;
        while (left < right) {
            int sum = sorted[left] + sorted[right];
            if (sum == target) {
                return new int[]{left, right};
            } else if (sum < target) {
                left++;
            } else {
                right--;
            }
        }
        return new int[]{-1, -1};
    }

    /** Sort + anchor + two pointers, with duplicate suppression. O(n^2) time. */
    public static List<List<Integer>> threeSum(int[] nums) {
        int[] sorted = nums.clone();
        Arrays.sort(sorted);
        List<List<Integer>> result = new ArrayList<>();

        for (int i = 0; i < sorted.length - 2; i++) {
            if (sorted[i] > 0) break;
            if (i > 0 && sorted[i] == sorted[i - 1]) continue;

            int left = i + 1;
            int right = sorted.length - 1;
            while (left < right) {
                int sum = sorted[i] + sorted[left] + sorted[right];
                if (sum < 0) {
                    left++;
                } else if (sum > 0) {
                    right--;
                } else {
                    result.add(List.of(sorted[i], sorted[left], sorted[right]));
                    while (left < right && sorted[left] == sorted[left + 1]) left++;
                    while (left < right && sorted[right] == sorted[right - 1]) right--;
                    left++;
                    right--;
                }
            }
        }
        return result;
    }

    /** Same-direction read/write pointers. Returns the new length. O(n) time, O(1) space. */
    public static int removeDuplicatesInPlace(int[] sortedNums) {
        if (sortedNums.length == 0) {
            return 0;
        }
        int slow = 0;
        for (int fast = 1; fast < sortedNums.length; fast++) {
            if (sortedNums[fast] != sortedNums[slow]) {
                sortedNums[++slow] = sortedNums[fast];
            }
        }
        return slow + 1;
    }

    // ------------------------------------------------------------- binary search

    /** Exact-match template. O(log n). */
    public static int binarySearch(int[] sorted, int target) {
        int low = 0;
        int high = sorted.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;      // overflow-safe
            if (sorted[mid] == target) {
                return mid;
            } else if (sorted[mid] < target) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }

    /** Boundary template: first index whose value is >= target. O(log n). */
    public static int lowerBound(int[] sorted, int target) {
        int low = 0;
        int high = sorted.length;
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (sorted[mid] < target) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low;
    }

    /** Binary search on the ANSWER rather than on an array. O(n log(max pile)). */
    public static int minEatingSpeed(int[] piles, int hours) {
        int low = 1;
        int high = Arrays.stream(piles).max().orElseThrow();
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (hoursNeeded(piles, mid) <= hours) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }
        return low;
    }

    private static long hoursNeeded(int[] piles, int speed) {
        long hours = 0;
        for (int pile : piles) {
            hours += (pile + speed - 1L) / speed;   // ceiling division in long
        }
        return hours;
    }

    // --------------------------------------------------------------- prefix sum

    /** Prefix + HashMap. Correct with negative numbers, unlike a sliding window. O(n). */
    public static int countSubarraysWithSum(int[] nums, int k) {
        Map<Long, Integer> prefixCounts = new HashMap<>();
        prefixCounts.put(0L, 1);                     // the empty prefix
        long running = 0;
        int count = 0;
        for (int x : nums) {
            running += x;
            count += prefixCounts.getOrDefault(running - k, 0);
            prefixCounts.merge(running, 1, Integer::sum);
        }
        return count;
    }

    // ---------------------------------------------------------------- hashing

    /** One-pass complement lookup. O(n) time, O(n) space. */
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer partner = seen.get(target - nums[i]);
            if (partner != null) {
                return new int[]{partner, i};
            }
            seen.put(nums[i], i);                    // after the check: no self-pairing
        }
        return new int[]{-1, -1};
    }

    // ------------------------------------------------------------------ stack

    /** LIFO matching. O(n) time, O(n) space. */
    public static boolean isBalanced(String brackets) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : brackets.toCharArray()) {
            switch (c) {
                case '(' -> stack.push(')');
                case '[' -> stack.push(']');
                case '{' -> stack.push('}');
                default -> {
                    if (stack.isEmpty() || stack.pop() != c) {
                        return false;
                    }
                }
            }
        }
        return stack.isEmpty();
    }

    /** Monotonic stack: days until a warmer temperature. O(n) amortised. */
    public static int[] dailyTemperatures(int[] temperatures) {
        int[] answer = new int[temperatures.length];
        Deque<Integer> pending = new ArrayDeque<>();
        for (int day = 0; day < temperatures.length; day++) {
            while (!pending.isEmpty() && temperatures[day] > temperatures[pending.peek()]) {
                int earlier = pending.pop();
                answer[earlier] = day - earlier;
            }
            pending.push(day);
        }
        return answer;
    }

    // ------------------------------------------------------------ linked list

    public static final class Node {
        public final int value;
        public Node next;

        public Node(int value) {
            this.value = value;
        }

        public static Node of(int... values) {
            Node dummy = new Node(0);
            Node tail = dummy;
            for (int value : values) {
                tail.next = new Node(value);
                tail = tail.next;
            }
            return dummy.next;
        }

        public List<Integer> toList() {
            List<Integer> values = new ArrayList<>();
            for (Node cur = this; cur != null; cur = cur.next) {
                values.add(cur.value);
            }
            return values;
        }
    }

    /** Three-pointer in-place reversal. O(n) time, O(1) space. */
    public static Node reverse(Node head) {
        Node previous = null;
        Node current = head;
        while (current != null) {
            Node next = current.next;
            current.next = previous;
            previous = current;
            current = next;
        }
        return previous;
    }

    /** Fast/slow pointers. Returns the SECOND middle for even-length lists. O(n), O(1). */
    public static Node middle(Node head) {
        Node slow = head;
        Node fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        return slow;
    }

    /** Floyd's cycle detection. O(n) time, O(1) space. */
    public static boolean hasCycle(Node head) {
        Node slow = head;
        Node fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                return true;
            }
        }
        return false;
    }

    /** Floyd phase 2: the node where the cycle begins, or null. */
    public static Node cycleStart(Node head) {
        Node slow = head;
        Node fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                Node walker = head;
                while (walker != slow) {
                    walker = walker.next;
                    slow = slow.next;
                }
                return walker;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------ trees

    public static final class TreeNode {
        public final int value;
        public TreeNode left;
        public TreeNode right;

        public TreeNode(int value) {
            this.value = value;
        }

        public TreeNode(int value, TreeNode left, TreeNode right) {
            this.value = value;
            this.left = left;
            this.right = right;
        }
    }

    public static List<Integer> inorder(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        inorder(root, out);
        return out;
    }

    private static void inorder(TreeNode node, List<Integer> out) {
        if (node == null) return;
        inorder(node.left, out);
        out.add(node.value);
        inorder(node.right, out);
    }

    public static List<Integer> preorder(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        preorder(root, out);
        return out;
    }

    private static void preorder(TreeNode node, List<Integer> out) {
        if (node == null) return;
        out.add(node.value);
        preorder(node.left, out);
        preorder(node.right, out);
    }

    /** BFS with the level-size trick. O(n) time, O(width) space. */
    public static List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> levels = new ArrayList<>();
        if (root == null) return levels;

        Deque<TreeNode> queue = new ArrayDeque<>();
        queue.offer(root);
        while (!queue.isEmpty()) {
            int levelSize = queue.size();            // freeze before enqueuing children
            List<Integer> level = new ArrayList<>(levelSize);
            for (int i = 0; i < levelSize; i++) {
                TreeNode node = queue.poll();
                level.add(node.value);
                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }
            levels.add(level);
        }
        return levels;
    }

    /** Height in nodes. O(n) time, O(h) stack. */
    public static int maxDepth(TreeNode root) {
        return root == null ? 0 : 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }

    /** Validity needs inherited bounds — comparing with the parent alone is the classic bug. */
    public static boolean isBst(TreeNode root) {
        return isBst(root, null, null);
    }

    private static boolean isBst(TreeNode node, Integer low, Integer high) {
        if (node == null) return true;
        if (low != null && node.value <= low) return false;
        if (high != null && node.value >= high) return false;
        return isBst(node.left, low, node.value) && isBst(node.right, node.value, high);
    }

    // ----------------------------------------------------------------- graphs

    /** BFS shortest path in hops, or -1 if unreachable. O(V + E). */
    public static int shortestHops(Map<String, List<String>> graph, String start, String target) {
        if (start.equals(target)) {
            return 0;
        }
        Deque<String> queue = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();
        queue.offer(start);
        visited.add(start);
        int distance = 0;

        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            distance++;
            for (int i = 0; i < levelSize; i++) {
                String node = queue.poll();
                for (String next : graph.getOrDefault(node, List.of())) {
                    if (next.equals(target)) {
                        return distance;
                    }
                    if (visited.add(next)) {         // mark on ENQUEUE
                        queue.offer(next);
                    }
                }
            }
        }
        return -1;
    }

    /** DFS flood fill. Counts connected components of 1s. Mutates the grid. */
    public static int countIslands(int[][] grid) {
        int islands = 0;
        for (int r = 0; r < grid.length; r++) {
            for (int c = 0; c < grid[0].length; c++) {
                if (grid[r][c] == 1) {
                    islands++;
                    sink(grid, r, c);
                }
            }
        }
        return islands;
    }

    private static void sink(int[][] grid, int r, int c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;
        if (grid[r][c] != 1) return;
        grid[r][c] = 0;                              // mark BEFORE recursing
        sink(grid, r + 1, c);
        sink(grid, r - 1, c);
        sink(grid, r, c + 1);
        sink(grid, r, c - 1);
    }

    /** Kahn's algorithm. True if every course can be completed (the graph is acyclic). */
    public static boolean canFinishCourses(int courses, int[][] prerequisites) {
        List<List<Integer>> dependents = new ArrayList<>();
        for (int i = 0; i < courses; i++) {
            dependents.add(new ArrayList<>());
        }
        int[] inDegree = new int[courses];
        for (int[] pair : prerequisites) {
            dependents.get(pair[1]).add(pair[0]);    // edge prereq -> course
            inDegree[pair[0]]++;
        }

        Deque<Integer> ready = new ArrayDeque<>();
        for (int i = 0; i < courses; i++) {
            if (inDegree[i] == 0) ready.offer(i);
        }

        int taken = 0;
        while (!ready.isEmpty()) {
            int course = ready.poll();
            taken++;
            for (int next : dependents.get(course)) {
                if (--inDegree[next] == 0) {
                    ready.offer(next);
                }
            }
        }
        return taken == courses;
    }

    // ------------------------------------------------------------ backtracking

    /** All subsets. O(n * 2^n). */
    public static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        buildSubsets(nums, 0, new ArrayList<>(), result);
        return result;
    }

    private static void buildSubsets(int[] nums, int start, List<Integer> current,
                                     List<List<Integer>> result) {
        result.add(new ArrayList<>(current));        // a COPY, not the live list
        for (int i = start; i < nums.length; i++) {
            current.add(nums[i]);
            buildSubsets(nums, i + 1, current, result);
            current.remove(current.size() - 1);      // unchoose
        }
    }

    /** All permutations. O(n * n!). */
    public static List<List<Integer>> permutations(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        buildPermutations(nums, new ArrayList<>(), new boolean[nums.length], result);
        return result;
    }

    private static void buildPermutations(int[] nums, List<Integer> current, boolean[] used,
                                          List<List<Integer>> result) {
        if (current.size() == nums.length) {
            result.add(new ArrayList<>(current));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            current.add(nums[i]);
            buildPermutations(nums, current, used, result);
            current.remove(current.size() - 1);
            used[i] = false;
        }
    }

    /** N-Queens solution count, with O(1) conflict checks. */
    public static int countNQueens(int n) {
        return placeQueen(0, n, new boolean[n], new boolean[2 * n - 1], new boolean[2 * n - 1]);
    }

    private static int placeQueen(int row, int n, boolean[] cols, boolean[] diag, boolean[] anti) {
        if (row == n) {
            return 1;
        }
        int solutions = 0;
        for (int col = 0; col < n; col++) {
            int d = row - col + (n - 1);
            int a = row + col;
            if (cols[col] || diag[d] || anti[a]) continue;   // prune the whole subtree

            cols[col] = diag[d] = anti[a] = true;
            solutions += placeQueen(row + 1, n, cols, diag, anti);
            cols[col] = diag[d] = anti[a] = false;           // unchoose
        }
        return solutions;
    }

    // --------------------------------------------------- dynamic programming

    /** Rolling-variable DP. O(n) time, O(1) space. */
    public static int climbStairs(int n) {
        if (n <= 1) return 1;
        int twoBack = 1;
        int oneBack = 1;
        for (int i = 2; i <= n; i++) {
            int current = oneBack + twoBack;
            twoBack = oneBack;
            oneBack = current;
        }
        return oneBack;
    }

    /** House robber: no two adjacent. O(n) time, O(1) space. */
    public static int rob(int[] houses) {
        int skipPrevious = 0;
        int robPrevious = 0;
        for (int money : houses) {
            int robThis = skipPrevious + money;
            int skipThis = Math.max(skipPrevious, robPrevious);
            robPrevious = robThis;
            skipPrevious = skipThis;
        }
        return Math.max(robPrevious, skipPrevious);
    }

    /** Unbounded knapsack. Returns -1 when the amount cannot be made. O(amount * coins). */
    public static int coinChange(int[] coins, int amount) {
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, amount + 1);                 // sentinel above any real answer
        dp[0] = 0;
        for (int target = 1; target <= amount; target++) {
            for (int coin : coins) {
                if (coin <= target && dp[target - coin] != amount + 1) {
                    dp[target] = Math.min(dp[target], dp[target - coin] + 1);
                }
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }

    /** Grid DP with a rolling row. O(m*n) time, O(n) space. */
    public static int uniquePaths(int rows, int cols) {
        int[] row = new int[cols];
        Arrays.fill(row, 1);
        for (int r = 1; r < rows; r++) {
            for (int c = 1; c < cols; c++) {
                row[c] = row[c] + row[c - 1];
            }
        }
        return row[cols - 1];
    }
}
