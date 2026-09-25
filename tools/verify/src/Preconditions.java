package verify;

import java.util.*;

/**
 * Repairs for the preconditions a type-driven generator cannot express.
 *
 * Most constraints are ranges, and `domains.py` reads those straight out of each problem's own
 * `constraints` list. A handful are *structural* — "every element appears exactly twice except
 * one", "the grid is a permutation of 0..n²−1", "both arrays are already sorted" — and no amount
 * of bounding a random int will produce them.
 *
 * The lazy answer is to skip those problems. That is worse than it sounds: they are among the
 * hardest in the bank to get right, so skipping them removes the test exactly where it would earn
 * its keep. Each one gets a named repair instead, which takes the randomly generated arguments
 * and adjusts them into the nearest legal input, keeping the randomness. It found a real defect
 * on the first run: number-of-operations-to-connect's brute force counted each cable's individual
 * redundancy, which overcounts a triangle three-to-one.
 *
 * Two rules this file follows:
 *   - A repair may only make an input *more* legal. It never encodes an expected answer, and it
 *     never special-cases the very edge a solution might get wrong.
 *   - A repair is keyed to a constraint the problem actually states, quoted above it, so a reader
 *     can check that the harness enforces the problem's rule and not the author's convenience.
 */
final class Preconditions {

    interface Repair {
        void apply(Object[] args, Random random);
    }

    private static final Map<String, Repair> REPAIRS = new HashMap<>();

