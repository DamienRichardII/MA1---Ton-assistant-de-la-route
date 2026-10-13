import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

export const TikTokIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

// Fantôme Snapchat (tracé simplifié).
export const SnapchatIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2c3 0 5.3 2.1 5.3 5.2 0 .9-.1 1.6-.2 2.4.3.2.7.3 1.1.1.5-.2 1-.1 1.2.3.3.6-.3 1.1-1.1 1.4-.6.2-1 .4-1 .8 0 .3.3.9.9 1.6.8 1 1.8 1.5 2.8 1.7.4.1.5.5.2.8-.5.6-1.4.8-2 .9-.1.3-.2.7-.3 1-.1.3-.3.4-.7.4-.5 0-1.2-.2-2-.1-.9.1-1.5.7-2.2 1.2-.6.4-1.3.8-2 .8s-1.4-.4-2-.8c-.7-.5-1.3-1.1-2.2-1.2-.8-.1-1.5.1-2 .1-.4 0-.6-.1-.7-.4-.1-.3-.2-.7-.3-1-.6-.1-1.5-.3-2-.9-.3-.3-.2-.7.2-.8 1-.2 2-.7 2.8-1.7.6-.7.9-1.3.9-1.6 0-.4-.4-.6-1-.8-.8-.3-1.4-.8-1.1-1.4.2-.4.7-.5 1.2-.3.4.2.8.1 1.1-.1-.1-.8-.2-1.5-.2-2.4C6.7 4.1 9 2 12 2z" />
  </svg>
);

export const MastercardLogo = (p: P) => (
  <svg viewBox="0 0 32 20" aria-label="Mastercard" {...p}>
    <circle cx="11.5" cy="10" r="8" fill="#eb001b" /><circle cx="20.5" cy="10" r="8" fill="#f79e1b" fillOpacity=".92" />
    <path d="M16 3.9a8 8 0 0 1 0 12.2 8 8 0 0 1 0-12.2z" fill="#ff5f00" />
  </svg>
);
export const VisaLogo = (p: P) => (
  <svg viewBox="0 0 48 16" aria-label="Visa" {...p}>
    <text x="0" y="14" fontFamily="Sora, Arial, sans-serif" fontWeight="800" fontStyle="italic" fontSize="17" fill="#1a4bd6" letterSpacing="-0.5">VISA</text>
  </svg>
);
export const CBLogo = (p: P) => (
  <svg viewBox="0 0 30 20" aria-label="Carte Bancaire" {...p}>
    <rect width="30" height="20" rx="3" fill="#0f6f9e" /><rect x="2" y="2" width="26" height="16" rx="2" fill="none" stroke="#9fd6ee" strokeWidth=".8" />
    <text x="15" y="14" textAnchor="middle" fontFamily="Sora, Arial, sans-serif" fontWeight="800" fontSize="9.5" fill="#fff">CB</text>
  </svg>
);
