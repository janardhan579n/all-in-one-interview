package com.learningplatform.search;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.content.ContentStore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Global search across every content type.
 *
 * <p>An inverted index (token → documents) is built once at boot. Searching is then a few map
 * lookups rather than a scan over every document, which keeps it fast as the library grows —
 * the requirement in §39 of the brief. Fields are weighted so a title match outranks a body
 * match, and a prefix match on a rare term still scores.
 */
@Service
public class SearchService {

    private static final Logger log = LoggerFactory.getLogger(SearchService.class);

    /**
     * Field weights. A hit in the title is worth far more than a hit in the prose.
     *
     * <p>These mirror the offline implementation in {@code services/platform.ts}. The two must
     * agree: a learner who searches with the backend running and again without it should get the
     * same top result, or the platform looks broken rather than merely different.
     */
    private static final Map<String, Integer> FIELD_WEIGHTS = Map.of(
            "title", 20,
            "tags", 8,
            "group", 8,
            "summary", 6,
            "body", 1);

    private static final Set<String> STOP_WORDS = Set.of(
            "the", "a", "an", "is", "are", "of", "to", "in", "and", "or", "for", "on", "it",
            "this", "that", "with", "as", "be", "by", "at", "from", "you", "your");

    private final ContentStore content;

    /** token -> (documentId -> score contributed by that token) */
    private final Map<String, Map<String, Integer>> index = new HashMap<>();
    private final Map<String, ObjectNode> documents = new LinkedHashMap<>();
    private final Map<String, String> snippets = new HashMap<>();

    public SearchService(ContentStore content) {
        this.content = content;
    }

    @PostConstruct
    public void buildIndex() {
        indexCollection(content.lessons(), ContentStore.TYPE_LESSON);
        indexCollection(content.problems(), ContentStore.TYPE_PROBLEM);
        indexCollection(content.concepts(), ContentStore.TYPE_CONCEPT);
        indexCollection(content.caseStudies(), ContentStore.TYPE_CASE_STUDY);
        log.info("Search index built: {} documents, {} distinct tokens", documents.size(), index.size());
    }

    private void indexCollection(Map<String, ObjectNode> collection, String type) {
        collection.forEach((id, document) -> {
            ObjectNode summary = content.summarise(document, type);
            documents.put(id, summary);
            snippets.put(id, snippetFor(document));

            addField(id, "title", document.path("title").asText(""));
            addField(id, "group", document.path("group").asText(""));
            addField(id, "summary", document.path("summary").asText(""));
            addField(id, "summary", document.path("statement").asText(""));
            addField(id, "tags", textOf(document.path("tags")));
            addField(id, "tags", document.path("patternId").asText(""));
            addField(id, "body", textOf(document.path("analogy")));
            addField(id, "body", document.path("intuition").asText(""));
            addField(id, "body", textOf(document.path("explanation")));
            addField(id, "body", textOf(document.path("patternRecognition")));
            addField(id, "body", document.path("realWorld").asText(""));
        });
    }

    private void addField(String documentId, String field, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        int weight = FIELD_WEIGHTS.getOrDefault(field, 1);
        for (String token : tokenize(text)) {
            // max, NOT sum. Summing would score term FREQUENCY, and in a library of long prose
            // that beats field weight outright: a problem statement saying "window" fifteen times
            // scores 15 body points and outranks the Sliding Window lesson's 10-point title. What
            // a document is *about* is what should rank, so each token contributes only the
            // highest-weighted field it appears in, however often it appears.
            index.computeIfAbsent(token, key -> new HashMap<>())
                    .merge(documentId, weight, Integer::max);
        }
    }

    /**
     * Scores documents against the query. Every query token must match something (AND
     * semantics) — for a small curated library that produces far more useful results than OR,
     * which would return half the catalogue for a two-word query.
     */
    public List<Map<String, Object>> search(String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        List<String> tokens = tokenize(query);
        if (tokens.isEmpty()) {
            return List.of();
        }

        Map<String, Integer> scores = null;
        for (String token : tokens) {
            Map<String, Integer> matches = new HashMap<>();

            // Same rule as the index itself: best match wins rather than accumulating. An exact
            // hit is worth double a prefix hit, but a document does not climb the ranking by
            // happening to contain several words that share a prefix with the query.
            Map<String, Integer> exact = index.get(token);
            if (exact != null) {
                exact.forEach((id, score) -> matches.merge(id, score * 2, Integer::max));
            }
            // Prefix matching, so "shard" finds "sharding" and "cach" finds "caching".
            if (token.length() >= 3) {
                index.forEach((indexed, postings) -> {
                    if (indexed.startsWith(token) && !indexed.equals(token)) {
                        postings.forEach((id, score) -> matches.merge(id, score, Integer::max));
                    }
                });
            }

            if (scores == null) {
                scores = matches;
            } else {
                Set<String> keep = new HashSet<>(scores.keySet());
                keep.retainAll(matches.keySet());
                Map<String, Integer> merged = new HashMap<>();
                for (String id : keep) {
                    merged.put(id, scores.get(id) + matches.get(id));
                }
                scores = merged;
            }
            if (scores.isEmpty()) {
                return List.of();
            }
        }

        List<Map<String, Object>> results = new ArrayList<>();
        scores.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey()))
                .limit(Math.max(1, limit))
                .forEach(entry -> {
                    ObjectNode summary = documents.get(entry.getKey());
                    Map<String, Object> hit = new LinkedHashMap<>();
                    hit.put("id", entry.getKey());
                    hit.put("type", summary.path("type").asText());
                    hit.put("title", summary.path("title").asText());
                    hit.put("group", summary.path("group").asText(""));
                    hit.put("snippet", snippets.getOrDefault(entry.getKey(), ""));
                    hit.put("score", entry.getValue());
                    results.add(hit);
                });
        return results;
    }

    private String snippetFor(JsonNode document) {
        String text = document.path("summary").asText("");
        if (text.isBlank()) {
            text = document.path("statement").asText("");
        }
        if (text.isBlank()) {
            text = document.path("explanation").path("beginner").asText("");
        }
        return text.length() > 200 ? text.substring(0, 197) + "..." : text;
    }

    private String textOf(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        return node.isTextual() ? node.asText() : node.toString();
    }

    private List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        for (String raw : text.toLowerCase(Locale.ROOT).split("[^a-z0-9+#]+")) {
            if (raw.length() >= 2 && !STOP_WORDS.contains(raw)) {
                tokens.add(raw);
            }
        }
        return tokens;
    }

    /** Exposed for the health endpoint. */
    public int indexedDocuments() {
        return documents.size();
    }
}
