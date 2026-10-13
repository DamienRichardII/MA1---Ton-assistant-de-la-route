import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageShell({ children }: { children: ReactNode }) {
  // Sous lg : conteneur scrollable (le shell mobile masque le débordement du <main>).
  return <div className="max-lg:h-full max-lg:overflow-y-auto max-lg:bg-[#eef3fb] max-lg:text-ma1-ink"><div className="mx-auto w-full max-w-[1240px] px-4 pb-6 pt-6 lg:px-6 lg:pt-8">{children}</div></div>;
}

export interface Feature { icon: LucideIcon; label: string; href?: string }

export function FeatureStrip({ items }: { items: Feature[] }) {
  return (
    <div className="web-card mt-6 grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ icon: Icon, label, href }) => {
        const inner = (
          <>
            <Icon size={26} strokeWidth={1.8} className="text-ma1-blue" />
            <span className="text-[13px] font-medium text-slate-600">{label}</span>
          </>
        );
        const cls = 'flex flex-col items-center gap-3 rounded-2xl px-3 py-6 transition-all hover:-translate-y-0.5 hover:bg-ma1-blue-soft';
        return href
          ? <Link key={label} href={href} className={cls}>{inner}</Link>
          : <div key={label} className={cls}>{inner}</div>;
      })}
    </div>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3.5">
      {items.map(t => (
        <li key={t} className="flex items-center gap-3 text-[15px] text-slate-600">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ma1-blue"><Check size={12} strokeWidth={3.5} className="text-white" /></span>{t}
        </li>
      ))}
    </ul>
  );
}

/** Héros « espace » (moniteur / apprenti / auto-école) : texte + visuel. */
export function SpaceHero({ icon: Icon, title, subtitle, items, primary, secondary, art }: {
  icon: LucideIcon; title: string; subtitle: string; items: string[];
  primary: { label: string; href: string }; secondary: { label: string; href: string }; art: ReactNode;
}) {
  const Cta = ({ href, className, children }: { href: string; className: string; children: ReactNode }) =>
    href.startsWith('mailto:') ? <a href={href} className={className}>{children}</a> : <Link href={href} className={className}>{children}</Link>;
  return (
    <section className="web-card grid overflow-hidden lg:min-h-[470px] lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col justify-center gap-6 p-8 lg:p-12">
        <div className="flex items-center gap-4">
          <Icon size={38} strokeWidth={1.6} className="text-ma1-blue" />
          <h1 className="font-display text-[34px] font-extrabold tracking-tight text-ma1-ink">{title}</h1>
        </div>
        <p className="-mt-2 text-[15px] font-semibold text-slate-700">{subtitle}</p>
        <CheckList items={items} />
        <div className="mt-2 grid max-w-[520px] grid-cols-2 gap-4">
          <Cta href={primary.href} className="web-btn-primary">{primary.label}</Cta>
          <Cta href={secondary.href} className="web-btn-outline">{secondary.label}</Cta>
        </div>
      </div>
      <div className="relative hidden p-4 lg:block">{art}</div>
    </section>
  );
}
