import type { Metadata, Viewport } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const repositoryOwner = process.env.GITHUB_REPOSITORY?.split('/')[0] || 'jonatanoficial-bit';
const siteOrigin = process.env.GITHUB_PAGES === 'true'
  ? `https://${repositoryOwner}.github.io`
  : 'https://atlas-operations-airline.empengenhariadaprodu.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(`${siteOrigin}${basePath}/`),
  title: 'Atlas Operations — Airline Tycoon',
  description: 'Simulador persistente de administração de companhia aérea.',
  manifest: `${basePath}/manifest.webmanifest`,
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

export const viewport: Viewport = {
  themeColor: '#071a2f',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