    static {
        // "All candidates are distinct" · "2 <= candidates[i] <= 40" · "1 <= target <= 40"
        REPAIRS.put("combination-sum", (args, random) -> {
            if (args[0] instanceof int[] candidates && args.length > 1) {
                int[] distinct = Arrays.stream(candidates).map(v -> 2 + Math.floorMod(v, 8)).distinct().toArray();
                args[0] = distinct.length == 0 ? new int[] {2} : distinct;
                args[1] = 1 + Math.floorMod((Integer) args[1], 12);
            }
        });

        // "Every element appears exactly twice except one, which appears once" · "length is odd"
        REPAIRS.put("single-number", (args, random) -> {
            if (args[0] instanceof int[] values) {
                List<Integer> built = new ArrayList<>();
                for (int i = 0; i < values.length / 2; i++) {
                    built.add(values[i]);
                    built.add(values[i]);
                }
                built.add(values.length == 0 ? random.nextInt(-10, 10) : values[values.length - 1] + 101);
                Collections.shuffle(built, random);
                args[0] = built.stream().mapToInt(Integer::intValue).toArray();
            }
        });

        // "the grid is a permutation of 0 .. n*n - 1" · "n == grid.length == grid[i].length"
        REPAIRS.put("swim-in-rising-water", (args, random) -> args[0] = permutationGrid(random));

        // "nums1.length == m + n" · "nums2.length == n" · "Both inputs are already sorted"
        REPAIRS.put("merge-sorted-array", (args, random) -> {
            if (args.length < 4) return;
            int m = 1 + random.nextInt(4);
            int n = 1 + random.nextInt(4);
            int[] first = new int[m];
            int[] second = new int[n];
            for (int i = 0; i < m; i++) first[i] = random.nextInt(-20, 20);
            for (int i = 0; i < n; i++) second[i] = random.nextInt(-20, 20);
            Arrays.sort(first);
            Arrays.sort(second);
            int[] nums1 = new int[m + n];
            System.arraycopy(first, 0, nums1, 0, m);   // the tail stays zero, as the problem says
            args[0] = nums1;
            args[1] = m;
            args[2] = second;
            args[3] = n;
        });

        // "0 <= connections[i][0], connections[i][1] < n" · no self loops · no duplicate cables
        REPAIRS.put("number-of-operations-to-connect", (args, random) -> edges(args, 0));

        // "1 <= relations[i][0], relations[i][1] <= n" · no self loops · all pairs distinct
        REPAIRS.put("parallel-courses", (args, random) -> edges(args, 1));

        // "1 <= k <= the number of nodes in the tree"
        REPAIRS.put("kth-smallest-in-bst", (args, random) -> {
            if (args.length > 1 && args[0] instanceof Support.TreeNode root) {
                args[1] = 1 + Math.floorMod((Integer) args[1], Math.max(1, countNodes(root)));
            }
        });

        // "p and q are nodes that exist in the tree" — the whole question is where they meet, and
        // three independently generated trees is not a question at all. The repair replaces p and
        // q with values actually present in the tree, which is what a BST implementation compares
        // on. Note it does NOT hand back references into the tree: each argument is deep-copied
        // before the call, so reference identity would not survive anyway.
        REPAIRS.put("lowest-common-ancestor-bst", (args, random) -> {
            if (args.length > 2 && args[0] instanceof Support.TreeNode root) {
                List<Integer> values = new ArrayList<>();
                collectValues(root, values);
                if (values.isEmpty()) return;
                args[1] = new Support.TreeNode(values.get(random.nextInt(values.size())));
                args[2] = new Support.TreeNode(values.get(random.nextInt(values.size())));
            }
        });

        // "1 <= k <= nums.length" · "k is always valid — there are at least k elements"
        REPAIRS.put("kth-largest-element", (args, random) -> {
            if (args[0] instanceof int[] values && args.length > 1) {
                if (values.length == 0) {
                    values = new int[] {random.nextInt(-10, 10)};
                    args[0] = values;
                }
                args[1] = 1 + Math.floorMod((Integer) args[1], values.length);
            }
        });

        // "intervals[i].length == 2 and 0 <= start < end <= 10^6"
        REPAIRS.put("meeting-rooms", (args, random) -> intervals(args, true));

        // "0 <= start_i < end_i <= 10^6" · "Intervals are half-open: [start, end)"
        REPAIRS.put("meeting-rooms-ii", (args, random) -> intervals(args, true));

        // "intervals[i].length == 2" · "0 <= start_i <= end_i <= 10^4"
        REPAIRS.put("merge-intervals", (args, random) -> intervals(args, false));

        // "Both arrays are sorted ascending"
        REPAIRS.put("median-two-sorted-arrays", (args, random) -> {
            if (args[0] instanceof int[] a) Arrays.sort(a);
            if (args.length > 1 && args[1] instanceof int[] b) Arrays.sort(b);
        });

        // "both input lists are already sorted in non-decreasing order"
        REPAIRS.put("merge-two-sorted-lists", (args, random) -> {
            for (Object arg : args) sortNodeList(arg);
        });

        // "edges.length == n - 1" · "0 <= u, v < n and the input is guaranteed to be a tree"
        // Random endpoints are almost never a tree, and both implementations then index past the
        // end of the adjacency list. Each new label is attached to a label already placed, which
        // is connected and acyclic by construction, and the labels are then permuted so the
        // numbering carries no information about depth.
        REPAIRS.put("min-height-trees", (args, random) -> {
            if (args.length < 2 || !(args[0] instanceof Integer n) || n < 1) return;
            int[] label = new int[n];
            for (int i = 0; i < n; i++) label[i] = i;
            for (int i = n - 1; i > 0; i--) {
                int j = random.nextInt(i + 1);
                int swap = label[i];
                label[i] = label[j];
                label[j] = swap;
            }
            int[][] tree = new int[n - 1][2];
            for (int child = 1; child < n; child++) {
                tree[child - 1][0] = label[random.nextInt(child)];
                tree[child - 1][1] = label[child];
            }
            args[1] = tree;
        });

        // "digits[i] is one of '2' through '9'" · "0 <= digits.length <= 4"
        // The generator makes words over {a,b,c}, which index past the end of the keypad table.
        // Three digits rather than four: the brute force enumerates 26^n candidates, and 26^4
        // across 400 trials is minutes spent proving nothing extra.
        REPAIRS.put("letter-combinations-phone", (args, random) -> {
            if (!(args[0] instanceof String text)) return;
            StringBuilder digits = new StringBuilder();
            for (int i = 0; i < Math.min(3, text.length()); i++) {
                digits.append((char) ('2' + Math.floorMod(text.charAt(i), 8)));
            }
            args[0] = digits.toString();
        });

        // "s consists of uppercase English letters only"
        REPAIRS.put("longest-repeating-char-replacement", (args, random) -> {
            if (args[0] instanceof String text) args[0] = text.toUpperCase(Locale.ROOT);
        });

        // "1 <= bad <= n" — the pivot the judge's API hides behind isBadVersion.
        // Examples.java reads it out of each worked example, but nothing set it here, so every
        // differential trial ran against the default of 1: the answer was version 1 every time,
        // a linear scan and a binary search both found it immediately, and 400 trials of perfect
        // agreement exercised neither search. Moving the pivot is what makes the pair disagree
        // if either one is wrong.
        REPAIRS.put("first-bad-version", (args, random) -> {
            if (!(args[0] instanceof Integer n) || n < 1) return;
            Api.firstBad = 1 + random.nextInt(n);
        });

        // "nums.length == n + 1" · "1 <= nums[i] <= n" · "exactly one value is repeated"
        // Floyd's cycle detection walks i -> nums[i], so a value outside [1, n] is an index past
        // the end of the array. A permutation of 1..n plus one repeat is the smallest input that
        // satisfies every clause at once, including the "exactly one" the statement relies on.
        REPAIRS.put("find-duplicate-number", (args, random) -> {
            if (!(args[0] instanceof int[] values)) return;
            int n = Math.max(1, values.length - 1);
            List<Integer> built = new ArrayList<>();
            for (int v = 1; v <= n; v++) built.add(v);
            built.add(1 + random.nextInt(n));
            Collections.shuffle(built, random);
            int[] out = new int[built.size()];
            for (int i = 0; i < out.length; i++) out[i] = built.get(i);
            args[0] = out;
        });

        // "The array is a rotation of a strictly ascending array" · "All integers are unique"
        REPAIRS.put("find-min-rotated-array", (args, random) -> {
            if (!(args[0] instanceof int[] values)) return;
            int[] sorted = Arrays.stream(values).distinct().sorted().toArray();
            if (sorted.length == 0) sorted = new int[] {0};
            int pivot = random.nextInt(sorted.length);
            int[] rotated = new int[sorted.length];
            for (int i = 0; i < sorted.length; i++) rotated[i] = sorted[(pivot + i) % sorted.length];
            args[0] = rotated;
        });

        // "n == nums.length" · "0 <= nums[i] <= n"
        // "All values in nums are distinct, and exactly one value from [0, n] is missing"
        REPAIRS.put("find-missing-number", (args, random) -> {
            if (!(args[0] instanceof int[] values)) return;
            int n = Math.max(1, values.length);
            List<Integer> candidates = new ArrayList<>();
            for (int i = 0; i <= n; i++) candidates.add(i);
            candidates.remove(random.nextInt(candidates.size()));   // the one that goes missing
            Collections.shuffle(candidates, random);
            int[] out = new int[n];
            for (int i = 0; i < n; i++) out[i] = candidates.get(i);
            args[0] = out;
        });

        // "n == gas.length == cost.length"
        REPAIRS.put("gas-station", (args, random) -> {
            if (args.length < 2 || !(args[0] instanceof int[] gas) || !(args[1] instanceof int[] cost)) return;
            int n = Math.min(gas.length, cost.length);
            args[0] = Arrays.copyOf(gas, n);
            args[1] = Arrays.copyOf(cost, n);
        });

        // "edges[i].length == 2 and 0 <= u, v < n" · "no self-loops and no repeated edges"
        REPAIRS.put("graph-valid-tree", (args, random) -> edges(args, 0));

        // "intervals is sorted by start_i ascending and its members do not overlap each other"
        // "intervals[i].length == newInterval.length == 2" · "0 <= start_i <= end_i"
        // Laid out left to right with a gap after each one, so the list the problem promises —
        // sorted AND disjoint — is what arrives. The new interval is drawn over the same span, so
        // it lands before, inside, across or after the existing ones with no thumb on the scale.
        REPAIRS.put("insert-interval", (args, random) -> {
            if (args.length < 2 || !(args[0] instanceof int[][] rows)) return;
            int at = random.nextInt(4);
            int[][] built = new int[rows.length][];
            for (int i = 0; i < rows.length; i++) {
                int start = at + Math.floorMod(rows[i].length > 0 ? rows[i][0] : 0, 4);
                int end = start + Math.floorMod(rows[i].length > 1 ? rows[i][1] : 0, 4);
                built[i] = new int[] {start, end};
                at = end + 1 + random.nextInt(3);
            }
            args[0] = built;
            int start = random.nextInt(Math.max(2, at + 2));
            args[1] = new int[] {start, start + random.nextInt(6)};
        });

        // "graph.length == n" · "0 <= graph[u].length < n" · "no self-loops, no repeated edges"
        // "The graph is undirected: v appears in graph[u] exactly when u appears in graph[v]"
        REPAIRS.put("is-graph-bipartite", (args, random) -> {
            if (!(args[0] instanceof int[][] rows)) return;
            int n = rows.length;
            List<Set<Integer>> adjacency = new ArrayList<>();
            for (int i = 0; i < n; i++) adjacency.add(new TreeSet<>());
            for (int u = 0; u < n; u++) {
                for (int value : rows[u]) {
                    int v = Math.floorMod(value, n);
                    if (v == u) continue;
                    adjacency.get(u).add(v);
                    adjacency.get(v).add(u);   // undirected: both directions, or neither
                }
            }
            int[][] graph = new int[n][];
            for (int u = 0; u < n; u++) {
                int[] row = new int[adjacency.get(u).size()];
                int i = 0;
                for (int v : adjacency.get(u)) row[i++] = v;
                graph[u] = row;
            }
            args[0] = graph;
        });

        // "It is guaranteed you can reach nums.length - 1"
        // Only the indices that would strand the walk are touched, and each by the single step
        // that bridges the gap, so zeros elsewhere — the interesting part of the input — survive.
        REPAIRS.put("jump-game-ii", (args, random) -> {
            if (!(args[0] instanceof int[] nums)) return;
            int reach = 0;
            for (int i = 0; i < nums.length; i++) {
                if (i > reach) {
                    nums[i - 1] = Math.max(nums[i - 1], 1);
                    reach = i;
                }
                reach = Math.max(reach, i + nums[i]);
            }
        });

        // "1 <= k <= points.length" · "points[i] = [xi, yi]"
        // "the answer is guaranteed to be unique except for the order": two points at the same
        // distance straddling the k-th place make the answer a choice, and a max-heap and a sort
        // are entitled to make it differently, so the distances are forced apart.
        REPAIRS.put("k-closest-points", (args, random) -> {
            if (args.length < 2 || !(args[0] instanceof int[][] rows)) return;
            int[][] points = new int[rows.length][];
            Set<Integer> distances = new HashSet<>();
            for (int i = 0; i < rows.length; i++) {
                int x = rows[i].length > 0 ? rows[i][0] : 0;
                int y = rows[i].length > 1 ? rows[i][1] : 0;
                while (!distances.add(x * x + y * y)) x++;
                points[i] = new int[] {x, y};
            }
            args[0] = points;
            args[1] = 1 + Math.floorMod((Integer) args[1], Math.max(1, points.length));
        });

        // "piles.length <= h <= 10^9"
        // With h below the number of piles no speed finishes in time, both implementations fall
        // back on max(piles), and every trial agrees without testing the search at all.
        REPAIRS.put("koko-eating-bananas", (args, random) -> {
            if (args.length < 2 || !(args[0] instanceof int[] piles) || !(args[1] instanceof Integer h)) return;
            args[1] = piles.length + Math.floorMod(h, 3 * Math.max(1, piles.length));
        });
        // ------------------------------------------------------------------
        // Repairs that exist to widen the INPUT DISTRIBUTION, not to fix legality.
        //
        // Vacuity detection in the runner caught seven problems where both implementations
        // agreed 400 times out of 400 and the agreement meant nothing: every trial produced the
        // same answer, or both threw on every trial. A test that can only come out one way is
        // not a test. The cause was always the generator — random strings of {a,b,c} handed to a
        // problem about digits, two independently random trees asked whether they are identical
        // (they never are), a list generator that cannot express a cycle being asked to find one.
        //
        // These repairs steer the input so that BOTH outcomes occur. That is emphatically not
        // the same as encoding the answer: the repair decides what shape of input to build, and
        // never inspects or asserts what the answer should be. Neither implementation is told
        // which branch it was handed.
        // ------------------------------------------------------------------

        // "s contains only digits" — a random letter string makes every trial return 0.
        REPAIRS.put("decode-ways", (args, random) -> {
            if (!(args[0] instanceof String text)) return;
            int length = Math.max(1, Math.min(text.length(), 9));
            StringBuilder digits = new StringBuilder();
            for (int i = 0; i < length; i++) {
                // Zeros are legal and are the whole difficulty of this problem, so they must
                // appear — but rarely enough that most strings still decode.
                digits.append(random.nextInt(10) == 0 ? '0' : (char) ('1' + random.nextInt(9)));
            }
            args[0] = digits.toString();
        });

        // "tokens is a valid reverse polish expression" — random tokens threw on all 400 trials.
        REPAIRS.put("evaluate-rpn", (args, random) -> {
            int operandCount = 2 + random.nextInt(4);
            List<String> tokens = new ArrayList<>();
            int pushed = 0;
            int onStack = 0;
            while (pushed < operandCount || onStack > 1) {
                boolean mayApply = onStack >= 2;
                boolean mustApply = pushed == operandCount;
                if (!mustApply && (!mayApply || random.nextBoolean())) {
                    tokens.add(String.valueOf(random.nextInt(-9, 10)));
                    pushed++;
                    onStack++;
                } else {
                    // Division by zero is undefined for this problem, so '/' is offered only when
                    // the divisor is a literal known to be non-zero; the other three are safe.
                    String last = tokens.get(tokens.size() - 1);
                    boolean divisible = last.matches("-?\\d+") && Integer.parseInt(last) != 0;
                    String[] choices = divisible
                        ? new String[] {"+", "-", "*", "/"}
                        : new String[] {"+", "-", "*"};
                    tokens.add(choices[random.nextInt(choices.length)]);
                    onStack--;
                }
            }
            args[0] = tokens.toArray(new String[0]);
        });

        // A list generator that only builds acyclic lists cannot test a cycle detector. Roughly
        // half the trials now close the list into a rho shape; Generator's copies are cycle-safe.
        REPAIRS.put("linked-list-cycle", (args, random) -> {
            if (!(args[0] instanceof Support.Node head) || random.nextBoolean()) return;
            List<Support.Node> nodes = new ArrayList<>();
            for (Support.Node at = head; at != null; at = at.next) nodes.add(at);
            if (nodes.isEmpty()) return;
            nodes.get(nodes.size() - 1).next = nodes.get(random.nextInt(nodes.size()));
        });

        // Two independently random trees are never equal, so every trial answered false.
        REPAIRS.put("same-tree", (args, random) -> {
            if (args.length < 2 || !(args[0] instanceof Support.TreeNode first)) return;
            if (random.nextBoolean()) return;                 // keep the "different" half
            Support.TreeNode twin = deepCopyTree(first);
            int variant = random.nextInt(3);
            if (variant == 1 && twin != null) {
                // Perturb one value: catches an implementation that stops comparing too early.
                List<Support.TreeNode> nodes = new ArrayList<>();
                collect(twin, nodes);
                nodes.get(random.nextInt(nodes.size())).val += 1;
            } else if (variant == 2 && twin != null && twin.left != null) {
                // Rotate at the root. A rotation preserves the inorder sequence exactly while
                // changing the shape, which is precisely the pair this problem's brute force
                // cannot tell apart — and without it the test never reaches that case.
                Support.TreeNode pivot = twin.left;
                twin.left = pivot.right;
                pivot.right = twin;
                twin = pivot;
            }
            args[1] = twin;
        });

        // Random 4-character strings are not equations, so every trial threw or answered true.
        REPAIRS.put("satisfiability-equality-equations", (args, random) -> {
            int count = 2 + random.nextInt(5);
            int variables = 2 + random.nextInt(3);            // small, so contradictions happen
            String[] equations = new String[count];
            for (int i = 0; i < count; i++) {
                char left = (char) ('a' + random.nextInt(variables));
                char right = (char) ('a' + random.nextInt(variables));
                equations[i] = "" + left + (random.nextBoolean() ? "==" : "!=") + right;
            }
            args[0] = equations;
        });

        // "nums is a permutation of 1..n" · "each sequence is a subsequence of nums".
        // Random int arrays satisfied neither, so the answer was always false.
        REPAIRS.put("sequence-reconstruction", (args, random) -> {
            if (args.length < 2) return;
            int n = 2 + random.nextInt(5);
            List<Integer> order = new ArrayList<>();
            for (int v = 1; v <= n; v++) order.add(v);
            Collections.shuffle(order, random);
            int[] nums = order.stream().mapToInt(Integer::intValue).toArray();

            List<int[]> sequences = new ArrayList<>();
            if (random.nextBoolean()) {
                // Every adjacent pair: the order is uniquely reconstructible.
                for (int i = 0; i + 1 < n; i++) sequences.add(new int[] {nums[i], nums[i + 1]});
            } else {
                // Random subsequences: usually under-determined, sometimes not.
                for (int s = 0, total = 1 + random.nextInt(3); s < total; s++) {
                    List<Integer> picked = new ArrayList<>();
                    for (int value : nums) if (random.nextBoolean()) picked.add(value);
                    if (picked.isEmpty()) picked.add(nums[random.nextInt(n)]);
                    sequences.add(picked.stream().mapToInt(Integer::intValue).toArray());
                }
            }
            if (sequences.isEmpty()) sequences.add(new int[] {nums[0]});
            args[0] = nums;
            args[1] = sequences.toArray(new int[0][]);
        });

        // The runner forces a valid BST for this problem (that is what makes the other BST
        // problems meaningful), which means validate-bst was only ever shown valid trees and
        // answered true 400 times. Half the trials now get one node nudged out of order — often
        // subtly, into the range that is locally fine and globally wrong, which is the exact bug
        // the naive "compare with your children" implementation has.
        REPAIRS.put("validate-bst", (args, random) -> {
            if (!(args[0] instanceof Support.TreeNode root) || random.nextBoolean()) return;
            List<Support.TreeNode> nodes = new ArrayList<>();
            collect(root, nodes);
            if (nodes.size() < 2) return;
            Support.TreeNode a = nodes.get(random.nextInt(nodes.size()));
            if (random.nextBoolean()) {
                Support.TreeNode b = nodes.get(random.nextInt(nodes.size()));
                int swap = a.val; a.val = b.val; b.val = swap;
            } else {
                a.val += random.nextBoolean() ? 1 : -1;
            }
        });

        // ------------------------------------------------------------------
        // Batch D/E/F: structural preconditions the type-driven generator cannot express.
        // Each is keyed to a constraint the problem itself states, quoted above it.
        // ------------------------------------------------------------------

        // "each of the k lists is sorted in ascending order" — merging unsorted lists is
        // undefined, and the two implementations pick different wrong answers.
        REPAIRS.put("merge-k-sorted-lists", (args, random) -> {
            if (args[0] instanceof Support.ListNode[] lists) {
                for (int i = 0; i < lists.length; i++) lists[i] = sortedList(lists[i]);
            } else if (args[0] instanceof Support.Node[] lists) {
                for (int i = 0; i < lists.length; i++) lists[i] = sortedNodeList(lists[i]);
            }
        });

        // "0 <= a, b < n" · "succProb.length == edges.length" · "0 <= succProb[i] <= 1"
        // · "0 <= start, end < n"
        REPAIRS.put("path-with-maximum-probability", (args, random) -> {
            if (args.length < 5 || !(args[0] instanceof Integer nodes)) return;
            int n = Math.max(2, Math.min(nodes, 6));
            args[0] = n;
            List<int[]> legal = new ArrayList<>();
            Set<String> seen = new HashSet<>();
            if (args[1] instanceof int[][] edges) {
                for (int[] edge : edges) {
                    if (edge.length < 2) continue;
                    int a = Math.floorMod(edge[0], n);
                    int b = Math.floorMod(edge[1], n);
                    if (a == b) continue;
                    if (!seen.add(Math.min(a, b) + ":" + Math.max(a, b))) continue;
                    legal.add(new int[] {a, b});
                }
            }
            args[1] = legal.toArray(new int[0][]);
            double[] probabilities = new double[legal.size()];
            double[] given = args[2] instanceof double[] d ? d : new double[0];
            for (int i = 0; i < probabilities.length; i++) {
                probabilities[i] = i < given.length ? Math.min(1, Math.abs(given[i])) : random.nextDouble();
            }
            args[2] = probabilities;
            int start = Math.floorMod((Integer) args[3], n);
            int end = Math.floorMod((Integer) args[4], n);
            args[3] = start;
            args[4] = start == end ? (end + 1) % n : end;
        });

        // "points[i] = [x_start, x_end]" with x_start <= x_end — the generator produced rows of
        // four values in arbitrary order, so the brute force's scan from start to end never ran.
        REPAIRS.put("minimum-arrows-burst-balloons", (args, random) -> intervals(args, false));

        // "2 <= accounts[i].length <= 10" — the bracket form is not parsed by domains.py, so
        // accounts with no email at all reach the solutions, which disagree about what that means.
        REPAIRS.put("accounts-merge", (args, random) -> {
            if (!(args[0] instanceof List<?> accounts)) return;
            // Accounts that share an email are the same person, so they must share a name — two
            // correct solutions otherwise disagree about which of two names to print, and the
            // harness would report that as a content defect.
            String name = "user" + random.nextInt(3);
            List<List<String>> fixed = new ArrayList<>();
            for (Object row : accounts) {
                if (!(row instanceof List<?> account)) continue;
                List<String> rebuilt = new ArrayList<>();
                rebuilt.add(name);
                for (Object cell : account) rebuilt.add("e" + Math.floorMod(String.valueOf(cell).hashCode(), 6) + "@x.com");
                while (rebuilt.size() < 2) rebuilt.add("e" + random.nextInt(4) + "@x.com");
                fixed.add(rebuilt);
            }
            if (fixed.isEmpty()) fixed.add(new ArrayList<>(List.of(name, "e0@x.com")));
            args[0] = fixed;
        });

        // "If there are multiple valid orders, return any of them" — so two correct solutions may
        // legitimately differ. Rather than declare the problem incomparable, the generator builds
        // words that force ONE total order: every adjacent pair differs at position 0, and the
        // letters used are exactly the chain a..a+k. Any correct solution must then return that
        // chain, and the comparison means something again.
        REPAIRS.put("alien-dictionary", (args, random) -> {
            int letters = 2 + random.nextInt(4);
            List<String> words = new ArrayList<>();
            for (int i = 0; i < letters; i++) {
                char head = (char) ('a' + i);
                words.add("" + head + (char) ('a' + random.nextInt(letters)));
            }
            args[0] = words.toArray(new String[0]);
        });

        // "nums is sorted in ascending order" — a binary search over unsorted input is undefined,
        // and disagreeing with a linear scan there says nothing about either.
        REPAIRS.put("binary-search-basic", (args, random) -> sortDistinct(args));
        REPAIRS.put("remove-duplicates-sorted", (args, random) -> {
            if (args[0] instanceof int[] nums) { Arrays.sort(nums); args[0] = nums; }
        });
        REPAIRS.put("two-sum-sorted", (args, random) -> {
            if (args[0] instanceof int[] given && given.length >= 2) {
                int[] nums = Arrays.stream(given).distinct().sorted().toArray();
                if (nums.length < 2) nums = new int[] {1, 2};
                args[0] = nums;
                // "exactly one solution" — pin the target to a real pair so the answer is unique.
                int i = random.nextInt(nums.length - 1);
                int j = i + 1 + random.nextInt(nums.length - i - 1);
                args[1] = nums[i] + nums[j];
            }
        });
        REPAIRS.put("squares-of-sorted-array", (args, random) -> {
            if (args[0] instanceof int[] nums) { Arrays.sort(nums); args[0] = nums; }
        });

        // "nums is a rotation of a sorted array of DISTINCT values."
        REPAIRS.put("search-rotated-array", (args, random) -> {
            if (!(args[0] instanceof int[] nums) || nums.length == 0) return;
            int[] sorted = Arrays.stream(nums).distinct().sorted().toArray();
            int pivot = random.nextInt(sorted.length);
            int[] rotated = new int[sorted.length];
            for (int i = 0; i < sorted.length; i++) rotated[i] = sorted[(pivot + i) % sorted.length];
            args[0] = rotated;
            // Half the trials look for a value that is present, half for one that is not.
            args[1] = random.nextBoolean() ? rotated[random.nextInt(rotated.length)] : random.nextInt(-30, 30);
        });

        // "each row is sorted, and the first integer of a row is greater than the last of the
        // previous row" — the matrix is one sorted sequence folded into rows.
        REPAIRS.put("search-2d-matrix", (args, random) -> {
            if (!(args[0] instanceof int[][] matrix) || matrix.length == 0) return;
            int columns = Math.max(1, matrix[0].length);
            int value = random.nextInt(-10, 10);
            int[][] fixed = new int[matrix.length][columns];
            for (int r = 0; r < matrix.length; r++) {
                for (int c = 0; c < columns; c++) {
                    fixed[r][c] = value;
                    value += 1 + random.nextInt(4);
                }
            }
            args[0] = fixed;
            args[1] = random.nextBoolean()
                    ? fixed[random.nextInt(fixed.length)][random.nextInt(columns)]
                    : random.nextInt(-12, value + 4);
        });

        // "n == matrix.length == matrix[i].length" — rotation in place is only defined on a square.
        REPAIRS.put("rotate-image", (args, random) -> args[0] = square(args[0], random, false));
        // "grid[i][j] is 0 or 1" · "n == grid.length == grid[i].length"
        REPAIRS.put("shortest-path-binary-matrix", (args, random) -> args[0] = square(args[0], random, true));

        // "0 <= flights[i][j] < n" · "1 <= price <= 10^4" · "src != dst" · "0 <= k < n"
        REPAIRS.put("cheapest-flights-k-stops", (args, random) -> {
            if (args.length < 5 || !(args[0] instanceof Integer cities)) return;
            int n = Math.max(2, Math.min(cities, 6));
            args[0] = n;
            if (args[1] instanceof int[][] flights) {
                List<int[]> legal = new ArrayList<>();
                Set<String> seen = new HashSet<>();
                for (int[] flight : flights) {
                    if (flight.length < 2) continue;
                    int from = Math.floorMod(flight[0], n);
                    int to = Math.floorMod(flight[1], n);
                    if (from == to || !seen.add(from + ">" + to)) continue;
                    int price = 1 + Math.floorMod(flight.length > 2 ? flight[2] : from + to, 100);
                    legal.add(new int[] {from, to, price});
                }
                args[1] = legal.toArray(new int[0][]);
            }
            int src = Math.floorMod((Integer) args[2], n);
            int dst = Math.floorMod((Integer) args[3], n);
            if (src == dst) dst = (dst + 1) % n;
            args[2] = src;
            args[3] = dst;
            args[4] = Math.floorMod((Integer) args[4], n);
        });

        // "1 <= coins[i] <= 2^31 - 1" — domains.py cannot parse the embedded subtraction, so the
        // generator was free to produce negative and zero coins, which make the DP undefined.
        REPAIRS.put("coin-change", (args, random) -> {
            if (args[0] instanceof int[] coins) {
                int[] positive = Arrays.stream(coins).map(v -> 1 + Math.floorMod(v, 9)).distinct().toArray();
                args[0] = positive.length == 0 ? new int[] {1} : positive;
            }
            if (args.length > 1 && args[1] instanceof Integer amount) args[1] = Math.floorMod(amount, 25);
        });

        // "0 <= prerequisites[i][j] < numCourses" — the existing edges() repair, reused.
        REPAIRS.put("course-schedule", (args, random) -> directedEdges(args, random));
        // "If there are many valid answers, return any of them" — so two correct solutions may
        // legitimately differ, and comparing them for equality tests nothing. Rather than give up
        // on the problem, the generator constrains every course into a single chain, which has
        // exactly one valid order; a quarter of the trials close the chain into a cycle, where the
        // only valid answer is the empty array. Both cases are then unambiguous.
        REPAIRS.put("course-schedule-ii", (args, random) -> {
            if (!(args[0] instanceof Integer courses)) return;
            int n = Math.max(2, Math.min(courses, 6));
            List<Integer> order = new ArrayList<>();
            for (int course = 0; course < n; course++) order.add(course);
            Collections.shuffle(order, random);
            List<int[]> chain = new ArrayList<>();
            for (int i = 0; i + 1 < n; i++) chain.add(new int[] {order.get(i + 1), order.get(i)});
            if (random.nextInt(4) == 0) chain.add(new int[] {order.get(0), order.get(n - 1)});
            args[0] = n;
            args[1] = chain.toArray(new int[0][]);
        });

        // "1 <= times[i][0], times[i][1] <= n" · "0 <= w <= 100" · "1 <= k <= n"
        REPAIRS.put("network-delay-time", (args, random) -> {
            if (args.length < 3 || !(args[1] instanceof Integer nodes)) return;
            int n = Math.max(1, Math.min(nodes, 6));
            args[1] = n;
            if (args[0] instanceof int[][] times) {
                List<int[]> legal = new ArrayList<>();
                Set<String> seen = new HashSet<>();
                for (int[] edge : times) {
                    if (edge.length < 2) continue;
                    int from = 1 + Math.floorMod(edge[0], n);
                    int to = 1 + Math.floorMod(edge[1], n);
                    if (from == to || !seen.add(from + ">" + to)) continue;
                    legal.add(new int[] {from, to, Math.floorMod(edge.length > 2 ? edge[2] : from, 101)});
                }
                args[0] = legal.toArray(new int[0][]);
            }
            args[2] = 1 + Math.floorMod((Integer) args[2], n);
        });

        // "intervals[i] = [start, end]" with start <= end — the existing intervals() repair.
        REPAIRS.put("non-overlapping-intervals", (args, random) -> intervals(args, true));

        // "grid[i][j] is '0' or '1'" — Generator builds char grids from {'a','b','c'}, so every
        // trial found zero islands and agreed about it.
        REPAIRS.put("number-of-islands", (args, random) -> args[0] = charGrid(args[0], random, '0', '1'));
        // "board[i][j] is 'X' or 'O'"
        REPAIRS.put("surrounded-regions", (args, random) -> args[0] = charGrid(args[0], random, 'X', 'O'));

        // "isConnected[i][j] == isConnected[j][i]" · "isConnected[i][i] == 1" · square, 0/1.
        REPAIRS.put("number-of-provinces", (args, random) -> {
            if (!(args[0] instanceof int[][] given)) return;
            int n = Math.max(1, Math.min(given.length, 6));
            int[][] matrix = new int[n][n];
            for (int i = 0; i < n; i++) {
                matrix[i][i] = 1;
                for (int j = i + 1; j < n; j++) {
                    int link = random.nextInt(3) == 0 ? 1 : 0;
                    matrix[i][j] = link;
                    matrix[j][i] = link;
                }
            }
            args[0] = matrix;
        });

        // "all strings are 4 digits" — and the brute force is depth-capped for tractability, so
        // the target is placed within reach of it rather than up to 20 turns away.
        REPAIRS.put("open-the-lock", (args, random) -> {
            if (args.length < 2) return;
            char[] target = "0000".toCharArray();
            for (int turn = 0, turns = random.nextInt(5); turn < turns; turn++) {
                int wheel = random.nextInt(4);
                target[wheel] = (char) ('0' + Math.floorMod(target[wheel] - '0' + (random.nextBoolean() ? 1 : -1), 10));
            }
            String goal = new String(target);
            int count = random.nextInt(4);
            Set<String> deadends = new LinkedHashSet<>();
            for (int i = 0; i < count; i++) {
                StringBuilder code = new StringBuilder();
                for (int d = 0; d < 4; d++) code.append((char) ('0' + random.nextInt(10)));
                deadends.add(code.toString());
            }
            args[0] = deadends.toArray(new String[0]);
            args[1] = goal;
        });

        // "0 <= Node.val <= 9" — without this the reproduced fault in add-two-numbers is an
        // out-of-range digit rather than the long overflow the page's argument is about.
        REPAIRS.put("add-two-numbers", (args, random) -> {
            for (Object arg : args) {
                if (!(arg instanceof Support.Node head)) continue;
                for (Support.Node at = head; at != null; at = at.next) at.val = Math.floorMod(at.val, 10);
            }
        });

        // "the input is a tree plus exactly one extra edge, labels 1..n"
        REPAIRS.put("redundant-connection", (args, random) -> {
            if (!(args[0] instanceof int[][] given)) return;
            int n = Math.max(3, Math.min(given.length, 7));
            List<int[]> tree = new ArrayList<>();
            for (int node = 2; node <= n; node++) tree.add(new int[] {1 + random.nextInt(node - 1), node});
            int a = 1 + random.nextInt(n);
            int b = 1 + random.nextInt(n);
            while (b == a) b = 1 + random.nextInt(n);
            tree.add(new int[] {a, b});
            args[0] = tree.toArray(new int[0][]);
        });

        // "1 <= n <= the number of nodes in the list" — harmonise() only clamps ints against
        // arrays and strings, never against a linked list's length.
        REPAIRS.put("remove-nth-from-end", (args, random) -> {
            if (args.length < 2 || !(args[0] instanceof Support.Node head)) return;
            int length = 0;
            for (Support.Node at = head; at != null; at = at.next) length++;
            if (length == 0) return;
            args[1] = 1 + Math.floorMod((Integer) args[1], length);
        });

        // "every element appears exactly three times except one, which appears once"
        REPAIRS.put("single-number-ii", (args, random) -> {
            if (!(args[0] instanceof int[] values)) return;
            List<Integer> built = new ArrayList<>();
            for (int i = 0; i < values.length / 3; i++) {
                built.add(values[i]);
                built.add(values[i]);
                built.add(values[i]);
            }
            built.add(values.length == 0 ? random.nextInt(-10, 10) : values[values.length - 1] + 1001);
            Collections.shuffle(built, random);
            args[0] = built.stream().mapToInt(Integer::intValue).toArray();
        });

        // "exactly one valid answer exists" — with two valid pairs, two correct solutions may pick
        // different ones and the disagreement is the harness's fault, not the content's.
        REPAIRS.put("two-sum", (args, random) -> {
            if (!(args[0] instanceof int[] nums) || nums.length < 2) return;
            int[] distinct = Arrays.stream(nums).distinct().toArray();
            if (distinct.length < 2) distinct = new int[] {1, 2};
            // Spread the values far enough apart that no other pair can reach the same sum.
            int[] spread = new int[distinct.length];
            for (int i = 0; i < spread.length; i++) spread[i] = 1 << (i + 1);
            int i = random.nextInt(spread.length - 1);
            int j = i + 1 + random.nextInt(spread.length - i - 1);
            args[0] = spread;
            args[1] = spread[i] + spread[j];
        });

        // "the answer is guaranteed to be unique" — a tie at the k-th place makes it ambiguous.
        REPAIRS.put("top-k-frequent", (args, random) -> {
            if (args.length < 2) return;
            int distinct = 2 + random.nextInt(3);
            List<Integer> built = new ArrayList<>();
            for (int value = 0; value < distinct; value++) {
                // Strictly decreasing counts, so every boundary is unambiguous.
                for (int c = 0; c < distinct - value; c++) built.add(value * 7);
            }
            Collections.shuffle(built, random);
            args[0] = built.stream().mapToInt(Integer::intValue).toArray();
            args[1] = 1 + random.nextInt(distinct);
        });

        // "rooms[i][j] is -1 (wall), 0 (gate), or 2147483647 (empty)"
        REPAIRS.put("walls-and-gates", (args, random) -> {
            if (!(args[0] instanceof int[][] rooms)) return;
            for (int[] row : rooms) {
                for (int c = 0; c < row.length; c++) {
                    int roll = random.nextInt(10);
                    row[c] = roll == 0 ? -1 : roll <= 2 ? 0 : Integer.MAX_VALUE;
                }
            }
        });

        // "tasks[i] is an uppercase English letter" — counts[task - 'A'] indexes out of bounds on
        // the generator's lowercase alphabet, on every trial, for both implementations.
        REPAIRS.put("task-scheduler", (args, random) -> {
            if (args[0] instanceof char[] tasks) {
                for (int i = 0; i < tasks.length; i++) tasks[i] = (char) ('A' + random.nextInt(4));
            }
            if (args.length > 1 && args[1] instanceof Integer n) args[1] = Math.floorMod(n, 4);
        });

        // "s consists of parentheses only '()[]{}'" — letters make every trial answer false.
        REPAIRS.put("valid-parentheses", (args, random) -> {
            char[] open = {'(', '[', '{'};
            char[] close = {')', ']', '}'};
            StringBuilder text = new StringBuilder();
            Deque<Integer> stack = new ArrayDeque<>();
            int length = random.nextInt(9);
            for (int i = 0; i < length; i++) {
                if (stack.isEmpty() || random.nextBoolean()) {
                    int kind = random.nextInt(3);
                    text.append(open[kind]);
                    stack.push(kind);
                } else {
                    // Usually close correctly; sometimes close with the wrong bracket, which is
                    // the case the problem is actually about.
                    int kind = random.nextInt(4) == 0 ? random.nextInt(3) : stack.pop();
                    text.append(close[kind]);
                }
            }
            args[0] = text.toString();
        });

        // "beginWord, endWord and every wordList entry have the same length" · "endWord must be in
        // wordList for a transformation to exist" (half the trials leave it out, which is legal
        // and answers 0).
        REPAIRS.put("word-ladder", (args, random) -> {
            if (args.length < 3) return;
            int width = 3;
            List<String> list = new ArrayList<>();
            for (int i = 0, count = 2 + random.nextInt(5); i < count; i++) {
                StringBuilder word = new StringBuilder();
                for (int c = 0; c < width; c++) word.append((char) ('a' + random.nextInt(3)));
                list.add(word.toString());
            }
            StringBuilder begin = new StringBuilder();
            for (int c = 0; c < width; c++) begin.append((char) ('a' + random.nextInt(3)));
            String end = random.nextBoolean() ? list.get(random.nextInt(list.size())) : "ccc";
            if (random.nextInt(4) == 0) list.remove(end);
            args[0] = begin.toString();
            args[1] = end;
            args[2] = list;
        });

    }

