'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { vibrate } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface KeypadProps {
  onSendDTMF: (digit: string) => void;
  onClose: () => void;
}

export function Keypad({ onSendDTMF, onClose }: KeypadProps) {
  const digits = [
    { value: '1', sub: '' },
    { value: '2', sub: 'ABC' },
    { value: '3', sub: 'DEF' },
    { value: '4', sub: 'GHI' },
    { value: '5', sub: 'JKL' },
    { value: '6', sub: 'MNO' },
    { value: '7', sub: 'PQRS' },
    { value: '8', sub: 'TUV' },
    { value: '9', sub: 'WXYZ' },
    { value: '*', sub: '' },
    { value: '0', sub: '+ ' },
    { value: '#', sub: '' },
  ];

  return (
    <div className="flex flex-col items-center justify-center bg-[#0a0a0c] p-4 rounded-t-3xl shadow-lg relative">
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-white/50 hover:text-white"
        aria-label="Close keypad"
      >
        <X size={24} />
      </button>
      <div className="grid grid-cols-3 gap-x-8 gap-y-4 mb-6 mt-8">
        {digits.map((digit) => (
          <button
            key={digit.value}
            onClick={() => {
              vibrate(50);
              onSendDTMF(digit.value);
            }}
            className="flex flex-col items-center justify-center h-16 w-16 rounded-full bg-white/10 text-white text-2xl font-semibold active:scale-95 transition-all duration-75"
          >
            {digit.value}
            {digit.sub && <span className="text-[8px] font-bold uppercase text-white/50 mt-0.5">{digit.sub}</span>}
          </button>
        ))}
      </div>
      <p className="text-white/30 text-xs mt-4">DTMF tones sent to the other party.</p>
    </div>
  );
}
