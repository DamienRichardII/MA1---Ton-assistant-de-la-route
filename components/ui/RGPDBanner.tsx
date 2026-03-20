'use client';
import { useState, useEffect } from 'react';

export function RGPDBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('ma1_rgpd')) setShow(true);
  }, []);

  if (!show) return null;

  const handle = (accept: boolean) => {
    localStorage.setItem('ma1_rgpd', accept ? 'accept' : 'decline');
    setShow(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[500] p-4 bg-ma1-navy/95 border-t border-white/[0.08] backdrop-blur-[24px] flex items-center justify-between gap-4 max-sm:flex-col max-sm:text-center animate-msg-in">
      <p className="text-[11.5px] text-white/50 flex-1 leading-relaxed">
        MA1 utilise des cookies pour sauvegarder votre progression. Vos données restent sur votre appareil.{' '}
        <a href="/legal/confidentialite.html" target="_blank" className="text-ma1-sky underline">Confidentialité</a> ·{' '}
        <a href="/legal/cgu.html" target="_blank" className="text-ma1-sky underline">CGU</a>
      </p>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => handle(false)} className="btn-ghost">Refuser</button>
        <button onClick={() => handle(true)} className="px-4 py-1.5 rounded-full bg-ma1-teal text-white text-[11.5px] font-semibold">Accepter</button>
      </div>
    </div>
  );
}
