package com.learningplatform;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end checks over the HTTP surface documented in docs/API.md.
 *
 * <p>Ordered, because the progress assertions depend on the writes performed earlier in the
 * class — which is also what makes them a genuine round-trip test rather than a mock.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Test
    @Order(1)
    @DisplayName("health reports a loaded, valid catalogue")
    void health() throws Exception {
        mvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.contentItems").value(greaterThan(50)))
                .andExpect(jsonPath("$.contentIssues").isEmpty());
    }

    @Test
    @Order(2)
    @DisplayName("lesson list filters compose")
    void lessonFiltering() throws Exception {
        mvc.perform(get("/api/dsa/lessons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(20)));

        mvc.perform(get("/api/dsa/lessons").param("kind", "pattern"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].kind").value("pattern"));

        mvc.perform(get("/api/dsa/lessons").param("group", "Graphs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].group").value("Graphs"));
    }

    @Test
    @Order(3)
    @DisplayName("a lesson is served in full, without quiz answers")
    void lessonDetailHidesAnswers() throws Exception {
        mvc.perform(get("/api/dsa/lessons/sliding-window"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Sliding Window"))
                .andExpect(jsonPath("$.problemFirst.bruteForce.whySlow").exists())
                .andExpect(jsonPath("$.visualizations[0].engine").value("slidingWindowFixed"))
                .andExpect(jsonPath("$.quiz[0].question").exists())
                .andExpect(jsonPath("$.quiz[0].answerIndex").doesNotExist())
                .andExpect(jsonPath("$.quiz[0].explanation").doesNotExist());
    }

    @Test
    @Order(4)
    @DisplayName("an unknown id returns a 404 envelope, not a stack trace")
    void unknownLesson() throws Exception {
        mvc.perform(get("/api/dsa/lessons/slidding-window"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value(not(is(""))))
                .andExpect(jsonPath("$.path").value("/api/dsa/lessons/slidding-window"));
    }

    @Test
    @Order(5)
    @DisplayName("problems are grouped pattern -> difficulty -> problem")
    void problemsByPattern() throws Exception {
        mvc.perform(get("/api/problems/by-pattern"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThan(5)))
                .andExpect(jsonPath("$[0].patternId").exists())
                .andExpect(jsonPath("$[0].tiers[0].difficulty").exists());

        mvc.perform(get("/api/problems").param("patternId", "sliding-window"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(3)));
    }

    @Test
    @Order(6)
    @DisplayName("the daily challenge is stable within a day")
    void dailyChallengeIsDeterministic() throws Exception {
        String first = mvc.perform(get("/api/problems/daily"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String second = mvc.perform(get("/api/problems/daily"))
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(first, second);
    }

    @Test
    @Order(7)
    @DisplayName("system design concepts and case studies are served")
    void systemDesign() throws Exception {
        mvc.perform(get("/api/system-design/concepts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(12)));

        mvc.perform(get("/api/system-design/concepts/cache"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.why.without").isArray())
                .andExpect(jsonPath("$.tradeoffs[0].pros").isArray());

        mvc.perform(get("/api/system-design/case-studies/url-shortener"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evolution.length()").value(greaterThanOrEqualTo(4)))
                .andExpect(jsonPath("$.evolution[0].architecture.nodes").isArray())
                .andExpect(jsonPath("$.estimation.calculations[0].working").exists());
    }

    @Test
    @Order(8)
    @DisplayName("search ranks title matches above body matches")
    void search() throws Exception {
        mvc.perform(get("/api/search").param("q", "sliding window"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("sliding-window"));

        mvc.perform(get("/api/search").param("q", "cache"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThan(0)));

        // Prefix matching: "shard" should find "sharding".
        mvc.perform(get("/api/search").param("q", "shard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThan(0)));

        mvc.perform(get("/api/search").param("q", "zzzznotathing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @Order(9)
    @DisplayName("quiz marking reveals answers only on evaluation")
    void quizEvaluation() throws Exception {
        mvc.perform(get("/api/quiz/sliding-window"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].answerIndex").doesNotExist());

        // q1's correct answer is index 1 ("Sliding Window"); q2's is index 2.
        String body = mapper.writeValueAsString(Map.of("answers", Map.of("q1", 1, "q2", 0)));

        mvc.perform(post("/api/quiz/sliding-window/evaluate")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(greaterThan(0)))
                .andExpect(jsonPath("$.results[0].correct").value(true))
                .andExpect(jsonPath("$.results[0].explanation").value(not(is(""))))
                .andExpect(jsonPath("$.results[1].correct").value(false));
    }

    @Test
    @Order(10)
    @DisplayName("progress round-trips through SQLite")
    void progressRoundTrip() throws Exception {
        mvc.perform(put("/api/progress/lessons/sliding-window")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"completed\",\"percent\":100}"))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/progress/problems/max-sum-subarray-k/attempt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solved\":true,\"confidence\":4}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/progress"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lessons['sliding-window'].status").value("completed"))
                .andExpect(jsonPath("$.problems['max-sum-subarray-k'].solved").value(true))
                .andExpect(jsonPath("$.streak").value(greaterThanOrEqualTo(1)));

        mvc.perform(get("/api/progress/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dsa.completed").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.problemsSolved").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.readiness.band").exists());
    }

    @Test
    @Order(11)
    @DisplayName("progress never moves backwards")
    void completionIsNotUndoneByALateScrollUpdate() throws Exception {
        mvc.perform(put("/api/progress/lessons/sliding-window")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"in_progress\",\"percent\":20}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/progress"))
                .andExpect(jsonPath("$.lessons['sliding-window'].status").value("completed"))
                .andExpect(jsonPath("$.lessons['sliding-window'].percent").value(100));
    }

    @Test
    @Order(12)
    @DisplayName("invalid progress payloads are rejected as 400, not 500")
    void validation() throws Exception {
        mvc.perform(put("/api/progress/lessons/sliding-window")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"finished\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));

        mvc.perform(post("/api/progress/problems/max-sum-subarray-k/attempt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solved\":true,\"confidence\":9}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/progress/problems/no-such-problem/attempt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"solved\":true}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(13)
    @DisplayName("notes and bookmarks round-trip and resolve their titles")
    void notesAndBookmarks() throws Exception {
        mvc.perform(put("/api/notes/sliding-window")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"left only ever moves forward\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/notes/sliding-window"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body").value("left only ever moves forward"));

        mvc.perform(post("/api/bookmarks/cache"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/bookmarks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Cache"))
                .andExpect(jsonPath("$[0].contentType").value("concept"));
    }

    @Test
    @Order(14)
    @DisplayName("the recommendation explains itself")
    void nextRecommendation() throws Exception {
        mvc.perform(get("/api/learning/next"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reason").value(not(is(""))));

        mvc.perform(get("/api/learning/paths/java-dsa-beginner"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.steps[0].title").exists())
                .andExpect(jsonPath("$.total").value(greaterThan(10)));

        // Readiness must carry the score and band, not only the per-group breakdown: the
        // endpoint promises that in docs/API.md, and it once quietly returned neither.
        mvc.perform(get("/api/learning/readiness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.band").value(not(is(""))))
                .andExpect(jsonPath("$.score").exists())
                .andExpect(jsonPath("$.breakdown.dsaLessons").exists())
                .andExpect(jsonPath("$.byGroup[0].group").exists());
    }

    @Test
    @Order(17)
    @DisplayName("interview tracks, question banks and drills are served")
    void interviewPreparation() throws Exception {
        mvc.perform(get("/api/interview/tracks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(4)))
                .andExpect(jsonPath("$[0].questionCount").value(greaterThan(0)))
                .andExpect(jsonPath("$[0].levels.senior").exists());

        // Topics come back in the order the track declares them, not in directory order.
        mvc.perform(get("/api/interview/tracks/java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.topics[0].id").value("core-language"))
                .andExpect(jsonPath("$.topics[0].questions").value(greaterThan(0)));

        mvc.perform(get("/api/interview/sets/java-concurrency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].answer").value(not(is(""))))
                .andExpect(jsonPath("$.questions[0].keyPoints").isArray())
                .andExpect(jsonPath("$.questions[0].redFlags").isArray());

        // Filters compose, and every question carries its origin for the drill screen.
        mvc.perform(get("/api/interview/questions").param("track", "sql").param("level", "senior"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThan(0)))
                .andExpect(jsonPath("$[0].trackId").value("sql"))
                .andExpect(jsonPath("$[0].level").value("senior"))
                .andExpect(jsonPath("$[0].setId").value(startsWith("sql-")));

        // The same seed must give the same set, or a reload loses the question you were on.
        String first = mvc.perform(get("/api/interview/drill")
                        .param("track", "java").param("count", "5").param("seed", "42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andReturn().getResponse().getContentAsString();
        String again = mvc.perform(get("/api/interview/drill")
                        .param("track", "java").param("count", "5").param("seed", "42"))
                .andReturn().getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertEquals(first, again, "a seeded drill must be stable");

        mvc.perform(get("/api/interview/tracks/no-such-track"))
                .andExpect(status().isNotFound());

        // Cross-references from a question resolve to a routable type.
        mvc.perform(get("/api/meta/type/java-concurrency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("question-set"));
        mvc.perform(get("/api/meta/type/sliding-window"))
                .andExpect(jsonPath("$.type").value("lesson"));
    }

    @Test
    @Order(15)
    @DisplayName("pattern recognition practice hides answers until evaluation")
    void patternRecognition() throws Exception {
        mvc.perform(get("/api/practice/pattern-recognition").param("count", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].answer").doesNotExist());

        String body = mapper.writeValueAsString(
                Map.of("answers", Map.of("pr-01", "sliding-window", "pr-02", "hashing")));

        mvc.perform(post("/api/practice/pattern-recognition/evaluate")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.score").value(1))
                .andExpect(jsonPath("$.results[?(@.id=='pr-01')].correct").value(true));
    }

    @Test
    @Order(16)
    @DisplayName("progress exports as a downloadable file")
    void export() throws Exception {
        mvc.perform(get("/api/progress/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"progress.json\""))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.version").value("1"))
                .andExpect(jsonPath("$.lessons").isArray());
    }

    private static org.springframework.test.web.servlet.result.HeaderResultMatchers header() {
        return org.springframework.test.web.servlet.result.MockMvcResultMatchers.header();
    }
}
