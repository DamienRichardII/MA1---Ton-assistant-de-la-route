import Link from 'next/link';
import { Logo } from './WebHeader';

const COLS = [
  { title: 'Produit', links: [['Espace apprenti', '/apprenti'], ['Espace moniteur', '/moniteur'], ['Espace auto-école', '/auto-ecole'], ['Tarifs', '/abonnement']] },
  { title: 'MA1', links: [['À propos', '/a-propos'], ['Comment utiliser MA1', '/utilisation'], ['Blog', '/blog'], ['Contact', '/contact']] },
  { title: 'Légal', links: [['Mentions légales', '/mentions-legales'], ['CGU', '/legal/cgu.html'], ['CGV', '/legal/cgv.html'], ['Confidentialité', '/legal/confidentialite.html']] },
];

export function WebFooter() {
  return (
    <footer className="mt-20 border-t border-slate-200/70 bg-white/70 px-6 py-12">
      <div className="mx-auto grid max-w-[1240px] grid-cols-[1.4fr_repeat(3,1fr)] gap-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-slate-500">
            L&apos;assistant IA qui t&apos;accompagne vers la réussite du Code de la Route. Outil pédagogique : vérifiez toujours sur Légifrance.
          </p>
        </div>
        {COLS.map(c => (
          <div key={c.title}>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-ma1-ink">{c.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  {href.endsWith('.html')
                    ? <a href={href} className="text-[13px] text-slate-500 hover:text-ma1-blue">{label}</a>
                    : <Link href={href} className="text-[13px] text-slate-500 hover:text-ma1-blue">{label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-[1240px] border-t border-slate-200/70 pt-6 text-xs text-slate-400">
        © {new Date().getFullYear()} DamCompany — MA1, Ton Assistant de la Route
      </p>
    </footer>
  );
}
