// Guitarists the generator writes "in the style of", with the vocabulary to draw on and recordings
// to point listeners to. The recordings are the lesson's sources, so the generator never has to
// cite anything itself: each entry here was checked by hand, and the links are the album pages the
// seed lessons already cite.

import type { Source } from '../../lib/music/types';

export interface Guitarist {
  name: string;
  /** Habits of the player, in plain words, for the generator to borrow from. */
  vocabulary: string;
  /** Feels this vocabulary suits. */
  feels: ('swing' | 'straight')[];
  recordings: Source[];
}

const wiki = (page: string) => `https://en.wikipedia.org/wiki/${page}`;

export const GUITARISTS: Guitarist[] = [
  {
    name: 'Wes Montgomery',
    vocabulary:
      'Thumb-picked single-note lines with a warm, round attack; short riff-like motifs that repeat and develop over the changes; blues inflections over minor chords; phrases that build in intensity.',
    feels: ['swing'],
    recordings: [{ title: 'The Incredible Jazz Guitar of Wes Montgomery', kind: 'recording', author: 'Wes Montgomery', year: 1960, detail: 'Riverside quartet album with Tommy Flanagan, Percy Heath and Albert Heath.' }],
  },
  {
    name: 'Grant Green',
    vocabulary:
      'Horn-like single-note lines with few chords; a short riff repeated against the changing harmony; blues phrasing and clear, even eighth notes; plenty of space between phrases.',
    feels: ['swing', 'straight'],
    recordings: [{ title: "Grant's First Stand", kind: 'recording', author: 'Grant Green', year: 1961, detail: 'Blue Note organ trio album with Baby Face Willette and Ben Dixon.' }],
  },
  {
    name: 'Kenny Burrell',
    vocabulary:
      'Blues-rooted lines; slides into target notes; call-and-response phrases where a short question is answered by a lower, longer phrase; relaxed, behind-the-beat placement.',
    feels: ['swing', 'straight'],
    recordings: [{ title: 'Midnight Blue', kind: 'recording', author: 'Kenny Burrell', year: 1963, url: wiki('Midnight_Blue_(Kenny_Burrell_album)'), detail: 'Blue Note album with Stanley Turrentine and Ray Barretto.' }],
  },
  {
    name: 'Joe Pass',
    vocabulary:
      'Long, flowing bebop eighth-note lines; chromatic approach notes and enclosures that put chord tones on strong beats; lines that descend through the changes and land on the 3rd of each new chord.',
    feels: ['swing'],
    recordings: [{ title: 'Virtuoso No. 4', kind: 'recording', author: 'Joe Pass', year: 1983, url: wiki('Virtuoso_No._4'), detail: 'Pablo; solo guitar, recorded in 1973.' }],
  },
  {
    name: 'Tal Farlow',
    vocabulary: 'Wide intervals and large leaps; chains of arpeggios run together; fast, clean runs that resolve with a half step into the next chord.',
    feels: ['swing'],
    recordings: [{ title: 'The Swinging Guitar of Tal Farlow', kind: 'recording', author: 'Tal Farlow', year: 1957, url: wiki('The_Swinging_Guitar_of_Tal_Farlow'), detail: 'Trio with Eddie Costa and Vinnie Burke.' }],
  },
  {
    name: 'Barney Kessel',
    vocabulary:
      'Bebop rooted in Charlie Christian; arpeggios built from the 3rd of a chord to sound its upper extensions; blues inflections; swinging, riff-like phrase endings.',
    feels: ['swing'],
    recordings: [{ title: 'Kessel Plays Standards', kind: 'recording', author: 'Barney Kessel', year: 1956, url: wiki('Kessel_Plays_Standards'), detail: 'Contemporary Records, recorded 1954–55.' }],
  },
  {
    name: 'Jimmy Raney',
    vocabulary: 'Long, smooth lines that flow from one chord into the next with clear voice leading; bebop-scale passing tones; a light, even touch.',
    feels: ['swing', 'straight'],
    recordings: [{ title: 'A', kind: 'recording', author: 'Jimmy Raney', year: 1957, url: wiki('A_(Jimmy_Raney_album)'), detail: 'Prestige sessions from 1954 and 1955.' }],
  },
  {
    name: 'Pat Martino',
    vocabulary:
      'Long, unbroken streams of eighth notes; thinking in minor: playing a minor sound over dominant chords (a minor chord a 5th above the dominant root); repeated rhythmic cells.',
    feels: ['swing', 'straight'],
    recordings: [{ title: 'El Hombre', kind: 'recording', author: 'Pat Martino', year: 1967, url: wiki('El_Hombre'), detail: 'His debut album as a leader, on Prestige.' }],
  },
  {
    name: 'George Benson',
    vocabulary: 'Fast bebop lines mixed with blues licks; dense chromatic enclosures; triplet runs into strong beats; a driving rhythmic feel.',
    feels: ['swing', 'straight'],
    recordings: [{ title: "It's Uptown", kind: 'recording', author: 'The George Benson Quartet', year: 1966, url: wiki('It%27s_Uptown'), detail: 'Columbia.' }],
  },
  {
    name: 'Charlie Byrd',
    vocabulary: 'Classical fingerstyle touch; bossa nova phrasing with syncopations that anticipate the beat; clear melodic lines built from chord tones.',
    feels: ['straight'],
    recordings: [{ title: 'Jazz Samba', kind: 'recording', author: 'Stan Getz and Charlie Byrd', year: 1962, url: wiki('Jazz_Samba'), detail: 'Verve.' }],
  },
  {
    name: 'Pat Metheny',
    vocabulary: 'Singing, legato lines with slides; major-key colours such as the 9th and #11; phrases shaped like a melody rather than a run.',
    feels: ['straight', 'swing'],
    recordings: [{ title: 'Bright Size Life', kind: 'recording', author: 'Pat Metheny', year: 1976, url: wiki('Bright_Size_Life'), detail: 'ECM trio album with Jaco Pastorius and Bob Moses.' }],
  },
];
