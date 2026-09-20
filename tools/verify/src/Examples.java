package verify;

import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

/**
 * Run every solution against the worked examples printed on its own page.
 *
 * This is the weakest of the three checks and the only one with near-total coverage. Differential
 * testing is far stronger, but 117 of the 165 problems carry a brute force written as an excerpt
 * rather than a program, so there is nothing to differentially test against. Those solutions
 * would otherwise be verified only by having compiled.
 *
 * What it catches: a solution that does not actually produce the answer printed beside it. That
 * is a real and likely failure mode here — the examples and the code were written in the same
 * sitting by the same author, and a mismatch between them is a mistake in one or the other, both
 * of which the reader will hit.
 *
 * What it cannot catch: a solution that is wrong in a way the examples do not exercise, which is
 * most wrongness. An example set is three inputs chosen by the person who wrote the code, and
 * they are exactly the three inputs the code was made to satisfy. Passing here is a floor, not a
 * ceiling, and `docs/VERIFICATION.md` reports it as such rather than folding it into one number.
 *
 * Inputs are written as `nums = [2,7,11,15], target = 9`, which is JSON once split on the commas
 * between assignments. Arguments are matched to parameters by name where javac recorded them
 * (`-parameters`) and positionally otherwise.
 */
public final class Examples {

    record Result(String id, String status, String detail, int passed, int total) {}

    public static void main(String[] args) throws Exception {
        Path build = Paths.get(args.length > 0 ? args[0] : ".");
        List<Map<String, Object>> manifest = Json.parseArray(Files.readString(build.resolve("manifest.json")));
        Set<String> compiled = new HashSet<>(
                Json.parseStringList(Files.readString(build.resolve("compile-report.json")), "compiled"));
        Map<String, List<Map<String, Object>>> examples = loadExamples(build.resolve("examples.json"));
        Map<String, Boolean> anyOrder = loadFlags(build.resolve("any-order.json"));

        List<Result> results = new ArrayList<>();
        for (Map<String, Object> entry : manifest) {
            String id = (String) entry.get("id");
            String optName = nested(entry, "optimized", "class");
            if (optName == null || !compiled.contains(optName)) {
                results.add(new Result(id, "NOT_COMPILED", "", 0, 0));
                continue;
            }
            List<Map<String, Object>> cases = examples.getOrDefault(id, List.of());
            if (cases.isEmpty()) {
                results.add(new Result(id, "NO_EXAMPLES", "", 0, 0));
                continue;
            }
            Compare.anyOrder(anyOrder.getOrDefault(id, false));
            results.add(replay(id, Class.forName("verify." + optName), cases));
        }

        StringBuilder json = new StringBuilder("[\n");
        for (int i = 0; i < results.size(); i++) {
            Result r = results.get(i);
            json.append("  {\"id\":\"").append(r.id).append("\",\"status\":\"").append(r.status)
                .append("\",\"passed\":").append(r.passed).append(",\"total\":").append(r.total)
                .append(",\"detail\":\"").append(Json.escape(r.detail)).append("\"}")
                .append(i == results.size() - 1 ? "\n" : ",\n");
        }
        json.append("]\n");
        Files.writeString(build.resolve("examples-report.json"), json.toString());

        Map<String, Integer> tally = new TreeMap<>();
        for (Result r : results) tally.merge(r.status, 1, Integer::sum);
        System.out.println("[examples] " + tally);
        int failures = 0;
        for (Result r : results) {
            if (r.status.equals("MISMATCH")) {
                System.out.println("  FAIL " + r.id + " - " + r.detail);
                failures++;
            }
        }
        System.exit(failures == 0 ? 0 : 1);
    }

