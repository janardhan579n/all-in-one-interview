/**
 * The visualisation contract.
 *
 * Every animation on the platform — arrays, linked lists, trees, graphs, DP tables,
 * recursion, even request flow through an architecture — is produced by a pure function
 * that turns an input into an array of Steps. See docs/DECISIONS.md ADR-004.
 *
 * Consequences that matter:
 *   • engines are pure, so they are unit-testable ("step 3 must highlight code line 5")
 *   • one generic Player drives every visualisation, so play/pause/speed/reduced-motion
 *     are implemented exactly once
 *   • code, state and picture cannot drift apart, because one Step carries all three
 */

/** A value shown in a cell. Strings render as-is; numbers are right-aligned. */
export type CellValue = string | number;

export type CellState =
  | 'idle'
  | 'active'      // being looked at right now
  | 'inWindow'    // inside the current window/range
  | 'visited'     // already processed
  | 'match'       // the answer, or a successful comparison
  | 'reject'      // eliminated from consideration
  | 'target';     // what we are looking for

export interface Pointer {
  name: string;
  index: number;
  tone?: 'brand' | 'good' | 'warn' | 'bad' | 'info';
}

export interface Range {
  name: string;
  from: number;
  to: number;
  tone?: 'brand' | 'good' | 'warn' | 'info';
}

export interface ArrayPanel {
  values: CellValue[];
  /** Optional per-cell state; index-aligned with values. */
  states?: CellState[];
  /** Optional labels under each cell (defaults to the index). */
  labels?: string[];
  caption?: string;
  /** Rendered as characters rather than numbers (strings, palindromes). */
  asText?: boolean;
}

export interface ListNodeView {
  id: string;
  value: CellValue;
  state?: CellState;
}

export interface ListPanel {
  nodes: ListNodeView[];
  pointers?: { name: string; nodeId: string | null; tone?: Pointer['tone'] }[];
  /** Index of the node the tail loops back to, for cycle visualisations. */
  cycleTo?: number | null;
  caption?: string;
}

export interface TreeNodeView {
  id: string;
  value: CellValue;
  state?: CellState;
  left?: TreeNodeView | null;
  right?: TreeNodeView | null;
}

export interface GraphPanel {
  nodes: { id: string; label: string; x: number; y: number; state?: CellState }[];
  edges: { from: string; to: string; label?: string; state?: 'idle' | 'active' | 'tree' | 'back' }[];
  directed?: boolean;
  caption?: string;
}

export interface GridPanel {
  cells: CellValue[][];
  states?: CellState[][];
  caption?: string;
}

export interface TablePanel {
  columns: string[];
  rows: CellValue[][];
  /** [row, column] of the cell currently being computed. */
  cursor?: [number, number] | null;
  caption?: string;
}

export interface BoxPanel {
  boxes: { name: string; type?: string; value: CellValue; address: string; reference?: boolean; state?: CellState }[];
  caption?: string;
}

export interface BoardPanel {
  size: number;
  /** queens[row] = column, or -1 for an empty row. */
  queens: number[];
  /** Cells being rejected by the current pruning check. */
  conflicts?: [number, number][];
  caption?: string;
}

export interface FramePanel {
  frames: { label: string; detail?: string; state?: CellState }[];
  caption?: string;
}

export interface BucketPanel {
  buckets: { index: number; entries: { key: string; value: CellValue; state?: CellState }[] }[];
  caption?: string;
}

/**
 * Everything that can appear on the canvas at one instant. A step fills in only the panels
 * its visualisation needs; the renderer draws whichever are present, in this order.
 */
export interface Scene {
  array?: ArrayPanel;
  secondaryArray?: ArrayPanel;
  list?: ListPanel;
  tree?: TreeNodeView | null;
  graph?: GraphPanel;
  grid?: GridPanel;
  table?: TablePanel;
  stack?: { items: CellValue[]; caption?: string };
  queue?: { items: CellValue[]; head?: number; tail?: number; capacity?: number; caption?: string };
  boxes?: BoxPanel;
  board?: BoardPanel;
  frames?: FramePanel;
  buckets?: BucketPanel;
  pointers?: Pointer[];
  ranges?: Range[];
  /** Collected results, e.g. subsets found so far or traversal output. */
  output?: string[];
}

export interface Step {
  /** The whole world at this instant — an immutable snapshot, never a mutable reference. */
  scene: Scene;
  /** 1-based line number in the lesson's code listing. */
  codeLine?: number;
  /** One sentence, shown under the canvas and announced to screen readers. */
  explain: string;
  /** Variable inspector rows: the values a debugger would show. */
  vars?: Record<string, CellValue>;
  /** Marks the final step so the player can show "done" rather than just stopping. */
  done?: boolean;
}

export type Engine = (input: Record<string, unknown>) => Step[];

/** Hard cap so a pathological input can never freeze the tab (ADR-004). */
export const MAX_STEPS = 4000;

/** Small helpers shared by every engine. */
export function cap(steps: Step[]): Step[] {
  if (steps.length <= MAX_STEPS) return steps;
  const trimmed = steps.slice(0, MAX_STEPS);
  trimmed[trimmed.length - 1] = {
    ...trimmed[trimmed.length - 1],
    explain: `Stopped after ${MAX_STEPS} steps — try a smaller input.`,
    done: true,
  };
  return trimmed;
}

export function states(length: number, fill: CellState = 'idle'): CellState[] {
  return Array.from({ length }, () => fill);
}

export function num(input: Record<string, unknown>, key: string, fallback: number): number {
  const value = input[key];
  return typeof value === 'number' ? value : fallback;
}

export function numbers(input: Record<string, unknown>, key: string, fallback: number[]): number[] {
  const value = input[key];
  return Array.isArray(value) && value.every((v) => typeof v === 'number') ? (value as number[]) : fallback;
}

export function text(input: Record<string, unknown>, key: string, fallback: string): string {
  const value = input[key];
  return typeof value === 'string' ? value : fallback;
}
