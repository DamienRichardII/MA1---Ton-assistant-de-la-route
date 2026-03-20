'use client';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SettingsPage() {
  const { userId, userName, plan, isLoggedIn, logout } = useStore();
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const exportJSON = async () => {
    try {
      const r = await fetch(`${API}/rgpd/export/${userId}`);
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u; a.download = `ma1_export_${userId}.json`; a.click();
      URL.revokeObjectURL(u);
    } catch { alert('Export indisponible.'); }
  };

  const exportPDF = async () => {
    try {
      const r = await fetch(`${API}/export/pdf/${userId}`);
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = u; a.download = `MA1_Rapport_${userId}.pdf`; a.click();
      URL.revokeObjectURL(u);
    } catch { alert('Export PDF indisponible.'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      await fetch(`${API}/rgpd/delete/${userId}`, { method: 'DELETE' });
      localStorage.clear();
      logout();
      router.push('/');
    } catch { alert('Erreur. Contactez contact@ma1.app'); }
  };

  const handleLogout = () => { logout(); localStorage.removeItem('ma1_token'); router.push('/'); };

  const items = [
    { label: 'Exporter mes données', desc: 'Téléchargez toutes vos données (RGPD Art. 20)', action: 'Exporter JSON', fn: exportJSON },
    { label: 'Rapport PDF', desc: 'Rapport de progression détaillé', action: 'Télécharger PDF', fn: exportPDF },
    ...(isLoggedIn ? [{ label: 'Déconnexion', desc: 'Se déconnecter de ce compte', action: 'Déconnexion', fn: handleLogout }] : []),
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-w-lg mx-auto">
      <h2 className="font-display text-xl font-extrabold">⚙️ Paramètres</h2>

      {isLoggedIn && (
        <div className="glass rounded-3xl p-5">
          <div className="text-sm font-semibold mb-1">{userName || 'Utilisateur'}</div>
          <div className="text-xs text-white/40">Plan : {plan === 'free' ? 'Gratuit' : plan === 'premium' ? 'Premium (10€/mois)' : 'Auto-École (200€/mois)'}</div>
          <div className="text-[10px] text-white/25 mt-1">ID: {userId}</div>
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} className="glass rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{item.label}</div>
            <div className="text-[10.5px] text-white/30 mt-0.5">{item.desc}</div>
          </div>
          <button onClick={item.fn} className="btn-ghost !text-[11px]">{item.action}</button>
        </div>
      ))}

      <div className="glass rounded-xl p-4 flex items-center justify-between border-[rgba(255,71,87,0.15)]">
        <div>
          <div className="text-sm font-semibold">Supprimer mon compte</div>
          <div className="text-[10.5px] text-white/30 mt-0.5">
            {deleteConfirm ? '⚠️ CONFIRMER : cette action est irréversible' : 'Supprime définitivement toutes vos données (RGPD Art. 17)'}
          </div>
        </div>
        <button onClick={handleDelete}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${deleteConfirm ? 'bg-[rgba(255,71,87,0.15)] border-[rgba(255,71,87,0.3)] text-[#ff4757]' : 'border-[rgba(255,71,87,0.15)] text-[#ff4757]/60 hover:bg-[rgba(255,71,87,0.06)]'}`}>
          {deleteConfirm ? 'Confirmer la suppression' : 'Supprimer'}
        </button>
      </div>

      <div className="text-center text-[9px] text-white/15 mt-4 space-x-2">
        <a href="/legal/cgu.html" target="_blank" className="hover:text-white/25">CGU</a>
        <a href="/legal/cgv.html" target="_blank" className="hover:text-white/25">CGV</a>
        <a href="/legal/confidentialite.html" target="_blank" className="hover:text-white/25">Confidentialité</a>
        <a href="/legal/mentions-legales.html" target="_blank" className="hover:text-white/25">Mentions légales</a>
      </div>
    </div>
  );
}
