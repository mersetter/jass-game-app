import JassApp from '@/components/JassApp';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JASS.IO - Schweizer Kartenspiel Online',
  description: 'Spiele Schieber Jass online mit Freunden. Premium Swiss Card Game mit Echtzeit-Multiplayer.',
  keywords: ['Jass', 'Schieber', 'Kartenspiel', 'Schweiz', 'Online', 'Multiplayer'],
  authors: [{ name: 'JASS.IO' }],
  openGraph: {
    title: 'JASS.IO - Schweizer Kartenspiel Online',
    description: 'Spiele Schieber Jass online mit Freunden.',
    type: 'website',
  },
};

export default function Home() {
  return <JassApp />;
}
