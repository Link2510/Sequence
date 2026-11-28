import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  HelpCircle,
  Lightbulb,
  Lock,
  RotateCcw,
  ShieldAlert,
  Unlock,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { chooseAiCard, chooseAiExchangeCard, getBeginnerHint } from '../game/ai';
import { CHAPTERS, CHARACTERS, getChapterById, SUIT_META } from '../game/chapters';
import {
  evaluatePlayerGoal,
  evaluateTrickWinner,
  formatCardName,
  getLegalCards,
  performExchange,
  playCard,
  resolveCurrentTrick,
} from '../game/engine';
import { GameState, PlayerSeat } from '../game/types';
import { soundFx } from '../lib/sound';
import { CharacterPortrait } from './CharacterPortrait';
import { PlayingCard } from './PlayingCard';

interface GameTableProps {
  gameState: GameState;
  mySeatIndex: number;
  isHost: boolean;
  isMultiplayer?: boolean;
  onUpdateGameState: (next: GameState) => void;
  onRestartChapter: () => void;
  onNextChapter: () => void;
  onLeaveTable: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  gameState,
  mySeatIndex,
  isHost,
  isMultiplayer = false,
  onUpdateGameState,
  onRestartChapter,
  onNextChapter,
  onLeaveTable,
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [fastAi, setFastAi] = useState(false);
  const [helperOn, setHelperOn] = useState(true);
  const [hintBox, setHintBox] = useState<{ cardId: string; reason: string } | null>(null);
  const [pendingOneRing, setPendingOneRing] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const chapter = getChapterById(gameState.chapterId);
  const mySeat = gameState.seats[mySeatIndex];
  const topSeatIdx = (mySeatIndex + 2) % 4;
  const leftSeatIdx = (mySeatIndex + 1) % 4;
  const rightSeatIdx = (mySeatIndex + 3) % 4;

  const legalCards = useMemo(
    () => getLegalCards(mySeat.hand, gameState, mySeatIndex),
    [mySeat.hand, gameState, mySeatIndex]
  );
  const legalIds = useMemo(() => new Set(legalCards.map((c) => c.id)), [legalCards]);

  // Clear hint/pending when turn changes
  useEffect(() => {
    setHintBox(null);
    setPendingOneRing(false);
  }, [gameState.currentTurnSeat, gameState.phase, gameState.trickNumber]);

  // Sound cues on round over
  useEffect(() => {
    if (gameState.phase === 'ROUND_OVER') {
      if (gameState.chapterVictory) {
        soundFx.playVictory();
      } else {
        soundFx.playDefeat();
      }
    }
  }, [gameState.phase, gameState.chapterVictory]);

  // Automated AI turns & trick resolution (driven by Host only in multiplayer, or local player in solo)
  useEffect(() => {
    if (!isHost) return;

    if (gameState.phase === 'TRICK_COMPLETE') {
      const timer = setTimeout(() => {
        soundFx.playTrickWin();
        onUpdateGameState(resolveCurrentTrick(gameState));
      }, fastAi ? 650 : 1200);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === 'SETUP_EXCHANGE') {
      const task = gameState.exchangeQueue.find((t) => !t.completed);
      if (!task) return;
      const actor = gameState.seats[task.fromSeat];
      if (!actor.isBot) return;

      const timer = setTimeout(() => {
        const chosen = chooseAiExchangeCard(gameState, task.fromSeat);
        if (chosen) {
          soundFx.playCard();
          onUpdateGameState(performExchange(gameState, task.fromSeat, chosen.id));
        }
      }, fastAi ? 450 : 850);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === 'PLAYING') {
      const activeSeat = gameState.seats[gameState.currentTurnSeat];
      if (!activeSeat.isBot) return;

      const timer = setTimeout(() => {
        const decision = chooseAiCard(gameState, activeSeat.seatIndex);
        if (decision.cardId) {
          if (decision.cardId.startsWith('rings-')) {
            soundFx.playRing();
          } else {
            soundFx.playCard();
          }
          onUpdateGameState(
            playCard(
              gameState,
              activeSeat.seatIndex,
              decision.cardId,
              decision.oneRingClaimWin
            )
          );
        }
      }, fastAi ? 400 : 800);
      return () => clearTimeout(timer);
    }
  }, [gameState, isHost, fastAi, onUpdateGameState]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundFx.enabled = next;
  };

