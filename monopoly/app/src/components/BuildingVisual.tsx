import React from 'react';

interface BuildingVisualProps {
  level: 0 | 1 | 2 | 3 | 4;
  type?: 'PROPERTY' | 'RESORT';
  accentColor?: string;
  size?: 'tile' | 'md' | 'lg';
  className?: string;
}

/**
 * Helper to derive light/dark face shades from a hex color, or clean defaults.
 */
function adjustHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const SIZE_CLASSES: Record<NonNullable<BuildingVisualProps['size']>, string> = {
  tile: 'w-9 h-6 sm:w-12 sm:h-8',
  md: 'w-12 h-9',
  lg: 'w-16 h-12',
};

/**
 * Single isometric miniature house anchored around (cx, cy).
 */
const IsoHouse: React.FC<{
  cx: number;
  cy: number;
  scale?: number;
  roofColor: string;
  roofLight: string;
  roofDark: string;
}> = ({ cx, cy, scale = 1, roofColor, roofLight, roofDark }) => (
  <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
    {/* Ground shadow */}
    <ellipse cx="0" cy="7.5" rx="9" ry="3.2" fill="rgba(15, 23, 42, 0.28)" />
    {/* Left sunlit wall */}
    <polygon
      points="-7,3.5 0,7 0,-1 -7,-4.5"
      fill="#F8FAFC"
      stroke="#1E293B"
      strokeWidth="0.65"
      strokeLinejoin="round"
    />
    {/* Right shaded wall */}
    <polygon
      points="0,7 7,3.5 7,-4.5 0,-1"
      fill="#CBD5E1"
      stroke="#1E293B"
      strokeWidth="0.65"
      strokeLinejoin="round"
    />
    {/* Warm glowing windows */}
    <polygon points="-4.8,0.5 -2.2,1.8 -2.2,3.8 -4.8,2.5" fill="#FBBF24" />
    <polygon points="2.2,1.8 4.8,0.5 4.8,2.5 2.2,3.8" fill="#F59E0B" />
    {/* Pitched isometric roof */}
    <polygon
      points="-8.2,-4.2 0,-0.2 0,-7.5 -4.2,-8.2"
      fill={roofLight}
      stroke="#0F172A"
      strokeWidth="0.7"
      strokeLinejoin="round"
    />
    <polygon
      points="0,-0.2 8.2,-4.2 4.2,-8.2 0,-7.5"
      fill={roofDark}
      stroke="#0F172A"
      strokeWidth="0.7"
      strokeLinejoin="round"
    />
    {/* Roof ridge highlight */}
    <line
      x1="-4"
      y1="-8"
      x2="4"
      y2="-8"
      stroke={roofColor}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </g>
);

