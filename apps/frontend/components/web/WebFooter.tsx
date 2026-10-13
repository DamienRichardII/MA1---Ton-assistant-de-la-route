import Link from 'next/link';
import { Logo } from './WebHeader';

const COLS = [
  { title: 'Produit', links: [['Espace apprenti', '/apprenti'], ['Espace moniteur', '/moniteur'], ['Espace auto-école', '/auto-ecole'], ['Tarifs', '/abonnement']] },
  { title: 'MA1', links: [['À propos', '/a-propos'], ['Comment utiliser MA1', '/utilisation'], ['Contact', '/contact']] },
  { title: 'Légal', links: [['Mentions légales', '/mentions-legales'], ['CGU', '/legal/cgu.html'], ['CGV', '/legal/cgv.html'], ['Confidentialité', '/legal/confidentialite.html']] },
];

export function WebFooter() {
  return (
    <footer className="mt-8 border-t border-[var(--h-card-line,rgba(148,163,184,.3))] bg-[var(--h-card,rgba(255,255,255,.7))] px-6 py-10">
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 gap-8 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-10">
        <div className="col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[var(--h-muted,#64748b)]">
            L&apos;assistant IA qui t&apos;accompagne vers la réussite du Code de la Route. Outil pédagogique : vérifiez toujours sur Légifrance.
          </p>
        </div>
        {COLS.map(c => (
          <div key={c.title}>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--h-text,#0b1a33)]">{c.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  {href.endsWith('.html')
                    ? <a href={href} className="text-[13px] text-[var(--h-muted,#64748b)] hover:text-[var(--h-accent,#1553e0)]">{label}</a>
                    : <Link href={href} className="text-[13px] text-[var(--h-muted,#64748b)] hover:text-[var(--h-accent,#1553e0)]">{label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-[1240px] border-t border-[var(--h-card-line,rgba(148,163,184,.3))] pt-6 text-xs text-[var(--h-muted,#94a3b8)]">
        © {new Date().getFullYear()} DamCompany — MA1, Ton Assistant de la Route
      </p>
    </footer>
  );
}
