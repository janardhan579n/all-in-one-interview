package com.learningplatform.notes;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.learningplatform.content.ContentStore;
import com.learningplatform.user.LocalUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Personal notes and bookmarks, attachable to any content item. */
@RestController
@RequestMapping("/api")
public class NotesController {

    private final NoteRepository repository;
    private final ContentStore content;
    private final LocalUserService users;

    public NotesController(NoteRepository repository, ContentStore content, LocalUserService users) {
        this.repository = repository;
        this.content = content;
        this.users = users;
    }

    @GetMapping("/notes")
    public List<Map<String, Object>> notes() {
        return decorate(repository.allNotes(users.currentUserId()));
    }

    @GetMapping("/notes/{contentId}")
    public Map<String, Object> note(@PathVariable String contentId) {
        String body = repository.note(users.currentUserId(), contentId).orElse("");
        return Map.of("contentId", contentId, "body", body);
    }

    @PutMapping("/notes/{contentId}")
    public ResponseEntity<Void> saveNote(@PathVariable String contentId,
                                         @RequestBody Map<String, String> payload) {
        String body = payload.getOrDefault("body", "");
        if (body.isBlank()) {
            repository.deleteNote(users.currentUserId(), contentId);
        } else {
            repository.saveNote(users.currentUserId(), contentId, body, Instant.now().toString());
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/notes/{contentId}")
    public ResponseEntity<Void> deleteNote(@PathVariable String contentId) {
        repository.deleteNote(users.currentUserId(), contentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookmarks")
    public List<Map<String, Object>> bookmarks() {
        return decorate(repository.bookmarks(users.currentUserId()));
    }

    @PostMapping("/bookmarks/{contentId}")
    public ResponseEntity<Void> addBookmark(@PathVariable String contentId) {
        repository.addBookmark(users.currentUserId(), contentId, Instant.now().toString());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bookmarks/{contentId}")
    public ResponseEntity<Void> removeBookmark(@PathVariable String contentId) {
        repository.removeBookmark(users.currentUserId(), contentId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Joins stored rows against the content catalogue so the client can render a title without
     * a second round trip per item. Rows whose content no longer exists (a lesson renamed
     * since the note was written) keep their id and are marked, rather than silently vanishing.
     */
    private List<Map<String, Object>> decorate(List<Map<String, Object>> rows) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            String contentId = String.valueOf(row.get("contentId"));
            Map<String, Object> entry = new LinkedHashMap<>(row);
            ObjectNode document = content.anyById(contentId).orElse(null);
            entry.put("title", document != null ? document.path("title").asText() : contentId);
            entry.put("contentType", content.typeById().getOrDefault(contentId, "unknown"));
            entry.put("missing", document == null);
            result.add(entry);
        }
        return result;
    }
}
