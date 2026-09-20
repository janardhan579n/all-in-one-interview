package com.learningplatform.notes;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Notes and bookmarks. Both are keyed by content id, so any lesson, problem or concept works. */
@Repository
public class NoteRepository {

    private final JdbcTemplate jdbc;

    public NoteRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<String> note(String userId, String contentId) {
        List<String> rows = jdbc.queryForList(
                "SELECT body FROM note WHERE user_id = ? AND content_id = ?",
                String.class, userId, contentId);
        return rows.stream().findFirst();
    }

    public List<Map<String, Object>> allNotes(String userId) {
        return jdbc.query("""
                SELECT content_id, body, updated_at FROM note
                WHERE user_id = ? ORDER BY updated_at DESC
                """, (rs, rowNum) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("contentId", rs.getString("content_id"));
            row.put("body", rs.getString("body"));
            row.put("updatedAt", rs.getString("updated_at"));
            return row;
        }, userId);
    }

    public void saveNote(String userId, String contentId, String body, String now) {
        jdbc.update("""
                INSERT INTO note (user_id, content_id, body, updated_at) VALUES (?, ?, ?, ?)
                ON CONFLICT (user_id, content_id) DO UPDATE SET
                    body = excluded.body, updated_at = excluded.updated_at
                """, userId, contentId, body, now);
    }

    public void deleteNote(String userId, String contentId) {
        jdbc.update("DELETE FROM note WHERE user_id = ? AND content_id = ?", userId, contentId);
    }

    public List<Map<String, Object>> bookmarks(String userId) {
        return jdbc.query("""
                SELECT content_id, created_at FROM bookmark
                WHERE user_id = ? ORDER BY created_at DESC
                """, (rs, rowNum) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("contentId", rs.getString("content_id"));
            row.put("createdAt", rs.getString("created_at"));
            return row;
        }, userId);
    }

    public void addBookmark(String userId, String contentId, String now) {
        jdbc.update("""
                INSERT INTO bookmark (user_id, content_id, created_at) VALUES (?, ?, ?)
                ON CONFLICT (user_id, content_id) DO NOTHING
                """, userId, contentId, now);
    }

    public void removeBookmark(String userId, String contentId) {
        jdbc.update("DELETE FROM bookmark WHERE user_id = ? AND content_id = ?", userId, contentId);
    }
}
