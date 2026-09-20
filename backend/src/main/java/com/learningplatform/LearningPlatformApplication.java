package com.learningplatform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the local-first learning platform backend.
 *
 * <p>Two distinct kinds of data live here, and keeping them separate is the main
 * architectural idea (see docs/ARCHITECTURE.md):
 *
 * <ul>
 *   <li><b>Content</b> — lessons, problems, concepts, case studies. Read-only, authored as
 *       JSON files under {@code content/}, loaded once at boot into immutable maps.</li>
 *   <li><b>User data</b> — progress, notes, bookmarks, quiz results. Mutable, stored in
 *       a single SQLite file so the whole application runs with no external services.</li>
 * </ul>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class LearningPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(LearningPlatformApplication.class, args);
    }
}
