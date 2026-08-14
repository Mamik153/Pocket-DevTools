import React from "react";

export function HeroDeveloperIllustration({ className = "w-full max-w-sm h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A8B5" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="hero-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF9500" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="hero-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.7" />
        </linearGradient>
        <filter id="glow-hero" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Ambient background glow */}
      <circle cx="200" cy="150" r="110" fill="url(#hero-grad-1)" opacity="0.15" filter="url(#glow-hero)" />

      {/* Floating Sparkles / Particles */}
      <circle cx="70" cy="60" r="4" fill="#FF9500" opacity="0.8" />
      <circle cx="340" cy="80" r="6" fill="#00A8B5" opacity="0.8" />
      <circle cx="320" cy="240" r="5" fill="#8B5CF6" opacity="0.8" />
      <circle cx="50" cy="220" r="4" fill="#EC4899" opacity="0.7" />

      {/* Main IDE Window */}
      <g transform="translate(75, 45)">
        {/* Window Shadow & Frame */}
        <rect x="0" y="0" width="250" height="175" rx="16" fill="#FFFFFF" fillOpacity="0.85" stroke="#E2E8F0" strokeWidth="2" />
        {/* Window Titlebar */}
        <rect x="0" y="0" width="250" height="32" rx="16" fill="url(#hero-grad-1)" opacity="0.12" />
        <line x1="0" y1="32" x2="250" y2="32" stroke="#E2E8F0" strokeWidth="1" />
        {/* Window Control Buttons */}
        <circle cx="20" cy="16" r="5" fill="#FF5F56" />
        <circle cx="36" cy="16" r="5" fill="#FFBD2E" />
        <circle cx="52" cy="16" r="5" fill="#27C93F" />
        {/* Code Lines Placeholder */}
        <rect x="20" y="50" width="80" height="8" rx="4" fill="url(#hero-grad-1)" />
        <rect x="110" y="50" width="50" height="8" rx="4" fill="#94A3B8" opacity="0.5" />
        <rect x="35" y="70" width="120" height="8" rx="4" fill="url(#hero-grad-2)" />
        <rect x="35" y="90" width="90" height="8" rx="4" fill="#64748B" opacity="0.4" />
        <rect x="50" y="110" width="70" height="8" rx="4" fill="url(#hero-grad-3)" />
        <rect x="20" y="130" width="160" height="8" rx="4" fill="#00A8B5" opacity="0.6" />
        <rect x="20" y="150" width="100" height="8" rx="4" fill="#94A3B8" opacity="0.4" />
      </g>

      {/* Floating Tool Badge 1: JSON Braces */}
      <g transform="translate(45, 120)">
        <rect x="0" y="0" width="56" height="56" rx="14" fill="#FFFFFF" stroke="url(#hero-grad-1)" strokeWidth="2" />
        <path d="M22 20C20 20 18 22 18 24V26C18 27.5 17 28 16 28C17 28 18 28.5 18 30V32C18 34 20 36 22 36" stroke="#00A8B5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M34 20C36 20 38 22 38 24V26C38 27.5 39 28 40 28C39 28 38 28.5 38 30V32C38 34 36 36 34 36" stroke="#00A8B5" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Floating Tool Badge 2: Markdown & PDF */}
      <g transform="translate(290, 140)">
        <rect x="0" y="0" width="60" height="60" rx="16" fill="#FFFFFF" stroke="url(#hero-grad-2)" strokeWidth="2" />
        <path d="M20 42V18L28 26L36 18V42" stroke="#FF9500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M40 32L40 42M40 42L36 38M40 42L44 38" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Floating Gear / Shield Badge 3 */}
      <g transform="translate(260, 30)">
        <rect x="0" y="0" width="48" height="48" rx="12" fill="#FFFFFF" stroke="url(#hero-grad-3)" strokeWidth="2" />
        <path d="M24 14L32 18V25C32 30 28 34 24 36C20 34 16 30 16 25V18L24 14Z" fill="url(#hero-grad-3)" opacity="0.3" stroke="#8B5CF6" strokeWidth="2" />
      </g>
    </svg>
  );
}

export function EmptyStateIllustration({ className = "w-48 h-48 mx-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="70" fill="#00A8B5" fillOpacity="0.08" />
      <path
        d="M65 100C65 80.67 80.67 65 100 65C119.33 65 135 80.67 135 100"
        stroke="#94A3B8"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="85" cy="90" r="6" fill="#64748B" />
      <circle cx="115" cy="90" r="6" fill="#64748B" />
      <path
        d="M85 125C92 120 108 120 115 125"
        stroke="#FF9500"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
