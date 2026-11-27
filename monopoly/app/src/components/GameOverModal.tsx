import React from 'react';
import { Crown, RotateCcw, Trophy } from 'lucide-react';
import { PLAYER_COLORS } from '../data/characters';
import { Player, PropertyState, VictorySummary } from '../types/game';
import { calculateNetWorth, formatMoney } from '../utils/gameLogic';

interface GameOverModalProps {
  summary: VictorySummary;
  players: Player[];
  ownership: Record<number, PropertyState>;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  players,
  ownership,
  onPlayAgain,
  onBackToLobby,
}) => {
  const winner = players.find((p) => p.id === summary.winnerId) ?? players[0];
  const winnerColor = PLAYER_COLORS[winner.color];

  const ranked = [...players].sort((a, b) => {
    if (a.id === winner.id) return -1;
    if (b.id === winner.id) return 1;
    if (a.bankrupt && !b.bankrupt) return 1;
    if (!a.bankrupt && b.bankrupt) return -1;
    return calculateNetWorth(b, ownership) - calculateNetWorth(a, ownership);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0E2C27] border border-amber-400/50 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="text-xs font-bold text-amber-400">{summary.label}</div>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
          {winner.name} Chiến Thắng!
        </h2>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          {summary.description}
        </p>

        {/* Winner Portrait */}
        <div className="mt-5 flex items-center justify-center">
          <div
            className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 ${winnerColor.border} shadow-xl`}
          >
            <img
              src={winner.avatar}
              alt={winner.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Standings Table */}
        <div className="mt-6 bg-black/30 border border-white/10 rounded-xl divide-y divide-white/10 text-left">
          {ranked.map((p, idx) => {
            const netWorth = calculateNetWorth(p, ownership);
            const pColor = PLAYER_COLORS[p.color];
            return (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono-num text-xs font-bold text-slate-400 w-4">
                    #{idx + 1}
                  </span>
                  <img
                    src={p.avatar}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className={`w-8 h-8 rounded-lg object-cover border ${pColor.border}`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                      {p.name}
                      {p.id === winner.id && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {p.bankrupt ? 'Đã phá sản' : `Tiền mặt: ${formatMoney(p.cash)}`}
                    </div>
                  </div>
                </div>
                <div className="font-mono-num text-sm font-bold text-emerald-300">
                  {p.bankrupt ? '0K' : formatMoney(netWorth)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onBackToLobby}
            className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm cursor-pointer whitespace-nowrap"
          >
            Đổi Nhân Vật
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            Chơi Lại
          </button>
        </div>
      </div>
    </div>
  );
};
