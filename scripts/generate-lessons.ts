// Writes new daily licks with the lesson generator and publishes the ones that pass the gate to
// content/generated (or GENERATED_LESSONS_DIR). Commit the files to ship them with the app.
//
//   npm run generate                 one lick
//   npm run generate -- --count 3    three licks, each planned after the one before is saved
//   npm run generate -- --dry-run    print the lesson instead of saving it
//
// Reads ANTHROPIC_API_KEY and LESSON_MODEL from the environment or from .env.local.

import { createGenerator, generateNextLick } from '../src/server/generation';

try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local: use the environment as it is
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countArg = args.indexOf('--count');
const count = countArg >= 0 ? Number(args[countArg + 1]) : 1;
if (!Number.isInteger(count) || count < 1 || count > 20) {
  console.error('--count must be a whole number from 1 to 20');
  process.exit(2);
}

let failed = 0;
for (let i = 1; i <= count; i++) {
  const result = await generateNextLick({ generator: createGenerator(), dryRun });
  const where = result.plan ? `${result.plan.standard.title}, bars ${result.plan.bars.join('–')}, in the style of ${result.plan.guitarist.name}` : '';
  if (result.ok) {
    console.log(`${dryRun ? 'PASSED (dry run, not saved)' : 'PUBLISHED'} ${result.lesson.id}: "${result.lesson.title}" (${where}; attempt ${result.attempts})`);
    if (dryRun) console.log(JSON.stringify(result.lesson, null, 2));
  } else {
    failed++;
    console.error(`NOT PUBLISHED (${result.stage})${where ? ` ${where}` : ''}:`);
    for (const e of result.errors) console.error(`  ${e}`);
    if (result.stage !== 'validate') break; // configuration or network problems will not fix themselves
  }
}
process.exit(failed ? 1 : 0);