  const handleCardClick = (cardId: string) => {
    if (!legalIds.has(cardId)) return;

    if (gameState.phase === 'SETUP_EXCHANGE') {
      soundFx.playCard();
      onUpdateGameState(performExchange(gameState, mySeatIndex, cardId));
      return;
    }

    if (gameState.phase === 'PLAYING' && gameState.currentTurnSeat === mySeatIndex) {
      if (cardId === 'rings-1') {
        setPendingOneRing(true);
        return;
      }
      if (cardId.startsWith('rings-')) {
        soundFx.playRing();
      } else {
        soundFx.playCard();
      }
      onUpdateGameState(playCard(gameState, mySeatIndex, cardId));
    }
  };

  const handleConfirmOneRing = (claimWin: boolean) => {
    setPendingOneRing(false);
    soundFx.playRing();
    onUpdateGameState(playCard(gameState, mySeatIndex, 'rings-1', claimWin));
  };

  const handleShowHint = () => {
    const hint = getBeginnerHint(gameState, mySeatIndex);
    if (hint) {
      setHintBox({ cardId: hint.cardId, reason: hint.reason });
    }
  };

  const currentWinningSeat =
    gameState.currentTrick.length > 0
      ? evaluateTrickWinner(gameState.currentTrick)
      : null;

  const activeExchangeTask =
    gameState.phase === 'SETUP_EXCHANGE'
      ? gameState.exchangeQueue.find((t) => !t.completed) || null
      : null;

  const isMyTurn =
    (gameState.phase === 'PLAYING' && gameState.currentTurnSeat === mySeatIndex) ||
    (gameState.phase === 'SETUP_EXCHANGE' && activeExchangeTask?.fromSeat === mySeatIndex);

  const ruleExplanationText = useMemo(() => {
    if (gameState.phase === 'SETUP_EXCHANGE' && activeExchangeTask) {
      return activeExchangeTask.fromSeat === mySeatIndex
        ? `Lượt của bạn: ${activeExchangeTask.label}.`
        : `Đang chờ: ${activeExchangeTask.label}...`;
    }
    if (gameState.phase === 'TRICK_COMPLETE' && gameState.lastTrickWinnerSeat !== null) {
      const winner = gameState.seats[gameState.lastTrickWinnerSeat];
      return `${winner.name} (${CHARACTERS[winner.characterId].name}) thắng Trick ${gameState.trickNumber}!`;
    }
    if (gameState.phase === 'PLAYING') {
      if (!isMyTurn) {
        const active = gameState.seats[gameState.currentTurnSeat];
        return `Đang đến lượt ${active.name} (${CHARACTERS[active.characterId].name})...`;
      }
      if (gameState.currentTrick.length === 0) {
        return gameState.ringsBroken
          ? 'Bạn dẫn đầu lượt này — được phép đánh bất kỳ chất nào (kể cả Nhẫn).'
          : 'Bạn dẫn đầu lượt này — hãy đánh 1 lá thường (chưa thể dẫn chất Nhẫn vì Nhẫn chưa khai mở).';
      }
      const leadSuit = gameState.currentTrick[0].card.suit;
      const hasLeadSuit = mySeat.hand.some((c) => c.suit === leadSuit);
      return hasLeadSuit
        ? `Chất dẫn là ${SUIT_META[leadSuit].label} — bạn có chất này nên bắt buộc đánh ${SUIT_META[leadSuit].label}.`
        : `Bạn đã hết ${SUIT_META[leadSuit].label} — có thể xả bất kỳ lá nào hoặc chặt bằng chất Nhẫn!`;
    }
    return '';
  }, [gameState, activeExchangeTask, isMyTurn, mySeatIndex, mySeat.hand]);

