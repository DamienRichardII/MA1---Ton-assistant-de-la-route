'use client';
import { useStore } from '@/lib/store';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { ApprenticeProfile } from '@/components/profile/ApprenticeProfile';

export default function DashboardPage() {
  const { userRole } = useStore();
  // Moniteurs get the teacher dashboard; apprentis get their personal stats
  return userRole === 'moniteur' ? <DashboardPanel /> : <ApprenticeProfile />;
}
