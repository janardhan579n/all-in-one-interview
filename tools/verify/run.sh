#!/usr/bin/env bash
#
# Verify the problem bank's solutions.
#
#   ./tools/verify/run.sh
#
# Four stages, each of which can fail on its own:
#   1. extract   every solution and brute force into compilable Java
#   2. domains   read each problem's stated constraints into an input domain
#   3. compile   javac the lot, and report exactly what did not compile
#   4. examples  replay each solution against the worked examples printed on its own page
#   5. differential  run each solution against its own brute force on random legal inputs
#
# Exits non-zero if any solution fails to compile or disagrees with its brute force.
#
# `build/` is generated and disposable — the harness's own source lives in `src/`, which is a
# separation learned the hard way: the extractor clears `build/` before each run, and when the
# runner lived there it deleted itself.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
build="$here/build"
out="$build/out"

python3 "$here/extract.py"
python3 "$here/domains.py"
python3 "$here/compile.py"

# The harness compiles against the extracted solutions, so it goes in after them.
javac -nowarn -parameters -cp "$out" -d "$out" "$here"/src/*.java

# Example replay first: it covers nearly every problem, so it is the broader net.
java -cp "$out" verify.Examples "$build"
java -cp "$out" verify.Runner "$build"
