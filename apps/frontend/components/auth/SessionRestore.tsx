'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

/**
 * Restaure la session (token en localStorage) au montage.
 * Extrait de Header pour que la restauration ait lieu une seule fois,
 * quel que soit le shell affiché (mobile : Header, desktop : WebHeader / WebAppSidebar).
 */
export function SessionRestore() {
  const { isLoggedIn, setUser, setProfile, setServerXp } = useStore();

  useEffect(() => {
    const token = localStorage.getItem('ma1_token');
    if (token && !isLoggedIn) {
      api.me(token).then(d => {
        setUser({ userId: d.user_id, token, name: d.name || d.email?.split('@')[0] || '', plan: d.plan });
        if (d.profile) setProfile(d.profile);
        // [FIX XP] Aligne le XP affiché sur Supabase (source de vérité).
        api.getUserStats().then((st: any) => { if (st && typeof st.xp === 'number') setServerXp(st.xp); }).catch(() => {});
      }).catch(() => localStorage.removeItem('ma1_token'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
