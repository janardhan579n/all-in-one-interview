#!/usr/bin/env bash
#
# End-to-end smoke test against a RUNNING backend.
#
#   ./scripts/smoke-api.sh                      # against http://localhost:8080
#   BASE=http://192.168.1.5:8080 ./scripts/smoke-api.sh
#
# `mvn test` proves the units work in isolation. This proves the assembled application answers
# real HTTP the way the frontend expects — including the things unit tests cannot see: that
# quiz answers never leave the server, that a write is still there after a read, and that an
# exported progress file can be imported back.
#
# It writes real rows into the running database. Point it at a throwaway instance if you care:
#   APP_DATASOURCE_FILE=/tmp/smoke.db mvn spring-boot:run

set -uo pipefail

BASE="${BASE:-http://localhost:8080}"
PASS=0
FAIL=0

green() { printf '\033[32m✓\033[0m %s\n' "$1"; }
red()   { printf '\033[31m✗\033[0m %s\n   %s\n' "$1" "$2"; }

# check <name> <curl-args...> -- <jq-filter> <expected>
check() {
  local name="$1"; shift
  local filter="$1"; shift
  local expected="$1"; shift
  local actual
  actual="$(curl -fsS "$@" 2>/dev/null | jq -r "$filter" 2>/dev/null)"
  if [ "$actual" = "$expected" ]; then
    green "$name"
    PASS=$((PASS + 1))
  else
    red "$name" "expected '$expected', got '${actual:-<no response>}'"
    FAIL=$((FAIL + 1))
  fi
}

# check_true <name> <jq boolean filter> <curl-args...>
check_true() {
  local name="$1"; shift
  local filter="$1"; shift
  check "$name" "$filter" "true" "$@"
}

