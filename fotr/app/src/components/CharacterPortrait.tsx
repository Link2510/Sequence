import React, { useState } from 'react';
import { CHARACTERS } from '../game/chapters';
import { CharacterId } from '../game/types';

interface CharacterPortraitProps {
  characterId: CharacterId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CREST_SVG: Record<string, React.ReactNode> = {
  ring: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="13" stroke="#E8BF5A" strokeWidth="4.5" />
      <circle cx="24" cy="24" r="13" stroke="#FFF1C1" strokeWidth="1.2" strokeDasharray="3 2" />
    </svg>
  ),
  acorn: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M24 10C18 10 14 14 14 19H34C34 14 30 10 24 10Z" fill="#7C5832" stroke="#E5C07B" strokeWidth="1.5" />
      <path d="M24 7V10" stroke="#E5C07B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 19H32V25C32 31 28.5 36 24 39C19.5 36 16 31 16 25V19Z" fill="#4A7C4E" stroke="#E5C07B" strokeWidth="1.5" />
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M24 16V40" stroke="#D1B280" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24" cy="13" r="5.5" fill="#F2D07B" stroke="#FFFFFF" strokeWidth="1.2" />
    </svg>
  ),
  lantern: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M18 16H30L32 33H16L18 16Z" fill="#F2B84B" fillOpacity="0.3" stroke="#E8BF5A" strokeWidth="2" />
      <path d="M24 20C26 23 26.5 26 24 29C21.5 26 22 23 24 20Z" fill="#FFD97D" />
      <path d="M20 16C20 12 28 12 28 16" stroke="#E8BF5A" strokeWidth="2" />
    </svg>
  ),
  horn: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M13 31C18 31 27 25 34 13L37 16C31 29 22 36 11 36L13 31Z" fill="#C9A86A" stroke="#F5EEDB" strokeWidth="1.5" />
    </svg>
  ),
  goblet: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M15 12H33L30 23C29 26.5 26.5 28 24 28C21.5 28 19 26.5 18 23L15 12Z" fill="#B57B14" stroke="#F5EEDB" strokeWidth="1.6" />
      <path d="M24 28V36M18 36H30" stroke="#F5EEDB" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  sword: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M24 8L27 30H21L24 8Z" fill="#D9E2EC" />
      <path d="M16 30H32" stroke="#E8BF5A" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M24 30V39" stroke="#C6932B" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  bow: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M18 10C29 14 29 34 18 38" stroke="#D1A666" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M18 10V38" stroke="#E6EEF5" strokeWidth="1.1" />
      <path d="M13 24H35M31 20L35 24L31 28" stroke="#9FE0C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  axe: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M24 10V39" stroke="#A67B5B" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 13C18 15 20 18 24 18C28 18 30 15 35 13C35 21 31 25 24 24C17 25 13 21 13 13Z" fill="#B8C7D9" stroke="#F5EEDB" strokeWidth="1.4" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M13 12H35V24C35 31 29.5 36 24 38C18.5 36 13 31 13 24V12Z" fill="#7C2230" stroke="#E8BF5A" strokeWidth="2" />
      <path d="M24 16V33M17 22H31" stroke="#E8BF5A" strokeWidth="1.8" />
    </svg>
  ),
  feather: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M15 36C18 24 25 14 35 10C33 21 26 30 15 36Z" fill="#3B82A6" stroke="#F5EEDB" strokeWidth="1.6" />
      <path d="M12 39L32 13" stroke="#E8BF5A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  lily: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M24 10C28 17 31 23 24 31C17 23 20 17 24 10Z" fill="#E8D8A0" stroke="#C6932B" strokeWidth="1.5" />
      <path d="M13 25C18 22 22 25 24 32C18 32 14 29 13 25Z" fill="#9FE0C8" stroke="#3E847F" strokeWidth="1.3" />
      <path d="M35 25C30 22 26 25 24 32C30 32 34 29 35 25Z" fill="#9FE0C8" stroke="#3E847F" strokeWidth="1.3" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M24 8L27.5 20.5L40 24L27.5 27.5L24 40L20.5 27.5L8 24L20.5 20.5L24 8Z" fill="#F4E3A1" stroke="#E8BF5A" strokeWidth="1.5" />
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <path d="M11 32L14 16L21 23L24 13L27 23L34 16L37 32H11Z" fill="#C6932B" stroke="#FFF1C1" strokeWidth="1.6" />
      <circle cx="24" cy="12" r="2" fill="#9FE0C8" />
    </svg>
  ),
  mirror: (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" aria-hidden="true">
      <ellipse cx="24" cy="22" rx="11" ry="13" fill="#23484A" stroke="#E8BF5A" strokeWidth="2.2" />
      <path d="M24 14L26 20L32 22L26 24L24 30L22 24L16 22L22 20L24 14Z" fill="#E8F4F8" opacity="0.85" />
    </svg>
  ),
};

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  characterId,
  size = 'md',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const char = CHARACTERS[characterId];

  const dims =
    size === 'sm'
      ? 'w-10 h-12 rounded-lg'
      : size === 'lg'
      ? 'w-24 h-32 rounded-xl'
      : 'w-12 h-16 rounded-lg';

  const showImg = char.portraitUrl && !imgFailed;

  return (
    <div
      className={`${dims} ${className} relative overflow-hidden border border-[#C6932B]/70 bg-[#142319] shrink-0 shadow-sm`}
      style={{
        background: showImg
          ? undefined
          : `radial-gradient(circle at 50% 35%, ${char.accentColor}55, #101C14 82%)`,
      }}
    >
      {showImg ? (
        <img
          src={char.portraitUrl}
          alt={char.name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full p-1.5 flex flex-col items-center justify-center">
          <div className="w-full h-full flex items-center justify-center">
            {CREST_SVG[char.crestType]}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#E5B85C]/25 rounded-[inherit]" />
    </div>
  );
};
