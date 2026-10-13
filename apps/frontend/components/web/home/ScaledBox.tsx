'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Affiche un bloc de taille de conception fixe (w×h) réduit pour tenir dans la largeur disponible. */
export function ScaledBox({ w, h, max = 1, children }: { w: number; h: number; max?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setK(Math.min(max, el.clientWidth / w));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, max]);
  return (
    <div ref={ref} className="w-full" style={{ height: h * k }}>
      <div style={{ width: w, height: h, transform: `scale(${k})`, transformOrigin: 'top left', marginLeft: Math.max(0, ((ref.current?.clientWidth ?? w) - w * k) / 2) }}>{children}</div>
    </div>
  );
}
