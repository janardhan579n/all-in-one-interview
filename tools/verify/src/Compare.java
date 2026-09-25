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

        // Two trees are the same answer when they have the same shape and the same values —
        // not when they are the same object, which they never are after a deep copy.
        if (a instanceof Support.TreeNode || b instanceof Support.TreeNode) {
            return sameTree(a instanceof Support.TreeNode t ? t : null,
                            b instanceof Support.TreeNode t ? t : null);
        }
        if (a instanceof Support.ListNode || b instanceof Support.ListNode) {
            return sameList(a instanceof Support.ListNode l ? l : null,
                            b instanceof Support.ListNode l ? l : null);
        }
        if (a instanceof Support.Node || b instanceof Support.Node) {
            return sameNodeList(a instanceof Support.Node n ? n : null,
                                b instanceof Support.Node n ? n : null);
        }

        if (a instanceof double[] da && b instanceof double[] db) {
            if (da.length != db.length) return false;
            for (int i = 0; i < da.length; i++) {
                double scale = Math.max(1.0, Math.max(Math.abs(da[i]), Math.abs(db[i])));
                if (Math.abs(da[i] - db[i]) > 1e-9 * scale) return false;
            }
            return true;
        }
        if (a instanceof Support.ListNode[] la && b instanceof Support.ListNode[] lb) {
            if (la.length != lb.length) return false;
            for (int i = 0; i < la.length; i++) if (!sameList(la[i], lb[i])) return false;
            return true;
        }
        if (a instanceof Support.Node[] na && b instanceof Support.Node[] nb) {
            if (na.length != nb.length) return false;
            for (int i = 0; i < na.length; i++) if (!sameNodeList(na[i], nb[i])) return false;
            return true;
        }
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

    private static boolean sameTree(Support.TreeNode a, Support.TreeNode b) {
        if (a == null || b == null) return a == b;
        return a.val == b.val && sameTree(a.left, b.left) && sameTree(a.right, b.right);
    }

    private static boolean sameList(Support.ListNode a, Support.ListNode b) {
        // Bounded: a solution that accidentally builds a cycle would otherwise hang the harness
        // rather than report a disagreement, which is the least useful way to fail.
        int guard = 0;
        while (a != null && b != null) {
            if (a.val != b.val) return false;
            a = a.next;
            b = b.next;
            if (++guard > 10_000) return false;
        }
        return a == null && b == null;
    }

    private static boolean sameNodeList(Support.Node a, Support.Node b) {
        int guard = 0;
        while (a != null && b != null) {
            if (a.val != b.val) return false;
            a = a.next;
            b = b.next;
            if (++guard > 10_000) return false;
        }
        return a == null && b == null;
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
        if (value instanceof Support.TreeNode tree) return "tree" + levelOrder(tree);
        if (value instanceof Support.ListNode list) {
            StringBuilder out = new StringBuilder("[");
            int guard = 0;
            for (Support.ListNode at = list; at != null && guard < 40; at = at.next, guard++) {
                if (guard > 0) out.append(" -> ");
                out.append(at.val);
            }
            return out.append(guard >= 40 ? " -> ...(cycle?)]" : "]").toString();
        }
        if (value instanceof Support.Node node) {
            StringBuilder out = new StringBuilder("[");
            int guard = 0;
            for (Support.Node at = node; at != null && guard < 40; at = at.next, guard++) {
                if (guard > 0) out.append(" -> ");
                out.append(at.val);
            }
            return out.append(guard >= 40 ? " -> ...(cycle?)]" : "]").toString();
        }
        if (value instanceof Object[] array) {
            List<String> parts = new ArrayList<>();
            for (Object item : array) parts.add(show(item));
            return "(" + String.join(", ", parts) + ")";
        }
        if (value instanceof double[] array) return Arrays.toString(array);
        if (value instanceof int[] array) return Arrays.toString(array);
        if (value instanceof char[] array) return new String(array);
        if (value instanceof int[][] grid) return Arrays.deepToString(grid);
        if (value instanceof char[][] grid) return Arrays.deepToString(grid);
        String text = String.valueOf(value);
        return text.length() > 120 ? text.substring(0, 117) + "..." : text;
    }

    /** Level order with explicit nulls, which is how the problem pages write trees. */
    private static String levelOrder(Support.TreeNode root) {
        if (root == null) return "[]";
        List<String> out = new ArrayList<>();
        // LinkedList, not ArrayDeque: the null children ARE the information here — they are what
        // makes a level-order rendering unambiguous — and ArrayDeque refuses to hold null.
        Queue<Support.TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty() && out.size() < 40) {
            Support.TreeNode node = queue.poll();
            if (node == null) {
                out.add("null");
                continue;
            }
            out.add(String.valueOf(node.val));
            queue.add(node.left);
            queue.add(node.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(",", out) + "]";
    }

    private Compare() {}
}
