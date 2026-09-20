package com.learningplatform.learning;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.content.ContentStore;
import com.learningplatform.progress.ProgressRepository;
import com.learningplatform.progress.ProgressService;
import com.learningplatform.user.LocalUserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Learning paths and the "what should I study next" recommendation.
 *
 * <p>The recommendation is deliberately rule-based and explainable rather than clever: it
 * returns a reason string alongside the suggestion, so the learner can see why. An opaque
 * recommendation in a teaching tool is worse than none.
 */
@RestController
@RequestMapping("/api/learning")
public class LearningController {

    private final ContentStore content;
    private final ProgressRepository progress;
    private final ProgressService progressService;
    private final LocalUserService users;

    public LearningController(ContentStore content, ProgressRepository progress,
                              ProgressService progressService, LocalUserService users) {
        this.content = content;
        this.progress = progress;
        this.progressService = progressService;
        this.users = users;
    }

    @GetMapping("/paths")
    public List<Map<String, Object>> paths() {
        List<Map<String, Object>> result = new ArrayList<>();
        content.paths().values().forEach(path -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", path.path("id").asText());
            entry.put("title", path.path("title").asText());
            entry.put("audience", path.path("audience").asText());
            entry.put("description", path.path("description").asText());
            entry.put("steps", path.path("steps").size());
            result.add(entry);
        });
        return result;
    }

    /** A path with each step resolved to a title and merged with the learner's progress. */
    @GetMapping("/paths/{id}")
    public Map<String, Object> path(@PathVariable String id) {
        ObjectNode path = content.path(id);
        Map<String, String> statusById = statusById();

        List<Map<String, Object>> steps = new ArrayList<>();
        int completed = 0;

        for (JsonNode step : path.path("steps")) {
            String ref = step.path("ref").asText();
            String kind = step.path("kind").asText("lesson");
            ObjectNode document = resolve(ref, kind);

            String status = statusById.getOrDefault(ref, "not_started");
            if ("completed".equals(status)) {
                completed++;
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("ref", ref);
            entry.put("kind", kind);
            entry.put("title", document != null ? document.path("title").asText() : ref);
            entry.put("summary", document != null ? document.path("summary").asText("") : "");
            entry.put("estimatedMinutes", document != null ? document.path("estimatedMinutes").asInt(0) : 0);
            entry.put("status", status);
            entry.put("missing", document == null);
            steps.add(entry);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", path.path("id").asText());
        result.put("title", path.path("title").asText());
        result.put("audience", path.path("audience").asText());
        result.put("description", path.path("description").asText());
        result.put("steps", steps);
        result.put("completed", completed);
        result.put("total", steps.size());
        result.put("percent", steps.isEmpty() ? 0 : Math.round(100.0 * completed / steps.size()));
        return result;
    }

    /**
     * The next thing to study. Rules, in priority order:
     *
     * <ol>
     *   <li>Something already started but unfinished — finishing beats starting.</li>
     *   <li>The first unmet step of the beginner path, respecting prerequisites.</li>
     *   <li>The lowest-level lesson not yet completed.</li>
     * </ol>
     */
    @GetMapping("/next")
    public Map<String, Object> next() {
        Map<String, String> statusById = statusById();

        for (ProgressRepository.LessonProgress row : progress.recent(users.currentUserId(), 20)) {
            if ("in_progress".equals(row.status())) {
                ObjectNode document = content.anyById(row.contentId()).orElse(null);
                if (document != null) {
                    return suggestion(document, row.contentType(),
                            "You're " + row.percent() + "% through this — finishing what you start beats starting something new.");
                }
            }
        }

        ObjectNode beginnerPath = content.paths().get("java-dsa-beginner");
        if (beginnerPath != null) {
            for (JsonNode step : beginnerPath.path("steps")) {
                String ref = step.path("ref").asText();
                if (!"completed".equals(statusById.get(ref))) {
                    ObjectNode document = resolve(ref, step.path("kind").asText("lesson"));
                    if (document != null) {
                        return suggestion(document, step.path("kind").asText("lesson"),
                                "Next step on the Java + DSA path.");
                    }
                }
            }
        }

        return content.lessons().values().stream()
                .filter(lesson -> !"completed".equals(statusById.get(lesson.path("id").asText())))
                .min((a, b) -> Integer.compare(a.path("level").asInt(0), b.path("level").asInt(0)))
                .map(lesson -> suggestion(lesson, ContentStore.TYPE_LESSON,
                        "The lowest-level topic you haven't finished yet."))
                .orElseGet(() -> Map.of(
                        "lessonId", "",
                        "reason", "You've completed everything here. Try the interview simulator or revisit your weak areas."));
    }

    /** Readiness breakdown, kept next to the paths because it answers "am I ready yet?". */
    /**
     * Interview readiness: the score and band, the breakdown behind them, the weak areas, and
     * per-group completion.
     *
     * <p>The score itself comes from {@link ProgressService} rather than being recomputed here.
     * Two places deriving "how ready am I" independently is how a dashboard and a detail page
     * end up disagreeing with each other, which destroys trust in both.
     */
    @GetMapping("/readiness")
    public Map<String, Object> readiness() {
        Map<String, String> statusById = statusById();

        List<Map<String, Object>> byGroup = new ArrayList<>();
        Map<String, int[]> counters = new LinkedHashMap<>();

        content.lessons().values().forEach(lesson -> {
            String group = lesson.path("group").asText("Other");
            int[] counter = counters.computeIfAbsent(group, key -> new int[2]);
            counter[1]++;
            if ("completed".equals(statusById.get(lesson.path("id").asText()))) {
                counter[0]++;
            }
        });

        counters.forEach((group, counter) -> byGroup.add(Map.of(
                "group", group,
                "completed", counter[0],
                "total", counter[1],
                "percent", counter[1] == 0 ? 0 : Math.round(100.0 * counter[0] / counter[1]))));

        Map<String, Object> summary = progressService.summary();
        Map<String, Object> result = new LinkedHashMap<>();

        Object readiness = summary.get("readiness");
        if (readiness instanceof Map<?, ?> scores) {
            scores.forEach((key, value) -> result.put(String.valueOf(key), value));
        }
        result.put("weakAreas", summary.getOrDefault("weakAreas", List.of()));
        result.put("byGroup", byGroup);
        return result;
    }

    // ------------------------------------------------------------------ helpers

    private Map<String, String> statusById() {
        Map<String, String> statuses = new HashMap<>();
        progress.allLessonProgress(users.currentUserId())
                .forEach(row -> statuses.put(row.contentId(), row.status()));
        return statuses;
    }

    private ObjectNode resolve(String ref, String kind) {
        return switch (kind) {
            case "problem" -> content.problems().get(ref);
            case "concept" -> content.concepts().get(ref);
            case "case-study" -> content.caseStudies().get(ref);
            default -> content.lessons().get(ref);
        };
    }

    private Map<String, Object> suggestion(ObjectNode document, String type, String reason) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("lessonId", document.path("id").asText());
        result.put("type", type);
        result.put("title", document.path("title").asText());
        result.put("summary", document.path("summary").asText(""));
        result.put("reason", reason);
        return result;
    }
}
