import { describe, expect, it } from 'vitest';
import { usesExplanationMode } from './AppShell';

/**
 * The Beginner/Interview toggle is rendered only where it changes something.
 *
 * Getting this predicate wrong is invisible: too broad and the control is back to doing nothing
 * on most pages, too narrow and it vanishes from a page that genuinely has two registers. Both
 * failures look like "the header is fine" to anyone not clicking through all 21 routes.
 */
describe('which pages offer the explanation-mode toggle', () => {
  it('offers it on lesson and concept pages, which are the two that read the mode', () => {
    expect(usesExplanationMode('/dsa/two-pointers')).toBe(true);
    expect(usesExplanationMode('/dsa/sliding-window')).toBe(true);
    expect(usesExplanationMode('/system-design/cache')).toBe(true);
    expect(usesExplanationMode('/system-design/consistent-hashing')).toBe(true);
  });

  it('hides it everywhere the mode is ignored', () => {
    for (const path of [
      '/',
      '/dsa',
      '/problems',
      '/problems/two-sum',
      '/system-design',
      '/system-design/case-studies',
      '/system-design/case-studies/url-shortener',
      '/practice',
      '/interview',
      '/interview/tracks',
      '/interview/tracks/java-spring',
      '/interview/drill',
      '/progress',
      '/bookmarks',
      '/search',
      '/pattern-map',
      '/paths/system-design-senior',
    ]) {
      expect(usesExplanationMode(path), `${path} should not show the toggle`).toBe(false);
    }
  });
});
