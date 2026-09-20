package com.learningplatform.common;

import com.learningplatform.content.ContentStore;
import com.learningplatform.search.SearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health and catalogue statistics.
 *
 * <p>The health endpoint deliberately reports content-validation issues: a cross-reference that
 * stopped resolving is the kind of problem that is invisible in the UI until a learner clicks
 * the broken link, so it is surfaced where a script can check for it.
 */
@RestController
@RequestMapping("/api")
public class MetaController {

    private final ContentStore content;
    private final SearchService search;

    public MetaController(ContentStore content, SearchService search) {
        this.content = content;
        this.search = search;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("version", "1.0.0");
        body.put("contentItems", content.totalItems());
        body.put("indexedDocuments", search.indexedDocuments());
        body.put("contentIssues", content.validationIssues());
        return body;
    }

    /**
     * The content type behind an id — lesson, problem, concept or case study.
     *
     * <p>Ids are flat across collections ({@code cache} is a concept, {@code two-sum} a problem),
     * so a cross-reference cannot be routed without asking. Returns {@code unknown} rather than
     * 404 because an unresolvable reference should render as plain text, not as an error.
     */
    @GetMapping("/meta/type/{id}")
    public Map<String, Object> type(@PathVariable String id) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", id);
        body.put("type", content.typeById().getOrDefault(id, "unknown"));
        return body;
    }

    @GetMapping("/meta/stats")
    public Map<String, Object> stats() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("lessons", content.lessons().size());
        body.put("patterns", content.lessons().values().stream()
                .filter(lesson -> "pattern".equals(lesson.path("kind").asText())).count());
        body.put("problems", content.problems().size());
        body.put("concepts", content.concepts().size());
        body.put("caseStudies", content.caseStudies().size());
        body.put("decisionTrees", content.decisionTrees().size());
        body.put("paths", content.paths().size());
        body.put("practiceQuestions", content.patternRecognition().size());
        body.put("interviewTracks", content.interviewTracks().size());
        body.put("interviewQuestions", content.interviewQuestions().size());
        return body;
    }
}
