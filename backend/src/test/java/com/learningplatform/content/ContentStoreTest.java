package com.learningplatform.content;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Guards the content library itself.
 *
 * <p>Content is authored by hand, so these checks catch the mistakes that are invisible until a
 * learner clicks something: a renamed problem still referenced by a lesson, a quiz whose answer
 * index is out of range, a visualisation naming an engine the frontend does not register.
 */
@SpringBootTest
class ContentStoreTest {

    /**
     * The engines the frontend registers, read from `visualizers/registry.ts` rather than copied.
     *
     * <p>This was a hand-maintained {@code Set.of(...)} of 41 names. Phase 9 added twelve engines
     * and nobody updated it, so the build failed on {@code mergeSortSteps} — content that was
     * perfectly correct, failing a test that had quietly gone stale. A second copy of a list is a
     * second thing to forget, and the copy is always the one that rots, because the real registry
     * is edited by whoever adds an engine while the copy is edited by whoever remembers.
     *
     * <p>So the list is parsed from the one place it actually lives. {@code validate-content.mjs}
     * reads the same file with the same marker, which is what keeps the two build gates agreeing.
     */
    private static Set<String> registeredEngines() {
        Path registry = locateRegistry();
        assumeTrue(registry != null,
                "frontend/src/visualizers/registry.ts not found — engine check skipped "
                        + "(expected when the backend is built without the frontend beside it)");
        String source;
        try {
            source = Files.readString(registry);
        } catch (IOException e) {
            throw new UncheckedIOException("could not read " + registry, e);
        }

        String marker = "export const ENGINES: Record<string, Engine> = {";
        int start = source.indexOf(marker);
        assumeTrue(start >= 0, "ENGINES registry marker not found in " + registry);
        String body = source.substring(start + marker.length(), source.indexOf("\n};", start));

        Set<String> engines = new HashSet<>();
        Matcher matcher = Pattern.compile("^\\s*'?([A-Za-z][\\w-]*)'?\\s*[,:]", Pattern.MULTILINE).matcher(body);
        while (matcher.find()) {
            engines.add(matcher.group(1));
        }
        assertFalse(engines.isEmpty(), "parsed no engine names out of " + registry);
        return engines;
    }

    /** The frontend sits beside content/, wherever the repository happens to be checked out. */
    private static Path locateRegistry() {
        for (String candidate : new String[] {
                "../frontend/src/visualizers/registry.ts",
                "frontend/src/visualizers/registry.ts",
                "/app/frontend/src/visualizers/registry.ts"}) {
            Path path = Paths.get(candidate).toAbsolutePath().normalize();
            if (Files.isRegularFile(path)) {
                return path;
            }
        }
        return null;
    }

    @Autowired
    private ContentStore content;

    @Test
    @DisplayName("the full library loads")
    void loadsEverything() {
        assertTrue(content.lessons().size() >= 20, "expected at least 20 lessons");
        assertTrue(content.problems().size() >= 160, "expected at least 160 problems");
        assertTrue(content.concepts().size() >= 30, "expected at least 30 system design concepts");
        assertTrue(content.caseStudies().size() >= 4, "expected at least 4 case studies");
        assertFalse(content.decisionTrees().isEmpty());
        assertFalse(content.paths().isEmpty());
        assertNotNull(content.patternMap());
        assertTrue(content.patternRecognition().size() >= 15);
    }

    @Test
    @DisplayName("no cross-reference is broken")
    void crossReferencesResolve() {
        assertEquals(java.util.List.of(), content.validationIssues(),
                "content validation reported unresolved references");
    }

