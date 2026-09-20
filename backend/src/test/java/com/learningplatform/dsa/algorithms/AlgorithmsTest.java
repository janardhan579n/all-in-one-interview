package com.learningplatform.dsa.algorithms;

import com.learningplatform.dsa.algorithms.Algorithms.Node;
import com.learningplatform.dsa.algorithms.Algorithms.TreeNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests for the reference implementations.
 *
 * <p>These deliberately cover the edge cases each lesson calls out as a common mistake — all
 * negatives, empty input, even-length lists, duplicate values, greedy counterexamples — because
 * an untested teaching example is a claim, not a fact.
 */
class AlgorithmsTest {

    @Nested
    @DisplayName("Sliding window")
    class SlidingWindow {

        @Test
        void findsTheBestFixedWindow() {
            assertEquals(9, Algorithms.maxSumOfSizeK(new int[]{2, 1, 5, 1, 3, 2}, 3));
            assertEquals(7, Algorithms.maxSumOfSizeK(new int[]{2, 3, 4, 1, 5}, 2));
        }

        @Test
        void worksWhenEveryValueIsNegative() {
            // The classic bug is seeding `best` with 0, which would wrongly return 0 here.
            assertEquals(-3, Algorithms.maxSumOfSizeK(new int[]{-5, -2, -1, -4}, 2));
        }

        @Test
        void windowOfOneAndWindowOfWholeArray() {
            assertEquals(5, Algorithms.maxSumOfSizeK(new int[]{1, 5, 3}, 1));
            assertEquals(9, Algorithms.maxSumOfSizeK(new int[]{1, 5, 3}, 3));
        }

        @Test
        void rejectsAnArrayShorterThanK() {
            assertThrows(IllegalArgumentException.class,
                    () -> Algorithms.maxSumOfSizeK(new int[]{1, 2}, 3));
        }

        @Test
        void longestSubstringWithoutRepeatingCharacters() {
            assertEquals(3, Algorithms.longestSubstringWithoutRepeating("abcabcbb"));
            assertEquals(1, Algorithms.longestSubstringWithoutRepeating("bbbbb"));
            assertEquals(3, Algorithms.longestSubstringWithoutRepeating("pwwkew"));
            assertEquals(0, Algorithms.longestSubstringWithoutRepeating(""));
        }

        @Test
        void doesNotMoveTheLeftEdgeBackwards() {
            // "abba": when the second 'a' arrives, its last index (0) is BEFORE the window,
            // so left must stay at 2. Without the `previous >= left` guard this returns 3.
            assertEquals(2, Algorithms.longestSubstringWithoutRepeating("abba"));
        }

        @Test
        void shortestWindowMeetingATarget() {
            assertEquals(2, Algorithms.shortestSubarrayWithSumAtLeast(new int[]{2, 3, 1, 2, 4, 3}, 7));
            assertEquals(1, Algorithms.shortestSubarrayWithSumAtLeast(new int[]{1, 4, 4}, 4));
            assertEquals(0, Algorithms.shortestSubarrayWithSumAtLeast(new int[]{1, 1, 1}, 11));
        }
    }

    @Nested
    @DisplayName("Two pointers")
    class TwoPointers {

        @Test
        void convergesOnASortedPair() {
            assertArrayEquals(new int[]{0, 3}, Algorithms.twoSumSorted(new int[]{1, 3, 4, 6}, 7));
            assertArrayEquals(new int[]{-1, -1}, Algorithms.twoSumSorted(new int[]{1, 2, 3}, 99));
        }

        @Test
        void neverPairsAnElementWithItself() {
            // 3 + 3 = 6 would satisfy the target, but there is only one 3: pairing index 1 with
            // itself is not a solution, and no genuine pair sums to 6 (1+3=4, 1+4=5, 3+4=7).
            assertArrayEquals(new int[]{-1, -1}, Algorithms.twoSumSorted(new int[]{1, 3, 4}, 6));
        }

        @Test
        void threeSumSuppressesDuplicateTriplets() {
            List<List<Integer>> result = Algorithms.threeSum(new int[]{-1, 0, 1, 2, -1, -4});
            assertEquals(2, result.size());
            assertTrue(result.contains(List.of(-1, -1, 2)));
            assertTrue(result.contains(List.of(-1, 0, 1)));
        }

        @Test
        void threeSumHandlesAllZeroes() {
            assertEquals(List.of(List.of(0, 0, 0)), Algorithms.threeSum(new int[]{0, 0, 0, 0}));
        }