export const BuildingVisual: React.FC<BuildingVisualProps> = ({
  level,
  type = 'PROPERTY',
  accentColor = '#10B981',
  size = 'tile',
  className = '',
}) => {
  const roofLight = adjustHex(accentColor, 28);
  const roofDark = adjustHex(accentColor, -28);

  if (type === 'RESORT') {
    return (
      <svg
        viewBox="0 0 64 42"
        className={`${SIZE_CLASSES[size]} drop-shadow-sm shrink-0 ${className}`}
        aria-label="Khu nghỉ dưỡng"
      >
        {/* Turquoise resort lagoon base */}
        <ellipse cx="32" cy="34" rx="22" ry="5.5" fill="#06B6D4" opacity="0.28" />
        <ellipse cx="32" cy="33" rx="16" ry="4" fill="#22D3EE" opacity="0.45" />
        {/* Wooden deck */}
        <polygon
          points="19,29 32,34.5 45,29 32,23.5"
          fill="#D97706"
          stroke="#78350F"
          strokeWidth="0.8"
        />
        {/* Resort Bungalow */}
        <IsoHouse
          cx={31}
          cy={23}
          scale={1.15}
          roofColor={accentColor}
          roofLight={roofLight}
          roofDark={roofDark}
        />
        {/* Palm Tree */}
        <path
          d="M46,29 Q47,21 49,15"
          fill="none"
          stroke="#92400E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M49,15 Q43,12 40,16 M49,15 Q55,12 57,16 M49,15 Q47,9 43,10 M49,15 Q52,9 55,11"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Level 0: Owned Empty Land -> Owner pennant flag on staked plot
  if (level === 0) {
    return (
      <svg
        viewBox="0 0 64 42"
        className={`${SIZE_CLASSES[size]} shrink-0 ${className}`}
        aria-label="Đất đã sở hữu"
      >
        <polygon
          points="14,29 32,37 50,29 32,21"
          fill={`${accentColor}26`}
          stroke={accentColor}
          strokeWidth="1.2"
          strokeDasharray="2.5 2"
        />
        {/* Flag pole */}
        <line
          x1="31"
          y1="29"
          x2="31"
          y2="10"
          stroke="#1E293B"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="31" cy="9.5" r="1.5" fill="#FBBF24" />
        {/* Pennant flag */}
        <polygon
          points="31.5,11 45,15.5 31.5,20"
          fill={accentColor}
          stroke="#0F172A"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Level 1: Single Cottage
  if (level === 1) {
    return (
      <svg
        viewBox="0 0 64 42"
        className={`${SIZE_CLASSES[size]} drop-shadow-sm shrink-0 ${className}`}
        aria-label="1 Nhà"
      >
        <IsoHouse
          cx={32}
          cy={24}
          scale={1.45}
          roofColor={accentColor}
          roofLight={roofLight}
          roofDark={roofDark}
        />
      </svg>
    );
  }

  // Level 2: Two Staggered Houses
  if (level === 2) {
    return (
      <svg
        viewBox="0 0 64 42"
        className={`${SIZE_CLASSES[size]} drop-shadow-sm shrink-0 ${className}`}
        aria-label="2 Nhà"
      >
        <IsoHouse
          cx={23}
          cy={21}
          scale={1.18}
          roofColor={accentColor}
          roofLight={roofLight}
          roofDark={roofDark}
        />
        <IsoHouse
          cx={40}
          cy={26}
          scale={1.25}
          roofColor={accentColor}
          roofLight={roofLight}
          roofDark={roofDark}
        />
      </svg>
    );
  }

  // Level 3: Three-building Town Complex (2 houses + taller rear tower)
  if (level === 3) {
    return (
      <svg
        viewBox="0 0 64 42"
        className={`${SIZE_CLASSES[size]} drop-shadow-sm shrink-0 ${className}`}
        aria-label="3 Nhà"
      >
        {/* Rear taller townhouse */}
        <g transform="translate(32, 16)">
          <ellipse cx="0" cy="9" rx="9.5" ry="3.5" fill="rgba(15, 23, 42, 0.25)" />
          <polygon
            points="-7.5,4 0,8 0,-6 -7.5,-9.5"
            fill="#F8FAFC"
            stroke="#1E293B"
            strokeWidth="0.7"
          />
          <polygon
            points="0,8 7.5,4 7.5,-9.5 0,-6"
            fill="#CBD5E1"
            stroke="#1E293B"
            strokeWidth="0.7"
          />
          <polygon points="-5,-5 -2,-3.5 -2,-1.5 -5,-3" fill="#FBBF24" />
          <polygon points="-5,-0.5 -2,1 -2,3 -5,1.5" fill="#FBBF24" />
          <polygon points="2,-3.5 5,-5 5,-3 2,-1.5" fill="#F59E0B" />
          <polygon points="2,1 5,-0.5 5,1.5 2,3" fill="#F59E0B" />
          <polygon
            points="-8.5,-9.5 0,-5.5 8.5,-9.5 0,-13.5"
            fill={roofLight}
            stroke="#0F172A"
            strokeWidth="0.75"
          />
        </g>
        {/* Front left & right houses */}
        <IsoHouse
          cx={19}
          cy={28}
          scale={1.08}
          roofColor={accentColor}
          roofLight={roofLight}
          roofDark={roofDark}
        />
        <IsoHouse
          cx={45}
          cy={28}
          scale={1.08}
          roofColor={accentColor}
          roofLight={roofLight}
          roofDark={roofDark}
        />
      </svg>
    );
  }

  // Level 4: Grand 5-Star Golden Landmark Hotel
  return (
    <svg
      viewBox="0 0 64 44"
      className={`${SIZE_CLASSES[size]} drop-shadow-md shrink-0 ${className}`}
      aria-label="Khách sạn 5 sao"
    >
      {/* Owner colored grand plaza base */}
      <polygon
        points="11,33 32,41.5 53,33 32,24.5"
        fill={accentColor}
        stroke="#0F172A"
        strokeWidth="0.9"
      />
      <polygon
        points="15,32.5 32,39.5 49,32.5 32,25.5"
        fill="#FEF3C7"
        opacity="0.85"
      />
      {/* Left wing */}
      <polygon
        points="18,31 25,34 25,21 18,18"
        fill="#FFFBEB"
        stroke="#78350F"
        strokeWidth="0.7"
      />
      {/* Right wing */}
      <polygon
        points="39,34 46,31 46,18 39,21"
        fill="#FDE68A"
        stroke="#78350F"
        strokeWidth="0.7"
      />
      {/* Central Skyscraper Tower */}
      <polygon
        points="23,33.5 32,37.5 32,12 23,8"
        fill="#FEF9C3"
        stroke="#78350F"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="32,37.5 41,33.5 41,8 32,12"
        fill="#F59E0B"
        stroke="#78350F"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Golden lit window bands */}
      <line x1="25" y1="14" x2="30" y2="16.2" stroke="#D97706" strokeWidth="1.5" />
      <line x1="25" y1="19" x2="30" y2="21.2" stroke="#D97706" strokeWidth="1.5" />
      <line x1="25" y1="24" x2="30" y2="26.2" stroke="#D97706" strokeWidth="1.5" />
      <line x1="25" y1="29" x2="30" y2="31.2" stroke="#D97706" strokeWidth="1.5" />
      <line x1="34" y1="16.2" x2="39" y2="14" stroke="#FEF08A" strokeWidth="1.5" />
      <line x1="34" y1="21.2" x2="39" y2="19" stroke="#FEF08A" strokeWidth="1.5" />
      <line x1="34" y1="26.2" x2="39" y2="24" stroke="#FEF08A" strokeWidth="1.5" />
      <line x1="34" y1="31.2" x2="39" y2="29" stroke="#FEF08A" strokeWidth="1.5" />
      {/* Crown Roof & Spire */}
      <polygon
        points="22,8 32,12.2 42,8 32,4"
        fill="#FBBF24"
        stroke="#78350F"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <line
        x1="32"
        y1="4"
        x2="32"
        y2="0.8"
        stroke="#F59E0B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* 5-star gold emblem */}
      <circle cx="32" cy="1.8" r="1.8" fill="#FDE047" stroke="#92400E" strokeWidth="0.5" />
    </svg>
  );
};
