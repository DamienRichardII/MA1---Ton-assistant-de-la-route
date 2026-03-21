import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Starfield } from '@/components/ui/Starfield';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { Header } from '@/components/ui/Header';
import { Sidebar } from '@/components/ui/Sidebar';
import { RightPanel } from '@/components/ui/RightPanel';
import { MobileNav } from '@/components/ui/MobileNav';
import { XPToast } from '@/components/gamification/XPToast';
import { RGPDBanner } from '@/components/ui/RGPDBanner';
import { Onboarding } from '@/components/ui/Onboarding';
import { NotificationPrompt } from '@/components/ui/NotificationPrompt';

export const metadata: Metadata = {
  title: 'MA1 — Ton Assistant IA du Code de la Route',
  description: "L'IA qui t'aide à réussir ton Code de la Route. QCM adaptatifs, analyse de panneaux, examens blancs.",
  openGraph: { title: 'MA1 — Code de la Route', description: 'Réussis ton permis du premier coup avec l\'IA.' },
  manifest: '/manifest.json',
  themeColor: '#0a1628',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="overflow-hidden">
        <Starfield />
        <Onboarding />
        <NotificationPrompt />
        <AmbientGlow />
        <XPToast />
        <Header />
        <div className="relative z-[1] grid grid-cols-[215px_1fr_255px] h-[calc(100dvh-54px)] max-lg:grid-cols-1 max-lg:h-[calc(100dvh-54px-56px)]">
          <Sidebar />
          <main className="flex flex-col h-full overflow-hidden">
            {children}
          </main>
          <RightPanel />
        </div>
        <MobileNav />
        <RGPDBanner />
      </body>
    </html>
  );
}
