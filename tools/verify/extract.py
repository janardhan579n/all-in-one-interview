#!/usr/bin/env python3
"""
Extract every solution in the problem bank into compilable Java, then let javac and a
differential runner have an opinion about it.

Why this exists — read this before trusting anything the report says.

The problem bank was written by an AI, and its authors checked each solution against examples
they had themselves written. That is self-consistency, not correctness: a wrong solution paired
with a wrong expected output agrees with itself perfectly. This harness exists to replace as
much of that as possible with something external:

  * **Compilation** — javac has no idea what the author intended. A block that compiles is
    syntactically valid Java with consistent types and real library calls. Across 165 solutions
    this is the broadest check available and nobody had ever run it.
  * **Differential testing** — where a problem carries a runnable brute force, the two
    implementations are independent programs for the same specification. Running both over
    thousands of random inputs and demanding identical answers is a genuine correctness
    argument: for them to agree and both be wrong, the same mistake has to appear twice, in two
    different algorithms.
  * **Example replay** — weakest of the three, and only catches transcription slips, but it is
    what is available for problems with no runnable brute force.

Nothing here can prove a solution matches *LeetCode's* hidden tests, because the problem
statements in this library are the author's reconstruction. `docs/VERIFICATION.md` says so.

The output is deliberately boring: one file per solution under `build/`, so a failure is a real
compiler error at a real line you can open, not a stack trace from a clever harness.
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROBLEMS = ROOT / 'content' / 'dsa' / 'problems'
BUILD = pathlib.Path(__file__).resolve().parent / 'build'

# Imports every extracted unit gets. Solutions are written as if inside a normal file with the
# usual imports in place, which is how they are meant to be read on the page.
PREAMBLE = 'import java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\n'

# Support types the solutions assume exist, exactly as an interview would assume them.
SUPPORT = '''package verify;

import java.util.*;

/** The node types LeetCode-style problems take as given. */
public final class Support {
    public static class TreeNode {
        public int val;
        public TreeNode left;
        public TreeNode right;
        public TreeNode() {}
        public TreeNode(int val) { this.val = val; }
        public TreeNode(int val, TreeNode left, TreeNode right) {
            this.val = val; this.left = left; this.right = right;
        }
    }

    public static class ListNode {
        public int val;
        public ListNode next;
        public ListNode() {}
        public ListNode(int val) { this.val = val; }
        public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
    }

    /**
     * `Node` carries both a `next` and a `neighbors`, because the problem bank uses the bare name
     * for two different things: the linked-list problems write `Node` where LeetCode writes
     * `ListNode`, and clone-graph writes `Node` for a graph vertex. Giving the harness one type
     * with both fields lets each compile against the name it actually uses, without editing a
     * single line of the content to suit the test rig. Nothing in a solution touches the field
     * it does not need.
     */
    public static class Node {
        public int val;
        public Node next;
        public List<Node> neighbors;
        public Node() { this.neighbors = new ArrayList<>(); }
        public Node(int val) { this.val = val; this.neighbors = new ArrayList<>(); }
        public Node(int val, Node next) { this.val = val; this.next = next; this.neighbors = new ArrayList<>(); }
        public Node(int val, ArrayList<Node> neighbors) { this.val = val; this.neighbors = neighbors; }
    }

    private Support() {}
}
'''

# Some problems are stated in terms of an API the judge provides rather than data you are given.
# first-bad-version is the clearest case: the solution calls `isBadVersion(int)`, which is
# correct for the problem and undefined anywhere in this repository. Every extracted method
# holder extends this class so those calls resolve, and the pivot is settable so the
# differential runner can actually exercise the search rather than skipping the problem.
API = '''package verify;

/** APIs the problem statements assume the judge provides. */
public class Api {
    /** first-bad-version: versions from `firstBad` onwards are bad. */
    public static int firstBad = 1;

    public static boolean isBadVersion(int version) {
        return version >= firstBad;
    }
}
'''

CLASS_RE = re.compile(r'^\s*(?:public\s+|final\s+|abstract\s+)*class\s+(\w+)', re.M)
METHOD_RE = re.compile(
    r'^\s{0,4}(?:public\s+|private\s+|protected\s+|static\s+|final\s+)*'
    r'(?:[\w<>\[\],.\s?]+?)\s+(\w+)\s*\([^;{]*\)\s*\{',
    re.M,
)

# `for (int i = 0; i < n; i++) {` matches the shape of a method declaration closely enough to
# fool the pattern above — a type, a name, a parenthesised list, a brace. Without this guard a
# bare loop is classified as a method, wrapped in a class, and produces a page of compiler
# errors that look like defects in the content but are defects in this file.
NOT_A_METHOD_NAME = {
    'for', 'while', 'if', 'else', 'switch', 'catch', 'do', 'try', 'synchronized',
    'return', 'new', 'case', 'super', 'this',
}

# Some code blocks carry their own imports, which are legal at the top of a file and illegal
# inside a class. Hoisting them is a move, not a rewrite: the statements themselves are untouched.
IMPORT_RE = re.compile(r'^\s*(import\s+(?:static\s+)?[\w.]+(?:\.\*)?\s*;)\s*$', re.M)


def hoist_imports(code: str) -> tuple[str, str]:
    """Return (imports, code-without-them)."""
    found = IMPORT_RE.findall(code)
    return '\n'.join(dict.fromkeys(found)), IMPORT_RE.sub('', code).strip('\n')


def java_identifier(problem_id: str) -> str:
    """two-sum -> TwoSum, so the generated class name is a legal Java identifier."""
    return ''.join(part.capitalize() for part in re.split(r'[^0-9a-zA-Z]+', problem_id) if part)


def first_meaningful_line(code: str) -> str:
    for line in code.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith(('//', '/*', '*', 'import ')):
            return line
    return ''


def classify(code: str) -> str:
    """
    Is this block a class body, or a piece of one?

    The test is on the first real line, because a block that *opens* mid-method is a fragment
    however many well-formed helper methods follow it — word-search-ii's brute force is three
    bare statements and then a `private static boolean exists(...)`, and searching the whole
    block for a method declaration finds the helper and calls the whole thing a method. It then
    fails to compile with errors that read like defects in the solution rather than in this
    classifier.

    A class body opens with a modifier (`public`, `private`, `static`, `final`, `class`) or with
    an unmodified method declaration. `private static final String[] LETTERS = {` is a field, and
    a field is class-body — the first version of this rule only looked for methods and wrongly
    rejected the two solutions that begin with a constant table.
    """
    if not code.strip():
        return 'empty'
    head = first_meaningful_line(code)
    if CLASS_RE.match(head):
        return 'class'
    if re.match(r'^\s*(public|private|protected|static|final)\b', head):
        return 'method'   # a class-body block: methods, fields, or both
    match = METHOD_RE.match(head)
    if match and match.group(1) not in NOT_A_METHOD_NAME:
        return 'method'
    return 'fragment'


def wrap(problem_id: str, which: str, code: str) -> tuple[str, str, str]:
    """
    Return (kind, class_name, source). A `class` block is emitted as-is inside the package; a
    `method` block is wrapped in a holder class; a `fragment` is not compilable on its own and
    is reported rather than mangled into something that compiles but is not the author's code.
    """
    kind = classify(code)
    holder = f'{java_identifier(problem_id)}{"Opt" if which == "optimized" else "Brute"}'
    own_imports, code = hoist_imports(code)

    if kind == 'class':
        # The author's class name cannot be kept. Both blocks of range-sum-query declare
        # `class NumArray`, and emitting both into one package is a duplicate-class error — in
        # practice one file simply overwrote the other, and the problem reported as
        # "cannot instantiate" rather than as the name collision it was. So the OUTER class is
        # renamed to the holder name and its constructors and self-references renamed with it.
        # Nested classes (LRUCache's `Node`, for one) keep their names: only the first `class`
        # declaration is touched.
        original = CLASS_RE.search(code).group(1)
        body = re.sub(r'^\s*public\s+class', 'class', code, count=1, flags=re.M)
        body = re.sub(rf'\bclass\s+{re.escape(original)}\b', f'class {holder}', body, count=1)
        # Constructors: `public NumArray(` / `NumArray(` at the start of a member declaration.
        body = re.sub(rf'(?m)^(\s*(?:public\s+|private\s+|protected\s+)?){re.escape(original)}\s*\(',
                      rf'\g<1>{holder}(', body)
        body = re.sub(rf'\bnew\s+{re.escape(original)}\s*\(', f'new {holder}(', body)
        source = (
            f'package verify;\n\n{PREAMBLE}{own_imports}\n'
            f'import verify.Support.TreeNode;\nimport verify.Support.ListNode;\nimport verify.Support.Node;\n\n'
            + body
        )
        return kind, holder, source

    if kind == 'method':
        # The body is wrapped VERBATIM. The first version tried to make each method static with a
        # regex, which matched `if (...)` and `for (...)` lines inside method bodies and prefixed
        # them with `public static` — a hundred compiler errors from a harness bug, in code that
        # was fine. Reflection does not need static: invoking a method with an instance receiver
        # works for both, and Java ignores the receiver on a static method. So nothing is
        # rewritten, and what compiles here is exactly what the learner reads on the page.
        source = (
            f'package verify;\n\n{PREAMBLE}{own_imports}\n'
            f'import verify.Support.TreeNode;\nimport verify.Support.ListNode;\nimport verify.Support.Node;\n\n'
            f'class {holder} extends Api {{\n{code}\n}}\n'
        )
        return kind, holder, source

    return kind, holder, ''


def main() -> int:
    BUILD.mkdir(parents=True, exist_ok=True)
    for stale in BUILD.glob('*.java'):
        stale.unlink()
    (BUILD / 'Support.java').write_text(SUPPORT)
    (BUILD / 'Api.java').write_text(API)

    manifest = []
    examples = {}
    # Some problems say outright that the answer may come back in any order (top-k-frequent,
    # k-closest-points). Comparing those element-by-element reports a disagreement about nothing,
    # so the flag is read from the problem's own words rather than assumed either way.
    any_order = {}
    for path in sorted(PROBLEMS.glob('*.json')):
        data = json.loads(path.read_text())
        examples[data['id']] = data.get('examples') or []
        prose = ' '.join([data.get('statement', '')] + (data.get('constraints') or []))
        any_order[data['id']] = bool(re.search(r'in any order', prose, re.I))
        entry = {'id': data['id'], 'title': data['title'], 'pattern': data.get('patternId')}
        for which in ('optimized', 'bruteForce'):
            code = '\n'.join(data.get(which, {}).get('code') or [])
            kind, name, source = wrap(data['id'], which, code)
            entry[which] = {'kind': kind, 'class': name if source else None}
            if source:
                (BUILD / f'{name}.java').write_text(source)
        manifest.append(entry)

    (BUILD / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    (BUILD / 'examples.json').write_text(json.dumps(examples, indent=2, ensure_ascii=False))
    (BUILD / 'any-order.json').write_text(json.dumps(any_order, indent=2, sort_keys=True))
    compilable = sum(1 for e in manifest if e['optimized']['class'])
    brute = sum(1 for e in manifest if e['bruteForce']['class'])
    print(f'[extract] {len(manifest)} problems — {compilable} optimised solutions extracted, '
          f'{brute} brute forces extracted, {len(manifest) - compilable} optimised not standalone')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
