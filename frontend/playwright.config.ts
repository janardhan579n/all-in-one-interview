import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end suite for the production build.
 *
 * This complements, not duplicates, the Vitest unit suite (`npm test`): the unit tests cover
 * visualiser engines and content validation in isolation, while these tests boot the actual
 * built app in a real browser and click through it. See `frontend/e2e/README.md` for what each
 * spec covers.
 *
 * Chromium is preinstalled outside Playwright's own registry (PLAYWRIGHT_BROWSERS_PATH points at
 * a revision that predates this `@playwright/test` version), so every project launches it by an
 * explicit `executablePath` rather than by the revision Playwright would otherwise look for.
 */

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const CHROMIUM_EXECUTABLE = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: CHROMIUM_EXECUTABLE,
        },
      },
    },
  ],
  // A production build, served by `vite preview` — the same static-hosting shape the site is
  // actually deployed under (nginx/Netlify), including the SPA fallback that makes
  // `detectMode()` insist on a JSON body rather than trusting any 200 (see services/platform.ts).
  // `npm run build` runs first via the `pretest:e2e` script, not here, so a plain
  // `npx playwright test` against an already-built `dist/` does not pay for a rebuild it does
  // not need; `npm run test:e2e` always goes through the pretest hook.
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // No backend is started for this suite (see e2e/offline-mode.spec.ts) — disabling the
    // dev-time /api proxy makes `/api/health` fall through to the SPA fallback the same way a
    // real static deploy does, rather than the proxy's own connection failure. See
    // vite.config.ts.
    env: { VITE_DISABLE_API_PROXY: '1' },
  },
});
