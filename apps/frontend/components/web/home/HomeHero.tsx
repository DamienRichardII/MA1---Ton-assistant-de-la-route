import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScaledBox } from './ScaledBox';
import { Laptop, Phone } from './Devices';
import { HERO_PHOTO_LIGHT, HERO_PHOTO_NIGHT } from './assets';

/** Hero panoramique : photo de route (jour ou nuit selon le thème), logo + CTA à gauche, portable + téléphone à droite. */
export function HomeHero() {
  return (
    <section className="relative -mt-[62px] overflow-hidden pt-[62px]">
      {/* Photo + voile : deux calques, un par thème (data-theme sur l'ancêtre .home-scope). */}
      <div aria-hidden className="absolute inset-0 bg-cover bg-[position:center_62%] [[data-theme=dark]_&]:hidden" style={{ backgroundImage: `url(${HERO_PHOTO_LIGHT}), var(--h-hero-fallback)` }} />
      <div aria-hidden className="absolute inset-0 hidden bg-cover bg-[position:center_62%] [[data-theme=dark]_&]:block" style={{ backgroundImage: `url(${HERO_PHOTO_NIGHT}), var(--h-hero-fallback)` }} />
      <div aria-hidden className="absolute inset-0" style={{ background: 'var(--h-hero-veil)' }} />
      <div aria-hidden className="absolute inset-0" style={{ background: 'var(--h-hero-fade)' }} />

      <div className="relative mx-auto grid max-w-[1500px] grid-cols-[minmax(0,1fr)] items-center gap-4 px-6 py-5 md:px-10 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:py-3">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-[26%] p-[3px] shadow-[0_0_46px_rgba(21,83,224,0.35)]">
            <Image src="/ma1-logo.jpeg" alt="MA1 — Ton assistant de la route" width={220} height={220} priority className="h-[168px] w-[168px] rounded-[26%] sm:h-[200px] sm:w-[200px] xl:h-[212px] xl:w-[212px]" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/connexion?mode=register" className="web-btn-primary !gap-3 !bg-[var(--h-accent)] !px-8 !py-3 !text-[14px]">Commencer gratuitement<ArrowRight size={17} /></Link>
            <Link href="/abonnement" className="web-btn !gap-3 border-2 border-[var(--h-accent)] bg-[var(--h-bar)] !px-8 !py-[10px] !text-[14px] text-[var(--h-accent)] backdrop-blur hover:bg-[var(--h-accent-soft)]">Voir les offres<ArrowRight size={17} /></Link>
          </div>
        </div>
        <ScaledBox w={720} h={300} max={0.93}>
          <div className="relative h-full w-full">
            <div className="absolute left-0 top-0"><Laptop /></div>
            <div className="absolute left-[566px] top-[2px]"><Phone /></div>
          </div>
        </ScaledBox>
      </div>
    </section>
  );
}
