import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { STORAGE_KEY } from '@/lib/progress/state';
import './globals.css';

const fraunces = localFont({
  src: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-standard-normal.woff2',
  variable: '--font-fraunces',
  weight: '100 900',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
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
    { media: '(prefers-color-scheme: light)', color: '#f6f1e7' },
    { media: '(prefers-color-scheme: dark)', color: '#14120f' },
  ],
};

// Runs before the first paint so a saved light or dark choice never flashes the other theme.
const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}").prefs,t=p&&p.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
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