    @Test
    @DisplayName("every lesson has the fields the UI depends on")
    void lessonsAreWellFormed() {
        content.lessons().forEach((id, lesson) -> {
            assertFalse(lesson.path("title").asText().isBlank(), id + " has no title");
            assertFalse(lesson.path("summary").asText().isBlank(), id + " has no summary");
            assertFalse(lesson.path("group").asText().isBlank(), id + " has no group");
            assertTrue(lesson.path("analogy").has("beginner"), id + " has no beginner analogy");
            assertTrue(lesson.path("analogy").has("interview"), id + " has no interview analogy");
            assertTrue(lesson.path("complexity").has("why"),
                    id + " states complexity without explaining why");
            assertTrue(lesson.path("implementations").size() >= 1, id + " has no implementation");
        });
    }

    @Test
    @DisplayName("every visualisation names an engine the frontend registers")
    void visualisationEnginesExist() {
        Set<String> known = registeredEngines();
        content.lessons().forEach((id, lesson) -> checkEngines(known, id, lesson.path("visualizations")));
        content.problems().forEach((id, problem) -> {
            JsonNode visualization = problem.get("visualization");
            if (visualization != null) {
                String engine = visualization.path("engine").asText();
                assertTrue(known.contains(engine),
                        "problem " + id + " references unknown engine '" + engine + "'");
            }
        });
    }

    private void checkEngines(Set<String> known, String id, JsonNode visualizations) {
        if (!visualizations.isArray()) {
            return;
        }
        for (JsonNode visualization : visualizations) {
            String engine = visualization.path("engine").asText();
            assertTrue(known.contains(engine),
                    id + " references unknown engine '" + engine + "'");
            assertTrue(visualization.path("code").isArray(),
                    id + " visualisation '" + visualization.path("id").asText() + "' has no code listing");
        }
    }

    @Test
    @DisplayName("every problem teaches the brute-force to optimised journey")
    void problemsShowTheJourney() {
        content.problems().forEach((id, problem) -> {
            assertTrue(problem.path("bruteForce").has("whySlow"),
                    id + " does not explain why the brute force is slow");
            assertTrue(problem.path("optimized").has("code"), id + " has no optimised solution");
            assertFalse(problem.path("patternIdentification").asText().isBlank(),
                    id + " does not say which pattern it belongs to");
        });
    }

    @Test
    @DisplayName("system design concepts always show both sides of a trade-off")
    void conceptsShowTradeoffs() {
        content.concepts().forEach((id, concept) -> {
            assertTrue(concept.path("explanation").has("beginner"), id + " has no beginner explanation");
            assertTrue(concept.path("explanation").has("interview"), id + " has no interview explanation");
            assertTrue(concept.path("why").has("without"), id + " has no WHY-mode content");
            assertTrue(concept.path("whenNotToUse").size() > 0,
                    id + " lists no situations where it is the wrong choice");
            assertTrue(concept.path("tradeoffs").size() > 0, id + " lists no trade-offs");
            // §14: a trade-off with only pros is a recommendation wearing a trade-off's clothes.
            concept.path("tradeoffs").forEach(tradeoff -> {
                assertTrue(tradeoff.path("pros").size() > 0, id + ": a trade-off option lists no pros");
                assertTrue(tradeoff.path("cons").size() > 0,
                        id + ": option \"" + tradeoff.path("option").asText() + "\" lists no cons");
            });
        });
    }

    @Test
    @DisplayName("every concept group the index knows how to render is one a concept actually uses")
    void conceptGroupsAreKnownToTheIndex() {
        // SystemDesignIndex.tsx orders and captions the groups by name. A concept filed under a
        // group the index has never heard of still renders, but silently loses its ordering and
        // its blurb and drops to the bottom of the page — which is the kind of defect nobody
        // notices for months. The list below must match GROUP_ORDER in that file.
        java.util.Set<String> known = java.util.Set.of(
                "Foundations", "Performance", "Data", "Reliability", "Security", "Architecture", "Distributed");
        java.util.Set<String> used = new java.util.TreeSet<>();
        content.concepts().forEach((id, concept) -> {
            String group = concept.path("group").asText("");
            assertFalse(group.isBlank(), id + " has no group");
            used.add(group);
            assertTrue(known.contains(group),
                    id + " is filed under \"" + group + "\", which SystemDesignIndex.tsx does not order or caption");
        });
        assertTrue(used.contains("Security") && used.contains("Architecture"),
                "expected the Security and Architecture groups to be populated");
    }

