/**
 * Runs every check under tests/ in one go: `npm test`.
 *
 * These are plain node scripts rather than a framework because the things
 * worth guarding here are cross-file contracts — the client form validator
 * against the server's, and the driver's SQL against the driver UI. A test
 * runner that needs jsdom and a component tree would not check the actual
 * contract any better; reading the same source the two sides run on does.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

const files = readdirSync(here)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort();

if (!files.length) {
  console.log('No tests found in tests/.');
  process.exit(0);
}

let failed = 0;
const failedNames = [];

for (const file of files) {
  console.log('\n' + '='.repeat(64));
  console.log('  ' + file);
  console.log('='.repeat(64));
  const result = spawnSync(process.execPath, [path.join(here, file)], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed++;
    failedNames.push(file);
  }
}

console.log('\n' + '='.repeat(64));
if (failed) {
  console.log(`  ${failed} of ${files.length} test file(s) failed:`);
  for (const name of failedNames) console.log('    - ' + name);
  console.log('='.repeat(64));
  process.exitCode = 1;
} else {
  console.log(`  All ${files.length} test files pass.`);
  console.log('='.repeat(64));
}
