import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atlas Operations — Airline Tycoon',
  description: 'Simulador persistente de administração de companhia aérea.',
  manifest: '/manifest.webmanifest',
  themeColor: '#071a2f',
  openGraph: {
    title: 'Atlas Operations — Airline Tycoon',
    description: 'Sua companhia. Sua malha. Seu mundo.',
    type: 'website',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atlas Operations — Airline Tycoon',
    description: 'Sua companhia. Sua malha. Seu mundo.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
