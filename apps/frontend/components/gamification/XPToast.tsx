'use client';
import { useEffect, useState } from 'react';

let _showToast: (msg: string) => void = () => {};

export function showXPToast(msg: string) { _showToast(msg); }

export function XPToast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    _showToast = (msg) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 2000);
    };
  }, []);

  return (
    <div className={`fixed top-[66px] right-5 z-[999] px-4 py-2 rounded-full bg-ma1-purple/12 border border-ma1-purple/25 text-ma1-purple font-display text-[12.5px] font-bold transition-all duration-400 pointer-events-none
      ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
      {message}
    </div>
  );
}
