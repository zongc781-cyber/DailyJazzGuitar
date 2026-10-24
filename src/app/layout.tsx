import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { STORAGE_KEY } from '@/lib/progress/state';
import './globals.css';

// Instrument Sans for everything, from the very large titles down (its width axis narrows the
// biggest ones), and Petaluma Script (Steinberg's Real Book-style handwriting) for chord symbols.
// Both are OFL and served locally.
const sans = localFont({
  src: [
    { path: '../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-normal.woff2', weight: '400 700', style: 'normal' },
    { path: '../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-standard-italic.woff2', weight: '400 700', style: 'italic' },
  ],
  variable: '--font-sans',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 100%' }],
});

const hand = localFont({
  src: '../../node_modules/@vexflow-fonts/petalumascript/petalumascript.woff2',
  variable: '--font-hand',
  weight: '400',
  display: 'swap',
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: 'Journal', template: '%s · Journal' },
  description: 'One jazz standard each week and one lick each day, with notation, tab, audio, fretboard and analysis.',
  applicationName: 'Journal',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1033' },
  ],
};

// Runs before the first paint so a saved light or dark choice never flashes the other theme.
const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}").prefs,t=p&&p.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${hand.variable}`} suppressHydrationWarning>
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
