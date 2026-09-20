#!/usr/bin/env python3
"""
Compile everything the extractor produced, and record exactly what failed and why.

One javac per file would be honest and simple, and it is also 221 JVM launches — well over two
minutes for a check that should be quick enough to run every time. So this compiles the whole
set at once, reads the file names out of the error output, drops those, and goes again, until a
pass succeeds. Three invocations instead of two hundred, and the per-file verdict is the same.

A failure here is not automatically a defect in the content. Three causes, and the report keeps
them apart:
  * a brute force that is an **excerpt** — it references a variable declared in prose above the
    snippet. Expected; those blocks were written to be read, not run.
  * a solution that calls an **API the judge provides** (`isBadVersion`). Handled by `Api`.
  * an actual mistake in the solution. This is the one worth finding, and the reason the whole
    exercise exists.
"""

import json
import pathlib
import re
import subprocess
import sys

BUILD = pathlib.Path(__file__).resolve().parent / 'build'
OUT = BUILD / 'out'
ALWAYS = {'Support.java', 'Api.java'}
ERROR_FILE = re.compile(r'^(\S+\.java):(\d+): error: (.*)$', re.M)


def javac(files: list[pathlib.Path]) -> tuple[bool, str]:
    result = subprocess.run(
        ['javac', '-nowarn', '-parameters', '-Xmaxerrs', '5000', '-d', str(OUT), *[str(f) for f in files]],
        capture_output=True,
        text=True,
        cwd=BUILD,
    )
    return result.returncode == 0, result.stderr


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    everything = sorted(BUILD.glob('*.java'))
    candidates = [f for f in everything if f.name not in ALWAYS]
    base = [BUILD / name for name in sorted(ALWAYS)]

    ok, stderr = javac(base)
    if not ok:
        print(stderr, file=sys.stderr)
        print('[compile] the support types themselves do not compile — fix those first', file=sys.stderr)
        return 2

    failures: dict[str, list[str]] = {}
    remaining = list(candidates)
    for _ in range(12):
        ok, stderr = javac(base + remaining)
        if ok:
            break
        broken = {}
        for name, line, message in ERROR_FILE.findall(stderr):
            broken.setdefault(pathlib.Path(name).stem, []).append(f'line {line}: {message}')
        if not broken:
            print(stderr, file=sys.stderr)
            print('[compile] javac failed without naming a file — stopping', file=sys.stderr)
            return 2
        for stem, messages in broken.items():
            failures.setdefault(stem, messages[:3])
        remaining = [f for f in remaining if f.stem not in failures]
    else:
        print('[compile] did not converge', file=sys.stderr)
        return 2

    compiled = sorted(f.stem for f in remaining)
    (BUILD / 'compile-report.json').write_text(
        json.dumps({'compiled': compiled, 'failed': failures}, indent=2)
    )

    manifest = json.loads((BUILD / 'manifest.json').read_text())
    opt_total = sum(1 for e in manifest if e['optimized']['class'])
    opt_ok = sum(1 for e in manifest if e['optimized']['class'] in compiled)
    brute_total = sum(1 for e in manifest if e['bruteForce']['class'])
    brute_ok = sum(1 for e in manifest if e['bruteForce']['class'] in compiled)

    print(f'[compile] optimised: {opt_ok}/{opt_total} compile · brute force: {brute_ok}/{brute_total} compile')
    broken_solutions = [
        e['id'] for e in manifest
        if e['optimized']['class'] and e['optimized']['class'] not in compiled
    ]
    if broken_solutions:
        print('[compile] SOLUTIONS THAT DO NOT COMPILE:')
        for pid in broken_solutions:
            stem = next(e['optimized']['class'] for e in manifest if e['id'] == pid)
            print(f'  ✗ {pid}: {failures.get(stem, ["?"])[0]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
