/**
 * The AI tutor seam.
 *
 * TODO: no tutor is implemented in v1, deliberately (§46, ADR-008). The platform must run free,
 * offline and with no API key, and a "tutor" that pattern-matches canned strings would be worse
 * than none: it teaches learners to trust an explanation that was never reasoned.
 *
 * This file exists so that adding one later is a local change. Everything the UI needs is the
 * `Tutor` interface and `isTutorAvailable()`; no page imports a provider directly, so a local
 * model (Ollama, llama.cpp, WebLLM) or a hosted API can be dropped in by writing one provider
 * and calling `setTutor()` once at startup.
 *
 * The rule for whoever implements it: the tutor is an *addition*, never a dependency. Every
 * explanation a learner needs is already written in the content library. If the tutor is
 * absent — and by default it is — no affordance appears and nothing degrades.
 */

export interface TutorQuestion {
  /** What the learner asked, in their words. */
  prompt: string;
  /** Where they asked it: a lesson, problem, concept or case-study id. */
  contentId?: string;
  /** 'beginner' asks for an everyday analogy; 'interview' asks for the language an interviewer expects. */
  register?: 'beginner' | 'interview';
  /** Content the tutor may ground its answer in. Grounding is required: no free-floating claims. */
  context?: string;
}

export interface TutorAnswer {
  text: string;
  /** Ids of the content documents the answer was grounded in, so the learner can go and read them. */
  sources?: string[];
}

export interface Tutor {
  /** Human-readable, shown in the UI so the learner always knows what is answering them. */
  readonly name: string;
  ask(question: TutorQuestion, signal?: AbortSignal): Promise<TutorAnswer>;
}

let tutor: Tutor | null = null;

/** Install a provider. Call once at startup; passing null removes it again. */
export function setTutor(provider: Tutor | null): void {
  tutor = provider;
}

/**
 * Whether a tutor is installed. The UI must check this before rendering any "ask" affordance —
 * a button that cannot answer is exactly the fake functionality this project refuses to ship.
 */
export function isTutorAvailable(): boolean {
  return tutor !== null;
}

export function tutorName(): string | null {
  return tutor?.name ?? null;
}

export async function ask(question: TutorQuestion, signal?: AbortSignal): Promise<TutorAnswer> {
  if (!tutor) {
    throw new Error('No tutor is installed. Check isTutorAvailable() before calling ask().');
  }
  return tutor.ask(question, signal);
}
