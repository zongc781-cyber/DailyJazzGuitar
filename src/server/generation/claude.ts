// Lesson generator backed by the Claude API. Server only: the API key comes from the environment
// (see config.ts) and is never sent to the browser.

import Anthropic from '@anthropic-ai/sdk';
import type { BetaContentBlockParam, BetaMessage, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import type { GenerationConfig } from './config';
import { GeneratorUnavailableError, type Draft, type GenerationSession, type LessonGenerator } from './generator';
import type { LickPlan } from './plan';
import { PROMPT_VERSION, briefMessage, parseLessonReply, revisionMessage, systemPrompt } from './prompt';

export class ClaudeLessonGenerator implements LessonGenerator {
  readonly service = 'Claude API';
  private readonly client: Anthropic;

  constructor(
    private readonly config: GenerationConfig,
    client?: Anthropic,
  ) {
    // A lesson takes a few minutes to write and check, so allow long requests.
    this.client = client ?? new Anthropic({ apiKey: config.apiKey, maxRetries: 3, timeout: 15 * 60 * 1000 });
  }

  start(plan: LickPlan): GenerationSession {
    const messages: BetaMessageParam[] = [{ role: 'user', content: briefMessage(plan) }];
    const ask = async (): Promise<Draft> => {
      const message = await this.send(messages);
      // The reply goes back unchanged (thinking blocks included) so a revision continues from it.
      messages.push({ role: 'assistant', content: message.content as BetaContentBlockParam[] });
      const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
      return { json: parseLessonReply(text), version: `${message.model}, prompt ${PROMPT_VERSION}` };
    };
    return {
      draft: ask,
      revise: (problems) => {
        messages.push({ role: 'user', content: revisionMessage(problems) });
        return ask();
      },
    };
  }

  private async send(messages: BetaMessageParam[]): Promise<BetaMessage> {
    let message: BetaMessage;
    try {
      const stream = this.client.beta.messages.stream({
        model: this.config.model,
        max_tokens: 64000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        ...(this.config.fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        // The instructions and format reference are identical for every lesson, so cache them.
        system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages,
      });
      message = await stream.finalMessage();
    } catch (e) {
      throw new GeneratorUnavailableError(describeError(e));
    }
    if (message.stop_reason === 'refusal') {
      const why = message.stop_details?.explanation;
      throw new GeneratorUnavailableError(`The model declined to write this lesson${why ? `: ${why}` : '.'}`);
    }
    if (message.stop_reason === 'max_tokens') throw new GeneratorUnavailableError('The reply was cut off before the lesson was complete.');
    return message;
  }
}

function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return 'The API key was rejected (401). Check ANTHROPIC_API_KEY.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key may not use the configured model (403). Check LESSON_MODEL.';
  if (e instanceof Anthropic.NotFoundError) return 'The configured model was not found (404). Check LESSON_MODEL.';
  if (e instanceof Anthropic.RateLimitError) return 'The API is rate limiting requests (429). Try again later.';
  if (e instanceof Anthropic.APIConnectionError) return 'Could not reach the API.';
  if (e instanceof Anthropic.APIError) return `The API returned an error${e.status ? ` (${e.status})` : ''}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}
