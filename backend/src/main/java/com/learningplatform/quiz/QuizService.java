package com.learningplatform.quiz;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.common.NotFoundException;
import com.learningplatform.content.ContentStore;
import com.learningplatform.progress.ProgressRepository;
import com.learningplatform.user.LocalUserService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Quiz delivery and marking.
 *
 * <p>Answers never leave the server as part of a lesson payload — {@link ContentStore#withoutQuizAnswers}
 * strips them — and are revealed only in the response to an evaluation. That keeps the quiz
 * honest when the backend is running. (In the frontend's offline fallback mode the browser has
 * the whole content bundle and marks locally; that trade-off is recorded in ADR-006.)
 */
@Service
public class QuizService {

    private final ContentStore content;
    private final ProgressRepository progress;
    private final LocalUserService users;

    public QuizService(ContentStore content, ProgressRepository progress, LocalUserService users) {
        this.content = content;
        this.progress = progress;
        this.users = users;
    }

    /** The questions for a piece of content, with answers and explanations removed. */
    public List<ObjectNode> questions(String contentId) {
        ArrayNode quiz = quizFor(contentId);
        List<ObjectNode> questions = new ArrayList<>();
        for (JsonNode question : quiz) {
            ObjectNode copy = ((ObjectNode) question).deepCopy();
            copy.remove("answerIndex");
            copy.remove("explanation");
            questions.add(copy);
        }
        return questions;
    }

    /**
     * Marks a submission and records the result.
     *
     * @param answers questionId -> chosen option index
     */
    public Map<String, Object> evaluate(String contentId, Map<String, Integer> answers) {
        ArrayNode quiz = quizFor(contentId);

        List<Map<String, Object>> results = new ArrayList<>();
        int score = 0;

        for (JsonNode question : quiz) {
            String questionId = question.path("id").asText();
            int correctIndex = question.path("answerIndex").asInt(-1);
            Integer given = answers.get(questionId);
            boolean correct = given != null && given == correctIndex;
            if (correct) {
                score++;
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("questionId", questionId);
            result.put("given", given);
            result.put("correctIndex", correctIndex);
            result.put("correct", correct);
            result.put("explanation", question.path("explanation").asText(""));
            results.add(result);
        }

        int total = quiz.size();
        // valueToTree, not putPOJO: a POJONode's toString() would emit the Java object's
        // toString rather than JSON, and this string is persisted.
        String detail = content.mapper().valueToTree(Map.of("results", results)).toString();

        progress.recordQuizResult(users.currentUserId(), contentId, score, total, detail, Instant.now().toString());
        progress.touchActivity(users.currentUserId(), LocalDate.now());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("contentId", contentId);
        response.put("score", score);
        response.put("total", total);
        response.put("percent", total == 0 ? 0 : Math.round(100.0 * score / total));
        response.put("passed", total > 0 && score * 100 / total >= 70);
        response.put("results", results);
        return response;
    }

    private ArrayNode quizFor(String contentId) {
        ObjectNode document = content.anyById(contentId)
                .orElseThrow(() -> NotFoundException.of("content item", contentId));
        JsonNode quiz = document.get("quiz");
        if (!(quiz instanceof ArrayNode array) || array.isEmpty()) {
            throw new NotFoundException("Content item '" + contentId + "' has no quiz");
        }
        return array;
    }
}
