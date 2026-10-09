'use client';

import React from 'react';
import { Button } from './ui/button';
import { PhoneIncoming } from 'lucide-react';

interface CallBackButtonProps {
  callerName: string;
  onCallback: () => void;
}

export function CallBackButton({ callerName, onCallback }: CallBackButtonProps) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
      <Button 
        onClick={onCallback} 
        className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-3 shadow-lg flex items-center space-x-2"
      >
        <PhoneIncoming className="h-5 w-5" />
        <span>Call back {callerName}</span>
      </Button>
    </div>
  );
}
