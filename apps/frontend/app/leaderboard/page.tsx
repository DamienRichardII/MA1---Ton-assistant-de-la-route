'use client';
import { LeaderboardPanel } from '@/components/gamification/LeaderboardPanel';
import { WebLeaderboard } from '@/components/web/app/WebLeaderboard';
import { DesktopOnly, MobileOnly } from '@/components/web/responsive';

export default function LeaderboardPage() {
  return (
    <>
      <MobileOnly><LeaderboardPanel /></MobileOnly>
      <DesktopOnly><WebLeaderboard /></DesktopOnly>
    </>
  );
}
