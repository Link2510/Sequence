import React, { useState } from 'react';
import {
  Bot,
  Check,
  Compass,
  Copy,
  Link2,
  LogOut,
  Play,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { CHARACTERS, PLAYER_COLORS, getCharacterById } from '../data/characters';
import { PlayerColorKey } from '../types/game';
import { RoomPublicView } from '../types/room';

interface OnlineRoomLobbyProps {
  room: RoomPublicView;
  wsError: string | null;
  onUpdateMySlot: (patch: {
    name?: string;
    characterId?: string;
    color?: PlayerColorKey;
  }) => void;
  onSetSlotKind: (slotIndex: number, kind: 'AI' | 'OPEN') => void;
  onFillAiSlots: () => void;
  onSetStartingCash: (cash: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const COLOR_ORDER: PlayerColorKey[] = ['blue', 'red', 'emerald', 'purple'];
const STARTING_CASH_OPTIONS = [10000, 15000, 20000];

export const OnlineRoomLobby: React.FC<OnlineRoomLobbyProps> = ({
  room,
  wsError,
  onUpdateMySlot,
  onSetSlotKind,
  onFillAiSlots,
  onSetStartingCash,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const mySlot =
    room.yourSlotIndex !== null ? room.slots[room.yourSlotIndex] : null;
  const myChar = mySlot ? getCharacterById(mySlot.characterId) : CHARACTERS[0];
  const activeCount = room.slots.filter((s) => s.kind !== 'OPEN').length;
  const openCount = room.slots.filter((s) => s.kind === 'OPEN').length;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const copyInviteLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#124239_0%,_#08221E_65%,_#051613_100%)] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#071D19]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-display text-lg font-bold text-white">
              Phòng Chờ Trực Tuyến
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-black/35 border border-white/15 rounded-xl px-3.5 py-2">
              <span className="text-xs text-slate-400">Mã phòng:</span>
              <span className="font-mono-num text-sm font-extrabold text-amber-400 tracking-wider">
                {room.code}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                title="Sao chép mã phòng"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={copyInviteLink}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Đã chép link mời
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-sky-400" />
                  Chép Link Mời Bạn
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-xs font-semibold text-rose-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Rời Phòng
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 4 Seats Management */}
        <section className="lg:col-span-7 bg-[#0E2B26]/90 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">
                Ghế Người Chơi ({activeCount}/4)
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Chia sẻ mã <strong className="text-amber-300">{room.code}</strong> để bạn bè tham gia hoặc thêm AI cho đủ 4 người
              </p>
            </div>

            {room.isHost && openCount > 0 && (
              <button
                type="button"
                onClick={onFillAiSlots}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Bot className="w-4 h-4" />
                Điền AI cho đủ 4 người
              </button>
            )}
          </div>

          {wsError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200">
              {wsError}
            </div>
          )}

          {/* Starting Cash Row */}
          <div className="py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Vốn khởi điểm mỗi người
            </span>
            <div className="flex items-center gap-1.5 p-1 bg-black/30 rounded-lg border border-white/10">
              {STARTING_CASH_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={!room.isHost}
                  onClick={() => onSetStartingCash(amt)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono-num font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    room.startingCash === amt
                      ? 'bg-emerald-500 text-slate-950'
                      : room.isHost
                      ? 'text-slate-300 hover:text-white cursor-pointer'
                      : 'text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {amt.toLocaleString('vi-VN')}K
                </button>
              ))}
            </div>
          </div>

          {/* 4 Slots List */}
          <div className="mt-5 space-y-3">
            {room.slots.map((slot) => {
              const char = getCharacterById(slot.characterId);
              const colorMeta = PLAYER_COLORS[slot.color];

              if (slot.kind === 'OPEN') {
                return (
                  <div
                    key={slot.slotIndex}
                    className="p-4 rounded-xl border border-dashed border-white/20 bg-black/15 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-200">
                          Ghế {slot.slotIndex + 1} · Đang chờ bạn bè
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Gửi mã phòng {room.code} hoặc link mời để bạn bè vào ghế này
                        </div>
                      </div>
                    </div>

                    {room.isHost && (
                      <button
                        type="button"
                        onClick={() => onSetSlotKind(slot.slotIndex, 'AI')}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Bot className="w-3.5 h-3.5 text-emerald-400" />
                        Đặt làm Máy AI
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={slot.slotIndex}
                  className={`p-3.5 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 ${
                    slot.isYou
                      ? 'bg-[#143D35] border-amber-400/70 shadow-md'
                      : 'bg-black/20 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 ${colorMeta.border}`}
                    >
                      <img
                        src={char.avatar}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      {slot.isYou ? (
                        <input
                          type="text"
                          value={slot.name}
                          maxLength={18}
                          onChange={(e) =>
                            onUpdateMySlot({ name: e.target.value })
                          }
                          className="bg-black/30 border border-white/15 focus:border-amber-400 rounded-md px-2.5 py-1 text-sm font-semibold text-white w-44 outline-none"
                          aria-label="Tên của bạn"
                        />
                      ) : (
                        <div className="text-sm font-bold text-white truncate">
                          {slot.name}
                        </div>
                      )}

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{char.name}</span>
                        <span aria-hidden="true">·</span>
                        {slot.kind === 'AI' ? (
                          <span className="text-emerald-300 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Máy AI
                          </span>
                        ) : (
                          <span className="text-sky-300 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {slot.isHost ? 'Chủ phòng' : 'Bạn bè'}
                            {slot.isYou ? ' (Bạn)' : ''}
                            {!slot.connected ? ' · Mất kết nối' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-3 shrink-0">
                    {slot.isYou && (
                      <div className="flex items-center gap-1.5">
                        {COLOR_ORDER.map((cKey) => (
                          <button
                            key={cKey}
                            type="button"
                            onClick={() => onUpdateMySlot({ color: cKey })}
                            title={PLAYER_COLORS[cKey].label}
                            className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                              PLAYER_COLORS[cKey].bg
                            } ${
                              slot.color === cKey
                                ? 'ring-2 ring-white scale-110'
                                : 'opacity-50 hover:opacity-90'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {room.isHost && slot.kind === 'AI' && (
                      <button
                        type="button"
                        onClick={() => onSetSlotKind(slot.slotIndex, 'OPEN')}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 cursor-pointer whitespace-nowrap"
                      >
                        Mở ghế cho bạn bè
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Cần tối thiểu 2 người chơi (Bạn bè hoặc AI) để bắt đầu ván đấu.
            </p>
            {room.isHost ? (
              <button
                type="button"
                disabled={activeCount < 2}
                onClick={onStartGame}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  activeCount >= 2
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-lg shadow-amber-500/25'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                Bắt Đầu Ván Đấu ({activeCount} người)
              </button>
            ) : (
              <div className="text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-400/30 px-4 py-2.5 rounded-xl">
                Đang chờ chủ phòng bắt đầu ván đấu...
              </div>
            )}
          </div>
        </section>

        {/* Right: Your Character Selection */}
        <aside className="lg:col-span-5 bg-[#0E2B26]/90 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-display text-lg font-bold text-white">
              Nhân Vật Của Bạn
            </h2>
            <span className="text-xs text-amber-400 font-medium">
              {myChar.badgeText}
            </span>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-black/25 border border-white/10 mb-5">
            <img
              src={myChar.avatar}
              alt={myChar.name}
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-xl object-cover border-2 border-amber-400/70 shrink-0"
            />
            <div>
              <div className="text-xs text-amber-400 font-semibold">
                {myChar.title}
              </div>
              <h3 className="font-display text-lg font-bold text-white mt-0.5">
                {myChar.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                {myChar.bio}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {CHARACTERS.map((char) => {
              const isSelected = mySlot?.characterId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => onUpdateMySlot({ characterId: char.id })}
                  className={`group text-left rounded-xl p-2 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 shadow-md'
                      : 'bg-black/20 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-slate-900">
                    <img
                      src={char.avatar}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="text-xs font-semibold text-white truncate">
                    {char.name
                      .replace('Doanh Nhân ', '')
                      .replace('Thuyền Trưởng ', 'TT ')
                      .replace('Nghệ Sĩ ', '')}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {char.badgeText}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
};
