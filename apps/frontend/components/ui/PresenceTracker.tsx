'use client';
// [Sprint] Heartbeat de présence discret — uniquement si l'utilisateur est connecté.
// Ping toutes les 45s + au montage. Le module courant est dérivé de l'URL.
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';

function moduleFromPath(path: string): string {
  if (path.startsWith('/qcm')) return 'qcm';
  if (path.startsWith('/vision')) return 'vision';
  if (path.startsWith('/exam')) return 'exam';
  if (path.startsWith('/leaderboard')) return 'leaderboard';
  if (path.startsWith('/support')) return 'support';
  if (path.startsWith('/me') || path.startsWith('/dashboard')) return 'dashboard';
  return 'assistant';
}

const HEARTBEAT_MS = 45_000; // 45s : dans la fenêtre 30–60s, sans spammer

export function PresenceTracker() {
  const pathname = usePathname();
  const { isLoggedIn, userId, setServerXp } = useStore();
  const moduleRef = useRef(moduleFromPath(pathname));
  moduleRef.current = moduleFromPath(pathname);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    let cancelled = false;
    const ping = () => {
      if (cancelled) return;
      api.heartbeat(userId, moduleRef.current);
      // [FIX XP] resynchronise le XP du header depuis Supabase (évite header != classement).
      api.getUserStats().then((st: any) => { if (!cancelled && st && typeof st.xp === 'number') setServerXp(st.xp); }).catch(() => {});
    };
    ping(); // immédiat au montage / changement de page
    const id = setInterval(ping, HEARTBEAT_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [isLoggedIn, userId, pathname, setServerXp]);

  return null;
}
