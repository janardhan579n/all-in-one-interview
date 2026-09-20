package verify;

import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;

/**
 * Differential testing for the problem bank.
 *
 * Each problem carries two independent implementations of the same specification: the brute force
 * the reader is shown first, and the optimised solution the lesson builds to. They were written
 * to teach a contrast, but they are also two programs that must agree. Running both over hundreds
 * of random inputs and demanding identical answers is the strongest correctness argument
 * available without a judge: for the pair to agree and both be wrong, the same mistake has to
 * appear twice, in two algorithms that share no structure.
 *
 * What this deliberately does NOT do:
 *   - prove a solution matches LeetCode's hidden tests. The problem statements here are the
 *     author's reconstruction, so the specification itself is unverified.
 *   - test problems whose brute force is an excerpt rather than a program, or whose parameters
 *     are shapes the generator cannot make. Those are reported as skipped, with the reason, and
 *     the report counts them honestly rather than folding them into a pass rate.
 */
public final class Runner {

    private static final int TRIALS = 400;

    record Outcome(String id, String status, String detail, int trials) {}

    /** Wraps an exception so "both threw the same thing" can count as agreement. */
    record Thrown(Throwable cause) {}

    public static void main(String[] args) throws Exception {
        Path build = Paths.get(args.length > 0 ? args[0] : ".");
        List<Map<String, Object>> manifest = Json.parseArray(Files.readString(build.resolve("manifest.json")));
        Set<String> compiled = new HashSet<>(
                Json.parseStringList(Files.readString(build.resolve("compile-report.json")), "compiled"));
        Map<String, Generator.Domain> domains = Domains.load(build.resolve("domains.json"));
        Map<String, Boolean> anyOrder = Domains.flags(build.resolve("any-order.json"));

        List<Outcome> outcomes = new ArrayList<>();
        for (Map<String, Object> entry : manifest) {
            String id = (String) entry.get("id");
            String optName = nested(entry, "optimized", "class");
            String bruteName = nested(entry, "bruteForce", "class");

            if (optName == null || !compiled.contains(optName)) {
                outcomes.add(new Outcome(id, "SOLUTION_DID_NOT_COMPILE", "", 0));
                continue;
            }
            if (bruteName == null) {
                outcomes.add(new Outcome(id, "NO_RUNNABLE_BRUTE_FORCE",
                        "the brute force is an excerpt, not a standalone program", 0));
                continue;
            }
            if (!compiled.contains(bruteName)) {
                outcomes.add(new Outcome(id, "NO_RUNNABLE_BRUTE_FORCE", "brute force does not compile", 0));
                continue;
            }
            Generator.use(domains.getOrDefault(id, Generator.Domain.OPEN));
            Compare.anyOrder(anyOrder.getOrDefault(id, false));
            outcomes.add(compare(id, Class.forName("verify." + optName), Class.forName("verify." + bruteName)));
        }

        StringBuilder json = new StringBuilder("[\n");
        for (int i = 0; i < outcomes.size(); i++) {
            Outcome o = outcomes.get(i);
            json.append("  {\"id\":\"").append(o.id).append("\",\"status\":\"").append(o.status)
                .append("\",\"trials\":").append(o.trials)
                .append(",\"detail\":\"").append(Json.escape(o.detail)).append("\"}")
                .append(i == outcomes.size() - 1 ? "\n" : ",\n");
        }
        json.append("]\n");
        Files.writeString(build.resolve("differential-report.json"), json.toString());

        Map<String, Integer> tally = new TreeMap<>();
        for (Outcome o : outcomes) tally.merge(o.status, 1, Integer::sum);
        System.out.println("[differential] " + tally);
        int failures = 0;
        for (Outcome o : outcomes) {
            if (o.status.equals("DISAGREE") || o.status.equals("SOLUTION_DID_NOT_COMPILE")) {
                System.out.println("  FAIL " + o.id + " - " + o.detail);
                failures++;
            }
        }
        System.exit(failures == 0 ? 0 : 1);
    }

