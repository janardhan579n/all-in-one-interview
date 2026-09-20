/**
 * Content types.
 *
 * These mirror docs/CONTENT_MODEL.md. They are intentionally permissive — every optional
 * field really is optional in some document — because the content schema is expected to grow
 * and a missing field should render as "not provided", never as a crash.
 */

export interface CodeBlock {
  label?: string;
  language?: string;
  explanation?: string;
  code: string[];
}

export interface Complexity {
  time: string;
  space: string;
  why?: string;
}

export interface QuizQuestion {
  id: string;
  type?: string;
  question: string;
  options: string[];
  /** Present only in offline mode; the API strips it. */
  answerIndex?: number;
  explanation?: string;
}

export interface VisualizationSpecJson {
  id?: string;
  title?: string;
  engine: string;
  input?: Record<string, unknown>;
  code?: string[];
  codeLineOffset?: number;
  variants?: { label: string; input: Record<string, unknown> }[];
}

/** Attached by the server (or the offline bundle) to say which language you actually got. */
export interface TranslationMarker {
  language: string;
  translated: boolean;
}

export interface Lesson {
  translation?: TranslationMarker;
  id: string;
  kind: 'foundation' | 'pattern' | 'data-structure';
  title: string;
  group: string;
  level: number;
  difficulty: string;
  estimatedMinutes?: number;
  summary: string;
  prerequisites?: string[];
  tags?: string[];
  interactive?: string;
  analogy: { beginner: string; interview: string };
  intuition?: string;
  problemFirst?: {
    motivatingProblem: string;
    bruteForce: { idea: string; code: string[]; complexity: Complexity; whySlow: string };
    observation: string;
    leap: string;
    optimizedSketch?: string[];
  };
  howItWorks?: string[];
  patternRecognition?: { signals: string[]; antiSignals: string[]; decisionTreeId?: string | null };
  visualizations?: VisualizationSpecJson[];
  implementations?: CodeBlock[];
  complexity?: Complexity;
  commonMistakes?: { mistake: string; fix: string }[];
  realWorldUses?: string[];
  interviewNotes?: string[];
  quiz?: QuizQuestion[];
  practiceProblems?: string[];
  related?: string[];
}

/**
 * Where to go and actually type this one.
 *
 * `leetcode` is null for the handful of problems with no honest counterpart on a judge — a
 * `note` then says what to practise instead. The url is built from the slug, because the slug
 * is what LeetCode routes on; the number is for display and for finding it in a list.
 */
export interface Practice {
  leetcode: {
    id: number;
    slug: string;
    title: string;
    url: string;
    premium: boolean;
  } | null;
  note?: string;
}

export interface Problem {
  id: string;
  title: string;
  patternId?: string;
  difficulty: string;
  tags?: string[];
  statement: string;
  realWorld?: string;
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string[];
  bruteForce?: { idea: string; code: string[]; complexity: Complexity; whySlow: string };
  patternIdentification?: string;
  optimized?: { idea: string; code: string[]; complexity: Complexity };
  visualization?: VisualizationSpecJson;
  commonMistakes?: string[];
  similar?: string[];
  practice?: Practice;
}

