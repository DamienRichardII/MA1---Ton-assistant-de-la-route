import type { Metadata } from 'next';
import { WebAuth } from '@/components/web/WebAuth';

export const metadata: Metadata = {
  title: 'Connexion / Inscription — MA1',
  description: 'Connectez-vous ou créez votre compte MA1 pour réviser le Code de la Route avec l\'IA.',
  robots: { index: false, follow: true },
};

export default function ConnexionPage() { return <WebAuth />; }
