'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

/**
 * Restaure et VALIDE la session au montage (une seule fois, quel que soit le shell affiché).
 * - jeton valide : met à jour le profil / le plan / l'XP depuis le serveur ;
 * - jeton refusé (401) ou « connecté » mémorisé sans jeton : déconnexion propre, au lieu d'afficher
 *   un compte connecté dont toutes les requêtes échouent en 401 ;
 * - panne réseau / serveur indisponible : on ne déconnecte pas.
 */
export function SessionRestore() {
  const { setUser, setProfile, setServerXp, logout } = useStore();

  useEffect(() => {
    const token = localStorage.getItem('ma1_token');
    // État lu au moment de l'effet (et non via la fermeture du 1er rendu) : le store persisté peut être réhydraté après.
    if (!token) { if (useStore.getState().isLoggedIn) logout(); return; }
    api.me(token).then(d => {
      setUser({ userId: d.user_id, token, name: d.name || d.email?.split('@')[0] || '', plan: d.plan });
      if (d.profile) setProfile(d.profile);
      // [FIX XP] Aligne le XP affiché sur Supabase (source de vérité).
      api.getUserStats().then((st: any) => { if (st && typeof st.xp === 'number') setServerXp(st.xp); }).catch(() => {});
    }).catch((e: any) => {
      if (e?.status === 401) { localStorage.removeItem('ma1_token'); logout(); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
