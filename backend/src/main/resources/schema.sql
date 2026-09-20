-- User data for the local-first learning platform.
--
-- Only MUTABLE data lives here. All learning content is version-controlled JSON under
-- content/ and is never written to the database (see docs/DECISIONS.md ADR-001).
--
-- Every statement is IF NOT EXISTS so this file is safe to run on every boot.

CREATE TABLE IF NOT EXISTS app_user (
    id          TEXT PRIMARY KEY,
    display_name TEXT,
    created_at  TEXT NOT NULL
);

-- One row per lesson/concept/case-study the learner has touched.
CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id      TEXT NOT NULL,
    content_id   TEXT NOT NULL,
    content_type TEXT NOT NULL,           -- lesson | concept | case-study
    status       TEXT NOT NULL,           -- not_started | in_progress | completed
    percent      INTEGER NOT NULL DEFAULT 0,
    started_at   TEXT,
    completed_at TEXT,
    updated_at   TEXT NOT NULL,
    PRIMARY KEY (user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user   ON lesson_progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_recent ON lesson_progress (user_id, updated_at DESC);

-- Append-only: keeping every attempt (not just the latest) is what makes
-- "problems you struggled with" and the weak-areas report possible.
CREATE TABLE IF NOT EXISTS problem_attempt (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    problem_id   TEXT NOT NULL,
    solved       INTEGER NOT NULL DEFAULT 0,   -- 0/1
    confidence   INTEGER,                      -- 1..5, self-rated
    pattern_id   TEXT,                         -- denormalised so weak-area queries need no join
    attempted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempt_user    ON problem_attempt (user_id, problem_id);
CREATE INDEX IF NOT EXISTS idx_attempt_pattern ON problem_attempt (user_id, pattern_id);

CREATE TABLE IF NOT EXISTS quiz_result (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    content_id TEXT NOT NULL,
    score      INTEGER NOT NULL,
    total      INTEGER NOT NULL,
    detail     TEXT,                            -- JSON: per-question correctness
    taken_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_result (user_id, content_id);

CREATE TABLE IF NOT EXISTS note (
    user_id    TEXT NOT NULL,
    content_id TEXT NOT NULL,
    body       TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, content_id)
);

CREATE TABLE IF NOT EXISTS bookmark (
    user_id    TEXT NOT NULL,
    content_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, content_id)
);

-- "Mark as difficult" / "mark as mastered" from the lesson page.
CREATE TABLE IF NOT EXISTS content_flag (
    user_id    TEXT NOT NULL,
    content_id TEXT NOT NULL,
    difficult  INTEGER NOT NULL DEFAULT 0,
    mastered   INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, content_id)
);

-- One row per day on which the learner did anything. The streak is derived from this
-- rather than stored, so it can never drift out of sync with reality.
CREATE TABLE IF NOT EXISTS activity_day (
    user_id TEXT NOT NULL,
    day     TEXT NOT NULL,                      -- ISO yyyy-MM-dd
    events  INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, day)
);
