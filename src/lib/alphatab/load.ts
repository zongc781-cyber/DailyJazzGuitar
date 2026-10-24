'use client';

// Loads alphaTab's browser build from public/vendor/alphatab/<version>/ with a native dynamic
// import. The bundler never sees alphaTab, so its worker and audio worklet load next to the module
// exactly as alphaTab expects, with no bundler plugin.

import vendor from '@/generated/alphatab.json';

export type AlphaTab = typeof import('@coderline/alphatab');
type EngravingSettings = import('@coderline/alphatab').EngravingSettings;

export const ALPHATAB_BASE: string = vendor.base;
export const ALPHATAB_VERSION: string = vendor.version;
/** Petaluma, the handwritten music font the score is drawn in, and its SMuFL metrics. */
export const MUSIC_FONT_BASE: string = vendor.musicFont;

let modulePromise: Promise<AlphaTab> | null = null;

export function loadAlphaTab(): Promise<AlphaTab> {
  modulePromise ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ALPHATAB_BASE}alphaTab.min.mjs`).catch((e: unknown) => {
    modulePromise = null; // let a later attempt retry
    throw e;
  }) as Promise<AlphaTab>;
  return modulePromise;
}

let engravingPromise: Promise<EngravingSettings> | null = null;

/** alphaTab's engraving settings for Petaluma, read from the font's SMuFL metrics. */
export function loadEngraving(at: AlphaTab): Promise<EngravingSettings> {
  engravingPromise ??= fetch(`${MUSIC_FONT_BASE}metadata.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`The music font metrics did not load (${r.status}).`);
      return r.json();
    })
    .then((metrics) => {
      const engraving = new at.EngravingSettings();
      // Petaluma has no cluster noteheads, arrowheads, cymbal or chord-diagram symbols. No lesson
      // uses them, so alphaTab's warnings about them are not shown.
      const level = at.Logger.logLevel;
      at.Logger.logLevel = at.LogLevel.Error;
      try {
        engraving.fillFromSmufl(metrics);
      } finally {
        at.Logger.logLevel = level;
      }
      return engraving;
    })
    .catch((e: unknown) => {
      engravingPromise = null;
      throw e;
    });
  return engravingPromise;
}
