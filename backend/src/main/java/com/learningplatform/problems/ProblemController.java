package com.learningplatform.problems;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.content.ContentStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Practice problems.
 *
 * <p>The organising principle throughout is PATTERN → DIFFICULTY → PROBLEM rather than a flat
 * list, because the aim is to train recognition rather than to accumulate solved counts.
 */
@RestController
@RequestMapping("/api/problems")
public class ProblemController {

    private static final List<String> DIFFICULTY_ORDER = List.of("beginner", "intermediate", "advanced");

    private final ContentStore content;

    public ProblemController(ContentStore content) {
        this.content = content;
    }

    @GetMapping
    public List<ObjectNode> list(@RequestParam(required = false) String patternId,
                                 @RequestParam(required = false) String difficulty,
                                 @RequestParam(required = false) String q) {
        List<ObjectNode> result = new ArrayList<>();
        for (ObjectNode problem : content.problems().values()) {
            if (patternId != null && !patternId.equals(problem.path("patternId").asText())) continue;
            if (difficulty != null && !difficulty.equalsIgnoreCase(problem.path("difficulty").asText())) continue;
            if (q != null && !matches(problem, q)) continue;
            result.add(content.summarise(problem, ContentStore.TYPE_PROBLEM));
        }
        result.sort(ProblemController::byDifficultyThenTitle);
        return result;
    }

    @GetMapping("/{id}")
    public ObjectNode problem(@PathVariable String id) {
        return content.problem(id);
    }

    /** pattern → difficulty → problems, which is exactly how the practice screen renders. */
    @GetMapping("/by-pattern")
    public List<Map<String, Object>> byPattern() {
        Map<String, Map<String, List<ObjectNode>>> grouped = new LinkedHashMap<>();

        for (ObjectNode problem : content.problems().values()) {
            String pattern = problem.path("patternId").asText("unclassified");
            String difficulty = problem.path("difficulty").asText("beginner").toLowerCase(Locale.ROOT);
            grouped.computeIfAbsent(pattern, key -> new LinkedHashMap<>())
                    .computeIfAbsent(difficulty, key -> new ArrayList<>())
                    .add(content.summarise(problem, ContentStore.TYPE_PROBLEM));
        }

        List<Map<String, Object>> result = new ArrayList<>();
        grouped.forEach((patternId, byDifficulty) -> {
            ObjectNode pattern = content.lessons().get(patternId);
            List<Map<String, Object>> tiers = new ArrayList<>();
            for (String difficulty : DIFFICULTY_ORDER) {
                List<ObjectNode> problems = byDifficulty.get(difficulty);
                if (problems != null && !problems.isEmpty()) {
                    tiers.add(Map.of("difficulty", difficulty, "problems", problems));
                }
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("patternId", patternId);
            entry.put("patternTitle", pattern != null ? pattern.path("title").asText() : patternId);
            entry.put("group", pattern != null ? pattern.path("group").asText("") : "");
            entry.put("tiers", tiers);
            result.add(entry);
        });
        return result;
    }

    /**
     * The daily challenge. Deterministic from the date, so every visit on the same day gets
     * the same problem and it rotates at midnight without any stored state.
     */
    @GetMapping("/daily")
    public ObjectNode daily() {
        List<ObjectNode> all = new ArrayList<>(content.problems().values());
        if (all.isEmpty()) {
            throw new IllegalStateException("No problems are loaded");
        }
        all.sort((a, b) -> a.path("id").asText().compareTo(b.path("id").asText()));
        int index = Math.floorMod(LocalDate.now().toEpochDay() * 2654435761L, all.size());
        return content.summarise(all.get((int) index), ContentStore.TYPE_PROBLEM);
    }

    private boolean matches(ObjectNode problem, String query) {
        String needle = query.toLowerCase(Locale.ROOT);
        return problem.path("title").asText("").toLowerCase(Locale.ROOT).contains(needle)
                || problem.path("statement").asText("").toLowerCase(Locale.ROOT).contains(needle)
                || problem.path("tags").toString().toLowerCase(Locale.ROOT).contains(needle);
    }

    private static int byDifficultyThenTitle(ObjectNode a, ObjectNode b) {
        int rankA = DIFFICULTY_ORDER.indexOf(a.path("difficulty").asText("beginner"));
        int rankB = DIFFICULTY_ORDER.indexOf(b.path("difficulty").asText("beginner"));
        if (rankA != rankB) {
            return Integer.compare(rankA, rankB);
        }
        return a.path("title").asText().compareTo(b.path("title").asText());
    }
}
