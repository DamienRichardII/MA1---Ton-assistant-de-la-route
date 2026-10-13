import type { Metadata } from 'next';
import { PageShell } from '@/components/web/ui';
import { WebContact } from '@/components/web/WebContact';

export const metadata: Metadata = {
  title: 'Contact — MA1',
  description: 'Une question ? Une suggestion ? Contactez l\'équipe MA1.',
  alternates: { canonical: 'https://ma1.app/contact' },
};

export default function ContactPage() { return <PageShell><WebContact /></PageShell>; }
