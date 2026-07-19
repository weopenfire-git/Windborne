import type { Metadata } from 'next';
import { Orbitron, Exo_2, Roboto_Mono, Noto_Sans_SC } from 'next/font/google';
import './globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-exo2',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Windborne · 飞行日志',
  description: '飞友的云端飞行日志与交流社区',
  keywords: ['飞行日志', '飞友', '航班记录', '航空', 'Windborne'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${orbitron.variable} ${exo2.variable} ${robotoMono.variable} ${notoSansSC.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
