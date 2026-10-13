'use client';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { WebChat } from '@/components/web/app/WebChat';
import { DesktopOnly, MobileOnly } from '@/components/web/responsive';

// Maquette 00 — Chat IA (desktop). Mobile : ChatPanel historique.
export default function ChatPage() {
  return (
    <>
      <MobileOnly><ChatPanel /></MobileOnly>
      <DesktopOnly><WebChat /></DesktopOnly>
    </>
  );
}
