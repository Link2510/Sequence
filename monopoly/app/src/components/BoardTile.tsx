import React from 'react';
import {
  Anchor,
  Flag,
  HelpCircle,
  Palmtree,
  PartyPopper,
  Plane,
  Receipt,
} from 'lucide-react';
import { COLOR_GROUP_META, RESORT_RENTS } from '../data/boardData';
import { PLAYER_COLORS } from '../data/characters';
import { BoardTile as BoardTileType, Player, PropertyState } from '../types/game';
import {
  calculateRent,
  formatMoney,
  getPlayerResortCount,
  playerHasMonopoly,
} from '../utils/gameLogic';
import { BuildingVisual } from './BuildingVisual';

interface BoardTileProps {
  tile: BoardTileType;
  ownership: Record<number, PropertyState>;
  players: Player[];
  movingPlayerId: number | null;
  selectableForFestival: boolean;
  selectableForWorldTour: boolean;
  onTileClick: (tile: BoardTileType) => void;
}

export const BoardTile: React.FC<BoardTileProps> = ({
  tile,
  ownership,
  players,
  movingPlayerId,
  selectableForFestival,
  selectableForWorldTour,
  onTileClick,
}) => {
  const prop = ownership[tile.id];
  const owner = prop ? players.find((p) => p.id === prop.ownerId) : undefined;
  const ownerColor = owner ? PLAYER_COLORS[owner.color] : null;
  const groupMeta = tile.group ? COLOR_GROUP_META[tile.group] : null;
  const currentRent = prop ? calculateRent(tile, ownership) : null;
  const ownerHasMono =
    prop && tile.group
      ? playerHasMonopoly(prop.ownerId, tile.group, ownership)
      : false;
  const ownerResortCount = prop
    ? getPlayerResortCount(prop.ownerId, ownership)
    : 0;

  const playersHere = players.filter((p) => !p.bankrupt && p.position === tile.id);
  const isInteractiveTarget = selectableForFestival || selectableForWorldTour;
  const hasFestival = Boolean(prop?.hasFestival);

  const isCorner =
    tile.type === 'START' ||
    tile.type === 'LOST_ISLAND' ||
    tile.type === 'FESTIVAL' ||
    tile.type === 'WORLD_TOUR';

  const getCornerStyle = () => {
    switch (tile.type) {
      case 'START':
        return 'bg-gradient-to-br from-emerald-50 to-amber-50 text-slate-900 border-emerald-400';
      case 'LOST_ISLAND':
        return 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100 border-amber-500/60';
      case 'FESTIVAL':
        return 'bg-gradient-to-br from-violet-100 to-amber-50 text-slate-900 border-violet-400';
      case 'WORLD_TOUR':
        return 'bg-gradient-to-br from-sky-100 to-cyan-50 text-slate-900 border-sky-400';
      default:
        return 'bg-white text-slate-900';
    }
  };

  // Position the hover popover inward toward the board center so it never clips
  const getPopoverPositionClass = () => {
    if (tile.row === 0) {
      const horiz =
        tile.col <= 2
          ? 'left-0'
          : tile.col >= 6
          ? 'right-0'
          : 'left-1/2 -translate-x-1/2';
      return `top-full mt-2 ${horiz}`;
    }
    if (tile.row === 8) {
      const horiz =
        tile.col <= 2
          ? 'left-0'
          : tile.col >= 6
          ? 'right-0'
          : 'left-1/2 -translate-x-1/2';
      return `bottom-full mb-2 ${horiz}`;
    }
    if (tile.col === 0) {
      return 'left-full ml-2 top-1/2 -translate-y-1/2';
    }
    return 'right-full mr-2 top-1/2 -translate-y-1/2';
  };

  return (
    <div
      style={{
        gridRowStart: tile.row + 1,
        gridColumnStart: tile.col + 1,
      }}
      className={`group relative w-full h-full hover:z-30 focus-within:z-30 ${
        isInteractiveTarget ? 'z-20' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onTileClick(tile)}
        style={
          !isCorner && ownerColor
            ? {
                backgroundColor: `${ownerColor.hex}18`,
                borderColor: `${ownerColor.hex}88`,
              }
            : undefined
        }
        className={`relative w-full h-full flex flex-col justify-between overflow-hidden rounded-lg border text-left transition-all select-none p-1 sm:p-1.5 ${
          isCorner
            ? getCornerStyle()
            : ownerColor
            ? 'text-slate-900 group-hover:border-amber-400'
            : 'bg-[#F8FAFC] text-slate-900 border-slate-300/90 group-hover:border-amber-400'
        } ${
          hasFestival && !isInteractiveTarget
            ? 'animate-festival-glow border-amber-400 z-10'
            : ''
        } ${
          isInteractiveTarget
            ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/30 scale-[1.03] cursor-pointer'
            : 'cursor-default'
        }`}
      >
        {/* Festive Background Overlay when hosting Festival */}
        {hasFestival && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-400/20 via-amber-300/20 to-amber-400/25" />
        )}

        {/* Top Color Header for Properties & Resorts */}
        {!isCorner && groupMeta && (
          <div
            className={`relative z-10 w-full h-2 sm:h-2.5 rounded-sm ${groupMeta.barBg} flex items-center justify-between px-1 shrink-0`}
          />
        )}

        {/* Prominent Festival Badge */}
        {hasFestival && (
          <div
            title="Đang tổ chức Lễ Hội — Tiền thuê x2"
            className="pointer-events-none absolute top-0.5 right-0.5 z-20 flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-amber-500 text-white shadow-md border border-amber-200/80"
          >
            <PartyPopper className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
            <span className="font-mono-num text-[8px] sm:text-[10px] font-extrabold leading-none">
              x2
            </span>
          </div>
        )}

        {/* Owner Highlight Strip */}
        {ownerColor && (
          <div
            className="absolute inset-x-0 bottom-0 h-1.5 opacity-95"
            style={{ backgroundColor: ownerColor.hex }}
          />
        )}

        {/* Tile Content */}
        {isCorner ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5 px-0.5">
            {tile.type === 'START' && (
              <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            )}
            {tile.type === 'LOST_ISLAND' && (
              <Anchor className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            )}
            {tile.type === 'FESTIVAL' && (
              <PartyPopper className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
            )}
            {tile.type === 'WORLD_TOUR' && (
              <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
            )}
            <span className="font-display font-extrabold text-[9px] sm:text-[11px] leading-tight tracking-tight">
              {tile.shortName}
            </span>
            {tile.subtitle && (
              <span className="text-[7px] sm:text-[9px] opacity-75 leading-tight hidden sm:block">
                {tile.subtitle}
              </span>
            )}
          </div>
        ) : tile.type === 'CHANCE' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-amber-50/80 rounded">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 mb-0.5" />
            <span className="font-bold text-[9px] sm:text-[10px] text-amber-900 leading-tight">
              {tile.shortName}
            </span>
          </div>
        ) : tile.type === 'TAX' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center bg-rose-50/90 rounded">
            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 mb-0.5" />
            <span className="font-bold text-[8px] sm:text-[10px] text-rose-900 leading-tight">
              {tile.shortName}
            </span>
            <span className="font-mono-num text-[8px] sm:text-[9px] text-rose-700 font-semibold">
              {tile.taxPercent
                ? `${tile.taxPercent}%`
                : formatMoney(tile.taxAmount ?? 0)}
            </span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between pt-0.5 pb-1 min-h-0">
            <div className="flex items-start justify-between gap-0.5">
              <span className="font-bold text-[8px] sm:text-[10px] leading-[1.15] text-slate-900 line-clamp-2">
                {tile.shortName}
              </span>
              {tile.type === 'RESORT' && (
                <Palmtree className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-600 shrink-0" />
              )}
            </div>

            {/* 2.5D Isometric Building Visual */}
            {prop ? (
              <div className="flex-1 flex items-center justify-center my-0.5">
                <BuildingVisual
                  level={prop.level}
                  type={tile.type === 'RESORT' ? 'RESORT' : 'PROPERTY'}
                  accentColor={ownerColor?.hex}
                  size="tile"
                />
              </div>
            ) : tile.type === 'RESORT' ? (
              <div className="flex-1 flex items-center justify-center opacity-45">
                <Palmtree className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
              </div>
            ) : null}

            {/* Price or Current Rent */}
            <div className="relative z-10 flex items-center justify-between gap-1 mt-auto">
              {owner && currentRent !== null ? (
                <span
                  className={`font-mono-num text-[8px] sm:text-[9px] font-bold px-1 rounded text-white leading-tight flex items-center gap-0.5 ${
                    hasFestival ? 'ring-1 ring-amber-300 shadow-sm' : ''
                  }`}
                  style={{ backgroundColor: ownerColor?.hex }}
                >
                  {formatMoney(currentRent)}
                  {hasFestival && (
                    <span className="text-amber-200 font-extrabold">x2</span>
                  )}
                </span>
              ) : (
                <span className="font-mono-num text-[8px] sm:text-[9px] font-semibold text-slate-600 leading-tight">
                  {formatMoney(tile.price ?? 0)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Player Pawns on this tile */}
        {playersHere.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-0.5">
            <div className="flex flex-wrap items-center justify-center gap-0.5 max-w-full">
              {playersHere.map((p) => {
                const pColor = PLAYER_COLORS[p.color];
                const isMoving = movingPlayerId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`w-5 h-5 sm:w-7 sm:h-7 rounded-full overflow-hidden border-2 shadow-md transition-transform ${
                      pColor.border
                    } ${isMoving ? 'animate-token-hop scale-110 z-20' : 'z-10'}`}
                    style={{
                      boxShadow: `0 2px 8px rgba(0,0,0,0.45), 0 0 0 1px ${pColor.hex}`,
                    }}
                  >
                    <img
                      src={p.avatar}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </button>

      {/* Hover Info Popover */}
      <div
        role="tooltip"
        className={`pointer-events-none absolute z-40 w-56 rounded-xl bg-[#0B221E]/95 backdrop-blur-md border border-white/15 shadow-2xl overflow-hidden opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100 ${getPopoverPositionClass()}`}
      >
        {groupMeta && <div className={`h-2 w-full ${groupMeta.barBg}`} />}

        <div className="p-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-medium text-slate-400">
                {groupMeta ? groupMeta.name : 'Ô Đặc Biệt'}
              </div>
              <div className="font-display text-sm font-bold text-white leading-tight mt-0.5">
                {tile.name}
              </div>
              {tile.landmarkTag && (
                <div className="text-[11px] text-amber-300 mt-0.5">
                  {tile.landmarkTag}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {tile.price && (
                <span className="font-mono-num text-xs font-bold text-emerald-300">
                  {formatMoney(tile.price)}
                </span>
              )}
              {prop && (tile.type === 'PROPERTY' || tile.type === 'RESORT') && (
                <BuildingVisual
                  level={prop.level}
                  type={tile.type === 'RESORT' ? 'RESORT' : 'PROPERTY'}
                  accentColor={ownerColor?.hex}
                  size="md"
                />
              )}
            </div>
          </div>

          {tile.type === 'PROPERTY' && tile.rents && (
            <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1 text-[11px]">
              {[
                'Đất trống',
                '1 Nhà',
                '2 Nhà',
                '3 Nhà',
                'Khách Sạn 5★',
              ].map((label, idx) => {
                const isCurrent = prop?.level === idx;
                const tierRent =
                  idx === 0 && ownerHasMono
                    ? tile.rents![idx] * 2
                    : tile.rents![idx];
                return (
                  <div
                    key={label}
                    className={`flex justify-between px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>
                      {label}
                      {idx === 0 && ownerHasMono ? ' (x2)' : ''}
                    </span>
                    <span className="font-mono-num">
                      {formatMoney(tierRent)}
                    </span>
                  </div>
                );
              })}
              {tile.houseCost && (
                <div className="flex justify-between px-1.5 pt-1 border-t border-white/10 text-slate-400">
                  <span>Phí xây mỗi cấp</span>
                  <span className="font-mono-num text-slate-200">
                    {formatMoney(tile.houseCost)}
                  </span>
                </div>
              )}
            </div>
          )}

          {tile.type === 'RESORT' && (
            <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1 text-[11px]">
              {RESORT_RENTS.map((rent, idx) => {
                const isCurrent = Boolean(prop) && ownerResortCount === idx + 1;
                return (
                  <div
                    key={idx}
                    className={`flex justify-between px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    <span>Sở hữu {idx + 1} khu</span>
                    <span className="font-mono-num text-cyan-300 font-semibold">
                      {formatMoney(rent)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tile.type !== 'PROPERTY' && tile.type !== 'RESORT' && (
            <p className="mt-2 pt-2 border-t border-white/10 text-[11px] text-slate-300 leading-relaxed">
              {tile.type === 'START' &&
                'Nhận +2.000K mỗi khi đi qua hoặc dừng lại ô này.'}
              {tile.type === 'LOST_ISLAND' &&
                'Bị giữ tối đa 3 lượt. Tung ra Đôi, trả 500K hoặc dùng Thẻ để thoát.'}
              {tile.type === 'FESTIVAL' &&
                'Chọn 1 tỉnh bạn sở hữu để nhân đôi (x2) tiền thuê.'}
              {tile.type === 'WORLD_TOUR' &&
                'Lượt tiếp theo được bay thẳng đến bất kỳ ô nào trên bàn cờ.'}
              {tile.type === 'CHANCE' &&
                'Rút ngẫu nhiên 1 Thẻ Cơ Hội mang lại thưởng, phạt hoặc sự kiện bất ngờ.'}
              {tile.type === 'TAX' &&
                (tile.taxPercent
                  ? `Đóng thuế thu nhập bằng ${tile.taxPercent}% tiền mặt hiện có (tối thiểu 200K).`
                  : `Đóng thuế cố định ${formatMoney(tile.taxAmount ?? 0)}.`)}
            </p>
          )}

          {(tile.type === 'PROPERTY' || tile.type === 'RESORT') && (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chủ sở hữu</span>
                {owner ? (
                  <span className="font-semibold text-white flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ownerColor?.hex }}
                    />
                    {owner.name}
                  </span>
                ) : (
                  <span className="text-slate-400">Chưa có chủ</span>
                )}
              </div>

              {hasFestival && (
                <div className="flex items-center justify-between px-2 py-1 rounded-md bg-gradient-to-r from-violet-500/25 to-amber-500/25 border border-amber-400/50 text-amber-200 font-semibold">
                  <span className="flex items-center gap-1">
                    <PartyPopper className="w-3.5 h-3.5 text-amber-300" />
                    Đang tổ chức Lễ Hội
                  </span>
                  <span className="font-mono-num font-extrabold text-amber-300">
                    Thuê x2
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
