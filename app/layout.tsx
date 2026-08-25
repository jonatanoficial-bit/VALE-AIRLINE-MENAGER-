import type { Metadata, Viewport } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const repositoryOwner = process.env.GITHUB_REPOSITORY?.split('/')[0] || 'jonatanoficial-bit';
const siteOrigin = process.env.GITHUB_PAGES === 'true'
  ? `https://${repositoryOwner}.github.io`
  : 'https://atlas-operations-airline.empengenhariadaprodu.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(`${siteOrigin}${basePath}/`),
  title: 'Vale Airline Manager',
  description: 'Simulador persistente e cinematográfico de administração de companhia aérea.',
  manifest: `${basePath}/manifest.webmanifest`,
  applicationName: 'Vale Airline Manager',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Vale Airline' },
  icons: {
    icon: [{ url: `${basePath}/icons/favicon-32.png`, sizes: '32x32', type: 'image/png' }],
    apple: [{ url: `${basePath}/icons/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Vale Airline Manager',
    description: 'Construa sua companhia, conecte sua malha e administre uma operação aérea persistente.',
    type: 'website',
    images: [`${basePath}/og.png`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vale Airline Manager',
    description: 'Construa sua companhia, conecte sua malha e administre uma operação aérea persistente.',
    images: [`${basePath}/og.png`],
  },
};

export const viewport: Viewport = {
  themeColor: '#071a2f',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