# check_status <name> <expected-code> <url>
check_status() {
  local name="$1" expected="$2" url="$3" actual
  actual="$(curl -s -o /dev/null -w '%{http_code}' "$url")"
  if [ "$actual" = "$expected" ]; then
    green "$name"
    PASS=$((PASS + 1))
  else
    red "$name" "expected HTTP $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

# check_json_file <name> <jq filter> <file>
check_json_file() {
  local name="$1" filter="$2" file="$3" actual
  actual="$(jq -r "$filter" "$file" 2>/dev/null)"
  if [ "$actual" = "true" ]; then
    green "$name"
    PASS=$((PASS + 1))
  else
    red "$name" "expected true, got '${actual:-<unparseable>}'"
    FAIL=$((FAIL + 1))
  fi
}

command -v jq >/dev/null || { echo "jq is required: brew install jq"; exit 1; }

echo
echo "Smoke-testing $BASE"
echo

# --- the service is up and serving content, not just an empty shell ------------
check      "health reports UP"                '.status'                'UP'   "$BASE/api/health"
check_true "content library is loaded"        '.lessons >= 16'                "$BASE/api/meta/stats"
check_true "problems are loaded"              '.problems >= 30'               "$BASE/api/meta/stats"
check_true "case studies are loaded"          '.caseStudies >= 4'             "$BASE/api/meta/stats"

# --- content endpoints the pages actually call --------------------------------
check      "lesson by id"                     '.title'  'Sliding Window'      "$BASE/api/dsa/lessons/sliding-window"
check_true "lesson carries the brute-force journey" '.problemFirst.bruteForce.whySlow | length > 0' \
                                                                              "$BASE/api/dsa/lessons/sliding-window"
check_true "lesson names a visualisation engine"    '.visualizations[0].engine | length > 0' \
                                                                              "$BASE/api/dsa/lessons/sliding-window"
check_true "problems group pattern → difficulty"    '[.[] | select(.patternId=="sliding-window")] | length == 1' \
                                                                              "$BASE/api/problems/by-pattern"
check_true "case study has evolution stages"        '.evolution | length >= 2' \
                                                                              "$BASE/api/system-design/case-studies/url-shortener"
check      "decision tree resolves"           '.start | length > 0' 'true'    "$BASE/api/decision-trees/two-pointers"
check_status "unknown id is a clean 404"      404                             "$BASE/api/dsa/lessons/no-such-lesson"

# --- search: the ranking bug that only integration testing caught -------------
check      "search ranks the lesson first"    '.[0].id'   'sliding-window'    "$BASE/api/search?q=sliding%20window"
check_true "search AND-semantics reject noise" 'length == 0'                  "$BASE/api/search?q=zzzznotathing"

# --- quiz answers must never reach the client ---------------------------------
check_true "quiz questions omit the answer"   'all(.[]; has("answerIndex") | not)' \
                                                                              "$BASE/api/quiz/sliding-window"
check_true "quiz evaluation explains itself"  '.results[0].explanation | length > 0' \
           -X POST -H 'Content-Type: application/json' -d '{"answers":{"q1":1}}' \
                                                                              "$BASE/api/quiz/sliding-window/evaluate"

# --- writes persist and read back ---------------------------------------------
curl -fsS -X PUT -H 'Content-Type: application/json' \
     -d '{"status":"completed","percent":100}' "$BASE/api/progress/lessons/binary-search" >/dev/null
check      "lesson progress persists"         '.lessons["binary-search"].status' 'completed' \
                                                                              "$BASE/api/progress"

curl -fsS -X POST -H 'Content-Type: application/json' \
     -d '{"solved":true,"confidence":4}' "$BASE/api/progress/problems/two-sum/attempt" >/dev/null
check_true "problem attempt is recorded"      '.problems["two-sum"].solved'    "$BASE/api/progress"

curl -fsS -X PUT -H 'Content-Type: application/json' \
     -d '{"body":"low + (high - low) / 2"}' "$BASE/api/notes/binary-search" >/dev/null
check_true "note round-trips"                 '[.[] | select(.contentId=="binary-search")] | length == 1' \
                                                                              "$BASE/api/notes"

curl -fsS -X POST "$BASE/api/bookmarks/cache" >/dev/null
check_true "bookmark round-trips"             '[.[] | select(.contentId=="cache")] | length == 1' \
                                                                              "$BASE/api/bookmarks"

# --- export / import, the bridge between online and offline modes -------------
EXPORT="$(mktemp)"
curl -fsS "$BASE/api/progress/export" -o "$EXPORT"
check_json_file "export contains the completed lesson" '.lessons | length > 0' "$EXPORT"

# The import endpoint's exact envelope is not the point; that it accepts its own export is.
if curl -fsS -X POST -H 'Content-Type: application/json' --data-binary "@$EXPORT" \
        "$BASE/api/progress/import" >/dev/null 2>&1; then
  green "export re-imports cleanly"; PASS=$((PASS + 1))
else
  red "export re-imports cleanly" "the import endpoint rejected its own export"; FAIL=$((FAIL + 1))
fi
rm -f "$EXPORT"

# --- interview preparation ----------------------------------------------------
check_true "interview tracks carry counts"    'length >= 4 and (.[0].questionCount > 0)' \
                                                                              "$BASE/api/interview/tracks"
check      "track topics keep curriculum order" '.topics[0].id' 'core-language' \
                                                                              "$BASE/api/interview/tracks/java"
check_true "a question set has model answers" '.questions[0].keyPoints | length > 0' \
                                                                              "$BASE/api/interview/sets/java-concurrency"
check_true "question filters compose"         'all(.[]; .trackId == "sql" and .level == "senior") and length > 0' \
                                                                              "$BASE/api/interview/questions?track=sql&level=senior"
check_true "a seeded drill returns the asked-for count" 'length == 5' \
                                                                              "$BASE/api/interview/drill?track=java&count=5&seed=42"
check      "cross-references resolve to a type" '.type' 'question-set'        "$BASE/api/meta/type/java-concurrency"
check_status "an unknown track is a clean 404" 404                            "$BASE/api/interview/tracks/no-such-track"

# --- recommendation and readiness react to the writes above -------------------
check_true "next-up recommends something"     '.lessonId | length > 0'         "$BASE/api/learning/next"
check_true "readiness has a band"             '.band | length > 0'             "$BASE/api/learning/readiness"
check_true "path steps merge progress"        '[.steps[] | select(.status=="completed")] | length >= 1' \
                                                                              "$BASE/api/learning/paths/java-dsa-beginner"

echo
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
