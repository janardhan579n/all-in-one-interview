#!/usr/bin/env node
/**
 * Copies ../content into src/content-bundle so the frontend can run with no backend.
 *
 * Why a copy rather than importing across the repo boundary: Vite will not resolve
 * `import.meta.glob` outside its project root without loosening fs.allow, and a build
 * artefact that depends on a relative path outside the package is fragile. Copying is
 * boring, explicit, and works identically in dev, build, test and Docker.
 *
 * Wired to predev and prebuild, so the bundle can never silently go stale.
 */
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '..', '..', 'content');
const target = resolve(here, '..', 'src', 'content-bundle');

if (!existsSync(source)) {
  console.error(`[sync-content] Content directory not found at ${source}`);
  console.error('[sync-content] Run this from the frontend/ directory of the monorepo.');
  process.exit(1);
}

/**
 * Clear the previous copy so a deleted content file does not linger in the bundle.
 *
 * This is best-effort on purpose. The directory can contain files this process is not allowed
 * to unlink — a macOS `.DS_Store` written by Finder is the common one, and on a sandboxed or
 * read-only mount the unlink fails outright. Aborting the whole build over an OS junk file
 * would be absurd, so a failure here downgrades to a warning: every content file is copied
 * over the top regardless, and the only thing at risk is a stale copy of content that was
 * deleted upstream — which the warning tells you to clear by hand.
 */
try {
  await rm(target, { recursive: true, force: true });
} catch (error) {
  console.warn(`[sync-content] Could not clear ${target} (${error.code ?? error.message}).`);
  console.warn('[sync-content] Copying over the existing bundle instead; delete it by hand if content was removed.');
}

await mkdir(target, { recursive: true });

// Skip OS metadata: .DS_Store files are not content and confuse anything that walks the tree.
await cp(source, target, {
  recursive: true,
  filter: (path) => !path.endsWith('.DS_Store'),
});

async function countJson(dir) {
  let count = 0;
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) count += await countJson(full);
    else if (entry.endsWith('.json')) count += 1;
  }
  return count;
}

const total = await countJson(target);
console.log(`[sync-content] Copied ${total} content files into src/content-bundle`);
