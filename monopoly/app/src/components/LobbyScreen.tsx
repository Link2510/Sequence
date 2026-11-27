import React, { useState } from 'react';
import {
  Bot,
  Compass,
  Crown,
  DoorOpen,
  Globe,
  MapPin,
  Play,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { CHARACTERS, PLAYER_COLORS, getCharacterById } from '../data/characters';
import { PlayerColorKey, PlayerSlotConfig } from '../types/game';

interface LobbyScreenProps {
  initialRoomCode?: string;
  wsConnected: boolean;
  wsStatus: 'checking' | 'ready' | 'unavailable';
  wsError: string | null;
  onStartLocalGame: (slots: PlayerSlotConfig[], startingCash: number) => void;
  onCreateOnlineRoom: (
    playerName: string,
    characterId: string,
    color: PlayerColorKey
  ) => void;
  onJoinOnlineRoom: (code: string, playerName: string) => void;
}

type LobbyTab = 'LOCAL' | 'CREATE_ROOM' | 'JOIN_ROOM';

const DEFAULT_SLOTS: PlayerSlotConfig[] = [
  { id: 0, name: 'Bạn', isAI: false, characterId: 'minh', color: 'blue' },
  { id: 1, name: 'Cô Ba AI', isAI: true, characterId: 'coba', color: 'red' },
  { id: 2, name: 'Bác Ba AI', isAI: true, characterId: 'baphi', color: 'emerald' },
  { id: 3, name: 'Linh AI', isAI: true, characterId: 'linh', color: 'purple' },
];

const COLOR_ORDER: PlayerColorKey[] = ['blue', 'red', 'emerald', 'purple'];
const STARTING_CASH_OPTIONS = [10000, 15000, 20000];

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  initialRoomCode = '',
  wsConnected,
  wsStatus,
  wsError,
  onStartLocalGame,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
}) => {
  const [activeTab, setActiveTab] = useState<LobbyTab>(
    initialRoomCode ? 'JOIN_ROOM' : 'LOCAL'
  );

  // Local mode state
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [startingCash, setStartingCash] = useState<number>(15000);
  const [slots, setSlots] = useState<PlayerSlotConfig[]>(DEFAULT_SLOTS);
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number>(0);

  // Online create/join state
  const [onlineName, setOnlineName] = useState<string>('Tỷ Phú Việt');
  const [onlineCharId, setOnlineCharId] = useState<string>('minh');
  const [onlineColor, setOnlineColor] = useState<PlayerColorKey>('blue');
  const [joinCode, setJoinCode] = useState<string>(initialRoomCode);

  const activeSlots = slots.slice(0, playerCount);
  const focusedSlot = activeSlots[focusedSlotIndex] ?? activeSlots[0];
  const previewCharacter =
    activeTab === 'LOCAL'
      ? getCharacterById(focusedSlot.characterId)
      : getCharacterById(onlineCharId);

  const updateSlot = (index: number, patch: Partial<PlayerSlotConfig>) => {
    setSlots((prev) =>
      prev.map((slot, idx) => (idx === index ? { ...slot, ...patch } : slot))
    );
  };

  const handleSelectCharacter = (charId: string) => {
    if (activeTab !== 'LOCAL') {
      setOnlineCharId(charId);
      return;
    }
    const char = getCharacterById(charId);
    const currentSlot = slots[focusedSlotIndex];
    const shouldAutoName =
      currentSlot.isAI &&
      (currentSlot.name.endsWith('AI') ||
        CHARACTERS.some((c) => c.name === currentSlot.name));
    updateSlot(focusedSlotIndex, {
      characterId: charId,
      name: shouldAutoName
        ? `${char.name.split(' ').slice(-1)[0]} AI`
        : currentSlot.name,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#124239_0%,_#08221E_65%,_#051613_100%)] text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-[#071D19]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Tour Kinh Doanh Việt Nam
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <span className="whitespace-nowrap shrink-0">32 Ô Bản Đồ Việt Nam</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="whitespace-nowrap shrink-0">Chơi Với AI hoặc Bạn Bè</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="whitespace-nowrap shrink-0">Tối Đa 4 Người Chơi</span>
          </div>

          <button
            onClick={() => onStartLocalGame(activeSlots, startingCash)}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            Chơi Nhanh AI
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Mode Tabs & Match Setup */}
        <section className="lg:col-span-7 bg-[#0E2B26]/90 border border-white/10 rounded-2xl p-6 shadow-xl">
          {/* Play Mode Segmented Control */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-black/35 rounded-xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('LOCAL')}
              className={`px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'LOCAL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4" />
              Chơi Với AI / Tại Chỗ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CREATE_ROOM')}
              className={`px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'CREATE_ROOM'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-4 h-4" />
              Tạo Phòng (Bạn + AI)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('JOIN_ROOM')}
              className={`px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'JOIN_ROOM'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <DoorOpen className="w-4 h-4" />
              Vào Phòng Bằng Mã
            </button>
          </div>

          {wsError && activeTab !== 'LOCAL' && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200">
              {wsError}
            </div>
          )}

          {activeTab === 'LOCAL' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div>
                  <h1 className="font-display text-2xl font-bold text-white">
                    Chơi Với AI hoặc Chung Máy
                  </h1>
                  <p className="text-sm text-slate-300 mt-1">
                    Tùy chỉnh 2–4 người chơi (có thể pha trộn giữa Người và Máy AI)
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-black/30 rounded-lg border border-white/10">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        setPlayerCount(count);
                        if (focusedSlotIndex >= count) setFocusedSlotIndex(0);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        playerCount === count
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {count} Người
                    </button>
                  ))}
                </div>
              </div>

              <div className="py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Vốn khởi điểm mỗi người
                </span>
                <div className="flex items-center gap-1.5 p-1 bg-black/30 rounded-lg border border-white/10">
                  {STARTING_CASH_OPTIONS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setStartingCash(amt)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono-num font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        startingCash === amt
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {amt.toLocaleString('vi-VN')}K
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {activeSlots.map((slot, idx) => {
                  const char = getCharacterById(slot.characterId);
                  const colorMeta = PLAYER_COLORS[slot.color];
                  const isFocused = focusedSlotIndex === idx;

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setFocusedSlotIndex(idx)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 ${
                        isFocused
                          ? 'bg-[#143D35] border-amber-400/70 shadow-md'
                          : 'bg-black/20 border-white/10 hover:border-white/25'
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
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={slot.name}
                              maxLength={18}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateSlot(idx, { name: e.target.value })
                              }
                              className="bg-black/30 border border-white/10 focus:border-amber-400 rounded-md px-2.5 py-1 text-sm font-semibold text-white w-40 outline-none"
                              aria-label={`Tên người chơi ${idx + 1}`}
                            />
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">
                              {char.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span>Người chơi {idx + 1}</span>
                            <span aria-hidden="true">·</span>
                            <span>Màu {colorMeta.label}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-3 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          {COLOR_ORDER.map((cKey) => (
                            <button
                              key={cKey}
                              type="button"
                              onClick={() => updateSlot(idx, { color: cKey })}
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

                        <button
                          type="button"
                          onClick={() => updateSlot(idx, { isAI: !slot.isAI })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                            slot.isAI
                              ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                              : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30'
                          }`}
                        >
                          {slot.isAI ? (
                            <>
                              <Bot className="w-3.5 h-3.5" />
                              Máy AI
                            </>
                          ) : (
                            <>
                              <User className="w-3.5 h-3.5" />
                              Người
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-slate-400">
                  Mẹo: Nhấn vào từng dòng người chơi rồi chọn nhân vật ở khung bên phải.
                </p>
                <button
                  onClick={() => onStartLocalGame(activeSlots, startingCash)}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-amber-500/25"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Bắt Đầu Ván Đấu
                </button>
              </div>
            </>
          )}

          {activeTab === 'CREATE_ROOM' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  Tạo Phòng Chơi Online
                </h1>
                <p className="text-sm text-slate-300 mt-1">
                  Tạo phòng riêng để mời bạn bè vào qua mã phòng hoặc link mời, đồng thời có thể ghép thêm Máy AI cho đủ 4 người chơi.
                </p>
              </div>

              <div className="space-y-4 p-5 rounded-xl bg-black/25 border border-white/10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Tên hiển thị của bạn (Chủ phòng)
                  </label>
                  <input
                    type="text"
                    value={onlineName}
                    maxLength={18}
                    onChange={(e) => setOnlineName(e.target.value)}
                    placeholder="Nhập tên của bạn..."
                    className="w-full bg-black/35 border border-white/15 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Màu quân cờ của bạn
                  </label>
                  <div className="flex items-center gap-3">
                    {COLOR_ORDER.map((cKey) => (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setOnlineColor(cKey)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                          onlineColor === cKey
                            ? 'bg-white/15 border-white text-white'
                            : 'bg-black/25 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full ${PLAYER_COLORS[cKey].bg}`}
                        />
                        {PLAYER_COLORS[cKey].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <span
                  className={`text-xs max-w-md ${
                    wsStatus === 'unavailable'
                      ? 'text-amber-300/90'
                      : 'text-slate-400'
                  }`}
                >
                  {wsConnected
                    ? 'Máy chủ trực tuyến đã sẵn sàng'
                    : wsStatus === 'unavailable'
                      ? 'Chế độ web tĩnh (Firebase Hosting): Hãy dùng tab "Chơi Với AI / Tại Chỗ", hoặc cấu hình VITE_WS_URL nếu bạn host riêng server phòng chơi.'
                      : 'Đang kết nối máy chủ phòng...'}
                </span>
                <button
                  type="button"
                  disabled={!wsConnected}
                  onClick={() =>
                    onCreateOnlineRoom(
                      onlineName.trim() || 'Chủ Phòng',
                      onlineCharId,
                      onlineColor
                    )
                  }
                  className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                    wsConnected
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Tạo Phòng Ngay
                </button>
              </div>
            </div>
          )}

          {activeTab === 'JOIN_ROOM' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  Tham Gia Phòng Bạn Bè
                </h1>
                <p className="text-sm text-slate-300 mt-1">
                  Nhập mã phòng 6 ký tự từ bạn bè để vào bàn đấu ngay lập tức.
                </p>
              </div>

              <div className="space-y-4 p-5 rounded-xl bg-black/25 border border-white/10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Mã phòng (ví dụ: VN8429)
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    maxLength={8}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="NHẬP MÃ PHÒNG..."
                    className="w-full bg-black/35 border border-white/15 focus:border-sky-400 rounded-xl px-4 py-3 text-lg font-mono-num font-bold tracking-widest text-amber-400 uppercase outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Tên của bạn
                  </label>
                  <input
                    type="text"
                    value={onlineName}
                    maxLength={18}
                    onChange={(e) => setOnlineName(e.target.value)}
                    placeholder="Nhập tên của bạn..."
                    className="w-full bg-black/35 border border-white/15 focus:border-sky-400 rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <span
                  className={`text-xs max-w-md ${
                    wsStatus === 'unavailable'
                      ? 'text-amber-300/90'
                      : 'text-slate-400'
                  }`}
                >
                  {wsConnected
                    ? 'Máy chủ trực tuyến đã sẵn sàng'
                    : wsStatus === 'unavailable'
                      ? 'Chế độ web tĩnh (Firebase Hosting): Hãy dùng tab "Chơi Với AI / Tại Chỗ", hoặc cấu hình VITE_WS_URL nếu bạn host riêng server phòng chơi.'
                      : 'Đang kết nối máy chủ phòng...'}
                </span>
                <button
                  type="button"
                  disabled={!wsConnected || joinCode.trim().length < 4}
                  onClick={() =>
                    onJoinOnlineRoom(
                      joinCode.trim().toUpperCase(),
                      onlineName.trim() || 'Bạn Mới'
                    )
                  }
                  className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap ${
                    wsConnected && joinCode.trim().length >= 4
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer shadow-lg shadow-sky-500/20'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <DoorOpen className="w-4 h-4" />
                  Vào Phòng
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right: Character Gallery & Win Rules */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-[#0E2B26]/90 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-display text-lg font-bold text-white">
                {activeTab === 'LOCAL'
                  ? `Chọn Nhân Vật cho ${
                      focusedSlot.name || `Người chơi ${focusedSlotIndex + 1}`
                    }`
                  : 'Chọn Nhân Vật Đại Diện'}
              </h2>
              <span className="text-xs text-amber-400 font-medium">
                {previewCharacter.badgeText}
              </span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-black/25 border border-white/10 mb-5">
              <img
                src={previewCharacter.avatar}
                alt={previewCharacter.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-xl object-cover border-2 border-amber-400/70 shrink-0"
              />
              <div>
                <div className="text-xs text-amber-400 font-semibold">
                  {previewCharacter.title}
                </div>
                <h3 className="font-display text-lg font-bold text-white mt-0.5">
                  {previewCharacter.name}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                  {previewCharacter.bio}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {CHARACTERS.map((char) => {
                const isSelected =
                  activeTab === 'LOCAL'
                    ? focusedSlot.characterId === char.id
                    : onlineCharId === char.id;
                const usedByOther =
                  activeTab === 'LOCAL' &&
                  activeSlots.some(
                    (s, i) => i !== focusedSlotIndex && s.characterId === char.id
                  );

                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleSelectCharacter(char.id)}
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
                      {usedByOther ? 'Đã có người chọn' : char.badgeText}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#0E2B26]/90 border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              Luật Thắng Kiểu Business Tour
            </h2>
            <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <Crown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Độc quyền 3 nhóm màu:</strong> Sở hữu trọn 3 cụm tỉnh cùng màu để thắng ngay lập tức.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Thống lĩnh 1 tuyến đường:</strong> Mua toàn bộ các tỉnh và khu nghỉ dưỡng trên 1 cạnh bàn cờ.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">4 Khu Nghỉ Dưỡng:</strong> Thâu tóm cả Ga Thống Nhất, Vịnh Hạ Long, Phú Quốc & Côn Đảo.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Trophy className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Hover để xem chi tiết:</strong> Di chuột vào bất kỳ ô tỉnh thành nào để xem giá, tiền thuê và chủ sở hữu.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
};