    /**
     * Rows of exactly two columns, with start <= end — or start < end when the problem says the
     * interval is non-empty. The generator makes rectangles of one to four columns filled with
     * unordered values, and neither implementation of an interval problem owes an answer on a
     * meeting that ends before it begins.
     */
    private static void intervals(Object[] args, boolean nonEmpty) {
        if (!(args[0] instanceof int[][] rows)) return;
        int[][] fixed = new int[rows.length][];
        for (int i = 0; i < rows.length; i++) {
            int first = rows[i].length > 0 ? Math.abs(rows[i][0]) : 0;
            int second = rows[i].length > 1 ? Math.abs(rows[i][1]) : first;
            int start = Math.min(first, second);
            int end = Math.max(first, second);
            if (nonEmpty && start == end) end++;
            fixed[i] = new int[] {start, end};
        }
        args[0] = fixed;
    }

    /** Put one `Node` list's values into non-decreasing order, in place. */
    private static void sortNodeList(Object value) {
        if (!(value instanceof Support.Node head)) return;
        List<Integer> values = new ArrayList<>();
        for (Support.Node at = head; at != null; at = at.next) values.add(at.val);
        Collections.sort(values);
        int i = 0;
        for (Support.Node at = head; at != null; at = at.next) at.val = values.get(i++);
    }

