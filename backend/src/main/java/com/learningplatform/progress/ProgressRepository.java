package com.learningplatform.progress;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * All reads and writes of learner progress. Plain Spring JDBC — see docs/DECISIONS.md ADR-003
 * for why there is no ORM here.
 */
@Repository
public class ProgressRepository {

    private final JdbcTemplate jdbc;

    public ProgressRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------------- lessons

    private static final RowMapper<LessonProgress> LESSON_MAPPER = (rs, rowNum) -> new LessonProgress(
            rs.getString("content_id"),
            rs.getString("content_type"),
            rs.getString("status"),
            rs.getInt("percent"),
            rs.getString("started_at"),
            rs.getString("completed_at"),
            rs.getString("updated_at"));

    public List<LessonProgress> allLessonProgress(String userId) {
        return jdbc.query("""
                SELECT content_id, content_type, status, percent, started_at, completed_at, updated_at
                FROM lesson_progress WHERE user_id = ? ORDER BY updated_at DESC
                """, LESSON_MAPPER, userId);
    }

    public Optional<LessonProgress> lessonProgress(String userId, String contentId) {
        List<LessonProgress> rows = jdbc.query("""
                SELECT content_id, content_type, status, percent, started_at, completed_at, updated_at
                FROM lesson_progress WHERE user_id = ? AND content_id = ?
                """, LESSON_MAPPER, userId, contentId);
        return rows.stream().findFirst();
    }

    /**
     * Upsert. SQLite and H2 both support ON CONFLICT, and doing it in one statement avoids a
     * read-then-write race — which matters even here, because the frontend fires progress
     * updates while the user scrolls.
     */
    public void upsertLessonProgress(String userId, String contentId, String contentType,
                                     String status, int percent, String now) {
        jdbc.update("""
                INSERT INTO lesson_progress
                    (user_id, content_id, content_type, status, percent, started_at, completed_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id, content_id) DO UPDATE SET
                    content_type = excluded.content_type,
                    status       = excluded.status,
                    percent      = excluded.percent,
                    completed_at = COALESCE(lesson_progress.completed_at, excluded.completed_at),
                    updated_at   = excluded.updated_at
                """,
                userId, contentId, contentType, status, percent,
                now,
                "completed".equals(status) ? now : null,
                now);
    }

