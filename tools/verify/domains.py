#!/usr/bin/env python3
"""
Read each problem's stated constraints and turn them into an input domain the runner can honour.

This is the difference between a harness that produces evidence and one that produces noise.

The first run of the differential test reported fourteen disagreements. Not one of them was a
defect in a solution. They were inputs the problem forbids: negative prices fed to a
buy-and-sell problem constrained to `0 <= prices[i]`, an empty array given to one that says
`1 <= nums.length`, values outside `{0,1,2}` handed to sort-colors, an array of random integers
where `single-number` guarantees every element appears exactly twice but one. An implementation
is under no obligation to behave sensibly outside its stated domain, so a disagreement there
says nothing about whether the solution is right — and a report full of such findings trains the
reader to ignore it, which is worse than having no report.

So the generator is told what the problem actually promises. Where a constraint is not
parseable, the domain is left open and the report says which problems were tested under a
guessed domain rather than a stated one.

Nothing here weakens the test: narrowing inputs to the legal domain removes false alarms, and
a real defect inside the legal domain is exactly what remains visible.
"""

import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROBLEMS = ROOT / 'content' / 'dsa' / 'problems'
BUILD = pathlib.Path(__file__).resolve().parent / 'build'


def number(token: str) -> int | None:
    """`10^4`, `-10^9`, `300`, `2 * 10^4` -> an int."""
    token = token.strip()
    match = re.fullmatch(r'(-?)(\d+)\s*\*\s*10\^(\d+)', token)
    if match:
        value = int(match.group(2)) * 10 ** int(match.group(3))
        return -value if match.group(1) else value
    match = re.fullmatch(r'(-?)10\^(\d+)', token)
    if match:
        value = 10 ** int(match.group(2))
        return -value if match.group(1) else value
    match = re.fullmatch(r'-?\d+', token)
    return int(match.group(0)) if match else None


# `1 <= nums.length <= 10^4`
LENGTH_RANGE = re.compile(r'(-?[\d^*\s]+)\s*<=\s*\w+\.(?:length|size\(\))\s*<=\s*([\d^*\s]+)')
LENGTH_MIN = re.compile(r'(-?[\d^*\s]+)\s*<=\s*\w+\.(?:length|size\(\))')
# `-10^9 <= nums[i] <= 10^9`, possibly with more than one name on the left of the comparison
VALUE_RANGE = re.compile(r'(-?[\d^*\s]+)\s*<=\s*[\w.]+\[\w+\](?:\[\w+\])?[\w\s,\[\]]*<=\s*(-?[\d^*\s]+)')
# `nums[i] is 0, 1 or 2`
ENUMERATED = re.compile(r'\[\w+\](?:\[\w+\])?\s+is\s+((?:-?\d+\s*(?:,|or|and)?\s*)+)$')


def domain_for(constraints: list[str]) -> dict:
    domain: dict[str, object] = {}
    for line in constraints:
        text = line.strip().rstrip('.')

        match = ENUMERATED.search(text)
        if match:
            values = [int(v) for v in re.findall(r'-?\d+', match.group(1))]
            if values:
                domain['values'] = sorted(set(values))
                continue

        match = VALUE_RANGE.search(text)
        if match:
            low, high = number(match.group(1)), number(match.group(2))
            if low is not None and high is not None and low <= high:
                domain.setdefault('valueMin', low)
                domain.setdefault('valueMax', high)
                continue

        match = LENGTH_RANGE.search(text)
        if match:
            low, high = number(match.group(1)), number(match.group(2))
            if low is not None:
                domain.setdefault('lengthMin', low)
            if high is not None:
                domain.setdefault('lengthMax', high)
            continue

        match = LENGTH_MIN.search(text)
        if match:
            low = number(match.group(1))
            if low is not None:
                domain.setdefault('lengthMin', low)
    return domain


def main() -> int:
    domains = {}
    stated = 0
    for path in sorted(PROBLEMS.glob('*.json')):
        data = json.loads(path.read_text())
        domain = domain_for(data.get('constraints') or [])
        # A problem that says nothing about its values is tested over a small non-negative range,
        # which is the common case across this bank, and the report marks it as a guessed domain.
        domain['stated'] = bool(domain)
        if domain['stated']:
            stated += 1
        domains[data['id']] = domain

    BUILD.mkdir(parents=True, exist_ok=True)
    (BUILD / 'domains.json').write_text(json.dumps(domains, indent=2, sort_keys=True))
    print(f'[domains] {stated}/{len(domains)} problems state a parseable input domain')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
