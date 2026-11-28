import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Play,
  Plus,
  Users,
} from 'lucide-react';
import { CHAPTERS, getChapterById } from '../game/chapters';
import { dealChapter } from '../game/engine';
import { GameState, RoomState } from '../game/types';
import {
  buildInviteUrl,
  createRoom,
  fetchRoom,
  getLocalPlayerIdentity,
  joinRoomSeat,
  resolveTransportMode,
  saveLocalPlayerName,
  subscribeToRoom,
  TransportMode,
  updateRoom,
} from '../services/roomService';
import { GameTable } from './GameTable';

interface MultiplayerViewProps {
  initialRoomCode?: string | null;
  onExitToHome: () => void;
}

const BOT_NAMES = ['Gandalf (AI)', 'Samwise (AI)', 'Merry (AI)', 'Pippin (AI)'];

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({
  initialRoomCode,
  onExitToHome,
}) => {
  const [identity, setIdentity] = useState(() => getLocalPlayerIdentity());
  const [nameInput, setNameInput] = useState(identity.playerName);
  const [joinCodeInput, setJoinCodeInput] = useState(initialRoomCode || '');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('server');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    resolveTransportMode().then(setTransportMode);
  }, []);

  // Auto-join if URL has ?room=...
  useEffect(() => {
    if (!initialRoomCode) return;
    const code = initialRoomCode.trim().toUpperCase();
    setLoading(true);
    setErrorMsg(null);
    joinRoomSeat(code, identity.playerId, identity.playerName)
      .then((joined) => {
        if (!joined) {
          setErrorMsg(`Không tìm thấy phòng ${code}. Hãy kiểm tra lại mã hoặc bảo chủ phòng tạo lại.`);
        } else {
          setRoom(joined);
        }
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Không thể tham gia phòng.');
      })
      .finally(() => setLoading(false));
  }, [initialRoomCode, identity.playerId, identity.playerName]);

  // Subscribe to live room updates
  useEffect(() => {
    if (!room?.code) return;
    const unsub = subscribeToRoom(
      room.code,
      (updated) => {
        setRoom(updated);
      },
      (err) => {
        setErrorMsg(`Lỗi đồng bộ phòng: ${err}`);
      }
    );
    return unsub;
  }, [room?.code]);

  const handleSaveName = () => {
    const clean = nameInput.trim() || 'Người Chơi';
    saveLocalPlayerName(clean);
    setIdentity((prev) => ({ ...prev, playerName: clean }));
  };

  const handleCreateRoom = async () => {
    handleSaveName();
    const playerName = nameInput.trim() || identity.playerName;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await createRoom(identity.playerId, playerName, selectedChapter);
      setRoom(res.room);
      setTransportMode(res.mode);
      const url = new URL(window.location.href);
      url.searchParams.set('room', res.room.code);
      window.history.replaceState({}, '', url.toString());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tạo phòng.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    handleSaveName();
    const playerName = nameInput.trim() || identity.playerName;
    setLoading(true);
    setErrorMsg(null);
    try {
      const fetched = await fetchRoom(code);
      if (!fetched.room) {
        setErrorMsg(`Không tìm thấy phòng có mã ${code}.`);
        setLoading(false);
        return;
      }
      const joined = await joinRoomSeat(code, identity.playerId, playerName);
      if (joined) {
        setRoom(joined);
        setTransportMode(fetched.mode);
        const url = new URL(window.location.href);
        url.searchParams.set('room', joined.code);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi vào phòng.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!room) return;
    const link = buildInviteUrl(room.code);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setErrorMsg(`Hãy sao chép thủ công link này: ${link}`);
    }
  };

  const handleStartRoomGame = async (chapterIdOverride?: number) => {
    if (!room) return;
    const chapId = chapterIdOverride ?? room.chapterId;
    const specs = room.seats.map((seat, idx) => ({
      name: seat.playerId ? seat.playerName : BOT_NAMES[idx],
      isBot: !seat.playerId,
      playerId: seat.playerId || undefined,
    }));
    const freshGame = dealChapter(chapId, specs);
    const nextRoom: RoomState = {
      ...room,
      chapterId: chapId,
      status: 'IN_GAME',
      gameState: freshGame,
    };
    setRoom(nextRoom);
    await updateRoom(nextRoom);
  };

  const handleUpdateGameState = async (nextGame: GameState) => {
    if (!room) return;
    const nextRoom: RoomState = {
      ...room,
      gameState: nextGame,
    };
    setRoom(nextRoom);
    await updateRoom(nextRoom);
  };

  const handleLeaveRoom = () => {
    setRoom(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
    onExitToHome();
  };

  // Active Game inside Room
  if (room && room.status === 'IN_GAME' && room.gameState) {
    const isHost = room.hostId === identity.playerId;
    const foundIdx = room.seats.findIndex((s) => s.playerId === identity.playerId);
    const mySeatIndex = foundIdx >= 0 ? foundIdx : 0;

    return (
      <GameTable
        gameState={room.gameState}
        mySeatIndex={mySeatIndex}
        isHost={isHost}
        isMultiplayer={true}
        onUpdateGameState={handleUpdateGameState}
        onRestartChapter={() => handleStartRoomGame(room.chapterId)}
        onNextChapter={() =>
          handleStartRoomGame(Math.min(CHAPTERS.length, room.chapterId + 1))
        }
        onLeaveTable={handleLeaveRoom}
      />
    );
  }

  const transportLabel =
    transportMode === 'firebase'
      ? 'Firebase Spark (Firestore Trực Tuyến)'
      : transportMode === 'server'
      ? 'Máy Chủ Phòng Trực Tiếp (SSE)'
      : 'Trình Duyệt Cục Bộ (Chưa cấu hình Firestore)';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#D6B46A] mb-1.5">
            Chơi Cùng Bạn Bè · {transportLabel}
          </div>
          <h1 className="text-3xl font-bold text-[#F5EEDB] text-balance">
            {room ? `Phòng Chơi ${room.code}` : 'Tạo Hoặc Vào Phòng Bằng Link Mời'}
          </h1>
          <p className="mt-1.5 text-sm text-[#C8C0AB]">
            Mỗi bàn gồm 4 vị trí. Nếu nhóm có 2 hoặc 3 người, hệ thống tự động điền AI đồng đội vào ghế trống!
          </p>
        </div>

      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-500/45 bg-rose-950/40 text-sm text-rose-100">
          {errorMsg}
        </div>
      )}

      {/* Player Identity Name Bar */}
      <div className="bg-[#122017] border border-[#C6932B]/25 rounded-2xl p-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="player-name" className="block text-xs font-medium text-[#D6B46A] mb-1.5">
            Tên hiển thị của bạn trên bàn chơi
          </label>
          <input
            id="player-name"
            type="text"
            maxLength={24}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleSaveName}
            placeholder="Nhập tên của bạn..."
            className="w-full max-w-sm rounded-xl bg-[#0D1610] border border-[#C6932B]/30 px-4 py-2.5 text-sm text-[#F5EEDB] focus:outline-none focus:border-[#E5B85C]"
          />
        </div>
        <div className="text-xs text-[#A8A08C]">
          Mã định danh phiên: <span className="font-mono text-[#E5DEC9]">{identity.playerId}</span>
        </div>
      </div>

      {!room ? (
        /* Create OR Join Room Split */
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#122017] border border-[#C6932B]/35 rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[#F5EEDB]">Tạo Phòng Mới</h2>
              <p className="mt-1 text-xs sm:text-sm text-[#C8C0AB]">
                Chọn chương chơi và nhận ngay đường dẫn mời bạn bè vào bàn.
              </p>
            </div>

            <div>
              <label htmlFor="chapter-select" className="block text-xs font-medium text-[#D6B46A] mb-1.5">
                Chọn Chương Khởi Đầu
              </label>
              <select
                id="chapter-select"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0D1610] border border-[#C6932B]/30 px-4 py-2.5 text-sm text-[#F5EEDB] focus:outline-none focus:border-[#E5B85C]"
              >
                {CHAPTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.difficulty})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleCreateRoom}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C6932B] hover:bg-[#D7A43A] disabled:opacity-50 text-[#111810] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Đang khởi tạo...' : 'Tạo Phòng & Lấy Link Mời'}
            </button>
          </div>

          <form
            onSubmit={handleJoinRoom}
            className="bg-[#122017] border border-[#C6932B]/35 rounded-2xl p-6 space-y-5 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-[#F5EEDB]">Tham Gia Bằng Mã Phòng</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#C8C0AB]">
                  Nhập mã phòng bạn bè gửi (ví dụ: RING-8K2P9) hoặc mở trực tiếp link chia sẻ.
                </p>
              </div>

              <div>
                <label htmlFor="room-code-input" className="block text-xs font-medium text-[#D6B46A] mb-1.5">
                  Mã Phòng
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: RING-4H7K2"
                  className="w-full rounded-xl bg-[#0D1610] border border-[#C6932B]/30 px-4 py-2.5 font-mono text-sm uppercase tracking-wider text-[#F5EEDB] focus:outline-none focus:border-[#E5B85C]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !joinCodeInput.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1A2D20] hover:bg-[#233B2A] disabled:opacity-45 border border-[#C6932B]/40 text-[#F5EEDB] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Users className="w-4 h-4 text-[#E5B85C]" />
              Vào Phòng Chơi
            </button>
          </form>
        </div>
      ) : (
        /* Room Lobby */
        <div className="bg-[#122017] border border-[#C6932B]/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Quick Share Invite Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#C6932B]/20">
            <div className="space-y-1">
              <div className="text-xs font-medium text-[#D6B46A]">
                Link Chia Sẻ Nhanh Cho Bạn Bè
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-[#E5DEC9] break-all">
                <Link2 className="w-4 h-4 text-[#E5B85C] shrink-0" />
                <span>{buildInviteUrl(room.code)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'Đã Sao Chép Link!' : 'Sao Chép Link Mời'}
            </button>
          </div>

          {/* Chapter Info & Host Picker */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#A8A08C]">Chương đang chọn</div>
              <div className="text-lg font-display font-bold text-[#F5EEDB]">
                {getChapterById(room.chapterId).title}
              </div>
            </div>

            {room.hostId === identity.playerId && (
              <select
                value={room.chapterId}
                onChange={async (e) => {
                  const next = { ...room, chapterId: Number(e.target.value) };
                  setRoom(next);
                  await updateRoom(next);
                }}
                className="rounded-xl bg-[#0D1610] border border-[#C6932B]/30 px-3.5 py-2 text-xs sm:text-sm text-[#F5EEDB]"
              >
                {CHAPTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4 Seats Status */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {room.seats.map((seat) => {
              const isOccupied = seat.playerId !== null;
              const isMe = seat.playerId === identity.playerId;
              const isRoomHost = seat.playerId === room.hostId;
              return (
                <div
                  key={seat.seatIndex}
                  className={`rounded-xl border p-4 space-y-2 ${
                    isOccupied
                      ? 'bg-[#182B1E] border-[#C6932B]/50'
                      : 'bg-[#0E1811] border-[#C6932B]/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[#D6B46A]">
                    <span>Ghế #{seat.seatIndex + 1}</span>
                    {isRoomHost && <span className="font-semibold text-[#E5B85C]">Chủ phòng</span>}
                  </div>
                  <div className="text-sm font-bold text-[#F5EEDB] truncate">
                    {isOccupied ? seat.playerName : BOT_NAMES[seat.seatIndex]}
                  </div>
                  <div className="text-xs text-[#A8A08C]">
                    {isMe
                      ? 'Bạn đang ngồi tại đây'
                      : isOccupied
                      ? 'Người chơi đã sẵn sàng'
                      : 'Tự động dùng AI nếu còn trống'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="px-4 py-2.5 rounded-xl border border-[#C6932B]/30 text-xs sm:text-sm text-[#E5DEC9] hover:bg-[#1A2D20] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Rời Phòng
            </button>

            {room.hostId === identity.playerId ? (
              <button
                type="button"
                onClick={() => handleStartRoomGame()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Bắt Đầu Ván Đấu
              </button>
            ) : (
              <div className="text-xs sm:text-sm text-[#D6B46A]">
                Đang chờ chủ phòng bấm Bắt Đầu Ván Đấu...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
