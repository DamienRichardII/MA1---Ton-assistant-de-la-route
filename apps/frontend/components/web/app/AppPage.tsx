import type { ReactNode } from 'react';

/** Conteneur standard des pages « application » desktop (fond sombre, titre + sous-titre + actions). */
export function AppPage({ title, subtitle, actions, children, className = '' }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] flex-1 px-10 py-9 text-white ${className}`}>
      <header className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-ma1-blue" />{label}
    </div>
  );
}

/** Question + 4 choix (style maquette 09). `state` colore les choix après réponse (QCM) ; absent = examen. */
export function QuestionCard({ index, total, refLabel, question, imageUrl, choices, selected, correctIndex, onPick, disabled }: {
  index: number; total: number; refLabel?: string; question: string; imageUrl?: string; choices: string[];
  selected: number | null; correctIndex?: number; onPick: (i: number) => void; disabled?: boolean;
}) {
  const L = ['A', 'B', 'C', 'D'];
  return (
    <div className="app-card p-7">
      <div className="mb-5 flex items-center gap-3 text-sm font-semibold text-ma1-sky">
        Question {index + 1}/{total}
        {refLabel && <span className="rounded-full border border-ma1-app-line bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-slate-300">{refLabel}</span>}
      </div>
      <div className={`grid gap-8 ${imageUrl ? 'lg:grid-cols-[minmax(0,380px)_1fr]' : ''}`}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Situation de conduite" className="max-h-[300px] w-full rounded-2xl border border-ma1-app-line object-cover"
            onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
        )}
        <div>
          <h2 className="mb-5 font-display text-lg font-bold leading-snug">{question}</h2>
          <div className="flex flex-col gap-3">
            {choices.map((c, i) => {
              let cls = 'border-ma1-app-line bg-white/[0.03] hover:border-ma1-blue/60 hover:bg-ma1-blue/10';
              if (correctIndex !== undefined && selected !== null) {
                if (i === correctIndex) cls = 'border-ma1-green/50 bg-ma1-green/10 text-ma1-green';
                else if (i === selected) cls = 'border-ma1-red/40 bg-ma1-red/10 text-ma1-red';
                else cls = 'border-white/5 opacity-40';
              } else if (selected === i) cls = 'border-ma1-blue bg-ma1-blue/20';
              return (
                <button key={i} onClick={() => onPick(i)} disabled={disabled}
                  className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left text-sm transition-all ${cls} ${disabled ? 'cursor-default' : ''}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-display text-sm font-extrabold text-ma1-blue">{L[i]}</span>{c}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
