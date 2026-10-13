import { HomeHero } from './home/HomeHero';
import { HomeCards } from './home/HomeCards';
import { TrustBar } from './home/TrustBar';

// Accueil web (référence PJ1) : hero panoramique, cartes espaces + tarifs, bande de réassurance.
export function WebHome() {
  return (
    <div className="pb-4">
      <h1 className="sr-only">MA1 — Ton assistant IA du Code de la Route</h1>
      <HomeHero />
      <div className="relative mt-2 flex flex-col"><HomeCards /><TrustBar /></div>
    </div>
  );
}
