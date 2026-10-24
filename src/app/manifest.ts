import type { MetadataRoute } from 'next';

// Lets Safari's File > Add to Dock (or a browser's Install option) open the app in its own window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Journal',
    short_name: 'Journal',
    description: 'One jazz standard each week and one lick each day, with notation, tab, audio, fretboard and analysis.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