    @Test
    @DisplayName("case studies build the architecture up in stages")
    void caseStudiesEvolve() {
        content.caseStudies().forEach((id, study) -> {
            assertTrue(study.path("evolution").size() >= 3,
                    id + " should show at least three architecture stages");
            for (JsonNode stage : study.path("evolution")) {
                assertFalse(stage.path("problem").asText().isBlank(),
                        id + " has a stage that does not state the problem being solved");
                assertFalse(stage.path("why").asText().isBlank(),
                        id + " has a stage that does not explain WHY the component was added");
                assertTrue(stage.path("architecture").path("nodes").size() > 0,
                        id + " has a stage with no diagram");
            }
        });
    }

    @Test
    @DisplayName("architecture diagram edges only connect declared nodes")
    void diagramEdgesResolve() {
        content.caseStudies().forEach((id, study) -> {
            for (JsonNode stage : study.path("evolution")) {
                checkDiagram(id + "/" + stage.path("stage").asText(), stage.path("architecture"));
            }
        });
        content.concepts().forEach((id, concept) -> checkDiagram(id, concept.path("diagram")));
    }

    private void checkDiagram(String label, JsonNode diagram) {
        if (diagram.isMissingNode() || diagram.isNull()) {
            return;
        }
        Set<String> nodeIds = new java.util.HashSet<>();
        diagram.path("nodes").forEach(node -> nodeIds.add(node.path("id").asText()));
        diagram.path("edges").forEach(edge -> {
            assertTrue(nodeIds.contains(edge.path("from").asText()),
                    label + " has an edge from unknown node '" + edge.path("from").asText() + "'");
            assertTrue(nodeIds.contains(edge.path("to").asText()),
                    label + " has an edge to unknown node '" + edge.path("to").asText() + "'");
        });
    }

    @Test
    @DisplayName("quiz answers are stripped from served documents")
    void quizAnswersAreNotLeaked() {
        ObjectNode lesson = content.lessons().get("sliding-window");
        assertNotNull(lesson);
        assertTrue(lesson.path("quiz").get(0).has("answerIndex"), "stored content should keep answers");

        ObjectNode served = content.withoutQuizAnswers(lesson);
        served.path("quiz").forEach(question -> {
            assertFalse(question.has("answerIndex"), "served quiz must not contain answerIndex");
            assertFalse(question.has("explanation"), "served quiz must not contain the explanation");
        });

        // The stored document must be untouched — the copy is what gets stripped.
        assertTrue(content.lessons().get("sliding-window").path("quiz").get(0).has("answerIndex"),
                "stripping must not mutate the cached document");
    }

    @Test
    @DisplayName("decision trees terminate: every option leads somewhere real")
    void decisionTreesAreWellFormed() {
        content.decisionTrees().forEach((id, tree) -> {
            JsonNode nodes = tree.path("nodes");
            String start = tree.path("start").asText();
            assertTrue(nodes.has(start), id + " start node '" + start + "' does not exist");

            nodes.fields().forEachRemaining(entry -> {
                JsonNode node = entry.getValue();
                if ("question".equals(node.path("type").asText())) {
                    assertTrue(node.path("options").size() >= 2,
                            id + "/" + entry.getKey() + " is a question with fewer than two options");
                    node.path("options").forEach(option -> {
                        String next = option.path("next").asText();
                        assertTrue(nodes.has(next),
                                id + "/" + entry.getKey() + " points at missing node '" + next + "'");
                    });
                } else {
                    assertFalse(node.path("text").asText().isBlank(),
                            id + "/" + entry.getKey() + " is a result with no text");
                }
            });
        });
    }
}
