// Lesson generation settings. They are read only on the server, from environment variables: the
// API key never reaches the browser, and the public catalogue only says whether generation is on.

export interface GenerationConfig {
  apiKey: string;
  model: string;
  /** Let the API retry on another model when the requested one cannot serve the request. */
  fallbacks: boolean;
}

/** Names of the settings still missing (names only, never values). */
export function missingSettings(): string[] {
  return ['ANTHROPIC_API_KEY', 'LESSON_MODEL'].filter((name) => !process.env[name]);
}

export function generationConfig(): GenerationConfig | null {
  if (process.env.LESSON_GENERATION === 'off' || missingSettings().length) return null;
  return {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: process.env.LESSON_MODEL!,
    fallbacks: process.env.LESSON_FALLBACKS !== 'off',
  };
}

export function generationStatus(): { enabled: boolean } {
  return { enabled: generationConfig() !== null };
}
