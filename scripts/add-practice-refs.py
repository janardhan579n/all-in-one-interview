#!/usr/bin/env python3
"""
Attach a LeetCode practice reference to every problem.

Why this exists: the library teaches the pattern, but you cannot learn to *type* an algorithm
under time pressure by reading. The intended loop is "learn the pattern here, then go and grind
that exact pattern on a judge" — and that loop only works if finishing a lesson hands you the
specific problems to go and do.

Two deliberate design decisions:

1. **The slug drives the link, not the number.** LeetCode URLs are
   `leetcode.com/problems/<slug>/` — the number is display metadata that appears nowhere in the
   URL. So even if a number here is wrong, the link still lands on the right problem. The number
   is what makes a problem findable by search and sortable in a list, which is why it is carried.

2. **Where there is no honest equivalent, the reference is null.** Three problems in this library
   are teaching exercises with no LeetCode counterpart. Inventing a number for them, or pointing
   at "something close", would be exactly the kind of confident-but-wrong data this project keeps
   finding in itself. They carry an explicit note instead.

Provenance: the numbers come from the author's knowledge, spot-checked against web search for
problems 42, 417, 907, 1319, 1514 and 1631, all of which matched. They are not machine-verified
against LeetCode — its API disallows automated fetching — which `docs/VERIFICATION.md` states
plainly. A wrong number shows the wrong label above a link that still works.
"""

import json
import pathlib
import sys

