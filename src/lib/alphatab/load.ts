'use client';

// Loads alphaTab's browser build from public/vendor/alphatab/<version>/ with a native dynamic
// import. The bundler never sees alphaTab, so its worker and audio worklet load next to the module
// exactly as alphaTab expects, with no bundler plugin.

import vendor from '@/generated/alphatab.json';

export type AlphaTab = typeof import('@coderline/alphatab');

export const ALPHATAB_BASE: string = vendor.base;
export const ALPHATAB_VERSION: string = vendor.version;

let modulePromise: Promise<AlphaTab> | null = null;

export function loadAlphaTab(): Promise<AlphaTab> {
  modulePromise ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ALPHATAB_BASE}alphaTab.min.mjs`).catch((e: unknown) => {
    modulePromise = null; // let a later attempt retry
    throw e;
  }) as Promise<AlphaTab>;
  return modulePromise;
}
