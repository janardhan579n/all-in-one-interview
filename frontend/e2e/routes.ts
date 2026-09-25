import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_TSX = path.resolve(__dirname, '../src/App.tsx');

/**
 * Real content ids to fill in each dynamic route segment, keyed by the route *pattern* exactly
 * as it appears in `App.tsx`.
 *
 * Routes themselves are enumerated from `App.tsx` at test time (see `enumerateRoutes` below) so
 * a new or renamed route is picked up automatically. What cannot be discovered automatically is
 * a real id that route accepts — that needs one entry here. If `App.tsx` gains a `:param` route
 * with no matching entry, `enumerateRoutes` throws with a message naming the pattern, rather than
 * silently skipping it — a missing mapping is a gap in this suite, not a route to ignore.
 */
const SAMPLE_IDS: Record<string, string> = {
  '/dsa/:id': '/dsa/two-pointers',
  '/system-design/case-studies/:id': '/system-design/case-studies/chat-application',
  '/system-design/:id': '/system-design/cache',
  '/interview/tracks/:id': '/interview/tracks/java',
  '/interview/sets/:id': '/interview/sets/java-collections',
  '/interview/:id': '/interview/chat-application',
  '/paths/:id': '/paths/system-design-senior',
  '/problems/:id': '/problems/two-sum',
};

export interface RouteCase {
  /** The pattern exactly as declared in App.tsx, e.g. "/problems/:id" or "*". */
  pattern: string;
  /** A concrete, navigable path — the pattern with any :param filled in. */
  path: string;
}

/**
 * Reads the routes straight out of `<Route path="...">` in App.tsx, so this list can't drift
 * from the router the way a hand-copied one would.
 */
export function enumerateRoutes(): RouteCase[] {
  const source = readFileSync(APP_TSX, 'utf-8');
  const matches = [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
  if (matches.length === 0) {
    throw new Error(`No <Route path="..."> found in ${APP_TSX} — did the router move?`);
  }

  return matches.map((pattern): RouteCase => {
    if (pattern === '*') {
      return { pattern, path: '/this-route-does-not-exist-e2e' };
    }
    if (pattern.includes(':')) {
      const concrete = SAMPLE_IDS[pattern];
      if (!concrete) {
        throw new Error(
          `Route "${pattern}" has a dynamic segment with no sample id in e2e/routes.ts (SAMPLE_IDS). ` +
            'Add one so this suite can actually navigate to it.',
        );
      }
      return { pattern, path: concrete };
    }
    return { pattern, path: pattern };
  });
}
