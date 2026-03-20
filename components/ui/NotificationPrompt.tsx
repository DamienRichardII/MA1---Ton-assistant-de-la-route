'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';

export function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const { addXP, userId } = useStore();
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem('ma1_notif_asked')) return;
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
      if (Notification.permission === 'granted') return;
      setShow(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const accept = async () => {
    const perm = await Notification.requestPermission();
    setShow(false);
    localStorage.setItem('ma1_notif_asked', '1');
    if (perm === 'granted') {
      addXP(5);
      // Register push subscription
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY });
        await fetch(`${API}/push/subscribe?user_id=${userId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch {}
    }
  };

  const dismiss = () => { setShow(false); localStorage.setItem('ma1_notif_asked', '1'); };

  if (!show) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[800] px-5 py-3 rounded-2xl glass flex items-center gap-3 text-xs animate-msg-in shadow-lg max-w-md">
      <span>🔔 Activez les notifications pour ne pas casser votre série !</span>
      <button onClick={accept} className="px-3 py-1.5 rounded-full bg-[#3a9db0] text-white text-[11px] font-semibold shrink-0">Activer</button>
      <button onClick={dismiss} className="px-3 py-1.5 rounded-full border border-white/[0.08] text-white/30 text-[11px] shrink-0">Plus tard</button>
    </div>
  );
}
