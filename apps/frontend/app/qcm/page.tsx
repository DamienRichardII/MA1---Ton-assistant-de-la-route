'use client';
import { QCMPanel } from '@/components/qcm/QCMPanel';
import { WebQCM } from '@/components/web/app/WebQCM';
import { DesktopOnly, MobileOnly } from '@/components/web/responsive';

export default function QCMPage() {
  return (
    <>
      <MobileOnly><QCMPanel /></MobileOnly>
      <DesktopOnly><WebQCM /></DesktopOnly>
    </>
  );
}
