package verify;

import java.nio.file.*;
import java.util.*;

/** Reads the per-problem input domains that `domains.py` derived from each problem's constraints. */
final class Domains {

    @SuppressWarnings("unchecked")
    static Map<String, Generator.Domain> load(Path file) throws Exception {
        Map<String, Generator.Domain> out = new HashMap<>();
        if (!Files.exists(file)) return out;
        Object root = Json.parseObject(Files.readString(file));
        for (Map.Entry<String, Object> entry : ((Map<String, Object>) root).entrySet()) {
            Map<String, Object> raw = (Map<String, Object>) entry.getValue();
            int[] values = null;
            if (raw.get("values") instanceof List<?> list) {
                values = new int[list.size()];
                for (int i = 0; i < values.length; i++) values[i] = (int) (long) (Long) list.get(i);
            }
            out.put(entry.getKey(), new Generator.Domain(
                    asInt(raw.get("valueMin")), asInt(raw.get("valueMax")), asInt(raw.get("lengthMin")),
                    values, Boolean.TRUE.equals(raw.get("stated"))));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Boolean> flags(Path file) throws Exception {
        Map<String, Boolean> out = new HashMap<>();
        if (!Files.exists(file)) return out;
        Object root = Json.parseObject(Files.readString(file));
        for (Map.Entry<String, Object> entry : ((Map<String, Object>) root).entrySet()) {
            out.put(entry.getKey(), Boolean.TRUE.equals(entry.getValue()));
        }
        return out;
    }

    private static Integer asInt(Object value) {
        if (value instanceof Long l) return (int) Math.max(Integer.MIN_VALUE, Math.min(Integer.MAX_VALUE, l));
        return null;
    }

    private Domains() {}
}
