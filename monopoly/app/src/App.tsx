import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  FastForward,
  Home as HomeIcon,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ActionModal } from './components/ActionModal';
import { GameBoard } from './components/GameBoard';
import { GameOverModal } from './components/GameOverModal';
import { LobbyScreen } from './components/LobbyScreen';
import { OnlineRoomLobby } from './components/OnlineRoomLobby';
import { PlayerPanel } from './components/PlayerPanel';
import {
  BOARD_TILES,
  CHANCE_CARDS,
  JAIL_BAIL,
  START_SALARY,
} from './data/boardData';
import { getCharacterById } from './data/characters';
import {
  BoardTile,
  ChanceCard,
  GamePhase,
  LogEntry,
  PendingModal,
  Player,
  PlayerColorKey,
  PlayerSlotConfig,
  PropertyState,
  TurnStep,
  VictorySummary,
} from './types/game';
import {
  ClientWsMessage,
  GameActionPayload,
  RoomPublicView,
  ServerWsMessage,
} from './types/room';
import {
  connectFirebaseRooms,
  disconnectFirebaseRooms,
  sendFirebaseMessage,
  firebaseRoomsReady,
} from './utils/firebaseRooms';
import {
  calculateBuyoutPrice,
  calculateMaxLiquidationCash,
  calculateRent,
  calculateSellValue,
  checkVictoryConditions,
  chooseAIFestivalTile,
  chooseAILevelToBuy,
  chooseAIWorldTourTile,
  formatMoney,
  getPlayerOwnedTiles,
  getTileById,
  shouldAIBuyout,
} from './utils/gameLogic';
import { sfx } from './utils/sound';