  const renderGoalBadge = (seat: PlayerSeat) => {
    const ev = evaluatePlayerGoal(seat, gameState);
    if (ev.status === 'met') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{ev.progressText}</span>
        </span>
      );
    }
    if (ev.status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-300">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{ev.progressText}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#E5DEC9]">
        <Clock className="w-3.5 h-3.5 text-[#D6B46A] shrink-0" />
        <span>{ev.progressText}</span>
      </span>
    );
  };

  const renderSeatPlaque = (seatIdx: number, positionLabel: string) => {
    const seat = gameState.seats[seatIdx];
    const char = CHARACTERS[seat.characterId];
    const rule = chapter.characters.find((c) => c.characterId === seat.characterId);
    const isTurn =
      (gameState.phase === 'PLAYING' && gameState.currentTurnSeat === seatIdx) ||
      (gameState.phase === 'SETUP_EXCHANGE' && activeExchangeTask?.fromSeat === seatIdx);

    return (
      <div
        className={`rounded-xl border p-3 transition-colors ${
          isTurn
            ? 'bg-[#1B3123]/95 border-[#E5B85C] shadow-[0_0_20px_rgba(198,147,43,0.2)]'
            : 'bg-[#101C14]/90 border-[#C6932B]/25'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <CharacterPortrait characterId={seat.characterId} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-[#F5EEDB] truncate">
                {char.name}
              </span>
              <span className="text-[11px] font-mono text-[#D6B46A] tabular-nums shrink-0">
                {seat.hand.length} lá · {seat.wonTricks.length} trick
              </span>
            </div>
            <div className="text-xs text-[#A8A08C] truncate">
              {seat.name} {seat.isBot ? '(AI)' : ''} · {positionLabel}
            </div>
            <div className="mt-1.5 text-xs text-[#E5B85C] font-medium leading-snug">
              {rule?.goalLabel}
            </div>
            <div className="mt-1">{renderGoalBadge(seat)}</div>
          </div>
        </div>
      </div>
    );
  };

  const getPlayedForSeat = (seatIdx: number) =>
    gameState.currentTrick.find((p) => p.seatIndex === seatIdx);

  const showLostCardFaceUp =
    gameState.phase === 'ROUND_OVER' ||
    gameState.lostCardRevealedToSeat === mySeatIndex;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#09120C] relative overflow-hidden">
      {/* Background atmospheric tabletop image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 bg-cover bg-center"
        style={{
          backgroundImage: `url('./src/assets/images/shire_table_mat_1795802414854.jpg')`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#09120C]/85 via-[#09120C]/65 to-[#09120C]/95" />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Top Table HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101C14]/90 border border-[#C6932B]/30 rounded-xl px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
            <span className="font-display font-bold text-[#F5EEDB]">{chapter.title}</span>
            <span className="text-[#C6932B]" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#E5DEC9]">
              Trick {gameState.trickNumber}/9
            </span>
            <span className="text-[#C6932B]" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              {gameState.ringsBroken ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-[#E5B85C]" />
                  <span className="text-[#E5B85C]">Nhẫn đã khai mở</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#A8A08C]" />
                  <span className="text-[#A8A08C]">Nhẫn chưa khai mở</span>
                </>
              )}
            </span>
            {isMultiplayer && (
              <>
                <span className="text-[#C6932B]" aria-hidden="true">·</span>
                <span className="text-emerald-300 text-xs">Phòng trực tuyến</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFastAi((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-[#C6932B]/25 bg-[#15241A] hover:bg-[#1C3022] text-xs text-[#E5DEC9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI: {fastAi ? 'Nhanh' : 'Chuẩn'}
            </button>
            <button
              type="button"
              onClick={() => setHelperOn((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                helperOn
                  ? 'border-[#C6932B] bg-[#C6932B]/15 text-[#E5B85C]'
                  : 'border-[#C6932B]/25 bg-[#15241A] text-[#C8C0AB]'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Trợ lý luật
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
              className="p-1.5 rounded-lg border border-[#C6932B]/25 bg-[#15241A] hover:bg-[#1C3022] text-[#E5DEC9] transition-colors cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setShowLog((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-[#C6932B]/25 bg-[#15241A] hover:bg-[#1C3022] text-xs text-[#E5DEC9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Nhật ký
            </button>
            {isHost && (
              <button
                type="button"
                onClick={onRestartChapter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C6932B]/30 bg-[#15241A] hover:bg-[#1C3022] text-xs text-[#F5EEDB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Chia Lại
              </button>
            )}
            <button
              type="button"
              onClick={onLeaveTable}
              className="px-3 py-1.5 rounded-lg border border-rose-500/35 bg-rose-950/35 hover:bg-rose-900/50 text-xs text-rose-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Rời Bàn
            </button>
          </div>
        </div>

        {/* Beginner Contextual Helper Banner */}
        {helperOn && ruleExplanationText && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#15271C]/95 border border-[#C6932B]/30 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#EDE5D0]">
            <span>{ruleExplanationText}</span>
            {isMyTurn && gameState.phase !== 'TRICK_COMPLETE' && (
              <button
                type="button"
                onClick={handleShowHint}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#C6932B]/20 hover:bg-[#C6932B]/35 border border-[#C6932B]/50 text-[#F4D07A] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Gợi ý nước đi
              </button>
            )}
          </div>
        )}

        {hintBox && (
          <div className="flex items-start gap-2.5 bg-[#1B3123] border border-emerald-500/45 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-emerald-100">
            <Lightbulb className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-200">Lời khuyên từ Gandalf:</strong> {hintBox.reason}
            </span>
          </div>
        )}

        {/* Main 3-Column Tabletop Grid */}
        <div className="grid lg:grid-cols-12 gap-4 items-center">
          {/* Left Seat */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            {renderSeatPlaque(leftSeatIdx, 'Bên Trái')}
          </div>

          {/* Center Column: Top Seat + Trick Arena */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <div className="max-w-md mx-auto">
              {renderSeatPlaque(topSeatIdx, 'Đối Diện')}
            </div>

            {/* Active Trick Felt Arena */}
            <div className="relative rounded-2xl border-2 border-[#C6932B]/45 bg-[#0F2618]/90 shadow-2xl p-4 sm:p-6 min-h-[270px] flex flex-col justify-between">
              {/* Pedestal Metadata Row: Lost Card + Black Rider */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#C6932B]/20">
                <div className="flex items-center gap-3">
                  {showLostCardFaceUp ? (
                    <div className="flex items-center gap-2">
                      <PlayingCard card={gameState.lostCard} compact />
                      <div className="text-xs">
                        <div className="text-[#E5B85C] font-semibold flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Lá Thất Lạc
                        </div>
                        <div className="text-[#C8C0AB]">
                          {formatCardName(gameState.lostCard)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <PlayingCard faceDown compact title="Lá Bài Thất Lạc (đang úp)" />
                      <div className="text-xs text-[#A8A08C]">
                        <div className="font-semibold text-[#E5DEC9]">Lá Bài Thất Lạc</div>
                        <div>Úp ngoài ván đấu</div>
                      </div>
                    </div>
                  )}
                </div>

                {gameState.blackRiderRank !== null && (
                  <div className="flex items-center gap-2 bg-[#2B1217] border border-rose-500/40 rounded-lg px-3 py-1.5 text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0" />
                    <div>
                      <div className="font-semibold text-rose-200">
                        Ma Nhẫn Đen #{gameState.blackRiderRank}
                      </div>
                      <div className="text-rose-300/80">
                        Sam cần ăn {gameState.blackRiderRank} Đồi Cỏ
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Compass 4-Card Trick Slots */}
              <div className="grid grid-cols-3 grid-rows-3 gap-2 items-center justify-items-center py-3">
                {/* Top Played Card */}
                <div className="col-start-2 row-start-1 flex flex-col items-center gap-1">
                  {getPlayedForSeat(topSeatIdx) ? (
                    <PlayingCard
                      card={getPlayedForSeat(topSeatIdx)!.card}
                      compact
                      highlighted={currentWinningSeat === topSeatIdx}
                      badgeText={
                        getPlayedForSeat(topSeatIdx)!.card.id === 'rings-1'
                          ? getPlayedForSeat(topSeatIdx)!.oneRingClaimWin
                            ? 'THẮNG'
                            : 'NHƯỜNG'
                          : undefined
                      }
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-lg border border-dashed border-[#C6932B]/25 flex items-center justify-center text-[10px] text-[#8E8774]">
                      {CHARACTERS[gameState.seats[topSeatIdx].characterId].name.split(' ')[0]}
                    </div>
                  )}
                </div>

                {/* Left Played Card */}
                <div className="col-start-1 row-start-2 flex flex-col items-center gap-1">
                  {getPlayedForSeat(leftSeatIdx) ? (
                    <PlayingCard
                      card={getPlayedForSeat(leftSeatIdx)!.card}
                      compact
                      highlighted={currentWinningSeat === leftSeatIdx}
                      badgeText={
                        getPlayedForSeat(leftSeatIdx)!.card.id === 'rings-1'
                          ? getPlayedForSeat(leftSeatIdx)!.oneRingClaimWin
                            ? 'THẮNG'
                            : 'NHƯỜNG'
                          : undefined
                      }
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-lg border border-dashed border-[#C6932B]/25 flex items-center justify-center text-[10px] text-[#8E8774]">
                      {CHARACTERS[gameState.seats[leftSeatIdx].characterId].name.split(' ')[0]}
                    </div>
                  )}
                </div>

                {/* Center Trick Marker */}
                <div className="col-start-2 row-start-2 text-center px-2">
                  {gameState.currentTrick.length === 0 ? (
                    <div className="text-xs text-[#9E9784]">
                      Chờ {CHARACTERS[gameState.seats[gameState.leadSeat].characterId].name.split(' ')[0]} dẫn lượt
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-[#E5B85C]">
                      Đang dẫn:{' '}
                      {currentWinningSeat !== null
                        ? CHARACTERS[gameState.seats[currentWinningSeat].characterId].name.split(' ')[0]
                        : '—'}
                    </div>
                  )}
                </div>

                {/* Right Played Card */}
                <div className="col-start-3 row-start-2 flex flex-col items-center gap-1">
                  {getPlayedForSeat(rightSeatIdx) ? (
                    <PlayingCard
                      card={getPlayedForSeat(rightSeatIdx)!.card}
                      compact
                      highlighted={currentWinningSeat === rightSeatIdx}
                      badgeText={
                        getPlayedForSeat(rightSeatIdx)!.card.id === 'rings-1'
                          ? getPlayedForSeat(rightSeatIdx)!.oneRingClaimWin
                            ? 'THẮNG'
                            : 'NHƯỜNG'
                          : undefined
                      }
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-lg border border-dashed border-[#C6932B]/25 flex items-center justify-center text-[10px] text-[#8E8774]">
                      {CHARACTERS[gameState.seats[rightSeatIdx].characterId].name.split(' ')[0]}
                    </div>
                  )}
                </div>

                {/* Bottom (My) Played Card */}
                <div className="col-start-2 row-start-3 flex flex-col items-center gap-1">
                  {getPlayedForSeat(mySeatIndex) ? (
                    <PlayingCard
                      card={getPlayedForSeat(mySeatIndex)!.card}
                      compact
                      highlighted={currentWinningSeat === mySeatIndex}
                      badgeText={
                        getPlayedForSeat(mySeatIndex)!.card.id === 'rings-1'
                          ? getPlayedForSeat(mySeatIndex)!.oneRingClaimWin
                            ? 'THẮNG'
                            : 'NHƯỜNG'
                          : undefined
                      }
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-lg border border-dashed border-[#C6932B]/25 flex items-center justify-center text-[10px] text-[#8E8774]">
                      Bạn
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Seat */}
          <div className="lg:col-span-3 order-3">
            {renderSeatPlaque(rightSeatIdx, 'Bên Phải')}
          </div>
        </div>

        {/* 1 of Rings Decision Bar */}
        {pendingOneRing && (
          <div className="max-w-2xl mx-auto bg-[#1D2D1F] border-2 border-[#E5B85C] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="text-sm text-[#F5EEDB]">
              <strong className="text-[#E5B85C]">Chiếc Nhẫn Duy Nhất (1 Nhẫn):</strong> Bạn muốn kích hoạt để thắng trick này hay nhường quyền thắng?
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleConfirmOneRing(true)}
                className="px-4 py-2 rounded-lg bg-[#C6932B] hover:bg-[#D7A43A] text-[#111810] text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Kích Hoạt: Thắng Trick
              </button>
              <button
                type="button"
                onClick={() => handleConfirmOneRing(false)}
                className="px-4 py-2 rounded-lg bg-[#122017] hover:bg-[#192C20] border border-[#C6932B]/40 text-[#F5EEDB] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Giữ Kín: Nhường Thắng
              </button>
              <button
                type="button"
                onClick={() => setPendingOneRing(false)}
                className="px-3 py-2 rounded-lg text-xs text-[#A8A08C] hover:text-[#F5EEDB] cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Bottom Seat (Human Player Plaque + Playable Hand) */}
        <div className="bg-[#101C14]/95 border border-[#C6932B]/35 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CharacterPortrait characterId={mySeat.characterId} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-display font-bold text-[#F5EEDB]">
                    {CHARACTERS[mySeat.characterId].name}
                  </span>
                  <span className="text-xs text-[#D6B46A]">· {mySeat.name} (Bạn)</span>
                </div>
                <div className="text-xs sm:text-sm text-[#E5B85C] font-medium">
                  Mục tiêu: {chapter.characters.find((c) => c.characterId === mySeat.characterId)?.goalLabel}
                </div>
                <div className="text-xs text-[#A8A08C]">
                  {chapter.characters.find((c) => c.characterId === mySeat.characterId)?.goalDescription}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="text-xs font-mono tabular-nums text-[#D6B46A]">
                Đã ăn: {mySeat.wonTricks.length} trick · {mySeat.wonCards.length} lá
              </div>
              {renderGoalBadge(mySeat)}
            </div>
          </div>

          {/* Player's Hand */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1">
            {mySeat.hand.map((card) => {
              const isLegal = legalIds.has(card.id);
              const isHinted = hintBox?.cardId === card.id;
              return (
                <PlayingCard
                  key={card.id}
                  card={card}
                  playable={isMyTurn && isLegal}
                  dimmed={isMyTurn && !isLegal}
                  highlighted={isHinted}
                  selected={pendingOneRing && card.id === 'rings-1'}
                  onClick={() => handleCardClick(card.id)}
                  title={
                    isMyTurn && !isLegal
                      ? 'Lá bài này chưa hợp lệ ở lượt hiện tại'
                      : formatCardName(card)
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Optional Action Log Drawer */}
        {showLog && (
          <div className="bg-[#101C14]/95 border border-[#C6932B]/30 rounded-xl p-4 max-h-48 overflow-y-auto space-y-1.5 text-xs text-[#C8C0AB]">
            <div className="font-semibold text-[#E5B85C] mb-1">Diễn biến ván đấu</div>
            {gameState.actionLog.map((entry, i) => (
              <div key={i} className="leading-relaxed">
                {entry}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Round Over Modal */}
      {gameState.phase === 'ROUND_OVER' && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#122017] border-2 border-[#C6932B]/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="text-xs font-medium text-[#D6B46A]">
                {chapter.title} · Kết Quả Chung Cuộc
              </div>
              <h2
                className={`text-2xl sm:text-3xl font-bold ${
                  gameState.chapterVictory ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {gameState.chapterVictory
                  ? 'Hội Đồng Nhẫn Chiến Thắng!'
                  : 'Nhiệm Vụ Chương Thất Bại'}
              </h2>
              <p className="text-sm text-[#C8C0AB]">
                {gameState.chapterVictory
                  ? 'Tất cả thành viên đều hoàn thành lời thề. Hành trình Trung Địa sẵn sàng bước sang chương tiếp theo!'
                  : 'Ít nhất một đồng đội chưa đạt điều kiện của mình. Cả nhóm hãy điều chỉnh chiến thuật và thử lại!'}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {gameState.seats.map((seat) => {
                const char = CHARACTERS[seat.characterId];
                const ev = evaluatePlayerGoal(seat, gameState);
                const rule = chapter.characters.find((c) => c.characterId === seat.characterId);
                return (
                  <div
                    key={seat.seatIndex}
                    className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                      ev.status === 'met'
                        ? 'bg-emerald-950/35 border-emerald-500/45'
                        : 'bg-rose-950/35 border-rose-500/45'
                    }`}
                  >
                    <CharacterPortrait characterId={seat.characterId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[#F5EEDB]">{char.name}</div>
                      <div className="text-xs text-[#A8A08C]">{seat.name}</div>
                      <div className="mt-1 text-xs text-[#E5DEC9]">{rule?.goalLabel}</div>
                      <div className="mt-1">{renderGoalBadge(seat)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#C6932B]/20">
              <div className="text-xs text-[#C8C0AB]">
                Lá Bài Thất Lạc: <strong className="text-[#E5B85C]">{formatCardName(gameState.lostCard)}</strong>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onLeaveTable}
                  className="px-4 py-2 rounded-xl border border-[#C6932B]/30 text-xs sm:text-sm text-[#E5DEC9] hover:bg-[#1A2D20] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Về Sảnh
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={onRestartChapter}
                    className="px-4 py-2 rounded-xl border border-[#C6932B]/50 bg-[#1A2D20] hover:bg-[#243E2C] text-xs sm:text-sm font-semibold text-[#F5EEDB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Chơi Lại Chương Này
                  </button>
                )}
                {isHost && gameState.chapterVictory && gameState.chapterId < CHAPTERS.length && (
                  <button
                    type="button"
                    onClick={onNextChapter}
                    className="px-5 py-2 rounded-xl bg-[#C6932B] hover:bg-[#D7A43A] text-xs sm:text-sm font-semibold text-[#111810] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Chương Tiếp Theo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
