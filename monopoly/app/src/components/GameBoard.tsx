import React from 'react';
import { Dices, PartyPopper, Plane, Sparkles } from 'lucide-react';
import { BOARD_TILES } from '../data/boardData';
import { PLAYER_COLORS } from '../data/characters';
import {
  BoardTile as BoardTileType,
  LogEntry,
  Player,
  PropertyState,
  TurnStep,
} from '../types/game';
import { BoardTile } from './BoardTile';
import { VietnamMapBackdrop } from './VietnamMapBackdrop';

interface GameBoardProps {
  players: Player[];
  currentPlayer: Player;
  ownership: Record<number, PropertyState>;
  turnStep: TurnStep;
  dice: [number, number];
  isRolling: boolean;
  movingPlayerId: number | null;
  canControlTurn?: boolean;
  logs: LogEntry[];
  onRollDice: () => void;
  onTileClick: (tile: BoardTileType) => void;
}

const DICE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const DiceCube: React.FC<{ value: number; rolling: boolean }> = ({
  value,
  rolling,
}) => {
  const pips = DICE_PIPS[value] ?? DICE_PIPS[1];

  return (
    <div
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border-2 border-slate-200 shadow-lg p-2 grid grid-cols-3 grid-rows-3 place-items-center ${
        rolling ? 'animate-dice-shake' : ''
      }`}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-opacity ${
            pips.includes(i)
              ? value === 1
                ? 'bg-rose-600 opacity-100'
                : 'bg-slate-900 opacity-100'
              : 'opacity-0'
          }`}
        />
      ))}
    </div>
  );
};