    /** n is the first argument; every endpoint must land in [base, base + n). */
    private static void edges(Object[] args, int base) {
        if (!(args[0] instanceof Integer n) || !(args[1] instanceof int[][] pairs)) return;
        int count = Math.max(1, n);
        List<int[]> legal = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (int[] pair : pairs) {
            if (pair.length < 2) continue;
            int a = base + Math.floorMod(pair[0], count);
            int b = base + Math.floorMod(pair[1], count);
            if (a == b) continue;
            String key = Math.min(a, b) + ":" + Math.max(a, b);
            if (!seen.add(key)) continue;
            legal.add(new int[] {a, b});
        }
        args[1] = legal.toArray(new int[0][]);
    }

    private static int countNodes(Support.TreeNode node) {
        return node == null ? 0 : 1 + countNodes(node.left) + countNodes(node.right);
    }

    private static void collectValues(Support.TreeNode node, List<Integer> into) {
        if (node == null) return;
        into.add(node.val);
        collectValues(node.left, into);
        collectValues(node.right, into);
    }

    private static int[][] permutationGrid(Random random) {
        int n = 2 + random.nextInt(3);
        List<Integer> values = new ArrayList<>();
        for (int i = 0; i < n * n; i++) values.add(i);
        Collections.shuffle(values, random);
        int[][] grid = new int[n][n];
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) grid[r][c] = values.get(r * n + c);
        }
        return grid;


    }

    /**
     * Fix up arguments AFTER the deep copy, where a relationship between two arguments has to
     * survive into the copy.
     *
     * lowest-common-ancestor is the case that forced this. LeetCode hands you p and q as
     * references to nodes *inside* the tree, and the two implementations here legitimately rely
     * on different halves of that contract: the brute force tests `node == p`, the optimised one
     * compares `p.val`. Both are correct. But each argument is deep-copied independently before
     * the call — so p was a detached node with the right value, which the value-based solution
     * handled and the identity-based one could not possibly.
     *
     * The harness was wrong, not the content. This re-points p and q at the real nodes inside
     * the copied tree, restoring the contract the problem actually states.
     */
    static void rebind(String id, Object[] args) {
        if (!id.equals("lowest-common-ancestor-bst")) return;
        if (args.length < 3 || !(args[0] instanceof Support.TreeNode root)) return;
        args[1] = findByValue(root, nodeValue(args[1]));
        args[2] = findByValue(root, nodeValue(args[2]));
    }

    private static int nodeValue(Object node) {
        return node instanceof Support.TreeNode tree ? tree.val : 0;
    }

    private static Support.TreeNode findByValue(Support.TreeNode node, int value) {
        if (node == null) return null;
        if (node.val == value) return node;
        Support.TreeNode left = findByValue(node.left, value);
        return left != null ? left : findByValue(node.right, value);
    }

    private static void collect(Support.TreeNode node, List<Support.TreeNode> into) {
        if (node == null) return;
        into.add(node);
        collect(node.left, into);
        collect(node.right, into);
    }

    private static Support.TreeNode deepCopyTree(Support.TreeNode node) {
        if (node == null) return null;
        Support.TreeNode copy = new Support.TreeNode(node.val);
        copy.left = deepCopyTree(node.left);
        copy.right = deepCopyTree(node.right);
        return copy;
    }

    private static Support.ListNode sortedList(Support.ListNode head) {
        List<Integer> values = new ArrayList<>();
        for (Support.ListNode at = head; at != null; at = at.next) values.add(at.val);
        Collections.sort(values);
        Support.ListNode result = null;
        for (int i = values.size() - 1; i >= 0; i--) result = new Support.ListNode(values.get(i), result);
        return result;
    }

    private static Support.Node sortedNodeList(Support.Node head) {
        List<Integer> values = new ArrayList<>();
        for (Support.Node at = head; at != null; at = at.next) values.add(at.val);
        Collections.sort(values);
        Support.Node result = null;
        for (int i = values.size() - 1; i >= 0; i--) {
            Support.Node node = new Support.Node(values.get(i));
            node.next = result;
            result = node;
        }
        return result;
    }

    private static void sortDistinct(Object[] args) {
        if (args[0] instanceof int[] nums) {
            int[] sorted = Arrays.stream(nums).distinct().sorted().toArray();
            args[0] = sorted;
        }
    }

    /** Directed edges into [0, numCourses), deduplicated. Self-loops are dropped. */
    private static void directedEdges(Object[] args, Random random) {
        if (!(args[0] instanceof Integer courses) || !(args[1] instanceof int[][] pairs)) return;
        int n = Math.max(1, Math.min(courses, 7));
        args[0] = n;
        List<int[]> legal = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (int[] pair : pairs) {
            if (pair.length < 2) continue;
            int a = Math.floorMod(pair[0], n);
            int b = Math.floorMod(pair[1], n);
            if (a == b || !seen.add(a + ">" + b)) continue;
            legal.add(new int[] {a, b});
        }
        args[1] = legal.toArray(new int[0][]);
    }

    /** Square the grid, optionally forcing 0/1 cell values. */
    private static int[][] square(Object value, Random random, boolean binary) {
        if (!(value instanceof int[][] given)) return (int[][]) value;
        int n = Math.max(1, Math.min(given.length, 6));
        int[][] grid = new int[n][n];
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                boolean inside = r < given.length && c < given[r].length;
                int cell = inside ? given[r][c] : random.nextInt(10);
                grid[r][c] = binary ? Math.floorMod(cell, 4) == 0 ? 1 : 0 : cell;
            }
        }
        if (binary) { grid[0][0] = 0; grid[n - 1][n - 1] = 0; }
        return grid;
    }

    /** Remap a generated char grid onto the two characters the problem actually uses. */
    private static char[][] charGrid(Object value, Random random, char zero, char one) {
        if (!(value instanceof char[][] given)) return (char[][]) value;
        char[][] grid = new char[given.length][];
        for (int r = 0; r < given.length; r++) {
            grid[r] = new char[given[r].length];
            for (int c = 0; c < given[r].length; c++) {
                grid[r][c] = random.nextInt(3) == 0 ? zero : one;
            }
        }
        return grid;
    }

    /**
     * Preconditions on a single operation of a stateful class, where the bound the operation must
     * respect was fixed by the constructor rather than by the arguments in hand.
     *
     * range-sum-query states "0 <= left <= right < nums.length". Both parts matter and neither is
     * expressible where the arguments are generated: the ordering is a relationship between two
     * arguments, and the length belongs to the array the object was built with.
     */
    static void operation(String id, String method, Object[] constructorArgs, Object[] args) {
        if (id.equals("range-sum-query") && method.equals("sumRange") && args.length >= 2
                && constructorArgs.length > 0 && constructorArgs[0] instanceof int[] nums) {
            if (nums.length == 0) return;
            int left = Math.floorMod((Integer) args[0], nums.length);
            int right = Math.floorMod((Integer) args[1], nums.length);
            args[0] = Math.min(left, right);
            args[1] = Math.max(left, right);
        }
    }

    static boolean has(String id) {
        return REPAIRS.containsKey(id);
    }

    static void apply(String id, Object[] args, Random random) {
        Repair repair = REPAIRS.get(id);
        if (repair != null) repair.apply(args, random);
    }

    private Preconditions() {}
}
