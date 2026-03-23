'use client';
import { useStore } from '@/lib/store';
import { ApprenticeProfile } from '@/components/profile/ApprenticeProfile';
import { MoniteurProfile } from '@/components/profile/MoniteurProfile';

export default function ProfilePage() {
  const { userRole } = useStore();
  return userRole === 'moniteur' ? <MoniteurProfile /> : <ApprenticeProfile />;
}
