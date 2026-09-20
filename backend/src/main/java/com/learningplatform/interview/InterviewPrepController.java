package com.learningplatform.interview;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.common.NotFoundException;
import com.learningplatform.content.ContentStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/**
 * Interview preparation: technology tracks, question banks and drill sets.
 *
 * <p>Unlike the quiz endpoints, answers are <em>not</em> stripped here. A quiz is a test, so
 * revealing the answer key would defeat it; an interview question bank is study material, and the
 * model answer is the content. The "attempt before you look" discipline is enforced in the UI,
 * which is where it belongs — a learner who wants to read ahead is not cheating anyone.
 *
 * <p>Progress on individual questions rides on the existing content-flag endpoints
 * ({@code PUT /api/progress/flags/{id}} with difficult/mastered), so a question needs no table of
 * its own and shows up in the same weak-area reporting as everything else.
 */
@RestController
@RequestMapping("/api/interview")
public class InterviewPrepController {

    private static final List<String> LEVEL_ORDER = List.of("junior", "mid", "senior");

    private final ContentStore content;

    public InterviewPrepController(ContentStore content) {
        this.content = content;
    }

    /** Every track, with live counts so the index page needs no second call. */
    @GetMapping("/tracks")
    public List<ObjectNode> tracks() {
        List<ObjectNode> result = new ArrayList<>();
        for (JsonNode track : content.interviewTracks()) {
            if (track instanceof ObjectNode node) {
                result.add(describeTrack(node));
            }
        }
        return result;
    }

    /** One track with its topics, each carrying a question count and level spread. */
    @GetMapping("/tracks/{id}")
    public ObjectNode track(@PathVariable String id) {
        ObjectNode track = findTrack(id);
        ObjectNode result = describeTrack(track);

        List<ObjectNode> topics = new ArrayList<>();
        for (ObjectNode set : content.questionSets().values()) {
            if (!id.equals(set.path("trackId").asText())) {
                continue;
            }
            ObjectNode topic = content.mapper().createObjectNode();
            topic.put("id", set.path("topic").asText());
            topic.put("setId", set.path("id").asText());
            topic.put("title", set.path("title").asText());
            topic.put("summary", set.path("summary").asText(""));
            topic.put("questions", set.path("questions").size());
            topic.set("levels", levelCounts(set.path("questions")));
            topics.add(topic);
        }
        topics.sort((a, b) -> orderOf(track, a.path("id").asText()) - orderOf(track, b.path("id").asText()));

        result.set("topics", toArray(topics));
        return result;
    }

    /** A whole topic, questions included. This is what the topic page renders. */
    @GetMapping("/sets/{id}")
    public ObjectNode set(@PathVariable String id) {
        return content.questionSet(id);
    }

    /**
     * Questions across the library, filtered. Every filter is optional and they compose.
     *
     * <p>Returns whole questions rather than summaries: a question is small, and the drill screen
     * needs the answer in hand to reveal it without a second round trip that would be visible as
     * a pause at exactly the wrong moment.
     */
    @GetMapping("/questions")
    public List<ObjectNode> questions(@RequestParam(required = false) String track,
                                      @RequestParam(required = false) String topic,
                                      @RequestParam(required = false) String level,
                                      @RequestParam(required = false) String type,
                                      @RequestParam(required = false) String q) {
        String needle = q == null ? null : q.toLowerCase(Locale.ROOT).trim();

        List<ObjectNode> result = new ArrayList<>();
        for (ObjectNode question : content.interviewQuestions().values()) {
            if (track != null && !track.equals(question.path("trackId").asText())) continue;
            if (topic != null && !topic.equals(question.path("topic").asText())) continue;
            if (level != null && !level.equalsIgnoreCase(question.path("level").asText())) continue;
            if (type != null && !type.equalsIgnoreCase(question.path("type").asText())) continue;
            if (needle != null && !needle.isEmpty() && !matches(question, needle)) continue;
            result.add(question);
        }
        result.sort(InterviewPrepController::byLevelThenId);
        return result;
    }

