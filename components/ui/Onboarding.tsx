'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export function Onboarding() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem('ma1_ob')) setShow(true);
  }, []);

  const dismiss = (goPositioning: boolean) => {
    localStorage.setItem('ma1_ob', '1');
    setShow(false);
    if (goPositioning && !localStorage.getItem('ma1_pos_done')) {
      router.push('/positioning');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a1628] flex flex-col items-center justify-center text-center p-8 transition-all">
      <Image src="/ma1-logo.jpeg" alt="MA1" width={140} height={140}
        className="rounded-[32px] mb-6 animate-breathe" style={{ filter: 'drop-shadow(0 0 40px rgba(58,157,176,0.4))' }} />
      <h1 className="font-display text-3xl font-black text-[#d0eaf2] mb-2">Bienvenue sur MA1</h1>
      <p className="text-white/50 text-[15px] max-w-md leading-relaxed mb-8">
        L'intelligence artificielle qui t'accompagne vers la réussite du Code de la Route.
      </p>
      <div className="flex flex-wrap gap-2.5 mb-9 justify-center">
        {['💬 Chat IA expert', '📋 QCM adaptatifs', '📸 Analyse panneaux', '🎯 Examen blanc'].map(f => (
          <div key={f} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white/50 backdrop-blur-sm">{f}</div>
        ))}
      </div>
      <button onClick={() => dismiss(true)}
        className="px-12 py-4 rounded-full bg-gradient-to-br from-[#3a9db0] to-[#7ec8e3] text-white font-display font-bold text-base shadow-[0_4px_24px_rgba(58,157,176,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_36px_rgba(58,157,176,0.5)] transition-all relative overflow-hidden">
        <span className="relative z-10">Commencer gratuitement</span>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.18] to-transparent rounded-full" />
      </button>
      <button onClick={() => dismiss(false)} className="mt-4 text-white/30 text-xs hover:text-white/50 bg-transparent border-none cursor-pointer transition-colors">
        J'ai déjà un compte
      </button>
    </div>
  );
}
