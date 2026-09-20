package verify;

import java.util.*;

/**
 * Comparing two answers to the same question.
 *
 * Three honest complications:
 *
 *  - **Order.** Several of these problems have answers that are sets, not sequences — the groups
 *    from group-anagrams, the subsets of a list, the words found on a board. The brute force and
 *    the optimised solution reach them in different orders, and calling that a disagreement
 *    would bury the real failures under noise. So nested collections are compared as multisets:
 *    same elements, same counts, order ignored. That is weaker than exact comparison and it is
 *    the right weaker thing — a problem whose answer genuinely depends on order (spiral matrix,
 *    a sorted array) returns a flat array or a String, which IS compared in order.
 *
 *  - **Floating point.** Fast exponentiation multiplies in a different order from a loop, so
 *    0.73^8 came out 0.08064600918940805 against ...809. That is not a disagreement about the
 *    answer, it is arithmetic, and it is compared with a relative epsilon.
 *
 *  - **Exceptions.** If both implementations throw the same kind of exception on an input, they
 *    agree: the input was outside the problem's constraints and both said so. If only one throws,
 *    that is a disagreement worth seeing, because it usually means one of them has an edge case
 *    the other does not.
 */
final class Compare {

    /**
     * Whether the problem under test says its answer may be returned in any order.
     *
     * Read from the problem's own statement by the extractor, never assumed. top-k-frequent
     * returning [2,1] where the page prints [1,2] is not a defect — the problem says so in the
     * sentence above the examples — but merge-intervals returning its intervals shuffled would
     * be, so this is not something to turn on globally.
     */
    private static boolean anyOrder = false;

    static void anyOrder(boolean value) {
        anyOrder = value;
    }

    static boolean equal(Object a, Object b) {
        if (a instanceof Runner.Thrown ta && b instanceof Runner.Thrown tb) {
            return ta.cause().getClass().equals(tb.cause().getClass());
        }
        if (a instanceof Runner.Thrown || b instanceof Runner.Thrown) return false;
        if (a == null || b == null) return a == b;

        if (a instanceof Double da && b instanceof Double db) {
            if (da.isNaN() && db.isNaN()) return true;
            double scale = Math.max(1.0, Math.max(Math.abs(da), Math.abs(db)));
            return Math.abs(da - db) <= 1e-9 * scale;
        }

        // The order-insensitive case is checked FIRST, because `int[][]` is an `Object[]` at
        // runtime: k-closest-points returning its two points swapped fell into the element-wise
        // branch below and was reported as a mismatch, on a problem whose statement says the
        // answer may be returned in any order.
        if (anyOrder && a.getClass().isArray() && b.getClass().isArray()) {
            int lengthA = java.lang.reflect.Array.getLength(a);
            int lengthB = java.lang.reflect.Array.getLength(b);
            if (lengthA != lengthB) return false;
            List<String> left = new ArrayList<>();
            List<String> right = new ArrayList<>();
            for (int i = 0; i < lengthA; i++) {
                left.add(canonical(java.lang.reflect.Array.get(a, i)));
                right.add(canonical(java.lang.reflect.Array.get(b, i)));
            }
            Collections.sort(left);
            Collections.sort(right);
            return left.equals(right);
        }
        if (a instanceof Object[] oa && b instanceof Object[] ob) {
            if (oa.length != ob.length) return false;
            for (int i = 0; i < oa.length; i++) if (!equal(oa[i], ob[i])) return false;
            return true;
        }
        if (a.getClass().isArray() && b.getClass().isArray()) {
            return Objects.deepEquals(a, b);
        }
        if (a instanceof Collection<?> ca && b instanceof Collection<?> cb) {
            if (ca.size() != cb.size()) return false;
            boolean nested = ca.stream().anyMatch(item -> item instanceof Collection || item instanceof int[]);
            if (!nested) {
                // A flat list is usually ordered, but a few problems say "in any order".
                if (ca.equals(cb)) return true;
                return multiset(ca).equals(multiset(cb));
            }
            return multiset(ca).equals(multiset(cb));
        }
        return Objects.deepEquals(a, b);
    }

    /** Canonical form so nested collections compare without caring about order. */
    private static Map<String, Integer> multiset(Collection<?> items) {
        Map<String, Integer> counts = new HashMap<>();
        for (Object item : items) counts.merge(canonical(item), 1, Integer::sum);
        return counts;
    }

    private static String canonical(Object value) {
        if (value instanceof Collection<?> collection) {
            List<String> parts = new ArrayList<>();
            for (Object item : collection) parts.add(canonical(item));
            Collections.sort(parts);
            return "[" + String.join(",", parts) + "]";
        }
        if (value instanceof int[] array) {
            // Sorted only when the problem allows any order; otherwise the order IS the answer.
            if (!anyOrder) return Arrays.toString(array);
            int[] sorted = array.clone();
            Arrays.sort(sorted);
            return Arrays.toString(sorted);
        }
        if (value != null && value.getClass().isArray()) {
            List<String> parts = new ArrayList<>();
            int length = java.lang.reflect.Array.getLength(value);
            for (int i = 0; i < length; i++) parts.add(canonical(java.lang.reflect.Array.get(value, i)));
            if (anyOrder) Collections.sort(parts);
            return "[" + String.join(",", parts) + "]";
        }
        return String.valueOf(value);
    }

    static String show(Object value) {
        if (value instanceof Runner.Thrown thrown) return "threw " + thrown.cause().getClass().getSimpleName();
        if (value instanceof Object[] array) {
            List<String> parts = new ArrayList<>();
            for (Object item : array) parts.add(show(item));
            return "(" + String.join(", ", parts) + ")";
        }
        if (value instanceof int[] array) return Arrays.toString(array);
        if (value instanceof char[] array) return new String(array);
        if (value instanceof int[][] grid) return Arrays.deepToString(grid);
        if (value instanceof char[][] grid) return Arrays.deepToString(grid);
        String text = String.valueOf(value);
        return text.length() > 120 ? text.substring(0, 117) + "..." : text;
    }

    private Compare() {}
}
