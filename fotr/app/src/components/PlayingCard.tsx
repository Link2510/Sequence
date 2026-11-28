import React from 'react';
import { SUIT_META } from '../game/chapters';
import { Card, Suit } from '../game/types';

interface SuitEmblemProps {
  suit: Suit;
  size?: number;
  className?: string;
}

export const SuitEmblem: React.FC<SuitEmblemProps> = ({ suit, size = 28, className = '' }) => {
  switch (suit) {
    case 'hills':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <circle cx="20" cy="12" r="5" fill="#D49B35" opacity="0.85" />
          <path d="M4 30C9 21 15 19 22 24C27 27 32 22 36 25V33H4V30Z" fill="#2F6B36" />
          <path d="M4 33C11 26 19 25 26 28C30 30 33 29 36 28V35H4V33Z" fill="#1F4C24" />
          <circle cx="14" cy="28" r="3" fill="#E8C77B" stroke="#1F4C24" strokeWidth="1.2" />
        </svg>
      );
    case 'forests':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <path d="M20 5L29 19H24L31 28H9L16 19H11L20 5Z" fill="#175E5B" />
          <path d="M20 9L25.5 18H21.5L26 25H14L18.5 18H14.5L20 9Z" fill="#26807B" />
          <rect x="18.2" y="28" width="3.6" height="7" rx="1" fill="#5A3E28" />
        </svg>
      );
    case 'mountains':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <path d="M4 33L15 11L22 23L27 15L36 33H4Z" fill="#344966" />
          <path d="M15 11L19 19L15 21L12 17L15 11Z" fill="#D9E2EC" />
          <path d="M27 15L30.5 22L27 23.5L24.5 20L27 15Z" fill="#D9E2EC" />
          <path d="M15 33V26C15 24 17 22.5 20 22.5C23 22.5 25 24 25 26V33H15Z" fill="#1E2B3D" />
        </svg>
      );
    case 'shadows':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <path d="M20 5C25 12 31 18 29 26C27.5 31 24 34 20 35C16 34 12.5 31 11 26C9 18 15 12 20 5Z" fill="#7C2230" />
          <path d="M20 12C23 17 25 21 24 26C23 29 21.5 31 20 31C18.5 31 17 29 16 26C15 21 17 17 20 12Z" fill="#D96B38" />
          <ellipse cx="20" cy="23" rx="1.7" ry="4.8" fill="#1B0A0D" />
        </svg>
      );
    case 'rings':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
          <circle cx="20" cy="20" r="12.5" stroke="#B57B14" strokeWidth="4.5" />
          <circle cx="20" cy="20" r="12.5" stroke="#F6D57A" strokeWidth="1.6" strokeDasharray="3 2" />
          <circle cx="20" cy="20" r="8.2" stroke="#8F5D0A" strokeWidth="1" opacity="0.65" />
        </svg>
      );
  }
};

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  playable?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  compact?: boolean;
  badgeText?: string;
  onClick?: () => void;
  title?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  playable = false,
  dimmed = false,
  highlighted = false,
  selected = false,
  compact = false,
  badgeText,
  onClick,
  title,
}) => {
  const sizeClasses = compact
    ? 'w-16 h-24 rounded-lg'
    : 'w-20 h-28 sm:w-24 sm:h-36 rounded-xl';

  if (faceDown || !card) {
    return (
      <div
        className={`${sizeClasses} relative select-none border border-[#C6932B]/50 bg-[#14261B] shadow-md flex items-center justify-center overflow-hidden`}
        title={title}
      >
        <div className="absolute inset-1 rounded-lg border border-[#C6932B]/30" />
        <svg width={compact ? 26 : 36} height={compact ? 26 : 36} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="14" stroke="#C6932B" strokeWidth="1.5" strokeOpacity="0.65" />
          <path d="M20 7L24 16L33 20L24 24L20 33L16 24L7 20L16 16L20 7Z" stroke="#C6932B" strokeWidth="1.3" fill="#C6932B" fillOpacity="0.14" />
          <circle cx="20" cy="20" r="3" fill="#C6932B" fillOpacity="0.8" />
        </svg>
      </div>
    );
  }

  const meta = SUIT_META[card.suit];
  const isOneRing = card.id === 'rings-1';

  const interactiveClasses = onClick && playable
    ? 'cursor-pointer hover:-translate-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B85C] active:translate-y-0'
    : onClick
    ? 'cursor-not-allowed'
    : '';

  const stateBorder = selected
    ? 'ring-2 ring-[#E5B85C] -translate-y-2.5 shadow-xl'
    : highlighted
    ? 'ring-2 ring-emerald-400 -translate-y-2 shadow-lg'
    : isOneRing
    ? 'border-2 border-[#C6932B] shadow-[0_0_16px_rgba(198,147,43,0.35)]'
    : 'border border-[#B79D6B] shadow-md';

  const opacityClass = dimmed ? 'opacity-45 grayscale-[35%]' : 'opacity-100';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={playable ? onClick : undefined}
      disabled={onClick ? !playable : undefined}
      title={title}
      aria-label={`${card.rank} ${meta.label}${!playable && onClick ? ' (Chưa hợp lệ)' : ''}`}
      className={`${sizeClasses} ${stateBorder} ${interactiveClasses} ${opacityClass} parchment-card relative flex flex-col justify-between p-1.5 sm:p-2 text-left transition-transform duration-150 ease-out select-none shrink-0`}
    >
      {/* Inner filigree frame */}
      <div
        className="pointer-events-none absolute inset-1 rounded-lg border opacity-55"
        style={{ borderColor: meta.borderColor }}
      />

      {/* Top corner */}
      <div className="relative z-10 flex items-start justify-between leading-none">
        <span
          className={`font-mono font-bold tabular-nums ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}
          style={{ color: meta.color }}
        >
          {card.rank}
        </span>
        <SuitEmblem suit={card.suit} size={compact ? 14 : 18} />
      </div>

      {/* Center medallion */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div
          className={`${compact ? 'w-9 h-9' : 'w-11 h-11 sm:w-13 sm:h-13'} rounded-full flex items-center justify-center border`}
          style={{ backgroundColor: meta.bgTint, borderColor: meta.borderColor }}
        >
          <SuitEmblem suit={card.suit} size={compact ? 22 : 30} />
        </div>
        {!compact && (
          <span
            className="mt-1 text-[10px] font-semibold tracking-tight leading-none truncate max-w-full"
            style={{ color: meta.color }}
          >
            {isOneRing ? 'Nhẫn Duy Nhất' : meta.label}
          </span>
        )}
      </div>

      {/* Bottom corner */}
      <div className="relative z-10 flex items-end justify-between leading-none">
        <span className="text-[9px] font-medium text-[#5B4D38] truncate max-w-[65%]">
          {badgeText || (card.suit === 'rings' ? 'TRUMP' : '')}
        </span>
        <span
          className={`font-mono font-bold tabular-nums ${compact ? 'text-xs' : 'text-sm sm:text-base'}`}
          style={{ color: meta.color }}
        >
          {card.rank}
        </span>
      </div>
    </Tag>
  );
};
