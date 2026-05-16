"use client";

import { ReactNode } from "react";

interface BuddyBubbleProps {
  children: ReactNode;
  emoji?: string;
}

export default function BuddyBubble({ children, emoji = "🤖" }: BuddyBubbleProps) {
  return (
    <div className="max-w-md mx-auto px-4 mt-4">
      <div className="flex gap-3 items-start">
        <div className="w-9 h-9 rounded-full bg-[#1f5eff] flex items-center justify-center text-base flex-shrink-0">
          {emoji}
        </div>
        <div className="flex-1 bg-white rounded-[20px] rounded-tl-sm shadow-sm border border-slate-100 px-4 py-3 text-sm text-slate-700 leading-6">
          {children}
        </div>
      </div>
    </div>
  );
}
