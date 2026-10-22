import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { STORAGE_KEY } from '@/lib/progress/state';
import './globals.css';

// Instrument Serif for headlines, Instrument Sans for everything else, and Petaluma Script
// (Steinberg's Real Book-style handwriting) for chord symbols. All are OFL and served locally.
const serif = localFont({
  src: [
    { path: '../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

const sans = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2', weight: '400 700', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-italic.woff2', weight: '400 700', style: 'italic' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const hand = localFont({
  src: '../../node_modules/@vexflow-fonts/petalumascript/petalumascript.woff2',
  variable: '--font-hand',
  weight: '400',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: 'Daily Jazz Guitar', template: '%s · Daily Jazz Guitar' },
  description: 'One jazz standard each week and one lick each day, with notation, tab, audio, fretboard and analysis.',
  applicationName: 'Daily Jazz Guitar',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f2ea' },
    { media: '(prefers-color-scheme: dark)', color: '#111214' },
  ],
};

// Runs before the first paint so a saved light or dark choice never flashes the other theme.
const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}").prefs,t=p&&p.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
