"use client";

import { useId } from "react";

export function Sparkle({
  size = 22,
  pulse = false,
}: {
  size?: number;
  pulse?: boolean;
}) {
  const uid = `s${useId().replace(/:/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={pulse ? "sparkle-pulse" : undefined}
      aria-hidden
    >
      <path
        d="M12 2.2c.35 3.7 1.7 6.2 4.9 8.8-3.2 2.6-4.55 5.1-4.9 8.8-.35-3.7-1.7-6.2-4.9-8.8C10.3 8.4 11.65 5.9 12 2.2Z"
        fill={`url(#${uid})`}
      />
      <defs>
        <linearGradient id={uid} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset=".35" stopColor="#9B72F2" />
          <stop offset=".65" stopColor="#D96570" />
          <stop offset="1" stopColor="#F4B400" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconMic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" className={className} aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V20H9v2h6v-2h-2v-2.07A7 7 0 0 0 19 11h-2Z" />
    </svg>
  );
}

export function IconSend({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className={className} aria-hidden>
      <path d="M3.4 20.6 21 12 3.4 3.4 3 10.7 15 12 3 13.3Z" />
    </svg>
  );
}

export function IconStop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className={className} aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function AiBody({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+?\*\*)/g);
  return (
    <p className="chat-agent">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
      )}
    </p>
  );
}
  return (
    <div className="flex items-center gap-3 py-2">
      <Sparkle pulse />
      <span className="text-[15px] text-[#5f6368]">{label}</span>
      <span className="thinking-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}
