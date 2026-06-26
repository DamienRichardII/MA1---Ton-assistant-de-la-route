import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Limitations de vitesse sur autoroute en 2026',
  description: 'Tout savoir sur les vitesses max sur autoroute : temps sec, pluie, brouillard, jeune conducteur.',
  openGraph: { title: 'Limitations de vitesse sur autoroute en 2026', description: 'Tout savoir sur les vitesses max sur autoroute : temps sec, pluie, brouillard, jeune conducteur.' },
};

export default function Article() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <Link href="/blog" className="text-xs text-[#7ec8e3] hover:underline mb-4 inline-block">← Retour au blog</Link>
      <article>
        <h1 className="font-display text-2xl font-extrabold mb-4">Limitations de vitesse sur autoroute en 2026</h1>
        <div className="prose prose-invert text-sm leading-relaxed text-white/60 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#d0eaf2] [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-white/80 [&_ul]:pl-6 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: `<h2>Les limites de vitesse sur autoroute</h2>
<p>En France, la vitesse maximale autorisee sur autoroute varie selon les conditions meteorologiques et votre statut de conducteur :</p>
<ul><li><strong>Temps sec :</strong> 130 km/h</li><li><strong>Pluie :</strong> 110 km/h</li><li><strong>Brouillard (visibilite &lt; 50m) :</strong> 50 km/h</li><li><strong>Permis probatoire :</strong> 110 km/h (meme par temps sec)</li></ul>
<h2>Les sanctions en cas d'exces de vitesse</h2>
<p>Un exces de vitesse de moins de 20 km/h hors agglomeration entraine une amende forfaitaire de 68€ et le retrait d'1 point. Au-dela de 50 km/h, c'est un delit passible de 1 500€ d'amende et d'une suspension de permis.</p>
<h2>Distance de freinage</h2>
<p>A 130 km/h, la distance de freinage sur chaussee seche est d'environ 100 metres. Sur chaussee mouillee, elle peut atteindre 170 metres. C'est pourquoi la vitesse est reduite a 110 km/h sous la pluie.</p>` }} />
      </article>
      <div className="mt-10 p-6 rounded-2xl bg-[rgba(58,157,176,0.06)] border border-[rgba(58,157,176,0.15)] text-center">
        <p className="font-display font-bold text-base mb-2">Testez vos connaissances</p>
        <p className="text-sm text-white/40 mb-4">Lancez un QCM sur le theme &laquo; vitesse &raquo; avec MA1</p>
        <Link href="/qcm" className="inline-block px-6 py-2.5 rounded-full bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] text-white font-display font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all">
          Lancer un QCM
        </Link>
      </div>
    </div>
  );
}