    public int countByStatus(String userId, String contentType, String status) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM lesson_progress
                WHERE user_id = ? AND content_type = ? AND status = ?
                """, Integer.class, userId, contentType, status);
        return count == null ? 0 : count;
    }

    public List<LessonProgress> recent(String userId, int limit) {
        return jdbc.query("""
                SELECT content_id, content_type, status, percent, started_at, completed_at, updated_at
                FROM lesson_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?
                """, LESSON_MAPPER, userId, limit);
    }

    // --------------------------------------------------------------- problems

    public void recordAttempt(String userId, String problemId, String patternId,
                              boolean solved, Integer confidence, String now) {
        jdbc.update("""
                INSERT INTO problem_attempt (user_id, problem_id, pattern_id, solved, confidence, attempted_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, userId, problemId, patternId, solved ? 1 : 0, confidence, now);
    }

    public List<ProblemStat> problemStats(String userId) {
        return jdbc.query("""
                SELECT problem_id,
                       pattern_id,
                       COUNT(*)            AS attempts,
                       MAX(solved)         AS ever_solved,
                       MAX(attempted_at)   AS last_attempt,
                       MAX(confidence)     AS best_confidence
                FROM problem_attempt
                WHERE user_id = ?
                GROUP BY problem_id, pattern_id
                ORDER BY last_attempt DESC
                """, (rs, rowNum) -> new ProblemStat(
                        rs.getString("problem_id"),
                        rs.getString("pattern_id"),
                        rs.getInt("attempts"),
                        rs.getInt("ever_solved") == 1,
                        rs.getString("last_attempt"),
                        rs.getInt("best_confidence")),
                userId);
    }

    public int solvedCount(String userId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT problem_id) FROM problem_attempt WHERE user_id = ? AND solved = 1
                """, Integer.class, userId);
        return count == null ? 0 : count;
    }

    /**
     * Per-pattern success rate, used to surface weak areas on the dashboard.
     * A pattern with attempts but a low solve rate is exactly what the learner should revisit.
     */
    public List<PatternStat> patternStats(String userId) {
        return jdbc.query("""
                SELECT pattern_id,
                       COUNT(*)      AS attempts,
                       SUM(solved)   AS solved
                FROM problem_attempt
                WHERE user_id = ? AND pattern_id IS NOT NULL
                GROUP BY pattern_id
                """, (rs, rowNum) -> new PatternStat(
                        rs.getString("pattern_id"),
                        rs.getInt("attempts"),
                        rs.getInt("solved")),
                userId);
    }

    // ------------------------------------------------------------------ quiz

    public void recordQuizResult(String userId, String contentId, int score, int total,
                                 String detailJson, String now) {
        jdbc.update("""
                INSERT INTO quiz_result (user_id, content_id, score, total, detail, taken_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, userId, contentId, score, total, detailJson, now);
    }

    public List<Map<String, Object>> quizResults(String userId) {
        return jdbc.query("""
                SELECT content_id, MAX(score) AS best_score, MAX(total) AS total,
                       COUNT(*) AS attempts, MAX(taken_at) AS last_taken
                FROM quiz_result WHERE user_id = ?
                GROUP BY content_id
                ORDER BY last_taken DESC
                """, (rs, rowNum) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("contentId", rs.getString("content_id"));
                    row.put("bestScore", rs.getInt("best_score"));
                    row.put("total", rs.getInt("total"));
                    row.put("attempts", rs.getInt("attempts"));
                    row.put("lastTaken", rs.getString("last_taken"));
                    return row;
                }, userId);
    }

    // -------------------------------------------------------------- activity

    public void touchActivity(String userId, LocalDate day) {
        jdbc.update("""
                INSERT INTO activity_day (user_id, day, events) VALUES (?, ?, 1)
                ON CONFLICT (user_id, day) DO UPDATE SET events = activity_day.events + 1
                """, userId, day.toString());
    }

    public List<String> activeDays(String userId) {
        return jdbc.queryForList(
                "SELECT day FROM activity_day WHERE user_id = ? ORDER BY day DESC", String.class, userId);
    }

    // ------------------------------------------------------------------ flags

    public void setFlags(String userId, String contentId, boolean difficult, boolean mastered, String now) {
        jdbc.update("""
                INSERT INTO content_flag (user_id, content_id, difficult, mastered, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (user_id, content_id) DO UPDATE SET
                    difficult = excluded.difficult,
                    mastered  = excluded.mastered,
                    updated_at = excluded.updated_at
                """, userId, contentId, difficult ? 1 : 0, mastered ? 1 : 0, now);
    }

    public Map<String, Map<String, Boolean>> flags(String userId) {
        Map<String, Map<String, Boolean>> result = new LinkedHashMap<>();
        jdbc.query("SELECT content_id, difficult, mastered FROM content_flag WHERE user_id = ?",
                rs -> {
                    Map<String, Boolean> value = new LinkedHashMap<>();
                    value.put("difficult", rs.getInt("difficult") == 1);
                    value.put("mastered", rs.getInt("mastered") == 1);
                    result.put(rs.getString("content_id"), value);
                }, userId);
        return result;
    }

    // ------------------------------------------------------- export / import

    public void deleteAllFor(String userId) {
        for (String table : List.of("lesson_progress", "problem_attempt", "quiz_result",
                "note", "bookmark", "content_flag", "activity_day")) {
            jdbc.update("DELETE FROM " + table + " WHERE user_id = ?", userId);
        }
    }

    public List<Map<String, Object>> rawAttempts(String userId) {
        return new ArrayList<>(jdbc.queryForList("""
                SELECT problem_id, pattern_id, solved, confidence, attempted_at
                FROM problem_attempt WHERE user_id = ? ORDER BY attempted_at
                """, userId));
    }

    // ----------------------------------------------------------------- types

    public record LessonProgress(String contentId, String contentType, String status, int percent,
                                 String startedAt, String completedAt, String updatedAt) { }

    public record ProblemStat(String problemId, String patternId, int attempts, boolean solved,
                              String lastAttempt, int bestConfidence) { }

    public record PatternStat(String patternId, int attempts, int solved) { }
}