    @GetMapping("/questions/{id}")
    public ObjectNode question(@PathVariable String id) {
        return content.interviewQuestion(id);
    }

    /**
     * A randomised drill set — the mock-interview screen.
     *
     * <p>Seeded by the day when no seed is given, so the set is stable if the learner reloads
     * mid-session. Reloading and getting a completely different set feels broken, and it also
     * makes it impossible to come back to a question you wanted to think about.
     */
    @GetMapping("/drill")
    public List<ObjectNode> drill(@RequestParam(required = false) String track,
                                  @RequestParam(required = false) String level,
                                  @RequestParam(defaultValue = "10") int count,
                                  @RequestParam(required = false) Long seed) {
        List<ObjectNode> pool = questions(track, null, level, null, null);
        if (pool.isEmpty()) {
            return List.of();
        }
        List<ObjectNode> shuffled = new ArrayList<>(pool);
        long effectiveSeed = seed != null ? seed : java.time.LocalDate.now().toEpochDay();
        Collections.shuffle(shuffled, new Random(effectiveSeed));
        return shuffled.subList(0, Math.min(Math.max(1, count), shuffled.size()));
    }

    // ----------------------------------------------------------------- helpers

    private ObjectNode findTrack(String id) {
        for (JsonNode track : content.interviewTracks()) {
            if (track instanceof ObjectNode node && id.equals(node.path("id").asText())) {
                return node;
            }
        }
        throw new NotFoundException("No interview track with id '" + id + "'");
    }

    private ObjectNode describeTrack(ObjectNode track) {
        ObjectNode result = track.deepCopy();
        String id = track.path("id").asText();

        int total = 0;
        Map<String, Integer> levels = new LinkedHashMap<>();
        LEVEL_ORDER.forEach(level -> levels.put(level, 0));
        for (ObjectNode question : content.interviewQuestions().values()) {
            if (!id.equals(question.path("trackId").asText())) {
                continue;
            }
            total++;
            levels.merge(question.path("level").asText("mid"), 1, Integer::sum);
        }

        ObjectNode levelNode = content.mapper().createObjectNode();
        levels.forEach(levelNode::put);
        result.put("questionCount", total);
        result.set("levels", levelNode);
        return result;
    }

    private ObjectNode levelCounts(JsonNode questions) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        LEVEL_ORDER.forEach(level -> counts.put(level, 0));
        questions.forEach(question -> counts.merge(question.path("level").asText("mid"), 1, Integer::sum));
        ObjectNode node = content.mapper().createObjectNode();
        counts.forEach(node::put);
        return node;
    }

    /** Topic order follows the track's declared list, so the curriculum keeps its sequence. */
    private int orderOf(ObjectNode track, String topicId) {
        JsonNode topics = track.path("topics");
        for (int i = 0; i < topics.size(); i++) {
            if (topicId.equals(topics.get(i).asText())) {
                return i;
            }
        }
        return Integer.MAX_VALUE;
    }

    private boolean matches(ObjectNode question, String needle) {
        return question.path("question").asText("").toLowerCase(Locale.ROOT).contains(needle)
                || question.path("answer").asText("").toLowerCase(Locale.ROOT).contains(needle);
    }

    private static int byLevelThenId(ObjectNode a, ObjectNode b) {
        int byLevel = Integer.compare(
                LEVEL_ORDER.indexOf(a.path("level").asText("mid")),
                LEVEL_ORDER.indexOf(b.path("level").asText("mid")));
        return byLevel != 0 ? byLevel : a.path("id").asText().compareTo(b.path("id").asText());
    }

    private ArrayNode toArray(List<ObjectNode> nodes) {
        ArrayNode array = content.mapper().createArrayNode();
        nodes.forEach(array::add);
        return array;
    }
}
