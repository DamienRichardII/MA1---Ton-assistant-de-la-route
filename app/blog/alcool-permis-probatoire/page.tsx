import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Alcool et permis probatoire : les règles en 2026',
  description: "Taux d'alcoolémie autorisé, sanctions, conduite accompagnée. Tout ce qu'un jeune conducteur doit savoir.",
  openGraph: { title: "Alcool et permis probatoire : les règles en 2026", description: "Taux d'alcoolémie autorisé, sanctions, conduite accompagnée. Tout ce qu'un jeune conducteur doit savoir." },
};

export default function Article() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <Link href="/blog" className="text-xs text-[#7ec8e3] hover:underline mb-4 inline-block">← Retour au blog</Link>
      <article>
        <h1 className="font-display text-2xl font-extrabold mb-4">Alcool et permis probatoire : les règles en 2026</h1>
        <div className="prose prose-invert text-sm leading-relaxed text-white/60 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#d0eaf2] [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-white/80 [&_ul]:pl-6 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: `<h2>Le taux d'alcoolemie en permis probatoire</h2>
<p>Depuis 2015, les conducteurs en permis probatoire sont soumis a un taux d'alcoolemie maximal de <strong>0,2 g/L de sang</strong> (soit 0,1 mg/L d'air expire). En pratique, cela signifie <strong>zero verre d'alcool</strong>.</p>
<h2>Les sanctions</h2>
<p>Le depassement du seuil de 0,2 g/L en probatoire entraine : une amende forfaitaire de 135€, le retrait de 6 points sur 6, et une suspension de permis pouvant aller jusqu'a 3 ans.</p>
<h2>Et les stupefiants ?</h2>
<p>La conduite sous l'emprise de stupefiants est un delit passible de 2 ans d'emprisonnement et 4 500€ d'amende, independamment du statut probatoire.</p>` }} />
      </article>
      <div className="mt-10 p-6 rounded-2xl bg-[rgba(58,157,176,0.06)] border border-[rgba(58,157,176,0.15)] text-center">
        <p className="font-display font-bold text-base mb-2">Testez vos connaissances</p>
        <p className="text-sm text-white/40 mb-4">Lancez un QCM sur le theme &laquo; alcool &raquo; avec MA1</p>
        <Link href="/qcm" className="inline-block px-6 py-2.5 rounded-full bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] text-white font-display font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all">
          Lancer un QCM
        </Link>
      </div>
    </div>
  );
}