# id -> (leetcode number, slug, official title, premium?)
LEETCODE = {
    'accounts-merge': (721, 'accounts-merge', 'Accounts Merge', False),
    'add-two-numbers': (2, 'add-two-numbers', 'Add Two Numbers', False),
    'alien-dictionary': (269, 'alien-dictionary', 'Alien Dictionary', True),
    'asteroid-collision': (735, 'asteroid-collision', 'Asteroid Collision', False),
    'balanced-binary-tree': (110, 'balanced-binary-tree', 'Balanced Binary Tree', False),
    'best-time-buy-sell-cooldown': (309, 'best-time-to-buy-and-sell-stock-with-cooldown', 'Best Time to Buy and Sell Stock with Cooldown', False),
    'best-time-to-buy-sell-stock': (121, 'best-time-to-buy-and-sell-stock', 'Best Time to Buy and Sell Stock', False),
    'binary-search-basic': (704, 'binary-search', 'Binary Search', False),
    'binary-tree-inorder-traversal': (94, 'binary-tree-inorder-traversal', 'Binary Tree Inorder Traversal', False),
    'binary-tree-level-order': (102, 'binary-tree-level-order-traversal', 'Binary Tree Level Order Traversal', False),
    'cheapest-flights-k-stops': (787, 'cheapest-flights-within-k-stops', 'Cheapest Flights Within K Stops', False),
    'climbing-stairs': (70, 'climbing-stairs', 'Climbing Stairs', False),
    'clone-graph': (133, 'clone-graph', 'Clone Graph', False),
    'coin-change': (322, 'coin-change', 'Coin Change', False),
    'combination-sum': (39, 'combination-sum', 'Combination Sum', False),
    'container-with-most-water': (11, 'container-with-most-water', 'Container With Most Water', False),
    'contains-duplicate': (217, 'contains-duplicate', 'Contains Duplicate', False),
    'contiguous-array': (525, 'contiguous-array', 'Contiguous Array', False),
    'counting-bits': (338, 'counting-bits', 'Counting Bits', False),
    'course-schedule': (207, 'course-schedule', 'Course Schedule', False),
    'course-schedule-ii': (210, 'course-schedule-ii', 'Course Schedule II', False),
    'daily-temperatures': (739, 'daily-temperatures', 'Daily Temperatures', False),
    'decode-string': (394, 'decode-string', 'Decode String', False),
    'decode-ways': (91, 'decode-ways', 'Decode Ways', False),
    'design-add-search-words': (211, 'design-add-and-search-words-data-structure', 'Design Add and Search Words Data Structure', False),
    'design-circular-queue': (622, 'design-circular-queue', 'Design Circular Queue', False),
    'diagonal-traverse': (498, 'diagonal-traverse', 'Diagonal Traverse', False),
    'diameter-of-binary-tree': (543, 'diameter-of-binary-tree', 'Diameter of Binary Tree', False),
    'edit-distance': (72, 'edit-distance', 'Edit Distance', False),
    'evaluate-rpn': (150, 'evaluate-reverse-polish-notation', 'Evaluate Reverse Polish Notation', False),
    'fibonacci-memo': (509, 'fibonacci-number', 'Fibonacci Number', False),
    'find-duplicate-number': (287, 'find-the-duplicate-number', 'Find the Duplicate Number', False),
    'find-median-from-stream': (295, 'find-median-from-data-stream', 'Find Median from Data Stream', False),
    'find-min-rotated-array': (153, 'find-minimum-in-rotated-sorted-array', 'Find Minimum in Rotated Sorted Array', False),
    'find-missing-number': (268, 'missing-number', 'Missing Number', False),
    'first-bad-version': (278, 'first-bad-version', 'First Bad Version', False),
    'first-unique-character': (387, 'first-unique-character-in-a-string', 'First Unique Character in a String', False),
    'four-sum-count': (454, '4sum-ii', '4Sum II', False),
    'game-of-life': (289, 'game-of-life', 'Game of Life', False),
    'gas-station': (134, 'gas-station', 'Gas Station', False),
    'graph-valid-tree': (261, 'graph-valid-tree', 'Graph Valid Tree', True),
    'group-anagrams': (49, 'group-anagrams', 'Group Anagrams', False),
    'h-index': (274, 'h-index', 'H-Index', False),
    'happy-number': (202, 'happy-number', 'Happy Number', False),
    'house-robber': (198, 'house-robber', 'House Robber', False),
    'house-robber-ii': (213, 'house-robber-ii', 'House Robber II', False),
    'implement-queue-using-stacks': (232, 'implement-queue-using-stacks', 'Implement Queue using Stacks', False),
    'implement-trie': (208, 'implement-trie-prefix-tree', 'Implement Trie (Prefix Tree)', False),
    'insert-interval': (57, 'insert-interval', 'Insert Interval', False),
    'invert-binary-tree': (226, 'invert-binary-tree', 'Invert Binary Tree', False),
    'is-graph-bipartite': (785, 'is-graph-bipartite', 'Is Graph Bipartite?', False),
    'jump-game': (55, 'jump-game', 'Jump Game', False),
    'jump-game-ii': (45, 'jump-game-ii', 'Jump Game II', False),
    'k-closest-points': (973, 'k-closest-points-to-origin', 'K Closest Points to Origin', False),
    'koko-eating-bananas': (875, 'koko-eating-bananas', 'Koko Eating Bananas', False),
    'kth-largest-element': (215, 'kth-largest-element-in-an-array', 'Kth Largest Element in an Array', False),
    'kth-smallest-in-bst': (230, 'kth-smallest-element-in-a-bst', 'Kth Smallest Element in a BST', False),
    'largest-number': (179, 'largest-number', 'Largest Number', False),
    'largest-rectangle-histogram': (84, 'largest-rectangle-in-histogram', 'Largest Rectangle in Histogram', False),
    'last-stone-weight': (1046, 'last-stone-weight', 'Last Stone Weight', False),
    'letter-combinations-phone': (17, 'letter-combinations-of-a-phone-number', 'Letter Combinations of a Phone Number', False),
    'linked-list-cycle': (141, 'linked-list-cycle', 'Linked List Cycle', False),
    'longest-common-prefix': (14, 'longest-common-prefix', 'Longest Common Prefix', False),
    'longest-common-subsequence': (1143, 'longest-common-subsequence', 'Longest Common Subsequence', False),
    'longest-consecutive-sequence': (128, 'longest-consecutive-sequence', 'Longest Consecutive Sequence', False),
    'longest-increasing-subsequence': (300, 'longest-increasing-subsequence', 'Longest Increasing Subsequence', False),
    'longest-repeating-char-replacement': (424, 'longest-repeating-character-replacement', 'Longest Repeating Character Replacement', False),
    'longest-substring-no-repeat': (3, 'longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', False),
    'longest-word-in-dictionary': (720, 'longest-word-in-dictionary', 'Longest Word in Dictionary', False),
    'lowest-common-ancestor-bst': (235, 'lowest-common-ancestor-of-a-binary-search-tree', 'Lowest Common Ancestor of a Binary Search Tree', False),
    'lru-cache': (146, 'lru-cache', 'LRU Cache', False),
    'max-area-of-island': (695, 'max-area-of-island', 'Max Area of Island', False),
    'max-consecutive-ones-iii': (1004, 'max-consecutive-ones-iii', 'Max Consecutive Ones III', False),
    'max-depth-binary-tree': (104, 'maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', False),
    'median-two-sorted-arrays': (4, 'median-of-two-sorted-arrays', 'Median of Two Sorted Arrays', False),
    'meeting-rooms': (252, 'meeting-rooms', 'Meeting Rooms', True),
    'meeting-rooms-ii': (253, 'meeting-rooms-ii', 'Meeting Rooms II', True),
    'merge-intervals': (56, 'merge-intervals', 'Merge Intervals', False),
    'merge-k-sorted-lists': (23, 'merge-k-sorted-lists', 'Merge k Sorted Lists', False),
    'merge-sorted-array': (88, 'merge-sorted-array', 'Merge Sorted Array', False),
    'merge-two-sorted-lists': (21, 'merge-two-sorted-lists', 'Merge Two Sorted Lists', False),
    'middle-of-linked-list': (876, 'middle-of-the-linked-list', 'Middle of the Linked List', False),
    'min-cost-climbing-stairs': (746, 'min-cost-climbing-stairs', 'Min Cost Climbing Stairs', False),
    'min-height-trees': (310, 'minimum-height-trees', 'Minimum Height Trees', False),
    'min-stack': (155, 'min-stack', 'Min Stack', False),
    'min-window-substring': (76, 'minimum-window-substring', 'Minimum Window Substring', False),
    'minimum-arrows-burst-balloons': (452, 'minimum-number-of-arrows-to-burst-balloons', 'Minimum Number of Arrows to Burst Balloons', False),
    'move-zeroes': (283, 'move-zeroes', 'Move Zeroes', False),
    'moving-average-stream': (346, 'moving-average-from-data-stream', 'Moving Average from Data Stream', True),
    'n-queens': (51, 'n-queens', 'N-Queens', False),
    'network-delay-time': (743, 'network-delay-time', 'Network Delay Time', False),
    'next-greater-element': (496, 'next-greater-element-i', 'Next Greater Element I', False),
    'non-overlapping-intervals': (435, 'non-overlapping-intervals', 'Non-overlapping Intervals', False),
    'number-of-1-bits': (191, 'number-of-1-bits', 'Number of 1 Bits', False),
    'number-of-islands': (200, 'number-of-islands', 'Number of Islands', False),
    'number-of-operations-to-connect': (1319, 'number-of-operations-to-make-network-connected', 'Number of Operations to Make Network Connected', False),
    'number-of-provinces': (547, 'number-of-provinces', 'Number of Provinces', False),
    'open-the-lock': (752, 'open-the-lock', 'Open the Lock', False),
    'pacific-atlantic-water-flow': (417, 'pacific-atlantic-water-flow', 'Pacific Atlantic Water Flow', False),
    'palindrome-linked-list': (234, 'palindrome-linked-list', 'Palindrome Linked List', False),
    'palindrome-partitioning': (131, 'palindrome-partitioning', 'Palindrome Partitioning', False),
    'parallel-courses': (1136, 'parallel-courses', 'Parallel Courses', True),
    'partition-equal-subset-sum': (416, 'partition-equal-subset-sum', 'Partition Equal Subset Sum', False),
    'partition-labels': (763, 'partition-labels', 'Partition Labels', False),
    'path-sum': (112, 'path-sum', 'Path Sum', False),
    'path-with-maximum-probability': (1514, 'path-with-maximum-probability', 'Path with Maximum Probability', False),
    'path-with-minimum-effort': (1631, 'path-with-minimum-effort', 'Path With Minimum Effort', False),
    'permutation-in-string': (567, 'permutation-in-string', 'Permutation in String', False),
    'permutations': (46, 'permutations', 'Permutations', False),
    'pivot-index': (724, 'find-pivot-index', 'Find Pivot Index', False),
    'power-function': (50, 'powx-n', 'Pow(x, n)', False),
    'product-of-array-except-self': (238, 'product-of-array-except-self', 'Product of Array Except Self', False),
    'range-sum-query': (303, 'range-sum-query-immutable', 'Range Sum Query - Immutable', False),
    'redundant-connection': (684, 'redundant-connection', 'Redundant Connection', False),
    'remove-duplicates-sorted': (26, 'remove-duplicates-from-sorted-array', 'Remove Duplicates from Sorted Array', False),
    'remove-k-digits': (402, 'remove-k-digits', 'Remove K Digits', False),
    'remove-nth-from-end': (19, 'remove-nth-node-from-end-of-list', 'Remove Nth Node From End of List', False),
    'reorder-list': (143, 'reorder-list', 'Reorder List', False),
    'reorganize-string': (767, 'reorganize-string', 'Reorganize String', False),
    'reverse-bits': (190, 'reverse-bits', 'Reverse Bits', False),
    'reverse-linked-list': (206, 'reverse-linked-list', 'Reverse Linked List', False),
    'rotate-array': (189, 'rotate-array', 'Rotate Array', False),
    'rotate-image': (48, 'rotate-image', 'Rotate Image', False),
    'rotting-oranges': (994, 'rotting-oranges', 'Rotting Oranges', False),
    'running-sum': (1480, 'running-sum-of-1d-array', 'Running Sum of 1d Array', False),
    'same-tree': (100, 'same-tree', 'Same Tree', False),
    'satisfiability-equality-equations': (990, 'satisfiability-of-equality-equations', 'Satisfiability of Equality Equations', False),
    'search-2d-matrix': (74, 'search-a-2d-matrix', 'Search a 2D Matrix', False),
    'search-rotated-array': (33, 'search-in-rotated-sorted-array', 'Search in Rotated Sorted Array', False),
    'sequence-reconstruction': (444, 'sequence-reconstruction', 'Sequence Reconstruction', True),
    'serialize-deserialize-tree': (297, 'serialize-and-deserialize-binary-tree', 'Serialize and Deserialize Binary Tree', False),
    'set-matrix-zeroes': (73, 'set-matrix-zeroes', 'Set Matrix Zeroes', False),
    'shortest-path-binary-matrix': (1091, 'shortest-path-in-binary-matrix', 'Shortest Path in Binary Matrix', False),
    'single-number': (136, 'single-number', 'Single Number', False),
    'single-number-ii': (137, 'single-number-ii', 'Single Number II', False),
    'sliding-window-maximum': (239, 'sliding-window-maximum', 'Sliding Window Maximum', False),
    'sort-colors': (75, 'sort-colors', 'Sort Colors', False),
    'sort-list': (148, 'sort-list', 'Sort List', False),
    'spiral-matrix': (54, 'spiral-matrix', 'Spiral Matrix', False),
    'squares-of-sorted-array': (977, 'squares-of-a-sorted-array', 'Squares of a Sorted Array', False),
    'subarray-sum-equals-k': (560, 'subarray-sum-equals-k', 'Subarray Sum Equals K', False),
    'subsets': (78, 'subsets', 'Subsets', False),
    'subsets-bitmask': (78, 'subsets', 'Subsets', False),
    'sum-of-subarray-minimums': (907, 'sum-of-subarray-minimums', 'Sum of Subarray Minimums', False),
    'surrounded-regions': (130, 'surrounded-regions', 'Surrounded Regions', False),
    'swim-in-rising-water': (778, 'swim-in-rising-water', 'Swim in Rising Water', False),
    'target-sum': (494, 'target-sum', 'Target Sum', False),
    'task-scheduler': (621, 'task-scheduler', 'Task Scheduler', False),
    'three-sum': (15, '3sum', '3Sum', False),
    'top-k-frequent': (347, 'top-k-frequent-elements', 'Top K Frequent Elements', False),
    'trapping-rain-water': (42, 'trapping-rain-water', 'Trapping Rain Water', False),
    'two-sum': (1, 'two-sum', 'Two Sum', False),
    'two-sum-sorted': (167, 'two-sum-ii-input-array-is-sorted', 'Two Sum II - Input Array Is Sorted', False),
    'unique-paths': (62, 'unique-paths', 'Unique Paths', False),
    'valid-anagram': (242, 'valid-anagram', 'Valid Anagram', False),
    'valid-palindrome': (125, 'valid-palindrome', 'Valid Palindrome', False),
    'valid-parentheses': (20, 'valid-parentheses', 'Valid Parentheses', False),
    'validate-bst': (98, 'validate-binary-search-tree', 'Validate Binary Search Tree', False),
    'walls-and-gates': (286, 'walls-and-gates', 'Walls and Gates', True),
    'word-break': (139, 'word-break', 'Word Break', False),
    'word-ladder': (127, 'word-ladder', 'Word Ladder', False),
    'word-search': (79, 'word-search', 'Word Search', False),
    'word-search-ii': (212, 'word-search-ii', 'Word Search II', False),
}

