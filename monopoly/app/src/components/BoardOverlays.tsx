import React from 'react';
import {
  ArrowRight,
  Coins,
  HelpCircle,
  Landmark,
  Sparkles,
  X,
} from 'lucide-react';
import { PLAYER_COLORS } from '../data/characters';
import {
  ChanceNoticeEvent,
  MoneyTransferEvent,
  Player,
} from '../types/game';
import { formatMoney } from '../utils/gameLogic';

interface ParticipantBadgeProps {
  partyId: number | 'BANK';
  players: Player[];
  role: 'sender' | 'receiver';
}

const ParticipantBadge: React.FC<ParticipantBadgeProps> = ({
  partyId,
  players,
  role,
}) => {
  if (partyId === 'BANK') {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border ${
            role === 'sender'
              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
          }`}
        >
          <Landmark className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 leading-none">
            {role === 'sender' ? 'Từ' : 'Đến'}
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-amber-200 truncate">
            Ngân Hàng
          </div>
        </div>
      </div>
    );
  }

  const player = players.find((p) => p.id === partyId);
  if (!player) return null;
  const colorMeta = PLAYER_COLORS[player.color];

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <img
        src={player.avatar}
        alt={player.name}
        referrerPolicy="no-referrer"
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border-2 ${colorMeta.border} shrink-0`}
      />
      <div className="min-w-0">
        <div className="text-[10px] text-slate-400 leading-none">
          {role === 'sender' ? 'Trừ tiền' : 'Nhận tiền'}
        </div>
        <div className="text-[11px] sm:text-xs font-bold text-white truncate max-w-[78px] sm:max-w-[96px]">
          {player.name}
        </div>
      </div>
    </div>
  );
};

interface MoneyTransferOverlayProps {
  transfers: MoneyTransferEvent[];
  players: Player[];
}

export const MoneyTransferOverlay: React.FC<MoneyTransferOverlayProps> = ({
  transfers,
  players,
}) => {
  if (transfers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute top-14 sm:top-16 inset-x-2.5 sm:inset-x-4 z-20 flex flex-col items-center gap-1.5">
      {transfers.slice(-2).map((t) => {
        const isBankIn = t.fromId === 'BANK';
        const isPlayerToPlayer = t.fromId !== 'BANK' && t.toId !== 'BANK';
        const accentBorder = isPlayerToPlayer
          ? 'border-amber-400/60 shadow-amber-500/20'
          : isBankIn
          ? 'border-emerald-400/60 shadow-emerald-500/20'
          : 'border-rose-400/60 shadow-rose-500/20';

        const amountTone = isBankIn
          ? 'text-emerald-300'
          : isPlayerToPlayer
          ? 'text-amber-300'
          : 'text-rose-300';

        return (
          <div
            key={t.id}
            className={`animate-notice-pop w-full max-w-md rounded-xl bg-[#071D19]/92 backdrop-blur-md border ${accentBorder} shadow-xl px-2.5 py-2 sm:px-3.5 sm:py-2.5`}
          >
            <div className="flex items-center justify-between gap-2">
              <ParticipantBadge
                partyId={t.fromId}
                players={players}
                role="sender"
              />

              {/* Animated Coin Flow Center */}
              <div className="flex flex-col items-center justify-center shrink-0 px-1.5">
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center animate-money-coin-travel text-amber-400">
                    <Coins className="w-3.5 h-3.5" />
                  </span>
                  <span
                    className={`font-mono-num text-xs sm:text-sm font-extrabold ${amountTone}`}
                  >
                    {formatMoney(t.amount)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <div className="text-[10px] text-slate-300 truncate max-w-[130px] sm:max-w-[165px]">
                  {t.reason}
                </div>
              </div>

              <ParticipantBadge
                partyId={t.toId}
                players={players}
                role="receiver"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ChanceNoticeBannerProps {
  notice: ChanceNoticeEvent | null | undefined;
  players: Player[];
  onDismiss?: () => void;
}

export const ChanceNoticeBanner: React.FC<ChanceNoticeBannerProps> = ({
  notice,
  players,
  onDismiss,
}) => {
  if (!notice) return null;

  const actor = players.find((p) => p.id === notice.playerId);
  const actorColor = actor ? PLAYER_COLORS[actor.color] : null;
  const { card } = notice;

  const effectBadge = (() => {
    switch (card.kind) {
      case 'GAIN':
        return `+${formatMoney(card.amount ?? 1000)}`;
      case 'PAY':
        return `-${formatMoney(card.amount ?? 500)}`;
      case 'ESCAPE_CARD':
        return '+1 Thẻ Thoát Đảo';
      case 'GO_JAIL':
        return 'Ra Đảo Hoang';
      case 'REPAIR':
        return `-${formatMoney(card.amount ?? 200)}/công trình`;
      case 'STORM':
        return 'Hạ 1 nhà đối thủ';
      case 'MOVE_TO':
        return 'Di chuyển đặc biệt';
    }
  })();

  const badgeTone =
    card.kind === 'GAIN' || card.kind === 'ESCAPE_CARD' || card.kind === 'MOVE_TO'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
      : card.kind === 'STORM'
      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
      : 'bg-rose-500/20 text-rose-300 border-rose-400/40';

  return (
    <div
      key={notice.id}
      className="animate-notice-pop pointer-events-auto absolute inset-x-3 sm:inset-x-6 bottom-24 sm:bottom-28 z-30 flex justify-center"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#102F2A]/95 backdrop-blur-md border-2 border-amber-400/75 shadow-2xl p-3 sm:p-3.5 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {actor ? (
              <img
                src={actor.avatar}
                alt={actor.name}
                referrerPolicy="no-referrer"
                className={`w-8 h-8 rounded-lg object-cover border-2 ${
                  actorColor?.border ?? 'border-amber-400'
                } shrink-0`}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Bảng Thông Báo Cơ Hội</span>
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {actor ? `${actor.name} rút được:` : 'Sự kiện Cơ Hội'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`font-mono-num text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border ${badgeTone}`}
            >
              {effectBadge}
            </span>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Đóng thông báo cơ hội"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="font-display text-sm font-bold text-amber-200">
            {card.title}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-200 mt-0.5 leading-snug">
            {card.description}
          </p>
        </div>
      </div>
    </div>
  );
};
