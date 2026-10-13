import { Search, Bell, Home as HomeIcon, ListChecks, Signpost, CalendarDays, Trophy, BarChart3, Radio, Play } from 'lucide-react';
import { PHONE_PHOTO } from './assets';

const S = 'var(--h-screen-text)';
const M = 'var(--h-screen-muted)';

function Ring({ pct, size }: { pct: number; size: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--h-screen-line)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2f7bff" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} /></svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[9px] font-extrabold" style={{ color: S }}>{pct}%</span>
    </div>
  );
}

const SIDE = [[HomeIcon, 'Accueil'], [ListChecks, 'QCM'], [Signpost, 'Panneaux'], [CalendarDays, 'Plan 30j'], [Trophy, 'Classement'], [BarChart3, 'Statistiques'], [Radio, 'Veille']] as const;

/** Ordinateur portable avec le tableau de bord MA1 (taille de conception 560×300). */
export function Laptop() {
  return (
    <div className="relative" style={{ width: 560, height: 300, perspective: 1600 }} role="img" aria-label="Tableau de bord MA1 sur ordinateur portable">
      <div className="absolute left-[22px] top-0 h-[282px] w-[516px] overflow-hidden rounded-t-[14px] bg-[#0b111f] p-[7px] shadow-[var(--h-device-glow)]" style={{ transform: 'rotateY(-9deg)', transformOrigin: 'right center' }}>
        <div className="absolute left-1/2 top-[2px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#2b3550]" />
        <div className="flex h-full w-full overflow-hidden rounded-[6px]" style={{ background: 'var(--h-screen-bg)' }}>
          <div className="flex w-[92px] shrink-0 flex-col gap-[3px] px-[7px] py-[9px]" style={{ background: 'var(--h-screen-side)' }}>
            <div className="mb-2 flex items-center gap-1.5"><span className="h-[14px] w-[14px] rounded-[4px] bg-gradient-to-br from-[#2f7bff] to-[#0b1d3d]" /><span className="font-display text-[8px] font-extrabold text-white">MA1</span></div>
            {SIDE.map(([Icon, label], i) => (
              <div key={label} className={`flex items-center gap-1.5 rounded-[5px] px-1.5 py-[5px] text-[7px] font-semibold ${i === 0 ? 'bg-[#1553e0] text-white' : 'text-[#9db4dc]'}`}><Icon size={9} />{label}</div>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
            <div className="flex items-center justify-between" style={{ color: M }}>
              <span className="flex w-24 items-center gap-1 rounded-full border px-2 py-[3px] text-[6.5px]" style={{ borderColor: 'var(--h-screen-line)' }}><Search size={7} />Rechercher</span>
              <span className="flex items-center gap-2"><Bell size={9} />
                <span className="flex items-center gap-1 rounded-full px-1.5 py-[2px]" style={{ background: 'var(--h-screen-card)' }}><span className="h-[10px] w-[10px] rounded-full bg-[#1553e0]" /><span className="text-[6px] leading-tight" style={{ color: S }}>Niveau 12<br /><span style={{ color: M }}>1 250 XP</span></span></span></span>
            </div>
            <div><div className="font-display text-[19px] font-extrabold leading-none" style={{ color: S }}>Bonjour,</div>
              <div className="mt-1 text-[9px]" style={{ color: S }}>Prêt pour ta prochaine question ?</div></div>
            <div className="flex gap-1.5 text-[6.5px] font-semibold">
              {['Chat IA', 'QCM', 'Panneaux', 'Plan 30j', 'Classement'].map((t, i) => (
                <span key={t} className="rounded-full border px-2 py-[3px]" style={i === 0 ? { background: '#1553e0', color: '#fff', borderColor: '#1553e0' } : { color: M, borderColor: 'var(--h-screen-line)', background: 'var(--h-screen-card)' }}>{t}</span>))}
            </div>
            <div className="grid flex-1 grid-cols-[1.25fr_1fr] gap-2">
              <div className="rounded-[8px] border p-2.5" style={{ background: 'var(--h-screen-card)', borderColor: 'var(--h-screen-line)' }}>
                <div className="text-[8px] font-bold" style={{ color: S }}>Reprendre ma révision</div>
                <div className="mt-0.5 text-[6px]" style={{ color: M }}>Série personnalisée · Série personnalisée</div>
                <span className="mt-3 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#1553e0] text-white"><Play size={9} fill="currentColor" /></span>
              </div>
              <div className="rounded-[8px] border p-2.5" style={{ background: 'var(--h-screen-card)', borderColor: 'var(--h-screen-line)' }}>
                <div className="text-[7px] font-bold" style={{ color: S }}>Ma progression</div>
                <div className="mt-1.5 flex items-center gap-2"><Ring pct={68} size={34} />
                  <div className="grid grid-cols-3 gap-2 text-center">{[['372', 'Questions'], ['24', 'Séries'], ['12', 'Jours']].map(([v, l]) => <div key={l}><div className="font-display text-[8px] font-extrabold" style={{ color: S }}>{v}</div><div className="text-[4.5px]" style={{ color: M }}>{l}</div></div>)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-[16px] w-[560px] rounded-b-[10px] bg-gradient-to-b from-[#dfe5ef] to-[#8d98ad] shadow-[0_10px_20px_rgba(0,0,0,0.25)]" style={{ clipPath: 'polygon(1% 0, 99% 0, 100% 100%, 0 100%)' }}>
        <div className="absolute left-1/2 top-0 h-[4px] w-[84px] -translate-x-1/2 rounded-b-md bg-[#b4bdce]" />
      </div>
    </div>
  );
}

const ANSWERS = ['Oui', 'Non', 'Uniquement si la voie est libre', 'Seulement à plus de 70 km/h'];

/** Smartphone avec un QCM (taille de conception 150×296). */
export function Phone() {
  return (
    <div className="relative" style={{ width: 150, height: 296, perspective: 1200 }} role="img" aria-label="QCM MA1 sur smartphone">
      <div className="absolute inset-0 overflow-hidden rounded-[24px] border-[4px] border-[#10141f] bg-[#0b111f] shadow-[var(--h-device-glow)]" style={{ transform: 'rotateY(-7deg)' }}>
        <div className="absolute left-1/2 top-[5px] z-10 h-[8px] w-[44px] -translate-x-1/2 rounded-full bg-black" />
        <div className="flex h-full flex-col px-[10px] pb-[10px] pt-[8px]" style={{ background: 'var(--h-screen-bg)' }}>
          <div className="flex justify-between text-[6px] font-bold" style={{ color: S }}><span>9:41</span><span>●●● ▮</span></div>
          <div className="mt-1.5 text-center font-display text-[11px] font-extrabold text-[#2f7bff]">MA1</div>
          <div className="mt-1.5 text-[6.5px] font-semibold" style={{ color: S }}>Question 4/10</div>
          <div className="mt-1 h-[84px] w-full overflow-hidden rounded-[6px] bg-gradient-to-b from-[#9cc0ee] to-[#5d7491]" style={{ backgroundImage: `url(${PHONE_PHOTO}), linear-gradient(180deg,#9cc0ee,#5d7491)`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden />
          <div className="mt-1.5 text-[6.5px] font-semibold leading-tight" style={{ color: S }}>Dans cette situation, je peux dépasser :</div>
          <div className="mt-1 flex flex-col gap-[3px]">
            {ANSWERS.map((a, i) => (
              <div key={a} className="flex items-center gap-1.5 rounded-[5px] border px-1.5 py-[3px] text-[5.8px]" style={i === 0 ? { background: '#1553e0', borderColor: '#1553e0', color: '#fff' } : { background: 'var(--h-screen-card)', borderColor: 'var(--h-screen-line)', color: S }}>
                <span className="flex h-[9px] w-[9px] shrink-0 items-center justify-center rounded-full text-[5px] font-extrabold" style={i === 0 ? { background: '#fff', color: '#1553e0' } : { background: 'var(--h-screen-line)', color: S }}>{'ABCD'[i]}</span>{a}</div>))}
          </div>
          <div className="mt-auto rounded-full bg-[#1553e0] py-[5px] text-center text-[7px] font-bold text-white">Valider</div>
        </div>
      </div>
    </div>
  );
}
