package com.learningplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Where the version-controlled learning content lives.
 *
 * <p>Configurable via {@code content.directory} so the backend can be run from the repo root,
 * from {@code backend/}, or from a Docker image where content is mounted at a fixed path.
 */
@ConfigurationProperties(prefix = "content")
public class ContentProperties {

    /** Candidate locations tried in order when no explicit directory is configured. */
    private static final String[] FALLBACKS = {"content", "../content", "/app/content"};

    private String directory;

    public String getDirectory() {
        return directory;
    }

    public void setDirectory(String directory) {
        this.directory = directory;
    }

    /**
     * Resolves the content directory, trying the configured value first and then the
     * conventional relative locations. Fails loudly rather than silently serving nothing —
     * an empty catalogue is far more confusing than a startup error.
     */
    public Path resolve() {
        if (directory != null && !directory.isBlank()) {
            Path explicit = Paths.get(directory).toAbsolutePath().normalize();
            if (Files.isDirectory(explicit)) {
                return explicit;
            }
            throw new IllegalStateException(
                    "content.directory is set to '" + explicit + "' but that directory does not exist");
        }
        for (String candidate : FALLBACKS) {
            Path path = Paths.get(candidate).toAbsolutePath().normalize();
            if (Files.isDirectory(path)) {
                return path;
            }
        }
        throw new IllegalStateException(
                "Could not locate the content directory. Tried: " + String.join(", ", FALLBACKS)
                        + " relative to " + Paths.get("").toAbsolutePath()
                        + ". Set content.directory in application.yml or the CONTENT_DIRECTORY env var.");
    }
}