export interface DiagramNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  note?: string;
  why?: { without: string[]; with: string[]; conclusion: string };
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface Architecture {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface Tradeoff {
  option: string;
  pros: string[];
  cons: string[];
  examples?: string;
}

export interface Concept {
  translation?: TranslationMarker;
  id: string;
  title: string;
  group: string;
  level: number;
  estimatedMinutes?: number;
  summary: string;
  analogy?: string;
  explanation: { beginner: string; interview: string };
  diagram?: Architecture;
  why?: { without: string[]; with: string[]; conclusion: string };
  whenToUse?: string[];
  whenNotToUse?: string[];
  tradeoffs?: Tradeoff[];
  keyNumbers?: { label: string; value: string }[];
  consistencyModels?: { name: string; meaning: string }[];
  designRules?: string[];
  interactive?: string;
  quiz?: QuizQuestion[];
  related?: string[];
}

export interface EvolutionStage {
  stage: string;
  problem: string;
  change: string;
  why: string;
  architecture: Architecture;
}

export interface CaseStudy {
  translation?: TranslationMarker;
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes?: number;
  summary: string;
  interactive?: string;
  steps: { key: string; title: string; content: string }[];
  estimation?: {
    assumptions: string[];
    calculations: { label: string; value: string; working?: string }[];
  };
  api?: { method: string; path: string; request?: string; response?: string; notes?: string }[];
  dataModel?: {
    name: string;
    fields: { name: string; type: string; notes?: string }[];
    indexes?: string[];
  }[];
  evolution?: EvolutionStage[];
  tradeoffs?: Tradeoff[];
  interviewStages?: { key: string; prompt: string; hints: string[]; modelAnswer: string[] }[];
  quiz?: QuizQuestion[];
  related?: string[];
}

export interface DecisionTreeNode {
  type: 'question' | 'result';
  text: string;
  options?: { label: string; next: string }[];
  detail?: string;
  lessonId?: string;
}

export interface DecisionTree {
  id: string;
  title: string;
  start: string;
  nodes: Record<string, DecisionTreeNode>;
}

export interface LearningPath {
  id: string;
  title: string;
  audience: string;
  description: string;
  steps: { ref: string; kind: string }[];
}

export interface PatternMapNode {
  id: string;
  label: string;
  kind: 'root' | 'group' | 'lesson' | 'pattern';
  children?: PatternMapNode[];
}

export interface PatternMap {
  id: string;
  title: string;
  description: string;
  root: PatternMapNode;
}

export interface PracticeQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer?: string;
  signals?: string[];
  explanation?: string;
}

export interface ContentSummary {
  id: string;
  type: 'lesson' | 'problem' | 'concept' | 'case-study';
  title: string;
  kind?: string;
  group?: string;
  level?: number;
  difficulty?: string;
  estimatedMinutes?: number;
  summary?: string;
  tags?: string[];
  patternId?: string;
  interactive?: string;
  /** Carried on the summary so a list of problems can show its number without loading each one. */
  leetcodeId?: number;
  leetcodePremium?: boolean;
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface ProgressSnapshot {
  lessons: Record<string, { status: ProgressStatus; percent: number; updatedAt?: string }>;
  problems: Record<string, { attempts: number; solved: boolean; lastAttempt?: string }>;
  quizzes: { contentId: string; bestScore: number; total: number; attempts: number; lastTaken?: string }[];
  flags: Record<string, { difficult: boolean; mastered: boolean }>;
  streak: number;
}

export interface ProgressSummary {
  dsa: { completed: number; total: number; percent: number };
  systemDesign: { completed: number; total: number; percent: number };
  patterns: { completed: number; total: number; percent: number };
  problemsSolved: number;
  problemsTotal: number;
  caseStudiesCompleted: number;
  streak: number;
  activeDays: number;
  weakAreas: { patternId: string; title: string; attempts: number; solved: number; solveRate: number }[];
  recent: { id: string; type: string; title: string; status: string; percent: number; updatedAt?: string }[];
  readiness: {
    score: number;
    band: string;
    breakdown: { dsaLessons: number; systemDesign: number; problemPractice: number };
  };
}

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  group?: string;
  snippet: string;
  score: number;
}

export interface QuizResult {
  contentId: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  results: {
    questionId: string;
    given: number | null;
    correctIndex: number;
    correct: boolean;
    explanation: string;
  }[];
}

// --------------------------------------------------------------- interview prep

export type InterviewLevel = 'junior' | 'mid' | 'senior';
export type InterviewQuestionType = 'concept' | 'code' | 'scenario' | 'tradeoff' | 'behavioural';

export interface InterviewFollowUp {
  q: string;
  a: string;
}

export interface InterviewQuestion {
  id: string;
  level: InterviewLevel;
  type: InterviewQuestionType;
  question: string;
  answer: string;
  keyPoints: string[];
  followUps: InterviewFollowUp[];
  redFlags: string[];
  codeExample?: CodeBlock;
  related?: string[];
  /** Denormalised by the loader so a question served on its own knows where it came from. */
  trackId: string;
  topic: string;
  setId: string;
}

export interface QuestionSet {
  id: string;
  trackId: string;
  topic: string;
  title: string;
  summary: string;
  questions: InterviewQuestion[];
}

export interface InterviewTopic {
  id: string;
  setId: string;
  title: string;
  summary: string;
  questions: number;
  levels: Record<InterviewLevel, number>;
}

export interface InterviewTrack {
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
  summary: string;
  audience: string;
  topics: string[] | InterviewTopic[];
  questionCount: number;
  levels: Record<InterviewLevel, number>;
}
