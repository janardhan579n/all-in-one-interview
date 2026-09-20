package verify;

import java.lang.reflect.*;
import java.util.*;

/**
 * Random inputs, by parameter type and by the problem's own stated constraints.
 *
 * Small on purpose. Several brute forces here are exponential — subsets, permutations, n-queens,
 * the O(n³) window scans — and the point of a differential test is agreement on the shape of the
 * answer, not throughput. Eight elements with values in a narrow band also makes collisions,
 * duplicates and ties common, which is exactly where two implementations are most likely to part
 * company.
 *
 * A type this cannot make is reported as an unsupported signature rather than guessed at. A
 * guessed input that happens to satisfy both implementations proves nothing.
 */
final class Generator {

    private static final int MAX_LEN = 8;
    private static final int VALUE = 12;

    /**
     * The legal input domain for the problem under test, parsed from its own stated constraints
     * by `domains.py`.
     *
     * Narrowing to the legal domain is what makes a disagreement mean something. The first run of
     * this harness reported fourteen failures and not one was a defect: they were negative prices
     * fed to a problem constrained to `0 <= prices[i]`, empty arrays given to one that says
     * `1 <= nums.length`, values outside `{0,1,2}` handed to sort-colors. An implementation owes
     * no sensible behaviour outside the domain it was promised, and a report full of such
     * findings teaches the reader to ignore it.
     */
    record Domain(Integer valueMin, Integer valueMax, Integer lengthMin, int[] values, boolean stated) {
        static final Domain OPEN = new Domain(null, null, null, null, false);

        int low() {
            int floor = valueMin == null ? -VALUE : Math.max(valueMin, -VALUE);
            return Math.min(floor, high());
        }

        int high() {
            return valueMax == null ? VALUE : Math.min(valueMax, VALUE);
        }

        int minLength() {
            // Default 1, not 0. Almost every problem here states `1 <= nums.length`, and an empty
            // array sent to one that forbids it makes both implementations throw different
            // exceptions — a disagreement about nothing.
            return lengthMin == null ? 1 : Math.max(1, Math.min(lengthMin, MAX_LEN));
        }
    }

    private static Domain domain = Domain.OPEN;

    static void use(Domain next) {
        domain = next == null ? Domain.OPEN : next;
    }

    private static int pick(Random random) {
        if (domain.values() != null && domain.values().length > 0) {
            return domain.values()[random.nextInt(domain.values().length)];
        }
        int low = domain.low();
        int high = domain.high();
        return low >= high ? low : random.nextInt(low, high + 1);
    }

    private static int length(Random random) {
        int min = domain.minLength();
        return min >= MAX_LEN ? MAX_LEN : random.nextInt(min, MAX_LEN + 1);
    }

    static boolean supports(Class<?> type) {
        return type == int.class || type == long.class || type == boolean.class || type == double.class
                || type == char.class || type == String.class
                || type == int[].class || type == char[].class || type == String[].class
                || type == int[][].class || type == char[][].class
                || type == List.class;
    }

    /**
     * `List` alone is not enough: `wordBreak(String, List<String>)` and `kClosest(List<Integer>,
     * int)` erase to the same runtime class, and feeding a list of integers to a method expecting
     * words throws a ClassCastException that reads like a bug in the solution. The declared
     * generic type is consulted instead.
     */
    static Object make(Type declared, Random random) {
        if (declared instanceof ParameterizedType parameterized && parameterized.getRawType() == List.class) {
            Type element = parameterized.getActualTypeArguments()[0];
            int n = Math.max(1, length(random));
            List<Object> list = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                if (element == String.class) list.add(word(random, 1 + random.nextInt(3)));
                else if (element instanceof ParameterizedType) list.add(make(element, random));
                else list.add(pick(random));
            }
            return list;
        }
        return make((Class<?>) declared, random);
    }

    static Object make(Class<?> type, Random random) {
        if (type == int.class) return random.nextInt(1, MAX_LEN + 1);   // usually a k, an index or a bound
        if (type == long.class) return (long) random.nextInt(1, MAX_LEN + 1);
        if (type == boolean.class) return random.nextBoolean();
        if (type == double.class) return Math.round(random.nextDouble() * 100) / 100.0;
        if (type == char.class) return (char) ('a' + random.nextInt(4));
        if (type == String.class) return word(random, 1 + random.nextInt(MAX_LEN));
        if (type == int[].class) return ints(random, length(random));
        if (type == char[].class) return word(random, 1 + random.nextInt(MAX_LEN)).toCharArray();
        if (type == String[].class) {
            String[] out = new String[random.nextInt(MAX_LEN) + 1];
            for (int i = 0; i < out.length; i++) out[i] = word(random, 1 + random.nextInt(4));
            return out;
        }
        if (type == int[][].class) {
            int rows = 1 + random.nextInt(4);
            int cols = 1 + random.nextInt(4);
            int[][] grid = new int[rows][cols];
            for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) grid[r][c] = pick(random);
            return grid;
        }
        if (type == char[][].class) {
            int rows = 1 + random.nextInt(4);
            int cols = 1 + random.nextInt(4);
            char[][] grid = new char[rows][cols];
            for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) grid[r][c] = (char) ('a' + random.nextInt(3));
            return grid;
        }
        if (type == List.class) {
            List<Integer> list = new ArrayList<>();
            int n = length(random);
            for (int i = 0; i < n; i++) list.add(pick(random));
            return list;
        }
        throw new IllegalArgumentException("unsupported " + type);
    }

    /**
     * Nudge generated arguments into the shape the problem plainly needs.
     *
     * A `k` that exceeds the array length makes both implementations throw, and the comparison
     * proves nothing — so where a later `int` argument is obviously a count or a bound over the
     * first array argument, it is clamped into range. This is a heuristic, and it only ever makes
     * an input *more* legal, never less.
     */
    static void harmonise(Method method, Object[] args) {
        int arrayLength = -1;
        for (Object arg : args) {
            if (arg instanceof int[] a) { arrayLength = a.length; break; }
            if (arg instanceof List<?> l) { arrayLength = l.size(); break; }
            if (arg instanceof String s) { arrayLength = s.length(); break; }
        }
        if (arrayLength <= 0) return;
        Class<?>[] types = method.getParameterTypes();
        for (int i = 1; i < args.length; i++) {
            if (types[i] == int.class && args[i] instanceof Integer value && value > arrayLength) {
                args[i] = 1 + (value % arrayLength);
            }
        }
    }

    static Object[] deepCopy(Object[] args) {
        Object[] copy = new Object[args.length];
        for (int i = 0; i < args.length; i++) copy[i] = copyOne(args[i]);
        return copy;
    }

    private static Object copyOne(Object value) {
        if (value instanceof int[] a) return a.clone();
        if (value instanceof char[] a) return a.clone();
        if (value instanceof String[] a) return a.clone();
        if (value instanceof int[][] a) {
            int[][] out = new int[a.length][];
            for (int i = 0; i < a.length; i++) out[i] = a[i].clone();
            return out;
        }
        if (value instanceof char[][] a) {
            char[][] out = new char[a.length][];
            for (int i = 0; i < a.length; i++) out[i] = a[i].clone();
            return out;
        }
        if (value instanceof List<?> list) return new ArrayList<>(list);
        return value;   // int, long, boolean, double, char, String are all immutable
    }

    private static int[] ints(Random random, int length) {
        int[] out = new int[length];
        for (int i = 0; i < length; i++) out[i] = pick(random);
        return out;
    }

    private static String word(Random random, int length) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < length; i++) out.append((char) ('a' + random.nextInt(3)));
        return out.toString();
    }

    private Generator() {}
}