        @Test
        void threeSumDoesNotMutateTheCallersArray() {
            int[] input = {3, 1, 2};
            Algorithms.threeSum(input);
            assertArrayEquals(new int[]{3, 1, 2}, input);
        }

        @Test
        void compactsInPlace() {
            int[] nums = {1, 1, 2, 2, 2, 3};
            assertEquals(3, Algorithms.removeDuplicatesInPlace(nums));
            assertArrayEquals(new int[]{1, 2, 3}, java.util.Arrays.copyOf(nums, 3));
            assertEquals(0, Algorithms.removeDuplicatesInPlace(new int[]{}));
        }
    }

    @Nested
    @DisplayName("Binary search")
    class BinarySearch {

        @Test
        void findsOrReportsAbsent() {
            int[] sorted = {-1, 0, 3, 5, 9, 12};
            assertEquals(4, Algorithms.binarySearch(sorted, 9));
            assertEquals(0, Algorithms.binarySearch(sorted, -1));
            assertEquals(5, Algorithms.binarySearch(sorted, 12));
            assertEquals(-1, Algorithms.binarySearch(sorted, 2));
        }

        @Test
        void handlesEmptyAndSingleElement() {
            assertEquals(-1, Algorithms.binarySearch(new int[]{}, 1));
            assertEquals(0, Algorithms.binarySearch(new int[]{7}, 7));
            assertEquals(-1, Algorithms.binarySearch(new int[]{7}, 8));
        }

        @Test
        void lowerBoundFindsTheFirstOccurrence() {
            int[] sorted = {1, 3, 3, 3, 5, 8};
            assertEquals(1, Algorithms.lowerBound(sorted, 3));
            assertEquals(4, Algorithms.lowerBound(sorted, 5));
            assertEquals(0, Algorithms.lowerBound(sorted, 0));
            assertEquals(6, Algorithms.lowerBound(sorted, 99));   // past the end
        }

        @Test
        void searchesTheAnswerSpace() {
            assertEquals(4, Algorithms.minEatingSpeed(new int[]{3, 6, 7, 11}, 8));
            assertEquals(30, Algorithms.minEatingSpeed(new int[]{30, 11, 23, 4, 20}, 5));
            assertEquals(23, Algorithms.minEatingSpeed(new int[]{30, 11, 23, 4, 20}, 6));
        }

        @Test
        void answerSpaceSearchDoesNotOverflow() {
            // Large piles at speed 1 would overflow an int accumulator inside the feasibility check.
            assertEquals(1_000_000_000, Algorithms.minEatingSpeed(new int[]{1_000_000_000}, 1));
        }
    }

    @Nested
    @DisplayName("Prefix sum and hashing")
    class PrefixAndHashing {

        @Test
        void countsSubarraysIncludingOnesStartingAtZero() {
            assertEquals(2, Algorithms.countSubarraysWithSum(new int[]{1, 1, 1}, 2));
            assertEquals(2, Algorithms.countSubarraysWithSum(new int[]{1, 2, 3}, 3));
        }

        @Test
        void handlesNegativeNumbersWhereASlidingWindowWouldFail() {
            assertEquals(3, Algorithms.countSubarraysWithSum(new int[]{1, -1, 0}, 0));
        }

        @Test
        void twoSumReturnsOriginalIndices() {
            assertArrayEquals(new int[]{0, 1}, Algorithms.twoSum(new int[]{2, 7, 11, 15}, 9));
            assertArrayEquals(new int[]{1, 2}, Algorithms.twoSum(new int[]{3, 2, 4}, 6));
        }

        @Test
        void twoSumDoesNotReuseTheSameElement() {
            assertArrayEquals(new int[]{-1, -1}, Algorithms.twoSum(new int[]{3, 1}, 6));
        }
    }

    @Nested
    @DisplayName("Stack")
    class Stack {

        @Test
        void balancedBrackets() {
            assertTrue(Algorithms.isBalanced("()[]{}"));
            assertTrue(Algorithms.isBalanced("{[()]}"));
            assertTrue(Algorithms.isBalanced(""));
            assertFalse(Algorithms.isBalanced("([)]"));
        }

        @Test
        void rejectsUnclosedAndUnopened() {
            assertFalse(Algorithms.isBalanced("((("));   // leftovers at the end
            assertFalse(Algorithms.isBalanced(")))"));   // pop on an empty stack
        }