    /** Find the one method the two classes share, then hammer it. */
    private static Outcome compare(String id, Class<?> opt, Class<?> brute) {
        Method optMethod = null;
        Method bruteMethod = null;

        List<Method> optCandidates = entryPoints(opt);
        List<Method> bruteCandidates = entryPoints(brute);

        outer:
        for (Method a : optCandidates) {
            for (Method b : bruteCandidates) {
                // Return types must match too. Without that check, sort-colors paired a void
                // in-place sort against a brute force returning the sorted array, and every trial
                // "disagreed" because null is not an int[] — a harness bug reported as a defect.
                if (a.getName().equals(b.getName())
                        && Arrays.equals(a.getParameterTypes(), b.getParameterTypes())
                        && a.getReturnType().equals(b.getReturnType())) {
                    optMethod = a;
                    bruteMethod = b;
                    break outer;
                }
            }
        }
        if (optMethod == null && optCandidates.size() == 1 && bruteCandidates.size() == 1
                && Arrays.equals(optCandidates.get(0).getParameterTypes(), bruteCandidates.get(0).getParameterTypes())
                && optCandidates.get(0).getReturnType().equals(bruteCandidates.get(0).getReturnType())) {
            optMethod = optCandidates.get(0);
            bruteMethod = bruteCandidates.get(0);
        }
        if (optMethod == null) {
            return new Outcome(id, "NO_COMPARABLE_PAIR",
                    "no method in the two blocks shares a name, signature and return type", 0);
        }

        Class<?>[] params = optMethod.getParameterTypes();
        for (Class<?> p : params) {
            if (!Generator.supports(p)) {
                return new Outcome(id, "UNSUPPORTED_SIGNATURE", "cannot generate a " + p.getSimpleName(), 0);
            }
        }
        if (params.length == 0) {
            return new Outcome(id, "UNSUPPORTED_SIGNATURE", "takes no arguments", 0);
        }

        Object optInstance;
        Object bruteInstance;
        try {
            optInstance = instance(opt);
            bruteInstance = instance(brute);
        } catch (Exception e) {
            return new Outcome(id, "UNSUPPORTED_SIGNATURE", "cannot instantiate: " + e, 0);
        }

        // Seeded from the problem id, so a disagreement reproduces exactly on the next run.
        Random random = new Random(id.hashCode());
        Type[] declared = optMethod.getGenericParameterTypes();

        for (int trial = 0; trial < TRIALS; trial++) {
            Object[] seed = new Object[params.length];
            for (int i = 0; i < params.length; i++) {
                seed[i] = Generator.make(declared[i], random);
            }
            Generator.harmonise(optMethod, seed);
            // A handful of problems state structural preconditions (a permutation, a sorted pair
            // of arrays, "every element appears exactly twice") that no type-driven generator
            // will hit by chance. Those get a named repair rather than a skip.
            Preconditions.apply(id, seed, random);

            // Fresh copies: a great many of these solutions mutate their input in place, and the
            // second one to run would otherwise see the first one's output.
            Object[] argsA = Generator.deepCopy(seed);
            Object[] argsB = Generator.deepCopy(seed);

            Object resultA;
            Object resultB;
            try {
                resultA = optMethod.invoke(optInstance, argsA);
            } catch (InvocationTargetException e) {
                resultA = new Thrown(e.getCause());
            } catch (Exception e) {
                return new Outcome(id, "UNSUPPORTED_SIGNATURE", "invocation failed: " + e, trial);
            }
            try {
                resultB = bruteMethod.invoke(bruteInstance, argsB);
            } catch (InvocationTargetException e) {
                resultB = new Thrown(e.getCause());
            } catch (Exception e) {
                return new Outcome(id, "UNSUPPORTED_SIGNATURE", "invocation failed: " + e, trial);
            }

            boolean voidMethod = optMethod.getReturnType() == void.class;
            boolean same = voidMethod
                    // A void method's answer is whatever it did to its arguments.
                    ? Compare.equal(argsA, argsB)
                    : Compare.equal(resultA, resultB);

            if (!same) {
                String detail = "input " + Compare.show(seed)
                        + " -> optimised " + Compare.show(voidMethod ? argsA : resultA)
                        + " but brute force " + Compare.show(voidMethod ? argsB : resultB);
                return new Outcome(id, "DISAGREE", detail, trial);
            }
        }

        String how = optMethod.getName() + "(" + params.length + " args)"
                + (Preconditions.has(id) ? ", preconditions enforced" : "");
        return new Outcome(id, "AGREE", how, TRIALS);
    }

    /** Methods worth treating as the problem's answer: public, non-synthetic, with arguments. */
    private static List<Method> entryPoints(Class<?> type) {
        List<Method> found = new ArrayList<>();
        for (Method method : type.getDeclaredMethods()) {
            if (method.isSynthetic() || method.isBridge()) continue;
            if (Modifier.isPrivate(method.getModifiers())) continue;
            if (method.getParameterCount() == 0) continue;
            method.setAccessible(true);
            found.add(method);
        }
        found.sort(Comparator.comparing(Method::getName));
        return found;
    }

    private static Object instance(Class<?> type) throws Exception {
        Constructor<?> constructor = type.getDeclaredConstructor();
        constructor.setAccessible(true);
        return constructor.newInstance();
    }

    @SuppressWarnings("unchecked")
    private static String nested(Map<String, Object> entry, String outer, String key) {
        Object value = entry.get(outer);
        if (!(value instanceof Map)) return null;
        Object inner = ((Map<String, Object>) value).get(key);
        return inner instanceof String s ? s : null;
    }
}
