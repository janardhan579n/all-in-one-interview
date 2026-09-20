package com.learningplatform.systemdesign;

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

/** System design concepts, case studies and decision trees. */
@RestController
@RequestMapping("/api")
public class SystemDesignController {

    private static final List<String> GROUP_ORDER =
            List.of("Foundations", "Performance", "Data", "Reliability", "Distributed");

    private final ContentStore content;

    public SystemDesignController(ContentStore content) {
        this.content = content;
    }

    @GetMapping("/system-design/concepts")
    public List<ObjectNode> concepts(@RequestParam(required = false) String group,
                                     @RequestParam(required = false) Integer level) {
        List<ObjectNode> result = new ArrayList<>();
        for (ObjectNode concept : content.concepts().values()) {
            if (group != null && !group.equalsIgnoreCase(concept.path("group").asText())) continue;
            if (level != null && level != concept.path("level").asInt(-1)) continue;
            result.add(content.summarise(concept, ContentStore.TYPE_CONCEPT));
        }
        result.sort((a, b) -> {
            int rankA = GROUP_ORDER.indexOf(a.path("group").asText());
            int rankB = GROUP_ORDER.indexOf(b.path("group").asText());
            if (rankA != rankB) {
                return Integer.compare(rankA < 0 ? 99 : rankA, rankB < 0 ? 99 : rankB);
            }
            return Integer.compare(a.path("level").asInt(0), b.path("level").asInt(0));
        });
        return result;
    }

    /**
     * @param lang optional language code. Untranslated fields fall back to English and the
     *             response carries a {@code translation} marker saying which you got.
     */
    @GetMapping("/system-design/concepts/{id}")
    public ObjectNode concept(@PathVariable String id,
                              @RequestParam(required = false) String lang) {
        return content.withoutQuizAnswers(content.localise(content.concept(id), lang));
    }

    /** Concepts bucketed by group, in teaching order. */
    @GetMapping("/system-design/groups")
    public List<Map<String, Object>> groups() {
        Map<String, List<ObjectNode>> byGroup = new LinkedHashMap<>();
        GROUP_ORDER.forEach(group -> byGroup.put(group, new ArrayList<>()));

        for (ObjectNode concept : content.concepts().values()) {
            byGroup.computeIfAbsent(concept.path("group").asText("Other"), key -> new ArrayList<>())
                    .add(content.summarise(concept, ContentStore.TYPE_CONCEPT));
        }

        List<Map<String, Object>> result = new ArrayList<>();
        byGroup.forEach((group, concepts) -> {
            if (!concepts.isEmpty()) {
                result.add(Map.of("group", group, "concepts", concepts));
            }
        });
        return result;
    }

    @GetMapping("/system-design/case-studies")
    public List<ObjectNode> caseStudies() {
        List<ObjectNode> result = new ArrayList<>();
        content.caseStudies().values()
                .forEach(study -> result.add(content.summarise(study, ContentStore.TYPE_CASE_STUDY)));
        return result;
    }

    /**
     * @param lang optional language code. Untranslated fields fall back to English and the
     *             response carries a {@code translation} marker saying which you got.
     */
    @GetMapping("/system-design/case-studies/{id}")
    public ObjectNode caseStudy(@PathVariable String id,
                                @RequestParam(required = false) String lang) {
        return content.withoutQuizAnswers(content.localise(content.caseStudy(id), lang));
    }

    @GetMapping("/decision-trees/{id}")
    public ObjectNode decisionTree(@PathVariable String id) {
        return content.decisionTree(id);
    }

    @GetMapping("/decision-trees")
    public List<Map<String, String>> decisionTrees() {
        List<Map<String, String>> result = new ArrayList<>();
        content.decisionTrees().values().forEach(tree ->
                result.add(Map.of("id", tree.path("id").asText(), "title", tree.path("title").asText())));
        return result;
    }
}
