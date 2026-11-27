import React from 'react';
import { Anchor, Bot, PartyPopper, Plane, ShieldAlert, User } from 'lucide-react';
import { BOARD_TILES, COLOR_GROUP_META, MONOPOLY_GROUPS } from '../data/boardData';
import { PLAYER_COLORS } from '../data/characters';
import { Player, PropertyState } from '../types/game';
import {
  calculateNetWorth,
  formatMoney,
  getPlayerMonopolies,
  getPlayerOwnedTiles,
  getPlayerResortCount,
} from '../utils/gameLogic';

interface PlayerPanelProps {
  player: Player;
  isActive: boolean;
  ownership: Record<number, PropertyState>;
  cashDelta?: { seq: number; amount: number } | null;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isActive,
  ownership,
  cashDelta,
}) => {
  const colorMeta = PLAYER_COLORS[player.color];
  const netWorth = calculateNetWorth(player, ownership);
  const ownedTiles = getPlayerOwnedTiles(player.id, ownership);
  const monopolies = getPlayerMonopolies(player.id, ownership);
  const resortCount = getPlayerResortCount(player.id, ownership);
  const festivalTiles = BOARD_TILES.filter(
    (t) => ownership[t.id]?.ownerId === player.id && ownership[t.id]?.hasFestival
  );

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all ${
        player.bankrupt
          ? 'bg-black/25 border-white/5 opacity-50 grayscale'
          : isActive
          ? `bg-[#143B34] ${colorMeta.border} shadow-lg`
          : 'bg-[#0C2621]/90 border-white/10'
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center gap-3">
        <div
          className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 ${colorMeta.border}`}
        >
          <img
            src={player.avatar}
            alt={player.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm text-white truncate">
              {player.name}
            </h3>
            {isActive && !player.bankrupt && (
              <span className="text-[11px] font-semibold text-amber-400 whitespace-nowrap shrink-0">
                Đang đi
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            {player.isAI ? (
              <Bot className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{player.isAI ? 'Máy AI' : 'Người chơi'}</span>
            {player.bankrupt && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-rose-400 font-semibold">Phá sản</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Financials */}
      {!player.bankrupt && (
        <>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
            <div className="relative">
              <div className="text-[11px] text-slate-400">Tiền mặt</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="font-mono-num text-sm font-bold text-emerald-300">
                  {formatMoney(player.cash)}
                </div>
                {cashDelta && cashDelta.amount !== 0 && (
                  <span
                    key={cashDelta.seq}
                    className={`animate-cash-float-up font-mono-num text-[11px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      cashDelta.amount > 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/25 text-rose-300'
                    }`}
                  >
                    {cashDelta.amount > 0 ? '+' : '-'}
                    {formatMoney(Math.abs(cashDelta.amount))}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Tổng tài sản</div>
              <div className="font-mono-num text-sm font-bold text-white mt-0.5">
                {formatMoney(netWorth)}
              </div>
            </div>
          </div>

          {/* Win Progress */}
          <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span>
              Độc quyền:{' '}
              <strong className="font-mono-num text-amber-300">
                {monopolies.length}/3
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Nghỉ dưỡng:{' '}
              <strong className="font-mono-num text-cyan-300">
                {resortCount}/4
              </strong>
            </span>
          </div>

          {/* Owned Color Swatches */}
          <div className="mt-2.5 flex items-center flex-wrap gap-1">
            {MONOPOLY_GROUPS.map((group) => {
              const meta = COLOR_GROUP_META[group];
              const ownedInGroup = meta.tileIds.filter(
                (id) => ownership[id]?.ownerId === player.id
              ).length;
              const isMono = ownedInGroup === meta.tileIds.length;

              return (
                <div
                  key={group}
                  title={`${meta.name}: ${ownedInGroup}/${meta.tileIds.length}`}
                  className={`h-2 rounded-sm transition-all ${
                    isMono
                      ? `${meta.barBg} w-5 ring-1 ring-white/80`
                      : ownedInGroup > 0
                      ? `${meta.barBg} w-3 opacity-85`
                      : 'bg-white/10 w-2.5'
                  }`}
                />
              );
            })}
            <span className="ml-auto text-[11px] font-mono-num text-slate-400">
              {ownedTiles.length} đất
            </span>
          </div>

          {/* Special Status Line */}
          {(player.inJail ||
            player.escapeCards > 0 ||
            player.worldTourReady ||
            festivalTiles.length > 0) && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-2 text-[11px]">
              {festivalTiles.map((ft) => (
                <span
                  key={ft.id}
                  className="text-amber-300 font-semibold flex items-center gap-1"
                >
                  <PartyPopper className="w-3 h-3 text-violet-300" />
                  Lễ hội: {ft.shortName} (x2)
                </span>
              ))}
              {player.inJail && (
                <span className="text-amber-300 flex items-center gap-1">
                  <Anchor className="w-3 h-3" />
                  Đảo Hoang ({player.jailTurns}/3)
                </span>
              )}
              {player.worldTourReady && (
                <span className="text-sky-300 flex items-center gap-1">
                  <Plane className="w-3 h-3" />
                  Sẵn sàng bay
                </span>
              )}
              {player.escapeCards > 0 && (
                <span className="text-emerald-300 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Thẻ thoát đảo ({player.escapeCards})
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
