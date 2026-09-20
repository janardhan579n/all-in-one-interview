"""Generates problem JSON files (batch 1). Run from the repo root:  python3 scripts/gen_problems_1.py"""
import json, os, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "content" / "dsa" / "problems"
OUT.mkdir(parents=True, exist_ok=True)

P = []

P.append({
  "id": "max-sum-subarray-k",
  "title": "Maximum Sum Subarray of Size K",
  "patternId": "sliding-window",
  "difficulty": "beginner",
  "tags": ["array", "sliding-window"],
  "statement": "Given an array of integers and a number k, find the maximum sum of any contiguous subarray of exactly k elements.",
  "realWorld": "A monitoring dashboard shows 'busiest 5-minute stretch today'. Each array entry is a minute's request count; k is 5. Exactly the same computation powers peak-hour detection in billing, traffic shaping and capacity planning.",
  "examples": [
    {"input": "nums = [2,1,5,1,3,2], k = 3", "output": "9", "explanation": "The subarray [5,1,3] sums to 9, which beats [2,1,5]=8, [1,5,1]=7 and [1,3,2]=6."},
    {"input": "nums = [2,3,4,1,5], k = 2", "output": "7", "explanation": "[3,4] sums to 7."}
  ],
  "constraints": ["1 <= k <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
  "bruteForce": {
    "idea": "For every possible starting index, add up the k elements that follow and keep the largest total.",
    "code": [
      "int best = Integer.MIN_VALUE;",
      "for (int start = 0; start + k <= nums.length; start++) {",
      "    int sum = 0;",
      "    for (int i = start; i < start + k; i++) {",
      "        sum += nums[i];",
      "    }",
      "    best = Math.max(best, sum);",
      "}",
      "return best;"
    ],
    "complexity": {"time": "O(n*k)", "space": "O(1)"},
    "whySlow": "Every window is summed from scratch even though consecutive windows share k-1 of their k elements. With n = 100,000 and k = 1,000 that is 10^8 additions, of which 99.9% repeat work already done."
  },
  "patternIdentification": "'Contiguous subarray' plus 'of size k' plus 'maximum' is the fixed-size sliding window signature. The giveaway is that the brute force re-adds overlapping elements.",
  "optimized": {
    "idea": "Maintain the running sum. When the window moves one step right, add the entering element and subtract the leaving one, then compare against the best so far.",
    "code": [
      "public static int maxSumOfSizeK(int[] nums, int k) {",
      "    if (nums.length < k) throw new IllegalArgumentException(\"array shorter than k\");",
      "    int windowSum = 0;",
      "    int best = Integer.MIN_VALUE;",
      "    for (int right = 0; right < nums.length; right++) {",
      "        windowSum += nums[right];",
      "        if (right >= k - 1) {",
      "            best = Math.max(best, windowSum);",
      "            windowSum -= nums[right - k + 1];",
      "        }",
      "    }",
      "    return best;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(1)"}
  },
  "visualization": {
    "engine": "slidingWindowFixed",
    "input": {"array": [2, 1, 5, 1, 3, 2], "k": 3},
    "code": [
      "int windowSum = 0, best = Integer.MIN_VALUE;",
      "for (int right = 0; right < nums.length; right++) {",
      "    windowSum += nums[right];",
      "    if (right >= k - 1) {",
      "        best = Math.max(best, windowSum);",
      "        windowSum -= nums[right - k + 1];",
      "    }",
      "}",
      "return best;"
    ]
  },
  "commonMistakes": [
    "Initialising best to 0 — wrong whenever every element is negative. Use Integer.MIN_VALUE.",
    "Subtracting nums[right - k] instead of nums[right - k + 1]. Check it with k = 1.",
    "Recording the answer before the window is full (right < k-1)."
  ],
  "similar": ["longest-substring-no-repeat", "min-window-substring", "subarray-sum-equals-k"]
})

P.append({
  "id": "longest-substring-no-repeat",
  "title": "Longest Substring Without Repeating Characters",
  "patternId": "sliding-window",
  "difficulty": "intermediate",
  "tags": ["string", "sliding-window", "hashing"],
  "statement": "Given a string, find the length of the longest substring that contains no repeated characters.",
  "realWorld": "Deduplicating a stream of events within a session window, or finding the longest run of distinct actions a user performed before repeating one.",
  "examples": [
    {"input": "s = \"abcabcbb\"", "output": "3", "explanation": "\"abc\" has length 3. Any longer stretch repeats a character."},
    {"input": "s = \"bbbbb\"", "output": "1", "explanation": "Only \"b\"."},
    {"input": "s = \"pwwkew\"", "output": "3", "explanation": "\"wke\". Note \"pwke\" is a subsequence, not a substring."}
  ],
  "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
  "bruteForce": {
    "idea": "Check every substring and test whether it has all-distinct characters.",
    "code": [
      "int best = 0;",
      "for (int i = 0; i < s.length(); i++) {",
      "    for (int j = i; j < s.length(); j++) {",
      "        if (allDistinct(s, i, j)) {",
      "            best = Math.max(best, j - i + 1);",
      "        }",
      "    }",
      "}",
      "return best;"
    ],
    "complexity": {"time": "O(n^3)", "space": "O(min(n, alphabet))"},
    "whySlow": "There are O(n^2) substrings and checking each for distinctness costs O(n). Even memoising the check to O(1) leaves O(n^2), and it still rescans stretches already known to be valid."
  },
  "patternIdentification": "'Substring' (contiguous) + 'longest' + a constraint that can be violated and then repaired by dropping characters from the left = variable-size sliding window.",
  "optimized": {
    "idea": "Slide a window that always contains distinct characters. Remember the last index of each character; when the incoming character was already seen inside the window, jump the left edge past that earlier occurrence in one move.",
    "code": [
      "public static int lengthOfLongestSubstring(String s) {",
      "    Map<Character, Integer> lastSeen = new HashMap<>();",
      "    int left = 0;",
      "    int best = 0;",
      "    for (int right = 0; right < s.length(); right++) {",
      "        char c = s.charAt(right);",
      "        Integer prev = lastSeen.get(c);",
      "        if (prev != null && prev >= left) {",
      "            left = prev + 1;          // jump, do not step",
      "        }",
      "        lastSeen.put(c, right);",
      "        best = Math.max(best, right - left + 1);",
      "    }",
      "    return best;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(min(n, alphabet size))"}
  },
  "visualization": {
    "engine": "slidingWindowVariable",
    "input": {"text": "abcabcbb"},
    "code": [
      "Map<Character, Integer> lastSeen = new HashMap<>();",
      "int left = 0, best = 0;",
      "for (int right = 0; right < s.length(); right++) {",
      "    char c = s.charAt(right);",
      "    if (lastSeen.containsKey(c) && lastSeen.get(c) >= left) {",
      "        left = lastSeen.get(c) + 1;",
      "    }",
      "    lastSeen.put(c, right);",
      "    best = Math.max(best, right - left + 1);",
      "}",
      "return best;"
    ]
  },
  "commonMistakes": [
    "Forgetting the `prev >= left` check. A character last seen before the window started is not a duplicate inside it, and moving left backwards corrupts the window.",
    "Confusing substring with subsequence — 'pwke' is not a valid answer for 'pwwkew'.",
    "Returning the substring's start index instead of its length, or not handling the empty string."
  ],
  "similar": ["max-sum-subarray-k", "min-window-substring", "group-anagrams"]
})

P.append({
  "id": "min-window-substring",
  "title": "Minimum Window Substring",
  "patternId": "sliding-window",
  "difficulty": "advanced",
  "tags": ["string", "sliding-window", "hashing"],
  "statement": "Given strings s and t, return the shortest substring of s that contains every character of t including duplicates. Return \"\" if no such window exists.",
  "realWorld": "Log forensics: find the shortest span of a log file that contains every event in a required sequence, so you can show the smallest window that proves a workflow completed.",
  "examples": [
    {"input": "s = \"ADOBECODEBANC\", t = \"ABC\"", "output": "\"BANC\"", "explanation": "BANC is the shortest stretch containing A, B and C."},
    {"input": "s = \"a\", t = \"aa\"", "output": "\"\"", "explanation": "s has only one 'a' but two are required."}
  ],
  "constraints": ["1 <= s.length, t.length <= 10^5", "s and t consist of uppercase and lowercase English letters"],
  "bruteForce": {
    "idea": "Generate every substring of s and check whether it covers t, keeping the shortest that does.",
    "code": [
      "String best = \"\";",
      "for (int i = 0; i < s.length(); i++) {",
      "    for (int j = i; j < s.length(); j++) {",
      "        String candidate = s.substring(i, j + 1);",
      "        if (covers(candidate, t) && (best.isEmpty() || candidate.length() < best.length())) {",
      "            best = candidate;",
      "        }",
      "    }",
      "}",
      "return best;"
    ],
    "complexity": {"time": "O(n^2 * (n + m))", "space": "O(n)"},
    "whySlow": "O(n^2) substrings, and both building each substring and checking coverage are linear. For n = 10^5 this never finishes."
  },
  "patternIdentification": "'Shortest substring satisfying a condition' is the shrink-while-valid variant of the sliding window. Because we want the minimum, we record the answer *inside* the shrink loop, not after it.",
  "optimized": {
    "idea": "Expand the right edge until the window covers t, then shrink from the left while it still covers, recording the best length at each step. A single `have`/`need` counter avoids re-scanning the frequency map.",
    "code": [
      "public static String minWindow(String s, String t) {",
      "    if (s.length() < t.length()) return \"\";",
      "",
      "    Map<Character, Integer> need = new HashMap<>();",
      "    for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);",
      "",
      "    Map<Character, Integer> window = new HashMap<>();",
      "    int have = 0;                  // how many distinct chars are fully satisfied",
      "    int required = need.size();",
      "    int bestLen = Integer.MAX_VALUE, bestStart = 0;",
      "    int left = 0;",
      "",
      "    for (int right = 0; right < s.length(); right++) {",
      "        char c = s.charAt(right);",
      "        window.merge(c, 1, Integer::sum);",
      "        if (need.containsKey(c) && window.get(c).intValue() == need.get(c).intValue()) {",
      "            have++;",
      "        }",
      "",
      "        while (have == required) {              // valid: try to shrink",
      "            if (right - left + 1 < bestLen) {",
      "                bestLen = right - left + 1;",
      "                bestStart = left;",
      "            }",
      "            char leaving = s.charAt(left);",
      "            window.merge(leaving, -1, Integer::sum);",
      "            if (need.containsKey(leaving) && window.get(leaving) < need.get(leaving)) {",
      "                have--;",
      "            }",
      "            left++;",
      "        }",
      "    }",
      "    return bestLen == Integer.MAX_VALUE ? \"\" : s.substring(bestStart, bestStart + bestLen);",
      "}"
    ],
    "complexity": {"time": "O(n + m)", "space": "O(alphabet size)"}
  },
  "visualization": {
    "engine": "slidingWindowShrink",
    "input": {"array": [2, 3, 1, 2, 4, 3], "target": 7},
    "code": [
      "// same shrink-while-valid shape, shown on a numeric example:",
      "int left = 0, sum = 0, best = Integer.MAX_VALUE;",
      "for (int right = 0; right < nums.length; right++) {",
      "    sum += nums[right];",
      "    while (sum >= target) {",
      "        best = Math.min(best, right - left + 1);",
      "        sum -= nums[left++];",
      "    }",
      "}"
    ]
  },
  "commonMistakes": [
    "Comparing boxed Integers with == instead of .intValue() or equals — values above 127 are not cached and the comparison silently fails.",
    "Recording the answer after the shrink loop. For a minimum you must record while the window is still valid.",
    "Recomputing coverage by scanning the whole map each step, which reintroduces an O(alphabet) factor.",
    "Forgetting that t can contain duplicates, so counts matter, not just presence."
  ],
  "similar": ["longest-substring-no-repeat", "max-sum-subarray-k"]
})

P.append({
  "id": "two-sum",
  "title": "Two Sum",
  "patternId": "hashing",
  "difficulty": "beginner",
  "tags": ["array", "hashing"],
  "statement": "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Exactly one valid answer exists and you may not use the same element twice.",
  "realWorld": "Reconciling payments: given a list of transaction amounts and an expected total, find the two that make it up. Also the shape of 'find the complement' in accounting and inventory matching.",
  "examples": [
    {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9."},
    {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "2 + 4 = 6. Note [0,0] is not allowed."}
  ],
  "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i], target <= 10^9", "Exactly one valid answer exists"],
  "bruteForce": {
    "idea": "Test every pair.",
    "code": [
      "for (int i = 0; i < nums.length; i++) {",
      "    for (int j = i + 1; j < nums.length; j++) {",
      "        if (nums[i] + nums[j] == target) return new int[]{i, j};",
      "    }",
      "}",
      "return new int[]{-1, -1};"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(1)"},
    "whySlow": "n(n-1)/2 pairs. The inner loop exists only to ask 'is target - nums[i] present?', which is a lookup dressed up as a search."
  },
  "patternIdentification": "The inner loop searches for a value we can compute in advance. Any time you can name exactly what you are looking for, use a hash map instead of scanning for it.",
  "optimized": {
    "idea": "One pass. For each element compute the complement and check whether an earlier element equalled it. Store each value with its index as you go, so the map always holds everything to the left of the current position.",
    "code": [
      "public static int[] twoSum(int[] nums, int target) {",
      "    Map<Integer, Integer> seen = new HashMap<>();   // value -> index",
      "    for (int i = 0; i < nums.length; i++) {",
      "        int need = target - nums[i];",
      "        Integer j = seen.get(need);",
      "        if (j != null) return new int[]{j, i};",
      "        seen.put(nums[i], i);   // put AFTER the check: no element pairs with itself",
      "    }",
      "    return new int[]{-1, -1};",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(n)"}
  },
  "visualization": {
    "engine": "twoSumHash",
    "input": {"array": [2, 7, 11, 15, 3], "target": 18},
    "code": [
      "Map<Integer, Integer> seen = new HashMap<>();",
      "for (int i = 0; i < nums.length; i++) {",
      "    int need = target - nums[i];",
      "    if (seen.containsKey(need)) {",
      "        return new int[]{ seen.get(need), i };",
      "    }",
      "    seen.put(nums[i], i);",
      "}",
      "return new int[]{-1, -1};"
    ]
  },
  "commonMistakes": [
    "Putting the current value in the map before checking for its complement — target 6 with a single 3 then wrongly returns [0,0].",
    "Assuming the array is sorted and reaching for two pointers; sorting destroys the original indices the problem asks for.",
    "Overflow when computing target - nums[i] with extreme values; use long if the constraints allow both near Integer.MIN_VALUE."
  ],
  "similar": ["two-sum-sorted", "three-sum", "contains-duplicate", "subarray-sum-equals-k"]
})

P.append({
  "id": "contains-duplicate",
  "title": "Contains Duplicate",
  "patternId": "hashing",
  "difficulty": "beginner",
  "tags": ["array", "hashing"],
  "statement": "Return true if any value appears at least twice in the array, and false if every element is distinct.",
  "realWorld": "Idempotency checks: has this request ID, order ID or webhook delivery already been processed? The same question in a payments system prevents charging a customer twice.",
  "examples": [
    {"input": "nums = [1,2,3,1]", "output": "true", "explanation": "1 appears twice."},
    {"input": "nums = [1,2,3,4]", "output": "false", "explanation": "All distinct."}
  ],
  "constraints": ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  "bruteForce": {
    "idea": "Compare every element with every other element.",
    "code": [
      "for (int i = 0; i < nums.length; i++) {",
      "    for (int j = i + 1; j < nums.length; j++) {",
      "        if (nums[i] == nums[j]) return true;",
      "    }",
      "}",
      "return false;"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(1)"},
    "whySlow": "5 billion comparisons at n = 100,000. The inner loop is asking 'have I seen this value?', which a set answers in O(1)."
  },
  "patternIdentification": "'Have I seen this before?' is the canonical HashSet signal.",
  "optimized": {
    "idea": "Add each value to a set. HashSet.add returns false if the value was already present, so the check and the insert are one operation. Return early on the first repeat.",
    "code": [
      "public static boolean containsDuplicate(int[] nums) {",
      "    Set<Integer> seen = new HashSet<>(nums.length * 4 / 3 + 1);",
      "    for (int x : nums) {",
      "        if (!seen.add(x)) return true;   // add() == false means already present",
      "    }",
      "    return false;",
      "}",
      "",
      "// Alternative: O(n log n) time, O(1) extra space if mutating the input is allowed",
      "// Arrays.sort(nums);  then check adjacent pairs.",
      "// Worth mentioning as the space/time trade-off."
    ],
    "complexity": {"time": "O(n)", "space": "O(n)"}
  },
  "commonMistakes": [
    "Calling seen.contains(x) then seen.add(x) — two hash lookups where one suffices.",
    "Not mentioning the sort-based alternative when the interviewer asks for O(1) extra space.",
    "Using an array of counts without checking the value range; nums[i] can be ±10^9 here."
  ],
  "similar": ["two-sum", "group-anagrams", "find-duplicate-number"]
})

P.append({
  "id": "group-anagrams",
  "title": "Group Anagrams",
  "patternId": "hashing",
  "difficulty": "intermediate",
  "tags": ["string", "hashing", "sorting"],
  "statement": "Given an array of strings, group together all the strings that are anagrams of one another. Return the groups in any order.",
  "realWorld": "Deduplicating product listings whose titles use the same words in different orders, or clustering log messages that differ only by field ordering.",
  "examples": [
    {"input": "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "output": "[[\"eat\",\"tea\",\"ate\"],[\"tan\",\"nat\"],[\"bat\"]]", "explanation": "Three groups by letter multiset."}
  ],
  "constraints": ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100", "strs[i] consists of lowercase English letters"],
  "bruteForce": {
    "idea": "For each string, scan all remaining ungrouped strings and test each pair for anagram-ness by sorting or counting.",
    "code": [
      "List<List<String>> groups = new ArrayList<>();",
      "boolean[] used = new boolean[strs.length];",
      "for (int i = 0; i < strs.length; i++) {",
      "    if (used[i]) continue;",
      "    List<String> group = new ArrayList<>();",
      "    group.add(strs[i]);",
      "    used[i] = true;",
      "    for (int j = i + 1; j < strs.length; j++) {",
      "        if (!used[j] && isAnagram(strs[i], strs[j])) {",
      "            group.add(strs[j]);",
      "            used[j] = true;",
      "        }",
      "    }",
      "    groups.add(group);",
      "}"
    ],
    "complexity": {"time": "O(n^2 * k)", "space": "O(nk)"},
    "whySlow": "Every pair is compared. The real insight is unused: anagrams share a property that can be computed once per string rather than tested pairwise."
  },
  "patternIdentification": "'Group things that share a property' means: derive a canonical key from each item and bucket by that key. The work goes into choosing a key that is identical for exactly the items that belong together.",
  "optimized": {
    "idea": "Two strings are anagrams exactly when their sorted letters match — or, cheaper, when their 26-letter counts match. Build that canonical key per string and group in a HashMap.",
    "code": [
      "public static List<List<String>> groupAnagrams(String[] strs) {",
      "    Map<String, List<String>> groups = new HashMap<>();",
      "    for (String word : strs) {",
      "        groups.computeIfAbsent(key(word), k -> new ArrayList<>()).add(word);",
      "    }",
      "    return new ArrayList<>(groups.values());",
      "}",
      "",
      "/** O(k) counting key — beats sorting's O(k log k) for lowercase input. */",
      "private static String key(String word) {",
      "    int[] count = new int[26];",
      "    for (char c : word.toCharArray()) count[c - 'a']++;",
      "    StringBuilder sb = new StringBuilder(52);",
      "    for (int i = 0; i < 26; i++) {",
      "        sb.append('#').append(count[i]);   // '#' delimits, so 1,11 != 11,1",
      "    }",
      "    return sb.toString();",
      "}"
    ],
    "complexity": {"time": "O(n * k) with the counting key; O(n * k log k) with the sorting key", "space": "O(n * k)"}
  },
  "commonMistakes": [
    "Building the counting key without a delimiter, so counts 1,11 and 11,1 collide.",
    "Sorting when the alphabet is small and fixed — counting is strictly cheaper.",
    "Assuming the counting key generalises to Unicode; it only works for a small known alphabet."
  ],
  "similar": ["two-sum", "contains-duplicate", "longest-substring-no-repeat"]
})

P.append({
  "id": "running-sum",
  "title": "Running Sum of 1D Array",
  "patternId": "prefix-sum",
  "difficulty": "beginner",
  "tags": ["array", "prefix-sum"],
  "statement": "Return an array where each element is the sum of all elements up to and including that index in the input.",
  "realWorld": "Cumulative revenue by day on a dashboard, or a running account balance from a list of transactions. Once you have the cumulative series, any date range is a single subtraction.",
  "examples": [
    {"input": "nums = [1,2,3,4]", "output": "[1,3,6,10]", "explanation": "1, 1+2, 1+2+3, 1+2+3+4."},
    {"input": "nums = [3,1,2,10,1]", "output": "[3,4,6,16,17]", "explanation": ""}
  ],
  "constraints": ["1 <= nums.length <= 1000", "-10^6 <= nums[i] <= 10^6"],
  "bruteForce": {
    "idea": "For each index, sum everything from 0 up to it.",
    "code": [
      "int[] result = new int[nums.length];",
      "for (int i = 0; i < nums.length; i++) {",
      "    int sum = 0;",
      "    for (int j = 0; j <= i; j++) sum += nums[j];",
      "    result[i] = sum;",
      "}",
      "return result;"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(n)"},
    "whySlow": "Position i re-adds everything already added for position i-1. The prefix up to i-1 is exactly the answer we computed on the previous iteration."
  },
  "patternIdentification": "Each answer is the previous answer plus one new element — the definition of a cumulative (prefix) computation.",
  "optimized": {
    "idea": "Carry the running total forward. One addition per element.",
    "code": [
      "public static int[] runningSum(int[] nums) {",
      "    int[] result = new int[nums.length];",
      "    int running = 0;",
      "    for (int i = 0; i < nums.length; i++) {",
      "        running += nums[i];",
      "        result[i] = running;",
      "    }",
      "    return result;",
      "}",
      "",
      "// In place, if mutating the input is allowed:",
      "// for (int i = 1; i < nums.length; i++) nums[i] += nums[i - 1];"
    ],
    "complexity": {"time": "O(n)", "space": "O(1) extra, excluding the output"}
  },
  "visualization": {
    "engine": "prefixSum",
    "input": {"array": [3, 1, 4, 1, 5, 9, 2, 6], "queries": [[1, 3], [0, 4], [5, 7]]},
    "code": [
      "int[] prefix = new int[nums.length + 1];",
      "for (int i = 0; i < nums.length; i++) {",
      "    prefix[i + 1] = prefix[i] + nums[i];",
      "}",
      "// range i..j inclusive:",
      "return prefix[j + 1] - prefix[i];"
    ]
  },
  "commonMistakes": [
    "Accumulating into an int when the totals can exceed 2.1 billion — use long.",
    "Mutating the caller's array without saying so."
  ],
  "similar": ["subarray-sum-equals-k"]
})

P.append({
  "id": "subarray-sum-equals-k",
  "title": "Subarray Sum Equals K",
  "patternId": "prefix-sum",
  "difficulty": "intermediate",
  "tags": ["array", "prefix-sum", "hashing"],
  "statement": "Given an array of integers (which may be negative) and an integer k, count the number of contiguous subarrays whose elements sum to exactly k.",
  "realWorld": "Finding how many billing periods netted exactly zero after refunds, or how many windows of a metric stream hit an exact budget — cases where values go both up and down.",
  "examples": [
    {"input": "nums = [1,1,1], k = 2", "output": "2", "explanation": "[1,1] at indices 0-1 and 1-2."},
    {"input": "nums = [1,2,3], k = 3", "output": "2", "explanation": "[3] and [1,2]."},
    {"input": "nums = [1,-1,0], k = 0", "output": "3", "explanation": "[1,-1], [0] and [1,-1,0]."}
  ],
  "constraints": ["1 <= nums.length <= 2 * 10^4", "-1000 <= nums[i] <= 1000", "-10^7 <= k <= 10^7"],
  "bruteForce": {
    "idea": "Try every start and every end, summing as you extend the end.",
    "code": [
      "int count = 0;",
      "for (int start = 0; start < nums.length; start++) {",
      "    int sum = 0;",
      "    for (int end = start; end < nums.length; end++) {",
      "        sum += nums[end];",
      "        if (sum == k) count++;",
      "    }",
      "}",
      "return count;"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(1)"},
    "whySlow": "4 * 10^8 operations at the upper constraint. Acceptable in some languages, too slow here — and it misses the structural insight."
  },
  "patternIdentification": "A sliding window is the instinct, and it is WRONG: negative values mean extending the window can decrease the sum, so shrinking on invalidity is unsound. 'Subarray sum' + 'negatives allowed' = prefix sums with a hash map.",
  "optimized": {
    "idea": "If prefix[j] - prefix[i] == k then prefix[i] == prefix[j] - k. Scan once keeping a running prefix and a map of how many times each prefix value has occurred; at each step add the count of the prefix we need.",
    "code": [
      "public static int subarraySum(int[] nums, int k) {",
      "    Map<Integer, Integer> prefixCounts = new HashMap<>();",
      "    prefixCounts.put(0, 1);        // the empty prefix: enables subarrays from index 0",
      "",
      "    int running = 0;",
      "    int count = 0;",
      "    for (int x : nums) {",
      "        running += x;",
      "        count += prefixCounts.getOrDefault(running - k, 0);",
      "        prefixCounts.merge(running, 1, Integer::sum);",
      "    }",
      "    return count;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(n)"}
  },
  "visualization": {
    "engine": "prefixSumHash",
    "input": {"array": [1, 2, 3, -3, 1, 1, 1], "k": 3},
    "code": [
      "Map<Integer, Integer> seen = new HashMap<>();",
      "seen.put(0, 1);",
      "int running = 0, count = 0;",
      "for (int x : nums) {",
      "    running += x;",
      "    count += seen.getOrDefault(running - k, 0);",
      "    seen.merge(running, 1, Integer::sum);",
      "}",
      "return count;"
    ]
  },
  "commonMistakes": [
    "Omitting prefixCounts.put(0, 1), which silently drops every subarray starting at index 0.",
    "Updating the map before the lookup, which lets a zero-length subarray be counted when k == 0.",
    "Reaching for a sliding window — it is incorrect here because of the negative values.",
    "Storing prefix sums in a Set instead of a Map; you need counts, not presence, since the same prefix can recur."
  ],
  "similar": ["two-sum", "running-sum", "max-sum-subarray-k"]
})

P.append({
  "id": "two-sum-sorted",
  "title": "Two Sum II — Input Array Is Sorted",
  "patternId": "two-pointers",
  "difficulty": "beginner",
  "tags": ["array", "two-pointers", "sorted"],
  "statement": "Given a 1-indexed array sorted in non-decreasing order, find two numbers that add up to a target and return their 1-based indices. You must use O(1) extra space.",
  "realWorld": "Matching a sorted price list against a budget, or pairing sorted time offsets to hit an exact duration.",
  "examples": [
    {"input": "numbers = [2,7,11,15], target = 9", "output": "[1,2]", "explanation": "2 + 7 = 9; 1-based indices."},
    {"input": "numbers = [2,3,4], target = 6", "output": "[1,3]", "explanation": "2 + 4 = 6."}
  ],
  "constraints": ["2 <= numbers.length <= 3 * 10^4", "Sorted non-decreasing", "Exactly one solution exists", "O(1) extra space required"],
  "bruteForce": {
    "idea": "Check every pair, ignoring the sorting.",
    "code": [
      "for (int i = 0; i < n; i++)",
      "    for (int j = i + 1; j < n; j++)",
      "        if (numbers[i] + numbers[j] == target) return new int[]{i + 1, j + 1};"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(1)"},
    "whySlow": "It throws away the single most useful fact available. The HashMap solution is O(n) but uses O(n) space, which the problem explicitly forbids."
  },
  "patternIdentification": "Sorted input + looking for a pair + O(1) space required = opposite-end two pointers. The space constraint rules out the hash map and effectively names the intended technique.",
  "optimized": {
    "idea": "Start at both ends. If the sum is too large, the largest value cannot pair with anything remaining, so discard it by moving right inwards. If too small, move left inwards. Each comparison eliminates one element permanently.",
    "code": [
      "public static int[] twoSum(int[] numbers, int target) {",
      "    int left = 0;",
      "    int right = numbers.length - 1;",
      "    while (left < right) {",
      "        int sum = numbers[left] + numbers[right];",
      "        if (sum == target) {",
      "            return new int[]{left + 1, right + 1};   // 1-based",
      "        } else if (sum < target) {",
      "            left++;      // numbers[left] is too small for ANY remaining partner",
      "        } else {",
      "            right--;     // numbers[right] is too large for ANY remaining partner",
      "        }",
      "    }",
      "    return new int[]{-1, -1};",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(1)"}
  },
  "visualization": {
    "engine": "twoPointersOpposite",
    "input": {"array": [1, 3, 4, 6, 8, 11], "target": 14},
    "code": [
      "int left = 0, right = nums.length - 1;",
      "while (left < right) {",
      "    int sum = nums[left] + nums[right];",
      "    if (sum == target) return new int[]{left, right};",
      "    if (sum < target) left++;",
      "    else              right--;",
      "}",
      "return new int[]{-1, -1};"
    ]
  },
  "commonMistakes": [
    "Using left <= right, which allows an element to pair with itself.",
    "Forgetting the 1-based indexing this particular problem asks for.",
    "Using int for the sum when values approach Integer.MAX_VALUE — overflow flips the comparison."
  ],
  "similar": ["two-sum", "three-sum", "container-with-most-water"]
})

P.append({
  "id": "container-with-most-water",
  "title": "Container With Most Water",
  "patternId": "two-pointers",
  "difficulty": "intermediate",
  "tags": ["array", "two-pointers", "greedy"],
  "statement": "Given an array where each element is the height of a vertical line, find two lines that together with the x-axis hold the most water. Return that maximum area.",
  "realWorld": "The same 'widest span limited by the weakest endpoint' shape appears in capacity planning between two constrained resources, and in finding the best pair of price points bounded by the lower one.",
  "examples": [
    {"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49", "explanation": "Lines at indices 1 and 8: width 7, limiting height min(8,7) = 7, area 49."},
    {"input": "height = [1,1]", "output": "1", "explanation": ""}
  ],
  "constraints": ["2 <= height.length <= 10^5", "0 <= height[i] <= 10^4"],
  "bruteForce": {
    "idea": "Compute the area for every pair of lines.",
    "code": [
      "int best = 0;",
      "for (int i = 0; i < height.length; i++) {",
      "    for (int j = i + 1; j < height.length; j++) {",
      "        int area = (j - i) * Math.min(height[i], height[j]);",
      "        best = Math.max(best, area);",
      "    }",
      "}",
      "return best;"
    ],
    "complexity": {"time": "O(n^2)", "space": "O(1)"},
    "whySlow": "5 * 10^9 pairs at the upper constraint. It also ignores a decisive structural fact about which pairs can possibly be better."
  },
  "patternIdentification": "Not sorted, so why two pointers? Because there is still a monotonic argument: starting at maximum width, the only way to beat the current area is to increase the limiting height. That justifies discarding the shorter line — which is the two-pointer move.",
  "optimized": {
    "idea": "Start at the widest possible pair. The area is limited by the shorter line, so moving the taller one inwards can only reduce width without ever raising the limit. Therefore always move the shorter line — every other pair involving it is provably worse.",
    "code": [
      "public static int maxArea(int[] height) {",
      "    int left = 0;",
      "    int right = height.length - 1;",
      "    int best = 0;",
      "",
      "    while (left < right) {",
      "        int limiting = Math.min(height[left], height[right]);",
      "        best = Math.max(best, (right - left) * limiting);",
      "",
      "        // Move the shorter line: keeping it can never beat what we just recorded,",
      "        // because width only shrinks from here and this line caps the height.",
      "        if (height[left] < height[right]) left++;",
      "        else                              right--;",
      "    }",
      "    return best;",
      "}"
    ],
    "complexity": {"time": "O(n)", "space": "O(1)"}
  },
  "commonMistakes": [
    "Moving the taller line, or moving both. Only discarding the shorter one is justified.",
    "Using the taller line's height in the area — the shorter one is the constraint.",
    "Assuming the array must be sorted for two pointers to apply; the justification here is the monotonic width argument, not ordering."
  ],
  "similar": ["two-sum-sorted", "three-sum"]
})

for problem in P:
    path = OUT / (problem["id"] + ".json")
    path.write_text(json.dumps(problem, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print("wrote", len(P), "problems to", OUT)
