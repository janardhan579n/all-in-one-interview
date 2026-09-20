#!/usr/bin/env bash
#
# One command to run the platform locally.
#
#   ./start.sh              frontend + backend if Java 17 and Maven are present,
#                           frontend alone otherwise (the app works either way)
#   ./start.sh --frontend   frontend only, skip the backend entirely
#   ./start.sh --backend    backend only
#   ./start.sh --build      production build, served as static files
#
# Everything runs on your machine. Nothing is uploaded anywhere, and after the first
# `npm install` (and Maven's first dependency download) it needs no network at all.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_PORT="${BACKEND_PORT:-8080}"
MODE="auto"

for arg in "$@"; do
  case "$arg" in
    --frontend) MODE="frontend" ;;
    --backend)  MODE="backend" ;;
    --build)    MODE="build" ;;
    -h|--help)  sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

bold()  { printf '\033[1m%s\033[0m\n' "$*"; }
warn()  { printf '\033[33m!  %s\033[0m\n' "$*"; }
info()  { printf '   %s\n' "$*"; }
die()   { printf '\033[31mx  %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- prerequisites

command -v node >/dev/null 2>&1 || die "Node.js is required. Install Node 18 or newer from https://nodejs.org and re-run."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Node 18+ is required (found $(node -v))."

# The backend is optional by design: the frontend ships the whole content library and
# stores progress in localStorage when no API answers. Detect rather than demand.
HAVE_BACKEND=0
if command -v mvn >/dev/null 2>&1 && command -v java >/dev/null 2>&1; then
  JAVA_MAJOR="$(java -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/')"
  if [ "${JAVA_MAJOR:-0}" -ge 17 ] 2>/dev/null; then
    HAVE_BACKEND=1
  else
    warn "Java 17+ is required for the backend (found Java ${JAVA_MAJOR:-unknown}); running frontend-only."
  fi
elif [ "$MODE" = "backend" ]; then
  die "The backend needs Java 17+ and Maven on PATH."
fi

port_busy() { (command -v lsof >/dev/null && lsof -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1); }

# --------------------------------------------------------------------- backend

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

start_backend() {
  if port_busy "$BACKEND_PORT"; then
    warn "Port $BACKEND_PORT is already in use — assuming a backend is already running there."
    return
  fi
  bold "Starting the API on http://localhost:$BACKEND_PORT"
  info "First run downloads Maven dependencies; later runs start in a few seconds."
  ( cd "$ROOT/backend" && mvn -q spring-boot:run ) &
  PIDS+=($!)
}

# -------------------------------------------------------------------- frontend

install_frontend() {
  if [ ! -d "$ROOT/frontend/node_modules" ]; then
    bold "Installing frontend dependencies (once)"
    ( cd "$ROOT/frontend" && npm install )
  fi
}

start_frontend_dev() {
  port_busy "$FRONTEND_PORT" && die "Port $FRONTEND_PORT is in use. Set FRONTEND_PORT=5174 ./start.sh"
  bold "Starting the app on http://localhost:$FRONTEND_PORT"
  ( cd "$ROOT/frontend" && npm run dev -- --port "$FRONTEND_PORT" ) &
  PIDS+=($!)
}

build_and_serve() {
  bold "Building the production bundle"
  ( cd "$ROOT/frontend" && npm run build )
  bold "Serving the build on http://localhost:$FRONTEND_PORT"
  info "This is a static preview server; close it with Ctrl-C."
  ( cd "$ROOT/frontend" && npm run preview -- --port "$FRONTEND_PORT" --host ) &
  PIDS+=($!)
}

# ------------------------------------------------------------------------ main

echo
bold "DSA & System Design — local learning platform"
echo

case "$MODE" in
  backend)
    start_backend
    ;;
  frontend)
    install_frontend
    start_frontend_dev
    ;;
  build)
    install_frontend
    [ "$HAVE_BACKEND" = "1" ] && start_backend
    build_and_serve
    ;;
  auto)
    install_frontend
    if [ "$HAVE_BACKEND" = "1" ]; then
      start_backend
    else
      warn "Java 17 / Maven not found — running without the backend."
      info "The app still works: all lessons are bundled and progress is saved in your browser."
    fi
    start_frontend_dev
    ;;
esac

echo
info "Press Ctrl-C to stop."
wait
