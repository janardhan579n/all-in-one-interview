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

    static boolean has(String id) {
        return REPAIRS.containsKey(id);
    }

    static void apply(String id, Object[] args, Random random) {
        Repair repair = REPAIRS.get(id);
        if (repair != null) repair.apply(args, random);
    }

    private Preconditions() {}
}
