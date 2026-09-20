package com.learningplatform.progress;

import com.learningplatform.notes.NoteRepository;
import com.learningplatform.user.LocalUserService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Progress tracking, dashboard aggregates, and progress.json export/import. */
@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    private static final String EXPORT_VERSION = "1";

    private final ProgressService progress;
    private final ProgressRepository repository;
    private final NoteRepository notes;
    private final LocalUserService users;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;

    public ProgressController(ProgressService progress, ProgressRepository repository,
                              NoteRepository notes, LocalUserService users,
                              com.fasterxml.jackson.databind.ObjectMapper mapper) {
        this.progress = progress;
        this.repository = repository;
        this.notes = notes;
        this.users = users;
        this.mapper = mapper;
    }

    @GetMapping
    public Map<String, Object> snapshot() {
        return progress.snapshot();
    }

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        return progress.summary();
    }

    @GetMapping("/weak-areas")
    public List<Map<String, Object>> weakAreas() {
        return progress.weakAreas();
    }

    /** Body: {@code { "status": "completed", "percent": 100 }} */
    @PutMapping("/lessons/{contentId}")
    public ResponseEntity<Void> updateLesson(@PathVariable String contentId,
                                             @RequestBody Map<String, Object> body) {
        String status = String.valueOf(body.getOrDefault("status", "in_progress"));
        if (!List.of("not_started", "in_progress", "completed").contains(status)) {
            throw new IllegalArgumentException(
                    "status must be one of not_started, in_progress, completed (got '" + status + "')");
        }
        Integer percent = body.get("percent") instanceof Number number ? number.intValue() : null;
        progress.updateLesson(contentId, status, percent);
        return ResponseEntity.noContent().build();
    }

    /** Body: {@code { "solved": true, "confidence": 4 }} */
    @PostMapping("/problems/{problemId}/attempt")
    public ResponseEntity<Void> recordAttempt(@PathVariable String problemId,
                                              @RequestBody Map<String, Object> body) {
        boolean solved = Boolean.TRUE.equals(body.get("solved"));
        Integer confidence = body.get("confidence") instanceof Number number ? number.intValue() : null;
        if (confidence != null && (confidence < 1 || confidence > 5)) {
            throw new IllegalArgumentException("confidence must be between 1 and 5");
        }
        progress.recordAttempt(problemId, solved, confidence);
        return ResponseEntity.noContent().build();
    }

    /** Body: {@code { "difficult": true, "mastered": false }} */
    @PutMapping("/flags/{contentId}")
    public ResponseEntity<Void> setFlags(@PathVariable String contentId,
                                         @RequestBody Map<String, Object> body) {
        progress.setFlags(contentId,
                Boolean.TRUE.equals(body.get("difficult")),
                Boolean.TRUE.equals(body.get("mastered")));
        return ResponseEntity.noContent().build();
    }

    // --------------------------------------------------------- export / import

    /**
     * Downloads everything the learner has accumulated as a single JSON file.
     *
     * <p>This is the local-first escape hatch: the data belongs to the user, lives in a file
     * they can copy, and can be restored on another machine. No account required.
     */
    @GetMapping("/export")
    public ResponseEntity<Resource> export() throws Exception {
        String userId = users.currentUserId();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("version", EXPORT_VERSION);
        payload.put("exportedAt", Instant.now().toString());
        payload.put("lessons", repository.allLessonProgress(userId));
        payload.put("attempts", repository.rawAttempts(userId));
        payload.put("quizzes", repository.quizResults(userId));
        payload.put("notes", notes.allNotes(userId));
        payload.put("bookmarks", notes.bookmarks(userId));
        payload.put("flags", repository.flags(userId));
        payload.put("activeDays", repository.activeDays(userId));

        byte[] json = mapper.writerWithDefaultPrettyPrinter()
                .writeValueAsString(payload).getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"progress.json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new ByteArrayResource(json));
    }

    /**
     * Restores from a previously exported file. This REPLACES existing progress rather than
     * merging, which is the behaviour people expect from "restore a backup" — and merging two
     * histories would need conflict rules nobody wants to reason about.
     */
    @PostMapping("/import")
    public Map<String, Object> importProgress(@RequestBody Map<String, Object> payload) {
        String version = String.valueOf(payload.getOrDefault("version", ""));
        if (!EXPORT_VERSION.equals(version)) {
            throw new IllegalArgumentException(
                    "Unsupported export version '" + version + "'. This build reads version " + EXPORT_VERSION + ".");
        }
        String userId = users.currentUserId();
        String now = Instant.now().toString();

        repository.deleteAllFor(userId);

        int lessons = 0;
        for (Map<String, Object> row : asList(payload.get("lessons"))) {
            repository.upsertLessonProgress(userId,
                    str(row.get("contentId")), str(row.getOrDefault("contentType", "lesson")),
                    str(row.getOrDefault("status", "in_progress")),
                    row.get("percent") instanceof Number n ? n.intValue() : 0,
                    str(row.getOrDefault("updatedAt", now)));
            lessons++;
        }

        int attempts = 0;
        for (Map<String, Object> row : asList(payload.get("attempts"))) {
            repository.recordAttempt(userId,
                    str(row.get("problem_id")), str(row.get("pattern_id")),
                    row.get("solved") instanceof Number n && n.intValue() == 1,
                    row.get("confidence") instanceof Number c ? c.intValue() : null,
                    str(row.getOrDefault("attempted_at", now)));
            attempts++;
        }

        int noteCount = 0;
        for (Map<String, Object> row : asList(payload.get("notes"))) {
            notes.saveNote(userId, str(row.get("contentId")), str(row.get("body")),
                    str(row.getOrDefault("updatedAt", now)));
            noteCount++;
        }

        int bookmarkCount = 0;
        for (Map<String, Object> row : asList(payload.get("bookmarks"))) {
            notes.addBookmark(userId, str(row.get("contentId")), str(row.getOrDefault("createdAt", now)));
            bookmarkCount++;
        }

        for (Object day : asRawList(payload.get("activeDays"))) {
            repository.touchActivity(userId, LocalDate.parse(String.valueOf(day)));
        }

        return Map.of("imported", Map.of(
                "lessons", lessons,
                "attempts", attempts,
                "notes", noteCount,
                "bookmarks", bookmarkCount));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> asList(Object value) {
        return value instanceof List<?> list ? (List<Map<String, Object>>) list : List.of();
    }

    private List<?> asRawList(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }

    private String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
