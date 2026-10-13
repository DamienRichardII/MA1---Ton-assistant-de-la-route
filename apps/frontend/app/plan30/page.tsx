'use client';
import { Plan30Panel } from '@/components/ui/Plan30Panel';
import { WebPlan30 } from '@/components/web/app/WebPlan30';
import { DesktopOnly, MobileOnly } from '@/components/web/responsive';

export default function Plan30Page() {
  return (
    <>
      <MobileOnly><Plan30Panel /></MobileOnly>
      <DesktopOnly><WebPlan30 /></DesktopOnly>
    </>
  );
}
