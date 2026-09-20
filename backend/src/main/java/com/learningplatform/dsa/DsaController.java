package com.learningplatform.dsa;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.content.ContentStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** DSA lessons: foundations, patterns and data structures. See docs/API.md. */
@RestController
@RequestMapping("/api/dsa")
public class DsaController {

    private final ContentStore content;

    public DsaController(ContentStore content) {
        this.content = content;
    }

    /**
     * Summaries only — the full documents are large and a list screen needs none of it.
     * Every filter is optional and they compose.
     */
    @GetMapping("/lessons")
    public List<ObjectNode> lessons(@RequestParam(required = false) String kind,
                                    @RequestParam(required = false) Integer level,
                                    @RequestParam(required = false) String group,
                                    @RequestParam(required = false) String tag,
                                    @RequestParam(required = false) String difficulty,
                                    @RequestParam(required = false) String lang) {
        List<ObjectNode> result = new ArrayList<>();
        for (ObjectNode lesson : content.lessons().values()) {
            if (kind != null && !kind.equalsIgnoreCase(lesson.path("kind").asText())) continue;
            if (level != null && level != lesson.path("level").asInt(-1)) continue;
            if (group != null && !group.equalsIgnoreCase(lesson.path("group").asText())) continue;
            if (difficulty != null && !difficulty.equalsIgnoreCase(lesson.path("difficulty").asText())) continue;
            if (tag != null && !hasTag(lesson, tag)) continue;
            // Localise before summarising, so a translated title reaches the list screen too.
            result.add(content.summarise(content.localise(lesson, lang), ContentStore.TYPE_LESSON));
        }
        result.sort((a, b) -> Integer.compare(a.path("level").asInt(0), b.path("level").asInt(0)));
        return result;
    }

    /**
     * The full lesson, with quiz answers removed (see ContentStore#withoutQuizAnswers).
     *
     * @param lang optional language code. Untranslated fields fall back to English, and the
     *             response carries a {@code translation} marker saying which you actually got.
     */
    @GetMapping("/lessons/{id}")
    public ObjectNode lesson(@PathVariable String id,
                             @RequestParam(required = false) String lang) {
        return content.withoutQuizAnswers(content.localise(content.lesson(id), lang));
    }

    /** Lessons bucketed by their conceptual group — the shape the sidebar renders. */
    @GetMapping("/groups")
    public List<Map<String, Object>> groups() {
        Map<String, List<ObjectNode>> byGroup = new LinkedHashMap<>();
        for (ObjectNode lesson : content.lessons().values()) {
            byGroup.computeIfAbsent(lesson.path("group").asText("Other"), key -> new ArrayList<>())
                    .add(content.summarise(lesson, ContentStore.TYPE_LESSON));
        }
        List<Map<String, Object>> result = new ArrayList<>();
        byGroup.forEach((group, lessons) -> {
            lessons.sort((a, b) -> Integer.compare(a.path("level").asInt(0), b.path("level").asInt(0)));
            result.add(Map.of("group", group, "lessons", lessons));
        });
        return result;
    }

    @GetMapping("/pattern-map")
    public ObjectNode patternMap() {
        return content.patternMap();
    }

    private boolean hasTag(JsonNode lesson, String tag) {
        JsonNode tags = lesson.path("tags");
        if (!tags.isArray()) {
            return false;
        }
        for (JsonNode value : tags) {
            if (tag.equalsIgnoreCase(value.asText())) {
                return true;
            }
        }
        return false;
    }
}