        @Test
        void monotonicStackFindsTheNextWarmerDay() {
            assertArrayEquals(new int[]{1, 1, 4, 2, 1, 1, 0, 0},
                    Algorithms.dailyTemperatures(new int[]{73, 74, 75, 71, 69, 72, 76, 73}));
            assertArrayEquals(new int[]{1, 1, 1, 0},
                    Algorithms.dailyTemperatures(new int[]{30, 40, 50, 60}));
            assertArrayEquals(new int[]{0, 0, 0},
                    Algorithms.dailyTemperatures(new int[]{50, 40, 30}));
        }
    }

    @Nested
    @DisplayName("Linked list")
    class LinkedList {

        @Test
        void reversesInPlace() {
            Node reversed = Algorithms.reverse(Node.of(1, 2, 3, 4, 5));
            assertEquals(List.of(5, 4, 3, 2, 1), reversed.toList());
        }

        @Test
        void reverseHandlesSingleAndEmpty() {
            assertEquals(List.of(1), Algorithms.reverse(Node.of(1)).toList());
            assertNull(Algorithms.reverse(null));
        }

        @Test
        void middleOfOddLengthIsTheExactCentre() {
            assertEquals(3, Algorithms.middle(Node.of(1, 2, 3, 4, 5)).value);
        }

        @Test
        void middleOfEvenLengthIsTheSecondOfTheTwo() {
            assertEquals(4, Algorithms.middle(Node.of(1, 2, 3, 4, 5, 6)).value);
        }

        @Test
        void detectsAndLocatesACycle() {
            Node head = Node.of(3, 2, 0, -4);
            Node second = head.next;
            head.next.next.next.next = second;          // -4 points back at 2

            assertTrue(Algorithms.hasCycle(head));
            assertSame(second, Algorithms.cycleStart(head));
        }

        @Test
        void reportsNoCycleForAStraightList() {
            Node head = Node.of(1, 2, 3, 4);
            assertFalse(Algorithms.hasCycle(head));
            assertNull(Algorithms.cycleStart(head));
            assertFalse(Algorithms.hasCycle(null));      // even-length guard, null input
        }
    }

    @Nested
    @DisplayName("Trees")
    class Trees {

        /**
         *        10
         *       /  \
         *      5    15
         *     / \     \
         *    2   7     20
         */
        private TreeNode sample() {
            return new TreeNode(10,
                    new TreeNode(5, new TreeNode(2), new TreeNode(7)),
                    new TreeNode(15, null, new TreeNode(20)));
        }

        @Test
        void inorderOfABstIsSorted() {
            assertEquals(List.of(2, 5, 7, 10, 15, 20), Algorithms.inorder(sample()));
        }

        @Test
        void preorderVisitsTheNodeFirst() {
            assertEquals(List.of(10, 5, 2, 7, 15, 20), Algorithms.preorder(sample()));
        }

        @Test
        void levelOrderGroupsByDepth() {
            assertEquals(List.of(List.of(10), List.of(5, 15), List.of(2, 7, 20)),
                    Algorithms.levelOrder(sample()));
            assertEquals(List.of(), Algorithms.levelOrder(null));
        }

        @Test
        void depthCountsNodesNotEdges() {
            assertEquals(3, Algorithms.maxDepth(sample()));
            assertEquals(0, Algorithms.maxDepth(null));
            assertEquals(1, Algorithms.maxDepth(new TreeNode(1)));
        }

        @Test
        void bstValidationUsesInheritedBounds() {
            assertTrue(Algorithms.isBst(sample()));

            // 6 is a valid child of 5 but violates the bound inherited from the root (10).
            // Comparing only with the immediate parent would wrongly accept this.
            TreeNode invalid = new TreeNode(10,
                    new TreeNode(5, new TreeNode(2), new TreeNode(12)),
                    new TreeNode(15));
            assertFalse(Algorithms.isBst(invalid));
        }
    }

    @Nested
    @DisplayName("Graphs")
    class Graphs {

        private final Map<String, List<String>> graph = Map.of(
                "A", List.of("B", "C"),
                "B", List.of("A", "D"),
                "C", List.of("A", "E"),
                "D", List.of("B", "F"),
                "E", List.of("C", "F"),
                "F", List.of("D", "E"));

        @Test
        void bfsFindsTheFewestHops() {
            assertEquals(3, Algorithms.shortestHops(graph, "A", "F"));
            assertEquals(1, Algorithms.shortestHops(graph, "A", "B"));
            assertEquals(0, Algorithms.shortestHops(graph, "A", "A"));
        }

        @Test
        void bfsReportsUnreachable() {
            assertEquals(-1, Algorithms.shortestHops(graph, "A", "Z"));
        }

