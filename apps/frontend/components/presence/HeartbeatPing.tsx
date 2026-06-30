'use client';
// [Fix Admin realtime] Heartbeat utilisateur : ping toutes les 45 secondes vers
// POST /presence/heartbeat quand l'utilisateur est connecté.
// Backend marque l'utilisateur comme "actif" si last_seen_at > now - 5 min.
// Composant invisible (return null). À monter dans le layout global.
import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const INTERVAL_MS = 45_000;     // 45 sec (cadre 30-60 sec)
const SESSION_KEY = 'ma1_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'default';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2, 12);
    try { sessionStorage.setItem(SESSION_KEY, sid); } catch {}
  }
  return sid;
}

async function ping(userId: string, token: string) {
  try {
    const sid = getSessionId();
    await fetch(`${API}/presence/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, session_id: sid }),
      keepalive: true,
    });
  } catch {
    // Silencieux : un fail de heartbeat ne doit pas remonter à l'UI
  }
}

export function HeartbeatPing() {
  const { userId, isLoggedIn } = useStore();
  const tokenRef = useRef<string|null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    tokenRef.current = localStorage.getItem('ma1_token');
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;
    const tok = tokenRef.current || (typeof window !== 'undefined' ? localStorage.getItem('ma1_token') : null);
    if (!tok) return;
    // Premier ping immédiat
    ping(userId, tok);
    // Puis toutes les 45 sec
    const id = setInterval(() => ping(userId, tok), INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId, isLoggedIn]);

  return null;
}
