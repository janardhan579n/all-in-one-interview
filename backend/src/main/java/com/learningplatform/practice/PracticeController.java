package com.learningplatform.practice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.content.ContentStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * "Identify the Pattern" practice mode.
 *
 * <p>This is the drill the platform is built around: show a problem statement, ask which pattern
 * it needs, and explain the reasoning either way. It trains recognition rather than recall of
 * solutions, which is the stated goal of the product.
 */
@RestController
@RequestMapping("/api/practice")
public class PracticeController {

    private final ContentStore content;

    public PracticeController(ContentStore content) {
        this.content = content;
    }

    /** A randomised question set with the answers stripped out. */
    @GetMapping("/pattern-recognition")
    public List<ObjectNode> questions(@RequestParam(defaultValue = "10") int count) {
        List<ObjectNode> all = new ArrayList<>();
        content.patternRecognition().forEach(node -> {
            ObjectNode copy = ((ObjectNode) node).deepCopy();
            copy.remove("answer");
            copy.remove("explanation");
            copy.remove("signals");
            all.add(copy);
        });
        Collections.shuffle(all);
        return all.subList(0, Math.min(Math.max(1, count), all.size()));
    }

    /** Body: {@code { "answers": { "pr-01": "sliding-window" } }} */
    @PostMapping("/pattern-recognition/evaluate")
    public Map<String, Object> evaluate(@RequestBody Map<String, Map<String, String>> body) {
        Map<String, String> answers = body.getOrDefault("answers", Map.of());

        List<Map<String, Object>> results = new ArrayList<>();
        int score = 0;

        for (JsonNode question : content.patternRecognition()) {
            String id = question.path("id").asText();
            if (!answers.containsKey(id)) {
                continue;   // only mark what was actually attempted
            }
            String given = answers.get(id);
            String correct = question.path("answer").asText();
            boolean isCorrect = correct.equals(given);
            if (isCorrect) {
                score++;
            }

            List<String> signals = new ArrayList<>();
            question.path("signals").forEach(signal -> signals.add(signal.asText()));

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", id);
            result.put("given", given);
            result.put("answer", correct);
            result.put("correct", isCorrect);
            result.put("signals", signals);
            result.put("explanation", question.path("explanation").asText(""));
            results.add(result);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("score", score);
        response.put("total", results.size());
        response.put("percent", results.isEmpty() ? 0 : Math.round(100.0 * score / results.size()));
        response.put("results", results);
        return response;
    }
}
