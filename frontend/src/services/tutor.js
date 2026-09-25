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
let tutor = null;
/** Install a provider. Call once at startup; passing null removes it again. */
export function setTutor(provider) {
    tutor = provider;
}
/**
 * Whether a tutor is installed. The UI must check this before rendering any "ask" affordance —
 * a button that cannot answer is exactly the fake functionality this project refuses to ship.
 */
export function isTutorAvailable() {
    return tutor !== null;
}
export function tutorName() {
    return tutor?.name ?? null;
}
export async function ask(question, signal) {
    if (!tutor) {
        throw new Error('No tutor is installed. Check isTutorAvailable() before calling ask().');
    }
    return tutor.ask(question, signal);
}
