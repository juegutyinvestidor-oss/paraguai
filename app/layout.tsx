import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'EDUKYNE',
  description: 'Executive portal for student management, attendance control, academic performance, and modal activities.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0b1326',
  colorScheme: 'dark',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-br" className="h-full">
      <body suppressHydrationWarning className="h-full bg-[#0b1326] text-[#dae2fd] antialiased">{children}</body>
    </html>
  );
}
