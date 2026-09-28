// Runs every check under tests/ in one go: `npm test`.
// Each file is a standalone node script that exits non-zero on failure.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const here = __dirname;
const files = fs.readdirSync(here).filter((f) => f.endsWith('.test.js')).sort();

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
