import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Starfield } from '@/components/ui/Starfield';
import { AmbientGlow } from '@/components/ui/AmbientGlow';
import { Header } from '@/components/ui/Header';
import { MobileNav } from '@/components/ui/MobileNav';
import { XPToast } from '@/components/gamification/XPToast';
import { RGPDBanner } from '@/components/ui/RGPDBanner';
import { Onboarding } from '@/components/ui/Onboarding';
import { NotificationPrompt } from '@/components/ui/NotificationPrompt';
import { PresenceTracker } from '@/components/ui/PresenceTracker';
import { HeartbeatPing } from '@/components/presence/HeartbeatPing';
import { SessionRestore } from '@/components/auth/SessionRestore';
import { WebFrame } from '@/components/web/WebFrame';

export const metadata: Metadata = {
  title: 'MA1 — Ton Assistant IA du Code de la Route',
  description: "L'IA qui t'aide à réussir ton Code de la Route. QCM adaptatifs, analyse de panneaux, examens blancs.",
  openGraph: {
    title: 'MA1 — Code de la Route',
    description: "Réussis ton permis du premier coup avec l'IA.",
    images: [{ url: 'https://ma-1-ton-assistant-de-la-route.vercel.app/ma1-logo.jpeg', width: 512, height: 512, alt: 'MA1 Logo' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'MA1 — Code de la Route',
    description: "Réussis ton permis du premier coup avec l'IA.",
    images: ['https://ma-1-ton-assistant-de-la-route.vercel.app/ma1-logo.jpeg'],
  },
  manifest: '/manifest.json',
  themeColor: '#0a1628',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Mobile (< lg) : shell historique inchangé. Desktop (≥ lg) : site multipage (components/web/*).
  return (
    <html lang="fr">
      <body className="overflow-hidden lg:overflow-visible">
        <SessionRestore />
        <div className="lg:hidden"><Starfield /></div>
        <div className="lg:hidden"><Onboarding /></div>
        <NotificationPrompt />
        <PresenceTracker />
        <div className="lg:hidden"><AmbientGlow /></div>
        <XPToast />
        <div className="lg:hidden"><Header /></div>
        <div className="relative z-[1] grid grid-cols-1 h-[calc(100dvh-54px-56px)] lg:block lg:h-auto">
          <main className="flex flex-col h-full overflow-hidden lg:h-auto lg:overflow-visible">
            <WebFrame>{children}</WebFrame>
          </main>
        </div>
        <MobileNav />
        <RGPDBanner />
        {/* [Fix Admin realtime] Ping /presence/heartbeat toutes les 45s si connecté */}
        <HeartbeatPing />
      </body>
    </html>
  );
}
