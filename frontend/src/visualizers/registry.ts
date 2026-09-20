import type { Engine } from './types';
import { arrayOps, arrayScanMax, growthTable, loopTrace, memoryBoxes, nestedLoopPairs } from './engines/arrayEngines';
import { slidingWindowFixed, slidingWindowShrink, slidingWindowVariable } from './engines/windowEngines';
import { twoPointersOpposite, twoPointersPalindrome, twoPointersSameDirection } from './engines/pointerEngines';
import { binarySearch, binarySearchAnswer, binarySearchBoundary } from './engines/searchEngines';
import { hashingOps, prefixSum, prefixSumHash, twoSumHash } from './engines/hashEngines';
import { fastSlowPointer, linkedListOps, linkedListReverse } from './engines/listEngines';
import { balancedBrackets, circularQueue, queueOps, stackOps } from './engines/stackQueueEngines';
import { bstOps, treeTraversal } from './engines/treeEngines';
import {
  connectedComponents,
  directedCycle,
  graphBfs,
  graphDfs,
  graphRepresentation,
  gridBfs,
  gridDfs,
} from './engines/graphEngines';
import {
  backtrackingNQueens,
  backtrackingPermutations,
  backtrackingSubsets,
  recursionTrace,
} from './engines/recursionEngines';
import { dp1d, dpGrid } from './engines/dpEngines';
import { heapOps, topKHeap } from './engines/heapEngines';
import { monotonicStack, trieOps, unionFind } from './engines/structureEngines';
import {
  bitOps,
  dijkstra,
  matrixSpiral,
  mergeIntervals,
  mergeSortSteps,
  quickSortSteps,
  topologicalSort,
} from './engines/algorithmEngines';

/**
 * Every visualisation the content library may reference, by id.
 *
 * Content JSON names an engine here rather than describing an animation, so a new lesson can
 * reuse an existing animation with different input and no new code. The backend test
 * `ContentStoreTest.visualisationEnginesExist` asserts this map and the content stay in sync,
 * which turns a typo into a failing build rather than a blank panel.
 */
export const ENGINES: Record<string, Engine> = {
  // Foundations
  arrayScanMax,
  memoryBoxes,
  loopTrace,
  growthTable,
  nestedLoopPairs,

  // Arrays, hashing, prefix sums
  arrayOps,
  hashingOps,
  twoSumHash,
  prefixSum,
  prefixSumHash,

  // Sliding window
  slidingWindowFixed,
  slidingWindowVariable,
  slidingWindowShrink,

  // Two pointers
  twoPointersOpposite,
  twoPointersPalindrome,
  twoPointersSameDirection,

  // Binary search
  binarySearch,
  binarySearchBoundary,
  binarySearchAnswer,

  // Linked lists
  linkedListOps,
  linkedListReverse,
  fastSlowPointer,

  // Stacks and queues
  stackOps,
  balancedBrackets,
  queueOps,
  circularQueue,

  // Trees
  treeTraversal,
  bstOps,

  // Graphs
  graphRepresentation,
  connectedComponents,
  graphBfs,
  graphDfs,
  gridBfs,
  gridDfs,
  directedCycle,

  // Recursion and backtracking
  recursionTrace,
  backtrackingSubsets,
  backtrackingPermutations,
  backtrackingNQueens,

  // Dynamic programming
  dp1d,
  dpGrid,

  // Heaps and priority queues
  heapOps,
  topKHeap,

  // Tries, disjoint sets, monotonic stacks
  trieOps,
  unionFind,
  monotonicStack,

  // Intervals, sorting, bits, ordering, shortest paths, matrices
  mergeIntervals,
  mergeSortSteps,
  quickSortSteps,
  bitOps,
  topologicalSort,
  dijkstra,
  matrixSpiral,
};

export function hasEngine(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ENGINES, id);
}

export function engineIds(): string[] {
  return Object.keys(ENGINES).sort();
}
