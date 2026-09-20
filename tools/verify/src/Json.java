package verify;

import java.util.*;

/**
 * A JSON reader small enough to read in one sitting.
 *
 * The harness reads two files it wrote itself, and adding a dependency to a verification tool
 * means the verification tool needs verifying. This handles objects, arrays, strings, numbers
 * and booleans, which is all those files contain, and throws on anything else rather than
 * guessing.
 */
final class Json {

    private final String text;
    private int at;

    private Json(String text) {
        this.text = text;
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> parseArray(String text) {
        return (List<Map<String, Object>>) new Json(text).value();
    }

    static Object parseObject(String text) {
        return new Json(text).value();
    }

    @SuppressWarnings("unchecked")
    static List<String> parseStringList(String text, String key) {
        Object root = new Json(text).value();
        Object list = ((Map<String, Object>) root).get(key);
        List<String> out = new ArrayList<>();
        for (Object item : (List<Object>) list) out.add(String.valueOf(item));
        return out;
    }

    static String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }

    private Object value() {
        skip();
        char c = text.charAt(at);
        return switch (c) {
            case '{' -> object();
            case '[' -> array();
            case '"' -> string();
            case 't' -> { at += 4; yield Boolean.TRUE; }
            case 'f' -> { at += 5; yield Boolean.FALSE; }
            case 'n' -> { at += 4; yield null; }
            default -> number();
        };
    }

    private Map<String, Object> object() {
        Map<String, Object> map = new LinkedHashMap<>();
        at++;
        skip();
        if (text.charAt(at) == '}') { at++; return map; }
        while (true) {
            skip();
            String key = string();
            skip();
            at++;   // ':'
            map.put(key, value());
            skip();
            char c = text.charAt(at++);
            if (c == '}') return map;
            if (c != ',') throw new IllegalStateException("expected , or } at " + at);
        }
    }

    private List<Object> array() {
        List<Object> list = new ArrayList<>();
        at++;
        skip();
        if (text.charAt(at) == ']') { at++; return list; }
        while (true) {
            list.add(value());
            skip();
            char c = text.charAt(at++);
            if (c == ']') return list;
            if (c != ',') throw new IllegalStateException("expected , or ] at " + at);
        }
    }

    private String string() {
        StringBuilder out = new StringBuilder();
        at++;
        while (true) {
            char c = text.charAt(at++);
            if (c == '"') return out.toString();
            if (c != '\\') { out.append(c); continue; }
            char escaped = text.charAt(at++);
            switch (escaped) {
                case 'n' -> out.append('\n');
                case 't' -> out.append('\t');
                case 'r' -> out.append('\r');
                case 'b' -> out.append('\b');
                case 'f' -> out.append('\f');
                case 'u' -> { out.append((char) Integer.parseInt(text.substring(at, at + 4), 16)); at += 4; }
                default -> out.append(escaped);
            }
        }
    }

    private Object number() {
        int start = at;
        while (at < text.length() && "-+.eE0123456789".indexOf(text.charAt(at)) >= 0) at++;
        String raw = text.substring(start, at);
        return raw.contains(".") ? (Object) Double.parseDouble(raw) : (Object) Long.parseLong(raw);
    }

    private void skip() {
        while (at < text.length() && Character.isWhitespace(text.charAt(at))) at++;
    }
}
