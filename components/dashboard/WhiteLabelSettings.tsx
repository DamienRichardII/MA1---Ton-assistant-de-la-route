'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

export function WhiteLabelSettings() {
  const { userId } = useStore();
  const [config, setConfig] = useState({ school_name: '', primary_color: '#3a9db0', logo_url: '', welcome_message: '' });
  const [saved, setSaved] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${API}/whitelabel/${userId}`).then(r => r.json()).then(d => {
      if (d.school_name) setConfig(d);
    }).catch(() => {});
  }, [userId]);

  const save = async () => {
    try {
      await fetch(`${API}/whitelabel/${userId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="glass rounded-3xl p-5 flex flex-col gap-3.5">
      <h3 className="font-display text-sm font-extrabold flex items-center gap-2">🎨 Personnalisation (White-label)</h3>
      <div>
        <label className="block text-[11px] text-white/50 font-semibold mb-1">Nom de l'auto-école</label>
        <input value={config.school_name || ''} onChange={e => setConfig({...config, school_name: e.target.value})}
          placeholder="Mon Auto-École" className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white outline-none focus:border-[rgba(58,157,176,0.3)]" />
      </div>
      <div>
        <label className="block text-[11px] text-white/50 font-semibold mb-1">Couleur principale</label>
        <div className="flex gap-2 items-center">
          <input type="color" value={config.primary_color} onChange={e => setConfig({...config, primary_color: e.target.value})}
            className="w-10 h-8 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer" />
          <span className="text-xs text-white/40">{config.primary_color}</span>
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-white/50 font-semibold mb-1">URL du logo</label>
        <input value={config.logo_url || ''} onChange={e => setConfig({...config, logo_url: e.target.value})}
          placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white outline-none" />
      </div>
      <div>
        <label className="block text-[11px] text-white/50 font-semibold mb-1">Message de bienvenue personnalisé</label>
        <textarea value={config.welcome_message || ''} onChange={e => setConfig({...config, welcome_message: e.target.value})}
          placeholder="Bienvenue chez..." rows={2}
          className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white outline-none resize-none" />
      </div>
      <button onClick={save} className="btn-primary !py-2 !text-xs self-end">
        {saved ? '✅ Enregistré' : 'Sauvegarder'}
      </button>
    </div>
  );
}
