// Entry point for lesson generation. To use another service, implement LessonGenerator
// (generator.ts) and return it from createGenerator(); the planner and publish gate stay as they are.

import { ClaudeLessonGenerator } from './claude';
import { generationConfig, missingSettings } from './config';
import type { LessonGenerator } from './generator';

export { generateNextLick, type GenerateResult } from './pipeline';
export { generationStatus } from './config';

export function createGenerator(): LessonGenerator {
  const config = generationConfig();
  if (!config) {
    const missing = missingSettings();
    throw new Error(missing.length ? `Lesson generation needs ${missing.join(' and ')} in the server environment.` : 'Lesson generation is turned off (LESSON_GENERATION=off).');
  }
  return new ClaudeLessonGenerator(config);
}
