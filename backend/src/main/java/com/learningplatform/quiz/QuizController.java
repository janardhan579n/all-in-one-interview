package com.learningplatform.quiz;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private final QuizService quiz;

    public QuizController(QuizService quiz) {
        this.quiz = quiz;
    }

    @GetMapping("/{contentId}")
    public List<ObjectNode> questions(@PathVariable String contentId) {
        return quiz.questions(contentId);
    }

    /** Body: {@code { "answers": { "q1": 2, "q2": 0 } }} */
    @PostMapping("/{contentId}/evaluate")
    public Map<String, Object> evaluate(@PathVariable String contentId,
                                        @RequestBody Map<String, Map<String, Integer>> body) {
        Map<String, Integer> answers = body.getOrDefault("answers", Map.of());
        return quiz.evaluate(contentId, answers);
    }
}
