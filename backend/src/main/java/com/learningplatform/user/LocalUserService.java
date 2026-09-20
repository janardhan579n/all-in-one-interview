package com.learningplatform.user;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Identity for a local-first, single-user application.
 *
 * <p>There is deliberately no authentication provider: the brief requires the platform to run
 * offline with no external services, and a learner on their own laptop has nobody to
 * authenticate against. Every row is therefore owned by the fixed user {@code local}.
 *
 * <p>The user id is still threaded through every table rather than omitted, so that adding real
 * accounts later is a change to this class and a login screen — not a schema migration of
 * every table.
 */
@Service
@DependsOnDatabaseInitialization
public class LocalUserService {

    public static final String LOCAL_USER_ID = "local";

    private final JdbcTemplate jdbc;

    public LocalUserService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Creates the single local user on first boot.
     *
     * <p>{@code @DependsOnDatabaseInitialization} on the class is load-bearing: without it Spring
     * is free to construct this bean before {@code schema.sql} has run, and this method then fails
     * with "no such table: app_user". The annotation adds the depends-on edge to Boot's SQL
     * initialiser rather than relying on bean-creation order, which is not a guarantee.
     */
    @PostConstruct
    public void ensureLocalUser() {
        Integer existing = jdbc.queryForObject(
                "SELECT COUNT(*) FROM app_user WHERE id = ?", Integer.class, LOCAL_USER_ID);
        if (existing == null || existing == 0) {
            jdbc.update("INSERT INTO app_user (id, display_name, created_at) VALUES (?, ?, ?)",
                    LOCAL_USER_ID, "Local learner", Instant.now().toString());
        }
    }

    /** The current user. A future multi-user build would resolve this from the request. */
    public String currentUserId() {
        return LOCAL_USER_ID;
    }
}
