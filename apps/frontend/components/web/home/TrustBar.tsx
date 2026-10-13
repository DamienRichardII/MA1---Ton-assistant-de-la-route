import { Zap, Mail, MonitorSmartphone, CreditCard } from 'lucide-react';
import { CBLogo, VisaLogo, MastercardLogo } from '../brand-icons';

/** Bande de réassurance : 4 éléments séparés par des filets verticaux. */
export function TrustBar() {
  const Item = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-3.5 px-5 py-3 md:py-0"><span className="text-[var(--h-accent)]">{icon}</span>
      <div><div className="text-[11.5px] font-bold text-[var(--h-text)]">{title}</div><div className="text-[10.5px] text-[var(--h-muted)]">{children}</div></div></div>
  );
  return (
    <section className="mx-auto mt-3 w-full max-w-[1500px] px-6 md:px-10" aria-label="Nos garanties">
      <div className="grid rounded-[14px] border border-[var(--h-card-line)] bg-[var(--h-card)] shadow-[var(--h-card-shadow)] backdrop-blur-md md:min-h-[68px] md:grid-cols-4 md:divide-x md:divide-[var(--h-card-line)]">
        <Item icon={<CreditCard size={30} strokeWidth={1.6} />} title="Paiement 100 % sécurisé">
          <span className="mt-0.5 flex items-center gap-2"><CBLogo className="h-[15px]" /><VisaLogo className="h-[13px]" /><MastercardLogo className="h-[15px]" /></span>
        </Item>
        <Item icon={<Zap size={30} strokeWidth={1.6} />} title="Accès immédiat">Commence tout de suite</Item>
        <Item icon={<Mail size={30} strokeWidth={1.6} />} title="Notifications par email">Suivi de progression et rappels</Item>
        <Item icon={<MonitorSmartphone size={30} strokeWidth={1.6} />} title="Compatible tous appareils">PC, tablette et mobile</Item>
      </div>
    </section>
  );
}
