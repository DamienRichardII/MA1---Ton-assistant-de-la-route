// Illustrations vectorielles des héros (maquette v2). 100 % SVG : aucune image externe,
// remplaçables plus tard par des photos libres de droits sans toucher aux pages.
import Image from 'next/image';

/** Capture d'écran stylisée de l'app (UI sombre). */
export function DashboardMock({ variant = 'chat', className = '' }: { variant?: 'chat' | 'stats' | 'table'; className?: string }) {
  return (
    <svg viewBox="0 0 420 270" className={className} role="img" aria-label="Aperçu de l'application MA1">
      <defs>
        <linearGradient id="dm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0d2142" /><stop offset="1" stopColor="#071329" /></linearGradient>
        <linearGradient id="dm-bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#1553e0" /><stop offset="1" stopColor="#5bb8ff" /></linearGradient>
      </defs>
      <rect width="420" height="270" rx="14" fill="url(#dm-bg)" stroke="#2a4a80" strokeOpacity=".6" />
      <rect x="0" y="0" width="64" height="270" rx="14" fill="#08152b" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <g key={i}><circle cx="20" cy={46 + i * 28} r="5" fill={i === 2 ? '#1553e0' : '#3a5a8c'} /><rect x="32" y={43 + i * 28} width="22" height="6" rx="3" fill={i === 2 ? '#7fb0ff' : '#2a4468'} /></g>
      ))}
      <rect x="78" y="16" width="120" height="9" rx="4.5" fill="#cfe2ff" fillOpacity=".85" />
      <rect x="78" y="32" width="190" height="5" rx="2.5" fill="#6d8bbd" fillOpacity=".6" />
      {variant === 'chat' && (
        <>
          <rect x="190" y="56" width="212" height="30" rx="12" fill="#1f6bff" />
          <rect x="204" y="67" width="150" height="6" rx="3" fill="#fff" fillOpacity=".9" />
          <circle cx="94" cy="118" r="11" fill="#1553e0" /><rect x="114" y="100" width="288" height="86" rx="12" fill="#0f2650" stroke="#2a4a80" strokeOpacity=".7" />
          {[0, 1, 2, 3, 4].map(i => <rect key={i} x="128" y={112 + i * 14} width={i === 4 ? 120 : 250 - (i % 2) * 28} height="5" rx="2.5" fill="#9fbdf0" fillOpacity=".7" />)}
          <rect x="78" y="226" width="324" height="28" rx="14" fill="#0b1d3d" stroke="#2a4a80" /><rect x="92" y="237" width="90" height="6" rx="3" fill="#5873a3" />
          <circle cx="386" cy="240" r="9" fill="#1553e0" />
        </>
      )}
      {variant === 'stats' && (
        <>
          <circle cx="134" cy="128" r="42" fill="none" stroke="#173560" strokeWidth="12" />
          <circle cx="134" cy="128" r="42" fill="none" stroke="#2fb4ff" strokeWidth="12" strokeLinecap="round" strokeDasharray="178 264" transform="rotate(-90 134 128)" />
          <text x="134" y="134" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" fontFamily="Sora, sans-serif">68%</text>
          {[44, 70, 56, 92, 78, 104].map((h, i) => <rect key={i} x={214 + i * 30} y={196 - h} width="18" height={h} rx="4" fill="url(#dm-bar)" />)}
          <rect x="78" y="226" width="118" height="26" rx="13" fill="#1553e0" /><rect x="96" y="236" width="82" height="6" rx="3" fill="#fff" />
        </>
      )}
      {variant === 'table' && (
        <>
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i}>
              <rect x="78" y={56 + i * 38} width="324" height="30" rx="8" fill="#0f2650" stroke="#2a4a80" strokeOpacity=".6" />
              <circle cx="96" cy={71 + i * 38} r="7" fill="#2f6bd8" /><rect x="112" y={67 + i * 38} width="84" height="6" rx="3" fill="#cfe2ff" fillOpacity=".8" />
              <rect x="290" y={67 + i * 38} width="60" height="6" rx="3" fill="#2a4468" /><rect x="360" y={64 + i * 38} width="30" height="12" rx="6" fill={i % 2 ? '#e8b84d' : '#2ed573'} fillOpacity=".85" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

/** Téléphone avec un QCM. */
export function PhoneMock({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 380" className={className} role="img" aria-label="QCM sur mobile">
      <rect x="6" y="4" width="188" height="372" rx="30" fill="#0a1426" stroke="#27406f" strokeWidth="3" />
      <rect x="74" y="14" width="52" height="8" rx="4" fill="#142544" />
      <rect x="24" y="44" width="70" height="8" rx="4" fill="#7fb0ff" /><rect x="24" y="62" width="152" height="6" rx="3" fill="#cfe2ff" fillOpacity=".85" /><rect x="24" y="76" width="116" height="6" rx="3" fill="#cfe2ff" fillOpacity=".6" />
      <rect x="24" y="96" width="152" height="84" rx="10" fill="#122a52" />
      <path d="M24 156 L70 128 L104 148 L136 120 L176 150 L176 170 a10 10 0 0 1 -10 10 L34 180 a10 10 0 0 1 -10 -10Z" fill="#1c4a8c" />
      {['A', 'B', 'C', 'D'].map((l, i) => (
        <g key={l}><rect x="24" y={196 + i * 38} width="152" height="30" rx="10" fill={i === 1 ? '#1553e0' : '#10244a'} stroke="#27406f" strokeOpacity=".7" />
          <circle cx="42" cy={211 + i * 38} r="9" fill={i === 1 ? '#fff' : '#27406f'} /><text x="42" y={215 + i * 38} textAnchor="middle" fontSize="10" fontWeight="800" fill={i === 1 ? '#1553e0' : '#cfe2ff'}>{l}</text>
          <rect x="60" y={208 + i * 38} width={70 + i * 8} height="6" rx="3" fill={i === 1 ? '#fff' : '#6d8bbd'} /></g>
      ))}
    </svg>
  );
}

export function MoniteurArt() {
  return (
    <div className="relative h-full min-h-[360px]">
      <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-[#dfe9f7] via-[#eaf1fb] to-[#cfdcf0]" />
      <div className="absolute inset-y-6 right-0 w-[78%]"><div className="rounded-2xl bg-[#0a1426] p-2 shadow-[0_24px_60px_rgba(11,26,51,0.35)]"><DashboardMock variant="stats" /></div>
        <div className="mx-auto h-5 w-24 rounded-b-xl bg-slate-400/60" /><div className="mx-auto h-1.5 w-48 rounded-full bg-slate-400/50" /></div>
    </div>
  );
}

export function ApprentiArt() {
  return (
    <div className="relative h-full min-h-[360px]">
      <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-[#e6efff] via-[#f3f7ff] to-[#d8e6ff]" />
      <div className="absolute -left-4 bottom-0 h-72 w-72 rounded-full bg-ma1-blue/10 blur-2xl" />
      <PhoneMock className="absolute inset-y-4 left-1/2 h-[92%] -translate-x-1/2 drop-shadow-[0_24px_40px_rgba(11,26,51,0.35)]" />
      <div className="absolute right-8 top-10 w-[150px] rotate-3"><div className="rounded-2xl bg-[#0a1426] p-1.5 shadow-xl"><DashboardMock variant="stats" /></div></div>
    </div>
  );
}

export function AutoEcoleArt() {
  return (
    <div className="relative h-full min-h-[360px]">
      <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-[#cfe3ff] to-[#eef4fc]" />
      <svg viewBox="0 0 520 340" preserveAspectRatio="xMaxYMax meet" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect x="190" y="70" width="320" height="230" fill="#e9eef7" /><rect x="190" y="70" width="320" height="26" fill="#cdd8ea" />
        <rect x="220" y="104" width="240" height="46" rx="6" fill="#0b1d3d" /><text x="340" y="136" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="Sora, sans-serif">AUTO-ÉCOLE</text>
        <rect x="214" y="170" width="140" height="110" fill="#9cc4ff" fillOpacity=".55" stroke="#6f8bb5" /><rect x="372" y="170" width="110" height="130" fill="#7aa7e6" fillOpacity=".5" stroke="#6f8bb5" />
        <rect x="0" y="300" width="520" height="40" fill="#b9c6da" />
      </svg>
      <div className="absolute bottom-6 left-6 w-[300px]"><div className="rounded-2xl bg-[#0a1426] p-2 shadow-[0_20px_50px_rgba(11,26,51,0.4)]"><DashboardMock variant="table" /></div></div>
    </div>
  );
}
