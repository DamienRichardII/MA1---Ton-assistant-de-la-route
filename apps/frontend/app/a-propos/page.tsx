import type { Metadata } from 'next';
import Image from 'next/image';
import { Shield, LayoutGrid, CalendarDays, FileText } from 'lucide-react';
import { PageShell } from '@/components/web/ui';

export const metadata: Metadata = {
  title: 'À propos de MA1 — Ton assistant IA du Code de la Route',
  description: "MA1 est né d'une volonté simple : rendre la préparation au permis de conduire plus accessible, plus efficace et plus moderne grâce à l'IA.",
  alternates: { canonical: 'https://ma1.app/a-propos' },
};

// Chiffres issus du produit (pas de chiffre d'audience tant que le lancement n'a pas eu lieu).
const STATS = [
  { icon: Shield, value: '10', label: 'questions IA gratuites par jour' },
  { icon: LayoutGrid, value: '9', label: 'thèmes de révision' },
  { icon: CalendarDays, value: '30', label: 'jours de plan structuré' },
  { icon: FileText, value: '40', label: 'questions par examen blanc' },
];

// Maquette 06 — À propos
export default function AProposPage() {
  return (
    <PageShell>
      <section className="web-card relative overflow-hidden lg:min-h-[560px]">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-[#eaf2ff] to-[#cfe0ff]" />
        <div className="absolute right-0 top-0 hidden h-full w-[55%] lg:block">
          <div className="absolute inset-0 bg-gradient-to-l from-[#9fc2ff]/50 to-transparent" />
          <Image src="/ma1-logo.jpeg" alt="" width={340} height={340} aria-hidden className="absolute right-20 top-16 rounded-[56px] opacity-95 shadow-[0_30px_70px_rgba(11,26,51,0.35)]" />
        </div>
        <div className="relative z-10 flex flex-col gap-7 p-8 lg:max-w-[640px] lg:p-14">
          <h1 className="font-display text-[40px] font-extrabold tracking-tight">À propos de MA1</h1>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-slate-600">
            MA1 est né d&apos;une volonté simple : rendre la préparation au permis de conduire plus accessible, plus efficace et plus moderne grâce à l&apos;intelligence artificielle.
          </p>
          <div className="web-card grid grid-cols-2 gap-5 p-6 sm:grid-cols-4">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <Icon size={22} className="text-ma1-blue" />
                <div className="font-display text-2xl font-extrabold">{value}</div>
                <div className="text-[11px] leading-tight text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[20px] bg-gradient-to-br from-[#0b1d3d] to-[#071329] p-7 text-white shadow-xl">
            <h2 className="font-display text-lg font-bold">Notre mission</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Accompagner chaque apprenant, chaque moniteur et chaque auto-école vers la réussite du permis de conduire.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
