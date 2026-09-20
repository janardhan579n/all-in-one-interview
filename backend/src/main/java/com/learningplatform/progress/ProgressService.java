package com.learningplatform.progress;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.content.ContentStore;
import com.learningplatform.user.LocalUserService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Progress tracking and the aggregates the dashboard renders.
 *
 * <p>Derived values — percentages, the streak, weak areas, interview readiness — are computed
 * on read rather than stored. They are cheap at this data volume and, more importantly, they
 * can never drift out of sync with the underlying rows, which is the usual failure mode of
 * cached counters.
 */
@Service
public class ProgressService {

    /** A pattern is "weak" if it has been attempted a few times with a low solve rate. */
    private static final int WEAK_AREA_MIN_ATTEMPTS = 2;
    private static final double WEAK_AREA_SOLVE_RATE = 0.6;

    private final ProgressRepository repository;
    private final ContentStore content;
    private final LocalUserService users;

    public ProgressService(ProgressRepository repository, ContentStore content, LocalUserService users) {
        this.repository = repository;
        this.content = content;
        this.users = users;
    }

    // ----------------------------------------------------------------- writes

    public void updateLesson(String contentId, String status, Integer percent) {
        String userId = users.currentUserId();
        String type = content.typeById().getOrDefault(contentId, ContentStore.TYPE_LESSON);

        int resolvedPercent = percent != null ? clamp(percent) : ("completed".equals(status) ? 100 : 0);
        // Progress never moves backwards on its own: a scroll-driven update that arrives late
        // must not undo a completion the learner already earned.
        Optional<ProgressRepository.LessonProgress> existing = repository.lessonProgress(userId, contentId);
        if (existing.isPresent()) {
            resolvedPercent = Math.max(existing.get().percent(), resolvedPercent);
            if ("completed".equals(existing.get().status()) && !"completed".equals(status)) {
                status = "completed";
                resolvedPercent = 100;
            }
        }

        repository.upsertLessonProgress(userId, contentId, type, status, resolvedPercent, now());
        repository.touchActivity(userId, LocalDate.now());
    }

    public void recordAttempt(String problemId, boolean solved, Integer confidence) {
        String userId = users.currentUserId();
        ObjectNode problem = content.problem(problemId);      // 404s if the id is unknown
        String patternId = problem.path("patternId").asText(null);

        repository.recordAttempt(userId, problemId, patternId, solved, confidence, now());
        repository.touchActivity(userId, LocalDate.now());
    }

    public void setFlags(String contentId, boolean difficult, boolean mastered) {
        repository.setFlags(users.currentUserId(), contentId, difficult, mastered, now());
    }

    // ------------------------------------------------------------------ reads

    /** The full snapshot: everything the frontend needs to colour the whole app at once. */
    public Map<String, Object> snapshot() {
        String userId = users.currentUserId();

        Map<String, Object> lessons = new LinkedHashMap<>();
        repository.allLessonProgress(userId).forEach(row -> lessons.put(row.contentId(), Map.of(
                "status", row.status(),
                "percent", row.percent(),
                "updatedAt", row.updatedAt() == null ? "" : row.updatedAt())));

        Map<String, Object> problems = new LinkedHashMap<>();
        repository.problemStats(userId).forEach(stat -> problems.put(stat.problemId(), Map.of(
                "attempts", stat.attempts(),
                "solved", stat.solved(),
                "lastAttempt", stat.lastAttempt() == null ? "" : stat.lastAttempt())));

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("lessons", lessons);
        snapshot.put("problems", problems);
        snapshot.put("quizzes", repository.quizResults(userId));
        snapshot.put("flags", repository.flags(userId));
        snapshot.put("streak", currentStreak(repository.activeDays(userId)));
        return snapshot;
    }

    /** Dashboard aggregates: the numbers behind the progress bars and the readiness score. */
    public Map<String, Object> summary() {
        String userId = users.currentUserId();

        int dsaTotal = content.lessons().size();
        int dsaDone = repository.countByStatus(userId, ContentStore.TYPE_LESSON, "completed");

        int sdTotal = content.concepts().size() + content.caseStudies().size();
        int sdDone = repository.countByStatus(userId, ContentStore.TYPE_CONCEPT, "completed")
                + repository.countByStatus(userId, ContentStore.TYPE_CASE_STUDY, "completed");

        int patternsTotal = (int) content.lessons().values().stream()
                .filter(lesson -> "pattern".equals(lesson.path("kind").asText()))
                .count();
        int patternsMastered = (int) repository.allLessonProgress(userId).stream()
                .filter(row -> "completed".equals(row.status()))
                .filter(row -> {
                    ObjectNode lesson = content.lessons().get(row.contentId());
                    return lesson != null && "pattern".equals(lesson.path("kind").asText());
                })
                .count();

        int problemsSolved = repository.solvedCount(userId);
        List<String> activeDays = repository.activeDays(userId);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("dsa", bar(dsaDone, dsaTotal));
        summary.put("systemDesign", bar(sdDone, sdTotal));
        summary.put("patterns", bar(patternsMastered, patternsTotal));
        summary.put("problemsSolved", problemsSolved);
        summary.put("problemsTotal", content.problems().size());
        summary.put("caseStudiesCompleted", repository.countByStatus(userId, ContentStore.TYPE_CASE_STUDY, "completed"));
        summary.put("streak", currentStreak(activeDays));
        summary.put("activeDays", activeDays.size());
        summary.put("weakAreas", weakAreas());
        summary.put("recent", recentActivity(6));
        summary.put("readiness", readiness(dsaDone, dsaTotal, sdDone, sdTotal, problemsSolved));
        return summary;
    }

