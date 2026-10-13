'use client';
import { ExamPanel } from '@/components/exam/ExamPanel';
import { WebExam } from '@/components/web/app/WebExam';
import { DesktopOnly, MobileOnly } from '@/components/web/responsive';

export default function ExamPage() {
  return (
    <>
      <MobileOnly><ExamPanel /></MobileOnly>
      <DesktopOnly><WebExam /></DesktopOnly>
    </>
  );
}
