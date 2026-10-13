import type { Metadata } from 'next';
import Link from 'next/link';
import { Scale, FileText, Lock, Receipt, Copyright } from 'lucide-react';
import { PageShell } from '@/components/web/ui';

export const metadata: Metadata = {
  title: 'Mentions légales — MA1',
  description: 'Mentions légales de MA1 — Ton assistant de la route.',
  alternates: { canonical: 'https://ma1.app/mentions-legales' },
};

const MENU = [
  { icon: Scale, label: 'Mentions légales', href: '/mentions-legales', active: true },
  { icon: FileText, label: "Conditions d'utilisation", href: '/legal/cgu.html' },
  { icon: Lock, label: 'Politique de confidentialité', href: '/legal/confidentialite.html' },
  { icon: Receipt, label: 'CGV', href: '/legal/cgv.html' },
  { icon: Copyright, label: 'Propriété intellectuelle', href: '#propriete-intellectuelle' },
];

// Maquette 08 — Mentions légales.
// Contenu repris à l'identique de public/legal/mentions-legales.html (source de vérité juridique).
// Les champs « [À compléter] » restent à renseigner par l'éditeur : aucune donnée n'est inventée ici.
export default function MentionsLegalesPage() {
  return (
    <PageShell>
      <section className="web-card grid overflow-hidden lg:grid-cols-[300px_1fr]">
        <nav className="border-slate-100 bg-[#f7faff] p-6 lg:border-r" aria-label="Documents légaux">
          <ul className="space-y-1">
            {MENU.map(({ icon: Icon, label, href, active }) => {
              const cls = `flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors ${active ? 'bg-ma1-blue-soft text-ma1-blue' : 'text-slate-600 hover:bg-white'}`;
              return <li key={label}>{href.startsWith('/legal') ? <a href={href} className={cls}><Icon size={17} />{label}</a> : <Link href={href} className={cls}><Icon size={17} />{label}</Link>}</li>;
            })}
          </ul>
        </nav>
        <article className="p-8 text-sm leading-relaxed text-slate-600 lg:p-12">
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ma1-ink">Mentions légales</h1>
          <p className="mt-1 text-xs text-slate-400">Dernière mise à jour : mars 2026</p>

          <h2 className="mt-9 font-display text-base font-bold text-ma1-ink">1. Éditeur du site</h2>
          <p className="mt-3">
            <strong>MA1 — Ton Assistant de la Route</strong><br />
            Édité par : DamCompany<br />
            Forme juridique : [À compléter — SAS / SARL / Auto-entrepreneur]<br />
            Siège social : [Adresse à compléter]<br />
            SIRET : [À compléter]<br />
            RCS : [À compléter]<br />
            Directeur de la publication : [Nom du responsable]<br />
            Email de contact : <a href="mailto:contact@ma1.app" className="text-ma1-blue hover:underline">contact@ma1.app</a>
          </p>

          <h2 className="mt-9 font-display text-base font-bold text-ma1-ink">2. Hébergeur</h2>
          <p className="mt-3">
            Le site est hébergé par :<br />
            <strong>Vercel Inc.</strong><br />
            340 S Lemon Ave #4133, Walnut, CA 91789, USA<br />
            Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-ma1-blue hover:underline">vercel.com</a>
          </p>

          <h2 id="propriete-intellectuelle" className="mt-9 scroll-mt-28 font-display text-base font-bold text-ma1-ink">3. Propriété intellectuelle</h2>
          <p className="mt-3">L&apos;ensemble du contenu du site (textes, graphismes, logo, code source) est la propriété exclusive de DamCompany ou de ses partenaires. Toute reproduction, représentation ou diffusion, totale ou partielle, est interdite sans autorisation préalable.</p>
          <p className="mt-3">Les questions QCM sont générées par intelligence artificielle et sont des créations originales. Elles ne reproduisent aucune question existante protégée par le droit d&apos;auteur.</p>

          <h2 className="mt-9 font-display text-base font-bold text-ma1-ink">4. Nature du service</h2>
          <p className="mt-3"><strong>MA1 est un outil pédagogique d&apos;aide à la révision du Code de la Route.</strong> Il ne se substitue pas à une formation en auto-école agréée. Les informations fournies par l&apos;IA sont données à titre indicatif et ne constituent pas un conseil juridique. L&apos;utilisateur est invité à vérifier les informations auprès des textes officiels (Légifrance) et de son auto-école.</p>

          <h2 className="mt-9 font-display text-base font-bold text-ma1-ink">5. Crédits</h2>
          <p className="mt-3">Intelligence artificielle : Claude (Anthropic)<br />Sources juridiques : Légifrance (textes officiels du Code de la Route)<br />Design &amp; développement : DamCompany</p>
        </article>
      </section>
    </PageShell>
  );
}