# Problems with no honest LeetCode counterpart. Saying so is the point.
NO_EQUIVALENT = {
    'max-sum-subarray-k':
        'No exact LeetCode equivalent — this is the classic fixed-window warm-up. '
        'LeetCode 643 (Maximum Average Subarray I) is the same window with the sum divided by k, '
        'and 1456 (Maximum Number of Vowels in a Substring of Given Length) is the same shape again.',
    'tower-of-hanoi':
        'No LeetCode equivalent — this is a teaching problem for the recursive leap of faith, not an '
        'interview question. For recursion practice on a judge, do 509 (Fibonacci Number), '
        '50 (Pow(x, n)) and 779 (K-th Symbol in Grammar).',
    'subsets-bitmask':
        'Same LeetCode problem as Subsets (78) — this file exists to show the bitmask enumeration as an '
        'alternative to backtracking, so solving 78 covers both.',
}

# These map to a LeetCode problem that is not identical. Say how it differs rather than pretending.
NOTES = {
    'binary-search-basic': 'LeetCode 704 is exactly this problem: an exact-match search on a sorted array.',
    'find-missing-number': 'LeetCode 268 uses the range 0..n; this lesson also covers the 1..n variant, where '
                           'the sum formula shifts by n but the XOR approach is unchanged.',
    'next-greater-element': 'LeetCode 496 wraps the same monotonic stack in a subset lookup. For the bare '
                            'next-greater pattern, 739 (Daily Temperatures) is the cleaner drill.',
    'range-sum-query': 'LeetCode 303 is the immutable version taught here. 307 (Range Sum Query - Mutable) is '
                       'the same question once updates are allowed, and needs a Fenwick or segment tree.',
}

