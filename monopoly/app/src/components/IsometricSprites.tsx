import React from 'react';

interface FlagProps {
  colorHex: string;
}

/** Level 0: Small upright owner flag anchored on empty owned land */
export const OwnerFlagSvg: React.FC<FlagProps> = ({ colorHex }) => (
  <svg
    viewBox="0 0 28 36"
    className="w-5 h-6 sm:w-6 sm:h-7 drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)]"
    aria-hidden="true"
  >
    {/* Base disc */}
    <ellipse cx="9" cy="33" rx="6" ry="2.2" fill="rgba(0,0,0,0.35)" />
    {/* Flagpole */}
    <rect x="8" y="4" width="2.4" height="29" rx="1.2" fill="#E2E8F0" />
    <circle cx="9.2" cy="4" r="2.2" fill="#FBBF24" />
    {/* Pennant */}
    <path
      d="M10.4 6 L26 11.5 L10.4 17 Z"
      fill={colorHex}
      stroke="#FFFFFF"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

interface VillaProps {
  variant?: 'emerald' | 'sky';
}

/** Levels 1-3: Crisp 2.5D miniature villa SVG */
export const VillaSvg: React.FC<VillaProps> = ({ variant = 'emerald' }) => {
  const roofMain = variant === 'sky' ? '#0284C7' : '#059669';
  const roofDark = variant === 'sky' ? '#0369A1' : '#047857';
  const roofLight = variant === 'sky' ? '#38BDF8' : '#34D399';

  return (
    <svg
      viewBox="0 0 32 34"
      className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)] shrink-0"
      aria-hidden="true"
    >
      {/* Ground shadow */}
      <ellipse cx="16" cy="31" rx="11" ry="2.5" fill="rgba(0,0,0,0.3)" />
      {/* Front wall */}
      <polygon
        points="6,16 16,21 16,30 6,25"
        fill="#F8FAFC"
        stroke="#0F172A"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Side wall */}
      <polygon
        points="16,21 26,16 26,25 16,30"
        fill="#CBD5E1"
        stroke="#0F172A"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Pitched Roof Left */}
      <polygon
        points="4,16 16,6 16,21"
        fill={roofMain}
        stroke="#0F172A"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Pitched Roof Right */}
      <polygon
        points="16,6 28,16 16,21"
        fill={roofDark}
        stroke="#0F172A"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Roof highlight ridge */}
      <line x1="16" y1="6" x2="16" y2="21" stroke={roofLight} strokeWidth="1.2" />
      {/* Tiny Windows */}
      <rect x="9" y="20" width="3" height="3.5" rx="0.5" fill="#38BDF8" />
      <rect x="19.5" y="20" width="3" height="3.5" rx="0.5" fill="#0EA5E9" />
    </svg>
  );
};

/** Level 4: High-rise Crimson & Gold 5-Star Hotel SVG (2x larger than villas) */
export const HotelSvg: React.FC = () => (
  <svg
    viewBox="0 0 46 58"
    className="w-8 h-10 sm:w-10 sm:h-12 drop-shadow-[0_6px_6px_rgba(0,0,0,0.6)]"
    aria-hidden="true"
  >
    {/* Ground shadow */}
    <ellipse cx="23" cy="54" rx="16" ry="3.5" fill="rgba(0,0,0,0.4)" />

    {/* Left Tower Facade */}
    <polygon
      points="9,16 23,23 23,52 9,45"
      fill="#DC2626"
      stroke="#450A0A"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Right Tower Facade */}
    <polygon
      points="23,23 37,16 37,45 23,52"
      fill="#991B1B"
      stroke="#450A0A"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Gold Roof Terrace */}
    <polygon
      points="23,9 37,16 23,23 9,16"
      fill="#FBBF24"
      stroke="#78350F"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    {/* Penthouse Crown */}
    <polygon
      points="17,11 23,4 29,11 23,15"
      fill="#FDE047"
      stroke="#92400E"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    {/* Windows Grid - Left */}
    <g fill="#FEF08A">
      <rect x="12" y="21" width="3" height="3.5" rx="0.5" />
      <rect x="17" y="23.5" width="3" height="3.5" rx="0.5" />
      <rect x="12" y="28" width="3" height="3.5" rx="0.5" />
      <rect x="17" y="30.5" width="3" height="3.5" rx="0.5" />
      <rect x="12" y="35" width="3" height="3.5" rx="0.5" />
      <rect x="17" y="37.5" width="3" height="3.5" rx="0.5" />
    </g>
    {/* Windows Grid - Right */}
    <g fill="#FDE047" opacity="0.9">
      <rect x="26" y="23.5" width="3" height="3.5" rx="0.5" />
      <rect x="31" y="21" width="3" height="3.5" rx="0.5" />
      <rect x="26" y="30.5" width="3" height="3.5" rx="0.5" />
      <rect x="31" y="28" width="3" height="3.5" rx="0.5" />
      <rect x="26" y="37.5" width="3" height="3.5" rx="0.5" />
      <rect x="31" y="35" width="3" height="3.5" rx="0.5" />
    </g>
    {/* Golden Entrance */}
    <polygon points="20,45 23,46.5 23,52 20,50.5" fill="#FBBF24" />
    <polygon points="23,46.5 26,45 26,50.5 23,52" fill="#D97706" />
  </svg>
);

/** Resort Landmark Pavilion SVG */
export const ResortPavilionSvg: React.FC<{ colorHex: string }> = ({ colorHex }) => (
  <svg
    viewBox="0 0 36 38"
    className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_4px_4px_rgba(0,0,0,0.45)]"
    aria-hidden="true"
  >
    <ellipse cx="18" cy="34" rx="12" ry="2.8" fill="rgba(0,0,0,0.35)" />
    <rect x="16.5" y="14" width="3" height="19" fill="#E2E8F0" />
    {/* Umbrella / Resort Canopy */}
    <path
      d="M5 17 C8 8, 28 8, 31 17 Z"
      fill={colorHex}
      stroke="#FFFFFF"
      strokeWidth="1.2"
    />
    <path d="M18 9 L12 17 M18 9 L24 17" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
    <circle cx="18" cy="9" r="2" fill="#FBBF24" />
  </svg>
);
