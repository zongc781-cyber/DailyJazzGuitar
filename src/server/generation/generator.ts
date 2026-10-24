// The replaceable part of lesson generation. Anything that can turn a LickPlan into lesson JSON can
// be a generator; the publish gate in pipeline.ts stays the same whichever one is used.

import type { LickPlan } from './plan';

export interface Draft {
  /** The lesson as parsed JSON. The pipeline fills in ids and provenance, then validates it. */
  json: unknown;
  /** Recorded as generator.version, e.g. the model that wrote this draft and the prompt version. */
  version: string;
}

/** One lesson's conversation with the generator: a first draft, then at most one revision. */
export interface GenerationSession {
  draft(): Promise<Draft>;
  /** Called with the publish gate's problems when the previous draft failed. */
  revise(problems: string[]): Promise<Draft>;
}

export interface LessonGenerator {
  /** Recorded as generator.service on every lesson it writes. */
  readonly service: string;
  start(plan: LickPlan): GenerationSession;
}

/** The reply could not be read as a lesson. The message is sent back to the generator. */
export class ReplyFormatError extends Error {}

/** The generator could not produce a reply at all (network, credentials, refusal). */
export class GeneratorUnavailableError extends Error {}