export const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayer,
  ownership,
  turnStep,
  dice,
  isRolling,
  movingPlayerId,
  canControlTurn,
  logs,
  onRollDice,
  onTileClick,
}) => {
  const activeColor = PLAYER_COLORS[currentPlayer.color];
  const isDoubles = dice[0] === dice[1];
  const hasControl = canControlTurn ?? !currentPlayer.isAI;
  const canRoll = turnStep === 'WAIT_ROLL' && hasControl;

  return (
    <div className="w-full max-w-[780px] aspect-square mx-auto rounded-2xl p-2 sm:p-3 bg-[#0C312B] border border-emerald-400/20 shadow-2xl">
      <div className="grid grid-cols-9 grid-rows-9 gap-1 sm:gap-1.5 w-full h-full">
        {/* 32 Perimeter Tiles */}
        {BOARD_TILES.map((tile) => {
          const prop = ownership[tile.id];
          const selectableForFestival =
            turnStep === 'SELECT_FESTIVAL' &&
            hasControl &&
            prop?.ownerId === currentPlayer.id;

          const selectableForWorldTour =
            turnStep === 'SELECT_WORLD_TOUR' &&
            hasControl &&
            tile.id !== 24;

          return (
            <BoardTile
              key={tile.id}
              tile={tile}
              ownership={ownership}
              players={players}
              movingPlayerId={movingPlayerId}
              selectableForFestival={selectableForFestival}
              selectableForWorldTour={selectableForWorldTour}
              onTileClick={onTileClick}
            />
          );
        })}

        {/* Central 7x7 Arena */}
        <div className="col-start-2 col-end-9 row-start-2 row-end-9 rounded-xl bg-[radial-gradient(circle_at_center,_#12453C_0%,_#0B2C26_70%,_#08211D_100%)] border border-emerald-400/15 p-3 sm:p-5 flex flex-col justify-between relative overflow-hidden">
          <VietnamMapBackdrop />

          {/* Top Center: Active Player Banner */}
          <div className="relative z-10 flex items-center justify-between gap-3 bg-[#071D19]/75 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentPlayer.avatar}
                alt={currentPlayer.name}
                referrerPolicy="no-referrer"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border-2 ${activeColor.border} shrink-0`}
              />
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  Lượt của {currentPlayer.name}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {turnStep === 'WAIT_ROLL' &&
                    (currentPlayer.isAI
                      ? 'Máy đang chuẩn bị tung xúc xắc...'
                      : hasControl
                      ? 'Nhấn Tung Xúc Xắc (hoặc phím Space)'
                      : `Đang chờ ${currentPlayer.name} tung xúc xắc...`)}
                  {turnStep === 'ROLLING' && 'Đang tung xúc xắc...'}
                  {turnStep === 'MOVING' && 'Đang di chuyển trên bản đồ...'}
                  {turnStep === 'RESOLVING' &&
                    (hasControl
                      ? 'Đang xử lý sự kiện ô...'
                      : `Đang chờ ${currentPlayer.name} quyết định...`)}
                  {turnStep === 'SELECT_FESTIVAL' &&
                    (hasControl
                      ? 'Chọn 1 tỉnh thành bạn sở hữu để tổ chức Lễ Hội x2!'
                      : `Đang chờ ${currentPlayer.name} chọn tỉnh tổ chức Lễ Hội...`)}
                  {turnStep === 'SELECT_WORLD_TOUR' &&
                    (hasControl
                      ? 'Chọn bất kỳ ô nào trên bản đồ để bay đến!'
                      : `Đang chờ ${currentPlayer.name} chọn điểm bay Du Lịch...`)}
                </div>
              </div>
            </div>

            {isDoubles && (turnStep === 'MOVING' || turnStep === 'RESOLVING') && (
              <span className="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold whitespace-nowrap shrink-0">
                Đôi {dice[0]}+{dice[1]}!
              </span>
            )}
          </div>

          {/* Center Stage: Mode Prompt OR Dice & Roll Action */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-2 bg-[#061A16]/45 backdrop-blur-[2px] rounded-xl px-3 py-2">
            {turnStep === 'SELECT_FESTIVAL' && hasControl ? (
              <div className="text-center max-w-xs bg-violet-950/85 border border-violet-400/50 rounded-2xl p-4 shadow-xl">
                <PartyPopper className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h3 className="font-display text-base font-bold text-white">
                  Tổ Chức Lễ Hội
                </h3>
                <p className="text-xs text-slate-200 mt-1">
                  Nhấn vào một ô tỉnh thành hoặc khu nghỉ dưỡng của bạn để nhân đôi tiền thuê.
                </p>
              </div>
            ) : turnStep === 'SELECT_WORLD_TOUR' && hasControl ? (
              <div className="text-center max-w-xs bg-sky-950/85 border border-sky-400/50 rounded-2xl p-4 shadow-xl">
                <Plane className="w-8 h-8 text-sky-400 mx-auto mb-2" />
                <h3 className="font-display text-base font-bold text-white">
                  Chuyến Bay Du Lịch
                </h3>
                <p className="text-xs text-slate-200 mt-1">
                  Nhấn chọn bất kỳ ô nào trên bàn cờ để bay thẳng đến đó!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <DiceCube value={dice[0]} rolling={isRolling} />
                  <DiceCube value={dice[1]} rolling={isRolling} />
                </div>

                {canRoll ? (
                  <button
                    type="button"
                    onClick={onRollDice}
                    className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-display font-extrabold text-sm sm:text-base transition-all flex items-center gap-2 shadow-xl shadow-amber-500/25 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Dices className="w-5 h-5" />
                    {currentPlayer.worldTourReady
                      ? 'Chọn Ô Bay Du Lịch'
                      : 'Tung Xúc Xắc'}
                  </button>
                ) : (
                  <div className="font-mono-num text-xs sm:text-sm font-semibold text-emerald-200 bg-black/25 border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Tổng điểm: {dice[0] + dice[1]}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Center: Compact Activity Feed */}
          <div className="relative z-10 bg-[#071D19]/75 backdrop-blur-sm border border-white/15 rounded-xl p-2.5 sm:p-3">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
              Diễn biến trận đấu
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
              {logs.slice(0, 4).map((entry) => (
                <p
                  key={entry.id}
                  className={`text-[11px] sm:text-xs leading-snug ${
                    entry.tone === 'good'
                      ? 'text-emerald-300'
                      : entry.tone === 'warn'
                      ? 'text-amber-300'
                      : entry.tone === 'bad'
                      ? 'text-rose-300'
                      : 'text-slate-200'
                  }`}
                >
                  {entry.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
