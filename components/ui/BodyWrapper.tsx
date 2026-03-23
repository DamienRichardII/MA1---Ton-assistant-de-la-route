'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { RoadAnimation } from '@/components/ui/RoadAnimation';

export function BodyWrapper({ children }: { children: React.ReactNode }) {
  const lightMode = useStore((s) => s.lightMode);

  useEffect(() => {
    document.body.classList.toggle('light-mode', lightMode);
  }, [lightMode]);

  return (
    <>
      {lightMode && <RoadAnimation />}
      {children}
    </>
  );
}
