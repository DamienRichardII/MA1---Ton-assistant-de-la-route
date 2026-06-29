'use client';
// [Sprint Admin/Emails/Support] Point d'entrée admin : redirige vers /admin/login ou /admin/dashboard
// selon la présence du token admin en localStorage.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    const tok = typeof window !== 'undefined' ? localStorage.getItem('ma1_admin_token') : null;
    router.replace(tok ? '/admin/dashboard' : '/admin/login');
  }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-white/40 text-sm">Chargement…</div>
    </div>
  );
}
