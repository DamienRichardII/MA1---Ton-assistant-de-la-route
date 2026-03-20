import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Documentation — MA1',
  description: 'Documentation de l\'API publique MA1. Intégrez les QCM du Code de la Route dans votre application.',
};

export default function ApiDocsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl font-extrabold mb-2">📡 API Publique MA1</h1>
      <p className="text-white/40 text-sm mb-8">Intégrez les QCM et le chat Code de la Route dans votre application.</p>

      <div className="space-y-6">
        <section className="glass rounded-2xl p-5">
          <h2 className="font-display font-bold mb-2">Authentification</h2>
          <p className="text-sm text-white/50 mb-3">Obtenez une clé API en appelant :</p>
          <code className="block p-3 rounded-xl bg-black/30 text-xs text-[#7ec8e3] overflow-x-auto">
            POST /api/v1/keys/create?owner_id=votre_id
          </code>
          <p className="text-xs text-white/30 mt-2">Passez votre clé dans le paramètre <code className="bg-black/30 px-1 rounded">api_key</code> de chaque requête.</p>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-display font-bold mb-3">Endpoints</h2>
          {[
            { method: 'POST', path: '/api/v1/qcm', desc: 'Générer des questions QCM', params: 'api_key, topic, n (1-10), difficulty (facile|moyen|difficile)' },
            { method: 'POST', path: '/api/v1/chat', desc: 'Chat IA Code de la Route', params: 'api_key, message' },
            { method: 'GET', path: '/api/v1/topics', desc: 'Liste des thèmes disponibles', params: 'aucun' },
            { method: 'GET', path: '/api/v1/docs', desc: 'Documentation JSON', params: 'aucun' },
          ].map((ep, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ep.method === 'GET' ? 'bg-[rgba(46,213,115,0.1)] text-[#2ed573]' : 'bg-[rgba(58,157,176,0.1)] text-[#7ec8e3]'}`}>{ep.method}</span>
                <code className="text-sm font-mono text-white/70">{ep.path}</code>
              </div>
              <p className="text-xs text-white/40">{ep.desc}</p>
              <p className="text-[10px] text-white/25 mt-1">Params: {ep.params}</p>
            </div>
          ))}
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-display font-bold mb-2">Limites</h2>
          <div className="text-sm text-white/50 space-y-1">
            <p>Plan Basic (gratuit) : 100 appels/jour</p>
            <p>Plan Pro : 1 000 appels/jour — sur devis</p>
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="font-display font-bold mb-2">Exemple</h2>
          <code className="block p-3 rounded-xl bg-black/30 text-xs text-[#7ec8e3] overflow-x-auto whitespace-pre">{`curl -X POST "https://api.ma1.app/api/v1/qcm" \
  -d "api_key=ma1_votre_cle" \
  -d "topic=vitesse" \
  -d "n=5" \
  -d "difficulty=moyen"`}</code>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="btn-ghost">← Retour à MA1</Link>
      </div>
    </div>
  );
}
