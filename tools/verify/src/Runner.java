package verify;

import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;
import java.util.function.BiPredicate;
import java.util.stream.Collectors;

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

    /**
     * Problems whose premise is that the tree is a binary SEARCH tree.
     *
     * On a random tree these are vacuous: both implementations would agree it is not a BST, and
     * the test would prove nothing about the case the problem actually asks about.
     */
    private static final Set<String> BST_PROBLEMS =
            Set.of("validate-bst", "kth-smallest-in-bst", "lowest-common-ancestor-bst");

    /**
     * Pairs that are allowed to disagree, with the reason.
     *
     * serialize-deserialize-tree is the clear case: the two implementations use different
     * encodings — preorder with null markers against a flattened inorder — and the problem never
     * asked them to agree on a string. What it requires is that `deserialize(serialize(t))`
     * reproduces `t`, and comparing the intermediate encodings tests a property nobody claimed.
     * Reporting it as a failure would be the harness marking its own misunderstanding as a defect
     * in the content, which is the one thing a verification tool must never do.
     */
    private static final Map<String, String> INCOMPARABLE = Map.of(
            "serialize-deserialize-tree",
            "the two use different encodings; the property is round-trip, not string equality");

    /**
     * Brute forces the page states are WRONG, with the fault each one is there to demonstrate.
     *
     * These are not defects. On three problems the naive approach is not merely slow, it is
     * incorrect, and saying so is the most useful thing the page does — the reader meets the
     * implementation they would have written, and then meets the input that breaks it. The
     * `whySlow` text on each of these is an argument, and the argument has a counterexample in it.
     *
     * For these three the harness inverts: a DISAGREEMENT is the pass, because it reproduces the
     * documented fault, and unbroken AGREEMENT is the failure. That matters more than it sounds.
     * If someone later "tidies" one of these brute forces into a correct one, every other check
     * in this project goes green — the content validator is happy, the page still renders, the
     * differential test reports AGREE — and the page is left asserting a fault that no longer
     * exists, with a counterexample that no longer breaks anything. Nothing else catches that.
     */
    private static final Map<String, String> WRONG_BY_DESIGN = Map.ofEntries(
            Map.entry("validate-bst",
            "checks each node only against its immediate children, so a value that is legal "
                    + "locally but violates an ancestor's bound is accepted"),
            Map.entry("same-tree",
            "compares inorder traversals without null markers, so two differently-shaped trees "
                    + "that flatten alike are reported identical"),
            Map.entry("add-two-numbers",
            "packs the digits into a long to borrow the CPU's carry, which overflows well before "
                    + "the 100 digits the constraints allow"),
            Map.entry("coin-change",
                    "takes the largest coin that fits at each step, which is optimal only for "
                            + "canonical coin systems — [1,3,4] for 6 gives 4+1+1, not 3+3"));

    /**
     * Problems whose answer is valid rather than unique, checked by property instead of equality.
     *
     * reorganize-string asks for *an* arrangement with no two adjacent letters equal. Two correct
     * implementations routinely return different strings, and `babcab` against `ababcb` is not a
     * defect — but calling the problem incomparable and skipping it would throw away a real test,
     * because there is something precise to check: each answer must be a permutation of the input
     * with no equal neighbours, and the two must agree on whether any arrangement exists at all.
     * That is a stronger claim than string equality, not a weaker one — equality would pass a pair
     * of implementations that are both wrong in the same way, and this will not.
     */
    private static final Map<String, BiPredicate<Object[], Object>> PROPERTIES = Map.of(
            "reorganize-string", (args, result) -> {
                if (!(args[0] instanceof String input) || !(result instanceof String answer)) return false;
                if (answer.isEmpty()) return true;              // "no arrangement exists" — checked below
                int[] counts = new int[128];
                for (char c : input.toCharArray()) counts[c]++;
                for (char c : answer.toCharArray()) counts[c]--;
                for (int count : counts) if (count != 0) return false;
                for (int i = 1; i < answer.length(); i++) {
                    if (answer.charAt(i) == answer.charAt(i - 1)) return false;
                }
                return true;
            });

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
            if (INCOMPARABLE.containsKey(id)) {
                outcomes.add(new Outcome(id, "NOT_COMPARABLE_BY_DESIGN", INCOMPARABLE.get(id), 0));
                continue;
            }
            Generator.use(domains.getOrDefault(id, Generator.Domain.OPEN));
            Generator.bst(BST_PROBLEMS.contains(id));
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

        // A class with no zero-argument constructor is a design problem. Deciding that here,
        // before the pairing below, matters: that pairing discards zero-argument methods (for a
        // value problem they cannot be the answer), and `deQueue()`, `isEmpty()` and `Front()` are
        // exactly the operations a queue is made of.
        if (!hasNoArgConstructor(opt)) {
            return stateful(id, opt, brute);
        }

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
        } catch (NoSuchMethodException missing) {
            // No zero-argument constructor means this is a DESIGN problem — LRUCache, MyCircularQueue,
            // MovingAverage, NumArray — where the object carries state between calls and the single
            // shared entry point the code above found is only one of several operations. Calling
            // one method on a fresh object would test almost nothing about it.
            return stateful(id, opt, brute);
        } catch (Exception e) {
            return new Outcome(id, "UNSUPPORTED_SIGNATURE", "cannot instantiate: " + e, 0);
        }

        // Seeded from the problem id, so a disagreement reproduces exactly on the next run.
        Random random = new Random(id.hashCode());
        Type[] declared = optMethod.getGenericParameterTypes();

        // Agreement is only evidence if the two implementations actually computed something.
        // Three of these pairs were reported AGREE across 400 trials while both sides threw
        // NumberFormatException on every single one, because the generator never produced a
        // legal token; another saw one distinct answer, because every generated array was
        // constant. That is a green tick certifying that two programs fail identically, and it
        // is exactly the kind of false assurance this whole harness exists to remove — so the
        // outcome is counted, not just compared.
        int bothThrew = 0;
        Set<String> distinctAnswers = new HashSet<>();

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
            // Relationships between arguments do not survive an independent deep copy of each.
            Preconditions.rebind(id, argsA);
            Preconditions.rebind(id, argsB);

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
            BiPredicate<Object[], Object> property = PROPERTIES.get(id);
            boolean same;
            if (property != null && !(resultA instanceof Thrown) && !(resultB instanceof Thrown)) {
                // Both answers must be valid, and they must agree on whether one exists.
                boolean emptyA = "".equals(resultA);
                boolean emptyB = "".equals(resultB);
                same = emptyA == emptyB
                        && property.test(seed, resultA)
                        && property.test(seed, resultB);
            } else if (voidMethod) {
                // A void method's answer is whatever it did to its arguments.
                same = Compare.equal(argsA, argsB);
            } else {
                same = Compare.equal(resultA, resultB);
            }

            if (resultA instanceof Thrown && resultB instanceof Thrown) {
                bothThrew++;
            } else if (distinctAnswers.size() < 64) {
                distinctAnswers.add(Compare.show(voidMethod ? argsA : resultA));
            }

            if (!same) {
                String detail = "input " + Compare.show(seed)
                        + " -> optimised " + Compare.show(voidMethod ? argsA : resultA)
                        + " but brute force " + Compare.show(voidMethod ? argsB : resultB);
                if (WRONG_BY_DESIGN.containsKey(id)) {
                    return new Outcome(id, "DISAGREES_AS_DOCUMENTED",
                            WRONG_BY_DESIGN.get(id) + " — reproduced at trial " + trial + ": " + detail, trial);
                }
                return new Outcome(id, "DISAGREE", detail, trial);
            }
        }

        if (WRONG_BY_DESIGN.containsKey(id)) {
            return new Outcome(id, "FAULT_NOT_REPRODUCED",
                    "the page says this brute force " + WRONG_BY_DESIGN.get(id)
                            + ", but it agreed with the optimised solution on all " + TRIALS
                            + " trials. Either the brute force was changed and the page's argument is now "
                            + "false, or the generator cannot reach the input that breaks it.", TRIALS);
        }

        String how = optMethod.getName() + "(" + params.length + " args)"
                + (Preconditions.has(id) ? ", preconditions enforced" : "")
                + (PROPERTIES.containsKey(id) ? ", checked by property (the answer is valid, not unique)" : "");

        if (bothThrew == TRIALS) {
            return new Outcome(id, "AGREE_BUT_VACUOUS",
                    "both threw on every one of " + TRIALS + " trials — the generator never built a legal input, "
                            + "so this proves the two fail alike, not that either is right", TRIALS);
        }
        if (distinctAnswers.size() <= 1) {
            return new Outcome(id, "AGREE_BUT_VACUOUS",
                    "only one distinct answer across " + TRIALS + " trials ("
                            + (distinctAnswers.isEmpty() ? "none recorded" : distinctAnswers.iterator().next())
                            + ") — the inputs are degenerate, so agreement says little", TRIALS);
        }
        return new Outcome(id, "AGREE", how + ", " + distinctAnswers.size() + " distinct answers"
                + (bothThrew > 0 ? ", " + bothThrew + " trials threw on both sides" : ""), TRIALS);
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

    /**
     * Differential testing for the design problems, where the answer is a sequence rather than a
     * value.
     *
     * A stateful class cannot be checked one call at a time. `get(2)` on an LRU cache is correct
     * or not depending on every put and get that came before it, so the only meaningful test is to
     * build both objects with the same capacity and then drive the SAME random sequence of
     * operations through both, comparing after every single call. A divergence reported at step 14
     * is far more useful than one reported at the end, because the sequence up to that point is
     * the reproduction.
     *
     * The eviction policy is exactly the part that only shows up under a sequence: a cache that
     * never evicts agrees with a correct one until the moment it exceeds its capacity.
     */
    private static Outcome stateful(String id, Class<?> opt, Class<?> brute) {
        Constructor<?> optCtor = widestSupportedConstructor(opt);
        Constructor<?> bruteCtor = widestSupportedConstructor(brute);
        if (optCtor == null || bruteCtor == null) {
            return new Outcome(id, "UNSUPPORTED_SIGNATURE",
                    "no constructor whose arguments the generator can build", 0);
        }
        if (!Arrays.equals(optCtor.getParameterTypes(), bruteCtor.getParameterTypes())) {
            return new Outcome(id, "NO_COMPARABLE_PAIR",
                    "the two classes take different constructor arguments ("
                            + shape(optCtor.getParameterTypes()) + " against "
                            + shape(bruteCtor.getParameterTypes()) + ")", 0);
        }

        // Operations present in BOTH classes, matched on name, arguments and return type.
        List<Method[]> operations = new ArrayList<>();
        for (Method a : operations(opt)) {
            for (Method b : operations(brute)) {
                if (a.getName().equals(b.getName())
                        && Arrays.equals(a.getParameterTypes(), b.getParameterTypes())
                        && a.getReturnType().equals(b.getReturnType())
                        && Arrays.stream(a.getParameterTypes()).allMatch(Generator::supports)) {
                    operations.add(new Method[] {a, b});
                    break;
                }
            }
        }
        if (operations.isEmpty()) {
            return new Outcome(id, "NO_COMPARABLE_PAIR", "the two classes share no operation", 0);
        }

        Random random = new Random(id.hashCode());
        int sequences = TRIALS / 10;
        int calls = 0;
        Set<String> distinctAnswers = new HashSet<>();

        for (int sequence = 0; sequence < sequences; sequence++) {
            Object[] seedCtor = new Object[optCtor.getParameterTypes().length];
            for (int i = 0; i < seedCtor.length; i++) {
                seedCtor[i] = Generator.make(optCtor.getParameterTypes()[i], random);
            }
            // A capacity of zero or a negative one is outside every one of these problems'
            // constraints, and makes both sides throw on the first call.
            for (int i = 0; i < seedCtor.length; i++) {
                if (seedCtor[i] instanceof Integer n) seedCtor[i] = 1 + Math.floorMod(n, 4);
            }
            Preconditions.apply(id, seedCtor, random);

            Object optObject;
            Object bruteObject;
            try {
                optCtor.setAccessible(true);
                bruteCtor.setAccessible(true);
                optObject = optCtor.newInstance(Generator.deepCopy(seedCtor));
                bruteObject = bruteCtor.newInstance(Generator.deepCopy(seedCtor));
            } catch (Exception e) {
                return new Outcome(id, "UNSUPPORTED_SIGNATURE", "cannot construct: " + e, calls);
            }

            List<String> history = new ArrayList<>();
            for (int step = 0; step < 24; step++) {
                Method[] pair = operations.get(random.nextInt(operations.size()));
                Object[] seed = new Object[pair[0].getParameterTypes().length];
                for (int i = 0; i < seed.length; i++) {
                    seed[i] = Generator.make(pair[0].getParameterTypes()[i], random);
                    // Keys drawn from a small pool, or a cache is never asked for a key it holds
                    // and every get is a miss — an agreement about nothing.
                    if (seed[i] instanceof Integer n) seed[i] = Math.floorMod(n, 6);
                }
                // Some operations have preconditions of their own — sumRange requires
                // 0 <= left <= right < n, and n lives in the constructor's arguments, not here.
                Preconditions.operation(id, pair[0].getName(), seedCtor, seed);
                history.add(pair[0].getName() + Compare.show(seed));
                calls++;

                Object resultA = call(pair[0], optObject, Generator.deepCopy(seed));
                Object resultB = call(pair[1], bruteObject, Generator.deepCopy(seed));
                if (!(resultA instanceof Thrown) && distinctAnswers.size() < 64) {
                    distinctAnswers.add(Compare.show(resultA));
                }
                if (!Compare.equal(resultA, resultB)) {
                    return new Outcome(id, "DISAGREE",
                            "constructed with " + Compare.show(seedCtor) + ", then "
                                    + String.join(" ", history) + " -> optimised "
                                    + Compare.show(resultA) + " but brute force " + Compare.show(resultB),
                            calls);
                }
            }
        }

        if (distinctAnswers.size() <= 1) {
            return new Outcome(id, "AGREE_BUT_VACUOUS",
                    "only one distinct answer across " + calls + " calls — the sequences are degenerate", calls);
        }
        return new Outcome(id, "AGREE", operations.size() + " operations driven through "
                + sequences + " random sequences (" + calls + " calls), "
                + distinctAnswers.size() + " distinct answers", calls);
    }

    private static Object call(Method method, Object target, Object[] args) {
        try {
            Object returned = method.invoke(target, args);
            // A void operation's answer is that it completed; the state it changed is checked by
            // the next call that reads it.
            return method.getReturnType() == void.class ? "void" : returned;
        } catch (InvocationTargetException e) {
            return new Thrown(e.getCause());
        } catch (Exception e) {
            return new Thrown(e);
        }
    }

    private static boolean hasNoArgConstructor(Class<?> type) {
        try {
            type.getDeclaredConstructor();
            return true;
        } catch (NoSuchMethodException absent) {
            return false;
        }
    }

    /** Like entryPoints, but keeps zero-argument methods: on a stateful object they are operations. */
    private static List<Method> operations(Class<?> type) {
        List<Method> found = new ArrayList<>();
        for (Method method : type.getDeclaredMethods()) {
            if (method.isSynthetic() || method.isBridge()) continue;
            if (Modifier.isPrivate(method.getModifiers())) continue;
            method.setAccessible(true);
            found.add(method);
        }
        found.sort(Comparator.comparing(Method::getName));
        return found;
    }

    private static Constructor<?> widestSupportedConstructor(Class<?> type) {
        Constructor<?> best = null;
        for (Constructor<?> candidate : type.getDeclaredConstructors()) {
            if (candidate.isSynthetic()) continue;
            if (!Arrays.stream(candidate.getParameterTypes()).allMatch(Generator::supports)) continue;
            if (best == null || candidate.getParameterCount() > best.getParameterCount()) best = candidate;
        }
        return best;
    }

    private static String shape(Class<?>[] types) {
        return Arrays.stream(types).map(Class::getSimpleName).collect(Collectors.joining(", ", "(", ")"));
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
