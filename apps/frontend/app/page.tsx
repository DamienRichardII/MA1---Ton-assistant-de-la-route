import { redirect } from 'next/navigation';

// Sprint 0 — landing canonique consolidée sur /landing (Next.js).
// La landing statique /landingpage.html a été archivée hors de /public/.
export default function HomePage() {
  redirect('/landing');
}