    /**
     * Patterns the learner is struggling with: attempted enough times to be meaningful, with a
     * solve rate below the threshold. Patterns never attempted are reported separately as
     * "not started" rather than as weaknesses — you cannot be bad at something you have not tried.
     */
    public List<Map<String, Object>> weakAreas() {
        List<Map<String, Object>> weak = new ArrayList<>();
        for (ProgressRepository.PatternStat stat : repository.patternStats(users.currentUserId())) {
            if (stat.attempts() < WEAK_AREA_MIN_ATTEMPTS) {
                continue;
            }
            double rate = stat.attempts() == 0 ? 0 : (double) stat.solved() / stat.attempts();
            if (rate < WEAK_AREA_SOLVE_RATE) {
                ObjectNode lesson = content.lessons().get(stat.patternId());
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("patternId", stat.patternId());
                entry.put("title", lesson != null ? lesson.path("title").asText() : stat.patternId());
                entry.put("attempts", stat.attempts());
                entry.put("solved", stat.solved());
                entry.put("solveRate", Math.round(rate * 100));
                weak.add(entry);
            }
        }
        weak.sort(Comparator.comparingLong(entry -> ((Number) entry.get("solveRate")).longValue()));
        return weak;
    }

    private List<Map<String, Object>> recentActivity(int limit) {
        List<Map<String, Object>> recent = new ArrayList<>();
        for (ProgressRepository.LessonProgress row : repository.recent(users.currentUserId(), limit)) {
            content.anyById(row.contentId()).ifPresent(document -> {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", row.contentId());
                entry.put("type", row.contentType());
                entry.put("title", document.path("title").asText());
                entry.put("status", row.status());
                entry.put("percent", row.percent());
                entry.put("updatedAt", row.updatedAt());
                recent.add(entry);
            });
        }
        return recent;
    }

    /**
     * A deliberately simple, explainable readiness score. It is weighted towards *patterns and
     * problems* rather than lessons read, because recognising a pattern under pressure is what
     * an interview actually tests.
     */
    private Map<String, Object> readiness(int dsaDone, int dsaTotal, int sdDone, int sdTotal, int solved) {
        double lessonScore = dsaTotal == 0 ? 0 : (double) dsaDone / dsaTotal;
        double designScore = sdTotal == 0 ? 0 : (double) sdDone / sdTotal;
        double problemScore = content.problems().isEmpty()
                ? 0 : Math.min(1.0, (double) solved / Math.min(content.problems().size(), 25));

        int score = (int) Math.round(100 * (0.3 * lessonScore + 0.3 * designScore + 0.4 * problemScore));

        String band;
        if (score >= 80) band = "Interview ready";
        else if (score >= 55) band = "Nearly there";
        else if (score >= 25) band = "Building foundations";
        else band = "Just getting started";

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("score", score);
        result.put("band", band);
        result.put("breakdown", Map.of(
                "dsaLessons", Math.round(lessonScore * 100),
                "systemDesign", Math.round(designScore * 100),
                "problemPractice", Math.round(problemScore * 100)));
        return result;
    }

    /** Consecutive days ending today or yesterday. Yesterday still counts — today is not over. */
    int currentStreak(List<String> descendingDays) {
        if (descendingDays.isEmpty()) {
            return 0;
        }
        Set<LocalDate> days = new java.util.HashSet<>();
        descendingDays.forEach(day -> days.add(LocalDate.parse(day)));

        LocalDate cursor = LocalDate.now();
        if (!days.contains(cursor)) {
            cursor = cursor.minusDays(1);
            if (!days.contains(cursor)) {
                return 0;
            }
        }
        int streak = 0;
        while (days.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private Map<String, Object> bar(int done, int total) {
        return Map.of(
                "completed", done,
                "total", total,
                "percent", total == 0 ? 0 : Math.round(100.0 * done / total));
    }

    private int clamp(int percent) {
        return Math.max(0, Math.min(100, percent));
    }

    private String now() {
        return Instant.now().toString();
    }

    ProgressRepository repository() {
        return repository;
    }
}
