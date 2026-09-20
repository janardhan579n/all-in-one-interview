package verify;

import java.lang.reflect.*;
import java.util.*;

/**
 * Turn `nums = [2,7,11,15], target = 9` into the arguments a method wants.
 *
 * The examples are written for a human reader, so the parsing is deliberately strict: a line that
 * does not split cleanly into `name = value` assignments with JSON-shaped values is reported as
 * not replayable rather than guessed at. A guessed argument that happens to run proves nothing,
 * and a guessed argument that happens to fail would be a false accusation against the content.
 *
 * Arguments are bound to parameters by name when javac recorded them (`-parameters`, set in
 * `run.sh`) and positionally otherwise — which covers the case where the page calls it `nums` and
 * the signature calls it `arr`.
 */
final class Arguments {

    /** Split on the commas that separate assignments, not the ones inside `[1, 2, 3]`. */
    static Map<String, Object> parse(String input) {
        Map<String, Object> named = new LinkedHashMap<>();
        int depth = 0;
        boolean inString = false;
        int start = 0;
        List<String> pieces = new ArrayList<>();
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c == '"' && (i == 0 || input.charAt(i - 1) != '\\')) inString = !inString;
            if (inString) continue;
            if (c == '[' || c == '{' || c == '(') depth++;
            if (c == ']' || c == '}' || c == ')') depth--;
            if (c == ',' && depth == 0) {
                pieces.add(input.substring(start, i));
                start = i + 1;
            }
        }
        pieces.add(input.substring(start));

        for (String piece : pieces) {
            int equals = piece.indexOf('=');
            // `<=` and `==` inside a value are not assignments; a real one has a bare name left of it.
            if (equals <= 0) continue;
            String name = piece.substring(0, equals).trim();
            if (!name.matches("[A-Za-z_][A-Za-z0-9_]*")) continue;
            String value = piece.substring(equals + 1).trim();
            if (value.isEmpty()) continue;
            named.put(name, Json.parseObject(value));
        }
        return named;
    }

    static Object[] bind(Method method, Map<String, Object> named) {
        Parameter[] parameters = method.getParameters();
        Object[] out = new Object[parameters.length];
        List<Object> positional = new ArrayList<>(named.values());

        for (int i = 0; i < parameters.length; i++) {
            Object raw = named.containsKey(parameters[i].getName())
                    ? named.get(parameters[i].getName())
                    : positional.get(i);
            out[i] = coerce(raw, parameters[i].getType());
        }
        return out;
    }

    /** JSON value -> the Java type the parameter declares. Anything else is refused. */
    static Object coerce(Object value, Class<?> type) {
        if (type == int.class || type == Integer.class) return (int) asLong(value);
        if (type == long.class || type == Long.class) return asLong(value);
        if (type == double.class || type == Double.class) return asDouble(value);
        if (type == boolean.class || type == Boolean.class) return (Boolean) value;
        if (type == char.class) return String.valueOf(value).charAt(0);
        if (type == String.class) return String.valueOf(value);
        if (type == void.class) return null;

        if (value instanceof List<?> list) {
            if (type == int[].class) {
                int[] out = new int[list.size()];
                for (int i = 0; i < out.length; i++) out[i] = (int) asLong(list.get(i));
                return out;
            }
            if (type == char[].class) {
                char[] out = new char[list.size()];
                for (int i = 0; i < out.length; i++) out[i] = String.valueOf(list.get(i)).charAt(0);
                return out;
            }
            if (type == String[].class) {
                String[] out = new String[list.size()];
                for (int i = 0; i < out.length; i++) out[i] = String.valueOf(list.get(i));
                return out;
            }
            if (type == int[][].class) {
                int[][] out = new int[list.size()][];
                for (int i = 0; i < out.length; i++) out[i] = (int[]) coerce(list.get(i), int[].class);
                return out;
            }
            if (type == char[][].class) {
                char[][] out = new char[list.size()][];
                for (int i = 0; i < out.length; i++) out[i] = (char[]) coerce(list.get(i), char[].class);
                return out;
            }
            if (type == List.class || type == Collection.class || type.isAssignableFrom(ArrayList.class)) {
                List<Object> out = new ArrayList<>();
                for (Object item : list) {
                    out.add(item instanceof Long l ? (Object) l.intValue() : item);
                }
                return out;
            }
        }
        if (type == Object.class) return value;
        throw new IllegalArgumentException("cannot coerce " + value + " to " + type);
    }

    private static long asLong(Object value) {
        if (value instanceof Long l) return l;
        if (value instanceof Double d) return d.longValue();
        if (value instanceof Boolean b) return b ? 1 : 0;
        return Long.parseLong(String.valueOf(value).trim());
    }

    private static double asDouble(Object value) {
        if (value instanceof Double d) return d;
        if (value instanceof Long l) return l;
        return Double.parseDouble(String.valueOf(value).trim());
    }

    private Arguments() {}
}