function getOrCreateClientId(): string {
  try {
    const existing = sessionStorage.getItem('tkd_client_id');
    if (existing) return existing;
    const created =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('tkd_client_id', created);
    return created;
  } catch {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getInitialRoomCodeFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    return code ? code.trim().toUpperCase().slice(0, 8) : '';
  } catch {
    return '';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [lastConfig, setLastConfig] = useState<{
    slots: PlayerSlotConfig[];
    startingCash: number;
  } | null>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [ownership, setOwnership] = useState<Record<number, PropertyState>>({});
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [turnStep, setTurnStep] = useState<TurnStep>('WAIT_ROLL');
  const [dice, setDice] = useState<[number, number]>([1, 6]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [movingPlayerId, setMovingPlayerId] = useState<number | null>(null);
  const [pendingModal, setPendingModal] = useState<PendingModal>(null);
  const [inspectedTile, setInspectedTile] = useState<BoardTile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [victory, setVictory] = useState<VictorySummary | null>(null);

  const [muted, setMuted] = useState<boolean>(false);
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Online Room WebSocket state
  const [clientId] = useState<string>(() => getOrCreateClientId());
  const [initialRoomCode] = useState<string>(() => getInitialRoomCodeFromUrl());
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<'checking' | 'ready' | 'unavailable'>(
    'checking'
  );
  const [wsError, setWsError] = useState<string | null>(null);
  const [onlineRoom, setOnlineRoom] = useState<RoomPublicView | null>(null);
  const [onlineAnimPositions, setOnlineAnimPositions] = useState<
    Record<number, number>
  >({});
  const [onlineMovingPlayerId, setOnlineMovingPlayerId] = useState<number | null>(
    null
  );
  const wsRef = useRef<WebSocket | null>(null);
  const lastMoveSeqRef = useRef<number>(0);

  // Track active extra turn flag across modal resolutions
  const extraTurnRef = useRef<boolean>(false);
  const sessionRef = useRef<number>(0);

  // Latest state refs for safe async operations
  const playersRef = useRef(players);
  playersRef.current = players;
  const ownershipRef = useRef(ownership);
  ownershipRef.current = ownership;
  const currentIdxRef = useRef(currentPlayerIndex);
  currentIdxRef.current = currentPlayerIndex;
  const fastModeRef = useRef(fastMode);
  fastModeRef.current = fastMode;
  const onlineRoomRef = useRef(onlineRoom);
  onlineRoomRef.current = onlineRoom;

  const sendWsMessage = useCallback((msg: ClientWsMessage) => {
    const raw = JSON.stringify(msg);
    if (import.meta.env.VITE_WS_URL && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(raw);
      return;
    }
    if (firebaseRoomsReady()) sendFirebaseMessage(msg);
  }, []);

  // Firebase RTDB transport (default on static Firebase Hosting); optional external WS via VITE_WS_URL.
  useEffect(() => {
    let closedByCleanup = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const envWsUrl = (
      import.meta.env.VITE_WS_URL as string | undefined
    )?.trim();

    const handleServerMessage = (msg: ServerWsMessage) => {
      if (msg.type === 'ROOM_STATE') {
        setWsError(null);
        setOnlineRoom(msg.room);
      } else if (msg.type === 'ROOM_LEFT') {
        setOnlineRoom(null);
        lastMoveSeqRef.current = 0;
      } else if (msg.type === 'ERROR') {
        setWsError(msg.message);
      }
    };

    if (!envWsUrl) {
      connectFirebaseRooms(clientId, handleServerMessage).then((ok) => {
        if (closedByCleanup) return;
        setWsConnected(ok);
        setWsStatus(ok ? 'ready' : 'unavailable');
      });
      return () => {
        closedByCleanup = true;
        disconnectFirebaseRooms();
      };
    }

    const connect = () => {
      if (closedByCleanup) return;
      const ws = new WebSocket(envWsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        setWsConnected(true);
        setWsStatus('ready');
        setWsError(null);
        const activeCode = onlineRoomRef.current?.code;
        if (activeCode) {
          ws.send(
            JSON.stringify({
              type: 'JOIN_ROOM',
              clientId,
              code: activeCode,
              playerName: 'Người chơi',
            } satisfies ClientWsMessage)
          );
        }
      };
      ws.onmessage = (event) => {
        try {
          handleServerMessage(JSON.parse(event.data as string) as ServerWsMessage);
        } catch {
          // ignore malformed messages
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByCleanup) {
          setWsStatus('checking');
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };
    connect();
    return () => {
      closedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [clientId]);

  // Animate online pawn step-by-step whenever server broadcasts a new lastMove
  useEffect(() => {
    const move = onlineRoom?.game?.lastMove;
    if (!move || move.seq <= lastMoveSeqRef.current) return;
    lastMoveSeqRef.current = move.seq;

    let cancelled = false;
    const runAnim = async () => {
      const delay = fastModeRef.current ? 55 : 105;
      setOnlineMovingPlayerId(move.playerId);
      let pos = move.from;
      const total = BOARD_TILES.length;

      for (let i = 0; i < move.steps; i++) {
        await sleep(delay);
        if (cancelled) return;
        pos = (pos + 1) % total;
        sfx.step();
        setOnlineAnimPositions((prev) => ({ ...prev, [move.playerId]: pos }));
      }

      if (!cancelled) {
        setOnlineMovingPlayerId(null);
        setOnlineAnimPositions((prev) => {
          const copy = { ...prev };
          delete copy[move.playerId];
          return copy;
        });
      }
    };

    runAnim();
    return () => {
      cancelled = true;
    };
  }, [onlineRoom?.game?.lastMove]);

  const addLog = useCallback(
    (text: string, tone: LogEntry['tone'] = 'neutral') => {
      setLogs((prev) => [
        { id: `${Date.now()}-${Math.random()}`, text, tone },
        ...prev.slice(0, 29),
      ]);
    },
    []
  );

  const startGame = useCallback(
    (slots: PlayerSlotConfig[], startingCash: number) => {
      sessionRef.current += 1;
      extraTurnRef.current = false;

      const initialPlayers: Player[] = slots.map((slot, idx) => {
        const char = getCharacterById(slot.characterId);
        return {
          id: idx,
          name: slot.name.trim() || `Người chơi ${idx + 1}`,
          isAI: slot.isAI,
          characterId: char.id,
          avatar: char.avatar,
          color: slot.color,
          cash: startingCash,
          position: 0,
          inJail: false,
          jailTurns: 0,
          escapeCards: 0,
          worldTourReady: false,
          doublesStreak: 0,
          bankrupt: false,
        };
      });

      setLastConfig({ slots, startingCash });
      setPlayers(initialPlayers);
      setOwnership({});
      setCurrentPlayerIndex(0);
      setTurnStep('WAIT_ROLL');
      setDice([1, 6]);
      setIsRolling(false);
      setMovingPlayerId(null);
      setPendingModal(null);
      setInspectedTile(null);
      setVictory(null);
      setLogs([
        {
          id: 'init',
          text: `Trận đấu bắt đầu với ${initialPlayers.length} người chơi (${formatMoney(startingCash)}/người).`,
          tone: 'good',
        },
      ]);
      setPhase('PLAYING');
    },
    []
  );

  const evaluateVictory = useCallback(
    (nextPlayers: Player[], nextOwnership: Record<number, PropertyState>): boolean => {
      const summary = checkVictoryConditions(nextPlayers, nextOwnership);
      if (summary) {
        sfx.victory();
        setVictory(summary);
        setTurnStep('GAME_END');
        setPendingModal(null);
        setPhase('GAME_OVER');
        return true;
      }
      return false;
    },
    []
  );

  const advanceTurn = useCallback(
    (
      latestPlayers?: Player[],
      latestOwnership?: Record<number, PropertyState>
    ) => {
      const pList = latestPlayers ?? playersRef.current;
      const own = latestOwnership ?? ownershipRef.current;

      if (evaluateVictory(pList, own)) return;

      const curIdx = currentIdxRef.current;
      const curPlayer = pList[curIdx];

      if (
        extraTurnRef.current &&
        curPlayer &&
        !curPlayer.bankrupt &&
        !curPlayer.inJail
      ) {
        extraTurnRef.current = false;
        addLog(`${curPlayer.name} được tung thêm lượt nhờ ra Đôi!`, 'good');
        setTurnStep('WAIT_ROLL');
        return;
      }

      extraTurnRef.current = false;
      let nextIdx = (curIdx + 1) % pList.length;
      let guard = 0;
      while (pList[nextIdx]?.bankrupt && guard < pList.length) {
        nextIdx = (nextIdx + 1) % pList.length;
        guard += 1;
      }

      setCurrentPlayerIndex(nextIdx);
      setTurnStep('WAIT_ROLL');
    },
    [addLog, evaluateVictory]
  );

  const eliminatePlayer = useCallback(
    (playerId: number, creditorId: number | null, reason: string) => {
      sfx.alert();
      const nextPlayers = playersRef.current.map((p) => {
        if (p.id === playerId) {
          return { ...p, cash: 0, bankrupt: true, inJail: false };
        }
        if (creditorId !== null && p.id === creditorId) {
          const bankruptCash =
            playersRef.current.find((bp) => bp.id === playerId)?.cash ?? 0;
          return { ...p, cash: p.cash + Math.max(0, bankruptCash) };
        }
        return p;
      });

      const nextOwnership = { ...ownershipRef.current };
      for (const [tileIdStr, prop] of Object.entries(nextOwnership)) {
        if (prop.ownerId === playerId) {
          delete nextOwnership[Number(tileIdStr)];
        }
      }

      const victim = playersRef.current.find((p) => p.id === playerId);
      addLog(
        `${victim?.name ?? 'Người chơi'} đã phá sản (${reason})! Toàn bộ tài sản được thu hồi.`,
        'bad'
      );

      extraTurnRef.current = false;
      setPlayers(nextPlayers);
      setOwnership(nextOwnership);
      setPendingModal(null);

      if (!evaluateVictory(nextPlayers, nextOwnership)) {
        advanceTurn(nextPlayers, nextOwnership);
      }
    },
    [addLog, advanceTurn, evaluateVictory]
  );

  const chargePlayer = useCallback(
    (
      playerId: number,
      amount: number,
      creditorId: number | null,
      reason: string,
      afterPaid?: (
        updatedPlayers: Player[],
        updatedOwnership: Record<number, PropertyState>
      ) => void
    ) => {
      const pList = playersRef.current;
      const own = ownershipRef.current;
      const payer = pList.find((p) => p.id === playerId);
      if (!payer || payer.bankrupt) return;

      // Direct payment possible
      if (payer.cash >= amount) {
        if (creditorId !== null) sfx.pay();
        else sfx.pay();

        const nextPlayers = pList.map((p) => {
          if (p.id === playerId) return { ...p, cash: p.cash - amount };
          if (creditorId !== null && p.id === creditorId) {
            return { ...p, cash: p.cash + amount };
          }
          return p;
        });

        setPlayers(nextPlayers);
        if (afterPaid) {
          afterPaid(nextPlayers, own);
        } else {
          advanceTurn(nextPlayers, own);
        }
        return;
      }

      // Not enough cash: If AI, auto-liquidate cheapest properties
      if (payer.isAI) {
        let workingCash = payer.cash;
        const workingOwnership = { ...own };
        const ownedTiles = getPlayerOwnedTiles(playerId, workingOwnership).sort(
          (a, b) =>
            calculateSellValue(a, workingOwnership[a.id]!) -
            calculateSellValue(b, workingOwnership[b.id]!)
        );

        for (const tile of ownedTiles) {
          if (workingCash >= amount) break;
          const prop = workingOwnership[tile.id]!;
          const sellVal = calculateSellValue(tile, prop);
          workingCash += sellVal;
          delete workingOwnership[tile.id];
          addLog(
            `${payer.name} bán ${tile.name} thu về ${formatMoney(sellVal)} để trả nợ.`,
            'warn'
          );
        }

        if (workingCash >= amount) {
          const nextPlayers = pList.map((p) => {
            if (p.id === playerId) return { ...p, cash: workingCash - amount };
            if (creditorId !== null && p.id === creditorId) {
              return { ...p, cash: p.cash + amount };
            }
            return p;
          });
          setPlayers(nextPlayers);
          setOwnership(workingOwnership);
          if (afterPaid) {
            afterPaid(nextPlayers, workingOwnership);
          } else {
            advanceTurn(nextPlayers, workingOwnership);
          }
        } else {
          // AI Bankrupt
          setPlayers((prev) =>
            prev.map((p) => (p.id === playerId ? { ...p, cash: workingCash } : p))
          );
          setOwnership(workingOwnership);
          eliminatePlayer(playerId, creditorId, reason);
        }
        return;
      }

      // Human must liquidate or declare bankruptcy
      const maxCash = calculateMaxLiquidationCash(payer, own);
      if (maxCash < amount && getPlayerOwnedTiles(playerId, own).length === 0) {
        eliminatePlayer(playerId, creditorId, reason);
        return;
      }

      setPendingModal({
        type: 'LIQUIDATE',
        amountOwed: amount,
        creditorId,
        reason,
      });
    },
    [addLog, advanceTurn, eliminatePlayer]
  );

  // Move pawn step by step along the 32-tile perimeter
  const movePlayerSteps = useCallback(
    async (
      playerId: number,
      steps: number,
      collectStartOnPass = true
    ): Promise<number> => {
      const mySession = sessionRef.current;
      const delay = fastModeRef.current ? 75 : 140;
      setTurnStep('MOVING');
      setMovingPlayerId(playerId);

      let pos = playersRef.current.find((p) => p.id === playerId)?.position ?? 0;

      for (let i = 0; i < steps; i++) {
        await sleep(delay);
        if (sessionRef.current !== mySession) return pos;

        pos = (pos + 1) % BOARD_TILES.length;
        sfx.step();

        let salaryEarned = false;
        if (pos === 0 && collectStartOnPass) {
          salaryEarned = true;
          sfx.cashIn();
        }

        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id !== playerId) return p;
            return {
              ...p,
              position: pos,
              cash: salaryEarned ? p.cash + START_SALARY : p.cash,
            };
          })
        );

        if (salaryEarned) {
          const pName =
            playersRef.current.find((p) => p.id === playerId)?.name ?? '';
          addLog(
            `${pName} đi qua ô BẮT ĐẦU, nhận +${formatMoney(START_SALARY)}.`,
            'good'
          );
        }
      }

      setMovingPlayerId(null);
      return pos;
    },
    [addLog]
  );

  const resolveTileLanding = useCallback(
    async (playerId: number, tileId: number) => {
      const mySession = sessionRef.current;
      setTurnStep('RESOLVING');

      const tile = getTileById(tileId);
      const actor = playersRef.current.find((p) => p.id === playerId);
      if (!actor || actor.bankrupt) return;

      const aiPause = fastModeRef.current ? 300 : 600;

      // 1. START
      if (tile.type === 'START') {
        addLog(`${actor.name} dừng tại ô BẮT ĐẦU.`, 'neutral');
        await sleep(250);
        if (sessionRef.current !== mySession) return;
        advanceTurn();
        return;
      }

      // 2. LOST ISLAND (Jail)
      if (tile.type === 'LOST_ISLAND') {
        sfx.alert();
        extraTurnRef.current = false;
        const nextPlayers = playersRef.current.map((p) =>
          p.id === playerId
            ? { ...p, inJail: true, jailTurns: 0, doublesStreak: 0 }
            : p
        );
        setPlayers(nextPlayers);
        addLog(`${actor.name} bị lạc vào Đảo Hoang!`, 'warn');
        await sleep(350);
        if (sessionRef.current !== mySession) return;
        advanceTurn(nextPlayers);
        return;
      }

      // 3. WORLD TOUR (Airport)
      if (tile.type === 'WORLD_TOUR') {
        sfx.cashIn();
        const nextPlayers = playersRef.current.map((p) =>
          p.id === playerId ? { ...p, worldTourReady: true } : p
        );
        setPlayers(nextPlayers);
        addLog(
          `${actor.name} đến sân bay DU LỊCH — lượt sau có thể bay đến bất kỳ ô nào!`,
          'good'
        );
        await sleep(350);
        if (sessionRef.current !== mySession) return;
        advanceTurn(nextPlayers);
        return;
      }

      // 4. FESTIVAL
      if (tile.type === 'FESTIVAL') {
        const owned = getPlayerOwnedTiles(playerId, ownershipRef.current);
        if (owned.length === 0) {
          addLog(
            `${actor.name} ghé ô LỄ HỘI nhưng chưa sở hữu tỉnh thành nào.`,
            'neutral'
          );
          await sleep(300);
          if (sessionRef.current !== mySession) return;
          advanceTurn();
          return;
        }

        if (actor.isAI) {
          await sleep(aiPause);
          if (sessionRef.current !== mySession) return;
          const targetId = chooseAIFestivalTile(playerId, ownershipRef.current);
          if (targetId !== null) {
            const targetTile = getTileById(targetId);
            sfx.buy();
            const nextOwnership = { ...ownershipRef.current };
            // Move player's festival marker to chosen tile
            for (const [k, v] of Object.entries(nextOwnership)) {
              if (v.ownerId === playerId && v.hasFestival) {
                nextOwnership[Number(k)] = { ...v, hasFestival: false };
              }
            }
            nextOwnership[targetId] = {
              ...nextOwnership[targetId],
              hasFestival: true,
            };
            setOwnership(nextOwnership);
            addLog(
              `${actor.name} tổ chức Lễ Hội x2 tiền thuê tại ${targetTile.name}!`,
              'good'
            );
            advanceTurn(playersRef.current, nextOwnership);
          } else {
            advanceTurn();
          }
          return;
        }

        // Human chooses tile on board
        setTurnStep('SELECT_FESTIVAL');
        return;
      }

      // 5. TAX
      if (tile.type === 'TAX') {
        const taxDue = tile.taxPercent
          ? Math.max(200, Math.round((actor.cash * tile.taxPercent) / 100))
          : tile.taxAmount ?? 500;
        addLog(
          `${actor.name} dừng tại ${tile.name}, cần đóng ${formatMoney(taxDue)}.`,
          'warn'
        );
        await sleep(300);
        if (sessionRef.current !== mySession) return;
        chargePlayer(playerId, taxDue, null, `Đóng ${tile.name}`);
        return;
      }

      // 6. CHANCE
      if (tile.type === 'CHANCE') {
        const card =
          CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
        if (actor.isAI) {
          addLog(`${actor.name} rút Thẻ Cơ Hội: ${card.title}.`, 'neutral');
          await sleep(aiPause);
          if (sessionRef.current !== mySession) return;
          await applyChanceCard(playerId, card);
        } else {
          setPendingModal({ type: 'CHANCE_CARD', card });
        }
        return;
      }

      // 7. PROPERTY / RESORT
      const prop = ownershipRef.current[tile.id];

      // 7a. Unowned
      if (!prop) {
        if (actor.cash < (tile.price ?? 0)) {
          addLog(
            `${actor.name} dừng tại ${tile.name} nhưng không đủ tiền mua.`,
            'neutral'
          );
          await sleep(300);
          if (sessionRef.current !== mySession) return;
          advanceTurn();
          return;
        }

        if (actor.isAI) {
          await sleep(aiPause);
          if (sessionRef.current !== mySession) return;
          const level = chooseAILevelToBuy(actor, tile, -1);
          if (level !== null) {
            const effectiveLevel = tile.type === 'RESORT' ? 0 : level;
            const cost =
              (tile.price ?? 0) + effectiveLevel * (tile.houseCost ?? 0);
            sfx.buy();
            const nextPlayers = playersRef.current.map((p) =>
              p.id === playerId ? { ...p, cash: p.cash - cost } : p
            );
            const nextOwnership: Record<number, PropertyState> = {
              ...ownershipRef.current,
              [tile.id]: {
                ownerId: playerId,
                level: effectiveLevel,
                hasFestival: false,
              },
            };
            setPlayers(nextPlayers);
            setOwnership(nextOwnership);
            addLog(
              `${actor.name} mua ${tile.name}${
                effectiveLevel > 0 ? ` (+${effectiveLevel} nhà)` : ''
              } với giá ${formatMoney(cost)}.`,
              'good'
            );
            advanceTurn(nextPlayers, nextOwnership);
          } else {
            advanceTurn();
          }
          return;
        }

        // Human modal
        setPendingModal({ type: 'BUY_PROPERTY', tileId: tile.id });
        return;
      }

      // 7b. Owned by self
      if (prop.ownerId === playerId) {
        if (tile.type === 'RESORT' || prop.level >= 4) {
          addLog(`${actor.name} ghé thăm ${tile.name} của chính mình.`, 'neutral');
          await sleep(250);
          if (sessionRef.current !== mySession) return;
          advanceTurn();
          return;
        }

        if (actor.isAI) {
          await sleep(aiPause);
          if (sessionRef.current !== mySession) return;
          const nextLvl = chooseAILevelToBuy(actor, tile, prop.level);
          if (nextLvl !== null && nextLvl > prop.level) {
            const cost = (nextLvl - prop.level) * (tile.houseCost ?? 0);
            sfx.buy();
            const nextPlayers = playersRef.current.map((p) =>
              p.id === playerId ? { ...p, cash: p.cash - cost } : p
            );
            const nextOwnership = {
              ...ownershipRef.current,
              [tile.id]: { ...prop, level: nextLvl },
            };
            setPlayers(nextPlayers);
            setOwnership(nextOwnership);
            addLog(
              `${actor.name} nâng cấp ${tile.name} lên ${
                nextLvl === 4 ? 'Khách Sạn 5★' : `${nextLvl} nhà`
              }.`,
              'good'
            );
            advanceTurn(nextPlayers, nextOwnership);
          } else {
            advanceTurn();
          }
          return;
        }

        setPendingModal({ type: 'UPGRADE_PROPERTY', tileId: tile.id });
        return;
      }

      // 7c. Owned by opponent -> Pay rent, then offer Buyout if applicable
      const owner = playersRef.current.find((p) => p.id === prop.ownerId);
      const rent = calculateRent(tile, ownershipRef.current);
      addLog(
        `${actor.name} vào đất ${tile.name} của ${owner?.name}, trả thuê ${formatMoney(rent)}.`,
        'bad'
      );

      await sleep(300);
      if (sessionRef.current !== mySession) return;

      chargePlayer(
        playerId,
        rent,
        prop.ownerId,
        `Tiền thuê ${tile.name}`,
        async (afterPlayers, afterOwnership) => {
          const payerAfter = afterPlayers.find((p) => p.id === playerId);
          const canBuyout =
            payerAfter &&
            !payerAfter.bankrupt &&
            tile.type === 'PROPERTY' &&
            prop.level < 4;

          if (!canBuyout) {
            advanceTurn(afterPlayers, afterOwnership);
            return;
          }

          const buyoutPrice = calculateBuyoutPrice(tile, prop);
          if (payerAfter.cash < buyoutPrice) {
            advanceTurn(afterPlayers, afterOwnership);
            return;
          }

          if (payerAfter.isAI) {
            if (shouldAIBuyout(payerAfter, tile, afterOwnership, buyoutPrice)) {
              await sleep(aiPause);
              if (sessionRef.current !== mySession) return;
              sfx.buy();
              const boughtPlayers = afterPlayers.map((p) => {
                if (p.id === playerId) return { ...p, cash: p.cash - buyoutPrice };
                if (p.id === prop.ownerId)
                  return { ...p, cash: p.cash + buyoutPrice };
                return p;
              });
              const boughtOwnership = {
                ...afterOwnership,
                [tile.id]: { ...prop, ownerId: playerId },
              };
              setPlayers(boughtPlayers);
              setOwnership(boughtOwnership);
              addLog(
                `${payerAfter.name} thâu tóm lại ${tile.name} với giá ${formatMoney(buyoutPrice)}!`,
                'warn'
              );
              advanceTurn(boughtPlayers, boughtOwnership);
            } else {
              advanceTurn(afterPlayers, afterOwnership);
            }
            return;
          }

          // Human buyout prompt
          setPendingModal({
            type: 'BUYOUT_PROPERTY',
            tileId: tile.id,
            buyoutPrice,
          });
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addLog, advanceTurn, chargePlayer]
  );

  const applyChanceCard = useCallback(
    async (playerId: number, card: ChanceCard) => {
      const mySession = sessionRef.current;
      const actor = playersRef.current.find((p) => p.id === playerId);
      if (!actor || actor.bankrupt) return;

      switch (card.kind) {
        case 'GAIN': {
          sfx.cashIn();
          const gain = card.amount ?? 1000;
          const nextPlayers = playersRef.current.map((p) =>
            p.id === playerId ? { ...p, cash: p.cash + gain } : p
          );
          setPlayers(nextPlayers);
          addLog(`${actor.name} nhận +${formatMoney(gain)} (${card.title}).`, 'good');
          advanceTurn(nextPlayers);
          break;
        }
        case 'PAY': {
          const fee = card.amount ?? 500;
          addLog(`${actor.name} bị trừ ${formatMoney(fee)} (${card.title}).`, 'bad');
          chargePlayer(playerId, fee, null, card.title);
          break;
        }
        case 'ESCAPE_CARD': {
          sfx.cashIn();
          const nextPlayers = playersRef.current.map((p) =>
            p.id === playerId ? { ...p, escapeCards: p.escapeCards + 1 } : p
          );
          setPlayers(nextPlayers);
          addLog(`${actor.name} nhận được 1 Thẻ Thoát Đảo Hoang.`, 'good');
          advanceTurn(nextPlayers);
          break;
        }
        case 'GO_JAIL': {
          sfx.alert();
          extraTurnRef.current = false;
          const nextPlayers = playersRef.current.map((p) =>
            p.id === playerId
              ? { ...p, position: 8, inJail: true, jailTurns: 0, doublesStreak: 0 }
              : p
          );
          setPlayers(nextPlayers);
          addLog(`${actor.name} gặp bão, bị đưa thẳng ra Đảo Hoang!`, 'bad');
          advanceTurn(nextPlayers);
          break;
        }
        case 'REPAIR': {
          const owned = getPlayerOwnedTiles(playerId, ownershipRef.current);
          const totalBuildings = owned.reduce((acc, t) => {
            const lvl = ownershipRef.current[t.id]?.level ?? 0;
            return acc + lvl;
          }, 0);
          const repairFee = totalBuildings * (card.amount ?? 200);
          if (repairFee === 0) {
            addLog(`${actor.name} không có công trình phải bảo trì.`, 'neutral');
            advanceTurn();
          } else {
            addLog(
              `${actor.name} trả ${formatMoney(repairFee)} phí bảo trì (${totalBuildings} công trình).`,
              'warn'
            );
            chargePlayer(playerId, repairFee, null, card.title);
          }
          break;
        }
        case 'STORM': {
          const oppBuilt = Object.entries(ownershipRef.current).filter(
            ([, prop]) => prop.ownerId !== playerId && prop.level > 0 && prop.level < 4
          );
          if (oppBuilt.length === 0) {
            addLog(`Thiên tai đi qua nhưng không có nhà đối thủ bị ảnh hưởng.`, 'neutral');
            advanceTurn();
          } else {
            const [tileStr, prop] =
              oppBuilt[Math.floor(Math.random() * oppBuilt.length)];
            const tid = Number(tileStr);
            const targetTile = getTileById(tid);
            const nextOwnership = {
              ...ownershipRef.current,
              [tid]: { ...prop, level: (prop.level - 1) as 0 | 1 | 2 | 3 },
            };
            setOwnership(nextOwnership);
            sfx.alert();
            addLog(
              `Bão làm ${targetTile.name} bị hạ xuống cấp ${prop.level - 1} nhà!`,
              'warn'
            );
            advanceTurn(playersRef.current, nextOwnership);
          }
          break;
        }
        case 'MOVE_TO': {
          const targetId = card.targetTileId ?? 0;
          const totalTiles = BOARD_TILES.length;
          const steps =
            (targetId - actor.position + totalTiles) % totalTiles || totalTiles;
          const landed = await movePlayerSteps(
            playerId,
            steps,
            card.collectStart ?? true
          );
          if (sessionRef.current !== mySession) return;
          await resolveTileLanding(playerId, landed);
          break;
        }
      }
    },
    [addLog, advanceTurn, chargePlayer, movePlayerSteps, resolveTileLanding]
  );

  // Execute a dice roll (normal turn OR jail escape roll)
  const executeDiceRoll = useCallback(
    async (isJailEscapeAttempt = false) => {
      const mySession = sessionRef.current;
      const actor = playersRef.current[currentIdxRef.current];
      if (!actor || actor.bankrupt) return;

      // World Tour ready -> jump to tile selection
      if (actor.worldTourReady && !isJailEscapeAttempt) {
        if (actor.isAI) {
          setTurnStep('RESOLVING');
          await sleep(fastModeRef.current ? 300 : 600);
          if (sessionRef.current !== mySession) return;
          const destId = chooseAIWorldTourTile(actor, ownershipRef.current);
          const destTile = getTileById(destId);
          addLog(`${actor.name} bay thẳng từ Du Lịch tới ${destTile.name}!`, 'good');

          const nextPlayers = playersRef.current.map((p) =>
            p.id === actor.id ? { ...p, worldTourReady: false } : p
          );
          setPlayers(nextPlayers);

          const total = BOARD_TILES.length;
          const steps = (destId - actor.position + total) % total || total;
          const landed = await movePlayerSteps(actor.id, steps, true);
          if (sessionRef.current !== mySession) return;
          await resolveTileLanding(actor.id, landed);
        } else {
          setTurnStep('SELECT_WORLD_TOUR');
        }
        return;
      }

      setTurnStep('ROLLING');
      setIsRolling(true);
      sfx.diceRoll();

      const rollDuration = fastModeRef.current ? 260 : 520;
      const interval = setInterval(() => {
        setDice([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }, 75);

      await sleep(rollDuration);
      clearInterval(interval);
      if (sessionRef.current !== mySession) return;

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      setDice([d1, d2]);
      setIsRolling(false);

      const isDoubles = d1 === d2;
      const totalSteps = d1 + d2;

      // Handle Jail Roll
      if (actor.inJail) {
        if (isDoubles) {
          sfx.cashIn();
          addLog(
            `${actor.name} tung ra Đôi ${d1}+${d2} và thoát khỏi Đảo Hoang!`,
            'good'
          );
          const nextPlayers = playersRef.current.map((p) =>
            p.id === actor.id
              ? { ...p, inJail: false, jailTurns: 0, doublesStreak: 0 }
              : p
          );
          setPlayers(nextPlayers);
          extraTurnRef.current = false;
          const landed = await movePlayerSteps(actor.id, totalSteps, true);
          if (sessionRef.current !== mySession) return;
          await resolveTileLanding(actor.id, landed);
        } else {
          const newJailTurns = actor.jailTurns + 1;
          if (newJailTurns >= 3) {
            addLog(
              `${actor.name} hết 3 lượt ở Đảo Hoang, buộc phải trả ${formatMoney(JAIL_BAIL)} phí tàu để rời đảo.`,
              'warn'
            );
            const nextPlayers = playersRef.current.map((p) =>
              p.id === actor.id ? { ...p, inJail: false, jailTurns: 0 } : p
            );
            setPlayers(nextPlayers);
            chargePlayer(
              actor.id,
              JAIL_BAIL,
              null,
              'Phí rời Đảo Hoang',
              async () => {
                const landed = await movePlayerSteps(actor.id, totalSteps, true);
                if (sessionRef.current !== mySession) return;
                await resolveTileLanding(actor.id, landed);
              }
            );
          } else {
            const nextPlayers = playersRef.current.map((p) =>
              p.id === actor.id ? { ...p, jailTurns: newJailTurns } : p
            );
            setPlayers(nextPlayers);
            addLog(
              `${actor.name} tung ${d1}+${d2} (không ra Đôi), tiếp tục ở lại Đảo Hoang (${newJailTurns}/3).`,
              'neutral'
            );
            advanceTurn(nextPlayers);
          }
        }
        return;
      }

      // Normal Turn
      if (isDoubles) {
        const streak = actor.doublesStreak + 1;
        if (streak >= 3) {
          sfx.alert();
          extraTurnRef.current = false;
          const nextPlayers = playersRef.current.map((p) =>
            p.id === actor.id
              ? { ...p, position: 8, inJail: true, jailTurns: 0, doublesStreak: 0 }
              : p
          );
          setPlayers(nextPlayers);
          addLog(
            `${actor.name} tung Đôi 3 lần liên tiếp! Bị đưa thẳng ra Đảo Hoang.`,
            'bad'
          );
          advanceTurn(nextPlayers);
          return;
        }
        extraTurnRef.current = true;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === actor.id ? { ...p, doublesStreak: streak } : p
          )
        );
      } else {
        extraTurnRef.current = false;
        setPlayers((prev) =>
          prev.map((p) => (p.id === actor.id ? { ...p, doublesStreak: 0 } : p))
        );
      }

      addLog(
        `${actor.name} tung được ${d1} + ${d2} = ${totalSteps}${
          isDoubles ? ' (Đôi!)' : ''
        }.`,
        'neutral'
      );

      const landed = await movePlayerSteps(actor.id, totalSteps, true);
      if (sessionRef.current !== mySession) return;
      await resolveTileLanding(actor.id, landed);
    },
    [
      addLog,
      advanceTurn,
      chargePlayer,
      movePlayerSteps,
      resolveTileLanding,
    ]
  );

  // Trigger Human Roll or Jail Options
  const handleHumanRollClick = useCallback(() => {
    if (turnStep !== 'WAIT_ROLL' || pendingModal) return;
    const actor = playersRef.current[currentIdxRef.current];
    if (!actor || actor.isAI || actor.bankrupt) return;

    if (actor.inJail) {
      setPendingModal({ type: 'JAIL_OPTIONS' });
      return;
    }

    executeDiceRoll(false);
  }, [executeDiceRoll, pendingModal, turnStep]);

  // AI Turn Driver
  useEffect(() => {
    if (phase !== 'PLAYING' || turnStep !== 'WAIT_ROLL' || pendingModal) return;
    const actor = players[currentPlayerIndex];
    if (!actor || !actor.isAI || actor.bankrupt) return;

    const mySession = sessionRef.current;
    const delay = fastMode ? 320 : 700;

    const timer = setTimeout(() => {
      if (sessionRef.current !== mySession) return;

      if (actor.inJail) {
        if (actor.escapeCards > 0) {
          sfx.cashIn();
          const nextPlayers = playersRef.current.map((p) =>
            p.id === actor.id
              ? {
                  ...p,
                  inJail: false,
                  jailTurns: 0,
                  escapeCards: p.escapeCards - 1,
                }
              : p
          );
          setPlayers(nextPlayers);
          addLog(`${actor.name} dùng Thẻ Thoát Đảo miễn phí.`, 'good');
          executeDiceRoll(false);
          return;
        }
        if (actor.cash >= JAIL_BAIL + 1000) {
          sfx.pay();
          const nextPlayers = playersRef.current.map((p) =>
            p.id === actor.id
              ? { ...p, inJail: false, jailTurns: 0, cash: p.cash - JAIL_BAIL }
              : p
          );
          setPlayers(nextPlayers);
          addLog(
            `${actor.name} trả ${formatMoney(JAIL_BAIL)} rời Đảo Hoang.`,
            'warn'
          );
          executeDiceRoll(false);
          return;
        }
        executeDiceRoll(true);
        return;
      }

      executeDiceRoll(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [
    addLog,
    currentPlayerIndex,
    executeDiceRoll,
    fastMode,
    pendingModal,
    phase,
    players,
    turnStep,
  ]);

  // Spacebar shortcut to roll (Local or Online active turn)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || inspectedTile || showRulesModal) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'BUTTON') return;

      if (onlineRoom?.status === 'PLAYING' && onlineRoom.game) {
        const activeSlots = onlineRoom.slots.filter((s) => s.kind !== 'OPEN');
        const myOnlineId = activeSlots.findIndex((s) => s.isYou);
        const cur = onlineRoom.game.players[onlineRoom.game.currentPlayerIndex];
        if (
          cur &&
          cur.id === myOnlineId &&
          !cur.isAI &&
          onlineRoom.game.turnStep === 'WAIT_ROLL' &&
          !onlineRoom.game.pendingModal
        ) {
          e.preventDefault();
          sendWsMessage({
            type: 'GAME_ACTION',
            clientId,
            code: onlineRoom.code,
            action: { kind: 'ROLL_DICE' },
          });
        }
        return;
      }

      if (
        phase === 'PLAYING' &&
        turnStep === 'WAIT_ROLL' &&
        !pendingModal
      ) {
        e.preventDefault();
        handleHumanRollClick();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    clientId,
    handleHumanRollClick,
    inspectedTile,
    onlineRoom,
    pendingModal,
    phase,
    sendWsMessage,
    showRulesModal,
    turnStep,
  ]);

  // Board Tile Click (Festival / World Tour selection)
  const handleTileClick = async (tile: BoardTile) => {
    const actor = players[currentPlayerIndex];
    if (!actor || actor.isAI) {
      return;
    }

    if (turnStep === 'SELECT_FESTIVAL') {
      const prop = ownership[tile.id];
      if (!prop || prop.ownerId !== actor.id) return;

      sfx.buy();
      const nextOwnership = { ...ownership };
      for (const [k, v] of Object.entries(nextOwnership)) {
        if (v.ownerId === actor.id && v.hasFestival) {
          nextOwnership[Number(k)] = { ...v, hasFestival: false };
        }
      }
      nextOwnership[tile.id] = { ...nextOwnership[tile.id], hasFestival: true };
      setOwnership(nextOwnership);
      addLog(
        `${actor.name} tổ chức Lễ Hội x2 tiền thuê tại ${tile.name}!`,
        'good'
      );
      advanceTurn(players, nextOwnership);
      return;
    }

    if (turnStep === 'SELECT_WORLD_TOUR') {
      if (tile.id === 24) return;
      sfx.cashIn();
      const nextPlayers = players.map((p) =>
        p.id === actor.id ? { ...p, worldTourReady: false } : p
      );
      setPlayers(nextPlayers);
      addLog(`${actor.name} bay thẳng tới ${tile.name}!`, 'good');

      const total = BOARD_TILES.length;
      const steps = (tile.id - actor.position + total) % total || total;
      const landed = await movePlayerSteps(actor.id, steps, true);
      await resolveTileLanding(actor.id, landed);
      return;
    }
  };

  // Modal Handlers
  const currentPlayer = players[currentPlayerIndex];

  const handleBuyProperty = (tileId: number, targetLevel: 0 | 1 | 2 | 3) => {
    if (!currentPlayer) return;
    const tile = getTileById(tileId);
    const effectiveLevel = tile.type === 'RESORT' ? 0 : targetLevel;
    const cost = (tile.price ?? 0) + effectiveLevel * (tile.houseCost ?? 0);
    if (currentPlayer.cash < cost) return;

    sfx.buy();
    const nextPlayers = players.map((p) =>
      p.id === currentPlayer.id ? { ...p, cash: p.cash - cost } : p
    );
    const nextOwnership: Record<number, PropertyState> = {
      ...ownership,
      [tileId]: {
        ownerId: currentPlayer.id,
        level: effectiveLevel,
        hasFestival: false,
      },
    };
    setPlayers(nextPlayers);
    setOwnership(nextOwnership);
    setPendingModal(null);
    addLog(
      `${currentPlayer.name} mua ${tile.name}${
        effectiveLevel > 0 ? ` (+${effectiveLevel} nhà)` : ''
      } giá ${formatMoney(cost)}.`,
      'good'
    );
    advanceTurn(nextPlayers, nextOwnership);
  };

  const handleUpgradeProperty = (tileId: number, targetLevel: 1 | 2 | 3 | 4) => {
    if (!currentPlayer) return;
    const tile = getTileById(tileId);
    const prop = ownership[tileId];
    if (!prop) return;

    const cost = (targetLevel - prop.level) * (tile.houseCost ?? 0);
    if (currentPlayer.cash < cost) return;

    sfx.buy();
    const nextPlayers = players.map((p) =>
      p.id === currentPlayer.id ? { ...p, cash: p.cash - cost } : p
    );
    const nextOwnership = {
      ...ownership,
      [tileId]: { ...prop, level: targetLevel },
    };
    setPlayers(nextPlayers);
    setOwnership(nextOwnership);
    setPendingModal(null);
    addLog(
      `${currentPlayer.name} nâng cấp ${tile.name} lên ${
        targetLevel === 4 ? 'Khách Sạn 5★' : `${targetLevel} nhà`
      }.`,
      'good'
    );
    advanceTurn(nextPlayers, nextOwnership);
  };

  const handleBuyoutProperty = (tileId: number) => {
    if (!currentPlayer || pendingModal?.type !== 'BUYOUT_PROPERTY') return;
    const tile = getTileById(tileId);
    const prop = ownership[tileId];
    const buyoutPrice = pendingModal.buyoutPrice;
    if (!prop || currentPlayer.cash < buyoutPrice) return;

    sfx.buy();
    const nextPlayers = players.map((p) => {
      if (p.id === currentPlayer.id) return { ...p, cash: p.cash - buyoutPrice };
      if (p.id === prop.ownerId) return { ...p, cash: p.cash + buyoutPrice };
      return p;
    });
    const nextOwnership = {
      ...ownership,
      [tileId]: { ...prop, ownerId: currentPlayer.id },
    };
    setPlayers(nextPlayers);
    setOwnership(nextOwnership);
    setPendingModal(null);
    addLog(
      `${currentPlayer.name} thâu tóm ${tile.name} với giá ${formatMoney(buyoutPrice)}!`,
      'warn'
    );
    advanceTurn(nextPlayers, nextOwnership);
  };

  const handleSkipBuy = () => {
    setPendingModal(null);
    advanceTurn();
  };

  const handleConfirmChance = () => {
    if (pendingModal?.type !== 'CHANCE_CARD' || !currentPlayer) return;
    const card = pendingModal.card;
    setPendingModal(null);
    applyChanceCard(currentPlayer.id, card);
  };

  const handleJailPayBail = () => {
    if (!currentPlayer || currentPlayer.cash < JAIL_BAIL) return;
    sfx.pay();
    const nextPlayers = players.map((p) =>
      p.id === currentPlayer.id
        ? { ...p, inJail: false, jailTurns: 0, cash: p.cash - JAIL_BAIL }
        : p
    );
    setPlayers(nextPlayers);
    setPendingModal(null);
    addLog(
      `${currentPlayer.name} trả ${formatMoney(JAIL_BAIL)} rời Đảo Hoang.`,
      'warn'
    );
    executeDiceRoll(false);
  };

  const handleJailUseCard = () => {
    if (!currentPlayer || currentPlayer.escapeCards <= 0) return;
    sfx.cashIn();
    const nextPlayers = players.map((p) =>
      p.id === currentPlayer.id
        ? {
            ...p,
            inJail: false,
            jailTurns: 0,
            escapeCards: p.escapeCards - 1,
          }
        : p
    );
    setPlayers(nextPlayers);
    setPendingModal(null);
    addLog(`${currentPlayer.name} dùng Thẻ Thoát Đảo miễn phí.`, 'good');
    executeDiceRoll(false);
  };

  const handleJailRollDoubles = () => {
    setPendingModal(null);
    executeDiceRoll(true);
  };

  const handleSellPropertyForDebt = (tileId: number) => {
    if (!currentPlayer) return;
    const prop = ownership[tileId];
    if (!prop || prop.ownerId !== currentPlayer.id) return;
    const tile = getTileById(tileId);
    const sellValue = calculateSellValue(tile, prop);

    sfx.cashIn();
    const nextPlayers = players.map((p) =>
      p.id === currentPlayer.id ? { ...p, cash: p.cash + sellValue } : p
    );
    const nextOwnership = { ...ownership };
    delete nextOwnership[tileId];

    setPlayers(nextPlayers);
    setOwnership(nextOwnership);
    addLog(
      `${currentPlayer.name} bán ${tile.name} thu về ${formatMoney(sellValue)}.`,
      'warn'
    );
  };

  const handleSettleDebt = () => {
    if (pendingModal?.type !== 'LIQUIDATE' || !currentPlayer) return;
    const { amountOwed, creditorId } = pendingModal;
    if (currentPlayer.cash < amountOwed) return;

    sfx.pay();
    const nextPlayers = players.map((p) => {
      if (p.id === currentPlayer.id) return { ...p, cash: p.cash - amountOwed };
      if (creditorId !== null && p.id === creditorId) {
        return { ...p, cash: p.cash + amountOwed };
      }
      return p;
    });

    setPlayers(nextPlayers);
    setPendingModal(null);
    advanceTurn(nextPlayers);
  };

  const handleDeclareBankruptcy = () => {
    if (pendingModal?.type !== 'LIQUIDATE' || !currentPlayer) return;
    eliminatePlayer(
      currentPlayer.id,
      pendingModal.creditorId,
      pendingModal.reason
    );
  };

  const toggleMute = () => {
    const next = !muted;
    sfx.muted = next;
    setMuted(next);
  };

  const dispatchOnlineAction = (action: GameActionPayload) => {
    if (!onlineRoom) return;
    sendWsMessage({
      type: 'GAME_ACTION',
      clientId,
      code: onlineRoom.code,
      action,
    });
  };

  // 1. Online Waiting Room View
  if (onlineRoom && onlineRoom.status === 'WAITING') {
    return (
      <OnlineRoomLobby
        room={onlineRoom}
        wsError={wsError}
        onUpdateMySlot={(patch) =>
          sendWsMessage({
            type: 'UPDATE_MY_SLOT',
            clientId,
            code: onlineRoom.code,
            ...patch,
          })
        }
        onSetSlotKind={(slotIndex, kind) =>
          sendWsMessage({
            type: 'SET_SLOT_KIND',
            clientId,
            code: onlineRoom.code,
            slotIndex,
            kind,
          })
        }
        onFillAiSlots={() =>
          sendWsMessage({
            type: 'FILL_AI_SLOTS',
            clientId,
            code: onlineRoom.code,
          })
        }
        onSetStartingCash={(cash) =>
          sendWsMessage({
            type: 'SET_STARTING_CASH',
            clientId,
            code: onlineRoom.code,
            startingCash: cash,
          })
        }
        onStartGame={() =>
          sendWsMessage({
            type: 'START_ROOM_GAME',
            clientId,
            code: onlineRoom.code,
          })
        }
        onLeaveRoom={() => {
          sendWsMessage({
            type: 'LEAVE_ROOM',
            clientId,
            code: onlineRoom.code,
          });
          setOnlineRoom(null);
        }}
      />
    );
  }

  // 2. Online Playing / Game Over View
  if (onlineRoom && onlineRoom.game) {
    const game = onlineRoom.game;
    const activeSlots = onlineRoom.slots.filter((s) => s.kind !== 'OPEN');
    const myOnlineId = activeSlots.findIndex((s) => s.isYou);
    const displayPlayers = game.players.map((p) =>
      onlineAnimPositions[p.id] !== undefined
        ? { ...p, position: onlineAnimPositions[p.id] }
        : p
    );
    const activePlayer = displayPlayers[game.currentPlayerIndex];
    const isMyTurn =
      activePlayer !== undefined &&
      activePlayer.id === myOnlineId &&
      !activePlayer.isAI &&
      onlineMovingPlayerId === null;

    const myPendingModal =
      game.pendingModal &&
      game.pendingModal.forPlayerId === myOnlineId &&
      onlineMovingPlayerId === null
        ? game.pendingModal.modal
        : null;

    const leftOnline = displayPlayers.filter((_, idx) => idx % 2 === 0);
    const rightOnline = displayPlayers.filter((_, idx) => idx % 2 === 1);

    const handleOnlineTileClick = (tile: BoardTile) => {
      if (!isMyTurn) return;
      if (game.turnStep === 'SELECT_FESTIVAL') {
        const prop = game.ownership[tile.id];
        if (!prop || prop.ownerId !== myOnlineId) return;
        sfx.buy();
        dispatchOnlineAction({ kind: 'SELECT_FESTIVAL_TILE', tileId: tile.id });
      } else if (game.turnStep === 'SELECT_WORLD_TOUR') {
        if (tile.id === 24) return;
        sfx.cashIn();
        dispatchOnlineAction({
          kind: 'SELECT_WORLD_TOUR_TILE',
          tileId: tile.id,
        });
      }
    };

    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_#103D35_0%,_#08221E_75%,_#051613_100%)] text-slate-100 flex flex-col">
        <header className="border-b border-white/10 bg-[#071D19]/85 backdrop-blur-md">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-display text-base font-bold text-white">
                Tour Việt Nam
              </span>
              <span className="font-mono-num text-xs font-bold text-amber-300 bg-black/35 border border-white/10 px-2.5 py-1 rounded-md">
                Phòng: {onlineRoom.code}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setFastMode((f) => !f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  fastMode
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <FastForward className="w-3.5 h-3.5" />
                {fastMode ? 'Tốc độ 2x' : 'Tốc độ 1x'}
              </button>

              <button
                onClick={toggleMute}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="hidden sm:inline">
                  {muted ? 'Tắt tiếng' : 'Âm thanh'}
                </span>
              </button>

              <button
                onClick={() => setShowRulesModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Luật chơi</span>
              </button>

              {onlineRoom.isHost && (
                <button
                  onClick={() =>
                    sendWsMessage({
                      type: 'RETURN_TO_WAITING',
                      clientId,
                      code: onlineRoom.code,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Về phòng chờ</span>
                </button>
              )}

              <button
                onClick={() => {
                  sendWsMessage({
                    type: 'LEAVE_ROOM',
                    clientId,
                    code: onlineRoom.code,
                  });
                  setOnlineRoom(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <HomeIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rời phòng</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-4 items-center">
          <div className="hidden lg:flex flex-col gap-4">
            {leftOnline.map((p) => (
              <PlayerPanel
                key={p.id}
                player={p}
                isActive={
                  p.id === activePlayer?.id && onlineRoom.status === 'PLAYING'
                }
                ownership={game.ownership}
              />
            ))}
          </div>

          <div className="w-full flex flex-col items-center justify-center">
            {activePlayer && (
              <GameBoard
                players={displayPlayers}
                currentPlayer={activePlayer}
                ownership={game.ownership}
                turnStep={onlineMovingPlayerId !== null ? 'MOVING' : game.turnStep}
                dice={game.dice}
                isRolling={false}
                movingPlayerId={onlineMovingPlayerId}
                canControlTurn={isMyTurn}
                logs={game.logs}
                onRollDice={() => {
                  sfx.diceRoll();
                  dispatchOnlineAction({ kind: 'ROLL_DICE' });
                }}
                onTileClick={handleOnlineTileClick}
              />
            )}
          </div>

          <div className="hidden lg:flex flex-col gap-4">
            {rightOnline.map((p) => (
              <PlayerPanel
                key={p.id}
                player={p}
                isActive={
                  p.id === activePlayer?.id && onlineRoom.status === 'PLAYING'
                }
                ownership={game.ownership}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {displayPlayers.map((p) => (
              <PlayerPanel
                key={p.id}
                player={p}
                isActive={
                  p.id === activePlayer?.id && onlineRoom.status === 'PLAYING'
                }
                ownership={game.ownership}
              />
            ))}
          </div>
        </main>

        {activePlayer && myPendingModal && (
          <ActionModal
            modal={myPendingModal}
            inspectedTile={null}
            currentPlayer={activePlayer}
            players={displayPlayers}
            ownership={game.ownership}
            onCloseInspect={() => {}}
            onBuyProperty={(tileId, targetLevel) => {
              sfx.buy();
              dispatchOnlineAction({
                kind: 'BUY_PROPERTY',
                tileId,
                targetLevel,
              });
            }}
            onSkipBuy={() => dispatchOnlineAction({ kind: 'SKIP_BUY' })}
            onUpgradeProperty={(tileId, targetLevel) => {
              sfx.buy();
              dispatchOnlineAction({
                kind: 'UPGRADE_PROPERTY',
                tileId,
                targetLevel,
              });
            }}
            onBuyoutProperty={(tileId) => {
              sfx.buy();
              dispatchOnlineAction({ kind: 'BUYOUT_PROPERTY', tileId });
            }}
            onConfirmChance={() =>
              dispatchOnlineAction({ kind: 'CONFIRM_CHANCE' })
            }
            onJailPayBail={() =>
              dispatchOnlineAction({ kind: 'JAIL_PAY_BAIL' })
            }
            onJailUseCard={() =>
              dispatchOnlineAction({ kind: 'JAIL_USE_CARD' })
            }
            onJailRollDoubles={() => {
              sfx.diceRoll();
              dispatchOnlineAction({ kind: 'JAIL_ROLL_DOUBLES' });
            }}
            onSellPropertyForDebt={(tileId) => {
              sfx.cashIn();
              dispatchOnlineAction({ kind: 'SELL_PROPERTY_DEBT', tileId });
            }}
            onSettleDebt={() => dispatchOnlineAction({ kind: 'SETTLE_DEBT' })}
            onDeclareBankruptcy={() =>
              dispatchOnlineAction({ kind: 'DECLARE_BANKRUPTCY' })
            }
          />
        )}

        {onlineRoom.status === 'GAME_OVER' && game.victory && (
          <GameOverModal
            summary={game.victory}
            players={displayPlayers}
            ownership={game.ownership}
            onPlayAgain={() => {
              if (onlineRoom.isHost) {
                sendWsMessage({
                  type: 'START_ROOM_GAME',
                  clientId,
                  code: onlineRoom.code,
                });
              }
            }}
            onBackToLobby={() => {
              if (onlineRoom.isHost) {
                sendWsMessage({
                  type: 'RETURN_TO_WAITING',
                  clientId,
                  code: onlineRoom.code,
                });
              } else {
                sendWsMessage({
                  type: 'LEAVE_ROOM',
                  clientId,
                  code: onlineRoom.code,
                });
                setOnlineRoom(null);
              }
            }}
          />
        )}

        {showRulesModal && (
          <div
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowRulesModal(false)}
          >
            <div
              className="w-full max-w-md bg-[#0F2C27] border border-white/15 rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-white">
                  Hướng Dẫn Nhanh Tour Việt Nam
                </h3>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-white">• Điều kiện thắng ngay:</strong> Sở hữu trọn 3 nhóm màu, hoặc toàn bộ 1 cạnh bàn cờ, hoặc cả 4 Khu Nghỉ Dưỡng, hoặc làm đối thủ phá sản hết.
                </li>
                <li>
                  <strong className="text-white">• Mua & Xây nhà:</strong> Khi dừng ở đất trống, bạn có thể mua đất hoặc xây sẵn tới 3 nhà ngay lập tức. Khi dừng lại đất mình, có thể nâng lên Khách Sạn 5★.
                </li>
                <li>
                  <strong className="text-white">• Thâu tóm (Buyout):</strong> Có thể mua lại tỉnh thành của đối thủ với giá x2, trừ khi họ đã nâng lên Khách Sạn 5★.
                </li>
                <li>
                  <strong className="text-white">• Lễ Hội & Du Lịch:</strong> Ô Lễ Hội nhân đôi tiền thuê 1 tỉnh của bạn. Ô Du Lịch cho phép bay tới bất kỳ ô nào ở lượt kế tiếp.
                </li>
                <li>
                  <strong className="text-white">• Đảo Hoang:</strong> Tung ra Đôi, nộp 500K hoặc dùng Thẻ Thoát Đảo để rời đảo. Tung Đôi 3 lần liên tiếp cũng bị đưa ra đảo.
                </li>
              </ul>
              <button
                onClick={() => setShowRulesModal(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Đã Hiểu
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Local Lobby Screen
  if (phase === 'LOBBY') {
    return (
      <LobbyScreen
        initialRoomCode={initialRoomCode}
        wsConnected={wsConnected}
        wsStatus={wsStatus}
        wsError={wsError}
        onStartLocalGame={startGame}
        onCreateOnlineRoom={(playerName, characterId, color: PlayerColorKey) => {
          setWsError(null);
          sendWsMessage({
            type: 'CREATE_ROOM',
            clientId,
            playerName,
            characterId,
            color,
          });
        }}
        onJoinOnlineRoom={(code, playerName) => {
          setWsError(null);
          sendWsMessage({
            type: 'JOIN_ROOM',
            clientId,
            code,
            playerName,
          });
        }}
      />
    );
  }

  const leftPlayers = players.filter((_, idx) => idx % 2 === 0);
  const rightPlayers = players.filter((_, idx) => idx % 2 === 1);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_#103D35_0%,_#08221E_75%,_#051613_100%)] text-slate-100 flex flex-col">
      {/* Compact Game Top Bar */}
      <header className="border-b border-white/10 bg-[#071D19]/85 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold">
              <Compass className="w-4 h-4" />
            </div>
            <span className="font-display text-base font-bold text-white">
              Tour Việt Nam
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFastMode((f) => !f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                fastMode
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
              title="Tốc độ di chuyển"
            >
              <FastForward className="w-3.5 h-3.5" />
              {fastMode ? 'Tốc độ 2x' : 'Tốc độ 1x'}
            </button>

            <button
              onClick={toggleMute}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">{muted ? 'Tắt tiếng' : 'Âm thanh'}</span>
            </button>

            <button
              onClick={() => setShowRulesModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Luật chơi</span>
            </button>

            <button
              onClick={() =>
                lastConfig && startGame(lastConfig.slots, lastConfig.startingCash)
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ván mới</span>
            </button>

            <button
              onClick={() => {
                sessionRef.current += 1;
                setPhase('LOBBY');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sảnh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Arena: Left Players | Central 9x9 Board | Right Players */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-4 items-center">
        {/* Left Player Column (Desktop) */}
        <div className="hidden lg:flex flex-col gap-4">
          {leftPlayers.map((p) => (
            <PlayerPanel
              key={p.id}
              player={p}
              isActive={p.id === currentPlayer?.id && phase === 'PLAYING'}
              ownership={ownership}
            />
          ))}
        </div>

        {/* Central Board */}
        <div className="w-full flex flex-col items-center justify-center">
          {currentPlayer && (
            <GameBoard
              players={players}
              currentPlayer={currentPlayer}
              ownership={ownership}
              turnStep={turnStep}
              dice={dice}
              isRolling={isRolling}
              movingPlayerId={movingPlayerId}
              logs={logs}
              onRollDice={handleHumanRollClick}
              onTileClick={handleTileClick}
            />
          )}
        </div>

        {/* Right Player Column (Desktop) */}
        <div className="hidden lg:flex flex-col gap-4">
          {rightPlayers.map((p) => (
            <PlayerPanel
              key={p.id}
              player={p}
              isActive={p.id === currentPlayer?.id && phase === 'PLAYING'}
              ownership={ownership}
            />
          ))}
        </div>

        {/* Mobile / Tablet Player Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
          {players.map((p) => (
            <PlayerPanel
              key={p.id}
              player={p}
              isActive={p.id === currentPlayer?.id && phase === 'PLAYING'}
              ownership={ownership}
            />
          ))}
        </div>
      </main>

      {/* Interactive Modals */}
      {currentPlayer && (
        <ActionModal
          modal={pendingModal}
          inspectedTile={inspectedTile}
          currentPlayer={currentPlayer}
          players={players}
          ownership={ownership}
          onCloseInspect={() => setInspectedTile(null)}
          onBuyProperty={handleBuyProperty}
          onSkipBuy={handleSkipBuy}
          onUpgradeProperty={handleUpgradeProperty}
          onBuyoutProperty={handleBuyoutProperty}
          onConfirmChance={handleConfirmChance}
          onJailPayBail={handleJailPayBail}
          onJailUseCard={handleJailUseCard}
          onJailRollDoubles={handleJailRollDoubles}
          onSellPropertyForDebt={handleSellPropertyForDebt}
          onSettleDebt={handleSettleDebt}
          onDeclareBankruptcy={handleDeclareBankruptcy}
        />
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowRulesModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0F2C27] border border-white/15 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-white">
                Hướng Dẫn Nhanh Tour Việt Nam
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <li>
                <strong className="text-white">• Điều kiện thắng ngay:</strong> Sở hữu trọn 3 nhóm màu, hoặc toàn bộ 1 cạnh bàn cờ, hoặc cả 4 Khu Nghỉ Dưỡng, hoặc làm đối thủ phá sản hết.
              </li>
              <li>
                <strong className="text-white">• Mua & Xây nhà:</strong> Khi dừng ở đất trống, bạn có thể mua đất hoặc xây sẵn tới 3 nhà ngay lập tức. Khi dừng lại đất mình, có thể nâng lên Khách Sạn 5★.
              </li>
              <li>
                <strong className="text-white">• Thâu tóm (Buyout):</strong> Có thể mua lại tỉnh thành của đối thủ với giá x2, trừ khi họ đã nâng lên Khách Sạn 5★.
              </li>
              <li>
                <strong className="text-white">• Lễ Hội & Du Lịch:</strong> Ô Lễ Hội nhân đôi tiền thuê 1 tỉnh của bạn. Ô Du Lịch cho phép bay tới bất kỳ ô nào ở lượt kế tiếp.
              </li>
              <li>
                <strong className="text-white">• Đảo Hoang:</strong> Tung ra Đôi, nộp 500K hoặc dùng Thẻ Thoát Đảo để rời đảo. Tung Đôi 3 lần liên tiếp cũng bị đưa ra đảo.
              </li>
            </ul>
            <button
              onClick={() => setShowRulesModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {phase === 'GAME_OVER' && victory && lastConfig && (
        <GameOverModal
          summary={victory}
          players={players}
          ownership={ownership}
          onPlayAgain={() =>
            startGame(lastConfig.slots, lastConfig.startingCash)
          }
          onBackToLobby={() => {
            sessionRef.current += 1;
            setPhase('LOBBY');
          }}
        />
      )}
    </div>
  );
}
