import { MessageSquare, ListChecks, FileText, CalendarDays, Trophy, BarChart3, Radio } from 'lucide-react';

export type Variant = 'marketing' | 'app' | 'bare';

// Pages « application » : coque sombre avec sidebar (maquette 09 → 14).
const APP_PREFIXES = ['/chat', '/qcm', '/exam', '/plan30', '/leaderboard', '/dashboard', '/veille', '/vision', '/me', '/settings', '/support', '/positioning', '/blog'];
// Pages sans chrome web : admin et doc API (rendu historique conservé) + connexion (écran scindé, maquette 05).
const BARE_PREFIXES = ['/admin', '/api-docs', '/connexion'];

export function variantFor(pathname: string): Variant {
  const hit = (list: string[]) => list.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (hit(BARE_PREFIXES)) return 'bare';
  if (hit(APP_PREFIXES)) return 'app';
  return 'marketing';
}

export const SITE_NAV = [
  { href: '/landing', label: 'Accueil' },
  { href: '/utilisation', label: 'Fonctionnalités' },
  { href: '/abonnement', label: 'Tarifs' },
  { href: '/auto-ecole', label: 'Auto-écoles' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export const APP_NAV = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/qcm', label: 'QCM', icon: ListChecks },
  { href: '/exam', label: 'Examen blanc', icon: FileText },
  { href: '/plan30', label: 'Plan 30j', icon: CalendarDays },
  { href: '/leaderboard', label: 'Classement', icon: Trophy },
  { href: '/me', label: 'Statistiques', icon: BarChart3 },
  { href: '/veille', label: 'Veille', icon: Radio },
];
