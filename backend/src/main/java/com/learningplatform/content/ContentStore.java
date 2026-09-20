package com.learningplatform.content;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.common.NotFoundException;
import com.learningplatform.config.ContentProperties;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * The single source of truth for all learning content.
 *
 * <p>Every JSON file under {@code content/} is read once at startup into immutable maps keyed
 * by id. Content is read-only at runtime, so this gives O(1) lookups with no database, no
 * migrations and no ORM — and it means a contributor adds a lesson by dropping in a file.
 * See docs/DECISIONS.md ADR-001.
 *
 * <p>Documents are held as Jackson {@link ObjectNode}s rather than typed POJOs. That is a
 * deliberate choice: the content schema is expected to grow (a new field on a lesson should
 * not require a Java change and a redeploy), and the backend's job here is to serve, filter
 * and index documents rather than to interpret every field. The fields the backend *does*
 * depend on are validated at boot by {@link #validate()}.
 */
@Component
public class ContentStore {

    private static final Logger log = LoggerFactory.getLogger(ContentStore.class);

    public static final String TYPE_LESSON = "lesson";
    public static final String TYPE_PROBLEM = "problem";
    public static final String TYPE_CONCEPT = "concept";
    public static final String TYPE_CASE_STUDY = "case-study";
    public static final String TYPE_QUESTION_SET = "question-set";

    private final ObjectMapper mapper;
    private final ContentProperties properties;

    private Map<String, ObjectNode> lessons = Map.of();
    private Map<String, ObjectNode> problems = Map.of();
    private Map<String, ObjectNode> concepts = Map.of();
    private Map<String, ObjectNode> caseStudies = Map.of();
    private Map<String, ObjectNode> decisionTrees = Map.of();
    private Map<String, ObjectNode> paths = Map.of();
    private ObjectNode patternMap;
    private ArrayNode patternRecognition;

    /** Translations: language code -> (document id -> partial overlay). */
    private Map<String, Map<String, ObjectNode>> translations = Map.of();
    private ArrayNode languages;
    private Map<String, ObjectNode> uiStrings = Map.of();

    /** Interview preparation: the track registry, the question sets, and every question by id. */
    private ArrayNode interviewTracks;
    private Map<String, ObjectNode> questionSets = Map.of();
    private Map<String, ObjectNode> interviewQuestions = Map.of();

    /** id -> type, across every content collection. Used by search, quiz and notes. */
    private Map<String, String> typeById = Map.of();

    public ContentStore(ObjectMapper mapper, ContentProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }

    @PostConstruct
    public void load() {
        Path root = properties.resolve();
        log.info("Loading learning content from {}", root);

        lessons = readAll(root.resolve("dsa/foundations"),
                root.resolve("dsa/patterns"),
                root.resolve("dsa/data-structures"));
        problems = readAll(root.resolve("dsa/problems"));
        concepts = readAll(root.resolve("system-design/concepts"));
        caseStudies = readAll(root.resolve("system-design/case-studies"));
        decisionTrees = readAll(root.resolve("decision-trees"));
        paths = readAll(root.resolve("paths"));

        patternMap = readOne(root.resolve("dsa/pattern-map.json"));
        JsonNode bank = readArray(root.resolve("practice/pattern-recognition.json"));
        patternRecognition = bank instanceof ArrayNode array ? array : mapper.createArrayNode();

        loadInterviewContent(root.resolve("interview"));
        loadTranslations(root.resolve("i18n"));

        Map<String, String> types = new LinkedHashMap<>();
        lessons.keySet().forEach(id -> types.put(id, TYPE_LESSON));
        problems.keySet().forEach(id -> types.put(id, TYPE_PROBLEM));
        concepts.keySet().forEach(id -> types.put(id, TYPE_CONCEPT));
        caseStudies.keySet().forEach(id -> types.put(id, TYPE_CASE_STUDY));
        questionSets.keySet().forEach(id -> types.put(id, TYPE_QUESTION_SET));
        typeById = Collections.unmodifiableMap(types);

        log.info("Loaded {} lessons, {} problems, {} concepts, {} case studies, {} decision trees, {} paths, {} practice questions",
                lessons.size(), problems.size(), concepts.size(), caseStudies.size(),
                decisionTrees.size(), paths.size(), patternRecognition.size());

        validate();
    }

    // ------------------------------------------------------------ translations

    /**
     * Loads the language registry, UI strings and content overlays under {@code i18n/}.
     *
     * <p>A translation is a <em>partial overlay</em> keyed by document id, not a copy of the whole
     * document. That is the central design decision here: a full copy per language would drift the
     * moment an English lesson gained a field, and nobody would notice until a learner saw a page
     * missing a section. An overlay carries only the fields that have been translated, everything
     * else falls through to English, and the two can never disagree about structure.
     */
    private void loadTranslations(Path root) {
        languages = mapper.createArrayNode();
        if (!Files.isDirectory(root)) {
            log.warn("No i18n directory at {} — the app will run in English only", root);
            return;
        }

        JsonNode registry = readArray(root.resolve("languages.json"));
        if (registry instanceof ArrayNode array) {
            languages = array;
        }

        Map<String, Map<String, ObjectNode>> byLanguage = new LinkedHashMap<>();
        Map<String, ObjectNode> strings = new LinkedHashMap<>();

        for (JsonNode language : languages) {
            String code = language.path("code").asText("");
            if (code.isEmpty()) {
                continue;
            }
            Path directory = root.resolve(code);
            if (!Files.isDirectory(directory)) {
                continue;
            }

            Path ui = directory.resolve("ui.json");
            if (Files.isRegularFile(ui)) {
                strings.put(code, readOne(ui));
            }

            Map<String, ObjectNode> overlays = new LinkedHashMap<>();
            try (Stream<Path> files = Files.walk(directory)) {
                files.filter(Files::isRegularFile)
                        .filter(file -> file.getFileName().toString().endsWith(".json"))
                        .filter(file -> !file.getFileName().toString().equals("ui.json"))
                        .sorted()
                        .forEach(file -> {
                            ObjectNode overlay = readOne(file);
                            String name = file.getFileName().toString();
                            // The id may be stated explicitly; otherwise the filename is the id,
                            // which keeps an overlay's path a mirror of the English document's.
                            String id = overlay.path("id").asText(name.substring(0, name.length() - 5));
                            overlays.put(id, overlay);
                        });
            } catch (IOException e) {
                throw new UncheckedIOException("Failed to walk " + directory, e);
            }
            byLanguage.put(code, Collections.unmodifiableMap(overlays));
        }

        translations = Collections.unmodifiableMap(byLanguage);
        uiStrings = Collections.unmodifiableMap(strings);

        byLanguage.forEach((code, overlays) ->
                log.info("Language '{}': {} translated documents", code, overlays.size()));
    }

    /**
     * Returns the document with any translation for {@code language} merged over it.
     *
     * <p>Untranslated fields fall back to English rather than disappearing, and the result carries
     * a {@code translation} marker so the UI can say plainly which of the two a learner is reading.
     * Showing English while implying it is translated would be worse than showing nothing.
     */
    public ObjectNode localise(ObjectNode document, String language) {
        if (document == null || language == null || language.isBlank() || "en".equals(language)) {
            return document;
        }

        ObjectNode overlay = translations.getOrDefault(language, Map.of()).get(document.path("id").asText());
        ObjectNode copy = document.deepCopy();
        if (overlay != null) {
            mergeInto(copy, overlay);
        }

        ObjectNode marker = mapper.createObjectNode();
        marker.put("language", language);
        marker.put("translated", overlay != null);
        copy.set("translation", marker);
        return copy;
    }

    /**
     * Deep-merges an overlay into a document.
     *
     * <p>Objects merge recursively; anything else — including arrays — replaces wholesale. Merging
     * arrays element by element sounds helpful and is a trap: a translator who reorders a list, or
     * translates three of five bullets, would silently get a mixture of two languages in one list.
     * Replace-or-leave is the only rule that cannot produce that.
     */
    private void mergeInto(ObjectNode base, ObjectNode overlay) {
        overlay.fields().forEachRemaining(entry -> {
            JsonNode existing = base.get(entry.getKey());
            JsonNode incoming = entry.getValue();
            if (existing instanceof ObjectNode existingObject && incoming instanceof ObjectNode incomingObject) {
                mergeInto(existingObject, incomingObject);
            } else {
                base.set(entry.getKey(), incoming);
            }
        });
    }

    public ArrayNode languages() {
        return languages;
    }

    public ObjectNode uiStrings(String language) {
        return uiStrings.get(language);
    }

    /** Translated-document counts per language, for the honest coverage figure in the UI. */
    public Map<String, Integer> translationCoverage() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        translations.forEach((code, overlays) -> counts.put(code, overlays.size()));
        return counts;
    }

    // -------------------------------------------------------- interview content

    /**
     * Loads the interview tracks and every question set beneath {@code interview/}.
     *
     * <p>Track directories are discovered rather than listed, so adding a track is a matter of
     * creating a directory and adding an entry to {@code tracks.json} — no Java change, which is
     * the same rule the rest of the content library follows (ADR-001).
     *
     * <p>Each question is also indexed by its own id, with {@code trackId} and {@code topic}
     * copied onto it. Denormalising those two fields is deliberate: a question is served on its
     * own by the drill screen, and without them the client would have to hold the whole set to
     * know where a question came from.
     */
    private void loadInterviewContent(Path root) {
        if (!Files.isDirectory(root)) {
            log.warn("No interview content directory at {} — the interview tracks will be empty", root);
            interviewTracks = mapper.createArrayNode();
            return;
        }

        JsonNode tracks = readArray(root.resolve("tracks.json"));
        interviewTracks = tracks instanceof ArrayNode array ? array : mapper.createArrayNode();

        List<Path> trackDirectories = new ArrayList<>();
        try (Stream<Path> entries = Files.list(root)) {
            entries.filter(Files::isDirectory).sorted().forEach(trackDirectories::add);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to list " + root, e);
        }

        Map<String, ObjectNode> sets = readAll(trackDirectories.toArray(new Path[0]));
        Map<String, ObjectNode> byId = new LinkedHashMap<>();

        sets.forEach((setId, set) -> {
            String trackId = set.path("trackId").asText("");
            String topic = set.path("topic").asText("");
            JsonNode questions = set.path("questions");
            if (!questions.isArray()) {
                return;
            }
            for (JsonNode question : questions) {
                if (!(question instanceof ObjectNode node)) {
                    continue;
                }
                node.put("trackId", trackId);
                node.put("topic", topic);
                node.put("setId", setId);
                String id = node.path("id").asText(null);
                if (id != null && byId.put(id, node) != null) {
                    throw new IllegalStateException("Duplicate interview question id '" + id + "' in " + setId);
                }
            }
        });

        questionSets = sets;
        interviewQuestions = Collections.unmodifiableMap(byId);
        log.info("Loaded {} interview tracks, {} question sets, {} questions",
                interviewTracks.size(), questionSets.size(), interviewQuestions.size());
    }

    // ------------------------------------------------------------------ loading

    private Map<String, ObjectNode> readAll(Path... directories) {
        Map<String, ObjectNode> result = new LinkedHashMap<>();
        for (Path directory : directories) {
            if (!Files.isDirectory(directory)) {
                log.warn("Content directory {} does not exist — skipping", directory);
                continue;
            }
            try (Stream<Path> files = Files.list(directory)) {
                files.filter(p -> p.getFileName().toString().endsWith(".json"))
                        .sorted()
                        .forEach(file -> {
                            ObjectNode node = readOne(file);
                            String id = node.path("id").asText(null);
                            if (id == null || id.isBlank()) {
                                throw new IllegalStateException("Content file " + file + " has no \"id\" field");
                            }
                            ObjectNode previous = result.put(id, node);
                            if (previous != null) {
                                throw new IllegalStateException("Duplicate content id '" + id + "' in " + file);
                            }
                        });
            } catch (IOException e) {
                throw new UncheckedIOException("Failed to list " + directory, e);
            }
        }
        return Collections.unmodifiableMap(result);
    }

    private ObjectNode readOne(Path file) {
        try {
            JsonNode node = mapper.readTree(Files.newBufferedReader(file));
            if (!(node instanceof ObjectNode object)) {
                throw new IllegalStateException("Expected a JSON object in " + file);
            }
            return object;
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to parse " + file, e);
        }
    }

    private JsonNode readArray(Path file) {
        if (!Files.isRegularFile(file)) {
            log.warn("Content file {} does not exist", file);
            return mapper.createArrayNode();
        }
        try {
            return mapper.readTree(Files.newBufferedReader(file));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to parse " + file, e);
        }
    }

    /**
     * Boot-time integrity checks. These catch the mistakes that are easy to make when
     * authoring content by hand and impossible to notice at runtime: a lesson pointing at
     * a problem that was renamed, or a quiz whose answer index is out of range.
     */
    private void validate() {
        List<String> issues = new ArrayList<>();

        lessons.forEach((id, lesson) -> {
            checkRefs(issues, id, lesson.path("practiceProblems"), problems.keySet(), "practiceProblems");
            checkRefs(issues, id, lesson.path("prerequisites"), lessons.keySet(), "prerequisites");
            JsonNode treeId = lesson.path("patternRecognition").path("decisionTreeId");
            if (treeId.isTextual() && !decisionTrees.containsKey(treeId.asText())) {
                issues.add(id + " references unknown decision tree '" + treeId.asText() + "'");
            }
            validateQuiz(issues, id, lesson.path("quiz"));
        });

        problems.forEach((id, problem) -> {
            JsonNode pattern = problem.path("patternId");
            if (pattern.isTextual() && !lessons.containsKey(pattern.asText())) {
                issues.add("problem " + id + " references unknown pattern '" + pattern.asText() + "'");
            }
        });

        concepts.forEach((id, concept) -> validateQuiz(issues, id, concept.path("quiz")));
        caseStudies.forEach((id, study) -> validateQuiz(issues, id, study.path("quiz")));

        if (!issues.isEmpty()) {
            // Warn rather than fail: a broken cross-reference should not stop someone
            // studying the other 80 lessons. It is loud in the log and surfaced by /api/health.
            log.warn("Content validation found {} issue(s):", issues.size());
            issues.forEach(issue -> log.warn("  - {}", issue));
        } else {
            log.info("Content validation passed: all cross-references resolve");
        }
        this.validationIssues = List.copyOf(issues);
    }

    private void checkRefs(List<String> issues, String owner, JsonNode refs,
                           java.util.Set<String> known, String field) {
        if (!refs.isArray()) {
            return;
        }
        refs.forEach(ref -> {
            if (ref.isTextual() && !known.contains(ref.asText())) {
                issues.add(owner + "." + field + " references unknown id '" + ref.asText() + "'");
            }
        });
    }

    private void validateQuiz(List<String> issues, String owner, JsonNode quiz) {
        if (!quiz.isArray()) {
            return;
        }
        for (JsonNode question : quiz) {
            int answer = question.path("answerIndex").asInt(-1);
            int options = question.path("options").size();
            if (answer < 0 || answer >= options) {
                issues.add(owner + " quiz question '" + question.path("id").asText()
                        + "' has answerIndex " + answer + " but " + options + " options");
            }
        }
    }

    private List<String> validationIssues = List.of();

    public List<String> validationIssues() {
        return validationIssues;
    }

    // ------------------------------------------------------------------ accessors

    public Map<String, ObjectNode> lessons() {
        return lessons;
    }

    public Map<String, ObjectNode> problems() {
        return problems;
    }

    public Map<String, ObjectNode> concepts() {
        return concepts;
    }

    public Map<String, ObjectNode> caseStudies() {
        return caseStudies;
    }

    public Map<String, ObjectNode> decisionTrees() {
        return decisionTrees;
    }

    public Map<String, ObjectNode> paths() {
        return paths;
    }

    public ObjectNode patternMap() {
        return patternMap;
    }

    public ArrayNode patternRecognition() {
        return patternRecognition;
    }

    public ArrayNode interviewTracks() {
        return interviewTracks;
    }

    public Map<String, ObjectNode> questionSets() {
        return questionSets;
    }

    public Map<String, ObjectNode> interviewQuestions() {
        return interviewQuestions;
    }

    public ObjectNode questionSet(String id) {
        return require(questionSets, id, "question set");
    }

    public ObjectNode interviewQuestion(String id) {
        return require(interviewQuestions, id, "interview question");
    }

    public Map<String, String> typeById() {
        return typeById;
    }

    public ObjectNode lesson(String id) {
        return require(lessons, id, "lesson");
    }

    public ObjectNode problem(String id) {
        return require(problems, id, "problem");
    }

    public ObjectNode concept(String id) {
        return require(concepts, id, "concept");
    }

    public ObjectNode caseStudy(String id) {
        return require(caseStudies, id, "case study");
    }

    public ObjectNode decisionTree(String id) {
        return require(decisionTrees, id, "decision tree");
    }

    public ObjectNode path(String id) {
        return require(paths, id, "learning path");
    }

    /** Any content document by id, whichever collection it lives in. */
    public Optional<ObjectNode> anyById(String id) {
        return Stream.of(lessons, problems, concepts, caseStudies)
                .map(m -> m.get(id))
                .filter(java.util.Objects::nonNull)
                .findFirst();
    }

    private ObjectNode require(Map<String, ObjectNode> map, String id, String type) {
        ObjectNode node = map.get(id);
        if (node == null) {
            throw NotFoundException.of(type, id);
        }
        return node;
    }

    public int totalItems() {
        return lessons.size() + problems.size() + concepts.size() + caseStudies.size();
    }

    // ------------------------------------------------------------------ projections

    /**
     * Strips quiz answers from a document before it goes over the wire.
     *
     * <p>Answers are served only by {@code POST /api/quiz/{id}/evaluate}. This is the reason
     * the API returns a copy rather than the stored node — mutating the cached document would
     * permanently destroy the answers for the life of the process.
     */
    public ObjectNode withoutQuizAnswers(ObjectNode document) {
        ObjectNode copy = document.deepCopy();
        JsonNode quiz = copy.get("quiz");
        if (quiz instanceof ArrayNode questions) {
            questions.forEach(question -> {
                if (question instanceof ObjectNode q) {
                    q.remove("answerIndex");
                    q.remove("explanation");
                }
            });
        }
        return copy;
    }

    /** A lightweight card for list screens: enough to render, small enough to send hundreds of. */
    public ObjectNode summarise(ObjectNode document, String type) {
        ObjectNode summary = mapper.createObjectNode();
        summary.put("id", document.path("id").asText());
        summary.put("type", type);
        summary.put("title", document.path("title").asText());

        copyIfPresent(document, summary, "kind", "group", "level", "difficulty",
                "estimatedMinutes", "summary", "tags", "patternId", "prerequisites", "interactive");

        if (!summary.has("summary")) {
            // Problems carry a statement rather than a summary; use a trimmed form of it.
            String statement = document.path("statement").asText("");
            if (!statement.isEmpty()) {
                summary.put("summary", statement.length() > 180
                        ? statement.substring(0, 177) + "..."
                        : statement);
            }
        }

        // The judge reference, flattened onto the card so a list of problems can show its number
        // without fetching each document. bundle.ts flattens exactly these two fields — if only
        // one side did it, the online and offline problem lists would disagree about which
        // problems have somewhere to go and practise.
        JsonNode leetcode = document.path("practice").path("leetcode");
        if (leetcode.isObject()) {
            summary.put("leetcodeId", leetcode.path("id").asInt());
            summary.put("leetcodePremium", leetcode.path("premium").asBoolean(false));
        }
        return summary;
    }

    private void copyIfPresent(ObjectNode from, ObjectNode to, String... fields) {
        for (String field : fields) {
            JsonNode value = from.get(field);
            if (value != null && !value.isNull()) {
                to.set(field, value.deepCopy());
            }
        }
    }

    public ObjectMapper mapper() {
        return mapper;
    }
}