    private static Result replay(String id, Class<?> type, List<Map<String, Object>> cases) {
        List<Method> candidates = new ArrayList<>();
        for (Method method : type.getDeclaredMethods()) {
            if (method.isSynthetic() || method.isBridge()) continue;
            if (Modifier.isPrivate(method.getModifiers())) continue;
            if (method.getParameterCount() == 0) continue;
            method.setAccessible(true);
            candidates.add(method);
        }
        if (candidates.isEmpty()) {
            return new Result(id, "NO_ENTRY_POINT", "no callable method", 0, cases.size());
        }

        Object instance;
        try {
            Constructor<?> constructor = type.getDeclaredConstructor();
            constructor.setAccessible(true);
            instance = constructor.newInstance();
        } catch (Exception e) {
            return new Result(id, "NOT_REPLAYABLE", "cannot instantiate", 0, cases.size());
        }

        int passed = 0;
        int attempted = 0;
        String firstFailure = null;

        for (Map<String, Object> example : cases) {
            String inputText = String.valueOf(example.get("input"));
            String outputText = String.valueOf(example.get("output"));
            Map<String, Object> named;
            try {
                named = Arguments.parse(inputText);
            } catch (RuntimeException e) {
                continue;   // an input written as prose rather than assignments
            }
            if (named.isEmpty()) continue;

            // first-bad-version is stated in terms of an API the judge owns, and the example
            // says where the pivot is in prose: "n = 5, first bad version is 4". Reading it lets
            // the problem be replayed instead of skipped.
            java.util.regex.Matcher pivot =
                    java.util.regex.Pattern.compile("first bad version is (\\d+)").matcher(inputText);
            if (pivot.find()) Api.firstBad = Integer.parseInt(pivot.group(1));

            Method method = pick(candidates, named.size());
            if (method == null) continue;

            Object[] arguments;
            try {
                arguments = Arguments.bind(method, named);
            } catch (RuntimeException e) {
                continue;   // a shape this harness cannot build — counted as not attempted
            }

            attempted++;
            Object expected;
            try {
                expected = Arguments.coerce(Json.parseObject(outputText.trim()), method.getReturnType());
            } catch (RuntimeException e) {
                attempted--;
                continue;
            }

            Object actual;
            try {
                boolean voidMethod = method.getReturnType() == void.class;
                Object returned = method.invoke(instance, arguments);
                actual = voidMethod ? arguments[0] : returned;
                if (voidMethod) expected = Arguments.coerce(Json.parseObject(outputText.trim()), arguments[0].getClass());
            } catch (InvocationTargetException e) {
                if (firstFailure == null) {
                    firstFailure = inputText + " threw " + e.getCause().getClass().getSimpleName();
                }
                continue;
            } catch (Exception e) {
                attempted--;
                continue;
            }

            if (Compare.equal(actual, expected)) {
                passed++;
            } else if (firstFailure == null) {
                firstFailure = inputText + " -> got " + Compare.show(actual) + ", page says " + outputText;
            }
        }

        if (attempted == 0) {
            return new Result(id, "NOT_REPLAYABLE", "examples are not in `name = value` form", 0, cases.size());
        }
        if (passed == attempted) {
            return new Result(id, "MATCHES_PAGE", "", passed, attempted);
        }
        return new Result(id, "MISMATCH", firstFailure == null ? "" : firstFailure, passed, attempted);
    }

    /** The method whose arity matches the number of named inputs, preferring a public one. */
    private static Method pick(List<Method> candidates, int arity) {
        Method best = null;
        for (Method method : candidates) {
            if (method.getParameterCount() != arity) continue;
            if (best == null || (Modifier.isPublic(method.getModifiers()) && !Modifier.isPublic(best.getModifiers()))) {
                best = method;
            }
        }
        return best;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Boolean> loadFlags(Path file) throws Exception {
        Map<String, Boolean> out = new HashMap<>();
        if (!Files.exists(file)) return out;
        Object root = Json.parseObject(Files.readString(file));
        for (Map.Entry<String, Object> entry : ((Map<String, Object>) root).entrySet()) {
            out.put(entry.getKey(), Boolean.TRUE.equals(entry.getValue()));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, List<Map<String, Object>>> loadExamples(Path file) throws Exception {
        Map<String, List<Map<String, Object>>> out = new HashMap<>();
        Object root = Json.parseObject(Files.readString(file));
        for (Map.Entry<String, Object> entry : ((Map<String, Object>) root).entrySet()) {
            out.put(entry.getKey(), (List<Map<String, Object>>) entry.getValue());
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static String nested(Map<String, Object> entry, String outer, String key) {
        Object value = entry.get(outer);
        if (!(value instanceof Map)) return null;
        Object inner = ((Map<String, Object>) value).get(key);
        return inner instanceof String s ? s : null;
    }

    private Examples() {}
}