URL = 'https://leetcode.com/problems/{slug}/'


def main() -> int:
    root = pathlib.Path(__file__).resolve().parent.parent / 'content' / 'dsa' / 'problems'
    files = sorted(root.glob('*.json'))
    on_disk = {json.loads(f.read_text())['id'] for f in files}

    unknown = on_disk - set(LEETCODE) - set(NO_EQUIVALENT)
    stale = (set(LEETCODE) | set(NO_EQUIVALENT)) - on_disk
    if unknown or stale:
        for pid in sorted(unknown):
            print(f'  ! no practice reference for problem "{pid}"', file=sys.stderr)
        for pid in sorted(stale):
            print(f'  ! reference for "{pid}", which is not on disk', file=sys.stderr)
        return 1

    linked = premium = unmapped = 0
    for path in files:
        data = json.loads(path.read_text())
        pid = data['id']

        if pid in NO_EQUIVALENT:
            practice = {'leetcode': None, 'note': NO_EQUIVALENT[pid]}
            unmapped += 1
        else:
            number, slug, title, paid = LEETCODE[pid]
            practice = {
                'leetcode': {
                    'id': number,
                    'slug': slug,
                    'title': title,
                    'url': URL.format(slug=slug),
                    'premium': paid,
                },
            }
            if pid in NOTES:
                practice['note'] = NOTES[pid]
            linked += 1
            premium += 1 if paid else 0

        data['practice'] = practice
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

    print(f'[practice-refs] {linked} linked to LeetCode ({premium} premium-only), '
          f'{unmapped} with no equivalent, {len(files)} total')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
