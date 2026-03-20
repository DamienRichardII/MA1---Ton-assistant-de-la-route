import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "La priorité à droite : quand et comment l'appliquer",
  description: "Règles de la priorité à droite, exceptions, ronds-points. Ne faites plus d'erreur le jour de l'examen.",
  openGraph: { title: "La priorité à droite : quand et comment l'appliquer", description: "Règles de la priorité à droite, exceptions, ronds-points. Ne faites plus d'erreur le jour de l'examen." },
};

export default function Article() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <Link href="/blog" className="text-xs text-[#7ec8e3] hover:underline mb-4 inline-block">← Retour au blog</Link>
      <article>
        <h1 className="font-display text-2xl font-extrabold mb-4">La priorité à droite : quand et comment l'appliquer</h1>
        <div className="prose prose-invert text-sm leading-relaxed text-white/60 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#d0eaf2] [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-white/80 [&_ul]:pl-6 [&_li]:mb-1"
          dangerouslySetInnerHTML={{ __html: `<h2>La regle de base</h2>
<p>A un carrefour sans signalisation (ni panneau, ni feu, ni marquage au sol), <strong>tout vehicule venant de la droite est prioritaire</strong>. C'est la regle fondamentale du Code de la Route francais (Art. R415-5).</p>
<h2>Les exceptions</h2>
<ul><li>Les ronds-points avec panneau "Cedez le passage" : les vehicules deja engages sont prioritaires</li><li>Les voies prioritaires (panneau losange jaune)</li><li>Les intersections avec feux ou panneaux STOP/Cedez le passage</li><li>Les vehicules prioritaires (pompiers, SAMU, police)</li></ul>
<h2>Les pieges de l'examen</h2>
<p>Attention aux situations ou un vehicule sort d'un parking ou d'un chemin de terre : il n'est PAS prioritaire, meme s'il vient de votre droite.</p>` }} />
      </article>
      <div className="mt-10 p-6 rounded-2xl bg-[rgba(58,157,176,0.06)] border border-[rgba(58,157,176,0.15)] text-center">
        <p className="font-display font-bold text-base mb-2">Testez vos connaissances</p>
        <p className="text-sm text-white/40 mb-4">Lancez un QCM sur le theme &laquo; priorite &raquo; avec MA1</p>
        <Link href="/qcm" className="inline-block px-6 py-2.5 rounded-full bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] text-white font-display font-bold text-sm shadow-md hover:-translate-y-0.5 transition-all">
          Lancer un QCM
        </Link>
      </div>
    </div>
  );
}
