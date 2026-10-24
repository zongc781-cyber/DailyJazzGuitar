// Type declarations for index.mjs, the publish gate (Node only: it imports the alphaTab round trip).
import type { Report } from './lesson.mjs';
export * from './theory.mjs';
export * from './lesson.mjs';
export * from './transpose.mjs';
export * from './alphatex.mjs';
export { roundTrip, loadAlphaTab } from './roundtrip.mjs';
export function validateForPublish(lesson: unknown, options?: { library?: unknown[]; file?: string; alphaTab?: boolean }): Promise<Report>;
