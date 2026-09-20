package com.learningplatform.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * SQLite persistence for user data. See docs/DECISIONS.md ADR-002 and ADR-003.
 *
 * <p>The pool is deliberately capped at a single connection: SQLite serialises writers anyway,
 * and a single connection avoids {@code SQLITE_BUSY} entirely for a local single-user app.
 * The database file is created on first boot, together with its parent directory.
 */
@Configuration
@ConditionalOnProperty(name = "app.datasource.mode", havingValue = "sqlite", matchIfMissing = true)
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    public DataSource dataSource(Environment environment) {
        String file = environment.getProperty("app.datasource.file", "data/learning.db");
        Path dbPath = Paths.get(file).toAbsolutePath().normalize();

        try {
            Path parent = dbPath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create the database directory for " + dbPath, e);
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:sqlite:" + dbPath);
        config.setDriverClassName("org.sqlite.JDBC");
        config.setMaximumPoolSize(1);
        config.setPoolName("sqlite-pool");
        // Wait rather than fail if another statement holds the write lock.
        config.addDataSourceProperty("busy_timeout", "5000");

        HikariDataSource dataSource = new HikariDataSource(config);

        // Create the schema HERE, before this bean is published, rather than leaving it to
        // Spring Boot's `spring.sql.init` machinery.
        //
        // Two things make that machinery the wrong owner for SQLite. First, its default mode is
        // `embedded`, and Boot does not classify SQLite as embedded — so unless every profile
        // remembers to set `mode: always`, the scripts are silently skipped and the first query
        // fails with "no such table". Second, script initialisation runs as a separate bean, so
        // anything touching the database during startup needs an explicit ordering edge to it.
        //
        // Creating the schema inside the factory method removes both problems: no consumer can
        // obtain this DataSource before the tables exist. schema.sql is idempotent, so running it
        // on every boot costs nothing.
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource("schema.sql"));
        populator.setContinueOnError(false);
        populator.execute(dataSource);

        log.info("User data will be stored in {}", dbPath);
        return dataSource;
    }
}