        @Test
        void countsConnectedRegions() {
            int[][] grid = {
                    {1, 1, 0, 0, 1},
                    {1, 0, 0, 0, 1},
                    {0, 0, 1, 0, 0},
                    {0, 0, 1, 1, 0}};
            assertEquals(3, Algorithms.countIslands(grid));
        }

        @Test
        void diagonalsAreNotConnected() {
            int[][] diagonal = {{1, 0}, {0, 1}};
            assertEquals(2, Algorithms.countIslands(diagonal));
        }

        @Test
        void detectsCircularPrerequisites() {
            assertTrue(Algorithms.canFinishCourses(2, new int[][]{{1, 0}}));
            assertFalse(Algorithms.canFinishCourses(2, new int[][]{{1, 0}, {0, 1}}));
            assertTrue(Algorithms.canFinishCourses(3, new int[][]{}));      // no edges at all
        }

        @Test
        void handlesDisconnectedDependencyGraphs() {
            // Two independent chains plus an isolated node.
            assertTrue(Algorithms.canFinishCourses(5, new int[][]{{1, 0}, {3, 2}}));
        }
    }

    @Nested
    @DisplayName("Backtracking")
    class Backtracking {

        @Test
        void generatesThePowerSet() {
            List<List<Integer>> result = Algorithms.subsets(new int[]{1, 2, 3});
            assertEquals(8, result.size());
            assertTrue(result.contains(List.of()));
            assertTrue(result.contains(List.of(1, 2, 3)));
            assertTrue(result.contains(List.of(2, 3)));
        }

        @Test
        void storesCopiesNotLiveReferences() {
            // If the implementation stored the mutable working list, every entry would be empty.
            List<List<Integer>> result = Algorithms.subsets(new int[]{1, 2});
            assertTrue(result.stream().anyMatch(subset -> !subset.isEmpty()));
        }

        @Test
        void generatesEveryPermutation() {
            List<List<Integer>> result = Algorithms.permutations(new int[]{1, 2, 3});
            assertEquals(6, result.size());
            assertEquals(6, result.stream().distinct().count());
            assertTrue(result.contains(List.of(3, 1, 2)));
        }

        @Test
        void countsNQueensSolutions() {
            assertEquals(1, Algorithms.countNQueens(1));
            assertEquals(0, Algorithms.countNQueens(2));   // no solution exists
            assertEquals(0, Algorithms.countNQueens(3));
            assertEquals(2, Algorithms.countNQueens(4));
            assertEquals(92, Algorithms.countNQueens(8));  // the well-known answer
        }
    }

    @Nested
    @DisplayName("Dynamic programming")
    class DynamicProgramming {

        @Test
        void climbingStairsIsFibonacciShifted() {
            assertEquals(1, Algorithms.climbStairs(1));
            assertEquals(2, Algorithms.climbStairs(2));
            assertEquals(3, Algorithms.climbStairs(3));
            assertEquals(8, Algorithms.climbStairs(5));
            assertEquals(1836311903, Algorithms.climbStairs(45));
        }

        @Test
        void robberAvoidsAdjacentHouses() {
            assertEquals(4, Algorithms.rob(new int[]{1, 2, 3, 1}));
            assertEquals(12, Algorithms.rob(new int[]{2, 7, 9, 3, 1}));
            assertEquals(0, Algorithms.rob(new int[]{}));
        }

        @Test
        void robberBeatsTheAlternatingHeuristic() {
            // Taking every other house from index 0 gives 2+1 = 3; the optimum is 2+2 = 4.
            assertEquals(4, Algorithms.rob(new int[]{2, 1, 1, 2}));
        }

        @Test
        void coinChangeBeatsGreedy() {
            // Greedy would pick 4+1+1 = 3 coins. The optimum is 3+3 = 2.
            assertEquals(2, Algorithms.coinChange(new int[]{1, 3, 4}, 6));
            assertEquals(3, Algorithms.coinChange(new int[]{1, 2, 5}, 11));
        }

        @Test
        void coinChangeReportsImpossibleAmounts() {
            assertEquals(-1, Algorithms.coinChange(new int[]{2}, 3));
            assertEquals(0, Algorithms.coinChange(new int[]{1}, 0));
        }

        @Test
        void countsGridPaths() {
            assertEquals(28, Algorithms.uniquePaths(3, 7));
            assertEquals(3, Algorithms.uniquePaths(3, 2));
            assertEquals(1, Algorithms.uniquePaths(1, 1));
        }
    }
}
